(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function analyticsSnapshot(bridge) {
    const overview = bridge.getOverviewRows();
    const actions = bridge.getActionRows();
    const excess = bridge.getExcessRowsForTest();
    return {
      inventoryPackageId: bridge.getState().activeInventoryPackageId,
      totalInventory: overview.reduce((sum, row) => sum + Number(row.stock_value || 0), 0),
      recoveryPotential: overview.reduce((sum, row) => sum + Number(row.recovery_potential || 0), 0),
      categorySignature: overview.map(row => [row.row_number, row.category, row.primary_category].join("|")),
      actionSignature: actions.map(row => [row.row_number, row.root_cause, row.recommended_action, row.owner_function, row.priority, row.confidence, row.status, row.opportunity_score].join("|")),
      excessSignature: excess.map(row => [row.case_id, row.excess_opportunity_score, row.recommended_action, row.priority].join("|")),
      dataQuality: bridge.getDataQualityBaselineForTest(),
      pilotReviews: bridge.snapshotPilotReviewsForTest()
    };
  }

  function historyCsvFor(row) {
    const header = "Material Number,Plant,Posting Date,Period,Consumption Quantity,Base Unit,Movement Type,Document Number,Document Item";
    const rows = ["2026-01-15", "2026-02-15", "2026-03-15"].map((date, index) => [
      row.material_id,
      row.plant || "",
      date,
      date.slice(0, 7),
      String(index + 1),
      row.base_unit || "EA",
      "261",
      `49${String(index + 1).padStart(8, "0")}`,
      "0001"
    ].join(","));
    return [header, ...rows].join("\n");
  }

  test("AP 16.4c Historical metrics remain analytically isolated from Recovery, Actions, Excess and Data Quality", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const row = bridge.getEnrichedRowsForTest().find(item => item.material_id && item.plant) || bridge.getEnrichedRowsForTest().find(item => item.material_id);
    const before = analyticsSnapshot(bridge);
    const registryBefore = bridge.getRegistrySnapshot();
    const result = bridge.importConsumptionHistoryTextForTest(historyCsvFor(row), "ap-16-4c-isolation.csv", {
      suppressFeedback: true,
      semanticPolicy: {
        analysisAsOf: { date: "2026-03-31", source: "user_confirmed", userConfirmed: true },
        reviewConfirmed: true
      }
    });
    await bridge.waitForHistoricalMetricsRuntimeForTest();
    const after = analyticsSnapshot(bridge);
    const registryAfter = bridge.getRegistrySnapshot();

    assert.equal(result.status, "loaded", "Consumption History import should load");
    assert.deepEqual(after, before, "Historical metrics must not change Inventory KPIs, Recovery, Actions, Excess, DQ or Pilot Reviews");
    assert.equal((registryAfter.packages || []).length, (registryBefore.packages || []).length + 1, "Only the Consumption History package should be added");
    assert.equal(registryAfter.sequence, registryBefore.sequence + 1, "Metric calculation itself must not consume an extra Package ID");
  });
})();
