(function registerMaterialMasterBuilder(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.data = root.data || {};

  const canonical = root.core?.canonical;
  const sourceModel = root.data?.sourceModel;
  const mappingEngine = root.mapping?.engine;
  const inputNormalizationEngine = root.data?.inputNormalizationEngine;
  if (!canonical) throw new Error("ObsoliQ Material Master Builder requires the canonical module.");
  if (!sourceModel) throw new Error("ObsoliQ Material Master Builder requires the source-model module.");
  if (!mappingEngine) throw new Error("ObsoliQ Material Master Builder requires the mapping engine.");

  const BUILDER_VERSION = "1";
  const PACKAGE_TYPE = "material_master";
  const MATERIAL_MASTER_MAPPING_POLICY = Object.freeze({
    requiredFields: Object.freeze(["material_id"]),
    organizationFields: Object.freeze(["plant"]),
    workflowFields: Object.freeze([
      "mrp_controller",
      "purchase_organization",
      "production_scheduler",
      "accountable_l1",
      "responsible_l1"
    ]),
    recoveryInputFields: Object.freeze([])
  });

  const preferredFieldOrder = Object.freeze([
    "material_id",
    "plant",
    "material_description",
    "program_short",
    "profit_center",
    "div",
    "planning_type",
    "mrp_controller",
    "production_scheduler",
    "purchase_organization",
    "accountable_l1",
    "responsible_l1",
    "minimum_order_quantity",
    "safety_stock_target",
    "status_safety",
    "supply_type",
    "standard_price",
    "finance_classification"
  ]);

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object || {}, key);
  }

  function nonDerivedImportableField(fieldKey) {
    const definition = canonical.inventoryFieldDefinitions[fieldKey];
    return Boolean(
      definition
      && definition.importable !== false
      && definition.requirement !== "derived"
      && definition.analysis_group !== "derived"
      && !canonical.protectedImportFieldKeys.has(fieldKey)
    );
  }

  function sourceIdentityValues(entry) {
    return [
      entry?.sourceColumn,
      entry?.sourceKey,
      entry?.sourceColumnKey,
      entry?.sourceColumnId,
      entry?.originalHeader,
      entry?.normalizedSourceColumn
    ].map(value => String(value ?? "").trim()).filter(Boolean);
  }

  function sourceMetaMatches(entry, meta) {
    if (!entry || !meta) return false;
    const values = new Set(sourceIdentityValues(entry));
    const normalized = String(entry.normalizedSourceColumn || "").trim();
    return Boolean(
      values.has(String(meta.sourceKey || "").trim())
      || values.has(String(meta.originalHeader || "").trim())
      || (normalized && normalized === String(meta.normalizedOriginalHeader || "").trim())
      || (normalized && normalized === sourceModel.sourceTechnicalKey(meta.sourceKey, meta.sourceIndex, [meta]))
    );
  }

  function sourceMetaForEntry(entry, sourceColumnMetadata = []) {
    if (!sourceModel.isValidSourceIndex(entry?.sourceIndex)) return null;
    const meta = sourceModel.sourceMetaForColumn(entry.sourceColumn, entry.sourceIndex, sourceColumnMetadata);
    if (!meta || meta.sourceIndex !== entry.sourceIndex) return null;
    return sourceMetaMatches(entry, meta) ? meta : null;
  }

  function validMappingEntries(columnMapping = [], sourceColumnMetadata = []) {
    return mappingEngine.refreshColumnMappingStatuses(columnMapping, {
      sourceColumnMetadata,
      policy: MATERIAL_MASTER_MAPPING_POLICY
    }).filter(entry => (
      entry.status === "mapped"
      && !entry.ignored
      && !entry.protected
      && nonDerivedImportableField(entry.selectedCanonicalField)
      && sourceMetaForEntry(entry, sourceColumnMetadata)
    ));
  }

  function sourceValue(row, entry, sourceColumnMetadata = []) {
    const meta = sourceMetaForEntry(entry, sourceColumnMetadata);
    if (!meta) return "";
    if (hasOwn(row, meta.sourceKey)) return row[meta.sourceKey] ?? "";
    if (hasOwn(row, meta.originalHeader)) return row[meta.originalHeader] ?? "";
    return "";
  }

  function normalizeMasterValue(value, fieldKey) {
    if (fieldKey === "material_id") return String(value ?? "").trim();
    return String(value ?? "").trim();
  }

  function normalizeMasterRows(rows = [], columnMapping = [], sourceColumnMetadata = [], inputTrustResult = null) {
    if (!inputNormalizationEngine) {
      return { normalizedRows: rows, diagnostics: [], summary: null };
    }
    return inputNormalizationEngine.normalizeRows({
      rows,
      columnMapping,
      sourceColumnMetadata,
      fieldDefinitions: canonical.inventoryFieldDefinitions,
      normalizationPolicy: inputTrustResult?.normalizationPolicy || {},
      mappingPolicy: MATERIAL_MASTER_MAPPING_POLICY
    });
  }

  function sortedEntries(entries = []) {
    const order = new Map(preferredFieldOrder.map((fieldKey, index) => [fieldKey, index]));
    return [...entries].sort((a, b) => {
      const aOrder = order.has(a.selectedCanonicalField) ? order.get(a.selectedCanonicalField) : 999;
      const bOrder = order.has(b.selectedCanonicalField) ? order.get(b.selectedCanonicalField) : 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.sourceIndex - b.sourceIndex;
    });
  }

  function materialKey(row, keyGranularity) {
    const materialId = String(row.material_id ?? "").trim();
    const plant = String(row.plant ?? "").trim();
    return keyGranularity === "material_plant" ? `${materialId}|${plant}` : materialId;
  }

  function duplicateKeyCount(rows = [], keyGranularity = "material") {
    const seen = new Map();
    rows.forEach(row => {
      const key = materialKey(row, keyGranularity);
      if (!key || key.startsWith("|")) return;
      seen.set(key, (seen.get(key) || 0) + 1);
    });
    return [...seen.values()].filter(count => count > 1).reduce((total, count) => total + count - 1, 0);
  }

  function validateMaterialMasterPackage(input = {}) {
    const sourceRows = Array.isArray(input.sourceRows) ? input.sourceRows : [];
    const sourceColumnMetadata = Array.isArray(input.sourceColumnMetadata) ? input.sourceColumnMetadata : [];
    const columnMapping = Array.isArray(input.columnMapping) ? input.columnMapping : [];
    const mappingValidation = mappingEngine.validateColumnMapping(columnMapping, {
      sourceColumnMetadata,
      policy: MATERIAL_MASTER_MAPPING_POLICY
    });
    const approvedEntries = validMappingEntries(mappingValidation.mapping, sourceColumnMetadata);
    const invalidPhysicalMappings = (mappingValidation.mapping || []).filter(entry => (
      entry.selectedCanonicalField
      && !entry.ignored
      && !entry.protected
      && !sourceMetaForEntry(entry, sourceColumnMetadata)
    ));
    const materialEntry = approvedEntries.find(entry => entry.selectedCanonicalField === "material_id") || null;
    const plantEntry = approvedEntries.find(entry => entry.selectedCanonicalField === "plant") || null;
    const plantPopulated = Boolean(plantEntry && sourceRows.some(row => String(sourceValue(row, plantEntry, sourceColumnMetadata)).trim()));
    const keyGranularity = plantEntry && plantPopulated ? "material_plant" : "material";
    const normalizedPreview = sourceRows.map((row, index) => {
      const item = { __sourceRowIndex: row?.__sourceRowIndex ?? index + 1 };
      approvedEntries.forEach(entry => {
        item[entry.selectedCanonicalField] = normalizeMasterValue(sourceValue(row, entry, sourceColumnMetadata), entry.selectedCanonicalField);
      });
      return item;
    });
    const missingMaterialIdCount = materialEntry
      ? normalizedPreview.filter(row => !String(row.material_id ?? "").trim()).length
      : sourceRows.length;
    const duplicateRelationshipKeyCount = materialEntry ? duplicateKeyCount(normalizedPreview, keyGranularity) : 0;
    const blockingErrors = [
      ...mappingValidation.errors,
      ...(!materialEntry ? [{ key: "materialMasterMissingMaterialIdMapping", field: "material_id" }] : []),
      ...(invalidPhysicalMappings.length ? [{ key: "materialMasterInvalidSourceIdentity", count: invalidPhysicalMappings.length }] : []),
      ...(missingMaterialIdCount ? [{ key: "materialMasterMissingMaterialIdValues", count: missingMaterialIdCount }] : []),
      ...(duplicateRelationshipKeyCount ? [{ key: "materialMasterDuplicateKeys", count: duplicateRelationshipKeyCount }] : [])
    ];
    return {
      status: blockingErrors.length ? "invalid" : "ready",
      statusKey: blockingErrors.length ? "invalid" : "ready",
      blockingErrors,
      warnings: mappingValidation.warnings || [],
      evaluatedAt: input.evaluatedAt || null,
      rowCount: sourceRows.length,
      validRowCount: Math.max(0, sourceRows.length - missingMaterialIdCount),
      missingMaterialIdCount,
      duplicateKeyCount: duplicateRelationshipKeyCount,
      duplicateRelationshipKeyCount,
      keyGranularity,
      materialIdMapped: Boolean(materialEntry),
      plantMapped: Boolean(plantEntry),
      plantPopulated,
      mappingValidation,
      invalidPhysicalMappings
    };
  }

  function buildMaterialMasterPackage(input = {}) {
    const sourceRows = cloneData(Array.isArray(input.sourceRows) ? input.sourceRows : []);
    const sourceColumnMetadata = cloneData(Array.isArray(input.sourceColumnMetadata) ? input.sourceColumnMetadata : []);
    const columnMapping = cloneData(Array.isArray(input.columnMapping) ? input.columnMapping : []);
    const buildTimestamp = input.buildTimestamp || new Date().toISOString();
    const validation = validateMaterialMasterPackage({
      sourceRows,
      sourceColumnMetadata,
      columnMapping,
      evaluatedAt: buildTimestamp
    });
    const approvedEntries = sortedEntries(validMappingEntries(validation.mappingValidation.mapping, sourceColumnMetadata));
    const mappedRows = sourceRows.map((row, index) => {
      const item = { __sourceRowIndex: row?.__sourceRowIndex ?? index + 1 };
      approvedEntries.forEach(entry => {
        item[entry.selectedCanonicalField] = normalizeMasterValue(sourceValue(row, entry, sourceColumnMetadata), entry.selectedCanonicalField);
      });
      return item;
    });
    const normalization = normalizeMasterRows(mappedRows, columnMapping, sourceColumnMetadata, input.inputTrustResult || null);
    const normalizedRows = normalization.normalizedRows;
    const relationshipKeys = { material: ["material_id"] };
    if (validation.keyGranularity === "material_plant") relationshipKeys.organization = ["plant"];
    return {
      normalizedRows,
      relationshipKeys,
      validation,
      buildMetadata: {
        builderVersion: BUILDER_VERSION,
        packageType: PACKAGE_TYPE,
        datasetId: input.datasetId || "",
        sourceRowCount: sourceRows.length,
        normalizedRowCount: normalizedRows.length,
        mappingSignature: mappingEngine.columnMappingSignature(columnMapping, {
          sourceColumnMetadata,
          policy: MATERIAL_MASTER_MAPPING_POLICY
        }),
        inputTrustMetadata: input.inputTrustResult?.inputTrustMetadata || null,
        inputNormalizationSummary: normalization.summary || null,
        keyGranularity: validation.keyGranularity,
        builtAt: buildTimestamp
      }
    };
  }

  root.data.materialMasterBuilder = Object.freeze({
    version: BUILDER_VERSION,
    packageType: PACKAGE_TYPE,
    MATERIAL_MASTER_MAPPING_POLICY,
    validateMaterialMasterPackage,
    buildMaterialMasterPackage
  });
})(window);
