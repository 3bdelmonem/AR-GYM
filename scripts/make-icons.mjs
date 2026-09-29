// Logo + icons. Uses ./brand/logo.(svg|png) when present, otherwise draws the
// AR GYM wordmark from Barlow Condensed 800 italic (glyphs → SVG paths, so the
// rasteriser needs no installed fonts).
// Writes public/logo.svg, public/favicon.svg, public/favicon.ico and public/icons/*.png.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import opentype from 'opentype.js';

const BG = '#14100E', INK = '#F4ECE6', ACCENT = '#F0551F', HOT = 'rgba(240,85,31,.42)';
mkdirSync('public/icons', { recursive: true });

const fontFile = (w) => readFileSync(`node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-${w}-italic.woff`);
const toAB = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
const F800 = opentype.parse(toAB(fontFile(800)));
const F700 = opentype.parse(toAB(fontFile(700)));

/* opentype's own toPathData() rounds some coordinates to NaN, so serialise the commands here */
const n2 = (v) => String(Math.round(v * 100) / 100);
function pathData(p) {
  return p.commands.map((c) => c.type === 'Z' ? 'Z'
    : c.type === 'Q' ? `Q${n2(c.x1)} ${n2(c.y1)} ${n2(c.x)} ${n2(c.y)}`
    : c.type === 'C' ? `C${n2(c.x1)} ${n2(c.y1)} ${n2(c.x2)} ${n2(c.y2)} ${n2(c.x)} ${n2(c.y)}`
    : `${c.type}${n2(c.x)} ${n2(c.y)}`).join('');
}

/* text → {d, x1,y1,x2,y2} with optional tracking (em) */
function glyphs(font, text, size, tracking = 0) {
  let x = 0; const parts = [];
  for (const ch of text) {
    const p = font.getPath(ch, x, 0, size);
    parts.push(p);
    x += font.getAdvanceWidth(ch, size) + tracking * size;
  }
  const d = parts.map(pathData).join('');
  const bb = parts.map((p) => p.getBoundingBox()).reduce((a, b) => ({
    x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1), x2: Math.max(a.x2, b.x2), y2: Math.max(a.y2, b.y2),
  }));
  return { d, ...bb, w: bb.x2 - bb.x1, h: bb.y2 - bb.y1 };
}
/* place a glyph run so its ink box starts at (x, top) */
const at = (g, x, top, fill) => `<path fill="${fill}" transform="translate(${(x - g.x1).toFixed(2)} ${(top - g.y1).toFixed(2)})" d="${g.d}"/>`;

/* Stacked mark: big “AR” with the accent slash, “GYM” tracked out beneath. Returns svg body
   centred on (cx, cy) fitting a box of width `w`. */
function mark(cx, cy, w) {
  const ar = glyphs(F800, 'AR', 100), sl = glyphs(F800, '/', 100), gym = glyphs(F700, 'GYM', 100, 0.16);
  const gap = 4;                                         // AR ↔ slash, in font units at size 100
  const rowW = ar.w + gap + sl.w;
  const k = w / rowW;                                    // scale so the top row spans w
  const gymK = (rowW * 0.98) / gym.w * k;                // GYM row matches the top row width
  const vgap = 16 * k;
  const H = ar.h * k + vgap + gym.h * gymK;
  const x0 = cx - (rowW * k) / 2, y0 = cy - H / 2;
  const s = (g, x, y, sc, fill) => `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${sc.toFixed(4)})">${at(g, 0, 0, fill)}</g>`;
  return s(ar, x0, y0, k, INK) +
         s(sl, x0 + (ar.w + gap) * k, y0 + (ar.h - sl.h) * k / 2, k, ACCENT) +
         s(gym, cx - (gym.w * gymK) / 2, y0 + ar.h * k + vgap, gymK, ACCENT);
}

const glow = (id) => `<radialGradient id="${id}" cx="78%" cy="-8%" r="95%"><stop offset="0" stop-color="${ACCENT}" stop-opacity=".22"/><stop offset=".62" stop-color="${ACCENT}" stop-opacity="0"/></radialGradient>`;

/* full-bleed square icon; pad = fraction of the side kept clear around the mark */
function iconSvg(size, { pad, frame }) {
  const S = size, c = S / 2, markW = S * (1 - 2 * pad);
  const inset = S * 0.085, cut = S * 0.11;
  const fr = frame
    ? `<path d="M${inset} ${inset}H${S - inset - cut}L${S - inset} ${inset + cut}V${S - inset}H${inset}Z" fill="none" stroke="${HOT}" stroke-width="${(S * 0.008).toFixed(2)}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">` +
    `<defs>${glow('g')}</defs><rect width="${S}" height="${S}" fill="${BG}"/><rect width="${S}" height="${S}" fill="url(#g)"/>` +
    fr + mark(c, c, markW) + `</svg>`;
}

