const { chromium, productUrl, captureScreenshot, screenshotName } = require("./smoke-runtime.cjs");

const screenshotDir = "screenshots/ir-workspace-ux-02";

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
  await page.waitForTimeout(100);
}

async function inventoryRiskMetrics(page, viewport) {
  return page.evaluate(({ width, height }) => {
    const pageRoot = document.getElementById("inventoryRisksPage");
    const workspace = pageRoot.querySelector(".inventory-risk-workspace");
    const worklistPanel = pageRoot.querySelector(".inventory-risk-worklist");
    const detailPanel = pageRoot.querySelector(".inventory-risk-detail");
    const worklistScroll = pageRoot.querySelector(".inventory-risk-table-wrap");
    const detailScroll = detailPanel.querySelector(".excess-detail-scroll") || detailPanel;
    const worklistRect = worklistScroll.getBoundingClientRect();
    const fullyVisibleRows = [...worklistScroll.querySelectorAll("tbody tr")].filter(row => {
      const rect = row.getBoundingClientRect();
      return rect.top >= worklistRect.top - 1 && rect.bottom <= worklistRect.bottom + 1;
    }).length;
    const simultaneousSelectors = [".excess-case-head", ".excess-inline-stats", ".excess-detail-section-nav", ".excess-primary-decision.next-step"];
    const detailRect = detailPanel.getBoundingClientRect();
    const simultaneousVisible = simultaneousSelectors.every(selector => {
      const element = detailPanel.querySelector(selector);
      const rect = element?.getBoundingClientRect();
      return Boolean(rect && rect.top >= detailRect.top - 1 && rect.bottom <= detailRect.bottom + 1);
    });
    const worklistPanelRect = worklistPanel.getBoundingClientRect();
    const detailPanelRect = detailPanel.getBoundingClientRect();
    const visibleText = pageRoot.innerText;
    return {
      width,
      height,
      workspaceTop: workspace.getBoundingClientRect().top,
      workspaceHeight: workspace.getBoundingClientRect().height,
      horizontalOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
      bodyHeightOverflow: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - innerHeight,
      stacked: detailPanelRect.top >= worklistPanelRect.bottom - 2,
      paneHeightDifference: Math.abs(worklistPanelRect.height - detailPanelRect.height),
      fullyVisibleRows,
      simultaneousVisible,
      worklistOverflowY: getComputedStyle(worklistScroll).overflowY,
      detailOverflowY: getComputedStyle(detailScroll).overflowY,
      worklistPanelOverflowY: getComputedStyle(worklistPanel).overflowY,
      detailPanelOverflowY: getComputedStyle(detailPanel).overflowY,
      summaryGroups: pageRoot.querySelectorAll(".inventory-risk-summary-group").length,
      operationalCards: pageRoot.querySelectorAll(".inventory-risk-summary-card").length,
      financialCards: pageRoot.querySelectorAll(".inventory-risk-financial-card").length,
      primaryFilters: pageRoot.querySelectorAll(":scope .inventory-risk-controls > label [data-inventory-risk-filter]").length,
      advancedFilters: pageRoot.querySelectorAll(".inventory-risk-more-filters [data-inventory-risk-filter]").length,
      advancedOpen: pageRoot.querySelector(".inventory-risk-more-filters")?.open === true,
      resetDisabled: pageRoot.querySelector("[data-inventory-risk-reset]")?.disabled === true,
      visibleText,
      readinessMirror: pageRoot.querySelector(".excess-next-step-readiness")?.textContent.trim() || "",
      readinessFull: pageRoot.querySelector(".excess-readiness-card .excess-readiness-pill")?.textContent.trim() || "",
      tabCount: pageRoot.querySelectorAll('[role="tab"][data-excess-detail-target]').length,
      panelCount: pageRoot.querySelectorAll('[role="tabpanel"][data-excess-detail-section]').length,
      visiblePanelCount: pageRoot.querySelectorAll('[role="tabpanel"][data-excess-detail-section]:not([hidden])').length
    };
  }, viewport);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  const externalRequests = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("request", request => { if (/^https?:/i.test(request.url())) externalRequests.push(request.url()); });
  page.on("requestfailed", request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || "" }));

  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.locator("#sampleButton").click();
  await page.waitForFunction(() => document.querySelector("#actionFeedback .action-feedback-text")?.textContent.trim() === "Daten geladen", null, { timeout: 30000 });
  await page.locator('[data-process="inventory-risks"]').click();
  await page.waitForSelector("#view-inventory-risks.active .inventory-risk-workspace", { timeout: 15000 });
  await page.locator('[data-inventory-risk-segment="excess_demand"]').click();
  await page.waitForSelector('.inventory-risk-detail[data-inventory-risk-detail-family="excess_demand"] .excess-decision-surface', { timeout: 15000 });

  const results = [];
  const presentations = [
    { name: "desktop-light-de", width: 1440, height: 900, language: "de", dark: false },
    { name: "desktop-dark-de", width: 1440, height: 900, language: "de", dark: true },
    { name: "desktop-light-en", width: 1440, height: 900, language: "en", dark: false },
    { name: "laptop-light-de", width: 1366, height: 768, language: "de", dark: false },
    { name: "mobile-light-de", width: 390, height: 844, language: "de", dark: false }
  ];

  for (const presentation of presentations) {
    await page.setViewportSize({ width: presentation.width, height: presentation.height });
    await setPresentation(page, presentation.language, presentation.dark);
    const metrics = await inventoryRiskMetrics(page, presentation);
    results.push({ ...presentation, ...metrics });
    await captureScreenshot(page, screenshotName("ir-workspace-ux-02", `${presentation.name}-${presentation.width}x${presentation.height}.png`), { fullPage: false });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await setPresentation(page, "de", false);
  const disclosure = page.locator(".inventory-risk-more-filters");
  await disclosure.locator("summary").click();
  const owner = disclosure.locator('[data-inventory-risk-filter="owner"]');
  const ownerValue = await owner.locator("option").evaluateAll(options => options.find(option => option.value !== "all")?.value || "");
  await owner.selectOption(ownerValue);
  await page.waitForTimeout(80);
  const advancedInteraction = await page.evaluate(expectedOwner => ({
    open: document.querySelector(".inventory-risk-more-filters")?.open === true,
    badge: document.querySelector(".inventory-risk-more-filters summary strong")?.textContent.trim() || "",
    owner: document.querySelector('[data-inventory-risk-filter="owner"]')?.value || "",
    resetDisabled: document.querySelector("[data-inventory-risk-reset]")?.disabled === true
  }), ownerValue);
  await page.locator("[data-inventory-risk-reset]").click();
  await page.waitForTimeout(80);
  const resetInteraction = await page.evaluate(() => ({
    open: document.querySelector(".inventory-risk-more-filters")?.open === true,
    resetDisabled: document.querySelector("[data-inventory-risk-reset]")?.disabled === true,
    activeValues: [...document.querySelectorAll("[data-inventory-risk-filter]")].filter(control => control.type === "search" ? control.value.trim() : control.value !== "all").length
  }));

  const desktopGerman = results.find(result => result.name === "desktop-light-de");
  const desktopEnglish = results.find(result => result.name === "desktop-light-en");
  const failures = [];
  results.forEach(result => {
    if (result.horizontalOverflow > 2) failures.push(`${result.name}:horizontal-overflow`);
    if (result.summaryGroups !== 2 || result.operationalCards !== 4 || result.financialCards !== 3) failures.push(`${result.name}:summary-groups`);
    if (result.primaryFilters !== 3 || result.advancedFilters !== 4 || result.advancedOpen || !result.resetDisabled) failures.push(`${result.name}:filter-density`);
    if (result.worklistOverflowY !== "auto" || result.detailOverflowY !== "auto" || result.worklistPanelOverflowY !== "hidden" || result.detailPanelOverflowY !== "hidden") failures.push(`${result.name}:scroll-ownership`);
    if (result.width > 1240 && (result.stacked || result.paneHeightDifference > 2)) failures.push(`${result.name}:wide-pane-layout`);
    if (result.width <= 1240 && !result.stacked) failures.push(`${result.name}:responsive-stack`);
    if (result.tabCount !== 5 || result.panelCount !== 5 || result.visiblePanelCount !== 1) failures.push(`${result.name}:tab-contract`);
    if (!result.readinessMirror || result.readinessMirror !== result.readinessFull) failures.push(`${result.name}:readiness-mirror`);
  });
  if (desktopGerman.workspaceTop < 430 || desktopGerman.workspaceTop > 470) failures.push("desktop-light-de:workspace-start");
  if (desktopGerman.fullyVisibleRows < 6) failures.push("desktop-light-de:visible-worklist-cases");
  if (!desktopGerman.simultaneousVisible) failures.push("desktop-light-de:decision-focus");
  if (desktopGerman.bodyHeightOverflow > 2) failures.push("desktop-light-de:body-height-overflow");
  ["Bestandsrisiken", "Risikofälle exportieren", "Weitere Filter", "Finanzielle Wirkung", "Eindeutige Risikoobjekte", "Verantwortungsabdeckung", "Evidenzreife", "Risikofall öffnen"].forEach(label => {
    if (!desktopGerman.visibleText.includes(label)) failures.push(`german:${label}`);
  });
  ["Risk Cases exportieren", "Inventory Risk Portfolio", "Case öffnen", "Owner-Abdeckung", "Family Cases"].forEach(label => {
    if (desktopGerman.visibleText.includes(label)) failures.push(`german-residual:${label}`);
  });
  ["Inventory Risks", "Export Risk Cases", "More filters", "Financial impact", "Unique Risk Entities", "Owner Coverage", "Evidence Readiness", "Open risk case"].forEach(label => {
    if (!desktopEnglish.visibleText.includes(label)) failures.push(`english:${label}`);
  });
  if (!ownerValue || !advancedInteraction.open || advancedInteraction.badge !== "1" || advancedInteraction.owner !== ownerValue || advancedInteraction.resetDisabled) failures.push("advanced-filter-interaction");
  if (resetInteraction.open || !resetInteraction.resetDisabled || resetInteraction.activeValues !== 0) failures.push("filter-reset-interaction");
  if (externalRequests.length) failures.push("external-requests");
  if (failedRequests.length) failures.push("failed-requests");
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");

  console.log(JSON.stringify({
    status: failures.length ? "failed" : "passed",
    url: page.url(),
    results,
    advancedInteraction,
    resetInteraction,
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
