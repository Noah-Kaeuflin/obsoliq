"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const helperPath = path.join(__dirname, "inventory-risk-smoke-navigation.cjs");
const smokeFiles = [
  "ch-ex-01a-product-smoke.cjs",
  "ex-ux-01-2-product-smoke.cjs",
  "ex-ux-01-3-product-smoke.cjs",
  "ex-ux-01-3-1-product-smoke.cjs",
  "ex-ux-01-4-product-smoke.cjs",
  "ex-ux-01-5-product-smoke.cjs",
  "ex-ux-01-6-product-smoke.cjs"
];

function check(condition, message, failures) {
  if (!condition) failures.push(message);
}

const failures = [];
const helperSource = fs.readFileSync(helperPath, "utf8");
check(helperSource.includes('[data-process="inventory-risks"]'), "navigation helper must open Inventory Risks", failures);
check(helperSource.includes('[data-inventory-risk-segment="excess_demand"]'), "navigation helper must select the real Excess segment", failures);
check(helperSource.includes('[data-process="excess-stock"]'), "navigation helper must assert that the visible legacy route is absent", failures);

for (const smokeFile of smokeFiles) {
  const source = fs.readFileSync(path.join(__dirname, smokeFile), "utf8");
  check(source.includes('require("./inventory-risk-smoke-navigation.cjs")'), `${smokeFile} must use the shared Unified navigation contract`, failures);
  check(source.includes("openUnifiedExcessSegment(page)"), `${smokeFile} must open the current Excess segment`, failures);
  check(source.includes("assertUnifiedExcessRoute(routeState,"), `${smokeFile} must assert the resulting route state`, failures);
  check(!source.includes('locator(\'[data-process="excess-stock"]\')'), `${smokeFile} must not click the removed navigation route`, failures);
}

const report = {
  status: failures.length ? "failed" : "passed",
  repository: root,
  smokeCount: smokeFiles.length,
  assertions: 3 + smokeFiles.length * 4,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
