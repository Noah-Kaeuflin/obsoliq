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
- `js/slow-dead/slow-dead-condition-engine.js` owns Slow / Dead condition policy, evidence, confidence, root-cause candidates and Action Eligibility.
- `js/slow-dead/slow-dead-page-model.js` owns Slow / Dead page-only filtering, sorting, pagination, selected Case identity and display summaries.
- `js/slow-dead/slow-dead-export-builder.js` owns deterministic Slow / Dead Recovery Case export rows and provenance serialization.
- `js/application/slow-dead-recovery-case-service.js` owns entity-authoritative Slow / Dead Recovery Case Candidate construction and summaries.
- `js/application/slow-dead-runtime-state.js` owns the explicit Slow / Dead Recovery Case Runtime state shape and Historical dependency mapping.
- `js/application/slow-dead-page-view.js` owns the Slow / Dead Recovery Case Workbench markup.
- `js/application/slow-dead-page-controller.js` owns scoped Slow / Dead page interactions.
- `js/inventory-risks/inventory-risk-case-contract.js` owns stable Family Case identity, risk-family vocabulary and family-specific value semantics.
- `js/inventory-risks/excess-risk-adapter.js`, `slow-dead-risk-adapter.js` and `blocked-quality-risk-adapter.js` adapt accepted family outputs without cross-family score or value projection.
- `js/inventory-risks/inventory-risk-portfolio-service.js` deduplicates Inventory Entities into Portfolio Cases while preserving Primary and Secondary Family Cases, provenance and conservative Evidence state.
- `js/inventory-risks/inventory-risk-page-model.js` owns Unified segment filtering, sorting, pagination, exact selection and separate summary semantics.
- `js/inventory-risks/inventory-risk-export-builder.js` exports one row per selected Portfolio or Family Case with separate financial columns.
- `js/application/inventory-risk-page-view.js` and `inventory-risk-page-controller.js` own the visible Unified workbench and its scoped interactions.
- `js/data/package-relationship-engine.js` matches Inventory rows to Material Master rows with deterministic package keys.
- `js/data/package-enrichment-engine.js` applies approved fill-missing-only Material Master enrichment and provenance.
- `js/data/package-relationship-quality-engine.js` classifies active Inventory-to-Material-Master relationship quality for decision transparency.
- `js/excess/excess-decision-workspace-model.js` owns the pure Excess presentation projection for page-local filters, Summary context, relationship warnings, exact Historical evidence lookup and the selected Case Decision Core.
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
- `js/ui/obsoliq-icon-system.js` owns the file-safe functional icon allowlist, inline Sprite mount and stable Shell decoration.
- `app.js` coordinates UI state, dataset transactions, remediation and rendering.

## ICON-01 File-safe Functional Icon Boundary

The ObsoliQ Icon Pack under `assets/icons/obsoliq/` is the binding functional icon source. Its 39 Lucide-derived symbols use one `0 0 24 24` outline contract, `fill="none"`, `stroke="currentColor"` and stroke width `2`; the bundled Lucide license remains beside the manifest and Sprite.

Because the product starts directly through `file://`, no external SVG `<use>` reference and no `fetch()` is used. `js/ui/obsoliq-icon-system.js` contains an exact trusted inline representation of the productive Sprite, mounts it idempotently once and renders local fragment references through a frozen 39-ID allowlist. Unknown IDs fail closed and optional CSS classes are restricted to the icon system's own allowlist.

ICON-01 maps the ten global navigation routes and the existing Upload, Sample Data, Inventory Export and loaded-data status elements by stable route or element IDs. It does not derive meaning from German or English labels. Icons are decorative (`aria-hidden="true"`, `focusable="false"`), inherit the control's current color and never replace visible text. The block does not extend into KPI cards, Data Foundation, Data Quality content, Excess Detail navigation or analytical modules.

## EX-UX-01.4 Excess Decision Visual Presentation

EX-UX-01.4 remains inside the browser presentation boundary. `js/excess/excess-decision-workspace-model.js` continues to own the selected Case projection; `app.js` reads that projection and renders four scoped visual types without storing another analytical result.

The rendering path is:

Existing Excess Case + completed exact-row Historical Runtime -> Excess Decision Workspace Projection -> Value Bridge / Historical SVG / Score Contribution Bars / Readiness Matrix -> Excess Detail DOM.

