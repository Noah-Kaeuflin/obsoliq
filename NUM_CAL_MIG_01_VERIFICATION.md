# NUM-CAL-MIG-01 Verification

## Final Gates

```text
NUM_CORE_GATE: PASS
NUM_CAL_MIG_GATE: PASS
NUM_RELEASE_GATE: PASS

PRODUCT_RELEASE_GATE: HOLD
NEXT_AUTHORIZED_SCOPE: TRUST-01
IR-01 IMPLEMENTATION: NOT_AUTHORIZED
```

## Workspace and Scope

- Repository: `C:/Users/Noah/Documents/Codex/2026-06-24/da-s/outputs/inventory-recovery-mvp`
- Branch: `fix/ex-ux-01-3-excess-decision-narrative`
- Initial and final HEAD: `aae61092d3fc6a9ba7f1018d711fd387ab99ad5e`
- Verification date: `2026-08-26`
- Existing dirty worktree preserved: yes; no reset, checkout, clean or stash.
- Commit, tag, push, SHA manifest and Review ZIP: not created.
- Product bootstrap: Calibration modules remain analysis-only and absent from `prototype.html`.

## Reproduced Initial Blocker

Before the migration, both Calibration static contracts reproduced the remaining gate failure:

| Command | Exit | Detected | Passed | Failed | Exact failure |
| --- | ---: | ---: | ---: | ---: | --- |
| `node tests/ap-16-4d-3a-static-contract.cjs` | 1 | 79 | 77 | 2 | stale `app.js` and productive Condition Engine integrity hashes |
| `node tests/ap-16-4d-3b-static-contract.cjs` | 1 | 188 | 186 | 2 | same stale integrity hashes |

The analytical code audit additionally found one permissive calibration conversion in `evaluateScenarioSafety`: direct `Number(...)` coercion of `months_since_last_consumption`. Empty fixture sets could also report positive agreement and Safety because zero evaluated rows were not distinguished from zero violations.

## Migration Design

- The authoritative API is the existing productive `ObsoliQ.core.valueUtils.numericEvidence(...)` boundary.
- No second parser, regex number cleaner or calibration-specific coercion was added.
- Fixture literals and all 30 Expected Conditions remain unchanged.
- The adapter inventories 16 numeric input fields per fixture and preserves `valid`, `missing`, `ambiguous` and `invalid` with per-field Reason Codes.
- Valid values are normalized before the productive Condition Engine runs. Missing values remain non-numeric and never become zero. Invalid or ambiguous rows remain visible as excluded Result Rows and never reach the Engine.
- Runner and Metrics use only `evaluation_status: evaluated` rows for agreement calculations.
- Empty/all-invalid bases produce `insufficient_coverage`, `not_calculable` and `not_evaluated`, never PASS or 100%.
- Sensitivity consumes Runner Result Rows and their numeric evidence instead of re-reading raw values with coercion.

### Contract Version Decision

| Contract | Before | After | Decision |
| --- | --- | --- | --- |
| Fixture schema | `slow-dead-calibration-case-v1` | unchanged | No fixture shape or semantic expectation changed. |
| Numeric adapter | implicit | `slow-dead-calibration-numeric-boundary-v1` | New explicit adapter contract. |
| Runner output | `slow-dead-calibration-runner-v1` | `slow-dead-calibration-runner-v2` | Incompatible output addition: eligibility, status, parse evidence and not-calculable state. |
| Metrics output | `slow-dead-calibration-metrics-v1` | `slow-dead-calibration-metrics-v2` | Incompatible output addition: eligible/excluded counts and blocked/not-evaluated states. |
| Sensitivity plan | `slow-dead-threshold-sensitivity-plan-v1` | unchanged | OFAT scenarios and Policy semantics did not change. |
| Sensitivity runner | `slow-dead-threshold-sensitivity-runner-v1` | `slow-dead-threshold-sensitivity-runner-v2` | Result rows now preserve numeric status and use the shared adapter. |
| Productive Policy | `slow-dead-condition-policy-v1` | unchanged | Policy identity, thresholds and defaults are untouched. |

## Coverage and Parity

| Measure | Before | After | Result |
| --- | ---: | ---: | --- |
| Synthetic fixtures | 30 | 30 | preserved |
| Eligible Result Rows | implicit 30 | 30 | complete |
| Excluded Result Rows | implicit 0 | 0 | none in controlled baseline |
| Synthetic agreement | 30/30 | 30/30 | preserved |
| Safety Invariants | 12 | 12 | preserved and evaluated |
| OFAT scenarios | 17 | 17 | preserved |
| Numeric evidence cells | implicit | 480 | explicit |
| Valid numeric evidence cells | implicit | 467 | explicit |
| Missing numeric evidence cells | implicit | 13 | explicit, never coerced to zero |
| Expected Condition changes | 0 | 0 | preserved |
| Fixture literal changes | 0 | 0 | representation already canonical |

