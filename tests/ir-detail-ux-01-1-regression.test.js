(() => {
  "use strict";

  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  function columns(style) {
    return style.gridTemplateColumns.split(" ").filter(Boolean).length;
  }

  async function nextFrame(app) {
    await new Promise(resolve => app.requestAnimationFrame(() => app.requestAnimationFrame(resolve)));
  }

  async function standaloneSurface() {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchViewForTest("excess");
    bridge.renderExcessPageForTest();
    return { app, bridge, surface: app.document.querySelector("#excessPage [data-excess-decision-surface]") };
  }

  async function embeddedSurface() {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const runtime = bridge.getInventoryRiskPortfolioForTest();
    const excessCase = runtime.familyCases.find(item => item.primary_risk_family === "excess_demand");
    bridge.switchInventoryRiskRouteForTest("excess-stock", excessCase?.family_case_id || "");
    return {
      app,
      bridge,
      surface: app.document.querySelector(".inventory-risk-detail [data-excess-decision-surface]")
    };
  }

  test("IR-DETAIL-UX-01.1 keeps Next Step and Readiness on independent full-width rows", async assert => {
    const { app, surface } = await standaloneSurface();
    surface.style.width = "680px";
    await nextFrame(app);
    const grid = surface.querySelector(".excess-primary-decision-grid");
    const next = grid.querySelector(".next-step").getBoundingClientRect();
    const why = grid.querySelector(".why-prioritized").getBoundingClientRect();
    const readiness = grid.querySelector(".excess-readiness-card").getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    const gridStyle = app.getComputedStyle(grid);
    const gridContentWidth = gridRect.width - parseFloat(gridStyle.paddingLeft) - parseFloat(gridStyle.paddingRight);

    assert.ok(Math.abs(next.width - gridContentWidth) < 3, "Next Step should span the complete Decision grid content box");
    assert.ok(Math.abs(readiness.width - gridContentWidth) < 3, "Readiness should span the complete Decision grid content box");
    assert.ok(Math.abs(next.top - readiness.top) > 4, "Next Step and Readiness must not share a stretched row");
    assert.ok(why.top >= next.bottom - 1, "The supporting Decision row should follow Next Step");
    assert.ok(readiness.top >= why.bottom - 1, "Readiness should follow the supporting Decision row");
  });

  test("IR-DETAIL-UX-01.1 shares complete signal, readiness and score styling with Embedded Excess", async assert => {
    const { app, surface } = await embeddedSurface();
    const signalList = surface.querySelector(".excess-signal-list");
    const marker = surface.querySelector(".excess-readiness-marker");
    const pill = surface.querySelector(".excess-readiness-pill");

    assert.equal(app.getComputedStyle(signalList).listStyleType, "none", "Supporting signals should use the shared component list style");
    assert.ok(parseFloat(app.getComputedStyle(marker).width) >= 11, "Readiness markers should be visibly styled in Embedded Excess");
    assert.equal(app.getComputedStyle(pill).display.includes("flex"), true, "Readiness status should use the shared pill treatment");

    surface.querySelector("[data-excess-detail-target='prioritization']").click();
    const scoreTrack = surface.querySelector(".excess-score-track");
    const scoreFill = scoreTrack.querySelector("i");
    assert.equal(app.getComputedStyle(scoreTrack).overflow, "hidden", "Score tracks should be clipped shared progress tracks");
    assert.equal(app.getComputedStyle(scoreFill).display, "block", "Score contribution fills should be rendered in Embedded Excess");
  });

  test("IR-DETAIL-UX-01.1 delays the Prioritization split until the shared surface is wide enough", async assert => {
    const { app, surface } = await standaloneSurface();
    surface.querySelector("[data-excess-detail-target='prioritization']").click();
    const grid = surface.querySelector(".excess-decision-basis-grid");

    surface.style.width = "650px";
    await nextFrame(app);
    assert.equal(columns(app.getComputedStyle(grid)), 1, "A 650px decision surface should stack Score and Context");

    surface.style.width = "820px";
    await nextFrame(app);
    assert.equal(columns(app.getComputedStyle(grid)), 2, "A genuinely wide decision surface may place Score and Context side by side");
  });

  test("IR-DETAIL-UX-01.1 renders Operational Context as a semantic definition grid", async assert => {
    const { app, surface } = await embeddedSurface();
    surface.querySelector("[data-excess-detail-target='prioritization']").click();
    const context = surface.querySelector("dl.excess-operational-context");
    const rows = [...context.children];

    assert.ok(Boolean(context), "Operational Context should be a definition list");
    assert.equal(rows.length, 4, "Operational Context should preserve all four accepted values");
    assert.equal(rows.every(row => row.querySelector(":scope > dt") && row.querySelector(":scope > dd")), true, "Every context value should have a semantic term and definition");
    assert.equal(context.querySelectorAll("b, i").length, 0, "Legacy run-on separators should be removed");
    assert.equal(app.getComputedStyle(context).display, "grid", "Operational Context should use the shared structured grid");
  });

  test("IR-DETAIL-UX-01.1 strengthens the History empty state without inventing history", async assert => {
    const { app, bridge, surface } = await embeddedSurface();
    surface.querySelector("[data-excess-detail-target='history']").click();
    let state = surface.querySelector(".excess-historical-state.unavailable");

    assert.ok(Boolean(state), "Missing Consumption History should remain an unavailable state");
    assert.equal(state.dataset.historyState, "unavailable", "The historical state must remain truthful");
    assert.equal(state.querySelector("[data-oq-icon='history']")?.getAttribute("aria-hidden"), "true", "The existing History icon should support the empty state decoratively");
    assert.equal(state.querySelector("[data-data-foundation-import-consumption-history]")?.textContent.trim(), "Verbrauchshistorie importieren", "The German CTA should name the exact source package");
    assert.equal(surface.textContent.includes("Inventory-Wert"), false, "The German decision surface should not retain the legacy Inventory wording");
    assert.equal(surface.textContent.includes("Bestandswert"), true, "The German decision surface should use Bestandswert");
    assert.equal(surface.textContent.includes("keine Erfolgsprognose"), true, "The German Score copy should describe prioritization without a success forecast");

    bridge.updateLanguageForTest("en");
    const englishSurface = app.document.querySelector(".inventory-risk-detail [data-excess-decision-surface]");
    englishSurface.querySelector("[data-excess-detail-target='history']").click();
    state = englishSurface.querySelector(".excess-historical-state.unavailable");
    assert.equal(state.querySelector("[data-data-foundation-import-consumption-history]")?.textContent.trim(), "Import consumption history", "The English CTA should name the exact source package");
    assert.equal(englishSurface.textContent.includes("not a success forecast"), true, "The English Score copy should retain the non-predictive boundary");
    bridge.updateLanguageForTest("de");
  });
})();
