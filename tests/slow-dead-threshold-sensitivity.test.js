(function () {
  "use strict";

  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  test("AP 16.4d.3b Sensitivity Plan contains one baseline and sixteen exact OFAT variants", async assert => {
    const app = await helpers.loadCalibrationAnalysisApp();
    const sensitivity = app.ObsoliQ.slowDead.thresholdSensitivity;
    const plan = sensitivity.THRESHOLD_SENSITIVITY_PLAN;
    const validation = sensitivity.validateSensitivityPlan(plan);

    assert.equal(plan.sensitivityPlanVersion, "slow-dead-threshold-sensitivity-plan-v1", "Sensitivity Plan version must be explicit");
    assert.equal(sensitivity.THRESHOLD_SENSITIVITY_RUNNER_VERSION, "slow-dead-threshold-sensitivity-runner-v2", "Sensitivity Runner output must be versioned after numeric migration");
    assert.equal(plan.scenarios.length, 17, "Plan must contain exactly 17 scenarios");
    assert.equal(plan.scenarios.filter(scenario => scenario.scenarioId === "SD-SENS-BASELINE").length, 1, "Plan must contain one baseline");
    assert.equal(new Set(plan.scenarios.map(scenario => scenario.scenarioId)).size, 17, "Scenario IDs must be unique");
    assert.equal(validation.valid, true, `Plan must validate: ${validation.errors.join(", ")}`);
    sensitivity.SENSITIVITY_PARAMETERS.forEach(parameter => {
      assert.equal(validation.parameterCounts[parameter], 2, `${parameter} must have one low and one high variant`);
    });
    plan.scenarios.slice(1).forEach(scenario => {
      const policy = sensitivity.candidatePolicyForScenario(scenario);
      const result = sensitivity.validatePolicyVariant(scenario, policy);
      assert.equal(result.valid, true, `${scenario.scenarioId} must validate`);
      assert.equal(result.changedParameters.length, 1, `${scenario.scenarioId} must change exactly one parameter`);
      assert.equal(result.changedParameters[0], scenario.variedParameter, `${scenario.scenarioId} must change only its declared parameter`);
      assert.equal(scenario.analysisOnly, true, `${scenario.scenarioId} must be analysis-only`);
      assert.equal(scenario.productionEligible, false, `${scenario.scenarioId} must never be production-eligible`);
    });
  });

  test("AP 16.4d.3b Policy validation rejects malformed and non-OFAT variants with stable codes", async assert => {
    const app = await helpers.loadCalibrationAnalysisApp();
    const sensitivity = app.ObsoliQ.slowDead.thresholdSensitivity;
    const baseline = app.ObsoliQ.slowDead.conditionEngine.DEFAULT_SLOW_DEAD_CONDITION_POLICY;
    const baseScenario = sensitivity.THRESHOLD_SENSITIVITY_PLAN.scenarios[7];
    const invalidCases = [
      {
        scenario: { ...baseScenario },
        policy: { ...baseline, slowMovingMonthsSinceLastConsumption: 5, nonMovingMonthsSinceLastConsumption: 10 },
        code: "multiple_parameters_changed"
      },
      {
        scenario: { ...baseScenario, candidateValue: 14 },
        policy: { ...baseline, slowMovingMonthsSinceLastConsumption: 14 },
        code: "invalid_threshold_order"
      },
      {
        scenario: { ...baseScenario, baselineValue: 7 },
        policy: { ...baseline, slowMovingMonthsSinceLastConsumption: 5 },
        code: "baseline_value_mismatch"
      },
      {
        scenario: { ...baseScenario, variedParameter: "unknownThreshold", baselineValue: null, candidateValue: 1 },
        policy: { ...baseline, unknownThreshold: 1 },
        code: "unknown_policy_parameter"
      }
    ];
    invalidCases.forEach(item => {
      const result = sensitivity.validatePolicyVariant(item.scenario, item.policy);
      assert.equal(result.valid, false, `${item.code} variant must be rejected`);
      assert.includes(result.errors, item.code, `${item.code} must be stable`);
    });
    const invalidCompletenessScenario = sensitivity.THRESHOLD_SENSITIVITY_PLAN.scenarios[3];
    const invalidCompleteness = sensitivity.validatePolicyVariant(
      { ...invalidCompletenessScenario, candidateValue: -0.1 },
      { ...baseline, minimumHistoryCompleteness: -0.1 }
    );
    assert.includes(invalidCompleteness.errors, "invalid_completeness_range", "Completeness range must be guarded");
  });

  test("AP 16.4d.3b Scenario migrations and critical Safety Guards are exact and non-activating", async assert => {
    const app = await helpers.loadCalibrationAnalysisApp();
    const fixtures = app.ObsoliQSlowDeadCalibrationFixtures.fixtures;
    const runner = app.ObsoliQ.slowDead.calibrationRunner;
    const sensitivity = app.ObsoliQ.slowDead.thresholdSensitivity;
    const baseline = runner.runCalibrationFixtures(fixtures);
    const analysis = sensitivity.runThresholdSensitivity(fixtures, baseline);

    assert.equal(analysis.status, "passed", "Eligible OFAT analysis must complete");
    assert.equal(analysis.numericContractVersion, "slow-dead-calibration-numeric-boundary-v1", "Sensitivity must expose the shared Numeric Boundary");
    assert.equal(analysis.scenarioCount, 17, "All scenarios must execute");
    assert.equal(analysis.scenarios[0].changedCaseCount, 0, "Baseline against itself must have no migration");
    assert.equal(analysis.scenarios[0].criticalSafetyViolationCount, 0, "Baseline must have no critical Safety violation");
    analysis.scenarios.forEach(scenario => {
      const migratedIds = scenario.migrations.flatMap(migration => migration.changedCaseIds);
      assert.equal(new Set(migratedIds).size, migratedIds.length, `${scenario.scenarioId} must not duplicate migrated Case IDs`);
      assert.equal(migratedIds.length, scenario.changedCaseCount, `${scenario.scenarioId} migration count must match Case IDs`);
      assert.equal(scenario.changedCaseCount + scenario.unchangedCaseCount, 30, `${scenario.scenarioId} must account for every fixture`);
      scenario.migrations.forEach(migration => {
        assert.equal(migration.count, migration.changedCaseIds.length, `${scenario.scenarioId} migration bucket count must match IDs`);
      });
      assert.equal(scenario.analysisOnly, true, `${scenario.scenarioId} must stay analysis-only`);
      assert.equal(scenario.productionEligible, false, `${scenario.scenarioId} must not be production-eligible`);
      assert.equal(scenario.activated, false, `${scenario.scenarioId} must not be activated`);
      assert.equal(scenario.recommended, false, `${scenario.scenarioId} must not be recommended`);
      assert.equal(scenario.safetyGuardResults.length, 10, `${scenario.scenarioId} must evaluate all ten immutable guards`);
    });
    assert.ok(analysis.unsafeScenarioIds.includes("SD-SENS-HISTORY-COVERAGE-LOW"), "Unsafe History relaxation must be visible");
    assert.ok(analysis.unsafeScenarioIds.includes("SD-SENS-MIN-COMPLETENESS-LOW"), "Unsafe completeness relaxation must be visible");
    assert.ok(analysis.unsafeScenarioIds.includes("SD-SENS-ACTIVE-MONTHS-HIGH"), "Broken intermittent protection must be visible");
  });
})();
