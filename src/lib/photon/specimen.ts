/*
  A simulated chondrite section: round chondrules made of olivine and pyroxene
  crystals in glassy mesostasis (some with a thin sulfide or metal rim), a
  fine-grained matrix with gentle compositional variation, mineral fragments,
  and small Fe-Ni metal and sulfide grains.

  Geometry lives in "specimen units": the layout is 1 unit tall and at least
  2.4 wide, and the view is centered on it, so every aspect ratio shows a crop
  of the same layout with the figure's 50% line at the layout's center, where
  a large chondrule sits. A unit spans the grid height, but never fewer than
  108 cells, so small grids zoom in instead of losing the crystals. Only
  per-cell texture depends on the grid size.

  The painters take small objects of one fixed shape (or typed arrays) so the
  JIT optimizes them on the first chondrule instead of bailing out later.
*/
import { fbm, mulberry32, type Rng } from './prng.ts';

export const Phase = {
  matrix: 0,
  olivine: 1,
  pyroxene: 2,
  mesostasis: 3,
  metal: 4,
  sulfide: 5,
} as const;

/** Relative X-ray emission rates per phase: Mg, Si, Fe. */
export const PHASE_RATES: readonly (readonly [number, number, number])[] = [
  [0.21, 0.25, 0.32], // matrix: porous and volatile-rich, so a lower yield (varies by about 20%)
  [0.9, 0.5, 0.25], // olivine
  [0.55, 0.95, 0.15], // pyroxene
  [0.15, 0.6, 0.1], // mesostasis
  [0, 0.02, 1], // Fe-Ni metal
  [0, 0.02, 0.6], // sulfide
];

/* Backscattered-electron brightness grows with mean atomic number:
   metal > sulfide > matrix > olivine > pyroxene > mesostasis. */
const PHASE_BSE = [0.53, 0.43, 0.33, 0.21, 0.97, 0.8];

/** Layouts are generated over at least this width, so narrower figures show a crop. */
const LAYOUT_WIDTH = 2.4;

/** Fewest cells per specimen unit. */
const MIN_UNIT = 108;

const TAU = Math.PI * 2;

export interface Specimen {
  cols: number;
  rows: number;
  seed: number;
  /** True emission rates, interleaved per cell: Mg, Si, Fe. Never used by the reconstruction. */
  rates: Float32Array;
  /** Mean over cells of the summed rates. Exposure e means e photons per cell on average. */
  meanRate: number;
  /** Simulated backscattered-electron image, 0 to 255: the guide. */
  guide: Uint8Array;
  phase: Uint8Array;
}

interface Disk {
  x: number;
  y: number;
  r: number;
}

/** A wobbly circle, optionally with a broken rim of sulfide or metal. */
interface Outline {
  x: number;
  y: number;
  r: number;
  a2: number;
  p2: number;
  a3: number;
  p3: number;
  a5: number;
  p5: number;
  /** 0 for no rim, else the rim phase */
  rim: number;
  rimWidth: number;
  rimK: number;
  rimP: number;
  rimP2: number;
}

/** Porphyritic: crystals as Voronoi cells with mesostasis in the gaps. */
interface Porphyritic {
  /** Per crystal: x, y, cos, sin, stretch, inverse squared weight. Each crystal
      measures distance in its own stretched frame, so crystals come out prismatic. */
  seeds: Float64Array;
  seedPhase: Uint8Array;
  seedVar: Float32Array;
  gap: number;
  variation: number;
  /** Metal blebs: x, y, r */
  blebs: Float64Array;
}

/** Barred olivine: parallel olivine bars in mesostasis inside an olivine shell. */
interface Barred {
  ux: number;
  uy: number;
  /** A second domain of bars beyond a line, at another angle. */
  vx: number;
  vy: number;
  twinX: number;
  twinY: number;
  twinOffset: number;
  period: number;
  barOffset: number;
  shell: number;
  variation: number;
}

