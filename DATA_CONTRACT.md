# ObsoliQ Data Contract

## Canonical Inventory Data Contract

The canonical inventory model describes SAP-like inventory rows after source parsing and mapping. It includes identifiers, organization fields, planning context, quantity/value fields, recovery inputs, calculated recovery fields and action fields.

The current MVP keeps original source columns visible in the Inventory Explorer while analytical calculations use canonical fields.

## EX-UX-01.4 Excess Decision Visual Contract

EX-UX-01.4 introduces no new analytical entity. The four visuals are deterministic render projections of fields already accepted by the `ExcessDecisionWorkspaceProjection` and Opportunity Score Engine.

### Gross-to-Net Value Bridge

The renderer consumes the existing availability objects in `valueNarrative.fields`. The only bridge equation is:

```text
grossExcessValue - overlapValue = netAddressableValue
```

`stockValue` and `remainingInventoryValue` are contextual values outside that equation. A numeric `0` is available evidence. Missing or invalid values have `available: false` and cannot be rendered as zero. `netAddressableValue` has status `identified_potential`; it is not Expected Recovery, approved value, realized value, Cash, Working-Capital Recognition or P&L impact.

### Historical SVG Projection

The chart input is only `historicalEvidence.monthlyBuckets[]` from the current completed exact-row Historical Runtime. Each accepted display bucket retains its canonical `month`, numeric `netQuantity` and canonical quantity `unit`. The view sorts existing bucket records chronologically and displays at most the last twelve. It may derive SVG coordinates, minimum, maximum and zero-baseline position for presentation, but may not derive a new monthly quantity.

No bucket can be reconstructed from 3M, 6M, 12M, average, trend or coverage fields. Missing months are not inserted. Negative net consumption and zero remain unchanged. Unit state remains `available`, `missing` or `conflict`; conflict produces no merged chart. Existing `partial_current_period` or equivalent Runtime provenance is a display marker only. No Forecast series exists in this contract.

### Opportunity Score Contribution Projection

`js/excess/opportunity-score-engine.js` exposes an immutable `componentMaximums` metadata object matching the existing model:

```javascript
{
  financial_impact: 35,
  urgency: 20,
  actionability: 20,
  evidence: 15,
  data_confidence: 12
}
```

The visual consumes existing `opportunity_score_components` values and calculates display width as `contribution / componentMaximums[component]`, clamped only to the visual track. It does not calculate a component or total score. The visible total remains the existing `excess_opportunity_score` / `opportunity_score` out of 100 and is prioritization, not probability.

### Decision Readiness Matrix Projection

The Matrix consumes the existing versioned Readiness result unchanged. `existingEvidence` is presented as Available. `missingEvidence`, `decisionLimits` and `whyNotHigher` are presented as Open / limited. At most four records per column are directly visible; remaining records stay available through a native disclosure. The renderer may remove duplicate display labels but cannot create evidence, change status, change `nextCheck` or evaluate a new truth table. `whyNotHigher` is not rendered again as a separate decision block.

All graphical values retain an adjacent textual value or accessible description. SVG figures require captions; score tracks expose contribution and actual maximum; CSS status marks are supplementary to text. These view contracts create no persistence, Package revision, export field or Registry mutation.

## AP 16.4a Consumption History Data Package Contract

Consumption History is an optional Data Package with package type `consumption_history` and schema version `consumption-history-v1`.

Required canonical fields:

- `material_id`
- `consumption_quantity`
- one raw temporal reference: `posting_date` or `period`

Optional canonical fields:

- `plant`
- `base_unit`
- `movement_type`
- `consumption_value`
- `movement_count`
- `storage_location`
- `document_id`
- `document_item`

The package builder preserves identifiers and raw temporal values as source text. It does not parse dates, derive periods, create buckets, infer movement semantics or convert units. Numeric consumption fields are parsed through the existing localized numeric parser; zero quantities are valid, negative quantities are retained and diagnosed, and invalid required quantities block the package.

Each normalized row receives a `package_row_key`, the original `__sourceRowIndex` and mapped package fields. `package_row_key` is deterministic and technically stable only within one Package revision. It is not a semantic SAP movement identity, a cross-revision event ID or a cross-upload deduplication key.

Consumption History key taxonomy:

- `entityKeys`: `material_id` and optional `plant`
- `temporalReference`: `posting_date` and `period`
- `eventIdentity`: `document_id`, `document_item`, `movement_type`, `storage_location`, quantity and `base_unit`
- `unitContext`: `base_unit`

Only `entityKeys` may later participate in Inventory-to-History relationship matching. `posting_date` and `period` are temporal references, not Inventory relationship keys. A later Inventory relationship may use `material_id` plus `plant` with controlled Material-only fallback, but no such relationship is executed in AP 16.4a or AP 16.4b.

A later semantic event identity must be built from available business evidence such as `material_id`, `plant`, normalized posting date or period, `document_id`, `document_item`, `movement_type`, signed quantity and `base_unit`. Freshness metadata records the package as `raw_history_uninterpreted`.

Diagnostics are package-scoped. AP 16.4a reports missing required mappings, invalid required quantities, negative quantities, missing units, multiple units and exact duplicate source rows. Duplicate source rows are retained; diagnostics do not mutate Raw Source.

The contract is isolated from Inventory Snapshot calculations. Consumption History package rows are not yet joined into Recovery, slow/dead-stock classification, Data Quality Score, Action Cockpit, Opportunity Score, scenarios, Pilot Review or exports.

## AP 16.4b Consumption History Semantic Contract

`SemanticInterpretationPolicy` is package-scoped and versioned as `consumption-history-semantics-v1`. It stores quantity locale and scale policy, Posting Date format, Period format, analysis-as-of ownership, Movement Type rule-set identity and unit policy. Its deterministic signature is stored in package build metadata.

Supported temporal formats are:

- Posting Date: `yyyy-mm-dd`, `dd.mm.yyyy`, controlled `mm/dd/yyyy`, `yyyymmdd`, `excel-serial`
- Period: `yyyy-mm`, `yyyymm`, `mm/yyyy`

Auto mode never guesses ambiguous slash dates. Date-only values are normalized to `YYYY-MM-DD` strings without time-zone conversion. When Posting Date and Period are both mapped, Posting Date has row-level priority; conflicting periods are diagnosed.

`analysisAsOf` may be `inventory_snapshot`, `user_confirmed` or `unavailable`. The browser current date is not a valid analytical reference. Future movement diagnostics are emitted only when `analysisAsOf.date` is explicit.

Movement semantics use rule set `sap-consumption-movement-mvp` version `1`. `261` is `consumption`, `262` is `reversal`, and unknown Movement Types remain `unknown`. Negative source quantity is preserved but is never sufficient by itself to classify a movement.

Each semantic row may contain:

- `raw_posting_date`
- `raw_period`
- `temporal_source`
- `normalized_posting_date`
- `normalized_period`
- `temporal_precision`
- `temporal_parse_status`
- `temporal_diagnostic_codes`
- `temporal_status`
- `temporal_consistency_status`
- `movement_semantic`
- `movement_rule_set_id`
- `movement_rule_set_version`
- `signed_consumption_quantity`
- `absolute_consumption_quantity`
- `net_consumption_quantity`
- `normalized_base_unit`
- `unit_status`
- `aggregation_eligible`
- `entity_key`
- `temporal_reference_key`
- `event_identity_key`
- `event_identity_status`
- `unit_context_key`
- `duplicate_semantic`

Units are normalized as tokens only. There is no unit conversion, no compatibility claim and no aggregation across unlike units. Missing and multiple-unit contexts are diagnostics.

Duplicate semantics distinguish exact source duplicates, business duplicate candidates and legitimate repeated movements. No duplicate is automatically deleted.

History Readiness is deterministic and package-scoped. It summarizes semantic row count, ready row count, diagnostics, history coverage end and analysis-as-of state. `historyCoverageEnd` is descriptive coverage evidence only and is not an `analysisAsOf` date. It does not change Inventory Data Quality Score, Recovery, Actions, Opportunity Score, scenarios or Pilot Reviews.

### AP 16.4b.1 Source-Bound Interpretation Contract

Quantity, Posting Date and Period interpretation policies are source-bound. Header text alone is not physical identity. Each source-bound section must include:

- `canonicalField`
- `sourceIndex`
- `sourceKey`
- `sourceColumn`

`sourceIndex` is a JavaScript number, must be an integer `>= 0` and is not coerced from text, boolean, `null` or empty string. `sourceKey` must match the current `sourceColumnMetadata[sourceIndex]`. Duplicate visible headers are distinguished by `sourceIndex` and `sourceKey`.

Quantity policy includes `numericLocale`, `scaleSource`, `sourceScaleFactor`, `userConfirmed`, `confirmedAt` and `confirmationReason`. Posting Date policy includes `dateFormat`, `excelDateSystem`, `userConfirmed`, `confirmedAt` and `confirmationReason`. Period policy includes `periodFormat`, `userConfirmed`, `confirmedAt` and `confirmationReason`.

Source-bound confirmation is valid only while the current reviewed Mapping still points to the same physical source identity. If a mapped physical source changes, the previous section policy is stale, confirmation is reset and the top-level History confirmation is invalidated. A stale Quantity, Posting Date or Period policy must block Builder and Registry commit, and failed interpretation or signature-invariant checks must not create a Package, consume a Package ID or create a revision.

The semantic-policy signature includes the physical source identity and review-relevant policy values for Quantity, Posting Date and Period. Package Import verifies the Interpretation Service signature against the Builder signature before commit.

Explicit Quantity Scale requires `scaleSource = "explicit"`, a valid finite `sourceScaleFactor` from the supported factor set and current review confirmation. Invalid explicit factors block Apply. Excel serial-date interpretation requires an explicit `excelDateSystem` of `1900` or `1904`; ObsoliQ does not guess the date system, and the Excel 1900 phantom leap date is invalid.

`analysisAsOf.source = "inventory_snapshot"` requires an Inventory Package ID and positive Package Revision. `historyCoverageEnd` is coverage evidence only and cannot become `analysisAsOf` automatically. Browser date is not a valid analytical as-of source.

Interpretation Trust and History Readiness are separate contracts. Trust describes whether the interpretation policy can be applied. History Readiness is produced by the Semantics Engine from temporal, movement, unit and event evidence. Data Foundation displays Consumption History Package availability separately from analytical History Readiness and does not calculate Readiness.

### AP 16.4c Inventory Relationship & Historical Metrics Contract

Inventory entity keys use `material_id` and `plant` exactly as normalized text tokens: `material:<material_id>|plant:<plant>`. History entity keys use the same shape. Material IDs are not numeric-coerced, so leading zeroes remain part of identity.

