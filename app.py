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

        # Last unit price = EXACT unit price of the most recent priced order line.
        # No median, no smoothing — RFQ reporting must be to-the-penny.
        # Tiebreak when multiple lines share the latest date: highest PO #
        # (later transaction), then iteration order.
        priced_lines = [l for l in rec["po_lines"] if l[2] is not None]
        if priced_lines:
            latest = max(priced_lines, key=lambda l: (l[0] or "", l[4] or ""))
            current_price = latest[2]
        else:
            current_price = rec["last_unit_price"]

        # Window spends restated at the current (representative) price so the
        # per-row table math is internally consistent: qty × price = total.
        # Per ryan: "5 bananas × $5 each = $25". KPI totals at the top stay
        # as historical actuals — those are computed from rec["spend_*"].
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
            "qty_12mo": rec["qty_12mo"],
            "qty_24mo": rec["qty_24mo"],
            "qty_36mo": rec["qty_36mo"],
            "qty_all": rec["qty_all"],
            # Spend columns = qty × current price (internally consistent, RFQ-relevant)
            "spend_12mo": (rec["qty_12mo"] or 0) * (current_price or 0),
            "spend_24mo": (rec["qty_24mo"] or 0) * (current_price or 0),
            "spend_36mo": (rec["qty_36mo"] or 0) * (current_price or 0),
            "spend_all":  (rec["qty_all"]  or 0) * (current_price or 0),
            # Historical actuals retained for KPI totals + reference
            "spend_12mo_actual": rec["spend_12mo"],
            "spend_24mo_actual": rec["spend_24mo"],
            "spend_36mo_actual": rec["spend_36mo"],
            "spend_all_actual":  rec["spend_all"],
            "last_unit_price": current_price,
            "first_order": rec["first_order"].date().isoformat() if rec["first_order"] else None,
            "last_order": rec["last_order_dt"].date().isoformat() if rec["last_order_dt"] else None,
            # Default include: any qty in the 24-month window
            "included": rec["qty_24mo"] > 0,
        })

    # KPIs — use HISTORICAL actuals (spend_X_actual). Per-row table shows
    # qty × current_price, but file-level totals reconcile to source.
    items_24mo = sum(1 for it in out_items if it["qty_24mo"] > 0)
    items_12mo = sum(1 for it in out_items if it["qty_12mo"] > 0)
    items_36mo = sum(1 for it in out_items if it["qty_36mo"] > 0)
    total_spend = sum(it["spend_all_actual"] for it in out_items)
    spend_12mo = sum(it["spend_12mo_actual"] for it in out_items)
    spend_24mo = sum(it["spend_24mo_actual"] for it in out_items)
    spend_36mo = sum(it["spend_36mo_actual"] for it in out_items)
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
    # Use historical actual (not the qty × current_price projection) — scoring
    # is about "did this item have meaningful real spend"
    spend_24 = it.get("spend_24mo_actual") or it.get("spend_24mo") or 0.0
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


