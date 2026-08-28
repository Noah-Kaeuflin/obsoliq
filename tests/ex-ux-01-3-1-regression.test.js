(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function caseRecord(overrides = {}) {
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
      evidenceRecords: [],
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

  function historyMetric(overrides = {}) {
    return {
      history_metric_status: "available",
      last_consumption_date: "2026-03-01",
      net_consumption_quantity_3m: 3,
      net_consumption_quantity_12m: 14,
      average_monthly_consumption_12m: 1.2,
      consumption_trend: "stable",
      inventory_coverage_months: 10,
      history_completeness: 1,
      history_metric_limitation_codes: [],
      unit: "ST",
      inventory_unit: "ST",
      provenance: { unitStatus: "single", historyUnit: "ST", inventoryUnit: "ST" },
      monthly_buckets: [
        { month: "2026-02", netQuantity: 0, unit: "ST" },
        { month: "2026-03", netQuantity: 2, unit: "ST" }
      ],
      ...overrides
    };
  }

  function projectionOptions(metric = historyMetric()) {
    return {
      historyPackageLoaded: true,
      historicalRuntimeState: { status: "available" },
      historicalResult: {
        status: "available",
        historicalMetricsByInventoryRowKey: { "INV-1": metric }
      },
      purchaseOrderPackageImportSupported: false
    };
  }

  function purchaseOrderScenario(availability = "unavailable") {
    return {
      scenario_id: "purchase_order_review",
      label_key: "scenarioPurchaseOrder",
      availability,
      missingEvidence: availability === "available" ? [] : ["purchase_order_details"],
      observedInputs: {},
      note_key: availability === "available" ? "scenarioPurchaseOrderNote" : "scenarioPurchaseOrderUnavailable",
      model_version: "1"
    };
  }

  test("EX-UX-01.3.1 exposes the complete versioned presentation contracts", async assert => {
    const app = await helpers.loadApp();
    const model = app.ObsoliQ.excess.decisionWorkspaceModel;
    const core = model.projectDecisionCore(caseRecord(), projectionOptions());

    assert.equal(core.projectionVersion, "3", "The Decision Workspace projection should expose its version");
    assert.deepEqual(model.READINESS_STATUSES, ["ready", "limited", "review", "not_decidable"], "Readiness status values should be explicit");
    assert.deepEqual(model.ACTION_OPTION_STATUSES, ["checkable", "review_required", "not_checkable", "not_recommended"], "Action-option status values should be explicit");
    assert.equal(core.causeHypothesis.cause, caseRecord().root_cause, "Cause contract should expose the existing rule-derived cause");
    assert.equal(core.causeHypothesis.classification, "rule_based_hypothesis", "Cause must remain classified as a hypothesis");
    assert.equal(core.causeHypothesis.provenance.sourceField, "root_cause", "Cause provenance should identify the actual source field");
    assert.equal(core.decisionReadiness.version, "excess-decision-readiness-v2", "Readiness should carry the accepted policy version");
    assert.ok(Array.isArray(core.decisionReadiness.existingEvidence), "Readiness existing evidence should be structured");
    assert.ok(Array.isArray(core.decisionReadiness.missingEvidence), "Readiness missing evidence should be structured");
    assert.ok(Array.isArray(core.actionOptions), "Action options should be structured");
    assert.ok(core.historicalEvidence.unitContext, "Historical presentation should include Unit Context");
    assert.ok(core.valueNarrative.fields && core.workContext.sessionOnly, "Value Narrative and session-only Work Context should remain explicit");
  });

  test("EX-UX-01.3.1 projects canonical, missing and conflicting Historical Unit Context", async assert => {
    const app = await helpers.loadApp();
    const model = app.ObsoliQ.excess.decisionWorkspaceModel;
    const available = model.historicalEvidence(caseRecord(), projectionOptions(historyMetric()));
    const missing = model.historicalEvidence(caseRecord(), projectionOptions(historyMetric({
      unit: "",
      inventory_unit: "",
      provenance: { unitStatus: "missing", historyUnit: "", inventoryUnit: "" },
      monthly_buckets: [{ month: "2026-03", netQuantity: 2, unit: "" }]
    })));
    const conflict = model.historicalEvidence(caseRecord(), projectionOptions(historyMetric({
      history_metric_status: "unavailable",
      history_metric_limitation_codes: ["unit_conflict"],
      unit: "",
      provenance: { unitStatus: "conflict", historyUnit: "", inventoryUnit: "ST" },
      monthly_buckets: [
        { month: "2026-02", netQuantity: 1, unit: "ST" },
        { month: "2026-03", netQuantity: 1, unit: "KG" }
      ]
    })));

    assert.equal(available.unitContext.state, "available", "One canonical unit should be available");
    assert.equal(available.unitContext.unit, "ST", "The Runtime history unit should pass through unchanged");
    assert.equal(available.monthlyBuckets[0].netQuantity, 0, "A real zero bucket must remain zero");
    assert.equal(available.monthlyBuckets[0].unit, "ST", "Canonical monthly buckets should carry their quantity unit");
    assert.equal(missing.unitContext.state, "missing", "Missing Runtime unit should remain missing");
    assert.equal(conflict.unitContext.state, "conflict", "Contradictory Runtime units should remain conflicted");
    assert.equal(conflict.monthlyBuckets.length, 0, "Conflicting units must not be merged into a chart projection");
  });

  test("EX-UX-01.3.1 renders quantity zero with unit and honest missing/conflict states in German and English", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const model = app.ObsoliQ.excess.decisionWorkspaceModel;
    const available = model.historicalEvidence(caseRecord(), projectionOptions(historyMetric({ net_consumption_quantity_3m: 0 })));
    const missing = model.historicalEvidence(caseRecord(), projectionOptions(historyMetric({
      unit: "",
      provenance: { unitStatus: "missing", historyUnit: "", inventoryUnit: "" },
      monthly_buckets: []
    })));
    const conflict = model.historicalEvidence(caseRecord(), projectionOptions(historyMetric({
      history_metric_status: "unavailable",
      history_metric_limitation_codes: ["unit_conflict"],
      unit: "",
      provenance: { unitStatus: "conflict", historyUnit: "", inventoryUnit: "ST" },
      monthly_buckets: []
    })));
    const de = app.document.createElement("div");
    de.innerHTML = bridge.renderExcessHistoricalEvidenceForTest({ historicalEvidence: available });
    const missingDe = app.document.createElement("div");
    missingDe.innerHTML = bridge.renderExcessHistoricalEvidenceForTest({ historicalEvidence: missing });
    const conflictDe = app.document.createElement("div");
    conflictDe.innerHTML = bridge.renderExcessHistoricalEvidenceForTest({ historicalEvidence: conflict });

    assert.ok(de.textContent.includes("Historische Mengeneinheit: ST"), "German History should show the canonical unit context");
    assert.ok(de.textContent.includes("0 ST"), "A real calculated zero should render with its unit");
    assert.ok(de.querySelector("[data-canonical-monthly-buckets='true']")?.textContent.includes("0 ST"), "Canonical zero bucket should retain its unit");
    assert.ok(missingDe.textContent.includes("Einheit nicht verfügbar"), "Missing unit should have an honest German state");
    assert.ok(conflictDe.textContent.includes("Einheit nicht eindeutig"), "Conflicting unit should have an honest German state");

    bridge.updateLanguageForTest("en");
    const en = app.document.createElement("div");
    en.innerHTML = bridge.renderExcessHistoricalEvidenceForTest({ historicalEvidence: available });
    assert.ok(en.textContent.includes("Historical quantity unit: ST"), "English History should show the canonical unit context");
    assert.ok(en.textContent.includes("0 ST"), "English zero should retain the canonical unit");
    bridge.updateLanguageForTest("de");
  });

  test("EX-UX-01.3.1 keeps PO evidence row-bound and does not imply a productive PO import", async assert => {
    const app = await helpers.loadApp();
    const model = app.ObsoliQ.excess.decisionWorkspaceModel;
    const definition = app.ObsoliQ.data.packageRegistry.DATA_PACKAGE_TYPE_DEFINITIONS.purchase_orders;
    const noEvidence = model.actionOptions(caseRecord({ scenarios: [purchaseOrderScenario()] }), { purchaseOrderPackageImportSupported: false });
    const concrete = model.actionOptions(caseRecord({
      scenarios: [purchaseOrderScenario("available")],
      source_row: { purchase_order_number: "450001", open_po_value: 25 }
    }), { purchaseOrderPackageImportSupported: false });

    assert.notEqual(definition.importSupported, true, "Purchase Orders must remain contract-only in the Package Registry");
    assert.equal(app.__obsoliqTestBridge.isPurchaseOrdersImportSupportedForTest(), false, "Production UI capability must follow the real import definition");
    assert.equal(app.document.getElementById("packageTypePurchaseOrdersButton"), null, "Upload dialog must not expose a PO Package option");
    assert.includes(noEvidence[1].provenance, "purchase_order_evidence:no_case_evidence", "No row evidence should be explicit");
    assert.includes(noEvidence[1].provenance, "purchase_orders_package:unsupported", "Unsupported standalone Package capability should be explicit");
    assert.equal(noEvidence[1].status, "not_checkable", "Missing row evidence must not be checkable");
    assert.equal(concrete[1].status, "checkable", "Concrete row-level number and value may support the existing structured review option");
    assert.includes(concrete[1].provenance, "purchase_order_source:inventory_row_fields", "Concrete PO provenance should name the actual row source");
    const rendered = app.document.createElement("div");
    rendered.innerHTML = app.__obsoliqTestBridge.renderExcessActionOptionsForTest({ actionOptions: noEvidence });
    assert.equal(rendered.querySelector("[data-import-purchase-orders]"), null, "Action options must not expose a false PO import CTA");
  });

  test("EX-UX-01.3.1 keeps the primary recommendation open and secondary options compact and accessible", async assert => {
    const app = await helpers.loadApp();
    const model = app.ObsoliQ.excess.decisionWorkspaceModel;
    const options = model.actionOptions(caseRecord({ scenarios: [{
      scenario_id: "demand_validation",
      label_key: "scenarioDemandValidation",
      availability: "unavailable",
      missingEvidence: ["consumption_history"],
      observedInputs: {},
      note_key: "scenarioDemandValidationUnavailable",
      model_version: "1"
    }] }), { purchaseOrderPackageImportSupported: false });
    const rendered = app.document.createElement("div");
    rendered.innerHTML = app.__obsoliqTestBridge.renderExcessActionOptionsForTest({ actionOptions: options });
    const primary = rendered.querySelector("article.excess-action-option.primary");
    const secondary = rendered.querySelector("details.excess-action-option.secondary");

    assert.ok(primary && primary.querySelector(".excess-action-option-meta"), "Primary recommendation should remain fully visible");
    assert.equal(options[0].labelText, caseRecord().recommended_action, "Authoritative recommendation should remain whole in the projection");
    assert.equal(rendered.querySelectorAll("article.excess-action-option.primary").length, 1, "The whole primary recommendation should render as one open option");
    assert.ok(secondary && !secondary.open, "Secondary option should be closed by default");
    assert.ok(secondary.querySelector("summary .excess-option-status"), "Secondary status should remain visible while compact");
    assert.ok(secondary.querySelector(".excess-action-option-body .excess-action-option-meta"), "Secondary details should remain available on disclosure");
    const onlyPrimary = app.document.createElement("div");
    onlyPrimary.innerHTML = app.__obsoliqTestBridge.renderExcessActionOptionsForTest({ actionOptions: [options[0]] });
    assert.equal(onlyPrimary.querySelector("details.excess-action-option"), null, "A single primary option should not create an unnecessary disclosure");
  });

  test("EX-UX-01.3.1 de-duplicates visible Work Context and keeps Pilot Review separate from Action status", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const detail = app.document.querySelector(".excess-detail-panel");
    const work = detail.querySelector(".excess-work-context");
    const labels = [...work.querySelectorAll("dt")].map(node => node.textContent.trim());

    assert.deepEqual(labels, ["Entscheidungstyp", "Owner-Quelle", "Owner-Zuordnungssicherheit"], "Visible Work Context should contain only supplementary fields");
    assert.equal(work.querySelectorAll("dt").length, 3, "Status and Owner should not be duplicated in Work Context");
    assert.equal(work.dataset.actionStatus, bridge.getExcessPageStateForTest().activeCase.status, "Session-only Action status should remain sourced from the Action Case");
    assert.ok(detail.querySelector(".excess-case-badges .action-badge"), "Action status should remain visible in the fixed Case header");
    assert.ok(detail.querySelector(".pilot-review-card"), "Pilot Review should remain a separate disclosure contract");
  });
})();
