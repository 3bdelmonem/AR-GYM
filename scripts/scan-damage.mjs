// Decode every planned source once and record where it first fails to decode.
// Writes build/damage.json: { slug: { firstError: seconds|null, duration } }.
// The encoder trims damaged sources just before that point.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const plan = JSON.parse(readFileSync('build/encode-plan.json', 'utf8'));
const JOBS = 6;

/* -xerror stops at the first decode error; -progress tells us how far it got */
function scan(item) {
  return new Promise((res) => {
    const p = spawn('ffmpeg', ['-v', 'error', '-xerror', '-nostdin', '-i', `videos-raw/${item.src}`,
      '-f', 'null', '-', '-progress', 'pipe:1', '-stats_period', '0.25']);
    let last = 0, err = '';
    p.stdout.on('data', (d) => {
      for (const m of String(d).matchAll(/out_time_us=(\d+)/g)) last = Number(m[1]) / 1e6;
    });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => res({ firstError: code === 0 && !err.trim() ? null : Math.max(0, last), error: err.trim().split('\n')[0] || null }));
  });
}

const out = {};
const queue = [...plan];
await Promise.all(Array.from({ length: JOBS }, async () => {
  for (let item; (item = queue.shift());) {
    const r = await scan(item);
    out[item.slug] = { src: item.src, duration: item.duration, ...r };
    console.log(`${item.slug}: ${r.firstError == null ? 'clean' : `first decode error at ${r.firstError.toFixed(1)}s of ${item.duration}s — ${r.error}`}`);
  }
}));
writeFileSync('build/damage.json', JSON.stringify(out, null, 2));
