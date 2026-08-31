# TRUST-01 Verification

## 1. Executive Summary

TRUST-01 found and corrected four real trust gaps in the current local ObsoliQ runtime: permissive physical-source fallback, incomplete generic Package Mapping signature enforcement, mixed-locale row-by-row interpretation and unavailable Slow / Dead evidence presented as numeric zero. The accepted architecture was retained and hardened in place.

Current technical source acceptance is `PASS`. Overall `TRUST_01_GATE` is `BLOCKED` because the inherited worktree contains overlapping user-owned changes in TRUST target paths; a clean TRUST-only local commit and immutable Fresh-Commit/Fresh-Bundle reconstruction cannot be produced without staging unrelated work. No stage, commit, push, tag, merge, deployment or publication was performed. Product Release remains `HOLD`.

## 2. Repository Identity

- Repository: `C:\Users\Noah\Documents\Codex\2026-06-24\da-s\outputs\inventory-recovery-mvp`
- OS: Windows NT `10.0.26200.0`
- PowerShell: `7.6.4`
- Node: `v24.19.0`
- npm: unavailable in the bundled runtime
- Git: `2.53.0.windows.3`
- Chromium: `151.0.7922.34`
- Branch: `feature/ir-01-unified-inventory-risks`
- Baseline HEAD: `96b5658c740d3d00d6e389910454a0703df828a6`
- Baseline tree: `d6de0c0a4909e92c43bf1fa450981c7e67f218c4`
- Remote: none
- Tags: `baseline-2026-08-21`

## 3. Baseline And Preflight

The required Git identity, history, status, tracked/untracked delta, tags and remotes were captured before TRUST edits. The initial worktree contained 20 modified tracked paths and 174 untracked paths. These changes were treated as user-owned and preserved. `AGENTS.md` was not present; every other required contract and verification report named in the assignment was read.

Historical counts were treated only as reference. The baseline browser suite was re-run before implementation and returned `363/363 PASS`. All current counts below come from new executions against the resulting worktree.

## 4. Starting HEAD And Tree

```text
HEAD  96b5658c740d3d00d6e389910454a0703df828a6
TREE  d6de0c0a4909e92c43bf1fa450981c7e67f218c4
```

## 5. Worktree Boundary

No destructive Git operation was used. No existing change or untracked review artifact was removed. Several TRUST target paths, especially `app.js`, documentation and existing tests, already contained overlapping user changes. The changes could be preserved during implementation, but they cannot be isolated into the assignment's single allowed commit without staging unrelated content. Therefore `LOCAL_COMMIT_GATE`, Fresh-Commit and Fresh-Bundle gates are `BLOCKED`.

## 6. TRUST-01 Changed Paths

Production and orchestration:

- `app.js`
- `js/application/input-trust-service.js`
- `js/application/inventory-risk-page-controller.js`
- `js/application/inventory-risk-page-view.js`
- `js/application/package-import-service.js`
- `js/data/consumption-history-builder.js`
- `js/data/input-normalization-engine.js`
- `js/data/material-master-builder.js`
- `js/data/source-model.js`
- `js/inventory-risks/inventory-risk-page-model.js`
- `js/mapping/mapping-engine.js`

Tests and package governance:

- `tests/ap-16-4d-3a-static-contract.cjs`
- `tests/ap-16-4d-3b-static-contract.cjs`
- `tests/confirmation-invalidation-export-ui-closure.test.js`
- `tests/package-import.test.js`
- `tests/tests.html`
- `tests/run-trust-01-targeted.cjs`
- `tests/trust-01-missing-zero-contract.test.js`
- `tests/trust-01-product-smoke.cjs`
- `tests/trust-01-source-bound-input-trust.test.js`
- `tests/trust-01-static-contract.cjs`
- `tests/trust-01-targeted.html`
- `tests/trust-01-transaction-rollback.test.js`
- `scripts/sha256-manifest-lib.cjs`
- `SHA256SUMS.txt`

Documentation:

- `README.md`
- `PRODUCT_SPEC.md`
- `DATA_CONTRACT.md`
- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `TRUST_01_VERIFICATION.md`

## 7. Root Causes

1. Automatic Mapping did not always retain duplicate-aware `sourceKey`; invalid explicit source indexes could fall back to matching header text, and some Builder/Relationship paths had parallel permissive identity helpers.
2. Generic Material Master/Consumption History package records did not enforce and store Builder-equivalent Mapping signatures consistently; History semantic mismatch logic did not reject a missing Builder signature.
3. The numeric profiler could normalize conflicting German and English locale forms row by row, making a mixed source look trusted without an explicit source-bound override.
4. Unified Risk presentation rendered unavailable Slow / Dead History as a count of zero, and a completed available zero-case Runtime did not distinguish genuine zero financial exposure from missing exposure.

