(function registerSlowDeadThresholdSensitivity(global) {
  "use strict";

  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.slowDead = root.slowDead || {};

  const conditionEngine = root.slowDead.conditionEngine;
  const contract = root.slowDead.calibrationContract;
  const calibrationRunner = root.slowDead.calibrationRunner;
  const metricsModule = root.slowDead.calibrationMetrics;
  if (!conditionEngine?.createSlowDeadConditionEngine || !contract || !calibrationRunner || !metricsModule?.fingerprint) {
    throw new Error("Slow / Dead Threshold Sensitivity requires the productive Engine, Calibration Contract, Runner and Metrics module.");
  }

  const THRESHOLD_SENSITIVITY_PLAN_VERSION = "slow-dead-threshold-sensitivity-plan-v1";
  const THRESHOLD_SENSITIVITY_RUNNER_VERSION = "slow-dead-threshold-sensitivity-runner-v2";
  const BASELINE_SCENARIO_ID = "SD-SENS-BASELINE";
  const DEFINITIVE_CONDITIONS = new Set(calibrationRunner.DEFINITIVE_CONDITIONS);

  const EXPECTED_BASELINE_VALUES = Object.freeze({
    minimumHistoryCoverageMonths: 12,
    minimumHistoryCompleteness: 0.8,
    strongHistoryCompleteness: 0.9,
    slowMovingMonthsSinceLastConsumption: 6,
    nonMovingMonthsSinceLastConsumption: 12,
    deadCandidateMonthsSinceLastConsumption: 18,
    minimumActiveMonthsForRecurringDemand: 2,
    intermittentDemandThreshold: 0.75
  });

  const SENSITIVITY_PARAMETERS = Object.freeze(Object.keys(EXPECTED_BASELINE_VALUES));

  const CRITICAL_SAFETY_VIOLATION_CODES = Object.freeze([
    "strategic_reserve_protection_broken",
    "strategic_reserve_requires_explicit_evidence_broken",
    "intermittent_demand_protection_broken",
    "dead_signal_requirement_broken",
    "insufficient_history_protection_broken",
    "low_completeness_protection_broken",
    "ambiguous_relationship_protection_broken",
    "unit_conflict_protection_broken",
    "project_demand_protection_broken",
    "missing_zero_distinction_broken",
    "automatic_action_approval_broken",
    "unexpected_escalation_to_dead"
  ]);

  const ANALYSIS_SAFETY_GUARDS = Object.freeze([
    Object.freeze({ id: "SD-SENS-GUARD-01", description: "Age alone cannot create a Dead Stock Candidate." }),
    Object.freeze({ id: "SD-SENS-GUARD-02", description: "Dead Stock Candidate requires an independent demand, planning or lifecycle signal." }),
    Object.freeze({ id: "SD-SENS-GUARD-03", description: "Strategic Reserve requires explicit evidence." }),
    Object.freeze({ id: "SD-SENS-GUARD-04", description: "Explicit Strategic Reserve keeps precedence." }),
    Object.freeze({ id: "SD-SENS-GUARD-05", description: "Recurring intermittent demand remains protected." }),
    Object.freeze({ id: "SD-SENS-GUARD-06", description: "Ambiguous relationships remain non-definitive." }),
    Object.freeze({ id: "SD-SENS-GUARD-07", description: "Unit conflicts remain non-definitive." }),
    Object.freeze({ id: "SD-SENS-GUARD-08", description: "Insufficient History and low completeness remain insufficient evidence." }),
    Object.freeze({ id: "SD-SENS-GUARD-09", description: "Missing values remain distinguishable from numeric zero." }),
    Object.freeze({ id: "SD-SENS-GUARD-10", description: "No scenario automatically approves Disposal or another Action." })
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
    return conditionEngine.stableJson(value);
  }

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function lexical(left, right) {
    return String(left).localeCompare(String(right), "en");
  }

  function unique(values) {
    return [...new Set(values)].sort(lexical);
  }

  function alternative(scenarioId, variedParameter, candidateValue) {
    return Object.freeze({
      scenarioId,
      sensitivityPlanVersion: THRESHOLD_SENSITIVITY_PLAN_VERSION,
      variedParameter,
      baselineValue: EXPECTED_BASELINE_VALUES[variedParameter],
      candidateValue,
      analysisOnly: true,
      productionEligible: false
    });
  }

  const THRESHOLD_SENSITIVITY_PLAN = deepFreeze({
    sensitivityPlanVersion: THRESHOLD_SENSITIVITY_PLAN_VERSION,
    principle: "one_factor_at_a_time",
    analysisOnly: true,
    productionEligible: false,
    baselinePolicyVersion: "slow-dead-condition-policy-v1",
    scenarios: [
      {
        scenarioId: BASELINE_SCENARIO_ID,
        sensitivityPlanVersion: THRESHOLD_SENSITIVITY_PLAN_VERSION,
        variedParameter: null,
        baselineValue: null,
        candidateValue: null,
        analysisOnly: true,
        productionEligible: false
      },
      alternative("SD-SENS-HISTORY-COVERAGE-LOW", "minimumHistoryCoverageMonths", 9),
      alternative("SD-SENS-HISTORY-COVERAGE-HIGH", "minimumHistoryCoverageMonths", 18),
      alternative("SD-SENS-MIN-COMPLETENESS-LOW", "minimumHistoryCompleteness", 0.75),
      alternative("SD-SENS-MIN-COMPLETENESS-HIGH", "minimumHistoryCompleteness", 0.85),
      alternative("SD-SENS-STRONG-COMPLETENESS-LOW", "strongHistoryCompleteness", 0.85),
      alternative("SD-SENS-STRONG-COMPLETENESS-HIGH", "strongHistoryCompleteness", 0.95),
      alternative("SD-SENS-SLOW-LOW", "slowMovingMonthsSinceLastConsumption", 5),
      alternative("SD-SENS-SLOW-HIGH", "slowMovingMonthsSinceLastConsumption", 7),
      alternative("SD-SENS-NONMOVING-LOW", "nonMovingMonthsSinceLastConsumption", 10),
      alternative("SD-SENS-NONMOVING-HIGH", "nonMovingMonthsSinceLastConsumption", 15),
      alternative("SD-SENS-DEAD-LOW", "deadCandidateMonthsSinceLastConsumption", 15),
      alternative("SD-SENS-DEAD-HIGH", "deadCandidateMonthsSinceLastConsumption", 24),
      alternative("SD-SENS-ACTIVE-MONTHS-LOW", "minimumActiveMonthsForRecurringDemand", 1),
      alternative("SD-SENS-ACTIVE-MONTHS-HIGH", "minimumActiveMonthsForRecurringDemand", 3),
      alternative("SD-SENS-INTERMITTENCY-LOW", "intermittentDemandThreshold", 0.65),
      alternative("SD-SENS-INTERMITTENCY-HIGH", "intermittentDemandThreshold", 0.85)
    ]
  });

  function validateProductiveBaseline(policy = contract.CALIBRATION_POLICY_REFERENCE) {
    const errors = [];
    if (policy !== conditionEngine.DEFAULT_SLOW_DEAD_CONDITION_POLICY) errors.push("productive_policy_reference_mismatch");
    if (policy?.policyVersion !== "slow-dead-condition-policy-v1") errors.push("productive_policy_version_mismatch");
    Object.entries(EXPECTED_BASELINE_VALUES).forEach(([key, expected]) => {
      if (policy?.[key] !== expected) errors.push(`productive_baseline_mismatch:${key}`);
    });
    if (!Object.isFrozen(policy)) errors.push("productive_policy_not_frozen");
    return deepFreeze({ valid: errors.length === 0, errors });
  }

  function candidatePolicyForScenario(scenario, baselinePolicy = contract.CALIBRATION_POLICY_REFERENCE) {
    const candidate = { ...baselinePolicy };
    if (scenario.variedParameter) candidate[scenario.variedParameter] = scenario.candidateValue;
    return deepFreeze(candidate);
  }

  function validatePolicyVariant(scenario = {}, candidatePolicy = {}) {
    const errors = [];
    const isBaseline = scenario.scenarioId === BASELINE_SCENARIO_ID;
    const baselinePolicy = contract.CALIBRATION_POLICY_REFERENCE;
    if (scenario.sensitivityPlanVersion !== THRESHOLD_SENSITIVITY_PLAN_VERSION) errors.push("sensitivity_plan_version_mismatch");
    if (scenario.analysisOnly !== true || scenario.productionEligible !== false) errors.push("analysis_only_contract_broken");
    if (!isBaseline && !SENSITIVITY_PARAMETERS.includes(scenario.variedParameter)) errors.push("unknown_policy_parameter");
    if (!isBaseline && baselinePolicy[scenario.variedParameter] !== scenario.baselineValue) errors.push("baseline_value_mismatch");
    if (!isBaseline && candidatePolicy[scenario.variedParameter] !== scenario.candidateValue) errors.push("candidate_value_mismatch");

    const candidateKeys = Object.keys(candidatePolicy);
    const unknownKeys = candidateKeys.filter(key => !Object.prototype.hasOwnProperty.call(baselinePolicy, key));
    if (unknownKeys.length) errors.push("unknown_policy_parameter");
    const changedParameters = Object.keys(baselinePolicy)
      .filter(key => candidatePolicy[key] !== baselinePolicy[key])
      .sort(lexical);
    if (isBaseline && changedParameters.length) errors.push("baseline_policy_changed");
    if (!isBaseline && changedParameters.length > 1) errors.push("multiple_parameters_changed");
    if (!isBaseline && changedParameters.length === 0) errors.push("no_parameter_changed");
    if (!isBaseline && changedParameters.length === 1 && changedParameters[0] !== scenario.variedParameter) errors.push("unknown_policy_parameter");

    const positiveIntegerFields = [
      "minimumHistoryCoverageMonths",
      "slowMovingMonthsSinceLastConsumption",
      "slowMovingCoverageMonths",
      "minimumSlowEvidenceDimensions",
      "nonMovingMonthsSinceLastConsumption",
      "deadCandidateMonthsSinceLastConsumption",
      "minimumActiveMonthsForRecurringDemand",
      "intermittentRecentConsumptionMonths"
    ];
    positiveIntegerFields.forEach(field => {
      const value = candidatePolicy[field];
      const code = field === "minimumActiveMonthsForRecurringDemand" ? "invalid_active_months" : "invalid_month_value";
      if (!Number.isInteger(value) || value <= 0) errors.push(code);
    });
    ["minimumHistoryCompleteness", "strongHistoryCompleteness"].forEach(field => {
      const value = candidatePolicy[field];
      if (!Number.isFinite(value) || value < 0 || value > 1) errors.push("invalid_completeness_range");
    });
    if (candidatePolicy.minimumHistoryCompleteness > candidatePolicy.strongHistoryCompleteness) errors.push("invalid_threshold_order");
    if (!Number.isFinite(candidatePolicy.intermittentDemandThreshold)
      || candidatePolicy.intermittentDemandThreshold < 0
      || candidatePolicy.intermittentDemandThreshold > 1) {
      errors.push("invalid_intermittency_range");
    }
    if (!(candidatePolicy.slowMovingMonthsSinceLastConsumption < candidatePolicy.nonMovingMonthsSinceLastConsumption
      && candidatePolicy.nonMovingMonthsSinceLastConsumption < candidatePolicy.deadCandidateMonthsSinceLastConsumption)) {
      errors.push("invalid_threshold_order");
    }
    return deepFreeze({
      valid: errors.length === 0,
      errors: unique(errors),
      changedParameters
    });
  }

  function validateSensitivityPlan(plan = THRESHOLD_SENSITIVITY_PLAN) {
    const errors = [];
    const scenarios = list(plan.scenarios);
    if (plan.sensitivityPlanVersion !== THRESHOLD_SENSITIVITY_PLAN_VERSION) errors.push("sensitivity_plan_version_mismatch");
    if (plan.principle !== "one_factor_at_a_time") errors.push("ofat_principle_missing");
    if (scenarios.length !== 17) errors.push("scenario_count_mismatch");
    if (new Set(scenarios.map(scenario => scenario.scenarioId)).size !== scenarios.length) errors.push("duplicate_scenario_id");
    if (scenarios.filter(scenario => scenario.scenarioId === BASELINE_SCENARIO_ID).length !== 1) errors.push("baseline_scenario_count_mismatch");
    const parameterCounts = Object.fromEntries(SENSITIVITY_PARAMETERS.map(parameter => [parameter, 0]));
    scenarios.forEach(scenario => {
      if (scenario.variedParameter && Object.prototype.hasOwnProperty.call(parameterCounts, scenario.variedParameter)) {
        parameterCounts[scenario.variedParameter] += 1;
      }
      const candidatePolicy = candidatePolicyForScenario(scenario);
      const validation = validatePolicyVariant(scenario, candidatePolicy);
      validation.errors.forEach(error => errors.push(`${scenario.scenarioId}:${error}`));
    });
    Object.entries(parameterCounts).forEach(([parameter, count]) => {
      if (count !== 2) errors.push(`parameter_variant_count_mismatch:${parameter}`);
    });
    return deepFreeze({ valid: errors.length === 0, errors: unique(errors), scenarioCount: scenarios.length, parameterCounts });
  }

  function sensitivityCaseResult(result) {
    return deepFreeze({
      calibrationCaseId: result.calibration_case_id,
      evaluationStatus: result.evaluation_status,
      numericContractVersion: result.numeric_contract_version,
      numericStatus: result.numeric_status,
      numericReasonCodes: [...list(result.numeric_reason_codes)],
      numericEvidence: cloneData(result.numeric_evidence),
      condition: result.actual_condition,
      conditionSignature: result.condition_signature,
      limitationCodes: [...list(result.limitation_codes)].sort(lexical),
      reasonCodes: unique(list(result.reason_codes)),
      independentDeadStockSignal: result.independent_dead_stock_signal === true,
      strategicReserveSignal: result.strategic_reserve_signal === true,
      actionEligibility: list(result.action_eligibility).map(action => ({
        actionCode: action.action_code,
        eligibilityStatus: action.eligibility_status
      }))
    });
  }

  function evaluateScenarioSafety(fixtures, caseResults, baselineById) {
    const resultById = new Map(caseResults.map(result => [result.calibrationCaseId, result]));
    const violationsByGuard = new Map(ANALYSIS_SAFETY_GUARDS.map(guard => [guard.id, []]));
    function add(guardId, fixture, code, detail) {
      violationsByGuard.get(guardId).push({
        calibrationCaseId: fixture.calibration_case_id,
        violationCode: code,
        detail
      });
    }

    fixtures.forEach(fixture => {
      const result = resultById.get(fixture.calibration_case_id);
      if (!result) return;
      const flags = fixture.protection_flags || {};
      const monthsSinceEvidence = list(result.numericEvidence)
        .find(item => item.path === "historicalEvidence.months_since_last_consumption");
      const monthsSinceIsValid = monthsSinceEvidence?.status === "valid" && Number.isFinite(monthsSinceEvidence.normalized_value);
      if (!flags.independent_dead_signal && monthsSinceIsValid
        && monthsSinceEvidence.normalized_value >= EXPECTED_BASELINE_VALUES.deadCandidateMonthsSinceLastConsumption
        && result.condition === "dead_stock_candidate") {
        add("SD-SENS-GUARD-01", fixture, "dead_signal_requirement_broken", "Age without an independent signal produced Dead Stock Candidate.");
      }
      if (result.condition === "dead_stock_candidate" && !result.independentDeadStockSignal) {
        add("SD-SENS-GUARD-02", fixture, flags.project_or_one_time_demand ? "project_demand_protection_broken" : "dead_signal_requirement_broken", "Dead Stock Candidate has no independent signal.");
      }
      if (flags.project_or_one_time_demand && result.condition === "dead_stock_candidate") {
        add("SD-SENS-GUARD-02", fixture, "project_demand_protection_broken", "Project or one-time demand was escalated to Dead Stock Candidate.");
      }
      if (result.condition === "strategic_reserve" && !flags.strategic_reserve) {
        add("SD-SENS-GUARD-03", fixture, "strategic_reserve_requires_explicit_evidence_broken", "Strategic Reserve was emitted without explicit fixture evidence.");
      }
      if (flags.strategic_reserve && result.condition !== "strategic_reserve") {
        add("SD-SENS-GUARD-04", fixture, "strategic_reserve_protection_broken", "Explicit Strategic Reserve lost precedence.");
      }
      if (flags.intermittent_demand && result.condition !== "intermittent_expected") {
        add("SD-SENS-GUARD-05", fixture, "intermittent_demand_protection_broken", "Recurring intermittent demand lost its protected condition.");
      }
      if (flags.ambiguous_relationship && DEFINITIVE_CONDITIONS.has(result.condition)) {
        add("SD-SENS-GUARD-06", fixture, "ambiguous_relationship_protection_broken", "Ambiguous relationship produced a definitive condition.");
      }
      if (flags.unit_conflict && DEFINITIVE_CONDITIONS.has(result.condition)) {
        add("SD-SENS-GUARD-07", fixture, "unit_conflict_protection_broken", "Unit conflict produced a definitive condition.");
      }
      if (list(fixture.safety_invariant_ids).includes("SD-SAFETY-05") && result.condition !== "insufficient_evidence") {
        add("SD-SENS-GUARD-08", fixture, "insufficient_history_protection_broken", "Insufficient History no longer produces insufficient evidence.");
      }
      if (list(fixture.safety_invariant_ids).includes("SD-SAFETY-06") && result.condition !== "insufficient_evidence") {
        add("SD-SENS-GUARD-08", fixture, "low_completeness_protection_broken", "Low History completeness no longer produces insufficient evidence.");
      }
      const forbiddenStatuses = new Set(["approved", "auto_approved", "automatically_approved", "recommended"]);
      if (result.actionEligibility.some(action => forbiddenStatuses.has(action.eligibilityStatus))) {
        add("SD-SENS-GUARD-10", fixture, "automatic_action_approval_broken", "Scenario emitted an automatically approved or recommended Action.");
      }
      const baseline = baselineById?.get(fixture.calibration_case_id);
      if (baseline && baseline.condition !== "dead_stock_candidate" && result.condition === "dead_stock_candidate"
        && ["insufficient_evidence", "intermittent_expected", "strategic_reserve", "no_case"].includes(baseline.condition)) {
        add("SD-SENS-GUARD-02", fixture, "unexpected_escalation_to_dead", `Protected baseline condition ${baseline.condition} escalated to Dead Stock Candidate.`);
      }
    });

    const missingFixture = fixtures.find(fixture => list(fixture.safety_invariant_ids).includes("SD-SAFETY-11")
      && fixture.input_snapshot?.historicalEvidence?.net_consumption_quantity_12m === undefined);
    const zeroFixture = fixtures.find(fixture => list(fixture.safety_invariant_ids).includes("SD-SAFETY-11")
      && fixture.input_snapshot?.historicalEvidence?.net_consumption_quantity_12m === 0);
    if (missingFixture && zeroFixture) {
      const missingResult = resultById.get(missingFixture.calibration_case_id);
      const zeroResult = resultById.get(zeroFixture.calibration_case_id);
      if (missingResult && !missingResult.limitationCodes.includes("net_consumption_12m_missing")) {
        add("SD-SENS-GUARD-09", missingFixture, "missing_zero_distinction_broken", "Missing twelve-month consumption lost its missing-evidence limitation.");
      }
      if (zeroResult && zeroResult.limitationCodes.includes("net_consumption_12m_missing")) {
        add("SD-SENS-GUARD-09", zeroFixture, "missing_zero_distinction_broken", "Numeric zero was treated as missing evidence.");
      }
    }

    const safetyGuardResults = ANALYSIS_SAFETY_GUARDS.map(guard => {
      const violations = [...violationsByGuard.get(guard.id)]
        .sort((left, right) => lexical(`${left.calibrationCaseId}:${left.violationCode}`, `${right.calibrationCaseId}:${right.violationCode}`));
      return {
        guardId: guard.id,
        description: guard.description,
        checkedCaseCount: fixtures.length,
        violationCount: violations.length,
        violations,
        passed: violations.length === 0
      };
    });
    const uniqueViolations = new Map();
    safetyGuardResults.flatMap(result => result.violations).forEach(violation => {
      uniqueViolations.set(`${violation.calibrationCaseId}:${violation.violationCode}`, violation);
    });
    const criticalViolations = [...uniqueViolations.values()]
      .sort((left, right) => lexical(`${left.calibrationCaseId}:${left.violationCode}`, `${right.calibrationCaseId}:${right.violationCode}`));
    return deepFreeze({
      safetyGuardResults,
      criticalSafetyViolationCount: criticalViolations.length,
      criticalSafetyViolationCodes: unique(criticalViolations.map(item => item.violationCode)),
      criticalViolations
    });
  }

  function buildMigrations(caseResults, baselineById, criticalViolations) {
    const grouped = new Map();
    const criticalByCase = new Map();
    criticalViolations.forEach(violation => {
      if (!criticalByCase.has(violation.calibrationCaseId)) criticalByCase.set(violation.calibrationCaseId, []);
      criticalByCase.get(violation.calibrationCaseId).push(violation.violationCode);
    });
    caseResults.forEach(result => {
      const baseline = baselineById.get(result.calibrationCaseId);
      if (!baseline || baseline.condition === result.condition) return;
      const key = `${baseline.condition}::${result.condition}`;
      if (!grouped.has(key)) grouped.set(key, {
        fromCondition: baseline.condition,
        toCondition: result.condition,
        changedCaseIds: [],
        violationCodes: []
      });
      const migration = grouped.get(key);
      migration.changedCaseIds.push(result.calibrationCaseId);
      migration.violationCodes.push(...list(criticalByCase.get(result.calibrationCaseId)));
    });
    return [...grouped.values()]
      .map(migration => {
        const changedCaseIds = unique(migration.changedCaseIds);
        const violationCodes = unique(migration.violationCodes);
        return {
          fromCondition: migration.fromCondition,
          toCondition: migration.toCondition,
          count: changedCaseIds.length,
          changedCaseIds,
          criticalSafetyViolation: violationCodes.length > 0,
          violationCode: violationCodes[0] || null,
          violationCodes
        };
      })
      .sort((left, right) => lexical(`${left.fromCondition}:${left.toCondition}`, `${right.fromCondition}:${right.toCondition}`));
  }

  function evaluateScenario(fixtures, scenario, baselineById) {
    const candidatePolicy = candidatePolicyForScenario(scenario);
    const validation = validatePolicyVariant(scenario, candidatePolicy);
    if (!validation.valid) throw new Error(`Invalid Sensitivity scenario ${scenario.scenarioId}: ${validation.errors.join(", ")}`);
    const policyBefore = stableJson(conditionEngine.DEFAULT_SLOW_DEAD_CONDITION_POLICY);
    const candidateBefore = stableJson(candidatePolicy);
    const calibrationReport = calibrationRunner.runCalibrationFixtures(fixtures, {
      policy: candidatePolicy,
      analysisOnly: true
    });
    if (calibrationReport.eligible_result_count !== fixtures.length || calibrationReport.excluded_result_count !== 0) {
      throw new Error(`Sensitivity scenario has ineligible Calibration rows: ${scenario.scenarioId}`);
    }
    const caseResults = calibrationReport.results
      .filter(result => result.evaluation_status === "evaluated")
      .map(sensitivityCaseResult);
    if (policyBefore !== stableJson(conditionEngine.DEFAULT_SLOW_DEAD_CONDITION_POLICY)) throw new Error("Sensitivity run mutated productive Policy.");
    if (candidateBefore !== stableJson(candidatePolicy)) throw new Error(`Sensitivity run mutated candidate Policy: ${scenario.scenarioId}`);

    const scenarioBaselineById = baselineById || new Map(caseResults.map(result => [result.calibrationCaseId, result]));
    const safety = evaluateScenarioSafety(fixtures, caseResults, scenarioBaselineById);
    const migrations = buildMigrations(caseResults, scenarioBaselineById, safety.criticalViolations);
    const changedCaseIds = unique(migrations.flatMap(migration => migration.changedCaseIds));
    const fixtureById = new Map(fixtures.map(fixture => [fixture.calibration_case_id, fixture]));
    const boundaryChanges = changedCaseIds
      .filter(caseId => fixtureById.get(caseId)?.boundary_context)
      .map(caseId => ({
        calibrationCaseId: caseId,
        boundaryContext: cloneData(fixtureById.get(caseId).boundary_context),
        fromCondition: scenarioBaselineById.get(caseId).condition,
        toCondition: caseResults.find(result => result.calibrationCaseId === caseId).condition
      }));
    const policyFingerprint = metricsModule.fingerprint("slow-dead-policy", candidatePolicy);
    const resultFingerprint = metricsModule.fingerprint("slow-dead-sensitivity-result", {
      scenarioId: scenario.scenarioId,
      policyFingerprint,
      caseResults,
      criticalViolations: safety.criticalViolations
    });
    return deepFreeze({
      scenarioId: scenario.scenarioId,
      status: "passed",
      sensitivityPlanVersion: THRESHOLD_SENSITIVITY_PLAN_VERSION,
      numericContractVersion: contract.CALIBRATION_NUMERIC_CONTRACT_VERSION,
      variedParameter: scenario.variedParameter,
      baselineValue: scenario.baselineValue,
      candidateValue: scenario.candidateValue,
      analysisOnly: true,
      productionEligible: false,
      activated: false,
      recommended: false,
      analyticallyUnsafe: safety.criticalSafetyViolationCount > 0,
      changedCaseCount: changedCaseIds.length,
      unchangedCaseCount: fixtures.length - changedCaseIds.length,
      changedCaseIds,
      migrations,
      boundaryChanges,
      safetyGuardResults: safety.safetyGuardResults,
      criticalSafetyViolationCount: safety.criticalSafetyViolationCount,
      criticalSafetyViolationCodes: safety.criticalSafetyViolationCodes,
      criticalViolations: safety.criticalViolations,
      policyFingerprint,
      resultFingerprint,
      caseResults
    });
  }

  function blockedSensitivityResult(fixtures, baselineReport, reasonCodes) {
    const status = fixtures.length === 0 ? "insufficient_coverage" : "blocked";
    const eligibleFixtureCount = baselineReport && Number.isInteger(baselineReport.eligible_result_count)
      ? baselineReport.eligible_result_count
      : 0;
    const excludedFixtureCount = baselineReport && Number.isInteger(baselineReport.excluded_result_count)
      ? baselineReport.excluded_result_count
      : fixtures.length;
    const payload = {
      status,
      sensitivityPlanVersion: THRESHOLD_SENSITIVITY_PLAN_VERSION,
      sensitivityRunnerVersion: THRESHOLD_SENSITIVITY_RUNNER_VERSION,
      numericContractVersion: contract.CALIBRATION_NUMERIC_CONTRACT_VERSION,
      principle: "one_factor_at_a_time",
      analysisOnly: true,
      productionEligible: false,
      productivePolicyVersion: contract.CALIBRATION_POLICY_REFERENCE.policyVersion,
      referenceDate: contract.CALIBRATION_REFERENCE_DATE,
      fixtureCount: fixtures.length,
      eligibleFixtureCount,
      excludedFixtureCount,
      expectedScenarioCount: THRESHOLD_SENSITIVITY_PLAN.scenarios.length,
      scenarioCount: 0,
      baselineScenarioId: BASELINE_SCENARIO_ID,
      reasonCodes: unique(reasonCodes),
      policyFingerprint: metricsModule.fingerprint("slow-dead-policy", contract.CALIBRATION_POLICY_REFERENCE),
      fixtureFingerprint: metricsModule.fingerprint("slow-dead-fixtures", fixtures),
      baselineResultFingerprint: null,
      unsafeScenarioCount: 0,
      unsafeScenarioIds: [],
      scenarios: []
    };
    payload.resultFingerprint = metricsModule.fingerprint("slow-dead-sensitivity-analysis", payload);
    return deepFreeze(payload);
  }

  function runThresholdSensitivity(fixtures = [], baselineRunnerResult = null) {
    const baselineValidation = validateProductiveBaseline();
    if (!baselineValidation.valid) throw new Error(`Productive Slow / Dead baseline mismatch: ${baselineValidation.errors.join(", ")}`);
    const sourceFixtures = Array.isArray(fixtures) ? fixtures : [];
    const fixtureValidation = contract.validateCalibrationCaseSet(sourceFixtures);
    const planValidation = validateSensitivityPlan();
    if (!planValidation.valid) throw new Error(`Invalid Sensitivity Plan: ${planValidation.errors.join(", ")}`);

    const fixturesBefore = stableJson(sourceFixtures);
    const policyBefore = stableJson(conditionEngine.DEFAULT_SLOW_DEAD_CONDITION_POLICY);
    const baselineReport = baselineRunnerResult || calibrationRunner.runCalibrationFixtures(sourceFixtures);
    if (!fixtureValidation.valid || baselineReport.eligible_result_count !== sourceFixtures.length || baselineReport.excluded_result_count !== 0) {
      return blockedSensitivityResult(sourceFixtures, baselineReport, [
        ...fixtureValidation.errors,
        ...list(baselineReport.validation_errors)
      ]);
    }
    const baselineScenario = evaluateScenario(sourceFixtures, THRESHOLD_SENSITIVITY_PLAN.scenarios[0], null);
    const baselineById = new Map(baselineScenario.caseResults.map(result => [result.calibrationCaseId, result]));
    const baselineRunnerById = new Map(list(baselineReport.results).map(result => [result.calibration_case_id, result]));
    baselineScenario.caseResults.forEach(result => {
      const defaultResult = baselineRunnerById.get(result.calibrationCaseId);
      if (!defaultResult || defaultResult.actual_condition !== result.condition || defaultResult.condition_signature !== result.conditionSignature) {
        throw new Error(`Explicit baseline path differs from productive default path: ${result.calibrationCaseId}`);
      }
    });

    const scenarios = [baselineScenario];
    THRESHOLD_SENSITIVITY_PLAN.scenarios.slice(1).forEach(scenario => {
      scenarios.push(evaluateScenario(sourceFixtures, scenario, baselineById));
    });
    if (fixturesBefore !== stableJson(sourceFixtures)) throw new Error("Threshold Sensitivity mutated fixtures.");
    if (policyBefore !== stableJson(conditionEngine.DEFAULT_SLOW_DEAD_CONDITION_POLICY)) throw new Error("Threshold Sensitivity mutated productive Policy.");

    const unsafeScenarioIds = scenarios
      .filter(scenario => scenario.analyticallyUnsafe)
      .map(scenario => scenario.scenarioId);
    const payload = {
      status: "passed",
      sensitivityPlanVersion: THRESHOLD_SENSITIVITY_PLAN_VERSION,
      sensitivityRunnerVersion: THRESHOLD_SENSITIVITY_RUNNER_VERSION,
      numericContractVersion: contract.CALIBRATION_NUMERIC_CONTRACT_VERSION,
      principle: "one_factor_at_a_time",
      analysisOnly: true,
      productionEligible: false,
      productivePolicyVersion: contract.CALIBRATION_POLICY_REFERENCE.policyVersion,
      referenceDate: contract.CALIBRATION_REFERENCE_DATE,
      fixtureCount: sourceFixtures.length,
      eligibleFixtureCount: baselineReport.eligible_result_count,
      excludedFixtureCount: baselineReport.excluded_result_count,
      scenarioCount: scenarios.length,
      baselineScenarioId: BASELINE_SCENARIO_ID,
      policyFingerprint: metricsModule.fingerprint("slow-dead-policy", contract.CALIBRATION_POLICY_REFERENCE),
      fixtureFingerprint: metricsModule.fingerprint("slow-dead-fixtures", sourceFixtures),
      baselineResultFingerprint: baselineScenario.resultFingerprint,
      unsafeScenarioCount: unsafeScenarioIds.length,
      unsafeScenarioIds,
      scenarios
    };
    payload.resultFingerprint = metricsModule.fingerprint("slow-dead-sensitivity-analysis", payload);
    return deepFreeze(payload);
  }

  root.slowDead.thresholdSensitivity = Object.freeze({
    version: "2",
    THRESHOLD_SENSITIVITY_PLAN_VERSION,
    THRESHOLD_SENSITIVITY_RUNNER_VERSION,
    BASELINE_SCENARIO_ID,
    EXPECTED_BASELINE_VALUES,
    SENSITIVITY_PARAMETERS,
    CRITICAL_SAFETY_VIOLATION_CODES,
    ANALYSIS_SAFETY_GUARDS,
    THRESHOLD_SENSITIVITY_PLAN,
    validateProductiveBaseline,
    validatePolicyVariant,
    validateSensitivityPlan,
    candidatePolicyForScenario,
    runThresholdSensitivity,
    stableJson
  });
})(typeof globalThis !== "undefined" ? globalThis : this);
