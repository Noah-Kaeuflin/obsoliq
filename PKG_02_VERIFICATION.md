# PKG-02 Verification Report

## Status

**Source and bootstrap status: PASS**

The final archive acceptance is intentionally executed after this report and `SHA256SUMS.txt` are frozen, because the report is itself part of the manifest. Results for the extracted final bundle are reported in the Codex completion response. No source blocker remains at report freeze.

## Git State

- Branch: `fix/ex-ux-01-3-excess-decision-narrative`
- Initial commit: `aae61092d3fc6a9ba7f1018d711fd387ab99ad5e`
- Commit at report freeze: `aae61092d3fc6a9ba7f1018d711fd387ab99ad5e`
- Commit/push performed by PKG-02: no
- Git version: `2.40.1.windows.1`
- Node runtime used: `v24.19.0`
- Initial worktree: dirty; accepted work from earlier blocks was preserved and not reverted.
- PKG-02 also remains uncommitted as required.

Worktree state immediately before this report was created:

```text
 M ARCHITECTURE.md
 M CHANGELOG.md
 M DATA_CONTRACT.md
 M PRODUCT_SPEC.md
 M README.md
 M app.js
 M js/application/excess-analysis-service.js
 M js/excess/excess-decision-workspace-model.js
 M js/excess/opportunity-score-engine.js
 M prototype.html
 M styles.css
 M tests/app-template.js
 M tests/ex-ux-01-1-regression.test.js
 M tests/ex-ux-01-2-product-smoke.cjs
 M tests/ex-ux-01-2-regression.test.js
 M tests/excess-pilot-review-ui.test.js
 M tests/test-helpers.js
 M tests/tests.html
?? AP_16_4D_3A_FIXTURE_BASELINE.md
?? AP_16_4D_3B_CALIBRATION_METRICS_AND_SENSITIVITY.md
?? CH_EX_01A_1_VERIFICATION.md
?? SHA256SUMS.txt
?? artifacts/
?? assets/icons/
?? js/slow-dead/slow-dead-calibration-contract.js
?? js/slow-dead/slow-dead-calibration-metrics.js
?? js/slow-dead/slow-dead-calibration-runner.js
?? js/slow-dead/slow-dead-threshold-sensitivity.js
?? js/ui/
?? scripts/
?? tests/ap-16-4d-3a-product-smoke.cjs
?? tests/ap-16-4d-3a-static-contract.cjs
?? tests/ap-16-4d-3b-product-smoke.cjs
?? tests/ap-16-4d-3b-static-contract.cjs
?? tests/ch-ex-01a-product-smoke.cjs
?? tests/ch-ex-01a-regression.test.js
?? tests/ch-ex-01a-static-contract.cjs
?? tests/ex-ux-01-3-1-product-smoke.cjs
?? tests/ex-ux-01-3-1-regression.test.js
?? tests/ex-ux-01-3-product-smoke.cjs
?? tests/ex-ux-01-3-regression.test.js
?? tests/ex-ux-01-4-product-smoke.cjs
?? tests/ex-ux-01-4-regression.test.js
?? tests/ex-ux-01-5-product-smoke.cjs
?? tests/ex-ux-01-5-regression.test.js
?? tests/ex-ux-01-6-product-smoke.cjs
?? tests/ex-ux-01-6-regression.test.js
?? tests/fixtures/slow-dead-calibration-baseline-evidence.json
?? tests/fixtures/slow-dead-calibration-fixtures.js
?? tests/fixtures/slow-dead-calibration-sensitivity-evidence.json
?? tests/generate-slow-dead-calibration-baseline.cjs
?? tests/generate-slow-dead-calibration-sensitivity.cjs
?? tests/icon-01-product-smoke.cjs
?? tests/icon-01-runtime.test.js
?? tests/icon-01-static-contract.cjs
?? tests/pkg-02-manifest-tools.cjs
?? tests/pkg-02-product-smoke.cjs
?? tests/pkg-02-static-contract.cjs
?? tests/run-browser-suite.cjs
?? tests/slow-dead-calibration-baseline.test.js
?? tests/slow-dead-calibration-contract.test.js
?? tests/slow-dead-calibration-determinism.test.js
?? tests/slow-dead-calibration-fixtures.test.js
?? tests/slow-dead-calibration-metrics.test.js
?? tests/slow-dead-threshold-sensitivity.test.js
?? tests/smoke-runtime.cjs
```

