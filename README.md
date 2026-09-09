# ObsoliQ Inventory Recovery Cockpit

## Fully calculable KPI control

For a reproducible complete EUR Overview, import [`data/synthetic-kpi-calculability-control.csv`](data/synthetic-kpi-calculability-control.csv) using the normal upload and Mapping Assistant. See [`data/KPI_CONTROL_IMPORT.md`](data/KPI_CONTROL_IMPORT.md) for the two explicit mappings, independent seven-KPI expectations, Waterfall reconciliation and export scope. This four-row synthetic source does not replace the built-in error demo or alter personal source files.

Run `node tests/overview-polish-calculability-01-product-smoke.cjs` for the visible upload/mapping, exact cents, source-bound DQ and real-download checks. All screenshots and runtime outputs belong outside the repository. `PRODUCT_RELEASE_GATE: HOLD`.

## RECOVERY-PILOT-01: Synthetic End-to-End Pilot

German click guide, expectation table and blank human feedback form: [data/RECOVERY_PILOT_01.md](data/RECOVERY_PILOT_01.md). Generate six initial/update CSV, TSV and genuine XLSX downloads plus eight focused format/failure fixtures with `node scripts/generate-recovery-pilot-01.cjs <external-directory>`. The generator uses the available local `@oai/artifact-tool`, JSZip and Playwright runtime, resolved through `OBSOLIQ_NODE_MODULES` or the bundled runtime; no new project dependency or runtime network access. Generated downloads/previews/catalogs belong outside the repository and are not runtime dependencies. The existing three-package demo and PO demo sources remain unchanged.

Set `OBSOLIQ_PILOT_FILES` to that directory and `OBSOLIQ_PILOT_RESULTS` to a separate external run directory. Run `node tests/recovery-pilot-01-regression.cjs` for chooser-based format equivalence, the single XLSX decision/report/backup walkthrough, exact OOXML namespace regression, and registered PO/History dependencies. Optional screenshots use the existing opt-in external artifact policy. The generated catalog records source fingerprints and output SHA-256 hashes; worktree and input bytes are checked around regression. This is synthetic technical verification, not human usability or real-customer validation. Product release remains HOLD / unauthorized.

## RECOVERY-LOOP-01D: Reported Implementation

Open a saved documented PO decision in **Maßnahmen / Actions**. Under **Rückmeldungen / Implementation reports**, choose the specific decision version and **Rückmeldung erfassen / Record report**. Enter the human report, reporter and report date; partial reports also require the remaining part. Dates and references are optional where labelled. Corrections append a new report with a reason; the original stays readable as superseded.

Historical decision, reported implementation and currently observed PO data remain distinct. Reports can refer to an unambiguously saved historical decision despite a stale/missing current source. A new decision version does not inherit old reports. Source updates never create reports, recognize savings or set Actions to Implemented.

**Rückmeldungen exportieren / Export reports** downloads `obsoliq_po_implementation_reports.csv`, one row per report, including superseded entries and explicit version/source references, without financial totals. JSON backup now writes v2 and includes reports/corrections. Existing v1 files remain importable; matching older backups cannot delete additional local reports. Source files must still be kept separately. Checksums and manual references do not authenticate a person, document or supplier statement.

Run `node tests/recovery-loop-01d-regression.cjs` for the feedback contract/browser checks and the registered 01A/01B/01C dependency regression. All data in these tests is synthetic. Runtime remains local, session-only and file-based; release remains HOLD / unauthorized.

## RECOVERY-LOOP-01C: Local Decision Backup

In **Maßnahmen / Actions**, use **Entscheidungen sichern / Back up decisions** for a local `obsoliq_po_review_backup.json`. It includes all saved PO decisions, incomplete saved drafts and earlier documented versions, not unsaved editor inputs. Keep source files separately; the JSON is not a copy of Inventory, Master, History or PO files. It may contain confidential notes and manual references.

After reload, import the original sources normally, then choose **Entscheidungen wiederherstellen / Restore decisions**. Review current, stale, unassignable, identical and conflicting entries and explicitly confirm. Identical entries are no-ops; a conflict blocks the entire file. Missing-source documentation has no operational case link. After loading sources later, use **Zuordnung erneut prüfen / Review assignment again**. Changed quantities require the existing 01B comparison and revalidation. The CSV remains the readable review list, not a restoration format.