def _median(values):
    if not values:
        return None
    s = sorted(values)
    mid = len(s) // 2
    return (s[mid] + s[~mid]) / 2.0


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

    # 90-day median price (analytical reference — separate from the to-the-penny
    # last_unit_price). Used as the "is the latest line a price spike" baseline
    # on the chart. Falls back to median of last 10 lines if <3 within 90 days.
    median_90d = None
    median_window_label = None
    if first_dt and ys:
        try:
            recent_dt = datetime.fromisoformat(line_dicts[-1]["date"])
            cutoff_90 = recent_dt - timedelta(days=90)
            recent_prices = [
                ln["unit_price"] for ln in line_dicts
                if ln["date"] and ln["unit_price"] is not None
                and datetime.fromisoformat(ln["date"]) >= cutoff_90
            ]
            if len(recent_prices) >= 3:
                median_90d = _median(recent_prices)
                median_window_label = f"90-day median ({len(recent_prices)} lines)"
            else:
                fallback = sorted(line_dicts, key=lambda x: x["date"], reverse=True)[:10]
                fp = [ln["unit_price"] for ln in fallback if ln["unit_price"] is not None]
                if fp:
                    median_90d = _median(fp)
                    median_window_label = f"median of last {len(fp)} lines"
        except (ValueError, TypeError):
            pass

    # Spike detection — compare latest unit price to median_90d.
    # Use the SAME selection rule as the table's LAST $/ea: max by (date, po)
    # so ties on the most recent date pick the highest PO # (later transaction).
    priced_only = [(l[0], l[4], l[2]) for l in po_lines if l[2] is not None]
    if priced_only:
        latest_tuple = max(priced_only, key=lambda x: (x[0] or "", x[1] or ""))
        latest_unit_price = latest_tuple[2]
    else:
        latest_unit_price = None
    spike = None
    if latest_unit_price is not None and median_90d and median_90d > 0:
        ratio = latest_unit_price / median_90d
        pct_diff = (ratio - 1.0) * 100.0
        if ratio >= 1.5 or ratio <= 0.5:
            direction = "above" if ratio > 1 else "below"
            spike = {
                "is_spike": True,
                "ratio": ratio,
                "pct_diff": pct_diff,
                "message": f"Latest price ${latest_unit_price:,.2f} is {abs(pct_diff):.0f}% {direction} {median_window_label} (${median_90d:,.2f})",
            }
        else:
            spike = {
                "is_spike": False,
                "ratio": ratio,
                "pct_diff": pct_diff,
                "message": f"Latest ${latest_unit_price:,.2f} vs {median_window_label} ${median_90d:,.2f} ({pct_diff:+.0f}%)",
            }

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
            "latest_unit_price": latest_unit_price,
            "median_90d": median_90d,
            "median_window_label": median_window_label,
            "spike": spike,
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
# Returned-bid intake — parses each supplier's response file.
#
# Three observed file shapes in the McMaster RFQ:
#   1. "Our format" (Grainger primary, MSC, Fastenal): banner row at top,
#      real headers at row 7 (1-indexed). Cols 1-10:
#        1=Commodity 2=Item 3=EAM Part # 4=Part Number (= McMaster anchor)
#        5=Item # 6=Manufacturer Name 7=Qty 8=UOM 9=Quoted Price 10=Notes
#      Fastenal extends to 20 cols with substitute-part / verified-pricing data.
#   2. "Their format" (Grainger secondary): completely restructured. NOT
#      auto-handled in v1 — falls back to manual mapping (TODO).
#
# No-bid signals (treat as not quoted, not a real $0 line):
#   - Quoted Price is 0 / empty / None
#   - Notes contains "need more information" / "n/a" / "discontinued" / "obsolete"
# ---------------------------------------------------------------------------

# Status enum-ish strings used in the comparison matrix
BID_STATUS_PRICED      = "PRICED"        # quoted with a real price
BID_STATUS_NO_BID      = "NO_BID"        # supplier explicitly declined or left blank
BID_STATUS_NEED_INFO   = "NEED_INFO"     # supplier asked for clarification
BID_STATUS_UOM_DISC    = "UOM_DISC"      # priced but with a UOM-mismatch warning
BID_STATUS_SUBSTITUTE  = "SUBSTITUTE"    # priced with an alternate part offered

NO_BID_NOTE_MARKERS = (
    "need more information", "need more info", "need info", "more info",
    "n/a", "na", "discontinued", "obsolete", "no quote", "no bid",
    "unable to quote", "cannot quote", "not available", "not stocked",
    "no longer available", "tbd", "to be quoted",
)


def _matches_no_bid(notes_text: str) -> bool:
    if not notes_text:
        return False
    t = str(notes_text).strip().lower()
    if not t:
        return False
    return any(m in t for m in NO_BID_NOTE_MARKERS)


def _detect_our_format(ws) -> int:
    """Look for the canonical header row in our-format response files.
    Returns the 1-indexed row number where headers live, or 0 if not detected.

    The signature: at least 4 cells in the row that EXACTLY match expected
    header names (after strip + lowercase). Banner rows that contain the
    phrase 'quoted price' embedded in long instruction text don't match
    because we require exact cell equality, not substring.
    """
    expected = {
        "commodity", "item", "eam part number", "part number", "partnumber",
        "item #", "manufacturer name", "qty", "uom", "quoted price", "notes",
    }
    for r_idx in range(1, 16):
        try:
            row = next(ws.iter_rows(min_row=r_idx, max_row=r_idx, values_only=True), None)
        except Exception:
            continue
        if not row:
            continue
        cells = [str(c or "").strip().lower() for c in row]
        hits = sum(1 for c in cells if c in expected)
        if hits >= 4:
            return r_idx
    return 0


