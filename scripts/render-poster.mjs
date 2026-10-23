// Render the photon figure's no-JavaScript posters into public/photon/.
// Usage: node scripts/render-poster.mjs (Node 22.18 or later runs the
// TypeScript sources directly). One pixel per cell; the page scales them up
// with nearest-neighbor sampling. Same seed and grid as the live figure at
// exposure 0.5, with the divider at 50%.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { DEFAULT_PALETTE, renderComposite } from '../src/lib/photon/index.ts';
import { encodePng } from '../src/lib/photon/png.ts';

const root = new URL('..', import.meta.url);
const tokens = readFileSync(new URL('src/styles/tokens.css', root), 'utf8');

/** First declaration of a token in tokens.css (the light scheme), as RGB. */
function token(name, fallback) {
  const match = new RegExp(`--${name}:\\s*#([0-9a-f]{6})`, 'i').exec(tokens);
  if (!match) return fallback;
  const n = parseInt(match[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

const palette = {
  mg: token('mg', DEFAULT_PALETTE.mg),
  si: token('si', DEFAULT_PALETTE.si),
  fe: token('fe', DEFAULT_PALETTE.fe),
  vacuum: token('vacuum', DEFAULT_PALETTE.vacuum),
};

// Grids match the live figure: 4 px cells for a 1240 px wide figure from
// 48rem up, 3 px cells on a 390 px phone.
const posters = [
  { file: 'poster-12x5.png', cols: 310, rows: 130 },
  { file: 'poster-16x9.png', cols: 256, rows: 144 },
  { file: 'poster-4x3.png', cols: 120, rows: 90 },
];

const out = new URL('public/photon/', root);
mkdirSync(out, { recursive: true });
for (const { file, cols, rows } of posters) {
  const rgba = renderComposite({ cols, rows, exposure: 0.5, split: 0.5, palette });
  const png = encodePng(rgba, cols, rows, (data) => deflateSync(data, { level: 9 }));
  writeFileSync(new URL(file, out), png);
  console.log(`${file}: ${cols} x ${rows}, ${(png.length / 1024).toFixed(1)} KB`);
}
