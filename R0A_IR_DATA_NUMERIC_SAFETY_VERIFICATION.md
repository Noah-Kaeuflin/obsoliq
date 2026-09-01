# R0A IR, Data and Numeric Safety Verification

Verification date: 2026-08-28 (Europe/Berlin)
Scope: `R0A - IR/Data/Numeric Safety Fixes`
Repository: `<repository-root>`

## 1. Baseline and Scope

- Product: ObsoliQ Inventory Recovery Cockpit.
- Branch: `feature/ir-01-unified-inventory-risks`.
- HEAD and comparison base: `aae61092d3fc6a9ba7f1018d711fd387ab99ad5e`.
- Audit target: current dirty worktree, not HEAD alone.
- Authorized findings: `NUM-001`, `DATA-001`, `BUG-002`, `BUG-001`.
- Excluded: `REL-001`, manifest/payload closure, Git staging/commit/tag, P2/P3 fixes, broad refactoring and release approval.

The preflight reproduced the audited status baseline exactly when the immutable audit input was excluded. The audit SHA-256 remained:

```text
ca186a51d52af599a398b8522819cd398de19f95afd5f5b139b883d6c3873550
```

`R0A_PREFLIGHT_GATE: PASS`

## 2. Preserved Starting Git State

The starting worktree already contained 38 modified tracked files and 62 original untracked status entries, expanding to 221 untracked files. `OBSOLIQ_CODE_HEALTH_AUDIT.md` was the sole allowed post-baseline input. The baseline status SHA-256 excluding that audit file was reproduced as:

```text
CBE23D6B0B73F353E5B6955A067452B4C1968ED9D6F7ED6C31DDB264B5AD6210
```

No existing user change was reverted, deleted, staged or committed. No branch operation, package installation, manifest generation or accepted-payload change was performed. Every test capable of producing output ran in a fresh temporary copy outside the repository.

## 3. Red Reproductions Before Fixes

| Finding | Pre-fix reproduction | Result |
| --- | --- | --- |
| `NUM-001` | Negative price, negative quantity, overflow, `NaN`, `Infinity`, valid zero, valid positive derivation and valid explicit value | Red: negative price produced `stock_value=-50` instead of unavailable |
| `DATA-001` | Load valid Sample data, then import valid headers with zero data rows | Red: import returned `loaded` instead of rejecting transactionally |
| `BUG-002` | Mixed valid and identity-missing Blocked rows, plus real Unified-route navigation | Red: both tests threw the Family Case identity Contract error |
| `BUG-001` | Primary Excess `available` plus secondary Blocked/Quality `limited`; readiness and detail checks | Red: Portfolio remained `available`; readiness counts were absent |

The red runs were captured in isolated `%TEMP%` copies, including:

```text
obsoliq-r0a-num-red
obsoliq-r0a-data-red
obsoliq-r0a-bug002-red-20260828120432582
obsoliq-r0a-bug001-red-20260828120727388
```

## 4. Root Causes

### NUM-001

The fallback `stock_quantity * standard_price` derivation lacked one shared finite, non-negative postcondition. Recovery could therefore receive invalid derived financial evidence. Direct compatibility calls also needed the input row itself as source evidence when no separate source row was supplied.

### DATA-001

The Inventory import path validated mapping and activated a Dataset without first requiring at least one data row. Header-only input could enter the commit path.

### BUG-002

All three Inventory Risk adapters called the hard Family Case Contract directly. One row without a derivable `inventory_entity_key` threw before valid neighboring cases could reach the Portfolio.

### BUG-001

The Portfolio Case copied `evidence_status` from its primary Family Case while already unioning `missing_evidence` and `limitations` across every Family Case. The KPI then treated that optimistic primary-only status as Portfolio readiness.

## 5. Implemented Changes

### Numeric safety

- Added shared strict non-negative financial-value and derived-product boundaries.
- Invalid or non-finite derived stock values remain `null` and `unavailable` with stable reason codes.
- Recovery rejects invalid stock evidence instead of publishing zero or an amount.
- Data Quality diagnostics expose negative input, non-finite input and overflow reasons.
- Valid explicit values, positive derivations and validated zero remain available.

### Zero-row transaction safety

- Added an Inventory-only row-count guard before mapping, Registry activation and Dataset identity consumption.
- Header-only input returns `EMPTY_DATASET_ROWS` with localized feedback.
- Active Dataset, rows, KPIs, filters, actions, reviews, Registry and identity sequence remain unchanged.

### Identity containment

- Kept `createFamilyCase()` strict for unsupported families and missing Family Case IDs.
- Added one shared adapter collection boundary that contains only missing Inventory Entity identity.
- Invalid candidates are excluded fail-closed and produce diagnostics with no invented material number.
- Valid cases continue through composition, filters and export.
- Mixed and all-invalid states expose limited capability and a localized diagnostic/empty state.

### Evidence aggregation and explainability

- Added one deterministic Evidence status rank and conservative Portfolio aggregation.
- Unknown and empty Evidence inputs fail closed to `unavailable`.
- Evidence Readiness counts only Portfolio Cases and exposes ready count, total count and ratio.
- Empty denominators display unavailable rather than `0%`; the KPI has a localized tooltip.
- All/Prioritized details show secondary Family Cases, capability, Evidence, separate financial semantic, Missing Evidence and limitations.
- Excess, Slow/Dead and Blocked/Quality financial values remain separate and are not added.

## 6. Tests After Fixes

### New R0A targeted suite

```text
6/6 tests passed
144 assertions
0 Page Errors
0 unexpected Console Errors
```

