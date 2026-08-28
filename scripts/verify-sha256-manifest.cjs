const path = require("path");
const {
  AUTHORIZED_PACKAGE_ADDITIONS,
  AUTHORIZED_PACKAGE_REMOVALS,
  BASELINE_PACKAGE_PATHS,
  DATA_PROVENANCE,
  EXPECTED_PACKAGE_PATHS,
  REQUIRED_PACKAGE_ANCHORS,
  verifyPayloadRoot
} = require("./sha256-manifest-lib.cjs");

function verifyManifest(rootDirectory = process.cwd(), options = {}) {
  const result = verifyPayloadRoot(path.resolve(rootDirectory), {
    expectedPaths: options.expectedPaths || EXPECTED_PACKAGE_PATHS,
    provenance: options.provenance || DATA_PROVENANCE,
    requiredAnchors: options.requiredAnchors || REQUIRED_PACKAGE_ANCHORS,
    strictRootSet: options.strictRootSet === true
  });
  return {
    ...result,
    baselinePaths: BASELINE_PACKAGE_PATHS.length,
    authorizedAdditions: [...AUTHORIZED_PACKAGE_ADDITIONS],
    authorizedRemovals: [...AUTHORIZED_PACKAGE_REMOVALS],
    expectedFinalPaths: (options.expectedPaths || EXPECTED_PACKAGE_PATHS).length
  };
}

if (require.main === module) {
  try {
    const result = verifyManifest();
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "passed") process.exit(1);
  } catch (error) {
    console.error(JSON.stringify({
      status: "blocked",
      code: error.code || "PKG_MANIFEST_VERIFICATION_FAILED",
      message: error.message,
      details: error.details || {}
    }, null, 2));
    process.exit(1);
  }
}

module.exports = Object.freeze({ verifyManifest });