/** Radial pyroxene: fibers fanning out from a point near the edge. */
interface Radial {
  ox: number;
  oy: number;
  fibers: number;
  variation: number;
}

interface Chondrule {
  outline: Outline;
  porphyritic?: Porphyritic;
  barred?: Barred;
  radial?: Radial;
}

interface Blob extends Disk {
  phase: number;
  a2: number;
  p2: number;
  a3: number;
  p3: number;
}

interface Fragment {
  x: number;
  y: number;
  s: number;
  phase: number;
  v: number;
  /** nx, ny, distance per face */
  faces: Float64Array;
}

function placeChondrules(rng: Rng, width: number): Disk[] {
  /* A large chondrule at the center, under the figure's divider. */
  const featured = { x: width / 2 + (rng() - 0.5) * 0.08, y: 0.5 + (rng() - 0.5) * 0.08, r: 0.24 + 0.03 * rng() };
  const area = (width + 0.2) * 1.2;
  const radii: number[] = [];
  let covered = Math.PI * featured.r * featured.r;
  while (covered < 0.6 * area) {
    const r = 0.065 + 0.21 * Math.pow(rng(), 1.5);
    radii.push(r);
    covered += Math.PI * r * r;
  }
  radii.sort((a, b) => b - a);
  const placed: Disk[] = [featured];
  for (const r of radii) {
    for (let attempt = 0; attempt < 90; attempt++) {
      const x = -0.1 + rng() * (width + 0.2);
      const y = -0.1 + rng() * 1.2;
      let free = true;
      for (const c of placed) {
        const min = (r + c.r) * 1.04 + 0.012;
        if ((x - c.x) * (x - c.x) + (y - c.y) * (y - c.y) < min * min) {
          free = false;
          break;
        }
      }
      if (free) {
        placed.push({ x, y, r });
        break;
      }
    }
  }
  return placed;
}

