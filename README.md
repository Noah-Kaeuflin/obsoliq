# ObsoliQ Inventory Recovery Cockpit

ObsoliQ is a local, browser-based Inventory Recovery and Decision Intelligence MVP for SAP-based manufacturing companies. It helps teams inspect inventory snapshots, classify recovery potential, review data quality, explain Excess cases and prepare action-oriented exports without sending data to a server.

The current project is prepared for local Git version control and later publication as a private GitHub repository.

## Product Summary

The MVP supports a local workflow from SAP/Excel-style inventory data to recovery KPIs, Data Quality checks, remediation review, Excess Intelligence and session-only Pilot Review evidence.

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
- Input Trust
- Data Quality and Remediation
- Recovery calculation
- Actions
- Excess Intelligence
- session-only Pilot Review

## Quick Start

1. Open `prototype.html` in a browser.
2. Use the built-in sample data or upload a supported local file.
3. No server, database or login is required for the current MVP.

Supported local upload formats include `.xlsx`, `.csv` and `.tsv`. Uploaded data stays in the browser session.

## Tests

1. Open `tests/tests.html` in a browser.
2. Confirm that the structured test result reports zero failures.
3. Production startup through `prototype.html` does not execute tests.

JavaScript syntax can be checked locally with Node:

```powershell
Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

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
- `assets/` contains local UI assets.
- `data/` is reserved for anonymized sample or test fixtures only.
- `PRODUCT_SPEC.md`, `ARCHITECTURE.md`, `DATA_CONTRACT.md` and `CHANGELOG.md` are the central product contracts.

Legacy Python MVP artifacts were archived outside the active repository during OPS-01 and are not required by the current browser application.

## Data Security

Do not commit:

- real customer or SAP exports
- passwords, API keys, tokens or connection strings
- private pilot data
- confidential commercial data
- personal data

Use only anonymized fixtures in `data/`. Private pilot files must remain outside GitHub or in ignored local folders such as `data/private/`.

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
- Slow / Dead thresholds are not yet pilot-calibrated
- no final Slow / Dead Action recommendation or workflow approval exists
- no financial Recognition, Execution Workflow, Expected Recovery Value or realized cash/P&L effect exists
- no Snapshot History
- no Purchase Order optimization
- no predictive analytics
- synchronous 50,000-row historical metric calculation may still occupy the main browser thread during the controlled build

See `PRODUCT_SPEC.md` and `CHANGELOG.md` for current scope and accepted limitations.
