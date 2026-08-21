# ObsoliQ Architecture

## Current Module Structure

The local MVP remains a file-compatible browser prototype:

- `prototype.html` loads the product shell and classic scripts.
- `sample-data.js` provides the built-in demo dataset.
- `js/core/canonical-model.js` owns canonical inventory field definitions.
- `js/core/value-utils.js` owns numeric, locale, magnitude and header-scale parsing helpers.
- `js/data/source-model.js` owns source-column metadata.
- `js/data/source-ingestion.js` parses CSV, TSV and XLSX inputs.
- `js/data/schema-profiler.js` owns column profiles and semantic/physical schema signatures.
- `js/data/input-normalization-engine.js` owns canonical-field-aware value normalization and diagnostics.
- `js/mapping/mapping-engine.js` builds and validates source-to-canonical mappings.
- `js/recovery/recovery-engine.js` owns recovery input extraction and validation.
- `js/data/dataset-builder.js` builds normalized and analytical inventory rows.
- `js/data/data-package-registry.js` owns session-level Data Package records.
- `js/data/material-master-builder.js` validates and builds Material Master package payloads.
- `js/data/consumption-history-semantics-engine.js` owns deterministic Consumption History temporal, movement, unit, event and readiness semantics.
- `js/data/consumption-history-builder.js` validates and builds optional Consumption History package payloads without touching UI or analytical state.
- `js/data/consumption-history-relationship-engine.js` owns Inventory-to-Consumption-History entity matching, anti-fan-out diagnostics and relationship provenance.
- `js/data/consumption-history-aggregation-engine.js` owns semantic-row-only rolling windows, monthly buckets, exclusions, historical metrics and metric provenance.
- `js/application/historical-metrics-runtime-coordinator.js` owns Historical Metrics runtime scheduling, signature deduplication, explicit states, retry, stale-result rejection and state notifications.
- `js/data/package-relationship-engine.js` matches Inventory rows to Material Master rows with deterministic package keys.
- `js/data/package-enrichment-engine.js` applies approved fill-missing-only Material Master enrichment and provenance.
- `js/data/package-relationship-quality-engine.js` classifies active Inventory-to-Material-Master relationship quality for decision transparency.
- `js/actions/action-owner-context-engine.js` derives contextual owner references beside the existing rule-based owner function.
- `js/excess/excess-analysis-engine.js` builds Excess decision cases from enriched analytical inventory rows.
- `js/excess/opportunity-score-engine.js` scores Excess opportunities through deterministic, explainable MVP components.
- `js/excess/excess-scenario-engine.js` builds deterministic Excess scenario estimates and unavailable-state explanations.
- `js/application/package-import-service.js` prepares, validates, builds and transactionally commits non-Inventory Data Packages.
- `js/application/input-trust-service.js` orchestrates source profiling, mapping evidence, normalization policy and trust-state decisions.
- `js/application/consumption-history-interpretation-service.js` prepares and revalidates package-specific Consumption History interpretation policy and diagnostics.
- `js/application/historical-inventory-metrics-service.js` validates active Inventory and Consumption History inputs, orchestrates relationship and aggregation, assembles derived runtime metrics and owns metric invalidation signatures.
- `js/application/inventory-enrichment-service.js` orchestrates Inventory-to-Material-Master matching and enrichment outside the UI layer.
- `js/application/excess-analysis-service.js` composes Excess cases, owner context, relationship quality, scoring and scenarios for the UI.
- `js/application/excess-pilot-review-service.js` owns session-only Excess Pilot Review records, case fingerprints, lifecycle reconciliation, summaries, export rows and snapshot/restore behavior.
- `js/application/excess-pilot-review-view.js` owns Pilot Review form, stale-review notice and lifecycle summary rendering.
- `js/application/excess-pilot-review-controller.js` owns scoped Pilot Review save/export click handling inside the Excess page.
- `app.js` coordinates UI state, dataset transactions, remediation and rendering.

## AP 16.4a Consumption History Package Boundary

Consumption History enters the MVP through the existing non-Inventory Package Import Service. The service prepares source metadata, requests a package-specific Mapping policy, validates the package with the Consumption History Builder and commits the resulting package transactionally to the Data Package Registry.

The builder is a pure data module. It does not read DOM state, UI filters, runtime inventory arrays, translations or rendering helpers. It receives source rows, headers, source column metadata, mapping and source metadata, then returns a package payload with normalized rows, diagnostics, relationship keys and freshness metadata.

