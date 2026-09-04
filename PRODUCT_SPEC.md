# ObsoliQ Product Spec

## History/Slow-Dead Producer Contract Closure

Inventory and Material Master support optional `base_unit` as the quantity unit of `stock_quantity`. Existing files without it still import and retain their existing Data Quality score; quantitative Historical and definitive Slow/Dead evidence remains limited without a compatible Inventory unit. History never supplies that missing Inventory unit and no conversion/default is available.

History Coverage now means the inclusive span of actually observed valid evidence months, not stock reach and not completeness. It remains separate from rolling 12-month completeness and Inventory Coverage. The existing Explorer History Coverage column reads this corrected producer field. Neither missing periods nor unobserved months before the as-of are invented. Slow/Dead thresholds, financials and readiness formulas are unchanged.

The 102-row Inventory sample is unchanged. This contract closure does not create a full multi-Package demo. `DATA-FOUNDATION-ACTIVATION-01` remains blocked historical evidence; its follow-up `DATA-FOUNDATION-ACTIVATION-01-RERUN-01` is eligible only after verified closure acceptance. Product Release remains HOLD and is not authorized by technical tests.

## Product Positioning

ObsoliQ is an Inventory Recovery Cockpit for SAP-based manufacturing companies. It is not a generic dashboard, not a full SAP replacement and not a pure BI report.

The product helps users move from SAP or Excel inventory data to classification, recovery potential, root cause, recommended action, owner, status tracking and exportable management reporting.

### ICON-SYS-01 — Consistent Product Iconography

ObsoliQ uses one local, licensed 43-symbol Lucide outline family for product navigation, recurring actions, Overview KPIs, Unified Inventory Risks, Decision Workspace navigation, Data Quality and Data Foundation. The current `Bestandsrisiken` / `Inventory Risks` route uses the dedicated `inventory-risks` portfolio symbol; the existing Excess, Slow / Dead and Blocked / Quality symbols remain available for Risk Family semantics.

Icons are orientation aids, not decoration or a substitute for text. Normal navigation and actions retain visible translated labels; icon-only controls require an accessible name and title. Status meaning remains textual and never relies on color or shape alone. Icons use `currentColor`, fixed 14/16/18 px roles and the shared outline contract in both themes.

The Icon System is entirely local and `file://` compatible. A synchronous inline Sprite loads before `app.js`; no CDN, icon font, fetch or external SVG reference is permitted. Its stable allowlisted IDs are independent of German/English labels and introduce no Analytics, Dataset, Registry, Recovery, workflow or export state.

### ICON-SYS-01.1 — Semantic Icon Roles & Optical Calibration

Icons remain semantic orientation aids. Unified Risk portfolio measures use the dedicated `inventory-risks`, `prioritized-cases`, `owner-coverage` and `evidence-readiness` IDs; the three separated financial measures retain `recovery-potential`, `slow-dead-stock` and `blocked-quality`. Every KPI icon sits in the same 30 px tile beside its textual label, value and status note.

Case selection inside the Risk Decision List uses a Chevron because it opens the existing detail pane. Inventory and Actions workflow navigation uses the corresponding destination icon and keeps its exact-case handoff. Detail tabs retain their five established semantic IDs, while CSS-only transforms optically balance their different Lucide geometries. Risk Family segments stay deliberately text-and-count based. This presentation contract changes no KPI, count, evidence, owner, score, recovery, export or workflow calculation.

### ICON-SYS-01.2 — Unified Risk KPI Scale & Legibility

The Unified Risk summary uses a compact, workspace-scoped legibility contract. Desktop cards use 30 px icon tiles with 17 px icons, 10.5 px labels, 20 px portfolio values, 21 px financial values and 9.5 px meta text. At 1200 px and below values reduce to 19/20 px with a 70 px minimum card height; below 620 px tiles reduce to 28/16 px and cards use a two-column 68 px layout, falling back to one column only below 360 px.

The seven semantic icon IDs, KPI values, case counts, financial separation, filters, worklist, detail selection and export behavior remain unchanged. The larger scale is implemented only through `.inventory-risk-summary` custom properties and does not alter global icon sizes, SVG geometry, Manifest or Sprite contents.

### EX-UX-01.2 — Excess Decision Core & Risk-Workbench Alignment

The Excess workspace uses a compact page header, a one-row desktop filter contract and exactly four Summary items: Net Addressable, Excess Cases, Prioritization and Addressability. Search, Plant / Profit Center and Program / Group reuse the shared controls; Owner and Priority are Excess-only presentation filters. Category and row limit remain available to other views but are neither visible nor applied on Excess.

The operational workspace uses an approximately 54 / 46 Worklist-to-Detail split on desktop. The primary Worklist shows Material, Net Addressable with Gross as secondary evidence, Opportunity Score, Responsible, existing Priority and a compact Case affordance. Match Quality is not a primary column; only real relationship issues receive a restrained warning, with complete context retained in secondary detail.

The selected Case Decision Core remains above the Detail scroll and exposes exact Case identity, material and plant, existing priority, exact Inventory and Actions navigation, compact decision stats, up to three accepted prioritization reasons and the existing `next_step` / `decision_type`. Opportunity Score is explicitly presented as transparent prioritization rather than a probability.

Historical evidence is read only from the already completed Historical Runtime for the exact current `inventory_row_key`. Available or limited scalar metrics may be presented; missing, stale or ambiguous evidence renders an unavailable state and may open the existing Consumption History import flow. The view does not trigger historical calculation, scan Raw History, aggregate monthly data or invent Forecast evidence.

Scenarios and assumptions, Evidence and limitations, Data and Relationship Quality, Owner and Action Context, Pilot Review and Technical Provenance remain available through closed-by-default disclosures. The page projection is presentation-only and does not alter Excess formulas, Opportunity Scores, scenarios, Recovery, Data Quality, Actions, Pilot Reviews, Runtime state, Registry records or Package revisions.

### EX-UX-01.3 — Excess Decision Narrative & Action Options

The selected Excess Case now presents one deterministic decision narrative. Outside the internal Detail scroll, the compact Case header contains Category, Priority, the existing session-only Action status, Case identity, exact Inventory and Actions navigation and short values for Net Addressable, Opportunity Score, Owner and Priority. Inside the scroll, the visible sequence is: Why Prioritized / Next Review Step / Cause Hypothesis / Decision Readiness and Limits, then Gross-to-Net Value Bridge, Historical Evidence, Prioritization and Operational Evidence, Checkable Action Options and a compact Work Context. Scenarios and assumptions, evidence records, relationship details, full technical Owner context, Pilot Review and provenance remain closed by default.

The Action Option contract is presentation-only: `{ optionCode, labelKey, status, isPrimary, evidence, missingEvidence, nextCheck, provenance }`. The authoritative `recommended_action` remains whole and is the primary checkable recommendation; it is never split heuristically and is not described as automatically optimal. Additional options can be projected only from existing structured scenarios, explicit decision results or concrete Purchase Order evidence. The internal statuses are `checkable`, `review_required`, `not_checkable` and `not_recommended`. A Purchase Order option distinguishes Package missing, loaded without an exact matching line, insufficient evidence and concrete Case evidence.

Decision Readiness uses the non-weighted, versioned rule `excess-decision-readiness-v2`:

| Result | Deterministic condition |
| --- | --- |
| Not decidable | Valid Case identity, finite Gross-to-Net basis or authoritative recommendation is missing or invalid. |
| Review required | The central basis exists, but Cause, Owner, exact Relationship assignment or primary-option checkability is missing. |
| Limited | A checkable path exists, but Historical Evidence is not fully available, `whyNotHigher`, limitations or other non-critical evidence gaps remain. |
| Decision ready | The primary path is evidence-based and checkable, with no critical or non-critical open decision limit. |

Readiness exposes existing evidence, missing evidence, decision limits, `whyNotHigher` and the next data or review step. It is not a probability or a new analytical score.

The Value Narrative preserves numerical `0` as an available value and distinguishes it from missing, empty, non-finite or otherwise invalid input, which is shown as Not available. It presents Inventory Value, Gross Excess, overlap deductions, Net Addressable and remaining Inventory from existing Case fields without changing formulas. Net Addressable is explicitly an identified potential, not Expected Recovery Value, an approved amount, realized cash, Working-Capital Recognition or P&L impact.

Historical Evidence remains exact-row and read-only. It differentiates Package missing, loaded without an exact relationship, not calculated, limited, insufficient, available and Runtime error. Three-month and twelve-month consumption, average monthly consumption, trend, run-out and completeness come only from the completed current Historical Runtime. A chart is rendered only from canonical Runtime monthly buckets; the presentation does not reconstruct, interpolate or forecast a time series.

Current limitations remain explicit: Action status and Pilot Review are session-only and separate; Purchase Order options cannot be checkable without concrete Case-level PO evidence; History can remain unavailable without an exact completed Runtime result; and the MVP has no persistence, approval workflow, Expected or realized Recovery, SAP live integration, predictive recommendation or customer-validated action optimization.

### EX-UX-01.3.1 — Decision Contract, Unit Context & Acceptance Evidence Closure

The accepted Excess Decision Narrative now has a matching presentation contract in `DATA_CONTRACT.md`. Cause Hypothesis, versioned Decision Readiness, evidence-bound Action Options, differentiated Historical Evidence, null-safe Gross-to-Net Value Narrative and session-only Work Context remain one deterministic read-only projection owned by the Excess Decision Workspace Model.

Historical quantities now show the canonical Historical Runtime unit. The UI distinguishes an available unit, a missing unit and conflicting units; it preserves a calculated zero with its unit and does not merge conflicting monthly buckets. Inventory Coverage remains a time metric. No unit is guessed, converted or substituted with a currency.

Purchase Order communication follows the productive capability boundary. Concrete or partial PO evidence may come from fields already present on the current Inventory Case and names that row-level source in provenance. The registered `purchase_orders` type remains contract-only: there is no Builder, productive Package import, upload choice or PO import CTA. A test fixture or Registry-only record cannot imply product availability.

The primary Recommendation remains fully visible and authoritative. Secondary structured options retain their status in compact native disclosures and expose evidence, gaps, next check and provenance only when opened. The visible Work Context no longer repeats Action status, Owner and Owner function already shown in the fixed Case header; it adds decision type, Owner source, assignment confidence and the session-only boundary.

This closure does not change Excess, Recovery, Opportunity Score, Scenario or Historical formulas, Action or Pilot Review lifecycle, Registry semantics, Package revisions, upload, mapping or export behavior. It adds no PO optimization, Forecast, Expected Recovery Value, financial Recognition, execution workflow, persistence or common Inventory Risks cockpit.

### EX-UX-01.4 — Excess Decision Visual Compression

The Excess Detail scroll now contains exactly four decision visual types: a Gross-to-Net Value Bridge, a canonical monthly consumption SVG, Opportunity Score contribution bars and a Decision Readiness Matrix. Existing Action Options remain the operational follow-up and use the already accepted open-primary / compact-secondary disclosure pattern.

The Value Bridge keeps Inventory Value and remaining Inventory as Case context. Its only mathematical sequence is `Gross Excess - overlap / deductions = Net Addressable`. Every displayed amount comes from `valueNarrative.fields`; a real zero remains visible and unavailable values remain unavailable. Net Addressable remains identified potential only, with an explicit statement that it is not expected, approved or realized value.

The Historical visual uses at most the last twelve actual `historicalEvidence.monthlyBuckets`, sorted chronologically for display. It draws straight SVG segments, includes a zero baseline, preserves negative net consumption and shows Unit Context plus existing partial-period provenance. It never reconstructs buckets from 3M / 12M aggregates, invents missing months or adds Forecast or demand-plan styling. Zero buckets, one-bucket and no-bucket states remain truthful and readable.

Score contribution bars display each existing `opportunity_score_components` contribution against the corresponding immutable maximum exposed by the Opportunity Score Engine (`35 / 20 / 20 / 15 / 12`). Bar width is `component contribution / component maximum`; the total remains the existing `x / 100` score. This visualization neither recalculates components nor changes weights and remains explicitly a prioritization, not a probability.

The Readiness Matrix renders the existing `decisionReadiness` projection only. It groups `existingEvidence` under Available and combines `missingEvidence`, `decisionLimits` and `whyNotHigher` under Open / limited, with at most four direct items per column and a native Further evidence disclosure for the remainder. Status, next check and policy version remain unchanged. Text accompanies every CSS status symbol, figures include captions and accessible SVG descriptions, numeric values remain readable outside graphical marks, and Light / Dark Mode plus reduced-motion preferences are supported.

This work block adds no Portfolio chart, donut, radar, Forecast, AI score, success probability, Expected Recovery Value, Cash, Working-Capital Recognition or P&L visualization. It does not change Excess, Recovery, Historical, Readiness, Action Option, Pilot Review, Registry, Package revision, upload, mapping or export logic.

### EX-UX-01.5 — Visual Hierarchy, Readability & Screenshot Closure

The Excess page presents four equal Summary metrics for identified Net Addressable potential, Case count, average Opportunity Score and the Gross-to-Net ratio. The reset control is visible only while an Excess-local filter is active. The Worklist uses stable business columns, aligned monetary and score values, compact pagination and one clear Case action; the existing Case set, sorting and page logic remain unchanged.

The bounded desktop workspace fills the available viewport and gives Worklist and Detail independent scroll ownership. EX-UX-01.5 historically linked Decision, Value, History, Prioritization and Actions through a sticky local guide; IR-DETAIL-UX-01 supersedes that interaction with the shared tab surface below. The Next Review Step is the primary prompt, while causes, readiness limits, context and additional historical evidence use quieter supporting surfaces or disclosures.

The value presentation explicitly reads Gross Excess minus deductions or overlap equals Net Addressable. Inventory Value and remaining Inventory stay contextual and are not part of that equation. This closure is presentation-only: it does not change calculations, scores, Runtime evidence, Action Options, Pilot Reviews, upload, mapping, export, Registry or Package revisions.

### EX-UX-01.6 — Interaction, Semantic Color & Density Closure

EX-UX-01.6 established the five-part Decision, Value, History, Prioritization and Actions information architecture. Its historical anchor and local-scroll interaction is replaced by the true tab contract in IR-DETAIL-UX-01. Presentation state remains separate from route, filter, Case and analytical state.

Display-level normalization suppresses exact repeated next-step and cause/readiness statements without deleting or modifying accepted projection data. The Value Bridge is a textual Gross-to-Net reconciliation rather than a success-like progress visualization. Historical empty states, Operational Context and the primary Action Option are compact, evidence remains available in native disclosures and unavailable or not-checkable states use neutral status treatment.

At desktop widths above `1240px`, the Excess workspace owns the available viewport and gives Worklist and Detail independent internal scrolling without body scroll. Narrower widths keep natural page flow and responsive stacking. Summary metrics use a consistent `82px` height, Worklist values remain readable at accepted business widths and German presentation terms use Überbestand-specific wording. Calculations, scoring, accepted fields, upload, mapping, export, Registry and Package revisions are unchanged.

### IR-DETAIL-UX-01 — Shared Excess Decision Surface

The current Excess detail interaction supersedes the earlier anchor navigation. Standalone Excess and the embedded Excess & Demand family detail now render the same Decision Surface with five accessible tabs: Decision, Value Logic, History, Prioritization and Action Paths. One linked panel is visible at a time; click and standard Arrow/Home/End keyboard interaction keep selection, focus and visible content synchronized. The active tab persists only for the same exact case and resets to Decision when the case changes.

The Decision Surface responds to its actual panel width through CSS container queries. This keeps the same accepted components legible in the standalone workspace, the Unified Inventory Risks split pane and narrow layouts without deriving composition from the browser viewport alone. Decision text remains at least 12 px, the Gross-to-Net equation remains readable, History and Score retain their accepted evidence, and Action Options remain structured decision paths rather than an unformatted text list.

This is a presentation-only composition. It does not change Excess or Recovery values, Gross-to-Net order, Opportunity Score components or maxima, Decision Readiness, Historical aggregation, Action Option status, recommendation text, Case IDs, selection semantics, upload, mapping, Data Quality, export, Registry records or Package revisions.

IR-DETAIL-UX-01.1 completes the embedded visual contract. Next Review Step and Decision Readiness no longer share a stretched grid row, Readiness is presented as one flatter evidence surface, and Supporting Signals plus Score contributions use the same component treatment in both hosts. Prioritization stacks Score and structured Operational Context at medium surface widths and splits only from `760px`. Missing Consumption History remains explicitly unavailable and offers the precise “Verbrauchshistorie importieren” / “Import consumption history” action; it is never interpreted as zero consumption.

### IR-WORKSPACE-UX-02 — Risk Portfolio Density & Decision Focus

