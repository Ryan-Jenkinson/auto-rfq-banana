# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is for

`auto-rfq-banana` is a self-contained, Windows-deployable browser app that automates the front end of Andersen MRO RFQ work: drop a multi-year supplier export, get a deduplicated candidate RFQ list with multi-window analytics, then (Phase 2+) generate per-supplier RFQ workbooks, ingest returned bids, and run side-by-side comparison with outlier flagging. Sibling to `supplier-pricing` (per-cycle price-file analysis) and `supplier-recon` (Coupa go-live).

The architecture is the same proven Pyodide / openpyxl stack as those tools — Python in the browser via WebAssembly, no data leaves the user's machine, no AI, no CDN at runtime, IT-approval-free distribution. What differs is the **inverted data model**: instead of matching one supplier's new file against an item master, this app *builds* the master from the supplier's own multi-year history, then sends it back out to N suppliers for competitive bidding.

The full plan (context, decisions, phase breakdown, files to port, hard constraints) lives at `~/.claude/plans/i-want-to-make-compressed-glacier.md`. Read it before any non-trivial change.

## Run the app

For development on Mac, the simplest path:

```bash
cd /Users/ryanjenkinson/Desktop/work/auto-rfq-banana
python3 -m http.server 8000
# then open http://localhost:8000/app.html
```

For Windows distribution, double-clicking `start.bat` does the same thing.

## File map (4-file Pyodide pattern)

| File | What it owns |
|---|---|
| `app.html` | DOM shell only — legal-gate markup, splash markup, step containers, script/link tags. Keep thin (~120 lines). |
| `app.css` | All styling. Banana Split palette: chocolate ground (`#1a120a`), cream text (`#fdf6e3`), banana primary (`#fce985`), strawberry warnings (`#ff6f8e`). |
| `app.js` | Boot diagnostics IIFE, legal-gate IIFE, splash + pixel character (gavel), Pyodide bootstrap, dropzone wiring, step transitions, table/chart render, xlsx download glue. |
| `app.py` | All Python. Loaded via `fetch('./app.py').then(text => pyodide.runPythonAsync(text))`. Registers itself as `app_engine` in `sys.modules` so JS can call `from app_engine import ...`. |
| `verify_rfq.py` | Sibling Python script — independent recompute of headline KPIs from the same source export, via a deliberately-different code path. Run with `python3 verify_rfq.py /path/to/export.xlsx`. The "going to a director, prove the math" red/green check. |
| `start.bat` | Windows launcher (`py -m http.server 8000` + open browser). |
| `pyodide/`, `wheels/` | Local Pyodide runtime + `openpyxl` 3.1.5 + `et_xmlfile` 1.1.0. Bundled — no PyPI / CDN at runtime. |

## Architecture details that aren't obvious from the file map

**Pyodide bootstrap order matters.** `app.js` runs the legal-gate IIFE first (top of file) so the gate is interactive even if everything below throws. Boot diagnostics + global error trap come even earlier — line 1 — so a silent JS hang turns into a visible "BOOT ERROR: …" on the loading overlay instead of an infinite "initializing…". When debugging "the app won't load", check the load-status text first.

**Anchor "now" to the data, not the wall clock.** `extract_rfq_list` in `app.py` computes the 12/24/36-month windows relative to the *most recent order date* in the export, not `datetime.now()`. Exports are often a few weeks stale; using wall-clock would silently drop the most recent window of activity.

**Module-level state in `app.py`.** After `extract_rfq_list` runs, the result is cached in `_STATE` so `gen_candidate_rfq_list_xlsx` can read it without re-parsing. Don't refactor this away unless the xlsx generator can run in the same Python call as the extraction.

**Splash character.** Defined as a 22×30 grid of 2-char tokens in `SPLASH_GRID`/`SPLASH_PALETTE` (top of `app.js`). Each non-`..` token maps to a hex color and renders as a 1×1 SVG `<rect>`. Current character is a vertical gavel + sound block (placeholder for a fuller auctioneer figure later). To redesign: edit the grid, keep every row at exactly 22 tokens.

