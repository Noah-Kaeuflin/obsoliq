# AP 16.4d.3b Calibration Metrics and OFAT Threshold Sensitivity

## Final Status

`AP 16.4d.3b PASS`

This analysis measures **Synthetic Contract Agreement**, **Synthetic Condition Agreement**, **Fixture Coverage**, **Boundary Stability**, **Condition Migration**, **Critical Safety Guard Violation** and **Deterministic Repeatability** only. It contains synthetic contractual fixtures, no customer or Pilot data and no human expert labels.

## 1. Git State

- Branch: `fix/ex-ux-01-3-excess-decision-narrative`
- Initial HEAD: `aae61092d3fc6a9ba7f1018d711fd387ab99ad5e`
- Final HEAD: `aae61092d3fc6a9ba7f1018d711fd387ab99ad5e`
- Working tree: Dirty before and after AP 16.4d.3b because accepted, uncommitted work already existed; no commit or branch change was made.

## 2. Policy and Contract Versions

- Productive Condition Policy: `slow-dead-condition-policy-v1`
- Calibration Contract: `slow-dead-calibration-case-v1`
- Calibration Runner: `slow-dead-calibration-runner-v2`
- Metrics Contract: `slow-dead-calibration-metrics-v2`
- Sensitivity Plan: `slow-dead-threshold-sensitivity-plan-v1`
- Sensitivity Runner: `slow-dead-threshold-sensitivity-runner-v2`
- Reference date: `2026-08-25`
- Scenarios: **17** (one Baseline and sixteen OFAT alternatives)

| Productive Policy field | Value | Boundary semantics |
| --- | ---: | --- |
| minimumHistoryCoverageMonths | 12 | >= 12 months |
| minimumHistoryCompleteness | 0.8 | >= 0.80 |
| strongHistoryCompleteness | 0.9 | >= 0.90 |
| slowMovingMonthsSinceLastConsumption | 6 | >= 6 months |
| nonMovingMonthsSinceLastConsumption | 12 | >= 12 months |
| deadCandidateMonthsSinceLastConsumption | 18 | >= 18 months |
| minimumActiveMonthsForRecurringDemand | 2 | >= 2 months |
| intermittentDemandThreshold | 0.75 | >= 0.75 |

All listed boundaries are inclusive. The productive Policy object is frozen and remains unchanged. Each alternative changes exactly one listed parameter.

## 3. Fingerprints

- Policy fingerprint: `slow-dead-policy:slow-dead-calibration-fingerprint-fnv1a32-v1:0c3cf3e0`
- Fixture fingerprint: `slow-dead-fixtures:slow-dead-calibration-fingerprint-fnv1a32-v1:cde15002`
- Baseline result fingerprint: `slow-dead-baseline-result:slow-dead-calibration-fingerprint-fnv1a32-v1:e416d74a`
- Sensitivity result fingerprint: `slow-dead-sensitivity-analysis:slow-dead-calibration-fingerprint-fnv1a32-v1:7338a454`
- Fingerprint scheme: `slow-dead-calibration-fingerprint-fnv1a32-v1` (deterministic content identity, not a security signature)

## 4. Fixture Distribution

- Fixtures: **30**
- Valid: **30**
- Invalid: **0**
- Source: `synthetic_acceptance_fixture`
- Human expert validated: **false**

| Synthetic Condition | Expected | Actual | Agreement | Disagreement |
| --- | ---: | ---: | ---: | ---: |
| `insufficient_evidence` | 6 | 6 | 6 | 0 |
| `intermittent_expected` | 2 | 2 | 2 | 0 |
| `slow_moving_candidate` | 5 | 5 | 5 | 0 |
| `non_moving_candidate` | 9 | 9 | 9 | 0 |
| `dead_stock_candidate` | 6 | 6 | 6 | 0 |
| `strategic_reserve` | 1 | 1 | 1 | 0 |
| `no_case` | 1 | 1 | 1 | 0 |

## 5. Baseline Synthetic Contract Agreement

- Synthetic Contract Agreement: **100%**
- Agreement: **30/30**
- Baseline critical Safety violations: **0**
- Deterministic Repeatability: **PASS**

## 6. Agreement by Synthetic Condition

