(function registerConsumptionHistoryBuilder(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.data = root.data || {};

  const sourceModel = root.data?.sourceModel;
  const mappingEngine = root.mapping?.engine;
  const valueUtils = root.core?.valueUtils;
  const semanticsEngine = root.data?.consumptionHistorySemanticsEngine;
  if (!sourceModel) throw new Error("ObsoliQ Consumption History Builder requires the source-model module.");
  if (!mappingEngine) throw new Error("ObsoliQ Consumption History Builder requires the mapping engine.");
  if (!valueUtils) throw new Error("ObsoliQ Consumption History Builder requires value utilities.");
  if (!semanticsEngine) throw new Error("ObsoliQ Consumption History Builder requires the Consumption History Semantics Engine.");

  const BUILDER_VERSION = "1";
  const PACKAGE_TYPE = "consumption_history";
  const CONSUMPTION_HISTORY_SCHEMA_VERSION = "consumption-history-v1";

  const CONSUMPTION_HISTORY_FIELD_DEFINITIONS = deepFreeze({
    material_id: {
      label: { de: "Materialnummer", en: "Material ID" },
      type: "text",
      requirement: "required",
      analysis_group: "core",
      importable: true,
      aliases: ["Material", "Material Number", "Materialnummer", "Material ID", "MATNR"]
    },
    consumption_quantity: {
      label: { de: "Verbrauchsmenge", en: "Consumption Quantity" },
      type: "number",
      requirement: "required",
      analysis_group: "quantity",
      importable: true,
      aliases: ["Consumption Quantity", "Verbrauchsmenge", "Consumption", "Usage Quantity", "Entnahmemenge"]
    },
    posting_date: {
      label: { de: "Buchungsdatum", en: "Posting Date" },
      type: "text",
      requirement: "required_any_of",
      analysis_group: "temporal",
      importable: true,
      aliases: ["Posting Date", "Buchungsdatum", "Bewegungsdatum", "BUDAT"]
    },
    period: {
      label: { de: "Periode", en: "Period" },
      type: "text",
      requirement: "required_any_of",
      analysis_group: "temporal",
      importable: true,
      aliases: ["Period", "Periode", "Fiscal Period", "Jahr/Monat", "Year Month"]
    },
    plant: {
      label: { de: "Werk", en: "Plant" },
      type: "text",
      requirement: "optional",
      analysis_group: "context",
      importable: true,
      aliases: ["Plant", "Werk", "WERKS"]
    },
    base_unit: {
      label: { de: "Basismengeneinheit", en: "Base Unit" },
      type: "text",
      requirement: "optional",
      analysis_group: "quantity",
      importable: true,
      aliases: ["Base Unit", "Basismengeneinheit", "Unit", "Einheit", "MEINS"]
    },
    movement_type: {
      label: { de: "Bewegungsart", en: "Movement Type" },
      type: "text",
      requirement: "optional",
      analysis_group: "context",
      importable: true,
      aliases: ["Movement Type", "Bewegungsart", "BWART"]
    },
    consumption_value: {
      label: { de: "Verbrauchswert", en: "Consumption Value" },
      type: "currency",
      requirement: "optional",
      analysis_group: "quantity",
      importable: true,
      aliases: ["Consumption Value", "Verbrauchswert"]
    },
    movement_count: {
      label: { de: "Bewegungsanzahl", en: "Movement Count" },
      type: "number",
      requirement: "optional",
      analysis_group: "quantity",
      importable: true,
      aliases: ["Movement Count", "Bewegungsanzahl"]
    },
    storage_location: {
      label: { de: "Lagerort", en: "Storage Location" },
      type: "text",
      requirement: "optional",
      analysis_group: "context",
      importable: true,
      aliases: ["Storage Location", "Lagerort", "LGORT"]
    },
    document_id: {
      label: { de: "Belegnummer", en: "Document" },
      type: "text",
      requirement: "optional",
      analysis_group: "context",
      importable: true,
      aliases: ["Document", "Material Document", "Belegnummer", "MBLNR"]
    },
    document_item: {
      label: { de: "Belegposition", en: "Document Item" },
      type: "text",
      requirement: "optional",
      analysis_group: "context",
      importable: true,
      aliases: ["Document Item", "Belegposition", "ZEILE"]
    }
  });

  const CONSUMPTION_HISTORY_MAPPING_POLICY = Object.freeze({
    requiredFields: Object.freeze(["material_id", "consumption_quantity"]),
    requiredAnyOfMappingGroups: Object.freeze([Object.freeze(["posting_date", "period"])]),
    organizationFields: Object.freeze(["plant"]),
    workflowFields: Object.freeze([]),
    recoveryInputFields: Object.freeze([]),
    optionalFields: Object.freeze([
      "plant",
      "base_unit",
      "movement_type",
      "consumption_value",
      "movement_count",
      "storage_location",
      "document_id",
      "document_item"
    ])
  });

  const preferredFieldOrder = Object.freeze([
    "material_id",
    "plant",
    "posting_date",
    "period",
    "consumption_quantity",
    "base_unit",
    "movement_type",
    "consumption_value",
    "movement_count",
    "storage_location",
    "document_id",
    "document_item"
  ]);

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(key => deepFreeze(value[key]));
    return Object.freeze(value);
  }

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object || {}, key);
  }

  function packageField(fieldKey) {
    const definition = CONSUMPTION_HISTORY_FIELD_DEFINITIONS[fieldKey];
    return Boolean(definition && definition.importable !== false);
  }

  function sourceIdentityValues(entry) {
    return [
      entry?.sourceColumn,
      entry?.sourceKey,
      entry?.sourceColumnKey,
      entry?.sourceColumnId,
      entry?.originalHeader,
      entry?.normalizedSourceColumn
    ].map(value => String(value ?? "").trim()).filter(Boolean);
  }

  function sourceMetaMatches(entry, meta) {
    if (!entry || !meta) return false;
    const values = new Set(sourceIdentityValues(entry));
    const normalized = String(entry.normalizedSourceColumn || "").trim();
    return Boolean(
      values.has(String(meta.sourceKey || "").trim())
      || values.has(String(meta.originalHeader || "").trim())
      || (normalized && normalized === String(meta.normalizedOriginalHeader || "").trim())
      || (normalized && normalized === sourceModel.sourceTechnicalKey(meta.sourceKey, meta.sourceIndex, [meta]))
    );
  }

  function sourceMetaForEntry(entry, sourceColumnMetadata = []) {
    if (!sourceModel.isValidSourceIndex(entry?.sourceIndex)) return null;
    const meta = sourceModel.sourceMetaForColumn(entry.sourceColumn, entry.sourceIndex, sourceColumnMetadata);
    if (!meta || meta.sourceIndex !== entry.sourceIndex) return null;
    return sourceMetaMatches(entry, meta) ? meta : null;
  }

  function mappingOptions(sourceColumnMetadata = []) {
    return {
      sourceColumnMetadata,
      policy: CONSUMPTION_HISTORY_MAPPING_POLICY,
      fieldDefinitions: CONSUMPTION_HISTORY_FIELD_DEFINITIONS,
      protectedFieldKeys: []
    };
  }

  function validMappingEntries(columnMapping = [], sourceColumnMetadata = []) {
    return mappingEngine.refreshColumnMappingStatuses(columnMapping, mappingOptions(sourceColumnMetadata)).filter(entry => (
      entry.status === "mapped"
      && !entry.ignored
      && !entry.protected
      && packageField(entry.selectedCanonicalField)
      && sourceMetaForEntry(entry, sourceColumnMetadata)
    ));
  }

  function sourceValue(row, entry, sourceColumnMetadata = []) {
    const meta = sourceMetaForEntry(entry, sourceColumnMetadata);
    if (!meta) return "";
    if (hasOwn(row, meta.sourceKey)) return row[meta.sourceKey] ?? "";
    if (hasOwn(row, meta.originalHeader)) return row[meta.originalHeader] ?? "";
    return "";
  }

  function sortedEntries(entries = []) {
    const order = new Map(preferredFieldOrder.map((fieldKey, index) => [fieldKey, index]));
    return [...entries].sort((a, b) => {
      const aOrder = order.has(a.selectedCanonicalField) ? order.get(a.selectedCanonicalField) : 999;
      const bOrder = order.has(b.selectedCanonicalField) ? order.get(b.selectedCanonicalField) : 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.sourceIndex - b.sourceIndex;
    });
  }

  function parseNumericField(rawValue, fieldKey) {
    return valueUtils.parseLocalizedNumericValue({
      rawValue,
      fieldDefinition: {
        ...(CONSUMPTION_HISTORY_FIELD_DEFINITIONS[fieldKey] || { type: "number" }),
        fieldKey
      },
      normalizationPolicy: { allowAmbiguousFallback: true }
    });
  }

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function normalizeMappedPreviewRow(row = {}, index = 0, entries = [], sourceColumnMetadata = []) {
    const item = { __sourceRowIndex: row?.__sourceRowIndex ?? index + 1 };
    entries.forEach(entry => {
      const fieldKey = entry.selectedCanonicalField;
      const rawValue = sourceValue(row, entry, sourceColumnMetadata);
      if (["consumption_quantity", "consumption_value", "movement_count"].includes(fieldKey)) {
        const parseResult = parseNumericField(rawValue, fieldKey);
        item[fieldKey] = parseResult.status === "valid" && Number.isFinite(parseResult.normalizedValue)
          ? parseResult.normalizedValue
          : rawValue;
        if (parseResult.detectedCurrency && fieldKey === "consumption_value") {
          item.consumption_value_currency = parseResult.detectedCurrency;
        }
      } else {
        item[fieldKey] = normalizeText(rawValue);
      }
    });
    return item;
  }

  function diagnostic(key, count, severity = "warning", extra = {}) {
    return {
      key,
      code: key,
      severity,
      count,
      ...extra
    };
  }

  function countExactDuplicateRows(rows = []) {
    const seen = new Map();
    rows.forEach(row => {
      const stable = JSON.stringify(Object.keys(row || {})
        .filter(key => key !== "__sourceRowIndex")
        .sort()
        .map(key => [key, row[key]]));
      seen.set(stable, (seen.get(stable) || 0) + 1);
    });
    return [...seen.values()].filter(count => count > 1).reduce((total, count) => total + count - 1, 0);
  }

  function temporalFieldsFromEntries(entries = []) {
    return ["posting_date", "period"].filter(fieldKey => entries.some(entry => entry.selectedCanonicalField === fieldKey));
  }

  function validateConsumptionHistoryPackage(input = {}) {
    const sourceRows = Array.isArray(input.sourceRows) ? input.sourceRows : [];
    const sourceColumnMetadata = Array.isArray(input.sourceColumnMetadata) ? input.sourceColumnMetadata : [];
    const columnMapping = Array.isArray(input.columnMapping) ? input.columnMapping : [];
    const mappingValidation = mappingEngine.validateColumnMapping(columnMapping, mappingOptions(sourceColumnMetadata));
    const approvedEntries = validMappingEntries(mappingValidation.mapping, sourceColumnMetadata);
    const invalidPhysicalMappings = (mappingValidation.mapping || []).filter(entry => (
      entry.selectedCanonicalField
      && !entry.ignored
      && !entry.protected
      && !sourceMetaForEntry(entry, sourceColumnMetadata)
    ));
    const materialEntry = approvedEntries.find(entry => entry.selectedCanonicalField === "material_id") || null;
    const quantityEntry = approvedEntries.find(entry => entry.selectedCanonicalField === "consumption_quantity") || null;
    const plantEntry = approvedEntries.find(entry => entry.selectedCanonicalField === "plant") || null;
    const baseUnitEntry = approvedEntries.find(entry => entry.selectedCanonicalField === "base_unit") || null;
    const temporalFields = temporalFieldsFromEntries(approvedEntries);
    const normalizedPreview = sourceRows.map((row, index) => normalizeMappedPreviewRow(row, index, approvedEntries, sourceColumnMetadata));
    const missingMaterialIdCount = materialEntry
      ? normalizedPreview.filter(row => !normalizeText(row.material_id)).length
      : sourceRows.length;
    const missingTemporalValueCount = temporalFields.length
      ? normalizedPreview.filter(row => !temporalFields.some(fieldKey => normalizeText(row[fieldKey]))).length
      : sourceRows.length;
    let invalidQuantityCount = 0;
    let negativeQuantityCount = 0;
    let zeroQuantityCount = 0;
    sourceRows.forEach(row => {
      const parseResult = quantityEntry
        ? parseNumericField(sourceValue(row, quantityEntry, sourceColumnMetadata), "consumption_quantity")
        : { status: "missing", normalizedValue: null };
      if (parseResult.status !== "valid" || !Number.isFinite(parseResult.normalizedValue)) {
        invalidQuantityCount += 1;
      } else if (parseResult.normalizedValue < 0) {
        negativeQuantityCount += 1;
      } else if (parseResult.normalizedValue === 0) {
        zeroQuantityCount += 1;
      }
    });
    const units = new Set(normalizedPreview.map(row => normalizeText(row.base_unit)).filter(Boolean));
    const missingUnitCount = baseUnitEntry
      ? normalizedPreview.filter(row => !normalizeText(row.base_unit)).length
      : sourceRows.length;
    const exactDuplicateRowCount = countExactDuplicateRows(sourceRows);
    const plantPopulated = Boolean(plantEntry && normalizedPreview.some(row => normalizeText(row.plant)));
    const keyGranularity = plantPopulated && temporalFields.length
      ? "material_plant_temporal"
      : temporalFields.length
        ? "material_temporal"
        : plantPopulated
          ? "material_plant"
          : "material";
    const blockingErrors = [
      ...mappingValidation.errors,
      ...(!materialEntry ? [diagnostic("consumptionHistoryMissingMaterialIdMapping", sourceRows.length, "error", { field: "material_id" })] : []),
      ...(!quantityEntry ? [diagnostic("consumptionHistoryMissingQuantityMapping", sourceRows.length, "error", { field: "consumption_quantity" })] : []),
      ...(!temporalFields.length ? [diagnostic("consumptionHistoryMissingTemporalMapping", sourceRows.length, "error", { fields: ["posting_date", "period"] })] : []),
      ...(invalidPhysicalMappings.length ? [diagnostic("materialMasterInvalidSourceIdentity", invalidPhysicalMappings.length, "error")] : []),
      ...(missingMaterialIdCount ? [diagnostic("consumptionHistoryMissingMaterialIdValues", missingMaterialIdCount, "error", { field: "material_id" })] : []),
      ...(missingTemporalValueCount ? [diagnostic("consumptionHistoryMissingTemporalValues", missingTemporalValueCount, "error", { fields: temporalFields })] : []),
      ...(invalidQuantityCount ? [diagnostic("consumptionHistoryInvalidQuantityValues", invalidQuantityCount, "error", { field: "consumption_quantity" })] : [])
    ];
    const warnings = [
      ...(mappingValidation.warnings || []),
      ...(negativeQuantityCount ? [diagnostic("consumptionHistoryNegativeQuantities", negativeQuantityCount, "warning", { field: "consumption_quantity" })] : []),
      ...(missingUnitCount ? [diagnostic("consumptionHistoryMissingUnits", missingUnitCount, "warning", { field: "base_unit" })] : []),
      ...(units.size > 1 ? [diagnostic("consumptionHistoryMultipleUnits", units.size, "warning", { field: "base_unit", units: [...units].sort() })] : []),
      ...(exactDuplicateRowCount ? [diagnostic("consumptionHistoryExactDuplicateRows", exactDuplicateRowCount, "warning")] : [])
    ];
    return {
      status: blockingErrors.length ? "invalid" : "ready",
      statusKey: blockingErrors.length ? "invalid" : "ready",
      blockingErrors,
      warnings,
      diagnostics: [...blockingErrors, ...warnings],
      evaluatedAt: input.evaluatedAt || null,
      rowCount: sourceRows.length,
      validRowCount: blockingErrors.length ? Math.max(0, sourceRows.length - missingMaterialIdCount - missingTemporalValueCount - invalidQuantityCount) : sourceRows.length,
      materialIdMapped: Boolean(materialEntry),
      quantityMapped: Boolean(quantityEntry),
      postingDateMapped: temporalFields.includes("posting_date"),
      periodMapped: temporalFields.includes("period"),
      plantMapped: Boolean(plantEntry),
      baseUnitMapped: Boolean(baseUnitEntry),
      temporalReferenceFields: temporalFields,
      keyGranularity,
      missingMaterialIdCount,
      missingTemporalValueCount,
      invalidQuantityCount,
      negativeQuantityCount,
      zeroQuantityCount,
      missingUnitCount,
      multipleUnitCount: units.size > 1 ? units.size : 0,
      unitValues: [...units].sort(),
      exactDuplicateRowCount,
      duplicateRelationshipKeyCount: 0,
      mappingValidation,
      invalidPhysicalMappings
    };
  }

  function buildConsumptionHistoryPackage(input = {}) {
    const sourceRows = cloneData(Array.isArray(input.sourceRows) ? input.sourceRows : []);
    const sourceColumnMetadata = cloneData(Array.isArray(input.sourceColumnMetadata) ? input.sourceColumnMetadata : []);
    const columnMapping = cloneData(Array.isArray(input.columnMapping) ? input.columnMapping : []);
    const buildTimestamp = input.buildTimestamp || new Date().toISOString();
    const validation = validateConsumptionHistoryPackage({
      sourceRows,
      sourceColumnMetadata,
      columnMapping,
      evaluatedAt: buildTimestamp
    });
    const approvedEntries = sortedEntries(validMappingEntries(validation.mappingValidation.mapping, sourceColumnMetadata));
    const baseRows = sourceRows.map((row, index) => ({
      package_row_key: `CH-${String(index + 1).padStart(6, "0")}`,
      ...normalizeMappedPreviewRow(row, index, approvedEntries, sourceColumnMetadata)
    }));
    const semanticAnalysis = semanticsEngine.analyzeConsumptionHistorySemantics({
      sourceRows,
      normalizedRows: baseRows,
      semanticPolicy: input.semanticInterpretation?.effectivePolicy || input.semanticPolicy || {}
    });
    const normalizedRows = semanticAnalysis.semanticRows;
    const semanticDiagnostics = semanticAnalysis.diagnostics || [];
    const packageValidation = {
      ...validation,
      warnings: [...(validation.warnings || []), ...semanticDiagnostics],
      diagnostics: [...(validation.blockingErrors || []), ...(validation.warnings || []), ...semanticDiagnostics],
      historyReadinessStatus: semanticAnalysis.historyReadiness.status,
      semanticDiagnosticCount: semanticDiagnostics.length,
      businessDuplicateCandidateCount: semanticAnalysis.counts.businessDuplicateCandidateCount,
      legitimateRepeatCount: semanticAnalysis.counts.legitimateRepeatCount
    };
    const temporalSamples = validation.temporalReferenceFields.reduce((samples, fieldKey) => {
      samples[fieldKey] = normalizedRows.map(row => normalizeText(row[fieldKey])).filter(Boolean).slice(0, 5);
      return samples;
    }, {});
    const relationshipKeys = {
      entityKeys: validation.plantMapped ? ["material_id", "plant"] : ["material_id"],
      temporalReference: [...validation.temporalReferenceFields],
      eventIdentity: ["document_id", "document_item", "movement_type", "signed_consumption_quantity", "base_unit"],
      unitContext: ["base_unit"]
    };
    const freshness = {
      importedAt: buildTimestamp,
      temporalCoverage: "semantic_history_interpreted_no_aggregation",
      temporalReferenceFields: [...validation.temporalReferenceFields],
      rawTemporalSamples: temporalSamples,
      analysisAsOf: semanticAnalysis.historyReadiness.analysisAsOf,
      historyCoverageEnd: semanticAnalysis.historyReadiness.historyCoverageEnd
    };
    const diagnostics = [...(packageValidation.diagnostics || [])];
    return {
      normalizedRows,
      relationshipKeys,
      validation: packageValidation,
      packageValidation,
      freshness,
      diagnostics,
      buildMetadata: {
        builderVersion: BUILDER_VERSION,
        packageType: PACKAGE_TYPE,
        schemaVersion: CONSUMPTION_HISTORY_SCHEMA_VERSION,
        datasetId: input.datasetId || "",
        sourceRowCount: sourceRows.length,
        normalizedRowCount: normalizedRows.length,
        mappingSignature: mappingEngine.columnMappingSignature(columnMapping, mappingOptions(sourceColumnMetadata)),
        semanticPolicyVersion: semanticsEngine.POLICY_VERSION,
        semanticPolicySignature: semanticAnalysis.semanticPolicySignature,
        semanticPolicy: semanticAnalysis.semanticPolicy,
        movementRuleSet: semanticAnalysis.movementRuleSet,
        historyReadiness: semanticAnalysis.historyReadiness,
        keyGranularity: validation.keyGranularity,
        temporalReferenceFields: [...validation.temporalReferenceFields],
        negativeQuantityCount: validation.negativeQuantityCount,
        missingUnitCount: validation.missingUnitCount,
        multipleUnitCount: validation.multipleUnitCount,
        exactDuplicateRowCount: validation.exactDuplicateRowCount,
        businessDuplicateCandidateCount: semanticAnalysis.counts.businessDuplicateCandidateCount,
        legitimateRepeatCount: semanticAnalysis.counts.legitimateRepeatCount,
        builtAt: buildTimestamp
      }
    };
  }

  root.data.consumptionHistoryBuilder = Object.freeze({
    version: BUILDER_VERSION,
    packageType: PACKAGE_TYPE,
    schemaVersion: CONSUMPTION_HISTORY_SCHEMA_VERSION,
    CONSUMPTION_HISTORY_SCHEMA_VERSION,
    CONSUMPTION_HISTORY_FIELD_DEFINITIONS,
    CONSUMPTION_HISTORY_MAPPING_POLICY,
    validateConsumptionHistoryPackage,
    buildConsumptionHistoryPackage
  });
})(window);
