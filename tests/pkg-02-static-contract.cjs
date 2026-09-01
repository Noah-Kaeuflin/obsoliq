const fs = require("fs");
const path = require("path");
const vm = require("vm");
const {
  HOST_PATH_SCANNER_VERSION,
  assertNoActionableHostPaths,
  scanHostPathRecords
} = require("../scripts/build-pkg-02-review-bundle.cjs");

const root = path.resolve(__dirname, "..");
const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function scriptSources(html) {
  return [...html.matchAll(/<script\s+src="([^"]+)"/g)].map(match => match[1].split("?")[0]);
}

function localAssetReferences(html) {
  const references = [];
  for (const match of html.matchAll(/<(?:script|img)\b[^>]*\ssrc="([^"]+)"/g)) references.push(match[1]);
  for (const match of html.matchAll(/<link\b[^>]*\shref="([^"]+)"/g)) references.push(match[1]);
  return references.map(value => value.split("?")[0]);
}

function validateLocalReference(baseDirectory, reference, label) {
  const normalized = reference.replace(/\\/g, "/");
  check(!/^(?:[a-z]+:|\/\/|\/)/i.test(normalized), `${label} must be package-relative: ${reference}`);
  const target = path.resolve(baseDirectory, normalized);
  check(target === root || target.startsWith(`${root}${path.sep}`), `${label} resolves outside the package: ${reference}`);
  check(fs.existsSync(target), `${label} does not exist: ${reference}`);
}

const prototype = read("prototype.html");
const testsHtml = read("tests/tests.html");
const helpers = read("tests/test-helpers.js");
const productScripts = scriptSources(prototype);
const testScripts = scriptSources(testsHtml);
const analysisOnlyScripts = [
  "js/slow-dead/slow-dead-calibration-contract.js",
  "js/slow-dead/slow-dead-calibration-runner.js",
  "js/slow-dead/slow-dead-calibration-metrics.js",
  "js/slow-dead/slow-dead-threshold-sensitivity.js"
];
const expectedAnalysisBootstrap = [
  "../js/slow-dead/slow-dead-calibration-contract.js",
  "../js/slow-dead/slow-dead-calibration-runner.js",
  "../js/slow-dead/slow-dead-calibration-metrics.js",
  "../js/slow-dead/slow-dead-threshold-sensitivity.js",
  "fixtures/slow-dead-calibration-fixtures.js"
];

localAssetReferences(prototype).forEach(reference => validateLocalReference(root, reference, "Product reference"));
testScripts.forEach(reference => validateLocalReference(path.join(root, "tests"), reference, "Test entry reference"));
check(new Set(productScripts).size === productScripts.length, "Product entry loads a script more than once");
check(new Set(testScripts).size === testScripts.length, "Test entry loads a script more than once");
analysisOnlyScripts.forEach(script => check(!productScripts.includes(script), `Production loads analysis-only module: ${script}`));
check(productScripts.filter(script => script === "js/ui/icon-system.js").length === 1, "Icon runtime must be loaded exactly once");
check(productScripts.indexOf("js/slow-dead/slow-dead-condition-engine.js") < productScripts.indexOf("js/slow-dead/slow-dead-page-model.js"), "Condition Engine dependency order is invalid");
check(productScripts.indexOf("js/ui/icon-system.js") < productScripts.indexOf("app.js"), "Icon runtime must load before app.js");

const analysisListMatch = helpers.match(/const CALIBRATION_ANALYSIS_SCRIPTS = Object\.freeze\((\[[\s\S]*?\])\);/);
check(Boolean(analysisListMatch), "Analysis bootstrap list is not statically inspectable");
if (analysisListMatch) {
  const analysisScripts = JSON.parse(analysisListMatch[1]);
  check(JSON.stringify(analysisScripts) === JSON.stringify(expectedAnalysisBootstrap), "Analysis bootstrap dependencies or order differ from the accepted contract");
  check(new Set(analysisScripts).size === analysisScripts.length, "Analysis bootstrap loads a dependency more than once");
  analysisScripts.forEach(reference => validateLocalReference(path.join(root, "tests"), reference, "Analysis reference"));
}

const templateContext = { window: {} };
vm.runInNewContext(read("tests/app-template.js"), templateContext, { filename: "tests/app-template.js" });
check(templateContext.window.__OBSOLIQ_APP_HTML === prototype, "Product-like test template must exactly mirror prototype.html");

