(function registerBlockedQualityRiskAdapter(global) {
  "use strict";

  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.inventoryRisks = root.inventoryRisks || {};
  const contract = root.inventoryRisks.caseContract;
  if (!contract) throw new Error("Blocked / Quality Risk Adapter requires the Inventory Risk Case Contract.");

  const VERSION = "IR-01A-BLOCKED-QUALITY-1";

  function hasBlockedSignal(row = {}) {
    const bad = contract.nullableNumber(row.bad_stock_value);
    const net = contract.nullableNumber(row.net_bad_stock_value);
    const category = contract.text(row.primary_category || row.category).toLowerCase();
    return (bad !== null && bad > 0)
      || (net !== null && net > 0)
      || category === "blocked_quality"
      || /bad\s*\/\s*blocked|blocked|quality inspection|quality_inspection|gesperrt|qi\b/i.test(category);
  }

  function subtype(row = {}) {
    const status = [row.status_safety, row.availability, row.category, row.primary_category].map(contract.text).join(" ");
    return /quality|inspection|qi\b|prüfung/i.test(status) ? "quality_inspection" : "blocked";
  }

  function sourceRowKey(row = {}, index = 0) {
    return contract.text(row.inventory_row_key || row.inventoryRowKey || `INV-${row.__sourceRowIndex || row.row_number || index + 1}`);
  }

  function adaptCase(row = {}, index = 0, options = {}) {
    const rowKey = sourceRowKey(row, index);
    const datasetId = contract.text(options.datasetId || options.datasetMeta?.datasetId) || "dataset";
    const blockedValue = contract.nullableNumber(row.net_bad_stock_value) !== null
      ? contract.nullableNumber(row.net_bad_stock_value)
      : contract.nullableNumber(row.bad_stock_value);
    return contract.createFamilyCase({
      family_case_id: `BLOCKED-QUALITY::${datasetId}::${rowKey}`,
      inventory_entity_key: row.inventory_entity_key || row.inventoryEntityKey,
      inventory_row_keys: [rowKey],
      material_id: row.material_id,
      material_description: row.material_description || row.description,
      plant: row.plant || row.profit_center,
      profit_center: row.profit_center || row.plant,
      program: row.program_short || row.program || row.group,
      primary_risk_family: "blocked_quality",
      primary_risk_subtype: subtype(row),
      priority: row.priority,
      prioritization_status: "existing_action_priority",
      score_status: "not_supported",
      score_value: null,
      inventory_exposure: row.stock_value,
      net_addressable_value: null,
      blocked_quality_value: blockedValue,
      currency: row.currency || options.currency,
      owner_function: row.owner_function,
      owner_reference: row.owner_reference,
      owner_source: row.owner_source,
      owner_assignment_confidence: row.owner_assignment_confidence,
      evidence_status: "limited",
      evidence: [
        { key: "bad_stock_value", value: contract.nullableNumber(row.bad_stock_value), status: contract.nullableNumber(row.bad_stock_value) === null ? "unavailable" : "available" },
        { key: "net_bad_stock_value", value: contract.nullableNumber(row.net_bad_stock_value), status: contract.nullableNumber(row.net_bad_stock_value) === null ? "unavailable" : "available" },
        { key: "status_safety", value: contract.text(row.status_safety), status: contract.text(row.status_safety) ? "available" : "unavailable" },
        { key: "availability", value: contract.text(row.availability), status: contract.text(row.availability) ? "available" : "unavailable" }
      ],
      counter_evidence: [],
      limitations: ["blocked_quality_capability_limited"],
      missing_evidence: [
        "confirmed_quality_cause",
        "time_in_blocked_status",
        "release_or_rework_probability",
        "supplier_return_feasibility",
        "quality_approval"
      ],
      next_step: row.next_step,
      decision_type: row.decision_type,
      action_eligibility: row.recommended_action ? [{ action: row.recommended_action, status: row.status || "Open" }] : [],
      linked_action_target: {
        inventoryRowKey: rowKey,
        inventoryEntityKey: row.inventory_entity_key || row.inventoryEntityKey,
        materialId: row.material_id,
        plant: row.plant || row.profit_center
      },
      inventory_navigation_target: {
        inventoryRowKey: rowKey,
        inventoryEntityKey: row.inventory_entity_key || row.inventoryEntityKey,
        materialId: row.material_id,
        plant: row.plant || row.profit_center
      },
      source_package_ids: [row.inventory_package_id, options.packageId],
      source_package_revisions: [row.inventory_package_revision, options.packageRevision],
      provenance: {
        adapter_version: VERSION,
        source_contract: "enriched-inventory-row",
        inventory_row_key: rowKey,
        source_status_fields: ["status_safety", "availability"],
        source_provenance: row.__obsoliq_enrichment || {}
      },
      capability_status: "limited",
      family_payload: { accepted_row: row }
    });
  }

  function adapt(rows = [], options = {}) {
    const candidates = (Array.isArray(rows) ? rows : [])
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => hasBlockedSignal(row));
    return contract.collectFamilyCases(
      candidates,
      candidate => adaptCase(candidate.row, candidate.index, options),
      { adapterVersion: VERSION, sourceContract: "enriched-inventory-row" }
    );
  }

  root.inventoryRisks.blockedQualityRiskAdapter = Object.freeze({ VERSION, adapt, adaptCase, hasBlockedSignal });
})(window);
