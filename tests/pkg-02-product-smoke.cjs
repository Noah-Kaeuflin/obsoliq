const { chromium, productUrl } = require("./smoke-runtime.cjs");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const networkRequests = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", request => {
    if (/^https?:/i.test(request.url())) networkRequests.push(request.url());
  });
  page.on("requestfailed", request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || "" }));

  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.ObsoliQ?.data?.packageRegistry && window.ObsoliQIcons), null, { timeout: 20000 });
  await page.waitForFunction(() => !/^0(?:\s|$)/.test((document.querySelector("#mInventory")?.textContent || "").trim()), null, { timeout: 20000 });

  const initial = await page.evaluate(() => ({
    protocol: location.protocol,
    sampleDataLoaded: !/^0(?:\s|$)/.test((document.querySelector("#mInventory")?.textContent || "").trim()),
    iconSystemAvailable: Boolean(window.ObsoliQIcons),
    spriteCount: document.querySelectorAll("#obsoliq-icon-sprite").length,
    spriteSymbolCount: document.querySelectorAll("#obsoliq-icon-sprite symbol").length,
    navigationCount: document.querySelectorAll(".process-tabs button[data-process]").length,
    navigationIconCount: document.querySelectorAll(".process-tabs button[data-process] > .oq-icon").length,
    globalActionIconCount: ["uploadButton", "sampleButton", "exportInventoryButton", "actionFeedback"]
      .filter(id => document.querySelector(`#${id} > .oq-icon`)).length,
    visibleNavigationText: [...document.querySelectorAll(".process-tabs button[data-process]")].every(button => button.textContent.trim()),
    calibrationModulesAbsent: !(
      window.ObsoliQ?.slowDead?.calibrationContract
      || window.ObsoliQ?.slowDead?.calibrationRunner
      || window.ObsoliQ?.slowDead?.calibrationMetrics
      || window.ObsoliQ?.slowDead?.thresholdSensitivity
    )
  }));

  await page.locator("#uploadButton").click();
  await page.waitForSelector("#packageTypeModal.active");
  await page.locator("#packageTypeCloseButton").click();
  await page.locator("#sampleButton").click();
  await page.waitForFunction(() => document.getElementById("actionFeedback")?.textContent.trim() === "Daten geladen");
  await page.locator("#exportInventoryButton").click();
  await page.waitForSelector("#downloadModal.active");
  await page.locator("#downloadCancelButton").click();
  await page.locator("[data-process='inventory-explorer']").click();
  await page.waitForFunction(() => document.getElementById("overviewWorkspace")?.dataset.view === "inventory");
  await page.locator("[data-process='settings']").click();
  await page.waitForSelector("#settingsModal.active");
  await page.locator("#settingsDoneButton").click();

  const failures = [];
  if (initial.protocol !== "file:") failures.push("not-file-protocol");
  if (!initial.sampleDataLoaded) failures.push("sample-data-not-loaded");
  if (!initial.iconSystemAvailable || initial.spriteCount !== 1 || initial.spriteSymbolCount !== 39) failures.push("icon-runtime");
  if (initial.navigationCount !== 8 || initial.navigationIconCount !== 8 || !initial.visibleNavigationText) failures.push("navigation");
  if (initial.globalActionIconCount !== 4) failures.push("global-action-icons");
  if (!initial.calibrationModulesAbsent) failures.push("analysis-modules-in-product-bootstrap");
  if (networkRequests.length) failures.push("external-network-requests");
  if (failedRequests.length) failures.push("failed-requests");
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");

  console.log(JSON.stringify({
    status: failures.length ? "failed" : "passed",
    url: page.url(),
    initial,
    interactions: { upload: true, sampleData: true, export: true, navigation: true, settings: true },
    networkRequests,
    failedRequests,
    pageErrors,
    consoleErrors,
    failures
  }, null, 2));
  await browser.close();
  if (failures.length) process.exit(1);
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