Relationship states are `exact_material_plant`, `material_fallback`, `unmatched`, `ambiguous` and `invalid_key`. Exact Material + Plant matching has priority. Material-only fallback is allowed only when the Inventory side and History side each have one unique entity for the material. If plantless History could fan out to multiple plant-specific Inventory entities, the relationship is `ambiguous` with reason `material_history_fanout_blocked`.

The relationship result stores model version, deterministic signature, package IDs, package revisions, entity counts, exact/fallback/unmatched/ambiguous/invalid counts, match indexes, unmatched entities, ambiguous diagnostics, invalid-key diagnostics and limitation codes.

Historical aggregation consumes semantic Consumption History rows only. It uses `net_consumption_quantity`, `normalized_posting_date`, `normalized_period`, `temporal_precision`, `temporal_parse_status`, `movement_semantic`, `normalized_base_unit`, `aggregation_eligible`, `duplicate_semantic`, `event_identity_key` and `event_identity_status`. Raw Posting Date, Raw Period, Raw Movement Type and raw quantity sign are not reinterpreted.

Exclusion provenance records the Package row key, source row index, History entity key, temporal reference, movement semantic, unit context, duplicate semantic and exclusion reasons. Known exclusions include future movements, unknown movement semantics, missing net quantity, missing unit, unit conflict, exact-source duplicate ambiguity, business-duplicate ambiguity, unmatched relationships, ambiguous relationships and invalid relationships. Excluded rows are not deleted.

Rolling windows are calendar-month windows anchored by explicit `analysisAsOf.date`. The current browser or system date is not a fallback. A non-month-end as-of date sets `partial_current_period = true`. Day precision remains date evidence, month precision remains period evidence and month precision is not converted into an invented day.

Historical metrics include Last Consumption date/period/precision, Net Consumption 3M/6M/12M, Average Monthly Consumption, Active Consumption Months, Movement Frequency, Intermittency, Months Since Last Consumption, Consumption Trend, History Coverage start/end, History Completeness, Inventory Coverage Months and Estimated Run-out Months.

Metric status is `available`, `limited` or `unavailable`. Coverage and run-out require stock quantity, Inventory unit, History unit, compatible unit tokens, positive average consumption and sufficient covered months. There is no unit conversion and no financial-value substitute for missing quantity evidence.

Metric provenance includes Inventory Package ID/revision, History Package ID/revision, semantic-policy signature, relationship model version, aggregation model version, historical metric model version, window model version, Analysis-as-of date/source/provenance, relationship state, unit status, included/excluded row counts, coverage range and limitation codes.

The Historical Metrics Runtime is derived and session-local. It indexes metrics by Inventory entity and exposes shared row-level views for repeated Inventory rows. Entity-level metric authority prevents row-level portfolio double counting. Runtime signatures include Package identity, revisions, semantic policy, model versions and Analysis-as-of evidence; changed inputs invalidate stale metrics. Metric calculation does not create Package revisions and does not mutate Raw Source or authoritative Inventory analytical rows.

### AP 16.4c.1 Historical Metrics Runtime State Contract

`HistoricalMetricsRuntimeState` is the authoritative application-level state for derived Historical Metrics. Allowed statuses are:

- `not_calculated`: the current eligible input has not produced a Runtime yet or was invalidated.
- `calculating`: a build for the current input signature was accepted and scheduled.
- `available`: a successful Runtime exists for the current input signature and metrics are fully available.
- `limited`: a successful Runtime exists for the current input signature, but relationship, coverage, readiness or evidence limitations apply.
- `unavailable`: required evidence is missing, invalid or not analytically usable.
- `error`: an unexpected build, relationship, aggregation or commit exception occurred.

The state carries `inputSignature`, `requestedInputSignature`, `completedInputSignature`, `generation`, optional `result`, `relationshipResult`, `summary`, `reasonCode`, `limitationCodes`, `errorCode`, `errorMessage`, `requestedAt`, `startedAt`, `completedAt` and `durationMs`. Runtime results are current only when the completed signature equals the active input signature. Changed analytical inputs invalidate the previous completed signature before recomputation, and generation checks reject stale completions.

Build lifecycle is request-driven. Inventory Package changes, Consumption History Package changes, semantic-policy changes and Analysis-as-of changes are valid invalidation/build triggers. Rendering Data Foundation, Overview or Inventory Explorer, opening or closing disclosures, language changes, theme changes, currency changes, filters, sorting, pagination and export-dialog opening are non-triggers.

Build deduplication is signature-based. One completed signature is not rebuilt by repeated requests, and one in-flight signature cannot start a second concurrent build. Explicit retry is allowed only for an error or forced retry path. Runtime calculation is derived and session-local; it must not create a Package, Package revision or Raw Source mutation.

Package presence, Package validity, Interpretation Trust, History Readiness and Historical Metrics availability are separate contracts. A package record can exist while being invalid, limited or analytically unavailable. An imported limited source is displayed as imported plus limited, not as fully ready. An invalid package is not counted as available or usable.

Data Foundation reads a presentation model derived from these states only. It does not calculate analytics. Missing evidence is not zero: unavailable numeric values render as `n. v.` / `n/a` or are omitted, while calculated numeric zero renders as `0`. Unavailable Boolean values render as `n. v.` / `n/a`, while calculated `false` renders as `Nein` / `No`.

### AP 16.4d.1 Slow / Dead Recovery Case Contract

`SlowDeadConditionPolicy` is versioned as `slow-dead-condition-policy-v1` and owned by `js/slow-dead/slow-dead-condition-engine.js`. It includes explicit MVP thresholds for minimum History coverage, minimum History completeness, strong completeness, Slow-Moving months since last consumption, Slow-Moving coverage, minimum Slow evidence dimensions, Non-Moving age, Dead Candidate age, minimum active months for recurring demand, intermittency threshold, recent intermittent consumption and the mandatory independent Dead-Stock signal requirement.

Condition codes are:

- `insufficient_evidence`
- `intermittent_expected`
- `slow_moving_candidate`
- `non_moving_candidate`
- `dead_stock_candidate`
- `strategic_reserve`

Condition status values are `insufficient_evidence`, `candidate`, `intermittent_expected`, `strategic_reserve` and `no_case`. Precedence is deterministic: insufficient evidence, Strategic Reserve, intermittent expected demand, Dead Stock Candidate, Non-Moving Candidate, Slow-Moving Candidate, no case.

Critical evidence gates require a current Historical Runtime, usable Inventory-to-History relationship, sufficient History coverage, sufficient History completeness, Months Since Last Consumption, rolling 12-month consumption evidence and usable unit context. Failed gates produce `insufficient_evidence`; missing evidence is not treated as zero demand.

Dead Stock Candidate requires age, no recent consumption, strong History completeness and an independent demand, planning or lifecycle signal. Age alone can never create a Dead Stock Candidate. Dead Stock Candidate is not a disposal approval, a write-down approval or a recognized financial value.

Strategic Reserve requires explicit reserve evidence. It is not inferred from age, high stock value, high Inventory Coverage or zero movement alone. Strategic Reserve suppresses Slow / Dead conclusions and makes disposal not recommendable.

Evidence Strength is categorical: `high`, `medium`, `low`, `insufficient` or `not_applicable`. Condition Confidence is categorical: `high`, `medium`, `low`, `unavailable` or `not_applicable`. No pseudo-probability is part of this contract.

Each Condition result includes `positive_evidence`, `counter_evidence`, `limitation_codes`, `missing_evidence`, `root_cause_candidates`, `recovery_case_eligibility`, `action_eligibility`, `required_data_packages`, model versions, policy and a deterministic condition signature. Root-Cause Candidates remain hypotheses backed by evidence codes; they are not asserted facts.

Action Eligibility is pre-decisional. It may expose actions such as `COLLECT_EVIDENCE`, `IMPORT_MISSING_DATA`, `OWNER_REVIEW`, `MONITOR`, `CONSUME_NATURALLY`, `PLANNING_PARAMETER_REVIEW`, `INTERNAL_TRANSFER`, `SUPPLIER_RETURN`, `ALTERNATIVE_USE`, `EXTERNAL_SALE`, `WRITE_DOWN_REVIEW`, `DISPOSAL_REVIEW` and `PO_REDUCE`. Eligibility status is not a final recommendation or workflow approval. Disposal is never automatically approved.

Required Data Packages use only existing package types: `demand_forecast`, `purchase_orders`, `planning_parameters`, `quality`, `finance` and `actions_outcomes`. AP 16.4d.1 creates no new Package type and no Package revision.

`SlowDeadRecoveryCase` is entity-authoritative. It contains `case_id`, `case_fingerprint`, `inventory_entity_key`, `inventory_row_keys`, material and plant context, stock quantity/unit/value, condition fields, evidence, candidates, eligibility, required packages and provenance. The Case ID is deterministic from dataset identity and Inventory entity key, so repeated rows for one entity do not duplicate Cases.

`SlowDeadRecoveryCaseServiceResult` contains `status`, `reason`, `serviceModelVersion`, `runtimeModelVersion`, `inputSignature`, `cases`, `casesById`, `caseIdByInventoryEntityKey`, `summary`, `diagnostics`, `evaluatedAt` and `durationMs`. Summary counts and values are deduplicated by Inventory entity, not by row.

The derived `SlowDeadRecoveryCaseRuntime` is session-local and downstream from Historical Metrics Runtime. It does not mutate Inventory rows, Historical Metric rows, existing Action rows, Registry records or exports. Inventory exposure is not Recovery Value, recognized value, realized value, cash release or P&L effect.

`SlowDeadRecoveryCaseRuntimeState` is the authoritative application-level state for the derived Slow / Dead Recovery Case Runtime. It carries `status`, `inputSignature`, `requestedInputSignature`, `completedInputSignature`, `historicalMetricsInputSignature`, optional `result`, optional `summary`, `reasonCode`, `limitationCodes`, `errorCode`, `errorMessage`, `errorSource`, `generation`, `buildCount`, `requestedAt`, `startedAt`, `completedAt`, `updatedAt` and `durationMs`.

Allowed Runtime states are:

- `not_calculated`: no eligible current input has yet been evaluated or the input was explicitly reset before a dependency/build state exists.
- `calculating`: Historical Metrics are calculating, or a Slow / Dead build for the current Historical signature is running.
- `available`: a coherent current Slow / Dead Service result exists for the completed input signature.
- `limited`: a coherent current result exists, but non-critical History/evidence limitations are present.
- `unavailable`: required Historical input/result/signature is missing, stale, unavailable or the Service returned a coherent unavailable result.
- `error`: the Historical dependency is in error or the Slow / Dead build failed unexpectedly.

