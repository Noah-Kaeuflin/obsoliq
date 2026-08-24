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
        `79${String(index + 1).padStart(8, "0")}`,
        "0001"
      ].join(","))
    ].join("\n");
  }

  async function loadWithHistory() {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const row = bridge.getEnrichedRowsForTest().find(item => item.material_id && item.plant) || bridge.getEnrichedRowsForTest()[0];
    bridge.importConsumptionHistoryTextForTest(zeroHistoryCsv(row), "ap-16-4d-1-1-runtime-boundary.csv", {
      suppressFeedback: true,
      semanticPolicy: {
        analysisAsOf: { date: "2026-03-31", source: "user_confirmed", userConfirmed: true },
        reviewConfirmed: true
      }
    });
    await bridge.waitForHistoricalMetricsRuntimeForTest();
    return { app, bridge };
  }

  test("AP 16.4d.1.1 Slow / Dead Runtime exposes coherent six-state dependency mapping", async assert => {
    const { bridge } = await loadWithHistory();
    const historicalRuntime = bridge.getHistoricalMetricsRuntimeForTest();
    const initial = bridge.resetSlowDeadRecoveryCaseRuntimeForTest();
    const calculating = bridge.updateSlowDeadRecoveryCaseRuntimeFromHistoricalStateForTest({
      ...historicalRuntime,
      status: "calculating",
      result: null,
      summary: null,
      completedInputSignature: "",
      reason: "test_calculating"
    });
    const unavailable = bridge.updateSlowDeadRecoveryCaseRuntimeFromHistoricalStateForTest({
      ...historicalRuntime,
      status: "unavailable",
      result: null,
      summary: null,
      completedInputSignature: historicalRuntime.requestedInputSignature,
      reasonCode: "history_package_missing"
    });
    const error = bridge.updateSlowDeadRecoveryCaseRuntimeFromHistoricalStateForTest({
      ...historicalRuntime,
      status: "error",
      result: null,
      summary: null,
      completedInputSignature: "",
      errorCode: "runtime_build_failed",
      errorMessage: "Historical failure"
    });
    const limited = bridge.updateSlowDeadRecoveryCaseRuntimeFromHistoricalStateForTest({
      ...historicalRuntime,
      status: "limited",
      limitationCodes: ["test_limited_history"]
    }, { force: true, reason: "test_limited_history" });

    assert.equal(initial.status, "not_calculated", "Reset should expose not_calculated only as explicit reset state");
    assert.equal(initial.result, null, "Initial/reset state must not carry stale results");
    assert.equal(calculating.status, "calculating", "Historical calculating should map to Slow / Dead calculating");
    assert.equal(calculating.reasonCode, "waiting_for_historical_metrics", "Calculating dependency should have a specific reason");
    assert.equal(calculating.result, null, "Calculating dependency must clear stale results");
    assert.equal(unavailable.status, "unavailable", "Unavailable History should map to unavailable, not not_calculated");
    assert.equal(unavailable.result, null, "Unavailable dependency must not carry stale results");
    assert.equal(error.status, "error", "Historical error should map to Slow / Dead error");
    assert.equal(error.errorSource, "historical_runtime", "Historical errors must keep historical ownership");
    assert.equal(error.result, null, "Dependency error must not carry stale results");
    assert.equal(limited.status, "limited", "Limited History should produce a limited Slow / Dead result");
    assert.ok(Boolean(limited.result), "Limited current result should be attached");
  });

  test("AP 16.4d.1.1 dependency states and signature mismatch never invoke the Service", async assert => {
    const { bridge } = await loadWithHistory();
    const historicalRuntime = bridge.getHistoricalMetricsRuntimeForTest();
    bridge.resetSlowDeadRecoveryCaseBuildCountersForTest();

    bridge.updateSlowDeadRecoveryCaseRuntimeFromHistoricalStateForTest({ ...historicalRuntime, status: "calculating", result: null, completedInputSignature: "" });
    bridge.updateSlowDeadRecoveryCaseRuntimeFromHistoricalStateForTest({ ...historicalRuntime, status: "unavailable", result: null, completedInputSignature: historicalRuntime.requestedInputSignature });
    bridge.updateSlowDeadRecoveryCaseRuntimeFromHistoricalStateForTest({ ...historicalRuntime, status: "error", result: null, completedInputSignature: "", errorMessage: "Historical error" });
    const mismatch = bridge.updateSlowDeadRecoveryCaseRuntimeFromHistoricalStateForTest({ ...historicalRuntime, completedInputSignature: "stale-historical-signature" });
    const counters = bridge.getSlowDeadRecoveryCaseBuildCountersForTest();

    assert.equal(counters.buildCount, 0, "Dependency calculating/unavailable/error/mismatch must not build Slow / Dead cases");
    assert.equal(counters.failedBuildCount, 0, "Dependency failures are not Slow / Dead Service failures");
    assert.equal(counters.dependencyNoBuildCount, 4, "Each dependency no-build should be counted");
    assert.equal(mismatch.status, "unavailable", "Signature mismatch should block the build as unavailable");
    assert.equal(mismatch.reasonCode, "historical_signature_mismatch", "Signature mismatch should be explicit");
    assert.equal(mismatch.result, null, "Signature mismatch must not leave stale cases");
  });

  test("AP 16.4d.1.1 Slow / Dead Service errors are contained and Historical presentation still updates", async assert => {
    const { bridge } = await loadWithHistory();
    const historicalBefore = bridge.getHistoricalMetricsRuntimeForTest();
    const packageTextBefore = bridge.renderPackageAvailabilityForTest();
    bridge.resetSlowDeadRecoveryCaseBuildCountersForTest();
    const handled = bridge.handleHistoricalMetricsRuntimeStateChangeForTest(historicalBefore, {
      force: true,
      forceServiceErrorForTest: true,
      reason: "test_service_error"
    });
    const counters = bridge.getSlowDeadRecoveryCaseBuildCountersForTest();

    assert.deepEqual(handled.historicalRuntime, historicalBefore, "Slow / Dead failure must not mutate Historical Runtime");
    assert.equal(handled.slowDeadRuntime.status, "error", "Service exception should become a Slow / Dead error state");
    assert.equal(handled.slowDeadRuntime.errorSource, "slow_dead_runtime", "Service exception should keep Slow / Dead ownership");
    assert.equal(handled.slowDeadRuntime.result, null, "Service error must not expose stale cases");
    assert.equal(handled.slowDeadRuntime.summary, null, "Service error must not expose stale summary");
    assert.equal(counters.buildCount, 0, "Failed Service attempt must not be counted as successful build");
    assert.equal(counters.failedBuildCount, 1, "Failed Service attempt should be counted separately");
    assert.ok(Boolean(handled.packageAvailabilityText || packageTextBefore), "Historical/Data Foundation presentation should remain renderable");
  });

  test("AP 16.4d.1.1 identical completed signatures deduplicate current Slow / Dead builds", async assert => {
    const { bridge } = await loadWithHistory();
    bridge.resetSlowDeadRecoveryCaseBuildCountersForTest();
    const first = bridge.requestSlowDeadRecoveryCaseRuntimeForTest({ force: true, reason: "test_first_build" });
    const second = bridge.requestSlowDeadRecoveryCaseRuntimeForTest({ reason: "test_duplicate_request" });
    const counters = bridge.getSlowDeadRecoveryCaseBuildCountersForTest();

    assert.includes(["available", "limited"], first.status, "First explicit build should produce a current result");
    assert.equal(second.completedInputSignature, first.completedInputSignature, "Duplicate request should keep the completed signature");
    assert.equal(counters.buildCount, 1, "Same current completed signature should not rebuild");
    assert.equal(counters.failedBuildCount, 0, "Deduplicated request should not fail");
  });
})();
