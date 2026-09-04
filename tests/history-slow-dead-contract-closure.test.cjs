"use strict";

// Synthetic contract inputs only; production producers are executed without runtime injection.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const rootPath = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {}, console, setTimeout });
for (const file of [
  "js/core/canonical-model.js", "js/core/value-utils.js", "js/data/source-model.js",
  "js/mapping/mapping-engine.js", "js/data/package-relationship-engine.js",
  "js/data/package-enrichment-engine.js", "js/data/consumption-history-relationship-engine.js",
  "js/data/consumption-history-aggregation-engine.js", "js/application/historical-inventory-metrics-service.js",
  "js/application/historical-metrics-runtime-coordinator.js", "js/slow-dead/slow-dead-condition-engine.js",
  "js/application/slow-dead-recovery-case-service.js"
]) vm.runInContext(fs.readFileSync(path.join(rootPath, file), "utf8"), context, { filename: file });
const root = context.window.ObsoliQ;
const copy = value => JSON.parse(JSON.stringify(value));
const sha = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const results = [];
const evidence = [];
function test(name, run) {
  try { run(); results.push({ name, status: "PASS" }); }
  catch (error) { results.push({ name, status: "FAIL", message: error.stack }); }
}
const canonical = root.core.canonical;
const mapping = root.mapping.engine;
const rel = root.data.consumptionHistoryRelationshipEngine;
const agg = root.data.consumptionHistoryAggregationEngine;
const svc = root.application.historicalInventoryMetricsService.createHistoricalInventoryMetricsService({ relationshipEngine: rel, aggregationEngine: agg });
const asOf = { date: "2026-08-31", source: "user_confirmed", userConfirmed: true };
const invRow = overrides => ({ inventory_row_key: "INV-SYN-HSD-1", material_id: "000-HSD", plant: "SYN-1", stock_quantity: 100, stock_value: 1000, base_unit: "EA", ...overrides });
const pkg = (type, rows) => ({
  packageId: `PKG-SYN-${type}`, datasetId: `DS-SYN-${type}`, packageType: type, revision: 1,
  status: "ready", packageValidation: { statusKey: "ready" },
  relationshipKeys: { material: ["material_id"], organization: ["plant"] },
  interpretationMetadata: { trustState: "trusted", semanticPolicySignature: "synthetic-hsd-policy" },
  buildData: { packageRows: rows, buildMetadata: { historyReadiness: { status: "ready", analysisAsOf: asOf } } }
});
function row(period, index = 0, overrides = {}) {
  return {
    package_row_key: `CH-SYN-${index}`, material_id: "000-HSD", plant: "SYN-1",
    normalized_period: period, temporal_precision: "month", temporal_parse_status: "valid",
    temporal_status: "valid", movement_semantic: "consumption", net_consumption_quantity: 10,
    normalized_base_unit: "EA", base_unit: "EA", unit_status: "single", aggregation_eligible: true,
    duplicate_semantic: "unique", event_identity_status: "complete", event_identity_key: `DOC-SYN-${index}`,
    ...overrides
  };
}
function months(count, quantity = () => 10) {
  return Array.from({ length: count }, (_, index) => {
    const period = new Date(Date.UTC(2026, 8 - count + index, 1)).toISOString().slice(0, 7);
    return row(period, index, { net_consumption_quantity: quantity(period, index) });
  });
}
function aggregate(historyRows, inventoryRows = [invRow()], analysisAsOf = asOf) {
  const input = { inventoryPackage: pkg("inventory_snapshot", inventoryRows), historyPackage: pkg("consumption_history", historyRows), analysisAsOf };
  const before = sha(input);
  const relationship = rel.buildInventoryHistoryRelationship(input);
  const output = agg.buildHistoricalAggregates({ relationshipResult: relationship, historyRows, analysisAsOf, historyReadiness: { status: "ready" }, evaluatedAt: "2026-08-31T00:00:00.000Z" });
  assert.equal(sha(input), before, "Producer must not mutate source input");
  return { metric: Object.values(output.metricsByInventoryEntityKey)[0], output, relationship, input };
}
function condition(historyRows, inventoryRows = [invRow()]) {
  const { input } = aggregate(historyRows, inventoryRows);
  const runtime = svc.buildHistoricalMetricRuntime({ ...input, evaluatedAt: "2026-08-31T00:00:00.000Z" });
  const metric = Object.values(runtime.historicalMetricsByInventoryEntityKey)[0];
  const result = root.slowDead.conditionEngine.evaluateCondition({
    inventoryEvidence: inventoryRows[0], historicalEvidence: metric,
    relationshipEvidence: { matchType: metric.matchType }, historicalRuntime: runtime
  });
  return { metric, runtime, result, input };
}