Coherence rules: `available` and `limited` require current `result` and `summary`; `calculating`, `unavailable` and `error` must not carry stale Case `result` or `summary`. Historical dependency errors use `errorSource: "historical_runtime"`; Slow / Dead Service exceptions use `errorSource: "slow_dead_runtime"`. Historical calculating, unavailable, missing-signature and stale-signature states never invoke the Slow / Dead Service and never create false Conditions. Runtime updates do not create Package revisions, Registry mutations, existing Action mutations or export changes. Existing text-based `slow_dead` Action logic remains outside the new Condition and Action Eligibility contract.

### AP 16.4d.2 Slow / Dead Recovery Case Page Contract

The Slow / Dead page consumes `SlowDeadRecoveryCaseRuntimeState` as its only analytical truth. It supports the six accepted Runtime states: `not_calculated`, `calculating`, `available`, `limited`, `unavailable` and `error`. Only `available` and `limited` expose current Cases; other states render truthful unavailable or in-progress messages without stale Case rows.

One Inventory entity produces one visible page Case row. The page deduplicates by `inventory_entity_key`, falling back to Case identity only when an entity key is unavailable. Repeated source rows may appear in `inventory_row_keys`, but they must not multiply Case count, Condition count or Inventory Exposure.

Page fields are display projections of the accepted Case contract: `case_id`, `inventory_entity_key`, `inventory_row_keys`, material and plant context, `condition_code`, `evidence_strength`, `condition_confidence`, stock quantity/unit/value, Owner Context, positive evidence, counter evidence, `limitation_codes`, `missing_evidence`, Root-Cause hypotheses, `recovery_case_eligibility`, `action_eligibility`, `required_data_packages` and provenance. Missing Inventory Exposure is displayed as unavailable, never as a false zero. `stock_value` is nullable Inventory Exposure for this page and is not Recovery Potential, Expected Recovery Value, recognized value, realized value, cash release or P&L effect. Actual numeric zero remains `0`.

Portfolio summaries expose `inventoryExposureAvailableValue`, `inventoryExposureAvailableCaseCount` and `inventoryExposureUnavailableCaseCount`. Unavailable exposure is excluded from the available value total and must not be counted as a calculated zero.

Slow / Dead navigation target identity is authoritative in this priority order: `inventory_row_keys`, `inventory_entity_key`, exact `material_id + plant`, then material-only fallback only when the target is unique. Reveal state is temporary presentation state. It may make an exact hidden Inventory or Action target visible, but it must not become persistent analytical filter state and must not change Inventory Summary, Action Summary or Export scope.

Owner Context projection uses existing Action Owner Context plus Inventory/Material-Master provenance to project `owner_function`, `owner_reference`, `owner_reference_field`, `owner_source` and `owner_assignment_confidence` into `SlowDeadRecoveryCase`. Owner Context is operational context only; it does not change Condition classification, Evidence Strength, Condition Confidence, workflow assignment or Action status. `owner_source` is limited to `inventory`, `material_master` or `none`, and missing Owner Context remains unavailable.

### AP 16.4d.3a Slow / Dead Calibration Case Contract

`SlowDeadCalibrationCase` is versioned as `slow-dead-calibration-case-v1`. Every Case has a unique `calibration_case_id`, fixed `reference_date` `2026-08-25`, Inventory entity identity, the productive `slow-dead-condition-policy-v1` identity, a complete Engine input snapshot, expected existing Condition/evidence outputs, required and forbidden Reason Codes, Protection Flags, Rationale Codes, Safety-Invariant coverage and Label Provenance.

The Fixture schema remains v1 because no Fixture literal or Expected Condition changed. `slow-dead-calibration-numeric-boundary-v1` is the separate adapter contract for the 16 numeric fields in each Engine input snapshot. It uses productive `numericEvidence(...)` results and retains source type, explicit-zero status, normalized value, parse status and Reason Codes. Missing stays non-numeric, Invalid or Ambiguous rows are retained as excluded results, and none of those states is converted to zero.

Allowed source types are `synthetic_acceptance_fixture` and future `pilot_expert_label`. Every AP 16.4d.3a Case is `synthetic_acceptance_fixture`, uses provenance basis `published_policy_contract` and has `human_expert_validated: false`. A future `pilot_expert_label` is invalid without explicit human validation, reviewer identity, UTC review timestamp and review rationale. Synthetic fixtures must not contain reviewer provenance or claim expert validation.

Expected Conditions use the six existing productive values `insufficient_evidence`, `intermittent_expected`, `slow_moving_candidate`, `non_moving_candidate`, `dead_stock_candidate` and `strategic_reserve`; `no_case` is allowed only as the existing boundary-control result. Evidence Strength and Condition Confidence use only the existing Engine enums. Calibration introduces no product Condition.

Stable Calibration Rationale Codes include `insufficient_history`, `low_history_completeness`, `recurring_intermittent_demand`, `explicit_strategic_reserve`, `independent_dead_signal_present`, `independent_dead_signal_missing`, `ambiguous_relationship`, `unit_conflict`, `project_or_one_time_demand`, `threshold_boundary`, `definitive_classification_prohibited` and `dead_classification_prohibited`. Existing Engine evidence codes are reused for required/forbidden output expectations instead of creating synonyms.

Protection Flags cover explicit Strategic Reserve, intermittent demand, independent Dead signal, ambiguous relationship, unit conflict and project/one-time-demand context. They are assertion metadata only and never enter productive classification. Calibration Runner v2 emits one deterministic result per Case with numeric eligibility/status/evidence, expected/actual Condition where calculable, Agreement, stable disagreement code, critical-protection flag, productive Policy version, evidence comparison, action-boundary comparison and real Condition signature. Empty or wholly excluded input reports `insufficient_coverage`, `not_calculable` agreement and `not_evaluated` Safety.

The Calibration Policy reference is the same frozen object as `DEFAULT_SLOW_DEAD_CONDITION_POLICY`; no duplicate threshold object and no Policy override exist. Fixtures and Runner output are deterministic and immutable. The Runner cannot mutate Inventory rows, Historical Runtime, Packages, Package revisions, Sessions, Actions, Excess or Opportunity Score.

### AP 16.4d.3b Calibration Metrics And Threshold Sensitivity Contracts

`SlowDeadCalibrationMetrics` is versioned as `slow-dead-calibration-metrics-v2`. It accepts only a validated Calibration Fixture set, Calibration Runner v2 Result Rows and deterministic scenario metadata. Its output contains Fixture validity and eligible/excluded counts, calculability status, Synthetic Contract Agreement when calculable, expected/actual/agreement/disagreement counts by Condition, Boundary Stability, Reason-Code coverage, twelve-invariant results, Safety status, deterministic repeatability and Policy/Fixture/Result fingerprints. It performs no classification and makes no customer, Pilot or human-expert quality claim.

`SlowDeadThresholdSensitivityPlan` is versioned as `slow-dead-threshold-sensitivity-plan-v1`. It contains exactly 17 scenarios: one productive Baseline and two alternatives for each of eight parameters. Every alternative is OFAT and carries `analysisOnly: true` and `productionEligible: false`. Candidate Policies must preserve `slowMoving < nonMoving < deadCandidate`, minimum completeness not above strong completeness, valid completeness/intermittency ranges, positive integer month values and exactly one deviation from the productive Baseline.

`slow-dead-threshold-sensitivity-runner-v2` executes that unchanged plan through Calibration Runner v2. Scenario Result Rows preserve numeric status and evidence, and no empty or wholly excluded scenario can report a successful Safety or agreement result.

Each `SlowDeadThresholdSensitivityScenarioResult` contains the stable Scenario ID, changed parameter and values, changed/unchanged Case counts, deterministic migration buckets with unique Case IDs, boundary changes, ten Safety-Guard results, critical violation codes, Policy/Result fingerprints and explicit non-activation fields. Migration counts and Case-ID lists are one contract: each count equals the number of unique IDs in its bucket. Baseline against itself has zero migrations and zero critical violations.

Safety Guards are not sensitivity parameters. They protect independent Dead evidence, explicit Strategic Reserve and its precedence, recurring intermittent demand, ambiguous relationships, unit conflicts, insufficient History, low completeness, missing-versus-zero semantics, project/one-time-demand context and the prohibition on automatic Action approval. A migration alone is not a defect; only a registered Guard violation is critical. Unsafe variants remain visible for analysis but are never recommended, activated, ranked or persisted.

Fingerprints use the deterministic `slow-dead-calibration-fingerprint-fnv1a32-v1` content-identity scheme. They support reproducibility and are not security signatures. The artifacts contain synthetic fixtures only, create no productive Policy version and provide no Policy recommendation. Human Pilot Review and acceptance provenance remain exclusively in `AP 16.4d.3c`.

`AP_16_4D_3A_FIXTURE_BASELINE.md` is a Synthetic Contract Agreement report. It is not Pilot Accuracy or Expert Agreement and contains no Accuracy, Precision, Recall, F1, exposure-weighted metric, threshold optimization or sensitivity conclusion. Those capabilities remain separated into `AP 16.4d.3b` and `AP 16.4d.3c`.

The page filter contract includes search, Condition, plant, Evidence Strength, Condition Confidence, Recovery Case Eligibility, owner function, relationship state, required Data Package and missing-evidence filters. Sorting and pagination are deterministic presentation operations. They do not call the Slow / Dead Recovery Case Service, Historical Metrics Runtime or Registry.

The export contract writes one deterministic row per supplied Recovery Case. Export columns preserve Case identity, entity identity, row-key traceability, Owner Context, Condition, evidence, limitations, hypotheses, eligibility, required Packages and Package/model provenance. Text identities such as leading-zero material IDs remain text, and the existing spreadsheet/CSV download path owns formula-injection protection. Inventory Exposure and Currency are separate columns; the export must not hard-code an `(EUR)` suffix or imply FX conversion.

### DF-UX-02 Data Foundation Presentation Contract

The Data Foundation presentation contract distinguishes these dimensions:

- Package Presence: whether a source Package record exists.
- Package Validity: whether the Package can be considered structurally usable.
- Interpretation Trust: whether reviewed Consumption History source semantics can be applied.
- History Readiness: whether interpreted History evidence is aggregation-ready or limited.
- Relationship State: whether Inventory can be related to Material Master or Consumption History.
- Historical Metrics Runtime State: whether derived historical metrics for the current signature are available, limited, calculating, unavailable or errored.

Presence is not readiness. Validity is not readiness. Relationship State is not Metrics State. A missing source suppresses dependent presentation instead of creating separate unavailable Relationship or Metrics cards. A presentation count must not imply several dimensions at once, so visible aggregate source counters are not part of the contract.

Unavailable is not numeric zero. Missing or unsupported evidence is omitted or shown as `n. v.` / `n/a`, while calculated zero and calculated false remain valid calculated values after Runtime completion.

Historical export availability is tied to the current Runtime signature. Historical export is disabled for `not_calculated`, `calculating`, `unavailable` and `error` states and enabled only for current `available` or `limited` Runtime results.

### DF-UX-02.1 Presentation Projection Contract

