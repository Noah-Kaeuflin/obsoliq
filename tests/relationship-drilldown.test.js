(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function inventoryCsv() {
    return [
      "Material Number,Plant,Material Description,Stock Value EUR,Profit Center,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value",
      "MAT-AMB,,Ambiguous inventory material,100000,PC-R,80000,0,0,0",
      "MAT-MISS,DE01,Missing master material,70000,PC-R,50000,0,0,0",
      "MAT-CONFLICT,DE01,Inventory description wins,90000,PC-R,60000,0,0,0"
    ].join("\n");
  }

  function materialMasterCsv() {
    return [
      "Material Number,Plant,Material Description,MRP Controller,Responsible L1",
      "MAT-AMB,DE01,Ambiguous master A,MRP-A,Planning A",
      "MAT-AMB,DE02,Ambiguous master B,MRP-B,Planning B",
      "MAT-CONFLICT,DE01,Master description conflict,MRP-C,Planning C"
    ].join("\n");
  }

  test("AP 16.3b Relationship drilldown explains ambiguous, unmatched and enrichment conflicts without mutating relationship state", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    assert.equal((await bridge.loadTextDataset(inventoryCsv(), "relationship-drilldown-inventory.csv", {
      sourceType: "upload",
      allowMappingReview: false
    })).status, "loaded", "Inventory relationship fixture should load");
    assert.equal(bridge.importMaterialMasterTextForTest(materialMasterCsv(), "relationship-drilldown-mm.csv").status, "loaded", "Material Master fixture should load");

    const beforeRelationship = bridge.getInventoryMaterialMasterRelationshipForTest();
    const beforeRows = bridge.getEnrichedRowsForTest();
    bridge.switchViewForTest("excess");
    const text = bridge.renderExcessPageForTest();

    assert.ok(beforeRelationship.ambiguousCount >= 1, "Relationship engine should detect ambiguous rows");
    assert.ok(beforeRelationship.unmatchedCount >= 1, "Relationship engine should detect unmatched rows");
    assert.ok(bridge.getInventoryEnrichmentDiagnosticsForTest().conflictCount >= 1, "Enrichment diagnostics should detect conflicts");
    assert.ok(text.includes("Relationship") || text.includes("Verknüpfung"), "Relationship drilldown should render in Excess page");
    assert.ok(text.includes("Mehrdeutiger Match") || text.includes("Ambiguous match"), "Ambiguous relationship explanation should be visible");
    assert.ok(text.includes("Nicht zugeordnet") || text.includes("Unmatched"), "Unmatched relationship explanation should be visible");
    assert.ok(text.includes("Enrichment-Konflikt") || text.includes("Enrichment conflict"), "Enrichment conflict explanation should be visible");
    assert.ok(text.includes("PKG-") || text.includes("INV-"), "Package or row identity should be visible in the drilldown");

    const openButton = app.document.querySelector(".excess-quality-item [data-excess-case-detail]");
    assert.ok(openButton, "Relationship issue should link to an existing Excess case when possible");
    openButton.click();
    const state = bridge.getExcessPageStateForTest();
    assert.equal(state.activeExcessCaseId, openButton.dataset.excessCaseDetail, "Open Excess Case should use the stable case ID");
    assert.equal(bridge.getEnrichedRowsForTest().find(row => row.material_id === "MAT-CONFLICT").material_description, "Inventory description wins", "Inventory value should be preserved on enrichment conflict");
    assert.deepEqual(bridge.getInventoryMaterialMasterRelationshipForTest(), beforeRelationship, "Opening relationship drilldown must not mutate relationship state");
    assert.equal(bridge.getEnrichedRowsForTest().length, beforeRows.length, "Relationship drilldown must not change analytical rows");
  });
})();
