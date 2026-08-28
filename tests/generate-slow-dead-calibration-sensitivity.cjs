const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const evidencePath = path.join(__dirname, "fixtures", "slow-dead-calibration-sensitivity-evidence.json");
const reportPath = path.join(root, "AP_16_4D_3B_CALIBRATION_METRICS_AND_SENSITIVITY.md");
const metricsPath = path.join(root, "artifacts", "ap-16-4d-3b-metrics.json");
const sensitivityCsvPath = path.join(root, "artifacts", "ap-16-4d-3b-sensitivity.csv");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
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

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function scenarioCsv(analysis) {
  const headers = [
    "scenario_id",
    "varied_parameter",
    "baseline_value",
    "candidate_value",
    "from_condition",
    "to_condition",
    "migration_count",
    "changed_case_ids",
    "critical_violation",
    "critical_violation_codes",
    "policy_fingerprint",
    "result_fingerprint"
  ];
  const rows = [headers];
  analysis.scenarios.forEach(scenario => {
    const migrations = scenario.migrations.length ? scenario.migrations : [{
      fromCondition: "",
      toCondition: "",
      count: 0,
      changedCaseIds: [],
      criticalSafetyViolation: scenario.criticalSafetyViolationCount > 0,
      violationCodes: scenario.criticalSafetyViolationCodes
    }];
    migrations.forEach(migration => rows.push([
      scenario.scenarioId,
      scenario.variedParameter || "baseline",
      scenario.baselineValue ?? "",
      scenario.candidateValue ?? "",
      migration.fromCondition,
      migration.toCondition,
      migration.count,
      migration.changedCaseIds.join("|"),
      migration.criticalSafetyViolation ? "true" : "false",
      (migration.violationCodes || scenario.criticalSafetyViolationCodes).join("|"),
      scenario.policyFingerprint,
      scenario.resultFingerprint
    ]));
  });
  return `${rows.map(row => row.map(csvCell).join(",")).join("\n")}\n`;
}

function policyTable(policy) {
  const rows = [
    ["minimumHistoryCoverageMonths", policy.minimumHistoryCoverageMonths, ">= 12 months"],
    ["minimumHistoryCompleteness", policy.minimumHistoryCompleteness, ">= 0.80"],
    ["strongHistoryCompleteness", policy.strongHistoryCompleteness, ">= 0.90"],
    ["slowMovingMonthsSinceLastConsumption", policy.slowMovingMonthsSinceLastConsumption, ">= 6 months"],
    ["nonMovingMonthsSinceLastConsumption", policy.nonMovingMonthsSinceLastConsumption, ">= 12 months"],
    ["deadCandidateMonthsSinceLastConsumption", policy.deadCandidateMonthsSinceLastConsumption, ">= 18 months"],
    ["minimumActiveMonthsForRecurringDemand", policy.minimumActiveMonthsForRecurringDemand, ">= 2 months"],
    ["intermittentDemandThreshold", policy.intermittentDemandThreshold, ">= 0.75"]
  ];
  return [
    "| Productive Policy field | Value | Boundary semantics |",
    "| --- | ---: | --- |",
    ...rows.map(row => `| ${row.map(markdownCell).join(" | ")} |`)
  ].join("\n");
}

function distributionTable(metrics) {
  return [
    "| Synthetic Condition | Expected | Actual | Agreement | Disagreement |",
    "| --- | ---: | ---: | ---: | ---: |",
    ...Object.keys(metrics.expectedCountByCondition).map(condition => `| \`${condition}\` | ${metrics.expectedCountByCondition[condition]} | ${metrics.actualCountByCondition[condition]} | ${metrics.agreementCountByCondition[condition]} | ${metrics.disagreementCountByCondition[condition]} |`)
  ].join("\n");
}

function boundaryTable(metrics) {
  const rows = [];
  Object.entries(metrics.boundaryResults).forEach(([threshold, positions]) => {
    Object.entries(positions).forEach(([position, result]) => rows.push([
      `${threshold} months`,
      position,
      result.fixtureCount,
      result.agreementCount,
      result.disagreementCount,
      result.caseIds.join(", ")
    ]));
  });
  return [
    "| Boundary | Position | Fixtures | Agreement | Disagreement | Case IDs |",
    "| --- | --- | ---: | ---: | ---: | --- |",
    ...rows.map(row => `| ${row.map(markdownCell).join(" | ")} |`)
  ].join("\n");
}

