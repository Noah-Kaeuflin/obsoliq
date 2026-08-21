(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function packageRecord({ packageId, packageType, revision = 1, rows = [] }) {
    return {
      packageId,
      packageType,
      datasetId: `DS-${packageId}`,
      revision,
      status: "ready",
      buildData: {
        packageRows: rows,
        buildMetadata: { datasetId: `DS-${packageId}` }
      }
    };
  }

  test("AP 16.4c Relationship Engine matches exact first and blocks plantless fan-out", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.data.consumptionHistoryRelationshipEngine;
    const inventoryRows = [
      { inventory_row_key: "INV-1", row_number: 1, material_id: "0000123", plant: "DE01", stock_quantity: 10, base_unit: "EA" },
      { inventory_row_key: "INV-2", row_number: 2, material_id: "0000124", plant: "DE02", stock_quantity: 20, base_unit: "EA" },
      { inventory_row_key: "INV-3", row_number: 3, material_id: "0000999", plant: "DE01", stock_quantity: 30, base_unit: "EA" },
      { inventory_row_key: "INV-4", row_number: 4, material_id: "0000125", plant: "DE01", stock_quantity: 40, base_unit: "EA" },
      { inventory_row_key: "INV-5", row_number: 5, material_id: "0000125", plant: "DE02", stock_quantity: 50, base_unit: "EA" },
      { inventory_row_key: "INV-6", row_number: 6, material_id: "", plant: "DE01", stock_quantity: 60, base_unit: "EA" }
    ];
    const historyRows = [
      { package_row_key: "CH-1", material_id: "0000123", plant: "DE01" },
      { package_row_key: "CH-2", material_id: "0000123", plant: "" },
      { package_row_key: "CH-3", material_id: "0000124", plant: "" },
      { package_row_key: "CH-4", material_id: "0000125", plant: "" },
      { package_row_key: "CH-5", material_id: "0000888", plant: "DE01" },
      { package_row_key: "CH-6", material_id: "", plant: "DE01" }
    ];

    const result = engine.buildInventoryHistoryRelationship({
      inventoryPackage: packageRecord({ packageId: "PKG-INV-HIST-REL", packageType: "inventory_snapshot", revision: 7, rows: inventoryRows }),
      historyPackage: packageRecord({ packageId: "PKG-CH-HIST-REL", packageType: "consumption_history", revision: 3, rows: historyRows }),
      evaluatedAt: "2026-08-21T00:00:00.000Z"
    });
    const exact = result.matchesByInventoryEntityKey[engine.entityKey("0000123", "DE01")];
    const fallback = result.matchesByInventoryEntityKey[engine.entityKey("0000124", "DE02")];

    assert.equal(result.status, "executed", "Relationship should execute for valid package rows");
    assert.equal(result.exactMatchCount, 1, "One exact Material + Plant match expected");
    assert.equal(result.fallbackMatchCount, 1, "One unique material fallback expected");
    assert.equal(result.unmatchedInventoryCount, 1, "One unmatched inventory entity expected");
    assert.equal(result.ambiguousCount, 2, "Plantless History must be blocked for two plant-specific Inventory entities");
    assert.equal(result.invalidKeyCount, 2, "Invalid inventory and history material keys should both be diagnosed");
    assert.equal(exact.matchType, "exact_material_plant", "Exact Material + Plant match must take priority over material fallback");
    assert.equal(fallback.matchType, "material_fallback", "Unique material-only relationship should be explicit fallback");
    assert.equal(exact.materialId, "0000123", "Leading zero Material IDs must be preserved");
    assert.ok(result.ambiguousRelationships.every(item => item.reason === "material_history_fanout_blocked"), "Fan-out ambiguity should expose its reason");
    assert.equal(result.historyEntityAssignmentIndex[engine.entityKey("0000124", "")], engine.entityKey("0000124", "DE02"), "Fallback History entity should be assigned to exactly one Inventory entity");
  });
})();
