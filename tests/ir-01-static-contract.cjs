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
const view = read("js/application/inventory-risk-page-view.js");
const styles = read("styles.css");
const structuredTests = read("tests/tests.html");
const navTags = [...prototype.matchAll(/<button\b[^>]*data-process="([^"]+)"[^>]*>/g)].map(match => match[1]);
const inventoryRisksNavigation = prototype.match(/<button\b[^>]*data-process="inventory-risks"[^>]*>[\s\S]*?<\/button>/)?.[0] || "";

productionModules.forEach(file => check(fs.existsSync(path.join(root, file)), `Missing IR-01 production module: ${file}`));
check(navTags.filter(route => route === "inventory-risks").length === 1, "Prototype must contain exactly one visible inventory-risks navigation button");
check(!navTags.some(route => ["excess-stock", "slow-dead-stock", "blocked-quality"].includes(route)), "Prototype must not expose legacy risk routes as visible navigation buttons");
check(navTags.length === 8, `Expected eight visible navigation buttons, received ${navTags.length}`);
check(/<span\b[^>]*data-i18n="navInventoryRisks"[^>]*>/.test(inventoryRisksNavigation), "Inventory Risks navigation must expose a localized navInventoryRisks label inside the button");
check(/<section id="view-inventory-risks"/.test(prototype) && /id="inventoryRisksPage"/.test(prototype), "Prototype must own the unified Inventory Risks view root");
productionModules.forEach(file => check(prototype.includes(`<script src="${file}"></script>`), `${file} must load from prototype.html`));
domainModules.forEach(file => check(!/\bdocument\b|querySelector|getElementById/.test(read(file)), `${file} must remain DOM-independent`));
check(/"excess-stock": "excess_demand"/.test(app), "Excess route alias must remain registered");
check(/"slow-dead-stock": "slow_dead"/.test(app), "Slow / Dead route alias must remain registered");
check(/"blocked-quality": "blocked_quality"/.test(app), "Blocked / Quality route alias must remain registered");
check(/navInventoryRisks:\s*"Bestandsrisiken"/.test(app) && /navInventoryRisks:\s*"Inventory Risks"/.test(app), "German and English navigation labels must both exist");
check(["all", "excess_demand", "slow_dead", "blocked_quality", "prioritized"].every(segment => app.includes(`inventoryRiskSegment_${segment}`)), "All five localized segment keys must exist");
check(/inventoryRiskNoCombinedTotal/.test(app), "The explicit no-combined-total financial guard must exist");
check(/IR-WORKSPACE-UX-02-VIEW-1/.test(view), "Inventory Risk view must expose the IR-WORKSPACE-UX-02 presentation version");
check(/<details class="inventory-risk-more-filters"/.test(view), "Inventory Risk advanced filters must use the progressive disclosure");
check(/inventoryRiskPortfolioSummary/.test(view) && /inventoryRiskFinancialSummary/.test(view), "Inventory Risk summary must retain the Portfolio and Financial Impact groups");
check(/--inventory-risk-workspace-height:\s*clamp\(300px,\s*calc\(100dvh - 465px\),\s*680px\)/.test(styles), "Desktop Inventory Risk workspace must remain viewport-bound");
check(/\.inventory-risk-table-wrap\s*\{[\s\S]*?overflow:\s*auto/.test(styles), "Inventory Risk Worklist must retain one internal scroll owner");
check(/ir-workspace-ux-02-regression\.test\.js/.test(structuredTests), "IR-WORKSPACE-UX-02 structured regression suite must be registered");
check(fs.existsSync(path.join(root, "tests/ir-workspace-ux-02-product-smoke.cjs")), "IR-WORKSPACE-UX-02 Product Smoke must exist");
check(!/tests\/|test-runner|__OBSOLIQ_TEST_RESULTS__/.test(prototype), "Production bootstrap must not load or execute tests");

const context = { window: {} };
vm.runInNewContext(read("tests/app-template.js"), context, { filename: "tests/app-template.js" });
check(context.window.__OBSOLIQ_APP_HTML === prototype, "Structured-test app template must exactly mirror prototype.html");
check(/ir-01-regression\.test\.js/.test(structuredTests), "IR-01 structured regression suite must be registered");

const report = { status: failures.length ? "failed" : "passed", checks, visibleNavigation: navTags, productionModules, failures };
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
