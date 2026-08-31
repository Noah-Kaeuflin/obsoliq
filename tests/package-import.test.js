(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  const MATERIAL_MASTER_TYPE = "material_master";

  function materialMasterCsv(rows = [
    ["0000123", "1000", "Pressure sensor", "PC-100", "MRP-01"],
    ["0000124", "1000", "Valve assembly", "PC-100", "MRP-01"]
  ]) {
    return [
      "Material Number,Plant,Material Description,Profit Center,MRP Controller",
      ...rows.map(row => row.join(","))
    ].join("\n");
  }

  function duplicateMaterialCsv() {
    return materialMasterCsv([
      ["0000123", "1000", "Pressure sensor", "PC-100", "MRP-01"],
      ["0000123", "1000", "Pressure sensor duplicate", "PC-100", "MRP-01"]
    ]);
  }

  test("Phase 0 rejects issuesEvaluated=true without an explicit issues array", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    assert.throws(() => bridge.evaluatePackageQualitySummaryForTest("2026-08-18T03:00:00.000Z", {
      issuesEvaluated: true
    }), "issuesEvaluated=true without issues should throw");
    assert.throws(() => bridge.evaluatePackageQualitySummaryForTest("2026-08-18T03:00:00.000Z", {
      issuesEvaluated: true,
      issues: null
    }), "issuesEvaluated=true with null issues should throw");
    assert.throws(() => bridge.evaluatePackageQualitySummaryForTest("2026-08-18T03:00:00.000Z", {
      issuesEvaluated: true,
      issues: {}
    }), "issuesEvaluated=true with object issues should throw");
  });

  test("Phase 0 Data Quality rendering does not trigger hidden issue detection", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.setDataQualityIssueSnapshotForTest([]);
    bridge.resetDataQualityEvaluationCounters();
    bridge.renderDataQualityForTest();
    const counters = bridge.getDataQualityEvaluationCounters();
    assert.equal(counters.detectDataQualityIssues, 0, "Renderer should not call detectDataQualityIssues");
    assert.ok(counters.buildDataQualityModel > 0, "Renderer may build a display model from the explicit snapshot");
  });

  test("Phase 0 sourceIndex validation is strict and non-coercing", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const metadata = [
      { sourceKey: "Safety Stock Target", originalHeader: "Safety Stock Target", sourceIndex: 0, duplicateIndex: 1, duplicateCount: 2, normalizedOriginalHeader: "safety_stock_target" },
      { sourceKey: "Safety Stock Target__2", originalHeader: "Safety Stock Target", sourceIndex: 1, duplicateIndex: 2, duplicateCount: 2, normalizedOriginalHeader: "safety_stock_target" }
    ];
    const base = {
      sourceColumn: "Safety Stock Target",
      sourceKey: "Safety Stock Target",
      normalizedSourceColumn: "safety_stock_target",
      selectedCanonicalField: "safety_stock_target",
      status: "mapped"
    };
    [null, "", undefined, false, true, "0", "1", -1, 1.5, NaN, Infinity].forEach(sourceIndex => {
      assert.equal(bridge.mappingEntryHasValidSourceIdentityForTest({ ...base, sourceIndex }, metadata), false, `sourceIndex ${String(sourceIndex)} should be invalid`);
    });
    assert.equal(bridge.mappingEntryHasValidSourceIdentityForTest({ ...base, sourceIndex: 0 }, metadata), true, "numeric sourceIndex 0 should be valid");
    assert.equal(bridge.mappingEntryHasValidSourceIdentityForTest({ ...base, sourceColumn: "Safety Stock Target__2", sourceKey: "Safety Stock Target__2", sourceIndex: 1 }, metadata), true, "numeric sourceIndex 1 should be valid");
  });

  test("Phase 0 duplicate physical headers remain distinguishable", async assert => {
    const app = await helpers.loadSampleApp();
    const sourceModel = app.ObsoliQ.data.sourceModel;
    const parsed = app.ObsoliQ.data.ingestion.parseDelimited("Safety Stock Target,Safety Stock Target\n100,200");
    const bridge = app.__obsoliqTestBridge;
    assert.equal(parsed.sourceColumnMetadata[0].sourceIndex, 0, "First physical header should keep sourceIndex 0");
    assert.equal(parsed.sourceColumnMetadata[1].sourceIndex, 1, "Second physical header should keep sourceIndex 1");
    assert.equal(parsed.headers[0], "Safety Stock Target", "First physical header should keep base source key");
    assert.equal(parsed.headers[1], "Safety Stock Target__2", "Second physical header should get a physical source key");
    assert.equal(parsed.rows[0]["Safety Stock Target"], "100", "First physical value should be preserved");
    assert.equal(parsed.rows[0]["Safety Stock Target__2"], "200", "Second physical value should be preserved");
    assert.equal(sourceModel.sourceMetaForColumn("Safety Stock Target", "1", parsed.sourceColumnMetadata), null, "String sourceIndex should not resolve");
    assert.equal(sourceModel.sourceMetaForColumn("Safety Stock Target__2", 1, parsed.sourceColumnMetadata).sourceKey, "Safety Stock Target__2", "Second physical source should resolve only by numeric sourceIndex");
    assert.equal(bridge.mappingEntryHasValidSourceIdentityForTest({
      sourceColumn: "Safety Stock Target",
      normalizedSourceColumn: "safety_stock_target",
      selectedCanonicalField: "safety_stock_target",
      status: "mapped"
    }, parsed.sourceColumnMetadata), false, "Missing sourceIndex should not prove a duplicate physical header");
  });

  test("Package Import Service prepares Material Master import without Registry mutation", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const service = bridge.packageImportServiceForTest;
    const parsed = bridge.parseDelimited(materialMasterCsv());
    const before = bridge.getRegistryStats();
    const prepared = service.prepareImport({
      packageType: MATERIAL_MASTER_TYPE,
      parsedSource: parsed,
      sourceDescriptor: { sourceLabel: "material-master.csv", sourceType: "upload" }
    });
    const after = bridge.getRegistryStats();
    assert.equal(prepared.ok, true, "Prepare should succeed");
    assert.equal(prepared.packageType, MATERIAL_MASTER_TYPE, "Prepare should keep package type");
    assert.equal(prepared.mappingState.missingRequiredFields.length, 0, "Material Master policy should not require stock value");
    assert.equal(after.packageCount, before.packageCount, "Prepare must not register a package");
    assert.equal(after.sequence, before.sequence, "Prepare must not consume a package ID");
    assert.throws(() => service.prepareImport({ packageType: "unknown", parsedSource: parsed }), "Invalid package type should be rejected");
  });

  test("Successful Material Master import registers one active package and preserves Inventory analytics", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getState();
    const beforeStats = bridge.getRegistryStats();
    const result = bridge.importMaterialMasterTextForTest(materialMasterCsv(), "material-master.csv");
    const after = bridge.getState();
    const afterStats = bridge.getRegistryStats();
    const materialPackage = bridge.getActiveMaterialMasterPackage();
    assert.equal(result.status, "loaded", "Material Master import should complete");
    assert.ok(materialPackage, "Active Material Master package should exist");
    assert.equal(materialPackage.packageType, MATERIAL_MASTER_TYPE, "Material Master package type should be registered");
    assert.equal(materialPackage.packageValidation.statusKey, "ready", "Material Master package validation should be ready");
    assert.equal(materialPackage.packageValidation.keyGranularity, "material_plant", "Plant-populated file should use Material + Plant granularity");
    assert.equal(materialPackage.buildData.packageRows[0].material_id, "0000123", "Leading-zero material number should be preserved as text");
    assert.equal(after.activeInventoryPackageId, before.activeInventoryPackageId, "Active Inventory package should remain unchanged");
    assert.equal(after.currentDatasetId, before.currentDatasetId, "Visible Inventory dataset should remain unchanged");
    assert.equal(after.enrichedRows, before.enrichedRows, "Inventory row count should remain unchanged");
    assert.equal(afterStats.countsByType.material_master, (beforeStats.countsByType.material_master || 0) + 1, "One Material Master package should be registered");
    assert.equal(bridge.relationshipReadinessForTest().statusKey, "ready_material", "Sample inventory without plant key should be relationship-ready by material");
  });

  test("Failed Material Master build creates no package and restores sequence", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getRegistryStats();
    const result = bridge.importMaterialMasterTextForTest(duplicateMaterialCsv(), "material-master-duplicate.csv", {
      suppressErrorLog: true,
      suppressFeedback: true
    });
    const after = bridge.getRegistryStats();
    assert.equal(result.status, "error", "Duplicate Material Master keys should fail import");
    assert.equal(after.countsByType.material_master, before.countsByType.material_master, "Failed build should create no Material Master package");
    assert.equal(after.sequence, before.sequence, "Failed build should not consume package sequence");
  });

  test("Material Master material-only granularity preserves source rows", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const service = bridge.packageImportServiceForTest;
    const parsed = bridge.parseDelimited("Material Number,Material Description\n0000999,Material only item");
    const originalRows = JSON.stringify(parsed.rows);
    const prepared = service.prepareImport({
      packageType: MATERIAL_MASTER_TYPE,
      parsedSource: parsed,
      sourceDescriptor: { sourceLabel: "material-only.csv", sourceType: "upload" }
    });
    const result = service.importPackage({
      packageType: MATERIAL_MASTER_TYPE,
      parsedSource: prepared.parsedSource,
      approvedMapping: prepared.approvedMapping,
      sourceDescriptor: prepared.sourceDescriptor
    });
    assert.equal(result.ok, true, "Material-only import should succeed");
    assert.equal(result.packageRecord.packageValidation.keyGranularity, "material", "Missing plant mapping should use material granularity");
    assert.equal(result.packageRecord.relationshipKeys.organization, undefined, "Material-only package should not expose plant relationship key");
    assert.equal(JSON.stringify(parsed.rows), originalRows, "Source rows should not be mutated by package import");
    assert.equal(result.packageRecord.buildData.packageRows[0].material_id, "0000999", "Leading-zero material should remain text");
  });

  test("Material Master missing or protected material_id mapping is invalid", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const service = bridge.packageImportServiceForTest;
    const parsed = bridge.parseDelimited("Material Description,Plant\nNo material,1000");
    const prepared = service.prepareImport({
      packageType: MATERIAL_MASTER_TYPE,
      parsedSource: parsed,
      sourceDescriptor: { sourceLabel: "missing-material.csv", sourceType: "upload" }
    });
    const missing = service.buildPackage({
      packageType: MATERIAL_MASTER_TYPE,
      parsedSource: prepared.parsedSource,
      approvedMapping: prepared.approvedMapping,
      sourceDescriptor: prepared.sourceDescriptor
    });
    const protectedMapping = prepared.approvedMapping.map((entry, index) => index === 0
      ? { ...entry, selectedCanonicalField: "material_id", status: "mapped", ignored: false, protected: true }
      : entry);
    const protectedResult = service.buildPackage({
      packageType: MATERIAL_MASTER_TYPE,
      parsedSource: prepared.parsedSource,
      approvedMapping: protectedMapping,
      sourceDescriptor: prepared.sourceDescriptor
    });
    assert.equal(missing.ok, false, "Missing material_id mapping should fail");
    assert.equal(protectedResult.ok, false, "Protected source column should not satisfy material_id");
    assert.ok(missing.packageValidation.blockingErrors.some(error => error.key === "mappingMissingRequired" && error.field === "material_id"), "Missing material_id must be blocked at the source-bound Mapping gate");
  });

  test("Repeated Material Master imports use unique IDs and keep Inventory active", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getState();
    const first = bridge.importMaterialMasterTextForTest(materialMasterCsv(), "material-master-1.csv");
    const firstPackage = bridge.getActiveMaterialMasterPackage();
    const second = bridge.importMaterialMasterTextForTest(materialMasterCsv([
      ["0000200", "2000", "Pump rotor", "PC-200", "MRP-02"]
    ]), "material-master-2.csv");
    const secondPackage = bridge.getActiveMaterialMasterPackage();
    const after = bridge.getState();
    assert.equal(first.status, "loaded", "First import should succeed");
    assert.equal(second.status, "loaded", "Second import should succeed");
    assert.notEqual(firstPackage.packageId, secondPackage.packageId, "Material Master package IDs should be unique");
    assert.equal(after.activeInventoryPackageId, before.activeInventoryPackageId, "Inventory active package should remain active after repeated Material Master imports");
    assert.equal(bridge.getMaterialMasterPackages().length, 2, "Both Material Master package records should coexist");
  });

  test("Package commit rollback removes phantom package and restores sequence", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const service = bridge.packageImportServiceForTest;
    const parsed = bridge.parseDelimited(materialMasterCsv());
    const prepared = service.prepareImport({
      packageType: MATERIAL_MASTER_TYPE,
      parsedSource: parsed,
      sourceDescriptor: { sourceLabel: "material-master.csv", sourceType: "upload" }
    });
    const built = service.buildPackage({
      packageType: MATERIAL_MASTER_TYPE,
      parsedSource: prepared.parsedSource,
      approvedMapping: prepared.approvedMapping,
      sourceDescriptor: prepared.sourceDescriptor
    });
    const before = bridge.getRegistryStats();
    const failed = service.commitPackage({
      preparedPackage: built.preparedPackage,
      forceCommitFailureForTest: "after-register"
    });
    const afterFailure = bridge.getRegistryStats();
    const successful = service.commitPackage({ preparedPackage: built.preparedPackage });
    assert.equal(failed.ok, false, "Forced commit failure should fail");
    assert.equal(afterFailure.packageCount, before.packageCount, "Rollback should remove phantom package");
    assert.equal(afterFailure.sequence, before.sequence, "Rollback should restore package ID sequence");
    assert.equal(successful.ok, true, "Retry after rollback should succeed");
    assert.equal(successful.packageRecord.packageId, `PKG-${String(before.sequence + 1).padStart(6, "0")}`, "Retry should use expected next package ID");
  });

  test("Relationship readiness reports allowed Material Master states", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const inventoryMaterial = { relationshipKeys: { material: ["material_id"] }, status: "ready", packageValidation: { statusKey: "ready" } };
    const inventoryPlant = { relationshipKeys: { material: ["material_id"], organization: ["plant"] }, status: "ready", packageValidation: { statusKey: "ready" } };
    const materialOnly = { relationshipKeys: { material: ["material_id"] }, status: "ready", packageValidation: { statusKey: "ready" } };
    const materialPlant = { relationshipKeys: { material: ["material_id"], organization: ["plant"] }, status: "ready", packageValidation: { statusKey: "ready" } };
    const invalid = { relationshipKeys: { material: ["material_id"] }, status: "invalid", packageValidation: { statusKey: "invalid" } };
    const missingKey = { relationshipKeys: {}, status: "ready", packageValidation: { statusKey: "ready" } };
    assert.equal(bridge.relationshipReadinessForTest(inventoryMaterial, materialOnly).statusKey, "ready_material", "Material-only packages should be ready by material");
    assert.equal(bridge.relationshipReadinessForTest(inventoryPlant, materialPlant).statusKey, "ready_material_plant", "Plant-specific packages should be ready by material + plant");
    assert.equal(bridge.relationshipReadinessForTest(inventoryPlant, materialOnly).statusKey, "ready_material", "Inventory material+plant with material-only master remains ready by material");
    assert.equal(bridge.relationshipReadinessForTest(inventoryMaterial, missingKey).statusKey, "missing_material_key", "Missing material key should be reported");
    assert.equal(bridge.relationshipReadinessForTest(inventoryMaterial, invalid).statusKey, "invalid", "Invalid Material Master package should be reported");
  });

  test("Production app loads Package Import Service and Material Master Builder via file-compatible scripts", async assert => {
    const app = await helpers.loadProductionApp();
    assert.equal(app.ObsoliQ.data.materialMasterBuilder.version, "1", "Material Master Builder should load");
    assert.equal(app.ObsoliQ.application.packageImportService.version, "1", "Package Import Service should load");
  });
})();
