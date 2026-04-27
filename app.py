"""auto-rfq-banana — Python engine (Pyodide-loaded at boot).

Module name: app_engine (we register it under that name so app.js can `from app_engine import ...`).

Stage A (Phase 1): parse a multi-year supplier export and build a deduplicated
candidate RFQ item list with multi-window aggregations + annual breakdowns.

Pattern source: supplier-pricing/app.py — alias system, MFG canonicalization,
normalization helpers. Stripped of per-cycle / matching logic — this app
inverts the model (build the master from history, not match against it).
"""

from __future__ import annotations

import io
import re
import sys
import json
import math
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Any

from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.cell import MergedCell


# ---------------------------------------------------------------------------
# Normalization helpers (port from supplier-pricing/app.py)
# ---------------------------------------------------------------------------

def norm_pn(s) -> str:
    """Normalize a part number for keying — strip non-alphanumerics, uppercase."""
    if s is None:
        return ""
    return re.sub(r"[^A-Z0-9]", "", str(s).upper())


def norm_text(s) -> str:
    if s is None:
        return ""
    return re.sub(r"\s+", " ", str(s)).strip()


def safe_float(v):
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return float(v)
    try:
        s = str(v).replace(",", "").replace("$", "").strip()
        return float(s) if s else None
    except (ValueError, TypeError):
        return None


def parse_date(v):
    if v is None or v == "":
        return None
    if isinstance(v, datetime):
        return v
    s = str(v).strip()
    if not s:
        return None
    # Excel date strings come in many flavors; try the common ones
    for fmt in (
        "%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%m/%d/%Y", "%m/%d/%y",
        "%d/%m/%Y", "%Y/%m/%d", "%m-%d-%Y",
    ):
        try:
            return datetime.strptime(s.split(" ")[0] if fmt == "%Y-%m-%d" else s, fmt)
        except ValueError:
            continue
    return None


# Manufacturer aliases — verbatim port from supplier-pricing
MFG_ALIASES = {
    "AB": "ALLEN-BRADLEY", "ALLENBRADLEY": "ALLEN-BRADLEY",
    "TB": "THOMAS AND BETTS", "T&B": "THOMAS AND BETTS",
    "GE": "GENERAL ELECTRIC",
    "SQ D": "SQUARE D", "SQD": "SQUARE D",
    "HUB": "HUBBELL", "HUBBL": "HUBBELL",
    "PAN": "PANDUIT", "PND": "PANDUIT",
    "EATN": "EATON",
    "RKWL": "ROCKWELL", "ROCK": "ROCKWELL", "RA": "ROCKWELL",
    "FEST": "FESTO",
    "SMC": "SMC",
    "OMRON": "OMRON",
    "SIEMENS": "SIEMENS",
    "SCHNEIDER": "SCHNEIDER",
    "NUM": "NUMATICS",  # NUMATICS often appears as "NUM" prefix in JHF data
}


def canon_mfg(s) -> str:
    if not s:
        return ""
    raw = re.sub(r"[^A-Z0-9 &-]", "", str(s).upper()).strip()
    if raw in MFG_ALIASES:
        return MFG_ALIASES[raw]
    # Try first token
    first = raw.split()[0] if raw.split() else ""
    if first in MFG_ALIASES:
        return MFG_ALIASES[first]
    return raw


# ---------------------------------------------------------------------------
# Column alias system — for the multi-year export
# ---------------------------------------------------------------------------
# Each value is a list of substring patterns (case-insensitive). First match wins.
# Patterns are MULTI-WORD or distinctive — never a bare common word that could
# false-positive (per supplier-pricing dev-lessons memory item #3).

EXPORT_ALIASES = {
    "item_num":    ["item #", "item number", "andersen item", "item num", "item id"],
    "eam_pn":      ["eam part number", "eam part", "eam pn", "eam part #", "eam #"],
    "description": ["item name", "detailed item", "description", "item description", "long description", "desc"],
    "mfg_name":    ["manufacturer name", "manufacturer", "mfg name", "mfr name", "make"],
    "mfg_pn":      ["manufacturer part #", "manufacturer part number", "mfg part #", "mfr part", "mpn", "manufacturer pn", "mfg pn"],
    # part_number = supplier's own catalog SKU (e.g. McMaster's "5709A45").
    # MUST come AFTER mfg_pn so "Manufacturer Part Number" gets claimed first.
    # Used as a fallback dedup key when item_num + eam_pn are both blank
    # (McMaster orders via cXML mostly leave those Andersen-side fields empty).
    "part_number": ["part number", "supplier part number", "supplier sku", "supplier auxiliary part number", "catalog number", "catalog #"],
    "order_date":  ["order date", "po date", "transaction date", "date ordered", "po creation date"],
    "qty":         ["quantity", "qty ordered", "qty received", "order qty", "qty"],
    "unit_price":  ["unit price", "price per unit", "unit cost", "price each", "current price", "price"],
    "po_number":   ["po number", "po #", "purchase order", "po num", "po no"],
    "uom":         ["unit of measure", "uom", "unit measure", "u/m", "purch uom"],
    "commodity":   ["commodity", "category", "product category", "spend category"],
    "supplier":    ["supplier name", "supplier", "vendor name", "vendor"],
}


