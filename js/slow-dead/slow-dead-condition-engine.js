(function registerSlowDeadConditionEngine(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.slowDead = root.slowDead || {};

  const SLOW_DEAD_CONDITION_MODEL_VERSION = "slow-dead-condition-v1";
  const SLOW_DEAD_CONDITION_POLICY_VERSION = "slow-dead-condition-policy-v1";
  const SLOW_DEAD_ROOT_CAUSE_MODEL_VERSION = "slow-dead-root-cause-candidates-v1";
  const SLOW_DEAD_ACTION_ELIGIBILITY_VERSION = "slow-dead-action-eligibility-v1";

  const REQUIRED_DATA_PACKAGE_TYPES = Object.freeze([
    "demand_forecast",
    "purchase_orders",
    "planning_parameters",
    "quality",
    "finance",
    "actions_outcomes"
  ]);

  const DEFAULT_SLOW_DEAD_CONDITION_POLICY = deepFreeze({
    modelVersion: SLOW_DEAD_CONDITION_MODEL_VERSION,
    policyVersion: SLOW_DEAD_CONDITION_POLICY_VERSION,
    minimumHistoryCoverageMonths: 12,
    minimumHistoryCompleteness: 0.80,
    strongHistoryCompleteness: 0.90,
    slowMovingMonthsSinceLastConsumption: 6,
    slowMovingCoverageMonths: 12,
    minimumSlowEvidenceDimensions: 2,
    nonMovingMonthsSinceLastConsumption: 12,
    deadCandidateMonthsSinceLastConsumption: 18,
    minimumActiveMonthsForRecurringDemand: 2,
    intermittentDemandThreshold: 0.75,
    intermittentRecentConsumptionMonths: 6,
    requireIndependentDeadStockSignal: true
  });

  const CONDITION_PRECEDENCE = Object.freeze([
    "insufficient_evidence",
    "strategic_reserve",
    "intermittent_expected",
    "dead_stock_candidate",
    "non_moving_candidate",
    "slow_moving_candidate",
    "no_case"
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
    if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function normalizeCode(value) {
    return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function finiteNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value !== "string" || !value.trim()) return null;
    if (!/^[+\-]?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?$/.test(value.trim())) return null;
    const number = Number(value.trim());
    return Number.isFinite(number) ? number : null;
  }

  function positiveNumber(value) {
    const number = finiteNumber(value);
    return number !== null && number > 0 ? number : null;
  }

  function nonNegativeNumber(value) {
    const number = finiteNumber(value);
    return number !== null && number >= 0 ? number : null;
  }

  function boolLike(value) {
    if (value === true) return true;
    if (value === false || value === null || value === undefined) return false;
    const text = normalizeText(value).toLowerCase();
    return ["true", "yes", "y", "1", "ja", "x"].includes(text);
  }

  function textIncludes(value, pattern) {
    return pattern.test(normalizeText(value).toLowerCase());
  }

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function unique(values = []) {
    return [...new Set(values.map(value => normalizeText(value)).filter(Boolean))];
  }

  function evidence(code, message, value = null, source = "") {
    return { code, message, value, source };
  }

  function addEvidence(target, code, message, value = null, source = "") {
    target.push(evidence(code, message, value, source));
  }

  function statusFromRuntime(runtime = null) {
    return runtime?.status
      || runtime?.historicalMetricsRuntimeStatus
      || runtime?.result?.status
      || runtime?.result?.historicalMetricsRuntimeStatus
      || "";
  }

  function runtimeResult(runtime = null) {
    return runtime?.result || runtime || null;
  }

  function runtimeIsCurrent(runtime = null) {
    const result = runtimeResult(runtime);
    if (runtime?.stale === true) return false;
    if (runtime?.completedInputSignature && result?.historicalMetricsInputSignature) {
      return runtime.completedInputSignature === result.historicalMetricsInputSignature;
    }
    return true;
  }

  function relationshipState(relationshipEvidence = {}) {
    return relationshipEvidence.relationshipState
      || relationshipEvidence.matchType
      || relationshipEvidence.relationship_status
      || relationshipEvidence.status
      || "";
  }

  function relationshipUsable(relationshipEvidence = {}) {
    const state = relationshipState(relationshipEvidence);
    return ["exact_material_plant", "material_fallback"].includes(state);
  }

  function relationshipStrength(relationshipEvidence = {}) {
    const state = relationshipState(relationshipEvidence);
    if (state === "exact_material_plant") return "strong";
    if (state === "material_fallback") return "medium";
    return "weak";
  }

  function limitationSet(metric = {}, relationshipEvidence = {}) {
    return unique([
      ...list(metric.history_metric_limitation_codes),
      ...list(metric.limitationCodes),
      ...list(metric.provenance?.exclusionReasons),
      ...list(relationshipEvidence.limitationCodes),
      ...list(relationshipEvidence.exclusionReasons),
      relationshipEvidence.reason
    ]);
  }

  function hasCriticalUnitLimitation(codes = []) {
    return codes.some(code => [
      "unit_conflict",
      "multiple_units",
      "multiple_units_for_entity",
      "inventory_history_unit_mismatch",
      "missing_unit",
      "missing_unit_for_entity",
      "inventory_unit_missing",
      "inventory_unit_conflict",
      "stock_quantity_missing",
      "stock_quantity_invalid",
      "missing_consumption_quantity",
      "invalid_consumption_quantity",
      "numeric_evidence_unavailable"
    ].includes(code));
  }

  function inventoryExposure(inventoryEvidence = {}) {
    const stockQuantity = finiteNumber(inventoryEvidence.stock_quantity);
    const stockValue = finiteNumber(inventoryEvidence.stock_value);
    const values = [
      inventoryEvidence.excess_value,
      inventoryEvidence.no_need_value,
      inventoryEvidence.no_plan_value,
      inventoryEvidence.bad_stock_value,
      inventoryEvidence.blocked_quality_value,
      inventoryEvidence.recovery_potential
    ].map(finiteNumber).filter(value => value !== null);
    return {
      stockQuantity,
      stockValue,
      hasExposure: (stockQuantity !== null && stockQuantity > 0)
        || (stockValue !== null && stockValue > 0)
        || values.some(value => value > 0)
    };
  }

  function demandSignal(inventoryEvidence = {}, independentSignals = {}) {
    return Boolean(
      boolLike(independentSignals.noDemand)
      || boolLike(independentSignals.noCurrentDemand)
      || positiveNumber(inventoryEvidence.no_need_value) !== null
      || positiveNumber(inventoryEvidence.no_need_quantity) !== null
      || boolLike(inventoryEvidence.no_need_flag)
      || textIncludes(inventoryEvidence.category, /no demand|no need|ohne bedarf/)
    );
  }

  function planningSignal(inventoryEvidence = {}, independentSignals = {}) {
    return Boolean(
      boolLike(independentSignals.noPlan)
      || boolLike(independentSignals.noPlanningReference)
      || positiveNumber(inventoryEvidence.no_plan_value) !== null
      || positiveNumber(inventoryEvidence.no_plan_quantity) !== null
      || boolLike(inventoryEvidence.no_plan_flag)
      || textIncludes(inventoryEvidence.category, /no plan|unplanned|ohne plan/)
    );
  }

  function lifecycleSignal(inventoryEvidence = {}, materialMasterContext = {}, independentSignals = {}) {
    const texts = [
      inventoryEvidence.lifecycle_status,
      inventoryEvidence.material_status,
      inventoryEvidence.status_safety,
      inventoryEvidence.finance_classification,
      materialMasterContext.lifecycle_status,
      materialMasterContext.material_status,
      materialMasterContext.discontinuation_status,
      independentSignals.lifecycleStatus
    ].join(" ");
    return Boolean(
      boolLike(independentSignals.lifecycleEnding)
      || boolLike(inventoryEvidence.lifecycle_ending)
      || boolLike(materialMasterContext.lifecycle_ending)
      || textIncludes(texts, /obsolete|obsoles|discontinued|phase.?out|end.?of.?life|program.?end|auslauf|abgekündigt|totbestand/)
    );
  }

  function reserveSignal(inventoryEvidence = {}, materialMasterContext = {}, independentSignals = {}) {
    const texts = [
      inventoryEvidence.reserve_status,
      inventoryEvidence.status_safety,
      inventoryEvidence.supply_type,
      inventoryEvidence.planning_type,
      inventoryEvidence.finance_classification,
      materialMasterContext.reserve_status,
      materialMasterContext.supply_type,
      independentSignals.reserveStatus
    ].join(" ");
    return Boolean(
      boolLike(independentSignals.strategicReserve)
      || boolLike(inventoryEvidence.strategic_reserve)
      || boolLike(materialMasterContext.strategic_reserve)
      || textIncludes(texts, /strategic reserve|critical spare|sicherheitsbestand|reservebestand|service stock|safety reserve/)
    );
  }

  function purchaseOrderSignal(inventoryEvidence = {}, independentSignals = {}) {
    return Boolean(
      boolLike(independentSignals.openPurchaseOrder)
      || positiveNumber(inventoryEvidence.open_purchase_order_value) !== null
      || positiveNumber(inventoryEvidence.open_po_value) !== null
      || positiveNumber(inventoryEvidence.purchase_order_value) !== null
      || normalizeText(inventoryEvidence.purchase_order)
      || normalizeText(inventoryEvidence.po_number)
    );
  }

  function minimumOrderSignal(inventoryEvidence = {}, materialMasterContext = {}) {
    return Boolean(
      positiveNumber(inventoryEvidence.minimum_order_quantity) !== null
      || positiveNumber(inventoryEvidence.minimum_lot_size) !== null
      || positiveNumber(materialMasterContext.minimum_order_quantity) !== null
      || positiveNumber(materialMasterContext.minimum_lot_size) !== null
    );
  }

  function metricValue(metric = {}, key) {
    return finiteNumber(metric[key]);
  }

  function historyEvidenceState(metric = {}, relationshipEvidence = {}, runtime = null, policy = DEFAULT_SLOW_DEAD_CONDITION_POLICY) {
    const runtimeStatus = statusFromRuntime(runtime);
    const result = runtimeResult(runtime);
    const limitations = limitationSet(metric, relationshipEvidence);
    const missing = [];
    const gate = {
      usable: true,
      limitations,
      missing
    };
    if (!["available", "limited"].includes(runtimeStatus || result?.status || "")) {
      gate.usable = false;
      limitations.push("historical_runtime_unavailable");
      missing.push("consumption_history");
    }
    if (!runtimeIsCurrent(runtime)) {
      gate.usable = false;
      limitations.push("historical_runtime_stale");
    }
    if (!relationshipUsable(relationshipEvidence)) {
      gate.usable = false;
      const state = normalizeCode(relationshipState(relationshipEvidence) || "relationship_unavailable");
      limitations.push(state === "ambiguous" ? "relationship_ambiguous" : state === "invalid_key" ? "relationship_invalid" : "relationship_unmatched");
      missing.push("relationship_evidence");
    }
    const coverageMonths = metricValue(metric, "history_coverage_months");
    const completeness = metricValue(metric, "history_completeness");
    const monthsSince = metricValue(metric, "months_since_last_consumption");
    const net12 = metricValue(metric, "net_consumption_quantity_12m");
    if (coverageMonths === null || coverageMonths < policy.minimumHistoryCoverageMonths) {
      gate.usable = false;
      limitations.push("history_coverage_below_policy");
      missing.push("twelve_month_consumption_history");
    }
    if (completeness === null || completeness < policy.minimumHistoryCompleteness) {
      gate.usable = false;
      limitations.push("history_completeness_below_policy");
      missing.push("complete_consumption_history");
    }
    if (monthsSince === null) {
      gate.usable = false;
      limitations.push("months_since_last_consumption_missing");
      missing.push("last_consumption_date");
    }
    if (net12 === null) {
      gate.usable = false;
      limitations.push("net_consumption_12m_missing");
      missing.push("rolling_consumption_quantity");
    }
    if (hasCriticalUnitLimitation(limitations)) {
      gate.usable = false;
      missing.push("unit_consistency");
    }
    return {
      ...gate,
      limitations: unique(limitations),
      missing: unique(missing)
    };
  }

  function slowMovingDrivers(metric = {}, policy = DEFAULT_SLOW_DEAD_CONDITION_POLICY) {
    const drivers = [];
    const monthsSince = metricValue(metric, "months_since_last_consumption");
    const coverage = metricValue(metric, "inventory_coverage_months");
    const trend = normalizeCode(metric.consumption_trend);
    const trendRatio = metricValue(metric, "consumption_trend_ratio");
    const activeMonths = metricValue(metric, "active_consumption_months_12m");
    const movementFrequency = metricValue(metric, "movement_frequency_12m");
    if (monthsSince !== null && monthsSince >= policy.slowMovingMonthsSinceLastConsumption) drivers.push("aged_last_consumption");
    if (coverage !== null && coverage >= policy.slowMovingCoverageMonths) drivers.push("high_inventory_coverage");
    if (trend === "declining" || (trendRatio !== null && trendRatio <= -0.10)) drivers.push("declining_consumption");
    if (activeMonths !== null && activeMonths <= 4) drivers.push("low_active_month_count");
    if (movementFrequency !== null && movementFrequency <= 3) drivers.push("low_movement_frequency");
    return unique(drivers);
  }

  function classify(input = {}, policy = DEFAULT_SLOW_DEAD_CONDITION_POLICY) {
    const inventoryEvidence = input.inventoryEvidence || {};
    const historicalEvidence = input.historicalEvidence || {};
    const relationshipEvidence = input.relationshipEvidence || {};
    const materialMasterContext = input.materialMasterContext || {};
    const independentSignals = input.independentSignals || {};
    const runtime = input.historicalRuntime || input.historicalMetricsRuntime || null;
    const positive = [];
    const counter = [];
    const missing = [];
    const limitations = [];
    const exposure = inventoryExposure(inventoryEvidence);
    if (!exposure.hasExposure) {
      addEvidence(counter, "no_inventory_exposure", "No stock quantity, value or issue exposure exists.", exposure, "inventory");
      return {
        condition_code: null,
        condition_status: "no_case",
        positive_evidence: positive,
        counter_evidence: counter,
        limitation_codes: [],
        missing_evidence: [],
        slow_moving_drivers: [],
        independent_dead_stock_signal: false,
        strategic_reserve_signal: false
      };
    }
    addEvidence(positive, "inventory_exposure_exists", "Inventory exposure exists at entity level.", exposure, "inventory");
    const gate = historyEvidenceState(historicalEvidence, relationshipEvidence, runtime, policy);
    limitations.push(...gate.limitations);
    missing.push(...gate.missing);
    if (!gate.usable) {
      addEvidence(counter, "critical_history_gate_failed", "Historical evidence is not reliable enough for Slow / Dead classification.", gate.limitations, "history");
      return {
        condition_code: "insufficient_evidence",
        condition_status: "insufficient_evidence",
        positive_evidence: positive,
        counter_evidence: counter,
        limitation_codes: unique(limitations),
        missing_evidence: unique(missing),
        slow_moving_drivers: [],
        independent_dead_stock_signal: false,
        strategic_reserve_signal: false
      };
    }
    const reserve = reserveSignal(inventoryEvidence, materialMasterContext, independentSignals);
    if (reserve) {
      addEvidence(positive, "explicit_strategic_reserve", "Explicit strategic reserve evidence is present.", true, "inventory");
      return {
        condition_code: "strategic_reserve",
        condition_status: "strategic_reserve",
        positive_evidence: positive,
        counter_evidence: counter,
        limitation_codes: unique(limitations),
        missing_evidence: unique(missing),
        slow_moving_drivers: [],
        independent_dead_stock_signal: false,
        strategic_reserve_signal: true
      };
    }
    addEvidence(counter, "no_explicit_strategic_reserve", "No explicit strategic reserve evidence is present.", false, "inventory");
    const monthsSince = metricValue(historicalEvidence, "months_since_last_consumption");
    const net3 = metricValue(historicalEvidence, "net_consumption_quantity_3m");
    const net6 = metricValue(historicalEvidence, "net_consumption_quantity_6m");
    const net12 = metricValue(historicalEvidence, "net_consumption_quantity_12m");
    const activeMonths = metricValue(historicalEvidence, "active_consumption_months_12m");
    const intermittency = metricValue(historicalEvidence, "intermittency_ratio_12m");
    const completeness = metricValue(historicalEvidence, "history_completeness");
    const hasDemand = demandSignal(inventoryEvidence, independentSignals);
    const hasNoPlan = planningSignal(inventoryEvidence, independentSignals);
    const hasLifecycle = lifecycleSignal(inventoryEvidence, materialMasterContext, independentSignals);
    const independentDeadSignal = Boolean(hasDemand || hasNoPlan || hasLifecycle);
    if (independentDeadSignal) {
      addEvidence(positive, "independent_dead_stock_signal", "Independent demand, planning or lifecycle evidence exists.", { hasDemand, hasNoPlan, hasLifecycle }, "inventory");
    } else {
      addEvidence(counter, "no_independent_dead_stock_signal", "No independent demand, planning or lifecycle evidence exists.", false, "inventory");
    }
    if (
      net12 !== null
      && net12 > 0
      && activeMonths !== null
      && activeMonths >= policy.minimumActiveMonthsForRecurringDemand
      && intermittency !== null
      && intermittency >= policy.intermittentDemandThreshold
      && monthsSince !== null
      && monthsSince <= policy.intermittentRecentConsumptionMonths
      && !independentDeadSignal
    ) {
      addEvidence(positive, "intermittent_recurring_consumption", "Recurring but intermittent consumption is present.", { net12, activeMonths, intermittency, monthsSince }, "history");
      return {
        condition_code: "intermittent_expected",
        condition_status: "intermittent_expected",
        positive_evidence: positive,
        counter_evidence: counter,
        limitation_codes: unique(limitations),
        missing_evidence: unique(missing),
        slow_moving_drivers: [],
        independent_dead_stock_signal: independentDeadSignal,
        strategic_reserve_signal: false
      };
    }
    const deadAge = monthsSince !== null && monthsSince >= policy.deadCandidateMonthsSinceLastConsumption;
    const noRecentConsumption = (net12 !== null && net12 <= 0) || normalizeCode(historicalEvidence.history_metric_status) === "unavailable";
    if (
      deadAge
      && noRecentConsumption
      && completeness !== null
      && completeness >= policy.strongHistoryCompleteness
      && (!policy.requireIndependentDeadStockSignal || independentDeadSignal)
    ) {
      addEvidence(positive, "dead_stock_evidence", "No recent consumption plus independent business evidence supports a Dead Stock Candidate.", { monthsSince, net12, completeness }, "history");
      return {
        condition_code: "dead_stock_candidate",
        condition_status: "candidate",
        positive_evidence: positive,
        counter_evidence: counter,
        limitation_codes: unique(limitations),
        missing_evidence: unique(missing),
        slow_moving_drivers: [],
        independent_dead_stock_signal: independentDeadSignal,
        strategic_reserve_signal: false
      };
    }
    if (deadAge && noRecentConsumption && !independentDeadSignal) {
      addEvidence(counter, "dead_age_without_independent_signal", "Age alone is not enough for Dead Stock Candidate classification.", { monthsSince, net12 }, "history");
    }
    if (
      monthsSince !== null
      && monthsSince >= policy.nonMovingMonthsSinceLastConsumption
      && (net3 === null || net3 <= 0)
      && (net6 === null || net6 <= 0)
    ) {
      addEvidence(positive, "non_moving_evidence", "No recent movement was observed in the policy window.", { monthsSince, net3, net6 }, "history");
      return {
        condition_code: "non_moving_candidate",
        condition_status: "candidate",
        positive_evidence: positive,
        counter_evidence: counter,
        limitation_codes: unique(limitations),
        missing_evidence: unique(missing),
        slow_moving_drivers: [],
        independent_dead_stock_signal: independentDeadSignal,
        strategic_reserve_signal: false
      };
    }
    const drivers = slowMovingDrivers(historicalEvidence, policy);
    if (net12 !== null && net12 > 0 && drivers.length >= policy.minimumSlowEvidenceDimensions) {
      addEvidence(positive, "slow_moving_evidence", "Multiple Slow-Moving evidence dimensions are present.", drivers, "history");
      return {
        condition_code: "slow_moving_candidate",
        condition_status: "candidate",
        positive_evidence: positive,
        counter_evidence: counter,
        limitation_codes: unique(limitations),
        missing_evidence: unique(missing),
        slow_moving_drivers: drivers,
        independent_dead_stock_signal: independentDeadSignal,
        strategic_reserve_signal: false
      };
    }
    addEvidence(counter, "slow_dead_thresholds_not_met", "Slow / Dead thresholds are not met.", { monthsSince, net12, drivers }, "history");
    return {
      condition_code: null,
      condition_status: "no_case",
      positive_evidence: positive,
      counter_evidence: counter,
      limitation_codes: unique(limitations),
      missing_evidence: unique(missing),
      slow_moving_drivers: drivers,
      independent_dead_stock_signal: independentDeadSignal,
      strategic_reserve_signal: false
    };
  }

  function evidenceStrength(classification = {}, relationshipEvidence = {}, historicalEvidence = {}) {
    if (classification.condition_code === "insufficient_evidence") return "insufficient";
    if (!classification.condition_code) return "not_applicable";
    const limitations = list(classification.limitation_codes);
    const completeness = metricValue(historicalEvidence, "history_completeness");
    const relationship = relationshipStrength(relationshipEvidence);
    if (!limitations.length && completeness !== null && completeness >= 0.90 && relationship === "strong") return "high";
    if (!hasCriticalUnitLimitation(limitations) && completeness !== null && completeness >= 0.80 && relationship !== "weak") return "medium";
    return "low";
  }

  function conditionConfidence(conditionCode, strength, classification = {}) {
    if (conditionCode === "insufficient_evidence") return "unavailable";
    if (!conditionCode) return "not_applicable";
    if (conditionCode === "dead_stock_candidate" && !classification.independent_dead_stock_signal) return "low";
    if (strength === "high") return "high";
    if (strength === "medium") return "medium";
    return "low";
  }

  function addMissingForCondition(conditionCode, missing = [], inventoryEvidence = {}, independentSignals = {}) {
    const next = [...missing];
    if (["slow_moving_candidate", "non_moving_candidate", "dead_stock_candidate"].includes(conditionCode)) {
      next.push("future_demand", "planning_context", "material_lifecycle_status");
    }
    if (conditionCode === "dead_stock_candidate") {
      next.push("finance_review_context", "quality_or_block_status", "commercial_sellability");
    }
    if (!purchaseOrderSignal(inventoryEvidence, independentSignals)) next.push("supplier_terms_or_open_po_context");
    return unique(next);
  }

  function requiredPackages(conditionCode, inventoryEvidence = {}, independentSignals = {}) {
    const packages = [];
    if (["slow_moving_candidate", "non_moving_candidate", "dead_stock_candidate", "intermittent_expected"].includes(conditionCode)) packages.push("demand_forecast");
    if (["slow_moving_candidate", "non_moving_candidate", "dead_stock_candidate"].includes(conditionCode)) packages.push("planning_parameters");
    if (conditionCode === "dead_stock_candidate") packages.push("finance", "quality");
    if (purchaseOrderSignal(inventoryEvidence, independentSignals) || ["slow_moving_candidate", "non_moving_candidate", "dead_stock_candidate"].includes(conditionCode)) packages.push("purchase_orders");
    packages.push("actions_outcomes");
    return unique(packages).filter(type => REQUIRED_DATA_PACKAGE_TYPES.includes(type));
  }

  function rootCauseCandidates(conditionCode, input = {}, classification = {}) {
    const inventoryEvidence = input.inventoryEvidence || {};
    const materialMasterContext = input.materialMasterContext || {};
    const independentSignals = input.independentSignals || {};
    const candidates = [];
    function push(code, label, evidenceCodes = []) {
      candidates.push({
        root_cause_code: code,
        label,
        evidence_codes: evidenceCodes,
        confidence: evidenceCodes.length ? "candidate" : "review_required",
        model_version: SLOW_DEAD_ROOT_CAUSE_MODEL_VERSION
      });
    }
    if (conditionCode === "insufficient_evidence") {
      push("missing_or_unreliable_history", "Missing or unreliable historical evidence", ["critical_history_gate_failed"]);
      return candidates;
    }
    if (conditionCode === "strategic_reserve") {
      push("explicit_strategic_reserve", "Explicit strategic reserve policy", ["explicit_strategic_reserve"]);
      return candidates;
    }
    if (conditionCode === "intermittent_expected") {
      push("intermittent_recurring_demand", "Intermittent but recurring demand pattern", ["intermittent_recurring_consumption"]);
      return candidates;
    }
    if (demandSignal(inventoryEvidence, independentSignals)) push("demand_discontinuity", "No visible current demand", ["independent_dead_stock_signal"]);
    if (planningSignal(inventoryEvidence, independentSignals)) push("planning_reference_missing", "Missing or unclear planning reference", ["independent_dead_stock_signal"]);
    if (lifecycleSignal(inventoryEvidence, materialMasterContext, independentSignals)) push("lifecycle_or_program_end", "Lifecycle, program or material status indicates end of use", ["independent_dead_stock_signal"]);
    if (minimumOrderSignal(inventoryEvidence, materialMasterContext)) push("lot_size_or_moq_policy", "Lot-size or MOQ policy may create residual stock", ["minimum_order_quantity"]);
    if (purchaseOrderSignal(inventoryEvidence, independentSignals)) push("purchase_order_continuation", "Open purchase order context may increase exposure", ["open_purchase_order"]);
    if (classification.slow_moving_drivers?.includes("high_inventory_coverage")) push("planning_parameter_mismatch", "Inventory coverage is high compared with consumption", ["high_inventory_coverage"]);
    if (!candidates.length && conditionCode) push("requires_cross_functional_review", "Cause requires cross-functional review", list(classification.positive_evidence).map(item => item.code));
    return candidates;
  }

  function recoveryCaseEligibility(conditionCode, classification = {}) {
    if (!conditionCode) {
      return { eligibility: "no_case", reason_codes: ["condition_not_triggered"] };
    }
    if (conditionCode === "insufficient_evidence") {
      return { eligibility: "evidence_required", reason_codes: ["critical_evidence_missing"] };
    }
    if (conditionCode === "strategic_reserve") {
      return { eligibility: "monitor_only", reason_codes: ["explicit_strategic_reserve"] };
    }
    if (conditionCode === "intermittent_expected") {
      return { eligibility: "monitor_only", reason_codes: ["recurring_intermittent_demand"] };
    }
    return { eligibility: "reviewable_case_candidate", reason_codes: list(classification.positive_evidence).map(item => item.code) };
  }

  function action(code, label, status, reasonCodes = [], requiredPackagesValue = []) {
    return {
      action_code: code,
      label,
      eligibility_status: status,
      reason_codes: unique(reasonCodes),
      required_data_packages: unique(requiredPackagesValue).filter(type => REQUIRED_DATA_PACKAGE_TYPES.includes(type)),
      version: SLOW_DEAD_ACTION_ELIGIBILITY_VERSION
    };
  }

  function actionEligibility(conditionCode, input = {}, classification = {}) {
    const inventoryEvidence = input.inventoryEvidence || {};
    const independentSignals = input.independentSignals || {};
    const actions = [];
    if (conditionCode === "insufficient_evidence") {
      actions.push(action("COLLECT_EVIDENCE", "Collect missing evidence", "eligible", ["critical_evidence_missing"], ["demand_forecast", "planning_parameters"]));
      actions.push(action("IMPORT_MISSING_DATA", "Import missing data packages", "review_required", classification.missing_evidence || [], ["demand_forecast", "purchase_orders", "planning_parameters"]));
      actions.push(action("OWNER_REVIEW", "Assign owner review", "review_required", ["classification_unavailable"], ["actions_outcomes"]));
      return actions;
    }
    if (conditionCode === "strategic_reserve") {
      actions.push(action("MONITOR", "Monitor strategic reserve", "eligible", ["explicit_strategic_reserve"], ["actions_outcomes"]));
      actions.push(action("PLANNING_PARAMETER_REVIEW", "Review reserve policy and safety stock", "review_required", ["explicit_strategic_reserve"], ["planning_parameters"]));
      actions.push(action("DISPOSAL_REVIEW", "Disposal review", "not_recommendable", ["strategic_reserve_protected"], ["finance", "quality"]));
      return actions;
    }
    if (conditionCode === "intermittent_expected") {
      actions.push(action("MONITOR", "Monitor intermittent demand", "eligible", ["intermittent_recurring_demand"], ["actions_outcomes"]));
      actions.push(action("CONSUME_NATURALLY", "Consume naturally through recurring demand", "potentially_eligible", ["recurring_consumption"], ["demand_forecast"]));
      actions.push(action("PLANNING_PARAMETER_REVIEW", "Review planning parameters", "review_required", ["intermittent_pattern"], ["planning_parameters"]));
      return actions;
    }
    const transferReady = boolLike(independentSignals.transferDestinationConsumption) && boolLike(independentSignals.sameMaterialOtherContext);
    actions.push(action(
      "INTERNAL_TRANSFER",
      "Review internal transfer",
      transferReady ? "potentially_eligible" : "review_required",
      transferReady ? ["destination_consumption_signal"] : ["destination_evidence_missing"],
      ["demand_forecast", "planning_parameters"]
    ));
    actions.push(action(
      "SUPPLIER_RETURN",
      "Review supplier return",
      purchaseOrderSignal(inventoryEvidence, independentSignals) ? "review_required" : "unavailable_until_evidence",
      purchaseOrderSignal(inventoryEvidence, independentSignals) ? ["open_purchase_order_context"] : ["supplier_terms_missing"],
      ["purchase_orders"]
    ));
    actions.push(action("ALTERNATIVE_USE", "Review alternative use", "review_required", ["technical_and_demand_review_required"], ["demand_forecast", "planning_parameters"]));
    actions.push(action("EXTERNAL_SALE", "Review external sale", "manual_commercial_review", ["commercial_sellability_missing"], ["quality", "finance"]));
    actions.push(action("WRITE_DOWN_REVIEW", "Finance write-down review", "eligible_for_finance_review", ["finance_review_required"], ["finance"]));
    actions.push(action(
      "DISPOSAL_REVIEW",
      "Disposal review",
      conditionCode === "dead_stock_candidate" && classification.independent_dead_stock_signal ? "review_required" : "not_recommendable",
      conditionCode === "dead_stock_candidate" ? ["manual_approval_required"] : ["disposal_not_supported_by_condition"],
      ["finance", "quality"]
    ));
    actions.push(action(
      "PO_REDUCE",
      "Review purchase order reduction",
      purchaseOrderSignal(inventoryEvidence, independentSignals) ? "review_required" : "unavailable_until_evidence",
      purchaseOrderSignal(inventoryEvidence, independentSignals) ? ["open_purchase_order_context"] : ["open_purchase_order_evidence_missing"],
      ["purchase_orders"]
    ));
    return actions;
  }

  function evaluateCondition(input = {}, policyInput = DEFAULT_SLOW_DEAD_CONDITION_POLICY) {
    const policy = deepFreeze({ ...DEFAULT_SLOW_DEAD_CONDITION_POLICY, ...(policyInput || {}) });
    const classification = classify(input, policy);
    const conditionCode = classification.condition_code;
    const strength = evidenceStrength(classification, input.relationshipEvidence || {}, input.historicalEvidence || {});
    const confidence = conditionConfidence(conditionCode, strength, classification);
    const missingEvidence = addMissingForCondition(conditionCode, classification.missing_evidence || [], input.inventoryEvidence || {}, input.independentSignals || {});
    const result = {
      condition_code: conditionCode,
      condition_status: classification.condition_status,
      condition_precedence: CONDITION_PRECEDENCE,
      evidence_strength: strength,
      condition_confidence: confidence,
      positive_evidence: cloneData(classification.positive_evidence || []),
      counter_evidence: cloneData(classification.counter_evidence || []),
      limitation_codes: unique(classification.limitation_codes || []),
      missing_evidence: missingEvidence,
      root_cause_candidates: rootCauseCandidates(conditionCode, input, { ...classification, missing_evidence: missingEvidence }),
      recovery_case_eligibility: recoveryCaseEligibility(conditionCode, classification),
      action_eligibility: actionEligibility(conditionCode, input, { ...classification, missing_evidence: missingEvidence }),
      required_data_packages: requiredPackages(conditionCode, input.inventoryEvidence || {}, input.independentSignals || {}),
      slow_moving_drivers: cloneData(classification.slow_moving_drivers || []),
      independent_dead_stock_signal: classification.independent_dead_stock_signal === true,
      strategic_reserve_signal: classification.strategic_reserve_signal === true,
      model_versions: {
        condition_model: SLOW_DEAD_CONDITION_MODEL_VERSION,
        condition_policy: SLOW_DEAD_CONDITION_POLICY_VERSION,
        root_cause_model: SLOW_DEAD_ROOT_CAUSE_MODEL_VERSION,
        action_eligibility: SLOW_DEAD_ACTION_ELIGIBILITY_VERSION
      },
      policy: cloneData(policy)
    };
    result.condition_signature = `slow-dead-condition:${SLOW_DEAD_CONDITION_MODEL_VERSION}:${stableJson({
      conditionCode,
      strength,
      confidence,
      positive: result.positive_evidence.map(item => item.code),
      counter: result.counter_evidence.map(item => item.code),
      limitations: result.limitation_codes,
      missing: result.missing_evidence,
      actions: result.action_eligibility.map(item => [item.action_code, item.eligibility_status])
    })}`;
    return result;
  }

  function evaluateConditions(inputs = [], policy = DEFAULT_SLOW_DEAD_CONDITION_POLICY) {
    return list(inputs).map(input => evaluateCondition(input, policy));
  }

  function createSlowDeadConditionEngine(options = {}) {
    const policy = deepFreeze({ ...DEFAULT_SLOW_DEAD_CONDITION_POLICY, ...(options.policy || {}) });
    return Object.freeze({
      version: "1",
      SLOW_DEAD_CONDITION_MODEL_VERSION,
      SLOW_DEAD_CONDITION_POLICY_VERSION,
      SLOW_DEAD_ROOT_CAUSE_MODEL_VERSION,
      SLOW_DEAD_ACTION_ELIGIBILITY_VERSION,
      CONDITION_PRECEDENCE,
      evaluateCondition: input => evaluateCondition(input, policy),
      evaluateConditions: inputs => evaluateConditions(inputs, policy),
      getPolicy: () => cloneData(policy),
      getModelVersion: () => SLOW_DEAD_CONDITION_MODEL_VERSION,
      stableJson
    });
  }

  root.slowDead.conditionEngine = Object.freeze({
    version: "1",
    SLOW_DEAD_CONDITION_MODEL_VERSION,
    SLOW_DEAD_CONDITION_POLICY_VERSION,
    SLOW_DEAD_ROOT_CAUSE_MODEL_VERSION,
    SLOW_DEAD_ACTION_ELIGIBILITY_VERSION,
    DEFAULT_SLOW_DEAD_CONDITION_POLICY,
    CONDITION_PRECEDENCE,
    REQUIRED_DATA_PACKAGE_TYPES,
    createSlowDeadConditionEngine,
    evaluateCondition,
    evaluateConditions,
    stableJson
  });
})(window);
