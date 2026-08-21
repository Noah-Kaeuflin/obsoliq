(function () {
  const root = window.ObsoliQ = window.ObsoliQ || {};
  root.data = root.data || {};

  const DATA_PACKAGE_TYPES = Object.freeze({
    INVENTORY_SNAPSHOT: "inventory_snapshot",
    MATERIAL_MASTER: "material_master",
    CONSUMPTION_HISTORY: "consumption_history",
    DEMAND_FORECAST: "demand_forecast",
    PURCHASE_ORDERS: "purchase_orders",
    PLANNING_PARAMETERS: "planning_parameters",
    MOVEMENTS: "movements",
    QUALITY: "quality",
    FINANCE: "finance",
    ACTIONS_OUTCOMES: "actions_outcomes"
  });

  const DATA_PACKAGE_TYPE_DEFINITIONS = deepFreeze({
    inventory_snapshot: {
      packageType: "inventory_snapshot",
      domain: "inventory",
      temporalMode: "point_in_time",
      currentUiSupport: "active_analysis_dataset",
      description: "Inventory stock and recovery snapshot for the active cockpit analysis.",
      recommendedRelationshipKeys: ["material_id", "plant", "profit_center"]
    },
    material_master: {
      packageType: "material_master",
      domain: "master_data",
      temporalMode: "master",
      currentUiSupport: "package_availability",
      importSupported: true,
      builderIdentifier: "materialMasterBuilder",
      mappingPolicy: {
        requiredFields: ["material_id"],
        organizationFields: ["plant"],
        workflowFields: ["mrp_controller", "purchase_organization", "production_scheduler", "accountable_l1", "responsible_l1"],
        recoveryInputFields: []
      },
      description: "Material attributes for later enrichment of inventory records.",
      requiredRelationshipKeys: ["material_id"],
      recommendedRelationshipKeys: ["material_id", "plant"]
    },
    consumption_history: {
      packageType: "consumption_history",
      domain: "demand",
      temporalMode: "history",
      currentUiSupport: "optional_intelligence_source",
      importSupported: true,
      builderIdentifier: "consumptionHistoryBuilder",
      schemaVersion: "consumption-history-v1",
      mappingPolicy: {
        requiredFields: ["material_id", "consumption_quantity"],
        requiredAnyOfMappingGroups: [["posting_date", "period"]],
        organizationFields: ["plant"],
        workflowFields: [],
        recoveryInputFields: [],
        optionalFields: [
          "plant",
          "base_unit",
          "movement_type",
          "consumption_value",
          "movement_count",
          "storage_location",
          "document_id",
          "document_item"
        ]
      },
      description: "Historical consumption signals for later slow-moving and dead-stock intelligence.",
      requiredRelationshipKeys: ["material_id"],
      recommendedRelationshipKeys: ["material_id", "plant"]
    },
    demand_forecast: {
      packageType: "demand_forecast",
      domain: "demand",
      temporalMode: "future",
      currentUiSupport: "contract_only",
      description: "Future demand signals for later demand coverage checks.",
      recommendedRelationshipKeys: ["material_id", "plant", "period"]
    },
    purchase_orders: {
      packageType: "purchase_orders",
      domain: "procurement",
      temporalMode: "open_items",
      currentUiSupport: "contract_only",
      description: "Open purchase orders for later procurement-risk context.",
      recommendedRelationshipKeys: ["material_id", "plant", "purchase_order"]
    },
    planning_parameters: {
      packageType: "planning_parameters",
      domain: "planning",
      temporalMode: "current_master",
      currentUiSupport: "contract_only",
      description: "MRP and planning settings for later planning-policy diagnostics.",
      recommendedRelationshipKeys: ["material_id", "plant", "mrp_controller"]
    },
    movements: {
      packageType: "movements",
      domain: "logistics",
      temporalMode: "history",
      currentUiSupport: "contract_only",
      description: "Stock movement evidence for later lifecycle and activity analysis.",
      recommendedRelationshipKeys: ["material_id", "plant", "movement_type", "posting_date"]
    },
    quality: {
      packageType: "quality",
      domain: "quality",
      temporalMode: "open_items",
      currentUiSupport: "contract_only",
      description: "Quality inspection and blocked-stock evidence for later case context.",
      recommendedRelationshipKeys: ["material_id", "plant", "inspection_lot"]
    },
    finance: {
      packageType: "finance",
      domain: "finance",
      temporalMode: "periodic",
      currentUiSupport: "contract_only",
      description: "Valuation and financial context for later working-capital analysis.",
      recommendedRelationshipKeys: ["material_id", "plant", "valuation_area"]
    },
    actions_outcomes: {
      packageType: "actions_outcomes",
      domain: "execution",
      temporalMode: "history",
      currentUiSupport: "contract_only",
      description: "Action outcomes for later learning loops and value tracking.",
      recommendedRelationshipKeys: ["material_id", "plant", "action_id"]
    }
  });

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(key => deepFreeze(value[key]));
    return Object.freeze(value);
  }

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function stableNow(input) {
    return input || null;
  }

  function normalizeSequence(sequence) {
    const numeric = Number(sequence);
    return Number.isFinite(numeric) && numeric >= 0 ? Math.floor(numeric) : 0;
  }

  function normalizeRetentionLimit(limit) {
    const numeric = Number(limit);
    if (!Number.isFinite(numeric) || numeric < 1) return 5;
    return Math.max(1, Math.floor(numeric));
  }

  function createPackageIdFromSequence(sequence) {
    return `PKG-${String(sequence).padStart(6, "0")}`;
  }

  function assertPlainObject(value, label) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Data Package ${label} must be an object.`);
    }
  }

  function assertString(value, label) {
    if (!String(value || "").trim()) {
      throw new Error(`Data Package ${label} is required.`);
    }
  }

  function assertKnownType(packageType) {
    if (!DATA_PACKAGE_TYPE_DEFINITIONS[packageType]) {
      throw new Error(`Unknown Data Package type: ${packageType || "missing"}.`);
    }
  }

  /**
   * @typedef {object} RegistryRetentionPolicy
   * @property {string} packageType
   * @property {number} limit
   */

  /**
   * @typedef {object} RegistryStats
   * @property {number} packageCount
   * @property {number} activePackageCount
   * @property {number} sequence
   * @property {Record<string, number>} countsByType
   * @property {Record<string, string>} activePackageIds
   * @property {Record<string, number>} retentionLimits
   */

  function assertPackageOwnershipPatch(packageId, previousRecord, nextPatch = {}) {
    if (!nextPatch || typeof nextPatch !== "object") return;
    if (nextPatch.packageId && nextPatch.packageId !== packageId) {
      throw new Error("Data Package update cannot change packageId.");
    }
    if (nextPatch.datasetId && nextPatch.datasetId !== previousRecord.datasetId) {
      throw new Error("Data Package update cannot change datasetId.");
    }
    if (nextPatch.packageType && nextPatch.packageType !== previousRecord.packageType) {
      throw new Error("Data Package update cannot change packageType.");
    }
  }

  function normalizeRelationshipKeys(value = {}) {
    assertPlainObject(value, "relationshipKeys");
    const normalized = {};
    Object.entries(value).forEach(([group, keys]) => {
      if (!Array.isArray(keys)) {
        throw new Error("Data Package relationshipKeys values must be arrays.");
      }
      const cleanKeys = [...new Set(keys.map(key => String(key || "").trim()).filter(Boolean))];
      normalized[group] = cleanKeys;
    });
    return normalized;
  }

  function normalizeFreshness(value = {}) {
    assertPlainObject(value, "freshness");
    return {
      importedAt: stableNow(value.importedAt),
      asOfDate: value.asOfDate || null,
      periodStart: value.periodStart || null,
      periodEnd: value.periodEnd || null,
      temporalCoverage: value.temporalCoverage || "unknown"
    };
  }

  function validateMapping(value = {}) {
    assertPlainObject(value, "mapping");
    if (value.columnMapping !== undefined && !Array.isArray(value.columnMapping)) {
      throw new Error("Data Package mapping.columnMapping must be an array when supplied.");
    }
  }

  function validateSourceData(value = {}) {
    assertPlainObject(value, "sourceData");
    ["headers", "sourceColumnMetadata"].forEach(key => {
      if (value[key] !== undefined && !Array.isArray(value[key])) {
        throw new Error(`Data Package sourceData.${key} must be an array when supplied.`);
      }
    });
    if (value.rows !== undefined && !Array.isArray(value.rows)) {
      throw new Error("Data Package sourceData.rows must be an array when supplied.");
    }
  }

  function validateBuildData(packageInput = {}) {
    const buildData = packageInput.buildData || {};
    assertPlainObject(buildData, "buildData");
    const metadata = buildData.buildMetadata;
    if (metadata && metadata.datasetId && metadata.datasetId !== packageInput.datasetId) {
      throw new Error("Data Package build metadata belongs to another dataset.");
    }
  }

  function normalizeRecord(input, previousRecord = null, options = {}) {
    assertPlainObject(input, "record");
    const packageType = input.packageType || previousRecord?.packageType || "";
    const datasetId = input.datasetId || previousRecord?.datasetId || "";
    assertKnownType(packageType);
    assertString(datasetId, "datasetId");
    validateMapping(input.mapping || previousRecord?.mapping || {});
    validateSourceData(input.sourceData || previousRecord?.sourceData || {});
    validateBuildData({ ...previousRecord, ...input, packageType, datasetId });

    const createdAt = previousRecord?.createdAt || stableNow(input.createdAt);
    const updatedAt = stableNow(input.updatedAt) || createdAt;
    const revision = previousRecord ? previousRecord.revision + 1 : normalizeSequence(input.revision || 1);
    const record = {
      packageId: input.packageId || previousRecord?.packageId || options.packageId,
      packageType,
      datasetId,
      schemaVersion: String(input.schemaVersion || previousRecord?.schemaVersion || "1"),
      revision,
      status: input.status || previousRecord?.status || "ready",
      sourceDescriptor: cloneData(input.sourceDescriptor || previousRecord?.sourceDescriptor || {}),
      sourceData: cloneData(input.sourceData || previousRecord?.sourceData || {}),
      mapping: cloneData(input.mapping || previousRecord?.mapping || {}),
      buildData: cloneData(input.buildData || previousRecord?.buildData || {}),
      qualitySummary: cloneData(input.qualitySummary || previousRecord?.qualitySummary || {}),
      packageValidation: cloneData(input.packageValidation || previousRecord?.packageValidation || {}),
      inputTrustMetadata: cloneData(input.inputTrustMetadata || previousRecord?.inputTrustMetadata || {}),
      freshness: normalizeFreshness(input.freshness || previousRecord?.freshness || {}),
      relationshipKeys: normalizeRelationshipKeys(input.relationshipKeys || previousRecord?.relationshipKeys || {}),
      createdAt,
      updatedAt
    };
    assertString(record.packageId, "packageId");
    return deepFreeze(record);
  }

  function createDataPackageRegistry(options = {}) {
    let sequence = normalizeSequence(options.sequence);
    let recordsById = new Map();
    let activeByType = new Map();
    let retentionByType = new Map(Object.values(DATA_PACKAGE_TYPES).map(packageType => [
      packageType,
      normalizeRetentionLimit(options.retentionLimits?.[packageType] ?? options.retentionLimit)
    ]));

    function createPackageId() {
      sequence += 1;
      return createPackageIdFromSequence(sequence);
    }

    function registerPackage(input = {}) {
      const packageId = input.packageId || createPackageId();
      if (recordsById.has(packageId)) {
        throw new Error(`Data Package already exists: ${packageId}.`);
      }
      const record = normalizeRecord({ ...input, packageId });
      recordsById.set(packageId, record);
      if (input.active !== false) activeByType.set(record.packageType, packageId);
      return record;
    }

    /**
     * Updates a package while preserving its immutable ownership tuple.
     *
     * @param {string} packageId
     * @param {object|Function} patch
     * @returns {object}
     */
    function updatePackage(packageId, patch = {}) {
      const previousRecord = recordsById.get(packageId);
      if (!previousRecord) throw new Error(`Unknown Data Package: ${packageId}.`);
      const nextPatch = typeof patch === "function" ? patch(previousRecord) : patch;
      assertPackageOwnershipPatch(packageId, previousRecord, nextPatch);
      const record = normalizeRecord({
        ...previousRecord,
        ...(nextPatch || {}),
        packageId,
        packageType: previousRecord.packageType,
        datasetId: previousRecord.datasetId
      }, previousRecord);
      recordsById.set(packageId, record);
      return record;
    }

    function getPackage(packageId) {
      return recordsById.get(packageId) || null;
    }

    function hasPackage(packageId) {
      return recordsById.has(packageId);
    }

    function listPackages() {
      return Object.freeze([...recordsById.values()]);
    }

    function listByType(packageType) {
      assertKnownType(packageType);
      return Object.freeze([...recordsById.values()].filter(record => record.packageType === packageType));
    }

    function removePackage(packageId) {
      const record = recordsById.get(packageId);
      if (!record) return false;
      if (activeByType.get(record.packageType) === packageId) {
        throw new Error(`Cannot remove active Data Package: ${packageId}.`);
      }
      recordsById.delete(packageId);
      return true;
    }

    function setActivePackage(packageId) {
      const record = recordsById.get(packageId);
      if (!record) throw new Error(`Unknown Data Package: ${packageId}.`);
      activeByType.set(record.packageType, packageId);
      return record;
    }

    function getActivePackage(packageType = "") {
      if (packageType) {
        assertKnownType(packageType);
        return getPackage(activeByType.get(packageType));
      }
      const firstActive = activeByType.values().next().value;
      return getPackage(firstActive);
    }

    function getActivePackageId(packageType = "") {
      return getActivePackage(packageType)?.packageId || "";
    }

    function getRetentionLimit(packageType) {
      assertKnownType(packageType);
      return retentionByType.get(packageType) || 5;
    }

    function setRetentionLimit(packageType, limit) {
      assertKnownType(packageType);
      retentionByType.set(packageType, normalizeRetentionLimit(limit));
      return getRetentionLimit(packageType);
    }

    function enforceRetention(packageType, options = {}) {
      assertKnownType(packageType);
      const limit = normalizeRetentionLimit(options.limit ?? getRetentionLimit(packageType));
      retentionByType.set(packageType, limit);
      const activePackageId = activeByType.get(packageType);
      const records = [...recordsById.values()]
        .filter(record => record.packageType === packageType && record.packageId !== activePackageId)
        .sort((a, b) => {
          const aTime = Date.parse(a.updatedAt || a.createdAt || "") || 0;
          const bTime = Date.parse(b.updatedAt || b.createdAt || "") || 0;
          if (aTime !== bTime) return aTime - bTime;
          return String(a.packageId).localeCompare(String(b.packageId));
        });
      const currentCount = listByType(packageType).length;
      const removeCount = Math.max(0, currentCount - limit);
      const removedPackageIds = records.slice(0, removeCount).map(record => record.packageId);
      removedPackageIds.forEach(packageId => recordsById.delete(packageId));
      return Object.freeze(removedPackageIds);
    }

    function snapshot() {
      return deepFreeze({
        sequence,
        activeByType: [...activeByType.entries()],
        retentionByType: [...retentionByType.entries()],
        packages: [...recordsById.values()].map(record => cloneData(record))
      });
    }

    function restore(snapshotValue = {}) {
      sequence = normalizeSequence(snapshotValue.sequence);
      recordsById = new Map();
      (snapshotValue.packages || []).forEach(record => {
        const normalized = normalizeRecord(record);
        recordsById.set(normalized.packageId, normalized);
      });
      activeByType = new Map();
      (snapshotValue.activeByType || []).forEach(([packageType, packageId]) => {
        assertKnownType(packageType);
        if (!recordsById.has(packageId)) {
          throw new Error(`Active Data Package is missing: ${packageId}.`);
        }
        activeByType.set(packageType, packageId);
      });
      retentionByType = new Map(Object.values(DATA_PACKAGE_TYPES).map(packageType => [
        packageType,
        normalizeRetentionLimit(snapshotValue.retentionLimits?.[packageType])
      ]));
      (snapshotValue.retentionByType || []).forEach(([packageType, limit]) => {
        setRetentionLimit(packageType, limit);
      });
    }

    function clear() {
      sequence = 0;
      recordsById = new Map();
      activeByType = new Map();
      retentionByType = new Map(Object.values(DATA_PACKAGE_TYPES).map(packageType => [packageType, 5]));
    }

    function getStats() {
      const countsByType = {};
      Object.values(DATA_PACKAGE_TYPES).forEach(packageType => {
        countsByType[packageType] = 0;
      });
      recordsById.forEach(record => {
        countsByType[record.packageType] = (countsByType[record.packageType] || 0) + 1;
      });
      const activePackageIds = {};
      activeByType.forEach((packageId, packageType) => {
        activePackageIds[packageType] = packageId;
      });
      const retentionLimits = {};
      retentionByType.forEach((limit, packageType) => {
        retentionLimits[packageType] = limit;
      });
      return deepFreeze({
        packageCount: recordsById.size,
        activePackageCount: activeByType.size,
        activePackageIds,
        sequence,
        countsByType,
        retentionLimits
      });
    }

    return Object.freeze({
      createPackageId,
      registerPackage,
      updatePackage,
      getPackage,
      hasPackage,
      listPackages,
      listByType,
      removePackage,
      setActivePackage,
      getActivePackage,
      getActivePackageId,
      getRetentionLimit,
      setRetentionLimit,
      enforceRetention,
      snapshot,
      restore,
      clear,
      getStats
    });
  }

  root.data.packageRegistry = Object.freeze({
    version: "1",
    DATA_PACKAGE_TYPES,
    DATA_PACKAGE_TYPE_DEFINITIONS,
    createDataPackageRegistry
  });
})();
