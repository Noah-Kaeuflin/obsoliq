(function registerInventoryRiskCaseContract(global) {
  "use strict";

  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.inventoryRisks = root.inventoryRisks || {};

  const VERSION = "IR-01A-1";
  const RISK_FAMILIES = Object.freeze(["excess_demand", "slow_dead", "blocked_quality"]);
  const RISK_SUBTYPES = Object.freeze([
    "excess",
    "no_demand",
    "unplanned",
    "slow_moving",
    "non_moving",
    "dead_stock_candidate",
    "intermittent_expected",
    "strategic_reserve",
    "blocked",
    "quality_inspection",
    "multiple"
  ]);
  const VALUE_SEMANTICS = Object.freeze({
    excess_demand: "net_addressable_recovery",
    slow_dead: "inventory_exposure",
    blocked_quality: "blocked_quality_value"
  });

  function text(value) {
    return value === null || value === undefined ? "" : String(value).trim();
  }

  function clone(value, fallback) {
    if (value === undefined) return fallback;
    return JSON.parse(JSON.stringify(value));
  }

  function unique(values = []) {
    return [...new Set((Array.isArray(values) ? values : [values]).map(text).filter(Boolean))];
  }

  function nullableNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  function normalizePriority(value) {
    const normalized = text(value).toLowerCase().replace(/[\s-]+/g, "_");
    if (["critical", "kritisch"].includes(normalized)) return "critical";
    if (["high", "hoch"].includes(normalized)) return "high";
    if (["medium", "mittel"].includes(normalized)) return "medium";
    if (["low", "niedrig"].includes(normalized)) return "low";
    return "review_required";
  }

  function inventoryEntityKey(input = {}) {
    const existing = text(input.inventory_entity_key || input.inventoryEntityKey);
    if (existing) return existing;
    const materialId = text(input.material_id || input.materialId);
    const plant = text(input.plant || input.profit_center || input.profitCenter);
    if (!materialId) return "";
    return `material:${materialId}|plant:${plant}`;
  }

  function normalizeFamily(value) {
    const family = text(value);
    return RISK_FAMILIES.includes(family) ? family : "";
  }

  function normalizeSubtype(value, family) {
    const subtype = text(value);
    if (RISK_SUBTYPES.includes(subtype)) return subtype;
    if (family === "excess_demand") return "excess";
    if (family === "slow_dead") return "multiple";
    if (family === "blocked_quality") return "blocked";
    return "multiple";
  }

  function missingIdentityDiagnostic(input = {}, family = "", familyCaseId = "") {
    return {
      code: "missing_inventory_entity_identity",
      severity: "error",
      scope: "inventory_risk_case_composition",
      primary_risk_family: family,
      family_case_id: familyCaseId,
      inventory_row_keys: unique(input.inventory_row_keys || input.inventory_row_key),
      material_id: text(input.material_id),
      plant: text(input.plant || input.profit_center),
      disposition: "excluded_from_inventory_risk_portfolio",
      message_key: "inventory_risk_material_identity_missing"
    };
  }

  function createFamilyCase(input = {}) {
    const family = normalizeFamily(input.primary_risk_family || input.risk_family);
    if (!family) throw new Error("Inventory Risk Family Case requires a supported primary_risk_family.");
    const familyCaseId = text(input.family_case_id || input.case_id);
    const entityKey = inventoryEntityKey(input);
    if (!familyCaseId) {
      const error = new Error("Inventory Risk Family Case requires family_case_id.");
      error.code = "INVENTORY_RISK_FAMILY_CASE_ID_REQUIRED";
      throw error;
    }
    if (!entityKey) {
      const error = new Error("Inventory Risk Family Case requires inventory_entity_key.");
      error.code = "INVENTORY_RISK_ENTITY_IDENTITY_REQUIRED";
      error.inventoryRiskDiagnostic = missingIdentityDiagnostic(input, family, familyCaseId);
      throw error;
    }
    const scoreAvailable = family === "excess_demand"
      && input.score_status === "available"
      && nullableNumber(input.score_value) !== null;
    return {
      contract_version: VERSION,
      case_kind: "family",
      family_case_id: familyCaseId,
      portfolio_case_id: text(input.portfolio_case_id),
      inventory_entity_key: entityKey,
      inventory_row_keys: unique(input.inventory_row_keys || input.inventory_row_key),
      material_id: text(input.material_id),
      material_description: text(input.material_description),
      plant: text(input.plant),
      profit_center: text(input.profit_center),
      program: text(input.program),
      primary_risk_family: family,
      primary_risk_subtype: normalizeSubtype(input.primary_risk_subtype, family),
      secondary_risk_signals: [],
      family_case_ids: { [family]: familyCaseId },
      priority: normalizePriority(input.priority),
      prioritization_status: text(input.prioritization_status) || "projected_from_family_evidence",
      score_status: scoreAvailable ? "available" : family === "excess_demand" ? text(input.score_status) || "unavailable" : "not_supported",
      score_model_id: scoreAvailable ? text(input.score_model_id) : "",
      score_value: scoreAvailable ? nullableNumber(input.score_value) : null,
      value_semantic: VALUE_SEMANTICS[family],
      inventory_exposure: nullableNumber(input.inventory_exposure),
      net_addressable_value: nullableNumber(input.net_addressable_value),
      blocked_quality_value: nullableNumber(input.blocked_quality_value),
      currency: text(input.currency) || "EUR",
      owner_function: text(input.owner_function),
      owner_reference: text(input.owner_reference),
      owner_source: text(input.owner_source) || "none",
      owner_assignment_confidence: text(input.owner_assignment_confidence) || "Low",
      evidence_status: text(input.evidence_status) || "unavailable",
      evidence: clone(input.evidence, []),
      counter_evidence: clone(input.counter_evidence, []),
      limitations: unique(input.limitations),
      missing_evidence: unique(input.missing_evidence),
      next_step: text(input.next_step),
      decision_type: text(input.decision_type),
      action_eligibility: clone(input.action_eligibility, []),
      linked_action_target: clone(input.linked_action_target, null),
      inventory_navigation_target: clone(input.inventory_navigation_target, null),
      source_package_ids: unique(input.source_package_ids),
      source_package_revisions: unique(input.source_package_revisions),
      provenance: clone(input.provenance, {}),
      capability_status: text(input.capability_status) || "available",
      family_payload: input.family_payload || null
    };
  }

  function collectFamilyCases(items = [], adapter, context = {}) {
    if (typeof adapter !== "function") throw new Error("Inventory Risk Family Case collection requires an adapter function.");
    const cases = [];
    const diagnostics = [];
    (Array.isArray(items) ? items : []).forEach((item, index) => {
      try {
        cases.push(adapter(item, index));
      } catch (error) {
        if (error?.code !== "INVENTORY_RISK_ENTITY_IDENTITY_REQUIRED") throw error;
        diagnostics.push({
          ...clone(error.inventoryRiskDiagnostic, {}),
          adapter_version: text(context.adapterVersion),
          source_contract: text(context.sourceContract),
          source_index: index
        });
      }
    });
    Object.defineProperty(cases, "diagnostics", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: Object.freeze(diagnostics.map(item => Object.freeze(item)))
    });
    return cases;
  }

  function validateRiskCase(item = {}) {
    const errors = [];
    if (!text(item.inventory_entity_key)) errors.push("inventory_entity_key");
    if (!normalizeFamily(item.primary_risk_family)) errors.push("primary_risk_family");
    if (!text(item.family_case_id) && !text(item.portfolio_case_id)) errors.push("case_identity");
    if (item.primary_risk_family !== "excess_demand" && item.score_status !== "not_supported") errors.push("score_family_guard");
    if (item.primary_risk_family !== "excess_demand" && nullableNumber(item.score_value) !== null) errors.push("score_value_family_guard");
    return { valid: errors.length === 0, errors };
  }

  root.inventoryRisks.caseContract = Object.freeze({
    VERSION,
    RISK_FAMILIES,
    RISK_SUBTYPES,
    VALUE_SEMANTICS,
    clone,
    collectFamilyCases,
    createFamilyCase,
    inventoryEntityKey,
    normalizePriority,
    nullableNumber,
    text,
    unique,
    validateRiskCase
  });
})(window);
