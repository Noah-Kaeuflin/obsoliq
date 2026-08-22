(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function inputFor(condition = "dead") {
    const base = {
      inventoryEvidence: {
        material_id: "MAT-ACTION",
        plant: "P1",
        stock_quantity: 100,
        stock_unit: "EA",
        stock_value: 10000,
        no_need_value: condition === "dead" ? 5000 : 0
      },
      historicalEvidence: {
        months_since_last_consumption: 20,
        net_consumption_quantity_3m: 0,
        net_consumption_quantity_6m: 0,
        net_consumption_quantity_12m: 0,
        active_consumption_months_12m: 0,
        movement_frequency_12m: 0,
        intermittency_ratio_12m: 1,
        history_coverage_months: 12,
        history_completeness: 1,
        history_metric_limitation_codes: []
      },
      relationshipEvidence: {
        relationshipState: "exact_material_plant",
        matchType: "exact_material_plant"
      },
      independentSignals: {},
      historicalRuntime: {
        status: "available",
        completedInputSignature: "sig",
        result: { historicalMetricsInputSignature: "sig" }
      }
    };
    if (condition === "reserve") base.inventoryEvidence.strategic_reserve = true;
    if (condition === "insufficient") base.historicalRuntime = { status: "unavailable", result: null };
    return base;
  }

  test("AP 16.4d.1 Action Eligibility remains pre-decisional and uses existing package types", async assert => {
    const app = await helpers.loadProductionApp();
    const module = app.ObsoliQ.slowDead.conditionEngine;
    const engine = module.createSlowDeadConditionEngine();
    const result = engine.evaluateCondition(inputFor("dead"));
    const actionCodes = result.action_eligibility.map(item => item.action_code);
    const allPackageTypes = result.action_eligibility.flatMap(item => item.required_data_packages || []);
    const allowedPackageTypes = [...module.REQUIRED_DATA_PACKAGE_TYPES];
    const disposal = result.action_eligibility.find(item => item.action_code === "DISPOSAL_REVIEW");

    assert.equal(result.condition_code, "dead_stock_candidate", "Fixture should produce Dead Stock Candidate");
    assert.ok(result.action_eligibility.length >= 3, "At least three action candidates should be exposed");
    assert.includes(actionCodes, "WRITE_DOWN_REVIEW", "Finance write-down review should be represented");
    assert.includes(actionCodes, "DISPOSAL_REVIEW", "Disposal review may exist only as review");
    assert.equal(disposal.eligibility_status, "review_required", "Disposal must never be automatically approved");
    allPackageTypes.forEach(type => assert.includes(allowedPackageTypes, type, `Package type ${type} must be pre-existing`));
  });

  test("AP 16.4d.1 Strategic Reserve excludes disposal and favors monitoring", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.slowDead.conditionEngine.createSlowDeadConditionEngine();
    const result = engine.evaluateCondition(inputFor("reserve"));
    const actionCodes = result.action_eligibility.map(item => item.action_code);
    const disposal = result.action_eligibility.find(item => item.action_code === "DISPOSAL_REVIEW");

    assert.equal(result.condition_code, "strategic_reserve", "Explicit reserve should be protected");
    assert.includes(actionCodes, "MONITOR", "Reserve cases should be monitored");
    assert.equal(disposal.eligibility_status, "not_recommendable", "Reserve must exclude disposal recommendation");
  });

  test("AP 16.4d.1 Missing evidence produces collect-evidence actions instead of false zero risk", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.slowDead.conditionEngine.createSlowDeadConditionEngine();
    const result = engine.evaluateCondition(inputFor("insufficient"));
    const actionCodes = result.action_eligibility.map(item => item.action_code);

    assert.equal(result.condition_code, "insufficient_evidence", "Unavailable history should remain explicit");
    assert.equal(result.evidence_strength, "insufficient", "Evidence strength should be categorical");
    assert.equal(result.condition_confidence, "unavailable", "Confidence should not invent certainty");
    assert.includes(actionCodes, "COLLECT_EVIDENCE", "Collect Evidence should be offered");
    assert.includes(actionCodes, "IMPORT_MISSING_DATA", "Missing Package import should be offered");
  });
})();