The collapsed Data Foundation Summary is a presentation projection only. `primaryText`, `secondaryText`, `missingExtensionCount` and `reviewSourceCount` communicate the prioritized visible state, but they do not replace the full source-state contract.

`sourceStates` remains the complete presentation contract for Inventory, Material Master and Consumption History source states. Missing, invalid, review-required, limited and error states remain distinct. A visible missing source may omit the text "Not Imported" when an Import action is present; this does not change Package presence semantics or Registry state.

Source-row variants are visual only:

- `compact-active`: active imported source evidence.
- `actionable-missing`: missing optional source with an Import action.
- `diagnostic`: invalid, limited, not-ready, review-required or error evidence.

The Data Quality source badge reflects the current Dataset source label, including uploaded filenames. Row and column metadata reflect current Dataset Meta counts. Header presentation does not create analytical truth, mutate Data Quality issues or write Package records.

## AP 16.3b.1.1 Pilot Review Record Contract

New Pilot Review records require the following identity fields before any Service mutation:

- `datasetId`
- `caseId`
- `inventoryRowKey`
- `packageId`
- `packageRevision`
- `caseFingerprint`
- `fingerprintVersion`
- `caseFingerprintPayload`
- `opportunityScoreModelVersion`

`packageRevision` is a strict positive integer. `caseFingerprintPayload` is a non-null plain object. `legacy-review-subject` is invalid for new Review creation, and legacy-shaped records can enter only through explicit restore or migration behavior.

Review IDs are allocated by a Service-owned `reviewSequence`. The sequence is included in snapshot output and restored collision-safely. Older snapshots without a stored sequence derive the sequence from the maximum numeric Review-ID suffix. Dataset-specific Review deletion never permits Review-ID reuse.

Current Review scope is based on the current Dataset, Case identity and Case fingerprint. Historical stale Review existence does not invalidate a current Review. A stale reassessment notice is shown only when no current Review exists; current-plus-history is presented as neutral history.

Relationship navigation reveal behavior is excluded from filtered Summary and Export semantics. Revealing a hidden Excess Case may adjust the visible Excess-only filter controls to show the target, but it is not a persistent analytical override.

## Source-Data Contract

A parsed source dataset contains:

- `headers`: original headers in source order
- `rows`: parsed source row objects
- `sourceColumnMetadata`: deterministic metadata for original, duplicate and technical source columns

The Mapping Engine maps source columns to canonical fields without mutating the original source rows.

`sourceIndex` is physical identity only inside the currently parsed file. It is not a semantic key across uploads, packages or sessions.

## Dataset Builder Input And Output

The Dataset Builder receives source rows, headers, source column metadata, an approved column mapping and compatible corrections.

It returns:

- normalized rows
- input-normalized analytical rows
- analytical rows
- recovery validation errors
- recovery input normalization diagnostics
- excluded source rows
- build metadata

`buildMetadata.datasetId` must match the runtime dataset ID.

`normalizedRows` keeps the existing canonical working-row contract. Input Trust normalization feeds analytical calculations through `inputNormalizedRows` and compact build metadata, without writing normalized values back to Raw Source.

## AP 16.2b.2 Input Trust Contracts

### ColumnProfile

`ColumnProfile` describes one physical source column: `sourceIndex`, `sourceKey`, `originalHeader`, normalized header token, duplicate metadata, populated/empty counts, numeric/text ratios, sample values, `NumericLocaleProfile` and `SourceHeaderHints`.

### NumericLocaleProfile

`NumericLocaleProfile` reports `status` (`dominant`, `mixed`, `insufficient`, `ambiguous`), dominant locale, decimal/thousands separators, German/English/Swiss/space-like counts, ambiguous/invalid counts, confidence and sample size. MVP defaults use minimum evidence of 5 values and 90% dominant share.

### SourceHeaderHints

`SourceHeaderHints` reports header-derived `sourceScaleFactor`, `sourceCurrency`, `sourceUnit`, `scaleSource`, matched tokens, confidence and warnings. Supported MVP examples include `kEUR`, `TEUR`, `EUR '000`, `Amounts in 000 EUR`, `Mio. EUR`, `Mrd. EUR` and `Quantity in thousands`.

### NormalizationPolicy

`NormalizationPolicy` may define per-field locale override, scale source (`header`, `cell`, `none`) and default field policy. Without explicit scale selection, simultaneous header and cell scale returns `double_scale` and is blocked for required financial interpretation.

### NormalizationDiagnostic and Summary

`NormalizationDiagnostic` stores severity, code, row number, canonical field, raw value, detected locale, scale factors, detected currency and warnings. Detailed diagnostics are retained for transformed, exceptional or unsafe values only. `NormalizationSummary` stores row count, transformed cell count, diagnostic counts, status, numeric/currency/percentage field lists and bounded transformed samples.

### NUM-01 Strict Numeric Contract

Numeric parsing is whole-input and fail-closed. A numeric input is `valid`, `missing`, `ambiguous`, `invalid` or an existing explicit scale-conflict status. Only `valid` produces a finite `normalizedValue`; a genuine zero is `valid` with `normalizedValue: 0`. `null`, `undefined`, an empty or whitespace-only string are `missing`. Unsupported JavaScript types, non-finite numbers and text with embedded or trailing numeric fragments are `invalid`. Ambiguous single-separator values such as `1,234` require an explicit or dominant locale profile before they become analytically usable.

Allowed envelopes are an optional whole-value sign or accounting parentheses, an optional currency token, one strict localized numeric core, and optional recognized magnitude, unit or percentage suffixes. Tokens are consumed only at their defined prefix or suffix positions. Arbitrary text removal, partial `parseFloat`-style recovery, sign folding and fallback to zero are prohibited. `toNumber()` therefore returns a finite number only for `valid` input and returns `null` otherwise.

Normalized analytical rows retain non-exported per-field parse metadata in `__numericParseResults`. Missing, ambiguous, invalid and double-scaled cells become `null`, while Raw Source remains unchanged. Recovery calculation is unavailable when required stock value evidence or a present Recovery input is invalid; the accepted Recovery formulas themselves are unchanged. Missing optional Recovery category inputs remain an intentional zero contribution because those independent additive categories are absent, not measured as a numeric zero. Runtime counters, sequence values and package revisions also retain their explicit structural zero defaults and are not analytical evidence.

Consumption History stores `consumption_quantity_parse_status` and machine-readable quantity limitation codes. Missing or invalid quantity is never aggregation-eligible. Quantity aggregation is entity-atomic for unit evidence: multiple units, one present plus one missing unit, or all units missing block every quantity metric for the entity. No unit conversion exists. Blocked entities expose `null` for rolling consumption, average, active months, frequency, completeness and Inventory coverage, plus codes including `missing_consumption_quantity`, `invalid_consumption_quantity`, `missing_unit_for_entity`, `multiple_units_for_entity` and `numeric_evidence_unavailable`.

The Slow/Dead Condition boundary treats these numeric and unit codes as critical evidence limitations. It can only return the existing non-definitive `insufficient_evidence` state and the existing evidence/review actions. Slow/Dead export writes missing or invalid numeric evidence as an empty cell and writes a genuine numeric zero as `0`; formula-injection handling remains downstream and unchanged.

### Schema Signatures and Drift

`SemanticSchemaSignature` is order-independent and based on normalized source headers, duplicate counts and header hints. `PhysicalSchemaSignature` is order-sensitive and includes source order and duplicate identity. `SchemaDriftResult` compares signatures against an explicitly supplied prior Package and can report unchanged, physical drift or semantic drift.

### MappingEvidence

Mapping evidence combines existing header/alias/manual confidence with content evidence from `ColumnProfile`: numeric/text compatibility, locale status, header scale, header currency and deterministic warnings. It never automatically swaps columns.

### ReviewedMappingEntry

`ReviewedMappingEntry` is the Mapping entry used by both the Mapping Assistant and Dataset commit after Input Trust assessment. It keeps the source-column identity and selected canonical field, then adds visible trust evidence: `baseConfidence`, `headerConfidence`, `aliasConfidence`, `typeConfidence`, `sampleConfidence`, `unitConfidence`, `localeConfidence`, `schemaConfidence`, `overallConfidence`, `evidenceReasons`, `warnings` and optional `normalizationPolicy`.

`overallConfidence` is the authoritative trust-adjusted confidence. For backward compatibility, `confidence` is set to the same value on reviewed entries.

Exact duplicate source headers are preserved with their physical source identities. Automatic Mapping selects the first exact duplicate for a canonical field and keeps later duplicates as preserved source columns unless the user explicitly maps them.

### InputTrustResult

`InputTrustResult` contains `trustState` (`trusted`, `review_required`, `blocked`), schema profile, schema drift, mapping validation, mapping evidence, normalization policy, normalization summary, diagnostics, normalized preview rows and compact `inputTrustMetadata`.

The full `InputTrustResult` is pending-review state only. It may exist while the Mapping Assistant is open, but is not committed to Dataset Meta or Package records.

### AP 16.2b.2.2 Applied Mapping And Policy Contract

`proposedMapping` is the automatic Mapping Engine proposal before Input Trust evidence is applied. `reviewedMapping` is the trust-adjusted Mapping shown to the user. `approvedMapping` is the reviewed Mapping after trusted automatic acceptance or explicit user confirmation. `appliedMapping` is the immutable Mapping committed to Dataset Builder, Dataset Meta and Package Mapping.

`appliedMappingSignature` is produced with `columnMappingSignature()` and must match:

- Dataset Builder `buildMetadata.mappingSignature`
- Dataset Meta `appliedMappingSignature`
- Package `mapping.mappingSignature`
- the signature of the Package `mapping.columnMapping`

`proposedNormalizationPolicies` come from Input Trust evidence and are keyed by canonical field while preserving physical source identity (`sourceIndex`, `sourceColumn`, `sourceKey`). `normalizationPolicyOverrides` contain only explicit user changes. Empty objects are not meaningful overrides.

`effectiveNormalizationPolicy = mergeNormalizationPolicies(proposedNormalizationPolicies, normalizationPolicyOverrides)`, followed by review-confirmation metadata. The merge is deterministic, DOM-independent, source-input immutable, per-column and preserves explicit valid `false`, `0` or `none` decisions.

`normalizationPolicySignature` is the stable serialized signature of the effective policy and must match:

- Dataset Builder `buildMetadata.normalizationPolicySignature`
- Dataset Meta `normalizationPolicySignature`
- Package top-level `inputTrustMetadata.normalizationPolicySignature`
- Package `buildData.inputTrustMetadata.normalizationPolicySignature`

The Mapping Assistant controls initialize from the proposed policy and then write only explicit overrides. Review confirmation applies to the effective policy that reaches Preview, Apply and Dataset Builder. A signature mismatch blocks commit and restores the previous runtime and Registry state.