Visual ownership and sources are separated as follows:

- Value Bridge: `valueNarrative.fields.stockValue`, `grossExcessValue`, `overlapValue`, `netAddressableValue` and `remainingInventoryValue`. Stock and remaining values are context; only Gross minus deductions equals Net is drawn as a bridge.
- Historical SVG: `historicalEvidence.monthlyBuckets` and `unitContext` from the completed current Historical Runtime for the exact `inventory_row_key`. The renderer sorts and limits existing buckets for geometry only; it does not read Raw History, reconstruct aggregates, interpolate or forecast.
- Score bars: existing `opportunity_score_components` plus immutable `componentMaximums` exposed by `js/excess/opportunity-score-engine.js`. The Engine remains the single owner of component maxima. Renderer width is contribution divided by that maximum; score calculation and model version remain unchanged.
- Readiness Matrix: existing `decisionReadiness.existingEvidence`, `missingEvidence`, `decisionLimits`, `whyNotHigher`, `nextCheck` and status. Rendering groups and bounds evidence for layout only; it does not evaluate a second readiness rule.

SVG output uses semantic `figure`, `figcaption`, `role="img"` and an accessible description. Score tracks use progressbar semantics with numeric contribution and maximum. Readiness overflow and secondary Action Options use native `details` / `summary`. CSS status marks always accompany text, product colors come from existing tokens and all new rules are scoped under `#excessPage` with responsive and reduced-motion handling.

No chart library, new state store, second calculation layer or persistence boundary is introduced. The block adds no Forecast, probability, Expected Recovery, Cash, Recognition, Portfolio or workflow model and does not mutate Registry records or Package revisions.

## EX-UX-01.5 Excess Decision Presentation Closure

EX-UX-01.5 remains in the `app.js` and `styles.css` presentation boundary. The four Summary metrics, fixed Worklist columns, business pagination, Detail hierarchy and responsive workspace consume the existing Excess page projection without recalculation or mutation.

The local Detail navigation is DOM-only. It scrolls the existing bounded Detail container to Decision, Value, History, Prioritization and Actions sections and derives its active marker from that container's scroll position. It does not create route, Dataset, Registry, filter or analytical state. Worklist and Detail retain independent internal scrolling on desktop and fall back to natural page flow at narrower breakpoints.

The explicit Gross minus deductions equals Net layout reads the accepted Value Narrative fields only. Inventory and remaining Inventory are contextual values outside the equation. No calculation engine, Historical Runtime, Action Option, Pilot Review, upload, parsing, mapping, export, Registry or Package revision behavior changes.

## EX-UX-01.6 Interaction And Density Closure

EX-UX-01.6 stays inside the existing `app.js` rendering adapter and `styles.css` presentation boundary. Five explicit anchor elements are the single landing contract for Decision, Value, History, Prioritization and Actions. The navigation calls native `scrollIntoView`, derives `aria-current="location"` from the local Detail scroll and owns cleanup for its click listener, passive scroll listener and pending animation frame before each Excess rerender.

Display deduplication compares normalized visible strings only. It limits repeated Cause signals and Readiness/Next Check copy but does not mutate `decisionCore`, `decisionReadiness`, Action Options or any model output. Evidence and secondary signals remain available through native disclosures. Semantic status colors communicate an existing status label; unavailable, not-checkable and not-recommended states remain neutral.

Desktop scroll ownership is CSS-only above `1240px`: the document shell is bounded to `100dvh`, while Worklist and Detail retain independent `overflow-y: auto`. Responsive layouts at or below the breakpoint restore natural page flow. The active EX-UX closure rules remain in the existing final scoped block. Removing all older foundational selectors was deliberately deferred because equivalent rendering of every closed disclosure and Pilot state could not be established without reopening accepted behavior.

No analytical engine, field contract, Registry record, Package revision, Runtime result, upload, parsing, mapping or export path is changed.

## CH-EX-01A Excess Contract And Runtime Integrity

`js/excess/excess-decision-workspace-model.js` is the single owner of Gross-to-Net Availability and reconciliation. `valueNarrative()` projects the three required monetary fields and calls `validateGrossNetValueBasis()` once. Decision Readiness and `app.js` renderers consume that result. The fixed Case Header no longer owns competing numeric fallbacks: Gross, overlap and Net are references to the same projected field values, while Opportunity Score has a separate null-safe Availability projection.

