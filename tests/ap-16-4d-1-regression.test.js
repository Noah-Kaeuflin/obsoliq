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
      pilotReviews: bridge.snapshotPilotReviewsForTest(),
      registry: bridge.getRegistryStats()
    };
  }

  function lowMovementCsv(row) {
    const header = "Material Number,Plant,Posting Date,Period,Consumption Quantity,Base Unit,Movement Type,Document Number,Document Item";
    const rows = [
      ["2025-04-30", "0"],
      ["2025-05-31", "0"],
      ["2025-06-30", "0"],
      ["2025-07-31", "0"],
      ["2025-08-31", "0"],
      ["2025-09-30", "0"],
      ["2025-10-31", "0"],
      ["2025-11-30", "0"],
      ["2025-12-31", "0"],
      ["2026-01-31", "0"],
      ["2026-02-28", "0"],
      ["2026-03-31", "0"]
    ];
    return [
      header,
      ...rows.map(([date, qty], index) => [
        row.material_id,
        row.plant || "",
        date,
        date.slice(0, 7),
        qty,
        row.base_unit || "EA",
        "261",
        `69${String(index + 1).padStart(8, "0")}`,
        "0001"
      ].join(","))
    ].join("\n");
  }

  test("AP 16.4d.1 derived Slow / Dead runtime is analytically isolated", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const row = bridge.getEnrichedRowsForTest().find(item => item.material_id && item.plant) || bridge.getEnrichedRowsForTest()[0];
    bridge.importConsumptionHistoryTextForTest(lowMovementCsv(row), "ap-16-4d-isolation.csv", {
      suppressFeedback: true,
      semanticPolicy: {
        analysisAsOf: { date: "2026-03-31", source: "user_confirmed", userConfirmed: true },
        reviewConfirmed: true
      }
    });
    await bridge.waitForHistoricalMetricsRuntimeForTest();
    const before = analyticsSnapshot(bridge);
    const slowDeadBefore = bridge.getSlowDeadRecoveryCaseRuntimeForTest();
    bridge.requestSlowDeadRecoveryCaseRuntimeForTest({ force: true });
    const after = analyticsSnapshot(bridge);
    const slowDeadAfter = bridge.getSlowDeadRecoveryCaseRuntimeForTest();

    assert.deepEqual(after, before, "Derived Slow / Dead runtime must not change Inventory KPIs, Recovery, Actions, Excess, DQ, Pilot Reviews or Registry stats");
    assert.ok(Boolean(slowDeadBefore.result), "Derived runtime should already be available after Historical Runtime completion");
    assert.ok(Boolean(slowDeadAfter.result), "Forced derived runtime rebuild should return a result");
  });

  test("AP 16.4d.2 Slow / Dead compatibility route opens the unified Inventory Risks segment", async assert => {
    const app = await helpers.loadSampleApp();
    const state = app.__obsoliqTestBridge.switchInventoryRiskRouteForTest("slow-dead-stock");
    const pageText = app.document.getElementById("inventoryRisksPage")?.textContent || "";
    const placeholderActive = app.document.getElementById("placeholderPage")?.classList.contains("active");
    const inventoryRisksActive = app.document.getElementById("view-inventory-risks")?.classList.contains("active");

    assert.equal(state.activeProcessKey, "inventory-risks", "Compatibility route should activate the unified Inventory Risks process key");
    assert.equal(state.pageState.segment, "slow_dead", "Compatibility route should select the Slow / Dead segment");
    assert.ok(/Langsam \/ Totbestand|Slow \/ Dead/i.test(pageText), "Unified page should render the Slow / Dead segment");
    assert.equal(inventoryRisksActive, true, "Unified Inventory Risks view should be active");
    assert.equal(placeholderActive, false, "Compatibility route should not activate the generic placeholder");
  });
})();
