(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function healthyInput(overrides = {}) {
    return {
      inventoryEvidence: {
        material_id: "MAT-LEGACY",
        material_description: "Regular production component",
        plant: "P1",
        stock_quantity: 100,
        stock_unit: "EA",
        stock_value: 10000,
        no_need_value: 0,
        no_plan_value: 0,
        ...(overrides.inventoryEvidence || {})
      },
      historicalEvidence: {
        months_since_last_consumption: 1,
        net_consumption_quantity_3m: 45,
        net_consumption_quantity_6m: 90,
        net_consumption_quantity_12m: 180,
        active_consumption_months_12m: 12,
        movement_frequency_12m: 12,
        intermittency_ratio_12m: 0.1,
        inventory_coverage_months: 2,
        history_coverage_months: 12,
        history_completeness: 1,
        history_metric_limitation_codes: [],
        ...(overrides.historicalEvidence || {})
      },
      relationshipEvidence: {
        relationshipState: "exact_material_plant",
        matchType: "exact_material_plant",
        ...(overrides.relationshipEvidence || {})
      },
      independentSignals: {
        ...(overrides.independentSignals || {})
      },
      historicalRuntime: {
        status: "available",
        completedInputSignature: "sig",
        result: { historicalMetricsInputSignature: "sig" },
        ...(overrides.historicalRuntime || {})
      }
    };
  }

  function actionSignature(result) {
    return (result.action_eligibility || []).map(item => [
      item.action_code,
      item.eligibility_status,
      (item.required_data_packages || []).join("|")
    ].join(":"));
  }

  test("AP 16.4d.1.1 legacy slow/dead free text is not Condition or Eligibility truth", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.slowDead.conditionEngine.createSlowDeadConditionEngine();
    const clean = engine.evaluateCondition(healthyInput());
    const noisy = engine.evaluateCondition(healthyInput({
      inventoryEvidence: {
        material_description: "slow dead obsolete Totbestand Langsamdreher non-moving"
      }
    }));

    assert.equal(noisy.condition_code, clean.condition_code, "Legacy free text must not change the Condition result");
    assert.deepEqual(actionSignature(noisy), actionSignature(clean), "Legacy free text must not change Action Eligibility");
  });

  test("AP 16.4d.1.1 strategic reserve and intermittent evidence keep accepted precedence", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.slowDead.conditionEngine.createSlowDeadConditionEngine();
    const reserve = engine.evaluateCondition(healthyInput({
      inventoryEvidence: {
        strategic_reserve: true,
        material_description: "dead obsolete scrap candidate"
      },
      historicalEvidence: {
        months_since_last_consumption: 24,
        net_consumption_quantity_3m: 0,
        net_consumption_quantity_6m: 0,
        net_consumption_quantity_12m: 0,
        active_consumption_months_12m: 0,
        movement_frequency_12m: 0,
        intermittency_ratio_12m: 1,
        inventory_coverage_months: 36
      }
    }));
    const intermittent = engine.evaluateCondition(healthyInput({
      inventoryEvidence: {
        material_description: "slow dead obsolete"
      },
      historicalEvidence: {
        months_since_last_consumption: 2,
        net_consumption_quantity_3m: 10,
        net_consumption_quantity_6m: 15,
        net_consumption_quantity_12m: 24,
        active_consumption_months_12m: 2,
        movement_frequency_12m: 2,
        intermittency_ratio_12m: 0.83,
        inventory_coverage_months: 45
      }
    }));

    assert.equal(reserve.condition_code, "strategic_reserve", "Strategic Reserve precedence should remain protected");
    assert.equal(intermittent.condition_code, "intermittent_expected", "Intermittent recurring demand should remain protected");
  });
})();
