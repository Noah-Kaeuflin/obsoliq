(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function mappingFor(parsed, assignments) {
    return parsed.headers.map((sourceColumn, sourceIndex) => ({
      sourceIndex,
      sourceColumn,
      normalizedSourceColumn: parsed.sourceColumnMetadata[sourceIndex]?.normalizedOriginalHeader || sourceColumn,
      proposedCanonicalField: assignments[sourceIndex] || "",
      proposedMatchType: assignments[sourceIndex] ? "manual" : "unknown",
      proposedConfidence: assignments[sourceIndex] ? "high" : "none",
      selectedCanonicalField: assignments[sourceIndex] || "",
      matchType: assignments[sourceIndex] ? "manual" : "unknown",
      confidence: assignments[sourceIndex] ? "high" : "none",
      status: assignments[sourceIndex] ? "mapped" : "unmapped",
      protected: false,
      ignored: !assignments[sourceIndex],
      manual: Boolean(assignments[sourceIndex]),
      sampleValues: []
    }));
  }

  function blockedParsed(app) {
    return app.ObsoliQ.data.sourceModel.buildParsedSourceDataset(
      ["Material", "Stock Value (kEUR)", "Excess Value"],
      [["MAT-TRUST-1", "12,5k", "5"]]
    );
  }

  test("AP 16.2b.2.1 Input Trust prepares a reviewed mapping before import review", async assert => {
    const app = await helpers.loadApp();
    const parsed = blockedParsed(app);
    const mapping = mappingFor(parsed, { 0: "material_id", 1: "stock_value", 2: "excess_value" });
    const trust = app.__obsoliqTestBridge.prepareInputTrustAssessmentForTest({
      packageType: "inventory_snapshot",
      headers: parsed.headers,
      rows: parsed.rows,
      sourceColumnMetadata: parsed.sourceColumnMetadata,
      mapping,
      mappingPolicy: app.ObsoliQ.mapping.engine.DEFAULT_MAPPING_POLICY
    });
    const stockMapping = trust.reviewedMapping.find(entry => entry.selectedCanonicalField === "stock_value");
    assert.equal(trust.trustState, "blocked", "Double-scaled stock value should block before Dataset Builder");
    assert.ok(trust.blockingDiagnostics.some(diagnostic => diagnostic.code === "potential_double_scaling"), "Blocking double-scale diagnostic should be available");
    assert.ok(stockMapping.overallConfidence, "Reviewed mapping should expose authoritative confidence");
    assert.ok(stockMapping.normalizationPolicy, "Reviewed mapping should expose normalization evidence");
  });

  test("AP 16.2b.2.1 blocked Input Trust opens Mapping Assistant with actionable feedback", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const parsed = blockedParsed(app);
    const result = bridge.beginUploadWithParsedData(parsed, "blocked-input-trust.csv", {
      sourceType: "upload",
      allowMappingReview: false,
      preserveFailureFeedback: true,
      suppressErrorLog: true
    });
    const state = bridge.getState();
    assert.equal(result.status, "mapping", "Blocked trust should not bypass review even when normal mapping review is disabled");
    assert.equal(state.mappingOpen, true, "Mapping Assistant should open");
    assert.equal(state.pendingUploadContext.inputTrustAssessment.trustState, "blocked", "Pending context should keep blocked trust state");
    assert.equal(state.enrichedRows, 0, "Dataset should not be committed while blocked");
    assert.ok(/Import blockiert|Import blocked/.test(state.feedback), "Feedback should include actionable blocked-import wording");
  });

  test("AP 16.2b.2.1 scale override revalidates Input Trust and allows explicit apply", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const parsed = blockedParsed(app);
    bridge.beginUploadWithParsedData(parsed, "blocked-resolved.csv", {
      sourceType: "upload",
      allowMappingReview: false,
      suppressErrorLog: true
    });
    const scaleSelect = app.document.querySelector('[data-input-trust-policy][data-source-index="1"][data-policy-key="scaleSource"]');
    assert.ok(scaleSelect, "Scale source control should be visible for the stock value column");
    scaleSelect.value = "header";
    scaleSelect.dispatchEvent(new app.Event("change", { bubbles: true }));
    const resolvedState = bridge.getState();
    assert.notEqual(resolvedState.pendingUploadContext.inputTrustAssessment.trustState, "blocked", "Changing scale policy should revalidate away from blocked state");
    const confirm = app.document.querySelector("[data-input-trust-confirm]");
    if (confirm) {
      confirm.checked = true;
      confirm.dispatchEvent(new app.Event("change", { bubbles: true }));
    }
    const applied = bridge.continueUploadWithMapping();
    assert.equal(applied, true, "Resolved trust policy should allow Dataset commit");
    assert.equal(bridge.getState().datasetMeta.inputTrustResult, undefined, "Committed Dataset Meta should not store the full InputTrustResult");
    assert.ok(bridge.getState().datasetMeta.inputTrustMetadata, "Committed Dataset Meta should store compact Input Trust metadata");
  });

  test("AP 16.2b.2.1 Data Quality exposes compact Input Trust diagnostics", async assert => {
    const app = await helpers.loadSampleApp();
    const text = app.__obsoliqTestBridge.renderDataQualityForTest();
    assert.ok(/Input Trust/.test(text), "Data Quality diagnostics should include Input Trust");
    assert.equal(app.__obsoliqTestBridge.getState().datasetMeta.inputTrustResult, undefined, "Sample Dataset Meta should not retain full InputTrustResult");
  });

  test("AP 16.2b.2.1 enriched Material Master sort changes visible Inventory DOM order", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const inventory = [
      "Material Number,Stock Value EUR,Profit Center,Excess Value",
      "MAT-A,100,PC-1,10",
      "MAT-Z,100,PC-1,10"
    ].join("\n");
    const master = [
      "Material Number,Material Description,MRP Controller",
      "MAT-A,Zulu description,MRP-A",
      "MAT-Z,Alpha description,MRP-Z"
    ].join("\n");
    assert.equal((await bridge.loadTextDataset(inventory, "sort-inventory.csv", {
      sourceType: "upload",
      allowMappingReview: false
    })).status, "loaded", "Inventory fixture should load");
    assert.equal(bridge.importMaterialMasterTextForTest(master, "sort-master.csv").status, "loaded", "Material Master fixture should load");
    bridge.switchViewForTest("inventory");
    bridge.setColumnSortForTest("inventory", "material_description", "asc");
    const firstMaterial = app.document.querySelector("#inventoryTable tbody tr td")?.textContent.trim();
    assert.equal(firstMaterial, "MAT-Z", "Sorting enriched Material Description ascending should reorder raw visible rows");
  });

  test("AP 16.2b.2.1 Excess page builds one model and renders a bounded worklist page", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.resetExcessPageModelBuildCountForTest();
    bridge.switchViewForTest("excess");
    const count = bridge.getExcessPageModelBuildCountForTest();
    const renderedRows = app.document.querySelectorAll(".excess-table tbody tr").length;
    assert.equal(count, 1, "One Excess page render should build the page model once");
    assert.ok(renderedRows <= 25, "Excess DOM worklist should be bounded to the current page size");
  });
})();
