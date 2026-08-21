(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function clonedRuntimeForDataset(app, base, datasetId) {
    return {
      ...base,
      datasetId,
      correctionContext: {
        ...base.correctionContext,
        datasetId
      },
      issueLedger: new app.Map(),
      buildMetadata: {
        ...base.buildMetadata,
        datasetId
      }
    };
  }

  test("explicit DatasetRuntimeContext requires an owned Issue Ledger", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const runtime = bridge.datasetRuntimeContextForCurrentDataset();
    assert.throws(() => bridge.explicitDatasetRuntimeContext({ ...runtime, issueLedger: null }), "Explicit context without Map ledger should be rejected");
    assert.ok(bridge.explicitDatasetRuntimeContext({ ...runtime, issueLedger: new app.Map() }), "Explicit context with Map ledger should be accepted");
  });

  test("current-dataset adapter rejects a foreign dataset ID", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    assert.throws(() => bridge.datasetRuntimeContextForCurrentDataset({ datasetId: "DS-FOREIGN" }), "Current adapter should not be relabeled as another dataset");
    const activeDatasetId = bridge.getState().currentDatasetId;
    assert.equal(bridge.datasetRuntimeContextForCurrentDataset({ datasetId: activeDatasetId }).datasetId, activeDatasetId, "Current adapter may represent its active dataset only");
    assert.equal(bridge.datasetRuntimeContextForCurrentDataset().datasetId, activeDatasetId, "Current adapter without override should use active dataset");
  });

  test("current-dataset adapter rejects a foreign dataset ID without active dataset", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    assert.throws(() => bridge.datasetRuntimeContextForCurrentDataset({ datasetId: "DS-FOREIGN" }), "Current adapter should reject foreign Dataset ID even before a dataset is active");
  });

  test("syncDatasetUiFromMeta renders from the supplied Dataset Meta", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const datasetA = bridge.getState().datasetMeta;
    const loaded = await bridge.loadTextDataset(helpers.simpleCsv("MAT-UI-B", "500"), "dataset-b.csv", {
      sourceType: "upload",
      allowMappingReview: false
    });
    assert.equal(loaded.status, "loaded", "Dataset B should load for explicit Dataset Meta test");
    const datasetB = bridge.getState().datasetMeta;
    bridge.syncDatasetUiFromMeta(datasetA, { visibleCount: datasetA.rows });
    const chips = helpers.currentChips(app);
    assert.ok(chips.source.every(text => text.includes("Beispieldaten")), "Explicit Dataset A source label should render while Dataset B is active");
    assert.ok(chips.rows.every(text => text.includes("102")), "Explicit Dataset A row count should render while Dataset B is active");
    assert.ok(chips.columns.every(text => text.includes("72")), "Explicit Dataset A column count should render while Dataset B is active");
    bridge.syncDatasetUiFromMeta(datasetB, { visibleCount: datasetB.rows });
  });

  test("non-current runtime contexts keep same issue key isolated by ledger", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const base = bridge.datasetRuntimeContextForCurrentDataset();
    const runtimeA = clonedRuntimeForDataset(app, base, "DS-A");
    const runtimeB = clonedRuntimeForDataset(app, base, "DS-B");
    const issue = {
      issueKey: "ISSUE-SAME",
      issueId: "DQ-SAME",
      issueType: "missing_required_value",
      severity: "high",
      status: "open",
      sourceRowIndexes: [1],
      sourceColumns: ["Material Number"],
      canonicalFields: ["material_id"],
      titleKey: "missingRequiredValue",
      descriptionKey: "missingRequiredValueDescription"
    };
    bridge.syncDataQualityIssueLedger([{ ...issue, datasetId: "DS-A", issueId: "DQ-A" }], runtimeA);
    bridge.syncDataQualityIssueLedger([{ ...issue, datasetId: "DS-B", issueId: "DQ-B" }], runtimeB);
    assert.equal(runtimeA.issueLedger.size, 1, "DS-A context should own one ledger entry");
    assert.equal(runtimeB.issueLedger.size, 1, "DS-B context should own one ledger entry");
    assert.equal(bridge.ledgerEntryForIssueKey("ISSUE-SAME", "DS-A", runtimeA).issueId, "DQ-A", "DS-A issue should remain in DS-A ledger");
    assert.equal(bridge.ledgerEntryForIssueKey("ISSUE-SAME", "DS-B", runtimeB).issueId, "DQ-B", "DS-B issue should remain in DS-B ledger");
  });
})();
