// View maths of the 3D room: the virtual pixel grid, the automatic pixel
// size, the camera fit and the grid snapping. Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { autoGrid, clearOf, fitHalfHeight, gridSize, lightTurn, pixelAt, pixelFraction, shownWalls, snap, texelFit } from '../src/room/view.ts';

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

// A picture on the back wall, laid so that the default view shows one of its texels per pixel.
const AZIMUTH = Math.PI / 4;
const ELEVATION = Math.PI / 6;
const paper = { x: 5.225, y: 1.825, z: 0.052, width: 1.35, height: 1.25 };
const texels = { cols: 60, rows: 68 };
const fraction = (value) => value - Math.floor(value);
/** Columns and rows of pixels, from the origin, of a point of the wall seen from the default view. */
const onScreen = (x, y, pixel) => [
  (x * Math.cos(AZIMUTH) - paper.z * Math.sin(AZIMUTH)) / pixel,
  (-x * Math.sin(AZIMUTH) * Math.sin(ELEVATION) + y * Math.cos(ELEVATION) - paper.z * Math.cos(AZIMUTH) * Math.sin(ELEVATION)) / pixel,
];

test('texelFit: from the default view each texel covers one pixel, across and up', () => {
  const pixel = 6.5 / 450;
  const fit = texelFit(paper, texels, pixel, { cols: 720, rows: 450 }, AZIMUTH, ELEVATION);
  near((fit.width / texels.cols) * Math.cos(AZIMUTH), pixel);
  near((fit.height / texels.rows) * Math.cos(ELEVATION), pixel);
  assert.ok(Math.abs(fit.x - paper.x) < 0.03 && Math.abs(fit.y - paper.y) < 0.03, 'it stays in the middle of its paper');
});

test('texelFit: its columns fall on the columns of the grid, its rows a quarter of a pixel off', () => {
  const pixel = 6.5 / 450;
  const fit = texelFit(paper, texels, pixel, { cols: 720, rows: 450 }, AZIMUTH, ELEVATION);
  const [column, row] = onScreen(fit.x - fit.width / 2, fit.y + fit.height / 2, pixel);
  near(fraction(column + 0.5), 0.5, 1e-6);
  near(fraction(row), 0.25, 1e-6);
});

test('texelFit: on a grid of odd size the boundaries are half a pixel further', () => {
  const pixel = 6.5 / 433;
  const fit = texelFit(paper, texels, pixel, { cols: 853, rows: 433 }, AZIMUTH, ELEVATION);
  const [column, row] = onScreen(fit.x - fit.width / 2, fit.y + fit.height / 2, pixel);
  near(fraction(column), 0.5, 1e-6);
  near(fraction(row), 0.75, 1e-6);
});

test('texelFit: a picture too large for its paper fills it instead, in its middle', () => {
  const pixel = 6.5 / 300; // a small window: larger pixels
  const fit = texelFit(paper, texels, pixel, { cols: 480, rows: 300 }, AZIMUTH, ELEVATION);
  assert.ok(fit.width <= paper.width + 1e-9 && fit.height <= paper.height + 1e-9);
  assert.ok(Math.abs(fit.width - paper.width) < 1e-9 || Math.abs(fit.height - paper.height) < 1e-9);
  near(fit.x, paper.x);
  near(fit.y, paper.y);
});

// The room is a doll's house: the two walls between the camera and the room are taken away.
const walls = (degrees) => Object.entries(shownWalls((degrees * Math.PI) / 180)).filter(([, shown]) => shown).map(([wall]) => wall).sort();

test('shownWalls: from the front the back wall and the left wall show, from behind the two others', () => {
  assert.deepEqual(walls(45), ['north', 'west']);
  assert.deepEqual(walls(225), ['east', 'south']);
  assert.deepEqual(walls(-135), ['east', 'south']);
});

test('shownWalls: on the way round, walls change one at a time', () => {
  assert.deepEqual(walls(75), ['north', 'west']);
  assert.deepEqual(walls(105), ['south', 'west']);
  assert.deepEqual(walls(195), ['east', 'south']);
  assert.deepEqual(walls(315), ['east', 'north']);
});

test('shownWalls: a wall seen edge on is not drawn', () => {
  assert.deepEqual(walls(90), ['west']);
  assert.deepEqual(walls(180), ['south']);
});

// A panel covers part of the viewport: what the camera looks at moves to the middle of what is left.
test('clearOf: nothing covered, nothing moves', () => {
  assert.deepEqual(clearOf({ right: 0, bottom: 0 }, 0.01, Math.PI / 4, Math.PI / 6), [0, 0, 0]);
});

test('clearOf: a panel on the right moves the target to the right of the screen by half its width', () => {
  // Seen from the front (azimuth 0), the right of the screen is +x.
  const [x, y, z] = clearOf({ right: 400, bottom: 0 }, 0.01, 0, Math.PI / 6);
  near(x, 2);
  near(y, 0);
  near(z, 0);
});

test('clearOf: a sheet at the bottom moves the target down the screen by half its height', () => {
  // Looking level (elevation 0), down the screen is straight down.
  const [x, y, z] = clearOf({ right: 0, bottom: 300 }, 0.01, 0, 0);
  near(x, 0);
  near(y, -1.5);
  near(z, 0);
});

test('clearOf: from the default view the two shifts follow the camera', () => {
  const [x, y, z] = clearOf({ right: 200, bottom: 0 }, 0.01, Math.PI / 4, Math.PI / 6);
  near(x, Math.SQRT1_2);
  near(y, 0);
  near(z, -Math.SQRT1_2);
});

const degrees = (value) => (value * Math.PI) / 180;

test('lightTurn: the daylight keeps to whole quarter turns while the camera looks around', () => {
  near(lightTurn(degrees(45), 0), 0);
  near(lightTurn(degrees(15), 0), 0);
  near(lightTurn(degrees(75), 0), 0);
  near(lightTurn(degrees(225), 0), Math.PI);
  near(lightTurn(degrees(250), 0), Math.PI);
});

test('lightTurn: during a turn round the room it goes round with the camera, without a jump at either end', () => {
  const from = degrees(60);
  for (const turned of [0, 0.4, 1.5, 3, Math.PI]) near(lightTurn(from + turned, turned), turned);
  near(lightTurn(from + Math.PI, 0), Math.PI); // the turn is over: the same light
});

test('lightTurn: a camera that faces a wall squarely is not thrown into the quarter before', () => {
  near(lightTurn(-1e-12, 0), 0);
  near(lightTurn(degrees(90) - 1e-12, 0), Math.PI / 2);
});
