# Changelog

## 2026-08-21 - AP 16.4a:
Consumption History Contract & Builder

### Added

- Added `consumption_history` as an importable optional intelligence Data Package.
- Added a DOM-independent Consumption History Builder with schema version `consumption-history-v1`.
- Added package-specific Mapping Engine support for Consumption History field definitions and required-any temporal mapping groups.
- Added Consumption History package validation for `material_id`, `consumption_quantity` and at least one raw temporal reference (`posting_date` or `period`).
- Added immutable normalized Consumption History package rows with stable package row keys, raw temporal values, preserved identifiers and relationship keys.
- Added warning diagnostics for negative consumption quantities, missing units, multiple units and exact duplicate source rows.
- Added transaction-safe Consumption History package import through the existing Package Import Service.
- Added Data Foundation UI visibility for Consumption History as an optional, non-calculating intelligence source.
- Added regression tests for contract validation, rollback, raw-source immutability, Data Foundation UI routing and analytical isolation.

### Preserved

- KPI and Recovery calculations.
- Inventory Snapshot upload and parsing logic.
- Material Master matching and fill-missing-only enrichment.
- Data Quality Score and remediation semantics.
- Action Cockpit, Opportunity Score, scenario and Pilot Review behavior.
- Inventory export behavior.
- Sample data loading.
- Local `file://` prototype behavior.
- Baseline tag `baseline-2026-08-21`.

### Known Limitations

- Consumption History is stored as an optional Data Package only.
- No consumption buckets, 3M/6M/12M aggregation, slow/dead-stock classification or score-model changes are included yet.
- No joins from Consumption History into Inventory Snapshot analytics are included yet.
- Units are preserved as source evidence and are not converted.
- The MVP remains local, session-based and file-backed.

## 2026-08-21 - AP 16.3b.1.1:
Pilot Review Contract, Lifecycle UX & Navigation Acceptance Closure

### Fixed

- Enforced the complete Package, Case Fingerprint and score-model identity contract inside the Pilot Review Service.
- Rejected incomplete new Pilot Review records before state mutation.
- Restricted legacy Review handling to explicit restore and migration paths.
- Removed legacy fallback fingerprints from normal Review creation.
- Replaced Review-ID generation based on Map size with a monotonic Review sequence.
- Added Review sequence state to snapshot and restore.
- Prevented Review-ID reuse after Dataset-specific Review deletion.
- Prevented lifecycle maps from being overwritten by duplicate Review IDs.
- Removed the stale reassessment warning when a valid current Review exists.
- Added neutral historical Review information for Cases with current and older stale Reviews.
- Preserved the reassessment warning only when no current Review exists.
- Removed persistent Excess filter override behavior from Relationship navigation.
- Prevented Relationship navigation from silently changing filtered Summary or Export scope.
- Added strict Service-contract, Review-ID, lifecycle and navigation regression tests.
- Preserved Recovery, Data Quality, Action, Opportunity Score and scenario semantics.

### Preserved

- Raw Source
- Input Trust
- Mapping and Policy invariants
- Recovery Waterfall
- Recovery cap
- Data Quality Score
- Readiness calculations
- Issue Ledger
- Material Master matching
- fill-missing-only enrichment
- Owner Function rules
- Action recommendations
- Action priority and confidence
- Opportunity Score model
- scenario calculations
- Package identity and revision semantics
- Preview / Apply
- Undo / Reset
- Formula Injection protection
- German / English
- Light / Dark Mode
- file:// local MVP

### Known Limitations

- Pilot Reviews remain session-only.
- Historical Reviews are not persisted across browser sessions.
- Opportunity Score remains a transparent prioritization score.
- scenarios remain assumption-based.
- no Consumption History.
- no Snapshot History.
- no persistent workflow.
- no SAP connector.
- no Predictive Analytics.

## 2026-08-21 - AP 16.3b.1:
Pilot Review Lifecycle & Package Acceptance Closure

### Fixed

- Added deterministic Excess Case fingerprints with version `excess-pilot-case-v1`.
- Bound Pilot Reviews to Dataset, Case, Inventory row, active Inventory Package revision and Opportunity Score model version.
- Added current, stale and orphaned Pilot Review lifecycle states.
- Marked Reviews stale when Case evidence, score, recommendation, owner context, relationship state, scenarios, Package revision or score model changed.
- Marked Reviews orphaned when the current Excess Case no longer exists.
- Limited Pilot Summary and default Pilot Export to current Reviews.
- Added explicit historical export for all Review lifecycle states.
- Read Package revision from the active Inventory Package Registry record.
- Prevented Review save when Package identity or revision is missing.
- Added Pilot Review View and Controller modules before `app.js`.
- Removed Pilot Review save/export branches from the central document click router.
- Replaced full Excess page rebuilding after Pilot Review save with targeted Review and Summary updates.
- Corrected relationship-to-Excess navigation so hidden targets are revealed through a scoped Excess override and missing targets do not open unrelated cases.
- Added lifecycle, package-integration, relationship-navigation and performance tests.

### Preserved

- Recovery Waterfall, Gross Excess, Net Addressable Excess and cap/overlap semantics.
- Data Quality Score, readiness calculations and Issue Ledger semantics.
- Material Master matching, enrichment allowlist and provenance ownership.
- Action recommendations, priority, confidence, owner rules and status logic.
- Opportunity Score model and scenario formulas.
- Package identity and revision ownership.
- Raw Source, Preview / Apply, Undo / Reset and Formula Injection protection.
- German / English, Light / Dark Mode and file:// local MVP behavior.

### Known Limitations

- Pilot Reviews remain session-only and are not persisted across browser sessions.
- stale and orphaned Reviews are audit evidence only.
- Opportunity Score remains a transparent prioritization score.
- scenarios remain assumption-based.
- no Consumption History.
- no Snapshot History.
- no persistent workflow.
- no SAP connector.
- no Predictive Analytics.

## 2026-08-20 - AP 16.3b:
Excess Drilldown Stabilization & Pilot Review

### Changed

- Added deterministic Excess Pilot case fixtures.
- Added business-oriented Opportunity Score calibration constraints.
- Added explicit Why Prioritized and Why Not Higher explanations.
- Distinguished source facts, Material Master facts, calculations, user assumptions and unavailable evidence.
- Clarified Gross Excess, Net Addressable Excess and overlap in the case drilldown.
- Standardized scenario availability, observed inputs, assumptions, calculations, missing evidence and limitations.
- Added explicit non-predictive wording to all current Excess scenarios.
- Added a session-only Excess Pilot Review workflow.
- Added score, recommendation and scenario assessments.
- Added controlled missing-evidence, required-Package and required-SAP-field capture.
- Added a Pilot Review summary.
- Added a Pilot Review export.
- Improved Relationship and Enrichment Quality explanations.
- Added direct linking from relationship issues to existing Excess cases.
- Preserved the existing Action handoff.
- Added Pilot fixture, score calibration, scenario, review, drilldown and integration tests.
- Preserved Recovery, Data Quality, relationship, enrichment, Action and Package semantics.

### Preserved

- Raw Source
- Input Trust
- Mapping and Policy invariants
- Recovery Waterfall
- Recovery cap
- Data Quality Score
- Readiness formulas
- Issue Ledger
- Material Master matching
- fill-missing-only enrichment
- Owner Function rules
- existing Action recommendations
- Action priority
- Action confidence
- Action status
- Package identity and revisions
- Preview / Apply
- Undo / Reset
- Formula Injection protection
- German / English
- Light / Dark Mode
- file:// local MVP

### Known Limitations

- Pilot Reviews are session-only.
- Opportunity Score remains a transparent prioritization score.
- scenarios remain assumption-based.
- no Consumption History.
- no Demand Forecast.
- no Purchase Order Package.
- no Snapshot History.
- no realized-value tracking.
- no persistence.
- no SAP connector.
- no Predictive Analytics.

## 2026-08-20 - AP 16.2b.2.4:
Confirmation Invalidation & Residual Export/UI Closure

### Fixed

- Invalidated top-level Input Trust confirmation after physical Source Identity changes.
- Invalidated field-level confirmation after physical Source Identity changes.
- Cleared stale confirmation modes and timestamps after remapping.
- Prevented previous user-confirmed state from overriding changed Source Identity.
- Allowed a fresh current-source user confirmation after the new Input Trust assessment.
- Added a real UI-driven confirmation, commit, reopen and remapping regression test.
- Distinguished trusted automatic interpretation from user-confirmed interpretation.
- Added Owner Reference, Owner Source and Owner Assignment Confidence to Action Export.
- Made row-level provenance authoritative for relationship and conflict export values.
- Removed provenance-export dependencies on bounded conflict examples.
- Added complete row-level conflict counts and conflict-field lists.
- Bound Excess detail selection to the current visible page.
- Reconciled active Excess case after pagination, filtering and page-size changes.
- Corrected Quellzeile / Source Row terminology.
- Preserved Recovery, Data Quality, enrichment, Action, Opportunity Score and scenario semantics.

### Preserved

- Raw Source.
- Recovery Waterfall and Recovery cap.
- Data Quality Score and readiness formulas.
- Issue Ledger semantics.
- Material Master matching and fill-missing-only enrichment.
- Owner Function rules.
- Opportunity Score model and scenario formulas.
- Action recommendations, priority, confidence and status.
- Package identity and revisions.
- Preview / Apply behavior.
- Undo / Reset behavior.
- Formula Injection protection.
- German / English and Light / Dark Mode.
- file:// local MVP behavior.

### Known Limitations

- No persistent Mapping Profiles.
- No cross-session schema history.
- No worksheet/header-row selection.
- No currency conversion.
- No Consumption History.
- No Snapshot History.
- No Predictive Analytics.
- No persistent workflow.
- No SAP connector.

## 2026-08-20 - AP 16.2b.2.3:
Applied Policy Identity & Residual Acceptance Closure

### Fixed

- Preserved the currently applied Normalization Policy when reopening the Mapping Assistant.
- Preserved confirmed locale, scale and currency decisions during unchanged Mapping reviews.
- Added physical Source Identity to every field-level Normalization Policy: `canonicalField`, `sourceIndex`, `sourceColumn` and `sourceKey`.
- Bound user overrides to the exact canonical field and physical source column reviewed by the user.
- Prevented confirmed policies and automatic proposals from transferring to another physical source column after remapping.
- Invalidated stale source-bound policies after source-to-canonical Mapping changes and reset review confirmation for changed physical sources.
- Reconciled applied, proposed, override and effective policy roles before Preview, Apply, Dataset Builder and Package commit.
- Added blocking Normalization Policy Source Identity invariants before Dataset and Package state advances.
- Stored the effective source-bound policy in Package build data for package-level invariant validation.
- Kept blocked Input Trust imports blocked until an explicit user override changes the reviewed interpretation.
- Added AP 16.2b.2.3 regression tests for policy identity, duplicate-header source keys, unchanged Mapping reopen preservation, stale-policy invalidation and invariant blocking.

### Preserved

- Raw Source.
- Recovery Waterfall and Recovery cap.
- Data Quality Score and readiness formulas.
- Issue Ledger semantics.
- Material Master relationship matching and fill-missing-only enrichment.
- Owner Function rules and Owner Context export fields.
- Opportunity Score and scenario formulas.
- Action recommendations, priority, confidence and status.
- Package identity and revision semantics.
- Preview / Apply parity.
- Undo / Reset behavior.
- Formula Injection protection.
- German / English and Light / Dark Mode.
- file:// local MVP behavior.

### Known Limitations

