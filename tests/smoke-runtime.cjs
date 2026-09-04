const os = require("os");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

function playwrightSearchRoots() {
  const nodePathRoots = String(process.env.NODE_PATH || "")
    .split(path.delimiter)
    .map(value => value.trim())
    .filter(Boolean);
  return [
    ...nodePathRoots,
    process.env.OBSOLIQ_NODE_MODULES || "",
    path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules")
  ].filter(Boolean);
}

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (directError) {
    for (const root of playwrightSearchRoots()) {
      try {
        return require(path.join(root, "playwright"));
      } catch {
        // Continue through the portable runtime candidates.
      }
    }
    throw new Error(`Playwright could not be resolved. Install it locally or set NODE_PATH/OBSOLIQ_NODE_MODULES. ${directError.message}`);
  }
}

const repositoryRoot = path.resolve(__dirname, "..");

let defaultArtifactRoot;

function artifactError(code) {
  return Object.assign(new Error(code), { code });
}

function optionalScreenshotEnabled() {
  const value = process.env.OBSOLIQ_SMOKE_SCREENSHOT;
  if (value === undefined) return false;
  if (value !== "1") throw artifactError("TACI_INVALID_SCREENSHOT_OPT_IN");
  return true;
}

function screenshotName(suite, filename) {
  if (typeof suite !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(suite)
    || typeof filename !== "string" || !/^[a-z0-9][a-z0-9_.-]*\.png$/i.test(filename)
    || filename.includes("..") || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])\./i.test(filename)) {
    throw artifactError("TACI_INVALID_SCREENSHOT_NAME");
  }
  return `screenshots/${suite}/${filename}`;
}

function containsPath(parent, child) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function inspectArtifactAncestors(target) {
  let current = target;
  while (true) {
    if (fs.existsSync(current)) {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw artifactError("TACI_NON_REGULAR_ARTIFACT_DIRECTORY");
      const real = fs.realpathSync.native(current);
      const comparable = value => process.platform === "win32" ? value.toLowerCase() : value;
      if (comparable(real) !== comparable(current)) throw artifactError("TACI_ARTIFACT_ROOT_ALIAS");
      if (["prototype.html", "SHA256SUMS.txt", ".git"].some(name => fs.existsSync(path.join(current, name)))) {
        throw artifactError("TACI_PROTECTED_PRODUCT_ROOT");
      }
    } else {
      // lstat also rejects dangling links, which existsSync does not see.
      try {
        fs.lstatSync(current);
        throw artifactError("TACI_NON_REGULAR_ARTIFACT_DIRECTORY");
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
}

function validateArtifactRoot(value) {
  if (typeof value !== "string" || !value || !path.isAbsolute(value)
    || /^(?:file:|\\\\|\/\/)/i.test(value) || value.includes("\0")
    || (value.includes("/") && value.includes("\\"))) throw artifactError("TACI_INVALID_ARTIFACT_ROOT");
  const parts = value.slice(path.parse(value).root.length).split(/[\\/]/).filter(Boolean);
  if (parts.some(part => part === "." || part === ".." || /[. ]$/.test(part) || /[:<>"|?*]/.test(part))) {
    throw artifactError("TACI_ARTIFACT_ROOT_ALIAS");
  }
  const resolved = path.resolve(value);
  if (containsPath(repositoryRoot, resolved) || containsPath(resolved, repositoryRoot)) throw artifactError("TACI_PROTECTED_PRODUCT_ROOT");
  inspectArtifactAncestors(resolved);
  if (fs.existsSync(resolved) && fs.readdirSync(resolved).some(name => name !== "screenshots")) {
    throw artifactError("TACI_ARTIFACT_ROOT_NOT_DEDICATED");
  }
  return resolved;
}

function artifactRoot() {
  optionalScreenshotEnabled();
  if (process.env.OBSOLIQ_TEST_ARTIFACT_ROOT !== undefined) return validateArtifactRoot(process.env.OBSOLIQ_TEST_ARTIFACT_ROOT);
  if (!defaultArtifactRoot) {
    const prefix = path.join(os.tmpdir(), "obsoliq-test-artifacts-");
    validateArtifactRoot(prefix);
    defaultArtifactRoot = fs.mkdtempSync(prefix);
  }
  return validateArtifactRoot(defaultArtifactRoot);
}

async function captureScreenshot(page, logicalName, options = {}) {
  const parts = typeof logicalName === "string" ? logicalName.split("/") : [];
  if (parts.length !== 3 || parts[0] !== "screenshots" || screenshotName(parts[1], parts[2]) !== logicalName) {
    throw artifactError("TACI_INVALID_SCREENSHOT_NAME");
  }
  if (Object.keys(options).some(key => key !== "fullPage") || (options.fullPage !== undefined && typeof options.fullPage !== "boolean")) {
    throw artifactError("TACI_INVALID_SCREENSHOT_OPTIONS");
  }
  const root = artifactRoot();
  const target = path.join(root, ...parts);
  inspectArtifactAncestors(path.dirname(target));
  if (fs.existsSync(target)) throw artifactError("TACI_SCREENSHOT_EXISTS");
  // Playwright captures bytes only; the single checked writer owns all disk output.
  const bytes = await page.screenshot({ ...options, type: "png" });
  if (!Buffer.isBuffer(bytes) || bytes.length <= 8 || !bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) {
    throw artifactError("TACI_INVALID_PNG");
  }
  validateArtifactRoot(root);
  inspectArtifactAncestors(path.dirname(target));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  inspectArtifactAncestors(path.dirname(target));
  const fd = fs.openSync(target, "wx");
  try {
    fs.writeFileSync(fd, bytes);
  } finally {
    fs.closeSync(fd);
  }
  return logicalName;
}

module.exports = Object.freeze({
  ...loadPlaywright(),
  captureScreenshot,
  screenshotName,
  optionalScreenshotEnabled,
  validateArtifactRoot,
  repositoryRoot,
  productUrl: pathToFileURL(path.join(repositoryRoot, "prototype.html")).href,
  testsUrl: pathToFileURL(path.join(repositoryRoot, "tests", "tests.html")).href
});
