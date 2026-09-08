const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const MANIFEST_NAME = "SHA256SUMS.txt";
const STABLE_BUNDLE_ROOT = "obsoliq-review-pkg-02a";

// PKG-02A baseline B, captured before the secure-snapshot addendum changes.
// Scope delta is explicit below; the builder never discovers payload by recursively packing the repository.
const BASELINE_PACKAGE_PATHS = Object.freeze([
  "AP_16_4D_3A_FIXTURE_BASELINE.md",
  "AP_16_4D_3B_CALIBRATION_METRICS_AND_SENSITIVITY.md",
  "app.js",
  "ARCHITECTURE.md",
  "artifacts/ap-16-4d-3b-metrics.json",
  "artifacts/ap-16-4d-3b-sensitivity.csv",
  "assets/icons/obsoliq/icon-manifest.json",
  "assets/icons/obsoliq/LICENSE-LUCIDE.txt",
  "assets/icons/obsoliq/obsoliq-icon-sprite.svg",
  "assets/icons/obsoliq/README.md",
  "assets/obsoliq-mark.png",
  "assets/obsoliq-q.png",
  "assets/obsoliq-wordmark.png",
  "CH_EX_01A_1_VERIFICATION.md",
  "CHANGELOG.md",
  "DATA_CONTRACT.md",
  "data/README.md",
  "data/sample_existing_excel_export.csv",
  "data/sample_inventory.csv",
  "js/actions/action-owner-context-engine.js",
  "js/application/consumption-history-interpretation-service.js",
  "js/application/excess-analysis-service.js",
  "js/application/excess-pilot-review-controller.js",
  "js/application/excess-pilot-review-service.js",
  "js/application/excess-pilot-review-view.js",
  "js/application/historical-inventory-metrics-service.js",
  "js/application/historical-metrics-runtime-coordinator.js",
  "js/application/input-trust-service.js",
  "js/application/inventory-enrichment-service.js",
  "js/application/package-import-service.js",
  "js/application/slow-dead-page-controller.js",
  "js/application/slow-dead-page-view.js",
  "js/application/slow-dead-recovery-case-service.js",
  "js/application/slow-dead-runtime-state.js",
  "js/core/canonical-model.js",
  "js/core/value-utils.js",
  "js/data/consumption-history-aggregation-engine.js",
  "js/data/consumption-history-builder.js",
  "js/data/consumption-history-relationship-engine.js",
  "js/data/consumption-history-semantics-engine.js",
  "js/data/data-package-registry.js",
  "js/data/dataset-builder.js",
  "js/data/input-normalization-engine.js",
  "js/data/material-master-builder.js",
  "js/data/package-enrichment-engine.js",
  "js/data/package-relationship-engine.js",
  "js/data/package-relationship-quality-engine.js",
  "js/data/schema-profiler.js",
  "js/data/source-ingestion.js",
  "js/data/source-model.js",
  "js/excess/excess-analysis-engine.js",
  "js/excess/excess-decision-workspace-model.js",
  "js/excess/excess-scenario-engine.js",
  "js/excess/opportunity-score-engine.js",
  "js/mapping/mapping-engine.js",
  "js/recovery/recovery-engine.js",
  "js/slow-dead/slow-dead-calibration-contract.js",
  "js/slow-dead/slow-dead-calibration-metrics.js",
  "js/slow-dead/slow-dead-calibration-runner.js",
  "js/slow-dead/slow-dead-condition-engine.js",
  "js/slow-dead/slow-dead-export-builder.js",
  "js/slow-dead/slow-dead-page-model.js",
  "js/slow-dead/slow-dead-threshold-sensitivity.js",
  "js/ui/obsoliq-icon-system.js",
  "PKG_02_VERIFICATION.md",
  "PRODUCT_SPEC.md",
  "prototype.html",
  "README.md",
  "sample-data.js",
  "scripts/build-pkg-02-review-bundle.cjs",
  "scripts/generate-sha256-manifest.cjs",
  "scripts/sha256-manifest-lib.cjs",
  "scripts/verify-sha256-manifest.cjs",
  "styles.css",
  "tests/ap-16-3b-integration.test.js",
  "tests/ap-16-4c-regression.test.js",
  "tests/ap-16-4d-1-1-regression.test.js",
  "tests/ap-16-4d-1-regression.test.js",
  "tests/ap-16-4d-3a-product-smoke.cjs",
  "tests/ap-16-4d-3a-static-contract.cjs",
  "tests/ap-16-4d-3b-product-smoke.cjs",
  "tests/ap-16-4d-3b-static-contract.cjs",
  "tests/app-frame.html",
  "tests/app-template.js",
  "tests/applied-mapping-normalization-integrity.test.js",
  "tests/applied-policy-identity-closure.test.js",
  "tests/bootstrap.test.js",
  "tests/ch-ex-01a-product-smoke.cjs",
  "tests/ch-ex-01a-regression.test.js",
  "tests/ch-ex-01a-static-contract.cjs",
  "tests/confirmation-invalidation-export-ui-closure.test.js",
  "tests/consumption-history-aggregation-engine.test.js",
  "tests/consumption-history-package.test.js",
  "tests/consumption-history-relationship-engine.test.js",
  "tests/consumption-history-semantics.test.js",
  "tests/consumption-history-source-policy.test.js",
  "tests/data-foundation-ui.test.js",
  "tests/data-quality-alignment.test.js",
  "tests/data-quality-final-polish.test.js",
  "tests/data-quality-header-integration.test.js",
  "tests/data-quality-primary-metrics.test.js",
  "tests/data-quality-responsive-ui.test.js",
  "tests/data-quality-review-hierarchy.test.js",
  "tests/data-quality-ui.test.js",
  "tests/dataset-transaction.test.js",
  "tests/df-ux-02-1-regression.test.js",
  "tests/ex-ux-01-1-regression.test.js",
  "tests/ex-ux-01-2-product-smoke.cjs",
  "tests/ex-ux-01-2-regression.test.js",
  "tests/ex-ux-01-3-1-product-smoke.cjs",
  "tests/ex-ux-01-3-1-regression.test.js",
  "tests/ex-ux-01-3-product-smoke.cjs",
  "tests/ex-ux-01-3-regression.test.js",
  "tests/ex-ux-01-4-product-smoke.cjs",
  "tests/ex-ux-01-4-regression.test.js",
  "tests/ex-ux-01-5-product-smoke.cjs",
  "tests/ex-ux-01-5-regression.test.js",
  "tests/ex-ux-01-6-product-smoke.cjs",
  "tests/ex-ux-01-6-regression.test.js",
  "tests/ex-ux-01-regression.test.js",
  "tests/excess-decision-workspace-model.test.js",
  "tests/excess-intelligence.test.js",
  "tests/excess-pilot-fixtures.test.js",
  "tests/excess-pilot-review-lifecycle.test.js",
  "tests/excess-pilot-review-package-integration.test.js",
  "tests/excess-pilot-review-performance.test.js",
  "tests/excess-pilot-review-service.test.js",
  "tests/excess-pilot-review-ui.test.js",
  "tests/excess-scenario-semantics.test.js",
  "tests/fixtures/excess-pilot-cases.js",
  "tests/fixtures/slow-dead-calibration-baseline-evidence.json",
  "tests/fixtures/slow-dead-calibration-fixtures.js",
  "tests/fixtures/slow-dead-calibration-sensitivity-evidence.json",
  "tests/generate-slow-dead-calibration-baseline.cjs",
  "tests/generate-slow-dead-calibration-sensitivity.cjs",
  "tests/historical-inventory-metrics-integration.test.js",
  "tests/historical-inventory-metrics-performance.test.js",
  "tests/historical-inventory-metrics-service.test.js",
  "tests/historical-metrics-runtime-lifecycle.test.js",
  "tests/historical-metrics-runtime-orchestration.test.js",
  "tests/historical-metrics-runtime-presentation.test.js",
  "tests/icon-01-product-smoke.cjs",
  "tests/icon-01-runtime.test.js",
  "tests/icon-01-static-contract.cjs",
  "tests/input-trust-excess-closure.test.js",
  "tests/input-trust.test.js",
  "tests/inventory-enrichment-integration.test.js",
  "tests/legacy-app-self-tests.js",
  "tests/legacy-regression.test.js",
  "tests/mapping-transaction.test.js",
  "tests/opportunity-score-calibration.test.js",
  "tests/overview-layout.test.js",
  "tests/package-enrichment-engine.test.js",
  "tests/package-import.test.js",
  "tests/package-relationship-engine.test.js",
  "tests/pkg-02-manifest-tools.cjs",
  "tests/pkg-02-product-smoke.cjs",
  "tests/pkg-02-static-contract.cjs",
  "tests/registry.test.js",
  "tests/relationship-drilldown.test.js",
  "tests/relationship-navigation-lifecycle.test.js",
  "tests/run-browser-suite.cjs",
  "tests/runtime-context.test.js",
  "tests/slow-dead-action-eligibility.test.js",
  "tests/slow-dead-calibration-baseline.test.js",
  "tests/slow-dead-calibration-contract.test.js",
  "tests/slow-dead-calibration-determinism.test.js",
  "tests/slow-dead-calibration-fixtures.test.js",
  "tests/slow-dead-calibration-metrics.test.js",
  "tests/slow-dead-condition-engine.test.js",
  "tests/slow-dead-export.test.js",
  "tests/slow-dead-page-integration.test.js",
  "tests/slow-dead-page-model.test.js",
  "tests/slow-dead-page-view-controller.test.js",
  "tests/slow-dead-recovery-case-service.test.js",
  "tests/slow-dead-runtime-boundary.test.js",
  "tests/slow-dead-runtime-integration.test.js",
  "tests/slow-dead-threshold-sensitivity.test.js",
  "tests/smoke-runtime.cjs",
  "tests/test-helpers.js",
  "tests/test-runner.js",
  "tests/tests.html"
]);