test("optional canonical text unit and strict aliases", () => {
  const def = copy(canonical.inventoryFieldDefinitions.base_unit);
  assert.equal(def.type, "text"); assert.equal(def.requirement, "optional");
  assert.equal(def.analysis_group, "context"); assert.equal(def.importable, true);
  assert.equal(canonical.numericKeys.includes("base_unit"), false);
  assert.deepEqual(copy(canonical.inventoryFieldDefinitionErrors), []);
  for (const key of ["inventory_unit", "stock_unit", "quantity_unit", "uom"]) assert.equal(canonical.inventoryFieldDefinitions[key], undefined);
  for (const header of ["base_unit", "Base Unit", "Base UoM", "Base Unit of Measure", "Basismengeneinheit", "MEINS"]) assert.equal(mapping.normalizeHeader(header), "base_unit");
  for (const header of ["Unit", "UoM", "Einheit", "Stock Unit", "Order Unit", "Purchase Unit", "Sales Unit", "Price Unit", "Valuation Unit", "Currency"]) assert.notEqual(mapping.normalizeHeader(header), "base_unit");
});

test("duplicate unit mapping requires physical review and signatures change", () => {
  for (const headers of [["Base Unit", "Base Unit"], ["Base Unit", "MEINS"]]) {
    const source = root.data.sourceModel.buildParsedSourceDataset(["material_id", "stock_value", ...headers], [["000-HSD", "100", "EA", "KG"]]);
    const proposed = mapping.createAutomaticColumnMapping(source);
    assert.equal(mapping.validateColumnMapping(proposed, source).valid, false);
    assert.notEqual(proposed[2].sourceKey, proposed[3].sourceKey);
    const select = index => proposed.map((entry, i) => i < 2 ? entry : { ...entry, selectedCanonicalField: i === index ? "base_unit" : "", ignored: i !== index, manual: true });
    const first = select(2), second = select(3);
    assert.equal(mapping.validateColumnMapping(first, source).valid, true);
    assert.equal(mapping.validateColumnMapping(second, source).valid, true);
    assert.notEqual(mapping.columnMappingSignature(first), mapping.columnMappingSignature(second));
    for (const badIndex of ["2", -1, 2.5, null]) {
      const invalid = first.map((entry, i) => i === 2 ? { ...entry, sourceIndex: badIndex } : entry);
      assert.equal(mapping.validateColumnMapping(invalid, source).valid, false);
    }
    const applied = mapping.applyApprovedColumnMapping({ ...source, mapping: second });
    assert.equal(applied[0].base_unit, "KG");
    assert.ok(Object.values(applied[0]).includes("EA"), "Unselected raw source must remain available");
  }
});

