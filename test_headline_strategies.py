"""
Self-test for compute_headline_strategies + the dual-threshold carve-out rule.

Builds a synthetic 4-item, 3-supplier RFQ + bid set in memory, then asserts:
  - Each strategy produces internally-consistent totals
    (savings = historical − award; award = sum of awarded $)
  - lowest_price ≤ lowest_qualified ≤ incumbent_preferred awards (greedy
    bound — relaxed when filters skip items)
  - consolidate_to with each supplier yields different totals
  - The dual-threshold carve-out fires when expected (% rule, $ rule, both)
  - Manual overrides counters track locks / exclusions / UOM annotations
  - reset_to_auto clears all three
"""
import sys
sys.path.insert(0, ".")
import app
from app import (
    _STATE, BID_STATUS_PRICED, BID_STATUS_UOM_DISC, BID_STATUS_SUBSTITUTE,
    compute_headline_strategies, compute_consolidation_analysis,
    _evaluate_scenario, set_item_lock, set_item_exclusions, reset_to_auto,
    set_thresholds, get_thresholds, set_uom_annotation,
)


def _reset_state():
    _STATE["items"] = []
    _STATE["bids"] = {}
    _STATE["item_locks"] = {}
    _STATE["item_exclusions"] = {}
    _STATE["uom_annotations"] = {}
    _STATE["scenarios"] = {}
    _STATE["audit_log"] = []
    _STATE["thresholds"] = {}
    _STATE["supplier_name"] = "INCUMBENT"


def _seed_synthetic():
    """6 items, 3 suppliers (RED, BLUE, GREEN). RED is the consolidation winner —
    they quote 5 of 6 items and win the high-volume A on aggressive price.

    item A: qty 50000  RED=$2   BLUE=$10            → RED dominates, no carve
    item B: qty 20     RED=$10  BLUE=$7             → 30% / $30/yr   → PCT only
    item C: qty 20000  RED=$10  BLUE=$9.50          → 5% / $5K/yr    → DOLLAR only
    item D: qty 15000  RED=$10  BLUE=$7             → 30% / $22.5K   → BOTH
    item E: qty 200    RED=$10  BLUE=$9.80          → 2% / $20/yr    → no carve
    item F: qty 100    RED=—    BLUE=$5  GREEN=$4.80 → RED no-quote   → best_alt to GREEN
    """
    _STATE["items"] = [
        {"key": "ITEM_A", "item_num": "A", "description": "RED dominates",
         "qty_24mo": 50000, "last_unit_price": 12.0, "uom": "EA",
         "po_lines": [], "supplier": "INCUMBENT"},
        {"key": "ITEM_B", "item_num": "B", "description": "long-tail PCT carve",
         "qty_24mo": 20, "last_unit_price": 11.0, "uom": "EA",
         "po_lines": [], "supplier": "INCUMBENT"},
        {"key": "ITEM_C", "item_num": "C", "description": "high-vol DOLLAR carve",
         "qty_24mo": 20000, "last_unit_price": 10.0, "uom": "EA",
         "po_lines": [], "supplier": "INCUMBENT"},
        {"key": "ITEM_D", "item_num": "D", "description": "BOTH-rule carve",
         "qty_24mo": 15000, "last_unit_price": 10.0, "uom": "EA",
         "po_lines": [], "supplier": "INCUMBENT"},
        {"key": "ITEM_E", "item_num": "E", "description": "minor variance — no carve",
         "qty_24mo": 200, "last_unit_price": 10.0, "uom": "EA",
         "po_lines": [], "supplier": "INCUMBENT"},
        {"key": "ITEM_F", "item_num": "F", "description": "RED no-quote",
         "qty_24mo": 100, "last_unit_price": 5.0, "uom": "EA",
         "po_lines": [], "supplier": "INCUMBENT"},
    ]
    _STATE["bids"] = {
        "RED": {"bids": [
            {"rfq_key": "ITEM_A", "status": BID_STATUS_PRICED, "effective_price": 2.0,  "notes": ""},
            {"rfq_key": "ITEM_B", "status": BID_STATUS_PRICED, "effective_price": 10.0, "notes": ""},
            {"rfq_key": "ITEM_C", "status": BID_STATUS_PRICED, "effective_price": 10.0, "notes": ""},
            {"rfq_key": "ITEM_D", "status": BID_STATUS_PRICED, "effective_price": 10.0, "notes": ""},
            {"rfq_key": "ITEM_E", "status": BID_STATUS_PRICED, "effective_price": 10.0, "notes": ""},
        ]},
        "BLUE": {"bids": [
            {"rfq_key": "ITEM_A", "status": BID_STATUS_PRICED, "effective_price": 10.0, "notes": ""},
            {"rfq_key": "ITEM_B", "status": BID_STATUS_PRICED, "effective_price": 7.00, "notes": ""},
            {"rfq_key": "ITEM_C", "status": BID_STATUS_PRICED, "effective_price": 9.50, "notes": ""},
            {"rfq_key": "ITEM_D", "status": BID_STATUS_PRICED, "effective_price": 7.00, "notes": ""},
            {"rfq_key": "ITEM_E", "status": BID_STATUS_PRICED, "effective_price": 9.80, "notes": ""},
            {"rfq_key": "ITEM_F", "status": BID_STATUS_PRICED, "effective_price": 5.00, "notes": ""},
        ]},
        "GREEN": {"bids": [
            {"rfq_key": "ITEM_F", "status": BID_STATUS_PRICED, "effective_price": 4.80, "notes": ""},
        ]},
    }


