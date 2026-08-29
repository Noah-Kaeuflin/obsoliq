"use strict";

async function activateExcessDetailTab(page, key) {
  const detailRoot = '#view-inventory-risks.active .inventory-risk-detail';
  const tab = `${detailRoot} [role="tab"][data-excess-detail-target="${key}"]`;
  await page.waitForSelector(tab, { timeout: 10000 });
  await page.locator(tab).click();
  await page.waitForFunction(({ rootSelector, activeKey }) => {
    const root = document.querySelector(rootSelector);
    const tabs = [...(root?.querySelectorAll('[role="tab"][data-excess-detail-target]') || [])];
    const panels = [...(root?.querySelectorAll('[role="tabpanel"][data-excess-detail-section]') || [])];
    const selectedTabs = tabs.filter(item => item.getAttribute("aria-selected") === "true");
    const activePanels = panels.filter(panel => !panel.hidden && panel.getAttribute("aria-hidden") === "false");
    return tabs.length === 5
      && panels.length === 5
      && selectedTabs.length === 1
      && selectedTabs[0].dataset.excessDetailTarget === activeKey
      && activePanels.length === 1
      && activePanels[0].dataset.excessDetailSection === activeKey
      && panels.filter(panel => panel !== activePanels[0]).every(panel => panel.hidden && panel.getAttribute("aria-hidden") === "true");
  }, { rootSelector: detailRoot, activeKey: key });
}

async function openUnifiedExcessSegment(page, options = {}) {
  const waitForDetail = options.waitForDetail !== false;
  const activeTab = options.activeTab || "value";
  const detailRoot = '#view-inventory-risks.active .inventory-risk-detail';
  await page.locator('[data-process="inventory-risks"]').click();
  await page.waitForSelector('#view-inventory-risks.active [data-inventory-risk-segment="excess_demand"]', { timeout: 10000 });
  await page.locator('[data-inventory-risk-segment="excess_demand"]').click();
  await page.waitForSelector('#view-inventory-risks.active [data-inventory-risk-segment="excess_demand"][aria-selected="true"]', { timeout: 10000 });
  await page.waitForSelector('#view-inventory-risks.active .inventory-risk-worklist [data-inventory-risk-case]', { timeout: 10000 });
  if (waitForDetail) {
    await page.waitForSelector(`${detailRoot} [data-excess-decision-surface]`, { timeout: 10000 });
    await activateExcessDetailTab(page, activeTab);
    if (activeTab === "value") {
      await page.waitForSelector(`${detailRoot} [role="tabpanel"][data-excess-detail-section="value"]:not([hidden]) [data-value-bridge]`, { timeout: 10000 });
    }
  }
  return page.evaluate(() => ({
    routeActive: document.querySelector('#view-inventory-risks')?.classList.contains('active') === true,
    segmentActive: document.querySelector('[data-inventory-risk-segment="excess_demand"]')?.getAttribute('aria-selected') === 'true',
    legacyRiskNavigationVisible: Boolean(document.querySelector('[data-process="excess-stock"]')),
    visibleCaseCount: document.querySelectorAll('#view-inventory-risks.active .inventory-risk-worklist [data-inventory-risk-case]').length,
    excessDetailVisible: Boolean(document.querySelector('#view-inventory-risks.active .inventory-risk-detail [data-excess-decision-surface]')),
    activeTab: document.querySelector('#view-inventory-risks.active .inventory-risk-detail [role="tab"][aria-selected="true"]')?.dataset.excessDetailTarget || "",
    activePanel: document.querySelector('#view-inventory-risks.active .inventory-risk-detail [role="tabpanel"]:not([hidden])')?.dataset.excessDetailSection || "",
    panelCount: document.querySelectorAll('#view-inventory-risks.active .inventory-risk-detail [role="tabpanel"][data-excess-detail-section]').length,
    inactivePanelsHidden: [...document.querySelectorAll('#view-inventory-risks.active .inventory-risk-detail [role="tabpanel"][data-excess-detail-section]')]
      .filter(panel => !panel.hidden)
      .length === 1
  }));
}

function assertUnifiedExcessRoute(routeState, failures) {
  if (!routeState?.routeActive) failures.push("unified-risk-route-not-active");
  if (!routeState?.segmentActive) failures.push("excess-segment-not-active");
  if (routeState?.legacyRiskNavigationVisible) failures.push("legacy-risk-navigation-visible");
  if (!routeState?.visibleCaseCount) failures.push("unified-excess-worklist-empty");
  if (!routeState?.excessDetailVisible) failures.push("unified-excess-detail-missing");
  if (routeState?.panelCount !== 5 || !routeState?.activeTab || routeState.activeTab !== routeState.activePanel) failures.push("unified-excess-tab-panel-contract");
  if (!routeState?.inactivePanelsHidden) failures.push("unified-excess-inactive-panels-visible");
}

module.exports = Object.freeze({ activateExcessDetailTab, assertUnifiedExcessRoute, openUnifiedExcessSegment });
