const fs = require("fs");
const path = require("path");
const { chromium, productUrl } = require("./smoke-runtime.cjs");
const { assertUnifiedExcessRoute, openUnifiedExcessSegment } = require("./inventory-risk-smoke-navigation.cjs");
const screenshotDir = path.join(__dirname, "screenshots", "ex-ux-01-5");
const viewports = [
  { width: 1440, height: 900 },
  { width: 1200, height: 800 },
  { width: 900, height: 800 },
  { width: 720, height: 900 },
  { width: 390, height: 844 }
];
const sectionGuideStableStateContract = Object.freeze({
  requiredFrames: 3,
  maxObservationMs: 2500,
  minimumAlignmentDelta: -1,
  maximumAlignmentDelta: 12
});

async function installSectionGuideStableStateHarness(page) {
  await page.evaluate(contract => {
    function snapshotMatchesExpectedState(snapshot, expectedGuideTarget) {
      return snapshot.expectedGuideTarget === expectedGuideTarget
        && snapshot.expectedGuideExists === true
        && snapshot.expectedGuideConnected === true
        && snapshot.expectedGuideVisible === true
        && snapshot.activeGuideCount === 1
        && snapshot.activeGuideTarget === expectedGuideTarget
        && snapshot.activeGuideAriaCurrent === "location"
        && snapshot.targetSectionExists === true
        && snapshot.targetSectionConnected === true
        && snapshot.targetSectionInScrollContainer === true
        && Number.isFinite(snapshot.alignmentDelta)
        && snapshot.alignmentDelta >= contract.minimumAlignmentDelta
        && snapshot.alignmentDelta <= contract.maximumAlignmentDelta;
    }

    function evaluateSnapshots(snapshots, expectedGuideTarget) {
      let stableFrameCount = 0;
      let stableSnapshot = null;
      for (const snapshot of snapshots) {
        if (snapshotMatchesExpectedState(snapshot, expectedGuideTarget)) {
          stableFrameCount += 1;
          stableSnapshot = snapshot;
          if (stableFrameCount >= contract.requiredFrames) {
            return { passed: true, stableFrameCount, stableSnapshot };
          }
        } else {
          stableFrameCount = 0;
          stableSnapshot = null;
        }
      }
      return { passed: false, stableFrameCount, stableSnapshot };
    }

    function captureSnapshot(expectedGuideTarget, frame, startTime) {
      const scrollContainer = document.querySelector(".excess-detail-scroll");
      const navigation = scrollContainer?.querySelector(".excess-detail-section-nav");
      const expectedGuide = navigation?.querySelector(`[data-excess-detail-target="${expectedGuideTarget}"]`);
      const activeGuides = [...(navigation?.querySelectorAll('[aria-current="location"]') || [])];
      const activeGuide = activeGuides[0] || null;
      const targetSection = scrollContainer?.querySelector(`[data-excess-detail-section="${expectedGuideTarget}"]`);
      const targetAnchor = scrollContainer?.querySelector(`[data-excess-section-anchor="${expectedGuideTarget}"]`);
      const guideRect = expectedGuide?.getBoundingClientRect();
      const sectionRect = targetSection?.getBoundingClientRect();
      const anchorRect = targetAnchor?.getBoundingClientRect();
      const navigationRect = navigation?.getBoundingClientRect();
      const scrollContainerRect = scrollContainer?.getBoundingClientRect();
      const guideStyle = expectedGuide ? getComputedStyle(expectedGuide) : null;
      return {
        frame,
        expectedGuideTarget,
        expectedGuideExists: Boolean(expectedGuide),
        expectedGuideConnected: expectedGuide?.isConnected === true,
        expectedGuideVisible: Boolean(
          guideRect
          && guideRect.width > 0
          && guideRect.height > 0
          && guideStyle?.display !== "none"
          && guideStyle?.visibility !== "hidden"
        ),
        activeGuideCount: activeGuides.length,
        activeGuideTarget: activeGuide?.dataset.excessDetailTarget || null,
        activeGuideAriaCurrent: activeGuide?.getAttribute("aria-current") || null,
        targetSectionExists: Boolean(targetSection),
        targetSectionConnected: targetSection?.isConnected === true,
        targetSectionInScrollContainer: Boolean(targetSection && scrollContainer?.contains(targetSection)),
        targetSectionTop: sectionRect?.top ?? null,
        targetAnchorTop: anchorRect?.top ?? null,
        navigationBottom: navigationRect?.bottom ?? null,
        scrollContainerTop: scrollContainerRect?.top ?? null,
        scrollContainerScrollTop: scrollContainer?.scrollTop ?? null,
        alignmentDelta: anchorRect && navigationRect ? anchorRect.top - navigationRect.bottom : null,
        currentView: document.querySelector(".view.active")?.id || null,
        currentLanguage: document.querySelector("#languageSelect")?.value || null,
        currentTheme: document.documentElement.dataset.theme || "light",
        elapsedMs: Math.round((performance.now() - startTime) * 10) / 10
      };
    }

    async function observe(expectedGuideTarget) {
      const startTime = performance.now();
      const snapshots = [];
      let stableFrameCount = 0;
      while (performance.now() - startTime <= contract.maxObservationMs) {
        await new Promise(resolve => requestAnimationFrame(resolve));
        const snapshot = captureSnapshot(expectedGuideTarget, snapshots.length + 1, startTime);
        snapshots.push(snapshot);
        stableFrameCount = snapshotMatchesExpectedState(snapshot, expectedGuideTarget)
          ? stableFrameCount + 1
          : 0;
        if (stableFrameCount >= contract.requiredFrames) {
          return {
            passed: true,
            stableFrameCount,
            stableSnapshot: snapshot,
            snapshots
          };
        }
      }
      return {
        passed: false,
        stableFrameCount,
        stableSnapshot: snapshots.at(-1) || null,
        snapshots
      };
    }

    window.__exUxSectionGuideStableState = Object.freeze({ evaluateSnapshots, observe });
  }, sectionGuideStableStateContract);
}