### AP 16.2b.2.3 Source-Bound Normalization Policy

A committed field-level Normalization Policy must be bound to one physical source column:

- `canonicalField`: current approved canonical target
- `sourceIndex`: strict integer physical index in the current source file
- `sourceColumn`: current approved source-column audit label
- `sourceKey`: duplicate-aware source key from `sourceColumnMetadata[sourceIndex]`
- `numericLocale`
- `localeOverride`
- `scaleSource`
- `sourceScaleFactor`
- `sourceCurrency`
- `confirmed`
- `userConfirmed`
- `confirmationReason`
- `confirmedAt`

`sourceColumn` alone is not physical identity. Duplicate headers can share the same display label, so `sourceIndex` and `sourceKey` are mandatory for committed policies. The application validates policy identity with the reviewed Mapping before Dataset Builder and Package commit.

Policy roles are distinct:

- `appliedNormalizationPolicy`: committed policy used by the active Dataset
- `proposedNormalizationPolicies`: automatic Input Trust proposal for the current Mapping
- `normalizationPolicyOverrides`: explicit user edits in the current Mapping review
- `effectiveNormalizationPolicy`: reconciled policy used by Preview, Apply, Builder and Package commit

Reopening the Mapping Assistant starts from `appliedNormalizationPolicy`, `normalizationPolicySignature` and committed `inputTrustMetadata`. If the canonical target still points to the same physical source, the applied field policy remains visible and its signature is preserved. If the source changes, stale policy and stale confirmation are invalidated; the new source receives a fresh Input Trust proposal.

The source-bound `normalizationPolicySignature` includes the field policy identity. A stale policy for Source A cannot silently apply to Source B. If such a stale source-bound policy reaches a commit boundary, the source identity invariant blocks the transaction.

Supported `scaleSource` values are `header`, `cell`, `none` and `explicit`. `explicit` uses `sourceScaleFactor`; `header` uses source header hints; `cell` uses detected cell magnitude; `none` forces factor `1`.

### AP 16.2b.2.4 Confirmation Invalidation Contract

Top-level confirmation fields are part of the effective Normalization Policy:

- `reviewConfirmed`
- `confirmationMode`
- `reviewConfirmedAt`
- `confirmedAt`
- `confirmationReason`
- `sourceIdentityChanged`
- `sourceIdentityChangedCount`
- `staleOverrideCount`

Field-level confirmation fields are source-bound:

- `confirmed`
- `userConfirmed`
- `reviewConfirmed`
- `confirmedAt`
- `reviewConfirmedAt`
- `confirmationReason`

No confirmation may survive the physical source column for which it was created. If a canonical field is remapped to another `sourceIndex` / `sourceKey` / `sourceColumn`, stale top-level and field-level confirmation is cleared before any previous override is considered. While unresolved, the policy reports `confirmationReason = "source_identity_changed"` and must not carry `confirmationMode = "user_confirmed"` or a stale confirmation timestamp.

After re-evaluation, a current-source policy can be committed in two distinct modes:

- `trusted_automatic`: Input Trust independently classifies the current source interpretation as trusted.
- `user_confirmed`: the user confirmed the current source-bound interpretation through the Mapping Assistant.

A fresh `user_confirmed` state is valid only for field policies whose `canonicalField`, `sourceIndex`, `sourceKey` and `sourceColumn` match the current reviewed Mapping entry.

### Package inputTrustMetadata

Committed Data Packages store compact `inputTrustMetadata` with trust state, evaluated timestamp, semantic/physical schema signatures, schema drift, normalization summary, diagnostic counts and mapping evidence summary.

Material IDs, plants and other identifiers remain text. Currency detection is provenance only and performs no FX conversion. Ambiguous required financial values cannot silently become zero. Raw Source headers, rows, source order and duplicate source metadata remain immutable.

### Provenance Export Contract

Row-level relationship and enrichment provenance is authoritative for enriched export variants. Provenance export reads matches, match type, issue context, enrichment source, conflict counts and field-level source from row-owned relationship/enrichment provenance. Compact relationship metadata and example arrays are bounded UI summaries and are not the source of truth for row-level export provenance.

Authoritative row provenance may include:

- `inventoryRowKey`
- `relationshipStatus`
- `matchType`
- `materialMasterPackageId`
- `materialMasterPackageRevision`
- `materialMasterDatasetId`
- `materialMasterRowKey`
- `materialMasterSourceRowIndex`
- `fields`
- `confirmedFields`
- `conflictCount`
- `conflictFieldKeys`

Action exports include complete Owner Context fields: `owner_function`, `owner_reference`, `owner_source`, `owner_assignment_confidence` and `confidence`. The export reads committed row values and does not recalculate ownership.

The technical `source_row_number` export column is labelled `Source Row` in English and `Quellzeile` in German. It must not be labelled as Source Column.

### Excess View Model Contract

The Excess page model contains the full portfolio `cases`, a portfolio `summary`, relationship/readiness context, score components and scenario details. The rendered view derives a filtered view model from those cases:

- portfolio summary remains visible as context
- filtered summary reflects active filters
- score values remain case-owned and filter-independent
- current page rows are bounded by pagination
- exports use all currently filtered cases, not only the visible page

Pagination state belongs to the application view layer and must not mutate Excess cases, Recovery values or active Inventory rows. The active Excess case must be reconciled to the current page after page navigation, page-size changes, filtering, sorting and Dataset changes. Empty pages render no active detail.

## Data Package Types

AP 16.1 defines these package types:

- `inventory_snapshot`
- `material_master`
- `consumption_history`
- `demand_forecast`
- `purchase_orders`
- `planning_parameters`
- `movements`
- `quality`
- `finance`
- `actions_outcomes`

Only `inventory_snapshot` drives financial KPIs, Recovery and Data Quality. A valid active `material_master` package may enrich missing Inventory context after AP 16.2b, but it does not own financial, Recovery or quality-score values.

## Data Package Record Contract

Each Data Package record has:

- `packageId`
- `packageType`
- `datasetId`
- `schemaVersion`
- `revision`
- `status`
- `sourceDescriptor`
- `sourceData`
- `mapping`
- `buildData`
- `qualitySummary`
- `packageValidation`
- `freshness`
- `relationshipKeys`
- `createdAt`
- `updatedAt`

Package records returned by the Registry are immutable. Updates replace records and increment `revision`.

`qualitySummary` remains the strict Inventory Snapshot quality contract. Non-analytical packages such as Material Master use `packageValidation` instead of inventing a financial Data Quality score.

## Material Master Package Contract

AP 16.2a introduces `material_master` as the first importable non-Inventory Data Package.

Required canonical mapping:

- `material_id`

Optional relationship/granularity mapping:

- `plant`

Recommended optional fields reuse existing canonical fields where present:

- `material_description`
- `program_short`
- `profit_center`
- `div`
- `planning_type`
- `mrp_controller`
- `production_scheduler`
- `purchase_organization`
- `accountable_l1`
- `responsible_l1`
- `minimum_order_quantity`
- `safety_stock_target`
- `status_safety`
- `supply_type`
- `standard_price`
- `finance_classification`

Material IDs are handled as text. Leading zeros such as `0000123` must be preserved.

### Material Master Key Granularity

If `material_id` is mapped and `plant` is not mapped or not populated, the relationship key granularity is:

- `material_id`

If `material_id` and `plant` are both mapped and plant values are populated, the relationship key granularity is:

- `material_id + plant`

Plant is never inferred from file name or surrounding text.

### Material Master Package Validation

Material Master validation returns `packageValidation` with:

- `statusKey`
- `blockingErrorCount`
- `warningCount`
- `missingRequiredValueCount`
- `duplicateRelationshipKeyCount`
- `evaluatedAt`
- `keyGranularity`
- `rowCount`
- `validRowCount`

Blocking diagnostics include missing `material_id` mapping, missing material values, invalid physical source identity and duplicate relationship keys.

## Relationship Keys

Relationship keys are metadata only in AP 16.1. They include only canonical keys present in the approved mapping.

AP 16.1.1 narrows this contract: relationship keys may be derived only from canonical mappings that are approved, active, importable and non-protected. Ignored mappings, proposed-only fields, protected derived fields and non-importable canonical fields must not appear as relationship keys.

AP 16.1.1.1 makes the rule enforceable: a relationship key must come from a mapping entry where `status === "mapped"`, `ignored !== true`, `protected !== true`, `selectedCanonicalField` is present and the physical source column identity is valid. Missing status values, `canonicalField` fallbacks and proposed-but-unapproved fields are excluded. Package validation rejects any relationship key absent from the Package's approved Mapping.

Physical Source Identity requires Package `sourceColumnMetadata` and the exact four-part tuple `canonicalField`, `sourceIndex`, `sourceKey`, `sourceColumn`. `sourceIndex` must be a JavaScript number, an integer and at least zero. It is valid only for the current parsed source. `sourceKey` and `sourceColumn` must both match the duplicate-aware `sourceKey` at that exact metadata index. Missing, coerced, negative, fractional, stale or header-only identities are invalid. A Mapping capability exists only when its canonical field and all physical source identity parts are valid.

For the active Inventory Snapshot, current groups are:

- `material`: `material_id`
- `organization`: `plant`, `profit_center`

AP 16.2b uses the `material_id` and optional `plant` relationship keys for the Inventory-to-Material-Master relationship engine.

## Relationship Readiness

Relationship readiness compares only Package metadata, validation status and relationship keys. It remains a metadata-level state and is separate from the AP 16.2b row-level relationship result.

Allowed AP 16.2a states:

- `Ready by Material`: Inventory Snapshot and Material Master both expose `material_id`.
- `Ready by Material + Plant`: both packages expose `material_id` and `plant`.
- `Missing Material Key`: one package lacks `material_id`.
- `Granularity Mismatch`: reserved for later stricter package contracts.
- `Package Invalid`: Material Master package validation is invalid.

If Inventory is plant-specific and Material Master is material-only, readiness remains `Ready by Material`. The relationship engine may then use material-level exact matching or controlled unique-material fallback according to the match contract below.

## Inventory To Material Master Relationship Contract

AP 16.2b executes a deterministic row-level relationship between the active Inventory Snapshot package and the active valid Material Master package.

Supported identity keys:

- `material_id`
- `plant`

Unsupported identity inputs:

- material description
- material group
- profit center
- source filename
- row position
- fuzzy text similarity

Material IDs are normalized as text and must preserve leading zeros, long numeric-looking IDs and alphanumeric IDs.

### Match Priority

The relationship engine classifies each eligible Inventory row with this priority:

1. exact `material_id + plant` match
2. controlled `material_id` fallback
3. unmatched
4. ambiguous

Exact Material + Plant matches always take priority over fallback.

### Material-Only Fallback

Material-only fallback is allowed only when the Material Master package is material-level or when the Material Master contains exactly one valid record for the Inventory row's `material_id`.

