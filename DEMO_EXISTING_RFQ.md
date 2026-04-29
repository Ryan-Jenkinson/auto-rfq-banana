# Demo: existing RFQ (Fastenal bid back on hand-made McMaster sheet)

This branch (`demo-existing-rfq`) exists to support a one-off demo using the Fastenal bid back from the McMaster RFQ that was issued before this app was built. **No code changes were needed** — the existing parser handles the hand-made sheet format natively. This file just documents the demo workflow.

## Data files

| File | Role | Path |
|---|---|---|
| Multi-year McMaster Coupa export | Candidate item source — populates the RFQ list with all McMaster items + their last-paid pricing | `~/Downloads/McMaster Coupa.xlsx` |
| Fastenal bid response | The supplier's filled-in pricing | `~/Downloads/rfq/Fastenal/Fastenal 4.23.xlsx` |

## Workflow in the app

1. **Launch the app**: double-click `Spend Sleuth.bat`... wait, this is the RFQ app. Double-click `start.bat` (port 8003 after the recent multi-app port reassignment).
2. **Step 1 — Drop the McMaster Coupa file.** This populates the candidate item list with all 11,169 McMaster items + their historical pricing.
3. **Step 2 — Confirm column mapping** if prompted. Auto-mapper should get this right.
4. **Step 3 — Skip the smart-trim** (or accept it). For this demo specifically, you can SKIP the curation step entirely — the comparison just operates on whatever items are present.
5. **Step 4 — Drop the Fastenal bid file** in the bid-intake dropzone. The parser auto-detects the hand-made sheet format ("our format" — same shape as the original pre-app RFQ template, since that's what the new template was based on).
6. **View comparison matrix.** Items with both a Fastenal bid AND a McMaster anchor get a recommendation (ACCEPT / PUSH_BACK / ASK_CLARIFICATION / MANUAL_REVIEW / EXCLUDE).

## Expected results (validated end-to-end via Python smoke test)

| Metric | Value |
|---|---|
| McMaster candidate items extracted | 11,169 |
| Fastenal bid lines parsed | 4,347 |
| With priced bid | 1,815 |
| Items with BOTH Fastenal price AND McMaster anchor | **1,099** (the defensible comparison set) |

**Recommendation breakdown for the 1,099 comparable items:**

| Recommendation | Count |
|---|---|
| ASK_CLARIFICATION | 742 (largely UOM-mismatch items — see caveats below) |
| ACCEPT | 153 (clear savings vs McMaster anchor) |
| MANUAL_REVIEW | 106 |
| PUSH_BACK | 52 (Fastenal more expensive than anchor) |
| EXCLUDE | 46 |

## Three-supplier savings picture (after the branch's bug fix + clean savings filter)

End-to-end test on all three real bid files (Fastenal, Grainger, MSC) against the McMaster Coupa multi-year history:

| Supplier | RAW $ (current display) | CLEAN $ (status-filtered) | STRICT $ (status + UOM-match) | Items in strict set |
|---|---|---|---|---|
| Fastenal | **−$1,742,020** | $34,405 | **+$24,792** | 278 |
| MSC | −$570,304 | −$570,304 | **−$606,348** | 1,451 |
| Grainger | −$1,501,253 | −$1,501,253 | **−$1,346,424** | 2,285 |
| **TOTAL** | **−$3,813,576** | −$2,037,152 | **−$1,927,979** | |

**RAW = current dashboard behavior** — the −$3.8M figure is dominated by UOM mismatches where Fastenal quotes per-each (e.g., $0.0123) against McMaster anchors that are per-package (e.g., $1.23). Multiplied across thousands of units, the apparent "loss" is an artifact, not real procurement signal.

**CLEAN = excludes lines flagged UOM_DISC / NO_BID / NEED_INFO / SUBSTITUTE.** Catches Fastenal's explicit UOM-discrepancy notes but doesn't help with Grainger/MSC where the mismatch is implicit (they quote in their own units without flagging).

**STRICT = CLEAN + bid UOM matches history UOM.** The most defensible figure. This is what to use in director conversations.

### What the STRICT numbers actually mean for the director

> "Across 4,000+ truly comparable line items (where the UOMs match and the bid status is clean), McMaster is currently CHEAPER than the three RFQ suppliers IN AGGREGATE by about $1.9M over a 24-month qty horizon. That doesn't mean we shouldn't switch — it means **blanket switching loses money, but per-item carve-outs save money.** Fastenal is the only supplier with net savings (~$25K) on items where they beat McMaster. Grainger and MSC each have hundreds of items where they're cheaper (the carve-out opportunities), but more items where they're more expensive."

The recommendation engine already surfaces this as ACCEPT items per-supplier:
- 153 ACCEPT items for Fastenal (= clear savings vs history)
- Similar buckets for Grainger and MSC

The carve-out award strategy in the comparison matrix is the right operationalization of this.

## UOM Resolution Queue workflow (new on this branch)

The dashboard now has a **📐 UOM Resolution Queue** button next to the savings tiers. Click it to open a panel where you can resolve UOM mismatches manually — analyst types in the conversion factor based on offline catalog/stockroom lookups, items move from STRICT-excluded to NORMALIZED savings as you save them.

### Workflow

1. Run analysis as normal — the savings panel shows RAW / CLEAN / STRICT totals
2. Click **📐 UOM Resolution Queue** in the savings panel header
3. Panel slides open showing every (item, supplier) pair with a UOM mismatch, sorted by 24-month spend descending
4. For each item:
   - **Look up McMaster catalog or stockroom** (this is offline analyst work — the app has no AI in production)
   - Enter the conversion factor in `1 [hist_uom] = N [bid_uom]` form
   - Pick direction: `auto-detect` (let the app pick whichever makes more sense), `multiply`, or `divide`
   - Click **Save** → annotation persists, item leaves the queue, NORMALIZED savings re-compute
   - Or **Skip** if you don't want to deal with it now (won't show again until you clear it)
   - Or **Needs review** if you want a tracked TODO that stays in the queue
