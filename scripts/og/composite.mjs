// Writes the photon composite used by the Open Graph card.
// node scripts/og/composite.mjs <out.png> <cols> <rows> <factor> [exposure] [split]
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { renderComposite, PHOTON_SEED } from '../../src/lib/photon/index.ts';
import { encodePng, upscale } from '../../src/lib/photon/png.ts';

const [out, cols, rows, factor, exposure = '0.5', split = '0.5'] = process.argv.slice(2);
const c = Number(cols);
const r = Number(rows);
const f = Number(factor);
const rgba = renderComposite({ cols: c, rows: r, seed: PHOTON_SEED, exposure: Number(exposure), split: Number(split) });
const big = upscale(rgba, c, r, f);
writeFileSync(out, encodePng(big, c * f, r * f, (d) => deflateSync(d, { level: 9 })));
console.log('wrote', out, c * f, 'x', r * f);
