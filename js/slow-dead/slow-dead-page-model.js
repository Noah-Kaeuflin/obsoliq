(function registerSlowDeadPageModel(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.slowDead = root.slowDead || {};
  const aggregateNumericValues = root.core?.valueUtils?.aggregateNumericValues;

  if (typeof aggregateNumericValues !== "function") {
    throw new Error("ObsoliQ Slow / Dead Page Model requires strict numeric aggregation utilities.");
  }

  const CONDITION_CODES = Object.freeze([
    "insufficient_evidence",
    "intermittent_expected",
    "slow_moving_candidate",
    "non_moving_candidate",
    "dead_stock_candidate",
    "strategic_reserve"
  ]);

  const DEFAULT_FILTERS = Object.freeze({
    search: "",
    condition: "all",
    plant: "all",
    evidenceStrength: "all",
    conditionConfidence: "all",
    recoveryEligibility: "all",
    owner: "all",
    relationshipState: "all",
    requiredPackage: "all",
    missingEvidence: "all"
  });

  const DEFAULT_SORT = Object.freeze({ key: "default", direction: "asc" });
  const DEFAULT_PAGE_SIZE = 25;
  const PAGE_SIZES = Object.freeze([25, 50, 100]);

  const CONDITION_SORT_RANK = Object.freeze({
    dead_stock_candidate: 0,
    non_moving_candidate: 1,
    slow_moving_candidate: 2,
    insufficient_evidence: 3,
    intermittent_expected: 4,
    strategic_reserve: 5
  });

  const CONDITION_DISPLAY_RANK = Object.freeze({
    dead_stock_candidate: 0,
    non_moving_candidate: 1,
    slow_moving_candidate: 2,
    intermittent_expected: 3,
    strategic_reserve: 4,
    insufficient_evidence: 5
  });

  const EVIDENCE_STRENGTH_RANK = Object.freeze({
    high: 0,
    medium: 1,
    low: 2,
    insufficient: 3,
    not_applicable: 4
  });

  const CONFIDENCE_RANK = Object.freeze({
    high: 0,
    medium: 1,
    low: 2,
    unavailable: 3,
    not_applicable: 4
  });

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(key => deepFreeze(value[key]));
    return Object.freeze(value);
  }

  function text(value) {
    return String(value ?? "").trim();
  }

  function finiteNumber(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "string" && !text(value)) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function finiteNumberOrNull(value) {
    const number = finiteNumber(value);
    return number !== null ? number : null;
  }

  function normalizeFilterValue(value, fallback = "all") {
    const normalized = text(value);
    return normalized ? normalized : fallback;
  }

  function normalizeFilters(filters = {}) {
    return {
      ...DEFAULT_FILTERS,
      ...Object.fromEntries(Object.keys(DEFAULT_FILTERS).map(key => [key, normalizeFilterValue(filters[key], DEFAULT_FILTERS[key])]))
    };
  }

  function normalizeSort(sort = {}) {
    const key = text(sort.key) || DEFAULT_SORT.key;
    const direction = text(sort.direction).toLowerCase() === "desc" ? "desc" : "asc";
    return { key, direction };
  }

  function normalizePageSize(value) {
    const size = Number(value);
    return PAGE_SIZES.includes(size) ? size : DEFAULT_PAGE_SIZE;
  }

  function normalizePage(value) {
    const page = Math.floor(Number(value));
    return Number.isFinite(page) && page > 0 ? page : 1;
  }

  function list(value) {
    return Array.isArray(value) ? value : [];
  }

  function unique(values = []) {
    return [...new Set(values.map(value => text(value)).filter(Boolean))];
  }

  function evidenceRecords(caseRecord = {}) {
    return [
      ...list(caseRecord.positive_evidence),
      ...list(caseRecord.counter_evidence)
    ];
  }

  function evidenceMetric(caseRecord = {}, keys = []) {
    const keySet = new Set(keys);
    for (const record of evidenceRecords(caseRecord)) {
      const value = record?.value;
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      for (const key of keySet) {
        if (Object.prototype.hasOwnProperty.call(value, key)) return value[key];
      }
    }
    return null;
  }

  function relationshipState(caseRecord = {}) {
    return caseRecord.relationship_state
      || caseRecord.provenance?.relationshipMatchType
      || caseRecord.provenance?.relationship_match_type
      || "";
  }

  function ownerFunction(caseRecord = {}) {
    return text(caseRecord.owner_function || caseRecord.ownerFunction || caseRecord.owner || "");
  }

  function ownerReference(caseRecord = {}) {
    return text(caseRecord.owner_reference || caseRecord.ownerReference || "");
  }

  function inventoryExposureValue(caseRecord = {}) {
    return finiteNumberOrNull(caseRecord.stock_value);
  }

  function serializeCaseKey(caseRecord = {}) {
    return text(caseRecord.inventory_entity_key || caseRecord.case_id || caseRecord.case_fingerprint);
  }

  function deduplicateCases(cases = []) {
    const seen = new Set();
    const result = [];
    list(cases).forEach(caseRecord => {
      const key = serializeCaseKey(caseRecord);
      if (!key || seen.has(key)) return;
      seen.add(key);
      result.push(cloneData(caseRecord));
    });
    return result;
  }

  function inventoryRowKeys(caseRecord = {}) {
    return list(caseRecord.inventory_row_keys).map(text).filter(Boolean);
  }

  function entityKeyFor(record = {}) {
    return text(record.inventory_entity_key || record.inventoryEntityKey);
  }

  function materialPlantKeyFor(record = {}) {
    const material = text(record.material_id || record.materialId);
    const plant = text(record.plant);
    return material && plant ? `${material}::${plant}` : "";
  }

  function materialIdFor(record = {}) {
    return text(record.material_id || record.materialId);
  }

  function mapCounts(records = [], keyGetter) {
    const counts = new Map();
    records.forEach(record => {
      const key = keyGetter(record);
      if (!key) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }

  function linkedActionTargets(input = {}) {
    const targets = list(input.linkedActionTargets).map(target => ({
      inventory_row_key: text(target.inventory_row_key || target.inventoryRowKey),
      inventory_row_keys: list(target.inventory_row_keys).map(text).filter(Boolean),
      inventory_entity_key: entityKeyFor(target),
      material_id: materialIdFor(target),
      plant: text(target.plant)
    }));
    const legacyMaterials = input.linkedActionMaterials || input.linkedActionMaterialIds || [];
    const legacyTargets = legacyMaterials instanceof Set
      ? [...legacyMaterials].map(value => ({ material_id: text(value) }))
      : list(legacyMaterials).map(value => ({ material_id: text(value) }));
    return [...targets, ...legacyTargets].filter(target => (
      target.inventory_row_key
      || target.inventory_row_keys?.length
      || target.inventory_entity_key
      || target.material_id
    ));
  }

  function createLinkedActionContext(input = {}, caseRecords = []) {
    const targets = linkedActionTargets(input);
    const targetRowKeys = new Set(targets.flatMap(target => [
      target.inventory_row_key,
      ...list(target.inventory_row_keys)
    ].map(text).filter(Boolean)));
    const targetEntityKeys = new Set(targets.map(entityKeyFor).filter(Boolean));
    const targetMaterialPlantKeys = new Set(targets.map(materialPlantKeyFor).filter(Boolean));
    return {
      targetRowKeys,
      targetEntityKeys,
      targetMaterialPlantKeys,
      targetMaterialCounts: mapCounts(targets, materialIdFor),
      caseMaterialCounts: mapCounts(caseRecords, materialIdFor)
    };
  }

  function caseHasLinkedAction(caseRecord = {}, context = {}) {
    if (inventoryRowKeys(caseRecord).some(key => context.targetRowKeys?.has(key))) return true;
    const entityKey = entityKeyFor(caseRecord);
    if (entityKey && context.targetEntityKeys?.has(entityKey)) return true;
    const materialPlantKey = materialPlantKeyFor(caseRecord);
    if (materialPlantKey && context.targetMaterialPlantKeys?.has(materialPlantKey)) return true;
    const material = materialIdFor(caseRecord);
    const plant = text(caseRecord.plant);
    if (!material || plant) return false;
    return (context.targetMaterialCounts?.get(material) || 0) === 1
      && (context.caseMaterialCounts?.get(material) || 0) === 1;
  }

  function createCaseView(caseRecord = {}, context = {}) {
    const exposureValue = inventoryExposureValue(caseRecord);
    const stockQuantity = finiteNumber(caseRecord.stock_quantity);
    const recoveryEligibility = caseRecord.recovery_case_eligibility?.eligibility || "";
    const requiredPackages = unique([
      ...list(caseRecord.required_data_packages),
      ...list(caseRecord.action_eligibility).flatMap(item => list(item.required_data_packages))
    ]);
    const missingEvidence = unique(caseRecord.missing_evidence || []);
    const limitationCodes = unique(caseRecord.limitation_codes || []);
    const relationship = relationshipState(caseRecord);
    const conditionCode = CONDITION_CODES.includes(caseRecord.condition_code) ? caseRecord.condition_code : text(caseRecord.condition_code);

    return {
      ...cloneData(caseRecord),
      condition_code: conditionCode,
      inventory_exposure_value: exposureValue,
      inventory_exposure_missing: exposureValue === null,
      stock_quantity: stockQuantity,
      stock_unit: text(caseRecord.stock_unit || caseRecord.base_unit),
      owner_function: ownerFunction(caseRecord),
      owner_reference: ownerReference(caseRecord),
      relationship_state: relationship,
      recovery_eligibility: recoveryEligibility,
      recovery_case_eligibility_value: recoveryEligibility,
      required_data_packages: requiredPackages,
      missing_evidence: missingEvidence,
      limitation_codes: limitationCodes,
      months_since_last_consumption: finiteNumber(caseRecord.months_since_last_consumption ?? evidenceMetric(caseRecord, ["monthsSince", "months_since_last_consumption"])),
      last_consumption: text(caseRecord.last_consumption_date || caseRecord.last_consumption_period || evidenceMetric(caseRecord, ["last_consumption_date", "last_consumption_period"])),
      net_consumption_3m: finiteNumber(caseRecord.net_consumption_quantity_3m ?? evidenceMetric(caseRecord, ["net3", "net_consumption_quantity_3m"])),
      net_consumption_6m: finiteNumber(caseRecord.net_consumption_quantity_6m ?? evidenceMetric(caseRecord, ["net6", "net_consumption_quantity_6m"])),
      net_consumption_12m: finiteNumber(caseRecord.net_consumption_quantity_12m ?? evidenceMetric(caseRecord, ["net12", "net_consumption_quantity_12m"])),
      average_monthly_consumption_12m: finiteNumber(caseRecord.average_monthly_consumption_12m ?? evidenceMetric(caseRecord, ["average_monthly_consumption_12m"])),
      active_consumption_months_12m: finiteNumber(caseRecord.active_consumption_months_12m ?? evidenceMetric(caseRecord, ["activeMonths", "active_consumption_months_12m"])),
      movement_frequency_12m: finiteNumber(caseRecord.movement_frequency_12m ?? evidenceMetric(caseRecord, ["movement_frequency_12m"])),
      intermittency_ratio_12m: finiteNumber(caseRecord.intermittency_ratio_12m ?? evidenceMetric(caseRecord, ["intermittency", "intermittency_ratio_12m"])),
      inventory_coverage_months: finiteNumber(caseRecord.inventory_coverage_months ?? evidenceMetric(caseRecord, ["coverage", "inventory_coverage_months"])),
      history_completeness: finiteNumber(caseRecord.history_completeness ?? evidenceMetric(caseRecord, ["completeness", "history_completeness"])),
      history_coverage_months: finiteNumber(caseRecord.history_coverage_months ?? evidenceMetric(caseRecord, ["history_coverage_months"])),
      has_linked_action: caseHasLinkedAction(caseRecord, context)
    };
  }

  function caseMatchesSearch(caseRecord = {}, search = "") {
    const query = text(search).toLowerCase();
    if (!query) return true;
    return [
      caseRecord.case_id,
      caseRecord.inventory_entity_key,
      caseRecord.material_id,
      caseRecord.material_description,
      caseRecord.plant,
      caseRecord.profit_center,
      caseRecord.program,
      caseRecord.condition_code,
      caseRecord.owner_function,
      caseRecord.owner_reference,
      ...list(caseRecord.inventory_row_keys)
    ].join(" ").toLowerCase().includes(query);
  }

  function equalsOrAll(value, selected) {
    return selected === "all" || text(value) === selected;
  }

  function caseMatchesFilters(caseRecord = {}, filters = {}) {
    if (!caseMatchesSearch(caseRecord, filters.search)) return false;
    if (!equalsOrAll(caseRecord.condition_code, filters.condition)) return false;
    if (!equalsOrAll(caseRecord.plant, filters.plant)) return false;
    if (!equalsOrAll(caseRecord.evidence_strength, filters.evidenceStrength)) return false;
    if (!equalsOrAll(caseRecord.condition_confidence, filters.conditionConfidence)) return false;
    if (!equalsOrAll(caseRecord.recovery_eligibility, filters.recoveryEligibility)) return false;
    if (!equalsOrAll(caseRecord.owner_function || "unassigned", filters.owner)) return false;
    if (!equalsOrAll(caseRecord.relationship_state || "unavailable", filters.relationshipState)) return false;
    if (filters.requiredPackage !== "all" && !list(caseRecord.required_data_packages).includes(filters.requiredPackage)) return false;
    if (filters.missingEvidence !== "all" && !list(caseRecord.missing_evidence).includes(filters.missingEvidence)) return false;
    return true;
  }

  function optionCount(cases = [], valueGetter) {
    const counts = new Map();
    cases.forEach(item => {
      const value = text(valueGetter(item));
      if (!value) return;
      counts.set(value, (counts.get(value) || 0) + 1);
    });
    return counts;
  }

  function optionList(cases = [], valueGetter, options = {}) {
    const counts = optionCount(cases, valueGetter);
    const values = options.values || [...counts.keys()];
    return values
      .map(value => ({ value, count: counts.get(value) || 0 }))
      .filter(option => options.includeZero || option.count > 0)
      .sort((a, b) => {
        if (options.conditionOrder) return (CONDITION_DISPLAY_RANK[a.value] ?? 99) - (CONDITION_DISPLAY_RANK[b.value] ?? 99);
        return a.value.localeCompare(b.value);
      });
  }

  function exposureAggregate(cases = [], allowPartial = false) {
    return aggregateNumericValues(cases, {
      valueAccessor: item => item.inventory_exposure_value,
      parseResultAccessor: item => item.inventory_exposure_missing
        ? { status: "missing", normalizedValue: null }
        : { status: "valid", normalizedValue: finiteNumberOrNull(item.inventory_exposure_value) },
      fieldDefinition: { type: "currency", fieldKey: "inventory_exposure_value" },
      allowPartial
    });
  }

  function exposureSummary(cases = []) {
    const aggregate = exposureAggregate(cases);
    const availableAggregate = exposureAggregate(cases, true);
    return {
      inventoryExposureValue: aggregate.value,
      inventoryExposureAvailableValue: availableAggregate.value,
      inventoryExposureAggregate: aggregate,
      inventoryExposureAvailableCaseCount: aggregate.validCount,
      inventoryExposureUnavailableCaseCount: aggregate.totalCount - aggregate.validCount,
      missingExposureCount: aggregate.missingCount + aggregate.invalidCount + aggregate.ambiguousCount
    };
  }

  function conditionSummary(cases = []) {
    return CONDITION_CODES.map(code => {
      const rows = cases.filter(item => item.condition_code === code);
      return {
        code,
        count: rows.length,
        ...exposureSummary(rows)
      };
    });
  }

  function portfolioSummary(cases = []) {
    const groups = [
      { key: "slow_moving_candidate", conditions: ["slow_moving_candidate"] },
      { key: "non_moving_candidate", conditions: ["non_moving_candidate"] },
      { key: "dead_stock_candidate", conditions: ["dead_stock_candidate"] },
      { key: "protected_monitor", conditions: ["intermittent_expected", "strategic_reserve"] },
      { key: "insufficient_evidence", conditions: ["insufficient_evidence"] }
    ];
    const portfolioExposure = exposureSummary(cases);
    return {
      caseCount: cases.length,
      ...portfolioExposure,
      conditionSummary: conditionSummary(cases),
      primaryItems: groups.map(group => {
        const rows = cases.filter(item => group.conditions.includes(item.condition_code));
        return {
          key: group.key,
          conditions: [...group.conditions],
          count: rows.length,
          ...exposureSummary(rows)
        };
      })
    };
  }

  function defaultCompare(a, b) {
    return (CONDITION_SORT_RANK[a.condition_code] ?? 99) - (CONDITION_SORT_RANK[b.condition_code] ?? 99)
      || (finiteNumber(b.inventory_exposure_value) ?? -1) - (finiteNumber(a.inventory_exposure_value) ?? -1)
      || (CONFIDENCE_RANK[a.condition_confidence] ?? 99) - (CONFIDENCE_RANK[b.condition_confidence] ?? 99)
      || (EVIDENCE_STRENGTH_RANK[a.evidence_strength] ?? 99) - (EVIDENCE_STRENGTH_RANK[b.evidence_strength] ?? 99)
      || text(a.material_id).localeCompare(text(b.material_id))
      || text(a.plant).localeCompare(text(b.plant))
      || text(a.case_id).localeCompare(text(b.case_id));
  }

  function sortValue(caseRecord = {}, key = "") {
    if (key === "condition") return CONDITION_SORT_RANK[caseRecord.condition_code] ?? 99;
    if (key === "inventory_exposure_value") return finiteNumber(caseRecord.inventory_exposure_value) ?? -1;
    if (key === "months_since_last_consumption") return finiteNumber(caseRecord.months_since_last_consumption) ?? -1;
    if (key === "net_consumption_12m") return finiteNumber(caseRecord.net_consumption_12m) ?? -1;
    if (key === "history_completeness") return finiteNumber(caseRecord.history_completeness) ?? -1;
    if (key === "evidence_strength") return EVIDENCE_STRENGTH_RANK[caseRecord.evidence_strength] ?? 99;
    if (key === "condition_confidence") return CONFIDENCE_RANK[caseRecord.condition_confidence] ?? 99;
    if (key === "owner_function") return text(caseRecord.owner_function || "unassigned").toLowerCase();
    if (key === "recovery_eligibility") return text(caseRecord.recovery_eligibility).toLowerCase();
    return text(caseRecord[key]).toLowerCase();
  }

  function compareCases(a, b, sort = DEFAULT_SORT) {
    if (sort.key === "default") return defaultCompare(a, b);
    const aValue = sortValue(a, sort.key);
    const bValue = sortValue(b, sort.key);
    let result = 0;
    if (typeof aValue === "number" && typeof bValue === "number") result = aValue - bValue;
    else result = String(aValue).localeCompare(String(bValue));
    return sort.direction === "desc" ? -result : result;
  }

  function activeRuntimeResult(runtimeState = {}) {
    return ["available", "limited"].includes(runtimeState?.status) ? runtimeState.result || null : null;
  }

  function runtimeCases(runtimeState = {}) {
    return list(activeRuntimeResult(runtimeState)?.cases);
  }

  function createEmptyState(runtimeState = {}, caseCount = 0, filteredCount = 0) {
    const status = runtimeState?.status || "not_calculated";
    if (["available", "limited"].includes(status) && caseCount && !filteredCount) return { key: "no_filtered_cases", severity: "info" };
    if (["available", "limited"].includes(status) && !caseCount) return { key: "no_cases", severity: "info" };
    return { key: status, severity: status === "error" ? "error" : "info" };
  }

  function createSlowDeadPageModel(input = {}) {
    const runtimeState = cloneData(input.runtimeState || {});
    const caseRecords = deduplicateCases(runtimeCases(runtimeState));
    const linkedActionContext = createLinkedActionContext(input, caseRecords);
    const allCases = caseRecords
      .map(caseRecord => createCaseView(caseRecord, linkedActionContext))
      .sort(defaultCompare);
    const filters = normalizeFilters(input.filters || {});
    const sort = normalizeSort(input.sort || {});
    const filteredCases = allCases
      .filter(caseRecord => caseMatchesFilters(caseRecord, filters))
      .sort((a, b) => compareCases(a, b, sort));
    const pageSize = normalizePageSize(input.pageSize);
    const totalPages = Math.max(1, Math.ceil(filteredCases.length / pageSize));
    const page = Math.min(normalizePage(input.page), totalPages);
    const pageStart = (page - 1) * pageSize;
    const pageCases = filteredCases.slice(pageStart, pageStart + pageSize);
    const selectedCaseIdInput = text(input.selectedCaseId);
    const selectedCase = filteredCases.find(item => item.case_id === selectedCaseIdInput)
      || pageCases[0]
      || filteredCases[0]
      || null;

    return deepFreeze({
      runtimeStatus: runtimeState?.status || "not_calculated",
      reasonCode: runtimeState?.reasonCode || runtimeState?.reason || "",
      limitationCodes: unique(runtimeState?.limitationCodes || []),
      errorCode: runtimeState?.errorCode || "",
      errorMessage: runtimeState?.errorMessage || "",
      errorSource: runtimeState?.errorSource || "",
      inputSignature: runtimeState?.inputSignature || "",
      completedInputSignature: runtimeState?.completedInputSignature || "",
      historicalMetricsInputSignature: runtimeState?.historicalMetricsInputSignature || "",
      buildCount: Number(runtimeState?.buildCount || 0),
      generation: Number(runtimeState?.generation || 0),
      requestedAt: runtimeState?.requestedAt || "",
      completedAt: runtimeState?.completedAt || "",
      updatedAt: runtimeState?.updatedAt || "",
      evaluatedAt: activeRuntimeResult(runtimeState)?.evaluatedAt || runtimeState?.completedAt || "",
      portfolioSummary: portfolioSummary(allCases),
      filteredSummary: portfolioSummary(filteredCases),
      conditionOptions: optionList(allCases, item => item.condition_code, { values: CONDITION_CODES, includeZero: true, conditionOrder: true }),
      plantOptions: optionList(allCases, item => item.plant),
      evidenceStrengthOptions: optionList(allCases, item => item.evidence_strength),
      conditionConfidenceOptions: optionList(allCases, item => item.condition_confidence),
      recoveryEligibilityOptions: optionList(allCases, item => item.recovery_eligibility),
      ownerOptions: optionList(allCases, item => item.owner_function || "unassigned"),
      relationshipStateOptions: optionList(allCases, item => item.relationship_state || "unavailable"),
      requiredPackageOptions: optionList(allCases.flatMap(item => list(item.required_data_packages).map(value => ({ value }))), item => item.value),
      missingEvidenceOptions: optionList(allCases.flatMap(item => list(item.missing_evidence).map(value => ({ value }))), item => item.value),
      filters,
      sort,
      allCases,
      filteredCases,
      pageCases,
      page,
      pageSize,
      pageSizeOptions: [...PAGE_SIZES],
      totalPages,
      totalCases: allCases.length,
      filteredCaseCount: filteredCases.length,
      selectedCaseId: selectedCase?.case_id || "",
      selectedCase,
      emptyState: createEmptyState(runtimeState, allCases.length, filteredCases.length)
    });
  }

  root.slowDead.pageModel = Object.freeze({
    version: "1",
    CONDITION_CODES,
    DEFAULT_FILTERS,
    DEFAULT_SORT,
    PAGE_SIZES,
    createCaseView,
    createSlowDeadPageModel
  });
})(window);