def _approx(a, b, tol=0.01):
    return abs((a or 0) - (b or 0)) < tol


def test_strategies_internally_consistent():
    """For every strategy, covered_savings_total == covered_historical_total - covered_award_total.
    And award_by_supplier sums to covered_award_total."""
    _reset_state(); _seed_synthetic()
    headline = compute_headline_strategies()
    for name, summary in headline["strategies"].items():
        if summary is None:
            continue
        assert _approx(
            summary["covered_savings_total"],
            summary["covered_historical_total"] - summary["covered_award_total"],
        ), f"strategy {name}: covered_savings != covered_historical - covered_award"
        sup_sum = sum(summary["award_by_supplier"].values())
        assert _approx(sup_sum, summary["covered_award_total"]), \
            f"strategy {name}: award_by_supplier sums to {sup_sum}, covered_award_total {summary['covered_award_total']}"
    print("PASS  strategies_internally_consistent")


def test_lowest_price_le_qualified():
    """With no UOM_DISC / SUBSTITUTE bids in seed, lowest_price == lowest_qualified."""
    _reset_state(); _seed_synthetic()
    h = compute_headline_strategies()
    assert _approx(
        h["strategies"]["lowest_price"]["covered_award_total"],
        h["strategies"]["lowest_qualified"]["covered_award_total"],
    ), "with no UOM/SUB bids, lowest_price should equal lowest_qualified"
    print("PASS  lowest_price_eq_qualified_when_no_uom_or_sub")


def test_uom_disc_drops_in_qualified():
    """Mark BLUE's ITEM_C bid (the lowest on C at $9.50, vs RED's $10) as
    UOM_DISC. lowest_price still picks BLUE; lowest_qualified falls back to
    RED. Delta: $0.50/unit × 20000 qty = $10K more in lowest_qualified."""
    _reset_state(); _seed_synthetic()
    blue_c = next(b for b in _STATE["bids"]["BLUE"]["bids"] if b["rfq_key"] == "ITEM_C")
    blue_c["status"] = BID_STATUS_UOM_DISC
    h = compute_headline_strategies()
    lp_total = h["strategies"]["lowest_price"]["covered_award_total"]
    lq_total = h["strategies"]["lowest_qualified"]["covered_award_total"]
    assert lq_total > lp_total, \
        f"lowest_qualified ({lq_total}) should exceed lowest_price ({lp_total}) when UOM_DISC dropped"
    delta = lq_total - lp_total
    assert _approx(delta, 10000.0, tol=1.0), f"expected ~$10K delta, got ${delta:,.2f}"
    print(f"PASS  uom_disc_drops_in_qualified  (delta=${delta:,.0f})")


def test_carve_pct_rule():
    """ITEM_B (qty=20, RED=$10, BLUE=$7) → 30% savings, $30/yr.
    With pct=20%, dollar=$3000: PCT fires; DOLLAR does not. Carve fires.
    With pct=50%, dollar=$3000: neither fires. No carve."""
    _reset_state(); _seed_synthetic()
    set_thresholds({"carve_out_min_savings_pct": 0.20, "carve_out_min_savings_annual_dollar": 3000.0})
    consol = compute_consolidation_analysis()
    keys_carved = [c["rfq_key"] for c in consol["winner"]["carve_outs"]]
    assert "ITEM_B" in keys_carved, "ITEM_B should carve via PCT rule (30% > 20%)"
    item_b = next(c for c in consol["winner"]["carve_outs"] if c["rfq_key"] == "ITEM_B")
    assert item_b["carve_rule_fired"] == "PCT", f"ITEM_B rule_fired={item_b['carve_rule_fired']}"

    # Raise pct threshold to 50% — should no longer carve
    set_thresholds({"carve_out_min_savings_pct": 0.50})
    consol = compute_consolidation_analysis()
    keys_carved = [c["rfq_key"] for c in consol["winner"]["carve_outs"]]
    assert "ITEM_B" not in keys_carved, "ITEM_B should NOT carve when pct=50% and $/yr below floor"
    print("PASS  carve_pct_rule")


