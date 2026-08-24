(function registerExcessDecisionWorkspaceModel(global) {
  const runtime = /** @type {any} */ (global);
  const root = /** @type {any} */ (runtime.ObsoliQ = runtime.ObsoliQ || {});
  root.excess = root.excess || {};

  const VERSION = "1";
  const HIGH_PRIORITY = "high";
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

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
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
    const grossValue = cases.reduce((total, item) => total + number(item.gross_excess_value), 0);
    const netValue = cases.reduce((total, item) => total + number(item.net_addressable_excess_value), 0);
    const overlapValue = cases.reduce((total, item) => total + number(item.excess_overlap_value), 0);
    const scores = cases.map(item => number(item.excess_opportunity_score));
    const averageScore = caseCount
      ? Math.round(scores.reduce((total, value) => total + value, 0) / caseCount)
      : 0;
    return {
      netAddressable: {
        value: netValue,
        available: Number.isFinite(netValue)
      },
      casePortfolio: {
        caseCount,
        uniqueMaterialCount: new Set(cases.map(item => text(item.material_id)).filter(Boolean)).size,
        uniquePlantCount: new Set(cases.map(plantFor).filter(Boolean)).size
      },
      prioritization: {
        averageScore,
        maximumScore: scores.length ? Math.max(...scores) : 0,
        highPriorityCaseCount: cases.filter(item => normalized(item.priority) === HIGH_PRIORITY).length
      },
      addressability: {
        grossValue,
        netValue,
        overlapValue,
        addressabilityRatio: grossValue > 0 ? netValue / grossValue : null,
        available: grossValue > 0
      }
    };
  }

  function relationshipWarning(item = {}, issueRowKeys = []) {
    const rowKey = text(item.inventory_row_key || item.inventoryRowKey);
    if (rowKey && new Set(issueRowKeys.map(text)).has(rowKey)) return true;
    const matchType = normalized(item.relationship_match_type);
    return Boolean(matchType && RELATIONSHIP_WARNING_TYPES.has(matchType));
  }

  function historicalEvidence(item = {}, historicalResult = null) {
    const rowKey = text(item.inventory_row_key || item.inventoryRowKey);
    const metric = rowKey && historicalResult
      ? historicalResult.historicalMetricsByInventoryRowKey?.[rowKey] || null
      : null;
    if (!metric || !["available", "limited"].includes(text(metric.history_metric_status))) {
      return { status: "unavailable", exact: false, metric: null, limitations: [] };
    }
    return {
      status: text(metric.history_metric_status),
      exact: true,
      metric,
      limitations: Array.isArray(metric.history_metric_limitation_codes)
        ? [...metric.history_metric_limitation_codes]
        : []
    };
  }

  function projectDecisionCore(item = {}, options = {}) {
    return {
      caseId: text(item.case_id),
      materialId: text(item.material_id),
      materialDescription: text(item.material_description),
      plant: plantFor(item),
      priority: text(item.priority),
      opportunityScore: number(item.excess_opportunity_score),
      netAddressableValue: number(item.net_addressable_excess_value),
      grossExcessValue: number(item.gross_excess_value),
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
      historicalEvidence: historicalEvidence(item, options.historicalResult || null),
      technicalRelationshipState: {
        matchType: text(item.relationship_match_type),
        warning: relationshipWarning(item, options.relationshipIssueRowKeys || [])
      }
    };
  }

  root.excess.decisionWorkspaceModel = Object.freeze({
    version: VERSION,
    filterCases,
    historicalEvidence,
    ownerOptions,
    ownerToken,
    priorityOptions,
    projectDecisionCore,
    relationshipWarning,
    summarize
  });
})(window);
