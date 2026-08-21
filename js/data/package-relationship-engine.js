(function registerPackageRelationshipEngine(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.data = root.data || {};

  const ENGINE_VERSION = "1";
  const SUPPORTED_KEYS = Object.freeze(["material_id", "plant"]);

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function hasValue(value) {
    return String(value ?? "").trim() !== "";
  }

  function normalizeKey(value) {
    return String(value ?? "").trim();
  }

  function packageIdentity(packageRecord = {}) {
    return {
      packageId: packageRecord.packageId || "",
      packageType: packageRecord.packageType || "",
      datasetId: packageRecord.datasetId || "",
      revision: packageRecord.revision || packageRecord.packageRevision || 0
    };
  }

  function packageRows(packageRecord = {}, fallbackRows = []) {
    if (Array.isArray(fallbackRows) && fallbackRows.length) return cloneData(fallbackRows);
    if (Array.isArray(packageRecord?.buildData?.packageRows)) return cloneData(packageRecord.buildData.packageRows);
    if (Array.isArray(packageRecord?.buildData?.analyticalRows)) return cloneData(packageRecord.buildData.analyticalRows);
    return [];
  }

  function relationshipKeys(packageRecord = {}, fallbackKeys = {}) {
    const keys = packageRecord?.relationshipKeys || fallbackKeys || {};
    return {
      material: Array.isArray(keys.material) ? [...keys.material] : [],
      organization: Array.isArray(keys.organization) ? [...keys.organization] : []
    };
  }

  function hasRelationshipKey(keys, fieldKey) {
    return Object.values(keys || {}).some(group => Array.isArray(group) && group.includes(fieldKey));
  }

  function materialMasterGranularity(packageRecord = {}, relationshipKeySet = {}) {
    const validationGranularity = packageRecord?.packageValidation?.keyGranularity
      || packageRecord?.buildData?.buildMetadata?.keyGranularity
      || "";
    if (validationGranularity === "material_plant" || validationGranularity === "material") {
      return validationGranularity;
    }
    return hasRelationshipKey(relationshipKeySet, "plant") ? "material_plant" : "material";
  }

  function inventoryRowKey(row = {}, index = 0) {
    return String(row.inventory_row_key || row.inventoryRowKey || `INV-${row.__sourceRowIndex || row.row_number || index + 1}`);
  }

  function materialMasterRowKey(row = {}, index = 0) {
    const materialId = normalizeKey(row.material_id);
    const plant = normalizeKey(row.plant);
    return String(row.material_master_row_key || row.materialMasterRowKey || `MM-${materialId || "NO-MATERIAL"}-${plant || "NO-PLANT"}-${row.__sourceRowIndex || index + 1}`);
  }

  function sourceRowIndex(row = {}, index = 0) {
    const value = Number(row.__sourceRowIndex ?? row.sourceRowIndex ?? row.row_number ?? index + 1);
    return Number.isFinite(value) ? value : index + 1;
  }

  function materialPlantKey(materialId, plant) {
    return `${materialId}||${plant}`;
  }

  function indexedMaterialMasterRows(rows = [], keyGranularity = "material") {
    const byMaterial = new Map();
    const byMaterialPlant = new Map();
    const materialCounts = new Map();
    const materialPlantCounts = new Map();
    const invalidRows = [];

    rows.forEach((row, index) => {
      const materialId = normalizeKey(row.material_id);
      const plant = normalizeKey(row.plant);
      const record = {
        row,
        index,
        materialId,
        plant,
        rowKey: materialMasterRowKey(row, index),
        sourceRowIndex: sourceRowIndex(row, index)
      };
      if (!materialId) {
        invalidRows.push({ ...record, reason: "missing_material_id" });
        return;
      }
      const materialGroup = byMaterial.get(materialId) || [];
      materialGroup.push(record);
      byMaterial.set(materialId, materialGroup);
      materialCounts.set(materialId, (materialCounts.get(materialId) || 0) + 1);

      if (plant) {
        const key = materialPlantKey(materialId, plant);
        const exactGroup = byMaterialPlant.get(key) || [];
        exactGroup.push(record);
        byMaterialPlant.set(key, exactGroup);
        materialPlantCounts.set(key, (materialPlantCounts.get(key) || 0) + 1);
      } else if (keyGranularity === "material_plant") {
        invalidRows.push({ ...record, reason: "missing_plant" });
      }
    });

    const duplicateMaterialKeys = [...materialCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([materialId, count]) => ({ materialId, count }));
    const duplicateMaterialPlantKeys = [...materialPlantCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([key, count]) => {
        const [materialId, plant] = key.split("||");
        return { materialId, plant, count };
      });

    const activeDuplicateKeys = keyGranularity === "material_plant"
      ? duplicateMaterialPlantKeys
      : duplicateMaterialKeys;

    return {
      byMaterial,
      byMaterialPlant,
      invalidRows,
      duplicateMaterialKeys,
      duplicateMaterialPlantKeys,
      activeDuplicateKeys
    };
  }

  function ambiguousDiagnostic({
    inventoryRecord,
    candidates = [],
    reason = "multiple_candidates",
    packageIdentities = {}
  }) {
    return {
      inventoryRowKey: inventoryRecord.rowKey,
      inventorySourceRowIndex: inventoryRecord.sourceRowIndex,
      materialId: inventoryRecord.materialId,
      plant: inventoryRecord.plant,
      reason,
      candidateCount: candidates.length,
      candidateSourceRowIndexes: candidates.map(candidate => candidate.sourceRowIndex),
      candidateRowKeys: candidates.map(candidate => candidate.rowKey),
      inventoryPackageId: packageIdentities.inventory?.packageId || "",
      inventoryPackageRevision: packageIdentities.inventory?.revision || 0,
      materialMasterPackageId: packageIdentities.materialMaster?.packageId || "",
      materialMasterPackageRevision: packageIdentities.materialMaster?.revision || 0
    };
  }

  function matchRecord({
    inventoryRecord,
    materialRecord,
    matchType,
    packageIdentities = {}
  }) {
    return {
      inventoryRowKey: inventoryRecord.rowKey,
      inventorySourceRowIndex: inventoryRecord.sourceRowIndex,
      materialMasterRowKey: materialRecord.rowKey,
      materialMasterSourceRowIndex: materialRecord.sourceRowIndex,
      matchType,
      materialId: inventoryRecord.materialId,
      plant: inventoryRecord.plant,
      inventoryPackageId: packageIdentities.inventory?.packageId || "",
      inventoryPackageRevision: packageIdentities.inventory?.revision || 0,
      inventoryDatasetId: packageIdentities.inventory?.datasetId || "",
      materialMasterPackageId: packageIdentities.materialMaster?.packageId || "",
      materialMasterPackageRevision: packageIdentities.materialMaster?.revision || 0,
      materialMasterDatasetId: packageIdentities.materialMaster?.datasetId || ""
    };
  }

  function unavailableResult(status, reason, input = {}) {
    const now = input.options?.timestamp || new Date().toISOString();
    const inventoryRows = Array.isArray(input.inventoryRows) ? input.inventoryRows : [];
    const materialRows = Array.isArray(input.materialMasterRows) ? input.materialMasterRows : [];
    return {
      status,
      reason,
      keyStrategy: "",
      inventoryRowCount: inventoryRows.length,
      eligibleInventoryRowCount: inventoryRows.filter(row => hasValue(row.material_id)).length,
      materialMasterRowCount: materialRows.length,
      exactMatchCount: 0,
      fallbackMatchCount: 0,
      unmatchedCount: 0,
      ambiguousCount: 0,
      invalidKeyCount: 0,
      conflictCount: 0,
      matchedInventoryRowCount: 0,
      matchRate: null,
      matches: [],
      unmatched: [],
      ambiguous: [],
      invalidKeys: [],
      conflicts: [],
      relationshipMetadata: {
        engineVersion: ENGINE_VERSION,
        executedAt: now,
        reason,
        supportedKeys: [...SUPPORTED_KEYS]
      }
    };
  }

  function buildInventoryMaterialMasterRelationship(input = {}) {
    const options = input.options || {};
    const inventoryPackage = input.inventoryPackage || {};
    const materialMasterPackage = input.materialMasterPackage || null;
    if (!materialMasterPackage || materialMasterPackage.status === "invalid" || materialMasterPackage.packageValidation?.statusKey === "invalid") {
      return unavailableResult(materialMasterPackage ? "invalid" : "unavailable", materialMasterPackage ? "material_master_invalid" : "material_master_missing", input);
    }

    const inventoryRows = packageRows(inventoryPackage, input.inventoryRows);
    const materialRows = packageRows(materialMasterPackage, input.materialMasterRows);
    const inventoryRelationshipKeys = relationshipKeys(inventoryPackage, input.inventoryRelationshipKeys);
    const materialRelationshipKeys = relationshipKeys(materialMasterPackage, input.materialMasterRelationshipKeys);
    const materialMasterHasMaterial = hasRelationshipKey(materialRelationshipKeys, "material_id");
    const inventoryHasMaterial = hasRelationshipKey(inventoryRelationshipKeys, "material_id");
    if (!inventoryHasMaterial || !materialMasterHasMaterial) {
      return unavailableResult("invalid", "missing_material_relationship_key", {
        ...input,
        inventoryRows,
        materialMasterRows: materialRows
      });
    }

    const granularity = materialMasterGranularity(materialMasterPackage, materialRelationshipKeys);
    const inventoryHasPlant = hasRelationshipKey(inventoryRelationshipKeys, "plant");
    const materialMasterHasPlant = hasRelationshipKey(materialRelationshipKeys, "plant");
    const keyStrategy = inventoryHasPlant && materialMasterHasPlant && granularity === "material_plant"
      ? "material_plant"
      : "material";
    const packageIdentities = {
      inventory: input.inventoryPackageIdentity || packageIdentity(inventoryPackage),
      materialMaster: input.materialMasterPackageIdentity || packageIdentity(materialMasterPackage)
    };
    const index = indexedMaterialMasterRows(materialRows, granularity);
    const duplicateActiveKeySet = new Set(index.activeDuplicateKeys.map(item => (
      granularity === "material_plant" ? materialPlantKey(item.materialId, item.plant) : item.materialId
    )));
    const matches = [];
    const unmatched = [];
    const ambiguous = [];
    const invalidKeys = [];

    inventoryRows.forEach((row, rowIndex) => {
      const materialId = normalizeKey(row.material_id);
      const plant = normalizeKey(row.plant);
      const inventoryRecord = {
        row,
        index: rowIndex,
        rowKey: inventoryRowKey(row, rowIndex),
        sourceRowIndex: sourceRowIndex(row, rowIndex),
        materialId,
        plant
      };
      if (!materialId) {
        invalidKeys.push({
          inventoryRowKey: inventoryRecord.rowKey,
          inventorySourceRowIndex: inventoryRecord.sourceRowIndex,
          reason: "missing_material_id"
        });
        return;
      }

      if (plant && granularity === "material_plant") {
        const exactKey = materialPlantKey(materialId, plant);
        const exactCandidates = index.byMaterialPlant.get(exactKey) || [];
        if (duplicateActiveKeySet.has(exactKey) || exactCandidates.length > 1) {
          ambiguous.push(ambiguousDiagnostic({
            inventoryRecord,
            candidates: exactCandidates,
            reason: "duplicate_material_plant_key",
            packageIdentities
          }));
          return;
        }
        if (exactCandidates.length === 1) {
          matches.push(matchRecord({
            inventoryRecord,
            materialRecord: exactCandidates[0],
            matchType: "exact_material_plant",
            packageIdentities
          }));
          return;
        }
      }

      const materialCandidates = index.byMaterial.get(materialId) || [];
      if (!materialCandidates.length) {
        unmatched.push({
          inventoryRowKey: inventoryRecord.rowKey,
          inventorySourceRowIndex: inventoryRecord.sourceRowIndex,
          materialId,
          plant,
          reason: "no_material_master_candidate"
        });
        return;
      }
      if (granularity === "material" && duplicateActiveKeySet.has(materialId)) {
        ambiguous.push(ambiguousDiagnostic({
          inventoryRecord,
          candidates: materialCandidates,
          reason: "duplicate_material_key",
          packageIdentities
        }));
        return;
      }
      if (materialCandidates.length === 1) {
        matches.push(matchRecord({
          inventoryRecord,
          materialRecord: materialCandidates[0],
          matchType: granularity === "material" ? "material_level_exact" : "material_unique_fallback",
          packageIdentities
        }));
        return;
      }
      ambiguous.push(ambiguousDiagnostic({
        inventoryRecord,
        candidates: materialCandidates,
        reason: "multiple_material_candidates",
        packageIdentities
      }));
    });

    const eligibleInventoryRowCount = inventoryRows.filter(row => hasValue(row.material_id)).length;
    const exactMatchCount = matches.filter(match => match.matchType === "exact_material_plant").length;
    const fallbackMatchCount = matches.length - exactMatchCount;
    const conflicts = index.activeDuplicateKeys.map(item => ({
      reason: granularity === "material_plant" ? "duplicate_material_plant_key" : "duplicate_material_key",
      materialId: item.materialId,
      plant: item.plant || "",
      count: item.count
    }));
    return {
      status: "executed",
      keyStrategy,
      inventoryRowCount: inventoryRows.length,
      eligibleInventoryRowCount,
      materialMasterRowCount: materialRows.length,
      exactMatchCount,
      fallbackMatchCount,
      unmatchedCount: unmatched.length,
      ambiguousCount: ambiguous.length,
      invalidKeyCount: invalidKeys.length + index.invalidRows.length,
      conflictCount: conflicts.length,
      matchedInventoryRowCount: matches.length,
      matchRate: eligibleInventoryRowCount ? matches.length / eligibleInventoryRowCount : null,
      matches,
      unmatched,
      ambiguous,
      invalidKeys: [
        ...invalidKeys,
        ...index.invalidRows.map(item => ({
          materialMasterRowKey: item.rowKey,
          materialMasterSourceRowIndex: item.sourceRowIndex,
          materialId: item.materialId,
          plant: item.plant,
          reason: item.reason
        }))
      ],
      conflicts,
      relationshipMetadata: {
        engineVersion: ENGINE_VERSION,
        executedAt: options.timestamp || new Date().toISOString(),
        supportedKeys: [...SUPPORTED_KEYS],
        keyStrategy,
        materialMasterGranularity: granularity,
        inventoryPackageId: packageIdentities.inventory.packageId,
        inventoryPackageRevision: packageIdentities.inventory.revision,
        inventoryDatasetId: packageIdentities.inventory.datasetId,
        materialMasterPackageId: packageIdentities.materialMaster.packageId,
        materialMasterPackageRevision: packageIdentities.materialMaster.revision,
        materialMasterDatasetId: packageIdentities.materialMaster.datasetId
      }
    };
  }

  function createInventoryMaterialMasterRelationship(input = {}) {
    return buildInventoryMaterialMasterRelationship(input);
  }

  root.data.packageRelationshipEngine = Object.freeze({
    version: ENGINE_VERSION,
    supportedKeys: SUPPORTED_KEYS,
    createInventoryMaterialMasterRelationship,
    buildInventoryMaterialMasterRelationship
  });
})(window);
