# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is for

`auto-rfq-banana` is a self-contained, Windows-deployable browser app for the full Andersen MRO RFQ workflow: drop a multi-year supplier export → auto-build a candidate RFQ list with scoring + multi-window analytics → curate (smart trim by tier + description patterns) → generate per-supplier outbound RFQ workbooks → ingest returned bids → cross-supplier comparison with recommendations + outlier flagging → award scenarios → per-supplier award letters with strict isolation guard. Sibling to `supplier-pricing` (per-cycle price-file analysis) and `supplier-recon` (Coupa go-live).

Pyodide + openpyxl stack — Python in the browser via WebAssembly, all-local, no AI, no CDN at runtime, IT-approval-free at Andersen.

**Data model is inverted from supplier-pricing**: instead of matching one supplier's new file against an item master, this app *builds* the master from the supplier's own multi-year history, then sends it back to N competing suppliers.

## Run the app

```bash
cd /Users/ryanjenkinson/Desktop/work/auto-rfq-banana
python3 -m http.server 8801
# open http://localhost:8801/app.html
```

Windows distribution: double-click `start.bat`.

## File map (4-file Pyodide pattern)

| File | What it owns |
|---|---|
| `app.html` | DOM shell — legal-gate, splash, step containers, script/link tags. ~250 lines. |
| `app.css` | All styling. Bloomberg Terminal palette: deep navy ground (`#0a0e1a`), amber KPI accent (`#ffb733`), IBM Plex Sans + JetBrains Mono. ~220 lines. |
| `app.js` | Boot diagnostics IIFE, legal-gate IIFE, splash + pixel banana, Pyodide bootstrap, all UI logic, save manager, scenario UI, follow-up + award letter download glue. |
| `app.py` | All Python. Loaded via `fetch('./app.py').then(text => pyodide.runPythonAsync(text))`. Registers itself as `app_engine` in `sys.modules`. |
| `verify_rfq.py` | Sibling Python — independent recompute of headline KPIs from the multi-year export. The "show me the math" red/green check. |
| `verify_isolation.py` | Sibling Python — walks a folder of award letter xlsx files and flags any cell containing a foreign supplier name. Internal-audience files (banner contains "INTERNAL ... NEVER FORWARD" or filename starts with `INTERNAL`) are auto-skipped. |
| `start.bat` | Windows launcher (`py -m http.server 8000` + open browser). |
| `pyodide/`, `wheels/` | Local Pyodide runtime + `openpyxl` 3.1.5 + `et_xmlfile` 1.1.0. Bundled — no PyPI/CDN at runtime. |

## End-to-end workflow (4 steps in the UI)

**Step 1 — Drop multi-year supplier export.** xlsx from Coupa/EAM PO history. Auto-detects sheet + row count.

**Step 2 — Confirm column mapping.** Auto-mapper uses two-pass logic (exact-equality first, substring fallback) to avoid banner-text false positives. Required: at least one of `item_num`/`eam_pn`/`part_number` (the dedup-key cascade), plus `description`, `order_date`, `qty`, `unit_price`. Note: **EAM is the usual primary key** for normal Andersen suppliers; McMaster is the outlier (cXML, blank EAM, lives in Part Number column).

**Step 3 — Candidate RFQ list with scoring + curation.** Auto-extracted, deduplicated, scored. Each item gets:
- Score 0-100 (tier STRONG/MODERATE/WEAK/SKIP)
- Demand flags (DORMANT_12MO, SINGLE_ORDER, STALE_OVER_12MO, etc.)
- Description pattern flags (service / freight / tariff / obsolete / rental → red, custom / repair / misc → amber, generic → informational)
- UOM-canonicalized + uom_mixed flag if multiple distinct UOMs
- File-level difficulty rating snapshot recorded with timestamp for period-end reporting

