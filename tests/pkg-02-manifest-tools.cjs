const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  AUTHORIZED_PACKAGE_ADDITIONS,
  AUTHORIZED_PACKAGE_REMOVALS,
  BASELINE_PACKAGE_PATHS,
  EXPECTED_PACKAGE_PATHS,
  MANIFEST_NAME,
  REPOSITORY_REPRODUCIBILITY_METADATA,
  STABLE_BUNDLE_ROOT,
  assertNoSymlinkComponents,
  collectPackageFiles,
  createManifest,
  inspectPathSet,
  parseManifest,
  scanBufferForSecrets,
  sha256Bytes,
  sortPaths,
  validateDataProvenance,
  validateMandatoryAnchors,
  validateManifestPath,
  validatePackagePathPolicy
} = require("../scripts/sha256-manifest-lib.cjs");
const {
  buildReviewBundle,
  parseZip,
  verifySnapshotRoot,
  verifyZipBuffer
} = require("../scripts/build-pkg-02-review-bundle.cjs");

const root = path.resolve(__dirname, "..");
const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function rejects(fn, message, expectedCode = "") {
  let error = null;
  try { fn(); } catch (caught) { error = caught; }
  check(Boolean(error), message);
  if (error && expectedCode) check(error.code === expectedCode, `${message} (expected ${expectedCode}, got ${error.code || "no code"})`);
  return error;
}

function writeFile(base, relativePath, content) {
  const target = path.join(base, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function makeRecords(base, expectedPaths) {
  return sortPaths(expectedPaths).map(relativePath => {
    const data = fs.readFileSync(path.join(base, ...relativePath.split("/")));
    return { path: relativePath, data, hash: sha256Bytes(data) };
  });
}

function createMiniRoot(label = "case") {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `obsoliq-pkg-regression-${label}-`));
  const expectedPaths = sortPaths(["app.js", "prototype.html", "styles.css"]);
  const requiredAnchors = [...expectedPaths];
  const provenance = {};
  const originalApp = Buffer.from("window.__PKG_FIXTURE__ = 'snapshot';\n", "utf8");
  writeFile(directory, "prototype.html", '<!doctype html><link rel="stylesheet" href="styles.css"><script src="app.js"></script>');
  writeFile(directory, "styles.css", "body { color: #000; }\n");
  writeFile(directory, "app.js", originalApp);
  writeFile(directory, MANIFEST_NAME, createManifest(makeRecords(directory, expectedPaths)));
  return { directory, expectedPaths, requiredAnchors, provenance, originalApp };
}

function removeTemp(directory) {
  const resolved = path.resolve(directory);
  const tempRoot = path.resolve(os.tmpdir());
  if (!resolved.startsWith(`${tempRoot}${path.sep}`) || !path.basename(resolved).startsWith("obsoliq-pkg-regression-")) throw new Error("Refusing to remove unowned test temp directory");
  fs.rmSync(resolved, { recursive: true, force: true });
}

function miniBuildOptions(fixture, outputPath, hooks = {}) {
  return {
    root: fixture.directory,
    outputPath,
    stableRoot: STABLE_BUNDLE_ROOT,
    expectedPaths: fixture.expectedPaths,
    requiredAnchors: fixture.requiredAnchors,
    provenance: fixture.provenance,
    hooks
  };
}

function fakeStat(kind) {
  return {
    dev: 1,
    ino: kind === "file" ? 3 : 2,
    mode: 0,
    size: kind === "file" ? 1 : 0,
    mtimeMs: 0,
    isSymbolicLink: () => kind === "symlink",
    isDirectory: () => kind === "directory",
    isFile: () => kind === "file",
    isFIFO: () => kind === "fifo",
    isSocket: () => kind === "socket"
  };
}

function fakeComponentFs(kindsByName) {
  return {
    lstatSync(target) {
      const name = path.basename(target);
      return fakeStat(kindsByName[name] || (path.extname(name) ? "file" : "directory"));
    }
  };
}

// Path normalization and collision gates.
check(validateManifestPath("js/core/value-utils.js") === "js/core/value-utils.js", "Valid repository-relative path was changed");
rejects(() => validateManifestPath("C:/outside/file.js"), "Windows drive path must be rejected", "PKG_PATH_DRIVE");
rejects(() => validateManifestPath("/outside/file.js"), "POSIX absolute path must be rejected", "PKG_PATH_ABSOLUTE");
rejects(() => validateManifestPath("//server/share/file.js"), "UNC path must be rejected", "PKG_PATH_UNC");
rejects(() => validateManifestPath("tests/../app.js"), "Parent traversal must be rejected", "PKG_PATH_TRAVERSAL");
rejects(() => validateManifestPath("js\\core\\value-utils.js"), "Backslash alias must be rejected", "PKG_PATH_BACKSLASH");
rejects(() => inspectPathSet(["app.js", "app.js"]), "Duplicate canonical paths must be rejected", "PKG_PATH_DUPLICATE");
rejects(() => inspectPathSet(["App.js", "app.js"]), "Case-colliding paths must be rejected", "PKG_PATH_CASE_COLLISION");

