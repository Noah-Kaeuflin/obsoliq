"use strict";

async function openUnifiedExcessSegment(page, options = {}) {
  const waitForDetail = options.waitForDetail !== false;
  await page.locator('[data-process="inventory-risks"]').click();
  await page.waitForSelector('#view-inventory-risks.active [data-inventory-risk-segment="excess_demand"]', { timeout: 10000 });
  await page.locator('[data-inventory-risk-segment="excess_demand"]').click();
  await page.waitForSelector('#view-inventory-risks.active [data-inventory-risk-segment="excess_demand"][aria-selected="true"]', { timeout: 10000 });
  await page.waitForSelector('#view-inventory-risks.active .inventory-risk-worklist [data-inventory-risk-case]', { timeout: 10000 });
  if (waitForDetail) {
    await page.waitForSelector('#view-inventory-risks.active .inventory-risk-detail [data-value-bridge]', { timeout: 10000 });
  }
  return page.evaluate(() => ({
    routeActive: document.querySelector('#view-inventory-risks')?.classList.contains('active') === true,
    segmentActive: document.querySelector('[data-inventory-risk-segment="excess_demand"]')?.getAttribute('aria-selected') === 'true',
    legacyRiskNavigationVisible: Boolean(document.querySelector('[data-process="excess-stock"]')),
    visibleCaseCount: document.querySelectorAll('#view-inventory-risks.active .inventory-risk-worklist [data-inventory-risk-case]').length,
    excessDetailVisible: Boolean(document.querySelector('#view-inventory-risks.active .inventory-risk-detail [data-value-bridge]'))
  }));
}

function assertUnifiedExcessRoute(routeState, failures) {
  if (!routeState?.routeActive) failures.push("unified-risk-route-not-active");
  if (!routeState?.segmentActive) failures.push("excess-segment-not-active");
  if (routeState?.legacyRiskNavigationVisible) failures.push("legacy-risk-navigation-visible");
  if (!routeState?.visibleCaseCount) failures.push("unified-excess-worklist-empty");
  if (!routeState?.excessDetailVisible) failures.push("unified-excess-detail-missing");
}

module.exports = Object.freeze({ assertUnifiedExcessRoute, openUnifiedExcessSegment });