| Synthetic Condition | Expected | Actual | Agreement | Disagreement |
| --- | ---: | ---: | ---: | ---: |
| `insufficient_evidence` | 6 | 6 | 6 | 0 |
| `intermittent_expected` | 2 | 2 | 2 | 0 |
| `slow_moving_candidate` | 5 | 5 | 5 | 0 |
| `non_moving_candidate` | 9 | 9 | 9 | 0 |
| `dead_stock_candidate` | 6 | 6 | 6 | 0 |
| `strategic_reserve` | 1 | 1 | 1 | 0 |
| `no_case` | 1 | 1 | 1 | 0 |

## 7. Boundary Stability

| Boundary | Position | Fixtures | Agreement | Disagreement | Case IDs |
| --- | --- | ---: | ---: | ---: | --- |
| 6 months | below | 1 | 1 | 0 | SD-CAL-SYN-0007 |
| 6 months | at | 1 | 1 | 0 | SD-CAL-SYN-0008 |
| 6 months | above | 1 | 1 | 0 | SD-CAL-SYN-0009 |
| 12 months | below | 1 | 1 | 0 | SD-CAL-SYN-0010 |
| 12 months | at | 1 | 1 | 0 | SD-CAL-SYN-0011 |
| 12 months | above | 1 | 1 | 0 | SD-CAL-SYN-0012 |
| 18 months | below | 1 | 1 | 0 | SD-CAL-SYN-0013 |
| 18 months | at | 1 | 1 | 0 | SD-CAL-SYN-0014 |
| 18 months | above | 1 | 1 | 0 | SD-CAL-SYN-0015 |

The productive 6-, 12- and 18-month boundaries are stable below, exactly at and above their inclusive thresholds. Alternative boundary changes are migrations, not automatically errors.

## 8. All 17 Scenarios

| Scenario | Parameter | Baseline | Candidate | Changed | Unchanged | Critical violations | Analysis state |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `SD-SENS-BASELINE` | `baseline` | - | - | 0 | 30 | 0 | no critical guard violation |
| `SD-SENS-HISTORY-COVERAGE-LOW` | `minimumHistoryCoverageMonths` | 12 | 9 | 1 | 29 | 1 | analytically unsafe |
| `SD-SENS-HISTORY-COVERAGE-HIGH` | `minimumHistoryCoverageMonths` | 12 | 18 | 24 | 6 | 3 | analytically unsafe |
| `SD-SENS-MIN-COMPLETENESS-LOW` | `minimumHistoryCompleteness` | 0.8 | 0.75 | 1 | 29 | 1 | analytically unsafe |
| `SD-SENS-MIN-COMPLETENESS-HIGH` | `minimumHistoryCompleteness` | 0.8 | 0.85 | 1 | 29 | 0 | no critical guard violation |
| `SD-SENS-STRONG-COMPLETENESS-LOW` | `strongHistoryCompleteness` | 0.9 | 0.85 | 1 | 29 | 0 | no critical guard violation |
| `SD-SENS-STRONG-COMPLETENESS-HIGH` | `strongHistoryCompleteness` | 0.9 | 0.95 | 1 | 29 | 0 | no critical guard violation |
| `SD-SENS-SLOW-LOW` | `slowMovingMonthsSinceLastConsumption` | 6 | 5 | 0 | 30 | 0 | no critical guard violation |
| `SD-SENS-SLOW-HIGH` | `slowMovingMonthsSinceLastConsumption` | 6 | 7 | 1 | 29 | 0 | no critical guard violation |
| `SD-SENS-NONMOVING-LOW` | `nonMovingMonthsSinceLastConsumption` | 12 | 10 | 0 | 30 | 0 | no critical guard violation |
| `SD-SENS-NONMOVING-HIGH` | `nonMovingMonthsSinceLastConsumption` | 12 | 15 | 4 | 26 | 0 | no critical guard violation |
| `SD-SENS-DEAD-LOW` | `deadCandidateMonthsSinceLastConsumption` | 18 | 15 | 1 | 29 | 0 | no critical guard violation |
| `SD-SENS-DEAD-HIGH` | `deadCandidateMonthsSinceLastConsumption` | 18 | 24 | 6 | 24 | 0 | no critical guard violation |
| `SD-SENS-ACTIVE-MONTHS-LOW` | `minimumActiveMonthsForRecurringDemand` | 2 | 1 | 0 | 30 | 0 | no critical guard violation |
| `SD-SENS-ACTIVE-MONTHS-HIGH` | `minimumActiveMonthsForRecurringDemand` | 2 | 3 | 2 | 28 | 2 | analytically unsafe |
| `SD-SENS-INTERMITTENCY-LOW` | `intermittentDemandThreshold` | 0.75 | 0.65 | 0 | 30 | 0 | no critical guard violation |
| `SD-SENS-INTERMITTENCY-HIGH` | `intermittentDemandThreshold` | 0.75 | 0.85 | 2 | 28 | 2 | analytically unsafe |