const hashA = "a".repeat(64);
const hashB = "b".repeat(64);
rejects(() => parseManifest(`${hashA}  app.js\n${hashB}  app.js\n`), "Duplicate manifest paths must be rejected", "PKG_PATH_DUPLICATE");
rejects(() => parseManifest(`${hashA}  app.js\n${hashB}  App.js\n`), "Manifest case collisions must be rejected", "PKG_PATH_CASE_COLLISION");
rejects(() => parseManifest(`${hashA}  js/core/value-utils.js\n${hashB}  js\\core\\value-utils.js\n`), "Slash/backslash aliases must be rejected", "PKG_PATH_BACKSLASH");
rejects(() => parseManifest(`${hashA}  styles.css\n${hashB}  app.js\n`), "Unsorted manifest paths must be rejected", "PKG_MANIFEST_UNSORTED");
rejects(() => parseManifest(""), "Missing manifest content must be rejected", "PKG_MANIFEST_EMPTY");
rejects(() => parseManifest("\n\r\n"), "Whitespace-only manifest must be rejected", "PKG_MANIFEST_EMPTY");
rejects(() => parseManifest(`not-a-sha  app.js\n`), "Invalid SHA-256 must be rejected", "PKG_MANIFEST_LINE_INVALID");

// Symlink and non-regular component gates. File-link cases use a deterministic lstat adapter because
// Windows file-symlink creation requires a host privilege that is intentionally unavailable here.
rejects(() => assertNoSymlinkComponents("C:/payload", "internal-link.js", fakeComponentFs({ "internal-link.js": "symlink" })), "Internal file symlink must be rejected", "PKG_SYMLINK_REJECTED");
rejects(() => assertNoSymlinkComponents("C:/payload", "external-link.js", fakeComponentFs({ "external-link.js": "symlink" })), "External file symlink must be rejected", "PKG_SYMLINK_REJECTED");
rejects(() => assertNoSymlinkComponents("C:/payload", "linked/file.js", fakeComponentFs({ linked: "symlink" })), "Directory symlink must be rejected", "PKG_SYMLINK_REJECTED");
rejects(() => assertNoSymlinkComponents("C:/payload", "dir/linked/file.js", fakeComponentFs({ linked: "symlink" })), "Symlink in a middle component must be rejected", "PKG_SYMLINK_REJECTED");
rejects(() => assertNoSymlinkComponents("C:/payload", "broken-link.js", fakeComponentFs({ "broken-link.js": "symlink" })), "Broken symlink must be rejected by lstat without following it", "PKG_SYMLINK_REJECTED");
rejects(() => assertNoSymlinkComponents("C:/payload", "pipe.js", fakeComponentFs({ "pipe.js": "fifo" })), "FIFO or other non-regular entry must be rejected", "PKG_NOT_REGULAR_FILE");

const junctionRoot = fs.mkdtempSync(path.join(os.tmpdir(), "obsoliq-pkg-regression-junction-"));
try {
  const realDirectory = path.join(junctionRoot, "real");
  fs.mkdirSync(realDirectory);
  fs.writeFileSync(path.join(realDirectory, "file.js"), "x");
  fs.symlinkSync(realDirectory, path.join(junctionRoot, "linked"), "junction");
  rejects(() => assertNoSymlinkComponents(junctionRoot, "linked/file.js"), "Real Windows junction must be rejected", "PKG_SYMLINK_REJECTED");
} finally { removeTemp(junctionRoot); }

