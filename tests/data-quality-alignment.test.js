(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function waitFor(condition, label, timeoutMs = 4000) {
    const started = performance.now();
    return new Promise((resolve, reject) => {
      function tick() {
        try {
          const value = condition();
          if (value) {
            resolve(value);
            return;
          }
        } catch (error) {
          reject(error);
          return;
        }
        if (performance.now() - started > timeoutMs) {
          reject(new Error(`Timed out waiting for ${label}`));
          return;
        }
        setTimeout(tick, 25);
      }
      tick();
    });
  }

  function setFrameSize(width, height) {
    const frame = document.getElementById("appFrame");
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    frame.style.left = "0";
    frame.style.top = "0";
    frame.style.position = "fixed";
    frame.style.border = "0";
  }

  async function loadDataQualityAt(width = 1280, height = 800) {
    setFrameSize(width, height);
    const app = await helpers.loadSampleApp();
    app.document.querySelector('[data-process="data-quality"]').click();
    await waitFor(() => app.document.querySelector("#dataCheck .remediation-workspace"), "Data Quality workspace");
    return app;
  }

  function exactDuplicateIssue(app) {
    const issue = app.__obsoliqTestBridge.getDataQualityIssues()
      .find(item => item.issueType === "exact_duplicate");
    if (!issue) throw new Error("No exact duplicate issue found in sample dataset");
    return issue;
  }

  function openIssue(app, issueId) {
    const button = app.document.querySelector(`[data-remediation-review="${issueId}"]`);
    if (!button) throw new Error(`Review button missing for ${issueId}`);
    button.click();
    return waitFor(() => app.document.getElementById("remediationIssueModal").classList.contains("active"), "Review Sheet opens");
  }

  test("DQ-UX-02.3 Remediation overview replaces separate Health Card and keeps Pilot cap in diagnostics", async assert => {
    const app = await loadDataQualityAt();
    const card = app.document.querySelector(".data-quality-health-card");
    const overview = app.document.querySelector(".remediation-overview");
    const scoreTile = app.document.querySelector("[data-score-diagnostic-toggle]");
    const quickCards = [...app.document.querySelectorAll(".remediation-summary-card")];
    const alert = app.document.querySelector(".remediation-readiness-alert");
    const diagnosticsText = app.document.querySelector(".data-quality-diagnostics").textContent;

    assert.equal(card, null, "Separate Health Card should not render above the remediation workspace");
    assert.ok(overview, "Score and issue summary should live inside the remediation workspace");
    assert.ok(scoreTile?.textContent.includes("78 %"), "Score tile should show the Data Quality Score compactly");
    assert.ok(scoreTile?.textContent.includes("Datenqualität"), "Score tile should use concise Data Quality wording");
    assert.equal(quickCards.length, 5, "Five quick-filter issue cards should remain available");
    assert.equal(alert, null, "Limited Pilot Capability should not render as a primary workflow alert");
    assert.ok(!overview.textContent.includes("Analysebereitschaft"), "Green Analysis Readiness should not dominate the primary workflow");
    assert.ok(!overview.textContent.includes("Workflow-Datenbasis"), "Green Workflow Readiness should not dominate the primary workflow");
    assert.ok(diagnosticsText.includes("Gedeckelter Pilot-Score"), "Capped Pilot value should move to diagnostics");
    assert.ok(diagnosticsText.includes("Dataset-Pilotfähigkeit"), "Pilot Capability should remain available in Score diagnostics");

    scoreTile.click();
    assert.equal(app.document.querySelector('.data-quality-diagnostic[data-diagnostic-key="explainScore"]').open, true, "Score tile should open Score diagnostics");
  });

  test("DQ-UX-02.3 Demo Dataset context is reduced to compact chips", async assert => {
    const app = await loadDataQualityAt();
    const note = app.document.querySelector(".data-quality-demo-note.compact");
    const chip = app.document.querySelector(".data-quality-demo-chip");
    const chipStyle = app.getComputedStyle(chip);

    assert.equal(note, null, "Demo context should no longer render as a full-width notice row");
    assert.ok(chip.textContent.includes("11"), "Sample issue count should remain dynamic in the compact chip");
    assert.ok(chip.textContent.includes("Demo"), "Chip should clearly label the sample as demo context");
    assert.ok(chip.getAttribute("title").length > 0, "Chip should keep the explanatory demo tooltip");
    assert.ok(chipStyle.display.includes("flex"), "Demo context should use the same compact chip system as dataset context");
  });

  test("DQ-UX-02.1 Remediation radios and checkboxes are isolated from full-width text inputs", async assert => {
    const app = await loadDataQualityAt();
    const issue = exactDuplicateIssue(app);
    await openIssue(app, issue.issueId);

    const radio = app.document.querySelector('input[name="remediationExactDuplicateDecision"]');
    const radioStyle = app.getComputedStyle(radio);
    assert.ok(parseFloat(radioStyle.width) <= 20, "Duplicate radio width should stay compact");
    assert.ok(parseFloat(radioStyle.minWidth) <= 20, "Duplicate radio min-width should stay compact");

    const card = app.document.querySelector(".remediation-control-card");
    const checkbox = app.document.createElement("input");
    checkbox.type = "checkbox";
    card.appendChild(checkbox);
    const checkboxStyle = app.getComputedStyle(checkbox);
    assert.ok(parseFloat(checkboxStyle.width) <= 20, "Remediation checkbox width should stay compact");

    app.document.getElementById("remediationIssueCloseButton").click();
    const invalid = app.__obsoliqTestBridge.getDataQualityIssues()
      .find(item => ["invalid_numeric_value", "negative_recovery_input", "invalid_identifier"].includes(item.issueType));
    await openIssue(app, invalid.issueId);
    const textInput = app.document.querySelector(".remediation-control-card input:not([type='radio']):not([type='checkbox'])");
    const textStyle = app.getComputedStyle(textInput);
    assert.ok(parseFloat(textStyle.width) > 100, "Text inputs should retain full-width control sizing");
    assert.ok(parseFloat(textStyle.minHeight) >= 34, "Text inputs should retain control min-height");
    assert.ok(parseFloat(textStyle.paddingLeft) > 0, "Text inputs should retain padding");
  });

  test("DQ-UX-02.1 exact duplicate options are left-aligned clickable cards without default selection", async assert => {
    const app = await loadDataQualityAt();
    const issue = exactDuplicateIssue(app);
    await openIssue(app, issue.issueId);

    const options = [...app.document.querySelectorAll(".remediation-decision-option")];
    const radios = [...app.document.querySelectorAll('input[name="remediationExactDuplicateDecision"]')];
    assert.equal(options.length, issue.sourceRowIndexes.length + 1, "Renderer should expose one keeper option per duplicate row plus keep-all");
    assert.equal(radios.filter(input => input.checked).length, 0, "Fresh exact duplicate review should not preselect a decision");
    assert.ok(options.some(option => option.textContent.includes("Alle Positionen beibehalten")), "Keep-all option should use action-oriented wording");

    const firstOption = options[0];
    const radio = firstOption.querySelector("input");
    const copy = firstOption.querySelector(".remediation-decision-copy");
    assert.equal(app.getComputedStyle(firstOption).textAlign, "left", "Option card text should be left aligned");
    assert.ok(copy.getBoundingClientRect().left > radio.getBoundingClientRect().right, "Option copy should begin to the right of the compact radio");

    firstOption.click();
    assert.equal(radio.checked, true, "Clicking the full option card should check the radio");
    assert.ok(app.getComputedStyle(firstOption).borderColor !== app.getComputedStyle(options[1]).borderColor, "Selected option should be visually distinct");
  });

  test("DQ-UX-02.1 exact duplicate option wording supports two-row and three-plus groups", async assert => {
    const app = await loadDataQualityAt();
    const bridge = app.__obsoliqTestBridge;
    const original = exactDuplicateIssue(app);
    const twoRowIssue = {
      ...original,
      issueId: `${original.issueId}-TWO`,
      issueKey: `${original.issueKey}::two-row-test`,
      sourceRowIndexes: original.sourceRowIndexes.slice(0, 2)
    };

    bridge.setDataQualityIssueSnapshotForTest([twoRowIssue]);
    bridge.syncDataQualityIssueLedger([twoRowIssue]);
    bridge.renderDataQualityForTest();
    await waitFor(() => app.document.querySelector(".remediation-workspace"), "rerendered two-row worklist");
    await openIssue(app, twoRowIssue.issueId);
    let options = [...app.document.querySelectorAll(".remediation-decision-option")];
    assert.equal(options.length, 3, "Two-row duplicate should render two keeper options plus keep-all");
    assert.equal(app.document.querySelectorAll('input[name="remediationExactDuplicateDecision"]:checked').length, 0, "Two-row duplicate should not preselect a decision");
    assert.ok(options[0].textContent.includes(String(twoRowIssue.sourceRowIndexes[1])), "Two-row description should name the single excluded row");

    app.document.getElementById("remediationIssueCloseButton").click();
    const fourRowIndexes = [
      ...original.sourceRowIndexes,
      ...Array.from({ length: 12 }, (_, index) => index + 1).filter(rowIndex => !original.sourceRowIndexes.includes(rowIndex))
    ].slice(0, 4);
    const fourRowIssue = {
      ...original,
      issueId: `${original.issueId}-FOUR`,
      issueKey: `${original.issueKey}::four-row-test`,
      sourceRowIndexes: fourRowIndexes
    };
    bridge.setDataQualityIssueSnapshotForTest([fourRowIssue]);
    bridge.syncDataQualityIssueLedger([fourRowIssue]);
    bridge.renderDataQualityForTest();
    await waitFor(() => app.document.querySelector(".remediation-workspace"), "rerendered full duplicate worklist");
    await openIssue(app, fourRowIssue.issueId);
    options = [...app.document.querySelectorAll(".remediation-decision-option")];
    assert.equal(options.length, fourRowIssue.sourceRowIndexes.length + 1, "Three-plus duplicate groups should render arbitrary keeper options plus keep-all");
    assert.ok(options[0].textContent.includes(String(fourRowIssue.sourceRowIndexes.length - 1)), "Three-plus description should count excluded exact copies");
    assert.equal(app.document.querySelectorAll('input[name="remediationExactDuplicateDecision"]:checked').length, 0, "Three-plus duplicate should not preselect a decision");
  });
})();
