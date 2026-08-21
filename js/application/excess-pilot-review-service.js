(function registerExcessPilotReviewService(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.application = root.application || {};

  const SERVICE_VERSION = "2";
  const FINGERPRINT_VERSION = "excess-pilot-case-v1";
  const LEGACY_FINGERPRINT = "legacy-review-subject";
  const REVIEW_DISPOSITIONS = Object.freeze(["validated", "needs_adjustment", "not_actionable", "not_reviewed"]);
  const SCORE_ASSESSMENTS = Object.freeze(["too_high", "appropriate", "too_low", "not_assessed"]);
  const RECOMMENDATION_ASSESSMENTS = Object.freeze(["useful", "partially_useful", "not_useful", "not_assessed"]);
  const SCENARIO_ASSESSMENTS = Object.freeze(["useful", "unavailable", "not_relevant", "not_assessed"]);
  const LIFECYCLE_STATES = Object.freeze(["current", "stale", "orphaned"]);
  const STALE_REASON_CODES = Object.freeze([
    "package_revision_changed",
    "score_model_changed",
    "score_changed",
    "recommendation_changed",
    "owner_context_changed",
    "evidence_changed",
    "scenario_changed",
    "relationship_changed",
    "case_metrics_changed",
    "legacy_record_unverified"
  ]);
  const ORPHANED_REASON_CODE = "case_no_longer_present";
  const MISSING_EVIDENCE_OPTIONS = Object.freeze([
    "consumption_history",
    "demand_forecast",
    "purchase_order_details",
    "movement_history",
    "safety_stock",
    "moq",
    "owner_reference",
    "material_master_exact_match",
    "quality_details"
  ]);
  const REQUIRED_PACKAGE_OPTIONS = Object.freeze([
    "consumption_history",
    "demand_forecast",
    "purchase_orders",
    "movement_history",
    "planning_parameters",
    "quality"
  ]);
  const REQUIRED_SAP_FIELD_OPTIONS = Object.freeze([
    "material_id",
    "plant",
    "mrp_controller",
    "planner",
    "safety_stock",
    "minimum_order_quantity",
    "open_purchase_order_number",
    "purchase_order_item",
    "last_consumption_date",
    "consumption_quantity_12m",
    "forecast_quantity",
    "quality_block_reason"
  ]);

  function cloneData(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function stableValue(value) {
    if (value === undefined || value === null) return null;
    if (Array.isArray(value)) return value.map(stableValue);
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "number") return Number.isFinite(value) ? Number(value) : null;
    if (typeof value === "boolean") return value;
    if (typeof value !== "object") return String(value);
    return Object.fromEntries(Object.keys(value)
      .sort()
      .map(key => [key, stableValue(value[key])]));
  }

  function stableStringify(value) {
    return JSON.stringify(stableValue(value));
  }

  function stableHash(value) {
    const text = stableStringify(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  }

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function stringList(values = []) {
    return [...new Set((Array.isArray(values) ? values : [values])
      .map(value => String(value ?? "").trim())
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }

  function uniqueList(values = [], allowed = null) {
    const allowedSet = allowed ? new Set(allowed) : null;
    return stringList(values).filter(value => !allowedSet || allowedSet.has(value));
  }

  function enumValue(value, allowed, fallback) {
    const normalized = String(value ?? "").trim();
    return allowed.includes(normalized) ? normalized : fallback;
  }

  function isPlainObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    if (Object.prototype.toString.call(value) !== "[object Object]") return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype
      || prototype === null
      || prototype?.constructor?.name === "Object";
  }

  function strictNonEmptyString(value, field) {
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Invalid Pilot Review input: ${field} must be a non-empty string.`);
    }
    return value.trim();
  }

  function strictPositiveInteger(value, field) {
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
      throw new Error(`Invalid Pilot Review input: ${field} must be a positive integer number.`);
    }
    return value;
  }

  function strictFiniteNumber(value, field) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Invalid Pilot Review input: ${field} must be a finite number.`);
    }
    return value;
  }

  function validateNewPilotReviewInput(input = {}) {
    if (!isPlainObject(input)) {
      throw new Error("Invalid Pilot Review input: input must be a plain object.");
    }
    const identity = {
      datasetId: strictNonEmptyString(input.datasetId, "datasetId"),
      caseId: strictNonEmptyString(input.caseId, "caseId"),
      inventoryRowKey: strictNonEmptyString(input.inventoryRowKey, "inventoryRowKey"),
      packageId: strictNonEmptyString(input.packageId, "packageId"),
      packageRevision: strictPositiveInteger(input.packageRevision, "packageRevision"),
      caseFingerprint: strictNonEmptyString(input.caseFingerprint, "caseFingerprint"),
      fingerprintVersion: strictNonEmptyString(input.fingerprintVersion, "fingerprintVersion"),
      caseFingerprintPayload: input.caseFingerprintPayload,
      opportunityScoreModelVersion: strictNonEmptyString(input.opportunityScoreModelVersion, "opportunityScoreModelVersion"),
      opportunityScore: strictFiniteNumber(input.opportunityScore, "opportunityScore")
    };
    if (!isPlainObject(identity.caseFingerprintPayload)) {
      throw new Error("Invalid Pilot Review input: caseFingerprintPayload must be a plain object.");
    }
    if (identity.caseFingerprint === LEGACY_FINGERPRINT || identity.fingerprintVersion === "legacy") {
      throw new Error("Invalid Pilot Review input: legacy fingerprints are not valid for new reviews.");
    }
    return identity;
  }

  function reviewKey(input = {}) {
    const datasetId = String(input.datasetId || "");
    const caseKey = String(input.caseId || input.inventoryRowKey || "");
    const fingerprint = String(input.caseFingerprint || "");
    return `${datasetId}::${caseKey}::${fingerprint}`;
  }

  function safeSpreadsheetText(value) {
    const text = String(value ?? "");
    return /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  }

  function increment(map, values = []) {
    values.forEach(value => {
      if (!value) return;
      map.set(value, (map.get(value) || 0) + 1);
    });
  }

  function topCounts(map) {
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([key, count]) => ({ key, count }));
  }

  function normalizedPackageIdentity(input = {}) {
    return {
      datasetId: String(input.datasetId || ""),
      packageId: String(input.packageId || input.inventoryPackageId || ""),
      packageRevision: String(input.packageRevision ?? input.inventoryPackageRevision ?? "")
    };
  }

  function evidenceSignature(caseRecord = {}) {
    return (Array.isArray(caseRecord.evidenceRecords) ? caseRecord.evidenceRecords : [])
      .map(record => ({
        evidenceKey: String(record.evidenceKey || ""),
        evidenceType: String(record.evidenceType || ""),
        rawNormalizedValue: record.value ?? "",
        sourceField: String(record.sourceField || ""),
        sourcePackageId: String(record.sourcePackageId || ""),
        sourcePackageRevision: String(record.sourcePackageRevision ?? ""),
        limitationCodes: stringList(record.limitationCodes || [])
      }))
      .sort((a, b) => a.evidenceKey.localeCompare(b.evidenceKey));
  }

  function scenarioSignature(caseRecord = {}) {
    return (Array.isArray(caseRecord.scenarios) ? caseRecord.scenarios : [])
      .map(scenario => ({
        scenarioType: String(scenario.scenarioType || scenario.scenario_id || ""),
        availability: String(scenario.availability || (scenario.available ? "available" : "unavailable")),
        baselineFacts: stableValue(scenario.observedInputs || {}),
        calculatedOutputs: stableValue(scenario.calculatedOutputs || {
          estimated_impact_value: scenario.estimated_impact_value ?? 0
        }),
        missingEvidence: stringList(scenario.missingEvidence || []),
        requiredPackages: stringList(scenario.requiredPackages || []),
        limitationCodes: stringList(scenario.limitations || []),
        modelVersion: String(scenario.modelVersion || scenario.model_version || "")
      }))
      .sort((a, b) => a.scenarioType.localeCompare(b.scenarioType));
  }

  function limitationCodes(caseRecord = {}) {
    return stringList([
      ...(caseRecord.limitations || []),
      ...evidenceSignature(caseRecord).flatMap(record => record.limitationCodes),
      ...scenarioSignature(caseRecord).flatMap(record => [
        ...record.missingEvidence.map(code => `missing_${code}`),
        ...record.limitationCodes.map(code => `limitation_${code}`)
      ])
    ]);
  }

  function ownerContextPayload(caseRecord = {}) {
    const ownerContext = caseRecord.ownerActionContext || {};
    return {
      ownerFunction: String(ownerContext.ownerFunction || caseRecord.owner_function || ""),
      ownerReference: String(ownerContext.ownerReference || caseRecord.owner_reference || ""),
      ownerSource: String(ownerContext.ownerSource || caseRecord.owner_source || ""),
      ownerAssignmentConfidence: String(ownerContext.ownerAssignmentConfidence || caseRecord.owner_assignment_confidence || "")
    };
  }

  function buildExcessPilotCaseFingerprint(input = {}) {
    const caseRecord = input.caseRecord || {};
    const packageIdentity = normalizedPackageIdentity({
      datasetId: input.datasetId || caseRecord.dataset_id || caseRecord.datasetId,
      packageId: input.packageIdentity?.packageId || caseRecord.inventory_package_id,
      packageRevision: input.packageIdentity?.packageRevision ?? caseRecord.inventory_package_revision
    });
    const scoreModelVersion = String(input.scoreModelVersion || caseRecord.opportunity_score_model_version || "");
    const payload = {
      fingerprintVersion: FINGERPRINT_VERSION,
      datasetId: packageIdentity.datasetId,
      caseId: String(caseRecord.case_id || caseRecord.caseId || ""),
      inventoryRowKey: String(caseRecord.inventory_row_key || caseRecord.inventoryRowKey || ""),
      packageId: packageIdentity.packageId,
      packageRevision: packageIdentity.packageRevision,
      opportunityScoreModelVersion: scoreModelVersion,
      opportunityScore: number(caseRecord.excess_opportunity_score ?? caseRecord.opportunity_score),
      opportunityScoreComponents: stableValue(caseRecord.opportunity_score_components || {}),
      grossExcessValue: number(caseRecord.gross_excess_value),
      netAddressableExcessValue: number(caseRecord.net_addressable_excess_value),
      excessOverlapValue: number(caseRecord.excess_overlap_value),
      recommendedAction: String(caseRecord.recommended_action || caseRecord.ownerActionContext?.recommendation || ""),
      nextStep: String(caseRecord.next_step || caseRecord.ownerActionContext?.nextStep || ""),
      priority: String(caseRecord.priority || ""),
      actionConfidence: String(caseRecord.confidence || ""),
      ownerContext: ownerContextPayload(caseRecord),
      relationshipStatus: String(caseRecord.relationship_status || ""),
      relationshipMatchType: String(caseRecord.relationship_match_type || ""),
      enrichmentConflictCount: number(caseRecord.enrichment_conflict_count ?? caseRecord.__obsoliq_enrichment?.conflictCount),
      dataQualityLimitationCodes: limitationCodes(caseRecord),
      evidenceSignature: evidenceSignature(caseRecord),
      scenarioSignature: scenarioSignature(caseRecord)
    };
    return {
      fingerprint: `${FINGERPRINT_VERSION}:${stableHash(payload)}`,
      payload,
      fingerprintVersion: FINGERPRINT_VERSION
    };
  }

  function compareStable(a, b) {
    return stableStringify(a) === stableStringify(b);
  }

  function staleReasons(review = {}, currentFingerprint = {}, packageIdentity = {}, scoreModelVersion = "") {
    const savedPayload = review.caseFingerprintPayload || {};
    const currentPayload = currentFingerprint.payload || {};
    const reasons = [];
    if (String(review.packageRevision ?? savedPayload.packageRevision ?? "") !== String(packageIdentity.packageRevision ?? currentPayload.packageRevision ?? "")) {
      reasons.push("package_revision_changed");
    }
    if (String(review.opportunityScoreModelVersion || savedPayload.opportunityScoreModelVersion || "") !== String(scoreModelVersion || currentPayload.opportunityScoreModelVersion || "")) {
      reasons.push("score_model_changed");
    }
    if (
      number(review.opportunityScore ?? savedPayload.opportunityScore) !== number(currentPayload.opportunityScore)
      || !compareStable(savedPayload.opportunityScoreComponents || {}, currentPayload.opportunityScoreComponents || {})
    ) {
      reasons.push("score_changed");
    }
    if (
      String(savedPayload.recommendedAction || review.recommendedAction || "") !== String(currentPayload.recommendedAction || "")
      || String(savedPayload.nextStep || review.nextStep || "") !== String(currentPayload.nextStep || "")
      || String(savedPayload.priority || review.priority || "") !== String(currentPayload.priority || "")
      || String(savedPayload.actionConfidence || review.actionConfidence || "") !== String(currentPayload.actionConfidence || "")
    ) {
      reasons.push("recommendation_changed");
    }
    if (!compareStable(savedPayload.ownerContext || {}, currentPayload.ownerContext || {})) {
      reasons.push("owner_context_changed");
    }
    if (!compareStable(savedPayload.evidenceSignature || [], currentPayload.evidenceSignature || [])) {
      reasons.push("evidence_changed");
    }
    if (!compareStable(savedPayload.scenarioSignature || [], currentPayload.scenarioSignature || [])) {
      reasons.push("scenario_changed");
    }
    if (
      String(savedPayload.relationshipStatus || "") !== String(currentPayload.relationshipStatus || "")
      || String(savedPayload.relationshipMatchType || "") !== String(currentPayload.relationshipMatchType || "")
    ) {
      reasons.push("relationship_changed");
    }
    if (
      number(savedPayload.grossExcessValue) !== number(currentPayload.grossExcessValue)
      || number(savedPayload.netAddressableExcessValue) !== number(currentPayload.netAddressableExcessValue)
      || number(savedPayload.excessOverlapValue) !== number(currentPayload.excessOverlapValue)
    ) {
      reasons.push("case_metrics_changed");
    }
    return uniqueList(reasons, STALE_REASON_CODES);
  }

  function createExcessPilotReviewService(options = {}) {
    const clock = typeof options.clock === "function" ? options.clock : () => new Date().toISOString();
    const reviewsByKey = new Map();
    let reviewSequence = 0;

    function nextReviewId() {
      reviewSequence += 1;
      return `PILOT-REVIEW-${String(reviewSequence).padStart(6, "0")}`;
    }

    function reviewIdSuffix(reviewId) {
      const match = String(reviewId || "").match(/PILOT-REVIEW-(\d+)$/);
      return match ? Number(match[1]) : 0;
    }

    function syncReviewSequenceFromRecords(records = [], storedSequence = 0) {
      const maxExistingSuffix = records.reduce((maximum, review) => Math.max(maximum, reviewIdSuffix(review.reviewId)), 0);
      reviewSequence = Math.max(reviewSequence, Number.isInteger(storedSequence) && storedSequence > 0 ? storedSequence : 0, maxExistingSuffix);
      return reviewSequence;
    }

    function restorePackageRevision(value) {
      if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
      if (typeof value === "string" && /^\d+$/.test(value.trim()) && Number(value) > 0) return Number(value);
      return null;
    }

    function normalizeRestoredReview(review = {}) {
      if (!review?.datasetId || (!review.caseId && !review.inventoryRowKey)) return null;
      const hasCurrentFingerprint = Boolean(String(review.caseFingerprint || "").trim())
        && String(review.caseFingerprint || "") !== LEGACY_FINGERPRINT
        && String(review.fingerprintVersion || "") !== "legacy";
      const legacy = !hasCurrentFingerprint;
      const packageRevision = restorePackageRevision(review.packageRevision);
      return {
        ...review,
        reviewId: String(review.reviewId || ""),
        datasetId: String(review.datasetId || ""),
        packageId: String(review.packageId || ""),
        packageRevision,
        caseId: String(review.caseId || ""),
        inventoryRowKey: String(review.inventoryRowKey || ""),
        caseFingerprint: hasCurrentFingerprint ? String(review.caseFingerprint || "") : LEGACY_FINGERPRINT,
        fingerprintVersion: hasCurrentFingerprint ? String(review.fingerprintVersion || FINGERPRINT_VERSION) : "legacy",
        caseFingerprintPayload: isPlainObject(review.caseFingerprintPayload) ? cloneData(review.caseFingerprintPayload) : {},
        reviewLifecycleStatus: legacy ? "stale" : LIFECYCLE_STATES.includes(review.reviewLifecycleStatus) ? review.reviewLifecycleStatus : "current",
        reviewLifecycleReasonCodes: legacy
          ? uniqueList([...(review.reviewLifecycleReasonCodes || []), "legacy_record_unverified"])
          : uniqueList(review.reviewLifecycleReasonCodes || []),
        opportunityScore: typeof review.opportunityScore === "number" && Number.isFinite(review.opportunityScore) ? review.opportunityScore : 0,
        opportunityScoreModelVersion: String(review.opportunityScoreModelVersion || "")
      };
    }

    function recordReview(input = {}) {
      const identity = validateNewPilotReviewInput(input);
      const key = reviewKey(identity);
      const existing = reviewsByKey.get(key) || {};
      const timestamp = clock();
      const hasInput = field => Object.prototype.hasOwnProperty.call(input, field);
      const review = {
        reviewId: existing.reviewId || nextReviewId(),
        datasetId: identity.datasetId,
        packageId: identity.packageId,
        packageRevision: identity.packageRevision,
        caseId: identity.caseId,
        inventoryRowKey: identity.inventoryRowKey,
        caseFingerprint: identity.caseFingerprint,
        fingerprintVersion: identity.fingerprintVersion,
        caseFingerprintPayload: cloneData(identity.caseFingerprintPayload),
        reviewLifecycleStatus: "current",
        reviewLifecycleReasonCodes: [],
        opportunityScore: identity.opportunityScore,
        opportunityScoreModelVersion: identity.opportunityScoreModelVersion,
        reviewDisposition: hasInput("reviewDisposition")
          ? enumValue(input.reviewDisposition, REVIEW_DISPOSITIONS, "not_reviewed")
          : existing.reviewDisposition || "not_reviewed",
        scoreAssessment: hasInput("scoreAssessment")
          ? enumValue(input.scoreAssessment, SCORE_ASSESSMENTS, "not_assessed")
          : existing.scoreAssessment || "not_assessed",
        recommendationAssessment: hasInput("recommendationAssessment")
          ? enumValue(input.recommendationAssessment, RECOMMENDATION_ASSESSMENTS, "not_assessed")
          : existing.recommendationAssessment || "not_assessed",
        scenarioAssessment: hasInput("scenarioAssessment")
          ? enumValue(input.scenarioAssessment, SCENARIO_ASSESSMENTS, "not_assessed")
          : existing.scenarioAssessment || "not_assessed",
        missingEvidenceCodes: hasInput("missingEvidenceCodes")
          ? uniqueList(input.missingEvidenceCodes, MISSING_EVIDENCE_OPTIONS)
          : [...(existing.missingEvidenceCodes || [])],
        requiredDataPackages: hasInput("requiredDataPackages")
          ? uniqueList(input.requiredDataPackages, REQUIRED_PACKAGE_OPTIONS)
          : [...(existing.requiredDataPackages || [])],
        requiredSapFields: hasInput("requiredSapFields")
          ? uniqueList(input.requiredSapFields, REQUIRED_SAP_FIELD_OPTIONS)
          : [...(existing.requiredSapFields || [])],
        notes: hasInput("notes") ? String(input.notes ?? "") : String(existing.notes || ""),
        createdAt: existing.createdAt || timestamp,
        updatedAt: timestamp
      };
      reviewsByKey.set(key, review);
      return cloneData(review);
    }

    function getReview(input = {}) {
      const direct = reviewsByKey.get(reviewKey(input));
      if (direct || input.caseFingerprint) return cloneData(direct || null);
      const datasetId = String(input.datasetId || "");
      const caseId = String(input.caseId || "");
      const inventoryRowKey = String(input.inventoryRowKey || "");
      const fallback = [...reviewsByKey.values()]
        .filter(review => (!datasetId || review.datasetId === datasetId)
          && (!caseId || review.caseId === caseId)
          && (!inventoryRowKey || review.inventoryRowKey === inventoryRowKey))
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0];
      return cloneData(fallback || null);
    }

    function listReviews(input = {}) {
      const datasetId = String(input.datasetId || "");
      return [...reviewsByKey.values()]
        .filter(review => !datasetId || review.datasetId === datasetId)
        .map(cloneData);
    }

    function currentFingerprintByCase(input = {}) {
      const packageIdentity = normalizedPackageIdentity(input);
      const scoreModelVersion = String(input.scoreModelVersion || "");
      return new Map((Array.isArray(input.currentCases) ? input.currentCases : [])
        .map(caseRecord => {
          const fingerprint = buildExcessPilotCaseFingerprint({
            caseRecord,
            packageIdentity: {
              packageId: packageIdentity.packageId || caseRecord.inventory_package_id || "",
              packageRevision: packageIdentity.packageRevision || caseRecord.inventory_package_revision || ""
            },
            datasetId: packageIdentity.datasetId,
            scoreModelVersion: scoreModelVersion || caseRecord.opportunity_score_model_version || ""
          });
          return [String(caseRecord.case_id || caseRecord.caseId || ""), { caseRecord, fingerprint }];
        })
        .filter(([caseId]) => caseId));
    }

    function withLifecycle(review, status, reasonCodes = []) {
      return {
        ...review,
        reviewLifecycleStatus: status,
        reviewLifecycleReasonCodes: uniqueList(reasonCodes)
      };
    }

    function reconcileReviews(input = {}) {
      const datasetId = String(input.datasetId || "");
      const packageIdentity = normalizedPackageIdentity(input);
      const scoreModelVersion = String(input.scoreModelVersion || "");
      const casesById = currentFingerprintByCase({
        ...input,
        datasetId: packageIdentity.datasetId || datasetId,
        packageId: packageIdentity.packageId,
        packageRevision: packageIdentity.packageRevision,
        scoreModelVersion
      });
      const currentReviews = [];
      const staleReviews = [];
      const orphanedReviews = [];
      const statusByReviewId = {};
      const statusReasonCodesByReviewId = {};

      listReviews({ datasetId }).forEach(review => {
        const current = casesById.get(String(review.caseId || ""));
        let nextReview;
        if (!current) {
          nextReview = withLifecycle(review, "orphaned", [ORPHANED_REASON_CODE]);
          orphanedReviews.push(nextReview);
        } else if (
          String(review.caseFingerprint || "") === String(current.fingerprint.fingerprint || "")
          && String(review.packageRevision ?? "") === String(packageIdentity.packageRevision ?? current.fingerprint.payload.packageRevision ?? "")
          && String(review.opportunityScoreModelVersion || current.fingerprint.payload.opportunityScoreModelVersion || "") === String(scoreModelVersion || current.fingerprint.payload.opportunityScoreModelVersion || "")
        ) {
          nextReview = withLifecycle(review, "current", []);
          currentReviews.push(nextReview);
        } else {
          const reasons = staleReasons(review, current.fingerprint, packageIdentity, scoreModelVersion);
          nextReview = withLifecycle(review, "stale", reasons.length ? reasons : ["evidence_changed"]);
          staleReviews.push(nextReview);
        }
        statusByReviewId[nextReview.reviewId] = nextReview.reviewLifecycleStatus;
        statusReasonCodesByReviewId[nextReview.reviewId] = [...nextReview.reviewLifecycleReasonCodes];
      });

      return {
        serviceVersion: SERVICE_VERSION,
        datasetId,
        currentReviews,
        staleReviews,
        orphanedReviews,
        currentCount: currentReviews.length,
        staleCount: staleReviews.length,
        orphanedCount: orphanedReviews.length,
        statusByReviewId,
        statusReasonCodesByReviewId
      };
    }

    function scopedReviews(input = {}) {
      const hasCases = Array.isArray(input.currentCases);
      const scope = input.scope || (hasCases ? "current" : "all");
      if (!hasCases) return { reviews: listReviews(input), lifecycle: null, scope };
      const lifecycle = reconcileReviews(input);
      if (scope === "all") {
        return {
          reviews: [...lifecycle.currentReviews, ...lifecycle.staleReviews, ...lifecycle.orphanedReviews],
          lifecycle,
          scope
        };
      }
      return { reviews: lifecycle.currentReviews, lifecycle, scope: "current" };
    }

    function buildSummary(input = {}) {
      const scoped = scopedReviews(input);
      const reviews = scoped.reviews;
      const dispositions = Object.fromEntries(REVIEW_DISPOSITIONS.map(key => [key, 0]));
      const scoreAssessments = Object.fromEntries(SCORE_ASSESSMENTS.map(key => [key, 0]));
      const recommendationAssessments = Object.fromEntries(RECOMMENDATION_ASSESSMENTS.map(key => [key, 0]));
      const scenarioAssessments = Object.fromEntries(SCENARIO_ASSESSMENTS.map(key => [key, 0]));
      const missingEvidence = new Map();
      const packages = new Map();
      const sapFields = new Map();
      reviews.forEach(review => {
        dispositions[review.reviewDisposition] = (dispositions[review.reviewDisposition] || 0) + 1;
        scoreAssessments[review.scoreAssessment] = (scoreAssessments[review.scoreAssessment] || 0) + 1;
        recommendationAssessments[review.recommendationAssessment] = (recommendationAssessments[review.recommendationAssessment] || 0) + 1;
        scenarioAssessments[review.scenarioAssessment] = (scenarioAssessments[review.scenarioAssessment] || 0) + 1;
        increment(missingEvidence, review.missingEvidenceCodes);
        increment(packages, review.requiredDataPackages);
        increment(sapFields, review.requiredSapFields);
      });
      return {
        serviceVersion: SERVICE_VERSION,
        datasetId: String(input.datasetId || ""),
        scope: scoped.scope,
        reviewedCaseCount: reviews.length,
        currentCount: scoped.lifecycle?.currentCount ?? reviews.length,
        staleCount: scoped.lifecycle?.staleCount ?? 0,
        orphanedCount: scoped.lifecycle?.orphanedCount ?? 0,
        dispositions,
        scoreAssessments,
        recommendationAssessments,
        scenarioAssessments,
        mostFrequentMissingEvidence: topCounts(missingEvidence),
        mostFrequentRequiredDataPackages: topCounts(packages),
        mostFrequentRequiredSapFields: topCounts(sapFields)
      };
    }

    function exportRows(input = {}) {
      const labels = input.labels || {};
      const columns = [
        ["reviewId", labels.reviewId || "Review ID"],
        ["datasetId", labels.datasetId || "Dataset ID"],
        ["packageId", labels.packageId || "Package ID"],
        ["packageRevision", labels.packageRevision || "Package Revision"],
        ["caseId", labels.caseId || "Case ID"],
        ["inventoryRowKey", labels.inventoryRowKey || "Inventory Row Key"],
        ["caseFingerprint", labels.caseFingerprint || "Case Fingerprint"],
        ["fingerprintVersion", labels.fingerprintVersion || "Fingerprint Version"],
        ["reviewLifecycleStatus", labels.reviewLifecycleStatus || "Lifecycle Status"],
        ["reviewLifecycleReasonCodes", labels.reviewLifecycleReasonCodes || "Lifecycle Reasons"],
        ["opportunityScore", labels.opportunityScore || "Opportunity Score"],
        ["opportunityScoreModelVersion", labels.opportunityScoreModelVersion || "Score Model Version"],
        ["reviewDisposition", labels.reviewDisposition || "Review Disposition"],
        ["scoreAssessment", labels.scoreAssessment || "Score Assessment"],
        ["recommendationAssessment", labels.recommendationAssessment || "Recommendation Assessment"],
        ["scenarioAssessment", labels.scenarioAssessment || "Scenario Assessment"],
        ["missingEvidenceCodes", labels.missingEvidenceCodes || "Missing Evidence"],
        ["requiredDataPackages", labels.requiredDataPackages || "Required Data Packages"],
        ["requiredSapFields", labels.requiredSapFields || "Required SAP Fields"],
        ["notes", labels.notes || "Notes"],
        ["createdAt", labels.createdAt || "Created At"],
        ["updatedAt", labels.updatedAt || "Updated At"]
      ];
      const reviews = scopedReviews(input).reviews;
      return [
        columns.map(([, label]) => label),
        ...reviews.map(review => columns.map(([key]) => {
          const value = Array.isArray(review[key]) ? review[key].join(", ") : review[key];
          return safeSpreadsheetText(value);
        }))
      ];
    }

    function resetDatasetReviews(input = {}) {
      const datasetId = String(input.datasetId || "");
      let removed = 0;
      [...reviewsByKey.keys()].forEach(key => {
        const review = reviewsByKey.get(key);
        if (!datasetId || review.datasetId === datasetId) {
          reviewsByKey.delete(key);
          removed += 1;
        }
      });
      return { removed };
    }

    function snapshot() {
      return { serviceVersion: SERVICE_VERSION, snapshotVersion: SERVICE_VERSION, reviewSequence, reviews: listReviews() };
    }

    function restore(snapshotValue = {}, options = {}) {
      reviewsByKey.clear();
      const restored = (Array.isArray(snapshotValue.reviews) ? snapshotValue.reviews : [])
        .map(normalizeRestoredReview)
        .filter(Boolean);
      reviewSequence = 0;
      syncReviewSequenceFromRecords(restored, snapshotValue.reviewSequence);
      const usedReviewIds = new Set();
      restored.forEach(review => {
        const normalized = { ...review };
        if (!normalized.reviewId || usedReviewIds.has(normalized.reviewId)) {
          normalized.reviewId = nextReviewId();
        }
        usedReviewIds.add(normalized.reviewId);
        reviewsByKey.set(reviewKey(normalized), cloneData(normalized));
      });
      return { restored: reviewsByKey.size, reviewSequence, legacyMigrationAllowed: options.allowLegacyMigration !== false };
    }

    return Object.freeze({
      recordReview,
      getReview,
      listReviews,
      reconcileReviews,
      buildSummary,
      exportRows,
      resetDatasetReviews,
      snapshot,
      restore,
      validateNewPilotReviewInput
    });
  }

  root.application.excessPilotReviewService = Object.freeze({
    version: SERVICE_VERSION,
    fingerprintVersion: FINGERPRINT_VERSION,
    lifecycleStates: LIFECYCLE_STATES,
    staleReasonCodes: STALE_REASON_CODES,
    orphanedReasonCode: ORPHANED_REASON_CODE,
    reviewDispositions: REVIEW_DISPOSITIONS,
    scoreAssessments: SCORE_ASSESSMENTS,
    recommendationAssessments: RECOMMENDATION_ASSESSMENTS,
    scenarioAssessments: SCENARIO_ASSESSMENTS,
    missingEvidenceOptions: MISSING_EVIDENCE_OPTIONS,
    requiredDataPackageOptions: REQUIRED_PACKAGE_OPTIONS,
    requiredSapFieldOptions: REQUIRED_SAP_FIELD_OPTIONS,
    buildExcessPilotCaseFingerprint,
    validateNewPilotReviewInput,
    createExcessPilotReviewService
  });
})(window);
