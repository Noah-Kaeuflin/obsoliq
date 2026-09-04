// SYNTHETIC TEST DATA. Product smoke for the linked three-source demo foundation.
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { chromium, productUrl } = require("./smoke-runtime.cjs");

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const pageErrors = [];
  const consoleErrors = [];
  const externalRequests = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
    page.on("pageerror", error => pageErrors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("request", request => {
      if (/^https?:/i.test(request.url())) externalRequests.push(request.url());
    });
    await page.addInitScript(() => { window.__OBSOLIQ_TEST_MODE__ = true; });
    await page.goto(productUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean(window.__obsoliqTestBridge));

    const evidence = await page.evaluate(async () => {
      const bridge = window.__obsoliqTestBridge;
      const demo = window.ObsoliQFullDemo;
      if (!demo) throw new Error("Linked full-demo descriptor is missing.");
      if (typeof bridge.loadFullDemoForTest !== "function") throw new Error("Atomic full-demo loader is missing.");

      const sourceRows = csv => csv.trimEnd().split("\n").length - 1;
      const initial = bridge.getRegistryStats();
      const loaded = await bridge.loadFullDemoForTest({ suppressFeedback: true });
      const state = bridge.getState();
      const registry = bridge.getRegistryStats();
      const inventory = bridge.getActiveInventoryPackage();
      const master = bridge.getActiveMaterialMasterPackage();
      const history = bridge.getActiveConsumptionHistoryPackage();
      const historical = bridge.getHistoricalMetricsRuntimeResultForTest();
      const slowDead = bridge.getSlowDeadRecoveryCaseRuntimeForTest();
      const riskModel = bridge.getInventoryRiskPageModelForTest();
      const foundation = bridge.buildDataFoundationPresentationModelForTest();
      const firstSnapshot = bridge.getRegistrySnapshot();
      const firstPackageIds = firstSnapshot.packages.map(record => record.packageId);

      const repeated = await bridge.loadFullDemoForTest({ suppressFeedback: true });
      const repeatedRegistry = bridge.getRegistryStats();
      const repeatedSnapshot = bridge.getRegistrySnapshot();

      const rollback = {};
      for (const phase of ["after_inventory", "after_material_master", "after_consumption_history"]) {
        const before = bridge.snapshotDatasetRuntimeState();
        const result = await bridge.loadFullDemoForTest({
          suppressFeedback: true,
          suppressErrorLog: true,
          forceFullDemoFailureForTest: phase
        });
        const after = bridge.snapshotDatasetRuntimeState();
        rollback[phase] = {
          status: result.status,
          beforeHash: JSON.stringify(before),
          afterHash: JSON.stringify(after)
        };
      }

      const beforeHeaderOnly = JSON.stringify(bridge.getRegistrySnapshot());
      const headerOnlyMaster = await bridge.importMaterialMasterTextForTest(
        demo.templates.materialMaster.csv,
        "header-only-material-master.csv",
        { suppressFeedback: true, suppressErrorLog: true, render: false }
      );
      const headerOnlyHistory = await bridge.importConsumptionHistoryTextForTest(
        demo.templates.consumptionHistory.csv,
        "header-only-history.csv",
        { suppressFeedback: true, suppressErrorLog: true, render: false }
      );
      const afterHeaderOnly = JSON.stringify(bridge.getRegistrySnapshot());

      return {
        descriptor: {
          version: demo.version,
          classification: demo.classification,
          analysisAsOf: demo.analysisAsOf,
          sourceTypes: Object.values(demo.sources).map(source => source.sourceType),
          sourceRows: Object.fromEntries(Object.entries(demo.sources).map(([key, source]) => [key, sourceRows(source.csv)])),
          declaredRows: Object.fromEntries(Object.entries(demo.sources).map(([key, source]) => [key, source.rowCount])),
          inventoryParity: demo.sources.inventorySnapshot.csv === window.sampleCsv,
          cohorts: demo.expectations.cohorts,
          contentHashes: demo.contentHashes
        },
        initial,
        loaded,
        state,
        registry,
        packages: { inventory, master, history },
        historical: {
          status: historical?.status,
          signature: historical?.historicalMetricsInputSignature,
          metricCount: Object.keys(historical?.historicalMetricsByInventoryEntityKey || {}).length
        },
        slowDead: {
          status: slowDead?.status,
          conditionCounts: slowDead?.summary?.conditionCounts || {},
          caseCount: slowDead?.result?.cases?.length || 0,
          caseIds: (slowDead?.result?.cases || []).map(item => item.case_id)
        },
        readiness: {
          numerator: riskModel?.summary?.evidenceReadyCount,
          denominator: riskModel?.summary?.evidenceTotalCount,
          ratio: riskModel?.summary?.evidenceReadiness
        },
        foundation,
        firstPackageIds,
        repeated: {
          status: repeated.status,
          registry: repeatedRegistry,
          packageIds: repeatedSnapshot.packages.map(record => record.packageId)
        },
        rollback,
        headerOnly: {
          materialMasterStatus: headerOnlyMaster.status,
          consumptionHistoryStatus: headerOnlyHistory.status,
          beforeRegistry: beforeHeaderOnly,
          afterRegistry: afterHeaderOnly
        }
      };
    });

    assert.equal(evidence.descriptor.version, "obsoliq-linked-demo-v1");
    assert.equal(evidence.descriptor.classification, "synthetic");
    assert.equal(evidence.descriptor.analysisAsOf, "2026-08-31");
    assert.deepEqual(evidence.descriptor.sourceTypes, ["synthetic_demo", "synthetic_demo", "synthetic_demo"]);
    assert.equal(evidence.descriptor.inventoryParity, false, "The linked demo Inventory must add an explicit synthetic Plant source column without changing window.sampleCsv.");
    assert.deepEqual(evidence.descriptor.sourceRows, evidence.descriptor.declaredRows);
    assert.equal(evidence.loaded.status, "loaded");
    assert.equal(evidence.registry.packageCount, 3);
    assert.equal(evidence.registry.countsByType.inventory_snapshot, 1);
    assert.equal(evidence.registry.countsByType.material_master, 1);
    assert.equal(evidence.registry.countsByType.consumption_history, 1);
    assert.equal(evidence.packages.inventory.freshness.asOfDate, "2026-08-31");
    assert.equal(evidence.packages.inventory.sourceDescriptor.sourceType, "synthetic_demo");
    assert.equal(evidence.packages.master.sourceDescriptor.sourceType, "synthetic_demo");
    assert.equal(evidence.packages.history.sourceDescriptor.sourceType, "synthetic_demo");
    assert.ok(evidence.historical.status === "available" || evidence.historical.status === "limited");
    assert.ok(evidence.historical.metricCount > 0);
    assert.ok(evidence.slowDead.status === "available" || evidence.slowDead.status === "limited");
    assert.ok((evidence.slowDead.conditionCounts.slow_moving_candidate || 0) >= 4);
    assert.ok((evidence.slowDead.conditionCounts.non_moving_candidate || 0) >= 3);
    assert.ok((evidence.slowDead.conditionCounts.dead_stock_candidate || 0) >= 2);
    assert.ok(evidence.readiness.numerator > 0);
    assert.ok(evidence.readiness.denominator > 0);
    assert.equal(evidence.readiness.ratio, evidence.readiness.numerator / evidence.readiness.denominator);
    assert.equal(evidence.repeated.status, "loaded");
    assert.equal(evidence.repeated.registry.packageCount, 3);
    assert.equal(evidence.repeated.registry.sequence, evidence.registry.sequence);
    assert.deepEqual(evidence.repeated.packageIds, evidence.firstPackageIds);
    Object.entries(evidence.rollback).forEach(([phase, result]) => {
      assert.equal(result.status, "error", `${phase} must fail closed.`);
      assert.equal(result.afterHash, result.beforeHash, `${phase} must restore the complete runtime snapshot.`);
    });
    assert.equal(evidence.headerOnly.materialMasterStatus, "error");
    assert.equal(evidence.headerOnly.consumptionHistoryStatus, "error");
    assert.equal(evidence.headerOnly.afterRegistry, evidence.headerOnly.beforeRegistry);
    assert.deepEqual(pageErrors, []);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(externalRequests, []);

    const compactEvidence = {
      descriptor: evidence.descriptor,
      registry: evidence.registry,
      historical: evidence.historical,
      slowDead: evidence.slowDead,
      readiness: evidence.readiness,
      repeated: evidence.repeated,
      rollback: Object.fromEntries(Object.entries(evidence.rollback).map(([key, value]) => [key, {
        status: value.status,
        beforeHash: sha256(value.beforeHash),
        afterHash: sha256(value.afterHash)
      }]))
    };
    console.log(JSON.stringify({
      status: "PASS",
      evidence: compactEvidence,
      evidenceSha256: sha256(compactEvidence),
      pageErrors,
      consoleErrors,
      externalRequests
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error));
  process.exitCode = 1;
});
