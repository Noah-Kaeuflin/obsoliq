"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const failures = [];
let assertions = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function check(condition, message) {
  assertions += 1;
  if (!condition) failures.push(message);
}

const sourceModel = read("js/data/source-model.js");
const mappingEngine = read("js/mapping/mapping-engine.js");
const trustService = read("js/application/input-trust-service.js");
const normalization = read("js/data/input-normalization-engine.js");
const packageService = read("js/application/package-import-service.js");
const materialBuilder = read("js/data/material-master-builder.js");
const historyBuilder = read("js/data/consumption-history-builder.js");
const riskModel = read("js/inventory-risks/inventory-risk-page-model.js");
const riskView = read("js/application/inventory-risk-page-view.js");
const controller = read("js/application/inventory-risk-page-controller.js");
const app = read("app.js");
const prototype = read("prototype.html");

check(sourceModel.includes("typeof sourceIndex === \"number\""), "sourceIndex must be a JavaScript number");
check(sourceModel.includes("Number.isInteger(sourceIndex)"), "sourceIndex must be an integer");
check(sourceModel.includes("physicalSourceIdentityForMappingEntry"), "Source Model must own strict Physical Source Identity");
check(sourceModel.includes("return sourceMetadata.find(meta => meta.sourceIndex === sourceIndex) || null"), "Explicit sourceIndex must not fall back by header");
check(!/Number\(mappingEntry\.sourceIndex\)/.test(trustService), "Input Trust must not coerce sourceIndex");
check(!/find\(meta => meta\.originalHeader === mappingEntry\.sourceColumn\)/.test(trustService), "Input Trust must not fall back by visible header");
check(mappingEngine.includes("sourceKey: sourceColumnMetadata[sourceIndex]?.sourceKey || sourceColumn"), "Automatic Mapping must retain sourceKey");
check(mappingEngine.includes('entry.sourceKey || ""'), "Mapping signature must include sourceKey");
check(mappingEngine.includes("mappingInvalidSourceIdentity"), "Invalid Physical Source Identity must block Mapping validation");
check(mappingEngine.includes("Invalid Physical Source Identity"), "Invalid Physical Source Identity must block Apply");
check(!mappingEngine.includes("approved.find(candidate => candidate.sourceColumn === sourceColumn)"), "Mapping Apply must not fall back by header");
check(normalization.includes("physicalSourceIdentityForMappingEntry"), "Normalization hints must use strict Physical Source Identity");
check(normalization.includes("hasConflictingLocaleEvidence"), "Normalization must detect conflicting per-source locale evidence");
check(normalization.includes('"mixed_numeric_locale"'), "Mixed locale must have a deterministic fail-closed diagnostic");
check(trustService.includes('if (mappingValidation.valid === false) return "blocked"'), "Invalid Mapping must block Input Trust");
check(trustService.includes("normalizationPolicySignature"), "Input Trust metadata must carry Normalization Policy signature");
check(packageService.includes("MAPPING_SIGNATURE_MISMATCH"), "Generic Package commit must block Mapping signature mismatch");
check(packageService.includes("mappingSignature,"), "Generic Package mapping must store its signature");
check(packageService.includes("interpretationResult.semanticPolicySignature !== buildResult.buildMetadata?.semanticPolicySignature"), "History semantic signature comparison must also reject a missing Builder signature");
check(materialBuilder.includes("sourceModel.physicalSourceIdentityForMappingEntry"), "Material Master Builder must use the shared strict Physical Source Identity helper");
check(historyBuilder.includes("sourceModel.physicalSourceIdentityForMappingEntry"), "Consumption History Builder must use the shared strict Physical Source Identity helper");
check(!materialBuilder.includes("sourceIdentityValues"), "Material Master Builder must not retain a permissive parallel identity helper");
check(!historyBuilder.includes("sourceIdentityValues"), "Consumption History Builder must not retain a permissive parallel identity helper");
check(riskModel.includes("familyAvailability"), "Unified Risk Page Model must retain Family availability");
check(riskModel.includes('["available", "limited"].includes(runtimeStatus)'), "A completed available/limited zero-case calculation must remain a genuine zero");
check(riskView.includes('?[\s\S]*t("notAvailable")') || riskView.includes('? t("notAvailable")'), "Unavailable Family badge must use n/a translation");
check(riskView.includes("data-inventory-risk-import-history"), "Unavailable Slow/Dead segment must expose History import CTA");
check(controller.includes("onImportHistory"), "History CTA must route through the existing controller boundary");
check(app.includes("sanitizeMappingContextForProduction"), "Product runtime must strip test-only fault options");
check(!app.includes("function sourceIdentityValues("), "App orchestration must not retain a permissive parallel Physical Identity helper");
check(!app.includes("function sourceMetaMatchesMappingEntry("), "App orchestration must not retain header-only identity matching");
check(app.includes("sanitizeSpreadsheetCell"), "Spreadsheet formula-injection guard must remain present");
check(app.includes("html("), "Imported text rendering must retain the central escaping adapter");
check(!/localStorage\.setItem\s*\([^\n]*(rawRows|normalizedRows|enrichedRows|sourceColumnMetadata)/.test(app), "Product app must not persist imported business rows in localStorage");
check(!/sessionStorage\.setItem\s*\(/.test(app), "Product app must not persist imported data in sessionStorage");
check(!/indexedDB\.open\s*\(/.test(app), "Product app must not persist imported data in IndexedDB");
check(!/navigator\.serviceWorker\.register\s*\(/.test(app), "Product app must not register a Service Worker");
check(!/\bfetch\s*\(/.test(app), "Product app must not send imported business data via fetch");
check(!/\bXMLHttpRequest\b/.test(app), "Product app must not send imported business data via XMLHttpRequest");
check(!/<script[^>]+src=["']https?:/i.test(prototype), "Direct file runtime must not load external scripts");
check(!/<link[^>]+href=["']https?:/i.test(prototype), "Direct file runtime must not load external styles");
check(prototype.includes('src="js/data/source-model.js"'), "Prototype must load Source Model locally");
check(prototype.includes('src="js/application/input-trust-service.js"'), "Prototype must load Input Trust locally");
check(prototype.includes('src="js/application/package-import-service.js"'), "Prototype must load Package Import Service locally");
check(prototype.includes('src="js/inventory-risks/inventory-risk-page-model.js"'), "Prototype must load Unified Risk model locally");
check(prototype.includes('src="app.js"'), "Prototype must load the local app orchestrator");

console.log(JSON.stringify({
  status: failures.length ? "FAIL" : "PASS",
  assertions,
  passed: assertions - failures.length,
  failed: failures.length,
  failures
}, null, 2));
if (failures.length) process.exit(1);