## Hard constraints (do not break)

1. **No CDN at runtime.** All Pyodide + wheel files live in `pyodide/` and `wheels/`. Audit with `grep -r "cdn.jsdelivr.net" *.html *.js` returning nothing. Any new dep must be downloaded into `wheels/` and referenced by relative path.
2. **Legal gate first.** Full-screen Accept / Exit blocks UI until clicked. Canonical text is in `~/.claude/skills/workpackage/references/templates.md` — do not customize per-tool.
3. **Cross-supplier isolation (Phase 2+).** Every supplier-bound export must filter to one supplier's data. Defensive double-check at write time. Future `verify_isolation.py` will assert no cross-supplier rows in any award letter.
4. **No Andersen-internal-only fields in supplier-bound files.** No internal target / cost / margin / last-paid prices in any RFQ workbook destined for a supplier. Same-supplier history echo is OK (they billed it themselves) but should be omitted from outbound RFQs in Phase 2 by default.
5. **Browser main thread must not block.** When extraction grows past Phase 1's single call, split into stages with `await new Promise(r => setTimeout(r, 0))` between calls — same pattern as supplier-pricing's `match_chunk` loop. Avoids Chrome/Edge "Page Unresponsive" on Andersen Windows laptops.
6. **Aliases must be multi-word or distinctive.** Bare common words (`unit`, `cost`, `id`, `price`) in `EXPORT_ALIASES` will collide (`unit` matches `Unit Price`). Always use phrases like `"unit price"` not `"unit"`.

## Cache + browser-refresh hygiene

- During dev, plain `Cmd+R` (NOT `Cmd+Shift+R`). Hard-refresh re-downloads ~13 MB of Pyodide every time.
- For a real fresh load: DevTools open → right-click refresh → **Empty Cache and Hard Reload**. Or open in a fresh Incognito window.
- Never add `?v=...` cache-bust query strings — they only invalidate the parent HTML, not the WASM, and waste bandwidth in confusing ways.

## Bundle for distribution

Same pattern as supplier-pricing:

```bash
rm -f ~/Desktop/auto-rfq-banana_bundle.zip
zip -r ~/Desktop/auto-rfq-banana_bundle.zip auto-rfq-banana \
  -x "*.DS_Store" "*/__pycache__/*" "*.git/*" "samples/*" "scratch/*"
```

The zip drops on a Windows laptop; user unzips, double-clicks `start.bat`, app opens.

## What's reused from supplier-pricing (when porting more)

This repo started fresh per Ryan's "don't fork supplier-pricing wholesale" decision, but the engine pieces below are direct ports (or candidates for porting in Phase 2+). Source paths refer to the donor:

- `app.py` lines 25–48: `MFG_ALIASES` + `canon_mfg` (already ported)
- `app.py` lines 12–102, 581–837: `match_chunk` Tier 0–4 cascade + helpers (port in Phase 2 for returned-bid intake)
- `app.py` line 1005: `autosize` MergedCell-skip helper (already ported)
- `app.js` lines 27–59: legal-gate IIFE (already ported, verbatim)
- `app.js` lines 1–20: boot diagnostics + error trap (already ported, verbatim)
- `app.js` lines 315–377: `renderMappingTable` + `readMapping` (already ported pattern; new `RFQ_FIELDS` definition)
- `app.js` lines 1201, 1322, 1494: bookmark-stable folder pattern (port in Phase 2 for per-RFQ-event folders)

## Roadmap

- **Phase 1 (current):** RFQ-list extraction + multi-window analytics + candidate-list xlsx export. ✅
- **Phase 2:** Supplier count + names UI; per-supplier RFQ xlsx generator (Andersen-branded, blank fillable, no internal fields); returned-bid intake with column-mapping + match cascade; cross-supplier comparison matrix; outlier detector (bid-vs-median, bid-vs-history, bid-vs-self).
- **Phase 3:** Award decisions UI; per-supplier award letters with isolation guard; `verify_isolation.py`; internal award summary.

See `~/.claude/plans/i-want-to-make-compressed-glacier.md` for the full plan + verification criteria for each phase.
