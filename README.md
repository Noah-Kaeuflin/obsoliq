# ObsoliQ Inventory Recovery Cockpit

ObsoliQ is a local, browser-based Inventory Recovery and Decision Intelligence MVP for SAP-based manufacturing companies. It helps teams inspect inventory snapshots, classify recovery potential, review data quality, explain Excess cases and prepare action-oriented exports without sending data to a server.

The current project is prepared for local Git version control and later publication as a private GitHub repository.

## Product Summary

The MVP supports a local workflow from SAP/Excel-style inventory data to recovery KPIs, Data Quality checks, remediation review, a Unified Inventory Risks workbench and session-only Pilot Review evidence.

ObsoliQ is not a production SaaS, not a SAP live integration and not a predictive analytics system.

## Current Scope

- Inventory Snapshot
- Material Master
- Consumption History Package import
- package-specific Consumption History Mapping
- package-scoped Consumption History validation and diagnostics
- deterministic Consumption History temporal, movement and unit interpretation
- source-bound Consumption History interpretation policies
- package-scoped History Readiness
- Inventory-to-Consumption-History relationship
- controlled historical inventory metrics with provenance
- lifecycle-triggered Historical Metrics Runtime orchestration
- presentation-independent Historical Data Foundation status
- Slow / Dead Condition & Evidence Engine
- entity-authoritative Slow / Dead Recovery Case Candidates
- explicit session-only Slow / Dead Recovery Case Runtime
- visible Slow / Dead Recovery Case Workbench
- entity-exact Slow / Dead navigation to Inventory and linked Actions
- nullable Slow / Dead Inventory Exposure with unavailable-state presentation
- dedicated Slow / Dead Recovery Case export
- one visible Unified Inventory Risks route with separate Excess & Demand, Slow / Dead and Blocked / Quality Family Cases
- entity-deduplicated Portfolio Cases with preserved Primary and Secondary Family evidence
- conservative Portfolio Evidence aggregation and separated family-specific financial semantics
- limited Blocked / Quality exposure and evidence presentation without invented recovery quantities or values
- Input Trust
- Data Quality and Remediation
- Recovery calculation
- Actions
- Excess Intelligence
- Excess Cause Hypothesis based on existing rule evidence
- versioned Excess Decision Readiness
- evidence-bound Excess Action Options
- null-safe Gross-to-Net Value Narrative
- Historical Unit Context for Excess quantities and monthly buckets
- session-only Excess Work Context
- session-only Pilot Review
- file-safe semantic icon system for navigation, actions, KPIs, Inventory Risks, Data Quality and Data Foundation
- versioned Slow / Dead synthetic Calibration Contract, Safety Fixtures and reproducible Synthetic Contract Agreement baseline
- versioned synthetic Calibration Metrics plus 17-scenario OFAT threshold-sensitivity artifacts without Policy recommendation or activation

Current cross-package relationships are limited to Inventory-to-Material-Master Context Enrichment and Inventory-to-Consumption-History Derived Historical Metrics. Arbitrary joins and a standalone Purchase Orders import are not available.

## Quick Start

1. Open `prototype.html` in a browser.
2. Use the built-in sample data or upload a supported local file.
3. No server, database or login is required for the current MVP.

Supported local upload formats include `.xlsx`, `.csv` and `.tsv`. Uploaded data stays in the browser session.

## Local Icon System

The licensed ObsoliQ Icon Pack lives under `assets/icons/`. It contains 43 local Lucide-derived SVG symbols, including the `inventory-risks` portfolio icon and the semantic Indicators `prioritized-cases`, `owner-coverage` and `evidence-readiness`, plus the authoritative manifest, Sprite and Lucide ISC license. Runtime rendering uses `js/ui/icon-system.js` and the public `ObsoliQ.ui.iconSystem` API.

For reliable direct `file://` startup, the helper synchronously mounts a trusted inline copy of the Sprite once and renders only local fragment references such as `#oq-overview`. It performs no `fetch`, network request, CDN lookup or external SVG reference. Icon IDs and optional classes are allowlisted; visible translated labels remain separate from decorative SVG markup so language switching cannot remove icons.

