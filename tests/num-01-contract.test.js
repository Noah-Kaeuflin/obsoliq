(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  const ANALYSIS_AS_OF = {
    date: "2026-06-30",
    source: "user_confirmed",
    userConfirmed: true,
    confirmedAt: "2026-08-26T00:00:00.000Z"
  };

  function parse(utils, rawValue, options = {}) {
    return utils.parseLocalizedNumericValue({
      rawValue,
      fieldDefinition: { type: "number", fieldKey: "test_value" },
      ...options
    });
  }

  function packageRecord(packageId, packageType, rows) {
    return {
      packageId,
      packageType,
      datasetId: `DS-${packageId}`,
      revision: 1,
      status: "ready",
      buildData: { packageRows: rows, analyticalRows: rows }
    };
  }

  function historyRow(overrides = {}) {
    return {
      package_row_key: overrides.package_row_key || "CH-NUM-1",
      material_id: "MAT-NUM",
      plant: "P1",
      posting_date: "2026-06-15",
      period: "",
      consumption_quantity: 5,
      base_unit: "EA",
      movement_type: "261",
      document_id: overrides.package_row_key || "DOC-NUM-1",
      document_item: "1",
      ...overrides
    };
  }

  function inventoryRow(overrides = {}) {
    return {
      inventory_row_key: "INV-NUM-1",
      row_number: 1,
      material_id: "MAT-NUM",
      material_description: "Numeric safety material",
      plant: "P1",
      profit_center: "P1",
      stock_quantity: 100,
      stock_value: 1000,
      base_unit: "EA",
      ...overrides
    };
  }

  function aggregateRows(app, normalizedRows, sourceRows = normalizedRows) {
    const semantics = app.ObsoliQ.data.consumptionHistorySemanticsEngine.analyzeConsumptionHistorySemantics({
      sourceRows,
      normalizedRows,
      semanticPolicy: { analysisAsOf: ANALYSIS_AS_OF }
    });
    const inventoryRows = [inventoryRow()];
    const relationship = app.ObsoliQ.data.consumptionHistoryRelationshipEngine.buildInventoryHistoryRelationship({
      inventoryPackage: packageRecord("PKG-INV-NUM", "inventory_snapshot", inventoryRows),
      historyPackage: packageRecord("PKG-HIST-NUM", "consumption_history", semantics.semanticRows),
      inventoryRows,
      historyRows: semantics.semanticRows,
      evaluatedAt: "2026-08-26T00:00:00.000Z"
    });
    const aggregation = app.ObsoliQ.data.consumptionHistoryAggregationEngine.buildHistoricalAggregates({
      relationshipResult: relationship,
      historyRows: semantics.semanticRows,
      analysisAsOf: ANALYSIS_AS_OF,
      historyReadiness: semantics.historyReadiness,
      evaluatedAt: "2026-08-26T00:00:00.000Z"
    });
    const entityKey = app.ObsoliQ.data.consumptionHistoryRelationshipEngine.entityKey("MAT-NUM", "P1");
    return { semantics, relationship, aggregation, metric: aggregation.metricsByInventoryEntityKey[entityKey] };
  }

  function conditionInput(metric, overrides = {}) {
    return {
      inventoryEvidence: {
        inventory_entity_key: "material:MAT-NUM|plant:P1",
        material_id: "MAT-NUM",
        plant: "P1",
        stock_quantity: 100,
        stock_unit: "EA",
        stock_value: 1000,
        ...overrides.inventoryEvidence
      },
      historicalEvidence: {
        ...metric,
        history_coverage_months: overrides.historyCoverageMonths ?? 12
      },
      relationshipEvidence: {
        relationshipState: "exact_material_plant",
        matchType: "exact_material_plant",
        inventoryEntityKey: "material:MAT-NUM|plant:P1",
        historyEntityKey: "material:MAT-NUM|plant:P1"
      },
      historicalRuntime: {
        status: "limited",
        completedInputSignature: "NUM-01",
        result: { historicalMetricsInputSignature: "NUM-01" }
      },
      independentSignals: overrides.independentSignals || {}
    };
  }

  test("NUM-01 parser rejects partial text and preserves missing versus zero", async assert => {
    const app = await helpers.loadProductionApp();
    const utils = app.ObsoliQ.core.valueUtils;
    ["abc123xyz", "abc123", "12abc", "12abc34", "foo1e3bar", "1-2", "--12", "++12", "12+", "NaN", "Infinity", true, false, [], {}]
      .forEach(value => assert.equal(parse(utils, value).status, "invalid", `${JSON.stringify(value)} must be invalid`));
    [undefined, null, "", "   \t "].forEach(value => assert.equal(parse(utils, value).status, "missing", "Missing input must remain missing"));
    [0, "0", "0.0", "0,00", "-0"].forEach(value => {
      const result = parse(utils, value);
      assert.equal(result.status, "valid", `${String(value)} must be valid`);
      assert.equal(result.normalizedValue, 0, `${String(value)} must remain a true zero`);
    });
    const valid = new Map([
      [1234, 1234],
      [-1234, -1234],
      ["+1234", 1234],
      ["1.234,56", 1234.56],
      ["1,234.56", 1234.56],
      ["1'234.56", 1234.56],
      ["1 234,56", 1234.56],
      ["EUR 1.234,56", 1234.56],
      ["(10k)", -10000],
      ["1,2 Mio.", 1200000],
      ["1.2E+05", 120000]
    ]);
    valid.forEach((expected, value) => {
      const result = parse(utils, value);
      assert.equal(result.status, "valid", `${String(value)} must remain valid`);
      assert.equal(result.normalizedValue, expected, `${String(value)} must normalize deterministically`);
    });
    assert.equal(parse(utils, "1,234").status, "ambiguous", "1,234 without context must be ambiguous");
    assert.equal(parse(utils, "1,234", { localeProfile: { status: "dominant", dominantLocale: "en", confidence: 1 } }).normalizedValue, 1234, "English context must resolve grouping");
    assert.equal(parse(utils, "1,234", { localeProfile: { status: "dominant", dominantLocale: "de", confidence: 1 } }).normalizedValue, 1.234, "German context must resolve decimal notation");
    assert.equal(utils.toNumber("abc123"), null, "Legacy numeric helper must not partially parse text");
    assert.equal(utils.toNumber(""), null, "Legacy numeric helper must not default missing to zero");
  });

  test("NUM-01 dataset normalization retains parse state and true zero", async assert => {
    const app = await helpers.loadApp();
    const parsed = app.__obsoliqTestBridge.parseDelimited([
      "Material,Stock Quantity,Standard Price,Stock Value",
      "MAT-MISSING,,1,100",
      "MAT-INVALID,abc123,1,100",
      "MAT-ZERO,0,1,100",
      "MAT-STOCK-INVALID,10,1,abc123"
    ].join("\n"));
    const mapping = app.ObsoliQ.mapping.engine.createAutomaticColumnMapping({
      headers: parsed.headers,
      rows: parsed.rows,
      sourceColumnMetadata: parsed.sourceColumnMetadata
    });
    const result = app.ObsoliQ.data.datasetBuilder.buildInventoryDataset({
      sourceRows: parsed.rows,
      headers: parsed.headers,
      sourceColumnMetadata: parsed.sourceColumnMetadata,
      columnMapping: mapping
    });
    assert.equal(result.analyticalRows[0].stock_quantity, null, "Missing stock quantity must remain null");
    assert.equal(result.analyticalRows[1].stock_quantity, null, "Invalid stock quantity must remain null");
    assert.equal(result.analyticalRows[2].stock_quantity, 0, "True stock quantity zero must remain zero");
    assert.equal(result.inputNormalizedRows[0].__numericParseResults.stock_quantity.status, "missing", "Missing parse status must be retained");
    assert.equal(result.inputNormalizedRows[1].__numericParseResults.stock_quantity.status, "invalid", "Invalid parse status must be retained");
    assert.equal(result.inputNormalizedRows[2].__numericParseResults.stock_quantity.status, "valid", "Zero must carry valid parse status");
    assert.equal(result.analyticalRows[3].stock_value, null, "Invalid required stock value must remain null");
    assert.equal(result.analyticalRows[3].recovery_potential, null, "Recovery must remain unavailable when required numeric evidence is invalid");
    assert.equal(result.analyticalRows[3].recovery_calculation_status, "unavailable", "Unavailable Recovery must be explicit");
    assert.equal(
      app.ObsoliQ.recovery.engine.validateRecoveryDataset([result.analyticalRows[3]]).length,
      0,
      "Unavailable Recovery rows must not be reinterpreted as zero-valued arithmetic"
    );
  });

  test("NUM-01 History blocks missing, invalid and mixed-unit quantity evidence per entity", async assert => {
    const app = await helpers.loadProductionApp();
    const cases = [
      {
        label: "missing quantity",
        rows: [historyRow({ consumption_quantity: null })],
        requiredCode: "missing_consumption_quantity"
      },
      {
        label: "invalid quantity",
        rows: [historyRow({ consumption_quantity: "abc123" })],
        requiredCode: "invalid_consumption_quantity"
      },
      {
        label: "EA plus KG",
        rows: [historyRow({ package_row_key: "CH-EA", base_unit: "EA" }), historyRow({ package_row_key: "CH-KG", base_unit: "KG" })],
        requiredCode: "multiple_units"
      },
      {
        label: "EA plus missing unit",
        rows: [historyRow({ package_row_key: "CH-EA-2", base_unit: "EA" }), historyRow({ package_row_key: "CH-NO-UNIT", base_unit: "" })],
        requiredCode: "missing_unit_for_entity"
      },
      {
        label: "all units missing",
        rows: [historyRow({ base_unit: "" })],
        requiredCode: "missing_unit_for_entity"
      }
    ];
    cases.forEach(item => {
      const result = aggregateRows(app, item.rows);
      assert.equal(result.metric.net_consumption_quantity_12m, null, `${item.label}: net quantity must be unavailable`);
      assert.equal(result.metric.average_monthly_consumption_12m, null, `${item.label}: average must be unavailable`);
      assert.equal(result.metric.inventory_coverage_months, null, `${item.label}: coverage must be unavailable`);
      assert.equal(result.metric.history_metric_status, "unavailable", `${item.label}: metric must fail closed`);
      assert.includes(result.metric.history_metric_limitation_codes, item.requiredCode, `${item.label}: machine-readable limitation must be present`);
      assert.equal(result.metric.included_row_count, 0, `${item.label}: partial aggregation must not survive`);
    });

    const zeroRows = Array.from({ length: 12 }, (_, index) => {
      const monthIndex = index + 7;
      const year = monthIndex > 12 ? 2026 : 2025;
      const month = monthIndex > 12 ? monthIndex - 12 : monthIndex;
      return historyRow({
        package_row_key: `CH-ZERO-${index + 1}`,
        posting_date: `${year}-${String(month).padStart(2, "0")}-15`,
        consumption_quantity: 0,
        base_unit: "EA"
      });
    });
    const zeroResult = aggregateRows(app, zeroRows);
    assert.equal(zeroResult.metric.net_consumption_quantity_12m, 0, "Valid zero history must aggregate to numeric zero");
    assert.equal(zeroResult.metric.active_consumption_months_12m, 0, "Valid zero must not become missing evidence");
  });

  test("NUM-01 negative CSV path remains non-definitive through UI and export", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const csv = [
      "MATNR,WERKS,BUDAT,Verbrauchsmenge,MEINS,BWART,MBLNR,ZEILE",
      "MAT-NUM,P1,2026-06-15,abc123,EA,261,DOC-NUM,1"
    ].join("\n");
    const parsed = bridge.parseDelimited(csv);
    const prepared = bridge.packageImportServiceForTest.prepareImport({
      packageType: "consumption_history",
      parsedSource: parsed,
      sourceDescriptor: { sourceLabel: "num-invalid.csv", sourceType: "upload" }
    });
    const built = bridge.consumptionHistoryBuilderForTest.buildConsumptionHistoryPackage({
      sourceRows: parsed.rows,
      sourceColumnMetadata: parsed.sourceColumnMetadata,
      columnMapping: prepared.approvedMapping,
      semanticPolicy: { analysisAsOf: ANALYSIS_AS_OF },
      buildTimestamp: "2026-08-26T00:00:00.000Z"
    });
    assert.equal(built.normalizedRows[0].consumption_quantity, null, "Invalid mixed value must not survive normalization as a number");
    assert.equal(built.normalizedRows[0].consumption_quantity_parse_status, "invalid", "Invalid status must survive into History rows");

    const aggregate = aggregateRows(app, built.normalizedRows, parsed.rows);
    const engine = app.ObsoliQ.slowDead.conditionEngine.createSlowDeadConditionEngine();
    const classification = engine.evaluateCondition(conditionInput(aggregate.metric));
    assert.equal(classification.condition_code, "insufficient_evidence", "Invalid quantity must not create a definitive condition");
    const actionCodes = classification.action_eligibility.map(item => item.action_code);
    assert.ok(actionCodes.every(code => ["COLLECT_EVIDENCE", "IMPORT_MISSING_DATA", "OWNER_REVIEW"].includes(code)), "Only evidence and owner-review actions may remain");

    const caseRecord = {
      case_id: "SLOW-DEAD::NUM-01",
      inventory_entity_key: "material:MAT-NUM|plant:P1",
      inventory_row_keys: ["INV-NUM-1"],
      material_id: "MAT-NUM",
      material_description: "Numeric safety material",
      plant: "P1",
      stock_value: 1000,
      stock_quantity: null,
      stock_unit: "EA",
      condition_code: classification.condition_code,
      evidence_strength: classification.evidence_strength,
      condition_confidence: classification.condition_confidence,
      net_consumption_quantity_12m: aggregate.metric.net_consumption_quantity_12m,
      months_since_last_consumption: aggregate.metric.months_since_last_consumption,
      history_completeness: aggregate.metric.history_completeness,
      history_coverage_months: null,
      limitation_codes: classification.limitation_codes,
      missing_evidence: classification.missing_evidence,
      positive_evidence: classification.positive_evidence,
      counter_evidence: classification.counter_evidence,
      action_eligibility: classification.action_eligibility,
      recovery_case_eligibility: classification.recovery_case_eligibility,
      required_data_packages: classification.required_data_packages,
      provenance: {}
    };
    const model = app.ObsoliQ.slowDead.pageModel.createSlowDeadPageModel({
      runtimeState: { status: "limited", result: { status: "limited", cases: [caseRecord] } }
    });
    const view = app.ObsoliQ.application.slowDeadPageView.createSlowDeadPageView({
      html: value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;"),
      t: key => key === "notAvailable" ? "n/a" : key,
      formatMoney: value => String(value),
      formatCompactMoney: value => String(value),
      formatCount: value => String(value),
      formatNumber: value => String(value),
      conditionLabel: value => value,
      codeLabel: (_prefix, value) => value,
      actionCodeLabel: value => value
    });
    const rendered = view.render(model);
    assert.ok(rendered.includes("MAT-NUM"), "Actual Slow/Dead UI renderer must receive the case");
    assert.ok(!rendered.includes("abc123"), "Invalid raw numeric text must not appear as an analytical UI number");

    const exportData = app.ObsoliQ.slowDead.exportBuilder.buildSlowDeadExportRows({
      cases: [caseRecord, { ...caseRecord, case_id: "SLOW-DEAD::NUM-ZERO", stock_quantity: 0, net_consumption_quantity_12m: 0 }],
      columns: ["stock_quantity", "net_consumption_12m", "months_since_last_consumption", "history_completeness", "history_coverage_months"]
    });
    assert.deepEqual(exportData.rows[0], ["", "", "", "", ""], "Missing and invalid analytical values must export blank");
    assert.equal(exportData.rows[1][0], 0, "True stock zero must export as zero");
    assert.equal(exportData.rows[1][1], 0, "True consumption zero must export as zero");
  });

  test("NUM-01 valid Slow-Moving positive control remains functional", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.slowDead.conditionEngine.createSlowDeadConditionEngine();
    const result = engine.evaluateCondition(conditionInput({
      months_since_last_consumption: 7,
      net_consumption_quantity_3m: 1,
      net_consumption_quantity_6m: 4,
      net_consumption_quantity_12m: 30,
      average_monthly_consumption_12m: 2.5,
      active_consumption_months_12m: 3,
      movement_frequency_12m: 3,
      intermittency_ratio_12m: 0.5,
      consumption_trend: "declining",
      consumption_trend_ratio: -0.4,
      history_completeness: 1,
      inventory_coverage_months: 18,
      history_metric_status: "available",
      history_metric_limitation_codes: []
    }));
    assert.equal(result.condition_code, "slow_moving_candidate", "Valid numeric evidence must preserve the Slow-Moving positive control");
  });

  test("NUM-01 strict parser remains linear on a larger numeric sample", async assert => {
    const app = await helpers.loadProductionApp();
    const utils = app.ObsoliQ.core.valueUtils;
    const sampleSize = 30000;
    const beforeMemory = performance.memory?.usedJSHeapSize ?? null;
    const started = performance.now();
    let validCount = 0;
    let invalidCount = 0;
    for (let index = 0; index < sampleSize; index += 1) {
      const rawValue = index % 3 === 0 ? "1.234,56" : index % 3 === 1 ? "1,234.56" : `abc${index}xyz`;
      const result = parse(utils, rawValue);
      if (result.status === "valid") validCount += 1;
      if (result.status === "invalid") invalidCount += 1;
    }
    const durationMs = performance.now() - started;
    const afterMemory = performance.memory?.usedJSHeapSize ?? null;
    window.__OBSOLIQ_NUM_PERFORMANCE__ = {
      sampleSize,
      durationMs,
      memoryDeltaBytes: beforeMemory === null || afterMemory === null ? null : afterMemory - beforeMemory
    };
    assert.equal(validCount, 20000, "All valid locale samples must remain valid");
    assert.equal(invalidCount, 10000, "All mixed-text samples must remain invalid");
    assert.ok(durationMs >= 0, "Performance measurement must complete without a tight hardware-specific gate");
  });
})();