The package is stored as `consumption_history` with schema version `consumption-history-v1`. It is visible in Data Foundation as an optional intelligence source. AP 16.4a deliberately does not join Consumption History into Inventory Snapshot, Material Master, Recovery, Data Quality, Action Cockpit, Opportunity Score, scenario or Pilot Review calculations.

## AP 16.4b Temporal, Movement And Unit Semantics

AP 16.4b adds one interpretation boundary before the existing Consumption History Builder. After the AP 16.4b.1 closure, the full flow is:

Source Mapping -> Physical History Source Identity -> Applied/Proposed History Policy -> Policy Reconciliation -> History Interpretation -> Explicit Review -> Effective Source-Bound Semantic Policy -> Signature Invariant -> Semantics Engine -> Builder -> Package Validation -> Registry Commit -> History Readiness -> Data Foundation.

The Semantics Engine owns date parsing, period parsing, Posting Date / Period consistency, explicit analysis-as-of evaluation, Movement Type semantics, signed/absolute/net quantity separation, unit context, event identity, duplicate semantics and History Readiness.

The Interpretation Service owns source-bound Quantity, Posting Date and Period policies, physical source identity reconciliation, review state, stale-policy diagnostics and semantic-policy signature construction. It is DOM-independent and does not mutate Registry or Inventory state.

The Builder remains responsible for package rows, package validation and build metadata. It reuses the effective source-bound semantic policy and exposes the Builder-side semantic-policy signature for the Package Import Service invariant. The Registry remains responsible for immutable package identity, revision, committed metadata and active package state. Data Foundation is presentation-only for Consumption History availability and History Readiness; it does not calculate readiness.

AP 16.4b explicitly does not create an Inventory relationship, historical metrics, rolling buckets, coverage, run-out, Slow / Dead classification or current KPI impact.

## AP 16.4c Inventory Relationship And Historical Metrics

The AP 16.4c flow is:

Inventory Package + Semantically Interpreted Consumption History Package -> Historical Metrics Service -> Relationship Engine -> Entity Relationship Result -> Aggregation Engine -> Historical Metric Result -> Derived Historical Runtime -> Data Foundation / Inventory Explorer / Export.

The Relationship Engine owns entity-key construction, exact Material + Plant matching, controlled unique Material fallback, anti-fan-out enforcement, unmatched/ambiguous/invalid diagnostics, package provenance and relationship signatures. It does not parse dates, interpret Movement Types, convert units, render UI, read Registry directly or mutate Package or Inventory rows.

The Aggregation Engine owns calendar windows, semantic eligible-row selection, exclusion classification, unit-safe monthly aggregation, Last Consumption, 3M/6M/12M net consumption, average monthly consumption, active months, movement frequency, intermittency, trend, coverage, run-out, metric status and provenance. It consumes AP 16.4b semantic rows and does not reinterpret raw source fields.

The Historical Metrics Service owns package validation, semantic acceptance, explicit Analysis-as-of validation, orchestration, deterministic input signatures, invalidation and coherent unavailable runtimes. Derived metrics remain outside the authoritative Inventory analytical rows and outside Registry mutation. Data Foundation presents status only; Inventory Explorer composes a read-only `· CH` view; export includes historical columns only when the historical variant is selected.

AP 16.4c does not implement Slow / Dead classification, predictive logic, Snapshot History, Purchase Order optimization, SAP integration, persistence or changes to Recovery, Data Quality, Actions, Opportunity Score, Excess scenarios or Pilot Reviews.

## AP 16.4c.1 Historical Runtime Orchestration

The AP 16.4c.1 runtime flow is:

Inventory / History Input Change -> Historical Input Signature -> Runtime Invalidation -> Runtime Coordinator -> Calculating State -> Historical Metrics Service -> Relationship Engine -> Aggregation Engine -> Coherent Runtime Commit -> Targeted Presentation Update.

Ownership is separated as follows:

- Runtime Coordinator: controlled scheduling, deterministic input-signature deduplication, generation-based stale-result protection, explicit Runtime states, retry and subscriber notification.
- Historical Metrics Service: Package validation, semantic acceptance, relationship/aggregation orchestration, metric result assembly and coherent unavailable/error Runtime payloads.
- Data Foundation: presentation model only. It reads Package presence, Package validity, Interpretation Trust, History Readiness and Runtime availability; it does not build Runtime metrics, relationships or aggregations.