const AUTHORIZED_PACKAGE_ADDITIONS = Object.freeze([
  "tests/data-foundation-ux-03.html",
  "tests/data-foundation-ux-03-product-smoke.cjs",
  "scripts/generate-recovery-pilot-01.cjs",
  "tests/fixtures/recovery-pilot-01.cjs",
  "tests/recovery-pilot-01-ingestion.cjs",
  "tests/recovery-pilot-01-product-smoke.cjs",
  "tests/recovery-pilot-01-regression.cjs",
  "data/RECOVERY_PILOT_01.md",
  "js/purchase-orders/po-review-backup.js",
  "tests/recovery-loop-01b.test.cjs",
  "tests/recovery-loop-01b-product-smoke.cjs",
  "tests/recovery-loop-01c.test.cjs",
  "tests/recovery-loop-01c-product-smoke.cjs",
  "tests/recovery-loop-01c-regression.cjs",
  "tests/recovery-loop-01d.test.cjs",
  "tests/recovery-loop-01d-product-smoke.cjs",
  "tests/recovery-loop-01d-regression.cjs",
  "js/data/purchase-orders-builder.js",
  "js/purchase-orders/purchase-order-review-service.js",
  "js/purchase-orders/purchase-orders-demo.js",
  "js/application/purchase-orders-view.js",
  "data/demo/purchase-orders.csv",
  "data/demo/purchase-orders-update.csv",
  "data/templates/purchase-orders-template.csv",
  "scripts/generate-purchase-orders-demo.cjs",
  "tests/recovery-loop-01a.test.cjs",
  "tests/recovery-loop-01a-ui.test.js",
  "tests/recovery-loop-01a-product-smoke.cjs",
  "tests/recovery-loop-01a-milestone.html",
  "tests/recovery-loop-01a-milestone.cjs",
  ".gitattributes",
  "TEST_ARTIFACT_CONTAINMENT_01_VERIFICATION.md",
  "HISTORY_SLOW_DEAD_CONTRACT_CLOSURE_01_RERUN_01_VERIFICATION.md",
  "DATA_FOUNDATION_ACTIVATION_01_RERUN_01_VERIFICATION.md",
  "demo-data.js",
  "data/demo/consumption-history.csv",
  "data/demo/demo-expectations.json",
  "data/demo/inventory-snapshot.csv",
  "data/demo/material-master.csv",
  "data/templates/consumption-history-template.csv",
  "data/templates/material-master-template.csv",
  "scripts/generate-linked-demo-data.cjs",
  "tests/data-foundation-activation-01-full-demo.test.js",
  "tests/data-foundation-activation-01-product-smoke.cjs",
  "tests/data-foundation-activation-01-static-contract.cjs",
  "tests/test-artifact-containment-product-smoke.cjs",
  "NUM_CAL_MIG_01_VERIFICATION.md",
  "R0A_IR_DATA_NUMERIC_SAFETY_VERIFICATION.md",
  "R0B_1_EOL_SHA_REPRODUCIBILITY_VERIFICATION.md",
  "js/application/inventory-risk-page-controller.js",
  "js/application/inventory-risk-page-view.js",
  "js/inventory-risks/blocked-quality-risk-adapter.js",
  "js/inventory-risks/excess-risk-adapter.js",
  "js/inventory-risks/inventory-risk-case-contract.js",
  "js/inventory-risks/inventory-risk-export-builder.js",
  "js/inventory-risks/inventory-risk-page-model.js",
  "js/inventory-risks/inventory-risk-portfolio-service.js",
  "js/inventory-risks/slow-dead-risk-adapter.js",
  "tests/generate-num-cal-mig-01-verification.cjs",
  "tests/inventory-risk-smoke-navigation.cjs",
  "tests/ir-01-product-smoke.cjs",
  "tests/ir-01-regression.test.js",
  "tests/ir-01-static-contract.cjs",
  "tests/num-01-1-contract.test.js",
  "tests/num-01-contract.test.js",
  "tests/num-cal-mig-01-static-contract.cjs",
  "tests/num-cal-mig-01.test.js",
  "tests/r0a-regression.test.js",
  "tests/r0a-targeted.html",
  "tests/r0b-release-integrity.test.js",
  "tests/r0b-1-eol-manifest-reproducibility.test.cjs",
  "tests/r0b-static-contract.cjs",
  "tests/run-r0a-targeted.cjs",
  "ICON_SYS_01_VERIFICATION.md",
  "ICON_SYS_01_1_VERIFICATION.md",
  "ICON_SYS_01_2_VERIFICATION.md",
  "IR_DETAIL_UX_01_VERIFICATION.md",
  "IR_DETAIL_UX_01_1_VERIFICATION.md",
  "IR_WORKSPACE_UX_02_VERIFICATION.md",
  "assets/icons/LICENSE-LUCIDE.txt",
  "assets/icons/README.md",
  "assets/icons/actions/advanced-filter.svg",
  "assets/icons/actions/data-loaded.svg",
  "assets/icons/actions/expand.svg",
  "assets/icons/actions/export.svg",
  "assets/icons/actions/filter.svg",
  "assets/icons/actions/open-record.svg",
  "assets/icons/actions/release-stock.svg",
  "assets/icons/actions/reset-filter.svg",
  "assets/icons/actions/review-case.svg",
  "assets/icons/actions/sample-data.svg",
  "assets/icons/actions/search.svg",
  "assets/icons/actions/upload-file.svg",
  "assets/icons/detail-tabs/action-paths.svg",
  "assets/icons/detail-tabs/decision.svg",
  "assets/icons/detail-tabs/history.svg",
  "assets/icons/detail-tabs/prioritization.svg",
  "assets/icons/detail-tabs/value-logic.svg",
  "assets/icons/icon-manifest.json",
  "assets/icons/indicators/blocked.svg",
  "assets/icons/indicators/critical.svg",
  "assets/icons/indicators/duplicates.svg",
  "assets/icons/indicators/information.svg",
  "assets/icons/indicators/invalid-data.svg",
  "assets/icons/indicators/missing-data.svg",
  "assets/icons/indicators/no-demand.svg",
  "assets/icons/indicators/evidence-readiness.svg",
  "assets/icons/indicators/owner-coverage.svg",
  "assets/icons/indicators/priority-score.svg",
  "assets/icons/indicators/prioritized-cases.svg",
  "assets/icons/indicators/recovery-potential.svg",
  "assets/icons/indicators/total-inventory.svg",
  "assets/icons/indicators/unplanned.svg",
  "assets/icons/indicators/warning.svg",
  "assets/icons/navigation/actions.svg",
  "assets/icons/navigation/blocked-quality.svg",
  "assets/icons/navigation/data-quality.svg",
  "assets/icons/navigation/excess-stock.svg",
  "assets/icons/navigation/inventory-explorer.svg",
  "assets/icons/navigation/inventory-risks.svg",
  "assets/icons/navigation/overview.svg",
  "assets/icons/navigation/purchase-orders.svg",
  "assets/icons/navigation/reports.svg",
  "assets/icons/navigation/settings.svg",
  "assets/icons/navigation/slow-dead-stock.svg",
  "assets/icons/obsoliq-icon-sprite.svg",
  "js/ui/icon-system.js",
  "tests/icon-sys-01-product-smoke.cjs",
  "tests/icon-sys-01-1-product-smoke.cjs",
  "tests/icon-sys-01-1-regression.test.js",
  "tests/icon-sys-01-2-product-smoke.cjs",
  "tests/icon-sys-01-2-regression.test.js",
  "tests/icon-system-regression.test.js",
  "tests/ir-detail-ux-01-product-smoke.cjs",
  "tests/ir-detail-ux-01-regression.test.js",
  "tests/ir-detail-ux-01-1-product-smoke.cjs",
  "tests/ir-detail-ux-01-1-regression.test.js",
  "TRUST_01_VERIFICATION.md",
  "tests/run-trust-01-targeted.cjs",
  "tests/trust-01-missing-zero-contract.test.js",
  "tests/trust-01-product-smoke.cjs",
  "tests/trust-01-source-bound-input-trust.test.js",
  "tests/trust-01-static-contract.cjs",
  "tests/trust-01-targeted.html",
  "tests/trust-01-transaction-rollback.test.js",
  "tests/ir-workspace-ux-02-product-smoke.cjs",
  "tests/ir-workspace-ux-02-regression.test.js",
  "tests/data-foundation-activation-01-contract-red.cjs",
  "tests/history-slow-dead-contract-closure.test.cjs",
  "tests/history-slow-dead-contract-closure-product-smoke.cjs",
  "tests/visible-demo-activation-01-product-smoke.cjs",
  "tests/kpi-availability-01-product-smoke.cjs",
  "tests/kpi-exact-value-01-product-smoke.cjs",
  "tests/overview-startup-ux-02-product-smoke.cjs"
]);
const AUTHORIZED_PACKAGE_REMOVALS = Object.freeze([
  "assets/icons/obsoliq/icon-manifest.json",
  "assets/icons/obsoliq/LICENSE-LUCIDE.txt",
  "assets/icons/obsoliq/obsoliq-icon-sprite.svg",
  "assets/icons/obsoliq/README.md",
  "js/ui/obsoliq-icon-system.js"
]);

