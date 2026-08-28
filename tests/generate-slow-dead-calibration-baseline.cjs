const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const evidencePath = path.join(__dirname, "fixtures", "slow-dead-calibration-baseline-evidence.json");
const reportPath = path.join(root, "AP_16_4D_3A_FIXTURE_BASELINE.md");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function loadCalibrationRuntime() {
  const sandbox = { console };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  [
    "js/core/value-utils.js",
    "js/slow-dead/slow-dead-condition-engine.js",
    "js/slow-dead/slow-dead-calibration-contract.js",
    "js/slow-dead/slow-dead-calibration-runner.js",
    "tests/fixtures/slow-dead-calibration-fixtures.js"
  ].forEach(relativePath => vm.runInContext(read(relativePath), sandbox, { filename: relativePath }));
  return sandbox;
}

function markdownCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function renderPolicyTable(policy) {
  const rows = [
    ["Minimum History coverage", policy.minimumHistoryCoverageMonths, ">= 12 months"],
    ["Minimum History completeness", policy.minimumHistoryCompleteness, ">= 0.80"],
    ["Strong History completeness", policy.strongHistoryCompleteness, ">= 0.90"],
    ["Slow-Moving recency", policy.slowMovingMonthsSinceLastConsumption, ">= 6 months"],
    ["Slow-Moving coverage", policy.slowMovingCoverageMonths, ">= 12 months"],
    ["Minimum Slow evidence dimensions", policy.minimumSlowEvidenceDimensions, ">= 2"],
    ["Non-Moving recency", policy.nonMovingMonthsSinceLastConsumption, ">= 12 months"],
    ["Dead Candidate recency", policy.deadCandidateMonthsSinceLastConsumption, ">= 18 months"],
    ["Recurring demand active months", policy.minimumActiveMonthsForRecurringDemand, ">= 2"],
    ["Intermittency ratio", policy.intermittentDemandThreshold, ">= 0.75"],
    ["Recent intermittent consumption", policy.intermittentRecentConsumptionMonths, "<= 6 months"],
    ["Independent Dead signal", policy.requireIndependentDeadStockSignal, "required"]
  ];
  return [
    "| Policy field | Productive value | Boundary semantics |",
    "| --- | ---: | --- |",
    ...rows.map(row => `| ${row.map(markdownCell).join(" | ")} |`)
  ].join("\n");
}

function renderDistribution(distribution, canonicalConditions) {
  function count(condition) {
    return Object.prototype.hasOwnProperty.call(distribution, condition) ? distribution[condition] : 0;
  }
  return [
    "| Condition | Fixtures |",
    "| --- | ---: |",
    ...canonicalConditions.map(condition => `| \`${condition}\` | ${count(condition)} |`),
    `| \`no_case\` boundary control | ${count("no_case")} |`
  ].join("\n");
}

function renderAgreementRows(runtimeReport, fixturesById) {
  return [
    "| Case | Purpose | Expected | Actual | Agreement | Disagreement | Critical violation |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...runtimeReport.results.map(result => {
      const fixture = fixturesById.get(result.calibration_case_id);
      return `| ${result.calibration_case_id} | ${markdownCell(fixture?.title)} | \`${result.expected_condition}\` | \`${result.actual_condition}\` | ${result.agreement ? "PASS" : "FAIL"} | ${result.disagreement_code || "-"} | ${result.critical_protection_violation ? "YES" : "NO"} |`;
    })
  ].join("\n");
}

function renderValidation(evidence) {
  const validation = evidence.final_validation;
  const rows = [
    ["Pre-change structured baseline", evidence.pre_change_baseline.structured_suite.passed, evidence.pre_change_baseline.structured_suite.failed],
    ["Calibration static contract", validation.static_contract.passed, validation.static_contract.failed],
    ["Final structured browser suite", validation.structured_suite.passed, validation.structured_suite.failed],
    ["JavaScript/CommonJS syntax", validation.syntax.passed, validation.syntax.failed],
    ["Relevant Product Smokes", validation.product_smokes.passed, validation.product_smokes.failed],
    ["git diff --check", validation.diff_check.passed, validation.diff_check.failed]
  ];
  return [
    "| Validation | Passed | Failed |",
    "| --- | ---: | ---: |",
    ...rows.map(row => `| ${row.map(markdownCell).join(" | ")} |`)
  ].join("\n");
}

