/* ObsoliQ Input Trust Service
 * Orchestrates schema profiling, mapping evidence and normalization trust decisions.
 */
(function registerInputTrustService(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};

  const VERSION = "1";

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function freezeResult(value) {
    return Object.freeze(cloneData(value));
  }

  function createInputTrustService({
    canonical,
    schemaProfiler,
    inputNormalizationEngine,
    mappingEngine,
    clock = () => new Date().toISOString()
  } = {}) {
    if (!canonical) throw new Error("Input Trust Service requires canonical definitions.");
    if (!schemaProfiler) throw new Error("Input Trust Service requires Schema Profiler.");
    if (!inputNormalizationEngine) throw new Error("Input Trust Service requires Input Normalization Engine.");
    if (!mappingEngine) throw new Error("Input Trust Service requires Mapping Engine.");

    const fieldDefinitions = canonical.inventoryFieldDefinitions || {};

    function mappedRowsForTrust({ headers = [], rows = [], mapping = [], sourceColumnMetadata = [], mappingPolicy = null, fieldDefinitions: activeFieldDefinitions = fieldDefinitions } = {}) {
      return mappingEngine.applyApprovedColumnMapping({
        headers,
        rows,
        mapping,
        sourceColumnMetadata,
        policy: mappingPolicy || undefined,
        fieldDefinitions: activeFieldDefinitions
      });
    }

    function diagnosticsFromMappingEvidence(mappingEvidence = [], profile = {}, activeFieldDefinitions = fieldDefinitions) {
      const profileByIndex = new Map((profile.columns || []).map(column => [column.sourceIndex, column]));
      const diagnostics = [];
      mappingEvidence.forEach(entry => {
        const fieldKey = entry.selectedCanonicalField || entry.proposedCanonicalField || "";
        const definition = activeFieldDefinitions[fieldKey];
        if (!definition || !entry.selectedCanonicalField || entry.ignored || entry.status === "protected") return;
        const profileForEntry = profileByIndex.get(entry.sourceIndex);
        if (!profileForEntry) return;
        diagnostics.push(...schemaProfiler.possibleMisalignmentDiagnostics({
          profile: profileForEntry,
          mappingEntry: entry,
          fieldDefinition: definition
        }));
      });
      return diagnostics;
    }

    function isInputTrustReviewDiagnostic(diagnostic = {}) {
      const code = diagnostic.code || diagnostic.key || "";
      const status = diagnostic.status || "";
      return [
        "potential_double_scaling",
        "ambiguous_numeric_locale",
        "mixed_currency",
        "possible_column_misalignment",
        "content_type_mismatch"
      ].includes(code) || ["double_scale", "ambiguous"].includes(status);
    }

    function trustStateFor({ mappingValidation = {}, normalization = {}, mappingDiagnostics = [], schemaDrift = null } = {}) {
      if (mappingValidation.valid === false) return "blocked";
      const diagnostics = [
        ...(normalization.diagnostics || []),
        ...(mappingDiagnostics || [])
      ];
      const hasBlocking = diagnostics.some(diagnostic => diagnostic.severity === "error");
      if (hasBlocking) return "blocked";
      const hasReview = diagnostics.some(diagnostic => (
        diagnostic.severity === "warning" && isInputTrustReviewDiagnostic(diagnostic)
      ));
      return hasReview ? "review_required" : "trusted";
    }

    function compactInputTrustMetadata(result = {}) {
      return {
        version: VERSION,
        trustState: result.trustState,
        evaluatedAt: result.evaluatedAt,
        semanticSchemaSignature: result.schemaProfile?.semanticSignature || null,
        physicalSchemaSignature: result.schemaProfile?.physicalSignature || null,
        schemaDrift: result.schemaDrift || null,
        normalizationPolicySignature: normalizationPolicySignature(result.normalizationPolicy || {}),
        normalizationSummary: result.normalizationSummary || null,
        diagnosticCount: (result.diagnostics || []).length,
        blockingDiagnosticCount: (result.diagnostics || []).filter(diagnostic => diagnostic.severity === "error").length,
        reviewDiagnosticCount: (result.diagnostics || []).filter(diagnostic => diagnostic.severity === "warning").length,
        mappingEvidenceSummary: (result.mappingEvidence || []).map(entry => ({
          sourceIndex: entry.sourceIndex,
          sourceColumn: entry.sourceColumn,
          sourceKey: entry.sourceKey || "",
          selectedCanonicalField: entry.selectedCanonicalField || "",
          confidence: entry.confidence,
          typeEvidence: entry.profileEvidence?.typeEvidence || "",
          localeStatus: entry.profileEvidence?.localeStatus || "",
          headerScaleFactor: entry.profileEvidence?.headerScaleFactor || 1,
          headerCurrency: entry.profileEvidence?.headerCurrency || ""
        }))
      };
    }

    function diagnosticSummary(diagnostics = []) {
      return diagnostics.reduce((summary, diagnostic) => {
        const severity = diagnostic.severity || "info";
        summary.total += 1;
        summary[severity] = (summary[severity] || 0) + 1;
        return summary;
      }, { total: 0, error: 0, warning: 0, info: 0 });
    }

    function canonicalFieldForMappingEntry(mappingEntry = {}) {
      return mappingEntry.selectedCanonicalField || "";
    }

    function sourceMetaForMappingEntry(mappingEntry = {}, sourceColumnMetadata = []) {
      const metadata = Array.isArray(sourceColumnMetadata) ? sourceColumnMetadata : [];
      const identity = root.data?.sourceModel?.physicalSourceIdentityForMappingEntry(mappingEntry, metadata);
      return identity ? metadata.find(meta => meta.sourceIndex === identity.sourceIndex) || null : null;
    }

    function sourceIdentityForMappingEntry({ mappingEntry = {}, sourceColumnMetadata = [] } = {}) {
      const meta = sourceMetaForMappingEntry(mappingEntry, sourceColumnMetadata);
      if (!meta) return null;
      return {
        sourceIndex: meta.sourceIndex,
        sourceKey: meta.sourceKey,
        sourceColumn: mappingEntry.sourceColumn
      };
    }

    function policyHasSourceIdentity(policy = {}) {
      return Boolean(
        policy
        && typeof policy === "object"
        && policy.canonicalField
        && typeof policy.sourceIndex === "number"
        && Number.isInteger(policy.sourceIndex)
        && policy.sourceIndex >= 0
        && String(policy.sourceKey || "").trim()
        && String(policy.sourceColumn || "").trim()
      );
    }

    function normalizationPolicyMatchesSourceIdentity({
      policy = {},
      mappingEntry = {},
      sourceColumnMetadata = []
    } = {}) {
      if (!policyHasSourceIdentity(policy)) return false;
      const fieldKey = canonicalFieldForMappingEntry(mappingEntry);
      const identity = sourceIdentityForMappingEntry({ mappingEntry, sourceColumnMetadata });
      return Boolean(
        fieldKey
        && identity
        && policy.canonicalField === fieldKey
        && policy.sourceIndex === identity.sourceIndex
        && policy.sourceKey === identity.sourceKey
        && policy.sourceColumn === identity.sourceColumn
      );
    }

    function policiesShareSourceIdentity(proposed = {}, override = {}) {
      if (!policyHasSourceIdentity(override) || !policyHasSourceIdentity(proposed)) return true;
      return proposed.canonicalField === override.canonicalField
        && proposed.sourceIndex === override.sourceIndex
        && proposed.sourceKey === override.sourceKey
        && proposed.sourceColumn === override.sourceColumn;
    }

    function proposedPolicyForEvidence(entry = {}, sourceColumnMetadata = []) {
      const fieldKey = entry.selectedCanonicalField || "";
      if (!fieldKey) return null;
      const profile = entry.profileEvidence || {};
      const headerScaleFactor = Number(profile.headerScaleFactor || 1) || 1;
      const detectedLocale = profile.detectedLocale || "";
      const identity = sourceIdentityForMappingEntry({
        mappingEntry: entry,
        sourceColumnMetadata
      });
      if (!identity) return null;
      const policy = {
        canonicalField: fieldKey,
        sourceIndex: identity.sourceIndex,
        sourceColumn: identity.sourceColumn,
        sourceKey: identity.sourceKey,
        numericLocale: detectedLocale || "auto",
        localeOverride: detectedLocale || "",
        scaleSource: headerScaleFactor !== 1 ? "header" : "none",
        sourceScaleFactor: headerScaleFactor,
        sourceCurrency: profile.headerCurrency || "",
        detectedCurrency: profile.headerCurrency || "",
        detectedUnit: profile.headerUnit || "",
        confirmed: false
      };
      return [fieldKey, policy];
    }

    function stableJson(value) {
      if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
      if (value && typeof value === "object") {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
      }
      return JSON.stringify(value);
    }

    function meaningfulPolicyOverride(value) {
      return Boolean(
        value
        && typeof value === "object"
        && Object.keys(value).some(key => value[key] !== undefined)
      );
    }

    function mergePolicyRecord(proposed = {}, override = {}) {
      const base = cloneData(proposed || {});
      if (!meaningfulPolicyOverride(override)) return base;
      Object.keys(override).forEach(key => {
        if (override[key] !== undefined) base[key] = cloneData(override[key]);
      });
      return base;
    }

    function mergeNormalizationPolicies(proposedPolicies = null, userOverrides = null) {
      const proposed = proposedPolicies && typeof proposedPolicies === "object" ? proposedPolicies : {};
      const overrides = userOverrides && typeof userOverrides === "object" ? userOverrides : {};
      const merged = cloneData(proposed || {});
      const proposedFields = proposed.fields || {};
      const overrideFields = overrides.fields || {};
      const fields = {};
      [...new Set([...Object.keys(proposedFields), ...Object.keys(overrideFields)])].forEach(fieldKey => {
        const proposedField = proposedFields[fieldKey] || {};
        const overrideField = overrideFields[fieldKey] || {};
        if (meaningfulPolicyOverride(proposedField) || meaningfulPolicyOverride(overrideField)) {
          const validOverride = policiesShareSourceIdentity(proposedField, overrideField) ? overrideField : {};
          fields[fieldKey] = mergePolicyRecord(proposedField, validOverride);
        }
      });
      Object.keys(overrides).forEach(key => {
        if (key === "fields" || overrides[key] === undefined) return;
        merged[key] = cloneData(overrides[key]);
      });
      merged.fields = fields;
      return merged;
    }

    function normalizationPolicySignature(policy = {}) {
      return stableJson(policy || {});
    }

    function proposedNormalizationPolicies(mappingEvidence = [], normalizationPolicy = {}, sourceColumnMetadata = []) {
      const basePolicy = normalizationPolicy && typeof normalizationPolicy === "object" ? normalizationPolicy : {};
      const fields = { ...(basePolicy.fields || {}) };
      mappingEvidence.forEach(entry => {
        const proposal = proposedPolicyForEvidence(entry, sourceColumnMetadata);
        if (!proposal) return;
        const [fieldKey, policy] = proposal;
        fields[fieldKey] = {
          ...policy,
          ...(fields[fieldKey] || {})
        };
      });
      return {
        ...cloneData(basePolicy),
        fields
      };
    }

    function reviewedMappingFromEvidence(mappingEvidence = [], normalizationPolicy = {}, sourceColumnMetadata = []) {
      const policies = proposedNormalizationPolicies(mappingEvidence, normalizationPolicy, sourceColumnMetadata);
      return mappingEvidence.map(entry => {
        const fieldKey = entry.selectedCanonicalField || "";
        const policy = fieldKey ? policies.fields?.[fieldKey] || null : null;
        const overallConfidence = entry.overallConfidence || entry.confidence || "none";
        return {
          ...cloneData(entry),
          baseConfidence: entry.baseConfidence || entry.proposedConfidence || entry.confidence || "none",
          overallConfidence,
          confidence: overallConfidence,
          evidenceReasons: [...(entry.evidenceReasons || [])],
          warnings: [...(entry.warnings || entry.profileEvidence?.warnings || [])],
          normalizationPolicy: cloneData(policy)
        };
      });
    }

    function assessInputTrust({
      packageType = "inventory_snapshot",
      headers = [],
      rows = [],
      sourceColumnMetadata = [],
      mapping = [],
      mappingPolicy = null,
      fieldDefinitions: activeFieldDefinitions = fieldDefinitions,
      priorPackage = null,
      normalizationPolicy = {},
      sourceDescriptor = {}
    } = {}) {
      const evaluatedAt = clock();
      const schemaProfile = schemaProfiler.profileSourceSchema({ headers, rows, sourceColumnMetadata });
      const priorProfile = priorPackage?.inputTrustMetadata?.schemaProfile
        || priorPackage?.inputTrustMetadata
        || priorPackage?.buildData?.buildMetadata?.inputTrustMetadata
        || null;
      const schemaDrift = priorProfile
        ? schemaProfiler.compareSchemaProfiles(schemaProfile, priorProfile)
        : null;
      const mappingValidation = mappingEngine.validateColumnMapping(mapping || [], {
        sourceColumnMetadata,
        policy: mappingPolicy || undefined,
        fieldDefinitions: activeFieldDefinitions
      });
      const mappingEvidence = mappingEngine.buildMappingEvidence(mappingValidation.mapping, {
        sourceColumnMetadata,
        policy: mappingPolicy || undefined,
        fieldDefinitions: activeFieldDefinitions,
        columnProfiles: schemaProfile.columns,
        schemaWarnings: schemaDrift?.warnings || []
      });
      const canonicalRows = mappingValidation.valid
        ? mappedRowsForTrust({
          headers,
          rows,
          mapping: mappingValidation.mapping,
          sourceColumnMetadata,
          mappingPolicy,
          fieldDefinitions: activeFieldDefinitions
        })
        : [];
      const effectiveNormalizationPolicy = normalizationPolicy && typeof normalizationPolicy === "object"
        ? normalizationPolicy
        : {};
      const normalization = inputNormalizationEngine.normalizeRows({
        rows: canonicalRows,
        columnMapping: mappingValidation.mapping,
        sourceColumnMetadata,
        fieldDefinitions: activeFieldDefinitions,
        normalizationPolicy: effectiveNormalizationPolicy,
        mappingPolicy: mappingPolicy || {},
        localeOptions: effectiveNormalizationPolicy.localeOptions || {}
      });
      const mappingDiagnostics = diagnosticsFromMappingEvidence(mappingEvidence, schemaProfile, activeFieldDefinitions);
      const mappingValidationDiagnostics = (mappingValidation.errors || []).map(error => ({
        ...cloneData(error),
        code: error.key || "mapping_invalid",
        severity: "error"
      }));
      const diagnostics = [
        ...mappingValidationDiagnostics,
        ...mappingDiagnostics,
        ...(normalization.diagnostics || [])
      ];
      const trustState = trustStateFor({ mappingValidation, normalization, mappingDiagnostics, schemaDrift });
      const result = {
        ok: trustState !== "blocked",
        packageType,
        sourceDescriptor: cloneData(sourceDescriptor || {}),
        trustState,
        status: trustState,
        evaluatedAt,
        schemaProfile,
        schemaDrift,
        mappingValidation,
        mappingEvidence,
        normalizationPolicy: cloneData(normalization.normalizationPolicy || effectiveNormalizationPolicy),
        normalizationSummary: normalization.summary,
        normalizationDiagnostics: normalization.diagnostics,
        diagnostics,
        normalizedPreviewRows: normalization.normalizedRows,
        inputTrustMetadata: null
      };
      result.inputTrustMetadata = compactInputTrustMetadata(result);
      return freezeResult(result);
    }

    function prepareInputTrustAssessment(input = {}) {
      const result = assessInputTrust(input);
      const blockingDiagnostics = (result.diagnostics || []).filter(diagnostic => diagnostic.severity === "error");
      const reviewDiagnostics = (result.diagnostics || []).filter(diagnostic => diagnostic.severity === "warning");
      const proposedPolicies = proposedNormalizationPolicies(result.mappingEvidence || [], result.normalizationPolicy || input.normalizationPolicy || {}, input.sourceColumnMetadata || []);
      return freezeResult({
        ...result,
        proposedMapping: cloneData(input.mapping || []),
        reviewedMapping: reviewedMappingFromEvidence(result.mappingEvidence || [], proposedPolicies, input.sourceColumnMetadata || []),
        proposedNormalizationPolicies: proposedPolicies,
        columnProfiles: cloneData(result.schemaProfile?.columns || []),
        schemaFingerprint: cloneData(result.schemaProfile?.semanticSignature || null),
        blockingDiagnostics,
        reviewDiagnostics,
        diagnosticSummary: diagnosticSummary(result.diagnostics || [])
      });
    }

      return Object.freeze({
      version: VERSION,
      assessInputTrust,
      prepareInputTrustAssessment,
      compactInputTrustMetadata,
      sourceIdentityForMappingEntry,
      normalizationPolicyMatchesSourceIdentity,
      mergeNormalizationPolicies,
      normalizationPolicySignature
    });
  }

  root.application.inputTrustService = Object.freeze({
    version: VERSION,
    createInputTrustService
  });
})(window);