The Unified Inventory Risks workspace presents a compact page header with five existing Risk segments, a primary Search/Plant/Program filter row and a native Further Filters disclosure for Owner, Family/Subtype, Priority and Evidence Status. Reset remains unavailable until at least one existing filter is active. All controls retain their accepted filter keys and semantics.

The seven existing KPI cards are grouped into Portfolio and Financial Impact without changing their values. Net Addressable, Slow / Dead Inventory Exposure and Blocked / QI Value remain separate and are never combined into a Unified recovery total.

At desktop widths above `1240px`, the Risk Decision List and selected Case detail are equal-height, viewport-bound panes with exactly one internal Worklist scroll and one internal Detail scroll. At 1440 x 900 the workspace starts between approximately 430 and 470 px, exposes at least six complete cases and keeps Case identity, inline statistics, all five tabs and Next Step visible together. Narrower screens stack the panes and keep primary controls and paired KPI cards readable.

The compact status in the Next-Step header mirrors the existing Decision Readiness result. Why Prioritized and Cause Hypothesis are visually flattened only inside the embedded detail. Risk Cases, counts, financial values, scores, evidence, readiness rules, Action Options, Case IDs, filters, exports, Registry state, Package revisions and local `file://` operation remain unchanged.

### AP 16.4b.1 — Source-Bound Interpretation & History Readiness Closure

Consumption History interpretation policies are now bound to the exact physical source columns that were reviewed. Quantity, Posting Date and Period policies store `canonicalField`, `sourceIndex`, `sourceKey` and `sourceColumn`, so duplicate visible headers remain distinct and a confirmed policy cannot silently move to another uploaded column.

Policy reconciliation preserves reviewed Quantity, Date and Period settings only when the current mapping still points to the same physical source identity. Remapping invalidates stale section policies, clears section and top-level confirmation and creates a new interpretation proposal. Stale source-bound policies block Builder and Registry commit before a Package or revision is created.

The semantic-policy signature includes source identities, locale/scale choices, date and period formats, explicit scale factors and review-relevant confirmation state. The Package Import Service verifies that the Interpretation Service signature and Builder signature match before commit.

Explicit Quantity Scale is reviewable through a visible scale-factor control. Valid factors are restricted to the supported factors and invalid explicit factors block Apply. Excel serial dates require an explicit `1900` or `1904` date system; the unknown system is review-blocking, and the 1900 phantom leap day is rejected.

Interpretation Trust and History Readiness are separate. Trust describes whether the source interpretation can be applied; History Readiness is produced by the Semantics Engine from temporal, movement, unit and event evidence. Data Foundation therefore shows Consumption History availability separately from analytical readiness.

Analysis-as-of provenance is auditable. Inventory-snapshot-derived as-of dates require Inventory Package ID and Package Revision. `historyCoverageEnd` remains coverage evidence only and is never promoted to analysis-as-of automatically.

AP 16.4b.1 remains analytically isolated. It does not join Consumption History to Inventory, does not calculate rolling historical metrics, does not classify Slow / Dead Stock and does not change Recovery, Data Quality, Actions, Opportunity Score, scenarios or Pilot Reviews.

### AP 16.4c — Inventory Relationship & Historical Metrics

AP 16.4c connects the active Inventory Snapshot with the active semantically interpreted Consumption History Package to produce derived, auditable historical evidence. The relationship model first matches exact `material_id + plant`, then allows material-only fallback only when the assignment is unique. Plantless History is never copied across multiple plant-specific Inventory entities, and unmatched, ambiguous and invalid relationships remain explicit diagnostics. Leading-zero Material IDs remain unchanged.

Historical aggregation consumes only AP 16.4b semantic fields such as `net_consumption_quantity`, normalized date or period evidence, temporal precision, movement semantics, unit context, aggregation eligibility and duplicate semantics. Raw Posting Date, Raw Period, raw Movement Type and raw quantity sign are not reinterpreted. Unknown movements, future movements, exact-source duplicate ambiguity, business-duplicate ambiguity and incompatible units are excluded with provenance.

The metric windows are deterministic 3M, 6M and 12M calendar windows based on an explicit Analysis-as-of date. The browser or system date is not an analytical fallback. Day precision remains day evidence, month precision remains period evidence and an incomplete current month is flagged as partial.

Current derived metrics include Last Consumption, Net Consumption 3M/6M/12M, Average Monthly Consumption, Active Consumption Months, Movement Frequency, Intermittency, Months Since Last Consumption, Consumption Trend, History Coverage, History Completeness, Inventory Coverage and Estimated Run-out Months. Coverage and run-out are calculated only when quantity evidence and compatible unit evidence exist; financial value is never used as a quantity substitute.

Historical metrics are derived runtime evidence only. They do not mutate Registry records, do not create Package revisions and do not change authoritative Inventory analytical rows. Data Foundation shows historical relationship and metric status, Inventory Explorer can show `· CH` columns, and the Inventory export offers an explicit historical enriched variant. Recovery, Data Quality, Actions, Opportunity Score, Excess scenarios and Pilot Reviews remain unchanged.

Recommended next work block: AP 16.4d — Slow / Dead Stock Intelligence. AP 16.4c does not add predictive analytics.

### AP 16.4c.1 — Historical Runtime Orchestration & Data Foundation UX Closure

AP 16.4c.1 closes the boundary between historical analytics and presentation. Historical Metrics are now coordinated by an explicit runtime state with the statuses `not_calculated`, `calculating`, `available`, `limited`, `unavailable` and `error`. Runtime calculation is triggered by input lifecycle events such as Inventory changes, Consumption History import, semantic-policy changes and analysis-as-of changes, not by rendering Data Foundation, Overview, Inventory Explorer, filters, sorting, language, theme, currency or export-dialog presentation.

Runtime requests use a deterministic input signature. Completed and in-flight signatures are deduplicated, changed signatures invalidate stale metrics before recomputation, and generation checks prevent late stale completions from overwriting the current Runtime. Calculation remains synchronously executed after controlled browser scheduling, so large 10k Inventory / 50k History builds are bounded by tests but still run on the main thread in this local MVP.

Data Foundation separates Package presence, Package validity, Interpretation Trust, History Readiness and Historical Metrics availability. Missing Consumption History now shows one compact unavailable state instead of false zero match counts or false boolean values. Calculated zero and calculated false remain visible only after a successful calculation. Limited and invalid states are shown separately from fully available metrics.

The open Data Foundation hierarchy now presents at most four primary Historical Analysis values: Calculation Status, Exact / Fallback Match Rate, History Coverage and Analysis-as-of. Secondary relationship, coverage, exclusion and provenance details move into technical disclosure sections with bounded internal scrolling and responsive drawer behavior on mobile.

Original Data, Enriched Data and Historical Metrics exports remain separate. Historical export availability follows the current Runtime signature and does not trigger calculation. Recovery, Data Quality, Actions, Opportunity Score, Excess scenarios, Pilot Reviews, Slow / Dead placeholders and Raw Source remain analytically isolated.

Recommended next work block remains AP 16.4d — Slow / Dead Stock Intelligence.

### AP 16.4d.1 — Slow / Dead Condition & Evidence Engine

AP 16.4d.1 adds the first controlled Slow / Dead domain layer in the Recovery Chain: Detect -> Diagnose -> preparation of Decide. It creates auditable Slow / Dead Recovery Case Candidates from accepted Inventory entities and accepted Historical Metrics Runtime output. It does not add the final Slow / Dead page, worklist, detail view, export, financial recognition, workflow execution, persistence or predictive analytics.

The authoritative evaluation level is the Inventory entity created by the Inventory-to-Consumption-History relationship model. Multiple Inventory rows for the same entity produce one Case Candidate. Missing, stale, ambiguous or unit-unreliable evidence produces `insufficient_evidence`; it never becomes a false zero-risk, Slow-Moving or Dead-Stock conclusion.

The central policy is versioned as `slow-dead-condition-policy-v1` and keeps all thresholds explicit MVP hypotheses: 12 months minimum history coverage, 0.80 minimum completeness, 0.90 strong completeness, 6 months for Slow-Moving recency, 12 months for Non-Moving, 18 months for Dead Stock Candidate, two active months for recurring demand, 0.75 intermittency threshold and a mandatory independent demand, planning or lifecycle signal for Dead Stock Candidate.

Controlled condition classes are `insufficient_evidence`, `intermittent_expected`, `slow_moving_candidate`, `non_moving_candidate`, `dead_stock_candidate` and `strategic_reserve`. Precedence protects critical evidence gaps first, then explicit Strategic Reserve, then intermittent recurring demand, then Dead Stock Candidate, Non-Moving Candidate and Slow-Moving Candidate. Age alone cannot create a Dead Stock Candidate. Strategic Reserve is never inferred from age, value, coverage or zero movement; it requires explicit evidence.

Each result exposes positive evidence, counter evidence, limitation codes, missing evidence, categorical Evidence Strength, categorical Condition Confidence, evidence-backed Root-Cause candidates, Recovery Case Eligibility and Action Eligibility. Action Eligibility remains pre-decisional and uses only existing package types such as demand forecast, purchase orders, planning parameters, quality, finance and actions outcomes. Disposal is never automatically recommended or approved.

The derived Slow / Dead Case Runtime is isolated from Inventory KPIs, Recovery, Data Quality, existing Actions, Opportunity Score, scenarios, Pilot Reviews, Registry packages and exports. It creates no Package revision and does not mutate authoritative Inventory rows or Historical Metric rows.

### AP 16.4d.1.1 — Slow / Dead Runtime Boundary & Final Acceptance Closure

AP 16.4d.1.1 closes the technical acceptance boundary for the accepted Slow / Dead Condition & Evidence Engine without adding the visible Slow / Dead page. The derived Runtime now exposes six explicit states: `not_calculated`, `calculating`, `available`, `limited`, `unavailable` and `error`.

Historical Runtime dependency states map explicitly into the Slow / Dead Runtime. Calculating History becomes `calculating`; missing, stale or unavailable History becomes `unavailable`; Historical Runtime errors become `error` with `errorSource: "historical_runtime"`; Slow / Dead Service exceptions become `error` with `errorSource: "slow_dead_runtime"`.

The adapter validates the current Historical input signature before building, deduplicates repeated completed signatures and clears stale Case results whenever the derived Runtime is calculating, unavailable or errored. A Slow / Dead failure cannot mutate Historical Runtime, cannot convert Historical Runtime into error and cannot prevent the accepted Data Foundation / Historical Metrics presentation from updating.

The existing text-based Action Cockpit `slow_dead` logic remains unchanged for current Actions, but it is not Condition truth and not Action Eligibility truth for AP 16.4d.2. The future Slow / Dead Recovery Case Page must consume the derived Recovery Case Runtime, its Condition & Evidence Engine result and its Action Eligibility contract.

Recommended Next Work Block: AP 16.4d.2 — Slow / Dead Recovery Case Page. Then AP 16.4d.3 — Pilot Calibration & Acceptance Closure.

### AP 16.4d.2 — Slow / Dead Recovery Case Page

AP 16.4d.2 turns the accepted Slow / Dead Runtime into a visible Recovery Case Workbench. The page replaces the former placeholder in the Slow / Dead Stock tab and consumes the authoritative path: Historical Metrics Runtime -> Slow / Dead Runtime State -> Slow / Dead Recovery Case Service -> entity-authoritative Recovery Cases.

The page shows a dedicated header, truthful Runtime-state banner, compact Portfolio Summary, controlled Condition filters, searchable/filterable Worklist, deterministic sorting and pagination, selected Case detail, positive and counter evidence, limitations, missing evidence, stronger-conclusion explanations, Root-Cause hypotheses, Recovery Case Eligibility, pre-decisional Action Eligibility, required Data Packages and Package/model provenance.

Inventory Exposure is shown as exposure only. It is not labelled or treated as Recovery Potential, Expected Recovery Value, cash release, working-capital release, P&L effect, recognized value or realized value. Missing exposure remains unavailable rather than false zero. Dead-Stock Candidate remains a candidate, not disposal, scrapping or write-down approval.

The page supports exact Inventory Explorer navigation by material identity and controlled navigation to existing Actions when a linked action exists. Navigation does not create Action rows, mutate Action status or write Registry Packages.

A dedicated Slow / Dead export writes one row per Recovery Case with evidence and provenance. It reuses the existing local Excel-compatible and CSV-for-Google-Sheets export path and preserves text identifiers such as leading-zero material numbers.

AP 16.4d.2 is presentation and export enablement only. It does not change Condition thresholds, Condition precedence, Historical Metrics formulas, Recovery, Data Quality, current Actions, Excess, Opportunity Scores, scenarios, Pilot Reviews, Registry state, Package revisions, SAP integration, persistence or financial Recognition.

Recommended Next Work Block: AP 16.4d.3 — Pilot Calibration & Acceptance Closure.

### AP 16.4d.3a — Slow / Dead Calibration Contract & Safety Fixture Foundation

AP 16.4d.3a establishes a controlled calibration foundation without changing product behavior. It adds the versioned `slow-dead-calibration-case-v1` contract, a direct read-only reference to productive Policy `slow-dead-condition-policy-v1`, a fixed `2026-08-25` reference date, manually authored synthetic Safety Fixtures and a deterministic Runner against the real existing Condition Engine.

NUM-CAL-MIG-01 retains that Fixture schema and every expected outcome while adding `slow-dead-calibration-numeric-boundary-v1`. The v2 Calibration Runner uses the productive Numeric Core for all 16 numeric Engine inputs, keeps zero distinct from Missing/Invalid/Ambiguous evidence and blocks positive agreement when no eligible Result Row exists.

The Fixture portfolio covers all six existing Conditions, immediately below/at/above the 6-, 12- and 18-month thresholds, explicit Strategic Reserve, recurring intermittent demand, independent Dead-signal presence/absence, insufficient History, low completeness, ambiguous relationships, unit conflict, project/one-time-demand context and numeric zero versus missing evidence. The twelve Safety Invariants preserve the existing non-definitive and protection boundaries; they do not add a new Condition or Action.

Synthetic Safety Fixtures are published-Policy contract examples. They are not Pilot observations, customer records, expert labels or Ground Truth. No Fixture is marked human-validated. Future expert labels require explicit reviewer provenance and belong to the human Pilot closure in `AP 16.4d.3c`.

The generated report uses the term **Synthetic Contract Agreement**. AP 16.4d.3a provides no Pilot Accuracy, Expert Agreement, Precision, Recall, F1, exposure weighting, sensitivity analysis or threshold recommendation. Productive thresholds, precedence, UI, Recovery Cases, Actions, Excess and Opportunity Score remain unchanged. `AP 16.4d.3b` owns future Calibration Metrics and Threshold Sensitivity; `AP 16.4d.3c` owns Human Pilot Review and Acceptance Closure.

### AP 16.4d.3b — Synthetic Calibration Metrics & OFAT Threshold Sensitivity

AP 16.4d.3b measures the accepted 30-fixture synthetic contract without changing product behavior. `slow-dead-calibration-metrics-v2` reports eligible/excluded Fixture Coverage, calculability status, Synthetic Contract Agreement, Synthetic Condition Agreement, Boundary Stability, Reason-Code coverage, Safety results and deterministic content fingerprints from Calibration Runner v2 Result Rows.

The versioned `slow-dead-threshold-sensitivity-plan-v1` executes exactly 17 controlled scenarios: the productive Baseline plus low/high OFAT alternatives for minimum History coverage, minimum completeness, strong completeness, Slow-Moving age, Non-Moving age, Dead-Candidate age, recurring-demand active months and intermittency. Every candidate is validated before the real productive Condition Engine evaluates it.

Sensitivity Runner v2 preserves that plan and all threshold values but delegates numeric normalization and eligibility to the shared Calibration Runner. It contains no permissive raw-number fallback and cannot treat an empty or wholly invalid basis as a successful analysis.

All ten immutable analysis Safety Guards run in every scenario. Condition migration is descriptive and is not automatically an error. A Guard violation marks a scenario analytically unsafe but cannot activate, recommend, rank, persist or promote it. No Conservative/Sensitive bundles, multi-parameter search, auto-tuning, Policy v2, exposure weighting or best-Policy field exists.

The generated Markdown, JSON and CSV artifacts contain synthetic contractual data only. They establish no Pilot Accuracy, Customer Accuracy, Expert Agreement, Precision, Recall or F1. Productive Policy v1, UI, `app.js`, Actions, Excess and Opportunity Score remain unchanged. There is explicitly **no Policy recommendation**; human Pilot Review remains the separately governed handover to `AP 16.4d.3c`.

### AP 16.4d.2.1 — Entity-Exact Navigation & Case Contract Closure

