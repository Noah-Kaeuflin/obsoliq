const { chromium, productUrl, captureScreenshot, screenshotName } = require("./smoke-runtime.cjs");
const { activateExcessDetailTab, assertUnifiedExcessRoute, openUnifiedExcessSegment } = require("./inventory-risk-smoke-navigation.cjs");
const screenshotDir = "screenshots/ex-ux-01-5";
const viewports = [
  { width: 1440, height: 900 },
  { width: 1200, height: 800 },
  { width: 900, height: 800 },
  { width: 720, height: 900 },
  { width: 390, height: 844 }
];
const tabStableStateContract = Object.freeze({ requiredFrames: 3, maxObservationMs: 2500 });

async function observeStableTabState(page, expectedKey) {
  return page.evaluate(async ({ expected, contract }) => {
    const snapshots = [];
    const start = performance.now();
    let stableFrameCount = 0;
    function capture() {
      const surface = document.querySelector(".inventory-risk-detail [data-excess-decision-surface]");
      const tabs = [...(surface?.querySelectorAll('[role="tab"][data-excess-detail-target]') || [])];
      const panels = [...(surface?.querySelectorAll('[role="tabpanel"][data-excess-detail-section]') || [])];
      const selected = tabs.filter(tab => tab.getAttribute("aria-selected") === "true");
      const visible = panels.filter(panel => !panel.hidden && panel.getAttribute("aria-hidden") === "false");
      const linked = tabs.every(tab => {
        const panel = document.getElementById(tab.getAttribute("aria-controls"));
        return panel?.getAttribute("aria-labelledby") === tab.id;
      });
      return {
        selectedCount: selected.length,
        selectedKey: selected[0]?.dataset.excessDetailTarget || null,
        visibleCount: visible.length,
        visibleKey: visible[0]?.dataset.excessDetailSection || null,
        inactivePanelsHidden: panels.filter(panel => panel !== visible[0]).every(panel => panel.hidden && panel.getAttribute("aria-hidden") === "true"),
        oneKeyboardTabStop: tabs.filter(tab => tab.tabIndex === 0).length === 1,
        linked,
        legacyLocationCount: tabs.filter(tab => tab.hasAttribute("aria-current")).length,
        legacyAnchorCount: surface?.querySelectorAll("[data-excess-section-anchor]").length || 0
      };
    }
    function matches(snapshot) {
      return snapshot.selectedCount === 1
        && snapshot.selectedKey === expected
        && snapshot.visibleCount === 1
        && snapshot.visibleKey === expected
        && snapshot.inactivePanelsHidden
        && snapshot.oneKeyboardTabStop
        && snapshot.linked
        && snapshot.legacyLocationCount === 0
        && snapshot.legacyAnchorCount === 0;
    }
    while (performance.now() - start <= contract.maxObservationMs) {
      await new Promise(resolve => requestAnimationFrame(resolve));
      const snapshot = capture();
      snapshots.push(snapshot);
      stableFrameCount = matches(snapshot) ? stableFrameCount + 1 : 0;
      if (stableFrameCount >= contract.requiredFrames) {
        return { passed: true, stableFrameCount, stableSnapshot: snapshot, observedFrames: snapshots.length };
      }
    }
    return { passed: false, stableFrameCount, stableSnapshot: snapshots.at(-1) || null, observedFrames: snapshots.length };
  }, { expected: expectedKey, contract: tabStableStateContract });
}

