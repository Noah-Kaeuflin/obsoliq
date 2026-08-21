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

  test("AP 16.4c Integration exposes CH columns in Inventory Explorer and historical export variant", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const row = bridge.getEnrichedRowsForTest().find(item => item.material_id && item.plant) || bridge.getEnrichedRowsForTest().find(item => item.material_id);
    const result = bridge.importConsumptionHistoryTextForTest(historyCsvFor(row), "history-integration.csv", {
      suppressFeedback: true,
      semanticPolicy: {
        analysisAsOf: { date: "2026-12-31", source: "user_confirmed", userConfirmed: true },
        reviewConfirmed: true
      }
    });
    const runtime = bridge.getHistoricalMetricsRuntimeForTest();
    const fieldKeys = bridge.historicalInventoryFieldKeysForTest();
    const composedRows = bridge.composeHistoricalInventoryRowsForTest([row]);
    const exportRows = bridge.enrichedRowsForExportForTest([row], { historical: true });
    const originalLikeExportRows = bridge.enrichedRowsForExportForTest([row], {});
    bridge.switchViewForTest("inventory");
    const inventoryTableText = app.document.getElementById("inventoryTable").textContent;
    app.document.getElementById("exportInventoryButton").click();
    const modalText = app.document.getElementById("downloadModal").textContent;

    assert.equal(result.status, "loaded", "Consumption History package should import");
    assert.notEqual(runtime.status, "unavailable", "Historical runtime should become available or limited");
    assert.includes(fieldKeys, "history_net_consumption_12m_ch", "Visible historical field list should include 12M consumption");
    assert.equal(composedRows[0].history_net_consumption_12m_ch, 60, "Composed inventory row should expose derived 12M metric");
    assert.ok(inventoryTableText.includes("· CH"), "Inventory Explorer should render derived CH columns");
    assert.ok(exportRows[0].some(header => String(header).includes("· CH")), "Historical export variant should include CH headers");
    assert.equal(originalLikeExportRows[0].some(header => String(header).includes("· CH")), false, "Default enriched export should not include historical CH columns");
    assert.ok(modalText.includes("historische Kennzahlen") || modalText.includes("Historical Metrics"), "Download modal should expose historical export variant");
  });

  test("AP 16.4c Data Foundation separates availability, relationship and metric status", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const row = bridge.getEnrichedRowsForTest().find(item => item.material_id && item.plant) || bridge.getEnrichedRowsForTest().find(item => item.material_id);
    bridge.importConsumptionHistoryTextForTest(historyCsvFor(row, 3, 4), "history-foundation.csv", {
      suppressFeedback: true,
      semanticPolicy: {
        analysisAsOf: { date: "2026-03-31", source: "user_confirmed", userConfirmed: true },
        reviewConfirmed: true
      }
    });
    const panelText = app.document.getElementById("dataPackagesPanel").textContent;

    assert.ok(panelText.includes("Verbrauchshistorie") || panelText.includes("Consumption History"), "Data Foundation should show Consumption History availability");
    assert.ok(panelText.includes("Historische Kennzahlen") || panelText.includes("Historical Metrics"), "Data Foundation should show Historical Metrics status");
    assert.ok(panelText.includes("Relationship") || panelText.includes("Verknüpf"), "Data Foundation should keep relationship status separate");
  });
})();
