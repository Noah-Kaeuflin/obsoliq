(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  const TYPE = "consumption_history";

  function consumptionCsv(rows = [
    ["0000123", "0100", "2026-01-15", "", "10", "EA", "261", "00049001", "0001"],
    ["0000124", "0100", "2026-01-16", "", "0", "EA", "261", "00049002", "0002"],
    ["0000125", "0100", "2026-01-17", "", "-2", "EA", "262", "00049003", "0003"]
  ]) {
    return [
      "MATNR,WERKS,BUDAT,Period,Verbrauchsmenge,MEINS,BWART,MBLNR,ZEILE",
      ...rows.map(row => row.join(","))
    ].join("\n");
  }

  function snapshotAnalytics(bridge) {
    const overview = bridge.getOverviewRows();
    const actions = bridge.getActionRows();
    const quality = bridge.getDataQualityBaselineForTest();
    return {
      inventoryPackageId: bridge.getState().activeInventoryPackageId,
      materialMasterPackage: bridge.getActiveMaterialMasterPackage(),
      overviewCount: overview.length,
      actionsCount: actions.length,
      totalInventory: overview.reduce((sum, row) => sum + Number(row.stock_value || 0), 0),
      grossRecovery: overview.reduce((sum, row) => sum + Number(row.gross_recovery_potential || 0), 0),
      recoveryPotential: overview.reduce((sum, row) => sum + Number(row.recovery_potential || 0), 0),
      issueKeys: bridge.getDataQualityIssues().map(issue => issue.issue_key || issue.key).sort(),
      actionSignature: actions.map(row => [
        row.material_id,
        row.recommended_action,
        row.priority,
        row.confidence,
        row.status,
        row.opportunity_score
      ].join("|")),
      dataQuality: quality
    };
  }

  test("AP 16.4a Consumption History package contract and automatic mapping are available", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const registryModule = bridge.registryModule;
    const builder = bridge.consumptionHistoryBuilderForTest;
    const service = bridge.packageImportServiceForTest;
    const parsed = bridge.parseDelimited(consumptionCsv());
    const prepared = service.prepareImport({
      packageType: TYPE,
      parsedSource: parsed,
      sourceDescriptor: { sourceLabel: "consumption-history.csv", sourceType: "upload" }
    });
    const selected = new Set(prepared.approvedMapping.map(entry => entry.selectedCanonicalField).filter(Boolean));

    assert.equal(registryModule.DATA_PACKAGE_TYPES.CONSUMPTION_HISTORY, TYPE, "Registry should expose consumption_history package type");
    assert.equal(registryModule.DATA_PACKAGE_TYPE_DEFINITIONS[TYPE].importSupported, true, "Consumption History should be import-enabled");
    assert.ok(builder.CONSUMPTION_HISTORY_FIELD_DEFINITIONS.material_id, "Builder should own package-specific field definitions");
    assert.ok(builder.CONSUMPTION_HISTORY_MAPPING_POLICY.requiredAnyOfMappingGroups.length, "Builder should expose temporal one-of policy");
    assert.equal(prepared.ok, true, "Prepare should succeed");
    assert.includes(selected, "material_id", "MATNR alias should map to material_id");
    assert.includes(selected, "plant", "WERKS alias should map to plant");
    assert.includes(selected, "posting_date", "BUDAT alias should map to posting_date");
    assert.includes(selected, "consumption_quantity", "Verbrauchsmenge alias should map to consumption_quantity");
    assert.equal(prepared.mappingState.valid, true, "Automatic mapping should satisfy required fields");
  });

  test("AP 16.4a temporal one-of mapping accepts posting date, period, or both", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const service = bridge.packageImportServiceForTest;
    const cases = [
      ["posting only", "Material Number,Consumption Quantity,Posting Date\n0001,5,2026-01-01"],
      ["period only", "Material Number,Consumption Quantity,Period\n0001,5,2026-01"],
      ["both", "Material Number,Consumption Quantity,Posting Date,Period\n0001,5,2026-01-01,2026-01"]
    ];
    cases.forEach(([label, csv]) => {
      const parsed = bridge.parseDelimited(csv);
      const prepared = service.prepareImport({ packageType: TYPE, parsedSource: parsed, sourceDescriptor: { sourceLabel: `${label}.csv` } });
      assert.equal(prepared.mappingState.valid, true, `${label} should pass mapping validation`);
    });

    const missing = service.prepareImport({
      packageType: TYPE,
      parsedSource: bridge.parseDelimited("Material Number,Consumption Quantity\n0001,5"),
      sourceDescriptor: { sourceLabel: "missing-temporal.csv" }
    });
    assert.equal(missing.mappingState.valid, false, "Missing posting date and period should fail mapping validation");
    assert.ok(missing.mappingState.errors.some(error => error.key === "mappingMissingRequiredAnyOf"), "Missing temporal one-of should be diagnosed");
  });

  test("AP 16.4a Consumption History preserves identifiers, raw temporal values, zero and negative quantities", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const result = bridge.importConsumptionHistoryTextForTest(consumptionCsv(), "consumption-history.csv");
    const active = bridge.getActiveConsumptionHistoryPackage();
    const rows = active.buildData.packageRows;
    const diagnostics = active.packageValidation.diagnostics || [];

    assert.equal(result.status, "loaded", "Valid Consumption History import should complete");
    assert.equal(active.packageType, TYPE, "Registered package should use Consumption History type");
    assert.equal(active.revision, 1, "First active Consumption History package should be revision 1");
    assert.equal(rows.length, 3, "All rows should be retained");
    assert.equal(rows[0].material_id, "0000123", "Leading-zero material ID should be preserved");
    assert.equal(rows[0].plant, "0100", "Leading-zero plant should be preserved");
    assert.equal(rows[0].document_id, "00049001", "Document ID should remain text");
    assert.equal(rows[0].document_item, "0001", "Document item should remain text");
    assert.equal(rows[0].posting_date, "2026-01-15", "Raw posting date should be preserved");
    assert.equal(rows[0].consumption_quantity, 10, "Quantity should be parsed through central numeric helpers");
    assert.equal(rows[1].consumption_quantity, 0, "Zero quantity should remain valid");
    assert.equal(rows[2].consumption_quantity, -2, "Negative quantity should be preserved");
    assert.ok(diagnostics.some(diagnostic => diagnostic.key === "consumptionHistoryNegativeQuantities"), "Negative quantity should be diagnosed");
    assert.equal(active.relationshipKeys.material[0], "material_id", "Material relationship key should be exposed");
    assert.equal(active.relationshipKeys.organization[0], "plant", "Plant relationship key should be exposed when mapped");
    assert.includes(active.relationshipKeys.temporal, "posting_date", "Temporal relationship key should preserve raw posting date field");
    assert.equal(active.freshness.temporalCoverage, "raw_history_uninterpreted", "Freshness should be explicit about raw temporal coverage");
  });

  test("AP 16.4a invalid quantity rejects package without consuming a Registry ID", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getRegistryStats();
    const result = bridge.importConsumptionHistoryTextForTest(
      "Material Number,Consumption Quantity,Posting Date\n0001,not-a-number,2026-01-01",
      "invalid-quantity.csv",
      { suppressErrorLog: true, suppressFeedback: true }
    );
    const after = bridge.getRegistryStats();

    assert.equal(result.status, "error", "Invalid quantity should fail import");
    assert.equal(after.countsByType.consumption_history || 0, before.countsByType.consumption_history || 0, "Failed import should create no Consumption History package");
    assert.equal(after.sequence, before.sequence, "Failed build should not consume package sequence");
    assert.equal(bridge.getActiveConsumptionHistoryPackage(), null, "Failed import should not leave an active phantom package");
  });

  test("AP 16.4a units are preserved, not converted, and exact duplicates are retained", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const csv = [
      "Material Number,Consumption Quantity,Period,Base Unit",
      "0001,5,2026-01,EA",
      "0001,5,2026-01,EA",
      "0002,2,2026-01,KG",
      "0003,1,2026-01,"
    ].join("\n");
    const result = bridge.importConsumptionHistoryTextForTest(csv, "units-and-duplicates.csv");
    const active = bridge.getActiveConsumptionHistoryPackage();
    const diagnostics = active.packageValidation.diagnostics || [];

    assert.equal(result.status, "loaded", "Package with unit warnings should still load");
    assert.equal(active.buildData.packageRows.length, 4, "Duplicate rows should be retained");
    assert.equal(active.buildData.packageRows[0].base_unit, "EA", "Unit should be preserved");
    assert.equal(active.buildData.packageRows[2].base_unit, "KG", "Different unit should be preserved without conversion");
    assert.ok(diagnostics.some(diagnostic => diagnostic.key === "consumptionHistoryMissingUnits"), "Missing units should be diagnosed");
    assert.ok(diagnostics.some(diagnostic => diagnostic.key === "consumptionHistoryMultipleUnits"), "Multiple units should be diagnosed");
    assert.ok(diagnostics.some(diagnostic => diagnostic.key === "consumptionHistoryExactDuplicateRows"), "Exact duplicate rows should be diagnosed");
  });

  test("AP 16.4a failed commit rolls back Consumption History package and package sequence", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getRegistryStats();
    const result = bridge.importConsumptionHistoryTextForTest(consumptionCsv(), "commit-failure.csv", {
      forceCommitFailureForTest: "after-register",
      suppressErrorLog: true,
      suppressFeedback: true
    });
    const after = bridge.getRegistryStats();

    assert.equal(result.status, "error", "Forced commit failure should fail");
    assert.equal(after.countsByType.consumption_history || 0, before.countsByType.consumption_history || 0, "Rollback should remove phantom package");
    assert.equal(after.sequence, before.sequence, "Rollback should restore package sequence");
    assert.equal(bridge.getActiveConsumptionHistoryPackage(), null, "Rollback should not leave an active package");
  });

  test("AP 16.4a Consumption History import is analytically isolated from active Inventory", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = snapshotAnalytics(bridge);
    const result = bridge.importConsumptionHistoryTextForTest(consumptionCsv(), "isolated-consumption.csv");
    const after = snapshotAnalytics(bridge);

    assert.equal(result.status, "loaded", "Consumption History import should load");
    assert.equal(after.inventoryPackageId, before.inventoryPackageId, "Active Inventory package should remain unchanged");
    assert.deepEqual(after.materialMasterPackage, before.materialMasterPackage, "Active Material Master package should remain unchanged");
    assert.equal(after.overviewCount, before.overviewCount, "Overview row count should remain unchanged");
    assert.equal(after.actionsCount, before.actionsCount, "Action count should remain unchanged");
    assert.equal(after.totalInventory, before.totalInventory, "Total Inventory should remain unchanged");
    assert.equal(after.grossRecovery, before.grossRecovery, "Gross Recovery should remain unchanged");
    assert.equal(after.recoveryPotential, before.recoveryPotential, "Recovery Potential should remain unchanged");
    assert.deepEqual(after.issueKeys, before.issueKeys, "Data Quality issue keys should remain unchanged");
    assert.deepEqual(after.actionSignature, before.actionSignature, "Actions and Opportunity Scores should remain unchanged");
    assert.deepEqual(after.dataQuality, before.dataQuality, "Data Quality baseline should remain unchanged");
  });

  test("AP 16.4a Raw Source and duplicate physical header identity remain immutable", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const service = bridge.packageImportServiceForTest;
    const parsed = bridge.parseDelimited("Material Number,Consumption Quantity,Consumption Quantity,Period,Extra\n0000001,4,400,2026-01,keep");
    const beforeRows = JSON.stringify(parsed.rows);
    const beforeHeaders = JSON.stringify(parsed.headers);
    const beforeMetadata = JSON.stringify(parsed.sourceColumnMetadata);
    const prepared = service.prepareImport({
      packageType: TYPE,
      parsedSource: parsed,
      sourceDescriptor: { sourceLabel: "duplicate-headers.csv", sourceType: "upload" }
    });
    const result = service.importPackage({
      packageType: TYPE,
      parsedSource: prepared.parsedSource,
      approvedMapping: prepared.approvedMapping,
      sourceDescriptor: prepared.sourceDescriptor
    });

    assert.equal(result.ok, true, "Import should succeed");
    assert.equal(JSON.stringify(parsed.rows), beforeRows, "Parsed rows should not be mutated");
    assert.equal(JSON.stringify(parsed.headers), beforeHeaders, "Parsed headers should not be mutated");
    assert.equal(JSON.stringify(parsed.sourceColumnMetadata), beforeMetadata, "Source metadata should not be mutated");
    assert.equal(result.packageRecord.sourceData.headers[1], "Consumption Quantity", "First duplicate physical header should be preserved");
    assert.equal(result.packageRecord.sourceData.headers[2], "Consumption Quantity__2", "Second duplicate physical header should be preserved");
    assert.equal(result.packageRecord.sourceData.rows[0].Extra, "keep", "Unknown source columns should remain in raw source snapshot");
  });

  test("AP 16.4a Data Foundation exposes Consumption History as optional Intelligence source", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const details = app.document.querySelector("#dataPackagesPanel .data-foundation");
    details.open = true;
    const beforeText = app.document.getElementById("dataPackagesPanel").textContent;
    const importButton = app.document.querySelector("[data-data-foundation-import-consumption-history]");
    const fileInput = app.document.getElementById("fileInput");
    let clicked = false;
    fileInput.click = () => {
      clicked = true;
    };

    assert.ok(beforeText.includes("Verbrauchshistorie"), "Consumption History should be visible before import");
    assert.ok(importButton, "Missing Consumption History row should offer existing package upload flow");
    importButton.click();
    assert.equal(clicked, true, "Inline action should reuse hidden file input");
    assert.equal(bridge.getState().pendingUploadPackageType, TYPE, "Inline action should preselect Consumption History");

    const result = bridge.importConsumptionHistoryTextForTest(consumptionCsv(), "df-consumption.csv");
    details.open = true;
    const afterText = app.document.getElementById("dataPackagesPanel").textContent;
    assert.equal(result.status, "loaded", "Consumption History import should complete");
    assert.ok(afterText.includes("Kern-Datenbasis 1/2"), "Data Foundation summary should keep core data status separate");
    assert.ok(afterText.includes("Optionale Intelligence-Quellen 1/1"), "Data Foundation summary should count optional imported intelligence source");
    assert.ok(afterText.includes("Aktiv"), "Imported optional source should show active state");
  });

  test("AP 16.4a 10,000-row Consumption History import is deterministic and isolated", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = snapshotAnalytics(bridge);
    const rows = ["Material Number,Plant,Period,Consumption Quantity,Base Unit,Movement Type,Document,Document Item"];
    for (let index = 0; index < 10000; index += 1) {
      rows.push([
        `000${String(index + 1).padStart(6, "0")}`,
        `0${100 + (index % 5)}`,
        `2026-${String((index % 12) + 1).padStart(2, "0")}`,
        String(index % 17),
        "EA",
        "261",
        `00049${String(index + 1).padStart(5, "0")}`,
        String((index % 99) + 1).padStart(4, "0")
      ].join(","));
    }
    const started = performance.now();
    const result = bridge.importConsumptionHistoryTextForTest(rows.join("\n"), "consumption-10000.csv", { suppressFeedback: true });
    const durationMs = performance.now() - started;
    const active = bridge.getActiveConsumptionHistoryPackage();
    const after = snapshotAnalytics(bridge);

    assert.equal(result.status, "loaded", "10,000-row Consumption History import should load");
    assert.equal(active.buildData.packageRows.length, 10000, "All 10,000 rows should be normalized");
    assert.equal(active.packageValidation.statusKey, "ready", "10,000-row package should validate");
    assert.ok(durationMs < 8000, `10,000-row gate should complete under 8s; actual ${Math.round(durationMs)}ms`);
    assert.equal(after.inventoryPackageId, before.inventoryPackageId, "10,000-row import should not change active Inventory package");
    assert.equal(after.recoveryPotential, before.recoveryPotential, "10,000-row import should not change Recovery Potential");
    assert.deepEqual(after.actionSignature, before.actionSignature, "10,000-row import should not change Actions");
  });
})();