def _is_blanky(s) -> bool:
    """Treat 'N/A', '#N/A', '-', '—', '(blank)', etc. as effectively blank.
    McMaster orders set Manufacturer / MFG Part Number to literal 'N/A'."""
    if s is None:
        return True
    t = str(s).strip().upper()
    return t in ("", "N/A", "#N/A", "NA", "-", "—", "(BLANK)", "NULL", "NONE")


def auto_map_export(headers: list) -> dict:
    """Given a list of header strings, return {field → header_idx} where matched.

    Two-pass: exact-equality first across all (field, pattern) pairs, THEN
    substring fallback for fields that didn't get an exact hit. Without this,
    a substring like "part number" matching "Supplier Auxiliary Part Number"
    (mostly empty col) wins over the literal "Part Number" column that's
    actually populated. McMaster bug 2026-04-26."""
    out = {}
    norm_headers = [norm_text(h).lower() if h else "" for h in headers]

    # Pass 1: exact equality
    for field, patterns in EXPORT_ALIASES.items():
        for pat in patterns:
            pat_l = pat.lower()
            for i, h in enumerate(norm_headers):
                if not h or i in out.values():
                    continue
                if h == pat_l:
                    out[field] = i
                    break
            if field in out:
                break

    # Pass 2: substring fallback for unmapped fields
    for field, patterns in EXPORT_ALIASES.items():
        if field in out:
            continue
        for pat in patterns:
            pat_l = pat.lower()
            for i, h in enumerate(norm_headers):
                if not h or i in out.values():
                    continue
                if pat_l in h:
                    out[field] = i
                    break
            if field in out:
                break
    return out


# ---------------------------------------------------------------------------
# Workbook inspection (cheap header peek)
# ---------------------------------------------------------------------------

def inspect_workbook(file_bytes) -> dict:
    if not isinstance(file_bytes, (bytes, bytearray)):
        file_bytes = bytes(file_bytes)
    wb = load_workbook(io.BytesIO(file_bytes), data_only=True, read_only=True)
    # Pick the first non-empty sheet (most exports have a single data sheet)
    sheet_name = None
    headers = []
    row_count = 0
    for name in wb.sheetnames:
        ws = wb[name]
        rows_iter = ws.iter_rows(values_only=True)
        first = next(rows_iter, None)
        if first is None:
            continue
        headers = [norm_text(c) for c in first]
        sheet_name = name
        # Count rows quickly via max_row attr
        row_count = max(0, (ws.max_row or 1) - 1)
        break
    wb.close()
    return {
        "sheet_name": sheet_name or "",
        "headers": headers,
        "row_count": row_count,
    }


# ---------------------------------------------------------------------------
# Module-level state (so xlsx generator can read post-extraction)
# ---------------------------------------------------------------------------
_STATE: dict = {
    "items": [],
    "kpis": {},
    "annual_spend": [],
    "supplier_name": "",
    "source_file_stem": "",
    "windows": (12, 24, 36),
}


# ---------------------------------------------------------------------------
# Extraction — multi-year export → deduped item list with windowed aggs
# ---------------------------------------------------------------------------

def _add(d: dict, k, v):
    d[k] = d.get(k, 0) + v


def _extract_rows(file_bytes, mapping: dict) -> list:
    """Stream rows from the workbook, returning a list of dicts (parsed)."""
    if not isinstance(file_bytes, (bytes, bytearray)):
        file_bytes = bytes(file_bytes)
    wb = load_workbook(io.BytesIO(file_bytes), data_only=True, read_only=True)
    ws = wb[wb.sheetnames[0]]

    # Resolve column indexes once
    def col(field):
        i = mapping.get(field)
        return i if (i is not None and i >= 0) else None

    c_item = col("item_num")
    c_eam = col("eam_pn")
    c_desc = col("description")
    c_mfg = col("mfg_name")
    c_mpn = col("mfg_pn")
    c_part = col("part_number")
    c_date = col("order_date")
    c_qty = col("qty")
    c_price = col("unit_price")
    c_po = col("po_number")
    c_uom = col("uom")
    c_comm = col("commodity")
    c_sup = col("supplier")

    def _clean(v):
        """norm_text but also coerce literal 'N/A'-style values to ''."""
        s = norm_text(v)
        return "" if _is_blanky(s) else s

    rows = []
    first = True
    for row in ws.iter_rows(values_only=True):
        if first:
            first = False
            continue
        if row is None:
            continue
        def g(i):
            return None if (i is None or i >= len(row)) else row[i]
        item = _clean(g(c_item)) if c_item is not None else ""
        eam = _clean(g(c_eam)) if c_eam is not None else ""
        part = _clean(g(c_part)) if c_part is not None else ""
        # Dedup-key fallback: Andersen Item # → EAM Part # → supplier Part Number.
        # Distributors that order via cXML (McMaster, Grainger PunchOut, etc.)
        # often leave the Andersen-side fields blank because the part lives in
        # the supplier's catalog, not Andersen's item-master.
        key_raw = item or eam or part
        if not key_raw:
            continue
        rows.append({
            "key": norm_pn(key_raw),
            "item_num": item or eam or part,
            "eam_pn": eam,
            "part_number": part,
            "description": _clean(g(c_desc)) if c_desc is not None else "",
            "mfg_name": _clean(g(c_mfg)) if c_mfg is not None else "",
            "mfg_pn": _clean(g(c_mpn)) if c_mpn is not None else "",
            "order_date": parse_date(g(c_date)) if c_date is not None else None,
            "qty": safe_float(g(c_qty)) if c_qty is not None else None,
            "unit_price": safe_float(g(c_price)) if c_price is not None else None,
            "po": _clean(g(c_po)) if c_po is not None else "",
            "uom": _clean(g(c_uom)) if c_uom is not None else "",
            "commodity": _clean(g(c_comm)) if c_comm is not None else "",
            "supplier": _clean(g(c_sup)) if c_sup is not None else "",
        })
    wb.close()
    return rows


