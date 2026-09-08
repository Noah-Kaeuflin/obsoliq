// SYNTHETIC TEST DATA. Focused product regression for KPI-EXACT-VALUE-01.
"use strict";

const assert = require("node:assert/strict");
const { chromium, productUrl } = require("./smoke-runtime.cjs");

const KPI_NAMES = ["Inventory", "Excess", "Bad", "NoNeed", "NoPlan", "Recovery"];
let assertionCount = 0;

function check(value, message) {
  assertionCount += 1;
  assert.ok(value, message);
}

function equal(actual, expected, message) {
  assertionCount += 1;
  assert.equal(actual, expected, message);
}

function deepEqual(actual, expected, message) {
  assertionCount += 1;
  assert.deepEqual(actual, expected, message);
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/gu, " ").trim();
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

async function loadCsv(page, csv, sourceLabel, options = {}) {
  return page.evaluate(input => window.__obsoliqTestBridge.loadUserInventoryTextForTest(
    input.csv,
    input.sourceLabel,
    {
      allowMappingReview: false,
      suppressErrorLog: true,
      preserveFailureFeedback: true,
      ...input.options
    }
  ), { csv, sourceLabel, options });
}

async function exactState(page) {
  return page.evaluate(names => {
    const record = {};
    names.forEach(name => {
      const details = document.getElementById(`m${name}Exact`);
      const summary = details?.querySelector("summary") || null;
      const line = details?.querySelector(".metric-exact-line") || null;
      const amount = details?.querySelector("[data-kpi-exact-value]") || null;
      const status = details?.querySelector("[data-kpi-exact-status]") || null;
      const value = document.getElementById(`m${name}`);
      const partial = document.getElementById(`m${name}Partial`);
      record[name] = {
        hidden: Boolean(details?.hidden || details?.classList.contains("hidden")),
        open: Boolean(details?.open),
        summary: summary?.textContent?.trim() || "",
        ariaLabel: summary?.getAttribute("aria-label") || "",
        summaryTag: summary?.tagName || "",
        line: line?.textContent?.trim() || "",
        status: status?.textContent || "",
        amount: amount?.textContent || "",
        sourceToken: details?.dataset.kpiSourceToken || "",
        kind: details?.dataset.kpiExactKind || "",
        compact: value?.textContent?.trim() || "",
        partial: partial?.textContent || "",
        lineVisible: Boolean(line?.getClientRects().length),
        selectable: amount ? getComputedStyle(amount).userSelect !== "none" : false
      };
    });
    record.shareExactCount = document.querySelectorAll("#mShareExact, [data-kpi-exact-share]").length;
    return record;
  }, KPI_NAMES);
}

async function waitForDemo(page) {
  await page.waitForFunction(() => {
    const bridge = window.__obsoliqTestBridge;
    return bridge?.getState().rawRows === 102
      && bridge.getRegistryStats().packageCount === 3
      && document.getElementById("actionFeedback")?.textContent.trim() === "Daten geladen";
  }, null, { timeout: 30000 });
}

