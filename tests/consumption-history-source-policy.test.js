(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  const TYPE = "consumption_history";

  function csv(text) {
    return text.trim();
  }

  function confirmedPolicy(basePolicy, patch = {}) {
    const confirmedAt = "2026-08-21T12:00:00.000Z";
    function confirmedSection(sectionName) {
      const patchSection = patch[sectionName] || {};
      const merged = {
        ...(basePolicy[sectionName] || {}),
        ...patchSection
      };
      const hasPhysicalSource = Number.isInteger(merged.sourceIndex)
        || Boolean(merged.sourceKey)
        || Boolean(merged.sourceColumn);
      const shouldConfirm = hasPhysicalSource || Object.keys(patchSection).length > 0;
      return {
        ...merged,
        userConfirmed: shouldConfirm,
        confirmedAt: shouldConfirm ? confirmedAt : "",
        confirmationReason: shouldConfirm ? "test" : ""
      };
    }
    return {
      ...basePolicy,
      ...patch,
      reviewConfirmed: true,
      confirmedAt,
      quantity: confirmedSection("quantity"),
      postingDate: confirmedSection("postingDate"),
      period: confirmedSection("period")
    };
  }

  function remapQuantityToSecondColumn(mapping) {
    return mapping.map(entry => {
      if (entry.sourceIndex === 1) return { ...entry, selectedCanonicalField: "", ignored: true };
      if (entry.sourceIndex === 2) return { ...entry, selectedCanonicalField: "consumption_quantity", ignored: false, status: "mapped" };
      return entry;
    });
  }

  test("AP 16.4b.1 source-bound policy retains unchanged mapping and rejects remapped duplicate header", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const service = bridge.packageImportServiceForTest;
    const interpretation = bridge.consumptionHistoryInterpretationServiceForTest;
    const parsed = bridge.parseDelimited(csv(`
Material Number,Consumption Quantity,Consumption Quantity,Posting Date
0001,2,200,2026-01-01
`));
    const prepared = service.prepareImport({ packageType: TYPE, parsedSource: parsed, sourceDescriptor: { sourceLabel: "duplicate-quantity.csv" } });
    const basePolicy = prepared.interpretationResult.effectivePolicy;
    const policy = confirmedPolicy(basePolicy, {
      quantity: { scaleSource: "explicit", sourceScaleFactor: 1000 },
      postingDate: { dateFormat: "yyyy-mm-dd" }
    });
    const firstSignature = interpretation.semanticPolicySignature(policy);
    const unchanged = service.validateMapping({
      packageType: TYPE,
      parsedSource: parsed,
      mapping: prepared.approvedMapping,
      semanticPolicy: policy,
      sourceDescriptor: prepared.sourceDescriptor
    });
    const remapped = service.validateMapping({
      packageType: TYPE,
      parsedSource: parsed,
      mapping: remapQuantityToSecondColumn(prepared.approvedMapping),
      semanticPolicy: policy,
      sourceDescriptor: prepared.sourceDescriptor
    });
    const secondIdentity = interpretation.historySourceIdentityForMappingEntry({
      canonicalField: "consumption_quantity",
      reviewedMapping: prepared.approvedMapping.find(entry => entry.sourceIndex === 2),
      sourceColumnMetadata: parsed.sourceColumnMetadata
    });
    const invalidIndexIdentity = interpretation.historySourceIdentityForMappingEntry({
      canonicalField: "consumption_quantity",
      reviewedMapping: { sourceIndex: "0", sourceColumn: "Consumption Quantity", selectedCanonicalField: "consumption_quantity", status: "mapped" },
      sourceColumnMetadata: parsed.sourceColumnMetadata
    });

    assert.equal(basePolicy.quantity.sourceIndex, 1, "Initial Quantity policy should bind to the first physical duplicate");
    assert.equal(basePolicy.quantity.sourceKey, "Consumption Quantity", "First duplicate should keep its physical source key");
    assert.equal(secondIdentity.sourceKey, "Consumption Quantity__2", "Second duplicate should have a distinct physical source key");
    assert.equal(invalidIndexIdentity.valid, false, "String sourceIndex must be invalid");
    assert.equal(unchanged.ok, true, "Unchanged physical mapping should validate with retained policy");
    assert.equal(unchanged.interpretationResult.reconciliation.retainedSections.includes("quantity"), true, "Quantity section confirmation should be retained");
    assert.equal(interpretation.semanticPolicySignature(unchanged.interpretationResult.effectivePolicy), firstSignature, "Unchanged mapping should keep the semantic policy signature");
    assert.equal(remapped.ok, false, "Remapping to another duplicate source must reject the old policy");
    assert.equal(remapped.interpretationResult.trustState, "blocked", "Stale source-bound policy should block interpretation");
    assert.ok(remapped.interpretationResult.diagnostics.some(item => item.key === "historySourcePolicyStale"), "Stale policy should be diagnosed");
  });

  test("AP 16.4b.1 stale source policy blocks commit without consuming a Package ID", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const service = bridge.packageImportServiceForTest;
    const parsed = bridge.parseDelimited(csv(`
Material Number,Consumption Quantity,Consumption Quantity,Posting Date
0001,2,200,2026-01-01
`));
    const prepared = service.prepareImport({ packageType: TYPE, parsedSource: parsed, sourceDescriptor: { sourceLabel: "stale-policy.csv" } });
    const policy = confirmedPolicy(prepared.interpretationResult.effectivePolicy, {
      quantity: { scaleSource: "explicit", sourceScaleFactor: 1000 },
      postingDate: { dateFormat: "yyyy-mm-dd" }
    });
    const before = bridge.getRegistryStats();
    const result = service.importPackage({
      packageType: TYPE,
      parsedSource: parsed,
      approvedMapping: remapQuantityToSecondColumn(prepared.approvedMapping),
      semanticPolicy: policy,
      sourceDescriptor: prepared.sourceDescriptor
    });
    const after = bridge.getRegistryStats();

    assert.equal(result.ok, false, "Stale source-bound policy should not commit");
    assert.equal(result.errorCode, "HISTORY_INTERPRETATION_BLOCKED", "Commit boundary should stop at interpretation");
    assert.equal(after.countsByType.consumption_history || 0, before.countsByType.consumption_history || 0, "No Package should be created");
    assert.equal(after.sequence, before.sequence, "No Package ID should be consumed");
  });

  test("AP 16.4b.1 explicit scale factor is visible in signature, validated and used by Builder", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const service = bridge.packageImportServiceForTest;
    const parsed = bridge.parseDelimited("Material Number,Consumption Quantity,Posting Date\n0001,2,2026-01-01");
    const prepared = service.prepareImport({ packageType: TYPE, parsedSource: parsed, sourceDescriptor: { sourceLabel: "explicit-scale.csv" } });
    const policy = confirmedPolicy(prepared.interpretationResult.effectivePolicy, {
      quantity: { scaleSource: "explicit", sourceScaleFactor: 1000 },
      postingDate: { dateFormat: "yyyy-mm-dd" }
    });
    const invalidPolicy = confirmedPolicy(prepared.interpretationResult.effectivePolicy, {
      quantity: { scaleSource: "explicit", sourceScaleFactor: "1000" },
      postingDate: { dateFormat: "yyyy-mm-dd" }
    });
    const invalid = service.validateMapping({ packageType: TYPE, parsedSource: parsed, mapping: prepared.approvedMapping, semanticPolicy: invalidPolicy, sourceDescriptor: prepared.sourceDescriptor });
    const result = service.importPackage({ packageType: TYPE, parsedSource: parsed, approvedMapping: prepared.approvedMapping, semanticPolicy: policy, sourceDescriptor: prepared.sourceDescriptor });

    assert.equal(invalid.ok, false, "String factor should be invalid");
    assert.ok(invalid.interpretationResult.diagnostics.some(item => item.key === "historyExplicitScaleFactorInvalid"), "Invalid explicit factor should be diagnosed");
    assert.equal(result.ok, true, "Valid explicit factor should import");
    assert.equal(result.packageRecord.buildData.packageRows[0].consumption_quantity, 2000, "Builder should apply explicit factor");
    assert.ok(result.packageRecord.buildData.buildMetadata.semanticPolicySignature.includes("sourceScaleFactor"), "Signature should include explicit factor");
  });

  test("AP 16.4b.1 Trust and History Readiness stay separate in Mapping Assistant and Data Foundation", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const result = bridge.importConsumptionHistoryTextForTest(
      "Material Number,Consumption Quantity,Posting Date,Movement Type,Base Unit\n0001,2,2026-01-01,999,EA",
      "limited-readiness.csv",
      { suppressFeedback: true }
    );
    const active = bridge.getActiveConsumptionHistoryPackage();
    const panel = app.document.getElementById("dataPackagesPanel");
    const readiness = active.buildData.buildMetadata.historyReadiness;

    assert.equal(result.status, "loaded", "Unknown movement package should still import");
    assert.equal(active.interpretationMetadata.trustState, "trusted", "Interpretation may be trusted");
    assert.equal(readiness.status, "limited", "Engine-produced History Readiness should be limited");
    assert.ok(panel.textContent.includes("Optionale Intelligence-Quellen 1/1"), "Availability count should remain separate");
    assert.ok(panel.textContent.includes("History Readiness: Eingeschränkt"), "Data Foundation should show translated readiness");
    assert.equal(panel.textContent.includes("History Readiness: limited"), false, "Raw readiness code should not be visible");
  });

  test("AP 16.4b.1 Excel date-system policy is explicit and historyCoverageEnd is not as-of", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const engine = bridge.consumptionHistorySemanticsEngineForTest;
    const service = bridge.packageImportServiceForTest;
    const parsed = bridge.parseDelimited("Material Number,Consumption Quantity,Posting Date\n0001,1,46053");
    const prepared = service.prepareImport({ packageType: TYPE, parsedSource: parsed, sourceDescriptor: { sourceLabel: "serial.csv" } });
    const unknownSystemPolicy = confirmedPolicy(prepared.interpretationResult.effectivePolicy, {
      postingDate: { dateFormat: "excel-serial", excelDateSystem: "" }
    });
    const explicit1904 = confirmedPolicy(prepared.interpretationResult.effectivePolicy, {
      postingDate: { dateFormat: "excel-serial", excelDateSystem: "1904" }
    });
    const unknown = service.validateMapping({ packageType: TYPE, parsedSource: parsed, mapping: prepared.approvedMapping, semanticPolicy: unknownSystemPolicy, sourceDescriptor: prepared.sourceDescriptor });
    const imported = service.importPackage({ packageType: TYPE, parsedSource: parsed, approvedMapping: prepared.approvedMapping, semanticPolicy: explicit1904, sourceDescriptor: prepared.sourceDescriptor });

    assert.equal(engine.parsePostingDate("60", "excel-serial", { excelDateSystem: "1900" }).status, "invalid", "1900 phantom leap date should be rejected");
    assert.notEqual(
      engine.parsePostingDate("1", "excel-serial", { excelDateSystem: "1900" }).normalizedDate,
      engine.parsePostingDate("1", "excel-serial", { excelDateSystem: "1904" }).normalizedDate,
      "Same serial should differ between 1900 and 1904 systems"
    );
    assert.equal(unknown.ok, false, "Unknown Excel date system should block validation");
    assert.ok(unknown.interpretationResult.diagnostics.some(item => item.key === "historyExcelDateSystemReviewRequired"), "Unknown date system should be diagnosed");
    assert.equal(imported.ok, true, "Explicit 1904 date-system policy should import");
    assert.equal(imported.packageRecord.freshness.analysisAsOf.source, "unavailable", "History coverage end must not become analysis-as-of");
    assert.ok(imported.packageRecord.freshness.historyCoverageEnd, "History coverage end should remain coverage evidence");
  });

  test("AP 16.4b.1 50,000-row History import remains deterministic and analytically isolated", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const beforeInventory = bridge.getActiveInventoryPackage();
    const beforeRecovery = bridge.getOverviewRows().reduce((total, row) => total + Number(row.recovery_potential || 0), 0);
    const rows = ["Material Number,Plant,Posting Date,Period,Consumption Quantity,Base Unit,Movement Type,Document Number,Document Item"];
    for (let index = 0; index < 50000; index += 1) {
      rows.push([
        `MAT-${String(index % 2500).padStart(5, "0")}`,
        `P${String(index % 8).padStart(2, "0")}`,
        `2026-${String((index % 12) + 1).padStart(2, "0")}-${String((index % 28) + 1).padStart(2, "0")}`,
        `2026-${String((index % 12) + 1).padStart(2, "0")}`,
        String((index % 17) + 1),
        "EA",
        index % 11 === 0 ? "262" : "261",
        `49${String(index).padStart(8, "0")}`,
        String((index % 99) + 1).padStart(4, "0")
      ].join(","));
    }
    const started = performance.now();
    const result = bridge.importConsumptionHistoryTextForTest(rows.join("\n"), "consumption-50000.csv", { suppressFeedback: true });
    const durationMs = performance.now() - started;
    const active = bridge.getActiveConsumptionHistoryPackage();
    const afterInventory = bridge.getActiveInventoryPackage();
    const afterRecovery = bridge.getOverviewRows().reduce((total, row) => total + Number(row.recovery_potential || 0), 0);

    assert.equal(result.status, "loaded", "50,000-row Consumption History import should load");
    assert.equal(active.buildData.packageRows.length, 50000, "All 50,000 rows should be normalized");
    assert.equal(active.buildData.buildMetadata.historyReadiness.status, "ready", "Complete 50,000-row semantic input should be ready");
    assert.ok(durationMs < 20000, `50,000-row gate should complete under 20s; actual ${Math.round(durationMs)}ms`);
    assert.equal(afterInventory.packageId, beforeInventory.packageId, "Consumption History import must not replace active Inventory package");
    assert.equal(afterInventory.revision, beforeInventory.revision, "Consumption History import must not revise active Inventory package");
    assert.equal(afterRecovery, beforeRecovery, "Consumption History import must not change Recovery");
  });
})();
