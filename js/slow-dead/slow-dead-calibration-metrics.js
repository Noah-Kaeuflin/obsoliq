(function registerSlowDeadCalibrationMetrics(global) {
  "use strict";

  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.slowDead = root.slowDead || {};

  const conditionEngine = root.slowDead.conditionEngine;
  const contract = root.slowDead.calibrationContract;
  if (!conditionEngine?.stableJson || !contract?.validateCalibrationCaseSet) {
    throw new Error("Slow / Dead Calibration Metrics requires the productive Condition Engine and Calibration Contract.");
  }

  const CALIBRATION_METRICS_VERSION = "slow-dead-calibration-metrics-v2";
  const FINGERPRINT_VERSION = "slow-dead-calibration-fingerprint-fnv1a32-v1";

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(key => deepFreeze(value[key]));
    return Object.freeze(value);
  }

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function lexical(left, right) {
    return String(left).localeCompare(String(right), "en");
  }

  function stableJson(value) {
    return conditionEngine.stableJson(value);
  }

  function fnv1a32(value) {
    const text = String(value ?? "");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function fingerprint(scope, value) {
    return `${scope}:${FINGERPRINT_VERSION}:${fnv1a32(stableJson(value))}`;
  }

  function conditionCounts(values, conditions, selector) {
    const counts = Object.fromEntries(conditions.map(condition => [condition, 0]));
    values.forEach(value => {
      const condition = selector(value);
      if (!Object.prototype.hasOwnProperty.call(counts, condition)) counts[condition] = 0;
      counts[condition] += 1;
    });
    return counts;
  }

  function buildBoundaryResults(fixtures, resultById) {
    const grouped = {};
    fixtures
      .filter(fixture => fixture.boundary_context)
      .sort((left, right) => lexical(left.calibration_case_id, right.calibration_case_id))
      .forEach(fixture => {
        const threshold = String(fixture.boundary_context.threshold_months);
        const position = fixture.boundary_context.position;
        const result = resultById.get(fixture.calibration_case_id);
        grouped[threshold] = grouped[threshold] || {};
        grouped[threshold][position] = grouped[threshold][position] || {
          fixtureCount: 0,
          eligibleCount: 0,
          excludedCount: 0,
          agreementCount: 0,
          disagreementCount: 0,
          caseIds: []
        };
        const bucket = grouped[threshold][position];
        bucket.fixtureCount += 1;
        if (result?.evaluation_status === "evaluated") {
          bucket.eligibleCount += 1;
          bucket.agreementCount += result.agreement ? 1 : 0;
          bucket.disagreementCount += result.agreement ? 0 : 1;
        } else {
          bucket.excludedCount += 1;
        }
        bucket.caseIds.push(fixture.calibration_case_id);
      });
    return grouped;
  }

  function buildReasonCodeCoverage(results) {
    const coverage = new Map();
    results.forEach(result => {
      [...new Set(list(result.reason_codes))].sort(lexical).forEach(code => {
        if (!coverage.has(code)) coverage.set(code, []);
        coverage.get(code).push(result.calibration_case_id);
      });
    });
    return Object.fromEntries([...coverage.entries()]
      .sort(([left], [right]) => lexical(left, right))
      .map(([code, caseIds]) => [code, {
        fixtureCount: caseIds.length,
        caseIds: [...caseIds].sort(lexical)
      }]));
  }

  function buildSafetyInvariantResults(fixtures, resultById) {
    return contract.SAFETY_INVARIANTS.map(invariant => {
      const coveredFixtures = fixtures
        .filter(fixture => list(fixture.safety_invariant_ids).includes(invariant.id))
        .sort((left, right) => lexical(left.calibration_case_id, right.calibration_case_id));
      const violatedCaseIds = coveredFixtures
        .filter(fixture => {
          const result = resultById.get(fixture.calibration_case_id);
          return result?.evaluation_status === "evaluated"
            && (!result.agreement || result.critical_protection_violation === true);
        })
        .map(fixture => fixture.calibration_case_id);
      const eligibleFixtureCount = coveredFixtures.filter(fixture => resultById.get(fixture.calibration_case_id)?.evaluation_status === "evaluated").length;
      const excludedFixtureCount = coveredFixtures.length - eligibleFixtureCount;
      const status = eligibleFixtureCount === 0
        ? "not_evaluated"
        : excludedFixtureCount > 0
          ? "blocked"
          : violatedCaseIds.length > 0
            ? "failed"
            : "passed";
      return {
        safetyInvariantId: invariant.id,
        description: invariant.description,
        fixtureCount: coveredFixtures.length,
        eligibleFixtureCount,
        excludedFixtureCount,
        passedCount: eligibleFixtureCount - violatedCaseIds.length,
        violationCount: violatedCaseIds.length,
        violatedCaseIds,
        status,
        passed: status === "passed"
      };
    });
  }

  function validateRunnerResult(fixtures, runnerResult) {
    const errors = [];
    const results = list(runnerResult?.results);
    const fixtureIds = fixtures.map(fixture => fixture.calibration_case_id).sort(lexical);
    const resultIds = results.map(result => result.calibration_case_id).sort(lexical);
    if (runnerResult?.calibration_schema_version !== contract.CALIBRATION_SCHEMA_VERSION) errors.push("calibration_schema_version_mismatch");
    if (runnerResult?.calibration_runner_version !== contract.CALIBRATION_RUNNER_VERSION) errors.push("calibration_runner_version_mismatch");
    if (runnerResult?.numeric_contract_version !== contract.CALIBRATION_NUMERIC_CONTRACT_VERSION) errors.push("numeric_contract_version_mismatch");
    if (runnerResult?.policy_version !== contract.CALIBRATION_POLICY_REFERENCE.policyVersion) errors.push("policy_version_mismatch");
    if (runnerResult?.reference_date !== contract.CALIBRATION_REFERENCE_DATE) errors.push("reference_date_mismatch");
    if (runnerResult?.fixture_count !== fixtures.length) errors.push("runner_fixture_count_mismatch");
    if (results.length !== fixtures.length) errors.push("runner_result_count_mismatch");
    if (new Set(resultIds).size !== resultIds.length) errors.push("duplicate_runner_result_id");
    if (stableJson(fixtureIds) !== stableJson(resultIds)) errors.push("runner_result_case_set_mismatch");
    return errors;
  }

  function buildCalibrationMetrics(fixtures = [], runnerResult = {}, scenarioMetadata = {}) {
    const sourceFixtures = Array.isArray(fixtures) ? fixtures : [];
    const fixtureValidation = contract.validateCalibrationCaseSet(sourceFixtures);
    const runnerErrors = validateRunnerResult(sourceFixtures, runnerResult);
    if (runnerErrors.length) throw new Error(`Invalid Calibration runner result for Metrics: ${runnerErrors.join(", ")}`);

    const fixturesBefore = stableJson(sourceFixtures);
    const runnerBefore = stableJson(runnerResult);
    const conditions = [...contract.EXPECTED_CONDITIONS];
    const results = [...runnerResult.results].sort((left, right) => lexical(left.calibration_case_id, right.calibration_case_id));
    const eligibleResults = results.filter(result => result.evaluation_status === "evaluated");
    const excludedResults = results.filter(result => result.evaluation_status !== "evaluated");
    const resultById = new Map(results.map(result => [result.calibration_case_id, result]));
    const expectedCountByCondition = conditionCounts(eligibleResults, conditions, result => result.expected_condition);
    const actualCountByCondition = conditionCounts(eligibleResults, conditions, result => result.actual_condition);
    const agreementCountByCondition = conditionCounts(eligibleResults.filter(result => result.agreement === true), conditions, result => result.expected_condition);
    const disagreementCountByCondition = conditionCounts(eligibleResults.filter(result => result.agreement === false), conditions, result => result.expected_condition);
    const boundaryResults = buildBoundaryResults(sourceFixtures, resultById);
    const safetyInvariantResults = buildSafetyInvariantResults(sourceFixtures, resultById);
    const validFixtureCount = fixtureValidation.case_results.filter(result => result.valid).length;
    const agreementCount = eligibleResults.filter(result => result.agreement === true).length;
    const completeCoverage = eligibleResults.length > 0 && excludedResults.length === 0 && eligibleResults.length === sourceFixtures.length;
    const status = eligibleResults.length === 0
      ? "insufficient_coverage"
      : excludedResults.length > 0 || !fixtureValidation.valid
        ? "blocked"
        : runnerResult.status === "failed"
          ? "failed"
          : "passed";
    const safetyStatus = eligibleResults.length === 0
      ? "not_evaluated"
      : excludedResults.length > 0
        ? "blocked"
        : runnerResult.critical_protection_violation_count > 0
          ? "failed"
          : "passed";
    const payload = {
      metricsVersion: CALIBRATION_METRICS_VERSION,
      numericContractVersion: contract.CALIBRATION_NUMERIC_CONTRACT_VERSION,
      status,
      fixtureCount: sourceFixtures.length,
      validFixtureCount,
      invalidFixtureCount: sourceFixtures.length - validFixtureCount,
      eligibleResultCount: eligibleResults.length,
      excludedResultCount: excludedResults.length,
      syntheticContractAgreement: completeCoverage ? agreementCount / eligibleResults.length : null,
      syntheticContractAgreementStatus: completeCoverage ? "calculated" : "not_calculable",
      safetyStatus,
      expectedCountByCondition,
      actualCountByCondition,
      agreementCountByCondition,
      disagreementCountByCondition,
      boundaryResults,
      reasonCodeCoverage: buildReasonCodeCoverage(eligibleResults),
      safetyInvariantResults,
      criticalSafetyViolationCount: runnerResult.critical_protection_violation_count,
      deterministicRepeatability: scenarioMetadata.deterministicRepeatability === true,
      policyFingerprint: fingerprint("slow-dead-policy", contract.CALIBRATION_POLICY_REFERENCE),
      fixtureFingerprint: fingerprint("slow-dead-fixtures", sourceFixtures),
      resultFingerprint: fingerprint("slow-dead-baseline-result", results)
    };
    if (fixturesBefore !== stableJson(sourceFixtures)) throw new Error("Calibration Metrics mutated fixtures.");
    if (runnerBefore !== stableJson(runnerResult)) throw new Error("Calibration Metrics mutated runner results.");
    return deepFreeze(payload);
  }

  root.slowDead.calibrationMetrics = Object.freeze({
    version: "2",
    CALIBRATION_METRICS_VERSION,
    FINGERPRINT_VERSION,
    buildCalibrationMetrics,
    fingerprint,
    stableJson
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