Every scenario is `analysisOnly: true`, `productionEligible: false`, `activated: false` and `recommended: false`.

## 9. Migration Matrix

| Scenario | From | To | Count | Changed Case IDs |
| --- | --- | --- | ---: | --- |
| SD-SENS-BASELINE | - | - | 0 | - |
| SD-SENS-HISTORY-COVERAGE-LOW | insufficient_evidence | no_case | 1 | SD-CAL-SYN-0020 |
| SD-SENS-HISTORY-COVERAGE-HIGH | dead_stock_candidate | insufficient_evidence | 6 | SD-CAL-SYN-0005, SD-CAL-SYN-0014, SD-CAL-SYN-0015, SD-CAL-SYN-0019, SD-CAL-SYN-0026, SD-CAL-SYN-0029 |
| SD-SENS-HISTORY-COVERAGE-HIGH | intermittent_expected | insufficient_evidence | 2 | SD-CAL-SYN-0002, SD-CAL-SYN-0017 |
| SD-SENS-HISTORY-COVERAGE-HIGH | no_case | insufficient_evidence | 1 | SD-CAL-SYN-0007 |
| SD-SENS-HISTORY-COVERAGE-HIGH | non_moving_candidate | insufficient_evidence | 9 | SD-CAL-SYN-0004, SD-CAL-SYN-0011, SD-CAL-SYN-0012, SD-CAL-SYN-0013, SD-CAL-SYN-0016, SD-CAL-SYN-0018, SD-CAL-SYN-0024, SD-CAL-SYN-0027, SD-CAL-SYN-0028 |
| SD-SENS-HISTORY-COVERAGE-HIGH | slow_moving_candidate | insufficient_evidence | 5 | SD-CAL-SYN-0003, SD-CAL-SYN-0008, SD-CAL-SYN-0009, SD-CAL-SYN-0010, SD-CAL-SYN-0030 |
| SD-SENS-HISTORY-COVERAGE-HIGH | strategic_reserve | insufficient_evidence | 1 | SD-CAL-SYN-0006 |
| SD-SENS-MIN-COMPLETENESS-LOW | insufficient_evidence | no_case | 1 | SD-CAL-SYN-0021 |
| SD-SENS-MIN-COMPLETENESS-HIGH | non_moving_candidate | insufficient_evidence | 1 | SD-CAL-SYN-0027 |
| SD-SENS-STRONG-COMPLETENESS-LOW | non_moving_candidate | dead_stock_candidate | 1 | SD-CAL-SYN-0028 |
| SD-SENS-STRONG-COMPLETENESS-HIGH | dead_stock_candidate | non_moving_candidate | 1 | SD-CAL-SYN-0029 |
| SD-SENS-SLOW-LOW | - | - | 0 | - |
| SD-SENS-SLOW-HIGH | slow_moving_candidate | no_case | 1 | SD-CAL-SYN-0008 |
| SD-SENS-NONMOVING-LOW | - | - | 0 | - |
| SD-SENS-NONMOVING-HIGH | non_moving_candidate | slow_moving_candidate | 4 | SD-CAL-SYN-0004, SD-CAL-SYN-0011, SD-CAL-SYN-0012, SD-CAL-SYN-0027 |
| SD-SENS-DEAD-LOW | non_moving_candidate | dead_stock_candidate | 1 | SD-CAL-SYN-0013 |
| SD-SENS-DEAD-HIGH | dead_stock_candidate | non_moving_candidate | 6 | SD-CAL-SYN-0005, SD-CAL-SYN-0014, SD-CAL-SYN-0015, SD-CAL-SYN-0019, SD-CAL-SYN-0026, SD-CAL-SYN-0029 |
| SD-SENS-ACTIVE-MONTHS-LOW | - | - | 0 | - |
| SD-SENS-ACTIVE-MONTHS-HIGH | intermittent_expected | slow_moving_candidate | 2 | SD-CAL-SYN-0002, SD-CAL-SYN-0017 |
| SD-SENS-INTERMITTENCY-LOW | - | - | 0 | - |
| SD-SENS-INTERMITTENCY-HIGH | intermittent_expected | slow_moving_candidate | 2 | SD-CAL-SYN-0002, SD-CAL-SYN-0017 |

