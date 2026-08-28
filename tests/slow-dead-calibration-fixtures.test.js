(function () {
  "use strict";

  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  test("AP 16.4d.3a fixture set covers all Conditions, boundaries and Safety Invariants", async assert => {
    const app = await helpers.loadCalibrationAnalysisApp();
    const fixturePackage = app.ObsoliQSlowDeadCalibrationFixtures;
    const fixtures = fixturePackage.fixtures;
    const expectedConditions = new Set(fixtures.map(item => item.expected.condition));
    const expectedInvariantIds = Array.from({ length: 12 }, (_value, index) => `SD-SAFETY-${String(index + 1).padStart(2, "0")}`);
    const coveredInvariantIds = new Set(fixtures.flatMap(item => item.safety_invariant_ids));

    assert.ok(fixtures.length >= 24, "At least 24 controlled fixtures are required");
    ["insufficient_evidence", "intermittent_expected", "slow_moving_candidate", "non_moving_candidate", "dead_stock_candidate", "strategic_reserve"].forEach(condition => {
      assert.ok(expectedConditions.has(condition), `Canonical condition missing: ${condition}`);
    });
    [6, 12, 18].forEach(threshold => {
      ["below", "at", "above"].forEach(position => {
        assert.ok(fixtures.some(item => item.boundary_context?.threshold_months === threshold && item.boundary_context?.position === position), `Boundary fixture missing: ${threshold}/${position}`);
      });
    });
    expectedInvariantIds.forEach(id => assert.ok(coveredInvariantIds.has(id), `Safety invariant is not covered: ${id}`));
    assert.equal(new Set(fixtures.map(item => item.calibration_case_id)).size, fixtures.length, "Calibration Case IDs must be unique");
  });

  test("AP 16.4d.3a fixtures are fixed, synthetic and preserve zero versus missing evidence", async assert => {
    const app = await helpers.loadCalibrationAnalysisApp();
    const fixturePackage = app.ObsoliQSlowDeadCalibrationFixtures;
    const fixtures = fixturePackage.fixtures;
    const missing = fixtures.find(item => item.calibration_case_id === "SD-CAL-SYN-0025");
    const numericZero = fixtures.find(item => item.calibration_case_id === "SD-CAL-SYN-0026");
    const projectDemand = fixtures.find(item => item.calibration_case_id === "SD-CAL-SYN-0024");

    assert.equal(fixturePackage.reference_date, "2026-08-25", "Fixture reference date must be fixed");
    assert.ok(Object.isFrozen(fixtures), "Fixture collection must be immutable");
    fixtures.forEach(item => {
      assert.equal(item.source_type, "synthetic_acceptance_fixture", "Every fixture in this block must be synthetic");
      assert.equal(item.label_provenance.human_expert_validated, false, "No fixture may claim human expert validation");
      assert.equal(item.policy_version, "slow-dead-condition-policy-v1", "Every fixture must target productive Policy v1");
      assert.ok(Object.isFrozen(item), `Fixture must be immutable: ${item.calibration_case_id}`);
    });
    assert.equal(missing.input_snapshot.historicalEvidence.net_consumption_quantity_12m, undefined, "Missing evidence must remain absent/undefined");
    assert.equal(numericZero.input_snapshot.historicalEvidence.net_consumption_quantity_12m, 0, "A real numeric zero must remain zero");
    assert.notEqual(missing.expected.condition, numericZero.expected.condition, "Missing evidence and numeric zero must produce distinct contract expectations");
    assert.equal(projectDemand.protection_flags.project_or_one_time_demand, true, "Project/one-time demand protection fixture must be explicit");
    assert.notEqual(projectDemand.expected.condition, "dead_stock_candidate", "Project/one-time demand fixture must not assert normal Dead Stock");
  });
})();
