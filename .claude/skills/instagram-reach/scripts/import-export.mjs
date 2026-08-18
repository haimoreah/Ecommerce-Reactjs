#!/usr/bin/env node
// Import a Meta Business Suite / Instagram content export into reels.csv.
//
// Usage: node import-export.mjs <export.csv> [--promoted] [--append]
//
// Column names in Meta's exports vary by locale, surface and account type, so
// headers are matched by normalized alias rather than exact string. Every
// mapping is printed before anything is written: a silent mismapping would put
// real numbers under the wrong metric, which is worse than importing nothing.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TARGET = resolve(HERE, '../data/reels.csv');

const args = process.argv.slice(2);
const SRC = args.find(a => !a.startsWith('--'));
const PROMOTED = args.includes('--promoted');
const APPEND = args.includes('--append');

if (!SRC) {
  console.error('Usage: node import-export.mjs <export.csv> [--promoted] [--append]');
  console.error('  --promoted  mark every imported row as boosted (excluded from benchmarks)');
  console.error('  --append    keep existing rows instead of replacing them');
  process.exit(1);
}
if (!existsSync(SRC)) { console.error(`Not found: ${SRC}`); process.exit(1); }

function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
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

const norm = s => String(s).toLowerCase().replace(/[^a-z0-9؀-ۿ]/g, '');

// Longest aliases first so "averagewatchtime" is not swallowed by "watchtime".
const FIELDS = [
  ['reel_id',        ['postid', 'contentid', 'mediaid', 'id', 'permalink', 'link']],
  ['date',           ['publishtime', 'datepublished', 'createdtime', 'date', 'التاريخ']],
  ['length_sec',     ['duration', 'videolength', 'length', 'مدة']],
  ['views',          ['views', 'plays', 'videoviews', 'impressions', 'مشاهدات']],
  ['reach',          ['accountsreached', 'reach', 'وصول']],
  ['follows',        ['followsfrompost', 'newfollowers', 'follows', 'متابعات']],
  ['profile_visits', ['profilevisits', 'زياراتالملف']],
  ['avg_watch_time_sec', ['averagewatchtime', 'avgwatchtime', 'averagesecondsviewed', 'averagetimewatched']],
  ['_total_watch',   ['totalwatchtime', 'watchtime', 'minutesviewed', 'secondsviewed', 'videowatchtime']],
  ['likes',          ['likes', 'reactions', 'إعجابات']],
  ['comments',       ['comments', 'تعليقات']],
  ['shares',         ['shares', 'sends', 'مشاركات']],
  ['saves',          ['saves', 'saved', 'bookmarks', 'حفظ']],
  ['replays',        ['replays', 'loops']],
  ['followers_reach',     ['followerreach', 'reachfromfollowers']],
  ['non_followers_reach', ['nonfollowerreach', 'reachfromnonfollowers']],
  ['topic',          ['description', 'caption', 'title', 'posttitle']],
];

// "5h 55m 4s", "1:23:45", "45 min", or a bare number.
function toSeconds(v, unitHint = '') {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const hms = s.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/i);
  if (hms && (hms[1] || hms[2] || hms[3])) {
    return (+(hms[1] || 0)) * 3600 + (+(hms[2] || 0)) * 60 + (+(hms[3] || 0));
  }
  if (s.includes(':')) {
    const p = s.split(':').map(Number);
    if (p.some(isNaN)) return null;
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
  }
  const n = Number(s.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(n)) return null;
  return /min/i.test(unitHint) || /min/i.test(s) ? n * 60 : n;
}

const rows = parseCSV(readFileSync(SRC, 'utf8'));
if (rows.length < 2) { console.error('Export has no data rows.'); process.exit(1); }

const header = rows[0];
const idx = {};
const used = new Set();