Migration counts are generated from the same unique Case-ID lists shown in this table. Each alternative is compared only with the productive Baseline.

## 10. Changed Case IDs by Scenario

- `SD-SENS-BASELINE`: None.
- `SD-SENS-HISTORY-COVERAGE-LOW`: `SD-CAL-SYN-0020`.
- `SD-SENS-HISTORY-COVERAGE-HIGH`: `SD-CAL-SYN-0002`, `SD-CAL-SYN-0003`, `SD-CAL-SYN-0004`, `SD-CAL-SYN-0005`, `SD-CAL-SYN-0006`, `SD-CAL-SYN-0007`, `SD-CAL-SYN-0008`, `SD-CAL-SYN-0009`, `SD-CAL-SYN-0010`, `SD-CAL-SYN-0011`, `SD-CAL-SYN-0012`, `SD-CAL-SYN-0013`, `SD-CAL-SYN-0014`, `SD-CAL-SYN-0015`, `SD-CAL-SYN-0016`, `SD-CAL-SYN-0017`, `SD-CAL-SYN-0018`, `SD-CAL-SYN-0019`, `SD-CAL-SYN-0024`, `SD-CAL-SYN-0026`, `SD-CAL-SYN-0027`, `SD-CAL-SYN-0028`, `SD-CAL-SYN-0029`, `SD-CAL-SYN-0030`.
- `SD-SENS-MIN-COMPLETENESS-LOW`: `SD-CAL-SYN-0021`.
- `SD-SENS-MIN-COMPLETENESS-HIGH`: `SD-CAL-SYN-0027`.
- `SD-SENS-STRONG-COMPLETENESS-LOW`: `SD-CAL-SYN-0028`.
- `SD-SENS-STRONG-COMPLETENESS-HIGH`: `SD-CAL-SYN-0029`.
- `SD-SENS-SLOW-LOW`: None.
- `SD-SENS-SLOW-HIGH`: `SD-CAL-SYN-0008`.
- `SD-SENS-NONMOVING-LOW`: None.
- `SD-SENS-NONMOVING-HIGH`: `SD-CAL-SYN-0004`, `SD-CAL-SYN-0011`, `SD-CAL-SYN-0012`, `SD-CAL-SYN-0027`.
- `SD-SENS-DEAD-LOW`: `SD-CAL-SYN-0013`.
- `SD-SENS-DEAD-HIGH`: `SD-CAL-SYN-0005`, `SD-CAL-SYN-0014`, `SD-CAL-SYN-0015`, `SD-CAL-SYN-0019`, `SD-CAL-SYN-0026`, `SD-CAL-SYN-0029`.
- `SD-SENS-ACTIVE-MONTHS-LOW`: None.
- `SD-SENS-ACTIVE-MONTHS-HIGH`: `SD-CAL-SYN-0002`, `SD-CAL-SYN-0017`.
- `SD-SENS-INTERMITTENCY-LOW`: None.
- `SD-SENS-INTERMITTENCY-HIGH`: `SD-CAL-SYN-0002`, `SD-CAL-SYN-0017`.

## 11. Critical Guard Violations

