#!/usr/bin/env python3
"""Analyse a TradingView "List of trades" CSV export for the DCA strategy.

Usage:  python3 analyze_trades.py <export.csv>

TradingView splits a Base+DCA1 position into separate trade numbers (one leg
per fill), so the report is built per leg and then grouped by entry signal.
That is exactly the split that matters: Base-only P&L vs DCA1 P&L.
"""
import csv, sys, collections


def num(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def load(path):
    rows = list(csv.DictReader(open(path, encoding="utf-8-sig")))
    by_trade = {}
    for r in rows:
        by_trade.setdefault(int(r["Trade number"]), {})[r["Type"]] = r
    legs = []
    for n, t in sorted(by_trade.items()):
        e, x = t.get("Entry long"), t.get("Exit long")
        if not e or not x or x["Date and time"] == "Open":
            continue
        legs.append(dict(
            n=n, entry=e["Signal"], exit=x["Signal"],
            entry_px=num(e["Price USDT"]), exit_px=num(x["Price USDT"]),
            value=num(e["Size (value)"]), pnl=num(x["Net PnL USDT"]),
            ret=num(x["Return %"]), mae=num(x["Adverse excursion %"]),
            bars=num(x["Duration (bars)"]),
            opened=e["Date and time"], closed=x["Date and time"]))
    return legs


def edge(legs, label):
    """Risk:reward and the win rate needed to break even -- the number that decides."""
    W = [l for l in legs if l["pnl"] > 0]
    L = [l for l in legs if l["pnl"] < 0]
    if not W or not L:
        print(f"  {label}: not enough two-sided data")
        return
    avg_w = sum(l["pnl"] for l in W) / len(W)
    avg_l = -sum(l["pnl"] for l in L) / len(L)
    be = avg_l / (avg_l + avg_w)
    wr = len(W) / len(legs)
    print(f"  {label}")
    print(f"    avg win {avg_w:+.2f}   avg loss {-avg_l:+.2f}   R:R {avg_l/avg_w:.2f}:1 against")
    print(f"    breakeven win rate {100*be:.2f}%   actual {100*wr:.2f}%   margin {100*(wr-be):+.2f} pp")
    print(f"    extra losses that would erase all profit: {len(W) - be*len(legs):.1f}")


def main(path):
    legs = load(path)
    net = sum(l["pnl"] for l in legs)
    print(f"legs {len(legs)}   period {legs[0]['opened']} -> {legs[-1]['closed']}   net {net:+.2f}\n")

    print("=== P&L by entry type ===")
    for sig in sorted({l["entry"] for l in legs}):
        g = [l for l in legs if l["entry"] == sig]
        w = sum(1 for l in g if l["pnl"] > 0)
        print(f"  {sig:6s} n={len(g):3d}  wins={w:3d} ({100*w/len(g):5.1f}%)  "
              f"net={sum(l['pnl'] for l in g):+9.2f}  deployed={sum(l['value'] for l in g):10.2f}")

    print("\n=== P&L by exit type ===")
    for sig in sorted({l["exit"] for l in legs}):
        g = [l for l in legs if l["exit"] == sig]
        print(f"  {sig:20s} n={len(g):3d}  net={sum(l['pnl'] for l in g):+9.2f}  "
              f"worst={min(l['pnl'] for l in g):+.2f}")

    print("\n=== Edge ===")
    for sig in sorted({l["entry"] for l in legs}):
        edge([l for l in legs if l["entry"] == sig], sig)

    # MAE separation -- does a position that goes deep underwater ever recover?
    dca = [l for l in legs if l["entry"] == "DCA1"] or legs
    print("\n=== MAE separation (how far underwater before it recovered) ===")
    for lo, hi in [(0, -1), (-1, -2), (-2, -3), (-3, -4), (-4, -999)]:
        g = [l for l in dca if hi < l["mae"] <= lo]
        if not g:
            continue
        w = sum(1 for l in g if l["pnl"] > 0)
        print(f"  MAE {lo:>4}% .. {hi:>4}% : n={len(g):2d}  wins={w:2d} ({100*w/len(g):5.1f}%)  "
              f"net={sum(l['pnl'] for l in g):+9.2f}  avg bars={sum(l['bars'] for l in g)/len(g):5.1f}")

    print("\n=== Concentration (is the profit a handful of trades?) ===")
    s = sorted(dca, key=lambda l: -l["pnl"])
    tot = sum(l["pnl"] for l in dca)
    for k in (1, 3, 5):
        if k <= len(s):
            top = sum(l["pnl"] for l in s[:k])
            print(f"  top {k:2d} winners = {top:+9.2f}"
                  + (f"  = {100*top/tot:.0f}% of net" if tot else ""))

    print("\n=== Equity ===")
    eq = peak = mdd = 0.0
    trough = None
    for l in sorted(legs, key=lambda l: l["closed"]):
        eq += l["pnl"]
        peak = max(peak, eq)
        if peak - eq > mdd:
            mdd, trough = peak - eq, l["closed"]
    cap = max(l["value"] for l in legs)
    print(f"  net {eq:+.2f}   max drawdown {mdd:.2f} (trough {trough})")
    print(f"  largest single position {cap:.0f}  ->  return on capital {100*eq/cap:+.1f}%, "
          f"drawdown {100*mdd/cap:.1f}% of capital")
    if eq:
        print(f"  drawdown is {100*mdd/eq:.0f}% of the whole period's profit")

    print("\n=== Monthly ===")
    m = collections.OrderedDict()
    for l in sorted(legs, key=lambda l: l["closed"]):
        m.setdefault(l["closed"][:7], 0.0)
        m[l["closed"][:7]] += l["pnl"]
    run = 0.0
    for k, v in m.items():
        run += v
        bar = ("#" if v > 0 else "-") * min(30, max(0, int(abs(v) / 4)))
        print(f"  {k}  {v:+8.2f}  cum {run:+8.2f}  {bar}")
    print(f"  profitable months {sum(1 for v in m.values() if v > 0)}/{len(m)}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