## 8. Implemented Corrections

- Centralized exact Physical Source Identity in `source-model.js`: strict numeric integer `sourceIndex >= 0`, exact metadata index, exact duplicate-aware `sourceKey`, exact matching `sourceColumn`.
- Added `sourceKey` to automatic Mapping and Mapping signatures; invalid identity now blocks Mapping validation and Apply.
- Removed header-only Input Trust/normalization fallback and package-builder/app parallel identity helpers.
- Added generic Package Mapping signature equality before Registry commit and stored the exact Package Mapping signature.
- Made History semantic signature comparison fail closed even if the Builder signature is absent.
- Blocked conflicting mixed-locale numeric evidence unless an explicit current-source locale override exists.
- Propagated Unified Risk family availability; unavailable Slow / Dead shows `n. v.` / `n/a` and the existing History import action, while completed available/limited zero cases retain numeric zero.

## 9. Contract-To-Test Matrix

| ID | Contract evidence | Result |
| --- | --- | --- |
| T01 | Valid Inventory commit and signature equality | PASS |
| T02 | Mapping signature mismatch rollback | PASS |
| T03 | Policy signature mismatch rollback | PASS |
| T04 | Duplicate header and layout drift identity | PASS |
| T05 | Confirm, commit, reopen, remap, invalidate, reconfirm | PASS |
| T06 | Strict non-coercing sourceIndex | PASS |
| T07 | Locale/scale/currency/invalid/overflow matrix | PASS |
| T08 | Raw Source immutability | PASS |
| T09 | Header-only rollback | PASS |
| T10 | Material Master identity/signature | PASS |
| T11 | Atomic Material Master enrichment rollback | PASS |
| T12 | Consumption History source policy | PASS |
| T13 | History semantic signature mismatch | PASS |
| T14 | Registry ownership/revision/ID sequence | PASS |
| T15 | Historical Runtime currentness | PASS |
| T16 | Stale completion rejection | PASS |
| T17 | Missing History unavailable | PASS |
| T18 | True quantity/count/exposure zero | PASS |
| T19 | Missing versus zero financial exposure | PASS |
| T20 | Unified segment unavailable versus zero | PASS |
| T21 | German/English presentation | PASS |
| T22 | Light/Dark presentation | PASS |
| T23 | Direct `file://` offline execution | PASS |
| T24 | Browser storage and no external requests | PASS |
| T25 | Fresh immutable candidate/bundle reconstruction | BLOCKED |

## 10. Physical Source Identity Evidence

Focused tests cover identical visible headers with different values, unique and duplicate reordering, canonical remapping, string/negative/fractional index, wrong key, same header/different physical source and duplicate-count drift. Apply and commit reject stale identity; the selected second duplicate supplies its own value and never loses to array order.

## 11. Mapping And Policy Signature Evidence

Focused and full-suite assertions prove equality among Builder, Dataset Meta, Package and recomputed Mapping signatures. Effective normalization proposals plus explicit overrides preserve `false`, `0` and `none`; Preview and Apply share the current source-bound effective policy. Tampering Mapping, Normalization Policy or History Semantic signatures returns deterministic errors before Registry identity allocation.

## 12. Confirmation Invalidation Evidence

The existing confirmation lifecycle test was strengthened to require Apply blocking after remapping to another duplicate physical source. Top-level and field-level confirmation metadata is cleared with `source_identity_changed`; the unchanged reopen path keeps signatures; exactly one new revision is possible only after fresh current-source confirmation.

## 13. Package-Specific Evidence

- Inventory rejects zero-row sources before Dataset/Package identity use and remains the only financial KPI/Recovery/Data Quality owner.
- Material Master requires Material ID, preserves leading zeroes, uses exact identity and remains fill-missing-only with protected Inventory fields intact.
- Consumption History requires quantity plus date/period evidence, preserves zero and negative movement, enforces source-bound semantic policy and remains analytically isolated from Inventory Recovery, Actions, Data Quality and Pilot Review.

## 14. Rollback State Hashes

Ten focused fault paths produced the same deterministic normalized authoritative state hash before and after rollback:

```text
b8b45eb54830dfa4 -> b8b45eb54830dfa4
```

Covered faults: Builder error, Mapping signature mismatch, Policy signature mismatch, Dataset-ID mismatch, Registry commit error, post-commit render error, Package finalization error, header-only Inventory, Material Master post-Package enrichment error and Consumption History post-register error. The test hash includes Raw Source, source metadata, normalized/analytical rows, Dataset Meta, mappings/policies, Registry, filters, Actions, Data Quality, Issue Ledger, Pilot Reviews, Case IDs and export scope. Volatile timestamps are normalized. Historical generation is reported separately and advances from 2 to 3 on restored transaction paths by design; it never moves backwards and prevents stale completion.

