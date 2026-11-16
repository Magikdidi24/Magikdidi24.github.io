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

/** Virtual pixels of height the room is drawn with, and the least width (portrait phones). */
const AUTO_ROWS = 450;
const AUTO_COLS = 290;

/**
 * The default grid for a viewport: about AUTO_ROWS virtual pixels of height,
 * at least AUTO_COLS of width, and never less than 2 device pixels per
 * virtual pixel, below which it stops reading as pixel art.
 */
export function autoGrid(cssWidth: number, cssHeight: number, dpr: number): Grid {
  const pixelSize = Math.min(cssHeight / AUTO_ROWS, cssWidth / AUTO_COLS);
  return gridSize(cssWidth, cssHeight, dpr, Math.max(pixelSize, 2 / dpr));
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

/**
 * The pixel of the drawing buffer under a point of the canvas. The point is
 * in CSS pixels from the top left corner of the canvas, the pixel is counted
 * from the bottom left corner of the buffer, as WebGL reads it. Null outside.
 */
export function pixelAt(grid: Grid, x: number, y: number): { x: number; y: number } | null {
  if (x < 0 || y < 0 || x >= grid.cssWidth || y >= grid.cssHeight) return null;
  return {
    x: Math.floor((x / grid.cssWidth) * grid.cols),
    y: grid.rows - 1 - Math.floor((y / grid.cssHeight) * grid.rows),
  };
}

/** A flat rectangle on a wall: its centre, then its size, in metres. */
export interface Spot {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
}

/**
 * Where to lay a picture of `cols` × `rows` texels on a wall that faces +z,
 * inside `paper`, so that from the default view (`azimuth`, `elevation`, zoom
 * 1) each of its texels covers exactly one pixel of the grid: text drawn in
 * it is then as sharp as text drawn on the screen. `pixel` is the size of a
 * pixel of the grid in the room, in metres.
 *
 * Its columns fall on the columns of the grid. Its rows sit a quarter of a
 * pixel off: the wall drops half a pixel per column, so no row of texels ever
 * falls right between two rows of pixels. A picture too large for its paper
 * fills it instead; it is then no longer sharp without zooming in.
 */
export function texelFit(
  paper: Spot,
  texels: { cols: number; rows: number },
  pixel: number,
  grid: { cols: number; rows: number },
  azimuth: number,
  elevation: number,
): Spot {
  const across = pixel / Math.cos(azimuth); // size of a texel on the wall
  const up = pixel / Math.cos(elevation);
  const width = texels.cols * across;
  const height = texels.rows * up;
  if (width > paper.width || height > paper.height) {
    const shrink = Math.min(paper.width / width, paper.height / height);
    return { ...paper, width: width * shrink, height: height * shrink };
  }
  /* The grid is anchored to the room: boundaries on whole pixels from the origin, or on halves when its size is odd. */
  const half = (count: number) => (count % 2 ? 0.5 : 0);
  let left = paper.x - width / 2;
  const column = (left * Math.cos(azimuth) - paper.z * Math.sin(azimuth)) / pixel - half(grid.cols);
  left -= (column - Math.round(column)) * across;
  let top = paper.y + height / 2;
  const row =
    (-left * Math.sin(azimuth) * Math.sin(elevation) + top * Math.cos(elevation) - paper.z * Math.cos(azimuth) * Math.sin(elevation)) / pixel -
    half(grid.rows);
  top -= (row - Math.round(row) - 0.25) * up;
  return { x: left + width / 2, y: top - height / 2, z: paper.z, width, height };
}
