(() => {
  "use strict";

  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function rowsInCsv(csv) {
    return String(csv || "").trimEnd().split("\n").length - 1;
  }

  function caseByEntityKey(runtime) {
    return new Map((runtime?.result?.cases || []).map(item => [item.inventory_entity_key, item]));
  }

  function rowByMaterial(rows) {
    return new Map((rows || []).map(item => [item.material_id, item]));
  }

  let sharedDemoContextPromise = null;

  function sharedDemoContext() {
    if (!sharedDemoContextPromise) {
      sharedDemoContextPromise = helpers.loadApp().then(async app => {
        const bridge = app.__obsoliqTestBridge;
        const result = await bridge.loadFullDemoForTest({ suppressFeedback: true });
        return { app, bridge, demo: app.ObsoliQFullDemo, result };
      });
    }
    return sharedDemoContextPromise;
  }

  test("DATA-FOUNDATION-ACTIVATION-01 loads the linked three-source demo through the productive package chain", async assert => {
    const { app, bridge, demo, result } = await sharedDemoContext();
    const registry = bridge.getRegistryStats();
    const inventory = bridge.getActiveInventoryPackage();
    const materialMaster = bridge.getActiveMaterialMasterPackage();
    const history = bridge.getActiveConsumptionHistoryPackage();

    assert.equal(result.status, "loaded", "The atomic linked demo load must complete");
    assert.equal(demo.classification, "synthetic", "Demo data must remain explicitly synthetic");
    assert.equal(demo.analysisAsOf, "2026-08-31", "The demo must use the frozen analysis date");
    assert.equal(demo.timezone, "UTC", "The demo time boundary must be UTC");
    assert.equal(rowsInCsv(demo.sources.inventorySnapshot.csv), 102, "Inventory row count must be frozen");
    assert.equal(rowsInCsv(demo.sources.materialMaster.csv), 98, "Material Master row count must be frozen");
    assert.equal(rowsInCsv(demo.sources.consumptionHistory.csv), 2260, "Consumption History row count must be frozen");
    assert.equal(registry.packageCount, 3, "Exactly three active demo packages must exist");
    assert.equal(registry.sequence, 3, "A first successful full-demo load must consume exactly three package IDs");
    assert.equal(inventory.freshness.asOfDate, demo.analysisAsOf, "Inventory freshness must own analysis-as-of");
    [inventory, materialMaster, history].forEach(packageRecord => {
      assert.equal(packageRecord.sourceDescriptor.sourceType, "synthetic_demo", "Every demo package must retain its synthetic source type");
      assert.equal(packageRecord.sourceDescriptor.classification, "synthetic", "Every demo package must retain provenance classification");
      assert.equal(packageRecord.sourceDescriptor.demo_set_id, demo.demoSetId, "Every demo package must remain linked to one demo set");
      assert.equal(packageRecord.sourceDescriptor.analysis_as_of, demo.analysisAsOf, "Every demo package must retain the frozen analysis date");
      assert.equal(packageRecord.sourceDescriptor.timezone, "UTC", "Every demo package must retain the UTC boundary");
      assert.deepEqual(packageRecord.sourceDescriptor.content_hashes, demo.contentHashes, "Every demo package must retain the same content fingerprints");
    });

    bridge.renderOverviewForTest();
    bridge.renderPackageAvailabilityForTest();
    const details = app.document.querySelector("#dataPackagesPanel .data-foundation");
    details.open = true;
    const german = app.document.getElementById("dataPackagesPanel").textContent;
    assert.ok(german.includes("Bestandsdaten"), "German UI must show Inventory Data");
    assert.ok(german.includes("Materialstamm"), "German UI must show Material Master");
    assert.ok(german.includes("Verbrauchshistorie"), "German UI must show Consumption History");
    assert.equal(app.document.querySelectorAll("[data-download-data-foundation-template]").length, 2, "The existing Data Foundation drawer must expose two template downloads");
    assert.equal(app.document.querySelectorAll("#dataPackagesPanel input[type=file]").length, 0, "The Data Foundation panel must not introduce another uploader");
    assert.equal(demo.templates.materialMaster.csv.split("\n").filter(Boolean).length, 1, "Material Master template must be header-only");
    assert.equal(demo.templates.consumptionHistory.csv.split("\n").filter(Boolean).length, 1, "Consumption History template must be header-only");

    bridge.updateLanguageForTest("en");
    bridge.renderPackageAvailabilityForTest();
    const english = app.document.getElementById("dataPackagesPanel").textContent;
    assert.ok(english.includes("Inventory Data"), "English UI must show Inventory Data");
    assert.ok(english.includes("Material Master"), "English UI must show Material Master");
    assert.ok(english.includes("Consumption History"), "English UI must show Consumption History");
    assert.ok(english.includes("Download Material Master template"), "English UI must localize the Material Master template action");
    assert.ok(english.includes("Download consumption history template"), "English UI must localize the History template action");
    bridge.updateLanguageForTest("de");
  });

  test("DATA-FOUNDATION-ACTIVATION-01 reconciles every controlled entity with the independent oracle", async assert => {
    const { app, bridge } = await sharedDemoContext();
    const oracle = app.ObsoliQFullDemo.expectations;

    const historical = bridge.getHistoricalMetricsRuntimeResultForTest();
    const slowDead = bridge.getSlowDeadRecoveryCaseRuntimeForTest();
    const rows = bridge.getEnrichedRowsForTest();
    const rowsByMaterial = rowByMaterial(rows);
    const casesByEntity = caseByEntityKey(slowDead);
    const metricsByEntity = historical.historicalMetricsByInventoryEntityKey || {};
    const enrichment = bridge.getInventoryEnrichmentProvenanceForTest();

    assert.ok(["available", "limited"].includes(historical.status), "Historical Runtime must be usable");
    assert.ok(["available", "limited"].includes(slowDead.status), "Slow/Dead Runtime must be usable");
    assert.equal(oracle.controlled_entities.length, 98, "The independent oracle must cover all linked entities");

    oracle.controlled_entities.forEach(expected => {
      const row = rowsByMaterial.get(expected.material_id);
      const metric = metricsByEntity[expected.inventory_entity_key];
      const caseRecord = casesByEntity.get(expected.inventory_entity_key);
      const provenance = row ? enrichment[row.inventory_row_key] : null;

      assert.ok(Boolean(row), `${expected.material_id} must exist in the enriched Inventory`);
      assert.equal(row?.plant, expected.plant, `${expected.material_id} must preserve exact Plant identity`);
      assert.equal(row?.base_unit, "EA", `${expected.material_id} must receive the Material Master base unit`);
      assert.equal(provenance?.relationshipStatus, "matched", `${expected.material_id} must have a Material Master match`);
      assert.equal(provenance?.matchType, "exact_material_plant", `${expected.material_id} must use exact material/plant enrichment`);
      assert.equal(provenance?.fields?.base_unit?.source, "material_master", `${expected.material_id} unit provenance must remain Material Master`);
      assert.equal(provenance?.fields?.base_unit?.policy, "fill_missing_only", `${expected.material_id} unit enrichment must remain fill-missing-only`);

      if (expected.cohort === "no_history") {
        assert.equal(metric, undefined, `${expected.material_id} must remain without fabricated Historical metrics`);
      } else {
        assert.ok(Boolean(metric), `${expected.material_id} must have a Historical metric`);
        assert.equal(metric?.matchType, expected.expected_relationship_type, `${expected.material_id} relationship must match the oracle`);
        assert.equal(metric?.unit, "EA", `${expected.material_id} history unit must be EA`);
        assert.equal(metric?.inventory_unit, "EA", `${expected.material_id} Inventory unit must be EA`);
        assert.equal(metric?.history_coverage_months, expected.expected_history_coverage_months, `${expected.material_id} observed inclusive coverage must match`);
        assert.equal(metric?.history_completeness, expected.expected_history_completeness, `${expected.material_id} 12-month completeness must match`);
        assert.equal(metric?.net_consumption_quantity_3m, expected.expected_net_consumption_3m, `${expected.material_id} 3-month net quantity must match`);
        assert.equal(metric?.net_consumption_quantity_6m, expected.expected_net_consumption_6m, `${expected.material_id} 6-month net quantity must match`);
        assert.equal(metric?.net_consumption_quantity_12m, expected.expected_net_consumption_12m, `${expected.material_id} 12-month net quantity must match`);
        assert.equal(metric?.months_since_last_consumption, expected.expected_months_since_last_consumption, `${expected.material_id} recency must match`);
      }

      assert.equal(caseRecord?.condition_code || null, expected.expected_condition_code, `${expected.material_id} condition must match the oracle`);
      assert.equal(caseRecord?.evidence_strength || "not_applicable", expected.expected_evidence_strength, `${expected.material_id} evidence strength must match`);
      assert.equal(caseRecord?.recovery_case_eligibility?.eligibility || "no_case", expected.expected_recovery_case_eligibility, `${expected.material_id} case eligibility must match`);
      if (expected.expected_action_eligibility !== "none") {
        assert.ok((caseRecord?.action_eligibility || []).some(action => action.eligibility_status === expected.expected_action_eligibility), `${expected.material_id} must expose the expected action eligibility`);
      }
    });

    const controlledEntityKeys = new Set(oracle.controlled_entities.map(item => item.inventory_entity_key));
    const controlledCases = (slowDead.result?.cases || []).filter(item => controlledEntityKeys.has(item.inventory_entity_key));
    const actualConditionCounts = controlledCases.reduce((counts, item) => {
      counts[item.condition_code] = (counts[item.condition_code] || 0) + 1;
      return counts;
    }, { no_case: oracle.controlled_entities.length - controlledCases.length });
    assert.deepEqual(actualConditionCounts, oracle.expected_condition_counts, "Runtime condition counts must reconcile exactly with the oracle");

    const boundary = oracle.boundary_entities;
    const metricFor = materialId => metricsByEntity[oracle.controlled_entities.find(item => item.material_id === materialId)?.inventory_entity_key];
    assert.equal(metricFor(boundary.coverage_11).history_coverage_months, 11, "The 11-month boundary must remain explicit");
    assert.equal(metricFor(boundary.coverage_12).history_coverage_months, 12, "The 12-month boundary must remain explicit");
    assert.equal(metricFor(boundary.coverage_13).history_coverage_months, 13, "The 13-month boundary must remain explicit");
    assert.equal(metricFor(boundary.coverage_24).history_coverage_months, 24, "The 24-month boundary must remain explicit");
    assert.equal(metricFor(boundary.true_zero).net_consumption_quantity_12m, 0, "A true numeric zero must remain zero");
    assert.equal(metricFor(boundary.no_history), undefined, "Missing history must remain missing rather than zero");
    assert.equal(metricFor(boundary.reversal).net_consumption_quantity_3m, 275, "Movement 262 must reduce the net quantity as reversal evidence");

    const riskModel = bridge.getInventoryRiskPageModelForTest();
    assert.ok(riskModel.summary.evidenceReadyCount > 0, "The linked demo must produce a positive readiness numerator");
    assert.ok(riskModel.summary.evidenceTotalCount > 0, "The linked demo must produce a positive readiness denominator");
    assert.equal(riskModel.summary.evidenceReadiness, riskModel.summary.evidenceReadyCount / riskModel.summary.evidenceTotalCount, "Readiness must be an exact numerator/denominator reconciliation");
  });

  test("DATA-FOUNDATION-ACTIVATION-01 keeps full-demo loading repeatable, atomic and isolated from user Inventory", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const demo = app.ObsoliQFullDemo;
    await bridge.loadFullDemoForTest({ suppressFeedback: true });
    const firstStats = bridge.getRegistryStats();
    const firstPackageIdentity = bridge.getRegistrySnapshot().packages.map(item => ({
      packageId: item.packageId,
      packageType: item.packageType,
      revision: item.revision
    }));

    const repeated = await bridge.loadFullDemoForTest({ suppressFeedback: true });
    assert.equal(repeated.status, "loaded", "A repeated demo load must succeed");
    assert.deepEqual(bridge.getRegistryStats(), firstStats, "A repeated demo load must not accumulate packages or consume sequence values");
    assert.deepEqual(bridge.getRegistrySnapshot().packages.map(item => ({
      packageId: item.packageId,
      packageType: item.packageType,
      revision: item.revision
    })), firstPackageIdentity, "A repeated demo load must preserve Package identities and revisions");

    for (const phase of ["after_inventory", "after_material_master", "after_consumption_history"]) {
      const before = bridge.snapshotDatasetRuntimeState();
      const failed = await bridge.loadFullDemoForTest({
        suppressFeedback: true,
        suppressErrorLog: true,
        forceFullDemoFailureForTest: phase
      });
      assert.equal(failed.status, "error", `${phase} must fail closed`);
      assert.deepEqual(bridge.snapshotDatasetRuntimeState(), before, `${phase} must restore the complete prior runtime`);
    }

    const userInventory = await bridge.loadUserInventoryTextForTest(app.sampleCsv, "user-inventory.csv", {
      suppressFeedback: true,
      suppressSuccessFeedback: true,
      render: false
    });
    assert.equal(userInventory.status, "loaded", "A normal user Inventory import must still succeed");
    assert.equal(bridge.getActiveInventoryPackage().sourceDescriptor.sourceType, "upload", "The user Inventory package must retain upload provenance");
    assert.equal(bridge.getActiveMaterialMasterPackage(), null, "Synthetic demo Material Master must not leak into a user Inventory");
    assert.equal(bridge.getActiveConsumptionHistoryPackage(), null, "Synthetic demo History must not leak into a user Inventory");
    assert.equal(bridge.getRegistryStats().activePackageCount, 1, "Only the user Inventory package may remain active after replacement");

    const beforeHeaderOnly = bridge.getRegistrySnapshot();
    const headerOnlyMaster = await bridge.importMaterialMasterTextForTest(
      demo.templates.materialMaster.csv,
      "header-only-material-master.csv",
      { suppressFeedback: true, suppressErrorLog: true, render: false }
    );
    assert.equal(headerOnlyMaster.status, "error", "Header-only Material Master must be rejected");
    assert.deepEqual(bridge.getRegistrySnapshot(), beforeHeaderOnly, "Rejected header-only Material Master must not consume Package state");

    const headerOnlyHistory = await bridge.importConsumptionHistoryTextForTest(
      demo.templates.consumptionHistory.csv,
      "header-only-history.csv",
      { suppressFeedback: true, suppressErrorLog: true, render: false }
    );
    assert.equal(headerOnlyHistory.status, "error", "Header-only Consumption History must be rejected");
    assert.deepEqual(bridge.getRegistrySnapshot(), beforeHeaderOnly, "Rejected header-only History must not consume Package state");
  });

})();
