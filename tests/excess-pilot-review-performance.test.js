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
    currentCases.slice(0, 1000).forEach(caseRecord => {
      const fingerprint = module.buildExcessPilotCaseFingerprint({
        caseRecord,
        packageIdentity,
        datasetId: "DS-PERF",
        scoreModelVersion: "1"
      });
      service.recordReview({
        datasetId: "DS-PERF",
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
    });

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
    const duration = performance.now() - started;

    assert.equal(lifecycle.currentCount, 1000, "All matching performance reviews should be current");
    assert.equal(summary.reviewedCaseCount, 1000, "Current summary should include 1,000 reviews");
    assert.equal(currentExport.length, 1001, "Current export should include header plus 1,000 reviews");
    assert.ok(duration < 3000, `Lifecycle, summary and export should finish within a compact budget; observed ${Math.round(duration)} ms`);
  });
})();