Coverage includes all required Numeric cases, transactional header-only rejection, valid/mixed/all-invalid identity composition, real Unified navigation, filters, export, Evidence combinations, unions, segment behavior, KPI counts, empty denominator and secondary-family detail.

### Structured browser suite

```text
336/336 passed
0 failed
0 skipped
0 Page Errors
0 unexpected Console Errors
1 expected forced rollback diagnostic
```

This includes Dataset Builder, Numeric Boundary, NUM-CAL, Recovery Engine, import/rollback, Data Quality, export, IR-01 regression and migrated application self-tests.

### Static contracts and syntax

```text
IR-01 Static Contract: PASS, 39 checks
NUM-CAL-MIG-01 Static Contract: PASS, 39 checks
JavaScript syntax: PASS, 13 changed files checked
git diff --check: PASS
```

### Product smokes

```text
IR-01 Product Smoke: PASS
PKG-02 Product Smoke: PASS
```

IR-01 passed under `file://` at 1440px, 1024px and 390px, in German/English and light/dark presentation, with all segments and export. PKG-02 passed Sample loading, upload modal, Inventory export, navigation and Settings. Both reported zero Page, Console, failed-request and external-network errors.

## 7. Acceptance Gates

```text
R0A_SCOPE_GATE: PASS
R0A_PREFLIGHT_GATE: PASS
R0A_RED_REGRESSION_GATE: PASS
R0A_NUMERIC_SAFETY_GATE: PASS
R0A_ZERO_ROW_TRANSACTION_GATE: PASS
R0A_IDENTITY_CONTAINMENT_GATE: PASS
R0A_EVIDENCE_AGGREGATION_GATE: PASS
R0A_TARGETED_TEST_GATE: PASS
R0A_BROWSER_REGRESSION_GATE: PASS
R0A_PRODUCT_SMOKE_GATE: PASS
R0A_SOURCE_PRESERVATION_GATE: PASS
R0A_VERIFICATION_GATE: PASS
```

## 8. Known Remaining Findings

`REL-001` remains open by scope. The following release-integrity checks still report only the audited missing IR payload references:

```text
scripts/verify-sha256-manifest.cjs: PKG_RUNTIME_REFERENCE_MISSING
tests/pkg-02-manifest-tools.cjs: PKG_RUNTIME_REFERENCE_MISSING
```

The missing paths are the seven `js/inventory-risks/` modules plus `js/application/inventory-risk-page-view.js` and `js/application/inventory-risk-page-controller.js`. `SHA256SUMS.txt` was not changed.

Seven older Product Smokes still exit with code 1 because they wait for the removed DOM selector `[data-process="excess-stock"]`. All seven were rerun after R0A and had no Page or Console error:

```text
tests/ch-ex-01a-product-smoke.cjs
tests/ex-ux-01-2-product-smoke.cjs
tests/ex-ux-01-3-product-smoke.cjs
tests/ex-ux-01-3-1-product-smoke.cjs
tests/ex-ux-01-4-product-smoke.cjs
tests/ex-ux-01-5-product-smoke.cjs
tests/ex-ux-01-6-product-smoke.cjs
```

These are `TEST-001` and were not modified under R0A. Firefox and WebKit remain unverified because their browser binaries are not available in the existing environment.

## 9. Files Changed or Created by R0A

### Product/runtime files changed

```text
app.js
styles.css
js/core/value-utils.js
js/data/dataset-builder.js
js/recovery/recovery-engine.js
js/inventory-risks/inventory-risk-case-contract.js
js/inventory-risks/excess-risk-adapter.js
js/inventory-risks/slow-dead-risk-adapter.js
js/inventory-risks/blocked-quality-risk-adapter.js
js/inventory-risks/inventory-risk-portfolio-service.js
js/inventory-risks/inventory-risk-page-model.js
js/application/inventory-risk-page-view.js
```

### Test files changed or created

```text
tests/tests.html
tests/r0a-regression.test.js
tests/r0a-targeted.html
tests/run-r0a-targeted.cjs
```

### Verification file created

```text
R0A_IR_DATA_NUMERIC_SAFETY_VERIFICATION.md
```

No accepted PKG/PRE-IR payload, artifact, sample data, prototype script graph, audit document or manifest was changed.

## 10. Final Git and Source-Preservation State

After this report was added, the expected final expanded status is 38 modified tracked files plus 226 untracked files. The increase over the preflight state consists only of the three new R0A test files and this Verification file. No file is staged.

The protected hashes remained:

```text
OBSOLIQ_CODE_HEALTH_AUDIT.md  ca186a51d52af599a398b8522819cd398de19f95afd5f5b139b883d6c3873550
prototype.html                 6e75bacfddb7ba0f3a7d88f62f0378f810dbf5f14f72f1721183983fa14e4862
SHA256SUMS.txt                 a0864590580a6ba6f6e152e6c1bb5049fca4609de656b7586ddfe18d71f80dc2
```

## 11. Status and Release Decision

```text
NUM_001_STATUS: FIXED
DATA_001_STATUS: FIXED
BUG_001_STATUS: FIXED
BUG_002_STATUS: FIXED
REL_001_STATUS: OPEN_BY_SCOPE

PRODUCT_RELEASE_GATE: HOLD
AUTHORIZED_RELEASE: NO
AUTHORIZED_GIT_ADD: NO
AUTHORIZED_COMMIT: NO
NEXT_RECOMMENDED_SCOPE: R0B_RELEASE_INTEGRITY_CLOSURE
```

R0A closes the four authorized product-safety findings. It is not a release approval and does not claim full IR-01 package integrity.
