(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function parseState(status, normalizedValue = null) {
    return { status, normalizedValue, reasonCodes: status === "valid" ? [] : [`test_${status}`] };
  }

  function numericRow(key, value, status, normalizedValue = null, extra = {}) {
    return {
      [key]: value,
      __numericParseResults: {
        [key]: parseState(status, normalizedValue)
      },
      ...extra
    };
  }

  function profileRows(key, values) {
    return values.map(value => ({ [key]: value }));
  }

  test("NUM-01.1 stock value aggregation distinguishes all evidence states", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const complete = bridge.numericAggregateForTest([
      numericRow("stock_value", 0, "valid", 0),
      numericRow("stock_value", 125, "valid", 125)
    ], "stock_value", { type: "currency" });
    assert.equal(complete.status, "complete", "Valid zero and a valid amount must form a complete aggregate");
    assert.equal(complete.value, 125, "A true zero must remain an additive zero");
    assert.equal(complete.validCount, 2, "Both valid values must be counted");

    [
      ["missing", null, "incomplete", "missingCount"],
      ["invalid", "abc", "invalid", "invalidCount"],
      ["ambiguous", "1,234", "ambiguous", "ambiguousCount"]
    ].forEach(([inputStatus, value, expectedStatus, countKey]) => {
      const result = bridge.numericAggregateForTest([
        numericRow("stock_value", 100, "valid", 100),
        numericRow("stock_value", value, inputStatus)
      ], "stock_value", { type: "currency" });
      assert.equal(result.status, expectedStatus, `${inputStatus} evidence must remain explicit`);
      assert.equal(result.value, null, `${inputStatus} evidence must not produce an apparently complete value`);
      assert.equal(result[countKey], 1, `${inputStatus} evidence must increment ${countKey}`);
    });

    assert.equal(bridge.convertMoneyValueForTest(null, "stock_value"), null, "Missing money must be unavailable");
    assert.equal(bridge.convertMoneyValueForTest("abc", "stock_value"), null, "Invalid money must be unavailable");
    assert.equal(bridge.convertMoneyValueForTest("1,234", "stock_value"), null, "Unresolved ambiguous money must be unavailable");
    assert.equal(bridge.convertMoneyValueForTest(0, "stock_value"), 0, "True money zero must remain zero");
    assert.equal(bridge.convertMoneyValueForTest("1.234,56", "stock_value"), 1234.56, "Valid localized money must normalize before conversion");
  });

  test("NUM-01.1 all money keys export missing evidence as blank and zero as numeric zero", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const keys = bridge.moneyKeysForTest();
    assert.ok(keys.length >= 10, "The representative money-key contract must cover the complete configured set");
    keys.forEach(key => {
      assert.equal(bridge.exportValueForTest(numericRow(key, null, "missing"), key), "", `${key}: missing must export blank`);
      assert.equal(bridge.exportValueForTest(numericRow(key, "bad", "invalid"), key), "", `${key}: invalid must export blank`);
      assert.equal(bridge.exportValueForTest(numericRow(key, "1,234", "ambiguous"), key), "", `${key}: ambiguous must export blank`);
      assert.equal(bridge.exportValueForTest(numericRow(key, 0, "valid", 0), key), 0, `${key}: true zero must export as numeric zero`);
      assert.equal(bridge.exportValueForTest(numericRow(key, "1.234,56", "valid", 1234.56), key), 1234.56, `${key}: valid money must export normalized`);
    });
  });

  test("NUM-01.1 quantity export and spreadsheet formula protection remain strict", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    assert.equal(bridge.exportValueForTest(numericRow("stock_quantity", null, "missing"), "stock_quantity"), "", "Missing quantity must export blank");
    assert.equal(bridge.exportValueForTest(numericRow("stock_quantity", "abc", "invalid"), "stock_quantity"), "", "Invalid quantity must export blank");
    assert.equal(bridge.exportValueForTest(numericRow("stock_quantity", "1,234", "ambiguous"), "stock_quantity"), "", "Ambiguous quantity must export blank");
    assert.equal(bridge.exportValueForTest(numericRow("stock_quantity", 0, "valid", 0), "stock_quantity"), 0, "True quantity zero must export as zero");
    assert.equal(bridge.exportValueForTest(numericRow("stock_quantity", "1.234,56", "valid", 1234.56), "stock_quantity"), 1234.56, "Valid quantity must export normalized");
    assert.equal(bridge.sanitizeSpreadsheetCellForTest("=2+2", { key: "material_description" }), "'=2+2", "Formula-like text must remain escaped");
    assert.equal(bridge.sanitizeSpreadsheetCellForTest("@SUM(A1:A2)", { key: "material_description" }), "'@SUM(A1:A2)", "At-prefixed formula text must remain escaped");
    assert.equal(bridge.sanitizeSpreadsheetCellForTest(0, { key: "stock_value" }), 0, "Numeric zero must stay numeric through sanitization");
  });

  test("NUM-01.1 portfolio and grouped financial sums expose incomplete evidence", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const workspace = bridge.excessDecisionWorkspaceModelForTest;
    const completeCases = [
      { material_id: "MAT-1", plant: "P1", gross_excess_value: 100, net_addressable_excess_value: 80, excess_overlap_value: 20, excess_opportunity_score: 60, priority: "High" },
      { material_id: "MAT-2", plant: "P1", gross_excess_value: 50, net_addressable_excess_value: 50, excess_overlap_value: 0, excess_opportunity_score: 40, priority: "Medium" }
    ];
    const complete = workspace.summarize(completeCases);
    assert.equal(complete.netAddressable.aggregate.status, "complete", "Complete portfolio evidence must be marked complete");
    assert.equal(complete.netAddressable.value, 130, "Complete portfolio sum must remain correct");
    assert.equal(complete.addressability.available, true, "Complete gross/net evidence must allow addressability");

    const incomplete = workspace.summarize([
      completeCases[0],
      { ...completeCases[1], net_addressable_excess_value: null }
    ]);
    assert.equal(incomplete.netAddressable.aggregate.status, "incomplete", "Missing portfolio money must mark the aggregate incomplete");
    assert.equal(incomplete.netAddressable.value, null, "Incomplete portfolio money must not expose a complete-looking sum");
    assert.equal(incomplete.addressability.available, false, "Addressability must be unavailable when one financial aggregate is incomplete");

    const invalid = workspace.summarize([
      completeCases[0],
      { ...completeCases[1], gross_excess_value: "abc" }
    ]);
    assert.equal(invalid.addressability.aggregates.grossValue.status, "invalid", "Invalid portfolio money must mark the aggregate invalid");
    assert.equal(invalid.addressability.grossValue, null, "Invalid portfolio money must not become zero");

    const grouped = bridge.groupSumForTest([
      numericRow("stock_value", 100, "valid", 100, { category: "A" }),
      numericRow("stock_value", null, "missing", null, { category: "A" }),
      numericRow("stock_value", "bad", "invalid", null, { category: "B" })
    ], "category", "stock_value");
    const groupA = grouped.find(item => item.name === "A");
    const groupB = grouped.find(item => item.name === "B");
    assert.equal(groupA.aggregate.status, "incomplete", "Grouped missing evidence must be explicit");
    assert.equal(groupA.value, null, "Grouped missing evidence must not produce a partial-looking total");
    assert.equal(groupB.aggregate.status, "invalid", "Grouped invalid evidence must be explicit");
    assert.equal(groupB.value, null, "Grouped invalid evidence must not become zero");

    const strictExcessModel = app.ObsoliQ.application.excessAnalysisService.buildExcessPageModel({
      rows: [{
        material_id: "MAT-NUM-INCOMPLETE",
        category: "excess",
        primary_category: "excess",
        excess_value: null,
        net_excess_value: null,
        stock_value: null,
        recovery_potential: null,
        __numericParseResults: {
          excess_value: parseState("missing"),
          net_excess_value: parseState("missing"),
          stock_value: parseState("missing"),
          recovery_potential: parseState("missing")
        }
      }],
      datasetMeta: { datasetId: "NUM-01-1" },
      relationshipResult: {}
    });
    assert.equal(strictExcessModel.cases[0].gross_excess_value, null, "The active Excess service must preserve missing gross evidence");
    assert.equal(strictExcessModel.cases[0].net_addressable_excess_value, null, "The active Excess service must preserve missing net evidence");
    assert.equal(strictExcessModel.cases[0].excess_opportunity_score, null, "The active Excess service must not publish a zero score for missing financial evidence");
    assert.equal(strictExcessModel.summary.grossExcessValue, null, "The Excess summary must not publish an apparently complete zero");
    assert.equal(strictExcessModel.summary.aggregates.grossExcessValue.status, "incomplete", "The Excess summary must expose incomplete evidence");

    const scenariosWithoutFinancialEvidence = app.ObsoliQ.excess.excessScenarioEngine.buildScenarioSet({
      net_addressable_excess_value: null,
      gross_excess_value: null,
      source_row: {}
    });
    assert.ok(scenariosWithoutFinancialEvidence.every(scenario => scenario.estimated_impact_value === null), "Missing scenario evidence must never become a zero impact");
    const zeroPoScenario = app.ObsoliQ.excess.excessScenarioEngine.buildScenarioSet({
      net_addressable_excess_value: 100,
      gross_excess_value: 100,
      source_row: { open_po_value: 0, purchase_order_number: "PO-0" }
    }).find(scenario => scenario.scenario_id === "purchase_order_review");
    assert.equal(zeroPoScenario.estimated_impact_value, 0, "A genuine zero PO value must remain an available numeric zero");

  });

  test("NUM-01.1 formatters never render missing, invalid or non-finite values as zero", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    ["count", "quantity", "percent", "number", "money", "compactMoney"].forEach(kind => {
      [null, "", "abc", Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].forEach(value => {
        const formatted = bridge.formatNumericForTest(kind, value);
        assert.notEqual(formatted, "0", `${kind}: unavailable evidence must not render as plain zero`);
        assert.ok(!String(formatted).includes("NaN"), `${kind}: NaN must never reach the UI`);
        assert.ok(!String(formatted).includes("Infinity"), `${kind}: Infinity must never reach the UI`);
      });
      const zero = bridge.formatNumericForTest(kind, 0);
      assert.ok(String(zero).includes("0"), `${kind}: a true zero must remain visibly zero`);
    });
  });

  test("NUM-01.1 numeric ranges fail closed for invalid, ambiguous and inverted limits", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const rows = profileRows("stock_value", ["1.000,00", "2.000,00", "3.000,00"]);
    const invalid = bridge.compileNumericRangeFilterForTest(rows, "stock_value", { min: "abc", max: "" });
    const ambiguous = bridge.compileNumericRangeFilterForTest([], "stock_value", { min: "1,234", max: "" });
    const inverted = bridge.compileNumericRangeFilterForTest(rows, "stock_value", { min: "3.000,00", max: "1.000,00" });
    const valid = bridge.compileNumericRangeFilterForTest(rows, "stock_value", { min: "1.500,00", max: "2.500,00" });
    assert.equal(invalid.valid, false, "Invalid range input must block the filter");
    assert.equal(ambiguous.valid, false, "Ambiguous range input without evidence must block the filter");
    assert.equal(inverted.valid, false, "An inverted range must block the filter");
    assert.equal(valid.valid, true, "A valid locale-aware range must compile");
    assert.equal(bridge.rowMatchesColumnFilterForTest({ stock_value: "2.000,00" }, "stock_value", { min: "1.500,00", max: "2.500,00" }, rows), true, "A value inside the valid range must match");
    assert.equal(bridge.rowMatchesColumnFilterForTest({ stock_value: "2.000,00" }, "stock_value", { min: "abc", max: "" }, rows), false, "Invalid range input must never fail open");
  });

  test("NUM-01.1 manual corrections use DE, EN and CH column locale evidence", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const fixtures = [
      {
        locale: "de",
        rows: profileRows("stock_value", ["1.000,50", "2.000,75", "3.000,25", "4.000,10", "5.000,90"]),
        input: "1.234,56"
      },
      {
        locale: "en",
        rows: profileRows("stock_value", ["1,000.50", "2,000.75", "3,000.25", "4,000.10", "5,000.90"]),
        input: "1,234.56"
      },
      {
        locale: "swiss",
        rows: profileRows("stock_value", ["1'000.50", "2'000.75", "3'000.25", "4'000.10", "5'000.90"]),
        input: "1'234.56"
      }
    ];
    fixtures.forEach(fixture => {
      const result = bridge.validateManualCorrectionValueForTest("stock_value", fixture.input, fixture.rows);
      assert.equal(result.valid, true, `${fixture.locale}: locale-backed correction must be accepted`);
      assert.equal(result.normalizedValue, 1234.56, `${fixture.locale}: correction must normalize deterministically`);
      assert.equal(result.localeProfile.dominantLocale, fixture.locale, `${fixture.locale}: the column profile must drive parsing`);
    });
    const failClosed = bridge.validateManualCorrectionValueForTest("stock_value", "1,234", []);
    assert.equal(failClosed.valid, false, "An ambiguous correction without column evidence must fail closed");
    assert.equal(failClosed.status, "ambiguous", "The correction must retain its ambiguous status");
  });

  test("NUM-01.1 CSV to parser to dataset to UI to export preserves zero and finite values", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const csv = [
      "Material Number;Material Description;Stock Quantity;Stock Value EUR;Profit Center;Program;Excess Value;No Demand Value;Blocked Stock Value;Unplanned Value",
      "MAT-NUM-VALID;Numeric valid;10;1.234,56;PC-NUM;NUM;200,00;100,00;50,00;25,00",
      "MAT-NUM-ZERO;Numeric zero;0;0;PC-NUM;NUM;0;0;0;0"
    ].join("\n");
    const loaded = await bridge.loadTextDataset(csv, "num-01-1.csv", { sourceType: "upload", allowMappingReview: false });
    assert.equal(loaded.status, "loaded", "The strict numeric CSV fixture must load end to end");
    const rows = bridge.getEnrichedRowsForTest();
    assert.equal(rows.length, 2, "Both CSV rows must reach the analytical dataset");
    assert.equal(rows[0].stock_value, 1234.56, "Localized stock value must be normalized in the dataset");
    assert.equal(rows[1].stock_value, 0, "True stock zero must remain zero in the dataset");
    const overviewText = bridge.renderOverviewForTest();
    assert.ok(!overviewText.includes("NaN"), "NaN must not reach Overview rendering");
    assert.ok(!overviewText.includes("Infinity"), "Infinity must not reach Overview rendering");
    const exported = bridge.rowsForExportForTest(rows, [
      ["material_id", "Material"],
      ["stock_quantity", "Stock Quantity"],
      ["stock_value", "Stock Value"]
    ]);
    assert.equal(exported[1][1], 10, "Valid quantity must remain numeric in export");
    assert.equal(exported[1][2], 1234.56, "Valid money must remain numeric in export");
    assert.equal(exported[2][1], 0, "True quantity zero must remain numeric zero in export");
    assert.equal(exported[2][2], 0, "True money zero must remain numeric zero in export");
    assert.ok(!JSON.stringify(exported).includes("NaN"), "NaN must not reach export rows");
    assert.ok(!JSON.stringify(exported).includes("Infinity"), "Infinity must not reach export rows");
  });
})();