def extract_rfq_list(file_bytes, mapping: dict) -> dict:
    """Build the candidate RFQ item list from a multi-year export.

    Returns:
        {
          "kpis": {...},
          "items": [{item_num, description, mfg_name, mfg_pn, qty_12mo, spend_12mo, ...}],
          "annual_spend": [{year, spend, item_count}, ...]
        }
    """
    rows = _extract_rows(file_bytes, mapping)
    if not rows:
        return {"kpis": {}, "items": [], "annual_spend": []}

    # Anchor "now" at the most recent order date in the data — not real today,
    # because the export might be a few weeks stale.
    valid_dates = [r["order_date"] for r in rows if r["order_date"]]
    now = max(valid_dates) if valid_dates else datetime.now()
    cutoffs = {
        12: now - timedelta(days=365),
        24: now - timedelta(days=730),
        36: now - timedelta(days=1095),
    }

    items: dict = defaultdict(lambda: {
        "key": "",
        "item_num": "",
        "eam_pn": "",
        "part_number": "",
        "description": "",
        "mfg_name_counts": Counter(),
        "mfg_pn_counts": Counter(),
        "uom_counts": Counter(),
        "commodity_counts": Counter(),
        "po_set": set(),
        # Per-item PO line list, used by the per-item drill-down modal.
        # Each entry: (date_iso, qty, unit_price, line_total, po, uom)
        "po_lines": [],
        "qty_12mo": 0.0, "spend_12mo": 0.0,
        "qty_24mo": 0.0, "spend_24mo": 0.0,
        "qty_36mo": 0.0, "spend_36mo": 0.0,
        "qty_all": 0.0,  "spend_all": 0.0,
        "first_order": None, "last_order": None,
        "last_unit_price": None,
        "last_order_dt": None,
    })

    annual: dict = defaultdict(lambda: {"spend": 0.0, "items": set(), "qty": 0.0})
    supplier_counter = Counter()
    line_count = 0

    for r in rows:
        if r["qty"] is None or r["unit_price"] is None or r["order_date"] is None:
            continue
        line_count += 1
        ext = r["qty"] * r["unit_price"]
        k = r["key"]
        rec = items[k]
        rec["key"] = k
        if not rec["item_num"]:
            rec["item_num"] = r["item_num"]
            rec["eam_pn"] = r["eam_pn"]
            rec["part_number"] = r["part_number"]
        # Description: take the first non-empty seen (descriptions vary slightly across years)
        if not rec["description"] and r["description"]:
            rec["description"] = r["description"]
        if r["mfg_name"]:
            rec["mfg_name_counts"][r["mfg_name"]] += 1
        if r["mfg_pn"]:
            rec["mfg_pn_counts"][r["mfg_pn"]] += 1
        if r["uom"]:
            rec["uom_counts"][r["uom"]] += 1
        if r["commodity"]:
            rec["commodity_counts"][r["commodity"]] += 1
        if r["po"]:
            rec["po_set"].add(r["po"])

        rec["po_lines"].append((
            r["order_date"].date().isoformat() if r["order_date"] else "",
            r["qty"],
            r["unit_price"],
            ext,
            r["po"],
            r["uom"],
        ))

        rec["qty_all"] += r["qty"]
        rec["spend_all"] += ext

        d = r["order_date"]
        if rec["first_order"] is None or d < rec["first_order"]:
            rec["first_order"] = d
        if rec["last_order_dt"] is None or d > rec["last_order_dt"]:
            rec["last_order_dt"] = d
            rec["last_unit_price"] = r["unit_price"]

        for w in (12, 24, 36):
            if d >= cutoffs[w]:
                rec[f"qty_{w}mo"] += r["qty"]
                rec[f"spend_{w}mo"] += ext

        # Annual rollup
        y = d.year
        annual[y]["spend"] += ext
        annual[y]["qty"] += r["qty"]
        annual[y]["items"].add(k)

        if r["supplier"]:
            supplier_counter[r["supplier"]] += 1

    # Flatten items
    out_items = []
    for k, rec in items.items():
        mfg_name = rec["mfg_name_counts"].most_common(1)[0][0] if rec["mfg_name_counts"] else ""
        mfg_pn = rec["mfg_pn_counts"].most_common(1)[0][0] if rec["mfg_pn_counts"] else ""
        commodity = rec["commodity_counts"].most_common(1)[0][0] if rec["commodity_counts"] else ""
        uoms = rec["uom_counts"].most_common()
        uom = uoms[0][0] if uoms else ""
        uom_mixed = len(uoms) > 1
        out_items.append({
            "key": rec["key"],
            "item_num": rec["item_num"],
            "eam_pn": rec["eam_pn"],
            "part_number": rec["part_number"],
            "description": rec["description"],
            "mfg_name": mfg_name,
            "mfg_pn": mfg_pn,
            "commodity": commodity,
            "uom": uom,
            "uom_mixed": uom_mixed,
            "po_count": len(rec["po_set"]),
            "qty_12mo": rec["qty_12mo"], "spend_12mo": rec["spend_12mo"],
            "qty_24mo": rec["qty_24mo"], "spend_24mo": rec["spend_24mo"],
            "qty_36mo": rec["qty_36mo"], "spend_36mo": rec["spend_36mo"],
            "qty_all": rec["qty_all"],   "spend_all": rec["spend_all"],
            "last_unit_price": rec["last_unit_price"],
            "first_order": rec["first_order"].date().isoformat() if rec["first_order"] else None,
            "last_order": rec["last_order_dt"].date().isoformat() if rec["last_order_dt"] else None,
            # Default include policy: include if any spend in the 24-month window
            # (skip totally dormant items by default — user can re-include manually)
            "included": rec["spend_24mo"] > 0,
        })

    # KPIs
    items_24mo = sum(1 for it in out_items if it["spend_24mo"] > 0)
    items_12mo = sum(1 for it in out_items if it["spend_12mo"] > 0)
    items_36mo = sum(1 for it in out_items if it["spend_36mo"] > 0)
    total_spend = sum(it["spend_all"] for it in out_items)
    spend_12mo = sum(it["spend_12mo"] for it in out_items)
    spend_24mo = sum(it["spend_24mo"] for it in out_items)
    spend_36mo = sum(it["spend_36mo"] for it in out_items)
    all_pos = set()
    for rec in items.values():
        all_pos |= rec["po_set"]

    first_dt = min((rec["first_order"] for rec in items.values() if rec["first_order"]), default=None)
    last_dt = max((rec["last_order_dt"] for rec in items.values() if rec["last_order_dt"]), default=None)
    years_span = (last_dt - first_dt).days / 365.25 if (first_dt and last_dt) else 0.0

    kpis = {
        "item_count": len(out_items),
        "total_spend": total_spend,
        "po_count": len(all_pos),
        "line_count": line_count,
        "first_order": first_dt.date().isoformat() if first_dt else "—",
        "last_order": last_dt.date().isoformat() if last_dt else "—",
        "years_span": years_span,
        "spend_12mo": spend_12mo,
        "spend_24mo": spend_24mo,
        "spend_36mo": spend_36mo,
        "items_12mo": items_12mo,
        "items_24mo": items_24mo,
        "items_36mo": items_36mo,
    }

    annual_out = sorted(
        [{"year": y, "spend": v["spend"], "qty": v["qty"], "item_count": len(v["items"])} for y, v in annual.items()],
        key=lambda d: d["year"],
    )

    # Score each item + compute file-level difficulty rating
    _STATE["data_anchor_date"] = now.date().isoformat() if now else None
    score_items_in_place(out_items, anchor_date=now)
    difficulty = compute_difficulty_rating(out_items, kpis)

    # Persist for the xlsx generator + drill-down modal
    _STATE["items"] = out_items
    _STATE["kpis"] = kpis
    _STATE["annual_spend"] = annual_out
    _STATE["supplier_name"] = supplier_counter.most_common(1)[0][0] if supplier_counter else ""
    _STATE["difficulty"] = difficulty
    # Per-item PO lines are kept Python-side (not shipped to JS in the items
    # array) to keep the JS payload small. The modal pulls them on demand.
    _STATE["po_lines_by_key"] = {k: list(rec["po_lines"]) for k, rec in items.items()}

    return {"kpis": kpis, "items": out_items, "annual_spend": annual_out, "difficulty": difficulty}


