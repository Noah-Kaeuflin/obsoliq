(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function runtimeFixture({ datasetId = "DS-SD", entityCount = 1, metricFor = () => ({}) } = {}) {
    const inventoryRows = [];
    const inventoryEntitiesByKey = {};
    const matchesByInventoryEntityKey = {};
    const metricsByInventoryEntityKey = {};
    for (let index = 0; index < entityCount; index += 1) {
      const material = `MAT-SD-${String(index + 1).padStart(4, "0")}`;
      const plant = `P${index % 4}`;
      const entityKey = `material:${material}|plant:${plant}`;
      const rowA = {
        inventory_row_key: `INV-SD-${String(index + 1).padStart(4, "0")}-A`,
        row_number: index * 2 + 1,
        material_id: material,
        material_description: `Slow Dead Material ${index + 1}`,
        plant,
        stock_quantity: 60,
        base_unit: "EA",
        stock_value: 6000,
        no_need_value: index % 6 === 4 ? 3000 : 0
      };
      const rowB = {
        ...rowA,
        inventory_row_key: `INV-SD-${String(index + 1).padStart(4, "0")}-B`,
        row_number: index * 2 + 2,
        stock_quantity: 40,
        stock_value: 4000
      };
      inventoryRows.push(rowA, rowB);
      inventoryEntitiesByKey[entityKey] = {
        inventoryEntityKey: entityKey,
        materialKey: `material:${material}`,
        materialId: material,
        plant,
        rowKeys: [rowA.inventory_row_key, rowB.inventory_row_key],
        rowNumbers: [rowA.row_number, rowB.row_number],
        stockQuantity: 100,
        inventoryUnit: "EA"
      };
      matchesByInventoryEntityKey[entityKey] = {
        relationshipState: "exact_material_plant",
        matchType: "exact_material_plant",
        inventoryEntityKey: entityKey,
        historyEntityKey: entityKey,
        inventoryRowKeys: [rowA.inventory_row_key, rowB.inventory_row_key]
      };
      metricsByInventoryEntityKey[entityKey] = {
        inventoryEntityKey: entityKey,
        matchType: "exact_material_plant",
        months_since_last_consumption: 20,
        net_consumption_quantity_3m: 0,
        net_consumption_quantity_6m: 0,
        net_consumption_quantity_12m: 0,
        average_monthly_consumption_12m: 0,
        active_consumption_months_12m: 0,
        movement_frequency_12m: 0,
        intermittency_ratio_12m: 1,
        history_coverage_months: 12,
        history_completeness: 1,
        inventory_coverage_months: null,
        history_metric_status: "available",
        history_metric_limitation_codes: [],
        ...metricFor(index)
      };
    }
    const relationshipResult = {
      status: "executed",
      relationshipModelVersion: "inventory-history-relationship-v1",
      relationshipSignature: `relationship-${datasetId}`,
      inventoryPackageId: `PKG-INV-${datasetId}`,
      inventoryPackageRevision: 1,
      historyPackageId: `PKG-CH-${datasetId}`,
      historyPackageRevision: 1,
      inventoryEntitiesByKey,
      matchesByInventoryEntityKey,
      unmatchedInventoryEntities: [],
      ambiguousRelationships: [],
      invalidKeyRelationships: []
    };
    const runtime = {
      status: "available",
      completedInputSignature: `hist-${datasetId}`,
      result: {
        status: "available",
        historicalMetricModelVersion: "historical-inventory-metrics-v1",
        historicalMetricsInputSignature: `hist-${datasetId}`,
        inventoryHistoryRelationshipResult: relationshipResult,
        historicalMetricsByInventoryEntityKey: metricsByInventoryEntityKey,
        historicalMetricProvenanceByInventoryEntityKey: {}
      }
    };
    return {
      inventoryPackage: {
        packageId: `PKG-INV-${datasetId}`,
        packageType: "inventory_snapshot",
        datasetId,
        revision: 1
      },
      historyPackage: {
        packageId: `PKG-CH-${datasetId}`,
        packageType: "consumption_history",
        datasetId: `${datasetId}-CH`,
        revision: 1
      },
      inventoryRows,
      historicalRuntime: runtime,
      relationshipResult
    };
  }

  test("AP 16.4d.1 Recovery Case Service creates one case per Inventory entity", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.slowDead.conditionEngine.createSlowDeadConditionEngine();
    const service = app.ObsoliQ.application.slowDeadRecoveryCaseService.createSlowDeadRecoveryCaseService({ conditionEngine: engine });
    const input = runtimeFixture({ entityCount: 1 });
    const before = JSON.stringify(input);
    const result = service.buildSlowDeadRecoveryCases(input);

    assert.equal(result.status, "available", "Age-only evidence may create Non-Moving but not Dead Stock");
    assert.equal(result.summary.evaluatedEntityCount, 1, "Exactly one entity should be evaluated");
    assert.equal(result.cases.length, 1, "Two Inventory rows for one entity should produce one Case");
    assert.equal(result.cases[0].inventory_row_keys.length, 2, "Case should retain both source row keys");
    assert.equal(result.summary.caseCount, 1, "Summary should be entity-deduplicated");
    assert.equal(JSON.stringify(input), before, "Service must not mutate input packages, rows or runtime");
  });

  test("AP 16.4d.1 Recovery Case Service has stable Case IDs and complete provenance", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.slowDead.conditionEngine.createSlowDeadConditionEngine();
    const service = app.ObsoliQ.application.slowDeadRecoveryCaseService.createSlowDeadRecoveryCaseService({ conditionEngine: engine });
    const input = runtimeFixture({ entityCount: 1 });
    input.inventoryRows[0].no_need_value = 5000;
    input.inventoryRows[1].no_need_value = 5000;
    const first = service.buildSlowDeadRecoveryCases(input);
    const second = service.buildSlowDeadRecoveryCases(input);
    const changedDataset = service.buildSlowDeadRecoveryCases({
      ...input,
      inventoryPackage: { ...input.inventoryPackage, datasetId: "DS-SD-OTHER" }
    });
    const caseRecord = first.cases[0];

    assert.equal(first.cases[0].case_id, second.cases[0].case_id, "Case ID should be stable for same dataset and entity");
    assert.notEqual(first.cases[0].case_id, changedDataset.cases[0].case_id, "Case ID should change when dataset identity changes");
    assert.equal(caseRecord.condition_code, "dead_stock_candidate", "Independent demand evidence should unlock Dead Stock Candidate");
    assert.ok(Boolean(caseRecord.provenance.inventoryPackage.packageId), "Inventory package provenance should exist");
    assert.ok(Boolean(caseRecord.provenance.historyPackage.packageId), "History package provenance should exist");
    assert.equal(caseRecord.provenance.condition_model_version, "slow-dead-condition-v1", "Condition model provenance should exist");
    assert.ok(Boolean(caseRecord.case_fingerprint), "Case fingerprint should be deterministic and present");
  });

  test("AP 16.4d.2.1 Recovery Case Service preserves nullable exposure and Owner Context", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.slowDead.conditionEngine.createSlowDeadConditionEngine();
    const service = app.ObsoliQ.application.slowDeadRecoveryCaseService.createSlowDeadRecoveryCaseService({ conditionEngine: engine });
    const missingInput = runtimeFixture({ entityCount: 1 });
    const entityKey = Object.keys(missingInput.relationshipResult.inventoryEntitiesByKey)[0];
    missingInput.inventoryRows.forEach(row => {
      row.stock_value = "";
      row.mrp_controller = "MRP-17";
    });
    missingInput.ownerContextByInventoryEntityKey = {
      [entityKey]: {
        owner_function: "Material Planning",
        owner_reference: "MRP-17",
        owner_reference_field: "mrp_controller",
        owner_source: "inventory",
        owner_assignment_confidence: "High"
      }
    };
    const missingResult = service.buildSlowDeadRecoveryCases(missingInput);
    const zeroInput = runtimeFixture({ datasetId: "DS-SD-ZERO", entityCount: 1 });
    zeroInput.inventoryRows.forEach(row => {
      row.stock_value = 0;
    });
    const zeroResult = service.buildSlowDeadRecoveryCases(zeroInput);

    assert.equal(missingResult.cases[0].stock_value, null, "Missing stock value should remain nullable on the Case contract");
    assert.equal(missingResult.summary.inventoryExposureAvailableCaseCount, 0, "Missing exposure should not count as available");
    assert.equal(missingResult.summary.inventoryExposureUnavailableCaseCount, 1, "Missing exposure should count as unavailable");
    assert.equal(missingResult.cases[0].owner_function, "Material Planning", "Owner Function should be projected into the Case");
    assert.equal(missingResult.cases[0].owner_reference, "MRP-17", "Owner reference should be projected into the Case");
    assert.equal(missingResult.cases[0].owner_source, "inventory", "Owner source should stay transparent context");
    assert.equal(zeroResult.cases[0].stock_value, 0, "Actual calculated zero should remain zero");
    assert.equal(zeroResult.summary.inventoryExposureAvailableCaseCount, 1, "Actual zero should count as available numeric exposure");
  });

  test("AP 16.4d.1 Recovery Case Service scales to 10k entity-level evaluations", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.slowDead.conditionEngine.createSlowDeadConditionEngine();
    const service = app.ObsoliQ.application.slowDeadRecoveryCaseService.createSlowDeadRecoveryCaseService({ conditionEngine: engine });
    const input = runtimeFixture({
      datasetId: "DS-SD-PERF",
      entityCount: 10000,
      metricFor: index => {
        const bucket = index % 6;
        if (bucket === 0) return { history_coverage_months: 4, history_completeness: 0.3, months_since_last_consumption: null };
        if (bucket === 1) return { months_since_last_consumption: 2, net_consumption_quantity_12m: 24, active_consumption_months_12m: 2, movement_frequency_12m: 2, intermittency_ratio_12m: 0.83, inventory_coverage_months: 45 };
        if (bucket === 2) return { months_since_last_consumption: 7, net_consumption_quantity_3m: 1, net_consumption_quantity_6m: 4, net_consumption_quantity_12m: 30, active_consumption_months_12m: 3, movement_frequency_12m: 3, intermittency_ratio_12m: 0.5, consumption_trend: "declining", consumption_trend_ratio: -0.4, inventory_coverage_months: 18 };
        if (bucket === 3) return { months_since_last_consumption: 13, net_consumption_quantity_12m: 8, active_consumption_months_12m: 1, movement_frequency_12m: 1 };
        if (bucket === 4) return {};
        return { months_since_last_consumption: 24 };
      }
    });
    input.inventoryRows.forEach((row, index) => {
      if (Math.floor(index / 2) % 6 === 4) row.no_need_value = 3000;
      if (Math.floor(index / 2) % 6 === 5) row.strategic_reserve = true;
    });
    const started = performance.now();
    const result = service.buildSlowDeadRecoveryCases(input);
    const durationMs = performance.now() - started;

    assert.equal(result.summary.evaluatedEntityCount, 10000, "All entities should be evaluated once");
    assert.ok(result.summary.caseCount >= 9999, "Large evaluation should create expected Case records except no-case entities");
    assert.ok(result.summary.conditionCounts.dead_stock_candidate > 0, "Performance fixture should include Dead Stock Candidate");
    assert.ok(result.summary.conditionCounts.strategic_reserve > 0, "Performance fixture should include Strategic Reserve");
    assert.ok(durationMs < 12000, `10k Slow / Dead gate should finish under 12s; actual ${Math.round(durationMs)}ms`);
  });
})();