Run `node tests/recovery-loop-01c-regression.cjs` for the permanently registered 01A/01B/01C and dependency tests. Test sources are in the repository; screenshots/logs/reports remain external through the existing artifact controls. No automatic browser persistence, cloud, authenticated approval, supplier execution or release is introduced.

## RECOVERY-LOOP-01B: Document PO Decisions

After the PO handoff described below, open **Entscheidung bearbeiten / Edit decision** in Actions. Select a decision direction and work state, enter a reason and responsibility, and optionally add a review date and manual evidence reference. Incomplete drafts can be saved; **Entscheidung dokumentiert / Decision documented** requires all applicable fields. A reduction request must be greater than zero and within the evidenced open quantity; postponement must be later than a known existing delivery date.

Use **Synthetische Quellenaktualisierung** to see the original decision become stale. **Erneut prüfen / Review again** displays both source versions; explicitly confirm the new binding and validate the decision again. The synthetic quantity change from 12 to 6 invalidates a request to reduce by 8. Previous documented versions remain available in the editor history.

The PO CSV includes all session positions, including stale decisions and prior documented versions, irrespective of list filters. Use the separate 01C JSON backup before reload. No automatic persistence or CSV restoration exists. A documented request does not execute a change, set the existing Action to Implemented, prove supplier approval or count as savings. Release remains on HOLD and unauthorized.

## RECOVERY-LOOP-01A: Reviewed PO Items

Open `prototype.html` locally. In **Bestellungen / Purchase Orders**, download the template or import a CSV, TSV or XLSX through the existing file dialog. Review the physical column mapping, number/date interpretation and every excluded row. Confirm that the source contains one open item per row and that the quantity is the open remainder, then apply.

For a demonstration, load **Beispieldaten**, then explicitly choose **Synthetische PO-Ergänzung** in Bestellungen. The existing three-package demo remains unchanged. Open a linked Excess case, select **Maßnahmen / Actions** in its detail tabs, select PO items and choose **In Maßnahmen prüfen**. The existing Actions page retains the case and exports the PO review list. **Synthetische Quellenaktualisierung** marks prior review context stale without deleting it.

The template requires `purchase_order`, `purchase_order_item`, `material_id`, `plant`, `open_quantity` and `base_unit`. Details and exclusion rules are in DATA_CONTRACT.md. Review context is session-only; export it before reload. This is evidence for human review, not a cancellable quantity, savings claim or ERP action.

Targeted checks: `node tests/recovery-loop-01a.test.cjs`, `node tests/recovery-loop-01a-product-smoke.cjs`. Dependency milestone: `node tests/recovery-loop-01a-milestone.cjs`. Optional screenshots use the existing external artifact mechanism. No release is authorized: `PRODUCT_RELEASE_GATE: HOLD`, `AUTHORIZED_RELEASE: NO`.

ObsoliQ is a local, browser-based Inventory Recovery and Decision Intelligence MVP for SAP-based manufacturing companies. It helps teams inspect inventory snapshots, classify recovery potential, review data quality, explain Excess cases and prepare action-oriented exports without sending data to a server.

The current project is prepared for local Git version control and later publication as a private GitHub repository.

## Product Summary

The MVP supports a local workflow from SAP/Excel-style inventory data to recovery KPIs, Data Quality checks, remediation review, a Unified Inventory Risks workbench and session-only Pilot Review evidence.

ObsoliQ is not a production SaaS, not a SAP live integration and not a predictive analytics system.

## Current Scope

- linked synthetic full-demo loading for Inventory Snapshot, Material Master and Consumption History through the productive import services
- deterministic demo generation, source hashes, scenario oracle and header-only import templates
- Inventory Snapshot
- Material Master
- Consumption History Package import
- package-specific Consumption History Mapping
- package-scoped Consumption History validation and diagnostics
- deterministic Consumption History temporal, movement and unit interpretation
- source-bound Consumption History interpretation policies
- package-scoped History Readiness
- Inventory-to-Consumption-History relationship
- controlled historical inventory metrics with inclusive observed `history_coverage_months` provenance
- optional canonical Inventory/Material Master `base_unit` with Inventory-authoritative fill-missing-only enrichment
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

Current cross-package relationships support Material Master context, Consumption History metrics and reviewed open Purchase Order items linked exactly by material, plant and compatible unit. Arbitrary joins and PO quantity optimization remain unavailable.

History Coverage is the inclusive span between the earliest and latest valid observed Consumption History month. It is separate from rolling-window completeness and quantity-based Inventory Coverage. Missing History remains unavailable rather than zero. No unit conversion, unit defaulting or History-to-Inventory unit backfill is performed.

