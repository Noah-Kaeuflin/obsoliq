(() => {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function mountMarkup(app, markup) {
    const host = app.document.createElement("div");
    host.innerHTML = markup;
    return host;
  }

  function modelSignature(model = {}) {
    return JSON.stringify({
      summary: model.summary,
      cases: (model.cases || []).map(item => [
        item.case_id,
        item.gross_excess_value,
        item.excess_overlap_value,
        item.net_addressable_excess_value,
        item.excess_opportunity_score
      ])
    });
  }

  test("EX-UX-01.6 uses one true tab mechanism with rerender-safe bindings", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    bridge.renderExcessPageForTest();

    const scroll = app.document.querySelector(".excess-detail-scroll");
    const navigation = scroll.querySelector(".excess-detail-section-nav");
    const panels = [...scroll.querySelectorAll("[role='tabpanel'][data-excess-detail-section]")];
    const keys = ["decision", "value", "history", "prioritization", "actions"];
    assert.deepEqual(panels.map(panel => panel.dataset.excessDetailSection), keys, "Exactly five ordered tab panels should exist");
    assert.equal(navigation.getAttribute("role"), "tablist", "The local navigation should expose a tablist");
    assert.equal(navigation.querySelector("[aria-selected='true']")?.dataset.excessDetailTarget, "decision", "Decision should be selected initially");
    assert.equal(scroll.querySelectorAll("[data-excess-section-anchor]").length, 0, "The old section anchors must be absent");
    navigation.querySelector("[data-excess-detail-target='value']").click();
    assert.equal(navigation.querySelector("[aria-selected='true']")?.dataset.excessDetailTarget, "value", "Click state and selected tab should agree");
    assert.equal(panels.filter(panel => !panel.hidden).length, 1, "Exactly one panel should remain visible after a rerender-safe click");
    assert.equal(panels.find(panel => !panel.hidden)?.dataset.excessDetailSection, "value", "Value logic should be the only visible panel");

    const valueTab = navigation.querySelector("[data-excess-detail-target='value']");
    valueTab.dispatchEvent(new app.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    assert.equal(navigation.querySelector("[aria-selected='true']")?.dataset.excessDetailTarget, "history", "ArrowRight should activate the next tab");
  });

  test("EX-UX-01.6 keeps the six-column Worklist readable and accessible", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const table = app.document.querySelector(".excess-table");
    const cols = [...table.querySelectorAll("colgroup col")];
    const scoreLabel = table.querySelector("thead th:nth-child(3) .column-filter-label");
    const openHeader = table.querySelector("thead th:nth-child(6)");
    const cells = table.querySelectorAll("tbody tr:first-child td");
    const tableWidth = table.getBoundingClientRect().width;
    const columnPercentages = [...cells].map(cell => cell.getBoundingClientRect().width / tableWidth * 100);

    assert.equal(cols.length, 6, "The Worklist should retain six explicit column tracks");
    assert.ok(columnPercentages.every((value, index) => Math.abs(value - [26, 20, 9, 25, 13, 7][index]) < 0.6), "Column tracks should use the accepted 26/20/9/25/13/7 split");
    assert.equal(scoreLabel?.textContent.trim(), "Score", "The visible score header must remain short");
    assert.equal(scoreLabel?.getAttribute("title"), "Opportunity Score", "The full score meaning should be available as a title");
    assert.equal(scoreLabel?.getAttribute("aria-label"), "Opportunity Score", "The score header should expose an accessible full label");
    assert.equal(openHeader?.querySelector(".excess-visually-hidden")?.textContent.trim(), "Fall öffnen", "The opening column must retain an accessible label");
    assert.ok(openHeader?.querySelector(".excess-visually-hidden")?.getBoundingClientRect().width <= 1, "The opening label should remain visually hidden");
    assert.equal(app.getComputedStyle(cells[1]).textAlign, "right", "Money should remain right aligned");
    assert.equal(app.getComputedStyle(cells[2]).textAlign, "center", "Score should remain centered");
    assert.equal(app.getComputedStyle(cells[4]).textAlign, "center", "Priority should remain centered");
  });

  test("EX-UX-01.6 deduplicates equal review steps in German and English", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const core = {
      decisionReadiness: {
        status: "review",
        existingEvidence: ["case_identity"],
        missingEvidence: ["historical_evidence"],
        decisionLimits: [],
        whyNotHigher: [],
        nextCheck: "Demand owner should confirm whether future demand exists"
      }
    };

    const germanPrimary = "  Bedarfsverantwortlicher soll bestätigen, ob zukünftiger Bedarf existiert. ";
    let host = mountMarkup(app, bridge.renderExcessDecisionReadinessForTest(core, germanPrimary));
    assert.equal(host.querySelectorAll(".excess-readiness-next").length, 0, "Whitespace, case and final punctuation should not duplicate an equal German step");

    host = mountMarkup(app, bridge.renderExcessDecisionReadinessForTest(core, "Materialstamm prüfen"));
    assert.ok(host.querySelector(".excess-readiness-next")?.textContent.includes("Zusätzlich benötigte Evidenz"), "A different German check should be relabeled as additional evidence");

    bridge.updateLanguageForTest("en");
    host = mountMarkup(app, bridge.renderExcessDecisionReadinessForTest(core, "demand owner should confirm whether future demand exists."));
    assert.equal(host.querySelectorAll(".excess-readiness-next").length, 0, "Equal English steps should also be deduplicated");
    host = mountMarkup(app, bridge.renderExcessDecisionReadinessForTest(core, "Validate the material master"));
    assert.ok(host.querySelector(".excess-readiness-next")?.textContent.includes("Additional evidence required"), "A different English check should keep its own semantic label");
    bridge.updateLanguageForTest("de");
  });

  test("EX-UX-01.6 separates prioritization, cause signals and compact Readiness", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const causeHost = mountMarkup(app, bridge.renderExcessCauseHypothesisForTest({
      causeHypothesis: {
        available: true,
        hypothesis: "Inventory without visible current demand",
        classificationKey: "excessCauseRuleBasedNotice",
        supportingSignals: [
          { signalCode: "duplicate", labelKey: "why_high_priority" },
          { signalCode: "one", labelKey: "evidence_owner_reference_available" },
          { signalCode: "two", labelKey: "evidence_exact_material_plant_match" },
          { signalCode: "three", labelKey: "evidence_overlap_deducted_from_gross_excess" }
        ]
      }
    }, ["why_high_priority"]));
    assert.equal(causeHost.querySelectorAll(":scope > section > .excess-signal-list > li").length, 2, "At most two non-duplicated cause signals should be directly visible");
    assert.equal(causeHost.querySelectorAll(".excess-cause-more .excess-signal-list li").length, 1, "Remaining cause signals should stay in one compact disclosure");
    assert.ok(causeHost.querySelector(".excess-hypothesis-note")?.textContent.includes("Regelbasierte Hypothese"), "The cause must retain its rule-based limitation");

    const readinessHost = mountMarkup(app, bridge.renderExcessDecisionReadinessForTest({
      decisionReadiness: {
        status: "review",
        existingEvidence: ["case_identity", "gross_net_value_basis", "root_cause", "recommended_action", "owner_assignment"],
        missingEvidence: ["exact_relationship", "historical_evidence", "owner_reference"],
        decisionLimits: ["purchase_order_context_not_available"],
        whyNotHigher: ["why_non_exact_match_limits_confidence"],
        nextCheck: ""
      }
    }));
    const readiness = readinessHost.querySelector(".excess-readiness-card");
    assert.equal(readiness.dataset.existingEvidenceCount, "5", "Available count must come from existing evidence");
    assert.equal(readiness.dataset.openEvidenceCount, "5", "Open count must include existing missing, limits and why-not-higher entries only");
    assert.equal(readiness.querySelectorAll(".excess-readiness-grid .available li").length, 4, "The visible available column should be capped at four rows");
    assert.equal(readiness.querySelectorAll(".excess-readiness-grid .open li").length, 4, "The visible open column should be capped at four rows");
    assert.equal([...readiness.children].some(node => node.matches?.(".excess-readiness-source-label")), false, "Why-not-higher must not appear as a separate duplicate line");
    assert.ok(readiness.querySelector(".excess-readiness-more"), "Overflow evidence should remain available in the existing disclosure");
  });

  test("EX-UX-01.6 closes value, history, context, action and terminology presentation", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    const before = modelSignature(bridge.currentExcessPageModelForTest());
    bridge.renderExcessPageForTest();
    const page = app.document.getElementById("excessPage");

    assert.equal(page.querySelectorAll(".excess-value-equation-track").length, 0, "The value bridge must not use a realization-like progress track");
    assert.ok(page.querySelector("[data-value-reconciliation]")?.textContent.includes("Brutto"), "The bridge should explain Gross-to-Net as an equation");
    assert.ok(page.querySelector(".excess-value-boundary")?.textContent.includes("noch nicht genehmigt oder realisiert"), "The identified-potential boundary should remain explicit");
    assert.equal(page.querySelector(".excess-historical-state.unavailable button")?.textContent.trim(), "Verbrauchshistorie importieren", "Historical import should name the exact source package");
    assert.equal(page.querySelectorAll(".excess-action-option.primary .excess-action-primary-fields > div").length, 2, "The primary option should expose Decision Type and Next Check directly");
    assert.ok(page.querySelector(".excess-action-option.primary .excess-action-evidence-disclosure"), "Evidence and derivation should move into one disclosure");
    const operationalTerms = [...page.querySelectorAll(".excess-operational-context > div > dt")].map(node => node.textContent.trim());
    assert.ok(operationalTerms.includes("Kategorie"), "Operational context should label category semantically");
    assert.ok(operationalTerms.includes("Match"), "Operational context should label match state semantically");
    assert.ok(page.querySelectorAll(".excess-summary-card")[2]?.textContent.includes("Ø Priorisierungsscore"), "German prioritization terminology should be complete");
    assert.ok(page.textContent.includes("keine Erfolgsprognose"), "The score disclaimer should avoid probability wording");
    assert.equal(modelSignature(bridge.currentExcessPageModelForTest()), before, "Presentation closure must not mutate the analytical model");
  });

  test("EX-UX-01.6 enforces the accepted Excess typography, colors and compact controls", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const page = app.document.getElementById("excessPage");
    const navigation = page.querySelector(".excess-detail-section-nav");
    const navButtons = [...navigation.querySelectorAll("button")];
    const summaryCards = [...page.querySelectorAll(".excess-summary-card")];
    const detailText = [...page.querySelectorAll(".excess-primary-decision p, .excess-primary-decision li, .excess-readiness-matrix-list li, .excess-detail-note, .excess-action-option-meta dd")];
    const visibleElements = [...page.querySelectorAll("*")].filter(node => node.getClientRects().length && app.getComputedStyle(node).display !== "none");
    const invalidWeights = visibleElements.map(node => Number(app.getComputedStyle(node).fontWeight)).filter(weight => ![400, 500, 600, 700].includes(weight));

    assert.ok(navButtons.every(button => button.getBoundingClientRect().height >= 34), "Each local navigation target should be at least 34px high");
    assert.ok(navButtons.every(button => parseFloat(app.getComputedStyle(button).fontSize) >= 11.5), "Local navigation text should be readable");
    assert.ok(detailText.length > 0 && detailText.every(node => parseFloat(app.getComputedStyle(node).fontSize) >= 12), "Normal Excess detail copy should be at least 12px");
    assert.equal(invalidWeights.length, 0, "Visible Excess typography should use only 400/500/600/700 weights");
    assert.ok(summaryCards.every(card => Math.abs(card.getBoundingClientRect().height - 82) <= 1), "All four KPI cards should resolve to the 82px target height");

    const neutralStatus = app.document.createElement("span");
    neutralStatus.className = "excess-option-status not_checkable";
    neutralStatus.textContent = "Nicht prüfbar";
    page.appendChild(neutralStatus);
    const neutralStyle = app.getComputedStyle(neutralStatus);
    const danger = app.getComputedStyle(app.document.documentElement).getPropertyValue("--danger").trim();
    assert.notEqual(neutralStyle.color, danger, "Not-checkable must no longer use the error color");
    neutralStatus.remove();
  });
})();
