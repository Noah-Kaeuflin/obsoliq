(function () {
  "use strict";

  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function clone(value) {
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
    }
    return value;
  }

  function evidenceFor(validation, path) {
    return validation.numeric_evidence.find(item => item.path === path);
  }

  function fixtureWithStockValue(source, sequence, value) {
    const fixture = clone(source);
    fixture.calibration_case_id = `SD-CAL-SYN-${String(sequence).padStart(4, "0")}`;
    fixture.input_snapshot.inventoryEvidence.stock_value = value;
    return fixture;
  }

  test("NUM-CAL-MIG-01 preserves valid zero and every Missing representation at the productive Numeric Boundary", async assert => {
    const app = await helpers.loadCalibrationAnalysisApp();
    const contract = app.ObsoliQ.slowDead.calibrationContract;
    const runner = app.ObsoliQ.slowDead.calibrationRunner;
    const fixtures = app.ObsoliQSlowDeadCalibrationFixtures.fixtures;
    const fieldPath = "historicalEvidence.net_consumption_quantity_12m";
    const zeroFixture = clone(fixtures.find(item => item.calibration_case_id === "SD-CAL-SYN-0026"));
    const zeroValidation = contract.validateCalibrationCase(zeroFixture);
    const zeroEvidence = evidenceFor(zeroValidation, fieldPath);

    assert.equal(zeroEvidence.status, "valid", "Explicit numeric zero must remain valid");
    assert.equal(zeroEvidence.normalized_value, 0, "Explicit numeric zero must remain zero");
    assert.equal(zeroEvidence.source_was_explicit_zero, true, "Explicit zero provenance must be retained");
    assert.equal(runner.runCalibrationFixtures([zeroFixture]).status, "passed", "Valid zero fixture must remain evaluable");

    const missingValues = ["", null, undefined, "   "];
    missingValues.forEach((value, index) => {
      const missingFixture = clone(fixtures.find(item => item.calibration_case_id === "SD-CAL-SYN-0025"));
      missingFixture.calibration_case_id = `SD-CAL-SYN-${String(9100 + index).padStart(4, "0")}`;
      missingFixture.input_snapshot.historicalEvidence.net_consumption_quantity_12m = value;
      const validation = contract.validateCalibrationCase(missingFixture);
      const evidence = evidenceFor(validation, fieldPath);
      assert.equal(evidence.status, "missing", `Missing representation ${index + 1} must remain Missing`);
      assert.equal(evidence.normalized_value, null, `Missing representation ${index + 1} must not become zero`);
      assert.equal(validation.runnable, true, `Intentional Missing representation ${index + 1} must remain condition-evaluable`);
      const result = runner.runCalibrationFixtures([missingFixture]);
      assert.equal(result.eligible_result_count, 1, `Missing representation ${index + 1} must reach the Engine as Missing`);
      assert.equal(result.results[0].numeric_status, "missing", `Result row ${index + 1} must preserve Missing status`);
    });

    const textFixture = clone(zeroFixture);
    textFixture.calibration_case_id = "SD-CAL-SYN-9199";
    textFixture.input_snapshot.historicalEvidence.net_consumption_quantity_12m = "0";
    const textValidation = contract.validateCalibrationCase(textFixture);
    assert.equal(evidenceFor(textValidation, fieldPath).status, "valid", "A deliberate textual number must use the productive parser");
    assert.equal(evidenceFor(textValidation, fieldPath).normalized_value, 0, "Parsed textual zero must normalize to zero");
  });

  test("NUM-CAL-MIG-01 rejects legacy coercion tokens without evaluating or aggregating them", async assert => {
    const app = await helpers.loadCalibrationAnalysisApp();
    const contract = app.ObsoliQ.slowDead.calibrationContract;
    const runner = app.ObsoliQ.slowDead.calibrationRunner;
    const metricsModule = app.ObsoliQ.slowDead.calibrationMetrics;
    const source = app.ObsoliQSlowDeadCalibrationFixtures.fixtures[4];
    const tokens = ["abc123xyz", "foo1e3bar", "1-2", "--12", NaN, Infinity];
    const invalidFixtures = tokens.map((token, index) => fixtureWithStockValue(source, 9200 + index, token));

    invalidFixtures.forEach((fixture, index) => {
      const validation = contract.validateCalibrationCase(fixture);
      const evidence = evidenceFor(validation, "inventoryEvidence.stock_value");
      assert.equal(evidence.status, "invalid", `Legacy token ${index + 1} must remain invalid`);
      assert.equal(evidence.normalized_value, null, `Legacy token ${index + 1} must not produce a number`);
      assert.equal(validation.runnable, false, `Legacy token ${index + 1} must not reach the Condition Engine`);
    });

    const report = runner.runCalibrationFixtures(invalidFixtures);
    const metrics = metricsModule.buildCalibrationMetrics(invalidFixtures, report, { deterministicRepeatability: true });
    assert.equal(report.status, "insufficient_coverage", "An all-invalid Runner input must be insufficient coverage");
    assert.equal(report.eligible_result_count, 0, "Invalid rows must not be eligible");
    assert.equal(report.excluded_result_count, tokens.length, "Every invalid row must remain visible as excluded");
    assert.equal(report.synthetic_contract_agreement, null, "All-invalid agreement must be not calculable");
    assert.equal(report.synthetic_contract_agreement_status, "not_calculable", "All-invalid agreement status must be explicit");
    assert.ok(report.results.every(result => result.evaluation_status === "excluded_invalid_input"), "Every invalid row must retain an excluded Result Row");
    assert.ok(report.results.every(result => result.numeric_reason_codes.length > 0), "Every invalid row must retain a numeric reason code");
    assert.equal(metrics.status, "insufficient_coverage", "All-invalid Metrics must be insufficient coverage");
    assert.equal(metrics.syntheticContractAgreement, null, "All-invalid Metrics must not report a ratio");
    assert.equal(metrics.safetyStatus, "not_evaluated", "Safety must not pass without evaluated rows");
    assert.equal(JSON.stringify(metrics).includes("Infinity"), false, "Metrics must not serialize Infinity");
    assert.equal(JSON.stringify(metrics).includes("NaN"), false, "Metrics must not serialize NaN");
  });

  test("NUM-CAL-MIG-01 blocks empty Calibration and Sensitivity bases instead of reporting a false PASS", async assert => {
    const app = await helpers.loadCalibrationAnalysisApp();
    const runner = app.ObsoliQ.slowDead.calibrationRunner;
    const metricsModule = app.ObsoliQ.slowDead.calibrationMetrics;
    const sensitivity = app.ObsoliQ.slowDead.thresholdSensitivity;
    const emptyReport = runner.runCalibrationFixtures([]);
    const emptyMetrics = metricsModule.buildCalibrationMetrics([], emptyReport, { deterministicRepeatability: true });
    const emptySensitivity = sensitivity.runThresholdSensitivity([], emptyReport);

    assert.equal(emptyReport.status, "insufficient_coverage", "Empty Runner input must be insufficient coverage");
    assert.equal(emptyReport.synthetic_contract_agreement, null, "Empty Runner agreement must be not calculable");
    assert.equal(emptyReport.safety_status, "not_evaluated", "Empty Runner safety must not be evaluated");
    assert.equal(emptyMetrics.status, "insufficient_coverage", "Empty Metrics must be insufficient coverage");
    assert.equal(emptyMetrics.syntheticContractAgreement, null, "Empty Metrics must not report zero or 100 percent");
    assert.equal(emptyMetrics.safetyStatus, "not_evaluated", "Empty Metrics safety must not pass");
    assert.equal(emptySensitivity.status, "insufficient_coverage", "Empty Sensitivity input must be insufficient coverage");
    assert.equal(emptySensitivity.scenarioCount, 0, "No OFAT scenario may run without eligible fixtures");
  });

  test("NUM-CAL-MIG-01 keeps all 30 fixtures, 12 invariants and 17 OFAT scenarios deterministic with numeric status evidence", async assert => {
    const app = await helpers.loadCalibrationAnalysisApp();
    const fixtures = app.ObsoliQSlowDeadCalibrationFixtures.fixtures;
    const runner = app.ObsoliQ.slowDead.calibrationRunner;
    const metricsModule = app.ObsoliQ.slowDead.calibrationMetrics;
    const sensitivity = app.ObsoliQ.slowDead.thresholdSensitivity;
    const expectedBefore = runner.stableJson(fixtures.map(item => item.expected));
    const policyBefore = runner.stableJson(app.ObsoliQ.slowDead.conditionEngine.DEFAULT_SLOW_DEAD_CONDITION_POLICY);
    const first = runner.runCalibrationFixtures(fixtures);
    const second = runner.runCalibrationFixtures(fixtures);
    const metrics = metricsModule.buildCalibrationMetrics(fixtures, first, {
      deterministicRepeatability: runner.stableJson(first) === runner.stableJson(second)
    });
    const analysisFirst = sensitivity.runThresholdSensitivity(fixtures, first);
    const analysisSecond = sensitivity.runThresholdSensitivity(fixtures, second);
    const missingResult = first.results.find(item => item.calibration_case_id === "SD-CAL-SYN-0025");
    const zeroResult = first.results.find(item => item.calibration_case_id === "SD-CAL-SYN-0026");
    const missingEvidence = missingResult.numeric_evidence.find(item => item.path === "historicalEvidence.net_consumption_quantity_12m");
    const zeroEvidence = zeroResult.numeric_evidence.find(item => item.path === "historicalEvidence.net_consumption_quantity_12m");

    assert.equal(first.status, "passed", "Controlled baseline must pass");
    assert.equal(first.fixture_count, 30, "No fixture may be lost");
    assert.equal(first.eligible_result_count, 30, "Every controlled fixture must remain eligible");
    assert.equal(first.excluded_result_count, 0, "No controlled fixture may be excluded");
    assert.equal(metrics.safetyInvariantResults.length, 12, "All twelve Safety Invariants must remain reported");
    assert.equal(analysisFirst.status, "passed", "Sensitivity analysis must complete");
    assert.equal(analysisFirst.scenarioCount, 17, "All seventeen OFAT scenarios must run");
    assert.ok(analysisFirst.scenarios.every(scenario => scenario.caseResults.length === 30), "Every OFAT scenario must retain all fixtures");
    assert.ok(analysisFirst.scenarios.every(scenario => scenario.caseResults.every(result => ["valid", "missing"].includes(result.numericStatus))), "Every OFAT result must preserve an eligible numeric status");
    assert.equal(missingEvidence.status, "missing", "Missing evidence status must reach the baseline Result Row");
    assert.equal(zeroEvidence.status, "valid", "Zero evidence status must reach the baseline Result Row");
    assert.equal(zeroEvidence.normalized_value, 0, "Zero evidence value must reach the baseline Result Row");
    assert.equal(runner.stableJson(first), runner.stableJson(second), "Baseline runs must be deterministic");
    assert.equal(runner.stableJson(analysisFirst), runner.stableJson(analysisSecond), "Sensitivity runs must be deterministic");
    assert.equal(runner.stableJson(fixtures.map(item => item.expected)), expectedBefore, "Expected Conditions must remain unchanged");
    assert.equal(runner.stableJson(app.ObsoliQ.slowDead.conditionEngine.DEFAULT_SLOW_DEAD_CONDITION_POLICY), policyBefore, "Productive Policy must remain unchanged");
  });
})();
