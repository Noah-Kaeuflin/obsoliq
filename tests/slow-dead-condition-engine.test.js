(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function baseInput(overrides = {}) {
    return {
      inventoryEvidence: {
        inventory_entity_key: "material:MAT-SD|plant:P1",
        material_id: "MAT-SD",
        plant: "P1",
        stock_quantity: 100,
        stock_unit: "EA",
        stock_value: 10000,
        currency: "EUR",
        ...overrides.inventoryEvidence
      },
      historicalEvidence: {
        inventoryEntityKey: "material:MAT-SD|plant:P1",
        matchType: "exact_material_plant",
        months_since_last_consumption: 1,
        net_consumption_quantity_3m: 30,
        net_consumption_quantity_6m: 60,
        net_consumption_quantity_12m: 120,
        average_monthly_consumption_12m: 10,
        active_consumption_months_12m: 10,
        movement_frequency_12m: 10,
        intermittency_ratio_12m: 0.17,
        consumption_trend: "stable",
        consumption_trend_ratio: 0,
        history_coverage_months: 12,
        history_completeness: 1,
        inventory_coverage_months: 10,
        history_metric_status: "available",
        history_metric_limitation_codes: [],
        ...overrides.historicalEvidence
      },
      relationshipEvidence: {
        relationshipState: "exact_material_plant",
        matchType: "exact_material_plant",
        inventoryEntityKey: "material:MAT-SD|plant:P1",
        historyEntityKey: "material:MAT-SD|plant:P1",
        ...overrides.relationshipEvidence
      },
      materialMasterContext: {
        ...overrides.materialMasterContext
      },
      independentSignals: {
        ...overrides.independentSignals
      },
      historicalRuntime: {
        status: "available",
        completedInputSignature: "hist-sig",
        result: { historicalMetricsInputSignature: "hist-sig" },
        ...overrides.historicalRuntime
      }
    };
  }

  test("AP 16.4d.1 Condition Engine exposes central policy and model versions", async assert => {
    const app = await helpers.loadProductionApp();
    const module = app.ObsoliQ.slowDead.conditionEngine;
    const engine = module.createSlowDeadConditionEngine();
    const policy = engine.getPolicy();

    assert.equal(engine.getModelVersion(), "slow-dead-condition-v1", "Condition model version should be explicit");
    assert.equal(policy.policyVersion, "slow-dead-condition-policy-v1", "Policy version should be explicit");
    assert.equal(policy.minimumHistoryCoverageMonths, 12, "Policy threshold should be centrally exposed");
    assert.includes(module.CONDITION_PRECEDENCE, "dead_stock_candidate", "Precedence should include Dead Stock Candidate");
  });

  test("AP 16.4d.1 Condition Engine classifies controlled Slow / Dead conditions", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.slowDead.conditionEngine.createSlowDeadConditionEngine();

    const insufficient = engine.evaluateCondition(baseInput({
      historicalRuntime: { status: "unavailable", result: null }
    }));
    const intermittent = engine.evaluateCondition(baseInput({
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
    const slow = engine.evaluateCondition(baseInput({
      historicalEvidence: {
        months_since_last_consumption: 7,
        net_consumption_quantity_3m: 1,
        net_consumption_quantity_6m: 4,
        net_consumption_quantity_12m: 30,
        active_consumption_months_12m: 3,
        movement_frequency_12m: 3,
        intermittency_ratio_12m: 0.5,
        consumption_trend: "declining",
        consumption_trend_ratio: -0.4,
        inventory_coverage_months: 18
      }
    }));
    const nonMoving = engine.evaluateCondition(baseInput({
      historicalEvidence: {
        months_since_last_consumption: 13,
        net_consumption_quantity_3m: 0,
        net_consumption_quantity_6m: 0,
        net_consumption_quantity_12m: 8,
        active_consumption_months_12m: 1,
        movement_frequency_12m: 1,
        intermittency_ratio_12m: 0.92,
        inventory_coverage_months: 80
      }
    }));
    const dead = engine.evaluateCondition(baseInput({
      inventoryEvidence: { no_need_value: 5000 },
      historicalEvidence: {
        months_since_last_consumption: 20,
        net_consumption_quantity_3m: 0,
        net_consumption_quantity_6m: 0,
        net_consumption_quantity_12m: 0,
        active_consumption_months_12m: 0,
        movement_frequency_12m: 0,
        intermittency_ratio_12m: 1,
        history_completeness: 0.95,
        inventory_coverage_months: null
      }
    }));
    const reserve = engine.evaluateCondition(baseInput({
      inventoryEvidence: { strategic_reserve: true, no_need_value: 5000 },
      historicalEvidence: {
        months_since_last_consumption: 24,
        net_consumption_quantity_3m: 0,
        net_consumption_quantity_6m: 0,
        net_consumption_quantity_12m: 0,
        active_consumption_months_12m: 0,
        movement_frequency_12m: 0,
        intermittency_ratio_12m: 1,
        inventory_coverage_months: null
      }
    }));
    const healthy = engine.evaluateCondition(baseInput());

    assert.equal(insufficient.condition_code, "insufficient_evidence", "Missing runtime should become insufficient evidence");
    assert.equal(intermittent.condition_code, "intermittent_expected", "Recurring intermittent demand should be protected");
    assert.equal(slow.condition_code, "slow_moving_candidate", "Multiple Slow drivers should produce Slow-Moving Candidate");
    assert.equal(nonMoving.condition_code, "non_moving_candidate", "No recent movement should produce Non-Moving Candidate");
    assert.equal(dead.condition_code, "dead_stock_candidate", "Dead Stock Candidate should require independent evidence");
    assert.equal(reserve.condition_code, "strategic_reserve", "Explicit reserve should take precedence");
    assert.equal(healthy.condition_code, null, "Healthy evidence should not create a case");
  });

  test("AP 16.4d.1 age alone cannot create a Dead Stock Candidate", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.slowDead.conditionEngine.createSlowDeadConditionEngine();
    const result = engine.evaluateCondition(baseInput({
      historicalEvidence: {
        months_since_last_consumption: 24,
        net_consumption_quantity_3m: 0,
        net_consumption_quantity_6m: 0,
        net_consumption_quantity_12m: 0,
        active_consumption_months_12m: 0,
        movement_frequency_12m: 0,
        intermittency_ratio_12m: 1,
        history_completeness: 1,
        inventory_coverage_months: null
      }
    }));

    assert.notEqual(result.condition_code, "dead_stock_candidate", "Age-only evidence must not become Dead Stock Candidate");
    assert.includes(result.counter_evidence.map(item => item.code), "dead_age_without_independent_signal", "Counter evidence should explain the age-only safety gate");
  });
})();
