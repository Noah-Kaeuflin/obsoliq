(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function packageInput(overrides = {}) {
    const datasetId = overrides.datasetId || "DS-REG-001";
    return {
      packageType: "inventory_snapshot",
      datasetId,
      sourceDescriptor: { sourceLabel: "registry.csv", sourceType: "upload", rows: 1, columns: 3 },
      sourceData: {
        headers: ["Material Number", "Plant", "Profit Center"],
        sourceColumnMetadata: [
          { sourceKey: "Material Number", originalHeader: "Material Number", sourceIndex: 0, duplicateIndex: 1, duplicateCount: 1, normalizedOriginalHeader: "material_number" },
          { sourceKey: "Plant", originalHeader: "Plant", sourceIndex: 1, duplicateIndex: 1, duplicateCount: 1, normalizedOriginalHeader: "plant" },
          { sourceKey: "Profit Center", originalHeader: "Profit Center", sourceIndex: 2, duplicateIndex: 1, duplicateCount: 1, normalizedOriginalHeader: "profit_center" }
        ],
        rows: [{ "Material Number": "MAT-1", Plant: "1000", "Profit Center": "PC-1" }]
      },
      mapping: {
        columnMapping: [
          { sourceIndex: 0, sourceColumn: "Material Number", normalizedSourceColumn: "material_number", selectedCanonicalField: "material_id", status: "mapped" },
          { sourceIndex: 1, sourceColumn: "Plant", normalizedSourceColumn: "plant", selectedCanonicalField: "plant", status: "mapped" },
          { sourceIndex: 2, sourceColumn: "Profit Center", normalizedSourceColumn: "profit_center", selectedCanonicalField: "profit_center", status: "mapped" }
        ]
      },
      buildData: {
        buildMetadata: { datasetId, activeRowCount: 1, sourceRowCount: 1 }
      },
      qualitySummary: {
        score: 100,
        rawScore: 100,
        statusKey: "qualityExcellent",
        analysisReadiness: "analysisReady",
        pilotReadiness: "pilotReady",
        workflowReadiness: "workflowReady",
        openIssues: 0,
        resolvedIssues: 0,
        acceptedExceptions: 0,
        qualityEvaluatedAt: "2026-08-18T00:00:00.000Z"
      },
      freshness: { importedAt: "2026-08-18T00:00:00.000Z" },
      relationshipKeys: {
        material: ["material_id"],
        organization: ["plant", "profit_center"]
      },
      createdAt: "2026-08-18T00:00:00.000Z",
      updatedAt: "2026-08-18T00:00:00.000Z",
      ...overrides
    };
  }

  function openMappingReview(app, stage = "") {
    const bridge = app.__obsoliqTestBridge;
    const parsed = bridge.parseDelimited(helpers.simpleCsv(`MAT-REG-${stage || "OK"}`, "180"));
    const result = bridge.beginUploadWithParsedData(parsed, `registry-${stage || "ok"}.csv`, {
      sourceType: "upload",
      forceReview: true,
      preserveRemediation: true,
      suppressErrorLog: true,
      preserveFailureFeedback: true,
      forceMappingFinalizeFailureForTest: stage
    });
    if (result.status !== "mapping") {
      throw new Error(`Expected mapping review, got ${result.status}`);
    }
  }

  function largeInventoryCsv(rowCount = 10000, suffix = "A") {
    const rows = [
      "Material Number,Material Description,Stock Value EUR,Plant,Profit Center,Program,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value,Accountable L1"
    ];
    for (let index = 0; index < rowCount; index += 1) {
      const value = 100 + (index % 500);
      rows.push([
        `MAT-LARGE-${suffix}-${String(index + 1).padStart(5, "0")}`,
        `Large scale material ${index + 1}`,
        value,
        `PL-${index % 4}`,
        `PC-${index % 12}`,
        `Program ${index % 8}`,
        index % 5 === 0 ? 40 : 0,
        index % 7 === 0 ? 25 : 0,
        index % 11 === 0 ? 15 : 0,
        index % 13 === 0 ? 10 : 0,
        `Owner ${index % 6}`
      ].join(","));
    }
    return rows.join("\n");
  }

  test("Data Package Registry contract supports immutable records and deterministic IDs", async assert => {
    const app = await helpers.loadApp();
    const module = app.ObsoliQ.data.packageRegistry;
    const registry = module.createDataPackageRegistry();
    assert.equal(module.version, "1", "Registry module version should be exposed");
    assert.ok(Object.isFrozen(module.DATA_PACKAGE_TYPES), "Package type contract should be frozen");
    assert.equal(Object.keys(module.DATA_PACKAGE_TYPE_DEFINITIONS).length, 10, "All package type definitions should exist");

    const first = registry.registerPackage(packageInput());
    const second = registry.registerPackage(packageInput({
      datasetId: "DS-REG-002",
      packageType: "material_master",
      buildData: { buildMetadata: { datasetId: "DS-REG-002" } },
      relationshipKeys: { material: ["material_id"] },
      freshness: { importedAt: "2026-08-18T00:01:00.000Z" }
    }));
    assert.equal(first.packageId, "PKG-000001", "First generated package ID should be deterministic");
    assert.equal(second.packageId, "PKG-000002", "Second generated package ID should advance deterministically");
    assert.equal(registry.listPackages().length, 2, "Multiple package records should coexist");
    assert.equal(registry.getActivePackageId("material_master"), second.packageId, "Active package should be tracked by type");
    assert.ok(Object.isFrozen(registry.getPackage(first.packageId)), "Getter should return immutable package records");

    const updated = registry.updatePackage(first.packageId, { status: "updated", updatedAt: "2026-08-18T00:02:00.000Z" });
    assert.equal(updated.revision, first.revision + 1, "Update should increment package revision");
    assert.equal(updated.createdAt, first.createdAt, "Update should keep createdAt stable");
    assert.equal(updated.status, "updated", "Update should replace package state");

    const snapshot = registry.snapshot();
    registry.registerPackage(packageInput({ datasetId: "DS-REG-003", freshness: { importedAt: "2026-08-18T00:03:00.000Z" } }));
    registry.restore(snapshot);
    const afterRestore = registry.registerPackage(packageInput({ datasetId: "DS-REG-004", freshness: { importedAt: "2026-08-18T00:04:00.000Z" } }));
    assert.equal(afterRestore.packageId, "PKG-000003", "Snapshot restore should restore the package sequence");

    assert.throws(() => registry.registerPackage(packageInput({ packageType: "unknown_type" })), "Invalid package type should be rejected");
    assert.throws(() => registry.registerPackage(packageInput({ datasetId: "" })), "Missing datasetId should be rejected");
    assert.throws(() => registry.registerPackage(packageInput({ packageId: first.packageId })), "Duplicate packageId should be rejected");
    assert.throws(() => registry.registerPackage(packageInput({
      datasetId: "DS-A",
      buildData: { buildMetadata: { datasetId: "DS-B" } }
    })), "Foreign build metadata should be rejected");
    assert.throws(() => registry.registerPackage(packageInput({ relationshipKeys: { material: "material_id" } })), "Invalid relationship keys should be rejected");
  });

  test("Data Package Registry retention is bounded and protects active packages", async assert => {
    const app = await helpers.loadApp();
    const module = app.ObsoliQ.data.packageRegistry;
    const registry = module.createDataPackageRegistry();
    registry.setRetentionLimit("inventory_snapshot", 2);
    const first = registry.registerPackage(packageInput({ datasetId: "DS-RET-1", updatedAt: "2026-08-18T00:00:00.000Z" }));
    const second = registry.registerPackage(packageInput({ datasetId: "DS-RET-2", updatedAt: "2026-08-18T00:01:00.000Z" }));
    const third = registry.registerPackage(packageInput({ datasetId: "DS-RET-3", updatedAt: "2026-08-18T00:02:00.000Z" }));
    const removed = registry.enforceRetention("inventory_snapshot");
    const stats = registry.getStats();
    assert.includes(removed, first.packageId, "Oldest inactive package should be pruned first");
    assert.equal(registry.hasPackage(third.packageId), true, "Active package should remain after retention");
    assert.equal(registry.hasPackage(second.packageId), true, "Newest inactive package should remain within limit");
    assert.equal(stats.countsByType.inventory_snapshot, 2, "Inventory package count should respect retention limit");
    assert.equal(stats.retentionLimits.inventory_snapshot, 2, "Retention limit should be exposed in stats");
    assert.equal(stats.activePackageIds.inventory_snapshot, third.packageId, "Active package ID should be exposed in stats");
    assert.throws(() => registry.removePackage(third.packageId), "Active package removal should be rejected");
  });

  test("successful sample load registers an active Inventory Snapshot package", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const state = bridge.getState();
    const activePackage = bridge.getActiveInventoryPackage();
    assert.ok(activePackage, "Sample load should create an active Inventory Snapshot package");
    assert.equal(activePackage.packageType, "inventory_snapshot", "Sample package should use the Inventory Snapshot type");
    assert.equal(activePackage.packageId, state.datasetMeta.packageId, "Dataset Meta should carry the active packageId");
    assert.equal(activePackage.datasetId, state.currentDatasetId, "Active package should own the active datasetId");
    assert.equal(activePackage.buildData.buildMetadata.datasetId, state.currentDatasetId, "Build metadata should belong to the active dataset");
    assert.equal(state.activeInventoryPackageId, activePackage.packageId, "Active package ID should be exposed consistently");
  });

  test("new inventory upload creates a new package and preserves previous package records", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getState();
    const loaded = await bridge.loadTextDataset(helpers.simpleCsv("MAT-NEW-PKG", "250"), "new-package.csv", {
      sourceType: "upload",
      allowMappingReview: false
    });
    const after = bridge.getState();
    const packages = bridge.getInventoryPackages();
    assert.equal(loaded.status, "loaded", "Upload should load successfully");
    assert.notEqual(after.datasetMeta.packageId, before.datasetMeta.packageId, "New upload should create a new packageId");
    assert.notEqual(after.currentDatasetId, before.currentDatasetId, "New upload should create a new datasetId");
    assert.ok(packages.length >= 2, "Previous Inventory Snapshot package should remain in the registry");
    assert.ok(packages.some(record => record.packageId === before.datasetMeta.packageId), "Previous package should still be listed");
    assert.equal(after.activeInventoryPackageId, after.datasetMeta.packageId, "Active package should switch to the new upload");
  });

  test("same-dataset mapping keeps package identity and increments revision", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getState();
    const beforePackage = before.activeInventoryPackage;
    openMappingReview(app);
    const result = bridge.continueUploadWithMapping();
    const after = bridge.getState();
    assert.equal(result, true, "Mapping apply should succeed");
    assert.equal(after.currentDatasetId, before.currentDatasetId, "Same-dataset mapping should retain datasetId");
    assert.equal(after.datasetMeta.packageId, before.datasetMeta.packageId, "Same-dataset mapping should retain packageId");
    assert.equal(after.activeInventoryPackage.revision, beforePackage.revision + 1, "One mapping operation should increment revision exactly once");
    assert.equal(after.activeInventoryPackage.freshness.importedAt, beforePackage.freshness.importedAt, "Mapping rebuild should preserve original importedAt");
    assert.notEqual(after.activeInventoryPackage.updatedAt, beforePackage.updatedAt, "Mapping rebuild should update updatedAt");
    assert.ok(after.activeInventoryPackage.buildData.builtAt, "Mapping rebuild should write a builtAt timestamp");
    assert.ok(after.activeInventoryPackage.qualitySummary.qualityEvaluatedAt, "Mapping rebuild should write a qualityEvaluatedAt timestamp");
  });

  test("correction, undo and reset rebuilds update the existing package", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getState();
    const row = bridge.getOverviewRows()[0];
    const sourceColumn = before.originalHeaders[0];
    bridge.applyDataCorrectionForTest({
      datasetId: before.currentDatasetId,
      sourceRowIndex: row.__sourceRowIndex,
      sourceRowIndexes: [row.__sourceRowIndex],
      sourceColumn,
      canonicalField: "material_id",
      correctionType: "manual_value",
      originalValue: row.material_id,
      correctedValue: `${row.material_id}-FIX`
    }, { rebuild: true });
    const afterCorrection = bridge.getState();
    bridge.undoLastRemediationAction();
    const afterUndo = bridge.getState();
    bridge.applyDataCorrectionForTest({
      datasetId: before.currentDatasetId,
      sourceRowIndex: row.__sourceRowIndex,
      sourceRowIndexes: [row.__sourceRowIndex],
      sourceColumn,
      canonicalField: "material_id",
      correctionType: "manual_value",
      originalValue: row.material_id,
      correctedValue: `${row.material_id}-RESET`
    }, { rebuild: true });
    const beforeReset = bridge.getState();
    bridge.resetAllRemediation();
    const afterReset = bridge.getState();
    assert.equal(afterCorrection.datasetMeta.packageId, before.datasetMeta.packageId, "Correction should retain packageId");
    assert.equal(afterUndo.datasetMeta.packageId, before.datasetMeta.packageId, "Undo should retain packageId");
    assert.equal(afterReset.datasetMeta.packageId, before.datasetMeta.packageId, "Reset should retain packageId");
    assert.ok(afterCorrection.activeInventoryPackage.revision > before.activeInventoryPackage.revision, "Correction should increment revision");
    assert.equal(afterUndo.activeInventoryPackage.revision, afterCorrection.activeInventoryPackage.revision + 1, "Undo should increment revision once");
    assert.equal(afterReset.activeInventoryPackage.revision, beforeReset.activeInventoryPackage.revision + 1, "Reset should increment revision once when active remediation exists");
    assert.equal(afterReset.activeInventoryPackage.freshness.importedAt, before.activeInventoryPackage.freshness.importedAt, "Same-package remediation rebuilds should preserve importedAt");
  });

  test("failed correction, decision, undo and reset transactions roll back registry and runtime state", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const baseline = bridge.getState();
    const row = bridge.getOverviewRows()[0];
    const sourceColumn = baseline.originalHeaders[0];
    const failedCorrection = bridge.applyDataCorrectionForTest({
      datasetId: baseline.currentDatasetId,
      sourceRowIndex: row.__sourceRowIndex,
      sourceRowIndexes: [row.__sourceRowIndex],
      sourceColumn,
      canonicalField: "material_id",
      correctionType: "manual_value",
      originalValue: row.material_id,
      correctedValue: `${row.material_id}-ROLLBACK`
    }, {
      rebuild: true,
      feedback: true,
      forcePackageFinalizationFailureForTest: true,
      suppressErrorLog: true,
      preserveFailureFeedback: true
    });
    const afterFailedCorrection = bridge.getState();
    assert.equal(failedCorrection, null, "Failed correction should return no committed correction");
    assert.equal(afterFailedCorrection.dataCorrections, baseline.dataCorrections, "Failed correction should remove correction mutation");
    assert.equal(afterFailedCorrection.remediationActions, baseline.remediationActions, "Failed correction should remove remediation action");
    assert.equal(afterFailedCorrection.remediationHistory, baseline.remediationHistory, "Failed correction should remove history entry");
    assert.equal(afterFailedCorrection.issueLedgerSize, baseline.issueLedgerSize, "Failed correction should restore Issue Ledger");
    assert.equal(afterFailedCorrection.activeInventoryPackage.revision, baseline.activeInventoryPackage.revision, "Failed correction should not increment package revision");

    const issue = bridge.getDataQualityIssues()[0];
    assert.ok(issue, "Sample data should expose at least one data-quality issue for decision rollback");
    const failedDecision = bridge.createIssueDecisionForTest(issue, "accepted_exception", {
      forcePackageFinalizationFailureForTest: true,
      suppressErrorLog: true,
      preserveFailureFeedback: true
    });
    const afterFailedDecision = bridge.getState();
    assert.equal(failedDecision, null, "Failed decision should return no committed decision");
    assert.equal(afterFailedDecision.issueDecisions, baseline.issueDecisions, "Failed decision should remove decision mutation");
    assert.equal(afterFailedDecision.remediationActions, baseline.remediationActions, "Failed decision should remove decision action");
    assert.equal(afterFailedDecision.activeInventoryPackage.revision, baseline.activeInventoryPackage.revision, "Failed decision should not increment package revision");

    const committedCorrection = bridge.applyDataCorrectionForTest({
      datasetId: baseline.currentDatasetId,
      sourceRowIndex: row.__sourceRowIndex,
      sourceRowIndexes: [row.__sourceRowIndex],
      sourceColumn,
      canonicalField: "material_id",
      correctionType: "manual_value",
      originalValue: row.material_id,
      correctedValue: `${row.material_id}-OK`
    }, { rebuild: true });
    assert.ok(committedCorrection, "Control correction should commit successfully");
    const afterCommittedCorrection = bridge.getState();
    const failedUndo = bridge.undoLastRemediationAction({
      forcePackageFinalizationFailureForTest: true,
      suppressErrorLog: true,
      preserveFailureFeedback: true
    });
    const afterFailedUndo = bridge.getState();
    assert.equal(failedUndo, false, "Failed undo should return false");
    assert.equal(afterFailedUndo.activeInventoryPackage.revision, afterCommittedCorrection.activeInventoryPackage.revision, "Failed undo should not increment revision");
    assert.equal(bridge.getDataCorrections().filter(correction => correction.status === "active").length, 1, "Failed undo should keep correction active");

    const failedReset = bridge.resetAllRemediation({
      forcePackageFinalizationFailureForTest: true,
      suppressErrorLog: true,
      preserveFailureFeedback: true
    });
    const afterFailedReset = bridge.getState();
    assert.equal(failedReset, false, "Failed reset should return false");
    assert.equal(afterFailedReset.activeInventoryPackage.revision, afterCommittedCorrection.activeInventoryPackage.revision, "Failed reset should not increment revision");
    assert.equal(bridge.getDataCorrections().filter(correction => correction.status === "active").length, 1, "Failed reset should keep correction active");
  });

  test("successful issue decision stores final Package Quality Summary", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getState();
    const issue = bridge.getDataQualityIssues()[0];
    assert.ok(issue, "Sample data should expose at least one issue");
    const decision = bridge.createIssueDecisionForTest(issue, "accepted_exception");
    const after = bridge.getState();
    assert.ok(decision, "Decision should commit");
    assert.equal(after.activeInventoryPackage.revision, before.activeInventoryPackage.revision + 1, "Decision should create one package revision");
    assert.ok(after.activeInventoryPackage.qualitySummary.acceptedExceptions > before.activeInventoryPackage.qualitySummary.acceptedExceptions, "Package summary should include final accepted exception count");
    const evaluatedSummary = bridge.evaluatePackageQualitySummaryForTest(after.activeInventoryPackage.qualitySummary.qualityEvaluatedAt);
    assert.equal(after.activeInventoryPackage.qualitySummary.openIssues, evaluatedSummary.openIssues, "Package summary open issues should match final application quality state");
  });

  test("relationship keys use only approved importable non-protected mappings", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const metadata = [
      { sourceKey: "Material", originalHeader: "Material", sourceIndex: 0, duplicateIndex: 1, duplicateCount: 1, normalizedOriginalHeader: "material" },
      { sourceKey: "Plant", originalHeader: "Plant", sourceIndex: 1, duplicateIndex: 1, duplicateCount: 1, normalizedOriginalHeader: "plant" },
      { sourceKey: "Profit Center", originalHeader: "Profit Center", sourceIndex: 2, duplicateIndex: 1, duplicateCount: 1, normalizedOriginalHeader: "profit_center" },
      { sourceKey: "Row", originalHeader: "Row", sourceIndex: 3, duplicateIndex: 1, duplicateCount: 1, normalizedOriginalHeader: "row" }
    ];
    const keys = bridge.inventoryPackageRelationshipKeys([
      { sourceIndex: 0, sourceColumn: "Material", normalizedSourceColumn: "material", selectedCanonicalField: "material_id", status: "mapped" },
      { sourceIndex: 1, sourceColumn: "Plant", normalizedSourceColumn: "plant", selectedCanonicalField: "plant", ignored: true, status: "mapped" },
      { sourceIndex: 2, sourceColumn: "Profit Center", normalizedSourceColumn: "profit_center", proposedCanonicalField: "profit_center", status: "unmapped" },
      { sourceIndex: 3, sourceColumn: "Row", normalizedSourceColumn: "row", selectedCanonicalField: "row_number", protected: true, status: "protected" }
    ], metadata);
    assert.deepEqual(keys, { material: ["material_id"] }, "Relationship keys should ignore ignored, proposed and protected fields");
  });

  test("UI-only filter changes do not update package revision", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getState();
    bridge.setControlValue("searchInput", "MAT");
    bridge.updateFilterStateFromControls();
    const after = bridge.getState();
    assert.equal(after.activeInventoryPackage.revision, before.activeInventoryPackage.revision, "Filter changes should not update package revision");
    assert.equal(after.activeInventoryPackage.updatedAt, before.activeInventoryPackage.updatedAt, "Filter changes should not update package timestamp");
  });

  test("app-level package retention keeps active package and bounds inactive snapshots", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.setInventoryPackageRetentionLimitForTest(3);
    for (let index = 0; index < 5; index += 1) {
      const result = await bridge.loadTextDataset(helpers.simpleCsv(`MAT-RET-${index}`, String(100 + index)), `retention-${index}.csv`, {
        sourceType: "upload",
        allowMappingReview: false
      });
      assert.equal(result.status, "loaded", `Retention upload ${index} should load`);
    }
    bridge.enforceInventoryPackageRetentionForTest();
    const packages = bridge.getInventoryPackages();
    const activePackageId = bridge.getState().activeInventoryPackageId;
    assert.ok(packages.length <= 3, "Inventory packages should be bounded by app retention limit");
    assert.ok(packages.some(record => record.packageId === activePackageId), "Retention should preserve active package");
  });

  test("failed new load and late mapping failure restore registry state", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getState();
    const failedLoad = await bridge.loadTextDataset(helpers.simpleCsv("MAT-PKG-FAIL", "100"), "package-fail.csv", {
      sourceType: "upload",
      allowMappingReview: false,
      forceBuildErrorForTest: true,
      suppressErrorLog: true,
      preserveFailureFeedback: true
    });
    const afterFailedLoad = bridge.getState();
    openMappingReview(app, "render");
    const failedMapping = bridge.continueUploadWithMapping();
    const afterMappingRollback = bridge.getState();
    assert.equal(failedLoad.status, "error", "Forced build failure should fail");
    assert.equal(afterFailedLoad.datasetMeta.packageId, before.datasetMeta.packageId, "Failed load should keep previous active package");
    assert.equal(afterFailedLoad.getRegistryStats, undefined, "State object should not expose registry internals");
    assert.equal(bridge.getRegistryStats().packageCount, 1, "Failed load should not create a phantom package");
    assert.equal(failedMapping, false, "Forced late mapping failure should roll back");
    assert.equal(afterMappingRollback.datasetMeta.packageId, before.datasetMeta.packageId, "Mapping rollback should restore active packageId");
    assert.equal(afterMappingRollback.activeInventoryPackage.revision, before.activeInventoryPackage.revision, "Mapping rollback should restore package revision");
  });

  test("no-dataset rollback clears analytical views and leaves no active package", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const uploadButton = app.document.getElementById("uploadButton");
    uploadButton.focus();
    const parsed = bridge.parseDelimited(helpers.simpleCsv("MAT-NO-DATASET", "300"));
    const opened = bridge.beginUploadWithParsedData(parsed, "no-dataset.csv", {
      sourceType: "upload",
      forceReview: true,
      preserveRemediation: true,
      suppressErrorLog: true,
      preserveFailureFeedback: true,
      forceMappingFinalizeFailureForTest: "close"
    });
    assert.equal(opened.status, "mapping", "Upload should open Mapping Assistant");
    const result = bridge.continueUploadWithMapping();
    const state = bridge.getState();
    const chips = helpers.currentChips(app);
    assert.equal(result, false, "Forced close failure should roll back");
    assert.equal(state.currentDatasetId, "", "No active dataset should remain");
    assert.equal(state.rawRows, 0, "Raw rows should be empty");
    assert.equal(state.normalizedRows, 0, "Normalized rows should be empty");
    assert.equal(state.enrichedRows, 0, "Analytical rows should be empty");
    assert.equal(state.activeInventoryPackageId, "", "No active Inventory Snapshot package should remain");
    assert.equal(bridge.getRegistryStats().packageCount, 0, "No package should be left after no-dataset rollback");
    assert.ok(app.document.getElementById("mInventory")?.classList.contains("metric-value-unavailable"), "Inventory KPI should show an unavailable state without a dataset");
    assert.ok((app.document.getElementById("categoryBars")?.textContent || "").includes("Keine Daten"), "Category chart should show empty state");
    assert.ok((app.document.getElementById("topTable")?.textContent || "").includes("Keine Daten"), "Top table should show empty state");
    assert.ok(chips.source.every(text => text === ""), "Source chips should be cleared");
    assert.equal(state.mappingOpen, true, "Mapping Assistant should remain usable");
    assert.equal(state.lastMappingOpenerId, "uploadButton", "Mapping focus owner should be restored");
    bridge.setPendingUploadContextOptions({ forceMappingFinalizeFailureForTest: "" });
    bridge.closeColumnMappingAssistant({ force: true });
    assert.equal(app.document.activeElement.id, "uploadButton", "Closing Mapping Assistant should return focus to opener");
  });

  test("Phase-0 metadata and production-sanitizer gates hold", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const state = bridge.getState();
    const foreignMeta = { ...state.datasetMeta, datasetId: "DS-FOREIGN" };
    assert.throws(() => bridge.syncDatasetUiFromMeta(foreignMeta), "Foreign Dataset Meta should require explicit visibleCount");
    bridge.syncDatasetUiFromMeta(foreignMeta, { visibleCount: 7 });
    bridge.syncDatasetUiFromMeta(state.datasetMeta, { visibleCount: state.enrichedRows });
    assert.throws(() => bridge.explicitDatasetRuntimeContext({
      datasetId: "DS-A",
      correctionContext: {
        datasetId: "DS-A",
        sourceRows: [],
        headers: [],
        sourceColumnMetadata: [],
        columnMapping: []
      },
      normalizedRows: [],
      enrichedRows: [],
      corrections: [],
      decisions: [],
      remediationActions: [],
      excludedSourceRows: new Set(),
      issueLedger: new Map(),
      recoveryValidationErrors: [],
      recoveryInputNormalizationDiagnostics: {},
      buildMetadata: { datasetId: "DS-B" }
    }), "Foreign buildMetadata should be rejected");
    const sanitized = bridge.sanitizeMappingContextForProduction({
      sourceLabel: "production.csv",
      forceBuildErrorForTest: true,
      forceCommitFailureForTest: true,
      forcePostCommitFailureForTest: "render",
      forceMappingFinalizeFailureForTest: "close",
      forceDatasetIdMismatchForTest: true,
      forcePackageFinalizationFailureForTest: true,
      forceRemediationRebuildFailureForTest: true,
      forceRemediationDataQualityFailureForTest: true,
      forceRemediationRollbackRenderFailureForTest: true
    });
    assert.equal(sanitized.sourceLabel, "production.csv", "Non-test context fields should remain");
    assert.equal(sanitized.forceBuildErrorForTest, undefined, "Production sanitizer should strip build fault option");
    assert.equal(sanitized.forceCommitFailureForTest, undefined, "Production sanitizer should strip commit fault option");
    assert.equal(sanitized.forcePostCommitFailureForTest, undefined, "Production sanitizer should strip post-commit fault option");
    assert.equal(sanitized.forceMappingFinalizeFailureForTest, undefined, "Production sanitizer should strip mapping fault option");
    assert.equal(sanitized.forceDatasetIdMismatchForTest, undefined, "Production sanitizer should strip dataset mismatch option");
    assert.equal(sanitized.forcePackageFinalizationFailureForTest, undefined, "Production sanitizer should strip package finalization fault option");
    assert.equal(sanitized.forceRemediationRebuildFailureForTest, undefined, "Production sanitizer should strip remediation rebuild fault option");
    assert.equal(sanitized.forceRemediationDataQualityFailureForTest, undefined, "Production sanitizer should strip remediation Data Quality fault option");
    assert.equal(sanitized.forceRemediationRollbackRenderFailureForTest, undefined, "Production sanitizer should strip remediation rollback-render fault option");
  });

  test("Inventory package quality summary and relationship keys match the active dataset", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    await bridge.loadTextDataset([
      "Material Number,Material Description,Stock Value EUR,Plant,Profit Center,Program,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value",
      "MAT-REL,Relationship material,1500,1000,PC-REL,Program REL,200,100,0,0"
    ].join("\n"), "relationship-keys.csv", {
      sourceType: "upload",
      allowMappingReview: false
    });
    const activePackage = bridge.getActiveInventoryPackage();
    const qualitySummary = bridge.evaluatePackageQualitySummaryForTest(activePackage.qualitySummary.qualityEvaluatedAt);
    assert.deepEqual(activePackage.qualitySummary, qualitySummary, "Package quality summary should match application quality values");
    assert.includes(activePackage.relationshipKeys.material || [], "material_id", "Material relationship key should be included when mapped");
    assert.includes(activePackage.relationshipKeys.organization || [], "plant", "Plant relationship key should be included when mapped");
    assert.includes(activePackage.relationshipKeys.organization || [], "profit_center", "Profit Center relationship key should be included when mapped");
  });

  test("mapping issue references distinguish empty and missing current snapshots", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const previousIssues = [
      { issueKey: "ISS-PLANT", issueId: "DQ-1", issueType: "missing_organizational_assignment", canonicalFields: ["plant"], sourceColumns: ["Factory"] },
      { issueKey: "ISS-RECOVERY", issueId: "DQ-2", issueType: "missing_recovery_input", canonicalFields: ["excess_value"], sourceColumns: ["Excess Candidate"] },
      { issueKey: "ISS-WORKFLOW", issueId: "DQ-3", issueType: "missing_workflow_assignment", canonicalFields: ["accountable_l1"], sourceColumns: ["Owner Desk"] }
    ];
    const changes = [
      { sourceColumn: "Factory", previousCanonicalField: "", nextCanonicalField: "plant" },
      { sourceColumn: "Excess Candidate", previousCanonicalField: "", nextCanonicalField: "excess_value" },
      { sourceColumn: "Owner Desk", previousCanonicalField: "", nextCanonicalField: "accountable_l1" }
    ];
    const oneGone = bridge.issueReferencesForMappingChangeForTest({
      previousIssues: [previousIssues[0]],
      currentIssues: [],
      changes: [changes[0]]
    });
    const allGone = bridge.issueReferencesForMappingChangeForTest({ previousIssues, currentIssues: [], changes });
    const oneRemains = bridge.issueReferencesForMappingChangeForTest({
      previousIssues,
      currentIssues: [previousIssues[2]],
      changes
    });
    const missingSnapshot = bridge.issueReferencesForMappingChangeForTest({ previousIssues, currentIssues: null, changes });
    assert.includes(oneGone.resolvedIssueKeys, "ISS-PLANT", "A supplied empty snapshot should resolve the last issue");
    assert.equal(allGone.resolvedIssueKeys.length, 3, "All affected disappeared issues should be resolved");
    assert.includes(oneRemains.resolvedIssueKeys, "ISS-PLANT", "Disappeared affected issue should be resolved");
    assert.includes(oneRemains.resolvedIssueKeys, "ISS-RECOVERY", "Second disappeared affected issue should be resolved");
    assert.equal(oneRemains.resolvedIssueKeys.includes("ISS-WORKFLOW"), false, "Remaining current issue should not be resolved");
    assert.equal(missingSnapshot.resolvedIssueKeys.length, 0, "Missing snapshot should not infer resolution");
  });

  test("mapping remediation resolves the final workflow issue and creates one package revision", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const result = await bridge.loadTextDataset([
      "Material Number,Material Description,Stock Value EUR,Plant,Profit Center,Program,Excess Value,Owner Desk",
      "MAT-FINAL-ISSUE,Final issue material,1000,DE01,PC-FINAL,Program Final,300,Supply Chain"
    ].join("\n"), "final-issue-mapping.csv", {
      sourceType: "upload",
      allowMappingReview: false
    });
    assert.equal(result.status, "loaded", "Dataset should load before remediation mapping");
    const before = bridge.getState();
    const issue = bridge.getDataQualityIssues().find(item => item.issueType === "missing_workflow_assignment");
    assert.ok(issue, "Dataset should expose the final workflow assignment issue");
    const applied = bridge.applyColumnMappingFromRemediationForTest({
      sourceColumn: "Owner Desk",
      canonicalField: "accountable_l1",
      issueKey: issue.issueKey,
      issueId: issue.issueId,
      reason: "workflow-owner"
    });
    const after = bridge.getState();
    const mappingAction = bridge.getRemediationActions().filter(action => action.actionType === "mapping_change").slice(-1)[0];
    const ledgerEntry = bridge.getIssueLedgerEntries().find(entry => entry.issueKey === issue.issueKey);
    assert.equal(applied, true, "Mapping remediation should apply");
    assert.ok(mappingAction, "Mapping action should be registered");
    assert.includes(mappingAction.payload.resolvedIssueKeys, issue.issueKey, "Mapping action should resolve the disappeared final issue");
    assert.equal(ledgerEntry.currentlyDetected, false, "Issue Ledger should mark the issue as no longer detected");
    assert.equal(ledgerEntry.currentStatus, "corrected", "Issue Ledger should mark the issue corrected");
    assert.equal(after.activeInventoryPackage.revision, before.activeInventoryPackage.revision + 1, "One logical mapping operation should create one Package revision");
    assert.ok(after.activeInventoryPackage.qualitySummary.openIssues < before.activeInventoryPackage.qualitySummary.openIssues, "Package summary open issue count should decrease");
    assert.ok(after.activeInventoryPackage.qualitySummary.resolvedIssues > before.activeInventoryPackage.qualitySummary.resolvedIssues, "Package summary resolved issue count should increase");
  });

  test("Package finalization requires explicit quality summary and does not rerun Data Quality", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getState();
    assert.throws(() => bridge.commitCurrentInventoryPackageRevisionForTest({
      operationType: "missing_quality_summary",
      freshness: { importedAt: before.datasetMeta.importedAt },
      builtAt: before.datasetMeta.buildMetadata?.builtAt || before.activeInventoryPackage.buildData.builtAt
    }), "Package finalization without explicit quality summary should throw");
    const afterFailure = bridge.getState();
    assert.equal(afterFailure.activeInventoryPackage.revision, before.activeInventoryPackage.revision, "Failed Package finalization should not increment revision");
    assert.equal(afterFailure.activeInventoryPackage.updatedAt, before.activeInventoryPackage.updatedAt, "Failed Package finalization should preserve updatedAt");
    const validShape = bridge.evaluatePackageQualitySummaryForTest("2026-08-18T01:00:00.000Z");
    [
      ["score_empty_string", { score: "" }],
      ["score_null", { score: null }],
      ["score_numeric_string", { score: "78" }],
      ["score_nan", { score: Number.NaN }],
      ["raw_score_numeric_string", { rawScore: "78" }],
      ["status_key_invalid", { statusKey: "ready" }],
      ["open_issues_string", { openIssues: "5" }],
      ["open_issues_null", { openIssues: null }],
      ["open_issues_negative", { openIssues: -1 }],
      ["open_issues_fraction", { openIssues: 1.5 }],
      ["quality_timestamp_missing", { qualityEvaluatedAt: "" }],
      ["quality_timestamp_invalid", { qualityEvaluatedAt: "invalid-date" }]
    ].forEach(([name, overrides]) => {
      assert.throws(() => bridge.commitCurrentInventoryPackageRevisionForTest({
        operationType: `invalid_quality_${name}`,
        qualitySummary: { ...validShape, ...overrides },
        freshness: { importedAt: before.datasetMeta.importedAt },
        builtAt: before.datasetMeta.buildMetadata?.builtAt || before.activeInventoryPackage.buildData.builtAt
      }), `Package finalization should reject ${name}`);
    });
    const afterInvalidCases = bridge.getState();
    assert.equal(afterInvalidCases.activeInventoryPackage.revision, before.activeInventoryPackage.revision, "Invalid Package summaries should not increment revision");
    assert.equal(afterInvalidCases.activeInventoryPackage.updatedAt, before.activeInventoryPackage.updatedAt, "Invalid Package summaries should preserve updatedAt");
    bridge.resetDataQualityEvaluationCounters();
    const qualitySummary = validShape;
    bridge.resetDataQualityEvaluationCounters();
    const committed = bridge.commitCurrentInventoryPackageRevisionForTest({
      operationType: "explicit_quality_summary",
      qualitySummary,
      relationshipKeys: bridge.inventoryPackageRelationshipKeys(before.datasetMeta.columnMapping, bridge.getSourceColumnMetadata()),
      freshness: { importedAt: before.datasetMeta.importedAt },
      timestamp: "2026-08-18T01:00:01.000Z",
      builtAt: before.datasetMeta.buildMetadata?.builtAt || before.activeInventoryPackage.buildData.builtAt
    });
    const counters = bridge.getDataQualityEvaluationCounters();
    assert.equal(committed.revision, before.activeInventoryPackage.revision + 1, "Explicit Package commit should increment revision once");
    assert.equal(counters.detectDataQualityIssues, 0, "Package commit should not call detectDataQualityIssues");
    assert.equal(counters.buildDataQualityModel, 0, "Package commit should not call buildDataQualityModel");
  });

  test("Evaluated empty issue snapshots are authoritative for Package summaries", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getState();
    bridge.syncDataQualityIssueLedger([]);
    bridge.setDataQualityIssueSnapshotForTest([]);
    const ledgerBeforeCommit = bridge.getIssueLedgerEntries();
    bridge.resetDataQualityEvaluationCounters();
    const qualitySummary = bridge.evaluatePackageQualitySummaryForTest("2026-08-18T01:02:00.000Z", {
      issues: [],
      issuesEvaluated: true,
      updateLedger: false
    });
    const afterSummaryCounters = bridge.getDataQualityEvaluationCounters();
    assert.equal(afterSummaryCounters.detectDataQualityIssues, 0, "Explicit empty issue snapshot should not trigger detection");
    assert.equal(qualitySummary.openIssues, 0, "Explicit empty issue snapshot should produce zero open issues after Ledger finalization");
    const committed = bridge.commitCurrentInventoryPackageRevisionForTest({
      operationType: "empty_issue_snapshot",
      qualitySummary,
      relationshipKeys: bridge.inventoryPackageRelationshipKeys(before.datasetMeta.columnMapping, bridge.getSourceColumnMetadata()),
      freshness: { importedAt: before.datasetMeta.importedAt },
      timestamp: "2026-08-18T01:02:01.000Z",
      builtAt: before.datasetMeta.buildMetadata?.builtAt || before.activeInventoryPackage.buildData.builtAt
    });
    const afterCommitCounters = bridge.getDataQualityEvaluationCounters();
    assert.equal(committed.revision, before.activeInventoryPackage.revision + 1, "Empty snapshot Package commit should increment revision once");
    assert.equal(afterCommitCounters.detectDataQualityIssues, 0, "Package commit should not rerun detection after empty snapshot");
    assert.equal(afterCommitCounters.buildDataQualityModel, afterSummaryCounters.buildDataQualityModel, "Package commit should not rebuild Data Quality model after empty snapshot");
    assert.deepEqual(bridge.getIssueLedgerEntries(), ledgerBeforeCommit, "Package commit should not resynchronize the Issue Ledger");
  });

  test("Missing issue snapshots still use the designated evaluation path", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.resetDataQualityEvaluationCounters();
    const model = bridge.buildDataQualityModelForTest({
      issuesEvaluated: false,
      updateLedger: false
    });
    const counters = bridge.getDataQualityEvaluationCounters();
    assert.ok(model.score >= 0, "Missing snapshot evaluation should return a Data Quality model");
    assert.ok(counters.detectDataQualityIssues > 0, "Missing snapshot should allow explicit Data Quality detection");
  });

  test("Data Quality test counters are inactive outside the test harness", async assert => {
    const app = await helpers.loadProductionApp();
    assert.equal(app.__obsoliqTestBridge, undefined, "Production iframe should not expose the test bridge");
    assert.ok(app.ObsoliQ?.data?.packageRegistry, "Production iframe should still load the Registry module");
  });

  test("Package ownership is enforced by app and Registry module", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const module = app.ObsoliQ.data.packageRegistry;
    const registry = module.createDataPackageRegistry();
    const first = registry.registerPackage(packageInput({
      packageId: "PKG-OWN-1",
      datasetId: "DS-A",
      updatedAt: "2026-08-18T00:00:00.000Z"
    }));
    registry.setActivePackage(first.packageId);
    const beforeSnapshot = registry.snapshot();
    assert.throws(() => registry.updatePackage(first.packageId, packageInput({
      packageId: first.packageId,
      datasetId: "DS-B",
      updatedAt: "2026-08-18T00:01:00.000Z"
    })), "Registry should reject datasetId reassignment");
    assert.throws(() => registry.updatePackage(first.packageId, packageInput({
      packageId: first.packageId,
      packageType: "material_master",
      datasetId: "DS-A",
      buildData: { buildMetadata: { datasetId: "DS-A" } },
      relationshipKeys: { material: ["material_id"] }
    })), "Registry should reject packageType reassignment");
    const afterRejected = registry.getPackage(first.packageId);
    assert.equal(afterRejected.revision, first.revision, "Failed ownership update should preserve revision");
    assert.equal(afterRejected.updatedAt, first.updatedAt, "Failed ownership update should preserve updatedAt");
    assert.equal(registry.getActivePackageId("inventory_snapshot"), first.packageId, "Failed ownership update should preserve active package");
    assert.equal(registry.getStats().sequence, beforeSnapshot.sequence, "Failed ownership update should preserve package sequence");
    const validUpdate = registry.updatePackage(first.packageId, { status: "refreshed", updatedAt: "2026-08-18T00:02:00.000Z" });
    assert.equal(validUpdate.revision, first.revision + 1, "Same package/dataset/type update should remain valid");

    const appState = bridge.getState();
    const qualitySummary = bridge.evaluatePackageQualitySummaryForTest("2026-08-18T01:10:00.000Z");
    const foreignRecord = {
      ...appState.activeInventoryPackage,
      datasetId: "DS-FOREIGN",
      qualitySummary,
      updatedAt: "2026-08-18T01:10:01.000Z"
    };
    assert.throws(() => bridge.assertPackageOwnershipInvariantForTest(appState.activeInventoryPackage, foreignRecord), "App ownership guard should reject dataset reassignment");
    assert.throws(() => bridge.assertInventoryPackageRecordInvariantForTest(foreignRecord), "App invariant should reject foreign build metadata/dataset ownership");
  });

  test("Relationship keys require mapped, approved, importable source mappings", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const metadata = [
      { sourceKey: "Material", originalHeader: "Material", sourceIndex: 0, duplicateIndex: 1, duplicateCount: 1, normalizedOriginalHeader: "material" },
      { sourceKey: "No status plant", originalHeader: "No status plant", sourceIndex: 1, duplicateIndex: 1, duplicateCount: 1, normalizedOriginalHeader: "no_status_plant" },
      { sourceKey: "Ignored PC", originalHeader: "Ignored PC", sourceIndex: 2, duplicateIndex: 1, duplicateCount: 1, normalizedOriginalHeader: "ignored_pc" },
      { sourceKey: "Protected PC", originalHeader: "Protected PC", sourceIndex: 3, duplicateIndex: 1, duplicateCount: 1, normalizedOriginalHeader: "protected_pc" },
      { sourceKey: "Kept Source", originalHeader: "Kept Source", sourceIndex: 4, duplicateIndex: 1, duplicateCount: 1, normalizedOriginalHeader: "kept_source" },
      { sourceKey: "Proposed PC", originalHeader: "Proposed PC", sourceIndex: 5, duplicateIndex: 1, duplicateCount: 1, normalizedOriginalHeader: "proposed_pc" },
      { sourceKey: "Derived Recovery", originalHeader: "Derived Recovery", sourceIndex: 6, duplicateIndex: 1, duplicateCount: 1, normalizedOriginalHeader: "derived_recovery" },
      { sourceKey: "Duplicate", originalHeader: "Duplicate", sourceIndex: 7, duplicateIndex: 1, duplicateCount: 2, normalizedOriginalHeader: "duplicate" },
      { sourceKey: "Duplicate__2", originalHeader: "Duplicate", sourceIndex: 8, duplicateIndex: 2, duplicateCount: 2, normalizedOriginalHeader: "duplicate" }
    ];
    const mapping = [
      { sourceIndex: 0, sourceColumn: "Material", normalizedSourceColumn: "material", selectedCanonicalField: "material_id", status: "mapped" },
      { sourceIndex: 1, sourceColumn: "No status plant", normalizedSourceColumn: "no_status_plant", selectedCanonicalField: "plant" },
      { sourceIndex: 2, sourceColumn: "Ignored PC", normalizedSourceColumn: "ignored_pc", selectedCanonicalField: "profit_center", status: "mapped", ignored: true },
      { sourceIndex: 3, sourceColumn: "Protected PC", normalizedSourceColumn: "protected_pc", selectedCanonicalField: "profit_center", status: "mapped", protected: true },
      { sourceIndex: 4, sourceColumn: "Kept Source", normalizedSourceColumn: "kept_source", selectedCanonicalField: "", canonicalField: "profit_center", status: "ignored", ignored: true },
      { sourceIndex: 5, sourceColumn: "Proposed PC", normalizedSourceColumn: "proposed_pc", proposedCanonicalField: "profit_center", status: "unmapped" },
      { sourceIndex: 6, sourceColumn: "Derived Recovery", normalizedSourceColumn: "derived_recovery", selectedCanonicalField: "recovery_potential", status: "mapped" },
      { sourceColumn: "", selectedCanonicalField: "plant", status: "mapped" },
      { sourceColumn: "Duplicate", selectedCanonicalField: "plant", status: "mapped" },
      { sourceIndex: 8, sourceColumn: "Duplicate__2", normalizedSourceColumn: "duplicate", selectedCanonicalField: "recovery_potential", status: "mapped" }
    ];
    const approvedFields = bridge.approvedImportableCanonicalFieldSetForTest(mapping, metadata);
    const relationshipKeys = bridge.inventoryPackageRelationshipKeys(mapping, metadata);
    assert.deepEqual(approvedFields, ["material_id"], "Only mapped approved importable non-derived fields should be approved");
    assert.deepEqual(relationshipKeys, { material: ["material_id"] }, "Relationship keys should be derived only from approved fields");
    assert.deepEqual(
      bridge.inventoryPackageRelationshipKeys([
        { sourceColumn: "Material", normalizedSourceColumn: "material", selectedCanonicalField: "material_id", status: "mapped" }
      ], [
        { sourceKey: "Material", originalHeader: "Material", sourceIndex: 0, duplicateIndex: 1, duplicateCount: 2, normalizedOriginalHeader: "material" },
        { sourceKey: "Material__2", originalHeader: "Material", sourceIndex: 1, duplicateIndex: 2, duplicateCount: 2, normalizedOriginalHeader: "material" }
      ]),
      {},
      "Duplicate physical headers without sourceIndex should not prove relationship keys"
    );
    assert.deepEqual(
      bridge.inventoryPackageRelationshipKeys([
        { sourceIndex: 0, sourceColumn: "Material", normalizedSourceColumn: "material", selectedCanonicalField: "material_id", status: "mapped" }
      ], [
        { sourceKey: "Material", originalHeader: "Material", sourceIndex: 0, duplicateIndex: 1, duplicateCount: 2, normalizedOriginalHeader: "material" },
        { sourceKey: "Material__2", originalHeader: "Material", sourceIndex: 1, duplicateIndex: 2, duplicateCount: 2, normalizedOriginalHeader: "material" }
      ]),
      { material: ["material_id"] },
      "Duplicate physical headers with sourceIndex should prove the selected physical source"
    );
    const activePackage = bridge.getActiveInventoryPackage();
    const injected = {
      ...activePackage,
      mapping: {
        ...(activePackage.mapping || {}),
        columnMapping: [
          { sourceColumn: "Material Number", selectedCanonicalField: "material_id", status: "mapped" }
        ]
      },
      relationshipKeys: {
        material: ["material_id"],
        organization: ["profit_center"]
      }
    };
    assert.throws(() => bridge.assertInventoryPackageRecordInvariantForTest(injected), "Package invariant should reject relationship keys absent from approved Mapping");
  });

  test("remediation rollback remains best effort when rollback rendering fails", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getState();
    const row = bridge.getOverviewRows()[0];
    const failedCorrection = bridge.applyDataCorrectionForTest({
      datasetId: before.currentDatasetId,
      sourceRowIndex: row.__sourceRowIndex,
      sourceRowIndexes: [row.__sourceRowIndex],
      sourceColumn: before.originalHeaders[0],
      canonicalField: "material_id",
      correctionType: "manual_value",
      originalValue: row.material_id,
      correctedValue: `${row.material_id}-ROLLBACK-RENDER`
    }, {
      rebuild: true,
      feedback: true,
      forcePackageFinalizationFailureForTest: true,
      forceRemediationRollbackRenderFailureForTest: true,
      suppressErrorLog: true,
      preserveFailureFeedback: true
    });
    const after = bridge.getState();
    assert.equal(failedCorrection, null, "Failed correction should return null");
    assert.equal(after.activeInventoryPackage.revision, before.activeInventoryPackage.revision, "Rollback render failure should not increment revision");
    assert.equal(after.dataCorrections, before.dataCorrections, "Runtime correction state should be restored");
    assert.equal(after.feedback, "Datenänderung konnte nicht angewendet werden.", "Remediation failure should use remediation-specific feedback");
  });

  test("10,000-row registry retention and remediation transaction gate completes", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const started = performance.now();
    bridge.setInventoryPackageRetentionLimitForTest(5);
    for (let index = 0; index < 5; index += 1) {
      const result = await bridge.loadTextDataset(largeInventoryCsv(10000, String(index + 1)), `large-${index + 1}.csv`, {
        sourceType: "upload",
        allowMappingReview: false,
        suppressSuccessFeedback: true
      });
      assert.equal(result.status, "loaded", `10k upload ${index + 1} should load`);
    }
    bridge.enforceInventoryPackageRetentionForTest();
    const packages = bridge.getInventoryPackages();
    const state = bridge.getState();
    const beforeRevision = state.activeInventoryPackage.revision;
    const row = bridge.getOverviewRows()[0];
    const sourceColumn = state.originalHeaders[0];
    const correction = bridge.applyDataCorrectionForTest({
      datasetId: state.currentDatasetId,
      sourceRowIndex: row.__sourceRowIndex,
      sourceRowIndexes: [row.__sourceRowIndex],
      sourceColumn,
      canonicalField: "material_id",
      correctionType: "manual_value",
      originalValue: row.material_id,
      correctedValue: `${row.material_id}-10K`
    }, { rebuild: true });
    const afterCorrection = bridge.getState();
    const failed = bridge.applyDataCorrectionForTest({
      datasetId: state.currentDatasetId,
      sourceRowIndex: row.__sourceRowIndex,
      sourceRowIndexes: [row.__sourceRowIndex],
      sourceColumn,
      canonicalField: "material_id",
      correctionType: "manual_value",
      originalValue: row.material_id,
      correctedValue: `${row.material_id}-10K-FAIL`
    }, {
      rebuild: true,
      forcePackageFinalizationFailureForTest: true,
      suppressErrorLog: true,
      preserveFailureFeedback: true
    });
    const afterFailed = bridge.getState();
    const durationMs = performance.now() - started;
    window.__OBSOLIQ_SCALABILITY_RESULT__ = {
      status: "passed",
      rowCount: 10000,
      retainedPackages: packages.length,
      durationMs: Math.round(durationMs)
    };
    assert.equal(packages.length, 5, "Retention should keep five 10k packages");
    assert.equal(state.enrichedRows, 10000, "Active large dataset should contain 10k analytical rows");
    assert.ok(correction, "10k correction should commit");
    assert.equal(afterCorrection.activeInventoryPackage.revision, beforeRevision + 1, "10k correction should create one revision");
    assert.equal(failed, null, "Failed 10k correction should return null");
    assert.equal(afterFailed.activeInventoryPackage.revision, afterCorrection.activeInventoryPackage.revision, "Failed 10k correction should not create another revision");
  });
})();
