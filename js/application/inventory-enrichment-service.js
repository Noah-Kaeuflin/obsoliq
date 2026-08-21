(function registerInventoryEnrichmentService(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};

  const relationshipEngine = root.data?.packageRelationshipEngine;
  const enrichmentEngine = root.data?.packageEnrichmentEngine;
  if (!relationshipEngine) throw new Error("ObsoliQ Inventory Enrichment Service requires the Package Relationship Engine.");
  if (!enrichmentEngine) throw new Error("ObsoliQ Inventory Enrichment Service requires the Package Enrichment Engine.");

  const SERVICE_VERSION = "1";

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function packageIdentity(packageRecord = {}) {
    return {
      packageId: packageRecord.packageId || "",
      packageType: packageRecord.packageType || "",
      datasetId: packageRecord.datasetId || "",
      revision: packageRecord.revision || packageRecord.packageRevision || 0
    };
  }

  function unchangedResult(reason, input = {}) {
    const rows = cloneData(Array.isArray(input.inventoryRows) ? input.inventoryRows : []);
    const now = input.options?.timestamp || new Date().toISOString();
    const relationshipResult = relationshipEngine.buildInventoryMaterialMasterRelationship({
      inventoryRows: rows,
      inventoryPackage: input.inventoryPackage || {},
      materialMasterPackage: input.materialMasterPackage || null,
      materialMasterRows: [],
      options: { timestamp: now }
    });
    const metadata = {
      serviceVersion: SERVICE_VERSION,
      status: relationshipResult.status,
      reason,
      executedAt: now,
      relationship: relationshipResult.relationshipMetadata || {},
      enrichment: {
        status: "skipped",
        reason,
        enrichedRowCount: 0,
        enrichedFieldCount: 0,
        conflictCount: 0
      }
    };
    return {
      ok: relationshipResult.status !== "invalid",
      status: relationshipResult.status,
      reason,
      enrichedRows: rows,
      relationshipResult,
      enrichmentResult: {
        status: "skipped",
        allowedFields: [],
        enrichedRows: rows,
        enrichedRowCount: 0,
        enrichedFieldCount: 0,
        conflictCount: 0,
        conflicts: [],
        provenanceByRowKey: {},
        enrichmentMetadata: metadata.enrichment
      },
      metadata
    };
  }

  function applyActiveMaterialMasterEnrichment(input = {}) {
    const inventoryRows = cloneData(Array.isArray(input.inventoryRows) ? input.inventoryRows : []);
    const inventoryPackage = input.inventoryPackage || {};
    const materialMasterPackage = input.materialMasterPackage || null;
    const options = input.options || {};
    const timestamp = options.timestamp || new Date().toISOString();
    if (!materialMasterPackage) {
      return unchangedResult("material_master_missing", { ...input, inventoryRows, options: { ...options, timestamp } });
    }
    if (materialMasterPackage.status === "invalid" || materialMasterPackage.packageValidation?.statusKey === "invalid") {
      return unchangedResult("material_master_invalid", { ...input, inventoryRows, options: { ...options, timestamp } });
    }

    const inventoryIdentity = input.inventoryPackageIdentity || packageIdentity(inventoryPackage);
    const materialIdentity = input.materialMasterPackageIdentity || packageIdentity(materialMasterPackage);
    const relationshipResult = relationshipEngine.buildInventoryMaterialMasterRelationship({
      inventoryRows,
      inventoryPackage,
      inventoryRelationshipKeys: input.inventoryRelationshipKeys,
      inventoryPackageIdentity: inventoryIdentity,
      materialMasterRows: input.materialMasterRows,
      materialMasterPackage,
      materialMasterRelationshipKeys: input.materialMasterRelationshipKeys,
      materialMasterPackageIdentity: materialIdentity,
      options: { ...options, timestamp }
    });
    if (relationshipResult.status !== "executed") {
      return unchangedResult(relationshipResult.reason || "relationship_not_executed", { ...input, inventoryRows, options: { ...options, timestamp } });
    }

    const enrichmentResult = enrichmentEngine.enrichInventoryWithMaterialMaster({
      inventoryRows,
      inventoryPackage,
      inventoryPackageIdentity: inventoryIdentity,
      materialMasterRows: input.materialMasterRows,
      materialMasterPackage,
      materialMasterPackageIdentity: materialIdentity,
      relationshipResult,
      enrichmentPolicy: input.enrichmentPolicy,
      options: { ...options, timestamp }
    });
    const metadata = {
      serviceVersion: SERVICE_VERSION,
      status: "executed",
      reason: "",
      executedAt: timestamp,
      relationship: relationshipResult.relationshipMetadata || {},
      enrichment: enrichmentResult.enrichmentMetadata || {},
      counts: {
        inventoryRowCount: relationshipResult.inventoryRowCount,
        eligibleInventoryRowCount: relationshipResult.eligibleInventoryRowCount,
        materialMasterRowCount: relationshipResult.materialMasterRowCount,
        matchedInventoryRowCount: relationshipResult.matchedInventoryRowCount,
        exactMatchCount: relationshipResult.exactMatchCount,
        fallbackMatchCount: relationshipResult.fallbackMatchCount,
        unmatchedCount: relationshipResult.unmatchedCount,
        ambiguousCount: relationshipResult.ambiguousCount,
        invalidKeyCount: relationshipResult.invalidKeyCount,
        relationshipConflictCount: relationshipResult.conflictCount,
        enrichmentConflictCount: enrichmentResult.conflictCount,
        enrichedRowCount: enrichmentResult.enrichedRowCount,
        enrichedFieldCount: enrichmentResult.enrichedFieldCount
      },
      matchRate: relationshipResult.matchRate
    };
    return {
      ok: true,
      status: "executed",
      reason: "",
      enrichedRows: enrichmentResult.enrichedRows,
      relationshipResult,
      enrichmentResult,
      metadata
    };
  }

  root.application.inventoryEnrichmentService = Object.freeze({
    version: SERVICE_VERSION,
    applyActiveMaterialMasterEnrichment
  });
})(window);
