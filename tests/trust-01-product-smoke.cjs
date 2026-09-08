"use strict";

const { chromium, productUrl } = require("./smoke-runtime.cjs");

const viewports = [
  { width: 1440, height: 900 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 }
];

async function presentationState(page, viewport) {
  await page.setViewportSize(viewport);
  await page.evaluate(() => {
    document.getElementById("languageSelect").value = "de";
    document.getElementById("languageSelect").dispatchEvent(new Event("change", { bubbles: true }));
    document.getElementById("darkModeToggle").checked = false;
    document.getElementById("darkModeToggle").dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForSelector("#view-inventory-risks.active [data-inventory-risk-segment='slow_dead']");
  const german = await page.evaluate(() => ({
    badge: document.querySelector('[data-inventory-risk-segment="slow_dead"] strong')?.textContent.trim() || "",
    horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    text: document.getElementById("inventoryRisksPage")?.innerText || ""
  }));
  await page.locator('[data-inventory-risk-segment="slow_dead"]').click();
  const cta = page.locator("[data-inventory-risk-import-history]");
  const germanCta = await cta.textContent();
  await page.evaluate(() => {
    document.getElementById("languageSelect").value = "en";
    document.getElementById("languageSelect").dispatchEvent(new Event("change", { bubbles: true }));
    document.getElementById("darkModeToggle").checked = true;
    document.getElementById("darkModeToggle").dispatchEvent(new Event("change", { bubbles: true }));
  });
  const english = await page.evaluate(() => ({
    badge: document.querySelector('[data-inventory-risk-segment="slow_dead"] strong')?.textContent.trim() || "",
    cta: document.querySelector("[data-inventory-risk-import-history]")?.textContent.trim() || "",
    dark: document.body.classList.contains("dark") || document.documentElement.dataset.theme === "dark" || getComputedStyle(document.body).colorScheme === "dark"
  }));
  return { viewport, german, germanCta: germanCta?.trim() || "", english };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: viewports[0], reducedMotion: "reduce" });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const externalRequests = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", request => {
    if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
  });

  await page.addInitScript(() => { window.__OBSOLIQ_TEST_MODE__ = true; });
  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__obsoliqTestBridge), null, { timeout: 10000 });
  await page.evaluate(() => window.__obsoliqTestBridge.loadSample());
  await page.locator('[data-process="inventory-risks"]').click();
  const results = [];
  for (const viewport of viewports) results.push(await presentationState(page, viewport));

  const clientBoundary = await page.evaluate(async () => {
    const parsed = window.ObsoliQ.data.sourceModel.buildParsedSourceDataset(
      ["__proto__", "constructor", "Material Number"],
      [["polluted", "safe", "0000123"]]
    );
    const databases = indexedDB?.databases ? await indexedDB.databases() : [];
    const cacheKeys = "caches" in window ? await caches.keys() : [];
    let registrations = [];
    let serviceWorkerInspection = "available";
    try {
      registrations = navigator.serviceWorker?.getRegistrations ? await navigator.serviceWorker.getRegistrations() : [];
    } catch (error) {
      serviceWorkerInspection = error?.name === "InvalidStateError" ? "unavailable_on_file_protocol" : `error:${error?.name || "unknown"}`;
    }
    return {
      localStorageEntries: Object.entries(localStorage),
      sessionStorageEntries: Object.entries(sessionStorage),
      databases: databases.map(item => item.name || ""),
      cacheKeys,
      serviceWorkerCount: registrations.length,
      serviceWorkerInspection,
      prototypePolluted: Object.prototype.polluted !== undefined || ({}).polluted !== undefined,
      parsedMaterial: parsed.rows[0]["Material Number"]
    };
  });

  const failures = [];
  results.forEach(result => {
    if (result.german.badge !== "n. v.") failures.push(`${result.viewport.width}x${result.viewport.height}:german-unavailable-badge`);
    if (!result.germanCta.includes("Verbrauchshistorie importieren")) failures.push(`${result.viewport.width}x${result.viewport.height}:german-history-cta`);
    if (result.english.badge !== "n/a") failures.push(`${result.viewport.width}x${result.viewport.height}:english-unavailable-badge`);
    if (!result.english.cta.includes("Import consumption history")) failures.push(`${result.viewport.width}x${result.viewport.height}:english-history-cta`);
    if (!result.english.dark) failures.push(`${result.viewport.width}x${result.viewport.height}:dark-theme`);
    if (result.german.horizontalOverflow > 2) failures.push(`${result.viewport.width}x${result.viewport.height}:horizontal-overflow`);
  });
  const storagePayloads = [...clientBoundary.localStorageEntries, ...clientBoundary.sessionStorageEntries]
    .map(([, value]) => String(value));
  if (storagePayloads.some(value => /MAT-|Stock Value|Material Number|recovery_potential/i.test(value))) failures.push("browser-storage-business-state");
  if (clientBoundary.databases.length) failures.push("indexeddb-business-state");
  if (clientBoundary.cacheKeys.length) failures.push("cache-storage-business-state");
  if (clientBoundary.serviceWorkerCount) failures.push("service-worker-persistence");
  if (clientBoundary.prototypePolluted) failures.push("prototype-pollution");
  if (clientBoundary.parsedMaterial !== "0000123") failures.push("identifier-text-preservation");
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");
  if (externalRequests.length) failures.push("external-requests");

  console.log(JSON.stringify({
    status: failures.length ? "FAIL" : "PASS",
    url: page.url(),
    viewports: results.map(result => ({
      viewport: result.viewport,
      germanBadge: result.german.badge,
      englishBadge: result.english.badge,
      horizontalOverflow: result.german.horizontalOverflow,
      darkTheme: result.english.dark
    })),
    clientBoundary: {
      localStorageEntryCount: clientBoundary.localStorageEntries.length,
      sessionStorageEntryCount: clientBoundary.sessionStorageEntries.length,
      indexedDbCount: clientBoundary.databases.length,
      cacheStorageCount: clientBoundary.cacheKeys.length,
      serviceWorkerCount: clientBoundary.serviceWorkerCount,
      serviceWorkerInspection: clientBoundary.serviceWorkerInspection,
      prototypePolluted: clientBoundary.prototypePolluted,
      parsedMaterial: clientBoundary.parsedMaterial
    },
    pageErrors,
    consoleErrors,
    externalRequests,
    failures
  }, null, 2));
  await browser.close();
  if (failures.length) process.exit(1);
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
