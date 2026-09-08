// SYNTHETIC TEST DATA. Focused visible-state regression for VISIBLE-DEMO-ACTIVATION-01.
"use strict";

const assert = require("node:assert/strict");
const {
  chromium,
  productUrl,
  optionalScreenshotEnabled,
  captureScreenshot,
  screenshotName
} = require("./smoke-runtime.cjs");

let assertionCount = 0;
function check(value, message) {
  assertionCount += 1;
  assert.ok(value, message);
}

function pageDiagnostics(page, bucket) {
  page.on("pageerror", error => bucket.pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") bucket.consoleErrors.push(message.text());
  });
  page.on("request", request => {
    if (/^https?:/i.test(request.url())) bucket.externalRequests.push(request.url());
  });
}

async function coreState(page) {
  return page.evaluate(() => {
    const bridge = window.__obsoliqTestBridge;
    const state = bridge.getState();
    const inventory = bridge.getActiveInventoryPackage();
    return {
      datasetId: state.currentDatasetId,
      rawRows: state.rawRows,
      normalizedRows: state.normalizedRows,
      enrichedRows: state.enrichedRows,
      packageId: inventory?.packageId || "",
      packageRevision: inventory?.revision || 0,
      dataCorrections: state.dataCorrections,
      issueDecisions: state.issueDecisions,
      remediationActions: state.remediationActions,
      filterState: state.filterState,
      metrics: ["mInventory", "mExcess", "mBad", "mNoNeed", "mNoPlan", "mRecovery", "mShare"]
        .map(id => ({ id, text: document.getElementById(id)?.textContent || "", className: document.getElementById(id)?.className || "" }))
    };
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const diagnostics = { pageErrors: [], consoleErrors: [], externalRequests: [] };
  let screenshot = "";
  try {
    const productionContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const productionPage = await productionContext.newPage();
    pageDiagnostics(productionPage, diagnostics);
    await productionPage.goto(productUrl, { waitUntil: "domcontentloaded" });
    await productionPage.waitForFunction(() => Boolean(window.ObsoliQ?.data?.packageRegistry));
    await productionPage.waitForTimeout(300);

    const empty = await productionPage.evaluate(() => ({
      feedback: document.getElementById("actionFeedback")?.textContent.trim() || "",
      emptyText: document.getElementById("overviewEmptyState")?.textContent || "",
      emptyHidden: document.getElementById("overviewEmptyState")?.hidden,
      emptyVisible: getComputedStyle(document.getElementById("overviewEmptyState")).display !== "none",
      emptyState: document.getElementById("overviewEmptyState")?.dataset.emptyState || "",
      sampleActions: document.querySelectorAll("#overviewEmptyState [data-empty-load-sample]").length,
      uploadActions: document.querySelectorAll("#overviewEmptyState [data-empty-upload]").length,
      foundationText: document.getElementById("dataPackagesPanel")?.textContent || "",
      sourceTexts: [...document.querySelectorAll(".dataset-source-chip")].map(element => element.textContent.trim()),
      metrics: ["mInventory", "mExcess", "mBad", "mNoNeed", "mNoPlan", "mRecovery"]
        .map(id => ({ text: document.getElementById(id)?.textContent.trim() || "", unavailable: document.getElementById(id)?.classList.contains("metric-value-unavailable") })),
      shareText: document.getElementById("mShare")?.textContent.trim() || "",
      shareUnavailable: document.getElementById("mShare")?.classList.contains("metric-value-unavailable")
    }));

    assert.equal(empty.feedback, "Noch keine Daten geladen");
    assert.equal(empty.emptyHidden, false);
    assert.equal(empty.emptyVisible, true);
    assert.equal(empty.emptyState, "missing");
    check(empty.emptyText.includes("Noch keine Daten geladen"), "Empty start explains that no data has been loaded yet");
    check(empty.emptyText.includes("Beispieldaten laden") && empty.emptyText.includes("Datei hochladen"), "Empty start offers both productive load actions");
    assert.equal(empty.sampleActions, 1);
    assert.equal(empty.uploadActions, 1);
    check(!empty.foundationText.includes("Bestandsanalyse aktiv"), "Empty start does not claim an active inventory analysis");
    check(empty.sourceTexts.every(text => text === ""), "Empty start does not claim a sample source");
    check(empty.metrics.every(metric => metric.unavailable && !/^0(?:\s|$)/.test(metric.text)), "Empty start does not present calculated financial zeroes");
    assert.equal(empty.shareUnavailable, true);
    check(!empty.shareText.includes("0 %"), "Unavailable recovery share is not presented as zero percent");

    for (const [processKey, view, targetId] of [
      ["inventory-explorer", "inventory", "inventoryTable"],
      ["inventory-risks", "inventory-risks", "inventoryRisksPage"],
      ["actions", "actions", "actionsTable"],
      ["data-quality", "check", "dataCheck"]
    ]) {
      await productionPage.locator(`[data-process='${processKey}']`).click();
      await productionPage.waitForFunction(expected => document.getElementById("overviewWorkspace")?.dataset.view === expected, view);
      const viewEmpty = await productionPage.locator(`#${targetId} [data-dataset-empty-state='missing']`).textContent();
      check(viewEmpty.includes("Beispieldaten laden") && viewEmpty.includes("Datei hochladen"), `${processKey} preserves the productive no-dataset state after navigation`);
    }
    await productionContext.close();

    const demoContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    const page = await demoContext.newPage();
    pageDiagnostics(page, diagnostics);
    await page.addInitScript(() => { window.__OBSOLIQ_TEST_MODE__ = true; });
    await page.goto(productUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.__obsoliqTestBridge));

    const english = await page.evaluate(() => {
      const bridge = window.__obsoliqTestBridge;
      bridge.updateLanguageForTest("en");
      return {
        emptyText: document.getElementById("overviewEmptyState")?.textContent || "",
        translations: bridge.getTranslationsForTest().en
      };
    });
    check(english.emptyText.includes("No data loaded yet"), "English empty-state title is available");
    check(english.emptyText.includes("Load sample data") && english.emptyText.includes("Upload file"), "English empty-state actions are available");
    assert.equal(english.translations.noFilterMatches, "No results for these filters.");
    await page.evaluate(() => window.__obsoliqTestBridge.updateLanguageForTest("de"));

    await page.locator("#overviewEmptyState [data-empty-load-sample]").click();
    await page.waitForFunction(() => {
      const bridge = window.__obsoliqTestBridge;
      const state = bridge?.getState();
      const slowDead = bridge?.getSlowDeadRecoveryCaseRuntimeForTest();
      return state?.rawRows === 102
        && bridge.getRegistryStats().packageCount === 3
        && ["available", "limited"].includes(slowDead?.status)
        && document.getElementById("actionFeedback")?.textContent.trim() === "Daten geladen";
    }, null, { timeout: 30000 });

    const demo = await page.evaluate(() => {
      const bridge = window.__obsoliqTestBridge;
      const state = bridge.getState();
      const inventory = bridge.getActiveInventoryPackage();
      const master = bridge.getActiveMaterialMasterPackage();
      const history = bridge.getActiveConsumptionHistoryPackage();
      const slowDead = bridge.getSlowDeadRecoveryCaseRuntimeForTest();
      const rows = bridge.getEnrichedRowsForTest();
      const foundationModel = bridge.buildDataFoundationPresentationModelForTest();
      const metricFields = {
        mInventory: "stock_value",
        mExcess: "excess_value",
        mBad: "bad_stock_value",
        mNoNeed: "no_need_value",
        mNoPlan: "no_plan_value",
        mRecovery: "recovery_potential"
      };
      const metrics = Object.entries(metricFields).map(([id, fieldKey]) => {
        const element = document.getElementById(id);
        const aggregate = bridge.valueUtilsForTest.aggregateNumericValues(rows, {
          fieldKey,
          valueAccessor: row => row[fieldKey]
        });
        return {
          id,
          fieldKey,
          text: element?.textContent.trim() || "",
          unavailable: element?.classList.contains("metric-value-unavailable"),
          aggregate: {
            status: aggregate.status,
            valueAvailable: aggregate.value !== null,
            totalCount: aggregate.totalCount,
            validCount: aggregate.validCount,
            missingCount: aggregate.missingCount,
            invalidCount: aggregate.invalidCount,
            ambiguousCount: aggregate.ambiguousCount
          }
        };
      });
      return {
        state,
        sourceRows: {
          inventory: inventory?.sourceDescriptor?.rows,
          materialMaster: master?.sourceDescriptor?.rows,
          consumptionHistory: history?.sourceDescriptor?.rows
        },
        packageTypes: [inventory?.packageType, master?.packageType, history?.packageType],
        slowDeadStatus: slowDead?.status,
        slowDeadCases: slowDead?.result?.cases?.length || 0,
        metrics,
        share: {
          text: document.getElementById("mShare")?.textContent.trim() || "",
          unavailable: document.getElementById("mShare")?.classList.contains("metric-value-unavailable")
        },
        rowText: document.getElementById("mRows")?.textContent.trim() || "",
        emptyHidden: document.getElementById("overviewEmptyState")?.hidden,
        emptyVisible: getComputedStyle(document.getElementById("overviewEmptyState")).display !== "none",
        foundationText: document.getElementById("dataPackagesPanel")?.textContent || "",
        foundationValidity: {
          inventory: foundationModel.sources.inventory.validity.key,
          materialMaster: foundationModel.sources.materialMaster.validity.key,
          consumptionHistory: foundationModel.sources.consumptionHistory.validity.key
        }
      };
    });

    assert.equal(demo.state.rawRows, 102);
    assert.deepEqual(demo.sourceRows, { inventory: 102, materialMaster: 98, consumptionHistory: 2260 });
    assert.deepEqual(demo.packageTypes, ["inventory_snapshot", "material_master", "consumption_history"]);
    assert.equal(demo.slowDeadCases, 20);
    check(["available", "limited"].includes(demo.slowDeadStatus), "Slow/Dead runtime reaches a usable terminal state");
    check(demo.rowText.includes("102"), "Overview visibly reports all 102 inventory rows");
    assert.equal(demo.emptyHidden, true);
    assert.equal(demo.emptyVisible, false);
    check(demo.foundationText.includes("Bestandsanalyse aktiv"), "Loaded demo visibly reports an active inventory analysis");
    assert.deepEqual(demo.foundationValidity, { inventory: "valid", materialMaster: "valid", consumptionHistory: "valid" });
    check(demo.metrics.some(metric => !metric.unavailable), "At least one demo financial metric is calculable");
    check(demo.metrics.every(metric => metric.unavailable ? !/^0(?:\s|$)/.test(metric.text) : metric.text.length > 0), "Unavailable and calculable demo metrics remain visibly distinct");
    check(demo.metrics.every(metric => metric.unavailable === !metric.aggregate.valueAvailable), "Visible demo metric availability matches strict source aggregation evidence");
    check(demo.share.unavailable ? !demo.share.text.includes("0 %") : demo.share.text.includes("%"), "Recovery share never fabricates availability");

    if (optionalScreenshotEnabled()) {
      screenshot = await captureScreenshot(page, screenshotName("visible-demo-activation-01", "loaded-demo.png"), { fullPage: true });
    }

    await page.locator("[data-process='inventory-explorer']").click();
    await page.waitForFunction(() => document.getElementById("overviewWorkspace")?.dataset.view === "inventory");
    check(await page.locator("#inventoryTable tbody tr").count() > 0, "Inventory Explorer visibly contains rows");

    await page.locator("[data-process='inventory-risks']").click();
    await page.waitForFunction(() => document.getElementById("overviewWorkspace")?.dataset.view === "inventory-risks");
    check(await page.locator("#inventoryRisksPage tr[data-inventory-risk-case]").count() > 0, "Inventory Risks visibly contains cases");

    await page.evaluate(() => window.__obsoliqTestBridge.switchSlowDeadPageForTest());
    assert.equal(await page.locator("#slowDeadPage tr[data-slow-dead-case-id]").count(), 20);

    await page.locator("[data-process='overview']").click();
    await page.locator("#overviewGlobalSearch").fill("__VISIBLE_DEMO_NO_MATCH__");
    await page.waitForFunction(() => document.getElementById("topTable")?.textContent.includes("Keine Treffer für diese Filter"));
    const filtered = await page.evaluate(() => ({
      rawRows: window.__obsoliqTestBridge.getState().rawRows,
      activePackageId: window.__obsoliqTestBridge.getState().activeInventoryPackageId,
      overviewRows: window.__obsoliqTestBridge.getOverviewRows().length,
      emptyHidden: document.getElementById("overviewEmptyState")?.hidden,
      emptyVisible: getComputedStyle(document.getElementById("overviewEmptyState")).display !== "none",
      resetVisible: Boolean(document.querySelector("#topTable [data-reset-filters]"))
    }));
    assert.equal(filtered.rawRows, 102);
    check(Boolean(filtered.activePackageId), "Filter-empty state keeps the active Inventory package");
    assert.equal(filtered.overviewRows, 0);
    assert.equal(filtered.emptyHidden, true);
    assert.equal(filtered.emptyVisible, false);
    assert.equal(filtered.resetVisible, true);
    await page.locator("#topTable [data-reset-filters]").click();
    await page.waitForFunction(() => document.querySelectorAll("#topTable .overview-top-list-row[role='row']").length > 1);

    const zeroCsv = [
      "Material Number,Material Description,Stock Value EUR,Profit Center,Program,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value",
      "MAT-TRUE-ZERO,Valid zero recovery material,100,PC-Z,Program Z,0,0,0,0"
    ].join("\n");
    const zeroLoad = await page.evaluate(csv => window.__obsoliqTestBridge.loadUserInventoryTextForTest(csv, "true-zero.csv", {
      allowMappingReview: false,
      suppressErrorLog: true,
      preserveFailureFeedback: true
    }), zeroCsv);
    assert.equal(zeroLoad.status, "loaded");
    const zero = await page.evaluate(() => ({
      recoveryText: document.getElementById("mRecovery")?.textContent.trim() || "",
      recoveryUnavailable: document.getElementById("mRecovery")?.classList.contains("metric-value-unavailable"),
      shareText: document.getElementById("mShare")?.textContent.trim() || "",
      shareUnavailable: document.getElementById("mShare")?.classList.contains("metric-value-unavailable"),
      inventoryText: document.getElementById("mInventory")?.textContent.trim() || ""
    }));
    assert.equal(zero.recoveryUnavailable, false);
    check(/^0(?:\s|$)/.test(zero.recoveryText), "A genuine calculated recovery zero remains zero");
    assert.equal(zero.shareUnavailable, false);
    check(zero.shareText.includes("0 %"), "A genuine calculated zero share remains zero percent");
    check(!/^0(?:\s|$)/.test(zero.inventoryText), "The valid zero case still has a positive inventory basis");

    const beforeCancel = await coreState(page);
    let confirmationSeen = false;
    page.once("dialog", async dialog => {
      confirmationSeen = true;
      await dialog.dismiss();
    });
    await page.locator("#sampleButton").click();
    await page.waitForTimeout(50);
    const afterCancel = await coreState(page);
    assert.equal(confirmationSeen, true);
    assert.deepEqual(afterCancel, beforeCancel, "Cancelling demo replacement must preserve user state and visible metrics");

    const beforeFailure = await coreState(page);
    const failed = await page.evaluate(csv => window.__obsoliqTestBridge.loadUserInventoryTextForTest(csv, "forced-failure.csv", {
      allowMappingReview: false,
      forceBuildErrorForTest: true,
      suppressErrorLog: true,
      preserveFailureFeedback: true
    }), zeroCsv.replace("MAT-TRUE-ZERO", "MAT-FAILED"));
    const afterFailure = await coreState(page);
    assert.equal(failed.status, "error");
    assert.deepEqual(afterFailure, beforeFailure, "Failed import must preserve user state and visible metrics");

    const unusable = await page.evaluate(() => {
      const bridge = window.__obsoliqTestBridge;
      const model = bridge.buildDataFoundationPresentationModelForTest({
        inventoryPackage: {
          packageId: "PKG-UNUSABLE",
          packageType: "inventory_snapshot",
          status: "active",
          sourceDescriptor: { rows: 1 },
          packageValidation: { statusKey: "valid" },
          buildData: { analyticalRowCount: 0 }
        },
        materialMasterPackage: null,
        consumptionHistoryPackage: null
      });
      return {
        state: model.sourceStates.inventory,
        validity: model.sources.inventory.validity,
        activeLabel: bridge.getTranslationsForTest().de.dataFoundationInventoryActive
      };
    });
    assert.equal(unusable.state.className, "invalid");
    assert.equal(unusable.validity.key, "unusable");
    check(unusable.validity.label.includes("nicht analytisch nutzbar"), "Imported source without analytical rows receives a concrete data-quality message");
    check(unusable.state.text !== unusable.activeLabel, "Unusable imported source is not presented as an active analysis");

    await page.evaluate(() => {
      const bridge = window.__obsoliqTestBridge;
      window.__visibleDemoUsableSnapshot = bridge.snapshotDatasetRuntimeState();
      const snapshot = bridge.snapshotDatasetRuntimeState();
      snapshot.normalizedRows = [];
      snapshot.enrichedRows = [];
      snapshot.dataQualityIssues = [];
      const activeInventoryPackageId = bridge.getState().activeInventoryPackageId;
      const inventoryPackage = snapshot.dataPackageRegistrySnapshot.packages
        .find(record => record.packageId === activeInventoryPackageId);
      if (!inventoryPackage) throw new Error("Active Inventory package missing from test snapshot");
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
      bridge.updateLanguageForTest("de");
    });
    await page.waitForFunction(() => document.querySelector("#actionFeedback .action-feedback-text")?.textContent.trim() === "Importierte Bestandsquelle nicht verwendbar", null, { timeout: 3000 });
    const unusableUi = await page.evaluate(() => {
      const bridge = window.__obsoliqTestBridge;
      const inventoryPackage = bridge.getActiveInventoryPackage();
      const container = document.createElement("div");
      container.innerHTML = bridge.renderInventoryDataFoundationSourceRowForTest(inventoryPackage);
      const row = container.firstElementChild;
      return {
        feedback: document.querySelector("#actionFeedback .action-feedback-text")?.textContent.trim() || "",
        datasetStatuses: [...document.querySelectorAll(".dataset-status-text")].map(element => element.textContent.trim()),
        datasetStates: [...document.querySelectorAll(".dataset-status-text")].map(element => element.closest(".dataset-chip")?.classList.contains("state")),
        overviewState: document.getElementById("overviewEmptyState")?.dataset.emptyState || "",
        foundationText: document.getElementById("dataPackagesPanel")?.textContent || "",
        rowText: row?.textContent || "",
        rowClass: row?.className || ""
      };
    });
    assert.equal(unusableUi.feedback, "Importierte Bestandsquelle nicht verwendbar");
    check(unusableUi.datasetStatuses.every(text => text === unusableUi.feedback), "Unusable source keeps header and dataset chips consistent");
    check(unusableUi.datasetStates.every(active => active === false), "Unusable source does not use the loaded-state indicator");
    assert.equal(unusableUi.overviewState, "unusable");
    check(unusableUi.foundationText.includes("Importiert, aber noch nicht analytisch nutzbar.") && !unusableUi.foundationText.includes("Bestandsanalyse aktiv"), "Data Foundation marks the unusable Inventory source with the concrete diagnostic");
    check(unusableUi.rowText.includes("Importiert, aber noch nicht analytisch nutzbar.") && !unusableUi.rowText.includes("Aktiv"), "Unusable Inventory source row shows the concrete diagnostic instead of Active");
    check(unusableUi.rowClass.includes("invalid") && unusableUi.rowClass.includes("diagnostic") && !unusableUi.rowClass.includes("compact-active"), "Unusable Inventory source row uses the diagnostic presentation");

    await page.locator("[data-process='inventory-explorer']").click();
    await page.waitForFunction(() => document.getElementById("overviewWorkspace")?.dataset.view === "inventory");
    const unusableViewText = await page.locator("#inventoryTable [data-dataset-empty-state='unusable']").textContent();
    check(unusableViewText.includes("Importierte Bestandsquelle nicht verwendbar") && unusableViewText.includes("Datei hochladen"), "Unusable source remains concrete and actionable after navigation");
    await page.evaluate(() => {
      const bridge = window.__obsoliqTestBridge;
      bridge.restoreDatasetRuntimeState(window.__visibleDemoUsableSnapshot, { syncUi: false, restoreUi: false });
      bridge.renderRestoredDatasetState();
      delete window.__visibleDemoUsableSnapshot;
    });

    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.externalRequests, []);
    await demoContext.close();

    console.log(JSON.stringify({
      status: "PASS",
      assertions: assertionCount,
      empty,
      demo: {
        sourceRows: demo.sourceRows,
        packageTypes: demo.packageTypes,
        slowDeadStatus: demo.slowDeadStatus,
        slowDeadCases: demo.slowDeadCases,
        metrics: demo.metrics,
        share: demo.share
      },
      filtered,
      zero,
      cancellationPreserved: true,
      failedImportPreserved: true,
      unusableSourceState: unusable,
      unusableUi,
      screenshot,
      diagnostics
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
