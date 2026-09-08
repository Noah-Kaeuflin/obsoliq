const fs = require("fs");
const path = require("path");
const { chromium, productUrl, captureScreenshot, screenshotName } = require("./smoke-runtime.cjs");

const screenshotDir = "screenshots/icon-sys-01-2";
const manifestPath = path.join(__dirname, "..", "assets", "icons", "icon-manifest.json");
const expectedIcons = [
  "inventory-risks",
  "prioritized-cases",
  "owner-coverage",
  "evidence-readiness",
  "recovery-potential",
  "slow-dead-stock",
  "blocked-quality"
];
const breakpoints = [
  { width: 1536, height: 864, tile: 30, icon: 17, label: 10.5, value: 20, financialValue: 21, meta: 9.5, topHeight: 72, financialHeight: 72, topColumns: 4, financialColumns: 3 },
  { width: 1440, height: 900, tile: 30, icon: 17, label: 10.5, value: 20, financialValue: 21, meta: 9.5, topHeight: 72, financialHeight: 72, topColumns: 4, financialColumns: 3 },
  { width: 1366, height: 768, tile: 30, icon: 17, label: 10.5, value: 20, financialValue: 21, meta: 9.5, topHeight: 72, financialHeight: 72, topColumns: 4, financialColumns: 3 },
  { width: 1200, height: 800, tile: 30, icon: 17, label: 10.5, value: 19, financialValue: 20, meta: 9.5, topHeight: 70, financialHeight: 70, topColumns: 4, financialColumns: 3 },
  { width: 900, height: 900, tile: 30, icon: 17, label: 10.5, value: 19, financialValue: 20, meta: 9.5, topHeight: 70, financialHeight: 70, topColumns: 2, financialColumns: 2 },
  { width: 720, height: 900, tile: 30, icon: 17, label: 10.5, value: 19, financialValue: 20, meta: 9.5, topHeight: 70, financialHeight: 70, topColumns: 2, financialColumns: 2 },
  { width: 390, height: 844, tile: 28, icon: 16, label: 10, value: 19, financialValue: 20, meta: 9.5, topHeight: 68, financialHeight: 68, topColumns: 2, financialColumns: 2 }
];

async function setTheme(page, dark) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("[data-process='settings']").click();
  await page.waitForSelector("#settingsModal.active");
  await page.locator("#darkModeToggle").setChecked(dark, { force: true });
  await page.locator("#settingsDoneButton").click();
  await page.waitForFunction(expected => document.documentElement.dataset.theme === expected, dark ? "dark" : "light");
}

async function setLanguage(page, language) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("[data-process='settings']").click();
  await page.waitForSelector("#settingsModal.active");
  await page.locator("#languageSelect").selectOption(language);
  await page.locator("#settingsDoneButton").click();
}

async function openRiskPage(page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("[data-process='inventory-risks']").click();
  await page.waitForSelector("#view-inventory-risks.active .inventory-risk-summary-card");
  await page.locator("[data-inventory-risk-segment='all']").click();
  await page.waitForSelector("[data-inventory-risk-segment='all'][aria-selected='true']");
}

async function capture(page, name, width, height) {
  await page.setViewportSize({ width, height });
  const target = screenshotName("icon-sys-01-2", name);
  await captureScreenshot(page, target, { fullPage: false });
  return target;
}

async function semanticSnapshot(page) {
  return page.evaluate(() => ({
    counts: [...document.querySelectorAll(".inventory-risk-segments strong")].map(node => node.textContent.trim()),
    values: [...document.querySelectorAll(".inventory-risk-kpi-value")].map(node => node.textContent.trim()),
    icons: [...document.querySelectorAll(".inventory-risk-kpi-icon > .oq-icon")].map(node => node.dataset.oqIcon),
    worklistCaseIds: [...document.querySelectorAll("[data-inventory-risk-case]")].map(node => node.dataset.inventoryRiskCase)
  }));
}