The binding contract versions are Workspace Projection `3`, Decision Readiness `excess-decision-readiness-v2` and Gross-to-Net Reconciliation `gross-net-reconciliation-v1`. The Workspace projection emits all three, the Reconciliation result carries its own subordinate version, and `js/application/excess-analysis-service.js` forwards the same version tuple in `metadata.decisionContracts`. This keeps Engine -> Service -> Workspace -> `app.js` contract inspection explicit without introducing a second calculation path.

`prototype.html` is the productive classic-script entry point. The Excess Analysis Engine loads before Opportunity Score, Scenario and Decision Workspace; the Application Service loads after those domain dependencies and before `app.js`. `tests/app-template.js` mirrors that exact script sequence for structured browser tests. Static package validation checks file existence, uniqueness, dependency order and parity between both entry paths.

The Excess portfolio cache uses an input revision in addition to the `enrichedRows` reference. `invalidateExcessPortfolioModel(reason)` advances the revision, clears the cached reference/model and records one diagnostic reason. A cache hit requires both the same array reference and an equal revision. There is no render-time blanket invalidation.

| Mutation path | Influences Excess model | Invalidation | Regression evidence |
| --- | --- | --- | --- |
| Action status | Yes: Actionability, score and ranking | `action_status_changed` | Same-reference status mutation test |
| Owner/Action context | Yes | Dataset commit or explicit relevant-input invalidation | Score/actionability and relevant-input tests |
| Remediation correction, undo or reset | Yes when analytical rows change | `inventory_dataset_committed` | Existing remediation transaction suite plus dataset invalidation test |
| Material Master enrichment | Yes: owner and relationship context | `inventory_dataset_committed` | Existing enrichment integration suite |
| Dataset reload/import | Yes | `inventory_dataset_committed` | Dataset reload invalidation test |
| Active Inventory Package revision | Yes: Package provenance | `<operation>_revision` | Package revision invalidation test |
| Runtime rollback/restore | Yes | `inventory_runtime_restored` | Existing rollback suites |
| Historical Metrics Runtime | No for cached portfolio; selected Case reads it dynamically | None | Decision Core runtime adapter remains outside portfolio cache |
| Consumption History package | No direct portfolio input | None; Historical Runtime owns its own invalidation | Existing Historical Runtime suites |
| Selection, filters, language, theme, currency | No analytical effect | None | Presentation-only no-rebuild test |

Package finalization mirrors the active Registry revision into Dataset Meta before invalidation so rebuilt Cases carry current Package provenance.

Opportunity Score component formulas and weights are unchanged. `js/excess/opportunity-score-engine.js` owns cap metadata (`uncappedScore`, `finalScore`, `scoreCap`, `maxComponentTotal`, `wasCapped`, `cappedPoints`); presentation only displays it.

Historical and Slow / Dead detailed build logs use `appendRuntimeBuildLog()`. Product mode records no entries. Test mode retains at most the newest 50 metadata-only entries, with no row payloads.

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

## AP 16.4d.1 Slow / Dead Condition And Evidence Engine

The AP 16.4d.1 flow is:

Inventory Entity + Historical Metrics Runtime + Material Master / Owner Context -> Slow / Dead Recovery Case Service -> Condition Engine -> Evidence -> Confidence -> Root-Cause Candidates -> Recovery Eligibility -> Action Eligibility -> Derived Case Runtime.

Ownership is separated as follows:

- `js/slow-dead/slow-dead-condition-engine.js`: owns the versioned Slow / Dead Condition Policy, condition precedence, critical evidence gate, condition classification, positive evidence, counter evidence, Evidence Strength, Condition Confidence, Root-Cause candidates, Recovery Case Eligibility, Action Eligibility, missing evidence and required existing Data Packages.
- `js/application/slow-dead-recovery-case-service.js`: owns input validation, entity-level Inventory evidence composition, deterministic Case IDs, Case fingerprints, provenance, entity-deduplicated summaries and service Runtime results.
- `js/application/slow-dead-runtime-state.js`: owns the six-state Runtime contract, state coherence and Historical dependency-state mapping.
- `app.js`: owns only module guards, service instantiation, signature checking, build deduplication, Slow / Dead error isolation and targeted test-bridge exposure.

