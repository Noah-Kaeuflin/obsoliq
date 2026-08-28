(function registerOpportunityScoreEngine(global) {
  const root = global.ObsoliQ = global.ObsoliQ || {};
  root.excess = root.excess || {};

  const ENGINE_VERSION = "2";
  const SCORE_CAP = 100;
  const COMPONENT_MAXIMUMS = Object.freeze({
    financial_impact: 35,
    urgency: 20,
    actionability: 20,
    evidence: 15,
    data_confidence: 12
  });

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function financialImpactPoints(value, maxValue) {
    if (!maxValue) return 0;
    return Math.round(Math.sqrt(Math.max(0, value) / maxValue) * 35);
  }

  function urgencyPoints(item = {}) {
    if (item.priority === "High") return 20;
    if (item.priority === "Medium") return 13;
    if (number(item.net_addressable_excess_value) >= 100000) return 16;
    if (number(item.net_addressable_excess_value) >= 25000) return 10;
    return 6;
  }

  function actionabilityPoints(item = {}) {
    let points = 0;
    if (item.owner_function) points += 7;
    if (item.owner_reference) points += 7;
    if (["Open", "In Review", "Assigned"].includes(item.status)) points += 4;
    if (item.owner_assignment_confidence === "High") points += 2;
    return points;
  }

  function evidencePoints(item = {}) {
    let points = 0;
    if (item.relationship_match_type === "exact_material_plant") points += 8;
    else if (item.relationship_status === "matched") points += 5;
    if (item.material_master_package_id) points += 4;
    if (item.inventory_package_id) points += 3;
    return points;
  }

  function confidencePoints(item = {}) {
    let points = item.confidence === "High" ? 12 : item.confidence === "Medium" ? 8 : 4;
    if (item.owner_assignment_confidence === "Low") points -= 2;
    if ((item.limitations || []).includes("material_master_match_missing")) points -= 3;
    return Math.max(0, points);
  }

  function scoreMetadata(components = {}) {
    const uncappedScore = Math.max(0, Math.round(Object.values(components)
      .reduce((total, value) => total + number(value), 0)));
    const finalScore = Math.min(SCORE_CAP, uncappedScore);
    const maxComponentTotal = Object.values(COMPONENT_MAXIMUMS)
      .reduce((total, value) => total + number(value), 0);
    return {
      uncappedScore,
      finalScore,
      scoreCap: SCORE_CAP,
      maxComponentTotal,
      wasCapped: uncappedScore > SCORE_CAP,
      cappedPoints: Math.max(0, uncappedScore - finalScore)
    };
  }

  function scoreExcessCases(input = {}) {
    const cases = Array.isArray(input.cases) ? input.cases : [];
    const maxValue = Math.max(...cases.map(item => number(item.net_addressable_excess_value, number(item.gross_excess_value))), 0);
    return cases.map(item => {
      const components = {
        financial_impact: financialImpactPoints(number(item.net_addressable_excess_value, number(item.gross_excess_value)), maxValue),
        urgency: urgencyPoints(item),
        actionability: actionabilityPoints(item),
        evidence: evidencePoints(item),
        data_confidence: confidencePoints(item)
      };
      const metadata = scoreMetadata(components);
      const score = metadata.finalScore;
      const drivers = [];
      if (components.financial_impact >= 25) drivers.push("high_financial_impact");
      if (item.priority === "High") drivers.push("high_priority_case");
      if (item.owner_reference) drivers.push("owner_reference_available");
      if (item.relationship_match_type === "exact_material_plant") drivers.push("exact_material_plant_match");
      if (number(item.excess_overlap_value) > 0) drivers.push("overlap_deducted_from_gross_excess");

      return {
        ...item,
        excess_opportunity_score: score,
        opportunity_score: score,
        opportunity_score_components: components,
        opportunity_score_metadata: metadata,
        opportunity_score_drivers: drivers,
        opportunity_score_model_version: ENGINE_VERSION
      };
    }).sort((a, b) => (
      number(b.excess_opportunity_score) - number(a.excess_opportunity_score)
      || number(b.net_addressable_excess_value) - number(a.net_addressable_excess_value)
      || String(a.material_id).localeCompare(String(b.material_id), undefined, { numeric: true })
    ));
  }

  function caseKey(item = {}) {
    return String(item.fixtureId || item.fixture_id || item.case_id || item.material_id || "");
  }

  function componentValue(item = {}, component) {
    return number((item.opportunity_score_components || {})[component]);
  }

  function evaluateConstraint(item, referenceByKey, constraint = {}) {
    const type = constraint.type || "";
    const reference = referenceByKey.get(String(constraint.fixtureId || constraint.referenceFixtureId || ""));
    if (type === "score_gte") return number(item.excess_opportunity_score) >= number(constraint.value);
    if (type === "score_lte") return number(item.excess_opportunity_score) <= number(constraint.value);
    if (type === "component_gte") return componentValue(item, constraint.component) >= number(constraint.value);
    if (type === "component_lte") return componentValue(item, constraint.component) <= number(constraint.value);
    if (type === "score_lt_reference") return reference ? number(item.excess_opportunity_score) < number(reference.excess_opportunity_score) : false;
    if (type === "score_gt_reference") return reference ? number(item.excess_opportunity_score) > number(reference.excess_opportunity_score) : false;
    if (type === "component_lt_reference") return reference ? componentValue(item, constraint.component) < componentValue(reference, constraint.component) : false;
    if (type === "component_gt_reference") return reference ? componentValue(item, constraint.component) > componentValue(reference, constraint.component) : false;
    if (type === "driver_present") return (item.opportunity_score_drivers || []).includes(constraint.key);
    if (type === "limitation_present") return (item.limitations || []).includes(constraint.key);
    if (type === "net_lt_gross") return number(item.net_addressable_excess_value) < number(item.gross_excess_value);
    if (type === "net_lte_gross") return number(item.net_addressable_excess_value) <= number(item.gross_excess_value);
    if (type === "rank_below_reference") {
      const rank = Number(item.__pilotRank);
      const referenceRank = Number(reference?.__pilotRank);
      return Number.isFinite(rank) && Number.isFinite(referenceRank) && rank > referenceRank;
    }
    return false;
  }

  function evaluateExcessPilotCalibration(input = {}) {
    const scored = (Array.isArray(input.scores) && input.scores.length ? input.scores : input.cases || [])
      .map((item, index) => ({ ...item, __pilotRank: index + 1 }));
    const referenceByKey = new Map(scored.map(item => [caseKey(item), item]).filter(([key]) => key));
    const expectations = Array.isArray(input.expectations) ? input.expectations : [];
    const failures = [];
    let passedConstraintCount = 0;
    expectations.forEach(expectation => {
      const item = referenceByKey.get(String(expectation.fixtureId || expectation.caseId || ""));
      const constraints = expectation.expectedScoreConstraints || expectation.constraints || [];
      if (!item) {
        failures.push({
          fixtureId: expectation.fixtureId || expectation.caseId || "",
          constraint: "case_present",
          message: "Expected pilot case was not present in scored cases."
        });
        return;
      }
      constraints.forEach(constraint => {
        if (evaluateConstraint(item, referenceByKey, constraint)) {
          passedConstraintCount += 1;
          return;
        }
        failures.push({
          fixtureId: expectation.fixtureId || expectation.caseId || "",
          constraint,
          actualScore: item.excess_opportunity_score,
          actualComponents: item.opportunity_score_components || {}
        });
      });
    });
    return {
      status: failures.length ? "failed" : "passed",
      evaluatedCaseCount: scored.length,
      passedConstraintCount,
      failedConstraintCount: failures.length,
      failures,
      rankingObservations: scored.slice(0, 20).map(item => ({
        fixtureId: item.fixtureId || item.fixture_id || "",
        caseId: item.case_id || "",
        materialId: item.material_id || "",
        score: item.excess_opportunity_score,
        netAddressableExcessValue: item.net_addressable_excess_value,
        grossExcessValue: item.gross_excess_value,
        components: item.opportunity_score_components || {}
      })),
      modelVersion: ENGINE_VERSION
    };
  }

  root.excess.opportunityScoreEngine = Object.freeze({
    version: ENGINE_VERSION,
    scoreCap: SCORE_CAP,
    componentMaximums: COMPONENT_MAXIMUMS,
    scoreMetadata,
    scoreExcessCases,
    evaluateExcessPilotCalibration
  });
})(window);
