"use strict";

// Synthetic CSV imports through the existing product bridge; no analytical result injection.
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { chromium, productUrl } = require("./smoke-runtime.cjs");
const sha = value => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const pageErrors = [], consoleErrors = [], externalRequests = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("request", request => { if (/^https?:/i.test(request.url())) externalRequests.push(request.url()); });
    await page.addInitScript(() => { window.__OBSOLIQ_TEST_MODE__ = true; });
    await page.goto(productUrl);
    await page.waitForFunction(() => Boolean(window.__obsoliqTestBridge));
    const evidence = await page.evaluate(async () => {
      const b = window.__obsoliqTestBridge;
      const checks = [];
      function equal(actual, expected, name) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${name}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
        checks.push(name);
      }
      function select(selector, value) {
        const el = document.querySelector(selector);
        if (!el) throw new Error(`Missing control: ${selector}`);
        el.value = value; el.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const financialRows = () => b.getEnrichedRowsForTest().map(r => [r.inventory_row_key, r.material_id, r.stock_quantity, r.stock_value, r.recovery_potential]);
      const sourceSnapshot = () => {
        const state = b.snapshotDatasetRuntimeState();
        return { rows: state.rawRows, headers: state.originalHeaders, metadata: state.sourceColumnMetadata };
      };
      await b.loadSample();
      const baseline = { dq: b.getDataQualityBaselineForTest(), rows: financialRows() };
      equal(baseline.rows.length, 102, "unchanged sample row count");
      equal(baseline.dq.score, 78, "unchanged sample DQ score");

      const parsed = window.ObsoliQ.data.sourceModel.buildParsedSourceDataset(
        ["material_id", "stock_value", "Base Unit", "Base Unit", "standard_price"],
        [["000-REMAP", "100", "EA", "KG", "10 EUR"], ["000-REMAP-2", "100", "EA", "KG", "11 USD"]]
      );
      equal(b.beginUploadWithParsedData(parsed, "SYNTHETIC-HSD-remap.csv", { sourceType: "upload", allowMappingReview: true, suppressFeedback: true }).status, "mapping", "duplicate unit opens Mapping review");
      equal(document.getElementById("mappingApplyButton").disabled, true, "duplicate unit cannot auto-apply");
      select('[data-mapping-index="3"]', "");
      document.querySelector("[data-input-trust-confirm]").click();
      document.getElementById("mappingApplyButton").click();
      const committed = b.getState().datasetMeta;
      equal(committed.normalizationPolicy.reviewConfirmed, true, "initial source review confirmed");
      const remapRevision = b.getActiveInventoryPackage().revision;
      b.reopenColumnMappingForCurrentDataset();
      equal(b.getState().pendingUploadContext.normalizationPolicy.reviewConfirmed, true, "unchanged reopen preserves confirmation");
      select('[data-mapping-index="2"]', "");
      select('[data-mapping-index="3"]', "base_unit");
      const pending = b.getState().pendingUploadContext;
      equal(pending.normalizationPolicy.reviewConfirmed, false, "unit source remap invalidates confirmation");
      equal(document.getElementById("mappingApplyButton").disabled, true, "remap needs current review");
      document.querySelector("[data-input-trust-confirm]").click();
      document.getElementById("mappingApplyButton").click();
      equal(b.getEnrichedRowsForTest().map(r => r.base_unit), ["KG", "KG"], "explicit second physical unit source");
      equal(b.getActiveInventoryPackage().revision, remapRevision + 1, "one remapping revision");
      equal(b.getState().datasetMeta.appliedMappingSignature === committed.appliedMappingSignature, false, "unit remapping changes signature");

      const inventory = "material_id,plant,stock_quantity,stock_value,base_unit,Unit\n000-HSD,SYN-1,35,1000,EA,KG\n000-HSD-MM,SYN-1,35,1000,,";
      equal((await b.loadTextDataset(inventory, "SYNTHETIC-HSD-inventory.csv", { sourceType: "upload", allowMappingReview: false })).status, "loaded", "Inventory unit import");
      const sourceBefore = sourceSnapshot();
      const financialBefore = financialRows();
      const dqBefore = b.getDataQualityBaselineForTest();
      const revision = b.getActiveInventoryPackage().revision;
      const master = "material_id,plant,Base UoM\n000-HSD,SYN-1,ea\n000-HSD-MM,SYN-1,EA";
      equal(b.importMaterialMasterTextForTest(master, "SYNTHETIC-HSD-master.csv", { suppressFeedback: true }).status, "loaded", "Material Master optional unit import");
      equal(b.getEnrichedRowsForTest().map(r => r.base_unit), ["EA", "EA"], "Inventory authority plus fill missing");
      equal(b.getInventoryEnrichmentDiagnosticsForTest().conflictCount, 0, "unit case is not a conflict");
      equal(b.getActiveInventoryPackage().revision, revision + 1, "one enrichment revision");
      equal(financialRows(), financialBefore, "MM financial parity");
      equal(b.getDataQualityBaselineForTest(), dqBefore, "MM DQ parity");
      equal(sourceSnapshot(), sourceBefore, "MM raw immutability");
      const beforeHistory = { registry: b.getRegistrySnapshot(), financialRows: financialRows(), dq: b.getDataQualityBaselineForTest(), source: sourceSnapshot() };
      const periods = ["2024-09", ...Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2025, 8 + i, 1)).toISOString().slice(0, 7)).filter((_, i) => i !== 2 && i !== 3)];
      const history = ["material_id,plant,period,consumption_quantity,base_unit,movement_type,document_id", ...periods.map((period, i) => `000-HSD,SYN-1,${period},10,EA,261,SYN-HSD-${i}`)].join("\n");
      const semanticPolicy = { analysisAsOf: { date: "2026-08-31", source: "user_confirmed", userConfirmed: true }, reviewConfirmed: true };
      const buildBefore = b.getHistoricalMetricsBuildCountersForTest().buildCount;
      equal((await b.importConsumptionHistoryTextForTest(history, "SYNTHETIC-HSD-history.csv", { semanticPolicy, suppressFeedback: true })).status, "loaded", "History source import");
      await b.waitForHistoricalMetricsRuntimeForTest();
      const runtime = b.getHistoricalMetricsRuntimeResultForTest();
      const metric = Object.values(runtime.historicalMetricsByInventoryEntityKey)[0];
      equal(metric.history_coverage_months, 24, "observed history span");
      equal(metric.history_completeness, 10 / 12, "independent rolling completeness");
      equal(metric.inventory_coverage_months, 3.5, "independent stock coverage");
      equal(metric.provenance.historyCoverageMonths, 24, "coverage provenance");
      equal(b.getHistoricalMetricsBuildCountersForTest().buildCount, buildBefore + 1, "one historical build");
      equal(financialRows(), beforeHistory.financialRows, "History financial parity");
      equal(b.getDataQualityBaselineForTest(), beforeHistory.dq, "History DQ parity");
      equal(sourceSnapshot(), beforeHistory.source, "History cannot rewrite Inventory source");
      equal(b.getActiveInventoryPackage().revision, revision + 1, "derived calculation creates no Inventory revision");
      const composed = b.composeHistoricalInventoryRowsForTest();
      equal(composed[0].history_coverage_months_ch, 24, "Explorer reads history not stock coverage");
      equal(composed[1].history_coverage_months_ch, "", "unmatched history stays blank in the export adapter, never zero");
      equal(b.exportValueForTest(composed[0], "history_coverage_months_ch"), "24 Mon.", "existing formatted export retains history span");
      const countBeforeView = b.getHistoricalMetricsBuildCountersForTest().buildCount;
      const registryBeforeView = b.getRegistrySnapshot();
      const labels = [];
      for (const language of ["de", "en"]) {
        select("#languageSelect", language);
        b.switchViewForTest("inventory");
        b.renderInventoryExplorerForTest();
        const text = document.getElementById("inventoryTable").textContent;
        const label = language === "de" ? "Historienabdeckung" : "History Coverage";
        equal(text.includes(label), true, `Explorer ${language} history label`);
        labels.push(label);
        b.setColumnSortForTest("inventory", "history_coverage_months_ch", "desc");
        b.showDownloadDialogForTest("inventory");
      }
      equal(b.getHistoricalMetricsBuildCountersForTest().buildCount, countBeforeView, "view language sorting export are non-triggers");
      equal(b.getRegistrySnapshot(), registryBeforeView, "view registry immutability");
      const beforeFault = { registry: b.getRegistrySnapshot(), rows: b.getEnrichedRowsForTest(), source: sourceSnapshot(), dq: b.getDataQualityBaselineForTest(), metric: b.getHistoricalMetricsRuntimeResultForTest() };
      const fault = b.importMaterialMasterTextForTest(master, "SYNTHETIC-HSD-failure.csv", { forceInventoryEnrichmentFailureForTest: "after-package", suppressErrorLog: true, suppressFeedback: true });
      equal(fault.status, "error", "enrichment fault injected");
      const afterFault = { registry: b.getRegistrySnapshot(), rows: b.getEnrichedRowsForTest(), source: sourceSnapshot(), dq: b.getDataQualityBaselineForTest(), metric: b.getHistoricalMetricsRuntimeResultForTest() };
      equal(afterFault, beforeFault, "full authoritative rollback snapshot");
      const signatureBeforeRemap = runtime.historicalMetricsInputSignature;
      const countBeforeRemap = b.getHistoricalMetricsBuildCountersForTest().buildCount;
      const revisionBeforeRemap = b.getActiveInventoryPackage().revision;
      b.reopenColumnMappingForCurrentDataset();
      select('[data-mapping-index="4"]', "");
      select('[data-mapping-index="5"]', "base_unit");
      const confirmation = document.querySelector("[data-input-trust-confirm]");
      if (confirmation && !confirmation.checked) confirmation.click();
      equal(document.getElementById("mappingApplyButton").disabled, false, "current reviewed unit remap can apply");
      document.getElementById("mappingApplyButton").click();
      await b.waitForHistoricalMetricsRuntimeForTest();
      const remappedRuntime = b.getHistoricalMetricsRuntimeResultForTest();
      equal(b.getActiveInventoryPackage().revision, revisionBeforeRemap + 1, "live unit remap creates one Inventory revision");
      equal(b.getHistoricalMetricsBuildCountersForTest().buildCount, countBeforeRemap + 1, "live unit remap rebuilds history once");
      equal(remappedRuntime.historicalMetricsInputSignature === signatureBeforeRemap, false, "live unit remap invalidates old historical signature");
      const remappedMetric = Object.values(remappedRuntime.historicalMetricsByInventoryEntityKey)[0];
      equal(remappedMetric.inventory_unit, "KG", "remapped Inventory unit is authoritative despite EA master");
      equal(remappedMetric.inventory_coverage_months, null, "remapped incompatible unit blocks quantitative evidence");
      equal(remappedMetric.history_coverage_months, 24, "unit remap does not invent temporal evidence");
      await b.loadSample();
      equal({ dq: b.getDataQualityBaselineForTest(), rows: financialRows() }, baseline, "sample reload financial and DQ parity");
      return { checks, baseline, metric: { coverage: metric.history_coverage_months, completeness: metric.history_completeness, stockCoverage: metric.inventory_coverage_months }, labels, rollback: { before: beforeFault, after: afterFault } };
    });
    assert.deepEqual(pageErrors, []); assert.deepEqual(consoleErrors, []); assert.deepEqual(externalRequests, []);
    const rollbackHashes = { before: sha(evidence.rollback.before), after: sha(evidence.rollback.after) };
    delete evidence.rollback;
    evidence.baseline.rowsSha256 = sha(evidence.baseline.rows);
    delete evidence.baseline.rows;
    console.log(JSON.stringify({ status: "PASS", passed: evidence.checks.length, total: evidence.checks.length, browserVersion: browser.version(), evidence, evidenceSha256: sha(evidence), rollbackHashes, pageErrors, consoleErrors, externalRequests }, null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
