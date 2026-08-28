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

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  }
  return value;
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

const runtime = loadRuntime();
const engine = runtime.ObsoliQ.slowDead.conditionEngine;
const contract = runtime.ObsoliQ.slowDead.calibrationContract;
const runner = runtime.ObsoliQ.slowDead.calibrationRunner;
const metricsModule = runtime.ObsoliQ.slowDead.calibrationMetrics;
const sensitivity = runtime.ObsoliQ.slowDead.thresholdSensitivity;
const fixtures = runtime.ObsoliQSlowDeadCalibrationFixtures.fixtures;
const fixturesBefore = runner.stableJson(fixtures);
const policyBefore = runner.stableJson(engine.DEFAULT_SLOW_DEAD_CONDITION_POLICY);

check(contract.CALIBRATION_SCHEMA_VERSION === "slow-dead-calibration-case-v1", "Fixture schema changed unexpectedly");
check(contract.CALIBRATION_NUMERIC_CONTRACT_VERSION === "slow-dead-calibration-numeric-boundary-v1", "Numeric Boundary version mismatch");
check(contract.CALIBRATION_RUNNER_VERSION === "slow-dead-calibration-runner-v2", "Runner version mismatch");
check(metricsModule.CALIBRATION_METRICS_VERSION === "slow-dead-calibration-metrics-v2", "Metrics version mismatch");
check(sensitivity.THRESHOLD_SENSITIVITY_RUNNER_VERSION === "slow-dead-threshold-sensitivity-runner-v2", "Sensitivity Runner version mismatch");
check(contract.CALIBRATION_POLICY_REFERENCE === engine.DEFAULT_SLOW_DEAD_CONDITION_POLICY, "Calibration does not reference the productive Policy object");
check(contract.NUMERIC_INPUT_FIELDS.length === 16, "Numeric field inventory is incomplete");

