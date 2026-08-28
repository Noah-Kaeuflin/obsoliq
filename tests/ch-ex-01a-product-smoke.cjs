const fs = require("fs");
const path = require("path");
const { chromium, productUrl } = require("./smoke-runtime.cjs");
const { assertUnifiedExcessRoute, openUnifiedExcessSegment } = require("./inventory-risk-smoke-navigation.cjs");
const screenshotDir = path.join(__dirname, "screenshots", "ch-ex-01a");

async function main() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const pageErrors = [];
  const consoleErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto(productUrl, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => !/^0(\s|$)/.test((document.querySelector("#mInventory")?.textContent || "").trim()), null, { timeout: 20000 });
  const routeState = await openUnifiedExcessSegment(page);
  await page.waitForSelector("#view-inventory-risks.active .excess-decision-core [data-header-value-basis-valid]", { timeout: 10000 });

  const result = await page.evaluate(() => {
    const core = document.querySelector(".excess-decision-core");
    const valueBasis = core?.querySelector("[data-header-value-basis-valid]");
    const score = core?.querySelector("[data-header-opportunity-score-available]");
    const detailScroll = document.querySelector(".excess-detail-scroll");
    const valueNarrative = document.querySelector("[data-value-bridge]");
    const valueStrong = valueBasis?.querySelector(":scope > strong");
    const scoreStrong = score?.querySelector(":scope > strong");
    return {
      url: location.href,
      language: document.documentElement.lang,
      contracts: {
        workspaceProjection: window.ObsoliQ?.excess?.decisionWorkspaceModel?.version || "",
        decisionReadiness: window.ObsoliQ?.excess?.decisionWorkspaceModel?.READINESS_MODEL_VERSION || "",
        grossNetReconciliation: window.ObsoliQ?.excess?.decisionWorkspaceModel?.GROSS_NET_RECONCILIATION_VERSION || ""
      },
      modules: {
        opportunityScoreEngine: Boolean(window.ObsoliQ?.excess?.opportunityScoreEngine),
        excessAnalysisService: Boolean(window.ObsoliQ?.application?.excessAnalysisService),
        decisionWorkspaceModel: Boolean(window.ObsoliQ?.excess?.decisionWorkspaceModel)
      },
      valueBasisValid: valueBasis?.dataset.headerValueBasisValid || "",
      valueBasisReason: valueBasis?.dataset.headerValueBasisReason || "",
      scoreAvailable: score?.dataset.headerOpportunityScoreAvailable || "",
      netText: valueStrong?.textContent.trim() || "",
      scoreText: scoreStrong?.textContent.trim() || "",
      grossOverlapText: [...(valueBasis?.querySelectorAll("small") || [])].map(node => node.textContent.trim()).join(" | "),
      canonicalNarrativeValid: valueNarrative?.dataset.valueBasisValid || "",
      fixedHeaderOutsideScroll: Boolean(core && detailScroll && core.parentElement === detailScroll.parentElement && !core.closest(".excess-detail-scroll")),
      horizontalOverflow: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - innerWidth,
      headerVisible: Boolean(core && core.getBoundingClientRect().top >= 0 && core.getBoundingClientRect().bottom <= innerHeight),
      netNotClipped: Boolean(valueStrong && valueStrong.scrollWidth <= valueStrong.clientWidth + 1)
    };
  });

  const screenshot = path.join(screenshotDir, "excess-case-header-1440x900.png");
  await page.screenshot({ path: screenshot });
  const failures = [];
  assertUnifiedExcessRoute(routeState, failures);
  if (!result.url.startsWith("file:///")) failures.push("not-file-url");
  if (JSON.stringify(result.contracts) !== JSON.stringify({
    workspaceProjection: "3",
    decisionReadiness: "excess-decision-readiness-v2",
    grossNetReconciliation: "gross-net-reconciliation-v1"
  })) failures.push("contract-version-mismatch");
  if (Object.values(result.modules).some(value => value !== true)) failures.push("domain-module-missing");
  if (result.valueBasisValid !== "true" || result.canonicalNarrativeValid !== "true") failures.push("canonical-value-basis-not-valid");
  if (result.scoreAvailable !== "true") failures.push("score-not-available");
  if (!result.netText || /n\.\s*v\.|n\/a/i.test(result.netText)) failures.push("net-value-unavailable");
  if (!/Brutto/.test(result.grossOverlapText) || !/Abzüge/.test(result.grossOverlapText)) failures.push("gross-overlap-context-missing");
  if (!/\/100$/.test(result.scoreText)) failures.push("score-format");
  if (!result.fixedHeaderOutsideScroll || !result.headerVisible || !result.netNotClipped) failures.push("fixed-header-layout");
  if (result.horizontalOverflow > 2) failures.push("horizontal-overflow");
  if (pageErrors.length) failures.push("page-errors");
  if (consoleErrors.length) failures.push("console-errors");

  const report = {
    status: failures.length ? "failed" : "passed",
    viewport: "1440x900",
    result,
    routeState,
    pageErrors,
    consoleErrors,
    screenshot,
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