// Fixed positive path set and required anchors.
const packageFiles = collectPackageFiles(root);
check(BASELINE_PACKAGE_PATHS.length === 182, "Captured PKG-02A baseline must contain 182 paths");
check(new Set(AUTHORIZED_PACKAGE_ADDITIONS).size === AUTHORIZED_PACKAGE_ADDITIONS.length, "Authorized package additions must be unique");
check(JSON.stringify(sortPaths(AUTHORIZED_PACKAGE_REMOVALS)) === JSON.stringify(sortPaths([
  "assets/icons/obsoliq/LICENSE-LUCIDE.txt",
  "assets/icons/obsoliq/README.md",
  "assets/icons/obsoliq/icon-manifest.json",
  "assets/icons/obsoliq/obsoliq-icon-sprite.svg",
  "js/ui/obsoliq-icon-system.js"
])), "Authorized removals must equal the five reviewed Icon Pack replacements");
check(JSON.stringify(EXPECTED_PACKAGE_PATHS) === JSON.stringify(sortPaths(new Set([
  ...BASELINE_PACKAGE_PATHS.filter(item => !AUTHORIZED_PACKAGE_REMOVALS.includes(item)),
  ...AUTHORIZED_PACKAGE_ADDITIONS
]))), "Expected set must equal the captured baseline plus additions minus reviewed removals");
check(packageFiles.length === EXPECTED_PACKAGE_PATHS.length, "Actual positive package set differs from expected paths");
check(packageFiles.includes("prototype.html"), "Product entry must be in package scope");
check(packageFiles.includes("scripts/generate-sha256-manifest.cjs"), "Manifest generator must be in package scope");
check(packageFiles.includes("tests/pkg-02-static-contract.cjs"), "PKG-02 tests must be in package scope");
check(packageFiles.includes("js/inventory-risks/inventory-risk-portfolio-service.js"), "Unified Inventory Risks Runtime must be in package scope");
check(packageFiles.includes("tests/r0b-release-integrity.test.js"), "R0B structured regression must be in package scope");
check(packageFiles.includes("tests/r0b-1-eol-manifest-reproducibility.test.cjs"), "R0B.1 EOL regression must be in package scope");
check(packageFiles.includes("R0B_1_EOL_SHA_REPRODUCIBILITY_VERIFICATION.md"), "R0B.1 verification must be in package scope");
check(packageFiles.filter(relativePath => relativePath === ".gitattributes").length === 1, ".gitattributes must appear exactly once in package scope");
check(packageFiles.filter(relativePath => relativePath.split("/").some(segment => segment.startsWith("."))).every(relativePath => relativePath === ".gitattributes"), "No dotfile other than .gitattributes may enter package scope");
check(REPOSITORY_REPRODUCIBILITY_METADATA[".gitattributes"]?.classification === "repository-reproducibility-policy"
  && REPOSITORY_REPRODUCIBILITY_METADATA[".gitattributes"]?.packageRole === "SOURCE_REPRODUCIBILITY_METADATA"
  && REPOSITORY_REPRODUCIBILITY_METADATA[".gitattributes"]?.runtimeRole === "NONE", ".gitattributes package metadata contract is incomplete");
const gitAttributesBytes = fs.readFileSync(path.join(root, ".gitattributes"));
const gitAttributesLines = gitAttributesBytes.toString("utf8").split("\n").filter(Boolean);
const acceptedGitAttributeLines = [
  "* text=auto",
  ".gitattributes text eol=lf", "*.js text eol=lf", "*.cjs text eol=lf", "*.css text eol=lf",
  "*.html text eol=lf", "*.md text eol=lf", "*.json text eol=lf", "*.csv text eol=lf",
  "*.svg text eol=lf", "*.tsv text eol=lf", "*.txt text eol=lf",
  "*.png binary", "*.jpg binary", "*.jpeg binary", "*.gif binary", "*.webp binary", "*.ico binary",
  "*.xlsx binary", "*.xls binary", "*.pdf binary", "*.zip binary"
];
check(!gitAttributesBytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])) && !gitAttributesBytes.includes(13), ".gitattributes must be UTF-8 without BOM and LF-only");
check(JSON.stringify(gitAttributesLines) === JSON.stringify(acceptedGitAttributeLines), ".gitattributes must contain only the accepted text/LF and binary policy");
check(sha256Bytes(gitAttributesBytes) === "48141415e098daf50c4d2a7b09dba8b4d48ee0836f406d457f7b9bb9c48e82fc", ".gitattributes source bytes differ from the accepted H0 blob bytes");
check(!packageFiles.includes(MANIFEST_NAME), "Manifest must not hash itself");
rejects(() => validateMandatoryAnchors(["prototype.html"], [], ["prototype.html", "app.js"]), "Missing mandatory anchor must be rejected", "PKG_ANCHOR_MISSING");

const builderSource = fs.readFileSync(path.join(root, "scripts/build-pkg-02-review-bundle.cjs"), "utf8");
check(!/\b182\b/.test(builderSource), "Builder must not hard-code the current package count");
check(!/[A-Za-z]:\\Users\\/.test(builderSource), "Builder contains a user-specific path");