function scenarioTable(analysis) {
  return [
    "| Scenario | Parameter | Baseline | Candidate | Changed | Unchanged | Critical violations | Analysis state |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |",
    ...analysis.scenarios.map(scenario => `| \`${scenario.scenarioId}\` | \`${scenario.variedParameter || "baseline"}\` | ${scenario.baselineValue ?? "-"} | ${scenario.candidateValue ?? "-"} | ${scenario.changedCaseCount} | ${scenario.unchangedCaseCount} | ${scenario.criticalSafetyViolationCount} | ${scenario.analyticallyUnsafe ? "analytically unsafe" : "no critical guard violation"} |`)
  ].join("\n");
}

function migrationTable(analysis) {
  const rows = [];
  analysis.scenarios.forEach(scenario => {
    if (!scenario.migrations.length) rows.push([scenario.scenarioId, "-", "-", 0, "-"]);
    scenario.migrations.forEach(migration => rows.push([
      scenario.scenarioId,
      migration.fromCondition,
      migration.toCondition,
      migration.count,
      migration.changedCaseIds.join(", ")
    ]));
  });
  return [
    "| Scenario | From | To | Count | Changed Case IDs |",
    "| --- | --- | --- | ---: | --- |",
    ...rows.map(row => `| ${row.map(markdownCell).join(" | ")} |`)
  ].join("\n");
}

