(function registerExcessPilotFixtures(global) {
  function row(id, overrides = {}) {
    return {
      fixtureId: id,
      inventory_row_key: `INV-${id}`,
      case_id: `EXCESS::PILOT-DS::INV-${id}`,
      material_id: `MAT-${id}`,
      material_description: overrides.material_description || `Pilot material ${id}`,
      plant: overrides.plant || "DE01",
      profit_center: overrides.profit_center || "PC-PILOT",
      primary_category: "excess",
      category: "excess",
      gross_excess_value: overrides.gross_excess_value ?? 100000,
      net_addressable_excess_value: overrides.net_addressable_excess_value ?? 90000,
      excess_overlap_value: overrides.excess_overlap_value ?? 10000,
      excess_remaining_inventory_value: overrides.excess_remaining_inventory_value ?? 0,
      recovery_potential: overrides.recovery_potential ?? (overrides.net_addressable_excess_value ?? 90000),
      stock_value: overrides.stock_value ?? 160000,
      priority: overrides.priority || "High",
      confidence: overrides.confidence || "High",
      status: "Open",
      owner_function: overrides.owner_function ?? "Material Planning",
      owner_reference: overrides.owner_reference ?? "MRP-PILOT",
      owner_source: overrides.owner_source || "material_master",
      owner_assignment_confidence: overrides.owner_assignment_confidence || "High",
      relationship_status: overrides.relationship_status ?? "matched",
      relationship_match_type: overrides.relationship_match_type ?? "exact_material_plant",
      material_master_package_id: overrides.material_master_package_id ?? "MM-PILOT",
      material_master_package_revision: overrides.material_master_package_revision ?? 1,
      inventory_package_id: "INV-PILOT",
      inventory_package_revision: 1,
      source_row_number: overrides.source_row_number || 1,
      limitations: overrides.limitations || [],
      source_row: overrides.source_row || {}
    };
  }

  const cases = [
    {
      fixtureId: "A",
      description: "High financial impact, exact match, clear owner, strong evidence",
      inventoryInput: row("A", { gross_excess_value: 400000, net_addressable_excess_value: 320000, excess_overlap_value: 80000 }),
      materialMasterInput: { material_id: "MAT-A", plant: "DE01", mrp_controller: "MRP-PILOT" },
      expectedFacts: ["net_addressable_excess_value", "owner_reference", "exact_material_plant"],
      expectedLimitations: [],
      expectedScoreConstraints: [
        { type: "score_gte", value: 90 },
        { type: "component_gte", component: "financial_impact", value: 30 },
        { type: "component_gte", component: "actionability", value: 18 },
        { type: "component_gte", component: "evidence", value: 12 }
      ],
      expectedScenarioAvailability: { excess_reduction_percent: "available" },
      expectedOwnerContext: { owner_reference: "MRP-PILOT", owner_assignment_confidence: "High" },
      expectedRelationshipState: { matchType: "exact_material_plant" }
    },
    {
      fixtureId: "B",
      description: "High gross but low net due Waterfall overlap",
      inventoryInput: row("B", { gross_excess_value: 900000, net_addressable_excess_value: 20000, excess_overlap_value: 880000, priority: "Medium" }),
      materialMasterInput: { material_id: "MAT-B", plant: "DE01", mrp_controller: "MRP-PILOT" },
      expectedFacts: ["gross_excess_value", "net_addressable_excess_value", "excess_overlap_value"],
      expectedLimitations: ["gross_to_net_overlap"],
      expectedScoreConstraints: [
        { type: "score_lt_reference", fixtureId: "A" },
        { type: "net_lt_gross" },
        { type: "component_lt_reference", component: "financial_impact", fixtureId: "A" }
      ],
      expectedScenarioAvailability: { excess_reduction_percent: "available" },
      expectedOwnerContext: { owner_reference: "MRP-PILOT" },
      expectedRelationshipState: { matchType: "exact_material_plant" }
    },
    {
      fixtureId: "C",
      description: "High net excess but no Owner Reference",
      inventoryInput: row("C", { net_addressable_excess_value: 280000, gross_excess_value: 300000, owner_reference: "", owner_source: "none", owner_assignment_confidence: "Low", limitations: ["owner_reference_missing"] }),
      materialMasterInput: { material_id: "MAT-C", plant: "DE01" },
      expectedFacts: ["net_addressable_excess_value"],
      expectedLimitations: ["owner_reference_missing"],
      expectedScoreConstraints: [
        { type: "score_lt_reference", fixtureId: "A" },
        { type: "component_lt_reference", component: "actionability", fixtureId: "A" }
      ],
      expectedScenarioAvailability: {},
      expectedOwnerContext: { owner_reference: "", owner_assignment_confidence: "Low" },
      expectedRelationshipState: { matchType: "exact_material_plant" }
    },
    {
      fixtureId: "D",
      description: "High net excess with ambiguous Material Master relationship",
      inventoryInput: row("D", { gross_excess_value: 300000, net_addressable_excess_value: 270000, excess_overlap_value: 30000, relationship_status: "not_matched", relationship_match_type: "", material_master_package_id: "", owner_reference: "", owner_source: "none", owner_assignment_confidence: "Low", confidence: "Medium", limitations: ["relationship_not_exact_material_plant", "owner_reference_missing"] }),
      materialMasterInput: [{ material_id: "MAT-D", plant: "DE01" }, { material_id: "MAT-D", plant: "DE02" }],
      expectedFacts: ["net_addressable_excess_value"],
      expectedLimitations: ["relationship_not_exact_material_plant", "owner_reference_missing"],
      expectedScoreConstraints: [
        { type: "score_lt_reference", fixtureId: "A" },
        { type: "component_lte", component: "evidence", value: 3 },
        { type: "component_lte", component: "data_confidence", value: 6 }
      ],
      expectedScenarioAvailability: {},
      expectedOwnerContext: { owner_reference: "", owner_assignment_confidence: "Low" },
      expectedRelationshipState: { status: "ambiguous" }
    },
    {
      fixtureId: "E",
      description: "Unique Material fallback instead of Material + Plant exact match",
      inventoryInput: row("E", { gross_excess_value: 160000, net_addressable_excess_value: 140000, excess_overlap_value: 20000, relationship_match_type: "material_unique_fallback", owner_assignment_confidence: "Medium", limitations: ["relationship_not_exact_material_plant"] }),
      materialMasterInput: { material_id: "MAT-E", mrp_controller: "MRP-FB" },
      expectedFacts: ["material_unique_fallback"],
      expectedLimitations: ["relationship_not_exact_material_plant"],
      expectedScoreConstraints: [
        { type: "component_lt_reference", component: "evidence", fixtureId: "A" }
      ],
      expectedScenarioAvailability: {},
      expectedOwnerContext: { owner_assignment_confidence: "Medium" },
      expectedRelationshipState: { matchType: "material_unique_fallback" }
    },
    {
      fixtureId: "F",
      description: "Material Master conflict",
      inventoryInput: row("F", { gross_excess_value: 220000, net_addressable_excess_value: 180000, excess_overlap_value: 40000, limitations: ["enrichment_conflict"] }),
      materialMasterInput: { material_id: "MAT-F", plant: "DE01", material_description: "Conflicting master value" },
      expectedFacts: ["inventory_value_preserved"],
      expectedLimitations: ["enrichment_conflict"],
      expectedScoreConstraints: [
        { type: "score_lt_reference", fixtureId: "A" }
      ],
      expectedScenarioAvailability: {},
      expectedOwnerContext: { owner_reference: "MRP-PILOT" },
      expectedRelationshipState: { conflict: true }
    },
    {
      fixtureId: "G",
      description: "Missing Safety Stock target",
      inventoryInput: row("G", { net_addressable_excess_value: 90000, source_row: {} }),
      materialMasterInput: { material_id: "MAT-G", plant: "DE01" },
      expectedFacts: ["net_addressable_excess_value"],
      expectedLimitations: ["safety_stock"],
      expectedScoreConstraints: [],
      expectedScenarioAvailability: { safety_stock_adjustment: "unavailable" },
      expectedOwnerContext: {},
      expectedRelationshipState: { matchType: "exact_material_plant" }
    },
    {
      fixtureId: "H",
      description: "MOQ available but demand evidence absent",
      inventoryInput: row("H", { net_addressable_excess_value: 85000, source_row: { minimum_order_quantity: 250 } }),
      materialMasterInput: { material_id: "MAT-H", plant: "DE01", minimum_order_quantity: 250 },
      expectedFacts: ["minimum_order_quantity"],
      expectedLimitations: ["consumption_history", "demand_forecast"],
      expectedScoreConstraints: [],
      expectedScenarioAvailability: { demand_validation: "unavailable", safety_stock_adjustment: "limited" },
      expectedOwnerContext: {},
      expectedRelationshipState: { matchType: "exact_material_plant" }
    },
    {
      fixtureId: "I",
      description: "Missing MRP Controller / Planner",
      inventoryInput: row("I", { gross_excess_value: 140000, net_addressable_excess_value: 120000, excess_overlap_value: 20000, owner_reference: "", owner_source: "none", owner_assignment_confidence: "Low", limitations: ["owner_reference_missing"] }),
      materialMasterInput: { material_id: "MAT-I", plant: "DE01" },
      expectedFacts: ["owner_function_rule_derived"],
      expectedLimitations: ["owner_reference_missing"],
      expectedScoreConstraints: [
        { type: "component_lt_reference", component: "actionability", fixtureId: "A" }
      ],
      expectedScenarioAvailability: {},
      expectedOwnerContext: { owner_reference: "", owner_assignment_confidence: "Low" },
      expectedRelationshipState: { matchType: "exact_material_plant" }
    },
    {
      fixtureId: "J",
      description: "Critical or High open Data Quality issue",
      inventoryInput: row("J", { gross_excess_value: 300000, net_addressable_excess_value: 260000, excess_overlap_value: 40000, confidence: "Low", owner_reference: "", owner_source: "none", owner_assignment_confidence: "Low", relationship_status: "not_matched", relationship_match_type: "", material_master_package_id: "", limitations: ["material_master_match_missing", "critical_data_quality_issue"] }),
      materialMasterInput: {},
      expectedFacts: ["critical_data_quality_issue"],
      expectedLimitations: ["material_master_match_missing", "critical_data_quality_issue"],
      expectedScoreConstraints: [
        { type: "score_lt_reference", fixtureId: "A" },
        { type: "component_lte", component: "data_confidence", value: 2 }
      ],
      expectedScenarioAvailability: {},
      expectedOwnerContext: { owner_assignment_confidence: "Low" },
      expectedRelationshipState: { status: "critical" }
    },
    {
      fixtureId: "K",
      description: "Several plausible Actions but insufficient evidence",
      inventoryInput: row("K", { net_addressable_excess_value: 70000, confidence: "Low", owner_reference: "", owner_source: "none", relationship_status: "not_matched", relationship_match_type: "", material_master_package_id: "", limitations: ["material_master_match_missing", "owner_reference_missing", "insufficient_decision_evidence"] }),
      materialMasterInput: {},
      expectedFacts: ["rule_based_recommendation_only"],
      expectedLimitations: ["insufficient_decision_evidence"],
      expectedScoreConstraints: [
        { type: "component_lte", component: "evidence", value: 3 }
      ],
      expectedScenarioAvailability: {},
      expectedOwnerContext: { owner_reference: "" },
      expectedRelationshipState: { status: "missing" }
    },
    {
      fixtureId: "L",
      description: "No valid Material Master Package",
      inventoryInput: row("L", { gross_excess_value: 130000, net_addressable_excess_value: 110000, excess_overlap_value: 20000, relationship_status: "not_matched", relationship_match_type: "", material_master_package_id: "", owner_reference: "", owner_source: "none", owner_assignment_confidence: "Low", limitations: ["material_master_match_missing"] }),
      materialMasterInput: null,
      expectedFacts: ["excess_analysis_without_material_master"],
      expectedLimitations: ["material_master_match_missing"],
      expectedScoreConstraints: [
        { type: "component_lte", component: "evidence", value: 3 }
      ],
      expectedScenarioAvailability: {},
      expectedOwnerContext: { owner_reference: "", owner_assignment_confidence: "Low" },
      expectedRelationshipState: { status: "no_valid_package" }
    }
  ];

  global.ObsoliQExcessPilotFixtures = Object.freeze({
    cases,
    scoredCaseInputs: cases.map(item => ({ ...item.inventoryInput, fixtureId: item.fixtureId })),
    expectations: cases.map(item => ({
      fixtureId: item.fixtureId,
      expectedScoreConstraints: item.expectedScoreConstraints
    }))
  });
})(window);
