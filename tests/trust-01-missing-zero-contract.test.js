(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  test("TRUST-01 T17/T20 renders missing Slow/Dead History as unavailable instead of calculated zero", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.switchInventoryRiskRouteForTest("inventory-risks", null, "all");
    bridge.updateLanguageForTest("de");
    bridge.renderInventoryRiskPageForTest();

    const runtime = bridge.getInventoryRiskPortfolioForTest();
    const model = bridge.getInventoryRiskPageModelForTest();
    const germanBadge = app.document.querySelector('[data-inventory-risk-segment="slow_dead"] strong')?.textContent.trim();
    assert.equal(runtime.familyAvailability.slow_dead.status, "unavailable", "Sample data without Consumption History must expose unavailable runtime status");
    assert.equal(model.familyAvailability.slow_dead.status, "unavailable", "Page Model must retain the analytical availability state");
    assert.equal(germanBadge, "n. v.", "German unavailable Slow/Dead segment must not look like calculated zero");

    app.document.querySelector('[data-inventory-risk-segment="slow_dead"]')?.click();
    const importButton = app.document.querySelector("[data-inventory-risk-import-history]");
    assert.ok(importButton, "Opened unavailable Slow/Dead segment must retain an import-history CTA");
    assert.ok(app.document.getElementById("inventoryRisksPage")?.innerText.includes("Verbrauchshistorie importieren"), "German CTA must explain how to make the segment assessable");

    bridge.updateLanguageForTest("en");
    bridge.renderInventoryRiskPageForTest();
    const englishBadge = app.document.querySelector('[data-inventory-risk-segment="slow_dead"] strong')?.textContent.trim();
    assert.equal(englishBadge, "n/a", "English unavailable Slow/Dead segment must not look like calculated zero");
    assert.ok(app.document.getElementById("inventoryRisksPage")?.innerText.includes("Import consumption history"), "English CTA must remain available");
  });

  test("TRUST-01 T18/T19 preserves true analytical zero while unavailable financial evidence stays null", async assert => {
    const app = await helpers.loadApp();
    const modelModule = app.ObsoliQ.inventoryRisks.pageModel;
    const unavailable = modelModule.buildPageModel({
      runtime: {
        portfolioCases: [],
        familyCases: [],
        counts: { all: 0, excess_demand: 0, slow_dead: 0, blocked_quality: 0, prioritized: 0 },
        familyAvailability: { slow_dead: { status: "unavailable", reasonCode: "consumption_history_missing" } }
      },
      state: { segment: "slow_dead" }
    });
    const trueZero = modelModule.buildPageModel({
      runtime: {
        portfolioCases: [],
        familyCases: [],
        counts: { all: 0, excess_demand: 0, slow_dead: 0, blocked_quality: 0, prioritized: 0 },
        familyAvailability: { slow_dead: { status: "available", reasonCode: "" } }
      },
      state: { segment: "slow_dead" }
    });

    assert.equal(unavailable.familyAvailability.slow_dead.status, "unavailable", "Missing evidence must remain unavailable in the Page Model");
    assert.equal(unavailable.summary.financials.slowDeadExposure.value, null, "Unavailable exposure must remain null, not zero");
    assert.equal(unavailable.emptyState, "risk_family_unavailable", "Unavailable runtime must retain its reasoned empty state");
    assert.equal(trueZero.familyAvailability.slow_dead.status, "available", "A completed zero-case calculation must remain available");
    assert.equal(trueZero.counts.slow_dead, 0, "A genuine completed zero may remain numeric zero");
    assert.equal(trueZero.summary.financials.slowDeadExposure.value, 0, "A completed zero-case calculation must expose a genuine financial zero");
    assert.notEqual(trueZero.emptyState, "risk_family_unavailable", "A genuine completed zero must not be rendered as unavailable");
  });
})();
