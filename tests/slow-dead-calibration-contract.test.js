(function () {
  "use strict";

  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  test("AP 16.4d.3a Calibration Contract binds directly to productive Policy v1", async assert => {
    const app = await helpers.loadCalibrationAnalysisApp();
    const contract = app.ObsoliQ.slowDead.calibrationContract;
    const engine = app.ObsoliQ.slowDead.conditionEngine;
    const fixtures = app.ObsoliQSlowDeadCalibrationFixtures.fixtures;
    const validation = contract.validateCalibrationCaseSet(fixtures);

    assert.equal(contract.CALIBRATION_SCHEMA_VERSION, "slow-dead-calibration-case-v1", "Calibration schema must be versioned");
    assert.equal(contract.CALIBRATION_NUMERIC_CONTRACT_VERSION, "slow-dead-calibration-numeric-boundary-v1", "Calibration numeric boundary must be versioned");
    assert.equal(contract.CALIBRATION_RUNNER_VERSION, "slow-dead-calibration-runner-v2", "Changed Runner output must use v2");
    assert.equal(contract.CALIBRATION_REFERENCE_DATE, "2026-08-25", "Calibration reference date must be fixed");
    assert.equal(contract.CALIBRATION_POLICY_REFERENCE, engine.DEFAULT_SLOW_DEAD_CONDITION_POLICY, "Calibration must reference the productive Policy object");
    assert.equal(contract.CALIBRATION_POLICY_REFERENCE.policyVersion, "slow-dead-condition-policy-v1", "Productive Policy version must remain v1");
    assert.ok(Object.isFrozen(contract.CALIBRATION_POLICY_REFERENCE), "Productive Policy reference must be read-only");
    assert.equal(validation.valid, true, `Fixture contract must validate: ${validation.errors.join(", ")}`);
    assert.equal(validation.errors.length, 0, "Valid fixture set must have no validation errors");
    assert.ok(validation.case_results.every(result => result.runnable), "Every controlled fixture must be runnable through the strict Numeric Boundary");
  });

  test("AP 16.4d.3a Calibration Contract rejects invalid schema, IDs, reasons and provenance", async assert => {
    const app = await helpers.loadCalibrationAnalysisApp();
    const contract = app.ObsoliQ.slowDead.calibrationContract;
    const source = app.ObsoliQSlowDeadCalibrationFixtures.fixtures[1];

    const invalidSchema = clone(source);
    invalidSchema.calibration_schema_version = "unknown";
    assert.includes(contract.validateCalibrationCase(invalidSchema).errors, "calibration_schema_version_invalid", "Unknown schema must fail closed");

    const invalidReason = clone(source);
    invalidReason.expected.required_reason_codes = ["invented_reason"];
    assert.includes(contract.validateCalibrationCase(invalidReason).errors, "required_reason_codes_invalid", "Unknown reason codes must fail closed");

    const falseExpertClaim = clone(source);
    falseExpertClaim.label_provenance.human_expert_validated = true;
    assert.includes(contract.validateCalibrationCase(falseExpertClaim).errors, "synthetic_fixture_must_not_claim_human_validation", "Synthetic fixtures must never claim expert validation");

    const incompletePilot = clone(source);
    incompletePilot.calibration_case_id = "SD-CAL-PILOT-0001";
    incompletePilot.source_type = "pilot_expert_label";
    incompletePilot.label_provenance = { type: "pilot_expert_label", basis: "pilot_review", human_expert_validated: true };
    const pilotErrors = contract.validateCalibrationCase(incompletePilot).errors;
    assert.includes(pilotErrors, "pilot_label_reviewer_missing", "Pilot labels must require reviewer provenance");
    assert.includes(pilotErrors, "pilot_label_review_timestamp_invalid", "Pilot labels must require a review timestamp");
    assert.includes(pilotErrors, "pilot_label_review_rationale_missing", "Pilot labels must require a review rationale");

    const duplicate = contract.validateCalibrationCaseSet([source, source]);
    assert.includes(duplicate.errors, `duplicate_calibration_case_id:${source.calibration_case_id}`, "Duplicate Case IDs must fail closed");
  });
})();