# ---------------------------------------------------------------------------
# Inclusion scoring + file difficulty rating
# ---------------------------------------------------------------------------

# Tunable scoring weights — total to 1.0
SCORE_WEIGHTS = {
    "spend":     0.40,   # 24-mo spend (capped at the threshold below)
    "recency":   0.25,   # days since last order, decays over a year
    "frequency": 0.25,   # distinct PO count
    "data":      0.10,   # data-quality (MFG + UOM)
}
# Calibration: full score at these levels
SCORE_SPEND_FULL_24MO = 1000.0     # $1k+ spend in 24mo = full spend points
SCORE_RECENCY_RECENT_DAYS = 90     # within 90d = full recency points
SCORE_RECENCY_DEAD_DAYS = 540      # 18mo+ since last order = zero recency
SCORE_FREQUENCY_FULL = 6           # 6+ POs = full frequency points

# Tier thresholds
TIER_STRONG = 70
TIER_MODERATE = 45
TIER_WEAK = 25


def score_item(it: dict, anchor_date) -> dict:
    """Score one item 0-100, return {score, tier, reasons, default_include}.

    Anchor_date should be the dataset's max order date (so 'recency' is
    measured against the data, not wall-clock — same anchor as the windows).
    """
    spend_24 = it.get("spend_24mo") or 0.0
    spend_score = min(1.0, spend_24 / SCORE_SPEND_FULL_24MO)

    # Recency: parse last_order ISO; days since vs anchor
    recency_score = 0.0
    days_since_last = None
    last_order_iso = it.get("last_order")
    if last_order_iso and anchor_date:
        try:
            last_dt = datetime.fromisoformat(last_order_iso)
            days_since_last = (anchor_date - last_dt).days
            if days_since_last <= SCORE_RECENCY_RECENT_DAYS:
                recency_score = 1.0
            elif days_since_last >= SCORE_RECENCY_DEAD_DAYS:
                recency_score = 0.0
            else:
                # Linear decay between recent and dead
                rng = SCORE_RECENCY_DEAD_DAYS - SCORE_RECENCY_RECENT_DAYS
                recency_score = max(0.0, 1.0 - (days_since_last - SCORE_RECENCY_RECENT_DAYS) / rng)
        except (ValueError, TypeError):
            pass

    po_count = it.get("po_count") or 0
    frequency_score = min(1.0, po_count / SCORE_FREQUENCY_FULL)

    # Data quality: MFG present + UOM consistent
    has_mfg = bool(it.get("mfg_name"))
    uom_clean = bool(it.get("uom")) and not it.get("uom_mixed")
    data_score = 0.0
    if has_mfg: data_score += 0.5
    if uom_clean: data_score += 0.5

    # Weighted sum
    total = (
        SCORE_WEIGHTS["spend"]     * spend_score +
        SCORE_WEIGHTS["recency"]   * recency_score +
        SCORE_WEIGHTS["frequency"] * frequency_score +
        SCORE_WEIGHTS["data"]      * data_score
    )
    score = round(total * 100)

    # Tier
    if score >= TIER_STRONG:
        tier = "STRONG"
    elif score >= TIER_MODERATE:
        tier = "MODERATE"
    elif score >= TIER_WEAK:
        tier = "WEAK"
    else:
        tier = "SKIP"

    # Human-readable reasons (lead with the negatives — that's why scoring exists)
    reasons = []
    if spend_24 < 100:
        reasons.append(f"Low 24-mo spend (${spend_24:,.0f})")
    elif spend_24 < SCORE_SPEND_FULL_24MO / 2:
        reasons.append(f"Modest 24-mo spend (${spend_24:,.0f})")
    if days_since_last is None:
        reasons.append("No order date")
    elif days_since_last > SCORE_RECENCY_DEAD_DAYS:
        reasons.append(f"No order in {days_since_last // 30}mo")
    elif days_since_last > 365:
        reasons.append(f"Last order {days_since_last // 30}mo ago")
    if po_count <= 1:
        reasons.append(f"Only {po_count} PO")
    elif po_count <= 2:
        reasons.append(f"Only {po_count} POs")
    if not has_mfg:
        reasons.append("MFG blank")
    if it.get("uom_mixed"):
        reasons.append("UOM mixed")
    if not reasons and tier in ("STRONG", "MODERATE"):
        reasons.append("Healthy spend + recent + recurring")

    return {
        "score": score,
        "tier": tier,
        "reasons": reasons,
        "default_include": tier in ("STRONG", "MODERATE"),
        "days_since_last_order": days_since_last,
    }


