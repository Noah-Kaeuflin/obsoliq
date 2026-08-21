/* ObsoliQ Dataset Builder
 * Deterministic analytical dataset construction from source rows, mapping and approved corrections.
 */
(function registerDatasetBuilder(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.data = root.data || {};

  const canonical = root.core?.canonical;
  const valueUtils = root.core?.valueUtils;
  const mappingEngine = root.mapping?.engine;
  const recoveryEngine = root.recovery?.engine;
  const inputNormalizationEngine = root.data?.inputNormalizationEngine;
  if (!canonical) throw new Error("ObsoliQ dataset builder requires the canonical module.");
  if (!valueUtils) throw new Error("ObsoliQ dataset builder requires the value-utils module.");
  if (!mappingEngine) throw new Error("ObsoliQ dataset builder requires the mapping engine.");
  if (!recoveryEngine) throw new Error("ObsoliQ dataset builder requires the recovery engine.");

  const {
    inventoryFieldDefinitions,
    numericKeys,
    protectedImportFieldKeys
  } = canonical;
  const {
    magnitudeFactor,
    isMissingInputValue,
    normalizeLocalizedNumber,
    toNumber
  } = valueUtils;
  const {
    DEFAULT_MAPPING_POLICY,
    applyApprovedColumnMapping,
    columnMappingSignature
  } = mappingEngine;
  const {
    calculateNoDemandValue,
    calculateRecoveryBreakdown,
    validateRecoveryDataset
  } = recoveryEngine;

  const SOURCE_CORRECTION_TYPES = new Set(["replace_source_value", "fill_source_value", "replace_value", "fill_missing_value"]);
  const CANONICAL_CORRECTION_TYPES = new Set(["set_canonical_value", "fill_missing_canonical_value"]);
  const ROW_EXCLUSION_TYPES = new Set(["exclude_exact_duplicate", "exclude_row"]);
  const recoveryInputFieldKeys = DEFAULT_MAPPING_POLICY.recoveryInputFields;
  const BUILDER_VERSION = "1";
  const PIPELINE_VERSION = "dataset-builder-v1";

  function hasContentValue(value) {
    return String(value ?? "").trim() !== "";
  }

  function correctionTargetRows(correction) {
    return [...new Set((correction?.sourceRowIndexes?.length ? correction.sourceRowIndexes : [correction?.sourceRowIndex])
      .map(Number)
      .filter(rowIndex => Number.isFinite(rowIndex) && rowIndex > 0))];
  }

  function correctionAppliesToRow(correction, sourceRowIndex) {
    return correctionTargetRows(correction).includes(Number(sourceRowIndex));
  }

  function sourceRowIdentity(row, index) {
    const identity = Number(row?.__sourceRowIndex);
    return Number.isFinite(identity) && identity > 0 ? identity : index + 1;
  }

  function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function cloneAndFreezeArray(values = []) {
    return Object.freeze([...values]);
  }

  function buildMappingSignature(mapping = []) {
    return columnMappingSignature(mapping, { policy: DEFAULT_MAPPING_POLICY });
  }

  function normalizationPolicySignature(policy = {}) {
    return stableJson(policy || {});
  }

  function computeExcludedSourceRows(corrections = []) {
    const excluded = new Set();
    corrections.forEach(correction => {
      if (ROW_EXCLUSION_TYPES.has(correction.correctionType)) {
        correctionTargetRows(correction).forEach(rowIndex => excluded.add(rowIndex));
      }
      if (correction.correctionType === "restore_row") {
        correctionTargetRows(correction).forEach(rowIndex => excluded.delete(rowIndex));
      }
    });
    return excluded;
  }

  function applySourceCorrections({ sourceRows = [], headers = [], corrections = [], includeExcludedRows = false } = {}) {
    const headerSet = new Set(headers);
    const excluded = computeExcludedSourceRows(corrections);
    const rows = sourceRows.map((row, index) => {
      const sourceRowIndex = sourceRowIdentity(row, index);
      const next = { ...(row || {}), __sourceRowIndex: sourceRowIndex };
      corrections.forEach(correction => {
        if (!SOURCE_CORRECTION_TYPES.has(correction.correctionType)) return;
        if (!correctionAppliesToRow(correction, sourceRowIndex)) return;
        if (!correction.sourceColumn || !headerSet.has(correction.sourceColumn)) return;
        if (["fill_source_value", "fill_missing_value"].includes(correction.correctionType) && hasContentValue(next[correction.sourceColumn])) return;
        next[correction.sourceColumn] = correction.correctedValue;
      });
      return next;
    });
    return {
      rows: rows.filter(row => includeExcludedRows || !excluded.has(Number(row.__sourceRowIndex))),
      excludedSourceRows: excluded
    };
  }

  function importableCanonicalField(fieldKey) {
    const definition = inventoryFieldDefinitions[fieldKey];
    return Boolean(definition && definition.importable !== false && !protectedImportFieldKeys.has(fieldKey));
  }

  function applyCanonicalCorrections({ rows = [], corrections = [] } = {}) {
    return rows.map(row => {
      const sourceRowIndex = Number(row.__sourceRowIndex);
      const next = { ...row };
      if (Object.prototype.hasOwnProperty.call(row, "__sourceProfitCenterForKey")) {
        Object.defineProperty(next, "__sourceProfitCenterForKey", {
          value: row.__sourceProfitCenterForKey,
          enumerable: false,
          configurable: true
        });
      }
      corrections.forEach(correction => {
        if (!CANONICAL_CORRECTION_TYPES.has(correction.correctionType)) return;
        if (!correctionAppliesToRow(correction, sourceRowIndex)) return;
        const fieldKey = correction.canonicalField;
        if (!importableCanonicalField(fieldKey)) return;
        if (correction.correctionType === "fill_missing_canonical_value" && hasContentValue(next[fieldKey])) return;
        next[fieldKey] = correction.correctedValue;
      });
      return next;
    });
  }

  function numericInputLooksValid(value, key = "") {
    if (!hasContentValue(value)) return false;
    if (typeof value === "number") return Number.isFinite(value);
    const factor = magnitudeFactor(value, key);
    const text = String(value ?? "")
      .replace(/\(([^)]+)\)/g, "-$1")
      .replace(/[€$£]/g, "")
      .replace(/\b(eur|euro|usd|dollar|dollars|gbp|pound|pounds|sterling|chf|pln|czk|sek|nok|dkk)\b/gi, "")
      .replace(/([0-9])\s*(mrd\.?|mio\.?|tsd\.?|bn|mn|[kmb])(?=\s|$|[^a-z])/gi, "$1")
      .replace(/\b(mrd\.?|mio\.?|tsd\.?|bn|mn|billion(?:en|s)?|million(?:en|s)?|milliarden|tausend|thousand)(?=\s|$|[^a-z])/gi, "")
      .replace(/%/g, "")
      .replace(/[\s\u00a0\u202f']/g, "")
      .replace(/[^\d,.\-+]/g, "");
    if (!/\d/.test(text)) return false;
    const parsed = Number(normalizeLocalizedNumber(text));
    return Number.isFinite(parsed * factor);
  }

  function addRecoveryNormalizationExample(summary, row, rowIndex, fieldKey, originalValue, reasonKey) {
    if (summary.examples.length >= 20) return;
    summary.examples.push({
      row_number: rowIndex + 1,
      material_id: row.material_id || row.material || "",
      field: fieldKey,
      original_value: originalValue,
      normalized_value: 0,
      reasonKey
    });
  }

  function buildRecoveryInputNormalizationDiagnostics(rows) {
    const summary = {
      checkedCells: 0,
      negativeValues: 0,
      invalidValues: 0,
      emptyValues: 0,
      examples: [],
      statusKey: "ok"
    };

    rows.forEach((row, rowIndex) => {
      recoveryInputFieldKeys.forEach(fieldKey => {
        if (!Object.prototype.hasOwnProperty.call(row, fieldKey)) return;
        summary.checkedCells += 1;
        const originalValue = row[fieldKey];

        if (isMissingInputValue(originalValue)) {
          summary.emptyValues += 1;
          return;
        }
        if (!numericInputLooksValid(originalValue, fieldKey)) {
          summary.invalidValues += 1;
          addRecoveryNormalizationExample(summary, row, rowIndex, fieldKey, originalValue, "invalidRecoveryInputReason");
          return;
        }
        if (toNumber(originalValue, fieldKey) < 0) {
          summary.negativeValues += 1;
          addRecoveryNormalizationExample(summary, row, rowIndex, fieldKey, originalValue, "negativeRecoveryInputReason");
        }
      });
    });

    if (summary.invalidValues || summary.negativeValues) summary.statusKey = "warning";
    if (summary.invalidValues > 5 || summary.negativeValues > 5) summary.statusKey = "error";
    return summary;
  }

  function buildInventoryRowKey(item) {
    const materialId = String(item.material_id || "").trim() || "UNASSIGNED";
    const profitCenter = String(item.profit_center || "").trim();
    if (profitCenter) return `${materialId}::${profitCenter}`;
    return `${materialId}::ROW-${item.row_number}`;
  }

  function enrichInventoryRow(row, index) {
    const item = { ...row, row_number: row.__sourceRowIndex ?? index + 1, active_row_number: index + 1 };
    const sourceStockValue = row.stock_value;
    numericKeys.forEach(key => {
      item[key] = toNumber(item[key], key);
    });

    item.material_id = item.material_id || item.material || "";
    item.material_description = item.material_description || "";
    const sourceProfitCenter = Object.prototype.hasOwnProperty.call(row, "__sourceProfitCenterForKey")
      ? String(row.__sourceProfitCenterForKey || "").trim()
      : String(item.profit_center || "").trim();
    item.profit_center = item.profit_center || item.plant || item.div || "";
    item.program_short = item.program_short || item.material_group || "";
    if (isMissingInputValue(sourceStockValue)) {
      item.stock_value = item.stock_quantity * item.standard_price;
    }
    item.no_need_value = calculateNoDemandValue(item);
    item.inventory_row_key = buildInventoryRowKey({
      material_id: item.material_id,
      profit_center: sourceProfitCenter,
      row_number: item.row_number
    });
    Object.assign(item, calculateRecoveryBreakdown(item));

    const noNeedFlag = String(item.no_need_flag || "").trim().toLowerCase();
    item.category = "Healthy / Planned Stock";
    if (item.bad_stock_value > 0) item.category = "Bad / Blocked Stock";
    if (item.excess_value > 0) item.category = "Excess Stock";
    if (item.no_plan_value > 0) item.category = "No Plan Stock";
    if (item.no_need_value > 0 || ["x", "yes", "ja", "true", "1"].includes(noNeedFlag)) {
      item.category = "No Need Stock";
    }

    return item;
  }

  function buildInventoryDataset({
    sourceRows = [],
    headers = [],
    sourceColumnMetadata = [],
    columnMapping = [],
    corrections = [],
    options = {}
  } = {}) {
    const sourceResult = applySourceCorrections({
      sourceRows,
      headers,
      corrections,
      includeExcludedRows: Boolean(options.includeExcludedRows)
    });
    const mappedRows = applyApprovedColumnMapping({
      headers,
      rows: sourceResult.rows,
      mapping: columnMapping,
      sourceColumnMetadata
    }).map(row => {
      const next = { ...row };
      Object.defineProperty(next, "__sourceProfitCenterForKey", {
        value: String(row.profit_center || "").trim(),
        enumerable: false,
        configurable: true
      });
      return next;
    });
    const canonicalRows = applyCanonicalCorrections({ rows: mappedRows, corrections });
    const inputNormalization = inputNormalizationEngine
      ? inputNormalizationEngine.normalizeRows({
        rows: canonicalRows,
        columnMapping,
        sourceColumnMetadata,
        fieldDefinitions: inventoryFieldDefinitions,
        normalizationPolicy: options.normalizationPolicy || {},
        mappingPolicy: DEFAULT_MAPPING_POLICY
      })
      : { normalizedRows: canonicalRows, diagnostics: [], summary: null };
    const normalizedRows = canonicalRows;
    const analyticalInputRows = inputNormalization.normalizedRows || normalizedRows;
    const recoveryInputNormalizationDiagnostics = buildRecoveryInputNormalizationDiagnostics(normalizedRows);
    const analyticalRows = analyticalInputRows.map(enrichInventoryRow);
    const recoveryValidationErrors = validateRecoveryDataset(analyticalRows);
    const excludedSourceRowIndexes = [...sourceResult.excludedSourceRows].sort((a, b) => a - b);
    const buildMetadata = Object.freeze({
      datasetId: options.datasetId || "",
      builderVersion: BUILDER_VERSION,
      pipelineVersion: PIPELINE_VERSION,
      builtAt: options.buildTimestamp || new Date().toISOString(),
      sourceRowCount: sourceRows.length,
      activeRowCount: analyticalRows.length,
      excludedRowCount: excludedSourceRowIndexes.length,
      normalizedRowCount: normalizedRows.length,
      analyticalRowCount: analyticalRows.length,
      correctionCount: corrections.length,
      mappingSignature: buildMappingSignature(columnMapping),
      normalizationPolicySignature: options.normalizationPolicySignature || normalizationPolicySignature(options.normalizationPolicy || {}),
      sourceColumnCount: headers.length,
      inputTrustMetadata: options.inputTrustMetadata || null,
      inputNormalizationSummary: inputNormalization.summary || null,
      appliedCorrectionIds: cloneAndFreezeArray(corrections.map(correction => correction.correctionId).filter(Boolean)),
      excludedSourceRowIndexes: cloneAndFreezeArray(excludedSourceRowIndexes),
      includeExcludedRows: Boolean(options.includeExcludedRows)
    });

    return {
      correctedSourceRows: sourceResult.rows,
      workingSourceRows: sourceResult.rows,
      normalizedRows,
      inputNormalizedRows: analyticalInputRows,
      analyticalRows,
      recoveryValidationErrors,
      recoveryInputNormalizationDiagnostics,
      inputNormalizationDiagnostics: inputNormalization.diagnostics || [],
      excludedSourceRows: sourceResult.excludedSourceRows,
      excludedSourceRowIndexes,
      buildMetadata
    };
  }

  function runDatasetBuilderSelfTests() {
    const sourceRows = [
      { Material: "MAT-1", "Stock Value": "100", "Excess Value": "30", "Profit Center": "PC-1" },
      { Material: "MAT-2", "Stock Value": "200", Plant: "PL-1" },
      { Material: "MAT-3", "Stock Value": "", "Stock Quantity": "10", "Standard Price": "5" }
    ];
    const headers = ["Material", "Stock Value", "Excess Value", "Profit Center", "Plant", "Stock Quantity", "Standard Price"];
    const sourceColumnMetadata = headers.map((header, sourceIndex) => ({
      sourceKey: header,
      originalHeader: header,
      sourceIndex,
      duplicateIndex: 1,
      duplicateCount: 1
    }));
    const columnMapping = mappingEngine.createAutomaticColumnMapping({ headers, rows: sourceRows, sourceColumnMetadata });
    const rawSnapshot = JSON.stringify(sourceRows);
    const mappingSnapshot = JSON.stringify(columnMapping);
    const corrections = [
      { correctionId: "CORR-1", correctionType: "replace_source_value", sourceColumn: "Excess Value", sourceRowIndexes: [1], correctedValue: "80" },
      { correctionId: "CORR-2", correctionType: "set_canonical_value", canonicalField: "profit_center", sourceRowIndexes: [1], correctedValue: "PC-OVERRIDE" },
      { correctionId: "CORR-3", correctionType: "exclude_row", sourceRowIndexes: [2] }
    ];
    const correctionSnapshot = JSON.stringify(corrections);
    const result = buildInventoryDataset({
      sourceRows,
      headers,
      sourceColumnMetadata,
      columnMapping,
      corrections,
      options: { datasetId: "DS-BUILDER-TEST", buildTimestamp: "2026-08-17T00:00:00.000Z" }
    });
    console.assert(JSON.stringify(sourceRows) === rawSnapshot, "Dataset Builder self-test failed: raw source immutability");
    console.assert(JSON.stringify(columnMapping) === mappingSnapshot, "Dataset Builder self-test failed: mapping immutability");
    console.assert(JSON.stringify(corrections) === correctionSnapshot, "Dataset Builder self-test failed: correction immutability");
    console.assert(result.analyticalRows.length === 2, "Dataset Builder self-test failed: row exclusion");
    console.assert(result.analyticalRows[0].row_number === 1 && result.analyticalRows[1].row_number === 3, "Dataset Builder self-test failed: source-row identity");
    console.assert(result.analyticalRows[0].recovery_potential === 80, "Dataset Builder self-test failed: source correction recovery");
    console.assert(result.analyticalRows[0].inventory_row_key === "MAT-1::PC-1", "Dataset Builder self-test failed: source profit-center row key");
    console.assert(result.analyticalRows[0].profit_center === "PC-OVERRIDE", "Dataset Builder self-test failed: canonical override should affect operational profit center");
    console.assert(result.analyticalRows[1].stock_value === 50, "Dataset Builder self-test failed: missing stock fallback");
    console.assert(result.buildMetadata.builderVersion === BUILDER_VERSION, "Dataset Builder self-test failed: build metadata version");
    console.assert(result.buildMetadata.datasetId === "DS-BUILDER-TEST", "Dataset Builder self-test failed: build metadata datasetId");
    console.assert(result.buildMetadata.builtAt === "2026-08-17T00:00:00.000Z", "Dataset Builder self-test failed: deterministic build timestamp option");
    console.assert(result.buildMetadata.sourceRowCount === 3 && result.buildMetadata.activeRowCount === 2, "Dataset Builder self-test failed: build metadata row counts");
    console.assert(result.buildMetadata.normalizedRowCount === 2 && result.buildMetadata.analyticalRowCount === 2, "Dataset Builder self-test failed: build metadata analytical counts");
    console.assert(result.buildMetadata.correctionCount === 3, "Dataset Builder self-test failed: build metadata correction count");
    console.assert(result.buildMetadata.excludedSourceRowIndexes.includes(2), "Dataset Builder self-test failed: build metadata excluded row index");
    const metadataBuilderVersion = result.buildMetadata.builderVersion;
    try {
      result.buildMetadata.builderVersion = "mutated";
    } catch {
      // Frozen metadata may throw in strict runtimes.
    }
    console.assert(result.buildMetadata.builderVersion === metadataBuilderVersion, "Dataset Builder self-test failed: build metadata must be immutable");
    try {
      result.buildMetadata.appliedCorrectionIds.push("MUTATED");
    } catch {
      // Frozen nested arrays may throw in strict runtimes.
    }
    console.assert(!result.buildMetadata.appliedCorrectionIds.includes("MUTATED"), "Dataset Builder self-test failed: applied correction ids must be immutable");
    const excludedBefore = result.buildMetadata.excludedSourceRowIndexes[0];
    try {
      result.buildMetadata.excludedSourceRowIndexes[0] = 999;
    } catch {
      // Frozen nested arrays may throw in strict runtimes.
    }
    console.assert(result.buildMetadata.excludedSourceRowIndexes[0] === excludedBefore, "Dataset Builder self-test failed: excluded row indexes must be immutable");

    const zero = buildInventoryDataset({
      sourceRows: [{ Material: "MAT-ZERO", "Stock Value": "0", "Stock Quantity": "10", "Standard Price": "5" }],
      headers: ["Material", "Stock Value", "Stock Quantity", "Standard Price"],
      sourceColumnMetadata: [
        { sourceKey: "Material", originalHeader: "Material", sourceIndex: 0 },
        { sourceKey: "Stock Value", originalHeader: "Stock Value", sourceIndex: 1 },
        { sourceKey: "Stock Quantity", originalHeader: "Stock Quantity", sourceIndex: 2 },
        { sourceKey: "Standard Price", originalHeader: "Standard Price", sourceIndex: 3 }
      ],
      columnMapping: mappingEngine.createAutomaticColumnMapping({
        headers: ["Material", "Stock Value", "Stock Quantity", "Standard Price"],
        rows: [{ Material: "MAT-ZERO", "Stock Value": "0", "Stock Quantity": "10", "Standard Price": "5" }]
      })
    });
    console.assert(zero.analyticalRows[0].stock_value === 0, "Dataset Builder self-test failed: explicit zero stock must be preserved");

    const duplicateHeaders = ["Material", "Stock Value", "Safety Stock Target", "Safety Stock Target__2"];
    const duplicateMetadata = [
      { sourceKey: "Material", originalHeader: "Material", sourceIndex: 0, duplicateIndex: 1, duplicateCount: 1 },
      { sourceKey: "Stock Value", originalHeader: "Stock Value", sourceIndex: 1, duplicateIndex: 1, duplicateCount: 1 },
      { sourceKey: "Safety Stock Target", originalHeader: "Safety Stock Target", sourceIndex: 2, duplicateIndex: 1, duplicateCount: 2 },
      { sourceKey: "Safety Stock Target__2", originalHeader: "Safety Stock Target", sourceIndex: 3, duplicateIndex: 2, duplicateCount: 2 }
    ];
    const duplicateRows = [{ Material: "MAT-DUP", "Stock Value": "100", "Safety Stock Target": "10", "Safety Stock Target__2": "20" }];
    const duplicateMapping = mappingEngine.createAutomaticColumnMapping({ headers: duplicateHeaders, rows: duplicateRows, sourceColumnMetadata: duplicateMetadata });
    const duplicateResult = buildInventoryDataset({
      sourceRows: duplicateRows,
      headers: duplicateHeaders,
      sourceColumnMetadata: duplicateMetadata,
      columnMapping: duplicateMapping,
      corrections: [{ correctionType: "replace_source_value", sourceColumn: "Safety Stock Target__2", sourceRowIndexes: [1], correctedValue: "99" }]
    });
    console.assert(duplicateResult.normalizedRows[0].safety_stock_target !== duplicateResult.normalizedRows[0].safety_stock_target_2, "Dataset Builder self-test failed: duplicate header correction isolation");

    const plantOnly = buildInventoryDataset({
      sourceRows: [{ Material: "MAT-PLANT", "Stock Value": "100", Plant: "PL-1" }],
      headers: ["Material", "Stock Value", "Plant"],
      columnMapping: mappingEngine.createAutomaticColumnMapping({
        headers: ["Material", "Stock Value", "Plant"],
        rows: [{ Material: "MAT-PLANT", "Stock Value": "100", Plant: "PL-1" }]
      })
    });
    console.assert(plantOnly.analyticalRows[0].profit_center === "PL-1", "Dataset Builder self-test failed: operational plant fallback");
    console.assert(plantOnly.analyticalRows[0].inventory_row_key === "MAT-PLANT::ROW-1", "Dataset Builder self-test failed: plant must not enter technical row key");

    const preview = buildInventoryDataset({
      sourceRows,
      headers,
      sourceColumnMetadata,
      columnMapping,
      corrections: [{ correctionType: "replace_source_value", sourceColumn: "Excess Value", sourceRowIndexes: [1], correctedValue: "80" }]
    });
    const apply = buildInventoryDataset({
      sourceRows,
      headers,
      sourceColumnMetadata,
      columnMapping,
      corrections: [{ correctionType: "replace_source_value", sourceColumn: "Excess Value", sourceRowIndexes: [1], correctedValue: "80" }]
    });
    console.assert(JSON.stringify(preview.analyticalRows) === JSON.stringify(apply.analyticalRows), "Dataset Builder self-test failed: preview/apply parity");
  }

  root.data.datasetBuilder = Object.freeze({
    version: BUILDER_VERSION,
    buildInventoryDataset,
    enrichInventoryRow,
    buildRecoveryInputNormalizationDiagnostics,
    applySourceCorrections,
    applyCanonicalCorrections,
    runDatasetBuilderSelfTests
  });
})(window);
