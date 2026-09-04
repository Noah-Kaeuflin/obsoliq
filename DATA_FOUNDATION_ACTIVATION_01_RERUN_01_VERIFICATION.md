# DATA-FOUNDATION-ACTIVATION-01-RERUN-01 Verification

## Executive Summary

This work block activates one deterministic linked synthetic demo across Inventory Snapshot, Material Master and Consumption History. All three sources enter through existing productive parsing, Mapping, Input Trust, Builder, Package Import, Registry and Runtime boundaries. No Package, Historical Metric, Slow/Dead Case or Evidence Readiness value is injected directly.

The implementation preserves the byte-identical compatibility `sample-data.js`, existing Recovery calculations, Data Quality rules, Slow/Dead policy and thresholds, readiness formula, Package schemas, upload/export paths and direct local `file://` operation. This technical closure does not authorize Product Release.

## Repository Identity And Layering

| Layer | Commit | Tree | Parent |
| --- | --- | --- | --- |
| Original H0 | `b23bc461e731828bf64eeb7237ff001fd2af4371` | `6bdf07be52ae468c6bed3f138cb544f594fe94d1` | historical source baseline |
| Commit D | `32be72c7d0462848f5f83b29d0835cb40023dae8` | `f6e9d812fc19b05ec44274b42837e714829f30cd` | H0 |
| Commit E | `a872ce4046e94a0fd7d23ef78c91f9181fe794ca` | `0623d45e4d446a10c0f8016c0fd6bc4020b93af6` | Commit D |
| Commit F | established after report finalization | established after report finalization | Commit E |

Commit D isolates test-generated screenshots and packages `.gitattributes` as source reproducibility metadata. Commit E closes History/Slow-Dead producer contracts. Commit F is restricted to linked demo activation.

## Worktree And User-Change Protection

Implementation and verification run in an independent external clone without a remote, hardlinks or Git alternates. The original user-owned worktree remains untouched during candidate construction. Its captured complete baseline fingerprint is:

```text
entries: 1736
fingerprint: 3a8e462ce121b854f00c2a94f737e0fdef938c738dc281ea7ee54f66c244d217
index_sha256: b406caba56bfd0cd8ac2e9ef95a516d8e2910e16a0a72bfc9567223d618e5249
```

The original baseline includes 18 tracked modifications, 156 nonignored untracked files, 173 ignored files and 171 existing screenshots. None are Phase-3 inputs. Adoption is permitted only if exact preservation can be demonstrated after all gates pass.

## Authorized Phase-3 Paths

```text
app.js
prototype.html
demo-data.js
js/application/package-import-service.js
scripts/generate-linked-demo-data.cjs
scripts/sha256-manifest-lib.cjs
data/README.md
data/demo/inventory-snapshot.csv
data/demo/material-master.csv
data/demo/consumption-history.csv
data/demo/demo-expectations.json
data/templates/material-master-template.csv
data/templates/consumption-history-template.csv
tests/app-template.js
tests/tests.html
tests/data-foundation-activation-01-full-demo.test.js
tests/data-foundation-activation-01-product-smoke.cjs
tests/data-foundation-activation-01-static-contract.cjs
tests/ir-detail-ux-01-1-product-smoke.cjs
tests/trust-01-product-smoke.cjs
tests/ap-16-4d-3a-static-contract.cjs
tests/ap-16-4d-3b-static-contract.cjs
README.md
PRODUCT_SPEC.md
DATA_CONTRACT.md
ARCHITECTURE.md
CHANGELOG.md
DATA_FOUNDATION_ACTIVATION_01_RERUN_01_VERIFICATION.md
SHA256SUMS.txt
```

No Phase-3 change is authorized for `sample-data.js`, `styles.css`, Slow/Dead thresholds, Recovery formulas or direct Registry/Runtime injection.

## RED Evidence And Root Causes

