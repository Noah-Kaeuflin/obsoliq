(function registerInventoryRiskPortfolioService(global) {
  "use strict";

  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.inventoryRisks = root.inventoryRisks || {};
  const contract = root.inventoryRisks.caseContract;
  if (!contract) throw new Error("Inventory Risk Portfolio Service requires the Inventory Risk Case Contract.");

  const VERSION = "IR-01A-PORTFOLIO-1";
  const PRIORITY_RANK = Object.freeze({ critical: 0, high: 1, medium: 2, low: 3, review_required: 4 });
  const FAMILY_RANK = Object.freeze({ blocked_quality: 0, excess_demand: 1, slow_dead: 2 });
  const EVIDENCE_STATUS_RANK = Object.freeze({
    ready: 0,
    complete: 1,
    available: 2,
    limited: 3,
    incomplete: 4,
    unavailable: 5,
    invalid: 6
  });
  const EVIDENCE_READY_STATUSES = Object.freeze(["ready", "complete", "available"]);

  function normalizedEvidenceStatus(value) {
    const status = contract.text(value).toLowerCase();
    return Object.prototype.hasOwnProperty.call(EVIDENCE_STATUS_RANK, status) ? status : "unavailable";
  }

  function aggregateEvidenceStatus(cases = []) {
    if (!Array.isArray(cases) || !cases.length) return "unavailable";
    return cases
      .map(item => normalizedEvidenceStatus(item?.evidence_status))
      .reduce((weakest, status) => EVIDENCE_STATUS_RANK[status] > EVIDENCE_STATUS_RANK[weakest] ? status : weakest, "ready");
  }

  function isEvidenceReadyStatus(value) {
    return EVIDENCE_READY_STATUSES.includes(normalizedEvidenceStatus(value));
  }

  function strictSemanticValue(cases = [], field) {
    if (!cases.length) return null;
    const values = cases.map(item => contract.nullableNumber(item[field]));
    if (values.some(value => value === null)) return null;
    return values.reduce((total, value) => total + value, 0);
  }

  function choosePrimary(cases = []) {
    return [...cases].sort((left, right) => {
      const priorityDifference = (PRIORITY_RANK[left.priority] ?? 99) - (PRIORITY_RANK[right.priority] ?? 99);
      if (priorityDifference) return priorityDifference;
      const familyDifference = (FAMILY_RANK[left.primary_risk_family] ?? 99) - (FAMILY_RANK[right.primary_risk_family] ?? 99);
      if (familyDifference) return familyDifference;
      return String(left.family_case_id).localeCompare(String(right.family_case_id), undefined, { numeric: true, sensitivity: "base" });
    })[0] || null;
  }

  function familyCaseIdentityMap(cases = []) {
    const grouped = {};
    cases.forEach(item => {
      const family = item.primary_risk_family;
      grouped[family] = grouped[family] || [];
      grouped[family].push(item.family_case_id);
    });
    return Object.fromEntries(Object.entries(grouped).map(([family, ids]) => [
      family,
      ids.length === 1 ? ids[0] : [...ids]
    ]));
  }

  function packageValues(cases = [], key) {
    return contract.unique(cases.flatMap(item => item[key] || []));
  }

  function identityDiagnostics(input = {}) {
    return [input.excessCases, input.slowDeadCases, input.blockedQualityCases]
      .flatMap(cases => Array.isArray(cases?.diagnostics) ? cases.diagnostics : [])
      .map(item => contract.clone(item, {}));
  }

  function buildPortfolioCase(entityKey, cases = []) {
    const primary = choosePrimary(cases);
    if (!primary) return null;
    const families = contract.unique(cases.map(item => item.primary_risk_family));
    const excessCases = cases.filter(item => item.primary_risk_family === "excess_demand");
    const slowDeadCases = cases.filter(item => item.primary_risk_family === "slow_dead");
    const blockedCases = cases.filter(item => item.primary_risk_family === "blocked_quality");
    const excessScore = primary.primary_risk_family === "excess_demand" && primary.score_status === "available"
      ? contract.nullableNumber(primary.score_value)
      : null;
    const familyIds = familyCaseIdentityMap(cases);
    return {
      contract_version: contract.VERSION,
      portfolio_service_version: VERSION,
      case_kind: "portfolio",
      portfolio_case_id: `RISK::${entityKey}`,
      inventory_entity_key: entityKey,
      inventory_row_keys: contract.unique(cases.flatMap(item => item.inventory_row_keys || [])),
      material_id: primary.material_id,
      material_description: primary.material_description,
      plant: primary.plant,
      profit_center: primary.profit_center,
      program: primary.program,
      primary_risk_family: primary.primary_risk_family,
      primary_risk_subtype: families.length > 1 ? "multiple" : primary.primary_risk_subtype,
      secondary_risk_signals: families.filter(family => family !== primary.primary_risk_family),
      family_case_ids: familyIds,
      priority: primary.priority,
      prioritization_status: primary.prioritization_status,
      score_status: excessScore === null ? "not_supported" : "available",
      score_model_id: excessScore === null ? "" : primary.score_model_id,
      score_value: excessScore,
      value_semantic: primary.value_semantic,
      inventory_exposure: strictSemanticValue(slowDeadCases, "inventory_exposure"),
      net_addressable_value: strictSemanticValue(excessCases, "net_addressable_value"),
      blocked_quality_value: strictSemanticValue(blockedCases, "blocked_quality_value"),
      currency: primary.currency,
      owner_function: primary.owner_function,
      owner_reference: primary.owner_reference,
      owner_source: primary.owner_source,
      owner_assignment_confidence: primary.owner_assignment_confidence,
      evidence_status: aggregateEvidenceStatus(cases),
      evidence: contract.clone(primary.evidence, []),
      counter_evidence: contract.clone(primary.counter_evidence, []),
      limitations: contract.unique(cases.flatMap(item => item.limitations || [])),
      missing_evidence: contract.unique(cases.flatMap(item => item.missing_evidence || [])),
      next_step: primary.next_step,
      decision_type: primary.decision_type,
      action_eligibility: contract.clone(primary.action_eligibility, []),
      linked_action_target: contract.clone(primary.linked_action_target, null),
      inventory_navigation_target: contract.clone(primary.inventory_navigation_target, null),
      source_package_ids: packageValues(cases, "source_package_ids"),
      source_package_revisions: packageValues(cases, "source_package_revisions"),
      provenance: {
        portfolio_service_version: VERSION,
        primary_family_case_id: primary.family_case_id,
        family_case_ids: contract.clone(familyIds, {}),
        family_provenance: Object.fromEntries(cases.map(item => [item.family_case_id, contract.clone(item.provenance, {})]))
      },
      capability_status: cases.some(item => item.capability_status === "limited") ? "limited" : "available",
      family_cases: Object.fromEntries(contract.RISK_FAMILIES.map(family => [family, cases.filter(item => item.primary_risk_family === family)])),
      primary_family_case: primary
    };
  }

  function buildPortfolio(input = {}) {
    const diagnostics = identityDiagnostics(input);
    const familyCases = [
      ...(Array.isArray(input.excessCases) ? input.excessCases : []),
      ...(Array.isArray(input.slowDeadCases) ? input.slowDeadCases : []),
      ...(Array.isArray(input.blockedQualityCases) ? input.blockedQualityCases : [])
    ];
    const invalidCases = familyCases
      .map(item => ({ item, validation: contract.validateRiskCase(item) }))
      .filter(entry => !entry.validation.valid);
    if (invalidCases.length) {
      throw new Error(`Inventory Risk Portfolio received ${invalidCases.length} invalid Family Case(s).`);
    }
    const byEntity = new Map();
    familyCases.forEach(item => {
      const entityKey = item.inventory_entity_key;
      byEntity.set(entityKey, [...(byEntity.get(entityKey) || []), item]);
    });
    const portfolioCases = [...byEntity.entries()]
      .map(([entityKey, cases]) => buildPortfolioCase(entityKey, cases))
      .filter(Boolean);
    const portfolioIdByFamilyCaseId = new Map();
    portfolioCases.forEach(item => {
      Object.values(item.family_cases).flat().forEach(familyCase => {
        portfolioIdByFamilyCaseId.set(familyCase.family_case_id, item.portfolio_case_id);
      });
    });
    const linkedFamilyCases = familyCases.map(item => ({
      ...item,
      portfolio_case_id: portfolioIdByFamilyCaseId.get(item.family_case_id) || ""
    }));
    const counts = {
      all: portfolioCases.length,
      excess_demand: linkedFamilyCases.filter(item => item.primary_risk_family === "excess_demand").length,
      slow_dead: linkedFamilyCases.filter(item => item.primary_risk_family === "slow_dead").length,
      blocked_quality: linkedFamilyCases.filter(item => item.primary_risk_family === "blocked_quality").length,
      prioritized: portfolioCases.filter(item => ["critical", "high"].includes(item.priority)).length
    };
    return {
      version: VERSION,
      familyCases: linkedFamilyCases,
      portfolioCases,
      counts,
      capabilityStatus: diagnostics.length ? "limited" : "available",
      excludedFamilyCaseCount: diagnostics.length,
      identityDiagnostics: diagnostics,
      familyAvailability: contract.clone(input.familyAvailability, {}),
      analyticsRevision: String(input.analyticsRevision || ""),
      sourcePackageIds: packageValues(linkedFamilyCases, "source_package_ids"),
      sourcePackageRevisions: packageValues(linkedFamilyCases, "source_package_revisions")
    };
  }

  root.inventoryRisks.portfolioService = Object.freeze({
    VERSION,
    EVIDENCE_READY_STATUSES,
    EVIDENCE_STATUS_RANK,
    PRIORITY_RANK,
    aggregateEvidenceStatus,
    buildPortfolio,
    buildPortfolioCase,
    isEvidenceReadyStatus,
    strictSemanticValue
  });
})(window);
