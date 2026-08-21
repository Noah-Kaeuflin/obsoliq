(function registerConsumptionHistoryInterpretationService(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};

  const semanticsEngine = root.data?.consumptionHistorySemanticsEngine;
  const valueUtils = root.core?.valueUtils;
  if (!semanticsEngine) throw new Error("Consumption History Interpretation Service requires the semantics engine.");
  if (!valueUtils) throw new Error("Consumption History Interpretation Service requires value utilities.");

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

  function identityForEntry(entry = {}) {
    if (!entry) {
      return {
        sourceIndex: null,
        sourceKey: "",
        sourceColumn: "",
        originalHeader: ""
      };
    }
    return {
      sourceIndex: entry.sourceIndex,
      sourceKey: entry.sourceKey || entry.sourceColumnKey || "",
      sourceColumn: entry.sourceColumn || entry.originalHeader || "",
      originalHeader: entry.originalHeader || entry.sourceColumn || ""
    };
  }

  function diagnostic(key, count, severity = "warning", extra = {}) {
    return { key, code: key, severity, count, ...extra };
  }

  function mergePolicy(proposed, override) {
    const base = semanticsEngine.defaultSemanticPolicy(proposed || {});
    const selected = override || {};
    return semanticsEngine.defaultSemanticPolicy({
      ...base,
      ...selected,
      quantity: { ...base.quantity, ...(selected.quantity || {}) },
      postingDate: { ...base.postingDate, ...(selected.postingDate || {}) },
      period: { ...base.period, ...(selected.period || {}) },
      analysisAsOf: { ...base.analysisAsOf, ...(selected.analysisAsOf || {}) },
      movementRuleSet: { ...base.movementRuleSet, ...(selected.movementRuleSet || {}) },
      unitPolicy: { ...base.unitPolicy, ...(selected.unitPolicy || {}) }
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
        ...identityForEntry(quantityEntry),
        numericLocale: quantityProfile.status === "dominant" && quantityProfile.dominantLocale === "de" ? "de-DE"
          : quantityProfile.status === "dominant" && quantityProfile.dominantLocale === "en" ? "en-US"
            : quantityProfile.status === "dominant" && quantityProfile.dominantLocale === "swiss" ? "de-CH"
              : "auto",
        scaleSource: "auto",
        sourceScaleFactor: quantityHeaderHints.sourceScaleFactor || 1
      },
      postingDate: {
        ...identityForEntry(postingDateEntry),
        dateFormat: "auto"
      },
      period: {
        ...identityForEntry(periodEntry),
        periodFormat: "auto"
      },
      analysisAsOf: input.semanticPolicy?.analysisAsOf || input.sourceDescriptor?.analysisAsOf
        || { date: "", source: "unavailable" }
    });
    const effectivePolicy = mergePolicy(proposedPolicy, input.semanticPolicy || {});
    const diagnostics = [];
    if (quantityProfile.status === "mixed" || quantityProfile.status === "ambiguous") {
      diagnostics.push(diagnostic("historyQuantityLocaleReviewRequired", quantityProfile.sampleSize || quantityValues.length, "warning", { field: "consumption_quantity" }));
    }
    const doubleScaleCount = quantityValues.filter(value => {
      const parsed = valueUtils.parseLocalizedNumericValue({
        rawValue: value,
        fieldDefinition: { type: "number", fieldKey: "consumption_quantity" },
        localeProfile: quantityProfile,
        headerHints: quantityHeaderHints,
        normalizationPolicy: { scaleSource: effectivePolicy.quantity.scaleSource === "auto" ? "" : effectivePolicy.quantity.scaleSource }
      });
      return parsed.status === "double_scale";
    }).length;
    if (doubleScaleCount) diagnostics.push(diagnostic("historyQuantityDoubleScaleBlocked", doubleScaleCount, "error", { field: "consumption_quantity" }));
    const postingResults = postingDateEntry ? rows.map(row => semanticsEngine.parsePostingDate(sourceValue(row, postingDateEntry, sourceColumnMetadata), effectivePolicy.postingDate.dateFormat)) : [];
    const periodResults = periodEntry ? rows.map(row => semanticsEngine.parsePeriod(sourceValue(row, periodEntry, sourceColumnMetadata), effectivePolicy.period.periodFormat)) : [];
    const ambiguousDates = postingResults.filter(result => result.status === "ambiguous" || result.status === "review_required").length;
    const invalidDates = postingResults.filter(result => result.status === "invalid").length;
    const postingFormats = new Set(postingResults.map(result => result.format).filter(Boolean));
    const periodFormats = new Set(periodResults.map(result => result.format).filter(Boolean));
    if (ambiguousDates) diagnostics.push(diagnostic("historyDateFormatReviewRequired", ambiguousDates, "warning", { field: "posting_date" }));
    if (invalidDates) diagnostics.push(diagnostic("historyDateFormatInvalid", invalidDates, "warning", { field: "posting_date" }));
    if (postingFormats.size > 1 || periodFormats.size > 1) diagnostics.push(diagnostic("historyMixedTemporalFormats", postingFormats.size + periodFormats.size, "warning"));
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
        diagnosticCount: diagnostics.length,
        blockingDiagnosticCount: blockingDiagnostics.length,
        reviewDiagnosticCount: reviewDiagnostics.length
      }
    };
  }

  root.application.consumptionHistoryInterpretationService = Object.freeze({
    version: "1",
    prepareConsumptionHistoryInterpretation,
    semanticPolicySignature: semanticsEngine.semanticPolicySignature
  });
})(window);