The Condition Engine and Recovery Case Service are classic-script modules without DOM, UI-filter, presentation or direct Registry dependencies. They do not parse Raw History, reinterpret movement semantics, recalculate Historical Metrics, mutate Inventory rows, mutate Historical Metric rows, create Registry Packages or create Package revisions.

The derived Slow / Dead Runtime is downstream from Historical Metrics Runtime. It can build only from completed current Historical Runtime results and rejects stale or missing evidence as explicit unavailable or insufficient evidence. It is not triggered by Overview, Data Foundation, Inventory Explorer, filters, sorting, language, currency, theme or export-dialog presentation.

AP 16.4d.1 does not implement a visible Slow / Dead page, worklist, detail view, export, Expected Recovery Value, finance-grade recognition, execution workflow, persistence, outcome learning or SAP integration. Existing Recovery, Data Quality, Actions, Opportunity Score, Excess scenarios, Pilot Reviews, exports, Registry and Package revisions remain unchanged.

### AP 16.4d.1.1 Slow / Dead Runtime Boundary

The AP 16.4d.1.1 runtime boundary is:

Historical Runtime State Change -> Slow / Dead Runtime Adapter -> Slow / Dead Recovery Case Service -> Coherent Derived Runtime -> Historical/Data Foundation presentation update.

The Slow / Dead Runtime Adapter owns dependency-state mapping, current input-signature validation, build deduplication, Service-error isolation and the explicit derived Runtime state. It does not own rendering calculations, Condition thresholds, Condition precedence, Root-Cause rules or Action Eligibility rules.

A Slow / Dead error cannot mutate Historical Runtime and cannot prevent the accepted Historical Metrics/Data Foundation presentation from updating. Historical dependency errors are represented with `errorSource: "historical_runtime"`, while Slow / Dead Service exceptions are represented with `errorSource: "slow_dead_runtime"`. Calculating, unavailable and error states do not retain stale Case results from another signature.

The existing text-based Action Cockpit `slow_dead` signal may continue to support current Actions, but it is not Condition truth and is not Action Eligibility truth for the Slow / Dead Recovery Case Runtime. AP 16.4d.2 must consume the Recovery Case Runtime -> Condition & Evidence Engine result -> Action Eligibility path.

## AP 16.4d.2 Slow / Dead Recovery Case Page

The AP 16.4d.2 presentation flow is:

Historical Metrics Runtime -> Slow / Dead Runtime State -> Slow / Dead Recovery Case Service -> entity-authoritative Recovery Cases -> Page Model -> View / Controller -> local export.

The Page Model consumes an already completed or unavailable Runtime state. It may deduplicate Cases by Inventory entity, normalize page filters, build filter options, sort, paginate and preserve selected Case identity. It does not build Cases, classify Conditions, calculate Evidence Strength, calculate Condition Confidence, create Root-Cause candidates, calculate Action Eligibility or access the DOM.

The View renders Runtime state, Portfolio Summary, controlled Condition chips, Worklist, mobile Case cards, selected Case detail, positive evidence, counter evidence, limitations, missing evidence, stronger-conclusion boundaries, Root-Cause hypotheses, Recovery Case Eligibility, pre-decisional Action Eligibility, required Data Packages and provenance. It is presentation-only and must not call the Slow / Dead Service.

The Controller is scoped to `#slowDeadPage`. Search, filters, sorting, pagination, language, theme, currency, selected Case changes, Inventory navigation, Actions navigation and export-dialog opening do not rebuild Slow / Dead Cases and do not create Package revisions.

Slow / Dead -> Inventory and Slow / Dead -> Actions navigation is entity-exact. `app.js` resolves targets by row key, entity key and Material/Plant identity, then uses temporary reveal state only to display a hidden target. Reveal state is consumed by the target view render, does not mutate persistent filters and does not change Summary or Export scope.

The Slow / Dead Recovery Case Service keeps Inventory Exposure nullable, projects operational Owner Context into Cases and exposes available/unavailable exposure summary counts. The Slow / Dead export uses one row per Recovery Case, includes evidence and provenance, preserves text identities such as leading-zero material numbers and reuses the existing spreadsheet/CSV download path. Inventory Exposure remains exposure only; it is exported separately from Currency and is not Recovery Potential, cash release, P&L effect, Expected Recovery Value or realized value.

