const { chromium, productUrl, captureScreenshot, screenshotName } = require("./smoke-runtime.cjs");
const { activateExcessDetailTab, assertUnifiedExcessRoute, openUnifiedExcessSegment } = require("./inventory-risk-smoke-navigation.cjs");
const screenshotDir = "screenshots/ex-ux-01-3-1";
const viewports = [
  { width: 1440, height: 900 },
  { width: 1200, height: 800 },
  { width: 900, height: 800 },
  { width: 720, height: 900 },
  { width: 390, height: 844 }
];

async function main() {
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
  await activateExcessDetailTab(page, "actions");

  const results = [];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    const result = await page.evaluate(({ width, height }) => {
      const detail = document.querySelector(".inventory-risk-detail");
      const secondary = [...document.querySelectorAll("details.excess-action-option.secondary")];
      const workLabels = [...document.querySelectorAll(".excess-work-context dt")].map(node => node.textContent.trim());
      const importantNodes = [...document.querySelectorAll(
        ".excess-case-identity, .excess-primary-decision, .excess-action-option, .excess-action-option > summary, .excess-value-narrative, .excess-work-context"
      )];
      return {
        width,
        height,
        bodyOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
        secondaryOptionCount: secondary.length,
        secondaryOptionsClosed: secondary.every(node => !node.open),
        secondaryStatusesVisible: secondary.every(node => Boolean(node.querySelector("summary .excess-option-status"))),
        primaryRecommendationVisible: Boolean(document.querySelector("article.excess-action-option.primary .excess-action-option-meta")),
        workLabels,
        actionStatusInHeader: document.querySelectorAll(".excess-case-badges .action-badge").length === 1,
        pilotReviewSeparate: Boolean(detail?.querySelector(".pilot-review-card")),
        poUploadChoicePresent: Boolean(document.querySelector("#packageTypePurchaseOrdersButton")),
        packageChoiceCount: document.querySelectorAll(".package-type-options .package-type-card").length,
        componentOverflow: importantNodes.some(node => node.scrollWidth > node.clientWidth + 2)
      };
    }, viewport);
    results.push(result);
    await captureScreenshot(page, screenshotName("ex-ux-01-3-1", `excess-closure-light-${viewport.width}x${viewport.height}.png`), { fullPage: true });
  }

  await page.setViewportSize(viewports[0]);
  const firstSecondary = page.locator("details.excess-action-option.secondary > summary").first();
  await firstSecondary.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const focusVisible = await firstSecondary.evaluate(node => node.matches(":focus-visible") && getComputedStyle(node).outlineStyle !== "none");
  await firstSecondary.press("Enter");
  const keyboardDisclosureOpened = await page.locator("details.excess-action-option.secondary").first().evaluate(node => node.open);
  await firstSecondary.press("Enter");

  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
  await page.waitForTimeout(100);
  await captureScreenshot(page, screenshotName("ex-ux-01-3-1", "excess-closure-dark-1440x900.png"), { fullPage: true });

  const failures = [];
  assertUnifiedExcessRoute(routeState, failures);
  results.forEach(result => {
    if (result.bodyOverflow > 2) failures.push(`${result.width}:body-overflow`);
    if (result.componentOverflow) failures.push(`${result.width}:component-overflow`);
    if (!result.secondaryOptionCount || !result.secondaryOptionsClosed) failures.push(`${result.width}:secondary-options-not-compact`);
    if (!result.secondaryStatusesVisible || !result.primaryRecommendationVisible) failures.push(`${result.width}:option-visibility-contract`);
    if (result.workLabels.length !== 3) failures.push(`${result.width}:work-context-not-deduplicated`);
    if (!result.actionStatusInHeader || !result.pilotReviewSeparate) failures.push(`${result.width}:status-review-boundary`);
    if (result.poUploadChoicePresent || result.packageChoiceCount !== 3) failures.push(`${result.width}:false-po-import-capability`);
  });
  if (!focusVisible || !keyboardDisclosureOpened) failures.push("secondary-option-keyboard-accessibility");
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");

  const report = {
    status: failures.length ? "failed" : "passed",
    results,
    routeState,
    focusVisible,
    keyboardDisclosureOpened,
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