async function verifyNegativeStableStateCases(page) {
  const base = {
    expectedGuideTarget: "prioritization",
    expectedGuideExists: true,
    expectedGuideConnected: true,
    expectedGuideVisible: true,
    activeGuideCount: 1,
    activeGuideTarget: "prioritization",
    activeGuideAriaCurrent: "location",
    targetSectionExists: true,
    targetSectionConnected: true,
    targetSectionInScrollContainer: true,
    alignmentDelta: 5
  };
  const invalid = { ...base, activeGuideCount: 0, activeGuideTarget: null, activeGuideAriaCurrent: null };
  const cases = [
    { id: "null-active-guides", expected: false, snapshots: [invalid, invalid, invalid] },
    { id: "two-active-guides", expected: false, snapshots: [base, { ...base, activeGuideCount: 2 }, base] },
    { id: "wrong-guide-active", expected: false, snapshots: [{ ...base, activeGuideTarget: "history" }, { ...base, activeGuideTarget: "history" }, { ...base, activeGuideTarget: "history" }] },
    { id: "wrong-section-position", expected: false, snapshots: [{ ...base, alignmentDelta: 80 }, { ...base, alignmentDelta: 80 }, { ...base, alignmentDelta: 80 }] },
    { id: "correct-for-one-frame", expected: false, snapshots: [invalid, base, invalid] },
    { id: "reverts-after-two-frames", expected: false, snapshots: [base, base, { ...base, activeGuideTarget: "history" }] },
    { id: "stable-for-three-frames", expected: true, snapshots: [base, base, base] }
  ];
  return page.evaluate(testCases => testCases.map(testCase => {
    const outcome = window.__exUxSectionGuideStableState.evaluateSnapshots(testCase.snapshots, "prioritization");
    return {
      id: testCase.id,
      expected: testCase.expected,
      actual: outcome.passed,
      passed: outcome.passed === testCase.expected
    };
  }), cases);
}