Render functions are side-effect-free regarding Historical analytics. Opening or closing Data Foundation, rendering Overview, opening Inventory Explorer, changing filters, sorting, pagination, language, currency, theme or the export dialog must not trigger a Historical Metrics build. Changed analytical inputs invalidate the current Runtime before a new lifecycle request is accepted. A stale calculation completion cannot overwrite a newer signature, and Runtime recalculation does not create Data Package revisions.

## AP 16.3b.1.1 Pilot Review Lifecycle Ownership

The Pilot Review Service owns the complete Review contract and lifecycle boundary. It validates new Review identity, generates Review IDs, owns the monotonic `reviewSequence`, computes Case fingerprints, stores Review records, reconciles current/stale/orphaned lifecycle state, builds current and all-state summaries, exports Review rows, and snapshots/restores Review state.

UI validation is only a convenience layer. It does not replace Service validation, and `recordReview()` rejects incomplete new records before any mutation. Normal Review creation cannot create legacy fallback fingerprints. Legacy Review handling is isolated to explicit restore or migration behavior.

The Pilot Review View owns presentation of the current Review form, the stale reassessment notice and the neutral history disclosure. A current Review remains authoritative for the current Case fingerprint even when older stale Reviews exist.

Relationship navigation uses the complete Excess Case model for target lookup, adjusts Excess-only filters only when necessary to reveal a hidden target, calculates the target page, and activates exactly the requested Case. Navigation reveal state is not persistent filter state and does not affect filtered Summary or Export scope.

Pilot Review save operations never create or mutate Package revisions and never recalculate analytical Inventory, Recovery, Data Quality, Action, Opportunity Score or scenario values.

## Source To Registry Flow

The current data flow is:

Source file or sample data -> Source Ingestion -> Source Contract -> Mapping Engine -> Canonical Data Model -> Dataset Builder -> Data Package Registry -> active single-dataset UI.

AP 16.2b.2 hardens this flow:

Source Ingestion -> Source Metadata -> Schema Profile -> Header / Unit / Scale Hints -> Mapping Evidence -> Approved Normalization Policy -> Input Trust Validation -> Dataset / Package Builder -> Recovery / Enrichment -> Registry -> UI.

AP 16.2b.2.1 closes the upload decision order:

Source Ingestion -> Automatic Mapping Proposal -> Preliminary Input Trust -> Trust-reviewed Mapping -> Mapping State Evaluation -> Review Decision -> Approved Normalization Policy -> Dataset Builder -> Compact committed Input Trust metadata.

AP 16.2b.2.2 closes the applied interpretation gate:

Source Ingestion -> Automatic Mapping Proposal -> Preliminary Input Trust -> Trust-reviewed Mapping -> Policy Proposal -> User Overrides -> Explicit Confirmation -> Effective Normalization Policy -> Dataset Builder -> Mapping/Policy Invariant -> Runtime Commit -> Package Commit -> UI.

AP 16.2b.2.3 closes applied policy identity:

Current Applied Policy -> Mapping Reopen -> Physical Identity Validation -> New Proposal for Changed Sources -> Explicit Override -> Explicit Confirmation -> Effective Source-Bound Policy -> Input Trust Validation -> Dataset Builder -> Signature Invariants -> Runtime Commit -> Package Commit.

AP 16.2b.2.4 closes confirmation invalidation:

Confirmed Source-Bound Policy -> Physical Source Change -> Confirmation Invalidation -> New Input Trust Assessment -> Fresh Confirmation where required -> Dataset Builder -> Signature Invariants -> Runtime / Package Commit.

The reviewed Mapping is the only committed Mapping truth after Input Trust review. The automatic proposal remains evidence only. Dataset Builder input, Dataset Meta, Package Mapping, Preview and Apply use semantically identical mappings verified by `columnMappingSignature()`.

The effective Normalization Policy is the only committed Policy truth. `mergeNormalizationPolicies(proposedPolicies, userOverrides)` preserves proposed per-column locale, scale, currency and physical source identity, overlays only meaningful explicit overrides and ignores empty override records. Its deterministic signature is stored in Build Metadata, Dataset Meta and Package Input Trust metadata.

Source-bound policy ownership:

- The active Dataset owns `appliedNormalizationPolicy`.
- The pending Mapping Assistant owns `proposedNormalizationPolicies` and `normalizationPolicyOverrides`.
- Physical Source Identity is strict: `canonicalField`, integer `sourceIndex`, duplicate-aware `sourceKey` and audit `sourceColumn`.
- Reopen uses the applied policy for unchanged physical mappings.
- Remapping a canonical field to another source invalidates stale field policy and confirmation.
- Source change has precedence over previous top-level and field-level user confirmation.
- A fresh confirmation can be stored only after the current physical source has been re-evaluated by Input Trust.
- `trusted_automatic` is system-owned clear interpretation; `user_confirmed` is user-owned confirmation of the current reviewed source.
- Package build data stores the effective policy so package-level invariants can verify that stale policies did not reach the Registry.
- Rollback boundaries remain unchanged: failed validation or package finalization restores Runtime and Registry snapshots.

The Schema Profiler and Input Normalization Engine are pure classic-script modules. They do not access DOM, Registry or UI globals. `app.js` acts only as an adapter: it invokes the Input Trust Service before dataset build, stores diagnostics/metadata and relies on existing transaction rollback if trust validation or package finalization fails.

Trust-state ownership:

- `trusted`: deterministic source interpretation is clear.
- `review_required`: Dataset commit waits for explicit Mapping Assistant review and confirmation of required locale, scale or currency assumptions.
- `blocked`: unsafe required financial interpretation, double scaling or mixed currency must not reach KPI/Recovery calculations.
- Schema drift remains captured as evidence and metadata. It is not by itself a blocking financial interpretation unless accompanied by concrete trust diagnostics.

Package metadata ownership:

- Data Packages store `inputTrustMetadata` at top level.
- `buildData.buildMetadata` stores the same compact trust metadata plus the normalization summary.
- Raw Source rows and source-column metadata remain unchanged.
- Full Input Trust assessment objects live only in pending Mapping review context.
- Dataset Meta and Package records retain compact trust metadata plus approved normalization policy, not `normalizedPreviewRows`, full column profiles or full Mapping evidence.
- Mapping and Policy signatures are checked before Dataset/Package state advances. Failed checks restore runtime and Registry snapshots.

Rendering ownership after Dataset mutation:

- `renderAfterDatasetChange()` marks data-dependent views dirty.
- The active view renders immediately.
- Hidden Overview, Excess, Actions, Inventory Explorer and Data Quality views render when opened, avoiding eager DOM rebuilds after every Dataset mutation.

Row provenance ownership:

- Row-level relationship and enrichment provenance is owned by the enrichment pipeline.
- Compact relationship summaries are not used as the authoritative source for provenance exports.
- Bounded UI examples are never export truth for complete conflict counts.
- Export code reads row-owned provenance and complete diagnostics for match type, conflict counts and conflict field keys.

Excess page/detail ownership:

- The Excess worklist owns the current visible page rows.
- Active detail selection is reconciled after pagination, page-size, filter, sort and dataset changes.
- A detail card cannot remain bound to a case outside the current visible page.

Only the active `inventory_snapshot` package drives financial KPIs, Recovery and Data Quality. AP 16.2a added Material Master as the first importable non-Inventory package. AP 16.2b connects the active Inventory Snapshot with the active valid Material Master package for contextual matching and fill-missing-only enrichment. Material Master never owns Recovery values and does not recalculate Inventory KPIs.

## Generic Package Import Boundary

AP 16.2a adds a service boundary for package imports:

Package Type Selection -> Source Ingestion -> Source Metadata -> Package-specific Mapping Policy -> Mapping Assistant -> Package Builder -> Registry Commit -> Package Availability.

`js/application/package-import-service.js` is DOM-independent. It receives parsed source data, mapping input, package definitions, builders and the Registry explicitly. Preparation and validation do not mutate the Registry. Commit uses Registry snapshot/restore so failed writes leave no phantom Package and restore the package ID sequence.

`app.js` remains the UI adapter. It opens the Package Type modal, invokes the service, reuses the Mapping Assistant and renders compact package availability. It does not contain Material Master normalization, validation, package build, relationship matching or enrichment logic.

## Inventory And Material Master Enrichment Boundary

AP 16.2b adds a focused cross-package pipeline:

Inventory Package + Material Master Package -> Package Relationship Engine -> Match Result -> Package Enrichment Engine -> Enriched Inventory Analytical Rows -> existing Action Decoration -> Inventory Explorer / Actions / Data Foundation.

