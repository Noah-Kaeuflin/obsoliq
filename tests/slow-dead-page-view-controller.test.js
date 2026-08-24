(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function modelFixture(app) {
    return app.ObsoliQ.slowDead.pageModel.createSlowDeadPageModel({
      runtimeState: {
        status: "available",
        result: {
          status: "available",
          evaluatedAt: "2026-08-23T10:00:00.000Z",
          cases: [{
            case_id: "SLOW-DEAD::DS-VC::ENTITY-0001",
            inventory_entity_key: "material:MAT-0001|plant:P1",
            inventory_row_keys: ["INV-0001-A"],
            material_id: "MAT-0001",
            material_description: "Pressure sensor",
            plant: "P1",
            condition_code: "dead_stock_candidate",
            evidence_strength: "high",
            condition_confidence: "high",
            stock_value: 9000,
            stock_quantity: 4,
            stock_unit: "EA",
            positive_evidence: [{ code: "dead_stock_evidence", value: { monthsSince: 24, net12: 0, completeness: 1 } }],
            counter_evidence: [{ code: "no_explicit_strategic_reserve", value: false }],
            limitation_codes: [],
            missing_evidence: ["finance_review_context"],
            root_cause_candidates: [{ root_cause_code: "demand_discontinuity", label: "No visible current demand" }],
            recovery_case_eligibility: { eligibility: "reviewable_case_candidate", reason_codes: ["dead_stock_evidence"] },
            action_eligibility: [{ action_code: "DISPOSAL_REVIEW", eligibility_status: "review_required", reason_codes: ["manual_approval_required"], required_data_packages: ["finance", "quality"] }],
            required_data_packages: ["finance", "quality"],
            independent_dead_stock_signal: true,
            provenance: { relationshipMatchType: "exact_material_plant", condition_model_version: "slow-dead-condition-v1" }
          }]
        }
      },
      linkedActionMaterials: ["MAT-0001"]
    });
  }

  test("AP 16.4d.2 View renders workbench detail without calculating conditions", async assert => {
    const app = await helpers.loadProductionApp();
    const view = app.ObsoliQ.application.slowDeadPageView.createSlowDeadPageView({
      html: value => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
      t: key => ({
        slowDeadPageTitle: "Slow / Dead Recovery Cases",
        slowDeadPageSubtitle: "Workbench",
        slowDeadRuntimeTitle: "Runtime",
        slowDeadRuntime_available: "Available",
        slowDeadRuntimeBody_available: "Available body",
        slowDeadRuntimeBuildCount: "Builds",
        slowDeadEvaluatedAt: "Evaluated",
        slowDeadPortfolioSummary: "Portfolio",
        slowDeadPortfolioSummaryDesc: "Summary",
        slowDeadTotalCases: "Cases",
        slowDeadSummary_slow_moving_candidate: "Slow",
        slowDeadSummary_non_moving_candidate: "Non",
        slowDeadSummary_dead_stock_candidate: "Dead",
        slowDeadSummary_protected_monitor: "Protected",
        slowDeadSummary_insufficient_evidence: "Insufficient",
        slowDeadConditionFilters: "Conditions",
        searchLabel: "Search",
        slowDeadSearchPlaceholder: "Search",
        resetFilters: "Reset",
        all: "All",
        plantLabel: "Plant",
        slowDeadEvidenceStrength: "Evidence",
        slowDeadConditionConfidence: "Confidence",
        slowDeadRecoveryEligibility: "Eligibility",
        colOwnerFunction: "Owner",
        historyRelationship: "Relationship",
        slowDeadRequiredPackage: "Package",
        slowDeadMissingEvidence: "Missing",
        slowDeadWorklistTitle: "Worklist",
        slowDeadWorklistSubtitle: "{count} cases",
        rowLimitLabel: "Rows",
        Material: "Material",
        slowDeadCondition: "Condition",
        slowDeadInventoryExposure: "Exposure",
        lastConsumption: "Last",
        netConsumption12m: "Net12",
        historyCompleteness: "Completeness",
        actions: "Action",
        details: "Details",
        stockQuantity: "Qty",
        slowDeadPositiveEvidence: "Positive Evidence",
        slowDeadCounterEvidence: "Counter Evidence",
        slowDeadWhyNotStronger: "Why not stronger",
        slowDeadRootCauses: "Root causes",
        slowDeadActionEligibility: "Action Eligibility",
        slowDeadActionEligibilityNote: "Pre-decisional",
        slowDeadRequiredPackages: "Required packages",
        slowDeadProvenance: "Provenance",
        slowDeadOpenInventory: "Open inventory",
        slowDeadOpenActions: "Open actions",
        slowDeadExport: "Export",
        slowDeadDeadCandidateWarning: "Not an approval",
        caseId: "Case",
        inventoryEntityKey: "Entity",
        inventoryRowKeys: "Rows",
        relationshipSignature: "Relationship signature",
        conditionModelVersion: "Model",
        conditionPolicyVersion: "Policy",
        caseInputSignature: "Signature",
        notAvailable: "n/a",
        page: "Page",
        previous: "Previous",
        next: "Next",
        monthsShort: "mo"
      })[key] || key,
      formatMoney: value => `${value} EUR`,
      formatCompactMoney: value => `${value} EUR`,
      formatCount: value => String(value),
      formatNumber: value => String(value),
      conditionLabel: value => value,
      codeLabel: (_prefix, value) => value,
      actionCodeLabel: value => value
    });
    const html = view.render(modelFixture(app));

    assert.ok(html.includes("SLOW-DEAD::DS-VC::ENTITY-0001"), "View should render selected Case provenance");
    assert.ok(html.includes("Positive Evidence"), "View should render positive evidence");
    assert.ok(html.includes("Action Eligibility"), "View should render pre-decisional action eligibility");
    assert.ok(html.includes("Not an approval"), "Dead Candidate safety wording should render");
  });

  test("AP 16.4d.2 Controller binds scoped Slow / Dead interactions", async assert => {
    const app = await helpers.loadProductionApp();
    const root = app.document.createElement("div");
    root.innerHTML = `
      <input data-slow-dead-search />
      <select data-slow-dead-filter="condition"><option value="all">All</option><option value="dead_stock_candidate">Dead</option></select>
      <button data-slow-dead-condition="slow_moving_candidate"></button>
      <button data-slow-dead-sort="material_id"></button>
      <button data-slow-dead-page="2"></button>
      <select data-slow-dead-page-size><option value="50">50</option></select>
      <button data-slow-dead-case-id="CASE-1"></button>
      <button data-slow-dead-open-inventory="CASE-1"></button>
      <button data-slow-dead-open-actions="CASE-1"></button>
      <button data-slow-dead-export></button>
    `;
    app.document.body.appendChild(root);
    const calls = [];
    app.ObsoliQ.application.slowDeadPageController.createSlowDeadPageController({
      root,
      onStateChange: patch => calls.push(["state", patch]),
      onExport: () => calls.push(["export"]),
      onOpenInventory: caseId => calls.push(["inventory", caseId]),
      onOpenActions: caseId => calls.push(["actions", caseId])
    }).bind();

    root.querySelector("[data-slow-dead-search]").value = "MAT";
    root.querySelector("[data-slow-dead-search]").dispatchEvent(new app.Event("input", { bubbles: true }));
    root.querySelector("[data-slow-dead-filter]").value = "dead_stock_candidate";
    root.querySelector("[data-slow-dead-filter]").dispatchEvent(new app.Event("change", { bubbles: true }));
    root.querySelector("[data-slow-dead-sort]").click();
    root.querySelector("[data-slow-dead-page]").click();
    root.querySelector("[data-slow-dead-case-id]").click();
    root.querySelector("[data-slow-dead-open-inventory]").click();
    root.querySelector("[data-slow-dead-open-actions]").click();
    root.querySelector("[data-slow-dead-export]").click();

    assert.ok(calls.some(call => call[0] === "state" && call[1].filters?.search === "MAT"), "Search should update page state");
    assert.ok(calls.some(call => call[0] === "state" && call[1].filters?.condition === "dead_stock_candidate"), "Select filter should update page state");
    assert.ok(calls.some(call => call[0] === "state" && call[1].sortKey === "material_id"), "Sort button should update sort state");
    assert.ok(calls.some(call => call[0] === "state" && call[1].page === 2), "Pagination should update page");
    assert.ok(calls.some(call => call[0] === "inventory" && call[1] === "CASE-1"), "Inventory callback should be scoped");
    assert.ok(calls.some(call => call[0] === "actions" && call[1] === "CASE-1"), "Actions callback should be scoped");
    assert.ok(calls.some(call => call[0] === "export"), "Export callback should be scoped");
    root.remove();
  });
})();
