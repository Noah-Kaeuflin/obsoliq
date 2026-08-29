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

  function size(app, node, property) {
    return parseFloat(app.getComputedStyle(node)[property]) || 0;
  }

  function snapshot(document, bridge) {
    const model = bridge.getInventoryRiskPageModelForTest();
    return {
      summary: JSON.parse(JSON.stringify(model.summary)),
      counts: JSON.parse(JSON.stringify(model.counts)),
      values: [...document.querySelectorAll(".inventory-risk-kpi-value")].map(node => node.textContent.trim()),
      icons: [...document.querySelectorAll(".inventory-risk-kpi-icon > .oq-icon")].map(node => node.dataset.oqIcon),
      exportRows: JSON.parse(JSON.stringify(bridge.inventoryRiskRowsForExportForTest("filtered")))
    };
  }

  test("ICON-SYS-01.2 applies the responsive KPI scale without changing semantic icons", async assert => {
    const app = await helpers.loadSampleApp();
    const document = app.document;
    document.querySelector("[data-process='inventory-risks']").click();
    await waitFor(() => document.querySelectorAll(".inventory-risk-kpi-icon").length === 7, "seven Unified Risk KPI tiles");

    const topCard = document.querySelector(".inventory-risk-summary-card");
    const financialCard = document.querySelector(".inventory-risk-financial-card");
    const tile = topCard.querySelector(".inventory-risk-kpi-icon");
    const icon = tile.querySelector(".oq-icon");
    const label = topCard.querySelector(".inventory-risk-kpi-label");
    const value = topCard.querySelector(".inventory-risk-kpi-value");
    const financialValue = financialCard.querySelector(".inventory-risk-kpi-value");
    const meta = document.querySelector(".inventory-risk-kpi-meta");
    const guard = document.querySelector(".inventory-risk-financial-guard");
    const expected = app.innerWidth <= 620
      ? { tile: 34, icon: 18, label: 12, value: 24, financialValue: 25, meta: 11, topHeight: 84, financialHeight: 88, guard: 11 }
      : app.innerWidth <= 1200
        ? { tile: 36, icon: 20, label: 12, value: 25, financialValue: 26, meta: 11, topHeight: 88, financialHeight: 92, guard: 11.5 }
        : { tile: 38, icon: 21, label: 12.5, value: 26, financialValue: 28, meta: 11.5, topHeight: 92, financialHeight: 96, guard: 11.5 };

    assert.equal(Math.round(tile.getBoundingClientRect().width), expected.tile, "KPI tile width must follow the active responsive contract");
    assert.equal(Math.round(tile.getBoundingClientRect().height), expected.tile, "KPI tile height must follow the active responsive contract");
    assert.equal(Math.round(icon.getBoundingClientRect().width), expected.icon, "KPI icon width must follow the active responsive contract");
    assert.equal(Math.round(icon.getBoundingClientRect().height), expected.icon, "KPI icon height must follow the active responsive contract");
    assert.ok(size(app, label, "fontSize") >= expected.label, "KPI label must meet the active responsive minimum");
    assert.ok(size(app, value, "fontSize") >= expected.value, "KPI value must meet the active responsive minimum");
    assert.ok(size(app, financialValue, "fontSize") >= expected.financialValue, "Financial value must meet the active responsive minimum");
    assert.ok(size(app, meta, "fontSize") >= expected.meta, "KPI meta text must meet the active responsive minimum");
    assert.ok(topCard.getBoundingClientRect().height >= expected.topHeight, "Top KPI card must meet the active responsive minimum height");
    assert.ok(financialCard.getBoundingClientRect().height >= expected.financialHeight, "Financial card must meet the active responsive minimum height");
    assert.ok(size(app, guard, "fontSize") >= expected.guard, "Financial guard must meet the active responsive minimum");
    assert.deepEqual(
      [...document.querySelectorAll(".inventory-risk-kpi-icon > .oq-icon")].map(node => node.dataset.oqIcon),
      ["inventory-risks", "prioritized-cases", "owner-coverage", "evidence-readiness", "recovery-potential", "slow-dead-stock", "blocked-quality"],
      "All seven semantic KPI icon IDs must remain unchanged"
    );
    assert.equal(document.querySelectorAll("#obsoliq-icon-sprite symbol").length, 43, "Inline sprite must remain at 43 symbols");
  });

  test("ICON-SYS-01.2 keeps KPI content legible and inside each card", async assert => {
    const app = await helpers.loadSampleApp();
    const document = app.document;
    document.querySelector("[data-process='inventory-risks']").click();
    await waitFor(() => document.querySelectorAll(".inventory-risk-kpi-icon").length === 7, "Unified Risk KPI layout");

    const cards = [...document.querySelectorAll(".inventory-risk-summary-card, .inventory-risk-financial-card")];
    assert.equal(cards.length, 7, "Unified Risk summary must still contain seven cards");
    assert.equal(cards.every(card => {
      const cardRect = card.getBoundingClientRect();
      const tileRect = card.querySelector(".inventory-risk-kpi-icon").getBoundingClientRect();
      const labelRect = card.querySelector(".inventory-risk-kpi-label").getBoundingClientRect();
      const value = card.querySelector(".inventory-risk-kpi-value");
      const meta = card.querySelector(".inventory-risk-kpi-meta");
      const metaRect = meta?.getBoundingClientRect();
      return labelRect.left >= tileRect.right
        && value.scrollWidth <= value.clientWidth + 1
        && (!metaRect || (metaRect.right <= cardRect.right + 1 && metaRect.bottom <= cardRect.bottom + 1));
    }), true, "Labels, values and meta text must remain unclipped and clear of their icon tiles");
    assert.ok(cards.every(card => app.getComputedStyle(card.querySelector(".inventory-risk-kpi-value")).whiteSpace === "nowrap"), "KPI values must remain on one line");
  });

  test("ICON-SYS-01.2 preserves values, counts, export rows and interactions through i18n and theme changes", async assert => {
    const app = await helpers.loadSampleApp();
    const document = app.document;
    const bridge = app.__obsoliqTestBridge;
    bridge.switchInventoryRiskRouteForTest("inventory-risks", null, "all");

    const language = document.getElementById("languageSelect");
    language.value = "de";
    language.dispatchEvent(new app.Event("change", { bubbles: true }));
    const before = snapshot(document, bridge);

    let search = document.querySelector("[data-inventory-risk-filter='search']");
    const firstMaterial = document.querySelector(".inventory-risk-material-id")?.textContent.trim() || "";
    search.value = firstMaterial;
    search.dispatchEvent(new app.Event("input", { bubbles: true }));
    await waitFor(() => bridge.getInventoryRiskPageModelForTest().summary.uniqueRiskEntities === 1, "filtered Inventory Risk model");
    assert.ok(document.querySelectorAll("[data-inventory-risk-case]").length >= 1, "Risk search must remain operational");
    search = document.querySelector("[data-inventory-risk-filter='search']");
    search.value = "";
    search.dispatchEvent(new app.Event("input", { bubbles: true }));
    await waitFor(
      () => bridge.getInventoryRiskPageModelForTest().summary.uniqueRiskEntities === before.summary.uniqueRiskEntities,
      "restored Inventory Risk model"
    );

    const firstCase = document.querySelector("[data-inventory-risk-case]");
    firstCase?.querySelector("[data-purpose='select-case']")?.click();
    assert.ok(firstCase?.classList.contains("selected"), "Worklist selection must remain operational");

    language.value = "en";
    language.dispatchEvent(new app.Event("change", { bubbles: true }));
    assert.ok(document.querySelector(".inventory-risk-header-copy h2")?.textContent.includes("Inventory Risks"), "English view must remain available");
    language.value = "de";
    language.dispatchEvent(new app.Event("change", { bubbles: true }));

    const theme = document.getElementById("darkModeToggle");
    theme.checked = true;
    theme.dispatchEvent(new app.Event("change", { bubbles: true }));
    assert.equal(document.documentElement.dataset.theme, "dark", "Dark mode must remain available");
    theme.checked = false;
    theme.dispatchEvent(new app.Event("change", { bubbles: true }));

    const after = snapshot(document, bridge);
    assert.deepEqual(after.summary, before.summary, "KPI calculations must remain unchanged");
    assert.deepEqual(after.counts, before.counts, "Case counts must remain unchanged");
    assert.deepEqual(after.values, before.values, "German KPI display values must remain unchanged");
    assert.deepEqual(after.icons, before.icons, "Language and theme changes must preserve every KPI SVG");
    assert.deepEqual(after.exportRows, before.exportRows, "Export rows must remain unchanged");
  });
})();
