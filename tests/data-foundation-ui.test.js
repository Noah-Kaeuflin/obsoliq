(function () {
  const { test } = window.ObsoliQTests;
  const helpers = window.ObsoliQTestHelpers;

  const MATERIAL_MASTER_TYPE = "material_master";

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

  function materialMasterCsv(rows = [
    ["MAT-1001", "1000", "Pressure sensor", "PC-100", "MRP-01"],
    ["MAT-1002", "1000", "Valve assembly", "PC-100", "MRP-01"]
  ]) {
    return [
      "Material Number,Plant,Material Description,Profit Center,MRP Controller",
      ...rows.map(row => row.join(","))
    ].join("\n");
  }

  async function loadOverviewApp() {
    const app = await helpers.loadSampleApp();
    await waitFor(() => app.document.querySelector("#dataPackagesPanel .data-foundation-summary"), "Data Foundation summary");
    return app;
  }

  function openDataFoundation(app) {
    const details = app.document.querySelector("#dataPackagesPanel .data-foundation");
    if (!details) throw new Error("Data Foundation details missing");
    details.open = true;
    return details;
  }

  test("DF-UX-02 Data Foundation presents compact capability states", async assert => {
    const app = await loadOverviewApp();
    const panel = app.document.getElementById("dataPackagesPanel");
    const details = openDataFoundation(app);
    const text = panel.textContent;
    const summarySegments = panel.querySelectorAll(".data-foundation-summary-segment");

    assert.equal(panel.parentElement, app.document.querySelector(".overview-header"), "Data Foundation should be part of the Overview header");
    assert.equal(app.document.querySelector("#view-dashboard #dataPackagesPanel"), null, "Dashboard grid should not own the Data Foundation panel");
    assert.equal(app.document.querySelector(".data-packages-card"), null, "Old large package card should not render");
    assert.ok(summarySegments.length <= 3, "Collapsed summary should render no more than three direct segments");
    assert.equal(text.includes("Kern-Datenbasis"), false, "Aggregate core counter should not be visible");
    assert.equal(text.includes("Optionale Intelligence-Quellen"), false, "Aggregate optional counter should not be visible");
    assert.ok(text.includes("Bestandsanalyse aktiv"), "Inventory capability should be shown as active analysis");
    assert.ok(text.includes("Materialstamm fehlt"), "Missing Material Master should be shown directly");
    assert.ok(text.includes("Historie fehlt"), "Missing history should be shown directly");
    assert.ok(text.includes("Bestandsdaten"), "Inventory source should be shown");
    assert.ok(text.includes("Materialstamm"), "Material Master source should be shown");
    assert.ok(text.includes("Verbrauchshistorie"), "Consumption History source should be shown as a product extension");
    assert.ok(text.includes("Nicht importiert"), "Missing Material Master should use explicit missing wording");
    assert.equal(text.includes("Noch nicht prüfbar"), false, "Missing Material Master should not create a separate not-assessable relationship card");
    assert.ok(!text.includes("0 Zeilen"), "Missing Material Master should not claim zero rows");
    assert.ok(!text.includes("Importiert: -"), "Missing Material Master should not show dash-import metadata");
    assert.ok(!text.includes("Granularität: -"), "Missing Material Master should not show dash-granularity metadata");
    assert.ok(!details.querySelector(".data-foundation-technical")?.textContent.includes("%"), "Technical detail should not imply a match rate");
    assert.ok(details.querySelector(".data-foundation-close"), "Drawer should expose a visible close action");
    assert.ok(details.querySelector(".data-foundation-detail-body"), "Drawer should have one explicit scroll owner");
  });

  test("DF-UX-01 Material Master import action uses the existing package upload flow", async assert => {
    const app = await loadOverviewApp();
    const bridge = app.__obsoliqTestBridge;
    const before = bridge.getRegistryStats();
    const fileInput = app.document.getElementById("fileInput");
    let clicked = false;
    fileInput.click = () => {
      clicked = true;
    };
    openDataFoundation(app);
    const button = app.document.querySelector("[data-data-foundation-import-material-master]");

    assert.ok(button, "Missing Material Master row should expose a real import action");
    button.click();

    const after = bridge.getRegistryStats();
    assert.equal(clicked, true, "Import action should delegate to the existing hidden file input");
    assert.equal(bridge.getState().pendingUploadPackageType, MATERIAL_MASTER_TYPE, "Import action should preselect the Material Master package type");
    assert.equal(after.packageCount, before.packageCount, "Opening the import flow must not mutate the Registry");
    assert.equal(after.sequence, before.sequence, "Opening the import flow must not consume a package sequence");
  });

  test("AP 16.2b Imported Material Master shows real relationship quality results", async assert => {
    const app = await loadOverviewApp();
    const bridge = app.__obsoliqTestBridge;
    const result = bridge.importMaterialMasterTextForTest(materialMasterCsv(), "material-master.csv");
    await waitFor(() => app.document.querySelector("#dataPackagesPanel .data-foundation.invalid"), "Data Foundation critical quality");
    openDataFoundation(app);
    const text = app.document.getElementById("dataPackagesPanel").textContent;
    const summarySegments = app.document.querySelectorAll("#dataPackagesPanel .data-foundation-summary-segment");

    assert.equal(result.status, "loaded", "Material Master import should use the existing package importer");
    assert.equal(summarySegments.length <= 3, true, "Summary should stay at three direct capability segments");
    assert.equal(text.includes("Kern-Datenbasis"), false, "Material Master state should not use aggregate core counters");
    assert.equal(text.includes("Optionale Intelligence-Quellen"), false, "Material Master state should not use optional aggregate counters");
    assert.ok(text.includes("Kontextanreicherung prüfen"), "Summary should expose relationship quality as context enrichment review");
    assert.ok(!text.includes("Datenbasis vollständig"), "A partial Material Master must not be reported as complete");
    assert.ok(text.includes("Verknüpfung durchgeführt"), "Relationship should show that row-level matching was executed");
    assert.ok(text.includes("Match Rate"), "Data Foundation should show the actual match rate");
    assert.ok(text.includes("Zugeordnete Zeilen"), "Data Foundation should show matched row counts");
    assert.ok(text.includes("Nicht zugeordnet"), "Data Foundation should show unmatched rows");
    assert.ok(text.includes("Finanz- und Recovery-Werte"), "Disclaimer should confirm protected financial and recovery fields");
  });

  test("DF-UX-01 Data Foundation localizes source and relationship states in English", async assert => {
    const app = await loadOverviewApp();
    const languageSelect = app.document.getElementById("languageSelect");
    try {
      languageSelect.value = "en";
      languageSelect.dispatchEvent(new app.Event("change", { bubbles: true }));
      await waitFor(() => app.document.querySelector("#dataPackagesPanel .data-foundation-summary")?.textContent.includes("Data Foundation"), "English Data Foundation");
      openDataFoundation(app);
      const text = app.document.getElementById("dataPackagesPanel").textContent;

      assert.equal(text.includes("Core Data Foundation"), false, "English aggregate core summary should be removed");
      assert.equal(text.includes("Optional Intelligence Sources"), false, "English aggregate optional summary should be removed");
      assert.ok(text.includes("Inventory Analysis Active"), "English inventory capability should be localized");
      assert.ok(text.includes("Material Master Missing"), "English Material Master missing state should be localized");
      assert.ok(text.includes("History Missing"), "English History missing state should be localized");
      assert.ok(text.includes("Inventory Data"), "Inventory source should be localized");
      assert.ok(text.includes("Material Master"), "Material Master source should be localized");
      assert.ok(text.includes("Consumption History"), "Consumption History source should be localized");
      assert.ok(text.includes("Not Imported"), "Missing source state should be localized");
      assert.equal(text.includes("Not yet assessable"), false, "Missing Material Master should not render a separate not-assessable relationship card");
    } finally {
      languageSelect.value = "de";
      languageSelect.dispatchEvent(new app.Event("change", { bubbles: true }));
    }
  });

  test("DF-UX-01 Invalid relationship state remains a compatibility state, not a source import state", async assert => {
    const app = await loadOverviewApp();
    const bridge = app.__obsoliqTestBridge;
    const inventoryPackage = { relationshipKeys: { material: ["material_id"] }, status: "ready", packageValidation: { statusKey: "ready" } };
    const invalidMaterialPackage = { relationshipKeys: { material: ["material_id"] }, status: "invalid", packageValidation: { statusKey: "invalid" } };
    const readiness = bridge.relationshipReadinessForTest(inventoryPackage, invalidMaterialPackage);

    assert.equal(readiness.statusKey, "invalid", "Invalid Material Master packages should produce an invalid relationship readiness state");
    assert.equal(bridge.getActiveMaterialMasterPackage(), null, "Failed or invalid Material Master packages should not masquerade as active imported sources");
  });
})();
