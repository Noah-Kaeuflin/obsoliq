(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function makeCase(index) {
    const score = 40 + (index % 50);
    return {
      dataset_id: "DS-PERF",
      case_id: `CASE-${index}`,
      inventory_row_key: `INV-${index}`,
      material_id: `MAT-${index}`,
      inventory_package_id: "PKG-PERF",
      inventory_package_revision: 1,
      excess_opportunity_score: score,
      opportunity_score_model_version: "1",
      opportunity_score_components: {
        financial_impact: score % 35,
        urgency: score % 20,
        actionability: score % 18,
        evidence: score % 15,
        data_confidence: score % 12
      },
      gross_excess_value: 10000 + index,
      net_addressable_excess_value: 8000 + index,
      excess_overlap_value: index % 3,
      recommended_action: "Review excess",
      next_step: "Validate",
      priority: index % 5 === 0 ? "High" : "Medium",
      confidence: "Medium",
      owner_function: "Supply Chain",
      owner_reference: `MRP-${index % 50}`,
      owner_source: "inventory",
      owner_assignment_confidence: "Medium",
      relationship_status: "matched",
      relationship_match_type: "exact_material_plant",
      evidenceRecords: [],
      scenarios: [],
      limitations: []
    };
  }

  test("AP 16.3b.1 Pilot Review lifecycle reconciliation scales with indexed lookups", async assert => {
    const app = await helpers.loadProductionApp();
    const module = app.ObsoliQ.application.excessPilotReviewService;
    const service = module.createExcessPilotReviewService();
    const packageIdentity = { packageId: "PKG-PERF", packageRevision: 1 };
    const currentCases = Array.from({ length: 10000 }, (_value, index) => makeCase(index + 1));
    const reviewIds = new Set();
    const creationStarted = performance.now();
    Array.from({ length: 5000 }, (_value, index) => {
      const currentCase = index < 4500 ? currentCases[index] : makeCase(20000 + index);
      const reviewedCase = index >= 4000 && index < 4500
        ? { ...currentCase, excess_opportunity_score: currentCase.excess_opportunity_score + 1 }
        : currentCase;
      const fingerprint = module.buildExcessPilotCaseFingerprint({
        caseRecord: reviewedCase,
        packageIdentity,
        datasetId: "DS-PERF",
        scoreModelVersion: "1"
      });
      const review = service.recordReview({
        datasetId: "DS-PERF",
        packageId: "PKG-PERF",
        packageRevision: 1,
        caseId: currentCase.case_id,
        inventoryRowKey: currentCase.inventory_row_key,
        caseFingerprint: fingerprint.fingerprint,
        fingerprintVersion: fingerprint.fingerprintVersion,
        caseFingerprintPayload: fingerprint.payload,
        opportunityScore: reviewedCase.excess_opportunity_score,
        opportunityScoreModelVersion: "1",
        reviewDisposition: "validated"
      });
      reviewIds.add(review.reviewId);
    });
    const creationDuration = performance.now() - creationStarted;

    const started = performance.now();
    const lifecycle = service.reconcileReviews({
      datasetId: "DS-PERF",
      packageId: "PKG-PERF",
      packageRevision: 1,
      currentCases,
      scoreModelVersion: "1"
    });
    const summary = service.buildSummary({
      datasetId: "DS-PERF",
      packageId: "PKG-PERF",
      packageRevision: 1,
      currentCases,
      scoreModelVersion: "1"
    });
    const currentExport = service.exportRows({
      datasetId: "DS-PERF",
      packageId: "PKG-PERF",
      packageRevision: 1,
      currentCases,
      scoreModelVersion: "1"
    });
    const allSummary = service.buildSummary({
      datasetId: "DS-PERF",
      packageId: "PKG-PERF",
      packageRevision: 1,
      currentCases,
      scoreModelVersion: "1",
      scope: "all"
    });
    const allExport = service.exportRows({
      datasetId: "DS-PERF",
      packageId: "PKG-PERF",
      packageRevision: 1,
      currentCases,
      scoreModelVersion: "1",
      scope: "all"
    });
    const duration = performance.now() - started;
    const resetStarted = performance.now();
    const reset = service.resetDatasetReviews({ datasetId: "DS-PERF" });
    const resetDuration = performance.now() - resetStarted;
    const sequenceAfterReset = service.snapshot().reviewSequence;
    Array.from({ length: 1000 }, (_value, index) => {
      const caseRecord = currentCases[index];
      const fingerprint = module.buildExcessPilotCaseFingerprint({
        caseRecord,
        packageIdentity,
        datasetId: "DS-PERF-NEW",
        scoreModelVersion: "1"
      });
      const review = service.recordReview({
        datasetId: "DS-PERF-NEW",
        packageId: "PKG-PERF",
        packageRevision: 1,
        caseId: caseRecord.case_id,
        inventoryRowKey: caseRecord.inventory_row_key,
        caseFingerprint: fingerprint.fingerprint,
        fingerprintVersion: fingerprint.fingerprintVersion,
        caseFingerprintPayload: fingerprint.payload,
        opportunityScore: caseRecord.excess_opportunity_score,
        opportunityScoreModelVersion: "1",
        reviewDisposition: "validated"
      });
      reviewIds.add(review.reviewId);
    });

    assert.equal(lifecycle.currentCount, 4000, "Matching performance reviews should reconcile as current");
    assert.equal(lifecycle.staleCount, 500, "Changed performance reviews should reconcile as stale");
    assert.equal(lifecycle.orphanedCount, 500, "Missing performance cases should reconcile as orphaned");
    assert.equal(summary.reviewedCaseCount, 4000, "Current summary should include current reviews only");
    assert.equal(allSummary.reviewedCaseCount, 5000, "All-state summary should include current, stale and orphaned reviews");
    assert.equal(currentExport.length, 4001, "Current export should include header plus current reviews");
    assert.equal(allExport.length, 5001, "All-state export should include header plus all reviews");
    assert.equal(reset.removed, 5000, "Dataset-specific reset should remove the performance dataset reviews");
    assert.equal(service.snapshot().reviewSequence, sequenceAfterReset + 1000, "Subsequent reviews should continue the monotonic sequence after reset");
    assert.equal(reviewIds.size, 6000, "Performance sequence should create no Review-ID collision");
    assert.ok(Number.isFinite(creationDuration) && Number.isFinite(duration) && Number.isFinite(resetDuration), "Performance timings should be measurable");
  });
})();