def _our_format_columns(header_row: tuple) -> dict:
    """Map the 'our format' headers to logical fields.
    Handles the 11-col primary layout AND the 20-col Fastenal extension."""
    cols = {}
    for i, raw in enumerate(header_row):
        if raw is None:
            continue
        h = str(raw).strip().lower()
        if not h:
            continue
        # Core columns (assigned only once — first match wins for ambiguous names)
        if h == "commodity" and "commodity" not in cols:
            cols["commodity"] = i
        elif h == "item" and "description" not in cols:
            cols["description"] = i
        elif h == "eam part number" and "eam_pn" not in cols:
            cols["eam_pn"] = i
        elif h in ("part number", "partnumber") and "part_number" not in cols:
            cols["part_number"] = i        # = McMaster anchor
        elif h == "item #" and "item_num" not in cols:
            cols["item_num"] = i
        elif h == "manufacturer name" and "mfg_name" not in cols:
            cols["mfg_name"] = i
        elif h == "qty" and "qty" not in cols:
            cols["qty"] = i
        elif h == "uom" and "uom" not in cols:
            cols["uom"] = i
        elif h == "quoted price" and "quoted_price" not in cols:
            cols["quoted_price"] = i
        elif h == "notes" and "notes" not in cols:
            cols["notes"] = i
        elif h == "verified pricing" and "verified_price" not in cols:
            cols["verified_price"] = i     # Fastenal extension
        elif h.startswith("exact ") and "part" in h and "exact_part" not in cols:
            cols["exact_part"] = i         # Fastenal: their exact catalog part
        elif h.startswith("exact ") and "description" in h and "exact_desc" not in cols:
            cols["exact_desc"] = i
        elif h.startswith("sub ") and "part" in h and "sub_part" not in cols:
            cols["sub_part"] = i           # Fastenal: substitute offered
        elif h.startswith("sub ") and "description" in h and "sub_desc" not in cols:
            cols["sub_desc"] = i
        elif h == "sell price/uom" and "sub_price" not in cols:
            cols["sub_price"] = i
        elif h == "notes" and "notes_2" not in cols:
            cols["notes_2"] = i            # Fastenal's second notes col
    return cols


