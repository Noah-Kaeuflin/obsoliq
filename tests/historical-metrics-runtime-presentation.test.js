(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function historyCsvFor(row, months = 12, quantity = 5) {
    const header = "Material Number,Plant,Posting Date,Period,Consumption Quantity,Base Unit,Movement Type,Document Number,Document Item";
    const rows = [];
    for (let index = 0; index < months; index += 1) {
      const month = String(index + 1).padStart(2, "0");
      rows.push([
        row.material_id,
        row.plant || "",
        `2026-${month}-15`,
        `2026-${month}`,
        String(quantity),
        row.base_unit || "EA",
        "261",
        `49${String(index + 1).padStart(8, "0")}`,
        "0001"
      ].join(","));
    }
    return [header, ...rows].join("\n");
  }

  function importHistory(app, bridge, options = {}) {
    const row = bridge.getEnrichedRowsForTest().find(item => item.material_id && item.plant)
      || bridge.getEnrichedRowsForTest().find(item => item.material_id);
    return bridge.importConsumptionHistoryTextForTest(historyCsvFor(row, options.months || 12, options.quantity || 5), options.fileName || "history-runtime-presentation.csv", {
      suppressFeedback: true,
      semanticPolicy: {
        analysisAsOf: { date: options.analysisAsOf || "2026-12-31", source: "user_confirmed", userConfirmed: true },
        reviewConfirmed: true
      }
    });
  }

  function waitForFrame(app) {
    return new Promise(resolve => app.setTimeout(resolve, 40));
  }

  test("AP 16.4c.1 Missing Consumption History renders one empty state without false zero metrics", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.resetHistoricalMetricsBuildCountersForTest();

    const panelText = bridge.renderPackageAvailabilityForTest();
    const runtime = bridge.getHistoricalMetricsRuntimeForTest();
    const counters = bridge.getHistoricalMetricsBuildCountersForTest();

    assert.equal(runtime.status, "unavailable", "Missing Consumption History should be an unavailable runtime state");
    assert.ok(panelText.includes("Verbrauchshistorie"), "Data Foundation should name Consumption History in German");
    assert.ok(panelText.includes("Noch nicht verfügbar") || panelText.includes("Nicht verfügbar"), "Missing history should render a compact unavailable state");
    assert.equal(panelText.includes("Exakte Zuordnungen"), false, "Missing history should not render exact-match zero metrics");
    assert.equal(panelText.includes("Fallback-Zuordnungen"), false, "Missing history should not render fallback zero metrics");
    assert.equal(panelText.includes("Aktueller Monat unvollständig"), false, "Missing history should not render a false boolean partial-period value");
    assert.equal(counters.buildCount, 0, "Rendering Data Foundation without history must not start a metrics build");
  });

  test("AP 16.4c.1 Presentation interactions do not rebuild historical metrics", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const originalTheme = app.document.getElementById("darkModeToggle").checked;

    const imported = importHistory(app, bridge);
    const calculating = bridge.getHistoricalMetricsRuntimeForTest();
    await bridge.waitForHistoricalMetricsRuntimeForTest();
    const before = bridge.getHistoricalMetricsRuntimeForTest();
    bridge.resetHistoricalMetricsBuildCountersForTest();

    try {
      bridge.renderPackageAvailabilityForTest();
      const details = app.document.querySelector("#dataPackagesPanel .data-foundation");
      if (details) details.open = true;
      bridge.closeDataFoundationDetailForTest();
      bridge.renderOverviewForTest();
      bridge.switchViewForTest("inventory");
      bridge.renderInventoryExplorerForTest();
      bridge.setColumnFilterForTest("inventory", "material_id", "MAT");
      bridge.setColumnSortForTest("inventory", "material_id", "asc");
      bridge.showDownloadDialogForTest("inventory", { defaultVariant: "historical" });

      const languageSelect = app.document.getElementById("languageSelect");
      languageSelect.value = "en";
      languageSelect.dispatchEvent(new app.Event("change", { bubbles: true }));
      const currencySelect = app.document.getElementById("currencySelect");
      currencySelect.value = "USD";
      currencySelect.dispatchEvent(new app.Event("change", { bubbles: true }));
      const themeToggle = app.document.getElementById("darkModeToggle");
      themeToggle.checked = !themeToggle.checked;
      themeToggle.dispatchEvent(new app.Event("change", { bubbles: true }));

      await waitForFrame(app);
      const counters = bridge.getHistoricalMetricsBuildCountersForTest();
      const after = bridge.getHistoricalMetricsRuntimeForTest();

      assert.equal(imported.status, "loaded", "Consumption History package should import");
      assert.equal(calculating.status, "calculating", "Lifecycle import should expose calculating before the scheduled build runs");
      assert.notEqual(before.status, "calculating", "Historical runtime should complete before presentation checks");
      assert.equal(counters.buildCount, 0, "Presentation-only interactions must not execute another historical build");
      assert.equal(after.completedInputSignature, before.completedInputSignature, "Presentation-only interactions should keep the completed input signature");
    } finally {
      const languageSelect = app.document.getElementById("languageSelect");
      languageSelect.value = "de";
      languageSelect.dispatchEvent(new app.Event("change", { bubbles: true }));
      const currencySelect = app.document.getElementById("currencySelect");
      currencySelect.value = "EUR";
      currencySelect.dispatchEvent(new app.Event("change", { bubbles: true }));
      const themeToggle = app.document.getElementById("darkModeToggle");
      themeToggle.checked = originalTheme;
      themeToggle.dispatchEvent(new app.Event("change", { bubbles: true }));
    }
  });

  test("AP 16.4c.1 Historical export variant follows runtime availability without triggering builds", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;

    bridge.resetHistoricalMetricsBuildCountersForTest();
    bridge.showDownloadDialogForTest("inventory", { defaultVariant: "historical" });
    const missingHistorical = app.document.getElementById("downloadVariantHistorical");
    const missingEnriched = app.document.getElementById("downloadVariantEnriched");
    const missingCounters = bridge.getHistoricalMetricsBuildCountersForTest();

    assert.equal(missingHistorical.disabled, true, "Historical export should be disabled while metrics are unavailable");
    assert.equal(missingEnriched.checked, true, "Unavailable historical export should fall back to the enriched variant");
    assert.equal(missingCounters.buildCount, 0, "Opening the export dialog must not calculate historical metrics");

    importHistory(app, bridge);
    bridge.showDownloadDialogForTest("inventory", { defaultVariant: "historical" });
    assert.equal(app.document.getElementById("downloadVariantHistorical").disabled, true, "Historical export should stay disabled while calculating");
    await bridge.waitForHistoricalMetricsRuntimeForTest();
    bridge.resetHistoricalMetricsBuildCountersForTest();
    bridge.showDownloadDialogForTest("inventory", { defaultVariant: "historical" });

    assert.equal(app.document.getElementById("downloadVariantHistorical").disabled, false, "Historical export should be enabled only after a current runtime is available");
    assert.equal(app.document.getElementById("downloadVariantHistorical").checked, true, "Historical export can be selected after completion");
    assert.equal(bridge.getHistoricalMetricsBuildCountersForTest().buildCount, 0, "Opening the available historical export still must not rebuild");
  });
})();