- No persistent Mapping Profiles.
- No cross-session schema history.
- No worksheet/header-row selection.
- No currency conversion.
- No Consumption History.
- No Snapshot History.
- No predictive analytics.
- No persistent workflow.
- No SAP connector.

## 2026-08-20 - AP 16.2b.2.2:
Applied Mapping & Normalization Integrity Gate

### Fixed

- Made the trust-reviewed Mapping the authoritative Mapping for Dataset Builder, Dataset Meta, Package Mapping, Preview and Apply.
- Added deterministic Mapping-signature invariants across Builder, Dataset Meta and Package records.
- Added deterministic effective Normalization Policy merging through `mergeNormalizationPolicies()`.
- Prevented empty override objects from suppressing proposed Input Trust policies.
- Initialized Mapping Assistant controls from proposed locale, scale, currency and source-column policy evidence.
- Made the effective Normalization Policy authoritative for Input Trust revalidation, Dataset Builder, Dataset Meta and Package metadata.
- Added deterministic Normalization Policy signatures and cross-layer policy invariant checks.
- Preserved the controlled trusted profile for the built-in sample dataset without weakening customer-file blockers.
- Kept row-level relationship and enrichment provenance as the authoritative source for provenance exports.
- Preserved Owner Context export fields and protected `owner_function` from Material Master enrichment.
- Kept Excess page/detail pagination, Source Row terminology and explicit `scaleSource` contracts aligned.
- Harmonized Mapping and Policy signatures during remediation rebuild, undo/reset and preview restore flows.
- Added AP 16.2b.2.2 regression tests for applied Mapping signatures, policy merging, control initialization and mismatch rollback.

### Preserved

- Raw Source.
- Recovery Waterfall.
- Recovery cap.
- Data Quality Score.
- Readiness formulas.
- Issue Ledger semantics.
- Material Master relationship matching.
- fill-missing-only enrichment.
- Owner Function rules.
- Opportunity Score model.
- scenario formulas.
- Action recommendations, priority and confidence.
- Package identity and revision semantics.
- Preview / Apply parity.
- Undo / Reset behavior.
- Formula Injection protection.
- German / English.
- Light / Dark Mode.
- file:// local MVP behavior.

### Known Limitations

- No persistent Mapping Profiles.
- No cross-session schema history.
- No worksheet/header-row selection.
- No currency conversion.
- No Consumption History.
- No Snapshot History.
- No predictive analytics.
- No persistent workflow.
- No SAP connector.

## 2026-08-20 - AP 16.2b.2.1:
Input Trust Review & Excess Integration Closure

### Fixed

- Moved Input Trust assessment before the final Mapping-review decision.
- Opened the Mapping Assistant for review-required or blocked Input Trust results.
- Added actionable blocked-import feedback for unsafe financial interpretation.
- Added Trust State, Locale, Scale, Currency, Schema Drift and Mapping Evidence to Mapping review.
- Added controlled locale and scale overrides that revalidate pending Input Trust state.
- Applied trust-adjusted confidence to reviewed Mapping entries.
- Added a compact Input Trust and Value Normalization diagnostic to Data Quality.
- Replaced full committed Input Trust results with compact Dataset and Package metadata.
- Corrected enriched and provenance exports to use row-owned relationship and enrichment provenance.
- Corrected visible Inventory ordering for enriched-column sorts.
- Removed duplicate Excess page-model calculation during one page render.
- Aligned Excess Summary with the current filtered selection while preserving portfolio context.
- Added explicit localization for Opportunity Score components, match types and relationship diagnostics.
- Added bounded Excess worklist pagination.
- Prevented hidden data views from rendering after every Dataset mutation.
- Completed new Input Trust, provenance and Excess view-model JSDoc contracts.
- Treated exact duplicate source headers conservatively in automatic Mapping so one column maps and duplicates remain preserved source columns.
- Added `Stock Value (kEUR)` header recognition so double-scaling evidence reaches Input Trust.
- Preserved Recovery, Data Quality, Action, enrichment, scoring and scenario semantics.

### Preserved

- Raw Source.
- Recovery Waterfall.
- Recovery cap.
- Data Quality Score.
- Readiness formulas.
- Issue Ledger.
- Material Master matching.
- fill-missing-only enrichment.
- Opportunity Score model.
- scenario formulas.
- Action recommendation rules.
- Action priority and confidence.
- Package identity and revisions.
- Preview / Apply.
- Undo / Reset.
- Formula Injection protection.
- German / English.
- Light / Dark Mode.
- file:// local MVP behavior.

### Known Limitations

- No persistent Mapping profiles.
- No cross-session schema history.
- No worksheet/header-row selection.
- No currency conversion.
- No Consumption History.
- No Snapshot History.
- No predictive analytics.
- No persistent workflow.
- No SAP connector.

## 2026-08-20 - AP 16.2b.2:
Input Trust Layer - Schema Drift & Value Normalization

### Changed

- Added deterministic semantic and physical schema fingerprints.
- Added order-independent schema compatibility and order-sensitive physical drift detection.
- Added per-column content profiling.
- Added numeric locale inference for German, English, Swiss and space-separated formats.
- Added structured magnitude normalization for thousands, millions and billions.
- Added scientific-notation and accounting-negative parsing.
- Preserved identifier fields as text, including leading-zero Material IDs.
- Added header-based source scale, currency and unit detection.
- Added explicit normalization policies to approved mappings.
- Added double-scaling detection and blocking review.
- Added mixed-locale and mixed-currency diagnostics.
- Added possible column-misalignment diagnostics.
- Extended Mapping confidence with deterministic type, sample, unit and schema evidence.
- Prevented ambiguous required financial values from silently entering KPIs and Recovery.
- Added compact Mapping and Data Quality Input Trust diagnostics.
- Added Input Trust metadata to committed Data Packages.
- Added Preview / Apply normalization parity.
- Added transaction rollback for failed trust validation.
- Added schema, locale, magnitude, scale, misalignment and 10,000-row regression tests.
- Preserved Raw Source, Recovery, Data Quality, Action, Registry and enrichment semantics.

### Preserved

- Recovery Waterfall.
- Recovery cap.
- Data Quality Score formula.
- Readiness formulas.
- Issue Ledger lifecycle.
- Inventory-to-Material-Master matching.
- Material Master enrichment.
- Package identity and revisions.
- Action rules.
- Preview / Apply.
- Undo / Reset.
- Existing exports.
- German / English.
- Light / Dark Mode.
- Local `file://` MVP behavior.

### Known Limitations

- No worksheet selection.
- No automatic header-row detection.
- No persistent Mapping Profiles.
- No cross-session schema history.
- No automatic schema versioning.
- No currency conversion.
- No general unit conversion.
- No AI Mapping.
- No Predictive Analytics.

## 2026-08-20 - AP 16.3a:
Excess Intelligence & Decision Page

### Added

- Added a dedicated Excess Intelligence page behind the `Excess Stock` navigation tab.
- Added centralized Excess case generation with gross excess, net addressable excess, overlap and remaining-inventory transparency.
- Added an opportunity score model for Excess cases with financial impact, urgency, actionability, evidence and data-confidence components.
- Added scenario cards for percentage reduction, absolute reduction, safety-stock adjustment, purchase-order review and demand validation.
- Added read-only Relationship / Enrichment quality status and issue worklist for Excess decisions.
- Added Owner Context generation with owner reference, source and assignment confidence without changing `owner_function` rules.
- Added enriched inventory export variants: original source data, enriched analytical dataset and enriched dataset with provenance.
- Added focused AP 16.3a tests for Excess engines, Relationship Quality and protected owner-field behavior.

### Changed

- Routed `Excess Stock` from placeholder content to the new decision page.
- Made enriched Material Master columns in the Inventory Explorer use the existing column menu filter/sort mechanism.
- Added relationship-quality scoring to Data Foundation status details.
- Aligned Relationship Quality with the versioned `mvp-1` threshold contract.
- Normalized owner source values to `inventory`, `material_master` or `none`.
- Extended Action exports with owner reference, owner source and owner assignment confidence.

### Preserved

- Recovery formulas and waterfall semantics.
- Data Quality score formulas and issue identity rules.
- Action recommendation, priority and confidence rules.
- Upload, parsing and sample-data behavior.
- Package identity, Registry and revision semantics.
- Source-row preservation and original Excel column order.
- Local `file://` prototype behavior.

### Known Limitations

- Excess scenarios are deterministic MVP estimates, not predictive analytics.
- Purchase-order and demand-validation scenarios remain unavailable unless matching source fields exist.
- Owner references are contextual suggestions and are not persisted as workflow assignments.
- No SAP write-back, database, authentication, cloud deployment or multi-user workflow is included.

## 2026-08-19 - AP 16.2b.1:
Enrichment State Isolation & Determinism Gate

### Fixed

- Restored Material-Master relationship state after Remediation Preview.
- Restored enrichment diagnostics after Remediation Preview.
- Restored field-level enrichment provenance after Remediation Preview.
- Replaced the incomplete local Preview snapshot with a shared analytical runtime snapshot boundary.
- Prevented Preview from changing Registry or Package revisions.
- Made duplicate-candidate detection consume explicit Inventory-owned rows.
- Removed Material-Master import-order effects from Inventory Data Quality.
- Added Inventory-first versus Material-Master-first determinism tests.
- Fixed Remediation Worklist scroll restoration through a stable DOM ID.
- Built provisional Package row counts from the explicit current build.
- Added best-effort Package import rollback.
- Hardened enrichment rollback and feedback ownership.
- Completed relationship and enrichment JSDoc contracts.
- Supplied the physical Relationship Engine, Enrichment Engine, Application Service and tests.
- Preserved Recovery, Action-rule and Data Quality formulas.

### Preserved

- deterministic Material + Plant matching
- controlled Material fallback
- Match Rate definition
- unmatched and ambiguous diagnostics
- fill-missing-only enrichment
- conflict preservation
- field-level provenance
- Registry ownership
- Package revision semantics
- Inventory Explorer
- Actions
- Data Foundation
- Preview / Apply
- Undo / Reset
- exports
- German / English
- Light / Dark Mode
- file:// local MVP

### Known Limitations

- no Consumption History
- no Purchase Order Package
- no Snapshot History
- no Package switcher
- no persistence
- no cross-package source-quality scoring
- no automatic conflict resolution
- no SAP connector
- no Predictive Analytics

## 2026-08-19 - AP 16.2b:
Inventory ↔ Material Master Enrichment

### Changed

- Added deterministic Inventory-to-Material-Master relationship matching.
- Added exact Material + Plant matching.
- Added controlled unique Material fallback.
- Added unmatched, ambiguous and invalid-key diagnostics.
- Added actual Inventory-to-Material-Master Match Rate.
- Added an explicit Material Master enrichment allowlist.
- Added fill-missing-only enrichment behavior.
- Prevented Material Master from overwriting Inventory and financial values.
- Added conflict diagnostics for differing Inventory and Material Master values.
- Added field-level Package and source-row provenance.
- Added enriched Material Master context to Inventory analytical rows.
- Added enriched planning and ownership context to Actions.
- Added relationship and enrichment metadata to the active Inventory Package.
- Added compact relationship results to Data Foundation.
- Added transactional enrichment rollback.
- Added indexed relationship matching for pilot-scale datasets.
- Added relationship, enrichment, integration and performance tests.
- Preserved existing Recovery and Data Quality semantics.

### Preserved

- Inventory Snapshot source ownership
- Material Master source ownership
- Data Package Registry
- Package identity and revision semantics
- Dataset Builder
- Mapping Engine
- Recovery Engine
- Data Quality Score
- Readiness calculations
- Issue Ledger
- Remediation lifecycle
- Action recommendation rules
- Preview / Apply
- Undo / Reset
- exports
- German / English
- Light / Dark Mode
- file:// local MVP