Product icons use the shared 14/16/18 px size system, `currentColor`, a consistent Lucide outline and visible text wherever the control is not intentionally icon-only. Unified Risk KPI icons use a compact workspace-scoped contract instead of the global icon sizes: 30 px tiles with 17 px icons on desktop and laptop widths, reducing to 28/16 px below 620 px. Their label, value and meta typography scales with the same local contract, while all other product icons remain unchanged. A Chevron selects a case inside the current workspace, while Inventory and Actions workflow buttons use their actual destination icons. Small CSS transforms optically balance Lucide geometries without modifying their SVG paths. Icon-only controls retain an accessible name and title. The ObsoliQ Q remains the sole product signet.

## Excess Decision Detail

Standalone Excess cases and embedded Excess & Demand family details use one shared `excess-decision-surface`. Decision, Value Logic, History, Prioritization and Action Paths are accessible tabs with one visible panel at a time, roving keyboard focus and Arrow, Home and End navigation. The selected tab is presentation-only, remains stable while the same case rerenders and resets to Decision when the exact case changes.

The surface responds to its own available width through CSS container queries, so the detail composition remains usable inside the Unified Inventory Risks split pane as well as on the standalone Excess workspace. All displayed values, scores, evidence, readiness states and action options continue to come from the existing Excess projection; the tabs do not calculate or reclassify business data.

The embedded presentation uses the same complete component styling as the standalone workspace. Next Step and Decision Readiness occupy independent full-width rows, Score and Operational Context remain stacked until the surface is genuinely wide, Operational Context is a semantic definition grid, and unavailable Consumption History uses a precise local import action. These refinements are presentation-only and retain the existing single detail-scroll owner.

## Inventory Risks Workspace

The Unified Inventory Risks page uses a compact operational hierarchy: page header and segments, three always-visible filters, an optional Further Filters disclosure, grouped Portfolio and Financial Impact summaries, then the viewport-bound Risk Decision List and selected Case detail. Reset is disabled until a filter is active, and an active advanced filter keeps its disclosure open after rerender.

At desktop widths above `1240px`, Worklist and Detail are equal-height panes. The Worklist table and the selected Case detail each own exactly one internal vertical scroll; their outer panels remain clipped. At 1440 x 900 the workspace begins within the first 470 px and exposes at least six complete Worklist cases while Case header, statistics, tabs and Next Step remain simultaneously visible. Narrower layouts stack both panes and retain natural document scrolling.

Portfolio counts and the three financial semantics remain unchanged and separate. The compact Readiness pill in Next Step mirrors the existing Decision Readiness status; it does not calculate a new status. This workspace closure changes no Risk Case, score, value, evidence, filter, export, Registry or Package semantics.

## Tests

1. Open `tests/tests.html` in a browser.
2. Confirm that the structured test result reports zero failures.
3. Production startup through `prototype.html` does not execute tests.

The four Slow / Dead Calibration modules are analysis-only. They are intentionally absent from `prototype.html` and are loaded in fixed dependency order through `tests/test-helpers.js` when Calibration tests run.

JavaScript syntax can be checked locally with Node:

