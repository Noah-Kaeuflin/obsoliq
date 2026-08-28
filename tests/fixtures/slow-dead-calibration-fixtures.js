(function registerSlowDeadCalibrationFixtures(global) {
  "use strict";

  const SCHEMA_VERSION = "slow-dead-calibration-case-v1";
  const POLICY_VERSION = "slow-dead-condition-policy-v1";
  const REFERENCE_DATE = "2026-08-25";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(key => deepFreeze(value[key]));
    return Object.freeze(value);
  }

  function buildInput(sequence, overrides = {}) {
    const suffix = String(sequence).padStart(4, "0");
    const materialId = `SDCAL${suffix}`;
    const entityKey = `material:${materialId}|plant:DE01`;
    const signature = `sd-cal-history-${suffix}`;
    const baseRuntime = {
      status: "available",
      completedInputSignature: signature,
      result: { historicalMetricsInputSignature: signature }
    };
    const runtimeOverrides = overrides.historicalRuntime || {};
    const historicalRuntime = {
      ...baseRuntime,
      ...runtimeOverrides,
      result: Object.prototype.hasOwnProperty.call(runtimeOverrides, "result")
        ? runtimeOverrides.result
        : { ...baseRuntime.result, ...(runtimeOverrides.result || {}) }
    };
    return {
      inventoryEvidence: {
        inventory_entity_key: entityKey,
        material_id: materialId,
        plant: "DE01",
        stock_quantity: 100,
        stock_unit: "EA",
        stock_value: 10000,
        currency: "EUR",
        no_need_value: 0,
        no_plan_value: 0,
        strategic_reserve: false,
        ...overrides.inventoryEvidence
      },
      historicalEvidence: {
        inventoryEntityKey: entityKey,
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
        inventoryEntityKey: entityKey,
        historyEntityKey: entityKey,
        ...overrides.relationshipEvidence
      },
      materialMasterContext: {
        ...overrides.materialMasterContext
      },
      independentSignals: {
        ...overrides.independentSignals
      },
      historicalRuntime
    };
  }

  function protectionFlags(overrides = {}) {
    return {
      strategic_reserve: false,
      intermittent_demand: false,
      independent_dead_signal: false,
      ambiguous_relationship: false,
      unit_conflict: false,
      project_or_one_time_demand: false,
      ...overrides
    };
  }

  function expected(condition, evidenceStrength, confidence, required = [], forbidden = [], actionBoundaries = {}) {
    return {
      condition,
      evidence_strength: evidenceStrength,
      confidence,
      required_reason_codes: required,
      forbidden_reason_codes: forbidden,
      action_boundaries: actionBoundaries
    };
  }

  function fixture(sequence, config) {
    const suffix = String(sequence).padStart(4, "0");
    const inputSnapshot = buildInput(sequence, config.input || {});
    return deepFreeze({
      calibration_schema_version: SCHEMA_VERSION,
      calibration_case_id: `SD-CAL-SYN-${suffix}`,
      title: config.title,
      source_type: "synthetic_acceptance_fixture",
      inventory_entity_key: inputSnapshot.inventoryEvidence.inventory_entity_key,
      policy_version: POLICY_VERSION,
      reference_date: REFERENCE_DATE,
      input_snapshot: inputSnapshot,
      expected: config.expected,
      protection_flags: protectionFlags(config.protection),
      label_provenance: {
        type: "synthetic_acceptance_fixture",
        basis: "published_policy_contract",
        human_expert_validated: false
      },
      rationale_codes: config.rationale,
      safety_invariant_ids: config.invariants || [],
      ...(config.boundary ? { boundary_context: config.boundary } : {})
    });
  }

  const fixtures = [
    fixture(1, {
      title: "Canonical insufficient evidence",
      input: { historicalRuntime: { status: "unavailable", result: null } },
      expected: expected("insufficient_evidence", "insufficient", "unavailable", ["critical_history_gate_failed"], ["dead_stock_evidence", "non_moving_evidence", "slow_moving_evidence"]),
      rationale: ["insufficient_history", "definitive_classification_prohibited"],
      invariants: ["SD-SAFETY-05"]
    }),
    fixture(2, {
      title: "Canonical recurring intermittent demand",
      input: { historicalEvidence: { months_since_last_consumption: 2, net_consumption_quantity_3m: 10, net_consumption_quantity_6m: 15, net_consumption_quantity_12m: 24, active_consumption_months_12m: 2, movement_frequency_12m: 2, intermittency_ratio_12m: 0.83, inventory_coverage_months: 45 } },
      expected: expected("intermittent_expected", "high", "high", ["intermittent_recurring_consumption"], ["dead_stock_evidence"], { monitoring_eligible: true }),
      protection: { intermittent_demand: true },
      rationale: ["recurring_intermittent_demand", "dead_classification_prohibited"],
      invariants: ["SD-SAFETY-03"]
    }),
    fixture(3, {
      title: "Canonical Slow-Moving Candidate",
      input: { historicalEvidence: { months_since_last_consumption: 7, net_consumption_quantity_3m: 1, net_consumption_quantity_6m: 4, net_consumption_quantity_12m: 30, active_consumption_months_12m: 3, movement_frequency_12m: 3, intermittency_ratio_12m: 0.5, consumption_trend: "declining", consumption_trend_ratio: -0.4, inventory_coverage_months: 18 } },
      expected: expected("slow_moving_candidate", "high", "high", ["slow_moving_evidence"], ["non_moving_evidence", "dead_stock_evidence"], { disposal_not_recommendable: true }),
      rationale: ["published_condition_contract"]
    }),
    fixture(4, {
      title: "Canonical Non-Moving Candidate",
      input: { historicalEvidence: { months_since_last_consumption: 13, net_consumption_quantity_3m: 0, net_consumption_quantity_6m: 0, net_consumption_quantity_12m: 8, active_consumption_months_12m: 1, movement_frequency_12m: 1, intermittency_ratio_12m: 0.92, inventory_coverage_months: 80 } },
      expected: expected("non_moving_candidate", "high", "high", ["non_moving_evidence"], ["dead_stock_evidence"], { disposal_not_recommendable: true }),
      rationale: ["published_condition_contract"]
    }),
    fixture(5, {
      title: "Canonical Dead Stock Candidate",
      input: { independentSignals: { noDemand: true }, historicalEvidence: { months_since_last_consumption: 20, net_consumption_quantity_3m: 0, net_consumption_quantity_6m: 0, net_consumption_quantity_12m: 0, active_consumption_months_12m: 0, movement_frequency_12m: 0, intermittency_ratio_12m: 1, history_completeness: 0.95, inventory_coverage_months: null } },
      expected: expected("dead_stock_candidate", "high", "high", ["independent_dead_stock_signal", "dead_stock_evidence"], ["dead_age_without_independent_signal"], { disposal_not_recommendable: false }),
      protection: { independent_dead_signal: true },
      rationale: ["independent_dead_signal_present", "published_condition_contract"],
      invariants: ["SD-SAFETY-04"]
    }),
    fixture(6, {
      title: "Canonical explicit Strategic Reserve",
      input: { inventoryEvidence: { strategic_reserve: true }, historicalEvidence: { months_since_last_consumption: 24, net_consumption_quantity_3m: 0, net_consumption_quantity_6m: 0, net_consumption_quantity_12m: 0, active_consumption_months_12m: 0, movement_frequency_12m: 0, intermittency_ratio_12m: 1, inventory_coverage_months: null } },
      expected: expected("strategic_reserve", "high", "high", ["explicit_strategic_reserve"], ["dead_stock_evidence", "non_moving_evidence"], { disposal_not_recommendable: true, monitoring_eligible: true }),
      protection: { strategic_reserve: true },
      rationale: ["explicit_strategic_reserve", "dead_classification_prohibited"],
      invariants: ["SD-SAFETY-01", "SD-SAFETY-02"]
    }),
    fixture(7, {
      title: "Five months is below the Slow-Moving age boundary",
      input: { historicalEvidence: { months_since_last_consumption: 5, inventory_coverage_months: 11 } },
      expected: expected("no_case", "not_applicable", "not_applicable", ["slow_dead_thresholds_not_met"], ["slow_moving_evidence", "non_moving_evidence", "dead_stock_evidence"]),
      rationale: ["threshold_boundary"],
      boundary: { threshold_months: 6, position: "below" },
      invariants: ["SD-SAFETY-10"]
    }),
    fixture(8, {
      title: "Six months is the inclusive Slow-Moving age boundary",
      input: { historicalEvidence: { months_since_last_consumption: 6, inventory_coverage_months: 12, active_consumption_months_12m: 6, movement_frequency_12m: 6 } },
      expected: expected("slow_moving_candidate", "high", "high", ["slow_moving_evidence"], ["non_moving_evidence", "dead_stock_evidence"], { disposal_not_recommendable: true }),
      rationale: ["threshold_boundary"],
      boundary: { threshold_months: 6, position: "at" },
      invariants: ["SD-SAFETY-10"]
    }),
    fixture(9, {
      title: "Seven months is above the Slow-Moving age boundary",
      input: { historicalEvidence: { months_since_last_consumption: 7, inventory_coverage_months: 13, active_consumption_months_12m: 6, movement_frequency_12m: 6 } },
      expected: expected("slow_moving_candidate", "high", "high", ["slow_moving_evidence"], ["non_moving_evidence", "dead_stock_evidence"], { disposal_not_recommendable: true }),
      rationale: ["threshold_boundary"],
      boundary: { threshold_months: 6, position: "above" },
      invariants: ["SD-SAFETY-10"]
    }),
    fixture(10, {
      title: "Eleven months is below the Non-Moving age boundary",
      input: { historicalEvidence: { months_since_last_consumption: 11, net_consumption_quantity_3m: 1, net_consumption_quantity_6m: 4, net_consumption_quantity_12m: 20, active_consumption_months_12m: 4, movement_frequency_12m: 3, intermittency_ratio_12m: 0.5, inventory_coverage_months: 24 } },
      expected: expected("slow_moving_candidate", "high", "high", ["slow_moving_evidence"], ["non_moving_evidence", "dead_stock_evidence"], { disposal_not_recommendable: true }),
      rationale: ["threshold_boundary"],
      boundary: { threshold_months: 12, position: "below" },
      invariants: ["SD-SAFETY-10"]
    }),
    fixture(11, {
      title: "Twelve months is the inclusive Non-Moving age boundary",
      input: { historicalEvidence: { months_since_last_consumption: 12, net_consumption_quantity_3m: 0, net_consumption_quantity_6m: 0, net_consumption_quantity_12m: 8, active_consumption_months_12m: 1, movement_frequency_12m: 1, intermittency_ratio_12m: 0.92, inventory_coverage_months: 80 } },
      expected: expected("non_moving_candidate", "high", "high", ["non_moving_evidence"], ["dead_stock_evidence"], { disposal_not_recommendable: true }),
      rationale: ["threshold_boundary"],
      boundary: { threshold_months: 12, position: "at" },
      invariants: ["SD-SAFETY-10"]
    }),
    fixture(12, {
      title: "Thirteen months is above the Non-Moving age boundary",
      input: { historicalEvidence: { months_since_last_consumption: 13, net_consumption_quantity_3m: 0, net_consumption_quantity_6m: 0, net_consumption_quantity_12m: 8, active_consumption_months_12m: 1, movement_frequency_12m: 1, intermittency_ratio_12m: 0.92, inventory_coverage_months: 80 } },
      expected: expected("non_moving_candidate", "high", "high", ["non_moving_evidence"], ["dead_stock_evidence"], { disposal_not_recommendable: true }),
      rationale: ["threshold_boundary"],
      boundary: { threshold_months: 12, position: "above" },
      invariants: ["SD-SAFETY-10"]
    }),
    fixture(13, {
      title: "Seventeen months is below the Dead Candidate age boundary",
      input: { independentSignals: { noDemand: true }, historicalEvidence: { months_since_last_consumption: 17, net_consumption_quantity_3m: 0, net_consumption_quantity_6m: 0, net_consumption_quantity_12m: 0, active_consumption_months_12m: 0, movement_frequency_12m: 0, intermittency_ratio_12m: 1, inventory_coverage_months: null } },
      expected: expected("non_moving_candidate", "high", "high", ["independent_dead_stock_signal", "non_moving_evidence"], ["dead_stock_evidence"], { disposal_not_recommendable: true }),
      protection: { independent_dead_signal: true },
      rationale: ["threshold_boundary", "independent_dead_signal_present"],
      boundary: { threshold_months: 18, position: "below" },
      invariants: ["SD-SAFETY-10"]
    }),
    fixture(14, {
      title: "Eighteen months is the inclusive Dead Candidate age boundary",
      input: { independentSignals: { noDemand: true }, historicalEvidence: { months_since_last_consumption: 18, net_consumption_quantity_3m: 0, net_consumption_quantity_6m: 0, net_consumption_quantity_12m: 0, active_consumption_months_12m: 0, movement_frequency_12m: 0, intermittency_ratio_12m: 1, inventory_coverage_months: null } },
      expected: expected("dead_stock_candidate", "high", "high", ["independent_dead_stock_signal", "dead_stock_evidence"], ["dead_age_without_independent_signal"], { disposal_not_recommendable: false }),
      protection: { independent_dead_signal: true },
      rationale: ["threshold_boundary", "independent_dead_signal_present"],
      boundary: { threshold_months: 18, position: "at" },
      invariants: ["SD-SAFETY-04", "SD-SAFETY-10"]
    }),
    fixture(15, {
      title: "Nineteen months is above the Dead Candidate age boundary",
      input: { independentSignals: { noPlan: true }, historicalEvidence: { months_since_last_consumption: 19, net_consumption_quantity_3m: 0, net_consumption_quantity_6m: 0, net_consumption_quantity_12m: 0, active_consumption_months_12m: 0, movement_frequency_12m: 0, intermittency_ratio_12m: 1, inventory_coverage_months: null } },
      expected: expected("dead_stock_candidate", "high", "high", ["independent_dead_stock_signal", "dead_stock_evidence"], ["dead_age_without_independent_signal"], { disposal_not_recommendable: false }),
      protection: { independent_dead_signal: true },
      rationale: ["threshold_boundary", "independent_dead_signal_present"],
      boundary: { threshold_months: 18, position: "above" },
      invariants: ["SD-SAFETY-04", "SD-SAFETY-10"]
    }),
    fixture(16, {
      title: "Old stock without reserve or independent Dead signal",
      input: { historicalEvidence: { months_since_last_consumption: 30, net_consumption_quantity_3m: 0, net_consumption_quantity_6m: 0, net_consumption_quantity_12m: 0, active_consumption_months_12m: 0, movement_frequency_12m: 0, intermittency_ratio_12m: 1, inventory_coverage_months: null } },
      expected: expected("non_moving_candidate", "high", "high", ["dead_age_without_independent_signal", "non_moving_evidence"], ["explicit_strategic_reserve", "dead_stock_evidence"], { disposal_not_recommendable: true }),
      rationale: ["independent_dead_signal_missing", "dead_classification_prohibited"],
      invariants: ["SD-SAFETY-01", "SD-SAFETY-04"]
    }),
    fixture(17, {
      title: "Intermittent thresholds are inclusive",
      input: { historicalEvidence: { months_since_last_consumption: 6, net_consumption_quantity_3m: 4, net_consumption_quantity_6m: 8, net_consumption_quantity_12m: 20, active_consumption_months_12m: 2, movement_frequency_12m: 2, intermittency_ratio_12m: 0.75, inventory_coverage_months: 36 } },
      expected: expected("intermittent_expected", "high", "high", ["intermittent_recurring_consumption"], ["dead_stock_evidence", "slow_moving_evidence"], { monitoring_eligible: true }),
      protection: { intermittent_demand: true },
      rationale: ["recurring_intermittent_demand", "threshold_boundary", "dead_classification_prohibited"],
      invariants: ["SD-SAFETY-03", "SD-SAFETY-10"]
    }),
    fixture(18, {
      title: "Dead age without independent signal remains Non-Moving",
      input: { historicalEvidence: { months_since_last_consumption: 18, net_consumption_quantity_3m: 0, net_consumption_quantity_6m: 0, net_consumption_quantity_12m: 0, active_consumption_months_12m: 0, movement_frequency_12m: 0, intermittency_ratio_12m: 1, inventory_coverage_months: null } },
      expected: expected("non_moving_candidate", "high", "high", ["dead_age_without_independent_signal", "non_moving_evidence"], ["dead_stock_evidence"], { disposal_not_recommendable: true }),
      rationale: ["independent_dead_signal_missing", "dead_classification_prohibited"],
      invariants: ["SD-SAFETY-04"]
    }),
    fixture(19, {
      title: "Lifecycle ending supplies the independent Dead signal",
      input: { independentSignals: { lifecycleEnding: true }, historicalEvidence: { months_since_last_consumption: 22, net_consumption_quantity_3m: 0, net_consumption_quantity_6m: 0, net_consumption_quantity_12m: 0, active_consumption_months_12m: 0, movement_frequency_12m: 0, intermittency_ratio_12m: 1, inventory_coverage_months: null } },
      expected: expected("dead_stock_candidate", "high", "high", ["independent_dead_stock_signal", "dead_stock_evidence"], ["dead_age_without_independent_signal"], { disposal_not_recommendable: false }),
      protection: { independent_dead_signal: true },
      rationale: ["independent_dead_signal_present"],
      invariants: ["SD-SAFETY-04"]
    }),
    fixture(20, {
      title: "History coverage below twelve months is insufficient",
      input: { historicalEvidence: { history_coverage_months: 11 } },
      expected: expected("insufficient_evidence", "insufficient", "unavailable", ["critical_history_gate_failed"], ["slow_moving_evidence", "non_moving_evidence", "dead_stock_evidence"]),
      rationale: ["insufficient_history", "definitive_classification_prohibited"],
      invariants: ["SD-SAFETY-05"]
    }),
    fixture(21, {
      title: "History completeness below 0.80 is insufficient",
      input: { historicalEvidence: { history_completeness: 0.79 } },
      expected: expected("insufficient_evidence", "insufficient", "unavailable", ["critical_history_gate_failed"], ["slow_moving_evidence", "non_moving_evidence", "dead_stock_evidence"]),
      rationale: ["low_history_completeness", "definitive_classification_prohibited"],
      invariants: ["SD-SAFETY-06"]
    }),
    fixture(22, {
      title: "Ambiguous Material-Plant relationship is non-definitive",
      input: { relationshipEvidence: { relationshipState: "ambiguous", matchType: "ambiguous" } },
      expected: expected("insufficient_evidence", "insufficient", "unavailable", ["critical_history_gate_failed"], ["slow_moving_evidence", "non_moving_evidence", "dead_stock_evidence"]),
      protection: { ambiguous_relationship: true },
      rationale: ["ambiguous_relationship", "definitive_classification_prohibited"],
      invariants: ["SD-SAFETY-07"]
    }),
    fixture(23, {
      title: "Unit conflict is non-definitive",
      input: { historicalEvidence: { history_metric_limitation_codes: ["unit_conflict"] } },
      expected: expected("insufficient_evidence", "insufficient", "unavailable", ["critical_history_gate_failed"], ["slow_moving_evidence", "non_moving_evidence", "dead_stock_evidence"]),
      protection: { unit_conflict: true },
      rationale: ["unit_conflict", "definitive_classification_prohibited"],
      invariants: ["SD-SAFETY-08"]
    }),
    fixture(24, {
      title: "Project or one-time demand is not automatically Dead Stock",
      input: { materialMasterContext: { demand_pattern: "project_or_one_time", project_reference: "PRJ-2026-01" }, historicalEvidence: { months_since_last_consumption: 24, net_consumption_quantity_3m: 0, net_consumption_quantity_6m: 0, net_consumption_quantity_12m: 0, active_consumption_months_12m: 0, movement_frequency_12m: 0, intermittency_ratio_12m: 1, inventory_coverage_months: null } },
      expected: expected("non_moving_candidate", "high", "high", ["dead_age_without_independent_signal", "non_moving_evidence"], ["dead_stock_evidence"], { disposal_not_recommendable: true }),
      protection: { project_or_one_time_demand: true },
      rationale: ["project_or_one_time_demand", "dead_classification_prohibited"],
      invariants: ["SD-SAFETY-09"]
    }),
    fixture(25, {
      title: "Missing twelve-month consumption remains missing evidence",
      input: { historicalEvidence: { net_consumption_quantity_12m: undefined, months_since_last_consumption: 18 } },
      expected: expected("insufficient_evidence", "insufficient", "unavailable", ["critical_history_gate_failed"], ["dead_stock_evidence", "non_moving_evidence"]),
      rationale: ["missing_evidence", "definitive_classification_prohibited"],
      invariants: ["SD-SAFETY-11"]
    }),
    fixture(26, {
      title: "Numeric zero is valid Dead evidence when the independent signal exists",
      input: { independentSignals: { noDemand: true }, historicalEvidence: { months_since_last_consumption: 18, net_consumption_quantity_3m: 0, net_consumption_quantity_6m: 0, net_consumption_quantity_12m: 0, active_consumption_months_12m: 0, movement_frequency_12m: 0, intermittency_ratio_12m: 1, inventory_coverage_months: null } },
      expected: expected("dead_stock_candidate", "high", "high", ["independent_dead_stock_signal", "dead_stock_evidence"], ["critical_history_gate_failed"], { disposal_not_recommendable: false }),
      protection: { independent_dead_signal: true },
      rationale: ["numeric_zero_evidence", "independent_dead_signal_present"],
      invariants: ["SD-SAFETY-11"]
    }),
    fixture(27, {
      title: "Minimum completeness 0.80 remains usable with medium strength",
      input: { historicalEvidence: { history_completeness: 0.8, months_since_last_consumption: 13, net_consumption_quantity_3m: 0, net_consumption_quantity_6m: 0, net_consumption_quantity_12m: 8, active_consumption_months_12m: 1, movement_frequency_12m: 1, intermittency_ratio_12m: 0.92 } },
      expected: expected("non_moving_candidate", "medium", "medium", ["non_moving_evidence"], ["critical_history_gate_failed", "dead_stock_evidence"], { disposal_not_recommendable: true }),
      rationale: ["threshold_boundary", "published_condition_contract"]
    }),
    fixture(28, {
      title: "Completeness below 0.90 blocks Dead but not Non-Moving",
      input: { independentSignals: { noDemand: true }, historicalEvidence: { history_completeness: 0.89, months_since_last_consumption: 18, net_consumption_quantity_3m: 0, net_consumption_quantity_6m: 0, net_consumption_quantity_12m: 0, active_consumption_months_12m: 0, movement_frequency_12m: 0, intermittency_ratio_12m: 1, inventory_coverage_months: null } },
      expected: expected("non_moving_candidate", "medium", "medium", ["independent_dead_stock_signal", "non_moving_evidence"], ["dead_stock_evidence"], { disposal_not_recommendable: true }),
      protection: { independent_dead_signal: true },
      rationale: ["threshold_boundary", "published_condition_contract"]
    }),
    fixture(29, {
      title: "Strong completeness 0.90 is inclusive for Dead Candidate",
      input: { independentSignals: { noDemand: true }, historicalEvidence: { history_completeness: 0.9, months_since_last_consumption: 18, net_consumption_quantity_3m: 0, net_consumption_quantity_6m: 0, net_consumption_quantity_12m: 0, active_consumption_months_12m: 0, movement_frequency_12m: 0, intermittency_ratio_12m: 1, inventory_coverage_months: null } },
      expected: expected("dead_stock_candidate", "high", "high", ["independent_dead_stock_signal", "dead_stock_evidence"], ["dead_age_without_independent_signal"], { disposal_not_recommendable: false }),
      protection: { independent_dead_signal: true },
      rationale: ["threshold_boundary", "independent_dead_signal_present"]
    }),
    fixture(30, {
      title: "Material fallback remains usable with medium relationship strength",
      input: { relationshipEvidence: { relationshipState: "material_fallback", matchType: "material_fallback" }, historicalEvidence: { months_since_last_consumption: 7, inventory_coverage_months: 18, active_consumption_months_12m: 5, movement_frequency_12m: 5 } },
      expected: expected("slow_moving_candidate", "medium", "medium", ["slow_moving_evidence"], ["critical_history_gate_failed", "dead_stock_evidence"], { disposal_not_recommendable: true }),
      rationale: ["material_fallback_relationship", "published_condition_contract"],
      invariants: ["SD-SAFETY-12"]
    })
  ];

  global.ObsoliQSlowDeadCalibrationFixtures = deepFreeze({
    version: "1",
    calibration_schema_version: SCHEMA_VERSION,
    policy_version: POLICY_VERSION,
    reference_date: REFERENCE_DATE,
    fixtures
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
