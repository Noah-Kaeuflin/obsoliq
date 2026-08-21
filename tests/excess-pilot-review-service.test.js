(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  test("AP 16.3b Pilot Review Service records, updates, scopes, summarizes, exports and restores deterministically", async assert => {
    const app = await helpers.loadProductionApp();
    const service = app.ObsoliQ.application.excessPilotReviewService.createExcessPilotReviewService({
      clock: (() => {
        let tick = 0;
        return () => `2026-08-20T10:00:0${tick += 1}.000Z`;
      })()
    });

    const first = service.recordReview({
      datasetId: "DS-A",
      packageId: "PKG-A",
      packageRevision: 1,
      caseId: "CASE-1",
      inventoryRowKey: "INV-1",
      opportunityScore: 82,
      opportunityScoreModelVersion: "1",
      reviewDisposition: "validated",
      scoreAssessment: "appropriate",
      recommendationAssessment: "useful",
      scenarioAssessment: "useful",
      missingEvidenceCodes: ["consumption_history", "owner_reference"],
      requiredDataPackages: ["consumption_history"],
      requiredSapFields: ["last_consumption_date"],
      notes: "=needs protection"
    });
    const updated = service.recordReview({
      datasetId: "DS-A",
      caseId: "CASE-1",
      inventoryRowKey: "INV-1",
      reviewDisposition: "needs_adjustment",
      scoreAssessment: "too_high",
      recommendationAssessment: "partially_useful",
      scenarioAssessment: "unavailable",
      missingEvidenceCodes: ["purchase_order_details"],
      requiredDataPackages: ["purchase_orders"],
      requiredSapFields: ["open_purchase_order_number"]
    });
    service.recordReview({ datasetId: "DS-B", caseId: "CASE-1", inventoryRowKey: "INV-1", reviewDisposition: "validated" });

    assert.equal(updated.reviewId, first.reviewId, "Updating the same dataset/case should preserve review identity");
    assert.equal(service.listReviews({ datasetId: "DS-A" }).length, 1, "Dataset-scoped list should not leak reviews");
    assert.equal(service.listReviews({ datasetId: "DS-B" }).length, 1, "Same case in another Dataset remains separate");

    const summary = service.buildSummary({ datasetId: "DS-A" });
    assert.equal(summary.reviewedCaseCount, 1, "Summary should count current dataset reviews");
    assert.equal(summary.dispositions.needs_adjustment, 1, "Summary should count dispositions");
    assert.equal(summary.scoreAssessments.too_high, 1, "Summary should count score assessment");
    assert.equal(summary.mostFrequentMissingEvidence[0].key, "purchase_order_details", "Summary should expose most frequent evidence gap");
    assert.equal(summary.mostFrequentRequiredDataPackages[0].key, "purchase_orders", "Summary should expose most frequent package");
    assert.equal(summary.mostFrequentRequiredSapFields[0].key, "open_purchase_order_number", "Summary should expose requested SAP field");

    const rows = service.exportRows({ datasetId: "DS-A" });
    assert.equal(rows.length, 2, "Export should include header and one review");
    const notesIndex = rows[0].indexOf("Notes");
    assert.ok(String(rows[1][notesIndex]).startsWith("'="), "Export should apply formula injection protection to preserved notes");

    const snapshot = service.snapshot();
    service.resetDatasetReviews({ datasetId: "DS-A" });
    assert.equal(service.listReviews({ datasetId: "DS-A" }).length, 0, "Reset should remove current dataset reviews");
    service.restore(snapshot);
    assert.equal(service.listReviews({ datasetId: "DS-A" }).length, 1, "Restore should reinstate review snapshot");
  });
})();
