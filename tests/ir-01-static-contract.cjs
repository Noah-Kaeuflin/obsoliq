const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const failures = [];
let checks = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

const productionModules = [
  "js/inventory-risks/inventory-risk-case-contract.js",
  "js/inventory-risks/excess-risk-adapter.js",
  "js/inventory-risks/slow-dead-risk-adapter.js",
  "js/inventory-risks/blocked-quality-risk-adapter.js",
  "js/inventory-risks/inventory-risk-portfolio-service.js",
  "js/inventory-risks/inventory-risk-page-model.js",
  "js/inventory-risks/inventory-risk-export-builder.js",
  "js/application/inventory-risk-page-view.js",
  "js/application/inventory-risk-page-controller.js"
];
const domainModules = productionModules.filter(file => file.startsWith("js/inventory-risks/"));
const prototype = read("prototype.html");
const app = read("app.js");
const navTags = [...prototype.matchAll(/<button\b[^>]*data-process="([^"]+)"[^>]*>/g)].map(match => match[1]);

productionModules.forEach(file => check(fs.existsSync(path.join(root, file)), `Missing IR-01 production module: ${file}`));
check(navTags.filter(route => route === "inventory-risks").length === 1, "Prototype must contain exactly one visible inventory-risks navigation button");
check(!navTags.some(route => ["excess-stock", "slow-dead-stock", "blocked-quality"].includes(route)), "Prototype must not expose legacy risk routes as visible navigation buttons");
check(navTags.length === 8, `Expected eight visible navigation buttons, received ${navTags.length}`);
check(/data-process="inventory-risks"[^>]*data-i18n="navInventoryRisks"/.test(prototype), "Inventory Risks navigation must use the localized navInventoryRisks key");
check(/<section id="view-inventory-risks"/.test(prototype) && /id="inventoryRisksPage"/.test(prototype), "Prototype must own the unified Inventory Risks view root");
productionModules.forEach(file => check(prototype.includes(`<script src="${file}"></script>`), `${file} must load from prototype.html`));
domainModules.forEach(file => check(!/\bdocument\b|querySelector|getElementById/.test(read(file)), `${file} must remain DOM-independent`));
check(/"excess-stock": "excess_demand"/.test(app), "Excess route alias must remain registered");
check(/"slow-dead-stock": "slow_dead"/.test(app), "Slow / Dead route alias must remain registered");
check(/"blocked-quality": "blocked_quality"/.test(app), "Blocked / Quality route alias must remain registered");
check(/navInventoryRisks:\s*"Bestandsrisiken"/.test(app) && /navInventoryRisks:\s*"Inventory Risks"/.test(app), "German and English navigation labels must both exist");
check(["all", "excess_demand", "slow_dead", "blocked_quality", "prioritized"].every(segment => app.includes(`inventoryRiskSegment_${segment}`)), "All five localized segment keys must exist");
check(/inventoryRiskNoCombinedTotal/.test(app), "The explicit no-combined-total financial guard must exist");
check(!/tests\/|test-runner|__OBSOLIQ_TEST_RESULTS__/.test(prototype), "Production bootstrap must not load or execute tests");

const context = { window: {} };
vm.runInNewContext(read("tests/app-template.js"), context, { filename: "tests/app-template.js" });
check(context.window.__OBSOLIQ_APP_HTML === prototype, "Structured-test app template must exactly mirror prototype.html");
check(/ir-01-regression\.test\.js/.test(read("tests/tests.html")), "IR-01 structured regression suite must be registered");

const report = { status: failures.length ? "failed" : "passed", checks, visibleNavigation: navTags, productionModules, failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
