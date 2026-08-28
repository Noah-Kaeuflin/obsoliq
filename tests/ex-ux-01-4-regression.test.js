(() => {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function mount(app, markup) {
    const node = app.document.createElement("div");
    node.innerHTML = markup;
    return node;
  }

  function projectedField(value, available = true, reason = "") {
    return { available, value: available ? value : null, reason };
  }

  function valueCore(overrides = {}) {
    const { fields: fieldOverrides = {}, ...narrativeOverrides } = overrides;
    return {
      valueNarrative: {
        validBasis: true,
        reasonKey: "grossNetOverlapReason",
        boundaryKeys: ["excessValueBoundaryExpected", "excessValueBoundaryApproved", "excessValueBoundaryRealized"],
        fields: {
          stockValue: projectedField(307000),
          grossExcessValue: projectedField(120000),
          overlapValue: projectedField(18000),
          netAddressableValue: projectedField(102000),
          remainingInventoryValue: projectedField(205000),
          ...fieldOverrides
        },
        ...narrativeOverrides
      }
    };
  }

  function historyEvidence(overrides = {}) {
    return {
      status: "available",
      state: "available",
      exact: true,
      limitations: [],
      unitContext: { state: "available", unit: "ST", source: "metric.unit", provenance: {} },
      metric: {
        history_metric_status: "available",
        last_consumption_date: "2026-02-15",
        net_consumption_quantity_3m: 3,
        net_consumption_quantity_12m: 14,
        average_monthly_consumption_12m: 1.2,
        consumption_trend: "declining",
        inventory_coverage_months: 14.2,
        history_completeness: 1,
        partial_current_period: true,
        provenance: { unitStatus: "single", historyUnit: "ST", inventoryUnit: "ST", partialCurrentPeriod: true }
      },
      monthlyBuckets: [],
      ...overrides
    };
  }

  test("EX-UX-01.4 renders Gross minus deductions equals Net while Stock and Remaining stay context", async assert => {
    const app = await helpers.loadApp();
    const rendered = mount(app, app.__obsoliqTestBridge.renderExcessValueNarrativeForTest(valueCore()));
    const bridge = rendered.querySelector(".excess-value-bridge");
    const roles = [...bridge.querySelectorAll("[data-bridge-role]")];

    assert.deepEqual(roles.map(row => row.dataset.bridgeRole), ["gross", "deduction", "net"], "The bridge sequence must be Gross, deduction, Net");
    assert.deepEqual(roles.map(row => Number(row.dataset.bridgeValue)), [120000, 18000, 102000], "The bridge must use the projected canonical values unchanged");
    assert.equal(bridge.querySelector("[data-value-context='stock']"), null, "Inventory Value must not become a Waterfall step");
    assert.equal(rendered.querySelector("[data-value-context='stock'] strong").getAttribute("title").includes("307"), true, "Inventory Value should remain readable as Case context");
    assert.equal(rendered.querySelector("[data-value-context='remaining'] strong").getAttribute("title").includes("205"), true, "Remaining Inventory should remain readable as Case context");
    assert.ok(rendered.textContent.includes("noch nicht genehmigt oder realisiert"), "The boundary must deny approved and realized value semantics");
    assert.equal(bridge.textContent.includes("Cash"), false, "Net addressable value must not be labelled as Cash");
  });

  test("EX-UX-01.4 preserves real zero and missing value semantics in the Value Bridge", async assert => {
    const app = await helpers.loadApp();
    const zero = mount(app, app.__obsoliqTestBridge.renderExcessValueNarrativeForTest(valueCore({
      fields: {
        grossExcessValue: projectedField(0),
        overlapValue: projectedField(0),
        netAddressableValue: projectedField(0)
      }
    })));
    const missing = mount(app, app.__obsoliqTestBridge.renderExcessValueNarrativeForTest(valueCore({
      validBasis: false,
      fields: {
        grossExcessValue: projectedField(null, false, "missing"),
        overlapValue: projectedField(null, false, "missing"),
        netAddressableValue: projectedField(null, false, "missing")
      }
    })));

    assert.equal(zero.querySelectorAll("[data-bridge-role].zero").length, 3, "A real zero should remain an explicit zero state");
    assert.deepEqual([...zero.querySelectorAll("[data-bridge-role]")].map(row => Number(row.dataset.bridgeValue)), [0, 0, 0], "Real zeros must not become missing values");
    assert.equal(missing.querySelector("[data-bridge-role='gross']").dataset.valueAvailable, "false", "Missing Gross must remain unavailable");
    assert.equal(missing.querySelector("[data-bridge-role='gross']").hasAttribute("data-bridge-value"), false, "Missing Gross must not receive a false numeric zero");
    assert.equal(missing.querySelectorAll(".excess-value-unavailable").length, 3, "Missing projected values need an honest visible fallback in either language");
  });

  test("EX-UX-01.4 Historical SVG uses only canonical chronological buckets, including negatives and zero", async assert => {
    const app = await helpers.loadApp();
    const months = [
      "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07",
      "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"
    ];
    const buckets = months.map((month, index) => ({ month, netQuantity: index === 4 ? -3 : index === 5 ? 0 : index % 5, unit: "ST" })).reverse();
    const rendered = mount(app, app.__obsoliqTestBridge.renderExcessHistoricalEvidenceForTest({ historicalEvidence: historyEvidence({ monthlyBuckets: buckets }) }));
    const figure = rendered.querySelector("figure[data-canonical-monthly-buckets='true']");

    assert.ok(figure, "A semantic figure should render for canonical monthly buckets");
    assert.equal(figure.dataset.bucketCount, "12", "The visual must show at most the last twelve real buckets");
    assert.equal(figure.dataset.chronologicalMonths, months.slice(-12).join(","), "Canonical buckets must be ordered chronologically before limiting");
    assert.equal(figure.dataset.negativeValues, "true", "Negative net consumption must remain visible");
    assert.equal(figure.dataset.zeroBaseline, "true", "The SVG must include a visible zero baseline");
    assert.ok(figure.querySelector(".excess-history-zero-line"), "A semantic baseline line should be present");
    assert.ok(figure.querySelector(".excess-history-point.negative") && figure.querySelector(".excess-history-point.zero"), "Negative and zero points need distinct structural states");
    assert.ok(figure.querySelector("svg[role='img'][aria-label]") && figure.querySelector("figcaption"), "The chart needs an accessible image label and textual caption");
    assert.equal(/forecast/i.test(figure.outerHTML), false, "Historical evidence must not introduce Forecast markup");
    assert.ok(rendered.textContent.includes("Historische Mengeneinheit: ST"), "The canonical Unit Context must remain visible");
    assert.ok(rendered.textContent.includes("Aktuelle Teilperiode enthalten"), "Existing partial-period provenance must remain visible");
  });

  test("EX-UX-01.4 Historical visual fails closed for no bucket, one bucket and conflicting units", async assert => {
    const app = await helpers.loadApp();
    const noBuckets = mount(app, app.__obsoliqTestBridge.renderExcessHistoricalEvidenceForTest({ historicalEvidence: historyEvidence({ monthlyBuckets: [] }) }));
    const oneBucket = mount(app, app.__obsoliqTestBridge.renderExcessHistoricalEvidenceForTest({ historicalEvidence: historyEvidence({ monthlyBuckets: [{ month: "2026-02", netQuantity: 0, unit: "ST" }] }) }));
    const conflict = mount(app, app.__obsoliqTestBridge.renderExcessHistoricalEvidenceForTest({ historicalEvidence: historyEvidence({
      status: "unavailable",
      state: "insufficient",
      unitContext: { state: "conflict", unit: "", source: "", provenance: {} },
      monthlyBuckets: []
    }) }));

    assert.equal(noBuckets.querySelector("svg"), null, "Aggregate metrics must not be reconstructed into monthly buckets");
    assert.ok(noBuckets.textContent.includes("Monatlicher Verlauf nicht verfügbar"), "No canonical bucket should show the existing empty state");
    assert.equal(oneBucket.querySelector("svg"), null, "One bucket is insufficient for a false trend line");
    assert.ok(oneBucket.textContent.includes("noch nicht genügend Monatswerte") && oneBucket.textContent.includes("0 ST"), "One bucket should remain readable without claiming a trend");
    assert.ok(conflict.textContent.includes("Einheit nicht eindeutig"), "Conflicting units need an explicit limitation");
    assert.equal(conflict.querySelector("figure"), null, "Conflicting units must not be combined into a chart");
  });

  test("EX-UX-01.4 Score bars use Engine maximum metadata and retain the original total score", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const maximums = bridge.getOpportunityScoreComponentMaximumsForTest();
    const item = {
      excess_opportunity_score: 76,
      opportunity_score_model_version: "1",
      opportunity_score_components: {
        financial_impact: 35,
        urgency: 10,
        actionability: 12,
        evidence: 7,
        data_confidence: 12
      }
    };
    const rendered = mount(app, bridge.renderExcessScoreComponentsForTest(item));
    const rows = [...rendered.querySelectorAll("[data-score-component]")];

    assert.deepEqual(maximums, { financial_impact: 35, urgency: 20, actionability: 20, evidence: 15, data_confidence: 12 }, "The renderer must consume the actual existing model maxima");
    assert.equal(Object.isFrozen(app.ObsoliQ.excess.opportunityScoreEngine.componentMaximums), true, "Score maximum metadata should be immutable");
    assert.equal(rendered.querySelector(".excess-score-list").dataset.scoreComponentMaximumSource, "opportunity-score-engine", "The maximum source must be explicit");
    assert.deepEqual(rows.map(row => Number(row.dataset.scoreMaximum)), [35, 20, 20, 15, 12], "Each row must expose its actual component maximum");
    assert.equal(rendered.querySelector("[data-score-component='urgency']").dataset.scoreRatio, "0.5000", "Bar ratio must be contribution divided by component maximum");
    assert.ok(rendered.querySelector("[data-score-component='urgency'] .excess-score-track i").getAttribute("style").includes("50.00%"), "Urgency 10/20 should fill exactly fifty percent");
    assert.ok(rendered.querySelector(".excess-score-total").textContent.includes("76 / 100"), "The existing total Opportunity Score must remain unchanged and visible");
  });

  test("EX-UX-01.4 Readiness Matrix projects existing evidence and open limits without duplicate Why Not Higher", async assert => {
    const app = await helpers.loadApp();
    const readiness = {
      version: "excess-decision-readiness-v1",
      status: "review",
      existingEvidence: ["case_identity", "gross_net_value_basis", "root_cause", "recommended_action", "next_step", "owner_assignment"],
      missingEvidence: ["historical_evidence", "owner_reference", "exact_relationship"],
      decisionLimits: ["limitation_relationship_not_exact_material_plant", "limitation_enrichment_conflict"],
      whyNotHigher: ["why_owner_reference_missing", "why_relationship_not_exact"],
      nextCheck: "historical_evidence"
    };
    const before = JSON.stringify(readiness);
    const rendered = mount(app, app.__obsoliqTestBridge.renderExcessDecisionReadinessForTest({ decisionReadiness: readiness }));
    const matrix = rendered.querySelector(".excess-readiness-card");
    const directColumns = [...matrix.querySelectorAll(":scope > .excess-readiness-grid > div")];

    assert.equal(matrix.dataset.readinessStatus, "review", "The existing Readiness status must pass through unchanged");
    assert.equal(matrix.dataset.readinessVersion, readiness.version, "The accepted Readiness policy version must remain visible");
    assert.equal(directColumns.every(column => column.querySelectorAll("li").length <= 4), true, "Each matrix column may show at most four primary points");
    assert.ok(matrix.querySelector("details.excess-readiness-more > summary"), "Additional evidence should remain accessible in a native disclosure");
    assert.equal(matrix.querySelectorAll("[data-readiness-source='whyNotHigher']").length, readiness.whyNotHigher.length, "Why Not Higher evidence should appear exactly once in the combined open column/disclosure");
    assert.equal([...directColumns].some(column => column.firstElementChild.textContent.trim() === "Warum nicht höher"), false, "Why Not Higher must not be repeated as a separate block");
    assert.equal(JSON.stringify(readiness), before, "Rendering must not mutate or recalculate the Readiness projection");
    assert.ok(matrix.querySelectorAll(".excess-readiness-marker[aria-hidden='true']").length, "CSS status symbols should accompany text without becoming standalone semantics");
  });

  test("EX-UX-01.4 keeps action options unchanged and localizes all four visuals", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const actionOptions = [
      { optionCode: "primary_recommendation", labelText: "Review demand", status: "review_required", isPrimary: true, evidence: [], missingEvidence: [], nextCheck: "Review demand", provenance: ["recommended_action"] },
      { optionCode: "internal_transfer", labelKey: "scenarioInternalTransfer", status: "not_checkable", isPrimary: false, evidence: [], missingEvidence: ["relationship_evidence"], nextCheck: "relationship_evidence", provenance: ["scenario_availability"] }
    ];
    const actions = mount(app, bridge.renderExcessActionOptionsForTest({ actionOptions }));
    assert.equal(actions.querySelectorAll(".excess-action-option").length, actionOptions.length, "Presentation must not generate additional Action Options");
    assert.ok(actions.querySelector("article.primary .excess-action-option-meta"), "The primary checkable recommendation must stay fully open");
    assert.ok(actions.querySelector("details.secondary") && !actions.querySelector("details.secondary").open, "Secondary options should remain compact native disclosures");

    bridge.updateLanguageForTest("en");
    const valueEn = mount(app, bridge.renderExcessValueNarrativeForTest(valueCore()));
    const historyEn = mount(app, bridge.renderExcessHistoricalEvidenceForTest({ historicalEvidence: historyEvidence({ monthlyBuckets: [{ month: "2026-01", netQuantity: 0, unit: "ST" }, { month: "2026-02", netQuantity: 2, unit: "ST" }] }) }));
    const scoreEn = mount(app, bridge.renderExcessScoreComponentsForTest({ excess_opportunity_score: 20, opportunity_score_components: { urgency: 10 } }));
    const readinessEn = mount(app, bridge.renderExcessDecisionReadinessForTest({ decisionReadiness: { status: "review", existingEvidence: ["case_identity"], missingEvidence: ["historical_evidence"], decisionLimits: [], whyNotHigher: [], nextCheck: "historical_evidence" } }));
    assert.ok(valueEn.textContent.includes("Gross-to-Net Value Bridge"), "Value Bridge needs an English title");
    assert.ok(historyEn.textContent.includes("Monthly net consumption"), "Historical visual needs an English title");
    assert.ok(scoreEn.textContent.includes("10 / 20"), "Score contribution and maximum must remain language-neutral numbers");
    assert.ok(readinessEn.textContent.includes("Available") && readinessEn.textContent.includes("Open / limited"), "Readiness matrix needs English column labels");
    bridge.updateLanguageForTest("de");
  });

  test("EX-UX-01.4 refreshes the presentation on Case switch and keeps partial Cases render-safe", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const firstDetail = app.document.querySelector(".excess-detail-panel");
    const firstCase = firstDetail.querySelector("[data-excess-decision-core]").dataset.excessDecisionCore;
    const firstNet = firstDetail.querySelector("[data-bridge-role='net']")?.dataset.bridgeValue;
    const secondRow = app.document.querySelectorAll(".excess-table tbody tr[data-excess-case-detail]")[1];
    secondRow.click();
    const nextDetail = app.document.querySelector(".excess-detail-panel");

    assert.notEqual(nextDetail.querySelector("[data-excess-decision-core]").dataset.excessDecisionCore, firstCase, "A Case switch must replace the complete decision presentation");
    assert.notEqual(nextDetail.querySelector("[data-bridge-role='net']")?.dataset.bridgeValue, firstNet, "The Value Bridge must refresh for the selected Case");
    assert.ok(nextDetail.querySelector(".excess-score-list[data-score-component-maximum-source='opportunity-score-engine']"), "Score bars must refresh from the selected scored Case");
    assert.ok(nextDetail.querySelector(".excess-readiness-card[data-readiness-version]"), "Readiness Matrix must remain bound to the selected projection");
    const partialCore = app.ObsoliQ.excess.decisionWorkspaceModel.projectDecisionCore({ case_id: "PARTIAL" }, { historyPackageLoaded: false });
    assert.ok(bridge.renderExcessValueNarrativeForTest(partialCore).includes("data-value-bridge"), "Partial value projections must remain render-safe");
    assert.ok(bridge.renderExcessDecisionReadinessForTest(partialCore).includes("data-readiness-status"), "Partial Readiness projections must remain render-safe");
  });
})();
