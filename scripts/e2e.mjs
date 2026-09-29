// End-to-end offline check against `vite preview` (run `npm run build` first).
// Usage: node scripts/e2e.mjs [--shots <dir>]
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const PORT = 4173, BASE = `http://localhost:${PORT}`;
const shotsDir = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
if (shotsDir) mkdirSync(shotsDir, { recursive: true });
const VIDEOS = JSON.parse(readFileSync('src/videos.json', 'utf8'));

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`); };

/* ── server ── */
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error('preview did not start')), 30000);
  const on = (d) => { if (String(d).includes(String(PORT))) { clearTimeout(to); res(); } };
  server.stdout.on('data', on); server.stderr.on('data', on);
});

/* Playwright's bundled Chromium has no H.264/AAC; use installed Chrome for playback when present. */
let browser, channel = 'chromium';
try { browser = await chromium.launch({ channel: 'chrome' }); channel = 'chrome'; }
catch { browser = await chromium.launch(); }

const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, acceptDownloads: true });
const external = [];
context.on('request', (r) => { const u = r.url(); if (!u.startsWith(BASE) && !/^(data|blob):/.test(u)) external.push(u); });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const shot = async (name) => { if (shotsDir) await page.screenshot({ path: `${shotsDir}/${name}.png`, fullPage: false }); };

try {
  /* 1 — install: load, wait for SW control, reload */
  await page.goto(BASE);
  await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 30000 });
  check('service worker controls the page', true, channel);
  await page.reload();
  await page.waitForSelector('.hero');
  check('brand header', (await page.textContent('.brand b')) === 'AR/GYM');
  await shot('01-today');

  /* 2 — download day 1 from the Guide (online) */
  await page.click('[data-v="guide"]');
  await page.waitForSelector('#offline [data-dl="d1"]');
  await shot('02-guide-offline');
  await page.click('#offline [data-dl="d1"]');
  await page.waitForFunction(() => {
    const row = [...document.querySelectorAll('#offline .split-row')].find((r) => r.querySelector('.nm')?.textContent === 'day 1');
    return row && row.querySelector('.vid.off');
  }, null, { timeout: 120000 });
  const d1 = await page.evaluate(async () => (await (await caches.open('videos-v1')).keys()).map((r) => new URL(r.url).pathname));
  check('“Download this day” caches day 1 videos', d1.length >= 8, `${d1.length} files in videos-v1`);
  await shot('03-guide-day1-downloaded');

  /* 3 — SW background fill: a Range request for an uncached video goes to the network (206) and a full copy lands in the cache */
  const bg = 'rdls';
  const r1 = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Range: 'bytes=0-1023' } }); await r.arrayBuffer(); return r.status; }, `/videos/${bg}.mp4`);
  const filled = await page.waitForFunction(async (u) => !!(await (await caches.open('videos-v1')).match(u)), `/videos/${bg}.mp4`, { timeout: 60000, polling: 500 }).then(() => true, () => false);
  check('uncached video: passes through, then cached in background', r1 === 206 && filled, `network status ${r1}`);

  /* 4 — offline */
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('.hero', { timeout: 15000 });
  check('offline reload renders the app', await page.isVisible('.hero'));

  for (const [tab, sel] of [['guide', '#offline'], ['history', '.bk'], ['today', '.hero']]) {
    await page.click(`[data-v="${tab}"]`);
    check(`offline: ${tab} tab works`, await page.isVisible(sel));
  }

  /* 5 — log a set, reload, still there */
  await page.click('[data-a="start"]');
  await page.waitForSelector('.exlist');
  await page.fill('#f-s0-0-kg', '42.5');
  await page.click('button.tick[data-x="0"][data-p="s"][data-j="0"]');
  await shot('04-workout');
  await page.reload();
  await page.waitForSelector('.exlist');
  const kept = await page.evaluate(() => ({ kg: document.querySelector('#f-s0-0-kg').value, r: document.querySelector('#f-s0-0-r').value,
    ticked: document.querySelector('button.tick[data-x="0"][data-p="s"][data-j="0"]').getAttribute('aria-pressed') }));
  check('logged set survives an offline reload', kept.kg === '42.5' && kept.ticked === 'true', JSON.stringify(kept));

  /* 6 — cached video plays offline, Range → 206 */
  const slug = 'cable-y-raises';
  const size = VIDEOS[slug].bytes;
  const rr = await page.evaluate(async (u) => {
    const r = await fetch(u, { headers: { Range: 'bytes=100-199' } });
    const b = await r.arrayBuffer();
    return { status: r.status, cr: r.headers.get('Content-Range'), cl: r.headers.get('Content-Length'), ct: r.headers.get('Content-Type'), ar: r.headers.get('Accept-Ranges'), len: b.byteLength };
  }, `/videos/${slug}.mp4`);
  check('offline Range request → 206 from cache', rr.status === 206 && rr.cr === `bytes 100-199/${size}` && rr.cl === '100' && rr.len === 100 && rr.ct === 'video/mp4' && rr.ar === 'bytes', JSON.stringify(rr));
  const tail = await page.evaluate(async (u) => { const r = await fetch(u, { headers: { Range: 'bytes=-50' } }); return { s: r.status, cr: r.headers.get('Content-Range'), len: (await r.arrayBuffer()).byteLength }; }, `/videos/${slug}.mp4`);
  check('offline suffix Range → 206', tail.s === 206 && tail.len === 50 && tail.cr === `bytes ${size - 50}-${size - 1}/${size}`, JSON.stringify(tail));

  const vidBtn = await page.$(`.vid[data-slug="${slug}"]`);
  check('✓ shown on cached exercise video button', vidBtn && (await vidBtn.$('.okc')) !== null);
  const canH264 = await page.evaluate(() => document.createElement('video').canPlayType('video/mp4; codecs="avc1.640028, mp4a.40.2"'));
  await vidBtn.click();
  const play = await page.evaluate(() => new Promise((res) => {
    const v = document.querySelector('.player video');
    if (!v) return res({ err: 'no video element' });
    v.muted = true;
    const done = (x) => res({ ...x, t: v.currentTime, rs: v.readyState, err: v.error && v.error.code, w: v.videoWidth, h: v.videoHeight });
    v.addEventListener('timeupdate', function f() { if (v.currentTime > 0.5) { v.removeEventListener('timeupdate', f); done({ ok: true }); } });
    v.addEventListener('error', () => done({ ok: false }));
    v.play().catch((e) => done({ ok: false, playErr: String(e) }));
    setTimeout(() => done({ ok: false, timeout: true }), 15000);
  }));
  if (canH264) check('downloaded video plays offline', play.ok, JSON.stringify(play));
  else check('downloaded video metadata loads offline (browser lacks H.264, playback not testable)', play.w > 0 || play.rs > 0, JSON.stringify(play));
  await shot('05-player-offline');

  /* 7 — every day-1 exercise has a demo button with the ✓ */
  await page.click(`.vid[data-slug="${slug}"]`); // close the player
  const marks = await page.$$eval('.vid[data-slug]', (bs) => bs.map((b) => !!b.querySelector('.okc')));
  check('offline: all 8 day-1 demo buttons show ✓', marks.length === 8 && marks.every(Boolean), JSON.stringify(marks));

  /* 8 — finish workout, export + import backup */
  await page.click('[data-a="finish"]');
  await page.waitForSelector('.modal');
  await page.click('.modal .x');
  await page.click('[data-v="history"]');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-a="export"]')]);
  const path = await dl.path();
  const backup = JSON.parse(readFileSync(path, 'utf8'));
  check('export backup downloads JSON', backup.format === 'argym-backup' && backup.state.sessions.length === 1, dl.suggestedFilename());
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('[data-v="history"]');
  await page.setInputFiles('#importf', path);
  await page.waitForSelector('.modal');
  const imported = await page.evaluate(() => JSON.parse(localStorage.getItem('argym_v1')).sessions.length);
  check('import backup restores history', imported === 1, `${imported} session(s)`);
  await page.click('.modal .x');
  await shot('06-history');

  /* 9 — Arabic / RTL */
  await page.click('#lang [data-l="ar"]');
  check('Arabic switches to RTL', (await page.getAttribute('body', 'dir')) === 'rtl');
  await page.click('[data-v="guide"]');
  await shot('07-guide-ar');
  await page.click('#lang [data-l="en"]');

  check('no requests to external hosts', external.length === 0, external.slice(0, 5).join(', '));
  check('no uncaught page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (e) {
  check('e2e run', false, e.stack || String(e));
} finally {
  await browser.close();
  server.kill();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
