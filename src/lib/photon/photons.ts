/*
  Photon arrivals. Each cell and channel is a Poisson process in exposure.
  Exposure is cut into fixed blocks; in each block we draw the count,
  N ~ Poisson(lambda * block length), and give each photon a uniform arrival
  time inside the block. The count at exposure e is the number of arrivals
  before e: exactly Poisson(lambda * e), identical every time for a seed, and
  it can only grow as e grows. The load animation and the exposure slider are
  two views of one acquisition.

  Blocks are generated on first use with their own seed, so the default view
  (exposure 0.5) never pays for the photons of exposure 20.
*/
import { poisson } from './poisson.ts';
import { mulberry32 } from './prng.ts';
import type { Specimen } from './specimen.ts';

export const MAX_EXPOSURE = 20;

/** Block boundaries in exposure units. The first block covers the default view. */
const EDGES = [0, 0.5, 2, MAX_EXPOSURE];

/** Arrival times are stored as 16-bit fractions of their block. */
const STEPS = 65536;

interface Block {
  /** Start of each cell-channel's arrivals in `times`, plus a final end offset. */
  offsets: Uint32Array;
  /** Sorted arrival times per cell-channel. */
  times: Uint16Array;
}

export interface PhotonStore {
  readonly rates: Float32Array;
  readonly meanRate: number;
  readonly seed: number;
  readonly blocks: (Block | undefined)[];
}

export function createPhotonStore(specimen: Specimen, seed: number): PhotonStore {
  return { rates: specimen.rates, meanRate: specimen.meanRate, seed, blocks: [] };
}

function generate(store: PhotonStore, b: number): Block {
  const { rates, meanRate } = store;
  const size = rates.length;
  const rng = mulberry32((store.seed ^ 0x51ed270b) + Math.imul(b + 1, 0x9e3779b9));
  const span = EDGES[b + 1] - EDGES[b];
  const scale = span / meanRate;
  const expected = span * (size / 3);
  let times = new Uint16Array(Math.ceil(expected + 8 * Math.sqrt(expected) + 256));
  const offsets = new Uint32Array(size + 1);
  let n = 0;
  for (let q = 0; q < size; q++) {
    offsets[q] = n;
    const m = poisson(rates[q] * scale, rng);
    if (n + m > times.length) {
      const grown = new Uint16Array(Math.ceil((n + m) * 1.25));
      grown.set(times);
      times = grown;
    }
    /* Insertion sort as we go: m is small, and each run stays ordered. */
    for (let j = 0; j < m; j++) {
      const t = (rng() * STEPS) | 0;
      let p = n + j;
      while (p > n && times[p - 1] > t) {
        times[p] = times[p - 1];
        p--;
      }
      times[p] = t;
    }
    n += m;
  }
  offsets[size] = n;
  return { offsets, times: times.subarray(0, n) };
}

/**
 * Fill `out` with the counts at `exposure` (mean photons per cell, all
 * channels summed, 0 to MAX_EXPOSURE). Returns the number of cells with at
 * least one photon.
 */
export function countsAt(store: PhotonStore, exposure: number, out: Uint8Array): number {
  const e = Math.min(MAX_EXPOSURE, Math.max(0, exposure));
  const full: Block[] = [];
  let partial: Block | undefined;
  let limit = 0;
  for (let b = 0; b < EDGES.length - 1 && EDGES[b] < e; b++) {
    const block = (store.blocks[b] ??= generate(store, b));
    if (EDGES[b + 1] <= e) {
      full.push(block);
    } else {
      partial = block;
      limit = ((e - EDGES[b]) / (EDGES[b + 1] - EDGES[b])) * STEPS;
    }
  }
  const size = store.rates.length;
  let lit = 0;
  for (let q = 0; q < size; q += 3) {
    let any = 0;
    for (let k = q; k < q + 3; k++) {
      let c = 0;
      for (const block of full) c += block.offsets[k + 1] - block.offsets[k];
      if (partial) {
        const { offsets, times } = partial;
        let o = offsets[k];
        const end = offsets[k + 1];
        while (o < end && times[o] < limit) {
          o++;
          c++;
        }
      }
      out[k] = c > 255 ? 255 : c;
      any |= c;
    }
    if (any) lit++;
  }
  return lit;
}
