(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function isVisible(app, selector) {
    const element = app.document.querySelector(selector);
    if (!element) return false;
    const style = app.getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  }

  function setControl(app, selector, value, eventName = "change") {
    const control = app.document.querySelector(selector);
    if (!control) throw new Error(`Missing control ${selector}`);
    control.value = value;
    control.dispatchEvent(new app.Event(eventName, { bubbles: true }));
    return control.value;
  }

  function summarySignature(model) {
    const summary = model.summary || {};
    return {
      caseCount: summary.caseCount,
      grossExcessValue: summary.grossExcessValue,
      netAddressableExcessValue: summary.netAddressableExcessValue,
      overlapValue: summary.overlapValue,
      averageOpportunityScore: summary.averageOpportunityScore
    };
  }

  function scoreSignature(model) {
    return (model.cases || []).map(item => [
      item.case_id,
      item.material_id,
      item.plant || "",
      item.profit_center || "",
      item.net_addressable_excess_value,
      item.gross_excess_value,
      item.excess_overlap_value,
      item.excess_opportunity_score
    ].join("|"));
  }

  function scenarioSignature(model) {
    return (model.cases || []).slice(0, 5).map(item => [
      item.case_id,
      (item.scenarios || []).map(scenario => [
        scenario.scenario_id,
        scenario.availability || "",
        scenario.available ? "available" : "unavailable",
        Number(scenario.estimated_impact_value || 0)
      ].join(":")).join(";")
    ].join("|"));
  }

  function duplicateMaterialCsv() {
    return [
      "Material Number,Plant,Material Description,Program short,Profit Center,Stock Quantity,Stock Value (EUR),Good Stock (EUR),Bad Stock (EUR),No Need / Conso EUR,No Need / No Con EUR,Excess (EUR),No Plan (EUR)",
      "MAT-DUP,DE01,Duplicate sensor A,PROG-X,PC-A,10,100000,100000,0,0,0,80000,0",
      "MAT-DUP,DE02,Duplicate sensor B,PROG-X,PC-B,10,90000,90000,0,0,0,50000,0",
      "MAT-UNIQ,DE03,Unique valve,PROG-Y,PC-C,5,50000,50000,0,0,0,20000,0"
    ].join("\n");
  }

  test("EX-UX-01 Excess route owns its header, toolbar and bounded split workspace", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();

    assert.equal(app.document.getElementById("overviewWorkspace").dataset.view, "excess", "Workspace should expose the Excess route state");
    assert.equal(app.document.getElementById("view-excess").classList.contains("active"), true, "Excess view should be active");
    assert.equal(isVisible(app, ".overview-header"), false, "Overview header should be hidden on Excess");
    assert.equal(isVisible(app, ".overview-top"), false, "Overview KPI cards should be hidden on Excess");
    assert.equal(isVisible(app, "#overviewGlobalFilterBlock"), false, "Overview filters should be hidden on Excess");
    assert.equal(isVisible(app, "#overviewToolbarSlot"), false, "Overview toolbar parking slot should be hidden on Excess");
    assert.equal(isVisible(app, "#dataPackagesPanel"), false, "Data Foundation should remain Overview-owned");
    assert.equal(isVisible(app, ".excess-page-header"), true, "Dedicated Excess page header should be visible");
    assert.equal(app.document.getElementById("sharedToolbar")?.parentElement?.id, "excessToolbarSlot", "Shared toolbar should be owned by the Excess toolbar slot");
    assert.ok((app.document.getElementById("excessPage")?.textContent || "").includes("Uberbestand") || (app.document.getElementById("excessPage")?.textContent || "").includes("Überbestand"), "German Excess title should be visible");

    const tableWrap = app.document.querySelector(".excess-table-wrap");
    const detailScroll = app.document.querySelector(".excess-detail-scroll");
    const worklistPanel = app.document.querySelector(".excess-worklist-panel");
    const detailPanel = app.document.querySelector(".excess-detail-panel");
    assert.equal(app.getComputedStyle(tableWrap).overflowY, "auto", "Worklist table wrapper should own vertical overflow");
    assert.equal(app.getComputedStyle(detailScroll).overflowY, "auto", "Detail content should own vertical overflow");
    assert.equal(app.getComputedStyle(worklistPanel).overflowY, "hidden", "Worklist panel should not expand the document");
    assert.equal(app.getComputedStyle(detailPanel).overflowY, "hidden", "Detail panel should not expand the document");
    assert.ok(app.document.querySelector(".excess-pagination"), "Pagination should remain outside the table scroll area");
    assert.ok(app.document.querySelector(".excess-detail-panel > .excess-decision-core"), "Decision Core should remain outside the detail scroll area");
    assert.equal(app.document.querySelector(".excess-detail-disclosure[open]"), null, "Secondary disclosures should be closed by default");
    assert.ok(app.document.querySelector(".scenario-detail-disclosure"), "Scenario evidence should remain available as disclosure");
  });

  test("EX-UX-01 Excess filters are presentation-only and show portfolio context only when scope differs", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.resetExcessPageModelBuildCountForTest();
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();

    const portfolioBefore = bridge.currentExcessPageModelForTest();
    const summaryBefore = summarySignature(portfolioBefore);
    const scoreBefore = scoreSignature(portfolioBefore);
    const scenarioBefore = scenarioSignature(portfolioBefore);
    const initialRows = bridge.getExcessPageStateForTest().totalRows;
    const buildCountAfterOpen = bridge.getExcessPageModelBuildCountForTest();
    assert.equal(buildCountAfterOpen, 1, "Opening Excess should build the portfolio model once");
    assert.equal(app.document.querySelector(".excess-summary-context"), null, "Unfiltered Excess view should not show redundant portfolio context");

    const target = portfolioBefore.cases[0];
    setControl(app, "#searchInput", target.material_id, "input");
    const afterSearchRows = bridge.getExcessPageStateForTest().totalRows;
    assert.ok(afterSearchRows > 0 && afterSearchRows < initialRows, "Search should change visible Excess cases");
    assert.ok(app.document.querySelector(".excess-summary-context"), "Filtered Excess scope should show portfolio context");

    setControl(app, "#searchInput", "", "input");
    setControl(app, "#plantFilter", target.profit_center || "", "change");
    assert.ok(bridge.getExcessPageStateForTest().totalRows > 0 && bridge.getExcessPageStateForTest().totalRows < initialRows, "Profit Center filter should change visible Excess cases");

    setControl(app, "#plantFilter", "", "change");
    setControl(app, "#groupFilter", target.program_short || target.program || "", "change");
    assert.ok(bridge.getExcessPageStateForTest().totalRows > 0 && bridge.getExcessPageStateForTest().totalRows < initialRows, "Program filter should change visible Excess cases");

    const categoryOptions = [...app.document.querySelectorAll("#categoryFilter option")].map(option => option.value).filter(Boolean);
    const changingCategory = categoryOptions.find(value => (
      portfolioBefore.cases.filter(item => [item.category, item.primary_category].some(candidate => String(candidate || "") === value)).length !== initialRows
    ));
    assert.ok(changingCategory, "Sample data should expose a category value for the hidden-state regression");
    setControl(app, "#groupFilter", "", "change");
    setControl(app, "#categoryFilter", changingCategory, "change");
    assert.equal(bridge.getExcessPageStateForTest().totalRows, initialRows, "Hidden Category must not change visible Excess cases");

    setControl(app, "#categoryFilter", "", "change");
    assert.equal(bridge.getExcessPageStateForTest().totalRows, initialRows, "Resetting common filters should restore the complete Excess portfolio");

    try {
      const closedDisclosure = app.document.querySelector(".excess-detail-disclosure:not([open]) > summary");
      if (closedDisclosure) closedDisclosure.click();
      app.scrollTo(0, 180);
      setControl(app, "#languageSelect", "en", "change");
      setControl(app, "#currencySelect", "USD", "change");
      const darkMode = app.document.getElementById("darkModeToggle");
      darkMode.checked = !darkMode.checked;
      darkMode.dispatchEvent(new app.Event("change", { bubbles: true }));
      app.document.querySelector("[data-export-excess]")?.click();
    } finally {
      setControl(app, "#languageSelect", "de", "change");
      setControl(app, "#currencySelect", "EUR", "change");
      const darkMode = app.document.getElementById("darkModeToggle");
      if (darkMode.checked) {
        darkMode.checked = false;
        darkMode.dispatchEvent(new app.Event("change", { bubbles: true }));
      }
    }

    const portfolioAfter = bridge.currentExcessPageModelForTest();
    assert.equal(bridge.getExcessPageModelBuildCountForTest(), buildCountAfterOpen, "Filtering and presentation actions must not rebuild Excess analytics");
    assert.deepEqual(summarySignature(portfolioAfter), summaryBefore, "Portfolio summary should remain analytically unchanged");
    assert.deepEqual(scoreSignature(portfolioAfter), scoreBefore, "Opportunity scores should remain unchanged");
    assert.deepEqual(scenarioSignature(portfolioAfter), scenarioBefore, "Scenario results should remain unchanged");
  });

  test("EX-UX-01 Excess to Actions navigation uses entity identity and does not mutate Actions or Registry", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const loaded = await bridge.loadTextDataset(duplicateMaterialCsv(), "ex-ux-01-duplicate-material.csv", {
      sourceType: "upload",
      allowMappingReview: false
    });
    assert.equal(loaded.status, "loaded", "Duplicate-material inventory fixture should load");
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const model = bridge.currentExcessPageModelForTest();
    const target = model.cases.find(item => item.material_id === "MAT-DUP" && item.plant === "DE02");
    assert.ok(target?.case_id, "Fixture should expose the DE02 duplicate material Excess case");

    const exactActionRow = bridge.excessActionRowForCaseForTest(target);
    assert.equal(exactActionRow?.material_description, "Duplicate sensor B", "Exact material + plant target should resolve the DE02 Action row");
    assert.equal(bridge.excessActionRowForCaseForTest({ material_id: "MAT-DUP" }), null, "Material-only ambiguous target should be blocked");
    assert.equal(bridge.excessActionRowForCaseForTest({ material_id: "MAT-UNIQ" })?.material_description, "Unique valve", "Material-only fallback should work only when unique");

    const actionSignatureBefore = bridge.getEnrichedRowsForTest().map(row => [
      row.inventory_row_key,
      row.material_id,
      row.plant || "",
      row.status,
      row.recommended_action
    ].join("|"));
    const packageBefore = bridge.activeInventoryPackageIdentityForTest();
    const registryBefore = bridge.getRegistryStats();

    bridge.setColumnFilterForTest("actions", "material_action", "__NO_VISIBLE_ACTION__");
    const result = bridge.openActionsForExcessCaseForTest(target.case_id);
    const actionsText = app.document.getElementById("actionsTable")?.textContent || "";

    assert.equal(result.status, "opened", "Exact Excess case should open the linked Action workspace");
    assert.equal(bridge.getState().currentView, "actions", "Actions view should be active after Excess navigation");
    assert.deepEqual(bridge.getState().filterState.columnFilters.actions, { material_action: "__NO_VISIBLE_ACTION__" }, "Action filters should remain untouched");
    assert.ok(actionsText.includes("Duplicate sensor B"), "Reveal row should be the intended plant-specific Action");
    assert.equal(actionsText.includes("Duplicate sensor A"), false, "Same material in another plant should not become the revealed Action target");
    assert.deepEqual(bridge.getEnrichedRowsForTest().map(row => [
      row.inventory_row_key,
      row.material_id,
      row.plant || "",
      row.status,
      row.recommended_action
    ].join("|")), actionSignatureBefore, "Navigation must not mutate Action rows");
    assert.deepEqual(bridge.activeInventoryPackageIdentityForTest(), packageBefore, "Navigation must not change package identity or revision");
    assert.deepEqual(bridge.getRegistryStats(), registryBefore, "Navigation must not mutate the Registry");
  });
})();