def score_items_in_place(items: list, anchor_date) -> None:
    """Mutate each item dict in-place, adding score/tier/reasons.

    Note: this does NOT override the existing `included` flag. The tier
    is exposed so the UI can render it (chip, filter), but the user
    explicitly opts in to "auto-exclude WEAK/SKIP" via a toggle (TODO).
    Avoids surprising the user with a mass-exclusion on refresh.
    """
    for it in items:
        s = score_item(it, anchor_date)
        it["score"] = s["score"]
        it["tier"] = s["tier"]
        it["score_reasons"] = s["reasons"]
        it["days_since_last_order"] = s["days_since_last_order"]
        # Conservative: keep the original `included` default (spend_24mo > 0).
        # The tier is informational; user can apply tier-based defaults later.


def compute_difficulty_rating(items: list, kpis: dict) -> dict:
    """Roll per-item scores up to a file-level difficulty rating.

    Outputs a 0-100 difficulty score (HIGHER = HARDER to RFQ — opposite of
    item score, which is item quality), a level label, and the contributing
    signals. Snapshot intended to be persisted with a timestamp so
    period-end reports can chart difficulty trending over time as more
    files run through the tool.

    Phase 2.5 will add a bid-feedback signal (% of outlier bids retroactively
    increases the difficulty after-the-fact).
    """
    if not items:
        return {"score": 0, "level": "EMPTY", "signals": {}, "summary": "no items"}

    n = len(items)
    by_tier = Counter(it.get("tier", "SKIP") for it in items)
    pct_weak_or_skip = 100.0 * (by_tier.get("WEAK", 0) + by_tier.get("SKIP", 0)) / n
    pct_strong = 100.0 * by_tier.get("STRONG", 0) / n
    pct_no_mfg = 100.0 * sum(1 for it in items if not it.get("mfg_name")) / n
    pct_uom_mixed = 100.0 * sum(1 for it in items if it.get("uom_mixed")) / n
    pct_no_desc = 100.0 * sum(1 for it in items if not it.get("description") or len((it.get("description") or "").strip()) < 10) / n
    avg_score = sum(it.get("score", 0) for it in items) / n

    # Spend concentration — what % of items capture 80% of spend?
    sorted_spend = sorted([it.get("spend_all", 0) for it in items], reverse=True)
    total = sum(sorted_spend) or 1.0
    cum = 0.0
    items_for_80 = 0
    for i, sp in enumerate(sorted_spend):
        cum += sp
        items_for_80 = i + 1
        if cum / total >= 0.80:
            break
    pct_items_for_80 = 100.0 * items_for_80 / n

    # Difficulty score — weighted aggregate (higher = harder)
    # Each signal contributes 0-100 to the total.
    sig_weak_tail = pct_weak_or_skip                                   # already 0-100
    sig_data_quality = (pct_no_mfg + pct_uom_mixed + pct_no_desc) / 3  # 0-100
    sig_long_tail = max(0, min(100, pct_items_for_80 * 1.5))           # bias toward long-tail = harder
    sig_low_avg = max(0, 100 - avg_score)                              # inverse of average item quality

    diff_raw = (
        0.30 * sig_weak_tail +
        0.30 * sig_data_quality +
        0.20 * sig_long_tail +
        0.20 * sig_low_avg
    )
    diff_score = round(diff_raw)

    if diff_score >= 70:
        level = "VERY DIFFICULT"
    elif diff_score >= 50:
        level = "DIFFICULT"
    elif diff_score >= 30:
        level = "MODERATE"
    else:
        level = "EASY"

    # Build a one-line summary the UI can show under the label
    summary_parts = []
    if pct_weak_or_skip > 40:
        summary_parts.append(f"{pct_weak_or_skip:.0f}% items in WEAK/SKIP tier")
    if pct_no_mfg > 25:
        summary_parts.append(f"{pct_no_mfg:.0f}% missing MFG")
    if pct_no_desc > 15:
        summary_parts.append(f"{pct_no_desc:.0f}% generic/short descriptions")
    if pct_items_for_80 > 25:
        summary_parts.append(f"long tail — top {pct_items_for_80:.0f}% of items hold 80% of spend")
    if not summary_parts:
        summary_parts.append("clean data, healthy spend distribution")

    return {
        "score": diff_score,
        "level": level,
        "summary": " · ".join(summary_parts),
        "snapshot_at": datetime.now().isoformat(),
        "signals": {
            "n_items": n,
            "by_tier": dict(by_tier),
            "pct_weak_or_skip": round(pct_weak_or_skip, 1),
            "pct_strong": round(pct_strong, 1),
            "pct_no_mfg": round(pct_no_mfg, 1),
            "pct_uom_mixed": round(pct_uom_mixed, 1),
            "pct_no_desc": round(pct_no_desc, 1),
            "items_for_80pct_spend": items_for_80,
            "pct_items_for_80": round(pct_items_for_80, 1),
            "avg_score": round(avg_score, 1),
        },
    }


