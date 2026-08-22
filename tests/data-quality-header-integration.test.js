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

  async function openDataQuality(app) {
    app.document.querySelector('[data-process="data-quality"]').click();
    await waitFor(() => app.document.querySelector("#dataCheck .remediation-workspace"), "Data Quality workspace");
    return app.document.getElementById("dataQualityHeader");
  }

  test("DF-UX-02.1 Data Quality header integrates source badge and inline metadata", async assert => {
    const app = await helpers.loadSampleApp();
    const header = await openDataQuality(app);
    const sourceBadge = header.querySelector(".data-quality-source-badge.dataset-source-chip");
    const rowMeta = header.querySelector(".dataset-rows-chip");
    const columnMeta = header.querySelector(".dataset-columns-chip");

    assert.ok(header.querySelector(".data-quality-header-title-row h2")?.textContent.includes("Datenqualität"), "Title should stay in the Data Quality header");
    assert.ok(sourceBadge?.textContent.includes("Beispieldaten"), "Sample source should be attached to the title row");
    assert.equal(sourceBadge.classList.contains("dataset-chip"), false, "Source badge should not use the generic dataset pill style");
    assert.ok(header.querySelector(".data-quality-header-meta-line")?.textContent.includes("Datenprobleme erkennen"), "Subtitle should share the metadata line");
    assert.ok(rowMeta?.textContent.includes("Zeilen"), "Rows should remain synchronized");
    assert.ok(columnMeta?.textContent.includes("Spalten"), "Columns should remain synchronized");
    assert.equal(rowMeta.classList.contains("dataset-chip"), false, "Rows should be normal muted text, not a pill");
    assert.equal(columnMeta.classList.contains("dataset-chip"), false, "Columns should be normal muted text, not a pill");
    assert.equal(Boolean(header.querySelector(".dataset-status-text")), false, "Data Loaded chip should be removed from the Data Quality header");
  });

  test("DF-UX-02.1 Data Quality header preserves uploaded filename accessibly", async assert => {
    const app = await helpers.loadApp();
    const bridge = app.__obsoliqTestBridge;
    const fileName = "inventory_august_long_filename_for_data_quality_header_validation.csv";
    await bridge.loadTextDataset(helpers.simpleCsv("MAT-DQ-1", "140"), fileName, {
      sourceType: "upload",
      allowMappingReview: false
    });
    const header = await openDataQuality(app);
    const sourceBadge = header.querySelector(".data-quality-source-badge.dataset-source-chip");

    assert.equal(sourceBadge.textContent, fileName, "Actual uploaded filename should be the source badge text");
    assert.equal(sourceBadge.title, fileName, "Full uploaded filename should remain available in the title attribute");
    assert.ok(header.querySelector(".dataset-rows-chip")?.textContent.includes("1"), "Uploaded row count should be shown as inline metadata");
    assert.equal(Boolean(header.querySelector(".dataset-status-text")), false, "Uploaded Data Quality header should not render a generic Data Loaded chip");
  });

  test("DF-UX-02.1 Data Quality no-data state does not keep stale source metadata", async assert => {
    const app = await helpers.loadApp();
    const header = app.document.getElementById("dataQualityHeader");
    const sourceBadge = header.querySelector(".data-quality-source-badge.dataset-source-chip");

    assert.equal(sourceBadge.textContent, "", "No-data source badge should not keep stale text");
    assert.equal(sourceBadge.title, "", "No-data source badge should not keep stale title");
    assert.ok(header.querySelector(".dataset-rows-chip")?.textContent.includes("0"), "No-data row metadata should reset to zero");
    assert.ok(header.querySelector(".dataset-columns-chip")?.textContent.includes("0"), "No-data column metadata should reset to zero");
  });
})();