const REQUIRED_PACKAGE_ANCHORS = Object.freeze([
  "prototype.html", "app.js", "styles.css", "sample-data.js", "demo-data.js", "js/ui/icon-system.js",
  "assets/icons/icon-manifest.json", "assets/icons/obsoliq-icon-sprite.svg",
  "assets/icons/LICENSE-LUCIDE.txt", "assets/icons/README.md",
  "tests/tests.html", "tests/run-browser-suite.cjs", "tests/pkg-02-product-smoke.cjs",
  "tests/fixtures/excess-pilot-cases.js", "tests/fixtures/slow-dead-calibration-fixtures.js",
  "tests/fixtures/slow-dead-calibration-baseline-evidence.json",
  "tests/fixtures/slow-dead-calibration-sensitivity-evidence.json",
  "js/slow-dead/slow-dead-calibration-contract.js", "js/slow-dead/slow-dead-calibration-runner.js",
  "js/slow-dead/slow-dead-calibration-metrics.js", "js/slow-dead/slow-dead-threshold-sensitivity.js",
  "AP_16_4D_3A_FIXTURE_BASELINE.md", "AP_16_4D_3B_CALIBRATION_METRICS_AND_SENSITIVITY.md",
  "artifacts/ap-16-4d-3b-metrics.json", "artifacts/ap-16-4d-3b-sensitivity.csv",
  "js/inventory-risks/inventory-risk-case-contract.js", "js/inventory-risks/excess-risk-adapter.js",
  "js/inventory-risks/slow-dead-risk-adapter.js", "js/inventory-risks/blocked-quality-risk-adapter.js",
  "js/inventory-risks/inventory-risk-portfolio-service.js", "js/inventory-risks/inventory-risk-page-model.js",
  "js/inventory-risks/inventory-risk-export-builder.js", "js/application/inventory-risk-page-view.js",
  "js/application/inventory-risk-page-controller.js", "tests/ir-01-regression.test.js",
  "tests/ir-01-static-contract.cjs", "tests/ir-01-product-smoke.cjs",
  "tests/r0a-regression.test.js", "tests/r0a-targeted.html", "tests/run-r0a-targeted.cjs",
  "tests/r0b-release-integrity.test.js", "tests/r0b-1-eol-manifest-reproducibility.test.cjs",
  "tests/r0b-static-contract.cjs", "R0B_1_EOL_SHA_REPRODUCIBILITY_VERIFICATION.md",
  "tests/inventory-risk-smoke-navigation.cjs", "tests/icon-system-regression.test.js",
  "tests/icon-sys-01-product-smoke.cjs", "ICON_SYS_01_VERIFICATION.md",
  "scripts/generate-linked-demo-data.cjs", "data/demo/demo-expectations.json",
  "data/templates/material-master-template.csv", "data/templates/consumption-history-template.csv",
  "tests/data-foundation-activation-01-full-demo.test.js",
  "tests/data-foundation-activation-01-product-smoke.cjs",
  "tests/data-foundation-activation-01-static-contract.cjs",
  "DATA_FOUNDATION_ACTIVATION_01_RERUN_01_VERIFICATION.md"
]);