def parse_supplier_bid(file_bytes, supplier_name: str = "") -> dict:
    """Parse one supplier's returned-bid xlsx. Auto-detects 'our format'
    (banner + headers around row 7). Returns:

        {
          "supplier": str,
          "bids": [{rfq_key, item_num, part_number, mfg_name, description,
                    qty, uom, quoted_price, notes, status, alt_part,
                    verified_price, has_substitute, ...}, ...],
          "summary": {
              "n_lines": int, "n_priced": int, "n_no_bid": int,
              "n_need_info": int, "n_uom_disc": int, "n_substitute": int,
              "total_quoted_value": float,
          },
          "format": "our_format" | "unknown",
        }
    """
    if not isinstance(file_bytes, (bytes, bytearray)):
        file_bytes = bytes(file_bytes)
    wb = load_workbook(io.BytesIO(file_bytes), data_only=True, read_only=True)
    ws = wb[wb.sheetnames[0]]

    header_row_idx = _detect_our_format(ws)
    if not header_row_idx:
        wb.close()
        return {"supplier": supplier_name, "bids": [], "format": "unknown",
                "summary": {"n_lines": 0, "n_priced": 0, "n_no_bid": 0,
                            "n_need_info": 0, "n_uom_disc": 0, "n_substitute": 0,
                            "total_quoted_value": 0.0},
                "error": "Could not auto-detect header row. Use manual column mapping."}

    header_row = next(ws.iter_rows(min_row=header_row_idx, max_row=header_row_idx, values_only=True))
    cols = _our_format_columns(header_row)

    def g(row, field):
        i = cols.get(field)
        return None if (i is None or i >= len(row)) else row[i]

    bids = []
    n_priced = n_no_bid = n_need_info = n_uom_disc = n_substitute = 0
    total_value = 0.0

    for row in ws.iter_rows(min_row=header_row_idx + 1, values_only=True):
        if row is None:
            continue
        # Anchor key: McMaster Part Number (the column we sent — same anchor
        # the supplier filled prices against). Fall back to Item # then EAM.
        part = norm_text(g(row, "part_number"))
        item = norm_text(g(row, "item_num"))
        eam  = norm_text(g(row, "eam_pn"))
        if _is_blanky(part): part = ""
        if _is_blanky(item): item = ""
        if _is_blanky(eam):  eam  = ""
        key_raw = part or item or eam
        if not key_raw:
            continue
        rfq_key = norm_pn(key_raw)

        qty = safe_float(g(row, "qty"))
        quoted = safe_float(g(row, "quoted_price"))
        verified = safe_float(g(row, "verified_price"))
        notes = norm_text(g(row, "notes")) or ""
        notes_2 = norm_text(g(row, "notes_2")) or ""
        if notes_2 and notes_2 not in notes:
            notes = (notes + " | " + notes_2).strip(" |")
        sub_part = norm_text(g(row, "sub_part")) or ""
        sub_desc = norm_text(g(row, "sub_desc")) or ""
        sub_price = safe_float(g(row, "sub_price"))
        exact_part = norm_text(g(row, "exact_part")) or ""
        exact_desc = norm_text(g(row, "exact_desc")) or ""

        # Status determination — order matters
        is_no_bid = (
            (quoted is None or quoted == 0) and verified is None
        ) or _matches_no_bid(notes)
        has_uom_warning = "uom" in notes.lower() and ("disc" in notes.lower() or "mismatch" in notes.lower() or "differ" in notes.lower())
        has_substitute_offered = bool(sub_part) and not is_no_bid

        if is_no_bid:
            if any(m in notes.lower() for m in ("need more info", "need info", "more info", "tbd", "to be quoted")):
                status = BID_STATUS_NEED_INFO
                n_need_info += 1
            else:
                status = BID_STATUS_NO_BID
                n_no_bid += 1
        elif has_uom_warning:
            status = BID_STATUS_UOM_DISC
            n_uom_disc += 1
            n_priced += 1
        elif has_substitute_offered:
            status = BID_STATUS_SUBSTITUTE
            n_substitute += 1
            n_priced += 1
        else:
            status = BID_STATUS_PRICED
            n_priced += 1

        # Effective price — verified takes precedence (it's the "we re-confirmed"
        # value Fastenal added) but we keep the raw quoted value for transparency
        effective_price = verified if (verified is not None and verified > 0) else quoted
        if effective_price is not None and qty is not None and effective_price > 0:
            total_value += effective_price * qty

        bids.append({
            "rfq_key": rfq_key,
            "item_num": item,
            "part_number": part,
            "eam_pn": eam,
            "mfg_name": norm_text(g(row, "mfg_name")) or "",
            "description": norm_text(g(row, "description")) or "",
            "commodity": norm_text(g(row, "commodity")) or "",
            "qty": qty,
            "uom": norm_text(g(row, "uom")) or "",
            "quoted_price": quoted,
            "verified_price": verified,
            "effective_price": effective_price,
            "notes": notes,
            "status": status,
            # Fastenal-style extensions (empty for other suppliers)
            "exact_part": exact_part,
            "exact_desc": exact_desc,
            "sub_part": sub_part,
            "sub_desc": sub_desc,
            "sub_price": sub_price,
            "has_substitute": has_substitute_offered,
        })

    wb.close()

    return {
        "supplier": supplier_name or "(unnamed)",
        "format": "our_format",
        "header_row": header_row_idx,
        "columns_detected": cols,
        "bids": bids,
        "summary": {
            "n_lines": len(bids),
            "n_priced": n_priced,
            "n_no_bid": n_no_bid,
            "n_need_info": n_need_info,
            "n_uom_disc": n_uom_disc,
            "n_substitute": n_substitute,
            "total_quoted_value": total_value,
        },
    }


def ingest_supplier_bid(file_bytes, supplier_name: str) -> dict:
    """Parse and persist a supplier bid into _STATE. Returns the parse result.

    Replaces any prior bid for the same supplier_name (re-uploads overwrite).
    """
    parsed = parse_supplier_bid(file_bytes, supplier_name)
    if "bids" not in _STATE or not isinstance(_STATE.get("bids"), dict):
        _STATE["bids"] = {}
    _STATE["bids"][supplier_name] = parsed
    return parsed