function describeChondrule(d: Disk, rng: Rng, featured: boolean): Chondrule {
  const u = rng();
  /* The featured chondrule is porphyritic: its crystals show off sharp boundaries. */
  const kind = featured
    ? u < 0.5 ? 'po' : 'pop'
    : u < 0.32 ? 'po' : u < 0.58 ? 'pop' : u < 0.72 ? 'pp' : u < 0.87 ? 'bo' : 'rp';
  const shape = [0.07 * rng(), TAU * rng(), 0.035 * rng(), TAU * rng(), 0.015 * rng(), TAU * rng()];
  const variation = rng() * 2 - 1;
  const chondrule: Chondrule = { outline: undefined as unknown as Outline };

  if (kind === 'po' || kind === 'pop' || kind === 'pp') {
    const crystal = featured ? 0.065 + 0.02 * rng() : 0.045 + 0.04 * rng();
    const count = Math.max(4, Math.min(48, Math.round((Math.PI * d.r * d.r) / (crystal * crystal))));
    const olivine = kind === 'po' ? 0.86 : kind === 'pop' ? 0.47 : 0.06;
    const seeds = new Float64Array(count * 6);
    const seedPhase = new Uint8Array(count);
    const seedVar = new Float32Array(count);
    for (let k = 0; k < count; k++) {
      const a = TAU * rng();
      const s = d.r * 1.08 * Math.sqrt(rng());
      const o = Math.PI * rng();
      const weight = 0.75 + 0.5 * rng();
      seeds.set([d.x + s * Math.cos(a), d.y + s * Math.sin(a), Math.cos(o), Math.sin(o), 0.5 + 0.5 * rng(), 1 / (weight * weight)], k * 6);
      const p = rng();
      seedPhase[k] = p < 0.03 ? Phase.mesostasis : p < 0.03 + 0.97 * olivine ? Phase.olivine : Phase.pyroxene;
      seedVar[k] = rng() * 2 - 1;
    }
    const gap = kind === 'po' ? 0.007 + 0.005 * rng() : kind === 'pop' ? 0.006 + 0.004 * rng() : 0.005 + 0.003 * rng();
    const blebCount = rng() < 0.6 ? 1 + Math.floor(rng() * 4) : 0;
    const blebs = new Float64Array(blebCount * 3);
    for (let k = 0; k < blebCount; k++) {
      const a = TAU * rng();
      const s = d.r * 0.75 * Math.sqrt(rng());
      blebs.set([d.x + s * Math.cos(a), d.y + s * Math.sin(a), 0.006 + 0.012 * rng()], k * 3);
    }
    chondrule.porphyritic = { seeds, seedPhase, seedVar, gap, variation, blebs };
  } else if (kind === 'bo') {
    const a = TAU * rng();
    const b = a + (rng() < 0.5 ? 1 : -1) * (0.5 + 0.6 * rng());
    let twinX = 0.5;
    let twinY = 0.5;
    let twinOffset = Infinity;
    if (rng() < 0.6) {
      const t = TAU * rng();
      twinX = Math.cos(t);
      twinY = Math.sin(t);
      twinOffset = (rng() - 0.5) * d.r;
    }
    chondrule.barred = {
      ux: Math.cos(a),
      uy: Math.sin(a),
      vx: Math.cos(b),
      vy: Math.sin(b),
      twinX,
      twinY,
      twinOffset,
      period: d.r * (0.13 + 0.05 * rng()),
      barOffset: rng(),
      shell: d.r * (0.09 + 0.05 * rng()),
      variation,
    };
  } else {
    const a = TAU * rng();
    const s = d.r * (0.8 + 0.15 * rng());
    chondrule.radial = { ox: d.x + s * Math.cos(a), oy: d.y + s * Math.sin(a), fibers: Math.round(40 + 30 * rng()), variation };
  }

  const hasRim = rng() < 0.45;
  chondrule.outline = {
    x: d.x,
    y: d.y,
    r: d.r,
    a2: shape[0],
    p2: shape[1],
    a3: shape[2],
    p3: shape[3],
    a5: shape[4],
    p5: shape[5],
    rim: hasRim ? (rng() < 0.6 ? Phase.sulfide : Phase.metal) : 0,
    rimWidth: hasRim ? 0.008 + 0.006 * rng() : 0.5,
    rimK: hasRim ? 2 + Math.floor(rng() * 3) : 2,
    rimP: hasRim ? TAU * rng() : 0.5,
    rimP2: hasRim ? TAU * rng() : 0.5,
  };
  return chondrule;
}

interface Raster {
  cols: number;
  rows: number;
  /** Cells per specimen unit, its inverse, and the view's offset in units. */
  unit: number;
  cell: number;
  left: number;
  top: number;
  phase: Uint8Array;
  grainVar: Float32Array;
  /** Chondrule index + 1 for interior cells, 0 elsewhere. */
  owner: Uint16Array;
}

interface Box {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

function boxAround(x: number, y: number, reach: number, g: Raster): Box {
  return {
    x0: Math.max(0, Math.floor((x - reach - g.left) * g.unit)),
    x1: Math.min(g.cols - 1, Math.ceil((x + reach - g.left) * g.unit)),
    y0: Math.max(0, Math.floor((y - reach - g.top) * g.unit)),
    y1: Math.min(g.rows - 1, Math.ceil((y + reach - g.top) * g.unit)),
  };
}

/** Mark the chondrule's interior cells as owned and paint its rim. */
function paintOutline(o: Outline, id: number, g: Raster, box: Box): void {
  const { cols, cell, left, top, phase, owner } = g;
  const reach = o.r * 1.13;
  const rimWidth = Math.max(o.rimWidth, 1.05 * cell);
  for (let y = box.y0; y <= box.y1; y++) {
    const dy = top + (y + 0.5) * cell - o.y;
    for (let x = box.x0; x <= box.x1; x++) {
      const dx = left + (x + 0.5) * cell - o.x;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > reach) continue;
      const th = Math.atan2(dy, dx);
      const edge =
        o.r * (1 + o.a2 * Math.cos(2 * th + o.p2) + o.a3 * Math.cos(3 * th + o.p3) + o.a5 * Math.cos(5 * th + o.p5));
      if (d > edge) continue;
      const i = y * cols + x;
      if (o.rim > 0 && d > edge - rimWidth && Math.sin(o.rimK * th + o.rimP) + 0.7 * Math.sin(2 * o.rimK * th + o.rimP2) > -0.55) {
        phase[i] = o.rim;
        owner[i] = 0;
      } else {
        owner[i] = id;
      }
    }
  }
}

