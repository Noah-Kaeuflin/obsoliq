const fs = require("fs");
const path = require("path");
const {
  AUTHORIZED_PACKAGE_ADDITIONS,
  AUTHORIZED_PACKAGE_REMOVALS,
  BASELINE_PACKAGE_PATHS,
  DATA_PROVENANCE,
  EXPECTED_PACKAGE_PATHS,
  MANIFEST_NAME,
  REQUIRED_PACKAGE_ANCHORS,
  createManifest,
  readExpectedPayload
} = require("./sha256-manifest-lib.cjs");

function generateManifest(rootDirectory = process.cwd()) {
  const root = path.resolve(rootDirectory);
  const payload = readExpectedPayload(root, EXPECTED_PACKAGE_PATHS, {
    provenance: DATA_PROVENANCE,
    requiredAnchors: REQUIRED_PACKAGE_ANCHORS
  });
  const manifest = createManifest(payload.records);
  const manifestPath = path.join(root, MANIFEST_NAME);
  const temporaryPath = path.join(root, `.${MANIFEST_NAME}.${process.pid}.tmp`);
  fs.writeFileSync(temporaryPath, manifest, { flag: "wx" });
  try {
    fs.renameSync(temporaryPath, manifestPath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
  return {
    status: "generated",
    manifest: MANIFEST_NAME,
    baselinePaths: BASELINE_PACKAGE_PATHS.length,
    authorizedAdditions: [...AUTHORIZED_PACKAGE_ADDITIONS],
    authorizedRemovals: [...AUTHORIZED_PACKAGE_REMOVALS],
    expectedFinalPaths: EXPECTED_PACKAGE_PATHS.length,
    fileCount: payload.records.length,
    dataProvenanceCount: payload.provenanceRows.length,
    runtimeReferenceCount: payload.anchors.runtimeReferences.length,
    secretFindingCount: 0
  };
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(generateManifest(), null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      status: "blocked",
      code: error.code || "PKG_MANIFEST_GENERATION_FAILED",
      message: error.message,
      details: error.details || {}
    }, null, 2));
    process.exit(1);
  }
}

module.exports = Object.freeze({ generateManifest });
