"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createHash } = require("node:crypto");
const generator = require("../scripts/generate-linked-demo-data.cjs");

const root = path.resolve(__dirname, "..");
const results = [];
const check = (condition, message) => {
  results.push({ status: condition ? "PASS" : "FAIL", message });
  if (!condition) throw new Error(message);
};
const read = relativePath => fs.readFileSync(path.join(root, relativePath));
const text = relativePath => read(relativePath).toString("utf8");
const sha256 = value => createHash("sha256").update(value).digest("hex");
const lineCount = value => value.toString("utf8").trimEnd().split("\n").length - 1;

function main() {
  const first = generator.buildOutputs();
  const second = generator.buildOutputs();
  check(JSON.stringify(first) === JSON.stringify(second), "Generator output must be deterministic across independent in-process builds");

  Object.entries(first).forEach(([relativePath, generated]) => {
    const packaged = read(relativePath);
    check(packaged.equals(Buffer.from(generated, "utf8")), `${relativePath} must match fresh generator output byte-for-byte`);
    check(!packaged.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), `${relativePath} must be UTF-8 without BOM`);
    check(!packaged.includes(13), `${relativePath} must use LF without CR bytes`);
  });

  const oracle = JSON.parse(text("data/demo/demo-expectations.json"));
  const context = vm.createContext({ window: {} });
  vm.runInContext(text("demo-data.js"), context, { filename: "demo-data.js" });
  const demo = JSON.parse(JSON.stringify(context.window.ObsoliQFullDemo));
  check(demo.version === "obsoliq-linked-demo-v1", "Product descriptor version must be frozen");
  check(demo.classification === "synthetic", "Product descriptor must be classified synthetic");
  check(demo.analysisAsOf === "2026-08-31" && demo.timezone === "UTC", "Analysis date and timezone must be frozen");
  check(JSON.stringify(demo.expectations) === JSON.stringify(oracle), "Embedded expectations must match the independent machine-readable oracle");
  check(demo.sources.inventorySnapshot.csv === text("data/demo/inventory-snapshot.csv"), "Embedded Inventory source must match its standalone artifact");
  check(demo.sources.materialMaster.csv === text("data/demo/material-master.csv"), "Embedded Material Master source must match its standalone artifact");
  check(demo.sources.consumptionHistory.csv === text("data/demo/consumption-history.csv"), "Embedded Consumption History source must match its standalone artifact");
  check(demo.templates.materialMaster.csv === text("data/templates/material-master-template.csv"), "Embedded Material Master template must match its standalone artifact");
  check(demo.templates.consumptionHistory.csv === text("data/templates/consumption-history-template.csv"), "Embedded History template must match its standalone artifact");

  const sourceHashes = {
    inventory_snapshot_csv: sha256(read("data/demo/inventory-snapshot.csv")),
    material_master_csv: sha256(read("data/demo/material-master.csv")),
    consumption_history_csv: sha256(read("data/demo/consumption-history.csv"))
  };
  check(JSON.stringify(sourceHashes) === JSON.stringify(oracle.source_hashes), "Independent source hashes must match the oracle");
  check(lineCount(read("data/demo/inventory-snapshot.csv")) === oracle.row_counts.inventory_snapshot, "Inventory artifact row count must match the oracle");
  check(lineCount(read("data/demo/material-master.csv")) === oracle.row_counts.material_master, "Material Master artifact row count must match the oracle");
  check(lineCount(read("data/demo/consumption-history.csv")) === oracle.row_counts.consumption_history, "History artifact row count must match the oracle");

  const mmHeader = text("data/templates/material-master-template.csv").trimEnd();
  const chHeader = text("data/templates/consumption-history-template.csv").trimEnd();
  check(mmHeader === generator.MATERIAL_MASTER_HEADERS.join(","), "Material Master template must contain the exact approved header");
  check(chHeader === generator.CONSUMPTION_HISTORY_HEADERS.join(","), "History template must contain the exact approved header");
  check(lineCount(read("data/templates/material-master-template.csv")) === 0, "Material Master template must be header-only");
  check(lineCount(read("data/templates/consumption-history-template.csv")) === 0, "History template must be header-only");

  const forbiddenDerivedFields = ["primary_category", "condition_code", "risk_class", "evidence_readiness", "recovery_case_eligibility"];
  for (const relativePath of ["data/demo/inventory-snapshot.csv", "data/demo/material-master.csv", "data/demo/consumption-history.csv"]) {
    const header = text(relativePath).split("\n", 1)[0].split(",");
    forbiddenDerivedFields.forEach(field => check(!header.includes(field), `${relativePath} must not contain derived output field ${field}`));
  }

  const history = text("data/demo/consumption-history.csv");
  check(history.includes(",0,EA,261,"), "History source must contain explicit numeric zero evidence");
  check(history.includes(",25,EA,262,"), "History source must contain an explicit 262 reversal row");
  check(oracle.cohorts.stable >= 20, "Stable cohort minimum must be met");
  check(oracle.cohorts.declining >= 5, "Declining cohort minimum must be met");
  check(oracle.cohorts.intermittent >= 5, "Intermittent cohort minimum must be met");
  check(oracle.cohorts.slow >= 4, "Slow cohort minimum must be met");
  check(oracle.cohorts.nonmoving >= 3, "Non-moving cohort minimum must be met");
  check(oracle.cohorts.dead >= 2, "Dead cohort minimum must be met");
  check(Object.values(oracle.boundary_entities).every(Boolean), "All required boundary entities must be declared");

  const sampleContext = vm.createContext({ window: {} });
  vm.runInContext(text("sample-data.js"), sampleContext, { filename: "sample-data.js" });
  check(sha256(Buffer.from(sampleContext.window.sampleCsv, "utf8")) === oracle.compatibility_sample_hash, "window.sampleCsv must remain byte-compatible with the frozen sample");
  check(sha256(read("sample-data.js")) === "51884fb9e5e6f35d6bdfdd7491a129b2d088145d72898616ff0151e818510796", "sample-data.js must remain unchanged");
  check(sha256(read("js/recovery/recovery-engine.js")) === "9d50e4603f92b33fa0f92e28d3b7d8ea2a11a05dca79d42c2a151768b581b3da", "Recovery formulas must remain unchanged from candidate E");
  check(sha256(read("js/slow-dead/slow-dead-condition-engine.js")) === "7c7a4e3e51b39d89e12daf93dadb20908a87234061677a3fcf4aa8784469e03f", "Slow/Dead condition policy must remain unchanged from candidate E");
  check(sha256(read("styles.css")) === "ee52702b3683d47ab70959c31b7e22dc395d2e48fa7b72c4e9d37c43eff9d218", "styles.css must remain unchanged from approved handoff baseline 2dbf1514");

  const prototype = text("prototype.html");
  check(prototype.indexOf('<script src="sample-data.js"></script>') < prototype.indexOf('<script src="demo-data.js"></script>'), "Compatibility sample must load before the generated full-demo descriptor");
  check(prototype.indexOf('<script src="demo-data.js"></script>') < prototype.indexOf('<script src="js/core/canonical-model.js"></script>'), "Full-demo descriptor must load before productive modules");
  check((prototype.match(/id="fileInput"/g) || []).length === 1, "The product must retain exactly one upload input");

  const appSource = text("app.js");
  const fullDemoBody = appSource.slice(appSource.indexOf("async function executeFullDemoLoad"), appSource.indexOf("function loadFullDemoData"));
  check(fullDemoBody.includes("loadTextDataset(inventorySource.csv"), "Full demo must import Inventory through the productive text-import boundary");
  check(fullDemoBody.includes("loadTextDataset(materialMasterSource.csv"), "Full demo must import Material Master through the productive text-import boundary");
  check(fullDemoBody.includes("loadTextDataset(consumptionHistorySource.csv"), "Full demo must import History through the productive text-import boundary");
  check(!/registerPackage|updatePackage|setActivePackage/.test(fullDemoBody), "Full demo must not write the Registry directly");
  check(!/buildHistoricalMetricRuntime|buildSlowDeadRecoveryCases/.test(fullDemoBody), "Full demo must not bypass Runtime orchestration");
  check(appSource.includes("loadInventoryDatasetWithSourceIsolation"), "User Inventory imports must pass through demo-extension isolation");

  const packageImportSource = text("js/application/package-import-service.js");
  check(packageImportSource.includes('error.code = "EMPTY_DATASET_ROWS"'), "Generic Package import must identify header-only sources explicitly");
  check(packageImportSource.indexOf("if (source.rows.length === 0) return emptySourceBuildResult(packageType);") < packageImportSource.indexOf("const timestamp = clock();"), "Header-only Package import must stop before Dataset identity construction");

  const browserRegistration = text("tests/tests.html");
  check(browserRegistration.includes("data-foundation-activation-01-full-demo.test.js"), "Full-demo browser contract must be registered");
  check(text("tests/app-template.js") === `window.__OBSOLIQ_APP_HTML = ${JSON.stringify(prototype)};\n`, "Structured-test template must mirror prototype.html exactly");

  console.log(JSON.stringify({
    status: "PASS",
    checks: results.length,
    generatorVersion: generator.GENERATOR_VERSION,
    sourceHashes,
    rowCounts: oracle.row_counts,
    cohortCounts: oracle.cohorts
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({ status: "FAIL", checks: results.length, error: error.stack || error.message }, null, 2));
  process.exitCode = 1;
}