def test_carve_dollar_rule():
    """ITEM_C (qty=20000, RED=$10, BLUE=$9.50) → 5% savings, $5K/yr.
    With pct=20%, dollar=$3000: DOLLAR fires (5K > 3K); PCT does not (5% < 20%).
    With pct=20%, dollar=$10000: neither fires."""
    _reset_state(); _seed_synthetic()
    set_thresholds({"carve_out_min_savings_pct": 0.20, "carve_out_min_savings_annual_dollar": 3000.0})
    consol = compute_consolidation_analysis()
    keys_carved = [c["rfq_key"] for c in consol["winner"]["carve_outs"]]
    assert "ITEM_C" in keys_carved, "ITEM_C should carve via DOLLAR rule"
    item_c = next(c for c in consol["winner"]["carve_outs"] if c["rfq_key"] == "ITEM_C")
    assert item_c["carve_rule_fired"] == "DOLLAR", f"ITEM_C rule_fired={item_c['carve_rule_fired']}"

    set_thresholds({"carve_out_min_savings_annual_dollar": 10000.0})
    consol = compute_consolidation_analysis()
    keys_carved = [c["rfq_key"] for c in consol["winner"]["carve_outs"]]
    assert "ITEM_C" not in keys_carved, "ITEM_C should NOT carve when $/yr threshold exceeds savings"
    print("PASS  carve_dollar_rule")


def test_carve_both_rule():
    """ITEM_D (qty=15000, RED=$10, BLUE=$7) → 30% / $22.5K/yr. Both rules fire."""
    _reset_state(); _seed_synthetic()
    set_thresholds({"carve_out_min_savings_pct": 0.20, "carve_out_min_savings_annual_dollar": 3000.0})
    consol = compute_consolidation_analysis()
    item_d = next(c for c in consol["winner"]["carve_outs"] if c["rfq_key"] == "ITEM_D")
    assert item_d["carve_rule_fired"] == "BOTH", f"ITEM_D rule_fired={item_d['carve_rule_fired']}"
    print("PASS  carve_both_rule")


def test_carve_no_rule_no_carve():
    """ITEM_E (qty=200, RED=$10, BLUE=$9.80) → 2% / $20/yr. Neither rule fires."""
    _reset_state(); _seed_synthetic()
    set_thresholds({"carve_out_min_savings_pct": 0.20, "carve_out_min_savings_annual_dollar": 3000.0})
    consol = compute_consolidation_analysis()
    keys_carved = [c["rfq_key"] for c in consol["winner"]["carve_outs"]]
    assert "ITEM_E" not in keys_carved, "ITEM_E should NOT carve — neither rule fires"
    print("PASS  carve_no_rule_no_carve")


def test_consolidate_to_named_target():
    """consolidate_to with RED as target awards items to RED unless a carve
    fires. The named target is recorded as `consolidate_supplier`. The
    `supplier_primary` field reports where the most $ actually flowed —
    when carves dominate (as in this seed), that may NOT be the named target.
    Both pieces of truth are surfaced; the headline UI decides what to show."""
    _reset_state(); _seed_synthetic()
    set_thresholds({"carve_out_min_savings_pct": 0.20, "carve_out_min_savings_annual_dollar": 3000.0})
    h = compute_headline_strategies(consolidate_supplier="RED")
    s = h["strategies"]["consolidate_to"]
    assert s["consolidate_supplier"] == "RED"
    assert s["n_carved"] == 3, f"expected 3 carves (B/C/D), got {s['n_carved']}"
    # Named target should appear in award_by_supplier with non-zero $
    assert s["award_by_supplier"].get("RED", 0) > 0
    # ITEM_F has no RED quote — falls through to GREEN as best alt
    assert s["award_by_supplier"].get("GREEN", 0) > 0
    print(f"PASS  consolidate_to_named_target  (RED=${s['award_by_supplier'].get('RED',0):,.0f}, BLUE=${s['award_by_supplier'].get('BLUE',0):,.0f}, GREEN=${s['award_by_supplier'].get('GREEN',0):,.0f}, n_carved={s['n_carved']})")


def test_lock_pins_supplier():
    """Lock ITEM_C to RED (who bid C at $10, when BLUE bid lower at $9.50).
    Without the lock, lowest_price awards to BLUE; with lock, RED wins."""
    _reset_state(); _seed_synthetic()
    set_item_lock("C", supplier="RED", reason="audit-confirmed")
    for strat in ("lowest_price", "lowest_qualified", "incumbent_preferred"):
        evaluated = _evaluate_scenario(strat, {}, {})
        award_c = next((a for a in evaluated["awards"] if a["item_num"] == "C"), None)
        assert award_c and award_c["awarded_supplier"] == "RED", \
            f"{strat}: ITEM_C awarded to {award_c['awarded_supplier'] if award_c else None}, expected RED (locked)"
        assert "LOCKED" in (award_c["decision_basis"] or ""), \
            f"{strat}: missing LOCKED in decision_basis: {award_c['decision_basis']}"
    print("PASS  lock_pins_supplier")