### Known Limitations

- no Consumption History
- no Purchase Order Package
- no Snapshot History
- no Package switcher
- no persistent Registry
- no cross-package financial KPIs
- no automatic conflict resolution
- no Material Master editing
- no SAP connector
- no Predictive Analytics

## 2026-08-19 - DF-UX-01:
Data Foundation Compact UX & Data Quality Final Polish

### Changed

- Replaced the large Overview Data Packages panel with a compact Data Foundation status in the Overview header.
- Separated source availability from relationship compatibility in the Data Foundation disclosure.
- Changed missing Material Master presentation to "Not Imported" / "Nicht importiert" without zero-row or dash metadata.
- Kept Material Master import connected to the existing Package Type upload flow.
- Moved technical package metadata into a collapsed technical-details disclosure.
- Removed false match-rate or join-completion wording from the Data Foundation UI.
- Kept Data Foundation visible only on Overview.
- Simplified the Data Quality header so dataset metadata appears once at the page level.
- Reduced Data Quality workspace context to the compact demo-data issue chip.
- Compactified the remediation filter area around search plus a filter disclosure.
- Hid the remediation result count unless filters/search are active.
- Hid Undo and Reset actions until an active remediation change exists.
- Clarified Data Quality export wording as remediation export and issue-log export.
- Preserved the Score tile as an explanatory control, not a filter.

### Preserved

- Data Package Registry behavior
- Material Master import semantics
- Relationship-readiness logic
- Data Quality issue detection
- Data Quality Score formula
- Issue Ledger
- Preview / Apply
- Undo / Reset semantics
- upload logic
- export logic
- sample data
- data parsing
- file:// local MVP behavior

### Known Limitations

- Superseded by AP 16.2b: Data Foundation now shows row-level relationship results after Material Master enrichment.
- Material Master import is session-only and not persisted across browser reloads.
- Invalid Material Master packages are rejected by the existing import transaction and are therefore not selectable as active sources.
- Data Quality remediation remains local and in-memory.

## 2026-08-19 - DQ-UX-02.3:
Primary Metric Consolidation & Overview Grid Closure

### Changed

- Removed the prominent Dataset Pilot Capability blocker panel from the primary Data Quality workflow.
- Removed the obsolete primary Readiness Health Card path.
- Combined the Data Quality Score and five issue categories into one operational metric row.
- Centered metric values and short labels consistently.
- Distinguished the explanatory Score tile from the issue-filter tiles.
- Preserved all existing Quick Filter values and behavior.
- Moved Analysis, Pilot and Workflow Readiness to secondary diagnostics.
- Preserved Pilot thresholds, state, blockers and technical capped score.
- Removed the redundant Overview Insight Strip.
- Removed obsolete Insight DOM rendering accesses.
- Added explicit Overview Grid Areas.
- Made Data Packages span the complete Overview width.
- Positioned category and Profit Center charts side by side.
- Made the Recovery preview span the complete width.
- Prevented the fifth Profit Center row from being clipped.
- Consolidated obsolete Health Card, Pilot blocker, Insight Strip and Grid CSS.
- Preserved all existing analytical, remediation and Registry behavior.

### Preserved

- Data Quality Score formula
- Analysis Readiness calculation
- Dataset Pilot Capability logic
- Pilot score cap
- Workflow calculation
- issue detection
- Quick Filter semantics
- Issue Ledger
- corrections and decisions
- Preview / Apply
- Undo / Reset
- Mapping Handoff
- Overview KPIs
- chart values
- Recovery preview
- Dataset Builder
- Data Package Registry
- exports
- German / English
- Light / Dark Mode
- file:// local MVP

### Known Limitations

- Readiness remains a technical diagnostic rather than an execution workflow.
- Data Packages are not redesigned in this block.
- charts remain primarily informational.
- no chart-click filtering in this block.
- no cross-package analytics.
- no Material Master capability in this block.

## 2026-08-19 - DQ-UX-02.2:
Decision Hierarchy, Dataset Readiness & Review Sheet Closure

### Changed

- Retained the established Cancel-before-Apply action order.
- Added operation-specific primary-action labels for decisions, corrections and master-data changes.
- Disabled the primary action until the existing draft validator reports a valid decision or correction.
- Combined selected impact and actions in one coherent Review footer.
- Moved Severity from a standalone metadata card beside the issue title.
- Standardized Severity badges across Worklist, issue cards and Review Sheet.
- Prioritized concrete exact-duplicate evidence over generic metadata.
- Reduced redundant Review metadata cards and nested frames.
- Consolidated repeated duplicate-exclusion guidance.
- Removed the duplicate decision question from the Preview/footer area.
- Prevented empty source-comparison containers from rendering.
- Added dynamic source-comparison disclosure labels.
- Strengthened selected decision-card presentation.
- Added concrete Worklist titles such as Material Number Missing and Stock Value Missing.
- Renamed Pilot Readiness presentation to Dataset Pilot Capability.
- Replaced the prominent capped Pilot percentage note with categorical state and concrete blockers.
- Retained the technical capped Pilot value under Score diagnostics.
- Clarified Workflow Readiness wording.
- Clarified that Demo Mode Score and Readiness assess the sample dataset.
- Preserved all existing Data Quality, Preview, Apply, Undo, Reset, Ledger, Mapping and Registry semantics.

### Preserved

- Data Quality Score formula
- Analysis Readiness logic
- Pilot thresholds and state
- Pilot adjusted/capped score
- Workflow calculation
- issue detection
- duplicate semantics
- Correction and Decision logic
- Issue Ledger
- Dataset Builder
- Mapping Engine
- Recovery Engine
- Data Package Registry
- Preview / Apply parity
- Undo / Reset
- exports
- language
- currency
- Light / Dark Mode
- file:// local MVP

### Known Limitations

- no AI Autofix
- no Bulk Remediation
- no persistence
- no SAP Write-back
- no new issue types
- no new Readiness dimensions
- no Material Master capability in this block

## 2026-08-19 - DQ-UX-02.1:
Alignment & Input-Type Isolation

### Fixed

- Moved the Pilot Readiness note out of the nested Readiness grid.
- Made the Pilot note span the complete Data Quality Health Card.
- Prevented the Pilot note from artificially increasing the Score-cell alignment height.
- Combined the Score and percent sign into one stable baseline-aligned value.
- Removed the negative-margin percent-positioning workaround.
- Changed the Demo Dataset notice from a content-width pill to a full-width information row.
- Consolidated duplicate Demo Notice CSS rules.
- Prevented Remediation radio and checkbox controls from inheriting full-width text-input styling.
- Restyled exact-duplicate decisions as left-aligned fully clickable option cards.
- Standardized exact-duplicate decision wording.
- Preserved arbitrary exact-duplicate group sizes.
- Preserved the no-default-decision rule.
- Preserved Preview, Apply, Undo, Reset, Issue Ledger and Dataset Builder behavior.

### Preserved

- Data Quality Score logic
- Analysis / Pilot / Workflow Readiness
- Pilot Readiness cap logic
- issue detection
- duplicate detection and normalization
- duplicate decision values
- Remediation lifecycle
- Issue Ledger
- Preview / Apply parity
- Undo / Reset
- Mapping Handoff
- Dataset Builder
- Data Package Registry
- exports
- German / English
- Light / Dark Mode
- file:// local MVP

### Known Limitations

- no new Data Quality capability
- no AI Autofix
- no Bulk Remediation
- no persistence
- no SAP Write-back
- no Material Master capability in this block

## 2026-08-19 - DQ-UX-02:
Responsive Workflow & Visual Hierarchy Closure

### Changed

- Restricted the full Data Packages panel to the Overview view.
- Removed repeated Package/status information from the Data Quality workflow.
- Corrected responsive header and navigation behavior at laptop and mobile widths.
- Prevented duplicate Sections and full-tab navigation on mobile.
- Converted mobile Quick Filters into a compact horizontal chip rail.
- Added a mobile Search-plus-Filter-disclosure workflow.
- Added purpose-built mobile remediation issue cards.
- Preserved the desktop remediation table.
- Removed page-level and Worklist horizontal scrolling on mobile.
- Made the Review Sheet a compact desktop sheet and a full-screen 100dvh mobile task view.
- Added safe-area and explicit scroll ownership to the mobile Review Sheet.
- Removed the outer Data Quality card-around-cards presentation.
- Reduced excessive borders, card nesting and technical typography.
- Corrected the Additional Diagnostics subtitle.
- Added dynamic metadata to all diagnostic disclosures.
- Consolidated duplicated Data Quality CSS and responsive breakpoints into an explicit DQ-UX-02 responsive contract.
- Preserved targeted filtering, Search focus and cursor behavior.
- Preserved all existing Data Quality, Remediation, Mapping, Preview, Undo, Reset and Export semantics.

### Preserved

- Data Quality Score
- Analysis / Pilot / Workflow Readiness
- issue detection
- Issue Ledger
- lifecycle semantics
- Corrections and Decisions
- Dataset Builder
- Mapping Engine
- Recovery Engine
- Data Package Registry
- Preview / Apply parity
- Undo / Reset
- exports
- horizontal desktop navigation
- German / English
- currency
- Light / Dark Mode
- file:// local MVP

### Known Limitations

- no AI Autofix
- no Bulk Remediation
- no persistence
- no SAP Write-back
- no new issue types
- no global product redesign
- no Package switching
- no Material Master capability in this block

## 2026-08-19 - DQ-UX-01:
Data Quality UX Polish & Interaction Stability

### Changed

- Combined Data Quality Score and Readiness states into one Health Card.
- Reduced visual card nesting and unnecessary whitespace.
- Improved the sample-data notice.
- Redesigned issue categories as compact accessible Quick Filters.
- Improved the Remediation filter bar and active-filter visibility.
- Added targeted Remediation result rendering.
- Preserved Search focus and cursor while filtering.
- Prevented filter interactions from rebuilding the full Data Quality page.
- Improved Worklist density, sticky header and result metadata.
- Added a compact Remediation progress footer.
- Reorganized Additional Diagnostics into a responsive disclosure grid.
- Reduced nested diagnostic panel styling.
- Restyled the existing issue dialog as a right-side Review Sheet.
- Added sticky Review header and footer behavior.
- Improved issue-specific decision controls.
- Added Remediation Sheet focus trapping and focus return.
- Improved responsive, Dark-Mode and reduced-motion behavior.
- Preserved all existing Data Quality, Remediation, Mapping, Preview, Undo, Reset and Export semantics.

### Preserved

- Data Quality Score logic
- Analysis / Pilot / Workflow Readiness
- issue detection
- Issue Ledger
- lifecycle semantics
- Correction and Decision logic
- Dataset Builder
- Mapping Engine
- Recovery Engine
- Data Package Registry
- Preview / Apply parity
- Undo / Reset
- exports
- horizontal navigation
- German / English
- currency
- dark mode
- file:// local MVP

### Known Limitations

- no AI Autofix
- no Bulk Correction
- no persistence
- no SAP Write-back
- no new issue types
- no multi-user workflow
- no global product redesign
- no Material Master capability in this block

## 2026-08-18 - AP 16.2a: Generic Data Package Import & Material Master Vertical Slice

### Changed

