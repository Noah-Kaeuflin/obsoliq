// SYNTHETIC TEST DATA. Focused product regression for KPI-AVAILABILITY-01.
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

function near(actual, expected, message) {
  assertionCount += 1;
  assert.ok(Math.abs(Number(actual) - expected) < 0.001, message + ": expected " + expected + ", received " + actual);
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

async function loadCsv(page, csv, sourceLabel) {
  return page.evaluate(input => window.__obsoliqTestBridge.loadUserInventoryTextForTest(
    input.csv,
    input.sourceLabel,
    {
      allowMappingReview: false,
      suppressErrorLog: true,
      preserveFailureFeedback: true
    }
  ), { csv, sourceLabel });
}

async function visibleKpiState(page) {
  return page.evaluate(() => {
    const ids = ["Inventory", "Excess", "Bad", "NoNeed", "NoPlan", "Recovery"];
    const record = {};
    ids.forEach(name => {
      const coverage = document.getElementById("m" + name + "Coverage");
      const partial = document.getElementById("m" + name + "Partial");
      const action = document.getElementById("m" + name + "Review");
      const value = document.getElementById("m" + name);
      record[name] = {
        value: value?.textContent.trim() || "",
        unavailable: value?.classList.contains("metric-value-unavailable"),
        coverage: coverage?.textContent.trim() || "",
        coverageHidden: Boolean(coverage?.hidden || coverage?.classList.contains("hidden")),
        partial: partial?.textContent.trim() || "",
        partialTitle: partial?.title || "",
        partialHidden: Boolean(partial?.hidden || partial?.classList.contains("hidden")),
        action: action?.textContent.trim() || "",
        actionHidden: Boolean(action?.hidden || action?.classList.contains("hidden"))
      };
    });
    const shareCoverage = document.getElementById("mShareCoverage");
    const shareAction = document.getElementById("mShareReview");
    const shareValue = document.getElementById("mShare");
    record.Share = {
      value: shareValue?.textContent.trim() || "",
      labelledValue: shareValue?.parentElement?.textContent.trim() || "",
      unavailable: shareValue?.classList.contains("metric-value-unavailable"),
      coverage: shareCoverage?.textContent.trim() || "",
      coverageHidden: Boolean(shareCoverage?.hidden || shareCoverage?.classList.contains("hidden")),
      action: shareAction?.textContent.trim() || "",
      actionHidden: Boolean(shareAction?.hidden || shareAction?.classList.contains("hidden"))
    };
    return record;
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const diagnostics = { pageErrors: [], consoleErrors: [], externalRequests: [] };
  let screenshot = "";
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce"
    });
    const page = await context.newPage();
    pageDiagnostics(page, diagnostics);
    await page.addInitScript(() => { window.__OBSOLIQ_TEST_MODE__ = true; });
    await page.goto(productUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.__obsoliqTestBridge));

    const empty = await visibleKpiState(page);
    check(["Inventory", "Excess", "Bad", "NoNeed", "NoPlan", "Recovery"].every(name => empty[name].unavailable), "No-data state keeps every financial KPI unavailable");
    check(["Inventory", "Excess", "Bad", "NoNeed", "NoPlan", "Recovery"].every(name => !/^0(?:\s|$)/.test(empty[name].value)), "No-data state never fabricates a financial zero");
    check(empty.Share.unavailable && !empty.Share.value.includes("0 %"), "No-data state never fabricates a recovery share");
    check(["Inventory", "Excess", "Bad", "NoNeed", "NoPlan", "Recovery", "Share"].every(name => empty[name].actionHidden), "No-data state has no stale affected-data action");

    await page.locator("#overviewEmptyState [data-empty-load-sample]").click();
    await page.waitForFunction(() => {
      const bridge = window.__obsoliqTestBridge;
      return bridge?.getState().rawRows === 102
        && bridge.getRegistryStats().packageCount === 3
        && document.getElementById("actionFeedback")?.textContent.trim() === "Daten geladen";
    }, null, { timeout: 30000 });

    const demo = await page.evaluate(() => {
      const bridge = window.__obsoliqTestBridge;
      const models = bridge.buildKpiAvailabilityModelsForTest();
      const rows = bridge.getEnrichedRowsForTest();
      const unsafeExcessPartial = bridge.valueUtilsForTest.aggregateNumericValues(rows, {
        fieldKey: "excess_value",
        valueAccessor: row => row.excess_value,
        allowPartial: true
      });
      return {
        models,
        unsafeExcessPartial: unsafeExcessPartial.value,
        activePackage: bridge.getActiveInventoryPackage(),
        state: bridge.getState()
      };
    });
    const demoUi = await visibleKpiState(page);

    assert.equal(demo.state.rawRows, 102);
    assert.equal(demo.activePackage.packageType, "inventory_snapshot");
    assert.equal(demo.activePackage.revision, 2);
    assert.equal(demo.models.inventory.strictAggregate.value, null);
    assert.equal(demo.models.inventory.strictAggregate.validCount, 101);
    assert.equal(demo.models.inventory.causes.length, 1);
    assert.equal(demo.models.inventory.causes[0].sourceRowIndex, 56);
    assert.equal(demo.models.inventory.causes[0].materialId, "MAT-1056");
    assert.equal(demo.models.inventory.causes[0].plant, "PLANT-01");
    assert.equal(demo.models.inventory.causes[0].canonicalField, "stock_value");
    assert.equal(demo.models.inventory.causes[0].sourceColumn, "Stock Value (EUR)");
    assert.equal(demo.models.inventory.causes[0].sourceIndex, 31);
    assert.equal(demo.models.inventory.causes[0].rawValue, "abc");
    assert.equal(demo.models.inventory.causes[0].kind, "invalid");
    check(demo.models.inventory.causes[0].normalizationCodes.join(" ").includes("numeric_digits_missing"), "Invalid stock cause preserves the physical normalization diagnostic");
    assert.equal(demo.models.inventory.causes[0].packageId, demo.activePackage.packageId);
    assert.equal(demo.models.inventory.causes[0].packageRevision, demo.activePackage.revision);
    near(demo.models.inventory.partial.value, 4703268.7, "Inventory safe subtotal");

    assert.equal(demo.models.excess.strictAggregate.value, null);
    assert.deepEqual(demo.models.excess.causes.map(cause => [cause.sourceRowIndex, cause.kind, cause.blocksMetric]), [
      [45, "missing", true],
      [66, "negative", false]
    ]);
    assert.equal(demo.models.excess.partial.kind, "nonnegative_projection");
    assert.equal(demo.models.excess.partial.validCount, 100);
    near(demo.models.excess.partial.value, 424480, "Excess safe non-negative projection");
    near(demo.unsafeExcessPartial, 421980, "Generic partial still includes the negative input and remains separate");

    assert.equal(demo.models.blocked.causes[0].sourceRowIndex, 45);
    assert.equal(demo.models.blocked.causes[0].sourceColumn, "Bad Stock (EUR)");
    assert.equal(demo.models.blocked.causes[0].kind, "missing");
    near(demo.models.blocked.partial.value, 117003.3, "Blocked/QI safe subtotal");

    assert.equal(demo.models.noDemand.strictAggregate.status, "complete");
    near(demo.models.noDemand.strictAggregate.value, 223309.7, "No-demand complete KPI");
    assert.equal(demo.models.noDemand.causes.length, 0);
    assert.equal(demo.models.noDemand.partial.status, "not_needed");

    assert.equal(demo.models.noPlan.causes[0].sourceRowIndex, 45);
    assert.equal(demo.models.noPlan.causes[0].sourceColumn, "No Plan (EUR)");
    near(demo.models.noPlan.partial.value, 26781.4, "No-plan safe subtotal");

    assert.equal(demo.models.recovery.causes.length, 1);
    assert.equal(demo.models.recovery.causes[0].sourceRowIndex, 56);
    assert.equal(demo.models.recovery.causes[0].canonicalField, "stock_value");
    assert.equal(demo.models.recovery.causes[0].dependencyKey, "kpiDependencyRecoveryStock");
    near(demo.models.recovery.partial.value, 779220.4, "Recovery safe subtotal");

    assert.equal(demo.models.share.strictAggregate.value, null);
    assert.equal(demo.models.share.strictAggregate.validCount, 101);
    assert.equal(demo.models.share.relevantCount, 102);
    assert.equal(demo.models.share.causes.length, 1);
    assert.equal(demo.models.share.causes[0].sourceRowIndex, 56);
    assert.equal(demo.models.share.causes[0].dependencyKey, "kpiDependencyShareBoth");
    assert.equal(demo.models.share.partial.status, "not_allowed");
    assert.equal(demo.models.share.partial.value, null);

    check(demoUi.Inventory.coverage.includes("101 von 102") && demoUi.Inventory.coverage.includes("102 importiert") && demoUi.Inventory.coverage.includes("ungültig"), "Inventory card explains exact usable/imported coverage and invalid cause");
    check(demoUi.Inventory.partial.includes("Summe der bewertbaren Positionen") && demoUi.Inventory.partial.includes("unvollständig"), "Inventory card labels the subtotal as incomplete");
    check(demoUi.Excess.coverage.includes("100 von 102") && demoUi.Excess.coverage.includes("1 fehlend") && demoUi.Excess.coverage.includes("1 negativ"), "Excess card separates missing and negative causes");
    check(demoUi.Excess.partial.includes("nichtnegativen") && demoUi.Excess.partial.includes("Projektion"), "Excess card labels the non-negative subset as a projection");
    check(demoUi.NoNeed.coverageHidden && demoUi.NoNeed.partialHidden && demoUi.NoNeed.actionHidden, "Complete no-demand KPI has no availability warning");
    check(demoUi.Share.coverage.includes("101 von 102") && demoUi.Share.coverage.includes("102 importiert") && demoUi.Share.coverage.includes("vollständiger Recovery-Wert"), "Recovery share explains both coverage and complete-input dependency");
    check(demoUi.Share.labelledValue.startsWith("Recovery-Anteil:"), "The secondary unavailable value is visibly labelled as Recovery Share");
    check(demoUi.Recovery.action === "Recovery-Potenzial prüfen" && demoUi.Share.action === "Recovery-Anteil prüfen", "The two recovery-card actions have unambiguous metric labels");
    check(demoUi.Share.actionHidden === false, "Unavailable recovery share offers exact affected-data navigation");

    if (optionalScreenshotEnabled()) {
      screenshot = await captureScreenshot(page, screenshotName("kpi-availability-01", "demo-kpi-availability.png"), { fullPage: true });
    }

    await page.locator("#overviewGlobalSearch").fill("__KPI_NO_MATCH__");
    await page.waitForFunction(() => window.__obsoliqTestBridge.getOverviewRows().length === 0);
    const filteredUi = await visibleKpiState(page);
    const filteredState = await page.evaluate(() => ({
      overviewState: document.getElementById("overviewWorkspace")?.dataset.overviewState || "",
      message: document.getElementById("overviewFilterEmptyState")?.textContent.trim() || "",
      messageVisible: getComputedStyle(document.getElementById("overviewFilterEmptyState")).display !== "none",
      analysisVisible: getComputedStyle(document.querySelector(".overview-main")).display !== "none",
      dashboardVisible: getComputedStyle(document.getElementById("view-dashboard")).display !== "none",
      visibleCoverageMessages: [...document.querySelectorAll("[id$='Coverage']")]
        .filter(element => getComputedStyle(element).display !== "none")
        .map(element => element.textContent.trim())
    }));
    assert.equal(filteredState.overviewState, "filtered_empty");
    check(filteredState.messageVisible && filteredState.message.includes("Keine Positionen im aktuellen Filter"), "Empty filter result is identified once in the central filter state");
    check(!filteredState.analysisVisible && !filteredState.dashboardVisible && filteredState.visibleCoverageMessages.length === 0, "Empty filter result does not repeat global guidance in KPI cards");
    check(["Inventory", "Excess", "Bad", "NoNeed", "NoPlan", "Recovery", "Share"].every(name => filteredUi[name].actionHidden), "Empty filter result has no stale cause action");
    assert.equal((await page.evaluate(() => window.__obsoliqTestBridge.getState().rawRows)), 102);
    await page.locator("#overviewFilterEmptyState [data-overview-reset]").click();
    await page.waitForFunction(() => window.__obsoliqTestBridge.getOverviewRows().length === 102);

    await page.evaluate(() => window.__obsoliqTestBridge.updateLanguageForTest("en"));
    const englishUi = await visibleKpiState(page);
    check(englishUi.Inventory.coverage.includes("101 of 102") && englishUi.Inventory.coverage.includes("1 invalid"), "English coverage text is rendered");
    check(englishUi.Inventory.partial.includes("Sum of assessable items") && englishUi.Inventory.action === "Review Total Inventory", "English subtotal and metric-specific action labels are rendered");
    check(englishUi.Share.coverage.includes("complete recovery") && englishUi.Share.coverage.includes("complete inventory"), "English recovery-share dependency is rendered");
    await page.evaluate(() => window.__obsoliqTestBridge.updateLanguageForTest("de"));

    await page.locator("#mInventoryReview").click();
    await page.waitForFunction(() => document.querySelector("[data-kpi-cause-focus='inventory']"));
    const inventoryFocus = await page.evaluate(() => {
      const panel = document.querySelector("[data-kpi-cause-focus='inventory']");
      return {
        view: window.__obsoliqTestBridge.getState().currentView,
        text: panel?.textContent || "",
        rows: panel?.querySelectorAll("tbody tr").length || 0,
        worklistIssueIds: [...new Set(
          [...document.querySelectorAll("#remediationWorklistRegion [data-remediation-review]")]
            .map(button => button.dataset.remediationReview)
        )],
        focusActions: panel?.querySelectorAll("[data-remediation-review]").length || 0,
        focus: window.__obsoliqTestBridge.getKpiCauseFocusForTest()
      };
    });
    assert.equal(inventoryFocus.view, "check");
    assert.equal(inventoryFocus.rows, 1);
    assert.equal(inventoryFocus.worklistIssueIds.length, 1);
    assert.equal(inventoryFocus.focusActions, 1);
    check(inventoryFocus.text.includes(demo.activePackage.packageId) && inventoryFocus.text.includes("Revision 2"), "Focus preserves active package and revision");
    check(inventoryFocus.text.includes("56") && inventoryFocus.text.includes("MAT-1056") && inventoryFocus.text.includes("PLANT-01"), "Focus identifies exact row, material, and plant");
    check(inventoryFocus.text.includes("Stock Value (EUR)") && inventoryFocus.text.includes("Spalte 32") && inventoryFocus.text.includes("stock_value") && inventoryFocus.text.includes("abc"), "Focus identifies exact physical/canonical field and raw input");
    assert.equal(inventoryFocus.focus.metricKey, "inventory");

    await page.locator("[data-kpi-cause-focus='inventory'] [data-remediation-review]").click();
    await page.waitForFunction(() => document.getElementById("remediationIssueModal")?.classList.contains("active"));
    const modalText = await page.locator("#remediationIssueBody").textContent();
    check(modalText.includes("MAT-1056") && modalText.includes("abc"), "Existing data-quality review opens on the exact invalid source row");
    await page.locator("#remediationIssueCloseButton").click();

    await page.locator("[data-process='overview']").click();
    await page.waitForFunction(() => document.getElementById("overviewWorkspace")?.dataset.view === "dashboard");
    await page.locator("#mExcessReview").click();
    await page.waitForFunction(() => document.querySelector("[data-kpi-cause-focus='excess']"));
    const excessFocus = await page.evaluate(() => {
      const panel = document.querySelector("[data-kpi-cause-focus='excess']");
      return {
        rows: panel?.querySelectorAll("tbody tr").length || 0,
        text: panel?.textContent || "",
        worklistIssueIds: [...new Set(
          [...document.querySelectorAll("#remediationWorklistRegion [data-remediation-review]")]
            .map(button => button.dataset.remediationReview)
        )]
      };
    });
    assert.equal(excessFocus.rows, 2);
    assert.equal(excessFocus.worklistIssueIds.length, 2);
    check(excessFocus.text.includes("45") && excessFocus.text.includes("MAT-1045") && excessFocus.text.includes("Excess (EUR)"), "Excess focus includes the exact missing source cell");
    check(excessFocus.text.includes("66") && excessFocus.text.includes("MAT-1066") && excessFocus.text.includes("-2500"), "Excess focus separately includes the exact negative source cell");

    const zeroCsv = [
      "Material Number,Material Description,Stock Value EUR,Profit Center,Program,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value",
      "MAT-TRUE-ZERO,Valid zero recovery material,100,PC-Z,Program Z,0,0,0,0"
    ].join("\n");
    const focusBeforeFailedImport = await page.evaluate(() => window.__obsoliqTestBridge.getKpiCauseFocusForTest());
    const failedLoad = await page.evaluate(csv => window.__obsoliqTestBridge.loadUserInventoryTextForTest(
      csv,
      "kpi-forced-failure.csv",
      {
        allowMappingReview: false,
        forceBuildErrorForTest: true,
        suppressErrorLog: true,
        preserveFailureFeedback: true
      }
    ), zeroCsv);
    const focusAfterFailedImport = await page.evaluate(() => window.__obsoliqTestBridge.getKpiCauseFocusForTest());
    assert.equal(failedLoad.status, "error");
    assert.deepEqual(focusAfterFailedImport, focusBeforeFailedImport);
    assert.equal(await page.locator("[data-kpi-cause-focus='excess']").count(), 1);

    const zeroLoad = await loadCsv(page, zeroCsv, "kpi-true-zero.csv");
    assert.equal(zeroLoad.status, "loaded");
    const zero = await page.evaluate(() => ({
      models: window.__obsoliqTestBridge.buildKpiAvailabilityModelsForTest(),
      focus: window.__obsoliqTestBridge.getKpiCauseFocusForTest()
    }));
    assert.equal(zero.focus, null);
    ["inventory", "excess", "blocked", "noDemand", "noPlan", "recovery", "share"].forEach(key => {
      assert.notEqual(zero.models[key].strictAggregate.value, null, "Fully valid source keeps " + key + " available");
      assert.equal(zero.models[key].causes.length, 0);
    });
    assert.equal(zero.models.recovery.strictAggregate.value, 0);
    assert.equal(zero.models.share.strictAggregate.value, 0);
    assert.equal(zero.models.share.partial.status, "not_allowed");
    await page.locator("[data-process='overview']").click();
    await page.waitForFunction(() => document.getElementById("overviewWorkspace")?.dataset.view === "dashboard");
    const zeroUi = await visibleKpiState(page);
    check(!zeroUi.Recovery.unavailable && /^0(?:\s|$)/.test(zeroUi.Recovery.value), "True recovery zero remains a calculated zero");
    check(!zeroUi.Share.unavailable && zeroUi.Share.value.includes("0 %"), "True recovery-share zero remains a calculated zero percent");
    check(["Inventory", "Excess", "Bad", "NoNeed", "NoPlan", "Recovery", "Share"].every(name => zeroUi[name].coverageHidden && zeroUi[name].actionHidden), "Fully valid data has no availability warning or cause action");

    const zeroDenominatorCsv = [
      "Material Number,Material Description,Stock Value EUR,Profit Center,Program,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value",
      "MAT-ZERO-BASIS,Valid zero inventory basis,0,PC-Z,Program Z,0,0,0,0"
    ].join("\n");
    const zeroDenominatorLoad = await loadCsv(page, zeroDenominatorCsv, "kpi-zero-denominator.csv");
    assert.equal(zeroDenominatorLoad.status, "loaded");
    const zeroDenominator = await page.evaluate(() => window.__obsoliqTestBridge.buildKpiAvailabilityModelsForTest());
    assert.equal(zeroDenominator.inventory.strictAggregate.value, 0);
    assert.equal(zeroDenominator.recovery.strictAggregate.value, 0);
    assert.equal(zeroDenominator.share.strictAggregate.value, null);
    assert.deepEqual(zeroDenominator.share.strictAggregate.reasonCodes, ["zero_denominator"]);
    assert.equal(zeroDenominator.share.causes.length, 0);
    assert.equal(zeroDenominator.share.partial.status, "not_allowed");
    const zeroDenominatorUi = await visibleKpiState(page);
    check(zeroDenominatorUi.Share.coverage.includes("1 von 1") && zeroDenominatorUi.Share.coverage.includes("Bestandswert ist 0") && zeroDenominatorUi.Share.coverage.includes("keinen positiven Nenner"), "Zero-denominator share explains the true arithmetic reason");
    assert.equal(zeroDenominatorUi.Share.actionHidden, true);

    const escapedRaw = "abc<img src=x onerror=window.__kpiEscaped=1>";
    const invalidCsv = [
      "Material Number,Material Description,Stock Value EUR,Profit Center,Program,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value",
      "MAT-SAFE,Valid contribution,100,PC-S,Program S,0,0,0,0",
      "MAT-RAW,Invalid raw contribution," + escapedRaw + ",PC-R,Program R,0,0,0,0"
    ].join("\n");
    await page.evaluate(() => { window.__kpiEscaped = 0; });
    const invalidLoad = await loadCsv(page, invalidCsv, "kpi-invalid-raw.csv");
    assert.equal(invalidLoad.status, "loaded");
    const invalid = await page.evaluate(() => window.__obsoliqTestBridge.buildKpiAvailabilityModelsForTest());
    assert.equal(invalid.inventory.strictAggregate.value, null);
    assert.equal(invalid.inventory.strictAggregate.validCount, 1);
    assert.equal(invalid.inventory.causes.length, 1);
    assert.equal(invalid.inventory.causes[0].kind, "invalid");
    assert.equal(invalid.inventory.causes[0].rawValue, escapedRaw);
    assert.equal(invalid.inventory.partial.status, "available");
    near(invalid.inventory.partial.value, 100, "Valid contribution remains a separate safe subtotal");
    await page.locator("[data-process='overview']").click();
    await page.locator("#mInventoryReview").click();
    await page.waitForFunction(() => document.querySelector("[data-kpi-cause-focus='inventory']"));
    const escapedFocus = await page.evaluate(raw => {
      const panel = document.querySelector("[data-kpi-cause-focus='inventory']");
      return {
        rawVisible: panel?.textContent.includes(raw),
        injectedImages: panel?.querySelectorAll("tbody img").length || 0,
        executed: window.__kpiEscaped
      };
    }, escapedRaw);
    assert.equal(escapedFocus.rawVisible, true);
    assert.equal(escapedFocus.injectedImages, 0);
    assert.equal(escapedFocus.executed, 0);

    const insufficientCurrencyCsv = [
      "Material Number,Material Description,Stock Value EUR,Profit Center,Program,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value",
      "MAT-CUR-1,Known blocked value,100,PC-C,Program C,0,0,5,0",
      "MAT-CUR-2,Missing blocked value,200,PC-C,Program C,0,0,,0"
    ].join("\n");
    const insufficientLoad = await loadCsv(page, insufficientCurrencyCsv, "kpi-insufficient-currency.csv");
    assert.equal(insufficientLoad.status, "loaded");
    const insufficient = await page.evaluate(() => ({
      models: window.__obsoliqTestBridge.buildKpiAvailabilityModelsForTest(),
      focus: window.__obsoliqTestBridge.getKpiCauseFocusForTest()
    }));
    assert.equal(insufficient.focus, null);
    assert.equal(insufficient.models.blocked.strictAggregate.value, null);
    assert.equal(insufficient.models.blocked.partial.status, "unavailable");
    assert.equal(insufficient.models.blocked.partial.reason, "insufficient_currency");
    await page.locator("[data-process='overview']").click();
    await page.waitForFunction(() => document.getElementById("overviewWorkspace")?.dataset.view === "dashboard");
    const insufficientUi = await visibleKpiState(page);
    check(insufficientUi.Bad.partial.includes("Keine sichere Teilsumme") && insufficientUi.Bad.partial.includes("Währungskontext"), "Subtotal fails closed when the mapped source lacks a currency context");
    check(!/^5(?:\s|$)/.test(insufficientUi.Bad.partial), "Unsafe blocked-stock subtotal is not displayed as a value");

    const nonBaseCurrencyCsv = [
      "Material Number,Material Description,Stock Value EUR,Profit Center,Program,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value",
      "MAT-USD-1,Known blocked value,100,PC-U,Program U,0,0,$5,0",
      "MAT-USD-2,Missing blocked value,200,PC-U,Program U,0,0,,0"
    ].join("\n");
    const nonBaseLoad = await loadCsv(page, nonBaseCurrencyCsv, "kpi-non-base-currency.csv");
    assert.equal(nonBaseLoad.status, "loaded");
    const nonBase = await page.evaluate(() => window.__obsoliqTestBridge.buildKpiAvailabilityModelsForTest());
    assert.equal(nonBase.blocked.strictAggregate.value, null);
    assert.equal(nonBase.blocked.partial.status, "unavailable");
    assert.equal(nonBase.blocked.partial.reason, "non_base_currency");
    assert.deepEqual(nonBase.blocked.partial.currencyContext.currencies, ["USD"]);
    const nonBaseUi = await visibleKpiState(page);
    check(nonBaseUi.Bad.partial.includes("Keine sichere Teilsumme") && nonBaseUi.Bad.partial.includes("USD") && nonBaseUi.Bad.partial.includes("EUR"), "Subtotal rejects a single non-base currency instead of relabelling it as EUR");

    const derivedStockCsv = [
      "Material Number,Material Description,Stock Value (EUR),Stock Quantity,STD Price,Profit Center,Program,Excess (EUR),No Demand Value,Bad Stock (EUR),No Plan (EUR)",
      "MAT-DERIVED-OK,Explicit valid stock,100,1,100,PC-D,Program D,0,0,0,0",
      "MAT-DERIVED-BAD,Failed stock fallback,,abc,20,PC-D,Program D,0,0,0,0"
    ].join("\n");
    const derivedStockLoad = await loadCsv(page, derivedStockCsv, "kpi-derived-stock-cause.csv");
    assert.equal(derivedStockLoad.status, "loaded");
    const derivedStock = await page.evaluate(() => window.__obsoliqTestBridge.buildKpiAvailabilityModelsForTest());
    assert.equal(derivedStock.inventory.strictAggregate.value, null);
    assert.deepEqual(derivedStock.inventory.causes.map(cause => [cause.canonicalField, cause.kind, cause.rawValue]), [
      ["stock_value", "missing", ""],
      ["stock_quantity", "invalid", "abc"]
    ]);
    check(derivedStock.inventory.causes.every(cause => cause.sourceRowIndex === 2 && cause.materialId === "MAT-DERIVED-BAD"), "Failed stock fallback keeps every cause on the exact source row");
    check(derivedStock.inventory.causes.find(cause => cause.canonicalField === "stock_quantity")?.dependencyKey === "kpiDependencyDerivedStock", "Invalid quantity is linked to the stock-value derivation");
    await page.locator("[data-process='overview']").click();
    await page.locator("#mInventoryReview").click();
    await page.waitForFunction(() => document.querySelector("[data-kpi-cause-focus='inventory']"));
    const derivedFocus = await page.evaluate(() => {
      const panel = document.querySelector("[data-kpi-cause-focus='inventory']");
      return {
        rows: panel?.querySelectorAll("tbody tr").length || 0,
        text: panel?.textContent || "",
        issueIds: [...new Set(
          [...document.querySelectorAll("#remediationWorklistRegion [data-remediation-review]")]
            .map(button => button.dataset.remediationReview)
        )]
      };
    });
    assert.equal(derivedFocus.rows, 2);
    assert.equal(derivedFocus.issueIds.length, 1);
    check(derivedFocus.text.includes("Stock Quantity") && derivedFocus.text.includes("abc"), "Derived-stock focus exposes the invalid physical quantity cell");

    const multipleRecoveryCsv = [
      "Material Number,Material Description,Stock Value (EUR),Profit Center,Program,Excess (EUR),No Demand Value,Bad Stock (EUR),No Plan (EUR)",
      "MAT-REC-OK,Valid row,100,PC-R,Program R,0,0,0,0",
      "MAT-REC-MULTI,Two invalid dependencies,abc,PC-R,Program R,xyz,0,0,0"
    ].join("\n");
    const multipleRecoveryLoad = await loadCsv(page, multipleRecoveryCsv, "kpi-multiple-recovery-causes.csv");
    assert.equal(multipleRecoveryLoad.status, "loaded");
    const multipleRecovery = await page.evaluate(() => window.__obsoliqTestBridge.buildKpiAvailabilityModelsForTest());
    assert.deepEqual(multipleRecovery.recovery.causes.map(cause => [cause.canonicalField, cause.kind]), [
      ["stock_value", "invalid"],
      ["excess_value", "invalid"]
    ]);
    assert.deepEqual(multipleRecovery.share.causes.map(cause => [cause.canonicalField, cause.kind]), [
      ["stock_value", "invalid"],
      ["excess_value", "invalid"]
    ]);
    check(multipleRecovery.recovery.causes.every(cause => cause.sourceRowIndex === 2), "Recovery keeps independent blockers from the same physical row");
    await page.locator("[data-process='overview']").click();
    await page.locator("#mRecoveryReview").click();
    await page.waitForFunction(() => document.querySelector("[data-kpi-cause-focus='recovery']"));
    const multipleRecoveryFocus = await page.evaluate(() => {
      const panel = document.querySelector("[data-kpi-cause-focus='recovery']");
      return {
        rows: panel?.querySelectorAll("tbody tr").length || 0,
        text: panel?.textContent || "",
        issueIds: [...new Set(
          [...document.querySelectorAll("#remediationWorklistRegion [data-remediation-review]")]
            .map(button => button.dataset.remediationReview)
        )]
      };
    });
    assert.equal(multipleRecoveryFocus.rows, 2);
    assert.equal(multipleRecoveryFocus.issueIds.length, 2);
    check(multipleRecoveryFocus.text.includes("Stock Value (EUR)") && multipleRecoveryFocus.text.includes("abc") && multipleRecoveryFocus.text.includes("Excess (EUR)") && multipleRecoveryFocus.text.includes("xyz"), "Recovery focus exposes both invalid physical inputs");

    const noDemandOverflowCsv = [
      "Material Number,Material Description,Stock Value (EUR),Profit Center,Program,No Need / Conso EUR,No Need / No Con EUR,Excess (EUR),Bad Stock (EUR),No Plan (EUR)",
      "MAT-ND-OVERFLOW,No-demand sum overflow,100,PC-N,Program N,1e308,1e308,0,0,0"
    ].join("\n");
    const noDemandOverflowLoad = await loadCsv(page, noDemandOverflowCsv, "kpi-no-demand-overflow.csv");
    assert.equal(noDemandOverflowLoad.status, "loaded");
    const noDemandOverflow = await page.evaluate(() => window.__obsoliqTestBridge.buildKpiAvailabilityModelsForTest());
    assert.equal(noDemandOverflow.noDemand.strictAggregate.value, null);
    assert.deepEqual(noDemandOverflow.noDemand.causes.map(cause => [cause.canonicalField, cause.kind, cause.rawValue]), [
      ["no_need_conso_value", "overflow", "1e308"],
      ["no_need_no_con_value", "overflow", "1e308"]
    ]);
    check(noDemandOverflow.noDemand.causes.every(cause => cause.dependencyKey === "kpiDependencyNoDemandSum"), "No-demand overflow is linked to the existing sum dependency");
    await page.locator("[data-process='overview']").click();
    await page.locator("#mNoNeedReview").click();
    await page.waitForFunction(() => document.querySelector("[data-kpi-cause-focus='noDemand']"));
    const noDemandOverflowFocus = await page.evaluate(() => {
      const panel = document.querySelector("[data-kpi-cause-focus='noDemand']");
      return {
        rows: panel?.querySelectorAll("tbody tr").length || 0,
        text: panel?.textContent || ""
      };
    });
    assert.equal(noDemandOverflowFocus.rows, 2);
    check(noDemandOverflowFocus.text.includes("No Need / Conso EUR") && noDemandOverflowFocus.text.includes("No Need / No Con EUR") && noDemandOverflowFocus.text.includes("Überlauf"), "No-demand overflow remains physically explainable and reachable");

    const duplicateSourceIdentity = await page.evaluate(() => {
      const match = window.__obsoliqTestBridge.kpiFocusMatchesIssueForTest;
      const model = {
        causes: [{
          sourceRowIndex: 7,
          canonicalField: "stock_value",
          sourceIndex: 4,
          sourceKey: "Stock Value__2",
          sourceColumn: "Stock Value"
        }]
      };
      return {
        exactTechnicalKey: match({
          sourceRowIndexes: [7],
          canonicalFields: ["stock_value"],
          sourceColumns: ["Stock Value__2"]
        }, model),
        wrongDuplicate: match({
          sourceRowIndexes: [7],
          canonicalFields: ["stock_value"],
          sourceColumns: ["Stock Value"]
        }, model)
      };
    });
    assert.deepEqual(duplicateSourceIdentity, {
      exactTechnicalKey: true,
      wrongDuplicate: false
    });

    const classifications = await page.evaluate(() => {
      const classify = window.__obsoliqTestBridge.kpiCauseKindForTest;
      return {
        missing: classify({ status: "missing", normalizedValue: null }),
        invalid: classify({ status: "invalid", normalizedValue: null }),
        ambiguous: classify({ status: "ambiguous", normalizedValue: null }),
        negative: classify({ status: "valid", normalizedValue: -1 }),
        overflow: classify({ status: "valid", normalizedValue: null }),
        calculationOverflow: classify(null, { calculationReason: "derived_value_overflow" }),
        unknownMapping: classify(null, { mappingAvailable: false })
      };
    });
    assert.deepEqual(classifications, {
      missing: "missing",
      invalid: "invalid",
      ambiguous: "ambiguous",
      negative: "negative",
      overflow: "overflow",
      calculationOverflow: "overflow",
      unknownMapping: "unknown_mapping"
    });

    assert.deepEqual(diagnostics.pageErrors, []);
    assert.deepEqual(diagnostics.consoleErrors, []);
    assert.deepEqual(diagnostics.externalRequests, []);

    console.log(JSON.stringify({
      status: "PASS",
      assertions: assertionCount,
      demo: {
        packageId: demo.activePackage.packageId,
        packageRevision: demo.activePackage.revision,
        inventorySubtotal: demo.models.inventory.partial.value,
        excessProjection: demo.models.excess.partial.value,
        blockedSubtotal: demo.models.blocked.partial.value,
        noDemand: demo.models.noDemand.strictAggregate.value,
        noPlanSubtotal: demo.models.noPlan.partial.value,
        recoverySubtotal: demo.models.recovery.partial.value,
        recoveryShareCoverage: demo.models.share.strictAggregate.validCount + "/" + demo.models.share.relevantCount
      },
      navigation: {
        inventoryRows: inventoryFocus.rows,
        inventoryWorklistIssues: inventoryFocus.worklistIssueIds.length,
        excessRows: excessFocus.rows,
        excessWorklistIssues: excessFocus.worklistIssueIds.length
      },
      focusRollbackPreserved: JSON.stringify(focusAfterFailedImport) === JSON.stringify(focusBeforeFailedImport),
      staleFocusCleared: zero.focus === null && insufficient.focus === null,
      escapedRawValue: escapedFocus,
      classifications,
      screenshot,
      diagnostics
    }, null, 2));

    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
