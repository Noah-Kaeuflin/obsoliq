const path = require("path");
const { chromium, productUrl, repositoryRoot } = require("./smoke-runtime.cjs");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || "" }));

  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.ObsoliQ?.slowDead?.conditionEngine), null, { timeout: 20000 });
  await page.waitForFunction(() => !/^0(?:\s|$)/.test((document.querySelector("#mInventory")?.textContent || "").trim()), null, { timeout: 20000 });
  const productCalibrationModulesAbsent = await page.evaluate(() => !(
    window.ObsoliQ?.slowDead?.calibrationContract
    || window.ObsoliQ?.slowDead?.calibrationRunner
    || window.ObsoliQ?.slowDead?.calibrationMetrics
    || window.ObsoliQ?.slowDead?.thresholdSensitivity
  ));
  for (const relativePath of [
    "js/slow-dead/slow-dead-calibration-contract.js",
    "js/slow-dead/slow-dead-calibration-runner.js",
    "js/slow-dead/slow-dead-calibration-metrics.js",
    "js/slow-dead/slow-dead-threshold-sensitivity.js",
    "tests/fixtures/slow-dead-calibration-fixtures.js"
  ]) {
    await page.addScriptTag({ path: path.join(repositoryRoot, relativePath) });
  }

  const result = await page.evaluate(productCalibrationModulesAbsent => {
    const engine = window.ObsoliQ.slowDead.conditionEngine;
    const contract = window.ObsoliQ.slowDead.calibrationContract;
    const runner = window.ObsoliQ.slowDead.calibrationRunner;
    const fixtures = window.ObsoliQSlowDeadCalibrationFixtures.fixtures;
    const bodyBefore = document.body.innerHTML;
    const fixturesBefore = runner.stableJson(fixtures);
    const policyBefore = runner.stableJson(engine.DEFAULT_SLOW_DEAD_CONDITION_POLICY);
    const excessReference = window.ObsoliQ.excess;
    const actionsReference = window.ObsoliQ.actions;
    const registryReference = window.ObsoliQ.data.packageRegistry;
    const first = runner.runCalibrationFixtures(fixtures);
    const second = runner.runCalibrationFixtures(fixtures);
    return {
      protocol: location.protocol,
      productCalibrationModulesAbsent,
      schemaVersion: contract.CALIBRATION_SCHEMA_VERSION,
      policyVersion: contract.CALIBRATION_POLICY_REFERENCE.policyVersion,
      policyReferenceExact: contract.CALIBRATION_POLICY_REFERENCE === engine.DEFAULT_SLOW_DEAD_CONDITION_POLICY,
      fixtureCount: first.fixture_count,
      agreementCount: first.agreement_count,
      disagreementCount: first.disagreement_count,
      criticalProtectionViolationCount: first.critical_protection_violation_count,
      deterministic: JSON.stringify(first) === JSON.stringify(second),
      fixturesUnchanged: fixturesBefore === runner.stableJson(fixtures),
      policyUnchanged: policyBefore === runner.stableJson(engine.DEFAULT_SLOW_DEAD_CONDITION_POLICY),
      bodyUnchanged: bodyBefore === document.body.innerHTML,
      excessReferenceUnchanged: excessReference === window.ObsoliQ.excess,
      actionsReferenceUnchanged: actionsReference === window.ObsoliQ.actions,
      registryReferenceUnchanged: registryReference === window.ObsoliQ.data.packageRegistry,
      sampleDataLoaded: !/^0(?:\s|$)/.test((document.querySelector("#mInventory")?.textContent || "").trim())
    };
  }, productCalibrationModulesAbsent);

  const failures = [];
  if (result.protocol !== "file:") failures.push("not-file-url");
  if (!result.productCalibrationModulesAbsent) failures.push("product-bootstrap-contains-calibration");
  if (result.schemaVersion !== "slow-dead-calibration-case-v1") failures.push("schema-version");
  if (result.policyVersion !== "slow-dead-condition-policy-v1" || !result.policyReferenceExact) failures.push("policy-reference");
  if (result.fixtureCount !== 30 || result.agreementCount !== 30 || result.disagreementCount !== 0) failures.push("synthetic-contract-agreement");
  if (result.criticalProtectionViolationCount !== 0) failures.push("critical-protection-violation");
  ["deterministic", "fixturesUnchanged", "policyUnchanged", "bodyUnchanged", "excessReferenceUnchanged", "actionsReferenceUnchanged", "registryReferenceUnchanged", "sampleDataLoaded"].forEach(key => {
    if (!result[key]) failures.push(key);
  });
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");
  if (failedRequests.length) failures.push("failed-requests");

  const report = {
    status: failures.length ? "failed" : "passed",
    url: page.url(),
    result,
    pageErrors,
    consoleErrors,
    failedRequests,
    failures
  };
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (failures.length) process.exit(1);
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