- Added generic Package Type selection to the upload flow.
- Added a DOM-independent Package Import Service.
- Added Material Master as the first non-Inventory Data Package.
- Added Package-type-specific Mapping Policy.
- Added Material Master validation and key-granularity detection.
- Registered Material Master Packages in the Data Package Registry.
- Preserved the active Inventory Snapshot and existing analytics.
- Added compact Data Package availability diagnostics.
- Added Material Master / Inventory relationship-readiness diagnostics.
- Added authoritative empty Issue Snapshot handling.
- Added strict non-coercing sourceIndex validation.
- Added duplicate physical source-header identity tests.
- Added Package Import, Material Master and Relationship Readiness tests.
- Preserved file:// and test-free production bootstrap.

### Preserved

- Inventory Snapshot upload flow
- Inventory Dataset Builder
- Recovery calculations
- Data Quality behavior
- Remediation lifecycle
- Issue Ledger
- Action logic
- Registry ownership and transactions
- formula-injection protection
- filters
- exports
- language
- currency
- dark mode

### Known Limitations

- Material Master does not yet enrich Inventory rows.
- No cross-package row join.
- No match-rate KPI.
- No Package switcher.
- No Snapshot History.
- No Consumption History.
- No Forecast.
- No Purchase Orders.
- No persistence.
- No SAP connector.
- No Predictive Analytics.

## 2026-08-18 - AP 16.1.1.1: Final Registry Acceptance Gate

### Fixed

- Corrected Mapping resolution when the final or only issue disappears.
- Distinguished missing current-issue evaluation from an explicitly empty current-issue snapshot.
- Required explicit final Quality Summary input for Package finalization.
- Hardened Package Quality Summary validation without numeric coercion.
- Required non-negative integer Issue Counts.
- Clarified and enforced required `rawScore` and `statusKey` contract.
- Removed implicit Data Quality recalculation from Package record creation.
- Treated evaluated empty Issue Snapshots as authoritative during final Package summary creation.
- Prevented hidden Data Quality detection during final Package summary compaction and Package commit.
- Enforced Package ownership across `packageId`, `datasetId` and `packageType`.
- Enforced Package ownership inside the physical Registry module.
- Restricted Relationship Keys to fields present in the approved active Mapping.
- Validated Mapping source identity against Source Column Metadata and `sourceIndex`.
- Added Package validation against approved Relationship Keys.
- Restricted Data Quality evaluation counters to test mode.
- Made generic Remediation rollback best-effort safe when rollback rendering fails.
- Added remediation-specific failure feedback.
- Added structured Registry, relationship-key, Package-finalization, rollback and 10,000-row scalability tests.
- Added JSDoc contracts for Registry, Package and Remediation transaction boundaries.
- Removed the unused `mappedCanonicalFieldSet()` alias.
- Removed the redundant `relationshipKeysFromMapping` test alias.

### Preserved

- Current visible single Inventory Snapshot UI.
- Data Package Registry and physical Registry module.
- Source Model, Source Ingestion, Canonical Model, Value Utils, Mapping Engine, Recovery Engine and Dataset Builder.
- Mapping Assistant, Data Quality, Remediation lifecycle semantics and Issue Ledger semantics.
- Action logic, filters, exports, Formula Injection protection, language, currency and dark mode.
- Local file-based MVP behavior without database, SAP connector, login or cloud runtime.

### Known Limitations

- Registry remains session-only.
- Active application globals still drive the visible Inventory Snapshot.
- No Package-switching UI, cross-package joins, Snapshot History or Delta Detection.
- No Data Coverage Score or persistent correction history.
- Issue Ledger and large transaction snapshots remain memory-intensive.
- Central click/router and `app.js` remain substantial.

## 2026-08-18 - AP 16.1.1: Registry Transaction & Contract Closure

### Fixed

- Deferred Package finalization until Mapping Actions and Issue Ledger synchronization are complete.
- Prevented Package Quality Summary from storing intermediate lifecycle state.
- Limited one logical Mapping operation to one Package revision.
- Added transactional Remediation rebuilds across Corrections, Decisions, Actions, History, Ledger, Application State and Registry.
- Rolled back failed Correction, Decision, Undo, Reset and Remediation Mapping operations.
- Added one shared Package-finalization boundary.
- Reused the final Data Quality result instead of recalculating it during Package creation.
- Restricted Relationship Keys to approved, importable and non-protected mappings.
- Preserved original `importedAt` across same-Package rebuilds.
- Separated `importedAt`, `updatedAt`, `builtAt` and `qualityEvaluatedAt` semantics.
- Extended active Package invariants to package type and Package Build Metadata.
- Revalidated Package invariants after Registry restore.
- Added explicit Registry session-retention behavior and stats.
- Used the Data Package Type Definitions import for active Inventory Snapshot invariants.
- Added physical Registry package and transaction regression tests.
- Preserved existing analytical and user-facing behavior.

### Preserved

- Current visible single Inventory Snapshot UI.
- Source Model.
- Source Ingestion.
- Canonical Model.
- Value Utils.
- Mapping Engine.
- Recovery Engine.
- Dataset Builder.
- Mapping Assistant.
- Data Quality.
- Remediation lifecycle semantics.
- Issue Ledger semantics.
- Action logic.
- Filters.
- Exports.
- Formula Injection protection.
- Language.
- Currency.
- Dark mode.
- Local file-based MVP behavior.

### Known Limitations

- Registry remains session-only.
- Active application globals still drive the visible Inventory Snapshot.
- No Package switching UI.
- No cross-package joins.
- No Snapshot History.
- No Delta Detection.
- No Data Coverage Score.
- No persistent correction history.
- Issue Ledger remains memory-intensive.
- Central click router remains large.
- `app.js` remains substantial.
- No database.
- No SAP connector.
- No Predictive Analytics.

## 2026-08-18 - AP 16.1: Multi-Dataset Foundation & Data Package Registry

### Changed

- Added the file-compatible Data Package Registry module.
- Added immutable Data Package type definitions.
- Added stable session-level package identities.
- Added explicit distinction between `packageId` and `datasetId`.
- Added source, mapping, build, quality, freshness and relationship metadata contracts.
- Added multiple package-record support.
- Added one active package per package type.
- Registered the current Inventory Snapshot as a Data Package.
- Preserved prior Inventory Snapshot packages after new uploads.
- Updated the existing package for same-dataset mapping and remediation rebuilds.
- Added Registry snapshot and restore support.
- Added Registry state to Dataset transaction rollback.
- Prevented failed loads from leaving phantom packages.
- Added Registry module and integration regression tests.
- Added no-dataset rollback zero-state rendering.
- Hardened explicit Dataset UI and Runtime Context metadata consistency.
- Verified the physical test package.
- Added `ARCHITECTURE.md` and `DATA_CONTRACT.md`.
- Added Product Spec references to the split architecture and data-contract documentation.

### Preserved

- current visible single-Inventory-Dataset UI
- Source Model
- Source Ingestion
- Canonical Model
- Value Utils
- Mapping Engine
- Recovery Engine
- Dataset Builder
- Mapping Assistant
- Data Quality
- Remediation lifecycle
- Issue Ledger
- Action logic
- filters
- exports
- Formula Injection protection
- language
- currency
- dark mode
- local browser MVP

### Known Limitations

- only Inventory Snapshot is connected to the visible analysis UI
- no cross-package joins
- no Snapshot History
- no Delta Detection
- no Data Coverage Score
- no Available Intelligence UI
- no persistent Registry
- no database
- no SAP connector
- no Predictive Analytics
- Issue Ledger remains memory-intensive
- central click router remains large
- `app.js` remains substantial

## 2026-08-18 - AP 15.5.1: Final Acceptance Closure

### Fixed

- Rerendered the restored analytical dataset after late Mapping finalization failures.
- Added DOM-level rollback validation for Mapping render, close and feedback failures.
- Ensured KPIs, charts, worklists, Inventory Explorer, Actions and Data Quality return to the restored dataset after late Mapping failures.
- Hardened the current-dataset runtime adapter against foreign Dataset IDs even when no active dataset exists.
- Changed Dataset UI synchronization to use its explicitly supplied Dataset Meta.
- Removed URL-query activation of internal test mode.
- Restricted test-mode activation to the dedicated pre-bootstrap test harness flag.
- Moved remaining remediation self-test helpers into the tests boundary.
- Disabled controlled fault injection outside test mode.
- Included and verified the complete file-compatible tests package.
- Verified structured PASS/FAIL reporting, including an injected temporary failure.
- Completed syntax, regression, product-browser and test-runner validation for the AP 15.5.1 closure.
- Finalized AP 15.5 acceptance status for the local MVP package.

### Preserved

- Source Model
- Source Ingestion
- Canonical Model
- Value Utils
- Mapping Engine
- Recovery Engine
- Dataset Builder
- Dataset Identity
- dataset-scoped corrections
- dataset-scoped decisions
- dataset-scoped remediation actions
- dataset-scoped Issue Ledger
- Mapping Assistant successful workflow
- Data Quality semantics
- Remediation lifecycle
- Action logic
- filters
- exports
- Formula Injection protection
- language
- currency
- dark mode
- local browser MVP

### Known Limitations

- one active business dataset in the current product UI
- no Data Package Registry
- no Snapshot History
- no Delta Detection
- no persistent correction history
- Issue Ledger still stores substantial row snapshots
- central click router remains large
- `app.js` remains substantial
- no database
- no SAP connector
- no Predictive Analytics

## 2026-08-18 - AP 15.5: Test Boundary & Production Bootstrap Separation

### Fixed

- Restored visible filter controls together with filter state after failed dataset transactions.
- Rebuilt valid filter options before applying restored values.
- Prevented rollback rendering from overwriting restored filter state with stale DOM controls.
- Restored dataset source, row, column and visible-count chips after rollback.
- Added a transactional Mapping Assistant apply flow.
- Suppressed intermediate load-success feedback during Mapping Apply.
- Rolled back dataset, mapping action, history, ledger, rendering and modal state after Mapping finalization failures.
- Required explicit Issue Ledger ownership in `DatasetRuntimeContext`.
- Prevented current-dataset adapters from representing another Dataset ID.
- Prevented non-current runtime contexts from borrowing visible-dataset rows, mappings or ledger state.
- Preserved initial sample-load error feedback.
- Prevented failed preparation from permanently consuming Dataset ID sequence values.
- Added a dedicated file-compatible test boundary.
- Added structured PASS/FAIL test reporting.
- Moved embedded application self-tests out of `app.js`.
- Removed full test-suite execution from normal production bootstrap.
- Added test-only controlled application hooks and fault injection.
- Reduced `app.js` production responsibilities and line count.
- Preserved existing business and analytical behavior.

### Preserved

- Source Model
- Source Ingestion
- Canonical Model
- Value Utils
- Mapping Engine
- Recovery Engine
- Dataset Builder
- dataset-scoped corrections
- dataset-scoped issue decisions
- dataset-scoped remediation actions
- dataset-scoped Issue Ledger
- Mapping Assistant behavior on successful loads
- Data Quality semantics
- Remediation lifecycle semantics
- Action logic
- filters
- exports
- Formula Injection protection
- language
- currency
- dark mode
- local file-based MVP

### Known Limitations

- one active business dataset in the product UI
- no Data Package Registry
- no Snapshot History
- no Delta Detection
- no persistent correction history
- Issue Ledger still stores extensive row snapshots
- central click router remains large
- `app.js` remains substantial despite test extraction
- no database
- no SAP connector
- no Predictive Analytics

## 2026-08-17 - AP 15.4.2.2: Failure Propagation & Runtime Context Closure

### Fixed

