(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function runtimeResult(signature, status = "available") {
    return {
      status,
      historicalMetricsInputSignature: signature,
      inventoryHistoryRelationshipResult: { exactMatchCount: 1, fallbackMatchCount: 0 },
      historicalMetricsByInventoryRowKey: {
        "INV-1": { history_metric_status: status }
      },
      historicalMetricsSummary: {
        status,
        relationshipMatchRate: 1,
        exactMatchCount: 1,
        fallbackMatchCount: 0,
        partialCurrentPeriod: false
      }
    };
  }

  test("AP 16.4c.1 Runtime coordinator deduplicates same-signature builds", async assert => {
    const app = await helpers.loadProductionApp();
    const module = app.ObsoliQ.application.historicalMetricsRuntimeCoordinator;
    const queuedTasks = [];
    let buildCount = 0;
    const coordinator = module.createHistoricalMetricsRuntimeCoordinator({
      buildRuntime: input => {
        buildCount += 1;
        return runtimeResult(input.inputSignature);
      },
      scheduleTask: task => queuedTasks.push(task),
      clock: () => "2026-08-21T00:00:00.000Z"
    });

    coordinator.requestBuild({ inputSignature: "sig-a", buildInput: {}, reason: "test" });
    coordinator.requestBuild({ inputSignature: "sig-a", buildInput: {}, reason: "duplicate" });

    assert.equal(queuedTasks.length, 1, "Repeated same-signature requests before execution should schedule one task");
    assert.equal(coordinator.getState().status, "calculating", "Runtime should enter calculating before the task runs");

    queuedTasks.shift()();
    await coordinator.whenIdle();
    coordinator.requestBuild({ inputSignature: "sig-a", buildInput: {}, reason: "completed-duplicate" });

    assert.equal(buildCount, 1, "Completed same-signature requests should not rebuild");
    assert.equal(coordinator.getState().status, "available", "Runtime should remain available");
    assert.equal(coordinator.getState().completedInputSignature, "sig-a", "Completed signature should be retained");
    assert.equal(coordinator.getState().duplicateRequestCount, 2, "Duplicate requests should be counted");
  });

  test("AP 16.4c.1 Runtime coordinator retries error only through explicit force", async assert => {
    const app = await helpers.loadProductionApp();
    const module = app.ObsoliQ.application.historicalMetricsRuntimeCoordinator;
    const queuedTasks = [];
    let fail = true;
    let buildCount = 0;
    const coordinator = module.createHistoricalMetricsRuntimeCoordinator({
      buildRuntime: input => {
        buildCount += 1;
        if (fail) throw new Error("forced failure");
        return runtimeResult(input.inputSignature);
      },
      scheduleTask: task => queuedTasks.push(task),
      clock: () => "2026-08-21T00:00:00.000Z"
    });

    coordinator.requestBuild({ inputSignature: "sig-error", buildInput: {}, reason: "test" });
    queuedTasks.shift()();
    await coordinator.whenIdle();
    coordinator.requestBuild({ inputSignature: "sig-error", buildInput: {}, reason: "same-error" });
    fail = false;
    coordinator.retry({ inputSignature: "sig-error", buildInput: {}, reason: "retry" });
    queuedTasks.shift()();
    await coordinator.whenIdle();

    assert.equal(buildCount, 2, "Retry after error should create exactly one additional build");
    assert.equal(coordinator.getState().status, "available", "Retry should replace the error state with a coherent result");
  });

  test("AP 16.4c.1 Runtime coordinator rejects stale completions", async assert => {
    const app = await helpers.loadProductionApp();
    const module = app.ObsoliQ.application.historicalMetricsRuntimeCoordinator;
    const queuedTasks = [];
    let buildCount = 0;
    const coordinator = module.createHistoricalMetricsRuntimeCoordinator({
      buildRuntime: input => {
        buildCount += 1;
        return runtimeResult(input.inputSignature);
      },
      scheduleTask: task => queuedTasks.push(task),
      clock: () => "2026-08-21T00:00:00.000Z"
    });

    coordinator.requestBuild({ inputSignature: "sig-a", buildInput: {}, reason: "first" });
    coordinator.requestBuild({ inputSignature: "sig-b", buildInput: {}, reason: "changed" });
    queuedTasks.shift()();

    assert.equal(coordinator.getState().status, "calculating", "Stale sig-a completion should not overwrite current sig-b state");
    assert.equal(coordinator.getState().requestedInputSignature, "sig-b", "Current requested signature should remain sig-b");

    queuedTasks.shift()();
    await coordinator.whenIdle();

    assert.equal(buildCount, 1, "Only the current signature should execute a domain build");
    assert.equal(coordinator.getState().status, "available", "Current signature should complete");
    assert.equal(coordinator.getState().completedInputSignature, "sig-b", "Completed result should belong to sig-b");
    assert.equal(coordinator.getState().staleCompletionCount, 1, "Stale completion should be recorded");
  });
})();