function paintPorphyritic(c: Porphyritic, id: number, g: Raster, box: Box): void {
  const { cols, cell, left, top, phase, grainVar, owner } = g;
  const { seeds, seedPhase, seedVar, blebs } = c;
  const gap = Math.max(c.gap, cell);
  const minBleb = 1.8 * cell;
  for (let y = box.y0; y <= box.y1; y++) {
    const py = top + (y + 0.5) * cell;
    for (let x = box.x0; x <= box.x1; x++) {
      const i = y * cols + x;
      if (owner[i] !== id) continue;
      const px = left + (x + 0.5) * cell;
      let bleb = false;
      for (let k = 0; k < blebs.length; k += 3) {
        const ex = px - blebs[k];
        const ey = py - blebs[k + 1];
        const br = blebs[k + 2] > minBleb ? blebs[k + 2] : minBleb;
        if (ex * ex + ey * ey < br * br) bleb = true;
      }
      if (bleb) {
        phase[i] = Phase.metal;
        continue;
      }
      let d1 = Infinity;
      let d2 = Infinity;
      let k1 = 0;
      for (let k = 0; k < seeds.length; k += 6) {
        const ex = px - seeds[k];
        const ey = py - seeds[k + 1];
        const along = ex * seeds[k + 2] + ey * seeds[k + 3];
        const across = ey * seeds[k + 2] - ex * seeds[k + 3];
        const dd = (along * along * seeds[k + 4] + (across * across) / seeds[k + 4]) * seeds[k + 5];
        if (dd < d1) {
          d2 = d1;
          d1 = dd;
          k1 = k;
        } else if (dd < d2) {
          d2 = dd;
        }
      }
      const crystal = (k1 / 6) | 0;
      if (Math.sqrt(d2) - Math.sqrt(d1) >= gap) {
        phase[i] = seedPhase[crystal];
        grainVar[i] = seedVar[crystal];
      } else {
        phase[i] = Phase.mesostasis;
        grainVar[i] = c.variation;
      }
    }
  }
}

function paintBarred(c: Barred, o: Outline, id: number, g: Raster, box: Box): void {
  const { cols, cell, left, top, phase, grainVar, owner } = g;
  const period = Math.max(c.period, 3.2 * cell);
  const shell = Math.max(c.shell, 1.5 * cell);
  for (let y = box.y0; y <= box.y1; y++) {
    const dy = top + (y + 0.5) * cell - o.y;
    for (let x = box.x0; x <= box.x1; x++) {
      const i = y * cols + x;
      if (owner[i] !== id) continue;
      const dx = left + (x + 0.5) * cell - o.x;
      /* Olivine shell within `shell` of the outline, bars inside it. */
      const d = Math.sqrt(dx * dx + dy * dy);
      const th = Math.atan2(dy, dx);
      const edge =
        o.r * (1 + o.a2 * Math.cos(2 * th + o.p2) + o.a3 * Math.cos(3 * th + o.p3) + o.a5 * Math.cos(5 * th + o.p5));
      let p: number = Phase.olivine;
      if (d < edge - shell) {
        const twin = dx * c.twinX + dy * c.twinY > c.twinOffset;
        const proj = (twin ? dx * c.vx + dy * c.vy : dx * c.ux + dy * c.uy) / period + c.barOffset;
        if (proj - Math.floor(proj) >= 0.62) p = Phase.mesostasis;
      }
      phase[i] = p;
      grainVar[i] = c.variation;
    }
  }
}

