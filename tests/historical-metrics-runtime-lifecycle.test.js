(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function historyCsvFor(row, quantity = 3) {
    const header = "Material Number,Plant,Posting Date,Period,Consumption Quantity,Base Unit,Movement Type,Document Number,Document Item";
    const rows = ["2026-01-15", "2026-02-15", "2026-03-15"].map((date, index) => [
      row.material_id,
      row.plant || "",
      date,
      date.slice(0, 7),
      String(quantity + index),
      row.base_unit || "EA",
      "261",
      `59${String(index + 1).padStart(8, "0")}`,
      "0001"
    ].join(","));
    return [header, ...rows].join("\n");
  }

  test("AP 16.4c.1 Inventory input changes invalidate stale metrics and create one new lifecycle build", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const row = bridge.getEnrichedRowsForTest().find(item => item.material_id && item.plant) || bridge.getEnrichedRowsForTest()[0];

    bridge.importConsumptionHistoryTextForTest(historyCsvFor(row), "history-before-inventory-change.csv", {
      suppressFeedback: true,
      semanticPolicy: {
        analysisAsOf: { date: "2026-03-31", source: "user_confirmed", userConfirmed: true },
        reviewConfirmed: true
      }
    });
    await bridge.waitForHistoricalMetricsRuntimeForTest();
    const before = bridge.getHistoricalMetricsRuntimeForTest();
    bridge.resetHistoricalMetricsBuildCountersForTest();

    const loaded = await bridge.loadTextDataset(helpers.simpleCsv("MAT-RUNTIME-NEW", "250"), "runtime-inventory-change.csv", {
      sourceType: "upload",
      allowMappingReview: false,
      suppressFeedback: true
    });
    const afterLoad = bridge.getHistoricalMetricsRuntimeForTest();
    const staleResult = bridge.getHistoricalMetricsRuntimeResultForTest();
    await bridge.waitForHistoricalMetricsRuntimeForTest();
    const afterIdle = bridge.getHistoricalMetricsRuntimeForTest();
    const counters = bridge.getHistoricalMetricsBuildCountersForTest();

    assert.equal(loaded.status, "loaded", "Inventory lifecycle change should load successfully");
    assert.notEqual(afterLoad.completedInputSignature, before.completedInputSignature, "Changed Inventory input should immediately remove the old completed signature");
    assert.equal(staleResult, null, "Old metrics must not be presented for the changed input signature");
    assert.equal(counters.buildCount, 1, "Changed analytical input should create exactly one controlled lifecycle build");
    assert.equal(afterIdle.requestedInputSignature, afterIdle.inputSignature, "Runtime state should remain coherent after the changed input build");
  });

  test("AP 16.4c.1 Runtime calculation does not create Package revisions", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const row = bridge.getEnrichedRowsForTest().find(item => item.material_id && item.plant) || bridge.getEnrichedRowsForTest()[0];
    const beforeImport = bridge.getRegistrySnapshot();

    bridge.importConsumptionHistoryTextForTest(historyCsvFor(row), "history-package-revision-isolation.csv", {
      suppressFeedback: true,
      semanticPolicy: {
        analysisAsOf: { date: "2026-03-31", source: "user_confirmed", userConfirmed: true },
        reviewConfirmed: true
      }
    });
    const afterImport = bridge.getRegistrySnapshot();
    await bridge.waitForHistoricalMetricsRuntimeForTest();
    const afterRuntime = bridge.getRegistrySnapshot();

    assert.equal((afterImport.packages || []).length, (beforeImport.packages || []).length + 1, "Only the Consumption History import should add a package");
    assert.equal(afterRuntime.sequence, afterImport.sequence, "Historical metric calculation itself must not consume package sequence IDs");
    assert.equal((afterRuntime.packages || []).length, (afterImport.packages || []).length, "Historical metric calculation must not create package records");
  });
})();
