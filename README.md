# Auto RFQ Banana

Self-contained, Windows-deployable browser app for the **full Andersen MRO RFQ workflow** — from multi-year supplier export to per-supplier award letters.

Pyodide + openpyxl in the browser. All-local. No AI, no CDN at runtime, no telemetry. IT-approval-free at Andersen.

Sibling to `supplier-pricing` (per-cycle price-file analysis) and `supplier-recon` (Coupa go-live).

## What it does

The 4 steps map to the 4 phases of an RFQ:

**1. Drop a multi-year supplier export** (`xlsx` from Coupa / EAM PO history). Auto-detects sheet + columns with two-pass alias matching. Handles the cXML / blank-EAM case (McMaster-style) by falling back to the supplier's own Part Number.

**2. Confirm column mapping** — adjust if needed. Save the result as a named template; future files with the same header shape auto-match in one click.

**3. Candidate RFQ list with scoring + smart trim**
- Each item gets a 0-100 score with tier (STRONG / MODERATE / WEAK / SKIP) plus reasons
- Demand flags (DORMANT_12MO, SINGLE_ORDER, STALE_OVER_12MO, etc.)
- Description-pattern flags (service / freight / tariff / obsolete in red, custom / repair in amber)
- File-level difficulty rating (EASY / MODERATE / DIFFICULT / VERY DIFFICULT) with snapshot history for period-end reporting
- Multi-window KPIs (12 / 24 / 36-month spend, all-time, last paid price)
- Item-conflict detection — same MFG PN under multiple item numbers, same description under multiple item numbers, etc.
- Tier filter, include filter, search, min-spend filter
- "Smart trim" bulk action: untick WEAK + SKIP items + red-flag patterns
- Click any row → per-item history modal with order-price chart, 90-day median reference, spike detection, linear trend extrapolation
- "Generate outbound RFQ files" → multi-supplier xlsx generation (5-tab template with hidden round-trip columns + locked cells)

**4. Compare bids → scenarios → outputs**
- Multi-file dropzone for returned bid xlsx (auto-detects "our format")
- 5 status types per bid: PRICED / NO_BID / NEED_INFO / UOM_DISC / SUBSTITUTE
- Coverage KPIs (3+ / 2 / 1 / 0 bids per item)
- **Consolidation analysis** with carve-outs (default award strategy) — UOM-suspect carve-outs auto-flagged + excluded from counted savings
- **Comparison matrix** with 5-tier recommendations per row (ACCEPT / PUSH_BACK / ASK_CLARIFICATION / EXCLUDE / MANUAL_REVIEW), every recommendation carries a concrete reason
- **Award scenarios** — save named what-ifs (lowest-price / lowest-qualified / consolidate-to-X / incumbent-preferred / manual). Side-by-side compare any two scenarios with totals delta + per-item diff table.
- **Per-supplier follow-up xlsx** — 7-tab pushback packet (Items Needing Price Review / Missing Information / UOM Exceptions / Alternate Parts / No-Bids / Full Quote Detail), template-based prose, isolation-guarded
- **Per-supplier award letter xlsx** — 3-tab supplier-bound award letter with `IsolationViolation` guard at write time
- **Internal full-detail summary xlsx** with "INTERNAL — NEVER FORWARD" banner

## Run it

**Mac/dev:**
```bash
cd /Users/ryanjenkinson/Desktop/work/auto-rfq-banana
python3 -m http.server 8801
# open http://localhost:8801/app.html
```

**Windows distribution:** unzip the bundle, double-click `start.bat`. Requires Python 3.x on PATH; no admin rights.

## Save system

- **60-second autosave** to localStorage (transparent, no permission prompt)
- **Manual named saves** — "Save as…" prompts for a name, writes JSON to bookmarked folder OR downloads
- **Folder bookmarking** via `showDirectoryPicker()` — once picked, manual saves write directly into the folder
- **Restore** — pick a save JSON, full state re-applies (mapping, decisions, bids, scenarios, thresholds, audit log all round-trip)

## File map

| File | Purpose |
|---|---|
| `app.html` | DOM shell — legal gate, splash, 4 step containers, audit + thresholds buttons in topbar |
| `app.css` | All styling — Bloomberg Terminal palette (deep navy / amber / IBM Plex Sans + JetBrains Mono) |
| `app.js` | Boot diagnostics, legal gate, splash + pixel banana, Pyodide bootstrap, all UI orchestration |
| `app.py` | Engine — extraction, scoring, recommendations, scenarios, all xlsx generators |
| `verify_rfq.py` | Independent recompute of headline KPIs from the source xlsx |
| `verify_isolation.py` | Walks a folder of award letters, flags any cross-supplier name leakage |
| `start.bat` | Windows launcher |
| `pyodide/`, `wheels/` | Local runtime + openpyxl + et_xmlfile (no CDN) |

## Hard constraints

1. **Local-only runtime.** No CDN at runtime, no network calls, no AI, no telemetry.
2. **Cross-supplier isolation.** Every supplier-bound export filters to one supplier's data; `gen_award_letter_xlsx` raises `IsolationViolation` if any cell would contain another supplier's name. `verify_isolation.py` is the third-party cross-check.
3. **No Andersen-internal-only fields in supplier-bound files.** Outbound RFQs do NOT include historical paid prices.
4. **Legal gate first.** Full-screen Accept / Exit before any UI is interactive.
5. **RFQ math is to-the-penny.** No rounding in displayed prices, no medians for displayed values. Analytical references (90-day median for spike detection) are clearly labeled.

## Roadmap

Active queue:
- Validation severity tiers + row-level table on import
- Internal-stakeholder verification loop (uses Coupa Requested By / Department / Storeroom contact columns)
- Period-end report generator
- Bid-feedback signal feeding into difficulty rating retroactively
- Anonymized comparison view

After everything else:
- Award decision documentation (legal-hold record retained for several years)
- Full advanced user guide with automated screenshots

See `CLAUDE.md` for architecture details and the engine entry-point catalog.

## Questions / issues

ryan.jenkinson@andersencorp.com — best-effort help only; not Andersen-approved or endorsed.
