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

  function issueByType(app, issueType) {
    const issue = app.__obsoliqTestBridge.getDataQualityIssues().find(item => item.issueType === issueType);
    if (!issue) throw new Error(`No ${issueType} issue found in sample dataset`);
    return issue;
  }

  function openIssue(app, issueId) {
    const button = app.document.querySelector(`[data-remediation-review="${issueId}"]`);
    if (!button) throw new Error(`Review button missing for ${issueId}`);
    button.click();
    return waitFor(() => app.document.getElementById("remediationIssueModal").classList.contains("active"), "Review Sheet opens");
  }

  test("DQ-UX-02.2 Review footer keeps Cancel before primary and disables invalid duplicate decisions", async assert => {
    const app = await loadDataQualityAt();
    const issue = issueByType(app, "exact_duplicate");
    await openIssue(app, issue.issueId);

    const footer = app.document.querySelector(".remediation-sheet-footer");
    const impact = app.document.getElementById("remediationFooterImpact");
    const cancel = app.document.getElementById("remediationIssueCancelButton");
    const apply = app.document.getElementById("remediationIssueApplyButton");
    assert.ok(footer, "Review Sheet should render the shared impact/action footer");
    assert.equal(cancel.compareDocumentPosition(apply) & Node.DOCUMENT_POSITION_FOLLOWING, Node.DOCUMENT_POSITION_FOLLOWING, "Cancel must remain before the primary action in DOM order");
    assert.equal(apply.textContent.trim(), "Entscheidung anwenden", "Exact duplicates should use the decision label");
    assert.equal(apply.disabled, true, "Primary action should be disabled before a duplicate decision exists");
    assert.ok(impact.textContent.includes("Noch keine Entscheidung ausgewählt."), "Footer should not repeat the decision question before selection");

    const firstOption = app.document.querySelector(".remediation-decision-option");
    firstOption.click();
    await waitFor(() => !apply.disabled, "Apply button enabled after exact duplicate selection");
    assert.ok(impact.textContent.includes("bleibt aktiv"), "Footer impact should describe the selected keeper row");
    assert.ok(!impact.textContent.includes("Welche Entscheidung"), "Footer impact must not repeat the decision question");
  });

  test("DQ-UX-02.2 exact duplicate Review Sheet is evidence-first with title severity", async assert => {
    const app = await loadDataQualityAt();
    const issue = issueByType(app, "exact_duplicate");
    await openIssue(app, issue.issueId);

    const titleRow = app.document.querySelector(".remediation-sheet-title-row");
    const severity = titleRow.querySelector(".remediation-sheet-severity .remediation-badge");
    const evidence = app.document.querySelector(".remediation-evidence-summary");
    const decision = app.document.querySelector(".remediation-control-card");
    const disclosure = app.document.querySelector(".remediation-technical-details summary");
    const bodyText = app.document.getElementById("remediationIssueBody").textContent;
    const guidance = "Die ausgewählte Zeile bleibt aktiv.";

    assert.ok(severity, "Severity should be shown beside the issue title");
    assert.ok(!bodyText.includes("Schweregrad"), "Severity should not remain as a standalone metadata card");
    assert.ok(evidence, "Exact duplicates should expose a concrete evidence summary");
    assert.equal(evidence.compareDocumentPosition(decision) & Node.DOCUMENT_POSITION_FOLLOWING, Node.DOCUMENT_POSITION_FOLLOWING, "Evidence should appear before decisions");
    assert.ok(disclosure.textContent.includes("identische Quellfelder vergleichen"), "Source-field disclosure should use the dynamic comparison label");
    assert.equal(bodyText.split(guidance).length - 1, 1, "Duplicate guidance should render once");
    assert.equal(app.document.querySelectorAll('input[name="remediationExactDuplicateDecision"]:checked').length, 0, "Exact duplicate should have no default decision");
  });

  test("DQ-UX-02.2 operation-specific action labels and concrete missing titles render", async assert => {
    const app = await loadDataQualityAt();
    const bridge = app.__obsoliqTestBridge;
    const base = bridge.getDataQualityIssues().find(item => String(item.issueType).startsWith("missing_"));
    if (!base) throw new Error("No missing issue available for title test");
    const materialMissing = {
      ...base,
      issueId: `${base.issueId}-MATERIAL-TITLE`,
      issueKey: `${base.issueKey}::material-title`,
      canonicalFields: ["material_id"],
      sourceColumns: []
    };
    const stockMissing = {
      ...base,
      issueId: `${base.issueId}-STOCK-TITLE`,
      issueKey: `${base.issueKey}::stock-title`,
      canonicalFields: ["stock_value"],
      sourceColumns: []
    };
    const masterData = bridge.getDataQualityIssues().find(item => item.issueType === "inconsistent_master_data");
    const invalid = bridge.getDataQualityIssues().find(item => ["invalid_numeric_value", "negative_recovery_input", "invalid_identifier"].includes(item.issueType));
    bridge.setDataQualityIssueSnapshotForTest([materialMissing, stockMissing, masterData, invalid].filter(Boolean));
    bridge.syncDataQualityIssueLedger([materialMissing, stockMissing, masterData, invalid].filter(Boolean));
    bridge.renderDataQualityForTest();
    await waitFor(() => app.document.querySelector(".remediation-workspace"), "rerendered worklist");

    const worklistText = app.document.querySelector(".remediation-workspace").textContent;
    assert.ok(worklistText.includes("Materialnummer fehlt"), "Missing material_id should use the concrete Material Number Missing title");
    assert.ok(worklistText.includes("Bestandswert fehlt"), "Missing stock_value should use the concrete Stock Value Missing title");

    await openIssue(app, materialMissing.issueId);
    let apply = app.document.getElementById("remediationIssueApplyButton");
    assert.equal(app.document.getElementById("remediationIssueTitle").textContent, "Materialnummer fehlt", "Review Sheet title should align with the concrete worklist title");
    assert.equal(apply.textContent.trim(), "Korrektur anwenden", "Missing values should use the correction label");
    assert.equal(apply.disabled, true, "Missing values should remain disabled until a valid correction exists");
    assert.ok(app.document.getElementById("remediationFooterImpact").textContent.includes("Noch keine gültige Korrektur eingegeben."), "Invalid correction footer message should be specific");

    app.document.getElementById("remediationIssueCloseButton").click();
    if (masterData) {
      await openIssue(app, masterData.issueId);
      apply = app.document.getElementById("remediationIssueApplyButton");
      assert.equal(apply.textContent.trim(), "Änderung anwenden", "Master-data standardization should use the change label");
      app.document.getElementById("remediationIssueCloseButton").click();
    }
    if (invalid) {
      await openIssue(app, invalid.issueId);
      apply = app.document.getElementById("remediationIssueApplyButton");
      assert.equal(apply.textContent.trim(), "Korrektur anwenden", "Invalid values should use the correction label");
    }
  });

  test("DQ-UX-02.2 Dataset Pilot Capability is categorical with blocker disclosure and diagnostic cap", async assert => {
    const app = await loadDataQualityAt();
    const overviewText = app.document.querySelector(".remediation-overview").textContent;
    const diagnosticsText = app.document.querySelector(".data-quality-diagnostics").textContent;
    const baseline = app.__obsoliqTestBridge.getDataQualityBaselineForTest();

    assert.equal(app.document.querySelector(".data-quality-health-card"), null, "Separate Health Card should be removed from the primary Data Quality flow");
    assert.ok(!overviewText.includes("Pilotfähigkeit eingeschränkt"), "Pilot Capability should not appear as a primary workflow alert");
    assert.ok(!overviewText.includes("Workflow-Datenbasis"), "Ready Workflow state should no longer appear as a primary tile");
    assert.ok(!overviewText.includes("Pilotbereitschaft"), "Old Pilot Readiness wording should not remain in the remediation overview");
    assert.equal(baseline.pilotReadiness, "pilotLimited", "Pilot state should remain unchanged for the sample dataset");
    assert.equal(baseline.score, 78, "Data Quality Score should remain unchanged for the sample dataset");
    assert.ok(diagnosticsText.includes("Gedeckelter Pilot-Score"), "Capped Pilot value should remain in diagnostics");
    assert.ok(diagnosticsText.includes("Dataset-Pilotfähigkeit"), "Pilot Capability should remain available in Score diagnostics");

    const blockerButton = app.document.querySelector("[data-pilot-blockers-toggle]");
    const blockerList = app.document.querySelector(".data-quality-pilot-blocker-list");
    assert.equal(blockerButton, null, "Primary blocker disclosure button should be removed");
    assert.ok(blockerList?.textContent.includes("Recovery-Validierungsfehler"), "Concrete pilot blockers should remain visible in Score diagnostics");
  });
})();