function changedCases(analysis) {
  return analysis.scenarios
    .map(scenario => `- \`${scenario.scenarioId}\`: ${scenario.changedCaseIds.length ? scenario.changedCaseIds.map(id => `\`${id}\``).join(", ") : "None"}.`)
    .join("\n");
}

function safetyTable(analysis) {
  return [
    "| Scenario | Critical count | Codes | Case IDs |",
    "| --- | ---: | --- | --- |",
    ...analysis.scenarios.map(scenario => `| \`${scenario.scenarioId}\` | ${scenario.criticalSafetyViolationCount} | ${scenario.criticalSafetyViolationCodes.length ? scenario.criticalSafetyViolationCodes.map(code => `\`${code}\``).join(", ") : "-"} | ${scenario.criticalViolations.length ? [...new Set(scenario.criticalViolations.map(item => item.calibrationCaseId))].join(", ") : "-"} |`)
  ].join("\n");
}

function validationTable(evidence) {
  const validation = evidence.final_validation;
  const rows = [
    ["3a static preflight", evidence.preflight.static_contract.passed, evidence.preflight.static_contract.failed],
    ["Preflight structured suite", evidence.preflight.structured_suite.passed, evidence.preflight.structured_suite.failed],
    ["Final structured suite", validation.structured_suite.passed, validation.structured_suite.failed],
    ["3b static contract", validation.static_contract.passed, validation.static_contract.failed],
    ["JavaScript/CommonJS syntax", validation.syntax.passed, validation.syntax.failed],
    ["Product and file:// smokes", validation.product_smokes.passed, validation.product_smokes.failed],
    ["Artifact byte reproduction", validation.artifact_reproduction.passed, validation.artifact_reproduction.failed],
    ["git diff --check", validation.diff_check.passed, validation.diff_check.failed]
  ];
  return [
    "| Validation | Passed | Failed |",
    "| --- | ---: | ---: |",
    ...rows.map(row => `| ${row.map(markdownCell).join(" | ")} |`)
  ].join("\n");
}

function renderReport(runtime, evidence, metrics, analysis) {
  const contract = runtime.ObsoliQ.slowDead.calibrationContract;
  const policy = runtime.ObsoliQ.slowDead.conditionEngine.DEFAULT_SLOW_DEAD_CONDITION_POLICY;
  const status = evidence.final_validation.status === "PASS"
    && metrics.syntheticContractAgreement === 1
    && metrics.criticalSafetyViolationCount === 0
    && analysis.scenarioCount === 17
    ? "PASS"
    : "PENDING";
  const commands = evidence.exact_test_commands.map(command => `\`${command}\``).join("\n\n");
  return `# AP 16.4d.3b Calibration Metrics and OFAT Threshold Sensitivity\n\n## Final Status\n\n\`AP 16.4d.3b ${status}\`\n\nThis analysis measures **Synthetic Contract Agreement**, **Synthetic Condition Agreement**, **Fixture Coverage**, **Boundary Stability**, **Condition Migration**, **Critical Safety Guard Violation** and **Deterministic Repeatability** only. It contains synthetic contractual fixtures, no customer or Pilot data and no human expert labels.\n\n## 1. Git State\n\n- Branch: \`${evidence.git.branch}\`\n- Initial HEAD: \`${evidence.git.initial_head}\`\n- Final HEAD: \`${evidence.git.final_head}\`\n- Working tree: ${evidence.git.working_tree}\n\n## 2. Policy and Contract Versions\n\n- Productive Condition Policy: \`${policy.policyVersion}\`\n- Calibration Contract: \`${contract.CALIBRATION_SCHEMA_VERSION}\`\n- Calibration Runner: \`${contract.CALIBRATION_RUNNER_VERSION}\`\n- Metrics Contract: \`${metrics.metricsVersion}\`\n- Sensitivity Plan: \`${analysis.sensitivityPlanVersion}\`\n- Sensitivity Runner: \`${analysis.sensitivityRunnerVersion}\`\n- Reference date: \`${contract.CALIBRATION_REFERENCE_DATE}\`\n- Scenarios: **${analysis.scenarioCount}** (one Baseline and sixteen OFAT alternatives)\n\n${policyTable(policy)}\n\nAll listed boundaries are inclusive. The productive Policy object is frozen and remains unchanged. Each alternative changes exactly one listed parameter.\n\n## 3. Fingerprints\n\n- Policy fingerprint: \`${metrics.policyFingerprint}\`\n- Fixture fingerprint: \`${metrics.fixtureFingerprint}\`\n- Baseline result fingerprint: \`${metrics.resultFingerprint}\`\n- Sensitivity result fingerprint: \`${analysis.resultFingerprint}\`\n- Fingerprint scheme: \`${runtime.ObsoliQ.slowDead.calibrationMetrics.FINGERPRINT_VERSION}\` (deterministic content identity, not a security signature)\n\n## 4. Fixture Distribution\n\n- Fixtures: **${metrics.fixtureCount}**\n- Valid: **${metrics.validFixtureCount}**\n- Invalid: **${metrics.invalidFixtureCount}**\n- Source: \`synthetic_acceptance_fixture\`\n- Human expert validated: **false**\n\n${distributionTable(metrics)}\n\n## 5. Baseline Synthetic Contract Agreement\n\n- Synthetic Contract Agreement: **${(metrics.syntheticContractAgreement * 100).toFixed(0)}%**\n- Agreement: **${Object.values(metrics.agreementCountByCondition).reduce((sum, value) => sum + value, 0)}/${metrics.fixtureCount}**\n- Baseline critical Safety violations: **${metrics.criticalSafetyViolationCount}**\n- Deterministic Repeatability: **${metrics.deterministicRepeatability ? "PASS" : "FAIL"}**\n\n## 6. Agreement by Synthetic Condition\n\n${distributionTable(metrics)}\n\n## 7. Boundary Stability\n\n${boundaryTable(metrics)}\n\nThe productive 6-, 12- and 18-month boundaries are stable below, exactly at and above their inclusive thresholds. Alternative boundary changes are migrations, not automatically errors.\n\n## 8. All 17 Scenarios\n\n${scenarioTable(analysis)}\n\nEvery scenario is \`analysisOnly: true\`, \`productionEligible: false\`, \`activated: false\` and \`recommended: false\`.\n\n## 9. Migration Matrix\n\n${migrationTable(analysis)}\n\nMigration counts are generated from the same unique Case-ID lists shown in this table. Each alternative is compared only with the productive Baseline.\n\n## 10. Changed Case IDs by Scenario\n\n${changedCases(analysis)}\n\n## 11. Critical Guard Violations\n\n${safetyTable(analysis)}\n\nAll ten immutable analysis Safety Guards are evaluated in every scenario. Unsafe alternatives remain measurable but cannot be activated, recommended or persisted as productive Policy.\n\n## 12. Interpretation and Limits\n\n- This is a deterministic OFAT contract analysis, not a search for an optimal Policy.\n- A Condition migration is not automatically a defect. Only an explicit immutable Safety-Guard violation is critical.\n- Counts are unweighted; no Inventory exposure or monetary weighting is applied.\n- The fixture portfolio is deliberately compact and synthetic. It does not establish Pilot Accuracy, Customer Accuracy, Expert Agreement, Precision, Recall, F1, False Positive Rate or False Negative Rate.\n- No Multi-Parameter scenarios, grid search, random search, auto-tuning or Policy ranking are present.\n\n## 13. Synthetic Data Notice\n\nAll 30 records are synthetic acceptance fixtures from \`AP 16.4d.3a\`. The artifacts contain no customer, Pilot, personal or reviewer data and make no human-validation claim.\n\n## 14. No Automatic Policy Recommendation\n\nNo scenario is labelled best, optimal, recommended or production-ready. This block does not create Policy v2, a Package revision, a Registry mutation or any automatic threshold adoption.\n\n## 15. Handover to AP 16.4d.3c\n\nHuman Pilot Review must use separately governed, provenance-complete expert labels. It must not reinterpret these synthetic results as Pilot quality. AP 16.4d.3c should review rationale, disagreement and Safety evidence without changing the immutable 3b artifacts.\n\n## Validation Evidence\n\n${validationTable(evidence)}\n\n- Final structured suite: ${evidence.final_validation.structured_suite.total} total, ${evidence.final_validation.structured_suite.passed} passed, ${evidence.final_validation.structured_suite.failed} failed, ${evidence.final_validation.structured_suite.skipped} skipped.\n- Page errors: ${evidence.final_validation.structured_suite.page_errors}.\n- Unexpected console errors: ${evidence.final_validation.structured_suite.unexpected_console_errors}.\n- Expected test-only diagnostics: ${evidence.final_validation.structured_suite.expected_console_diagnostics}.\n\n## Exact Test Commands\n\n${commands}\n`;
}