async function installCanonicalHistoryFixture(page) {
  await page.evaluate(() => {
    const bridge = window.__obsoliqTestBridge;
    const current = document.querySelector(".excess-historical-state");
    if (!bridge || !current) return;
    const months = ["2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"];
    const markup = bridge.renderExcessHistoricalEvidenceForTest({
      historicalEvidence: {
        status: "available",
        state: "available",
        exact: true,
        limitations: [],
        unitContext: { state: "available", unit: "ST", source: "metric.unit", provenance: {} },
        metric: {
          history_metric_status: "available",
          last_consumption_date: "2026-02-15",
          net_consumption_quantity_3m: 5,
          net_consumption_quantity_12m: 18,
          average_monthly_consumption_12m: 1.5,
          consumption_trend: "declining",
          inventory_coverage_months: 14.2,
          history_completeness: 1,
          partial_current_period: true,
          provenance: { unitStatus: "single", historyUnit: "ST", inventoryUnit: "ST", partialCurrentPeriod: true }
        },
        monthlyBuckets: months.map((month, index) => ({
          month,
          netQuantity: index === 3 ? -2 : index === 5 ? 0 : (index % 4) + 1,
          unit: "ST"
        }))
      }
    });
    current.insertAdjacentHTML("afterend", markup);
    current.remove();
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: viewports[0] });
  const pageErrors = [];
  const consoleErrors = [];
  const loadErrors = [];
  const externalNetworkRequests = [];
  await page.addInitScript(() => { window.__OBSOLIQ_TEST_MODE__ = true; });
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", request => loadErrors.push(`${request.url()} :: ${request.failure()?.errorText || "failed"}`));
  page.on("request", request => {
    if (/^https?:/i.test(request.url())) externalNetworkRequests.push(request.url());
  });

  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__obsoliqTestBridge), null, { timeout: 10000 });
  await page.evaluate(() => window.__obsoliqTestBridge.loadSample());
  const routeState = await openUnifiedExcessSegment(page);

  const baselineRows = await page.locator(".inventory-risk-table tbody tr").count();
  const unifiedSearch = page.locator('[data-inventory-risk-filter="search"]');
  const initiallyEmpty = await unifiedSearch.inputValue() === "";
  await unifiedSearch.fill("MAT-1090");
  await page.waitForTimeout(100);
  const filteredRows = await page.locator(".inventory-risk-table tbody tr").count();
  await page.locator("[data-inventory-risk-reset]").click();
  await page.waitForTimeout(100);
  const resetBehavior = {
    initiallyEmpty,
    filteredRows,
    filterApplied: filteredRows > 0 && filteredRows < baselineRows,
    resetEmpty: await unifiedSearch.inputValue() === "",
    resetRows: await page.locator(".inventory-risk-table tbody tr").count()
  };

  await activateExcessDetailTab(page, "decision");
  const results = [];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(120);
    await installCanonicalHistoryFixture(page);
    await page.locator(".excess-detail-scroll").evaluate(node => { node.scrollTop = 0; });
    const result = await page.evaluate(({ width, height }) => {
      const layout = document.querySelector(".inventory-risk-workspace");
      const worklist = document.querySelector(".inventory-risk-worklist");
      const detail = document.querySelector(".inventory-risk-detail");
      const tableScroll = document.querySelector(".inventory-risk-table-wrap");
      const detailScroll = document.querySelector(".excess-detail-scroll");
      const surface = document.querySelector(".inventory-risk-detail [data-excess-decision-surface]");
      const tabs = [...surface.querySelectorAll('[role="tab"][data-excess-detail-target]')];
      const panels = [...surface.querySelectorAll('[role="tabpanel"][data-excess-detail-section]')];
      const visiblePanels = panels.filter(panel => !panel.hidden && panel.getAttribute("aria-hidden") === "false");
      const cards = [...document.querySelectorAll(".inventory-risk-summary-card")];
      const cardRects = cards.map(card => card.getBoundingClientRect());
      const readable = [...surface.querySelectorAll(".excess-primary-decision p, .excess-primary-decision li, .excess-readiness-matrix-list li, .excess-detail-note, .excess-action-option-meta dd")];
      const important = [...document.querySelectorAll("#inventoryRisksPage .inventory-risk-summary-card, #inventoryRisksPage .excess-value-bridge-row, #inventoryRisksPage .excess-historical-state, #inventoryRisksPage .excess-action-option")];
      const navigation = surface.querySelector(".excess-detail-section-nav");
      const narrative = surface.querySelector("[data-decision-narrative-grid]");
      return {
        width,
        height,
        bodyOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
        componentOverflow: important.some(node => node.scrollWidth > node.clientWidth + 2),
        summaryCount: cards.length,
        summaryValuesPresent: cards.every(card => Boolean(card.querySelector("strong")?.textContent.trim())),
        summaryWidthDelta: cardRects.length ? Math.max(...cardRects.map(rect => rect.width)) - Math.min(...cardRects.map(rect => rect.width)) : 999,
        layoutStacked: detail.getBoundingClientRect().top >= worklist.getBoundingClientRect().bottom - 2,
        workspaceAboveFold: layout.getBoundingClientRect().top < innerHeight,
        worklistScroll: getComputedStyle(tableScroll).overflowY,
        detailScroll: getComputedStyle(detailScroll).overflowY,
        worklistPanelOverflow: getComputedStyle(worklist).overflowY,
        detailPanelOverflow: getComputedStyle(detail).overflowY,
        navigationSticky: getComputedStyle(navigation).position === "sticky",
        navigationKeys: tabs.map(button => button.dataset.excessDetailTarget),
        linkedTabs: tabs.every(tab => document.getElementById(tab.getAttribute("aria-controls"))?.getAttribute("aria-labelledby") === tab.id),
        visiblePanelCount: visiblePanels.length,
        activePanel: visiblePanels[0]?.dataset.excessDetailSection || "",
        legacyLocationCount: tabs.filter(tab => tab.hasAttribute("aria-current")).length,
        legacyAnchorCount: surface.querySelectorAll("[data-excess-section-anchor]").length,
        nextStepFirst: narrative.firstElementChild?.matches("[data-next-step]") === true,
        headerActionBadgeCount: surface.querySelectorAll(".excess-case-badges .action-badge").length,
        priorityMetricCount: [...surface.querySelectorAll(".excess-inline-stats > div > span")].filter(node => /Priorität|Priority/.test(node.textContent)).length,
        actionsPrimary: Boolean(surface.querySelector("[data-open-excess-actions].primary")),
        equationRoles: [...surface.querySelectorAll(".excess-value-bridge [data-bridge-role]")].map(node => node.dataset.bridgeRole),
        equationTrackCount: surface.querySelectorAll(".excess-value-equation-track").length,
        oldBridgeTrackCount: surface.querySelectorAll(".excess-value-bridge .excess-value-track").length,
        readableMinimum: readable.length ? Math.min(...readable.map(node => parseFloat(getComputedStyle(node).fontSize))) : 0,
        historicalChartCount: surface.querySelectorAll("figure.excess-history-chart").length
      };
    }, viewport);
    results.push(result);
    await captureScreenshot(page, screenshotName("ex-ux-01-5", `excess-top-light-${viewport.width}x${viewport.height}.png`));
  }

  await page.setViewportSize(viewports[0]);
  await activateExcessDetailTab(page, "prioritization");
  const tabStateObservation = await observeStableTabState(page, "prioritization");
  await captureScreenshot(page, screenshotName("ex-ux-01-5", "excess-prioritization-light-1440x900.png"));

  await activateExcessDetailTab(page, "decision");
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await captureScreenshot(page, screenshotName("ex-ux-01-5", "excess-top-dark-1440x900.png"));
  await page.evaluate(() => { document.querySelector("#languageSelect").value = "en"; });
  await page.locator("#languageSelect").dispatchEvent("change");
  const englishLabels = await page.locator(".excess-detail-section-nav").innerText();

  const failures = [];
  assertUnifiedExcessRoute(routeState, failures);
  if (!resetBehavior.initiallyEmpty || !resetBehavior.filterApplied || !resetBehavior.resetEmpty || resetBehavior.resetRows !== baselineRows) failures.push("unified-filter-reset");
  results.forEach(result => {
    if (result.bodyOverflow > 2) failures.push(`${result.width}:body-overflow`);
    if (result.componentOverflow) failures.push(`${result.width}:component-overflow`);
    if (result.summaryCount !== 4 || !result.summaryValuesPresent) failures.push(`${result.width}:summary-contract`);
    if (result.width > 1240 && result.summaryWidthDelta > 2) failures.push(`${result.width}:summary-widths`);
    if (result.width > 1240 && (!result.workspaceAboveFold || result.layoutStacked)) failures.push(`${result.width}:desktop-workspace`);
    if (result.width <= 1240 && !result.layoutStacked) failures.push(`${result.width}:responsive-stack`);
    if (result.worklistScroll !== "auto" || result.detailScroll !== "auto" || result.worklistPanelOverflow !== "hidden" || result.detailPanelOverflow !== "hidden") failures.push(`${result.width}:scroll-ownership`);
    if (!result.navigationSticky || result.navigationKeys.join(",") !== "decision,value,history,prioritization,actions") failures.push(`${result.width}:tab-navigation`);
    if (!result.linkedTabs || result.visiblePanelCount !== 1 || result.activePanel !== "decision" || result.legacyLocationCount || result.legacyAnchorCount) failures.push(`${result.width}:tab-panel-contract`);
    if (!result.nextStepFirst || result.headerActionBadgeCount !== 1 || result.priorityMetricCount !== 1 || !result.actionsPrimary) failures.push(`${result.width}:decision-hierarchy`);
    if (result.equationRoles.join(",") !== "gross,deduction,net" || result.equationTrackCount !== 0 || result.oldBridgeTrackCount !== 0) failures.push(`${result.width}:value-equation`);
    if (result.readableMinimum < 11) failures.push(`${result.width}:readability`);
    if (result.historicalChartCount !== 1) failures.push(`${result.width}:chart-count`);
  });
  if (!tabStateObservation.passed) failures.push("tab-stable-state");
  if (!/Decision/.test(englishLabels) || !/Action paths/.test(englishLabels)) failures.push("tab-localization");
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");
  if (loadErrors.length) failures.push("load-errors");
  if (externalNetworkRequests.length) failures.push("external-network-requests");

  const report = {
    status: failures.length ? "failed" : "passed",
    resetBehavior,
    routeState,
    results,
    rootCause: "legacy-section-guide-contract-replaced-by-true-tabs",
    tabStableStateContract,
    tabStateObservation,
    englishLabels,
    pageErrors,
    consoleErrors,
    loadErrors,
    externalNetworkRequests,
    screenshots: screenshotDir,
    failures
  };
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (failures.length) process.exit(1);
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
