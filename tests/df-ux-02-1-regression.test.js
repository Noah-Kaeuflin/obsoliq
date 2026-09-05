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

  function openDataFoundation(app) {
    const summary = app.document.querySelector("#dataPackagesPanel .data-foundation-summary");
    if (!summary) throw new Error("Missing Data Foundation summary.");
    summary.click();
    return waitFor(() => app.document.querySelector("#dataPackagesPanel .data-foundation[open]"), "open Data Foundation");
  }

  function availablePackage(packageType) {
    return {
      status: "active",
      packageType,
      packageValidation: { statusKey: "valid" },
      sourceDescriptor: { rows: 1 },
      freshness: { importedAt: "2026-08-22T10:00:00.000Z" },
      buildData: {
        normalizedRowCount: 1,
        buildMetadata: {
          historyReadiness: { status: "ready" }
        }
      },
      interpretationMetadata: {
        trustState: "trusted"
      }
    };
  }

  test("DF-UX-02.1 prioritized summary keeps sourceStates authoritative", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const model = bridge.buildDataFoundationPresentationModelForTest();
    const summary = app.document.querySelector("#dataPackagesPanel .data-foundation-summary");

    assert.equal(model.summary.primaryText, "Bestandsanalyse aktiv", "Inventory-only primary summary should prioritize active inventory analysis");
    assert.equal(model.summary.secondaryText, "2 Erweiterungen fehlen", "Inventory-only secondary summary should aggregate missing optional extensions");
    assert.equal(Object.keys(model.sourceStates).length, 4, "Source states include the explicitly optional PO extension");
    assert.equal(model.sourceStates.materialMaster.missing, true, "Material Master source truth should remain missing");
    assert.equal(model.sourceStates.consumptionHistory.missing, true, "Consumption History source truth should remain missing");
    assert.equal(summary.textContent.includes("Materialstamm fehlt"), false, "Collapsed summary should not show Material Master as an equal-weight segment");
    assert.equal(summary.textContent.includes("Historie fehlt"), false, "Collapsed summary should not show History as an equal-weight segment");
  });

  test("DF-UX-02.1 one missing extension and one review source use singular summaries", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    const materialMasterPackage = availablePackage("material_master");
    const consumptionHistoryPackage = availablePackage("consumption_history");
    const materialRelationship = { status: "executed", eligibleInventoryRowCount: 1, matchedInventoryRowCount: 1,
      matchRate: 1, unmatchedCount: 0, ambiguousCount: 0, invalidKeyCount: 0, conflictCount: 0 };
    const oneMissingModel = bridge.buildDataFoundationPresentationModelForTest({
      materialRelationship,
      materialMasterPackage,
      consumptionHistoryPackage: null,
      historicalRuntimeState: { status: "unavailable" }
    });
    const reviewModel = bridge.buildDataFoundationPresentationModelForTest({
      materialRelationship,
      materialMasterPackage,
      consumptionHistoryPackage,
      historicalRuntimeState: { status: "limited" }
    });

    assert.equal(oneMissingModel.summary.secondaryText, "1 Erweiterung fehlt", "One missing extension should use singular wording");
    assert.equal(oneMissingModel.summary.missingExtensionCount, 1, "One missing extension should remain counted explicitly");
    assert.equal(reviewModel.summary.secondaryText, "1 Quelle prüfen", "One review source should use singular wording");
    assert.equal(reviewModel.summary.reviewSourceCount, 1, "One review source should remain counted explicitly");
  });

  test("DF-UX-02.1 critical foundation state asks for Data Foundation review", async assert => {
    const app = await helpers.loadApp();
    const model = app.__obsoliqTestBridge.buildDataFoundationPresentationModelForTest({
      inventoryPackage: null,
      materialMasterPackage: null,
      consumptionHistoryPackage: null,
      historicalRuntimeState: { status: "unavailable" }
    });

    assert.equal(model.summary.primaryText, "Datenbasis prüfen", "Missing inventory foundation should be a critical review state");
    assert.equal(model.summary.sourceStates.length, 3, "Critical state should still retain all source-state projections");
  });

  test("DF-UX-02.1 open surface uses compact rows and accessible X close", async assert => {
    const app = await helpers.loadSampleApp();
    const bridge = app.__obsoliqTestBridge;
    bridge.resetHistoricalMetricsBuildCountersForTest();
    const details = await openDataFoundation(app);
    const text = details.textContent;
    const close = details.querySelector(".data-foundation-close");

    assert.ok(details.querySelector(".data-foundation-source.compact-active"), "Inventory should render as compact-active source row");
    assert.equal(details.querySelectorAll(".data-foundation-source.actionable-missing").length, 3, "Missing extensions include optional PO without blocking inventory");
    assert.equal(text.includes("Autoritative Quelle"), false, "Long Inventory benefit paragraph should not render");
    assert.equal(text.includes("Importiere den Materialstamm"), false, "Missing Material Master should not repeat import explanation");
    assert.equal(text.includes("Importiere die Verbrauchshistorie"), false, "Missing history should not repeat import explanation");
    assert.equal(text.includes("Nicht importiert"), false, "Visible Not Imported text should not duplicate the Import action");
    assert.ok(close, "X close action should exist");
    assert.equal(close.getAttribute("aria-label"), "Datenbasis schließen", "X close should have localized German label");
    close.click();
    assert.equal(app.document.querySelector("#dataPackagesPanel .data-foundation").open, false, "X close should close the surface");
    assert.equal(bridge.getHistoricalMetricsBuildCountersForTest().buildCount, 0, "Opening and closing Data Foundation should not build historical metrics");
  });

  test("DF-UX-02.1 desktop popover and mobile drawer semantics stay isolated", async assert => {
    const frame = document.getElementById("appFrame");
    frame.style.width = "1024px";
    let app = await helpers.loadSampleApp();
    let bridge = app.__obsoliqTestBridge;
    bridge.resetHistoricalMetricsBuildCountersForTest();
    await openDataFoundation(app);
    let detail = app.document.getElementById("dataFoundationDetail");

    assert.equal(detail.getAttribute("role"), "region", "Desktop Data Foundation should be non-modal");
    assert.equal(detail.getAttribute("aria-modal"), null, "Desktop popover should not set aria-modal");
    assert.equal(app.getComputedStyle(app.document.querySelector(".data-foundation-scrim")).display, "none", "Desktop popover should not show a scrim");
    app.document.body.click();
    assert.equal(app.document.querySelector("#dataPackagesPanel .data-foundation").open, false, "Desktop outside click should close");
    assert.equal(bridge.getHistoricalMetricsBuildCountersForTest().buildCount, 0, "Desktop interaction should not build historical metrics");

    frame.style.width = "390px";
    frame.style.height = "800px";
    app = await helpers.loadSampleApp();
    bridge = app.__obsoliqTestBridge;
    bridge.resetHistoricalMetricsBuildCountersForTest();
    await openDataFoundation(app);
    await waitFor(() => app.document.getElementById("dataFoundationDetail")?.getAttribute("role") === "dialog", "mobile Data Foundation dialog mode");
    detail = app.document.getElementById("dataFoundationDetail");

    assert.equal(detail.getAttribute("role"), "dialog", "Mobile Data Foundation should use dialog semantics");
    assert.equal(detail.getAttribute("aria-modal"), "true", "Mobile drawer should set aria-modal");
    assert.equal(app.getComputedStyle(app.document.querySelector(".data-foundation-scrim")).display, "block", "Mobile drawer should show a scrim");
    assert.equal(app.document.body.classList.contains("data-foundation-modal-open"), true, "Mobile drawer should lock body scroll");
    assert.equal(detail.contains(app.document.activeElement), true, "Mobile drawer should receive focus");
    app.document.querySelector(".data-foundation-scrim").click();
    assert.equal(app.document.querySelector("#dataPackagesPanel .data-foundation").open, false, "Mobile scrim should close the drawer");
    assert.equal(bridge.getHistoricalMetricsBuildCountersForTest().buildCount, 0, "Mobile interaction should not build historical metrics");
    frame.style.width = "";
    frame.style.height = "";
  });
})();