AP 16.4d.2.1 closes the accepted Slow / Dead page contract. Slow / Dead -> Inventory navigation now resolves targets by `inventory_row_keys`, then `inventory_entity_key`, then exact `material_id + plant`, with material-only fallback only when the target is unique. The temporary reveal state makes the exact target visible without becoming analytical filter state and without changing Inventory Summary or Export scope.

Slow / Dead -> Actions navigation uses the same entity-safe identity model. An Action linked to one Material/Plant combination must not mark another plant of the same material as linked, and missing targets show truthful feedback rather than opening an unrelated Action.

Inventory Exposure remains nullable in the Recovery Case contract. Missing or invalid `stock_value` is unavailable (`n. v.` / `n/a`), while an actual calculated zero remains `0`. Portfolio summaries expose available and unavailable exposure counts so unavailable exposure is not counted as a false calculated zero. Owner Context from existing action-owner logic and Inventory/Material-Master provenance is projected into Slow / Dead Cases as operational context only.

Slow / Dead export separates `Inventory Exposure` and `Currency`; it does not imply FX conversion and continues to write one row per Recovery Case with evidence and provenance.

### DF-UX-02 — Capability-Oriented Data Foundation

The Data Foundation remains a product capability surface, not a technical Package-status widget. Its collapsed summary now communicates direct source and capability states only: Inventory Data drives active Inventory Analysis, Material Master unlocks Context Enrichment and Consumption History unlocks Historical Analysis.

Visible aggregate counters such as Core Data Foundation and Optional Intelligence Sources are no longer part of the product summary because one count cannot safely represent imported, valid, trusted, ready and metrics-available states at the same time. Missing sources are shown once in the dependency tree, and dependent sections are hidden until their prerequisite source is present and valid enough to support them.

The expanded Data Foundation separates Package presence, Package validity, Interpretation Trust, History Readiness, Relationship state and Historical Metrics state. Material Master Relationship remains part of Context Enrichment. Inventory-to-History Relationship remains separate from Historical Metrics. Available Historical Analysis shows at most four primary values, with match, coverage, exclusion, provenance and Package details kept secondary under Technical Details.

The drawer has a clear title, Close action, scrim and bounded scroll owner. Opening, closing, resizing or scrolling it is presentation-only and must not request Historical Runtime builds, mutate the Registry, create Package revisions or change analytical calculations.

AP 16.4d remains the next analytical block and is not implemented by DF-UX-02.

### DF-UX-02.1 — Data Foundation Visual Hierarchy & Data Quality Header Closure

DF-UX-02.1 closes the visual hierarchy of the existing Data Foundation without changing analytical state. The collapsed control now shows one prioritized primary statement and one secondary exception statement, for example active Inventory Analysis plus missing extension count or review-source count. Full `sourceStates` remain available inside the open Data Foundation and Technical Details.

The open Data Foundation uses three source-row variants: `compact-active` for active sources, `actionable-missing` for missing optional extensions and `diagnostic` for invalid, limited or review-required sources. Missing Material Master and Consumption History rows use short role descriptions plus Import actions, without redundant visible "Not Imported" labels beside those actions.

Card nesting is reduced so the open surface owns the main border, radius and shadow. Technical Details is a muted secondary disclosure, and the text Close button is replaced with an accessible icon-only X control. Desktop behavior is a non-modal anchored Popover without a scrim. Mobile behavior remains a modal Bottom Drawer with scrim, focus containment and body-scroll locking.

The Data Quality header now combines title, source and dataset metadata into one compact two-line block. Only the current source label, such as Sample Data or the uploaded filename, is shown as a badge. Row and column counts are inline muted metadata, and the redundant Data Loaded chip is removed from the Data Quality header.

All DF-UX-02.1 changes are presentation-only. Opening, closing, scrolling and responsive mode changes do not trigger Historical Runtime builds, Registry mutation, Package revision changes or analytical recalculation.

### AP 16.4b — Temporal, Movement & Unit Semantics

Consumption History now has a deterministic interpretation layer before future historical aggregation. The Mapping Assistant shows package-specific History Interpretation evidence for Consumption History uploads, including quantity locale/scale, Posting Date format, Period format and optional analysis-as-of date review.

The temporal contract parses only controlled formats: ISO date, German date, explicitly selected US date, YYYYMMDD, Excel serial, YYYY-MM, YYYYMM and MM/YYYY periods. Ambiguous slash dates are not guessed in auto mode. Date-only values are normalized as calendar strings and do not shift through time zones. When Posting Date and Period are both mapped, Posting Date drives the row-level temporal reference and conflicts are diagnosed.

The analysis-as-of date must be explicit. It can be unavailable, inventory-snapshot-owned or user-confirmed; the browser's current date is never used as an analytical reference. Future movements are diagnosed only when an explicit as-of date exists.

Movement Type semantics use a versioned MVP rule set. `261` is classified as consumption, `262` as reversal and unknown Movement Types remain `unknown`. Negative quantity alone never determines movement semantics. Each row separates signed source quantity, absolute quantity and net-consumption quantity.

Units are normalized as conservative tokens only. ObsoliQ does not convert units, does not aggregate unlike units and diagnoses missing or multiple units per entity. Consumption History rows now carry separate `entity_key`, `temporal_reference_key`, `event_identity_key` and `unit_context_key`, plus duplicate semantics and deterministic History Readiness metadata.

AP 16.4b remains analytically isolated. It does not join Consumption History to Inventory, does not calculate 3M/6M/12M metrics, does not set last-consumption dates on Inventory, and does not change Recovery, Data Quality, Actions, Opportunity Score, scenarios or Pilot Reviews. AP 16.4c is the next block for Inventory Relationship & Historical Metrics.

### AP 16.4a — Consumption History Contract & Builder

ObsoliQ now accepts Consumption History as a separate optional intelligence Data Package. This package captures historical consumption evidence without changing current Inventory Snapshot analytics.

The current AP 16.4a scope is intentionally narrow:

- users can select Consumption History from the existing upload package selector;
- the Mapping Assistant supports package-specific Consumption History fields;
- a valid package requires `material_id`, `consumption_quantity` and either `posting_date` or `period`;
- material, plant, document and item identifiers remain text so leading zeroes are preserved;
- posting dates and periods remain raw source values and are not interpreted into time buckets;
- quantities and values use the existing localized numeric parser, with zero accepted and negative quantities retained with diagnostics;
- units are preserved as source evidence and are not converted;
- exact duplicate rows are retained and diagnosed;
- the package is visible in Data Foundation as an optional intelligence source.

Consumption History is not yet used for slow-moving or dead-stock classification, Recovery calculations, Opportunity Score, Data Quality Score, Action recommendations, Pilot Review logic, scenarios or exports. Those integrations belong to later AP 16.4 work blocks.

Next sequence:

- AP 16.4b - Temporal, Movement & Unit Semantics
- AP 16.4c - Inventory Relationship & Historical Metrics
- AP 16.4d - Slow / Dead Stock Intelligence

### AP 16.3b.1.1 — Pilot Review Contract, Lifecycle UX & Navigation Acceptance Closure

Pilot Review creation is now protected by a strict Service-level contract. New Reviews require a complete Dataset, Case, Inventory row, Package, Package revision, Case fingerprint, fingerprint version, fingerprint payload and Opportunity Score model identity before any Review state is mutated. Package Revision is a positive integer and is not coerced from text.

Legacy Review records are not accepted through normal Review creation. They can enter only through explicit restore or migration behavior, remain historical, and do not count as current validation evidence.

Review IDs are generated by a monotonic Service-owned Review sequence. Dataset-specific Review deletion does not lower the sequence, snapshot includes the sequence, and restore derives a collision-safe next sequence from stored sequence data and existing Review IDs.

The Pilot Review UX separates current Reviews from historical stale Reviews. A stale reassessment warning appears only when no current Review exists for the current Case fingerprint. If a current Review exists and older stale Reviews also exist, the UI shows neutral history information instead of invalidating the current Review.

Relationship-to-Excess navigation now reveals the exact target Case through controlled Excess-only filter adjustment and target-page activation. Reveal behavior is not analytical filter state and does not distort filtered Summary or Export scope.

No Recovery, Data Quality, Action, Opportunity Score, scenario, Package identity or Package revision formulas changed in this closure.

### AP 16.2b.2 — Input Trust Layer: Schema Drift & Value Normalization

ObsoliQ now adds a bounded input-trust layer before analytical interpretation. The layer treats column order as non-semantic, keeps `sourceIndex` as physical identity only inside one uploaded file and stores both semantic and physical schema signatures for active imports.

The MVP profiles each source column, infers numeric locale evidence for German, English, Swiss and space-separated formats, detects magnitude suffixes such as `k`, `Tsd.`, `Mio.`, `Mrd.`, `mn`, `bn`, `million` and `billion`, and extracts controlled header hints such as `Stock Value (kEUR)` or `Amounts in 000 EUR`. Identifier fields remain text, including leading-zero Material IDs and values such as `10k`.

Input Trust distinguishes `trusted`, `review_required` and `blocked`. Ambiguous required financial values, double scaling and mixed currencies cannot silently enter KPI or Recovery calculations. Invalid demo-sample values remain visible as review/data-quality diagnostics so existing pilot sample behavior is preserved.

Raw Source remains immutable. Preview and Apply use the same normalization service, and committed Data Packages store compact Input Trust metadata with schema signatures, normalization summary, mapping evidence and diagnostic counts.

Current limitations: there is no persistent mapping profile, no cross-session schema history, no worksheet/header-row selection, no automatic schema versioning, no reliable source-currency FX conversion, no general unit conversion and no AI mapping.

### AP 16.2b.2.1 — Input Trust Review & Excess Integration Closure

AP 16.2b.2.1 closes the first operational Input Trust integration. Input Trust now runs before the final upload review decision. `review_required` and `blocked` states open the Mapping Assistant before Dataset commit, and blocked imports show exact, localized reasons such as double scaling or ambiguous financial interpretation.

The Mapping Assistant uses the trust-reviewed Mapping as the single visible and applied source of truth. It exposes trust state, detected locale, scale, currency, unit and mapping evidence, and lets the user explicitly confirm locale and scale assumptions. Trust-adjusted confidence is written back to the reviewed Mapping entries so visible confidence and applied Mapping stay aligned.

Committed runtime state stores only compact `inputTrustMetadata` and approved normalization policy. The full Input Trust result remains a pending-review artifact and is not stored in Dataset Meta or Package records after commit.

Data Quality now contains a compact Input Trust diagnostic disclosure. Row-level provenance exports use relationship and enrichment provenance owned by the enrichment pipeline rather than compact relationship summaries. Inventory Explorer sorting over enriched Material Master columns changes the actual visible row order.

The Excess Stock page now builds one page model per render, separates portfolio context from the currently filtered summary, localizes technical score and relationship codes, and bounds the visible Excess worklist with pagination. Hidden data views are marked dirty after Dataset mutation and render when opened instead of being fully rebuilt immediately.

No Recovery formula, Data Quality Score formula, Action rule, Material Master match rule, fill-missing-only enrichment rule, Opportunity Score formula or scenario formula changed in this closure.

### AP 16.2b.2.2 — Applied Mapping & Normalization Integrity Gate

AP 16.2b.2.2 closes the analytical integrity boundary between Input Trust review and committed Inventory datasets. The trust-reviewed Mapping is now the authoritative applied Mapping for Dataset Builder, Dataset Meta, Package Mapping, Preview, Apply, downstream Recovery and exports.

Mapping roles are explicit:

- proposed Mapping: automatic proposal before Input Trust review
- reviewed Mapping: trust-adjusted Mapping shown in the Mapping Assistant
- approved Mapping: reviewed Mapping after explicit review or trusted automatic acceptance
- applied Mapping: immutable committed Mapping used by the Dataset Builder and Package Registry

The same contract applies to value interpretation. Input Trust proposed policies are merged with explicit user overrides and review confirmation into one effective Normalization Policy. Empty override objects do not suppress meaningful proposed locale, scale, currency or physical source-column policies. Mapping Assistant controls initialize from the proposal, and confirmation applies to the policy that is committed.

Dataset Build Metadata, Dataset Meta, Package Mapping and Package Input Trust metadata store deterministic Mapping and Normalization Policy signatures. Mismatches block commit and trigger rollback rather than creating divergent analytical state.

The built-in sample dataset keeps its controlled trusted profile and still loads automatically. Customer uploads with blocked financial interpretation cannot use that sample bypass. No Recovery formula, Data Quality Score formula, Action rule, Owner Context rule, Opportunity Score formula, scenario formula, Raw Source contract, export behavior or package identity semantics changed in this gate.

### AP 16.2b.2.3 — Applied Policy Identity & Residual Acceptance Closure

AP 16.2b.2.3 makes the applied Normalization Policy source-bound. Reopening the Mapping Assistant now starts from the policy actually applied to the active Dataset, including its signature and committed Input Trust metadata. An unchanged Mapping review preserves the applied Mapping signature, Normalization Policy signature, normalized rows and Recovery values.

The policy lifecycle uses four explicit roles:

- `appliedNormalizationPolicy`: the committed policy used by the active Dataset
- `proposedNormalizationPolicies`: automatic Input Trust proposals for the current reviewed Mapping
- `normalizationPolicyOverrides`: explicit user changes made in the active review
- `effectiveNormalizationPolicy`: the final source-bound policy passed to Preview, Apply, Dataset Builder and Package commit

Every field-level policy now carries the canonical field and physical Source Identity: `canonicalField`, `sourceIndex`, `sourceColumn` and `sourceKey`. `sourceIndex` remains strict and non-coerced; `sourceKey` distinguishes duplicate headers; `sourceColumn` remains audit/display context and is not sufficient alone.

If a user remaps a canonical field to another physical source column, the previous policy and confirmation cannot move with it. The changed source receives a new Input Trust proposal, stale user overrides are ignored, and review confirmation is reset. Dataset and Package commits assert that each committed field policy still matches the exact reviewed Mapping entry.

This closure does not change analytical formulas. Recovery, Data Quality, Material Master enrichment, Owner Function rules, Action recommendations, Opportunity Score, scenarios, exports, Raw Source handling and file:// behavior remain in the existing MVP scope.

### AP 16.2b.2.4 — Confirmation Invalidation & Residual Export/UI Closure

AP 16.2b.2.4 freezes the Input Trust integrity boundary for source-bound confirmations. A physical Source Identity change now has precedence over any prior top-level or field-level user confirmation. The Mapping Assistant clears stale confirmation mode, timestamps and field confirmation immediately after remapping, reruns the new Input Trust assessment and requires a fresh confirmation whenever the new interpretation is review-required.

`confirmationMode = "trusted_automatic"` remains reserved for independently trusted system interpretation. `confirmationMode = "user_confirmed"` is stored only after the user confirms the currently mapped physical source through the Mapping Assistant. A fresh user confirmation can be committed for the new source, but the previous source's locale, scale, currency and timestamp are not carried forward.

The AP also closes residual export and UI correctness items. Action Export now includes complete Owner Context (`owner_function`, `owner_reference`, `owner_source`, `owner_assignment_confidence`, `confidence`). Provenance export uses authoritative row-level relationship and enrichment provenance, including complete conflict counts and conflict field keys, rather than bounded UI examples. Excess detail selection is reconciled to the current visible page, and `source_row_number` is labelled as Source Row / Quellzeile.

No analytical formula changed. Recovery, Data Quality, enrichment, Action, Opportunity Score, scenario logic, Raw Source handling, Preview / Apply parity, Undo / Reset, Package identity and file:// local behavior remain in the existing MVP scope.

### AP 16.3b — Excess Drilldown Stabilization & Pilot Review

AP 16.3b validates the Excess Intelligence page as a business decision surface. Deterministic pilot fixtures cover high-value exact matches, gross/net overlap, missing owner reference, ambiguous and unmatched Material Master relationships, enrichment conflicts, missing safety stock, MOQ without demand evidence, weak Data Quality evidence and absent Material Master packages.

The Opportunity Score remains the existing transparent 0-100 prioritization score with Financial Impact, Urgency, Actionability, Evidence Strength and Data Confidence components. AP 16.3b adds calibration tests that challenge ranking behavior without changing the score formula or model version. Financial value alone must not hide weak evidence, low actionability, gross/net overlap or critical relationship limitations.

The Excess drilldown now explains Why Prioritized and Why Not Higher, separates source facts, Material Master facts, calculated values, user assumptions and unavailable evidence, and shows Gross Excess, Net Addressable Excess and overlap as explicit case context. Scenario output is explicitly assumption-based and non-predictive. Purchase Order scenarios are unavailable without line-level PO details, and demand scenarios are unavailable without Consumption History or Demand Forecast evidence.

