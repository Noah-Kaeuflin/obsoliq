(function registerInventoryRiskExportBuilder(global) {
  "use strict";

  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.inventoryRisks = root.inventoryRisks || {};
  const contract = root.inventoryRisks.caseContract;
  if (!contract) throw new Error("Inventory Risk Export Builder requires the Inventory Risk Case Contract.");

  const VERSION = "IR-01C-EXPORT-1";

  function exportValue(value) {
    return value === null || value === undefined ? "" : value;
  }

  function buildRow(item = {}) {
    return {
      case_scope: item.case_kind || "",
      portfolio_case_id: item.portfolio_case_id || "",
      family_case_id: item.family_case_id || "",
      inventory_entity_key: item.inventory_entity_key || "",
      inventory_row_keys: (item.inventory_row_keys || []).join(" | "),
      material_id: item.material_id || "",
      material_description: item.material_description || "",
      plant: item.plant || "",
      profit_center: item.profit_center || "",
      program: item.program || "",
      primary_risk_family: item.primary_risk_family || "",
      primary_risk_subtype: item.primary_risk_subtype || "",
      secondary_risk_signals: (item.secondary_risk_signals || []).join(" | "),
      family_case_ids: JSON.stringify(item.family_case_ids || {}),
      priority: item.priority || "",
      prioritization_status: item.prioritization_status || "",
      score_status: item.score_status || "",
      score_model_id: item.score_model_id || "",
      score_value: exportValue(item.score_value),
      value_semantic: item.value_semantic || "",
      inventory_exposure: exportValue(item.inventory_exposure),
      net_addressable_value: exportValue(item.net_addressable_value),
      blocked_quality_value: exportValue(item.blocked_quality_value),
      currency: item.currency || "",
      owner_function: item.owner_function || "",
      owner_reference: item.owner_reference || "",
      owner_source: item.owner_source || "",
      owner_assignment_confidence: item.owner_assignment_confidence || "",
      evidence_status: item.evidence_status || "",
      limitations: (item.limitations || []).join(" | "),
      missing_evidence: (item.missing_evidence || []).join(" | "),
      next_step: item.next_step || "",
      decision_type: item.decision_type || "",
      capability_status: item.capability_status || "",
      source_package_ids: (item.source_package_ids || []).join(" | "),
      source_package_revisions: (item.source_package_revisions || []).join(" | "),
      provenance: JSON.stringify(item.provenance || {})
    };
  }

  function buildRows(input = {}) {
    const cases = Array.isArray(input.cases) ? input.cases : [];
    return { version: VERSION, rowCount: cases.length, rows: cases.map(buildRow) };
  }

  root.inventoryRisks.exportBuilder = Object.freeze({ VERSION, buildRow, buildRows });
})(window);
