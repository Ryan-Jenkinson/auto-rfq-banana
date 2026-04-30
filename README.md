# Auto RFQ Banana

Self-contained, Windows-deployable browser app for the full multi-supplier MRO RFQ workflow — from multi-year supplier export to per-supplier award letters.

Pyodide + openpyxl in the browser. All-local. No AI, no CDN at runtime, no telemetry.

---

## What it does

**1. Drop a multi-year supplier export** (`xlsx` from Coupa / EAM PO history). Auto-detects sheet + columns with two-pass alias matching. Handles the cXML / blank-EAM case (where the supplier's own Part Number is the only identifier present).

**2. Confirm column mapping.** Auto-mapper hits >90% of fields on real data; only ambiguous ones need adjustment.

**3. Curate the candidate RFQ list.** Each item gets a 0-100 score and a tier (STRONG / MODERATE / WEAK / SKIP) based on demand history, recency, dollar significance, and description-pattern flags. Smart Trim panel lets you drop dormant + low-value + risky-description items in one pass with live preview and undo.

**4. Generate per-supplier outbound RFQ files.** One xlsx per supplier, with hidden round-trip identifiers so returned bids match back to the right RFQ line.

**5. Ingest returned bids.** Drop each supplier's response — the parser auto-detects "our format" (banner + headers around row 7) versus a reformatted version, and offers manual column mapping for outliers.

**6. Compare side-by-side.** Coverage KPIs, recommendation engine, consolidation analysis with automatic carve-outs (the "one supplier with exceptions" award model), Round 2 selection for items where bids look uncompetitive, and a per-item drill-down with chart, history, and supplier-bid overlay.

**7. Award.** Per-supplier award letters (with a strict cross-supplier isolation guard) plus an internal Decision Summary xlsx that captures the full legal-hold record: cost avoidance vs historical, savings uplift vs no-touch baseline, every analyst action, every system flag, items needing follow-up.

---

## Run locally (Mac / Linux dev)

```bash
python3 -m http.server 8801
# open http://localhost:8801/app.html
```

## Run on Windows

Double-click `start.bat`.

---

## Files

| File | Purpose |
|---|---|
| `app.html` | DOM shell |
| `app.css` | Styling |
| `app.js` | UI logic, save manager, scenario UI, download glue |
| `app.py` | All Python — extraction, scoring, bid parsing, comparison, scenarios, generators |
| `verify_rfq.py` | Independent recompute of headline KPIs from a fresh export |
| `verify_isolation.py` | Walks a folder of award letter xlsx files and flags any cross-supplier name leaks |
| `start.bat` | Windows launcher |
| `pyodide/`, `wheels/` | Local Pyodide runtime + openpyxl + et_xmlfile (no PyPI/CDN at runtime) |

---

## Hard constraints

1. **No CDN at runtime.** All Pyodide + wheel files are bundled.
2. **Legal disclaimer first.** Full-screen Accept / Exit gate before the UI loads.
3. **Cross-supplier isolation.** Every supplier-bound xlsx is filtered to one supplier's data; a defensive cell-level scan refuses export with `IsolationViolation` if any other supplier's name leaks.
4. **No buyer-internal-only fields in supplier-bound files.** Outbound RFQs do NOT include historical paid prices. Award letters carry the supplier's own bid + qty + delivery only.
5. **RFQ math is to-the-penny.** No rounding, no medians, no smoothing in displayed prices. Analytical references (90-day medians for spike detection) are clearly labeled and never substitute for the exact most-recent unit price.

---

This is a personal productivity tool. Use at your own discretion. Outputs should be verified against source data before being used to support any official business action or update to a system of record.