test("material master fill-missing, token equality, conflicts and relationship exclusion", () => {
  for (const [unit, masterUnit, expected, conflicts] of [["", "EA", "EA", 0], [" ea ", "EA", " ea ", 0], ["EA", "KG", "EA", 1], ["EA", "PC", "EA", 1], ["KG", "G", "KG", 1]]) {
    const inventoryRows = [invRow({ base_unit: unit })];
    const masterRows = [{ material_id: "000-HSD", plant: "SYN-1", base_unit: masterUnit }];
    const inventoryPackage = pkg("inventory_snapshot", inventoryRows);
    const materialMasterPackage = { ...pkg("material_master", masterRows), mapping: { columnMapping: [{ status: "mapped", selectedCanonicalField: "base_unit" }] } };
    const input = { inventoryRows, inventoryPackage, materialMasterPackage };
    const before = sha(input);
    const relationshipResult = root.data.packageRelationshipEngine.buildInventoryMaterialMasterRelationship(input);
    const result = root.data.packageEnrichmentEngine.enrichInventoryWithMaterialMaster({ ...input, relationshipResult });
    assert.equal(result.enrichedRows[0].base_unit, expected); assert.equal(result.conflictCount, conflicts);
    assert.equal(result.enrichedRows[0].stock_value, 1000); assert.equal(result.enrichedRows[0].stock_quantity, 100);
    assert.equal(sha(input), before);
    for (const packageChange of [{ status: "invalid" }, { buildData: { packageRows: [{ ...masterRows[0], material_id: "UNMATCHED" }] } }, { buildData: { packageRows: [masterRows[0], { ...masterRows[0] }] } }]) {
      const blockedInput = { ...input, materialMasterPackage: { ...materialMasterPackage, ...packageChange } };
      const relationship = root.data.packageRelationshipEngine.buildInventoryMaterialMasterRelationship(blockedInput);
      const blocked = root.data.packageEnrichmentEngine.enrichInventoryWithMaterialMaster({ ...blockedInput, relationshipResult: relationship });
      assert.equal(blocked.enrichedRows[0].base_unit, unit);
    }
  }
});

for (const [unit, historyUnit, available] of [["EA", "EA", true], [" ea ", "EA", true], ["EA", "PC", false], ["EA", "PCS", false], ["KG", "G", false], ["", "EA", false]]) {
  test(`quantity-unit compatibility ${JSON.stringify(unit)} / ${historyUnit}`, () => {
    const { metric } = aggregate(months(12).map(item => ({ ...item, normalized_base_unit: historyUnit, base_unit: historyUnit })), [invRow({ base_unit: unit })]);
    assert.equal(metric.inventory_coverage_months, available ? 10 : null);
    assert.equal(metric.history_coverage_months, 12);
    if (!unit) assert.equal(metric.inventory_unit, "");
  });
}
test("entity-wide missing and mixed units do not select first row; zero stays zero", () => {
  for (const secondUnit of ["", "KG"]) for (const reverse of [false, true]) {
    const rows = [invRow(), invRow({ inventory_row_key: "INV-SYN-HSD-2", base_unit: secondUnit })];
    const { metric } = aggregate(months(12), reverse ? rows.reverse() : rows);
    assert.equal(metric.inventory_coverage_months, null);
  }
  assert.equal(aggregate(months(12), [invRow({ stock_quantity: 0 })]).metric.inventory_coverage_months, 0);
});