All Conditions and the below/at/above coverage for 6, 12 and 18 months remain present. Five deliberately unsafe OFAT alternatives remain visible as analysis results; no scenario is activated, recommended or written back.

## Determinism

| Run | Baseline Result Fingerprint | Sensitivity Result Fingerprint |
| --- | --- | --- |
| Fresh process 1 | `slow-dead-baseline-result:slow-dead-calibration-fingerprint-fnv1a32-v1:e416d74a` | `slow-dead-sensitivity-analysis:slow-dead-calibration-fingerprint-fnv1a32-v1:7338a454` |
| Fresh process 2 | `slow-dead-baseline-result:slow-dead-calibration-fingerprint-fnv1a32-v1:e416d74a` | `slow-dead-sensitivity-analysis:slow-dead-calibration-fingerprint-fnv1a32-v1:7338a454` |

| Artefakt | Bytes | SHA-256 Run 1 | SHA-256 Run 2 | Byteidentisch |
| --- | ---: | --- | --- | --- |
| `AP_16_4D_3A_FIXTURE_BASELINE.md` | 9597 | `f5991628ca590434ceb8ff33f80ffdc7fe64f6489dc1b12ca8060393b64d7797` | `f5991628ca590434ceb8ff33f80ffdc7fe64f6489dc1b12ca8060393b64d7797` | Ja |
| `AP_16_4D_3B_CALIBRATION_METRICS_AND_SENSITIVITY.md` | 14776 | `edbf37d5c7b08f856968e94ed4bfa12c3daa8085d55debd5f008858150aeb78b` | `edbf37d5c7b08f856968e94ed4bfa12c3daa8085d55debd5f008858150aeb78b` | Ja |
| `artifacts/ap-16-4d-3b-metrics.json` | 4932106 | `7621a495d51560d331e11a252e52c674414045189deb10c3639878ef9f8d5640` | `7621a495d51560d331e11a252e52c674414045189deb10c3639878ef9f8d5640` | Ja |
| `artifacts/ap-16-4d-3b-sensitivity.csv` | 6798 | `8e1c71edd3ba6faa5335dcf4498cd09664a998041f92392464a305e9d1fbc099` | `8e1c71edd3ba6faa5335dcf4498cd09664a998041f92392464a305e9d1fbc099` | Ja |

Both generator `--check` commands were executed twice in fresh Node processes. All Markdown, JSON and CSV comparisons were byteidentical before and after the two runs.

## Productive Policy and Engine Integrity

- `app.js` accepted pre-migration SHA-256: `ae449f0dc762604f2bf50bcbb10f54ef8ad06d2b70667ecce2b78a50f15bc0dd`
- Productive Condition Engine accepted pre-migration SHA-256: `7c7a4e3e51b39d89e12daf93dadb20908a87234061677a3fcf4aa8784469e03f`
- Productive Policy fingerprint: `slow-dead-policy:slow-dead-calibration-fingerprint-fnv1a32-v1:0c3cf3e0`
- Fixture fingerprint: `slow-dead-fixtures:slow-dead-calibration-fingerprint-fnv1a32-v1:cde15002`

| Policy-Feld | Unveränderter Wert |
| --- | ---: |
| `modelVersion` | `slow-dead-condition-v1` |
| `policyVersion` | `slow-dead-condition-policy-v1` |
| `minimumHistoryCoverageMonths` | `12` |
| `minimumHistoryCompleteness` | `0.8` |
| `strongHistoryCompleteness` | `0.9` |
| `slowMovingMonthsSinceLastConsumption` | `6` |
| `slowMovingCoverageMonths` | `12` |
| `minimumSlowEvidenceDimensions` | `2` |
| `nonMovingMonthsSinceLastConsumption` | `12` |
| `deadCandidateMonthsSinceLastConsumption` | `18` |
| `minimumActiveMonthsForRecurringDemand` | `2` |
| `intermittentDemandThreshold` | `0.75` |
| `intermittentRecentConsumptionMonths` | `6` |
| `requireIndependentDeadStockSignal` | `true` |

No productive parser, Condition Engine, Policy/default threshold, Excess, Recovery, Action, Input Trust, Historical Runtime, UI, HTML, CSS, packaging script or IR-01 implementation was changed.

## Test Matrix