# ---------------------------------------------------------------------------
# Per-item history (drill-down modal)
# ---------------------------------------------------------------------------

def _linear_fit(xs, ys):
    """Simple least-squares linear regression. Returns (slope, intercept, r2).
    No numpy — we're in Pyodide and want to keep the dep surface minimal."""
    n = len(xs)
    if n < 2:
        return (0.0, ys[0] if ys else 0.0, 0.0)
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    num = 0.0
    den = 0.0
    for x, y in zip(xs, ys):
        num += (x - mean_x) * (y - mean_y)
        den += (x - mean_x) ** 2
    slope = num / den if den else 0.0
    intercept = mean_y - slope * mean_x
    # R-squared
    ss_tot = sum((y - mean_y) ** 2 for y in ys)
    ss_res = 0.0
    for x, y in zip(xs, ys):
        pred = slope * x + intercept
        ss_res += (y - pred) ** 2
    r2 = 1.0 - (ss_res / ss_tot) if ss_tot else 0.0
    return (slope, intercept, r2)


def get_item_history(item_num: str) -> dict:
    """Return the per-item drill-down payload for the modal.

    Includes the raw PO lines, the linear-trend fit (slope/intercept/R²), and
    an "expected price today" extrapolation against the dataset's anchor date.
    Used by the per-item modal to show order history + the expected-price
    overlay ryan asked for: 'we last ordered 11mo ago at $12.40; trend says
    we'd expect ~$13.10 today; supplier C bid $18.50 → suspicious'.
    """
    if not item_num:
        return {"error": "item_num required"}
    key = norm_pn(item_num)
    po_lines = _STATE.get("po_lines_by_key", {}).get(key, [])
    if not po_lines:
        return {"error": f"no history for {item_num}"}

    # Find the matching item record for context
    items = _STATE.get("items", [])
    item = next((it for it in items if it["item_num"] == item_num), None)

    # Sort by date ascending
    sorted_lines = sorted(po_lines, key=lambda r: r[0] or "")
    line_dicts = [
        {
            "date": d,
            "qty": q,
            "unit_price": p,
            "line_total": lt,
            "po": po,
            "uom": uom,
        }
        for (d, q, p, lt, po, uom) in sorted_lines
    ]

    # Linear regression on (days_since_first_order, unit_price)
    first_dt = None
    xs, ys = [], []
    for ln in line_dicts:
        if not ln["date"] or ln["unit_price"] is None:
            continue
        try:
            d = datetime.fromisoformat(ln["date"])
        except ValueError:
            continue
        if first_dt is None:
            first_dt = d
        xs.append((d - first_dt).days)
        ys.append(float(ln["unit_price"]))

    slope, intercept, r2 = _linear_fit(xs, ys)
    last_x = xs[-1] if xs else 0
    last_price = ys[-1] if ys else None

    # Expected price at the dataset anchor date
    expected_today = None
    days_since_last = None
    anchor = _STATE.get("data_anchor_date")
    if anchor and first_dt:
        try:
            anchor_dt = datetime.fromisoformat(anchor)
            anchor_x = (anchor_dt - first_dt).days
            expected_today = slope * anchor_x + intercept
            days_since_last = anchor_x - last_x
        except ValueError:
            pass

    # Confidence label based on R² + sample size
    if len(xs) < 3:
        confidence = "low"
        confidence_reason = f"only {len(xs)} priced order line(s)"
    elif r2 < 0.2:
        confidence = "low"
        confidence_reason = f"R² {r2:.2f} — prices noisy, trend may not be meaningful"
    elif r2 < 0.6:
        confidence = "medium"
        confidence_reason = f"R² {r2:.2f}"
    else:
        confidence = "high"
        confidence_reason = f"R² {r2:.2f}"

    return {
        "item_num": item_num,
        "description": item["description"] if item else "",
        "mfg_name": item["mfg_name"] if item else "",
        "mfg_pn": item["mfg_pn"] if item else "",
        "uom": item["uom"] if item else "",
        "uom_mixed": item["uom_mixed"] if item else False,
        "po_lines": line_dicts,
        "summary": {
            "po_count": item["po_count"] if item else 0,
            "qty_12mo": item["qty_12mo"] if item else 0,
            "spend_12mo": item["spend_12mo"] if item else 0,
            "qty_24mo": item["qty_24mo"] if item else 0,
            "spend_24mo": item["spend_24mo"] if item else 0,
            "qty_36mo": item["qty_36mo"] if item else 0,
            "spend_36mo": item["spend_36mo"] if item else 0,
            "qty_all": item["qty_all"] if item else 0,
            "spend_all": item["spend_all"] if item else 0,
            "last_order": item["last_order"] if item else None,
            "first_order": item["first_order"] if item else None,
            "last_unit_price": last_price,
        },
        "trend": {
            "slope_per_day": slope,
            "intercept": intercept,
            "r2": r2,
            "confidence": confidence,
            "confidence_reason": confidence_reason,
            "expected_today": expected_today,
            "days_since_last_order": days_since_last,
            "anchor_date": anchor,
        },
    }


