(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  const conditionCodes = [
    "dead_stock_candidate",
    "non_moving_candidate",
    "slow_moving_candidate",
    "insufficient_evidence",
    "intermittent_expected",
    "strategic_reserve"
  ];

  function caseRecord(index, conditionCode, overrides = {}) {
    const material = `MAT-SD-${String(index).padStart(4, "0")}`;
    return {
      case_id: `SLOW-DEAD::DS-PAGE::ENTITY-${index}`,
      inventory_entity_key: `material:${material}|plant:P${index}`,
      inventory_row_keys: [`INV-${index}-A`, `INV-${index}-B`],
      material_id: material,
      material_description: `Slow Dead fixture ${index}`,
      plant: `P${index % 3}`,
      profit_center: `PC-${index % 4}`,
      program: `PRG-${index % 2}`,
      condition_code: conditionCode,
      evidence_strength: index % 2 ? "medium" : "high",
      condition_confidence: index % 2 ? "medium" : "high",
      stock_value: 1000 + index * 100,
      stock_quantity: 10 + index,
      stock_unit: "EA",
      positive_evidence: [{ code: "inventory_exposure_exists", value: { stockValue: 1000 + index * 100 } }],
      counter_evidence: [],
      limitation_codes: conditionCode === "insufficient_evidence" ? ["history_coverage_below_policy"] : [],
      missing_evidence: conditionCode === "insufficient_evidence" ? ["twelve_month_consumption_history"] : ["future_demand"],
      root_cause_candidates: [{ root_cause_code: "requires_cross_functional_review", label: "Cause requires cross-functional review" }],
      recovery_case_eligibility: { eligibility: conditionCode === "strategic_reserve" ? "monitor_only" : "reviewable_case_candidate", reason_codes: ["inventory_exposure_exists"] },
      action_eligibility: [{ action_code: "MONITOR", eligibility_status: "review_required", reason_codes: ["review_required"], required_data_packages: ["actions_outcomes"] }],
      required_data_packages: ["demand_forecast", "actions_outcomes"],
      provenance: {
        relationshipMatchType: "exact_material_plant",
        condition_model_version: "slow-dead-condition-v1",
        condition_policy_version: "slow-dead-condition-policy-v1",
        caseInputSignature: "case-input-fixture"
      },
      ...overrides
    };
  }

  function runtime(cases) {
    return {
      status: "available",
      result: {
        status: "available",
        evaluatedAt: "2026-08-23T10:00:00.000Z",
        cases
      },
      buildCount: 1,
      completedInputSignature: "slow-dead-page-test"
    };
  }

  test("AP 16.4d.2 Page Model filters, sorts and deduplicates entity cases", async assert => {
    const app = await helpers.loadProductionApp();
    const pageModel = app.ObsoliQ.slowDead.pageModel;
    const cases = conditionCodes.map((code, index) => caseRecord(index + 1, code));
    const duplicate = { ...cases[0], case_id: `${cases[0].case_id}::DUPLICATE` };
    const input = runtime([...cases, duplicate]);
    const before = JSON.stringify(input);
    const model = pageModel.createSlowDeadPageModel({
      runtimeState: input,
      filters: { condition: "dead_stock_candidate" },
      sort: { key: "inventory_exposure_value", direction: "desc" },
      page: 1,
      pageSize: 25,
      linkedActionMaterials: [cases[0].material_id]
    });

    assert.equal(model.totalCases, 6, "Repeated entity cases should be deduplicated");
    assert.equal(model.filteredCaseCount, 1, "Condition filter should return one matching case");
    assert.equal(model.pageCases[0].condition_code, "dead_stock_candidate", "Filtered row should keep the selected condition");
    assert.equal(model.pageCases[0].has_linked_action, true, "Linked action material should be marked");
    assert.equal(model.conditionOptions.length, 6, "All six controlled conditions should remain filterable");
    assert.equal(model.portfolioSummary.caseCount, 6, "Portfolio summary should use entity-level cases");
    assert.equal(model.portfolioSummary.primaryItems.length, 5, "Portfolio summary should show five primary items");
    assert.equal(JSON.stringify(input), before, "Page model must not mutate the runtime state");
  });

  test("AP 16.4d.2 Page Model keeps missing exposure unavailable instead of false zero", async assert => {
    const app = await helpers.loadProductionApp();
    const pageModel = app.ObsoliQ.slowDead.pageModel;
    const model = pageModel.createSlowDeadPageModel({
      runtimeState: runtime([caseRecord(1, "slow_moving_candidate", { stock_value: 0 })])
    });

    assert.equal(model.allCases[0].inventory_exposure_missing, true, "Zero service value should be displayed as unavailable exposure");
    assert.equal(model.portfolioSummary.inventoryExposureValue, 0, "Missing exposure should not be invented");
  });
})();
