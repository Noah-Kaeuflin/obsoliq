(function () {
  "use strict";

  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function waitFor(condition, label, timeoutMs = 5000) {
    const started = performance.now();
    return new Promise((resolve, reject) => {
      function tick() {
        try {
          const value = condition();
          if (value) return resolve(value);
        } catch (error) {
          reject(error);
          return;
        }
        if (performance.now() - started > timeoutMs) {
          reject(new Error(`Timed out waiting for ${label}`));
          return;
        }
        setTimeout(tick, 25);
      }
      tick();
    });
  }

  function directIconId(target) {
    return target?.querySelector(":scope > svg.oq-icon[data-oq-icon]")?.dataset.oqIcon || "";
  }

  function kpiIconIds(document, selector) {
    return [...document.querySelectorAll(`${selector} .inventory-risk-kpi-icon > .oq-icon`)]
      .map(icon => icon.dataset.oqIcon);
  }

  test("ICON-SYS-01.1 remaps Unified Risk KPIs and uses left-side icon tiles", async assert => {
    const app = await helpers.loadSampleApp();
    const document = app.document;
    document.querySelector("[data-process='inventory-risks']").click();
    await waitFor(() => document.querySelector(".inventory-risk-summary-card"), "Unified Risk KPI cards");

    assert.deepEqual(
      kpiIconIds(document, ".inventory-risk-summary-grid"),
      ["inventory-risks", "prioritized-cases", "owner-coverage", "evidence-readiness"],
      "Portfolio metrics must use the accepted semantic icon mapping"
    );
    assert.deepEqual(
      kpiIconIds(document, ".inventory-risk-financial-summary"),
      ["recovery-potential", "slow-dead-stock", "blocked-quality"],
      "Financial metrics must retain separate accepted icon semantics"
    );
    assert.equal(document.querySelector(".inventory-risk-header-copy h2 .oq-icon"), null, "Page title must not duplicate the navigation icon");
    assert.equal(document.querySelectorAll(".inventory-risk-segments .oq-icon").length, 0, "Risk segments must remain text and count based");

    const card = document.querySelector(".inventory-risk-summary-card");
    const tile = card.querySelector(".inventory-risk-kpi-icon");
    const tileStyle = app.getComputedStyle(tile);
    const expectedTileSize = app.innerWidth <= 620 ? 34 : app.innerWidth <= 1200 ? 36 : 38;
    assert.equal(app.getComputedStyle(card).display, "grid", "KPI cards must use the icon-and-copy grid");
    assert.equal(Math.round(parseFloat(tileStyle.width)), expectedTileSize, "KPI icon tile width must follow the current responsive contract");
    assert.equal(Math.round(parseFloat(tileStyle.height)), expectedTileSize, "KPI icon tile height must follow the current responsive contract");
    assert.equal(app.getComputedStyle(tile.querySelector(".oq-icon")).position, "static", "KPI icons must not float absolutely");
    assert.equal(tile.getAttribute("aria-hidden"), "true", "Decorative KPI icon tiles must stay hidden from assistive technology");

    const search = document.querySelector(".inventory-risk-search");
    const searchWrap = search.querySelector(".inventory-risk-search-input-wrap");
    assert.ok(searchWrap?.querySelector(":scope > [data-oq-icon='search']"), "Search icon must be inside the input wrapper");
    assert.equal(search.querySelector(":scope > span:first-child .oq-icon"), null, "Visible Search label must not contain a duplicate icon");
    assert.equal(Math.round(parseFloat(app.getComputedStyle(searchWrap.querySelector("input")).paddingLeft)), 35, "Search input must reserve space for its icon");

    const openButton = document.querySelector("[data-inventory-risk-select]");
    assert.equal(directIconId(openButton), "expand", "Case selection must use ChevronRight");
    assert.equal(openButton?.dataset.purpose, "select-case", "Case selection must expose its presentation purpose");
    assert.ok(openButton?.getAttribute("aria-label"), "Case selection must have an accessible name");
    assert.ok(openButton?.getAttribute("title"), "Case selection must retain a title");
    assert.equal(Math.round(openButton.getBoundingClientRect().width), 32, "Case selection touch target must be 32px wide");
    assert.equal(Math.round(openButton.getBoundingClientRect().height), 32, "Case selection touch target must be 32px high");
  });

  test("ICON-SYS-01.1 preserves exact detail actions and calibrated section tabs", async assert => {
    const app = await helpers.loadSampleApp();
    const document = app.document;
    const bridge = app.__obsoliqTestBridge;
    const runtime = bridge.getInventoryRiskPortfolioForTest();
    const blockedCase = runtime.familyCases.find(item => item.primary_risk_family === "blocked_quality");
    const excessCase = runtime.familyCases.find(item => item.primary_risk_family === "excess_demand");

    assert.ok(Boolean(blockedCase), "Sample data must provide a Blocked / Quality case");
    assert.ok(Boolean(excessCase), "Sample data must provide an Excess case");
    bridge.switchInventoryRiskRouteForTest("blocked-quality", blockedCase?.family_case_id || "");

    const inventoryAction = document.querySelector("[data-inventory-risk-open-inventory]");
    const actionsAction = document.querySelector("[data-inventory-risk-open-actions]");
    assert.equal(directIconId(inventoryAction), "inventory-explorer", "Inventory handoff must use the Inventory Explorer icon");
    assert.equal(directIconId(actionsAction), "actions", "Actions handoff must use the Actions icon");
    assert.equal(actionsAction?.textContent.includes("→"), false, "Visible Actions label must not contain an extra text arrow");
    assert.equal(inventoryAction?.dataset.inventoryRiskOpenInventory, blockedCase?.family_case_id, "Inventory handoff must retain the exact case ID");
    assert.equal(actionsAction?.dataset.inventoryRiskOpenActions, blockedCase?.family_case_id, "Actions handoff must retain the exact case ID");

    bridge.switchInventoryRiskRouteForTest("excess-stock", excessCase?.family_case_id || "");
    const tabIcons = [...document.querySelectorAll(".inventory-risk-detail .excess-detail-section-nav [data-oq-icon]")];
    assert.deepEqual(
      tabIcons.map(icon => icon.dataset.oqIcon),
      ["decision", "value-logic", "history", "prioritization", "action-paths"],
      "Decision Workspace must retain all five accepted semantic tab icons"
    );
    assert.equal(directIconId(document.querySelector("[data-open-excess-inventory]")), "inventory-explorer", "Embedded Excess inventory handoff must use the Inventory Explorer icon");
    assert.equal(directIconId(document.querySelector("[data-open-excess-actions]")), "actions", "Embedded Excess actions handoff must use the Actions icon");
    assert.equal(document.querySelector("[data-open-excess-actions]")?.textContent.includes("→"), false, "Embedded Excess actions label must not contain a text arrow");
    assert.equal(tabIcons.every(icon => Math.round(parseFloat(app.getComputedStyle(icon).width)) === 15), true, "Detail-tab icons must share the 15px nominal size");
    assert.equal(document.querySelector(".inventory-risk-detail .excess-detail-section-nav button.active")?.getAttribute("aria-selected"), "true", "Active detail tab semantics must remain intact");

    const inventoryResult = bridge.openInventoryForInventoryRiskCaseForTest(excessCase?.family_case_id || "");
    bridge.switchInventoryRiskRouteForTest("excess-stock", excessCase?.family_case_id || "");
    const actionsResult = bridge.openActionsForInventoryRiskCaseForTest(excessCase?.family_case_id || "");
    assert.equal(inventoryResult.status, "opened", "Inventory handoff must remain operational");
    assert.equal(actionsResult.status, "opened", "Actions handoff must remain operational");
    assert.equal(inventoryResult.target.inventory_entity_key, excessCase?.inventory_entity_key, "Inventory handoff must stay entity exact");
    assert.equal(actionsResult.target.inventory_entity_key, excessCase?.inventory_entity_key, "Actions handoff must stay entity exact");
  });

  test("ICON-SYS-01.1 preserves KPI, count and export semantics through language and theme changes", async assert => {
    const app = await helpers.loadSampleApp();
    const document = app.document;
    const bridge = app.__obsoliqTestBridge;
    bridge.switchInventoryRiskRouteForTest("inventory-risks", null, "all");

    const language = document.getElementById("languageSelect");
    language.value = "de";
    language.dispatchEvent(new app.Event("change", { bubbles: true }));

    const beforeModel = bridge.getInventoryRiskPageModelForTest();
    const beforeSummary = JSON.parse(JSON.stringify(beforeModel.summary));
    const beforeCounts = JSON.parse(JSON.stringify(beforeModel.counts));
    const beforeExport = JSON.parse(JSON.stringify(bridge.inventoryRiskRowsForExportForTest("filtered")));
    const beforeValues = [...document.querySelectorAll(".inventory-risk-kpi-value")].map(node => node.textContent.trim());
    const beforeIcons = document.querySelectorAll("[data-oq-icon]").length;

    language.value = "en";
    language.dispatchEvent(new app.Event("change", { bubbles: true }));
    assert.ok(document.querySelector(".inventory-risk-header-copy h2")?.textContent.includes("Inventory Risks"), "English title must render with the icon system intact");
    language.value = "de";
    language.dispatchEvent(new app.Event("change", { bubbles: true }));

    const theme = document.getElementById("darkModeToggle");
    theme.checked = true;
    theme.dispatchEvent(new app.Event("change", { bubbles: true }));
    assert.equal(document.documentElement.dataset.theme, "dark", "Dark theme must remain available");
    theme.checked = false;
    theme.dispatchEvent(new app.Event("change", { bubbles: true }));

    const afterModel = bridge.getInventoryRiskPageModelForTest();
    const afterValues = [...document.querySelectorAll(".inventory-risk-kpi-value")].map(node => node.textContent.trim());
    assert.deepEqual(afterModel.summary, beforeSummary, "Icon presentation must not change KPI calculations");
    assert.deepEqual(afterModel.counts, beforeCounts, "Icon presentation must not change case counts");
    assert.deepEqual(bridge.inventoryRiskRowsForExportForTest("filtered"), beforeExport, "Icon presentation must not change export rows");
    assert.deepEqual(afterValues, beforeValues, "German KPI display values must remain stable after DE → EN → DE and theme changes");
    assert.equal(document.querySelectorAll("[data-oq-icon]").length >= beforeIcons, true, "Language and theme changes must not remove SVG icon nodes");
    assert.deepEqual(
      kpiIconIds(document, ".inventory-risk-summary-grid"),
      ["inventory-risks", "prioritized-cases", "owner-coverage", "evidence-readiness"],
      "Semantic KPI icons must survive language and theme changes"
    );
  });
})();
