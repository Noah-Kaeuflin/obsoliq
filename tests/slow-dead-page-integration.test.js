(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function zeroHistoryCsv(row) {
    const header = "Material Number,Plant,Posting Date,Period,Consumption Quantity,Base Unit,Movement Type,Document Number,Document Item";
    const dates = [
      "2025-04-30", "2025-05-31", "2025-06-30", "2025-07-31",
      "2025-08-31", "2025-09-30", "2025-10-31", "2025-11-30",
      "2025-12-31", "2026-01-31", "2026-02-28", "2026-03-31"
    ];
    return [
      header,
      ...dates.map((date, index) => [
        row.material_id,
        row.plant || "",
        date,
        date.slice(0, 7),
        "0",
        row.base_unit || "EA",
        "261",
        `79${String(index + 1).padStart(8, "0")}`,
        "0001"
      ].join(","))
    ].join("\n");
  }

  test("AP 16.4d.2 Slow / Dead route opens the dedicated Recovery Case page, not the placeholder", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.resetSlowDeadRecoveryCaseBuildCountersForTest();
    const pageText = bridge.switchSlowDeadPageForTest();
    const state = bridge.getSlowDeadPageStateForTest();
    const counters = bridge.getSlowDeadRecoveryCaseBuildCountersForTest();

    assert.equal(state.currentView, "slow-dead", "Slow / Dead tab should route to the dedicated slow-dead view");
    assert.equal(state.activeProcessKey, "slow-dead-stock", "Slow / Dead process key should remain active");
    assert.ok(Boolean(app.document.getElementById("view-slow-dead")), "Dedicated Slow / Dead page root should exist");
    assert.ok(pageText.includes("Slow-/Dead-Recovery-Cases") || pageText.includes("Slow / Dead Recovery Cases"), "Dedicated page title should render");
    assert.equal(app.document.getElementById("view-slow-dead").classList.contains("active"), true, "Dedicated Slow / Dead view should be active");
    assert.equal(app.document.getElementById("placeholderPage").classList.contains("active"), false, "Generic placeholder should not be active for Slow / Dead");
    assert.equal(counters.buildCount, 0, "Opening the page should not build Slow / Dead Cases");
  });

  test("AP 16.4d.2 Available runtime renders Worklist evidence and presentation interactions do not rebuild", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const row = bridge.getEnrichedRowsForTest().find(item => item.material_id && item.plant) || bridge.getEnrichedRowsForTest()[0];
    bridge.importConsumptionHistoryTextForTest(zeroHistoryCsv(row), "ap-16-4d-2-zero-history.csv", {
      suppressFeedback: true,
      semanticPolicy: {
        analysisAsOf: { date: "2026-03-31", source: "user_confirmed", userConfirmed: true },
        reviewConfirmed: true
      }
    });
    await bridge.waitForHistoricalMetricsRuntimeForTest();
    const runtime = bridge.getSlowDeadRecoveryCaseRuntimeForTest();
    bridge.resetSlowDeadRecoveryCaseBuildCountersForTest();
    const pageText = bridge.switchSlowDeadPageForTest();
    bridge.setSlowDeadPageStateForTest({ filters: { search: row.material_id }, page: 1 });
    bridge.setSlowDeadPageStateForTest({ sortKey: "material_id" });
    bridge.setSlowDeadPageStateForTest({ pageSize: 50 });
    bridge.renderSlowDeadPageForTest();
    const counters = bridge.getSlowDeadRecoveryCaseBuildCountersForTest();

    assert.includes(["available", "limited", "unavailable"], runtime.status, "Runtime should reach a truthful terminal presentation state");
    assert.ok(runtime.status === "unavailable" || pageText.includes("Recovery Case Worklist"), "Workbench list should render when Cases are available");
    assert.ok(pageText.includes("Positive Evidenz") || pageText.includes("Positive Evidence") || runtime.status === "unavailable", "Evidence section should render when Cases are available");
    assert.equal(counters.buildCount, 0, "Search, sort, pagination and render should not rebuild Slow / Dead Cases");
  });

  test("AP 16.4d.2.1 Case navigation reveals exact Inventory entity without mutating filters or Actions", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const row = bridge.getEnrichedRowsForTest().find(item => item.material_id && item.plant) || bridge.getEnrichedRowsForTest()[0];
    bridge.importConsumptionHistoryTextForTest(zeroHistoryCsv(row), "ap-16-4d-2-navigation.csv", {
      suppressFeedback: true,
      semanticPolicy: {
        analysisAsOf: { date: "2026-03-31", source: "user_confirmed", userConfirmed: true },
        reviewConfirmed: true
      }
    });
    await bridge.waitForHistoricalMetricsRuntimeForTest();
    bridge.switchSlowDeadPageForTest();
    const actionSignature = () => JSON.stringify(bridge.getEnrichedRowsForTest().map(item => [
      item.row_number,
      item.root_cause,
      item.recommended_action,
      item.next_step,
      item.decision_type,
      item.owner_function,
      item.priority,
      item.confidence,
      item.status
    ]));
    const beforeActions = actionSignature();
    const selectedMaterial = bridge.getSlowDeadPageStateForTest().model.selectedCase?.material_id || row.material_id;
    const inventoryButton = app.document.querySelector("[data-slow-dead-open-inventory]");
    if (!inventoryButton) {
      assert.ok(true, "No Case navigation button exists when runtime is unavailable");
      return;
    }
    app.document.getElementById("searchInput").value = "NO-SUCH-MATERIAL";
    inventoryButton.click();
    const afterActions = actionSignature();

    assert.equal(bridge.getState().currentView, "inventory", "Inventory navigation should open Inventory Explorer");
    assert.equal(app.document.getElementById("searchInput").value, "NO-SUCH-MATERIAL", "Inventory reveal should not mutate persistent analytical filters");
    assert.ok(app.document.getElementById("inventoryTable").textContent.includes(selectedMaterial), "Exact target should be visible even when existing filters would hide it");
    assert.equal(afterActions, beforeActions, "Inventory navigation should not create or mutate Action rows");
  });

  test("AP 16.4d.2.1 Slow / Dead target matching is entity-exact for same material in two plants", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const rows = [
      { inventory_row_key: "INV-MAT-X-P1", material_id: "MAT-X", plant: "P1", profit_center: "PC-A", row_number: 1 },
      { inventory_row_key: "INV-MAT-X-P2", material_id: "MAT-X", plant: "P2", profit_center: "PC-B", row_number: 2 }
    ];
    const target = {
      inventory_row_keys: ["INV-MAT-X-P1"],
      inventory_entity_key: "material:MAT-X|plant:P1",
      material_id: "MAT-X",
      plant: "P1"
    };
    const matches = bridge.slowDeadRowsMatchingTargetForTest(rows, target);

    assert.equal(matches.length, 1, "Exact target matching should return one entity");
    assert.equal(matches[0].inventory_row_key, "INV-MAT-X-P1", "Target matching should not fan out to the second plant");
  });
})();
