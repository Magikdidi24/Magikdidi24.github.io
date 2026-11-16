/*
  View maths of the 3D room. Pure functions, no three.js and no DOM, so they
  run under `node --test` (tests/view.test.mjs).
*/

/** The low-resolution drawing buffer and the CSS size that shows it. */
export interface Grid {
  /** Device pixels per virtual pixel: a whole number. */
  k: number;
  cols: number;
  rows: number;
  /** CSS size of the canvas. It can exceed the viewport by less than one virtual pixel. */
  cssWidth: number;
  cssHeight: number;
}

/**
 * Grid for a viewport, with virtual pixels of about `pixelSize` CSS pixels.
 * Each one is a whole number of device pixels, so they all have the same size
 * at any devicePixelRatio. Pixel size 0 is the smooth mode: k = 1.
 */
export function gridSize(cssWidth: number, cssHeight: number, dpr: number, pixelSize: number): Grid {
  const k = Math.max(1, Math.round(pixelSize * dpr));
  const cols = Math.ceil((cssWidth * dpr) / k);
  const rows = Math.ceil((cssHeight * dpr) / k);
  return { k, cols, rows, cssWidth: (cols * k) / dpr, cssHeight: (rows * k) / dpr };
}

/**
 * Pixel size, in CSS pixels, that shows about 300 virtual pixels of height
 * and at least 190 of width (portrait phones), kept between 2 and 5.
 */
export function autoPixelSize(cssWidth: number, cssHeight: number): number {
  return Math.min(5, Math.max(2, Math.round(Math.min(cssHeight / 300, cssWidth / 190))));
}

/**
 * Half-height of the orthographic frustum, in world units, that fits a
 * w × h × d box seen from `azimuth` (from +z towards +x) and `elevation`
 * above the floor, in a viewport of the given aspect ratio.
 */
export function fitHalfHeight(
  size: { w: number; h: number; d: number },
  azimuth: number,
  elevation: number,
  aspect: number,
): number {
  const sin = Math.abs(Math.sin(azimuth));
  const cos = Math.abs(Math.cos(azimuth));
  const across = size.w * cos + size.d * sin;
  const up = (size.w * sin + size.d * cos) * Math.sin(elevation) + size.h * Math.cos(elevation);
  return Math.max(up / 2, across / 2 / aspect);
}

/** How far a position is from the nearest line of the pixel grid, in pixels: -0.5 to 0.5. */
export function pixelFraction(position: number, pixelWorldSize: number): number {
  const pixels = position / pixelWorldSize;
  return pixels - Math.round(pixels);
}

/** Round to the nearest multiple of `step`; a step of 0 leaves the value alone. */
export function snap(value: number, step: number): number {
  return step > 0 ? Math.round(value / step) * step : value;
}
