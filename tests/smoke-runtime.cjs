const os = require("os");
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

module.exports = Object.freeze({
  ...loadPlaywright(),
  repositoryRoot,
  productUrl: pathToFileURL(path.join(repositoryRoot, "prototype.html")).href,
  testsUrl: pathToFileURL(path.join(repositoryRoot, "tests", "tests.html")).href
});
