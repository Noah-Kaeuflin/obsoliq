(function () {
  "use strict";

  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function familyCase(contract, family, overrides = {}) {
    const defaults = {
      family_case_id: `${family.toUpperCase()}::ROW-0007`,
      inventory_entity_key: "material:00001234|plant:1000",
      inventory_row_keys: ["ROW-0007"],
      material_id: "00001234",
      material_description: "IR-01 contract material",
      plant: "1000",
      profit_center: "PC-1000",
      program: "PROGRAM-A",
      primary_risk_family: family,
      primary_risk_subtype: family === "excess_demand" ? "excess" : family === "slow_dead" ? "slow_moving" : "blocked",
      priority: family === "blocked_quality" ? "critical" : "high",
      score_status: family === "excess_demand" ? "available" : "not_supported",
      score_model_id: family === "excess_demand" ? "accepted-excess-score-v1" : "",
      score_value: family === "excess_demand" ? 82 : null,
      inventory_exposure: family === "slow_dead" ? 200 : null,
      net_addressable_value: family === "excess_demand" ? 80 : null,
      blocked_quality_value: family === "blocked_quality" ? 30 : null,
      currency: "EUR",
      owner_function: "Material Planning",
      owner_reference: "G06",
      owner_source: "accepted_owner_context",
      owner_assignment_confidence: "High",
      evidence_status: family === "blocked_quality" ? "limited" : "ready",
      evidence: [{ code: `${family}_evidence` }],
      limitations: family === "blocked_quality" ? ["blocked_quality_capability_limited"] : [],
      missing_evidence: family === "blocked_quality" ? ["confirmed_quality_cause"] : [],
      source_package_ids: ["PKG-IR-01"],
      source_package_revisions: ["REV-0001"],
      provenance: { source: family, row: "ROW-0007" },
      capability_status: family === "blocked_quality" ? "limited" : "available"
    };
    return contract.createFamilyCase({ ...defaults, ...overrides });
  }

  test("IR-01B exposes one Inventory Risks main-navigation entry and no legacy risk buttons", async assert => {
    const app = await helpers.loadApp();
    const buttons = [...app.document.querySelectorAll(".process-tabs button[data-process]")];
    assert.equal(buttons.filter(button => button.dataset.process === "inventory-risks").length, 1, "Inventory Risks must occur exactly once in the visible main navigation");
    assert.equal(buttons.filter(button => ["excess-stock", "slow-dead-stock", "blocked-quality"].includes(button.dataset.process)).length, 0, "Legacy risk routes must not remain visible as main-navigation buttons");
    assert.equal(buttons.length, 8, "The consolidated shell should expose eight visible product sections");
  });

  test("IR-01A deduplicates one multi-risk entity while preserving Family Case identity and leading zeros", async assert => {
    const app = await helpers.loadApp();
    const contract = app.ObsoliQ.inventoryRisks.caseContract;
    const service = app.ObsoliQ.inventoryRisks.portfolioService;
    const cases = [
      familyCase(contract, "excess_demand"),
      familyCase(contract, "slow_dead", { score_status: "available", score_value: 99 }),
      familyCase(contract, "blocked_quality", { score_status: "available", score_value: 97 })
    ];
    const runtime = service.buildPortfolio({
      excessCases: [cases[0]],
      slowDeadCases: [cases[1]],
      blockedQualityCases: [cases[2]],
      analyticsRevision: "IR-01-SYNTHETIC-1"
    });
    const portfolio = runtime.portfolioCases[0];

    assert.equal(runtime.portfolioCases.length, 1, "All Risks must contain one Portfolio Case for one Inventory Entity");
    assert.deepEqual(runtime.counts, { all: 1, excess_demand: 1, slow_dead: 1, blocked_quality: 1, prioritized: 1 }, "Each Family Case must remain available in its family segment");
    assert.equal(portfolio.material_id, "00001234", "Leading-zero material IDs must remain text and preserve their zeros");
    assert.equal(portfolio.family_case_ids.excess_demand, cases[0].family_case_id, "Excess Family Case identity must be preserved");
    assert.equal(portfolio.family_case_ids.slow_dead, cases[1].family_case_id, "Slow / Dead Family Case identity must be preserved");
    assert.equal(portfolio.family_case_ids.blocked_quality, cases[2].family_case_id, "Blocked / Quality Family Case identity must be preserved");
    assert.deepEqual(portfolio.secondary_risk_signals.sort(), ["excess_demand", "slow_dead"], "Secondary family signals must remain visible on the deduplicated case");
    assert.equal(runtime.familyCases.find(item => item.primary_risk_family === "slow_dead").score_status, "not_supported", "Slow / Dead must reject an injected Excess-style score");
    assert.equal(runtime.familyCases.find(item => item.primary_risk_family === "slow_dead").score_value, null, "Slow / Dead score value must remain null");
    assert.equal(runtime.familyCases.find(item => item.primary_risk_family === "blocked_quality").score_status, "not_supported", "Blocked / Quality must reject an injected Excess-style score");
    assert.equal(portfolio.capability_status, "limited", "A Portfolio Case containing Blocked / Quality must expose the limited capability");
    assert.equal(portfolio.provenance.family_provenance[cases[0].family_case_id].source, "excess_demand", "Family provenance must survive portfolio deduplication");
  });

  test("IR-01A keeps financial semantics separate and missing values unavailable", async assert => {
    const app = await helpers.loadApp();
    const contract = app.ObsoliQ.inventoryRisks.caseContract;
    const service = app.ObsoliQ.inventoryRisks.portfolioService;
    const pageModel = app.ObsoliQ.inventoryRisks.pageModel;
    const completeCases = [
      familyCase(contract, "excess_demand"),
      familyCase(contract, "slow_dead"),
      familyCase(contract, "blocked_quality")
    ];
    const completeRuntime = service.buildPortfolio({
      excessCases: [completeCases[0]],
      slowDeadCases: [completeCases[1]],
      blockedQualityCases: [completeCases[2]]
    });
    const complete = pageModel.buildPageModel({ runtime: completeRuntime, state: { segment: "all" } });
    const missingExcess = familyCase(contract, "excess_demand", {
      family_case_id: "EXCESS_DEMAND::ROW-0008",
      inventory_entity_key: "material:00005678|plant:1000",
      inventory_row_keys: ["ROW-0008"],
      material_id: "00005678",
      net_addressable_value: undefined
    });
    const incompleteRuntime = service.buildPortfolio({
      excessCases: [completeCases[0], missingExcess],
      slowDeadCases: [completeCases[1]],
      blockedQualityCases: [completeCases[2]]
    });
    const incomplete = pageModel.buildPageModel({ runtime: incompleteRuntime, state: { segment: "all" } });

    assert.equal(complete.summary.financials.netAddressable.value, 80, "Excess Net Addressable must keep its own semantic amount");
    assert.equal(complete.summary.financials.slowDeadExposure.value, 200, "Slow / Dead exposure must keep its own semantic amount");
    assert.equal(complete.summary.financials.blockedQualityValue.value, 30, "Blocked / Quality value must keep its own semantic amount");
    assert.equal(Object.prototype.hasOwnProperty.call(complete.summary.financials, "totalRecovery"), false, "The model must not expose a false combined recovery total");
    assert.equal(incomplete.summary.financials.netAddressable.status, "incomplete", "One missing Excess amount must make that semantic aggregate incomplete");
    assert.equal(incomplete.summary.financials.netAddressable.value, null, "A missing financial amount must not become zero or a partial total");
  });

  test("IR-01A adapters consume accepted family outputs without cross-family score leakage", async assert => {
    const app = await helpers.loadApp();
    const adapters = app.ObsoliQ.inventoryRisks;
    const excess = adapters.excessRiskAdapter.adapt({ cases: [{
      case_id: "EXCESS::PKG::ROW-0010",
      inventory_entity_key: "material:00009999|plant:2000",
      inventory_row_key: "ROW-0010",
      material_id: "00009999",
      plant: "2000",
      primary_category: "excess",
      priority: "High",
      excess_opportunity_score: 77,
      net_addressable_excess_value: 125,
      stock_value: 300,
      currency_unit: "EUR"
    }] });
    const slowDead = adapters.slowDeadRiskAdapter.adapt({
      status: "available",
      result: { cases: [{
        case_id: "SLOW-DEAD::PKG::ROW-0011",
        inventory_entity_key: "material:00008888|plant:2000",
        inventory_row_keys: ["ROW-0011"],
        material_id: "00008888",
        plant: "2000",
        condition_code: "dead_stock_candidate",
        evidence_strength: "high",
        stock_value: 450,
        currency: "EUR"
      }] }
    });
    const blocked = adapters.blockedQualityRiskAdapter.adapt([{
      inventory_entity_key: "material:00007777|plant:2000",
      inventory_row_key: "ROW-0012",
      material_id: "00007777",
      plant: "2000",
      bad_stock_value: 60,
      priority: "Medium"
    }, {
      inventory_entity_key: "material:00006666|plant:2000",
      inventory_row_key: "ROW-0013",
      material_id: "00006666",
      plant: "2000",
      bad_stock_value: 0
    }], { datasetId: "DS-IR-01", currency: "EUR" });

    assert.equal(excess.length, 1, "Excess adapter must consume an accepted Excess Case");
    assert.equal(excess[0].score_status, "available", "Excess adapter may retain its accepted Opportunity Score");
    assert.equal(excess[0].score_value, 77, "Excess adapter must retain the accepted score value without recalculation");
    assert.equal(slowDead.length, 1, "Slow / Dead adapter must consume cases from runtime.result.cases");
    assert.equal(slowDead[0].score_status, "not_supported", "Slow / Dead adapter must not project an Opportunity Score");
    assert.equal(slowDead[0].inventory_exposure, 450, "Slow / Dead adapter must retain Inventory Exposure");
    assert.equal(blocked.length, 1, "Blocked adapter must include only rows with defensible blocked evidence");
    assert.equal(blocked[0].capability_status, "limited", "Blocked / Quality adapter must remain explicitly limited");
    assert.includes(blocked[0].missing_evidence, "confirmed_quality_cause", "Blocked / Quality must state unavailable Quality evidence instead of inventing it");
  });

  test("IR-01C compatibility aliases select exact unified segments without analytical rebuilds", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.resetInventoryRiskPortfolioForTest();
    const registryBefore = bridge.getRegistrySnapshot();
    const excess = bridge.switchInventoryRiskRouteForTest("excess-stock");
    const afterInitialBuild = bridge.getInventoryRiskStateForTest();
    const slowDead = bridge.switchInventoryRiskRouteForTest("slow-dead-stock");
    const blocked = bridge.switchInventoryRiskRouteForTest("blocked-quality");
    bridge.setInventoryRiskStateForTest({ filters: { search: "MAT" }, sortKey: "material", page: 1, pageSize: 10 });
    const afterPresentationChanges = bridge.getInventoryRiskStateForTest();
    const registryAfter = bridge.getRegistrySnapshot();

    assert.equal(excess.activeProcessKey, "inventory-risks", "Excess alias must open the unified process key");
    assert.equal(excess.pageState.segment, "excess_demand", "Excess alias must activate Excess & Demand");
    assert.equal(slowDead.pageState.segment, "slow_dead", "Slow / Dead alias must activate Slow / Dead");
    assert.equal(blocked.pageState.segment, "blocked_quality", "Blocked / Quality alias must activate Blocked / Quality");
    assert.equal(afterPresentationChanges.portfolioBuildCount, afterInitialBuild.portfolioBuildCount, "Filtering, sorting and pagination must not rebuild analytical runtimes");
    assert.deepEqual(registryAfter, registryBefore, "Presentation interactions must not create Package revisions");
  });

  test("IR-01C preserves exact selection, exports one row per scope case and localizes the workbench", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const runtime = bridge.getInventoryRiskPortfolioForTest();
    const excessCase = runtime.familyCases.find(item => item.primary_risk_family === "excess_demand");
    const exact = bridge.switchInventoryRiskRouteForTest("excess-stock", excessCase?.family_case_id || "MISSING-EXCESS");
    const missing = bridge.switchInventoryRiskRouteForTest("blocked-quality", "DOES-NOT-EXIST");
    bridge.switchInventoryRiskRouteForTest("inventory-risks", null, "all");
    const allModel = bridge.getInventoryRiskPageModelForTest();
    const exported = bridge.inventoryRiskRowsForExportForTest("filtered");

    assert.ok(Boolean(excessCase), "Sample data must expose an Excess Family Case for exact-route validation");
    assert.equal(exact.model.selectedCaseId, excessCase.family_case_id, "A supplied Family Case ID must remain the selected Case in its alias segment");
    assert.equal(missing.model.exactSelectionMissing, true, "A missing exact target must not select an unrelated first Case");
    assert.equal(missing.model.selectedCase, null, "A missing exact target must leave the detail selection empty");
    assert.equal(exported.length - 1, allModel.filteredRows.length, "The filtered export must contain one data row per visible-scope Case");
    assert.includes(exported[0], "net_addressable_value", "Export must retain the separate Excess amount column");
    assert.includes(exported[0], "inventory_exposure", "Export must retain the separate Slow / Dead exposure column");
    assert.includes(exported[0], "blocked_quality_value", "Export must retain the separate Blocked / Quality value column");

    bridge.updateLanguageForTest("de");
    const german = bridge.renderInventoryRiskPageForTest();
    bridge.updateLanguageForTest("en");
    const english = bridge.renderInventoryRiskPageForTest();
    assert.ok(["Alle Risiken", "Überbestand & Bedarf", "Langsam / Totbestand", "Gesperrt / Qualität", "Priorisierte Fälle"].every(label => german.includes(label)), "All German segment labels must be present");
    assert.ok(["All Risks", "Excess & Demand", "Slow / Dead", "Blocked / Quality", "Prioritized Cases"].every(label => english.includes(label)), "All English segment labels must be present");
  });

  test("IR-01C unified Case navigation remains entity-exact for Inventory and Actions", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const runtime = bridge.getInventoryRiskPortfolioForTest();
    const excessCase = runtime.familyCases.find(item => item.primary_risk_family === "excess_demand");
    const inventoryResult = bridge.openInventoryForInventoryRiskCaseForTest(excessCase?.family_case_id || "");
    bridge.switchInventoryRiskRouteForTest("excess-stock", excessCase?.family_case_id || "");
    const actionsResult = bridge.openActionsForInventoryRiskCaseForTest(excessCase?.family_case_id || "");

    assert.ok(Boolean(excessCase), "Sample data must provide a navigable Excess Family Case");
    assert.equal(inventoryResult.status, "opened", "Unified Case must open the linked Inventory entity");
    assert.equal(inventoryResult.target.inventory_entity_key, excessCase.inventory_entity_key, "Inventory target must preserve the exact Inventory Entity key");
    assert.equal(actionsResult.status, "opened", "Unified Case must open the linked existing Action");
    assert.equal(actionsResult.target.inventory_entity_key, excessCase.inventory_entity_key, "Actions target must preserve the exact Inventory Entity key");
  });
})();