// Manifest failure gates.
{
  const fixture = createMiniRoot("missing-manifest");
  try {
    fs.unlinkSync(path.join(fixture.directory, MANIFEST_NAME));
    rejects(() => buildReviewBundle(miniBuildOptions(fixture, path.join(fixture.directory, "out", "bundle.zip"))), "Missing manifest must block build", "PKG_PATH_MISSING");
  } finally { removeTemp(fixture.directory); }
}
{
  const fixture = createMiniRoot("empty-manifest");
  try {
    fs.writeFileSync(path.join(fixture.directory, MANIFEST_NAME), "\n\n");
    rejects(() => buildReviewBundle(miniBuildOptions(fixture, path.join(fixture.directory, "out", "bundle.zip"))), "Empty manifest must block build", "PKG_MANIFEST_EMPTY");
  } finally { removeTemp(fixture.directory); }
}
{
  const fixture = createMiniRoot("missing-expected-entry");
  try {
    const oneRecord = makeRecords(fixture.directory, ["app.js"]);
    fs.writeFileSync(path.join(fixture.directory, MANIFEST_NAME), createManifest(oneRecord));
    rejects(() => buildReviewBundle(miniBuildOptions(fixture, path.join(fixture.directory, "out", "bundle.zip"))), "Missing expected manifest entry must block build", "PKG_MANIFEST_SET_MISMATCH");
  } finally { removeTemp(fixture.directory); }
}
{
  const fixture = createMiniRoot("missing-payload-file");
  try {
    fs.unlinkSync(path.join(fixture.directory, "app.js"));
    rejects(() => buildReviewBundle(miniBuildOptions(fixture, path.join(fixture.directory, "out", "bundle.zip"))), "Missing manifest-listed file must block build", "PKG_PATH_MISSING");
  } finally { removeTemp(fixture.directory); }
}
{
  const fixture = createMiniRoot("extra-snapshot-file");
  try {
    writeFile(fixture.directory, "unexpected.js", "x");
    const result = verifySnapshotRoot(fixture.directory, { expectedPaths: fixture.expectedPaths, requiredAnchors: fixture.requiredAnchors, provenance: fixture.provenance });
    check(result.status === "failed" && result.unlisted.includes("unexpected.js"), "Unexpected snapshot file must fail exact set comparison");
  } finally { removeTemp(fixture.directory); }
}

// Immutable snapshot, ZIP parity, fresh extraction, and publication gates.
{
  const fixture = createMiniRoot("source-mutation");
  try {
    const outputPath = path.join(fixture.directory, "out", "bundle.zip");
    const result = buildReviewBundle(miniBuildOptions(fixture, outputPath, {
      afterSnapshotCreated() { fs.writeFileSync(path.join(fixture.directory, "app.js"), "window.__PKG_FIXTURE__ = 'mutated';\n"); }
    }));
    check(result.snapshotConsistent && result.freshExtractionConsistent, "Snapshot and fresh extraction must be verified");
    check(result.expectedFinalPaths === 3 && result.manifestPaths === 3 && result.snapshotPaths === 3 && result.zipPayloadPaths === 3, "E=M=S=Z must hold for mutation fixture");
    const zipEntries = parseZip(fs.readFileSync(outputPath));
    const appEntry = zipEntries.find(entry => entry.path === `${STABLE_BUNDLE_ROOT}/app.js`);
    check(Boolean(appEntry) && appEntry.data.equals(fixture.originalApp), "ZIP must contain fixed snapshot bytes after live source mutation");
    const verified = verifyZipBuffer(fs.readFileSync(outputPath), { expectedPaths: fixture.expectedPaths, requiredAnchors: fixture.requiredAnchors, provenance: fixture.provenance, stableRoot: STABLE_BUNDLE_ROOT });
    check(verified.payloadCount === fixture.expectedPaths.length, "Snapshot hash must equal ZIP payload hash set");
    check(fs.existsSync(`${outputPath}.sha256`), "External checksum must be published only after final ZIP");
  } finally { removeTemp(fixture.directory); }
}
{
  const fixture = createMiniRoot("publish-failure");
  try {
    const outputDirectory = path.join(fixture.directory, "out");
    const outputPath = path.join(outputDirectory, "bundle.zip");
    rejects(() => buildReviewBundle(miniBuildOptions(fixture, outputPath, {
      beforePublish() { throw new Error("synthetic pre-publication failure"); }
    })), "Pre-publication failure must abort build");
    check(!fs.existsSync(outputPath) && !fs.existsSync(`${outputPath}.sha256`), "Incomplete ZIP or checksum must not be finalized");
    const leftovers = fs.existsSync(outputDirectory) ? fs.readdirSync(outputDirectory).filter(name => name.includes(".tmp")) : [];
    check(leftovers.length === 0, "Temporary ZIP must be removed after failed publication");
  } finally { removeTemp(fixture.directory); }
}

