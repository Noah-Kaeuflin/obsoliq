(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function packageRecord({ packageId, packageType, datasetId, revision = 1, rows = [], keys = {}, keyGranularity = "material_plant" }) {
    return {
      packageId,
      packageType,
      datasetId,
      revision,
      status: "ready",
      relationshipKeys: keys,
      packageValidation: { statusKey: "ready", keyGranularity },
      buildData: {
        packageRows: rows,
        buildMetadata: { datasetId, keyGranularity }
      }
    };
  }

  test("AP 16.2b Relationship Engine classifies exact, fallback, unmatched, ambiguous and invalid rows", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.data.packageRelationshipEngine;
    const inventoryRows = [
      { inventory_row_key: "INV-1", __sourceRowIndex: 1, material_id: "0000123", plant: "DE01" },
      { inventory_row_key: "INV-2", __sourceRowIndex: 2, material_id: "0000124", plant: "" },
      { inventory_row_key: "INV-3", __sourceRowIndex: 3, material_id: "0000999", plant: "DE01" },
      { inventory_row_key: "INV-4", __sourceRowIndex: 4, material_id: "0000125", plant: "" },
      { inventory_row_key: "INV-5", __sourceRowIndex: 5, material_id: "", plant: "DE01" }
    ];
    const materialRows = [
      { __sourceRowIndex: 10, material_id: "0000123", plant: "DE01", material_description: "Exact" },
      { __sourceRowIndex: 11, material_id: "0000124", plant: "DE02", material_description: "Unique fallback" },
      { __sourceRowIndex: 12, material_id: "0000125", plant: "DE01", material_description: "Ambiguous A" },
      { __sourceRowIndex: 13, material_id: "0000125", plant: "DE02", material_description: "Ambiguous B" }
    ];
    const result = engine.createInventoryMaterialMasterRelationship({
      inventoryPackage: packageRecord({
        packageId: "PKG-INV",
        packageType: "inventory_snapshot",
        datasetId: "DS-INV",
        rows: inventoryRows,
        keys: { material: ["material_id"], organization: ["plant"] }
      }),
      materialMasterPackage: packageRecord({
        packageId: "PKG-MM",
        packageType: "material_master",
        datasetId: "DS-MM",
        revision: 3,
        rows: materialRows,
        keys: { material: ["material_id"], organization: ["plant"] },
        keyGranularity: "material_plant"
      })
    });
    assert.equal(result.status, "executed", "Relationship should execute");
    assert.equal(result.exactMatchCount, 1, "One exact Material + Plant match expected");
    assert.equal(result.fallbackMatchCount, 1, "One controlled material-only fallback expected");
    assert.equal(result.unmatchedCount, 1, "One unmatched row expected");
    assert.equal(result.ambiguousCount, 1, "One ambiguous row expected");
    assert.equal(result.invalidKeyCount, 1, "One invalid inventory material key expected");
    assert.equal(result.matchRate, 0.5, "Match rate should be matched / eligible rows");
    assert.equal(result.matches[0].materialId, "0000123", "Leading zeros must be preserved");
    assert.equal(result.matches[0].materialMasterPackageRevision, 3, "Match record should include Material Master revision");
  });

  test("AP 16.2b Relationship Engine treats duplicate active Material Master keys as ambiguous", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.data.packageRelationshipEngine;
    const result = engine.buildInventoryMaterialMasterRelationship({
      inventoryPackage: packageRecord({
        packageId: "PKG-INV",
        packageType: "inventory_snapshot",
        datasetId: "DS-INV",
        rows: [{ inventory_row_key: "INV-DUP", __sourceRowIndex: 1, material_id: "MAT-DUP", plant: "DE01" }],
        keys: { material: ["material_id"], organization: ["plant"] }
      }),
      materialMasterPackage: packageRecord({
        packageId: "PKG-MM",
        packageType: "material_master",
        datasetId: "DS-MM",
        rows: [
          { __sourceRowIndex: 2, material_id: "MAT-DUP", plant: "DE01" },
          { __sourceRowIndex: 3, material_id: "MAT-DUP", plant: "DE01" }
        ],
        keys: { material: ["material_id"], organization: ["plant"] },
        keyGranularity: "material_plant"
      })
    });
    assert.equal(result.exactMatchCount, 0, "Duplicate exact candidates must not be selected");
    assert.equal(result.ambiguousCount, 1, "Duplicate key should create an ambiguous inventory row");
    assert.equal(result.conflictCount, 1, "Duplicate active Material Master key should be reported as relationship conflict");
    assert.equal(result.ambiguous[0].candidateSourceRowIndexes.length, 2, "Both candidate source rows should be exposed");
  });

  test("AP 16.2b Relationship Engine supports material-level granularity and 10k/25k indexed performance", async assert => {
    const app = await helpers.loadProductionApp();
    const engine = app.ObsoliQ.data.packageRelationshipEngine;
    const inventoryRows = Array.from({ length: 10000 }, (_, index) => ({
      inventory_row_key: `INV-${index}`,
      __sourceRowIndex: index + 1,
      material_id: `MAT-${String(index).padStart(5, "0")}`,
      plant: index % 2 ? "DE02" : "DE01"
    }));
    const materialRows = Array.from({ length: 25000 }, (_, index) => ({
      __sourceRowIndex: index + 1,
      material_id: `MAT-${String(index).padStart(5, "0")}`,
      material_description: `Material ${index}`
    }));
    const started = performance.now();
    const result = engine.buildInventoryMaterialMasterRelationship({
      inventoryPackage: packageRecord({
        packageId: "PKG-INV-PERF",
        packageType: "inventory_snapshot",
        datasetId: "DS-INV-PERF",
        rows: inventoryRows,
        keys: { material: ["material_id"], organization: ["plant"] }
      }),
      materialMasterPackage: packageRecord({
        packageId: "PKG-MM-PERF",
        packageType: "material_master",
        datasetId: "DS-MM-PERF",
        rows: materialRows,
        keys: { material: ["material_id"] },
        keyGranularity: "material"
      })
    });
    const duration = performance.now() - started;
    assert.equal(result.matchedInventoryRowCount, 10000, "All inventory rows should match by material-level granularity");
    assert.equal(result.fallbackMatchCount, 10000, "Material-level matches should be counted as fallback/material matches");
    assert.ok(duration < 5000, `Relationship indexing should avoid O(n*m) scans (${Math.round(duration)} ms)`);
  });
})();
