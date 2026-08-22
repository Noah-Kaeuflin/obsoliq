(function registerConsumptionHistoryRelationshipEngine(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.data = root.data || {};

  const RELATIONSHIP_MODEL_VERSION = "inventory-history-relationship-v1";

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function normalizeId(value) {
    return String(value ?? "").trim();
  }

  function packageIdentity(packageRecord = {}) {
    return {
      packageId: packageRecord.packageId || "",
      datasetId: packageRecord.datasetId || "",
      packageType: packageRecord.packageType || "",
      revision: Number(packageRecord.revision || packageRecord.packageRevision || 0) || 0
    };
  }

  function packageRows(packageRecord = {}, fallbackRows = []) {
    if (Array.isArray(fallbackRows) && fallbackRows.length) return cloneData(fallbackRows);
    if (Array.isArray(packageRecord?.buildData?.packageRows)) return cloneData(packageRecord.buildData.packageRows);
    if (Array.isArray(packageRecord?.buildData?.analyticalRows)) return cloneData(packageRecord.buildData.analyticalRows);
    return [];
  }

  function entityKey(materialId, plant) {
    return `material:${normalizeId(materialId)}|plant:${normalizeId(plant)}`;
  }

  function materialKey(materialId) {
    return `material:${normalizeId(materialId)}`;
  }

  function inventoryRowKey(row = {}, index = 0) {
    return String(row.inventory_row_key || row.inventoryRowKey || `INV-${row.__sourceRowIndex || row.row_number || index + 1}`);
  }

  function historyRowKey(row = {}, index = 0) {
    return String(row.package_row_key || row.history_row_key || `CH-${String(index + 1).padStart(6, "0")}`);
  }

  function sourceRowIndex(row = {}, index = 0) {
    const value = Number(row.__sourceRowIndex ?? row.sourceRowIndex ?? row.row_number ?? index + 1);
    return Number.isFinite(value) ? value : index + 1;
  }

  function addToMapList(map, key, value) {
    const list = map.get(key) || [];
    list.push(value);
    map.set(key, list);
  }

  function buildInventoryEntity(row, index) {
    const materialId = normalizeId(row.material_id);
    const plant = normalizeId(row.plant);
    const rowKey = inventoryRowKey(row, index);
    const stockQuantity = Number(row.stock_quantity);
    const unit = normalizeId(row.base_unit || row.inventory_unit || row.stock_unit).toUpperCase();
    return {
      inventoryEntityKey: entityKey(materialId, plant),
      materialKey: materialKey(materialId),
      materialId,
      plant,
      valid: Boolean(materialId),
      reason: materialId ? "" : "missing_inventory_material",
      rowKeys: [rowKey],
      rowNumbers: [Number(row.row_number || row.__sourceRowIndex || index + 1)],
      sourceRowIndexes: [sourceRowIndex(row, index)],
      stockQuantity: Number.isFinite(stockQuantity) ? stockQuantity : null,
      inventoryUnit: unit,
      rows: [row]
    };
  }

  function mergeInventoryEntity(entity, row, index) {
    const rowKey = inventoryRowKey(row, index);
    entity.rowKeys.push(rowKey);
    entity.rowNumbers.push(Number(row.row_number || row.__sourceRowIndex || index + 1));
    entity.sourceRowIndexes.push(sourceRowIndex(row, index));
    entity.rows.push(row);
    const quantity = Number(row.stock_quantity);
    if (Number.isFinite(quantity)) {
      entity.stockQuantity = Number.isFinite(entity.stockQuantity) ? entity.stockQuantity + quantity : quantity;
    }
    const unit = normalizeId(row.base_unit || row.inventory_unit || row.stock_unit).toUpperCase();
    if (unit && !entity.inventoryUnit) entity.inventoryUnit = unit;
    if (unit && entity.inventoryUnit && unit !== entity.inventoryUnit) entity.inventoryUnitConflict = true;
  }

  function buildHistoryEntity(row, index) {
    const materialId = normalizeId(row.material_id);
    const plant = normalizeId(row.plant);
    return {
      historyEntityKey: entityKey(materialId, plant),
      materialKey: materialKey(materialId),
      materialId,
      plant,
      valid: Boolean(materialId),
      reason: materialId ? "" : "missing_history_material",
      rowKeys: [historyRowKey(row, index)],
      sourceRowIndexes: [sourceRowIndex(row, index)],
      rowCount: 1,
      rows: [row]
    };
  }

  function mergeHistoryEntity(entity, row, index) {
    entity.rowKeys.push(historyRowKey(row, index));
    entity.sourceRowIndexes.push(sourceRowIndex(row, index));
    entity.rowCount += 1;
    entity.rows.push(row);
  }

  function indexInventoryEntities(rows = []) {
    const byEntityKey = new Map();
    const byMaterialKey = new Map();
    const invalid = [];
    rows.forEach((row, index) => {
      const entity = buildInventoryEntity(row, index);
      if (!entity.valid) {
        invalid.push(entity);
        return;
      }
      if (byEntityKey.has(entity.inventoryEntityKey)) {
        mergeInventoryEntity(byEntityKey.get(entity.inventoryEntityKey), row, index);
      } else {
        byEntityKey.set(entity.inventoryEntityKey, entity);
      }
    });
    byEntityKey.forEach(entity => addToMapList(byMaterialKey, entity.materialKey, entity));
    return { byEntityKey, byMaterialKey, invalid };
  }

  function indexHistoryEntities(rows = []) {
    const byEntityKey = new Map();
    const byMaterialKey = new Map();
    const invalid = [];
    rows.forEach((row, index) => {
      const entity = buildHistoryEntity(row, index);
      if (!entity.valid) {
        invalid.push(entity);
        return;
      }
      if (byEntityKey.has(entity.historyEntityKey)) {
        mergeHistoryEntity(byEntityKey.get(entity.historyEntityKey), row, index);
      } else {
        byEntityKey.set(entity.historyEntityKey, entity);
      }
    });
    byEntityKey.forEach(entity => addToMapList(byMaterialKey, entity.materialKey, entity));
    return { byEntityKey, byMaterialKey, invalid };
  }

  function relationshipDiagnostic(inventoryEntity, reason, extra = {}) {
    return {
      inventoryEntityKey: inventoryEntity?.inventoryEntityKey || "",
      materialId: inventoryEntity?.materialId || "",
      plant: inventoryEntity?.plant || "",
      inventoryRowKeys: [...(inventoryEntity?.rowKeys || [])],
      reason,
      ...extra
    };
  }

  function matchRecord(inventoryEntity, historyEntity, matchType, packageIdentities = {}) {
    return {
      relationshipState: matchType,
      matchType,
      inventoryEntityKey: inventoryEntity.inventoryEntityKey,
      historyEntityKey: historyEntity.historyEntityKey,
      materialId: inventoryEntity.materialId,
      inventoryPlant: inventoryEntity.plant,
      historyPlant: historyEntity.plant,
      inventoryRowKeys: [...inventoryEntity.rowKeys],
      inventoryRowNumbers: [...inventoryEntity.rowNumbers],
      historyRowKeys: [...historyEntity.rowKeys],
      historySourceRowIndexes: [...historyEntity.sourceRowIndexes],
      sharedEntityMetric: inventoryEntity.rowKeys.length > 1,
      inventoryPackageId: packageIdentities.inventory.packageId,
      inventoryPackageRevision: packageIdentities.inventory.revision,
      historyPackageId: packageIdentities.history.packageId,
      historyPackageRevision: packageIdentities.history.revision
    };
  }

  function fallbackDecision(inventoryEntity, inventoryByMaterial, historyByMaterial) {
    const inventoryEntities = inventoryByMaterial.get(inventoryEntity.materialKey) || [];
    const historyEntities = historyByMaterial.get(inventoryEntity.materialKey) || [];
    if (!historyEntities.length) return { state: "unmatched", reason: "no_history_entity" };
    if (inventoryEntities.length > 1 && historyEntities.some(entity => !entity.plant)) {
      return { state: "ambiguous", reason: "material_history_fanout_blocked", historyEntities, inventoryEntities };
    }
    if (inventoryEntities.length > 1) {
      return { state: "ambiguous", reason: "multiple_inventory_entities", historyEntities, inventoryEntities };
    }
    if (historyEntities.length > 1) {
      return { state: "ambiguous", reason: "multiple_history_entities", historyEntities, inventoryEntities };
    }
    const [historyEntity] = historyEntities;
    if (inventoryEntity.plant && historyEntity.plant && inventoryEntity.plant !== historyEntity.plant) {
      return { state: "ambiguous", reason: "plant_granularity_conflict", historyEntities, inventoryEntities };
    }
    return { state: "material_fallback", historyEntity };
  }

  function relationshipSignature(input = {}) {
    return `inventory-history-relationship:${RELATIONSHIP_MODEL_VERSION}:${stableJson(input)}`;
  }

  function unavailableResult(reason, input = {}) {
    const inventoryRows = Array.isArray(input.inventoryRows) ? input.inventoryRows : [];
    const historyRows = Array.isArray(input.historyRows) ? input.historyRows : [];
    return {
      status: "unavailable",
      reason,
      relationshipModelVersion: RELATIONSHIP_MODEL_VERSION,
      relationshipSignature: relationshipSignature({ reason, inventoryRows: inventoryRows.length, historyRows: historyRows.length }),
      inventoryPackageId: input.inventoryPackage?.packageId || "",
      inventoryPackageRevision: Number(input.inventoryPackage?.revision || 0) || 0,
      historyPackageId: input.historyPackage?.packageId || "",
      historyPackageRevision: Number(input.historyPackage?.revision || 0) || 0,
      inventoryEntityCount: 0,
      historyEntityCount: 0,
      exactMatchCount: 0,
      fallbackMatchCount: 0,
      unmatchedInventoryCount: 0,
      unmatchedHistoryCount: 0,
      ambiguousCount: 0,
      invalidKeyCount: 0,
      matchedInventoryEntityCount: 0,
      relationshipMatchRate: null,
      matchesByInventoryEntityKey: {},
      historyEntityAssignmentIndex: {},
      unmatchedInventoryEntities: [],
      unmatchedHistoryEntities: [],
      ambiguousRelationships: [],
      invalidKeyRelationships: [],
      diagnosticCounts: { [reason]: 1 },
      limitationCodes: [reason],
      evaluatedAt: input.evaluatedAt || ""
    };
  }

  function buildInventoryHistoryRelationship(input = {}) {
    const inventoryPackage = input.inventoryPackage || {};
    const historyPackage = input.historyPackage || {};
    const inventoryRows = packageRows(inventoryPackage, input.inventoryRows);
    const historyRows = packageRows(historyPackage, input.historyRows);
    const evaluatedAt = input.evaluatedAt || new Date().toISOString();
    if (!inventoryRows.length || !historyRows.length) {
      return unavailableResult("relationship_input_not_ready", { inventoryPackage, historyPackage, inventoryRows, historyRows, evaluatedAt });
    }
    const packageIdentities = {
      inventory: packageIdentity(inventoryPackage),
      history: packageIdentity(historyPackage)
    };
    const inventoryIndex = indexInventoryEntities(inventoryRows);
    const historyIndex = indexHistoryEntities(historyRows);
    const matchesByInventoryEntityKey = {};
    const historyEntityAssignmentIndex = {};
    const unmatchedInventoryEntities = [];
    const ambiguousRelationships = [];
    const invalidKeyRelationships = inventoryIndex.invalid.map(entity => relationshipDiagnostic(entity, entity.reason));
    historyIndex.invalid.forEach(entity => {
      invalidKeyRelationships.push({
        historyEntityKey: entity.historyEntityKey,
        materialId: entity.materialId,
        plant: entity.plant,
        reason: entity.reason,
        historyRowKeys: [...entity.rowKeys]
      });
    });

    inventoryIndex.byEntityKey.forEach(inventoryEntity => {
      const exactHistory = inventoryEntity.plant
        ? historyIndex.byEntityKey.get(inventoryEntity.inventoryEntityKey)
        : null;
      if (exactHistory) {
        const match = matchRecord(inventoryEntity, exactHistory, "exact_material_plant", packageIdentities);
        matchesByInventoryEntityKey[inventoryEntity.inventoryEntityKey] = match;
        historyEntityAssignmentIndex[exactHistory.historyEntityKey] = inventoryEntity.inventoryEntityKey;
        return;
      }
      const fallback = fallbackDecision(inventoryEntity, inventoryIndex.byMaterialKey, historyIndex.byMaterialKey);
      if (fallback.state === "material_fallback") {
        const assignedTo = historyEntityAssignmentIndex[fallback.historyEntity.historyEntityKey];
        if (assignedTo && assignedTo !== inventoryEntity.inventoryEntityKey) {
          ambiguousRelationships.push(relationshipDiagnostic(inventoryEntity, "material_history_fanout_blocked", {
            historyEntityKeys: [fallback.historyEntity.historyEntityKey],
            assignedTo
          }));
          return;
        }
        const match = matchRecord(inventoryEntity, fallback.historyEntity, "material_fallback", packageIdentities);
        matchesByInventoryEntityKey[inventoryEntity.inventoryEntityKey] = match;
        historyEntityAssignmentIndex[fallback.historyEntity.historyEntityKey] = inventoryEntity.inventoryEntityKey;
        return;
      }
      if (fallback.state === "ambiguous") {
        ambiguousRelationships.push(relationshipDiagnostic(inventoryEntity, fallback.reason, {
          historyEntityKeys: (fallback.historyEntities || []).map(entity => entity.historyEntityKey),
          inventoryEntityKeys: (fallback.inventoryEntities || []).map(entity => entity.inventoryEntityKey)
        }));
        return;
      }
      unmatchedInventoryEntities.push(relationshipDiagnostic(inventoryEntity, fallback.reason || "unmatched"));
    });

    const assignedHistoryKeys = new Set(Object.keys(historyEntityAssignmentIndex));
    const unmatchedHistoryEntities = [...historyIndex.byEntityKey.values()]
      .filter(entity => !assignedHistoryKeys.has(entity.historyEntityKey))
      .map(entity => ({
        historyEntityKey: entity.historyEntityKey,
        materialId: entity.materialId,
        plant: entity.plant,
        historyRowKeys: [...entity.rowKeys],
        reason: "unmatched"
      }));

    const matches = Object.values(matchesByInventoryEntityKey);
    const exactMatchCount = matches.filter(match => match.matchType === "exact_material_plant").length;
    const fallbackMatchCount = matches.filter(match => match.matchType === "material_fallback").length;
    const matchedInventoryEntityCount = matches.length;
    const inventoryEntityCount = inventoryIndex.byEntityKey.size;
    const historyEntityCount = historyIndex.byEntityKey.size;
    const diagnosticCounts = {};
    [...unmatchedInventoryEntities, ...ambiguousRelationships, ...invalidKeyRelationships].forEach(item => {
      const reason = item.reason || "unknown";
      diagnosticCounts[reason] = (diagnosticCounts[reason] || 0) + 1;
    });
    const signaturePayload = {
      inventoryPackageId: packageIdentities.inventory.packageId,
      inventoryPackageRevision: packageIdentities.inventory.revision,
      historyPackageId: packageIdentities.history.packageId,
      historyPackageRevision: packageIdentities.history.revision,
      inventoryEntityKeys: [...inventoryIndex.byEntityKey.keys()].sort(),
      historyEntityKeys: [...historyIndex.byEntityKey.keys()].sort(),
      exactMatchCount,
      fallbackMatchCount,
      ambiguousCount: ambiguousRelationships.length,
      invalidKeyCount: invalidKeyRelationships.length
    };

    return {
      status: "executed",
      relationshipModelVersion: RELATIONSHIP_MODEL_VERSION,
      relationshipSignature: relationshipSignature(signaturePayload),
      inventoryPackageId: packageIdentities.inventory.packageId,
      inventoryPackageRevision: packageIdentities.inventory.revision,
      historyPackageId: packageIdentities.history.packageId,
      historyPackageRevision: packageIdentities.history.revision,
      inventoryEntityCount,
      historyEntityCount,
      exactMatchCount,
      fallbackMatchCount,
      unmatchedInventoryCount: unmatchedInventoryEntities.length,
      unmatchedHistoryCount: unmatchedHistoryEntities.length,
      ambiguousCount: ambiguousRelationships.length,
      invalidKeyCount: invalidKeyRelationships.length,
      matchedInventoryEntityCount,
      relationshipMatchRate: inventoryEntityCount ? matchedInventoryEntityCount / inventoryEntityCount : null,
      matchesByInventoryEntityKey,
      historyEntityAssignmentIndex,
      inventoryEntitiesByKey: Object.fromEntries([...inventoryIndex.byEntityKey.entries()].map(([key, value]) => [key, {
        ...value,
        rows: undefined
      }])),
      historyEntitiesByKey: Object.fromEntries([...historyIndex.byEntityKey.entries()].map(([key, value]) => [key, {
        ...value,
        rows: undefined
      }])),
      unmatchedInventoryEntities,
      unmatchedHistoryEntities,
      ambiguousRelationships,
      invalidKeyRelationships,
      diagnosticCounts,
      limitationCodes: Object.keys(diagnosticCounts).sort(),
      evaluatedAt
    };
  }

  root.data.consumptionHistoryRelationshipEngine = Object.freeze({
    version: "1",
    RELATIONSHIP_MODEL_VERSION,
    entityKey,
    materialKey,
    relationshipSignature,
    indexInventoryEntities,
    indexHistoryEntities,
    buildInventoryHistoryRelationship
  });
})(window);