AP 16.4d.2 does not change Condition rules, thresholds, precedence, Historical Metrics formulas, Recovery, Data Quality, existing Actions, Excess, Opportunity Scores, scenarios, Pilot Reviews, Registry or Package revisions.

## AP 16.4d.3a Slow / Dead Calibration Contract And Safety Fixtures

The AP 16.4d.3a calibration flow is:

Versioned Synthetic Calibration Case -> Contract Validator -> Calibration Runner -> existing productive Slow / Dead Condition Engine -> deterministic Agreement result -> reproducible Fixture Baseline report.

`js/slow-dead/slow-dead-calibration-contract.js` owns the DOM-independent `slow-dead-calibration-case-v1` schema, fixed `2026-08-25` reference date, stable Reason-Code taxonomy, provenance requirements, Protection Flags and twelve Safety Invariants. `slow-dead-calibration-numeric-boundary-v1` routes all 16 numeric Engine input fields through the productive `numericEvidence(...)` API and preserves explicit zero, Missing, Ambiguous and Invalid evidence without a Calibration-specific parser. Its Calibration Policy reference is the same deeply frozen `DEFAULT_SLOW_DEAD_CONDITION_POLICY` object owned by the productive Condition Engine. It does not copy thresholds, override Policy values or define a second classifier.

`js/slow-dead/slow-dead-calibration-runner.js` v2 validates and deterministically sorts controlled Cases, invokes `createSlowDeadConditionEngine()` without a Policy override only for numerically eligible rows, compares actual results with manually authored expectations and emits stable disagreement and critical-protection codes. Invalid or ambiguous rows remain explicit excluded Result Rows; empty or wholly excluded sets report insufficient coverage rather than positive agreement. It snapshots Fixture, Inventory-evidence and Historical-Runtime inputs before evaluation and fails if the real Engine mutates them. The Runner has no DOM, rendering, Storage, Registry, Package, Session or Action dependency.

`tests/fixtures/slow-dead-calibration-fixtures.js` contains only fixed `synthetic_acceptance_fixture` records. Synthetic fixtures are policy-derived safety contracts, not observations, customer data, Pilot labels or expert-reviewed Ground Truth. The contract allows future `pilot_expert_label` records only with explicit reviewer identity, review timestamp and rationale; AP 16.4d.3a creates none.

The generated `AP_16_4D_3A_FIXTURE_BASELINE.md` reports Synthetic Contract Agreement only. It is not Pilot Accuracy, Expert Agreement, Precision, Recall, F1, threshold sensitivity or a recommendation to change Policy. Productive Policy v1, visible UI, Slow / Dead Cases, Actions, Excess and Opportunity Score remain unchanged. Calibration metrics and threshold sensitivity belong to `AP 16.4d.3b`; human Pilot Review and acceptance belong to `AP 16.4d.3c`.

## AP 16.4d.3b Synthetic Calibration Metrics And OFAT Threshold Sensitivity

The AP 16.4d.3b analysis path is deliberately outside the visible application workflow:

Validated 3a Fixtures + numeric-boundary Baseline Runner v2 result -> `slow-dead-calibration-metrics-v2` -> `slow-dead-threshold-sensitivity-plan-v1` + Sensitivity Runner v2 -> Calibration Runner with one immutable Policy variant -> real Condition Engine -> deterministic migrations and Safety evidence -> Markdown/JSON/CSV artifacts.

`js/slow-dead/slow-dead-calibration-metrics.js` v2 is a pure, DOM-independent projection over validated Fixtures and eligible Calibration Runner results. It does not classify. It owns Synthetic Contract Agreement, eligible/excluded counts, explicit insufficient-coverage states, per-Condition counts, Boundary Stability, Reason-Code coverage, twelve-invariant results and deterministic content fingerprints.

`js/slow-dead/slow-dead-threshold-sensitivity.js` keeps the v1 plan of one Baseline and sixteen controlled **OFAT** (one factor at a time) scenarios. Its v2 Runner validates threshold order and ranges, then delegates each immutable Policy variant and its numeric evidence to the shared Calibration Runner; it neither coerces raw numbers, duplicates classification nor mutates the globally frozen default Policy.

