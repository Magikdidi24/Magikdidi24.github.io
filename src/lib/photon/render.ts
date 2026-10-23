/*
  Display: each channel's rate goes through one transfer curve, then the
  three channel colors are screen-blended over the vacuum color, the way EDS
  software composites element maps. Raw counts and the reconstruction use the
  same call, so the two sides of the figure are directly comparable.
*/

export type RGB = readonly [number, number, number];

export interface Palette {
  mg: RGB;
  si: RGB;
  fe: RGB;
  vacuum: RGB;
}

/** The token values in src/styles/tokens.css (light scheme vacuum). */
export const DEFAULT_PALETTE: Palette = {
  mg: [0x3d, 0xdc, 0x97],
  si: [0x7b, 0x93, 0xff],
  fe: [0xff, 0xa5, 0x52],
  vacuum: [0x0a, 0x0f, 0x14],
};

/** Rates at or above this show at full strength. One photon at exposure 0.5 is well above it. */
export const SATURATION = 1;

/** Contrast of the transfer curve: values above 1 keep the matrix dim. */
export const GAMMA = 2;

const LEVELS = 1024;

export interface Compositor {
  /**
   * Write opaque RGBA pixels for `values` (interleaved Mg, Si, Fe per cell)
   * into `out`. `scale` turns a value into a rate: meanRate / exposure for
   * both raw counts and reconstructed counts.
   */
  draw(values: Uint8Array | Float32Array, scale: number, out: Uint8ClampedArray): void;
}

export function createCompositor(palette: Palette): Compositor {
  const colors = [palette.mg, palette.si, palette.fe];
  /* tables[k * 3 + c][level] = 1 - intensity(level) * color_k[c], the screen factor */
  const tables: Float32Array[] = [];
  for (let k = 0; k < 3; k++) {
    for (let c = 0; c < 3; c++) {
      const t = new Float32Array(LEVELS);
      for (let l = 0; l < LEVELS; l++) t[l] = 1 - Math.pow(l / (LEVELS - 1), GAMMA) * (colors[k][c] / 255);
      tables.push(t);
    }
  }
  const [r0, g0, b0, r1, g1, b1, r2, g2, b2] = tables;
  const vr = 255 - palette.vacuum[0];
  const vg = 255 - palette.vacuum[1];
  const vb = 255 - palette.vacuum[2];
  const top = LEVELS - 1;

  return {
    draw(values, scale, out) {
      const k = (scale * top) / SATURATION;
      const n = values.length / 3;
      for (let i = 0; i < n; i++) {
        const a = values[i * 3] * k;
        const b = values[i * 3 + 1] * k;
        const c = values[i * 3 + 2] * k;
        const la = a >= top ? top : (a + 0.5) | 0;
        const lb = b >= top ? top : (b + 0.5) | 0;
        const lc = c >= top ? top : (c + 0.5) | 0;
        const o = i * 4;
        out[o] = 255 - vr * r0[la] * r1[lb] * r2[lc];
        out[o + 1] = 255 - vg * g0[la] * g1[lb] * g2[lc];
        out[o + 2] = 255 - vb * b0[la] * b1[lb] * b2[lc];
        out[o + 3] = 255;
      }
    },
  };
}
