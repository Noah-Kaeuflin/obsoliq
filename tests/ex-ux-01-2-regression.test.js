(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function isVisible(app, selector) {
    const element = app.document.querySelector(selector);
    if (!element) return false;
    const style = app.getComputedStyle(element.closest(".field") || element);
    return style.display !== "none" && style.visibility !== "hidden" && element.getClientRects().length > 0;
  }

  function setControl(app, selector, value, eventName = "change") {
    const control = app.document.querySelector(selector);
    if (!control) throw new Error(`Missing control ${selector}`);
    control.value = value;
    control.dispatchEvent(new app.Event(eventName, { bubbles: true }));
  }

  function analyticalSignature(model = {}) {
    return {
      summary: model.summary,
      cases: (model.cases || []).map(item => ({
        caseId: item.case_id,
        gross: item.gross_excess_value,
        net: item.net_addressable_excess_value,
        overlap: item.excess_overlap_value,
        remaining: item.excess_remaining_inventory_value,
        score: item.excess_opportunity_score,
        components: item.opportunity_score_components,
        scenarios: (item.scenarios || []).map(scenario => ({
          id: scenario.scenario_id,
          availability: scenario.availability,
          value: scenario.estimated_impact_value,
          signature: scenario.modelVersion || scenario.model_version || ""
        }))
      }))
    };
  }

  test("EX-UX-01.2 Excess owns Search, Plant, Program, Owner, Priority and Reset", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.resetExcessPageModelBuildCountForTest();
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const baseline = bridge.getExcessPageStateForTest().totalRows;
    const buildCount = bridge.getExcessPageModelBuildCountForTest();

    ["#searchInput", "#plantFilter", "#groupFilter", "#excessOwnerFilter", "#excessPriorityFilter"]
      .forEach(selector => assert.equal(isVisible(app, selector), true, `${selector} should be visible in Excess`));
    assert.equal(isVisible(app, "#excessResetFilters"), false, "Reset should remain hidden until an Excess filter is active");
    assert.equal(isVisible(app, "#categoryFilter"), false, "Category should be hidden only on Excess");
    assert.equal(isVisible(app, "#rowLimit"), false, "Row limit should remain hidden on Excess");

    const category = [...app.document.querySelectorAll("#categoryFilter option")].map(option => option.value).find(Boolean);
    setControl(app, "#categoryFilter", category || "", "change");
    assert.equal(bridge.getExcessPageStateForTest().totalRows, baseline, "Hidden Category state must not filter Excess");

    const owner = [...app.document.querySelectorAll("#excessOwnerFilter option")].map(option => option.value).find(Boolean);
    setControl(app, "#excessOwnerFilter", owner, "change");
    assert.ok(bridge.getExcessPageStateForTest().totalRows > 0 && bridge.getExcessPageStateForTest().totalRows < baseline, "Owner should filter current Cases");
    assert.equal(isVisible(app, "#excessResetFilters"), true, "Reset should appear with an active Excess filter");
    app.document.getElementById("excessResetFilters").click();
    assert.equal(bridge.getExcessPageStateForTest().totalRows, baseline, "Reset should restore the visible Excess projection");
    assert.equal(isVisible(app, "#excessResetFilters"), false, "Reset should disappear after restoring the null-filter state");
    assert.equal(app.document.getElementById("categoryFilter").value, category || "", "Excess Reset must preserve hidden common Category state");

    const priority = [...app.document.querySelectorAll("#excessPriorityFilter option")].map(option => option.value).find(Boolean);
    setControl(app, "#excessPriorityFilter", priority, "change");
    assert.ok(bridge.getExcessPageStateForTest().totalRows > 0 && bridge.getExcessPageStateForTest().totalRows <= baseline, "Priority should use existing Case priorities");
    assert.equal(bridge.getExcessPageModelBuildCountForTest(), buildCount, "Presentation filtering must not rebuild Excess analytics");

    bridge.switchViewForTest("inventory");
    bridge.renderInventoryExplorerForTest();
    assert.equal(isVisible(app, "#categoryFilter"), true, "Category must remain visible in Inventory Explorer");
  });

  test("EX-UX-01.2 Summary and Worklist implement the decision hierarchy", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const model = bridge.currentExcessPageModelForTest();
    const presentation = bridge.getExcessPresentationSummaryForTest(model.cases);
    const cards = [...app.document.querySelectorAll(".excess-summary-card")];

    assert.equal(cards.length, 4, "Exactly four primary Summary items should render");
    assert.ok(cards[0].classList.contains("primary"), "Net Addressable should remain primary");
    assert.ok(cards[0].textContent.includes("Netto adressierbar"), "Net Addressable should be first");
    assert.ok(cards[1].textContent.includes(String(presentation.casePortfolio.caseCount)), "Case count should use accepted Cases");
    assert.ok(cards[1].textContent.includes(String(presentation.casePortfolio.uniqueMaterialCount)), "Unique material count should be visible");
    assert.ok(cards[2].textContent.includes(String(presentation.prioritization.maximumScore)), "Maximum score should be visible");
    assert.ok(cards[3].textContent.includes("Brutto → Netto"), "Gross-to-Net should use the concise reconciliation label");
    assert.equal(/Realisierungsrate|realization rate/i.test(cards[3].textContent), false, "Addressability must not claim realization");

    const headers = [...app.document.querySelectorAll(".excess-table thead th")].map(cell => cell.textContent.trim()).join("|");
    assert.ok(headers.includes("Material"), "Material should remain visible");
    assert.ok(headers.includes("Netto adressierbar"), "Net Addressable should remain visible");
    assert.ok(headers.includes("Score"), "Opportunity Score should remain visible");
    assert.ok(headers.includes("Verantwortlich"), "Responsible should remain visible");
    assert.ok(headers.includes("Priorität"), "Priority should replace Match Quality");
    assert.equal(headers.includes("Match-Qualität"), false, "Match Quality must not be a full Worklist column");
    const firstRow = app.document.querySelector(".excess-table tbody tr");
    assert.ok(firstRow.querySelector(".action-material-desc")?.textContent.includes("PC-"), "Material context should include plant or Profit Center");
    assert.ok(firstRow.querySelector(".excess-net-cell small")?.textContent.includes("Brutto"), "Gross should remain secondary Net evidence");
    assert.ok(firstRow.querySelector(".action-badge"), "Existing priority should render as a restrained badge");
  });

  test("EX-UX-01.2 Decision Core identity remains fixed while accepted rationale starts the Detail scroll", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const state = bridge.getExcessPageStateForTest();
    const active = state.activeCase;
    const core = app.document.querySelector(".excess-decision-core");
    const nextStep = app.document.querySelector("[data-next-step]");

    assert.equal(core?.dataset.excessDecisionCore, active.case_id, "Decision Core should preserve exact Case identity");
    assert.ok(core.textContent.includes(active.material_id), "Case header should expose the selected material");
    assert.equal(core.textContent.includes("Warum priorisiert"), false, "The fixed Decision Core should remain a compact Case header");
    assert.ok(app.document.querySelector(".excess-detail-scroll")?.textContent.includes("Warum priorisiert"), "Why Prioritized should remain visible at the start of the Detail scroll");
    assert.equal(nextStep?.dataset.nextStep, active.next_step || "", "Next Review Step must equal accepted current data verbatim");
    assert.ok(core.textContent.includes("kein Erfolgsversprechen"), "Opportunity Score should not be presented as a success promise");
    assert.equal(core.textContent.includes("Match-Qualität"), false, "Match Quality should not be a primary stat");
    assert.ok(core.querySelector("[data-open-excess-inventory]"), "Exact Inventory navigation should be available");
    assert.ok(core.querySelector("[data-open-excess-actions]"), "Accepted Actions navigation should be available");
    assert.equal(core.closest(".excess-detail-panel")?.querySelector(":scope > .excess-detail-scroll") !== null, true, "Only secondary Detail content should own scrolling");

    const disclosures = [...app.document.querySelectorAll(".excess-detail-disclosure")];
    assert.equal(disclosures.length, 6, "Six secondary disclosure groups should remain available");
    assert.equal(disclosures.every(disclosure => !disclosure.open), true, "All secondary groups should be closed by default");
    assert.equal(app.document.querySelector("[data-history-state]")?.dataset.historyState, "unavailable", "Missing sample History should remain truthful");
    assert.equal(app.document.querySelector(".excess-detail-panel canvas, .excess-detail-panel svg[data-forecast]")?.length || 0, 0, "No monthly or Forecast chart should be invented");
  });

  test("EX-UX-01.2 selection and exact navigation preserve analytical state", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.resetExcessPageModelBuildCountForTest();
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const before = analyticalSignature(bridge.currentExcessPageModelForTest());
    const buildCount = bridge.getExcessPageModelBuildCountForTest();
    const rows = [...app.document.querySelectorAll(".excess-table tbody tr")];
    const target = rows[1];
    target.focus();
    target.dispatchEvent(new app.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    assert.equal(bridge.getExcessPageStateForTest().activeExcessCaseId, target.dataset.excessCaseDetail, "Enter should select the exact stable Case ID");
    const selected = bridge.getExcessPageStateForTest().activeCase;
    const inventoryResult = bridge.openInventoryForExcessCaseForTest(selected.case_id);
    assert.equal(inventoryResult.status, "opened", "Exact Inventory target should open");
    assert.ok(app.document.querySelector(".inventory-reveal-target"), "Inventory Explorer should reveal the exact target row");

    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const after = analyticalSignature(bridge.currentExcessPageModelForTest());
    assert.deepEqual(after, before, "Presentation selection and navigation must leave analytical Cases bit-identical");
    assert.equal(bridge.getExcessPageModelBuildCountForTest(), buildCount, "Selection and Inventory navigation must not rebuild Excess analytics");
  });
})();
