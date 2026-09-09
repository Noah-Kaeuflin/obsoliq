// SYNTHETIC TEST DATA. Focused real-UI regression for OVERVIEW-STARTUP-UX-02.
"use strict";

const assert = require("node:assert/strict");
const {
  chromium,
  productUrl,
  optionalScreenshotEnabled,
  captureScreenshot,
  screenshotName
} = require("./smoke-runtime.cjs");

const VIEWPORTS = [
  { width: 1440, height: 1000, key: "1440x1000", columns: 3, rows: 2 },
  { width: 1568, height: 1000, key: "1568x1000", columns: 3, rows: 2 },
  { width: 1024, height: 768, key: "1024x768", columns: 2, rows: 3 },
  { width: 390, height: 844, key: "390x844", columns: 1, rows: 6 }
];

let assertionCount = 0;

function check(value, message) {
  assertionCount += 1;
  assert.ok(value, message);
}

function equal(actual, expected, message) {
  assertionCount += 1;
  assert.equal(actual, expected, message);
}

function near(actual, expected, message) {
  assertionCount += 1;
  assert.ok(Math.abs(Number(actual) - expected) < 0.001, `${message}: expected ${expected}, received ${actual}`);
}

function attachDiagnostics(page, diagnostics) {
  page.on("pageerror", error => diagnostics.pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") diagnostics.consoleErrors.push(message.text());
  });
  page.on("request", request => {
    if (/^https?:/i.test(request.url())) diagnostics.externalRequests.push(request.url());
  });
}

async function openProductPage(context, diagnostics) {
  const page = await context.newPage();
  attachDiagnostics(page, diagnostics);
  await page.addInitScript(() => { window.__OBSOLIQ_TEST_MODE__ = true; });
  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__obsoliqTestBridge));
  return page;
}

async function maybeScreenshot(page, screenshots, filename) {
  if (!optionalScreenshotEnabled()) return;
  screenshots.push(await captureScreenshot(
    page,
    screenshotName("overview-startup-ux-02", filename),
    { fullPage: false }
  ));
}

async function startupState(page) {
  return page.evaluate(() => {
    const visible = element => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return !element.hidden && style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const empty = document.getElementById("overviewEmptyState");
    const primary = empty?.querySelector("[data-empty-load-sample]");
    const secondary = empty?.querySelector("[data-empty-upload]");
    const primaryRect = primary?.getBoundingClientRect();
    const feedback = document.getElementById("actionFeedback");
    const title = empty?.querySelector("[data-empty-state-title]");
    const icon = feedback?.querySelector("[data-oq-icon='data-loaded']");
    const iconRect = icon?.getBoundingClientRect();
    const bridge = window.__obsoliqTestBridge;
    return {
      protocol: location.protocol,
      rawRows: bridge.getState().rawRows,
      packageCount: bridge.getRegistryStats().packageCount,
      state: document.getElementById("overviewWorkspace")?.dataset.overviewState || "",
      title: title?.textContent.trim() || "",
      titleTag: title?.tagName || "",
      labelledSection: empty?.getAttribute("aria-labelledby") === title?.id,
      text: empty?.innerText || "",
      emptyVisible: visible(empty),
      primaryVisible: visible(primary),
      secondaryVisible: visible(secondary),
      primaryEnabled: !primary?.disabled,
      primaryAboveFold: Boolean(primaryRect && primaryRect.top >= 0 && primaryRect.bottom <= innerHeight),
      analysisVisible: visible(document.querySelector(".overview-main")),
      filtersVisible: visible(document.getElementById("overviewGlobalFilterBlock")),
      dashboardVisible: visible(document.getElementById("view-dashboard")),
      filterEmptyVisible: visible(document.getElementById("overviewFilterEmptyState")),
      foundationVisible: visible(document.getElementById("dataPackagesPanel")),
      recoveryProgressVisible: visible(document.querySelector(".recovery-progress")),
      visibleFilterWarning: document.body.innerText.includes("Keine Positionen im aktuellen Filter"),
      feedbackText: feedback?.textContent.trim() || "",
      feedbackClass: feedback?.className || "",
      feedbackRole: feedback?.getAttribute("role") || "",
      feedbackLive: feedback?.getAttribute("aria-live") || "",
      feedbackBackground: feedback ? getComputedStyle(feedback).backgroundColor : "",
      iconHidden: Boolean(icon?.hasAttribute("hidden")),
      iconDisplay: icon ? getComputedStyle(icon).display : "",
      iconSize: iconRect ? [iconRect.width, iconRect.height] : [],
      horizontalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      navControls: document.querySelectorAll(".process-tabs button[data-process]").length
    };
  });
}

function assertStartup(state, viewportKey) {
  equal(state.protocol, "file:", `${viewportKey}: real product opens through file protocol`);
  equal(state.rawRows, 0, `${viewportKey}: no inventory is preloaded`);
  equal(state.packageCount, 0, `${viewportKey}: no package is registered at startup`);
  equal(state.state, "missing", `${viewportKey}: startup state is missing-source`);
  equal(state.title, "Bestandsanalyse starten", `${viewportKey}: next step is the startup title`);
  check(state.titleTag === "H3" && state.labelledSection, `${viewportKey}: startup is exposed as a named section with a heading`);
  check(state.text.includes("Lade die verknüpften Beispieldaten oder importiere deinen Bestand."), `${viewportKey}: startup explains both paths`);
  check(state.text.includes("Beispieldaten laden") && state.text.includes("Eigene Datei importieren"), `${viewportKey}: both visible actions use the requested labels`);
  check(state.text.includes("synthetisch") && state.text.includes("nicht automatisch gespeichert"), `${viewportKey}: startup discloses demo and session behavior`);
  check(state.emptyVisible && state.primaryVisible && state.secondaryVisible && state.primaryEnabled, `${viewportKey}: startup and both actions are visible and enabled`);
  check(state.primaryAboveFold, `${viewportKey}: primary next step is above the fold`);
  check(!state.analysisVisible && !state.filtersVisible && !state.dashboardVisible && !state.filterEmptyVisible && !state.foundationVisible, `${viewportKey}: unavailable and competing analysis surfaces are not visible`);
  check(!state.recoveryProgressVisible && !state.visibleFilterWarning, `${viewportKey}: no progress or filter warning is implied`);
  equal(state.feedbackText, "Noch keine Daten geladen", `${viewportKey}: header explains the missing source`);
  check(state.feedbackRole === "status" && state.feedbackLive === "polite", `${viewportKey}: status changes are announced without interrupting the user`);
  check(!state.feedbackClass.includes("ok") && !state.feedbackClass.includes("error") && !state.feedbackClass.includes("loading"), `${viewportKey}: header status is neutral`);
  check(state.iconHidden && state.iconDisplay === "none" && state.iconSize[0] === 0 && state.iconSize[1] === 0, `${viewportKey}: loaded-success icon is truly absent`);
  check(state.horizontalOverflow <= 2, `${viewportKey}: startup has no horizontal overflow`);
  equal(state.navControls, 8, `${viewportKey}: existing area navigation remains present`);
}

