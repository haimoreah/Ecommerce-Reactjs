#!/usr/bin/env node
// Reel database analyzer — computes per-reel rates, account benchmarks
// (FLOOR/TARGET/BREAKOUT) and winning/losing patterns from data/reels.csv.
//
// Usage: node .claude/skills/instagram-reach/scripts/analyze.mjs [path/to/reels.csv]
//
// Design rule: this script never invents numbers. Small samples are reported
// as insufficient rather than smoothed over.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CSV = process.argv[2] ?? resolve(HERE, '../data/reels.csv');

const MIN_BENCHMARK_N = 10; // below this we refuse to publish benchmarks
const STABLE_N = 25;        // below this benchmarks are provisional
const MIN_GROUP_N = 3;      // below this a pattern group is suppressed

// ---------- CSV ----------

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ''));
}

function loadReels(path) {
  const rows = parseCSV(readFileSync(path, 'utf8'));
  if (!rows.length) return [];
  const header = rows[0].map(h => h.trim());
  return rows.slice(1).map(cells => {
    const o = {};
    header.forEach((h, i) => { o[h] = (cells[i] ?? '').trim(); });
    return o;
  });
}

// Missing must stay missing: an empty cell is NOT zero. Number('') === 0 would
// turn "we never captured this" into "we measured none", which is the exact
// false precision this whole system exists to prevent.
const num = v => {
  const s = String(v ?? '').replace(/[, ]/g, '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// ---------- stats ----------

// Linear-interpolated percentile on a sorted ascending array.
function percentile(sorted, p) {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * (p / 100);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

const median = xs => percentile([...xs].sort((a, b) => a - b), 50);

// Fractional ranks with ties averaged — required for a correct Spearman.
function ranks(xs) {
  const idx = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(xs.length);
  let i = 0;
  while (i < idx.length) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[idx[k][1]] = avg;
    i = j + 1;
  }
  return out;
}

// Spearman rank correlation. Rank-based, so it survives outliers and the
// wildly skewed reach distributions Instagram produces.
function spearman(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const rx = ranks(xs), ry = ranks(ys);
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = rx[i] - mx, b = ry[i] - my;
    num += a * b; dx += a * a; dy += b * b;
  }
  if (dx === 0 || dy === 0) return null; // no variance — e.g. every score identical
  return num / Math.sqrt(dx * dy);
}

// Approximate two-tailed significance at alpha=0.05 via the t-approximation.
// Deliberately conservative: below n=10 we refuse to call anything significant.
function isSignificant(rho, n) {
  if (rho == null || n < 10) return false;
  const t = Math.abs(rho) * Math.sqrt((n - 2) / (1 - rho * rho));
  const crit = n <= 12 ? 2.23 : n <= 15 ? 2.16 : n <= 20 ? 2.10 : n <= 30 ? 2.05 : 1.98;
  return t > crit;
}

const pct = x => x == null ? '—' : `${(x * 100).toFixed(2)}%`;
const int = x => x == null ? '—' : Math.round(x).toLocaleString('en-US');

function lengthBucket(sec) {
  if (sec == null) return 'unknown';
  if (sec <= 10) return '0-10s';
  if (sec <= 20) return '11-20s';
  if (sec <= 30) return '21-30s';
  if (sec <= 45) return '31-45s';
  if (sec <= 60) return '46-60s';
  return '60s+';
}

// ---------- derive ----------

function derive(r) {
  const reach = num(r.reach);
  const safe = (n) => (reach && reach > 0 && n != null) ? n / reach : null;
  const len = num(r.length_sec);
  const avgWatch = num(r.avg_watch_time_sec);
  return {
    ...r,
    _reach: reach,
    _length: len,
    _bucket: lengthBucket(len),
    likeRate: safe(num(r.likes)),
    commentRate: safe(num(r.comments)),
    shareRate: safe(num(r.shares)),
    saveRate: safe(num(r.saves)),
    followConv: safe(num(r.follows)),
    profileConv: safe(num(r.profile_visits)),
    nonFollowerPct: safe(num(r.non_followers_reach)),
    retentionProxy: (len && len > 0 && avgWatch != null) ? avgWatch / len : null,
  };
}

// Metrics used for benchmarks, ordered by the account's goal priority.
const METRICS = [
  ['non_followers_reach', 'Non-Follower Reach', r => num(r.non_followers_reach), int],
  ['nonFollowerPct',      'Non-Follower %',     r => r.nonFollowerPct,           pct],
  ['retentionProxy',      'Retention Proxy',    r => r.retentionProxy,           pct],
  ['shareRate',           'Share Rate',         r => r.shareRate,                pct],
  ['commentRate',         'Comment Rate',       r => r.commentRate,              pct],
  ['likeRate',            'Like Rate',          r => r.likeRate,                 pct],
  ['saveRate',            'Save Rate',          r => r.saveRate,                 pct],
  ['followConv',          'Follow Conversion',  r => r.followConv,               pct],
  ['profileConv',         'Profile Conversion', r => r.profileConv,              pct],
  ['reach',               'Reach',              r => r._reach,                   int],
  ['likes',               'Likes',              r => num(r.likes),               int],
];

// Promoted reels: absolute numbers describe the budget, but two boosted reels
// delivered to comparable reach are a fair RELATIVE test of the creative — same
// channel, same cold audience, near-identical denominator. Excluding them from
// benchmarks is right; refusing to compare them to each other is not, and when
// no organic rows exist this is the only signal the data can carry.
function promotedComparison() {
  if (promotedReels.length < 2) return;

  // Engagement the owner generated from their own accounts measures nothing.
  // It also cannot be netted out: subtracting the ad's share count from the
  // total leaves the self-generated remainder, not the organic one. There is no
  // arithmetic that recovers a content signal from these rows, so they are
  // barred from the creative comparison rather than discounted within it.
  const dirty = promotedReels.filter(isSelfEngaged);
  if (dirty.length) {
    say('');
    say('-'.repeat(64));
    say('  ⚠  SELF-GENERATED ENGAGEMENT — COMPARISON SUPPRESSED');
    say('-'.repeat(64));
    say(`  Excluded: ${dirty.map(r => r.reel_id || '?').join(', ')}`);
    say('');
    say('  Interactions on these reels came from accounts the owner controls.');
    say('  Share rate, like rate and every ratio built on them describe that');
    say('  activity, not the audience. Do NOT call any of them a template.');
    say('  Subtracting the ad figures does not fix it — the remainder is the');
    say('  self-generated part, not the organic one.');
    say('');
    say('  A clean signal requires a reel with no boost AND no owner activity.');
  }

  const rs = promotedReels
    .filter(r => !isSelfEngaged(r))
    .filter(r => r.shareRate != null && r._reach != null)
    .sort((a, b) => b.shareRate - a.shareRate);
  if (rs.length < 2) return;

  say('');
  say('-'.repeat(64));
  say('  PROMOTED — RELATIVE COMPARISON (not benchmarks)');
  say('-'.repeat(64));
  say('ID           Reach      Share%    Like%     vs weakest');
  say('-'.repeat(64));

  const weakest = rs[rs.length - 1], top = rs[0];
  for (const r of rs) {
    const mult = weakest.shareRate > 0 ? r.shareRate / weakest.shareRate : null;
    say((r.reel_id || '?').padEnd(12) + int(r._reach).padEnd(11) +
        pct(r.shareRate).padEnd(10) + pct(r.likeRate).padEnd(10) +
        (mult == null ? '—' : mult.toFixed(1) + 'x'));
  }

  const spread = top._reach / weakest._reach;
  say('');
  if (spread > 1.2 || spread < 0.83) {
    say('⚠  Reach differs by more than 20% here, so part of the gap is exposure');
    say('   rather than creative. Treat the comparison as weak.');
  } else {
    say('✓  Reach is within 20%, so the share-rate gap reflects the CREATIVE, not');
    say(`   the spend. ${top.reel_id} is the template worth studying.`);
  }
  say('   Still not a benchmark: cold paid audiences share less than organic ones.');
}

const out = [];
const say = s => out.push(s);

// ---------- report ----------

if (!existsSync(CSV)) {
  console.error(`✗ Not found: ${CSV}`);
  process.exit(1);
}

// Promoted reels must never enter the benchmarks. Ad delivery and the organic
// recommendation system are separate pipes: paid impressions land on cold
// audiences with no intent, so their watch time and reach describe the budget,
// not the content. Pooling them would poison every percentile in this file.
const isPromoted = r => ['yes', 'y', 'true', '1'].includes(String(r.promoted ?? '').trim().toLowerCase());

// Marked by hand in the notes column. Kept as a marker rather than a new column
// so existing rows and both import scripts keep working unchanged.
const isSelfEngaged = r => /SELF_ENGAGEMENT/i.test(String(r.notes ?? ''));

const allReels = loadReels(CSV).map(derive);
const promotedReels = allReels.filter(isPromoted);
const reels = allReels.filter(r => !isPromoted(r));
const n = reels.length;

say('='.repeat(64));
say('  REEL DATABASE ANALYSIS');
say('='.repeat(64));
say(`Source : ${CSV}`);
say(`Organic reels : ${n}`);
if (promotedReels.length) {
  say(`Promoted reels: ${promotedReels.length}  — EXCLUDED from all analysis below`);
  say('');
  say('⚠  Boosted reels are not evidence about your content. Paid delivery and the');
  say('   organic recommendation system are separate: ad impressions reach cold');
  say('   audiences with no intent, so a ~1s average watch time is normal for them');
  say('   and says nothing about your hook. Their reach measures spend, not quality.');
  say('   Never benchmark or draw retention conclusions from these rows. Comparing');
  say('   two boosted reels to EACH OTHER is still valid — see the section below.');
}
say('');

if (n === 0) {
  say('⚠  DATABASE EMPTY — no analysis possible.');
  say('');
  say('   Add one row per published Reel to data/reels.csv, then re-run.');
  say('   Any judgement made now rests on general principles, NOT on this');
  say('   account\'s data. CONFIDENCE = LOW until n >= 10.');
  say('');
  say('   Required per reel: reach, non_followers_reach, avg_watch_time_sec,');
  say('   length_sec, likes, comments, shares, saves, follows, profile_visits.');
  promotedComparison();   // the only comparison available with no organic rows
  console.log(out.join('\n'));
  process.exit(0);
}

// --- benchmarks ---
say('-'.repeat(64));
say('  BENCHMARKS   FLOOR = p25 · TARGET = median · BREAKOUT = p90');
say('-'.repeat(64));

if (n < MIN_BENCHMARK_N) {
  say(`⚠  INSUFFICIENT DATA (n=${n}, need ${MIN_BENCHMARK_N}).`);
  say('   Benchmarks are NOT published below this threshold — a median over');
  say(`   ${n} reels is noise, not a target. Raw per-reel rates are shown below.`);
} else {
  if (n < STABLE_N) {
    say(`⚠  PROVISIONAL (n=${n} < ${STABLE_N}) — treat as unstable; recheck every ~10 reels.`);
  }
  say('');
  say('Metric                 FLOOR         TARGET        BREAKOUT');
  say('-'.repeat(64));
  for (const [, label, get, fmt] of METRICS) {
    const vals = reels.map(get).filter(v => v != null).sort((a, b) => a - b);
    if (vals.length < MIN_BENCHMARK_N) continue;
    const cells = [25, 50, 90].map(p => fmt(percentile(vals, p)).padEnd(13));
    say(`${label.padEnd(22)} ${cells.join('')}`);
  }
}
say('');

// --- per-reel classification ---
say('-'.repeat(64));
say('  PER-REEL  (classified on Share Rate vs account median)');
say('-'.repeat(64));

const shareRates = reels.map(r => r.shareRate).filter(v => v != null);
const medShare = shareRates.length ? median(shareRates) : null;
const medNonFol = (() => {
  const v = reels.map(r => r.nonFollowerPct).filter(x => x != null);
  return v.length ? median(v) : null;
})();

say('ID           Reach     NonFol%   Retn%    Share%   Like%    Class');
say('-'.repeat(64));
for (const r of reels) {
  let cls = '—';
  if (medShare != null && r.shareRate != null && medShare > 0) {
    const ratio = r.shareRate / medShare;
    cls = ratio >= 1.5 ? 'WINNER' : ratio <= 0.6 ? 'LOSER' : 'NORMAL';
  }
  say(
    (r.reel_id || '?').padEnd(12) +
    int(r._reach).padEnd(10) +
    pct(r.nonFollowerPct).padEnd(10) +
    pct(r.retentionProxy).padEnd(9) +
    pct(r.shareRate).padEnd(9) +
    pct(r.likeRate).padEnd(9) +
    cls
  );
}
say('');

// --- patterns ---
say('-'.repeat(64));
say('  PATTERNS   vs account median · groups with n<3 suppressed');
say('-'.repeat(64));

const DIMENSIONS = [
  ['hook_type', r => r.hook_type],
  ['topic', r => r.topic],
  ['length_bucket', r => r._bucket],
  ['cta', r => r.cta],
  ['editing_style', r => r.editing_style],
];

let anyPattern = false;
const winning = [], losing = [];
// Track which reels back each flagged pattern, so we can detect dimensions
// that are really the same reels wearing different labels.
const membership = new Map();

for (const [dimName, get] of DIMENSIONS) {
  const groups = new Map();
  for (const r of reels) {
    const k = (get(r) || '').trim();
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  if (!groups.size) continue;

  const lines = [], skipped = [];
  for (const [key, rs] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    if (rs.length < MIN_GROUP_N) { skipped.push(`${key} (n=${rs.length})`); continue; }

    const gShare = rs.map(r => r.shareRate).filter(v => v != null);
    const gNonFol = rs.map(r => r.nonFollowerPct).filter(v => v != null);
    if (!gShare.length) continue;

    const gs = median(gShare);
    const gnf = gNonFol.length ? median(gNonFol) : null;
    const delta = (medShare && medShare > 0) ? (gs / medShare - 1) * 100 : null;

    let flag = '';
    // 20% is the noise floor for Instagram reach variance on small samples.
    if (delta != null && delta >= 20) { flag = '  ← WINNING'; winning.push(`${dimName}="${key}" share rate +${delta.toFixed(0)}% vs median (n=${rs.length})`); }
    else if (delta != null && delta <= -20) { flag = '  ← LOSING'; losing.push(`${dimName}="${key}" share rate ${delta.toFixed(0)}% vs median (n=${rs.length})`); }
    if (flag) {
      const ids = rs.map(r => r.reel_id || '?').sort();
      membership.set(`${dimName}="${key}"`, new Set(ids));
    }

    lines.push(
      `  ${key.slice(0, 20).padEnd(21)} n=${String(rs.length).padEnd(4)} ` +
      `share ${pct(gs).padEnd(9)} nonFol ${pct(gnf).padEnd(9)} ` +
      `${delta == null ? '' : (delta >= 0 ? '+' : '') + delta.toFixed(0) + '%'}${flag}`
    );
  }

  if (lines.length) {
    anyPattern = true;
    say('');
    say(`▸ ${dimName}`);
    lines.forEach(l => say(l));
    if (skipped.length) say(`  (suppressed, n<${MIN_GROUP_N}: ${skipped.join(', ')})`);
  }
}

if (!anyPattern) {
  say('');
  say(`⚠  No group reached n>=${MIN_GROUP_N}. No pattern claims can be made yet.`);
  say('   Do NOT infer patterns from single reels — one reel is not a trend.');
}

say('');
say('-'.repeat(64));
say('  WINNING / LOSING PATTERNS');
say('-'.repeat(64));
if (!winning.length && !losing.length) {
  say('None exceed the ±20% noise floor. Nothing is proven yet.');
} else {
  winning.forEach(w => say(`WINNING  ${w}`));
  losing.forEach(l => say(`LOSING   ${l}`));

  // Confounded patterns: two labels backed by an identical (or near-identical)
  // set of reels are ONE finding, not two. Reporting them separately manufactures
  // false corroboration — the classic way a dashboard lies with real numbers.
  const keys = [...membership.keys()];
  const confounds = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const a = membership.get(keys[i]), b = membership.get(keys[j]);
      const inter = [...a].filter(x => b.has(x)).length;
      const union = new Set([...a, ...b]).size;
      if (union > 0 && inter / union >= 0.8) {
        confounds.push(`${keys[i]}  ≡  ${keys[j]}   (${inter}/${union} same reels)`);
      }
    }
  }
  if (confounds.length) {
    say('');
    say('⚠  CONFOUNDED — these labels describe the SAME reels:');
    confounds.forEach(c => say(`     ${c}`));
    say('   Count them as ONE observation. You cannot tell which attribute drove');
    say('   the result until you vary them independently.');
  }

  say('');
  say('⚠  These are correlations on a small sample, not causes. Confirm with a');
  say('   controlled experiment (one variable) before treating them as rules.');
}
say('');