```powershell
Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

## Package Integrity

Run the portable package commands from the repository root:

```powershell
node scripts/generate-sha256-manifest.cjs
node scripts/verify-sha256-manifest.cjs
node scripts/build-pkg-02-review-bundle.cjs
```

To write the audit handoff outside the payload root, use an output path that does not already exist:

```powershell
node scripts/build-pkg-02-review-bundle.cjs --output ..\deliverables\pkg-02a\obsoliq-review-pkg-02a.zip
```

The package path set is an explicit allowlist in `scripts/sha256-manifest-lib.cjs`; the builder does not recursively pack the repository. The captured PKG-02A baseline and every later authorized addition or removal are declared separately. The canonical generator and verifier are the source of truth for the current path count; no acceptance gate relies on a manually maintained README count.

The secure builder:

- rejects absolute, drive-qualified, UNC, traversal, backslash-alias, duplicate and case-colliding paths
- checks every payload path component with `lstat`, rejects symlinks, junctions and non-regular files, and validates canonical real paths inside the payload root
- reads each source payload file once, hashes that buffer and writes the same buffer into a fresh immutable snapshot
- generates and verifies the internal manifest from snapshot bytes
- creates the ZIP only from verified snapshot files
- verifies exact ZIP contents and hashes, performs a fresh safe extraction, and repeats path, file-type, provenance and secret checks
- publishes the temporary ZIP only after all checks pass and computes the external ZIP checksum only after finalization
- refuses to overwrite an existing final ZIP or checksum

`SHA256SUMS.txt` covers the product, test/analysis bootstrap, Icon Pack, Calibration contracts, fixtures, reports, deterministic artifacts, package scripts and active documentation. The generated ZIP contains all manifest-listed files under one stable root plus exactly one internal manifest. Its companion `.sha256` file makes transport integrity verifiable against the supplied checksum, but does not authenticate the publisher without an independent signature or trust root.

## Current Safety And Release State

R0A closed the verified numeric, transaction, identity and evidence-aggregation defects. Derived financial values must be finite and non-negative; invalid, negative, overflow and non-finite derivations remain `null`/unavailable. Header-only Inventory uploads are rejected before commit and preserve the previous active Dataset, Registry, identity sequence and presentation state. Missing Inventory Entity identities are contained fail-closed, and mixed-family Evidence is aggregated conservatively.

Evidence Readiness is the number of readiness-capable, currently filtered Portfolio Cases divided by all currently filtered Portfolio Cases. The UI exposes numerator and denominator; an empty denominator is unavailable rather than `0%`.

R0B closes local Runtime, test, manifest and Git reproducibility only. At that historical boundary `TRUST-01` remained open. The current TRUST-01 technical result and its blocked Fresh-Commit/Fresh-Bundle gates are documented below; Product Release remains `HOLD`.

### Packaged data provenance

Every packaged CSV, JSON, sample-data source and fixture has a fail-closed provenance record. `synthetic` means generated or hand-authored fictitious test data. `structural-template` means metadata without real records. No packaged data artifact is currently classified as public customer data.

| Path | Classification | Provenance |
| --- | --- | --- |
| `artifacts/ap-16-4d-3b-metrics.json` | synthetic | Deterministic output from synthetic Slow/Dead calibration fixtures. |
| `artifacts/ap-16-4d-3b-sensitivity.csv` | synthetic | Deterministic OFAT output from synthetic calibration fixtures. |
| `assets/icons/icon-manifest.json` | structural-template | Icon identifiers and metadata only; no business or personal records. |
| `data/sample_existing_excel_export.csv` | synthetic | Generated SAP-like demonstration rows with fictitious material identifiers. |
| `data/sample_inventory.csv` | synthetic | Small hand-authored demonstration inventory with fictitious identifiers. |
| `sample-data.js` | synthetic | Embedded generated demonstration dataset with fictitious identifiers. |
| `tests/fixtures/excess-pilot-cases.js` | synthetic | Deterministic test-only fixtures. |
| `tests/fixtures/slow-dead-calibration-baseline-evidence.json` | synthetic | Aggregate synthetic calibration evidence and fingerprints. |
| `tests/fixtures/slow-dead-calibration-fixtures.js` | synthetic | Synthetic safety and calibration cases with frozen expected outcomes. |
| `tests/fixtures/slow-dead-calibration-sensitivity-evidence.json` | synthetic | Aggregate synthetic sensitivity evidence and fingerprints. |

## Project Structure

```text
inventory-recovery-mvp/
├── prototype.html
├── app.js
├── styles.css
├── sample-data.js
├── js/
├── tests/
├── assets/
├── data/
├── scripts/
├── artifacts/
├── SHA256SUMS.txt
├── PKG_02_VERIFICATION.md
├── README.md
├── PRODUCT_SPEC.md
├── ARCHITECTURE.md
├── DATA_CONTRACT.md
└── CHANGELOG.md
```

- `prototype.html` is the local browser entry point.
- `app.js` contains the current application orchestration.
- `js/` contains production modules for canonical data, mapping, recovery, enrichment, Excess Intelligence, Slow / Dead evidence, Slow / Dead page presentation and Pilot Review.
- `tests/` contains the file-based structured test package.
- `assets/` contains local UI assets, including the licensed ObsoliQ functional Icon Pack under `assets/icons/`.
- `data/` is reserved for anonymized sample or test fixtures only.
- `scripts/` contains portable manifest generation, verification and review-bundle tooling.
- `artifacts/` contains controlled deterministic analysis artifacts and the generated portable review bundle; obsolete extracted review directories and screenshots are not part of PKG-02.
- `PRODUCT_SPEC.md`, `ARCHITECTURE.md`, `DATA_CONTRACT.md` and `CHANGELOG.md` are the central product contracts.

Legacy Python MVP artifacts were archived outside the active repository during OPS-01 and are not required by the current browser application.

## Data Security

Do not commit:

- real customer or SAP exports
- passwords, API keys, tokens or connection strings
- private pilot data
- confidential commercial data
- personal data

Use only explicitly classified synthetic fixtures in the package. Private pilot files must remain outside the repository payload. The package policy rejects private, upload, download, export, credential and secret paths even if a file is accidentally added locally.

## Git Workflow

Recommended branch usage:

- `main` = accepted baseline only
- feature branches for work blocks, for example `ap-16-3b-1-pilot-review-lifecycle` or `ap-16-4-consumption-history`

Recommended commit points:

- baseline before a work block
- implementation milestone
- accepted result after validation

Do not publish as a public repository. The intended GitHub repository visibility is private.

## Current Limitations

- no database persistence
- no login or authentication
- no SAP live integration
- no SAP write-back
- no persistent workflow or multi-user action tracking
- no enterprise security layer
- Consumption History import and deterministic temporal, movement and unit interpretation are implemented
- Inventory-to-History relationship and controlled 3M / 6M / 12M historical metrics are implemented as derived runtime evidence
- Historical Metrics calculation is lifecycle-triggered and separated from rendering, filters, settings and export-dialog presentation
- historical metrics remain outside authoritative Inventory rows and do not change Recovery, Actions or Data Quality
- Slow / Dead Condition & Evidence Engine and entity-authoritative Recovery Case Candidates exist
- Slow / Dead Recovery Case Workbench is visible and consumes the derived Slow / Dead Runtime
- Slow / Dead Inventory/Action navigation uses temporary reveal state instead of persistent analytical filter mutation
- Slow / Dead export is available for current Recovery Cases
- Slow / Dead thresholds have synthetic OFAT sensitivity evidence but are not human pilot-calibrated or recommended for change
- no final Slow / Dead Action recommendation or workflow approval exists
- Blocked / Quality is a limited exposure and evidence model, not a complete Recovery Engine; release, rework, supplier-return, approval and success-probability evidence is not available
- no financial Recognition, Execution Workflow, Expected Recovery Value or realized cash/P&L effect exists
- no Snapshot History
- no Purchase Order optimization
- no standalone Purchase Orders Package import; PO evidence can only come from fields already present on the current Inventory Case
- no predictive analytics
- synchronous 50,000-row historical metric calculation may still occupy the main browser thread during the controlled build

See `PRODUCT_SPEC.md` and `CHANGELOG.md` for current scope and accepted limitations.

## TRUST-01 Source Trust Boundary

TRUST-01 hardens the existing import architecture; it does not add a second Trust Engine. Analytical mappings and normalization policies are bound to the exact current physical source identity: canonical field, numeric integer `sourceIndex`, duplicate-aware `sourceKey` and matching `sourceColumn`. Invalid identity, stale confirmation, mixed locale, mixed currency, double scaling or signature drift blocks commit and retains the last valid Dataset and Package state.

Inventory Snapshot, Material Master and Consumption History keep separate Package contracts. Only Inventory drives financial KPIs and Recovery; Material Master remains fill-missing-only context enrichment; Consumption History remains isolated evidence for Historical and Slow / Dead Runtime.

Missing evidence is not zero. Without accepted Consumption History, Slow / Dead is displayed as `n. v.` / `n/a` with the existing import action. A visible numeric `0` is allowed only after a current successful calculation produced a genuine zero result.

TRUST-01 covers local Package and client-data boundaries only. Imported business rows are session-only, the productive runtime has no external fetch or storage path, and direct `file://` operation remains the supported execution model. XLSX/ZIP/inflate resource limits (`SEC-001`), production observability, broader browser compatibility and enterprise security remain outside this scope.

The current technical changes are not a Product Release authorization. The mixed pre-existing worktree prevents a clean TRUST-only candidate commit, so Fresh-Commit and Fresh-Bundle gates remain blocked. `PRODUCT_RELEASE_GATE` remains `HOLD`; no push, tag, merge, deployment or publication is authorized.