5. Annotations persist with the JSON save file — your colleague gets your resolution work when they open your shared backup

### Auto-suggestions

For some Fastenal notes, the app extracts a suggested factor:
- **HIGH confidence ✓** (green chip): `Pack of N`, `(N Pack)`, `(N/Pack)`, `Bag/Box/Carton of N` — explicit count, factor is reliable
- **LOW confidence ?** (amber chip): `(N' Spool)`, `(N' Roll)`, `(N' Reel)` — N is the supplier's spool length but might NOT be the conversion factor (depends on McMaster's spool size, which we don't know from the notes alone)
- **Unit-only**: `(Per Inch / Per Foot / Per Each)` — tells us the supplier's unit but factor must come from analyst

The factor field auto-fills with the suggested value but the analyst still has to click **Save** to commit. **Don't blindly accept low-confidence suggestions** — verify against the actual catalog first.

### Direction handling

- **multiply** — supplier quoted in smaller units than McMaster. Adjusted bid = bid_price × factor. Use when McMaster sells in PK and Fastenal quoted per EA.
- **divide** — supplier quoted in larger units. Adjusted bid = bid_price ÷ factor. Use when McMaster sells per EA and Fastenal quoted per case-of-N.
- **auto-detect** — at apply-time, the app computes both candidates and picks whichever puts the adjusted bid closer to McMaster's anchor. Useful when you're not sure of direction; risky for cases where both directions are wildly off (the app picks "less wrong" but still wrong).

### What gets saved

Annotations live in `_STATE["uom_annotations"]` keyed by `<item_key>|<supplier>`. They ride through `serialize_state()` / `restore_state()` so:
- Your in-progress work survives 60-second autosave + browser refresh
- A manual save file you email to your director includes all your resolutions
- They can re-open the same file later and you'll see what you'd done before

## Bug fixes shipped on this branch

1. **`_matches_no_bid` word-boundary fix** — `"na"` was a no-bid marker that matched `"fasteNAl"` via substring search. Result: every Fastenal note containing the word "Fastenal" got mis-classified as NO_BID. Fixed with regex word boundaries on the short markers (`na`, `tbd`, `n/a`). Multi-word markers stay as substring (no risk of accidental match). Caught 1,896 priced bids vs 1,815 before the fix (+81 correctly recovered).

