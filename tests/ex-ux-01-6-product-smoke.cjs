const fs = require("fs");
const path = require("path");
const { chromium, productUrl } = require("./smoke-runtime.cjs");
const { assertUnifiedExcessRoute, openUnifiedExcessSegment } = require("./inventory-risk-smoke-navigation.cjs");
const screenshotDir = path.join(__dirname, "screenshots", "ex-ux-01-6");
const viewports = [
  { width: 1440, height: 900 },
  { width: 1440, height: 768 },
  { width: 1366, height: 768 },
  { width: 1200, height: 800 },
  { width: 900, height: 900 },
  { width: 720, height: 900 },
  { width: 390, height: 844 }
];

async function main() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: viewports[0], reducedMotion: "reduce" });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.addInitScript(() => { window.__OBSOLIQ_TEST_MODE__ = true; });
  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__obsoliqTestBridge), null, { timeout: 10000 });
  await page.evaluate(() => window.__obsoliqTestBridge.loadSample());
  await page.waitForFunction(() => !/^0(\s|$)/.test((document.querySelector("#mInventory")?.textContent || "").trim()), null, { timeout: 20000 });
  const routeState = await openUnifiedExcessSegment(page);

  const results = [];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => {
      document.documentElement.dataset.theme = "light";
      document.documentElement.lang = "de";
      document.querySelector(".excess-detail-scroll")?.scrollTo({ top: 0, behavior: "auto" });
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(100);
    const result = await page.evaluate(({ width, height }) => {
      const pageRoot = document.getElementById("inventoryRisksPage");
      const worklistPanel = document.querySelector(".inventory-risk-worklist");
      const detailPanel = document.querySelector(".inventory-risk-detail");
      const worklist = document.querySelector(".inventory-risk-table-wrap");
      const detail = document.querySelector(".excess-detail-scroll");
      const scoreHeader = document.querySelector("[data-header-opportunity-score-available]");
      const scoreLabel = scoreHeader?.querySelector(":scope > span");
      const openingLabel = document.querySelector(".inventory-risk-table thead th:last-child .visually-hidden");
      const navButtons = [...document.querySelectorAll(".excess-detail-section-nav button")];
      const cards = [...document.querySelectorAll(".inventory-risk-summary-card")];
      const readable = [...document.querySelectorAll(".excess-primary-decision p, .excess-primary-decision li, .excess-readiness-matrix-list li, .excess-detail-note, .excess-action-option-meta dd")];
      const visible = [...pageRoot.querySelectorAll("*")].filter(node => node.getClientRects().length && getComputedStyle(node).display !== "none");
      const invalidWeights = visible
        .map(node => Number(getComputedStyle(node).fontWeight))
        .filter(weight => !Number.isFinite(weight) || weight < 400 || weight > 900);
      const invalidWeightSamples = visible
        .filter(node => {
          const weight = Number(getComputedStyle(node).fontWeight);
          return !Number.isFinite(weight) || weight < 400 || weight > 900;
        })
        .slice(0, 16)
        .map(node => ({ tag: node.tagName, className: node.className, weight: getComputedStyle(node).fontWeight }));
      const invalidWeightGroups = [...visible
        .filter(node => {
          const weight = Number(getComputedStyle(node).fontWeight);
          return !Number.isFinite(weight) || weight < 400 || weight > 900;
        })
        .reduce((groups, node) => {
          const owner = node.closest("[class]");
          const key = `${node.tagName}.${String(node.className || "").trim().replace(/\s+/g, ".")}:${getComputedStyle(node).fontWeight}@${owner?.className || "none"}`;
          groups.set(key, (groups.get(key) || 0) + 1);
          return groups;
        }, new Map())]
        .map(([key, count]) => ({ key, count }));
      const bodyHeightOverflow = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - innerHeight;
      return {
        width,
        height,
        horizontalOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
        bodyHeightOverflow,
        bodyOverflowY: getComputedStyle(document.body).overflowY,
        stacked: detailPanel.getBoundingClientRect().top >= worklistPanel.getBoundingClientRect().bottom - 2,
        worklistScroll: getComputedStyle(worklist).overflowY,
        detailScroll: getComputedStyle(detail).overflowY,
        worklistPanelOverflow: getComputedStyle(worklistPanel).overflowY,
        detailPanelOverflow: getComputedStyle(detailPanel).overflowY,
        scoreText: scoreLabel?.textContent.trim(),
        scoreNotClipped: scoreLabel && scoreLabel.getBoundingClientRect().left >= scoreHeader.getBoundingClientRect().left - 1 && scoreLabel.getBoundingClientRect().right <= scoreHeader.getBoundingClientRect().right + 1,
        openingText: openingLabel?.textContent.trim(),
        openingLabelHidden: Boolean(openingLabel && openingLabel.getBoundingClientRect().width <= 1 && openingLabel.getBoundingClientRect().height <= 1),
        navMinHeight: Math.min(...navButtons.map(button => button.getBoundingClientRect().height)),
        summaryHeights: cards.map(card => card.getBoundingClientRect().height),
        readableMinimum: readable.length ? Math.min(...readable.map(node => parseFloat(getComputedStyle(node).fontSize))) : 0,
        invalidWeightCount: invalidWeights.length,
        invalidWeightSamples,
        invalidWeightGroups,
        equationTrackCount: document.querySelectorAll(".excess-value-equation-track").length,
        anchorCount: document.querySelectorAll(".excess-section-anchor").length,
        primaryActionFields: document.querySelectorAll(".excess-action-option.primary .excess-action-primary-fields > div").length,
        hasActionDisclosure: Boolean(document.querySelector(".excess-action-option.primary .excess-action-evidence-disclosure")),
        historicalEmptyHeight: document.querySelector(".excess-historical-state.unavailable")?.getBoundingClientRect().height || 0
      };
    }, viewport);
    results.push(result);
    await page.screenshot({ path: path.join(screenshotDir, `excess-light-de-${viewport.width}x${viewport.height}.png`) });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "light";
    document.querySelector(".excess-detail-scroll").scrollTop = 0;
    window.scrollTo(0, 0);
  });
  const landings = [];
  for (const key of ["decision", "value", "history", "prioritization", "actions"]) {
    await page.locator(`[data-excess-detail-target="${key}"]`).click();
    await page.waitForTimeout(80);
    landings.push(await page.evaluate(sectionKey => {
      const navigation = document.querySelector(".excess-detail-section-nav");
      const anchor = document.querySelector(`[data-excess-section-anchor="${sectionKey}"]`);
      const section = document.querySelector(`[data-excess-detail-section="${sectionKey}"]`);
      const heading = section?.querySelector("h4");
      return {
        key: sectionKey,
        current: navigation.querySelector("[aria-current='location']")?.dataset.excessDetailTarget,
        anchorTop: anchor?.getBoundingClientRect().top,
        navBottom: navigation.getBoundingClientRect().bottom,
        headingTop: heading?.getBoundingClientRect().top,
        headingVisible: Boolean(heading && heading.getBoundingClientRect().top >= navigation.getBoundingClientRect().bottom - 1)
      };
    }, key));
  }
  await page.screenshot({ path: path.join(screenshotDir, "excess-actions-landing-light-de-1440x900.png") });

  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
    document.querySelector("[data-excess-detail-target='decision']")?.click();
  });
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(screenshotDir, "excess-decision-dark-de-1440x900.png") });

  await page.evaluate(() => {
    const language = document.querySelector("#languageSelect");
    language.value = "en";
    language.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(100);
  const english = await page.evaluate(() => ({
    nav: document.querySelector(".excess-detail-section-nav")?.innerText || "",
    summary: document.querySelector(".inventory-risk-summary-grid")?.innerText || "",
    action: document.querySelector(".excess-action-option.primary")?.innerText || ""
  }));
  await page.screenshot({ path: path.join(screenshotDir, "excess-decision-dark-en-1440x900.png") });

  const failures = [];
  assertUnifiedExcessRoute(routeState, failures);
  results.forEach(result => {
    if (result.horizontalOverflow > 2) failures.push(`${result.width}x${result.height}:horizontal-overflow`);
    if (result.width > 1240 && result.stacked) failures.push(`${result.width}x${result.height}:unexpected-stack`);
    if (result.width <= 1240 && !result.stacked) failures.push(`${result.width}x${result.height}:missing-stack`);
    if (result.worklistScroll !== "auto" || result.detailScroll !== "auto" || result.worklistPanelOverflow !== "hidden" || result.detailPanelOverflow !== "hidden") failures.push(`${result.width}x${result.height}:scroll-ownership`);
    if (!/Score/.test(result.scoreText || "") || !result.scoreNotClipped || !/Case öffnen|Open case/.test(result.openingText || "") || !result.openingLabelHidden) failures.push(`${result.width}x${result.height}:worklist-header`);
    if (result.navMinHeight < 34) failures.push(`${result.width}x${result.height}:navigation-size`);
    if (result.summaryHeights.length !== 4 || result.summaryHeights.some(value => value < 64)) failures.push(`${result.width}x${result.height}:summary-height`);
    if (result.readableMinimum < 11 || result.invalidWeightCount > 0) failures.push(`${result.width}x${result.height}:typography`);
    if (result.equationTrackCount !== 0 || result.anchorCount !== 5) failures.push(`${result.width}x${result.height}:presentation-contract`);
    if (result.primaryActionFields !== 2 || !result.hasActionDisclosure) failures.push(`${result.width}x${result.height}:primary-action`);
    if (result.width > 720 && result.historicalEmptyHeight && result.historicalEmptyHeight > 74) failures.push(`${result.width}x${result.height}:historical-density`);
  });
  landings.forEach(landing => {
    if (landing.current !== landing.key || !landing.headingVisible || landing.anchorTop < landing.navBottom - 1) failures.push(`${landing.key}:section-landing`);
  });
  if (!/Decision/.test(english.nav) || !/Action paths/.test(english.nav)) failures.push("english-navigation");
  if (!/Unique Risk Entities/.test(english.summary) || !/Evidence Readiness/.test(english.summary) || !/Show evidence and derivation/.test(english.action)) failures.push("english-content");
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");

  const report = {
    status: failures.length ? "failed" : "passed",
    results,
    routeState,
    landings,
    english,
    pageErrors,
    consoleErrors,
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
