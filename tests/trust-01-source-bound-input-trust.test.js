(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function mappingOptions(app, parsed) {
    return {
      sourceColumnMetadata: parsed.sourceColumnMetadata,
      policy: app.ObsoliQ.mapping.engine.DEFAULT_MAPPING_POLICY
    };
  }

  function selectSecondDuplicate(mapping = []) {
    return mapping.map(entry => {
      if (entry.sourceIndex === 1) {
        return { ...entry, selectedCanonicalField: "", ignored: true };
      }
      if (entry.sourceIndex === 2) {
        return {
          ...entry,
          selectedCanonicalField: "stock_value",
          ignored: false,
          manual: true,
          matchType: "manual",
          confidence: "high",
          status: "mapped"
        };
      }
      return entry;
    });
  }

  test("TRUST-01 T04/T06 binds duplicate columns to strict non-coercing Physical Source Identity", async assert => {
    const app = await helpers.loadApp();
    const sourceModel = app.ObsoliQ.data.sourceModel;
    const mappingEngine = app.ObsoliQ.mapping.engine;
    const trustService = app.__obsoliqTestBridge.inputTrustServiceForTest;
    const parsed = sourceModel.buildParsedSourceDataset(
      ["Material Number", "Stock Value", "Stock Value"],
      [["MAT-DUP", "100", "200"]]
    );
    const mapping = selectSecondDuplicate(mappingEngine.createAutomaticColumnMapping({
      headers: parsed.headers,
      rows: parsed.rows,
      sourceColumnMetadata: parsed.sourceColumnMetadata
    }));
    const selected = mapping.find(entry => entry.sourceIndex === 2);

    assert.equal(selected.sourceKey, "Stock Value__2", "Automatic Mapping must retain the duplicate-aware sourceKey");
    assert.equal(sourceModel.sourceMetaForColumn("Stock Value", 99, parsed.sourceColumnMetadata), null, "An explicit unknown sourceIndex must never fall back by header");
    assert.equal(trustService.sourceIdentityForMappingEntry({
      mappingEntry: { ...selected, sourceIndex: "2" },
      sourceColumnMetadata: parsed.sourceColumnMetadata
    }), null, "A string sourceIndex must not be coerced or resolved by header fallback");
    assert.equal(trustService.sourceIdentityForMappingEntry({
      mappingEntry: { ...selected, sourceKey: "Stock Value" },
      sourceColumnMetadata: parsed.sourceColumnMetadata
    }), null, "A wrong sourceKey must invalidate the physical source identity");

    ["2", -1, 2.5].forEach(sourceIndex => {
      const invalid = mapping.map(entry => entry.sourceIndex === 2 ? { ...entry, sourceIndex } : entry);
      const validation = mappingEngine.validateColumnMapping(invalid, mappingOptions(app, parsed));
      assert.equal(validation.valid, false, `sourceIndex ${String(sourceIndex)} must block Mapping validation`);
      assert.ok(validation.errors.some(error => error.key === "mappingInvalidSourceIdentity"), "Invalid identity must have an explicit blocking diagnostic");
      assert.throws(() => mappingEngine.applyApprovedColumnMapping({
        headers: parsed.headers,
        rows: parsed.rows,
        sourceColumnMetadata: parsed.sourceColumnMetadata,
        mapping: invalid,
        policy: mappingEngine.DEFAULT_MAPPING_POLICY
      }), "Invalid identity must block Mapping Apply");
    });

    const applied = mappingEngine.applyApprovedColumnMapping({
      headers: parsed.headers,
      rows: parsed.rows,
      sourceColumnMetadata: parsed.sourceColumnMetadata,
      mapping,
      policy: mappingEngine.DEFAULT_MAPPING_POLICY
    });
    assert.equal(applied[0].stock_value, "200", "The selected second duplicate must provide the analytical value");
  });

  test("TRUST-01 T04 rejects stale identity after unique reorder, duplicate reorder, and duplicate-count drift", async assert => {
    const app = await helpers.loadApp();
    const sourceModel = app.ObsoliQ.data.sourceModel;
    const mappingEngine = app.ObsoliQ.mapping.engine;
    const original = sourceModel.buildParsedSourceDataset(
      ["Material Number", "Stock Value", "Stock Value"],
      [["MAT-1", "100", "200"]]
    );
    const approved = selectSecondDuplicate(mappingEngine.createAutomaticColumnMapping({
      headers: original.headers,
      rows: original.rows,
      sourceColumnMetadata: original.sourceColumnMetadata
    }));
    const reorderedUnique = sourceModel.buildParsedSourceDataset(
      ["Stock Value", "Material Number", "Stock Value"],
      [["100", "MAT-1", "200"]]
    );
    const reorderedDuplicates = sourceModel.buildParsedSourceDataset(
      ["Material Number", "Stock Value", "Other", "Stock Value"],
      [["MAT-1", "200", "x", "100"]]
    );
    const changedDuplicateCount = sourceModel.buildParsedSourceDataset(
      ["Material Number", "Stock Value"],
      [["MAT-1", "100"]]
    );

    [reorderedUnique, reorderedDuplicates, changedDuplicateCount].forEach((parsed, index) => {
      const validation = mappingEngine.validateColumnMapping(approved, mappingOptions(app, parsed));
      assert.equal(validation.valid, false, `Stale Mapping ${index + 1} must not transfer to another physical layout`);
      assert.ok(validation.errors.some(error => error.key === "mappingInvalidSourceIdentity"), "Physical layout drift must be reported as invalid source identity");
    });
  });

  test("TRUST-01 T01/T08 keeps exact signatures and Raw Source immutable on a valid commit path", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const parsed = bridge.parseDelimited([
      "Material Number,Stock Value EUR,Profit Center,Excess Value",
      "0000123,1000,PC-1,250"
    ].join("\n"));
    const rawBefore = JSON.stringify(parsed);
    const prepared = bridge.prepareInputTrustAssessmentForTest({
      packageType: "inventory_snapshot",
      headers: parsed.headers,
      rows: parsed.rows,
      sourceColumnMetadata: parsed.sourceColumnMetadata,
      mapping: app.ObsoliQ.mapping.engine.createAutomaticColumnMapping({
        headers: parsed.headers,
        rows: parsed.rows,
        sourceColumnMetadata: parsed.sourceColumnMetadata
      }),
      mappingPolicy: app.ObsoliQ.mapping.engine.DEFAULT_MAPPING_POLICY
    });

    assert.equal(prepared.trustState, "trusted", "Valid exact input should be trusted automatically");
    assert.ok(prepared.reviewedMapping.every(entry => entry.sourceKey), "Every reviewed Mapping entry must retain sourceKey evidence");
    assert.equal(JSON.stringify(parsed), rawBefore, "Input Trust preview must not mutate Raw Source");

    const loaded = await bridge.loadTextDataset([
      "Material Number,Stock Value EUR,Profit Center,Excess Value",
      "0000123,1000,PC-1,250"
    ].join("\n"), "trust-01-valid.csv", { sourceType: "upload", allowMappingReview: false });
    assert.equal(loaded.status, "loaded", "Valid exact input should commit");
    const state = bridge.getState();
    const packageRecord = bridge.getActiveInventoryPackage();
    const signature = bridge.columnMappingSignatureForTest(state.datasetMeta.columnMapping);
    assert.equal(state.datasetMeta.appliedMappingSignature, signature, "Dataset Meta must use the reviewed Mapping signature");
    assert.equal(state.datasetMeta.buildMetadata.mappingSignature, signature, "Dataset Builder must use the same Mapping signature");
    assert.equal(packageRecord.mapping.mappingSignature, signature, "Package must use the same Mapping signature");
    assert.equal(bridge.columnMappingSignatureForTest(packageRecord.mapping.columnMapping), signature, "Package Mapping must reproduce the same signature");
    assert.equal(bridge.getEnrichedRowsForTest()[0].material_id, "0000123", "Leading-zero Material ID must remain text");
  });

  test("TRUST-01 T10/T14 stores generic Package Mapping signatures and blocks a builder mismatch before Registry commit", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const realBuilder = app.ObsoliQ.data.materialMasterBuilder;
    const parsed = bridge.parseDelimited([
      "Material Number,Plant,Material Description",
      "0000777,1000,Trust material"
    ].join("\n"));
    const prepared = bridge.packageImportServiceForTest.prepareImport({
      packageType: "material_master",
      parsedSource: parsed,
      sourceDescriptor: { sourceLabel: "trust-material.csv", sourceType: "synthetic" }
    });
    const built = bridge.packageImportServiceForTest.buildPackage({
      packageType: "material_master",
      parsedSource: prepared.parsedSource,
      approvedMapping: prepared.approvedMapping,
      sourceDescriptor: prepared.sourceDescriptor
    });
    assert.equal(built.ok, true, "Valid Material Master Package should build");
    assert.equal(built.preparedPackage.mapping.mappingSignature, built.preparedPackage.buildData.buildMetadata.mappingSignature, "Generic Package and Builder Mapping signatures must match");
    assert.equal(app.ObsoliQ.mapping.engine.columnMappingSignature(
      built.preparedPackage.mapping.columnMapping,
      {
        sourceColumnMetadata: built.preparedPackage.sourceData.sourceColumnMetadata,
        policy: realBuilder.MATERIAL_MASTER_MAPPING_POLICY
      }
    ), built.preparedPackage.mapping.mappingSignature, "Stored Package Mapping must reproduce its signature");

    const isolatedRegistry = app.ObsoliQ.data.packageRegistry.createDataPackageRegistry();
    const mismatchBuilder = {
      ...realBuilder,
      buildMaterialMasterPackage(input) {
        const result = realBuilder.buildMaterialMasterPackage(input);
        return { ...result, buildMetadata: { ...result.buildMetadata, mappingSignature: "tampered-signature" } };
      }
    };
    const isolatedService = app.ObsoliQ.application.packageImportService.createPackageImportService({
      sourceModel: app.ObsoliQ.data.sourceModel,
      mappingEngine: app.ObsoliQ.mapping.engine,
      inputTrustService: bridge.inputTrustServiceForTest,
      registry: isolatedRegistry,
      packageDefinitions: app.ObsoliQ.data.packageRegistry.DATA_PACKAGE_TYPE_DEFINITIONS,
      builders: { material_master: mismatchBuilder, materialMasterBuilder: mismatchBuilder },
      clock: () => "2026-08-30T10:00:00.000Z"
    });
    const isolatedPrepared = isolatedService.prepareImport({
      packageType: "material_master",
      parsedSource: parsed,
      sourceDescriptor: { sourceLabel: "trust-material-mismatch.csv", sourceType: "synthetic" }
    });
    const before = isolatedRegistry.getStats();
    const mismatch = isolatedService.importPackage({
      packageType: "material_master",
      parsedSource: isolatedPrepared.parsedSource,
      approvedMapping: isolatedPrepared.approvedMapping,
      sourceDescriptor: isolatedPrepared.sourceDescriptor
    });
    const after = isolatedRegistry.getStats();
    assert.equal(mismatch.ok, false, "Builder Mapping signature mismatch must fail closed");
    assert.equal(mismatch.errorCode, "MAPPING_SIGNATURE_MISMATCH", "Mismatch must expose a deterministic error code");
    assert.deepEqual(after, before, "Mismatch must not consume Package ID, revision, retention, or Registry state");
  });

  test("TRUST-01 T07 fails closed for unsafe locale, scale, currency and overflow inputs", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const utils = bridge.valueUtilsForTest;
    const numeric = { type: "currency", requirement: "required" };
    const parse = (rawValue, options = {}) => utils.parseLocalizedNumericValue({ rawValue, fieldDefinition: numeric, ...options });

    [
      ["1.234,56", 1234.56],
      ["1,234.56", 1234.56],
      ["1 234,56", 1234.56],
      ["1'234.56", 1234.56],
      ["EUR 1.234,56", 1234.56],
      ["0", 0],
      ["-0", 0],
      ["-125", -125]
    ].forEach(([value, expected]) => assert.equal(parse(value).normalizedValue, expected, `${value} must normalize without partial parsing`));
    ["Infinity", "NaN", "12abc", "EUR 1.2x3", "1e309"].forEach(value => {
      assert.equal(parse(value).status, "invalid", `${value} must fail closed`);
    });
    [null, undefined, "", "   "].forEach(value => assert.equal(parse(value).status, "missing", "Missing evidence must remain missing"));
    assert.equal(parse("1,234").status, "ambiguous", "1,234 must remain ambiguous without explicit or dominant locale");

    [
      ["Stock Value (kEUR)", 1000],
      ["Amounts in 000 EUR", 1000],
      ["Mio. EUR", 1000000],
      ["Mrd. EUR", 1000000000]
    ].forEach(([header, expected]) => {
      assert.equal(utils.extractSourceHeaderHints(header).sourceScaleFactor, expected, `${header} must expose its exact header scale`);
    });
    const thousandHeader = utils.extractSourceHeaderHints("Stock Value (kEUR)");
    assert.equal(parse("1.2k", { headerHints: thousandHeader }).status, "double_scale", "Cell scale under a scaled header must be rejected");

    function trustFor(stockValues) {
      const parsed = app.ObsoliQ.data.sourceModel.buildParsedSourceDataset(
        ["Material Number", "Stock Value"],
        stockValues.map((value, index) => [`MAT-T07-${index + 1}`, value])
      );
      const mapping = app.ObsoliQ.mapping.engine.createAutomaticColumnMapping({
        headers: parsed.headers,
        rows: parsed.rows,
        sourceColumnMetadata: parsed.sourceColumnMetadata
      });
      return bridge.inputTrustServiceForTest.assessInputTrust({
        packageType: "inventory_snapshot",
        headers: parsed.headers,
        rows: parsed.rows,
        sourceColumnMetadata: parsed.sourceColumnMetadata,
        mapping,
        mappingPolicy: app.ObsoliQ.mapping.engine.DEFAULT_MAPPING_POLICY
      });
    }

    const mixedLocale = trustFor(["1.234,56", "1,234.56"]);
    assert.equal(mixedLocale.trustState, "blocked", "Mixed locale must not be normalized row by row without an explicit policy");
    assert.ok(mixedLocale.diagnostics.some(item => ["mixed_numeric_locale", "ambiguous_numeric_locale"].includes(item.code)), "Mixed locale must have a blocking diagnostic");

    const mixedCurrency = trustFor(["EUR 1.234,56", "USD 1.234,56"]);
    assert.equal(mixedCurrency.trustState, "blocked", "Mixed currency must block required financial interpretation");
    assert.ok(mixedCurrency.diagnostics.some(item => item.code === "mixed_currency" && item.severity === "error"), "Mixed currency must expose a blocking no-FX diagnostic");
  });

  test("TRUST-01 T13 blocks a Consumption History semantic-policy signature mismatch before Registry commit", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const realBuilder = bridge.consumptionHistoryBuilderForTest;
    const isolatedRegistry = app.ObsoliQ.data.packageRegistry.createDataPackageRegistry();
    const mismatchBuilder = {
      ...realBuilder,
      buildConsumptionHistoryPackage(input) {
        const result = realBuilder.buildConsumptionHistoryPackage(input);
        return {
          ...result,
          buildMetadata: { ...result.buildMetadata, semanticPolicySignature: "tampered-history-semantic-signature" }
        };
      }
    };
    const isolatedService = app.ObsoliQ.application.packageImportService.createPackageImportService({
      sourceModel: app.ObsoliQ.data.sourceModel,
      mappingEngine: app.ObsoliQ.mapping.engine,
      inputTrustService: bridge.inputTrustServiceForTest,
      consumptionHistoryInterpretationService: bridge.consumptionHistoryInterpretationServiceForTest,
      registry: isolatedRegistry,
      packageDefinitions: app.ObsoliQ.data.packageRegistry.DATA_PACKAGE_TYPE_DEFINITIONS,
      builders: { consumption_history: mismatchBuilder, consumptionHistoryBuilder: mismatchBuilder },
      clock: () => "2026-08-30T11:00:00.000Z"
    });
    const parsed = bridge.parseDelimited([
      "Material Number,Consumption Quantity,Posting Date",
      "0000123,0,2026-01-31"
    ].join("\n"));
    const prepared = isolatedService.prepareImport({
      packageType: "consumption_history",
      parsedSource: parsed,
      sourceDescriptor: { sourceLabel: "trust-history-signature.csv", sourceType: "synthetic" }
    });
    const before = isolatedRegistry.getStats();
    const result = isolatedService.importPackage({
      packageType: "consumption_history",
      parsedSource: parsed,
      approvedMapping: prepared.approvedMapping,
      semanticPolicy: prepared.interpretationResult?.effectivePolicy,
      sourceDescriptor: prepared.sourceDescriptor
    });
    const after = isolatedRegistry.getStats();

    assert.equal(prepared.ok, true, "Valid zero-quantity History input must prepare successfully");
    assert.equal(result.ok, false, "Tampered History semantic signature must fail closed");
    assert.equal(result.errorCode, "HISTORY_SEMANTIC_SIGNATURE_MISMATCH", "History mismatch must expose the deterministic contract error");
    assert.deepEqual(after, before, "History semantic mismatch must not consume Package ID, revision, retention, or Registry state");
  });
})();
