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

  async function loadDataQualityApp(width = 1366, height = 768) {
    const app = await helpers.loadSampleApp();
    app.resizeTo?.(width, height);
    app.document.querySelector('[data-process="data-quality"]').click();
    await waitFor(() => app.document.querySelector("#dataCheck .remediation-workspace"), "Data Quality workspace");
    return app;
  }

  test("DQ-UX-02.3 primary metrics render Score plus five preserved Quick Filters", async assert => {
    const app = await loadDataQualityApp();
    const metrics = [...app.document.querySelectorAll(".remediation-primary-metric")];
    const score = app.document.querySelector("[data-score-diagnostic-toggle]");
    const filterTiles = [...app.document.querySelectorAll("[data-remediation-quick-filter]")];
    const baseline = app.__obsoliqTestBridge.getDataQualityBaselineForTest();

    assert.equal(metrics.length, 6, "Primary row should render six metric tiles");
    assert.equal(metrics[0], score, "Score tile should be first");
    assert.equal(score.hasAttribute("aria-pressed"), false, "Score tile should not expose filter state");
    assert.equal(filterTiles.map(tile => tile.dataset.remediationQuickFilter).join("|"), "all|critical_high|missing|invalid|duplicates", "Quick Filter values should stay unchanged");
    assert.equal(filterTiles[0].getAttribute("aria-pressed"), "true", "Open issues filter starts active");
    assert.ok(score.textContent.includes(`${baseline.score} %`), "Score tile should use the dynamic Data Quality Score");
    assert.ok(filterTiles[0].textContent.includes(String(baseline.remediationStats.open)), "Open issue tile should use dynamic open issue count");
    assert.ok(filterTiles[1].textContent.includes(String(baseline.remediationStats.criticalHigh)), "Critical/high tile should use dynamic count");
    assert.ok(filterTiles[2].textContent.includes(String(baseline.remediationStats.missingValues)), "Missing tile should use dynamic count");
    assert.ok(filterTiles[3].textContent.includes(String(baseline.remediationStats.invalidValues)), "Invalid tile should use dynamic count");
    assert.ok(filterTiles[4].textContent.includes(String(baseline.remediationStats.duplicates)), "Duplicate tile should use dynamic count");
  });

  test("DQ-UX-02.3 Score opens diagnostics and does not filter the remediation worklist", async assert => {
    const app = await loadDataQualityApp();
    const score = app.document.querySelector("[data-score-diagnostic-toggle]");
    const initialActive = app.document.querySelector("[data-remediation-quick-filter][aria-pressed='true']")?.dataset.remediationQuickFilter;
    const initialMeta = app.document.getElementById("remediationResultMetaRegion")?.textContent.trim();

    score.click();

    assert.equal(app.document.querySelector("[data-remediation-quick-filter][aria-pressed='true']")?.dataset.remediationQuickFilter, initialActive, "Score click should not change active Quick Filter");
    assert.equal(app.document.getElementById("remediationResultMetaRegion")?.textContent.trim(), initialMeta, "Score click should not change remediation result count");
    assert.equal(app.document.querySelector('.data-quality-diagnostic[data-diagnostic-key="explainScore"]').open, true, "Score tile should open Score explanation");
    assert.equal(app.document.querySelector("[data-pilot-blockers-toggle]"), null, "Primary blocker button should be absent");
    assert.equal(app.document.querySelector(".remediation-readiness-alert"), null, "Primary Pilot blocker panel should be absent");
    assert.equal(app.document.querySelector(".data-quality-health-card"), null, "Old Health Card path should be absent");
  });

  test("DQ-UX-02.3 metric values and labels are centered in the primary row", async assert => {
    const app = await loadDataQualityApp();
    const metrics = [...app.document.querySelectorAll(".remediation-primary-metric")];

    assert.ok(metrics.every(tile => app.getComputedStyle(tile).textAlign === "center"), "Each metric tile should center its content");
    assert.ok(metrics.every(tile => tile.querySelector("strong") && tile.querySelector("span")), "Each tile should expose value and label elements");
    assert.ok(metrics.every(tile => tile.querySelector("strong").getBoundingClientRect().left >= tile.getBoundingClientRect().left), "Metric values should stay inside their tile bounds");
  });
})();
