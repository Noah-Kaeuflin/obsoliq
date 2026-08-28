/* ObsoliQ Input Normalization Engine
 * Field-aware value normalization with diagnostics and explicit scale policy.
 */
(function registerInputNormalizationEngine(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.data = root.data || {};

  const canonical = root.core?.canonical;
  const valueUtils = root.core?.valueUtils;
  if (!canonical) throw new Error("ObsoliQ input normalization engine requires the canonical module.");
  if (!valueUtils) throw new Error("ObsoliQ input normalization engine requires the value-utils module.");

  const {
    inventoryFieldDefinitions,
    numericKeys,
    currencyKeys,
    percentageKeys
  } = canonical;
  const {
    inferNumericLocaleProfile,
    parseLocalizedNumericValue,
    extractSourceHeaderHints
  } = valueUtils;
  const VERSION = "1";
  const numericFieldSet = new Set(numericKeys || []);
  const currencyFieldSet = new Set(currencyKeys || []);

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function fieldDefinition(fieldKey, fieldDefinitions = inventoryFieldDefinitions) {
    return fieldDefinitions[fieldKey] || null;
  }

  function isNumericField(fieldKey, fieldDefinitions = inventoryFieldDefinitions) {
    const definition = fieldDefinition(fieldKey, fieldDefinitions);
    return Boolean(definition && ["number", "currency", "percentage"].includes(definition.type));
  }

  function isRequiredAnalyticalField(fieldKey, fieldDefinitions = inventoryFieldDefinitions, mappingPolicy = {}) {
    const definition = fieldDefinition(fieldKey, fieldDefinitions);
    return Boolean(
      definition
      && ["currency", "number", "percentage"].includes(definition.type)
      && (
        definition.requirement === "required"
        || (mappingPolicy.requiredFields || []).includes(fieldKey)
        || (mappingPolicy.recoveryInputFields || []).includes(fieldKey)
      )
    );
  }

  function sourceMetaForEntry(entry = {}, sourceColumnMetadata = []) {
    return sourceColumnMetadata.find(meta => meta.sourceIndex === entry.sourceIndex)
      || sourceColumnMetadata.find(meta => meta.sourceKey === entry.sourceColumn)
      || sourceColumnMetadata.find(meta => meta.originalHeader === entry.sourceColumn)
      || null;
  }

  function headerHintsByField({ columnMapping = [], sourceColumnMetadata = [] } = {}) {
    const hints = {};
    (columnMapping || []).forEach(entry => {
      const fieldKey = entry.selectedCanonicalField;
      if (!fieldKey || entry.ignored || entry.status === "protected") return;
      const meta = sourceMetaForEntry(entry, sourceColumnMetadata);
      const header = meta?.originalHeader || entry.sourceColumn || "";
      hints[fieldKey] = extractSourceHeaderHints(header);
    });
    return hints;
  }

  function localeProfilesByField(rows = [], fieldDefinitions = inventoryFieldDefinitions, options = {}) {
    const profiles = {};
    Object.keys(fieldDefinitions).forEach(fieldKey => {
      if (!isNumericField(fieldKey, fieldDefinitions)) return;
      const values = rows.map(row => row?.[fieldKey]);
      profiles[fieldKey] = inferNumericLocaleProfile(values, options.localeOptions || {});
    });
    return profiles;
  }

  function policyForField(fieldKey, normalizationPolicy = {}) {
    return {
      ...(normalizationPolicy.defaultFieldPolicy || {}),
      ...((normalizationPolicy.fields || {})[fieldKey] || {})
    };
  }

  function diagnosticSeverity(parseResult, fieldKey, fieldDefinitions, mappingPolicy = {}) {
    const definition = fieldDefinition(fieldKey, fieldDefinitions);
    if (!definition) return "warning";
    if (parseResult.status === "missing") return definition.requirement === "required" ? "warning" : "info";
    if (parseResult.status === "double_scale") return definition.type === "currency" ? "error" : "warning";
    if (parseResult.status === "ambiguous") {
      return isRequiredAnalyticalField(fieldKey, fieldDefinitions, mappingPolicy) ? "error" : "warning";
    }
    if (parseResult.status === "invalid") return "warning";
    return "info";
  }

  function codeForStatus(status) {
    if (status === "double_scale") return "potential_double_scaling";
    if (status === "ambiguous") return "ambiguous_numeric_locale";
    if (status === "invalid") return "invalid_numeric_value";
    if (status === "missing") return "missing_numeric_value";
    return "normalized_value";
  }

  function normalizeRows({
    rows = [],
    columnMapping = [],
    sourceColumnMetadata = [],
    fieldDefinitions = inventoryFieldDefinitions,
    normalizationPolicy = {},
    mappingPolicy = {},
    localeOptions = {}
  } = {}) {
    const hintsByField = {
      ...headerHintsByField({ columnMapping, sourceColumnMetadata }),
      ...(normalizationPolicy.headerHintsByField || {})
    };
    const profilesByField = {
      ...localeProfilesByField(rows, fieldDefinitions, { localeOptions }),
      ...(normalizationPolicy.localeProfilesByField || {})
    };
    const diagnostics = [];
    const transformedSamples = [];
    const currencyByField = {};
    let transformedCellCount = 0;
    let blockedCellCount = 0;
    let reviewCellCount = 0;

    const normalizedRows = rows.map((row, rowIndex) => {
      const next = { ...(row || {}) };
      const numericParseResults = {};
      if (Object.prototype.hasOwnProperty.call(row || {}, "__sourceProfitCenterForKey")) {
        Object.defineProperty(next, "__sourceProfitCenterForKey", {
          value: row.__sourceProfitCenterForKey,
          enumerable: false,
          configurable: true
        });
      }
      Object.keys(next).forEach(fieldKey => {
        const definition = fieldDefinition(fieldKey, fieldDefinitions);
        if (!definition || !isNumericField(fieldKey, fieldDefinitions)) return;
        const parseResult = parseLocalizedNumericValue({
          rawValue: next[fieldKey],
          fieldDefinition: {
            ...definition,
            fieldKey,
            percentageStorage: definition.percentageStorage || "percent_points"
          },
          localeProfile: profilesByField[fieldKey],
          headerHints: hintsByField[fieldKey],
          normalizationPolicy: policyForField(fieldKey, normalizationPolicy)
        });
        const severity = diagnosticSeverity(parseResult, fieldKey, fieldDefinitions, mappingPolicy);
        numericParseResults[fieldKey] = {
          status: parseResult.status,
          normalizedValue: parseResult.status === "valid" ? parseResult.normalizedValue : null,
          reasonCodes: [...(parseResult.warnings || [])]
        };
        if (parseResult.detectedCurrency && currencyFieldSet.has(fieldKey)) {
          currencyByField[fieldKey] = currencyByField[fieldKey] || new Set();
          currencyByField[fieldKey].add(parseResult.detectedCurrency);
        }
        if (parseResult.status === "valid") {
          if (Number.isFinite(parseResult.normalizedValue)) {
            next[fieldKey] = parseResult.normalizedValue;
            if (parseResult.appliedScaleFactor !== 1 || String(parseResult.rawValue) !== String(parseResult.normalizedValue)) {
              transformedCellCount += 1;
              if (transformedSamples.length < 20) {
                transformedSamples.push({
                  rowNumber: row?.__sourceRowIndex ?? rowIndex + 1,
                  field: fieldKey,
                  rawValue: parseResult.rawValue,
                  normalizedValue: parseResult.normalizedValue,
                  appliedScaleFactor: parseResult.appliedScaleFactor
                });
              }
            }
          }
          return;
        }
        if (parseResult.status !== "missing" || severity !== "info") {
          const diagnostic = {
            severity,
            code: codeForStatus(parseResult.status),
            status: parseResult.status,
            rowNumber: row?.__sourceRowIndex ?? rowIndex + 1,
            field: fieldKey,
            rawValue: parseResult.rawValue,
            detectedLocale: parseResult.detectedLocale,
            cellScaleFactor: parseResult.cellScaleFactor,
            headerScaleFactor: parseResult.headerScaleFactor,
            detectedCurrency: parseResult.detectedCurrency,
            warnings: parseResult.warnings || []
          };
          diagnostics.push(diagnostic);
          if (severity === "error") blockedCellCount += 1;
          else if (severity === "warning") reviewCellCount += 1;
        }
        next[fieldKey] = null;
      });
      Object.defineProperty(next, "__numericParseResults", {
        value: numericParseResults,
        enumerable: false,
        configurable: true
      });
      return next;
    });

    Object.entries(currencyByField).forEach(([fieldKey, currencies]) => {
      if (currencies.size > 1) {
        diagnostics.push({
          severity: isRequiredAnalyticalField(fieldKey, fieldDefinitions, mappingPolicy) ? "error" : "warning",
          code: "mixed_currency",
          field: fieldKey,
          currencies: [...currencies].sort(),
          warnings: ["mixed_currency_no_fx_conversion"]
        });
        if (isRequiredAnalyticalField(fieldKey, fieldDefinitions, mappingPolicy)) blockedCellCount += 1;
        else reviewCellCount += 1;
      }
    });

    const activeNumericFields = Object.keys(fieldDefinitions || {}).filter(fieldKey => isNumericField(fieldKey, fieldDefinitions));
    const activeCurrencyFields = Object.keys(fieldDefinitions || {}).filter(fieldKey => fieldDefinitions[fieldKey]?.type === "currency");
    const activePercentageFields = Object.keys(fieldDefinitions || {}).filter(fieldKey => fieldDefinitions[fieldKey]?.type === "percentage");
    const summary = {
      version: VERSION,
      rowCount: rows.length,
      normalizedRowCount: normalizedRows.length,
      transformedCellCount,
      diagnosticCount: diagnostics.length,
      blockedCellCount,
      reviewCellCount,
      status: blockedCellCount ? "blocked" : reviewCellCount ? "review_required" : "trusted",
      numericFields: activeNumericFields.length ? activeNumericFields : [...numericFieldSet],
      currencyFields: activeCurrencyFields.length ? activeCurrencyFields : [...currencyKeys],
      percentageFields: activePercentageFields.length ? activePercentageFields : [...percentageKeys],
      transformedSamples
    };

    return Object.freeze({
      normalizedRows,
      diagnostics: diagnostics.map(Object.freeze),
      summary: Object.freeze(summary),
      localeProfilesByField: cloneData(profilesByField),
      headerHintsByField: cloneData(hintsByField),
      normalizationPolicy: cloneData(normalizationPolicy)
    });
  }

  root.data.inputNormalizationEngine = Object.freeze({
    version: VERSION,
    isNumericField,
    isRequiredAnalyticalField,
    headerHintsByField,
    localeProfilesByField,
    normalizeRows
  });
})(window);