Ten immutable analysis Safety Guards are evaluated in every scenario. A Condition migration is not automatically an error. A defined Guard violation marks a variant analytically unsafe, but never activates, recommends, persists or ranks it. The analysis has no DOM, Storage, Registry, Package, Session or workflow dependency and creates no Policy version or Package revision.

The generated artifacts contain synthetic contractual data only. They provide no Pilot Accuracy, Customer Accuracy, Expert Agreement, Precision, Recall, F1, exposure weighting or best-Policy claim. Productive Policy v1, `app.js`, UI, Actions, Excess and Opportunity Score remain unchanged. `AP 16.4d.3c` must introduce separately governed human Pilot Review evidence; it must not reinterpret 3b as human validation.

## DF-UX-02 Capability-Oriented Data Foundation Presentation

The Data Foundation presentation flow is:

Existing Product / Runtime State -> Data Foundation Presentation Adapter -> Capability View Model -> Collapsed Summary -> Dependency-Based Drawer.

The adapter lives in the existing Data Foundation presentation boundary in `app.js`. It reads explicit current state such as active Inventory, Material Master and Consumption History Packages, Material Master relationship readiness, Interpretation Trust, History Readiness and Historical Runtime state. It does not call Relationship Engines, Enrichment Engines, Consumption History Semantics, Aggregation, Historical Metrics Service builds, Registry mutation or Runtime coordinator `requestBuild()`.

The collapsed summary is capability-oriented and bounded to three visible segments: Inventory Analysis, Context Enrichment and Historical Analysis. Mid-width and mobile summaries collapse those segments into active/missing extension text. The drawer is dependency-based: source rows are always visible, while Context Enrichment appears only with a usable Material Master source and Historical Analysis appears only with a usable Consumption History source.

Relationship and Metrics rendering remain separate. Material Master relationship evidence is part of Context Enrichment. Inventory-to-History relationship evidence is rendered only when the current Historical Runtime provides it, while Historical Metrics state is rendered as its own card. Technical Package, provenance, readiness and runtime details remain collapsed in Technical Details.

## DF-UX-02.1 Data Foundation Presentation Closure

The DF-UX-02.1 presentation flow is:

Existing Product State -> Data Foundation Presentation Adapter -> Prioritized Summary -> Source Row Variants -> Desktop Popover / Mobile Drawer -> Presentation Only.

`sourceStates` remain the authoritative source-state projection for open content, Technical Details and tests. The collapsed Summary is only a prioritization projection with `primaryText`, `secondaryText`, missing-extension count and review-source count. It does not replace Package presence, Package validity, Interpretation Trust, History Readiness, Relationship state or Historical Metrics Runtime state.

Source rows use explicit presentation variants: `compact-active`, `actionable-missing` and `diagnostic`. The variants change visual hierarchy only. They do not alter Package semantics, Relationship results, Runtime results or Data Quality behavior.

The Data Foundation interaction controller owns Popover/Drawer semantics. Desktop mode uses a non-modal anchored Popover with `role="region"` and no scrim. Mobile mode uses `role="dialog"`, `aria-modal="true"`, a scrim, focus containment and body-scroll locking. Opening, closing, pressing Escape, outside-click closing, scrolling or breakpoint switching never calls Historical Runtime build, Package import, Registry mutation or analytical engines.

The Data Quality header reads current Dataset Meta only. It renders the source label as a title-row badge and row/column counts as inline metadata. It does not mutate Dataset Meta, Data Quality issues or Package records.

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
- The Excess route owns its own page header, shared toolbar slot and active filter chips. Overview KPIs, Overview filters and Data Foundation remain Overview-owned.
- The Excess runtime/view model separates the full portfolio model from the filtered presentation model. Filtering, sorting, pagination, scrolling, disclosure toggles, language, theme, currency and export-dialog opening must not rebuild Excess analytics.
- The bounded Excess workspace gives Worklist and Detail independent scroll ownership while keeping Worklist header, pagination and Detail header reachable.
- Excess -> Actions navigation uses scoped navigation adapters with row key, entity key, exact Material/Plant identity and unique-material fallback only; it does not mutate Actions, filters, Registry or Package revisions.

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

EX-UX-01 through EX-UX-01.3 close presentation ownership around this analytical model:

Accepted Excess Cases + current completed Historical evidence -> Excess Decision Workspace projection -> filters / Summary / Worklist / Decision Core -> View.

