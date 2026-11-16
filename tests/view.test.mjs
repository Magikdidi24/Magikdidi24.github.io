// View maths of the 3D room: the virtual pixel grid, the automatic pixel
// size, the camera fit and the grid snapping. Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { autoGrid, fitHalfHeight, gridSize, pixelAt, pixelFraction, snap } from '../src/room/view.ts';

const near = (actual, expected, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= eps, `expected ${expected}, got ${actual}`);

test('gridSize: a virtual pixel is a whole number of device pixels at every devicePixelRatio', () => {
  // [cssWidth, cssHeight, dpr, pixelSize] gives [k, cols, rows]
  const cases = [
    [[1440, 900, 1, 3], [3, 480, 300]],
    [[1440, 900, 1.25, 3], [4, 450, 282]],
    [[1280, 720, 1.5, 3], [5, 384, 216]],
    [[390, 844, 3, 2], [6, 195, 422]],
    [[412, 915, 2.625, 2], [5, 217, 481]],
  ];
  for (const [input, [k, cols, rows]] of cases) {
    const grid = gridSize(...input);
    assert.deepEqual([grid.k, grid.cols, grid.rows], [k, cols, rows], `gridSize(${input})`);
  }
});

test('gridSize: the grid covers a viewport that is not a multiple of the pixel size', () => {
  const grid = gridSize(1366, 768, 1, 4);
  assert.deepEqual([grid.cols, grid.rows], [342, 192]);
  // The canvas is one virtual pixel wider than the viewport, never narrower.
  assert.equal(grid.cssWidth, 1368);
  assert.equal(grid.cssHeight, 768);
});

test('gridSize: the canvas CSS size maps each virtual pixel to k device pixels', () => {
  const grid = gridSize(1440, 900, 1.25, 3);
  near(grid.cssWidth, 1440);
  near(grid.cssHeight, 902.4);
});

test('gridSize: pixel size 0 is the smooth mode, one device pixel per pixel', () => {
  const grid = gridSize(1440, 900, 2, 0);
  assert.deepEqual([grid.k, grid.cols, grid.rows], [1, 2880, 1800]);
});

const auto = (...viewport) => {
  const grid = autoGrid(...viewport);
  return [grid.k, grid.cols, grid.rows];
};

test('autoGrid: about 450 virtual pixels of height on desktop screens', () => {
  // [cssWidth, cssHeight, dpr] gives [k, cols, rows]
  assert.deepEqual(auto(1440, 900, 1), [2, 720, 450]);
  assert.deepEqual(auto(1920, 1080, 1), [2, 960, 540]);
  assert.deepEqual(auto(2560, 1440, 1), [3, 854, 480]);
});

test('autoGrid: the same picture on a high-density screen', () => {
  assert.deepEqual(auto(1440, 900, 2), [4, 720, 450]);
  assert.deepEqual(auto(1280, 720, 1.5), [2, 960, 540]);
  assert.deepEqual(auto(1920, 1080, 2), [5, 768, 432]);
});

test('autoGrid: a portrait phone is limited by its width, about 290 virtual pixels', () => {
  assert.deepEqual(auto(390, 844, 3), [4, 293, 633]);
  assert.deepEqual(auto(412, 915, 2.625), [4, 271, 601]);
});

test('autoGrid: a virtual pixel is never smaller than 2 device pixels', () => {
  assert.deepEqual(auto(390, 844, 1), [2, 195, 422]);
});

const room = { w: 6, h: 2.7, d: 4.4 };

test('fitHalfHeight: a wide viewport is limited by the height of the room', () => {
  near(fitHalfHeight(room, Math.PI / 4, Math.PI / 6, 1.6), 3.007612, 1e-5);
});

test('fitHalfHeight: a portrait viewport is limited by the width of the room', () => {
  near(fitHalfHeight(room, Math.PI / 4, Math.PI / 6, 390 / 844), 7.957315, 1e-5);
});

test('fitHalfHeight: width and depth are not interchangeable off the diagonal', () => {
  near(fitHalfHeight(room, Math.PI / 12, Math.PI / 6, 1.6), 2.619881, 1e-5);
});

test('pixelFraction: distance to the nearest grid line, in pixels', () => {
  near(pixelFraction(10.3, 1), 0.3);
  near(pixelFraction(10.6, 1), -0.4);
  near(pixelFraction(-10.3, 1), -0.3);
  near(pixelFraction(0.047, 0.02), 0.35);
});

test('pixelFraction: a position on the grid has no offset', () => {
  near(pixelFraction(12, 0.5), 0);
});

test('snap: rounds to the nearest step', () => {
  near(snap(44.4, 1), 44);
  near(snap(44.6, 1), 45);
  near(snap(1.07, 0.05), 1.05);
});

test('snap: a step of 0 leaves the value alone', () => {
  assert.equal(snap(1.234, 0), 1.234);
});

test('pixelAt: a point of the canvas, in CSS pixels from its top left, to a pixel of the buffer from its bottom left', () => {
  const grid = gridSize(1440, 900, 1, 2); // 720 x 450, two CSS pixels each
  assert.deepEqual(pixelAt(grid, 0, 0), { x: 0, y: 449 });
  assert.deepEqual(pixelAt(grid, 1439.5, 899.5), { x: 719, y: 0 });
  assert.deepEqual(pixelAt(grid, 3.9, 2), { x: 1, y: 448 });
});

test('pixelAt: nothing outside the canvas', () => {
  const grid = gridSize(1440, 900, 1, 2);
  assert.equal(pixelAt(grid, -1, 10), null);
  assert.equal(pixelAt(grid, 10, 900), null);
  assert.equal(pixelAt(grid, 1440, 10), null);
});