for (const span of [1, 11, 12, 13, 24]) test(`inclusive observed month span ${span}`, () => {
  const { metric } = aggregate(months(span));
  assert.equal(metric.history_coverage_months, span);
  assert.equal(metric.provenance.historyCoverageMonths, span);
  assert.equal(metric.provenance.coveredCalendarMonthCount, Math.min(span, 12));
  evidence.push([span, metric.history_coverage_months, metric.history_completeness]);
});
test("coverage validity, day/month precision, order, missing/future and observed-only end", () => {
  const pairs = [
    [[row("2025-12", 1), row("2026-01", 2)], asOf, 2],
    [[row("2026-08", 1), row("2026-08", 2)], asOf, 1],
    [[row("", 1, { temporal_precision: "day", normalized_posting_date: "2025-09-30" }), row("2026-08", 2)], asOf, 12],
    [[row("2026-09")], asOf, null], [[row("2026-99")], asOf, null], [[row("")], asOf, null],
    [[row("", 0, { temporal_parse_status: "ambiguous", temporal_precision: "unknown" })], asOf, null],
    [[row("2026-08")], { ...asOf, date: "2026-08-15" }, 1],
    [[row("", 0, { temporal_precision: "day", normalized_posting_date: "2026-08-16" })], { ...asOf, date: "2026-08-15" }, null],
    [[row("2025-01", 1), row("2025-12", 2)], { ...asOf, date: "2026-06-30" }, 12],
    [[row("2026-08", 2), row("2025-09", 1)], asOf, 12],
    [[row("2026-08", 1), row("", 2)], asOf, 1]
  ];
  for (const [rows, date, expected] of pairs) {
    const { metric } = aggregate(rows, [invRow()], date);
    assert.equal(metric.history_coverage_months, expected, JSON.stringify({ rows, date }));
    assert.equal(metric.provenance.historyCoverageMonths, expected);
  }
  assert.equal(aggregate([]).metric, undefined, "No matched entity creates no fabricated metric");
  // Missing as-of is rejected by the service before the aggregation precondition.
  const historyPackage = pkg("consumption_history", [row("2026-08")]);
  historyPackage.buildData.buildMetadata.historyReadiness.analysisAsOf = {};
  const missingAsOf = svc.buildHistoricalMetricRuntime({ inventoryPackage: pkg("inventory_snapshot", [invRow()]), historyPackage, analysisAsOf: {} });
  assert.equal(missingAsOf.status, "unavailable");
  assert.deepEqual(copy(missingAsOf.historicalMetricsByInventoryEntityKey), {});
});
test("coverage uses unchanged temporal evidence despite quantity, unit, movement or duplicate exclusions", () => {
  for (const change of [
    { aggregation_eligible: false, movement_semantic: "unknown" },
    { aggregation_eligible: false, duplicate_semantic: "exact_source_duplicate" },
    { normalized_base_unit: "KG", base_unit: "KG" },
    { consumption_quantity_parse_status: "invalid", net_consumption_quantity: null }
  ]) {
    const rows = [row("2024-09", 99, change), ...months(12)];
    const { metric } = aggregate(rows);
    assert.equal(metric.history_coverage_months, 24);
    assert.equal(metric.history_coverage_start, "2024-09");
    assert.ok(metric.history_metric_limitation_codes.length > 0);
  }
});
test("span, rolling completeness and stock coverage are independent", () => {
  for (const [span, observed] of [[12, 12], [12, 10], [12, 2], [24, 10]]) {
    const rows = months(12).filter((item, i) => i === 0 || i >= 13 - observed);
    if (span === 24) rows.unshift(row("2024-09", 99));
    const { metric } = aggregate(rows, [invRow({ stock_quantity: 35 })]);
    assert.equal(metric.history_coverage_months, span);
    assert.equal(metric.history_completeness, observed / 12);
    assert.equal(metric.net_consumption_quantity_12m, observed * 10);
    assert.equal(metric.monthly_buckets.length, rows.length, "No missing month filled with zero");
    if (observed >= 6) assert.equal(metric.inventory_coverage_months, 3.5);
  }
});

test("producer-driven Slow/Dead coverage and completeness boundaries", () => {
  const sparse = count => months(count, period => period === "2026-01" ? 10 : 0);
  const below = condition(sparse(11));
  assert.equal(below.result.condition_code, "insufficient_evidence");
  assert.ok(below.result.limitation_codes.includes("history_coverage_below_policy"));
  const enough = condition(sparse(12));
  assert.equal(enough.result.condition_code, "slow_moving_candidate");
  const holes = condition(sparse(12).filter((item, i) => i === 0 || i === 4 || i === 11));
  assert.equal(holes.result.condition_code, "insufficient_evidence");
  assert.ok(holes.result.limitation_codes.includes("history_completeness_below_policy"));
  for (const unit of ["", "KG"]) assert.equal(condition(sparse(12), [invRow({ base_unit: unit })]).result.condition_code, "insufficient_evidence");
  const old = condition(months(24, (period, i) => i === 0 ? 10 : 0));
  assert.notEqual(old.result.condition_code, "dead_stock_candidate", "Age alone cannot authorize a Dead candidate");
  assert.equal(condition(sparse(12), [invRow({ strategic_reserve: true })]).result.condition_code, "strategic_reserve");
  for (const value of [null, undefined]) {
    const historicalEvidence = { ...enough.metric, history_coverage_months: value };
    const result = root.slowDead.conditionEngine.evaluateCondition({ inventoryEvidence: invRow(), historicalEvidence, relationshipEvidence: { matchType: "exact_material_plant" }, historicalRuntime: enough.runtime });
    assert.equal(result.condition_code, "insufficient_evidence");
  }
  evidence.push([below.result.condition_code, enough.result.condition_code, holes.result.condition_code, old.result.condition_code]);
});
test("service propagates metric/provenance to entity and row without recalculation", () => {
  const { runtime, metric } = condition(months(24, period => period === "2026-01" ? 10 : 0), [invRow(), invRow({ inventory_row_key: "INV-SYN-HSD-2" })]);
  assert.equal(metric.history_coverage_months, 24);
  for (const item of Object.values(runtime.historicalMetricsByInventoryRowKey)) {
    assert.equal(item.history_coverage_months, 24); assert.equal(item.provenance.historyCoverageMonths, 24);
  }
  assert.equal(Object.keys(runtime.historicalMetricProvenanceByInventoryEntityKey).length, 1);
  assert.equal(Object.keys(runtime.historicalMetricProvenanceByInventoryRowKey).length, 2);
  for (const item of Object.values(runtime.historicalMetricProvenanceByInventoryEntityKey)) assert.equal(item.historyCoverageMonths, 24);
  for (const item of Object.values(runtime.historicalMetricProvenanceByInventoryRowKey)) assert.equal(item.historyCoverageMonths, 24);
  assert.equal(runtime.historicalMetricsSummary.includedRowCount, 24);
  evidence.push(metric);
});
test("v2 signature invalidates old model; window and policy versions unchanged", () => {
  assert.equal(agg.AGGREGATION_MODEL_VERSION, "consumption-history-aggregation-v2");
  assert.equal(root.application.historicalInventoryMetricsService.HISTORICAL_METRIC_MODEL_VERSION, "historical-inventory-metrics-v2");
  assert.equal(agg.WINDOW_MODEL_VERSION, "historical-metrics-window-v1");
  const { input } = aggregate(months(12));
  const old = svc.historicalMetricInputSignature(input, { aggregationModelVersion: "consumption-history-aggregation-v1" });
  const current = svc.historicalMetricInputSignature(input, { aggregationModelVersion: agg.AGGREGATION_MODEL_VERSION });
  assert.notEqual(old, current); assert.ok(current.includes("historical-inventory-metrics-v2"));
  evidence.push(current);
});

