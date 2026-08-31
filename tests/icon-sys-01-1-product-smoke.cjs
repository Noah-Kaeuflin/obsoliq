const fs = require("fs");
const path = require("path");
const { chromium, productUrl } = require("./smoke-runtime.cjs");

const screenshotDir = path.join(__dirname, "screenshots", "icon-sys-01-1");
const breakpoints = [
  [1536, 864],
  [1440, 900],
  [1366, 768],
  [1200, 800],
  [900, 900],
  [720, 900],
  [390, 844]
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
  const target = path.join(screenshotDir, name);
  await page.screenshot({ path: target, fullPage: false });
  return target;
}

async function surfaceSnapshot(page) {
  return page.evaluate(() => ({
    values: [...document.querySelectorAll(".inventory-risk-kpi-value")].map(node => node.textContent.trim()),
    counts: [...document.querySelectorAll(".inventory-risk-segments strong")].map(node => node.textContent.trim()),
    summaryIcons: [...document.querySelectorAll(".inventory-risk-summary-grid .inventory-risk-kpi-icon > .oq-icon")].map(node => node.dataset.oqIcon),
    financialIcons: [...document.querySelectorAll(".inventory-risk-financial-summary .inventory-risk-kpi-icon > .oq-icon")].map(node => node.dataset.oqIcon)
  }));
}