`js/data/package-relationship-engine.js` is a pure, DOM-independent relationship module. It uses indexed maps for `material_id` and `material_id + plant`, preserves text material numbers including leading zeros, prefers exact Material + Plant matches, allows only controlled unique Material fallback and marks duplicate or multi-candidate master data as ambiguous rather than selecting a first row.

`js/data/package-enrichment-engine.js` is a pure, DOM-independent enrichment module. Its default policy is `fill_missing_only`. Approved Material Master context fields may fill missing Inventory context, identical existing values can be confirmed, and conflicting existing Inventory values are preserved with diagnostics. Financial, Recovery, demand, action, workflow, package and source-identity fields are protected from Material Master enrichment.

`js/application/inventory-enrichment-service.js` orchestrates the two engines. It accepts package records and analytical rows explicitly, returns enriched rows plus compact relationship/enrichment metadata, and leaves rows unchanged when no valid Material Master package is active.

The app-level transaction boundary rebuilds the active Inventory package once when enrichment is applied. On enrichment failure, runtime state, package registry state and UI context are restored together, so no mixed Inventory / Material Master state, phantom revision or partial enrichment remains visible.

AP 16.2b.1 hardens the ownership boundary between Inventory source quality and Material Master context enrichment:

Inventory Dataset Builder analytical rows -> Inventory Data Quality.

Inventory Dataset Builder analytical rows -> Material Master Relationship -> Context Enrichment -> Actions / Explorer / Data Foundation.

Material Master enrichment must not feed back into Inventory source-quality detection. Duplicate-candidate Data Quality detection receives explicit Inventory-owned rows and does not read globally enriched rows.

Remediation Preview now uses a shared analytical runtime snapshot boundary:

Shared analytical runtime snapshot -> temporary build -> temporary Material Master relationship/enrichment -> local Preview result -> full analytical state restore.

The shared snapshot includes normalized rows, enriched rows, Recovery diagnostics, excluded rows, Data Quality issues, Dataset Meta, current relationship result, enrichment diagnostics and field-level enrichment provenance. Preview must not write Registry state, activate Packages, increment Package revisions or leave relationship/enrichment metadata mutated after the temporary calculation ends.

## Excess Intelligence Boundary

AP 16.3a adds the first dedicated operational decision page for Excess Stock:

Enriched Inventory Analytical Rows -> Owner Context Engine -> Excess Analysis Engine -> Opportunity Score Engine -> Scenario Engine -> Excess Analysis Service -> Excess Stock page / exports.

The Excess page consumes existing analytical rows and existing Recovery fields. It does not recalculate Recovery, change the Waterfall order, mutate source rows, alter Data Quality issue identity or change Action recommendation, priority and confidence rules.

The Excess Analysis Engine creates decision cases with gross excess, net addressable excess, overlap and remaining-inventory transparency. It treats `net_excess_value` as the already deduplicated Recovery allocation where present. Gross-to-net differences are explained as overlap rather than added back into Recovery potential.

The Owner Context Engine does not import or overwrite `owner_function`. The existing application rule still determines `owner_function`. Owner Context adds `owner_reference`, `owner_source` and `owner_assignment_confidence` from approved Inventory or Material Master context fields such as MRP controller, planner, purchasing organization or responsible/accountable assignments. `owner_source` is limited to `inventory`, `material_master` or `none`.

The Relationship Quality Engine is read-only. It classifies relationship quality as complete, limited, critical or unavailable from match rate, ambiguous rows, invalid keys and relationship/enrichment conflicts using the versioned `mvp-1` threshold contract. It supports Data Foundation and Excess decision transparency, but does not block analysis or change enrichment behavior.

The Opportunity Score and Scenario engines are deterministic MVP decision-support layers. They provide explainable prioritization and scenario estimates; they are not predictive analytics and do not claim automated outcome certainty.

## AP 16.3b Excess Pilot Review Boundary

AP 16.3b adds a validation layer around the Excess decision page without reopening Input Trust, Recovery, Data Quality, Action rules or Package lifecycle semantics.

The target flow is:

Excess Page Model -> Opportunity Score Explanation -> Scenario Evidence -> Pilot Review Record -> Pilot Review Summary -> Pilot Review Export.

AP 16.3b.1 hardens that flow:

Excess Full Model -> Case Fingerprint -> Pilot Review Subject Identity -> Review Record -> Lifecycle Reconciliation -> Current Pilot Summary -> Pilot Export.

