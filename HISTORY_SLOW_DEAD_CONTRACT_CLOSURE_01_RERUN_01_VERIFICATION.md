# HISTORY-SLOW-DEAD-CONTRACT-CLOSURE-01-RERUN-01 Verification

## Scope And Result Boundary

This report documents the package-safe History/Slow-Dead contract closure
implemented after TEST-ARTIFACT-CONTAINMENT-01. It is evidence, not a browser
Runtime dependency, and it does not authorize Product Release.

Final commit, tree, bundle and machine-specific root hashes are recorded in the
external phase gate record. They are intentionally excluded here to avoid a
self-referential manifest or Product Bundle identity.

## Root Causes

The canonical Inventory model did not expose the `base_unit` consumed by the
existing History relationship and quantitative metric boundary. Competing
physical unit columns could also receive first-column automatic selection.

Consumption History Aggregation already retained observed coverage start and
end, but did not produce the inclusive `history_coverage_months` consumed by
Slow/Dead evidence checks. The Inventory Explorer adapter simultaneously read
`inventory_coverage_months` under the History Coverage column.

## Implemented Closure

`base_unit` is the single optional, importable text quantity-unit field in the
canonical context group. Its automatic aliases are deliberately narrow.
Competing physical sources remain separate mapping candidates and require
explicit review. Inventory remains authoritative; Material Master may only
fill a missing value through the existing relationship and
`fill_missing_only` boundary. Conservative comparison removes whitespace and
case differences but performs no conversion or synonym mapping. Consumption
History never writes units into Inventory.

Consumption History Aggregation v2 now derives the inclusive observed span:

```text
history_coverage_months = endMonthIndex - startMonthIndex + 1
```

Only rows already accepted by the existing temporal evidence contract
contribute. `analysisAsOf` remains an upper bound and window anchor, never an
invented observed end. No valid temporal evidence yields `null`, not zero.
There is no twelve-month cap.

Historical Inventory Metrics v2 forwards the producer value and
`historyCoverageMonths` provenance into entity and row views. Existing version
signatures invalidate v1 results. The Explorer adapter reads
`history_coverage_months` and uses the History Coverage label. Rendering does
not trigger a Runtime build.

## Contract Separation

The following measures remain independent:

- `history_coverage_months`: inclusive observed calendar-month span;
- `history_completeness`: observed rolling-window month fraction;
- `inventory_coverage_months`: stock divided by average monthly consumption.

Missing evidence remains missing. Numeric zero remains valid evidence. Future,
invalid, missing and ambiguous temporal references do not create coverage.
Missing months do not create zero-consumption buckets.

## Verified Cases

The focused contract tests cover:

- inclusive spans of 1, 11, 12, 13 and 24 months;
- reversed input order, year boundaries and partial current periods;
- no valid time reference, invalid dates and future-only rows;
- coverage versus completeness versus stock reach;
- missing unit, equal normalized unit and true unit conflict;
- Inventory authority and Material Master fill-missing behavior;
- no History unit backfill and no first-row unit selection;
- duplicate physical unit columns and remapping confirmation invalidation;
- 11/12-month Slow/Dead evidence boundaries;
- actual zero consumption versus missing History;
- model-signature invalidation and stale completion rejection;
- package/enrichment rollback with Registry and Runtime restoration;
- Explorer/export propagation and no rendering-triggered build.

The original `tests/data-foundation-activation-01-contract-red.cjs` reproducer
is included byte-for-byte and runs GREEN twice. The pure HSD contract test runs
22 groups twice with identical output. The Product Smoke runs 46 checks twice
with deterministic evidence SHA-256:

```text
5d179515f12900bb43a5a69ad9f1c65517eac015f111f8541851a2500176beb6
```

All inline fixtures are synthetic and assert no customer, pilot, human or
expert validation.

## Preserved Behavior

This closure does not change:

- Slow/Dead policy, thresholds or classification order;
- Recovery, Opportunity Score or Data Quality calculations;
- readiness formulas or strategic-reserve precedence;
- Package schemas, Registry ownership or Revision semantics;
- `sample-data.js` or any Material Master/History demo data;
- upload, export or local `file://` behavior;
- UI layout beyond the corrected existing History Coverage field binding.

TEST-ARTIFACT-CONTAINMENT-01 remains authoritative. Product Smokes continue to
write screenshots solely below `OBSOLIQ_TEST_ARTIFACT_ROOT`; screenshot outputs
are not Product Bundle inputs.

## Package-Safe Gate Record

```text
HSDCC01_SCOPE_GATE: PASS
HSDCC01_HUNK_PROVENANCE_GATE: PASS
HSDCC01_CANONICAL_BASE_UNIT_GATE: PASS
HSDCC01_BASE_UNIT_TYPE_GATE: PASS
HSDCC01_BASE_UNIT_OPTIONALITY_GATE: PASS
HSDCC01_BASE_UNIT_ALIAS_GATE: PASS
HSDCC01_BASE_UNIT_SOURCE_IDENTITY_GATE: PASS
HSDCC01_BASE_UNIT_SOURCE_PRECEDENCE_GATE: PASS
HSDCC01_MATERIAL_MASTER_FILL_MISSING_GATE: PASS
HSDCC01_NO_HISTORY_UNIT_BACKFILL_GATE: PASS
HSDCC01_UNIT_CONFLICT_GATE: PASS
HSDCC01_NO_UNIT_CONVERSION_GATE: PASS
HSDCC01_HISTORY_COVERAGE_PRODUCER_GATE: PASS
HSDCC01_HISTORY_COVERAGE_FORMULA_GATE: PASS
HSDCC01_HISTORY_COVERAGE_EVIDENCE_SET_GATE: PASS
HSDCC01_HISTORY_COVERAGE_AS_OF_BOUNDARY_GATE: PASS
HSDCC01_NO_COVERAGE_IMPUTATION_GATE: PASS
HSDCC01_COVERAGE_COMPLETENESS_SEPARATION_GATE: PASS
HSDCC01_HISTORY_INVENTORY_COVERAGE_SEPARATION_GATE: PASS
HSDCC01_HISTORY_COVERAGE_PROPAGATION_GATE: PASS
HSDCC01_METRIC_PROVENANCE_GATE: PASS
HSDCC01_MODEL_VERSION_GATE: PASS
HSDCC01_RUNTIME_INVALIDATION_GATE: PASS
HSDCC01_SLOW_DEAD_PRODUCER_CONSUMER_GATE: PASS
HSDCC01_MINIMUM_11_MONTH_BOUNDARY_GATE: PASS
HSDCC01_MINIMUM_12_MONTH_BOUNDARY_GATE: PASS
HSDCC01_MISSING_ZERO_GATE: PASS
HSDCC01_NO_THRESHOLD_CHANGE_GATE: PASS
HSDCC01_NO_READINESS_FORMULA_CHANGE_GATE: PASS
HSDCC01_TARGETED_GREEN_GATE: PASS
HSDCC01_NO_RELEASE_ACTION_GATE: PASS

PRODUCT_RELEASE_GATE: HOLD
AUTHORIZED_RELEASE: NO
PUSH_PERFORMED: NO
TAG_CREATED: NO
MERGE_PERFORMED: NO
DEPLOYMENT_PERFORMED: NO
PUBLICATION_PERFORMED: NO
```

Fresh-commit, two-build and two-extract acceptance remains an external gate and
must pass before Commit E can be accepted as the Phase-2 parent for the full
demo activation phase.
