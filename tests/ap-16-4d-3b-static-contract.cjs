const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const { buildOutputs } = require("./generate-slow-dead-calibration-sensitivity.cjs");

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
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  [
    "js/core/value-utils.js",
    "js/slow-dead/slow-dead-condition-engine.js",
    "js/slow-dead/slow-dead-calibration-contract.js",
    "js/slow-dead/slow-dead-calibration-runner.js",
    "js/slow-dead/slow-dead-calibration-metrics.js",
    "js/slow-dead/slow-dead-threshold-sensitivity.js",
    "tests/fixtures/slow-dead-calibration-fixtures.js"
  ].forEach(relativePath => vm.runInContext(read(relativePath), sandbox, { filename: relativePath }));
  return sandbox;
}

const requiredFiles = [
  "js/slow-dead/slow-dead-calibration-metrics.js",
  "js/slow-dead/slow-dead-threshold-sensitivity.js",
  "tests/slow-dead-calibration-metrics.test.js",
  "tests/slow-dead-threshold-sensitivity.test.js",
  "tests/slow-dead-calibration-determinism.test.js",
  "tests/generate-slow-dead-calibration-sensitivity.cjs",
  "tests/fixtures/slow-dead-calibration-sensitivity-evidence.json",
  "AP_16_4D_3B_CALIBRATION_METRICS_AND_SENSITIVITY.md",
  "artifacts/ap-16-4d-3b-metrics.json",
  "artifacts/ap-16-4d-3b-sensitivity.csv"
];
requiredFiles.forEach(relativePath => check(fs.existsSync(path.join(root, relativePath)), `Missing AP 16.4d.3b file: ${relativePath}`));

const acceptedProductAppBaselines = [
  "ae449f0dc762604f2bf50bcbb10f54ef8ad06d2b70667ecce2b78a50f15bc0dd",
  "bbceecd4193bf49e1afe3678d657008bdb2abae73abb8e93daba8e7209e6c1ee",
  "4ea020bcb84f35079dd99b870e84185e6b68ba5450fa71f2cc748ba97e0a5a17"
];
check(acceptedProductAppBaselines.includes(sha256("app.js")), "app.js differs from the accepted Calibration or authorized IR-01 product baseline");
check(sha256("js/slow-dead/slow-dead-condition-engine.js") === "7c7a4e3e51b39d89e12daf93dadb20908a87234061677a3fcf4aa8784469e03f", "Productive Slow / Dead Condition Engine differs from the accepted pre-migration baseline");
check(sha256("js/excess/excess-analysis-engine.js") === "c04bba4f9322b687337bceb293f2a7b7458a38b9d1393c12203650df89ffaa79", "Excess Analysis Engine changed");
check(sha256("js/excess/opportunity-score-engine.js") === "0f190a1e6f53a75b759ba577418f87552fb879be58dff6919c8b6702c9e3b77d", "Opportunity Score Engine changed");

const analysisSources = [
  read("js/slow-dead/slow-dead-calibration-metrics.js"),
  read("js/slow-dead/slow-dead-threshold-sensitivity.js")
].join("\n");
["document.", "querySelector", "localStorage", "sessionStorage", "indexedDB", "packageRegistry", "setItem("].forEach(token => {
  check(!analysisSources.includes(token), `Analysis source must not access ${token}`);
});

const runtime = loadRuntime();
const engine = runtime.ObsoliQ.slowDead.conditionEngine;
const contract = runtime.ObsoliQ.slowDead.calibrationContract;
const runner = runtime.ObsoliQ.slowDead.calibrationRunner;
const metricsModule = runtime.ObsoliQ.slowDead.calibrationMetrics;
const sensitivity = runtime.ObsoliQ.slowDead.thresholdSensitivity;
const fixtures = runtime.ObsoliQSlowDeadCalibrationFixtures.fixtures;
const fixturesBefore = runner.stableJson(fixtures);
const policyBefore = runner.stableJson(engine.DEFAULT_SLOW_DEAD_CONDITION_POLICY);
const baselineFirst = runner.runCalibrationFixtures(fixtures);
const baselineSecond = runner.runCalibrationFixtures(fixtures);
const metrics = metricsModule.buildCalibrationMetrics(fixtures, baselineFirst, { deterministicRepeatability: true });
const first = sensitivity.runThresholdSensitivity(fixtures, baselineFirst);
const second = sensitivity.runThresholdSensitivity(fixtures, baselineSecond);

