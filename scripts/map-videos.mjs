// Map raw files → exercises, dedupe, and write:
//   build/encode-plan.json  (one entry per output file)
//   video-map.json          (exercise → output file → source path)
// Reads build/inventory.json (run scripts/inventory.mjs first).
import { readFileSync, writeFileSync } from 'node:fs';
import { DAYS, INTRO } from '../src/data.js';

const inv = JSON.parse(readFileSync('build/inventory.json', 'utf8'));

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
// ignore case, numbers, punctuation (keeps Arabic letters)
const norm = (s) => s.toLowerCase().replace(/[0-9٠-٩]+/g, ' ')
  .replace(/[^\p{L}]+/gu, ' ').trim().replace(/\s+/g, ' ');

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const sim = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length, 1);

const flags = [];
const assigned = []; // {day, idx, name, slug, file}

// ── intro: the long root-level video
const rootFiles = inv.filter((f) => !f.path.includes('/'));
const intro = rootFiles.sort((a, b) => b.duration - a.duration)[0];
if (!intro) flags.push('No root-level intro video found');
rootFiles.filter((f) => f !== intro).forEach((f) => flags.push(`Unused root-level file: ${f.path}`));

// ── per-day matching
for (const [dk, day] of Object.entries(DAYS)) {
  const folder = `Day ${dk.slice(1).padStart(2, '0')}/`;
  const files = inv.filter((f) => f.path.startsWith(folder)).sort((a, b) => a.path.localeCompare(b.path, 'en', { numeric: true }));
  const pairs = [];
  day.ex.forEach((e, i) => files.forEach((f) => pairs.push({ i, f, s: sim(norm(e.n), norm(f.path.slice(folder.length).replace(/\.[^.]+$/, ''))) })));
  pairs.sort((a, b) => b.s - a.s);
  const usedEx = new Set(), usedF = new Set(), match = {};
  for (const p of pairs) {
    if (p.s < 0.6 || usedEx.has(p.i) || usedF.has(p.f)) continue;
    usedEx.add(p.i); usedF.add(p.f); match[p.i] = { f: p.f, s: p.s, how: p.s === 1 ? 'exact name' : 'fuzzy name' };
  }
  // fallback: numeric prefix / folder order for whatever is left
  const leftF = files.filter((f) => !usedF.has(f));
  day.ex.forEach((e, i) => {
    if (match[i] || !leftF.length) return;
    const byPrefix = leftF.find((f) => parseInt(f.path.slice(folder.length), 10) === i + 1);
    const f = byPrefix || leftF[0];
    leftF.splice(leftF.indexOf(f), 1);
    match[i] = { f, s: 0, how: byPrefix ? 'numeric prefix' : 'folder order' };
  });
  leftF.forEach((f) => flags.push(`Unmatched file: ${f.path}`));
  day.ex.forEach((e, i) => {
    const m = match[i];
    if (!m) { assigned.push({ day: dk, idx: i, name: e.n, slug: null, file: null }); return; }
    if (m.s < 1) flags.push(`Uncertain match (${m.how}${m.s ? `, similarity ${m.s.toFixed(2)}` : ''}): ${dk} “${e.n}” ← ${m.f.path}`);
    assigned.push({ day: dk, idx: i, name: e.n, slug: slugify(e.n), file: m.f, how: m.how });
  });
}

// ── dedupe: same sha → one file; same name → shared if durations within 10%, else per-day files
const outputs = new Map(); // slug → {slug, src, sha, crf, hasAudio, users:[]}
const dropped = [];
for (const a of assigned.filter((x) => x.file)) {
  let slug = a.slug;
  const prev = outputs.get(slug);
  if (prev) {
    const same = prev.sha === a.file.sha256;
    const close = Math.abs(prev.duration - a.file.duration) / Math.max(prev.duration, a.file.duration) <= 0.1;
    if (same || close) {
      prev.users.push(a);
      dropped.push({ path: a.file.path, keptAs: slug, reason: same ? 'identical sha256' : 'same exercise, duration within 10%' });
      if (!same) flags.push(`Shared “${a.name}” across days by duration only: ${a.file.path} dropped in favour of ${prev.src}`);
      a.slug = slug;
      continue;
    }
    slug = `${slug}-${a.day}`;
    flags.push(`Different videos for “${a.name}” on different days; ${a.day} uses ${slug}.mp4`);
  }
  // identical content under a different exercise name → reuse that file
  const twin = [...outputs.values()].find((o) => o.sha === a.file.sha256);
  if (twin) {
    twin.users.push(a); a.slug = twin.slug;
    dropped.push({ path: a.file.path, keptAs: twin.slug, reason: 'identical sha256' });
    flags.push(`“${a.name}” (${a.file.path}) is byte-identical to ${twin.src}; sharing ${twin.slug}.mp4`);
    continue;
  }
  a.slug = slug;
  outputs.set(slug, { slug, src: a.file.path, sha: a.file.sha256, duration: a.file.duration, hasAudio: a.file.hasAudio, crf: 28, users: [a] });
}

// ── data.js must agree with the mapping
for (const a of assigned) {
  const v = DAYS[a.day].ex[a.idx].v ?? null;
  if (v !== a.slug) flags.push(`src/data.js mismatch: ${a.day} “${a.name}” has v=${v}, mapping says ${a.slug}`);
}

const plan = [...outputs.values()].map(({ users, ...o }) => o);
if (intro) plan.push({ slug: INTRO, src: intro.path, sha: intro.sha256, duration: intro.duration, hasAudio: intro.hasAudio, crf: 30, intro: true });
writeFileSync('build/encode-plan.json', JSON.stringify(plan, null, 2));

const map = {
  intro: intro ? { output: `videos/${INTRO}.mp4`, source: intro.path } : null,
  exercises: assigned.map((a) => ({
    day: a.day, index: a.idx + 1, exercise: a.name,
    output: a.slug ? `videos/${a.slug}.mp4` : null,
    source: a.file ? a.file.path : null,
    match: a.how ?? 'none',
  })),
  duplicatesDropped: dropped,
  flags,
};
writeFileSync('video-map.json', JSON.stringify(map, null, 2));

console.log(`${assigned.filter((a) => a.file).length}/${assigned.length} exercises matched, ${outputs.size} unique exercise files + ${intro ? 1 : 0} intro, ${dropped.length} duplicates dropped`);
flags.forEach((f) => console.log('FLAG ' + f));
