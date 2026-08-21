(function registerPackageRelationshipQualityEngine(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.data = root.data || {};

  const ENGINE_VERSION = "1";
  const THRESHOLD_VERSION = "mvp-1";

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function rate(part, total) {
    const denominator = number(total);
    return denominator > 0 ? number(part) / denominator : 0;
  }

  const DEFAULT_THRESHOLDS = Object.freeze({
    completeMatchRate: 0.95,
    completeConflictRowRate: 0.02,
    limitedMatchRate: 0.8,
    limitedAmbiguousRate: 0.05,
    limitedInvalidKeyRate: 0.05,
    limitedConflictRowRate: 0.1
  });

  function mergedThresholds(overrides = {}) {
    return { ...DEFAULT_THRESHOLDS, ...(overrides || {}) };
  }

  function relationshipQuality(input = {}) {
    const relationship = input.relationshipResult || {};
    const enrichment = input.enrichmentDiagnostics || {};
    const thresholds = mergedThresholds(input.thresholds);
    if (!relationship || relationship.status !== "executed") {
      return {
        status: "unavailable",
        labelKey: "relationshipQualityUnavailable",
        reasonKey: relationship?.reason || "material_master_missing",
        score: 0,
        metrics: {
          matchRate: null,
          conflictRate: null,
          ambiguousRate: null,
          invalidKeyRate: null
        },
        thresholdsVersion: THRESHOLD_VERSION,
        thresholdVersion: THRESHOLD_VERSION,
        thresholds,
        engineVersion: ENGINE_VERSION
      };
    }

    const eligible = number(relationship.eligibleInventoryRowCount);
    const matchRate = relationship.matchRate === null || relationship.matchRate === undefined
      ? rate(relationship.matchedInventoryRowCount, eligible)
      : number(relationship.matchRate);
    const conflictCount = number(relationship.conflictCount) + number(enrichment.conflictCount);
    const conflictRate = rate(conflictCount, eligible);
    const ambiguousRate = rate(relationship.ambiguousCount, eligible);
    const invalidKeyRate = rate(relationship.invalidKeyCount, eligible);

    let status = "critical";
    let labelKey = "relationshipQualityCritical";
    if (eligible <= 0) {
      status = "critical";
      labelKey = "relationshipQualityCritical";
    } else if (
      matchRate >= thresholds.completeMatchRate
      && number(relationship.ambiguousCount) === 0
      && number(relationship.invalidKeyCount) === 0
      && conflictRate <= thresholds.completeConflictRowRate
    ) {
      status = "complete";
      labelKey = "relationshipQualityComplete";
    } else if (
      matchRate >= thresholds.limitedMatchRate
      && ambiguousRate <= thresholds.limitedAmbiguousRate
      && invalidKeyRate <= thresholds.limitedInvalidKeyRate
      && conflictRate <= thresholds.limitedConflictRowRate
    ) {
      status = "limited";
      labelKey = "relationshipQualityLimited";
    }

    const score = Math.max(0, Math.min(100, Math.round(
      matchRate * 100
      - conflictRate * 100
      - ambiguousRate * 80
      - invalidKeyRate * 80
    )));

    return {
      status,
      labelKey,
      score,
      metrics: {
        matchRate,
        conflictRate,
        ambiguousRate,
        invalidKeyRate,
        eligibleInventoryRowCount: eligible,
        matchedInventoryRowCount: number(relationship.matchedInventoryRowCount),
        conflictCount,
        ambiguousCount: number(relationship.ambiguousCount),
        invalidKeyCount: number(relationship.invalidKeyCount)
      },
      thresholdsVersion: THRESHOLD_VERSION,
      thresholdVersion: THRESHOLD_VERSION,
      thresholds,
      engineVersion: ENGINE_VERSION
    };
  }

  function evaluateInventoryMaterialMasterQuality(input = {}) {
    return relationshipQuality(input);
  }

  root.data.packageRelationshipQualityEngine = Object.freeze({
    version: ENGINE_VERSION,
    thresholdVersion: THRESHOLD_VERSION,
    thresholds: DEFAULT_THRESHOLDS,
    evaluateInventoryMaterialMasterQuality,
    relationshipQuality
  });
})(window);
