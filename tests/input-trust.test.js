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

  test("AP 16.2b.2 structured parser supports locale, magnitude, header scale and identifiers", async assert => {
    const app = await helpers.loadApp();
    const utils = app.__obsoliqTestBridge.valueUtilsForTest;
    const numeric = { type: "currency", requirement: "required" };
    assert.equal(utils.parseLocalizedNumericValue({ rawValue: "10k", fieldDefinition: numeric }).normalizedValue, 10000, "10k should normalize to 10,000");
    assert.equal(utils.parseLocalizedNumericValue({ rawValue: "1,2 Mio.", fieldDefinition: numeric }).normalizedValue, 1200000, "1,2 Mio. should normalize to 1,200,000");
    assert.equal(utils.parseLocalizedNumericValue({ rawValue: "2 Mrd.", fieldDefinition: numeric }).normalizedValue, 2000000000, "2 Mrd. should normalize to 2,000,000,000");
    assert.equal(utils.parseLocalizedNumericValue({ rawValue: "(10k)", fieldDefinition: numeric }).normalizedValue, -10000, "Accounting negative should normalize");
    assert.equal(utils.parseLocalizedNumericValue({ rawValue: "1.2E+05", fieldDefinition: numeric }).normalizedValue, 120000, "Scientific notation should normalize");
    assert.equal(utils.parseLocalizedNumericValue({ rawValue: "10k", fieldDefinition: { type: "text" } }).normalizedValue, "10k", "Identifier-like values should remain text for text fields");
    const headerHints = utils.extractSourceHeaderHints("Stock Value (kEUR)");
    assert.equal(headerHints.sourceScaleFactor, 1000, "kEUR header scale should be detected");
    assert.equal(utils.parseLocalizedNumericValue({ rawValue: "12,5", fieldDefinition: numeric, headerHints }).normalizedValue, 12500, "Header kEUR scale should apply");
    assert.equal(utils.parseLocalizedNumericValue({ rawValue: "12,5k", fieldDefinition: numeric, headerHints }).status, "double_scale", "Header scale plus cell suffix should block as double scale");
    assert.equal(utils.parseLocalizedNumericValue({ rawValue: "1.234", fieldDefinition: numeric }).status, "ambiguous", "Single 1.234 without profile should be ambiguous");
  });

  test("AP 16.2b.2 locale profiles and percentage contracts are explicit", async assert => {
    const app = await helpers.loadApp();
    const utils = app.__obsoliqTestBridge.valueUtilsForTest;
    const profile = utils.inferNumericLocaleProfile(["1.234,50", "2.345,60", "3.456,70", "4.567,80", "5.678,90"]);
    assert.equal(profile.status, "dominant", "German-like profile should become dominant");
    assert.equal(profile.dominantLocale, "de", "German-like profile should report de");
    const ratio = utils.parseLocalizedNumericValue({
      rawValue: "10 %",
      fieldDefinition: { type: "percentage", percentageStorage: "ratio" }
    });
    const points = utils.parseLocalizedNumericValue({
      rawValue: "10 %",
      fieldDefinition: { type: "percentage", percentageStorage: "percent_points" }
    });
    assert.equal(ratio.normalizedValue, 0.1, "Ratio percentage should divide by 100");
    assert.equal(points.normalizedValue, 10, "Percent-points percentage should remain 10");
  });

  test("AP 16.2b.2 schema signatures distinguish semantic and physical drift", async assert => {
    const app = await helpers.loadApp();
    const sourceModel = app.ObsoliQ.data.sourceModel;
    const profiler = app.__obsoliqTestBridge.schemaProfilerForTest;
    const first = sourceModel.buildParsedSourceDataset(["Material", "Stock Value"], [["MAT-1", "100"]]);
    const reordered = sourceModel.buildParsedSourceDataset(["Stock Value", "Material"], [["100", "MAT-1"]]);
    const inserted = sourceModel.buildParsedSourceDataset(["Material", "Unknown", "Stock Value"], [["MAT-1", "x", "100"]]);
    const profileA = profiler.profileSourceSchema(first);
    const profileB = profiler.profileSourceSchema(reordered);
    const profileC = profiler.profileSourceSchema(inserted);
    assert.equal(profileA.semanticSignature.hash, profileB.semanticSignature.hash, "Semantic signature should ignore column order");
    assert.notEqual(profileA.physicalSignature.hash, profileB.physicalSignature.hash, "Physical signature should detect column order");
    assert.notEqual(profileA.semanticSignature.hash, profileC.semanticSignature.hash, "Inserted unknown column should change semantic signature");
  });

  test("AP 16.2b.2 normalization preserves raw source and blocks unsafe financial ambiguity", async assert => {
    const app = await helpers.loadApp();
    const sourceModel = app.ObsoliQ.data.sourceModel;
    const parsed = sourceModel.buildParsedSourceDataset(
      ["Material", "Stock Value (kEUR)", "Excess Value"],
      [["00010k", "12,5k", "5"]]
    );
    const mapping = mappingFor(parsed, { 0: "material_id", 1: "stock_value", 2: "excess_value" });
    const rawSnapshot = JSON.stringify(parsed.rows);
    const trust = app.__obsoliqTestBridge.inputTrustServiceForTest.assessInputTrust({
      packageType: "inventory_snapshot",
      headers: parsed.headers,
      rows: parsed.rows,
      sourceColumnMetadata: parsed.sourceColumnMetadata,
      mapping,
      mappingPolicy: app.ObsoliQ.mapping.engine.DEFAULT_MAPPING_POLICY
    });
    assert.equal(trust.trustState, "blocked", "Double-scaled required stock value should block trust");
    assert.ok(trust.diagnostics.some(diagnostic => diagnostic.code === "potential_double_scaling"), "Double-scaling diagnostic should be present");
    assert.equal(JSON.stringify(parsed.rows), rawSnapshot, "Raw Source rows must remain unchanged");
    assert.equal(parsed.rows[0].Material, "00010k", "Material ID source should preserve leading zeros and letters");
  });

  test("AP 16.2b.2 header scale normalizes preview values without mutating raw source", async assert => {
    const app = await helpers.loadApp();
    const sourceModel = app.ObsoliQ.data.sourceModel;
    const parsed = sourceModel.buildParsedSourceDataset(
      ["Material", "Stock Value (kEUR)", "Excess Value"],
      [["MAT-1", "12,5", "2,5"]]
    );
    const mapping = mappingFor(parsed, { 0: "material_id", 1: "stock_value", 2: "excess_value" });
    const trust = app.__obsoliqTestBridge.inputTrustServiceForTest.assessInputTrust({
      packageType: "inventory_snapshot",
      headers: parsed.headers,
      rows: parsed.rows,
      sourceColumnMetadata: parsed.sourceColumnMetadata,
      mapping,
      mappingPolicy: app.ObsoliQ.mapping.engine.DEFAULT_MAPPING_POLICY
    });
    assert.notEqual(trust.trustState, "blocked", "Header scale without cell suffix should not block");
    assert.equal(trust.normalizedPreviewRows[0].stock_value, 12500, "Preview should apply kEUR scale");
    assert.equal(parsed.rows[0]["Stock Value (kEUR)"], "12,5", "Raw Source should keep the original cell");
  });

  test("AP 16.2b.2 active Inventory Package stores Input Trust metadata", async assert => {
    const app = await helpers.loadSampleApp();
    const inventoryPackage = app.__obsoliqTestBridge.getActiveInventoryPackage();
    assert.ok(inventoryPackage.inputTrustMetadata, "Inventory Package should store Input Trust metadata");
    assert.ok(inventoryPackage.inputTrustMetadata.semanticSchemaSignature?.hash, "Semantic schema signature should be stored");
    assert.ok(inventoryPackage.inputTrustMetadata.physicalSchemaSignature?.hash, "Physical schema signature should be stored");
    assert.ok(inventoryPackage.buildData?.buildMetadata?.inputNormalizationSummary, "Build metadata should include normalization summary");
  });

  test("AP 16.2b.2 pure engines handle 10,000 rows deterministically", async assert => {
    const app = await helpers.loadApp();
    const sourceModel = app.ObsoliQ.data.sourceModel;
    const rows = [];
    for (let index = 0; index < 10000; index += 1) {
      rows.push([`MAT-${String(index).padStart(5, "0")}`, "1.234,56", "10k"]);
    }
    const parsed = sourceModel.buildParsedSourceDataset(["Material", "Stock Value", "Excess Value"], rows);
    const mapping = mappingFor(parsed, { 0: "material_id", 1: "stock_value", 2: "excess_value" });
    const started = performance.now();
    const trust = app.__obsoliqTestBridge.inputTrustServiceForTest.assessInputTrust({
      packageType: "inventory_snapshot",
      headers: parsed.headers,
      rows: parsed.rows,
      sourceColumnMetadata: parsed.sourceColumnMetadata,
      mapping,
      mappingPolicy: app.ObsoliQ.mapping.engine.DEFAULT_MAPPING_POLICY
    });
    const durationMs = performance.now() - started;
    assert.ok(durationMs < 5000, `10,000-row trust gate should finish quickly, actual ${Math.round(durationMs)} ms`);
    assert.equal(trust.normalizedPreviewRows.length, 10000, "All rows should be normalized in preview");
    assert.equal(trust.normalizedPreviewRows[0].stock_value, 1234.56, "German stock value should normalize");
    assert.equal(trust.normalizedPreviewRows[0].excess_value, 10000, "Magnitude suffix should normalize");
    assert.equal(parsed.rows[0].Material, "MAT-00000", "Raw Source should remain unchanged");
  });
})();
