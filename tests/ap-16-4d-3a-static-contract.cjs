const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");

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

function sha256(relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");
}

function loadRuntime() {
  const sandbox = { console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  [
    "js/core/value-utils.js",
    "js/slow-dead/slow-dead-condition-engine.js",
    "js/slow-dead/slow-dead-calibration-contract.js",
    "js/slow-dead/slow-dead-calibration-runner.js",
    "tests/fixtures/slow-dead-calibration-fixtures.js"
  ].forEach(relativePath => {
    vm.runInContext(read(relativePath), sandbox, { filename: relativePath });
  });
  return sandbox;
}

const requiredFiles = [
  "js/slow-dead/slow-dead-calibration-contract.js",
  "js/slow-dead/slow-dead-calibration-runner.js",
  "tests/fixtures/slow-dead-calibration-fixtures.js",
  "tests/slow-dead-calibration-contract.test.js",
  "tests/slow-dead-calibration-fixtures.test.js",
  "tests/slow-dead-calibration-baseline.test.js",
  "tests/generate-slow-dead-calibration-baseline.cjs",
  "AP_16_4D_3A_FIXTURE_BASELINE.md"
];
requiredFiles.forEach(relativePath => check(fs.existsSync(path.join(root, relativePath)), `Missing AP 16.4d.3a file: ${relativePath}`));

const acceptedProductAppBaselines = [
  "ae449f0dc762604f2bf50bcbb10f54ef8ad06d2b70667ecce2b78a50f15bc0dd",
  "bbceecd4193bf49e1afe3678d657008bdb2abae73abb8e93daba8e7209e6c1ee",
  "4ea020bcb84f35079dd99b870e84185e6b68ba5450fa71f2cc748ba97e0a5a17",
  "981e25e5d7fffdf0c82b0703286c9080dba232977d36d21ee3d3cad5f0dd5cff",
  "0db57eddbef7e345b7e88df495711fe846e94babc0ff49dbd754dda70c5c4b53"
];
check(acceptedProductAppBaselines.includes(sha256("app.js")), "app.js differs from the accepted Calibration or authorized IR-01 product baseline");
check(sha256("js/slow-dead/slow-dead-condition-engine.js") === "7c7a4e3e51b39d89e12daf93dadb20908a87234061677a3fcf4aa8784469e03f", "Productive Slow / Dead Condition Engine differs from the accepted pre-migration baseline");
check(sha256("js/excess/excess-analysis-engine.js") === "c04bba4f9322b687337bceb293f2a7b7458a38b9d1393c12203650df89ffaa79", "Excess Analysis Engine changed");
check(sha256("js/excess/opportunity-score-engine.js") === "0f190a1e6f53a75b759ba577418f87552fb879be58dff6919c8b6702c9e3b77d", "Opportunity Score Engine changed");

const sandbox = loadRuntime();
const engine = sandbox.ObsoliQ.slowDead.conditionEngine;
const contract = sandbox.ObsoliQ.slowDead.calibrationContract;
const runner = sandbox.ObsoliQ.slowDead.calibrationRunner;
const fixtures = sandbox.ObsoliQSlowDeadCalibrationFixtures.fixtures;
const policy = engine.DEFAULT_SLOW_DEAD_CONDITION_POLICY;
const expectedPolicy = {
  modelVersion: "slow-dead-condition-v1",
  policyVersion: "slow-dead-condition-policy-v1",
  minimumHistoryCoverageMonths: 12,
  minimumHistoryCompleteness: 0.8,
  strongHistoryCompleteness: 0.9,
  slowMovingMonthsSinceLastConsumption: 6,
  slowMovingCoverageMonths: 12,
  minimumSlowEvidenceDimensions: 2,
  nonMovingMonthsSinceLastConsumption: 12,
  deadCandidateMonthsSinceLastConsumption: 18,
  minimumActiveMonthsForRecurringDemand: 2,
  intermittentDemandThreshold: 0.75,
  intermittentRecentConsumptionMonths: 6,
  requireIndependentDeadStockSignal: true
};

check(JSON.stringify(policy) === JSON.stringify(expectedPolicy), "Productive Policy thresholds differ from the captured Policy v1 contract");
check(contract.CALIBRATION_POLICY_REFERENCE === policy, "Calibration Policy is not the productive Policy object");
check(Object.isFrozen(contract.CALIBRATION_POLICY_REFERENCE), "Calibration Policy reference is not read-only");
check(contract.CALIBRATION_SCHEMA_VERSION === "slow-dead-calibration-case-v1", "Calibration schema version mismatch");
check(contract.CALIBRATION_NUMERIC_CONTRACT_VERSION === "slow-dead-calibration-numeric-boundary-v1", "Calibration Numeric Boundary version mismatch");
check(contract.CALIBRATION_RUNNER_VERSION === "slow-dead-calibration-runner-v2", "Calibration Runner version mismatch");
check(contract.CALIBRATION_REFERENCE_DATE === "2026-08-25", "Calibration reference date mismatch");
check(fixtures.length === 30, "Expected exactly 30 controlled fixtures");
check(new Set(fixtures.map(item => item.calibration_case_id)).size === fixtures.length, "Calibration Case IDs are not unique");
check(fixtures.every(item => item.source_type === "synthetic_acceptance_fixture"), "Non-synthetic fixture found in AP 16.4d.3a");
check(fixtures.every(item => item.label_provenance?.human_expert_validated === false), "Fixture incorrectly claims human expert validation");
check(fixtures.every(item => item.reference_date === "2026-08-25"), "Fixture reference date is not fixed");
check(fixtures.every(item => item.policy_version === "slow-dead-condition-policy-v1"), "Fixture Policy version mismatch");
check(contract.validateCalibrationCaseSet(fixtures).valid, "Calibration fixture set does not validate");

const canonical = ["insufficient_evidence", "intermittent_expected", "slow_moving_candidate", "non_moving_candidate", "dead_stock_candidate", "strategic_reserve"];
canonical.forEach(condition => check(fixtures.some(item => item.expected.condition === condition), `Canonical Condition missing: ${condition}`));
[6, 12, 18].forEach(threshold => {
  ["below", "at", "above"].forEach(position => {
    check(fixtures.some(item => item.boundary_context?.threshold_months === threshold && item.boundary_context?.position === position), `Boundary missing: ${threshold}/${position}`);
  });
});
contract.SAFETY_INVARIANTS.forEach(invariant => {
  check(fixtures.some(item => item.safety_invariant_ids.includes(invariant.id)), `Safety Invariant not covered: ${invariant.id}`);
});

const first = runner.runCalibrationFixtures(fixtures);
const second = runner.runCalibrationFixtures(fixtures);
check(first.fixture_count === 30, "Runner did not execute all fixtures");
check(first.status === "passed" && first.eligible_result_count === 30 && first.excluded_result_count === 0, "Runner coverage status is not complete");
check(first.agreement_count === 30, "Synthetic Contract Agreement is incomplete");
check(first.disagreement_count === 0, "Unexpected fixture disagreement exists");
check(first.critical_protection_violation_count === 0, "Critical protection violation exists");
check(first.synthetic_contract_agreement === true, "Synthetic Contract Agreement status is false");
check(JSON.stringify(first) === JSON.stringify(second), "Calibration Runner output is not byte-deterministic");

const prototype = read("prototype.html");
const template = read("tests/app-template.js");
const helpers = read("tests/test-helpers.js");
const testsHtml = read("tests/tests.html");
const analysisOnlyScripts = [
  "js/slow-dead/slow-dead-calibration-contract.js",
  "js/slow-dead/slow-dead-calibration-runner.js"
];
analysisOnlyScripts.forEach(script => {
  check(!prototype.includes(script), `Product bootstrap must not load analysis-only script: ${script}`);
  check(!template.includes(script), `Product-like test template must not load analysis-only script: ${script}`);
});
check(prototype.indexOf("js/slow-dead/slow-dead-condition-engine.js") < prototype.indexOf("js/slow-dead/slow-dead-page-model.js"), "Productive Condition Engine must load before Page Model");
check(template.indexOf("js/slow-dead/slow-dead-condition-engine.js") < template.indexOf("js/slow-dead/slow-dead-page-model.js"), "Test template Condition Engine order is invalid");
[
  "../js/slow-dead/slow-dead-calibration-contract.js",
  "../js/slow-dead/slow-dead-calibration-runner.js",
  "../js/slow-dead/slow-dead-calibration-metrics.js",
  "../js/slow-dead/slow-dead-threshold-sensitivity.js",
  "fixtures/slow-dead-calibration-fixtures.js"
].forEach((script, index, scripts) => {
  check(helpers.includes(script), `Analysis bootstrap dependency missing: ${script}`);
  if (index > 0) check(helpers.indexOf(scripts[index - 1]) < helpers.indexOf(script), `Analysis bootstrap order invalid around ${script}`);
});
[
  "slow-dead-calibration-contract.test.js",
  "slow-dead-calibration-fixtures.test.js",
  "slow-dead-calibration-baseline.test.js"
  ,"num-cal-mig-01.test.js"
].forEach(script => check(testsHtml.includes(script), `Calibration test script is not registered: ${script}`));

const activeDocs = [read("ARCHITECTURE.md"), read("DATA_CONTRACT.md"), read("PRODUCT_SPEC.md"), read("CHANGELOG.md")].join("\n");
check(activeDocs.includes("slow-dead-calibration-case-v1"), "Documentation does not state Calibration Case schema v1");
check(activeDocs.includes("Synthetic Contract Agreement"), "Documentation does not distinguish Synthetic Contract Agreement");
check(/not (?:Pilot Accuracy|pilot accuracy)|keine Pilotgenauigkeit/i.test(activeDocs), "Documentation does not disclaim Pilot Accuracy");
check(activeDocs.includes("AP 16.4d.3b") && activeDocs.includes("AP 16.4d.3c"), "Follow-up calibration blocks are not documented");

const report = {
  status: failures.length ? "failed" : "passed",
  checks,
  fixtureCount: fixtures.length,
  agreementCount: first.agreement_count,
  disagreementCount: first.disagreement_count,
  criticalProtectionViolationCount: first.critical_protection_violation_count,
  failures
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
