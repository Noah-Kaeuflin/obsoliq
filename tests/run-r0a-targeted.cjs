"use strict";

const path = require("path");
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
  const targetUrl = pathToFileURL(path.join(__dirname, "r0a-targeted.html")).href;
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__OBSOLIQ_TEST_RESULTS__), null, { timeout: 120000 });
  const suite = await page.evaluate(() => window.__OBSOLIQ_TEST_RESULTS__);
  const report = { ...suite, pageErrors, unexpectedConsoleErrors: consoleErrors };
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (suite.status !== "PASS" || pageErrors.length || consoleErrors.length) process.exit(1);
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