// --- 10K likes gap ---
say('-'.repeat(64));
say('  10,000 LIKES — GAP ANALYSIS');
say('-'.repeat(64));

const likeRates = reels.map(r => r.likeRate).filter(v => v != null);
if (likeRates.length < MIN_BENCHMARK_N) {
  say(`⚠  Need ${MIN_BENCHMARK_N}+ reels with reach+likes to model this (have ${likeRates.length}).`);
} else {
  const medLike = median(likeRates);
  const reachNeeded = medLike > 0 ? 10000 / medLike : null;
  const reaches = reels.map(r => r._reach).filter(v => v != null).sort((a, b) => a - b);
  const best = reaches[reaches.length - 1];
  const hit = reachNeeded == null ? 0 : reaches.filter(v => v >= reachNeeded).length;

  say(`Account median like rate : ${pct(medLike)}`);
  say(`Reach needed for 10K likes: ${int(reachNeeded)}`);
  say(`Best reach achieved       : ${int(best)}`);
  say(`Reels that cleared it     : ${hit} / ${n}`);
  say('');
  if (reachNeeded != null && best < reachNeeded) {
    say(`⚠  The account has never reached ${int(reachNeeded)}. 10K likes is currently`);
    say(`   ${(reachNeeded / best).toFixed(1)}x beyond the best reel to date. It is an aspiration,`);
    say('   not a floor. Raise the median first — do not chase the like count.');
  } else {
    say('   Achieved before. Study those reels specifically: what did they share');
    say('   in hook type, length, and share trigger?');
  }
  say('');
  say('   Likes are an OUTPUT. Work the inputs: sends and watch time drive');
  say('   non-follower reach, which drives likes. Targeting likes directly');
  say('   produces content nobody sends.');
}