async function main() {
  fs.mkdirSync(screenshotDir, { recursive: true });
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
  await page.waitForFunction(() => !/^0(?:\s|$)/.test((document.querySelector("#mInventory")?.textContent || "").trim()), null, { timeout: 30000 });
  await page.waitForFunction(() => document.querySelectorAll("#obsoliq-icon-sprite symbol").length === 43);
  await setTheme(page, false);
  await setLanguage(page, "de");
  await openRiskPage(page);

  const baseline = await surfaceSnapshot(page);
  const screenshots = [];
  screenshots.push(await capture(page, "inventory-risks-light-1536x864.png", 1536, 864));
  screenshots.push(await capture(page, "inventory-risks-light-1440x900.png", 1440, 900));
  screenshots.push(await capture(page, "inventory-risks-light-1366x768.png", 1366, 768));
  screenshots.push(await capture(page, "inventory-risks-light-900x900.png", 900, 900));
  screenshots.push(await capture(page, "inventory-risks-light-390x844.png", 390, 844));

  await setTheme(page, true);
  await openRiskPage(page);
  screenshots.push(await capture(page, "inventory-risks-dark-1536x864.png", 1536, 864));
  await setTheme(page, false);
  await openRiskPage(page);

  const search = page.locator("[data-inventory-risk-filter='search']");
  const firstMaterial = (await page.locator(".inventory-risk-material-id").first().textContent())?.trim() || "";
  await search.fill(firstMaterial);
  await page.waitForFunction(material => [...document.querySelectorAll(".inventory-risk-material-id")].every(node => node.textContent.includes(material)), firstMaterial);
  await search.fill("");

  const firstCase = page.locator("[data-inventory-risk-case]").first();
  const selectedCaseId = await firstCase.getAttribute("data-inventory-risk-case");
  await firstCase.locator("[data-purpose='select-case']").click();
  await page.waitForFunction(caseId => document.querySelector(`[data-inventory-risk-case="${CSS.escape(caseId)}"]`)?.classList.contains("selected"), selectedCaseId);

  await page.locator("[data-inventory-risk-segment='blocked_quality']").click();
  await page.waitForSelector("[data-inventory-risk-open-inventory]");
  const detailActions = await page.evaluate(() => ({
    inventory: document.querySelector("[data-inventory-risk-open-inventory] .oq-icon")?.dataset.oqIcon || "",
    actions: document.querySelector("[data-inventory-risk-open-actions] .oq-icon")?.dataset.oqIcon || "",
    actionsText: document.querySelector("[data-inventory-risk-open-actions]")?.textContent.trim() || ""
  }));

  await page.locator("[data-inventory-risk-segment='excess_demand']").click();
  await page.waitForSelector(".inventory-risk-detail .excess-detail-section-nav");
  const excessDetailActions = await page.evaluate(() => ({
    inventory: document.querySelector("[data-open-excess-inventory] .oq-icon")?.dataset.oqIcon || "",
    actions: document.querySelector("[data-open-excess-actions] .oq-icon")?.dataset.oqIcon || "",
    actionsText: document.querySelector("[data-open-excess-actions]")?.textContent.trim() || ""
  }));
  await page.locator(".inventory-risk-detail .excess-detail-section-nav").scrollIntoViewIfNeeded();
  screenshots.push(await capture(page, "inventory-risks-detail-tabs-light-1440x900.png", 1440, 900));

  const detailTabs = await page.evaluate(() => [...document.querySelectorAll(".inventory-risk-detail .excess-detail-section-nav [data-oq-icon]")].map(icon => ({
    id: icon.dataset.oqIcon,
    width: icon.getBoundingClientRect().width,
    height: icon.getBoundingClientRect().height
  })));

  await openRiskPage(page);
  await page.locator("[data-inventory-risk-export]").click();
  await page.waitForSelector("#downloadModal.active");
  await page.locator("#downloadCancelButton").click();

  await setLanguage(page, "en");
  await openRiskPage(page);
  const english = await page.evaluate(() => ({
    title: document.querySelector(".inventory-risk-header-copy h2")?.textContent.trim() || "",
    iconCount: document.querySelectorAll("[data-oq-icon]").length,
    summaryIcons: [...document.querySelectorAll(".inventory-risk-summary-grid [data-oq-icon]")].map(node => node.dataset.oqIcon)
  }));
  await setLanguage(page, "de");
  await openRiskPage(page);
  const afterI18nTheme = await surfaceSnapshot(page);

  const responsive = [];
  for (const [width, height] of breakpoints) {
    await page.setViewportSize({ width, height });
    responsive.push(await page.evaluate(({ width, height }) => {
      const tiles = [...document.querySelectorAll(".inventory-risk-kpi-icon")].map(tile => {
        const rect = tile.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      });
      const cards = [...document.querySelectorAll(".inventory-risk-summary-card")];
      const firstTop = cards[0]?.getBoundingClientRect().top || 0;
      const secondTop = cards[1]?.getBoundingClientRect().top || 0;
      const searchWrap = document.querySelector(".inventory-risk-search-input-wrap");
      const input = searchWrap?.querySelector("input");
      const searchIcon = searchWrap?.querySelector("[data-oq-icon='search']");
      const openCase = document.querySelector("[data-purpose='select-case']");
      const valueClipped = [...document.querySelectorAll(".inventory-risk-kpi-value")].some(value => value.scrollWidth > value.clientWidth + 1);
      return {
        width,
        height,
        expectedTileSize: width <= 620 ? 28 : 30,
        overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
        tiles,
        summaryColumns: Math.abs(firstTop - secondTop) < 2 ? 2 : 1,
        searchPadding: input ? parseFloat(getComputedStyle(input).paddingLeft) : 0,
        searchIconInside: Boolean(searchWrap && searchIcon && searchWrap.contains(searchIcon)),
        openCaseVisible: openCase ? openCase.getBoundingClientRect().width >= 31 : false,
        valueClipped
      };
    }, { width, height }));
  }

  const runtime = await page.evaluate(() => {
    const icons = [...document.querySelectorAll("svg.oq-icon[data-oq-icon]")];
    const navigation = [...document.querySelectorAll(".process-tabs [data-process]")].map(button => {
      const icon = button.querySelector(":scope > .oq-icon");
      const rect = icon?.getBoundingClientRect();
      return { route: button.dataset.process, icon: icon?.dataset.oqIcon || "", width: rect?.width || 0, text: button.textContent.trim() };
    });
    const kpiTiles = [...document.querySelectorAll(".inventory-risk-kpi-icon")].map(tile => ({
      width: tile.getBoundingClientRect().width,
      height: tile.getBoundingClientRect().height,
      icon: tile.querySelector(".oq-icon")?.dataset.oqIcon || "",
      iconPosition: getComputedStyle(tile.querySelector(".oq-icon")).position
    }));
    const openCase = document.querySelector("[data-purpose='select-case']");
    return {
      viewportWidth: innerWidth,
      protocol: location.protocol,
      symbolCount: document.querySelectorAll("#obsoliq-icon-sprite symbol").length,
      spriteCount: document.querySelectorAll("#obsoliq-icon-sprite").length,
      missingSymbols: [...new Set(icons.map(icon => icon.dataset.oqIcon).filter(id => !document.getElementById(`oq-${id}`)))],
      externalUse: icons.some(icon => !String(icon.querySelector("use")?.getAttribute("href") || "").startsWith("#oq-")),
      navigation,
      titleIconCount: document.querySelectorAll(".inventory-risk-header-copy h2 .oq-icon").length,
      segmentIconCount: document.querySelectorAll(".inventory-risk-segments .oq-icon").length,
      searchIconCount: document.querySelectorAll(".inventory-risk-search-input-wrap > [data-oq-icon='search']").length,
      searchLabelIconCount: document.querySelectorAll(".inventory-risk-search > span:first-child .oq-icon").length,
      kpiTiles,
      openCaseIcon: openCase?.querySelector(".oq-icon")?.dataset.oqIcon || "",
      openCaseAria: openCase?.getAttribute("aria-label") || "",
      openCaseTitle: openCase?.getAttribute("title") || ""
    };
  });

  const remoteRequests = requests.filter(url => /^https?:/i.test(url));
  const failures = [];
  if (runtime.protocol !== "file:") failures.push("file-protocol");
  if (runtime.spriteCount !== 1 || runtime.symbolCount !== 43) failures.push("sprite-contract");
  if (runtime.missingSymbols.length || runtime.externalUse) failures.push("icon-reference-contract");
  if (JSON.stringify(baseline.summaryIcons) !== JSON.stringify(["inventory-risks", "prioritized-cases", "owner-coverage", "evidence-readiness"])) failures.push("summary-mapping");
  if (JSON.stringify(baseline.financialIcons) !== JSON.stringify(["recovery-potential", "slow-dead-stock", "blocked-quality"])) failures.push("financial-mapping");
  if (runtime.titleIconCount || runtime.segmentIconCount) failures.push("visual-reduction");
  if (runtime.searchIconCount !== 1 || runtime.searchLabelIconCount) failures.push("search-icon-placement");
  const runtimeTileSize = runtime.viewportWidth <= 620 ? 28 : 30;
  if (runtime.kpiTiles.length !== 7 || runtime.kpiTiles.some(tile => Math.abs(tile.width - runtimeTileSize) > 0.5 || Math.abs(tile.height - runtimeTileSize) > 0.5 || tile.iconPosition === "absolute")) failures.push("kpi-layout");
  if (runtime.openCaseIcon !== "expand" || !runtime.openCaseAria || !runtime.openCaseTitle) failures.push("worklist-chevron-accessibility");
  if (detailActions.inventory !== "inventory-explorer" || detailActions.actions !== "actions" || detailActions.actionsText.includes("→")) failures.push("detail-actions");
  if (excessDetailActions.inventory !== "inventory-explorer" || excessDetailActions.actions !== "actions" || excessDetailActions.actionsText.includes("→")) failures.push("excess-detail-actions");
  if (JSON.stringify(detailTabs.map(tab => tab.id)) !== JSON.stringify(["decision", "value-logic", "history", "prioritization", "action-paths"])) failures.push("detail-tabs");
  if (detailTabs.some(tab => tab.width < 14 || tab.width > 16 || tab.height < 14 || tab.height > 16)) failures.push("detail-tab-sizing");
  if (runtime.navigation.length !== 8 || runtime.navigation.some(item => !item.icon || !item.text || item.width < 15 || item.width > 17)) failures.push("navigation-calibration");
  if (!english.title.includes("Inventory Risks") || JSON.stringify(english.summaryIcons) !== JSON.stringify(baseline.summaryIcons)) failures.push("i18n");
  if (JSON.stringify(afterI18nTheme.values) !== JSON.stringify(baseline.values) || JSON.stringify(afterI18nTheme.counts) !== JSON.stringify(baseline.counts)) failures.push("semantic-value-drift");
  if (responsive.some(item => item.overflow > 2 || item.tiles.some(tile => Math.abs(tile.width - item.expectedTileSize) > 0.5 || Math.abs(tile.height - item.expectedTileSize) > 0.5) || !item.searchIconInside || item.searchPadding < 34 || !item.openCaseVisible || item.valueClipped)) failures.push("responsive-layout");
  if (responsive.find(item => item.width === 900)?.summaryColumns !== 2 || responsive.find(item => item.width === 390)?.summaryColumns !== 2) failures.push("responsive-grid");
  if (remoteRequests.length) failures.push("remote-requests");
  if (failedRequests.length) failures.push("failed-requests");
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");

  console.log(JSON.stringify({
    status: failures.length ? "failed" : "passed",
    url: productUrl,
    baseline,
    afterI18nTheme,
    runtime,
    detailActions,
    excessDetailActions,
    detailTabs,
    responsive,
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
