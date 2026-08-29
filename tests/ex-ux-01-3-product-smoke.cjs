const fs = require("fs");
const path = require("path");
const { chromium, productUrl } = require("./smoke-runtime.cjs");
const { activateExcessDetailTab, assertUnifiedExcessRoute, openUnifiedExcessSegment } = require("./inventory-risk-smoke-navigation.cjs");
const screenshotDir = path.join(__dirname, "screenshots", "ex-ux-01-3");
const viewports = [
  { width: 1440, height: 900 },
  { width: 1200, height: 800 },
  { width: 900, height: 800 },
  { width: 720, height: 900 },
  { width: 390, height: 844 }
];

async function main() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: viewports[0] });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !/^0(\s|$)/.test((document.querySelector("#mInventory")?.textContent || "").trim()), null, { timeout: 20000 });
  const routeState = await openUnifiedExcessSegment(page);
  await activateExcessDetailTab(page, "decision");

  const results = [];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    const result = await page.evaluate(({ width, height }) => {
      const detail = document.querySelector(".inventory-risk-detail");
      const scroll = document.querySelector(".excess-detail-scroll");
      const narrative = document.querySelector("[data-decision-narrative-grid]");
      const core = document.querySelector(".excess-decision-core");
      const surface = document.querySelector("[data-excess-decision-surface]");
      const style = getComputedStyle(narrative);
      const layoutStyle = getComputedStyle(document.querySelector(".inventory-risk-workspace"));
      const importantNodes = [...document.querySelectorAll(".excess-case-identity, .excess-primary-decision, .excess-action-option, .excess-value-narrative, .excess-work-context")];
      return {
        width,
        height,
        bodyOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
        layoutColumns: layoutStyle.gridTemplateColumns.split(" ").filter(Boolean).length,
        narrativeColumns: style.gridTemplateColumns.split(" ").filter(Boolean).length,
        surfaceWidth: surface?.getBoundingClientRect().width || 0,
        coreInSharedSurface: core?.parentElement === surface && scroll?.parentElement === surface,
        narrativeInActivePanel: Boolean(narrative?.closest('[role="tabpanel"][data-excess-detail-section="decision"]:not([hidden])')),
        internalScrollAvailable: scroll.scrollHeight >= scroll.clientHeight,
        detailFamily: detail?.dataset.inventoryRiskDetailFamily || "",
        actionOptions: document.querySelectorAll(".excess-action-option").length,
        readinessStatus: document.querySelector("[data-readiness-status]")?.dataset.readinessStatus || "",
        historyState: document.querySelector("[data-history-detail-state]")?.dataset.historyDetailState || "",
        valuePrimaryMentionsCash: /cash/i.test(document.querySelector(".excess-value-step.primary")?.textContent || ""),
        componentOverflow: importantNodes.some(node => node.scrollWidth > node.clientWidth + 2)
      };
    }, viewport);
    results.push(result);
    await page.screenshot({ path: path.join(screenshotDir, `excess-light-${viewport.width}x${viewport.height}.png`), fullPage: true });
  }

  await page.setViewportSize(viewports[0]);
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.waitForTimeout(100);
  await page.screenshot({ path: path.join(screenshotDir, "excess-dark-1440x900.png"), fullPage: true });

  const failures = [];
  assertUnifiedExcessRoute(routeState, failures);
  results.forEach(result => {
    if (result.bodyOverflow > 2) failures.push(`${result.width}:body-overflow`);
    if (result.componentOverflow) failures.push(`${result.width}:component-overflow`);
    if (!result.coreInSharedSurface || !result.narrativeInActivePanel) failures.push(`${result.width}:shared-surface-contract`);
    if (result.detailFamily !== "excess_demand") failures.push(`${result.width}:unified-detail-family`);
    if (!result.actionOptions) failures.push(`${result.width}:action-options`);
    if (!result.readinessStatus) failures.push(`${result.width}:readiness`);
    if (result.valuePrimaryMentionsCash) failures.push(`${result.width}:net-labelled-cash`);
    const expectedNarrativeColumns = result.surfaceWidth >= 580 ? 2 : 1;
    if (result.narrativeColumns !== expectedNarrativeColumns) failures.push(`${result.width}:container-responsive-narrative`);
    if (result.width <= 1240 && result.layoutColumns !== 1) failures.push(`${result.width}:responsive-layout-gap`);
  });
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");

  const report = {
    status: failures.length ? "failed" : "passed",
    results,
    routeState,
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