Pilot Review is a session-only feedback workflow for early customer validation. Users can record review disposition, score assessment, recommendation assessment, scenario assessment, missing evidence, required Data Packages, required SAP fields and notes. Pilot Review summary and export aggregate feedback for the current dataset only. Review feedback does not change Opportunity Scores, Recovery, Data Quality, Actions, Package revisions or Package identity.

Relationship and enrichment limitations are presented as read-only drilldown evidence and can link to the existing Excess case by stable case ID. The Action handoff remains the existing Action page; AP 16.3b does not create duplicate Actions or change Action recommendation, priority, confidence or status rules.

The recurring evidence expected to unblock the next product layer is Consumption History, followed by Demand Forecast and Purchase Order detail packages. AP 16.3b does not implement those packages.

### AP 16.3b.1 — Pilot Review Lifecycle & Package Acceptance Closure

AP 16.3b.1 closes the Pilot Review acceptance boundary without changing Recovery, Data Quality, Action, Opportunity Score or scenario formulas. The physical Pilot Review Service remains a required production module and is loaded before `app.js`; small View and Controller modules now own Pilot Review rendering and scoped click handling.

Each Pilot Review is bound to one exact review subject: `datasetId + caseId + caseFingerprint`. The fingerprint version is `excess-pilot-case-v1` and includes the active Inventory Package ID/revision, Opportunity Score model version, score components, gross/net/overlap values, recommendation, next step, priority, confidence, owner context, relationship status, evidence signature and scenario signature. Filters, pagination, language, theme and display currency are intentionally excluded from identity.

Reviews reconcile as `current`, `stale` or `orphaned`. Current reviews still match the active case fingerprint and Registry-owned package revision. Stale reviews remain traceable when the case still exists but evidence, score, recommendation, owner context, relationship state, scenario state, package revision or score model changed. Orphaned reviews remain session audit evidence when the reviewed case no longer exists.

Pilot Summary and the default Pilot Export use current reviews only. A separate historical export includes all lifecycle states and reason codes. Case detail never loads stale feedback as current validation; instead it shows a compact stale-review notice and requires a new Save for the current fingerprint.

Relationship issue links now open the exact Excess case by stable case ID. When an Excess-only column filter hides the target, a controlled target override reveals it and calculates the correct page. Missing targets do not open an unrelated first case.

Known limitations remain unchanged: Pilot Reviews are session-only, not persisted across browser sessions and not multi-user workflow state. AP 16.3b.1 does not add Consumption History, Snapshot History, SAP integration, realized-value tracking or predictive analytics.

## Target Customer

- German and DACH Mittelstand manufacturing companies
- SAP ECC or SAP S/4HANA users
- Supply Chain, Inventory Management, Procurement, Quality Management and Finance teams
- Users who know SAP, Excel and Power BI, but need a more action-oriented cockpit

## Current MVP Scope

Currently included:

- local HTML prototype
- sample data with 100+ material numbers
- deliberately imperfect built-in pilot sample dataset
- built-in sample cases for missing required, organizational, recovery and workflow data
- invalid numeric and negative recovery-input examples
- exact duplicate and duplicate-candidate examples
- inconsistent master-data examples
- an intentionally unknown source column for manual mapping demonstration
- resettable sample remediation scenarios
- file upload for `.xlsx`, `.csv` and `.tsv`
- inventory KPIs
- compact money formatting
- first rule-based Action Cockpit for top recovery opportunities
- table-first inventory explorer with filters and resizable table height
- interactive review and correction of source-to-canonical column mappings for uploaded files
- automatic mapping proposals based on the canonical field registry and alias resolution
- required-field validation, mapping conflict detection and sample-value preview in the Column Mapping Assistant
- deterministic Dataset Builder for normalized analytical inventory rows
- explicit separation between source data transformation, analytical enrichment and application workflow state
- session-only approved mapping state with reopening from Data Quality
- mapping-aware Inventory Explorer labels and filters based on the approved source-column mapping
- local Action status preservation during same-dataset remapping
- session-level Data Package Registry for active Inventory Snapshot ownership
- explicit package identity (`packageId`) separate from analytical dataset identity (`datasetId`)
- multiple Data Package records in one browser session, with only the active Inventory Snapshot driving the visible UI
- Package Type selection in the upload flow
- Material Master import as the first non-Inventory Data Package
- Material Master Mapping Assistant flow with `material_id` required and `plant` as optional granularity key
- Material Master validation for required mapping, missing material values, leading-zero preservation, duplicate keys and physical source identity
- compact Data Foundation status on the Overview page
- relationship readiness diagnostics between the active Inventory Snapshot and Material Master Package
- dedicated Excess Intelligence page with gross, net, overlap and scenario transparency
- deterministic Excess Opportunity Score with explainable components
- deterministic pilot fixture matrix and Opportunity Score calibration tests
- Excess drilldown with Why Prioritized, Why Not Higher, evidence classification and gross-to-net explanation
- session-only Excess Pilot Review with current/stale/orphaned lifecycle, summary and spreadsheet export
- read-only Relationship / Enrichment quality worklist for Excess decisions
- contextual owner reference, owner source and owner assignment confidence beside existing action owner rules
- enriched inventory export variants with optional Package / Match / Provenance columns
- registry transaction rollback so failed loads do not leave phantom packages
- hardened Mapping Assistant modal focus behavior and keyboard containment
- distinct mapped, kept-source, protected and conflict summary counts in the Mapping Assistant
- unknown-column preservation and protected derived-field collision handling
- Data Quality Score with field coverage, content quality checks, unresolved-issue penalties, Analysis / Pilot / Workflow Readiness, separate pilot-adjusted readiness score, classified source-column diagnostics, mapping transparency, recovery validation diagnostics and visible Recovery Input Normalization
- structured Data Quality issue registry for remediation worklists
- stable Data Quality issue identities and separate issue lifecycle decisions for review, acceptance, ignored and corrected states
- exact duplicate-row detection and duplicate business-key candidate detection without automatic deletion
- row-level missing and invalid value remediation through a session-only correction overlay
- universal manual missing-data remediation with source-column corrections and canonical-value overrides
- direct source-column mapping from Data Remediation for unmapped columns
- grouped missing-issue target-field selection for organization, recovery and workflow fields
- row-level, selected-row and all-affected missing-value resolution, including explicit Accept Missing
- corrected dataset exports that append manually created canonical fields without changing original source columns
- inconsistent master-data review for repeated material identifiers
- KPI impact preview, correction history, undo and reset behavior
- corrected dataset export and Data Quality issue-log export
- original versus corrected Data Quality Score comparison
- remediation-first Data Quality UX with one primary Score-plus-issue metric row, stable filter-result rendering, compact desktop issue worklist, mobile issue-card workflow, secondary readiness diagnostics and responsive issue Review Sheet
- smart internal scrolling for chart lists, wide tables and modals
- German and English UI localization for core navigation and settings
- inventory export for the current filtered view or all loaded rows, including direct no-demand source fields for recovery/action traceability
- settings for theme, language and currency

Detailed technical architecture is documented in [ARCHITECTURE.md](ARCHITECTURE.md).
The current source, canonical and Data Package contracts are documented in [DATA_CONTRACT.md](DATA_CONTRACT.md).

### AP 16.1.1.1 - Final Registry Acceptance Gate

AP 16.1.1.1 closes the current Registry transaction contract before generic Package import work may begin.

Current product principles:

- An explicitly supplied empty current-issue snapshot means no issues remain; it must not be treated as missing evaluation data.
- Package finalization requires a final Quality Summary produced after lifecycle and Ledger finalization. It may not recalculate Data Quality implicitly.
- Quality Summary values are validated by type and meaning; string or null coercion is not accepted.
- `rawScore` and `statusKey` are required in every Package Quality Summary because production summaries provide both fields.
- Issue counts in the Package Quality Summary are non-negative integers, and `qualityEvaluatedAt` is a non-empty valid timestamp.
- A `packageId` is permanently bound to one `datasetId` and one `packageType` during the browser-session lifetime.
- Every Relationship Key must be present in the Package's approved active Mapping and must prove a valid physical source-column identity through `sourceColumnMetadata` and `sourceIndex`.
- Test instrumentation is inactive outside the dedicated test harness.
- Remediation rollback remains responsible for UI restoration and error feedback even when rollback rendering fails.

Implemented closure items:

- final-issue Mapping resolution when the last issue disappears
- empty versus missing current-issue snapshot semantics
- mandatory explicit final Quality Summary input for Package commits
- strict non-coercing Quality Summary validation
- authoritative empty Issue Snapshot semantics for final Package summaries
- Package ownership enforcement in app and Registry module
- Relationship Keys proven against approved active Mapping and physical Source Identity
- best-effort Remediation rollback and remediation-specific failure feedback
- physical Registry and Registry regression tests, including a 10,000-row retention/transaction gate

AP 16.1.1 is considered ready for final review only when the structured tests and product smoke checks pass. AP 16.2a remains blocked until that review accepts this gate.

### AP 16.2a - Material Master Package Import

AP 16.2a adds a usable vertical slice for importing a second Data Package while preserving the active Inventory Snapshot as the only source of current dashboard analytics.

User flow:

- Click Upload file.
- Select Inventory Snapshot or Material Master.
- Choose a `.csv`, `.tsv` or `.xlsx` file.
- Review the package-specific Mapping proposal.
- Apply the Mapping.
- Material Master is validated and registered in the session-level Data Package Registry.
- Overview shows Data Package availability and relationship readiness.

Current product behavior:

- Inventory Snapshot uploads keep the existing flow and calculations.
- Material Master imports do not change Inventory KPIs, actions, filters or Data Quality scores.
- Material Master rows are stored in the Package record and exposed only through Package metadata/validation at this stage.
- Relationship readiness reports contract readiness only; it does not perform row-level matching.
- Failed Material Master imports leave no phantom Package and do not consume Package IDs.

### DF-UX-01 - Data Foundation Compact UX & Data Quality Final Polish

DF-UX-01 keeps all Registry, Mapping, Relationship, Dataset Builder, Recovery and Data Quality semantics unchanged while tightening the presentation layer.

Current product behavior:

- Overview shows a compact Data Foundation status in the page header rather than a large Data Packages dashboard card.
- Source availability is shown separately from relationship compatibility.
- The two Data Foundation sources are Inventory Data and Material Master.
- A missing Material Master is shown as "Not Imported" / "Nicht importiert", without zero-row counts or dash metadata.
- The Material Master import action reuses the existing Package Type upload flow.
- Relationship compatibility confirms only compatible keys and granularity; it does not claim row-level match rate or join completion.
- Technical package metadata such as Package ID, Dataset ID, source type, mapping signature and relationship keys is available only inside the technical-details disclosure.
- Data Foundation is presented on Overview only, not inside the Data Quality workspace.
- Data Quality keeps dataset row, column and source metadata in the Data Quality page header.
- The remediation workspace shows only compact task context, such as the demo issue chip, and does not duplicate dataset row/column metadata.
- The remediation filter area is compact: search stays primary and additional filters are grouped in a disclosure.
- Remediation result count is shown only when filters or search materially change the displayed worklist.
- Undo and Reset controls are hidden until an active remediation change exists.
- Export wording distinguishes remediation export from issue-log export.
- The Data Quality Score tile opens score explanation and is not a Quick Filter.

Not changed in DF-UX-01:

- Data Package Registry behavior
- Material Master import transaction behavior
- relationship-readiness rules
- Data Quality detection
- Data Quality Score formula
- Issue Ledger lifecycle
- Preview / Apply behavior
- Undo / Reset semantics
- upload, export, sample data and parsing logic

Not yet included:

- database
- user login
- SAP live integration
- SAP write-back
- persistent action tracking
- multi-user workflows
- full enterprise security
- automated owner assignment
- real workflow integration
- persisted customer-specific mapping profiles
- cross-session mapping persistence
- automatic schema versioning
- worksheet selection
- header-row selection
- SAP extract templates
- fuzzy semantic AI mapping
- persistent cross-session correction history
- reusable data-cleansing profiles
- SAP double-booking confirmation without transaction-level document fields
- cross-package analytics
- multi-dataset package selection UI
- Snapshot History
- Delta Detection

## Current Navigation

- Overview: Compact management KPIs, dataset context chips, recovery summary, compact Data Foundation status, paired chart cards and a full-width Recovery Worklist preview
- Inventory Explorer: Table-first full inventory view with filters, horizontal scrolling and visible-row export
- Excess Stock: Dedicated Excess Intelligence decision page with gross-to-net transparency, scoring, owner context, scenarios and Relationship / Enrichment quality
- Slow / Dead Stock: Slow-moving and dead-stock materials
- Blocked / Quality: Blocked and quality-inspection stock cases
- Purchase Orders: Open purchase orders linked to excess or no-demand situations
- Actions: Rule-based recovery action cockpit with root cause, recommended action, owner, priority, confidence and in-memory status
- Data Quality: Operational remediation workspace with a primary Data Quality Score plus issue-category metric row, desktop issue table, mobile issue cards, issue-specific remediation detail views and secondary technical diagnostics for Analysis, Pilot and Workflow readiness
- Reports: Exports and management reports
- Settings: Thresholds, recovery factors and currency settings

## Action Cockpit

The MVP now includes a first rule-based Action Cockpit. It translates inventory recovery cases into:

- root cause
- recommended action
- next step
- decision type
- owner function
- priority
- confidence
- status

The recommendations are generated by local MVP rules and are not automatically executed. There is no SAP write-back, no persistent workflow engine and no database-backed action tracking. Status changes are local/in-memory only for the current browser session.

The action rules and recommendations are MVP assumptions. They must be validated with real customer data and business stakeholders before production use.

## Data Quality

The Data Quality page is diagnostic, non-blocking and includes a session-only remediation workspace. It shows:

- a remediation-first information hierarchy focused on "what problems exist and what needs to be done"
- one primary operational metric row for Data Quality Score plus open issues, critical/high issues, missing data, invalid data and duplicates
- centered values and short labels inside the primary Score and issue metric tiles
- compact accessible Quick Filters for issue categories
- unified primary remediation filters for issue type, severity, status, field, material and search, with active filter chips
- targeted Remediation result rendering so filter changes update the worklist without rebuilding the full Data Quality page
- stable search focus and cursor behavior while typing
- a simplified issue worklist with severity, issue, affected rows, impact/context, status and action
- a right-side issue Review Sheet with focus trapping, focus return and sticky review actions
- issue-specific remediation detail views for exact duplicates, possible duplicates, missing values, invalid values and inconsistent master data
- compact exact-duplicate comparison focused on row selection, matching source values and KPI impact
- difference-first possible-duplicate review focused on shared business key and differing values
- Data Quality Score with explainable score breakdown
- Analysis Readiness, Dataset Pilot Capability and Workflow Data Foundation status as secondary diagnostics for basic analysis, early customer pilots and owner-driven action tracking
- field coverage for required, recommended, recovery and workflow fields
- content-level checks for material identifiers, inventory value validity, organizational assignment, recovery inputs and workflow assignment
- Data Quality Score as a data-quality metric that is not overwritten by Pilot Readiness caps
- a separate pilot-adjusted readiness score when Pilot Readiness limits early customer usability
- controlled unresolved-issue penalties so real open issues affect the Data Quality Score and resolved issues can improve it
- Recovery Input Normalization for detected recovery input cells, negative values treated as zero, invalid values treated as zero and empty values
- negative or invalid recovery source inputs treated as zero before internal recovery aggregation
- direct no-demand source-field handling through `direct_no_need_value`
- clearer recovery input diagnostics for detected fields, values present, numeric validity, rows with recovery signal and calculable recovery potential
- organizational diagnostics that distinguish "any identifier detected" from Profit Center, Plant and Division details
- source-column diagnostics that distinguish mapping candidates, preserved source context and true unknown columns
- mapping transparency between source columns and canonical ObsoliQ fields
- visible recovery calculation checks
- structured issue registry for exact duplicates, duplicate business-key candidates, missing values, invalid values and inconsistent master data with deterministic issue keys
- controlled data remediation with explicit user-applied corrections
- KPI and score preview before applying corrections, including pending source corrections, canonical overrides and mapping changes
- correction and issue-decision history, undo and reset controls
- corrected dataset and issue-log exports
- explicit source-versus-canonical correction architecture for missing-data resolution
- manual canonical overrides for missing values even when the uploaded file contains no matching source column
- direct Data Remediation handoff into the Column Mapping Assistant path for unmapped source columns
- partial-resolution tracking for grouped missing issues
- row-aware Accept Missing decisions that remain visible in the issue log
- issue lifecycle states that separate actual data corrections from Reviewed, Accepted Exception, Accepted Missing, Keep as Valid and Ignored decisions
- manual inconsistent master-data resolution with existing-value or manual-value entry for editable non-derived context fields