def list_supplier_bids() -> list:
    """Summary of all loaded bids."""
    bids = _STATE.get("bids", {})
    return [
        {
            "supplier": s,
            "format": p.get("format"),
            "summary": p.get("summary", {}),
        }
        for s, p in bids.items()
    ]


def remove_supplier_bid(supplier_name: str) -> bool:
    bids = _STATE.get("bids", {}) or {}
    if supplier_name in bids:
        del bids[supplier_name]
        _STATE["bids"] = bids
        return True
    return False


# ---------------------------------------------------------------------------
# Cross-supplier comparison + outlier detection
# ---------------------------------------------------------------------------

def _outlier_factor():
    """Tunable: a quote is an outlier if it's >= this multiple of the median
    OR <= 1/this multiple. Default 3.0 — picks up the "supplier C bid $784
    for a $40 part" scenario without flagging normal price spread."""
    return 3.0


def compute_comparison_matrix(included_keys=None) -> dict:
    """Build the cross-supplier comparison view for the loaded RFQ items
    against the loaded supplier bids.

    Returns:
        {
          "suppliers": [supplier_name, ...],   # ordered, columns of the matrix
          "rows": [
             {
               "rfq_key", "item_num", "part_number", "description", "mfg_name",
               "uom", "qty_24mo", "last_unit_price", "tier", "score",
               "bids": {supplier: {price, status, notes, alt_part, ...}, ...},
               "n_quoted": int,
               "coverage": "FULL" | "PARTIAL" | "SINGLE" | "NONE",
               "lowest_supplier": str | None,
               "lowest_price": float | None,
               "winner_savings_vs_history": float | None,
               "spread_pct": float | None,    # (max - min) / median
               "flags": [str, ...],
             }, ...
          ],
          "summary": {
             "n_items": int,
             "n_with_3plus_bids": int,
             "n_with_2_bids": int,
             "n_with_1_bid": int,
             "n_with_0_bids": int,
             "n_outliers_flagged": int,
             "total_lowest_value": float,
             "total_historical_value": float,
             "estimated_savings": float,
          }
        }
    """
    items = _STATE.get("items", [])
    bids_by_supplier = _STATE.get("bids", {}) or {}
    suppliers = list(bids_by_supplier.keys())

    if included_keys is not None:
        keep = set(included_keys)
        items = [it for it in items if it["item_num"] in keep]

    # Build a lookup: (supplier, rfq_key) -> bid record
    bid_lookup = {}
    for sup, parsed in bids_by_supplier.items():
        for b in parsed.get("bids", []):
            bid_lookup[(sup, b["rfq_key"])] = b

    rows = []
    n_full = n_two = n_one = n_zero = n_outliers = 0
    total_lowest = 0.0
    total_historical = 0.0
    est_savings = 0.0
    n_sup = len(suppliers)
    outlier_factor = _outlier_factor()

    for it in items:
        rfq_key = it["key"]
        per_sup = {}
        priced_values = []  # only PRICED-status bids contribute to outlier math
        for sup in suppliers:
            b = bid_lookup.get((sup, rfq_key))
            if b is None:
                per_sup[sup] = {"status": "MISSING", "price": None, "notes": "", "raw": None}
                continue
            per_sup[sup] = {
                "status": b["status"],
                "price": b["effective_price"],
                "notes": b["notes"],
                "raw": b,
            }
            if b["status"] in (BID_STATUS_PRICED, BID_STATUS_UOM_DISC, BID_STATUS_SUBSTITUTE) \
               and b["effective_price"] is not None and b["effective_price"] > 0:
                priced_values.append((sup, b["effective_price"]))

        n_quoted = len(priced_values)
        coverage = (
            "FULL" if n_quoted >= n_sup and n_sup >= 3
            else "PARTIAL" if n_quoted >= 2
            else "SINGLE" if n_quoted == 1
            else "NONE"
        )
        if n_quoted == 0: n_zero += 1
        elif n_quoted == 1: n_one += 1
        elif n_quoted == 2: n_two += 1
        else: n_full += 1

        lowest_supplier = None
        lowest_price = None
        spread_pct = None
        flags = []

        if priced_values:
            priced_values.sort(key=lambda t: t[1])
            lowest_supplier, lowest_price = priced_values[0]
            highest_price = priced_values[-1][1]
            if len(priced_values) >= 2:
                med = _median([p for _, p in priced_values])
                if med and med > 0:
                    spread_pct = (highest_price - lowest_price) / med * 100.0
                    # Outlier flag — any bid > Nx median or < median/N
                    for sup, p in priced_values:
                        if p >= med * outlier_factor:
                            flags.append(f"OUTLIER_HIGH:{sup}=${p:.2f}vs_median${med:.2f}")
                            n_outliers += 1
                        elif p <= med / outlier_factor:
                            flags.append(f"OUTLIER_LOW:{sup}=${p:.2f}vs_median${med:.2f}")
                            n_outliers += 1
            # vs historical
            hist = it.get("last_unit_price")
            if hist and hist > 0:
                if lowest_price >= hist * outlier_factor:
                    flags.append(f"ALL_BIDS_HIGH:lowest${lowest_price:.2f}_vs_paid${hist:.2f}")
                elif lowest_price <= hist / outlier_factor:
                    flags.append(f"BIG_SAVINGS:lowest${lowest_price:.2f}_vs_paid${hist:.2f}")

        # No-bid coverage flag (high-spend items with no quotes need follow-up)
        if n_quoted == 0:
            spend_24 = it.get("spend_24mo_actual") or 0
            if spend_24 >= 1000:
                flags.append(f"NO_BID_HIGH_SPEND:${spend_24:,.0f}_24mo_at_risk")

        # Award math — best-case scenario at lowest non-flagged bid
        qty_24 = it.get("qty_24mo") or 0
        hist_price = it.get("last_unit_price") or 0
        if lowest_price and qty_24:
            total_lowest += lowest_price * qty_24
        if hist_price and qty_24:
            total_historical += hist_price * qty_24

        rows.append({
            "rfq_key": rfq_key,
            "item_num": it["item_num"],
            "part_number": it.get("part_number") or "",
            "description": it["description"],
            "mfg_name": it["mfg_name"],
            "uom": it["uom"],
            "qty_24mo": qty_24,
            "last_unit_price": hist_price,
            "tier": it.get("tier"),
            "score": it.get("score"),
            "bids": per_sup,
            "n_quoted": n_quoted,
            "coverage": coverage,
            "lowest_supplier": lowest_supplier,
            "lowest_price": lowest_price,
            "spread_pct": spread_pct,
            "flags": flags,
        })

    est_savings = total_historical - total_lowest

    return {
        "suppliers": suppliers,
        "rows": rows,
        "summary": {
            "n_items": len(rows),
            "n_with_3plus_bids": n_full,
            "n_with_2_bids": n_two,
            "n_with_1_bid": n_one,
            "n_with_0_bids": n_zero,
            "n_outliers_flagged": n_outliers,
            "total_lowest_value": total_lowest,
            "total_historical_value": total_historical,
            "estimated_savings": est_savings,
        },
    }


