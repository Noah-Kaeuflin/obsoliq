/* ObsoliQ Schema Profiler
 * Pure source schema and content profiling for deterministic input-trust checks.
 */
(function registerSchemaProfiler(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.data = root.data || {};

  const canonical = root.core?.canonical;
  const valueUtils = root.core?.valueUtils;
  if (!canonical) throw new Error("ObsoliQ schema profiler requires the canonical module.");
  if (!valueUtils) throw new Error("ObsoliQ schema profiler requires the value-utils module.");

  const { normalizeHeaderToken } = canonical;
  const { inferNumericLocaleProfile, extractSourceHeaderHints, parseLocalizedNumericValue } = valueUtils;
  const VERSION = "1";
  const PROFILE_SAMPLE_LIMIT = 250;

  function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function hashStable(value) {
    const text = stableJson(value);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function sourceValue(row, meta) {
    if (!row || !meta) return "";
    if (Object.prototype.hasOwnProperty.call(row, meta.sourceKey)) return row[meta.sourceKey] ?? "";
    if (Object.prototype.hasOwnProperty.call(row, meta.originalHeader)) return row[meta.originalHeader] ?? "";
    return "";
  }

  function metadataFromHeaders(headers = [], sourceColumnMetadata = []) {
    if (Array.isArray(sourceColumnMetadata) && sourceColumnMetadata.length) {
      return sourceColumnMetadata.map((meta, index) => ({
        sourceKey: meta.sourceKey || headers[index] || `Column ${index + 1}`,
        originalHeader: meta.originalHeader || headers[index] || `Column ${index + 1}`,
        sourceIndex: Number.isInteger(meta.sourceIndex) ? meta.sourceIndex : index,
        duplicateIndex: meta.duplicateIndex || 1,
        duplicateCount: meta.duplicateCount || 1,
        normalizedOriginalHeader: meta.normalizedOriginalHeader || normalizeHeaderToken(meta.originalHeader || headers[index] || "")
      }));
    }
    return headers.map((header, sourceIndex) => ({
      sourceKey: header,
      originalHeader: header,
      sourceIndex,
      duplicateIndex: 1,
      duplicateCount: 1,
      normalizedOriginalHeader: normalizeHeaderToken(header)
    }));
  }

  function classifySample(value) {
    if (value === null || value === undefined || String(value).trim() === "") return "empty";
    const numeric = parseLocalizedNumericValue({
      rawValue: value,
      fieldDefinition: { type: "number" },
      normalizationPolicy: { allowAmbiguousFallback: true }
    });
    if (numeric.status === "valid" && Number.isFinite(numeric.normalizedValue)) return "numeric";
    return "text";
  }

  function profileColumn(rows = [], meta = {}) {
    const samples = [];
    const unique = new Set();
    let emptyCount = 0;
    let numericLikeCount = 0;
    let textLikeCount = 0;
    const values = [];
    rows.slice(0, PROFILE_SAMPLE_LIMIT).forEach(row => {
      const value = sourceValue(row, meta);
      values.push(value);
      const stringValue = String(value ?? "").trim();
      if (stringValue && samples.length < 5 && !samples.includes(stringValue)) samples.push(stringValue);
      if (stringValue) unique.add(stringValue);
      const kind = classifySample(value);
      if (kind === "empty") emptyCount += 1;
      else if (kind === "numeric") numericLikeCount += 1;
      else textLikeCount += 1;
    });
    const populatedCount = Math.max(0, Math.min(rows.length, PROFILE_SAMPLE_LIMIT) - emptyCount);
    const localeProfile = inferNumericLocaleProfile(values);
    const headerHints = extractSourceHeaderHints(meta.originalHeader || meta.sourceKey || "");
    return Object.freeze({
      sourceIndex: meta.sourceIndex,
      sourceKey: meta.sourceKey,
      originalHeader: meta.originalHeader,
      normalizedOriginalHeader: meta.normalizedOriginalHeader || normalizeHeaderToken(meta.originalHeader || ""),
      duplicateIndex: meta.duplicateIndex || 1,
      duplicateCount: meta.duplicateCount || 1,
      rowSampleSize: Math.min(rows.length, PROFILE_SAMPLE_LIMIT),
      populatedCount,
      emptyCount,
      uniqueSampleCount: unique.size,
      numericLikeCount,
      textLikeCount,
      numericLikeRatio: populatedCount ? numericLikeCount / populatedCount : 0,
      textLikeRatio: populatedCount ? textLikeCount / populatedCount : 0,
      localeProfile,
      headerHints,
      sampleValues: samples
    });
  }

  function profileSourceSchema({ headers = [], rows = [], sourceColumnMetadata = [] } = {}) {
    const metadata = metadataFromHeaders(headers, sourceColumnMetadata);
    const columns = metadata.map(meta => profileColumn(rows, meta));
    const semanticSignature = semanticSchemaSignature(columns);
    const physicalSignature = physicalSchemaSignature(columns);
    return Object.freeze({
      version: VERSION,
      rowCount: rows.length,
      columnCount: columns.length,
      columns,
      semanticSignature,
      physicalSignature
    });
  }

  function semanticSchemaSignature(columnsOrProfile = []) {
    const columns = Array.isArray(columnsOrProfile) ? columnsOrProfile : columnsOrProfile.columns || [];
    const payload = columns
      .map(column => ({
        header: column.normalizedOriginalHeader || normalizeHeaderToken(column.originalHeader || ""),
        duplicateCount: column.duplicateCount || 1,
        headerScale: column.headerHints?.sourceScaleFactor || 1,
        headerCurrency: column.headerHints?.sourceCurrency || ""
      }))
      .sort((a, b) => `${a.header}:${a.duplicateCount}`.localeCompare(`${b.header}:${b.duplicateCount}`));
    return Object.freeze({ version: VERSION, kind: "semantic", hash: hashStable(payload), columnCount: payload.length, payload });
  }

  function physicalSchemaSignature(columnsOrProfile = []) {
    const columns = Array.isArray(columnsOrProfile) ? columnsOrProfile : columnsOrProfile.columns || [];
    const payload = columns
      .slice()
      .sort((a, b) => a.sourceIndex - b.sourceIndex)
      .map(column => ({
        sourceIndex: column.sourceIndex,
        sourceKey: column.sourceKey,
        header: column.normalizedOriginalHeader || normalizeHeaderToken(column.originalHeader || ""),
        duplicateIndex: column.duplicateIndex || 1
      }));
    return Object.freeze({ version: VERSION, kind: "physical", hash: hashStable(payload), columnCount: payload.length, payload });
  }

  function compareSchemaProfiles(currentProfile = {}, priorProfile = {}) {
    const currentSemantic = currentProfile.semanticSignature || semanticSchemaSignature(currentProfile);
    const currentPhysical = currentProfile.physicalSignature || physicalSchemaSignature(currentProfile);
    const priorSemantic = priorProfile.semanticSignature || semanticSchemaSignature(priorProfile);
    const priorPhysical = priorProfile.physicalSignature || physicalSchemaSignature(priorProfile);
    const semanticMatch = currentSemantic.hash === priorSemantic.hash;
    const physicalMatch = currentPhysical.hash === priorPhysical.hash;
    return Object.freeze({
      status: semanticMatch && physicalMatch ? "unchanged" : semanticMatch ? "physical_drift" : "semantic_drift",
      semanticMatch,
      physicalMatch,
      currentSemanticHash: currentSemantic.hash,
      priorSemanticHash: priorSemantic.hash,
      currentPhysicalHash: currentPhysical.hash,
      priorPhysicalHash: priorPhysical.hash,
      warnings: semanticMatch && !physicalMatch ? ["column_order_changed"] : !semanticMatch ? ["schema_columns_changed"] : []
    });
  }

  function contentCompatibilityForField(profile = {}, fieldDefinition = {}) {
    const type = fieldDefinition.type || "text";
    if (["number", "currency", "percentage"].includes(type)) {
      if (profile.populatedCount === 0) return { status: "insufficient", confidence: 0, warnings: ["no_populated_samples"] };
      if (profile.numericLikeRatio >= 0.8) return { status: "compatible", confidence: profile.numericLikeRatio, warnings: [] };
      if (profile.numericLikeRatio >= 0.35) return { status: "review", confidence: profile.numericLikeRatio, warnings: ["mixed_numeric_content"] };
      return { status: "incompatible", confidence: profile.numericLikeRatio, warnings: ["numeric_field_has_text_content"] };
    }
    if (type === "text") {
      return { status: "compatible", confidence: Math.max(0.5, profile.textLikeRatio || 0.5), warnings: [] };
    }
    return { status: "compatible", confidence: 0.5, warnings: [] };
  }

  function possibleMisalignmentDiagnostics({ profile = {}, mappingEntry = {}, fieldDefinition = {} } = {}) {
    const compatibility = contentCompatibilityForField(profile, fieldDefinition);
    if (compatibility.status !== "incompatible") return [];
    return [{
      severity: fieldDefinition.requirement === "required" ? "error" : "warning",
      code: "possible_column_misalignment",
      sourceIndex: mappingEntry.sourceIndex ?? profile.sourceIndex,
      sourceColumn: mappingEntry.sourceColumn || profile.sourceKey,
      originalHeader: profile.originalHeader,
      canonicalField: mappingEntry.selectedCanonicalField || mappingEntry.proposedCanonicalField || "",
      message: "Mapped field content is incompatible with the canonical field type.",
      compatibility
    }];
  }

  root.data.schemaProfiler = Object.freeze({
    version: VERSION,
    profileSourceSchema,
    semanticSchemaSignature,
    physicalSchemaSignature,
    compareSchemaProfiles,
    contentCompatibilityForField,
    possibleMisalignmentDiagnostics
  });
})(window);