Fallback is not allowed when multiple Material Master candidates exist, plant values conflict, duplicate master keys exist, the master record is invalid or `material_id` is missing. These cases are classified as ambiguous or invalid and are not enriched.

### Match Rate

`eligibleInventoryRowCount` is the number of active Inventory rows with a valid `material_id`.

`matchedInventoryRowCount` is:

`exactMatchCount + fallbackMatchCount`

`matchRate` is:

`matchedInventoryRowCount / eligibleInventoryRowCount`

If no eligible Inventory rows exist, `matchRate` is `null`. Ambiguous and invalid-key rows are not counted as matched.

### Match Record

Each successful match includes:

- Inventory row key and source-row index
- Material Master row key and source-row index
- `matchType`
- `materialId`
- `plant`
- Inventory package ID, revision and dataset ID
- Material Master package ID, revision and dataset ID

The UI must not use visual row position as the only relationship identity.

## Material Master Enrichment Contract

AP 16.2b enriches Inventory analytical rows only after a successful non-ambiguous relationship match.

Default policy:

- `fill_missing_only`

For each approved field:

- Missing Inventory value + present Material Master value: fill the Inventory context field.
- Present identical Inventory value: keep Inventory value and may record confirmation provenance.
- Present conflicting Inventory value: keep Inventory value and record a conflict.
- Missing Material Master value: no enrichment.

Source Package rows are never mutated.

### Enrichment Allowlist

Only importable, non-derived canonical fields that are appropriate Material Master attributes and are present in the approved Material Master mapping may be enriched.

Current examples include fields such as:

- `material_description`
- `material_group`
- `base_unit`
- `division`
- `mrp_controller`
- `production_scheduler`
- `procurement_type`
- `purchasing_group`
- `purchase_organization`
- `planner`
- `responsible_function`
- `accountable_l1`
- `responsible_l1`

The exact allowed set is calculated from the current canonical model and approved Material Master mapping.

### Prohibited Enrichment Fields

Material Master must never populate or overwrite:

- stock quantity, stock value or standard price
- excess, blocked, no-demand, unplanned or Recovery fields
- Recovery Waterfall fields
- current demand, consumption history, forecast or Purchase Order values
- issue, Action, priority, confidence, decision or workflow fields
- package, dataset or source-row identity fields

Financial and Recovery values remain owned by the Inventory analytical pipeline.

### Application-Owned Action Fields

ObsoliQ remains the owner of rule-derived action and workflow fields. Material Master context may support these decisions, but it must not populate or overwrite:

- `owner_function`
- `root_cause`
- `recommended_action`
- `next_step`
- `decision_type`
- `priority`
- `confidence`
- `status`

Material Master may provide current operational context such as `mrp_controller`, `production_scheduler`, `planner`, `purchasing_group`, `purchase_organization`, `responsible_function`, `accountable_l1` and `responsible_l1`. The application action layer decides how that context is converted into owner reference, owner source, owner assignment confidence and visible recommended action fields.

### Conflict Contract

Conflicting allowed fields preserve the Inventory value and produce an enrichment conflict diagnostic with:

- Inventory row key
- Material Master row key
- material ID and plant
- field key
- Inventory value
- Material Master value
- resolution `inventory_value_preserved`
- package identities

Conflicts do not create remediation corrections, issue-lifecycle changes or automatic Data Quality issues in this block.

### Provenance Contract

Every enriched field records field-level provenance with:

- source package type
- Material Master package ID and revision
- Material Master dataset ID
- Material Master row key and source-row index
- relationship match type
- enrichment policy
- original Inventory value
- enriched value

Detailed provenance is owned by runtime enrichment diagnostics; compact relationship and enrichment metadata is also stored with Dataset Meta and the active Inventory Package build metadata.

### Relationship And Enrichment Metadata Summary

Inventory Package `buildData` may contain nullable compact AP 16.2b relationship and enrichment summaries:

- `relationshipMetadata`: row-level relationship summary with status, key granularity, eligible row count, matched row count, exact match count, fallback match count, unmatched count, ambiguous count, invalid-key count and match rate.
- `enrichmentMetadata`: enrichment summary with policy, attempted row count, enriched row count, enriched field count, confirmed field count, conflict count, skipped/protected field counts and active enriched field keys.

These summaries are Package metadata. They do not replace detailed runtime diagnostics or field-level provenance records, and they do not own Inventory financial, Recovery, Action or Data Quality values.

### Inventory Data Quality Ownership After Enrichment

Inventory source-quality detection is owned by the active Inventory Snapshot and its Dataset Builder output.

Duplicate-candidate detection must consume explicit Inventory-owned rows. It must not read the globally enriched analytical row array and must not use Material-Master-filled values as source-quality evidence. Allowed comparison values are Inventory-owned source/canonical values such as stock value, Recovery source inputs, Inventory-provided material description, Inventory-provided program, Inventory-provided purchase organization and Inventory-provided MRP controller.

Material Master enrichment may add missing context for Explorer, Actions and Data Foundation, but it must not create, remove or reclassify Inventory duplicate-candidate issues by filling missing context fields. Inventory-first and Material-Master-first import order must converge to the same issue keys, issue types, source-row indexes, Data Quality Score, readiness states and Issue Ledger current statuses for the same Inventory source.

## Excess Intelligence Contract

AP 16.3a adds decision-support fields for the dedicated Excess Stock page. These fields are generated from existing enriched analytical inventory rows and do not become upload-required source fields.

Generated Excess case fields:

- `case_id`
- `inventory_row_key`
- `gross_excess_value`
- `net_addressable_excess_value`
- `excess_overlap_value`
- `excess_remaining_inventory_value`
- `excess_opportunity_score`
- `opportunity_score_components`
- `opportunity_score_drivers`
- `opportunity_score_model_version`
- `relationship_status`
- `relationship_match_type`
- `material_master_package_id`
- `material_master_package_revision`
- `material_master_source_row`
- `evidence_summary`
- `limitations`
- `scenarios`

Gross excess is sourced from the existing row-level excess signal. Net addressable excess uses the existing deduplicated `net_excess_value` when available and is capped to gross excess. `excess_overlap_value` explains the difference between gross and net values and must not be added back to Recovery Potential.

Generated owner-context fields:

- `owner_reference`
- `owner_reference_field`
- `owner_source`
- `owner_assignment_confidence`

`owner_function` remains rule-derived by the application action logic. Material Master enrichment must not populate or overwrite `owner_function`, `priority`, `confidence`, `status`, `root_cause`, `recommended_action`, `next_step` or `decision_type`.

`owner_source` is restricted to `inventory`, `material_master` or `none`. It identifies where the operational owner reference came from; it is not a verified user account or persistent assignment.

Relationship quality is a read-only decision-support summary:

- `complete`
- `limited`
- `critical`
- `unavailable`

It is derived from match rate, relationship conflicts, ambiguous rows and invalid keys. Threshold version `mvp-1` uses Complete at match rate >= 95%, zero ambiguous rows, zero invalid keys and conflict row rate <= 2%; Limited at match rate >= 80%, ambiguous rate <= 5%, invalid-key rate <= 5% and conflict row rate <= 10%; Critical below those limits or when no eligible Inventory rows exist. It does not block analysis, mutate packages or change enrichment behavior.

Inventory export variants:

- Original source data: original source columns only.
- Enriched analytical dataset: original source columns plus selected canonical enrichment, Recovery/action and owner-context fields.
- Enriched with provenance: enriched analytical dataset plus package ID, package revision, dataset ID, Material Master source row, match type, enriched fields, confirmed fields and enrichment conflict count.

All variants remain local browser downloads. Exporting does not mutate dataset state, source rows, Package records or the Data Quality ledger.

### Remediation Preview Enrichment Contract

Remediation Preview may run a temporary build and temporary Material Master relationship/enrichment calculation to produce local preview values.

Preview must restore:

- current relationship result
- current enrichment diagnostics
- current field-level enrichment provenance
- `currentDatasetMeta.materialMasterRelationship`
- normalized rows
- enriched rows
- Recovery diagnostics
- excluded source rows
- Data Quality issue state
- remediation decisions, actions and history
- Issue Ledger state through the composed remediation snapshot

Preview must not:

- write a Data Package Registry record
- increment an Inventory or Material Master Package revision
- change the active Package ID
- mutate Package updated timestamps
- trigger retention
- leave Data Foundation relationship state changed after the preview scope ends

### Provisional Inventory Package Count Contract

When the application builds a provisional Inventory Package for enrichment, row counts belong to the same prepared build:

- `normalizedRowCount` is derived from the explicit normalized rows passed into that build.
- `analyticalRowCount` is derived from the explicit analytical rows passed into that build.

Counts must not fall back to a previous dataset's global `enrichedRows.length` when a new dataset is being prepared.

## Freshness Metadata

Freshness metadata contains:

- `importedAt`
- `asOfDate`
- `periodStart`
- `periodEnd`
- `temporalCoverage`

Timestamp meanings:

- `importedAt`: original source import time for the Package. It remains stable across same-Package remapping and remediation rebuilds.
- `updatedAt`: Package record update time for the latest committed logical operation.
- `builtAt`: analytical dataset build time stored in `buildData`.
- `qualityEvaluatedAt`: Package Quality Summary evaluation time stored in `qualitySummary`.

Other temporal fields remain `null` or `unknown` unless provided by a later source package.

## Package Quality Summary

The Registry stores a compact quality summary only:

- Data Quality Score
- raw score
- status key
- Analysis Readiness
- Pilot Readiness
- Workflow Readiness
- open issue count
- resolved issue count
- accepted exception count

It does not store the complete issue list.

The summary is written after the final Issue Ledger and lifecycle state for the logical operation. Package creation does not independently rerun Data Quality.

AP 16.1.1.1 requires Package finalization callers to pass this final Summary explicitly. Required fields are:

- `score`
- `rawScore`
- `statusKey`
- `analysisReadiness`
- `pilotReadiness`
- `workflowReadiness`
- `openIssues`
- `resolvedIssues`
- `acceptedExceptions`
- `qualityEvaluatedAt`

`score` and `rawScore` are strict finite numbers in the existing 0-100 score range. `statusKey` is required and must be one of the current Data Quality status keys: `qualityExcellent`, `qualityGood`, `qualityLimited` or `qualityCritical`. Readiness fields are required status keys from their respective analysis, pilot and workflow readiness sets.

Issue counts are strict non-negative integers. Strings, `null`, fractions, `NaN` and infinity are rejected. `qualityEvaluatedAt` is a non-empty parseable date string and is preserved as supplied. Missing summaries, missing timestamps, non-finite scores, coerced numeric strings and invalid issue counts are rejected before Registry writes.

## Retention And Immutability