const ids = [...prototype.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
check(duplicateIds.length === 0, `Duplicate product HTML IDs: ${duplicateIds.join(", ")}`);

const appSource = read("app.js");
["calibrationContract", "calibrationRunner", "calibrationMetrics", "thresholdSensitivity"].forEach(token => {
  check(!appSource.includes(token), `app.js unexpectedly depends on analysis token: ${token}`);
});

const requiredPackageFiles = [
  "assets/icons/icon-manifest.json",
  "assets/icons/obsoliq-icon-sprite.svg",
  "assets/icons/LICENSE-LUCIDE.txt",
  "assets/icons/README.md",
  "assets/icons/navigation/inventory-risks.svg",
  "js/ui/icon-system.js",
  ...analysisOnlyScripts,
  "tests/fixtures/slow-dead-calibration-fixtures.js",
  "tests/fixtures/slow-dead-calibration-baseline-evidence.json",
  "tests/fixtures/slow-dead-calibration-sensitivity-evidence.json",
  "AP_16_4D_3A_FIXTURE_BASELINE.md",
  "AP_16_4D_3B_CALIBRATION_METRICS_AND_SENSITIVITY.md",
  "artifacts/ap-16-4d-3b-metrics.json",
  "artifacts/ap-16-4d-3b-sensitivity.csv"
];
requiredPackageFiles.forEach(relativePath => check(fs.existsSync(path.join(root, relativePath)), `Required package file missing: ${relativePath}`));

function slash(...parts) {
  return parts.join("/");
}

function win(...parts) {
  return parts.join("\\");
}

function encodedDrive(doubleEncoded = false) {
  return ["C", String.fromCharCode(37), doubleEncoded ? "253A" : "3A"].join("");
}

function hostPathFixture(id, text, relativePath = "fixture.txt", options = {}) {
  return scanHostPathRecords([{ path: relativePath, data: Buffer.from(text, "utf8") }], { surfaceId: `STATIC:${id}`, ...options });
}

function isSingleActionable(result) {
  return result.actionableHostPathOccurrences === 1
    && result.unclassifiedFindings === 0
    && result.unclassifiedNestedEncodings === 0
    && result.decodeErrors === 0
    && result.scanCoverageGaps === 0;
}

function isBlocked(records, options = {}) {
  try {
    assertNoActionableHostPaths(records, { surfaceId: "STATIC:TAMPER", ...options });
    return false;
  } catch (error) {
    return error?.code === "PKG_HOST_PATH_LEAK";
  }
}

const positiveHostPathCases = [
  ["P01", win("C:", "Users", "Noah", "repo"), "fixture.txt"],
  ["P02", slash("C:", "Users", "Noah", "repo"), "fixture.txt"],
  ["P03", JSON.stringify({ root: win("C:", "Users", "Noah", "repo") }), "fixture.json"],
  ["P04", `{"root":"${["C", "\\u003a", "\\\\Users", "\\\\Noah", "\\\\repo"].join("")}"}`, "fixture.json"],
  ["P05", `root: ${win("C:", "Users", "Noah", "repo").replaceAll("\\", "\\\\")}`, "fixture.md"],
  ["P06", `[root](${slash("file:", "", "", "C:", "Users", "Noah", "repo")})`, "fixture.md"],
  ["P07", `${win("", "", "?", "C:", "Users", "Noah", "repo")}`, "fixture.txt"],
  ["P08", `${win("", "", "server", "share", "repo")}`, "fixture.txt"],
  ["P09", slash("file:", "", "", "C:", "Users", "Noah", "repo"), "fixture.txt"],
  ["P10", slash("file:", "", "", encodedDrive(), "Users", "Noah", "repo"), "fixture.txt"],
  ["P11", slash("file:", "", "server", "share", "repo"), "fixture.txt"],
  ["P12", slash("", "home", "noah", "repo"), "fixture.txt"],
  ["P13", slash("", "Users", "noah", "repo"), "fixture.txt"],
  ["P14", slash("", "workspace", "session", "repo"), "fixture.txt"],
  ["P15", slash("", "tmp", "build", "repo"), "fixture.txt"],
  ["P16", slash("", "private", "tmp", "build", "repo"), "fixture.txt"],
  ["P17", slash("", "var", "folders", "xy", "build", "repo"), "fixture.txt"],
  ["P18", win("C:", "Users", "Noah Kaueflin", "Project Space"), "fixture.txt"],
  ["P19", win("C:", "Users", `N${String.fromCodePoint(0x00f6)}ah`, "Projekt"), "fixture.txt"],
  ["P20", ["C:", "&#92;Users", "&#92;Noah", "&#92;repo"].join(""), "fixture.html"]
];
for (const [id, value, relativePath] of positiveHostPathCases) {
  check(isSingleActionable(hostPathFixture(id, value, relativePath)), `PVHPC01R1 positive host-path case failed: ${id}`);
}

const negativeHostPathCases = [
  "Arrow/Home/End",
  "Press Home/End",
  "Home/End",
  "A/B/C",
  "C:",
  "C++",
  "12:30",
  "https://example.com/Users/noah",
  "https://example.com/home/noah",
  "//cdn.example.com/assets/app.js",
  "/assets/icon.svg",
  "/api/v1/users",
  "data:image/png;base64,...",
  "blob:https://example.com/id",
  "<repository-root>",
  "<external-evidence-root>",
  "${REPOSITORY_ROOT}",
  "%REPOSITORY_ROOT%"
];
negativeHostPathCases.forEach((value, index) => {
  const result = hostPathFixture(`N${index + 1}`, value);
  check(result.actionableHostPathOccurrences === 0 && result.unclassifiedNestedEncodings === 0 && result.decodeErrors === 0, `PVHPC01R1 negative host-path case failed: N${index + 1}`);
});

const containedUsers = hostPathFixture("B01", slash("C:", "Users", "Noah", "repo"));
check(containedUsers.actionableHostPathOccurrences === 1, "PVHPC01R1 contained Users path must count once");
const crossViewValue = JSON.stringify({ root: win("C:", "Users", "Noah", "repo") });
const crossView = hostPathFixture("B02", crossViewValue, "fixture.json", { exactRoots: [slash("C:", "Users", "Noah", "repo")] });
check(crossView.actionableHostPathOccurrences === 1 && crossView.crossViewDuplicatesSuppressed > 0, "PVHPC01R1 same raw span must deduplicate across views");
check(hostPathFixture("B03", `${slash("C:", "Users", "Noah", "a")} and ${slash("D:", "Users", "Noah", "b")}`).actionableHostPathOccurrences === 2, "PVHPC01R1 two source spans in one line must count twice");
const nineRecords = Array.from({ length: 9 }, (_, index) => ({ path: `report-${index}.md`, data: Buffer.from(slash("C:", "Users", "Noah", `repo-${index}`), "utf8") }));
check(scanHostPathRecords(nineRecords, { surfaceId: "STATIC:B04" }).actionableHostPathOccurrences === 9, "PVHPC01R1 nine report spans must count nine times");
check(hostPathFixture("B05", `| root | ${slash("C:", "Users", "Noah", "repo")} |`, "fixture.md").actionableHostPathOccurrences === 1, "PVHPC01R1 table paths remain actionable");
check(hostPathFixture("B06", `\`\`\`text\n${slash("C:", "Users", "Noah", "repo")}\n\`\`\``, "fixture.md").actionableHostPathOccurrences === 1, "PVHPC01R1 code-fence paths remain actionable");
check(hostPathFixture("B07", `<!-- ${slash("C:", "Users", "Noah", "repo")} -->`, "fixture.md").actionableHostPathOccurrences === 1, "PVHPC01R1 comment paths remain actionable");
check(hostPathFixture("B08", `[root](${slash("file:", "", "", "C:", "Users", "Noah", "repo")})`, "fixture.md").actionableHostPathOccurrences === 1, "PVHPC01R1 link-target paths remain actionable");
check(hostPathFixture("B09", slash("C:", "Users", "Noah", "archive")).actionableHostPathOccurrences === 1, "PVHPC01R1 archive-only paths remain actionable");
const archiveName = slash("C:", "Users", "Noah", "entry.txt");
check(scanHostPathRecords([{ path: archiveName, data: Buffer.from("safe", "utf8") }], { surfaceId: "STATIC:B10", includePathNames: true }).actionableHostPathOccurrences === 1, "PVHPC01R1 archive metadata paths remain actionable");
const doubleEncoded = hostPathFixture("B11", slash("file:", "", "", encodedDrive(true), "Users", "Noah", "repo"));
check(doubleEncoded.actionableHostPathOccurrences + doubleEncoded.unclassifiedNestedEncodings === 1, "PVHPC01R1 nested path encoding must fail closed");
const tenRecords = [...nineRecords, { path: "report-9.md", data: Buffer.from(slash("C:", "Users", "Noah", "repo-9"), "utf8") }];
check(scanHostPathRecords(tenRecords, { surfaceId: "STATIC:B12" }).actionableHostPathOccurrences === 10, "PVHPC01R1 tenth report must expand the actionable set");
const utf16Value = win("C:", "Users", "Noah", "utf16");
const utf16Bytes = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(utf16Value, "utf16le")]);
check(scanHostPathRecords([{ path: "fixture.txt", data: utf16Bytes }], { surfaceId: "STATIC:B13" }).actionableHostPathOccurrences === 1, "PVHPC01R1 supported UTF-16 BOM path must remain actionable");