The Data Quality workspace is designed primarily as an operational remediation workspace. DQ-UX-01 keeps the existing horizontal navigation and business semantics unchanged while improving hierarchy, accessibility and interaction stability. Technical diagnostics remain available but are secondary and collapsed by default in a responsive disclosure grid: score explanation, field coverage, content quality, column mapping, mapping transparency, additional source columns, recovery input normalization, recovery calculation checks and technical dataset overview.

DQ-UX-02 closes the responsive Data Quality workspace design without adding analytical capability. Data Packages are restricted to the Overview view, while Data Quality starts directly with its task context: source label, row count, column count, sample-data issue notice, Health Card and remediation workspace. At desktop and standard laptop widths, the remediation Worklist remains a table and the Review Sheet remains a constrained right-side task sheet. Below the mobile workflow breakpoint, the Sections control replaces the full tab row, Quick Filters become a horizontal chip rail, search stays visible, additional remediation filters move into a compact disclosure, and the Worklist becomes issue cards that reuse the same issue IDs and review actions. Below mobile widths, the Review Sheet is a full-screen `100dvh` task view with safe-area padding and a reachable footer.

DQ-UX-02 also removes the outer card-around-cards appearance from Data Quality, reduces repeated status/package information, adds dynamic metadata to all nine diagnostic disclosures and consolidates the explicit responsive behavior around the 1200 / 900 / 720 px breakpoints. It preserves Data Quality Score logic, issue detection, lifecycle semantics, Mapping, Preview, Apply, Undo, Reset, exports, Dataset Builder, Recovery Engine and Data Package Registry behavior. After acceptance, the Data Quality design is considered frozen unless a concrete pilot usability defect appears.

DQ-UX-02.1 closes three local presentation defects without adding product capability. The Health Card is split into an upper Score/Readiness row and a full-width Pilot Readiness note, with Score number and percent rendered as one optical unit. The Demo Dataset notice uses a full-width information-row treatment instead of a content-width pill. Remediation text controls are isolated from radio and checkbox styling, and exact-duplicate decisions render as fully clickable, left-aligned option cards with action-oriented wording for arbitrary duplicate-group sizes. Fresh duplicate reviews still have no preselected decision. No business logic, Data Quality Score logic, lifecycle semantics, Preview/Apply behavior, Undo/Reset behavior, Dataset Builder behavior or Issue Ledger behavior changed.

DQ-UX-02.2 completes the Data Quality design closure without changing scoring, lifecycle or analytical semantics. The Review Sheet keeps the established Cancel-before-primary order while adding dynamic primary labels for decisions, corrections and master-data changes. Apply remains disabled until the existing draft validation reports a valid input. Impact text and actions now share one footer, with Severity shown as the same semantic badge beside the issue title instead of a standalone metadata card. Exact duplicate reviews are evidence-first: source-row evidence, compact row comparison, one consolidated duplicate guidance message, decision options, selected impact and technical details. Empty comparison shells are not rendered, and source-field comparison disclosure labels include the dynamic field count.

The Worklist now uses concrete missing-field titles for high-signal cases such as Material Number Missing and Stock Value Missing while preserving issue keys, issue types, sorting and filtering. The Pilot Readiness presentation is renamed to Dataset Pilot Capability, emphasizing the categorical dataset state and existing concrete blockers; the capped Pilot score remains available as diagnostics only. Workflow presentation is clarified as Workflow Data Foundation. Demo Mode explicitly describes the sample dataset as the subject of Score and Readiness evaluation.

DQ-UX-02.3 closes the primary Data Quality hierarchy and the Overview grid structure without changing analytical behavior. The primary Data Quality area now shows one operational row with the Data Quality Score and five issue categories: open issues, critical/high, missing data, invalid data and duplicates. Values and short labels are centered consistently. The Score tile is visually distinct, opens the existing score explanation and is not a worklist filter; the five issue tiles retain their existing Quick Filter values and behavior. Analysis Readiness, Dataset Pilot Capability, Workflow Data Foundation, Pilot blockers and the capped technical Pilot value remain available only as secondary diagnostics under Score explanation.

The Overview no longer renders the redundant four-item Insight Strip. The category and Profit Center chart cards use paired `category` and `profit` areas, and the Recovery preview uses the full-width `worklist` area. Chart-card heights are aligned so the fifth Profit Center row remains visible without an internal scrollbar for the standard five-row view. Overview KPIs, chart values, Recovery preview values and Data Quality baselines are intentionally unchanged. With DQ-UX-02.3 accepted, the Data Quality design is frozen unless a concrete pilot usability defect, browser regression or blocking accessibility issue is identified.

Unknown columns remain preserved in the Inventory Explorer and can be mapped by reopening the current Column Mapping Assistant. Preserved source context, such as demand-horizon columns that are useful but outside the current canonical model, is separated from actionable mapping candidates and true unknown columns. Uploads are not blocked by quality issues in the current local MVP.

Recovery Input Normalization is diagnostic and non-blocking. Original source columns remain preserved in the Inventory Explorer; the calculated recovery fields use normalized values only for internal calculation consistency.

The original uploaded source rows remain immutable. Duplicate source headers are preserved with deterministic source keys so values are not overwritten before mapping, remediation or export. Corrections are applied as an in-memory overlay and are split into explicit layers:

1. Original Raw Data
2. Source Corrections
3. Issue Decisions
4. Approved Column Mapping
5. Normalized Data
6. Canonical Overrides
7. Enrichment
8. Data Quality / Recovery / Actions

Source-column corrections are used when an existing uploaded source column is being corrected. Canonical overrides are used when a required ObsoliQ field has no original source column or when a missing field group needs a selected canonical target. Corrections are session-only and are not persisted to localStorage or a database.

Issue decisions are not data corrections. Reviewed means the user inspected an issue without resolving it. Accepted Exception and Accepted Missing document a deliberate business acceptance. Keep as Valid is reserved for legitimate duplicate candidates. Ignored keeps the issue visible as not actively worked. Corrected remains reserved for actual data changes or exclusions that resolve the issue.

Core product rule: No actionable Data Quality issue should become a dead end. Missing values must always offer either mapping, manual entry, explicit acceptance or row exclusion where applicable.

ObsoliQ distinguishes exact duplicate rows from duplicate business-key candidates. Exact duplicates match across all original source columns after whitespace normalization. Duplicate business-key candidates share currently available identifiers such as material, plant and profit center, but may still represent legitimate split positions, batches, stock types or snapshot differences. ObsoliQ does not automatically prove SAP double bookings from inventory snapshots. Possible duplicate booking analysis is only shown when transaction-level evidence is sufficient: at least one document identity, a document item or posting date, a movement type and a quantity or value field must be present. Without that evidence, inventory snapshot rows are not labeled as duplicate bookings.

### AP 14.3.1.6 - Remediation Lifecycle Integrity & Multi-Row Resolution Hardening

AP 14.3.1.6 stabilizes the current Data Quality remediation foundation without adding new issue types. The MVP now uses a unified session-only remediation action stack for data corrections, issue decisions and column-mapping changes. All actions that change analytical state participate in Undo and Reset within the current session.

The dataset keeps a baseline mapping that represents the mapping state originally accepted for the current upload. Remediation-driven mapping changes and full Column Mapping Assistant changes are tracked as reversible remediation actions on top of that baseline. Reset restores the baseline mapping while preserving the current source file, original raw rows and source headers.

The issue ledger is reconciled after dataset rebuilds so disappeared issues can be classified by resolution method. Mapping changes can resolve Data Quality issues, and those resolutions are visible in the issue ledger, remediation history and issue-log export. Historical resolved issues remain reviewable through read-only details backed by preserved ledger snapshots.

Grouped issue lifecycle now evaluates affected units more conservatively. Invalid numeric values, negative recovery inputs and invalid identifiers support partial resolution: fixing one row does not resolve the full group while other affected rows remain unresolved. Inconsistent master-data issues are marked corrected only when the current active data no longer violates the consistency rule, or when a user explicitly keeps the different values as valid.

Exact duplicate groups support more than two rows. A user can choose one active row to keep, which excludes all other exact copies as one grouped remediation action, or can keep all rows as valid separate positions. Possible duplicate candidates require an explicit decision; there is no default keep-all decision. Reviewed remains unresolved and continues to count as operational risk until a final correction, exclusion or accepted business decision is applied.

Core rule: A Data Quality issue may only be marked corrected when its underlying current-data condition is no longer violated or every affected unit has been explicitly resolved according to that issue type.

Core reversibility rule: All remediation actions that change analytical state, including column mappings, must be reversible within the current session.

### AP 14.3.1.7 - Lifecycle Precedence & Resolution Semantics Completion

AP 14.3.1.7 completes the current remediation lifecycle foundation. Current lifecycle state is derived from the current data condition plus the latest active and valid remediation action. Remediation action type no longer has a fixed semantic priority: a later true correction can supersede an earlier Review Later, Accepted Missing or Keep as Valid decision, while older actions remain visible in the session history.

Current data state remains authoritative. A remediation action can only mark an issue corrected when the underlying current-data condition has actually been removed or every affected unit has been resolved by a true correction or exclusion.

When multiple remediation actions exist for the same issue, the most recent active and valid action determines the current decision state; older actions remain in history but do not override newer decisions.

Grouped issues distinguish corrected, excluded, accepted and reviewed affected units. Mixed corrected and accepted groups are treated as Accepted Exceptions, not as fully corrected. Accepted Missing, Accepted Exception and Keep as Valid close operational issue work but do not count as corrected issues.

Source-column corrections become stale when their source column is remapped to a different canonical meaning. If the mapping is later restored to the original canonical field, stale corrections can become active again, unless the correction itself was explicitly undone.

Inconsistent master-data differences can be explicitly accepted as valid variations. This creates an Accepted Exception decision without changing source or canonical values.

Mapping changes record both affected issue keys and actually resolved issue keys based on before/after issue detection. The ledger marks a mapping-related issue corrected only when the mapping action actually resolved that issue.

Reopened issue timestamps are set only when an issue transitions from a closed state back to open or partially resolved. Normal rebuilds do not refresh the reopen timestamp.

Historical issue details are shown as an operational Original Problem -> Remediation -> Result summary, while technical issue keys, action IDs, source rows and field references remain available in technical details.

### Built-in Data Quality Demo Dataset

The built-in sample dataset deliberately contains a limited number of representative data-quality problems. Its purpose is to demonstrate detection, manual remediation, mapping correction, canonical overrides, duplicate review, KPI impact preview, correction history, undo/reset and corrected export.

These defects are actual values and gaps in `sample-data.js`. They are not synthetic issue cards generated by the UI. The majority of sample rows remain valid so the management and recovery views remain meaningful.

## KPI Definitions

- Total Inventory: total stock value from the loaded dataset
- Excess Stock: value classified as excess inventory
- Blocked / QI: blocked or quality-inspection stock value
- No Demand: inventory without visible current demand
- Unplanned: inventory without planning reference
- Recovery Potential: addressable recovery potential based on the current local MVP logic
- Recovery Potential Share: recovery potential as a percentage of total inventory
- Recovery Potential is capped at the stock value per row.
- The MVP uses a prioritized waterfall allocation: No Demand -> Unplanned -> Excess -> Blocked / QI.
- The calculated overlap field represents the amount removed by the stock-value cap.
- It does not prove the real economic overlap between source-system categories.
- Detailed overlap validation requires more granular quantity or stock-bucket data.

## Recovery Calculation Foundation

### Calculation Goal

ObsoliQ calculates an addressable recovery potential for each inventory position. The calculated `recovery_potential` must never be greater than the available `stock_value` of the same row.

### Input Risk Values

The MVP recovery calculation uses four source risk values:

- No Demand: direct source inputs such as `direct_no_need_value`, `no_need_conso_value` and `no_need_no_con_value`, consolidated internally into protected `no_need_value`
- Unplanned: `no_plan_value`
- Excess Stock: `excess_value`
- Blocked / Quality Inspection Stock: `bad_stock_value`

Negative, missing or non-interpretable values are treated as `0` for the recovery calculation.

`direct_no_need_value` is the importable source field for customer uploads that provide one direct "No Demand Value" / "Ohne Bedarf" column. The protected internal field `no_need_value` remains derived and is calculated as:

```text
no_need_value =
  max(0, direct_no_need_value)
  + max(0, no_need_conso_value)
  + max(0, no_need_no_con_value)
```

Invalid or non-interpretable source values are treated as `0` in the same way as negative values. This normalization is visible on the Data Quality page as a diagnostic, but it does not block upload, rendering or export. Original source columns remain preserved in the Inventory Explorer for traceability.

### Gross Recovery

`gross_recovery_potential` is calculated before the stock-value cap is applied:

```text
gross_recovery_potential =
  no_need_value
  + no_plan_value
  + excess_value
  + bad_stock_value
```

This gross value is not yet limited by the available `stock_value`.

### Prioritized Waterfall Allocation

The MVP uses this fixed Waterfall order:

1. No Demand
2. Unplanned
3. Excess Stock
4. Blocked / Quality Inspection Stock

Each category receives only the still-available remainder of the row's `stock_value`. Once the full `stock_value` has been allocated, later categories receive no additional net recovery value.

This order is an MVP assumption and must be validated later with real customer data and business users.

### Net Recovery Fields

| Field | Meaning |
|---|---|
| `net_no_need_value` | Recovery amount actually allocated from No Demand |
| `net_no_plan_value` | Recovery amount actually allocated from Unplanned |
| `net_excess_value` | Recovery amount actually allocated from Excess Stock |
| `net_bad_stock_value` | Recovery amount actually allocated from Blocked / QI |

The final row-level recovery potential is calculated as:

```text
recovery_potential =
  net_no_need_value
  + net_no_plan_value
  + net_excess_value
  + net_bad_stock_value
```

### Cap, Overlap and Remaining Inventory

The MVP calculates the cap-related transparency fields as:

```text
recovery_overlap_value =
  max(0, gross_recovery_potential - recovery_potential)

recovery_available_stock_value =
  max(0, stock_value - recovery_potential)

recovery_is_capped =
  gross_recovery_potential > stock_value
```

`recovery_overlap_value` is the amount removed by the stock-value cap and therefore not counted again as additional recovery. It is a calculated overlap / capped amount. It does not prove a real economic overlap in the source-system data.

### Important Limitation

> Important limitation:
> The waterfall allocation prevents the calculated recovery potential from exceeding the available inventory value. It does not prove whether the source-system categories economically overlap at quantity or stock-bucket level.

A reliable validation of real economic overlap requires more granular data, for example:

- material / plant / storage-location level
- quantities by stock type
- batch or lot information
- separated stock buckets
- assignment of demand to concrete stock quantities
- status and movement information

### Dataset Validation

After every sample-data load or file upload, the enriched dataset is validated against the recovery calculation invariants:

- `recovery_potential` is not negative.
- `recovery_potential` is not greater than `stock_value`.
- The sum of the four net fields equals `recovery_potential`.
- `recovery_overlap_value` equals gross recovery minus net recovery, capped at zero.
- `recovery_available_stock_value` equals stock value minus recovery, capped at zero.
- `recovery_is_capped` matches the calculation result.
- Raw risk values must not be negative after normalization.

Recovery validation errors are visible on the Data Quality page as diagnostics. Upload and rendering are not blocked by these technical checks. Console logging can remain as additional technical diagnostics for development.

### Scope Boundaries

AP 13.1 does not currently include:

- actual quantity-level deduplication between categories
- SAP stock-bucket reconstruction
- dynamically configurable Waterfall order
- recovery factors or probability discounts
- automatic financial realization forecasting
- SAP write-back
- historical recovery tracking

## Canonical Inventory Data Contract

ObsoliQ uses a central `inventoryFieldDefinitions` registry as the canonical contract for known inventory fields. The registry defines the stable technical field name, German and English labels, data type, requirement level, analysis group, importability and known source-column aliases.

### Requirement Levels

- `required`: necessary for the current core analysis
- `recommended`: not mandatory for loading, but important for reliable analysis or workflow assignment
- `optional`: additional context for filtering, classification or later analysis
- `derived`: calculated internally and not accepted as authoritative upload fields

The current required fields are:

- `material_id`
- `stock_value`

At least one organizational identifier such as `profit_center`, `plant` or `div` is recommended to make inventory positions operationally assignable.

Direct no-demand source columns are accepted through the importable canonical field `direct_no_need_value`. This field is mapped from aliases such as "No Demand Value", "No Need Value" and "Ohne Bedarf". The final `no_need_value` remains a protected derived field so uploaded data cannot overwrite the internal recovery calculation result.

