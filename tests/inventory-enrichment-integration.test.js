(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function inventoryCsv() {
    return [
      "Material Number,Stock Value EUR,Profit Center,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value",
      "MAT-ENR-1,1000,PC-1,500,0,0,0",
      "MAT-NO-MM,2000,PC-1,0,200,0,0"
    ].join("\n");
  }

  function materialMasterCsv() {
    return [
      "Material Number,Plant,Material Description,Program short,MRP Controller,Responsible L1,STD Price",
      "MAT-ENR-1,DE01,Enriched pressure sensor,PROG-MM,MRP-99,Planning Team,999"
    ].join("\n");
  }

  function duplicateInventoryCsv({ withInventoryContext = false } = {}) {
    const contextHeaders = withInventoryContext ? ",Material Description,MRP Controller" : "";
    const firstContext = withInventoryContext ? ",Inventory desc A,MRP-A" : "";
    const secondContext = withInventoryContext ? ",Inventory desc B,MRP-B" : "";
    return [
      `Material Number,Stock Value EUR,Profit Center,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value${contextHeaders}`,
      `MAT-DUP,1000,PC-D,100,0,0,0${firstContext}`,
      `MAT-DUP,1250,PC-D,100,0,0,0${secondContext}`,
      `MAT-ENR-1,500,PC-1,50,0,0,0${withInventoryContext ? ",Stable desc,MRP-1" : ""}`
    ].join("\n");
  }

  function duplicateMaterialMasterCsv() {
    return [
      "Material Number,Material Description,MRP Controller,Responsible L1",
      "MAT-DUP,Master duplicate context,MRP-MM,Planning",
      "MAT-ENR-1,Enriched pressure sensor,MRP-99,Planning"
    ].join("\n");
  }

  function issueSummary(bridge) {
    const issues = bridge.getDataQualityIssues();
    const baseline = bridge.getDataQualityBaselineForTest();
    return {
      keys: issues.map(issue => issue.issueKey).sort(),
      types: issues.map(issue => issue.issueType).sort(),
      duplicateCount: issues.filter(issue => issue.issueType === "duplicate_key_candidate").length,
      rows: issues.map(issue => ({
        type: issue.issueType,
        rows: [...(issue.sourceRowIndexes || [])].map(Number).sort((a, b) => a - b),
        status: issue.status
      })).sort((a, b) => `${a.type}:${a.rows.join("-")}`.localeCompare(`${b.type}:${b.rows.join("-")}`)),
      score: baseline.score,
      rawScore: baseline.rawScore,
      analysisReadiness: baseline.analysisReadiness,
      pilotReadiness: baseline.pilotReadiness,
      workflowReadiness: baseline.workflowReadiness,
      issueMetrics: baseline.issueMetrics,
      inventoryMetrics: baseline.inventoryMetrics
    };
  }

  function relationshipSummary(bridge) {
    const relationship = bridge.getInventoryMaterialMasterRelationshipForTest();
    const enrichment = bridge.getInventoryEnrichmentDiagnosticsForTest();
    return {
      status: relationship?.status || "",
      matchRate: relationship?.matchRate ?? null,
      exactMatchCount: relationship?.exactMatchCount || 0,
      fallbackMatchCount: relationship?.fallbackMatchCount || 0,
      unmatchedCount: relationship?.unmatchedCount || 0,
      ambiguousCount: relationship?.ambiguousCount || 0,
      enrichedFieldCount: enrichment?.enrichedFieldCount || 0,
      conflictCount: enrichment?.conflictCount || 0
    };
  }

  test("AP 16.2b Material Master import enriches active Inventory and creates one Inventory revision", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const loaded = await bridge.loadTextDataset(inventoryCsv(), "inventory-enrichment.csv", {
      sourceType: "upload",
      allowMappingReview: false
    });
    assert.equal(loaded.status, "loaded", "Inventory fixture should load");
    const before = bridge.getState();
    const beforeDq = bridge.getDataQualityBaselineForTest();
    const beforePackage = bridge.getActiveInventoryPackage();
    const imported = bridge.importMaterialMasterTextForTest(materialMasterCsv(), "material-master-enrichment.csv");
    const after = bridge.getState();
    const afterDq = bridge.getDataQualityBaselineForTest();
    const afterPackage = bridge.getActiveInventoryPackage();
    const relationship = bridge.getInventoryMaterialMasterRelationshipForTest();
    const enrichment = bridge.getInventoryEnrichmentDiagnosticsForTest();
    const rows = bridge.getEnrichedRowsForTest();
    const enrichedRow = rows.find(row => row.material_id === "MAT-ENR-1");

    assert.equal(imported.status, "loaded", "Material Master import should complete");
    assert.equal(after.activeInventoryPackageId, before.activeInventoryPackageId, "Inventory package identity should be preserved");
    assert.equal(after.currentDatasetId, before.currentDatasetId, "Inventory dataset identity should be preserved");
    assert.equal(afterPackage.revision, beforePackage.revision + 1, "Material Master enrichment should create exactly one Inventory package revision");
    assert.equal(relationship.status, "executed", "Relationship result should be executed");
    assert.equal(relationship.matchedInventoryRowCount, 1, "One inventory row should match");
    assert.equal(relationship.unmatchedCount, 1, "One inventory row should remain unmatched");
    assert.equal(relationship.matchRate, 0.5, "Match rate should use eligible inventory rows as denominator");
    assert.equal(enrichment.enrichedFieldCount, 4, "Approved missing context fields should be enriched");
    assert.equal(enrichedRow.material_description, "Enriched pressure sensor", "Inventory row should receive Material Master description");
    assert.equal(enrichedRow.mrp_controller, "MRP-99", "Inventory row should receive Material Master planning context");
    assert.equal(enrichedRow.stock_value, 1000, "Inventory financial value should remain unchanged");
    assert.equal(afterDq.score, beforeDq.score, "Data Quality score should remain stable after enrichment");
    assert.deepEqual(afterDq.issueMetrics, beforeDq.issueMetrics, "Data Quality issue metrics should remain stable after enrichment");
    assert.equal(afterPackage.buildData.relationshipMetadata.status, "executed", "Inventory package should store compact relationship metadata");
    assert.equal(afterPackage.buildData.enrichmentMetadata.enrichedFieldCount, 4, "Inventory package should store compact enrichment metadata");
  });

  test("AP 16.2b failed enrichment after Material Master import rolls back runtime and Registry", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getState();
    const beforeStats = bridge.getRegistryStats();
    const result = bridge.importMaterialMasterTextForTest(materialMasterCsv(), "material-master-rollback.csv", {
      forceInventoryEnrichmentFailureForTest: "after-package",
      suppressErrorLog: true,
      suppressFeedback: true
    });
    const after = bridge.getState();
    const afterStats = bridge.getRegistryStats();
    assert.equal(result.status, "error", "Forced enrichment failure should make the import fail");
    assert.equal(after.activeInventoryPackageId, before.activeInventoryPackageId, "Active Inventory package should roll back");
    assert.equal(after.activeMaterialMasterPackage, null, "Active Material Master package should roll back");
    assert.equal(afterStats.packageCount, beforeStats.packageCount, "Registry package count should roll back");
    assert.equal(afterStats.sequence, beforeStats.sequence, "Registry sequence should roll back without phantom revisions");
    assert.equal(after.enrichedRows, before.enrichedRows, "Visible Inventory row count should remain unchanged");
  });

  test("AP 16.2b.1 Remediation Preview restores relationship, diagnostics, provenance and Registry", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const loaded = await bridge.loadTextDataset(inventoryCsv(), "inventory-preview-isolation.csv", {
      sourceType: "upload",
      allowMappingReview: false
    });
    assert.equal(loaded.status, "loaded", "Inventory fixture should load");
    const imported = bridge.importMaterialMasterTextForTest(materialMasterCsv(), "material-master-preview-isolation.csv");
    assert.equal(imported.status, "loaded", "Material Master import should complete");
    const before = {
      relationship: bridge.getInventoryMaterialMasterRelationshipForTest(),
      diagnostics: bridge.getInventoryEnrichmentDiagnosticsForTest(),
      provenance: bridge.getInventoryEnrichmentProvenanceForTest(),
      activeFields: bridge.getActiveEnrichedInventoryFieldKeysForTest(),
      registry: bridge.getRegistrySnapshot(),
      state: bridge.getState(),
      dq: bridge.getDataQualityBaselineForTest()
    };
    const preview = bridge.previewDataCorrectionImpactForTest({
      correctionType: "manual_value",
      sourceRowIndex: 1,
      sourceRowIndexes: [1],
      sourceColumn: "Material Number",
      canonicalField: "material_id",
      correctedValue: "MAT-NO-MM"
    });
    const after = {
      relationship: bridge.getInventoryMaterialMasterRelationshipForTest(),
      diagnostics: bridge.getInventoryEnrichmentDiagnosticsForTest(),
      provenance: bridge.getInventoryEnrichmentProvenanceForTest(),
      activeFields: bridge.getActiveEnrichedInventoryFieldKeysForTest(),
      registry: bridge.getRegistrySnapshot(),
      state: bridge.getState(),
      dq: bridge.getDataQualityBaselineForTest()
    };
    assert.ok(preview?.after, "Preview should return a local hypothetical result");
    assert.deepEqual(after.relationship, before.relationship, "Preview should restore relationship result");
    assert.deepEqual(after.diagnostics, before.diagnostics, "Preview should restore enrichment diagnostics");
    assert.deepEqual(after.provenance, before.provenance, "Preview should restore enrichment provenance");
    assert.deepEqual(after.activeFields, before.activeFields, "Preview should restore active enriched field keys");
    assert.deepEqual(after.registry, before.registry, "Preview should not change Registry state");
    assert.deepEqual(after.state.datasetMeta, before.state.datasetMeta, "Preview should restore Dataset Meta");
    assert.equal(after.state.activeInventoryPackage.revision, before.state.activeInventoryPackage.revision, "Preview should not create an Inventory Package revision");
    assert.deepEqual(after.dq, before.dq, "Preview should restore live Data Quality state");

    const failure = bridge.forcePreviewCallbackFailureForTest();
    assert.equal(failure.status, "error", "Forced Preview callback failure should be caught by test helper");
    assert.deepEqual(bridge.getInventoryMaterialMasterRelationshipForTest(), before.relationship, "Preview exception should restore relationship result");
    assert.deepEqual(bridge.getInventoryEnrichmentDiagnosticsForTest(), before.diagnostics, "Preview exception should restore diagnostics");
    assert.deepEqual(bridge.getInventoryEnrichmentProvenanceForTest(), before.provenance, "Preview exception should restore provenance");
    assert.deepEqual(bridge.getRegistrySnapshot(), before.registry, "Preview exception should not change Registry");
  });

  test("AP 16.2b.1 Inventory Data Quality is deterministic across Material Master import order", async assert => {
    const appA = await helpers.loadApp();
    const bridgeA = appA.__obsoliqTestBridge;
    assert.equal((await bridgeA.loadTextDataset(duplicateInventoryCsv(), "inventory-first.csv", {
      sourceType: "upload",
      allowMappingReview: false
    })).status, "loaded", "Inventory-first fixture should load");
    const beforeMaster = issueSummary(bridgeA);
    assert.equal(bridgeA.importMaterialMasterTextForTest(duplicateMaterialMasterCsv(), "material-master-after.csv").status, "loaded", "Material Master should import after Inventory");
    const finalA = issueSummary(bridgeA);
    const relationshipA = relationshipSummary(bridgeA);

    const appB = await helpers.loadApp();
    const bridgeB = appB.__obsoliqTestBridge;
    assert.equal(bridgeB.importMaterialMasterTextForTest(duplicateMaterialMasterCsv(), "material-master-before.csv").status, "loaded", "Material Master should import before Inventory");
    assert.equal((await bridgeB.loadTextDataset(duplicateInventoryCsv(), "inventory-after.csv", {
      sourceType: "upload",
      allowMappingReview: false
    })).status, "loaded", "Inventory-after fixture should load");
    const finalB = issueSummary(bridgeB);
    const relationshipB = relationshipSummary(bridgeB);

    assert.deepEqual(finalA.keys, beforeMaster.keys, "Material Master enrichment should not change Inventory issue keys");
    assert.deepEqual(finalA.keys, finalB.keys, "Import order should not change issue keys");
    assert.deepEqual(finalA.types, finalB.types, "Import order should not change issue types");
    assert.deepEqual(finalA.rows, finalB.rows, "Import order should not change issue source rows or statuses");
    assert.equal(finalA.duplicateCount, finalB.duplicateCount, "Import order should not change duplicate-candidate count");
    assert.equal(finalA.score, finalB.score, "Import order should not change Data Quality Score");
    assert.equal(finalA.analysisReadiness, finalB.analysisReadiness, "Import order should not change Analysis Readiness");
    assert.equal(finalA.pilotReadiness, finalB.pilotReadiness, "Import order should not change Pilot Readiness");
    assert.equal(finalA.workflowReadiness, finalB.workflowReadiness, "Import order should not change Workflow Readiness");
    assert.deepEqual(finalA.issueMetrics, finalB.issueMetrics, "Import order should not change issue metrics");
    assert.deepEqual(finalA.inventoryMetrics, finalB.inventoryMetrics, "Import order should not change Recovery metrics");
    assert.deepEqual(relationshipA, relationshipB, "Relationship and enrichment outputs should converge");
  });

  test("AP 16.2b.1 Duplicate detection uses Inventory-owned context only", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    assert.equal((await bridge.loadTextDataset(duplicateInventoryCsv(), "inventory-missing-context.csv", {
      sourceType: "upload",
      allowMappingReview: false
    })).status, "loaded", "Inventory fixture should load");
    const beforeMaster = issueSummary(bridge);
    assert.equal(bridge.importMaterialMasterTextForTest(duplicateMaterialMasterCsv(), "material-master-context.csv").status, "loaded", "Material Master should import");
    const afterMaster = issueSummary(bridge);
    assert.deepEqual(afterMaster.keys, beforeMaster.keys, "Material Master-filled context must not alter Inventory duplicate issue identity");
    assert.equal(afterMaster.duplicateCount, beforeMaster.duplicateCount, "Material Master-filled context must not alter duplicate issue count");

    const appWithInventoryContext = await helpers.loadApp();
    const contextBridge = appWithInventoryContext.__obsoliqTestBridge;
    assert.equal((await contextBridge.loadTextDataset(duplicateInventoryCsv({ withInventoryContext: true }), "inventory-owned-context.csv", {
      sourceType: "upload",
      allowMappingReview: false
    })).status, "loaded", "Inventory-owned context fixture should load");
    const contextIssues = contextBridge.getDataQualityIssues().filter(issue => issue.issueType === "duplicate_key_candidate");
    assert.ok(contextIssues.length >= 1, "Inventory-owned differing context should still produce a duplicate-candidate issue");
  });

  test("AP 16.2b.1 Provisional Inventory Package counts use explicit build rows", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const state = bridge.getState();
    const provisional = bridge.provisionalInventoryPackageForEnrichmentForTest({
      datasetMeta: {
        ...state.datasetMeta,
        datasetId: "DS-PROVISIONAL-COUNT",
        packageId: "PKG-PROVISIONAL-COUNT",
        buildMetadata: { datasetId: "DS-PROVISIONAL-COUNT" }
      },
      normalizedRows: Array.from({ length: 5000 }, (_, index) => ({ row_number: index + 1 })),
      analyticalRows: Array.from({ length: 4850 }, (_, index) => ({ row_number: index + 1 }))
    });
    assert.equal(provisional.datasetId, "DS-PROVISIONAL-COUNT", "Provisional package should use explicit Dataset ID");
    assert.equal(provisional.buildData.buildMetadata.datasetId, "DS-PROVISIONAL-COUNT", "Build Metadata should match provisional Dataset ID");
    assert.equal(provisional.buildData.normalizedRowCount, 5000, "Normalized row count should use explicit prepared normalized rows");
    assert.equal(provisional.buildData.analyticalRowCount, 4850, "Analytical row count should use explicit analytical rows being enriched");
  });

  test("AP 16.2b.1 Package import rollback remains best-effort when rollback rendering fails", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getState();
    const beforeStats = bridge.getRegistryStats();
    const result = bridge.importMaterialMasterTextForTest(materialMasterCsv(), "material-master-best-effort-rollback.csv", {
      forceInventoryEnrichmentFailureForTest: "after-package",
      forcePackageImportRollbackFailureForTest: "render",
      suppressErrorLog: true
    });
    const after = bridge.getState();
    const afterStats = bridge.getRegistryStats();
    assert.equal(result.status, "error", "Forced enrichment failure should surface as package import failure");
    assert.equal(after.activeInventoryPackageId, before.activeInventoryPackageId, "Best-effort rollback should restore active Inventory package");
    assert.equal(after.activeMaterialMasterPackage, null, "Best-effort rollback should restore active Material Master package");
    assert.equal(afterStats.packageCount, beforeStats.packageCount, "Best-effort rollback should restore Registry package count");
    assert.equal(afterStats.sequence, beforeStats.sequence, "Best-effort rollback should restore Registry sequence");
    assert.deepEqual(after.materialMasterRelationship, before.materialMasterRelationship, "Best-effort rollback should restore relationship state");
    assert.deepEqual(after.inventoryEnrichment, before.inventoryEnrichment, "Best-effort rollback should restore enrichment diagnostics");
    assert.ok(after.feedback.length > 0, "Material-Master-specific failure feedback should survive rollback");
  });

  test("AP 16.2b production app loads Relationship, Enrichment and Inventory Enrichment modules", async assert => {
    const app = await helpers.loadProductionApp();
    assert.equal(app.ObsoliQ.data.packageRelationshipEngine.version, "1", "Relationship Engine should load");
    assert.equal(app.ObsoliQ.data.packageEnrichmentEngine.version, "1", "Enrichment Engine should load");
    assert.equal(app.ObsoliQ.application.inventoryEnrichmentService.version, "1", "Inventory Enrichment Service should load");
  });
})();
