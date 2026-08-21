(function registerConsumptionHistoryInterpretationService(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};

  const semanticsEngine = root.data?.consumptionHistorySemanticsEngine;
  const sourceModel = root.data?.sourceModel;
  const valueUtils = root.core?.valueUtils;
  if (!semanticsEngine) throw new Error("Consumption History Interpretation Service requires the semantics engine.");
  if (!sourceModel) throw new Error("Consumption History Interpretation Service requires the source model.");
  if (!valueUtils) throw new Error("Consumption History Interpretation Service requires value utilities.");

  const SOURCE_BOUND_FIELDS = Object.freeze(["consumption_quantity", "posting_date", "period"]);
  const FIELD_BY_SECTION = Object.freeze({
    quantity: "consumption_quantity",
    postingDate: "posting_date",
    period: "period"
  });
  const ALLOWED_SCALE_FACTORS = Object.freeze([1, 1000, 1000000, 1000000000]);

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function sourceValue(row, entry, sourceColumnMetadata = []) {
    const meta = sourceColumnMetadata.find(item => item.sourceIndex === entry?.sourceIndex);
    if (!meta) return "";
    if (Object.prototype.hasOwnProperty.call(row || {}, meta.sourceKey)) return row[meta.sourceKey] ?? "";
    if (Object.prototype.hasOwnProperty.call(row || {}, meta.originalHeader)) return row[meta.originalHeader] ?? "";
    return "";
  }

  function entryForField(mapping = [], fieldKey) {
    return (mapping || []).find(entry => entry.selectedCanonicalField === fieldKey && entry.status === "mapped" && !entry.ignored) || null;
  }

  function diagnostic(key, count, severity = "warning", extra = {}) {
    return { key, code: key, severity, count, ...extra };
  }

  function strictMetaForEntry(entry = {}, sourceColumnMetadata = []) {
    if (!sourceModel.isValidSourceIndex(entry.sourceIndex)) return null;
    const meta = sourceColumnMetadata.find(item => item.sourceIndex === entry.sourceIndex) || null;
    if (!meta || !normalizeText(meta.sourceKey)) return null;
    const entryKey = normalizeText(entry.sourceKey || entry.sourceColumnKey || "");
    if (entryKey && entryKey !== normalizeText(meta.sourceKey)) return null;
    const entryColumn = normalizeText(entry.sourceColumn || entry.originalHeader || "");
    if (entryColumn && ![normalizeText(meta.sourceKey), normalizeText(meta.originalHeader)].includes(entryColumn)) return null;
    return meta;
  }

  function historySourceIdentityForMappingEntry({ canonicalField, reviewedMapping, sourceColumnMetadata } = {}) {
    const fieldKey = normalizeText(canonicalField);
    const entry = Array.isArray(reviewedMapping)
      ? entryForField(reviewedMapping, fieldKey)
      : reviewedMapping;
    if (!SOURCE_BOUND_FIELDS.includes(fieldKey) || !entry) {
      return {
        canonicalField: fieldKey,
        sourceIndex: null,
        sourceKey: "",
        sourceColumn: "",
        valid: false,
        reasonCode: entry ? "canonical_field_changed" : "missing_mapping"
      };
    }
    const meta = strictMetaForEntry(entry, sourceColumnMetadata);
    if (!meta) {
      return {
        canonicalField: fieldKey,
        sourceIndex: entry.sourceIndex ?? null,
        sourceKey: normalizeText(entry.sourceKey || entry.sourceColumnKey || ""),
        sourceColumn: normalizeText(entry.sourceColumn || entry.originalHeader || ""),
        valid: false,
        reasonCode: sourceModel.isValidSourceIndex(entry.sourceIndex) ? "source_key_changed" : "invalid_source_index"
      };
    }
    return {
      canonicalField: fieldKey,
      sourceIndex: meta.sourceIndex,
      sourceKey: meta.sourceKey,
      sourceColumn: meta.originalHeader,
      valid: true,
      reasonCode: "matched"
    };
  }

  function identityComparable(identity = {}) {
    return {
      canonicalField: normalizeText(identity.canonicalField),
      sourceIndex: identity.sourceIndex,
      sourceKey: normalizeText(identity.sourceKey),
      sourceColumn: normalizeText(identity.sourceColumn)
    };
  }

  function historyPolicySectionMatchesMapping({ policySection, canonicalField, reviewedMapping, sourceColumnMetadata } = {}) {
    const expectedIdentity = historySourceIdentityForMappingEntry({ canonicalField, reviewedMapping, sourceColumnMetadata });
    const actualIdentity = identityComparable(policySection || {});
    if (!policySection) return { matches: false, reasonCode: "missing_policy_identity", expectedIdentity, actualIdentity };
    if (!expectedIdentity.valid) return { matches: false, reasonCode: expectedIdentity.reasonCode, expectedIdentity, actualIdentity };
    if (actualIdentity.canonicalField !== canonicalField) return { matches: false, reasonCode: "canonical_field_changed", expectedIdentity, actualIdentity };
    if (!sourceModel.isValidSourceIndex(actualIdentity.sourceIndex)) return { matches: false, reasonCode: "invalid_source_index", expectedIdentity, actualIdentity };
    if (actualIdentity.sourceIndex !== expectedIdentity.sourceIndex) return { matches: false, reasonCode: "source_index_changed", expectedIdentity, actualIdentity };
    if (actualIdentity.sourceKey !== expectedIdentity.sourceKey) return { matches: false, reasonCode: "source_key_changed", expectedIdentity, actualIdentity };
    if (actualIdentity.sourceColumn !== expectedIdentity.sourceColumn) return { matches: false, reasonCode: "source_column_changed", expectedIdentity, actualIdentity };
    return { matches: true, reasonCode: "matched", expectedIdentity, actualIdentity };
  }

  function policySectionHasSourceIdentity(section = {}) {
    return sourceModel.isValidSourceIndex(section.sourceIndex)
      || Boolean(section.sourceKey)
      || Boolean(section.sourceColumn);
  }

  function policySectionHasSemanticOverride(sectionName, section = {}) {
    if (!section) return false;
    if (section.userConfirmed || section.confirmedAt || section.confirmationReason) return true;
    if (sectionName === "quantity") {
      return !["", "auto"].includes(String(section.numericLocale || "auto"))
        || !["", "auto"].includes(String(section.scaleSource || "auto"))
        || (section.sourceScaleFactor !== undefined
          && section.sourceScaleFactor !== null
          && section.sourceScaleFactor !== 1);
    }
    if (sectionName === "postingDate") {
      return !["", "auto"].includes(String(section.dateFormat || "auto"))
        || Boolean(section.excelDateSystem);
    }
    if (sectionName === "period") {
      return !["", "auto"].includes(String(section.periodFormat || "auto"));
    }
    return false;
  }

  function mergeSection(proposedSection = {}, overrideSection = {}, matchResult) {
    const sourceIdentity = {
      canonicalField: proposedSection.canonicalField,
      sourceIndex: proposedSection.sourceIndex,
      sourceKey: proposedSection.sourceKey,
      sourceColumn: proposedSection.sourceColumn
    };
    return {
      ...proposedSection,
      ...overrideSection,
      ...sourceIdentity,
      userConfirmed: Boolean(overrideSection.userConfirmed && matchResult.matches),
      confirmedAt: matchResult.matches ? overrideSection.confirmedAt || "" : "",
      confirmationReason: matchResult.matches ? overrideSection.confirmationReason || "" : ""
    };
  }

  function reconcileHistorySemanticPolicy({
    appliedPolicy = null,
    proposedPolicy = {},
    userOverrides = null,
    reviewedMapping = [],
    sourceColumnMetadata = []
  } = {}) {
    const selected = userOverrides || appliedPolicy || {};
    const effectiveSeed = semanticsEngine.defaultSemanticPolicy(proposedPolicy || {});
    const diagnostics = [];
    const retainedSections = [];
    const proposedSections = [];
    const overriddenSections = [];
    const staleSections = [];
    const resetConfirmationSections = [];
    const effectivePolicy = semanticsEngine.defaultSemanticPolicy({
      ...effectiveSeed,
      ...selected,
      quantity: effectiveSeed.quantity,
      postingDate: effectiveSeed.postingDate,
      period: effectiveSeed.period,
      analysisAsOf: { ...effectiveSeed.analysisAsOf, ...(selected.analysisAsOf || {}) },
      movementRuleSet: { ...effectiveSeed.movementRuleSet, ...(selected.movementRuleSet || {}) },
      unitPolicy: { ...effectiveSeed.unitPolicy, ...(selected.unitPolicy || {}) }
    });

    Object.entries(FIELD_BY_SECTION).forEach(([sectionName, canonicalField]) => {
      const proposedSection = effectiveSeed[sectionName] || {};
      const overrideSection = selected[sectionName] || null;
      const matchResult = historyPolicySectionMatchesMapping({
        policySection: overrideSection,
        canonicalField,
        reviewedMapping,
        sourceColumnMetadata
      });
      if (!overrideSection) {
        effectivePolicy[sectionName] = { ...proposedSection, userConfirmed: false, confirmedAt: "", confirmationReason: "" };
        proposedSections.push(sectionName);
        return;
      }
      if (!policySectionHasSourceIdentity(overrideSection) && policySectionHasSemanticOverride(sectionName, overrideSection)) {
        effectivePolicy[sectionName] = { ...proposedSection, userConfirmed: false, confirmedAt: "", confirmationReason: "" };
        staleSections.push({ section: sectionName, canonicalField, reasonCode: "missing_policy_identity", expectedIdentity: matchResult.expectedIdentity, actualIdentity: matchResult.actualIdentity });
        resetConfirmationSections.push(sectionName);
        diagnostics.push(diagnostic("historySourcePolicyStale", 1, "error", { section: sectionName, field: canonicalField, reasonCode: "missing_policy_identity" }));
        return;
      }
      if (policySectionHasSourceIdentity(overrideSection) && !matchResult.matches) {
        effectivePolicy[sectionName] = { ...proposedSection, userConfirmed: false, confirmedAt: "", confirmationReason: "" };
        staleSections.push({ section: sectionName, canonicalField, reasonCode: matchResult.reasonCode, expectedIdentity: matchResult.expectedIdentity, actualIdentity: matchResult.actualIdentity });
        resetConfirmationSections.push(sectionName);
        diagnostics.push(diagnostic("historySourcePolicyStale", 1, "error", { section: sectionName, field: canonicalField, reasonCode: matchResult.reasonCode }));
        return;
      }
      effectivePolicy[sectionName] = mergeSection(proposedSection, overrideSection, matchResult);
      overriddenSections.push(sectionName);
      if (matchResult.matches && overrideSection.userConfirmed) retainedSections.push(sectionName);
    });

    const sourceIdentityChanged = staleSections.length > 0;
    effectivePolicy.reviewConfirmed = Boolean(selected.reviewConfirmed && !sourceIdentityChanged);
    effectivePolicy.confirmedAt = effectivePolicy.reviewConfirmed ? selected.confirmedAt || "" : "";
    return {
      effectivePolicy,
      retainedSections,
      proposedSections,
      overriddenSections,
      staleSections,
      resetConfirmationSections,
      sourceIdentityChanged,
      reviewRequired: false,
      blocked: sourceIdentityChanged,
      diagnostics
    };
  }

  function proposedIdentity(entry, fieldKey, sourceColumnMetadata) {
    const identity = historySourceIdentityForMappingEntry({ canonicalField: fieldKey, reviewedMapping: entry, sourceColumnMetadata });
    return {
      canonicalField: fieldKey,
      sourceIndex: identity.valid ? identity.sourceIndex : null,
      sourceKey: identity.valid ? identity.sourceKey : "",
      sourceColumn: identity.valid ? identity.sourceColumn : ""
    };
  }

  function policyLocaleFromProfile(quantityProfile) {
    if (quantityProfile.status !== "dominant") return "auto";
    if (quantityProfile.dominantLocale === "de") return "de-DE";
    if (quantityProfile.dominantLocale === "en") return "en-US";
    if (quantityProfile.dominantLocale === "swiss") return "de-CH";
    return "auto";
  }

  function validExplicitScaleFactor(value) {
    return typeof value === "number"
      && Number.isFinite(value)
      && value > 0
      && ALLOWED_SCALE_FACTORS.includes(value);
  }

  function semanticPreviewRows(rows = [], mapping = [], sourceColumnMetadata = []) {
    const rowLimit = Math.min(rows.length, 5000);
    return rows.slice(0, rowLimit).map((row, index) => {
      const item = { __sourceRowIndex: row?.__sourceRowIndex ?? index + 1 };
      Object.entries(FIELD_BY_SECTION).forEach(([, fieldKey]) => {
        const entry = entryForField(mapping, fieldKey);
        if (entry) item[fieldKey] = sourceValue(row, entry, sourceColumnMetadata);
      });
      ["material_id", "plant", "base_unit", "movement_type", "document_id", "document_item"].forEach(fieldKey => {
        const entry = entryForField(mapping, fieldKey);
        if (entry) item[fieldKey] = sourceValue(row, entry, sourceColumnMetadata);
      });
      return item;
    });
  }

  function prepareConsumptionHistoryInterpretation(input = {}) {
    const rows = Array.isArray(input.rows) ? input.rows : [];
    const sourceColumnMetadata = Array.isArray(input.sourceColumnMetadata) ? input.sourceColumnMetadata : [];
    const mapping = Array.isArray(input.mapping) ? input.mapping : [];
    const quantityEntry = entryForField(mapping, "consumption_quantity");
    const postingDateEntry = entryForField(mapping, "posting_date");
    const periodEntry = entryForField(mapping, "period");
    const quantityValues = quantityEntry ? rows.map(row => sourceValue(row, quantityEntry, sourceColumnMetadata)) : [];
    const quantityProfile = valueUtils.inferNumericLocaleProfile(quantityValues);
    const quantityHeaderHints = valueUtils.extractSourceHeaderHints(quantityEntry?.sourceColumn || quantityEntry?.originalHeader || "");
    const proposedPolicy = semanticsEngine.defaultSemanticPolicy({
      quantity: {
        ...proposedIdentity(quantityEntry, "consumption_quantity", sourceColumnMetadata),
        numericLocale: policyLocaleFromProfile(quantityProfile),
        scaleSource: "auto",
        sourceScaleFactor: quantityHeaderHints.sourceScaleFactor || 1,
        userConfirmed: false,
        confirmedAt: "",
        confirmationReason: ""
      },
      postingDate: {
        ...proposedIdentity(postingDateEntry, "posting_date", sourceColumnMetadata),
        dateFormat: "auto",
        excelDateSystem: input.sourceDescriptor?.excelDateSystem || "",
        userConfirmed: false,
        confirmedAt: "",
        confirmationReason: ""
      },
      period: {
        ...proposedIdentity(periodEntry, "period", sourceColumnMetadata),
        periodFormat: "auto",
        userConfirmed: false,
        confirmedAt: "",
        confirmationReason: ""
      },
      analysisAsOf: input.semanticPolicy?.analysisAsOf || input.sourceDescriptor?.analysisAsOf
        || { date: "", source: "unavailable" }
    });
    const reconciliation = reconcileHistorySemanticPolicy({
      appliedPolicy: input.appliedPolicy || null,
      proposedPolicy,
      userOverrides: input.semanticPolicy || null,
      reviewedMapping: mapping,
      sourceColumnMetadata
    });
    const effectivePolicy = reconciliation.effectivePolicy;
    const diagnostics = [...(reconciliation.diagnostics || [])];

    if (quantityProfile.status === "mixed" || quantityProfile.status === "ambiguous") {
      diagnostics.push(diagnostic("historyQuantityLocaleReviewRequired", quantityProfile.sampleSize || quantityValues.length, "warning", { field: "consumption_quantity" }));
    }
    const effectiveLocaleOverride = effectivePolicy.quantity.numericLocale === "de-DE" ? "de"
      : effectivePolicy.quantity.numericLocale === "en-US" ? "en"
        : effectivePolicy.quantity.numericLocale === "de-CH" ? "swiss" : "";
    const quantityScaleSource = effectivePolicy.quantity.scaleSource || "auto";
    const doubleScaleCount = quantityValues.filter(value => {
      const parsed = valueUtils.parseLocalizedNumericValue({
        rawValue: value,
        fieldDefinition: { type: "number", fieldKey: "consumption_quantity" },
        localeProfile: quantityProfile,
        headerHints: quantityHeaderHints,
        normalizationPolicy: {
          scaleSource: quantityScaleSource === "auto" ? "" : quantityScaleSource,
          sourceScaleFactor: effectivePolicy.quantity.sourceScaleFactor,
          localeOverride: effectiveLocaleOverride
        }
      });
      return parsed.status === "double_scale";
    }).length;
    if (doubleScaleCount) diagnostics.push(diagnostic("historyQuantityDoubleScaleBlocked", doubleScaleCount, "error", { field: "consumption_quantity" }));
    if (quantityScaleSource === "explicit") {
      if (!validExplicitScaleFactor(effectivePolicy.quantity.sourceScaleFactor)) {
        diagnostics.push(diagnostic("historyExplicitScaleFactorInvalid", 1, "error", { field: "consumption_quantity" }));
      } else if (!effectivePolicy.quantity.userConfirmed && !effectivePolicy.reviewConfirmed) {
        diagnostics.push(diagnostic("historyExplicitScaleFactorReviewRequired", 1, "warning", { field: "consumption_quantity" }));
      }
    }

    const postingFormat = effectivePolicy.postingDate.dateFormat || "auto";
    if (postingFormat === "excel-serial" && !["1900", "1904"].includes(String(effectivePolicy.postingDate.excelDateSystem || ""))) {
      diagnostics.push(diagnostic("historyExcelDateSystemReviewRequired", 1, "error", { field: "posting_date" }));
    }
    const postingResults = postingDateEntry ? rows.map(row => semanticsEngine.parsePostingDate(
      sourceValue(row, postingDateEntry, sourceColumnMetadata),
      postingFormat,
      { excelDateSystem: effectivePolicy.postingDate.excelDateSystem }
    )) : [];
    const periodResults = periodEntry ? rows.map(row => semanticsEngine.parsePeriod(sourceValue(row, periodEntry, sourceColumnMetadata), effectivePolicy.period.periodFormat)) : [];
    const ambiguousDates = postingResults.filter(result => result.status === "ambiguous" || result.status === "review_required").length;
    const invalidDates = postingResults.filter(result => result.status === "invalid").length;
    const postingFormats = new Set(postingResults.map(result => result.format).filter(Boolean));
    const periodFormats = new Set(periodResults.map(result => result.format).filter(Boolean));
    if (ambiguousDates) diagnostics.push(diagnostic("historyDateFormatReviewRequired", ambiguousDates, "warning", { field: "posting_date" }));
    if (invalidDates) diagnostics.push(diagnostic("historyDateFormatInvalid", invalidDates, "warning", { field: "posting_date" }));
    if (postingFormats.size > 1 || periodFormats.size > 1) diagnostics.push(diagnostic("historyMixedTemporalFormats", postingFormats.size + periodFormats.size, "warning"));

    if (effectivePolicy.analysisAsOf?.source === "inventory_snapshot") {
      const revision = effectivePolicy.analysisAsOf.sourcePackageRevision;
      if (!effectivePolicy.analysisAsOf.sourcePackageId || !Number.isInteger(revision) || revision <= 0) {
        diagnostics.push(diagnostic("historyAnalysisAsOfProvenanceMissing", 1, "error"));
      }
    }
    if (effectivePolicy.analysisAsOf?.source === "user_confirmed"
      && (!effectivePolicy.analysisAsOf.userConfirmed || !effectivePolicy.analysisAsOf.confirmedAt)) {
      diagnostics.push(diagnostic("historyAnalysisAsOfConfirmationRequired", 1, "warning"));
    }

    const semanticPreview = semanticsEngine.analyzeConsumptionHistorySemantics({
      sourceRows: rows,
      normalizedRows: semanticPreviewRows(rows, mapping, sourceColumnMetadata),
      semanticPolicy: effectivePolicy
    });
    const blockingDiagnostics = diagnostics.filter(item => item.severity === "error");
    const reviewDiagnostics = diagnostics.filter(item => item.severity !== "error");
    const reviewConfirmed = Boolean(effectivePolicy.reviewConfirmed);
    const trustState = blockingDiagnostics.length
      ? "blocked"
      : reviewDiagnostics.length && !reviewConfirmed
        ? "review_required"
        : "trusted";
    return {
      status: trustState,
      trustState,
      proposedPolicy,
      effectivePolicy,
      semanticPolicySignature: semanticsEngine.semanticPolicySignature(effectivePolicy),
      reconciliation,
      historyReadiness: semanticPreview.historyReadiness,
      readinessPreview: true,
      quantityEvidence: { profile: quantityProfile, headerHints: quantityHeaderHints },
      temporalEvidence: {
        postingDateFormats: [...postingFormats],
        periodFormats: [...periodFormats],
        ambiguousDateCount: ambiguousDates,
        invalidDateCount: invalidDates
      },
      diagnostics,
      blockingDiagnostics,
      reviewDiagnostics,
      inputTrustMetadata: {
        trustState,
        semanticPolicySignature: semanticsEngine.semanticPolicySignature(effectivePolicy),
        sourceIdentityChanged: reconciliation.sourceIdentityChanged,
        staleSectionCount: reconciliation.staleSections.length,
        diagnosticCount: diagnostics.length,
        blockingDiagnosticCount: blockingDiagnostics.length,
        reviewDiagnosticCount: reviewDiagnostics.length
      }
    };
  }

  root.application.consumptionHistoryInterpretationService = Object.freeze({
    version: "2",
    prepareConsumptionHistoryInterpretation,
    historySourceIdentityForMappingEntry,
    historyPolicySectionMatchesMapping,
    reconcileHistorySemanticPolicy,
    semanticPolicySignature: semanticsEngine.semanticPolicySignature,
    allowedScaleFactors: () => [...ALLOWED_SCALE_FACTORS]
  });
})(window);
