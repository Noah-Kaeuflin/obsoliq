(() => {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function setControl(app, selector, value, eventName = "change") {
    const control = app.document.querySelector(selector);
    if (!control) throw new Error(`Missing control ${selector}`);
    control.value = value;
    control.dispatchEvent(new app.Event(eventName, { bubbles: true }));
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

  test("EX-UX-01.5 aligns four equal Summary cards and reveals Reset only for active filters", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();

    const cards = [...app.document.querySelectorAll(".excess-summary-card")];
    const widths = cards.map(card => card.getBoundingClientRect().width);
    const heights = cards.map(card => card.getBoundingClientRect().height);
    const reset = app.document.getElementById("excessResetFilters");

    assert.equal(cards.length, 4, "The accepted four-item Summary contract must remain intact");
    assert.ok(Math.max(...widths) - Math.min(...widths) <= 2, "Summary cards should have equal desktop widths");
    assert.ok(Math.max(...heights) - Math.min(...heights) <= 2, "Summary cards should have equal heights");
    assert.ok(cards[2].textContent.includes("Ø Priorisierungsscore"), "Prioritization label should remain precise and localized");
    assert.ok(cards[3].textContent.includes("Brutto → Netto"), "Addressability should use the concise Gross-to-Net label");
    assert.equal(reset.hidden, true, "Reset should stay hidden in the null-filter state");

    const material = bridge.currentExcessPageModelForTest().cases[0].material_id;
    setControl(app, "#searchInput", material, "input");
    assert.equal(reset.hidden, false, "Reset should appear when an Excess filter is active");
    reset.click();
    assert.equal(reset.hidden, true, "Reset should disappear after restoring the null-filter state");
  });

  test("EX-UX-01.5 fixes Worklist columns and removes duplicate Priority from the Case header", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();

    const table = app.document.querySelector(".excess-table");
    const firstRow = table.querySelector("tbody tr");
    const cells = firstRow.querySelectorAll("td");
    const core = app.document.querySelector(".excess-decision-core");

    assert.equal(table.querySelectorAll("colgroup col").length, 6, "Worklist should expose six stable column tracks");
    assert.equal(app.getComputedStyle(cells[1]).textAlign, "right", "Money should be right aligned");
    assert.equal(app.getComputedStyle(cells[2]).textAlign, "center", "Score should be centered");
    assert.equal(app.getComputedStyle(cells[4]).textAlign, "center", "Priority should be centered");
    assert.equal(core.querySelectorAll(".excess-case-badges .action-badge").length, 1, "Only workflow status should remain in the badge row");
    assert.ok(core.querySelector(".excess-inline-stats")?.textContent.includes("Priorität"), "Priority should remain visible once in the metric row");
    assert.ok(core.querySelector("[data-open-excess-actions].primary"), "Actions handoff should be the primary Case action");
    assert.ok(app.document.querySelector(".excess-pagination")?.textContent.includes("Fälle"), "Pagination should describe business Cases instead of technical rows");
  });

  test("EX-UX-01.5 provides five true local tabs without changing the analytical model", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const before = modelSignature(bridge.currentExcessPageModelForTest());
    const scroll = app.document.querySelector(".excess-detail-scroll");
    const navigation = scroll.querySelector(".excess-detail-section-nav");
    const buttons = [...navigation.querySelectorAll("[data-excess-detail-target]")];
    const sections = [...scroll.querySelectorAll(":scope > .excess-detail-card > [role='tabpanel']")];

    assert.deepEqual(buttons.map(button => button.dataset.excessDetailTarget), ["decision", "value", "history", "prioritization", "actions"], "Local navigation should follow the accepted detail sequence");
    assert.deepEqual(sections.map(section => section.dataset.excessDetailSection), ["decision", "value", "history", "prioritization", "actions"], "Each guide item should resolve to one existing section");
    assert.equal(buttons[0].getAttribute("aria-selected"), "true", "Decision should be the selected tab initially");
    assert.equal(buttons.every(button => button.getAttribute("role") === "tab"), true, "Every navigation control should expose ARIA tab semantics");
    assert.equal(sections.every(section => section.getAttribute("role") === "tabpanel"), true, "Every detail section should expose ARIA tabpanel semantics");
    navigation.querySelector("[data-excess-detail-target='prioritization']").click();
    assert.equal(navigation.querySelector("[aria-selected='true']")?.dataset.excessDetailTarget, "prioritization", "Clicking a tab should update the selected ARIA state");
    assert.equal(sections.filter(section => !section.hidden).length, 1, "Tab activation should leave exactly one visible panel");
    assert.equal(sections.find(section => !section.hidden)?.dataset.excessDetailSection, "prioritization", "The selected tab and visible panel should agree");
    assert.equal(scroll.querySelectorAll("[data-excess-section-anchor]").length, 0, "Legacy jump anchors should no longer exist");
    assert.equal(modelSignature(bridge.currentExcessPageModelForTest()), before, "Section navigation must remain presentation-only");
  });

  test("EX-UX-01.5 leads with the next review step and reduces equal-weight Narrative cards", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const narrative = app.document.querySelector("[data-decision-narrative-grid]");
    const nextStep = narrative.querySelector("[data-next-step]");

    assert.equal(narrative.firstElementChild, nextStep, "Next Review Step should be the first decision block");
    assert.equal(app.getComputedStyle(nextStep).backgroundColor === app.getComputedStyle(narrative.querySelector(".why-prioritized")).backgroundColor, false, "Next Review Step should carry the primary visual emphasis");
    assert.ok(parseFloat(app.getComputedStyle(narrative.querySelector(".why-prioritized")).borderTopWidth) <= 1, "Secondary reasoning should remain a restrained supporting card");
    const readinessStyle = app.getComputedStyle(narrative.querySelector(".excess-readiness-card"));
    assert.notEqual(readinessStyle.backgroundColor, app.getComputedStyle(nextStep).backgroundColor, "Readiness should remain visually secondary to the Next Review Step");
    assert.ok(parseFloat(readinessStyle.borderTopWidth) <= 1, "Readiness should use only a restrained component boundary");
  });

  test("EX-UX-01.5 presents Gross minus deductions equals Net without a second calculation", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const model = bridge.currentExcessPageModelForTest();
    const active = bridge.getExcessPageStateForTest().activeCase;
    const value = app.document.querySelector("[data-value-bridge]");
    const roles = [...value.querySelectorAll("[data-bridge-role]")];

    assert.deepEqual(roles.map(row => row.dataset.bridgeRole), ["gross", "deduction", "net"], "Equation must retain Gross, deduction and Net in order");
    assert.deepEqual(roles.map(row => Number(row.dataset.bridgeValue)), [active.gross_excess_value, active.excess_overlap_value, active.net_addressable_excess_value], "Equation values must pass through the accepted Case projection unchanged");
    assert.equal(value.querySelectorAll(".excess-value-equation-track").length, 0, "The relationship should not resemble a realization progress track");
    assert.equal(value.querySelectorAll(".excess-value-track").length, 0, "The value relationship should no longer look like three unrelated bar rows");
    assert.equal(modelSignature(bridge.currentExcessPageModelForTest()), modelSignature(model), "Value rendering must not mutate Excess analytics");
  });

  test("EX-UX-01.5 keeps readable detail copy and exactly one internal scroll owner per pane", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    const worklist = app.document.querySelector(".excess-table-wrap");
    const detail = app.document.querySelector(".excess-detail-scroll");
    const readableSelectors = [
      ".excess-primary-decision p",
      ".excess-primary-decision li",
      ".excess-readiness-matrix-list li",
      ".excess-detail-note",
      ".excess-action-option-meta dd"
    ];
    const readableNodes = readableSelectors.flatMap(selector => [...app.document.querySelectorAll(selector)]);

    assert.equal(app.getComputedStyle(worklist).overflowY, "auto", "Worklist should own its one internal vertical scroll");
    assert.equal(app.getComputedStyle(detail).overflowY, "auto", "Detail should own its one internal vertical scroll");
    assert.equal(app.getComputedStyle(app.document.querySelector(".excess-worklist-panel")).overflowY, "hidden", "Worklist panel itself should not create a second scroll");
    assert.equal(app.getComputedStyle(app.document.querySelector(".excess-detail-panel")).overflowY, "hidden", "Detail panel itself should not create a second scroll");
    assert.ok(readableNodes.length > 0 && readableNodes.every(node => parseFloat(app.getComputedStyle(node).fontSize) >= 11.5), "Long-form decision copy should remain at least 11.5px");
  });
})();
