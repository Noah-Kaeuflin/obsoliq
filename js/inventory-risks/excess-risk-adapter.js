(function registerExcessRiskAdapter(global) {
  "use strict";

  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.inventoryRisks = root.inventoryRisks || {};
  const contract = root.inventoryRisks.caseContract;
  if (!contract) throw new Error("Excess Risk Adapter requires the Inventory Risk Case Contract.");

  const VERSION = "IR-01A-EXCESS-1";

  function subtype(item = {}) {
    const source = contract.text(item.primary_category || item.category).toLowerCase();
    if (["no_demand", "no need stock", "no_need"].includes(source)) return "no_demand";
    if (["unplanned", "no plan stock", "no_plan"].includes(source)) return "unplanned";
    return "excess";
  }

  function evidenceStatus(item = {}, decision = {}) {
    const readiness = contract.text(decision.decisionReadiness?.status);
    if (readiness === "ready") return "ready";
    if (["limited", "review"].includes(readiness)) return "limited";
    if (item.financial_evidence_status === "complete") return "available";
    return item.financial_evidence_status || "unavailable";
  }

  function adaptCase(item = {}, options = {}) {
    const decision = typeof options.projectDecisionCore === "function"
      ? options.projectDecisionCore(item) || {}
      : {};
    const score = contract.nullableNumber(item.excess_opportunity_score ?? item.opportunity_score);
    const rowKey = contract.text(item.inventory_row_key || item.inventoryRowKey);
    const packageIds = [item.inventory_package_id, item.material_master_package_id];
    const packageRevisions = [item.inventory_package_revision, item.material_master_package_revision];
    return contract.createFamilyCase({
      family_case_id: item.case_id,
      inventory_entity_key: item.inventory_entity_key || item.inventoryEntityKey,
      inventory_row_keys: item.inventory_row_keys || [rowKey],
      material_id: item.material_id,
      material_description: item.material_description,
      plant: item.plant || item.profit_center,
      profit_center: item.profit_center || item.plant,
      program: item.program_short || item.program,
      primary_risk_family: "excess_demand",
      primary_risk_subtype: subtype(item),
      priority: item.priority,
      prioritization_status: "accepted_excess_priority",
      score_status: score === null ? "unavailable" : "available",
      score_model_id: contract.text(item.opportunity_score_metadata?.modelVersion || item.opportunity_score_model_id || "excess-opportunity-score"),
      score_value: score,
      inventory_exposure: item.stock_value,
      net_addressable_value: item.net_addressable_excess_value,
      blocked_quality_value: null,
      currency: item.currency_unit || item.currency || item.source_row?.currency,
      owner_function: item.owner_function,
      owner_reference: item.owner_reference,
      owner_source: item.owner_source,
      owner_assignment_confidence: item.owner_assignment_confidence,
      evidence_status: evidenceStatus(item, decision),
      evidence: item.evidenceRecords || decision.decisionReadiness?.existingEvidence || [],
      counter_evidence: item.whyNotHigher || decision.whyNotHigher || [],
      limitations: item.limitations || [],
      missing_evidence: decision.decisionReadiness?.missingEvidence || [],
      next_step: item.next_step || decision.nextStep,
      decision_type: item.decision_type || decision.decisionType,
      action_eligibility: decision.actionOptions || item.scenarios || [],
      linked_action_target: decision.actionsNavigationTarget || { caseId: item.case_id, inventoryRowKey: rowKey },
      inventory_navigation_target: decision.inventoryNavigationTarget || {
        inventoryRowKey: rowKey,
        inventoryEntityKey: item.inventory_entity_key || item.inventoryEntityKey,
        materialId: item.material_id,
        plant: item.plant || item.profit_center
      },
      source_package_ids: packageIds,
      source_package_revisions: packageRevisions,
      provenance: {
        adapter_version: VERSION,
        source_contract: "excess-analysis-service",
        original_case_id: item.case_id,
        decision_contract_versions: decision.contractVersions || {},
        source_provenance: item.provenance || {}
      },
      capability_status: "available",
      family_payload: { accepted_case: item, decision_workspace: decision }
    });
  }

  function adapt(model = {}, options = {}) {
    return contract.collectFamilyCases(
      Array.isArray(model.cases) ? model.cases : [],
      item => adaptCase(item, options),
      { adapterVersion: VERSION, sourceContract: "excess-analysis-service" }
    );
  }

  root.inventoryRisks.excessRiskAdapter = Object.freeze({ VERSION, adapt, adaptCase });
})(window);