The frozen RED contract `tests/data-foundation-activation-01-contract-red.cjs` initially failed because no linked full-demo descriptor existed. The RED log SHA-256 is:

```text
688f3478289b2b1805f7df8e95253b0c4733b71e29bc23ce985d6694196e2015
```

The missing capability was not a History producer defect. The accepted product had a compatibility Inventory sample, but no one-source-of-truth generator, linked Material Master, linked Consumption History, atomic three-source loader, demo-set provenance, user/demo isolation or complete-demo reconciliation.

During regression verification, one new browser assertion incorrectly compared total retained Package records with active Packages after user Inventory replacement. Existing Registry retention intentionally preserves an inactive prior Inventory record. The assertion was corrected to `activePackageCount`; productive Registry behavior was not changed.

The same regression exposed one genuine Package-boundary defect: a header-only Material Master or Consumption History source could pass mapping/build validation because zero rows produced zero missing-value diagnostics. `Package Import Service` now rejects empty sources during preparation and returns `EMPTY_DATASET_ROWS` from direct build/import before timestamp, Dataset identity or Registry mutation. Both template types are covered with exact before/after Registry equality.

Three integration expectations also required closure after the full demo became the production bootstrap:

- the final full-demo feedback used the detailed Demo label, while the shell icon contract intentionally recognizes only the stable `Data loaded` state; the shell now retains that stable state and records the detailed completion text in Analysis Status;
- two older Product Smokes implicitly depended on missing History at startup; the embedded History smoke now verifies real History evidence, while the TRUST smoke explicitly loads the Inventory-only compatibility sample in test mode so its `n. v.`/`n/a` contract remains a deliberate negative test;
- the newly visible embedded History chart exposed an intrinsic grid/SVG width of 829 px in a 702 px panel; the existing render path now constrains the History section and SVG to the owning decision surface without changing `styles.css`.

The two calibration static contracts continue to freeze the productive condition, Excess and Opportunity Score engines. Their exact accepted `app.js` allowlist was extended only with the reviewed DFA01 orchestration hash `765188f14b773dcadd4293fe0cdcf5a627dfcf298c779cfff552c4c3eb754764`.

## Implementation

### Deterministic Generator

`scripts/generate-linked-demo-data.cjs` reads the existing Inventory compatibility sample and deterministically emits:

- browser-compatible `demo-data.js`;
- three physically separate CSV inputs;
- an independent machine-readable expectation catalog;
- two exact header-only structural templates.

Repeated generation is byte-identical. Outputs are UTF-8 without BOM and use LF line endings. Raw input contains no Risk classification, Slow/Dead result, Readiness result, Historical Metric or hardcoded Case object.

### Productive Full-Demo Transaction

The Sample data action now performs this chain:

```text
transaction snapshot
-> productive Inventory loader
-> productive Material Master Package Import Service
-> productive Consumption History Package Import Service
-> Historical Runtime Coordinator
-> Slow/Dead Runtime
-> existing presentation adapters
```

Any phase failure restores Dataset, Registry, Package sequence, active Package ownership, Historical Runtime, Slow/Dead Runtime, Risk caches and UI state. Fault points after Inventory, Material Master and Consumption History were verified with exact before/after hashes.

The shell exposes `Data loaded` as the persistent post-transaction status and keeps the more specific full-demo completion in Analysis Status. Available Historical Evidence is container-bound inside the existing Excess decision surface; no stylesheet, analytical model or decision logic changed.

### Isolation

Every demo Package carries `sourceType = synthetic_demo`, `classification = synthetic`, shared `demo_set_id`, package-specific source ID, generator version, analysis date, UTC boundary and complete content hashes. User Inventory never inherits demo Material Master or demo Consumption History. Repeating the demo resets demo-owned state instead of accumulating active Packages. Loading demo data over user Inventory requires confirmation.

## Demo Source Inventory