const DATA_PROVENANCE = Object.freeze({
  "tests/fixtures/recovery-pilot-01.cjs": Object.freeze({ classification: "synthetic", note: "Contract-derived purchasing pilot source rows and expected outcomes for fictitious existing demo entities. No personal/customer data or human validation claims." }),
  "data/demo/purchase-orders.csv": Object.freeze({ classification: "synthetic", note: "Hand-authored RECOVERY-LOOP-01A fixtures for fictitious linked demo entities; no customer or personal data." }),
  "data/demo/purchase-orders-update.csv": Object.freeze({ classification: "synthetic", note: "Synthetic source update of the same PO fixture; quantity and evidenced value changed for stale-context tests." }),
  "data/templates/purchase-orders-template.csv": Object.freeze({ classification: "structural-template", note: "Header-only open purchase order item import template." }),
  "js/purchase-orders/purchase-orders-demo.js": Object.freeze({ classification: "synthetic", note: "Generated by scripts/generate-purchase-orders-demo.cjs (po-demo-v1) from the three PO CSV sources. No customer or personal data." }),
  "artifacts/ap-16-4d-3b-metrics.json": Object.freeze({ classification: "synthetic", note: "Deterministically generated from synthetic Slow/Dead calibration fixtures." }),
  "artifacts/ap-16-4d-3b-sensitivity.csv": Object.freeze({ classification: "synthetic", note: "Deterministically generated OFAT output from synthetic calibration fixtures." }),
  "assets/icons/icon-manifest.json": Object.freeze({ classification: "structural-template", note: "Icon identifiers and metadata only; no business or personal records." }),
  "data/demo/consumption-history.csv": Object.freeze({ classification: "synthetic", note: "Deterministically generated Consumption History for the linked ObsoliQ demo; fictitious material and plant identifiers only." }),
  "data/demo/demo-expectations.json": Object.freeze({ classification: "synthetic", note: "Deterministic machine-readable oracle for the linked synthetic demo cohorts and source hashes." }),
  "data/demo/inventory-snapshot.csv": Object.freeze({ classification: "synthetic", note: "Deterministically generated Inventory Snapshot for the linked ObsoliQ demo; fictitious material and plant identifiers only." }),
  "data/demo/material-master.csv": Object.freeze({ classification: "synthetic", note: "Deterministically generated Material Master for the linked ObsoliQ demo; fictitious material and plant identifiers only." }),
  "data/sample_existing_excel_export.csv": Object.freeze({ classification: "synthetic", note: "Generated SAP-like demonstration rows using fictitious material identifiers." }),
  "data/sample_inventory.csv": Object.freeze({ classification: "synthetic", note: "Small hand-authored demonstration inventory with fictitious material identifiers." }),
  "data/templates/consumption-history-template.csv": Object.freeze({ classification: "structural-template", note: "Header-only local Consumption History import template; contains no business rows." }),
  "data/templates/material-master-template.csv": Object.freeze({ classification: "structural-template", note: "Header-only local Material Master import template; contains no business rows." }),
  "demo-data.js": Object.freeze({ classification: "synthetic", note: "Browser-compatible generated descriptor containing the same linked synthetic demo sources and oracle as data/demo/." }),
  "sample-data.js": Object.freeze({ classification: "synthetic", note: "Embedded generated demonstration dataset with fictitious material identifiers." }),
  "tests/fixtures/excess-pilot-cases.js": Object.freeze({ classification: "synthetic", note: "Deterministic test fixtures created solely for regression tests." }),
  "tests/fixtures/slow-dead-calibration-baseline-evidence.json": Object.freeze({ classification: "synthetic", note: "Synthetic calibration evidence fingerprint and aggregate counters." }),
  "tests/fixtures/slow-dead-calibration-fixtures.js": Object.freeze({ classification: "synthetic", note: "Synthetic safety and calibration cases with frozen expected outcomes." }),
  "tests/fixtures/slow-dead-calibration-sensitivity-evidence.json": Object.freeze({ classification: "synthetic", note: "Synthetic sensitivity evidence fingerprint and aggregate counters." })
});

