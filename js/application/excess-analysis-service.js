(function registerExcessAnalysisService(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};

  const ENGINE_VERSION = "1";

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function sum(rows, key) {
    return rows.reduce((total, row) => total + number(row[key]), 0);
  }

  function evidenceRecord(input = {}) {
    return {
      evidenceKey: input.evidenceKey || "",
      labelKey: input.labelKey || input.evidenceKey || "",
      value: input.value ?? "",
      valueType: input.valueType || "text",
      evidenceType: input.evidenceType || "unavailable",
      sourceField: input.sourceField || "",
      sourcePackageId: input.sourcePackageId || "",
      sourcePackageRevision: input.sourcePackageRevision || "",
      confidence: input.confidence || "Low",
      limitationCodes: Array.isArray(input.limitationCodes) ? [...input.limitationCodes] : []
    };
  }

  function buildEvidenceRecords(item = {}) {
    const inventoryPackageId = item.inventory_package_id || "";
    const inventoryPackageRevision = item.inventory_package_revision || "";
    const materialMasterPackageId = item.material_master_package_id || "";
    const materialMasterPackageRevision = item.material_master_package_revision || "";
    return [
      evidenceRecord({
        evidenceKey: "material_id",
        labelKey: "evidence_material_id",
        value: item.material_id || "",
        valueType: "text",
        evidenceType: "source_fact",
        sourceField: "material_id",
        sourcePackageId: inventoryPackageId,
        sourcePackageRevision: inventoryPackageRevision,
        confidence: item.material_id ? "High" : "Low"
      }),
      evidenceRecord({
        evidenceKey: "source_row_number",
        labelKey: "sourceRow",
        value: item.source_row_number || item.row_number || item.__sourceRowIndex || "",
        valueType: "text",
        evidenceType: "source_fact",
        sourceField: "source_row_number",
        sourcePackageId: inventoryPackageId,
        sourcePackageRevision: inventoryPackageRevision,
        confidence: item.source_row_number || item.row_number || item.__sourceRowIndex ? "High" : "Low"
      }),
      evidenceRecord({
        evidenceKey: "net_addressable_excess_value",
        labelKey: "evidence_net_addressable_excess_value",
        value: item.net_addressable_excess_value,
        valueType: "money",
        evidenceType: "calculated_value",
        sourceField: "net_excess_value",
        sourcePackageId: inventoryPackageId,
        sourcePackageRevision: inventoryPackageRevision,
        confidence: "High"
      }),
      evidenceRecord({
        evidenceKey: "gross_excess_value",
        labelKey: "evidence_gross_excess_value",
        value: item.gross_excess_value,
        valueType: "money",
        evidenceType: "calculated_value",
        sourceField: "excess_value",
        sourcePackageId: inventoryPackageId,
        sourcePackageRevision: inventoryPackageRevision,
        confidence: "High"
      }),
      evidenceRecord({
        evidenceKey: "excess_overlap_value",
        labelKey: "evidence_excess_overlap_value",
        value: item.excess_overlap_value,
        valueType: "money",
        evidenceType: "calculated_value",
        sourceField: "recovery_waterfall",
        sourcePackageId: inventoryPackageId,
        sourcePackageRevision: inventoryPackageRevision,
        confidence: "High",
        limitationCodes: number(item.excess_overlap_value) > 0 ? ["gross_to_net_overlap"] : []
      }),
      evidenceRecord({
        evidenceKey: "owner_reference",
        labelKey: "evidence_owner_reference",
        value: item.owner_reference || "",
        valueType: "text",
        evidenceType: item.owner_source === "material_master" ? "enriched_fact" : item.owner_reference ? "source_fact" : "unavailable",
        sourceField: item.owner_reference_field || "owner_reference",
        sourcePackageId: item.owner_source === "material_master" ? materialMasterPackageId : inventoryPackageId,
        sourcePackageRevision: item.owner_source === "material_master" ? materialMasterPackageRevision : inventoryPackageRevision,
        confidence: item.owner_assignment_confidence || "Low",
        limitationCodes: item.owner_reference ? [] : ["owner_reference_missing"]
      }),
      evidenceRecord({
        evidenceKey: "relationship_match_type",
        labelKey: "evidence_relationship_match_type",
        value: item.relationship_match_type || "",
        valueType: "text",
        evidenceType: item.relationship_match_type ? "enriched_fact" : "unavailable",
        sourceField: "material_master_relationship",
        sourcePackageId: materialMasterPackageId,
        sourcePackageRevision: materialMasterPackageRevision,
        confidence: item.relationship_match_type === "exact_material_plant" ? "High" : item.relationship_match_type ? "Medium" : "Low",
        limitationCodes: item.relationship_match_type === "exact_material_plant" ? [] : ["relationship_not_exact_material_plant"]
      })
    ];
  }

  function buildWhyPrioritized(item = {}) {
    const components = item.opportunity_score_components || {};
    const reasons = [];
    if (number(item.net_addressable_excess_value) > 0) reasons.push("why_net_addressable_excess");
    if (number(components.financial_impact) >= 25) reasons.push("why_high_financial_impact");
    if (item.priority === "High") reasons.push("why_high_priority");
    if (item.owner_reference) reasons.push("why_owner_reference");
    if (item.relationship_match_type === "exact_material_plant") reasons.push("why_exact_match");
    if (number(item.excess_overlap_value) > 0) reasons.push("why_gross_net_transparent");
    return reasons.length ? reasons : ["why_excess_case"];
  }

  function buildWhyNotHigher(item = {}, scenarios = []) {
    const reasons = [];
    (item.limitations || []).forEach(code => reasons.push(`limitation_${code}`));
    if (number(item.excess_overlap_value) > 0) reasons.push("why_overlap_reduces_net");
    if (!item.owner_reference) reasons.push("why_missing_owner_limits_actionability");
    if (item.relationship_match_type && item.relationship_match_type !== "exact_material_plant") reasons.push("why_non_exact_match_limits_confidence");
    scenarios
      .filter(scenario => scenario.availability !== "available")
      .flatMap(scenario => scenario.missingEvidence || [])
      .forEach(code => reasons.push(`missing_${code}`));
    return [...new Set(reasons)].slice(0, 8);
  }

  function decorateDecisionCase(item = {}) {
    const scenarios = root.excess.excessScenarioEngine.buildScenarioSet(item);
    return {
      ...item,
      scenarios,
      whyPrioritized: buildWhyPrioritized(item),
      whyNotHigher: buildWhyNotHigher(item, scenarios),
      evidenceRecords: buildEvidenceRecords(item),
      grossToNetExplanation: {
        grossExcessValue: number(item.gross_excess_value),
        netAddressableExcessValue: number(item.net_addressable_excess_value),
        overlapValue: number(item.excess_overlap_value),
        remainingInventoryValue: number(item.excess_remaining_inventory_value),
        reasonKey: number(item.excess_overlap_value) > 0 ? "grossNetOverlapReason" : "grossNetNoOverlapReason"
      },
      ownerActionContext: {
        ownerFunction: item.owner_function || "",
        ownerReference: item.owner_reference || "",
        ownerSource: item.owner_source || "none",
        ownerAssignmentConfidence: item.owner_assignment_confidence || "Low",
        recommendation: item.recommended_action || "",
        nextStep: item.next_step || "",
        decisionType: item.decision_type || ""
      }
    };
  }

  function buildOwnerContextByRowKey(input = {}) {
    const ownerEngine = root.actions?.actionOwnerContextEngine;
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const provenanceByRowKey = input.enrichmentProvenance || {};
    if (!ownerEngine) return {};
    return Object.fromEntries(rows.map((row, index) => {
      const rowKey = String(row.inventory_row_key || row.inventoryRowKey || `INV-${row.__sourceRowIndex || row.row_number || index + 1}`);
      return [rowKey, ownerEngine.buildActionOwnerContext({
        row,
        ownerFunction: row.owner_function,
        enrichmentProvenance: provenanceByRowKey[rowKey] || row.__obsoliq_enrichment || {}
      })];
    }));
  }

  function relationshipIssueWorklist(input = {}) {
    const relationship = input.relationshipResult || {};
    const enrichment = input.enrichmentDiagnostics || {};
    return [
      ...(relationship.unmatched || []).map(item => ({ type: "unmatched", severity: "medium", ...item })),
      ...(relationship.ambiguous || []).map(item => ({ type: "ambiguous", severity: "high", ...item })),
      ...(relationship.invalidKeys || []).map(item => ({ type: "invalid_key", severity: "high", ...item })),
      ...(relationship.conflicts || []).map(item => ({ type: "relationship_conflict", severity: "high", ...item })),
      ...(enrichment.conflicts || []).map(item => ({ type: "enrichment_conflict", severity: "medium", ...item }))
    ];
  }

  function buildExcessPageModel(input = {}) {
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const ownerContextByRowKey = buildOwnerContextByRowKey(input);
    const cases = root.excess.excessAnalysisEngine.buildExcessCases({
      rows,
      datasetMeta: input.datasetMeta,
      relationshipResult: input.relationshipResult,
      enrichmentDiagnostics: input.enrichmentDiagnostics,
      enrichmentProvenance: input.enrichmentProvenance,
      ownerContextByRowKey
    });
    const scoredCases = root.excess.opportunityScoreEngine.scoreExcessCases({ cases });
    const casesWithScenarios = scoredCases.map(decorateDecisionCase);
    const relationshipQuality = root.data.packageRelationshipQualityEngine.relationshipQuality({
      relationshipResult: input.relationshipResult,
      enrichmentDiagnostics: input.enrichmentDiagnostics
    });
    const averageScore = casesWithScenarios.length
      ? Math.round(casesWithScenarios.reduce((total, item) => total + number(item.excess_opportunity_score), 0) / casesWithScenarios.length)
      : 0;

    return {
      version: ENGINE_VERSION,
      summary: {
        caseCount: casesWithScenarios.length,
        grossExcessValue: sum(casesWithScenarios, "gross_excess_value"),
        netAddressableExcessValue: sum(casesWithScenarios, "net_addressable_excess_value"),
        overlapValue: sum(casesWithScenarios, "excess_overlap_value"),
        remainingInventoryValue: sum(casesWithScenarios, "excess_remaining_inventory_value"),
        averageOpportunityScore: averageScore
      },
      relationshipQuality,
      relationshipIssues: relationshipIssueWorklist(input),
      ownerContextByRowKey: cloneData(ownerContextByRowKey),
      cases: casesWithScenarios,
      metadata: {
        engineVersion: ENGINE_VERSION,
        datasetId: input.datasetMeta?.datasetId || "",
        rowCount: rows.length,
        generatedAt: new Date().toISOString()
      }
    };
  }

  root.application.excessAnalysisService = Object.freeze({
    version: ENGINE_VERSION,
    buildExcessPageModel
  });
})(window);
