(function () {
  "use strict";

  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  test("NUM-CAL-MIG-01 Metrics v2 describes the complete synthetic baseline without quality claims", async assert => {
    const app = await helpers.loadCalibrationAnalysisApp();
    const fixtures = app.ObsoliQSlowDeadCalibrationFixtures.fixtures;
    const runner = app.ObsoliQ.slowDead.calibrationRunner;
    const metricsModule = app.ObsoliQ.slowDead.calibrationMetrics;
    const first = runner.runCalibrationFixtures(fixtures);
    const second = runner.runCalibrationFixtures(fixtures);
    const metrics = metricsModule.buildCalibrationMetrics(fixtures, first, {
      deterministicRepeatability: runner.stableJson(first) === runner.stableJson(second)
    });

    assert.equal(metrics.metricsVersion, "slow-dead-calibration-metrics-v2", "Metrics contract version must be explicit");
    assert.equal(metrics.status, "passed", "Complete eligible coverage must pass");
    assert.equal(metrics.eligibleResultCount, 30, "All controlled fixtures must be eligible");
    assert.equal(metrics.excludedResultCount, 0, "No controlled fixture may be excluded");
    assert.equal(metrics.fixtureCount, 30, "Metrics must cover all fixtures");
    assert.equal(metrics.validFixtureCount, 30, "All controlled fixtures must validate");
    assert.equal(metrics.invalidFixtureCount, 0, "No controlled fixture may be invalid");
    assert.equal(metrics.syntheticContractAgreement, 1, "Synthetic Contract Agreement must be a ratio of one");
    assert.equal(metrics.criticalSafetyViolationCount, 0, "Productive baseline must have no critical violation");
    assert.equal(metrics.deterministicRepeatability, true, "Baseline must be deterministically repeatable");
    [
      "insufficient_evidence",
      "intermittent_expected",
      "slow_moving_candidate",
      "non_moving_candidate",
      "dead_stock_candidate",
      "strategic_reserve"
    ].forEach(condition => assert.ok(metrics.actualCountByCondition[condition] > 0, `Baseline Metrics must cover ${condition}`));
    assert.equal(metrics.safetyInvariantResults.length, 12, "All twelve 3a Safety Invariants must be reported");
    assert.ok(metrics.safetyInvariantResults.every(result => result.passed), "All baseline Safety Invariants must pass");
    assert.ok(Boolean(metrics.policyFingerprint), "Policy fingerprint must be present");
    assert.ok(Boolean(metrics.fixtureFingerprint), "Fixture fingerprint must be present");
    assert.ok(Boolean(metrics.resultFingerprint), "Result fingerprint must be present");
    const serialized = JSON.stringify(metrics);
    ["Pilot Accuracy", "Customer Accuracy", "Expert Agreement", "Precision", "Recall", "F1"].forEach(term => {
      assert.equal(serialized.includes(term), false, `Metrics must not claim ${term}`);
    });
  });

  test("AP 16.4d.3b Metrics rejects an incomplete runner result and preserves its inputs", async assert => {
    const app = await helpers.loadCalibrationAnalysisApp();
    const fixtures = app.ObsoliQSlowDeadCalibrationFixtures.fixtures;
    const runner = app.ObsoliQ.slowDead.calibrationRunner;
    const metricsModule = app.ObsoliQ.slowDead.calibrationMetrics;
    const baseline = runner.runCalibrationFixtures(fixtures);
    const fixturesBefore = runner.stableJson(fixtures);
    const baselineBefore = runner.stableJson(baseline);
    const incomplete = JSON.parse(JSON.stringify(baseline));
    incomplete.results.pop();
    incomplete.fixture_count -= 1;

    assert.throws(() => metricsModule.buildCalibrationMetrics(fixtures, incomplete), "Incomplete runner output must be rejected");
    metricsModule.buildCalibrationMetrics(fixtures, baseline, { deterministicRepeatability: true });
    assert.equal(runner.stableJson(fixtures), fixturesBefore, "Metrics must not mutate fixtures");
    assert.equal(runner.stableJson(baseline), baselineBefore, "Metrics must not mutate runner output");
  });
})();