const REPOSITORY_REPRODUCIBILITY_METADATA = Object.freeze({
  ".gitattributes": Object.freeze({
    classification: "repository-reproducibility-policy",
    packageRole: "SOURCE_REPRODUCIBILITY_METADATA",
    runtimeRole: "NONE"
  })
});

const ALLOWED_PROVENANCE_CLASSIFICATIONS = new Set(["synthetic", "public-licensed", "structural-template"]);
const ALLOWED_FILE_EXTENSIONS = new Set([".cjs", ".css", ".csv", ".html", ".js", ".json", ".md", ".png", ".svg", ".txt"]);
const TEXT_FILE_EXTENSIONS = new Set([".cjs", ".css", ".csv", ".html", ".js", ".json", ".md", ".svg", ".txt"]);

function packageError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

function normalizeRelativePath(value) {
  return String(value).replace(/\\/g, "/");
}

function validateManifestPath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath) throw packageError("PKG_PATH_EMPTY", "Manifest path is empty");
  if (relativePath.includes("\\")) throw packageError("PKG_PATH_BACKSLASH", `Backslash path rejected: ${relativePath}`);
  if (/^[A-Za-z]:/.test(relativePath)) throw packageError("PKG_PATH_DRIVE", `Windows drive path rejected: ${relativePath}`);
  if (/^\/\//.test(relativePath)) throw packageError("PKG_PATH_UNC", `UNC-like path rejected: ${relativePath}`);
  if (path.posix.isAbsolute(relativePath)) throw packageError("PKG_PATH_ABSOLUTE", `Absolute path rejected: ${relativePath}`);
  if (relativePath.includes("\0")) throw packageError("PKG_PATH_NUL", "NUL byte in manifest path rejected");
  const segments = relativePath.split("/");
  if (segments.includes("..")) throw packageError("PKG_PATH_TRAVERSAL", `Parent traversal rejected: ${relativePath}`);
  if (segments.includes(".")) throw packageError("PKG_PATH_DOT", `Dot path segment rejected: ${relativePath}`);
  if (segments.some(segment => !segment)) throw packageError("PKG_PATH_EMPTY_SEGMENT", `Empty path segment rejected: ${relativePath}`);
  if (path.posix.normalize(relativePath) !== relativePath) throw packageError("PKG_PATH_NON_CANONICAL", `Non-canonical path rejected: ${relativePath}`);
  return relativePath;
}

function sortPaths(paths) {
  return [...paths].sort((left, right) => left.localeCompare(right, "en"));
}

function inspectPathSet(paths, label = "path set") {
  const normalized = [];
  const duplicates = [];
  const caseCollisions = [];
  const seen = new Set();
  const seenCase = new Map();
  for (const rawPath of paths) {
    const relativePath = validateManifestPath(rawPath);
    if (seen.has(relativePath)) duplicates.push(relativePath);
    seen.add(relativePath);
    const folded = relativePath.toLocaleLowerCase("en-US");
    if (seenCase.has(folded) && seenCase.get(folded) !== relativePath) caseCollisions.push([seenCase.get(folded), relativePath]);
    else seenCase.set(folded, relativePath);
    normalized.push(relativePath);
  }
  if (duplicates.length) throw packageError("PKG_PATH_DUPLICATE", `${label} contains duplicate paths`, { paths: sortPaths(new Set(duplicates)) });
  if (caseCollisions.length) throw packageError("PKG_PATH_CASE_COLLISION", `${label} contains case-colliding paths`, { paths: caseCollisions });
  return normalized;
}

function comparePathSets(expectedPaths, actualPaths) {
  const expected = sortPaths(inspectPathSet(expectedPaths, "expected path set"));
  const actual = sortPaths(inspectPathSet(actualPaths, "actual path set"));
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return { expected, actual, missing: expected.filter(value => !actualSet.has(value)), unexpected: actual.filter(value => !expectedSet.has(value)) };
}

function resolveExpectedPackagePaths() {
  const baseline = inspectPathSet(BASELINE_PACKAGE_PATHS, "baseline package paths");
  const additions = inspectPathSet(AUTHORIZED_PACKAGE_ADDITIONS, "authorized additions");
  const removals = inspectPathSet(AUTHORIZED_PACKAGE_REMOVALS, "authorized removals");
  const removalSet = new Set(removals);
  const expected = sortPaths([...baseline.filter(value => !removalSet.has(value)), ...additions]);
  inspectPathSet(expected, "expected package paths");
  return Object.freeze(expected);
}

const EXPECTED_PACKAGE_PATHS = resolveExpectedPackagePaths();