// Two passes. Exact matches are claimed first, so a plain "Reach" column wins
// over "Reach from non-followers" no matter which appears first in the file.
// In the fuzzy pass the SHORTEST matching header wins, for the same reason:
// a substring match against a long compound name is almost always the wrong one.
// Getting this wrong is silent and severe -- non-follower reach landing in the
// reach column corrupts the denominator of every rate in the analysis.
for (const [field, aliases] of FIELDS) {
  for (const alias of aliases) {
    const i = header.findIndex((h, j) => !used.has(j) && norm(h) === alias);
    if (i !== -1) { idx[field] = i; used.add(i); break; }
  }
}
for (const [field, aliases] of FIELDS) {
  if (idx[field] !== undefined) continue;
  let best = -1, bestLen = Infinity;
  for (const alias of aliases) {
    header.forEach((h, j) => {
      if (used.has(j) || !norm(h).includes(alias)) return;
      if (norm(h).length < bestLen) { best = j; bestLen = norm(h).length; }
    });
    if (best !== -1) break;
  }
  if (best !== -1) { idx[field] = best; used.add(best); }
}

console.log('COLUMN MAPPING');
console.log('-'.repeat(58));
for (const [field] of FIELDS) {
  const i = idx[field];
  console.log(`  ${field.padEnd(22)} ${i === undefined ? '— not found' : `"${header[i]}"`}`);
}
const unmapped = header.filter((_, j) => !used.has(j)).filter(h => h.trim());
if (unmapped.length) console.log(`\n  ignored columns: ${unmapped.join(' | ')}`);
console.log('');

const get = (cells, f) => idx[f] === undefined ? '' : (cells[idx[f]] ?? '').trim();
const clean = v => String(v).replace(/[",]/g, ' ').trim();

const OUT_COLS = ['reel_id','date','promoted','predicted_score','predicted_verdict','topic','angle',
  'hook_type','hook_wording','length_sec','posting_time','editing_style','cta','views','reach',
  'followers_reach','non_followers_reach','avg_watch_time_sec','replays','likes','comments',
  'shares','saves','follows','profile_visits','notes'];

const out = [];
let derivedCount = 0;
for (const cells of rows.slice(1)) {
  const rec = Object.fromEntries(OUT_COLS.map(c => [c, '']));
  for (const [field] of FIELDS) {
    if (field.startsWith('_') || !OUT_COLS.includes(field)) continue;
    rec[field] = clean(get(cells, field));
  }
  rec.length_sec = toSeconds(get(cells, 'length_sec')) ?? '';
  rec.promoted = PROMOTED ? 'yes' : '';

  // Prefer a reported average; otherwise derive it from total watch time.
  let avg = toSeconds(get(cells, 'avg_watch_time_sec'));
  if (avg == null) {
    const total = toSeconds(get(cells, '_total_watch'), idx['_total_watch'] !== undefined ? header[idx['_total_watch']] : '');
    const denom = Number(String(rec.views || rec.reach).replace(/[^0-9.]/g, ''));
    if (total != null && Number.isFinite(denom) && denom > 0) {
      avg = total / denom;
      rec.notes = `avg derived from total watch ${total}s / ${denom}`;
      derivedCount++;
    }
  }
  rec.avg_watch_time_sec = avg == null ? '' : Number(avg.toFixed(2));
  if (rec.topic) rec.topic = rec.topic.slice(0, 60);
  out.push(OUT_COLS.map(c => rec[c]).join(','));
}

let final = OUT_COLS.join(',') + '\n';
if (APPEND && existsSync(TARGET)) {
  const existing = readFileSync(TARGET, 'utf8').trim().split('\n').slice(1).filter(Boolean);
  final += existing.concat(out).join('\n') + '\n';
} else {
  final += out.join('\n') + '\n';
}
writeFileSync(TARGET, final);

console.log(`✓ Imported ${out.length} reels → ${TARGET}`);
if (derivedCount) console.log(`  ${derivedCount} average watch times derived from total watch time.`);
if (!PROMOTED) console.log('  Rows left unmarked: set promoted=yes on any boosted reel before trusting benchmarks.');
console.log('\nNext: node .claude/skills/instagram-reach/scripts/analyze.mjs');