const strictSources = [
  "js/slow-dead/slow-dead-calibration-contract.js",
  "js/slow-dead/slow-dead-calibration-runner.js",
  "js/slow-dead/slow-dead-calibration-metrics.js",
  "js/slow-dead/slow-dead-threshold-sensitivity.js",
  "tests/generate-slow-dead-calibration-baseline.cjs",
  "tests/generate-slow-dead-calibration-sensitivity.cjs"
].map(read).join("\n");
[
  /\bNumber\s*\(/,
  /\bparseFloat\s*\(/,
  /\bparseInt\s*\(/,
  /\|\|\s*0/,
  /\?\?\s*0/,
  /stripNumericNoise/
].forEach(pattern => check(!pattern.test(strictSources), `Permissive numeric fallback remains: ${pattern}`));

const baselineFirst = runner.runCalibrationFixtures(fixtures);
const baselineSecond = runner.runCalibrationFixtures(fixtures);
const metrics = metricsModule.buildCalibrationMetrics(fixtures, baselineFirst, {
  deterministicRepeatability: runner.stableJson(baselineFirst) === runner.stableJson(baselineSecond)
});
const sensitivityFirst = sensitivity.runThresholdSensitivity(fixtures, baselineFirst);
const sensitivitySecond = sensitivity.runThresholdSensitivity(fixtures, baselineSecond);

check(baselineFirst.status === "passed", "Baseline Runner did not pass");
check(baselineFirst.fixture_count === 30, "Baseline fixture count changed");
check(baselineFirst.eligible_result_count === 30 && baselineFirst.excluded_result_count === 0, "Baseline eligibility changed");
check(baselineFirst.agreement_count === 30 && baselineFirst.disagreement_count === 0, "Baseline agreement changed");
check(baselineFirst.critical_protection_violation_count === 0, "Baseline critical protection changed");
check(metrics.status === "passed" && metrics.syntheticContractAgreement === 1, "Baseline Metrics did not pass");
check(metrics.safetyInvariantResults.length === 12 && metrics.safetyInvariantResults.every(item => item.passed), "Safety Invariant coverage changed");
check(sensitivityFirst.status === "passed" && sensitivityFirst.scenarioCount === 17, "OFAT scenario coverage changed");
check(sensitivityFirst.scenarios.every(scenario => scenario.caseResults.length === 30), "OFAT fixture coverage changed");
check(runner.stableJson(baselineFirst) === runner.stableJson(baselineSecond), "Baseline output is not deterministic");
check(runner.stableJson(sensitivityFirst) === runner.stableJson(sensitivitySecond), "Sensitivity output is not deterministic");

const missingResult = baselineFirst.results.find(item => item.calibration_case_id === "SD-CAL-SYN-0025");
const zeroResult = baselineFirst.results.find(item => item.calibration_case_id === "SD-CAL-SYN-0026");
const fieldPath = "historicalEvidence.net_consumption_quantity_12m";
const missingEvidence = missingResult.numeric_evidence.find(item => item.path === fieldPath);
const zeroEvidence = zeroResult.numeric_evidence.find(item => item.path === fieldPath);
check(missingEvidence.status === "missing" && missingEvidence.normalized_value === null, "Missing value did not remain Missing");
check(zeroEvidence.status === "valid" && zeroEvidence.normalized_value === 0, "Explicit zero did not remain valid zero");

const emptyRunner = runner.runCalibrationFixtures([]);
const emptyMetrics = metricsModule.buildCalibrationMetrics([], emptyRunner, { deterministicRepeatability: true });
const emptySensitivity = sensitivity.runThresholdSensitivity([], emptyRunner);
check(emptyRunner.status === "insufficient_coverage" && emptyRunner.synthetic_contract_agreement === null, "Empty Runner produced a calculable result");
check(emptyMetrics.status === "insufficient_coverage" && emptyMetrics.syntheticContractAgreement === null, "Empty Metrics produced a calculable result");
check(emptyMetrics.safetyStatus === "not_evaluated", "Empty Safety status is not explicit");
check(emptySensitivity.status === "insufficient_coverage" && emptySensitivity.scenarioCount === 0, "Empty Sensitivity produced scenarios");

const tokens = ["abc123xyz", "foo1e3bar", "1-2", "--12", NaN, Infinity];
const invalidFixtures = tokens.map((token, index) => {
  const fixture = clone(fixtures[4]);
  fixture.calibration_case_id = `SD-CAL-SYN-${String(9300 + index).padStart(4, "0")}`;
  fixture.input_snapshot.inventoryEvidence.stock_value = token;
  return fixture;
});
const invalidRunner = runner.runCalibrationFixtures(invalidFixtures);
const invalidMetrics = metricsModule.buildCalibrationMetrics(invalidFixtures, invalidRunner, { deterministicRepeatability: true });
const invalidSensitivity = sensitivity.runThresholdSensitivity(invalidFixtures, invalidRunner);
check(invalidRunner.status === "insufficient_coverage", "All-invalid Runner did not block");
check(invalidRunner.eligible_result_count === 0 && invalidRunner.excluded_result_count === tokens.length, "All-invalid row accounting is wrong");
check(invalidRunner.results.every(item => item.numeric_status === "invalid" && item.numeric_reason_codes.length > 0), "Invalid status or reason code was lost");
check(invalidMetrics.status === "insufficient_coverage" && invalidMetrics.syntheticContractAgreement === null, "All-invalid Metrics did not block");
check(invalidSensitivity.status === "blocked" && invalidSensitivity.scenarioCount === 0, "All-invalid Sensitivity did not block");
check(!JSON.stringify({ invalidRunner, invalidMetrics, invalidSensitivity }).includes("NaN"), "NaN leaked into Calibration output");
check(!JSON.stringify({ invalidRunner, invalidMetrics, invalidSensitivity }).includes("Infinity"), "Infinity leaked into Calibration output");

check(runner.stableJson(fixtures) === fixturesBefore, "Fixtures were mutated");
check(runner.stableJson(engine.DEFAULT_SLOW_DEAD_CONDITION_POLICY) === policyBefore, "Productive Policy was mutated");

const report = {
  status: failures.length ? "failed" : "passed",
  checks,
  fixtureCount: fixtures.length,
  numericFieldCount: contract.NUMERIC_INPUT_FIELDS.length,
  safetyInvariantCount: contract.SAFETY_INVARIANTS.length,
  scenarioCount: sensitivityFirst.scenarioCount,
  baselineResultFingerprint: metrics.resultFingerprint,
  sensitivityResultFingerprint: sensitivityFirst.resultFingerprint,
  failures
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
