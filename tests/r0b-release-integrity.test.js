(function () {
  "use strict";

  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;
  const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

  test("R0B opens the current Inventory Risks route and the real Excess segment", async assert => {
    const app = await helpers.loadSampleApp();
    const routeButton = app.document.querySelector('[data-process="inventory-risks"]');
    const legacyButtons = app.document.querySelectorAll('[data-process="excess-stock"]');

    routeButton.click();
    await wait(30);
    const segmentButton = app.document.querySelector('[data-inventory-risk-segment="excess_demand"]');
    segmentButton.click();
    await wait(30);
    const activeRouteButton = app.document.querySelector('[data-process="inventory-risks"]');
    const activeSegmentButton = app.document.querySelector('[data-inventory-risk-segment="excess_demand"]');

    assert.ok(Boolean(routeButton), "The current Inventory Risks route must be present");
    assert.equal(legacyButtons.length, 0, "The removed Excess navigation button must stay absent");
    assert.equal(activeRouteButton.classList.contains("active"), true, "Inventory Risks must be the active main route");
    assert.equal(activeSegmentButton.getAttribute("aria-selected"), "true", "Excess & Demand must be the selected Unified segment");
    assert.ok(Boolean(app.document.querySelector('#view-inventory-risks.active [data-inventory-risk-case]')), "The Unified Excess worklist must contain a real Case");
    assert.ok(Boolean(app.document.querySelector('[data-inventory-risk-detail-family="excess_demand"] [data-value-bridge]')), "The selected Excess Case must render its value evidence");
  });

  test("R0B binds the embedded Excess tabs inside the Unified detail pane", async assert => {
    const app = await helpers.loadSampleApp();
    app.__obsoliqTestBridge.switchInventoryRiskRouteForTest("inventory-risks", null, "excess_demand");
    const detail = app.document.querySelector('[data-inventory-risk-detail-family="excess_demand"]');
    const scrollContainer = detail.querySelector(".excess-detail-scroll");
    const navigation = detail.querySelector(".excess-detail-section-nav");
    const target = navigation.querySelector('[data-excess-detail-target="value"]');

    target.click();
    await wait(40);

    assert.equal(navigation.getAttribute("role"), "tablist", "The embedded section navigation must be a true tablist");
    assert.equal(app.getComputedStyle(scrollContainer).overflowY, "auto", "The detail evidence must own its internal scrolling");
    assert.equal(app.getComputedStyle(detail).overflowY, "hidden", "The Unified detail shell must not create a competing vertical scrollbar");
    assert.equal(navigation.querySelector('[aria-selected="true"]')?.dataset.excessDetailTarget, "value", "Clicking Value logic must update the selected tab contract");
    assert.equal(detail.querySelectorAll('[role="tabpanel"]:not([hidden])').length, 1, "The embedded decision surface must expose exactly one visible panel");
    assert.equal(detail.querySelector('[role="tabpanel"]:not([hidden])')?.dataset.excessDetailSection, "value", "The selected tab and visible embedded panel must agree");
  });
})();
