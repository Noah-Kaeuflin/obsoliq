# AP 16.4d.3a Fixture Baseline

## Final Status

`AP 16.4d.3a PASS`

This report records **Synthetic Contract Agreement** only. It is not Pilot Accuracy, Expert Agreement, Precision, Recall, F1 or a threshold recommendation. No fixture in this block claims human expert validation.

## Git State

- Branch: `fix/ex-ux-01-3-excess-decision-narrative`
- HEAD: `aae61092d3fc6a9ba7f1018d711fd387ab99ad5e`
- Evidence date: `2026-08-26`
- Working tree: Dirty before and after this block because accepted, uncommitted work already existed; AP 16.4d.3a changes remain uncommitted.

## Calibration Contract

- Calibration schema: `slow-dead-calibration-case-v1`
- Calibration runner: `slow-dead-calibration-runner-v2`
- Productive Policy: `slow-dead-condition-policy-v1`
- Fixed reference date: `2026-08-25`
- Fixture source: `synthetic_acceptance_fixture`
- Human expert validated: `false` for all fixtures
- Productive Policy changed: **No**

## Productive Policy Thresholds

| Policy field | Productive value | Boundary semantics |
| --- | ---: | --- |
| Minimum History coverage | 12 | >= 12 months |
| Minimum History completeness | 0.8 | >= 0.80 |
| Strong History completeness | 0.9 | >= 0.90 |
| Slow-Moving recency | 6 | >= 6 months |
| Slow-Moving coverage | 12 | >= 12 months |
| Minimum Slow evidence dimensions | 2 | >= 2 |
| Non-Moving recency | 12 | >= 12 months |
| Dead Candidate recency | 18 | >= 18 months |
| Recurring demand active months | 2 | >= 2 |
| Intermittency ratio | 0.75 | >= 0.75 |
| Recent intermittent consumption | 6 | <= 6 months |
| Independent Dead signal | true | required |

The comparisons are inclusive exactly where shown. These values are direct reads from the existing productive Policy object; the Calibration layer defines no duplicate thresholds and supplies no Policy override.

## Fixture Portfolio

- Fixtures: **30**
- Synthetic Contract Agreement: **30/30**
- Disagreements: **0**
- Critical protection violations: **0**

| Condition | Fixtures |
| --- | ---: |
| `insufficient_evidence` | 6 |
| `intermittent_expected` | 2 |
| `slow_moving_candidate` | 5 |
| `non_moving_candidate` | 9 |
| `dead_stock_candidate` | 6 |
| `strategic_reserve` | 1 |
| `no_case` boundary control | 1 |

Boundary coverage is present immediately below, exactly at and immediately above the productive 6-, 12- and 18-month thresholds.

## Safety Invariants

- **SD-SAFETY-01:** Strategic Reserve requires an explicit reserve signal.
- **SD-SAFETY-02:** Explicit Strategic Reserve is never classified as Dead Stock Candidate.
- **SD-SAFETY-03:** Recurring intermittent demand is not classified as Dead Stock Candidate from age or coverage alone.
- **SD-SAFETY-04:** Dead Stock Candidate requires an independent demand, planning or lifecycle signal.
- **SD-SAFETY-05:** Missing or insufficient History produces the existing non-definitive condition.
- **SD-SAFETY-06:** Low History completeness limits the classification.
- **SD-SAFETY-07:** Ambiguous relationships cannot produce a definitive Slow / Dead condition.
- **SD-SAFETY-08:** Unit conflicts cannot produce a definitive quantity-based condition.
- **SD-SAFETY-09:** Project or one-time demand is not automatically treated as normal Dead Stock.
- **SD-SAFETY-10:** The 6, 12 and 18 month boundaries are deterministic and inclusive as defined by policy.
- **SD-SAFETY-11:** A numeric zero remains distinguishable from missing evidence.
- **SD-SAFETY-12:** Repeated evaluation of the same fixture is deterministic.

## Fixture Agreement

