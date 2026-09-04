(function registerConsumptionHistoryAggregationEngine(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.data = root.data || {};

  const relationshipEngine = root.data?.consumptionHistoryRelationshipEngine;
  if (!relationshipEngine) throw new Error("Consumption History Aggregation Engine requires the relationship engine.");

  const AGGREGATION_MODEL_VERSION = "consumption-history-aggregation-v2";
  const WINDOW_MODEL_VERSION = "historical-metrics-window-v1";
  const RUN_OUT_ASSUMPTION_MODEL = "constant_consumption_no_receipts_v1";
  const ALLOWED_DUPLICATE_SEMANTICS = new Set(["unique", "none", "legitimate_repeat", "legitimate_repeated_movement"]);

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function stableJson(value) {
    if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function normalizedUnit(value) {
    return normalizeText(value).replace(/\s+/g, "").toUpperCase();
  }

  function finiteNumber(value) {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value !== "string" || !value.trim()) return null;
    if (!/^[+\-]?\d+(?:\.\d+)?(?:[eE][+\-]?\d+)?$/.test(value.trim())) return null;
    const number = Number(value.trim());
    return Number.isFinite(number) ? number : null;
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function parseDate(dateText) {
    const text = normalizeText(dateText);
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (year < 1900 || month < 1 || month > 12 || day < 1 || day > maxDay) return null;
    return { year, month, day, date: `${match[1]}-${match[2]}-${match[3]}`, monthKey: `${match[1]}-${match[2]}` };
  }

  function parseMonth(periodText) {
    const text = normalizeText(periodText);
    const match = text.match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (year < 1900 || month < 1 || month > 12) return null;
    return { year, month, monthKey: `${match[1]}-${match[2]}` };
  }

  function monthIndex(monthKey) {
    const parsed = parseMonth(monthKey);
    return parsed ? parsed.year * 12 + parsed.month - 1 : null;
  }

  function monthKeyFromIndex(index) {
    const year = Math.floor(index / 12);
    const month = index % 12 + 1;
    return `${String(year).padStart(4, "0")}-${pad2(month)}`;
  }

  function isLastDayOfMonth(date) {
    if (!date) return false;
    return date.day === new Date(Date.UTC(date.year, date.month, 0)).getUTCDate();
  }

  function buildRollingWindows(analysisAsOfDate) {
    const asOf = parseDate(analysisAsOfDate);
    if (!asOf) {
      return { status: "unavailable", reason: "missing_as_of", windows: {}, analysisAsOfMonth: "", partialCurrentPeriod: false };
    }
    const anchor = monthIndex(asOf.monthKey);
    const months = count => Array.from({ length: count }, (_, offset) => monthKeyFromIndex(anchor - count + 1 + offset));
    return {
      status: "available",
      windowModelVersion: WINDOW_MODEL_VERSION,
      analysisAsOfDate: asOf.date,
      analysisAsOfMonth: asOf.monthKey,
      partialCurrentPeriod: !isLastDayOfMonth(asOf),
      windows: {
        "3m": months(3),
        "6m": months(6),
        "12m": months(12),
        recent3m: months(3),
        prior3m: Array.from({ length: 3 }, (_, offset) => monthKeyFromIndex(anchor - 5 + offset))
      }
    };
  }

  function temporalReference(row = {}, analysisAsOf = {}) {
    const asOfDate = parseDate(analysisAsOf.date || analysisAsOf.analysisAsOfDate || "");
    if (!asOfDate) return { status: "invalid", reason: "analysis_as_of_missing" };
    if (row.temporal_precision === "day") {
      const parsed = parseDate(row.normalized_posting_date);
      if (!parsed) return { status: "invalid", reason: "invalid_temporal_reference" };
      if (parsed.date > asOfDate.date) return { status: "future", reason: "future_movement", ...parsed, precision: "day" };
      return { status: "valid", ...parsed, precision: "day" };
    }
    if (row.temporal_precision === "month") {
      const parsed = parseMonth(row.normalized_period);
      if (!parsed) return { status: "invalid", reason: "invalid_temporal_reference" };
      if (monthIndex(parsed.monthKey) > monthIndex(asOfDate.monthKey)) return { status: "future", reason: "future_movement", ...parsed, precision: "month" };
      return { status: "valid", ...parsed, precision: "month" };
    }
    return { status: "invalid", reason: "ambiguous_temporal_reference" };
  }

  function baseExclusionReasons(row = {}, relationshipState = "", analysisAsOf = {}) {
    const reasons = [];
    const temporal = temporalReference(row, analysisAsOf);
    if (relationshipState !== "exact_material_plant" && relationshipState !== "material_fallback") {
      reasons.push(relationshipState === "ambiguous" ? "relationship_ambiguous" : relationshipState === "invalid_key" ? "relationship_invalid" : "relationship_unmatched");
    }
    if (temporal.status === "future") reasons.push("future_movement");
    if (temporal.status === "invalid") reasons.push(temporal.reason);
    if (row.temporal_parse_status !== "valid") reasons.push("invalid_temporal_reference");
    if (row.movement_semantic === "unknown") reasons.push("unknown_movement");
    if (finiteNumber(row.net_consumption_quantity) === null) reasons.push("missing_net_quantity");
    if (!normalizedUnit(row.normalized_base_unit || row.base_unit)) reasons.push("missing_unit");
    if (!ALLOWED_DUPLICATE_SEMANTICS.has(row.duplicate_semantic || "unique")) {
      if (row.duplicate_semantic === "exact_source_duplicate") reasons.push("exact_source_duplicate_ambiguity");
      else if (row.duplicate_semantic === "business_duplicate_candidate") reasons.push("business_duplicate_candidate");
      else reasons.push("identity_insufficient");
    }
    if (row.aggregation_eligible !== true) {
      (row.aggregation_blocker_codes || row.temporal_diagnostic_codes || []).forEach(code => {
        if (code === "unknown_movement_type") reasons.push("unknown_movement");
        if (code === "missing_unit") reasons.push("missing_unit");
        if (code === "missing_unit_for_entity") reasons.push("missing_unit_for_entity");
        if (code === "multiple_units_for_entity") reasons.push("multiple_units");
        if (code === "missing_consumption_quantity") reasons.push("missing_consumption_quantity");
        if (code === "invalid_consumption_quantity") reasons.push("invalid_consumption_quantity");
      });
    }
    return [...new Set(reasons)];
  }

  function rowExclusion(row, reasons, temporal, historyEntityKey) {
    return {
      package_row_key: row.package_row_key || "",
      source_row_index: row.__sourceRowIndex || row.sourceRowIndex || "",
      historyEntityKey,
      exclusionReasons: [...new Set(reasons)],
      temporalReference: temporal?.date || temporal?.monthKey || "",
      movementSemantic: row.movement_semantic || "",
      unitContext: normalizedUnit(row.normalized_base_unit || row.base_unit),
      duplicateSemantic: row.duplicate_semantic || ""
    };
  }

  function eventCount(rows = []) {
    const complete = new Set();
    let partial = 0;
    rows.forEach(row => {
      if (row.event_identity_status === "complete" && row.event_identity_key) complete.add(row.event_identity_key);
      else partial += 1;
    });
    return complete.size + partial;
  }

  function addToMapList(map, key, value) {
    const list = map.get(key) || [];
    list.push(value);
    map.set(key, list);
  }

  function indexHistoryRowsByEntityKey(rows = []) {
    const index = new Map();
    rows.forEach(row => {
      addToMapList(index, relationshipEngine.entityKey(row.material_id, row.plant), row);
    });
    return index;
  }

  function clamp01(value) {
    return Math.max(0, Math.min(1, value));
  }

  function aggregateBuckets(rows = [], excludedRows = []) {
    const buckets = new Map();
    rows.forEach(({ row, temporal }) => {
      const key = `${temporal.monthKey}|${normalizedUnit(row.normalized_base_unit || row.base_unit)}`;
      const bucket = buckets.get(key) || {
        month: temporal.monthKey,
        unit: normalizedUnit(row.normalized_base_unit || row.base_unit),
        netQuantity: 0,
        positiveConsumptionQuantity: 0,
        eligibleEventKeys: new Set(),
        eligibleEventCount: 0,
        sourceRowCount: 0,
        dayPrecisionRowCount: 0,
        monthPrecisionRowCount: 0,
        excludedRowCount: 0,
        exclusionReasons: {}
      };
      const net = finiteNumber(row.net_consumption_quantity);
      if (net === null) return;
      bucket.netQuantity += net;
      if (net > 0) bucket.positiveConsumptionQuantity += net;
      if (row.event_identity_status === "complete" && row.event_identity_key) bucket.eligibleEventKeys.add(row.event_identity_key);
      else bucket.eligibleEventCount += 1;
      bucket.sourceRowCount += 1;
      if (temporal.precision === "day") bucket.dayPrecisionRowCount += 1;
      if (temporal.precision === "month") bucket.monthPrecisionRowCount += 1;
      buckets.set(key, bucket);
    });
    excludedRows.forEach(exclusion => {
      const month = parseDate(exclusion.temporalReference)?.monthKey || parseMonth(exclusion.temporalReference)?.monthKey || "";
      if (!month) return;
      [...buckets.values()].filter(bucket => bucket.month === month).forEach(bucket => {
        bucket.excludedRowCount += 1;
        exclusion.exclusionReasons.forEach(reason => {
          bucket.exclusionReasons[reason] = (bucket.exclusionReasons[reason] || 0) + 1;
        });
      });
    });
    return [...buckets.values()].map(bucket => {
      const { eligibleEventKeys, ...rest } = bucket;
      return {
        ...rest,
        eligibleEventCount: bucket.eligibleEventCount + eligibleEventKeys.size
      };
    }).sort((a, b) => a.month.localeCompare(b.month));
  }

  function sumWindow(rows, months) {
    const monthSet = new Set(months);
    const included = rows.filter(item => monthSet.has(item.temporal.monthKey));
    return {
      value: included.reduce((total, item) => total + finiteNumber(item.row.net_consumption_quantity), 0),
      includedRowCount: included.length,
      includedEventCount: eventCount(included.map(item => item.row))
    };
  }

  function latestPositiveConsumption(rows = []) {
    const positives = rows
      .filter(item => finiteNumber(item.row.net_consumption_quantity) > 0)
      .map(item => ({
        date: item.temporal.date || "",
        period: item.temporal.monthKey || "",
        precision: item.temporal.precision,
        sortKey: item.temporal.precision === "day" ? `${item.temporal.date}|2` : `${item.temporal.monthKey}|1`
      }))
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    return positives[0] || null;
  }

  function trendForRows(includedRows, windows, coveredMonths) {
    const averageFor = months => {
      const covered = months.filter(month => coveredMonths.has(month));
      if (covered.length < 2) return null;
      const sum = sumWindow(includedRows, covered).value;
      return sum / covered.length;
    };
    const recentAverage = averageFor(windows.recent3m);
    const priorAverage = averageFor(windows.prior3m);
    if (recentAverage === null || priorAverage === null || priorAverage === 0) {
      return { trend: "insufficient_evidence", ratio: null };
    }
    const ratio = (recentAverage - priorAverage) / Math.abs(priorAverage);
    if (ratio > 0.10) return { trend: "increasing", ratio };
    if (ratio < -0.10) return { trend: "declining", ratio };
    return { trend: "stable", ratio };
  }

  function buildEntityMetric({ inventoryEntity, match, historyRows, analysisAsOf, historyReadiness, provenanceBase }) {
    const candidateRows = Array.isArray(historyRows) ? historyRows : [];
    const relationshipState = match.matchType;
    const temporalRows = candidateRows.map(row => ({ row, temporal: temporalReference(row, analysisAsOf) }));
    const criticalQuantityCodes = new Set([
      "missing_consumption_quantity",
      "invalid_consumption_quantity",
      "missing_unit",
      "missing_unit_for_entity",
      "multiple_units_for_entity"
    ]);
    const quantityEvidenceUnavailable = candidateRows.some(row => (
      (row.aggregation_blocker_codes || row.temporal_diagnostic_codes || []).some(code => criticalQuantityCodes.has(code))
      || ["missing", "invalid", "ambiguous", "double_scale"].includes(row.consumption_quantity_parse_status)
    ));
    const initialExclusions = [];
    const potentiallyEligible = [];
    temporalRows.forEach(item => {
      const reasons = baseExclusionReasons(item.row, relationshipState, analysisAsOf);
      if (reasons.length) initialExclusions.push(rowExclusion(item.row, reasons, item.temporal, match.historyEntityKey));
      else potentiallyEligible.push(item);
    });
    const units = new Set(potentiallyEligible.map(item => normalizedUnit(item.row.normalized_base_unit || item.row.base_unit)).filter(Boolean));
    const unitConflict = units.size > 1;
    const includedRows = unitConflict || quantityEvidenceUnavailable ? [] : potentiallyEligible;
    const excludedRows = unitConflict
      ? [
          ...initialExclusions,
          ...potentiallyEligible.map(item => rowExclusion(item.row, ["unit_conflict", "multiple_units"], item.temporal, match.historyEntityKey))
        ]
      : quantityEvidenceUnavailable
        ? [
            ...initialExclusions,
            ...potentiallyEligible.map(item => rowExclusion(item.row, ["numeric_evidence_unavailable"], item.temporal, match.historyEntityKey))
          ]
        : initialExclusions;
    const unit = units.size === 1 ? [...units][0] : "";
    const windows = buildRollingWindows(analysisAsOf.date);
    const validTemporalMonths = new Set(temporalRows
      .filter(item => item.temporal.status === "valid")
      .map(item => item.temporal.monthKey));
    const months12 = new Set(windows.windows?.["12m"] || []);
    const coveredMonths12 = new Set([...validTemporalMonths].filter(month => months12.has(month)));
    const coveredCalendarMonthCount = coveredMonths12.size;
    const buckets = aggregateBuckets(includedRows, excludedRows);
    const net3m = sumWindow(includedRows, windows.windows?.["3m"] || []);
    const net6m = sumWindow(includedRows, windows.windows?.["6m"] || []);
    const net12m = sumWindow(includedRows, windows.windows?.["12m"] || []);
    const last = quantityEvidenceUnavailable || unitConflict ? null : latestPositiveConsumption(includedRows);
    const average = quantityEvidenceUnavailable || unitConflict || coveredCalendarMonthCount === 0 ? null : net12m.value / coveredCalendarMonthCount;
    const activeMonths = quantityEvidenceUnavailable || unitConflict ? null : buckets.filter(bucket => months12.has(bucket.month) && bucket.netQuantity > 0).length;
    const intermittency = activeMonths !== null && coveredCalendarMonthCount > 0 ? clamp01(1 - activeMonths / coveredCalendarMonthCount) : null;
    const asOfMonthIndex = monthIndex(windows.analysisAsOfMonth);
    const lastMonthIndex = last ? monthIndex(last.period) : null;
    const trend = quantityEvidenceUnavailable || unitConflict
      ? { trend: "insufficient_evidence", ratio: null }
      : trendForRows(includedRows, windows.windows || {}, coveredMonths12);
    const limitationCodes = new Set(excludedRows.flatMap(row => row.exclusionReasons));
    if (historyReadiness?.status && historyReadiness.status !== "ready") limitationCodes.add("history_not_ready");
    if (windows.partialCurrentPeriod) limitationCodes.add("partial_current_period");
    if (!includedRows.length) limitationCodes.add("insufficient_history");
    if (!last) limitationCodes.add("no_positive_consumption");
    if (unitConflict) limitationCodes.add("unit_conflict");
    if (quantityEvidenceUnavailable) limitationCodes.add("numeric_evidence_unavailable");
    if (inventoryEntity.inventoryUnitMissing) limitationCodes.add("inventory_unit_missing");
    if (inventoryEntity.inventoryUnitConflict) limitationCodes.add("inventory_unit_conflict");
    if (inventoryEntity.stockQuantityMissing) limitationCodes.add("stock_quantity_missing");
    if (inventoryEntity.stockQuantityInvalid) limitationCodes.add("stock_quantity_invalid");
    const inventoryUnit = normalizeText(inventoryEntity.inventoryUnit).toUpperCase();
    const stockQuantity = finiteNumber(inventoryEntity.stockQuantity);
    let coverage = null;
    let coverageStatus = "unavailable";
    if (stockQuantity === null) limitationCodes.add("stock_quantity_missing");
    if (!inventoryUnit) limitationCodes.add("inventory_unit_missing");
    if (inventoryUnit && unit && inventoryUnit !== unit) limitationCodes.add("inventory_history_unit_mismatch");
    if (!(average > 0)) limitationCodes.add("average_consumption_not_positive");
    if (stockQuantity !== null && stockQuantity >= 0 && inventoryUnit && unit && inventoryUnit === unit && average > 0 && coveredCalendarMonthCount >= 6 && !unitConflict && !quantityEvidenceUnavailable) {
      coverage = stockQuantity / average;
      coverageStatus = "available";
    }
    const metricStatus = !includedRows.length || coveredCalendarMonthCount < 3 || unitConflict || quantityEvidenceUnavailable
      ? "unavailable"
      : coveredCalendarMonthCount < 12 || limitationCodes.size
        ? "limited"
        : "available";
    const historyCoverageValues = temporalRows
      .filter(item => item.temporal.status === "valid")
      .map(item => item.temporal.date || item.temporal.monthKey)
      .sort();
    // Use the existing observed coverage evidence, not the rolling window or as-of end.
    const coverageStartIndex = monthIndex((historyCoverageValues[0] || "").slice(0, 7));
    const coverageEndIndex = monthIndex((historyCoverageValues.at(-1) || "").slice(0, 7));
    const historyCoverageMonths = coverageStartIndex !== null && coverageEndIndex !== null && coverageEndIndex >= coverageStartIndex
      ? coverageEndIndex - coverageStartIndex + 1
      : null;
    const provenance = {
      ...provenanceBase,
      inventoryEntityKey: inventoryEntity.inventoryEntityKey,
      historyEntityKey: match.historyEntityKey,
      matchType: match.matchType,
      unitStatus: unitConflict ? "conflict" : unit ? "single" : "missing",
      inventoryUnit,
      historyUnit: unit,
      includedRowCount: includedRows.length,
      excludedRowCount: excludedRows.length,
      includedEventCount: eventCount(includedRows.map(item => item.row)),
      exclusionReasons: [...limitationCodes].sort(),
      historyCoverageStart: historyCoverageValues[0] || "",
      historyCoverageEnd: historyCoverageValues.at(-1) || "",
      historyCoverageMonths,
      coveredCalendarMonthCount,
      partialCurrentPeriod: windows.partialCurrentPeriod,
      evaluatedAt: provenanceBase.evaluatedAt
    };
    return {
      inventoryEntityKey: inventoryEntity.inventoryEntityKey,
      historyEntityKey: match.historyEntityKey,
      matchType: match.matchType,
      sharedEntityMetric: inventoryEntity.rowKeys.length > 1,
      last_consumption_date: last?.precision === "day" ? last.date : null,
      last_consumption_period: last?.period || null,
      last_consumption_precision: last?.precision || null,
      net_consumption_quantity_3m: quantityEvidenceUnavailable || unitConflict ? null : net3m.value,
      net_consumption_quantity_6m: quantityEvidenceUnavailable || unitConflict ? null : net6m.value,
      net_consumption_quantity_12m: quantityEvidenceUnavailable || unitConflict ? null : net12m.value,
      average_monthly_consumption_12m: average,
      averageDenominatorMonthCount: coveredCalendarMonthCount,
      active_consumption_months_12m: activeMonths,
      movement_frequency_12m: quantityEvidenceUnavailable || unitConflict ? null : net12m.includedEventCount,
      intermittency_ratio_12m: intermittency,
      months_since_last_consumption: lastMonthIndex === null || asOfMonthIndex === null ? null : Math.max(0, asOfMonthIndex - lastMonthIndex),
      consumption_trend: trend.trend,
      consumption_trend_ratio: trend.ratio,
      history_coverage_start: provenance.historyCoverageStart || null,
      history_coverage_end: provenance.historyCoverageEnd || null,
      history_coverage_months: historyCoverageMonths,
      history_completeness: quantityEvidenceUnavailable || unitConflict ? null : clamp01(coveredCalendarMonthCount / 12),
      inventory_coverage_months: coverage,
      estimated_run_out_months: coverage,
      run_out_assumption_model: coverage === null ? "" : RUN_OUT_ASSUMPTION_MODEL,
      history_metric_status: metricStatus,
      history_metric_limitation_codes: [...limitationCodes].sort(),
      unit,
      inventory_unit: inventoryUnit,
      coverage_status: coverageStatus,
      partial_current_period: windows.partialCurrentPeriod,
      included_row_count: includedRows.length,
      excluded_row_count: excludedRows.length,
      included_event_count: net12m.includedEventCount,
      monthly_buckets: buckets,
      excluded_rows: excludedRows,
      provenance
    };
  }

  function aggregationSignature(input = {}) {
    return `consumption-history-aggregation:${AGGREGATION_MODEL_VERSION}:${stableJson(input)}`;
  }

  function buildHistoricalAggregates(input = {}) {
    const relationshipResult = input.relationshipResult || {};
    const inventoryEntities = relationshipResult.inventoryEntitiesByKey || {};
    const historyRows = cloneData(Array.isArray(input.historyRows) ? input.historyRows : []);
    const historyRowsByEntityKey = indexHistoryRowsByEntityKey(historyRows);
    const analysisAsOf = input.analysisAsOf || {};
    const evaluatedAt = input.evaluatedAt || new Date().toISOString();
    const provenanceBase = {
      inventoryPackageId: input.inventoryPackageId || relationshipResult.inventoryPackageId || "",
      inventoryPackageRevision: Number(input.inventoryPackageRevision || relationshipResult.inventoryPackageRevision || 0) || 0,
      historyPackageId: input.historyPackageId || relationshipResult.historyPackageId || "",
      historyPackageRevision: Number(input.historyPackageRevision || relationshipResult.historyPackageRevision || 0) || 0,
      semanticPolicySignature: input.semanticPolicySignature || "",
      relationshipModelVersion: relationshipResult.relationshipModelVersion || "",
      aggregationModelVersion: AGGREGATION_MODEL_VERSION,
      historicalMetricModelVersion: input.historicalMetricModelVersion || "",
      windowModelVersion: WINDOW_MODEL_VERSION,
      analysisAsOfDate: analysisAsOf.date || "",
      analysisAsOfSource: analysisAsOf.source || "",
      analysisAsOfSourcePackageId: analysisAsOf.sourcePackageId || "",
      analysisAsOfSourcePackageRevision: analysisAsOf.sourcePackageRevision || null,
      evaluatedAt
    };
    const metricsByInventoryEntityKey = {};
    const provenanceByInventoryEntityKey = {};
    const allExcludedRows = [];
    Object.values(relationshipResult.matchesByInventoryEntityKey || {}).forEach(match => {
      const inventoryEntity = inventoryEntities[match.inventoryEntityKey];
      if (!inventoryEntity) return;
      const metric = buildEntityMetric({
        inventoryEntity,
        match,
        historyRows: historyRowsByEntityKey.get(match.historyEntityKey) || [],
        analysisAsOf,
        historyReadiness: input.historyReadiness || null,
        provenanceBase
      });
      metricsByInventoryEntityKey[match.inventoryEntityKey] = metric;
      provenanceByInventoryEntityKey[match.inventoryEntityKey] = metric.provenance;
      allExcludedRows.push(...(metric.excluded_rows || []));
    });
    const metrics = Object.values(metricsByInventoryEntityKey);
    const summary = {
      metricsAvailableCount: metrics.filter(metric => metric.history_metric_status === "available").length,
      metricsLimitedCount: metrics.filter(metric => metric.history_metric_status === "limited").length,
      metricsUnavailableCount: metrics.filter(metric => metric.history_metric_status === "unavailable").length,
      historyCoverageStart: metrics.map(metric => metric.history_coverage_start).filter(Boolean).sort()[0] || "",
      historyCoverageEnd: metrics.map(metric => metric.history_coverage_end).filter(Boolean).sort().at(-1) || "",
      partialCurrentPeriod: metrics.some(metric => metric.partial_current_period),
      includedRowCount: metrics.reduce((total, metric) => total + Number(metric.included_row_count || 0), 0),
      excludedRowCount: allExcludedRows.length
    };
    return {
      status: metrics.length ? "executed" : "unavailable",
      reason: metrics.length ? "" : "no_relationship_matches",
      aggregationModelVersion: AGGREGATION_MODEL_VERSION,
      windowModelVersion: WINDOW_MODEL_VERSION,
      aggregationSignature: aggregationSignature({
        relationshipSignature: relationshipResult.relationshipSignature,
        analysisAsOf,
        semanticPolicySignature: input.semanticPolicySignature || "",
        metricCount: metrics.length
      }),
      metricsByInventoryEntityKey,
      provenanceByInventoryEntityKey,
      excludedRows: allExcludedRows,
      summary,
      evaluatedAt
    };
  }

  root.data.consumptionHistoryAggregationEngine = Object.freeze({
    version: "1",
    AGGREGATION_MODEL_VERSION,
    WINDOW_MODEL_VERSION,
    RUN_OUT_ASSUMPTION_MODEL,
    buildRollingWindows,
    temporalReference,
    aggregationSignature,
    buildHistoricalAggregates
  });
})(window);
