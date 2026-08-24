const { chromium } = require("C:/Users/Noah/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");

const productUrl = "file:///C:/Users/Noah/Documents/Codex/2026-06-24/da-s/outputs/inventory-recovery-mvp/prototype.html";

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
  await page.locator('[data-process="excess-stock"]').click();
  await page.waitForSelector("#view-excess.active .excess-table tbody tr", { timeout: 10000 });

  const desktop = await page.evaluate(() => {
    const excess = document.querySelector("#excessPage");
    const worklist = document.querySelector(".excess-worklist-panel");
    const worklistBody = document.querySelector(".excess-table-wrap");
    const detail = document.querySelector(".excess-detail-panel");
    const rows = [...document.querySelectorAll(".excess-table tbody tr")];
    const bodyRect = worklistBody.getBoundingClientRect();
    const visibleRows = rows.filter(row => {
      const rect = row.getBoundingClientRect();
      return rect.top >= bodyRect.top - 1 && rect.bottom <= bodyRect.bottom + 1;
    }).length;
    const widthTotal = worklist.getBoundingClientRect().width + detail.getBoundingClientRect().width;
    const headers = [...document.querySelectorAll(".excess-table thead th")].map(cell => cell.textContent.trim());
    const visible = id => {
      const element = document.getElementById(id)?.closest(".field") || document.getElementById(id);
      return Boolean(element && getComputedStyle(element).display !== "none" && element.getClientRects().length);
    };
    return {
      worklistStart: worklist.getBoundingClientRect().top - excess.getBoundingClientRect().top,
      visibleRows,
      worklistRatio: worklist.getBoundingClientRect().width / widthTotal,
      detailRatio: detail.getBoundingClientRect().width / widthTotal,
      bodyOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
      filters: {
        search: visible("searchInput"),
        plant: visible("plantFilter"),
        program: visible("groupFilter"),
        owner: visible("excessOwnerFilter"),
        priority: visible("excessPriorityFilter"),
        category: visible("categoryFilter"),
        rowLimit: visible("rowLimit")
      },
      summaryCards: document.querySelectorAll(".excess-summary-card").length,
      headers,
      decisionCoreVisible: document.querySelector(".excess-decision-core")?.getBoundingClientRect().bottom <= detail.getBoundingClientRect().bottom,
      whyVisible: Boolean(document.querySelector(".excess-primary-decision")),
      nextStepVisible: Boolean(document.querySelector("[data-next-step]")),
      historyState: document.querySelector("[data-history-state]")?.dataset.historyState || "",
      closedDisclosures: [...document.querySelectorAll(".excess-detail-disclosure")].every(item => !item.open)
    };
  });

  const baselineRows = await page.locator(".excess-table tbody tr").count();
  const categoryValue = await page.locator("#categoryFilter option").nth(1).getAttribute("value");
  if (categoryValue) {
    await page.locator("#categoryFilter").evaluate((element, value) => {
      element.value = value;
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }, categoryValue);
    await page.waitForTimeout(100);
  }
  const rowsAfterHiddenCategory = await page.locator(".excess-table tbody tr").count();

  const ownerOptions = await page.locator("#excessOwnerFilter option").count();
  if (ownerOptions > 1) {
    await page.locator("#excessOwnerFilter").selectOption({ index: 1 });
    await page.waitForTimeout(100);
  }
  const ownerRows = await page.locator(".excess-table tbody tr").count();
  await page.locator("#excessResetFilters").click();
  await page.waitForTimeout(100);
  const resetRows = await page.locator(".excess-table tbody tr").count();

  const secondRow = page.locator(".excess-table tbody tr").nth(1);
  const selectedId = await secondRow.getAttribute("data-excess-case-detail");
  await secondRow.focus();
  await secondRow.press("Enter");
  await page.waitForTimeout(100);
  const keyboardSelectedId = await page.locator(".excess-table tbody tr.selected").getAttribute("data-excess-case-detail");

  if (process.env.OBSOLIQ_SMOKE_SCREENSHOT) {
    await page.screenshot({ path: process.env.OBSOLIQ_SMOKE_SCREENSHOT, fullPage: true });
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
    interactions: {
      baselineRows,
      rowsAfterHiddenCategory,
      hiddenCategoryIgnored: rowsAfterHiddenCategory === baselineRows,
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
  if (desktop.worklistStart > 280) failed.push("worklistStart");
  if (desktop.visibleRows < 6) failed.push("visibleRows");
  if (desktop.worklistRatio < 0.52 || desktop.worklistRatio > 0.56) failed.push("split");
  if (desktop.bodyOverflow > 2 || widths.some(item => item.overflow > 2)) failed.push("overflow");
  if (desktop.filters.category || desktop.filters.rowLimit) failed.push("hiddenFilters");
  if (![desktop.filters.search, desktop.filters.plant, desktop.filters.program, desktop.filters.owner, desktop.filters.priority].every(Boolean)) failed.push("visibleFilters");
  if (desktop.summaryCards !== 4) failed.push("summary");
  if (desktop.headers.some(label => /Match|Datenverknüpfung/.test(label)) || !desktop.headers.some(label => /Priorität|Priority/.test(label))) failed.push("worklistColumns");
  if (!desktop.decisionCoreVisible || !desktop.whyVisible || !desktop.nextStepVisible) failed.push("decisionCore");
  if (!desktop.closedDisclosures) failed.push("disclosures");
  if (!result.interactions.hiddenCategoryIgnored || !result.interactions.ownerFilterWorked || !result.interactions.resetWorked || !result.interactions.keyboardSelectionWorked || !categoryVisibleElsewhere) failed.push("interactions");
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
