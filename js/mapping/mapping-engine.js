/* ObsoliQ Mapping Engine
 * Deterministic source-to-canonical mapping proposal, validation and application.
 */
(function registerMappingEngine(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.mapping = root.mapping || {};

  const canonical = root.core?.canonical;
  const sourceModel = root.data?.sourceModel;
  if (!canonical) {
    throw new Error("ObsoliQ mapping engine requires the canonical module.");
  }
  if (!sourceModel) {
    throw new Error("ObsoliQ mapping engine requires the source-model module.");
  }

  const {
    inventoryFieldDefinitions,
    normalizeHeaderToken,
    normalizeMap,
    protectedImportFieldKeys,
    safeImportFieldKey
  } = canonical;
  const isValidSourceIndex = sourceModel.isValidSourceIndex;

  const DEFAULT_MAPPING_POLICY = Object.freeze({
    requiredFields: Object.freeze(["material_id", "stock_value"]),
    organizationFields: Object.freeze(["profit_center", "plant", "div"]),
    workflowFields: Object.freeze([
      "mrp_controller",
      "purchase_organization",
      "accountable_l1",
      "responsible_l1",
      "production_scheduler",
      "gac_purchasing"
    ]),
    recoveryInputFields: Object.freeze([
      "direct_no_need_value",
      "no_need_conso_value",
      "no_need_no_con_value",
      "no_plan_value",
      "excess_value",
      "bad_stock_value"
    ])
  });

  function normalizeHeader(header) {
    const token = normalizeHeaderToken(header);
    return normalizeMap[token] || token.replace(/\s+/g, "_");
  }

  function mappingOptions(options = {}) {
    return {
      sourceColumnMetadata: Array.isArray(options.sourceColumnMetadata) ? options.sourceColumnMetadata : [],
      policy: options.policy || DEFAULT_MAPPING_POLICY
    };
  }

  function parseMappingInput(input = {}) {
    const config = input || {};
    return {
      headers: Array.isArray(config.headers) ? config.headers : [],
      rows: Array.isArray(config.rows) ? config.rows : [],
      ...mappingOptions({
        sourceColumnMetadata: config.sourceColumnMetadata,
        policy: config.policy
      })
    };
  }

  function sourceOriginalHeader(sourceColumn, sourceIndex = null, options = {}) {
    const { sourceColumnMetadata } = mappingOptions(options);
    return sourceModel.sourceOriginalHeader(sourceColumn, sourceIndex, sourceColumnMetadata);
  }

  function sourceTechnicalKey(sourceColumn, sourceIndex = null, options = {}) {
    const { sourceColumnMetadata } = mappingOptions(options);
    return sourceModel.sourceTechnicalKey(sourceColumn, sourceIndex, sourceColumnMetadata);
  }

  function determineMappingMatchType(sourceColumn, canonicalField, options = {}) {
    if (!canonicalField || !inventoryFieldDefinitions[canonicalField]) return "unknown";
    if (protectedImportFieldKeys.has(canonicalField)) return "protected";
    const definition = inventoryFieldDefinitions[canonicalField];
    const sourceIndex = options.sourceIndex ?? null;
    const sourceLabel = sourceOriginalHeader(sourceColumn, sourceIndex, options);
    const sourceToken = normalizeHeaderToken(sourceLabel);
    const technicalSourceKey = sourceTechnicalKey(sourceColumn, sourceIndex, options);
    if (technicalSourceKey === canonicalField || sourceToken === normalizeHeaderToken(canonicalField)) return "exact";
    if ([definition.label?.de, definition.label?.en, ...(definition.aliases || [])].some(alias => normalizeHeaderToken(alias) === sourceToken)) {
      return "alias";
    }
    if (normalizeHeader(sourceLabel) === canonicalField) return "normalized";
    return "unknown";
  }

  function confidenceForMatchType(matchType, canonicalField) {
    if (!canonicalField || matchType === "unknown") return "none";
    if (matchType === "exact" || matchType === "alias" || matchType === "protected") return "high";
    if (matchType === "normalized") return "medium";
    if (matchType === "manual") return "high";
    return "low";
  }

  function sampleValuesForSource(rows, sourceColumn) {
    const values = [];
    rows.forEach(row => {
      const value = String(row?.[sourceColumn] ?? "").trim();
      if (!value || values.includes(value)) return;
      values.push(value);
    });
    return values.slice(0, 3);
  }

  function buildMappingEvidence(mapping = [], options = {}) {
    const columnProfiles = options.columnProfiles || [];
    const profileByIndex = new Map(columnProfiles.map(profile => [profile.sourceIndex, profile]));
    const schemaWarnings = options.schemaWarnings || [];
    return refreshColumnMappingStatuses(mapping, options).map(entry => {
      const definition = inventoryFieldDefinitions[entry.selectedCanonicalField || entry.proposedCanonicalField || ""];
      const profile = profileByIndex.get(entry.sourceIndex) || null;
      const expectedNumeric = Boolean(definition && ["number", "currency", "percentage"].includes(definition.type));
      const numericEvidence = profile && expectedNumeric
        ? profile.numericLikeRatio
        : profile && definition?.type === "text"
          ? Math.max(profile.textLikeRatio || 0, 0.5)
          : null;
      const typeEvidence = profile && definition
        ? expectedNumeric
          ? profile.numericLikeRatio >= 0.8 ? "compatible" : profile.numericLikeRatio >= 0.35 ? "review" : "incompatible"
          : "compatible"
        : "not_available";
      const evidenceWarnings = [
        ...(typeEvidence === "incompatible" ? ["content_type_mismatch"] : []),
        ...(profile?.localeProfile?.status === "mixed" ? ["mixed_numeric_locale"] : []),
        ...(schemaWarnings || [])
      ];
      const evidenceConfidence = typeEvidence === "compatible"
        ? entry.confidence
        : typeEvidence === "review"
          ? "medium"
          : typeEvidence === "incompatible"
            ? "low"
            : entry.confidence;
      const headerConfidence = entry.proposedConfidence || entry.confidence || "none";
      const aliasConfidence = ["exact", "alias", "normalized", "manual", "protected"].includes(entry.proposedMatchType || entry.matchType)
        ? headerConfidence
        : "none";
      const typeConfidence = typeEvidence === "compatible" ? "high" : typeEvidence === "review" ? "medium" : typeEvidence === "incompatible" ? "low" : "none";
      const sampleConfidence = numericEvidence === null
        ? "none"
        : numericEvidence >= 0.8
          ? "high"
          : numericEvidence >= 0.35
            ? "medium"
            : "low";
      const unitConfidence = profile?.headerHints?.sourceScaleFactor !== 1 || profile?.headerHints?.sourceCurrency ? "high" : "none";
      const localeConfidence = profile?.localeProfile?.status === "mixed"
        ? "low"
        : profile?.localeProfile?.status === "dominant"
          ? "high"
          : profile?.localeProfile?.status
            ? "medium"
            : "none";
      const schemaConfidence = schemaWarnings.length ? "medium" : "high";
      const evidenceReasons = [
        ...(entry.proposedMatchType || entry.matchType ? [`header_${entry.proposedMatchType || entry.matchType}`] : []),
        ...(typeEvidence !== "not_available" ? [`content_${typeEvidence}`] : []),
        ...(profile?.localeProfile?.dominantLocale ? [`locale_${profile.localeProfile.dominantLocale}`] : []),
        ...(profile?.headerHints?.sourceScaleFactor && profile.headerHints.sourceScaleFactor !== 1 ? [`header_scale_${profile.headerHints.sourceScaleFactor}`] : []),
        ...(profile?.headerHints?.sourceCurrency ? [`currency_${profile.headerHints.sourceCurrency}`] : [])
      ];
      return {
        ...entry,
        baseConfidence: entry.confidence,
        headerConfidence,
        aliasConfidence,
        typeConfidence,
        sampleConfidence,
        unitConfidence,
        localeConfidence,
        schemaConfidence,
        overallConfidence: evidenceConfidence,
        confidence: evidenceConfidence,
        evidenceReasons,
        warnings: evidenceWarnings,
        profileEvidence: profile ? {
          numericLikeRatio: profile.numericLikeRatio,
          textLikeRatio: profile.textLikeRatio,
          localeStatus: profile.localeProfile?.status || "",
          detectedLocale: profile.localeProfile?.dominantLocale || "",
          detectedContentType: expectedNumeric ? "numeric" : definition?.type || "",
          headerScaleFactor: profile.headerHints?.sourceScaleFactor || 1,
          headerCurrency: profile.headerHints?.sourceCurrency || "",
          headerUnit: profile.headerHints?.sourceUnit || "",
          typeEvidence,
          evidenceConfidence,
          warnings: evidenceWarnings
        } : null
      };
    });
  }

  function cloneColumnMapping(mapping = []) {
    return mapping.map(entry => ({
      ...entry,
      sampleValues: [...(entry.sampleValues || [])]
    }));
  }

  function refreshColumnMappingStatuses(mapping = [], options = {}) {
    const next = cloneColumnMapping(mapping);
    const canonicalCounts = new Map();

    next.forEach(entry => {
      const proposal = entry.proposedCanonicalField || "";
      const proposedMatchType = entry.proposedMatchType || entry.matchType || (proposal
        ? determineMappingMatchType(entry.sourceColumn, proposal, { ...options, sourceIndex: entry.sourceIndex })
        : "unknown");
      const proposedConfidence = entry.proposedConfidence || confidenceForMatchType(proposedMatchType, proposal);
      entry.proposedMatchType = entry.protected ? "protected" : proposedMatchType;
      entry.proposedConfidence = entry.protected ? "high" : proposedConfidence;
    });

    next.forEach(entry => {
      const selected = entry.selectedCanonicalField;
      const definition = selected ? inventoryFieldDefinitions[selected] : null;
      if (selected && definition?.importable !== false) {
        canonicalCounts.set(selected, (canonicalCounts.get(selected) || 0) + 1);
      }
    });

    next.forEach(entry => {
      const selected = entry.selectedCanonicalField;
      const definition = selected ? inventoryFieldDefinitions[selected] : null;
      if (entry.protected) {
        entry.status = "protected";
        entry.ignored = true;
        entry.manual = false;
        entry.matchType = entry.proposedMatchType;
        entry.confidence = entry.proposedConfidence;
        return;
      }
      if (!selected) {
        entry.status = entry.proposedCanonicalField ? "ignored" : "unmapped";
        entry.ignored = true;
        entry.manual = false;
        entry.matchType = entry.proposedCanonicalField ? entry.proposedMatchType : "unknown";
        entry.confidence = "none";
        return;
      }
      if (selected === entry.proposedCanonicalField) {
        entry.manual = false;
        entry.matchType = entry.proposedMatchType;
        entry.confidence = entry.proposedConfidence;
      } else {
        entry.manual = true;
        entry.matchType = "manual";
        entry.confidence = "high";
      }
      if (!definition || definition.importable === false) {
        entry.status = "conflict";
        entry.ignored = false;
        return;
      }
      if ((canonicalCounts.get(selected) || 0) > 1) {
        entry.status = "duplicate";
        entry.ignored = false;
        return;
      }
      entry.status = "mapped";
      entry.ignored = false;
    });

    return next;
  }

  function createAutomaticColumnMapping(input = {}) {
    const { headers, rows, sourceColumnMetadata } = parseMappingInput(input);
    const options = { sourceColumnMetadata };
    const automaticSelections = new Set();
    const mapping = headers.map((sourceColumn, sourceIndex) => {
      const sourceLabel = sourceOriginalHeader(sourceColumn, sourceIndex, options);
      const normalizedSourceColumn = sourceTechnicalKey(sourceColumn, sourceIndex, options);
      const canonicalField = normalizeHeader(sourceLabel);
      const definition = inventoryFieldDefinitions[canonicalField] || null;
      const isProtected = Boolean(definition && protectedImportFieldKeys.has(canonicalField));
      const isImportable = Boolean(definition && definition.importable !== false && !isProtected);
      const matchType = isProtected ? "protected" : definition
        ? determineMappingMatchType(sourceColumn, canonicalField, { ...options, sourceIndex })
        : "unknown";
      const confidence = confidenceForMatchType(matchType, definition ? canonicalField : "");
      const duplicateAutoKey = isImportable ? `${canonicalField}::${normalizeHeaderToken(sourceLabel)}` : "";
      const selectedCanonicalField = isImportable && !automaticSelections.has(duplicateAutoKey) ? canonicalField : "";
      if (selectedCanonicalField) automaticSelections.add(duplicateAutoKey);
      return {
        sourceIndex,
        sourceColumn,
        normalizedSourceColumn,
        proposedCanonicalField: definition ? canonicalField : "",
        proposedMatchType: matchType,
        proposedConfidence: confidence,
        selectedCanonicalField,
        matchType,
        confidence,
        status: isProtected ? "protected" : selectedCanonicalField ? "mapped" : "unmapped",
        protected: isProtected,
        ignored: !selectedCanonicalField,
        manual: false,
        sampleValues: sampleValuesForSource(rows, sourceColumn)
      };
    });
    return refreshColumnMappingStatuses(mapping, options);
  }

  function columnMappingSignature(mapping = [], options = {}) {
    return refreshColumnMappingStatuses(mapping, options).map(entry => [
      entry.sourceColumn,
      entry.sourceIndex,
      entry.selectedCanonicalField || "",
      entry.ignored ? "ignored" : "mapped",
      entry.manual ? "manual" : "auto"
    ].join(":")).join("|");
  }

  function columnMappingsEqual(a = [], b = [], options = {}) {
    return columnMappingSignature(a, options) === columnMappingSignature(b, options);
  }

  function mappingSelectedFields(mapping) {
    return new Set(mapping
      .filter(entry => entry.selectedCanonicalField && entry.status !== "protected")
      .map(entry => entry.selectedCanonicalField));
  }

  function mappingSourceForField(mapping, fieldKey) {
    return mapping.find(entry => entry.selectedCanonicalField === fieldKey && entry.status === "mapped") || null;
  }

  function validateColumnMapping(mapping = [], options = {}) {
    const { policy } = mappingOptions(options);
    const refreshed = refreshColumnMappingStatuses(mapping, options);
    const selectedFields = mappingSelectedFields(refreshed);
    const duplicateCanonicalMappings = [];
    const protectedMappings = refreshed.filter(entry => entry.protected);
    const errors = [];
    const warnings = [];

    policy.requiredFields.forEach(fieldKey => {
      if (!selectedFields.has(fieldKey)) {
        errors.push({ key: "mappingMissingRequired", field: fieldKey });
      }
    });

    const canonicalGroups = new Map();
    refreshed.forEach(entry => {
      const selected = entry.selectedCanonicalField;
      if (!selected) return;
      const definition = inventoryFieldDefinitions[selected];
      if (!definition) {
        errors.push({ key: "mappingInvalidTarget", sourceColumn: entry.sourceColumn, field: selected });
        return;
      }
      if (definition.importable === false) {
        errors.push({ key: "mappingDerivedTarget", sourceColumn: entry.sourceColumn, field: selected });
        return;
      }
      const group = canonicalGroups.get(selected) || [];
      group.push(entry);
      canonicalGroups.set(selected, group);
    });

    canonicalGroups.forEach((entries, fieldKey) => {
      if (entries.length > 1) {
        duplicateCanonicalMappings.push({ field: fieldKey, sources: entries.map(entry => entry.sourceColumn) });
        errors.push({ key: "mappingDuplicateTarget", field: fieldKey, sources: entries.map(entry => entry.sourceColumn) });
      }
    });

    if (!policy.organizationFields.some(fieldKey => selectedFields.has(fieldKey))) {
      warnings.push({ key: "mappingNoOrganizationField" });
    }
    if (!policy.recoveryInputFields.some(fieldKey => selectedFields.has(fieldKey))) {
      warnings.push({ key: "mappingNoRecoveryField" });
    }
    if (!policy.workflowFields.some(fieldKey => selectedFields.has(fieldKey))) {
      warnings.push({ key: "mappingNoWorkflowField" });
    }
    const unknownColumns = refreshed.filter(entry => !entry.selectedCanonicalField && !entry.protected);
    if (unknownColumns.length) {
      warnings.push({ key: "mappingUnknownColumnsRemain", count: unknownColumns.length });
    }
    if (protectedMappings.length) {
      warnings.push({ key: "mappingProtectedColumnsPreserved", count: protectedMappings.length });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      missingRequiredFields: policy.requiredFields.filter(fieldKey => !selectedFields.has(fieldKey)),
      duplicateCanonicalMappings,
      protectedMappings,
      mapping: refreshed
    };
  }

  function evaluateMappingState(mapping = [], headersOrOptions = [], maybeOptions = {}) {
    const options = Array.isArray(headersOrOptions) ? maybeOptions : headersOrOptions || {};
    const headers = Array.isArray(headersOrOptions) ? headersOrOptions : options.headers || [];
    const { policy } = mappingOptions(options);
    const validation = validateColumnMapping(mapping, options);
    const selectedFields = mappingSelectedFields(validation.mapping);
    const requiredLowConfidence = validation.mapping.some(entry => (
      policy.requiredFields.includes(entry.selectedCanonicalField)
      && ["low", "none"].includes(entry.confidence)
    ));
    const reviewRequired = validation.errors.length > 0
      || validation.duplicateCanonicalMappings.length > 0
      || requiredLowConfidence
      || validation.protectedMappings.length > 0
      || !policy.recoveryInputFields.some(fieldKey => selectedFields.has(fieldKey));

    return {
      reviewRequired,
      requiredLowConfidence,
      sourceColumnCount: headers.length || mapping.length,
      ...validation
    };
  }

  function mappingTargetKey(entry, options = {}) {
    if (entry.protected && entry.proposedCanonicalField) return safeImportFieldKey(entry.proposedCanonicalField);
    if (entry.selectedCanonicalField) return entry.selectedCanonicalField;
    return sourceTechnicalKey(entry.sourceColumn, entry.sourceIndex, options);
  }

  function applyApprovedColumnMapping(input = {}) {
    const config = input || {};
    const headers = Array.isArray(config.headers) ? config.headers : [];
    const rows = Array.isArray(config.rows) ? config.rows : [];
    const mapping = Array.isArray(config.mapping) ? config.mapping : [];
    const options = mappingOptions({
      sourceColumnMetadata: config.sourceColumnMetadata,
      policy: config.policy
    });
    const sourceColumnMetadata = options.sourceColumnMetadata;

    const approved = refreshColumnMappingStatuses(mapping, options);
    const seen = {};
    const pairs = headers.map((sourceColumn, sourceIndex) => {
      const entry = approved.find(candidate => (
        isValidSourceIndex?.(candidate.sourceIndex)
        && candidate.sourceIndex === sourceIndex
      ))
        || approved.find(candidate => candidate.sourceColumn === sourceColumn)
        || createAutomaticColumnMapping({
          headers: [sourceColumn],
          rows: [rows[0] || {}],
          sourceColumnMetadata: sourceColumnMetadata.slice(sourceIndex, sourceIndex + 1),
          policy: options.policy
        })[0];
      const base = mappingTargetKey(entry, options);
      seen[base] = (seen[base] || 0) + 1;
      return {
        sourceColumn,
        key: seen[base] === 1 ? base : `${base}_${seen[base]}`
      };
    });

    return rows.map((row, rowIndex) => {
      const item = {};
      pairs.forEach(({ sourceColumn, key }) => {
        item[key] = row?.[sourceColumn] ?? "";
      });
      item.__sourceRowIndex = row?.__sourceRowIndex ?? rowIndex + 1;
      return item;
    });
  }

  function runMappingEngineSelfTests() {
    const auto = createAutomaticColumnMapping({
      headers: ["Material Number", "MATNR", "Stock Value EUR", "No Demand Value", "Custom Segment", "Recovery Potential"],
      rows: [{ "Material Number": "MAT-1", MATNR: "MAT-1", "Stock Value EUR": "100", "No Demand Value": "20", "Custom Segment": "A", "Recovery Potential": "999" }]
    });
    console.assert(auto.find(entry => entry.sourceColumn === "Material Number")?.proposedCanonicalField === "material_id", "Mapping engine self-test failed: Material Number maps");
    console.assert(auto.find(entry => entry.sourceColumn === "MATNR")?.proposedCanonicalField === "material_id", "Mapping engine self-test failed: MATNR maps");
    console.assert(auto.find(entry => entry.sourceColumn === "Stock Value EUR")?.proposedCanonicalField === "stock_value", "Mapping engine self-test failed: stock value maps");
    console.assert(auto.find(entry => entry.sourceColumn === "No Demand Value")?.proposedCanonicalField === "direct_no_need_value", "Mapping engine self-test failed: no-demand maps");
    console.assert(auto.find(entry => entry.sourceColumn === "Custom Segment")?.status === "unmapped", "Mapping engine self-test failed: unknown remains unmapped");
    console.assert(auto.find(entry => entry.sourceColumn === "Recovery Potential")?.status === "protected", "Mapping engine self-test failed: protected derived field");

    console.assert(!validateColumnMapping(createAutomaticColumnMapping({ headers: ["Stock Value EUR"], rows: [{ "Stock Value EUR": "100" }] })).valid, "Mapping engine self-test failed: material required");
    console.assert(!validateColumnMapping(createAutomaticColumnMapping({ headers: ["Material Number"], rows: [{ "Material Number": "MAT-1" }] })).valid, "Mapping engine self-test failed: stock required");
    console.assert(validateColumnMapping(createAutomaticColumnMapping({ headers: ["Material", "Material Number", "Stock Value"], rows: [{ Material: "MAT-1", "Material Number": "MAT-1", "Stock Value": "100" }] })).duplicateCanonicalMappings.length > 0, "Mapping engine self-test failed: duplicate target");

    const manualHeaders = ["Item", "Value", "Ignore Me", "Recovery Potential"];
    const manualRows = [{ Item: "MAT-0", Value: "0", "Ignore Me": "keep", "Recovery Potential": "900" }];
    const manualMapping = createAutomaticColumnMapping({ headers: manualHeaders, rows: manualRows }).map(entry => {
      if (entry.sourceColumn === "Item") return { ...entry, selectedCanonicalField: "material_id", matchType: "manual", confidence: "high" };
      if (entry.sourceColumn === "Value") return { ...entry, selectedCanonicalField: "stock_value", matchType: "manual", confidence: "high" };
      return entry;
    });
    const applied = applyApprovedColumnMapping({ headers: manualHeaders, rows: manualRows, mapping: manualMapping })[0];
    console.assert(applied.material_id === "MAT-0", "Mapping engine self-test failed: manual material apply");
    console.assert(applied.stock_value === "0", "Mapping engine self-test failed: explicit zero preserved");
    console.assert(applied.ignore_me === "keep", "Mapping engine self-test failed: unknown source preserved");
    console.assert(applied.source_recovery_potential === "900", "Mapping engine self-test failed: protected source preserved");

    const duplicateDataset = sourceModel.buildParsedSourceDataset(
      ["Material", "Stock Value", "Safety Stock Target", "Safety Stock Target"],
      [["MAT-1", "100", "10", "20"]]
    );
    const duplicateMapping = createAutomaticColumnMapping({
      headers: duplicateDataset.headers,
      rows: duplicateDataset.rows,
      sourceColumnMetadata: duplicateDataset.sourceColumnMetadata
    });
    const duplicateApplied = applyApprovedColumnMapping({
      headers: duplicateDataset.headers,
      rows: duplicateDataset.rows,
      mapping: duplicateMapping,
      sourceColumnMetadata: duplicateDataset.sourceColumnMetadata
    })[0];
    console.assert(duplicateApplied.safety_stock_target === "10", "Mapping engine self-test failed: first duplicate header value");
    console.assert(duplicateApplied.safety_stock_target_2 === "20", "Mapping engine self-test failed: second duplicate header value");

    const refreshed = refreshColumnMappingStatuses(manualMapping);
    refreshed[0].sampleValues.push("mutated");
    console.assert(!manualMapping[0].sampleValues.includes("mutated"), "Mapping engine self-test failed: clone immutability");
    console.assert(columnMappingsEqual(manualMapping, manualMapping.map(entry => ({ ...entry }))), "Mapping engine self-test failed: semantic equality");
    console.assert(!columnMappingsEqual(manualMapping, manualMapping.map((entry, index) => index === 0 ? { ...entry, selectedCanonicalField: "stock_value" } : entry)), "Mapping engine self-test failed: changed target inequality");
  }

  root.mapping.engine = Object.freeze({
    version: "1",
    DEFAULT_MAPPING_POLICY,
    normalizeHeader,
    determineMappingMatchType,
    confidenceForMatchType,
    sampleValuesForSource,
    buildMappingEvidence,
    cloneColumnMapping,
    columnMappingSignature,
    columnMappingsEqual,
    refreshColumnMappingStatuses,
    createAutomaticColumnMapping,
    mappingSelectedFields,
    mappingSourceForField,
    validateColumnMapping,
    evaluateMappingState,
    applyApprovedColumnMapping,
    runMappingEngineSelfTests
  });
})(window);
