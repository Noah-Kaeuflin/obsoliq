(function () {
  let frameVersion = 0;
  const CALIBRATION_ANALYSIS_SCRIPTS = Object.freeze([
    "../js/slow-dead/slow-dead-calibration-contract.js",
    "../js/slow-dead/slow-dead-calibration-runner.js",
    "../js/slow-dead/slow-dead-calibration-metrics.js",
    "../js/slow-dead/slow-dead-threshold-sensitivity.js",
    "fixtures/slow-dead-calibration-fixtures.js"
  ]);

  function appHtml(options = {}) {
    frameVersion += 1;
    const baseHref = new URL("../", window.location.href).href;
    const sourceHtml = window.__OBSOLIQ_APP_HTML || "";
    const html = sourceHtml.includes("<base ")
      ? sourceHtml.replace('<base href="../">', `<base href="${baseHref}">`)
      : sourceHtml.replace("<head>", `<head>\n  <base href="${baseHref}">`);
    if (!html) throw new Error("Missing ObsoliQ app HTML template.");
    const testHtml = options.testMode === false ? html : html.replace(
      '<script src="sample-data.js"></script>',
      `<script>window.__OBSOLIQ_TEST_MODE__ = true; window.__OBSOLIQ_TEST_FRAME_VERSION__ = ${frameVersion};</script>\n  <script src="sample-data.js"></script>`
    );
    return testHtml.replace(/src="([^"]+\.js)"/g, (_match, src) => `src="${src}?v=${frameVersion}"`);
  }

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

  async function loadApp(options = {}) {
    const frame = document.getElementById("appFrame");
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out loading app iframe")), 8000);
      frame.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      frame.srcdoc = appHtml(options);
    });
    const app = frame.contentWindow;
    if (options.testMode === false) {
      await waitFor(() => app.ObsoliQ?.data?.packageRegistry, "ObsoliQ production app");
      return app;
    }
    await waitFor(() => app.__obsoliqTestBridge, "ObsoliQ test bridge");
    return app;
  }

  function loadProductionApp() {
    return loadApp({ testMode: false });
  }

  function injectAppScript(app, relativePath) {
    return new Promise((resolve, reject) => {
      const script = app.document.createElement("script");
      script.src = new URL(relativePath, window.location.href).href;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to inject ${relativePath}`));
      app.document.body.appendChild(script);
    });
  }

  async function loadCalibrationAnalysisApp(options = {}) {
    const app = options.sampleData ? await loadSampleApp() : await loadProductionApp();
    for (const relativePath of CALIBRATION_ANALYSIS_SCRIPTS) {
      await injectAppScript(app, relativePath);
    }
    return app;
  }

  async function loadSampleApp() {
    const app = await loadApp();
    const result = await app.__obsoliqTestBridge.loadSample();
    if (result?.status !== "loaded") {
      throw new Error(`Sample load failed with status ${result?.status}`);
    }
    return app;
  }

  function withThrowingConsoleAssert(app, fn) {
    const originalAssert = app.console.assert;
    app.console.assert = (condition, ...args) => {
      if (!condition) throw new Error(args.join(" ") || "console.assert failed");
    };
    try {
      return fn();
    } finally {
      app.console.assert = originalAssert;
    }
  }

  function simpleCsv(material = "MAT-TXN", value = "100") {
    return [
      "Material Number,Material Description,Stock Value EUR,Profit Center,Program,Excess Value,No Demand Value,Blocked Stock Value,Unplanned Value",
      `${material},Test material,${value},PC-T,Program T,20,30,10,5`
    ].join("\n");
  }

  function remapCsv() {
    return [
      "Item,Description,Value,PC,Program,No Demand Value",
      "MAT-MAP,Mapping material,140,PC-M,Program M,70"
    ].join("\n");
  }

  function currentChips(app) {
    return {
      source: [...app.document.querySelectorAll(".dataset-source-chip")].map(element => element.textContent),
      rows: [...app.document.querySelectorAll(".dataset-rows-chip")].map(element => element.textContent),
      columns: [...app.document.querySelectorAll(".dataset-columns-chip")].map(element => element.textContent),
      visible: [...app.document.querySelectorAll(".dataset-visible-chip")].map(element => element.textContent),
      status: app.document.getElementById("statusText")?.textContent || ""
    };
  }

  window.ObsoliQTestHelpers = {
    CALIBRATION_ANALYSIS_SCRIPTS,
    loadApp,
    loadProductionApp,
    loadCalibrationAnalysisApp,
    loadSampleApp,
    injectAppScript,
    withThrowingConsoleAssert,
    simpleCsv,
    remapCsv,
    currentChips
  };
})();