Two independent focused runs produced the identical suite signature:

```text
1ae6fb10a34a2459986ba471b7d2bb9445afccb22538a744d521753c0ab1c1f8
```

## 15. Missing-Versus-Zero Evidence

The default sample has no accepted Consumption History. Its Slow / Dead family status is `unavailable`; German renders `n. v.`, English renders `n/a`, and the History import action remains available. Financial exposure is `null`. A synthetic current `available` Runtime with zero cases renders genuine count and exposure `0`.

## 16. Slow / Dead Runtime Matrix

| Runtime | Accepted presentation |
| --- | --- |
| `not_calculated` | unavailable plus reason |
| `calculating` | calculating, never zero |
| `unavailable` | `n. v.` / `n/a`, reason and import action |
| `error` | unavailable error state, never zero |
| `available`, zero | genuine `0` |
| `limited`, zero | genuine `0` plus limitations |
| `available` / `limited`, cases | exact current values |

## 17. Browser, Responsive, Language And Theme Evidence

The full structured suite passed `372/372`. The TRUST Product Smoke ran in fresh Chromium processes for `1440x900`, `1280x800`, `1024x768`, `768x1024` and `390x844`; it checked DE/EN, Light/Dark, unavailable labels and CTA, leading-zero identifier handling and body overflow. Page errors, unexpected console errors and unexpected external requests were zero.

## 18. Manifest And Provenance

The canonical PKG-02 tools verified the final manifest, provenance, path, case-collision, symlink, regular-file, binary, Runtime-reference and SHA contracts:

```text
CURRENT_PACKAGE_CHECKS: 96/96
CURRENT_SHA_ENTRIES: 278/278
RUNTIME_REFERENCES: 54/54
DATA_PROVENANCE_RECORDS: 10/10
MANIFEST_ERRORS: 0
RUNTIME_UNTRACKED_FILES: 0
SECRET_FINDINGS: 0
PRIVATE_DATA_FINDINGS: 0
```

New TRUST files are code, tests or documentation and contain no business fixture data. Existing manifested data remains classified `synthetic` or `structural-template`.

## 19. Secret, Privacy And Client Security

Static contracts and Product Smoke confirm no productive persistence of imported rows in Local Storage, Session Storage, IndexedDB, Cache Storage or Service Worker state; no productive `fetch`/XHR path; no external runtime asset dependency; no business-row logging; HTML escaping; spreadsheet formula neutralization; prototype-pollution containment; and no external request during direct-file execution. Manifest security scans found no secrets or private/customer data. All ten manifested data/fixture records are classified `synthetic` or `structural-template`.

Scope is limited to Package and client-data boundaries. XLSX/ZIP/inflate/memory resource limits remain `SEC-001: OPEN_OUTSIDE_TRUST_SCOPE`.

## 20. Commands Executed

Key commands executed with the bundled Node and Git runtimes:

```text
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git rev-parse HEAD^{tree}
git log -5 --oneline --decorate
git status --porcelain=v2 --untracked-files=all
git diff --stat
git diff --name-status
git diff --cached --name-status
git tag --list
git remote -v
node tests/run-trust-01-targeted.cjs
node tests/run-browser-suite.cjs
node tests/run-r0a-targeted.cjs
node tests/*product-smoke.cjs
node tests/*static-contract.cjs
node --check <each productive JavaScript file>
node tests/pkg-02-manifest-tools.cjs
node tests/r0b-1-eol-manifest-reproducibility.test.cjs
```

The TRUST Product Smoke was executed 25 times in separate processes. No retry, skip, only-filter or timeout relaxation was used.

## 21. Current Test Results

```text
CURRENT_BROWSER_TESTS: 372/372
CURRENT_PRODUCT_SMOKES: 19/19
CURRENT_STATIC_ASSERTIONS: 1673/1673
PRODUCTIVE_JS_SYNTAX: 56/56
R0A_TARGETED: 6/6
TARGETED_TRUST_01: 9/9 tests, 112 assertions
TARGETED_TRUST_01_RUNS: 25/25
PAGE_ERRORS: 0
UNEXPECTED_CONSOLE_ERRORS: 0
UNEXPECTED_EXTERNAL_REQUESTS: 0
```

## 22. Fresh-Commit Evidence

`BLOCKED`. The inherited worktree contains overlapping, user-owned changes in TRUST target paths. A TRUST-only staging allowlist cannot isolate line-level changes without staging unrelated content. No file was staged and no local commit was created.

