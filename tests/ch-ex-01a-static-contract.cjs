const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const appSource = read("app.js");
const prototypeSource = read("prototype.html");
const decisionSource = read("js/excess/excess-decision-workspace-model.js");
const scoreSource = read("js/excess/opportunity-score-engine.js");
const serviceSource = read("js/application/excess-analysis-service.js");
const testsSource = read("tests/tests.html");
const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function scriptSources(source) {
  return [...source.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1].split("?")[0]);
}

function count(pattern, source = appSource) {
  return (source.match(pattern) || []).length;
}

const requiredFiles = [
  "prototype.html",
  "app.js",
  "styles.css",
  "js/application/excess-analysis-service.js",
  "js/excess/excess-decision-workspace-model.js",
  "js/excess/opportunity-score-engine.js",
  "tests/tests.html",
  "tests/ch-ex-01a-regression.test.js",
  "tests/ch-ex-01a-static-contract.cjs",
  "tests/ch-ex-01a-product-smoke.cjs",
  "tests/smoke-runtime.cjs",
  "tests/run-browser-suite.cjs",
  "ARCHITECTURE.md",
  "DATA_CONTRACT.md",
  "PRODUCT_SPEC.md",
  "CHANGELOG.md"
];
requiredFiles.forEach(relativePath => check(fs.existsSync(path.join(root, relativePath)), `Missing required package file: ${relativePath}`));

const productScripts = scriptSources(prototypeSource);
const requiredProductOrder = [
  "js/excess/excess-analysis-engine.js",
  "js/excess/opportunity-score-engine.js",
  "js/excess/excess-scenario-engine.js",
  "js/excess/excess-decision-workspace-model.js",
  "js/application/excess-analysis-service.js",
  "app.js"
];
requiredProductOrder.forEach(source => {
  check(productScripts.filter(item => item === source).length === 1, `Product script must be loaded exactly once: ${source}`);
  check(fs.existsSync(path.join(root, source)), `Product script does not exist: ${source}`);
});
check(requiredProductOrder.every((source, index) => index === 0 || productScripts.indexOf(requiredProductOrder[index - 1]) < productScripts.indexOf(source)), "Product script dependency order is inconsistent");
check(new Set(productScripts).size === productScripts.length, "prototype.html contains duplicate script sources");

const appTemplateContext = { window: {} };
vm.runInNewContext(read("tests/app-template.js"), appTemplateContext, { filename: "tests/app-template.js" });
const templateScripts = scriptSources(appTemplateContext.window.__OBSOLIQ_APP_HTML || "");
check(JSON.stringify(templateScripts) === JSON.stringify(productScripts), "tests/app-template.js does not match the real prototype script order");

const registeredTests = scriptSources(testsSource);
check(new Set(registeredTests).size === registeredTests.length, "tests/tests.html contains duplicate script registrations");
registeredTests.forEach(source => check(fs.existsSync(path.join(root, "tests", source)), `Registered test file does not exist: tests/${source}`));
[
  "ex-ux-01-regression.test.js",
  "ex-ux-01-1-regression.test.js",
  "ex-ux-01-2-regression.test.js",
  "ex-ux-01-3-regression.test.js",
  "ex-ux-01-3-1-regression.test.js",
  "ex-ux-01-4-regression.test.js",
  "ex-ux-01-5-regression.test.js",
  "ex-ux-01-6-regression.test.js",
  "ch-ex-01a-regression.test.js"
].forEach(source => check(registeredTests.includes(source), `Required regression test is not registered: ${source}`));

check(/const VERSION = "3";/.test(decisionSource), "Workspace Projection version is not 3");
check(/READINESS_MODEL_VERSION = "excess-decision-readiness-v2"/.test(decisionSource), "Decision Readiness version is not v2");
check(/GROSS_NET_RECONCILIATION_VERSION = "gross-net-reconciliation-v1"/.test(decisionSource), "Gross-to-Net Reconciliation version constant is missing");
check(/GROSS_NET_RECONCILIATION_EPSILON = 0\.01/.test(decisionSource), "Central Gross-to-Net epsilon is missing");
check(/decisionContracts:\s*decisionContractVersions\(\)/.test(serviceSource), "Application Service does not emit Decision contract versions");
check(/workspaceProjection[\s\S]*decisionReadiness[\s\S]*grossNetReconciliation/.test(serviceSource), "Application Service contract metadata is incomplete");
check(!/gross\s*-\s*overlap\s*-\s*net/.test(appSource), "app.js must not reimplement Gross-to-Net reconciliation");
check(!/opportunity_score_metadata\s*:/.test(appSource), "app.js must not construct Opportunity Score metadata");

[
  ["netConsumption3m", /\bnetConsumption3m\s*:/g, 2],
  ["netConsumption6m", /\bnetConsumption6m\s*:/g, 2],
  ["importError", /\bimportError\s*:/g, 2]
].forEach(([key, pattern, expected]) => check(count(pattern) === expected, `${key}: expected ${expected} canonical DE/EN definitions, found ${count(pattern)}`));
check(!/historicalMetricsRuntimeBuildLog\.push\s*\(/.test(appSource), "Historical Runtime build log still uses unbounded push");
check(!/slowDeadRecoveryCaseBuildLog\.push\s*\(/.test(appSource), "Slow / Dead build log still uses unbounded push");
check(/const RUNTIME_BUILD_LOG_LIMIT = 50;/.test(appSource), "Runtime log limit is not fixed at 50");
check(/uncappedScore/.test(scoreSource) && /finalScore/.test(scoreSource) && /scoreCap/.test(scoreSource) && /maxComponentTotal/.test(scoreSource) && /cappedPoints/.test(scoreSource) && /wasCapped/.test(scoreSource), "Score-cap metadata is incomplete");

const activeDocs = `${read("ARCHITECTURE.md")}\n${read("DATA_CONTRACT.md")}\n${read("PRODUCT_SPEC.md")}`;
check(/projection model is version `3`|Version `3` consumes|Workspace Projection(?: version)? `3`/i.test(activeDocs), "Current documentation does not state Workspace Projection 3");
check(/excess-decision-readiness-v2/.test(activeDocs), "Current documentation does not state Decision Readiness v2");
check(/gross-net-reconciliation-v1/.test(activeDocs), "Current documentation does not state Gross-to-Net Reconciliation v1");

const smokeFiles = fs.readdirSync(path.join(root, "tests")).filter(name => name.endsWith("product-smoke.cjs"));
smokeFiles.forEach(name => {
  const source = read(path.join("tests", name));
  check(!/[A-Za-z]:[\\/]Users[\\/]/.test(source), `Smoke test contains a hard-coded user path: tests/${name}`);
  check(source.includes("./smoke-runtime.cjs"), `Smoke test does not use the portable runtime resolver: tests/${name}`);
});

const report = {
  status: failures.length ? "failed" : "passed",
  checks,
  productScriptCount: productScripts.length,
  registeredTestScriptCount: registeredTests.length,
  smokeFileCount: smokeFiles.length,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
