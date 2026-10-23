/*
  Photon figure: simulated SEM-EDS acquisition of a chondrite section and a
  reconstruction guided by a simulated backscattered-electron image.
  Pure TypeScript, no DOM: it runs in the browser, in Node scripts and in
  Astro endpoints. Simulated data written for this site, not lab code.
*/
import { countsAt, createPhotonStore, type PhotonStore } from './photons.ts';
import { createReconstructor, reconParams, type Reconstructor } from './reconstruct.ts';
import { createCompositor, DEFAULT_PALETTE, type Palette } from './render.ts';
import { createSpecimen, type Specimen } from './specimen.ts';

export { mulberry32, type Rng } from './prng.ts';
export { poisson, poissonKnuth, poissonPTRS } from './poisson.ts';
export { createSpecimen, Phase, PHASE_RATES, type Specimen } from './specimen.ts';
export { countsAt, createPhotonStore, MAX_EXPOSURE, type PhotonStore } from './photons.ts';
export { createReconstructor, reconParams, type ReconParams, type Reconstructor } from './reconstruct.ts';
export { createCompositor, DEFAULT_PALETTE, GAMMA, SATURATION, type Compositor, type Palette, type RGB } from './render.ts';

/** The specimen everyone sees. */
export const PHOTON_SEED = 14;

/** Mean photons per cell, all channels summed, shown by default. */
export const DEFAULT_EXPOSURE = 0.5;

/** Exposure stops for the slider, roughly logarithmic from 0.05 to 20. */
export const EXPOSURE_STOPS: readonly number[] = [
  0.05, 0.06, 0.08, 0.1, 0.12, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12,
  15, 20,
];

export interface Simulation {
  readonly cols: number;
  readonly rows: number;
  readonly specimen: Specimen;
  readonly store: PhotonStore;
  /** Counts at the current exposure, interleaved Mg, Si, Fe per cell. */
  readonly counts: Uint8Array;
  /** Reconstructed counts after the last `reconstruct()`, same layout. */
  readonly filtered: Float32Array;
  readonly exposure: number;
  /** Set the exposure and update `counts`. Returns the number of cells with at least one photon. */
  expose(exposure: number): number;
  /**
   * Update `filtered` from `counts`, the guide and an exposure that sets the
   * filter's spatial scale (default: the current exposure).
   */
  reconstruct(scaleFor?: number): void;
  /** Precompute the filter normalization used at an exposure, so a later reconstruct() is fast. */
  prepare(exposure: number): void;
  /** Factor that turns counts or filtered counts into rates at the current exposure. */
  readonly scale: number;
}

export function createSimulation(cols: number, rows: number, seed: number = PHOTON_SEED): Simulation {
  const specimen = createSpecimen(cols, rows, seed);
  const store = createPhotonStore(specimen, seed);
  const recon: Reconstructor = createReconstructor(specimen.guide, cols, rows);
  const counts = new Uint8Array(cols * rows * 3);
  const filtered = new Float32Array(cols * rows * 3);
  let exposure = 0;
  return {
    cols,
    rows,
    specimen,
    store,
    counts,
    filtered,
    get exposure() {
      return exposure;
    },
    get scale() {
      return exposure > 0 ? specimen.meanRate / exposure : 0;
    },
    expose(e) {
      exposure = e;
      return countsAt(store, e, counts);
    },
    reconstruct(scaleFor = exposure) {
      recon.run(counts, filtered, reconParams(scaleFor));
    },
    prepare(e) {
      recon.prepare(reconParams(e));
    },
  };
}

export interface CompositeOptions {
  cols: number;
  rows: number;
  seed?: number;
  /** Mean photons per cell, all channels summed. Default 0.5. */
  exposure?: number;
  /** Fraction of the width, from the left, that shows raw counts. Default 0.5. */
  split?: number;
  palette?: Palette;
}

/**
 * Render the figure's image without a DOM: raw counts left of `split`,
 * reconstruction right of it. Returns `cols * rows * 4` RGBA bytes, row by
 * row, one pixel per cell, fully opaque. Same seed and grid give the same
 * pixels as the live figure at that exposure.
 */
export function renderComposite(options: CompositeOptions): Uint8ClampedArray {
  const { cols, rows, seed = PHOTON_SEED, exposure = DEFAULT_EXPOSURE, split = 0.5 } = options;
  const sim = createSimulation(cols, rows, seed);
  sim.expose(exposure);
  sim.reconstruct();
  const compositor = createCompositor(options.palette ?? DEFAULT_PALETTE);
  const raw = new Uint8ClampedArray(cols * rows * 4);
  const out = new Uint8ClampedArray(cols * rows * 4);
  compositor.draw(sim.counts, sim.scale, raw);
  compositor.draw(sim.filtered, sim.scale, out);
  const splitCol = Math.round(Math.min(1, Math.max(0, split)) * cols);
  for (let y = 0; y < rows; y++) {
    const start = y * cols * 4;
    out.set(raw.subarray(start, start + splitCol * 4), start);
  }
  return out;
}
