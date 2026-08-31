"use strict";

const path = require("path");
const crypto = require("crypto");
const { pathToFileURL } = require("url");
const { chromium } = require("./smoke-runtime.cjs");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  const targetUrl = pathToFileURL(path.join(__dirname, "trust-01-targeted.html")).href;
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__OBSOLIQ_TEST_RESULTS__), null, { timeout: 120000 });
  const suite = await page.evaluate(() => window.__OBSOLIQ_TEST_RESULTS__);
  const rollbackEvidence = await page.evaluate(() => window.__TRUST_01_ROLLBACK_EVIDENCE__ || []);
  const deterministicResults = (suite.results || []).map(result => ({
    name: result.name,
    status: result.status,
    assertions: result.assertions
  }));
  const failureDetails = (suite.results || [])
    .filter(result => String(result.status).toLowerCase() !== "pass")
    .map(result => ({ name: result.name, assertions: result.assertions, error: result.error || "" }));
  const report = {
    status: suite.status,
    passed: suite.passed,
    failed: suite.failed,
    skipped: suite.skipped,
    total: suite.total,
    assertions: deterministicResults.reduce((sum, result) => sum + Number(result.assertions || 0), 0),
    deterministicSignature: crypto.createHash("sha256").update(JSON.stringify(deterministicResults)).digest("hex"),
    rollbackEvidence,
    failures: failureDetails,
    pageErrors,
    unexpectedConsoleErrors: consoleErrors
  };
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (suite.status !== "PASS" || pageErrors.length || consoleErrors.length) process.exit(1);
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
