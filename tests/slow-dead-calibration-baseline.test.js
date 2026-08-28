(function () {
  "use strict";

  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  test("AP 16.4d.3a runner uses the real Engine without mutation and is byte-deterministic", async assert => {
    const app = await helpers.loadCalibrationAnalysisApp();
    const runner = app.ObsoliQ.slowDead.calibrationRunner;
    const engine = app.ObsoliQ.slowDead.conditionEngine;
    const fixtures = app.ObsoliQSlowDeadCalibrationFixtures.fixtures;
    const fixturesBefore = runner.stableJson(fixtures);
    const policyBefore = runner.stableJson(engine.DEFAULT_SLOW_DEAD_CONDITION_POLICY);
    const bodyBefore = app.document.body.innerHTML;
    const excessReference = app.ObsoliQ.excess;
    const actionsReference = app.ObsoliQ.actions;
    const registryReference = app.ObsoliQ.data.packageRegistry;

    const first = runner.runCalibrationFixtures(fixtures);
    const second = runner.runCalibrationFixtures(fixtures);

    assert.equal(first.fixture_count, 30, "Runner must execute all controlled fixtures");
    assert.equal(first.status, "passed", "Complete controlled coverage must pass");
    assert.equal(first.eligible_result_count, 30, "All controlled fixtures must be eligible");
    assert.equal(first.excluded_result_count, 0, "No controlled fixture may be excluded");
    assert.equal(first.agreement_count, 30, "All manually derived contract fixtures must agree with the current Engine");
    assert.equal(first.disagreement_count, 0, "Baseline must contain no disagreement");
    assert.equal(first.critical_protection_violation_count, 0, "Baseline must contain no critical protection violation");
    assert.equal(first.synthetic_contract_agreement, true, "Baseline must be labelled Synthetic Contract Agreement");
    assert.equal(JSON.stringify(first), JSON.stringify(second), "Repeated runner output must be byte-identical");
    assert.equal(runner.stableJson(fixtures), fixturesBefore, "Runner must not mutate fixtures, Inventory evidence or Historical Runtime");
    assert.equal(runner.stableJson(engine.DEFAULT_SLOW_DEAD_CONDITION_POLICY), policyBefore, "Runner must not mutate productive Policy");
    assert.equal(app.document.body.innerHTML, bodyBefore, "Calibration run must not render or mutate the DOM");
    assert.equal(app.ObsoliQ.excess, excessReference, "Calibration must not replace or mutate the Excess module boundary");
    assert.equal(app.ObsoliQ.actions, actionsReference, "Calibration must not replace or mutate the Action module boundary");
    assert.equal(app.ObsoliQ.data.packageRegistry, registryReference, "Calibration must not create a Package revision");
    assert.ok(first.results.every(item => item.policy_version === "slow-dead-condition-policy-v1"), "Every result must come from productive Policy v1");
    assert.ok(first.results.every(item => item.condition_signature.startsWith("slow-dead-condition:slow-dead-condition-v1:")), "Every result must expose the real Condition Engine signature");
    assert.ok(first.results.every(item => item.numeric_contract_version === "slow-dead-calibration-numeric-boundary-v1"), "Every result must expose the productive Numeric Boundary contract");
  });

  test("AP 16.4d.3a runner emits stable disagreement and protection codes", async assert => {
    const app = await helpers.loadCalibrationAnalysisApp();
    const runner = app.ObsoliQ.slowDead.calibrationRunner;
    const fixtures = app.ObsoliQSlowDeadCalibrationFixtures.fixtures;

    const unexpected = clone(fixtures[2]);
    unexpected.expected.condition = "no_case";
    const unexpectedResult = runner.runCalibrationFixtures([unexpected]).results[0];
    assert.equal(unexpectedResult.disagreement_code, "unexpected_condition", "Condition mismatch must use a stable disagreement code");

    const boundary = clone(fixtures[7]);
    boundary.expected.condition = "no_case";
    const boundaryResult = runner.runCalibrationFixtures([boundary]).results[0];
    assert.equal(boundaryResult.disagreement_code, "threshold_boundary_mismatch", "Boundary mismatch must use a stable boundary code");

    const reserveViolation = clone(fixtures[5]);
    reserveViolation.input_snapshot.inventoryEvidence.strategic_reserve = false;
    const reserveResult = runner.runCalibrationFixtures([reserveViolation]).results[0];
    assert.equal(reserveResult.disagreement_code, "strategic_reserve_not_protected", "Reserve protection mismatch must fail with the dedicated code");
    assert.equal(reserveResult.critical_protection_violation, true, "Reserve protection mismatch must be marked critical");
  });
})();