check(isBlocked(tenRecords), "PVHPC01R1 tamper: tenth report must block");
check(isBlocked([{ path: "fixture.txt", data: Buffer.from(win("C:", "Users", "Noah", "repo"), "utf8") }], { exceptions: [{ path: "shifted" }] }), "PVHPC01R1 tamper: shifted exception must not bypass the guard");
check(isBlocked([{ path: "fixture.txt", data: Buffer.from(win("C:", "Users", "Noah", "repo"), "utf8") }], { allowlist: ["*"] }), "PVHPC01R1 tamper: broad allowlist must not bypass the guard");
check(isBlocked([{ path: "fixture.txt", data: Buffer.from(slash("file:", "", "", encodedDrive(true), "Users", "Noah", "repo"), "utf8") }]), "PVHPC01R1 tamper: double-escaped path must block");
check(isBlocked([{ path: "fixture.txt", data: utf16Bytes }]), "PVHPC01R1 tamper: UTF-BOM path must block");
check(isBlocked([{ path: "archive.txt", data: Buffer.from(slash("C:", "Users", "Noah", "archive"), "utf8") }]), "PVHPC01R1 tamper: archive-only leak must block");
check(isBlocked([{ path: "artifact.zip", data: Buffer.from(win("C:", "Users", "Noah", "builder-output"), "latin1") }]), "PVHPC01R1 tamper: manipulated builder output must block");
check(isBlocked([{ path: "fixture.json", data: Buffer.from(JSON.stringify({ root: win("C:", "Users", "Noah", "decoded") }), "utf8") }]), "PVHPC01R1 tamper: decode-only path must block");

