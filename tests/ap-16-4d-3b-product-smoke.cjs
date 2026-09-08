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
  await page.locator("#sampleButton").click();
  await page.waitForFunction(() => document.querySelector("#actionFeedback .action-feedback-text")?.textContent.trim() === "Daten geladen", null, { timeout: 30000 });
  await page.waitForFunction(() => Boolean(window.ObsoliQ?.slowDead?.conditionEngine), null, { timeout: 20000 });
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
    const runner = window.ObsoliQ.slowDead.calibrationRunner;
    const metricsModule = window.ObsoliQ.slowDead.calibrationMetrics;
    const sensitivity = window.ObsoliQ.slowDead.thresholdSensitivity;
    const fixtures = window.ObsoliQSlowDeadCalibrationFixtures.fixtures;
    const bodyBefore = document.body.innerHTML;
    const fixturesBefore = runner.stableJson(fixtures);
    const policyBefore = runner.stableJson(engine.DEFAULT_SLOW_DEAD_CONDITION_POLICY);
    const excessReference = window.ObsoliQ.excess;
    const actionsReference = window.ObsoliQ.actions;
    const registryReference = window.ObsoliQ.data.packageRegistry;
    const baselineFirst = runner.runCalibrationFixtures(fixtures);
    const baselineSecond = runner.runCalibrationFixtures(fixtures);
    const metrics = metricsModule.buildCalibrationMetrics(fixtures, baselineFirst, { deterministicRepeatability: true });
    const first = sensitivity.runThresholdSensitivity(fixtures, baselineFirst);
    const second = sensitivity.runThresholdSensitivity(fixtures, baselineSecond);
    return {
      protocol: location.protocol,
      productCalibrationModulesAbsent,
      metricsVersion: metrics.metricsVersion,
      sensitivityPlanVersion: first.sensitivityPlanVersion,
      fixtureCount: metrics.fixtureCount,
      scenarioCount: first.scenarioCount,
      baselineChangedCaseCount: first.scenarios[0].changedCaseCount,
      baselineCriticalCount: first.scenarios[0].criticalSafetyViolationCount,
      unsafeScenarioCount: first.unsafeScenarioCount,
      deterministic: runner.stableJson(first) === runner.stableJson(second),
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
  if (result.metricsVersion !== "slow-dead-calibration-metrics-v2") failures.push("metrics-version");
  if (result.sensitivityPlanVersion !== "slow-dead-threshold-sensitivity-plan-v1") failures.push("sensitivity-version");
  if (result.fixtureCount !== 30 || result.scenarioCount !== 17) failures.push("analysis-counts");
  if (result.baselineChangedCaseCount !== 0 || result.baselineCriticalCount !== 0) failures.push("baseline-integrity");
  if (result.unsafeScenarioCount < 1) failures.push("unsafe-variant-detection");
  ["deterministic", "fixturesUnchanged", "policyUnchanged", "bodyUnchanged", "excessReferenceUnchanged", "actionsReferenceUnchanged", "registryReferenceUnchanged", "sampleDataLoaded"].forEach(key => {
    if (!result[key]) failures.push(key);
  });
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");
  if (failedRequests.length) failures.push("failed-requests");

  console.log(JSON.stringify({
    status: failures.length ? "failed" : "passed",
    url: page.url(),
    result,
    pageErrors,
    consoleErrors,
    failedRequests,
    failures
  }, null, 2));
  await browser.close();
  if (failures.length) process.exit(1);
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
