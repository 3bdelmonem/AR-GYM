// Probe every file under videos-raw/ → build/inventory.json
// (path, duration, resolution, codecs, has-audio, size, sha256). Read-only on the raw folder.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAW = 'videos-raw';

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = join(dir, d.name);
    if (d.isDirectory()) return walk(p);
    return /\.(mp4|mov|m4v|mkv|webm)$/i.test(d.name) ? [p] : [];
  });
}

function sha256(file) {
  return new Promise((res, rej) => {
    const h = createHash('sha256');
    createReadStream(file).on('data', (c) => h.update(c)).on('end', () => res(h.digest('hex'))).on('error', rej);
  });
}

function probe(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
  const j = JSON.parse(out.toString());
  const v = j.streams.find((s) => s.codec_type === 'video');
  const a = j.streams.find((s) => s.codec_type === 'audio');
  const rot = Number(v?.side_data_list?.find((s) => s.rotation != null)?.rotation ?? v?.tags?.rotate ?? 0);
  return {
    duration: Number(Number(j.format.duration).toFixed(2)),
    width: v?.width ?? null,
    height: v?.height ?? null,
    rotation: rot,
    videoCodec: v?.codec_name ?? null,
    audioCodec: a?.codec_name ?? null,
    hasAudio: !!a,
  };
}

const files = walk(RAW).sort();
const inv = [];
for (const f of files) {
  inv.push({ path: relative(RAW, f), size: statSync(f).size, ...probe(f), sha256: await sha256(f) });
  process.stdout.write('.');
}
mkdirSync('build', { recursive: true });
writeFileSync('build/inventory.json', JSON.stringify(inv, null, 2));
console.log(`\n${inv.length} files`);
