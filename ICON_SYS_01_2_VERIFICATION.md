# ICON-SYS-01.2 Verification

## Repository Identity

- Product: ObsoliQ Inventory Recovery Cockpit
- Repository root: `C:\Users\Noah\Documents\Codex\2026-06-24\da-s\outputs\inventory-recovery-mvp`
- Branch: `feature/ir-01-unified-inventory-risks`
- Commit before and after: `559e0cda070bdf5a77d7d66e671838ec899c786c`
- Runtime entry: `prototype.html`
- Active stylesheet: `styles.css`
- Protocol: direct `file://`
- Product release gate: `HOLD`

The existing dirty worktree was preserved. No commit, merge, push, tag, deployment, Review ZIP or Product Release was performed.

## Accepted Baseline

- Structured browser suite: `344/344 PASS`
- Page errors: `0`
- Unexpected console errors: `0`
- Manifest IDs: `43`
- Sprite symbols: `43`
- KPI tile: `30 x 30 px`
- KPI icon: `17 x 17 px`
- Label: `11 px`
- Portfolio and financial value: `21 px`
- Meta text: `10.5 px`
- Card minimum: approximately `78 px`
- Canonical SHA verification: `258/258 PASS`

## Implemented Scale Contract

The change is scoped to `.inventory-risk-summary` and its seven KPI cards. No global `.oq-icon`, navigation, action, Overview, Data Quality or Data Foundation sizing changed.

| Viewport contract | Tile | Icon | Label | Portfolio value | Financial value | Meta | Top minimum | Financial minimum |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Above 1200 px | 38 px | 21 px | 12.5 px | 26 px | 28 px | 11.5 px | 92 px | 96 px |
| 1200 px and below | 36 px | 20 px | 12 px | 25 px | 26 px | 11 px | 88 px | 92 px |
| 620 px and below | 34 px | 18 px | 12 px | 24 px | 25 px | 11 px | 84 px | 88 px |

The Financial Guard uses `11.5 px` with `1.4` line height and reduces to `11 px` below 620 px. All KPI values remain left aligned, tabular, single-line and unclipped; label and meta text may wrap without ellipsis.

## Semantic And Behavioral Preservation

- KPI icon IDs remain `inventory-risks`, `prioritized-cases`, `owner-coverage`, `evidence-readiness`, `recovery-potential`, `slow-dead-stock` and `blocked-quality`.
- Manifest and Sprite remain exactly `43/43`; no SVG geometry, helper or semantic ID changed.
- KPI values remain `28`, `1`, `100 %`, `0 %`, `424 Tsd. €`, `n. v.` and `117 Tsd. €` for the accepted sample.
- Segment counts remain `28`, `20`, `0`, `9` and `1`.
- Search, filtering, case selection, detail rendering, language, theme and export modal interactions pass.
- Regression-level model summaries, counts and export rows remain identical before and after language and theme changes.

## Responsive And Visual Evidence

The Product Smoke passed at `1536x864`, `1440x900`, `1366x768`, `1200x800`, `900x900`, `720x900` and `390x844`:

- body-level horizontal overflow: `0` at every target width
- clipped KPI values: `0`
- label/icon overlap: `0`
- meta/card overflow: `0`
- summary grids: `4/3` desktop, `2/2` through 900 px, `1/1` below 620 px
- Worklist remains visible in the first viewport at `1366x768`
- Light mode, Dark mode, German, English and direct `file://`: `PASS`
- external requests, failed requests, Page Errors and Console Errors: `0`

Screenshots:

- `tests/screenshots/icon-sys-01-2/inventory-risks-light-1536x864.png`
- `tests/screenshots/icon-sys-01-2/inventory-risks-dark-1536x864.png`
- `tests/screenshots/icon-sys-01-2/inventory-risks-light-1440x900.png`
- `tests/screenshots/icon-sys-01-2/inventory-risks-light-1366x768.png`
- `tests/screenshots/icon-sys-01-2/inventory-risks-light-1200x800.png`
- `tests/screenshots/icon-sys-01-2/inventory-risks-light-900x900.png`
- `tests/screenshots/icon-sys-01-2/inventory-risks-light-390x844.png`

## Final Gates

- ICON-SYS-01.2 Product Smoke: `PASS`
- Final structured browser suite: `347/347 PASS`
- Final Page Errors: `0`
- Final unexpected Console Errors: `0`
- Node syntax checks: `5/5 PASS`
- `git diff --check`: `PASS`
- UTF-8 without BOM and LF: `13/13 PASS`
- Canonical SHA generation and verification: `261/261 PASS` with no missing, mismatched, unlisted or out-of-scope files

ICON-SYS-01.2 is a presentation-only closure. `PRODUCT_RELEASE_GATE` remains `HOLD`.
