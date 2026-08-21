(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function materialMasterPackage(rows) {
    return {
      packageId: "PKG-MM-ENR",
      packageType: "material_master",
      datasetId: "DS-MM-ENR",
      revision: 2,
      status: "ready",
      relationshipKeys: { material: ["material_id"], organization: ["plant"] },
      packageValidation: { statusKey: "ready", keyGranularity: "material_plant" },
      mapping: {
        columnMapping: [
          { selectedCanonicalField: "material_id", status: "mapped" },
          { selectedCanonicalField: "plant", status: "mapped" },
          { selectedCanonicalField: "material_description", status: "mapped" },
          { selectedCanonicalField: "program_short", status: "mapped" },
          { selectedCanonicalField: "mrp_controller", status: "mapped" },
          { selectedCanonicalField: "standard_price", status: "mapped" },
          { selectedCanonicalField: "stock_value", status: "mapped" }
        ]
      },
      buildData: {
        packageRows: rows,
        buildMetadata: { datasetId: "DS-MM-ENR", keyGranularity: "material_plant" }
      }
    };
  }

  test("AP 16.2b Enrichment Engine fills approved missing fields and keeps Inventory conflicts authoritative", async assert => {
    const app = await helpers.loadProductionApp();
    const relationshipEngine = app.ObsoliQ.data.packageRelationshipEngine;
    const enrichmentEngine = app.ObsoliQ.data.packageEnrichmentEngine;
    const inventoryRows = [{
      inventory_row_key: "INV-1",
      __sourceRowIndex: 1,
      material_id: "MAT-1045",
      plant: "DE01",
      material_description: "",
      program_short: "INV-PROG",
      mrp_controller: "",
      stock_value: 164000
    }];
    const mmPackage = materialMasterPackage([{
      __sourceRowIndex: 482,
      material_id: "MAT-1045",
      plant: "DE01",
      material_description: "Pressure Sensor",
      program_short: "MM-PROG",
      mrp_controller: "MRP-04",
      standard_price: "999",
      stock_value: "1"
    }]);
    const relationship = relationshipEngine.buildInventoryMaterialMasterRelationship({
      inventoryPackage: {
        packageId: "PKG-INV-ENR",
        packageType: "inventory_snapshot",
        datasetId: "DS-INV-ENR",
        revision: 1,
        relationshipKeys: { material: ["material_id"], organization: ["plant"] },
        buildData: { packageRows: inventoryRows }
      },
      materialMasterPackage: mmPackage
    });
    const result = enrichmentEngine.enrichInventoryWithMaterialMaster({
      inventoryRows,
      inventoryPackage: { packageId: "PKG-INV-ENR", datasetId: "DS-INV-ENR", revision: 1 },
      materialMasterPackage: mmPackage,
      relationshipResult: relationship
    });
    const row = result.enrichedRows[0];
    assert.equal(row.material_description, "Pressure Sensor", "Missing description should be enriched");
    assert.equal(row.mrp_controller, "MRP-04", "Missing MRP controller should be enriched");
    assert.equal(row.program_short, "INV-PROG", "Existing Inventory context must not be overwritten");
    assert.equal(row.stock_value, 164000, "Financial fields must not be enriched");
    assert.equal(result.enrichedFieldCount, 2, "Only missing approved context fields should be filled");
    assert.equal(result.conflictCount, 1, "Conflicting program should be recorded");
    assert.equal(result.conflicts[0].resolution, "kept_inventory_value", "Conflict policy should keep Inventory value");
    assert.ok(result.provenanceByRowKey["INV-1"].fields.material_description, "Field-level provenance should be recorded");
    assert.equal(result.provenanceByRowKey["INV-1"].fields.material_description.materialMasterSourceRowIndex, 482, "Provenance should include Material Master source row");
    assert.equal(Object.prototype.propertyIsEnumerable.call(row, "__obsoliq_enrichment"), false, "Technical provenance attachment must not become an export column");
  });
})();
