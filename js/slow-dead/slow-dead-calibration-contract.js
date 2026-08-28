(function registerSlowDeadCalibrationContract(global) {
  "use strict";

  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.slowDead = root.slowDead || {};

  const conditionEngine = root.slowDead.conditionEngine;
  const numericUtils = root.core?.valueUtils;
  if (!conditionEngine?.DEFAULT_SLOW_DEAD_CONDITION_POLICY || !numericUtils?.numericEvidence) {
    throw new Error("Slow / Dead Calibration requires the productive Condition Engine and Numeric Boundary.");
  }

  const CALIBRATION_SCHEMA_VERSION = "slow-dead-calibration-case-v1";
  const CALIBRATION_NUMERIC_CONTRACT_VERSION = "slow-dead-calibration-numeric-boundary-v1";
  const CALIBRATION_RUNNER_VERSION = "slow-dead-calibration-runner-v2";
  const CALIBRATION_REFERENCE_DATE = "2026-08-25";
  const CALIBRATION_POLICY_REFERENCE = conditionEngine.DEFAULT_SLOW_DEAD_CONDITION_POLICY;

  const SOURCE_TYPES = Object.freeze([
    "synthetic_acceptance_fixture",
    "pilot_expert_label"
  ]);

  const EXPECTED_CONDITIONS = Object.freeze([
    "insufficient_evidence",
    "intermittent_expected",
    "slow_moving_candidate",
    "non_moving_candidate",
    "dead_stock_candidate",
    "strategic_reserve",
    "no_case"
  ]);

  const EVIDENCE_STRENGTHS = Object.freeze([
    "insufficient",
    "not_applicable",
    "high",
    "medium",
    "low"
  ]);

  const CONFIDENCE_LEVELS = Object.freeze([
    "unavailable",
    "not_applicable",
    "high",
    "medium",
    "low"
  ]);

  const CALIBRATION_REASON_CODES = Object.freeze([
    "insufficient_history",
    "low_history_completeness",
    "recurring_intermittent_demand",
    "explicit_strategic_reserve",
    "independent_dead_signal_present",
    "independent_dead_signal_missing",
    "ambiguous_relationship",
    "unit_conflict",
    "project_or_one_time_demand",
    "threshold_boundary",
    "definitive_classification_prohibited",
    "dead_classification_prohibited",
    "published_condition_contract",
    "numeric_zero_evidence",
    "missing_evidence",
    "material_fallback_relationship"
  ]);

  const ENGINE_REASON_CODES = Object.freeze([
    "no_inventory_exposure",
    "inventory_exposure_exists",
    "critical_history_gate_failed",
    "explicit_strategic_reserve",
    "no_explicit_strategic_reserve",
    "independent_dead_stock_signal",
    "no_independent_dead_stock_signal",
    "intermittent_recurring_consumption",
    "dead_stock_evidence",
    "dead_age_without_independent_signal",
    "non_moving_evidence",
    "slow_moving_evidence",
    "slow_dead_thresholds_not_met"
  ]);

  const VALID_EXPECTATION_REASON_CODES = Object.freeze([
    ...ENGINE_REASON_CODES,
    ...CALIBRATION_REASON_CODES
  ]);

  const DISAGREEMENT_CODES = Object.freeze([
    "policy_version_mismatch",
    "unexpected_condition",
    "unexpected_definitive_classification",
    "strategic_reserve_not_protected",
    "intermittent_false_positive",
    "dead_signal_requirement_violated",
    "threshold_boundary_mismatch",
    "evidence_strength_mismatch",
    "confidence_mismatch",
    "required_reason_code_missing",
    "forbidden_reason_code_present",
    "action_boundary_mismatch"
  ]);

  const SAFETY_INVARIANTS = Object.freeze([
    Object.freeze({ id: "SD-SAFETY-01", description: "Strategic Reserve requires an explicit reserve signal." }),
    Object.freeze({ id: "SD-SAFETY-02", description: "Explicit Strategic Reserve is never classified as Dead Stock Candidate." }),
    Object.freeze({ id: "SD-SAFETY-03", description: "Recurring intermittent demand is not classified as Dead Stock Candidate from age or coverage alone." }),
    Object.freeze({ id: "SD-SAFETY-04", description: "Dead Stock Candidate requires an independent demand, planning or lifecycle signal." }),
    Object.freeze({ id: "SD-SAFETY-05", description: "Missing or insufficient History produces the existing non-definitive condition." }),
    Object.freeze({ id: "SD-SAFETY-06", description: "Low History completeness limits the classification." }),
    Object.freeze({ id: "SD-SAFETY-07", description: "Ambiguous relationships cannot produce a definitive Slow / Dead condition." }),
    Object.freeze({ id: "SD-SAFETY-08", description: "Unit conflicts cannot produce a definitive quantity-based condition." }),
    Object.freeze({ id: "SD-SAFETY-09", description: "Project or one-time demand is not automatically treated as normal Dead Stock." }),
    Object.freeze({ id: "SD-SAFETY-10", description: "The 6, 12 and 18 month boundaries are deterministic and inclusive as defined by policy." }),
    Object.freeze({ id: "SD-SAFETY-11", description: "A numeric zero remains distinguishable from missing evidence." }),
    Object.freeze({ id: "SD-SAFETY-12", description: "Repeated evaluation of the same fixture is deterministic." })
  ]);

  const PROTECTION_FLAG_KEYS = Object.freeze([
    "strategic_reserve",
    "intermittent_demand",
    "independent_dead_signal",
    "ambiguous_relationship",
    "unit_conflict",
    "project_or_one_time_demand"
  ]);

  const REQUIRED_INPUT_PATHS = Object.freeze([
    "inventoryEvidence.inventory_entity_key",
    "inventoryEvidence.material_id",
    "inventoryEvidence.plant",
    "inventoryEvidence.stock_quantity",
    "inventoryEvidence.stock_unit",
    "inventoryEvidence.stock_value",
    "inventoryEvidence.currency",
    "historicalEvidence.inventoryEntityKey",
    "historicalEvidence.months_since_last_consumption",
    "historicalEvidence.net_consumption_quantity_3m",
    "historicalEvidence.net_consumption_quantity_6m",
    "historicalEvidence.net_consumption_quantity_12m",
    "historicalEvidence.active_consumption_months_12m",
    "historicalEvidence.movement_frequency_12m",
    "historicalEvidence.intermittency_ratio_12m",
    "historicalEvidence.history_coverage_months",
    "historicalEvidence.history_completeness",
    "historicalEvidence.history_metric_status",
    "historicalEvidence.history_metric_limitation_codes",
    "relationshipEvidence.relationshipState",
    "relationshipEvidence.matchType",
    "relationshipEvidence.inventoryEntityKey",
    "relationshipEvidence.historyEntityKey",
    "materialMasterContext",
    "independentSignals",
    "historicalRuntime.status",
    "historicalRuntime.completedInputSignature",
    "historicalRuntime.result"
  ]);

  const NUMERIC_INPUT_FIELDS = Object.freeze([
    Object.freeze({ path: "inventoryEvidence.stock_quantity", fieldKey: "stock_quantity", type: "number" }),
    Object.freeze({ path: "inventoryEvidence.stock_value", fieldKey: "stock_value", type: "currency" }),
    Object.freeze({ path: "inventoryEvidence.no_need_value", fieldKey: "no_need_value", type: "currency" }),
    Object.freeze({ path: "inventoryEvidence.no_plan_value", fieldKey: "no_plan_value", type: "currency" }),
    Object.freeze({ path: "historicalEvidence.months_since_last_consumption", fieldKey: "months_since_last_consumption", type: "number" }),
    Object.freeze({ path: "historicalEvidence.net_consumption_quantity_3m", fieldKey: "net_consumption_quantity_3m", type: "number" }),
    Object.freeze({ path: "historicalEvidence.net_consumption_quantity_6m", fieldKey: "net_consumption_quantity_6m", type: "number" }),
    Object.freeze({ path: "historicalEvidence.net_consumption_quantity_12m", fieldKey: "net_consumption_quantity_12m", type: "number" }),
    Object.freeze({ path: "historicalEvidence.average_monthly_consumption_12m", fieldKey: "average_monthly_consumption_12m", type: "number" }),
    Object.freeze({ path: "historicalEvidence.active_consumption_months_12m", fieldKey: "active_consumption_months_12m", type: "number" }),
    Object.freeze({ path: "historicalEvidence.movement_frequency_12m", fieldKey: "movement_frequency_12m", type: "number" }),
    Object.freeze({ path: "historicalEvidence.intermittency_ratio_12m", fieldKey: "intermittency_ratio_12m", type: "number" }),
    Object.freeze({ path: "historicalEvidence.consumption_trend_ratio", fieldKey: "consumption_trend_ratio", type: "number" }),
    Object.freeze({ path: "historicalEvidence.history_coverage_months", fieldKey: "history_coverage_months", type: "number" }),
    Object.freeze({ path: "historicalEvidence.history_completeness", fieldKey: "history_completeness", type: "number" }),
    Object.freeze({ path: "historicalEvidence.inventory_coverage_months", fieldKey: "inventory_coverage_months", type: "number" })
  ]);

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(key => deepFreeze(value[key]));
    return Object.freeze(value);
  }

  function text(value) {
    return String(value ?? "").trim();
  }

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function hasPath(value, path) {
    return path.split(".").every((part, index, parts) => {
      const parent = parts.slice(0, index).reduce((current, key) => current?.[key], value);
      return parent !== null && parent !== undefined && Object.prototype.hasOwnProperty.call(parent, part);
    });
  }

  function valueAtPath(value, path) {
    return path.split(".").reduce((current, key) => current?.[key], value);
  }

  function clonePreservingMissing(value) {
    if (Array.isArray(value)) return value.map(clonePreservingMissing);
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clonePreservingMissing(item)]));
    }
    return value;
  }

  function setPath(value, path, nextValue) {
    const parts = path.split(".");
    const finalKey = parts.pop();
    const parent = parts.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== "object") current[key] = {};
      return current[key];
    }, value);
    parent[finalKey] = nextValue;
  }

  function sourceValueType(value) {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (Array.isArray(value)) return "array";
    return typeof value;
  }

  function numericReasonCodes(evidence) {
    if (evidence.reasonCodes?.length) return [...evidence.reasonCodes];
    if (evidence.status === "missing") return ["missing_numeric_value"];
    if (evidence.status === "ambiguous") return ["ambiguous_numeric_value"];
    if (evidence.status === "invalid") return ["invalid_numeric_value"];
    return [];
  }

  function numericInputEvidence(inputSnapshot = {}) {
    const normalizedInputSnapshot = clonePreservingMissing(inputSnapshot);
    const statusCounts = { valid: 0, missing: 0, ambiguous: 0, invalid: 0 };
    const fields = NUMERIC_INPUT_FIELDS.map(definition => {
      const pathPresent = hasPath(inputSnapshot, definition.path);
      const rawValue = pathPresent ? valueAtPath(inputSnapshot, definition.path) : undefined;
      const parsed = numericUtils.numericEvidence(rawValue, {
        fieldKey: definition.fieldKey,
        fieldDefinition: { type: definition.type, fieldKey: definition.fieldKey }
      });
      const status = pathPresent ? parsed.status : "missing";
      statusCounts[status] += 1;
      if (status === "valid") setPath(normalizedInputSnapshot, definition.path, parsed.normalizedValue);
      else if (status === "missing") setPath(normalizedInputSnapshot, definition.path, null);
      return {
        path: definition.path,
        field_key: definition.fieldKey,
        field_type: definition.type,
        path_present: pathPresent,
        source_value_type: sourceValueType(rawValue),
        source_was_explicit_zero: rawValue === 0,
        status,
        normalized_value: status === "valid" ? parsed.normalizedValue : null,
        reason_codes: pathPresent ? numericReasonCodes(parsed) : ["numeric_input_path_missing"]
      };
    });
    const numericStatus = statusCounts.invalid > 0
      ? "invalid"
      : statusCounts.ambiguous > 0
        ? "ambiguous"
        : statusCounts.missing > 0
          ? "missing"
          : "valid";
    const reasonCodes = [...new Set(fields.flatMap(field => field.reason_codes.map(code => `${field.path}:${code}`)))].sort();
    return deepFreeze({
      numeric_contract_version: CALIBRATION_NUMERIC_CONTRACT_VERSION,
      status: numericStatus,
      eligible: !["invalid", "ambiguous"].includes(numericStatus),
      status_counts: statusCounts,
      reason_codes: reasonCodes,
      fields,
      normalized_input_snapshot: normalizedInputSnapshot
    });
  }

  function knownCodes(values, allowed) {
    const allowedSet = new Set(allowed);
    return list(values).every(value => allowedSet.has(value));
  }

  function validateProvenance(calibrationCase, errors) {
    const provenance = calibrationCase.label_provenance;
    if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) {
      errors.push("label_provenance_missing");
      return;
    }
    if (provenance.type !== calibrationCase.source_type) errors.push("label_provenance_type_mismatch");
    if (!text(provenance.basis)) errors.push("label_provenance_basis_missing");
    if (calibrationCase.source_type === "synthetic_acceptance_fixture") {
      if (provenance.human_expert_validated !== false) errors.push("synthetic_fixture_must_not_claim_human_validation");
      if (text(provenance.reviewer_id) || text(provenance.reviewed_at)) errors.push("synthetic_fixture_must_not_include_reviewer_provenance");
    }
    if (calibrationCase.source_type === "pilot_expert_label") {
      if (provenance.human_expert_validated !== true) errors.push("pilot_label_requires_human_validation");
      if (!text(provenance.reviewer_id)) errors.push("pilot_label_reviewer_missing");
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(text(provenance.reviewed_at))) {
        errors.push("pilot_label_review_timestamp_invalid");
      }
      if (!text(provenance.review_rationale)) errors.push("pilot_label_review_rationale_missing");
    }
  }

  function validateProtectionFlags(calibrationCase, errors) {
    const flags = calibrationCase.protection_flags;
    if (!flags || typeof flags !== "object" || Array.isArray(flags)) {
      errors.push("protection_flags_missing");
      return;
    }
    PROTECTION_FLAG_KEYS.forEach(key => {
      if (typeof flags[key] !== "boolean") errors.push(`protection_flag_invalid:${key}`);
    });
    const condition = calibrationCase.expected?.condition;
    const rationale = new Set(list(calibrationCase.rationale_codes));
    if (flags.strategic_reserve && condition !== "strategic_reserve") errors.push("strategic_reserve_expectation_inconsistent");
    if (flags.strategic_reserve && !rationale.has("explicit_strategic_reserve")) errors.push("strategic_reserve_rationale_missing");
    if (flags.intermittent_demand && condition !== "intermittent_expected") errors.push("intermittent_expectation_inconsistent");
    if (flags.intermittent_demand && !rationale.has("recurring_intermittent_demand")) errors.push("intermittent_rationale_missing");
    if (condition === "dead_stock_candidate" && !flags.independent_dead_signal) errors.push("dead_candidate_requires_independent_signal_flag");
    if (flags.ambiguous_relationship && condition !== "insufficient_evidence") errors.push("ambiguous_relationship_expectation_inconsistent");
    if (flags.unit_conflict && condition !== "insufficient_evidence") errors.push("unit_conflict_expectation_inconsistent");
    if (flags.project_or_one_time_demand && condition === "dead_stock_candidate") errors.push("project_demand_dead_expectation_prohibited");
  }

  function validateExpected(expected, errors) {
    if (!expected || typeof expected !== "object" || Array.isArray(expected)) {
      errors.push("expected_missing");
      return;
    }
    if (!EXPECTED_CONDITIONS.includes(expected.condition)) errors.push("expected_condition_invalid");
    if (expected.evidence_strength !== undefined && !EVIDENCE_STRENGTHS.includes(expected.evidence_strength)) {
      errors.push("expected_evidence_strength_invalid");
    }
    if (expected.confidence !== undefined && !CONFIDENCE_LEVELS.includes(expected.confidence)) {
      errors.push("expected_confidence_invalid");
    }
    if (!Array.isArray(expected.required_reason_codes) || !knownCodes(expected.required_reason_codes, VALID_EXPECTATION_REASON_CODES)) {
      errors.push("required_reason_codes_invalid");
    }
    if (!Array.isArray(expected.forbidden_reason_codes) || !knownCodes(expected.forbidden_reason_codes, VALID_EXPECTATION_REASON_CODES)) {
      errors.push("forbidden_reason_codes_invalid");
    }
    if (expected.action_boundaries !== undefined) {
      const boundaries = expected.action_boundaries;
      if (!boundaries || typeof boundaries !== "object" || Array.isArray(boundaries)) {
        errors.push("action_boundaries_invalid");
      } else {
        ["disposal_not_recommendable", "monitoring_eligible"].forEach(key => {
          if (boundaries[key] !== undefined && typeof boundaries[key] !== "boolean") errors.push(`action_boundary_invalid:${key}`);
        });
      }
    }
  }

  function validateCalibrationCase(calibrationCase = {}) {
    const structuralErrors = [];
    if (calibrationCase.calibration_schema_version !== CALIBRATION_SCHEMA_VERSION) structuralErrors.push("calibration_schema_version_invalid");
    if (!/^SD-CAL-(?:SYN|PILOT)-\d{4}$/.test(text(calibrationCase.calibration_case_id))) structuralErrors.push("calibration_case_id_invalid");
    if (!SOURCE_TYPES.includes(calibrationCase.source_type)) structuralErrors.push("source_type_invalid");
    if (!text(calibrationCase.inventory_entity_key)) structuralErrors.push("inventory_entity_key_missing");
    if (calibrationCase.policy_version !== CALIBRATION_POLICY_REFERENCE.policyVersion) structuralErrors.push("policy_version_mismatch");
    if (calibrationCase.reference_date !== CALIBRATION_REFERENCE_DATE) structuralErrors.push("reference_date_invalid");
    if (!calibrationCase.input_snapshot || typeof calibrationCase.input_snapshot !== "object" || Array.isArray(calibrationCase.input_snapshot)) {
      structuralErrors.push("input_snapshot_missing");
    } else {
      REQUIRED_INPUT_PATHS.forEach(path => {
        if (!hasPath(calibrationCase.input_snapshot, path)) structuralErrors.push(`input_snapshot_path_missing:${path}`);
      });
      if (calibrationCase.input_snapshot.inventoryEvidence?.inventory_entity_key !== calibrationCase.inventory_entity_key) {
        structuralErrors.push("inventory_entity_key_mismatch");
      }
    }
    validateExpected(calibrationCase.expected, structuralErrors);
    if (!Array.isArray(calibrationCase.rationale_codes) || !calibrationCase.rationale_codes.length) structuralErrors.push("rationale_codes_missing");
    else if (!knownCodes(calibrationCase.rationale_codes, CALIBRATION_REASON_CODES)) structuralErrors.push("rationale_codes_invalid");
    if (!Array.isArray(calibrationCase.safety_invariant_ids) || !knownCodes(calibrationCase.safety_invariant_ids, SAFETY_INVARIANTS.map(item => item.id))) {
      structuralErrors.push("safety_invariant_ids_invalid");
    }
    if (calibrationCase.boundary_context !== undefined) {
      const context = calibrationCase.boundary_context;
      if (![6, 12, 18].includes(context?.threshold_months)) structuralErrors.push("boundary_threshold_invalid");
      if (!["below", "at", "above"].includes(context?.position)) structuralErrors.push("boundary_position_invalid");
    }
    validateProtectionFlags(calibrationCase, structuralErrors);
    validateProvenance(calibrationCase, structuralErrors);
    const numeric = numericInputEvidence(calibrationCase.input_snapshot || {});
    const numericErrors = numeric.fields
      .filter(field => ["invalid", "ambiguous"].includes(field.status))
      .map(field => `numeric_input_${field.status}:${field.path}:${field.reason_codes.join("+")}`);
    const errors = [...structuralErrors, ...numericErrors];
    return deepFreeze({
      valid: errors.length === 0,
      runnable: errors.length === 0 && numeric.eligible,
      errors,
      structural_errors: structuralErrors,
      numeric_errors: numericErrors,
      numeric_status: numeric.status,
      numeric_evidence: numeric.fields,
      numeric_reason_codes: numeric.reason_codes,
      normalized_input_snapshot: numeric.normalized_input_snapshot
    });
  }

  function validateCalibrationCaseSet(cases = []) {
    const errors = [];
    if (!Array.isArray(cases)) return deepFreeze({ valid: false, errors: ["calibration_case_set_invalid"], case_results: [] });
    if (cases.length === 0) return deepFreeze({
      valid: false,
      status: "insufficient_coverage",
      errors: ["calibration_case_set_empty"],
      case_results: []
    });
    const idCounts = new Map();
    cases.forEach(calibrationCase => {
      const caseId = text(calibrationCase?.calibration_case_id);
      if (caseId) {
        const currentCount = idCounts.has(caseId) ? idCounts.get(caseId) : 0;
        idCounts.set(caseId, currentCount + 1);
      }
    });
    const seenIds = new Set();
    const caseResults = cases.map(calibrationCase => {
      const result = validateCalibrationCase(calibrationCase);
      const caseId = text(calibrationCase?.calibration_case_id);
      if (caseId && seenIds.has(caseId)) errors.push(`duplicate_calibration_case_id:${caseId}`);
      seenIds.add(caseId);
      if (!result.valid) result.errors.forEach(error => errors.push(`${caseId || "unknown"}:${error}`));
      const duplicate = caseId && idCounts.get(caseId) > 1;
      return {
        calibration_case_id: caseId,
        ...result,
        valid: result.valid && !duplicate,
        runnable: result.runnable && !duplicate,
        errors: duplicate ? [...result.errors, "duplicate_calibration_case_id"] : result.errors
      };
    });
    return deepFreeze({
      valid: errors.length === 0,
      status: errors.length === 0 ? "valid" : "invalid",
      errors,
      case_results: caseResults
    });
  }

  root.slowDead.calibrationContract = Object.freeze({
    version: "2",
    CALIBRATION_SCHEMA_VERSION,
    CALIBRATION_NUMERIC_CONTRACT_VERSION,
    CALIBRATION_RUNNER_VERSION,
    CALIBRATION_REFERENCE_DATE,
    CALIBRATION_POLICY_REFERENCE,
    SOURCE_TYPES,
    EXPECTED_CONDITIONS,
    EVIDENCE_STRENGTHS,
    CONFIDENCE_LEVELS,
    CALIBRATION_REASON_CODES,
    ENGINE_REASON_CODES,
    VALID_EXPECTATION_REASON_CODES,
    DISAGREEMENT_CODES,
    SAFETY_INVARIANTS,
    PROTECTION_FLAG_KEYS,
    REQUIRED_INPUT_PATHS,
    NUMERIC_INPUT_FIELDS,
    numericInputEvidence,
    validateCalibrationCase,
    validateCalibrationCaseSet
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
