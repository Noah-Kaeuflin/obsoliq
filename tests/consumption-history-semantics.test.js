(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  const TYPE = "consumption_history";

  function csv(rows, header = "MATNR,WERKS,BUDAT,Period,Verbrauchsmenge,MEINS,BWART,MBLNR,ZEILE") {
    return [header, ...rows.map(row => row.join(","))].join("\n");
  }

  function analyticsSnapshot(bridge) {
    const overview = bridge.getOverviewRows();
    const actions = bridge.getActionRows();
    return {
      inventoryPackageId: bridge.getState().activeInventoryPackageId,
      materialMasterPackage: bridge.getActiveMaterialMasterPackage(),
      totalInventory: overview.reduce((sum, row) => sum + Number(row.stock_value || 0), 0),
      recoveryPotential: overview.reduce((sum, row) => sum + Number(row.recovery_potential || 0), 0),
      actionSignature: actions.map(row => [row.material_id, row.recommended_action, row.priority, row.confidence, row.status, row.opportunity_score].join("|")),
      dataQuality: bridge.getDataQualityBaselineForTest(),
      pilotReviews: bridge.snapshotPilotReviewsForTest()
    };
  }

  test("AP 16.4b temporal parsers are deterministic and never guess ambiguous dates", async assert => {
    const app = await helpers.loadSampleApp();
    const engine = app.__obsoliqTestBridge.consumptionHistorySemanticsEngineForTest;

    assert.equal(engine.parsePostingDate("2026-01-31").normalizedDate, "2026-01-31", "ISO date should parse");
    assert.equal(engine.parsePostingDate("31.01.2026").normalizedDate, "2026-01-31", "German date should parse");
    assert.equal(engine.parsePostingDate("01/31/2026", "mm/dd/yyyy").normalizedDate, "2026-01-31", "Controlled en-US date should parse");
    assert.equal(engine.parsePostingDate("20260131").normalizedDate, "2026-01-31", "YYYYMMDD should parse");
    assert.equal(engine.parsePostingDate("46053", "excel-serial").normalizedDate, "2026-01-31", "Excel serial should parse as a date-only value");
    assert.equal(engine.parsePostingDate("01/02/2026").status, "ambiguous", "Slash dates must not be guessed in auto mode");
    assert.equal(engine.parsePeriod("2026-01").normalizedPeriod, "2026-01", "YYYY-MM period should parse");
    assert.equal(engine.parsePeriod("202601").normalizedPeriod, "2026-01", "YYYYMM period should parse");
    assert.equal(engine.parsePeriod("01/2026").normalizedPeriod, "2026-01", "MM/YYYY period should parse");
  });

  test("AP 16.4b interpretation service requires review for ambiguous dates and blocks double scaling", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const service = bridge.consumptionHistoryInterpretationServiceForTest;
    const parsed = bridge.parseDelimited("Material Number,Consumption Quantity in thousands,Posting Date\n0001,1k,01/02/2026");
    const mapping = [
      { sourceIndex: 0, sourceColumn: parsed.headers[0], selectedCanonicalField: "material_id", status: "mapped" },
      { sourceIndex: 1, sourceColumn: parsed.headers[1], selectedCanonicalField: "consumption_quantity", status: "mapped" },
      { sourceIndex: 2, sourceColumn: parsed.headers[2], selectedCanonicalField: "posting_date", status: "mapped" }
    ];
    const result = service.prepareConsumptionHistoryInterpretation({
      packageType: TYPE,
      rows: parsed.rows,
      sourceColumnMetadata: parsed.sourceColumnMetadata,
      mapping
    });

    assert.equal(result.trustState, "blocked", "Double scaling should block the interpretation");
    assert.ok(result.blockingDiagnostics.some(item => item.key === "historyQuantityDoubleScaleBlocked"), "Double scaling should be diagnosed");
    assert.ok(result.reviewDiagnostics.some(item => item.key === "historyDateFormatReviewRequired"), "Ambiguous date should require review");
  });

  test("AP 16.4b Mapping Assistant shows History Interpretation and gates ambiguous dates", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const parsed = bridge.parseDelimited("Material Number,Consumption Quantity,Posting Date\n0001,5,01/02/2026");
    const result = bridge.beginUploadWithParsedData(parsed, "ambiguous-history.csv", { packageType: TYPE });
    const modal = app.document.getElementById("mappingModal");
    const applyButton = app.document.getElementById("mappingApplyButton");

    assert.equal(result.status, "mapping", "Ambiguous date should open Mapping Assistant");
    assert.ok(modal.textContent.includes("History Interpretation"), "Mapping Assistant should show History Interpretation");
    assert.equal(applyButton.disabled, true, "Apply should remain disabled before semantic review");

    const dateSelect = modal.querySelector('[data-history-policy][data-policy-section="postingDate"][data-policy-key="dateFormat"]');
    dateSelect.value = "mm/dd/yyyy";
    dateSelect.dispatchEvent(new Event("change", { bubbles: true }));
    const confirm = modal.querySelector("[data-history-interpretation-confirm]");
    if (confirm) {
      confirm.checked = true;
      confirm.dispatchEvent(new Event("change", { bubbles: true }));
    }

    assert.equal(app.document.getElementById("mappingApplyButton").disabled, false, "Controlled date format plus confirmation should enable Apply");
  });

  test("AP 16.4b import adds temporal, movement, quantity and unit semantics without historical metrics", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const result = bridge.importConsumptionHistoryTextForTest(csv([
      ["0001", "0100", "2026-01-15", "2026-01", "10", "EA", "261", "0001", "0001"],
      ["0001", "0100", "2026-01-16", "2026-01", "2", "EA", "262", "0002", "0001"],
      ["0001", "0100", "2026-01-17", "2026-01", "-3", "EA", "601", "0003", "0001"]
    ]), "semantics.csv");
    const active = bridge.getActiveConsumptionHistoryPackage();
    const rows = active.buildData.packageRows;

    assert.equal(result.status, "loaded", "Semantic package should import");
    assert.equal(rows[0].raw_posting_date, "2026-01-15", "Raw Posting Date should remain visible on semantic rows");
    assert.equal(rows[0].raw_period, "2026-01", "Raw Period should remain visible on semantic rows");
    assert.equal(rows[0].temporal_source, "posting_date", "Valid Posting Date should be the authoritative temporal source");
    assert.equal(rows[0].normalized_posting_date, "2026-01-15", "Normalized posting date should be added");
    assert.equal(rows[0].normalized_period, "2026-01", "Normalized period should be added");
    assert.equal(rows[0].temporal_precision, "day", "Posting Date should create day precision");
    assert.equal(rows[0].temporal_parse_status, "valid", "Valid temporal evidence should be marked valid");
    assert.deepEqual(rows[0].temporal_diagnostic_codes, [], "Clean temporal evidence should not add row-level diagnostics");
    assert.equal(rows[0].movement_semantic, "consumption", "261 should be consumption");
    assert.equal(rows[1].movement_semantic, "reversal", "262 should be reversal");
    assert.equal(rows[2].movement_semantic, "unknown", "601 should remain unknown");
    assert.equal(rows[2].signed_consumption_quantity, -3, "Signed source quantity should be preserved");
    assert.equal(rows[2].absolute_consumption_quantity, 3, "Absolute quantity should be separated");
    assert.equal(rows[2].net_consumption_quantity, 0, "Unknown movement type should not infer net consumption from a negative sign");
    assert.equal(rows[0].normalized_base_unit, "EA", "Unit token should normalize without conversion");
    assert.equal(rows[0].consumption_quantity_3m, undefined, "No 3M metric should be added");
    assert.equal(rows[0].last_consumption_date, undefined, "No Inventory-style last consumption metric should be added");
  });

  test("AP 16.4b posting date and period conflicts plus future movements are diagnosed", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const result = bridge.importConsumptionHistoryTextForTest(csv([
      ["0001", "0100", "2026-02-01", "2026-01", "10", "EA", "261", "0001", "0001"]
    ]), "future-conflict.csv", {
      semanticPolicy: {
        analysisAsOf: { date: "2026-01-31", source: "user_confirmed", userConfirmed: true },
        reviewConfirmed: true
      }
    });
    const active = bridge.getActiveConsumptionHistoryPackage();
    const diagnostics = active.packageValidation.diagnostics || [];

    assert.equal(result.status, "loaded", "Conflict package should still import with diagnostics");
    assert.equal(active.buildData.packageRows[0].temporal_consistency_status, "conflict", "Posting Date / Period conflict should be stored");
    assert.equal(active.buildData.packageRows[0].temporal_parse_status, "future", "Future Posting Date should be stored as a temporal parse status");
    assert.equal(active.buildData.packageRows[0].aggregation_eligible, false, "Future or conflicting rows should not be aggregation eligible");
    assert.ok(active.buildData.packageRows[0].temporal_diagnostic_codes.includes("posting_period_conflict"), "Row should include conflict diagnostic code");
    assert.ok(active.buildData.packageRows[0].temporal_diagnostic_codes.includes("future_movement"), "Row should include future diagnostic code");
    assert.ok(diagnostics.some(item => item.key === "historyPostingPeriodConflict"), "Posting Date / Period conflict should be diagnosed");
    assert.ok(diagnostics.some(item => item.key === "historyFutureMovements"), "Future movement should be diagnosed against explicit as-of date");
    assert.equal(active.buildData.buildMetadata.historyReadiness.analysisAsOf.source, "user_confirmed", "As-of source should be explicit");
    assert.equal(active.buildData.freshness.historyCoverageEnd, "2026-02-01", "History coverage end should be descriptive evidence only");
  });

  test("AP 16.4b unit contexts and duplicate semantics retain all source rows", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const result = bridge.importConsumptionHistoryTextForTest(csv([
      ["0001", "0100", "2026-01-15", "2026-01", "10", "EA", "261", "0001", "0001"],
      ["0001", "0100", "2026-01-15", "2026-01", "10", "EA", "261", "0001", "0001"],
      ["0001", "0100", "2026-01-15", "2026-01", "10", "EA", "261", "0009", "0001"],
      ["0001", "0100", "2026-01-15", "2026-01", "10", "KG", "261", "0010", "0001"]
    ]), "duplicate-semantics.csv");
    const active = bridge.getActiveConsumptionHistoryPackage();
    const rows = active.buildData.packageRows;
    const diagnostics = active.packageValidation.diagnostics || [];

    assert.equal(result.status, "loaded", "Duplicate package should load");
    assert.equal(rows.length, 4, "No duplicate row should be deleted");
    assert.ok(rows.some(row => row.duplicate_semantic === "exact_source_duplicate"), "Exact source duplicates should be classified");
    assert.ok(rows.some(row => row.duplicate_semantic === "legitimate_repeat"), "Repeated movement with separate evidence should remain distinguishable");
    assert.ok(rows.some(row => row.unit_status === "multiple_for_entity"), "Multiple units for one entity should be visible");
    assert.ok(rows.every(row => row.entity_key && row.temporal_reference_key && row.event_identity_key && row.unit_context_key), "Entity, temporal, event and unit keys should be separated");
    assert.ok(diagnostics.some(item => item.key === "historyMultipleUnitsForEntity"), "Multiple unit contexts should be diagnosed");
  });

  test("AP 16.4b blocked semantic import creates no package and consumes no Registry ID", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getRegistryStats();
    const result = bridge.importConsumptionHistoryTextForTest(
      "Material Number,Consumption Quantity in thousands,Posting Date\n0001,1k,2026-01-01",
      "double-scale.csv",
      { suppressErrorLog: true, suppressFeedback: true }
    );
    const after = bridge.getRegistryStats();

    assert.equal(result.status, "error", "Double scaling should fail package import");
    assert.equal(after.countsByType.consumption_history || 0, before.countsByType.consumption_history || 0, "Blocked semantic import should create no package");
    assert.equal(after.sequence, before.sequence, "Blocked semantic import should consume no package ID");
  });

  test("AP 16.4b Consumption History semantics remain analytically isolated", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = analyticsSnapshot(bridge);
    const result = bridge.importConsumptionHistoryTextForTest(csv([
      ["0001", "0100", "2026-01-15", "2026-01", "10", "EA", "261", "0001", "0001"]
    ]), "isolation-semantics.csv");
    const after = analyticsSnapshot(bridge);

    assert.equal(result.status, "loaded", "Semantic import should load");
    assert.deepEqual(after, before, "Inventory, Recovery, DQ, Actions, Scores and Pilot Reviews should remain unchanged");
  });

  test("AP 16.4b 10,000-row semantic gate is deterministic and isolated", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = analyticsSnapshot(bridge);
    const rows = ["MATNR,WERKS,BUDAT,Period,Verbrauchsmenge,MEINS,BWART,MBLNR,ZEILE"];
    for (let index = 0; index < 10000; index += 1) {
      rows.push([
        `000${String(index + 1).padStart(6, "0")}`,
        `0${100 + (index % 5)}`,
        `2026-${String((index % 12) + 1).padStart(2, "0")}-15`,
        `2026-${String((index % 12) + 1).padStart(2, "0")}`,
        String((index % 19) + 1),
        "EA",
        index % 11 === 0 ? "262" : "261",
        `490${String(index + 1).padStart(7, "0")}`,
        String((index % 99) + 1).padStart(4, "0")
      ].join(","));
    }
    const started = performance.now();
    const result = bridge.importConsumptionHistoryTextForTest(rows.join("\n"), "semantics-10000.csv", { suppressFeedback: true });
    const durationMs = performance.now() - started;
    const active = bridge.getActiveConsumptionHistoryPackage();
    const after = analyticsSnapshot(bridge);

    assert.equal(result.status, "loaded", "10,000 semantic rows should import");
    assert.equal(active.buildData.packageRows.length, 10000, "All rows should remain present");
    assert.equal(active.buildData.buildMetadata.historyReadiness.rowCount, 10000, "History Readiness should cover all rows");
    assert.ok(durationMs < 10000, `10,000-row semantic gate should complete under 10s; actual ${Math.round(durationMs)}ms`);
    assert.deepEqual(after, before, "10,000-row semantic import should not change Inventory analytics");
  });
})();