| Scenario | Critical count | Codes | Case IDs |
| --- | ---: | --- | --- |
| `SD-SENS-BASELINE` | 0 | - | - |
| `SD-SENS-HISTORY-COVERAGE-LOW` | 1 | `insufficient_history_protection_broken` | SD-CAL-SYN-0020 |
| `SD-SENS-HISTORY-COVERAGE-HIGH` | 3 | `intermittent_demand_protection_broken`, `strategic_reserve_protection_broken` | SD-CAL-SYN-0002, SD-CAL-SYN-0006, SD-CAL-SYN-0017 |
| `SD-SENS-MIN-COMPLETENESS-LOW` | 1 | `low_completeness_protection_broken` | SD-CAL-SYN-0021 |
| `SD-SENS-MIN-COMPLETENESS-HIGH` | 0 | - | - |
| `SD-SENS-STRONG-COMPLETENESS-LOW` | 0 | - | - |
| `SD-SENS-STRONG-COMPLETENESS-HIGH` | 0 | - | - |
| `SD-SENS-SLOW-LOW` | 0 | - | - |
| `SD-SENS-SLOW-HIGH` | 0 | - | - |
| `SD-SENS-NONMOVING-LOW` | 0 | - | - |
| `SD-SENS-NONMOVING-HIGH` | 0 | - | - |
| `SD-SENS-DEAD-LOW` | 0 | - | - |
| `SD-SENS-DEAD-HIGH` | 0 | - | - |
| `SD-SENS-ACTIVE-MONTHS-LOW` | 0 | - | - |
| `SD-SENS-ACTIVE-MONTHS-HIGH` | 2 | `intermittent_demand_protection_broken` | SD-CAL-SYN-0002, SD-CAL-SYN-0017 |
| `SD-SENS-INTERMITTENCY-LOW` | 0 | - | - |
| `SD-SENS-INTERMITTENCY-HIGH` | 2 | `intermittent_demand_protection_broken` | SD-CAL-SYN-0002, SD-CAL-SYN-0017 |

All ten immutable analysis Safety Guards are evaluated in every scenario. Unsafe alternatives remain measurable but cannot be activated, recommended or persisted as productive Policy.

## 12. Interpretation and Limits

- This is a deterministic OFAT contract analysis, not a search for an optimal Policy.
- A Condition migration is not automatically a defect. Only an explicit immutable Safety-Guard violation is critical.
- Counts are unweighted; no Inventory exposure or monetary weighting is applied.
- The fixture portfolio is deliberately compact and synthetic. It does not establish Pilot Accuracy, Customer Accuracy, Expert Agreement, Precision, Recall, F1, False Positive Rate or False Negative Rate.
- No Multi-Parameter scenarios, grid search, random search, auto-tuning or Policy ranking are present.

## 13. Synthetic Data Notice

All 30 records are synthetic acceptance fixtures from `AP 16.4d.3a`. The artifacts contain no customer, Pilot, personal or reviewer data and make no human-validation claim.

## 14. No Automatic Policy Recommendation

No scenario is labelled best, optimal, recommended or production-ready. This block does not create Policy v2, a Package revision, a Registry mutation or any automatic threshold adoption.

## 15. Handover to AP 16.4d.3c

Human Pilot Review must use separately governed, provenance-complete expert labels. It must not reinterpret these synthetic results as Pilot quality. AP 16.4d.3c should review rationale, disagreement and Safety evidence without changing the immutable 3b artifacts.

## Validation Evidence

| Validation | Passed | Failed |
| --- | ---: | ---: |
| 3a static preflight | 71 | 0 |
| Preflight structured suite | 299 | 0 |
| Final structured suite | 305 | 0 |
| 3b static contract | 179 | 0 |
| JavaScript/CommonJS syntax | 148 | 0 |
| Product and file:// smokes | 5 | 0 |
| Artifact byte reproduction | 3 | 0 |
| git diff --check | 1 | 0 |

- Final structured suite: 305 total, 305 passed, 0 failed, 0 skipped.
- Page errors: 0.
- Unexpected console errors: 0.
- Expected test-only diagnostics: 1.

## Exact Test Commands

`$node tests/ap-16-4d-3a-static-contract.cjs`

`$node tests/generate-slow-dead-calibration-baseline.cjs --check`

`$node tests/run-browser-suite.cjs`

`$node tests/ap-16-4d-3b-static-contract.cjs`

`$node tests/ap-16-4d-3b-product-smoke.cjs`

`$node tests/ap-16-4d-3a-product-smoke.cjs`

`$node tests/icon-01-product-smoke.cjs`

`$node tests/ch-ex-01a-product-smoke.cjs`

`$node tests/ex-ux-01-6-product-smoke.cjs`

`$node tests/generate-slow-dead-calibration-sensitivity.cjs --check`

`Get-ChildItem -Recurse -File -Include *.js,*.cjs | Where-Object FullName -notmatch '\artifacts\' | ForEach-Object { & $node --check $_.FullName }`

`git diff --check`

`git status --short`
