"use strict";

const assert = require("assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const cp = require("child_process");
const { chromium, repositoryRoot, captureScreenshot, screenshotName, optionalScreenshotEnabled, validateArtifactRoot } = require("./smoke-runtime.cjs");

const suites = ["ch-ex-01a", "ex-ux-01-2", "ex-ux-01-3", "ex-ux-01-3-1", "ex-ux-01-4", "ex-ux-01-5", "ex-ux-01-6", "icon-01", "icon-sys-01", "icon-sys-01-1", "icon-sys-01-2", "ir-01", "ir-detail-ux-01", "ir-detail-ux-01-1", "ir-workspace-ux-02"];
const checks = [];
function check(id, fn) { fn(); checks.push(id); }
function fingerprint(root) {
  const records = [];
  function walk(relative) {
    const target = path.join(root, relative), stat = fs.lstatSync(target);
    assert(!stat.isSymbolicLink());
    records.push([relative, stat.mode, stat.isFile() ? crypto.createHash("sha256").update(fs.readFileSync(target)).digest("hex") : null]);
    if (stat.isDirectory()) for (const name of fs.readdirSync(target).sort()) walk(path.join(relative, name));
  }
  walk("");
  return crypto.createHash("sha256").update(JSON.stringify(records)).digest("hex");
}
function bypasses(text) {
  return /\.screenshot\s*\(|\[\s*["']screenshot["']\s*\]\s*\(|fs\.(?:writeFile|mkdir|createWriteStream)|path\.join\(__dirname,\s*["']screenshots/.test(text);
}
async function childCapture() {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent("<p>Synthetic screenshot containment fixture</p>");
    const logical = screenshotName("ex-ux-01-2", "excess-workspace.png");
    await captureScreenshot(page, logical);
    if (process.argv.includes("--fail-after-capture")) throw new Error("TACI_EXPECTED_AFTER_SCREENSHOT_FAILURE");
    console.log(JSON.stringify({ status: "passed", logical }));
  } finally { await browser.close(); }
}
function runChild(root, extra = []) {
  return new Promise((resolve, reject) => {
    const child = cp.spawn(process.execPath, [__filename, "--capture-child", ...extra], {
      cwd: os.tmpdir(), env: { ...process.env, OBSOLIQ_TEST_ARTIFACT_ROOT: root, OBSOLIQ_SMOKE_SCREENSHOT: "1" }, stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "", stderr = "";
    child.stdout.on("data", value => { stdout += value; });
    child.stderr.on("data", value => { stderr += value; });
    child.on("error", reject);
    child.on("exit", code => resolve({ code, stdout, stderr }));
  });
}
async function main() {
  if (process.argv.includes("--capture-child")) return childCapture();
  const before = fingerprint(repositoryRoot);
  const originalRoot = process.env.OBSOLIQ_TEST_ARTIFACT_ROOT, originalOpt = process.env.OBSOLIQ_SMOKE_SCREENSHOT;
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "obsoliq-taci-fixtures-"));
  const output = path.join(scratch, `artifacts space ${String.fromCodePoint(0x00fc)}`);
  delete process.env.OBSOLIQ_SMOKE_SCREENSHOT;
  process.env.OBSOLIQ_TEST_ARTIFACT_ROOT = output;
  check("optional-default-off", () => assert.equal(optionalScreenshotEnabled(), false));
  process.env.OBSOLIQ_SMOKE_SCREENSHOT = "1";
  check("optional-one-enabled", () => assert.equal(optionalScreenshotEnabled(), true));
  const win = (...parts) => parts.join(String.fromCharCode(92));
  const invalidOpt = ["", "0", "true", win("C:", "outside.png"), win("D:", "outside.png"), win("", "", "server", "share", "shot.png"), "/outside.png", ["file:", "", "", "outside.png"].join("/"), "..", "../shot.png", "..\\shot.png", "mixed/..\\shot.png", "nested/shot.png", "shot.jpg", "shot.png", repositoryRoot, path.join(scratch, "candidate"), path.join(scratch, "build"), path.join(scratch, "extract")];
  invalidOpt.forEach((value, i) => check(`invalid-opt-${i}`, () => {
    process.env.OBSOLIQ_SMOKE_SCREENSHOT = value;
    assert.throws(optionalScreenshotEnabled, { code: "TACI_INVALID_SCREENSHOT_OPT_IN" });
    assert.equal(fs.existsSync(output), false);
  }));
  delete process.env.OBSOLIQ_SMOKE_SCREENSHOT;
  ["../x.png", "/x.png", "x\\y.png", "x/y.png", "a..png", "x.jpg", "CON.png", ""].forEach((value, i) => check(`invalid-child-${i}`, () => assert.throws(() => screenshotName("ex-ux-01-2", value))));
  ["", "relative", repositoryRoot, path.join(repositoryRoot, "tests"), path.dirname(repositoryRoot), `${scratch}${path.sep}x${path.sep}..${path.sep}`].forEach((value, i) => check(`invalid-root-${i}`, () => assert.throws(() => validateArtifactRoot(value))));
  for (const label of ["candidate", "build", "extract"]) {
    const fixture = path.join(scratch, label); fs.mkdirSync(fixture);
    fs.writeFileSync(path.join(fixture, "prototype.html"), "Synthetic protected-root fixture\n", { flag: "wx" });
    check(`protected-${label}`, () => assert.throws(() => validateArtifactRoot(path.join(fixture, "output")), { code: "TACI_PROTECTED_PRODUCT_ROOT" }));
  }
  const link = path.join(scratch, "linked-output"), escape = path.join(scratch, "escape");
  fs.mkdirSync(escape); fs.symlinkSync(escape, link, process.platform === "win32" ? "junction" : "dir");
  check("junction-root", () => assert.throws(() => validateArtifactRoot(link)));
  const nested = path.join(scratch, "nested-output"); fs.mkdirSync(nested); fs.symlinkSync(escape, path.join(nested, "screenshots"), process.platform === "win32" ? "junction" : "dir");
  process.env.OBSOLIQ_TEST_ARTIFACT_ROOT = nested;
  await assert.rejects(() => captureScreenshot({}, screenshotName("ex-ux-01-2", "blocked.png")));
  check("junction-child-no-write", () => assert.equal(fs.readdirSync(escape).length, 0));
  process.env.OBSOLIQ_TEST_ARTIFACT_ROOT = output;
  await assert.rejects(() => captureScreenshot({}, "../escape.png"));
  await assert.rejects(() => captureScreenshot({}, screenshotName("ex-ux-01-2", "invalid.png"), { path: "unsafe.png" }));
  check("invalid-request-no-write", () => assert.equal(fs.existsSync(output), false));

  for (const suite of suites) {
    const text = fs.readFileSync(path.join(repositoryRoot, "tests", `${suite}-product-smoke.cjs`), "utf8");
    check(`central-writer-${suite}`, () => assert.equal(bypasses(text), false));
    check(`capture-active-${suite}`, () => assert(text.includes("captureScreenshot(page,")));
  }
  for (const name of fs.readdirSync(path.join(repositoryRoot, "tests")).filter(name => name.endsWith(".cjs") && ![path.basename(__filename), "smoke-runtime.cjs"].includes(name))) {
    check(`no-direct-screenshot-${name}`, () => assert(!/\.screenshot\s*\(|\[\s*["']screenshot["']\s*\]\s*\(/.test(fs.readFileSync(path.join(repositoryRoot, "tests", name), "utf8"))));
  }
  check("guard-direct-call", () => assert(bypasses(["page", "screenshot({path:'x'})"].join("."))));
  check("guard-bracket-call", () => assert(bypasses(["page[", '"screenshot"', "]()"].join(""))));
  check("guard-local-write", () => assert(bypasses(["fs", "writeFileSync('x.png',bytes)"].join("."))));
  check("guard-local-directory", () => assert(bypasses(["path", "join(__dirname, 'screenshots', 'x')"].join("."))));

  const results = [];
  for (const label of ["sequential-a", "sequential-b"]) results.push(await runChild(path.join(scratch, label)));
  // Concurrent independent processes use distinct, explicitly owned roots.
  const first = runChild(path.join(scratch, "parallel-a"));
  const second = runChild(path.join(scratch, "parallel-b"));
  results.push(await first, await second);
  check("fresh-and-parallel-success", () => assert(results.every(r => r.code === 0 && JSON.parse(r.stdout).logical === "screenshots/ex-ux-01-2/excess-workspace.png")));
  const successFile = path.join(scratch, "sequential-a", "screenshots", "ex-ux-01-2", "excess-workspace.png");
  const originalImage = fs.readFileSync(successFile);
  const repeated = await runChild(path.join(scratch, "sequential-a"));
  check("same-target-no-overwrite", () => { assert.notEqual(repeated.code, 0); assert(fs.readFileSync(successFile).equals(originalImage)); });
  const failedRoot = path.join(scratch, "failure-retained");
  const failed = await runChild(failedRoot, ["--fail-after-capture"]);
  check("failure-keeps-external-evidence", () => {
    assert.notEqual(failed.code, 0); assert(failed.stderr.includes("TACI_EXPECTED_AFTER_SCREENSHOT_FAILURE"));
    assert(fs.readFileSync(path.join(failedRoot, "screenshots", "ex-ux-01-2", "excess-workspace.png")).subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")));
  });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await page.setContent("<p>Synthetic Unicode-root fixture</p>");
    await captureScreenshot(page, screenshotName("ex-ux-01-2", "unicode-root.png"));
    check("unicode-root", () => assert(fs.statSync(path.join(output, "screenshots", "ex-ux-01-2", "unicode-root.png")).size > 8));
    delete process.env.OBSOLIQ_TEST_ARTIFACT_ROOT;
    const prior = new Set(fs.readdirSync(os.tmpdir()).filter(name => name.startsWith("obsoliq-test-artifacts-")));
    await captureScreenshot(page, screenshotName("ex-ux-01-2", "fallback.png"));
    const created = fs.readdirSync(os.tmpdir()).filter(name => name.startsWith("obsoliq-test-artifacts-") && !prior.has(name));
    check("unique-temp-default", () => assert.equal(created.length, 1));
  } finally { await browser.close(); }
  if (originalRoot === undefined) delete process.env.OBSOLIQ_TEST_ARTIFACT_ROOT; else process.env.OBSOLIQ_TEST_ARTIFACT_ROOT = originalRoot;
  if (originalOpt === undefined) delete process.env.OBSOLIQ_SMOKE_SCREENSHOT; else process.env.OBSOLIQ_SMOKE_SCREENSHOT = originalOpt;
  check("complete-product-fingerprint", () => assert.equal(fingerprint(repositoryRoot), before));
  console.log(JSON.stringify({ status: "passed", checks: checks.length, testIds: checks, productUnchanged: true, optionalLogicalPath: "screenshots/ex-ux-01-2/excess-workspace.png" }, null, 2));
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
