# Signal → Track Highest High → Drop% → Base + DCA1 + TP + SL

Pine Script v6 implementation of the strategy, built to test one specific
hypothesis on top of the base logic.

## The hypothesis being tested

DCA1 carries almost all of the real profit *and* almost all of the real risk.
Comparing two DCA1 fills on DOT/30m:

| DCA1 fill | Context | Outcome |
|---|---|---|
| Aug 18 | ~7 days into a slow bleed, price already exhausted near a base | recovered, TP hit |
| Aug 26 | 2 days into a fresh breakdown from the 1.02 high, after an uptrend-line break | kept bleeding |

Both were "gradual" declines, so *gradual vs sharp* alone does not separate them.
What separates them is **where in the move DCA1 fills**: at exhaustion, or at the
start of the breakdown.

The filter therefore blocks DCA1 when **both** hold:

- a run of `minLowerHighs` consecutive lower swing highs (distribution), **and**
- the major high is still recent (`barsSinceMajorHigh < minBarsExh`) — the
  breakdown only just started

A **sharp flush** overrides the block: if the fill comes within `flushBars` bars
of the tracked high, that is the mean-reverting panic-wick case (LTC/15m Aug 22,
55.5 → 50.8 in two candles, recovered within hours and hit TP).

## Files

- `signal-dca-tp-sl.pine` — the strategy

## Key behaviours

- **The stop is real.** The script calls `runtime.error()` and refuses to run if
  either stop is set to ≥90%. A stop wide enough never to trigger makes every
  number in the report fictional.
- **Two stops.** The catastrophic stop is live from the first fill; once DCA1
  fills, the tighter DCA1 stop takes over (whichever sits higher wins, so the
  position is always protected by the nearer one).
- **Entries are limit orders** at the exact trigger price, not market-on-close,
  so fills are not flattered by the backtester.
- **Blocked-then-unblocked DCA1**: if DCA1 is blocked and the lower-high run
  later breaks, the pending trigger is now above price, so DCA1 fills at market
  — i.e. deferred to a lower price, which improves the average. This is
  intentional, but check it matches what you want per coin.
- **Split P&L table** (top right) reports Base-only trades vs DCA1 trades
  separately, plus how many DCA1 fills the filter blocked. If the DCA1 row
  carries the whole net profit, the Base row is noise — that is the expected
  shape, and it tells you which number to actually stress-test.

## Test protocol — run it in this order

Do **not** judge the filter on a single symbol or a single window.

1. **Baseline.** `useFilter = false`. Record net profit, max drawdown, and the
   Base-only vs DCA1 split.
2. **Filter on.** `useFilter = true`, everything else identical. Compare the
   same three numbers. The filter is only worth keeping if **max drawdown drops
   by more than net profit does** — blocking DCA1 blocks winners too, so a small
   profit loss for a large drawdown cut is the win condition.
3. **Out-of-sample.** Re-run both on a different date range that you did not
   look at while tuning. Same direction of improvement, or the result is noise.
4. **Per coin.** Repeat for each symbol. Settings do not transfer — LTC/15m and
   DOT/30m do not share parameters.

### Overfitting check (mandatory before trusting any parameter)

Sweep each parameter one at a time — `dropBasePct`, `dropDca1Pct`, `dca1SlPct`,
`minBarsExh`. Plot the result curve. A single sharp peak with bad results either
side means the value was fitted to noise, not to structure. Keep a parameter
only if a **plateau** of neighbouring values also works. Then confirm on the
out-of-sample window.

## Chart-reading rules (manual override for a live DCA1)

When DCA1 has already filled and you are deciding whether to hold:

1. **Shape before the signal** — sharp 1–2 candle flush (acceptable) vs a
   multi-day grind with consecutive lower highs (dangerous).
2. **Structural break** — was a rising trendline broken before the drop? Extra
   warning.
3. **Recovery range (most important)** — after DCA1, did price stabilise into a
   range, or break that range downward? A broken recovery range is the strongest
   warning that the recovery failed.
4. **Confirmation** — strong rebound candle, higher low, volume declining into
   the drop.

None of this is a guarantee. These are risk indicators that lower the odds of a
bad outcome, not a prediction.
