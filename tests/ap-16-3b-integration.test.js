(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function baselineSnapshot(bridge) {
    const model = bridge.currentExcessPageModelForTest();
    return {
      recovery: model.summary,
      dq: bridge.getDataQualityBaselineForTest(),
      actions: bridge.getEnrichedRowsForTest().map(row => ({
        key: row.inventory_row_key,
        material: row.material_id,
        recommendation: row.recommended_action,
        priority: row.priority,
        confidence: row.confidence,
        status: row.status
      })),
      inventoryPackage: bridge.getActiveInventoryPackage(),
      materialMasterPackage: bridge.getActiveMaterialMasterPackage()
    };
  }

  test("AP 16.3b Pilot Review and Action handoff do not change Recovery, Data Quality, Actions or Package revisions", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    const before = baselineSnapshot(bridge);
    const stateBefore = bridge.getExcessPageStateForTest();
    const activeCase = stateBefore.activeCase;
    assert.ok(activeCase, "Sample data should expose an active Excess case");
    const packageIdentity = bridge.activeInventoryPackageIdentityForTest();
    const fingerprint = bridge.buildPilotCaseFingerprintForTest({
      caseRecord: activeCase,
      packageIdentity,
      datasetId: bridge.getState().currentDatasetId,
      scoreModelVersion: activeCase.opportunity_score_model_version
    });

    bridge.recordPilotReviewForTest({
      datasetId: bridge.getState().currentDatasetId,
      packageId: packageIdentity.packageId,
      packageRevision: packageIdentity.packageRevision,
      caseId: activeCase.case_id,
      inventoryRowKey: activeCase.inventory_row_key,
      caseFingerprint: fingerprint.fingerprint,
      fingerprintVersion: fingerprint.fingerprintVersion,
      caseFingerprintPayload: fingerprint.payload,
      opportunityScore: activeCase.excess_opportunity_score,
      opportunityScoreModelVersion: activeCase.opportunity_score_model_version,
      reviewDisposition: "validated",
      scoreAssessment: "appropriate",
      recommendationAssessment: "useful",
      scenarioAssessment: "not_relevant",
      missingEvidenceCodes: ["consumption_history"],
      requiredDataPackages: ["consumption_history"],
      requiredSapFields: ["last_consumption_date"]
    });
    const afterReview = baselineSnapshot(bridge);
    assert.deepEqual(afterReview.recovery, before.recovery, "Pilot Review must not change Recovery baseline");
    assert.deepEqual(afterReview.dq, before.dq, "Pilot Review must not change Data Quality baseline");
    assert.deepEqual(afterReview.actions, before.actions, "Pilot Review must not change Action recommendations, priority, confidence or status");
    assert.equal(afterReview.inventoryPackage.revision, before.inventoryPackage.revision, "Pilot Review must not change Inventory Package revision");
    assert.deepEqual(afterReview.materialMasterPackage, before.materialMasterPackage, "Pilot Review must not change Material Master Package state");

    bridge.switchViewForTest("excess");
    const actionCountBefore = bridge.getEnrichedRowsForTest().filter(row => row.recovery_potential > 0 || row.status).length;
    const openActionButton = app.document.querySelector("[data-open-actions]");
    assert.ok(openActionButton, "Existing Action handoff button should be present");
    openActionButton.click();
    assert.equal(bridge.getState().currentView, "actions", "Action handoff should open the existing Actions page");
    const actionCountAfter = bridge.getEnrichedRowsForTest().filter(row => row.recovery_potential > 0 || row.status).length;
    assert.equal(actionCountAfter, actionCountBefore, "Action handoff must not create duplicate Actions");
  });
})();