## Quick Start

1. Open `prototype.html` in a browser.
2. In the central start panel, select `Beispieldaten laden` / `Load sample data` to atomically load the linked three-source demo, or `Eigene Datei importieren` / `Import your own file` for a supported local Inventory file.
3. No server, database or login is required for the current MVP.

Supported local upload formats include `.xlsx`, `.csv` and `.tsv`. Uploaded data stays in the browser session.
The built-in full demo is explicitly synthetic and uses the frozen analysis date `2026-08-31` in UTC. A user Inventory upload deactivates demo-owned Material Master and Consumption History before analysis; loading the demo over user data requires confirmation.

## Overview Startup and KPI Layout

The application starts without loading demo data automatically. Until an active Inventory source exists, Overview presents one neutral, keyboard-accessible start panel and keeps unavailable KPIs, charts, progress, analysis filters and the Data Foundation disclosure out of view. Loading, mapping review, unusable-source, filtered-empty and loaded states have separate presentation paths. A failed replacement import preserves the last valid dataset and reports the failure alongside it.

After data is available, the six money KPIs use a balanced three-column desktop, two-column medium and one-column narrow grid. Recovery keeps its visual priority without spanning an extra column. A filter with no matches produces one central explanation and visible reset action; it does not repeat the same message across KPI cards. The compact area menu used at narrower widths moves focus into the menu and supports Arrow, Home, End, Escape and Tab keyboard navigation.

## Exact Overview KPI Amounts

Overview money cards show a short availability status, an immediate amount label, the prominent compact EUR amount, at most one short note and **Details ansehen / View details**. The existing safe subtotal or non-negative projection may be prominent, but its label and **Gesamtwert nicht verfügbar / Total value unavailable** remain visible on the closed card. No subtotal is promoted to a complete model or exported KPI. A complete status describes data availability only, not low inventory risk or realized savings.

The shared native detail dialog shows the source-and-filter-bound EUR amount with two locale-aware decimals, imported/relevant/usable/blocking position counts, concrete causes and the existing source/revision-bound data-quality actions. Recovery amount and share retain separate checks while a common physical cause appears once. The header and Close remain available while the body scrolls on mobile; keyboard entry, focus containment, Escape and return focus are supported. Filter, source and presentation changes close and clear the old detail scope, as does the start of a source operation; failed imports still restore the underlying data and card state.

Both card and detail amounts use only the existing exact-amount model when Mapping and normalization evidence establishes a safe EUR basis. They do not reparse compact text, recalculate sums or apply display-currency FX. Genuine zero is shown as `0,00 €` in detail; missing or unsafe values stay unavailable with reachable explanations. Recovery Share never receives a partial quotient. Position counts are not financial coverage; currency-context restrictions apply separately.

The shared scope is shown once. Its restricted-data summary deduplicates KPI-relevant source positions, not all data-quality issues (three positions in the unchanged full demo). Scope-wide currency/overflow gates or ambiguous position identities use wording without an invented count.

`OVERVIEW-INFORMATION-HIERARCHY-01` is covered by the existing focused product smokes: `kpi-availability-01`, `kpi-exact-value-01`, `overview-startup-ux-02` and `visible-demo-activation-01` in `tests/*-product-smoke.cjs`. Their presentation assertions follow the new hierarchy; strict financial, source and rollback assertions remain in place. No deployment or release approval is implied: `PRODUCT_RELEASE_GATE: HOLD`.

## Recovery operations integration

PO feedback preparation, JSON backup and restore preview share the source-operation lock. Pending feedback protects the parent decision inputs; pending restore shows a cancellable preview. Cancelled work cannot later reopen a dialog or unlock another operation. Source and restore finalization failures restore the previous saved state, and mapping failures remain visible in the review dialog.

The focused synthetic regression runs against the actual prototype with visible file import, explicit PO interpretation, decision/report editors and downloaded JSON:

```powershell
node tests/recovery-operations-integration-01-product-smoke.cjs
```

It checks saved drafts, original and corrected reports, exact source/version bindings, a 12-to-6 quantity update, processing and finalization rollback, duplicate/conflict handling, asynchronous cancellation, navigation/focus recovery and the 390px workflow. Screenshots are opt-in through the existing external artifact writer. Source files and personal PO backups remain a separate transfer step; unsaved inputs are not part of JSON backups. Product release remains HOLD.

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