function buildOutputs() {
  if (!fs.existsSync(evidencePath)) throw new Error(`Missing validation evidence: ${evidencePath}`);
  const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  const runtime = loadRuntime();
  const fixtures = runtime.ObsoliQSlowDeadCalibrationFixtures.fixtures;
  const runner = runtime.ObsoliQ.slowDead.calibrationRunner;
  const baselineFirst = runner.runCalibrationFixtures(fixtures);
  const baselineSecond = runner.runCalibrationFixtures(fixtures);
  const metrics = runtime.ObsoliQ.slowDead.calibrationMetrics.buildCalibrationMetrics(fixtures, baselineFirst, {
    deterministicRepeatability: runner.stableJson(baselineFirst) === runner.stableJson(baselineSecond)
  });
  const sensitivityFirst = runtime.ObsoliQ.slowDead.thresholdSensitivity.runThresholdSensitivity(fixtures, baselineFirst);
  const sensitivitySecond = runtime.ObsoliQ.slowDead.thresholdSensitivity.runThresholdSensitivity(fixtures, baselineSecond);
  if (runner.stableJson(sensitivityFirst) !== runner.stableJson(sensitivitySecond)) {
    throw new Error("Threshold Sensitivity output is not deterministic.");
  }
  const jsonArtifact = {
    artifactSchemaVersion: "ap-16-4d-3b-calibration-analysis-v1",
    analysisOnly: true,
    productionEligible: false,
    syntheticDataOnly: true,
    humanExpertValidated: false,
    automaticPolicyRecommendation: false,
    productivePolicyChanged: false,
    baselineMetrics: metrics,
    sensitivityAnalysis: sensitivityFirst,
    limitations: [
      "Synthetic contractual fixtures only.",
      "No Pilot, customer, personal or human expert label data.",
      "OFAT migrations are not accuracy or quality rankings.",
      "No threshold variant is activated, recommended or persisted."
    ],
    handover: "AP 16.4d.3c requires separately governed human Pilot Review evidence."
  };
  return {
    report: renderReport(runtime, evidence, metrics, sensitivityFirst),
    metricsJson: `${JSON.stringify(jsonArtifact, null, 2)}\n`,
    sensitivityCsv: scenarioCsv(sensitivityFirst),
    summary: {
      fixtureCount: metrics.fixtureCount,
      scenarioCount: sensitivityFirst.scenarioCount,
      unsafeScenarioCount: sensitivityFirst.unsafeScenarioCount,
      policyFingerprint: metrics.policyFingerprint,
      fixtureFingerprint: metrics.fixtureFingerprint,
      baselineResultFingerprint: metrics.resultFingerprint,
      sensitivityResultFingerprint: sensitivityFirst.resultFingerprint
    }
  };
}

function main() {
  const outputs = buildOutputs();
  const files = [
    [reportPath, outputs.report],
    [metricsPath, outputs.metricsJson],
    [sensitivityCsvPath, outputs.sensitivityCsv]
  ];
  if (process.argv.includes("--write")) {
    fs.mkdirSync(path.dirname(metricsPath), { recursive: true });
    files.forEach(([filePath, content]) => fs.writeFileSync(filePath, content, "utf8"));
    console.log(JSON.stringify({ status: "written", files: files.map(([filePath, content]) => ({ filePath, bytes: Buffer.byteLength(content) })), ...outputs.summary }, null, 2));
    return;
  }
  if (process.argv.includes("--check")) {
    const results = files.map(([filePath, content]) => ({
      filePath,
      exists: fs.existsSync(filePath),
      byteIdentical: fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === content
    }));
    const passed = results.every(result => result.exists && result.byteIdentical);
    console.log(JSON.stringify({ status: passed ? "passed" : "failed", results, ...outputs.summary }, null, 2));
    if (!passed) process.exit(1);
    return;
  }
  process.stdout.write(outputs.report);
}

if (require.main === module) main();

module.exports = { buildOutputs, loadRuntime, renderReport, scenarioCsv };