- Propagated dataset-load failure through automatic upload, text upload, file upload and Mapping Assistant flows.
- Prevented failed uploads from returning a loaded status.
- Prevented failed mapped loads from closing the Mapping Assistant.
- Prevented failed mapped loads from registering Mapping Actions or remediation history.
- Prevented success rendering and success feedback after failed dataset loads.
- Added rollback protection for dataset commit and post-commit finalization failures.
- Restored the previous coherent dataset, remediation, filter, action-status and ledger state after failed transactions.
- Added a complete `DatasetRuntimeContext` contract and current-dataset application adapter.
- Passed explicit runtime context through lifecycle, progress and ledger evaluation.
- Prevented non-current dataset lifecycle evaluation from borrowing rows, mapping or analytical state from the visible dataset.
- Changed the Dataset ID build invariant from a console assertion to a blocking error.
- Removed the unused current-dataset compatibility adapter instead of leaving dead architecture code.
- Added focused upload-failure, mapping-failure, rollback and non-current lifecycle regression checks inside the existing AP 15.4.2 test area.
- Kept analytical and business baselines unchanged.

### Preserved

- Source Model
- Source Ingestion
- Canonical Model
- Value Utils
- Mapping Engine
- Recovery Engine
- Dataset Builder
- dataset-scoped corrections
- dataset-scoped issue decisions
- dataset-scoped remediation actions
- dataset-scoped Issue Ledger
- Mapping Assistant behavior on successful loads
- Data Quality semantics
- Remediation lifecycle semantics
- Action logic
- filters
- exports
- spreadsheet formula protection
- language
- currency
- dark mode
- local browser MVP

### Known Limitations

- one active business dataset in the current UI
- no Data Package Registry
- no Snapshot History
- no Delta Detection
- no persistent correction history
- Issue Ledger still stores extensive row snapshots
- central click router remains large
- startup self-tests still remain in the production bootstrap until AP 15.5
- app.js remains large
- no database
- no SAP connector
- no Predictive Analytics

## 2026-08-17 - AP 15.4.2.1: Explicit Context & Transactional Commit Closure Gate

### Fixed

- Removed hidden application-state fallbacks from the pure correction compatibility function.
- Added a separately named current-dataset correction compatibility adapter.
- Required complete explicit correction contexts for domain compatibility checks.
- Passed explicit dataset identity and correction context through remediation action validity and lifecycle resolution.
- Prevented non-current dataset actions from being invalidated by the currently active UI dataset.
- Added local dataset preparation before active-state mutation.
- Deferred remediation reset until the next dataset has built successfully.
- Added a coherent dataset-state commit for raw rows, headers, source metadata, analytical build output and dataset metadata.
- Prevented failed dataset builds from leaving mixed old/new application state.
- Added a real Preview-versus-committed-Apply regression test.
- Verified that Preview does not mutate live application state or Issue Ledger state.
- Hardened nested buildMetadata immutability coverage for applied correction IDs and excluded source-row indexes.
- Clarified analytical determinism versus runtime build provenance.
- Verified the physical Dataset Builder package and prototype script order.
- Corrected architecture claims to match executed browser and file-based validation evidence.

### Preserved

- Dataset identity
- dataset-scoped corrections
- dataset-scoped issue decisions
- dataset-scoped remediation actions
- dataset-scoped mapping actions
- dataset-scoped history
- dataset-scoped Issue Ledger
- current-dataset Undo
- Mapping Assistant
- Source Model
- Source Ingestion
- Canonical Model
- Value Utils
- Mapping Engine
- Recovery Engine
- Dataset Builder calculations
- Data Quality behavior
- Remediation lifecycle semantics
- Action logic
- filters
- exports
- spreadsheet formula protection
- language
- currency
- dark mode
- local browser MVP

### Known Limitations

- one active business dataset in the current UI
- no Data Package Registry
- no Snapshot History
- no Delta Detection
- no persistent correction history
- Issue Ledger still stores extensive row snapshots
- central click router remains large
- startup self-tests remain in the application bootstrap
- app.js remains large
- no database
- no SAP connector
- no Predictive Analytics

## 2026-08-17 - AP 15.4.2: Dataset Identity Integrity & Package Acceptance Gate

### Fixed

- Corrected first-call legacy correction migration.
- Enforced one authoritative dataset identity across corrections, decisions, remediation actions and action payloads.
- Scoped active remediation actions to the current dataset.
- Scoped issue decisions to the current dataset.
- Scoped mapping changes and Undo selection to the current dataset.
- Added dataset identity to remediation history entries.
- Added dataset-scoped Issue Ledger identity.
- Prevented identical issue keys from colliding across datasets.
- Removed implicit global defaults from the pure correction compatibility function.
- Added an application adapter for current-dataset compatibility checks.
- Required all target rows of a grouped correction to exist.
- Prevented silent partial application of grouped corrections.
- Added atomic Dataset Build and Dataset Meta commit.
- Prevented a new build from mutating the previous dataset metadata.
- Hardened nested Build Metadata immutability.
- Added full Preview-versus-committed-Apply regression validation.
- Verified the physical Dataset Builder and prototype script package.
- Added package-level change and test evidence.

### Preserved

- Source Model
- Source Ingestion
- Mapping Engine
- Canonical Model
- Value Utils
- Recovery Engine
- Dataset Builder calculations
- Mapping Assistant
- Data Quality behavior
- Remediation lifecycle semantics
- Action logic
- filters
- exports
- formula-injection protection
- language
- currency
- dark mode
- local browser MVP

### Known Limitations

- one active business dataset in the UI
- no Data Package Registry
- no Snapshot History
- no Delta Detection
- no persistent correction history
- Issue Ledger stores substantial row snapshot data
- central click router remains large
- startup self-tests remain in application bootstrap
- `app.js` remains large
- no database
- no SAP connector
- no Predictive Analytics

## 2026-08-17 - AP 15.4.1: Dataset Builder Integration & Safety Gate

### Fixed

- Verified and integrated the physical Dataset Builder module.
- Verified Dataset Builder script loading before `app.js`.
- Kept explicit module-load validation for the Dataset Builder.
- Verified Dataset Builder independence from DOM and application UI state.
- Added session-level dataset identity.
- Scoped data corrections and mapping changes to the current dataset.
- Replaced implicit global correction-compatibility checks with explicit dataset context.
- Prevented corrections from one dataset being applied to another dataset with matching row numbers or headers.
- Committed complete immutable `buildMetadata` to `currentDatasetMeta`.
- Added Dataset Builder integration and package-level regression tests.
- Verified Raw Source immutability.
- Verified duplicate source-header correction identity.
- Verified Preview / Apply parity.
- Removed proven dead declarations after project-wide reference analysis.
- Completed browser and file-based integration validation where supported.

### Preserved

- Canonical Model
- Value Utils
- Source Model
- Source Ingestion
- Mapping Engine
- Recovery Engine
- Dataset Builder analytical semantics
- Mapping Assistant
- Data Quality
- Remediation lifecycle
- Issue Ledger
- Action logic
- filters
- exports
- formula-injection protection
- language
- currency
- dark mode
- local browser MVP

### Known Limitations

- one active business dataset only
- no Data Package Registry
- no Snapshot History
- no Delta Detection
- no persistent correction history
- Issue Ledger snapshots may consume significant memory
- central click router remains large
- startup self-tests remain in the application path
- `app.js` remains large
- no database
- no SAP connector
- no Predictive Analytics

## 2026-08-17 - AP 15.3.1: Code Health Hotfix & Safety Gate

### Fixed

- Synchronized Overview filter controls with the actual Overview filter state when selected values disappear.
- Added missing German and English translations for corrected value and field type.
- Removed duplicate translation properties.
- Corrected null-guard ordering in `defaultCorrectionDraft()`.
- Added centralized spreadsheet formula-injection protection for exported customer text.
- Preserved numeric export values while neutralizing dangerous text formulas.
- Debounced expensive remediation-preview calculations during rapid input.
- Cancelled pending previews when remediation context changes or closes.
- Hardened settings persistence when `localStorage` is unavailable.
- Removed proven dead functions and constants after reference analysis.
- Added focused regression checks for the hotfix defects.

### Preserved

- Source Model
- Source Ingestion
- Mapping Engine
- Canonical Model
- Recovery Engine
- Mapping Assistant
- Recovery calculations
- Data Quality
- Remediation lifecycle
- Issue Ledger
- Action logic
- filters
- exports
- language
- currency
- dark mode
- file:// local MVP

### Known Limitations

- `app.js` remains large.
- Dataset Builder is already present in the current project state, but this hotfix did not extend AP 15.4 scope.
- Data Quality and Remediation remain in `app.js`.
- Issue Ledger snapshots may consume significant memory for large datasets.
- The central click router remains large.
- Self-tests still run through the current application test path.
- No database.
- No SAP integration.
- No Snapshot History.
- No Predictive Analytics.

## 2026-08-17 - AP 15.4: Dataset Build & Analytical State Boundary

### Changed

- Added explicit Dataset Builder module.
- Unified analytical dataset construction across initial load, corrections, mapping rebuilds and previews.
- Separated deterministic dataset building from application state commits.
- Extracted deterministic source-correction application.
- Extracted deterministic canonical-override application.
- Extracted analytical inventory enrichment from Action logic.
- Preserved AP 13.2.1 technical row-key semantics.
- Preserved explicit zero stock-value semantics.
- Added immutable build metadata.
- Added Dataset Builder regression tests.
- Refactored `loadDataset()` to consume Dataset Builder output.
- Refactored remediation rebuilds to consume Dataset Builder output.
- Changed remediation preview to use the same Dataset Builder as Apply.
- Removed duplicated analytical build logic.
- Separated data pipeline semantics from workflow/lifecycle decisions.
- Standardized Mapping Engine object-style public API.
- Fixed compact magnitude parsing for values such as `1,2 Mio.` in the shared value utility.

### Preserved

- source data immutability
- Source Model
- Source Ingestion
- Mapping Engine
- Canonical Model
- Value Utils
- Recovery Engine
- Mapping Assistant
- Data Quality
- Remediation lifecycle
- Issue Ledger
- Action recommendations
- Action status
- filters
- exports
- language
- currency
- dark mode
- file:// local MVP

### Known Limitations

- one active business dataset only
- no Multi-Dataset relationship model
- no Snapshot History
- no Delta Detection
- no persistent outcome tracking
- no database
- no SAP connector
- no Predictive Analytics
- Data Quality remains application-side
- Action Engine remains application-side

## 2026-08-14 - AP 15.3: Data Ingestion & Mapping Boundary Extraction

### Changed

- Added explicit Source Model module.
- Extracted deterministic source-column metadata and duplicate-header handling.
- Added shared parsed-source dataset construction.
- Extracted CSV/TSV parsing.
- Extracted browser XLSX parsing.
- Replaced UI-dependent XLSX errors with technical ingestion errors plus application-side localization.
- Added explicit Mapping Engine module.
- Extracted automatic mapping proposal logic.
- Extracted mapping status/confidence evaluation.
- Extracted mapping validation.
- Extracted approved mapping application.
- Added explicit Mapping Policy.
- Added source-ingestion and mapping-engine module integrity checks.
- Migrated pure mapping regression tests to module APIs.
- Preserved file:// local prototype execution.
- Reduced ingestion/mapping domain responsibility in `app.js`.

### Preserved

- Canonical Model.
- Value Utils.
- Recovery Engine.
- Raw source immutability.
- Duplicate source headers.
- Mapping proposals.
- Mapping validation semantics.
- Mapping Assistant UX.
- Mapping remediation.
- Mapping Undo / Reset.
- Data Quality.
- Remediation lifecycle.
- Recovery Waterfall.
- Actions.
- Filters.
- Exports.
- German / English.
- Currency.
- Dark mode.

