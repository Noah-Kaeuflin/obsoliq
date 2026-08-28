(function registerSlowDeadCalibrationRunner(global) {
  "use strict";

  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.slowDead = root.slowDead || {};

  const conditionModule = root.slowDead.conditionEngine;
  const contract = root.slowDead.calibrationContract;
  if (!conditionModule?.createSlowDeadConditionEngine || !contract) {
    throw new Error("Slow / Dead Calibration Runner requires the productive Condition Engine and Calibration Contract.");
  }

  const DEFINITIVE_CONDITIONS = new Set([
    "intermittent_expected",
    "slow_moving_candidate",
    "non_moving_candidate",
    "dead_stock_candidate",
    "strategic_reserve"
  ]);

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(key => deepFreeze(value[key]));
    return Object.freeze(value);
  }

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function stableJson(value) {
    return conditionModule.stableJson(value);
  }

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function actualCondition(result = {}) {
    return result.condition_code || "no_case";
  }

  function resultReasonCodes(result = {}) {
    return [...new Set([
      ...list(result.positive_evidence).map(item => item?.code),
      ...list(result.counter_evidence).map(item => item?.code)
    ].filter(Boolean))];
  }

  function actionBoundaries(result = {}) {
    const actions = list(result.action_eligibility);
    const disposal = actions.find(action => action.action_code === "DISPOSAL_REVIEW");
    const monitoring = actions.find(action => action.action_code === "MONITOR");
    return {
      disposal_not_recommendable: disposal ? disposal.eligibility_status === "not_recommendable" : null,
      monitoring_eligible: monitoring ? monitoring.eligibility_status === "eligible" : false
    };
  }

  function actionBoundaryMismatches(expected = {}, actual = {}) {
    return Object.keys(expected).filter(key => expected[key] !== actual[key]);
  }

  function criticalProtectionViolation(calibrationCase, actual) {
    const flags = calibrationCase.protection_flags || {};
    if (flags.strategic_reserve && actual !== "strategic_reserve") return true;
    if (flags.intermittent_demand && actual === "dead_stock_candidate") return true;
    if (!flags.independent_dead_signal && actual === "dead_stock_candidate") return true;
    if ((flags.ambiguous_relationship || flags.unit_conflict) && DEFINITIVE_CONDITIONS.has(actual)) return true;
    if (flags.project_or_one_time_demand && actual === "dead_stock_candidate") return true;
    return false;
  }

  function disagreementCode(calibrationCase, comparison) {
    const flags = calibrationCase.protection_flags || {};
    if (!comparison.policyMatches) return "policy_version_mismatch";
    if (flags.strategic_reserve && comparison.actualCondition !== "strategic_reserve") return "strategic_reserve_not_protected";
    if (flags.intermittent_demand && comparison.actualCondition === "dead_stock_candidate") return "intermittent_false_positive";
    if (!flags.independent_dead_signal && comparison.actualCondition === "dead_stock_candidate") return "dead_signal_requirement_violated";
    if ((flags.ambiguous_relationship || flags.unit_conflict) && DEFINITIVE_CONDITIONS.has(comparison.actualCondition)) {
      return "unexpected_definitive_classification";
    }
    if (flags.project_or_one_time_demand && comparison.actualCondition === "dead_stock_candidate") {
      return "unexpected_definitive_classification";
    }
    if (calibrationCase.boundary_context && !comparison.conditionMatches) return "threshold_boundary_mismatch";
    if (!comparison.conditionMatches) return "unexpected_condition";
    if (comparison.missingRequiredReasonCodes.length) return "required_reason_code_missing";
    if (comparison.presentForbiddenReasonCodes.length) return "forbidden_reason_code_present";
    if (!comparison.evidenceStrengthMatches) return "evidence_strength_mismatch";
    if (!comparison.confidenceMatches) return "confidence_mismatch";
    if (comparison.actionBoundaryMismatches.length) return "action_boundary_mismatch";
    return null;
  }

  function evaluateCalibrationCase(calibrationCase, engine, validation) {
    const inputBefore = stableJson(calibrationCase.input_snapshot);
    const inventoryBefore = stableJson(calibrationCase.input_snapshot.inventoryEvidence);
    const runtimeBefore = stableJson(calibrationCase.input_snapshot.historicalRuntime);
    const normalizedBefore = stableJson(validation.normalized_input_snapshot);
    const engineResult = engine.evaluateCondition(validation.normalized_input_snapshot);
    const inputAfter = stableJson(calibrationCase.input_snapshot);
    const inventoryAfter = stableJson(calibrationCase.input_snapshot.inventoryEvidence);
    const runtimeAfter = stableJson(calibrationCase.input_snapshot.historicalRuntime);
    if (inputBefore !== inputAfter || inventoryBefore !== inventoryAfter || runtimeBefore !== runtimeAfter) {
      throw new Error(`Calibration input mutated: ${calibrationCase.calibration_case_id}`);
    }
    if (normalizedBefore !== stableJson(validation.normalized_input_snapshot)) {
      throw new Error(`Calibration normalized input mutated: ${calibrationCase.calibration_case_id}`);
    }

    const actual = actualCondition(engineResult);
    const reasons = resultReasonCodes(engineResult);
    const expected = calibrationCase.expected;
    const actualBoundaries = actionBoundaries(engineResult);
    const comparison = {
      policyMatches: engineResult.model_versions?.condition_policy === calibrationCase.policy_version,
      conditionMatches: actual === expected.condition,
      evidenceStrengthMatches: expected.evidence_strength === undefined || engineResult.evidence_strength === expected.evidence_strength,
      confidenceMatches: expected.confidence === undefined || engineResult.condition_confidence === expected.confidence,
      missingRequiredReasonCodes: list(expected.required_reason_codes).filter(code => !reasons.includes(code)),
      presentForbiddenReasonCodes: list(expected.forbidden_reason_codes).filter(code => reasons.includes(code)),
      actionBoundaryMismatches: actionBoundaryMismatches(expected.action_boundaries || {}, actualBoundaries),
      actualCondition: actual
    };
    const code = disagreementCode(calibrationCase, comparison);
    return deepFreeze({
      calibration_case_id: calibrationCase.calibration_case_id,
      evaluation_status: "evaluated",
      evaluation_reason_codes: [],
      numeric_contract_version: contract.CALIBRATION_NUMERIC_CONTRACT_VERSION,
      numeric_status: validation.numeric_status,
      numeric_reason_codes: [...validation.numeric_reason_codes],
      numeric_evidence: cloneData(validation.numeric_evidence),
      expected_condition: expected.condition,
      actual_condition: actual,
      agreement: code === null,
      disagreement_code: code,
      critical_protection_violation: criticalProtectionViolation(calibrationCase, actual),
      policy_version: engineResult.model_versions?.condition_policy || "",
      evidence_strength: {
        expected: expected.evidence_strength ?? null,
        actual: engineResult.evidence_strength
      },
      confidence: {
        expected: expected.confidence ?? null,
        actual: engineResult.condition_confidence
      },
      reason_codes: reasons,
      limitation_codes: [...list(engineResult.limitation_codes)],
      independent_dead_stock_signal: engineResult.independent_dead_stock_signal === true,
      strategic_reserve_signal: engineResult.strategic_reserve_signal === true,
      action_eligibility: list(engineResult.action_eligibility).map(action => ({
        action_code: action.action_code,
        eligibility_status: action.eligibility_status
      })),
      missing_required_reason_codes: comparison.missingRequiredReasonCodes,
      present_forbidden_reason_codes: comparison.presentForbiddenReasonCodes,
      action_boundaries: {
        expected: cloneData(expected.action_boundaries || {}),
        actual: actualBoundaries,
        mismatches: comparison.actionBoundaryMismatches
      },
      condition_signature: engineResult.condition_signature,
      safety_invariant_ids: [...list(calibrationCase.safety_invariant_ids)]
    });
  }

  function excludedCalibrationCase(calibrationCase = {}, validation = {}) {
    const numericStatus = validation.numeric_status || "invalid";
    const numericReasonCodes = list(validation.numeric_reason_codes);
    const evaluationReasonCodes = list(validation.errors).length
      ? [...validation.errors]
      : [`numeric_input_${numericStatus}`];
    return deepFreeze({
      calibration_case_id: calibrationCase.calibration_case_id || "",
      evaluation_status: numericStatus === "ambiguous" ? "excluded_ambiguous_numeric" : "excluded_invalid_input",
      evaluation_reason_codes: evaluationReasonCodes,
      numeric_contract_version: contract.CALIBRATION_NUMERIC_CONTRACT_VERSION,
      numeric_status: numericStatus,
      numeric_reason_codes: numericReasonCodes,
      numeric_evidence: cloneData(validation.numeric_evidence || []),
      expected_condition: calibrationCase.expected?.condition || null,
      actual_condition: null,
      agreement: null,
      disagreement_code: "calibration_case_not_evaluable",
      critical_protection_violation: false,
      policy_version: "",
      evidence_strength: { expected: calibrationCase.expected?.evidence_strength ?? null, actual: null },
      confidence: { expected: calibrationCase.expected?.confidence ?? null, actual: null },
      reason_codes: [],
      limitation_codes: [],
      independent_dead_stock_signal: false,
      strategic_reserve_signal: false,
      action_eligibility: [],
      missing_required_reason_codes: [],
      present_forbidden_reason_codes: [],
      action_boundaries: { expected: cloneData(calibrationCase.expected?.action_boundaries || {}), actual: {}, mismatches: [] },
      condition_signature: null,
      safety_invariant_ids: [...list(calibrationCase.safety_invariant_ids)]
    });
  }

  function distribution(results = [], key) {
    return results.reduce((counts, result) => {
      const value = result[key];
      if (!Object.prototype.hasOwnProperty.call(counts, value)) counts[value] = 0;
      counts[value] += 1;
      return counts;
    }, {});
  }

  function runCalibrationFixtures(fixtures = [], options = {}) {
    const sourceFixtures = Array.isArray(fixtures) ? fixtures : [];
    const validation = contract.validateCalibrationCaseSet(sourceFixtures);
    const policy = options.policy || contract.CALIBRATION_POLICY_REFERENCE;
    if (!options.policy && contract.CALIBRATION_POLICY_REFERENCE !== conditionModule.DEFAULT_SLOW_DEAD_CONDITION_POLICY) {
      throw new Error("Calibration Policy reference is not the productive Policy object.");
    }
    const fixturesBefore = stableJson(sourceFixtures);
    const engine = conditionModule.createSlowDeadConditionEngine({ policy });
    const validationById = new Map(validation.case_results.map(result => [result.calibration_case_id, result]));
    const results = [...sourceFixtures]
      .sort((left, right) => String(left?.calibration_case_id || "").localeCompare(String(right?.calibration_case_id || "")))
      .map(calibrationCase => {
        const caseValidation = validationById.get(calibrationCase?.calibration_case_id) || contract.validateCalibrationCase(calibrationCase);
        return caseValidation.runnable
          ? evaluateCalibrationCase(calibrationCase, engine, caseValidation)
          : excludedCalibrationCase(calibrationCase, caseValidation);
      });
    if (fixturesBefore !== stableJson(sourceFixtures)) throw new Error("Calibration fixture set was mutated.");
    const eligibleResults = results.filter(result => result.evaluation_status === "evaluated");
    const excludedResults = results.filter(result => result.evaluation_status !== "evaluated");
    const disagreements = eligibleResults.filter(result => result.agreement === false);
    const criticalViolations = eligibleResults.filter(result => result.critical_protection_violation);
    const status = eligibleResults.length === 0
      ? "insufficient_coverage"
      : excludedResults.length > 0
        ? "blocked"
        : disagreements.length > 0 || criticalViolations.length > 0
          ? "failed"
          : "passed";
    const agreementCalculable = eligibleResults.length > 0 && excludedResults.length === 0;
    return deepFreeze({
      calibration_schema_version: contract.CALIBRATION_SCHEMA_VERSION,
      calibration_runner_version: contract.CALIBRATION_RUNNER_VERSION,
      numeric_contract_version: contract.CALIBRATION_NUMERIC_CONTRACT_VERSION,
      policy_version: policy.policyVersion,
      reference_date: contract.CALIBRATION_REFERENCE_DATE,
      status,
      contract_validation_status: validation.valid ? "valid" : validation.status || "invalid",
      validation_errors: [...validation.errors],
      fixture_count: results.length,
      eligible_result_count: eligibleResults.length,
      excluded_result_count: excludedResults.length,
      agreement_count: eligibleResults.length - disagreements.length,
      disagreement_count: disagreements.length,
      critical_protection_violation_count: criticalViolations.length,
      synthetic_contract_agreement: agreementCalculable
        ? disagreements.length === 0 && criticalViolations.length === 0
        : null,
      synthetic_contract_agreement_status: agreementCalculable ? "calculated" : "not_calculable",
      safety_status: eligibleResults.length === 0
        ? "not_evaluated"
        : excludedResults.length > 0
          ? "blocked"
          : criticalViolations.length > 0
            ? "failed"
            : "passed",
      expected_condition_distribution: distribution(eligibleResults, "expected_condition"),
      actual_condition_distribution: distribution(eligibleResults, "actual_condition"),
      disagreement_codes: disagreements.map(result => result.disagreement_code),
      results
    });
  }

  root.slowDead.calibrationRunner = Object.freeze({
    version: "2",
    CALIBRATION_RUNNER_VERSION: contract.CALIBRATION_RUNNER_VERSION,
    DEFINITIVE_CONDITIONS: Object.freeze([...DEFINITIVE_CONDITIONS]),
    evaluateCalibrationCase,
    runCalibrationFixtures,
    stableJson
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
