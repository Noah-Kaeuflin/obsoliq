(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function zeroHistoryCsv(row) {
    const header = "Material Number,Plant,Posting Date,Period,Consumption Quantity,Base Unit,Movement Type,Document Number,Document Item";
    const dates = [
      "2025-04-30", "2025-05-31", "2025-06-30", "2025-07-31",
      "2025-08-31", "2025-09-30", "2025-10-31", "2025-11-30",
      "2025-12-31", "2026-01-31", "2026-02-28", "2026-03-31"
    ];
    return [
      header,
      ...dates.map((date, index) => [
        row.material_id,
        row.plant || "",
        date,
        date.slice(0, 7),
        "0",
        row.base_unit || "EA",
        "261",
        `59${String(index + 1).padStart(8, "0")}`,
        "0001"
      ].join(","))
    ].join("\n");
  }

  test("AP 16.4d.1 app runtime derives Slow / Dead cases after Historical Runtime completion", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const row = bridge.getEnrichedRowsForTest().find(item => item.material_id && item.plant) || bridge.getEnrichedRowsForTest()[0];
    bridge.importConsumptionHistoryTextForTest(zeroHistoryCsv(row), "ap-16-4d-zero-history.csv", {
      suppressFeedback: true,
      semanticPolicy: {
        analysisAsOf: { date: "2026-03-31", source: "user_confirmed", userConfirmed: true },
        reviewConfirmed: true
      }
    });
    await bridge.waitForHistoricalMetricsRuntimeForTest();
    const runtime = bridge.getSlowDeadRecoveryCaseRuntimeForTest();

    assert.includes(["available", "limited", "unavailable"], runtime.status, "Derived runtime should reach a terminal state");
    assert.ok(Boolean(runtime.inputSignature), "Derived runtime should have an input signature");
    assert.ok(Boolean(runtime.result?.serviceModelVersion), "Derived service result should be attached");
    assert.ok(runtime.result.summary.evaluatedEntityCount > 0, "At least one Inventory entity should be evaluated");
  });

  test("AP 16.4d.1 non-trigger interactions do not rebuild Slow / Dead runtime", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const row = bridge.getEnrichedRowsForTest().find(item => item.material_id && item.plant) || bridge.getEnrichedRowsForTest()[0];
    bridge.importConsumptionHistoryTextForTest(zeroHistoryCsv(row), "ap-16-4d-non-trigger.csv", {
      suppressFeedback: true,
      semanticPolicy: {
        analysisAsOf: { date: "2026-03-31", source: "user_confirmed", userConfirmed: true },
        reviewConfirmed: true
      }
    });
    await bridge.waitForHistoricalMetricsRuntimeForTest();
    bridge.resetSlowDeadRecoveryCaseBuildCountersForTest();
    bridge.renderOverviewForTest();
    const counters = bridge.getSlowDeadRecoveryCaseBuildCountersForTest();

    assert.equal(counters.buildCount, 0, "Overview presentation should not rebuild derived Slow / Dead runtime");
  });
})();
