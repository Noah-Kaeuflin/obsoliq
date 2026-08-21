(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function firstReviewCard(app) {
    return app.document.querySelector(".pilot-review-card");
  }

  test("AP 16.3b.1 Pilot Review UI uses Registry revision and saves with targeted rendering", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();

    const state = bridge.getExcessPageStateForTest();
    const activeCase = state.activeCase;
    const identity = bridge.activeInventoryPackageIdentityForTest();
    const registryBefore = bridge.getActiveInventoryPackage();
    assert.ok(activeCase?.case_id, "Sample Excess page should expose an active case");
    assert.ok(identity.packageId, "Pilot Review should use active Registry package ID");
    assert.ok(identity.packageRevision, "Pilot Review should use active Registry package revision");

    const fingerprint = bridge.buildPilotCaseFingerprintForTest({
      caseRecord: activeCase,
      packageIdentity: identity,
      datasetId: bridge.getState().currentDatasetId,
      scoreModelVersion: activeCase.opportunity_score_model_version
    });
    const card = firstReviewCard(app);
    assert.ok(card, "Pilot Review card should render");
    card.querySelector('[data-pilot-review-field="reviewDisposition"]').value = "validated";

    bridge.resetExcessPageModelBuildCountForTest();
    card.querySelector("[data-save-pilot-review]").click();
    assert.equal(bridge.getExcessPageModelBuildCountForTest(), 0, "Saving a Pilot Review should not rebuild the full Excess model");

    const saved = bridge.getPilotReviewForTest({
      datasetId: bridge.getState().currentDatasetId,
      caseId: activeCase.case_id,
      caseFingerprint: fingerprint.fingerprint
    });
    assert.equal(saved.reviewDisposition, "validated", "Saved review should be bound to the current fingerprint");
    assert.equal(saved.packageId, identity.packageId, "Saved review should use the active Registry package ID");
    assert.equal(saved.packageRevision, identity.packageRevision, "Saved review should use the active Registry package revision");
    assert.equal(saved.fingerprintVersion, app.ObsoliQ.application.excessPilotReviewService.fingerprintVersion, "Saved review should keep the fingerprint version");
    assert.equal(bridge.getActiveInventoryPackage().revision, registryBefore.revision, "Saving a review should not create or mutate a package revision");

    const lifecycle = bridge.reconcileCurrentPilotReviewsForTest();
    assert.equal(lifecycle.currentCount, 1, "Saved review should reconcile as current");
    assert.equal(lifecycle.staleCount, 0, "Freshly saved current review should not be stale");
    assert.equal(lifecycle.orphanedCount, 0, "Freshly saved current review should not be orphaned");

    const currentRows = bridge.exportPilotReviewsForTest({
      datasetId: bridge.getState().currentDatasetId,
      packageId: identity.packageId,
      packageRevision: identity.packageRevision,
      currentCases: bridge.currentExcessPageModelForTest().cases,
      scoreModelVersion: activeCase.opportunity_score_model_version
    });
    assert.equal(currentRows.length, 2, "Current export should include only the current review");
    assert.ok(currentRows[0].includes("Lifecycle Status"), "Current export should include lifecycle columns");
  });

  test("AP 16.3b.1 Pilot Review save blocks when active package revision is missing", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const datasetId = bridge.getState().currentDatasetId;
    bridge.resetPilotReviewsForTest({ datasetId });

    const identity = bridge.activeInventoryPackageIdentityForTest();
    bridge.setPilotReviewPackageIdentityOverrideForTest({
      datasetId,
      packageId: identity.packageId,
      packageRevision: ""
    });
    const card = firstReviewCard(app);
    card.querySelector("[data-save-pilot-review]").click();
    assert.equal(bridge.listPilotReviewsForTest({ datasetId }).length, 0, "Missing package revision should block review creation");
    assert.ok(bridge.getState().feedback.includes("Package-Revision") || bridge.getState().feedback.includes("package revision"), "Blocked save should show package revision feedback");
    bridge.setPilotReviewPackageIdentityOverrideForTest(null);
  });
})();
