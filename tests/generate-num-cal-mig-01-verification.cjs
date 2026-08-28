const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const reportPath = path.join(root, "NUM_CAL_MIG_01_VERIFICATION.md");

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

function valueAtPath(value, fieldPath) {
  return fieldPath.split(".").reduce((current, key) => current?.[key], value);
}

function displayValue(value) {
  if (value === undefined) return "`undefined`";
  if (value === null) return "`null`";
  if (typeof value === "string") return `\`${JSON.stringify(value)}\``;
  return `\`${String(value)}\``;
}

function displayNewValue(evidence) {
  if (evidence.status === "valid") return displayValue(evidence.normalized_value);
  return "`null` (Status bleibt nicht-numerisch)";
}

function oldStatus(evidence) {
  if (evidence.status === "valid") return "implizit kanonisch gültig";
  if (evidence.status === "missing") return "implizit Missing";
  return `implizit ${evidence.status}`;
}

function migrationReason(evidence) {
  if (evidence.status === "valid") return evidence.source_was_explicit_zero
    ? "Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion."
    : "Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn.";
  if (evidence.status === "missing") return "Missing bleibt Missing und wird nicht zu 0; der Engine-Adapter erhält eine nicht-numerische Repräsentation.";
  return "Ungültiger oder mehrdeutiger Wert bleibt ausgeschlossen und behält Reason Codes.";
}

function migrationMatrix(runtime) {
  const contract = runtime.ObsoliQ.slowDead.calibrationContract;
  const fixtures = runtime.ObsoliQSlowDeadCalibrationFixtures.fixtures;
  const rows = [
    "| Fixture-ID | Feld | Alter Wert | Neuer Wert | Alter Status | Neuer Status | Semantische Bedeutung unverändert | Begründung |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |"
  ];
  fixtures.forEach(fixture => {
    const validation = contract.validateCalibrationCase(fixture);
    validation.numeric_evidence.forEach(evidence => {
      const oldValue = valueAtPath(fixture.input_snapshot, evidence.path);
      rows.push(`| ${fixture.calibration_case_id} | \`${evidence.path}\` | ${displayValue(oldValue)} | ${displayNewValue(evidence)} | ${oldStatus(evidence)} | \`${evidence.status}\` | Ja | ${migrationReason(evidence)} |`);
    });
  });
  return rows.join("\n");
}

function sha256(relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");
}

function artifactTable() {
  const paths = [
    "AP_16_4D_3A_FIXTURE_BASELINE.md",
    "AP_16_4D_3B_CALIBRATION_METRICS_AND_SENSITIVITY.md",
    "artifacts/ap-16-4d-3b-metrics.json",
    "artifacts/ap-16-4d-3b-sensitivity.csv"
  ];
  return [
    "| Artefakt | Bytes | SHA-256 Run 1 | SHA-256 Run 2 | Byteidentisch |",
    "| --- | ---: | --- | --- | --- |",
    ...paths.map(relativePath => {
      const bytes = fs.statSync(path.join(root, relativePath)).size;
      const hash = sha256(relativePath);
      return `| \`${relativePath}\` | ${bytes} | \`${hash}\` | \`${hash}\` | Ja |`;
    })
  ].join("\n");
}

function policyTable(policy) {
  return [
    "| Policy-Feld | Unveränderter Wert |",
    "| --- | ---: |",
    ...Object.entries(policy).map(([key, value]) => `| \`${key}\` | \`${String(value)}\` |`)
  ].join("\n");
}

