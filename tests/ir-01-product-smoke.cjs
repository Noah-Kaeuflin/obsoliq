const { chromium, productUrl, captureScreenshot, screenshotName } = require("./smoke-runtime.cjs");

const screenshotDir = "screenshots/ir-01";
const viewports = [
  { name: "desktop-light-de", width: 1440, height: 900, language: "de", dark: false },
  { name: "tablet-dark-en", width: 1024, height: 900, language: "en", dark: true },
  { name: "mobile-light-de", width: 390, height: 844, language: "de", dark: false }
];

async function setPresentation(page, language, dark) {
  await page.evaluate(({ language, dark }) => {
    const languageSelect = document.getElementById("languageSelect");
    const darkModeToggle = document.getElementById("darkModeToggle");
    languageSelect.value = language;
    languageSelect.dispatchEvent(new Event("change", { bubbles: true }));
    darkModeToggle.checked = dark;
    darkModeToggle.dispatchEvent(new Event("change", { bubbles: true }));
    window.scrollTo(0, 0);
  }, { language, dark });
  await page.waitForTimeout(80);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true, viewport: viewports[0], reducedMotion: "reduce" });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const requests = [];
  const failedRequests = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("request", request => requests.push(request.url()));
  page.on("requestfailed", request => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || "" }));

  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#sampleButton").click();
  await page.waitForFunction(() => document.querySelector("#actionFeedback .action-feedback-text")?.textContent.trim() === "Daten geladen", null, { timeout: 30000 });
  await page.locator('[data-process="inventory-risks"]').click();
  await page.waitForSelector("#view-inventory-risks.active", { state: "attached", timeout: 15000 });
  await page.waitForTimeout(100);

  const bootstrapState = await page.evaluate(() => ({
    workspaceView: document.getElementById("overviewWorkspace")?.dataset.view || "",
    viewClass: document.getElementById("view-inventory-risks")?.className || "",
    rootText: document.getElementById("inventoryRisksPage")?.textContent || "",
    segmentCount: document.querySelectorAll("[data-inventory-risk-segment]").length
  }));
  if (!bootstrapState.segmentCount) {
    console.log(JSON.stringify({ status: "failed", bootstrapState, pageErrors, consoleErrors, failures: ["inventory-risk-render-bootstrap"] }, null, 2));
    await browser.close();
    process.exit(1);
  }

  const initial = await page.evaluate(() => ({
    protocol: location.protocol,
    hasTestBridge: Boolean(window.__obsoliqTestBridge),
    testResultPresent: Boolean(window.__OBSOLIQ_TEST_RESULTS__),
    visibleRoutes: [...document.querySelectorAll(".process-tabs button[data-process]")].map(button => button.dataset.process),
    segments: [...document.querySelectorAll("[data-inventory-risk-segment]")].map(button => ({ key: button.dataset.inventoryRiskSegment, count: Number(button.querySelector("strong")?.textContent || 0) })),
    limitedCapabilityVisible: Boolean(document.querySelector('[data-inventory-risk-segment="blocked_quality"]')),
    financialGuard: document.querySelector(".inventory-risk-summary-group.financial .inventory-risk-summary-group-head span")?.textContent || ""
  }));

  const segmentChecks = [];
  for (const segment of ["all", "excess_demand", "slow_dead", "blocked_quality", "prioritized"]) {
    await page.locator(`[data-inventory-risk-segment="${segment}"]`).click();
    await page.waitForTimeout(50);
    segmentChecks.push(await page.evaluate(segment => ({
      segment,
      active: document.querySelector(`[data-inventory-risk-segment="${segment}"]`)?.getAttribute("aria-selected") === "true",
      rows: document.querySelectorAll("[data-inventory-risk-case]").length,
      limited: segment === "blocked_quality" ? Boolean(document.querySelector(".inventory-risk-capability.limited")) : null
    }), segment));
  }
  await page.locator('[data-inventory-risk-segment="all"]').click();

  const responsive = [];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await setPresentation(page, viewport.language, viewport.dark);
    const result = await page.evaluate(({ name, width, language, dark }) => {
      const detail = document.querySelector(".inventory-risk-detail");
      const detailScrollOwner = detail?.querySelector(".excess-detail-scroll") || detail;
      return {
        name,
        width,
        language: document.documentElement.lang,
        theme: document.documentElement.dataset.theme,
        horizontalOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
        bodyOverflowX: getComputedStyle(document.body).overflowX,
        title: document.querySelector(".inventory-risk-header h2")?.textContent.trim() || "",
        segmentLabels: [...document.querySelectorAll("[data-inventory-risk-segment] span")].map(element => element.textContent.trim()),
        workspaceVisible: Boolean(document.querySelector("#view-inventory-risks.active .inventory-risk-workspace")),
        worklistScroll: getComputedStyle(document.querySelector(".inventory-risk-table-wrap")).overflowY,
        detailScrollOwner: detailScrollOwner?.className || "",
        detailScroll: detailScrollOwner ? getComputedStyle(detailScrollOwner).overflowY : "",
        darkExpected: dark
      };
    }, viewport);
    responsive.push(result);
    await captureScreenshot(page, screenshotName("ir-01", `${viewport.name}-${viewport.width}x${viewport.height}.png`), { fullPage: false });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await setPresentation(page, "de", false);
  await page.locator("[data-inventory-risk-export]").click();
  await page.waitForSelector("#downloadModal.active", { timeout: 5000 });
  const downloadPromise = page.waitForEvent("download", { timeout: 10000 });
  await page.locator("#downloadConfirmButton").click();
  const download = await downloadPromise;
  const exportFilename = download.suggestedFilename();

  const externalRequests = requests.filter(url => /^https?:/i.test(url));
  const failures = [];
  if (initial.protocol !== "file:") failures.push("not-file-protocol");
  if (initial.hasTestBridge || initial.testResultPresent) failures.push("production-bootstrap-executed-tests");
  if (initial.visibleRoutes.filter(route => route === "inventory-risks").length !== 1) failures.push("inventory-risks-nav-count");
  if (initial.visibleRoutes.some(route => ["excess-stock", "slow-dead-stock", "blocked-quality"].includes(route))) failures.push("legacy-risk-nav-visible");
  if (initial.visibleRoutes.length !== 8) failures.push("visible-navigation-count");
  if (initial.segments.length !== 5 || initial.segments.some(item => !["all", "excess_demand", "slow_dead", "blocked_quality", "prioritized"].includes(item.key))) failures.push("segment-contract");
  if (!initial.segments.find(item => item.key === "excess_demand")?.count) failures.push("sample-excess-cases-missing");
  if (!initial.segments.find(item => item.key === "blocked_quality")?.count) failures.push("sample-blocked-quality-cases-missing");
  if (!/keine.*addition|nicht.*addiert|not added|not.*combined/i.test(initial.financialGuard)) failures.push("financial-semantic-guard-missing");
  segmentChecks.forEach(result => {
    if (!result.active) failures.push(`${result.segment}:not-active`);
    const segmentCount = initial.segments.find(item => item.key === result.segment)?.count || 0;
    if (segmentCount && !result.rows) failures.push(`${result.segment}:no-visible-cases`);
    if (result.segment === "blocked_quality" && result.rows && !result.limited) failures.push("blocked-quality:limited-capability-missing");
  });
  responsive.forEach(result => {
    if (result.horizontalOverflow > 2 && result.bodyOverflowX !== "hidden") failures.push(`${result.name}:horizontal-overflow`);
    if (!result.workspaceVisible) failures.push(`${result.name}:workspace-hidden`);
    if (result.language !== (result.name.includes("-en") ? "en" : "de")) failures.push(`${result.name}:language`);
    if ((result.theme === "dark") !== result.darkExpected) failures.push(`${result.name}:theme`);
    if (result.worklistScroll !== "auto" || result.detailScroll !== "auto") failures.push(`${result.name}:scroll-ownership`);
  });
  if (!/(inventory.*risk|bestandsrisiken)/i.test(exportFilename) || !/\.xls$/i.test(exportFilename)) failures.push("risk-export-filename");
  if (externalRequests.length) failures.push("external-requests");
  if (failedRequests.length) failures.push("failed-requests");
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");

  const report = {
    status: failures.length ? "failed" : "passed",
    url: page.url(),
    initial,
    segmentChecks,
    responsive,
    exportFilename,
    pageErrors,
    consoleErrors,
    externalRequests,
    failedRequests,
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