check(contract.CALIBRATION_SCHEMA_VERSION === "slow-dead-calibration-case-v1", "Calibration Contract version mismatch");
check(contract.CALIBRATION_NUMERIC_CONTRACT_VERSION === "slow-dead-calibration-numeric-boundary-v1", "Calibration Numeric Boundary version mismatch");
check(contract.CALIBRATION_RUNNER_VERSION === "slow-dead-calibration-runner-v2", "Calibration Runner version mismatch");
check(contract.CALIBRATION_REFERENCE_DATE === "2026-08-25", "Calibration reference date mismatch");
check(engine.DEFAULT_SLOW_DEAD_CONDITION_POLICY.policyVersion === "slow-dead-condition-policy-v1", "Productive Policy version mismatch");
check(sensitivity.validateProductiveBaseline().valid, "Productive threshold baseline does not validate");
check(fixtures.length === 30, "Expected 30 synthetic fixtures");
check(new Set(fixtures.map(fixture => fixture.calibration_case_id)).size === 30, "Fixture IDs are not unique");
check(fixtures.every(fixture => fixture.source_type === "synthetic_acceptance_fixture"), "Non-synthetic fixture found");
check(fixtures.every(fixture => fixture.label_provenance?.human_expert_validated === false), "Fixture claims human expert validation");
check(contract.SAFETY_INVARIANTS.length === 12, "Expected twelve 3a Safety Invariants");
check(baselineFirst.agreement_count === 30 && baselineFirst.disagreement_count === 0, "3a baseline is not reproduced");
check(baselineFirst.critical_protection_violation_count === 0, "3a baseline has a critical violation");
check(runner.stableJson(baselineFirst) === runner.stableJson(baselineSecond), "3a baseline is not deterministic");

check(metrics.metricsVersion === "slow-dead-calibration-metrics-v2", "Metrics version mismatch");
check(metrics.status === "passed" && metrics.eligibleResultCount === 30 && metrics.excludedResultCount === 0, "Metrics coverage status is not complete");
check(metrics.fixtureCount === 30 && metrics.validFixtureCount === 30 && metrics.invalidFixtureCount === 0, "Metrics fixture counts are invalid");
check(metrics.syntheticContractAgreement === 1, "Synthetic Contract Agreement is not one");
check(metrics.criticalSafetyViolationCount === 0, "Baseline Metrics contain critical violations");
check(metrics.deterministicRepeatability === true, "Metrics do not report deterministic repeatability");
check(metrics.safetyInvariantResults.length === 12, "Metrics do not report all 3a invariants");
[
  "insufficient_evidence",
  "intermittent_expected",
  "slow_moving_candidate",
  "non_moving_candidate",
  "dead_stock_candidate",
  "strategic_reserve"
].forEach(condition => check(metrics.actualCountByCondition[condition] > 0, `Metrics missing condition: ${condition}`));

check(sensitivity.THRESHOLD_SENSITIVITY_PLAN_VERSION === "slow-dead-threshold-sensitivity-plan-v1", "Sensitivity Plan version mismatch");
check(sensitivity.THRESHOLD_SENSITIVITY_RUNNER_VERSION === "slow-dead-threshold-sensitivity-runner-v2", "Sensitivity Runner version mismatch");
check(sensitivity.validateSensitivityPlan().valid, "Sensitivity Plan does not validate");
check(sensitivity.THRESHOLD_SENSITIVITY_PLAN.scenarios.length === 17, "Sensitivity Plan must contain 17 scenarios");
check(first.scenarioCount === 17, "Sensitivity Runner must execute 17 scenarios");
check(first.scenarios[0].scenarioId === "SD-SENS-BASELINE", "Baseline scenario must be first");
check(first.scenarios[0].changedCaseCount === 0, "Baseline scenario has migrations");
check(first.scenarios[0].criticalSafetyViolationCount === 0, "Baseline scenario has critical violations");
check(runner.stableJson(first) === runner.stableJson(second), "Sensitivity analysis is not deterministic");
check(first.scenarios.every(scenario => scenario.analysisOnly && !scenario.productionEligible && !scenario.activated && !scenario.recommended), "Scenario activation contract is broken");
check(first.scenarios.every(scenario => scenario.safetyGuardResults.length === 10), "Not all ten Safety Guards were checked per scenario");
first.scenarios.forEach(scenario => {
  const ids = scenario.migrations.flatMap(migration => migration.changedCaseIds);
  check(new Set(ids).size === ids.length, `${scenario.scenarioId} duplicates changed Case IDs`);
  check(ids.length === scenario.changedCaseCount, `${scenario.scenarioId} changed count differs from IDs`);
  check(scenario.changedCaseCount + scenario.unchangedCaseCount === 30, `${scenario.scenarioId} does not account for 30 fixtures`);
  scenario.migrations.forEach(migration => check(migration.count === migration.changedCaseIds.length, `${scenario.scenarioId} migration count differs from IDs`));
});
[
  "strategic_reserve_protection_broken",
  "intermittent_demand_protection_broken",
  "dead_signal_requirement_broken",
  "insufficient_history_protection_broken",
  "low_completeness_protection_broken",
  "ambiguous_relationship_protection_broken",
  "unit_conflict_protection_broken",
  "project_demand_protection_broken",
  "unexpected_escalation_to_dead"
].forEach(code => check(sensitivity.CRITICAL_SAFETY_VIOLATION_CODES.includes(code), `Critical code is not registered: ${code}`));

