(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function scaledCsv(value = "12.5") {
    return [
      "Material Number,Material Description,Stock Value (kEUR),Profit Center,Excess Value",
      `MAT-POLICY,Policy material,${value},PC-P,3`
    ].join("\n");
  }

  function blockedScaledCsv() {
    return [
      "Material Number,Stock Value (kEUR),Excess Value",
      "MAT-BLOCKED,12,5k,5"
    ].join("\n");
  }

  function mappingAndPolicySignatures(assert, bridge) {
    const state = bridge.getState();
    const packageRecord = bridge.getActiveInventoryPackage();
    const meta = state.datasetMeta;
    const mappingSignature = bridge.columnMappingSignatureForTest(meta.columnMapping);
    assert.equal(meta.appliedMappingSignature, mappingSignature, "Dataset Meta should expose the applied Mapping signature");
    assert.equal(meta.buildMetadata.mappingSignature, mappingSignature, "Builder Mapping signature should equal applied Mapping");
    assert.equal(packageRecord.mapping.mappingSignature, mappingSignature, "Package Mapping signature should equal Dataset Meta");
    assert.equal(bridge.columnMappingSignatureForTest(packageRecord.mapping.columnMapping), mappingSignature, "Package Mapping should be semantically identical");

    const policySignature = bridge.normalizationPolicySignatureForTest(meta.normalizationPolicy);
    assert.equal(meta.normalizationPolicySignature, policySignature, "Dataset Meta policy signature should equal effective policy");
    assert.equal(meta.buildMetadata.normalizationPolicySignature, policySignature, "Builder policy signature should equal Dataset Meta");
    assert.equal(meta.inputTrustMetadata.normalizationPolicySignature, policySignature, "Input Trust metadata should carry policy signature");
    assert.equal(packageRecord.inputTrustMetadata.normalizationPolicySignature, policySignature, "Package policy signature should equal Dataset Meta");
  }

  test("AP 16.2b.2.2 empty and partial policy overrides preserve Input Trust proposals", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const proposed = {
      fields: {
        stock_value: {
          sourceIndex: 2,
          sourceColumn: "Stock Value (kEUR)",
          numericLocale: "en-US",
          scaleSource: "header",
          sourceScaleFactor: 1000,
          sourceCurrency: "EUR"
        }
      }
    };
    const emptyMerged = bridge.mergeNormalizationPoliciesForTest(proposed, {});
    assert.deepEqual(emptyMerged.fields.stock_value, proposed.fields.stock_value, "Empty override must not suppress proposed policy");

    const partialMerged = bridge.mergeNormalizationPoliciesForTest(proposed, {
      fields: {
        stock_value: {
          sourceCurrency: "EUR",
          confirmed: true
        }
      }
    });
    assert.equal(partialMerged.fields.stock_value.numericLocale, "en-US", "Partial override should preserve proposed locale");
    assert.equal(partialMerged.fields.stock_value.scaleSource, "header", "Partial override should preserve proposed scale source");
    assert.equal(partialMerged.fields.stock_value.sourceScaleFactor, 1000, "Partial override should preserve proposed scale factor");
    assert.equal(partialMerged.fields.stock_value.confirmed, true, "Explicit confirmation flag should be merged");
  });

  test("AP 16.2b.2.2 trusted direct load uses one reviewed Mapping and one effective Policy", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const result = await bridge.loadTextDataset(scaledCsv(), "policy-direct.csv", {
      sourceType: "upload",
      allowMappingReview: false,
      normalizationPolicy: {}
    });
    assert.equal(result.status, "loaded", "Trusted load should complete directly");
    mappingAndPolicySignatures(assert, bridge);
    const state = bridge.getState();
    const policy = state.datasetMeta.normalizationPolicy.fields.stock_value;
    assert.equal(policy.scaleSource, "header", "Effective policy should preserve header scale proposal");
    assert.equal(policy.sourceScaleFactor, 1000, "Effective policy should preserve header scale factor");
    assert.equal(policy.confirmationMode || state.datasetMeta.normalizationPolicy.confirmationMode, "trusted_automatic", "Trusted load should not claim user confirmation");
    assert.equal(bridge.getEnrichedRowsForTest()[0].stock_value, 12500, "Builder should apply the effective header-scale policy");
  });

  test("AP 16.2b.2.2 Mapping Assistant controls initialize from proposed scale policy", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const result = bridge.beginUploadWithParsedData(app.ObsoliQ.data.sourceModel.buildParsedSourceDataset(
      ["Material Number", "Stock Value (kEUR)", "Excess Value"],
      [["MAT-BLOCKED", "12,5k", "5"]]
    ), "blocked-policy.csv", {
      sourceType: "upload",
      allowMappingReview: false,
      preserveFailureFeedback: true,
      suppressErrorLog: true
    });
    assert.equal(result.status, "mapping", "Blocked double-scale input should enter Mapping Assistant");
    const scaleSource = app.document.querySelector('[data-input-trust-policy][data-source-index="1"][data-policy-key="scaleSource"]');
    const scaleFactor = app.document.querySelector('[data-input-trust-policy][data-source-index="1"][data-policy-key="sourceScaleFactor"]');
    assert.ok(scaleSource, "Scale source control should exist");
    assert.ok(scaleFactor, "Scale factor control should exist");
    assert.equal(scaleSource.value, "header", "Scale source control should initialize from Input Trust proposal");
    assert.equal(scaleFactor.value, "1000", "Scale factor control should initialize from Input Trust proposal");
  });

  test("AP 16.2b.2.2 Mapping or Policy signature mismatch blocks Dataset commit", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getState();
    const mappingResult = await bridge.loadTextDataset(scaledCsv("22"), "forced-mapping-mismatch.csv", {
      sourceType: "upload",
      allowMappingReview: false,
      forceMappingSignatureMismatchForTest: true,
      suppressErrorLog: true,
      suppressFeedback: true
    });
    assert.equal(mappingResult.status, "error", "Forced Mapping signature mismatch should fail load");
    assert.equal(bridge.getState().currentDatasetId, before.currentDatasetId, "Failed Mapping mismatch should restore previous Dataset");
    assert.equal(bridge.getInventoryPackages().length, 1, "Failed Mapping mismatch should not add a Package revision");

    const policyResult = await bridge.loadTextDataset(scaledCsv("33"), "forced-policy-mismatch.csv", {
      sourceType: "upload",
      allowMappingReview: false,
      forceNormalizationPolicySignatureMismatchForTest: true,
      suppressErrorLog: true,
      suppressFeedback: true
    });
    assert.equal(policyResult.status, "error", "Forced Policy signature mismatch should fail load");
    assert.equal(bridge.getState().currentDatasetId, before.currentDatasetId, "Failed Policy mismatch should restore previous Dataset");
    assert.equal(bridge.getInventoryPackages().length, 1, "Failed Policy mismatch should not add a Package revision");
  });
})();