| Artifact | Rows | Classification | SHA-256 |
| --- | ---: | --- | --- |
| `data/demo/inventory-snapshot.csv` | 102 | synthetic | `3d0aa3752175a928b393c65a1d378467dea22b0c5315d99ef0a4ea9cdda2943a` |
| `data/demo/material-master.csv` | 98 | synthetic | `87be29faeece778a23865be59a861603cb97ff38f42f8a82f864104aacc2a681` |
| `data/demo/consumption-history.csv` | 2,260 | synthetic | `7c43894f42f9dc1f7ca7bcc0a7b4ecc1a25d9f7ce4c12beee1154db1de2f427c` |
| `data/demo/demo-expectations.json` | 98 controlled entities | synthetic | `8071a70f329757120aa5244b8993a6db078ac6c99c46aef31eab7c29e5731c14` |
| `data/templates/material-master-template.csv` | 0 | structural-template | `3a09f5f699f45756913be234a5ab30d88868d0cf2d53cdc4e028766a8f96f7d3` |
| `data/templates/consumption-history-template.csv` | 0 | structural-template | `4fe4ef9127116ca642999473bf706b09f00b1b46a2c2ef122f39030cd3656308` |

```text
demo_set_id: OBSOLIQ-SYNTHETIC-DEMO-2026-08
generator_version: linked-demo-generator-v1
analysis_as_of: 2026-08-31
timezone: UTC
customer_data: false
personal_data: false
human_expert_validated: false
```

## Reconciliation

### Package And Relationship State

The first successful full-demo load produces exactly three active Packages with deterministic IDs `PKG-000001`, `PKG-000002` and `PKG-000003`. Inventory owns the explicit analysis date. Material Master enriches missing context under the existing `fill_missing_only` contract. Historical Runtime is `available` and produces 97 entity metrics from accepted History relationships; the intentionally invalid Inventory identity remains excluded.

All 98 controlled entities are reconciled individually against the oracle for Material Master match, relationship type, unit status, observed History coverage, rolling consumption, last-consumption distance, condition, evidence strength, Recovery Case eligibility, Action eligibility and missing evidence.

### Controlled Cohorts

| Cohort | Count | Expected condition contribution |
| --- | ---: | --- |
| stable | 71 | no case |
| declining | 5 | no case |
| intermittent | 5 | `intermittent_expected` |
| slow | 4 | `slow_moving_candidate` |
| dead | 2 | `dead_stock_candidate` |
| nonmoving | 3 | `non_moving_candidate` |
| new 6/9/11 months | 3 | insufficient evidence |
| no history | 1 | insufficient evidence |
| true zero | 1 | insufficient evidence, distinct from missing |
| boundary 12/13 months | 2 | contract boundary evidence |
| reversal | 1 | signed movement evidence retained |

Controlled expected conditions reconcile to 79 no-case entities, 5 intermittent, 4 slow, 2 dead, 3 nonmoving and 5 insufficient-evidence entities. The complete product Runtime also contains the preserved invalid `---` Inventory row as a sixth insufficient-evidence Case, outside the 98 controlled entities.

The resulting Slow/Dead Runtime is `limited` with 20 Cases. The Case IDs are deterministic `SLOW-DEAD::<dataset-id>::<inventory-entity-key>` projections for the 19 controlled non-no-case entities plus the contained invalid identity row.

### Evidence Readiness

The existing readiness formula is unchanged. Full-demo Runtime reconciliation yields:

```text
readiness_numerator: 6
readiness_denominator: 43
readiness_ratio: 0.13953488372093023
```

The values are calculated from current portfolio Cases and accepted evidence; they are not source fields or UI defaults.

## Rollback Evidence

Focused Product Smoke fault injection covers failure after Inventory, after Material Master and after Consumption History. Each failure returns `error` and restores the exact canonical runtime hash:

```text
before: c6c731ac95350fd920f1380b3402d726489df9f28973e1929fe9807d913edb05
after:  c6c731ac95350fd920f1380b3402d726489df9f28973e1929fe9807d913edb05
```

The broader TRUST transaction suite remains green across its existing ten fault paths and canonicalizes expected generation epochs while rejecting state drift.

## Tests Added

- `tests/data-foundation-activation-01-full-demo.test.js`: three structured browser cases for productive activation plus UI/template localization, entity reconciliation, and repeat/rollback/isolation.
- `tests/data-foundation-activation-01-product-smoke.cjs`: direct `file://` Product Smoke for Package state, Runtime outputs, readiness, repeated load, rollback and browser containment.
- `tests/data-foundation-activation-01-static-contract.cjs`: deterministic generator, byte parity, provenance, source safety, script order and no-bypass contract.
- `tests/ir-detail-ux-01-1-product-smoke.cjs`: startup expectation reconciled with the productive full-demo History state.
- `tests/trust-01-product-smoke.cjs`: missing-History truthfulness now starts from an explicit Inventory-only test fixture rather than an obsolete bootstrap assumption.
- `tests/ap-16-4d-3a-static-contract.cjs` and `tests/ap-16-4d-3b-static-contract.cjs`: exact DFA01 `app.js` hash accepted while all analytical engine hashes remain frozen.

The original Phase-3 RED contract is unchanged and becomes green only through the implementation.

## Verification Matrix

The uninterrupted Phase-3 pre-commit matrix ran all 38 dynamically discovered runners against one unchanged candidate:

| Gate | Current result |
| --- | ---: |
| Browser tests | 375/375 PASS |
| Product Smokes | 22/22 PASS |
| Static assertions | 1,846/1,846 PASS |
| R0A targeted | 6/6 PASS |
| TRUST targeted | 9/9 PASS, 112 assertions |
| Package checks | 111/111 PASS |
| R0B.1 EOL/SHA checks | 2,096/2,096 PASS |
| Product JavaScript syntax | 57/57 PASS |
| Manifest | 297/297 paths, 294 text and 3 binary |
| Provenance | 17/17 classified |
| Runtime references | 55/55 contained |
| Standard screenshots | 82/82 external only |
| Optional screenshot writer | 1/1 external only, 169,012 bytes |

```text
PAGE_ERRORS: 0
UNEXPECTED_CONSOLE_ERRORS: 0
UNEXPECTED_EXTERNAL_REQUESTS: 0
FAILED_REQUESTS: 0
SECRET_FINDINGS: 0
REPOSITORY_MUTATED_BY_TESTS: NO
```

The focused full-demo Product Smoke evidence SHA-256 is `3cf34c6ee2a555931aaf59e630c7848d4d4a756633752d0b60d0c75da8145be9`. The original user worktree still has exactly 1,736 fingerprint entries and fingerprint `3a8e462ce121b854f00c2a94f737e0fdef938c738dc281ea7ee54f66c244d217`.

Fresh-commit identity, deterministic two-build Bundle hashes and the two clean extraction matrices are immutable post-commit gates. Their evidence is recorded in the external final gate record because a commit cannot contain its own SHA without changing that SHA. No historical PASS is inherited.

## Security And Privacy Boundary

The demo and templates contain no customer, supplier, company, personal or secret data. Product Runtime remains local and file-based, makes no external request and stores no imported business rows outside the browser session. Package provenance and secret scans are fail-closed. This work block is not a complete enterprise security, performance or production-readiness assessment.

## Release Boundary

```text
PRODUCT_RELEASE_GATE: HOLD
AUTHORIZED_RELEASE: NO
PUSH_PERFORMED: NO
TAG_CREATED: NO
MERGE_PERFORMED: NO
DEPLOYMENT_PERFORMED: NO
PUBLICATION_PERFORMED: NO
```

The next recommended product scope after full technical acceptance is `RECOVERY-LOOP-01 - Excess-to-PO Recovery`.
