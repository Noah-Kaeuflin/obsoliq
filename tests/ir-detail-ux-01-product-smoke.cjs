const fs = require("fs");
const path = require("path");
const { chromium, productUrl } = require("./smoke-runtime.cjs");

const screenshotDir = path.join(__dirname, "screenshots", "ir-detail-ux-01");
const viewports = [
  { name: "desktop-light-de", width: 1440, height: 900, language: "de", dark: false },
  { name: "laptop-light-de", width: 1200, height: 800, language: "de", dark: false },
  { name: "compact-light-de", width: 900, height: 900, language: "de", dark: false },
  { name: "tablet-light-de", width: 720, height: 900, language: "de", dark: false },
  { name: "mobile-light-de", width: 390, height: 844, language: "de", dark: false },
  { name: "desktop-dark-en", width: 1440, height: 900, language: "en", dark: true }
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

async function openEmbeddedExcess(page) {
  await page.locator('[data-process="inventory-risks"]').click();
  await page.waitForSelector("#view-inventory-risks.active");
  await page.locator('[data-inventory-risk-segment="excess_demand"]').click();
  await page.waitForSelector('.inventory-risk-detail[data-inventory-risk-detail-family="excess_demand"] [data-excess-decision-surface]');
}

async function main() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: viewports[0], reducedMotion: "reduce" });
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
  await page.waitForFunction(() => !/^0(?:\s|$)/.test((document.querySelector("#mInventory")?.textContent || "").trim()), null, { timeout: 30000 });
  await openEmbeddedExcess(page);

  const responsive = [];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await setPresentation(page, viewport.language, viewport.dark);
    await page.waitForSelector('.inventory-risk-detail[data-inventory-risk-detail-family="excess_demand"] [data-excess-decision-surface]');
    await page.locator('.inventory-risk-detail[data-inventory-risk-detail-family="excess_demand"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(40);
    const result = await page.evaluate(viewportName => {
      const surface = document.querySelector('.inventory-risk-detail[data-inventory-risk-detail-family="excess_demand"] [data-excess-decision-surface]');
      const tabs = [...surface.querySelectorAll('[role="tab"]')];
      const panels = [...surface.querySelectorAll('[role="tabpanel"]')];
      const visible = panels.filter(panel => !panel.hidden);
      const decisionCopy = [...surface.querySelectorAll("[data-decision-narrative-grid] p, [data-decision-narrative-grid] li, [data-decision-narrative-grid] small")];
      const grid = surface.querySelector(".excess-primary-decision-grid");
      const detail = surface.closest(".inventory-risk-detail");
      return {
        viewportName,
        language: document.documentElement.lang,
        theme: document.documentElement.dataset.theme || "light",
        bodyOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
        surfaceWidth: Math.round(surface.getBoundingClientRect().width),
        surfaceOverflow: surface.scrollWidth - surface.clientWidth,
        containerType: getComputedStyle(surface).containerType,
        containerName: getComputedStyle(surface).containerName,
        tabCount: tabs.length,
        panelCount: panels.length,
        visiblePanelCount: visible.length,
        visiblePanel: visible[0]?.dataset.excessDetailSection || "",
        selectedTab: tabs.find(tab => tab.getAttribute("aria-selected") === "true")?.dataset.excessDetailTarget || "",
        anchors: surface.querySelectorAll("[data-excess-section-anchor]").length,
        currentLocations: surface.querySelectorAll('[aria-current="location"]').length,
        scrollOwner: getComputedStyle(surface.querySelector(".excess-detail-scroll")).overflowY,
        outerScroll: getComputedStyle(detail).overflowY,
        decisionColumns: getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length,
        minimumDecisionCopy: Math.min(...decisionCopy.map(node => parseFloat(getComputedStyle(node).fontSize)))
      };
    }, viewport.name);
    responsive.push(result);
    await page.screenshot({ path: path.join(screenshotDir, `${viewport.name}-${viewport.width}x${viewport.height}.png`), fullPage: false });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await setPresentation(page, "de", false);
  const tabChecks = [];
  for (const key of ["decision", "value", "history", "prioritization", "actions"]) {
    await page.locator(`.inventory-risk-detail [data-excess-detail-target="${key}"]`).click();
    const result = await page.evaluate(key => {
      const surface = document.querySelector('.inventory-risk-detail [data-excess-decision-surface]');
      const visible = [...surface.querySelectorAll('[role="tabpanel"]')].filter(panel => !panel.hidden);
      return {
        key,
        selected: surface.querySelector('[role="tab"][aria-selected="true"]')?.dataset.excessDetailTarget || "",
        visibleCount: visible.length,
        visible: visible[0]?.dataset.excessDetailSection || "",
        panelHorizontalOverflow: visible[0] ? visible[0].scrollWidth - visible[0].clientWidth : -1
      };
    }, key);
    tabChecks.push(result);
  }
  await page.screenshot({ path: path.join(screenshotDir, "embedded-actions-light-de-1440x900.png"), fullPage: false });

  const preserved = await page.evaluate(() => {
    const surface = document.querySelector('.inventory-risk-detail [data-excess-decision-surface]');
    return {
      valueBridge: Boolean(surface.querySelector("[data-value-bridge]")),
      history: Boolean(surface.querySelector(".excess-historical-state")),
      score: Boolean(surface.querySelector(".excess-score-list")),
      actionOptions: surface.querySelectorAll(".excess-action-option").length,
      disclosures: surface.querySelectorAll(".excess-detail-disclosure").length,
      inventoryAction: Boolean(surface.querySelector("[data-open-excess-inventory]")),
      actionHandoff: Boolean(surface.querySelector("[data-open-excess-actions]"))
    };
  });

  const externalRequests = requests.filter(url => /^https?:/i.test(url));
  const failures = [];
  responsive.forEach(result => {
    if (result.bodyOverflow > 2) failures.push(`${result.viewportName}:body-horizontal-overflow`);
    if (result.surfaceOverflow > 2) failures.push(`${result.viewportName}:surface-horizontal-overflow`);
    if (result.tabCount !== 5 || result.panelCount !== 5) failures.push(`${result.viewportName}:tab-contract`);
    if (result.visiblePanelCount !== 1 || result.visiblePanel !== result.selectedTab) failures.push(`${result.viewportName}:visible-panel-contract`);
    if (result.anchors || result.currentLocations) failures.push(`${result.viewportName}:legacy-navigation-contract`);
    if (result.containerType !== "inline-size" || !/excess-decision/.test(result.containerName)) failures.push(`${result.viewportName}:container-contract`);
    if (result.scrollOwner !== "auto" || result.outerScroll !== "hidden") failures.push(`${result.viewportName}:scroll-ownership`);
    if (result.minimumDecisionCopy < 12) failures.push(`${result.viewportName}:typography`);
    if (result.language !== (result.viewportName.endsWith("-en") ? "en" : "de")) failures.push(`${result.viewportName}:language`);
    if ((result.theme === "dark") !== result.viewportName.includes("dark")) failures.push(`${result.viewportName}:theme`);
  });
  tabChecks.forEach(result => {
    if (result.selected !== result.key || result.visible !== result.key || result.visibleCount !== 1) failures.push(`${result.key}:activation`);
    if (result.panelHorizontalOverflow > 2) failures.push(`${result.key}:horizontal-overflow`);
  });
  if (!preserved.valueBridge || !preserved.history || !preserved.score || !preserved.actionOptions || preserved.disclosures !== 6) failures.push("accepted-detail-content-missing");
  if (!preserved.inventoryAction || !preserved.actionHandoff) failures.push("case-handoffs-missing");
  if (externalRequests.length) failures.push("external-requests");
  if (failedRequests.length) failures.push("failed-requests");
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");

  console.log(JSON.stringify({
    status: failures.length ? "failed" : "passed",
    url: page.url(),
    responsive,
    tabChecks,
    preserved,
    pageErrors,
    consoleErrors,
    externalRequests,
    failedRequests,
    screenshots: screenshotDir,
    failures
  }, null, 2));
  await browser.close();
  if (failures.length) process.exit(1);
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