# ---------------------------------------------------------------------------
# xlsx generator — candidate RFQ list (internal-audience; not yet
# the supplier-bound RFQ workbook — that comes in Phase 2).
# ---------------------------------------------------------------------------

def autosize(ws, min_w: int = 10, max_w: int = 60):
    """Per-column autosize that skips MergedCell anchors (which lack column_letter).
    Verbatim pattern from supplier-pricing/app.py (dev-lessons #4)."""
    by_col: dict = defaultdict(list)
    for row in ws.iter_rows():
        for c in row:
            if c.__class__.__name__ == "MergedCell":
                continue
            col_letter = c.column_letter
            v = c.value
            if v is None:
                continue
            by_col[col_letter].append(len(str(v)))
    for letter, lens in by_col.items():
        ml = max(lens) if lens else 0
        ws.column_dimensions[letter].width = min(max(ml + 2, min_w), max_w)


def gen_candidate_rfq_list_xlsx(included_keys=None) -> bytes:
    """Build an xlsx of the candidate RFQ list. Internal audience.

    If `included_keys` is provided (list of item_num strings), filter to those.
    Otherwise emit every item flagged `included=True` from the last extract.
    """
    items = _STATE.get("items", [])
    kpis = _STATE.get("kpis", {})
    annual = _STATE.get("annual_spend", [])

    if included_keys is not None:
        keep = set(str(k) for k in included_keys)
        items = [it for it in items if it["item_num"] in keep]

    wb = Workbook()

    # ---- Sheet 1: Candidate RFQ list ----
    ws = wb.active
    ws.title = "RFQ Candidate List"
    headers = [
        "Item #", "Description", "Manufacturer", "MFG Part #", "Commodity", "UOM", "UOM mixed?",
        "12mo qty", "12mo spend", "24mo qty", "24mo spend", "36mo qty", "36mo spend",
        "All-time qty", "All-time spend", "Last unit price", "First order", "Last order",
        "Distinct POs",
    ]
    ws.append(headers)
    for c in ws[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="3A2917")
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for it in sorted(items, key=lambda x: x["spend_24mo"] or 0, reverse=True):
        ws.append([
            it["item_num"], it["description"], it["mfg_name"], it["mfg_pn"],
            it["commodity"], it["uom"], "YES" if it["uom_mixed"] else "",
            it["qty_12mo"], it["spend_12mo"],
            it["qty_24mo"], it["spend_24mo"],
            it["qty_36mo"], it["spend_36mo"],
            it["qty_all"], it["spend_all"],
            it["last_unit_price"],
            it["first_order"], it["last_order"], it["po_count"],
        ])

    # Number formats
    for col_letter in ("H", "J", "L", "N"):  # qty cols
        for row in ws.iter_rows(min_row=2, min_col=ord(col_letter)-64, max_col=ord(col_letter)-64):
            for c in row:
                c.number_format = "#,##0"
    for col_letter in ("I", "K", "M", "O", "P"):  # money cols
        for row in ws.iter_rows(min_row=2, min_col=ord(col_letter)-64, max_col=ord(col_letter)-64):
            for c in row:
                c.number_format = "$#,##0.00"

    autosize(ws)
    ws.freeze_panes = "A2"

    # ---- Sheet 2: Summary ----
    ws2 = wb.create_sheet("Summary")
    ws2.append(["Auto RFQ Banana — extraction summary", ""])
    ws2.append(["", ""])
    ws2.append(["Items in candidate list", len(items)])
    ws2.append(["Source supplier", _STATE.get("supplier_name", "")])
    ws2.append(["Date range", f"{kpis.get('first_order','—')} → {kpis.get('last_order','—')}"])
    ws2.append(["Years of history", round(kpis.get("years_span", 0), 1)])
    ws2.append(["Total POs", kpis.get("po_count", 0)])
    ws2.append(["Total order lines", kpis.get("line_count", 0)])
    ws2.append(["", ""])
    ws2.append(["Window", "Total spend", "Items active"])
    ws2.append(["12 months", kpis.get("spend_12mo", 0), kpis.get("items_12mo", 0)])
    ws2.append(["24 months", kpis.get("spend_24mo", 0), kpis.get("items_24mo", 0)])
    ws2.append(["36 months", kpis.get("spend_36mo", 0), kpis.get("items_36mo", 0)])
    ws2.append(["All time",  kpis.get("total_spend", 0), kpis.get("item_count", 0)])
    for r in (10, 11, 12, 13, 14):
        c = ws2.cell(row=r, column=2)
        c.number_format = "$#,##0"
    ws2["A1"].font = Font(bold=True, size=14)
    autosize(ws2)

    # ---- Sheet 3: Annual spend ----
    ws3 = wb.create_sheet("Annual Spend")
    ws3.append(["Year", "Spend", "Quantity", "Distinct items"])
    for c in ws3[1]:
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="3A2917")
    for d in annual:
        ws3.append([d["year"], d["spend"], d["qty"], d["item_count"]])
    for row in ws3.iter_rows(min_row=2, min_col=2, max_col=2):
        for c in row:
            c.number_format = "$#,##0"
    for row in ws3.iter_rows(min_row=2, min_col=3, max_col=3):
        for c in row:
            c.number_format = "#,##0"
    autosize(ws3)

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Register module so app.js can `from app_engine import ...`
# ---------------------------------------------------------------------------
sys.modules["app_engine"] = sys.modules[__name__]
