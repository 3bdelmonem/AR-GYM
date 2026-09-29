// Encode build/encode-plan.json → public/videos/<slug>.mp4 + public/videos/posters/<slug>.jpg,
// then write src/videos.json (slug → bytes, w, h, duration) for the app.
// Usage: node scripts/encode-videos.mjs [--crf-exercises 30] [--jobs 3] [--force]
// Resumable: an output is skipped when build/encoded.json records the same source sha + crf.
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const CRF_EX = Number(arg('--crf-exercises', 28));
const JOBS = Number(arg('--jobs', 3));
const FORCE = process.argv.includes('--force');

const RAW = 'videos-raw';
const OUT = 'public/videos';
mkdirSync(`${OUT}/posters`, { recursive: true });

const plan = JSON.parse(readFileSync('build/encode-plan.json', 'utf8'));
const doneLog = existsSync('build/encoded.json') ? JSON.parse(readFileSync('build/encoded.json', 'utf8')) : {};
/* from scripts/scan-damage.mjs: sources that stop decoding part-way are cut 1 s before the damage */
const damage = existsSync('build/damage.json') ? JSON.parse(readFileSync('build/damage.json', 'utf8')) : {};
const cutAt = (slug) => (damage[slug] && damage[slug].firstError != null ? Math.max(1, Math.floor(damage[slug].firstError - 1)) : null);

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err = (err + d).slice(-4000); });
    p.on('close', (code) => (code === 0 ? res() : rej(new Error(`${cmd} exited ${code}\n${err}`))));
  });
}

/* Input-side fallbacks for damaged sources. ffmpeg's native AAC decoder re-reads the
   channel config from corrupt frames (e.g. "41 channels"), which kills the audio
   filter graph; AudioToolbox keeps the stream's declared layout and skips bad frames. */
const FALLBACKS = [
  { name: 'standard', input: [] },
  { name: 'tolerant (AudioToolbox AAC decoder, ignore decode errors)', input: ['-err_detect', 'ignore_err', '-c:a', 'aac_at'] },
  { name: 'tolerant (no filter re-init)', input: ['-err_detect', 'ignore_err', '-reinit_filter', '0'] },
];

async function encode(item) {
  const crf = item.intro ? 30 : CRF_EX;
  const out = `${OUT}/${item.slug}.mp4`;
  const poster = `${OUT}/posters/${item.slug}.jpg`;
  const cut = cutAt(item.slug);
  const prev = doneLog[item.slug];
  if (!FORCE && prev && prev.sha === item.sha && prev.crf === crf && (prev.cut ?? null) === cut && existsSync(out) && existsSync(poster)) return 'skip';
  const tmp = `${OUT}/.tmp-${item.slug}.mp4`;
  const audio = item.hasAudio ? ['-c:a', 'aac', '-b:a', '64k', '-ac', '1'] : ['-an'];
  const trim = cut != null ? ['-t', String(cut)] : [];
  let used = null, lastErr = null;
  for (const fb of FALLBACKS) {
    try {
      await run('ffmpeg', ['-y', '-v', 'error', ...fb.input, ...trim, '-i', `${RAW}/${item.src}`,
        '-vf', "scale='if(gt(iw,ih),-2,min(720,iw))':'if(gt(iw,ih),min(720,ih),-2)'",
        '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', String(crf), '-preset', 'slow',
        ...audio, '-movflags', '+faststart',
        '-map_metadata', '-1', '-map_metadata:s:v', '-1', '-map_metadata:s:a', '-1', '-map_chapters', '-1',
        '-f', 'mp4', tmp]);
      used = fb.name;
      break;
    } catch (e) {
      lastErr = e;
      console.log(`  ${item.slug}: ${fb.name} encode failed — ${e.message.split('\n').filter(Boolean).slice(-2).join(' | ')}`);
    }
  }
  if (!used) throw lastErr;
  renameSync(tmp, out);
  await run('ffmpeg', ['-y', '-v', 'error', '-ss', '1', '-i', out, '-frames:v', '1', '-vf', 'scale=480:-2', '-q:v', '5', '-map_metadata', '-1', poster]);
  doneLog[item.slug] = { sha: item.sha, crf, cut, mode: used };
  writeFileSync('build/encoded.json', JSON.stringify(doneLog, null, 2));
  const note = [used !== 'standard' && `via ${used}`, cut != null && `trimmed to ${cut}s — source damaged after that`].filter(Boolean).join('; ');
  return note ? `ok, ${note}` : 'ok';
}

// longest first so the parallel workers finish together
const queue = [...plan].sort((a, b) => b.duration - a.duration);
let n = 0;
const t0 = Date.now();
const failed = [];
await Promise.all(Array.from({ length: JOBS }, async () => {
  for (let item; (item = queue.shift());) {
    let r;
    try { r = await encode(item); } catch (e) { r = 'FAILED'; failed.push({ slug: item.slug, src: item.src, error: e.message.slice(-600) }); }
    n++;
    console.log(`[${n}/${plan.length}] ${r === 'skip' ? 'skip' : r === 'FAILED' ? 'FAILED' : `done${r === 'ok' ? '' : ` (${r.slice(4)})`}`} ${item.slug} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
}));
writeFileSync('build/encode-failures.json', JSON.stringify(failed, null, 2));
if (failed.length) console.log(`FAILED: ${failed.map((f) => f.slug).join(', ')} — see build/encode-failures.json`);

// manifest for the app (only files that exist)
const videos = {};
for (const item of plan) {
  if (!existsSync(`${OUT}/${item.slug}.mp4`) || failed.some((f) => f.slug === item.slug)) continue;
  const file = `${OUT}/${item.slug}.mp4`;
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', '-select_streams', 'v:0', file]).toString());
  videos[item.slug] = { bytes: statSync(file).size, w: j.streams[0].width, h: j.streams[0].height, dur: Math.round(Number(j.format.duration)) };
}
writeFileSync('src/videos.json', JSON.stringify(videos, null, 2) + '\n');

const mb = (b) => (b / 1e6).toFixed(1);
const ex = plan.filter((p) => !p.intro && videos[p.slug]).reduce((a, p) => a + videos[p.slug].bytes, 0);
const intro = plan.filter((p) => p.intro && videos[p.slug]).reduce((a, p) => a + videos[p.slug].bytes, 0);
console.log(`exercise videos: ${mb(ex)} MB (crf ${CRF_EX}) · intro: ${mb(intro)} MB`);
