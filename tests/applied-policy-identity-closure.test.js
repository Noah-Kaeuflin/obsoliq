(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function singleScaledCsv(value = "12.5") {
    return [
      "Material Number,Material Description,Stock Value (kEUR),Profit Center,Excess Value",
      `MAT-POLICY,Policy material,${value},PC-P,3`
    ].join("\n");
  }

  function dualStockParsedSource(app) {
    return app.ObsoliQ.data.sourceModel.buildParsedSourceDataset(
      ["Material Number", "Material Description", "Stock Value (kEUR)", "Stock Value EUR", "Profit Center", "Excess Value"],
      [["MAT-REMAP", "Remap material", "12.5", "1234", "PC-R", "12"]]
    );
  }

  function sourceBoundStockPolicy(assert, policy, sourceIndex) {
    assert.equal(policy.canonicalField, "stock_value", "Policy should carry the canonical field");
    assert.equal(policy.sourceIndex, sourceIndex, "Policy should carry the physical sourceIndex");
    assert.ok(policy.sourceKey, "Policy should carry the physical sourceKey");
    assert.ok(policy.sourceColumn, "Policy should carry the source column audit label");
  }

  test("AP 16.2b.2.3 policies include physical source identity", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const result = await bridge.loadTextDataset(singleScaledCsv(), "source-bound-policy.csv", {
      sourceType: "upload",
      allowMappingReview: false
    });
    assert.equal(result.status, "loaded", "Source-bound policy dataset should load");
    const policy = bridge.getState().datasetMeta.normalizationPolicy.fields.stock_value;
    sourceBoundStockPolicy(assert, policy, 2);
    assert.equal(policy.sourceColumn, "Stock Value (kEUR)", "Policy should retain the reviewed physical source column");
    assert.equal(policy.sourceKey, "Stock Value (kEUR)", "Policy should retain the reviewed source key");
    assert.equal(policy.scaleSource, "header", "Header scale proposal should remain applied");
    assert.equal(policy.sourceScaleFactor, 1000, "Header scale factor should remain applied");
  });

  test("AP 16.2b.2.3 duplicate headers use sourceKey and sourceIndex identity", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const parsed = app.ObsoliQ.data.sourceModel.buildParsedSourceDataset(
      ["Material Number", "Stock Value", "Stock Value"],
      [["MAT-DUP", "100", "200"]]
    );
    const mapping = app.ObsoliQ.mapping.engine.createAutomaticColumnMapping({
      headers: parsed.headers,
      rows: parsed.rows,
      sourceColumnMetadata: parsed.sourceColumnMetadata
    });
    const secondStock = mapping.find(entry => entry.sourceIndex === 2);
    const identity = bridge.sourceIdentityForPolicyEntryForTest(secondStock, parsed.sourceColumnMetadata);
    assert.equal(identity.sourceIndex, 2, "Duplicate source identity should use the exact sourceIndex");
    assert.equal(identity.sourceKey, "Stock Value__2", "Duplicate source identity should use the duplicate-aware sourceKey");
    assert.equal(identity.sourceColumn, "Stock Value__2", "Duplicate source identity should retain the approved physical source column");
  });

  test("AP 16.2b.2.3 unchanged Mapping reopen preserves applied Policy signature and values", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const result = await bridge.loadTextDataset(singleScaledCsv(), "policy-reopen.csv", {
      sourceType: "upload",
      allowMappingReview: false
    });
    assert.equal(result.status, "loaded", "Initial policy dataset should load");
    const beforeState = bridge.getState();
    const beforePolicySignature = beforeState.datasetMeta.normalizationPolicySignature;
    const beforeMappingSignature = beforeState.datasetMeta.appliedMappingSignature;
    const beforeStockValue = bridge.getEnrichedRowsForTest()[0].stock_value;

    bridge.reopenColumnMappingForCurrentDataset();
    const pending = bridge.getState().pendingUploadContext;
    assert.ok(pending, "Mapping Assistant should reopen");
    assert.equal(pending.appliedNormalizationPolicySignature, beforePolicySignature, "Reopen should carry the applied policy signature");
    assert.equal(pending.committedInputTrustMetadata.normalizationPolicySignature, beforePolicySignature, "Reopen should carry committed Input Trust metadata");
    const scaleSelect = app.document.querySelector('[data-input-trust-policy][data-source-index="2"][data-policy-key="scaleSource"]');
    const factorSelect = app.document.querySelector('[data-input-trust-policy][data-source-index="2"][data-policy-key="sourceScaleFactor"]');
    assert.equal(scaleSelect?.value, "header", "Reopened controls should show the applied Header scale");
    assert.equal(factorSelect?.value, "1000", "Reopened controls should show the applied scale factor");

    const applied = bridge.continueUploadWithMapping(pending.approvedMapping);
    assert.equal(applied, true, "Unchanged Mapping review should apply");
    const afterState = bridge.getState();
    assert.equal(afterState.datasetMeta.appliedMappingSignature, beforeMappingSignature, "Unchanged review should preserve Mapping signature");
    assert.equal(afterState.datasetMeta.normalizationPolicySignature, beforePolicySignature, "Unchanged review should preserve Policy signature");
    assert.equal(bridge.getEnrichedRowsForTest()[0].stock_value, beforeStockValue, "Unchanged review should preserve normalized values");
  });

  test("AP 16.2b.2.3 remapping to another physical source invalidates stale Policy", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const parsed = dualStockParsedSource(app);
    const initial = bridge.beginUploadWithParsedData(parsed, "policy-remap.csv", {
      sourceType: "upload",
      allowMappingReview: true,
      suppressFeedback: true
    });
    assert.equal(initial.status, "mapping", "Duplicate stock value candidates should open Mapping review");
    let mapping = bridge.getState().pendingUploadContext.approvedMapping.map(entry => {
      if (entry.sourceIndex === 2) return { ...entry, selectedCanonicalField: "stock_value", ignored: false, manual: true };
      if (entry.sourceIndex === 3) return { ...entry, selectedCanonicalField: "", ignored: true, manual: true };
      return entry;
    });
    bridge.setPendingUploadContextOptions({ approvedMapping: mapping, inputTrustReviewConfirmed: true });
    assert.equal(bridge.continueUploadWithMapping(mapping), true, "Initial reviewed Mapping should load");
    const beforeState = bridge.getState();
    const beforePolicy = beforeState.datasetMeta.normalizationPolicy.fields.stock_value;
    sourceBoundStockPolicy(assert, beforePolicy, 2);
    assert.equal(bridge.getEnrichedRowsForTest()[0].stock_value, 12500, "Initial source should apply kEUR header scaling");

    bridge.reopenColumnMappingForCurrentDataset();
    mapping = bridge.getState().pendingUploadContext.approvedMapping.map(entry => {
      if (entry.sourceIndex === 2) return { ...entry, selectedCanonicalField: "", ignored: true, manual: true };
      if (entry.sourceIndex === 3) return { ...entry, selectedCanonicalField: "stock_value", ignored: false, manual: true };
      return entry;
    });
    bridge.setPendingUploadContextOptions({ approvedMapping: mapping });
    assert.equal(bridge.continueUploadWithMapping(mapping), true, "Changed physical source Mapping should apply");
    const afterState = bridge.getState();
    const afterPolicy = afterState.datasetMeta.normalizationPolicy.fields.stock_value;
    sourceBoundStockPolicy(assert, afterPolicy, 3);
    assert.equal(afterPolicy.scaleSource, "none", "Stale Header scale should not transfer to the new physical source");
    assert.equal(afterPolicy.sourceScaleFactor, 1, "New physical source should receive its own proposal");
    assert.equal(Boolean(afterPolicy.confirmed), false, "Source change should reset field confirmation");
    assert.equal(afterState.datasetMeta.normalizationPolicy.reviewConfirmed, false, "Source change should reset review confirmation");
    assert.equal(bridge.getEnrichedRowsForTest()[0].stock_value, 1234, "New source value should be normalized without stale kEUR scaling");
  });

  test("AP 16.2b.2.3 stale source-bound policies fail the identity invariant", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const parsed = dualStockParsedSource(app);
    const mapping = app.ObsoliQ.mapping.engine.createAutomaticColumnMapping({
      headers: parsed.headers,
      rows: parsed.rows,
      sourceColumnMetadata: parsed.sourceColumnMetadata
    }).map(entry => {
      if (entry.sourceIndex === 2) return { ...entry, selectedCanonicalField: "", ignored: true, manual: true };
      if (entry.sourceIndex === 3) return { ...entry, selectedCanonicalField: "stock_value", ignored: false, manual: true };
      return entry;
    });
    const stalePolicy = {
      fields: {
        stock_value: {
          canonicalField: "stock_value",
          sourceIndex: 2,
          sourceColumn: "Stock Value (kEUR)",
          sourceKey: "Stock Value (kEUR)",
          scaleSource: "header",
          sourceScaleFactor: 1000
        }
      }
    };
    let blocked = false;
    try {
      bridge.assertNormalizationPolicySourceIdentityForTest({
        policy: stalePolicy,
        mapping,
        sourceColumnMetadata: parsed.sourceColumnMetadata,
        label: "Stale Policy"
      });
    } catch (error) {
      blocked = /source identity invariant failed/.test(error.message);
    }
    assert.equal(blocked, true, "A stale Policy for another physical source should fail the invariant");
  });
})();
