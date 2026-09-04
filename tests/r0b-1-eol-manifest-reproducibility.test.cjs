"use strict";

const cp = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  EXPECTED_PACKAGE_PATHS,
  MANIFEST_NAME,
  createManifest,
  readExpectedPayload,
  verifyPayloadRoot
} = require("../scripts/sha256-manifest-lib.cjs");

const root = path.resolve(__dirname, "..");
const textExtensions = new Set([".js", ".cjs", ".html", ".css", ".md", ".txt", ".json", ".csv", ".svg", ".tsv"]);
const binaryExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".zip", ".xlsx", ".xls", ".pdf"]);
const failures = [];
let checks = 0;

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function run(executable, args, options = {}) {
  const result = cp.spawnSync(executable, args, {
    cwd: options.cwd || root,
    encoding: options.encoding === null ? null : "utf8",
    env: options.env || process.env,
    maxBuffer: 32 * 1024 * 1024
  });
  if (result.error || result.status !== 0) {
    throw new Error(`${executable} ${args.join(" ")} failed: ${String(result.stderr || result.error || "")}`);
  }
  return result.stdout;
}

function resolveExecutable(candidates, versionArgs) {
  for (const candidate of candidates.filter(Boolean)) {
    const result = cp.spawnSync(candidate, versionArgs, { encoding: "utf8" });
    if (!result.error && result.status === 0) return candidate;
  }
  throw new Error(`Required executable is unavailable: ${candidates.filter(Boolean).join(", ")}`);
}

function copyFile(sourceRoot, destinationRoot, relativePath) {
  const source = path.join(sourceRoot, ...relativePath.split("/"));
  const destination = path.join(destinationRoot, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function eolStats(buffer) {
  let crlf = 0;
  let loneLf = 0;
  let loneCr = 0;
  for (let index = 0; index < buffer.length; index += 1) {
    if (buffer[index] === 13 && buffer[index + 1] === 10) {
      crlf += 1;
      index += 1;
    } else if (buffer[index] === 10) loneLf += 1;
    else if (buffer[index] === 13) loneCr += 1;
  }
  const hasBom = buffer.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]));
  return { crlf, loneLf, loneCr, hasBom };
}

function sourceFingerprint() {
  const paths = [...EXPECTED_PACKAGE_PATHS, MANIFEST_NAME, ".gitattributes"];
  return new Map(paths.map(relativePath => [relativePath, sha256(fs.readFileSync(path.join(root, ...relativePath.split("/"))))]));
}

function assertSourceUnchanged(before) {
  for (const [relativePath, hash] of before) {
    check(sha256(fs.readFileSync(path.join(root, ...relativePath.split("/")))) === hash, `Source file changed during EOL test: ${relativePath}`);
  }
}

function assertTempDirectory(directory) {
  const resolved = path.resolve(directory);
  const tempRoot = path.resolve(os.tmpdir());
  if (!resolved.startsWith(`${tempRoot}${path.sep}`) || !path.basename(resolved).startsWith("obsoliq-r0b1-eol-")) {
    throw new Error(`Refusing to remove non-test directory: ${resolved}`);
  }
}

function removeTemp(directory) {
  assertTempDirectory(directory);
  fs.rmSync(directory, { recursive: true, force: true });
}

function makeCandidateRepository(label, git, tar, autocrlf = "true", countChecks = true) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), `obsoliq-r0b1-eol-${label}-`));
  const payload = path.join(directory, "payload");
  const archivePath = path.join(directory, "candidate.tar");
  const archiveRoot = path.join(directory, "archive");
  fs.mkdirSync(payload);
  fs.mkdirSync(archiveRoot);
  [...new Set([...EXPECTED_PACKAGE_PATHS, MANIFEST_NAME, ".gitattributes"])].forEach(relativePath => copyFile(root, payload, relativePath));

  run(git, ["init", "--quiet"], { cwd: payload });
  run(git, ["config", "core.autocrlf", autocrlf], { cwd: payload });
  run(git, ["config", "user.name", "ObsoliQ R0B1 Test"], { cwd: payload });
  run(git, ["config", "user.email", ["r0b1", "example.invalid"].join("@")], { cwd: payload });
  run(git, ["add", "--", ".gitattributes", MANIFEST_NAME, ...EXPECTED_PACKAGE_PATHS], { cwd: payload });
  run(git, ["commit", "--quiet", "-m", "R0B.1 EOL fixture"], { cwd: payload });
  run(git, ["archive", "--format=tar", "-o", archivePath, "HEAD"], { cwd: payload });
  run(tar, ["-xf", archivePath, "-C", archiveRoot], { cwd: payload });

  const verification = verifyPayloadRoot(archiveRoot, { strictRootSet: false });
  const verify = (condition, message) => {
    if (countChecks) check(condition, message);
    else if (!condition) throw new Error(message);
  };
  verify(verification.status === "passed", `${label}: archived payload must pass manifest verification`);
  verify(verification.mismatched.length === 0, `${label}: archived payload must have zero SHA mismatches`);
  verify(verification.missing.length === 0, `${label}: archived payload must have zero missing paths`);

  for (const relativePath of EXPECTED_PACKAGE_PATHS) {
    const extension = path.extname(relativePath).toLowerCase();
    const source = fs.readFileSync(path.join(root, ...relativePath.split("/")));
    const archived = fs.readFileSync(path.join(archiveRoot, ...relativePath.split("/")));
    if (relativePath === ".gitattributes" || textExtensions.has(extension)) {
      const stats = eolStats(archived);
      verify(stats.crlf === 0 && stats.loneCr === 0, `${label}: archived text is not LF-canonical: ${relativePath}`);
      verify(!stats.hasBom, `${label}: archived text unexpectedly contains a UTF-8 BOM: ${relativePath}`);
    }
    if (binaryExtensions.has(extension)) {
      verify(source.equals(archived), `${label}: binary bytes changed during archive: ${relativePath}`);
      const attribute = String(run(git, ["check-attr", "text", "--", relativePath], { cwd: payload })).trim();
      verify(/: text: unset$/.test(attribute), `${label}: binary path is not marked non-text: ${relativePath}`);
    }
  }

  const generated = createManifest(readExpectedPayload(archiveRoot).records);
  verify(generated === fs.readFileSync(path.join(archiveRoot, MANIFEST_NAME), "utf8"), `${label}: archive manifest is path-dependent or non-deterministic`);
  return { directory, archiveRoot, generated, autocrlf };
}

