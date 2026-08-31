(() => {
  "use strict";

  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function modelSignature(model = {}) {
    return JSON.stringify({
      summary: model.summary,
      caseIds: (model.filteredRows || []).map(item => item.case_id || item.portfolio_case_id || item.family_case_id),
      counts: model.segmentCounts
    });
  }

  function openInventoryRisks(bridge) {
    bridge.switchInventoryRiskRouteForTest("inventory-risks", null, "all");
    bridge.renderInventoryRiskPageForTest();
  }

  test("IR-WORKSPACE-UX-02 groups primary controls and progressive filters without changing semantics", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    openInventoryRisks(bridge);

    const beforeState = bridge.getInventoryRiskStateForTest();
    const beforeModel = bridge.getInventoryRiskPageModelForTest();
    const beforeRegistry = bridge.getRegistrySnapshot();
    let controls = app.document.querySelector(".inventory-risk-controls");
    let disclosure = controls.querySelector(".inventory-risk-more-filters");
    let reset = controls.querySelector("[data-inventory-risk-reset]");
    const primaryKeys = [...controls.querySelectorAll(":scope > label [data-inventory-risk-filter]")].map(control => control.dataset.inventoryRiskFilter);
    const advancedKeys = [...disclosure.querySelectorAll("[data-inventory-risk-filter]")].map(control => control.dataset.inventoryRiskFilter);

    assert.deepEqual(primaryKeys, ["search", "plant", "program"], "Search, plant and program must remain the three always-visible filters");
    assert.deepEqual(advancedKeys, ["owner", "familySubtype", "priority", "evidenceStatus"], "The four less-frequent filters must remain available in the disclosure");
    assert.equal(disclosure.open, false, "Further filters should be collapsed when no advanced filter is active");
    assert.equal(reset.disabled, true, "Reset should be disabled while no filter is active");

    const owner = disclosure.querySelector('[data-inventory-risk-filter="owner"]');
    const ownerValue = [...owner.options].find(option => option.value !== "all")?.value;
    assert.ok(Boolean(ownerValue), "Sample data should provide an owner filter value");
    owner.value = ownerValue;
    owner.dispatchEvent(new app.Event("change", { bubbles: true }));

    controls = app.document.querySelector(".inventory-risk-controls");
    disclosure = controls.querySelector(".inventory-risk-more-filters");
    reset = controls.querySelector("[data-inventory-risk-reset]");
    const filteredState = bridge.getInventoryRiskStateForTest();
    assert.equal(disclosure.open, true, "An active advanced filter should keep its disclosure open after rerender");
    assert.equal(disclosure.querySelector("summary strong")?.textContent.trim(), "1", "The disclosure should expose one active advanced filter");
    assert.equal(reset.disabled, false, "Reset should become available for an active filter");
    assert.equal(filteredState.pageState.filters.owner, ownerValue, "The existing owner filter semantics must be preserved");
    assert.equal(filteredState.portfolioBuildCount, beforeState.portfolioBuildCount, "Presentation filtering must not rebuild the analytical portfolio");

    reset.click();
    const afterState = bridge.getInventoryRiskStateForTest();
    const afterModel = bridge.getInventoryRiskPageModelForTest();
    assert.equal(app.document.querySelector(".inventory-risk-more-filters").open, false, "Reset should return progressive filters to the compact state");
    assert.equal(app.document.querySelector("[data-inventory-risk-reset]").disabled, true, "Reset should be disabled again after clearing filters");
    assert.equal(modelSignature(afterModel), modelSignature(beforeModel), "Reset must restore the same risk summary, counts and Case identities");
    assert.equal(afterState.portfolioBuildCount, beforeState.portfolioBuildCount, "Reset must not rebuild analytics");
    assert.deepEqual(bridge.getRegistrySnapshot(), beforeRegistry, "Filter presentation must not create a Registry or Package revision");
  });

  test("IR-WORKSPACE-UX-02 presents one grouped portfolio and financial summary without a combined total", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    openInventoryRisks(bridge);

    const page = app.document.getElementById("inventoryRisksPage");
    const groups = [...page.querySelectorAll(".inventory-risk-summary-group")];
    const portfolioCards = groups[0]?.querySelectorAll(".inventory-risk-summary-card") || [];
    const financialCards = groups[1]?.querySelectorAll(".inventory-risk-financial-card") || [];
    const financialGuard = groups[1]?.querySelector(".inventory-risk-summary-group-head span");

    assert.equal(groups.length, 2, "Summary must contain exactly the Portfolio and Financial Impact groups");
    assert.equal(groups[0]?.querySelector("strong")?.textContent.trim(), "Portfolio", "The operational group must be named Portfolio");
    assert.equal(groups[1]?.querySelector("strong")?.textContent.trim(), "Finanzielle Wirkung", "The financial group must be localized in German");
    assert.equal(portfolioCards.length, 4, "All four operational KPI cards must remain present");
    assert.equal(financialCards.length, 3, "All three separate financial semantics must remain present");
    assert.ok(/nicht.*addiert/i.test(financialGuard?.getAttribute("title") || ""), "The full no-combined-total guard must remain available");
    assert.equal(Object.prototype.hasOwnProperty.call(bridge.getInventoryRiskPageModelForTest().summary.financials, "totalRecovery"), false, "Presentation grouping must not introduce a combined financial total");
  });

  test("IR-WORKSPACE-UX-02 mirrors existing Readiness and flattens decision context presentation only", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchInventoryRiskRouteForTest("excess-stock");
    bridge.renderInventoryRiskPageForTest();

    const page = app.document.getElementById("inventoryRisksPage");
    const mirrored = page.querySelector(".excess-next-step-readiness");
    const readiness = page.querySelector(".excess-readiness-card .excess-readiness-pill");
    const why = page.querySelector(".why-prioritized");
    const cause = page.querySelector(".excess-cause-hypothesis");

    assert.ok(Boolean(mirrored && readiness), "Existing Decision Readiness must be visible in both its full card and the compact Next-Step mirror");
    assert.equal(mirrored.textContent.trim(), readiness.textContent.trim(), "The compact pill must mirror the existing Readiness label without recalculation");
    assert.equal(app.getComputedStyle(why).borderLeftWidth, "0px", "Why Prioritized should be visually flattened inside the embedded workspace");
    assert.equal(app.getComputedStyle(cause).borderLeftWidth, "0px", "Cause Hypothesis should be visually flattened inside the embedded workspace");
    assert.equal(page.querySelectorAll('[role="tabpanel"][data-excess-detail-section]').length, 5, "The five accepted detail tabs must remain intact");
    assert.equal(page.querySelectorAll('[role="tabpanel"][data-excess-detail-section]:not([hidden])').length, 1, "Exactly one detail panel must remain visible");
  });

  test("IR-WORKSPACE-UX-02 closes visible German terminology and preserves English switching", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    openInventoryRisks(bridge);

    const german = app.document.getElementById("inventoryRisksPage").innerText;
    ["Bestandsrisiken", "Risikofälle exportieren", "Weitere Filter", "Finanzielle Wirkung", "Eindeutige Risikoobjekte", "Verantwortungsabdeckung", "Evidenzreife", "Risikofall öffnen"].forEach(label => {
      assert.ok(german.includes(label), `German Inventory Risks UI should contain ${label}`);
    });
    ["Risk Cases exportieren", "Inventory Risk Portfolio", "Case öffnen", "Owner-Abdeckung", "Family Cases"].forEach(label => {
      assert.equal(german.includes(label), false, `German Inventory Risks UI should not contain ${label}`);
    });

    bridge.updateLanguageForTest("en");
    const english = app.document.getElementById("inventoryRisksPage").innerText;
    ["Inventory Risks", "Export Risk Cases", "More filters", "Financial impact", "Unique Risk Entities", "Owner Coverage", "Evidence Readiness", "Open risk case"].forEach(label => {
      assert.ok(english.includes(label), `English Inventory Risks UI should contain ${label}`);
    });
    bridge.updateLanguageForTest("de");
  });
})();
