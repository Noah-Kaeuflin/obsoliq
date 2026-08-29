(function () {
  "use strict";

  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function waitFor(condition, label, timeoutMs = 5000) {
    const started = performance.now();
    return new Promise((resolve, reject) => {
      function tick() {
        try {
          const value = condition();
          if (value) return resolve(value);
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

  function iconId(target) {
    return target?.querySelector(":scope > svg.oq-icon[data-oq-icon]")?.dataset.oqIcon || "";
  }

  test("ICON-SYS-01 exposes the safe public API and preserves Overview icons through i18n", async assert => {
    const app = await helpers.loadSampleApp();
    const icons = app.ObsoliQ.ui.iconSystem;
    const document = app.document;
    const expectedMetrics = [
      "total-inventory",
      "excess-stock",
      "blocked-quality",
      "no-demand",
      "unplanned",
      "recovery-potential"
    ];

    assert.equal(icons, app.ObsoliQIcons, "Namespaced and compatibility APIs should reference one frozen icon system");
    assert.equal(Object.isFrozen(icons), true, "Icon API should be immutable");
    assert.equal(icons.iconIds.length, 43, "Allowlist should expose all 43 semantic IDs");
    assert.ok(icons.iconHtml("overview", { className: "oq-icon--nav unsafe-class" }).includes('class="oq-icon oq-icon--nav"'), "iconHtml should retain only approved CSS classes");
    assert.equal(icons.iconHtml("overview", { className: "oq-icon--nav unsafe-class" }).includes("unsafe-class"), false, "iconHtml should reject unapproved classes");
    assert.deepEqual([...document.querySelectorAll(".metric .label > .oq-icon")].map(icon => icon.dataset.oqIcon), expectedMetrics, "Overview KPI icons should preserve the accepted semantic order");

    const before = document.querySelectorAll("[data-oq-icon]").length;
    const language = document.getElementById("languageSelect");
    language.value = "en";
    language.dispatchEvent(new app.Event("change", { bubbles: true }));
    const after = document.querySelectorAll("[data-oq-icon]").length;
    assert.ok(after >= before, "Language switching must not remove icons from translated controls");
    assert.ok(document.getElementById("uploadButton").querySelector("[data-i18n='uploadButton']"), "Upload text should remain in its translation-safe inner span");
    assert.equal(iconId(document.getElementById("actionFeedback")), "data-loaded", "Dataset feedback should preserve its separate status icon node");
  });

  test("ICON-SYS-01 renders semantic and accessible icons in Inventory Risks", async assert => {
    const app = await helpers.loadSampleApp();
    const document = app.document;
    document.querySelector("[data-process='inventory-risks']").click();
    await waitFor(() => document.querySelector(".inventory-risk-header"), "Inventory Risks icon surface");

    assert.equal(document.querySelector(".inventory-risk-header-copy h2 .oq-icon"), null, "Portfolio heading should not duplicate the active navigation icon");
    assert.equal(iconId(document.querySelector("[data-inventory-risk-export]")), "export", "Risk export should use the shared export icon");
    assert.equal(document.querySelectorAll(".inventory-risk-summary-card .inventory-risk-kpi-icon > .oq-icon").length, 4, "All four portfolio summary metrics should have left-side icon tiles");
    assert.equal(document.querySelectorAll(".inventory-risk-financial-card .inventory-risk-kpi-icon > .oq-icon").length, 3, "Separated financial metrics should have semantic icon tiles");
    assert.equal(iconId(document.querySelector("[data-inventory-risk-reset]")), "reset-filter", "Risk filter reset should use the shared reset icon");

    const openButton = document.querySelector("[data-inventory-risk-select]");
    if (openButton) {
      assert.equal(iconId(openButton), "expand", "Icon-only case action should use the ChevronRight expand icon");
      assert.ok(openButton.getAttribute("aria-label"), "Icon-only case action should expose an aria-label");
      assert.ok(openButton.getAttribute("title"), "Icon-only case action should expose a title");
      assert.equal(openButton.textContent.trim(), "", "Icon-only case action should not rely on a font glyph");
    }
  });

  test("ICON-SYS-01 covers Data Quality and Data Foundation without changing their actions", async assert => {
    const app = await helpers.loadSampleApp();
    const document = app.document;
    await waitFor(() => document.querySelector("#dataPackagesPanel .data-foundation-summary"), "Data Foundation summary");

    const foundation = document.querySelector("#dataPackagesPanel .data-foundation");
    foundation.open = true;
    assert.equal(iconId(document.querySelector(".data-foundation-summary")), "expand", "Data Foundation disclosure should use the shared expand icon");
    assert.equal(document.querySelector(".data-foundation-summary [data-oq-icon='total-inventory']") !== null, true, "Data Foundation summary should identify inventory data");
    assert.ok(document.querySelectorAll(".data-foundation-source > .oq-icon").length >= 3, "Data Foundation sources should expose source-type icons");
    document.querySelectorAll(".data-foundation-inline-action").forEach(button => {
      assert.equal(iconId(button), "upload-file", "Data Foundation imports should retain their existing action with an upload icon");
    });

    document.querySelector("[data-process='data-quality']").click();
    await waitFor(() => document.querySelector("#dataCheck .remediation-workspace"), "Data Quality icon surface");
    assert.equal(document.querySelectorAll(".remediation-summary-card > .oq-icon").length, 5, "All five issue summary cards should have semantic icons");
    assert.equal(iconId(document.querySelector("[data-remediation-review]")), "review-case", "Review action should use the shared review icon");
    assert.ok(document.querySelector(".data-quality-diagnostic summary [data-oq-icon='expand']"), "Diagnostic disclosures should use the expand icon");
    assert.equal(iconId(document.querySelector(".remediation-action-menu > summary")), "export", "Data Quality export menu should use the shared export icon");
  });
})();
