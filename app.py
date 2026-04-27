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


# ---------------------------------------------------------------------------
# UOM normalization
#
# Suppliers spell the same UOM many ways — EA/Each/EACH/each. Map them to a
# canonical short form for comparison + display. Risky changes (Box→Each,
# Roll→Feet, Pair→Each) are flagged but never auto-converted without an
# explicit conversion factor.
# ---------------------------------------------------------------------------

UOM_CANONICAL = {
    # Each
    "EA": "EA", "EACH": "EA", "EACHES": "EA", "EAS": "EA",
    "PCE": "EA", "PIECE": "EA", "PIECES": "EA", "PC": "EA", "UNIT": "EA",
    # Box
    "BX": "BX", "BOX": "BX", "BOXES": "BX",
    # Pack
    "PK": "PK", "PACK": "PK", "PACKAGE": "PK", "PACKAGES": "PK", "PKG": "PK",
    # Foot
    "FT": "FT", "FOOT": "FT", "FEET": "FT",
    # Inch
    "IN": "IN", "INCH": "IN", "INCHES": "IN",
    # Pound
    "LB": "LB", "LBS": "LB", "POUND": "LB", "POUNDS": "LB",
    # Kilogram
    "KG": "KG", "KILO": "KG", "KILOGRAM": "KG", "KILOGRAMS": "KG",
    # Gallon / quart / pint / ounce
    "GAL": "GAL", "GALLON": "GAL", "GALLONS": "GAL",
    "QT": "QT", "QUART": "QT", "QUARTS": "QT",
    "PT": "PT", "PINT": "PT", "PINTS": "PT",
    "OZ": "OZ", "OUNCE": "OZ", "OUNCES": "OZ",
    # Roll / case / dozen / pair / set / kit
    "RL": "RL", "ROLL": "RL", "ROLLS": "RL",
    "CS": "CS", "CASE": "CS", "CASES": "CS",
    "DZ": "DZ", "DOZ": "DZ", "DOZEN": "DZ",
    "PR": "PR", "PAIR": "PR", "PAIRS": "PR",
    "ST": "SET", "SET": "SET", "SETS": "SET",
    "KT": "KIT", "KIT": "KIT", "KITS": "KIT",
    # Metric length
    "M": "M", "METER": "M", "METERS": "M", "METRE": "M",
    "CM": "CM", "CENTIMETER": "CM", "CENTIMETERS": "CM",
    "MM": "MM", "MILLIMETER": "MM", "MILLIMETERS": "MM",
    # Bag / bundle
    "BG": "BG", "BAG": "BG", "BAGS": "BG",
    "BD": "BD", "BUNDLE": "BD", "BUNDLES": "BD",
}


def canon_uom(s) -> str:
    """Return the canonical UOM short form. Empty string if unknown/blank."""
    if not s:
        return ""
    t = str(s).strip().upper()
    if not t or _is_blanky(t):
        return ""
    # Strip trailing periods (E.A. → EA)
    t = t.rstrip(".").rstrip("/")
    return UOM_CANONICAL.get(t, t)


# UOM pairs that are inherently risky to compare or convert without a
# conversion factor. Direction matters: ("BX", "EA") means treating Box as
# Each is the wrong move. We flag these on the per-item record so the UI can
# surface the concern; never auto-convert.
RISKY_UOM_CHANGES = {
    ("BX", "EA"), ("EA", "BX"),
    ("PK", "EA"), ("EA", "PK"),
    ("CS", "EA"), ("EA", "CS"),
    ("RL", "FT"), ("FT", "RL"),
    ("RL", "IN"), ("IN", "RL"),
    ("PR", "EA"), ("EA", "PR"),
    ("DZ", "EA"), ("EA", "DZ"),
    ("GAL", "OZ"), ("OZ", "GAL"),
    ("GAL", "QT"), ("QT", "GAL"),
    ("LB", "EA"), ("EA", "LB"),
    ("BG", "EA"), ("EA", "BG"),
    ("KIT", "EA"), ("EA", "KIT"),
    ("SET", "EA"), ("EA", "SET"),
}


def is_risky_uom_change(from_uom: str, to_uom: str) -> bool:
    a = canon_uom(from_uom)
    b = canon_uom(to_uom)
    if not a or not b or a == b:
        return False
    return (a, b) in RISKY_UOM_CHANGES


# ---------------------------------------------------------------------------
# Description-pattern flags
#
# Items whose description suggests they don't belong in a standard RFQ:
# services, freight, custom one-offs, etc. Surface these as flags so the
# user can drop them from the candidate list intentionally.
# ---------------------------------------------------------------------------

DESC_PATTERN_FLAGS = {
    "service":  ["service", "labor", "installation install", "tech support", "consulting"],
    "freight":  ["freight", "shipping charge", "delivery charge", "expedite"],
    "tariff":   ["tariff", "duty", "customs charge"],
    "custom":   ["custom", "made-to-order", "made to order", "special order", "bespoke", "non-standard"],
    "repair":   ["repair", "rebuild", "refurbish", "remanufactured"],
    "rental":   ["rental", "lease", "loaner"],
    "misc":     ["misc", "miscellaneous", "general supplies", "various", "assorted"],
    "obsolete": ["obsolete", "discontinued", "no longer available", "end of life", "eol"],
    "generic":  [],   # placeholder — handled separately by length check
}


def description_pattern_flags(desc: str) -> list:
    """Return a list of pattern category names that fired for this description.
    Used for both Step 3 curation and the readiness scoring."""
    if not desc:
        return ["generic"]
    d = str(desc).strip().lower()
    if not d:
        return ["generic"]
    flags = []
    for category, patterns in DESC_PATTERN_FLAGS.items():
        for pat in patterns:
            # Word-boundary-ish match: flank with spaces or string edges
            if pat in d:
                flags.append(category)
                break
    # Generic: very short descriptions like "Cord Grip" / "Brackets"
    # or descriptions with no spaces (single-word items)
    if "generic" not in flags and (len(d) < 12 or " " not in d):
        flags.append("generic")
    return flags


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
        uoms_raw = rec["uom_counts"].most_common()
        uom_raw = uoms_raw[0][0] if uoms_raw else ""
        # Canonicalize before deciding "mixed" — Each/EA/EACH all map to EA so
        # they shouldn't trip the mixed-UOM warning.
        canon_counts = Counter()
        for u, n in uoms_raw:
            cu = canon_uom(u)
            if cu:
                canon_counts[cu] += n
        canon_top = canon_counts.most_common()
        uom = canon_top[0][0] if canon_top else canon_uom(uom_raw)
        uom_mixed = len(canon_top) > 1
        # Description-pattern flags — "freight", "obsolete", "generic", etc.
        desc_flags = description_pattern_flags(rec["description"])

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
            "uom_raw": uom_raw,
            "uom_mixed": uom_mixed,
            "uom_distinct": [u for u, _ in canon_top],
            "desc_flags": desc_flags,
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
    add_demand_concern_flags(out_items, anchor_date=now)
    difficulty = compute_difficulty_rating(out_items, kpis)
    # Persist difficulty as a timestamped snapshot for period-end reporting
    record_difficulty_snapshot(difficulty)

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


