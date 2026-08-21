(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function reviewInput(overrides = {}) {
    const caseId = overrides.caseId || "CASE-1";
    const rowKey = overrides.inventoryRowKey || "INV-1";
    return {
      datasetId: "DS-A",
      packageId: "PKG-A",
      packageRevision: 1,
      caseId,
      inventoryRowKey: rowKey,
      caseFingerprint: `fp:${caseId}:${rowKey}`,
      fingerprintVersion: "excess-pilot-case-v1",
      caseFingerprintPayload: { caseId, inventoryRowKey: rowKey, packageRevision: "1" },
      opportunityScore: 82,
      opportunityScoreModelVersion: "score-v1",
      reviewDisposition: "validated",
      scoreAssessment: "appropriate",
      recommendationAssessment: "useful",
      scenarioAssessment: "useful",
      ...overrides
    };
  }

  function assertRejectedWithoutMutation(assert, service, input, message) {
    const before = service.snapshot();
    assert.throws(() => service.recordReview(input), message);
    assert.deepEqual(service.snapshot(), before, `${message}: state and sequence should remain unchanged`);
  }

  test("AP 16.3b Pilot Review Service records, updates, scopes, summarizes, exports and restores deterministically", async assert => {
    const app = await helpers.loadProductionApp();
    const service = app.ObsoliQ.application.excessPilotReviewService.createExcessPilotReviewService({
      clock: (() => {
        let tick = 0;
        return () => `2026-08-20T10:00:0${tick += 1}.000Z`;
      })()
    });

    const first = service.recordReview(reviewInput({
      opportunityScoreModelVersion: "1",
      reviewDisposition: "validated",
      scoreAssessment: "appropriate",
      recommendationAssessment: "useful",
      scenarioAssessment: "useful",
      missingEvidenceCodes: ["consumption_history", "owner_reference"],
      requiredDataPackages: ["consumption_history"],
      requiredSapFields: ["last_consumption_date"],
      notes: "=needs protection"
    }));
    const updated = service.recordReview(reviewInput({
      opportunityScoreModelVersion: "1",
      reviewDisposition: "needs_adjustment",
      scoreAssessment: "too_high",
      recommendationAssessment: "partially_useful",
      scenarioAssessment: "unavailable",
      missingEvidenceCodes: ["purchase_order_details"],
      requiredDataPackages: ["purchase_orders"],
      requiredSapFields: ["open_purchase_order_number"]
    }));
    service.recordReview(reviewInput({
      datasetId: "DS-B",
      caseFingerprint: "fp:DS-B:CASE-1",
      caseFingerprintPayload: { caseId: "CASE-1", datasetId: "DS-B" }
    }));

    assert.equal(updated.reviewId, first.reviewId, "Updating the same dataset/case should preserve review identity");
    assert.equal(first.reviewId, "PILOT-REVIEW-000001", "Review IDs should use the monotonic sequence format");
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
    assert.equal(service.snapshot().reviewSequence, snapshot.reviewSequence, "Restore should reinstate review sequence state");
  });

  test("AP 16.3b.1.1 Pilot Review Service rejects incomplete new records before mutation", async assert => {
    const app = await helpers.loadProductionApp();
    const service = app.ObsoliQ.application.excessPilotReviewService.createExcessPilotReviewService();
    service.recordReview(reviewInput());
    const valid = reviewInput({ caseId: "CASE-2", inventoryRowKey: "INV-2", caseFingerprint: "fp:CASE-2" });
    [
      ["datasetId", ""],
      ["caseId", ""],
      ["inventoryRowKey", ""],
      ["packageId", ""],
      ["packageRevision", ""],
      ["packageRevision", "1"],
      ["packageRevision", 0],
      ["packageRevision", null],
      ["caseFingerprint", ""],
      ["fingerprintVersion", ""],
      ["caseFingerprintPayload", null],
      ["caseFingerprintPayload", []],
      ["opportunityScoreModelVersion", ""],
      ["opportunityScore", "82"],
      ["caseFingerprint", "legacy-review-subject"]
    ].forEach(([field, value]) => {
      assertRejectedWithoutMutation(assert, service, { ...valid, [field]: value }, `Invalid ${field} should be rejected`);
    });
    assert.equal(service.listReviews({ datasetId: "DS-A" }).length, 1, "Only the original valid review should remain");
    assert.equal(service.snapshot().reviewSequence, 1, "Invalid inputs must not consume Review IDs");
  });

  test("AP 16.3b.1.1 Pilot Review IDs remain monotonic across reset, invalid input and restore", async assert => {
    const app = await helpers.loadProductionApp();
    const service = app.ObsoliQ.application.excessPilotReviewService.createExcessPilotReviewService();
    const first = service.recordReview(reviewInput({ caseId: "CASE-A", inventoryRowKey: "INV-A", caseFingerprint: "fp:A" }));
    const second = service.recordReview(reviewInput({ caseId: "CASE-B", inventoryRowKey: "INV-B", caseFingerprint: "fp:B" }));
    assertRejectedWithoutMutation(assert, service, reviewInput({ caseId: "CASE-X", inventoryRowKey: "INV-X", caseFingerprint: "" }), "Invalid fingerprint should not consume an ID");
    service.resetDatasetReviews({ datasetId: "DS-A" });
    const third = service.recordReview(reviewInput({ datasetId: "DS-C", caseId: "CASE-C", inventoryRowKey: "INV-C", caseFingerprint: "fp:C" }));
    assert.notEqual(third.reviewId, first.reviewId, "Dataset reset must not allow ID reuse");
    assert.notEqual(third.reviewId, second.reviewId, "Later reviews must keep unique IDs after deletion");
    assert.equal(third.reviewId, "PILOT-REVIEW-000003", "Review sequence should continue after dataset deletion");

    const restored = app.ObsoliQ.application.excessPilotReviewService.createExcessPilotReviewService();
    restored.restore({
      serviceVersion: "2",
      reviewSequence: 1,
      reviews: [
        reviewInput({ reviewId: "PILOT-REVIEW-000099", caseId: "CASE-99", inventoryRowKey: "INV-99", caseFingerprint: "fp:99", packageRevision: "1" })
      ]
    });
    const restoredNext = restored.recordReview(reviewInput({ caseId: "CASE-100", inventoryRowKey: "INV-100", caseFingerprint: "fp:100" }));
    assert.equal(restoredNext.reviewId, "PILOT-REVIEW-000100", "Restore should derive sequence from existing IDs when stored sequence is lower");

    const collisionService = app.ObsoliQ.application.excessPilotReviewService.createExcessPilotReviewService();
    collisionService.restore({
      reviews: [
        reviewInput({ reviewId: "PILOT-REVIEW-000010", caseId: "CASE-10", inventoryRowKey: "INV-10", caseFingerprint: "fp:10", packageRevision: "1" }),
        reviewInput({ reviewId: "PILOT-REVIEW-000010", caseId: "CASE-11", inventoryRowKey: "INV-11", caseFingerprint: "fp:11", packageRevision: "1" })
      ]
    });
    const ids = collisionService.listReviews({ datasetId: "DS-A" }).map(review => review.reviewId);
    assert.equal(new Set(ids).size, ids.length, "Restore should prevent duplicate Review IDs from overwriting lifecycle maps");
  });

  test("AP 16.3b.1.1 Legacy Review records are isolated to explicit restore and stay historical", async assert => {
    const app = await helpers.loadProductionApp();
    const module = app.ObsoliQ.application.excessPilotReviewService;
    const service = module.createExcessPilotReviewService();
    assertRejectedWithoutMutation(assert, service, {
      datasetId: "DS-LEGACY",
      caseId: "CASE-L",
      inventoryRowKey: "INV-L",
      reviewDisposition: "validated"
    }, "Legacy-shaped normal recordReview input should be rejected");

    service.restore({
      reviews: [{
        reviewId: "PILOT-REVIEW-000012",
        datasetId: "DS-LEGACY",
        caseId: "CASE-L",
        inventoryRowKey: "INV-L",
        reviewDisposition: "validated",
        updatedAt: "2026-08-21T09:00:00.000Z"
      }]
    });
    const restored = service.listReviews({ datasetId: "DS-LEGACY" })[0];
    assert.equal(restored.caseFingerprint, "legacy-review-subject", "Explicit restore may mark legacy records with the legacy fingerprint");
    assert.includes(restored.reviewLifecycleReasonCodes, "legacy_record_unverified", "Legacy restore should mark records as unverified history");

    const currentCase = {
      dataset_id: "DS-LEGACY",
      case_id: "CASE-L",
      inventory_row_key: "INV-L",
      inventory_package_id: "PKG-L",
      inventory_package_revision: 1,
      excess_opportunity_score: 60,
      opportunity_score_model_version: "score-v1"
    };
    const currentSummary = service.buildSummary({
      datasetId: "DS-LEGACY",
      packageId: "PKG-L",
      packageRevision: 1,
      currentCases: [currentCase],
      scoreModelVersion: "score-v1"
    });
    const allSummary = service.buildSummary({
      datasetId: "DS-LEGACY",
      packageId: "PKG-L",
      packageRevision: 1,
      currentCases: [currentCase],
      scoreModelVersion: "score-v1",
      scope: "all"
    });
    assert.equal(currentSummary.reviewedCaseCount, 0, "Legacy restored reviews must not count as current validation evidence");
    assert.equal(allSummary.reviewedCaseCount, 1, "Legacy restored reviews remain available as all-state history");
  });
})();