The Excess page reads the current completed Runtime state and does not calculate Excess or Historical metrics. Search, Plant, Program, Owner and Priority are presentation-only filters; the hidden generic Category state is deliberately excluded from the Excess projection. The Worklist presents Material, Net Addressable, Opportunity Score, Responsible Owner, Priority and the Detail affordance. Gross Excess remains secondary evidence, while relationship quality, scenarios, assumptions, Pilot Review and provenance remain available in the Decision Core disclosures.

Historical evidence is projected only through an exact current `inventory_row_key` relationship. Missing or ambiguous evidence remains unavailable and never triggers a Historical build or a raw-history rescan. Future Risk-Workbench reuse is visual and structural only: no shared cross-family Case contract or unified risk domain exists yet.

EX-UX-01.3 established `js/excess/excess-decision-workspace-model.js` as the sole owner of the pure, deterministic Decision Workspace projection. The current CH-EX-01A.1 contract is Workspace Projection version `3`; its Decision Readiness contract is independently versioned as `excess-decision-readiness-v2`, and its subordinate value-basis contract is `gross-net-reconciliation-v1`. `app.js` remains the UI adapter and localization boundary; it renders the projection but does not infer a second Case state, mutate analytical rows or run analytical engines.

Visible block sources are deliberately bounded:

| Visible block | Authoritative source |
| --- | --- |
| Compact Case header | Accepted Excess Case identity, existing Priority, Action status, Owner context and navigation identity. |
| Why Prioritized / Next Review Step | Existing Case reasons and existing Action decoration. |
| Cause Hypothesis | Existing `root_cause`, with supporting signals only from Case reasons, Evidence Records and exact Historical evidence. |
| Decision Readiness and Limits | Versioned presentation truth table over identity, finite value basis, Cause, Recommendation, next step, Owner, Relationship, History, limitations, `whyNotHigher` and primary-option checkability. |
| Action Options | Whole authoritative Recommendation plus structured Scenario availability, explicit decision results or concrete Purchase Order evidence. |
| Historical Evidence | Current completed Historical Runtime for the exact `inventory_row_key`; canonical monthly buckets only. |
| Gross-to-Net Value Logic | Existing Inventory, Gross Excess, overlap, Net Addressable and remaining-inventory Case values with explicit availability state. |
| Work Context | Existing Action status, Owner function/reference/source/confidence and decision type. |

Each Action Option carries `optionCode`, `labelKey`, status, primary flag, field-level evidence, missing evidence, next check and provenance. Free text is not split to manufacture options. Purchase Order status is projected separately for Package missing, loaded/no exact match, insufficient evidence and concrete Case evidence. No Slow / Dead Action Engine is reused for Excess.

Historical presentation state differentiates `package_missing`, `loaded_no_exact_relationship`, `not_calculated`, `limited`, `insufficient`, `available` and `runtime_error`. The projection reads completed Runtime results only and does not schedule a build, scan source rows or derive pseudo-buckets from rolling metrics.

The visible core owns business-facing decision narrative, options, History, Value Logic and Work Context. Closed disclosures own additional scenarios, raw evidence records, Relationship diagnostics, technical Owner fields, Pilot Review and provenance. Pilot Review never derives or changes Action status. Missing/invalid numeric values remain unavailable while a finite zero remains an available value.

EX-UX-01.3.1 closes the presentation contract without adding an analytical capability. Historical Unit Context is projected from the completed Runtime metric's canonical `unit`, `provenance.historyUnit`, `provenance.unitStatus`, Inventory unit and canonical monthly-bucket units. A single unit is displayed, a missing unit remains unavailable and a conflict suppresses the chart projection. The adapter neither converts units nor invokes Semantics, Relationship, Aggregation or Runtime builds.

Purchase Order evidence is Case-local. `purchaseOrderEvidence()` reads only existing PO number/detail and quantity/value fields from the current Case `source_row`, labels their provenance as `inventory_row_fields` and classifies the result as `concrete`, `insufficient` or `no_case_evidence`. `purchase_orders` remains a `contract_only` Registry definition without `importSupported`, Builder registration or upload control. The Decision Workspace therefore receives `purchaseOrderPackageImportSupported: false`; Registry fixtures cannot unlock a production capability and no PO import CTA is rendered.

