(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function caseRecord(overrides = {}) {
    return {
      case_id: "EXCESS::DS-CH-EX-01A::INV-1",
      inventory_row_key: "INV-1",
      material_id: "MAT-CH-EX-01A",
      material_description: "Contract test material",
      plant: "DE01",
      primary_category: "excess",
      priority: "High",
      status: "Open",
      stock_value: 200,
      gross_excess_value: 100,
      excess_overlap_value: 20,
      net_addressable_excess_value: 80,
      excess_remaining_inventory_value: 120,
      currency_unit: "EUR",
      excess_opportunity_score: 82,
      opportunity_score_metadata: {
        uncappedScore: 82,
        finalScore: 82,
        scoreCap: 100,
        maxComponentTotal: 102,
        wasCapped: false,
        cappedPoints: 0
      },
      root_cause: "Rule-derived excess hypothesis",
      recommended_action: "Review planning parameters",
      next_step: "Validate demand and open orders",
      decision_type: "review_reduce",
      owner_reference: "G06",
      owner_function: "Material Planning",
      owner_assignment_confidence: "High",
      relationship_match_type: "exact_material_plant",
      limitations: [],
      scenarios: [],
      grossToNetExplanation: {
        grossExcessValue: 100,
        overlapValue: 20,
        netAddressableExcessValue: 80,
        remainingInventoryValue: 120,
        currencyUnit: "EUR"
      },
      ownerActionContext: {
        ownerReference: "G06",
        ownerFunction: "Material Planning",
        recommendation: "Review planning parameters",
        nextStep: "Validate demand and open orders",
        decisionType: "review_reduce"
      },
      ...overrides
    };
  }

  function valueCase(gross, overlap, net, explanationOverrides = {}) {
    return caseRecord({
      grossToNetExplanation: {
        grossExcessValue: gross,
        overlapValue: overlap,
        netAddressableExcessValue: net,
        remainingInventoryValue: 120,
        currencyUnit: "EUR",
        ...explanationOverrides
      }
    });
  }

  test("CH-EX-01A validates the complete Gross-to-Net contract including epsilon, zero and currency", async assert => {
    const app = await helpers.loadApp();
    const model = app.ObsoliQ.excess.decisionWorkspaceModel;
    const valid = model.valueNarrative(valueCase(100, 20, 80));
    const inconsistent = model.valueNarrative(valueCase(100, 20, 90));
    const missingOverlap = model.valueNarrative(valueCase(100, undefined, 80));
    const missingGross = model.valueNarrative(valueCase(undefined, 20, 80));
    const missingNet = model.valueNarrative(valueCase(100, 20, undefined));
    const negative = model.valueNarrative(valueCase(100, -1, 101));
    const nan = model.valueNarrative(valueCase(Number.NaN, 20, 80));
    const infinite = model.valueNarrative(valueCase(Number.POSITIVE_INFINITY, 20, 80));
    const insideEpsilon = model.valueNarrative(valueCase(100, 20, 79.995));
    const outsideEpsilon = model.valueNarrative(valueCase(100, 20, 79.98));
    const zero = model.valueNarrative(valueCase(0, 0, 0));
    const currencyMismatch = model.valueNarrative(valueCase(100, 20, 80, {
      grossExcessCurrencyUnit: "EUR",
      overlapCurrencyUnit: "USD",
      netAddressableCurrencyUnit: "EUR"
    }));

    assert.equal(model.GROSS_NET_RECONCILIATION_EPSILON, 0.01, "The money reconciliation epsilon must be central and explicit");
    assert.equal(valid.validBasis, true, "100 - 20 = 80 should be valid");
    assert.equal(valid.reconciliation.difference, 0, "Valid reconciliation should retain the exact difference");
    assert.equal(inconsistent.reasonCode, "gross_net_value_basis_inconsistent", "A wrong equation needs the stable inconsistency code");
    assert.equal(missingOverlap.reasonCode, "gross_net_value_basis_missing", "Missing overlap must fail closed");
    assert.includes(missingOverlap.reconciliation.missingFields, "overlapValue", "The missing field should be identified");
    assert.includes(missingGross.reconciliation.missingFields, "grossExcessValue", "Missing Gross should be identified");
    assert.includes(missingNet.reconciliation.missingFields, "netAddressableValue", "Missing Net should be identified");
    assert.equal(negative.reasonCode, "gross_net_value_basis_invalid", "Negative money values must be invalid");
    assert.equal(nan.reasonCode, "gross_net_value_basis_invalid", "NaN must be invalid");
    assert.equal(infinite.reasonCode, "gross_net_value_basis_invalid", "Infinity must be invalid");
    assert.equal(insideEpsilon.validBasis, true, "A difference inside epsilon should remain valid");
    assert.equal(outsideEpsilon.reasonCode, "gross_net_value_basis_inconsistent", "A difference outside epsilon should be inconsistent");
    assert.equal(zero.validBasis, true, "0 - 0 = 0 is a valid value basis");
    assert.equal(zero.fields.grossExcessValue.available, true, "A real Gross zero must remain available");
    assert.equal(zero.fields.overlapValue.value, 0, "A real overlap zero must remain zero");
    assert.equal(currencyMismatch.reasonCode, "gross_net_value_basis_invalid", "Mixed normalized currencies must be invalid");
    assert.includes(currencyMismatch.reconciliation.invalidFields, "currencyUnit", "Currency mismatch should be explicit");
  });

  test("CH-EX-01A keeps the Case header null-safe and consumes one canonical value projection", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const model = bridge.excessDecisionWorkspaceModelForTest;
    const missingGrossItem = valueCase(undefined, 20, 80, { currencyUnit: "EUR" });
    const missingItem = valueCase(100, 20, undefined, { currencyUnit: "EUR" });
    missingItem.excess_opportunity_score = undefined;
    missingItem.opportunity_score = undefined;
    missingItem.opportunity_score_metadata = undefined;
    const missingGrossCore = model.projectDecisionCore(missingGrossItem, {});
    const missingCore = model.projectDecisionCore(missingItem, {});
    const zeroItem = valueCase(0, 0, 0);
    zeroItem.excess_opportunity_score = 0;
    zeroItem.opportunity_score_metadata = { uncappedScore: 0, finalScore: 0, scoreCap: 100, maxComponentTotal: 102, wasCapped: false, cappedPoints: 0 };
    const zeroCore = model.projectDecisionCore(zeroItem, {});
    const missingDom = app.document.createElement("div");
    missingDom.innerHTML = bridge.renderExcessDetailForTest(missingItem);
    const zeroDom = app.document.createElement("div");
    zeroDom.innerHTML = bridge.renderExcessDetailForTest(zeroItem);

    assert.equal(missingGrossCore.grossExcessValue.available, false, "Missing Gross must stay unavailable in the fixed header projection");
    assert.equal(missingCore.netAddressableValue.available, false, "Missing Net must stay unavailable in the fixed header projection");
    assert.equal(missingCore.opportunityScore.available, false, "Missing score must stay unavailable in the fixed header projection");
    assert.deepEqual(missingCore.grossExcessValue, missingCore.valueNarrative.fields.grossExcessValue, "Header Gross must be the canonical Value Narrative field");
    assert.deepEqual(missingCore.overlapValue, missingCore.valueNarrative.fields.overlapValue, "Header overlap must be the canonical Value Narrative field");
    assert.deepEqual(missingCore.netAddressableValue, missingCore.valueNarrative.fields.netAddressableValue, "Header Net must be the canonical Value Narrative field");
    assert.equal(missingDom.querySelector(".excess-header-value-basis > strong")?.textContent.trim(), "n. v.", "Missing Net must not render as a monetary zero");
    assert.equal(missingDom.querySelector("[data-header-opportunity-score-available] > strong")?.textContent.trim(), "n. v.", "Missing score must not render as Score 0");
    assert.equal(missingDom.querySelector("[data-header-value-basis-valid]")?.dataset.headerValueBasisValid, "false", "Invalid basis should be marked in the header");
    assert.ok(missingDom.textContent.includes("Wertbasis prüfen"), "Invalid value basis needs a visible review message");
    assert.equal(missingCore.decisionReadiness.status, "not_decidable", "Invalid value basis can never be decision-ready");
    assert.includes(missingCore.decisionReadiness.decisionLimits, "gross_net_value_basis_missing", "Readiness should expose the canonical limitation code");
    assert.equal(zeroCore.grossExcessValue.available, true, "A real zero must stay available");
    assert.ok(/^0/.test(zeroDom.querySelector(".excess-header-value-basis > strong")?.textContent.trim() || ""), "A real monetary zero should render as zero");
    assert.equal(zeroDom.querySelector("[data-header-opportunity-score-available] > strong")?.textContent.trim(), "0/100", "A real score zero should render as zero");
  });

  test("CH-EX-01A invalidates the same-reference portfolio cache after Action status and updates score/actionability", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.resetExcessPageModelBuildCountForTest();
    const before = bridge.currentExcessPageModelForTest();
    const candidate = before.cases.find(item => item.status === "Open") || before.cases[0];
    const source = bridge.getEnrichedRowsForTest().find(row => row.inventory_row_key === candidate.inventory_row_key || String(row.row_number) === String(candidate.source_row_number));
    const oldScore = candidate.excess_opportunity_score;
    const oldActionability = candidate.opportunity_score_components.actionability;
    const cacheBefore = bridge.getExcessPortfolioCacheStateForTest();
    bridge.updateActionStatusForTest(source.row_number, "Implemented");
    const after = bridge.currentExcessPageModelForTest();
    const changed = after.cases.find(item => item.case_id === candidate.case_id);
    const cacheAfter = bridge.getExcessPortfolioCacheStateForTest();

    assert.ok(source && candidate, "The sample dataset must expose an actionable Excess case and source row");
    assert.ok(cacheAfter.revision > cacheBefore.revision, "Action status must advance the cache input revision");
    assert.equal(cacheAfter.lastInvalidationReason, "action_status_changed", "Invalidation reason should identify the mutation path");
    assert.ok(cacheAfter.buildCount > cacheBefore.buildCount, "The next read must build a fresh portfolio model");
    assert.equal(changed.status, "Implemented", "The fresh model must contain the changed Action status");
    assert.ok(changed.opportunity_score_components.actionability < oldActionability, "Actionability must be recalculated after status change");
    assert.ok(changed.excess_opportunity_score < oldScore, "The final score must be recalculated after status change");
  });

  test("CH-EX-01A updates ranking after a relevant in-place input mutation", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.resetExcessPageModelBuildCountForTest();
    const before = bridge.currentExcessPageModelForTest();
    const candidate = before.cases[0];
    const source = bridge.getEnrichedRowsForTest().find(row => row.inventory_row_key === candidate.inventory_row_key || String(row.row_number) === String(candidate.source_row_number));
    bridge.mutateExcessInputForTest(source.row_number, {
      excess_value: 1,
      net_excess_value: 1,
      recovery_potential: 1,
      recovery_available_stock_value: 1,
      priority: "Low",
      owner_reference: "",
      owner_function: "",
      status: "Implemented"
    }, "excess_input_changed");
    const after = bridge.currentExcessPageModelForTest();
    const newIndex = after.cases.findIndex(item => item.case_id === candidate.case_id);

    assert.ok(source, "The highest-ranked case must map to its source row");
    assert.ok(newIndex > 0, "A material score-impacting input change must update portfolio ranking");
    assert.equal(bridge.getExcessPortfolioCacheStateForTest().lastInvalidationReason, "excess_input_changed", "The generic relevant-input path should be traceable");
  });

  test("CH-EX-01A invalidates dataset and package mutations but not presentation-only changes", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.resetExcessPageModelBuildCountForTest();
    bridge.currentExcessPageModelForTest();
    const beforeUi = bridge.getExcessPortfolioCacheStateForTest();
    bridge.updateLanguageForTest("en");
    const afterUi = bridge.getExcessPortfolioCacheStateForTest();
    bridge.updateLanguageForTest("de");
    const evaluatedAt = new Date().toISOString();
    const qualitySummary = bridge.evaluatePackageQualitySummaryForTest(evaluatedAt);
    bridge.commitCurrentInventoryPackageRevisionForTest({ operationType: "ch_ex_01a_test", qualitySummary, timestamp: evaluatedAt, builtAt: evaluatedAt });
    const afterPackage = bridge.getExcessPortfolioCacheStateForTest();
    await bridge.loadSample({ suppressSuccessFeedback: true });
    const afterDataset = bridge.getExcessPortfolioCacheStateForTest();

    assert.equal(afterUi.revision, beforeUi.revision, "Language changes must not invalidate the domain model");
    assert.equal(afterUi.buildCount, beforeUi.buildCount, "Language changes must not rebuild the cached domain model");
    assert.ok(afterPackage.revision > afterUi.revision, "An active Inventory Package revision must invalidate the model");
    assert.equal(afterPackage.lastInvalidationReason, "ch_ex_01a_test_revision", "Package invalidation should retain its operation reason");
    assert.ok(afterDataset.revision > afterPackage.revision, "Dataset reload must invalidate the model");
  });

  test("CH-EX-01A exposes score-cap metadata without changing component arithmetic", async assert => {
    const app = await helpers.loadApp();
    const engine = app.ObsoliQ.excess.opportunityScoreEngine;
    app.__obsoliqTestBridge.updateLanguageForTest("de");
    const below = engine.scoreMetadata({ a: 60, b: 39 });
    const exact = engine.scoreMetadata({ a: 60, b: 40 });
    const above = engine.scoreMetadata({ a: 60, b: 42 });
    const rendered = app.document.createElement("div");
    rendered.innerHTML = app.__obsoliqTestBridge.renderExcessScoreComponentsForTest({
      opportunity_score_components: { financial_impact: 35, urgency: 20, actionability: 20, evidence: 15, data_confidence: 12 },
      opportunity_score_metadata: above,
      excess_opportunity_score: above.finalScore
    });

    assert.deepEqual(below, { uncappedScore: 99, finalScore: 99, scoreCap: 100, maxComponentTotal: 102, wasCapped: false, cappedPoints: 0 }, "A raw score below 100 must remain unchanged");
    assert.deepEqual(exact, { uncappedScore: 100, finalScore: 100, scoreCap: 100, maxComponentTotal: 102, wasCapped: false, cappedPoints: 0 }, "A raw score of 100 must remain unchanged");
    assert.deepEqual(above, { uncappedScore: 102, finalScore: 100, scoreCap: 100, maxComponentTotal: 102, wasCapped: true, cappedPoints: 2 }, "A raw score above 100 must be capped transparently");
    assert.equal(Object.values({ financial_impact: 35, urgency: 20, actionability: 20, evidence: 15, data_confidence: 12 }).reduce((sum, value) => sum + value, 0), above.uncappedScore, "Component sum must explain the uncapped score");
    assert.equal(rendered.querySelector("[data-score-was-capped]")?.dataset.scoreWasCapped, "true", "Renderer should consume canonical cap metadata");
    assert.ok(rendered.textContent.includes("Rohwert 102") && rendered.textContent.includes("2 Punkte gedeckelt"), "A real cap must be visible and explainable");
  });

  test("CH-EX-01A.1 verifies the real Engine-Service-Workspace-Renderer contract chain", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const engine = app.ObsoliQ.excess.opportunityScoreEngine;
    const workspace = app.ObsoliQ.excess.decisionWorkspaceModel;
    const service = app.ObsoliQ.application.excessAnalysisService;
    const pageModel = bridge.currentExcessPageModelForTest();
    const item = pageModel.cases[0];
    const metadata = item.opportunity_score_metadata;
    const core = workspace.projectDecisionCore(item, {});
    const completeDom = app.document.createElement("div");
    completeDom.innerHTML = bridge.renderExcessDetailForTest(item);

    assert.ok(engine && service && workspace && item, "The real product chain must be loaded and produce an Excess Case");
    assert.deepEqual(pageModel.metadata.decisionContracts, {
      workspaceProjection: "3",
      decisionReadiness: "excess-decision-readiness-v2",
      grossNetReconciliation: "gross-net-reconciliation-v1"
    }, "The Application Service must emit the canonical Decision contract versions");
    assert.deepEqual(core.contractVersions, pageModel.metadata.decisionContracts, "Workspace and Service contract metadata must agree");
    assert.equal(core.projectionVersion, "3", "The selected Case must use Workspace Projection 3");
    assert.equal(core.decisionReadiness.version, "excess-decision-readiness-v2", "The selected Case must use Readiness v2");
    assert.equal(core.valueNarrative.contractVersion, "gross-net-reconciliation-v1", "The Value Narrative must use Reconciliation v1");
    assert.equal(core.valueNarrative.reconciliation.contractVersion, "gross-net-reconciliation-v1", "The central validator must emit Reconciliation v1");

    ["opportunityScore", "grossExcessValue", "overlapValue", "netAddressableValue"].forEach(fieldName => {
      const field = core[fieldName];
      assert.equal(typeof field?.available, "boolean", `${fieldName} must expose Availability`);
      assert.ok(Object.prototype.hasOwnProperty.call(field || {}, "value"), `${fieldName} must expose value`);
      assert.ok(Object.prototype.hasOwnProperty.call(field || {}, "reason"), `${fieldName} must expose reason`);
    });
    assert.equal(core.opportunityScore.value, metadata.finalScore, "Workspace score must pass through the Engine final score");
    assert.equal(core.opportunityScore.uncappedScore.value, metadata.uncappedScore, "Workspace must pass through the Engine uncapped score");
    assert.equal(core.opportunityScore.scoreCap.value, metadata.scoreCap, "Workspace must pass through the Engine score cap");
    assert.equal(core.opportunityScore.cappedPoints.value, metadata.cappedPoints, "Workspace must pass through capped points");
    assert.equal(core.opportunityScore.wasCapped, metadata.wasCapped, "Workspace must pass through the Engine cap flag");
    assert.equal(completeDom.querySelector("[data-header-value-basis-valid]")?.dataset.headerValueBasisValid, "true", "The real complete Case must render a valid value basis");
    assert.equal(completeDom.querySelector("[data-header-opportunity-score-available]")?.dataset.headerOpportunityScoreAvailable, "true", "The real complete Case must render an available score");

    const inconsistentItem = {
      ...item,
      grossToNetExplanation: {
        ...item.grossToNetExplanation,
        grossExcessValue: 100,
        overlapValue: 20,
        netAddressableExcessValue: 90,
        currencyUnit: "EUR"
      }
    };
    const inconsistentDom = app.document.createElement("div");
    inconsistentDom.innerHTML = bridge.renderExcessDetailForTest(inconsistentItem);
    assert.equal(inconsistentDom.querySelector("[data-header-value-basis-valid]")?.dataset.headerValueBasisValid, "false", "An inconsistent Service Case projection must fail closed in the renderer");
    assert.ok(inconsistentDom.textContent.includes("Wertbasis prüfen"), "The inconsistent browser path must show the review status");

    const cappedItem = engine.scoreExcessCases({
      cases: [{
        ...item,
        net_addressable_excess_value: 100,
        gross_excess_value: 100,
        priority: "High",
        status: "Open",
        owner_function: "Material Planning",
        owner_reference: "G06",
        owner_assignment_confidence: "High",
        relationship_match_type: "exact_material_plant",
        material_master_package_id: "MM-1",
        inventory_package_id: "INV-1",
        confidence: "High",
        limitations: []
      }]
    })[0];
    const cappedCore = workspace.projectDecisionCore(cappedItem, {});
    const cappedDom = app.document.createElement("div");
    cappedDom.innerHTML = bridge.renderExcessDetailForTest(cappedItem);
    assert.equal(cappedItem.opportunity_score_metadata.uncappedScore, 102, "The real Engine must retain the 102-point raw score");
    assert.equal(cappedItem.opportunity_score_metadata.finalScore, 100, "The real Engine must cap the final score at 100");
    assert.equal(cappedItem.opportunity_score_metadata.cappedPoints, 2, "The real Engine must expose two capped points");
    assert.equal(cappedCore.opportunityScore.wasCapped, true, "The Workspace must receive the Engine cap flag");
    assert.equal(cappedDom.querySelector("[data-score-was-capped]")?.dataset.scoreWasCapped, "true", "The Renderer must consume the cap metadata");
    assert.ok(cappedDom.textContent.includes("2 Punkte gedeckelt"), "The real browser renderer must show the cap note");
  });

  test("CH-EX-01A bounds diagnostics and provides canonical DE/EN translation keys", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    let productLog = [];
    let testLog = [];
    for (let index = 0; index < 100; index += 1) {
      productLog = bridge.appendRuntimeBuildLogForTest(productLog, { index }, { enabled: false });
      testLog = bridge.appendRuntimeBuildLogForTest(testLog, { index }, { enabled: true });
    }
    const translations = bridge.getTranslationsForTest();

    assert.equal(productLog.length, 0, "Production diagnostics must not accumulate build entries");
    assert.equal(testLog.length, bridge.runtimeBuildLogLimitForTest, "Test diagnostics must use the bounded buffer");
    assert.equal(testLog[0].index, 50, "The bounded buffer should retain the newest diagnostic entries");
    assert.equal(testLog[testLog.length - 1].index, 99, "The newest test diagnostic must remain available");
    assert.equal(translations.de.netConsumption3m, "Nettoverbrauch 3M", "German 3M consumption key must exist");
    assert.equal(translations.de.netConsumption6m, "Nettoverbrauch 6M", "German 6M consumption key must exist");
    assert.equal(translations.en.netConsumption3m, "Net Consumption 3M", "English 3M consumption key must exist");
    assert.equal(translations.en.netConsumption6m, "Net Consumption 6M", "English 6M consumption key must exist");
    assert.equal(translations.de.importError, "Fehler beim Import", "German importError must exist");
    assert.equal(translations.en.importError, "Import error", "English importError must exist");
  });
})();
