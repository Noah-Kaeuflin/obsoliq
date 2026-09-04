(function registerPackageEnrichmentEngine(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.data = root.data || {};

  const canonical = root.core?.canonical;
  if (!canonical) throw new Error("ObsoliQ Package Enrichment Engine requires the canonical module.");

  const ENGINE_VERSION = "1";
  const PROHIBITED_FIELD_PATTERNS = Object.freeze([
    /^stock_/,
    /_stock_/,
    /stock_value/,
    /stock_quantity/,
    /standard_price/,
    /excess/,
    /blocked/,
    /bad_stock/,
    /no_need/,
    /no_demand/,
    /unplanned/,
    /recovery/,
    /waterfall/,
    /demand/,
    /consumption/,
    /forecast/,
    /purchase_order/,
    /^po_/,
    /open_po/,
    /^issue_/,
    /^action_/,
    /^package/,
    /^dataset/,
    /^source/,
    /row_key/,
    /row_number/,
    /^priority$/,
    /^confidence$/,
    /^status$/,
    /^decision_type$/,
    /^root_cause$/,
    /^recommended_action$/,
    /^next_step$/,
    /^owner_function$/
  ]);

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function hasValue(value) {
    return String(value ?? "").trim() !== "";
  }

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function valuesEqual(a, b, fieldKey) {
    if (fieldKey === "base_unit") {
      return normalizeText(a).replace(/\s+/g, "").toUpperCase() === normalizeText(b).replace(/\s+/g, "").toUpperCase();
    }
    return normalizeText(a) === normalizeText(b);
  }

  function materialMasterRowKey(row = {}, index = 0) {
    const materialId = normalizeText(row.material_id);
    const plant = normalizeText(row.plant);
    return String(row.material_master_row_key || row.materialMasterRowKey || `MM-${materialId || "NO-MATERIAL"}-${plant || "NO-PLANT"}-${row.__sourceRowIndex || index + 1}`);
  }

  function packageRows(packageRecord = {}, fallbackRows = []) {
    if (Array.isArray(fallbackRows) && fallbackRows.length) return cloneData(fallbackRows);
    if (Array.isArray(packageRecord?.buildData?.packageRows)) return cloneData(packageRecord.buildData.packageRows);
    return [];
  }

  function packageIdentity(packageRecord = {}) {
    return {
      packageId: packageRecord.packageId || "",
      packageType: packageRecord.packageType || "",
      datasetId: packageRecord.datasetId || "",
      revision: packageRecord.revision || packageRecord.packageRevision || 0
    };
  }

  function fieldIsProhibited(fieldKey) {
    const normalized = String(fieldKey || "").trim();
    if (!normalized) return true;
    if (normalized === "material_id" || normalized === "plant") return true;
    return PROHIBITED_FIELD_PATTERNS.some(pattern => pattern.test(normalized));
  }

  function fieldIsApproved(fieldKey) {
    const definition = canonical.inventoryFieldDefinitions[fieldKey];
    return Boolean(
      definition
      && definition.importable !== false
      && definition.requirement !== "derived"
      && definition.analysis_group !== "derived"
      && definition.analysis_group !== "recovery"
      && !canonical.protectedImportFieldKeys.has(fieldKey)
      && !fieldIsProhibited(fieldKey)
    );
  }

  function approvedMappedFields(materialMasterPackage = {}, materialMasterRows = [], explicitAllowlist = null) {
    const explicit = Array.isArray(explicitAllowlist) ? new Set(explicitAllowlist) : null;
    const mapped = new Set((materialMasterPackage.mapping?.columnMapping || [])
      .filter(entry => (
        entry
        && entry.status === "mapped"
        && !entry.ignored
        && !entry.protected
        && fieldIsApproved(entry.selectedCanonicalField)
      ))
      .map(entry => entry.selectedCanonicalField));
    const present = new Set();
    materialMasterRows.forEach(row => {
      Object.keys(row || {}).forEach(fieldKey => {
        if (hasValue(row[fieldKey])) present.add(fieldKey);
      });
    });
    return [...mapped]
      .filter(fieldKey => present.has(fieldKey))
      .filter(fieldKey => !explicit || explicit.has(fieldKey))
      .sort();
  }

  function matchIndexByInventoryRowKey(relationshipResult = {}) {
    return new Map((relationshipResult.matches || []).map(match => [match.inventoryRowKey, match]));
  }

  function materialRowsByKey(rows = []) {
    return new Map(rows.map((row, index) => [materialMasterRowKey(row, index), row]));
  }

  function defineRowProvenance(row, provenance) {
    try {
      Object.defineProperty(row, "__obsoliq_enrichment", {
        configurable: true,
        enumerable: false,
        writable: false,
        value: provenance
      });
    } catch {
      // Ignore non-critical provenance attachment failures for frozen or exotic rows.
    }
    return row;
  }

  function enrichInventoryWithMaterialMaster(input = {}) {
    const inventoryRows = cloneData(Array.isArray(input.inventoryRows) ? input.inventoryRows : []);
    const materialMasterPackage = input.materialMasterPackage || {};
    const materialMasterRows = packageRows(materialMasterPackage, input.materialMasterRows);
    const relationshipResult = input.relationshipResult || {};
    const policy = {
      mode: "fill_missing_only",
      ...(input.enrichmentPolicy || {})
    };
    const identity = {
      inventory: input.inventoryPackageIdentity || packageIdentity(input.inventoryPackage || {}),
      materialMaster: input.materialMasterPackageIdentity || packageIdentity(materialMasterPackage)
    };
    const allowedFields = approvedMappedFields(materialMasterPackage, materialMasterRows, policy.allowlist);
    const matchesByInventoryKey = matchIndexByInventoryRowKey(relationshipResult);
    const masterByKey = materialRowsByKey(materialMasterRows);
    const provenanceByRowKey = {};
    const conflicts = [];
    const enrichedRows = inventoryRows.map((row, index) => {
      const inventoryRowKey = String(row.inventory_row_key || row.inventoryRowKey || `INV-${row.__sourceRowIndex || row.row_number || index + 1}`);
      const match = matchesByInventoryKey.get(inventoryRowKey);
      if (!match) return row;
      const masterRow = masterByKey.get(match.materialMasterRowKey);
      if (!masterRow) return row;
      const rowProvenance = {
        inventoryRowKey,
        relationshipStatus: "matched",
        matchType: match.matchType,
        materialMasterRowKey: match.materialMasterRowKey,
        materialMasterSourceRowIndex: match.materialMasterSourceRowIndex,
        materialMasterPackageId: identity.materialMaster.packageId,
        materialMasterPackageRevision: identity.materialMaster.revision,
        materialMasterDatasetId: identity.materialMaster.datasetId,
        fields: {},
        confirmedFields: {},
        conflictCount: 0,
        conflictFieldKeys: []
      };
      const conflictFieldKeys = [];
      allowedFields.forEach(fieldKey => {
        const masterValue = masterRow[fieldKey];
        if (!hasValue(masterValue)) return;
        const inventoryValue = row[fieldKey];
        if (!hasValue(inventoryValue)) {
          if (policy.mode === "fill_missing_only" || policy.mode === "overwrite") {
            row[fieldKey] = masterValue;
            rowProvenance.fields[fieldKey] = {
              source: "material_master",
              policy: policy.mode,
              materialMasterPackageId: identity.materialMaster.packageId,
              materialMasterPackageRevision: identity.materialMaster.revision,
              materialMasterDatasetId: identity.materialMaster.datasetId,
              materialMasterRowKey: match.materialMasterRowKey,
              materialMasterSourceRowIndex: match.materialMasterSourceRowIndex,
              matchType: match.matchType
            };
          }
          return;
        }
        if (valuesEqual(inventoryValue, masterValue, fieldKey)) {
          rowProvenance.confirmedFields[fieldKey] = {
            source: "material_master",
            materialMasterPackageId: identity.materialMaster.packageId,
            materialMasterPackageRevision: identity.materialMaster.revision,
            materialMasterDatasetId: identity.materialMaster.datasetId,
            materialMasterRowKey: match.materialMasterRowKey,
            materialMasterSourceRowIndex: match.materialMasterSourceRowIndex,
            matchType: match.matchType
          };
          return;
        }
        conflictFieldKeys.push(fieldKey);
        conflicts.push({
          inventoryRowKey,
          inventorySourceRowIndex: match.inventorySourceRowIndex,
          materialMasterRowKey: match.materialMasterRowKey,
          materialMasterSourceRowIndex: match.materialMasterSourceRowIndex,
          materialId: match.materialId,
          plant: match.plant,
          fieldKey,
          inventoryValue,
          materialMasterValue: masterValue,
          resolution: "kept_inventory_value"
        });
      });
      rowProvenance.conflictFieldKeys = [...new Set(conflictFieldKeys)].sort();
      rowProvenance.conflictCount = rowProvenance.conflictFieldKeys.length;
      provenanceByRowKey[inventoryRowKey] = rowProvenance;
      return defineRowProvenance(row, rowProvenance);
    });

    const enrichedFieldCount = Object.values(provenanceByRowKey)
      .reduce((total, row) => total + Object.keys(row.fields || {}).length, 0);
    const enrichedRowCount = Object.values(provenanceByRowKey)
      .filter(row => Object.keys(row.fields || {}).length).length;

    return {
      status: relationshipResult.status === "executed" ? "executed" : "skipped",
      policy,
      allowedFields,
      enrichedRows,
      enrichedRowCount,
      enrichedFieldCount,
      conflictCount: conflicts.length,
      conflicts,
      provenanceByRowKey,
      enrichmentMetadata: {
        engineVersion: ENGINE_VERSION,
        executedAt: input.options?.timestamp || new Date().toISOString(),
        policyMode: policy.mode,
        allowedFields,
        enrichedRowCount,
        enrichedFieldCount,
        conflictCount: conflicts.length,
        materialMasterPackageId: identity.materialMaster.packageId,
        materialMasterPackageRevision: identity.materialMaster.revision,
        materialMasterDatasetId: identity.materialMaster.datasetId
      }
    };
  }

  root.data.packageEnrichmentEngine = Object.freeze({
    version: ENGINE_VERSION,
    enrichInventoryWithMaterialMaster,
    approvedMappedFields,
    fieldIsApproved,
    prohibitedFieldPatterns: PROHIBITED_FIELD_PATTERNS
  });
})(window);
