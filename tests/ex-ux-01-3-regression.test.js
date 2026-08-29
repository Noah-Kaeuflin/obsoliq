(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function baseCase(overrides = {}) {
    return {
      case_id: "EXCESS::DS-1::INV-1",
      inventory_row_key: "INV-1",
      material_id: "MAT-1001",
      material_description: "Pump assembly",
      plant: "DE01",
      primary_category: "excess",
      priority: "High",
      status: "Open",
      stock_value: 200,
      gross_excess_value: 100,
      excess_overlap_value: 20,
      net_addressable_excess_value: 80,
      excess_remaining_inventory_value: 120,
      excess_opportunity_score: 82,
      root_cause: "Excess inventory compared to demand or planning reference",
      recommended_action: "Review planning parameters, open purchase orders and stock transfer options",
      next_step: "Planner should review demand, safety stock and open purchase orders",
      decision_type: "review_reduce",
      owner_reference: "G06",
      owner_function: "Material Planning",
      owner_source: "inventory_snapshot",
      owner_assignment_confidence: "High",
      relationship_status: "matched",
      relationship_match_type: "exact_material_plant",
      whyPrioritized: ["why_net_addressable_excess"],
      whyNotHigher: [],
      limitations: [],
      evidenceRecords: [{
        evidenceKey: "net_addressable_excess_value",
        labelKey: "evidence_net_addressable_excess_value",
        value: 80,
        valueType: "money",
        evidenceType: "calculated_value",
        sourceField: "net_excess_value",
        sourcePackageId: "INV-PKG-1",
        sourcePackageRevision: 1
      }],
      scenarios: [],
      grossToNetExplanation: {
        grossExcessValue: 100,
        netAddressableExcessValue: 80,
        overlapValue: 20,
        remainingInventoryValue: 120,
        reasonKey: "grossNetOverlapReason"
      },
      ownerActionContext: {
        ownerReference: "G06",
        ownerFunction: "Material Planning",
        ownerSource: "inventory_snapshot",
        ownerAssignmentConfidence: "High",
        recommendation: "Review planning parameters, open purchase orders and stock transfer options",
        nextStep: "Planner should review demand, safety stock and open purchase orders",
        decisionType: "review_reduce"
      },
      source_row: {},
      ...overrides
    };
  }

  function metric(status = "available", overrides = {}) {
    return {
      history_metric_status: status,
      last_consumption_date: "2026-03-01",
      net_consumption_quantity_3m: 3,
      net_consumption_quantity_12m: 24,
      average_monthly_consumption_12m: 2,
      consumption_trend: "stable",
      inventory_coverage_months: 10,
      history_completeness: 1,
      history_metric_limitation_codes: status === "limited" ? ["partial_history"] : [],
      unit: "ST",
      inventory_unit: "ST",
      provenance: { unitStatus: "single", historyUnit: "ST", inventoryUnit: "ST" },
      monthly_buckets: [{ month: "2026-02", netQuantity: 1, unit: "ST" }, { month: "2026-03", netQuantity: 2, unit: "ST" }],
      ...overrides
    };
  }

  function projectionOptions(historyMetric = metric("available")) {
    return {
      historyPackageLoaded: true,
      historicalRuntimeState: { status: "available" },
      historicalResult: {
        status: "available",
        historicalMetricsByInventoryRowKey: { "INV-1": historyMetric }
      },
      purchaseOrderPackageImportSupported: false
    };
  }

  test("EX-UX-01.3 recognizes EX-UX-01.2 and extends its pure Decision Workspace baseline", async assert => {
    const app = await helpers.loadApp();
    const model = app.ObsoliQ.excess.decisionWorkspaceModel;
    const core = model.projectDecisionCore(baseCase(), projectionOptions());

    assert.equal(model.version, "3", "Decision Workspace should expose the current contract version");
    assert.equal(model.READINESS_MODEL_VERSION, "excess-decision-readiness-v2", "Readiness policy should be explicitly versioned");
    assert.equal(core.caseId, "EXCESS::DS-1::INV-1", "EX-UX-01.2 stable Case identity should remain intact");
    assert.equal(core.netAddressableValue.value, 80, "EX-UX-01.2 accepted Net value should remain intact");
    assert.equal(core.causeHypothesis.hypothesis, baseCase().root_cause, "Existing root_cause should be projected verbatim");
    assert.equal(core.causeHypothesis.classificationKey, "excessCauseRuleBasedNotice", "Cause should be framed as a rule-based hypothesis");
    assert.ok(core.causeHypothesis.supportingSignals.some(signal => signal.source === "evidenceRecord" && signal.value === 80), "Supporting signals should retain concrete evidence values");
  });

  test("EX-UX-01.3 keeps the authoritative recommendation whole and gates additional options by provenance", async assert => {
    const app = await helpers.loadApp();
    const model = app.ObsoliQ.excess.decisionWorkspaceModel;
    const recommendation = "Review demand, safety stock, and open purchase orders";
    const purchaseScenario = {
      scenario_id: "purchase_order_review",
      label_key: "scenarioPurchaseOrder",
      availability: "unavailable",
      missingEvidence: ["purchase_order_details"],
      requiredPackages: ["purchase_orders"],
      observedInputs: {},
      note_key: "scenarioPurchaseOrderUnavailable",
      model_version: "1"
    };
    const noPackage = model.actionOptions(baseCase({ recommended_action: recommendation, scenarios: [purchaseScenario] }), { purchaseOrderPackageImportSupported: false });
    const registryOnly = model.actionOptions(baseCase({ recommended_action: recommendation, scenarios: [purchaseScenario] }), { purchaseOrderPackageLoaded: true, purchaseOrderPackageImportSupported: false });
    const insufficient = model.actionOptions(baseCase({ recommended_action: recommendation, scenarios: [purchaseScenario], source_row: { open_po_value: 25 } }), {});
    const concrete = model.actionOptions(baseCase({
      recommended_action: recommendation,
      source_row: { open_po_value: 25, purchase_order_number: "450001" },
      scenarios: [{ ...purchaseScenario, availability: "available", missingEvidence: [], observedInputs: { open_po_value: 25, purchase_order_number: "450001" } }]
    }), {});

    assert.equal(noPackage.filter(option => option.isPrimary).length, 1, "A comma-separated recommendation must remain one primary option");
    assert.equal(noPackage[0].labelText, recommendation, "recommended_action must not be heuristically split or rewritten");
    assert.equal(noPackage[1].status, "not_checkable", "Missing row-level PO evidence must not claim checkability");
    assert.includes(noPackage[1].provenance, "purchase_order_evidence:no_case_evidence", "Missing Case-level PO evidence should be explicit in provenance");
    assert.includes(noPackage[1].provenance, "purchase_orders_package:unsupported", "The unavailable standalone PO import capability should be explicit");
    assert.equal(registryOnly[1].status, "not_checkable", "A Registry-only PO record must not imply a productive import capability");
    assert.equal(insufficient[1].status, "review_required", "Partial PO fields should require review, not claim concrete evidence");
    assert.equal(concrete[1].status, "checkable", "Concrete PO number and PO value with an available structured scenario should be checkable");
    assert.ok(concrete[1].evidence.some(record => record.key === "purchase_order_number"), "Concrete PO option must carry its field-level evidence");
    assert.equal(model.actionOptions(baseCase({ scenarios: [] }), {}).length, 1, "Without structured scenario results only the primary recommendation may exist");
  });

  test("EX-UX-01.3 readiness follows the open four-state truth table", async assert => {
    const app = await helpers.loadApp();
    const model = app.ObsoliQ.excess.decisionWorkspaceModel;
    const ready = model.projectDecisionCore(baseCase(), projectionOptions()).decisionReadiness;
    const limited = model.projectDecisionCore(baseCase(), projectionOptions(metric("limited"))).decisionReadiness;
    const review = model.projectDecisionCore(baseCase({ root_cause: "" }), projectionOptions()).decisionReadiness;
    const notDecidable = model.projectDecisionCore(baseCase({ recommended_action: "", ownerActionContext: { ...baseCase().ownerActionContext, recommendation: "" } }), projectionOptions()).decisionReadiness;

    assert.equal(ready.status, "ready", "Complete evidence and a checkable primary path should be decision-ready");
    assert.equal(limited.status, "limited", "Limited Historical evidence should produce limited readiness");
    assert.equal(review.status, "review", "Missing cause hypothesis should require review");
    assert.includes(review.missingEvidence, "root_cause", "Review state should expose the missing cause");
    assert.equal(notDecidable.status, "not_decidable", "Missing authoritative recommendation should be not decidable");
    assert.equal(ready.version, "excess-decision-readiness-v2", "Each readiness result should carry the policy version");
  });

  test("EX-UX-01.3 value projection distinguishes missing, invalid and real zero without changing values", async assert => {
    const app = await helpers.loadApp();
    const model = app.ObsoliQ.excess.decisionWorkspaceModel;
    const zero = model.valueNarrative(baseCase({
      stock_value: 0,
      grossToNetExplanation: { grossExcessValue: 0, netAddressableExcessValue: 0, overlapValue: 0, remainingInventoryValue: 0 }
    }));
    const missing = model.valueNarrative({});
    const invalid = model.valueNarrative({ gross_excess_value: "not-a-number", net_addressable_excess_value: 0 });
    const exact = model.valueNarrative(baseCase());

    assert.equal(zero.fields.stockValue.available, true, "A numeric zero must remain available");
    assert.equal(zero.fields.grossExcessValue.value, 0, "A real Gross zero must remain exactly zero");
    assert.equal(missing.fields.grossExcessValue.available, false, "Missing Gross must remain unavailable rather than becoming zero");
    assert.equal(missing.fields.grossExcessValue.reason, "missing", "Missing values should be distinguishable from invalid values");
    assert.equal(invalid.fields.grossExcessValue.reason, "invalid", "Invalid values should remain explicitly invalid");
    assert.equal(exact.fields.grossExcessValue.value, 100, "Canonical Gross value must remain unchanged");
    assert.equal(exact.fields.overlapValue.value, 20, "Canonical overlap value must remain unchanged");
    assert.equal(exact.fields.netAddressableValue.value, 80, "Canonical Net value must remain unchanged");
    assert.equal(exact.fields.remainingInventoryValue.value, 120, "Canonical remaining inventory must remain unchanged");
  });

  test("EX-UX-01.3 Historical projection differentiates runtime states and only passes through canonical buckets", async assert => {
    const app = await helpers.loadApp();
    const model = app.ObsoliQ.excess.decisionWorkspaceModel;
    const item = baseCase();
    const packageMissing = model.historicalEvidence(item, { historyPackageLoaded: false });
    const noRelationship = model.historicalEvidence(item, { historyPackageLoaded: true, historicalRuntimeState: { status: "available" }, historicalResult: { status: "available", historicalMetricsByInventoryRowKey: {} } });
    const notCalculated = model.historicalEvidence(item, { historyPackageLoaded: true, historicalRuntimeState: { status: "not_calculated" } });
    const limited = model.historicalEvidence(item, projectionOptions(metric("limited")));
    const insufficient = model.historicalEvidence(item, projectionOptions(metric("unavailable", { monthly_buckets: [] })));
    const available = model.historicalEvidence(item, projectionOptions(metric("available")));
    const runtimeError = model.historicalEvidence(item, { historyPackageLoaded: true, historicalRuntimeState: { status: "error", errorCode: "runtime_failed" } });

    assert.equal(packageMissing.state, "package_missing", "Missing package should have its own state");
    assert.equal(noRelationship.state, "loaded_no_exact_relationship", "Loaded History without exact row-key evidence should have its own state");
    assert.equal(notCalculated.state, "not_calculated", "Unbuilt metrics should have their own state");
    assert.equal(limited.state, "limited", "Limited exact metrics should remain limited");
    assert.equal(insufficient.state, "insufficient", "Unavailable exact metrics should be insufficient");
    assert.equal(available.state, "available", "Available exact metrics should remain available");
    assert.equal(runtimeError.state, "runtime_error", "Runtime failures should remain explicit");
    assert.equal(available.metric.net_consumption_quantity_3m, 3, "3M consumption must pass through the existing Runtime");
    assert.equal(available.metric.average_monthly_consumption_12m, 2, "Monthly average must pass through the existing Runtime");
    assert.deepEqual(available.monthlyBuckets.map(bucket => [bucket.month, bucket.netQuantity]), [["2026-02", 1], ["2026-03", 2]], "Only canonical Runtime buckets may be projected");
    assert.equal(model.historicalEvidence(item, projectionOptions(metric("available", { monthly_buckets: undefined }))).monthlyBuckets.length, 0, "No buckets may be reconstructed from 3M or 12M totals");
  });

  test("EX-UX-01.3 partial Cases normalize optional arrays and do not throw", async assert => {
    const app = await helpers.loadApp();
    const model = app.ObsoliQ.excess.decisionWorkspaceModel;
    const core = model.projectDecisionCore({ case_id: "PARTIAL" }, { historyPackageLoaded: false });

    assert.equal(core.whyPrioritized.length, 0, "Missing whyPrioritized should normalize to an empty array");
    assert.equal(core.whyNotHigher.length, 0, "Missing whyNotHigher should normalize to an empty array");
    assert.equal(core.causeHypothesis.supportingSignals.length, 0, "Missing evidence arrays should remain render-safe");
    assert.equal(core.actionOptions.length, 1, "A partial Case should still expose a safe primary-option placeholder");
    assert.equal(core.decisionReadiness.status, "not_decidable", "A partial Case should fail closed");
  });

  test("EX-UX-01.3 DOM follows the narrative order, avoids duplication and refreshes on Case switch", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();

    const detail = app.document.querySelector(".excess-detail-panel");
    const core = detail.querySelector(".excess-decision-core");
    const scroll = detail.querySelector(".excess-detail-scroll");
    const card = scroll.querySelector(":scope > .excess-detail-card");
    const panels = [...card.querySelectorAll(":scope > [role='tabpanel']")];
    const narrative = card.querySelector("[data-decision-narrative-grid]");
    const actionOptions = card.querySelector(".excess-action-options-section");
    const history = card.querySelector(".excess-historical-state");
    const value = card.querySelector(".excess-value-narrative");
    const decisionBasis = card.querySelector(".excess-decision-basis-grid");
    const work = card.querySelector(".excess-work-context");
    const readiness = detail.querySelector(".excess-readiness-card");
    const initialCaseId = core.dataset.excessDecisionCore;
    const initialHeading = app.document.getElementById("excess-case-heading").textContent.trim();

    assert.equal(core.querySelector("[data-next-step]"), null, "Only the compact header should remain outside the internal scroll");
    assert.equal(core.querySelectorAll(".excess-case-badges .action-badge").length, 1, "Header should show Action status once without duplicating Priority");
    assert.ok(core.querySelector(".excess-inline-stats")?.textContent.includes("Priorität"), "Priority should remain visible once in the fixed metric row");
    assert.equal(detail.getAttribute("aria-labelledby"), "excess-case-heading", "Detail aside should reference the semantic Case heading");
    assert.ok(narrative && narrative.children.length === 4, "The internal scroll should start with the four-part narrative grid");
    assert.deepEqual(panels.map(panel => panel.dataset.excessDetailSection), ["decision", "value", "history", "prioritization", "actions"], "The accepted narrative sequence should be represented by five ordered tab panels");
    assert.equal(panels.filter(panel => !panel.hidden).length, 1, "Only one decision panel should be visible at a time");
    assert.equal(panels.find(panel => !panel.hidden)?.dataset.excessDetailSection, "decision", "Decision should remain the initial detail panel");
    assert.equal(narrative.closest("[role='tabpanel']")?.dataset.excessDetailSection, "decision", "Decision narrative must stay in the Decision tab");
    assert.equal(value.closest("[role='tabpanel']")?.dataset.excessDetailSection, "value", "Gross-to-Net logic must stay in the Value tab");
    assert.equal(history.closest("[role='tabpanel']")?.dataset.excessDetailSection, "history", "Canonical History must stay in the History tab");
    assert.equal(decisionBasis.closest("[role='tabpanel']")?.dataset.excessDetailSection, "prioritization", "Score drivers must stay in the Prioritization tab");
    assert.equal(actionOptions.closest("[role='tabpanel']")?.dataset.excessDetailSection, "actions", "Action options must stay in the Action Paths tab");
    assert.equal(work.closest("[role='tabpanel']")?.dataset.excessDetailSection, "actions", "Work context must remain secondary to Action options in the same tab");
    assert.equal(Number(readiness.dataset.whyNotHigherCount), bridge.getExcessDecisionCoreForTest().decisionReadiness.whyNotHigher.length, "Why Not Higher evidence should remain projected into the matrix");
    assert.equal([...readiness.querySelectorAll(":scope > .excess-readiness-grid > div > span")].some(node => node.textContent.trim() === "Warum nicht höher"), false, "Why Not Higher should not be duplicated as a separate matrix block");
    assert.equal([...detail.querySelectorAll(".excess-detail-disclosure")].every(node => !node.open), true, "Technical disclosures should remain closed by default");
    assert.equal(value.querySelector("[data-bridge-role='net']").textContent.includes("Cash"), false, "Net Addressable itself must not be labelled as Cash");
    assert.equal(work.dataset.actionStatus, bridge.getExcessPageStateForTest().activeCase.status, "Visible Action status must come from the existing Action Case status");
    assert.ok(detail.querySelector(".pilot-review-card"), "Pilot Review should remain a separate disclosure and lifecycle");

    const secondRow = app.document.querySelectorAll(".excess-table tbody tr[data-excess-case-detail]")[1];
    secondRow.click();
    const nextCore = app.document.querySelector(".excess-decision-core");
    const nextHeading = app.document.getElementById("excess-case-heading").textContent.trim();
    assert.notEqual(nextCore.dataset.excessDecisionCore, initialCaseId, "Case switch should replace the complete detail projection");
    assert.notEqual(nextHeading, initialHeading, "Semantic Case heading should update without stale data");
    assert.equal(nextCore.dataset.excessDecisionCore, secondRow.dataset.excessCaseDetail, "Selected worklist Case and rendered detail must remain exact");
  });

  test("EX-UX-01.3 Historical and value renderers keep truthful empty states", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const withBuckets = app.document.createElement("div");
    withBuckets.innerHTML = bridge.renderExcessHistoricalEvidenceForTest({ historicalEvidence: { status: "available", state: "available", exact: true, metric: metric("available"), limitations: [], monthlyBuckets: metric("available").monthly_buckets } });
    const withoutBuckets = app.document.createElement("div");
    withoutBuckets.innerHTML = bridge.renderExcessHistoricalEvidenceForTest({ historicalEvidence: { status: "available", state: "available", exact: true, metric: metric("available", { monthly_buckets: [] }), limitations: [], monthlyBuckets: [] } });
    const packageMissing = app.document.createElement("div");
    packageMissing.innerHTML = bridge.renderExcessHistoricalEvidenceForTest({ historicalEvidence: { status: "unavailable", state: "package_missing", exact: false, metric: null, limitations: [], monthlyBuckets: [] } });
    const noRelationship = app.document.createElement("div");
    noRelationship.innerHTML = bridge.renderExcessHistoricalEvidenceForTest({ historicalEvidence: { status: "unavailable", state: "loaded_no_exact_relationship", exact: false, metric: null, limitations: [], monthlyBuckets: [] } });

    assert.ok(withBuckets.querySelector("[data-canonical-monthly-buckets='true']"), "Chart should render when canonical monthly buckets exist");
    assert.ok(withBuckets.textContent.includes("Nettoverbrauch 3M") && withBuckets.textContent.includes("Ø Monatsverbrauch"), "Visible History should include 3M and monthly average metrics");
    assert.ok(withoutBuckets.textContent.includes("Monatlicher Verlauf nicht verfügbar"), "Missing buckets should show the honest chart empty state");
    assert.ok(packageMissing.querySelector("[data-data-foundation-import-consumption-history]"), "Import CTA should appear only when the package is missing");
    assert.equal(noRelationship.querySelector("[data-data-foundation-import-consumption-history]"), null, "Loaded History without an exact relationship must not show a misleading import CTA");
  });
})();
