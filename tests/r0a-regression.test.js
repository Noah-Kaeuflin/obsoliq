(function () {
  "use strict";

  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function rowByMaterial(result, materialId) {
    return result.analyticalRows.find(row => row.material_id === materialId);
  }

  function buildNumericSafetyDataset(app) {
    const parsed = app.__obsoliqTestBridge.parseDelimited([
      "Material,Stock Quantity,Standard Price,Stock Value,Excess Value,Profit Center",
      "MAT-NEG-PRICE,10,-5,,20,PC-R0A",
      "MAT-NEG-QTY,-10,5,,20,PC-R0A",
      "MAT-OVERFLOW,1e155,1e155,,20,PC-R0A",
      "MAT-NAN,NaN,5,,20,PC-R0A",
      "MAT-INFINITY,Infinity,5,,20,PC-R0A",
      "MAT-ZERO,0,5,,20,PC-R0A",
      "MAT-POSITIVE,10,5,,20,PC-R0A",
      "MAT-EXPLICIT,10,-5,100,20,PC-R0A"
    ].join("\n"));
    const mapping = app.ObsoliQ.mapping.engine.createAutomaticColumnMapping({
      headers: parsed.headers,
      rows: parsed.rows,
      sourceColumnMetadata: parsed.sourceColumnMetadata
    });
    return app.ObsoliQ.data.datasetBuilder.buildInventoryDataset({
      sourceRows: parsed.rows,
      headers: parsed.headers,
      sourceColumnMetadata: parsed.sourceColumnMetadata,
      columnMapping: mapping
    });
  }

  function inventoryRiskFamilyCase(app, family, evidenceStatus, overrides = {}) {
    const contract = app.ObsoliQ.inventoryRisks.caseContract;
    const suffix = overrides.suffix || family;
    return contract.createFamilyCase({
      family_case_id: `${family.toUpperCase()}::R0A::${suffix}`,
      inventory_entity_key: "material:MAT-EVIDENCE|plant:PLANT-R0A",
      inventory_row_keys: [`ROW-${suffix}`],
      material_id: "MAT-EVIDENCE",
      material_description: "Evidence aggregation fixture",
      plant: "PLANT-R0A",
      profit_center: "PC-R0A",
      program: "PROGRAM-R0A",
      primary_risk_family: family,
      primary_risk_subtype: family === "excess_demand" ? "excess" : family === "slow_dead" ? "slow_moving" : "blocked",
      priority: family === "excess_demand" ? "critical" : "low",
      score_status: family === "excess_demand" ? "available" : "not_supported",
      score_value: family === "excess_demand" ? 80 : null,
      inventory_exposure: family === "slow_dead" ? 200 : null,
      net_addressable_value: family === "excess_demand" ? 80 : null,
      blocked_quality_value: family === "blocked_quality" ? 30 : null,
      currency: "EUR",
      evidence_status: evidenceStatus,
      evidence: [{ code: `${family}_evidence` }],
      limitations: overrides.limitations || [],
      missing_evidence: overrides.missing_evidence || [],
      capability_status: overrides.capability_status || "available",
      ...overrides
    });
  }

  test("R0A NUM-001 rejects unsafe derived stock values without converting them to zero", async assert => {
    const app = await helpers.loadApp();
    const result = buildNumericSafetyDataset(app);
    const invalidCases = [
      ["MAT-NEG-PRICE", "negative_input"],
      ["MAT-NEG-QTY", "negative_input"],
      ["MAT-OVERFLOW", "derived_value_overflow"],
      ["MAT-NAN", "nonfinite_input"],
      ["MAT-INFINITY", "nonfinite_input"]
    ];

    invalidCases.forEach(([materialId, reason]) => {
      const row = rowByMaterial(result, materialId);
      assert.ok(Boolean(row), `${materialId}: fixture row must exist`);
      assert.equal(row.stock_value, null, `${materialId}: unsafe derived stock value must be unavailable`);
      assert.equal(row.stock_value_availability, "unavailable", `${materialId}: value availability must fail closed`);
      assert.equal(row.stock_value_derivation_reason, reason, `${materialId}: derivation reason must remain explicit`);
      assert.equal(row.recovery_calculation_status, "unavailable", `${materialId}: Recovery must be unavailable`);
      assert.equal(row.recovery_potential, null, `${materialId}: Recovery must not publish zero or an amount`);
      assert.ok(
        row.numeric_limitation_codes.includes(`stock_value_derivation:${reason}`),
        `${materialId}: Data Quality limitation code must identify ${reason}`
      );
    });

    const zero = rowByMaterial(result, "MAT-ZERO");
    const positive = rowByMaterial(result, "MAT-POSITIVE");
    const explicit = rowByMaterial(result, "MAT-EXPLICIT");
    assert.equal(zero.stock_value, 0, "A valid derived zero must remain zero");
    assert.equal(zero.stock_value_availability, "available", "A valid derived zero must remain available");
    assert.equal(zero.recovery_calculation_status, "available", "Recovery with valid zero stock remains calculable");
    assert.equal(positive.stock_value, 50, "A valid positive derived value must remain exact");
    assert.equal(positive.recovery_potential, 20, "Recovery must continue to use a valid positive stock value");
    assert.equal(explicit.stock_value, 100, "A valid explicit stock value must remain authoritative");
    assert.equal(explicit.stock_value_derivation_status, "explicit", "Explicit stock value must not be replaced by derivation");
    assert.equal(explicit.recovery_potential, 20, "Recovery must continue to use valid explicit stock value evidence");

    const diagnostics = result.recoveryInputNormalizationDiagnostics;
    invalidCases.forEach(([materialId, reason]) => {
      assert.ok(
        diagnostics.examples.some(example => example.material_id === materialId && example.reasonCode === reason),
        `${materialId}: Data Quality diagnostics must expose ${reason}`
      );
    });

    const recovery = app.ObsoliQ.recovery.engine;
    [
      [-1, "negative_input"],
      [Number.NaN, "nonfinite_input"],
      [Number.POSITIVE_INFINITY, "nonfinite_input"]
    ].forEach(([stockValue, reason]) => {
      const breakdown = recovery.calculateRecoveryBreakdown({ stock_value: stockValue, excess_value: 10 });
      assert.equal(breakdown.recovery_calculation_status, "unavailable", `${reason}: direct Recovery input must fail closed`);
      assert.equal(breakdown.recovery_potential, null, `${reason}: direct Recovery output must remain unavailable`);
      assert.equal(breakdown.recovery_unavailable_reason, reason, `${reason}: direct Recovery reason must remain explicit`);
    });
    const zeroBreakdown = recovery.calculateRecoveryBreakdown({ stock_value: 0, excess_value: 10 });
    assert.equal(zeroBreakdown.recovery_calculation_status, "available", "Direct Recovery must preserve valid zero stock");
    assert.equal(zeroBreakdown.recovery_potential, 0, "Direct Recovery must preserve valid zero result");
  });

  test("R0A DATA-001 rejects header-only inventory uploads without replacing active state", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.updateLanguageForTest("de");
    const firstRow = bridge.getOverviewRows()[0];
    bridge.setControlValue("searchInput", firstRow.material_id || "");
    bridge.updateFilterStateFromControls();
    bridge.renderOverviewForTest();

    const beforeState = bridge.getState();
    const beforeRegistry = bridge.getRegistrySnapshot();
    const beforeRows = bridge.getOverviewRows().map(row => ({
      key: row.inventory_row_key,
      stock: row.stock_value,
      recovery: row.recovery_potential
    }));
    const beforeMetrics = [...app.document.querySelectorAll(".metric .value")].map(element => element.textContent);
    const headerOnly = "Material Number,Material Description,Stock Value EUR,Profit Center,Program,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value";

    const result = await bridge.loadTextDataset(headerOnly, "header-only.csv", {
      sourceType: "upload",
      allowMappingReview: false,
      preserveFailureFeedback: true
    });
    const afterState = bridge.getState();
    const afterRegistry = bridge.getRegistrySnapshot();
    const afterRows = bridge.getOverviewRows().map(row => ({
      key: row.inventory_row_key,
      stock: row.stock_value,
      recovery: row.recovery_potential
    }));
    bridge.renderOverviewForTest();
    const afterMetrics = [...app.document.querySelectorAll(".metric .value")].map(element => element.textContent);

    assert.equal(result.status, "error", "Header-only upload must be rejected before Dataset activation");
    assert.equal(result.error?.code, "EMPTY_DATASET_ROWS", "Header-only rejection must expose a stable error code");
    assert.equal(afterState.currentDatasetId, beforeState.currentDatasetId, "Active Dataset identity must remain unchanged");
    assert.equal(afterState.activeInventoryPackageId, beforeState.activeInventoryPackageId, "Active Package identity must remain unchanged");
    assert.equal(afterState.rawRows, beforeState.rawRows, "Raw row count must remain unchanged");
    assert.equal(afterState.normalizedRows, beforeState.normalizedRows, "Normalized row count must remain unchanged");
    assert.equal(afterState.enrichedRows, beforeState.enrichedRows, "Enriched row count must remain unchanged");
    assert.equal(afterState.datasetIdentitySequence, beforeState.datasetIdentitySequence, "Rejected import must not consume a Dataset ID");
    assert.deepEqual(afterState.filterState, beforeState.filterState, "Filter state must remain unchanged");
    assert.equal(afterState.remediationActions, beforeState.remediationActions, "Action state must remain unchanged");
    assert.equal(afterState.issueDecisions, beforeState.issueDecisions, "Review state must remain unchanged");
    assert.deepEqual(afterRegistry, beforeRegistry, "Registry must remain byte-equivalent after rejection");
    assert.deepEqual(afterRows, beforeRows, "Active analytical rows and KPI inputs must remain unchanged");
    assert.deepEqual(afterMetrics, beforeMetrics, "Visible KPI values must remain unchanged");
    assert.ok(afterState.feedback.includes("keine Datenzeilen"), "The user must receive the explicit no-data-rows error");
    assert.equal(afterState.feedback.includes("geladen"), false, "No success message may be shown for the rejected upload");
  });

  test("R0A BUG-002 contains missing inventory identity before Unified Risk composition", async assert => {
    const app = await helpers.loadApp();
    const risks = app.ObsoliQ.inventoryRisks;
    const validRow = {
      inventory_row_key: "ROW-VALID",
      material_id: "MAT-VALID",
      material_description: "Valid blocked material",
      plant: "PLANT-1",
      profit_center: "PC-R0A",
      stock_value: 100,
      bad_stock_value: 50,
      net_bad_stock_value: 50,
      availability: "Blocked"
    };
    const missingIdentityRow = {
      inventory_row_key: "ROW-MISSING-IDENTITY",
      material_id: "",
      material_description: "Blocked row without material identity",
      plant: "PLANT-2",
      profit_center: "PC-R0A",
      stock_value: 80,
      bad_stock_value: 40,
      net_bad_stock_value: 40,
      availability: "Blocked"
    };

    const mixedCases = risks.blockedQualityRiskAdapter.adapt([validRow, missingIdentityRow], {
      datasetId: "R0A-MIXED",
      currency: "EUR"
    });
    assert.equal(mixedCases.length, 1, "A valid Risk Case must survive an invalid neighboring row");
    assert.equal(mixedCases[0].material_id, "MAT-VALID", "The valid material identity must remain unchanged");
    assert.equal(mixedCases[0].inventory_entity_key, "material:MAT-VALID|plant:PLANT-1", "Valid identity derivation must remain deterministic");
    assert.equal(mixedCases.diagnostics.length, 1, "The excluded row must produce one structured identity diagnostic");
    assert.equal(mixedCases.diagnostics[0].code, "missing_inventory_entity_identity", "The diagnostic must expose a stable reason code");
    assert.equal(mixedCases.diagnostics[0].material_id, "", "Containment must not invent a material number");
    assert.equal(mixedCases.diagnostics[0].disposition, "excluded_from_inventory_risk_portfolio", "The fail-closed disposition must be explicit");

    const mixedRuntime = risks.portfolioService.buildPortfolio({ blockedQualityCases: mixedCases });
    assert.equal(mixedRuntime.portfolioCases.length, 1, "Only the valid entity may enter the Unified portfolio");
    assert.equal(mixedRuntime.familyCases.length, 1, "Only the valid Family Case may enter the Unified portfolio");
    assert.equal(mixedRuntime.excludedFamilyCaseCount, 1, "Portfolio diagnostics must retain the excluded case count");
    assert.equal(mixedRuntime.capabilityStatus, "limited", "Identity containment must mark the runtime as limited");
    assert.equal(mixedRuntime.portfolioCases.some(item => !item.material_id), false, "No empty or artificial identity may be published");
    const mixedModel = risks.pageModel.buildPageModel({ runtime: mixedRuntime, state: { segment: "all" } });
    assert.equal(mixedModel.totalRows, 1, "Filtering must continue to operate on contained valid cases");
    assert.equal(mixedModel.excludedFamilyCaseCount, 1, "The page model must expose the visible containment diagnostic");
    const mixedExport = risks.exportBuilder.buildRows({ cases: mixedModel.filteredRows });
    assert.equal(mixedExport.rows.length, 1, "Export must include the valid case after containment");
    assert.equal(mixedExport.rows[0].material_id, "MAT-VALID", "Export must preserve the valid material identity");
    assert.equal(mixedExport.rows.some(row => !row.material_id || /^MISSING|^UNKNOWN|^ROW-/i.test(row.material_id)), false, "Export must not contain an invented identity");

    const invalidOnlyCases = risks.blockedQualityRiskAdapter.adapt([missingIdentityRow], {
      datasetId: "R0A-INVALID-ONLY",
      currency: "EUR"
    });
    const invalidOnlyRuntime = risks.portfolioService.buildPortfolio({ blockedQualityCases: invalidOnlyCases });
    const invalidOnlyModel = risks.pageModel.buildPageModel({ runtime: invalidOnlyRuntime, state: { segment: "all" } });
    assert.equal(invalidOnlyCases.length, 0, "An identity-invalid row must not form a Family Case");
    assert.equal(invalidOnlyRuntime.portfolioCases.length, 0, "An all-invalid set must not publish Portfolio Cases");
    assert.equal(invalidOnlyRuntime.capabilityStatus, "limited", "An all-invalid set must produce a limited runtime state");
    assert.equal(invalidOnlyRuntime.excludedFamilyCaseCount, 1, "The invalid-only diagnostic must remain available");
    assert.equal(invalidOnlyModel.emptyState, "risk_cases_excluded_missing_identity", "The all-invalid view must explain the missing identity");
    assert.equal(invalidOnlyModel.summary.evidenceReadiness, null, "The all-invalid view must not publish a fabricated readiness KPI");
    assert.equal(invalidOnlyModel.summary.uniqueRiskEntities, 0, "The all-invalid view must not publish a fabricated entity KPI");
  });

  test("R0A BUG-002 keeps Unified route, filters and export stable after identity containment", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const csv = [
      "Material,Material Description,Stock Value (EUR),Bad Stock (EUR),Profit Center,Plant,Availability",
      "MAT-ROUTE-VALID,Valid route case,100,50,PC-R0A,PLANT-1,Blocked",
      ",Missing identity route case,80,40,PC-R0A,PLANT-2,Blocked"
    ].join("\n");
    const loadResult = await bridge.loadTextDataset(csv, "r0a-identity-containment.csv", {
      sourceType: "sample",
      allowMappingReview: false,
      suppressSuccessFeedback: true
    });
    assert.equal(loadResult.status, "loaded", "The mixed identity fixture must remain a valid Dataset import");

    const route = bridge.switchInventoryRiskRouteForTest("inventory-risks", null, "all");
    const runtime = bridge.getInventoryRiskPortfolioForTest();
    assert.equal(route.currentView, "inventory-risks", "Unified Risk navigation must complete without an exception");
    assert.ok(runtime.portfolioCases.some(item => item.material_id === "MAT-ROUTE-VALID"), "The valid route case must remain visible");
    assert.equal(runtime.portfolioCases.some(item => !item.material_id), false, "The invalid route row must remain outside the portfolio");
    assert.ok(runtime.identityDiagnostics.some(item => item.code === "missing_inventory_entity_identity"), "Route runtime must expose the identity diagnostic");

    bridge.setInventoryRiskStateForTest({ filters: { search: "MAT-ROUTE-VALID" }, page: 1 });
    const filtered = bridge.getInventoryRiskPageModelForTest();
    assert.equal(filtered.totalRows, 1, "Unified Risk filtering must remain operational after containment");
    assert.equal(filtered.filteredRows[0].material_id, "MAT-ROUTE-VALID", "Filtering must return the valid material only");
    const exportRows = bridge.inventoryRiskRowsForExportForTest("filtered");
    const materialColumn = exportRows[0].indexOf("material_id");
    assert.ok(materialColumn >= 0, "Unified export must retain its material_id column");
    assert.equal(exportRows.length, 2, "Filtered export must contain one header and one valid case");
    assert.equal(exportRows[1][materialColumn], "MAT-ROUTE-VALID", "Filtered export must exclude the identity-invalid row");
  });

  test("R0A BUG-001 aggregates Evidence conservatively across every Family Case", async assert => {
    const app = await helpers.loadApp();
    const service = app.ObsoliQ.inventoryRisks.portfolioService;
    const buildStatus = statuses => {
      const families = ["excess_demand", "slow_dead", "blocked_quality"];
      const cases = statuses.map((status, index) => inventoryRiskFamilyCase(app, families[index], status, {
        suffix: `${index}-${status}`,
        limitations: index === 1 ? ["secondary_limitation", "shared_limitation"] : index === 2 ? ["shared_limitation"] : [],
        missing_evidence: index === 1 ? ["secondary_missing", "shared_missing"] : index === 2 ? ["shared_missing"] : []
      }));
      return service.buildPortfolio({
        excessCases: cases.filter(item => item.primary_risk_family === "excess_demand"),
        slowDeadCases: cases.filter(item => item.primary_risk_family === "slow_dead"),
        blockedQualityCases: cases.filter(item => item.primary_risk_family === "blocked_quality")
      });
    };

    assert.equal(buildStatus(["available", "available"]).portfolioCases[0].evidence_status, "available", "All available Family Cases must remain available");
    assert.equal(buildStatus(["available", "limited"]).portfolioCases[0].evidence_status, "limited", "A limited secondary Family Case must limit the portfolio");
    assert.equal(buildStatus(["available", "unavailable"]).portfolioCases[0].evidence_status, "unavailable", "An unavailable secondary Family Case must make the portfolio unavailable");
    assert.equal(buildStatus(["ready", "limited"]).portfolioCases[0].evidence_status, "limited", "A ready primary Family Case must not overrule limited secondary evidence");
    assert.equal(buildStatus(["ready", "complete", "available"]).portfolioCases[0].evidence_status, "available", "The weakest readiness-capable status must remain explicit");
    assert.equal(buildStatus(["available", "future_unknown_status"]).portfolioCases[0].evidence_status, "unavailable", "An unknown status must fail closed");
    assert.equal(service.aggregateEvidenceStatus([]), "unavailable", "An empty Family Case set must be unavailable");

    const mixedRuntime = buildStatus(["available", "limited", "unavailable"]);
    const portfolio = mixedRuntime.portfolioCases[0];
    assert.deepEqual(portfolio.secondary_risk_signals.sort(), ["blocked_quality", "slow_dead"], "No secondary Family signal may be lost");
    assert.deepEqual(portfolio.limitations.sort(), ["secondary_limitation", "shared_limitation"], "Limitations must remain a deduplicated union");
    assert.deepEqual(portfolio.missing_evidence.sort(), ["secondary_missing", "shared_missing"], "Missing Evidence must remain a deduplicated union");
    assert.equal(Object.values(portfolio.family_cases).flat().length, 3, "Every contributing Family Case must remain traceable");
    const exported = app.ObsoliQ.inventoryRisks.exportBuilder.buildRows({ cases: [portfolio] });
    assert.equal(exported.rows[0].evidence_status, "unavailable", "Export must publish the aggregated conservative Evidence status");
  });

  test("R0A BUG-001 exposes Portfolio Evidence numerator, denominator and secondary-family detail", async assert => {
    const app = await helpers.loadApp();
    const risks = app.ObsoliQ.inventoryRisks;
    const mixedCases = [
      inventoryRiskFamilyCase(app, "excess_demand", "ready", { suffix: "ready-primary" }),
      inventoryRiskFamilyCase(app, "slow_dead", "limited", {
        suffix: "limited-secondary",
        limitations: ["history_window_limited"],
        missing_evidence: ["consumption_history"]
      }),
      inventoryRiskFamilyCase(app, "blocked_quality", "available", {
        suffix: "available-secondary",
        missing_evidence: ["quality_release_decision"]
      })
    ];
    const mixedRuntime = risks.portfolioService.buildPortfolio({
      excessCases: [mixedCases[0]],
      slowDeadCases: [mixedCases[1]],
      blockedQualityCases: [mixedCases[2]]
    });
    const mixedModel = risks.pageModel.buildPageModel({ runtime: mixedRuntime, state: { segment: "all" } });
    assert.equal(mixedModel.summary.evidenceReadyCount, 0, "A limited secondary Family Case must keep the Portfolio numerator at zero");
    assert.equal(mixedModel.summary.evidenceTotalCount, 1, "The Evidence denominator must count Portfolio Cases, not Family rows");
    assert.equal(mixedModel.summary.evidenceReadiness, 0, "A non-ready Portfolio Case must produce a real zero ratio");

    const familySegment = risks.pageModel.buildPageModel({ runtime: mixedRuntime, state: { segment: "slow_dead" } });
    assert.equal(familySegment.totalRows, 1, "Family segment filtering must remain intact");
    assert.equal(familySegment.summary.evidenceTotalCount, 0, "Family rows must not inflate the Portfolio Evidence denominator");
    assert.equal(familySegment.summary.evidenceReadiness, null, "A segment without Portfolio rows must display Evidence Readiness as unavailable");

    const readyCases = [
      inventoryRiskFamilyCase(app, "excess_demand", "ready", { suffix: "all-ready" }),
      inventoryRiskFamilyCase(app, "slow_dead", "complete", { suffix: "all-complete" }),
      inventoryRiskFamilyCase(app, "blocked_quality", "available", { suffix: "all-available" })
    ];
    const readyRuntime = risks.portfolioService.buildPortfolio({
      excessCases: [readyCases[0]],
      slowDeadCases: [readyCases[1]],
      blockedQualityCases: [readyCases[2]]
    });
    const readyModel = risks.pageModel.buildPageModel({ runtime: readyRuntime, state: { segment: "all" } });
    assert.equal(readyModel.summary.evidenceReadyCount, 1, "A fully readiness-capable Portfolio must count as ready");
    assert.equal(readyModel.summary.evidenceTotalCount, 1, "The ready Portfolio denominator must remain one entity");
    assert.equal(readyModel.summary.evidenceReadiness, 1, "A fully readiness-capable Portfolio must produce 100 percent");

    const emptyRuntime = risks.portfolioService.buildPortfolio({});
    const emptyModel = risks.pageModel.buildPageModel({ runtime: emptyRuntime, state: { segment: "all" } });
    assert.equal(emptyModel.summary.evidenceReadyCount, 0, "An empty Portfolio numerator must be zero");
    assert.equal(emptyModel.summary.evidenceTotalCount, 0, "An empty Portfolio denominator must be zero");
    assert.equal(emptyModel.summary.evidenceReadiness, null, "An empty denominator must not be displayed as zero percent");

    const translations = {
      inventoryRiskEvidenceReadiness: "Evidence Readiness",
      inventoryRiskEvidenceReadinessCount: "{ready} / {total} cases",
      inventoryRiskEvidenceReadinessHelp: "Readiness help",
      inventoryRiskSecondaryFamilies: "Secondary families",
      inventoryRiskCapabilityStatus: "Capability status",
      inventoryRiskCapability_available: "Available capability",
      inventoryRiskSeparatedValue: "Separated financial semantic",
      inventoryRiskLimitations: "Limitations",
      inventoryRiskMissingEvidence: "Missing evidence",
      inventoryRiskFamily_slow_dead: "Slow / Dead",
      inventoryRiskFamily_blocked_quality: "Blocked / Quality",
      inventoryRiskEvidence_limited: "Limited",
      inventoryRiskEvidence_available: "Available",
      inventoryRiskExposure: "Inventory Exposure",
      inventoryRiskBlockedValue: "Blocked Value",
      notAvailable: "n/a",
      all: "All"
    };
    const view = app.ObsoliQ.application.inventoryRiskPageView.createInventoryRiskPageView({
      t: key => translations[key] || key,
      escapeHtml: value => String(value ?? ""),
      formatCompactMoney: value => `${value} EUR`,
      formatMoney: value => `${value} EUR`,
      formatCount: value => String(value ?? 0),
      formatPercent: value => value === null ? "n/a" : `${Math.round(value * 100)}%`
    });
    const html = view.render(mixedModel, { detailHtml: "<div>Primary detail</div>" });
    assert.ok(html.includes("0 / 1 cases"), "The UI must show the Evidence numerator and denominator");
    assert.ok(html.includes("Readiness help"), "The Evidence KPI must expose its explanatory tooltip");
    assert.ok(html.includes("Secondary families"), "All-/Prioritized detail must expose secondary Family Cases");
    assert.ok(html.includes("Slow / Dead"), "Secondary Slow / Dead provenance must remain visible");
    assert.ok(html.includes("Blocked / Quality"), "Secondary Blocked / Quality provenance must remain visible");
    assert.ok(html.includes("Inventory Exposure"), "Slow / Dead financial semantics must remain separated");
    assert.ok(html.includes("Blocked Value"), "Blocked / Quality financial semantics must remain separated");
    assert.ok(html.includes("consumption_history"), "Secondary Missing Evidence must remain visible");
    assert.ok(html.includes("history_window_limited"), "Secondary limitations must remain visible");

    const emptyHtml = view.render(emptyModel);
    const summaryStart = emptyHtml.indexOf("Evidence Readiness");
    const summaryExcerpt = emptyHtml.slice(summaryStart, summaryStart + 300);
    assert.ok(summaryExcerpt.includes("n/a"), "The UI must show unavailable for an empty Evidence denominator");
    assert.equal(summaryExcerpt.includes("0%"), false, "The UI must not turn an empty Evidence denominator into zero percent");
  });
})();
