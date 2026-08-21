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

  async function loadDataQualityAt(width, height) {
    setFrameSize(width, height);
    const app = await helpers.loadSampleApp();
    app.document.querySelector('[data-process="data-quality"]').click();
    await waitFor(() => app.document.querySelector("#dataCheck .remediation-workspace"), "Data Quality workspace");
    return app;
  }

  function dispatchChange(app, control, value) {
    control.value = value;
    control.dispatchEvent(new app.Event("change", { bubbles: true }));
  }

  function displayOf(app, selector) {
    const element = app.document.querySelector(selector);
    return element ? app.getComputedStyle(element).display : "";
  }

  test("DQ-UX-02 keeps Data Foundation owned by Overview and absent from Data Quality", async assert => {
    setFrameSize(1280, 800);
    const app = await helpers.loadSampleApp();
    const panel = app.document.getElementById("dataPackagesPanel");
    assert.equal(panel?.closest(".overview-header")?.className, "overview-header", "Data Foundation panel should be mounted in the Overview header");
    assert.ok(panel?.textContent.trim().length > 0, "Overview Data Foundation panel should render package content");

    app.document.querySelector('[data-process="data-quality"]').click();
    await waitFor(() => app.document.querySelector("#dataCheck .remediation-workspace"), "Data Quality workspace");
    assert.equal(app.document.querySelector("#view-check #dataPackagesPanel"), null, "Data Quality view should not own the Data Foundation panel");
    assert.equal(displayOf(app, "#dataPackagesPanel"), "none", "Data Foundation panel should not be visible while Data Quality is active");
  });

  test("DQ-UX-02 mobile navigation uses Sections without duplicate full tabs", async assert => {
    const app = await loadDataQualityAt(390, 844);
    const toggle = app.document.getElementById("navToggleButton");
    const current = app.document.getElementById("currentSectionLabel");
    const nav = app.document.querySelector(".main-nav");
    const tabs = app.document.querySelector(".process-tabs");

    assert.notEqual(displayOf(app, "#navToggleButton"), "none", "Sections control should be visible on mobile");
    assert.notEqual(displayOf(app, "#currentSectionLabel"), "none", "Current section label should be visible on mobile");
    assert.ok(current.textContent.includes("Datenqualität"), "Current mobile section label should reflect the active Data Quality tab");
    assert.ok((nav.getBoundingClientRect().height || 0) <= 1, "Full navigation bar should be collapsed on mobile");
    assert.equal(app.getComputedStyle(tabs).visibility, "hidden", "Full tab row should be hidden on mobile");

    toggle.click();
    await waitFor(() => app.document.querySelector(".sections-popover"), "sections popover");
    assert.ok(app.document.querySelector(".sections-popover [data-nav-section='data-quality']")?.classList.contains("active"), "Sections popover should preserve the active view");
  });

  test("DQ-UX-02 mobile quick filters render as compact horizontal chips", async assert => {
    const app = await loadDataQualityAt(390, 844);
    const rail = app.document.querySelector(".remediation-summary-grid");
    const cards = [...app.document.querySelectorAll(".remediation-summary-card")];
    const firstRect = cards[0].getBoundingClientRect();
    const secondRect = cards[1].getBoundingClientRect();

    assert.equal(cards.length, 5, "Five quick filter chips should remain available");
    assert.equal(app.getComputedStyle(rail).display, "flex", "Mobile quick filters should be a horizontal rail");
    assert.ok(Math.abs(firstRect.top - secondRect.top) <= 2, "Quick filter chips should sit on one horizontal row");
    assert.equal(cards[0].getAttribute("aria-pressed"), "true", "Active quick filter should preserve aria-pressed");
  });

  test("DQ-UX-02 mobile filter disclosure keeps search visible and preserves values", async assert => {
    const app = await loadDataQualityAt(390, 844);
    const search = app.document.getElementById("remediationSearchFilter");
    const disclosure = app.document.querySelector(".remediation-mobile-filter-disclosure");
    const summary = disclosure.querySelector("summary");

    assert.notEqual(app.getComputedStyle(search).display, "none", "Search should remain directly visible on mobile");
    assert.notEqual(app.getComputedStyle(summary).display, "none", "Mobile filter disclosure button should be visible");
    assert.ok(summary.textContent.includes("0"), "Filter button should start with zero active non-search filters");

    disclosure.open = true;
    dispatchChange(app, app.document.getElementById("remediationSeverityFilter"), "high");
    await waitFor(() => summary.textContent.includes("1"), "mobile filter count update");
    assert.equal(app.document.getElementById("remediationSeverityFilter").value, "high", "Filter value should remain selected after targeted rendering");
    assert.equal(app.document.getElementById("remediationSearchFilter"), search, "Search input DOM node should remain stable");
  });

  test("DQ-UX-02 mobile Worklist renders issue cards with the same review action", async assert => {
    const app = await loadDataQualityAt(390, 844);
    const tableView = app.document.querySelector(".remediation-worklist-table-view");
    const cardList = app.document.querySelector(".remediation-card-list");
    const firstCard = cardList.querySelector(".remediation-issue-card");
    const reviewButton = firstCard.querySelector("[data-remediation-review]");
    const issueTitle = firstCard.querySelector(".remediation-issue-card-main strong")?.textContent.trim();

    assert.equal(app.getComputedStyle(tableView).display, "none", "Desktop table should be hidden on mobile");
    assert.notEqual(app.getComputedStyle(cardList).display, "none", "Mobile issue-card list should be visible");
    assert.ok(firstCard.textContent.trim().length > 0, "Issue card should contain issue content");
    assert.ok(reviewButton, "Issue card should expose the existing review action");

    reviewButton.click();
    const modal = app.document.getElementById("remediationIssueModal");
    await waitFor(() => modal.classList.contains("active"), "mobile review sheet");
    assert.ok(app.document.getElementById("remediationIssueBody").textContent.trim().length > 0, "Review Sheet should render the selected issue detail");
    assert.equal(app.document.getElementById("remediationIssueTitle").textContent.trim(), issueTitle, "Mobile card should open the same issue in the Review Sheet");
  });

  test("DQ-UX-02 desktop Worklist table remains present at laptop and desktop widths", async assert => {
    const app = await loadDataQualityAt(1280, 800);
    assert.notEqual(displayOf(app, ".remediation-worklist-table-view"), "none", "Desktop worklist table should remain visible");
    assert.equal(displayOf(app, ".remediation-card-list"), "none", "Mobile cards should stay hidden on desktop");
    assert.ok(app.document.querySelectorAll(".remediation-worklist tbody tr").length > 0, "Desktop table should contain issue rows");
  });

  test("DQ-UX-02 diagnostics keep ten disclosures with dynamic metadata", async assert => {
    const app = await loadDataQualityAt(1280, 800);
    const diagnostics = [...app.document.querySelectorAll(".data-quality-diagnostic")];
    const metas = diagnostics.map(item => item.querySelector(".data-quality-diagnostic-meta")?.textContent.trim() || "");

    assert.equal(diagnostics.length, 10, "Exactly ten diagnostic disclosures should remain, including Input Trust");
    assert.ok(app.document.querySelector(".data-quality-diagnostics > .panel-title small")?.textContent.includes("Score"), "Diagnostics subtitle should describe technical detail scope");
    assert.equal(metas.filter(Boolean).length, 10, "Every diagnostic disclosure should include dynamic metadata");
    assert.ok(metas.some(text => /\d/.test(text)), "Diagnostic metadata should contain runtime values");
  });

  test("DQ-UX-02 mobile layout avoids body-level horizontal overflow", async assert => {
    const app = await loadDataQualityAt(390, 844);
    const root = app.document.documentElement;
    assert.ok(root.scrollWidth <= root.clientWidth + 1, "Mobile document should not create horizontal body overflow");
    assert.ok(app.document.body.scrollWidth <= app.document.body.clientWidth + 1, "Mobile body should not create horizontal overflow");
  });

  test("DQ-UX-02 mobile Review Sheet is full-screen with reachable footer", async assert => {
    const app = await loadDataQualityAt(390, 844);
    app.document.querySelector(".remediation-card-list [data-remediation-review]").click();
    const modal = app.document.getElementById("remediationIssueModal");
    const sheet = modal.querySelector(".remediation-modal");
    await waitFor(() => modal.classList.contains("active"), "mobile review sheet active");

    const sheetStyle = app.getComputedStyle(sheet);
    const actionsRect = app.document.querySelector(".remediation-modal-actions").getBoundingClientRect();
    assert.ok(sheet.getBoundingClientRect().width >= app.innerWidth - 1, "Mobile Review Sheet should use full viewport width");
    assert.equal(sheetStyle.borderRadius, "0px", "Mobile Review Sheet should remove border radius");
    assert.ok(actionsRect.bottom <= app.innerHeight + 1, "Review Sheet footer should be reachable in the viewport");
  });
})();
