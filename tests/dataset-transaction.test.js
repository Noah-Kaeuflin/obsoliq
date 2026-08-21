(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function firstMeaningfulRow(app) {
    return app.__obsoliqTestBridge.getOverviewRows().find(row => row.profit_center && row.program && row.category)
      || app.__obsoliqTestBridge.getOverviewRows()[0];
  }

  function applyRepresentativeFilters(app) {
    const bridge = app.__obsoliqTestBridge;
    const row = firstMeaningfulRow(app);
    bridge.setControlValue("searchInput", row.material_id || "");
    bridge.setControlValue("plantFilter", row.profit_center || "");
    bridge.setControlValue("groupFilter", row.program || "");
    bridge.setControlValue("categoryFilter", row.category || "");
    bridge.setControlValue("rowLimit", "25");
    bridge.setControlValue("actionStatusFilter", "Open");
    bridge.setControlValue("remediationSeverityFilter", "high");
    const inventoryRow = bridge.getInventoryRows()[0] || {};
    if (inventoryRow.mrp_controller) bridge.setControlValue("inventoryMrpControllerFilter", inventoryRow.mrp_controller);
    bridge.updateFilterStateFromControls();
  }

  test("failed dataset finalization restores filter state, controls and chips", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    applyRepresentativeFilters(app);
    const beforeState = bridge.getState();
    const beforeChips = helpers.currentChips(app);
    const result = await bridge.loadTextDataset(helpers.simpleCsv("MAT-FAIL", "250"), "inventory_B.csv", {
      sourceType: "upload",
      allowMappingReview: false,
      forcePostCommitFailureForTest: "filters",
      suppressErrorLog: true,
      preserveFailureFeedback: true
    });
    const afterState = bridge.getState();
    const afterChips = helpers.currentChips(app);
    assert.equal(result.status, "error", "Forced finalization failure should report an error");
    assert.deepEqual(afterState.filterState, beforeState.filterState, "Restored filterState should remain authoritative");
    assert.equal(app.document.getElementById("searchInput").value, beforeState.filterState.search, "Search control should be restored");
    assert.equal(app.document.getElementById("plantFilter").value, beforeState.filterState.profitCenter, "Profit center control should be restored");
    assert.equal(app.document.getElementById("rowLimit").value, beforeState.filterState.rowLimit, "Row-limit control should be restored");
    assert.equal(afterState.currentDatasetId, beforeState.currentDatasetId, "Active dataset ID should roll back");
    assert.deepEqual(afterChips.source, beforeChips.source, "Source chips should roll back");
    assert.deepEqual(afterChips.rows, beforeChips.rows, "Row chips should roll back");
    assert.deepEqual(afterChips.columns, beforeChips.columns, "Column chips should roll back");
    assert.ok(!afterChips.source.some(text => text.includes("inventory_B.csv")), "Failed source label should not remain visible");
  });

  test("failed preparation does not permanently consume a dataset ID", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getState();
    const failed = await bridge.loadTextDataset(helpers.simpleCsv("MAT-PREP-FAIL", "100"), "prepare-fail.csv", {
      sourceType: "upload",
      allowMappingReview: false,
      forceBuildErrorForTest: true,
      suppressErrorLog: true,
      preserveFailureFeedback: true
    });
    const afterFailure = bridge.getState();
    const loaded = await bridge.loadTextDataset(helpers.simpleCsv("MAT-PREP-SUCCESS", "100"), "prepare-success.csv", {
      sourceType: "upload",
      allowMappingReview: false
    });
    const afterSuccess = bridge.getState();
    assert.equal(failed.status, "error", "Forced preparation failure should return error status");
    assert.equal(afterFailure.currentDatasetId, before.currentDatasetId, "Dataset ID should roll back after failed preparation");
    assert.equal(afterFailure.datasetIdentitySequence, before.datasetIdentitySequence, "Dataset ID sequence should roll back after failed preparation");
    assert.equal(loaded.status, "loaded", "Next valid load should still succeed");
    assert.equal(afterSuccess.datasetIdentitySequence, before.datasetIdentitySequence + 1, "Next valid load should consume only one new sequence value");
  });
})();