Recovery and action exports include `direct_no_need_value`, `no_need_conso_value`, `no_need_no_con_value`, the derived `no_need_value` and `net_no_need_value` in that order. This keeps direct customer inputs and calculated no-demand recovery transparent in exported worklists.

### Analysis Groups

Known fields are assigned to one of these groups:

- `core`: row identity and inventory value
- `recovery`: source values used in risk and recovery logic
- `workflow`: planning, procurement and responsibility attributes
- `context`: descriptive and analytical context
- `derived`: internal classifications, recovery results and action fields

### Supported Data Types

The registry supports the technical types `text`, `number`, `boolean`, `date`, `currency` and `percentage`. Current numeric conversion is generated from the registry for fields of type `number`, `currency` or `percentage`.

Material identifiers are treated as text. Values such as `0000123` must remain strings so leading zeros are not removed by ObsoliQ during normalization.

### Alias Resolution

Known source-column names are resolved through aliases stored in the field registry. Each normalized alias may belong to only one canonical field. The application validates the registry for duplicate alias assignments during startup.

Unknown source columns remain available under a normalized technical name. This preserves customer-specific context without treating it as part of the canonical contract. In the Column Mapping Assistant, users can explicitly keep a column as a source column instead of mapping it to a canonical field.

### Source Column Identity

Source columns are identified by source position and original header, not by header text alone. This prevents data loss when uploaded CSV or Excel files contain duplicate headers such as `Safety Stock Target` and `Safety Stock Target`. Internally, duplicate headers receive deterministic source keys, while the original human-readable header remains available for mapping, Inventory Explorer display and exports.

Original exports keep original source labels for user traceability. Corrected exports use the same non-lossy source identity and append manually created canonical fields where needed.

### Interactive Column Mapping Assistant

AP 14.2.1 adds a session-only Column Mapping Assistant for uploaded files. It appears when required fields are missing, duplicate canonical mappings are detected, low-confidence required mappings occur, protected derived-field collisions are present or no recovery input field is mapped. Clean sample-data loading continues without forcing a mapping review.

The assistant supports:

- automatic source-to-canonical mapping proposals
- manual correction before normalization and enrichment
- required-field validation for `material_id` and `stock_value`
- duplicate mapping and protected-field visibility
- sample values for each source column
- explicit "keep as source column" behavior for unknown or intentionally unmapped columns
- distinct mapped, kept-source, protected, duplicate and blocking-error summary counts
- mapping-aware Inventory Explorer labels and filters after approval
- local Action status preservation when remapping the currently active dataset
- reopening the current dataset mapping from Data Quality

Approved mappings are stored only in memory on `currentDatasetMeta.columnMapping`. They are not persisted across browser sessions and do not modify `inventoryFieldDefinitions` or `normalizeMap`.

Blocking validation currently exists inside the Mapping Assistant before a mapping can be applied. The MVP does not yet enforce a production-grade schema contract after import and does not include enterprise upload governance.

### Protected Derived Fields

Derived fields are not importable. Uploaded columns whose normalized names match protected internal fields are retained with a `source_` prefix instead of overwriting ObsoliQ calculations.

Examples:

- uploaded `recovery_potential` becomes `source_recovery_potential`
- uploaded `status` becomes `source_status`
- uploaded `category` becomes `source_category`

Protected fields include the Recovery Calculation Foundation fields, classifications, action recommendations, priority, confidence and workflow status.

### Technical Row Key

The current MVP generates `inventory_row_key` hierarchically from the originally mapped `profit_center` field:

```text
material_id + profit_center
```

If `profit_center` is missing, the fallback is:

```text
material_id + row_number
```

Operational fallbacks from `plant` or `div` may still populate the visible and filterable `profit_center` field, but they do not become part of the technical row key.

This is an MVP technical key. A production SAP data contract will likely require a more granular key such as material, plant, storage location and, where relevant, batch or lot.

### Current Contract Boundary

The canonical registry defines known ObsoliQ fields but is not yet a validated SAP ECC or SAP S/4HANA extract contract. It does not yet include:

- saved customer-specific mapping profiles
- cross-session mapping persistence
- worksheet and header-row selection
- automatic schema versioning
- SAP extract templates
- fuzzy semantic AI mapping suggestions
- production-grade dataset schema enforcement after import
- enterprise upload governance
- a production Material / Plant / Storage Location / Batch key

## Architecture Stabilization

AP 15.1 removed proven-dead legacy infrastructure without changing product behavior. The old Split View was removed from HTML, CSS and JavaScript. Hidden legacy Data Quality filter controls were removed, while the visible Data Quality mapping-transparency filters continue to work through direct state updates.

The current MVP keeps one root `filterState`. Overview filters now live under `filterState.overview`; common, action, inventory, Data Quality and remediation filters remain explicitly scoped through helper functions for reading, updating, resetting and active-filter checks.

Rendering now has explicit view boundaries:

- `renderOverview()`
- `renderInventoryExplorer()`
- `renderActions()`
- `renderDataQuality()`
- `renderCurrentView()`
- `renderAfterPresentationChange()`
- `renderAfterDatasetChange()`

AP 15.1.1 completed the render-boundary cleanup. Dataset loading now suppresses intermediate rendering and performs one intentional final analytical render after accepted dataset state is complete. UI-only changes no longer use dataset-change rendering. Action workflow status updates use targeted rendering. Currency and language changes are treated as presentation updates rather than analytical dataset mutations.

Data Quality is decoupled from Overview filter state. Each view owns its base-data filtering semantics:

- Overview starts from `enrichedRows` and applies `filterState.overview`.
- Inventory Explorer starts from `enrichedRows` and applies common, inventory and column filters.
- Actions starts from actionable enriched rows and applies common, action and column filters.
- Data Quality starts from `dataQualityIssues` plus full active `enrichedRows` and applies only Data Quality / remediation filters.

Filter helper APIs now return and update predictable scoped state. Render ownership regression tests protect view-local rendering, presentation rendering, dataset rendering, filter independence and Data Quality / Overview decoupling. `renderAll()` has been removed.

### AP 15.2 — Controlled Modularization & Application Boundaries

AP 15.2 introduced the first physical domain boundaries without changing product behavior. The MVP now uses an explicit `window.ObsoliQ` namespace with file-compatible classic scripts so `prototype.html` remains directly executable through `file://` without a server, bundler or build command.

Phase 1 introduced:

- explicit ObsoliQ module namespace
- file-compatible classic-script modularization
- extracted Canonical Data Model in `js/core/canonical-model.js`
- extracted shared value-normalization utilities in `js/core/value-utils.js`
- extracted Recovery Engine in `js/recovery/recovery-engine.js`
- `app.js` retained as the application orchestrator
- no business behavior changes
- no new analytical capabilities
- strict one-source-of-truth rule for extracted logic
- DOM-independent core analytical modules
- module-contract regression tests

Core analytical logic must be independent of the UI. Data-model, calculation and validation engines receive data and return deterministic results without accessing DOM or view state.

Physical module boundaries should follow domain ownership rather than file-size targets.

The local prototype must remain directly executable without a mandatory server or build pipeline until deployment architecture is intentionally changed.

Future work should reduce global state further through controlled modularization rather than a large rewrite.

### AP 15.3 - Data Ingestion & Mapping Boundary Extraction

AP 15.3 extracts the Source -> Mapping portion of the architecture while preserving current product behavior and local file execution.

The MVP now has explicit physical boundaries for:

- source-column identity in `js/data/source-model.js`
- delimited and browser XLSX ingestion in `js/data/source-ingestion.js`
- deterministic source-to-canonical mapping in `js/mapping/mapping-engine.js`

The Source Model owns deterministic source metadata, including `originalHeader`, `sourceIndex`, duplicate position, duplicate count and stable source keys. Duplicate source headers are intentionally preserved. Physical source-column identity is defined by source position plus preserved source metadata, not by header text alone.

Delimited and XLSX parsing now terminate at a shared parsed-source dataset contract:

```text
{
  headers,
  rows,
  sourceColumnMetadata
}
```

The Mapping Engine depends on the Canonical Model and Source Model only. It does not depend on Mapping Assistant UI, remediation state, current language, rendering, filters or dataset metadata. It owns the explicit Mapping Policy for required fields, organization fields, workflow fields and recovery-input fields.

`app.js` still owns stateful orchestration:

- `loadDataset()`
- `rebuildDatasetFromCorrections()`
- upload continuation
- Mapping Assistant rendering and modal state
- remediation integration
- Data Quality
- rendering
- feedback

No new product capability was introduced in AP 15.3. Automatic proposals, mapping validation, approved mapping application, upload behavior, Data Quality, remediation and exports are intended to remain behavior-preserving.

Architecture principles added by AP 15.3:

- Source-system adapters must terminate at a stable source-data contract. Analytical engines must not care whether rows originated from Excel, CSV, SAP or another ERP source.
- Mapping logic must be deterministic and independent of Mapping Assistant UI, remediation state and application rendering.
- Physical source-column identity is defined by source position plus preserved source metadata, not header text alone.

### AP 15.3.1 - Code Health Hotfix & Safety Gate

AP 15.3.1 is a narrow correctness, security and scalability hotfix. It does not introduce new product functionality and does not change the business calculation model.

The hotfix covers:

- Overview filter UI/state synchronization when a previously selected filter value disappears from the active dataset.
- German and English translation integrity fixes for remediation labels, including corrected value and field type.
- Duplicate translation-key cleanup for authoritative `close` and `resetFilters` labels.
- Safe null handling in `defaultCorrectionDraft()`.
- Centralized spreadsheet formula-injection protection for exported customer-provided text.
- Preservation of real numeric export values, including negative numeric values.
- Debounced remediation preview recalculation during rapid typing.
- Cancellation of pending remediation previews when the modal closes, the active issue changes or a correction is applied.
- `localStorage` write hardening for restricted browser or `file://` environments.
- Conservative dead-code removal only after reference checks.
- Focused startup regression checks for the hotfix defects.

Architecture and security principles added by AP 15.3.1:

- Displayed filter state and analytical filter state must never diverge.
- Customer-provided spreadsheet text must be treated as untrusted during export and must not be able to execute as a spreadsheet formula.
- Expensive analytical previews must be scheduled deliberately rather than recalculated for every individual keystroke.

The current project state already contains AP 15.4 Dataset Builder work. AP 15.3.1 was applied as a safety hotfix on top of that state and did not expand AP 15.4 scope.

### AP 15.4 - Dataset Build & Analytical State Boundary

AP 15.4 establishes an explicit Dataset Builder module in `js/data/dataset-builder.js`. The builder owns the deterministic analytical transformation from source rows, approved mapping and active compatible data corrections to normalized and analytical inventory rows.

The Dataset Builder input contract is:

```text
buildInventoryDataset({
  sourceRows,
  headers,
  sourceColumnMetadata,
  columnMapping,
  corrections,
  options
})
```

`sourceRows` are treated as immutable original raw source rows. `corrections` must already be active and compatible; the builder does not decide lifecycle state such as active, undone, stale or superseded. `options.includeExcludedRows` can include excluded rows for diagnostic use, but the default active analytical dataset excludes approved row exclusions.

The Dataset Builder output contract is:

```text
{
  correctedSourceRows,
  normalizedRows,
  analyticalRows,
  recoveryValidationErrors,
  recoveryInputNormalizationDiagnostics,
  excludedSourceRows,
  buildMetadata
}
```

The build pipeline is:

```text
Original Raw Source
↓
Active Source Corrections
↓
Approved Mapping
↓
Canonical Overrides
↓
Canonical / Normalized Rows
↓
Analytical Enrichment
↓
Recovery
↓
Recovery Validation
```

The builder applies source corrections, canonical overrides and explicit row exclusions to cloned working rows only. It preserves `__sourceRowIndex`, duplicate source-column identity and the AP 13.2.1 technical row-key contract. The technical `inventory_row_key` uses material plus the originally mapped source `profit_center` when available, otherwise material plus source row number. Plant or division may populate visible operational `profit_center`, but they do not enter the technical key when no source profit center exists.

Analytical enrichment now lives in the Dataset Builder and includes numeric conversion, material fallback, operational organization fallback, missing `stock_value` fallback, no-demand aggregation, recovery waterfall calculation, recovery cap metadata and inventory category. Explicit zero `stock_value` remains valid and is not replaced by `stock_quantity * standard_price`.

Action decoration remains application-side in `app.js`. Root cause, recommended action, next step, decision type, owner function, priority, confidence and action status are not Dataset Builder responsibilities. Data Quality detection, issue decisions, the issue ledger, remediation actions, UI rendering, feedback and navigation also remain outside the builder.

Application state commit is separate from dataset build. `loadDataset()`, remediation rebuilds and remediation preview now consume Dataset Builder output and then commit or temporarily expose application state. Preview and Apply use the same analytical build engine. A preview may not commit or mutate the live dataset after its temporary scope ends.

Architecture principles added by AP 15.4:

- A dataset build is a deterministic function of source rows, approved mapping and active compatible data corrections. It must not depend on UI, workflow decisions or mutable application state.
- Preview and Apply must use the same analytical build engine. A preview may not commit or mutate the live dataset.
- Workflow decisions such as Reviewed, Accepted Missing, Accepted Exception and Keep as Valid are not data transformations and therefore remain outside the analytical dataset pipeline.
- Data Quality and Action logic consume analytical rows; they do not belong inside the deterministic dataset builder.

### AP 15.4.1 — Dataset Builder Integration & Safety Gate

AP 15.4.1 closes the Dataset Builder integration as a complete executable package. The physical module is `js/data/dataset-builder.js`, it is loaded by `prototype.html` before `app.js`, and `app.js` fails fast if `window.ObsoliQ.data.datasetBuilder` is unavailable.

The safety gate verifies:

- the Dataset Builder is a real browser-loaded module, not documentation-only logic;
- classic-script load order keeps Source Model, Source Ingestion, Mapping Engine, Recovery Engine and Dataset Builder available before application startup;
- the Dataset Builder receives source rows, headers, source-column metadata, approved mapping, compatible corrections and options explicitly;
- the Dataset Builder remains independent from DOM, rendering, translations, filters, navigation, modal state and workflow state;
- raw source rows, headers, source-column metadata, mapping and corrections are not mutated by a build;
- each active analytical correction belongs to an explicit `datasetId`;
- correction compatibility checks receive `datasetId`, source rows, headers, source metadata and mapping explicitly instead of inferring ownership from mutable globals;
- corrections from one dataset do not apply to another dataset with matching row numbers or headers;
- duplicate source headers remain physically distinguishable through source index and source-column identity;
- immutable `buildMetadata` is committed to `currentDatasetMeta.buildMetadata`;
- Preview and Apply use the same Dataset Builder path and preview does not mutate live application state;
- browser and `file://` startup have been validated for the local MVP.

`buildMetadata` currently includes builder version, pipeline version, build timestamp, source row count, active row count, excluded row count, normalized row count, analytical row count, correction count, mapping signature, source column count, applied correction IDs, excluded source row indexes and the include-excluded-rows flag. It does not include full row copies or UI state.

Current architecture boundary:

```text
Source Adapter
↓
Source Contract
↓
Mapping Engine
↓
Dataset Builder
↓
Application Commit
↓
Action Decoration
↓
Data Quality Detection
↓
Rendering
```

Workflow state remains separate:

```text
Issue Decisions
Remediation Actions
Issue Ledger
Action Status
```

Workflow decisions are not Dataset Builder transformations. They may change issue lifecycle, remediation state or displayed status, but they do not rewrite the deterministic analytical dataset unless a compatible data correction is explicitly applied.

Principles added by AP 15.4.1:

**Every analytical correction belongs to one explicit dataset identity. Row numbers and source-column names alone are not sufficient ownership boundaries.**

**Dataset compatibility checks must receive their source rows, headers, source metadata, mapping and dataset identity explicitly rather than infer them from mutable global state.**

**A Dataset Builder integration is accepted only when the physical module, script order, browser boot and file-based execution have been verified as a complete package.**

No product capability was added in AP 15.4.1. The MVP remains local, file-based and limited to one active business dataset.

### AP 15.4.2 — Dataset Identity Integrity & Package Acceptance Gate

AP 15.4.2 hardens dataset identity across the current single-active-dataset MVP before any Multi-Dataset foundation is introduced. It does not add a Data Package Registry, Snapshot History, database, SAP connector or new UI capability.

The work block verifies and enforces:

