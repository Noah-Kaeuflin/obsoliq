(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  test("AP 16.3b Opportunity Score calibration challenges financial impact, evidence and actionability", async assert => {
    const app = await helpers.loadProductionApp();
    const fixtures = window.ObsoliQExcessPilotFixtures;
    const engine = app.ObsoliQ.excess.opportunityScoreEngine;
    const scored = engine.scoreExcessCases({ cases: fixtures.scoredCaseInputs });
    const byFixture = new Map(scored.map(item => [item.fixtureId, item]));
    const report = engine.evaluateExcessPilotCalibration({
      cases: fixtures.scoredCaseInputs,
      scores: scored,
      expectations: fixtures.expectations
    });

    assert.equal(report.status, "passed", `Pilot calibration constraints should pass: ${JSON.stringify(report.failures)}`);
    assert.equal(report.modelVersion, engine.version, "Calibration must report the active score model version");
    assert.ok(report.passedConstraintCount > 0, "Calibration should evaluate explicit constraints");
    assert.ok(byFixture.get("A").excess_opportunity_score > byFixture.get("B").excess_opportunity_score, "High gross alone must not outrank stronger net/evidence case");
    assert.ok(byFixture.get("B").net_addressable_excess_value < byFixture.get("B").gross_excess_value, "Gross and net excess should remain distinct");
    assert.ok(byFixture.get("C").opportunity_score_components.actionability < byFixture.get("A").opportunity_score_components.actionability, "Missing owner reference should reduce actionability");
    assert.ok(byFixture.get("J").opportunity_score_components.data_confidence < byFixture.get("A").opportunity_score_components.data_confidence, "Critical/weak evidence should reduce data confidence");

    const filtered = scored.filter(item => item.fixtureId !== "A");
    const filteredReport = engine.evaluateExcessPilotCalibration({
      scores: filtered,
      expectations: fixtures.expectations.filter(item => item.fixtureId !== "A" && !item.expectedScoreConstraints.some(rule => rule.fixtureId === "A"))
    });
    assert.equal(filteredReport.status, "passed", "Calibration should not depend on UI filtering or pagination");
  });
})();
