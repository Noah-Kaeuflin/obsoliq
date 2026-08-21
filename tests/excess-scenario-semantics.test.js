(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function byId(scenarios) {
    return new Map(scenarios.map(item => [item.scenario_id, item]));
  }

  test("AP 16.3b scenarios separate facts, assumptions, calculations and missing evidence", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.excess.excessScenarioEngine;
    const fixtureH = window.ObsoliQExcessPilotFixtures.cases.find(item => item.fixtureId === "H").inventoryInput;
    const before = JSON.stringify(fixtureH);
    const scenarios = byId(engine.buildScenarioSet(fixtureH));

    assert.equal(JSON.stringify(fixtureH), before, "Scenario engine must not mutate active case data");
    assert.equal(scenarios.get("excess_reduction_percent").availability, "available", "Reduction scenario should be available from net excess");
    assert.ok(scenarios.get("excess_reduction_percent").userAssumptions.includes("assumption_reduce_25_percent"), "Reduction scenario should expose user assumptions");
    assert.ok(Object.prototype.hasOwnProperty.call(scenarios.get("excess_reduction_percent").calculatedOutputs, "remaining_value"), "Reduction scenario should expose calculated outputs");
    assert.equal(scenarios.get("demand_validation").availability, "unavailable", "Demand scenario must be unavailable without Consumption History or Forecast");
    assert.ok(scenarios.get("demand_validation").requiredPackages.includes("consumption_history"), "Demand scenario should request Consumption History");
    assert.ok(scenarios.get("demand_validation").requiredPackages.includes("demand_forecast"), "Demand scenario should request Demand Forecast");
    assert.equal(scenarios.get("safety_stock_adjustment").availability, "limited", "MOQ without safety target should limit safety-stock scenario");
    assert.ok(scenarios.get("safety_stock_adjustment").limitations.includes("classification_context_not_physical_reduction"), "Safety-stock scenario should state classification limitation");

    const poGeneric = { ...fixtureH, source_row: { open_po_value: 12000 } };
    const poScenario = byId(engine.buildScenarioSet(poGeneric)).get("purchase_order_review");
    assert.equal(poScenario.availability, "unavailable", "PO scenario must be unavailable with only generic PO signal");
    assert.ok(poScenario.missingEvidence.includes("purchase_order_details"), "PO scenario should request line-level PO details");
    assert.ok(poScenario.nonPredictiveLabelKey, "Every scenario should carry non-predictive wording");
    assert.equal(engine.version, poScenario.modelVersion, "Scenario result should carry model version");
  });
})();