Review subject identity is `datasetId + caseId + caseFingerprint`. The fingerprint is a deterministic lifecycle identity, not a security hash. It includes Registry-owned Inventory Package ID/revision, Opportunity Score model version, score components, gross/net/overlap values, recommendation, next step, priority, confidence, owner context, relationship state, evidence signature and scenario signature. Pagination, filters, display currency, language and theme are excluded.

The Pilot fixture boundary lives in `tests/fixtures/`. Fixture cases are deterministic test inputs and are not loaded by production bootstrap or the sample dataset.

Opportunity Score calibration is DOM-independent and lives at the score-engine boundary. It evaluates explicit pilot constraints against generated score records and reports pass/fail, but it does not mutate scores, add hidden weights or rename the score as a probability.

The Pilot Review Service owns:

- session-only review state
- dataset/case/fingerprint scoping
- case fingerprints
- current/stale/orphaned lifecycle reconciliation
- deterministic timestamp injection for tests
- review summary aggregation
- spreadsheet-safe export rows
- snapshot, restore and dataset reset

The service does not read or write Action status, Package Registry records, Data Quality issues, Recovery values, relationship results or enriched analytical rows.

The Pilot Review Controller owns scoped Excess-page events for Review save and Review export. Saving a Review uses the active case view model, the active Registry package identity and targeted Review/Summary rerendering. It does not rebuild the complete Excess page and does not mutate the Registry.

The Pilot Review View owns Review form rendering, stale/orphan notice rendering, lifecycle summary chips and export labels. It receives translation and escaping helpers from the app boundary, but it does not own data calculations.

`app.js` remains a UI adapter for AP 16.3b. It renders Why Prioritized, Why Not Higher, evidence records, scenario evidence, passes active case/package context to the Pilot Review modules and opens direct relationship issue links. Analytical loops, Pilot Review aggregation and score calibration remain in dedicated modules.

Relationship drilldown is read-only. It explains ambiguous matches, unmatched rows and enrichment conflicts using existing relationship/enrichment diagnostics and links to the existing Excess case by stable case ID where possible. It does not correct relationships automatically and does not create Actions.

AP 16.3b.1 relationship navigation opens the exact Excess case by stable case ID. If the case exists but is hidden by an Excess-only column filter, a temporary Excess target override reveals it and the correct page is calculated. If the case no longer exists, the previous active case is preserved and no unrelated case is opened.

The Data Package Registry remains the owner of package revisions. Pilot Review requires the active Inventory Package revision for save, stores that revision in the review subject, and never creates or increments package revisions.

## Material Master Builder

`js/data/material-master-builder.js` owns the Material Master vertical slice. It is deterministic, file-compatible and independent of Inventory globals, Recovery logic, Action logic, Issue Ledger and Remediation.

The Material Master mapping policy requires only `material_id`. `plant` is optional and controls relationship granularity when mapped and populated. The builder preserves material numbers as text, including leading zeros, detects missing material values and duplicate relationship keys, and emits package validation diagnostics.

## Mapping Policy Selection

The Mapping Engine remains generic. AP 16.2a selects a policy by package type:

- Inventory Snapshot: existing required Inventory policy, including `material_id` and `stock_value`.
- Material Master: `material_id` required, `plant` optional, no recovery input requirement.

The same Mapping Assistant UI is reused, but validation and required-field cards now follow the selected package policy.

## Dataset Transaction Boundary

Dataset-changing operations use a runtime snapshot before build or mapping finalization. On failure, ObsoliQ restores:

- source rows and headers
- source column metadata
- normalized and analytical rows
- recovery diagnostics
- Data Quality issues and issue ledger
- remediation state
- filter state and UI chips
- current Dataset Meta
- Data Package Registry snapshot
- dataset identity sequence

Failed loads and late Mapping failures must not leave phantom packages.

## Package Finalization Boundary

AP 16.1.1 uses one application-level Package finalization boundary for the active Inventory Snapshot. The boundary receives final values explicitly and only:

- builds the Package record
- registers or updates the Package once
- sets the active Inventory Snapshot
- updates Dataset Meta package identity
- enforces retention
- verifies invariants

It does not render, show feedback, close modals, mutate the Issue Ledger or rerun Data Quality as part of Package creation.

