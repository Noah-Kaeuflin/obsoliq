(function registerExcessDecisionWorkspaceModel(global) {
  const runtime = /** @type {any} */ (global);
  const root = /** @type {any} */ (runtime.ObsoliQ = runtime.ObsoliQ || {});
  root.excess = root.excess || {};

  const VERSION = "3";
  const READINESS_MODEL_VERSION = "excess-decision-readiness-v2";
  const GROSS_NET_RECONCILIATION_VERSION = "gross-net-reconciliation-v1";
  const GROSS_NET_RECONCILIATION_EPSILON = 0.01;
  const NORMALIZED_BASE_CURRENCY_UNIT = "NORMALIZED_BASE_CURRENCY";
  const READINESS_STATUSES = Object.freeze(["ready", "limited", "review", "not_decidable"]);
  const ACTION_OPTION_STATUSES = Object.freeze(["checkable", "review_required", "not_checkable", "not_recommended"]);
  const HIGH_PRIORITY = "high";
  const aggregateNumericValues = root.core?.valueUtils?.aggregateNumericValues;

  if (typeof aggregateNumericValues !== "function") {
    throw new Error("ObsoliQ Excess Decision Workspace requires strict numeric aggregation utilities.");
  }
  const RELATIONSHIP_WARNING_TYPES = new Set([
    "ambiguous",
    "invalid_key",
    "material_fallback",
    "relationship_conflict",
    "enrichment_conflict"
  ]);

  function text(value) {
    return String(value ?? "").trim();
  }

  function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object || {}, key);
  }

  function list(value) {
    return Array.isArray(value) ? value.filter(item => item !== null && item !== undefined) : [];
  }

  function unique(values = []) {
    return [...new Set(list(values).map(text).filter(Boolean))];
  }

  function optionalNumber(value) {
    if (value === null || value === undefined) return { available: false, value: null, reason: "missing" };
    if (typeof value === "string" && !value.trim()) return { available: false, value: null, reason: "missing" };
    const parsed = Number(value);
    return Number.isFinite(parsed)
      ? { available: true, value: parsed, reason: "" }
      : { available: false, value: null, reason: "invalid" };
  }

  function aggregate(cases, key, type = "currency") {
    return aggregateNumericValues(cases, {
      fieldKey: key,
      fieldDefinition: { type, fieldKey: key },
      valueAccessor: item => item?.[key],
      parseResultAccessor: item => item?.__numericParseResults?.[key] || null
    });
  }

  function projectedNumber(primary = {}, primaryKey = "", fallback = {}, fallbackKey = "") {
    if (hasOwn(primary, primaryKey)) return optionalNumber(primary[primaryKey]);
    if (hasOwn(fallback, fallbackKey)) return optionalNumber(fallback[fallbackKey]);
    return optionalNumber(undefined);
  }

  function normalizeCurrencyUnit(value) {
    const normalized = text(value).toUpperCase().replace(/\s+/g, "");
    if (["€", "EURO", "EUROS"].includes(normalized)) return "EUR";
    if (["US$", "USDOLLAR", "USDOLLARS"].includes(normalized)) return "USD";
    if (["£", "STERLING", "POUNDSTERLING"].includes(normalized)) return "GBP";
    return normalized;
  }

  function canonicalCurrencyUnit(item = {}, explanation = {}) {
    return normalizeCurrencyUnit(
      explanation.currencyUnit
      || explanation.currency
      || item.currency_unit
      || item.currency
      || item.source_row?.currency_unit
      || item.source_row?.currency
    ) || NORMALIZED_BASE_CURRENCY_UNIT;
  }

  function projectedMoneyNumber(primary = {}, primaryKey = "", fallback = {}, fallbackKey = "", currencyUnit = "") {
    return {
      ...projectedNumber(primary, primaryKey, fallback, fallbackKey),
      currencyUnit: normalizeCurrencyUnit(currencyUnit) || NORMALIZED_BASE_CURRENCY_UNIT
    };
  }

  function valueFieldCurrencyUnit(explanation = {}, fieldName = "", fallbackUnit = "") {
    const aliases = {
      grossExcessValue: ["grossExcessCurrencyUnit", "grossExcessCurrency"],
      overlapValue: ["overlapCurrencyUnit", "overlapCurrency"],
      netAddressableValue: ["netAddressableCurrencyUnit", "netAddressableCurrency"],
      stockValue: ["stockCurrencyUnit", "stockCurrency"],
      remainingInventoryValue: ["remainingInventoryCurrencyUnit", "remainingInventoryCurrency"]
    };
    const explicit = (aliases[fieldName] || []).map(key => explanation[key]).find(meaningful);
    return normalizeCurrencyUnit(explicit || fallbackUnit) || NORMALIZED_BASE_CURRENCY_UNIT;
  }

  function validateGrossNetValueBasis(fields = {}) {
    const requiredFields = [
      ["grossExcessValue", fields.grossExcessValue],
      ["overlapValue", fields.overlapValue],
      ["netAddressableValue", fields.netAddressableValue]
    ];
    const missingFields = requiredFields
      .filter(([, field]) => !field?.available && field?.reason === "missing")
      .map(([key]) => key);
    const invalidFields = requiredFields
      .filter(([, field]) => (
        !field?.available && field?.reason !== "missing"
      ) || (
        field?.available && (!Number.isFinite(field.value) || field.value < 0)
      ))
      .map(([key]) => key);
    const currencyUnits = [...new Set(requiredFields
      .map(([, field]) => normalizeCurrencyUnit(field?.currencyUnit))
      .filter(Boolean))];
    const currencyConsistent = currencyUnits.length === 1;

    if (missingFields.length) {
      return {
        contractVersion: GROSS_NET_RECONCILIATION_VERSION,
        valid: false,
        status: "missing",
        reasonCode: "gross_net_value_basis_missing",
        limitationCodes: ["gross_net_value_basis_missing"],
        epsilon: GROSS_NET_RECONCILIATION_EPSILON,
        difference: null,
        currencyUnit: currencyConsistent ? currencyUnits[0] : null,
        currencyUnits,
        missingFields,
        invalidFields
      };
    }
    if (invalidFields.length || !currencyConsistent) {
      return {
        contractVersion: GROSS_NET_RECONCILIATION_VERSION,
        valid: false,
        status: "invalid",
        reasonCode: "gross_net_value_basis_invalid",
        limitationCodes: ["gross_net_value_basis_invalid"],
        epsilon: GROSS_NET_RECONCILIATION_EPSILON,
        difference: null,
        currencyUnit: currencyConsistent ? currencyUnits[0] : null,
        currencyUnits,
        missingFields,
        invalidFields: currencyConsistent ? invalidFields : [...new Set([...invalidFields, "currencyUnit"])]
      };
    }

    const gross = fields.grossExcessValue.value;
    const overlap = fields.overlapValue.value;
    const net = fields.netAddressableValue.value;
    const difference = gross - overlap - net;
    const valid = Math.abs(difference) <= GROSS_NET_RECONCILIATION_EPSILON;
    return {
      contractVersion: GROSS_NET_RECONCILIATION_VERSION,
      valid,
      status: valid ? "valid" : "inconsistent",
      reasonCode: valid ? null : "gross_net_value_basis_inconsistent",
      limitationCodes: valid ? [] : ["gross_net_value_basis_inconsistent"],
      epsilon: GROSS_NET_RECONCILIATION_EPSILON,
      difference,
      currencyUnit: currencyUnits[0],
      currencyUnits,
      missingFields,
      invalidFields
    };
  }

  function opportunityScoreProjection(item = {}) {
    const metadata = item.opportunity_score_metadata || {};
    const finalScore = optionalNumber(hasOwn(metadata, "finalScore")
      ? metadata.finalScore
      : hasOwn(item, "excess_opportunity_score")
        ? item.excess_opportunity_score
        : item.opportunity_score);
    return {
      ...finalScore,
      uncappedScore: optionalNumber(metadata.uncappedScore),
      scoreCap: optionalNumber(metadata.scoreCap),
      maxComponentTotal: optionalNumber(metadata.maxComponentTotal),
      wasCapped: metadata.wasCapped === true,
      cappedPoints: optionalNumber(metadata.cappedPoints),
      modelVersion: text(item.opportunity_score_model_version)
    };
  }

  function meaningful(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return Boolean(value.trim());
    return true;
  }

  function normalized(value) {
    return text(value).toLocaleLowerCase();
  }

  function plantFor(item = {}) {
    return text(item.plant || item.profit_center);
  }

  function ownerToken(item = {}) {
    const reference = text(item.owner_reference);
    const ownerFunction = text(item.owner_function);
    return reference || ownerFunction ? JSON.stringify([reference, ownerFunction]) : "";
  }

  function ownerOptions(cases = []) {
    const options = new Map();
    cases.forEach(item => {
      const value = ownerToken(item);
      if (!value || options.has(value)) return;
      const reference = text(item.owner_reference);
      const ownerFunction = text(item.owner_function);
      options.set(value, {
        value,
        reference,
        ownerFunction,
        label: [reference, ownerFunction].filter(Boolean).join(" · ")
      });
    });
    return [...options.values()].sort((a, b) => a.label.localeCompare(b.label, undefined, {
      numeric: true,
      sensitivity: "base"
    }));
  }

  function priorityOptions(cases = []) {
    const order = new Map([["high", 0], ["medium", 1], ["low", 2], ["none", 3]]);
    return [...new Set(cases.map(item => text(item.priority)).filter(Boolean))]
      .sort((a, b) => (order.get(normalized(a)) ?? 99) - (order.get(normalized(b)) ?? 99)
        || a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
  }

  function matchesSearch(item = {}, query = "") {
    const needle = normalized(query);
    if (!needle) return true;
    return [
      item.material_id,
      item.material_description,
      plantFor(item),
      item.profit_center,
      item.program_short,
      item.program,
      item.owner_reference,
      item.owner_function,
      item.priority,
      item.next_step,
      item.decision_type
    ].some(value => normalized(value).includes(needle));
  }

  function filterCases(cases = [], filters = {}) {
    const profitCenter = text(filters.profitCenter);
    const program = text(filters.program);
    const owner = text(filters.owner);
    const priority = text(filters.priority);
    return cases.filter(item => {
      if (!matchesSearch(item, filters.search)) return false;
      if (profitCenter && ![item.profit_center, item.plant].some(value => text(value) === profitCenter)) return false;
      if (program && ![item.program_short, item.program].some(value => text(value) === program)) return false;
      if (owner && ownerToken(item) !== owner) return false;
      if (priority && text(item.priority) !== priority) return false;
      return true;
    });
  }

  function summarize(cases = []) {
    const caseCount = cases.length;
    const grossAggregate = aggregate(cases, "gross_excess_value");
    const netAggregate = aggregate(cases, "net_addressable_excess_value");
    const overlapAggregate = aggregate(cases, "excess_overlap_value");
    const scoreAggregate = aggregate(cases, "excess_opportunity_score", "number");
    const scores = scoreAggregate.status === "complete"
      ? cases.map(item => optionalNumber(item.excess_opportunity_score).value)
      : [];
    const averageScore = scoreAggregate.value === null || !caseCount
      ? null
      : Math.round(scoreAggregate.value / caseCount);
    const grossValue = grossAggregate.value;
    const netValue = netAggregate.value;
    const overlapValue = overlapAggregate.value;
    const addressabilityAvailable = [grossAggregate, netAggregate, overlapAggregate]
      .every(item => item.status === "complete") && grossValue > 0;
    return {
      netAddressable: {
        value: netValue,
        available: netAggregate.status === "complete",
        aggregate: netAggregate
      },
      casePortfolio: {
        caseCount,
        uniqueMaterialCount: new Set(cases.map(item => text(item.material_id)).filter(Boolean)).size,
        uniquePlantCount: new Set(cases.map(plantFor).filter(Boolean)).size
      },
      prioritization: {
        averageScore,
        maximumScore: scores.length ? Math.max(...scores) : null,
        highPriorityCaseCount: cases.filter(item => normalized(item.priority) === HIGH_PRIORITY).length,
        aggregate: scoreAggregate
      },
      addressability: {
        grossValue,
        netValue,
        overlapValue,
        addressabilityRatio: addressabilityAvailable ? netValue / grossValue : null,
        available: addressabilityAvailable,
        aggregates: {
          grossValue: grossAggregate,
          netValue: netAggregate,
          overlapValue: overlapAggregate
        }
      }
    };
  }

  function relationshipWarning(item = {}, issueRowKeys = []) {
    const rowKey = text(item.inventory_row_key || item.inventoryRowKey);
    if (rowKey && new Set(issueRowKeys.map(text)).has(rowKey)) return true;
    const matchType = normalized(item.relationship_match_type);
    return Boolean(matchType && RELATIONSHIP_WARNING_TYPES.has(matchType));
  }

  function normalizeHistoricalOptions(input = null) {
    if (input && hasOwn(input, "historicalMetricsByInventoryRowKey")) {
      return { historicalResult: input, historyPackageLoaded: true, historicalRuntimeState: {} };
    }
    return input || {};
  }

  function historicalUnitContext(metric = {}, limitations = [], buckets = []) {
    const metricUnit = text(metric.unit || metric.provenance?.historyUnit).toUpperCase();
    const bucketUnits = unique(list(buckets).map(bucket => text(bucket?.unit).toUpperCase()));
    const unitStatus = text(metric.provenance?.unitStatus);
    const limitationCodes = new Set(list(limitations).map(text));
    const conflictingBuckets = bucketUnits.length > 1
      || Boolean(metricUnit && bucketUnits.some(unit => unit !== metricUnit));
    const conflict = unitStatus === "conflict"
      || limitationCodes.has("unit_conflict")
      || limitationCodes.has("multiple_units")
      || conflictingBuckets;
    const unit = conflict ? "" : metricUnit || bucketUnits[0] || "";
    return {
      state: conflict ? "conflict" : unit ? "available" : "missing",
      unit,
      source: metricUnit
        ? (meaningful(metric.unit) ? "metric.unit" : "metric.provenance.historyUnit")
        : bucketUnits.length === 1
          ? "monthly_buckets.unit"
          : "",
      provenance: {
        unitStatus,
        historyUnit: text(metric.provenance?.historyUnit || metric.unit).toUpperCase(),
        inventoryUnit: text(metric.provenance?.inventoryUnit || metric.inventory_unit).toUpperCase(),
        monthlyBucketUnits: bucketUnits
      }
    };
  }

  function historicalEvidence(item = {}, input = null) {
    const options = normalizeHistoricalOptions(input);
    const historicalResult = options.historicalResult || null;
    const runtimeState = options.historicalRuntimeState || {};
    const rowKey = text(item.inventory_row_key || item.inventoryRowKey);
    const packageLoaded = typeof options.historyPackageLoaded === "boolean"
      ? options.historyPackageLoaded
      : Boolean(historicalResult);
    const runtimeStatus = text(runtimeState.status || historicalResult?.status || historicalResult?.historicalMetricsRuntimeStatus);
    const metric = rowKey && historicalResult
      ? historicalResult.historicalMetricsByInventoryRowKey?.[rowKey] || null
      : null;
    const base = {
      status: "unavailable",
      state: "package_missing",
      exact: false,
      metric: null,
      limitations: [],
      monthlyBuckets: [],
      unitContext: historicalUnitContext(),
      runtimeReason: text(runtimeState.reasonCode || runtimeState.reason || historicalResult?.reason)
    };
    if (!packageLoaded) return base;
    if (runtimeStatus === "error") {
      return { ...base, state: "runtime_error", runtimeReason: text(runtimeState.errorCode || runtimeState.errorMessage || base.runtimeReason) };
    }
    if (["not_calculated", "calculating"].includes(runtimeStatus) || (!historicalResult && !runtimeStatus)) {
      return { ...base, state: "not_calculated" };
    }
    if (!metric) {
      return {
        ...base,
        state: runtimeStatus === "unavailable" ? "insufficient" : "loaded_no_exact_relationship"
      };
    }
    const metricStatus = text(metric.history_metric_status);
    const limitations = list(metric.history_metric_limitation_codes).map(text).filter(Boolean);
    const candidateBuckets = list(metric.monthly_buckets)
      .filter(bucket => text(bucket?.month) && optionalNumber(bucket?.netQuantity).available)
      .map(bucket => ({ ...bucket }));
    const unitContext = historicalUnitContext(metric, limitations, candidateBuckets);
    const monthlyBuckets = unitContext.state === "conflict"
      ? []
      : candidateBuckets.map(bucket => ({
          ...bucket,
          unit: text(bucket.unit || unitContext.unit).toUpperCase()
        }));
    if (metricStatus === "unavailable") {
      return { ...base, state: "insufficient", exact: true, metric, limitations, monthlyBuckets, unitContext };
    }
    if (!["available", "limited"].includes(metricStatus)) {
      return { ...base, state: "not_calculated", exact: true, metric, limitations, monthlyBuckets, unitContext };
    }
    return {
      status: metricStatus,
      state: metricStatus,
      exact: true,
      metric,
      limitations,
      monthlyBuckets,
      unitContext,
      runtimeReason: ""
    };
  }

  function causeHypothesis(item = {}, history = {}) {
    const evidenceRecords = list(item.evidenceRecords);
    const supportedEvidenceKeys = new Set([
      "net_addressable_excess_value",
      "gross_excess_value",
      "excess_overlap_value",
      "owner_reference",
      "relationship_match_type"
    ]);
    const signals = list(item.whyPrioritized).map(code => ({
      signalCode: text(code),
      labelKey: text(code),
      source: "whyPrioritized",
      value: null,
      valueType: "translation"
    }));
    evidenceRecords
      .filter(record => supportedEvidenceKeys.has(text(record?.evidenceKey))
        && text(record?.evidenceType) !== "unavailable"
        && meaningful(record?.value))
      .forEach(record => signals.push({
        signalCode: `evidence_${text(record.evidenceKey)}`,
        labelKey: text(record.labelKey || record.evidenceKey),
        source: "evidenceRecord",
        value: record.value,
        valueType: text(record.valueType || "text"),
        provenance: {
          sourceField: text(record.sourceField),
          sourcePackageId: text(record.sourcePackageId),
          sourcePackageRevision: text(record.sourcePackageRevision)
        }
      }));
    const history12m = optionalNumber(history.metric?.net_consumption_quantity_12m);
    if (history.exact && history12m.available) {
      signals.push({
        signalCode: "history_net_consumption_12m",
        labelKey: "netConsumption12m",
        source: "historicalEvidence",
        value: history12m.value,
        valueType: "quantity",
        unit: text(history.unitContext?.unit),
        unitState: text(history.unitContext?.state || "missing")
      });
    }
    const deduplicated = [];
    const seen = new Set();
    signals.forEach(signal => {
      const key = signal.signalCode || signal.labelKey;
      if (!key || seen.has(key)) return;
      seen.add(key);
      deduplicated.push(signal);
    });
    const cause = text(item.root_cause);
    return {
      cause,
      hypothesis: cause,
      available: Boolean(text(item.root_cause)),
      supportingSignals: deduplicated.slice(0, 5),
      classification: "rule_based_hypothesis",
      classificationKey: "excessCauseRuleBasedNotice",
      provenance: {
        sourceField: cause ? "root_cause" : "",
        source: cause ? "existing_action_decoration" : "none",
        supportingSignalSources: unique(deduplicated.map(signal => signal.source))
      }
    };
  }

  function purchaseOrderEvidence(item = {}, options = {}) {
    const row = item.source_row || {};
    const detailKeys = ["open_purchase_order_number", "purchase_order_number", "po_number", "purchase_order_item", "po_item", "supplier"];
    const valueKeys = ["open_po_value", "open_purchase_order_value", "open_po_qty", "open_purchase_order_quantity"];
    const details = detailKeys.filter(key => meaningful(row[key])).map(key => ({ key, value: row[key] }));
    const values = valueKeys.filter(key => meaningful(row[key])).map(key => ({ key, value: row[key] }));
    const packageImportSupported = options.purchaseOrderPackageImportSupported === true;
    if (details.length && values.length) {
      return {
        state: "concrete",
        evidence: [...details, ...values],
        evidenceSource: "inventory_row_fields",
        standalonePackageImportSupported: packageImportSupported
      };
    }
    if (details.length || values.length) {
      return {
        state: "insufficient",
        evidence: [...details, ...values],
        evidenceSource: "inventory_row_fields",
        standalonePackageImportSupported: packageImportSupported
      };
    }
    return {
      state: "no_case_evidence",
      evidence: [],
      evidenceSource: "none",
      standalonePackageImportSupported: packageImportSupported
    };
  }

  function scenarioOption(scenario = {}, poEvidence = {}) {
    const code = text(scenario.scenario_id || scenario.scenarioType);
    if (!code) return null;
    let status = scenario.availability === "available"
      ? "checkable"
      : scenario.availability === "limited"
        ? "review_required"
        : "not_checkable";
    let evidence = Object.entries(scenario.observedInputs || {}).map(([key, value]) => ({ key, value }));
    if (code === "purchase_order_review") {
      evidence = poEvidence.evidence || [];
      if (poEvidence.state === "concrete" && scenario.availability === "available") status = "checkable";
      else if (poEvidence.state === "insufficient") status = "review_required";
      else status = "not_checkable";
    }
    return {
      optionCode: code,
      labelKey: text(scenario.label_key || code),
      labelText: "",
      status,
      isPrimary: false,
      evidence,
      missingEvidence: unique(scenario.missingEvidence),
      nextCheck: text(scenario.note_key),
      provenance: unique([
        "scenario_availability",
        text(scenario.modelVersion || scenario.model_version) ? `scenario_model:${text(scenario.modelVersion || scenario.model_version)}` : "",
        code === "purchase_order_review" ? `purchase_order_evidence:${poEvidence.state || "unknown"}` : "",
        code === "purchase_order_review" ? `purchase_order_source:${poEvidence.evidenceSource || "none"}` : "",
        code === "purchase_order_review" ? `purchase_orders_package:${poEvidence.standalonePackageImportSupported ? "supported" : "unsupported"}` : ""
      ])
    };
  }

  function actionOptions(item = {}, options = {}) {
    const recommendation = text(item.recommended_action || item.ownerActionContext?.recommendation);
    const decisionType = text(item.decision_type || item.ownerActionContext?.decisionType);
    const nextStep = text(item.next_step || item.ownerActionContext?.nextStep);
    const primaryStatus = recommendation && decisionType && nextStep
      ? "checkable"
      : recommendation
        ? "review_required"
        : "not_checkable";
    const primary = {
      optionCode: decisionType ? `primary_${decisionType}` : "primary_recommendation",
      labelKey: "excessPrimaryRecommendation",
      labelText: recommendation,
      status: primaryStatus,
      isPrimary: true,
      evidence: [
        decisionType ? { key: "decision_type", value: decisionType } : null,
        nextStep ? { key: "next_step", value: nextStep } : null
      ].filter(Boolean),
      missingEvidence: [!decisionType ? "decision_type" : "", !nextStep ? "next_step" : ""].filter(Boolean),
      nextCheck: nextStep,
      provenance: ["recommended_action", decisionType ? "decision_type" : "", nextStep ? "next_step" : ""].filter(Boolean)
    };
    const poEvidence = purchaseOrderEvidence(item, options);
    const additional = list(item.scenarios)
      .map(scenario => scenarioOption(scenario, poEvidence))
      .filter(Boolean);
    return [primary, ...additional];
  }

  function valueNarrative(item = {}) {
    const explanation = item.grossToNetExplanation || {};
    const currencyUnit = canonicalCurrencyUnit(item, explanation);
    const fields = {
      stockValue: projectedMoneyNumber(item, "stock_value", {}, "", valueFieldCurrencyUnit(explanation, "stockValue", currencyUnit)),
      grossExcessValue: projectedMoneyNumber(explanation, "grossExcessValue", item, "gross_excess_value", valueFieldCurrencyUnit(explanation, "grossExcessValue", currencyUnit)),
      overlapValue: projectedMoneyNumber(explanation, "overlapValue", item, "excess_overlap_value", valueFieldCurrencyUnit(explanation, "overlapValue", currencyUnit)),
      netAddressableValue: projectedMoneyNumber(explanation, "netAddressableExcessValue", item, "net_addressable_excess_value", valueFieldCurrencyUnit(explanation, "netAddressableValue", currencyUnit)),
      remainingInventoryValue: projectedMoneyNumber(explanation, "remainingInventoryValue", item, "excess_remaining_inventory_value", valueFieldCurrencyUnit(explanation, "remainingInventoryValue", currencyUnit))
    };
    const reconciliation = validateGrossNetValueBasis(fields);
    return {
      contractVersion: GROSS_NET_RECONCILIATION_VERSION,
      fields,
      validBasis: reconciliation.valid,
      basisStatus: reconciliation.status,
      reasonCode: reconciliation.reasonCode,
      limitationCodes: reconciliation.limitationCodes,
      reconciliation,
      valueStatus: "identified_potential",
      boundaryKeys: [
        "excessValueBoundaryExpected",
        "excessValueBoundaryApproved",
        "excessValueBoundaryRealized"
      ],
      reasonKey: text(explanation.reasonKey || "grossNetNoOverlapReason")
    };
  }

  function workContext(item = {}) {
    const context = item.ownerActionContext || {};
    return {
      actionStatus: text(item.status),
      ownerReference: text(context.ownerReference || item.owner_reference),
      ownerFunction: text(context.ownerFunction || item.owner_function),
      ownerSource: text(context.ownerSource || item.owner_source),
      ownerAssignmentConfidence: text(context.ownerAssignmentConfidence || item.owner_assignment_confidence),
      decisionType: text(context.decisionType || item.decision_type),
      sessionOnly: true
    };
  }

  function decisionReadiness(item = {}, projection = {}) {
    const value = projection.valueNarrative || valueNarrative(item);
    const cause = projection.causeHypothesis || causeHypothesis(item, projection.historicalEvidence || {});
    const options = list(projection.actionOptions);
    const primaryOption = options.find(option => option?.isPrimary) || null;
    const context = projection.workContext || workContext(item);
    const identityValid = Boolean(text(item.case_id) && text(item.inventory_row_key || item.inventoryRowKey) && text(item.material_id));
    const recommendationValid = Boolean(primaryOption?.labelText);
    const ownerAvailable = Boolean(context.ownerReference && context.ownerFunction);
    const relationshipExact = text(item.relationship_match_type) === "exact_material_plant";
    const historyState = text(projection.historicalEvidence?.state || "package_missing");
    const primaryCheckable = primaryOption?.status === "checkable";
    const missingEvidence = [];
    if (!identityValid) missingEvidence.push("case_identity");
    if (!value.validBasis) missingEvidence.push(value.reasonCode || "gross_net_value_basis_invalid");
    if (!recommendationValid) missingEvidence.push("recommended_action");
    if (!cause.available) missingEvidence.push("root_cause");
    if (!context.ownerReference) missingEvidence.push("owner_reference");
    if (!context.ownerFunction) missingEvidence.push("owner_function");
    if (!relationshipExact) missingEvidence.push("exact_relationship");
    if (!text(item.next_step || item.ownerActionContext?.nextStep)) missingEvidence.push("next_step");
    if (!primaryCheckable) missingEvidence.push("primary_option_checkability");
    if (!historyState || !["available", "limited"].includes(historyState)) missingEvidence.push("historical_evidence");
    const whyNotHigher = unique(item.whyNotHigher);
    const limitations = unique(item.limitations);
    let status = "ready";
    if (!identityValid || !value.validBasis || !recommendationValid) status = "not_decidable";
    else if (!cause.available || !ownerAvailable || !relationshipExact || !primaryCheckable) status = "review";
    else if (historyState !== "available" || whyNotHigher.length || limitations.length || missingEvidence.length) status = "limited";
    return {
      version: READINESS_MODEL_VERSION,
      status,
      existingEvidence: [
        identityValid ? "case_identity" : "",
        value.validBasis ? "gross_net_value_basis" : "",
        cause.available ? "root_cause" : "",
        recommendationValid ? "recommended_action" : "",
        text(item.next_step || item.ownerActionContext?.nextStep) ? "next_step" : "",
        ownerAvailable ? "owner_assignment" : "",
        relationshipExact ? "exact_relationship" : "",
        ["available", "limited"].includes(historyState) ? "historical_evidence" : "",
        primaryCheckable ? "primary_option_checkability" : ""
      ].filter(Boolean),
      missingEvidence: unique(missingEvidence),
      decisionLimits: unique([
        ...limitations.map(code => `limitation_${code}`),
        ...list(value.limitationCodes)
      ]),
      whyNotHigher,
      nextCheck: text(item.next_step || item.ownerActionContext?.nextStep) || missingEvidence[0] || "",
      truthTable: {
        identityValid,
        valueBasisValid: value.validBasis,
        valueBasisReasonCode: value.reasonCode || "",
        recommendationValid,
        causeAvailable: cause.available,
        ownerAvailable,
        relationshipExact,
        primaryOptionCheckable: primaryCheckable,
        historicalState: historyState
      }
    };
  }

  function projectDecisionCore(item = {}, options = {}) {
    const projectedHistory = historicalEvidence(item, options);
    const projectedCause = causeHypothesis(item, projectedHistory);
    const projectedActions = actionOptions(item, options);
    const projectedValue = valueNarrative(item);
    const projectedWork = workContext(item);
    const projectedReadiness = decisionReadiness(item, {
      historicalEvidence: projectedHistory,
      causeHypothesis: projectedCause,
      actionOptions: projectedActions,
      valueNarrative: projectedValue,
      workContext: projectedWork
    });
    const projectedScore = opportunityScoreProjection(item);
    return {
      projectionVersion: VERSION,
      contractVersions: {
        workspaceProjection: VERSION,
        decisionReadiness: READINESS_MODEL_VERSION,
        grossNetReconciliation: GROSS_NET_RECONCILIATION_VERSION
      },
      caseId: text(item.case_id),
      inventoryRowKey: text(item.inventory_row_key || item.inventoryRowKey),
      materialId: text(item.material_id),
      materialDescription: text(item.material_description),
      plant: plantFor(item),
      primaryCategory: text(item.primary_category || item.category),
      actionStatus: text(item.status),
      priority: text(item.priority),
      opportunityScore: projectedScore,
      netAddressableValue: projectedValue.fields.netAddressableValue,
      grossExcessValue: projectedValue.fields.grossExcessValue,
      overlapValue: projectedValue.fields.overlapValue,
      ownerReference: text(item.owner_reference),
      ownerFunction: text(item.owner_function),
      whyPrioritized: Array.isArray(item.whyPrioritized) ? [...item.whyPrioritized] : [],
      whyNotHigher: Array.isArray(item.whyNotHigher) ? [...item.whyNotHigher] : [],
      nextStep: text(item.next_step),
      decisionType: text(item.decision_type),
      inventoryNavigationTarget: {
        inventoryRowKey: text(item.inventory_row_key || item.inventoryRowKey),
        inventoryEntityKey: text(item.inventory_entity_key || item.inventoryEntityKey),
        materialId: text(item.material_id),
        plant: plantFor(item)
      },
      actionsNavigationTarget: {
        caseId: text(item.case_id),
        inventoryRowKey: text(item.inventory_row_key || item.inventoryRowKey)
      },
      causeHypothesis: projectedCause,
      decisionReadiness: projectedReadiness,
      actionOptions: projectedActions,
      decisionLimits: projectedReadiness.decisionLimits,
      historicalEvidence: projectedHistory,
      valueNarrative: projectedValue,
      workContext: projectedWork,
      technicalRelationshipState: {
        matchType: text(item.relationship_match_type),
        warning: relationshipWarning(item, options.relationshipIssueRowKeys || [])
      }
    };
  }

  root.excess.decisionWorkspaceModel = Object.freeze({
    version: VERSION,
    GROSS_NET_RECONCILIATION_VERSION,
    GROSS_NET_RECONCILIATION_EPSILON,
    ACTION_OPTION_STATUSES,
    READINESS_MODEL_VERSION,
    READINESS_STATUSES,
    actionOptions,
    causeHypothesis,
    decisionReadiness,
    filterCases,
    historicalEvidence,
    historicalUnitContext,
    opportunityScoreProjection,
    ownerOptions,
    ownerToken,
    priorityOptions,
    projectDecisionCore,
    purchaseOrderEvidence,
    valueNarrative,
    workContext,
    relationshipWarning,
    summarize,
    validateGrossNetValueBasis
  });
})(window);
