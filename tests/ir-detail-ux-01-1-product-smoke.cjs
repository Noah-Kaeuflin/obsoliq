const { chromium, productUrl, captureScreenshot, screenshotName } = require("./smoke-runtime.cjs");

const screenshotDir = "screenshots/ir-detail-ux-01-1";
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
  await page.locator("#sampleButton").click();
  await page.waitForFunction(() => document.querySelector("#actionFeedback .action-feedback-text")?.textContent.trim() === "Daten geladen", null, { timeout: 30000 });
  await openEmbeddedExcess(page);

  const responsive = [];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await setPresentation(page, viewport.language, viewport.dark);
    await page.waitForSelector('.inventory-risk-detail[data-inventory-risk-detail-family="excess_demand"] [data-excess-decision-surface]');
    await page.locator('.inventory-risk-detail [data-excess-detail-target="decision"]').click();
    await page.waitForTimeout(50);
    const result = await page.evaluate(viewportName => {
      const surface = document.querySelector('.inventory-risk-detail [data-excess-decision-surface]');
      const grid = surface.querySelector(".excess-primary-decision-grid");
      const next = grid.querySelector(".next-step").getBoundingClientRect();
      const readiness = grid.querySelector(".excess-readiness-card").getBoundingClientRect();
      const gridRect = grid.getBoundingClientRect();
      const tabs = [...surface.querySelectorAll('[role="tab"]')];
      const panels = [...surface.querySelectorAll('[role="tabpanel"]')];
      const visible = panels.filter(panel => !panel.hidden);
      const markerStyle = getComputedStyle(surface.querySelector(".excess-readiness-marker"));
      const pillStyle = getComputedStyle(surface.querySelector(".excess-readiness-pill"));
      return {
        viewportName,
        language: document.documentElement.lang,
        theme: document.documentElement.dataset.theme || "light",
        bodyOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
        surfaceOverflow: surface.scrollWidth - surface.clientWidth,
        surfaceWidth: Math.round(surface.getBoundingClientRect().width),
        tabCount: tabs.length,
        panelCount: panels.length,
        visiblePanelCount: visible.length,
        selectedTab: tabs.find(tab => tab.getAttribute("aria-selected") === "true")?.dataset.excessDetailTarget || "",
        nextFullWidth: Math.abs(next.width - gridRect.width) < 3,
        readinessFullWidth: Math.abs(readiness.width - gridRect.width) < 3,
        independentRows: Math.abs(next.top - readiness.top) > 4,
        markerWidth: parseFloat(markerStyle.width),
        pillDisplay: pillStyle.display,
        scrollOwner: getComputedStyle(surface.querySelector(".excess-detail-scroll")).overflowY,
        outerOverflow: getComputedStyle(surface.closest(".inventory-risk-detail")).overflowY
      };
    }, viewport.name);
    responsive.push(result);
    await captureScreenshot(page, screenshotName("ir-detail-ux-01-1", `${viewport.name}-${viewport.width}x${viewport.height}.png`), { fullPage: false });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await setPresentation(page, "de", false);
  await page.locator('.inventory-risk-detail [data-excess-detail-target="prioritization"]').click();
  await page.waitForTimeout(50);
  const prioritization = await page.evaluate(async () => {
    const surface = document.querySelector('.inventory-risk-detail [data-excess-decision-surface]');
    const grid = surface.querySelector(".excess-decision-basis-grid");
    const context = surface.querySelector("dl.excess-operational-context");
    const scoreTracks = [...surface.querySelectorAll(".excess-score-track")];
    surface.style.width = "650px";
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const columnsAt650 = getComputedStyle(grid).gridTemplateColumns;
    surface.style.width = "820px";
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const columnsAt820 = getComputedStyle(grid).gridTemplateColumns;
    surface.style.removeProperty("width");
    return {
      semanticContext: context?.tagName === "DL" && context.children.length === 4,
      legacySeparators: context?.querySelectorAll("b, i").length || 0,
      scoreTrackCount: scoreTracks.length,
      scoreTracksStyled: scoreTracks.every(track => getComputedStyle(track).overflow === "hidden" && getComputedStyle(track.querySelector("i")).display === "block"),
      columnsAt650: columnsAt650.split(" ").filter(Boolean).length,
      columnsAt820: columnsAt820.split(" ").filter(Boolean).length
    };
  });
  await captureScreenshot(page, screenshotName("ir-detail-ux-01-1", "embedded-prioritization-light-de-1440x900.png"), { fullPage: false });

  await page.locator('.inventory-risk-detail [data-excess-detail-target="history"]').click();
  await page.waitForTimeout(50);
  const history = await page.evaluate(() => {
    const state = document.querySelector('.inventory-risk-detail .excess-historical-state');
    return {
      status: state?.dataset.historyState || "",
      metricRows: state?.querySelectorAll(".excess-history-primary-metrics > div").length || 0,
      cta: state?.querySelector("[data-data-foundation-import-consumption-history]")?.textContent.trim() || ""
    };
  });
  await captureScreenshot(page, screenshotName("ir-detail-ux-01-1", "embedded-history-empty-light-de-1440x900.png"), { fullPage: false });

  const externalRequests = requests.filter(url => /^https?:/i.test(url));
  const failures = [];
  responsive.forEach(result => {
    if (result.bodyOverflow > 2) failures.push(`${result.viewportName}:body-horizontal-overflow`);
    if (result.surfaceOverflow > 2) failures.push(`${result.viewportName}:surface-horizontal-overflow`);
    if (result.tabCount !== 5 || result.panelCount !== 5 || result.visiblePanelCount !== 1 || result.selectedTab !== "decision") failures.push(`${result.viewportName}:tab-contract`);
    if (!result.nextFullWidth || !result.readinessFullWidth || !result.independentRows) failures.push(`${result.viewportName}:decision-rhythm`);
    if (result.markerWidth < 11 || !result.pillDisplay.includes("flex")) failures.push(`${result.viewportName}:shared-readiness-style`);
    if (result.scrollOwner !== "auto" || result.outerOverflow !== "hidden") failures.push(`${result.viewportName}:scroll-ownership`);
    if (result.language !== (result.viewportName.endsWith("-en") ? "en" : "de")) failures.push(`${result.viewportName}:language`);
    if ((result.theme === "dark") !== result.viewportName.includes("dark")) failures.push(`${result.viewportName}:theme`);
  });
  if (!prioritization.semanticContext || prioritization.legacySeparators) failures.push("semantic-operational-context");
  if (!prioritization.scoreTrackCount || !prioritization.scoreTracksStyled) failures.push("shared-score-tracks");
  if (prioritization.columnsAt650 !== 1 || prioritization.columnsAt820 !== 2) failures.push("prioritization-breakpoint");
  if (!["available", "limited"].includes(history.status) || history.metricRows !== 4 || history.cta) failures.push("history-evidence-state");
  if (externalRequests.length) failures.push("external-requests");
  if (failedRequests.length) failures.push("failed-requests");
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");

  console.log(JSON.stringify({
    status: failures.length ? "failed" : "passed",
    url: page.url(),
    responsive,
    prioritization,
    history,
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
