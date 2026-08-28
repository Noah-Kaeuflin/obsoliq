const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function scriptSources(html) {
  return [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1].split("?")[0]);
}

function localAssetReferences(html) {
  const references = [];
  for (const match of html.matchAll(/<(?:script|img)\b[^>]*\ssrc="([^"]+)"/g)) references.push(match[1]);
  for (const match of html.matchAll(/<link\b[^>]*\shref="([^"]+)"/g)) references.push(match[1]);
  return references.map(value => value.split("?")[0]);
}

function validateLocalReference(baseDirectory, reference, label) {
  const normalized = reference.replace(/\\/g, "/");
  check(!/^(?:[a-z]+:|\/\/|\/)/i.test(normalized), `${label} must be package-relative: ${reference}`);
  const target = path.resolve(baseDirectory, normalized);
  check(target === root || target.startsWith(`${root}${path.sep}`), `${label} resolves outside the package: ${reference}`);
  check(fs.existsSync(target), `${label} does not exist: ${reference}`);
}

const prototype = read("prototype.html");
const testsHtml = read("tests/tests.html");
const helpers = read("tests/test-helpers.js");
const productScripts = scriptSources(prototype);
const testScripts = scriptSources(testsHtml);
const analysisOnlyScripts = [
  "js/slow-dead/slow-dead-calibration-contract.js",
  "js/slow-dead/slow-dead-calibration-runner.js",
  "js/slow-dead/slow-dead-calibration-metrics.js",
  "js/slow-dead/slow-dead-threshold-sensitivity.js"
];
const expectedAnalysisBootstrap = [
  "../js/slow-dead/slow-dead-calibration-contract.js",
  "../js/slow-dead/slow-dead-calibration-runner.js",
  "../js/slow-dead/slow-dead-calibration-metrics.js",
  "../js/slow-dead/slow-dead-threshold-sensitivity.js",
  "fixtures/slow-dead-calibration-fixtures.js"
];

localAssetReferences(prototype).forEach(reference => validateLocalReference(root, reference, "Product reference"));
testScripts.forEach(reference => validateLocalReference(path.join(root, "tests"), reference, "Test entry reference"));
check(new Set(productScripts).size === productScripts.length, "Product entry loads a script more than once");
check(new Set(testScripts).size === testScripts.length, "Test entry loads a script more than once");
analysisOnlyScripts.forEach(script => check(!productScripts.includes(script), `Production loads analysis-only module: ${script}`));
check(productScripts.filter(script => script === "js/ui/obsoliq-icon-system.js").length === 1, "Icon runtime must be loaded exactly once");
check(productScripts.indexOf("js/slow-dead/slow-dead-condition-engine.js") < productScripts.indexOf("js/slow-dead/slow-dead-page-model.js"), "Condition Engine dependency order is invalid");
check(productScripts.indexOf("js/ui/obsoliq-icon-system.js") < productScripts.indexOf("app.js"), "Icon runtime must load before app.js");

const analysisListMatch = helpers.match(/const CALIBRATION_ANALYSIS_SCRIPTS = Object\.freeze\((\[[\s\S]*?\])\);/);
check(Boolean(analysisListMatch), "Analysis bootstrap list is not statically inspectable");
if (analysisListMatch) {
  const analysisScripts = JSON.parse(analysisListMatch[1]);
  check(JSON.stringify(analysisScripts) === JSON.stringify(expectedAnalysisBootstrap), "Analysis bootstrap dependencies or order differ from the accepted contract");
  check(new Set(analysisScripts).size === analysisScripts.length, "Analysis bootstrap loads a dependency more than once");
  analysisScripts.forEach(reference => validateLocalReference(path.join(root, "tests"), reference, "Analysis reference"));
}

const templateContext = { window: {} };
vm.runInNewContext(read("tests/app-template.js"), templateContext, { filename: "tests/app-template.js" });
check(templateContext.window.__OBSOLIQ_APP_HTML === prototype, "Product-like test template must exactly mirror prototype.html");

const ids = [...prototype.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
check(duplicateIds.length === 0, `Duplicate product HTML IDs: ${duplicateIds.join(", ")}`);

const appSource = read("app.js");
["calibrationContract", "calibrationRunner", "calibrationMetrics", "thresholdSensitivity"].forEach(token => {
  check(!appSource.includes(token), `app.js unexpectedly depends on analysis token: ${token}`);
});

const requiredPackageFiles = [
  "assets/icons/obsoliq/icon-manifest.json",
  "assets/icons/obsoliq/obsoliq-icon-sprite.svg",
  "assets/icons/obsoliq/LICENSE-LUCIDE.txt",
  "assets/icons/obsoliq/README.md",
  "js/ui/obsoliq-icon-system.js",
  ...analysisOnlyScripts,
  "tests/fixtures/slow-dead-calibration-fixtures.js",
  "tests/fixtures/slow-dead-calibration-baseline-evidence.json",
  "tests/fixtures/slow-dead-calibration-sensitivity-evidence.json",
  "AP_16_4D_3A_FIXTURE_BASELINE.md",
  "AP_16_4D_3B_CALIBRATION_METRICS_AND_SENSITIVITY.md",
  "artifacts/ap-16-4d-3b-metrics.json",
  "artifacts/ap-16-4d-3b-sensitivity.csv"
];
requiredPackageFiles.forEach(relativePath => check(fs.existsSync(path.join(root, relativePath)), `Required package file missing: ${relativePath}`));

console.log(JSON.stringify({
  status: failures.length ? "failed" : "passed",
  checks,
  productScriptCount: productScripts.length,
  testEntryScriptCount: testScripts.length,
  productHtmlIdCount: ids.length,
  duplicateHtmlIdCount: duplicateIds.length,
  failures
}, null, 2));
if (failures.length) process.exit(1);