- first-call legacy correction migration, so compatible session-only corrections receive the current `datasetId` immediately and do not require a second compatibility call;
- one authoritative dataset identity resolution rule for remediation state: top-level `datasetId`, then payload `datasetId`, then the active dataset;
- equality between correction, remediation action and action payload dataset identity;
- equality between issue decision, remediation action and action payload dataset identity;
- mapping-change actions scoped to the dataset whose mapping changed;
- active remediation actions, issue decisions and mapping actions defaulting to the current dataset;
- remediation history entries carrying `datasetId` and visible history defaulting to the current dataset;
- Issue Ledger entries carrying `datasetId` plus a dataset-scoped internal key;
- identical issue keys coexisting across datasets without overwriting one another;
- Undo selecting the latest active remediation action for the current dataset only;
- pure correction compatibility checks that require an explicit dataset context;
- grouped corrections being atomic: all target source rows must exist before a correction is considered compatible;
- atomic Dataset Build and Dataset Meta commit, preventing a new build from mutating the previous dataset metadata object;
- nested `buildMetadata` immutability for applied correction IDs and excluded source row indexes;
- Preview versus committed Apply parity using the same Dataset Builder path;
- Preview live-state and Issue Ledger safety.

Principles added by AP 15.4.2:

**Every correction, issue decision, remediation action, mapping action, history entry and ledger entry belongs to exactly one dataset identity.**

**Issue keys are stable within a dataset; cross-dataset identity requires datasetId plus issueKey.**

**Pure compatibility functions may not silently read mutable application globals. Application adapters must supply explicit dataset context.**

**Grouped corrections are atomic: they may not be silently applied to only a subset of their target source rows.**

**A new dataset and its analytical build metadata must become active through one coherent state transition.**

### AP 15.4.2.1 — Explicit Context & Transactional Commit Closure Gate

AP 15.4.2.1 closes the remaining Dataset Builder and dataset-identity boundary gaps before any Multi-Dataset foundation begins. It does not add product functionality, a Data Package Registry, Snapshot History, SAP integration, persistence or new Data Quality issue types.

The closure gate enforces:

- `correctionCompatible(correction, explicitContext)` requires a complete explicit context with `datasetId`, source rows, headers, source-column metadata and approved column mapping;
- current-dataset compatibility is handled by separately named application adapters such as `datasetCorrectionContext()` and `correctionCompatibleForCurrentDataset()`;
- active compatible data-correction selection has an explicit domain function and a separate current-dataset wrapper;
- remediation action validity receives `datasetId` and correction context explicitly and does not switch back to the active UI dataset while evaluating another dataset;
- lifecycle helpers forward dataset identity and correction context through latest-action, resolution-record, status and progress evaluation;
- source rows, headers, source-column metadata, mapping, remediation reset intent, analytical build result and dataset metadata are prepared locally before any active state is changed;
- remediation reset is deferred until a new dataset has built successfully;
- raw rows, headers, source metadata, normalized rows, analytical rows, excluded rows, recovery validation, recovery diagnostics and dataset metadata become active through one coherent commit boundary;
- failed dataset preparation preserves the previous active dataset and remediation state;
- Preview is compared with the actual committed Apply state after the same correction has been applied through `createDataCorrection()`;
- Preview does not mutate live source state, analytical state, remediation actions, decisions, history or Issue Ledger state after its temporary scope ends;
- `buildMetadata` is immutable at the top level, and nested `appliedCorrectionIds` and `excludedSourceRowIndexes` arrays are protected against external mutation;
- the physical Dataset Builder module and `prototype.html` script order are verified as part of the package, not inferred from `app.js` alone.

Architecture principles added by AP 15.4.2.1:

**Pure domain compatibility functions may not obtain missing values from mutable application globals. Current-application convenience must be provided by a clearly named adapter.**

**Dataset loading is a prepare-then-commit process. No active source or analytical state may change before preparation succeeds.**

**Preview parity is proven only when preview output matches the actual committed application state after applying the same correction.**

**Runtime provenance such as build timestamps is distinct from deterministic analytical build output. Analytical rows, normalized rows, diagnostics and mapping signatures remain deterministic for the same inputs; `builtAt` is runtime provenance unless a fixed build timestamp is injected for tests.**

### AP 15.4.2.2 — Failure Propagation & Runtime Context Closure

AP 15.4.2.2 closes the remaining runtime-integrity defects before Multi-Dataset work may begin. It keeps the local single-active-dataset MVP scope and does not add product functionality, new KPIs, new Data Quality issue types, SAP integration, persistence, authentication or a Data Package Registry.

Runtime closure implemented in this block:

- every production `loadDataset()` caller inspects the boolean result;
- failed automatic uploads and file/text upload paths return an error status rather than a loaded status;
- failed mapped loads keep the Column Mapping Assistant open with its pending context and approved mapping available;
- Mapping Actions and remediation history are registered only after a mapped dataset has loaded successfully;
- success rendering and success feedback occur only after preparation, commit, analytical finalization and required rendering complete;
- commit and post-commit finalization failures restore the previous coherent dataset, remediation, filter, action-status and Issue Ledger state;
- dataset identity mismatch during preparation is a blocking invariant error rather than a non-blocking assertion;
- the unused current-dataset compatibility adapter was removed instead of being left as dead architecture code;
- no major new standalone startup self-test block was added to `app.js`.

The complete `DatasetRuntimeContext` contract is:

```text
{
  datasetId,
  correctionContext: { datasetId, sourceRows, headers, sourceColumnMetadata, columnMapping },
  normalizedRows,
  enrichedRows,
  corrections,
  decisions,
  remediationActions,
  excludedSourceRows,
  issueLedger?,
  diagnostics?,
  buildMetadata?
}
```

Lifecycle, progress and ledger evaluation now accept the explicit runtime context or exact sub-context they require. Current UI code may use the named current-dataset adapter, but non-current dataset evaluation must supply the rows, mapping, analytical state and remediation records belonging to that same dataset. `cloneIssueForLedger()` snapshots source values from `runtimeContext.correctionContext.sourceRows` and canonical values from `runtimeContext.normalizedRows`, not from whichever dataset is visible in the UI.

Validation performed for this block:

- `node --check` passed for `app.js` and all loaded core/data/mapping/recovery modules.
- `file://` browser validation passed with sample data, Inventory Explorer, Actions and Data Quality navigation and no JavaScript console errors.
- CSV upload, sample reload and inventory export were tested in the browser.
- Settings handlers for dark mode, English language and USD currency were tested without JavaScript errors.
- Browser validation used local Edge because the Playwright-managed Chromium binary was not installed.

Architecture principles added by AP 15.4.2.2:

**A successful parse is not a successful dataset load. Success may be reported only after preparation, commit, analytical finalization and required rendering complete.**

**A failed mapped load must not create workflow history or close the Mapping Assistant.**

**Dataset identity alone is not a complete runtime context. Lifecycle and ledger evaluation require the rows, mapping, analytical state and remediation records belonging to that same dataset.**

**Dataset transactions must restore the previous coherent runtime state when commit or post-commit finalization fails.**

The verified local package keeps `prototype.html` as a classic-script `file://` MVP. Dataset Builder loads before `app.js`, and `app.js` remains responsible for Action decoration, Data Quality detection, remediation lifecycle, Issue Ledger, rendering, feedback and navigation.

### AP 15.5 — Test Boundary & Production Bootstrap Separation

AP 15.5 separates runtime product startup from development regression validation and closes the remaining transaction rollback gaps before Multi-Dataset work may begin. It does not add product features, SAP integration, persistence, authentication, new KPIs, new Data Quality issue types or a Data Package Registry.

Runtime closure implemented in this block:

- failed dataset transactions restore both the internal `filterState` model and visible filter controls;
- valid filter options are rebuilt from the restored dataset before restored values are applied to controls;
- rollback rendering can run with `syncStateFromControls: false` so stale DOM controls do not overwrite restored state;
- dataset source, row, column and visible-count chips are synchronized from restored dataset metadata;
- Mapping Assistant Apply is transactional across dataset load, Mapping Action registration, Issue Ledger synchronization, rendering, modal completion and final feedback;
- intermediate dataset-load success feedback is suppressed during Mapping Apply;
- failed Mapping Apply finalization rolls back dataset, mapping action, history, ledger, rendering and modal state while keeping the Mapping Assistant usable;
- explicit `DatasetRuntimeContext` values must own their `issueLedger`;
- the current-dataset adapter rejects foreign Dataset IDs rather than relabeling the visible dataset;
- non-current runtime contexts must supply their own rows, mapping, remediation state, Issue Ledger, diagnostics and build metadata;
- initial sample-load failure feedback remains visible instead of being overwritten by header-status restoration;
- failed preparation restores the previous Dataset ID sequence.

The strict `DatasetRuntimeContext` contract is:

```text
{
  datasetId,
  correctionContext: { datasetId, sourceRows, headers, sourceColumnMetadata, columnMapping },
  normalizedRows,
  enrichedRows,
  corrections,
  decisions,
  remediationActions,
  excludedSourceRows,
  issueLedger,
  recoveryValidationErrors,
  recoveryInputNormalizationDiagnostics,
  buildMetadata
}
```

Test boundary implemented in this block:

- `tests/tests.html` provides a `file://`-compatible structured browser test runner;
- `tests/test-runner.js` records explicit PASS/FAIL results instead of relying on console-only assertions;
- `tests/test-helpers.js` loads the prototype in test mode through a same-origin `srcdoc` fixture;
- `tests/app-template.js` and `tests/app-frame.html` provide the local test fixture boundary without a server or bundler;
- `tests/legacy-app-self-tests.js` contains the migrated application self-tests that previously lived inside `app.js`;
- focused AP 15.5 tests cover bootstrap suppression, dataset rollback, Mapping Apply rollback, runtime-context isolation and legacy regression preservation;
- normal product startup no longer executes the full development test suite;
- `app.js` exposes a test-only bridge only when the dedicated harness sets `window.__OBSOLIQ_TEST_MODE__ === true` before `app.js` loads.

Architecture principles added by AP 15.5:

**Restoring application state requires restoring both the state model and the visible controls that can write back into that state.**

**A mapping change is successful only when dataset load, mapping-action registration, ledger reconciliation, rendering and modal completion succeed as one workflow transaction.**

**An explicit non-current `DatasetRuntimeContext` must never borrow rows, mapping, analytical state or ledger state from the currently visible dataset.**

**Production bootstrap and regression testing are separate execution paths. End users must not execute the full development test suite when opening the product.**

**Test failures must produce a structured failed test result rather than a console-only assertion.**

### AP 15.5.1 — Final Acceptance Closure

AP 15.5.1 closes the final acceptance gaps from AP 15.5 without adding product functionality or starting Multi-Dataset work.

Implemented closure items:

- late Mapping finalization failures now restore runtime state and rerender all restored analytical views;
- DOM-level regression coverage verifies Mapping `render`, `close` and `feedback` rollback stages;
- the rollback contract covers Overview KPIs, Recovery Share, category chart, Profit Center chart, Top-Recovery list, Actions, Inventory Explorer, Data Quality and dataset chips;
- the current-dataset runtime adapter rejects every foreign Dataset ID, including when no dataset is active;
- `syncDatasetUiFromMeta(datasetMeta)` renders dataset source, rows and columns from its explicit argument instead of silently reading global Dataset Meta;
- URL query parameters cannot activate test mode;
- test mode is activated only by the dedicated pre-bootstrap `window.__OBSOLIQ_TEST_MODE__ === true` harness flag;
- remediation self-test helpers are owned by `tests/legacy-app-self-tests.js`, not by product bootstrap;
- controlled fault-injection options are ignored outside test mode;
- the complete `tests/` package is included as physical files and verified through `file://`;
- structured test results are exposed through `window.__OBSOLIQ_TEST_RESULT__` and the legacy `window.__OBSOLIQ_TEST_RESULTS__` compatibility alias;
- browser validation confirmed product startup, query-parameter hardening, sample load, exports, CSV/TSV/XLSX upload, Mapping Assistant, Inventory Explorer, Actions, Data Quality, language, currency and dark mode;
- AP 15.5 is accepted for the local MVP package after AP 15.5.1 validation.

Validation status for AP 15.5.1:

- `node --check` passed for `app.js`, all loaded core/data/mapping/recovery modules and all test scripts;
- `tests/tests.html` passed under `file://` with structured result `passed`, 17 passed, 0 failed;
- a temporary injected failing test produced structured result `failed`, proving the test boundary fails explicitly;
- `prototype.html?obsoliqTestMode=1` still ran normal production bootstrap and did not expose the test bridge;
- production fault-injection properties were ignored by the product path;
- business KPI and Data Quality baselines remained unchanged.

Architecture principles added by AP 15.5.1:

**Rollback is complete only when both runtime state and all rendered analytical views represent the same restored dataset.**

**A function that accepts explicit Dataset Meta must render from that argument rather than silently read the globally active Dataset Meta.**

**Test mode is activated only by an explicit pre-bootstrap test flag supplied by the dedicated test harness. Product URLs may not enable internal test execution.**

## AP 16.1 - Multi-Dataset Foundation & Data Package Registry

AP 16.1 introduces a bounded, DOM-independent Data Package Registry as the foundation for future multi-source ingestion. The current visible product remains a single active Inventory Recovery Cockpit driven by one active `inventory_snapshot` package.

Principles added by AP 16.1:

**All enterprise inputs enter ObsoliQ as explicit Data Packages rather than package-specific global row arrays.**

**A Data Package owns one source contract, one mapping contract, one build state and one package identity.**

**Registering or updating a package participates in the same transaction as activating its analytical dataset.**

**The Registry stores package ownership and metadata; it does not perform analytical joins or UI rendering.**

**Package availability does not imply analytical capability. Cross-package intelligence is unlocked only by later engines with explicit relationship validation.**

Current AP 16.1 behavior:

- defines Data Package types for Inventory Snapshot, Material Master, Consumption History, Demand Forecast, Purchase Orders, Planning Parameters, Movements, Quality, Finance and Action Outcomes;
- registers the active Inventory Snapshot after successful sample load or upload;
- adds `packageId` and `packageType` to current Dataset Meta;
- keeps `packageId` stable during same-dataset remapping and remediation rebuilds;
- creates a new `packageId` for new inventory uploads;
- preserves previous Inventory Snapshot package records in the session Registry;
- stores source descriptor, source data, mapping, build metadata, compact quality summary, freshness and relationship-key metadata;
- restores the Registry together with dataset runtime state on failed loads and late Mapping rollback;
- keeps the Registry local, file-compatible and invisible in the production UI;
- adds dedicated Registry and Phase-0 regression tests.

### AP 16.1.1 — Registry Transaction & Contract Closure

AP 16.1.1 closes the Registry transaction contract before any additional package-ingestion UI is introduced.

Principles:

- **A Package revision represents one completed logical data operation, not an intermediate analytical rebuild.**
- **Package Quality Summary is written only after Issue Ledger and lifecycle finalization.**
- **A same-Package rebuild preserves the original import timestamp.**
- **Relationship Keys represent approved importable mappings, not proposals or retained source context.**
- **Remediation and Registry state participate in the same transaction.**

Current AP 16.1.1 behavior:

- finalizes Inventory Snapshot packages through one application-level Package revision boundary;
- defers Mapping Assistant Package updates until Mapping Action registration and Issue Ledger synchronization are complete;
- applies Correction, Decision, Undo, Reset and remediation Mapping changes through a shared rollback boundary;
- updates `qualitySummary` only from the final Data Quality and lifecycle state for that logical operation;
- keeps `importedAt` stable across same-Package rebuilds and uses separate `updatedAt`, `builtAt` and `qualityEvaluatedAt` timestamps;
- derives relationship keys only from approved, active, importable and non-protected canonical mappings;
- validates active Package type and build-metadata ownership after commits and restores;
- applies bounded session retention for inactive Inventory Snapshot packages while protecting the active Package;
- keeps the Registry session-only and invisible in the production UI.

Still not included:

- cross-package analytics
- package switching UI
- Snapshot History
- Delta Detection
- persistent Registry storage
- SAP connector
- database
- authentication
- Consumption History, Purchase Orders and additional operational package pages

### AP 16.2b — Inventory ↔ Material Master Enrichment

AP 16.2b turns Material Master from a registered package into visible product functionality. The active Inventory Snapshot can now be matched against the active valid Material Master package, and approved Material Master context can enrich missing Inventory context safely.

Visible MVP capability:

- Inventory and Material Master rows are matched by deterministic relationship keys.
- Exact Material + Plant matches are distinguished from controlled Material-only fallback.
- Unmatched, ambiguous and invalid-key Inventory rows are counted as relationship diagnostics.
- Data Foundation shows a real row-level Match Rate after enrichment runs.
- Inventory Explorer can show enriched Material Master context columns after the original Excel column order.
- Actions can consume enriched planning and ownership context where existing Inventory values are missing.
- Recovery, financial KPIs and Data Quality Score remain owned by the Inventory analytical pipeline.

