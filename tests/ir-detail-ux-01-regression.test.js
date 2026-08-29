(() => {
  "use strict";

  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function analyticalSignature(model = {}) {
    return JSON.stringify({
      summary: model.summary,
      cases: (model.cases || []).map(item => ({
        caseId: item.case_id,
        gross: item.gross_excess_value,
        overlap: item.excess_overlap_value,
        net: item.net_addressable_excess_value,
        score: item.excess_opportunity_score,
        readiness: item.decision_readiness
      }))
    });
  }

  function visiblePanels(surface) {
    return [...surface.querySelectorAll(":scope [role='tabpanel'][data-excess-detail-section]")]
      .filter(panel => !panel.hidden);
  }

  test("IR-DETAIL-UX-01 mounts one shared Excess decision surface in standalone and Unified detail", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const standalone = app.document.querySelector("#excessPage [data-excess-decision-surface]");

    const runtime = bridge.getInventoryRiskPortfolioForTest();
    const excessCase = runtime.familyCases.find(item => item.primary_risk_family === "excess_demand");
    bridge.switchInventoryRiskRouteForTest("excess-stock", excessCase?.family_case_id || "");
    const embedded = app.document.querySelector(".inventory-risk-detail [data-excess-decision-surface]");

    assert.ok(Boolean(standalone), "Standalone Excess should mount the shared decision surface");
    assert.ok(Boolean(embedded), "Unified Excess detail should mount the shared decision surface");
    assert.equal(standalone.dataset.excessCaseId.length > 0, true, "Standalone surface should retain exact Case identity");
    assert.equal(embedded.dataset.excessCaseId, excessCase?.family_case_id, "Embedded surface should retain the accepted Family Case ID");
    assert.equal(app.getComputedStyle(standalone).containerType, "inline-size", "Standalone surface should be an inline-size query container");
    assert.equal(app.getComputedStyle(embedded).containerType, "inline-size", "Embedded surface should use the same query-container contract");
  });

  test("IR-DETAIL-UX-01 exposes five linked ARIA tabs and exactly one visible panel", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const surface = app.document.querySelector("#excessPage [data-excess-decision-surface]");
    const tablist = surface.querySelector("[role='tablist']");
    const tabs = [...tablist.querySelectorAll("[role='tab']")];
    const panels = [...surface.querySelectorAll("[role='tabpanel']")];

    assert.equal(tabs.length, 5, "The decision surface should expose exactly five tabs");
    assert.equal(panels.length, 5, "The decision surface should expose exactly five tab panels");
    assert.deepEqual(tabs.map(tab => tab.dataset.excessDetailTarget), ["decision", "value", "history", "prioritization", "actions"], "Tab order should follow the accepted decision sequence");
    assert.equal(tabs.every(tab => tab.getAttribute("aria-controls") && app.document.getElementById(tab.getAttribute("aria-controls"))), true, "Every tab should control an existing panel");
    assert.equal(panels.every(panel => panel.getAttribute("aria-labelledby") && app.document.getElementById(panel.getAttribute("aria-labelledby"))), true, "Every panel should reference its tab label");
    assert.equal(visiblePanels(surface).length, 1, "Only one detail panel should be visible initially");
    assert.equal(visiblePanels(surface)[0].dataset.excessDetailSection, "decision", "Decision should be the initial visible panel");
    assert.equal(surface.querySelectorAll("[data-excess-section-anchor]").length, 0, "Legacy section anchors should be removed");
    assert.equal(surface.querySelectorAll("[aria-current='location']").length, 0, "Location semantics should not remain on true tabs");
  });

  test("IR-DETAIL-UX-01 keeps selected tab, visible panel and keyboard focus synchronized", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const surface = app.document.querySelector("#excessPage [data-excess-decision-surface]");
    const tablist = surface.querySelector("[role='tablist']");
    tablist.querySelector("[data-excess-detail-target='value']").click();

    assert.equal(tablist.querySelector("[aria-selected='true']")?.dataset.excessDetailTarget, "value", "Clicking Value should select the Value tab");
    assert.equal(visiblePanels(surface)[0]?.dataset.excessDetailSection, "value", "Clicking Value should reveal only the Value panel");
    assert.equal([...tablist.querySelectorAll("[role='tab']")].filter(tab => tab.tabIndex === 0).length, 1, "Roving tabindex should expose one keyboard tab stop");

    tablist.querySelector("[data-excess-detail-target='value']").dispatchEvent(new app.KeyboardEvent("keydown", { key: "End", bubbles: true }));
    assert.equal(tablist.querySelector("[aria-selected='true']")?.dataset.excessDetailTarget, "actions", "End should activate the last tab");
    assert.equal(app.document.activeElement?.dataset.excessDetailTarget, "actions", "Keyboard activation should move focus to the active tab");
    assert.equal(visiblePanels(surface)[0]?.dataset.excessDetailSection, "actions", "Keyboard activation should reveal only the matching panel");
  });

  test("IR-DETAIL-UX-01 assigns every accepted Excess component to its semantic tab", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const surface = app.document.querySelector("#excessPage [data-excess-decision-surface]");
    const panel = key => surface.querySelector(`[role='tabpanel'][data-excess-detail-section='${key}']`);

    assert.ok(panel("decision").querySelector("[data-decision-narrative-grid]"), "Decision narrative should live in Decision");
    assert.ok(panel("value").querySelector("[data-value-bridge]"), "Gross-to-Net bridge should live in Value logic");
    assert.ok(panel("history").querySelector(".excess-historical-state"), "Historical evidence should live in History");
    assert.ok(panel("prioritization").querySelector(".excess-score-list") && panel("prioritization").querySelector(".excess-operational-evidence"), "Score and operational evidence should live in Prioritization");
    assert.ok(panel("actions").querySelector(".excess-action-options-section") && panel("actions").querySelector(".excess-work-context"), "Action options and work context should live in Action paths");
    assert.equal(surface.querySelectorAll(".excess-detail-disclosure").length, 6, "All six accepted disclosures should remain available across the semantic panels");
    assert.ok(panel("actions").querySelector(".pilot-review-card"), "Pilot Review lifecycle should remain available in Action paths");
  });

  test("IR-DETAIL-UX-01 tab interactions are presentation-only and reset on exact Case change", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const before = analyticalSignature(bridge.currentExcessPageModelForTest());
    let surface = app.document.querySelector("#excessPage [data-excess-decision-surface]");
    surface.querySelector("[data-excess-detail-target='history']").click();
    bridge.updateLanguageForTest("en");
    surface = app.document.querySelector("#excessPage [data-excess-decision-surface]");

    assert.equal(surface.querySelector("[aria-selected='true']")?.dataset.excessDetailTarget, "history", "The selected tab should survive a same-Case language rerender");
    assert.equal(analyticalSignature(bridge.currentExcessPageModelForTest()), before, "Tab and language presentation changes must not alter analytical values");

    const secondRow = app.document.querySelectorAll(".excess-table tbody tr[data-excess-case-detail]")[1];
    secondRow.click();
    surface = app.document.querySelector("#excessPage [data-excess-decision-surface]");
    assert.equal(surface.querySelector("[aria-selected='true']")?.dataset.excessDetailTarget, "decision", "A different exact Case should reset to the Decision tab");
    bridge.updateLanguageForTest("de");
  });

  test("IR-DETAIL-UX-01 composition responds to surface width instead of only viewport width", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const surface = app.document.querySelector("#excessPage [data-excess-decision-surface]");
    const grid = surface.querySelector(".excess-primary-decision-grid");

    surface.style.width = "520px";
    await new Promise(resolve => app.requestAnimationFrame(resolve));
    const narrowColumns = app.getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;
    surface.style.width = "680px";
    await new Promise(resolve => app.requestAnimationFrame(resolve));
    const wideColumns = app.getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length;

    assert.equal(narrowColumns, 1, "A narrow detail container should use one Decision column");
    assert.equal(wideColumns, 2, "A wider detail container should use two Decision columns without a viewport breakpoint");
  });

  test("IR-DETAIL-UX-01 raises core decision copy to a readable local minimum", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const surface = app.document.querySelector("#excessPage [data-excess-decision-surface]");
    const samples = [...surface.querySelectorAll("[data-decision-narrative-grid] p, [data-decision-narrative-grid] li, [data-decision-narrative-grid] small")];
    const sizes = samples.map(node => parseFloat(app.getComputedStyle(node).fontSize));

    assert.ok(samples.length > 0, "Decision typography samples should exist");
    assert.equal(sizes.every(size => size >= 12), true, "Core visible Decision copy should be at least 12px");
  });
})();