function stateTransitions(snapshots) {
  return snapshots.filter((snapshot, index) => {
    if (index === 0) return true;
    const previous = snapshots[index - 1];
    return snapshot.activeGuideCount !== previous.activeGuideCount
      || snapshot.activeGuideTarget !== previous.activeGuideTarget
      || (snapshot.alignmentDelta <= sectionGuideStableStateContract.maximumAlignmentDelta)
        !== (previous.alignmentDelta <= sectionGuideStableStateContract.maximumAlignmentDelta);
  });
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
  fs.mkdirSync(screenshotDir, { recursive: true });
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
  page.on("requestfailed", request => {
    loadErrors.push(`${request.url()} :: ${request.failure()?.errorText || "failed"}`);
  });
  page.on("request", request => {
    if (/^https?:/i.test(request.url())) externalNetworkRequests.push(request.url());
  });

  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__obsoliqTestBridge), null, { timeout: 10000 });
  await page.evaluate(() => window.__obsoliqTestBridge.loadSample());
  await page.waitForFunction(() => !/^0(\s|$)/.test((document.querySelector("#mInventory")?.textContent || "").trim()), null, { timeout: 20000 });
  const routeState = await openUnifiedExcessSegment(page);
  await installSectionGuideStableStateHarness(page);
  const stableStateNegativeCases = await verifyNegativeStableStateCases(page);

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
    resetEmpty: await page.locator('[data-inventory-risk-filter="search"]').inputValue() === "",
    resetRows: await page.locator(".inventory-risk-table tbody tr").count()
  };

  const results = [];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(120);
    await installCanonicalHistoryFixture(page);
    await page.locator(".excess-detail-scroll").evaluate(node => { node.scrollTop = 0; });
    await page.waitForTimeout(60);
    const result = await page.evaluate(({ width, height }) => {
      const layout = document.querySelector(".inventory-risk-workspace");
      const worklist = document.querySelector(".inventory-risk-worklist");
      const detail = document.querySelector(".inventory-risk-detail");
      const tableScroll = document.querySelector(".inventory-risk-table-wrap");
      const detailScroll = document.querySelector(".excess-detail-scroll");
      const cards = [...document.querySelectorAll(".inventory-risk-summary-card")];
      const cardRects = cards.map(card => card.getBoundingClientRect());
      const readable = [...document.querySelectorAll(".excess-primary-decision p, .excess-primary-decision li, .excess-readiness-matrix-list li, .excess-detail-note, .excess-action-option-meta dd")];
      const important = [...document.querySelectorAll("#inventoryRisksPage .inventory-risk-summary-card, #inventoryRisksPage .excess-value-bridge-row, #inventoryRisksPage .excess-historical-state, #inventoryRisksPage .excess-action-option")];
      const navigation = document.querySelector(".excess-detail-section-nav");
      const narrative = document.querySelector("[data-decision-narrative-grid]");
      return {
        width,
        height,
        bodyOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
        componentOverflow: important.some(node => node.scrollWidth > node.clientWidth + 2),
        summaryCount: cards.length,
        summaryValuesPresent: cards.every(card => Boolean(card.querySelector("strong")?.textContent.trim())),
        summaryWidthDelta: cardRects.length ? Math.max(...cardRects.map(rect => rect.width)) - Math.min(...cardRects.map(rect => rect.width)) : 999,
        summaryHeightDelta: cardRects.length ? Math.max(...cardRects.map(rect => rect.height)) - Math.min(...cardRects.map(rect => rect.height)) : 999,
        summaryCentered: cards.every(card => getComputedStyle(card).textAlign === "center"),
        layoutStacked: detail.getBoundingClientRect().top >= worklist.getBoundingClientRect().bottom - 2,
        workspaceAboveFold: layout.getBoundingClientRect().top < innerHeight,
        worklistScroll: getComputedStyle(tableScroll).overflowY,
        detailScroll: getComputedStyle(detailScroll).overflowY,
        worklistPanelOverflow: getComputedStyle(worklist).overflowY,
        detailPanelOverflow: getComputedStyle(detail).overflowY,
        navigationSticky: getComputedStyle(navigation).position === "sticky",
        navigationKeys: [...navigation.querySelectorAll("[data-excess-detail-target]")].map(button => button.dataset.excessDetailTarget),
        nextStepFirst: narrative.firstElementChild?.matches("[data-next-step]") === true,
        headerActionBadgeCount: document.querySelectorAll(".excess-case-badges .action-badge").length,
        priorityMetricCount: [...document.querySelectorAll(".excess-inline-stats > div > span")].filter(node => /Priorität|Priority/.test(node.textContent)).length,
        actionsPrimary: Boolean(document.querySelector("[data-open-excess-actions].primary")),
        equationRoles: [...document.querySelectorAll(".excess-value-bridge [data-bridge-role]")].map(node => node.dataset.bridgeRole),
        equationTrackCount: document.querySelectorAll(".excess-value-equation-track").length,
        oldBridgeTrackCount: document.querySelectorAll(".excess-value-bridge .excess-value-track").length,
        readableMinimum: readable.length ? Math.min(...readable.map(node => parseFloat(getComputedStyle(node).fontSize))) : 0,
        historicalChartCount: document.querySelectorAll("figure.excess-history-chart").length
      };
    }, viewport);
    results.push(result);
    await page.screenshot({ path: path.join(screenshotDir, `excess-top-light-${viewport.width}x${viewport.height}.png`) });
  }

  await page.setViewportSize(viewports[0]);
  await installCanonicalHistoryFixture(page);
  await page.locator("[data-excess-detail-target='prioritization']").click();
  const sectionGuideObservation = await page.evaluate(expectedGuideTarget => (
    window.__exUxSectionGuideStableState.observe(expectedGuideTarget)
  ), "prioritization");
  const prioritizationActive = sectionGuideObservation.passed === true;
  const sectionGuideTransitions = stateTransitions(sectionGuideObservation.snapshots);
  await page.screenshot({ path: path.join(screenshotDir, "excess-prioritization-actions-light-1440x900.png") });

  await page.locator("[data-excess-detail-target='decision']").click();
  await page.waitForTimeout(500);
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.screenshot({ path: path.join(screenshotDir, "excess-top-dark-1440x900.png") });

  await page.evaluate(() => document.querySelector("#languageSelect").value = "en");
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
    if (!result.navigationSticky || result.navigationKeys.join(",") !== "decision,value,history,prioritization,actions") failures.push(`${result.width}:section-guide`);
    if (!result.nextStepFirst || result.headerActionBadgeCount !== 1 || result.priorityMetricCount !== 1 || !result.actionsPrimary) failures.push(`${result.width}:decision-hierarchy`);
    if (result.equationRoles.join(",") !== "gross,deduction,net" || result.equationTrackCount !== 0 || result.oldBridgeTrackCount !== 0) failures.push(`${result.width}:value-equation`);
    if (result.readableMinimum < 11) failures.push(`${result.width}:readability`);
    if (result.historicalChartCount !== 1) failures.push(`${result.width}:chart-count`);
  });
  if (stableStateNegativeCases.some(testCase => !testCase.passed)) failures.push("section-guide-negative-contract");
  if (!prioritizationActive) failures.push("section-guide-active-state");
  if (!/Decision/.test(englishLabels) || !/Action paths/.test(englishLabels)) failures.push("section-guide-localization");
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");
  if (loadErrors.length) failures.push("load-errors");
  if (externalNetworkRequests.length) failures.push("external-network-requests");

  const report = {
    status: failures.length ? "failed" : "passed",
    resetBehavior,
    routeState,
    results,
    prioritizationActive,
    rootCause: "test_observation_race",
    sectionGuideStableStateContract,
    stableStateNegativeCases,
    sectionGuideObservation: {
      passed: sectionGuideObservation.passed,
      observedFrames: sectionGuideObservation.snapshots.length,
      stableFrameCount: sectionGuideObservation.stableFrameCount,
      stableSnapshot: sectionGuideObservation.stableSnapshot,
      transitions: sectionGuideTransitions
    },
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