async function loadDemoFromButton(page) {
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#sampleButton").click();
  await waitForDemo(page);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const diagnostics = { pageErrors: [], consoleErrors: [], externalRequests: [] };
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
      hasTouch: true
    });
    const page = await context.newPage();
    pageDiagnostics(page, diagnostics);
    await page.addInitScript(() => { window.__OBSOLIQ_TEST_MODE__ = true; });
    await page.goto(productUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.__obsoliqTestBridge));

    const empty = await exactState(page);
    check(KPI_NAMES.every(name => empty[name].hidden && !empty[name].line && !empty[name].amount), "Empty startup hides and clears every exact monetary disclosure");
    check(KPI_NAMES.every(name => !normalizeText(empty[name].line).includes("0,00 €")), "Empty startup never fabricates an exact zero");
    equal(empty.shareExactCount, 0, "Recovery Share has no exact monetary disclosure");

    await page.locator("#overviewEmptyState [data-empty-load-sample]").click();
    await waitForDemo(page);

    const demo = await page.evaluate(() => ({
      models: window.__obsoliqTestBridge.buildKpiAvailabilityModelsForTest(),
      packageRecord: window.__obsoliqTestBridge.getActiveInventoryPackage(),
      state: window.__obsoliqTestBridge.getState()
    }));
    equal(demo.state.rawRows, 102, "Linked demo retains its 102-row Inventory identity");
    equal(demo.packageRecord.packageType, "inventory_snapshot", "Linked demo retains the Inventory package type");
    equal(demo.packageRecord.revision, 2, "Linked demo retains the expected Inventory revision");
    deepEqual(
      KPI_NAMES.map(name => demo.models[({ Inventory: "inventory", Excess: "excess", Bad: "blocked", NoNeed: "noDemand", NoPlan: "noPlan", Recovery: "recovery" })[name]].exactAmount.currency),
      ["EUR", "EUR", "EUR", "EUR", "EUR", "EUR"],
      "Every demo exact amount is bound to the established EUR valuation context"
    );
    equal(demo.models.inventory.exactAmount.value, demo.models.inventory.partial.value, "Inventory exact amount reuses the safe subtotal model value");
    equal(demo.models.noDemand.exactAmount.value, demo.models.noDemand.strictAggregate.value, "No-demand exact amount reuses the strict aggregate model value");
    equal(demo.models.excess.exactAmount.kind, "nonnegative_projection", "Negative Excess input retains the existing non-negative projection kind");
    equal(demo.models.share.partial.status, "not_allowed", "Recovery Share still forbids a partial quotient");

    let state = await exactState(page);
    check(state.Inventory.compact === "n. v." && state.Inventory.partial.includes("4,7 Mio."), "Inventory keeps its unavailable main value and compact subtotal");
    check(state.NoNeed.compact.includes("223 Tsd."), "No-demand compact card value remains unchanged");
    check(state.Excess.partial.includes("424 Tsd."), "Excess compact projection remains unchanged");
    check(KPI_NAMES.every(name => !state[name].hidden && state[name].summary === "Betrag anzeigen"), "All six safe monetary KPIs expose the German disclosure label");
    check(KPI_NAMES.every(name => state[name].ariaLabel.startsWith("Betrag anzeigen: ") && state[name].ariaLabel.includes(name === "Bad" ? "Gesperrt / QI" : name === "NoNeed" ? "Ohne Bedarf" : name === "NoPlan" ? "Ohne Plan" : name === "Inventory" ? "Gesamtbestand" : name === "Excess" ? "Überbestand" : "Recovery-Potenzial")), "Every German disclosure has a metric-specific accessible name with the visible label in its name");
    check(KPI_NAMES.every(name => state[name].summaryTag === "SUMMARY"), "Every control uses native details/summary disclosure semantics");

    await page.locator("#mInventoryExact > summary").click();
    equal((await exactState(page)).Inventory.open, true, "Mouse click opens the Inventory amount disclosure");

    const excessSummary = page.locator("#mExcessExact > summary");
    await excessSummary.focus();
    await page.keyboard.press("Enter");
    const keyboardState = await page.evaluate(() => {
      const details = document.getElementById("mExcessExact");
      const summary = details.querySelector("summary");
      const style = getComputedStyle(summary);
      return {
        open: details.open,
        focused: document.activeElement === summary,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        targetHeight: summary.getBoundingClientRect().height
      };
    });
    check(keyboardState.open && keyboardState.focused, "Enter opens the native disclosure without moving keyboard focus");
    check(keyboardState.outlineStyle !== "none" && keyboardState.outlineWidth !== "0px", "Keyboard focus has a visible outline");
    check(keyboardState.targetHeight >= 32, "The disclosure summary provides a usable touch target height");

    await page.locator("#mBadExact > summary").tap();
    equal((await exactState(page)).Bad.open, true, "Touch opens the same native amount disclosure");
    for (const name of ["NoNeed", "NoPlan", "Recovery"]) {
      await page.locator(`#m${name}Exact > summary`).click();
    }

    state = await exactState(page);
    const germanExpected = {
      Inventory: ["Unvollständige Teilsumme", "4.703.268,70 €"],
      Excess: ["Unvollständige Projektion", "424.480,00 €"],
      Bad: ["Unvollständige Teilsumme", "117.003,30 €"],
      NoNeed: ["Vollständiger Betrag", "223.309,70 €"],
      NoPlan: ["Unvollständige Teilsumme", "26.781,40 €"],
      Recovery: ["Unvollständige Teilsumme", "779.220,40 €"]
    };
    KPI_NAMES.forEach(name => {
      const [status, amount] = germanExpected[name];
      equal(normalizeText(state[name].status), status, `${name} exposes the correct German completeness status`);
      equal(normalizeText(state[name].amount), amount, `${name} exposes the unabridged German amount with cents`);
      equal(normalizeText(state[name].line), `${status}: ${amount}`, `${name} keeps status immediately beside the exact amount`);
      check(state[name].lineVisible && state[name].selectable, `${name} exposes the exact amount as visible selectable text`);
    });
    check(!normalizeText(JSON.stringify(state)).includes("421.980,00 €"), "Unsafe generic Excess partial is never presented");

    const euroBeforeDisplayCurrencyChange = normalizeText(state.Inventory.amount);
    await page.evaluate(() => {
      const select = document.getElementById("currencySelect");
      select.value = "USD";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.waitForFunction(() => document.getElementById("mInventoryPartial")?.textContent.includes("$"));
    state = await exactState(page);
    equal(normalizeText(state.Inventory.amount), euroBeforeDisplayCurrencyChange, "Exact source-basis amount is not automatically FX-converted by the display-currency setting");
    check(state.Inventory.partial.includes("$"), "Existing compact presentation currency remains independently functional");
    await page.evaluate(() => {
      const select = document.getElementById("currencySelect");
      select.value = "EUR";
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await page.evaluate(() => window.__obsoliqTestBridge.updateLanguageForTest("en"));
    state = await exactState(page);
    check(KPI_NAMES.every(name => state[name].open && state[name].summary === "Show amount"), "Language change preserves open disclosures and renders their English control label");
    check(KPI_NAMES.every(name => state[name].ariaLabel.startsWith("Show amount: ")), "English disclosures retain metric-specific accessible names with the visible label in their name");
    equal(normalizeText(state.Inventory.line), "Incomplete subtotal: €4,703,268.70", "English subtotal uses locale-correct grouping and cents");
    equal(normalizeText(state.Excess.line), "Incomplete projection: €424,480.00", "English projection keeps its distinct status");
    equal(normalizeText(state.NoNeed.line), "Full amount: €223,309.70", "English complete amount keeps its distinct status");
    await page.evaluate(() => window.__obsoliqTestBridge.updateLanguageForTest("de"));

    await page.locator("#overviewGlobalSearch").fill("MAT-1001");
    await page.waitForFunction(() => window.__obsoliqTestBridge.getOverviewRows().length === 1);
    const filtered = await page.evaluate(() => window.__obsoliqTestBridge.buildKpiAvailabilityModelsForTest(
      window.__obsoliqTestBridge.getOverviewRows()
    ));
    state = await exactState(page);
    equal(filtered.inventory.exactAmount.value, 168, "Filtered exact amount reuses the one-row strict KPI value");
    equal(filtered.inventory.exactAmount.kind, "complete", "Filtered complete scope changes the presentation status without changing the formula");
    equal(normalizeText(state.Inventory.line), "Vollständiger Betrag: 168,00 €", "Open disclosure updates to the same filtered card scope");
    await page.locator("#overviewGlobalSearch").fill("__KPI_EXACT_NO_MATCH__");
    await page.waitForFunction(() => window.__obsoliqTestBridge.getOverviewRows().length === 0);
    const noMatchState = await exactState(page);
    check(KPI_NAMES.every(name => noMatchState[name].hidden && !noMatchState[name].line && !noMatchState[name].amount), "Empty filter scope hides and clears every exact amount without fabricating zero");
    await page.locator("#overviewGlobalSearch").fill("");
    await page.waitForFunction(() => window.__obsoliqTestBridge.getOverviewRows().length === 102);
    equal(normalizeText((await exactState(page)).Inventory.line), "Unvollständige Teilsumme: 4.703.268,70 €", "Resetting the filter restores the demo subtotal in the same disclosure");

    const zeroCsv = [
      "Material Number,Material Description,Stock Value (EUR),Profit Center,Program short,Excess (EUR),No Need / Conso EUR,No Need / No Con EUR,Bad Stock (EUR),No Plan (EUR),Plant",
      "MAT-TRUE-ZERO,True zero in safe EUR context,0,PC-Z,Program Z,0,0,0,0,0,PLANT-Z"
    ].join("\n");
    const beforeFailedImport = {
      state: await exactState(page),
      packageRecord: await page.evaluate(() => window.__obsoliqTestBridge.getActiveInventoryPackage())
    };
    const failedLoad = await loadCsv(page, zeroCsv, "kpi-exact-forced-failure.csv", { forceBuildErrorForTest: true });
    equal(failedLoad.status, "error", "Synthetic forced import failure reaches the transactional rollback path");
    const afterFailedImport = {
      state: await exactState(page),
      packageRecord: await page.evaluate(() => window.__obsoliqTestBridge.getActiveInventoryPackage())
    };
    deepEqual(afterFailedImport, beforeFailedImport, "Failed import preserves package identity, disclosure state and exact values byte-for-byte");

    const demoSourceToken = beforeFailedImport.state.Inventory.sourceToken;
    const zeroLoad = await loadCsv(page, zeroCsv, "kpi-exact-true-zero.csv");
    equal(zeroLoad.status, "loaded", "Safe true-zero EUR source loads successfully");
    const zeroModels = await page.evaluate(() => window.__obsoliqTestBridge.buildKpiAvailabilityModelsForTest());
    state = await exactState(page);
    const zeroExactSummary = Object.fromEntries(KPI_NAMES.map(name => {
      const key = ({ Inventory: "inventory", Excess: "excess", Bad: "blocked", NoNeed: "noDemand", NoPlan: "noPlan", Recovery: "recovery" })[name];
      return [name, zeroModels[key].exactAmount];
    }));
    check(KPI_NAMES.every(name => zeroExactSummary[name].value === 0), `All six safe exact models preserve genuine numeric zero: ${JSON.stringify(zeroExactSummary)}`);
    check(KPI_NAMES.every(name => !state[name].hidden && normalizeText(state[name].amount) === "0,00 €"), "All safe calculated zero amounts expose a disclosure with two decimals");
    check(KPI_NAMES.every(name => !state[name].open && state[name].sourceToken !== demoSourceToken), "Successful source switch closes disclosures and removes stale source binding");
    check(!normalizeText(JSON.stringify(state)).includes("4.703.268,70 €"), "Successful source switch removes stale demo amounts from the exact UI");
    equal(state.shareExactCount, 0, "True-zero Recovery Share still has no monetary disclosure");

    const missingCsv = [
      "Material Number,Material Description,Stock Value (EUR),Profit Center,Program short,Excess (EUR),No Need / Conso EUR,No Need / No Con EUR,Bad Stock (EUR),No Plan (EUR),Plant",
      "MAT-MISSING,Missing inventory amount,,PC-M,Program M,0,0,0,0,0,PLANT-M"
    ].join("\n");
    const missingLoad = await loadCsv(page, missingCsv, "kpi-exact-missing.csv");
    equal(missingLoad.status, "loaded", "Source with a missing KPI contribution remains reviewable");
    const missingModels = await page.evaluate(() => window.__obsoliqTestBridge.buildKpiAvailabilityModelsForTest());
    state = await exactState(page);
    equal(missingModels.inventory.exactAmount.value, null, "Missing Inventory value has no exact model amount");
    check(state.Inventory.hidden && !state.Inventory.amount, "Missing Inventory remains unavailable instead of becoming exact zero");

    const insufficientCurrencyCsv = [
      "Material Number,Material Description,Stock Value EUR,Profit Center,Program,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value",
      "MAT-CUR-1,Known blocked value,100,PC-C,Program C,0,0,5,0",
      "MAT-CUR-2,Missing blocked value,200,PC-C,Program C,0,0,,0"
    ].join("\n");
    const insufficientLoad = await loadCsv(page, insufficientCurrencyCsv, "kpi-exact-insufficient-currency.csv");
    equal(insufficientLoad.status, "loaded", "Insufficient-currency review fixture loads");
    const insufficientModels = await page.evaluate(() => window.__obsoliqTestBridge.buildKpiAvailabilityModelsForTest());
    state = await exactState(page);
    equal(insufficientModels.blocked.exactAmount.value, null, "Insufficient currency context is fail-closed in the exact model");
    check(state.Bad.hidden && !state.Bad.amount && state.Bad.partial.includes("Währungskontext"), "Insufficient currency context explains the limitation without exposing an exact amount");

    const completeUnsafeCurrencyCsv = [
      "Material Number,Material Description,Stock Value EUR,Profit Center,Program,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value",
      "MAT-CUR-FULL,Complete blocked value without currency evidence,100,PC-C,Program C,0,0,5,0"
    ].join("\n");
    const completeUnsafeLoad = await loadCsv(page, completeUnsafeCurrencyCsv, "kpi-exact-complete-unsafe-currency.csv");
    equal(completeUnsafeLoad.status, "loaded", "Complete insufficient-currency fixture loads");
    const completeUnsafeModels = await page.evaluate(() => window.__obsoliqTestBridge.buildKpiAvailabilityModelsForTest());
    state = await exactState(page);
    equal(completeUnsafeModels.blocked.strictAggregate.value, 5, "Currency gate does not change the existing complete strict KPI value");
    equal(completeUnsafeModels.blocked.exactAmount.value, null, "Complete strict KPI still requires safe EUR context for exact disclosure");
    check(state.Bad.hidden && !state.Bad.amount, "Complete KPI without currency evidence exposes no exact amount");

    const nonBaseCurrencyCsv = [
      "Material Number,Material Description,Stock Value EUR,Profit Center,Program,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value",
      "MAT-USD-1,Known blocked value,100,PC-U,Program U,0,0,$5,0",
      "MAT-USD-2,Missing blocked value,200,PC-U,Program U,0,0,,0"
    ].join("\n");
    const nonBaseLoad = await loadCsv(page, nonBaseCurrencyCsv, "kpi-exact-non-base-currency.csv");
    equal(nonBaseLoad.status, "loaded", "Non-base-currency review fixture loads");
    const nonBaseModels = await page.evaluate(() => window.__obsoliqTestBridge.buildKpiAvailabilityModelsForTest());
    state = await exactState(page);
    equal(nonBaseModels.blocked.exactAmount.value, null, "Non-base USD context is not converted or relabelled as an exact EUR amount");
    check(state.Bad.hidden && !state.Bad.amount && state.Bad.partial.includes("USD") && state.Bad.partial.includes("EUR"), "Non-base context keeps its explanation and hides the exact disclosure");

    await loadDemoFromButton(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    for (const name of KPI_NAMES) {
      await page.locator(`#m${name}Exact > summary`).click();
    }
    const narrowGerman = await page.evaluate(names => {
      const records = names.map(name => {
        const details = document.getElementById(`m${name}Exact`);
        const card = details.closest(".metric");
        const line = details.querySelector(".metric-exact-line");
        const amount = details.querySelector("[data-kpi-exact-value]");
        const cardRect = card.getBoundingClientRect();
        const detailsRect = details.getBoundingClientRect();
        return {
          name,
          cardOverflow: card.scrollWidth - card.clientWidth,
          detailsOverflow: details.scrollWidth - details.clientWidth,
          lineOverflow: line.scrollWidth - line.clientWidth,
          insideCard: detailsRect.left >= cardRect.left - 1 && detailsRect.right <= cardRect.right + 1,
          selectable: getComputedStyle(amount).userSelect !== "none"
        };
      });
      return {
        viewportOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        records
      };
    }, KPI_NAMES);
    check(narrowGerman.viewportOverflow <= 0, "390px German view has no global horizontal overflow");
    check(narrowGerman.records.every(item => item.cardOverflow <= 0 && item.detailsOverflow <= 0 && item.lineOverflow <= 0 && item.insideCard && item.selectable), "Every German exact amount stays within its narrow KPI card");

    await page.evaluate(() => window.__obsoliqTestBridge.updateLanguageForTest("en"));
    const narrowEnglish = await page.evaluate(names => ({
      viewportOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      controls: names.map(name => {
        const details = document.getElementById(`m${name}Exact`);
        const line = details.querySelector(".metric-exact-line");
        return {
          open: details.open,
          summary: details.querySelector("summary").textContent.trim(),
          overflow: Math.max(details.scrollWidth - details.clientWidth, line.scrollWidth - line.clientWidth)
        };
      })
    }), KPI_NAMES);
    check(narrowEnglish.viewportOverflow <= 0, "390px English view has no global horizontal overflow");
    check(narrowEnglish.controls.every(item => item.open && item.summary === "Show amount" && item.overflow <= 0), "English labels and exact lines remain open and overflow-free at 390px");

    await page.evaluate(() => window.__obsoliqTestBridge.updateLanguageForTest("de"));
    const longAmountCsv = [
      "Material Number,Material Description,Stock Value (EUR),Profit Center,Program short,Excess (EUR),No Need / Conso EUR,No Need / No Con EUR,Bad Stock (EUR),No Plan (EUR),Plant",
      "MAT-LONG,Very long finite amount,1e30,PC-L,Program L,0,0,0,0,0,PLANT-L"
    ].join("\n");
    const longAmountLoad = await loadCsv(page, longAmountCsv, "kpi-exact-long-amount.csv");
    equal(longAmountLoad.status, "loaded", "Long finite EUR amount fixture loads");
    await page.locator("#mInventoryExact > summary").click();
    const longAmountLayout = await page.evaluate(() => {
      const details = document.getElementById("mInventoryExact");
      const line = details.querySelector(".metric-exact-line");
      const amount = details.querySelector("[data-kpi-exact-value]");
      const card = details.closest(".metric");
      return {
        text: amount.textContent,
        viewportOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        cardOverflow: card.scrollWidth - card.clientWidth,
        detailsOverflow: details.scrollWidth - details.clientWidth,
        lineOverflow: line.scrollWidth - line.clientWidth
      };
    });
    check(normalizeText(longAmountLayout.text).endsWith(",00 €"), "Long finite model amount retains exactly two displayed decimals");
    check(Math.max(longAmountLayout.viewportOverflow, longAmountLayout.cardOverflow, longAmountLayout.detailsOverflow, longAmountLayout.lineOverflow) <= 0, "Long finite exact amount wraps without horizontal overflow");

    deepEqual(diagnostics.pageErrors, [], "Exact-amount smoke has no page errors");
    deepEqual(diagnostics.consoleErrors, [], "Exact-amount smoke has no console errors");
    deepEqual(diagnostics.externalRequests, [], "Exact-amount smoke makes no external HTTP requests");

    console.log(JSON.stringify({
      status: "PASS",
      assertions: assertionCount,
      demo: Object.fromEntries(KPI_NAMES.map(name => [name, normalizeText(germanExpected[name].join(": "))])),
      filterInventory: normalizeText("Vollständiger Betrag: 168,00 €"),
      exactZero: "0,00 €",
      responsiveWidth: 390,
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