`DATA_CONTRACT.md`, `PRODUCT_SPEC.md`, `app.js`, `styles.css` and the domain/service changes shown above predated PKG-02 and were not modified by this work block.

## Preflight And Missing Files

All documented package files were physically present. Missing-file gate result: **no missing files**.

The prior `SHA256SUMS.txt` was rejected as stale and incomplete:

- entries: 143
- missing physical files: 0
- hash mismatches against the current worktree: 11
- current package files not listed: 38
- out-of-scope manifest entries: 0

No file was reconstructed from documentation and no placeholder evidence was created.

## Bootstrap Closure

### Product

`prototype.html` is the productive local entry. It loads 43 unique scripts. The productive Slow / Dead Condition Engine remains loaded before the Page Model, and the file-safe Icon Runtime remains loaded exactly once before `app.js`.

The following analysis-only modules are absent from the product entry and from `tests/app-template.js`:

- `js/slow-dead/slow-dead-calibration-contract.js`
- `js/slow-dead/slow-dead-calibration-runner.js`
- `js/slow-dead/slow-dead-calibration-metrics.js`
- `js/slow-dead/slow-dead-threshold-sensitivity.js`

Static search and runtime smoke both confirmed that `app.js` and visible product workflows do not require these modules.

### Test And Analysis

`tests/tests.html` remains the single test/analysis entry. `tests/test-helpers.js` owns one inspectable `CALIBRATION_ANALYSIS_SCRIPTS` list and loads, exactly once per fresh frame, in this order:

1. Calibration Contract
2. Calibration Runner
3. Calibration Metrics
4. Threshold Sensitivity
5. Synthetic Calibration Fixtures

The productive Condition Engine is already present in the product-like frame. No product route, Calibration UI, classifier copy, Policy mutation, Package revision or external dependency was added.

### Bootstrap Acceptance

- local product/test/analysis references resolve inside the package
- product and test-entry script lists contain no duplicate sources
- 122 product HTML IDs are unique
- product-like test template exactly mirrors `prototype.html`
- no Calibration analysis module is required by normal startup
- no external Icon network request occurs

## Package Scope

The final package inventory is generated from root product/document files and the controlled `assets/`, `data/`, `js/`, `scripts/` and `tests/` trees. It includes the two deterministic AP 16.4d.3b artifacts under `artifacts/`.

Excluded by contract:

- `.git/`, `node_modules/`, editor state and OS metadata
- temporary, log, backup and dependency output
- generated screenshots
- obsolete extracted review directories
- the PKG-02 review ZIP and its checksum
- `SHA256SUMS.txt` itself, preventing recursive hashing

Manifest paths use `/`, are repository-relative and lexicographically sorted. Absolute paths, parent traversal, backslashes, duplicates, missing files, mismatches, unlisted package files and out-of-scope entries fail verification.

## ICON-01 Evidence

- manifest records: 39
- Sprite symbols: 39
- unknown allowlist IDs: 0
- Sprite mounts in product: 1, idempotent after repeated mount calls
- navigation mappings: 10
- global action/status mappings: 4
- visible labels preserved: yes
- decorative icons non-focusable/pointer-transparent: yes
- external Icon requests: 0
- icon/text/keyboard interaction equivalence: passed
- Lucide license and Icon README: present

## AP 16.4d.3a Evidence

- Calibration Contract: `slow-dead-calibration-case-v1`
- Condition Policy: `slow-dead-condition-policy-v1`
- reference date: `2026-08-25`
- synthetic Fixtures: 30, all IDs unique
- canonical Conditions represented: 6
- Safety Invariants: 12
- human-expert-validation claims: 0
- baseline agreements: 30
- baseline disagreements: 0
- critical Safety violations: 0
- Fixture/row/runtime/Policy mutation: none detected
- baseline report: byte-reproducible

## AP 16.4d.3b Evidence

