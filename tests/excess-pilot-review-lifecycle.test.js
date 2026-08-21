(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function fixtureCase(overrides = {}) {
    return {
      dataset_id: "DS-LIFE",
      case_id: "CASE-100",
      inventory_row_key: "INV-100",
      material_id: "MAT-100",
      inventory_package_id: "PKG-INV",
      inventory_package_revision: 1,
      excess_opportunity_score: 84,
      opportunity_score_model_version: "1",
      opportunity_score_components: {
        financial_impact: 32,
        urgency: 20,
        actionability: 14,
        evidence: 11,
        data_confidence: 7
      },
      gross_excess_value: 125000,
      net_addressable_excess_value: 110000,
      excess_overlap_value: 15000,
      recommended_action: "Review excess reduction",
      next_step: "Validate disposition",
      priority: "High",
      confidence: "High",
      owner_function: "Supply Chain",
      owner_reference: "MRP-A",
      owner_source: "inventory",
      owner_assignment_confidence: "High",
      relationship_status: "matched",
      relationship_match_type: "exact_material_plant",
      evidenceRecords: [
        {
          evidenceKey: "net_addressable_excess_value",
          evidenceType: "calculated_value",
          value: 110000,
          sourceField: "net_excess_value",
          sourcePackageId: "PKG-INV",
          sourcePackageRevision: 1,
          limitationCodes: []
        }
      ],
      scenarios: [
        {
          scenarioType: "excess_reduction_percent",
          availability: "available",
          observedInputs: { net_addressable_excess_value: 110000 },
          calculatedOutputs: { addressed_value: 27500 },
          missingEvidence: [],
          requiredPackages: [],
          limitations: [],
          modelVersion: "1"
        }
      ],
      limitations: [],
      ...overrides
    };
  }

  function createView(app, language = "en") {
    const labels = {
      en: {
        pilotReviewTitle: "Pilot Review",
        pilotReviewSubtitle: "Business feedback",
        pilotReviewSave: "Save Pilot Review",
        pilotStaleNoticeTitle: "Previous Pilot Review is outdated",
        pilotStaleNoticeBody: "The case has changed since the last review. Reassess and save the current state.",
        pilotOrphanNoticeTitle: "Review without current case",
        pilotOrphanNoticeBody: "The reviewed excess case no longer exists in the current model.",
        pilotHistoricalReview: "Historical review",
        pilotCurrentHistoryTitle: "Current Review available",
        pilotHistoryOne: "1 previous Review is retained as history.",
        pilotHistoryMany: "{count} previous Reviews are retained as history.",
        pilotLifecycleStale: "Stale",
        pilotLifecycleOrphaned: "Orphaned",
        notAvailable: "n/a",
        reviewDisposition: "Review disposition",
        scoreAssessment: "Score assessment",
        recommendationAssessment: "Recommendation assessment",
        scenarioAssessment: "Scenario assessment",
        missingEvidenceCodes: "Missing evidence",
        requiredDataPackages: "Required data packages",
        requiredSapFields: "Required SAP fields",
        notes: "Notes"
      },
      de: {
        pilotReviewTitle: "Pilotbewertung",
        pilotReviewSubtitle: "Business-Feedback",
        pilotReviewSave: "Pilotbewertung speichern",
        pilotStaleNoticeTitle: "Frühere Pilotbewertung ist veraltet",
        pilotStaleNoticeBody: "Der Fall hat sich seit der letzten Bewertung geändert. Bitte den aktuellen Stand erneut prüfen und speichern.",
        pilotOrphanNoticeTitle: "Bewertung ohne aktuellen Case",
        pilotOrphanNoticeBody: "Der bewertete Excess-Fall existiert im aktuellen Modell nicht mehr.",
        pilotHistoricalReview: "Historische Bewertung",
        pilotCurrentHistoryTitle: "Aktuelle Bewertung vorhanden",
        pilotHistoryOne: "1 frühere Bewertung ist als Historie gespeichert.",
        pilotHistoryMany: "{count} frühere Bewertungen sind als Historie gespeichert.",
        pilotLifecycleStale: "Veraltet",
        pilotLifecycleOrphaned: "Verwaist",
        notAvailable: "n/v",
        reviewDisposition: "Review-Ergebnis",
        scoreAssessment: "Score-Einschätzung",
        recommendationAssessment: "Empfehlung",
        scenarioAssessment: "Szenario",
        missingEvidenceCodes: "Fehlende Evidenz",
        requiredDataPackages: "Benötigte Datenpakete",
        requiredSapFields: "Benötigte SAP-Felder",
        notes: "Notizen"
      }
    };
    return app.ObsoliQ.application.excessPilotReviewView.createExcessPilotReviewView({
      html: value => String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
      })[char]),
      t: key => labels[language][key] || key,
      module: app.ObsoliQ.application.excessPilotReviewService
    });
  }

  test("AP 16.3b.1 Pilot Review service binds reviews to case fingerprints and reconciles lifecycle states", async assert => {
    const app = await helpers.loadProductionApp();
    const module = app.ObsoliQ.application.excessPilotReviewService;
    const service = module.createExcessPilotReviewService({
      clock: (() => {
        let tick = 0;
        return () => `2026-08-21T08:00:${String(tick += 1).padStart(2, "0")}.000Z`;
      })()
    });
    const packageIdentity = { packageId: "PKG-INV", packageRevision: 1 };
    const firstCase = fixtureCase();
    const firstFingerprint = module.buildExcessPilotCaseFingerprint({
      caseRecord: firstCase,
      packageIdentity,
      datasetId: "DS-LIFE",
      scoreModelVersion: "1"
    });
    const repeatedFingerprint = module.buildExcessPilotCaseFingerprint({
      caseRecord: fixtureCase(),
      packageIdentity,
      datasetId: "DS-LIFE",
      scoreModelVersion: "1"
    });

    assert.equal(firstFingerprint.fingerprint, repeatedFingerprint.fingerprint, "Fingerprint should be deterministic for the same case state");
    assert.equal(firstFingerprint.payload.packageRevision, "1", "Fingerprint payload should include package revision");
    assert.equal(firstFingerprint.payload.opportunityScoreModelVersion, "1", "Fingerprint payload should include score model version");

    const firstReview = service.recordReview({
      datasetId: "DS-LIFE",
      packageId: "PKG-INV",
      packageRevision: 1,
      caseId: "CASE-100",
      inventoryRowKey: "INV-100",
      caseFingerprint: firstFingerprint.fingerprint,
      fingerprintVersion: firstFingerprint.fingerprintVersion,
      caseFingerprintPayload: firstFingerprint.payload,
      opportunityScore: firstCase.excess_opportunity_score,
      opportunityScoreModelVersion: "1",
      reviewDisposition: "validated",
      notes: "=protected"
    });
    const updatedReview = service.recordReview({
      datasetId: "DS-LIFE",
      packageId: "PKG-INV",
      packageRevision: 1,
      caseId: "CASE-100",
      inventoryRowKey: "INV-100",
      caseFingerprint: firstFingerprint.fingerprint,
      fingerprintVersion: firstFingerprint.fingerprintVersion,
      caseFingerprintPayload: firstFingerprint.payload,
      opportunityScore: firstCase.excess_opportunity_score,
      opportunityScoreModelVersion: "1",
      reviewDisposition: "needs_adjustment"
    });
    assert.equal(updatedReview.reviewId, firstReview.reviewId, "Same fingerprint should update the same review");

    const changedCase = fixtureCase({
      excess_opportunity_score: 72,
      opportunity_score_components: { ...firstCase.opportunity_score_components, financial_impact: 20 },
      recommended_action: "Escalate owner validation"
    });
    const changedFingerprint = module.buildExcessPilotCaseFingerprint({
      caseRecord: changedCase,
      packageIdentity,
      datasetId: "DS-LIFE",
      scoreModelVersion: "1"
    });
    const changedReview = service.recordReview({
      datasetId: "DS-LIFE",
      packageId: "PKG-INV",
      packageRevision: 1,
      caseId: "CASE-100",
      inventoryRowKey: "INV-100",
      caseFingerprint: changedFingerprint.fingerprint,
      fingerprintVersion: changedFingerprint.fingerprintVersion,
      caseFingerprintPayload: changedFingerprint.payload,
      opportunityScore: changedCase.excess_opportunity_score,
      opportunityScoreModelVersion: "1",
      reviewDisposition: "validated"
    });
    assert.notEqual(changedReview.reviewId, firstReview.reviewId, "Changed fingerprint should create a historical review record");

    const lifecycle = service.reconcileReviews({
      datasetId: "DS-LIFE",
      packageId: "PKG-INV",
      packageRevision: 1,
      currentCases: [changedCase],
      scoreModelVersion: "1"
    });
    assert.equal(lifecycle.currentCount, 1, "Only the latest matching fingerprint should be current");
    assert.equal(lifecycle.staleCount, 1, "The prior fingerprint should become stale");
    assert.ok(lifecycle.staleReviews[0].reviewLifecycleReasonCodes.includes("score_changed"), "Stale review should explain score changes");
    assert.ok(lifecycle.staleReviews[0].reviewLifecycleReasonCodes.includes("recommendation_changed"), "Stale review should explain recommendation changes");

    const currentSummary = service.buildSummary({
      datasetId: "DS-LIFE",
      packageId: "PKG-INV",
      packageRevision: 1,
      currentCases: [changedCase],
      scoreModelVersion: "1"
    });
    const allSummary = service.buildSummary({
      datasetId: "DS-LIFE",
      packageId: "PKG-INV",
      packageRevision: 1,
      currentCases: [changedCase],
      scoreModelVersion: "1",
      scope: "all"
    });
    assert.equal(currentSummary.reviewedCaseCount, 1, "Current summary should exclude stale reviews");
    assert.equal(allSummary.reviewedCaseCount, 2, "All-state summary should include historical reviews");

    const currentExport = service.exportRows({
      datasetId: "DS-LIFE",
      packageId: "PKG-INV",
      packageRevision: 1,
      currentCases: [changedCase],
      scoreModelVersion: "1"
    });
    const allExport = service.exportRows({
      datasetId: "DS-LIFE",
      packageId: "PKG-INV",
      packageRevision: 1,
      currentCases: [changedCase],
      scoreModelVersion: "1",
      scope: "all"
    });
    assert.equal(currentExport.length, 2, "Default export should include current reviews only");
    assert.equal(allExport.length, 3, "All-state export should include current and stale reviews");
    assert.ok(allExport[0].includes("Lifecycle Status"), "Export should include lifecycle status");
    assert.ok(String(allExport[1]).includes("current") || String(allExport[2]).includes("current"), "Export should mark current reviews");
    assert.ok(String(allExport[1]).includes("'=protected") || String(allExport[2]).includes("'=protected"), "Export should preserve formula-injection protection");

    const orphaned = service.reconcileReviews({
      datasetId: "DS-LIFE",
      packageId: "PKG-INV",
      packageRevision: 1,
      currentCases: [],
      scoreModelVersion: "1"
    });
    assert.equal(orphaned.orphanedCount, 2, "Missing cases should become orphaned");
    assert.ok(orphaned.orphanedReviews[0].reviewLifecycleReasonCodes.includes("case_no_longer_present"), "Orphaned reviews should expose the orphan reason");
  });

  test("AP 16.3b.1.1 Pilot Review View separates current Reviews from stale history", async assert => {
    const app = await helpers.loadProductionApp();
    const view = createView(app, "en");
    const item = { case_id: "CASE-VIEW", inventory_row_key: "INV-VIEW" };
    const staleReview = {
      reviewId: "PILOT-REVIEW-000001",
      reviewLifecycleStatus: "stale",
      reviewLifecycleReasonCodes: ["score_changed"],
      updatedAt: "2026-08-21T09:00:00.000Z"
    };
    const olderStaleReview = {
      reviewId: "PILOT-REVIEW-000002",
      reviewLifecycleStatus: "stale",
      reviewLifecycleReasonCodes: ["recommendation_changed"],
      updatedAt: "2026-08-20T09:00:00.000Z"
    };

    const emptyHtml = view.renderReviewForm({ item, review: {}, fingerprint: { fingerprint: "fp:view" }, lifecycle: { staleReviews: [] } });
    assert.equal(emptyHtml.includes("Previous Pilot Review is outdated"), false, "No-review state should not show stale CTA");

    const staleOnlyHtml = view.renderReviewForm({ item, review: {}, fingerprint: { fingerprint: "fp:view" }, lifecycle: { staleReviews: [staleReview] } });
    assert.ok(staleOnlyHtml.includes("Previous Pilot Review is outdated"), "Stale-without-current should show reassessment CTA");

    const currentPlusHistoryHtml = view.renderReviewForm({
      item,
      review: { reviewId: "PILOT-REVIEW-000003", reviewDisposition: "validated" },
      fingerprint: { fingerprint: "fp:view-current" },
      lifecycle: { staleReviews: [olderStaleReview, staleReview] }
    });
    assert.equal(currentPlusHistoryHtml.includes("Previous Pilot Review is outdated"), false, "Current plus stale history should hide stale CTA");
    assert.ok(currentPlusHistoryHtml.includes("Current Review available"), "Current plus stale history should show neutral history");
    assert.ok(currentPlusHistoryHtml.includes("2 previous Reviews are retained as history."), "History count should be pluralized");
    assert.ok(currentPlusHistoryHtml.indexOf("PILOT-REVIEW-000001") < currentPlusHistoryHtml.indexOf("PILOT-REVIEW-000002"), "Historical Reviews should be ordered newest first");

    const germanView = createView(app, "de");
    const germanHtml = germanView.renderReviewForm({
      item,
      review: { reviewId: "PILOT-REVIEW-000004", reviewDisposition: "validated" },
      fingerprint: { fingerprint: "fp:view-current-de" },
      lifecycle: { staleReviews: [staleReview] }
    });
    assert.ok(germanHtml.includes("Aktuelle Bewertung vorhanden"), "German neutral history title should render");
    assert.equal(germanHtml.includes("score_changed"), false, "Raw lifecycle codes should not be visible in localized view copy");
  });
})();