async function measure(page, expected) {
  await page.setViewportSize({ width: expected.width, height: expected.height });
  return page.evaluate(expectedSizes => {
    const topCards = [...document.querySelectorAll(".inventory-risk-summary-card")];
    const financialCards = [...document.querySelectorAll(".inventory-risk-financial-card")];
    const cards = [...topCards, ...financialCards];
    const tiles = cards.map(card => {
      const tile = card.querySelector(".inventory-risk-kpi-icon");
      const icon = tile.querySelector(".oq-icon");
      const tileRect = tile.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();
      return { tileWidth: tileRect.width, tileHeight: tileRect.height, iconWidth: iconRect.width, iconHeight: iconRect.height };
    });
    const contentIntegrity = cards.map(card => {
      const cardRect = card.getBoundingClientRect();
      const tileRect = card.querySelector(".inventory-risk-kpi-icon").getBoundingClientRect();
      const label = card.querySelector(".inventory-risk-kpi-label");
      const labelRect = label.getBoundingClientRect();
      const value = card.querySelector(".inventory-risk-kpi-value");
      const meta = card.querySelector(".inventory-risk-kpi-meta");
      const metaRect = meta?.getBoundingClientRect();
      return {
        labelFont: parseFloat(getComputedStyle(label).fontSize),
        valueFont: parseFloat(getComputedStyle(value).fontSize),
        labelOverlap: labelRect.left < tileRect.right - 0.5,
        valueClipped: value.scrollWidth > value.clientWidth + 1,
        metaFont: meta ? parseFloat(getComputedStyle(meta).fontSize) : null,
        metaOverflow: Boolean(metaRect && (metaRect.right > cardRect.right + 1 || metaRect.bottom > cardRect.bottom + 1))
      };
    });
    const topGrid = getComputedStyle(document.querySelector(".inventory-risk-summary-grid")).gridTemplateColumns.split(" ").filter(Boolean).length;
    const financialGrid = getComputedStyle(document.querySelector(".inventory-risk-financial-summary")).gridTemplateColumns.split(" ").filter(Boolean).length;
    const worklistRect = document.querySelector(".inventory-risk-worklist")?.getBoundingClientRect();
    return {
      ...expectedSizes,
      bodyOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
      tiles,
      contentIntegrity,
      topHeights: topCards.map(card => card.getBoundingClientRect().height),
      financialHeights: financialCards.map(card => card.getBoundingClientRect().height),
      topGrid,
      financialGrid,
      financialFonts: financialCards.map(card => parseFloat(getComputedStyle(card.querySelector(".inventory-risk-kpi-value")).fontSize)),
      guardFont: parseFloat(getComputedStyle(document.querySelector(".inventory-risk-summary-group.financial .inventory-risk-summary-group-head span")).fontSize),
      worklistVisible: Boolean(worklistRect && worklistRect.height > 100 && worklistRect.top < innerHeight)
    };
  }, expected);
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const requests = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("request", request => requests.push(request.url()));
  page.on("requestfailed", request => failedRequests.push(`${request.url()} :: ${request.failure()?.errorText || "failed"}`));

  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#sampleButton").click();
  await page.waitForFunction(() => document.querySelector("#actionFeedback .action-feedback-text")?.textContent.trim() === "Daten geladen", null, { timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll("#obsoliq-icon-sprite symbol").length === 43);
  await setTheme(page, false);
  await setLanguage(page, "de");
  await openRiskPage(page);

  const baseline = await semanticSnapshot(page);
  const measurements = [];
  const screenshots = [];
  for (const breakpoint of breakpoints) {
    measurements.push(await measure(page, breakpoint));
    if (breakpoint.width === 390) {
      await page.locator(".inventory-risk-summary").scrollIntoViewIfNeeded();
    } else {
      await page.evaluate(() => scrollTo(0, 0));
    }
    if (breakpoint.width !== 720) {
      screenshots.push(await capture(page, `inventory-risks-light-${breakpoint.width}x${breakpoint.height}.png`, breakpoint.width, breakpoint.height));
    }
  }

  await setTheme(page, true);
  await openRiskPage(page);
  screenshots.push(await capture(page, "inventory-risks-dark-1536x864.png", 1536, 864));
  const darkSnapshot = await semanticSnapshot(page);
  await setTheme(page, false);
  await openRiskPage(page);

  const firstMaterial = (await page.locator(".inventory-risk-material-id").first().textContent())?.trim() || "";
  const search = page.locator("[data-inventory-risk-filter='search']");
  await search.fill(firstMaterial);
  await page.waitForFunction(material => [...document.querySelectorAll(".inventory-risk-material-id")].every(node => node.textContent.includes(material)), firstMaterial);
  await search.fill("");

  const firstCase = page.locator("[data-inventory-risk-case]").first();
  const selectedCaseId = await firstCase.getAttribute("data-inventory-risk-case");
  await firstCase.locator("[data-purpose='select-case']").click();
  await page.waitForFunction(caseId => document.querySelector(`[data-inventory-risk-case="${CSS.escape(caseId)}"]`)?.classList.contains("selected"), selectedCaseId);

  await page.locator("[data-inventory-risk-export]").click();
  await page.waitForSelector("#downloadModal.active");
  await page.locator("#downloadCancelButton").click();

  await setLanguage(page, "en");
  await openRiskPage(page);
  const english = await page.evaluate(() => ({
    title: document.querySelector(".inventory-risk-header-copy h2")?.textContent.trim() || "",
    kpiSvgCount: document.querySelectorAll(".inventory-risk-kpi-icon > .oq-icon").length
  }));
  await setLanguage(page, "de");
  await openRiskPage(page);
  const finalSnapshot = await semanticSnapshot(page);

  const remoteRequests = requests.filter(url => /^https?:/i.test(url));
  const failures = [];
  const close = (actual, expected, tolerance = 0.6) => Math.abs(actual - expected) <= tolerance;

  if (manifest.length !== 43 || new Set(manifest.map(entry => entry.id)).size !== 43) failures.push("manifest-count");
  if (baseline.icons.join("|") !== expectedIcons.join("|") || finalSnapshot.icons.join("|") !== expectedIcons.join("|")) failures.push("semantic-icons");
  for (const result of measurements) {
    if (result.bodyOverflow > 2) failures.push(`body-overflow-${result.width}`);
    if (result.tiles.length !== 7 || result.tiles.some(item => !close(item.tileWidth, result.tile) || !close(item.tileHeight, result.tile) || !close(item.iconWidth, result.icon) || !close(item.iconHeight, result.icon))) failures.push(`icon-scale-${result.width}`);
    if (result.contentIntegrity.some(item => item.labelFont + 0.01 < result.label || item.valueFont + 0.01 < result.value || item.labelOverlap || item.valueClipped || item.metaOverflow || (item.metaFont !== null && item.metaFont + 0.01 < result.meta))) failures.push(`content-integrity-${result.width}`);
    if (result.financialFonts.some(font => font + 0.01 < result.financialValue)) failures.push(`financial-font-${result.width}`);
    if (result.topHeights.some(height => height + 0.5 < result.topHeight) || result.financialHeights.some(height => height + 0.5 < result.financialHeight)) failures.push(`card-height-${result.width}`);
    if (result.topGrid !== result.topColumns || result.financialGrid !== result.financialColumns) failures.push(`grid-${result.width}`);
    if (result.guardFont + 0.01 < 9.5) failures.push(`guard-font-${result.width}`);
  }
  if (!measurements.find(result => result.width === 1366)?.worklistVisible) failures.push("worklist-1366");
  if (JSON.stringify(finalSnapshot.counts) !== JSON.stringify(baseline.counts) || JSON.stringify(darkSnapshot.counts) !== JSON.stringify(baseline.counts)) failures.push("count-drift");
  if (JSON.stringify(finalSnapshot.values) !== JSON.stringify(baseline.values) || JSON.stringify(darkSnapshot.values) !== JSON.stringify(baseline.values)) failures.push("value-drift");
  if (JSON.stringify(finalSnapshot.worklistCaseIds) !== JSON.stringify(baseline.worklistCaseIds)) failures.push("worklist-drift");
  if (!english.title.includes("Inventory Risks") || english.kpiSvgCount !== 7) failures.push("i18n");
  if (!productUrl.startsWith("file:")) failures.push("file-protocol");
  if (remoteRequests.length) failures.push("remote-requests");
  if (failedRequests.length) failures.push("failed-requests");
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");

  console.log(JSON.stringify({
    status: failures.length ? "failed" : "passed",
    url: productUrl,
    manifestCount: manifest.length,
    spriteCount: await page.locator("#obsoliq-icon-sprite symbol").count(),
    baseline,
    finalSnapshot,
    measurements,
    interactions: { search: true, caseSelection: true, exportModal: true, language: true, lightTheme: true, darkTheme: true },
    screenshots,
    remoteRequests,
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
