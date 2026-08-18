#!/usr/bin/env node
// Pull reels + insights from the Instagram Graph API into reels.csv.
//
//   export IG_ACCESS_TOKEN='...'      # never pass the token as an argument:
//   node fetch-ig.mjs [--limit 50]    # argv is visible in shell history and ps
//
// Requires an Instagram Creator/Business account and a token created through
// "API setup with Instagram login" on developers.facebook.com.

import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TARGET = resolve(HERE, '../data/reels.csv');
const API = 'https://graph.instagram.com/v25.0';

const TOKEN = process.env.IG_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('✗ IG_ACCESS_TOKEN is not set.\n');
  console.error("  export IG_ACCESS_TOKEN='your-long-lived-token'");
  console.error('  node fetch-ig.mjs\n');
  console.error('  Keep it in the environment, not in the command line.');
  process.exit(1);
}
const LIMIT = Number(process.argv[process.argv.indexOf('--limit') + 1]) || 50;

async function api(path, params = {}) {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('access_token', TOKEN);
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) {
    const e = new Error(json.error.message);
    e.meta = json.error;
    throw e;
  }
  return json;
}

// Metric availability varies by media age, type and API version, and one
// unsupported name fails the whole request. Drop the rejected metric and retry
// rather than losing every metric for that reel.
// reels_skip_rate is the closest thing the API has to a hook score: the share
// of views that skipped inside the first 3 seconds. reposts is a distribution
// signal the in-app insights show but the old metric list dropped on the floor.
const WANTED = ['reach', 'likes', 'comments', 'saved', 'shares', 'views',
                'total_interactions', 'ig_reels_avg_watch_time', 'ig_reels_video_view_total_time',
                'reels_skip_rate', 'reposts'];

async function insights(id) {
  let metrics = [...WANTED];
  for (let attempt = 0; attempt < WANTED.length; attempt++) {
    try {
      const r = await api(`${id}/insights`, { metric: metrics.join(',') });
      return Object.fromEntries(r.data.map(m => [m.name, m.values?.[0]?.value ?? '']));
    } catch (e) {
      const bad = metrics.find(m => e.message.includes(m));
      if (!bad || metrics.length === 1) {
        console.warn(`  ! insights unavailable for ${id}: ${e.message}`);
        return {};
      }
      metrics = metrics.filter(m => m !== bad);
    }
  }
  return {};
}

const COLS = ['reel_id','date','promoted','predicted_score','predicted_verdict','topic','angle',
  'hook_type','hook_wording','length_sec','posting_time','editing_style','cta','views','reach',
  'followers_reach','non_followers_reach','avg_watch_time_sec','replays','likes','comments',
  'shares','saves','follows','profile_visits','notes'];

