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

function scriptSources(html) {
  return [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1].split("?")[0]);
}

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
}

const manifestPath = "assets/icons/icon-manifest.json";
const spritePath = "assets/icons/obsoliq-icon-sprite.svg";
const runtimePath = "js/ui/icon-system.js";
const manifest = JSON.parse(read(manifestPath));
const sprite = read(spritePath);
const runtime = read(runtimePath);
const prototype = read("prototype.html");
const manifestIds = manifest.map(entry => entry.id);
const symbolTags = [...sprite.matchAll(/<symbol\b[^>]*>/g)].map(match => match[0]);
const symbols = symbolTags.map(attributes);
const spriteIds = symbols.map(symbol => String(symbol.id || "").replace(/^oq-/, ""));
const requiredNavigation = [
  "overview",
  "inventory-explorer",
  "inventory-risks",
  "purchase-orders",
  "actions",
  "data-quality",
  "reports",
  "settings"
];
const requiredActions = ["upload-file", "sample-data", "export", "data-loaded"];

check(manifest.length === 43, `Expected 43 manifest records, received ${manifest.length}`);
check(new Set(manifestIds).size === 43, "Manifest IDs must be unique");
check(symbols.length === 43, `Expected 43 sprite symbols, received ${symbols.length}`);
check(new Set(spriteIds).size === 43, "Sprite symbol IDs must be unique");
check(manifestIds.every(id => spriteIds.filter(value => value === id).length === 1), "Every manifest ID must own exactly one sprite symbol");
check(spriteIds.every(id => manifestIds.includes(id)), "Sprite must not contain unknown symbols");
symbols.forEach(symbol => {
  check(symbol.viewBox === "0 0 24 24", `${symbol.id} must use viewBox 0 0 24 24`);
  check(symbol.fill === "none", `${symbol.id} must use fill none`);
  check(symbol.stroke === "currentColor", `${symbol.id} must use currentColor`);
  check(symbol["stroke-width"] === "2", `${symbol.id} must use stroke width 2`);
});
check(requiredNavigation.every(id => manifestIds.includes(id)), "All eight visible navigation icon IDs must exist");
check(requiredActions.every(id => manifestIds.includes(id)), "All four shell action IDs must exist");
check(!/<script|\b(?:href|src)\s*=\s*["'](?:https?:|\/\/)|url\s*\(|@import/i.test(sprite), "Sprite must not contain scripts or remote dependencies");
check(fs.existsSync(path.join(root, "assets/icons/LICENSE-LUCIDE.txt")), "Lucide license must exist");
check(fs.existsSync(path.join(root, "assets/icons/README.md")), "Icon-pack README must exist");
manifest.forEach(entry => {
  const iconPath = path.join(root, "assets/icons", entry.file);
  check(fs.existsSync(iconPath), `Manifest file must exist: ${entry.file}`);
  if (!fs.existsSync(iconPath)) return;
  const source = fs.readFileSync(iconPath, "utf8");
  check(/viewBox="0 0 24 24"/.test(source), `${entry.file} must use viewBox 0 0 24 24`);
  check(/fill="none"/.test(source), `${entry.file} must use fill none`);
  check(/stroke="currentColor"/.test(source), `${entry.file} must use currentColor`);
  check(/stroke-width="2"/.test(source), `${entry.file} must use stroke width 2`);
  check(/stroke-linecap="round"/.test(source) && /stroke-linejoin="round"/.test(source), `${entry.file} must use round line caps and joins`);
  check(!/<script|\bon\w+\s*=|\b(?:href|src)\s*=\s*["'](?:https?:|\/\/)|<image\b/i.test(source), `${entry.file} must not contain active or remote content`);
  check((entry.spriteId || `oq-${entry.id}`) === `oq-${entry.id}`, `${entry.id} must use its canonical Sprite ID`);
});

const runtimeIdsMatch = runtime.match(/const ICON_IDS = Object\.freeze\((\[[\s\S]*?\])\);/);
check(Boolean(runtimeIdsMatch), "Runtime allowlist must be inspectable");
if (runtimeIdsMatch) {
  const runtimeIds = JSON.parse(runtimeIdsMatch[1]);
  check(JSON.stringify(runtimeIds) === JSON.stringify(manifestIds), "Runtime allowlist must preserve manifest order and IDs");
}
const embeddedMatch = runtime.match(/const SPRITE_MARKUP = ("(?:\\.|[^"\\])*");/s);
check(Boolean(embeddedMatch), "Runtime must contain one embedded sprite string");
if (embeddedMatch) {
  const embeddedSprite = JSON.parse(embeddedMatch[1]);
  const sourceWithoutDeclaration = sprite.replace(/^<\?xml[^>]*>\s*/, "");
  check(embeddedSprite === sourceWithoutDeclaration, "Embedded runtime sprite must match the productive sprite asset exactly");
}
check(!/\bfetch\s*\(|XMLHttpRequest|\b(?:href|src)\s*=\s*["'](?:https?:|\/\/)/.test(runtime), "Icon runtime must not perform network access");
check(/const NAVIGATION_ICON_BY_ROUTE = Object\.freeze/.test(runtime), "Navigation mapping must be central and immutable");
check(/const ACTION_ICON_BY_ELEMENT = Object\.freeze/.test(runtime), "Action mapping must be central and immutable");
check(/iconHtml,/.test(runtime) && /hasIcon: has/.test(runtime) && /iconIds: ICON_IDS/.test(runtime), "Public iconHtml, hasIcon and iconIds API must exist");
check(/"inventory-risks": "inventory-risks"/.test(runtime), "Inventory Risks route must use its portfolio icon, not a warning icon");

const productScripts = scriptSources(prototype);
const iconScriptCount = productScripts.filter(source => source === runtimePath).length;
check(iconScriptCount === 1, "Icon system must be loaded exactly once");
check(productScripts.indexOf(runtimePath) < productScripts.indexOf("app.js"), "Icon system must load before app.js");
const appTemplateContext = { window: {} };
vm.runInNewContext(read("tests/app-template.js"), appTemplateContext, { filename: "tests/app-template.js" });
check(JSON.stringify(scriptSources(appTemplateContext.window.__OBSOLIQ_APP_HTML || "")) === JSON.stringify(productScripts), "Test template must preserve productive script order");
check(/icon-01-runtime\.test\.js/.test(read("tests/tests.html")), "Runtime regression test must be registered");
check(/icon-system-regression\.test\.js/.test(read("tests/tests.html")), "ICON-SYS-01 regression test must be registered");
check(/icon-sys-01-1-regression\.test\.js/.test(read("tests/tests.html")), "ICON-SYS-01.1 regression test must be registered");

const report = {
  status: failures.length ? "failed" : "passed",
  checks,
  manifestCount: manifest.length,
  spriteSymbolCount: symbols.length,
  productScriptCount: productScripts.length,
  failures
};
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
