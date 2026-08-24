(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function sampleCases() {
    return [
      {
        case_id: "EX-1",
        inventory_row_key: "INV-1",
        material_id: "000123",
        material_description: "Pump",
        plant: "DE01",
        program_short: "A",
        owner_reference: "G06",
        owner_function: "Material Planning",
        priority: "High",
        gross_excess_value: 100,
        net_addressable_excess_value: 80,
        excess_overlap_value: 20,
        excess_opportunity_score: 80,
        whyPrioritized: ["why_net_addressable_excess"],
        next_step: "review_inventory",
        decision_type: "Review"
      },
      {
        case_id: "EX-2",
        inventory_row_key: "INV-2",
        material_id: "000124",
        material_description: "Valve",
        plant: "DE02",
        program_short: "B",
        owner_reference: "F03",
        owner_function: "Supply Chain Planning",
        priority: "Medium",
        gross_excess_value: 100,
        net_addressable_excess_value: 70,
        excess_overlap_value: 30,
        excess_opportunity_score: 60,
        whyPrioritized: ["why_high_financial_impact"],
        next_step: "",
        decision_type: ""
      }
    ];
  }

  test("EX-UX-01.2 presentation model summarizes accepted Cases without analytical recalculation", async assert => {
    const app = await helpers.loadApp();
    const model = app.ObsoliQ.excess.decisionWorkspaceModel;
    const cases = sampleCases();
    const summary = model.summarize(cases);

    assert.equal(summary.netAddressable.value, 150, "Net Addressable should sum accepted Case values");
    assert.equal(summary.casePortfolio.caseCount, 2, "Case count should count accepted Cases");
    assert.equal(summary.casePortfolio.uniqueMaterialCount, 2, "Unique material count should be deterministic");
    assert.equal(summary.casePortfolio.uniquePlantCount, 2, "Unique plant count should be deterministic");
    assert.equal(summary.prioritization.averageScore, 70, "Average score should use accepted Case scores");
    assert.equal(summary.prioritization.maximumScore, 80, "Maximum score should be deterministic");
    assert.equal(summary.prioritization.highPriorityCaseCount, 1, "High priority count should use existing priority");
    assert.equal(summary.addressability.grossValue, 200, "Gross should remain the accepted Case total");
    assert.equal(summary.addressability.overlapValue, 50, "Overlap should remain the accepted Case total");
    assert.equal(summary.addressability.addressabilityRatio, 0.75, "Addressability should be Net divided by positive Gross");
    assert.equal(model.summarize([]).addressability.addressabilityRatio, null, "Zero Gross should remain unavailable");
  });

  test("EX-UX-01.2 presentation filters use Search, Plant, Program, Owner and Priority only", async assert => {
    const app = await helpers.loadApp();
    const model = app.ObsoliQ.excess.decisionWorkspaceModel;
    const cases = sampleCases();
    const owner = model.ownerOptions(cases)[0];

    assert.equal(model.filterCases(cases, { search: "000123" }).length, 1, "Search should match leading-zero material IDs");
    assert.equal(model.filterCases(cases, { profitCenter: "DE02" }).length, 1, "Plant should filter Cases");
    assert.equal(model.filterCases(cases, { program: "A" }).length, 1, "Program should filter Cases");
    assert.equal(model.filterCases(cases, { owner: owner.value }).length, 1, "Owner token should filter exact owner context");
    assert.equal(model.filterCases(cases, { priority: "High" }).length, 1, "Priority should use existing Case priority");
    assert.equal(model.filterCases(cases, { category: "not-excess" }).length, 2, "Generic Category must not enter the Excess presentation contract");
  });

  test("EX-UX-01.2 historical projection accepts only exact current row-key evidence", async assert => {
    const app = await helpers.loadApp();
    const model = app.ObsoliQ.excess.decisionWorkspaceModel;
    const item = sampleCases()[0];
    const exactMetric = {
      history_metric_status: "limited",
      last_consumption_date: "2026-03-01",
      net_consumption_quantity_12m: 12,
      history_metric_limitation_codes: ["partial_history"]
    };
    const exact = model.projectDecisionCore(item, {
      historicalResult: { historicalMetricsByInventoryRowKey: { "INV-1": exactMetric } }
    });
    const ambiguousMaterialOnly = model.projectDecisionCore(item, {
      historicalResult: { historicalMetricsByInventoryRowKey: { "OTHER-ROW": exactMetric } }
    });

    assert.equal(exact.historicalEvidence.status, "limited", "Exact current row-key evidence should remain visible");
    assert.equal(exact.historicalEvidence.metric.last_consumption_date, "2026-03-01", "Accepted scalar metric should pass through unchanged");
    assert.equal(ambiguousMaterialOnly.historicalEvidence.status, "unavailable", "Material-only guesses must remain unavailable");
    assert.equal(ambiguousMaterialOnly.historicalEvidence.metric, null, "Missing exact evidence must not emit fake zeros");
    assert.equal(exact.nextStep, item.next_step, "Decision Core must pass through the accepted next step verbatim");
  });
})();