test("version invalidation schedules one current producer build; Slow/Dead consumes its result", () => {
  const { input } = aggregate(months(24, period => period === "2026-01" ? 10 : 0));
  const signature = svc.buildHistoricalMetricRuntime(input).historicalMetricsInputSignature;
  const oldSignature = signature.replaceAll("-v2", "-v1");
  const tasks = [];
  const coordinator = root.application.historicalMetricsRuntimeCoordinator.createHistoricalMetricsRuntimeCoordinator({
    buildRuntime: args => svc.buildHistoricalMetricRuntime({ ...args, evaluatedAt: "2026-08-31T00:00:00.000Z" }),
    scheduleTask: task => tasks.push(task), clock: () => "2026-08-31T00:00:00.000Z"
  });
  coordinator.requestBuild({ inputSignature: oldSignature, buildInput: input });
  coordinator.requestBuild({ inputSignature: signature, buildInput: input });
  coordinator.requestBuild({ inputSignature: signature, buildInput: input });
  assert.equal(tasks.length, 2);
  tasks.shift()(); tasks.shift()();
  const state = coordinator.getState();
  assert.equal(state.actualBuildCount, 1); assert.equal(state.staleCompletionCount, 1);
  assert.equal(state.completedInputSignature, signature);
  coordinator.requestBuild({ inputSignature: signature, buildInput: input });
  assert.equal(tasks.length, 0);
  const before = sha(state.result);
  const slowDeadService = root.application.slowDeadRecoveryCaseService.createSlowDeadRecoveryCaseService({ conditionEngine: root.slowDead.conditionEngine });
  const cases = slowDeadService.buildSlowDeadRecoveryCases({ inventoryRows: input.inventoryPackage.buildData.packageRows, inventoryPackage: input.inventoryPackage, historicalRuntime: state.result, evaluatedAt: "2026-08-31T00:00:00.000Z" });
  assert.equal(cases.cases.length, 1);
  assert.equal(cases.cases[0].condition_code, "slow_moving_candidate");
  assert.equal(sha(state.result), before);
});

const failed = results.filter(item => item.status === "FAIL");
console.log(JSON.stringify({ classification: "synthetic", passed: results.length - failed.length, total: results.length, results, evidenceSha256: sha(evidence) }, null, 2));
if (failed.length) process.exitCode = 1;