// --- calibration: does the rubric actually predict anything? ---
say('');
say('-'.repeat(64));
say('  SCORE CALIBRATION — is the rubric predictive?');
say('-'.repeat(64));

const scored = reels.filter(r => num(r.predicted_score) != null && r.shareRate != null);
if (scored.length < MIN_BENCHMARK_N) {
  say(`⚠  Need ${MIN_BENCHMARK_N}+ reels carrying predicted_score (have ${scored.length}).`);
  say('   Until then the rubric is an UNVALIDATED opinion. Log the pre-publish');
  say('   score in predicted_score for every reel — that is what turns this');
  say('   system from advice into a measured predictor.');
} else {
  const ps = scored.map(r => num(r.predicted_score));

  // 1. Is the rubric discriminating, or does everything score 85-90?
  const spread = Math.max(...ps) - Math.min(...ps);
  const medScore = median(ps);
  say(`Scored reels : ${scored.length}`);
  say(`Score range  : ${Math.min(...ps)} – ${Math.max(...ps)}  (median ${medScore.toFixed(1)})`);
  if (spread < 15) {
    say('⚠  SCORE COMPRESSION — range under 15 points. A rubric that rates');
    say('   everything the same cannot rank anything. Apply the caps harder.');
  }
  say('');

  // 2. Rank correlation against the outcomes that actually matter.
  say('Predicted score vs actual outcome (Spearman rank correlation):');
  say('');
  const targets = [
    ['Share Rate',      r => r.shareRate],
    ['Non-Follower %',  r => r.nonFollowerPct],
    ['Retention Proxy', r => r.retentionProxy],
    ['Reach',           r => r._reach],
  ];
  let anyPredictive = false;
  for (const [label, get] of targets) {
    const pairs = scored.map(r => [num(r.predicted_score), get(r)]).filter(p => p[1] != null);
    if (pairs.length < MIN_BENCHMARK_N) { say(`  ${label.padEnd(18)} — insufficient data`); continue; }
    const rho = spearman(pairs.map(p => p[0]), pairs.map(p => p[1]));
    if (rho == null) { say(`  ${label.padEnd(18)} — no variance`); continue; }
    const sig = isSignificant(rho, pairs.length);
    if (sig && rho > 0) anyPredictive = true;
    const strength = Math.abs(rho) >= 0.7 ? 'strong' : Math.abs(rho) >= 0.4 ? 'moderate' : 'weak';
    say(`  ${label.padEnd(18)} rho=${rho >= 0 ? '+' : ''}${rho.toFixed(2)}  ${strength.padEnd(9)}` +
        `${sig ? 'significant' : 'NOT significant'}  (n=${pairs.length})`);
  }
  say('');

  // 3. Does the gate itself separate outcomes?
  const approved = scored.filter(r => num(r.predicted_score) >= 85);
  const below = scored.filter(r => num(r.predicted_score) < 85);
  if (approved.length >= 3 && below.length >= 3) {
    const ma = median(approved.map(r => r.shareRate).filter(v => v != null));
    const mb = median(below.map(r => r.shareRate).filter(v => v != null));
    say(`Gate check   >=85 median share rate ${pct(ma)} (n=${approved.length})`);
    say(`             <85  median share rate ${pct(mb)} (n=${below.length})`);
    if (ma != null && mb != null) {
      if (ma <= mb) {
        say('🚨 THE GATE IS INVERTED — approved reels did NOT outperform rejected ones.');
        say('   The 85 threshold is not earning its place. Do not trust it until');
        say('   the rubric weights are re-derived from this data.');
      } else {
        say(`   Approved outperform by ${((ma / mb - 1) * 100).toFixed(0)}%.`);
      }
    }
  } else {
    say('Gate check   — need 3+ reels on each side of the 85 threshold.');
  }

  say('');
  if (!anyPredictive) {
    say('⚠  VERDICT: no significant positive correlation yet. The score is not');
    say('   demonstrably predicting performance on this account. Treat rubric');
    say('   output as a structured opinion, NOT as evidence.');
  } else {
    say('✓  The score shows a significant positive relationship with at least one');
    say('   outcome. Keep logging — recheck every ~10 reels; it can decay.');
  }
  say('');
  say('   Note: correlation here is not proof the rubric CAUSES performance.');
  say('   It shows the score ranks reels in roughly the right order — which is');
  say('   all a pre-publish gate needs to be useful.');
}

promotedComparison();

say('');
say('='.repeat(64));
say('Distribution is decided by Instagram and its users. These are the');
say("account's own historical percentiles — never a guarantee of any number.");
say('='.repeat(64));

console.log(out.join('\n'));