2. **`compute_clean_savings_summary()` (additive)** — new function that produces the RAW / CLEAN / STRICT savings tiers per supplier. Doesn't modify any existing pipeline output. JS dashboard can opt into rendering the cleaned numbers alongside the existing display.

Both fixes are good candidates to backport to main:
- The no_bid fix is unambiguously correct — would benefit production usage with any supplier whose name happens to contain "na" (Fastenal is the obvious example, but also any "national", "international", "Carolina"-named supplier).
- The clean savings function is opt-in — surfacing it in the dashboard is the next decision.

## Caveats to call out during the demo

1. **UOM-mismatch items dominate the ASK_CLARIFICATION bucket.** Many McMaster fasteners are sold in packages (of 10, 50, etc.) where Fastenal sells per-each. The bid file's notes column flags these clearly ("UOM DISCREPANCY, FASTENAL IS PER EACH, MCMASTER IS PER PACKAGE"). The comparison can't trust the per-unit price comparison until UOM is normalized — which is the entire point of the ASK_CLARIFICATION bucket. Resolve manually for the high-spend ones, push the rest back to Fastenal for confirmation.

2. **NO_BID classification is over-eager.** 2,532 lines get marked NO_BID by the parser, but inspection shows some have valid prices + UOM-discrepancy notes (should be UOM_DISC instead). The `_matches_no_bid(notes)` substring check appears to be triggering on some UOM-discrepancy phrasings. Polish item to fix in main, not on this branch — flagged in the project polish backlog memory.

3. **Match-back rate is limited by overlap.** Fastenal quoted on 4,347 unique parts — many of which are items the app's smart-trim WOULD HAVE EXCLUDED from a generated outbound RFQ. For the demo, that's fine: we're feeding the FULL Coupa item set as candidates, so any Fastenal-quoted item that has McMaster history will compare. About 1,099 of 4,347 Fastenal-quoted items have a usable McMaster anchor (~25%) — the remainder are either items McMaster never had pricing for (Fastenal added to the supplier-side wishlist) or have ambiguous part-number matching.

4. **Net implied savings = -$1.74M** — this is the headline if you accepted EVERY Fastenal price including the UOM-mismatch ones, which would be wrong. The actual usable savings story comes from the 153 ACCEPT items and a fraction of the ASK_CLARIFICATION items after UOM normalization. The demo conversation should frame this carefully — the engine surfaces all the comparisons, the procurement judgment is in the curation.

## Reproducing the smoke test

```bash
cd /Users/ryanjenkinson/Desktop/work/auto-rfq-banana
python3 << 'EOF'
import sys; sys.path.insert(0, ".")
import app

# 1. Load McMaster Coupa as candidate source
with open("/Users/ryanjenkinson/Downloads/McMaster Coupa.xlsx", "rb") as f:
    raw = f.read()
mapping = app.auto_map_export(app.inspect_workbook(raw)["headers"])
app.extract_rfq_list(raw, mapping)

# 2. Ingest Fastenal bid
with open("/Users/ryanjenkinson/Downloads/rfq/Fastenal/Fastenal 4.23.xlsx", "rb") as f:
    parsed = app.ingest_supplier_bid(f.read(), "Fastenal")
print("Bid parsed:", parsed["summary"])

# 3. Compute comparison matrix
matrix = app.compute_comparison_matrix()
print(f"Matrix rows: {len(matrix['rows'])}")
EOF
```

## Branch policy

This branch is intentionally separate from `main` so the demo workflow + this notes file don't pollute the production codebase. Once the demo is done:

- **Keep**: nothing on this branch needs to merge to main since no code changed
- **Delete**: `git branch -D demo-existing-rfq` whenever you're done with the demo

If we end up needing app code changes for follow-on demos (e.g., to fix the UOM_DISC misclassification surfaced above, or to relax the smart-trim default), do those on `main` separately.
