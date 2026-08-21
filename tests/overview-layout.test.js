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

  function setFrameSize(width, height) {
    const frame = document.getElementById("appFrame");
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    frame.style.left = "0";
    frame.style.top = "0";
    frame.style.position = "fixed";
    frame.style.border = "0";
  }

  async function loadOverviewApp(width = 1536, height = 864) {
    setFrameSize(width, height);
    const app = await helpers.loadSampleApp();
    await waitFor(() => app.document.querySelector("#view-dashboard.active #plantBars .bar-row"), "Overview charts");
    return app;
  }

  test("DQ-UX-02.3 Overview removes redundant insight strip and stale insight IDs", async assert => {
    const app = await loadOverviewApp();

    assert.equal(app.document.querySelector(".insight-strip"), null, "Overview Insight Strip should be absent");
    assert.equal(app.document.getElementById("insightRecoveryShare"), null, "Recovery Share insight ID should be removed");
    assert.equal(app.document.getElementById("insightTopCategory"), null, "Top Category insight ID should be removed");
    assert.equal(app.document.getElementById("insightTopPlant"), null, "Top Profit Center insight ID should be removed");
    assert.equal(app.document.getElementById("insightTopMaterial"), null, "Top Material insight ID should be removed");
    assert.equal(app.document.querySelector(".chart-footer-link"), null, "Non-functional Profit Center link should be removed");
  });

  test("DF-UX-01 Overview keeps compact Data Foundation in the page header", async assert => {
    const app = await loadOverviewApp();
    const header = app.document.querySelector(".overview-header");
    const packages = app.document.getElementById("dataPackagesPanel");

    assert.ok(packages, "Data Foundation panel should render");
    assert.equal(packages.parentElement, header, "Data Foundation should live in the compact Overview header");
    assert.ok(packages.classList.contains("data-foundation-panel"), "Data Foundation should use the compact panel class");
    assert.ok(packages.querySelector(".data-foundation-summary"), "Data Foundation should render a compact summary control");
    assert.equal(app.document.querySelector(".data-packages-card"), null, "Large Data Packages card should not render");
    assert.equal(app.document.querySelector(".data-package-item"), null, "Old package item cards should not render");
  });

  test("DQ-UX-02.3 Overview grid uses explicit areas without an empty right-hand cell", async assert => {
    const app = await loadOverviewApp();
    const grid = app.document.getElementById("view-dashboard");
    const areas = app.getComputedStyle(grid).gridTemplateAreas;
    const category = app.document.querySelector(".category-chart-panel");
    const profit = app.document.querySelector(".profit-center-chart-panel");
    const worklist = app.document.querySelector(".overview-top-list-panel");

    assert.ok(!areas.includes("packages"), "Overview grid should no longer reserve a Data Packages row");
    assert.ok(areas.includes("category profit"), "Category and Profit Center charts should sit side by side");
    assert.ok(areas.includes("worklist worklist"), "Recovery preview should span both grid columns");
    assert.equal(app.getComputedStyle(category).gridArea, "category", "Category chart should own category area");
    assert.equal(app.getComputedStyle(profit).gridArea, "profit", "Profit Center chart should own profit area");
    assert.equal(app.getComputedStyle(worklist).gridArea, "worklist", "Recovery preview should own worklist area");
  });

  test("DQ-UX-02.3 Overview charts keep five rows visible and paired card height", async assert => {
    const app = await loadOverviewApp();
    const category = app.document.querySelector(".category-chart-panel");
    const profit = app.document.querySelector(".profit-center-chart-panel");
    const plantBars = app.document.getElementById("plantBars");
    const categoryBars = app.document.getElementById("categoryBars");

    assert.equal(plantBars.querySelectorAll(".bar-row").length, 5, "Profit Center chart should render five ranked rows");
    assert.equal(categoryBars.querySelectorAll(".bar-row").length, 5, "Category chart should render five ranked rows");
    assert.ok(plantBars.scrollHeight <= plantBars.clientHeight + 2, "Five Profit Center rows should not need internal scrolling");
    assert.ok(Math.abs(category.getBoundingClientRect().height - profit.getBoundingClientRect().height) <= 2, "Chart cards should have equal outer height");
    assert.ok(plantBars.querySelector(".bar-row:last-child").getBoundingClientRect().bottom <= profit.getBoundingClientRect().bottom, "Fifth Profit Center row should remain visible inside the card");
  });

  test("DQ-UX-02.3 Overview grid falls back to one column below 1200px", async assert => {
    const app = await loadOverviewApp(1024, 768);
    const grid = app.document.getElementById("view-dashboard");
    const areas = app.getComputedStyle(grid).gridTemplateAreas;

    assert.ok(!areas.includes("packages"), "Overview grid should not reserve a packages row on tablet widths");
    assert.ok(areas.includes('"category"'), "Category area should become a single row");
    assert.ok(areas.includes('"profit"'), "Profit area should become a single row");
    assert.ok(areas.includes('"worklist"'), "Recovery preview should become a single row");
    assert.ok(app.document.documentElement.scrollWidth <= app.document.documentElement.clientWidth + 2, "Overview should not cause body-level horizontal overflow");
  });
})();
