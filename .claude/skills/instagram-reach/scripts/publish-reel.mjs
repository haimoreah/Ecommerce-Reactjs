#!/usr/bin/env node
// Publish a Reel through the Instagram Content Publishing API.
//
//   export IG_ACCESS_TOKEN='...'
//   node publish-reel.mjs --video-url https://host/reel.mp4 --caption "..." [--confirm]
//
// Instagram DOWNLOADS the video from a public HTTPS URL; there is no file
// upload. Host the file somewhere publicly reachable first.
//
// Publishing is irreversible and public, so nothing is published without
// --confirm. Without it the script builds and validates the container, then
// stops and shows you exactly what would go out.

const API = 'https://graph.instagram.com/v22.0';
const TOKEN = process.env.IG_ACCESS_TOKEN;

const arg = n => { const i = process.argv.indexOf(n); return i === -1 ? null : process.argv[i + 1]; };
const VIDEO = arg('--video-url');
const CAPTION = arg('--caption') ?? '';
const SHARE_FB = process.argv.includes('--share-to-feed');
const CONFIRM = process.argv.includes('--confirm');

if (!TOKEN) { console.error("✗ IG_ACCESS_TOKEN not set.\n  export IG_ACCESS_TOKEN='...'"); process.exit(1); }
if (!VIDEO || !/^https:\/\//i.test(VIDEO)) {
  console.error('✗ --video-url must be a public HTTPS URL.\n');
  console.error('  Instagram fetches the file itself — a local path or http:// will not work.');
  console.error('  Verify it first:  curl -I "<url>"   → expect 200 and video/mp4');
  process.exit(1);
}

async function api(path, params = {}, method = 'GET') {
  const url = new URL(`${API}/${path}`);
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const res = await fetch(method === 'GET' ? `${url}?${body}` : url, {
    method,
    ...(method === 'POST' ? { body } : {}),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${json.error.message} (code ${json.error.code})`);
  return json;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

const me = await api('me', { fields: 'id,username' });
console.log(`Account: @${me.username}\n`);

// The 24h cap is enforced at publish time, not on container creation.
try {
  const q = await api(`${me.id}/content_publishing_limit`, { fields: 'config,quota_usage' });
  const u = q.data?.[0];
  if (u) console.log(`Publishing quota used: ${u.quota_usage ?? '?'} / ${u.config?.quota_total ?? '?'} per 24h\n`);
} catch { /* not exposed on every token type */ }

console.log('Step 1/3  creating container…');
const container = await api(`${me.id}/media`, {
  media_type: 'REELS',
  video_url: VIDEO,
  caption: CAPTION,
  ...(SHARE_FB ? { share_to_feed: 'true' } : {}),
}, 'POST');
console.log(`  container ${container.id}`);

console.log('\nStep 2/3  waiting for Instagram to transcode…');
let state = '', waited = 0;
for (let i = 0; i < 40; i++) {
  const s = await api(container.id, { fields: 'status_code,status' });
  state = s.status_code;
  if (state === 'FINISHED') { console.log(`  FINISHED after ${waited}s`); break; }
  if (state === 'ERROR' || state === 'EXPIRED') {
    console.error(`\n✗ Container ${state}: ${s.status ?? 'no detail'}`);
    console.error('  Usually the source file: must be MP4/MOV, H.264 + AAC, 9:16,');
    console.error('  width >= 360px, 23-60 fps. Re-encode and try again.');
    process.exit(1);
  }
  const wait = Math.min(5 + i, 15);
  process.stdout.write(`  ${state || 'PENDING'} … ${waited}s\r`);
  await sleep(wait * 1000); waited += wait;
}
if (state !== 'FINISHED') { console.error('\n✗ Still not FINISHED. Re-run; the container stays valid ~24h.'); process.exit(1); }

if (!CONFIRM) {
  console.log('\n' + '='.repeat(58));
  console.log('DRY RUN — nothing published.');
  console.log('='.repeat(58));
  console.log(`Caption : ${CAPTION || '(empty)'}`);
  console.log(`Video   : ${VIDEO}`);
  console.log(`\nThe container is ready and stays valid ~24h. To publish it:`);
  console.log(`  node publish-reel.mjs --video-url "${VIDEO}" --caption "..." --confirm`);
  process.exit(0);
}

console.log('\nStep 3/3  publishing…');
const published = await api(`${me.id}/media_publish`, { creation_id: container.id }, 'POST');
const info = await api(published.id, { fields: 'permalink,timestamp' }).catch(() => ({}));
console.log(`\n✓ Published — id ${published.id}`);
if (info.permalink) console.log(`  ${info.permalink}`);
console.log('\nRecord it: add a row to data/reels.csv with promoted= left empty,');
console.log('and pull metrics in ~48h with fetch-ig.mjs.');
