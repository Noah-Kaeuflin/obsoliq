(function registerConsumptionHistorySemanticsEngine(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.data = root.data || {};

  const valueUtils = root.core?.valueUtils;
  if (!valueUtils) throw new Error("Consumption History Semantics Engine requires value utilities.");

  const POLICY_VERSION = "consumption-history-semantics-v1";
  const READINESS_POLICY_VERSION = "history-readiness-v1";
  const MOVEMENT_RULE_SET = Object.freeze({
    ruleSetId: "sap-consumption-movement-mvp",
    ruleSetVersion: "1",
    rules: Object.freeze({
      "261": Object.freeze({ semantic: "consumption", netSign: 1 }),
      "262": Object.freeze({ semantic: "reversal", netSign: -1 })
    })
  });

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function normalizedUnit(value) {
    return normalizeText(value).replace(/\s+/g, "").toUpperCase();
  }

  function consumptionQuantityParse(row = {}) {
    const explicitStatus = normalizeText(row.consumption_quantity_parse_status);
    if (explicitStatus) {
      return {
        status: explicitStatus,
        normalizedValue: explicitStatus === "valid" && typeof row.consumption_quantity === "number" && Number.isFinite(row.consumption_quantity)
          ? row.consumption_quantity
          : null
      };
    }
    return valueUtils.parseLocalizedNumericValue({
      rawValue: row.consumption_quantity,
      fieldDefinition: { type: "number", fieldKey: "consumption_quantity" }
    });
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function validCalendarDate(year, month, day) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
    if (year < 1900 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return false;
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return day <= days;
  }

  function dateResult(status, rawValue, extra = {}) {
    return {
      status,
      rawValue,
      normalizedDate: "",
      normalizedPeriod: "",
      format: "",
      ...extra
    };
  }

  function parsedDate(rawValue, year, month, day, format) {
    if (!validCalendarDate(year, month, day)) return dateResult("invalid", rawValue, { format });
    const normalizedDate = `${String(year).padStart(4, "0")}-${pad2(month)}-${pad2(day)}`;
    return dateResult("valid", rawValue, {
      normalizedDate,
      normalizedPeriod: `${String(year).padStart(4, "0")}-${pad2(month)}`,
      format
    });
  }

  function excelSerialDate(rawValue, excelDateSystem = "1900") {
    const raw = normalizeText(rawValue);
    const serial = Number(raw);
    const system = String(excelDateSystem || "1900");
    if (!Number.isFinite(serial) || Math.floor(serial) !== serial) return dateResult("invalid", rawValue, { format: "excel-serial", excelDateSystem: system });
    if (system === "1904") {
      if (serial < 0) return dateResult("invalid", rawValue, { format: "excel-serial", excelDateSystem: system });
      const date = new Date(Date.UTC(1904, 0, 1) + serial * 86400000);
      return parsedDate(rawValue, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), "excel-serial");
    }
    if (system !== "1900" || serial < 1 || serial === 60) {
      return dateResult("invalid", rawValue, { format: "excel-serial", excelDateSystem: system, reasonCode: serial === 60 ? "excel_1900_phantom_leap_day" : "invalid_excel_serial" });
    }
    const offset = serial < 60 ? serial : serial - 1;
    const date = new Date(Date.UTC(1899, 11, 31) + offset * 86400000);
    return parsedDate(rawValue, date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), "excel-serial");
  }

  function parsePostingDate(rawValue, format = "auto", options = {}) {
    const raw = normalizeText(rawValue);
    if (!raw) return dateResult("missing", rawValue);
    const selected = format || "auto";
    if (selected === "auto") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return parsePostingDate(raw, "yyyy-mm-dd");
      if (/^\d{8}$/.test(raw)) return parsePostingDate(raw, "yyyymmdd");
      if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(raw)) return parsePostingDate(raw, "dd.mm.yyyy");
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) return dateResult("ambiguous", rawValue, { format: "auto", candidates: ["mm/dd/yyyy"] });
      if (/^\d+(\.\d+)?$/.test(raw)) return dateResult("review_required", rawValue, { format: "auto", candidates: ["excel-serial"] });
      return dateResult("invalid", rawValue, { format: "auto" });
    }
    if (selected === "yyyy-mm-dd") {
      const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      return match ? parsedDate(rawValue, Number(match[1]), Number(match[2]), Number(match[3]), selected) : dateResult("invalid", rawValue, { format: selected });
    }
    if (selected === "dd.mm.yyyy") {
      const match = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      return match ? parsedDate(rawValue, Number(match[3]), Number(match[2]), Number(match[1]), selected) : dateResult("invalid", rawValue, { format: selected });
    }
    if (selected === "mm/dd/yyyy") {
      const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      return match ? parsedDate(rawValue, Number(match[3]), Number(match[1]), Number(match[2]), selected) : dateResult("invalid", rawValue, { format: selected });
    }
    if (selected === "yyyymmdd") {
      const match = raw.match(/^(\d{4})(\d{2})(\d{2})$/);
      return match ? parsedDate(rawValue, Number(match[1]), Number(match[2]), Number(match[3]), selected) : dateResult("invalid", rawValue, { format: selected });
    }
    if (selected === "excel-serial") {
      return excelSerialDate(rawValue, options.excelDateSystem || "1900");
    }
    return dateResult("invalid", rawValue, { format: selected });
  }

  function parsePeriod(rawValue, format = "auto") {
    const raw = normalizeText(rawValue);
    if (!raw) return { status: "missing", rawValue, normalizedPeriod: "", format: "" };
    const selected = format || "auto";
    const asPeriod = (year, month, actualFormat) => {
      if (!Number.isInteger(year) || !Number.isInteger(month) || year < 1900 || year > 9999 || month < 1 || month > 12) {
        return { status: "invalid", rawValue, normalizedPeriod: "", format: actualFormat };
      }
      return { status: "valid", rawValue, normalizedPeriod: `${String(year).padStart(4, "0")}-${pad2(month)}`, format: actualFormat };
    };
    if (selected === "auto") {
      if (/^\d{4}-\d{2}$/.test(raw)) return parsePeriod(raw, "yyyy-mm");
      if (/^\d{6}$/.test(raw)) return parsePeriod(raw, "yyyymm");
      if (/^\d{1,2}\/\d{4}$/.test(raw)) return parsePeriod(raw, "mm/yyyy");
      return { status: "invalid", rawValue, normalizedPeriod: "", format: "auto" };
    }
    if (selected === "yyyy-mm") {
      const match = raw.match(/^(\d{4})-(\d{2})$/);
      return match ? asPeriod(Number(match[1]), Number(match[2]), selected) : { status: "invalid", rawValue, normalizedPeriod: "", format: selected };
    }
    if (selected === "yyyymm") {
      const match = raw.match(/^(\d{4})(\d{2})$/);
      return match ? asPeriod(Number(match[1]), Number(match[2]), selected) : { status: "invalid", rawValue, normalizedPeriod: "", format: selected };
    }
    if (selected === "mm/yyyy") {
      const match = raw.match(/^(\d{1,2})\/(\d{4})$/);
      return match ? asPeriod(Number(match[2]), Number(match[1]), selected) : { status: "invalid", rawValue, normalizedPeriod: "", format: selected };
    }
    return { status: "invalid", rawValue, normalizedPeriod: "", format: selected };
  }

  function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function semanticPolicySignature(policy = {}) {
    return `ch-semantic-policy:${POLICY_VERSION}:${stableJson(policy)}`;
  }

  function defaultSemanticPolicy(policy = {}) {
    return {
      policyVersion: POLICY_VERSION,
      quantity: {
        canonicalField: "consumption_quantity",
        sourceIndex: null,
        sourceKey: "",
        sourceColumn: "",
        numericLocale: "auto",
        scaleSource: "auto",
        sourceScaleFactor: 1,
        userConfirmed: false,
        confirmedAt: "",
        confirmationReason: "",
        ...(policy.quantity || {})
      },
      postingDate: {
        canonicalField: "posting_date",
        sourceIndex: null,
        sourceKey: "",
        sourceColumn: "",
        dateFormat: "auto",
        excelDateSystem: "",
        userConfirmed: false,
        confirmedAt: "",
        confirmationReason: "",
        ...(policy.postingDate || {})
      },
      period: {
        canonicalField: "period",
        sourceIndex: null,
        sourceKey: "",
        sourceColumn: "",
        periodFormat: "auto",
        userConfirmed: false,
        confirmedAt: "",
        confirmationReason: "",
        ...(policy.period || {})
      },
      analysisAsOf: {
        date: "",
        source: "unavailable",
        sourcePackageId: "",
        sourcePackageRevision: null,
        userConfirmed: false,
        confirmedAt: "",
        ...(policy.analysisAsOf || {})
      },
      movementRuleSet: {
        ruleSetId: MOVEMENT_RULE_SET.ruleSetId,
        ruleSetVersion: MOVEMENT_RULE_SET.ruleSetVersion,
        ...(policy.movementRuleSet || {})
      },
      unitPolicy: {
        mode: "token_normalization_only",
        ...(policy.unitPolicy || {})
      },
      reviewConfirmed: Boolean(policy.reviewConfirmed),
      confirmedAt: policy.confirmedAt || ""
    };
  }

  function diagnostic(key, count, severity = "warning", extra = {}) {
    return { key, code: key, severity, count, ...extra };
  }

  function resolveAnalysisAsOf(policy) {
    const candidate = parsePostingDate(policy?.analysisAsOf?.date || "", "yyyy-mm-dd");
    const source = policy?.analysisAsOf?.source;
    if (candidate.status === "valid" && source === "inventory_snapshot") {
      const revision = policy.analysisAsOf.sourcePackageRevision;
      if (policy.analysisAsOf.sourcePackageId && Number.isInteger(revision) && revision > 0) {
        return {
          status: "available",
          date: candidate.normalizedDate,
          source,
          sourcePackageId: policy.analysisAsOf.sourcePackageId,
          sourcePackageRevision: revision
        };
      }
      return { status: "unavailable", date: "", source: "unavailable", reasonCode: "missing_inventory_snapshot_provenance" };
    }
    if (candidate.status === "valid" && source === "user_confirmed") {
      return {
        status: "available",
        date: candidate.normalizedDate,
        source,
        userConfirmed: Boolean(policy.analysisAsOf.userConfirmed),
        confirmedAt: policy.analysisAsOf.confirmedAt || ""
      };
    }
    return { status: "unavailable", date: "", source: "unavailable" };
  }

  function classifyMovementType(value) {
    const movementType = normalizeText(value);
    const rule = MOVEMENT_RULE_SET.rules[movementType] || null;
    return {
      movementType,
      movementSemantic: rule?.semantic || "unknown",
      netSign: Number.isFinite(rule?.netSign) ? rule.netSign : 0,
      ruleSetId: MOVEMENT_RULE_SET.ruleSetId,
      ruleSetVersion: MOVEMENT_RULE_SET.ruleSetVersion
    };
  }

  function exactSourceKey(row = {}) {
    return JSON.stringify(Object.keys(row || {})
      .filter(key => key !== "__sourceRowIndex")
      .sort()
      .map(key => [key, row[key]]));
  }

  function analyzeConsumptionHistorySemantics(input = {}) {
    const sourceRows = cloneData(Array.isArray(input.sourceRows) ? input.sourceRows : []);
    const packageRows = cloneData(Array.isArray(input.normalizedRows) ? input.normalizedRows : []);
    const policy = defaultSemanticPolicy(input.semanticPolicy || {});
    const analysisAsOf = resolveAnalysisAsOf(policy);
    const unitContextsByEntity = new Map();
    const exactCounts = new Map();
    const eventCounts = new Map();
    const looseMovementCounts = new Map();

    packageRows.forEach((row, index) => {
      const source = sourceRows[index] || {};
      exactCounts.set(exactSourceKey(source), (exactCounts.get(exactSourceKey(source)) || 0) + 1);
      const entityKey = `material:${normalizeText(row.material_id)}|plant:${normalizeText(row.plant)}`;
      const unit = normalizedUnit(row.base_unit);
      const context = unitContextsByEntity.get(entityKey) || { units: new Set(), missingCount: 0 };
      if (unit) context.units.add(unit);
      else context.missingCount += 1;
      unitContextsByEntity.set(entityKey, context);
    });

    const semanticRows = packageRows.map((row, index) => {
      const rawPostingDate = normalizeText(row.posting_date);
      const rawPeriod = normalizeText(row.period);
      const posting = parsePostingDate(row.posting_date, policy.postingDate.dateFormat, { excelDateSystem: policy.postingDate.excelDateSystem });
      const period = parsePeriod(row.period, policy.period.periodFormat);
      const hasValidPosting = posting.status === "valid";
      const hasValidPeriod = period.status === "valid";
      const selectedPeriod = hasValidPosting ? posting.normalizedPeriod : period.normalizedPeriod || "";
      const selectedDate = hasValidPosting ? posting.normalizedDate : "";
      const temporalSource = hasValidPosting ? "posting_date" : hasValidPeriod ? "period" : "unavailable";
      const temporalPrecision = hasValidPosting ? "day" : hasValidPeriod ? "month" : "unavailable";
      const temporalConsistencyStatus = posting.status === "valid" && period.status === "valid" && posting.normalizedPeriod !== period.normalizedPeriod
        ? "conflict"
        : "consistent";
      const isFutureMovement = analysisAsOf.status === "available" && selectedDate && selectedDate > analysisAsOf.date;
      const temporalDiagnosticCodes = [
        ...(temporalConsistencyStatus === "conflict" ? ["posting_period_conflict"] : []),
        ...(isFutureMovement ? ["future_movement"] : []),
        ...(posting.status === "ambiguous" || posting.status === "review_required" ? ["temporal_review_required"] : []),
        ...(!rawPostingDate && !rawPeriod ? ["temporal_missing"] : []),
        ...(rawPostingDate || rawPeriod ? (!hasValidPosting && !hasValidPeriod && posting.status !== "ambiguous" && posting.status !== "review_required" ? ["temporal_invalid"] : []) : [])
      ];
      const temporalParseStatus = isFutureMovement
        ? "future"
        : temporalConsistencyStatus === "conflict" || posting.status === "ambiguous" || posting.status === "review_required"
          ? "ambiguous"
          : hasValidPosting || hasValidPeriod
            ? "valid"
            : !rawPostingDate && !rawPeriod
              ? "missing"
              : "invalid";
      const temporalStatus = temporalParseStatus === "valid" ? "valid"
        : temporalParseStatus === "missing" || temporalParseStatus === "invalid" ? "invalid" : "review_required";
      const movement = classifyMovementType(row.movement_type);
      const quantityParse = consumptionQuantityParse(row);
      const signedQuantity = quantityParse.status === "valid" && Number.isFinite(quantityParse.normalizedValue)
        ? quantityParse.normalizedValue
        : null;
      const absoluteQuantity = signedQuantity === null ? null : Math.abs(signedQuantity);
      const netQuantity = absoluteQuantity === null
        ? null
        : movement.netSign
          ? absoluteQuantity * movement.netSign
          : 0;
      const normalizedBaseUnit = normalizedUnit(row.base_unit);
      const entityKey = `material:${normalizeText(row.material_id)}|plant:${normalizeText(row.plant)}`;
      const unitContext = unitContextsByEntity.get(entityKey) || { units: new Set(), missingCount: 0 };
      const unitStatus = unitContext.units.size > 1
        ? "multiple_for_entity"
        : unitContext.missingCount > 0
          ? "missing_for_entity"
          : normalizedBaseUnit
            ? "single"
            : "missing";
      const aggregationBlockerCodes = [
        ...temporalDiagnosticCodes,
        ...(movement.movementSemantic === "unknown" ? ["unknown_movement_type"] : []),
        ...(quantityParse.status === "missing" ? ["missing_consumption_quantity"] : []),
        ...(!["valid", "missing"].includes(quantityParse.status) ? ["invalid_consumption_quantity"] : []),
        ...(!normalizedBaseUnit ? ["missing_unit"] : []),
        ...(unitContext.missingCount > 0 ? ["missing_unit_for_entity"] : []),
        ...(unitContext.units.size > 1 ? ["multiple_units_for_entity"] : [])
      ];
      const rowDiagnosticCodes = [...new Set(aggregationBlockerCodes)];
      const aggregationEligible = Boolean(quantityParse.status === "valid"
        && Number.isFinite(signedQuantity)
        && normalizedBaseUnit
        && unitContext.units.size === 1
        && unitContext.missingCount === 0
        && temporalParseStatus === "valid"
        && temporalConsistencyStatus === "consistent"
        && !isFutureMovement
        && movement.movementSemantic !== "unknown");
      const temporalReferenceKey = selectedDate || selectedPeriod ? `period:${selectedPeriod}|date:${selectedDate}` : "temporal:unresolved";
      const eventParts = [
        entityKey,
        temporalReferenceKey,
        `document:${normalizeText(row.document_id)}`,
        `item:${normalizeText(row.document_item)}`,
        `movement:${movement.movementType}`,
        `qty:${Number.isFinite(signedQuantity) ? signedQuantity : ""}`,
        `unit:${normalizedBaseUnit}`
      ];
      const eventIdentityKey = eventParts.join("|");
      const eventIdentityStatus = row.document_id || row.document_item ? "complete" : "partial";
      const looseKey = [
        entityKey,
        temporalReferenceKey,
        `movement:${movement.movementType}`,
        `unit:${normalizedBaseUnit}`
      ].join("|");
      eventCounts.set(eventIdentityKey, (eventCounts.get(eventIdentityKey) || 0) + 1);
      looseMovementCounts.set(looseKey, (looseMovementCounts.get(looseKey) || 0) + 1);
      return {
        ...row,
        raw_posting_date: rawPostingDate,
        raw_period: rawPeriod,
        temporal_source: temporalSource,
        normalized_posting_date: selectedDate || null,
        normalized_period: selectedPeriod || null,
        temporal_precision: temporalPrecision,
        temporal_parse_status: temporalParseStatus,
        temporal_diagnostic_codes: rowDiagnosticCodes,
        temporal_status: temporalStatus,
        posting_date_parse_status: posting.status,
        period_parse_status: period.status,
        consumption_quantity_parse_status: quantityParse.status,
        consumption_quantity_limitation_codes: quantityParse.status === "valid"
          ? []
          : [quantityParse.status === "missing" ? "missing_consumption_quantity" : "invalid_consumption_quantity"],
        temporal_consistency_status: temporalConsistencyStatus,
        temporal_reference_key: temporalReferenceKey,
        movement_type_normalized: movement.movementType,
        movement_semantic: movement.movementSemantic,
        movement_rule_set_id: movement.ruleSetId,
        movement_rule_set_version: movement.ruleSetVersion,
        signed_consumption_quantity: signedQuantity,
        absolute_consumption_quantity: absoluteQuantity,
        net_consumption_quantity: netQuantity,
        normalized_base_unit: normalizedBaseUnit,
        unit_status: unitStatus,
        aggregation_eligible: aggregationEligible,
        aggregation_blocker_codes: rowDiagnosticCodes,
        entity_key: entityKey,
        event_identity_key: eventIdentityKey,
        event_identity_status: eventIdentityStatus,
        unit_context_key: `${entityKey}|unit:${normalizedBaseUnit || "missing"}`,
        duplicate_semantic: "unique",
        __semanticLooseKey: looseKey,
        __exactSourceKey: exactSourceKey(sourceRows[index] || {})
      };
    }).map(row => {
      let duplicateSemantic = "unique";
      if ((exactCounts.get(row.__exactSourceKey) || 0) > 1) duplicateSemantic = "exact_source_duplicate";
      else if ((eventCounts.get(row.event_identity_key) || 0) > 1 && row.event_identity_status !== "partial") duplicateSemantic = "business_duplicate_candidate";
      else if ((looseMovementCounts.get(row.__semanticLooseKey) || 0) > 1) duplicateSemantic = "legitimate_repeat";
      const { __semanticLooseKey, __exactSourceKey, ...cleanRow } = row;
      return { ...cleanRow, duplicate_semantic: duplicateSemantic };
    });

    const temporalInvalidCount = semanticRows.filter(row => row.temporal_status === "invalid").length;
    const temporalReviewCount = semanticRows.filter(row => row.temporal_status === "review_required").length;
    const movementUnknownCount = semanticRows.filter(row => row.movement_semantic === "unknown").length;
    const futureMovementCount = analysisAsOf.status === "available"
      ? semanticRows.filter(row => row.normalized_posting_date && row.normalized_posting_date > analysisAsOf.date).length
      : 0;
    const postingPeriodConflictCount = semanticRows.filter(row => row.temporal_consistency_status === "conflict").length;
    const missingUnitCount = semanticRows.filter(row => !row.normalized_base_unit).length;
    const missingUnitEntityCount = [...unitContextsByEntity.values()].filter(context => context.missingCount > 0).length;
    const multipleUnitEntityCount = [...unitContextsByEntity.values()].filter(context => context.units.size > 1).length;
    const missingQuantityCount = semanticRows.filter(row => row.consumption_quantity_parse_status === "missing").length;
    const invalidQuantityCount = semanticRows.filter(row => !["valid", "missing"].includes(row.consumption_quantity_parse_status)).length;
    const businessDuplicateCandidateCount = semanticRows.filter(row => row.duplicate_semantic === "business_duplicate_candidate").length;
    const exactDuplicateCount = semanticRows.filter(row => row.duplicate_semantic === "exact_source_duplicate").length;
    const legitimateRepeatCount = semanticRows.filter(row => row.duplicate_semantic === "legitimate_repeat").length;
    const historyCoverageEnd = semanticRows
      .map(row => row.normalized_posting_date || row.normalized_period)
      .filter(Boolean)
      .sort()
      .at(-1) || "";
    const rowCount = semanticRows.length;
    const coverageRatio = count => rowCount ? count / rowCount : 0;
    const temporalValidCount = semanticRows.filter(row => row.temporal_parse_status === "valid").length;
    const movementKnownCount = semanticRows.filter(row => row.movement_semantic !== "unknown").length;
    const unitUsableCount = semanticRows.filter(row => row.unit_status === "single").length;
    const eventCompleteCount = semanticRows.filter(row => row.event_identity_status === "complete").length;
    const diagnostics = [
      ...(temporalInvalidCount ? [diagnostic("historyTemporalInvalid", temporalInvalidCount, "warning")] : []),
      ...(temporalReviewCount ? [diagnostic("historyTemporalReviewRequired", temporalReviewCount, "warning")] : []),
      ...(postingPeriodConflictCount ? [diagnostic("historyPostingPeriodConflict", postingPeriodConflictCount, "warning")] : []),
      ...(futureMovementCount ? [diagnostic("historyFutureMovements", futureMovementCount, "warning", { analysisAsOfDate: analysisAsOf.date })] : []),
      ...(movementUnknownCount ? [diagnostic("historyUnknownMovementTypes", movementUnknownCount, "warning")] : []),
      ...(missingUnitCount ? [diagnostic("historyMissingUnits", missingUnitCount, "warning")] : []),
      ...(missingUnitEntityCount ? [diagnostic("historyMissingUnitsForEntity", missingUnitEntityCount, "warning")] : []),
      ...(multipleUnitEntityCount ? [diagnostic("historyMultipleUnitsForEntity", multipleUnitEntityCount, "warning")] : []),
      ...(missingQuantityCount ? [diagnostic("historyMissingConsumptionQuantities", missingQuantityCount, "warning")] : []),
      ...(invalidQuantityCount ? [diagnostic("historyInvalidConsumptionQuantities", invalidQuantityCount, "warning")] : []),
      ...(businessDuplicateCandidateCount ? [diagnostic("historyBusinessDuplicateCandidates", businessDuplicateCandidateCount, "warning")] : []),
      ...(exactDuplicateCount ? [diagnostic("historyExactSourceDuplicates", exactDuplicateCount, "warning")] : []),
      ...(legitimateRepeatCount ? [diagnostic("historyLegitimateRepeatedMovements", legitimateRepeatCount, "info")] : []),
      ...(analysisAsOf.status === "unavailable" ? [diagnostic("historyAnalysisAsOfUnavailable", 1, "info")] : [])
    ];
    const readinessStatus = temporalInvalidCount || temporalReviewCount
      ? "review_required"
      : diagnostics.some(item => item.severity === "warning")
        ? "limited"
        : "ready";
    const historyReadiness = {
      policyVersion: READINESS_POLICY_VERSION,
      status: readinessStatus,
      rowCount,
      readyRowCount: semanticRows.filter(row => row.temporal_status === "valid" && row.aggregation_eligible).length,
      diagnosticCount: diagnostics.length,
      analysisAsOf,
      historyCoverageEnd,
      temporalCoverageRatio: coverageRatio(temporalValidCount),
      movementSemanticsCoverageRatio: coverageRatio(movementKnownCount),
      unitCoverageRatio: coverageRatio(unitUsableCount),
      quantityCoverageRatio: coverageRatio(rowCount - missingQuantityCount - invalidQuantityCount),
      eventIdentityCoverageRatio: coverageRatio(eventCompleteCount),
      blockerCount: diagnostics.filter(item => item.severity === "error").length,
      limitationCount: diagnostics.filter(item => item.severity !== "error").length
    };
    return {
      semanticRows,
      semanticPolicy: policy,
      semanticPolicySignature: semanticPolicySignature(policy),
      movementRuleSet: {
        ruleSetId: MOVEMENT_RULE_SET.ruleSetId,
        ruleSetVersion: MOVEMENT_RULE_SET.ruleSetVersion
      },
      historyReadiness,
      diagnostics,
      counts: {
        temporalInvalidCount,
        temporalReviewCount,
        movementUnknownCount,
        futureMovementCount,
        postingPeriodConflictCount,
        missingUnitCount,
        missingUnitEntityCount,
        multipleUnitEntityCount,
        missingQuantityCount,
        invalidQuantityCount,
        businessDuplicateCandidateCount,
        exactDuplicateCount,
        legitimateRepeatCount
      }
    };
  }

  root.data.consumptionHistorySemanticsEngine = Object.freeze({
    version: "1",
    POLICY_VERSION,
    READINESS_POLICY_VERSION,
    MOVEMENT_RULE_SET,
    defaultSemanticPolicy,
    semanticPolicySignature,
    parsePostingDate,
    parsePeriod,
    classifyMovementType,
    normalizedUnit,
    analyzeConsumptionHistorySemantics
  });
})(window);