Registry retention is explicit and bounded per package type. The current Inventory Snapshot session retention limit is configured in the app layer. Retention removes the oldest inactive packages beyond the limit and must never remove the active package. Failed transactions restore the prior Registry snapshot and do not prune packages.

Package records and Registry snapshots are immutable API outputs. Updates replace records and increment `revision` once for the completed logical operation. Source rows are owned by the Package record as a local browser snapshot; the visible UI still uses the active Inventory Snapshot runtime arrays until a later package-switching architecture is implemented.

Package ownership is immutable during the session. An existing `packageId` cannot be updated with a different `datasetId` or `packageType`; the app boundary and the Registry module both reject that update without changing revision, active package, sequence or retention state.

Mapping issue snapshots have explicit semantics. `currentIssues = []` is an authoritative evaluated snapshot with no remaining issues. `currentIssues = null` or omitted means no current snapshot was supplied and must not create resolved issue attribution by itself.

Final Package summaries follow the same rule: `issuesEvaluated === true` with `issues = []` is authoritative and must not trigger another implicit `detectDataQualityIssues()` call or Ledger synchronization. Missing evaluation may use the designated Data Quality evaluation path. Test instrumentation counters are not part of the Package contract and are inactive outside the dedicated test harness.

## AP 16.3b Pilot Review And Excess Evidence Contract

AP 16.3b adds a session-only business review layer for Excess decision cases. It captures pilot feedback about whether a case, score, recommendation and scenario are useful for decision-making. It does not change analytical rows, Opportunity Scores, Recovery values, Action status, Package identity or Package revisions.

### ExcessPilotCaseFingerprint

`ExcessPilotCaseFingerprint` is the deterministic identity of the exact Excess case state reviewed by a pilot user.

Fields:

- `fingerprint`
- `fingerprintVersion`
- `payload`

Current `fingerprintVersion` is `excess-pilot-case-v1`.

The payload contains `datasetId`, `caseId`, `inventoryRowKey`, active Inventory `packageId`, active Inventory `packageRevision`, Opportunity Score model version, Opportunity Score, score components, gross excess, net addressable excess, overlap/capped amount, recommendation, next step, priority, confidence, owner function/reference/source/assignment confidence, relationship status, match type, enrichment conflict count, relevant limitation codes, evidence signature and scenario signature.

The fingerprint intentionally excludes visual row position, pagination, filters, display currency, language, theme and mutable DOM IDs.

### PilotReviewRecord

A Pilot Review record is keyed by `datasetId + caseId + caseFingerprint`; it is never keyed by visible row position or pagination index. A changed fingerprint creates a new historical session record instead of silently overwriting the prior review.

Fields:

- `reviewId`
- `datasetId`
- `packageId`
- `packageRevision`
- `caseId`
- `inventoryRowKey`
- `caseFingerprint`
- `fingerprintVersion`
- `caseFingerprintPayload`
- `reviewLifecycleStatus`
- `reviewLifecycleReasonCodes`
- `opportunityScore`
- `opportunityScoreModelVersion`
- `reviewDisposition`
- `scoreAssessment`
- `recommendationAssessment`
- `scenarioAssessment`
- `missingEvidenceCodes`
- `requiredDataPackages`
- `requiredSapFields`
- `notes`
- `createdAt`
- `updatedAt`

Allowed `reviewDisposition` values are `validated`, `needs_adjustment`, `not_actionable` and `not_reviewed`.

Allowed `scoreAssessment` values are `too_high`, `appropriate`, `too_low` and `not_assessed`.

Allowed `recommendationAssessment` values are `useful`, `partially_useful`, `not_useful` and `not_assessed`.

Allowed `scenarioAssessment` values are `useful`, `unavailable`, `not_relevant` and `not_assessed`.

Controlled missing-evidence codes include `consumption_history`, `demand_forecast`, `purchase_order_details`, `movement_history`, `safety_stock`, `moq`, `owner_reference`, `material_master_exact_match` and `quality_details`.

Controlled required Data Package values include `consumption_history`, `demand_forecast`, `purchase_orders`, `movement_history`, `planning_parameters` and `quality`.

Controlled required SAP-field values include `material_id`, `plant`, `mrp_controller`, `planner`, `safety_stock`, `minimum_order_quantity`, `open_purchase_order_number`, `purchase_order_item`, `last_consumption_date`, `consumption_quantity_12m`, `forecast_quantity` and `quality_block_reason`.

Pilot Review export is spreadsheet-safe and applies formula-injection protection to text values.

Allowed `reviewLifecycleStatus` values are `current`, `stale` and `orphaned`.

Current means the case exists in the current full Excess model, case ID and Inventory row identity still match, case fingerprint matches, package revision matches and Opportunity Score model version matches.

Stale means the case still exists but material review identity changed. Supported stale reason codes are `package_revision_changed`, `score_model_changed`, `score_changed`, `recommendation_changed`, `owner_context_changed`, `evidence_changed`, `scenario_changed`, `relationship_changed` and `case_metrics_changed`.

Orphaned means no current case exists for the saved dataset/case identity. The reason code is `case_no_longer_present`. Orphaned reviews remain historical session evidence only and must not count as current validation.

The active Data Package Registry record owns `packageRevision`. Pilot Review stores and compares this revision but never creates, updates or increments Package records.

### PilotReviewSummary

The Pilot Review summary aggregates current reviews for the active dataset and current full Excess model by default:

- reviewed case count
- current review count
- stale review count
- orphaned review count
- review disposition counts
- score assessment counts
- recommendation assessment counts
- scenario assessment counts
- most frequent missing evidence
- most frequent required Data Packages
- most frequent required SAP fields

The summary is review evidence, not execution evidence. It must not imply realized value, workflow completion or predictive confidence. Stale and orphaned reviews are excluded from the default current Summary and default current Export. An explicit all-state export includes current, stale and orphaned reviews with lifecycle status and reason codes for historical traceability.

### Excess Evidence And Scenario Contract

Excess case drilldown distinguishes:

- source facts
- Material Master facts
- calculated values
- user assumptions
- unavailable evidence
- relationship and enrichment limitations

Scenario availability is explicit: `available`, `limited` or `unavailable`. A scenario may show calculated outputs only when its required observed evidence exists. Demand scenarios require Consumption History or Demand Forecast evidence. Purchase Order scenarios require line-level Purchase Order evidence. Scenario labels remain assumption-based and non-predictive.

Opportunity Score remains a transparent prioritization score, not a probability of recovery, implementation, success or forecast outcome. Pilot calibration tests evaluate score behavior against business constraints without changing score records.

## EX-UX-01.3 – Excess Decision Workspace Presentation Contract

### ExcessDecisionWorkspaceProjection

`js/excess/excess-decision-workspace-model.js` owns the read-only, deterministic and presentation-only Excess Decision Workspace projection. The current contract is Workspace Projection version `3`. It consumes one existing accepted Excess Case plus current presentation context and returns the selected Case contract used by `app.js`. Version 3 reflects the Availability-object output for Opportunity Score, Gross, overlap and Net plus the explicit `overlapValue` projection. It is not persistent, is not an analytical dataset, does not mutate its input, does not create a second Recommendation Engine and does not change Recovery, Gross-to-Net, Opportunity Score, Scenario, Action, Pilot Review or Historical formulas.

Source-of-truth inputs are existing Case identity and Action-decoration fields, existing Excess values and explanation, existing Owner Context, existing Evidence Records and structured Scenarios, the current completed Historical Runtime result for the exact Inventory row key and relationship issue keys. Purchase Order evidence can come only from concrete fields already present on the current Case's `source_row`; the current MVP has no standalone Purchase Orders import capability.

The projection output contains `projectionVersion`, Case identity and navigation targets, Category, Action status, Priority, Opportunity Score, Net and Gross values, Owner summary, `whyPrioritized`, `whyNotHigher`, next step, decision type, `causeHypothesis`, `decisionReadiness`, `actionOptions`, `decisionLimits`, `historicalEvidence`, `valueNarrative`, `workContext` and `technicalRelationshipState`. Optional arrays normalize to empty arrays. Optional text normalizes to an empty string. Missing or invalid projected numeric evidence uses explicit availability objects and is never coerced to zero.

### ExcessCauseHypothesis

The actual Cause projection is:

```javascript
{
  cause,
  hypothesis,
  available,
  supportingSignals,
  classification: "rule_based_hypothesis",
  classificationKey,
  provenance: {
    sourceField,
    source,
    supportingSignalSources
  }
}
```

`cause` and the backward-compatible `hypothesis` contain the existing `root_cause` unchanged. Supporting signals can originate only from existing `whyPrioritized`, supported Evidence Records or exact Historical Evidence. The Cause is a rule-based hypothesis requiring business confirmation. It is neither a probability nor confirmed causality. When `root_cause` is absent, `available` is `false`, Cause text is empty and the UI renders a neutral state.

### ExcessDecisionReadiness

Decision Readiness is versioned as `excess-decision-readiness-v2` because missing, invalid, currency-inconsistent or unreconciled Gross-to-Net evidence now prevents a positive Readiness status:

```javascript
{
  version: "excess-decision-readiness-v2",
  status: "ready" | "limited" | "review" | "not_decidable",
  existingEvidence,
  missingEvidence,
  decisionLimits,
  whyNotHigher,
  nextCheck,
  truthTable
}
```

The deterministic, non-weighted Truth Table is evaluated in this order:

| Status | Implemented condition |
| --- | --- |
| `not_decidable` | Valid Case identity, valid Gross-to-Net value basis or authoritative Recommendation is missing. |
| `review` | The central basis exists, but Cause, complete Owner assignment, exact Material/Plant relationship or primary-option checkability is missing. |
| `limited` | The primary path is checkable, but Historical state is not fully available, `whyNotHigher`, Case limitations or another non-critical evidence gap remains. |
| `ready` | Identity, value basis, Cause, Recommendation, next step, Owner, exact relationship, available History and primary checkability are present with no open limit. |

Decision Readiness is not a score, success probability, approval or workflow state.

### ExcessActionOption

Each Action Option has the actual contract:

```javascript
{
  optionCode,
  labelKey,
  labelText,
  status: "checkable" | "review_required" | "not_checkable" | "not_recommended",
  isPrimary,
  evidence,
  missingEvidence,
  nextCheck,
  provenance
}
```

The authoritative `recommended_action` remains one whole primary option and is not split heuristically. Additional options require an existing structured Scenario or another explicit structured result. `checkable` means that an evidence-backed review path exists; it does not mean approved, optimal or executable. Missing evidence is an unavailable state and is not negative evidence.

Purchase Order Action Option evidence states are `concrete`, `insufficient` and `no_case_evidence`. Concrete or insufficient evidence identifies `inventory_row_fields` as its actual source. The `purchase_orders` Package definition remains `contract_only`, has no `importSupported: true`, no Builder and no upload selector. A Registry fixture or test injection is not a productive import path and cannot make the option checkable. The UI exposes no Purchase Orders import CTA.