| Case | Purpose | Expected | Actual | Agreement | Disagreement | Critical violation |
| --- | --- | --- | --- | --- | --- | --- |
| SD-CAL-SYN-0001 | Canonical insufficient evidence | `insufficient_evidence` | `insufficient_evidence` | PASS | - | NO |
| SD-CAL-SYN-0002 | Canonical recurring intermittent demand | `intermittent_expected` | `intermittent_expected` | PASS | - | NO |
| SD-CAL-SYN-0003 | Canonical Slow-Moving Candidate | `slow_moving_candidate` | `slow_moving_candidate` | PASS | - | NO |
| SD-CAL-SYN-0004 | Canonical Non-Moving Candidate | `non_moving_candidate` | `non_moving_candidate` | PASS | - | NO |
| SD-CAL-SYN-0005 | Canonical Dead Stock Candidate | `dead_stock_candidate` | `dead_stock_candidate` | PASS | - | NO |
| SD-CAL-SYN-0006 | Canonical explicit Strategic Reserve | `strategic_reserve` | `strategic_reserve` | PASS | - | NO |
| SD-CAL-SYN-0007 | Five months is below the Slow-Moving age boundary | `no_case` | `no_case` | PASS | - | NO |
| SD-CAL-SYN-0008 | Six months is the inclusive Slow-Moving age boundary | `slow_moving_candidate` | `slow_moving_candidate` | PASS | - | NO |
| SD-CAL-SYN-0009 | Seven months is above the Slow-Moving age boundary | `slow_moving_candidate` | `slow_moving_candidate` | PASS | - | NO |
| SD-CAL-SYN-0010 | Eleven months is below the Non-Moving age boundary | `slow_moving_candidate` | `slow_moving_candidate` | PASS | - | NO |
| SD-CAL-SYN-0011 | Twelve months is the inclusive Non-Moving age boundary | `non_moving_candidate` | `non_moving_candidate` | PASS | - | NO |
| SD-CAL-SYN-0012 | Thirteen months is above the Non-Moving age boundary | `non_moving_candidate` | `non_moving_candidate` | PASS | - | NO |
| SD-CAL-SYN-0013 | Seventeen months is below the Dead Candidate age boundary | `non_moving_candidate` | `non_moving_candidate` | PASS | - | NO |
| SD-CAL-SYN-0014 | Eighteen months is the inclusive Dead Candidate age boundary | `dead_stock_candidate` | `dead_stock_candidate` | PASS | - | NO |
| SD-CAL-SYN-0015 | Nineteen months is above the Dead Candidate age boundary | `dead_stock_candidate` | `dead_stock_candidate` | PASS | - | NO |
| SD-CAL-SYN-0016 | Old stock without reserve or independent Dead signal | `non_moving_candidate` | `non_moving_candidate` | PASS | - | NO |
| SD-CAL-SYN-0017 | Intermittent thresholds are inclusive | `intermittent_expected` | `intermittent_expected` | PASS | - | NO |
| SD-CAL-SYN-0018 | Dead age without independent signal remains Non-Moving | `non_moving_candidate` | `non_moving_candidate` | PASS | - | NO |
| SD-CAL-SYN-0019 | Lifecycle ending supplies the independent Dead signal | `dead_stock_candidate` | `dead_stock_candidate` | PASS | - | NO |
| SD-CAL-SYN-0020 | History coverage below twelve months is insufficient | `insufficient_evidence` | `insufficient_evidence` | PASS | - | NO |
| SD-CAL-SYN-0021 | History completeness below 0.80 is insufficient | `insufficient_evidence` | `insufficient_evidence` | PASS | - | NO |
| SD-CAL-SYN-0022 | Ambiguous Material-Plant relationship is non-definitive | `insufficient_evidence` | `insufficient_evidence` | PASS | - | NO |
| SD-CAL-SYN-0023 | Unit conflict is non-definitive | `insufficient_evidence` | `insufficient_evidence` | PASS | - | NO |
| SD-CAL-SYN-0024 | Project or one-time demand is not automatically Dead Stock | `non_moving_candidate` | `non_moving_candidate` | PASS | - | NO |
| SD-CAL-SYN-0025 | Missing twelve-month consumption remains missing evidence | `insufficient_evidence` | `insufficient_evidence` | PASS | - | NO |
| SD-CAL-SYN-0026 | Numeric zero is valid Dead evidence when the independent signal exists | `dead_stock_candidate` | `dead_stock_candidate` | PASS | - | NO |
| SD-CAL-SYN-0027 | Minimum completeness 0.80 remains usable with medium strength | `non_moving_candidate` | `non_moving_candidate` | PASS | - | NO |
| SD-CAL-SYN-0028 | Completeness below 0.90 blocks Dead but not Non-Moving | `non_moving_candidate` | `non_moving_candidate` | PASS | - | NO |
| SD-CAL-SYN-0029 | Strong completeness 0.90 is inclusive for Dead Candidate | `dead_stock_candidate` | `dead_stock_candidate` | PASS | - | NO |
| SD-CAL-SYN-0030 | Material fallback remains usable with medium relationship strength | `slow_moving_candidate` | `slow_moving_candidate` | PASS | - | NO |

## Disagreements

- None. All controlled fixtures agree with the current productive Condition Engine.

## Contract Gaps

- None.

The project/one-time-demand fixture exercises the existing independent-Dead-signal safety boundary. It does not claim a separate productive project-demand classifier, because AP 16.4d.3a does not add or change classification logic.

## Validation Results

| Validation | Passed | Failed |
| --- | ---: | ---: |
| Pre-change structured baseline | 293 | 0 |
| Calibration static contract | 71 | 0 |
| Final structured browser suite | 299 | 0 |
| JavaScript/CommonJS syntax | 140 | 0 |
| Relevant Product Smokes | 4 | 0 |
| git diff --check | 1 | 0 |

- Final structured suite: 299 total, 299 passed, 0 failed, 0 skipped.
- Page errors: 0.
- Unexpected console errors: 0.
- Expected test-only diagnostics: 1.

## Exact Test Commands

`$node tests/ap-16-4d-3a-static-contract.cjs`

`$node tests/run-browser-suite.cjs`

`$node tests/ap-16-4d-3a-product-smoke.cjs`

`$node tests/icon-01-product-smoke.cjs`

`$node tests/ch-ex-01a-product-smoke.cjs`

`$node tests/ex-ux-01-6-product-smoke.cjs`

`Get-ChildItem -Recurse -File -Include *.js,*.cjs | Where-Object FullName -notmatch '\\artifacts\\' | ForEach-Object { & $node --check $_.FullName }`

`$node tests/generate-slow-dead-calibration-baseline.cjs --check`

`git diff --check`

`git status --short`

## Scope Preservation

The productive Slow / Dead Condition Engine, Policy version and thresholds, `app.js`, visible UI, Excess Engine, Opportunity Score Engine, Actions, upload, parsing, Registry ownership and Package revisions were not changed by AP 16.4d.3a. Follow-up work remains explicitly separated:

- `AP 16.4d.3b` - Calibration Metrics & Threshold Sensitivity
- `AP 16.4d.3c` - Human Pilot Review & Acceptance Closure