function validatePackagePathPolicy(relativePath) {
  const value = validateManifestPath(relativePath);
  const parts = value.split("/");
  const lowerParts = parts.map(part => part.toLocaleLowerCase("en-US"));
  const name = lowerParts[lowerParts.length - 1];
  const extension = path.posix.extname(name);
  if (lowerParts.some(part => [".git", "credentials", "credential", "secrets", "secret", "private", "uploads", "runtime-uploads", "downloads", "exports", "user-exports"].includes(part))) throw packageError("PKG_SCOPE_FORBIDDEN_PATH", `Forbidden package path rejected: ${value}`, { path: value });
  if (/^\.env(?:\..+)?$/i.test(name) || [".npmrc", ".netrc"].includes(name)) throw packageError("PKG_SCOPE_CREDENTIAL_FILE", `Credential configuration file rejected: ${value}`, { path: value });
  if (/\.(?:key|pem|p12|pfx|jks|keystore|sql|sqlite|sqlite3|db|dump)$/i.test(name)) throw packageError("PKG_SCOPE_SENSITIVE_FORMAT", `Sensitive file format rejected: ${value}`, { path: value });
  if (/(?:^|[-_.])(?:credential|credentials|secret|secrets|private-key|user-export|runtime-upload)(?:[-_.]|$)/i.test(name)) throw packageError("PKG_SCOPE_SENSITIVE_NAME", `Sensitive filename rejected: ${value}`, { path: value });
  if (parts.some(part => part.startsWith(".")) && value !== ".gitattributes") throw packageError("PKG_SCOPE_UNAUTHORIZED_DOTFILE", `Unauthorized dotfile rejected: ${value}`, { path: value });
  if (value === ".gitattributes") return value;
  if (!ALLOWED_FILE_EXTENSIONS.has(extension)) throw packageError("PKG_SCOPE_UNKNOWN_FORMAT", `Unclassified file format rejected: ${value}`, { path: value });
  return value;
}

function isDataArtifact(relativePath) {
  const extension = path.posix.extname(relativePath).toLocaleLowerCase("en-US");
  return extension === ".csv" || extension === ".json" || relativePath === "sample-data.js" || relativePath === "demo-data.js" || relativePath === "js/purchase-orders/purchase-orders-demo.js" || relativePath.startsWith("tests/fixtures/");
}

function validateDataProvenance(paths, provenance = DATA_PROVENANCE) {
  const expected = inspectPathSet(paths, "provenance path set");
  const rows = [];
  for (const relativePath of expected.filter(isDataArtifact)) {
    const record = provenance[relativePath];
    if (!record || !ALLOWED_PROVENANCE_CLASSIFICATIONS.has(record.classification) || !String(record.note || "").trim()) throw packageError("PKG_PROVENANCE_MISSING", `Data provenance is not classified: ${relativePath}`, { path: relativePath });
    rows.push({ path: relativePath, classification: record.classification, note: record.note });
  }
  const expectedSet = new Set(expected);
  for (const relativePath of Object.keys(provenance)) {
    validateManifestPath(relativePath);
    if (!expectedSet.has(relativePath)) throw packageError("PKG_PROVENANCE_OUT_OF_SCOPE", `Provenance record is outside the expected payload: ${relativePath}`, { path: relativePath });
    if (!isDataArtifact(relativePath)) throw packageError("PKG_PROVENANCE_NOT_DATA", `Provenance record does not describe a data artifact: ${relativePath}`, { path: relativePath });
  }
  return rows;
}

const SECRET_RULES = Object.freeze([
  Object.freeze({ id: "SEC_PRIVATE_KEY", expression: /-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----/g }),
  Object.freeze({ id: "SEC_AWS_ACCESS_KEY", expression: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g }),
  Object.freeze({ id: "SEC_OPENAI_KEY", expression: /\bsk-[A-Za-z0-9]{20,}\b/g }),
  Object.freeze({ id: "SEC_GITHUB_TOKEN", expression: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g }),
  Object.freeze({ id: "SEC_GOOGLE_API_KEY", expression: /\bAIza[0-9A-Za-z_-]{30,}\b/g }),
  Object.freeze({ id: "SEC_BEARER_TOKEN", expression: /\bBearer\s+[A-Za-z0-9._~-]{20,}\b/g }),
  Object.freeze({ id: "SEC_JWT", expression: /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/g }),
  Object.freeze({ id: "SEC_CREDENTIAL_URL", expression: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s/:@]+:[^\s/@]+@/gi }),
  Object.freeze({ id: "SEC_CLOUD_ACCOUNT_KEY", expression: /\bAccountKey\s*=\s*[A-Za-z0-9+/=]{20,}/gi }),
  Object.freeze({ id: "SEC_SECRET_ASSIGNMENT", expression: /\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token)\s*[:=]\s*["'][^"'\n]{8,}["']/gi }),
  Object.freeze({ id: "PII_EMAIL", expression: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi })
]);

function scanBufferForSecrets(relativePath, buffer) {
  if (!TEXT_FILE_EXTENSIONS.has(path.posix.extname(relativePath).toLocaleLowerCase("en-US"))) return [];
  const text = buffer.toString("utf8");
  const findings = [];
  for (const rule of SECRET_RULES) {
    rule.expression.lastIndex = 0;
    if (rule.expression.test(text)) findings.push({ path: relativePath, ruleId: rule.id, redacted: "[REDACTED]" });
  }
  return findings;
}

function scanPayloadRecords(records) {
  const findings = records.flatMap(record => scanBufferForSecrets(record.path, record.data));
  if (findings.length) throw packageError("PKG_SECRET_DETECTED", "High-confidence secret or personal-data pattern detected", { findings });
  return findings;
}

