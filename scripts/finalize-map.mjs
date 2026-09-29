// After encoding: add output sizes / crf / trims to video-map.json and print the numbers for REPORT.md.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const read = (f, d) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d);
const map = read('video-map.json');
const videos = read('src/videos.json', {});
const encoded = read('build/encoded.json', {});
const damage = read('build/damage.json', {});
const inv = read('build/inventory.json', []);
const mb = (b) => Math.round(b / 1e5) / 10;
const slugOf = (out) => out && out.replace(/^videos\//, '').replace(/\.mp4$/, '');

function enrich(e) {
  const s = slugOf(e.output);
  if (!s) return e;
  const v = videos[s], enc = encoded[s], dmg = damage[s];
  return {
    ...e,
    outputMB: v ? mb(v.bytes) : null,
    outputSeconds: v ? v.dur : null,
    crf: enc ? enc.crf : null,
    ...(enc && enc.cut != null ? { trimmedToSeconds: enc.cut, note: `source fails to decode from ${dmg.firstError}s (of ${dmg.duration}s); kept the clean first ${enc.cut}s` } : {}),
  };
}
map.intro = map.intro && enrich(map.intro);
map.exercises = map.exercises.map(enrich);

const files = Object.keys(videos);
const exFiles = files.filter((s) => s !== 'split-breakdown');
function du(dir) {
  return readdirSync(dir, { withFileTypes: true }).reduce((a, d) => a + (d.isDirectory() ? du(join(dir, d.name)) : statSync(join(dir, d.name)).size), 0);
}
map.totals = {
  rawFiles: inv.length,
  rawMB: mb(inv.reduce((a, f) => a + f.size, 0)),
  rawExerciseMB: mb(inv.filter((f) => f.path.includes('/')).reduce((a, f) => a + f.size, 0)),
  outputFiles: files.length,
  outputMB: mb(files.reduce((a, s) => a + videos[s].bytes, 0)),
  exerciseFiles: exFiles.length,
  exerciseMB: mb(exFiles.reduce((a, s) => a + videos[s].bytes, 0)),
  introMB: videos['split-breakdown'] ? mb(videos['split-breakdown'].bytes) : null,
  duplicatesDropped: map.duplicatesDropped.length,
  distMB: existsSync('dist') ? mb(du('dist')) : null,
  distWithoutVideosMB: existsSync('dist') ? mb(du('dist') - (existsSync('dist/videos') ? du('dist/videos') : 0)) : null,
  postersKB: existsSync('dist/videos/posters') ? Math.round(du('dist/videos/posters') / 1e3) : null,
};
writeFileSync('video-map.json', JSON.stringify(map, null, 2) + '\n');
console.log(JSON.stringify(map.totals, null, 2));
