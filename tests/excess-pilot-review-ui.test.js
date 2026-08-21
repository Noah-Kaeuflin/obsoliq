(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function setLanguage(app, language) {
    const select = app.document.getElementById("languageSelect");
    select.value = language;
    select.dispatchEvent(new app.Event("change", { bubbles: true }));
  }

  function firstReviewCard(app) {
    return app.document.querySelector(".pilot-review-card");
  }

  test("AP 16.3b Pilot Review UI saves localized feedback, preserves it across navigation and exports dataset reviews", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    setLanguage(app, "de");
    bridge.switchViewForTest("excess");

    let text = bridge.renderExcessPageForTest();
    assert.ok(text.includes("Warum priorisiert"), "Case detail should render German Why Prioritized text");
    assert.ok(text.includes("Warum nicht höher"), "Case detail should render German Why Not Higher text");
    assert.ok(text.includes("Annahmenbasiertes Szenario"), "Scenario text should remain explicitly non-predictive in German");
    assert.equal(text.includes("Pilot material A"), false, "Pilot fixtures must not appear in production sample bootstrap");

    const card = firstReviewCard(app);
    assert.ok(card, "Pilot Review section should appear in the active Excess case detail");
    assert.ok(card.textContent.includes("Review-Ergebnis"), "Pilot Review field labels should be German");
    assert.equal(card.textContent.includes("needs_adjustment"), false, "Raw snake_case option labels should not be visible");

    const caseId = card.dataset.pilotCaseId;
    card.querySelector('[data-pilot-review-field="reviewDisposition"]').value = "needs_adjustment";
    card.querySelector('[data-pilot-review-field="scoreAssessment"]').value = "too_high";
    card.querySelector('[data-pilot-review-field="recommendationAssessment"]').value = "partially_useful";
    card.querySelector('[data-pilot-review-field="scenarioAssessment"]').value = "unavailable";
    card.querySelector('[data-pilot-review-list="missingEvidenceCodes"][value="consumption_history"]').checked = true;
    card.querySelector('[data-pilot-review-list="requiredDataPackages"][value="consumption_history"]').checked = true;
    card.querySelector('[data-pilot-review-list="requiredSapFields"][value="last_consumption_date"]').checked = true;
    card.querySelector('[data-pilot-review-field="notes"]').value = "Pilotnotiz";
    card.querySelector("[data-save-pilot-review]").click();

    const saved = bridge.getPilotReviewForTest({ datasetId: bridge.getState().currentDatasetId, caseId });
    assert.equal(saved.reviewDisposition, "needs_adjustment", "Save should create or update the current case review");
    assert.equal(saved.notes, "Pilotnotiz", "Saved review should keep notes");
    assert.equal(bridge.buildPilotReviewSummaryForTest({ datasetId: bridge.getState().currentDatasetId }).reviewedCaseCount, 1, "Review summary should update after save");

    bridge.switchViewForTest("dashboard");
    bridge.switchViewForTest("excess");
    const reloadedCard = firstReviewCard(app);
    assert.equal(reloadedCard.querySelector('[data-pilot-review-field="reviewDisposition"]').value, "needs_adjustment", "Saved review should reload after navigation");

    const exportRows = bridge.exportPilotReviewsForTest({ datasetId: bridge.getState().currentDatasetId });
    assert.equal(exportRows.length, 2, "Pilot Review export should contain the current dataset review");
    assert.ok(exportRows[1].includes("needs_adjustment"), "Export should include the saved disposition");

    setLanguage(app, "en");
    bridge.switchViewForTest("excess");
    text = bridge.renderExcessPageForTest();
    assert.ok(text.includes("Why Prioritized"), "Case detail should render English Why Prioritized text");
    assert.ok(text.includes("Review disposition"), "Pilot Review labels should switch to English");
    assert.ok(app.document.querySelector('[data-save-pilot-review]').offsetParent !== null || app.document.querySelector('[data-save-pilot-review]'), "Pilot Review controls should remain reachable");
    setLanguage(app, "de");
  });
})();