## 23. Fresh-Bundle Evidence

`BLOCKED`. The assignment requires the Bundle to be built from an immutable fresh TRUST candidate commit. Because the Fresh-Commit gate is blocked, a conforming Fresh-Bundle reconstruction cannot be claimed. Current-worktree Package and extraction tooling is still executed as technical integrity evidence but does not substitute for this gate.

## 24. Remaining Boundaries

- `SEC-001`: XLSX/ZIP/inflate/memory resource limits remain open outside TRUST-01.
- `PERF-001`: synchronous large historical calculation remains open.
- `OBS-001`: no production observability architecture exists.
- `COMPAT-001`: broader browser/platform certification remains open.
- No authentication, authorization, database, SAP integration, persistent workflow, multi-user controls, enterprise security assessment or production deployment exists.
- Input Trust tests use synthetic data and do not constitute human pilot validation.

## 25. Final Gate Record

The authoritative final record is updated after final Manifest and SHA verification. Product Release remains `HOLD` regardless of technical source acceptance.

```text
TRUST_01_SCOPE_GATE: PASS
TRUST_01_PREFLIGHT_GATE: PASS
TRUST_01_PHYSICAL_SOURCE_IDENTITY_GATE: PASS
TRUST_01_MAPPING_SIGNATURE_GATE: PASS
TRUST_01_POLICY_SIGNATURE_GATE: PASS
TRUST_01_STALE_CONFIRMATION_GATE: PASS
TRUST_01_FAIL_CLOSED_NUMERIC_GATE: PASS
TRUST_01_PACKAGE_ISOLATION_GATE: PASS
TRUST_01_TRANSACTION_ROLLBACK_GATE: PASS
TRUST_01_HISTORY_CURRENTNESS_GATE: PASS
TRUST_01_MISSING_ZERO_GATE: PASS
TRUST_01_BROWSER_STORAGE_GATE: PASS
TRUST_01_CLIENT_SECURITY_GATE: PASS
TRUST_01_RUNTIME_CONTAINMENT_GATE: PASS
TRUST_01_DATA_PROVENANCE_GATE: PASS
TRUST_01_LICENSE_ASSET_GATE: PASS
TRUST_01_PRIVATE_DATA_SECRET_GATE: PASS
TRUST_01_MANIFEST_GATE: PASS
TRUST_01_PRODUCT_SMOKE_GATE: PASS
TRUST_01_STATIC_CONTRACT_GATE: PASS
TRUST_01_FULL_BROWSER_GATE: PASS
TRUST_01_FRESH_COMMIT_GATE: BLOCKED
TRUST_01_FRESH_BUNDLE_GATE: BLOCKED
TRUST_01_DOCUMENTATION_GATE: PASS
TRUST_01_NO_RELEASE_ACTION_GATE: PASS

TRUST_01_TECHNICAL_SOURCE_ACCEPTANCE: PASS
TRUST_01_GATE: BLOCKED

TRUST_01_CANDIDATE_COMMIT: NONE
TRUST_01_CANDIDATE_TREE: NONE
TRUST_01_REVIEW_MODE: FRESH_CANDIDATE_TECHNICAL_REVIEW
TRUST_01_SECURITY_SCOPE: PACKAGE_AND_CLIENT_DATA_BOUNDARIES_ONLY

CURRENT_BROWSER_TESTS: 372/372
CURRENT_PRODUCT_SMOKES: 19/19
CURRENT_STATIC_ASSERTIONS: 1673/1673
CURRENT_PACKAGE_CHECKS: 96/96
CURRENT_SHA_ENTRIES: 278/278
TARGETED_TRUST_01_RUNS: 25/25

PAGE_ERRORS: 0
UNEXPECTED_CONSOLE_ERRORS: 0
UNEXPECTED_EXTERNAL_REQUESTS: 0
RUNTIME_UNTRACKED_FILES: 0
MANIFEST_ERRORS: 0
SECRET_FINDINGS: 0
PRIVATE_DATA_FINDINGS: 0

SEC_001_STATUS: OPEN
PERF_001_STATUS: OPEN
OBS_001_STATUS: OPEN
COMPAT_001_STATUS: OPEN

PRODUCT_RELEASE_GATE: HOLD
AUTHORIZED_RELEASE: NO
PUSH_PERFORMED: NO
TAG_CREATED: NO
MERGE_PERFORMED: NO
DEPLOYMENT_PERFORMED: NO
PUBLICATION_PERFORMED: NO

NEXT_RECOMMENDED_PRODUCT_SCOPE:
RECOVERY-LOOP-01 — Excess-to-PO Recovery

NEXT_AUTHORIZED_SCOPE:
REVIEW_REQUIRED
```