Screenshot smokes write only to a dedicated external absolute `OBSOLIQ_TEST_ARTIFACT_ROOT`.
When unset, the shared test runtime creates a unique directory under the OS temporary directory.
Use a fresh artifact root for each complete run; concurrent runs use separate roots. Existing
screenshots are never overwritten. Logical report paths stay `screenshots/<suite>/<name>.png`.
The standard catalog remains 82 images across 14 suites. `OBSOLIQ_SMOKE_SCREENSHOT=1` enables
suite-declared optional evidence, including the Excess workspace and the focused Overview startup,
loaded, sticky-navigation and narrow exact-value viewports. Other values, including legacy physical
paths and empty values, are rejected before screenshot output. Optional images are not part of the
standard catalog. No generated screenshot is a product-package input.
Run `node tests/test-artifact-containment-product-smoke.cjs` for path, isolation and bypass checks.

The canonical review package includes the root `.gitattributes` file exactly once as
`SOURCE_REPRODUCIBILITY_METADATA`. It is a test/reproducibility dependency for R0B.1, not a
browser Runtime dependency. Every other dotfile, including `.gitignore`, `.github/**`, `.env*`
and local tool metadata, remains outside the explicit package allowlist.

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
| `data/demo/consumption-history.csv` | synthetic | Deterministically generated linked demo history with fictitious identifiers. |
| `data/demo/demo-expectations.json` | synthetic | Machine-readable linked-demo cohorts, expectations and content hashes. |
| `data/demo/inventory-snapshot.csv` | synthetic | Deterministically generated linked demo inventory with fictitious identifiers. |
| `data/demo/material-master.csv` | synthetic | Deterministically generated linked demo material context with fictitious identifiers. |
| `data/sample_existing_excel_export.csv` | synthetic | Generated SAP-like demonstration rows with fictitious material identifiers. |
| `data/sample_inventory.csv` | synthetic | Small hand-authored demonstration inventory with fictitious identifiers. |
| `data/synthetic-kpi-calculability-control.csv` | synthetic | Four fictitious EUR control positions with independent expectations and Waterfall cap/overlap cases. |
| `data/templates/consumption-history-template.csv` | structural-template | Header-only Consumption History import template. |
| `data/templates/material-master-template.csv` | structural-template | Header-only Material Master import template. |
| `demo-data.js` | synthetic | Browser descriptor generated from the same linked demo source of truth. |
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
├── demo-data.js
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
- `data/demo/` contains the generated linked synthetic demo and its independent expectation catalog; `data/templates/` contains record-free import templates.
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
- no PO allocation, cancellable-quantity calculation or automatic execution; imported PO items provide source-bound review evidence only
- no predictive analytics
- synchronous 50,000-row historical metric calculation may still occupy the main browser thread during the controlled build

See `PRODUCT_SPEC.md` and `CHANGELOG.md` for current scope and accepted limitations.

## TRUST-01 Source Trust Boundary

TRUST-01 hardens the existing import architecture; it does not add a second Trust Engine. Analytical mappings and normalization policies are bound to the exact current physical source identity: canonical field, numeric integer `sourceIndex`, duplicate-aware `sourceKey` and matching `sourceColumn`. Invalid identity, stale confirmation, mixed locale, mixed currency, double scaling or signature drift blocks commit and retains the last valid Dataset and Package state.

Inventory Snapshot, Material Master and Consumption History keep separate Package contracts. Only Inventory drives financial KPIs and Recovery; Material Master remains fill-missing-only context enrichment; Consumption History remains isolated evidence for Historical and Slow / Dead Runtime.

Missing evidence is not zero. Without accepted Consumption History, Slow / Dead is displayed as `n. v.` / `n/a` with the existing import action. A visible numeric `0` is allowed only after a current successful calculation produced a genuine zero result.

TRUST-01 covers local Package and client-data boundaries only. Imported business rows are session-only, the productive runtime has no external fetch or storage path, and direct `file://` operation remains the supported execution model. XLSX/ZIP/inflate resource limits (`SEC-001`), production observability, broader browser compatibility and enterprise security remain outside this scope.

The current technical changes are not a Product Release authorization. The mixed pre-existing worktree prevents a clean TRUST-only candidate commit, so Fresh-Commit and Fresh-Bundle gates remain blocked. `PRODUCT_RELEASE_GATE` remains `HOLD`; no push, tag, merge, deployment or publication is authorized.