### Known Limitations

- `loadDataset()` remains in `app.js`.
- Analytical dataset build remains stateful.
- Data Quality remains in `app.js`.
- Remediation remains in `app.js`.
- Action Engine remains in `app.js`.
- UI rendering remains in `app.js`.
- Export remains in `app.js`.
- No Multi-Dataset ingestion.
- No Snapshot History.
- No persistent mapping profiles.
- No SAP connector.
- No Predictive Analytics.

## 2026-08-14 - AP 15.2: Controlled Modularization & Application Boundaries — Phase 1

### Changed

- Hardened filter-scope update contracts before module extraction.
- Added explicit Remediation active-filter scope handling.
- Standardized scoped filter getter semantics so getters return snapshots instead of mutable state.
- Introduced the `window.ObsoliQ` module namespace for file-compatible classic-script modules.
- Extracted the canonical inventory data contract from `app.js`.
- Extracted deterministic value-normalization utilities from `app.js`.
- Extracted core Recovery calculation, waterfall cap and invariant validation logic from `app.js`.
- Added explicit module integrity checks before app initialization.
- Added direct module regression tests for canonical mapping, value parsing and Recovery behavior.
- Updated `prototype.html` script loading while preserving local browser execution.
- Reduced analytical domain responsibility inside `app.js`.
- Renamed the active technical Data Quality summary renderer from legacy wording to `renderTechnicalDataSummary()`.

### Preserved

- Upload behavior.
- Sample data.
- Canonical semantics.
- Mapping behavior.
- Recovery Waterfall.
- Recovery cap.
- Data Quality detection.
- Remediation lifecycle.
- Undo / Reset.
- Action logic.
- Filter behavior.
- Rendering behavior.
- Exports.
- Language switching.
- Currency switching.
- Dark mode.
- Local browser MVP usage.

### Known Limitations

- `app.js` remains the primary application orchestrator.
- Mapping remains inside `app.js`.
- Data Quality Detection remains inside `app.js`.
- Remediation remains inside `app.js`.
- UI Rendering remains inside `app.js`.
- Translations remain inside `app.js`.
- Export remains inside `app.js`.
- No Multi-Dataset architecture yet.
- No Snapshot History.
- No Value Tracking.
- No Predictive Analytics.
- No SAP integration.

## 2026-08-14 - AP 15.1.1: Render Boundary & Filter Scope Completion

### Fixed

- Prevented intermediate rendering during dataset loading.
- Removed unnecessary dataset-wide rendering for UI-only state changes.
- Changed Action status updates to targeted rendering.
- Treated currency and language changes as presentation updates rather than dataset mutations.
- Decoupled Data Quality dataset context from Overview filters.
- Clarified per-view data source ownership.
- Hardened scoped filter-state helpers.
- Prevented filter resets from affecting unrelated views.
- Removed the remaining `renderAll()` compatibility wrapper.
- Added render-boundary and filter-scope regression tests.

### Preserved

- Recovery calculations.
- Recovery Waterfall.
- Canonical model.
- Mapping Assistant.
- Data Quality detection.
- Remediation lifecycle.
- Issue Ledger.
- Undo / Reset.
- Inventory Explorer.
- Actions logic.
- Exports.
- Language switching.
- Currency switching.
- Dark mode.
- Local browser MVP behavior.

### Known Limitations

- `app.js` remains physically monolithic.
- State remains partially root-level.
- No ES module split yet.
- No multi-dataset architecture.
- No Snapshot History.
- No Value Tracking.
- No Predictive Analytics.
- No SAP integration.

## 2026-08-14 - AP 15.1: Architecture Stabilization & Technical Debt Cleanup

### Changed

- Removed the obsolete Split View HTML, JavaScript rendering path, event listeners and CSS.
- Removed hidden legacy Data Quality filter DOM and decoupled visible Data Quality table filters from hidden inputs.
- Consolidated filter ownership by moving Overview filters into the root `filterState` and removing the `uiFilters` alias.
- Added scoped filter helpers for reading, updating, resetting and checking active filters.
- Introduced view-specific render boundaries and kept `renderAll()` only as a compatibility wrapper.
- Removed the legacy undo fallback so current remediation undo uses the unified remediation action stack.
- Added lightweight architecture self-tests for scoped filters, Data Quality filter state and remediation action stack behavior.
- Cleaned redundant scrollbar CSS after Split View removal.

### Preserved

- Recovery calculation formulas, waterfall order and cap semantics.
- Canonical field semantics and mapping behavior.
- Data Quality issue detection and remediation lifecycle semantics.
- Upload logic.
- Sample data loading.
- Inventory export behavior.
- Current visible workflows and UI design.
- Local file-based prototype behavior.

### Known Limitations

- `app.js` remains a large single-file application until controlled modularization is performed.
- Several global state variables remain by design for this conservative cleanup.
- View-specific rendering boundaries exist, but deeper module separation is not implemented yet.
- Browser console still reports existing ObsoliQ Recovery Validation domain errors for deliberate invalid self-test/sample scenarios; these are not JavaScript exceptions.

## 2026-08-14 - AP 14.3.1.7: Lifecycle Precedence & Resolution Semantics Completion

### Fixed

- Changed lifecycle precedence to use the latest active valid remediation action instead of fixed decision/correction/mapping priority.
- Ensured current data condition remains authoritative for corrected status.
- Corrected lifecycle transitions from Reviewed, Accepted Missing and Keep as Valid to later true corrections.
- Added mixed corrected/accepted grouped-resolution semantics.
- Prevented mixed accepted groups from being classified as fully corrected.
- Hardened source-correction compatibility after canonical remapping.
- Added safe stale-correction reactivation after mapping Undo.
- Added explicit accepted-variation handling for inconsistent master data.
- Added actual resolved-issue attribution for mapping actions based on before/after issue detection.
- Fixed reopened issue lifecycle timestamps.
- Improved historical remediation details with human-readable original/change/result descriptions.
- Updated Product Spec next-work-block recommendation to Architecture Stabilization.

### Preserved

- Immutable raw source rows.
- Stable issue keys.
- Issue ledger.
- Remediation action stack.
- Mapping Undo / Reset.
- Multi-row resolution logic.
- Duplicate detection.
- 3+ exact duplicate support.
- Data Quality Score.
- Analysis / Pilot / Workflow Readiness.
- Recovery calculation.
- Column Mapping Assistant.
- Inventory Explorer.
- Actions.
- Exports.
- Dirty sample dataset.
- German / English support.
- Local browser MVP scope.

### Known Limitations

- Remediation history remains session-only.
- No persistent correction history.
- No database.
- No SAP write-back.
- No reusable cleansing profiles.
- No cross-field consistency checks.
- No plausibility / outlier detection.
- No freshness checks.
- No bulk remediation.
- Architecture cleanup not yet performed.

## 2026-08-14 - AP 14.3.1.6: Remediation Lifecycle Integrity & Multi-Row Resolution Hardening

### Fixed

- Added unified remediation action tracking across data corrections, issue decisions and mapping changes.
- Added Undo and Reset support for remediation-driven mapping changes.
- Added baseline mapping restoration.
- Added issue-ledger reconciliation after mapping and data remediation.
- Added correct lifecycle handling when mapping changes resolve Data Quality issues.
- Added read-only review of historical resolved issues.
- Added ledger snapshots for historical issue traceability.
- Added generalized multi-row partial-resolution logic.
- Prevented grouped issues from being marked corrected after only one affected row is fixed.
- Added complete lifecycle handling for inconsistent master-data issues.
- Added support for exact duplicate groups with more than two rows.
- Removed default decisions from possible duplicate review.
- Ensured Reviewed issues remain unresolved.
- Unified duplicate detection and comparison normalization.
- Extended remediation history and issue-log export with mapping-change resolutions.
- Updated Data Quality fallback subtitle.

### Preserved

- Immutable original raw source data.
- Existing Data Quality issue detection.
- Stable issue keys.
- Data Quality Score.
- Analysis / Pilot / Workflow Readiness.
- Remediation preview.
- Column Mapping Assistant.
- Inventory Explorer.
- Actions.
- Recovery waterfall.
- Recovery cap.
- Corrected-data export.
- Dirty built-in sample dataset.
- German / English support.
- Local browser-based MVP scope.

### Known Limitations

- Remediation history remains session-only.
- No persistent correction profiles.
- No SAP write-back.
- No cross-field consistency rules yet.
- No plausibility / outlier detection yet.
- No freshness checks yet.
- No bulk remediation rules yet.
- No reusable cleansing profiles yet.

## 2026-08-10 - AP 14.3.1.4: Data Quality UX & Issue-Specific Remediation Flow

### Changed

- Reorganized Data Quality around a remediation-first information hierarchy.
- Added compact Data Quality, Analysis, Pilot and Workflow status strip.
- Moved technical Data Check controls out of the primary visible flow.
- Collapsed technical diagnostics behind secondary disclosure sections.
- Simplified remediation summary metrics to open issues, critical/high issues, missing data, invalid data and duplicates.
- Added clickable issue summary filters.
- Added unified remediation search to the primary filter toolbar.
- Simplified the primary issue worklist to severity, issue, affected rows, impact/context, status and action.
- Removed generic one-click acceptance from the worklist.
- Added issue-specific remediation detail layouts.
- Simplified exact-duplicate review to focus on source-value match, row comparison, row selection and KPI impact.
- Added difference-first review for possible duplicate candidates.
- Collapsed preserved source-context columns by default under Additional Source Columns.
- Reduced modal metadata density and improved laptop-focused layout.
- Improved localized issue terminology in German and English.

### Preserved

- Existing Data Quality detection semantics.
- Stable issue identities.
- Immutable raw source data.
- Correction overlay architecture.
- Canonical overrides.
- Mapping Assistant integration.
- Remediation preview.
- Data Quality Score logic.
- Analysis / Pilot / Workflow Readiness logic.
- Recovery calculation.
- Exports.
- Undo / reset.
- Dirty sample dataset.
- Local browser-based MVP scope.

### Known Limitations

- No bulk remediation rules.
- No reusable cleansing profiles.
- No persistent remediation history.
- No SAP write-back.
- No cross-field consistency rules yet.
- No statistical outlier detection yet.
- No dataset freshness checks yet.

## 2026-08-10 - AP 14.3.1.3: Remediation Integrity, Issue Lifecycle & UX Stabilization

### Fixed

- Preserved duplicate source headers without source-value overwrite.
- Added stable source-column identities based on source position.
- Replaced volatile sequential Data Quality issue identities with deterministic issue keys.
- Fixed remediation preview for pending canonical overrides and mapping changes.
- Separated issue decisions from actual data corrections.
- Corrected Reviewed, Accepted Missing, Accepted Exception, Ignored and Keep as Valid semantics.
- Simplified issue remediation controls using progressive disclosure.
- Replaced per-row text syntax with editable row-value inputs for missing-data remediation.
- Added manual-value support for inconsistent master-data remediation.
- Improved classification of mapping candidates, preserved source context and true unknown columns.
- Corrected remediation summary metrics and issue-log decision traceability.
- Separated Data Quality Score from Pilot Readiness.
- Added unresolved issue impact to Data Quality scoring.
- Hardened transaction-level evidence checks for possible duplicate bookings.
- Improved German localization of newly introduced remediation texts.

### Preserved

- Immutable original raw source data.
- Existing Column Mapping Assistant.
- Existing correction overlay.
- Recovery waterfall and cap logic.
- Existing Overview.
- Inventory Explorer.
- Actions.
- Exports.
- Data Quality issue types.
- Dirty built-in sample dataset.
- German / English support.
- Local browser-based MVP scope.

