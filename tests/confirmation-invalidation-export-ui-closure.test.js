(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function dualStockParsedSource(app) {
    return app.ObsoliQ.data.sourceModel.buildParsedSourceDataset(
      ["Material Number", "Material Description", "Stock Value (kEUR)", "Stock Value EUR", "Profit Center", "Excess Value", "Standard Price"],
      [
        ["MAT-REMAP", "Remap material", "12,5", "1234", "PC-R", "12", "10 EUR"],
        ["MAT-REMAP-2", "Second remap material", "13,5", "2234", "PC-R", "13", "11 USD"]
      ]
    );
  }

  function setSelect(app, selector, value, assert, label) {
    const control = app.document.querySelector(selector);
    assert.ok(control, label);
    control.value = value;
    control.dispatchEvent(new app.Event("change", { bubbles: true }));
    return control;
  }

  function clickControl(app, selector, assert, label) {
    const control = app.document.querySelector(selector);
    assert.ok(control, label);
    control.click();
    return control;
  }

  function conflictInventoryCsv(count = 7) {
    const rows = ["Material Number,Material Description,Stock Value EUR,Profit Center,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value"];
    for (let index = 1; index <= count; index += 1) {
      const material = `MAT-CF-${String(index).padStart(2, "0")}`;
      const description = index === count ? `Shared ${index}` : `Inventory ${index}`;
      rows.push(`${material},${description},1000,PC-CF,100,0,0,0`);
    }
    return rows.join("\n");
  }

  function conflictMaterialMasterCsv(count = 7) {
    const rows = ["Material Number,Material Description,MRP Controller,Responsible L1"];
    for (let index = 1; index <= count; index += 1) {
      const material = `MAT-CF-${String(index).padStart(2, "0")}`;
      const description = index === count ? `Shared ${index}` : `Master ${index}`;
      rows.push(`${material},${description},MRP-${String(index).padStart(2, "0")},Planning`);
    }
    return rows.join("\n");
  }

  function excessFixtureCsv(count = 32) {
    const rows = ["Material Number,Material Description,Stock Value EUR,Profit Center,Program,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value"];
    for (let index = 1; index <= count; index += 1) {
      rows.push(`MAT-EX-${String(index).padStart(3, "0")},Excess item ${index},${1000 + index},PC-${index % 4},Program X,${100 + index},0,0,0`);
    }
    return rows.join("\n");
  }

  test("AP 16.2b.2.4 real UI confirmation is invalidated after physical source remapping", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const parsed = dualStockParsedSource(app);
    const opened = bridge.beginUploadWithParsedData(parsed, "ui-confirmation-remap.csv", {
      sourceType: "upload",
      allowMappingReview: true,
      suppressFeedback: true
    });
    assert.equal(opened.status, "mapping", "Initial upload should open the Mapping Assistant");

    setSelect(app, '[data-mapping-index="2"]', "stock_value", assert, "kEUR source should be mapped through the real select");
    setSelect(app, '[data-mapping-index="3"]', "", assert, "EUR source should be ignored through the real select");
    setSelect(app, '[data-input-trust-policy][data-source-index="2"][data-policy-key="numericLocale"]', "de-DE", assert, "Numeric locale control should exist");
    setSelect(app, '[data-input-trust-policy][data-source-index="2"][data-policy-key="scaleSource"]', "header", assert, "Scale source control should exist");
    setSelect(app, '[data-input-trust-policy][data-source-index="2"][data-policy-key="sourceScaleFactor"]', "1000", assert, "Scale factor control should exist");
    clickControl(app, "[data-input-trust-confirm]", assert, "Input Trust confirmation checkbox should exist");
    clickControl(app, "#mappingApplyButton", assert, "Mapping Apply button should exist");

    const committed = bridge.getState();
    const committedPolicy = committed.datasetMeta.normalizationPolicy;
    assert.equal(committedPolicy.reviewConfirmed, true, "Committed policy should store real user confirmation");
    assert.equal(committedPolicy.confirmationMode, "user_confirmed", "Committed policy should store user_confirmed mode");
    const firstConfirmedAt = committedPolicy.confirmedAt || committedPolicy.reviewConfirmedAt || "";
    assert.ok(firstConfirmedAt, "Committed policy should store a confirmation timestamp");
    assert.equal(committedPolicy.fields.stock_value.sourceIndex, 2, "Initial policy should belong to the kEUR physical source");
    assert.equal(committedPolicy.fields.stock_value.userConfirmed, true, "Initial field policy should be user-confirmed");
    assert.equal(bridge.getEnrichedRowsForTest()[0].stock_value, 12500, "Initial kEUR value should be scaled by the confirmed header policy");

    bridge.reopenColumnMappingForCurrentDataset();
    const unchangedPending = bridge.getState().pendingUploadContext;
    assert.equal(unchangedPending.normalizationPolicy.reviewConfirmed, true, "Unchanged Mapping reopen should retain review confirmation");
    assert.equal(unchangedPending.normalizationPolicy.confirmationMode, "user_confirmed", "Unchanged Mapping reopen should retain user_confirmed mode");
    assert.equal(unchangedPending.normalizationPolicy.fields.stock_value.sourceIndex, 2, "Unchanged Mapping should retain the original source identity");
    clickControl(app, "#mappingApplyButton", assert, "Unchanged Mapping Apply button should exist");
    assert.equal(bridge.getState().datasetMeta.normalizationPolicySignature, committed.datasetMeta.normalizationPolicySignature, "Unchanged Mapping should preserve the policy signature");

    bridge.reopenColumnMappingForCurrentDataset();
    setSelect(app, '[data-mapping-index="2"]', "", assert, "Old kEUR source should be unmapped through the real select");
    setSelect(app, '[data-mapping-index="3"]', "stock_value", assert, "New EUR source should be mapped through the real select");
    const remappedPending = bridge.getState().pendingUploadContext;
    const remappedPolicy = remappedPending.normalizationPolicy;
    assert.equal(remappedPolicy.reviewConfirmed, false, "Source change must clear top-level confirmation");
    assert.equal(remappedPending.inputTrustReviewConfirmed, false, "Source change must clear the pending UI confirmation flag");
    assert.equal(remappedPolicy.confirmationMode, "", "Source change must clear stale user-confirmed mode");
    assert.equal(remappedPolicy.reviewConfirmedAt, "", "Source change must clear stale review timestamp");
    assert.equal(remappedPolicy.confirmedAt, "", "Source change must clear stale confirmation timestamp");
    assert.equal(remappedPolicy.confirmationReason, "source_identity_changed", "Source change should record the invalidation reason");
    assert.equal(remappedPolicy.fields.stock_value.sourceIndex, 3, "New policy should belong to the EUR physical source");
    assert.equal(remappedPolicy.fields.stock_value.scaleSource, "none", "Old header scale must not transfer to the new source");
    assert.equal(remappedPolicy.fields.stock_value.sourceScaleFactor, 1, "Old kEUR factor must not transfer to the new source");
    assert.equal(Boolean(remappedPolicy.fields.stock_value.userConfirmed), false, "Field confirmation must be cleared for the changed source");
    assert.ok(app.document.querySelector("[data-input-trust-confirm]"), "New review-required interpretation should require fresh UI confirmation");
    assert.equal(app.document.querySelector("[data-input-trust-confirm]").checked, false, "Fresh UI confirmation should start unchecked after remapping");
    assert.equal(app.document.querySelector("#mappingApplyButton").disabled, true, "Apply must remain blocked until the remapped physical source is freshly confirmed");

    clickControl(app, "[data-input-trust-confirm]", assert, "Fresh Input Trust confirmation checkbox should exist");
    clickControl(app, "#mappingApplyButton", assert, "Remapped Apply button should become usable after fresh confirmation");
    const finalPolicy = bridge.getState().datasetMeta.normalizationPolicy;
    assert.equal(finalPolicy.confirmationMode, "user_confirmed", "Fresh user confirmation may be stored for the new physical source");
    assert.ok(finalPolicy.confirmedAt || finalPolicy.reviewConfirmedAt || "", "Fresh confirmation should store a timestamp for the new source");
    assert.equal(finalPolicy.fields.stock_value.sourceIndex, 3, "Final policy should stay bound to the EUR physical source");
    assert.equal(finalPolicy.fields.stock_value.sourceScaleFactor, 1, "Final EUR policy should not use stale kEUR scaling");
    assert.equal(bridge.getEnrichedRowsForTest()[0].stock_value, 1234, "New EUR source should not be multiplied by the old kEUR factor");
  });

  test("AP 16.2b.2.4 Action export includes complete Owner Context and preserves export safety", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const germanColumns = bridge.actionExportColumnsForTest();
    const germanKeys = germanColumns.map(([key]) => key);
    assert.ok(germanKeys.includes("owner_function"), "Action export should include owner_function");
    assert.ok(germanKeys.includes("owner_reference"), "Action export should include owner_reference");
    assert.ok(germanKeys.includes("owner_source"), "Action export should include owner_source");
    assert.ok(germanKeys.includes("owner_assignment_confidence"), "Action export should include owner_assignment_confidence");
    assert.ok(germanKeys.includes("confidence"), "Action export should include confidence");
    assert.ok(germanColumns[0][1] === "Material", "German headers should be available");
    assert.ok(germanColumns.some(([, label]) => label === "Owner-Referenz"), "German Owner Reference header should be localized");

    setSelect(app, "#languageSelect", "en", assert, "Language select should exist");
    const englishColumns = bridge.actionExportColumnsForTest();
    assert.ok(englishColumns.some(([, label]) => label === "Owner reference"), "English Owner Reference header should be localized");
    assert.ok(englishColumns.some(([, label]) => label === "Owner assignment confidence"), "English Owner Confidence header should be localized");

    const rows = bridge.rowsForExportForTest([
      {
        material_id: "0000123",
        material_description: "Formula protected material",
        owner_function: "Material Planning",
        owner_reference: "=MRP-01",
        owner_source: "inventory",
        owner_assignment_confidence: "High",
        confidence: "Low",
        priority: "High",
        status: "Open"
      },
      {
        material_id: "MAT-MM",
        owner_function: "Material Planning",
        owner_reference: "MRP-99",
        owner_source: "material_master",
        owner_assignment_confidence: "Medium",
        confidence: "Medium"
      },
      {
        material_id: "MAT-NONE",
        owner_function: "No direct owner",
        owner_reference: "",
        owner_source: "none",
        owner_assignment_confidence: "Low",
        confidence: "High"
      }
    ], englishColumns);
    const ownerReferenceIndex = germanKeys.indexOf("owner_reference");
    const ownerSourceIndex = germanKeys.indexOf("owner_source");
    const ownerConfidenceIndex = germanKeys.indexOf("owner_assignment_confidence");
    assert.equal(rows[1][0], "0000123", "Leading-zero Material ID should remain a text value in the export rows");
    assert.equal(rows[1][ownerSourceIndex], "Inventory upload", "Inventory-owned owner source should export from committed row values");
    assert.equal(rows[2][ownerSourceIndex], "Material master", "Material-Master-owned owner source should export from committed row values");
    assert.equal(rows[3][ownerSourceIndex], "Not available", "Missing owner source should export transparently");
    assert.equal(rows[1][ownerConfidenceIndex], "High", "High owner assignment confidence should export");
    assert.equal(rows[2][ownerConfidenceIndex], "Medium", "Medium owner assignment confidence should export");
    assert.equal(rows[3][ownerConfidenceIndex], "Low", "Low owner assignment confidence should export");
    assert.equal(rows[1][ownerReferenceIndex], "=MRP-01", "Rows should keep committed owner reference before spreadsheet sanitization");
    assert.ok(bridge.sanitizeSpreadsheetCellForTest(rows[1][ownerReferenceIndex]).startsWith("'="), "Formula injection protection should neutralize formula-like owner references");
    setSelect(app, "#languageSelect", "de", assert, "Language select should switch back to German");
  });

  test("AP 16.2b.2.4 provenance export uses complete row-level conflicts instead of bounded examples", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const loaded = await bridge.loadTextDataset(conflictInventoryCsv(), "provenance-conflict-inventory.csv", {
      sourceType: "upload",
      allowMappingReview: false
    });
    assert.equal(loaded.status, "loaded", "Inventory conflict fixture should load");
    const imported = bridge.importMaterialMasterTextForTest(conflictMaterialMasterCsv(), "provenance-conflict-mm.csv");
    assert.equal(imported.status, "loaded", "Material Master conflict fixture should load");

    const diagnostics = bridge.getInventoryEnrichmentDiagnosticsForTest();
    const provenance = bridge.getInventoryEnrichmentProvenanceForTest();
    assert.equal(diagnostics.conflictCount, 6, "Fixture should create more conflicts than the five-row UI example cap");
    assert.equal((diagnostics.conflictExamples || []).length, 5, "UI examples should remain bounded");
    assert.equal((diagnostics.conflicts || []).length, 6, "Complete conflicts should be retained in the enrichment diagnostics");
    assert.equal(Object.keys(provenance).length, 7, "Row provenance should exist for every matched row, including non-enriched matches");

    const data = bridge.getEnrichedRowsForTest();
    const exportRows = bridge.enrichedRowsForExportForTest(data, { provenance: true });
    const header = exportRows[0];
    const conflictCountIndex = header.indexOf("enrichment_conflict_count");
    const conflictFieldsIndex = header.indexOf("enrichment_conflict_fields");
    const matchTypeIndex = header.indexOf("relationship_match_type");
    assert.ok(conflictCountIndex >= 0, "Provenance export should include conflict count");
    assert.ok(conflictFieldsIndex >= 0, "Provenance export should include conflict field keys");
    const exportedConflictTotal = exportRows.slice(1).reduce((total, row) => total + Number(row[conflictCountIndex] || 0), 0);
    assert.equal(exportedConflictTotal, 6, "Provenance export must use complete conflict counts, not bounded examples");
    assert.ok(exportRows.slice(1).some(row => Number(row[conflictCountIndex] || 0) === 0 && row[matchTypeIndex]), "Matched non-enriched rows should retain relationship metadata");
  });

  test("AP 16.2b.2.4 Excess detail is reconciled to the current visible page and Source Row terminology is used", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    setSelect(app, "#languageSelect", "de", assert, "Language select should be German for terminology checks");
    const loaded = await bridge.loadTextDataset(excessFixtureCsv(), "excess-page-fixture.csv", {
      sourceType: "upload",
      allowMappingReview: false
    });
    assert.equal(loaded.status, "loaded", "Excess pagination fixture should load");
    bridge.switchViewForTest("excess");
    bridge.setExcessPageForTest(1);
    bridge.renderExcessPageForTest();
    const pageOne = bridge.getExcessPageStateForTest();
    assert.ok(pageOne.pageCount > 1, "Fixture should create multiple Excess pages");
    const stalePageOneCase = pageOne.pageRows[0].case_id;
    bridge.setActiveExcessCaseIdForTest(stalePageOneCase);

    bridge.setExcessPageForTest(2);
    const pageTwoText = bridge.renderExcessPageForTest();
    const pageTwo = bridge.getExcessPageStateForTest();
    assert.equal(pageTwo.pageNumber, 2, "Page 2 should be active");
    assert.ok(pageTwo.pageRows.some(row => row.case_id === pageTwo.activeExcessCaseId), "Active Excess case should belong to the current page");
    assert.notEqual(pageTwo.activeExcessCaseId, stalePageOneCase, "Page 2 must not keep a Page-1 detail case");
    assert.ok(pageTwo.activeCase && pageTwo.pageRows.some(row => row.case_id === pageTwo.activeCase.case_id), "Rendered detail should be owned by the visible page");
    assert.ok(pageTwoText.includes("Quellzeile"), "German detail view should use Quellzeile");
    assert.equal(bridge.excessExportColumnsForTest().find(([key]) => key === "source_row_number")?.[1], "Quellzeile", "Excess export should label source_row_number as Quellzeile");
  });
})();
