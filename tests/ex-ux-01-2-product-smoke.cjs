const { chromium, productUrl, captureScreenshot, screenshotName, optionalScreenshotEnabled } = require("./smoke-runtime.cjs");
const { assertUnifiedExcessRoute, openUnifiedExcessSegment } = require("./inventory-risk-smoke-navigation.cjs");

const captureOptional = optionalScreenshotEnabled();

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, acceptDownloads: true });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !/^0(\s|$)/.test((document.querySelector("#mInventory")?.textContent || "").trim()), null, { timeout: 20000 });
  const routeState = await openUnifiedExcessSegment(page);

  const desktop = await page.evaluate(() => {
    const excess = document.querySelector("#inventoryRisksPage");
    const worklist = document.querySelector(".inventory-risk-worklist");
    const worklistBody = document.querySelector(".inventory-risk-table-wrap");
    const detail = document.querySelector(".inventory-risk-detail");
    const rows = [...document.querySelectorAll(".inventory-risk-table tbody tr")];
    const bodyRect = worklistBody.getBoundingClientRect();
    const visibleRows = rows.filter(row => {
      const rect = row.getBoundingClientRect();
      return rect.top >= bodyRect.top - 1 && rect.bottom <= bodyRect.bottom + 1;
    }).length;
    const widthTotal = worklist.getBoundingClientRect().width + detail.getBoundingClientRect().width;
    const headers = [...document.querySelectorAll(".inventory-risk-table thead th")].map(cell => cell.textContent.trim());
    const visible = selector => {
      const element = document.querySelector(selector)?.closest("label") || document.querySelector(selector);
      return Boolean(element && getComputedStyle(element).display !== "none" && element.getClientRects().length);
    };
    return {
      worklistStart: worklist.getBoundingClientRect().top - excess.getBoundingClientRect().top,
      visibleRows,
      worklistRatio: worklist.getBoundingClientRect().width / widthTotal,
      detailRatio: detail.getBoundingClientRect().width / widthTotal,
      bodyOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
      filters: {
        search: visible('[data-inventory-risk-filter="search"]'),
        plant: visible('[data-inventory-risk-filter="plant"]'),
        program: visible('[data-inventory-risk-filter="program"]'),
        owner: Boolean(document.querySelector('[data-inventory-risk-filter="owner"]')),
        familySubtype: Boolean(document.querySelector('[data-inventory-risk-filter="familySubtype"]')),
        priority: Boolean(document.querySelector('[data-inventory-risk-filter="priority"]')),
        evidenceStatus: Boolean(document.querySelector('[data-inventory-risk-filter="evidenceStatus"]'))
      },
      advancedFiltersClosed: !document.querySelector(".inventory-risk-more-filters")?.open,
      summaryCards: document.querySelectorAll(".inventory-risk-summary-card").length,
      financialCards: document.querySelectorAll(".inventory-risk-financial-card").length,
      headers,
      decisionCoreVisible: document.querySelector(".excess-decision-core")?.getBoundingClientRect().bottom <= detail.getBoundingClientRect().bottom,
      whyVisible: Boolean(document.querySelector(".excess-primary-decision")),
      nextStepVisible: Boolean(document.querySelector("[data-next-step]")),
      historyState: document.querySelector("[data-history-state]")?.dataset.historyState || "",
      closedDisclosures: [...document.querySelectorAll(".excess-detail-disclosure")].every(item => !item.open)
    };
  });

  const rows = page.locator(".inventory-risk-table tbody tr");
  const baselineRows = await rows.count();
  const firstMaterialId = (await page.locator(".inventory-risk-material-id").first().textContent() || "").trim();
  await page.locator('[data-inventory-risk-filter="search"]').fill(firstMaterialId);
  await page.waitForTimeout(100);
  const searchRows = await rows.count();
  await page.locator("[data-inventory-risk-reset]").click();
  await page.waitForTimeout(100);

  const ownerFilter = page.locator('[data-inventory-risk-filter="owner"]');
  const ownerOptions = await ownerFilter.locator("option").count();
  if (ownerOptions > 1) {
    await page.locator(".inventory-risk-more-filters > summary").click();
    await ownerFilter.selectOption({ index: 1 });
    await page.waitForTimeout(100);
  }
  const ownerRows = await rows.count();
  await page.locator("[data-inventory-risk-reset]").click();
  await page.waitForTimeout(100);
  const resetRows = await rows.count();

  const secondRow = rows.nth(1);
  const selectedId = await secondRow.getAttribute("data-inventory-risk-case");
  await secondRow.focus();
  await secondRow.press("Enter");
  await page.waitForTimeout(100);
  const keyboardSelectedId = await page.locator(".inventory-risk-table tbody tr.selected").getAttribute("data-inventory-risk-case");

  if (captureOptional) {
    await captureScreenshot(page, screenshotName("ex-ux-01-2", "excess-workspace.png"), { fullPage: true });
  }

  await page.locator('[data-process="inventory-explorer"]').click();
  const categoryVisibleElsewhere = await page.locator("#categoryFilter").evaluate(element => {
    const field = element.closest(".field");
    return getComputedStyle(field).display !== "none" && field.getClientRects().length > 0;
  });

  const widths = [];
  for (const viewport of [
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 1180, height: 800 },
    { width: 1024, height: 768 },
    { width: 900, height: 768 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 }
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(60);
    widths.push(await page.evaluate(({ width, height }) => ({
      width,
      height,
      overflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth
    }), viewport));
  }

  const result = {
    status: "passed",
    desktop,
    routeState,
    interactions: {
      baselineRows,
      firstMaterialId,
      searchRows,
      searchFilterWorked: Boolean(firstMaterialId) && searchRows > 0 && searchRows < baselineRows,
      ownerRows,
      ownerFilterWorked: ownerOptions <= 1 || ownerRows < baselineRows,
      resetRows,
      resetWorked: resetRows === baselineRows,
      selectedId,
      keyboardSelectedId,
      keyboardSelectionWorked: selectedId === keyboardSelectedId,
      categoryVisibleElsewhere
    },
    responsive: widths,
    pageErrors,
    consoleErrors
  };
  const failed = [];
  assertUnifiedExcessRoute(routeState, failed);
  if (desktop.worklistStart > 540) failed.push("worklistStart");
  if (desktop.visibleRows < 6) failed.push("visibleRows");
  if (desktop.worklistRatio < 0.44 || desktop.worklistRatio > 0.48) failed.push("split");
  if (desktop.bodyOverflow > 2 || widths.some(item => item.overflow > 2)) failed.push("overflow");
  if (!Object.values(desktop.filters).every(Boolean)) failed.push("visibleFilters");
  if (!desktop.advancedFiltersClosed) failed.push("advancedFiltersDefaultState");
  if (desktop.summaryCards !== 4 || desktop.financialCards !== 3) failed.push("summary");
  if (desktop.headers.some(label => /Match|Datenverknüpfung/.test(label)) || !desktop.headers.some(label => /Priorität|Priority/.test(label))) failed.push("worklistColumns");
  if (!desktop.decisionCoreVisible || !desktop.whyVisible || !desktop.nextStepVisible) failed.push("decisionCore");
  if (!desktop.closedDisclosures) failed.push("disclosures");
  if (!result.interactions.searchFilterWorked || !result.interactions.ownerFilterWorked || !result.interactions.resetWorked || !result.interactions.keyboardSelectionWorked || !categoryVisibleElsewhere) failed.push("interactions");
  if (pageErrors.length || consoleErrors.length) failed.push("browserErrors");
  result.failed = failed;
  result.status = failed.length ? "failed" : "passed";
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  if (failed.length) process.exit(1);
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