function paintRadial(c: Radial, id: number, g: Raster, box: Box): void {
  const { cols, cell, left, top, phase, grainVar, owner } = g;
  const perTurn = c.fibers / TAU;
  for (let y = box.y0; y <= box.y1; y++) {
    const oy = top + (y + 0.5) * cell - c.oy;
    for (let x = box.x0; x <= box.x1; x++) {
      const i = y * cols + x;
      if (owner[i] !== id) continue;
      const ox = left + (x + 0.5) * cell - c.ox;
      const dist = Math.sqrt(ox * ox + oy * oy);
      const a = (Math.atan2(oy, ox) + 0.012 * Math.sin(dist * 60)) * perTurn;
      phase[i] = a - Math.floor(a) < 0.68 ? Phase.pyroxene : Phase.mesostasis;
      grainVar[i] = c.variation;
    }
  }
}

function paintFragment(f: Fragment, g: Raster): void {
  const { cols, cell, left, top, phase, grainVar } = g;
  const box = boxAround(f.x, f.y, f.s, g);
  const faces = f.faces;
  const minFace = 0.7 * cell;
  for (let y = box.y0; y <= box.y1; y++) {
    const dy = top + (y + 0.5) * cell - f.y;
    for (let x = box.x0; x <= box.x1; x++) {
      const dx = left + (x + 0.5) * cell - f.x;
      const i = y * cols + x;
      if (phase[i] !== Phase.matrix) continue;
      let inside = true;
      for (let j = 0; j < faces.length; j += 3) {
        const limit = faces[j + 2] > minFace ? faces[j + 2] : minFace;
        if (dx * faces[j] + dy * faces[j + 1] > limit) {
          inside = false;
          break;
        }
      }
      if (inside) {
        phase[i] = f.phase;
        grainVar[i] = f.v;
      }
    }
  }
}

function paintBlob(b: Blob, g: Raster): void {
  const { cols, cell, left, top, phase } = g;
  const r = Math.max(b.r, 2 * cell);
  const box = boxAround(b.x, b.y, r * 1.6, g);
  for (let y = box.y0; y <= box.y1; y++) {
    const dy = top + (y + 0.5) * cell - b.y;
    for (let x = box.x0; x <= box.x1; x++) {
      const dx = left + (x + 0.5) * cell - b.x;
      const th = Math.atan2(dy, dx);
      const edge = r * (1 + b.a2 * Math.cos(2 * th + b.p2) + b.a3 * Math.cos(3 * th + b.p3));
      if (dx * dx + dy * dy < edge * edge) phase[y * cols + x] = b.phase;
    }
  }
}

function makeBlob(rng: Rng, x: number, y: number, r: number, phase: number): Blob {
  return { x, y, r, phase, a2: 0.35 * rng(), p2: TAU * rng(), a3: 0.2 * rng(), p3: TAU * rng() };
}