function sha256Bytes(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function sha256File(absolutePath) {
  return sha256Bytes(fs.readFileSync(absolutePath));
}

function isInsideRoot(rootDirectory, targetPath) {
  const relative = path.relative(rootDirectory, targetPath);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function canonicalPayloadRoot(rootDirectory, fsApi = fs) {
  const absoluteRoot = path.resolve(rootDirectory);
  const rootStat = fsApi.lstatSync(absoluteRoot);
  if (rootStat.isSymbolicLink()) throw packageError("PKG_ROOT_SYMLINK", "Payload root may not be a symlink or junction");
  if (!rootStat.isDirectory()) throw packageError("PKG_ROOT_NOT_DIRECTORY", "Payload root is not a directory");
  return fsApi.realpathSync.native ? fsApi.realpathSync.native(absoluteRoot) : fsApi.realpathSync(absoluteRoot);
}

function assertNoSymlinkComponents(rootDirectory, relativePath, fsApi = fs) {
  const value = validateManifestPath(relativePath);
  const root = path.resolve(rootDirectory);
  const segments = value.split("/");
  let current = root;
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    let stat;
    try { stat = fsApi.lstatSync(current); }
    catch { throw packageError("PKG_PATH_MISSING", `Payload path component is missing: ${value}`, { path: value, component: index }); }
    if (stat.isSymbolicLink()) throw packageError("PKG_SYMLINK_REJECTED", `Symlink or junction rejected: ${value}`, { path: value, component: index });
    if (index < segments.length - 1 && !stat.isDirectory()) throw packageError("PKG_COMPONENT_NOT_DIRECTORY", `Intermediate payload component is not a directory: ${value}`, { path: value, component: index });
    if (index === segments.length - 1 && !stat.isFile()) throw packageError("PKG_NOT_REGULAR_FILE", `Non-regular payload file rejected: ${value}`, { path: value });
  }
  return current;
}

function assertRegularPayloadPath(rootDirectory, relativePath, fsApi = fs) {
  const root = canonicalPayloadRoot(rootDirectory, fsApi);
  const absolutePath = assertNoSymlinkComponents(root, relativePath, fsApi);
  const realPath = fsApi.realpathSync.native ? fsApi.realpathSync.native(absolutePath) : fsApi.realpathSync(absolutePath);
  if (!isInsideRoot(root, realPath)) throw packageError("PKG_REALPATH_ESCAPE", `Resolved payload path escaped root: ${relativePath}`, { path: relativePath });
  return { root, absolutePath, realPath };
}

function sameFileIdentity(left, right) {
  if (typeof left.dev === "number" && typeof left.ino === "number" && left.ino !== 0 && right.ino !== 0) return left.dev === right.dev && left.ino === right.ino;
  return left.mode === right.mode && left.size === right.size && Number(left.mtimeMs) === Number(right.mtimeMs);
}

function readRegularFileSafely(rootDirectory, relativePath, fsApi = fs) {
  const resolved = assertRegularPayloadPath(rootDirectory, relativePath, fsApi);
  const noFollow = fsApi.constants && fsApi.constants.O_NOFOLLOW ? fsApi.constants.O_NOFOLLOW : 0;
  const readOnly = fsApi.constants && fsApi.constants.O_RDONLY !== undefined ? fsApi.constants.O_RDONLY : 0;
  const descriptor = fsApi.openSync(resolved.absolutePath, readOnly | noFollow);
  try {
    const descriptorStat = fsApi.fstatSync(descriptor);
    const pathStatBefore = fsApi.lstatSync(resolved.absolutePath);
    if (!descriptorStat.isFile() || pathStatBefore.isSymbolicLink() || !pathStatBefore.isFile() || !sameFileIdentity(descriptorStat, pathStatBefore)) throw packageError("PKG_FILE_CHANGED", `Payload file identity changed before read: ${relativePath}`, { path: relativePath });
    const data = fsApi.readFileSync(descriptor);
    const descriptorStatAfter = fsApi.fstatSync(descriptor);
    const pathStatAfter = fsApi.lstatSync(resolved.absolutePath);
    if (pathStatAfter.isSymbolicLink() || !pathStatAfter.isFile() || !sameFileIdentity(descriptorStatAfter, pathStatAfter)) throw packageError("PKG_FILE_CHANGED", `Payload file identity changed during read: ${relativePath}`, { path: relativePath });
    const realPathAfter = fsApi.realpathSync.native ? fsApi.realpathSync.native(resolved.absolutePath) : fsApi.realpathSync(resolved.absolutePath);
    if (!isInsideRoot(resolved.root, realPathAfter)) throw packageError("PKG_REALPATH_ESCAPE", `Payload path escaped root during read: ${relativePath}`, { path: relativePath });
    return Buffer.from(data);
  } finally { fsApi.closeSync(descriptor); }
}

function extractLocalReferences(html) {
  const references = [];
  for (const match of String(html).matchAll(/<(?:script|img)\b[^>]*\ssrc="([^"]+)"/g)) references.push(match[1]);
  for (const match of String(html).matchAll(/<link\b[^>]*\shref="([^"]+)"/g)) references.push(match[1]);
  return references.map(reference => reference.split("?")[0]);
}

function validateMandatoryAnchors(paths, records = [], requiredAnchors = REQUIRED_PACKAGE_ANCHORS) {
  const expected = inspectPathSet(paths, "expected package paths");
  const expectedSet = new Set(expected);
  const missingAnchors = requiredAnchors.filter(relativePath => !expectedSet.has(relativePath));
  if (missingAnchors.length) throw packageError("PKG_ANCHOR_MISSING", "Required package anchor is missing", { paths: missingAnchors });
  const recordMap = new Map(records.map(record => [record.path, record]));
  const runtimeReferences = recordMap.has("prototype.html") ? extractLocalReferences(recordMap.get("prototype.html").data.toString("utf8")) : [];
  const missingReferences = [];
  for (const reference of runtimeReferences) {
    validateManifestPath(reference);
    if (!expectedSet.has(reference)) missingReferences.push(reference);
  }
  if (missingReferences.length) throw packageError("PKG_RUNTIME_REFERENCE_MISSING", "Runtime reference is outside the expected payload", { paths: missingReferences });
  return { requiredAnchors: [...requiredAnchors], missingAnchors, runtimeReferences };
}

function readExpectedPayload(rootDirectory, expectedPaths = EXPECTED_PACKAGE_PATHS, options = {}) {
  const paths = sortPaths(inspectPathSet(expectedPaths, "expected package paths"));
  paths.forEach(validatePackagePathPolicy);
  const provenanceRows = validateDataProvenance(paths, options.provenance || DATA_PROVENANCE);
  const records = paths.map(relativePath => {
    const data = readRegularFileSafely(rootDirectory, relativePath, options.fsApi || fs);
    return { path: relativePath, data, hash: sha256Bytes(data) };
  });
  scanPayloadRecords(records);
  const anchors = validateMandatoryAnchors(paths, records, options.requiredAnchors || REQUIRED_PACKAGE_ANCHORS);
  return { records, provenanceRows, anchors };
}

function createManifest(records) {
  const paths = inspectPathSet(records.map(record => record.path), "manifest records");
  const recordMap = new Map(records.map(record => [record.path, record]));
  return `${sortPaths(paths).map(relativePath => `${recordMap.get(relativePath).hash || sha256Bytes(recordMap.get(relativePath).data)}  ${relativePath}`).join("\n")}\n`;
}

function parseManifest(text) {
  const entries = [];
  String(text).split(/\r?\n/).forEach((line, index) => {
    if (!line) return;
    const match = line.match(/^([0-9a-f]{64})  (.+)$/);
    if (!match) throw packageError("PKG_MANIFEST_LINE_INVALID", `Invalid manifest line ${index + 1}`);
    entries.push({ hash: match[1], path: validateManifestPath(match[2]) });
  });
  if (!entries.length) throw packageError("PKG_MANIFEST_EMPTY", "Manifest contains no entries");
  inspectPathSet(entries.map(entry => entry.path), "manifest");
  const sorted = sortPaths(entries.map(entry => entry.path));
  if (entries.some((entry, index) => entry.path !== sorted[index])) throw packageError("PKG_MANIFEST_UNSORTED", "Manifest entries are not lexicographically sorted");
  return entries;
}

function verifyManifestRecords(manifestText, records, expectedPaths = EXPECTED_PACKAGE_PATHS) {
  const entries = parseManifest(manifestText);
  const expectedComparison = comparePathSets(expectedPaths, entries.map(entry => entry.path));
  const recordComparison = comparePathSets(expectedPaths, records.map(record => record.path));
  const recordMap = new Map(records.map(record => [record.path, record]));
  const mismatched = [];
  for (const entry of entries) {
    const record = recordMap.get(entry.path);
    if (record && (record.hash || sha256Bytes(record.data)) !== entry.hash) mismatched.push({ path: entry.path, expected: entry.hash, actual: record.hash || sha256Bytes(record.data) });
  }
  return {
    entries,
    missing: sortPaths(new Set([...expectedComparison.missing, ...recordComparison.missing])),
    unexpected: sortPaths(new Set([...expectedComparison.unexpected, ...recordComparison.unexpected])),
    mismatched,
    expectedCount: expectedPaths.length,
    manifestCount: entries.length,
    recordCount: records.length
  };
}

function collectPackageFiles(rootDirectory) {
  readExpectedPayload(rootDirectory, EXPECTED_PACKAGE_PATHS);
  return [...EXPECTED_PACKAGE_PATHS];
}

function listRegularFiles(rootDirectory) {
  const root = canonicalPayloadRoot(rootDirectory);
  const files = [];
  function walk(directory, relativeDirectory = "") {
    const entries = fs.readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const relativePath = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name;
      const absolutePath = path.join(directory, entry.name);
      const stat = fs.lstatSync(absolutePath);
      if (stat.isSymbolicLink()) throw packageError("PKG_SYMLINK_REJECTED", `Symlink or junction rejected in snapshot: ${relativePath}`, { path: relativePath });
      if (stat.isDirectory()) walk(absolutePath, relativePath);
      else if (stat.isFile()) files.push(validateManifestPath(relativePath));
      else throw packageError("PKG_NOT_REGULAR_FILE", `Non-regular snapshot entry rejected: ${relativePath}`, { path: relativePath });
    }
  }
  walk(root);
  return sortPaths(files);
}

