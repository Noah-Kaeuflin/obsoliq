(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function waitFor(condition, label, timeoutMs = 5000) {
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

  async function loadDataQualityApp() {
    const app = await helpers.loadSampleApp();
    app.document.querySelector('[data-process="data-quality"]').click();
    await waitFor(() => app.document.querySelector("#dataCheck .remediation-workspace"), "Data Quality workspace");
    return app;
  }

  test("DF-UX-01 Data Quality header owns dataset metadata and workspace keeps only demo context", async assert => {
    const app = await loadDataQualityApp();
    const header = app.document.getElementById("dataQualityHeader");
    const workspaceContext = app.document.querySelector("#dataCheck .remediation-context-chips");
    const headerStyle = app.getComputedStyle(header);

    assert.ok(header.querySelector(".dataset-rows-chip")?.textContent.includes("Zeilen"), "Data Quality header should keep row metadata");
    assert.ok(header.querySelector(".dataset-columns-chip")?.textContent.includes("Spalten"), "Data Quality header should keep column metadata");
    assert.ok(header.querySelector(".dataset-source-chip")?.textContent.includes("Beispieldaten"), "Data Quality header should keep source metadata");
    assert.ok(workspaceContext?.textContent.includes("Demo-Modus"), "Workspace should keep compact demo context");
    assert.ok(workspaceContext?.textContent.includes("11"), "Demo issue count should remain dynamic");
    assert.ok(!workspaceContext.textContent.includes("Zeilen"), "Workspace context should not duplicate row metadata");
    assert.ok(!workspaceContext.textContent.includes("Spalten"), "Workspace context should not duplicate column metadata");
    assert.equal(headerStyle.borderTopStyle, "none", "Data Quality header should not look like a separate card");
    assert.ok(headerStyle.backgroundColor === "rgba(0, 0, 0, 0)" || headerStyle.backgroundColor === "transparent", "Data Quality header should be visually lightweight");
  });

  test("DF-UX-01 Data Quality result count appears only when filters are active", async assert => {
    const app = await loadDataQualityApp();
    const meta = app.document.getElementById("remediationResultMetaRegion");

    assert.equal(meta.textContent.trim(), "", "Initial unfiltered open worklist should not repeat the result count");

    app.document.querySelector('[data-remediation-quick-filter="critical_high"]').click();
    await waitFor(() => app.document.getElementById("remediationResultMetaRegion").textContent.trim().length > 0, "filtered result count");
    assert.ok(meta.textContent.includes("von"), "Filtered state should show a useful result count");

    app.document.querySelector("[data-remediation-reset-filters]").click();
    await waitFor(() => app.document.getElementById("remediationResultMetaRegion").textContent.trim() === "", "result count hidden after reset");
    assert.equal(meta.textContent.trim(), "", "Result count should hide again after clearing filters");
  });

  test("DF-UX-01 Data Quality actions keep export visible and hide Undo/Reset until active remediation exists", async assert => {
    const app = await loadDataQualityApp();
    const bridge = app.__obsoliqTestBridge;
    const headerActions = app.document.querySelector(".remediation-header-actions");
    const issue = bridge.getDataQualityIssues().find(item => item.status === "open") || bridge.getDataQualityIssues()[0];

    assert.ok(headerActions.textContent.includes("Bereinigung exportieren"), "Export action should use precise remediation wording");
    assert.ok(headerActions.textContent.includes("Problemprotokoll exportieren"), "Issue-log export should remain available inside export actions");
    assert.equal(app.document.querySelector("[data-remediation-undo]"), null, "Undo should be hidden before remediation changes exist");
    assert.equal(app.document.querySelector("[data-remediation-reset]"), null, "Reset should be hidden before remediation changes exist");

    bridge.createIssueDecisionForTest(issue, "reviewed", { rebuild: false });
    bridge.renderDataQualityForTest();

    assert.ok(app.document.querySelector("[data-remediation-undo]"), "Undo should appear after an active remediation decision exists");
    assert.ok(app.document.querySelector("[data-remediation-reset]"), "Reset should appear after an active remediation decision exists");
  });

  test("DF-UX-01 Data Quality filter toolbar is compact and the Score tile is not a filter", async assert => {
    const app = await loadDataQualityApp();
    const filterRow = app.document.querySelector(".remediation-filter-row");
    const filterDisclosure = app.document.querySelector(".remediation-mobile-filter-disclosure");
    const filterSummary = filterDisclosure?.querySelector("summary");
    const score = app.document.querySelector("[data-score-diagnostic-toggle]");
    const scoreActiveBefore = app.document.querySelector("[data-remediation-quick-filter][aria-pressed='true']")?.dataset.remediationQuickFilter;

    assert.ok(filterSummary?.textContent.includes("Filter · 0"), "Filter toolbar should start as a compact filter disclosure");
    assert.equal(app.getComputedStyle(filterRow).gridTemplateColumns.split(" ").length <= 3, true, "Filter row should not render as a long technical grid");
    assert.equal(score.hasAttribute("aria-pressed"), false, "Score tile should not expose Quick Filter state");

    score.click();

    assert.equal(app.document.querySelector("[data-remediation-quick-filter][aria-pressed='true']")?.dataset.remediationQuickFilter, scoreActiveBefore, "Score click should not change active filters");
    assert.equal(app.document.querySelector('.data-quality-diagnostic[data-diagnostic-key="explainScore"]').open, true, "Score click should open diagnostics only");
  });
})();