export function createSpecimen(cols: number, rows: number, seed: number): Specimen {
  const n = cols * rows;
  const unit = Math.max(rows, MIN_UNIT);
  const view = cols / unit;
  const width = Math.max(LAYOUT_WIDTH, view);
  const rng = mulberry32(seed);

  /* Layout. It consumes the generator in an order that does not depend on
     the grid, so every grid size shows the same specimen. */
  const disks = placeChondrules(rng, width);
  const chondrules = disks.map((d, k) => describeChondrule(d, rng, k === 0));
  /* Distance to the nearest chondrule center, in units of its radius. */
  const clearance = (x: number, y: number) => Math.min(...disks.map((d) => Math.hypot(x - d.x, y - d.y) / d.r));

  const fragments: Fragment[] = [];
  const fragmentCount = Math.round(18 * (width / LAYOUT_WIDTH));
  for (let k = 0; k < fragmentCount; k++) {
    const x = rng() * width;
    const y = rng();
    const s = 0.012 + 0.03 * Math.pow(rng(), 1.5);
    const sides = 5 + Math.floor(rng() * 3);
    const faces = new Float64Array(sides * 3);
    const start = TAU * rng();
    for (let j = 0; j < sides; j++) {
      const a = start + (TAU * (j + 0.35 * rng())) / sides;
      faces.set([Math.cos(a), Math.sin(a), s * (0.55 + 0.45 * rng())], j * 3);
    }
    const phase = rng() < 0.62 ? Phase.olivine : Phase.pyroxene;
    const v = rng() * 2 - 1;
    if (disks.every((d) => Math.hypot(x - d.x, y - d.y) > d.r * 1.05 + s)) fragments.push({ x, y, s, phase, v, faces });
  }

  const blobs: Blob[] = [];
  const grainCount = Math.round(40 * (width / LAYOUT_WIDTH));
  for (let k = 0; k < grainCount; k++) {
    const x = rng() * width;
    const y = rng();
    const r = 0.007 + 0.022 * Math.pow(rng(), 2);
    const metal = rng() < 0.55;
    const compound = rng() < 0.3;
    const a = TAU * rng();
    const r2 = r * (0.6 + 0.3 * rng());
    const main = makeBlob(rng, x, y, r, metal ? Phase.metal : Phase.sulfide);
    const side = makeBlob(rng, x + Math.cos(a) * (r + r2) * 0.75, y + Math.sin(a) * (r + r2) * 0.75, r2, Phase.sulfide);
    /* Grains sit in the matrix or on chondrule margins, not deep inside. */
    if (clearance(x, y) < 0.82) continue;
    blobs.push(main);
    if (compound) blobs.push(side);
  }

  const raster: Raster = {
    cols,
    rows,
    unit,
    cell: 1 / unit,
    left: (width - view) / 2,
    top: (1 - rows / unit) / 2,
    phase: new Uint8Array(n),
    grainVar: new Float32Array(n),
    owner: new Uint16Array(n),
  };
  chondrules.forEach((c, k) => {
    const box = boxAround(c.outline.x, c.outline.y, c.outline.r * 1.13, raster);
    paintOutline(c.outline, k + 1, raster, box);
    if (c.porphyritic) paintPorphyritic(c.porphyritic, k + 1, raster, box);
    if (c.barred) paintBarred(c.barred, c.outline, k + 1, raster, box);
    if (c.radial) paintRadial(c.radial, k + 1, raster, box);
  });
  for (const f of fragments) paintFragment(f, raster);
  for (const b of blobs) paintBlob(b, raster);

  const { rates, bse, meanRate } = composition(raster, seed);
  return { cols, rows, seed, rates, meanRate, guide: electronImage(bse, cols, rows, seed), phase: raster.phase };
}