def add_demand_concern_flags(items: list, anchor_date) -> None:
    """Flag items whose demand pattern is suspicious for RFQ. Per the brief:
    one-time spikes, dropped-off demand, surging demand, single-order
    dominance, etc. These are surfaced as `demand_flags` on each item record.
    """
    for it in items:
        flags = []
        q12 = it.get("qty_12mo") or 0
        q24 = it.get("qty_24mo") or 0
        q36 = it.get("qty_36mo") or 0
        q_all = it.get("qty_all") or 0
        po_count = it.get("po_count") or 0
        last_iso = it.get("last_order")

        # 12-mo zero but older usage exists
        if q12 == 0 and q_all > 0:
            flags.append("DORMANT_12MO")

        # Demand drop > 50% (compare 12mo annualized to prior-12-to-24mo annualized)
        prior_12_24 = q24 - q12  # months 13-24
        if prior_12_24 > 0:
            change = (q12 - prior_12_24) / prior_12_24
            if change <= -0.5:
                flags.append("DEMAND_DROP_50")
            elif change >= 0.5:
                flags.append("DEMAND_SURGE_50")

        # One order dominates >80% of usage
        if po_count == 1 and q_all > 0:
            flags.append("SINGLE_ORDER")
        elif po_count > 0 and q_all > 0:
            # Approximate: if total qty / po_count is wildly unbalanced
            avg_per_po = q_all / po_count
            # If the 24mo qty is concentrated (one PO at 80%+ of 24mo) — heuristic
            # only available with PO line detail, deferred
            pass

        # Last order > 12 months ago — already in scoring as recency penalty,
        # but we surface it explicitly here too
        if last_iso and anchor_date:
            try:
                last_dt = datetime.fromisoformat(last_iso)
                days_since = (anchor_date - last_dt).days
                if days_since > 365:
                    flags.append("STALE_OVER_12MO")
            except (ValueError, TypeError):
                pass

        # Order count low overall
        if 0 < po_count <= 2:
            flags.append("FEW_ORDERS")

        it["demand_flags"] = flags


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
    return get_thresholds()["outlier_factor"]


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

        row_record = {
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
        }
        rec = recommend_for_item(row_record)
        row_record["recommendation"] = rec["recommendation"]
        row_record["recommendation_target"] = rec["target_supplier"]
        row_record["recommendation_reason"] = rec["reason"]
        row_record["secondary_actions"] = rec["secondary_actions"]
        rows.append(row_record)

    est_savings = total_historical - total_lowest

    # Rec-distribution summary
    rec_counts = {}
    for r in rows:
        rec_counts[r["recommendation"]] = rec_counts.get(r["recommendation"], 0) + 1

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
            "recommendation_counts": rec_counts,
        },
    }


# ---------------------------------------------------------------------------
# Difficulty snapshot history — appended each extract for period-end reporting.
# Stored as a list on _STATE so the save-state JSON captures the full series.
# ---------------------------------------------------------------------------

def record_difficulty_snapshot(difficulty: dict) -> None:
    if not isinstance(difficulty, dict) or not difficulty.get("score"):
        return
    history = _STATE.get("difficulty_history", [])
    snap = {
        "snapshot_at": difficulty.get("snapshot_at") or datetime.now().isoformat(),
        "score": difficulty.get("score"),
        "level": difficulty.get("level"),
        "summary": difficulty.get("summary"),
        "signals": dict(difficulty.get("signals") or {}),
    }
    # Don't duplicate — if last snapshot has the same signals, skip
    if history:
        last = history[-1]
        if last.get("score") == snap["score"] and last.get("signals") == snap["signals"]:
            return
    history.append(snap)
    # Cap at 50 snapshots so the save state doesn't grow unbounded
    if len(history) > 50:
        history = history[-50:]
    _STATE["difficulty_history"] = history


def list_difficulty_history() -> list:
    return list(_STATE.get("difficulty_history", []))


def clear_difficulty_history() -> None:
    _STATE["difficulty_history"] = []


# ---------------------------------------------------------------------------
# Recommendation engine — 5-tier per-item recommendations with mandatory reasons.
#
# Categories (deterministic, no AI):
#   ACCEPT             — clear winner, no exceptions, savings exceed threshold
#   PUSH_BACK          — quote is high vs baseline OR vs lowest competitor
#   ASK_CLARIFICATION  — UOM mismatch, missing data, alternate offered, etc.
#   EXCLUDE            — no bid, invalid price, item identity changed
#   MANUAL_REVIEW      — data conflict, low usage, outlier, ties
#
# Every recommendation carries a `reason` string with concrete numbers.
# ---------------------------------------------------------------------------
RECOMMENDATION_ACCEPT      = "ACCEPT"
RECOMMENDATION_PUSH_BACK   = "PUSH_BACK"
RECOMMENDATION_CLARIFY     = "ASK_CLARIFICATION"
RECOMMENDATION_EXCLUDE     = "EXCLUDE"
RECOMMENDATION_MANUAL      = "MANUAL_REVIEW"


def _fmt_pct(x):
    return f"{x*100:.0f}%" if x is not None else "—"


def _fmt_money(x):
    return f"${x:,.2f}" if x is not None else "—"


def recommend_for_item(matrix_row: dict) -> dict:
    """Given one row of the comparison matrix, return:
        {
          "recommendation": ACCEPT | PUSH_BACK | ASK_CLARIFICATION | EXCLUDE | MANUAL_REVIEW,
          "target_supplier": str | None,
          "reason": str,
          "secondary_actions": [str, ...],   # additional follow-ups (e.g. push back AND ask MOQ)
        }

    Decision rules (in priority order — first match wins):
      1. n_quoted == 0 → EXCLUDE (no bid from anyone)
      2. ALL bids have status NEED_INFO → ASK_CLARIFICATION
      3. Any UOM_DISC on the lowest bid → ASK_CLARIFICATION (verify UOM first)
      4. Any SUBSTITUTE on the lowest bid → ASK_CLARIFICATION (validate alt part)
      5. Lowest bid >> baseline (>pushback_threshold AND no cheaper alt) → PUSH_BACK
      6. Lowest bid is an outlier among bids OR vs history → MANUAL_REVIEW
      7. Lowest bid available, savings >= min_savings_pct_to_switch → ACCEPT
      8. Otherwise → MANUAL_REVIEW (low savings; not worth switching cost)
    """
    th = get_thresholds()
    pushback_pct = th["pushback_threshold_pct"]
    min_switch_pct = th["min_savings_pct_to_switch"]

    n_quoted = matrix_row.get("n_quoted", 0)
    bids = matrix_row.get("bids") or {}
    flags = matrix_row.get("flags") or []
    lowest_supplier = matrix_row.get("lowest_supplier")
    lowest_price = matrix_row.get("lowest_price")
    historical = matrix_row.get("last_unit_price") or 0
    qty = matrix_row.get("qty_24mo") or 0

    secondary = []

    # Rule 1: nobody bid
    if n_quoted == 0:
        return {
            "recommendation": RECOMMENDATION_EXCLUDE,
            "target_supplier": None,
            "reason": "No supplier quoted this item. Either follow up with all suppliers or drop the item from the RFQ.",
            "secondary_actions": [],
        }

    # Rule 2: all bids need info
    statuses = [b.get("status") for b in bids.values() if b.get("status") not in (None, "MISSING")]
    if statuses and all(s == BID_STATUS_NEED_INFO for s in statuses):
        return {
            "recommendation": RECOMMENDATION_CLARIFY,
            "target_supplier": None,
            "reason": "All responding suppliers asked for more information. Provide additional spec or sample before re-quoting.",
            "secondary_actions": [],
        }

    if not lowest_supplier or lowest_price is None:
        return {
            "recommendation": RECOMMENDATION_MANUAL,
            "target_supplier": None,
            "reason": "No usable bid (all responses are no-bid / need-info / invalid). Manual review.",
            "secondary_actions": [],
        }

    lowest_bid = bids.get(lowest_supplier) or {}
    lowest_status = lowest_bid.get("status")
    lowest_raw = lowest_bid.get("raw") or {}

    # Rule 3: UOM discrepancy on the lowest bid
    if lowest_status == BID_STATUS_UOM_DISC:
        return {
            "recommendation": RECOMMENDATION_CLARIFY,
            "target_supplier": lowest_supplier,
            "reason": f"Lowest bid is from {lowest_supplier} at {_fmt_money(lowest_price)} but they flagged a UOM discrepancy. Confirm UOM before treating as real savings.",
            "secondary_actions": ["UOM_VERIFY"],
        }

    # Rule 4: substitute offered on the lowest bid
    if lowest_status == BID_STATUS_SUBSTITUTE:
        sub_part = lowest_raw.get("sub_part") or "(unspecified)"
        return {
            "recommendation": RECOMMENDATION_CLARIFY,
            "target_supplier": lowest_supplier,
            "reason": f"Lowest bid from {lowest_supplier} is for an alternate part ({sub_part}). Validate that the substitute meets spec before awarding.",
            "secondary_actions": ["SPEC_VERIFY"],
        }

    # Rule 5: all bids high vs history (push back)
    if historical > 0:
        gap_vs_hist = (lowest_price - historical) / historical
        if gap_vs_hist >= pushback_pct:
            return {
                "recommendation": RECOMMENDATION_PUSH_BACK,
                "target_supplier": lowest_supplier,
                "reason": f"Lowest bid ({_fmt_money(lowest_price)} from {lowest_supplier}) is {_fmt_pct(gap_vs_hist)} above the historical paid price ({_fmt_money(historical)}). Push back before accepting.",
                "secondary_actions": [],
            }

    # Rule 6: outlier flags
    if flags:
        # Detect specific flag types
        outlier_flag = any("OUTLIER" in f for f in flags)
        all_high_flag = any("ALL_BIDS_HIGH" in f for f in flags)
        big_savings_flag = any("BIG_SAVINGS" in f for f in flags)
        if all_high_flag:
            return {
                "recommendation": RECOMMENDATION_PUSH_BACK,
                "target_supplier": lowest_supplier,
                "reason": f"All bids are well above historical paid price. Lowest is {_fmt_money(lowest_price)} from {lowest_supplier} — push back across the board or drop the item.",
                "secondary_actions": [],
            }
        if big_savings_flag:
            return {
                "recommendation": RECOMMENDATION_MANUAL,
                "target_supplier": lowest_supplier,
                "reason": f"Lowest bid ({_fmt_money(lowest_price)} from {lowest_supplier}) is dramatically below historical paid ({_fmt_money(historical)}). Verify it's the same item / spec / UOM before accepting.",
                "secondary_actions": ["SPEC_VERIFY", "UOM_VERIFY"],
            }
        if outlier_flag:
            return {
                "recommendation": RECOMMENDATION_MANUAL,
                "target_supplier": lowest_supplier,
                "reason": f"Lowest bid ({_fmt_money(lowest_price)} from {lowest_supplier}) is statistically an outlier vs the other bids. Verify before awarding.",
                "secondary_actions": [],
            }

    # Rule 7: clear acceptance
    if historical > 0:
        savings_pct = (historical - lowest_price) / historical
        savings_total = (historical - lowest_price) * qty
        if savings_pct >= min_switch_pct:
            return {
                "recommendation": RECOMMENDATION_ACCEPT,
                "target_supplier": lowest_supplier,
                "reason": f"Award to {lowest_supplier} at {_fmt_money(lowest_price)}. Saves {_fmt_pct(savings_pct)} vs historical ({_fmt_money(historical)}) — about {_fmt_money(savings_total)} on 24-mo qty.",
                "secondary_actions": [],
            }
        else:
            # Savings below the switch threshold — recommend manual review
            return {
                "recommendation": RECOMMENDATION_MANUAL,
                "target_supplier": lowest_supplier,
                "reason": f"Lowest bid {_fmt_money(lowest_price)} from {lowest_supplier} only saves {_fmt_pct(savings_pct)} vs historical. Below the {_fmt_pct(min_switch_pct)} switching threshold — may not be worth a supplier change.",
                "secondary_actions": [],
            }

    # No historical baseline — accept the lowest bid but note it
    return {
        "recommendation": RECOMMENDATION_ACCEPT,
        "target_supplier": lowest_supplier,
        "reason": f"Award to {lowest_supplier} at {_fmt_money(lowest_price)} (no historical baseline to compare against).",
        "secondary_actions": [],
    }


