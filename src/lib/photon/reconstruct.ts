/*
  Guided reconstruction: a joint bilateral filter on the counts. Each cell
  becomes a weighted mean of the counts around it, where the weight is a
  spatial Gaussian times a range Gaussian on the difference of the guide (the
  electron image). Cells across a grain boundary look different in the guide,
  so they barely mix and the boundary stays sharp.

  It sees only the counts, the guide and the exposure, never the true rates.
  The exposure is known when you acquire, so it sets the spatial scale: the
  fewer the photons, the wider the neighborhood it averages over.

  The weight between two cells is symmetric and does not depend on the
  counts, so the normalization is computed once per spatial scale, and the
  weighted sums are accumulated by scattering from the cells that recorded a
  photon. With sparse counts that skips most of the work.
*/

export interface ReconParams {
  /** Spatial Gaussian sigma, in cells. The footprint is a disk of radius 2 sigma. */
  sigmaS: number;
  /** Range Gaussian sigma, in guide levels (the guide spans 0 to 255). */
  sigmaR: number;
}

/**
 * Filter settings for an exposure (mean photons per cell): the spatial sigma
 * follows roughly 2.6 * (0.5 / exposure)^0.3 cells, in five steps so only a
 * few normalizations are ever computed.
 */
export function reconParams(exposure: number): ReconParams {
  const sigmaS = exposure < 0.1 ? 4.5 : exposure < 0.25 ? 3.4 : exposure < 0.8 ? 2.6 : exposure < 2.5 ? 2 : 1.5;
  return { sigmaS, sigmaR: 11 };
}

export interface Reconstructor {
  /**
   * Filter `counts` (interleaved Mg, Si, Fe per cell) into `out`: the guided
   * local mean of the counts in each cell and channel. Multiply by
   * meanRate / exposure to get rates.
   */
  run(counts: Uint8Array, out: Float32Array, params: ReconParams): void;
  /** Compute and cache the normalization for `params` ahead of time. */
  prepare(params: ReconParams): void;
}

interface Kernel {
  r: number;
  side: number;
  spatial: Float32Array;
  reach: Int32Array;
  range: Float32Array;
  inv: Float32Array;
}

export function createReconstructor(guide: Uint8Array, cols: number, rows: number): Reconstructor {
  const n = cols * rows;
  const kernels = new Map<string, Kernel>();

  function kernel(params: ReconParams): Kernel {
    const key = `${params.sigmaS}/${params.sigmaR}`;
    const cached = kernels.get(key);
    if (cached) return cached;
    const r = Math.max(1, Math.ceil(2 * params.sigmaS));
    const side = 2 * r + 1;
    const spatial = new Float32Array(side * side);
    const reach = new Int32Array(side);
    for (let dy = -r; dy <= r; dy++) {
      const ext = Math.floor(Math.sqrt(r * r - dy * dy) + 1e-9);
      reach[dy + r] = ext;
      for (let dx = -ext; dx <= ext; dx++) {
        spatial[(dy + r) * side + dx + r] = Math.exp(-(dx * dx + dy * dy) / (2 * params.sigmaS * params.sigmaS));
      }
    }
    const range = new Float32Array(511);
    for (let d = -255; d <= 255; d++) range[d + 255] = Math.exp(-(d * d) / (2 * params.sigmaR * params.sigmaR));

    /* Normalization: the sum of weights around each cell. */
    const inv = new Float32Array(n);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const offset = 255 - guide[y * cols + x];
        let sum = 0;
        for (let dy = -r; dy <= r; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= rows) continue;
          const ext = reach[dy + r];
          const x0 = x - ext < 0 ? 0 : x - ext;
          const x1 = x + ext >= cols ? cols - 1 : x + ext;
          const row = yy * cols;
          const base = (dy + r) * side + r - x;
          for (let xx = x0; xx <= x1; xx++) sum += spatial[base + xx] * range[guide[row + xx] + offset];
        }
        inv[y * cols + x] = 1 / sum;
      }
    }
    const k = { r, side, spatial, reach, range, inv };
    kernels.set(key, k);
    return k;
  }

  return {
    prepare(params) {
      kernel(params);
    },
    run(counts, out, params) {
      const { r, side, spatial, reach, range, inv } = kernel(params);
      out.fill(0);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const j = y * cols + x;
          const c0 = counts[j * 3];
          const c1 = counts[j * 3 + 1];
          const c2 = counts[j * 3 + 2];
          if ((c0 | c1 | c2) === 0) continue;
          const offset = 255 - guide[j];
          for (let dy = -r; dy <= r; dy++) {
            const yy = y + dy;
            if (yy < 0 || yy >= rows) continue;
            const ext = reach[dy + r];
            const x0 = x - ext < 0 ? 0 : x - ext;
            const x1 = x + ext >= cols ? cols - 1 : x + ext;
            const row = yy * cols;
            const base = (dy + r) * side + r - x;
            for (let xx = x0; xx <= x1; xx++) {
              const i = row + xx;
              const w = spatial[base + xx] * range[guide[i] + offset];
              const o = i * 3;
              out[o] += w * c0;
              out[o + 1] += w * c1;
              out[o + 2] += w * c2;
            }
          }
        }
      }
      for (let i = 0; i < n; i++) {
        const s = inv[i];
        const o = i * 3;
        out[o] *= s;
        out[o + 1] *= s;
        out[o + 2] *= s;
      }
    },
  };
}
