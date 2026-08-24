(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function isVisible(app, elementOrSelector) {
    const element = typeof elementOrSelector === "string"
      ? app.document.querySelector(elementOrSelector)
      : elementOrSelector;
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

  function excessModelSignature(model) {
    const summary = model.summary || {};
    return {
      summary: {
        caseCount: summary.caseCount,
        grossExcessValue: summary.grossExcessValue,
        netAddressableExcessValue: summary.netAddressableExcessValue,
        overlapValue: summary.overlapValue,
        averageOpportunityScore: summary.averageOpportunityScore
      },
      cases: (model.cases || []).map(item => [
        item.case_id,
        item.excess_opportunity_score,
        item.net_addressable_excess_value,
        item.gross_excess_value,
        item.excess_overlap_value
      ].join("|")),
      scenarios: (model.cases || []).slice(0, 5).map(item => [
        item.case_id,
        (item.scenarios || []).map(scenario => [
          scenario.scenario_id,
          scenario.availability || "",
          Number(scenario.estimated_impact_value || 0)
        ].join(":")).join(";")
      ].join("|"))
    };
  }

  test("EX-UX-01.1 Excess header is compact and owns only one main export action", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();

    const header = app.document.querySelector(".excess-page-header");
    assert.ok(header, "Excess page header should render");
    assert.equal(header.querySelector(".dataset-context"), null, "Excess header should not render local dataset context");
    assert.equal(header.querySelectorAll("[data-export-excess]").length, 1, "Excess header should expose one main export action");
    assert.equal(header.querySelector("[data-export-excess]").textContent.trim(), "Exportieren", "German main export label should be compact");
    assert.equal(header.querySelector("[data-export-pilot-reviews]"), null, "Pilot Review export should not live in the page header");
    assert.ok(app.document.querySelector(".excess-detail-disclosure [data-export-pilot-reviews]"), "Pilot Review export should remain available in Pilot Review context");
    setControl(app, "#languageSelect", "en", "change");
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    assert.equal(app.document.querySelector(".excess-page-header [data-export-excess]").textContent.trim(), "Export", "English main export label should be compact");
    setControl(app, "#languageSelect", "de", "change");
  });

  test("EX-UX-01.1 Excess hides row limit while Inventory Explorer keeps it", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();

    const rowLimitField = app.document.getElementById("rowLimit")?.closest(".field");
    assert.ok(rowLimitField, "Shared row-limit control should still exist in the DOM");
    assert.equal(isVisible(app, rowLimitField), false, "Row-limit field should be hidden in Excess");
    assert.equal(isVisible(app, "#searchInput"), true, "Search should remain visible in Excess");
    assert.equal(isVisible(app, "#plantFilter"), true, "Plant / Profit Center should remain visible in Excess");
    assert.equal(isVisible(app, "#groupFilter"), true, "Program / Group should remain visible in Excess");
    assert.equal(isVisible(app, "#categoryFilter"), true, "Category should remain visible in Excess");

    const beforeRows = bridge.getExcessPageStateForTest().totalRows;
    setControl(app, "#rowLimit", "250", "change");
    assert.equal(bridge.getExcessPageStateForTest().totalRows, beforeRows, "Changing rowLimit should not alter Excess cases");
    assert.equal((app.document.getElementById("excessActiveFilters")?.textContent || "").includes("Bestandszeilen"), false, "Excess active filters should not render a row-limit chip");

    bridge.switchViewForTest("inventory");
    bridge.renderInventoryExplorerForTest();
    assert.equal(isVisible(app, app.document.getElementById("rowLimit")?.closest(".field")), true, "Inventory Explorer should keep the row-limit field visible");
  });

  test("EX-UX-01.1 Excess summary and worklist use the final decision hierarchy", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();

    const model = bridge.currentExcessPageModelForTest();
    const summary = model.summary;
    const cards = [...app.document.querySelectorAll(".excess-summary-card")];
    assert.equal(cards.length, 4, "Excess summary should render four cards");
    assert.ok(cards[0].classList.contains("primary"), "Net Addressable should be first and primary");
    assert.ok(cards[0].textContent.includes("Netto adressierbar"), "First card should be Net Addressable");
    assert.ok(cards[1].textContent.includes(String(summary.caseCount)), "Case count should remain available in summary");
    assert.ok(cards[2].textContent.includes(`${summary.averageOpportunityScore}/100`), "Average Opportunity Score should remain available");
    assert.ok(cards[3].textContent.includes("Brutto"), "Gross-to-net reconciliation should be visible");
    assert.ok(cards[3].textContent.includes("Überlappung"), "Overlap should remain visible in reconciliation card");

    const table = app.document.querySelector(".excess-table");
    assert.ok(table, "Excess worklist table should render");
    assert.equal(table.classList.contains("wide"), false, "Excess table should not use the global wide table contract");
    assert.equal(app.getComputedStyle(table).minWidth, "760px", "Excess table should use the scoped compact minimum width");
    const headerText = [...table.querySelectorAll("thead th")].map(cell => cell.textContent.trim()).join("|");
    assert.equal(headerText.includes("Brutto-Überbestand"), false, "Separate Gross Excess column should be absent");
    assert.ok(headerText.includes("Material"), "Material column should remain");
    assert.ok(headerText.includes("Netto adressierbar"), "Net Addressable column should remain");
    assert.ok(headerText.includes("Score"), "Opportunity Score column should remain");
    assert.ok(headerText.includes("Owner-Referenz"), "Owner column should remain");
    assert.ok(headerText.includes("Match-Qualität"), "Match column should remain");
    assert.ok(headerText.includes("Aktion"), "Compact action affordance column should remain");

    const firstRow = table.querySelector("tbody tr[data-excess-case-detail]");
    assert.ok(firstRow?.dataset.excessCaseDetail, "Whole row should carry stable Case identity");
    assert.equal(firstRow.getAttribute("tabindex"), "0", "Whole row should be keyboard focusable");
    assert.ok(firstRow.querySelector(".excess-net-cell small")?.textContent.includes("Brutto"), "Gross Excess should remain as secondary Net evidence");
    assert.ok(firstRow.querySelector(".excess-case-affordance"), "Worklist should use a compact Case affordance");
  });

  test("EX-UX-01.1 whole-row keyboard selection opens the exact Excess case", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();

    const rows = [...app.document.querySelectorAll(".excess-table tbody tr[data-excess-case-detail]")];
    assert.ok(rows.length >= 3, "Sample data should render multiple Excess rows");
    const enterTarget = rows[1];
    enterTarget.focus();
    enterTarget.dispatchEvent(new app.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    assert.equal(bridge.getExcessPageStateForTest().activeExcessCaseId, enterTarget.dataset.excessCaseDetail, "Enter should select the exact Case ID");

    const refreshedRows = [...app.document.querySelectorAll(".excess-table tbody tr[data-excess-case-detail]")];
    const spaceTarget = refreshedRows[2];
    spaceTarget.focus();
    spaceTarget.dispatchEvent(new app.KeyboardEvent("keydown", { key: " ", bubbles: true }));
    assert.equal(bridge.getExcessPageStateForTest().activeExcessCaseId, spaceTarget.dataset.excessCaseDetail, "Space should select the exact Case ID");
  });

  test("EX-UX-01.1 Excess detail is calmer while analytical model remains unchanged", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.resetExcessPageModelBuildCountForTest();
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();

    const beforeModel = bridge.currentExcessPageModelForTest();
    const beforeSignature = excessModelSignature(beforeModel);
    const beforeRecovery = bridge.getState().recovery;
    const beforeDataQuality = bridge.getDataQualityBaselineForTest();
    const beforeActions = bridge.getActionRowsForTest().map(row => [row.inventory_row_key, row.status, row.priority, row.recommended_action].join("|"));
    const beforeRegistry = bridge.getRegistryStats();
    const beforePackage = bridge.activeInventoryPackageIdentityForTest();
    const beforeExport = bridge.rowsForExportForTest(beforeModel.cases, bridge.excessExportColumnsForTest());

    const detailKpiText = app.document.querySelector(".excess-detail-kpis")?.textContent || "";
    assert.ok(detailKpiText.includes("Netto adressierbar"), "Detail KPIs should include Net Addressable");
    assert.ok(detailKpiText.includes("Score"), "Detail KPIs should include Score");
    assert.ok(detailKpiText.includes("Owner-Referenz"), "Detail KPIs should include Owner Reference");
    assert.ok(detailKpiText.includes("Priorität"), "Detail KPIs should include Priority");
    assert.equal(detailKpiText.includes("Match-Qualität"), false, "Match Quality should not be a primary KPI");
    assert.ok(app.document.querySelector(".excess-score-list .excess-score-row"), "Score drivers should render as compact rows");
    assert.ok(app.document.querySelector(".excess-detail-disclosure[open] summary")?.textContent.includes("Entscheidungsbasis"), "Decision Basis should be open by default");
    const scenarioDisclosure = [...app.document.querySelectorAll(".excess-detail-disclosure")]
      .find(disclosure => disclosure.querySelector("summary")?.textContent.includes("Szenarien"));
    assert.ok(scenarioDisclosure, "Scenario disclosure should remain available");
    assert.equal(scenarioDisclosure.open, false, "Scenarios should be closed by default");
    assert.ok(app.document.body.textContent.includes("Technische Relationship-Details"), "Technical relationship details should be available");
    assert.equal(app.document.querySelector(".excess-quality-panel"), null, "No full relationship diagnostics panel should render without actionable issues");

    const closedDisclosure = app.document.querySelector(".excess-detail-disclosure:not([open]) > summary");
    if (closedDisclosure) closedDisclosure.click();
    const secondRow = app.document.querySelectorAll(".excess-table tbody tr[data-excess-case-detail]")[1];
    secondRow.focus();
    secondRow.dispatchEvent(new app.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    app.document.querySelector("[data-export-excess]")?.click();
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();

    const afterModel = bridge.currentExcessPageModelForTest();
    assert.deepEqual(excessModelSignature(afterModel), beforeSignature, "Excess summaries, scores and scenarios should remain unchanged");
    assert.equal(bridge.getState().recovery, beforeRecovery, "Recovery value should remain unchanged");
    assert.deepEqual(bridge.getDataQualityBaselineForTest(), beforeDataQuality, "Data Quality should remain unchanged");
    assert.deepEqual(bridge.getActionRowsForTest().map(row => [row.inventory_row_key, row.status, row.priority, row.recommended_action].join("|")), beforeActions, "Actions should remain unchanged");
    assert.deepEqual(bridge.getRegistryStats(), beforeRegistry, "Registry state should remain unchanged");
    assert.deepEqual(bridge.activeInventoryPackageIdentityForTest(), beforePackage, "Package identity and revision should remain unchanged");
    assert.deepEqual(bridge.rowsForExportForTest(afterModel.cases, bridge.excessExportColumnsForTest()), beforeExport, "Excess export data should remain analytically unchanged");
  });
})();