function assertCrLfMutationRejected() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "obsoliq-r0b1-eol-mutation-"));
  try {
    [...EXPECTED_PACKAGE_PATHS, MANIFEST_NAME].forEach(relativePath => copyFile(root, directory, relativePath));
    const target = "tests/r0b-1-eol-manifest-reproducibility.test.cjs";
    const absoluteTarget = path.join(directory, ...target.split("/"));
    const source = fs.readFileSync(absoluteTarget, "utf8");
    check(!source.includes("\r\n"), "Mutation fixture source must begin LF-canonical");
    fs.writeFileSync(absoluteTarget, source.replace(/\n/g, "\r\n"), "utf8");
    const result = verifyPayloadRoot(directory, { strictRootSet: false });
    check(result.status === "failed", "CRLF-mutated payload must fail exact-byte verification");
    check(result.mismatched.some(item => item.path === target), "CRLF-mutated path must be identified explicitly");
  } finally {
    removeTemp(directory);
  }
}

function main() {
  const git = resolveExecutable([
    process.env.OBSOLIQ_GIT_EXECUTABLE,
    "git",
    path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "native", "git", "cmd", "git.exe")
  ], ["--version"]);
  const tar = resolveExecutable([process.env.OBSOLIQ_TAR_EXECUTABLE, "tar"], ["--version"]);
  const before = sourceFingerprint();
  const attributes = fs.readFileSync(path.join(root, ".gitattributes"), "utf8");
  check(EXPECTED_PACKAGE_PATHS.filter(relativePath => relativePath === ".gitattributes").length === 1, ".gitattributes must be a single canonical manifest path");
  check(/^\.gitattributes\s+text\s+eol=lf$/m.test(attributes), ".gitattributes must be LF-canonical itself");
  check(/^\*\.cjs\s+text\s+eol=lf$/m.test(attributes), "CJS files must have an explicit LF contract");
  check(/^\*\.svg\s+text\s+eol=lf$/m.test(attributes), "SVG files must have an explicit LF contract");

  for (const relativePath of [...EXPECTED_PACKAGE_PATHS, MANIFEST_NAME]) {
    const extension = path.extname(relativePath).toLowerCase();
    if (relativePath !== ".gitattributes" && !textExtensions.has(extension)) continue;
    const stats = eolStats(fs.readFileSync(path.join(root, ...relativePath.split("/"))));
    check(stats.crlf === 0 && stats.loneCr === 0, `Worktree text is not LF-canonical: ${relativePath}`);
    check(!stats.hasBom, `Worktree text unexpectedly contains a UTF-8 BOM: ${relativePath}`);
  }

  const localVerification = verifyPayloadRoot(root, { strictRootSet: false });
  check(localVerification.status === "passed", "Current canonical worktree must pass manifest verification");
  check(localVerification.mismatched.length === 0, "Current canonical worktree must have zero SHA mismatches");
  const manifestText = fs.readFileSync(path.join(root, MANIFEST_NAME), "utf8");
  check(!manifestText.includes("\r"), "Manifest output must use LF only");
  const firstManifest = createManifest(readExpectedPayload(root).records);
  const secondManifest = createManifest(readExpectedPayload(root).records);
  check(firstManifest === secondManifest && firstManifest === manifestText, "Repeated manifest generation must be byte-identical");

  const first = makeCandidateRepository("autocrlf-true", git, tar, "true");
  const second = makeCandidateRepository("autocrlf-false", git, tar, "false");
  const input = makeCandidateRepository("autocrlf-input", git, tar, "input", false);
  try {
    check(first.generated === second.generated && second.generated === input.generated, "Manifest output must be independent of absolute checkout path and core.autocrlf mode");
    assertCrLfMutationRejected();
    assertSourceUnchanged(before);
  } finally {
    removeTemp(first.directory);
    removeTemp(second.directory);
    removeTemp(input.directory);
  }

  const report = {
    status: failures.length ? "failed" : "passed",
    checks,
    expectedPackagePaths: EXPECTED_PACKAGE_PATHS.length,
    canonicalTextEol: "LF",
    syntheticArchiveCoreAutocrlfModes: [first.autocrlf, second.autocrlf, input.autocrlf],
    sourceMutations: 0,
    failures
  };
  console.log(JSON.stringify(report, null, 2));
  if (failures.length) process.exit(1);
}

try {
  main();
} catch (error) {
  console.error(JSON.stringify({ status: "blocked", checks, message: error.message, failures }, null, 2));
  process.exit(1);
}