The match-rate denominator is active Inventory rows with a valid `material_id`. Ambiguous and invalid-key rows are not counted as matched. If there are no eligible rows, Match Rate remains unavailable instead of showing a misleading 100%.

The enrichment policy is fill-missing-only. Existing Inventory context values are preserved. Conflicting Material Master values are recorded as diagnostics and are not silently applied. Financial, Recovery, demand, workflow, Action, package and source-identity fields are protected from Material Master enrichment.

Field-level provenance is available for enriched values and includes the Material Master package, revision, dataset, source row and match type. Compact relationship and enrichment metadata is stored with the active Inventory package metadata.

AP 16.2b remains session-only and local. It does not add Consumption History, Purchase Orders, Snapshot History, package switching, persistent Registry storage, SAP integration, database-backed workflows, AI, predictive analytics, automatic conflict resolution or Material Master editing.

### AP 16.2b.1 — Enrichment State Isolation & Determinism Gate

AP 16.2b.1 closes the Material Master enrichment integration gate before any Excess Stock operational page work may begin. It does not add new product functionality; it stabilizes the existing Preview, Data Quality and Package transaction boundaries.

Current accepted behavior:

- Remediation Preview restores Inventory-to-Material-Master relationship state after every preview.
- Remediation Preview restores enrichment diagnostics and field-level provenance after every preview.
- Preview uses one shared analytical runtime snapshot contract rather than a second incomplete local field list.
- Preview never updates the Data Package Registry, active Package IDs or Package revisions.
- Preview exception paths restore the same analytical state in `finally`.
- Inventory duplicate-candidate detection uses explicit Inventory-owned rows.
- Material Master enrichment does not feed back into Inventory source-quality issue identity.
- Inventory-first and Material-Master-first import orders produce the same Inventory Data Quality issue keys, score, readiness and ledger result.
- The Remediation Worklist scroll container uses the stable `remediationWorklistScroll` DOM identity.
- Provisional Inventory Package row counts are derived from the explicit normalized and analytical rows of the current build.
- Material Master package import rollback attempts runtime restore, rerender, UI restore and feedback independently.
- Relationship and enrichment metadata summaries are typed and remain compact Package metadata, not full row-level diagnostic stores.
- Physical relationship/enrichment engines, application service and regression tests are part of the acceptance package.

Preserved behavior:

- no Recovery formula changes
- no Action recommendation rule changes
- no Data Quality Score formula changes
- no Issue Ledger semantic changes
- no Package identity or revision semantic changes
- no Material Master editing, SAP connector, persistence, authentication or AI

### AP 16.3a — Excess Intelligence & Decision Page

AP 16.3a turns the Excess Stock navigation tab into the first dedicated operational decision page. It consumes the existing enriched analytical inventory rows and existing Recovery fields, but does not change Recovery, Data Quality or Action-rule semantics.

Visible MVP capability:

- Excess Stock opens a real decision page instead of a placeholder.
- Summary cards prioritize net addressable excess, then Excess case count, average opportunity score and a compact Gross-to-Net reconciliation containing gross excess, net addressable excess and overlap / double counting.
- The Excess decision list is a compact Worklist showing material, net addressable excess with gross excess as secondary evidence, opportunity score, owner reference, match quality and a compact case affordance.
- Selecting a case opens decision details with score components, score drivers, overlap transparency, owner/source confidence, deterministic scenarios, evidence and known limitations.
- Scenarios include excess reduction by percent, excess reduction by absolute amount, safety-stock adjustment, purchase-order review and demand validation.
- Relationship and Enrichment quality are shown in technical relationship details and render a separate read-only issue worklist only when actionable relationship issues exist.
- Inventory export can now choose original source data, enriched analytical data or enriched data with provenance.

Generated fields:

- `gross_excess_value`
- `net_addressable_excess_value`
- `excess_overlap_value`
- `excess_remaining_inventory_value`
- `excess_opportunity_score`
- `owner_reference`
- `owner_source`
- `owner_assignment_confidence`
- `relationship_status`
- `relationship_match_type`

Product rules:

- `net_excess_value` remains the deduplicated Recovery allocation for Excess where available.
- Gross-to-net differences are explained as overlap and are not added back into Recovery Potential.
- `owner_function` remains generated by the existing action rules.
- Material Master may provide owner context fields, but it must not populate `owner_function`, priority, confidence, status, root cause, recommended action or next step.
- `owner_source` is transparent context only: `inventory`, `material_master` or `none`.
- Relationship Quality uses the documented `mvp-1` thresholds and remains separate from the Inventory Data Quality Score.
- Opportunity scoring and scenarios are deterministic MVP decision support, not predictive analytics.
- The Excess page is a self-contained workspace. It does not show Overview KPIs, Overview filters or Data Foundation content while the Excess route is active.
- Excess filters are presentation filters over the current Excess portfolio and must not rebuild analytics, scores, scenarios, Pilot Reviews, Registry records or Package revisions.
- Excess -> Actions navigation resolves by row key, entity key or exact Material/Plant identity, with material-only fallback only when unique.

Still not included in the current MVP:

- arbitrary cross-package analytics beyond the explicit Inventory-to-Material-Master context-enrichment and Inventory-to-Consumption-History historical-metrics pipelines
- standalone Purchase Orders import or Purchase Order optimization
- Demand Forecast, Quality Package or Finance Recognition integration
- Action Outcome learning
- cross-package financial joins
- multi-dataset UI
- Snapshot History
- Delta Detection
- persistent Registry storage
- SAP connector
- database
- authentication
- predictive analytics

### Architecture Principles

- UI state, analytical state and source data must have explicit ownership.
- View-specific UI interactions should not trigger unrelated view rendering.
- Dataset-changing operations may intentionally refresh all data-dependent views.
- Future capabilities must integrate through the Mapping Layer and Canonical Data Model rather than create parallel customer-specific data logic.
- Rendering intent must match state intent: view-local UI changes refresh only their owning view, presentation changes refresh global chrome and the visible view, while analytical dataset mutations refresh all data-dependent views.
- A view must never derive its base analytical dataset from another view's filtered result unless this relationship is explicitly part of the product behavior.
- Core analytical modules must not depend on DOM, navigation, modal state or view-local filter state.
- Extracted domain logic must have one source of truth; `app.js` consumes module APIs rather than duplicate moved business logic.
- Source adapters should output a stable source-data contract before any analytical enrichment begins.
- Mapping engines must not depend on UI, remediation or rendering state.
- Dataset Builder modules must not depend on DOM, translations, navigation, filters, remediation lifecycle or Action workflow status.

## Current Data Flow

1. User opens `prototype.html`.
2. Sample data loads automatically from `sample-data.js`.
3. User may upload a local Excel, CSV or TSV file.
4. Source Ingestion parses the uploaded file and reads source headers/source rows with duplicate source headers preserved through deterministic Source Metadata.
5. The Schema Profile builds field-level header, scale, locale, unit, currency and content evidence.
6. Automatic source-to-canonical Mapping Proposals are generated by the Mapping Engine from the canonical registry and aliases.
7. The Input Trust Assessment evaluates the mapping and value interpretation evidence.
8. If required, the Column Mapping Assistant lets the user review, correct and approve Reviewed Mapping while the existing dataset remains active.
9. The Effective Normalization Policy is merged from proposed source evidence and explicit user overrides.
10. The Dataset Builder applies active compatible corrections, approved Mapping and Effective Normalization Policy, then normalizes rows, enriches analytical inventory fields and calculates Recovery.
11. Mapping and Policy invariants verify that Dataset Builder, Dataset Meta and Package records use the same applied interpretation.
12. If a valid active Material Master package exists, the Inventory Enrichment Service matches Inventory rows to Material Master rows and applies approved fill-missing-only context enrichment.
13. The app commits the Recovery / Enrichment result into current application state only after the deterministic pipeline completes.
14. The current Inventory Snapshot is registered or updated in the Data Package Registry, including compact relationship and enrichment metadata where available.
15. The app decorates analytical rows with rule-based Action fields for root cause, recommended action, next step, owner function, priority, confidence and session-only status.
16. The Owner Context Engine adds owner reference, owner source and owner assignment confidence beside the existing owner-function rule.
17. The Historical Metrics Runtime is built only from accepted Inventory and Consumption History inputs; presentation interactions such as filters, sorting, language, theme, currency and export-dialog opening do not rebuild it.
18. The Slow / Dead Runtime consumes current Historical Metrics Runtime output and creates entity-authoritative Slow / Dead Recovery Cases through the Slow / Dead Recovery Case Service.
19. The Slow / Dead Page Model consumes the Runtime state for page-only filtering, sorting, pagination, selected Case identity, Portfolio Summary and nullable Inventory Exposure presentation.
20. The Slow / Dead View / Controller renders the Recovery Case Workbench and handles scoped page interactions, entity-exact Inventory/Action navigation reveal and export-dialog opening without rebuilding the Runtime.
21. The Slow / Dead export writes one row per current Recovery Case with evidence, provenance, separate Inventory Exposure and Currency columns.
22. The Unified Inventory Risks Runtime adapts accepted Excess, Slow / Dead and Blocked / Quality outputs into separate Family Cases, then deduplicates them into Portfolio Cases without losing Family IDs or provenance.
23. The Unified Page Model presents All Risks, Excess & Demand, Slow / Dead, Blocked / Quality and Prioritized segments through one visible route; Primary and Secondary Families remain inspectable.
24. Data Quality detection runs application-side from Inventory-owned source/canonical rows for Inventory source-quality identity, then combines that result with the existing remediation lifecycle state. Material Master context enrichment may be visible in Explorer and Actions, but it does not change Inventory duplicate-candidate issue identity.
25. Overview renders compact management KPIs, dataset context chips, compact chart panels and a Recovery Worklist from the enriched dataset.
26. The Excess Family detail renders net-addressable values, overlap, opportunity scoring, scenario evidence, relationship/enrichment quality and session-only Pilot Review without reintroducing a separate main-navigation route.
27. Inventory Explorer renders the full inventory table in original Excel order with filters, internal scrolling and additional enriched Material Master context columns where available.
28. Data Quality renders a remediation-first workspace with a primary Score-plus-issue metric row, compact Quick Filters, targeted filter-result rendering, simplified issue worklist, right-side issue Review Sheet and secondary collapsed technical diagnostics for readiness, score breakdown, field coverage, content quality, mapping, source-column diagnostics and recovery validation.
29. Recovery/action/inventory-risk exports include traceability fields; inventory export generates a local Excel-compatible or Google-Sheets-compatible file for the selected export scope and selected data variant. Corrected dataset and issue-log exports are available from Data Quality.

Workflow and lifecycle state remains separate from the data pipeline:

- Issue Decisions
- Remediation Actions
- Issue Ledger
- Action Status
- Accepted Missing
- Accepted Exception
- Reviewed
- Ignored

These decisions may change what the app shows or how issues are classified, but they are not physical source-data transformations.

## R0A And Unified Risk Safety State

R0A establishes strict Derived-Value postconditions: a derived financial value is available only when all required inputs and the result are finite and non-negative. Invalid, negative, overflow and non-finite derivations remain `null`/unavailable; validated zero remains valid evidence. Header-only Inventory uploads are rejected transactionally before commit, so the prior active Dataset and all dependent runtime state remain intact. Family adapters contain missing Inventory Entity identity fail-closed instead of inventing identifiers.

Unified Inventory Risks is one visible route with separate Excess & Demand, Slow / Dead and Blocked / Quality Family Cases. A Portfolio Case may expose a deterministic Primary Family and Secondary Families, but each Family Case retains exact identity, evidence and provenance. Portfolio Evidence uses conservative aggregation.

Evidence Readiness equals readiness-capable currently filtered Portfolio Cases divided by all currently filtered Portfolio Cases. The visible KPI includes numerator and denominator; an empty denominator is unavailable. Net Addressable Recovery, Slow / Dead Inventory Exposure and Blocked / Quality Value are separate financial semantics and are not added into a false Unified recovery total.

Blocked / Quality is a limited exposure and evidence model, not a complete Recovery Engine. Release, rework, supplier-return, approval and success-probability data is not available, so no unsupported recoverable quantity or recoverable value is claimed.

R0A is complete. R0B establishes local Runtime, test, manifest and Git reproducibility; it is not a Product Release. At that historical R0B boundary `TRUST-01` remained open. The current technical TRUST result is documented below, while Product Release remains `HOLD`.

## TRUST-01 Source-Bound Trust State

The current technical implementation binds each analytical Mapping and field policy to one physical source identity: `canonicalField`, strict numeric integer `sourceIndex`, duplicate-aware `sourceKey` and matching `sourceColumn`. Reviewed Mapping is the only commit-capable Mapping truth. Preview, Dataset Builder, Dataset Meta and Package records must reproduce the same Mapping and Normalization Policy signatures.

Reopening an unchanged Mapping preserves its signatures. Remapping to another physical source, including a same-label duplicate, clears top-level and field-level confirmation and prevents Apply until the current source is re-evaluated and freshly confirmed. Proposals remain evidence and cannot bypass the reviewed Mapping boundary.

Unsafe required financial interpretation is fail-closed. Missing, ambiguous, invalid, mixed-locale, mixed-currency, double-scaled, non-finite and overflow input remains unavailable; validated numeric zero remains available. Display-currency changes remain presentation-only and cannot alter source values, trust states, signatures or Package revisions.

The Package contracts remain isolated:

- Inventory Snapshot owns financial KPIs, Recovery and Inventory Data Quality.
- Material Master requires Material ID, preserves identifiers as text and only fills approved missing context without overwriting Inventory-owned or protected fields.
- Consumption History requires Material ID, quantity and date/period evidence, preserves zero and negative movement evidence, and cannot mutate Inventory Recovery, Actions, Data Quality or Pilot Review.

Without accepted Consumption History, Slow / Dead Runtime is unavailable rather than a calculated zero. The Unified Risk segment shows `n. v.` / `n/a` and retains the existing History import action. A zero case count or zero exposure is shown only for an `available` or `limited` current calculation.

TRUST-01 technical source acceptance is separate from release governance. A clean TRUST-only commit cannot be separated from the inherited worktree, therefore Fresh-Commit and Fresh-Bundle acceptance remain blocked. Product Release remains `HOLD` and the next authorized activity is independent review.

## Current Assumptions

- Data is handled locally in the browser.
- The current data model is SAP-like, but not a validated SAP extract contract.
- UI Display Currency is a local presentation-only conversion for EUR, USD and GBP.
- Source Currency Normalization detects source currency metadata and mixed-currency risks, but does not perform reliable FX conversion or silently aggregate mixed source currencies.
- KPI logic is suitable for demo discussions, not yet validated for production use.
- Action recommendations are rule-based and non-binding.
- Action status is session-only and not production persistence.
- Pilot Reviews are session-only customer-validation evidence, not persistent workflow or realized-value tracking.
- Placeholder tabs still describe not-yet-implemented product areas only: Purchase Orders and Reports.

## CH-EX-01A Integrity Closure

The Excess Decision Workspace now fails closed when its monetary decision basis is missing, invalid, currency-inconsistent or mathematically unreconciled. Gross Excess minus overlap/deductions must equal Net Addressable within EUR-cent precision (`0.01`). Missing values remain visibly unavailable and are never presented as zero; genuine zero remains valid evidence.

The current interoperable package contract is Workspace Projection `3`, Decision Readiness `excess-decision-readiness-v2` and subordinate Gross-to-Net Reconciliation `gross-net-reconciliation-v1`. The Application Service, selected Case projection and renderer consume this one versioned chain; historical Projection 2 / Readiness v1 descriptions are superseded for the current product state.

The Case Header and Gross-to-Net detail use one canonical Availability projection. Invalid value basis is visibly marked for review and can never produce positive Decision Readiness. Opportunity Score remains the established deterministic score with unchanged weights; new metadata makes the existing 100-point cap transparent when the component sum exceeds 100.

The session-only Excess portfolio cache is revisioned and invalidated only by relevant analytical mutations such as Action status, dataset/remediation/enrichment commits, active Inventory Package revisions and rollback restoration. Filters, selection, language, theme and currency remain presentation-only and do not rebuild the analytical model. Diagnostic Runtime build history is disabled in product mode and bounded to 50 entries in test mode.

This closure adds no new product feature, chart, forecast, persistence, approval, SAP integration or workflow execution.

## Recommended Next Work Block

Recommended product scope after independent TRUST review: `RECOVERY-LOOP-01 — Excess-to-PO Recovery`.

Current authorized scope: `REVIEW_REQUIRED`. No publication, deployment, tagging or Product Release is authorized by TRUST-01.
