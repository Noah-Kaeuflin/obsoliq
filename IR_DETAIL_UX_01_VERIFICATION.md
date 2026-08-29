# IR-DETAIL-UX-01 Verification

## Repository Identity

- Product: ObsoliQ Inventory Recovery Cockpit
- Repository root: `C:\Users\Noah\Documents\Codex\2026-06-24\da-s\outputs\inventory-recovery-mvp`
- Branch: `feature/ir-01-unified-inventory-risks`
- Commit before and after: `559e0cda070bdf5a77d7d66e671838ec899c786c`
- Runtime entry: `prototype.html`
- Active stylesheet: `styles.css`
- Active application adapter: `app.js`
- Visible route: `inventory-risks`
- Excess family key: `excess_demand`
- Protocol: direct `file://`
- Product release gate: `HOLD`

The existing dirty worktree was preserved. No reset, checkout, restore, clean, stash, rebase, commit, merge, push, tag, deployment, Review ZIP, Registry revision, Package revision or Product Release was performed.

## Accepted Baseline

- Structured browser suite: `347/347 PASS`
- Page errors: `0`
- Unexpected console errors: `0`
- Icon Manifest IDs: `43`
- Sprite symbols: `43`
- Canonical SHA verification: `261/261 PASS`

## Confirmed Root Causes

The previous renderer used five `data-excess-detail-target` buttons with `aria-current="location"`, five `data-excess-section-anchor` jump targets, `scrollIntoView()`, a passive scroll listener and `requestAnimationFrame` scroll-spy updates inside `.excess-detail-scroll`. Selection and visible content could therefore diverge during rerendering or container scrolling.

The style inspection found `97` distinct selectors and `383` occurrences scoped to the standalone `#excessPage`. Of these, `82` were reusable detail-component selectors and `14` generic embedded Excess style conflicts were identified. Page shell, split-workspace, worklist, pagination and standalone host sizing remain page-layout concerns. Decision, Value, History, Score, Readiness, Action Option, Work Context and disclosure presentation now also resolve through the shared Decision Surface in both hosts.

## Implemented Interaction Contract

`renderExcessDetail()` now emits one `.excess-decision-surface` in the standalone Excess workspace and the embedded Unified Inventory Risks Excess detail. The surface preserves the exact existing Case ID and contains:

- one ARIA `tablist`;
- five `tab` controls in the accepted Decision, Value Logic, History, Prioritization and Action Paths order;
- five linked `tabpanel` elements;
- one selected tab and exactly one visible panel;
- roving `tabindex` plus Arrow Left/Right, Home and End keyboard handling;
- synchronized `aria-selected`, `aria-controls`, `aria-labelledby`, `hidden` and `aria-hidden` state.

The historical anchors, location semantics, scroll observer and `scrollIntoView()` behavior were removed from Excess detail navigation. The small tab state is presentation-only: it remains stable for the same exact Case and resets to Decision when the Case changes.

## Shared Composition

The five panels use the accepted model projection without recalculation:

| Tab | Existing content |
| --- | --- |
| Decision | Next Review Step, Why Prioritized, Cause Hypothesis and Decision Readiness |
| Value Logic | Gross-to-Net Value Narrative and Scenario assumptions |
| History | Exact-row Historical Runtime evidence and unit context |
| Prioritization | Opportunity Score, operational evidence, Evidence and Data/Relationship disclosures |
| Action Paths | Action Options, Work Context, Owner context, Pilot Review and Technical provenance |

All six accepted disclosures remain present and closed by default where applicable. Inventory and Actions handoffs retain their existing exact Case identity and behavior.

## Container-Responsive Presentation

`.excess-decision-surface` is a named `inline-size` query container. Shared selectors cover both `#excessPage` and `.inventory-risk-detail`; host-only rules continue to own page and split-pane layout. Container queries switch Decision/Readiness columns, Historical metrics, Value Logic and Action composition using actual surface width rather than viewport width alone.

The six-viewport Product Smoke measured one Decision column at the `328 px` mobile surface and two columns at `588`, `658`, `826` and `1126 px` surfaces. Core visible Decision copy remains at least `12 px`. No body, surface or visible tab panel had horizontal overflow.

## Semantic And Behavioral Preservation

- Excess, Recovery and Inventory values are unchanged.
- Gross minus overlap/deductions equals Net order is unchanged.
- Opportunity Score components, maxima and total are unchanged.
- Decision Readiness, Cause Hypothesis, Historical Runtime evidence and Action Option status are unchanged.
- No recommendation, evidence, Forecast or missing-to-zero interpretation was introduced.
- Case IDs, exact selection, Inventory handoff and Actions handoff are unchanged.
- Upload, parsing, mapping, Data Quality, export, Registry, Package and icon behavior are unchanged.
- Light/Dark themes, German/English rendering and direct local-file startup remain supported.

## Responsive And Visual Evidence

The focused Product Smoke passed at:

- `1440x900` Light / German
- `1200x800` Light / German
- `900x900` Light / German
- `720x900` Light / German
- `390x844` Light / German
- `1440x900` Dark / English

It activated all five tabs, retained all six disclosures and six Action Options, confirmed both exact handoffs and recorded zero external requests, failed requests, Page Errors or Console Errors.

Screenshots are generated locally under `tests/screenshots/ir-detail-ux-01/` and remain excluded from the package manifest as test output.

## Final Gates

- IR-DETAIL-UX-01 Product Smoke: `PASS`
- Final structured browser suite: `354/354 PASS`
- Final Page Errors: `0`
- Final unexpected Console Errors: `0`
- Node syntax checks: `11/11 PASS`
- `git diff --check`: `PASS`
- UTF-8 without BOM and LF verification: `18/18 PASS`
- Canonical SHA generation and verification: `264/264 PASS` with no missing, mismatched, unlisted or out-of-scope files

IR-DETAIL-UX-01 is a presentation-only closure. `PRODUCT_RELEASE_GATE` remains `HOLD`.
