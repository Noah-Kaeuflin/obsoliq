(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function semanticRow(index, quantity = 10) {
    const month = String(index + 1).padStart(2, "0");
    return {
      package_row_key: `CH-SVC-${month}`,
      material_id: "MAT-SVC",
      plant: "1000",
      normalized_posting_date: `2026-${month}-15`,
      normalized_period: `2026-${month}`,
      temporal_precision: "day",
      temporal_parse_status: "valid",
      temporal_status: "valid",
      movement_semantic: "consumption",
      net_consumption_quantity: quantity,
      normalized_base_unit: "EA",
      base_unit: "EA",
      unit_status: "single",
      aggregation_eligible: true,
      duplicate_semantic: "unique",
      event_identity_status: "complete",
      event_identity_key: `DOC-SVC-${month}`
    };
  }

  function inventoryPackage(rows, revision = 1) {
    return {
      packageId: "PKG-INV-SVC",
      packageType: "inventory_snapshot",
      datasetId: "DS-INV-SVC",
      revision,
      status: "ready",
      buildData: {
        packageRows: rows,
        buildMetadata: { datasetId: "DS-INV-SVC" }
      }
    };
  }

  function historyPackage(rows, revision = 1, policySignature = "semantic-policy-a") {
    const analysisAsOf = { date: "2026-12-31", source: "user_confirmed", userConfirmed: true };
    return {
      packageId: "PKG-CH-SVC",
      packageType: "consumption_history",
      datasetId: "DS-CH-SVC",
      revision,
      status: "ready",
      packageValidation: { statusKey: "ready" },
      interpretationMetadata: {
        trustState: "trusted",
        semanticPolicySignature: policySignature,
        historyReadiness: { status: "ready", analysisAsOf }
      },
      freshness: { analysisAsOf },
      buildData: {
        packageRows: rows,
        buildMetadata: {
          datasetId: "DS-CH-SVC",
          semanticPolicySignature: policySignature,
          historyReadiness: { status: "ready", analysisAsOf }
        }
      }
    };
  }

  test("AP 16.4c Historical Metrics Service assembles row views without duplicating entity totals", async assert => {
    const app = await helpers.loadProductionApp();
    const relationshipEngine = app.ObsoliQ.data.consumptionHistoryRelationshipEngine;
    const aggregationEngine = app.ObsoliQ.data.consumptionHistoryAggregationEngine;
    const service = app.ObsoliQ.application.historicalInventoryMetricsService.createHistoricalInventoryMetricsService({
      relationshipEngine,
      aggregationEngine
    });
    const inventoryRows = [
      { inventory_row_key: "INV-SVC-1", row_number: 1, material_id: "MAT-SVC", plant: "1000", stock_quantity: 60, base_unit: "EA" },
      { inventory_row_key: "INV-SVC-2", row_number: 2, material_id: "MAT-SVC", plant: "1000", stock_quantity: 40, base_unit: "EA" }
    ];
    const historyRows = Array.from({ length: 12 }, (_value, index) => semanticRow(index, 10));
    const runtime = service.buildHistoricalMetricRuntime({
      inventoryPackage: inventoryPackage(inventoryRows),
      historyPackage: historyPackage(historyRows),
      inventoryRows,
      historyRows,
      analysisAsOf: { date: "2026-12-31", source: "user_confirmed", userConfirmed: true },
      semanticPolicySignature: "semantic-policy-a",
      evaluatedAt: "2026-08-21T00:00:00.000Z"
    });
    const entityKey = relationshipEngine.entityKey("MAT-SVC", "1000");
    const metric = runtime.historicalMetricsByInventoryEntityKey[entityKey];

    assert.equal(runtime.status, "available", "Runtime should be available with complete 12-month evidence");
    assert.equal(runtime.historicalMetricsSummary.includedRowCount, 12, "Portfolio metric rows must not double-count repeated inventory row views");
    assert.equal(metric.sharedEntityMetric, true, "Repeated inventory rows for one entity should be marked as shared metrics");
    assert.equal(runtime.historicalMetricEntityKeyByInventoryRowKey["INV-SVC-1"], entityKey, "First row view should point to entity authority");
    assert.equal(runtime.historicalMetricEntityKeyByInventoryRowKey["INV-SVC-2"], entityKey, "Second row view should point to same entity authority");
    assert.equal(runtime.historicalMetricsByInventoryRowKey["INV-SVC-1"].net_consumption_quantity_12m, 120, "Row view should expose entity metric");
    assert.equal(runtime.historicalMetricsByInventoryRowKey["INV-SVC-2"].net_consumption_quantity_12m, 120, "Repeated row view should expose same entity metric");
    assert.ok(runtime.historicalMetricsInputSignature.includes("semantic-policy-a"), "Input signature should include semantic policy identity");
  });

  test("AP 16.4c Historical Metrics Service invalidates signatures for package, policy and as-of changes", async assert => {
    const app = await helpers.loadProductionApp();
    const relationshipEngine = app.ObsoliQ.data.consumptionHistoryRelationshipEngine;
    const aggregationEngine = app.ObsoliQ.data.consumptionHistoryAggregationEngine;
    const service = app.ObsoliQ.application.historicalInventoryMetricsService.createHistoricalInventoryMetricsService({
      relationshipEngine,
      aggregationEngine
    });
    const inventoryRows = [
      { inventory_row_key: "INV-SVC-1", row_number: 1, material_id: "MAT-SVC", plant: "1000", stock_quantity: 100, base_unit: "EA" }
    ];
    const historyRows = Array.from({ length: 12 }, (_value, index) => semanticRow(index, 10));
    const versions = {
      relationshipModelVersion: relationshipEngine.RELATIONSHIP_MODEL_VERSION,
      aggregationModelVersion: aggregationEngine.AGGREGATION_MODEL_VERSION,
      windowModelVersion: aggregationEngine.WINDOW_MODEL_VERSION
    };
    const base = service.historicalMetricInputSignature({
      inventoryPackage: inventoryPackage(inventoryRows, 1),
      historyPackage: historyPackage(historyRows, 1, "semantic-policy-a"),
      analysisAsOf: { date: "2026-12-31", source: "user_confirmed" },
      semanticPolicySignature: "semantic-policy-a"
    }, versions);
    const historyRevisionChanged = service.historicalMetricInputSignature({
      inventoryPackage: inventoryPackage(inventoryRows, 1),
      historyPackage: historyPackage(historyRows, 2, "semantic-policy-a"),
      analysisAsOf: { date: "2026-12-31", source: "user_confirmed" },
      semanticPolicySignature: "semantic-policy-a"
    }, versions);
    const inventoryRevisionChanged = service.historicalMetricInputSignature({
      inventoryPackage: inventoryPackage(inventoryRows, 2),
      historyPackage: historyPackage(historyRows, 1, "semantic-policy-a"),
      analysisAsOf: { date: "2026-12-31", source: "user_confirmed" },
      semanticPolicySignature: "semantic-policy-a"
    }, versions);
    const policyChanged = service.historicalMetricInputSignature({
      inventoryPackage: inventoryPackage(inventoryRows, 1),
      historyPackage: historyPackage(historyRows, 1, "semantic-policy-b"),
      analysisAsOf: { date: "2026-12-31", source: "user_confirmed" },
      semanticPolicySignature: "semantic-policy-b"
    }, versions);
    const asOfChanged = service.historicalMetricInputSignature({
      inventoryPackage: inventoryPackage(inventoryRows, 1),
      historyPackage: historyPackage(historyRows, 1, "semantic-policy-a"),
      analysisAsOf: { date: "2026-11-30", source: "user_confirmed" },
      semanticPolicySignature: "semantic-policy-a"
    }, versions);
    const blocked = service.buildHistoricalMetricRuntime({
      inventoryPackage: inventoryPackage(inventoryRows, 1),
      historyPackage: { ...historyPackage(historyRows, 1), interpretationMetadata: { trustState: "blocked" } },
      inventoryRows,
      historyRows,
      analysisAsOf: { date: "2026-12-31", source: "user_confirmed" }
    });

    assert.notEqual(base, historyRevisionChanged, "History Package revision should change metric signature");
    assert.notEqual(base, inventoryRevisionChanged, "Inventory Package revision should change metric signature");
    assert.notEqual(base, policyChanged, "Semantic policy signature should change metric signature");
    assert.notEqual(base, asOfChanged, "Analysis-as-of date should change metric signature");
    assert.equal(blocked.status, "unavailable", "Untrusted History interpretation should produce coherent unavailable runtime");
    assert.equal(Object.keys(blocked.historicalMetricsByInventoryEntityKey).length, 0, "Failed runtime should not expose partial metric maps");
  });
})();