function renderBaselineReport(runtime, evidence) {
  const contract = runtime.ObsoliQ.slowDead.calibrationContract;
  const conditionEngine = runtime.ObsoliQ.slowDead.conditionEngine;
  const fixtures = runtime.ObsoliQSlowDeadCalibrationFixtures.fixtures;
  const runtimeReport = runtime.ObsoliQ.slowDead.calibrationRunner.runCalibrationFixtures(fixtures);
  const fixturesById = new Map(fixtures.map(item => [item.calibration_case_id, item]));
  const canonicalConditions = contract.EXPECTED_CONDITIONS.filter(condition => condition !== "no_case");
  const allValid = contract.validateCalibrationCaseSet(fixtures).valid;
  const evidencePass = evidence.final_validation.status === "PASS";
  const status = allValid && runtimeReport.synthetic_contract_agreement && evidencePass ? "PASS" : "BLOCKED";
  const contractGaps = evidence.contract_gaps.length ? evidence.contract_gaps.map(item => `- ${item}`).join("\n") : "- None.";
  const disagreements = runtimeReport.results.filter(result => !result.agreement);
  const disagreementText = disagreements.length
    ? disagreements.map(result => `- ${result.calibration_case_id}: ${result.disagreement_code}`).join("\n")
    : "- None. All controlled fixtures agree with the current productive Condition Engine.";
  const commands = evidence.exact_test_commands.map(command => `\`${command}\``).join("\n\n");
  const invariants = contract.SAFETY_INVARIANTS.map(item => `- **${item.id}:** ${item.description}`).join("\n");

  return `# AP 16.4d.3a Fixture Baseline\n\n## Final Status\n\n\`AP 16.4d.3a ${status}\`\n\nThis report records **Synthetic Contract Agreement** only. It is not Pilot Accuracy, Expert Agreement, Precision, Recall, F1 or a threshold recommendation. No fixture in this block claims human expert validation.\n\n## Git State\n\n- Branch: \`${evidence.git.branch}\`\n- HEAD: \`${evidence.git.head}\`\n- Evidence date: \`${evidence.evidence_date}\`\n- Working tree: ${evidence.git.working_tree}\n\n## Calibration Contract\n\n- Calibration schema: \`${contract.CALIBRATION_SCHEMA_VERSION}\`\n- Calibration runner: \`${contract.CALIBRATION_RUNNER_VERSION}\`\n- Productive Policy: \`${conditionEngine.DEFAULT_SLOW_DEAD_CONDITION_POLICY.policyVersion}\`\n- Fixed reference date: \`${contract.CALIBRATION_REFERENCE_DATE}\`\n- Fixture source: \`synthetic_acceptance_fixture\`\n- Human expert validated: \`false\` for all fixtures\n- Productive Policy changed: **No**\n\n## Productive Policy Thresholds\n\n${renderPolicyTable(conditionEngine.DEFAULT_SLOW_DEAD_CONDITION_POLICY)}\n\nThe comparisons are inclusive exactly where shown. These values are direct reads from the existing productive Policy object; the Calibration layer defines no duplicate thresholds and supplies no Policy override.\n\n## Fixture Portfolio\n\n- Fixtures: **${runtimeReport.fixture_count}**\n- Synthetic Contract Agreement: **${runtimeReport.agreement_count}/${runtimeReport.fixture_count}**\n- Disagreements: **${runtimeReport.disagreement_count}**\n- Critical protection violations: **${runtimeReport.critical_protection_violation_count}**\n\n${renderDistribution(runtimeReport.expected_condition_distribution, canonicalConditions)}\n\nBoundary coverage is present immediately below, exactly at and immediately above the productive 6-, 12- and 18-month thresholds.\n\n## Safety Invariants\n\n${invariants}\n\n## Fixture Agreement\n\n${renderAgreementRows(runtimeReport, fixturesById)}\n\n## Disagreements\n\n${disagreementText}\n\n## Contract Gaps\n\n${contractGaps}\n\nThe project/one-time-demand fixture exercises the existing independent-Dead-signal safety boundary. It does not claim a separate productive project-demand classifier, because AP 16.4d.3a does not add or change classification logic.\n\n## Validation Results\n\n${renderValidation(evidence)}\n\n- Final structured suite: ${evidence.final_validation.structured_suite.total} total, ${evidence.final_validation.structured_suite.passed} passed, ${evidence.final_validation.structured_suite.failed} failed, ${evidence.final_validation.structured_suite.skipped} skipped.\n- Page errors: ${evidence.final_validation.structured_suite.page_errors}.\n- Unexpected console errors: ${evidence.final_validation.structured_suite.unexpected_console_errors}.\n- Expected test-only diagnostics: ${evidence.final_validation.structured_suite.expected_console_diagnostics}.\n\n## Exact Test Commands\n\n${commands}\n\n## Scope Preservation\n\nThe productive Slow / Dead Condition Engine, Policy version and thresholds, \`app.js\`, visible UI, Excess Engine, Opportunity Score Engine, Actions, upload, parsing, Registry ownership and Package revisions were not changed by AP 16.4d.3a. Follow-up work remains explicitly separated:\n\n- \`AP 16.4d.3b\` - Calibration Metrics & Threshold Sensitivity\n- \`AP 16.4d.3c\` - Human Pilot Review & Acceptance Closure\n`;
}

function main() {
  if (!fs.existsSync(evidencePath)) throw new Error(`Missing closure evidence: ${evidencePath}`);
  const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  const runtime = loadCalibrationRuntime();
  const markdown = renderBaselineReport(runtime, evidence);
  if (process.argv.includes("--write")) {
    fs.writeFileSync(reportPath, markdown, "utf8");
    console.log(JSON.stringify({ status: "written", reportPath, bytes: Buffer.byteLength(markdown) }, null, 2));
    return;
  }
  if (process.argv.includes("--check")) {
    const current = fs.readFileSync(reportPath, "utf8");
    const matches = current === markdown;
    console.log(JSON.stringify({ status: matches ? "passed" : "failed", reportPath, byteIdentical: matches }, null, 2));
    if (!matches) process.exit(1);
    return;
  }
  process.stdout.write(markdown);
}

if (require.main === module) main();

module.exports = { loadCalibrationRuntime, renderBaselineReport };