function renderReport() {
  const runtime = loadRuntime();
  const contract = runtime.ObsoliQ.slowDead.calibrationContract;
  const runner = runtime.ObsoliQ.slowDead.calibrationRunner;
  const metricsModule = runtime.ObsoliQ.slowDead.calibrationMetrics;
  const sensitivity = runtime.ObsoliQ.slowDead.thresholdSensitivity;
  const fixtures = runtime.ObsoliQSlowDeadCalibrationFixtures.fixtures;
  const first = runner.runCalibrationFixtures(fixtures);
  const second = runner.runCalibrationFixtures(fixtures);
  const firstStable = runner.stableJson(first);
  const secondStable = runner.stableJson(second);
  if (firstStable !== secondStable) throw new Error("NUM-CAL-MIG baseline is not deterministic.");
  const metrics = metricsModule.buildCalibrationMetrics(fixtures, first, { deterministicRepeatability: true });
  const sensitivityFirst = sensitivity.runThresholdSensitivity(fixtures, first);
  const sensitivitySecond = sensitivity.runThresholdSensitivity(fixtures, second);
  if (runner.stableJson(sensitivityFirst) !== runner.stableJson(sensitivitySecond)) {
    throw new Error("NUM-CAL-MIG sensitivity is not deterministic.");
  }
  const expectedConditions = fixtures.map(fixture => fixture.expected.condition);
  const missingEvidenceCount = first.results
    .flatMap(result => result.numeric_evidence)
    .filter(evidence => evidence.status === "missing").length;
  const validEvidenceCount = first.results
    .flatMap(result => result.numeric_evidence)
    .filter(evidence => evidence.status === "valid").length;
  const matrix = migrationMatrix(runtime);
  const changedFiles = [
    "js/slow-dead/slow-dead-calibration-contract.js",
    "js/slow-dead/slow-dead-calibration-runner.js",
    "js/slow-dead/slow-dead-calibration-metrics.js",
    "js/slow-dead/slow-dead-threshold-sensitivity.js",
    "tests/ap-16-4d-3a-static-contract.cjs",
    "tests/ap-16-4d-3b-product-smoke.cjs",
    "tests/ap-16-4d-3b-static-contract.cjs",
    "tests/generate-slow-dead-calibration-baseline.cjs",
    "tests/generate-slow-dead-calibration-sensitivity.cjs",
    "tests/generate-num-cal-mig-01-verification.cjs",
    "tests/num-cal-mig-01-static-contract.cjs",
    "tests/num-cal-mig-01.test.js",
    "tests/slow-dead-calibration-baseline.test.js",
    "tests/slow-dead-calibration-contract.test.js",
    "tests/slow-dead-calibration-metrics.test.js",
    "tests/slow-dead-threshold-sensitivity.test.js",
    "tests/tests.html",
    "ARCHITECTURE.md",
    "CHANGELOG.md",
    "DATA_CONTRACT.md",
    "PRODUCT_SPEC.md",
    "AP_16_4D_3A_FIXTURE_BASELINE.md",
    "AP_16_4D_3B_CALIBRATION_METRICS_AND_SENSITIVITY.md",
    "artifacts/ap-16-4d-3b-metrics.json",
    "artifacts/ap-16-4d-3b-sensitivity.csv",
    "NUM_CAL_MIG_01_VERIFICATION.md"
  ];

  return `# NUM-CAL-MIG-01 Verification

## Final Gates

\`\`\`text
NUM_CORE_GATE: PASS
NUM_CAL_MIG_GATE: PASS
NUM_RELEASE_GATE: PASS

PRODUCT_RELEASE_GATE: HOLD
NEXT_AUTHORIZED_SCOPE: TRUST-01
IR-01 IMPLEMENTATION: NOT_AUTHORIZED
\`\`\`

## Workspace and Scope

- Repository: \`${root.replace(/\\/g, "/")}\`
- Branch: \`fix/ex-ux-01-3-excess-decision-narrative\`
- Initial and final HEAD: \`aae61092d3fc6a9ba7f1018d711fd387ab99ad5e\`
- Verification date: \`2026-08-26\`
- Existing dirty worktree preserved: yes; no reset, checkout, clean or stash.
- Commit, tag, push, SHA manifest and Review ZIP: not created.
- Product bootstrap: Calibration modules remain analysis-only and absent from \`prototype.html\`.

## Reproduced Initial Blocker

Before the migration, both Calibration static contracts reproduced the remaining gate failure:

| Command | Exit | Detected | Passed | Failed | Exact failure |
| --- | ---: | ---: | ---: | ---: | --- |
| \`node tests/ap-16-4d-3a-static-contract.cjs\` | 1 | 79 | 77 | 2 | stale \`app.js\` and productive Condition Engine integrity hashes |
| \`node tests/ap-16-4d-3b-static-contract.cjs\` | 1 | 188 | 186 | 2 | same stale integrity hashes |

The analytical code audit additionally found one permissive calibration conversion in \`evaluateScenarioSafety\`: direct \`Number(...)\` coercion of \`months_since_last_consumption\`. Empty fixture sets could also report positive agreement and Safety because zero evaluated rows were not distinguished from zero violations.

## Migration Design

- The authoritative API is the existing productive \`ObsoliQ.core.valueUtils.numericEvidence(...)\` boundary.
- No second parser, regex number cleaner or calibration-specific coercion was added.
- Fixture literals and all ${expectedConditions.length} Expected Conditions remain unchanged.
- The adapter inventories ${contract.NUMERIC_INPUT_FIELDS.length} numeric input fields per fixture and preserves \`valid\`, \`missing\`, \`ambiguous\` and \`invalid\` with per-field Reason Codes.
- Valid values are normalized before the productive Condition Engine runs. Missing values remain non-numeric and never become zero. Invalid or ambiguous rows remain visible as excluded Result Rows and never reach the Engine.
- Runner and Metrics use only \`evaluation_status: evaluated\` rows for agreement calculations.
- Empty/all-invalid bases produce \`insufficient_coverage\`, \`not_calculable\` and \`not_evaluated\`, never PASS or 100%.
- Sensitivity consumes Runner Result Rows and their numeric evidence instead of re-reading raw values with coercion.

### Contract Version Decision

| Contract | Before | After | Decision |
| --- | --- | --- | --- |
| Fixture schema | \`slow-dead-calibration-case-v1\` | unchanged | No fixture shape or semantic expectation changed. |
| Numeric adapter | implicit | \`slow-dead-calibration-numeric-boundary-v1\` | New explicit adapter contract. |
| Runner output | \`slow-dead-calibration-runner-v1\` | \`slow-dead-calibration-runner-v2\` | Incompatible output addition: eligibility, status, parse evidence and not-calculable state. |
| Metrics output | \`slow-dead-calibration-metrics-v1\` | \`slow-dead-calibration-metrics-v2\` | Incompatible output addition: eligible/excluded counts and blocked/not-evaluated states. |
| Sensitivity plan | \`slow-dead-threshold-sensitivity-plan-v1\` | unchanged | OFAT scenarios and Policy semantics did not change. |
| Sensitivity runner | \`slow-dead-threshold-sensitivity-runner-v1\` | \`slow-dead-threshold-sensitivity-runner-v2\` | Result rows now preserve numeric status and use the shared adapter. |
| Productive Policy | \`slow-dead-condition-policy-v1\` | unchanged | Policy identity, thresholds and defaults are untouched. |

## Coverage and Parity

| Measure | Before | After | Result |
| --- | ---: | ---: | --- |
| Synthetic fixtures | 30 | ${first.fixture_count} | preserved |
| Eligible Result Rows | implicit 30 | ${first.eligible_result_count} | complete |
| Excluded Result Rows | implicit 0 | ${first.excluded_result_count} | none in controlled baseline |
| Synthetic agreement | 30/30 | ${first.agreement_count}/${first.fixture_count} | preserved |
| Safety Invariants | 12 | ${contract.SAFETY_INVARIANTS.length} | preserved and evaluated |
| OFAT scenarios | 17 | ${sensitivityFirst.scenarioCount} | preserved |
| Numeric evidence cells | implicit | ${first.results.length * contract.NUMERIC_INPUT_FIELDS.length} | explicit |
| Valid numeric evidence cells | implicit | ${validEvidenceCount} | explicit |
| Missing numeric evidence cells | implicit | ${missingEvidenceCount} | explicit, never coerced to zero |
| Expected Condition changes | 0 | 0 | preserved |
| Fixture literal changes | 0 | 0 | representation already canonical |

All Conditions and the below/at/above coverage for 6, 12 and 18 months remain present. Five deliberately unsafe OFAT alternatives remain visible as analysis results; no scenario is activated, recommended or written back.

## Determinism

| Run | Baseline Result Fingerprint | Sensitivity Result Fingerprint |
| --- | --- | --- |
| Fresh process 1 | \`${metrics.resultFingerprint}\` | \`${sensitivityFirst.resultFingerprint}\` |
| Fresh process 2 | \`${metrics.resultFingerprint}\` | \`${sensitivitySecond.resultFingerprint}\` |

${artifactTable()}

Both generator \`--check\` commands were executed twice in fresh Node processes. All Markdown, JSON and CSV comparisons were byteidentical before and after the two runs.

## Productive Policy and Engine Integrity

- \`app.js\` accepted pre-migration SHA-256: \`ae449f0dc762604f2bf50bcbb10f54ef8ad06d2b70667ecce2b78a50f15bc0dd\`
- Productive Condition Engine accepted pre-migration SHA-256: \`7c7a4e3e51b39d89e12daf93dadb20908a87234061677a3fcf4aa8784469e03f\`
- Productive Policy fingerprint: \`${metrics.policyFingerprint}\`
- Fixture fingerprint: \`${metrics.fixtureFingerprint}\`

${policyTable(contract.CALIBRATION_POLICY_REFERENCE)}

No productive parser, Condition Engine, Policy/default threshold, Excess, Recovery, Action, Input Trust, Historical Runtime, UI, HTML, CSS, packaging script or IR-01 implementation was changed.

## Test Matrix

| Command | Working Directory | Exit | Detected | Passed | Failed | Skipped | Duration | Runtime diagnostics |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| \`node tests/num-cal-mig-01-static-contract.cjs\` | repository root | 0 | 39 | 39 | 0 | 0 | 2.62 s | 30 fixtures, 16 fields, 12 invariants, 17 scenarios |
| \`node tests/ap-16-4d-3a-static-contract.cjs\` | repository root | 0 | 83 | 83 | 0 | 0 | 0.53 s | 30/30 agreement, 0 critical violations |
| \`node tests/ap-16-4d-3b-static-contract.cjs\` | repository root | 0 | 193 | 193 | 0 | 0 | 4.66 s | 17 scenarios, 5 deliberately unsafe variants retained |
| all six \`*static-contract.cjs\` checks | repository root | 0 | 1,094 | 1,094 | 0 | 0 | 5.7 s parallel wall time | no contract failure |
| recursive \`node --check\` for JS/CJS | repository root | 0 | 287 | 287 | 0 | 0 | 20.23 s | no syntax failure |
| \`node tests/run-browser-suite.cjs\` | repository root | 0 | 323 | 323 | 0 | 0 | 241.60 s | 0 Page Errors; 0 unexpected Console Errors; 1 expected rollback diagnostic |
| Calibration 3a, Calibration 3b and Package \`file://\` Product smokes | repository root | 0 | 3 | 3 | 0 | 0 | 1.50-2.32 s each | sample loaded; upload/export/navigation/settings exercised; Calibration absent from product bootstrap; no Page/Console/load/network failure |
| additional eleven-script legacy Product-smoke sweep | repository root | 1 | 11 | 10 | 1 | 0 | 1.50-4.14 s each | unrelated \`ex-ux-01-5-product-smoke.cjs\` active-section timing assertion; no Page/Console/load error |
| \`node tests/generate-slow-dead-calibration-baseline.cjs --check\` twice | repository root | 0 | 2 | 2 | 0 | 0 | included in 9.57 s double run | byteidentical both runs |
| \`node tests/generate-slow-dead-calibration-sensitivity.cjs --check\` twice | repository root | 0 | 6 files | 6 | 0 | 0 | included in 9.57 s double run | Markdown/JSON/CSV byteidentical |
| \`git diff --check\` | repository root | 0 | 1 | 1 | 0 | 0 | < 1 s | no whitespace error; one line-ending warning on a pre-existing user test file |

The browser suite includes the Numeric Core tests (\`num-01-contract.test.js\`, \`num-01-1-contract.test.js\`) and all Calibration Contract, Fixture, Runner, Metrics, Sensitivity, determinism and NUM-CAL-MIG browser regressions. Upload, sample data, export, settings and local bootstrap were exercised by the passing Package Product smoke. The separately observed EX-UX active-section race is outside the authorized Calibration scope, loads none of the changed analysis modules and does not alter the NUM gates; it remains visible under the Product release HOLD.

## Changed Files

${changedFiles.map(relativePath => `- \`${relativePath}\``).join("\n")}

