(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function semanticRow(index) {
    const materialIndex = index % 10000;
    const month = String((index % 12) + 1).padStart(2, "0");
    return {
      package_row_key: `CH-PERF-${String(index + 1).padStart(6, "0")}`,
      material_id: `MAT-PERF-${String(materialIndex).padStart(5, "0")}`,
      plant: `P${materialIndex % 8}`,
      normalized_posting_date: `2026-${month}-15`,
      normalized_period: `2026-${month}`,
      temporal_precision: "day",
      temporal_parse_status: "valid",
      temporal_status: "valid",
      movement_semantic: index % 17 === 0 ? "reversal" : "consumption",
      net_consumption_quantity: index % 17 === 0 ? -1 : 3,
      normalized_base_unit: "EA",
      base_unit: "EA",
      unit_status: "single",
      aggregation_eligible: true,
      duplicate_semantic: "unique",
      event_identity_status: "complete",
      event_identity_key: `DOC-PERF-${String(index + 1).padStart(6, "0")}`
    };
  }

  test("AP 16.4c Historical metrics scale to 10k Inventory and 50k History rows", async assert => {
    const app = await helpers.loadProductionApp();
    const relationshipEngine = app.ObsoliQ.data.consumptionHistoryRelationshipEngine;
    const aggregationEngine = app.ObsoliQ.data.consumptionHistoryAggregationEngine;
    const service = app.ObsoliQ.application.historicalInventoryMetricsService.createHistoricalInventoryMetricsService({
      relationshipEngine,
      aggregationEngine
    });
    const inventoryRows = Array.from({ length: 10000 }, (_value, index) => ({
      inventory_row_key: `INV-PERF-${String(index + 1).padStart(5, "0")}`,
      row_number: index + 1,
      material_id: `MAT-PERF-${String(index).padStart(5, "0")}`,
      plant: `P${index % 8}`,
      stock_quantity: 100 + (index % 50),
      base_unit: "EA"
    }));
    const historyRows = Array.from({ length: 50000 }, (_value, index) => semanticRow(index));
    const analysisAsOf = { date: "2026-12-31", source: "user_confirmed", userConfirmed: true };
    const historyPackage = {
      packageId: "PKG-CH-PERF",
      packageType: "consumption_history",
      datasetId: "DS-CH-PERF",
      revision: 1,
      status: "ready",
      packageValidation: { statusKey: "ready" },
      interpretationMetadata: { trustState: "trusted", semanticPolicySignature: "semantic-perf", historyReadiness: { status: "ready", analysisAsOf } },
      freshness: { analysisAsOf },
      buildData: {
        packageRows: historyRows,
        buildMetadata: { semanticPolicySignature: "semantic-perf", historyReadiness: { status: "ready", analysisAsOf } }
      }
    };
    const started = performance.now();
    const runtime = service.buildHistoricalMetricRuntime({
      inventoryPackage: {
        packageId: "PKG-INV-PERF",
        packageType: "inventory_snapshot",
        datasetId: "DS-INV-PERF",
        revision: 1,
        status: "ready",
        buildData: { packageRows: inventoryRows, buildMetadata: { datasetId: "DS-INV-PERF" } }
      },
      historyPackage,
      inventoryRows,
      historyRows,
      analysisAsOf,
      semanticPolicySignature: "semantic-perf",
      evaluatedAt: "2026-08-21T00:00:00.000Z"
    });
    const durationMs = performance.now() - started;

    assert.notEqual(runtime.status, "unavailable", "Large historical metric runtime should execute");
    assert.equal(runtime.historicalMetricsSummary.matchedInventoryEntityCount, 10000, "All 10k inventory entities should match");
    assert.equal(Object.keys(runtime.historicalMetricsByInventoryEntityKey).length, 10000, "Metrics should be produced per inventory entity");
    assert.ok(durationMs < 20000, `10k/50k historical metric gate should finish under 20s; actual ${Math.round(durationMs)}ms`);
  });
})();