| Command | Working Directory | Exit | Detected | Passed | Failed | Skipped | Duration | Runtime diagnostics |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `node tests/num-cal-mig-01-static-contract.cjs` | repository root | 0 | 39 | 39 | 0 | 0 | 2.62 s | 30 fixtures, 16 fields, 12 invariants, 17 scenarios |
| `node tests/ap-16-4d-3a-static-contract.cjs` | repository root | 0 | 83 | 83 | 0 | 0 | 0.53 s | 30/30 agreement, 0 critical violations |
| `node tests/ap-16-4d-3b-static-contract.cjs` | repository root | 0 | 193 | 193 | 0 | 0 | 4.66 s | 17 scenarios, 5 deliberately unsafe variants retained |
| all six `*static-contract.cjs` checks | repository root | 0 | 1,094 | 1,094 | 0 | 0 | 5.7 s parallel wall time | no contract failure |
| recursive `node --check` for JS/CJS | repository root | 0 | 287 | 287 | 0 | 0 | 20.23 s | no syntax failure |
| `node tests/run-browser-suite.cjs` | repository root | 0 | 323 | 323 | 0 | 0 | 241.60 s | 0 Page Errors; 0 unexpected Console Errors; 1 expected rollback diagnostic |
| Calibration 3a, Calibration 3b and Package `file://` Product smokes | repository root | 0 | 3 | 3 | 0 | 0 | 1.50-2.32 s each | sample loaded; upload/export/navigation/settings exercised; Calibration absent from product bootstrap; no Page/Console/load/network failure |
| additional eleven-script legacy Product-smoke sweep | repository root | 1 | 11 | 10 | 1 | 0 | 1.50-4.14 s each | unrelated `ex-ux-01-5-product-smoke.cjs` active-section timing assertion; no Page/Console/load error |
| `node tests/generate-slow-dead-calibration-baseline.cjs --check` twice | repository root | 0 | 2 | 2 | 0 | 0 | included in 9.57 s double run | byteidentical both runs |
| `node tests/generate-slow-dead-calibration-sensitivity.cjs --check` twice | repository root | 0 | 6 files | 6 | 0 | 0 | included in 9.57 s double run | Markdown/JSON/CSV byteidentical |
| `git diff --check` | repository root | 0 | 1 | 1 | 0 | 0 | < 1 s | no whitespace error; one line-ending warning on a pre-existing user test file |

The browser suite includes the Numeric Core tests (`num-01-contract.test.js`, `num-01-1-contract.test.js`) and all Calibration Contract, Fixture, Runner, Metrics, Sensitivity, determinism and NUM-CAL-MIG browser regressions. Upload, sample data, export, settings and local bootstrap were exercised by the passing Package Product smoke. The separately observed EX-UX active-section race is outside the authorized Calibration scope, loads none of the changed analysis modules and does not alter the NUM gates; it remains visible under the Product release HOLD.

## Changed Files

- `js/slow-dead/slow-dead-calibration-contract.js`
- `js/slow-dead/slow-dead-calibration-runner.js`
- `js/slow-dead/slow-dead-calibration-metrics.js`
- `js/slow-dead/slow-dead-threshold-sensitivity.js`
- `tests/ap-16-4d-3a-static-contract.cjs`
- `tests/ap-16-4d-3b-product-smoke.cjs`
- `tests/ap-16-4d-3b-static-contract.cjs`
- `tests/generate-slow-dead-calibration-baseline.cjs`
- `tests/generate-slow-dead-calibration-sensitivity.cjs`
- `tests/generate-num-cal-mig-01-verification.cjs`
- `tests/num-cal-mig-01-static-contract.cjs`
- `tests/num-cal-mig-01.test.js`
- `tests/slow-dead-calibration-baseline.test.js`
- `tests/slow-dead-calibration-contract.test.js`
- `tests/slow-dead-calibration-metrics.test.js`
- `tests/slow-dead-threshold-sensitivity.test.js`
- `tests/tests.html`
- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `DATA_CONTRACT.md`
- `PRODUCT_SPEC.md`
- `AP_16_4D_3A_FIXTURE_BASELINE.md`
- `AP_16_4D_3B_CALIBRATION_METRICS_AND_SENSITIVITY.md`
- `artifacts/ap-16-4d-3b-metrics.json`
- `artifacts/ap-16-4d-3b-sensitivity.csv`
- `NUM_CAL_MIG_01_VERIFICATION.md`

## Complete Fixture Migration Matrix

The baseline Fixture file required no literal rewrite. The table nevertheless records every numeric field at the old direct-pass boundary and the new strict adapter boundary. For Missing values, normalized `null` is an Engine adapter representation only; the per-field status and original source type remain explicit in the Result Row.

