(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  test("test mode suppresses production sample bootstrap", async assert => {
    const app = await helpers.loadApp();
    const state = app.__obsoliqTestBridge.getState();
    assert.ok(app.__obsoliqTestBridge.isTestMode, "Bridge should report test mode");
    assert.equal(state.rawRows, 0, "No sample rows should be loaded before tests request them");
    assert.equal(state.currentDatasetId, "", "No dataset ID should be allocated by test-mode bootstrap");
  });

  test("sample data loads explicitly through the test bridge", async assert => {
    const app = await helpers.loadSampleApp();
    const state = app.__obsoliqTestBridge.getState();
    assert.ok(state.rawRows >= 100, "Sample raw row count should remain at the current sample-data scale");
    assert.equal(state.enrichedRows, state.rawRows, "Sample analytical row count should match active raw rows");
    assert.ok(state.currentDatasetId, "Explicit sample load should allocate a dataset ID");
  });

  test("failed sample load keeps import error feedback visible", async assert => {
    const app = await helpers.loadApp();
    const result = await app.__obsoliqTestBridge.loadSample({
      forceBuildErrorForTest: true,
      suppressErrorLog: true,
      preserveFailureFeedback: true
    });
    const stateAfterFailure = app.__obsoliqTestBridge.getState();
    assert.equal(result.status, "error", "Forced sample preparation failure should return error status");
    assert.equal(stateAfterFailure.currentDatasetId, "", "Failed sample load should not allocate a dataset ID");
    assert.equal(stateAfterFailure.rawRows, 0, "Failed sample load should not commit raw rows");
    assert.equal(stateAfterFailure.feedback, "Fehler beim Import", "Import error feedback should remain visible");
    await new Promise(resolve => setTimeout(resolve, 1700));
    assert.equal(app.__obsoliqTestBridge.getState().feedback, "Fehler beim Import", "Import error feedback should not auto-reset");
  });
})();
