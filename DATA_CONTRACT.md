# ObsoliQ Data Contract

## Canonical Inventory Data Contract

The canonical inventory model describes SAP-like inventory rows after source parsing and mapping. It includes identifiers, organization fields, planning context, quantity/value fields, recovery inputs, calculated recovery fields and action fields.

The current MVP keeps original source columns visible in the Inventory Explorer while analytical calculations use canonical fields.

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

Physical Source Identity requires Package `sourceColumnMetadata`. A mapped source proves identity when its `sourceIndex` matches a metadata entry and the entry's source key, original header or normalized source key matches the Mapping entry. If no `sourceIndex` is supplied, exactly one metadata entry must match; ambiguous duplicate physical headers are rejected. A Mapping capability exists only when its canonical field and physical source-column identity are both valid.

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

## Current Supported And Unsupported Capabilities

Supported:

- local inventory snapshot registration
- active Inventory to active Material Master matching
- Material Master context enrichment for approved missing Inventory fields
- Inventory-owned duplicate-candidate detection that is deterministic across Material Master import order
- Remediation Preview isolation for relationship state, enrichment diagnostics, provenance and Registry revisions
- multiple package records per browser session
- one active package per package type
- same-dataset package updates for mapping and remediation rebuilds
- registry snapshot and restore with dataset transaction rollback
- one Package revision per completed logical Mapping or Remediation operation
- stable original import timestamp during same-Package rebuilds

Not supported:

- cross-package joins beyond Inventory to Material Master context enrichment
- multi-dataset UI
- Snapshot History
- Delta Detection
- Data Coverage Score
- persistent registry storage
- SAP integration
- database-backed workflows