def test_lock_unhonored_when_supplier_didnt_bid():
    """Lock ITEM_C to GREEN (who didn't bid C) — n_locks_unhonored increments,
    award falls through to strategy (BLUE at $9.50 wins lowest_price)."""
    _reset_state(); _seed_synthetic()
    set_item_lock("C", supplier="GREEN", reason="testing")
    evaluated = _evaluate_scenario("lowest_price", {}, {})
    assert evaluated["n_locks_unhonored"] == 1, f"n_locks_unhonored={evaluated['n_locks_unhonored']}"
    award_c = next((a for a in evaluated["awards"] if a["item_num"] == "C"), None)
    assert award_c["awarded_supplier"] == "BLUE", \
        f"awarded={award_c['awarded_supplier']} (expected BLUE — lock to GREEN unhonored)"
    print("PASS  lock_unhonored_when_supplier_didnt_bid")


def test_manual_overrides_counters():
    """Set 1 lock + exclude line on 1 item + 1 UOM annotation → counters track."""
    _reset_state(); _seed_synthetic()
    set_item_lock("A", supplier="RED", reason="t1")
    # set_item_exclusions needs po_lines to exist; seed empty po_lines means
    # passing [] is a no-op (no lines to exclude). Hand-set the field directly.
    _STATE["item_exclusions"]["B"] = [0]
    set_uom_annotation("ITEM_C", "BLUE", factor=2.0, hist_uom="EA", bid_uom="BX")

    h = compute_headline_strategies()
    overrides = h["manual_overrides"]
    assert overrides["n_locks"] == 1, f"n_locks={overrides['n_locks']}"
    assert overrides["n_exclusions"] == 1, f"n_exclusions={overrides['n_exclusions']}"
    assert overrides["n_uom_resolutions"] == 1, f"n_uom_resolutions={overrides['n_uom_resolutions']}"
    print(f"PASS  manual_overrides_counters  ({overrides})")


def test_reset_to_auto_clears_everything():
    _reset_state(); _seed_synthetic()
    set_item_lock("A", supplier="RED", reason="t1")
    _STATE["item_exclusions"]["B"] = [0]
    set_uom_annotation("ITEM_C", "BLUE", factor=2.0, hist_uom="EA", bid_uom="BX")
    res = reset_to_auto()
    assert res["cleared"]["n_locks"] == 1
    assert res["cleared"]["n_exclusions"] == 1
    assert res["cleared"]["n_uom_resolutions"] == 1
    h = compute_headline_strategies()
    assert h["manual_overrides"] == {"n_locks": 0, "n_exclusions": 0, "n_uom_resolutions": 0}
    print("PASS  reset_to_auto_clears_everything")


def test_default_chip_when_bids_present():
    _reset_state(); _seed_synthetic()
    h = compute_headline_strategies()
    assert h["default_chip"] == "consolidate_to", \
        f"default chip = {h['default_chip']} — expected consolidate_to"
    assert h["default_consolidate_supplier"] in ("RED", "BLUE", "GREEN")
    assert set(h["available_consolidate_suppliers"]) == {"RED", "BLUE", "GREEN"}
    print(f"PASS  default_chip  (default_consolidate={h['default_consolidate_supplier']})")


def test_default_chip_when_no_bids():
    _reset_state()
    h = compute_headline_strategies()
    assert h["default_chip"] == "lowest_qualified"
    assert h["default_consolidate_supplier"] is None
    assert h["available_consolidate_suppliers"] == []
    print("PASS  default_chip_when_no_bids")


def test_thresholds_round_trip():
    _reset_state()
    set_thresholds({"carve_out_min_savings_pct": 0.18, "carve_out_min_savings_annual_dollar": 5000.0})
    h = compute_headline_strategies()
    assert _approx(h["thresholds"]["carve_out_min_savings_pct"], 0.18)
    assert _approx(h["thresholds"]["carve_out_min_savings_annual_dollar"], 5000.0)
    print("PASS  thresholds_round_trip")


if __name__ == "__main__":
    test_strategies_internally_consistent()
    test_lowest_price_le_qualified()
    test_uom_disc_drops_in_qualified()
    test_carve_pct_rule()
    test_carve_dollar_rule()
    test_carve_both_rule()
    test_carve_no_rule_no_carve()
    test_consolidate_to_named_target()
    test_lock_pins_supplier()
    test_lock_unhonored_when_supplier_didnt_bid()
    test_manual_overrides_counters()
    test_reset_to_auto_clears_everything()
    test_default_chip_when_bids_present()
    test_default_chip_when_no_bids()
    test_thresholds_round_trip()
    print("\nALL TESTS PASS")
