const fs = require("fs");
const path = require("path");
const { chromium, productUrl } = require("./smoke-runtime.cjs");
const { assertUnifiedExcessRoute, openUnifiedExcessSegment } = require("./inventory-risk-smoke-navigation.cjs");
const screenshotDir = path.join(__dirname, "screenshots", "ex-ux-01-4");
const viewports = [
  { width: 1440, height: 900 },
  { width: 1200, height: 800 },
  { width: 900, height: 800 },
  { width: 720, height: 900 },
  { width: 390, height: 844 }
];

async function installCanonicalHistoryFixture(page) {
  await page.evaluate(() => {
    const bridge = window.__obsoliqTestBridge;
    const current = document.querySelector(".excess-historical-state");
    if (!bridge || !current) return;
    const months = ["2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"];
    const monthlyBuckets = months.map((month, index) => ({
      month,
      netQuantity: index === 3 ? -2 : index === 5 ? 0 : (index % 4) + 1,
      unit: "ST"
    }));
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
        monthlyBuckets
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
  await page.addInitScript(() => { window.__OBSOLIQ_TEST_MODE__ = true; });
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__obsoliqTestBridge), null, { timeout: 10000 });
  await page.evaluate(() => window.__obsoliqTestBridge.loadSample());
  await page.waitForFunction(() => !/^0(\s|$)/.test((document.querySelector("#mInventory")?.textContent || "").trim()), null, { timeout: 20000 });
  const routeState = await openUnifiedExcessSegment(page);
  const results = [];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    await installCanonicalHistoryFixture(page);
    const result = await page.evaluate(({ width, height }) => {
      const detail = document.querySelector(".inventory-risk-detail");
      const card = detail?.querySelector(".excess-detail-card");
      const narrative = card?.querySelector("[data-decision-narrative-grid]");
      const value = card?.querySelector("[data-value-bridge]");
      const history = card?.querySelector("figure[data-canonical-monthly-buckets='true']");
      const score = card?.querySelector(".excess-score-list[data-score-component-maximum-source='opportunity-score-engine']");
      const actions = card?.querySelector(".excess-action-options-section");
      const work = card?.querySelector(".excess-work-context");
      const children = card ? [...card.children] : [];
      const scoreRows = score ? [...score.querySelectorAll("[data-score-component]")] : [];
      const directReadinessColumns = [...document.querySelectorAll(".excess-readiness-card > .excess-readiness-grid > div")];
      const importantNodes = [...document.querySelectorAll(
        "[data-value-bridge], .excess-value-bridge-row, .excess-historical-state, .excess-history-chart, .excess-score-list, .excess-score-row, .excess-readiness-card, .excess-action-option"
      )];
      return {
        width,
        height,
        bodyOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
        componentOverflow: importantNodes.some(node => node.scrollWidth > node.clientWidth + 2),
        visualCount: [value, history, score, document.querySelector(".excess-readiness-grid")].filter(Boolean).length,
        valueRoles: [...document.querySelectorAll(".excess-value-bridge [data-bridge-role]")].map(row => row.dataset.bridgeRole),
        stockIsContextOnly: !document.querySelector(".excess-value-bridge [data-value-context='stock']") && Boolean(document.querySelector("[data-value-context='stock']")),
        historyBucketCount: Number(history?.dataset.bucketCount || 0),
        historyNegative: history?.dataset.negativeValues === "true",
        historyBaseline: Boolean(history?.querySelector(".excess-history-zero-line")),
        historyAccessible: Boolean(history?.querySelector("svg[role='img'][aria-label]") && history?.querySelector("figcaption")),
        scoreRows: scoreRows.map(row => ({ contribution: Number(row.dataset.scoreContribution), maximum: Number(row.dataset.scoreMaximum), ratio: Number(row.dataset.scoreRatio) })),
        scoreAccessible: scoreRows.every(row => Boolean(row.querySelector("[role='progressbar'][aria-valuenow][aria-valuemax]"))),
        readinessDirectBounded: directReadinessColumns.every(column => column.querySelectorAll("li").length <= 4),
        readinessDisclosure: Boolean(document.querySelector("details.excess-readiness-more > summary")),
        primaryOptionOpen: Boolean(document.querySelector("article.excess-action-option.primary .excess-action-option-meta")),
        secondaryOptionsCompact: [...document.querySelectorAll("details.excess-action-option.secondary")].every(node => !node.open),
        correctOrder: children.indexOf(narrative) < children.indexOf(value)
          && children.indexOf(value) < children.indexOf(card?.querySelector(".excess-historical-state"))
          && children.indexOf(card?.querySelector(".excess-historical-state")) < children.indexOf(card?.querySelector(".excess-decision-basis-grid"))
          && children.indexOf(card?.querySelector(".excess-decision-basis-grid")) < children.indexOf(actions)
          && children.indexOf(actions) < children.indexOf(work)
      };
    }, viewport);
    results.push(result);
    await page.locator(".excess-detail-scroll").evaluate(node => { node.scrollTop = Math.max(0, node.scrollHeight * 0.34); });
    await page.screenshot({ path: path.join(screenshotDir, `excess-visuals-light-${viewport.width}x${viewport.height}.png`), fullPage: true });
    await page.locator(".excess-detail-scroll").evaluate(node => { node.scrollTop = 0; });
  }

  await page.setViewportSize(viewports[0]);
  await installCanonicalHistoryFixture(page);
  const readinessSummary = page.locator("details.excess-readiness-more > summary");
  await readinessSummary.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const readinessFocusVisible = await readinessSummary.evaluate(node => node.matches(":focus-visible") && getComputedStyle(node).outlineStyle !== "none");
  await readinessSummary.press("Enter");
  const readinessKeyboardOpened = await page.locator("details.excess-readiness-more").evaluate(node => node.open);
  await readinessSummary.press("Enter");

  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.waitForTimeout(100);
  await installCanonicalHistoryFixture(page);
  await page.locator(".excess-detail-scroll").evaluate(node => { node.scrollTop = Math.max(0, node.scrollHeight * 0.34); });
  await page.screenshot({ path: path.join(screenshotDir, "excess-visuals-dark-1440x900.png"), fullPage: true });

  const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
  const rendererStart = appSource.indexOf("function renderExcessScoreComponents");
  const rendererEnd = appSource.indexOf("function renderExcessScenarios", rendererStart);
  const scoreRendererSource = appSource.slice(rendererStart, rendererEnd);
  const rendererHardcodesWeights = /financial_impact\s*:\s*35|urgency\s*:\s*20|actionability\s*:\s*20|evidence\s*:\s*15|data_confidence\s*:\s*12/.test(scoreRendererSource);

  const failures = [];
  assertUnifiedExcessRoute(routeState, failures);
  results.forEach(result => {
    if (result.bodyOverflow > 2) failures.push(`${result.width}:body-overflow`);
    if (result.componentOverflow) failures.push(`${result.width}:component-overflow`);
    if (result.visualCount !== 4) failures.push(`${result.width}:visual-contract`);
    if (result.valueRoles.join(",") !== "gross,deduction,net" || !result.stockIsContextOnly) failures.push(`${result.width}:value-bridge-semantics`);
    if (result.historyBucketCount !== 12 || !result.historyNegative || !result.historyBaseline || !result.historyAccessible) failures.push(`${result.width}:history-contract`);
    if (!result.scoreRows.length || !result.scoreAccessible || result.scoreRows.some(row => Math.abs(row.ratio - Math.min(1, row.contribution / row.maximum)) > 0.0002)) failures.push(`${result.width}:score-contract`);
    if (!result.readinessDirectBounded || !result.readinessDisclosure) failures.push(`${result.width}:readiness-contract`);
    if (!result.primaryOptionOpen || !result.secondaryOptionsCompact) failures.push(`${result.width}:action-option-contract`);
    if (!result.correctOrder) failures.push(`${result.width}:visual-order`);
  });
  if (!readinessFocusVisible || !readinessKeyboardOpened) failures.push("readiness-keyboard-accessibility");
  if (rendererHardcodesWeights) failures.push("score-renderer-hardcodes-weights");
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");

  const report = {
    status: failures.length ? "failed" : "passed",
    results,
    routeState,
    readinessFocusVisible,
    readinessKeyboardOpened,
    rendererHardcodesWeights,
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