- Metrics: `slow-dead-calibration-metrics-v1`
- Sensitivity: `slow-dead-threshold-sensitivity-plan-v1`
- scenarios: 17 (one Baseline plus 16 OFAT variants)
- parameters changed per alternative: exactly one
- analytically unsafe variants detected: 5
- productive Policy mutation/activation: none
- auto-tuning, Policy ranking or recommendation: none
- migration counts versus Case-ID lists: exact
- Markdown/JSON/CSV outputs: byte-reproducible
- Accuracy, Precision, Recall, F1 or Expert Agreement claims: none

Fingerprints:

```text
Policy:             slow-dead-policy:slow-dead-calibration-fingerprint-fnv1a32-v1:0c3cf3e0
Fixtures:           slow-dead-fixtures:slow-dead-calibration-fingerprint-fnv1a32-v1:cde15002
Baseline result:    slow-dead-baseline-result:slow-dead-calibration-fingerprint-fnv1a32-v1:e668f6d6
Sensitivity result: slow-dead-sensitivity-analysis:slow-dead-calibration-fingerprint-fnv1a32-v1:0d5f2bdd
```

## Executed Verification Commands

The following commands were executed from the repository root using Node `v24.19.0`:

```powershell
# Syntax gate over all in-scope .js/.cjs files
Get-ChildItem -Recurse -File | Where-Object { $_.Extension -in '.js','.cjs' } | ForEach-Object { node --check $_.FullName }

node tests/pkg-02-static-contract.cjs
node tests/pkg-02-manifest-tools.cjs
node tests/icon-01-static-contract.cjs
node tests/ap-16-4d-3a-static-contract.cjs
node tests/ap-16-4d-3b-static-contract.cjs
node tests/generate-slow-dead-calibration-baseline.cjs --check
node tests/generate-slow-dead-calibration-sensitivity.cjs --check
node tests/pkg-02-product-smoke.cjs
node tests/icon-01-product-smoke.cjs
node tests/ap-16-4d-3a-product-smoke.cjs
node tests/ap-16-4d-3b-product-smoke.cjs
node tests/run-browser-suite.cjs
git diff --check
git status --short
```

## Real Results

| Gate | Result |
| --- | --- |
| JavaScript syntax | 155 passed, 0 failed |
| PKG-02 static bootstrap/package contract | 427 passed, 0 failed |
| Manifest tooling contract | 18 passed, 0 failed |
| ICON-01 static contract | 178 passed, 0 failed |
| AP 16.4d.3a static/reproducibility contract | 79 passed, 0 failed |
| AP 16.4d.3b static/reproducibility contract | 188 passed, 0 failed |
| 3a baseline artifact check | 1 report byte-identical |
| 3b artifact check | 3 artifacts byte-identical |
| Structured browser suite | 305 passed, 0 failed, 0 skipped |
| PKG-02 productive `file://` smoke | passed |
| ICON-01 productive interaction smoke | passed |
| AP 16.4d.3a productive/analysis-boundary smoke | passed |
| AP 16.4d.3b productive/analysis-boundary smoke | passed |
| `git diff --check` | passed |

Product smoke details:

- sample data loaded automatically
- Upload, Sample Data, Export, navigation and Settings interactions passed
- missing/failed local requests: 0
- external network requests: 0
- Page Errors: 0
- Console Errors: 0
- product Calibration modules before analysis injection: 0

Structured-suite diagnostics:

- Page Errors: 0
- unexpected Console Errors: 0
- one expected forced rollback diagnostic was observed and classified by the existing runner

## Remaining Risks And Boundaries

- This remains a local file-based MVP without production authentication, persistence, SAP live integration or enterprise deployment controls.
- Browser automation requires a local Node/Playwright runtime; it does not require a file from the original working tree after package extraction.
- Synthetic Contract Agreement and OFAT evidence are not human Pilot validation or production accuracy evidence.
- The worktree contains accepted uncommitted changes from earlier work blocks; PKG-02 did not revert or commit them.
- Final ZIP integrity, extracted-manifest verification and extracted-package runtime acceptance are post-manifest gates and are reported by Codex after this report is frozen.

## Scope Confirmation

`AP 16.4d.3c` was not started. No human-review contract, human or invented labels, Calibration UI, new Condition, threshold change, Policy v2, Policy recommendation, Action/Excess/Opportunity Score change, icon expansion, visual redesign, `app.js` refactor, CSS refactor, commit or push was performed.