### Known Limitations

- Corrections and issue decisions remain session-only.
- No SAP write-back.
- No persistent correction history.
- No reusable cleansing rules yet.
- No persistent mapping profiles.
- No AI-generated corrections.
- No production duplicate-booking confirmation without document-level source data.

## 2026-08-10 - AP 14.3.1.2: Dirty Sample Dataset & Remediation Demo Coverage

### Changed

- Added deliberate data-quality gaps and errors to the built-in sample dataset.
- Added missing Material and Stock Value examples.
- Added missing organizational, recovery and workflow examples.
- Added invalid numeric and negative recovery-input examples.
- Added an invalid Material identifier example.
- Added an exact duplicate source row.
- Added a duplicate business-key candidate.
- Added inconsistent master-data values.
- Added an intentionally unmapped Factory source column for mapping remediation.
- Allowed the Factory mapping remediation to proceed when unrelated pre-existing duplicate-header warnings are present.
- Added sample-data issue expectations and regression checks.
- Added an informational Data Quality note for the built-in demo dataset.
- Ensured reloading sample data restores the original dirty demo state.

### Preserved

- Majority of sample data remains valid.
- Management KPIs and charts remain usable.
- Existing recovery logic.
- Existing Data Quality detection logic.
- Existing Column Mapping Assistant.
- Existing remediation correction architecture.
- Immutable source-data behavior during correction.
- Existing local browser-based MVP scope.

### Known Limitations

- Demo defects are deterministic and intentionally constructed.
- They are designed for product demonstration, not statistical realism.
- No SAP write-back or persistence is introduced.
- Customer uploads are never deliberately modified.

## 2026-08-10 - AP 14.3.1.1: Universal Manual Missing-Data Resolution

### Changed

- Added manual canonical-field corrections that do not require an existing source column.
- Added explicit resolution-method selection for missing-data issues.
- Added direct source-column mapping from Data Remediation.
- Added selectable canonical target fields for grouped organization, recovery and workflow issues.
- Added row-level, selected-row and all-affected correction scope.
- Added individual per-row values for grouped missing issues.
- Added explicit Accept Missing resolution.
- Added partially resolved issue state and progress.
- Added type-aware manual correction controls.
- Added safe same-material suggestions for non-financial context and workflow fields.
- Added canonical override traceability to history and exports.
- Ensured required-field issues always provide mapping, manual-entry or row-exclusion paths.

### Preserved

- Immutable original raw rows.
- Existing Column Mapping Assistant.
- Existing Data Quality Remediation Workspace.
- Existing duplicate safeguards.
- Existing recovery Waterfall and stock-value cap.
- Existing Action status preservation.
- Existing undo and reset behavior.
- Existing German and English localization.
- Existing local browser-based scope.

### Known Limitations

- Corrections remain session-only.
- No persistent correction profiles.
- No SAP write-back.
- No AI-generated missing values.
- Financial values are never automatically imputed.
- Reusable cleansing rules are not implemented yet.

## 2026-08-04 - AP 14.3.1: Data Quality Remediation Workspace Core Flow

### Changed

- Added a structured Data Quality issue registry.
- Added exact duplicate-row detection.
- Added duplicate business-key candidate detection without automatic deletion.
- Added remediation for missing and invalid values.
- Added inconsistent master-data diagnostics and correction controls.
- Added a session-only correction overlay while preserving original raw rows.
- Added correction preview with row-count, inventory-value and recovery-potential impact.
- Added correction history, undo and reset behavior.
- Added corrected-dataset export and Data Quality issue-log export.
- Added original versus corrected Data Quality Score comparison.
- Integrated remediation with approved column mappings and existing Action status preservation.

### Preserved

- Original uploaded raw data.
- Existing Column Mapping Assistant.
- Existing automatic alias mapping.
- Existing recovery waterfall and stock-value cap.
- Existing Recovery Input Normalization.
- Existing Data Quality Score and Readiness diagnostics.
- Existing Overview, Inventory Explorer, Actions, filters and exports.
- Existing local browser-based scope.
- Existing German and English localization.

### Known Limitations

- Corrections are session-only.
- No database-backed correction history exists.
- No SAP write-back exists.
- Duplicate business-key candidates are not automatically removed.
- Confirmed SAP double-booking detection requires transaction-level fields.
- Bulk correction rules and reusable cleansing profiles are not implemented yet.
- Full enterprise audit trails and approval workflows are not implemented.

## 2026-08-03 - AP 14.2.1.1: Column Mapping Assistant Stabilization

### Fixed

- Hardened Mapping Assistant DOM integration and startup event registration.
- Fixed duplicate conflict counting in the Mapping Assistant summary.
- Restored automatic match type and confidence when users return to the proposed mapping.
- Made Inventory Explorer labels and filter behavior aware of approved manual mappings.
- Corrected grouped organizational, recovery and workflow completeness calculations.
- Added distinct mapped, kept-source, protected and conflict summary counts.
- Improved Mapping Assistant focus behavior and keyboard accessibility.
- Preserved local action statuses during same-dataset remapping.
- Updated Mapping Transparency to distinguish automatic proposals from approved mappings.
- Corrected Product Spec inconsistencies around unknown columns and required-field blocking.

### Preserved

- Existing automatic alias mapping.
- Existing canonical inventory field registry.
- Existing pending-upload protection.
- Existing recovery calculation and Waterfall logic.
- Existing Data Quality Score and Readiness diagnostics.
- Existing Overview, Inventory Explorer, Actions, filters and exports.
- Existing German and English localization.
- Existing local browser-based MVP scope.

### Known Limitations

- Mapping profiles are not persisted across browser sessions.
- Customer-specific mapping profiles are not implemented yet.
- Worksheet and header-row selection are not implemented.
- SAP extract templates are not implemented.
- Semantic or AI-based mapping suggestions are not implemented.
- Action statuses remain local and session-only.
- Full enterprise accessibility certification is not included.

## 2026-08-03 - AP 14.2.1: Interactive Column Mapping Assistant Core Flow

### Changed

- Added an interactive Column Mapping Assistant for uploaded files.
- Added automatic source-to-canonical mapping proposals.
- Added manual correction of source-column mappings.
- Added required-field validation and conflict detection.
- Added representative sample values for mapping review.
- Added session-only approved mapping state.
- Added mapping review from the Data Quality page.
- Preserved unknown columns as source columns.
- Preserved protected derived-field collision handling.
- Updated Mapping Transparency to reflect approved mappings.

### Preserved

- Existing local file-based upload behavior.
- Existing canonical inventory field registry.
- Existing Recovery Input Normalization.
- Existing Data Quality Score and Readiness diagnostics.
- Existing recovery waterfall and stock-value cap.
- Existing Overview, Inventory Explorer, Actions, filters and exports.
- Existing German and English localization.
- Existing non-blocking warning behavior.

### Known Limitations

- Mapping profiles are not persisted across browser sessions.
- Customer-specific mapping profiles are not implemented yet.
- Worksheet and header-row selection are not implemented.
- SAP extract templates are not implemented.
- Semantic or AI-based mapping suggestions are not implemented.
- Required-field mapping errors must be corrected manually.

## 2026-08-03 - AP 14.1.3: Data Quality Transparency and Export Alignment

### Changed

- Added visible diagnostics for recovery input normalization.
- Added warnings for negative or invalid recovery input values treated as zero.
- Added direct no-demand source fields to recovery and action exports.
- Fixed `stock_value` fallback logic so valid zero inventory values are not overwritten.
- Added Analysis Readiness and Workflow Readiness alongside Pilot Readiness.
- Improved Data Quality score explanation without changing the existing non-blocking upload behavior.
- Clarified no-demand aggregation formula in the Product Spec.

### Preserved

- Existing upload behavior.
- Existing local file-based MVP scope.
- Existing recovery cap and waterfall logic.
- Existing Overview, Inventory Explorer, Actions, filters and exports.
- Existing visible Data Quality diagnostics.
- Non-blocking Data Quality behavior.

### Known Limitations

- Column Mapping Assistant is still not interactive.
- Mapping profiles are not persisted.
- Uploads are still not blocked by data quality issues.
- SAP extract contract is still not production-validated.
- Recovery input normalization is diagnostic and not yet user-configurable.

## 2026-08-03 - AP 14.1.2: Data Quality Score Calibration and Recovery Input Hardening

### Changed

- Hardened direct no-demand source aggregation so negative or invalid no-demand inputs do not create negative calculated `no_need_value`.
- Added `direct_no_need_value` to currency-field handling.
- Calibrated Data Quality Score with Pilot Readiness caps.
- Improved recovery input quality diagnostics.
- Improved organizational assignment diagnostics.
- Added score-cap explanation to the Data Quality score breakdown.
- Updated Overview terminology to reflect the filterable Recovery Worklist.

### Preserved

- Existing upload behavior.
- Existing local file-based MVP scope.
- Existing recovery cap and waterfall logic.
- Existing Overview, Inventory Explorer, Actions, filters and exports.
- Existing visible Data Quality diagnostics.

### Known Limitations

- Column Mapping Assistant is still not interactive.
- Mapping profiles are not persisted.
- Uploads are still not blocked by data quality issues.
- SAP extract contract is still not production-validated.

## 2026-08-03 - AP 14.1.1: Data Quality Hardening

### Changed

- Fixed Product Spec inconsistency around visible recovery validation diagnostics.
- Hardened no-demand source-field handling.
- Added content-level quality checks for required, organizational, recovery and workflow fields.
- Added Pilot Readiness status.
- Added score breakdown for Data Quality Score.
- Improved unknown-column diagnostics.

### Preserved

- Existing upload behavior.
- Existing local file-based scope.
- Existing recovery calculation cap logic.
- Existing Overview, Inventory Explorer, Actions, filters and exports.

### Known Limitations

- Column Mapping Assistant is still not interactive.
- Mapping profiles are not persisted.
- Uploads are still not blocked by quality issues.
- SAP extract contract is still not production-validated.

## 2026-08-03 - AP 14.1: Data Quality Score and Mapping Transparency

### Changed

- Added a visible Data Quality Score.
- Added field coverage for required, recommended, recovery and workflow fields.
- Added mapping transparency from source columns to canonical ObsoliQ fields.
- Added visibility for unknown source columns.
- Added visible recovery validation diagnostics on the Data Quality page.

### Preserved

- Existing upload behavior.
- Existing recovery calculation logic.
- Existing exports.
- Existing Overview, Inventory Explorer and Actions behavior.
- Local file-based MVP scope.

### Known Limitations

- The Column Mapping Assistant is not interactive yet.
- Mapping profiles are not persisted.
- Uploads are not blocked by missing fields yet.
- Recovery validation errors are diagnostic only.

## 2026-07-31 - AP 13.2.1: Canonical Data Model Stabilization

### Fixed

- Corrected `pup_pmp` to remain a text field.
- Corrected the technical row key to use only the originally mapped profit center.
- Preserved plant and division as operational profit-center fallbacks without using them in the row key.
- Restored the previous visible Inventory Explorer column labels.
- Added regression tests for PUP/PMP values, row-key fallbacks and visible-label preservation.

### Preserved

- Existing recovery calculation and validation.
- Existing upload, filter, navigation and export behavior.
- Existing user interface and column order.

## 2026-07-31 - AP 13.2: Canonical Inventory Data Model

### Changed

