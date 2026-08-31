(function registerInventoryRiskPageModel(global) {
  "use strict";

  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.inventoryRisks = root.inventoryRisks || {};
  const contract = root.inventoryRisks.caseContract;
  const portfolioService = root.inventoryRisks.portfolioService;
  if (!contract || !portfolioService) throw new Error("Inventory Risk Page Model requires the Case Contract and Portfolio Service.");

  const VERSION = "IR-01C-PAGE-MODEL-1";
  const SEGMENTS = Object.freeze(["all", "excess_demand", "slow_dead", "blocked_quality", "prioritized"]);
  const DEFAULT_FILTERS = Object.freeze({
    search: "",
    plant: "all",
    program: "all",
    owner: "all",
    familySubtype: "all",
    priority: "all",
    evidenceStatus: "all"
  });

  function normalizeState(state = {}) {
    const segment = SEGMENTS.includes(state.segment) ? state.segment : "all";
    return {
      segment,
      filters: { ...DEFAULT_FILTERS, ...(state.filters || {}) },
      sort: {
        key: ["family", "priority", "value", "material", "owner", "evidence"].includes(state.sort?.key) ? state.sort.key : "priority",
        direction: state.sort?.direction === "desc" ? "desc" : "asc"
      },
      page: Math.max(1, Number(state.page) || 1),
      pageSize: [10, 25, 50, 100].includes(Number(state.pageSize)) ? Number(state.pageSize) : 25,
      selectedCaseId: contract.text(state.selectedCaseId),
      requireExactSelection: state.requireExactSelection === true
    };
  }

  function segmentRows(runtime = {}, segment = "all") {
    if (segment === "all") return runtime.portfolioCases || [];
    if (segment === "prioritized") return (runtime.portfolioCases || []).filter(item => ["critical", "high"].includes(item.priority));
    return (runtime.familyCases || []).filter(item => item.primary_risk_family === segment);
  }

  function caseId(item = {}) {
    return item.case_kind === "portfolio" ? item.portfolio_case_id : item.family_case_id;
  }

  function searchText(item = {}) {
    return [
      item.material_id,
      item.material_description,
      item.plant,
      item.profit_center,
      item.program,
      item.owner_function,
      item.owner_reference,
      item.primary_risk_family,
      item.primary_risk_subtype,
      item.next_step,
      caseId(item)
    ].map(contract.text).join(" ").toLocaleLowerCase();
  }

  function ownerToken(item = {}) {
    return contract.text(item.owner_reference || item.owner_function) || "unassigned";
  }

  function familySubtypeToken(item = {}) {
    return `${item.primary_risk_family}:${item.primary_risk_subtype}`;
  }

  function applyFilters(rows = [], filters = DEFAULT_FILTERS) {
    const query = contract.text(filters.search).toLocaleLowerCase();
    return rows.filter(item => {
      if (query && !searchText(item).includes(query)) return false;
      if (filters.plant !== "all" && ![item.plant, item.profit_center].map(contract.text).includes(filters.plant)) return false;
      if (filters.program !== "all" && contract.text(item.program) !== filters.program) return false;
      if (filters.owner !== "all" && ownerToken(item) !== filters.owner) return false;
      if (filters.familySubtype !== "all" && familySubtypeToken(item) !== filters.familySubtype) return false;
      if (filters.priority !== "all" && item.priority !== filters.priority) return false;
      if (filters.evidenceStatus !== "all" && item.evidence_status !== filters.evidenceStatus) return false;
      return true;
    });
  }

  function primaryValue(item = {}) {
    if (item.primary_risk_family === "excess_demand") return contract.nullableNumber(item.net_addressable_value);
    if (item.primary_risk_family === "slow_dead") return contract.nullableNumber(item.inventory_exposure);
    if (item.primary_risk_family === "blocked_quality") return contract.nullableNumber(item.blocked_quality_value);
    return null;
  }

  function sortRows(rows = [], sort = {}) {
    const factor = sort.direction === "desc" ? -1 : 1;
    return [...rows].sort((left, right) => {
      let comparison = 0;
      if (sort.key === "family") comparison = contract.text(left.primary_risk_family).localeCompare(contract.text(right.primary_risk_family));
      if (sort.key === "priority") comparison = (portfolioService.PRIORITY_RANK[left.priority] ?? 99) - (portfolioService.PRIORITY_RANK[right.priority] ?? 99);
      if (sort.key === "value") comparison = (primaryValue(left) ?? -Infinity) - (primaryValue(right) ?? -Infinity);
      if (sort.key === "material") comparison = contract.text(left.material_id).localeCompare(contract.text(right.material_id), undefined, { numeric: true, sensitivity: "base" });
      if (sort.key === "owner") comparison = ownerToken(left).localeCompare(ownerToken(right), undefined, { numeric: true, sensitivity: "base" });
      if (sort.key === "evidence") comparison = contract.text(left.evidence_status).localeCompare(contract.text(right.evidence_status));
      if (!comparison) comparison = caseId(left).localeCompare(caseId(right), undefined, { numeric: true, sensitivity: "base" });
      return comparison * factor;
    });
  }

  function options(rows = [], valueFor) {
    return [...new Set(rows.map(valueFor).map(contract.text).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" }));
  }

  function strictFinancialSummary(rows = [], family, field, familyAvailability = {}) {
    const applicable = rows.filter(item => item.case_kind === "portfolio"
      ? Boolean(item.family_case_ids?.[family])
      : item.primary_risk_family === family);
    if (!applicable.length) {
      const runtimeStatus = familyAvailability?.[family]?.status || "unavailable";
      return ["available", "limited"].includes(runtimeStatus)
        ? { status: "available", runtimeStatus, value: 0, applicableCount: 0, availableCount: 0 }
        : { status: "unavailable", runtimeStatus, value: null, applicableCount: 0, availableCount: 0 };
    }
    const values = applicable.map(item => contract.nullableNumber(item[field]));
    const available = values.filter(value => value !== null);
    return {
      status: available.length === applicable.length ? "available" : "incomplete",
      value: available.length === applicable.length ? available.reduce((total, value) => total + value, 0) : null,
      applicableCount: applicable.length,
      availableCount: available.length
    };
  }

  function summary(rows = [], familyAvailability = {}) {
    const uniqueEntityCount = new Set(rows.map(item => item.inventory_entity_key)).size;
    const ownerAssigned = rows.filter(item => ownerToken(item) !== "unassigned").length;
    const evidenceRows = rows.filter(item => item.case_kind === "portfolio");
    const evidenceReady = evidenceRows.filter(item => portfolioService.isEvidenceReadyStatus(item.evidence_status)).length;
    return {
      uniqueRiskEntities: uniqueEntityCount,
      prioritizedCases: rows.filter(item => ["critical", "high"].includes(item.priority)).length,
      ownerCoverage: rows.length ? ownerAssigned / rows.length : null,
      evidenceReadyCount: evidenceReady,
      evidenceTotalCount: evidenceRows.length,
      evidenceReadiness: evidenceRows.length ? evidenceReady / evidenceRows.length : null,
      financials: {
        netAddressable: strictFinancialSummary(rows, "excess_demand", "net_addressable_value", familyAvailability),
        slowDeadExposure: strictFinancialSummary(rows, "slow_dead", "inventory_exposure", familyAvailability),
        blockedQualityValue: strictFinancialSummary(rows, "blocked_quality", "blocked_quality_value", familyAvailability)
      }
    };
  }

  function buildPageModel(input = {}) {
    const runtime = input.runtime || { portfolioCases: [], familyCases: [], counts: {} };
    const state = normalizeState(input.state);
    const baseRows = segmentRows(runtime, state.segment);
    const filteredRows = sortRows(applyFilters(baseRows, state.filters), state.sort);
    const totalPages = Math.max(1, Math.ceil(filteredRows.length / state.pageSize));
    const page = Math.min(state.page, totalPages);
    const pageRows = filteredRows.slice((page - 1) * state.pageSize, page * state.pageSize);
    const requestedSelection = filteredRows.find(item => caseId(item) === state.selectedCaseId) || null;
    const selectedCase = requestedSelection || (state.requireExactSelection && state.selectedCaseId ? null : pageRows[0] || filteredRows[0] || null);
    const optionRows = runtime.familyCases || [];
    const segmentAvailability = runtime.familyAvailability?.[state.segment] || null;
    const segmentUnavailable = !["all", "prioritized"].includes(state.segment)
      && segmentAvailability
      && !["available", "limited"].includes(segmentAvailability.status);
    return {
      version: VERSION,
      runtimeVersion: runtime.version || "",
      analyticsRevision: runtime.analyticsRevision || "",
      state: { ...state, page },
      counts: { all: 0, excess_demand: 0, slow_dead: 0, blocked_quality: 0, prioritized: 0, ...(runtime.counts || {}) },
      familyAvailability: { ...(runtime.familyAvailability || {}) },
      segmentAvailability,
      summary: summary(filteredRows, runtime.familyAvailability),
      allSegmentRows: baseRows,
      filteredRows,
      pageRows,
      page,
      pageSize: state.pageSize,
      totalPages,
      totalRows: filteredRows.length,
      selectedCase,
      selectedCaseId: selectedCase ? caseId(selectedCase) : state.selectedCaseId,
      exactSelectionMissing: Boolean(state.requireExactSelection && state.selectedCaseId && !requestedSelection),
      capabilityStatus: runtime.capabilityStatus || "available",
      excludedFamilyCaseCount: Number(runtime.excludedFamilyCaseCount) || 0,
      identityDiagnostics: Array.isArray(runtime.identityDiagnostics) ? runtime.identityDiagnostics : [],
      filterOptions: {
        plants: options(optionRows, item => item.plant || item.profit_center),
        programs: options(optionRows, item => item.program),
        owners: options(optionRows, ownerToken),
        familySubtypes: options(optionRows, familySubtypeToken),
        priorities: options(optionRows, item => item.priority),
        evidenceStatuses: options(optionRows, item => item.evidence_status)
      },
      emptyState: segmentUnavailable
        ? "risk_family_unavailable"
        : runtime.familyCases?.length
          ? "no_filter_results"
          : runtime.identityDiagnostics?.length
            ? "risk_cases_excluded_missing_identity"
            : "no_risk_cases"
    };
  }

  root.inventoryRisks.pageModel = Object.freeze({
    VERSION,
    SEGMENTS,
    DEFAULT_FILTERS,
    applyFilters,
    buildPageModel,
    caseId,
    primaryValue,
    segmentRows,
    sortRows
  });
})(window);