check(runner.stableJson(fixtures) === fixturesBefore, "Analysis mutated fixtures or inputs");
check(runner.stableJson(engine.DEFAULT_SLOW_DEAD_CONDITION_POLICY) === policyBefore, "Analysis mutated productive Policy");

const serializedAnalysis = JSON.stringify({ metrics, first });
["Pilot Accuracy", "Customer Accuracy", "Expert Agreement", "Precision", "Recall", "F1", "bestPolicy", "best_policy", "qualityRanking", "quality_ranking", "packageRevision"].forEach(term => {
  check(!serializedAnalysis.includes(term), `Analysis contains forbidden claim or field: ${term}`);
});

const prototype = read("prototype.html");
const template = read("tests/app-template.js");
const helpers = read("tests/test-helpers.js");
const testsHtml = read("tests/tests.html");
const analysisOnlyScripts = [
  "js/slow-dead/slow-dead-calibration-contract.js",
  "js/slow-dead/slow-dead-calibration-runner.js",
  "js/slow-dead/slow-dead-calibration-metrics.js",
  "js/slow-dead/slow-dead-threshold-sensitivity.js"
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
  "slow-dead-calibration-metrics.test.js",
  "slow-dead-threshold-sensitivity.test.js",
  "slow-dead-calibration-determinism.test.js"
  ,"num-cal-mig-01.test.js"
].forEach(script => check(testsHtml.includes(script), `3b test is not registered: ${script}`));

const outputs = buildOutputs();
check(read("AP_16_4D_3B_CALIBRATION_METRICS_AND_SENSITIVITY.md") === outputs.report, "Markdown artifact is not byte-reproducible");
check(read("artifacts/ap-16-4d-3b-metrics.json") === outputs.metricsJson, "JSON artifact is not byte-reproducible");
check(read("artifacts/ap-16-4d-3b-sensitivity.csv") === outputs.sensitivityCsv, "CSV artifact is not byte-reproducible");
const jsonArtifact = JSON.parse(read("artifacts/ap-16-4d-3b-metrics.json"));
check(jsonArtifact.syntheticDataOnly === true && jsonArtifact.humanExpertValidated === false, "JSON artifact provenance is invalid");
check(jsonArtifact.automaticPolicyRecommendation === false && jsonArtifact.productivePolicyChanged === false, "JSON artifact implies Policy activation");
const csvHeaders = read("artifacts/ap-16-4d-3b-sensitivity.csv").split(/\r?\n/, 1)[0].split(",");
[
  "scenario_id", "varied_parameter", "baseline_value", "candidate_value", "from_condition", "to_condition",
  "migration_count", "changed_case_ids", "critical_violation", "critical_violation_codes", "policy_fingerprint", "result_fingerprint"
].forEach(header => check(csvHeaders.includes(header), `CSV header missing: ${header}`));

const docs = [read("ARCHITECTURE.md"), read("DATA_CONTRACT.md"), read("PRODUCT_SPEC.md"), read("CHANGELOG.md")].join("\n");
check(docs.includes("slow-dead-calibration-metrics-v1"), "Historical Metrics Contract v1 is not documented");
check(docs.includes("slow-dead-threshold-sensitivity-plan-v1"), "Sensitivity Plan v1 is not documented");
check(/OFAT|one.factor.at.a.time/i.test(docs), "OFAT principle is not documented");
check(/no Policy recommendation|keine Policy-Empfehlung/i.test(docs), "No-Policy-recommendation boundary is not documented");

const report = {
  status: failures.length ? "failed" : "passed",
  checks,
  fixtureCount: fixtures.length,
  scenarioCount: first.scenarioCount,
  unsafeScenarioCount: first.unsafeScenarioCount,
  failures
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