function verifyPayloadRoot(rootDirectory, options = {}) {
  const expectedPaths = options.expectedPaths || EXPECTED_PACKAGE_PATHS;
  const manifestText = readRegularFileSafely(rootDirectory, MANIFEST_NAME).toString("utf8");
  const payload = readExpectedPayload(rootDirectory, expectedPaths, options);
  const verification = verifyManifestRecords(manifestText, payload.records, expectedPaths);
  const regularFiles = options.strictRootSet === false
    ? [...expectedPaths, MANIFEST_NAME]
    : listRegularFiles(rootDirectory);
  const packageComparison = comparePathSets([...expectedPaths, MANIFEST_NAME], regularFiles);
  const status = verification.missing.length || verification.unexpected.length || verification.mismatched.length || packageComparison.missing.length || packageComparison.unexpected.length ? "failed" : "passed";
  return {
    status,
    entryCount: verification.manifestCount,
    expectedCount: verification.expectedCount,
    regularFileCount: regularFiles.length,
    missing: sortPaths(new Set([...verification.missing, ...packageComparison.missing])),
    mismatched: verification.mismatched,
    unlisted: packageComparison.unexpected,
    outOfScope: verification.unexpected,
    provenance: payload.provenanceRows,
    secretFindingCount: 0,
    runtimeReferences: payload.anchors.runtimeReferences
  };
}

module.exports = Object.freeze({
  AUTHORIZED_PACKAGE_ADDITIONS, AUTHORIZED_PACKAGE_REMOVALS, BASELINE_PACKAGE_PATHS, DATA_PROVENANCE,
  REPOSITORY_REPRODUCIBILITY_METADATA,
  EXPECTED_PACKAGE_PATHS, MANIFEST_NAME, REQUIRED_PACKAGE_ANCHORS, STABLE_BUNDLE_ROOT,
  assertNoSymlinkComponents, assertRegularPayloadPath, collectPackageFiles, comparePathSets, createManifest,
  extractLocalReferences, inspectPathSet, isDataArtifact, isInsideRoot, listRegularFiles, normalizeRelativePath,
  packageError, parseManifest, readExpectedPayload, readRegularFileSafely, scanBufferForSecrets,
  scanPayloadRecords, sha256Bytes, sha256File, sortPaths, validateDataProvenance, validateMandatoryAnchors,
  validateManifestPath, validatePackagePathPolicy, verifyManifestRecords, verifyPayloadRoot
});
