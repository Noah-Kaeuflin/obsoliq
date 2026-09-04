// SYNTHETIC TEST DATA. Standalone RED reproducer for the DFA01 section 15 stop gate.
// No fixture, derived metric or expected condition is written into product state.
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { chromium, productUrl } = require("./smoke-runtime.cjs");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const pageErrors = [];
  const consoleErrors = [];
  const externalRequests = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("request", request => {
      if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
    });
    await page.addInitScript(() => { window.__OBSOLIQ_TEST_MODE__ = true; });
    await page.goto(productUrl);
    await page.waitForFunction(() => Boolean(window.__obsoliqTestBridge));
    const evidence = await page.evaluate(async () => {
      const bridge = window.__obsoliqTestBridge;
      const root = window.ObsoliQ;
      const analysisAsOf = { date: "2026-03-31", source: "user_confirmed", userConfirmed: true };
      const dates = Array.from({ length: 24 }, (_, index) => (
        new Date(Date.UTC(2024, 3 + index, 15)).toISOString().slice(0, 10)
      ));
      const quantity = date => date === "2025-08-15" ? 10 : 0;
      const summary = () => {
        const model = bridge.getInventoryRiskPageModelForTest();
        return {
          numerator: model.summary.evidenceReadyCount,
          denominator: model.summary.evidenceTotalCount,
          readiness: model.summary.evidenceReadiness,
          slowDeadExposure: model.summary.financials.slowDeadExposure
        };
      };
      const financials = rows => ({
        rowCount: rows.length,
        stockValue: bridge.sumForTest(rows, "stock_value"),
        recoveryPotential: bridge.sumForTest(rows, "recovery_potential"),
        stockValueEvidence: bridge.numericAggregateForTest(rows, "stock_value"),
        recoveryEvidence: bridge.numericAggregateForTest(rows, "recovery_potential"),
        rows: rows.map(row => [row.inventory_row_key, row.stock_quantity, row.stock_value, row.recovery_potential])
      });
      const describeMetric = metric => ({
        match: metric.matchType,
        status: metric.history_metric_status,
        includedRows: metric.included_row_count,
        unit: metric.unit,
        inventoryUnit: metric.inventory_unit,
        net12: metric.net_consumption_quantity_12m,
        monthsSince: metric.months_since_last_consumption,
        completeness: metric.history_completeness,
        coveragePresent: Object.hasOwn(metric, "history_coverage_months"),
        coverageMonths: metric.history_coverage_months ?? null,
        coveredCalendarMonths12: metric.provenance.coveredCalendarMonthCount,
        coverageStart: metric.history_coverage_start,
        coverageEnd: metric.history_coverage_end,
        limitations: metric.history_metric_limitation_codes
      });

      await bridge.loadSample();
      const inventoryBefore = bridge.getEnrichedRowsForTest();
      const before = { summary: summary(), financials: financials(inventoryBefore) };
      const selected = inventoryBefore.find(row => row.material_id === "MAT-1005");
      if (!selected) throw new Error("Required unchanged sample entity MAT-1005 is absent.");
      const header = "material_id,plant,posting_date,consumption_quantity,base_unit,movement_type,document_id,document_item,storage_location";
      const csv = [header, ...dates.map((date, index) => [
        selected.material_id, selected.plant || "", date, quantity(date), "EA", "261",
        `SYN-DFA-${String(index + 1).padStart(3, "0")}`, "0001", "SYN-01"
      ].join(","))].join("\n");
      const imported = await bridge.importConsumptionHistoryTextForTest(csv, "SYNTHETIC-DFA01-history.csv", {
        suppressFeedback: true,
        semanticPolicy: { analysisAsOf, reviewConfirmed: true }
      });
      await bridge.waitForHistoricalMetricsRuntimeForTest();
      const historical = bridge.getHistoricalMetricsRuntimeResultForTest();
      const key = root.data.consumptionHistoryRelationshipEngine.entityKey(selected.material_id, selected.plant || "");
      const metric = historical.historicalMetricsByInventoryEntityKey[key];
      const slowDead = bridge.getSlowDeadRecoveryCaseRuntimeForTest();
      const selectedCase = slowDead.result.cases.find(item => item.material_id === selected.material_id);
      const actualImport = {
        importStatus: imported.status,
        readiness: bridge.getActiveConsumptionHistoryPackage().interpretationMetadata.historyReadiness,
        historicalStatus: historical.status,
        metric: describeMetric(metric),
        slowDeadStatus: slowDead.status,
        conditionCounts: slowDead.summary.conditionCounts,
        selectedCondition: selectedCase?.condition_code,
        selectedLimitations: selectedCase?.limitation_codes,
        after: { summary: summary(), financials: financials(bridge.getEnrichedRowsForTest()) }
      };

      // Isolate the producer/consumer defect using the existing service-test boundary.
      // These explicitly unit-bearing synthetic inputs never enter the app registry.
      const inventoryRows = [{
        inventory_row_key: "INV-SYN-DFA-001", material_id: "000-DFA-001", plant: "SYN-P1",
        stock_quantity: 100, stock_value: 1000, base_unit: "EA", row_number: 1
      }];
      const historyRows = dates.map((date, index) => ({
        package_row_key: `CH-SYN-DFA-${index + 1}`, material_id: "000-DFA-001", plant: "SYN-P1",
        normalized_posting_date: date, normalized_period: date.slice(0, 7),
        temporal_precision: "day", temporal_parse_status: "valid", temporal_status: "valid",
        movement_semantic: "consumption", net_consumption_quantity: quantity(date),
        normalized_base_unit: "EA", base_unit: "EA", unit_status: "single",
        aggregation_eligible: true, duplicate_semantic: "unique", event_identity_status: "complete",
        event_identity_key: `DOC-SYN-DFA-${index + 1}`
      }));
      const inventoryPackage = {
        packageId: "PKG-SYN-DFA-INV", packageType: "inventory_snapshot", datasetId: "DS-SYN-DFA-INV",
        revision: 1, status: "ready", buildData: { packageRows: inventoryRows }
      };
      const historyPackage = {
        packageId: "PKG-SYN-DFA-CH", packageType: "consumption_history", datasetId: "DS-SYN-DFA-CH",
        revision: 1, status: "ready", packageValidation: { statusKey: "ready" },
        interpretationMetadata: { trustState: "trusted", semanticPolicySignature: "synthetic-service-fixture" },
        buildData: { packageRows: historyRows, buildMetadata: { historyReadiness: { status: "ready", analysisAsOf } } }
      };
      const service = root.application.historicalInventoryMetricsService.createHistoricalInventoryMetricsService({
        relationshipEngine: root.data.consumptionHistoryRelationshipEngine,
        aggregationEngine: root.data.consumptionHistoryAggregationEngine
      });
      const runtime = service.buildHistoricalMetricRuntime({
        inventoryPackage, historyPackage, analysisAsOf, evaluatedAt: "2026-03-31T00:00:00.000Z"
      });
      const isolatedMetric = Object.values(runtime.historicalMetricsByInventoryEntityKey)[0];
      const condition = root.slowDead.conditionEngine.evaluateCondition({
        inventoryEvidence: inventoryRows[0], historicalEvidence: isolatedMetric,
        relationshipEvidence: { matchType: isolatedMetric.matchType }, historicalRuntime: runtime
      });
      return {
        classification: "synthetic", analysisAsOf, before, actualImport,
        canonicalUnitFields: ["base_unit", "inventory_unit", "stock_unit"].filter(field => (
          Object.hasOwn(root.core.canonical.inventoryFieldDefinitions, field)
        )),
        isolated: { metric: describeMetric(isolatedMetric), condition: condition.condition_code, limitations: condition.limitation_codes }
      };
    });

    // Prerequisites must pass before a product-contract failure can be claimed.
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(externalRequests, []);
    assert.equal(evidence.before.financials.rowCount, 102);
    assert.equal(evidence.actualImport.importStatus, "loaded");
    assert.equal(evidence.actualImport.readiness.status, "ready");
    assert.equal(evidence.actualImport.readiness.readyRowCount, 24);
    assert.deepEqual(evidence.actualImport.after.financials, evidence.before.financials);
    assert.equal(evidence.isolated.metric.status, "available");
    assert.equal(evidence.isolated.metric.match, "exact_material_plant");
    assert.equal(evidence.isolated.metric.includedRows, 24);
    assert.equal(evidence.isolated.metric.coveredCalendarMonths12, 12);
    assert.equal(evidence.isolated.metric.completeness, 1);
    assert.equal(evidence.isolated.metric.net12, 10);
    assert.equal(evidence.isolated.metric.monthsSince, 7);
    assert.deepEqual(evidence.isolated.metric.limitations, []);

    const failures = [];
    for (const [name, check] of [
      ["inventory-unit-canonical-contract", () => assert.ok(evidence.canonicalUnitFields.length > 0,
        "Inventory has no canonical quantity-unit field; a history unit cannot supply inventory evidence.")],
      ["historical-to-slow-dead-contract", () => assert.equal(evidence.isolated.condition, "slow_moving_candidate",
        `Complete exact-match evidence must reach classification. Producer coverage field present: ${evidence.isolated.metric.coveragePresent}; limitations: ${evidence.isolated.limitations.join(",")}`)]
    ]) {
      try { check(); } catch (error) {
        if (!(error instanceof assert.AssertionError)) throw error;
        failures.push({ name, message: error.message });
      }
    }
    const evidenceSha256 = createHash("sha256").update(JSON.stringify(evidence)).digest("hex");
    for (const snapshot of [evidence.before, evidence.actualImport.after]) {
      snapshot.financialRowsSha256 = createHash("sha256").update(JSON.stringify(snapshot.financials.rows)).digest("hex");
      delete snapshot.financials.rows;
    }
    console.log(JSON.stringify({
      browserVersion: browser.version(), evidence, evidenceSha256, failures,
      contractTests: { passed: 2 - failures.length, failed: failures.length, total: 2 },
      pageErrors, consoleErrors, externalRequests
    }, null, 2));
    if (failures.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
