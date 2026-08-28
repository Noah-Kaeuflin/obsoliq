const { chromium, testsUrl } = require("./smoke-runtime.cjs");

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(testsUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean(window.__OBSOLIQ_TEST_RESULTS__), null, { timeout: 360000 });
  const suite = await page.evaluate(() => window.__OBSOLIQ_TEST_RESULTS__);
  const expectedConsoleDiagnostics = consoleErrors.filter(message => message.includes("Forced Package import rollback render failure"));
  const unexpectedConsoleErrors = consoleErrors.filter(message => !expectedConsoleDiagnostics.includes(message));
  const report = {
    ...suite,
    url: page.url(),
    pageErrors,
    expectedConsoleDiagnostics,
    unexpectedConsoleErrors
  };
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  if (suite.status !== "PASS" || pageErrors.length || unexpectedConsoleErrors.length) process.exit(1);
}

main().catch(error => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