The UI adapter keeps the primary Recommendation expanded and renders only secondary structured Action Options as native disclosures. The fixed Case header remains the visible owner of Action status and compact Owner identity. The Work Context block owns supplementary decision type, Owner source, assignment confidence and session-only wording; the closed technical disclosure retains the complete Owner fields. This hierarchy does not alter Action or Pilot Review ownership.

Current cross-package relationship support is intentionally limited to two explicit pipelines:

- Inventory Snapshot -> Material Master Context Enrichment.
- Inventory Snapshot -> Consumption History Relationship -> Derived Historical Metrics.

The architecture does not provide arbitrary Package joins, Purchase Order optimization, Demand Forecast integration, Quality Package integration, Finance Recognition relationships or Action Outcome learning.

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

The production bootstrap loads the productive Slow / Dead Condition Engine and visible page/runtime modules, but it does not load the analysis-only Calibration Contract, Calibration Runner, Calibration Metrics or Threshold Sensitivity modules. `app.js` and the visible product workflows have no dependency on those four modules.

The structured test boundary is `tests/tests.html`. It activates test mode through the pre-bootstrap `window.__OBSOLIQ_TEST_MODE__ = true` flag only, loads the product shell in an iframe and exposes controlled bridge methods for regression tests.

`tests/test-helpers.js` owns the explicit analysis bootstrap. It adds Calibration Contract, Runner, Metrics, Sensitivity and the synthetic Fixture package in dependency order to a fresh product frame. This keeps analysis reproducible through the existing file-based test entry without adding a product route, Calibration UI or Policy mutation path.

URL query parameters cannot activate test mode.

## R0A Safety Boundaries

The Dataset Builder and Recovery boundary accepts derived financial evidence only when every required input and the derived result are finite and non-negative. Negative values, non-finite values and overflow remain `null` with explicit unavailable diagnostics; validated zero remains available evidence.

Inventory import applies an Inventory-only non-empty-row gate before Mapping, Registry activation, Dataset identity consumption or UI commit. A header-only source therefore cannot replace the active Dataset. The transaction retains the prior analytical rows, KPIs, filters, Actions, reviews, Registry snapshot and identity sequence.

Family adapters keep the canonical Family Case contract strict while containing missing Inventory Entity identity at the collection boundary. Invalid candidates are excluded fail-closed and diagnosed; no synthetic material identity is invented.

## Unified Inventory Risks Runtime

The visible shell exposes one `inventory-risks` route. Excess & Demand, Slow / Dead and Blocked / Quality remain separate Family Cases. The Portfolio Service groups those cases by stable Inventory Entity, elects one Primary Family by deterministic precedence and retains all other families as Secondary Family evidence with their original IDs and provenance.

Evidence aggregation is conservative: a weaker Secondary Family state can lower the Portfolio Evidence state. Evidence Readiness is calculated only across currently filtered Portfolio Cases as ready-capable cases divided by all filtered Portfolio Cases. A zero denominator produces unavailable, never a synthetic zero percentage.

Financial semantics remain intentionally separate. Excess exposes Net Addressable Recovery, Slow / Dead exposes Inventory Exposure and Blocked / Quality exposes Blocked / Quality Value. The Page Model does not add these heterogeneous amounts into a combined recovery total.

Blocked / Quality is currently a limited exposure and evidence adapter. It is not a full Recovery Engine because release, rework, supplier-return, approval and success-probability data is absent. The adapter cannot create recoverable quantity or recoverable value without accepted evidence.

## Package Integrity And Review Bundle

PKG-02 defines a repository-relative package inventory through `scripts/sha256-manifest-lib.cjs`. `scripts/generate-sha256-manifest.cjs` hashes exact file bytes into lexicographically sorted `SHA256SUMS.txt`; `scripts/verify-sha256-manifest.cjs` rejects invalid, duplicate, missing, mismatched, unlisted and out-of-scope paths. The manifest excludes itself, Git metadata, dependencies, temporary output, screenshots and generated review bundles. R0B keeps the captured baseline immutable and records every later Runtime, test or verification addition explicitly in the authorized delta.

After manifest verification, `scripts/build-pkg-02-review-bundle.cjs` creates a deterministic stored ZIP containing every manifest-listed file plus `SHA256SUMS.txt`. The bundle is accepted only after extraction into a fresh directory, manifest revalidation, central contract tests, the complete browser suite and a productive `file://` smoke run from the extracted package.

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
