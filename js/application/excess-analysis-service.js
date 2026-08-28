(function registerExcessAnalysisService(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};

  const ENGINE_VERSION = "1";
  const aggregateNumericValues = root.core?.valueUtils?.aggregateNumericValues;
  const numericEvidence = root.core?.valueUtils?.numericEvidence;

  if (typeof aggregateNumericValues !== "function" || typeof numericEvidence !== "function") {
    throw new Error("ObsoliQ Excess Analysis Service requires strict numeric aggregation utilities.");
  }

  function finiteNumber(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object || {}, key);
  }

  function sourceMoneyEvidence(row = {}, key = "") {
    if (!hasOwn(row, key)) return { status: "absent", normalizedValue: null };
    return numericEvidence(row[key], {
      fieldKey: key,
      fieldDefinition: { type: "currency", fieldKey: key },
      parseResult: row.__numericParseResults?.[key] || null
    });
  }

  function evidenceStatus(evidence = []) {
    if (evidence.some(item => item.status === "invalid")) return "invalid";
    if (evidence.some(item => item.status === "ambiguous")) return "ambiguous";
    if (evidence.some(item => item.status === "missing")) return "incomplete";
    return evidence.length && evidence.every(item => item.status === "valid") ? "complete" : "unavailable";
  }

  function strictFinancialCase(item = {}) {
    const row = item.source_row || {};
    const grossEvidence = ["excess_value", "net_excess_value"]
      .filter(key => hasOwn(row, key))
      .map(key => sourceMoneyEvidence(row, key));
    const netEvidence = hasOwn(row, "net_excess_value")
      ? [sourceMoneyEvidence(row, "net_excess_value")]
      : [
          hasOwn(row, "recovery_available_stock_value")
            ? sourceMoneyEvidence(row, "recovery_available_stock_value")
            : sourceMoneyEvidence(row, "stock_value"),
          sourceMoneyEvidence(row, "recovery_potential")
        ].filter(evidence => evidence.status !== "absent");
    const stockEvidence = sourceMoneyEvidence(row, "stock_value");
    const recoveryEvidence = sourceMoneyEvidence(row, "recovery_potential");
    const grossStatus = evidenceStatus(grossEvidence);
    const netStatus = evidenceStatus(netEvidence);
    const grossValue = grossStatus === "complete" ? finiteNumber(item.gross_excess_value) : null;
    const netValue = grossValue !== null && ["complete", "unavailable"].includes(netStatus)
      ? finiteNumber(item.net_addressable_excess_value)
      : null;
    const overlapValue = grossValue !== null && netValue !== null
      ? finiteNumber(item.excess_overlap_value)
      : null;
    const stockValue = stockEvidence.status === "valid" ? finiteNumber(item.stock_value) : null;
    const remainingValue = stockValue !== null && netValue !== null
      ? finiteNumber(item.excess_remaining_inventory_value)
      : null;
    const recoveryValue = recoveryEvidence.status === "valid"
      ? finiteNumber(item.recovery_potential)
      : null;
    const financialStatus = evidenceStatus([
      ...grossEvidence,
      ...netEvidence,
      stockEvidence,
      recoveryEvidence
    ].filter(evidence => evidence.status !== "absent"));
    const limitations = financialStatus === "complete"
      ? [...(item.limitations || [])]
      : [...new Set([...(item.limitations || []), `financial_evidence_${financialStatus}`])];
    return {
      ...item,
      gross_excess_value: grossValue,
      net_addressable_excess_value: netValue,
      excess_overlap_value: overlapValue,
      excess_remaining_inventory_value: remainingValue,
      recovery_potential: recoveryValue,
      stock_value: stockValue,
      financial_evidence_status: financialStatus,
      limitations
    };
  }

  function strictFinancialScore(item = {}) {
    if (finiteNumber(item.gross_excess_value) !== null && finiteNumber(item.net_addressable_excess_value) !== null) {
      return item;
    }
    const components = {
      ...(item.opportunity_score_components || {}),
      financial_impact: null
    };
    const metadata = {
      ...(item.opportunity_score_metadata || {}),
      uncappedScore: null,
      finalScore: null,
      wasCapped: false,
      cappedPoints: null
    };
    return {
      ...item,
      excess_opportunity_score: null,
      opportunity_score: null,
      opportunity_score_components: components,
      opportunity_score_metadata: metadata,
      opportunity_score_drivers: (item.opportunity_score_drivers || [])
        .filter(driver => driver !== "high_financial_impact")
    };
  }

  function aggregate(rows, key, type = "currency") {
    return aggregateNumericValues(rows, {
      fieldKey: key,
      fieldDefinition: { type, fieldKey: key },
      valueAccessor: row => row?.[key],
      parseResultAccessor: row => row?.__numericParseResults?.[key] || null
    });
  }

  function sum(rows, key, type = "currency") {
    return aggregate(rows, key, type).value;
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
        limitationCodes: finiteNumber(item.excess_overlap_value) > 0 ? ["gross_to_net_overlap"] : []
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
    if (finiteNumber(item.net_addressable_excess_value) > 0) reasons.push("why_net_addressable_excess");
    if (finiteNumber(components.financial_impact) >= 25) reasons.push("why_high_financial_impact");
    if (item.priority === "High") reasons.push("why_high_priority");
    if (item.owner_reference) reasons.push("why_owner_reference");
    if (item.relationship_match_type === "exact_material_plant") reasons.push("why_exact_match");
    if (finiteNumber(item.excess_overlap_value) > 0) reasons.push("why_gross_net_transparent");
    return reasons.length ? reasons : ["why_excess_case"];
  }

  function buildWhyNotHigher(item = {}, scenarios = []) {
    const reasons = [];
    (item.limitations || []).forEach(code => reasons.push(`limitation_${code}`));
    if (finiteNumber(item.excess_overlap_value) > 0) reasons.push("why_overlap_reduces_net");
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
        grossExcessValue: item.gross_excess_value,
        netAddressableExcessValue: item.net_addressable_excess_value,
        overlapValue: item.excess_overlap_value,
        remainingInventoryValue: item.excess_remaining_inventory_value,
        currencyUnit: item.currency_unit || item.currency || item.source_row?.currency || "NORMALIZED_BASE_CURRENCY",
        reasonKey: finiteNumber(item.excess_overlap_value) > 0 ? "grossNetOverlapReason" : "grossNetNoOverlapReason"
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

  function decisionContractVersions() {
    const workspaceModel = root.excess?.decisionWorkspaceModel || {};
    return {
      workspaceProjection: workspaceModel.version || "",
      decisionReadiness: workspaceModel.READINESS_MODEL_VERSION || "",
      grossNetReconciliation: workspaceModel.GROSS_NET_RECONCILIATION_VERSION || ""
    };
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
    }).map(strictFinancialCase);
    const scoredCases = root.excess.opportunityScoreEngine.scoreExcessCases({ cases })
      .map(strictFinancialScore);
    const casesWithScenarios = scoredCases.map(decorateDecisionCase);
    const relationshipQuality = root.data.packageRelationshipQualityEngine.relationshipQuality({
      relationshipResult: input.relationshipResult,
      enrichmentDiagnostics: input.enrichmentDiagnostics
    });
    const grossAggregate = aggregate(casesWithScenarios, "gross_excess_value");
    const netAggregate = aggregate(casesWithScenarios, "net_addressable_excess_value");
    const overlapAggregate = aggregate(casesWithScenarios, "excess_overlap_value");
    const remainingAggregate = aggregate(casesWithScenarios, "excess_remaining_inventory_value");
    const scoreAggregate = aggregate(casesWithScenarios, "excess_opportunity_score", "number");
    const averageScore = scoreAggregate.value === null || !casesWithScenarios.length
      ? null
      : Math.round(scoreAggregate.value / casesWithScenarios.length);

    return {
      version: ENGINE_VERSION,
      summary: {
        caseCount: casesWithScenarios.length,
        grossExcessValue: grossAggregate.value,
        netAddressableExcessValue: netAggregate.value,
        overlapValue: overlapAggregate.value,
        remainingInventoryValue: remainingAggregate.value,
        averageOpportunityScore: averageScore,
        aggregates: {
          grossExcessValue: grossAggregate,
          netAddressableExcessValue: netAggregate,
          overlapValue: overlapAggregate,
          remainingInventoryValue: remainingAggregate,
          averageOpportunityScore: scoreAggregate
        }
      },
      relationshipQuality,
      relationshipIssues: relationshipIssueWorklist(input),
      ownerContextByRowKey: cloneData(ownerContextByRowKey),
      cases: casesWithScenarios,
      metadata: {
        engineVersion: ENGINE_VERSION,
        decisionContracts: decisionContractVersions(),
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