# ---------------------------------------------------------------------------
# Consolidation analysis — Ryan's actual award strategy.
#
# Default: consolidate to ONE supplier (operational simplicity beats per-line
# lowest pricing when the savings are small). Then carve out a limited set
# of "extreme exceptions" — items where another supplier saves enough on a
# single item to justify splitting the award.
# ---------------------------------------------------------------------------

# Tunable: an item is a carve-out candidate if another supplier saves at least
# this fraction of the consolidation winner's price on it. Default 30%.
DEFAULT_CARVE_OUT_THRESHOLD = 0.30


def compute_consolidation_analysis(included_keys=None, carve_threshold: float = None) -> dict:
    """Rank suppliers as candidate consolidation winners and quantify the
    impact of carving out exceptions where someone else is meaningfully
    cheaper on individual items.

    Returns:
      {
        "candidates": [
          {
            "supplier": str,
            "n_items_quoted": int,
            "pct_items_quoted": float,
            "n_items_lowest": int,
            "pct_items_lowest": float,
            "consolidation_value": float,    # award everything they quoted, at their prices
            "items_not_quoted": int,         # items in the RFQ this supplier didn't quote
            "consolidation_coverage_pct": float,   # share of total RFQ qty they cover
            "missing_value_at_history": float,     # value of items they didn't quote, at hist price
          }, ... sorted by consolidation_value asc (cheapest first)
        ],
        "winner": {
          "supplier": str,
          "consolidation_value": float,
          "carve_outs": [
            {
              "rfq_key", "item_num", "description",
              "winner_price", "winner_supplier",
              "carve_supplier", "carve_price",
              "qty_24mo", "savings_per_unit", "savings_total",
              "savings_pct"
            }, ... sorted by savings_total desc
          ],
          "carve_out_savings_total": float,
          "items_winner_didnt_quote": [
            {"rfq_key", "item_num", "description", "qty_24mo",
             "best_alt_supplier", "best_alt_price",
             "value_at_best_alt", "value_at_history"}, ...
          ],
          "final_award_value": float,    # winner-base − carveout-savings + missing-items-at-best-alt
          "final_award_value_vs_history": float,  # vs historical at last_unit_price
        } | None,
        "summary": {
          "n_suppliers": int,
          "n_items": int,
          "carve_out_threshold_pct": float,
        }
      }
    """
    if carve_threshold is None:
        carve_threshold = DEFAULT_CARVE_OUT_THRESHOLD

    items = _STATE.get("items", [])
    bids_by_supplier = _STATE.get("bids", {}) or {}
    suppliers = list(bids_by_supplier.keys())

    if included_keys is not None:
        keep = set(included_keys)
        items = [it for it in items if it["item_num"] in keep]

    # Build (supplier, rfq_key) → bid lookup
    bid_lookup = {}
    for sup, parsed in bids_by_supplier.items():
        for b in parsed.get("bids", []):
            if b["status"] in (BID_STATUS_PRICED, BID_STATUS_UOM_DISC, BID_STATUS_SUBSTITUTE) \
               and b["effective_price"] is not None and b["effective_price"] > 0:
                bid_lookup[(sup, b["rfq_key"])] = b

    n_items = len(items)
    candidates = []
    for sup in suppliers:
        n_quoted = 0
        n_lowest = 0
        consol_value = 0.0
        missing_at_history = 0.0
        items_not_quoted = 0
        for it in items:
            qty = it.get("qty_24mo") or 0
            sup_bid = bid_lookup.get((sup, it["key"]))
            if sup_bid:
                n_quoted += 1
                consol_value += sup_bid["effective_price"] * qty
                # Are they the lowest among all suppliers for this item?
                others = [bid_lookup.get((s, it["key"])) for s in suppliers]
                priced = [b["effective_price"] for b in others if b]
                if priced and sup_bid["effective_price"] == min(priced):
                    n_lowest += 1
            else:
                items_not_quoted += 1
                hist = it.get("last_unit_price") or 0
                if hist > 0:
                    missing_at_history += hist * qty

        candidates.append({
            "supplier": sup,
            "n_items_quoted": n_quoted,
            "pct_items_quoted": (100.0 * n_quoted / n_items) if n_items else 0.0,
            "n_items_lowest": n_lowest,
            "pct_items_lowest": (100.0 * n_lowest / n_quoted) if n_quoted else 0.0,
            "consolidation_value": consol_value,
            "items_not_quoted": items_not_quoted,
            "consolidation_coverage_pct": (100.0 * n_quoted / n_items) if n_items else 0.0,
            "missing_value_at_history": missing_at_history,
        })

    # Sort by consolidation_value ASC (cheapest = best consolidation candidate)
    # Tiebreak: more items quoted (higher coverage) wins
    candidates.sort(key=lambda c: (c["consolidation_value"], -c["n_items_quoted"]))

    winner_block = None
    if candidates:
        winner = candidates[0]
        winner_sup = winner["supplier"]
        carve_outs = []
        items_not_quoted_details = []
        carve_savings_total = 0.0
        items_at_best_alt = 0.0

        for it in items:
            qty = it.get("qty_24mo") or 0
            winner_bid = bid_lookup.get((winner_sup, it["key"]))
            other_bids = [
                (s, bid_lookup[(s, it["key"])]["effective_price"])
                for s in suppliers
                if s != winner_sup and (s, it["key"]) in bid_lookup
            ]
            if winner_bid:
                # Consolidation winner quoted — check if a carve-out is justified
                w_price = winner_bid["effective_price"]
                if other_bids:
                    other_bids.sort(key=lambda t: t[1])
                    cheapest_other_sup, cheapest_other_price = other_bids[0]
                    if cheapest_other_price < w_price * (1.0 - carve_threshold):
                        savings_per_unit = w_price - cheapest_other_price
                        savings_total = savings_per_unit * qty
                        # UOM-discrepancy guard — if EITHER side has a UOM
                        # warning OR the price ratio is extreme (>20×), flag
                        # the carve-out as needing UOM verification before
                        # being trusted as real savings. Fastenal's "per each
                        # vs McMaster per package" notes are the canonical case.
                        carve_bid_record = bid_lookup.get((cheapest_other_sup, it["key"]))
                        winner_bid_record = bid_lookup.get((winner_sup, it["key"]))
                        carve_status = (carve_bid_record or {}).get("status")
                        winner_status = (winner_bid_record or {}).get("status")
                        verify_uom = (
                            carve_status == BID_STATUS_UOM_DISC or
                            winner_status == BID_STATUS_UOM_DISC or
                            (cheapest_other_price > 0 and w_price / cheapest_other_price >= 20.0)
                        )
                        carve_outs.append({
                            "rfq_key": it["key"],
                            "item_num": it["item_num"],
                            "description": it["description"],
                            "qty_24mo": qty,
                            "winner_supplier": winner_sup,
                            "winner_price": w_price,
                            "carve_supplier": cheapest_other_sup,
                            "carve_price": cheapest_other_price,
                            "savings_per_unit": savings_per_unit,
                            "savings_total": savings_total,
                            "savings_pct": (savings_per_unit / w_price * 100.0) if w_price else 0.0,
                            "verify_uom": verify_uom,
                            "carve_notes": (carve_bid_record or {}).get("notes", ""),
                            "winner_notes": (winner_bid_record or {}).get("notes", ""),
                        })
                        # Only count savings from carve-outs that DON'T need UOM verify
                        if not verify_uom:
                            carve_savings_total += savings_total
            else:
                # Winner didn't quote — pick best alternative
                if other_bids:
                    other_bids.sort(key=lambda t: t[1])
                    best_alt_sup, best_alt_price = other_bids[0]
                    items_at_best_alt += best_alt_price * qty
                    items_not_quoted_details.append({
                        "rfq_key": it["key"],
                        "item_num": it["item_num"],
                        "description": it["description"],
                        "qty_24mo": qty,
                        "best_alt_supplier": best_alt_sup,
                        "best_alt_price": best_alt_price,
                        "value_at_best_alt": best_alt_price * qty,
                        "value_at_history": (it.get("last_unit_price") or 0) * qty,
                    })
                else:
                    # Nobody quoted this item — flag for follow-up
                    items_not_quoted_details.append({
                        "rfq_key": it["key"],
                        "item_num": it["item_num"],
                        "description": it["description"],
                        "qty_24mo": qty,
                        "best_alt_supplier": None,
                        "best_alt_price": None,
                        "value_at_best_alt": 0.0,
                        "value_at_history": (it.get("last_unit_price") or 0) * qty,
                    })

        carve_outs.sort(key=lambda c: c["savings_total"], reverse=True)

        # Final award value = winner's full quote − carve savings + items at best alt
        final_award_value = winner["consolidation_value"] - carve_savings_total + items_at_best_alt

        # vs historical at last_unit_price (for items either supplier covers)
        historical_value = 0.0
        for it in items:
            qty = it.get("qty_24mo") or 0
            hist = it.get("last_unit_price") or 0
            historical_value += hist * qty

        winner_block = {
            "supplier": winner_sup,
            "consolidation_value": winner["consolidation_value"],
            "carve_outs": carve_outs,
            "carve_out_savings_total": carve_savings_total,
            "items_winner_didnt_quote": items_not_quoted_details,
            "n_items_winner_didnt_quote": len(items_not_quoted_details),
            "items_at_best_alt_value": items_at_best_alt,
            "final_award_value": final_award_value,
            "historical_value": historical_value,
            "savings_vs_history": historical_value - final_award_value,
        }

    return {
        "candidates": candidates,
        "winner": winner_block,
        "summary": {
            "n_suppliers": len(suppliers),
            "n_items": n_items,
            "carve_out_threshold_pct": carve_threshold * 100.0,
        },
    }


# ---------------------------------------------------------------------------
# Register module so app.js can `from app_engine import ...`
# ---------------------------------------------------------------------------
sys.modules["app_engine"] = sys.modules[__name__]