/* horizontal wordmark AR/GYM, as in the header */
function wordmarkSvg() {
  const a = glyphs(F800, 'AR', 100), s = glyphs(F800, '/', 100), g = glyphs(F800, 'GYM', 100);
  const gap = 3, W = a.w + gap + s.w + gap + g.w, H = Math.max(a.h, g.h);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" role="img" aria-label="AR GYM">` +
    at(a, 0, H - a.h, INK) + at(s, a.w + gap, (H - s.h) / 2, ACCENT) + at(g, a.w + gap + s.w + gap, H - g.h, INK) + `</svg>`;
}

/* small favicon: “AR” + slash only, legible at 16–32px */
function faviconSvg() {
  const a = glyphs(F800, 'AR', 100), s = glyphs(F800, '/', 100);
  const S = 64, gap = 3, W = a.w + gap + s.w, k = (S * 0.8) / W;
  const x0 = (S - W * k) / 2, y0 = (S - a.h * k) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}"><rect width="${S}" height="${S}" rx="12" fill="${BG}"/>` +
    `<g transform="translate(${x0.toFixed(2)} ${y0.toFixed(2)}) scale(${k.toFixed(4)})">${at(a, 0, 0, INK)}${at(s, a.w + gap, (a.h - s.h) / 2, ACCENT)}</g></svg>`;
}

/* ICO container holding PNG images (Vista+ format) */
function ico(pngs) {
  const head = Buffer.alloc(6 + 16 * pngs.length);
  head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(pngs.length, 4);
  let off = head.length;
  pngs.forEach(({ size, buf }, i) => {
    const o = 6 + 16 * i;
    head.writeUInt8(size >= 256 ? 0 : size, o); head.writeUInt8(size >= 256 ? 0 : size, o + 1);
    head.writeUInt16LE(1, o + 4); head.writeUInt16LE(32, o + 6);
    head.writeUInt32LE(buf.length, o + 8); head.writeUInt32LE(off, o + 12);
    off += buf.length;
  });
  return Buffer.concat([head, ...pngs.map((p) => p.buf)]);
}

const brand = ['brand/logo.svg', 'brand/logo.png'].find(existsSync);
const png = (svgOrFile, size) => sharp(typeof svgOrFile === 'string' && svgOrFile.startsWith('<') ? Buffer.from(svgOrFile) : svgOrFile, { density: 300 })
  .resize(size, size, { fit: 'contain', background: BG }).flatten({ background: BG }).png({ compressionLevel: 9 }).toBuffer();

if (brand) {
  console.log(`using ${brand}`);
  const src = readFileSync(brand);
  if (brand.endsWith('.svg')) writeFileSync('public/logo.svg', src);
  for (const [f, s] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) writeFileSync(`public/icons/${f}`, await png(src, s));
  const inner = await png(src, 330);
  writeFileSync('public/icons/maskable-512.png', await sharp({ create: { width: 512, height: 512, channels: 4, background: BG } })
    .composite([{ input: inner, gravity: 'center' }]).png().toBuffer());
  writeFileSync('public/favicon.svg', brand.endsWith('.svg') ? src : Buffer.from(faviconSvg()));
} else {
  writeFileSync('public/logo.svg', wordmarkSvg());
  writeFileSync('public/favicon.svg', faviconSvg());
  writeFileSync('public/icons/icon-512.png', await png(iconSvg(512, { pad: 0.2, frame: true }), 512));
  writeFileSync('public/icons/icon-192.png', await png(iconSvg(512, { pad: 0.2, frame: true }), 192));
  writeFileSync('public/icons/apple-touch-icon.png', await png(iconSvg(512, { pad: 0.2, frame: true }), 180));
  // maskable: mark kept inside the 80% safe circle, no frame (the mask would clip it)
  writeFileSync('public/icons/maskable-512.png', await png(iconSvg(512, { pad: 0.26, frame: false }), 512));
}
const fav = readFileSync('public/favicon.svg', 'utf8');
writeFileSync('public/favicon.ico', ico(await Promise.all([16, 32, 48].map(async (s) => ({ size: s, buf: await png(fav, s) })))));
console.log('icons written');
