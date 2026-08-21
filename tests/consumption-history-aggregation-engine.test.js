(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function packageRecord({ packageId, packageType, revision = 1, rows = [] }) {
    return {
      packageId,
      packageType,
      datasetId: `DS-${packageId}`,
      revision,
      status: "ready",
      buildData: {
        packageRows: rows,
        buildMetadata: { datasetId: `DS-${packageId}` }
      }
    };
  }

  function semanticRow({ key, material = "MAT-WIN", plant = "1000", date = "", period = "", quantity = 1, unit = "EA", movement = "consumption", duplicate = "unique", eligible = true }) {
    const precision = date ? "day" : "month";
    return {
      package_row_key: key,
      material_id: material,
      plant,
      normalized_posting_date: date,
      normalized_period: period || date.slice(0, 7),
      temporal_precision: precision,
      temporal_parse_status: "valid",
      temporal_status: "valid",
      movement_semantic: movement,
      net_consumption_quantity: quantity,
      normalized_base_unit: unit,
      base_unit: unit,
      unit_status: "single",
      aggregation_eligible: eligible,
      duplicate_semantic: duplicate,
      event_identity_status: "complete",
      event_identity_key: key,
      aggregation_blocker_codes: movement === "unknown" ? ["unknown_movement_type"] : []
    };
  }

  test("AP 16.4c Aggregation Engine creates deterministic 3M/6M/12M metrics and exclusions", async assert => {
    const app = await helpers.loadProductionApp();
    const relationshipEngine = app.ObsoliQ.data.consumptionHistoryRelationshipEngine;
    const aggregationEngine = app.ObsoliQ.data.consumptionHistoryAggregationEngine;
    const inventoryRows = [
      { inventory_row_key: "INV-WIN", row_number: 1, material_id: "MAT-WIN", plant: "1000", stock_quantity: 222, base_unit: "EA" }
    ];
    const monthlyQuantities = [
      ["2025-07-15", 2],
      ["2025-08-15", 2],
      ["2025-09-15", 2],
      ["2025-10-15", 2],
      ["2025-11-15", 2],
      ["2025-12-15", 2],
      ["2026-01-15", 10],
      ["2026-02-15", 20],
      ["2026-03-15", 30],
      ["2026-04-15", 40],
      ["2026-05-15", 50],
      ["2026-06-15", 60]
    ];
    const historyRows = [
      ...monthlyQuantities.map(([date, quantity], index) => semanticRow({ key: `CH-WIN-${index + 1}`, date, quantity })),
      { ...semanticRow({ key: "CH-FUTURE", date: "2026-07-01", quantity: 999 }), temporal_parse_status: "future", temporal_status: "future" },
      semanticRow({ key: "CH-UNKNOWN", date: "2026-06-20", quantity: 0, movement: "unknown", eligible: false }),
      semanticRow({ key: "CH-DUP", date: "2026-05-20", quantity: 50, duplicate: "exact_source_duplicate", eligible: false })
    ];
    const relationshipResult = relationshipEngine.buildInventoryHistoryRelationship({
      inventoryPackage: packageRecord({ packageId: "PKG-INV-AGG", packageType: "inventory_snapshot", rows: inventoryRows }),
      historyPackage: packageRecord({ packageId: "PKG-CH-AGG", packageType: "consumption_history", rows: historyRows }),
      evaluatedAt: "2026-08-21T00:00:00.000Z"
    });
    const result = aggregationEngine.buildHistoricalAggregates({
      relationshipResult,
      historyRows,
      analysisAsOf: { date: "2026-06-30", source: "user_confirmed" },
      historyReadiness: { status: "ready" },
      semanticPolicySignature: "semantic-signature-a",
      historicalMetricModelVersion: "historical-inventory-metrics-v1",
      evaluatedAt: "2026-08-21T00:00:00.000Z"
    });
    const metric = result.metricsByInventoryEntityKey[relationshipEngine.entityKey("MAT-WIN", "1000")];
    const reasons = result.excludedRows.flatMap(row => row.exclusionReasons);

    assert.equal(result.status, "executed", "Aggregation should execute when a relationship exists");
    assert.equal(metric.net_consumption_quantity_3m, 150, "3M net consumption should use Apr-Jun 2026");
    assert.equal(metric.net_consumption_quantity_6m, 210, "6M net consumption should use Jan-Jun 2026");
    assert.equal(metric.net_consumption_quantity_12m, 222, "12M net consumption should use Jul 2025-Jun 2026");
    assert.equal(metric.average_monthly_consumption_12m, 18.5, "Average should divide by covered months");
    assert.equal(metric.active_consumption_months_12m, 12, "Active months should count months with positive net consumption");
    assert.equal(metric.movement_frequency_12m, 12, "Movement frequency should count eligible events only");
    assert.equal(metric.months_since_last_consumption, 0, "Last consumption in the as-of month should be zero months old");
    assert.equal(metric.consumption_trend, "increasing", "Recent three months should show increasing trend vs prior three");
    assert.equal(metric.inventory_coverage_months, 12, "Coverage should use stock quantity divided by average monthly consumption");
    assert.equal(metric.partial_current_period, false, "Last day of the month should not be partial");
    assert.includes(reasons, "future_movement", "Future movement should be excluded with provenance");
    assert.includes(reasons, "unknown_movement", "Unknown movement should be excluded with provenance");
    assert.includes(reasons, "exact_source_duplicate_ambiguity", "Exact source duplicate ambiguity should be excluded with provenance");
  });

  test("AP 16.4c Aggregation Engine keeps month precision truthful and avoids synthetic dates", async assert => {
    const app = await helpers.loadProductionApp();
    const relationshipEngine = app.ObsoliQ.data.consumptionHistoryRelationshipEngine;
    const aggregationEngine = app.ObsoliQ.data.consumptionHistoryAggregationEngine;
    const inventoryRows = [
      { inventory_row_key: "INV-MONTH", row_number: 1, material_id: "MAT-MONTH", plant: "", stock_quantity: 20, base_unit: "EA" }
    ];
    const historyRows = [
      semanticRow({ key: "CH-MONTH", material: "MAT-MONTH", plant: "", date: "", period: "2026-06", quantity: 4 })
    ];
    const relationshipResult = relationshipEngine.buildInventoryHistoryRelationship({
      inventoryPackage: packageRecord({ packageId: "PKG-INV-MONTH", packageType: "inventory_snapshot", rows: inventoryRows }),
      historyPackage: packageRecord({ packageId: "PKG-CH-MONTH", packageType: "consumption_history", rows: historyRows })
    });
    const result = aggregationEngine.buildHistoricalAggregates({
      relationshipResult,
      historyRows,
      analysisAsOf: { date: "2026-06-15", source: "user_confirmed" },
      historyReadiness: { status: "ready" }
    });
    const metric = result.metricsByInventoryEntityKey[relationshipEngine.entityKey("MAT-MONTH", "")];

    assert.equal(metric.last_consumption_date, null, "Month precision must not create a synthetic day-level date");
    assert.equal(metric.last_consumption_period, "2026-06", "Month precision should remain visible as period evidence");
    assert.equal(metric.last_consumption_precision, "month", "Precision should remain month");
    assert.equal(metric.partial_current_period, true, "Mid-month analysis as-of should be marked partial");
  });
})();