/** Emission rates per cell and the noiseless electron image. */
function composition(g: Raster, seed: number): { rates: Float32Array; bse: Float32Array; meanRate: number } {
  const { cols, rows, phase, grainVar } = g;
  const n = cols * rows;
  const tex = mulberry32(seed ^ 0x2545f491);
  const noiseFe = smoothField(g, seed + 101);
  const noiseMg = smoothField(g, seed + 202);
  const noiseSi = smoothField(g, seed + 303);
  const rates = new Float32Array(n * 3);
  const bse = new Float32Array(n);
  let total = 0;
  for (let i = 0; i < n; i++) {
    const p = phase[i];
    const v = grainVar[i];
    const base = PHASE_RATES[p];
    let mg = base[0];
    let si = base[1];
    let fe = base[2];
    let b = PHASE_BSE[p];
    if (p === Phase.matrix) {
      /* Fine-grained: smooth variation of about 20% plus per-cell texture. */
      const grain = (tex() * 2 - 1) * 0.08;
      mg *= (1 + 0.3 * noiseMg[i]) * (1 + grain);
      si *= (1 + 0.3 * (0.6 * noiseMg[i] + 0.4 * noiseSi[i])) * (1 + grain);
      fe *= (1 + 0.3 * noiseFe[i]) * (1 - grain);
      b += 0.07 * noiseFe[i] + 0.15 * grain;
    } else if (p === Phase.olivine) {
      mg *= 1 - 0.06 * v;
      fe *= 1 + 0.25 * v;
      b += 0.025 * v;
    } else if (p === Phase.pyroxene) {
      mg *= 1 - 0.05 * v;
      fe *= 1 + 0.3 * v;
      b += 0.02 * v;
    } else if (p === Phase.mesostasis) {
      mg *= 1 + 0.25 * v;
      fe *= 1 + 0.2 * v;
      b += 0.015 * v;
    }
    rates[i * 3] = mg;
    rates[i * 3 + 1] = si;
    rates[i * 3 + 2] = fe;
    total += mg + si + fe;
    bse[i] = b;
  }
  return { rates, bse, meanRate: total / n };
}

/** A real BSE image is sharp but not a segmentation: slight blur, slight noise. */
function electronImage(bse: Float32Array, cols: number, rows: number, seed: number): Uint8Array {
  const n = cols * rows;
  const tmp = new Float32Array(n);
  for (let y = 0; y < rows; y++) {
    const o = y * cols;
    for (let x = 0; x < cols; x++) {
      const l = bse[o + (x > 0 ? x - 1 : 0)];
      const r = bse[o + (x < cols - 1 ? x + 1 : x)];
      tmp[o + x] = 0.25 * l + 0.5 * bse[o + x] + 0.25 * r;
    }
  }
  const rng = mulberry32(seed ^ 0x68e31da4);
  const guide = new Uint8Array(n);
  for (let y = 0; y < rows; y++) {
    const up = (y > 0 ? y - 1 : 0) * cols;
    const down = (y < rows - 1 ? y + 1 : y) * cols;
    const o = y * cols;
    for (let x = 0; x < cols; x++) {
      /* Sum of three uniforms: close enough to Gaussian noise, sigma 0.016. */
      const g = 0.25 * tmp[up + x] + 0.5 * tmp[o + x] + 0.25 * tmp[down + x] + 0.032 * (rng() + rng() + rng() - 1.5);
      guide[o + x] = g <= 0 ? 0 : g >= 1 ? 255 : Math.round(g * 255);
    }
  }
  return guide;
}

/**
 * Smooth noise in specimen units (about three bumps per unit), sampled every
 * 4 cells and interpolated. Values in about [-1, 1].
 */
function smoothField(g: Raster, seed: number): Float32Array {
  const { cols, rows, cell, left, top } = g;
  const step = 4;
  const gc = Math.ceil(cols / step) + 2;
  const gr = Math.ceil(rows / step) + 2;
  const lattice = new Float32Array(gc * gr);
  for (let gy = 0; gy < gr; gy++) {
    const v = (top + (gy * step + 0.5) * cell) * 3.2;
    for (let gx = 0; gx < gc; gx++) lattice[gy * gc + gx] = fbm((left + (gx * step + 0.5) * cell) * 3.2, v, seed);
  }
  const out = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    const gy = Math.floor(y / step);
    const ty = (y - gy * step) / step;
    for (let x = 0; x < cols; x++) {
      const gx = Math.floor(x / step);
      const tx = (x - gx * step) / step;
      const o = gy * gc + gx;
      const top = lattice[o] + (lattice[o + 1] - lattice[o]) * tx;
      const bottom = lattice[o + gc] + (lattice[o + gc + 1] - lattice[o + gc]) * tx;
      out[y * cols + x] = top + (bottom - top) * ty;
    }
  }
  return out;
}
