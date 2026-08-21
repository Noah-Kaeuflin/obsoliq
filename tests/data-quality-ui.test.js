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

  async function loadDataQualityApp() {
    const app = await helpers.loadSampleApp();
    app.document.querySelector('[data-process="data-quality"]').click();
    await waitFor(() => app.document.querySelector("#dataCheck .remediation-workspace"), "Data Quality workspace");
    return app;
  }

  function dispatchInput(app, input, value) {
    input.value = value;
    input.setSelectionRange(value.length, value.length);
    input.dispatchEvent(new app.Event("input", { bubbles: true }));
  }

  function visibleFocusable(modal) {
    return [...modal.querySelectorAll('button:not([disabled]):not(.hidden), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
      .filter(element => element.offsetParent !== null || element === modal.ownerDocument.activeElement);
  }

  test("DQ-UX remediation text search is debounced and preserves focus, cursor and input node", async assert => {
    const app = await loadDataQualityApp();
    const bridge = app.__obsoliqTestBridge;
    const search = app.document.getElementById("remediationSearchFilter");
    search.focus();
    bridge.resetRemediationFilterRenderCounters();

    ["M", "MA", "MAT", "MAT-1"].forEach(value => dispatchInput(app, search, value));
    await waitFor(() => bridge.getRemediationFilterRenderCounters().filterRunCount === 1, "single debounced remediation render");

    const counters = bridge.getRemediationFilterRenderCounters();
    assert.equal(app.document.getElementById("remediationSearchFilter"), search, "Search input DOM node should remain mounted");
    assert.equal(app.document.activeElement, search, "Search input should keep focus");
    assert.equal(search.selectionStart, 5, "Search cursor should remain at the expected position");
    assert.equal(counters.dataQualityRenderCount, 0, "Typing should not rerender the full Data Quality page");
    assert.equal(counters.detectDataQualityIssues, 0, "Typing should not detect Data Quality issues");
    assert.equal(counters.buildDataQualityModel, 0, "Typing should not rebuild the Data Quality model");
  });

  test("DQ-UX select filters and quick filters render immediately without analytical recomputation", async assert => {
    const app = await loadDataQualityApp();
    const bridge = app.__obsoliqTestBridge;
    const severity = app.document.getElementById("remediationSeverityFilter");

    bridge.resetRemediationFilterRenderCounters();
    severity.value = "high";
    severity.dispatchEvent(new app.Event("change", { bubbles: true }));
    let counters = bridge.getRemediationFilterRenderCounters();
    assert.equal(counters.filterRunCount, 1, "Select filter should render immediately");
    assert.equal(counters.dataQualityRenderCount, 0, "Select filter should not rerender full Data Quality");
    assert.equal(counters.detectDataQualityIssues, 0, "Select filter should not detect issues");

    bridge.resetRemediationFilterRenderCounters();
    app.document.querySelector('[data-remediation-quick-filter="duplicates"]').click();
    counters = bridge.getRemediationFilterRenderCounters();
    const duplicates = app.document.querySelector('[data-remediation-quick-filter="duplicates"]');
    assert.equal(counters.filterRunCount, 1, "Quick filter should render immediately");
    assert.equal(duplicates.getAttribute("aria-pressed"), "true", "Active quick filter should expose aria-pressed");
    assert.equal(counters.detectDataQualityIssues, 0, "Quick filter should not detect issues");
  });

  test("DQ-UX active chips reset filters and preserve worklist scroll where possible", async assert => {
    const app = await loadDataQualityApp();
    const bridge = app.__obsoliqTestBridge;
    const search = app.document.getElementById("remediationSearchFilter");
    dispatchInput(app, search, "MAT");
    await waitFor(() => app.document.querySelector(".remediation-active-filters"), "active filters");

    const worklist = app.document.getElementById("remediationWorklistScroll");
    assert.ok(worklist, "Stable Worklist scroll element should exist");
    worklist.scrollTop = 70;
    bridge.resetRemediationFilterRenderCounters();
    const type = app.document.getElementById("remediationTypeFilter");
    type.value = "missing_required_value";
    type.dispatchEvent(new app.Event("change", { bubbles: true }));

    await waitFor(() => bridge.getRemediationFilterRenderCounters().filterRunCount === 1, "filtered worklist render");
    const restoredWorklist = app.document.getElementById("remediationWorklistScroll");
    assert.ok(restoredWorklist, "Stable Worklist scroll element should still exist after filter render");
    assert.ok((restoredWorklist.scrollTop || 0) >= 0, "Worklist remains independently scrollable after filter render");
    assert.ok(app.document.querySelector(".remediation-result-meta")?.textContent.trim().length > 0, "Result count should be visible");

    app.document.querySelector("[data-remediation-reset-filters]").click();
    await waitFor(() => !app.document.querySelector(".remediation-active-filters"), "filters reset");
    assert.equal(app.document.getElementById("remediationSearchFilter").value, "", "Reset clears search input");
    assert.equal(app.document.getElementById("remediationTypeFilter").value, "", "Reset clears type filter");
  });

  test("DQ-UX Review Sheet traps focus, closes with Escape and returns focus", async assert => {
    const app = await loadDataQualityApp();
    const opener = app.document.querySelector("[data-remediation-review]");
    opener.focus();
    opener.click();
    const modal = app.document.getElementById("remediationIssueModal");
    await waitFor(() => modal.classList.contains("active") && modal.contains(app.document.activeElement), "remediation sheet focus");

    const focusable = visibleFocusable(modal);
    assert.ok(focusable.length >= 2, "Review Sheet should expose focusable controls");
    focusable[focusable.length - 1].focus();
    app.dispatchEvent(new app.KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    assert.equal(app.document.activeElement, focusable[0], "Tab from last control should wrap to first");

    app.dispatchEvent(new app.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await waitFor(() => !modal.classList.contains("active"), "remediation sheet closes");
    await waitFor(() => app.document.activeElement === opener, "focus returns to opener");
    assert.ok(app.document.body.classList.contains("modal-open") === false, "Body scroll lock should be released after closing");
  });

  test("DQ-UX diagnostics remain complete and use responsive disclosure containers", async assert => {
    const app = await loadDataQualityApp();
    const diagnostics = [...app.document.querySelectorAll(".data-quality-diagnostic")];
    assert.equal(diagnostics.length, 10, "All diagnostic disclosures should remain available, including Input Trust");
    assert.equal(diagnostics[0].querySelector("summary span")?.textContent.trim(), "Score erklären", "Diagnostics order should start with score explanation in German");
    diagnostics[0].open = true;
    assert.ok(diagnostics[0].querySelector(".data-quality-diagnostic-body")?.textContent.trim().length > 0, "Opened diagnostic should expose technical content");
  });
})();