# ---------------------------------------------------------------------------
# Consolidation analysis — Ryan's actual award strategy.
#
# Default: consolidate to ONE supplier (operational simplicity beats per-line
# lowest pricing when the savings are small). Then carve out a limited set
# of "extreme exceptions" — items where another supplier saves enough on a
# single item to justify splitting the award.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Configurable project thresholds
#
# All tunable knobs live in one dict so the UI can read/write them and they
# get persisted in the save state. Defaults are sensible for MRO RFQs but
# every project / supplier mix should be allowed to override.
# ---------------------------------------------------------------------------
DEFAULT_THRESHOLDS = {
    "carve_out_min_savings_pct": 0.30,       # carve-out candidate if other supplier saves >= 30% of winner price
    "outlier_factor": 3.0,                   # bid is outlier if >= Nx median or <= 1/N of median
    "spike_factor": 1.5,                     # latest price is "spike" if >= 1.5x 90-day median
    "uom_suspect_ratio": 20.0,               # carve-out price ratio >= this → mark UOM-verify
    "min_savings_pct_to_switch": 0.05,       # below 5% savings, prefer incumbent (avoid switching cost)
    "pushback_threshold_pct": 0.10,          # quote >10% above baseline → push back
    "max_acceptable_lead_time_days": 60,     # bids with lead time > this are flagged
    "max_acceptable_moq_vs_annual": 1.0,     # bids with MOQ > annual qty are flagged
    "min_quote_validity_days": 30,           # quotes valid <30 days are flagged
    "min_spend_for_review": 100.0,           # below this 24mo spend, item not worth manual review
    "high_spend_no_bid_threshold": 1000.0,   # no-bid items with >$X 24mo spend get follow-up flag
}


def get_thresholds() -> dict:
    """Return current thresholds (defaults merged with any saved overrides)."""
    overrides = _STATE.get("thresholds", {})
    out = dict(DEFAULT_THRESHOLDS)
    out.update(overrides)
    return out


def set_thresholds(updates: dict) -> dict:
    """Update one or more thresholds. Returns the new merged state."""
    current = _STATE.get("thresholds", {}) or {}
    current.update({k: v for k, v in (updates or {}).items() if k in DEFAULT_THRESHOLDS})
    _STATE["thresholds"] = current
    return get_thresholds()


def reset_thresholds() -> dict:
    _STATE["thresholds"] = {}
    return get_thresholds()


# Legacy alias (kept for back-compat with existing call sites; use thresholds)
DEFAULT_CARVE_OUT_THRESHOLD = 0.30


def compute_consolidation_analysis(included_keys=None, carve_threshold: float = None,
                                   uom_suspect_ratio: float = None) -> dict:
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
    th = get_thresholds()
    if carve_threshold is None:
        carve_threshold = th["carve_out_min_savings_pct"]
    if uom_suspect_ratio is None:
        uom_suspect_ratio = th["uom_suspect_ratio"]

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
                            (cheapest_other_price > 0 and w_price / cheapest_other_price >= uom_suspect_ratio)
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
# Supplier follow-up xlsx generator — multi-tab pushback / clarification packet
#
# Per the brief's recommended structure:
#   1. Summary
#   2. Items Needing Price Review  (PUSH_BACK recommendations)
#   3. Missing Information         (NEED_INFO bids)
#   4. UOM or MOQ Exceptions       (UOM_DISC, MOQ flags)
#   5. Alternate Parts             (SUBSTITUTE bids)
#   6. No-Bids                     (NO_BID lines, ask why + pricing window)
#   7. Full Quote Detail           (every line this supplier responded to)
#
# Template-based prose only — no AI. Per the cross-supplier isolation rule,
# this xlsx contains ONLY the named supplier's own data — never another
# supplier's bid prices or our internal target/cost/margin.
# ---------------------------------------------------------------------------

PUSHBACK_TEMPLATES = {
    "price_too_high_vs_history": (
        "Your quoted price for {item_desc} is {gap_pct} above our historical "
        "paid price of {hist_price} per {uom}. Annualized volume is "
        "approximately {qty} units. Please review whether you have room to "
        "improve pricing on this item."
    ),
    "price_too_high_vs_competition": (
        "Your quoted price for {item_desc} is {gap_pct} above the lowest "
        "qualified quote we received. We would like to consolidate with you "
        "if possible — please confirm whether you can revisit pricing."
    ),
    "missing_info_request": (
        "We were unable to evaluate your quote for {item_desc} because "
        "additional information was needed. Please provide unit price, UOM, "
        "and confirmation that the part offered matches our specification."
    ),
    "uom_clarification": (
        "Your quote for {item_desc} indicates a UOM mismatch with our "
        "purchasing UOM ({our_uom}). Please confirm your quoted UOM and "
        "whether the price needs to be normalized to our UOM."
    ),
    "moq_concern": (
        "The minimum order quantity on your quote for {item_desc} ({moq}) "
        "exceeds our typical annual consumption ({qty}). Please confirm "
        "whether a smaller MOQ is available."
    ),
    "alternate_part_review": (
        "You quoted an alternate part ({alt_part}) for our requested item "
        "{item_desc}. Please confirm form/fit/function equivalence and "
        "whether your alternate is in stock and current."
    ),
    "no_bid_clarification": (
        "You did not bid on {item_desc} (note: \"{notes}\"). If this item "
        "is something you can supply with additional information or a longer "
        "lead time, please let us know."
    ),
}