### ExcessHistoricalEvidencePresentation

Historical presentation contains `status`, differentiated `state`, `exact`, the immutable Runtime `metric`, `limitations`, canonical `monthlyBuckets`, `unitContext` and `runtimeReason`. States are `package_missing`, `loaded_no_exact_relationship`, `not_calculated`, `limited`, `insufficient`, `available` and `runtime_error`. Only `package_missing` permits the existing Consumption History import CTA.

Historical evidence is read only from the current completed Historical Runtime for the exact current `inventory_row_key`. Quantities such as 3M, 12M and average monthly consumption come from that Runtime. Monthly charts use only existing canonical Runtime buckets; no values are reconstructed, interpolated or forecast.

The Unit Context contract is:

```javascript
{
  state: "available" | "missing" | "conflict",
  unit,
  source,
  provenance: {
    unitStatus,
    historyUnit,
    inventoryUnit,
    monthlyBucketUnits
  }
}
```

Canonical sources are `metric.unit`, `metric.provenance.historyUnit` or one unambiguous canonical `monthly_buckets[].unit`. Units are not guessed, converted or replaced by currency. Contradictory units produce `conflict` and no chart projection. Missing units remain visible as unavailable Unit Context. A calculated quantity `0` remains available and is shown with its canonical unit. Inventory coverage remains a time metric and does not receive a quantity unit.

### ExcessValueNarrative

`ExcessValueNarrative` contains explicit availability objects for Inventory Value, Gross Excess, overlap/deductions, Net Addressable and remaining Inventory, plus `validBasis`, `valueStatus: "identified_potential"`, boundary keys and the existing explanation reason key. A finite numeric `0` is available; missing, empty, non-finite or invalid values are unavailable and remain distinct.

CH-EX-01A versions this projection as `gross-net-reconciliation-v1`. Every monetary field uses the canonical shape:

```javascript
{
  available: boolean,
  value: number | null,
  reason: "" | "missing" | "invalid",
  currencyUnit: string
}
```

The Gross-to-Net basis is valid only when Gross Excess, overlap/deductions and Net Addressable are all available, finite, non-negative and expressed in the same normalized currency unit, and when this equation holds:

```text
grossExcessValue - overlapValue = netAddressableValue
```

The central reconciliation tolerance is `GROSS_NET_RECONCILIATION_EPSILON = 0.01`. A difference whose absolute value is at most `0.01` is valid. The rule is evaluated only in `validateGrossNetValueBasis()`; renderers consume `validBasis` and `reconciliation` and never repeat the equation. When no explicit source currency is present, the three analytical values share `NORMALIZED_BASE_CURRENCY`; this is an analytical unit marker, not an FX conversion.

The reconciliation result contains `valid`, `status`, `reasonCode`, `limitationCodes`, `epsilon`, `difference`, `currencyUnit`, `currencyUnits`, `missingFields` and `invalidFields`. Stable failure codes are:

- `gross_net_value_basis_missing`
- `gross_net_value_basis_invalid`
- `gross_net_value_basis_inconsistent`

Any failure forces Decision Readiness to `not_decidable` and exposes the same reason as missing evidence and a decision limit. A real numeric `0` remains available and can satisfy the equation. `null`, `undefined`, an empty value, `NaN`, Infinity or `available: false` never become zero.

The fixed Case Header consumes the same `valueNarrative.fields` objects for Gross, overlap and Net. Opportunity Score uses its own Availability projection with `available`, `value` and `reason`, plus the canonical cap metadata below. Missing values render as unavailable; genuine zeros render as zero.

Net Addressable is not Expected Recovery Value, an approved value, realized Cash, Working-Capital Recognition or P&L impact.

The three binding versions are independent and emitted together:

```javascript
{
  workspaceProjection: "3",
  decisionReadiness: "excess-decision-readiness-v2",
  grossNetReconciliation: "gross-net-reconciliation-v1"
}
```

`projectDecisionCore()` exposes the tuple as `contractVersions`; `ExcessValueNarrative` and its central Reconciliation result expose `gross-net-reconciliation-v1`; the Application Service forwards the identical tuple as `metadata.decisionContracts`. These are metadata only and do not create another numerical truth.

### Opportunity Score Cap Metadata

The existing component maxima remain `35 + 20 + 20 + 15 + 12 = 102`; weights and component formulas are unchanged. The Score Engine now emits:

```javascript
{
  uncappedScore,
  finalScore,
  scoreCap: 100,
  maxComponentTotal: 102,
  wasCapped,
  cappedPoints
}
```

`finalScore` remains the visible score and never exceeds 100. `wasCapped` is true only when `uncappedScore > scoreCap`; no cap deduction is shown at or below 100. Renderers consume these metadata and do not reconstruct the cap.

### ExcessWorkContext

The Work Context projection contains existing Action status, Owner reference, Owner function, Owner source, Owner-assignment confidence, decision type and `sessionOnly: true`. The fixed Case header presents Action status and compact Owner context. The visible Work Context block adds only decision type, Owner source, assignment confidence and the session notice; complete fields remain in the closed technical Owner/Action disclosure.

Action status comes only from the existing in-memory Action Case. Pilot Review is a separate contract and cannot derive or mutate Action status. `Implemented` is not proof of realized Recovery or Cash.

## R0A Numeric, Transaction And Identity Contract

Derived financial fields have a strict postcondition: accepted values are finite and non-negative. Negative inputs, non-finite inputs, overflow and invalid products produce `null` plus unavailable reason evidence. They must not be converted to zero or passed into Recovery. Explicit validated zero remains available and distinct from missing.

An Inventory source with valid headers but zero data rows is not a Dataset. It is rejected with `EMPTY_DATASET_ROWS` before Mapping application, Registry activation, Dataset identity allocation or application-state commit. The previous active Dataset and all dependent state remain unchanged.

Inventory Entity identity remains mandatory for every Family Case. Adapters may contain and diagnose candidates missing that identity, but may not invent a material, plant, row or entity key. Valid candidates in a mixed collection continue through portfolio composition.

## Unified Inventory Risk Contract

The canonical risk families are `excess_demand`, `slow_dead` and `blocked_quality`. Each accepted Family Case keeps its own stable `family_case_id`, `inventory_entity_key`, source row keys, evidence, limitations, provenance, capability and family-specific financial semantic. Portfolio composition may select a deterministic Primary Family and list Secondary Families, but it does not erase or rewrite Family Case identity.

The financial fields are not interchangeable:

| Family | Financial semantic | Field |
| --- | --- | --- |
| Excess & Demand | Net Addressable Recovery | `net_addressable_value` |
| Slow / Dead | Inventory Exposure | `inventory_exposure` |
| Blocked / Quality | Blocked / Quality Value | `blocked_quality_value` |

No Unified total may add these heterogeneous semantics. Missing evidence in one semantic makes that semantic aggregate unavailable or incomplete; it does not become zero and does not contaminate another family amount.

## TRUST-01 Transaction, Signature And Missing-Zero Contract

The Mapping signature covers the reviewed applied Mapping, including duplicate-aware `sourceKey`. The Normalization Policy signature covers the deterministic effective policy produced by `mergeNormalizationPolicies(proposedNormalizationPolicies, normalizationPolicyOverrides)` plus current review confirmation. Inventory Dataset Builder, Dataset Meta and Package metadata must reproduce both signatures exactly. Material Master and Consumption History Package Mapping must reproduce the Builder Mapping signature; Consumption History additionally requires exact Interpretation/Builder Semantic Policy signature equality before Registry commit.

Remapping a canonical field to a different physical source invalidates `confirmed`, `userConfirmed`, `reviewConfirmed`, `confirmationMode`, `confirmedAt` and `reviewConfirmedAt`; the reason is `source_identity_changed`. Previous overrides cannot transfer to the new source. Apply remains blocked until current-source trust is accepted.

Every failed Dataset or Package transaction restores Raw Source, metadata, normalized and analytical rows, Dataset Meta, Mapping and Policy, financial results, Actions, Data Quality, filters, reviews, Historical/Slow-Dead Runtime and Registry ownership/sequence/retention. Historical Runtime may advance only its monotone generation epoch during restore so stale asynchronous completion cannot become current. No failure may consume a Dataset ID, Package ID or revision.

Slow / Dead presentation follows runtime truth:

| Runtime state | Count / exposure presentation |
| --- | --- |
| `not_calculated`, `calculating`, `unavailable`, `error` | `n. v.` / `n/a`; never numeric zero |
| `available` or `limited`, zero cases | genuine `0` |
| `available` or `limited`, cases present | exact current value |

Unavailable Slow / Dead financial exposure remains `null` and exports empty. A genuine completed zero remains numeric `0` and exports as zero.

Portfolio Evidence is conservative across Primary and Secondary Family Cases. Unknown and empty evidence fail closed to unavailable. Evidence Readiness is:

```text
readiness-capable currently filtered Portfolio Cases
----------------------------------------------------
all currently filtered Portfolio Cases
```

The contract exposes ready count, total count and ratio. If the denominator is empty, the ratio is `null`/unavailable.

Blocked / Quality currently accepts only defensible blocked or quality-inspection signals and exposes a limited capability. It is not a complete Recovery Engine because release, rework, supplier-return, approval and success-probability data is missing. It therefore cannot assert recoverable quantity, recoverable value, approval or expected outcome.

## Current Supported And Unsupported Capabilities

Supported:

- local inventory snapshot registration
- active Inventory to active Material Master matching
- Material Master context enrichment for approved missing Inventory fields
- active Inventory to semantically accepted Consumption History relationship
- derived Historical Metrics for exact or safely resolved Inventory-to-History entities
- Unified Inventory Risk Portfolio and Family Case presentation with exact family identity
- limited Blocked / Quality exposure and Evidence presentation
- Inventory-owned duplicate-candidate detection that is deterministic across Material Master import order
- Remediation Preview isolation for relationship state, enrichment diagnostics, provenance and Registry revisions
- multiple package records per browser session
- one active package per package type
- same-dataset package updates for mapping and remediation rebuilds
- registry snapshot and restore with dataset transaction rollback
- one Package revision per completed logical Mapping or Remediation operation
- stable original import timestamp during same-Package rebuilds

Not supported:

- arbitrary cross-package joins beyond the explicit Inventory-to-Material-Master and Inventory-to-Consumption-History pipelines
- standalone Purchase Orders import or Purchase Order optimization
- Demand Forecast integration
- Quality Package integration
- full Blocked / Quality Recovery, release, rework, supplier-return or approval workflow
- Finance Recognition relationships
- Action Outcome learning
- multi-dataset UI
- Snapshot History
- Delta Detection
- Data Coverage Score
- persistent registry storage
- SAP integration
- database-backed workflows
