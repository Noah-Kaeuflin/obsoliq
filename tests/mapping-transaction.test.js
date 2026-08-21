(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function openMappingReview(app, stage = "") {
    const bridge = app.__obsoliqTestBridge;
    const parsed = bridge.parseDelimited(helpers.simpleCsv(`MAT-MAP-${stage || "SUCCESS"}`, "180"));
    const result = bridge.beginUploadWithParsedData(parsed, `mapping-${stage || "success"}.csv`, {
      sourceType: "upload",
      forceReview: true,
      preserveRemediation: true,
      suppressErrorLog: true,
      forceMappingFinalizeFailureForTest: stage
    });
    if (result.status !== "mapping") {
      throw new Error(`Expected mapping review, got ${result.status}`);
    }
  }

  function analyticalDomSnapshot(app) {
    const doc = app.document;
    return {
      mInventory: doc.getElementById("mInventory")?.textContent || "",
      mRecovery: doc.getElementById("mRecovery")?.textContent || "",
      mRows: doc.getElementById("mRows")?.textContent || "",
      recoveryProgressFill: doc.getElementById("recoveryProgressFill")?.getAttribute("style") || "",
      categoryBars: doc.getElementById("categoryBars")?.innerHTML || "",
      plantBars: doc.getElementById("plantBars")?.innerHTML || "",
      topTable: doc.getElementById("topTable")?.innerHTML || "",
      actionsTable: doc.getElementById("actionsTable")?.innerHTML || "",
      inventoryTable: doc.getElementById("inventoryTable")?.innerHTML || "",
      dataCheck: doc.getElementById("dataCheck")?.innerHTML || "",
      chips: helpers.currentChips(app)
    };
  }

  function assertAnalyticalDomRestored(assert, after, before, stage) {
    Object.keys(before).forEach(key => {
      assert.deepEqual(after[key], before[key], `${stage} rollback should restore ${key}`);
    });
  }

  ["mapping-action", "ledger"].forEach(stage => {
    test(`mapping apply rollback after ${stage} failure`, async assert => {
      const app = await helpers.loadSampleApp();
      const bridge = app.__obsoliqTestBridge;
      const before = bridge.getState();
      openMappingReview(app, stage);
      const result = bridge.continueUploadWithMapping();
      const after = bridge.getState();
      assert.equal(result, false, "Forced mapping finalization failure should return false");
      assert.equal(after.currentDatasetId, before.currentDatasetId, "Previous dataset should be restored");
      assert.equal(after.remediationActions, before.remediationActions, "No mapping action should remain after rollback");
      assert.equal(after.remediationHistory, before.remediationHistory, "No history entry should remain after rollback");
      assert.equal(after.issueLedgerSize, before.issueLedgerSize, "Issue ledger should roll back");
      assert.equal(after.mappingOpen, true, "Mapping Assistant should remain open or reopen");
      assert.ok(!String(after.feedback).includes("mappingApplied"), "No raw success feedback key should remain visible");
    });
  });

  ["render", "close", "feedback"].forEach(stage => {
    test(`mapping apply DOM rollback after ${stage} failure`, async assert => {
      const app = await helpers.loadSampleApp();
      const bridge = app.__obsoliqTestBridge;
      const before = bridge.getState();
      const beforeDom = analyticalDomSnapshot(app);
      openMappingReview(app, stage);
      const result = bridge.continueUploadWithMapping();
      const after = bridge.getState();
      const afterDom = analyticalDomSnapshot(app);
      assert.equal(result, false, `Forced ${stage} failure should return false`);
      assert.equal(after.currentDatasetId, before.currentDatasetId, `${stage} rollback should restore Dataset ID`);
      assert.equal(after.rawRows, before.rawRows, `${stage} rollback should restore raw row count`);
      assert.equal(after.normalizedRows, before.normalizedRows, `${stage} rollback should restore normalized row count`);
      assert.equal(after.enrichedRows, before.enrichedRows, `${stage} rollback should restore enriched row count`);
      assert.equal(after.remediationActions, before.remediationActions, `${stage} rollback should remove failed mapping action`);
      assert.equal(after.remediationHistory, before.remediationHistory, `${stage} rollback should remove failed history entries`);
      assert.equal(after.issueLedgerSize, before.issueLedgerSize, `${stage} rollback should restore the Issue Ledger`);
      assert.equal(after.mappingOpen, true, `${stage} rollback should reopen Mapping Assistant`);
      assert.equal(after.feedback, "Fehler beim Import", `${stage} rollback should show failure feedback`);
      assert.ok(!String(after.feedback).includes("Zuordnung angewendet"), `${stage} rollback should not show success feedback`);
      assertAnalyticalDomRestored(assert, afterDom, beforeDom, stage);
      bridge.setPendingUploadContextOptions({ forceMappingFinalizeFailureForTest: "" });
      assert.equal(bridge.continueUploadWithMapping(), true, `${stage} rollback should keep Mapping Assistant usable for retry`);
    });
  });

  test("successful mapping apply commits after final workflow completion", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getState();
    openMappingReview(app);
    const result = bridge.continueUploadWithMapping();
    const after = bridge.getState();
    assert.equal(result, true, "Successful mapping apply should return true");
    assert.equal(after.currentDatasetId, before.currentDatasetId, "Same-dataset mapping apply should preserve the active dataset ID");
    assert.equal(after.rawRows, 1, "Successful mapping apply should commit the mapped replacement dataset rows");
    assert.equal(after.mappingOpen, false, "Mapping Assistant should close after successful apply");
    assert.ok(after.remediationActions >= before.remediationActions, "Remediation action count should not decrease");
    assert.ok(String(after.feedback).length > 0, "Final workflow feedback should be visible");
  });
})();