UI affordances: tier filter / include-filter / search + min-spend filter, **policy-driven Smart Trim panel** (collapsible — pick dormancy window 12/24/36 mo independently, drop red description flags, drop by tier WEAK+SKIP or SKIP-only, drop below 24-mo $ minimum; live preview recomputes as toggles flip; pre-commit confirmation; 30-second Undo button; manual-decision-overwrite guard surfaces in preview), bulk include/exclude all visible, manual per-row toggle, click-row → per-item history modal with order chart + 90-day median + spike detection + linear trend extrapolation **+ outlier-line tickbox column (untick a row to drop it from the trend recompute and flow that through to LAST $/ea, KPIs, outbound xlsx, and scenario savings)** + **supplier-bid overlay markers + per-bid lock buttons**, "Generate outbound RFQ files" button (multi-supplier). KPI tiles are click-targets: 12mo / 24mo / 36mo set the active window, Items / Total spend clear filters, Date range scrolls to charts, Difficulty opens a signals-detail modal. Top-15 chart bars open the per-item modal. Closing the per-item modal leaves a fading highlight on the originating row so the user can tell where they were when scrolling resumes.

**Step 4 — Compare bids + scenarios + outputs.** Multi-file dropzone for returned bid xlsx. Each loaded bid → per-supplier intake card (priced/no-bid/need-info/UOM-disc/substitute counts + total quoted value + 📥 follow-up xlsx button). Then:
- Coverage KPIs (3+/2/1/0 bids breakdown + outliers + lowest-bid total + historical baseline)
- **Consolidation analysis** with carve-outs (Ryan's actual award strategy — pick one supplier, identify exceptions where another saves >30%). UOM-suspect carve-outs are flagged separately and excluded from counted savings.
- **Comparison matrix** (items × suppliers) with recommendation chips (5-tier: ACCEPT / PUSH_BACK / ASK_CLARIFICATION / EXCLUDE / MANUAL_REVIEW), every recommendation carries a concrete reason string. Matrix has a click-target filter system: bid-coverage KPI tiles (3+ / 2 / 1 / 0 / Outliers), recommendation chips, supplier intake cards, and consolidation candidate rows all toggle filters that narrow the matrix below; per-cell click drills into the per-item modal. A pill bar at the top of the matrix surfaces active filters with × buttons + a "clear all" link.
- **Award scenarios** — save named what-ifs (lowest-price / lowest-qualified / consolidate-to-X / incumbent-preferred / manual). Side-by-side compare of any two. Per-scenario buttons: 📨 Letters (one award letter xlsx per awarded supplier with isolation guard), 📊 Internal (cross-supplier full-detail summary, "INTERNAL — NEVER FORWARD" banner).

## Key architectural decisions

**Anchor "now" to the data, not the wall clock.** All windowed aggregations + recency scoring use the dataset's max order date as "today", not `datetime.now()`. Exports are often weeks stale.

**Per-row math is internally consistent.** In the RFQ-list table, `12mo $ = qty_12mo × LAST $/ea`, where LAST = exact unit price of the most recent priced order line (no median, no smoothing — RFQ reporting must be to-the-penny). KPI top-row totals stay as historical actuals (sum of historical line totals). Per Ryan: "no rounding or medians in rfqs ... it should be exact most recent price to the penny always".

**Two-tier dedup-key fallback.** `item_num → eam_pn → part_number`. EAM is the primary for most Andersen suppliers; McMaster's blank-EAM cXML pattern is the reason for the part_number fallback.

**Module-level state in `app.py`.** `_STATE` holds: items, kpis, annual_spend, supplier_name, difficulty, difficulty_history, po_lines_by_key, data_anchor_date, bids, scenarios, thresholds, audit_log, **item_exclusions, item_locks**. `serialize_state()` / `restore_state(payload)` round-trip the durable subset across save/reload.

**Per-item outlier exclusions + supplier locks.** Two analyst-facing controls live on the per-item history modal:

* `_STATE["item_exclusions"]` — `{item_num: [excluded_indices]}` into the ascending-date-sorted po_lines for that item. Untick a row in the modal's Order Lines table to drop it; trend / R² / 90-day median / expected-today price all recompute live on the cleaned set.
* `_STATE["item_locks"]` — `{item_num: {"supplier", "reason", "locked_at"}}`. Click the per-bid lock button below the chart to pin this item's award to a specific supplier across every saved scenario. `_evaluate_scenario` checks locks AFTER explicit per-scenario overrides but BEFORE strategy logic. A lock without a matching priced bid is recorded as `n_locks_unhonored` and falls through to strategy. Use case: visually audit a bid that looks suspiciously cheap, then lock to a supplier you trust so an automated lowest-price scenario doesn't accidentally award a typo.

Both fields persist via `serialize_state` / `restore_state` so the curation work survives a save/reload.

**Splash → legal gate → app sequence.** The legal gate is hidden at page load and only revealed after splash dismissal. Canonical legal-gate copy from `~/.claude/skills/workpackage/references/templates.md` — do not customize per-tool.

**Splash character.** Pixel banana bunch on a 22×30 grid in `app.js` (`SPLASH_GRID` + `SPLASH_PALETTE`). Each non-`..` token maps to a hex color and renders as a 1×1 SVG `<rect>`.

**Click-targets convention.** Every visible card / KPI / chip in the dashboard is either a click-target (drives the working table or opens a modal) or labeled non-interactive. Module-level state `_matrixFilter` holds the active filters for the comparison matrix; `_lastMatrixData` caches the most recent server payload so filter clicks re-render in-browser without re-running the Python compute (the matrix takes 1-2 s on the McMaster dataset). `_applyMatrixFilter(rows)` is the single point of truth for the filter logic. CSS classes `.kpi.clickable`, `.clickable-card`, `.clickable-row`, `.clickable-chip`, and `.matrix-cell` give the visual cue; `.matrix-filter-bar` + `.matrix-filter-pill` style the active-filter pill bar at the top of the matrix.

**ELI5 tooltips on every interactive surface.** Every clickable / hoverable element in the dashboard carries a `title=""` tooltip with a plain-language explanation: what the field means, where the math came from (e.g. "12mo $ = qty_12mo × LAST $/ea"), what clicking does, when to use it. Surfaces covered: topbar buttons (Profile / Audit / Thresholds), step nav buttons, dropzones, column-mapping fields, RFQ-list filter inputs + bulk action buttons, every RFQ-table column header, KPI tiles, recommendation chips, supplier intake cards, consolidation candidate rows, comparison-matrix cells (with per-status text), per-item modal columns + lock buttons, scenario quick-create buttons + per-scenario action buttons. Treat any future click-target as incomplete until it has a tooltip.

## Engine entry points (Python)

| Function | Purpose |
|---|---|
| `inspect_workbook(bytes)` | Quick metadata: sheet name, headers, row count |
| `auto_map_export(headers)` | Two-pass alias mapper (exact, then substring); returns `{field → col_idx}` |
| `extract_rfq_list(bytes, mapping)` | Full extract: dedup → multi-window aggregation → scoring → difficulty rating |
| `score_item(it, anchor_date)` / `score_items_in_place(items, anchor)` | Per-item 0-100 + tier + reasons |
| `compute_difficulty_rating(items, kpis)` | File-level 0-100 + level + signals |
| `record_difficulty_snapshot(d)` / `list_difficulty_history()` | Snapshot history for period-end reporting |
| `add_demand_concern_flags(items, anchor)` | DORMANT_12MO / DEMAND_DROP_50 / SINGLE_ORDER / etc. |
| `description_pattern_flags(desc)` | service / freight / tariff / custom / repair / rental / misc / obsolete / generic |
| `canon_uom(s)` / `is_risky_uom_change(a, b)` | UOM normalization map; never auto-converts risky pairs |
| `get_thresholds()` / `set_thresholds({...})` / `reset_thresholds()` | The 11 tunable engine knobs |
| `parse_supplier_bid(bytes, supplier)` / `ingest_supplier_bid(bytes, supplier)` | Returned-bid intake. Auto-detects "our format" (banner + headers around row 7). |
| `compute_comparison_matrix(included_keys=None)` | Items × suppliers grid with coverage + outlier flags + recommendation per row |
| `recommend_for_item(matrix_row)` | 5-tier recommendation + concrete reason |
| `compute_consolidation_analysis(included_keys, carve_threshold, uom_suspect_ratio)` | Per-supplier consolidation candidates + winner + carve-outs |
| `save_award_scenario(name, strategy, parameters, overrides, included_keys)` | Persist a what-if; strategies: lowest_price / lowest_qualified / consolidate_to / incumbent_preferred / manual |
| `evaluate_award_scenario(name)` | Re-run a saved scenario against current state |
| `compare_award_scenarios(name_a, name_b)` | Totals delta + per-item diffs |
| `get_item_history(item_num)` | Per-item drill-down: PO lines (each tagged with line_idx + excluded), cleaned-set linear trend + spike detection + 90-day median + expected-today, plus a `bids` overlay listing every priced supplier quote scored against the trend (`possible_typo` flag at ratio ≤ 0.4) and an in-effect `lock` record if any |
| `set_item_exclusions(item_num, excluded_indices)` | Persist analyst's outlier picks AND propagate to per-item aggregates + headline KPIs AND append an entry to the data-quality event log with the line snapshot + pre-exclusion median/avg of the other priced lines. Returns `{item_num, n_excluded, exclusions, item, kpis}` so JS can patch `_rfqResult.items` in place. Empty list clears. Indices are into ascending-date-sorted po_lines. |
| `list_exclusion_log()` / `get_exclusion_log_summary()` / `gen_exclusion_log_xlsx()` | Master data-quality record. The xlsx uses a cross-app schema (`app_source`, `event_type`, item context, line snapshot, before-baseline) so it concatenates with the equivalent logs from supplier-pricing + tariff-impact into one audit packet. Filename: `DataQualityLog_auto-rfq-banana_<stem>_<YYYY-MM-DD>.xlsx`. Banner row 1 says `INTERNAL — NEVER FORWARD`. |
| `_recompute_item_aggregates_for(item_num)` / `apply_all_item_exclusions_to_aggregates()` | Internal helpers. The first re-derives one item's `last_unit_price` / `qty_*` / `spend_*` / `first_order` / `last_order` / `po_count` from cleaned po_lines; the second walks every saved exclusion (used after extract on session reload). |
| `set_item_lock(item_num, supplier, reason="")` / `clear_item_lock(item_num)` / `list_item_locks()` | Pin one item's award to a supplier across every scenario. Wired into `_evaluate_scenario` after overrides, before strategy. |
| `gen_candidate_rfq_list_xlsx(included_keys=None)` | Internal-audience candidate list xlsx |
| `gen_outbound_rfq_xlsx(supplier, rfq_id, due_date, contact, included_keys)` | Per-supplier 5-tab outbound RFQ. Hidden item_key + rfq_line_id for round-trip. Locked cells, dropdown validation. |
| `gen_supplier_followup_xlsx(supplier, included_keys=None)` | 7-tab pushback packet, template-based prose |
| `gen_award_letter_xlsx(scenario_name, supplier_name, rfq_id, contact)` | 3-tab supplier-bound award letter. Strict isolation: defensive cell scan refuses export with `IsolationViolation` if any other supplier's name appears. |
| `gen_award_letters_for_scenario(scenario_name, rfq_id)` | Batch — one letter per awarded supplier |
| `gen_internal_award_summary_xlsx(scenario_name, rfq_id)` | Internal-audience full detail with "INTERNAL — NEVER FORWARD" banner |
| `serialize_state()` / `restore_state(payload)` | Round-trip the durable parts of `_STATE` for save/reload |
| `log_event(action_type, detail, related)` / `list_audit_log(limit)` | Discrete audit trail. Cap 500 entries. |

## Hard constraints (do not break)

1. **No CDN at runtime.** All Pyodide + wheel files live in `pyodide/` and `wheels/`. Audit with `grep -r "cdn.jsdelivr.net" *.html *.js` returning nothing. Any new dep gets downloaded into `wheels/`.
2. **Legal gate first.** Full-screen Accept / Exit blocks UI until clicked. Canonical text only.
3. **Cross-supplier isolation.** Every supplier-bound export filters to one supplier's data. `gen_award_letter_xlsx` raises `IsolationViolation` if any row carries another supplier's id; `verify_isolation.py` is the third-party cross-check.
4. **No Andersen-internal-only fields in supplier-bound files.** Outbound RFQs do NOT include historical paid prices. Award letters carry the supplier's own bid + qty + delivery only.
5. **Browser main thread must not block.** Long Python work is split into stages with `await new Promise(r => setTimeout(r, 0))` between calls if needed.
6. **Aliases must be multi-word or distinctive.** Bare common words (`unit`, `cost`, `id`, `price`) collide. Always use phrases like `"unit price"`.
7. **RFQ math is to-the-penny.** No rounding in displayed prices, no medians or smoothing. Analytical references (90-day median for spike detection) are clearly labeled and never substitute for the exact LAST $/ea. **Documented exception (per-item outlier-exclusion feature):** analyst-confirmed outlier removal via the per-item modal's `USE` checkbox column is allowed and propagates through to `last_unit_price`, every windowed `qty_*` / `spend_*` / `spend_*_actual`, `po_count`, `first_order`, `last_order`, file-level KPIs, the outbound RFQ xlsx, the comparison stage's historical baseline, and scenario savings totals. The rule was always about not blurring REAL prices (medians, averages, smoothing) — analyst curation that drops a confirmed data error is the opposite: it makes the to-the-penny number actually meaningful instead of polluted by a typo. Every exclusion is recorded in the audit log with the resulting `last_unit_price` so the decision trail survives into the Decision Log xlsx. Implementation: `set_item_exclusions` calls `_recompute_item_aggregates_for(item_num)` write-through, and `extract_rfq_list` calls `apply_all_item_exclusions_to_aggregates()` at the tail so reloads of saved sessions pick up prior curation.

## Cache + browser-refresh hygiene

- During dev, plain `Cmd+R` (NOT `Cmd+Shift+R`). Hard-refresh re-downloads ~13 MB of Pyodide every time.
- For a real fresh load: DevTools → right-click refresh → **Empty Cache and Hard Reload**. Or fresh Incognito window.
- Never add `?v=...` cache-bust query strings — they only invalidate the parent HTML.

## Bundle for distribution

```bash
rm -f ~/Desktop/auto-rfq-banana_bundle.zip
zip -r ~/Desktop/auto-rfq-banana_bundle.zip auto-rfq-banana \
  -x "*.DS_Store" "*/__pycache__/*" "*.git/*" "samples/*" "scratch/*"
```

The zip drops on a Windows laptop; user unzips, double-clicks `start.bat`.

## Live test data on Ryan's machine

| File | What it is |
|---|---|
| `~/Downloads/McMaster Coupa.xlsx` | 24,959 rows / 50 cols. Multi-year (2023-04 to 2026-04) Andersen Coupa export of McMaster purchases. |
| `~/Downloads/rfq/grainger/Andersen Grainger RFQ 4.10.26 - McMaster Items.xlsx` | Grainger's bid response in our template (3,374 lines, 3,062 priced) |
| `~/Downloads/rfq/Fastenal/Fastenal 4.23.xlsx` | Fastenal's bid (4,347 lines, 1,815 priced, 87 UOM-disc, 973 substitutes) |
| `~/Downloads/rfq/msc/Anderson RFQ - McMaster Items_updated 4-8-26.xlsx` | MSC's bid (3,374 lines, 2,048 priced, 1,202 need-info) |
| `~/Downloads/rfq/grainger/Andersen Grainger 4.10.26_RFQ - Data Spreadsheet.xlsx` | Grainger's reformatted-template version. Lower priority — Ryan said pay less attention. |

McMaster headline numbers when extracted: 11,169 items / $2,660,088 total / 9,209 POs / 18,619 lines / difficulty 62/100 DIFFICULT (89% items in WEAK/SKIP, 84% missing MFG, 89% generic descriptions). Smart-trim cuts to ~1,263 STRONG+MODERATE candidates worth bidding out.

## Roadmap (what's NOT yet built)

Active queue (priority — surfaced 2026-04-29 as Ryan transitions out of MRO):
- ~~**Per-item chart: outlier-exclusion + trendline-recalc + save** — on the per-item history modal, let the user untick obvious outlier orders from the lines table; recompute the linear-regression trend live; save the cleaned-orders set per item so reopens preserve the exclusion. Then on the same screen overlay all available supplier-bid quotes as horizontal markers — closest-to-line is the cleanest match; "way below the line" should flag as `POSSIBLE_TYPO`. Persist via `_STATE.item_exclusions = {item_num: [excluded_indices]}`.~~ ✅ **shipped 2026-04-29 on `feature/per-item-outlier-exclusion`** — also includes per-bid lock buttons (`_STATE["item_locks"]`) wired into `_evaluate_scenario` so audited bids can be pinned across all scenarios; bid overlays show every supplier quote on the chart with color-coded distance-from-trend; closing the modal leaves a fading row highlight on the originator.
- **Click-targets across the dashboard need an audit** — many sections (callout cards with part counts, scorecard rows, comparison-matrix cells, supplier-strip cards) currently don't open per-item detail or filter the working matrix at the bottom. Goal: anywhere there's a clickable-looking element, clicking should drive the working table at the bottom to filter to that subset OR open the per-item modal. Audit existing screens; produce a list of dead-click sites; fix in batches.
- **ELI5 hover-text everywhere** — every clickable / hoverable element should carry a tooltip explaining what it is in plain language (e.g. "12mo $ = quantity ordered in last 12 months × most-recent unit price. Used as the spend baseline this RFQ is bidding against."). Existing `gloss` / `ca-info` / `data-eli5` patterns work — extend to all interactive surfaces in the dashboard.
- **Save-dialog on every export** — Pyodide currently triggers a browser-default download (lands in the user's `Downloads` folder, often confusingly). For pywebview-wrapped variants, swap the export path to call `window.pywebview.api.save_file_picker(filename, bytes_b64)` which pops a native Windows save dialog where the user picks the location. Need a small Python `Api` class registered into `webview.create_window(js_api=...)` exposing `save_file_picker`. Same fix applies to all sister apps (supplier-pricing, supplier-recon, tariff-impact, mro-match-toolkit). (~30-60 min per app once the pattern is built.)
- **Per-item modal close → row highlight (cross-app convention)** — when a per-item / per-row drill-down modal closes, leave the originating row visibly highlighted so the user can tell where in the table they were before drilling in. Auto-rfq-banana ships this in `feature/per-item-outlier-exclusion` (CSS class `.last-viewed-row` + `_markLastViewedRow` helper that picks all `tr[data-item="..."]` and `tr[data-comp-item="..."]` matches and fades the highlight after ~12 s). **Same pattern is queued for every sister app** with a drill-down modal: supplier-pricing, supplier-recon, tariff-impact, mro-match-toolkit, supplier-metrics, and any future workpackage tools. The exact selector + auto-fade timer can vary, but the principle (subtle accent stripe on the originating row, fades after ~10-15 s) is uniform.

Active queue (existing):
- **Validation severity tiers** + row-level validation table on import (Error / Warning / Info)
- **Saved column-mapping templates per supplier** (one-click re-apply)
- **Item conflict detection** (same MFG PN with different item numbers, etc.)
- **Internal-stakeholder verification loop** — using Coupa export contact columns (Requested By / Department / Last Updated By / Receiving Warehouse / Storeroom). Per-requestor PDF + xlsx packet for "is this the right part?" round-trip.
- **Period-end report generator** — uses difficulty_history snapshots + audit_log + scenario series to produce a leadership-ready PDF/xlsx
- **Bid-feedback signal feeding into difficulty rating** — retroactively bump difficulty when many bids come back flagged
- **Anonymized comparison view** (mask supplier names for one-off pulls)

Larger items to do after everything else is finished:

- **Award decision documentation (legal-hold record)** — for every awarded item, generate a defensible "why this supplier" explanation that includes: all bids received (with prices, status flags), the recommendation engine's output + reason, the scenario applied, any manual overrides + their stated rationale, the threshold values active at the time, and the historical baseline. Output format: a per-RFQ "Decision Log" xlsx + matching PDF, bundled with the award letters and retained for **several years for legal**. Should be uneditable after creation (immutable snapshot — don't re-derive from current state when reopened, embed the data verbatim). Tie into the existing audit log so the Decision Log includes the action trail.

- **Full user guide / advanced strategy book** — multi-section docs site (or richly-formatted PDF) with: Quick Start (5-min path: drop file → smart trim → generate outbound) → Basics (each step explained) → Advanced (scoring weights, threshold tuning, scenario design, consolidation strategy) → Strategies and theory (RFQ award technique theory, when to consolidate vs split, push-back tactics, what outliers actually mean, how to read the difficulty rating). Full screenshots throughout via an automated browser tool (Playwright MCP / similar) so the guide stays in sync as the UI evolves.

See `~/.claude/plans/i-want-to-make-compressed-glacier.md` for the original plan + the ChatGPT brief at `/tmp/rfq_brief/rfq_claude_code_brief/` for the broader feature catalog.