def gen_supplier_followup_xlsx(supplier_name: str, included_keys=None) -> bytes:
    """Build the follow-up packet xlsx for one supplier.

    Strict isolation: only this supplier's own bid data appears.
    No other supplier's prices, no internal target/cost/margin.
    """
    if not supplier_name:
        raise ValueError("supplier_name required")
    bids_by_supplier = _STATE.get("bids", {}) or {}
    parsed = bids_by_supplier.get(supplier_name)
    if not parsed:
        raise ValueError(f"No loaded bids for supplier {supplier_name!r}")

    # Match each bid back to RFQ items so we can include item context
    items = _STATE.get("items", [])
    if included_keys is not None:
        keep = set(included_keys)
        items = [it for it in items if it["item_num"] in keep]
    item_by_key = {it["key"]: it for it in items}

    matrix = compute_comparison_matrix(included_keys=included_keys)
    rows_by_key = {r["rfq_key"]: r for r in matrix["rows"]}

    th = get_thresholds()
    pushback_pct = th["pushback_threshold_pct"]

    # Categorize this supplier's bids by recommendation tab
    bids_for_review = []     # PUSH_BACK
    bids_missing_info = []   # NEED_INFO
    bids_uom_or_moq = []     # UOM_DISC or MOQ flagged
    bids_alternates = []     # SUBSTITUTE
    bids_no_bid = []         # NO_BID
    bids_all = []            # everything (Full Quote Detail tab)

    for b in parsed.get("bids", []):
        rfq_key = b["rfq_key"]
        item = item_by_key.get(rfq_key)
        row = rows_by_key.get(rfq_key)
        rec_target_is_them = (row and row.get("recommendation_target") == supplier_name)
        rec = row.get("recommendation") if row else None

        ctx = {
            "rfq_key": rfq_key,
            "item_num": (item["item_num"] if item else b.get("item_num", "")),
            "part_number": (item.get("part_number") if item else b.get("part_number", "")),
            "description": (item["description"] if item else b.get("description", "")),
            "mfg_name": (item["mfg_name"] if item else b.get("mfg_name", "")),
            "our_uom": (item["uom"] if item else b.get("uom", "")),
            "qty_24mo": (item.get("qty_24mo") if item else (b.get("qty") or 0)),
            "historical_price": (item.get("last_unit_price") if item else None),
            "your_price": b.get("effective_price"),
            "your_quoted_uom": b.get("uom", ""),
            "your_notes": b.get("notes", ""),
            "your_part": b.get("exact_part") or b.get("part_number", ""),
            "your_alt_part": b.get("sub_part") or "",
            "your_alt_desc": b.get("sub_desc") or "",
            "status": b["status"],
        }
        bids_all.append(ctx)

        # NO_BID
        if b["status"] == BID_STATUS_NO_BID:
            bids_no_bid.append(ctx)
            continue
        # NEED_INFO
        if b["status"] == BID_STATUS_NEED_INFO:
            bids_missing_info.append(ctx)
            continue
        # UOM discrepancy
        if b["status"] == BID_STATUS_UOM_DISC:
            bids_uom_or_moq.append(ctx)
            continue
        # SUBSTITUTE
        if b["status"] == BID_STATUS_SUBSTITUTE:
            bids_alternates.append(ctx)
            continue
        # PRICED — check if pushback applies (vs history OR vs competition)
        their_price = b["effective_price"] or 0
        hist = ctx["historical_price"] or 0
        # Vs history
        push_reason = None
        if hist > 0 and their_price > 0:
            gap = (their_price - hist) / hist
            if gap >= pushback_pct:
                push_reason = ("vs_history", gap)
        # Vs competition (do not name the cheaper supplier — isolation rule)
        if row and not push_reason:
            lowest_price = row.get("lowest_price")
            lowest_supplier = row.get("lowest_supplier")
            if (lowest_price and lowest_supplier and lowest_supplier != supplier_name
                    and lowest_price > 0 and their_price > lowest_price * (1 + pushback_pct)):
                comp_gap = (their_price - lowest_price) / lowest_price
                push_reason = ("vs_competition", comp_gap)
        if push_reason:
            ctx["pushback_kind"] = push_reason[0]
            ctx["pushback_gap_pct"] = push_reason[1]
            bids_for_review.append(ctx)

    # ---- Build the workbook ----
    wb = Workbook()
    HEADER_FILL = PatternFill("solid", fgColor="0a0e1a")
    BAND_FILL = PatternFill("solid", fgColor="2a3658")
    HEADER_FONT = Font(bold=True, color="FFFFFF", size=11)
    LABEL_FONT = Font(bold=True, color="b4c0d4", size=10)
    BANNER_FONT = Font(bold=True, color="ffb733", size=14)

    # ---- TAB 1: Summary ----
    ws = wb.active
    ws.title = "Summary"
    ws.append([f"RFQ Follow-Up — {supplier_name}"])
    ws["A1"].font = BANNER_FONT
    ws.append([f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}"])
    ws.append([])
    ws.append(["This packet contains items from your prior bid response that we'd like you to revisit."])
    ws.append(["Each tab covers a different category. Please review and respond at your convenience."])
    ws.append([])
    ws.append(["Section", "Item count", "Notes"])
    for c in ws[7]:
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        c.alignment = Alignment(horizontal="left", vertical="center")
    ws.append(["Items Needing Price Review", len(bids_for_review), "Quoted but priced high vs our baseline or vs the qualified market"])
    ws.append(["Missing Information", len(bids_missing_info), "Items where you indicated 'need more information'"])
    ws.append(["UOM / MOQ Exceptions", len(bids_uom_or_moq), "UOM mismatch or MOQ exceeds typical usage"])
    ws.append(["Alternate Parts", len(bids_alternates), "Where you offered a substitute part"])
    ws.append(["No-Bids", len(bids_no_bid), "Items you declined to quote — please confirm category & reason"])
    ws.append(["Full Quote Detail", len(bids_all), "Every line you responded to (reference)"])
    autosize(ws)

    # ---- TAB 2: Items Needing Price Review ----
    ws2 = wb.create_sheet("Items Needing Price Review")
    headers = ["Item #", "Description", "Manufacturer", "Our UOM", "Annual Qty",
               "Your Price", "Your UOM", "Reason for review", "Pushback message",
               "Your revised price", "Your notes"]
    ws2.append(headers)
    for c in ws2[1]:
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    yellow = PatternFill("solid", fgColor="FFF59D")
    for ctx in bids_for_review:
        kind = ctx.get("pushback_kind", "")
        gap = ctx.get("pushback_gap_pct", 0)
        if kind == "vs_history":
            reason_short = f"{gap*100:.0f}% above our prior paid price"
            tmpl = PUSHBACK_TEMPLATES["price_too_high_vs_history"].format(
                item_desc=(ctx["description"] or ctx["item_num"])[:80],
                gap_pct=f"{gap*100:.0f}%",
                hist_price=_fmt_money(ctx["historical_price"]),
                uom=ctx["our_uom"] or "unit",
                qty=f"{(ctx['qty_24mo'] or 0):,.0f}",
            )
        else:
            reason_short = f"{gap*100:.0f}% above the lowest qualified quote"
            tmpl = PUSHBACK_TEMPLATES["price_too_high_vs_competition"].format(
                item_desc=(ctx["description"] or ctx["item_num"])[:80],
                gap_pct=f"{gap*100:.0f}%",
            )
        ws2.append([
            ctx["item_num"], ctx["description"], ctx["mfg_name"], ctx["our_uom"],
            ctx["qty_24mo"], ctx["your_price"], ctx["your_quoted_uom"],
            reason_short, tmpl, "", "",
        ])
    # Yellow-fill the response columns (J=10, K=11) so they stand out
    for r in ws2.iter_rows(min_row=2, min_col=10, max_col=11):
        for c in r:
            c.fill = yellow
    for r in ws2.iter_rows(min_row=2, min_col=6, max_col=6):
        for c in r:
            c.number_format = "$#,##0.00"
    for r in ws2.iter_rows(min_row=2, min_col=10, max_col=10):
        for c in r:
            c.number_format = "$#,##0.00"
    autosize(ws2)
    ws2.freeze_panes = "A2"

    # ---- TAB 3: Missing Information ----
    ws3 = wb.create_sheet("Missing Information")
    ws3.append(["Item #", "Description", "Manufacturer", "Our UOM", "Annual Qty",
                "Your note", "What we need", "Your follow-up price", "Your follow-up UOM", "Your notes"])
    for c in ws3[1]:
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    for ctx in bids_missing_info:
        ws3.append([
            ctx["item_num"], ctx["description"], ctx["mfg_name"], ctx["our_uom"], ctx["qty_24mo"],
            ctx["your_notes"],
            PUSHBACK_TEMPLATES["missing_info_request"].format(item_desc=(ctx["description"] or ctx["item_num"])[:80]),
            "", "", "",
        ])
    for r in ws3.iter_rows(min_row=2, min_col=8, max_col=10):
        for c in r:
            c.fill = yellow
    for r in ws3.iter_rows(min_row=2, min_col=8, max_col=8):
        for c in r:
            c.number_format = "$#,##0.00"
    autosize(ws3)
    ws3.freeze_panes = "A2"

    # ---- TAB 4: UOM / MOQ Exceptions ----
    ws4 = wb.create_sheet("UOM and MOQ Exceptions")
    ws4.append(["Item #", "Description", "Our UOM", "Your quoted UOM", "Your price",
                "Your notes", "What we're asking", "Your confirmed UOM", "Your normalized price", "Your notes"])
    for c in ws4[1]:
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    for ctx in bids_uom_or_moq:
        ws4.append([
            ctx["item_num"], ctx["description"], ctx["our_uom"], ctx["your_quoted_uom"],
            ctx["your_price"], ctx["your_notes"],
            PUSHBACK_TEMPLATES["uom_clarification"].format(
                item_desc=(ctx["description"] or ctx["item_num"])[:80],
                our_uom=ctx["our_uom"] or "(unknown)",
            ),
            "", "", "",
        ])
    for r in ws4.iter_rows(min_row=2, min_col=8, max_col=10):
        for c in r:
            c.fill = yellow
    for r in ws4.iter_rows(min_row=2, min_col=5, max_col=5):
        for c in r:
            c.number_format = "$#,##0.00"
    for r in ws4.iter_rows(min_row=2, min_col=9, max_col=9):
        for c in r:
            c.number_format = "$#,##0.00"
    autosize(ws4)
    ws4.freeze_panes = "A2"

    # ---- TAB 5: Alternate Parts ----
    ws5 = wb.create_sheet("Alternate Parts")
    ws5.append(["Item #", "Description (ours)", "Manufacturer (ours)", "Annual Qty",
                "Your alternate part", "Your alternate description", "Your price",
                "Form/fit/function confirmed?", "Your notes"])
    for c in ws5[1]:
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    for ctx in bids_alternates:
        ws5.append([
            ctx["item_num"], ctx["description"], ctx["mfg_name"], ctx["qty_24mo"],
            ctx["your_alt_part"], ctx["your_alt_desc"], ctx["your_price"],
            "", "",
        ])
    for r in ws5.iter_rows(min_row=2, min_col=8, max_col=9):
        for c in r:
            c.fill = yellow
    for r in ws5.iter_rows(min_row=2, min_col=7, max_col=7):
        for c in r:
            c.number_format = "$#,##0.00"
    autosize(ws5)
    ws5.freeze_panes = "A2"

    # ---- TAB 6: No-Bids ----
    ws6 = wb.create_sheet("No-Bids")
    ws6.append(["Item #", "Description", "Manufacturer", "Our UOM", "Annual Qty",
                "Your no-bid note", "Reason category", "Could you bid with more info?", "Your notes"])
    for c in ws6[1]:
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    for ctx in bids_no_bid:
        ws6.append([
            ctx["item_num"], ctx["description"], ctx["mfg_name"], ctx["our_uom"], ctx["qty_24mo"],
            ctx["your_notes"],
            "", "", "",
        ])
    for r in ws6.iter_rows(min_row=2, min_col=7, max_col=9):
        for c in r:
            c.fill = yellow
    autosize(ws6)
    ws6.freeze_panes = "A2"

    # ---- TAB 7: Full Quote Detail ----
    ws7 = wb.create_sheet("Full Quote Detail")
    ws7.append(["Item #", "Description", "Manufacturer", "Our UOM", "Annual Qty",
                "Status", "Your price", "Your UOM", "Your part #", "Your alt part",
                "Your notes"])
    for c in ws7[1]:
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    for ctx in bids_all:
        ws7.append([
            ctx["item_num"], ctx["description"], ctx["mfg_name"], ctx["our_uom"], ctx["qty_24mo"],
            ctx["status"], ctx["your_price"], ctx["your_quoted_uom"],
            ctx["your_part"], ctx["your_alt_part"], ctx["your_notes"],
        ])
    for r in ws7.iter_rows(min_row=2, min_col=7, max_col=7):
        for c in r:
            c.number_format = "$#,##0.00"
    autosize(ws7)
    ws7.freeze_panes = "A2"

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Outbound RFQ generator — multi-tab Andersen-branded supplier xlsx.
#
# Per the brief's recommended structure:
#   1. Instructions
#   2. RFQ Lines  (with hidden item_key + rfq_line_id columns for round-trip)
#   3. Terms and Assumptions
#   4. Data Dictionary
#   5. Supplier Response Template
#
# Strict isolation: no historical paid price, no Andersen target / cost /
# margin. Each supplier file contains ONLY this supplier's identification
# and the items being asked. McMaster-style anchor: Part Number column is
# the unique join key for round-trip ingest.
# ---------------------------------------------------------------------------

def gen_outbound_rfq_xlsx(supplier_name: str, rfq_id: str = "",
                          response_due_date: str = "",
                          contact_name: str = "Ryan Jenkinson",
                          contact_email: str = "ryan.jenkinson@andersencorp.com",
                          included_keys=None) -> bytes:
    """Generate one supplier's outbound RFQ workbook.

    Strict isolation rules baked in:
      - No historical paid price column
      - No internal target / cost / margin
      - Hidden item_key and rfq_line_id columns for round-trip matching
      - Locked sheet, only response cells editable
      - Dropdown validation on Yes/No / UOM / No Bid Reason
    """
    if not supplier_name:
        raise ValueError("supplier_name required")

    items = _STATE.get("items", [])
    if included_keys is not None:
        keep = set(str(k) for k in included_keys)
        items = [it for it in items if it["item_num"] in keep]
    else:
        items = [it for it in items if it.get("included")]

    if not rfq_id:
        rfq_id = f"RFQ-{datetime.now().strftime('%Y-%m')}-001"
    if not response_due_date:
        # Default: 14 days from now
        from datetime import timedelta as _td
        response_due_date = (datetime.now() + _td(days=14)).strftime("%Y-%m-%d")

    wb = Workbook()
    HEADER_FILL = PatternFill("solid", fgColor="0a0e1a")
    BAND_FILL = PatternFill("solid", fgColor="2a3658")
    YELLOW_FILL = PatternFill("solid", fgColor="FFF59D")
    HEADER_FONT = Font(bold=True, color="FFFFFF", size=11)
    BANNER_FONT = Font(bold=True, color="ffb733", size=16)
    LABEL_FONT = Font(bold=True, color="000000", size=11)
    BODY_FONT = Font(size=11)
    THIN = Side(border_style="thin", color="999999")
    BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

    # ---- TAB 1: Instructions ----
    ws = wb.active
    ws.title = "Instructions"
    ws.append([f"REQUEST FOR QUOTATION — {rfq_id}"])
    ws["A1"].font = BANNER_FONT
    ws.append([f"Issued to: {supplier_name}"])
    ws.append([f"Issue date: {datetime.now().strftime('%Y-%m-%d')}"])
    ws.append([f"Response due: {response_due_date}"])
    ws.append([f"Contact: {contact_name} — {contact_email}"])
    ws.append([])
    ws.append(["Instructions"])
    ws["A7"].font = LABEL_FONT
    instructions = [
        "1. Please complete the 'Supplier Response Template' tab. Yellow cells are for your responses.",
        "2. Do not change the order of rows or columns. Hidden columns are used for round-trip matching.",
        "3. Quote each item in the UOM specified. If you must quote in a different UOM, use the 'Quote UOM' field and add a note.",
        "4. If you cannot bid on an item, mark 'No Bid' = Yes and select a reason from the dropdown.",
        "5. If you offer an alternate part, fill in 'Alternate Part Offered' = Yes and complete the alternate part columns.",
        "6. Lead time should be in calendar days from PO receipt.",
        "7. Quote validity: please indicate how long your prices are firm.",
        "8. All prices should be net (excluding freight unless otherwise noted in 'Freight Included').",
        "9. Please return the completed workbook to the contact above by the due date.",
        "10. Any item you do not respond to will be treated as a no-bid.",
    ]
    for line in instructions:
        ws.append([line])
    ws.append([])
    ws.append(["Tabs in this workbook:"])
    ws[f"A{ws.max_row}"].font = LABEL_FONT
    for tab_line in [
        "  • Instructions (this tab)",
        "  • RFQ Lines — read-only summary of items being requested",
        "  • Terms and Assumptions — ground rules for this RFQ",
        "  • Data Dictionary — definition of each column",
        "  • Supplier Response Template — fill in your responses here",
    ]:
        ws.append([tab_line])
    ws.column_dimensions["A"].width = 110

    # ---- TAB 2: RFQ Lines (read-only summary) ----
    ws2 = wb.create_sheet("RFQ Lines")
    ws2.append([f"RFQ Lines — {len(items):,} items requested"])
    ws2["A1"].font = BANNER_FONT
    ws2.append([])
    headers = ["Line #", "Andersen Item #", "EAM Part #", "Manufacturer Part #",
               "Manufacturer", "Description", "Commodity", "Annual Qty", "UOM"]
    ws2.append(headers)
    for c in ws2[3]:
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    sorted_items = sorted(items, key=lambda x: (x.get("qty_24mo") or 0) * (x.get("last_unit_price") or 0), reverse=True)
    for i, it in enumerate(sorted_items, start=1):
        ws2.append([
            i,
            it["item_num"],
            it.get("eam_pn") or "",
            it.get("mfg_pn") or "",
            it.get("mfg_name") or "",
            it.get("description") or "",
            it.get("commodity") or "",
            it.get("qty_24mo") or 0,
            it.get("uom") or "",
        ])
    autosize(ws2)
    ws2.freeze_panes = "A4"

    # ---- TAB 3: Terms and Assumptions ----
    ws3 = wb.create_sheet("Terms and Assumptions")
    ws3.append(["Terms and Assumptions"])
    ws3["A1"].font = BANNER_FONT
    ws3.append([])
    terms = [
        ("Quote currency", "USD unless otherwise stated."),
        ("Quote basis", "Net unit prices, excluding freight unless 'Freight Included' = Yes."),
        ("Quantity basis", "Annual quantities are estimates based on 24-month order history. Actual orders may vary."),
        ("Award terms", "This RFQ is not a commitment to purchase. Awards will be issued by separate purchase order."),
        ("Substitutes", "Alternate parts will be evaluated for form/fit/function equivalence. Quote the OEM part as primary; alternates are secondary."),
        ("Pricing audit", "Andersen reserves the right to request manufacturer cost documentation for items priced significantly above market."),
        ("Confidentiality", "Pricing in this RFQ and your responses are confidential between Andersen and your company."),
        ("Validity", "Quotes should remain firm for at least 90 days unless otherwise noted in the 'Valid Through' field."),
        ("Tariffs", "If tariffs apply, indicate whether they're included in your quoted price ('Tariff Included' field)."),
        ("Round-trip data", "Hidden columns in the response template (item_key, rfq_line_id) are used for matching your response back to our items. Do not delete or modify these columns."),
    ]
    ws3.append(["Topic", "Detail"])
    for c in ws3[3]:
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
    for topic, detail in terms:
        ws3.append([topic, detail])
    ws3.column_dimensions["A"].width = 24
    ws3.column_dimensions["B"].width = 100
    for row in ws3.iter_rows(min_row=4):
        for c in row:
            c.alignment = Alignment(vertical="top", wrap_text=True)

    # ---- TAB 4: Data Dictionary ----
    ws4 = wb.create_sheet("Data Dictionary")
    ws4.append(["Data Dictionary — every column defined"])
    ws4["A1"].font = BANNER_FONT
    ws4.append([])
    ws4.append(["Column", "Required?", "Definition"])
    for c in ws4[3]:
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
    dictionary = [
        ("Andersen Item #", "Reference", "Our internal item identifier."),
        ("EAM Part #", "Reference", "Our EAM/maintenance system part number (primary key for most suppliers)."),
        ("Manufacturer Part #", "Reference", "OEM manufacturer part number, when known."),
        ("Annual Qty", "Reference", "Estimated annual consumption based on 24-month history."),
        ("UOM", "Reference", "Our purchasing unit of measure."),
        ("Quote Price", "Required", "Your net unit price in the Quote UOM. To-the-penny precision."),
        ("Quote UOM", "Required", "The unit of measure your price is quoted in (EA, BX, PK, etc.). Use the dropdown."),
        ("Your Part #", "Required", "Your catalog SKU for this item."),
        ("Minimum Order Quantity", "Required if applicable", "Minimum order qty in your Quote UOM. Leave blank if no minimum."),
        ("Lead Time Days", "Required", "Calendar days from PO receipt to ship."),
        ("Country of Origin", "Recommended", "Two-letter ISO code (US, CN, MX, etc.)."),
        ("Manufacturer", "Recommended", "OEM manufacturer name."),
        ("Manufacturer Part Number", "Recommended", "OEM part number you're quoting."),
        ("Alternate Part Offered", "Optional", "Yes/No. Use the dropdown."),
        ("Alternate Item Number", "If alternate", "Your alternate part number, if you're proposing a substitute."),
        ("Alternate Description", "If alternate", "Description of the alternate part."),
        ("Tariff Included", "Required", "Yes/No. Whether your price includes any applicable tariffs."),
        ("Freight Included", "Required", "Yes/No. Whether your price includes freight to our facility."),
        ("No Bid", "Optional", "Yes/No. Mark Yes if you cannot bid on this item; select a reason."),
        ("No Bid Reason", "If no-bid", "Reason from the dropdown (Discontinued, Not Available, Need More Info, etc.)."),
        ("Supplier Notes", "Optional", "Any free-text comments — alternate proposals, UOM concerns, etc."),
        ("Valid Through Date", "Required", "Date your quote remains firm. YYYY-MM-DD format preferred."),
        ("item_key", "DO NOT EDIT", "Hidden internal matching key. Do not modify or delete."),
        ("rfq_line_id", "DO NOT EDIT", "Hidden internal line identifier. Do not modify or delete."),
    ]
    for col, req, defn in dictionary:
        ws4.append([col, req, defn])
    ws4.column_dimensions["A"].width = 30
    ws4.column_dimensions["B"].width = 18
    ws4.column_dimensions["C"].width = 80
    for row in ws4.iter_rows(min_row=4):
        for c in row:
            c.alignment = Alignment(vertical="top", wrap_text=True)

    # ---- TAB 5: Supplier Response Template ----
    ws5 = wb.create_sheet("Supplier Response Template")
    ws5.append([f"Supplier Response Template — {supplier_name} — {rfq_id}"])
    ws5["A1"].font = BANNER_FONT
    ws5.append(["Yellow cells are for your responses. Do not modify other columns."])
    ws5["A2"].font = Font(italic=True, color="666666")
    ws5.append([])
    template_headers = [
        # Reference (read-only) cols
        "Andersen Item #",   # A
        "EAM Part #",        # B
        "Manufacturer Part #",  # C
        "Manufacturer",      # D
        "Description",       # E
        "Annual Qty",        # F
        "UOM",               # G
        # Response cols (yellow)
        "Quote Price",       # H *
        "Quote UOM",         # I *
        "Your Part #",       # J *
        "Minimum Order Quantity",  # K
        "Lead Time Days",    # L *
        "Country of Origin", # M
        "Manufacturer (your)",  # N
        "Manufacturer Part Number (your)",  # O
        "Alternate Part Offered",  # P
        "Alternate Item Number",   # Q
        "Alternate Description",   # R
        "Tariff Included",   # S *
        "Freight Included",  # T *
        "No Bid",            # U
        "No Bid Reason",     # V
        "Supplier Notes",    # W
        "Valid Through Date",  # X *
        # Hidden round-trip columns
        "item_key",          # Y (hidden)
        "rfq_line_id",       # Z (hidden)
    ]
    ws5.append(template_headers)
    for c in ws5[4]:
        c.font = HEADER_FONT
        c.fill = HEADER_FILL
        c.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
        c.border = BORDER

    # Row data
    for i, it in enumerate(sorted_items, start=1):
        rfq_line_id = f"{rfq_id}-{i:05d}"
        ws5.append([
            it["item_num"],            # A
            it.get("eam_pn") or "",    # B
            it.get("mfg_pn") or "",    # C
            it.get("mfg_name") or "",  # D
            it.get("description") or "",   # E
            it.get("qty_24mo") or 0,   # F
            it.get("uom") or "",       # G
            None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None,  # H..X (yellow)
            it["key"],                 # Y item_key
            rfq_line_id,               # Z rfq_line_id
        ])

    # Yellow-fill response cells (cols H..X = 8..24) for all data rows
    n_data_rows = len(sorted_items)
    for r_idx in range(5, 5 + n_data_rows):
        for col_idx in range(8, 25):  # H through X inclusive
            c = ws5.cell(row=r_idx, column=col_idx)
            c.fill = YELLOW_FILL
            c.border = BORDER
        # Reference columns (A..G) — light fill so it's clear they're not editable
        for col_idx in range(1, 8):
            c = ws5.cell(row=r_idx, column=col_idx)
            c.border = BORDER

    # Number formats
    for r in ws5.iter_rows(min_row=5, min_col=6, max_col=6):  # F = Annual Qty
        for c in r:
            c.number_format = "#,##0"
    for r in ws5.iter_rows(min_row=5, min_col=8, max_col=8):  # H = Quote Price
        for c in r:
            c.number_format = "$#,##0.00"

    # Hide the item_key + rfq_line_id columns (Y, Z = 25, 26)
    ws5.column_dimensions[get_column_letter(25)].hidden = True
    ws5.column_dimensions[get_column_letter(26)].hidden = True

    # Dropdown validation on key fields
    try:
        from openpyxl.worksheet.datavalidation import DataValidation
        # Yes/No on cols P, S, T, U
        yn = DataValidation(type="list", formula1='"Yes,No"', allow_blank=True)
        ws5.add_data_validation(yn)
        for col_letter in ("P", "S", "T", "U"):
            yn.add(f"{col_letter}5:{col_letter}{4 + n_data_rows}")
        # No Bid Reason dropdown on V
        nobid = DataValidation(
            type="list",
            formula1='"Discontinued,Not Available,Not Stocked,Need More Information,Outside Capability,Pricing Not Competitive,Obsolete,Other"',
            allow_blank=True,
        )
        ws5.add_data_validation(nobid)
        nobid.add(f"V5:V{4 + n_data_rows}")
        # UOM dropdown on I
        uom = DataValidation(
            type="list",
            formula1='"EA,BX,PK,FT,IN,LB,KG,GAL,QT,PT,OZ,RL,CS,DZ,M,CM,MM,SET,KIT,Other"',
            allow_blank=True,
        )
        ws5.add_data_validation(uom)
        uom.add(f"I5:I{4 + n_data_rows}")
    except Exception as e:
        # Validation is nice-to-have; if openpyxl barfs, the file still works
        pass

    # Sheet protection — lock everything except yellow response cells
    try:
        # Mark response cells as unlocked first
        from openpyxl.styles import Protection
        for r_idx in range(5, 5 + n_data_rows):
            for col_idx in range(8, 25):  # H..X = response cols
                c = ws5.cell(row=r_idx, column=col_idx)
                c.protection = Protection(locked=False)
        ws5.protection.sheet = True
        ws5.protection.password = "rfq"  # weak by design — deters accidents, not malice
        ws5.protection.formatCells = False
        ws5.protection.formatColumns = False
        ws5.protection.formatRows = False
    except Exception:
        pass

    autosize(ws5, max_w=40)
    ws5.freeze_panes = "A5"

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def list_loaded_supplier_names() -> list:
    """Convenience for the JS to know which suppliers have loaded bids."""
    return list((_STATE.get("bids", {}) or {}).keys())


# ---------------------------------------------------------------------------
# Award scenarios — named, saveable, side-by-side comparison.
#
# A "scenario" is a strategy for awarding the RFQ:
#   - lowest_price       : per item, pick the lowest non-flagged bid
#   - lowest_qualified   : like lowest_price but excludes UOM_DISC + SUBSTITUTE
#   - incumbent_preferred: stay with the historical supplier when their bid
#                          is within `min_savings_pct_to_switch` of lowest
#   - consolidate_to     : award everything to one named supplier (with carves
#                          where another supplier's price beats them by
#                          carve_out_min_savings_pct)
#   - manual             : user-defined per-item award
#
# Scenarios are stored on _STATE so they persist with the session save state.
# Each scenario carries its strategy + parameters + manual overrides + a
# computed totals snapshot (so re-loading is fast even before re-evaluation).
# ---------------------------------------------------------------------------

SCENARIO_STRATEGIES = (
    "lowest_price",
    "lowest_qualified",
    "incumbent_preferred",
    "consolidate_to",
    "manual",
)


def _get_scenarios() -> dict:
    return _STATE.setdefault("scenarios", {})


def list_award_scenarios() -> list:
    """Return all scenarios as a list (most-recent-saved first)."""
    sc = _get_scenarios()
    out = []
    for name, s in sc.items():
        out.append({
            "name": name,
            "strategy": s.get("strategy"),
            "parameters": s.get("parameters", {}),
            "saved_at": s.get("saved_at"),
            "totals": s.get("totals", {}),
            "n_overrides": len(s.get("overrides") or {}),
        })
    out.sort(key=lambda x: x.get("saved_at") or "", reverse=True)
    return out


def delete_award_scenario(name: str) -> bool:
    sc = _get_scenarios()
    if name in sc:
        del sc[name]
        return True
    return False


def _evaluate_scenario(strategy: str, parameters: dict, overrides: dict, included_keys=None) -> dict:
    """Run an award strategy against current items + bids, returning the per-item
    award decisions + roll-up totals.

    overrides: {rfq_key: {"supplier": supplier_name | None, "reason": str}}
               Manual per-item awards (highest priority, beats strategy).
    """
    th = get_thresholds()
    items = _STATE.get("items", [])
    if included_keys is not None:
        keep = set(included_keys)
        items = [it for it in items if it["item_num"] in keep]

    bids_by_supplier = _STATE.get("bids", {}) or {}
    suppliers = list(bids_by_supplier.keys())
    bid_lookup = {}
    for sup, parsed in bids_by_supplier.items():
        for b in parsed.get("bids", []):
            if b["status"] in (BID_STATUS_PRICED, BID_STATUS_UOM_DISC, BID_STATUS_SUBSTITUTE) \
               and b["effective_price"] is not None and b["effective_price"] > 0:
                bid_lookup[(sup, b["rfq_key"])] = b

    overrides = overrides or {}
    parameters = parameters or {}
    consolidate_supplier = parameters.get("supplier") if strategy == "consolidate_to" else None
    incumbent_threshold = parameters.get("incumbent_keep_threshold_pct", th["min_savings_pct_to_switch"])
    carve_threshold = parameters.get("carve_threshold", th["carve_out_min_savings_pct"])
    exclude_uom = parameters.get("exclude_uom_disc", strategy == "lowest_qualified")
    exclude_subs = parameters.get("exclude_substitutes", strategy == "lowest_qualified")

    awards = []
    n_no_award = 0
    n_manual = 0
    n_carved = 0
    award_total = 0.0
    historical_total = 0.0
    items_switched = 0
    incumbent_retained = 0
    by_supplier = {}

    for it in items:
        rfq_key = it["key"]
        qty = it.get("qty_24mo") or 0
        hist_price = it.get("last_unit_price") or 0
        # Note: incumbent supplier from historical data; may be the same
        # supplier name as one of the bidders, OR a different name (e.g.
        # "MCMASTER-CARR") that doesn't match any bidder
        incumbent = (it.get("supplier") if "supplier" in it else None) or _STATE.get("supplier_name", "")

        # Manual override beats everything
        if rfq_key in overrides:
            ov = overrides[rfq_key]
            sup = ov.get("supplier")
            if sup:
                bid = bid_lookup.get((sup, rfq_key))
                price = bid["effective_price"] if bid else None
                awards.append({
                    "rfq_key": rfq_key,
                    "item_num": it["item_num"],
                    "description": it["description"],
                    "qty_24mo": qty,
                    "awarded_supplier": sup,
                    "awarded_price": price,
                    "awarded_value": (price or 0) * qty,
                    "historical_price": hist_price,
                    "historical_value": hist_price * qty,
                    "savings_value": (hist_price - (price or 0)) * qty if hist_price and price else 0,
                    "decision_basis": f"MANUAL: {ov.get('reason') or 'user override'}",
                })
                n_manual += 1
                if price is not None and price > 0:
                    award_total += price * qty
                historical_total += hist_price * qty
                by_supplier[sup] = by_supplier.get(sup, 0) + (price or 0) * qty
                continue
            else:
                # Explicit "no award" override
                awards.append({
                    "rfq_key": rfq_key, "item_num": it["item_num"], "description": it["description"],
                    "qty_24mo": qty, "awarded_supplier": None, "awarded_price": None,
                    "awarded_value": 0, "historical_price": hist_price,
                    "historical_value": hist_price * qty, "savings_value": 0,
                    "decision_basis": f"MANUAL: {ov.get('reason') or 'no award'}",
                })
                n_no_award += 1
                historical_total += hist_price * qty
                continue

        # Gather eligible bids for this item per the strategy filters
        candidates = []
        for sup in suppliers:
            b = bid_lookup.get((sup, rfq_key))
            if not b:
                continue
            if exclude_uom and b["status"] == BID_STATUS_UOM_DISC:
                continue
            if exclude_subs and b["status"] == BID_STATUS_SUBSTITUTE:
                continue
            candidates.append((sup, b["effective_price"], b["status"]))

        if not candidates:
            awards.append({
                "rfq_key": rfq_key, "item_num": it["item_num"], "description": it["description"],
                "qty_24mo": qty, "awarded_supplier": None, "awarded_price": None,
                "awarded_value": 0, "historical_price": hist_price,
                "historical_value": hist_price * qty, "savings_value": 0,
                "decision_basis": "NO_BID — no eligible supplier",
            })
            n_no_award += 1
            historical_total += hist_price * qty
            continue

        # Pick the awarded supplier per strategy
        candidates.sort(key=lambda c: c[1])  # cheapest first
        chosen_sup, chosen_price, chosen_status = candidates[0]
        decision = "lowest"

        if strategy == "incumbent_preferred":
            # If the incumbent has a bid, prefer them unless competition saves
            # at least incumbent_threshold pct
            inc_bid = next((c for c in candidates if c[0].lower() == (incumbent or "").lower()), None)
            if inc_bid:
                inc_price = inc_bid[1]
                if chosen_price <= 0 or (inc_price - chosen_price) / inc_price < incumbent_threshold:
                    chosen_sup, chosen_price, chosen_status = inc_bid
                    decision = f"INCUMBENT_KEPT (savings to switch < {incumbent_threshold*100:.0f}%)"

        elif strategy == "consolidate_to" and consolidate_supplier:
            # Default to consolidate winner unless another supplier saves >= carve_threshold
            target_bid = next((c for c in candidates if c[0] == consolidate_supplier), None)
            if target_bid:
                target_price = target_bid[1]
                if chosen_price < target_price * (1 - carve_threshold):
                    decision = f"CARVE: {chosen_sup} saves {((target_price-chosen_price)/target_price*100):.0f}% vs {consolidate_supplier}"
                    n_carved += 1
                else:
                    chosen_sup, chosen_price, chosen_status = target_bid
                    decision = f"CONSOLIDATE_TO {consolidate_supplier}"
            else:
                # Consolidation winner didn't bid this item — fall through to lowest
                decision = f"WINNER_NOBID — fell through to {chosen_sup} (lowest)"

        # If chosen supplier matches incumbent, count retained
        if incumbent and chosen_sup.lower() == (incumbent or "").lower():
            incumbent_retained += 1
        else:
            items_switched += 1

        award_value = chosen_price * qty
        award_total += award_value
        historical_total += hist_price * qty
        by_supplier[chosen_sup] = by_supplier.get(chosen_sup, 0) + award_value

        awards.append({
            "rfq_key": rfq_key, "item_num": it["item_num"], "description": it["description"],
            "qty_24mo": qty, "awarded_supplier": chosen_sup, "awarded_price": chosen_price,
            "awarded_value": award_value, "historical_price": hist_price,
            "historical_value": hist_price * qty, "savings_value": (hist_price - chosen_price) * qty if hist_price else 0,
            "decision_basis": decision,
        })

    return {
        "strategy": strategy,
        "parameters": parameters,
        "n_items": len(awards),
        "n_awarded": len([a for a in awards if a["awarded_supplier"]]),
        "n_no_award": n_no_award,
        "n_manual_overrides": n_manual,
        "n_carved": n_carved,
        "items_switched": items_switched,
        "incumbent_retained": incumbent_retained,
        "award_total": award_total,
        "historical_total": historical_total,
        "savings_total": historical_total - award_total,
        "savings_pct": (historical_total - award_total) / historical_total * 100.0 if historical_total else 0.0,
        "award_by_supplier": by_supplier,
        "awards": awards,
    }


def save_award_scenario(name: str, strategy: str, parameters: dict = None,
                        overrides: dict = None, included_keys=None,
                        notes: str = "") -> dict:
    """Evaluate the strategy + parameters and save the result as a named scenario."""
    if not name:
        raise ValueError("name required")
    if strategy not in SCENARIO_STRATEGIES:
        raise ValueError(f"strategy must be one of {SCENARIO_STRATEGIES}")
    parameters = parameters or {}
    overrides = overrides or {}

    evaluated = _evaluate_scenario(strategy, parameters, overrides, included_keys)

    # Persist (drop the per-item awards array from the saved scenario — it's
    # large; re-derived on demand. Keep totals + parameters + overrides.)
    sc = _get_scenarios()
    sc[name] = {
        "name": name,
        "strategy": strategy,
        "parameters": parameters,
        "overrides": overrides,
        "included_keys": list(included_keys) if included_keys is not None else None,
        "notes": notes,
        "saved_at": datetime.now().isoformat(),
        "totals": {k: evaluated[k] for k in
                   ("n_items", "n_awarded", "n_no_award", "n_manual_overrides",
                    "n_carved", "items_switched", "incumbent_retained",
                    "award_total", "historical_total", "savings_total",
                    "savings_pct", "award_by_supplier")},
    }
    return sc[name]


def evaluate_award_scenario(name: str) -> dict:
    """Re-run a saved scenario against current items + bids and return the
    full per-item awards array + roll-up totals."""
    sc = _get_scenarios()
    s = sc.get(name)
    if not s:
        raise ValueError(f"No scenario named {name!r}")
    return _evaluate_scenario(
        s["strategy"], s.get("parameters", {}),
        s.get("overrides", {}), s.get("included_keys"),
    )


def compare_award_scenarios(name_a: str, name_b: str) -> dict:
    """Side-by-side comparison of two scenarios — totals delta + per-item
    differences (items where the awarded supplier differs)."""
    a = evaluate_award_scenario(name_a)
    b = evaluate_award_scenario(name_b)
    awards_a = {x["rfq_key"]: x for x in a["awards"]}
    awards_b = {x["rfq_key"]: x for x in b["awards"]}
    all_keys = set(awards_a) | set(awards_b)
    diffs = []
    for k in all_keys:
        ax = awards_a.get(k) or {}
        bx = awards_b.get(k) or {}
        sup_a = ax.get("awarded_supplier")
        sup_b = bx.get("awarded_supplier")
        if sup_a != sup_b or ax.get("awarded_price") != bx.get("awarded_price"):
            diffs.append({
                "rfq_key": k,
                "item_num": ax.get("item_num") or bx.get("item_num"),
                "description": ax.get("description") or bx.get("description"),
                "qty_24mo": ax.get("qty_24mo") or bx.get("qty_24mo") or 0,
                "supplier_a": sup_a, "price_a": ax.get("awarded_price"), "value_a": ax.get("awarded_value"),
                "supplier_b": sup_b, "price_b": bx.get("awarded_price"), "value_b": bx.get("awarded_value"),
                "value_delta": (bx.get("awarded_value") or 0) - (ax.get("awarded_value") or 0),
            })
    diffs.sort(key=lambda d: abs(d["value_delta"]), reverse=True)
    # Drop the per-item awards arrays from a/b before returning to keep payload manageable
    summary_a = {k: v for k, v in a.items() if k != "awards"}
    summary_b = {k: v for k, v in b.items() if k != "awards"}
    return {
        "scenario_a": {"name": name_a, **summary_a},
        "scenario_b": {"name": name_b, **summary_b},
        "summary_delta": {
            "award_total":     b["award_total"]     - a["award_total"],
            "historical_total":b["historical_total"]- a["historical_total"],
            "savings_total":   b["savings_total"]   - a["savings_total"],
            "items_switched":  b["items_switched"]  - a["items_switched"],
            "incumbent_retained": b["incumbent_retained"] - a["incumbent_retained"],
            "n_awarded":       b["n_awarded"]       - a["n_awarded"],
            "n_no_award":      b["n_no_award"]      - a["n_no_award"],
        },
        "n_items_differ": len(diffs),
        "diffs": diffs[:500],   # cap
    }


# ---------------------------------------------------------------------------
# Register module so app.js can `from app_engine import ...`
# ---------------------------------------------------------------------------
sys.modules["app_engine"] = sys.modules[__name__]