const clean = v => String(v ?? '').replace(/[",\n\r]/g, ' ').trim();

console.log('Fetching account…');
// Instagram Login tokens expose the professional account id as user_id.
const me = await api('me', { fields: 'user_id,username,media_count,account_type' });
const IG_ID = me.user_id ?? me.id;
console.log(`  @${me.username} (${me.account_type ?? '?'}) — ${me.media_count ?? '?'} media\n`);

const media = await api(`${IG_ID}/media`, {
  fields: 'id,caption,media_type,media_product_type,timestamp,permalink,like_count,comments_count',
  limit: LIMIT,
});
const reels = media.data.filter(m => m.media_product_type === 'REELS' || m.media_type === 'VIDEO');
console.log(`Found ${reels.length} reels of ${media.data.length} media. Fetching insights…\n`);

// Columns a human fills in and the API can never return: the hand-set boosted
// flag, the pre-publish score, the craft labels, and the follower-split and
// conversion numbers that only exist in the in-app Insights screen. Fetching
// must never overwrite these — losing the `promoted` flag silently feeds
// boosted reels into the organic benchmarks, which is the one thing this whole
// system exists to prevent.
const MANUAL = ['promoted', 'predicted_score', 'predicted_verdict', 'topic', 'angle',
  'hook_type', 'hook_wording', 'length_sec', 'posting_time', 'editing_style', 'cta',
  'followers_reach', 'non_followers_reach', 'replays', 'follows', 'profile_visits'];

// The file is hand-edited on Windows, so rows arrive CRLF-terminated. Strip the
// CR before splitting or the last column's key keeps it and every lookup for
// `notes` silently misses.
const parseCsv = txt => {
  const lines = txt.replace(/\r/g, '').trim().split('\n').filter(l => l.trim());
  const head = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(l => {
    const cells = l.split(',');
    return Object.fromEntries(head.map((h, i) => [h, (cells[i] ?? '').trim()]));
  });
};

const prior = existsSync(TARGET) ? parseCsv(readFileSync(TARGET, 'utf8')) : [];
const claimed = new Set();

// Rows keyed by a hand-written id like "R-A" describe the same reel the API
// returns under a numeric media id. Match them on date so the manual labels
// carry over instead of the reel landing in the file twice.
function priorRowFor(mediaId, date) {
  let hit = prior.find(r => r.reel_id === mediaId);
  if (!hit && date) hit = prior.find(r => r.date === date && !/^\d+$/.test(r.reel_id) && !claimed.has(r.reel_id));
  if (hit) claimed.add(hit.reel_id);
  return hit;
}

const rows = [];
for (const m of reels) {
  const ins = await insights(m.id);
  const rec = Object.fromEntries(COLS.map(c => [c, '']));
  const notes = [];

  rec.reel_id = m.id;
  rec.date = (m.timestamp || '').slice(0, 10);
  rec.topic = clean(m.caption).slice(0, 60);
  rec.views = ins.views ?? '';
  rec.reach = ins.reach ?? '';
  rec.likes = ins.likes ?? m.like_count ?? '';
  rec.comments = ins.comments ?? m.comments_count ?? '';
  rec.saves = ins.saved ?? '';
  rec.shares = ins.shares ?? '';
  if (ins.reposts !== undefined && ins.reposts !== '') notes.push(`reposts=${ins.reposts}`);
  if (ins.reels_skip_rate !== undefined && ins.reels_skip_rate !== '') notes.push(`skip_rate_3s=${ins.reels_skip_rate}`);
  if (m.permalink) notes.push(m.permalink);

  // ig_reels_avg_watch_time is documented in milliseconds. Rather than trust
  // that blindly, sanity-check against the reel's own duration: a value larger
  // than the video itself can only be ms.
  const raw = Number(ins.ig_reels_avg_watch_time);
  if (Number.isFinite(raw) && raw > 0) {
    const asSec = raw > 1000 ? raw / 1000 : raw;
    rec.avg_watch_time_sec = Number(asSec.toFixed(2));
    notes.push(`avg_watch raw=${raw}${raw > 1000 ? ' (ms->s)' : ''}`);
  }
  const total = Number(ins.ig_reels_video_view_total_time);
  if (Number.isFinite(total) && total > 0) notes.push(`total_watch_raw=${total}`);

  const was = priorRowFor(m.id, rec.date);
  if (was) {
    for (const c of MANUAL) if (was[c]) rec[c] = was[c];
    if (was.notes) notes.unshift(was.notes);
    if (was.reel_id !== m.id) notes.unshift(`was ${was.reel_id}`);
  }
  rec.notes = clean(notes.join(' / '));
  rows.push(rec);
  process.stdout.write(`  ${rec.date}  reach=${String(rec.reach).padEnd(8)} shares=${String(rec.shares).padEnd(6)} avg=${rec.avg_watch_time_sec || '—'}${was ? `  ← merged ${was.reel_id}` : ''}\n`);
}

// Prior rows the fetch never matched — a reel outside the --limit window, or a
// hand-written row with no date to match on. Keep them; dropping a row the user
// typed by hand would be worse than leaving a possible duplicate visible.
const orphans = prior.filter(r => !claimed.has(r.reel_id));

const line = r => COLS.map(c => clean(r[c])).join(',');
writeFileSync(TARGET, COLS.join(',') + '\n' + orphans.concat(rows).map(line).join('\n') + '\n');

console.log(`\n✓ ${rows.length} reels → ${TARGET}`);
if (orphans.length) {
  console.log(`\n⚠  ${orphans.length} existing row(s) were not matched to any fetched reel:`);
  for (const o of orphans) console.log(`     ${o.reel_id}${o.date ? ` (${o.date})` : ' — no date, cannot auto-match'}`);
  console.log('   If one of these is the same reel as a fetched row, merge them by hand:');
  console.log('   the duplicate would otherwise be counted twice in every benchmark.');
}
console.log('\n⚠  The API does NOT say which reels were boosted. Set promoted=yes on');
console.log('   every boosted reel by hand, or the benchmarks will be meaningless.');
console.log('   (Labels you already set are preserved across re-runs.)');
console.log('\n⚠  Per-reel non_followers_reach is NOT available from the API — no');
console.log('   follower_type breakdown exists at media level. Copy it from the');
console.log('   in-app Insights screen by hand. It is the pivot metric.');
console.log('\nNext: node .claude/skills/instagram-reach/scripts/analyze.mjs');