| Fixture-ID | Feld | Alter Wert | Neuer Wert | Alter Status | Neuer Status | Semantische Bedeutung unverändert | Begründung |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SD-CAL-SYN-0001 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0001 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0001 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0001 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0001 | `historicalEvidence.months_since_last_consumption` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0001 | `historicalEvidence.net_consumption_quantity_3m` | `30` | `30` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0001 | `historicalEvidence.net_consumption_quantity_6m` | `60` | `60` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0001 | `historicalEvidence.net_consumption_quantity_12m` | `120` | `120` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0001 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0001 | `historicalEvidence.active_consumption_months_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0001 | `historicalEvidence.movement_frequency_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0001 | `historicalEvidence.intermittency_ratio_12m` | `0.17` | `0.17` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0001 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0001 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0001 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0001 | `historicalEvidence.inventory_coverage_months` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0002 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0002 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0002 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0002 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0002 | `historicalEvidence.months_since_last_consumption` | `2` | `2` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0002 | `historicalEvidence.net_consumption_quantity_3m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0002 | `historicalEvidence.net_consumption_quantity_6m` | `15` | `15` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0002 | `historicalEvidence.net_consumption_quantity_12m` | `24` | `24` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0002 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0002 | `historicalEvidence.active_consumption_months_12m` | `2` | `2` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0002 | `historicalEvidence.movement_frequency_12m` | `2` | `2` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0002 | `historicalEvidence.intermittency_ratio_12m` | `0.83` | `0.83` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0002 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0002 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0002 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0002 | `historicalEvidence.inventory_coverage_months` | `45` | `45` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0003 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0003 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0003 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0003 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0003 | `historicalEvidence.months_since_last_consumption` | `7` | `7` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0003 | `historicalEvidence.net_consumption_quantity_3m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0003 | `historicalEvidence.net_consumption_quantity_6m` | `4` | `4` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0003 | `historicalEvidence.net_consumption_quantity_12m` | `30` | `30` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0003 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0003 | `historicalEvidence.active_consumption_months_12m` | `3` | `3` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0003 | `historicalEvidence.movement_frequency_12m` | `3` | `3` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0003 | `historicalEvidence.intermittency_ratio_12m` | `0.5` | `0.5` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0003 | `historicalEvidence.consumption_trend_ratio` | `-0.4` | `-0.4` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0003 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0003 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0003 | `historicalEvidence.inventory_coverage_months` | `18` | `18` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0004 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0004 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0004 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0004 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0004 | `historicalEvidence.months_since_last_consumption` | `13` | `13` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0004 | `historicalEvidence.net_consumption_quantity_3m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0004 | `historicalEvidence.net_consumption_quantity_6m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0004 | `historicalEvidence.net_consumption_quantity_12m` | `8` | `8` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0004 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0004 | `historicalEvidence.active_consumption_months_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0004 | `historicalEvidence.movement_frequency_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0004 | `historicalEvidence.intermittency_ratio_12m` | `0.92` | `0.92` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0004 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0004 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0004 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0004 | `historicalEvidence.inventory_coverage_months` | `80` | `80` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0005 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0005 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0005 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0005 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0005 | `historicalEvidence.months_since_last_consumption` | `20` | `20` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0005 | `historicalEvidence.net_consumption_quantity_3m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0005 | `historicalEvidence.net_consumption_quantity_6m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0005 | `historicalEvidence.net_consumption_quantity_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0005 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0005 | `historicalEvidence.active_consumption_months_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0005 | `historicalEvidence.movement_frequency_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0005 | `historicalEvidence.intermittency_ratio_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0005 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0005 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0005 | `historicalEvidence.history_completeness` | `0.95` | `0.95` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0005 | `historicalEvidence.inventory_coverage_months` | `null` | `null` (Status bleibt nicht-numerisch) | implizit Missing | `missing` | Ja | Missing bleibt Missing und wird nicht zu 0; der Engine-Adapter erhält eine nicht-numerische Repräsentation. |
| SD-CAL-SYN-0006 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0006 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0006 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0006 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0006 | `historicalEvidence.months_since_last_consumption` | `24` | `24` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0006 | `historicalEvidence.net_consumption_quantity_3m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0006 | `historicalEvidence.net_consumption_quantity_6m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0006 | `historicalEvidence.net_consumption_quantity_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0006 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0006 | `historicalEvidence.active_consumption_months_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0006 | `historicalEvidence.movement_frequency_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0006 | `historicalEvidence.intermittency_ratio_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0006 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0006 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0006 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0006 | `historicalEvidence.inventory_coverage_months` | `null` | `null` (Status bleibt nicht-numerisch) | implizit Missing | `missing` | Ja | Missing bleibt Missing und wird nicht zu 0; der Engine-Adapter erhält eine nicht-numerische Repräsentation. |
| SD-CAL-SYN-0007 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0007 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0007 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0007 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0007 | `historicalEvidence.months_since_last_consumption` | `5` | `5` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0007 | `historicalEvidence.net_consumption_quantity_3m` | `30` | `30` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0007 | `historicalEvidence.net_consumption_quantity_6m` | `60` | `60` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0007 | `historicalEvidence.net_consumption_quantity_12m` | `120` | `120` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0007 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0007 | `historicalEvidence.active_consumption_months_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0007 | `historicalEvidence.movement_frequency_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0007 | `historicalEvidence.intermittency_ratio_12m` | `0.17` | `0.17` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0007 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0007 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0007 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0007 | `historicalEvidence.inventory_coverage_months` | `11` | `11` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0008 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0008 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0008 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0008 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0008 | `historicalEvidence.months_since_last_consumption` | `6` | `6` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0008 | `historicalEvidence.net_consumption_quantity_3m` | `30` | `30` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0008 | `historicalEvidence.net_consumption_quantity_6m` | `60` | `60` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0008 | `historicalEvidence.net_consumption_quantity_12m` | `120` | `120` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0008 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0008 | `historicalEvidence.active_consumption_months_12m` | `6` | `6` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0008 | `historicalEvidence.movement_frequency_12m` | `6` | `6` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0008 | `historicalEvidence.intermittency_ratio_12m` | `0.17` | `0.17` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0008 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0008 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0008 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0008 | `historicalEvidence.inventory_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0009 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0009 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0009 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0009 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0009 | `historicalEvidence.months_since_last_consumption` | `7` | `7` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0009 | `historicalEvidence.net_consumption_quantity_3m` | `30` | `30` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0009 | `historicalEvidence.net_consumption_quantity_6m` | `60` | `60` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0009 | `historicalEvidence.net_consumption_quantity_12m` | `120` | `120` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0009 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0009 | `historicalEvidence.active_consumption_months_12m` | `6` | `6` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0009 | `historicalEvidence.movement_frequency_12m` | `6` | `6` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0009 | `historicalEvidence.intermittency_ratio_12m` | `0.17` | `0.17` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0009 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0009 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0009 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0009 | `historicalEvidence.inventory_coverage_months` | `13` | `13` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0010 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0010 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0010 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0010 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0010 | `historicalEvidence.months_since_last_consumption` | `11` | `11` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0010 | `historicalEvidence.net_consumption_quantity_3m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0010 | `historicalEvidence.net_consumption_quantity_6m` | `4` | `4` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0010 | `historicalEvidence.net_consumption_quantity_12m` | `20` | `20` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0010 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0010 | `historicalEvidence.active_consumption_months_12m` | `4` | `4` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0010 | `historicalEvidence.movement_frequency_12m` | `3` | `3` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0010 | `historicalEvidence.intermittency_ratio_12m` | `0.5` | `0.5` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0010 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0010 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0010 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0010 | `historicalEvidence.inventory_coverage_months` | `24` | `24` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0011 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0011 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0011 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0011 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0011 | `historicalEvidence.months_since_last_consumption` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0011 | `historicalEvidence.net_consumption_quantity_3m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0011 | `historicalEvidence.net_consumption_quantity_6m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0011 | `historicalEvidence.net_consumption_quantity_12m` | `8` | `8` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0011 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0011 | `historicalEvidence.active_consumption_months_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0011 | `historicalEvidence.movement_frequency_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0011 | `historicalEvidence.intermittency_ratio_12m` | `0.92` | `0.92` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0011 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0011 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0011 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0011 | `historicalEvidence.inventory_coverage_months` | `80` | `80` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0012 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0012 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0012 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0012 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0012 | `historicalEvidence.months_since_last_consumption` | `13` | `13` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0012 | `historicalEvidence.net_consumption_quantity_3m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0012 | `historicalEvidence.net_consumption_quantity_6m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0012 | `historicalEvidence.net_consumption_quantity_12m` | `8` | `8` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0012 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0012 | `historicalEvidence.active_consumption_months_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0012 | `historicalEvidence.movement_frequency_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0012 | `historicalEvidence.intermittency_ratio_12m` | `0.92` | `0.92` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0012 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0012 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0012 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0012 | `historicalEvidence.inventory_coverage_months` | `80` | `80` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0013 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0013 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0013 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0013 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0013 | `historicalEvidence.months_since_last_consumption` | `17` | `17` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0013 | `historicalEvidence.net_consumption_quantity_3m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0013 | `historicalEvidence.net_consumption_quantity_6m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0013 | `historicalEvidence.net_consumption_quantity_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0013 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0013 | `historicalEvidence.active_consumption_months_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0013 | `historicalEvidence.movement_frequency_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0013 | `historicalEvidence.intermittency_ratio_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0013 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0013 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0013 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0013 | `historicalEvidence.inventory_coverage_months` | `null` | `null` (Status bleibt nicht-numerisch) | implizit Missing | `missing` | Ja | Missing bleibt Missing und wird nicht zu 0; der Engine-Adapter erhält eine nicht-numerische Repräsentation. |
| SD-CAL-SYN-0014 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0014 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0014 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0014 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0014 | `historicalEvidence.months_since_last_consumption` | `18` | `18` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0014 | `historicalEvidence.net_consumption_quantity_3m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0014 | `historicalEvidence.net_consumption_quantity_6m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0014 | `historicalEvidence.net_consumption_quantity_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0014 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0014 | `historicalEvidence.active_consumption_months_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0014 | `historicalEvidence.movement_frequency_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0014 | `historicalEvidence.intermittency_ratio_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0014 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0014 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0014 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0014 | `historicalEvidence.inventory_coverage_months` | `null` | `null` (Status bleibt nicht-numerisch) | implizit Missing | `missing` | Ja | Missing bleibt Missing und wird nicht zu 0; der Engine-Adapter erhält eine nicht-numerische Repräsentation. |
| SD-CAL-SYN-0015 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0015 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0015 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0015 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0015 | `historicalEvidence.months_since_last_consumption` | `19` | `19` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0015 | `historicalEvidence.net_consumption_quantity_3m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0015 | `historicalEvidence.net_consumption_quantity_6m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0015 | `historicalEvidence.net_consumption_quantity_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0015 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0015 | `historicalEvidence.active_consumption_months_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0015 | `historicalEvidence.movement_frequency_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0015 | `historicalEvidence.intermittency_ratio_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0015 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0015 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0015 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0015 | `historicalEvidence.inventory_coverage_months` | `null` | `null` (Status bleibt nicht-numerisch) | implizit Missing | `missing` | Ja | Missing bleibt Missing und wird nicht zu 0; der Engine-Adapter erhält eine nicht-numerische Repräsentation. |
| SD-CAL-SYN-0016 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0016 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0016 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0016 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0016 | `historicalEvidence.months_since_last_consumption` | `30` | `30` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0016 | `historicalEvidence.net_consumption_quantity_3m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0016 | `historicalEvidence.net_consumption_quantity_6m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0016 | `historicalEvidence.net_consumption_quantity_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0016 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0016 | `historicalEvidence.active_consumption_months_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0016 | `historicalEvidence.movement_frequency_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0016 | `historicalEvidence.intermittency_ratio_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0016 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0016 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0016 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0016 | `historicalEvidence.inventory_coverage_months` | `null` | `null` (Status bleibt nicht-numerisch) | implizit Missing | `missing` | Ja | Missing bleibt Missing und wird nicht zu 0; der Engine-Adapter erhält eine nicht-numerische Repräsentation. |
| SD-CAL-SYN-0017 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0017 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0017 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0017 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0017 | `historicalEvidence.months_since_last_consumption` | `6` | `6` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0017 | `historicalEvidence.net_consumption_quantity_3m` | `4` | `4` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0017 | `historicalEvidence.net_consumption_quantity_6m` | `8` | `8` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0017 | `historicalEvidence.net_consumption_quantity_12m` | `20` | `20` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0017 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0017 | `historicalEvidence.active_consumption_months_12m` | `2` | `2` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0017 | `historicalEvidence.movement_frequency_12m` | `2` | `2` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0017 | `historicalEvidence.intermittency_ratio_12m` | `0.75` | `0.75` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0017 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0017 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0017 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0017 | `historicalEvidence.inventory_coverage_months` | `36` | `36` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0018 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0018 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0018 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0018 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0018 | `historicalEvidence.months_since_last_consumption` | `18` | `18` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0018 | `historicalEvidence.net_consumption_quantity_3m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0018 | `historicalEvidence.net_consumption_quantity_6m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0018 | `historicalEvidence.net_consumption_quantity_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0018 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0018 | `historicalEvidence.active_consumption_months_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0018 | `historicalEvidence.movement_frequency_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0018 | `historicalEvidence.intermittency_ratio_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0018 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0018 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0018 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0018 | `historicalEvidence.inventory_coverage_months` | `null` | `null` (Status bleibt nicht-numerisch) | implizit Missing | `missing` | Ja | Missing bleibt Missing und wird nicht zu 0; der Engine-Adapter erhält eine nicht-numerische Repräsentation. |
| SD-CAL-SYN-0019 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0019 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0019 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0019 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0019 | `historicalEvidence.months_since_last_consumption` | `22` | `22` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0019 | `historicalEvidence.net_consumption_quantity_3m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0019 | `historicalEvidence.net_consumption_quantity_6m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0019 | `historicalEvidence.net_consumption_quantity_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0019 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0019 | `historicalEvidence.active_consumption_months_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0019 | `historicalEvidence.movement_frequency_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0019 | `historicalEvidence.intermittency_ratio_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0019 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0019 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0019 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0019 | `historicalEvidence.inventory_coverage_months` | `null` | `null` (Status bleibt nicht-numerisch) | implizit Missing | `missing` | Ja | Missing bleibt Missing und wird nicht zu 0; der Engine-Adapter erhält eine nicht-numerische Repräsentation. |
| SD-CAL-SYN-0020 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0020 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0020 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0020 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0020 | `historicalEvidence.months_since_last_consumption` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0020 | `historicalEvidence.net_consumption_quantity_3m` | `30` | `30` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0020 | `historicalEvidence.net_consumption_quantity_6m` | `60` | `60` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0020 | `historicalEvidence.net_consumption_quantity_12m` | `120` | `120` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0020 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0020 | `historicalEvidence.active_consumption_months_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0020 | `historicalEvidence.movement_frequency_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0020 | `historicalEvidence.intermittency_ratio_12m` | `0.17` | `0.17` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0020 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0020 | `historicalEvidence.history_coverage_months` | `11` | `11` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0020 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0020 | `historicalEvidence.inventory_coverage_months` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0021 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0021 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0021 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0021 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0021 | `historicalEvidence.months_since_last_consumption` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0021 | `historicalEvidence.net_consumption_quantity_3m` | `30` | `30` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0021 | `historicalEvidence.net_consumption_quantity_6m` | `60` | `60` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0021 | `historicalEvidence.net_consumption_quantity_12m` | `120` | `120` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0021 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0021 | `historicalEvidence.active_consumption_months_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0021 | `historicalEvidence.movement_frequency_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0021 | `historicalEvidence.intermittency_ratio_12m` | `0.17` | `0.17` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0021 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0021 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0021 | `historicalEvidence.history_completeness` | `0.79` | `0.79` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0021 | `historicalEvidence.inventory_coverage_months` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0022 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0022 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0022 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0022 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0022 | `historicalEvidence.months_since_last_consumption` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0022 | `historicalEvidence.net_consumption_quantity_3m` | `30` | `30` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0022 | `historicalEvidence.net_consumption_quantity_6m` | `60` | `60` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0022 | `historicalEvidence.net_consumption_quantity_12m` | `120` | `120` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0022 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0022 | `historicalEvidence.active_consumption_months_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0022 | `historicalEvidence.movement_frequency_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0022 | `historicalEvidence.intermittency_ratio_12m` | `0.17` | `0.17` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0022 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0022 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0022 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0022 | `historicalEvidence.inventory_coverage_months` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0023 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0023 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0023 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0023 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0023 | `historicalEvidence.months_since_last_consumption` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0023 | `historicalEvidence.net_consumption_quantity_3m` | `30` | `30` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0023 | `historicalEvidence.net_consumption_quantity_6m` | `60` | `60` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0023 | `historicalEvidence.net_consumption_quantity_12m` | `120` | `120` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0023 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0023 | `historicalEvidence.active_consumption_months_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0023 | `historicalEvidence.movement_frequency_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0023 | `historicalEvidence.intermittency_ratio_12m` | `0.17` | `0.17` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0023 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0023 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0023 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0023 | `historicalEvidence.inventory_coverage_months` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0024 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0024 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0024 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0024 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0024 | `historicalEvidence.months_since_last_consumption` | `24` | `24` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0024 | `historicalEvidence.net_consumption_quantity_3m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0024 | `historicalEvidence.net_consumption_quantity_6m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0024 | `historicalEvidence.net_consumption_quantity_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0024 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0024 | `historicalEvidence.active_consumption_months_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0024 | `historicalEvidence.movement_frequency_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0024 | `historicalEvidence.intermittency_ratio_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0024 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0024 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0024 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0024 | `historicalEvidence.inventory_coverage_months` | `null` | `null` (Status bleibt nicht-numerisch) | implizit Missing | `missing` | Ja | Missing bleibt Missing und wird nicht zu 0; der Engine-Adapter erhält eine nicht-numerische Repräsentation. |
| SD-CAL-SYN-0025 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0025 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0025 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0025 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0025 | `historicalEvidence.months_since_last_consumption` | `18` | `18` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0025 | `historicalEvidence.net_consumption_quantity_3m` | `30` | `30` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0025 | `historicalEvidence.net_consumption_quantity_6m` | `60` | `60` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0025 | `historicalEvidence.net_consumption_quantity_12m` | `undefined` | `null` (Status bleibt nicht-numerisch) | implizit Missing | `missing` | Ja | Missing bleibt Missing und wird nicht zu 0; der Engine-Adapter erhält eine nicht-numerische Repräsentation. |
| SD-CAL-SYN-0025 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0025 | `historicalEvidence.active_consumption_months_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0025 | `historicalEvidence.movement_frequency_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0025 | `historicalEvidence.intermittency_ratio_12m` | `0.17` | `0.17` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0025 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0025 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0025 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0025 | `historicalEvidence.inventory_coverage_months` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0026 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0026 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0026 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0026 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0026 | `historicalEvidence.months_since_last_consumption` | `18` | `18` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0026 | `historicalEvidence.net_consumption_quantity_3m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0026 | `historicalEvidence.net_consumption_quantity_6m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0026 | `historicalEvidence.net_consumption_quantity_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0026 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0026 | `historicalEvidence.active_consumption_months_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0026 | `historicalEvidence.movement_frequency_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0026 | `historicalEvidence.intermittency_ratio_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0026 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0026 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0026 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0026 | `historicalEvidence.inventory_coverage_months` | `null` | `null` (Status bleibt nicht-numerisch) | implizit Missing | `missing` | Ja | Missing bleibt Missing und wird nicht zu 0; der Engine-Adapter erhält eine nicht-numerische Repräsentation. |
| SD-CAL-SYN-0027 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0027 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0027 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0027 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0027 | `historicalEvidence.months_since_last_consumption` | `13` | `13` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0027 | `historicalEvidence.net_consumption_quantity_3m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0027 | `historicalEvidence.net_consumption_quantity_6m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0027 | `historicalEvidence.net_consumption_quantity_12m` | `8` | `8` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0027 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0027 | `historicalEvidence.active_consumption_months_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0027 | `historicalEvidence.movement_frequency_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0027 | `historicalEvidence.intermittency_ratio_12m` | `0.92` | `0.92` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0027 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0027 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0027 | `historicalEvidence.history_completeness` | `0.8` | `0.8` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0027 | `historicalEvidence.inventory_coverage_months` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0028 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0028 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0028 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0028 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0028 | `historicalEvidence.months_since_last_consumption` | `18` | `18` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0028 | `historicalEvidence.net_consumption_quantity_3m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0028 | `historicalEvidence.net_consumption_quantity_6m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0028 | `historicalEvidence.net_consumption_quantity_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0028 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0028 | `historicalEvidence.active_consumption_months_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0028 | `historicalEvidence.movement_frequency_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0028 | `historicalEvidence.intermittency_ratio_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0028 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0028 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0028 | `historicalEvidence.history_completeness` | `0.89` | `0.89` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0028 | `historicalEvidence.inventory_coverage_months` | `null` | `null` (Status bleibt nicht-numerisch) | implizit Missing | `missing` | Ja | Missing bleibt Missing und wird nicht zu 0; der Engine-Adapter erhält eine nicht-numerische Repräsentation. |
| SD-CAL-SYN-0029 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0029 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0029 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0029 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0029 | `historicalEvidence.months_since_last_consumption` | `18` | `18` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0029 | `historicalEvidence.net_consumption_quantity_3m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0029 | `historicalEvidence.net_consumption_quantity_6m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0029 | `historicalEvidence.net_consumption_quantity_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0029 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0029 | `historicalEvidence.active_consumption_months_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0029 | `historicalEvidence.movement_frequency_12m` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0029 | `historicalEvidence.intermittency_ratio_12m` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0029 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0029 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0029 | `historicalEvidence.history_completeness` | `0.9` | `0.9` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0029 | `historicalEvidence.inventory_coverage_months` | `null` | `null` (Status bleibt nicht-numerisch) | implizit Missing | `missing` | Ja | Missing bleibt Missing und wird nicht zu 0; der Engine-Adapter erhält eine nicht-numerische Repräsentation. |
| SD-CAL-SYN-0030 | `inventoryEvidence.stock_quantity` | `100` | `100` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0030 | `inventoryEvidence.stock_value` | `10000` | `10000` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0030 | `inventoryEvidence.no_need_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0030 | `inventoryEvidence.no_plan_value` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0030 | `historicalEvidence.months_since_last_consumption` | `7` | `7` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0030 | `historicalEvidence.net_consumption_quantity_3m` | `30` | `30` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0030 | `historicalEvidence.net_consumption_quantity_6m` | `60` | `60` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0030 | `historicalEvidence.net_consumption_quantity_12m` | `120` | `120` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0030 | `historicalEvidence.average_monthly_consumption_12m` | `10` | `10` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0030 | `historicalEvidence.active_consumption_months_12m` | `5` | `5` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0030 | `historicalEvidence.movement_frequency_12m` | `5` | `5` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0030 | `historicalEvidence.intermittency_ratio_12m` | `0.17` | `0.17` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0030 | `historicalEvidence.consumption_trend_ratio` | `0` | `0` | implizit kanonisch gültig | `valid` | Ja | Explizite Null bleibt gültige kanonische Null; keine Missing-Coercion. |
| SD-CAL-SYN-0030 | `historicalEvidence.history_coverage_months` | `12` | `12` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0030 | `historicalEvidence.history_completeness` | `1` | `1` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |
| SD-CAL-SYN-0030 | `historicalEvidence.inventory_coverage_months` | `18` | `18` | implizit kanonisch gültig | `valid` | Ja | Kanonischer Zahlenwert bleibt unverändert; produktive Numeric Boundary bestätigt ihn. |

## Remaining Hardening Gates

- Product release remains HOLD; this task closes only the Numeric Calibration migration gate.
- The legacy `ex-ux-01-5-product-smoke.cjs` currently races between its successful `aria-current` wait and the immediate follow-up assertion (`section-guide-active-state`); no Page, Console or load error occurs. UI and this unrelated smoke are outside NUM-CAL-MIG-01 and were not changed.
- `TRUST-01` is the next authorized scope.
- Broader `CAL-01` hardening, production-grade persistence, multi-user security and live SAP integration remain outside this block.
- `PKG-02B`, SHA manifest regeneration and Review ZIP creation remain deferred until complete Product hardening.
- `IR-01` implementation is not authorized.