- Added a central field registry for known inventory, recovery, workflow and context fields.
- Added field types, requirement levels, bilingual labels and source-column aliases.
- Generated numeric-field handling and header normalization from the canonical registry.
- Added startup validation for duplicate alias assignments and invalid field definitions.
- Protected derived ObsoliQ fields from being overwritten by uploaded columns.
- Added a technical inventory row key using material and profit center with a row-number fallback.
- Added data-model self-tests for aliases, protected fields, leading zeros and row keys.
- Documented the canonical inventory data contract in the product specification.

### Preserved

- Existing visible user interface and layout.
- Upload and sample-data behavior.
- Existing recovery calculation and validation logic.
- Filters, navigation and exports.
- Original source columns in the Inventory Explorer.

### Known Limitations

- The canonical model is not yet a validated SAP extract contract.
- The Column Mapping Assistant and mapping-profile persistence are not implemented yet.
- The production row key will require more granular SAP organizational and stock-bucket fields.

## 2026-07-31 - AP 13.1.1: Recovery Transparency and Dataset Validation

### Changed

- Added recovery calculation transparency fields to recovery and action exports.
- Added dataset-level validation after every sample-data or file load.
- Added validation for recovery caps, net allocations, overlap and remaining inventory values.
- Added localized export values for the recovery capped flag.
- Added dataset validation self-tests.

### Clarified

- The waterfall calculation caps and prioritizes recovery values.
- It prevents recovery values from exceeding the available inventory value.
- It does not prove whether source-system categories overlap economically without more detailed source data.

### Preserved

- Existing user interface and layout.
- Upload behavior.
- Filters and navigation.
- Raw excess, blocked / QI, no-demand and unplanned values.
- Existing Waterfall priority.

## 2026-07-30 - AP 13.1: Recovery Calculation Foundation

### Changed

- Capped Recovery-Potenzial against the available stock value per row.
- Added a prioritized waterfall allocation and stock-value cap to prevent the calculated recovery potential from exceeding the available inventory value.
- Preserved the raw category values for excess, blocked / QI, no-demand and unplanned inventory.
- Added gross, net and overlap fields for recovery calculation transparency.

### Preserved

- Upload logic.
- Filtering and navigation behavior.
- Export dialog behavior.
- Existing layout, HTML and CSS.

## 2026-07-13 - AP 12.6: Action Cockpit Export and Documentation

### Changed

- Updated Maßnahmen export columns to include operational action fields.
- Added export labels for root cause, recommended action, next step, decision type, owner function, priority, confidence and status.
- Improved German and English labels for the Action Cockpit export.
- Documented the Action Cockpit MVP scope.

### Preserved

- Upload logic.
- Data parsing.
- Sample data loading.
- Core KPI calculations.
- Local file-based prototype behavior.
- Full inventory export behavior.

### Known Limitations

- Status tracking is local/in-memory only.
- No persistent database exists yet.
- No SAP integration exists yet.
- No workflow integration exists yet.
- Rule recommendations are MVP assumptions and must be validated with real customer data.

## 2026-07-13 - Work Block 11: Top-Recovery Action Cockpit

### Changed

- Added action fields to top recovery rows.
- Added root cause and recommended action logic.
- Added owner function, priority, confidence and status.
- Extended the Top-Recovery table into an action-oriented cockpit.
- Added/updated the Maßnahmen tab as a dedicated action list.
- Added German and English labels for action fields.

### Preserved

- Upload logic.
- Sample data loading.
- Inventory export behavior.
- Local file-based prototype behavior.

### Known Limitations

- Status tracking is local/in-memory only.
- No persistent database exists yet.
- No SAP integration or workflow integration exists yet.
- Recommendations are rule-based and not yet validated with customer data.

## 2026-07-13 - Work Block 10: Compact Overview Summary

### Changed

- Removed the redundant Analysestatus panel from the Overview page.
- Kept dataset context as compact header chips.
- Made Overview KPI cards more compact.
- Reduced excessive whitespace around the KPI section.
- Improved German labels in the Overview metric section.

### Preserved

- KPI calculations.
- Upload logic.
- Sample data loading.
- Inventory export behavior.
- Settings functionality.
- Local file-based prototype behavior.

### Known Limitations

- Persistent action tracking is still not implemented.
- This remains a local MVP.
- KPI combination was not implemented; all six KPI cards remain separate.

## 2026-07-13 - Work Block 9: Compact KPI Cards and German Explorer Labels

### Changed

- Made Overview KPI cards more compact.
- Reduced excessive whitespace in the KPI section.
- Added German display labels for Bestands-Explorer column headers.
- Added clean English display labels for known Explorer columns.
- Preserved original source column names as header tooltips.

### Preserved

- KPI calculations.
- Upload logic.
- Sample data loading.
- Inventory export behavior.
- Original column order.
- Local file-based prototype behavior.

### Known Limitations

- An original/translated header toggle was not implemented; original source names are available through header tooltips.
- Persistent action tracking is still not implemented.
- This remains a local MVP.

## 2026-07-13 - Work Block 8: Export UX, German Localization and Smart Scrollbars

### Changed

- Cleaned German export labels and helper text.
- Clarified Excel-compatible and CSV-for-Google-Sheets export wording.
- Improved export scope wording.
- Added export scope selection for current filtered view or all loaded rows.
- Improved German localization for visible UI labels and generated export column labels.
- Changed scroll behavior to show internal scrollbars only when content exceeds container height.
- Removed unnecessary vertical scrollbar behavior from short Data Quality summary tables.

### Preserved

- KPI calculations.
- Upload logic.
- Sample data loading.
- Inventory export behavior.
- Local file-based prototype behavior.

### Known Limitations

- Both inventory export scopes are implemented locally: current filtered view and all loaded rows.
- This remains a local MVP, not a production SaaS.
- Persistent action tracking is still not implemented.

## 2026-07-13 - Work Block Fix: Equal Ranking Card Height and Smart Internal Scroll

### Changed

- Equalized the two Overview ranking card heights.
- Kept ranking card headers fixed.
- Added smart internal scrolling to long ranking lists using overflow-y: auto.
- Prevented long lists from increasing card height.

### Preserved

- KPI calculations.
- Upload logic.
- Sample data loading.
- Inventory export behavior.
- Local file-based prototype behavior.

## 2026-07-13 - Work Block 7 Fix: Smart Internal Scrollbars and German Localization Cleanup

### Changed

- Changed Overview chart panels from fixed-height cards to compact panels with smart internal scrolling.
- Moved chart scrolling to the bar-list area so scrollbars appear only when the content exceeds the available height.
- Added dedicated Data Quality table scroll classes instead of inline sizing.
- Localized visible navigation, Settings, Analysis Status and placeholder copy for German language mode.
- Corrected chart-specific classes so they apply to the two Overview chart panels only.

### Preserved

- KPI calculations.
- Upload logic.
- Sample data loading.
- Inventory export behavior.
- Data parsing and normalization.
- Local file-based prototype behavior.

### Known Limitations

- The browser-based visual check for the local `file://` prototype is limited by the in-app browser URL policy.
- Detail tabs such as Excess Stock, Slow / Dead Stock, Blocked / Quality and Actions are still placeholders.
- This remains a local MVP, not a production SaaS.

## 2026-07-12 - Work Block 6 Fix: Equal Chart Panel Heights

### Changed

- Equalized Overview chart panel heights.
- Added internal scrolling for longer chart lists.
- Improved bar chart density and alignment.

### Preserved

- KPI calculations.
- Upload logic.
- Sample data loading.
- Inventory export behavior.
- Local file-based prototype behavior.

## 2026-07-12 - Work Block 7: Tab-specific Layout and Resizable Inventory Explorer

### Changed

- Made Overview the only full executive KPI dashboard.
- Added focused page headers for Inventory Explorer and Data Quality.
- Changed Inventory Explorer to a table-first layout with filters, visible-row export and dataset context.
- Removed redundant KPI cards from Inventory Explorer and Data Quality.
- Added a draggable resize handle for the Inventory Explorer table height.
- Improved Inventory Explorer table scrolling with a dedicated resizable table container.

### Preserved

- KPI calculations.
- Upload logic.
- Sample data loading.
- Inventory export behavior.
- Local file-based prototype behavior.

### Known Limitations

- Persistent action tracking is still not implemented.
- Detail tabs such as Excess Stock, Slow / Dead Stock, Blocked / Quality and Actions are still placeholders.
- This remains a local MVP, not a production SaaS.

## 2026-07-12 - Work Block 6: Chart Density, Scroll Behavior and Final Dashboard Layout Polish

### Changed

- Improved chart panel density so chart cards size more closely to their content.
- Balanced bar chart rows with fixed rank/value areas, tighter label sizing and a flexible bar area.
- Added internal scrolling for longer chart lists.
- Improved table scrolling with a viewport-aware max height and sticky table headers.
- Improved split-pane sizing so each pane can scroll independently.
- Added subtle, consistent scrollbar styling for chart lists, tables, split panes and modal content.
- Tightened panel spacing and chart titles for a calmer executive cockpit layout.

### Preserved

- KPI calculations.
- Upload logic.
- Sample data loading.
- Inventory export behavior.
- Local file-based prototype behavior.

### Known Limitations

- Sticky first column was not implemented because the SAP-like wide tables preserve original Excel column order and a sticky first column could create overlap risk in the current table renderer.
- This remains a local MVP, not a production SaaS.
- Persistent action tracking, multi-user workflows, SAP live integration and enterprise security are not implemented yet.

## 2026-07-12 - Work Block 5: Dashboard Density & Executive Layout

### Changed

- Added a compact Overview header with executive subtitle and dataset context chips.
- Moved dataset context out of the large KPI status block.
- Reworked the Overview top layout so KPI cards use full width on normal laptop screens.
- Changed the Analysis Status area into a compact horizontal strip below the KPI cards on standard widths.
- Kept the Analysis Status panel on the right only for very wide screens.
- Increased KPI card minimum width and removed desktop ellipsis behavior for KPI values.
- Reduced vertical spacing between header, navigation, Overview header, KPIs, filters and insight strip.
- Updated insight labels and category display labels to inventory-specific terminology.

### Preserved

- KPI calculations.
- Upload logic.
- Sample data logic.
- Inventory export behavior.
- Local file-based prototype behavior.

## 2026-07-12 - Work Block: Product-grade structure and polish

### Changed

- Split the local browser prototype into `prototype.html`, `styles.css`, `sample-data.js` and `app.js`.
- Moved embedded CSS out of `prototype.html`.
- Moved the large `sampleCsv` constant out of `prototype.html`.
- Updated the header branding to show the ObsoliQ logo, product name and "Inventory Recovery Cockpit".
- Polished the SaaS look and feel for header actions, navigation tabs, KPI cards, analysis status, panels, tables, modals and settings.
- Kept compact KPI number formatting and full-value tooltips.
- Kept the main dashboard status line focused on dataset context.

### Removed

- Removed stale references to the deleted top-level `Excel-Report` header button.
- Removed dead `.segmented` navigation handling.
- Removed the unused ZIP-based XLSX helper export path.

### Preserved

- Local file-based prototype behavior.
- Automatic sample data load.
- Upload for `.xlsx`, `.csv` and `.tsv`.
- Inventory export with Excel and Google Sheets options.
- Settings modal with theme, language and currency controls.
- Current KPI calculation logic.

### Known Limitations

- JavaScript is still mostly in one `app.js` file to avoid destabilizing the current upload/export flow.
- Translations, rendering and data processing should be split into dedicated modules in a later refactoring step.
- Action tracking is not persistent yet.
- SAP integration, login, database and cloud deployment are intentionally out of scope for this work block.