AP 16.1.1.1 hardens this boundary: callers must pass an explicit final Quality Summary, and Package record construction no longer falls back to a fresh Data Quality evaluation. The Summary is validated without numeric coercion: `score` and required `rawScore` must be finite numbers, `statusKey` and readiness values must be known status keys, issue counts must be non-negative integers, and `qualityEvaluatedAt` must be a non-empty valid timestamp before any Registry write.

Package ownership is invariant. If a Package already exists, app-level finalization and the physical Registry module both reject attempts to reuse its `packageId` for another `datasetId` or another `packageType`. Failed ownership checks occur before active-package switching or retention enforcement.

Relationship Keys are derived only from the approved active Mapping. Fields with missing status, ignored state, protected state, proposed-only targets, derived definitions or invalid source-column identity are excluded. Package validation checks every Relationship Key against that approved Mapping set and the Package's physical `sourceColumnMetadata`. A relationship-capable mapping must prove source identity through `sourceIndex` plus a matching `sourceKey`, original header or normalized source key; ambiguous duplicate headers without `sourceIndex` are rejected.

The dataset-changing sequence is:

Dataset-changing operation -> Snapshot Runtime + Registry + UI -> Domain Mutation -> Analytical Build -> Application Commit -> Data Quality Detection -> Lifecycle / Ledger Finalization -> Final Quality Summary -> Single Package Register/Update -> Invariant Validation -> Render -> Feedback.

The Package Summary sequence is intentionally one-way:

Data Quality Evaluation -> Authoritative Issue Snapshot -> Lifecycle / Ledger Finalization -> Final Data Quality Model -> Final Package Quality Summary -> Package Commit.

Package Commit does not point back to Data Quality Detection or Ledger synchronization.

On failure, the sequence is:

Restore Runtime -> Restore Registry -> Restore UI -> Rerender Previous Dataset -> Error Feedback.

Package import and enrichment rollback are best-effort boundaries. AP 16.2b.1 attempts rollback stages independently so a rendering failure does not suppress runtime restoration, UI restoration or user-visible failure feedback. The application layer owns feedback; the lower package/enrichment services return deterministic results and avoid duplicate UI messages.

Mapping Assistant applies use deferred Package finalization. `loadDataset()` builds and commits the mapped dataset, but the Package revision is written only after Mapping Action registration and Issue Ledger synchronization are complete.

Remediation applies use the same finalization boundary. Corrections, Decisions, Undo, Reset and remediation Mapping all snapshot before mutation and roll back application state and Registry state together. Rollback is best-effort: runtime restore, previous dataset rendering and UI restore are attempted independently, and remediation failures show remediation-specific feedback even if rollback rendering itself fails.

## Runtime Context

`DatasetRuntimeContext` is explicit. It requires one dataset ID shared by:

- runtime context
- correction context
- build metadata, when present
- issue ledger ownership

Mixed dataset contexts are rejected.

## Production And Test Bootstrap

Production startup is `prototype.html` and does not execute tests or expose the test bridge.

The structured test boundary is `tests/tests.html`. It activates test mode through the pre-bootstrap `window.__OBSOLIQ_TEST_MODE__ = true` flag only, loads the product shell in an iframe and exposes controlled bridge methods for regression tests.

URL query parameters cannot activate test mode.

## Registry Ownership And Lifecycle

The Data Package Registry is DOM-independent and application-state independent. It owns:

- package identity
- package type
- package-to-dataset ownership
- source descriptor
- source data snapshot
- mapping contract
- build metadata
- compact quality summary
- freshness metadata
- relationship key metadata
- active package per type

The Registry does not perform analytical joins, predictions, UI rendering or workflow execution.

Registry records are retained in memory for the session only. Inactive Inventory Snapshot records are bounded by the configured retention limit; the active Package is protected from pruning. Failed transactions restore the prior Registry snapshot and therefore do not consume revisions, leave phantom records or trigger retention pruning.

The physical Registry contract is covered by structured tests in `tests/registry.test.js`, including ownership rejection, active-package retention protection, relationship-key validation and a 10,000-row transaction/retention gate.

## Known Technical Limitations

- `app.js` remains large and coordinates many UI responsibilities.
- Registry state is session-only and not persisted.
- Only the active `inventory_snapshot` drives financial KPIs, Recovery and Data Quality; Material Master enrichment is context-only.
- No Snapshot History, Delta Detection or cross-package financial analytics exist yet.
- Issue Ledger remains memory-intensive because it keeps detailed issue snapshots.
- There is no database, SAP connector, authentication or multi-user workflow.