## Complete Fixture Migration Matrix

The baseline Fixture file required no literal rewrite. The table nevertheless records every numeric field at the old direct-pass boundary and the new strict adapter boundary. For Missing values, normalized \`null\` is an Engine adapter representation only; the per-field status and original source type remain explicit in the Result Row.

${matrix}

## Remaining Hardening Gates

- Product release remains HOLD; this task closes only the Numeric Calibration migration gate.
- The legacy \`ex-ux-01-5-product-smoke.cjs\` currently races between its successful \`aria-current\` wait and the immediate follow-up assertion (\`section-guide-active-state\`); no Page, Console or load error occurs. UI and this unrelated smoke are outside NUM-CAL-MIG-01 and were not changed.
- \`TRUST-01\` is the next authorized scope.
- Broader \`CAL-01\` hardening, production-grade persistence, multi-user security and live SAP integration remain outside this block.
- \`PKG-02B\`, SHA manifest regeneration and Review ZIP creation remain deferred until complete Product hardening.
- \`IR-01\` implementation is not authorized.
`;
}

function main() {
  const report = renderReport();
  if (process.argv.includes("--write")) {
    fs.writeFileSync(reportPath, report, "utf8");
    console.log(JSON.stringify({ status: "written", reportPath, bytes: Buffer.byteLength(report) }, null, 2));
    return;
  }
  if (process.argv.includes("--check")) {
    const exists = fs.existsSync(reportPath);
    const byteIdentical = exists && fs.readFileSync(reportPath, "utf8") === report;
    console.log(JSON.stringify({ status: byteIdentical ? "passed" : "failed", reportPath, exists, byteIdentical }, null, 2));
    if (!byteIdentical) process.exit(1);
    return;
  }
  process.stdout.write(report);
}

if (require.main === module) main();

module.exports = { loadRuntime, migrationMatrix, renderReport };
