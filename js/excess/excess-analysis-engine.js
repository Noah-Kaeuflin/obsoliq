(function registerExcessAnalysisEngine(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.excess = root.excess || {};

  const ENGINE_VERSION = "1";

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object || {}, key);
  }

  function rowKey(row = {}, index = 0) {
    return String(row.inventory_row_key || row.inventoryRowKey || `INV-${row.__sourceRowIndex || row.row_number || index + 1}`);
  }

  function packageRevision(meta = {}) {
    return meta.revision || meta.packageRevision || meta.inventoryPackageRevision || "";
  }

  function matchByRowKey(relationshipResult = {}) {
    return new Map((relationshipResult.matches || []).map(match => [match.inventoryRowKey, match]));
  }

  function isExcessCandidate(row = {}) {
    return number(row.excess_value) > 0
      || number(row.net_excess_value) > 0
      || row.primary_category === "excess"
      || row.category === "excess";
  }

  function netAddressableExcess(row = {}, grossExcessValue = 0) {
    if (hasOwn(row, "net_excess_value")) return Math.max(0, number(row.net_excess_value));
    const available = hasOwn(row, "recovery_available_stock_value")
      ? number(row.recovery_available_stock_value)
      : number(row.stock_value, grossExcessValue);
    const recovery = hasOwn(row, "recovery_potential")
      ? number(row.recovery_potential)
      : grossExcessValue;
    return Math.max(0, Math.min(grossExcessValue, recovery, available));
  }

  function limitationsForCase(row = {}, match = null, ownerContext = {}) {
    const limitations = [];
    if (!match) limitations.push("material_master_match_missing");
    if (match && match.matchType !== "exact_material_plant") limitations.push("relationship_not_exact_material_plant");
    if (!ownerContext.owner_reference) limitations.push("owner_reference_missing");
    if (!hasOwn(row, "safety_stock") && !hasOwn(row, "safety_stock_target")) limitations.push("safety_stock_not_available");
    if (!hasOwn(row, "open_po_value") && !hasOwn(row, "open_purchase_order_value")) limitations.push("purchase_order_context_not_available");
    if (!hasOwn(row, "historical_consumption") && !hasOwn(row, "last_consumption_date")) limitations.push("consumption_history_not_available");
    return limitations;
  }

  function buildExcessCases(input = {}) {
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const datasetMeta = input.datasetMeta || {};
    const relationship = input.relationshipResult || {};
    const matches = matchByRowKey(relationship);
    const provenanceByRowKey = input.enrichmentProvenance || {};
    const ownerContextByRowKey = input.ownerContextByRowKey || {};
    const datasetId = datasetMeta.datasetId || relationship.relationshipMetadata?.inventoryDatasetId || "local-dataset";
    const inventoryPackageId = datasetMeta.packageId || relationship.relationshipMetadata?.inventoryPackageId || "";
    const inventoryPackageRevision = packageRevision(datasetMeta) || relationship.relationshipMetadata?.inventoryPackageRevision || "";

    return rows
      .filter(isExcessCandidate)
      .map((row, index) => {
        const inventoryRowKey = rowKey(row, index);
        const grossExcessValue = Math.max(0, number(row.excess_value), number(row.net_excess_value));
        const netAddressableExcessValue = Math.min(grossExcessValue, netAddressableExcess(row, grossExcessValue));
        const excessOverlapValue = Math.max(0, grossExcessValue - netAddressableExcessValue);
        const stockValue = number(row.stock_value);
        const match = matches.get(inventoryRowKey) || null;
        const provenance = provenanceByRowKey[inventoryRowKey] || row.__obsoliq_enrichment || {};
        const ownerContext = ownerContextByRowKey[inventoryRowKey] || {};

        return {
          case_id: `EXCESS::${datasetId}::${inventoryRowKey}`,
          inventory_row_key: inventoryRowKey,
          material_id: row.material_id || "",
          material_description: row.material_description || row.description || "",
          profit_center: row.profit_center || "",
          program_short: row.program_short || row.program || "",
          plant: row.plant || "",
          primary_category: row.primary_category || "excess",
          category: row.category || row.primary_category || "excess",
          gross_excess_value: grossExcessValue,
          net_addressable_excess_value: netAddressableExcessValue,
          excess_overlap_value: excessOverlapValue,
          excess_remaining_inventory_value: Math.max(0, stockValue - netAddressableExcessValue),
          recovery_potential: number(row.recovery_potential),
          stock_value: stockValue,
          priority: row.priority || "",
          confidence: row.confidence || "",
          status: row.status || "Open",
          root_cause: row.root_cause || "",
          recommended_action: row.recommended_action || "",
          next_step: row.next_step || "",
          decision_type: row.decision_type || "",
          owner_function: row.owner_function || "",
          owner_reference: ownerContext.owner_reference || row.owner_reference || "",
          owner_reference_field: ownerContext.owner_reference_field || row.owner_reference_field || "",
          owner_source: ownerContext.owner_source || row.owner_source || "none",
          owner_assignment_confidence: ownerContext.owner_assignment_confidence || row.owner_assignment_confidence || "Low",
          relationship_status: match ? "matched" : "not_matched",
          relationship_match_type: match?.matchType || "",
          material_master_package_id: provenance.materialMasterPackageId || match?.materialMasterPackageId || "",
          material_master_package_revision: provenance.materialMasterPackageRevision || match?.materialMasterPackageRevision || "",
          material_master_source_row: provenance.materialMasterSourceRowIndex || match?.materialMasterSourceRowIndex || "",
          inventory_package_id: inventoryPackageId,
          inventory_package_revision: inventoryPackageRevision,
          source_row_number: row.row_number || row.__sourceRowIndex || "",
          evidence_summary: [
            match?.matchType || "no_material_master_match",
            ownerContext.owner_reference || row.owner_reference ? "owner_reference_available" : "owner_reference_missing",
            netAddressableExcessValue < grossExcessValue ? "overlap_deducted" : "no_overlap_deduction"
          ],
          limitations: limitationsForCase(row, match, ownerContext),
          source_row: row
        };
      });
  }

  root.excess.excessAnalysisEngine = Object.freeze({
    version: ENGINE_VERSION,
    buildExcessCases,
    isExcessCandidate
  });
})(window);
