(function registerSlowDeadRiskAdapter(global) {
  "use strict";

  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.inventoryRisks = root.inventoryRisks || {};
  const contract = root.inventoryRisks.caseContract;
  if (!contract) throw new Error("Slow / Dead Risk Adapter requires the Inventory Risk Case Contract.");

  const VERSION = "IR-01A-SLOW-DEAD-1";
  const SUBTYPE_BY_CONDITION = Object.freeze({
    slow_moving_candidate: "slow_moving",
    non_moving_candidate: "non_moving",
    dead_stock_candidate: "dead_stock_candidate",
    intermittent_expected: "intermittent_expected",
    strategic_reserve: "strategic_reserve",
    insufficient_evidence: "multiple"
  });
  const PRIORITY_BY_CONDITION = Object.freeze({
    dead_stock_candidate: "high",
    non_moving_candidate: "high",
    slow_moving_candidate: "medium",
    intermittent_expected: "low",
    strategic_reserve: "low",
    insufficient_evidence: "review_required"
  });

  function evidenceStatus(item = {}) {
    const strength = contract.text(item.evidence_strength).toLowerCase();
    if (["high", "strong"].includes(strength)) return "ready";
    if (["medium", "limited"].includes(strength)) return "limited";
    return "unavailable";
  }

  function sourcePackages(item = {}) {
    const provenance = item.provenance || {};
    return {
      ids: [provenance.inventoryPackage?.packageId, provenance.historyPackage?.packageId],
      revisions: [provenance.inventoryPackage?.packageRevision, provenance.historyPackage?.packageRevision]
    };
  }

  function adaptCase(item = {}, runtime = {}) {
    const packages = sourcePackages(item);
    const condition = contract.text(item.condition_code);
    return contract.createFamilyCase({
      family_case_id: item.case_id,
      inventory_entity_key: item.inventory_entity_key,
      inventory_row_keys: item.inventory_row_keys,
      material_id: item.material_id,
      material_description: item.material_description,
      plant: item.plant,
      profit_center: item.profit_center,
      program: item.program,
      primary_risk_family: "slow_dead",
      primary_risk_subtype: SUBTYPE_BY_CONDITION[condition] || "multiple",
      priority: item.priority || PRIORITY_BY_CONDITION[condition],
      prioritization_status: "projected_from_accepted_condition",
      score_status: "not_supported",
      score_value: null,
      inventory_exposure: item.stock_value,
      net_addressable_value: null,
      blocked_quality_value: null,
      currency: item.currency,
      owner_function: item.owner_function,
      owner_reference: item.owner_reference,
      owner_source: item.owner_source,
      owner_assignment_confidence: item.owner_assignment_confidence,
      evidence_status: evidenceStatus(item),
      evidence: item.positive_evidence || [],
      counter_evidence: item.counter_evidence || [],
      limitations: item.limitation_codes || [],
      missing_evidence: item.missing_evidence || [],
      next_step: item.next_step,
      decision_type: item.decision_type,
      action_eligibility: item.action_eligibility || [],
      linked_action_target: {
        caseId: item.case_id,
        inventoryEntityKey: item.inventory_entity_key,
        inventoryRowKeys: item.inventory_row_keys || []
      },
      inventory_navigation_target: {
        inventoryEntityKey: item.inventory_entity_key,
        inventoryRowKeys: item.inventory_row_keys || [],
        materialId: item.material_id,
        plant: item.plant
      },
      source_package_ids: packages.ids,
      source_package_revisions: packages.revisions,
      provenance: {
        adapter_version: VERSION,
        source_contract: "slow-dead-recovery-case-runtime",
        original_case_id: item.case_id,
        runtime_status: runtime.status || runtime.runtimeStatus || "",
        runtime_input_signature: runtime.inputSignature || runtime.completedInputSignature || "",
        calibration_status: runtime.calibrationStatus || item.calibration_status || "",
        source_provenance: item.provenance || {}
      },
      capability_status: runtime.status === "available" ? "available" : "limited",
      family_payload: { accepted_case: item, runtime: {
        status: runtime.status || "",
        reasonCode: runtime.reasonCode || "",
        calibrationStatus: runtime.calibrationStatus || ""
      } }
    });
  }

  function adapt(runtime = {}) {
    const cases = Array.isArray(runtime.cases)
      ? runtime.cases
      : Array.isArray(runtime.result?.cases)
        ? runtime.result.cases
        : [];
    return contract.collectFamilyCases(
      cases,
      item => adaptCase(item, runtime),
      { adapterVersion: VERSION, sourceContract: "slow-dead-recovery-case-runtime" }
    );
  }

  root.inventoryRisks.slowDeadRiskAdapter = Object.freeze({ VERSION, adapt, adaptCase });
})(window);