async function layoutState(page) {
  return page.evaluate(() => {
    const cards = [...document.querySelectorAll(".metrics > .metric")];
    const rects = cards.map(card => card.getBoundingClientRect());
    const unique = values => new Set(values.map(value => Math.round(value))).size;
    const recovery = document.querySelector(".metric.recovery");
    return {
      cardCount: cards.length,
      columns: unique(rects.map(rect => rect.left)),
      rows: unique(rects.map(rect => rect.top)),
      gridHeight: document.querySelector(".metrics").getBoundingClientRect().height,
      cardHeights: rects.map(rect => rect.height),
      actionsAligned: cards.every((card, index) => {
        const action = card.querySelector("[data-kpi-details]").getBoundingClientRect();
        return Math.abs(action.left - rects[index].left - parseFloat(getComputedStyle(card).paddingLeft) - 1) < 2;
      }),
      recoveryGridColumn: recovery ? getComputedStyle(recovery).gridColumnEnd : "",
      overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
      cardsContained: cards.every((card, index) => {
        const rect = rects[index];
        return rect.left >= -1 && rect.right <= innerWidth + 1 && card.scrollWidth <= card.clientWidth + 2;
      })
    };
  });
}

async function stableProductSnapshot(page) {
  return page.evaluate(() => {
    const bridge = window.__obsoliqTestBridge;
    const registry = bridge.getRegistrySnapshot();
    return {
      datasetId: bridge.getState().currentDatasetId,
      rawRows: bridge.getState().rawRows,
      enrichedRows: bridge.getState().enrichedRows,
      packages: registry.packages.map(record => [record.packageId, record.packageType, record.revision, record.status]),
      metrics: ["mInventory", "mExcess", "mBad", "mNoNeed", "mNoPlan", "mRecovery", "mShare"]
        .map(id => [id, document.getElementById(id)?.textContent.trim() || "", document.getElementById(id)?.className || ""]),
      cards: [...document.querySelectorAll("[data-kpi-card]")].map(card => [
        card.dataset.kpiAvailability, card.querySelector("[data-kpi-amount-label]").textContent, card.querySelector("[data-kpi-total-status]").textContent
      ]),
      summary: document.querySelector(".kpi-data-summary").textContent,
      detail: { open: Boolean(document.getElementById("overviewKpiDetailDialog")?.open), text: document.getElementById("overviewKpiDetailDialog")?.textContent || "" }
    };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const diagnostics = { pageErrors: [], consoleErrors: [], externalRequests: [] };
  const screenshots = [];
  const evidence = { startup: {}, layouts: {}, loading: null, loaded: null, filter: null, sticky: null };
  try {
    const mainContext = await browser.newContext({ viewport: VIEWPORTS[0], reducedMotion: "reduce", hasTouch: true });
    const page = await openProductPage(mainContext, diagnostics);

    evidence.startup[VIEWPORTS[0].key] = await startupState(page);
    assertStartup(evidence.startup[VIEWPORTS[0].key], VIEWPORTS[0].key);
    await maybeScreenshot(page, screenshots, `startup-${VIEWPORTS[0].key}.png`);

    for (const viewport of VIEWPORTS.slice(1)) {
      const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
      const startupPage = await openProductPage(context, diagnostics);
      evidence.startup[viewport.key] = await startupState(startupPage);
      assertStartup(evidence.startup[viewport.key], viewport.key);
      await maybeScreenshot(startupPage, screenshots, `startup-${viewport.key}.png`);
      await context.close();
    }

    const seamContext = await browser.newContext({
      viewport: { width: 1050, height: 768 },
      reducedMotion: "no-preference"
    });
    const seamPage = await openProductPage(seamContext, diagnostics);
    const initialNavigationSeam = await seamPage.evaluate(() => {
      const nav = document.querySelector(".main-nav");
      const tabs = document.querySelector(".process-tabs");
      const navStyle = getComputedStyle(nav);
      const tabsStyle = getComputedStyle(tabs);
      return {
        navHeight: nav.getBoundingClientRect().height,
        tabsVisible: Boolean(tabs.getClientRects().length)
          && tabsStyle.visibility !== "hidden"
          && Number(tabsStyle.opacity) > 0,
        navTransitionDuration: navStyle.transitionDuration,
        globalOverflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth
      };
    });
    check(
      initialNavigationSeam.navHeight <= 1
        && !initialNavigationSeam.tabsVisible
        && initialNavigationSeam.navTransitionDuration.split(",").every(value => Number.parseFloat(value) === 0)
        && initialNavigationSeam.globalOverflow <= 2,
      `1050px startup never exposes the clipped desktop navigation during compact initialization: ${JSON.stringify(initialNavigationSeam)}`
    );
    await maybeScreenshot(seamPage, screenshots, "startup-1050x768-seam.png");
    await seamContext.close();

    await page.setViewportSize({ width: 1050, height: 768 });
    await page.waitForFunction(() => document.querySelector(".main-nav")?.classList.contains("collapsed"));
    const navigationSeam = await page.evaluate(() => {
      const visible = element => Boolean(element && element.getClientRects().length && getComputedStyle(element).visibility !== "hidden");
      return {
        toggleVisible: visible(document.getElementById("navToggleButton")),
        tabsVisible: visible(document.querySelector(".process-tabs")),
        overflow: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth
      };
    });
    check(navigationSeam.toggleVisible && !navigationSeam.tabsVisible && navigationSeam.overflow <= 2, "1050px seam uses compact navigation without clipped desktop tabs");

    await page.setViewportSize({ width: 1024, height: 768 });
    const navigationToggle = page.locator("#navToggleButton");
    await navigationToggle.focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector("#sectionsPopover");
    const openedNavigation = await page.evaluate(() => ({
      expanded: document.getElementById("navToggleButton")?.getAttribute("aria-expanded"),
      focusedProcess: document.activeElement?.dataset.navSection || "",
      role: document.activeElement?.getAttribute("role") || ""
    }));
    assert.deepEqual(openedNavigation, { expanded: "true", focusedProcess: "overview", role: "menuitem" });
    assertionCount += 1;
    await page.keyboard.press("ArrowDown");
    equal(await page.evaluate(() => document.activeElement?.dataset.navSection), "inventory-explorer", "Arrow keys move focus through compact navigation items");
    await page.keyboard.press("Escape");
    check(await page.evaluate(() => document.activeElement?.id === "navToggleButton" && !document.getElementById("sectionsPopover")), "Escape closes compact navigation and restores trigger focus");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    check(await page.evaluate(() => document.activeElement?.id === "uploadButton" && !document.getElementById("sectionsPopover")), "Tab leaves compact navigation in the normal header order");
    await page.setViewportSize(VIEWPORTS[0]);

    const importAction = page.locator("#overviewEmptyState [data-empty-upload]");
    await importAction.focus();
    equal(await page.evaluate(() => document.activeElement?.matches("[data-empty-upload]")), true, "Secondary import action receives keyboard focus");
    await page.keyboard.press("Enter");
    await page.waitForSelector("#packageTypeModal.active");
    check(await page.locator("#packageTypeInventoryButton").isVisible(), "Keyboard activation opens the existing productive import chooser");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.getElementById("packageTypeModal")?.classList.contains("active"));
    equal((await startupState(page)).rawRows, 0, "Opening and closing import chooser does not load data");

    await page.locator("[data-process='settings']").click();
    await page.waitForSelector("#settingsModal.active");
    await page.locator("#languageSelect").selectOption("en");
    await page.locator("#settingsDoneButton").click();
    await page.locator("[data-process='overview']").click();
    const englishStartup = await page.evaluate(() => ({
      language: document.documentElement.lang,
      languageControl: document.getElementById("languageSelect")?.value || "",
      title: document.querySelector("[data-empty-state-title]")?.textContent.trim() || "",
      feedback: document.querySelector("#actionFeedback .action-feedback-text")?.textContent.trim() || ""
    }));
    assert.deepEqual(englishStartup, {
      language: "en",
      languageControl: "en",
      title: "Start inventory analysis",
      feedback: "No data loaded yet"
    });
    assertionCount += 1;

    await page.evaluate(() => {
      window.__overviewStartupDemoClickCount = 0;
      window.__overviewStartupDropReadCount = 0;
      const originalFileText = File.prototype.text;
      File.prototype.text = function (...args) {
        window.__overviewStartupDropReadCount += 1;
        return originalFileText.apply(this, args);
      };
      document.getElementById("sampleButton").addEventListener("click", () => {
        window.__overviewStartupDemoClickCount += 1;
      }, true);
      document.addEventListener("click", event => {
        const trigger = event.target.closest?.("[data-empty-load-sample]");
        if (!trigger || window.__overviewStartupLoadingSnapshot) return;
        const workspace = document.getElementById("overviewWorkspace");
        const empty = document.getElementById("overviewEmptyState");
        const feedback = document.getElementById("actionFeedback");
        const icon = feedback.querySelector("[data-oq-icon='data-loaded']");
        const visible = element => element && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden";
        window.__overviewStartupLoadingSnapshot = {
          operation: workspace.dataset.dataOperation || "",
          state: workspace.dataset.overviewState || "",
          busy: workspace.getAttribute("aria-busy"),
          title: empty.querySelector("[data-empty-state-title]")?.textContent.trim() || "",
          feedback: feedback.textContent.trim(),
          feedbackClass: feedback.className,
          iconVisible: visible(icon),
          startVisible: visible(empty),
          analysisVisible: visible(document.querySelector(".overview-main")),
          emptyActionDisabled: Boolean(trigger.disabled),
          headerActionDisabled: Boolean(document.getElementById("sampleButton")?.disabled),
          navigationDisabled: [...document.querySelectorAll(".process-tabs button[data-process]")].every(button => button.disabled),
          clickCount: window.__overviewStartupDemoClickCount
        };
        trigger.click();
        window.__overviewStartupLoadingSnapshot.clickCountAfterDuplicate = window.__overviewStartupDemoClickCount;
        const transfer = new DataTransfer();
        transfer.items.add(new File([
          "Material Number,Stock Value (EUR)\nMAT-DROP,1"
        ], "blocked-during-demo.csv", { type: "text/csv" }));
        window.dispatchEvent(new DragEvent("drop", { dataTransfer: transfer, bubbles: true, cancelable: true }));
        window.__overviewStartupLoadingSnapshot.operationAfterDrop = workspace.dataset.dataOperation || "";
        window.__overviewStartupLoadingSnapshot.dropReadCount = window.__overviewStartupDropReadCount;
      });
    });
    await page.locator("#overviewEmptyState [data-empty-load-sample]").click();
    evidence.loading = await page.evaluate(() => window.__overviewStartupLoadingSnapshot);
    equal(evidence.loading.operation, "demo", "Visible click starts the existing demo data operation");
    equal(evidence.loading.state, "loading", "Loading has a distinct presentation state");
    equal(evidence.loading.busy, "true", "Loading state is exposed as busy");
    check(evidence.loading.title === "Loading complete demo data foundation" && evidence.loading.feedback === evidence.loading.title, "Loading is explained in the selected language before success");
    check(evidence.loading.feedbackClass.includes("loading") && !evidence.loading.feedbackClass.includes("ok"), "Loading never presents premature success");
    check(!evidence.loading.iconVisible && evidence.loading.startVisible && !evidence.loading.analysisVisible, "Loading hides success and staged analysis");
    check(evidence.loading.emptyActionDisabled && evidence.loading.headerActionDisabled && evidence.loading.navigationDisabled, "Loading disables duplicate actions and staged-data navigation");
    equal(evidence.loading.clickCount, 1, "Visible startup action delegates exactly once to the productive loader");
    equal(evidence.loading.clickCountAfterDuplicate, 1, "Disabled startup action cannot start a second demo load");
    check(evidence.loading.operationAfterDrop === "demo" && evidence.loading.dropReadCount === 0, "A file drop cannot overlap or replace the active demo transaction");

    await page.waitForFunction(() => {
      const bridge = window.__obsoliqTestBridge;
      const workspace = document.getElementById("overviewWorkspace");
      const slowDead = bridge?.getSlowDeadRecoveryCaseRuntimeForTest();
      return bridge?.getState().rawRows === 102
        && bridge.getRegistryStats().packageCount === 3
        && ["available", "limited"].includes(slowDead?.status)
        && workspace?.dataset.overviewState === "loaded"
        && workspace?.getAttribute("aria-busy") === "false"
        && !workspace?.dataset.dataOperation
        && document.querySelector("#actionFeedback .action-feedback-text")?.textContent.trim() === "Import complete"
        && [...document.querySelectorAll(".process-tabs button[data-process]")].every(button => !button.disabled);
    }, null, { timeout: 30000 });

    const englishLoaded = await page.evaluate(() => ({
      documentLanguage: document.documentElement.lang,
      languageControl: document.getElementById("languageSelect")?.value || "",
      feedback: document.querySelector("#actionFeedback .action-feedback-text")?.textContent.trim() || "",
      noDemandLabel: document.querySelector(".metric.noneed .label")?.textContent.trim() || ""
    }));
    assert.deepEqual(englishLoaded, {
      documentLanguage: "en",
      languageControl: "en",
      feedback: "Import complete",
      noDemandLabel: "No Demand"
    });
    assertionCount += 1;
    await page.locator("[data-process='settings']").click();
    await page.waitForSelector("#settingsModal.active");
    await page.locator("#languageSelect").selectOption("de");
    await page.locator("#settingsDoneButton").click();
    await page.locator("[data-process='overview']").click();
    await page.waitForFunction(() => document.documentElement.lang === "de"
      && document.querySelector("#actionFeedback .action-feedback-text")?.textContent.trim() === "Import abgeschlossen");

    evidence.loaded = await page.evaluate(() => {
      const bridge = window.__obsoliqTestBridge;
      const inventory = bridge.getActiveInventoryPackage();
      const master = bridge.getActiveMaterialMasterPackage();
      const history = bridge.getActiveConsumptionHistoryPackage();
      const models = bridge.buildKpiAvailabilityModelsForTest(bridge.getOverviewRows());
      const registry = bridge.getRegistrySnapshot();
      const visible = element => Boolean(element && element.getClientRects().length);
      return {
        sourceRows: [inventory?.sourceDescriptor?.rows, master?.sourceDescriptor?.rows, history?.sourceDescriptor?.rows],
        packageTypes: registry.packages.map(record => record.packageType).sort(),
        packageIds: registry.packages.map(record => record.packageId),
        packageRevisions: registry.packages.map(record => record.revision),
        rawRows: bridge.getState().rawRows,
        slowDeadCases: bridge.getSlowDeadRecoveryCaseRuntimeForTest()?.result?.cases?.length || 0,
        analysisVisible: visible(document.querySelector(".overview-main")),
        filterVisible: visible(document.getElementById("overviewGlobalFilterBlock")),
        dashboardVisible: visible(document.getElementById("view-dashboard")),
        foundationVisible: visible(document.getElementById("dataPackagesPanel")),
        startVisible: visible(document.getElementById("overviewEmptyState")),
        feedbackClass: document.getElementById("actionFeedback")?.className || "",
        feedbackIconVisible: visible(document.querySelector("#actionFeedback [data-oq-icon='data-loaded']")),
        models,
        exactText: Object.fromEntries(["Inventory", "Excess", "NoNeed", "Recovery"].map(name => [
          name,
          document.getElementById(`m${name}`)?.textContent.trim() || ""
        ]))
      };
    });
    equal(evidence.loaded.rawRows, 102, "Demo loads all Inventory rows");
    assert.deepEqual(evidence.loaded.sourceRows, [102, 98, 2260]);
    assertionCount += 1;
    assert.deepEqual(evidence.loaded.packageTypes, ["consumption_history", "inventory_snapshot", "material_master"]);
    check(new Set(evidence.loaded.packageIds).size === 3 && evidence.loaded.packageRevisions.every(value => value >= 1), "Demo registers three distinct versioned packages");
    equal(evidence.loaded.slowDeadCases, 20, "Demo retains the existing Slow/Dead cases");
    check(evidence.loaded.analysisVisible && evidence.loaded.filterVisible && evidence.loaded.dashboardVisible && evidence.loaded.foundationVisible && !evidence.loaded.startVisible, "Successful load reveals the real analysis and Data Foundation while removing startup guidance");
    check(evidence.loaded.feedbackClass.includes("ok") && evidence.loaded.feedbackIconVisible, "Successful load exposes the data-loaded status and icon");
    equal(evidence.loaded.models.inventory.strictAggregate.value, null, "Inventory remains unavailable when incomplete");
    near(evidence.loaded.models.inventory.partial.value, 4703268.7, "Inventory retains its safe incomplete subtotal");
    equal(evidence.loaded.models.excess.strictAggregate.value, null, "Excess remains unavailable when incomplete");
    near(evidence.loaded.models.excess.partial.value, 424480, "Excess retains its non-negative projection");
    near(evidence.loaded.models.noDemand.strictAggregate.value, 223309.7, "No-demand remains fully available");
    equal(evidence.loaded.models.share.strictAggregate.value, null, "Recovery Share remains unavailable");
    equal(evidence.loaded.models.share.partial.status, "not_allowed", "Recovery Share does not invent a partial quotient");
    check(evidence.loaded.exactText.Inventory.includes("4,7 Mio.") && evidence.loaded.exactText.Excess.includes("424 Tsd."), "Safe incomplete amounts are prominent on their cards");
    check(evidence.loaded.exactText.NoNeed.includes("223 Tsd.") && evidence.loaded.exactText.Recovery.includes("779 Tsd."), "Complete and Recovery amounts are prominent on their cards");

    await page.locator("[data-process='inventory-explorer']").click();
    await page.waitForFunction(() => document.getElementById("overviewWorkspace")?.dataset.view === "inventory");
    check(await page.locator("#inventoryTable tbody tr").count() > 0, "Inventory Explorer is reachable and contains rows");
    await page.locator("[data-process='inventory-risks']").click();
    await page.waitForFunction(() => document.getElementById("overviewWorkspace")?.dataset.view === "inventory-risks");
    const riskRows = page.locator("#inventoryRisksPage tr[data-inventory-risk-case]");
    const riskRowCount = await riskRows.count();
    check(riskRowCount > 0, "Inventory Risks is reachable and contains cases");
    let riskRouteVisible = false;
    for (let index = 0; index < riskRowCount && !riskRouteVisible; index += 1) {
      await riskRows.nth(index).click();
      riskRouteVisible = await page.locator("#inventoryRisksPage [data-inventory-risk-open-inventory]")
        .evaluateAll(elements => elements.some(element => element.getClientRects().length));
    }
    check(riskRouteVisible, "Inventory Risks exposes a visible in-content route for the loading gate test");
    await page.evaluate(() => {
      window.__overviewStartupRouteGuard = null;
      const routeButton = [...document.querySelectorAll("#inventoryRisksPage [data-inventory-risk-open-inventory]")]
        .find(element => element.getClientRects().length);
      const routeWasVisible = Boolean(routeButton?.getClientRects().length);
      document.getElementById("sampleButton").addEventListener("click", () => {
        const bridge = window.__obsoliqTestBridge;
        const workspace = document.getElementById("overviewWorkspace");
        const routeState = () => ({
          runtimeView: bridge.getState().currentView,
          runtimeProcess: bridge.getState().activeProcessKey,
          workspaceView: workspace.dataset.view || "",
          activeTab: document.querySelector(".process-tabs button.active")?.dataset.process || ""
        });
        const before = routeState();
        routeButton?.click();
        window.__overviewStartupRouteGuard = {
          operation: workspace.dataset.dataOperation || "",
          workspaceInert: workspace.inert,
          routeWasVisible,
          routeVisibleDuringLoad: Boolean(routeButton?.getClientRects().length),
          before,
          after: routeState()
        };
      }, { once: true });
    });
    await page.locator("#sampleButton").click();
    await page.waitForFunction(() => {
      const workspace = document.getElementById("overviewWorkspace");
      return window.__overviewStartupRouteGuard
        && window.__obsoliqTestBridge.getState().rawRows === 102
        && workspace?.getAttribute("aria-busy") === "false"
        && !workspace?.dataset.dataOperation
        && document.querySelector("#actionFeedback .action-feedback-text")?.textContent.trim() === "Import abgeschlossen";
    }, null, { timeout: 30000 });
    const routeGuard = await page.evaluate(() => window.__overviewStartupRouteGuard);
    check(routeGuard.operation === "demo" && routeGuard.workspaceInert && routeGuard.routeWasVisible, `A previously visible non-Overview workspace is inert while the demo transaction is active: ${JSON.stringify(routeGuard)}`);
    assert.deepEqual(routeGuard.after, routeGuard.before, "The inert workspace and central router block navigation to staged demo data");
    assertionCount += 1;
    const retainedNavigation = await page.evaluate(() => ({
      runtimeView: window.__obsoliqTestBridge.getState().currentView,
      runtimeProcess: window.__obsoliqTestBridge.getState().activeProcessKey,
      workspaceView: document.getElementById("overviewWorkspace")?.dataset.view || "",
      activeTab: document.querySelector(".process-tabs button.active")?.dataset.process || "",
      visibleRows: document.querySelectorAll("#inventoryRisksPage tr[data-inventory-risk-case]").length
    }));
    check(retainedNavigation.runtimeView === "inventory-risks"
      && retainedNavigation.runtimeProcess === "inventory-risks"
      && retainedNavigation.workspaceView === "inventory-risks"
      && retainedNavigation.activeTab === "inventory-risks"
      && retainedNavigation.visibleRows > 0, "Global demo reload preserves a non-Overview route without JS/DOM navigation drift");
    const reloadedRiskRows = page.locator("#inventoryRisksPage tr[data-inventory-risk-case]");
    let reloadedRiskRouteVisible = false;
    for (let index = 0; index < await reloadedRiskRows.count() && !reloadedRiskRouteVisible; index += 1) {
      await reloadedRiskRows.nth(index).click();
      reloadedRiskRouteVisible = await page.locator("#inventoryRisksPage [data-inventory-risk-open-inventory]")
        .evaluateAll(elements => elements.some(element => element.getClientRects().length));
    }
    check(reloadedRiskRouteVisible, "Reloaded Inventory Risks retains a visible route for rollback testing");

    const failedDemoRoute = await page.evaluate(async () => {
      const bridge = window.__obsoliqTestBridge;
      const workspace = document.getElementById("overviewWorkspace");
      const routeButton = [...document.querySelectorAll("#inventoryRisksPage [data-inventory-risk-open-inventory]")]
        .find(element => element.getClientRects().length);
      const routeState = () => ({
        runtimeView: bridge.getState().currentView,
        runtimeProcess: bridge.getState().activeProcessKey,
        workspaceView: workspace.dataset.view || "",
        activeTab: document.querySelector(".process-tabs button.active")?.dataset.process || ""
      });
      const before = routeState();
      const routeVisible = Boolean(routeButton?.getClientRects().length);
      workspace.dataset.dataOperation = "demo";
      workspace.setAttribute("aria-busy", "true");
      workspace.inert = true;
      const loadPromise = bridge.loadFullDemoForTest({
        forceFullDemoFailureForTest: "after_inventory",
        suppressErrorLog: true,
        suppressFeedback: true
      });
      routeButton?.click();
      const during = routeState();
      const result = await loadPromise;
      delete workspace.dataset.dataOperation;
      workspace.setAttribute("aria-busy", "false");
      workspace.inert = false;
      bridge.renderRestoredDatasetState();
      bridge.restoreHeaderDataStatusForTest();
      return {
        status: result.status,
        routeVisible,
        before,
        during,
        after: routeState()
      };
    });
    check(failedDemoRoute.status === "error" && failedDemoRoute.routeVisible, `Forced demo failure exercises the same visible in-content route gate: ${JSON.stringify(failedDemoRoute)}`);
    assert.deepEqual(failedDemoRoute.during, failedDemoRoute.before, "In-content navigation stays blocked before forced demo rollback");
    assertionCount += 1;
    assert.deepEqual(failedDemoRoute.after, failedDemoRoute.before, "Forced demo rollback preserves aligned runtime and DOM navigation");
    assertionCount += 1;
    await page.locator("[data-process='overview']").click();

    await page.locator("[data-process='settings']").click();
    await page.waitForSelector("#settingsModal.active");
    await page.locator("#languageSelect").selectOption("en");
    await page.locator("label[for='darkModeToggle']").click();
    const englishDark = await page.evaluate(() => ({
      language: document.documentElement.lang,
      theme: document.documentElement.dataset.theme,
      overviewLabel: document.querySelector("[data-process='overview']")?.textContent.trim() || "",
      exactSummary: document.querySelector('[data-kpi-details="inventory"]')?.getAttribute("aria-label") || "",
      loadedIconVisibleDuringSettingFeedback: Boolean(document.querySelector("#actionFeedback [data-oq-icon='data-loaded']")?.getClientRects().length)
    }));
    assert.deepEqual(englishDark, {
      language: "en",
      theme: "dark",
      overviewLabel: "Overview",
      exactSummary: "View details: Total Inventory",
      loadedIconVisibleDuringSettingFeedback: false
    });
    assertionCount += 1;
    await page.locator("#languageSelect").selectOption("de");
    await page.locator("label[for='darkModeToggle']").click();
    await page.locator("#settingsDoneButton").click();
    await page.locator("[data-process='overview']").click();
    await page.waitForFunction(() => document.documentElement.lang === "de" && document.documentElement.dataset.theme === "light");
    await page.waitForFunction(() => document.querySelector("#actionFeedback .action-feedback-text")?.textContent.trim() === "Import abgeschlossen", null, { timeout: 4000 });

    for (const viewport of VIEWPORTS) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.evaluate(() => {
        scrollTo(0, 0);
      });
      const layout = await layoutState(page);
      evidence.layouts[viewport.key] = layout;
      equal(layout.cardCount, 6, `${viewport.key}: all six KPI cards render`);
      equal(layout.columns, viewport.columns, `${viewport.key}: KPI grid uses the expected column count`);
      equal(layout.rows, viewport.rows, `${viewport.key}: KPI grid uses the expected row count`);
      equal(layout.recoveryGridColumn, "auto", `${viewport.key}: Recovery does not create a special grid span`);
      check(layout.overflow <= 2 && layout.cardsContained, `${viewport.key}: cards are contained without horizontal overflow`);
      check(layout.actionsAligned, `${viewport.key}: detail actions share the same left anchor`);
      if (viewport.columns === 3) {
        check(layout.gridHeight < 500 && layout.cardHeights.every(height => height >= 180 && height < 250), `${viewport.key}: loaded cards retain reviewed compactness without enforcing fixed clipped heights`);
      }
      await maybeScreenshot(page, screenshots, `loaded-${viewport.key}.png`);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('[data-kpi-details="recovery"]').tap();
    const mobileExact = await page.evaluate(() => {
      const dialog = document.getElementById("overviewKpiDetailDialog");
      const amount = dialog.querySelector("[data-kpi-exact-value]");
      const body = dialog.querySelector(".kpi-detail-body");
      return dialog.open && amount.textContent.includes("779.220,40")
        && dialog.scrollWidth <= innerWidth && dialog.getBoundingClientRect().height <= innerHeight
        && body.scrollHeight > body.clientHeight
        && dialog.querySelector("[data-kpi-detail-close]").getBoundingClientRect().height >= 44;
    });
    check(mobileExact, "Mobile shared detail is exact, scrollable and touch-operable");
    await maybeScreenshot(page, screenshots, "loaded-390x844-exact-open.png");
    await page.locator("#mShareReview").focus();
    const detailFocus = await page.evaluate(() => {
      const control = document.activeElement;
      const heading = document.querySelector(".kpi-detail-heading").getBoundingClientRect();
      const rect = control.getBoundingClientRect();
      const close = document.querySelector("[data-kpi-detail-close]").getBoundingClientRect();
      return rect.top >= heading.bottom && rect.bottom <= innerHeight && close.top >= 0 && close.bottom <= innerHeight
        && document.elementFromPoint(rect.left + 5, rect.top + 5) === control;
    });
    check(detailFocus, "Focused lower detail action and persistent Close are unobscured, not merely visible in a scrolled screenshot");
    await page.keyboard.press("Escape");
    check(await page.locator('[data-kpi-details="recovery"]').evaluate(el => document.activeElement === el), "Escape restores mobile opener focus");

    for (const width of [390, 1099, 1100, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator('[data-kpi-details="noPlan"]').evaluate(el => el.scrollIntoView({ block: "start" }));
      await page.locator('[data-kpi-details="noPlan"]').focus();
      await page.keyboard.press("Enter");
      const focusProof = await page.evaluate(() => {
        const title = document.getElementById("overviewKpiDetailTitle");
        const rect = title.getBoundingClientRect();
        return document.activeElement === title && rect.top >= 0 && rect.bottom <= innerHeight;
      });
      check(focusProof, width + "px: anchored card opens a focused, unobscured top-layer detail despite fixed header");
      await page.keyboard.press("Escape");
      const anchorProof = await page.locator('[data-kpi-details="noPlan"]').evaluate(el => {
        const rect = el.getBoundingClientRect();
        const header = document.querySelector("header").getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + 4, rect.top + 4);
        return document.activeElement === el && rect.top >= header.bottom && rect.bottom <= innerHeight && (hit === el || el.contains(hit));
      });
      check(anchorProof, width + "px: return focus and anchored trigger are not covered by the header/navigation");
    }
    await page.evaluate(() => scrollTo(0, 0));

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator("#overviewGlobalSearch").fill("__OVERVIEW_STARTUP_NO_MATCH__");
    await page.waitForFunction(() => document.getElementById("overviewWorkspace")?.dataset.overviewState === "filtered_empty");
    evidence.filter = await page.evaluate(() => {
      const visible = element => Boolean(element && element.getClientRects().length);
      const warnings = [document.querySelector("#overviewFilterEmptyState p"), ...document.querySelectorAll(".kpi-data-summary")]
        .filter(element => visible(element) && element.textContent.includes("Keine Positionen im aktuellen Filter"));
      return {
        rawRows: window.__obsoliqTestBridge.getState().rawRows,
        overviewRows: window.__obsoliqTestBridge.getOverviewRows().length,
        state: document.getElementById("overviewWorkspace")?.dataset.overviewState || "",
        centralVisible: visible(document.getElementById("overviewFilterEmptyState")),
        resetVisible: visible(document.querySelector("#overviewFilterEmptyState [data-overview-reset]")),
        filtersVisible: visible(document.getElementById("overviewGlobalFilterBlock")),
        foundationVisible: visible(document.getElementById("dataPackagesPanel")),
        analysisVisible: visible(document.querySelector(".overview-main")),
        warningCount: warnings.length
      };
    });
    assert.deepEqual(evidence.filter, {
      rawRows: 102,
      overviewRows: 0,
      state: "filtered_empty",
      centralVisible: true,
      resetVisible: true,
      filtersVisible: true,
      foundationVisible: true,
      analysisVisible: false,
      warningCount: 1
    });
    assertionCount += 1;
    await page.locator("[data-process='inventory-explorer']").click();
    equal(await page.locator("#overviewFilterEmptyState").evaluate(element => element.getClientRects().length), 0, "Overview filter message does not leak into another area");
    await page.locator("[data-process='overview']").click();
    check(await page.locator("#overviewFilterEmptyState [data-overview-reset]").isVisible(), "Central reset remains visible when returning to Overview");
    await page.locator("#overviewFilterEmptyState [data-overview-reset]").click();
    await page.waitForFunction(() => window.__obsoliqTestBridge.getOverviewRows().length === 102 && document.getElementById("overviewWorkspace")?.dataset.overviewState === "loaded");

    const beforeFailure = await stableProductSnapshot(page);
    const failedImport = await page.evaluate(() => {
      const csv = [
        "Material Number,Material Description,Stock Value EUR,Profit Center,Program,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value",
        "MAT-FAILED,Forced import failure,100,PC-F,Program F,0,0,0,0"
      ].join("\n");
      return window.__obsoliqTestBridge.loadUserInventoryTextForTest(csv, "forced-overview-failure.csv", {
        allowMappingReview: false,
        forceBuildErrorForTest: true,
        suppressErrorLog: true,
        preserveFailureFeedback: true
      });
    });
    equal(failedImport.status, "error", "Forced import fails through the productive transaction boundary");
    assert.deepEqual(await stableProductSnapshot(page), beforeFailure, "Failed import preserves the previous valid data state and visible KPI values");
    assertionCount += 1;
    const failedFeedback = await page.locator("#actionFeedback").evaluate(element => ({
      text: element.textContent.trim(),
      className: element.className
    }));
    check(failedFeedback.className.includes("error"), `Failed import is shown in addition to retained analysis: ${JSON.stringify(failedFeedback)}`);
    check(await page.locator(".overview-main").isVisible(), "Retained analysis remains visible after a failed import");

    const zeroCsv = [
      "Material Number,Material Description,Stock Value (EUR),Profit Center,Program short,Excess (EUR),No Need / Conso EUR,No Need / No Con EUR,Bad Stock (EUR),No Plan (EUR),Plant",
      "MAT-TRUE-ZERO,Valid zero recovery material,100,PC-Z,Program Z,0,0,0,0,0,PLANT-Z"
    ].join("\n");
    const zeroResult = await page.evaluate(csv => window.__obsoliqTestBridge.loadUserInventoryTextForTest(csv, "overview-true-zero.csv", {
      allowMappingReview: false,
      suppressErrorLog: true,
      preserveFailureFeedback: true
    }), zeroCsv);
    equal(zeroResult.status, "loaded", "True-zero fixture loads through the product boundary");
    await page.locator('[data-kpi-details="recovery"]').click();
    const zeroState = await page.evaluate(() => ({
      recovery: document.getElementById("mRecovery")?.textContent.trim() || "",
      share: document.getElementById("mShare")?.textContent.trim() || "",
      recoveryUnavailable: document.getElementById("mRecovery")?.classList.contains("metric-value-unavailable"),
      shareUnavailable: document.getElementById("mShare")?.classList.contains("metric-value-unavailable"),
      exact: document.querySelector("#overviewKpiDetailDialog [data-kpi-exact-value]")?.textContent.replace(/\s+/gu, " ").trim() || ""
    }));
    check(!zeroState.recoveryUnavailable && /^0(?:\s|$)/.test(zeroState.recovery), "A complete Recovery zero remains a real zero");
    check(!zeroState.shareUnavailable && zeroState.share.includes("0 %"), "A complete Recovery Share zero remains a real zero percent");
    check(zeroState.exact.includes("0,00"), "Exact Recovery displays a genuine zero with two decimals");
    await page.keyboard.press("Escape");

    const missingCsv = [
      "Material Number,Material Description,Stock Value (EUR),Profit Center,Program short,Excess (EUR),No Need / Conso EUR,No Need / No Con EUR,Bad Stock (EUR),No Plan (EUR),Plant",
      "MAT-MISSING,Missing stock value,,PC-M,Program M,0,0,0,0,0,PLANT-M"
    ].join("\n");
    const missingResult = await page.evaluate(csv => window.__obsoliqTestBridge.loadUserInventoryTextForTest(csv, "overview-missing.csv", {
      allowMappingReview: false,
      suppressErrorLog: true,
      preserveFailureFeedback: true
    }), missingCsv);
    equal(missingResult.status, "loaded", "Missing-value fixture loads without inventing data");
    await page.locator('[data-kpi-details="inventory"]').click();
    const missingState = await page.evaluate(() => ({
      inventoryUnavailable: document.getElementById("mInventory")?.classList.contains("metric-value-unavailable"),
      recoveryUnavailable: document.getElementById("mRecovery")?.classList.contains("metric-value-unavailable"),
      inventoryText: document.getElementById("mInventory")?.textContent.trim() || "",
      exactHidden: !document.querySelector("#overviewKpiDetailDialog [data-kpi-exact-value]"),
      exactText: document.querySelector("#overviewKpiDetailDialog [data-kpi-exact-value]")?.textContent.trim() || ""
    }));
    check(missingState.inventoryUnavailable && missingState.recoveryUnavailable, "Missing Stock remains unavailable rather than zero");
    check(!/^0(?:\s|$)/.test(missingState.inventoryText) && missingState.exactHidden && missingState.exactText === "", "Missing value has no stale exact-zero presentation");

    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      const bridge = window.__obsoliqTestBridge;
      const snapshot = bridge.snapshotDatasetRuntimeState();
      const activeInventoryPackageId = bridge.getState().activeInventoryPackageId;
      const inventoryPackage = snapshot.dataPackageRegistrySnapshot.packages
        .find(record => record.packageId === activeInventoryPackageId);
      if (!inventoryPackage) throw new Error("Active Inventory package missing from unusable-state fixture");
      snapshot.normalizedRows = [];
      snapshot.enrichedRows = [];
      snapshot.dataQualityIssues = [];
      snapshot.dataPackageRegistrySnapshot = {
        ...snapshot.dataPackageRegistrySnapshot,
        packages: snapshot.dataPackageRegistrySnapshot.packages.map(record => (
          record.packageId === activeInventoryPackageId
            ? { ...record, buildData: { ...record.buildData, analyticalRowCount: 0 } }
            : record
        ))
      };
      bridge.restoreDatasetRuntimeState(snapshot, { syncUi: false, restoreUi: false });
      bridge.renderRestoredDatasetState();
      bridge.restoreHeaderDataStatusForTest();
    });
    const unusableState = await page.evaluate(() => {
      const bridge = window.__obsoliqTestBridge;
      const feedback = document.getElementById("actionFeedback");
      const icon = feedback?.querySelector("[data-oq-icon='data-loaded']");
      const start = document.getElementById("overviewEmptyState");
      const visible = element => Boolean(element?.getClientRects().length);
      return {
        activePackage: Boolean(bridge.getActiveInventoryPackage()),
        overviewState: document.getElementById("overviewWorkspace")?.dataset.overviewState || "",
        feedback: feedback?.textContent.trim() || "",
        feedbackError: feedback?.classList.contains("error"),
        feedbackOk: feedback?.classList.contains("ok"),
        loadedIconVisible: Boolean(icon?.getClientRects().length),
        foundationVisible: visible(document.getElementById("dataPackagesPanel")),
        startVisible: visible(start),
        title: start?.querySelector("[data-empty-state-title]")?.textContent.trim() || "",
        body: start?.querySelector("[data-empty-state-body]")?.textContent.trim() || "",
        analysisVisible: visible(document.querySelector(".overview-main")),
        filtersVisible: visible(document.getElementById("overviewGlobalFilterBlock")),
        dashboardVisible: visible(document.getElementById("view-dashboard")),
        reviewVisible: visible(start?.querySelector("[data-empty-review-source]")),
        reviewDisabled: Boolean(start?.querySelector("[data-empty-review-source]")?.disabled)
      };
    });
    assert.deepEqual(unusableState, {
      activePackage: true,
      overviewState: "unusable",
      feedback: "Importierte Bestandsquelle nicht verwendbar",
      feedbackError: true,
      feedbackOk: false,
      loadedIconVisible: false,
      foundationVisible: true,
      startVisible: true,
      title: "Importierte Bestandsquelle nicht verwendbar",
      body: "Die importierte Quelle enth\u00e4lt keine analytisch verwendbaren Bestandszeilen. Pr\u00fcfe Import und Datenqualit\u00e4t oder lade eine andere Quelle.",
      analysisVisible: false,
      filtersVisible: false,
      dashboardVisible: false,
      reviewVisible: true,
      reviewDisabled: false
    });
    assertionCount += 1;
    await page.locator("[data-empty-review-source]").click();
    await page.waitForFunction(() => {
      const details = document.querySelector("[data-data-foundation]");
      return details?.open && document.activeElement === details.querySelector(":scope > summary");
    });
    check(await page.locator("[data-data-foundation]").isVisible(), "Unusable-source review action opens and focuses the visible Data Foundation detail");
    await page.keyboard.press("Escape");

    const reviewContext = await browser.newContext({ viewport: VIEWPORTS[0], reducedMotion: "reduce" });
    const reviewPage = await openProductPage(reviewContext, diagnostics);
    const reviewResult = await reviewPage.evaluate(() => {
      const bridge = window.__obsoliqTestBridge;
      const parsed = window.ObsoliQ.data.sourceModel.buildParsedSourceDataset(
        ["material_id", "stock_value", "Base Unit", "Base Unit", "standard_price"],
        [["MAT-REVIEW", "100", "EA", "KG", "10 EUR"]]
      );
      const result = bridge.beginUploadWithParsedData(parsed, "overview-review.csv", {
        sourceType: "upload",
        allowMappingReview: true,
        suppressErrorLog: true
      });
      const workspace = document.getElementById("overviewWorkspace");
      const start = document.getElementById("overviewEmptyState");
      return {
        status: result.status,
        state: workspace.dataset.overviewState,
        title: start.querySelector("[data-empty-state-title]")?.textContent.trim() || "",
        body: start.querySelector("[data-empty-state-body]")?.textContent.trim() || "",
        actionsVisible: Boolean(start.querySelector("[data-empty-state-actions]")?.getClientRects().length),
        mappingOpen: document.getElementById("mappingModal")?.classList.contains("active"),
        feedbackOk: document.getElementById("actionFeedback")?.classList.contains("ok")
      };
    });
    assert.deepEqual(reviewResult, {
      status: "mapping",
      state: "review",
      title: "Importprüfung erforderlich",
      body: "Prüfe die erkannten Spalten und bestätige die Zuordnung, bevor die Bestandsanalyse startet.",
      actionsVisible: false,
      mappingOpen: true,
      feedbackOk: false
    });
    assertionCount += 1;
    await reviewPage.locator("#mappingCancelButton").click();
    await reviewPage.waitForFunction(() => document.getElementById("overviewWorkspace")?.dataset.overviewState === "missing");
    equal(await reviewPage.locator("[data-empty-state-title]").textContent(), "Bestandsanalyse starten", "Cancelling import review returns to the neutral startup state");
    await reviewContext.close();

    const reloadContext = await browser.newContext({ viewport: VIEWPORTS[0], reducedMotion: "reduce" });
    const reloadPage = await openProductPage(reloadContext, diagnostics);
    await reloadPage.locator("#overviewEmptyState [data-empty-load-sample]").click();
    await reloadPage.waitForFunction(() => {
      const bridge = window.__obsoliqTestBridge;
      const workspace = document.getElementById("overviewWorkspace");
      return bridge?.getState().rawRows === 102
        && bridge.getRegistryStats().packageCount === 3
        && workspace?.dataset.overviewState === "loaded"
        && !workspace?.dataset.dataOperation;
    }, null, { timeout: 30000 });
    await reloadPage.reload({ waitUntil: "load" });
    await reloadPage.waitForFunction(() => Boolean(window.__obsoliqTestBridge));
    const reloaded = await startupState(reloadPage);
    check(reloaded.rawRows === 0 && reloaded.packageCount === 0 && reloaded.state === "missing", "Reload after a loaded demo returns to a fresh missing-source state without automatic activation");
    check(reloaded.emptyVisible && reloaded.primaryVisible && !reloaded.analysisVisible && reloaded.iconDisplay === "none", "Reload restores the neutral visible startup instead of persisted demo analysis");
    await reloadContext.close();

    assert.deepEqual(diagnostics.pageErrors, []);
    assertionCount += 1;
    assert.deepEqual(diagnostics.consoleErrors, []);
    assertionCount += 1;
    assert.deepEqual(diagnostics.externalRequests, []);
    assertionCount += 1;

    console.log(JSON.stringify({
      status: "PASS",
      assertions: assertionCount,
      evidence,
      screenshots,
      diagnostics
    }, null, 2));
    await mainContext.close();
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
