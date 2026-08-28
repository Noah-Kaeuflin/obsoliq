(function () {
  "use strict";

  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  test("AP 16.4d.3b analysis is byte-deterministic, immutable and leaves product boundaries untouched", async assert => {
    const app = await helpers.loadCalibrationAnalysisApp({ sampleData: true });
    const fixtures = app.ObsoliQSlowDeadCalibrationFixtures.fixtures;
    const engine = app.ObsoliQ.slowDead.conditionEngine;
    const runner = app.ObsoliQ.slowDead.calibrationRunner;
    const metricsModule = app.ObsoliQ.slowDead.calibrationMetrics;
    const sensitivity = app.ObsoliQ.slowDead.thresholdSensitivity;
    const fixturesBefore = runner.stableJson(fixtures);
    const policyBefore = runner.stableJson(engine.DEFAULT_SLOW_DEAD_CONDITION_POLICY);
    const bodyBefore = app.document.body.innerHTML;
    const excessReference = app.ObsoliQ.excess;
    const actionsReference = app.ObsoliQ.actions;
    const registryReference = app.ObsoliQ.data.packageRegistry;
    const registrySnapshotBefore = runner.stableJson(app.__obsoliqTestBridge.getRegistrySnapshot());
    const defaultBefore = runner.runCalibrationFixtures(fixtures);

    const first = sensitivity.runThresholdSensitivity(fixtures, defaultBefore);
    const second = sensitivity.runThresholdSensitivity(fixtures, defaultBefore);
    const defaultAfter = runner.runCalibrationFixtures(fixtures);
    const metricsFirst = metricsModule.buildCalibrationMetrics(fixtures, defaultBefore, { deterministicRepeatability: true });
    const metricsSecond = metricsModule.buildCalibrationMetrics(fixtures, defaultAfter, { deterministicRepeatability: true });

    assert.equal(runner.stableJson(first), runner.stableJson(second), "Sensitivity output must be byte-deterministic");
    assert.equal(runner.stableJson(metricsFirst), runner.stableJson(metricsSecond), "Metrics output must be byte-deterministic");
    assert.equal(runner.stableJson(defaultBefore), runner.stableJson(defaultAfter), "Productive default Engine path must stay identical");
    assert.equal(runner.stableJson(fixtures), fixturesBefore, "Fixtures and inputs must remain unchanged");
    assert.equal(runner.stableJson(engine.DEFAULT_SLOW_DEAD_CONDITION_POLICY), policyBefore, "Productive Policy must remain unchanged");
    assert.equal(app.document.body.innerHTML, bodyBefore, "Analysis must not mutate the DOM");
    assert.equal(app.ObsoliQ.excess, excessReference, "Analysis must not replace the Excess boundary");
    assert.equal(app.ObsoliQ.actions, actionsReference, "Analysis must not replace the Action boundary");
    assert.equal(app.ObsoliQ.data.packageRegistry, registryReference, "Analysis must not replace the Registry boundary");
    assert.equal(runner.stableJson(app.__obsoliqTestBridge.getRegistrySnapshot()), registrySnapshotBefore, "Analysis must not create a Package revision");
    const serialized = JSON.stringify(first);
    ["bestPolicy", "best_policy", "qualityRanking", "quality_ranking", "productionPolicyVersion", "packageRevision"].forEach(field => {
      assert.equal(serialized.includes(field), false, `Analysis must not emit ${field}`);
    });
  });
})();
