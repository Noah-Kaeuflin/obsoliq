# CH-EX-01A.1 Verification

## Final Status

`CH-EX-01A.1 PASS`

CH-EX-01B has not started.

## Verified Git And Working-Tree State

- Repository root: `outputs/inventory-recovery-mvp`
- Branch: `fix/ex-ux-01-3-excess-decision-narrative`
- Git HEAD: `aae61092d3fc6a9ba7f1018d711fd387ab99ad5e`
- Verification date: `2026-08-25`
- The verified package is the current working-tree snapshot, not HEAD alone. The working tree already contained accepted, uncommitted EX-UX and CH-EX-01A work before this closure.
- No baseline tag was created.
- `SHA256SUMS.txt` identifies the exact reviewed snapshot in the bundle.

## Package Manifest

The reviewer bundle contains:

- Product entry and presentation: `prototype.html`, `app.js`, `styles.css`, `sample-data.js`, `assets/**`
- Product modules: all currently loaded `js/**` modules, including the real Opportunity Score Engine, Excess Analysis Service and Decision Workspace Model
- Structured browser test package: `tests/tests.html`, `tests/test-runner.js`, `tests/app-template.js`, `tests/test-helpers.js`, all registered `tests/*.test.js` files and required fixtures
- Portable command-line evidence: `tests/smoke-runtime.cjs`, `tests/run-browser-suite.cjs`, `tests/ch-ex-01a-static-contract.cjs`, `tests/ch-ex-01a-product-smoke.cjs` and all existing EX-UX Product Smokes
- Current contracts and scope: `ARCHITECTURE.md`, `DATA_CONTRACT.md`, `PRODUCT_SPEC.md`, `CHANGELOG.md`, `README.md`
- Closure evidence: `CH_EX_01A_1_VERIFICATION.md`, `SHA256SUMS.txt`

Static package inspection confirmed 42 unique Product scripts, 74 registered Test scripts, no missing Product/Test script and exact Product-script parity between `prototype.html` and `tests/app-template.js`.

## Canonical Contract Versions

| Contract | Version |
| --- | --- |
| Workspace Projection | `3` |
| Decision Readiness | `excess-decision-readiness-v2` |
| Gross-to-Net Reconciliation | `gross-net-reconciliation-v1` |

The Workspace projection, central Reconciliation result and Excess Analysis Service emit a consistent version tuple. Gross, overlap and Net are one canonical Value Narrative. Opportunity Score metadata originates in the real Engine and is passed through Service, Workspace and Renderer without reconstruction in `app.js`.

## Exact Verification Commands

Run from the repository root in PowerShell. The bundled resolver also supports a normal local `playwright` installation or `NODE_PATH` / `OBSOLIQ_NODE_MODULES`.

```powershell
$node = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

& $node --check js/excess/excess-decision-workspace-model.js
& $node --check js/application/excess-analysis-service.js
& $node --check tests/ch-ex-01a-regression.test.js
& $node --check tests/ch-ex-01a-static-contract.cjs
& $node --check tests/ch-ex-01a-product-smoke.cjs
& $node --check tests/smoke-runtime.cjs
& $node --check tests/run-browser-suite.cjs

& $node tests/ch-ex-01a-static-contract.cjs
& $node tests/run-browser-suite.cjs
& $node tests/ch-ex-01a-product-smoke.cjs
& $node tests/ex-ux-01-6-product-smoke.cjs

git diff --check
git status --short
```

On a standard Node.js installation with Playwright resolvable from the repository, replace `& $node` with `node`.

## Executed Results

### Syntax

- 13 changed JavaScript/CommonJS files checked
- 13 passed
- 0 failed

### Static Contract And Package Integrity

- 147 checks passed
- 42 Product scripts, all unique and present
- 74 registered Test scripts, all unique and present
- 7 Product Smoke scripts use the portable runtime resolver
- Prototype/Test-template script order is identical

### Complete Structured Browser / DOM Suite

- 290 total
- 290 passed
- 0 failed
- 0 skipped
- Duration: 169465.2 ms
- Page Errors: 0
- Unexpected Console Errors: 0
- Expected test-only diagnostics: 1 forced rollback-render diagnostic

The complete suite includes Registry, Package, Enrichment, Data Foundation, Data Quality, Historical Runtime, Slow / Dead, EX-UX and CH-EX integration coverage. The CH-EX-01A group contains 8 passing tests; the new real Cross-Module test contributes 34 assertions.

### CH-EX-01A Product And file:// Smoke

- Status: passed
- URL protocol: `file://`
- Viewport: `1440x900`
- Real modules present: Opportunity Score Engine, Excess Analysis Service, Decision Workspace Model
- Contract tuple: Projection 3 / Readiness v2 / Reconciliation v1
- Case Header: Net `102 Tsd. EUR`, Gross `102 Tsd. EUR`, deductions `0 EUR`, Score `87/100`
- Canonical value basis: valid
- Horizontal overflow: 0
- Page Errors: 0
- Console Errors: 0

### Responsive EX-UX Product Smoke

- Status: passed
- Viewports: `1440x900`, `1440x768`, `1366x768`, `1200x800`, `900x900`, `720x900`, `390x844`
- Horizontal overflow: 0 at all viewports
- Page Errors: 0
- Console Errors: 0

### Patch Hygiene

- `git diff --check`: exit code 0
- `git status --short`: executed and recorded during closure

## Cross-Module Result

The real chain was loaded and exercised:

```text
prototype.html
-> Opportunity Score Engine
-> Excess Analysis Service
-> Decision Workspace Model
-> app.js
-> Excess Case Header and Detail
```

Verified behavior:

- Availability objects exist for Score, Gross, overlap and Net.
- Missing evidence remains unavailable; real zero remains available.
- `100 - 20 = 80`, epsilon boundaries and `0 - 0 = 0` are valid.
- Missing, negative, non-finite, currency-mismatched and mathematically inconsistent bases fail closed.
- Invalid value basis forces `not_decidable` and renders the review state.
- Engine Score metadata passes through unchanged.
- Raw scores below 100, exactly 100 and 102 are covered; 102 yields final 100 and two capped points.
- The actual cap note is rendered from Engine metadata.

## Remaining Risks

- This is a local file-based MVP, not production SaaS.
- The verified snapshot is uncommitted; reviewers should use the bundle checksums rather than assume HEAD alone identifies it.
- Playwright is required for command-line Browser Smokes. The resolver supports local installation, `NODE_PATH`, `OBSOLIQ_NODE_MODULES` and the Codex bundled runtime.
- One expected console diagnostic is generated by an existing test that deliberately forces rollback rendering to fail; it is classified separately and is not a Product error.
- No persistence, authentication, SAP live integration, SAP write-back, enterprise security or realized-value workflow is included.

## Reviewer Bundle Boundary

`artifacts/ch-ex-01a.1-review-bundle.zip` is reviewer evidence outside the productive load path. The application does not load it. It must not be copied into a production build without a separate packaging review.