// Fail-closed data scope and redacted secret findings.
rejects(() => validatePackagePathPolicy(".env"), ".env must be rejected", "PKG_SCOPE_CREDENTIAL_FILE");
check(validatePackagePathPolicy(".gitattributes") === ".gitattributes", "The exact .gitattributes root policy must be allowed");
rejects(() => validatePackagePathPolicy(".gitignore"), ".gitignore must remain rejected", "PKG_SCOPE_UNAUTHORIZED_DOTFILE");
rejects(() => validatePackagePathPolicy(".editorconfig"), "Other root dotfiles must remain rejected", "PKG_SCOPE_UNAUTHORIZED_DOTFILE");
rejects(() => validatePackagePathPolicy(".github/workflow.js"), "Dotfile directories must remain rejected", "PKG_SCOPE_UNAUTHORIZED_DOTFILE");
rejects(() => validatePackagePathPolicy("nested/.gitattributes"), "Nested .gitattributes aliases must remain rejected", "PKG_SCOPE_UNAUTHORIZED_DOTFILE");
rejects(() => validatePackagePathPolicy("private/client.json"), "Private data directory must be rejected", "PKG_SCOPE_FORBIDDEN_PATH");
rejects(() => validatePackagePathPolicy("keys/signing.pem"), "Private-key format must be rejected", "PKG_SCOPE_SENSITIVE_FORMAT");
rejects(() => validatePackagePathPolicy("data/customer.sqlite"), "Database dump must be rejected", "PKG_SCOPE_SENSITIVE_FORMAT");
rejects(() => validatePackagePathPolicy("data/blob.bin"), "Unknown binary format must be rejected", "PKG_SCOPE_UNKNOWN_FORMAT");
rejects(() => validateDataProvenance(["data/unclassified.csv"], {}), "Unclassified CSV must be rejected", "PKG_PROVENANCE_MISSING");
rejects(() => validateDataProvenance(["data/unclassified.json"], {}), "Unclassified JSON must be rejected", "PKG_PROVENANCE_MISSING");
const allowedFixtureProvenance = { "tests/fixtures/allowed.js": { classification: "synthetic", note: "Synthetic test-only record." } };
check(validateDataProvenance(["tests/fixtures/allowed.js"], allowedFixtureProvenance).length === 1, "Allowed synthetic fixture provenance must pass");

const artificialPrivateKey = ["-----BEGIN", " PRIVATE KEY-----"].join("");
const artificialApiKey = ["sk-", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"].join("");
const artificialCredentialUrl = ["postgres://fixture:", "nonfunctional", "@", "example.invalid/db"].join("");
const privateFindings = scanBufferForSecrets("fixture.txt", Buffer.from(artificialPrivateKey));
const apiFindings = scanBufferForSecrets("fixture.txt", Buffer.from(artificialApiKey));
const urlFindings = scanBufferForSecrets("fixture.txt", Buffer.from(artificialCredentialUrl));
check(privateFindings.some(finding => finding.ruleId === "SEC_PRIVATE_KEY"), "Artificial private-key header must be detected");
check(apiFindings.some(finding => finding.ruleId === "SEC_OPENAI_KEY"), "Artificial API key must be detected");
check(urlFindings.some(finding => finding.ruleId === "SEC_CREDENTIAL_URL"), "Artificial credential URL must be detected");
check([...privateFindings, ...apiFindings, ...urlFindings].every(finding => finding.redacted === "[REDACTED]" && !Object.values(finding).includes(artificialApiKey)), "Secret findings must remain redacted");

console.log(JSON.stringify({
  status: failures.length ? "failed" : "passed",
  checks,
  baselinePathCount: BASELINE_PACKAGE_PATHS.length,
  authorizedAdditionCount: AUTHORIZED_PACKAGE_ADDITIONS.length,
  authorizedRemovalCount: AUTHORIZED_PACKAGE_REMOVALS.length,
  expectedPathCount: EXPECTED_PACKAGE_PATHS.length,
  packageFileCount: packageFiles.length,
  failures
}, null, 2));
if (failures.length) process.exit(1);
