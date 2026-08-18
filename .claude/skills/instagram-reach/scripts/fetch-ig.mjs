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
const WANTED = ['reach', 'likes', 'comments', 'saved', 'shares', 'views',
                'total_interactions', 'ig_reels_avg_watch_time', 'ig_reels_video_view_total_time'];

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

  rec.notes = notes.join(' / ');
  rows.push(COLS.map(c => rec[c]).join(','));
  process.stdout.write(`  ${rec.date}  reach=${String(rec.reach).padEnd(8)} shares=${String(rec.shares).padEnd(6)} avg=${rec.avg_watch_time_sec || '—'}\n`);
}

let out = COLS.join(',') + '\n';
if (existsSync(TARGET)) {
  const keep = readFileSync(TARGET, 'utf8').trim().split('\n').slice(1)
    .filter(l => l.trim() && !rows.some(r => r.split(',')[0] === l.split(',')[0]));
  out += keep.concat(rows).join('\n') + '\n';
} else out += rows.join('\n') + '\n';
writeFileSync(TARGET, out);

console.log(`\n✓ ${rows.length} reels → ${TARGET}`);
console.log('\n⚠  The API does NOT say which reels were boosted. Set promoted=yes on');
console.log('   every boosted reel by hand, or the benchmarks will be meaningless.');
console.log('\nNext: node .claude/skills/instagram-reach/scripts/analyze.mjs');