check(HOST_PATH_SCANNER_VERSION === "PVHPC01R1_HOST_PATH_SCANNER_V1", "PVHPC01R1 durable guard scanner version mismatch");
check(typeof scanHostPathRecords === "function" && typeof assertNoActionableHostPaths === "function", "PVHPC01R1 durable scanner exports are missing");
const builderSource = read("scripts/build-pkg-02-review-bundle.cjs");
check(["SOURCE_PAYLOAD", "BUILD_SNAPSHOT", "PRODUCT_BUNDLE:ZIP_INPUT", "PRODUCT_BUNDLE:RAW", "PRODUCT_BUNDLE:ENTRIES", "PRODUCT_BUNDLE:EXTRACTED", "PRODUCT_BUNDLE:CHECKSUM_SIDECAR"].every(marker => builderSource.includes(marker)), "PVHPC01R1 durable guard is not wired to every required package surface");
const manifestRecords = read("SHA256SUMS.txt").split(/\r?\n/).filter(Boolean).map(line => line.match(/^[0-9a-f]{64}  (.+)$/)?.[1]).filter(Boolean).map(relativePath => ({ path: relativePath, data: fs.readFileSync(path.join(root, ...relativePath.split("/"))) }));
const completeSourceScan = scanHostPathRecords([...manifestRecords, { path: "SHA256SUMS.txt", data: fs.readFileSync(path.join(root, "SHA256SUMS.txt")) }], { surfaceId: "STATIC:SOURCE_PAYLOAD", exactRoots: [root] });
check(manifestRecords.length === 278 && completeSourceScan.actionableHostPathOccurrences === 0 && completeSourceScan.unclassifiedFindings === 0 && completeSourceScan.unclassifiedNestedEncodings === 0 && completeSourceScan.decodeErrors === 0 && completeSourceScan.scanCoverageGaps === 0, "PVHPC01R1 complete source payload host-path scan is not green");
const safeGuardResult = assertNoActionableHostPaths([{ path: "safe.txt", data: Buffer.from("<repository-root>", "utf8") }], { surfaceId: "STATIC:SAFE" });
check(safeGuardResult.actionableHostPathOccurrences === 0 && safeGuardResult.invalidExceptionBindings === 0 && safeGuardResult.approvedSecurityFixtureOccurrences === 0, "PVHPC01R1 safe placeholder or exception contract is invalid");

console.log(JSON.stringify({
  status: failures.length ? "failed" : "passed",
  checks,
  productScriptCount: productScripts.length,
  testEntryScriptCount: testScripts.length,
  productHtmlIdCount: ids.length,
  duplicateHtmlIdCount: duplicateIds.length,
  failures
}, null, 2));
if (failures.length) process.exit(1);
