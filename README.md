# Auto RFQ Banana

Self-contained, Windows-deployable browser app for **multi-supplier RFQ work**. Drop in a multi-year supplier export, the app builds the candidate RFQ item list automatically with multi-window analytics. Phase 2+ will add per-supplier RFQ generation, returned-bid intake, and side-by-side comparison.

Pairs with sibling apps `supplier-pricing` (per-cycle price-file analysis) and `supplier-recon` (Coupa go-live). Same Pyodide / openpyxl stack; same legal-gate + splash pattern; new domain.

## What it does (Phase 1 — shipped)

1. Drop a multi-year supplier export (`xlsx`) — typically a Coupa / EAM PO history pulled for one supplier.
2. App auto-detects the relevant columns (Item #, EAM Part #, Manufacturer, Order Date, Qty, Price, PO #, UOM, etc.). Confirm or override.
3. App dedupes lines into a unique-item list and aggregates per-window:
   - 12 / 24 / 36-month spend + qty per item
   - All-time totals
   - Distinct-PO counts
   - UOM-mixed flag (catches data hygiene issues)
   - Last unit price + last order date
4. Multi-window dashboard with KPIs, top-15-by-spend bars, annual-spend bars.
5. Per-row include/exclude — trim the list before export.
6. Export the candidate RFQ list as `xlsx` (3 sheets: candidate list, summary, annual spend).

## Run it (Windows)

1. Unzip `auto-rfq-banana_bundle.zip` somewhere convenient (Desktop is fine).
2. Double-click `start.bat`. A console window opens; your default browser opens to `http://localhost:8000/app.html`.
3. Accept the disclaimer (full-screen Accept / Exit gate). Splash → press Enter to start.
4. Drop your multi-year export. Confirm column mapping. Build RFQ list. Export.
5. To stop: close the `start.bat` console window.

Requires Python 3.x on the PATH (any recent install works). No admin rights needed; nothing leaves your machine.

## File map

| File | Purpose |
|---|---|
| `app.html` | DOM shell — legal gate, splash, step containers, script/link tags |
| `app.css` | All styling (Banana Split palette: chocolate / cream / banana / strawberry) |
| `app.js` | Boot diagnostics, legal-gate IIFE, splash, Pyodide bootstrap, UI orchestration |
| `app.py` | Parsing, column auto-detect, dedupe + windowed aggregation, xlsx generator |
| `start.bat` | Windows one-click launcher |
| `pyodide/` | Local Pyodide runtime (no CDN at runtime) |
| `wheels/` | Local Python wheels (`openpyxl`, `et_xmlfile`) |
| `verify_rfq.py` | Independent recompute of headline numbers — red/green check on the in-app math |

## Hard constraints

1. **Local-only runtime.** No CDN at runtime, no network calls, no AI, no telemetry.
2. **Cross-supplier isolation.** Phase 2+ will enforce strict per-supplier filtering on every supplier-bound export. No supplier sees another supplier's data, ever.
3. **No Andersen-internal-only fields in supplier-bound files.** No internal target prices, costs, margins, or last-paid prices in any RFQ workbook sent out.
4. **Legal gate first.** Full-screen Accept / Exit before any UI is interactive.
5. **Browser main thread must not block.** Long Python work is split into stages with `await new Promise(r => setTimeout(r, 0))` between calls.

## Roadmap

- **Phase 2:** per-supplier RFQ xlsx generator (Andersen-branded, blank fillable columns), supplier-count input, returned-bid intake, comparison matrix, outlier detector.
- **Phase 3:** award-decisions UI, per-supplier award letters with isolation guard, `verify_isolation.py`, internal award summary.

See `/Users/ryanjenkinson/.claude/plans/i-want-to-make-compressed-glacier.md` for the full plan.

## Questions / issues

ryan.jenkinson@andersencorp.com — best-effort help only; not Andersen-approved or endorsed.
