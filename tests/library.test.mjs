// The manga library of the 3D room: how the series are put on the shelves, and
// which one is under the pointer. Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { bays, RUNS, seriesAt, seriesOn, shelve, SPINE, TIERS } from '../src/room/objects/library.ts';

/** A bookcase one bay long: 38 volumes on each of its shelves. */
const ONE_BAY = 33;
const PER_BAY = 38;

test('bays: the volumes stand between the uprights, never on one', () => {
  const spans = bays(192);
  assert.equal(spans.length, 6);
  assert.deepEqual(spans[0], [5, 160]);
  assert.deepEqual(spans[5], [805, 955]);
  for (let i = 1; i < spans.length; i++) assert.ok(spans[i][0] - spans[i - 1][1] === 5, 'an upright is one voxel, five texels');
});

test('bays: a bookcase that ends short of a bay keeps what is left', () => {
  assert.deepEqual(bays(136).at(-1), [645, 675]);
});

test('shelve: a series fills the top shelf from the left, and goes on in the next bay', () => {
  const runs = shelve([65], [50, 10]);
  assert.deepEqual(runs, [
    { series: 0, first: 0, count: PER_BAY, shelf: 0, tier: TIERS - 1, x: 5 },
    { series: 0, first: PER_BAY, count: 12, shelf: 0, tier: TIERS - 1, x: 165 },
    { series: 1, first: 0, count: 10, shelf: 0, tier: TIERS - 1, x: 165 + 12 * SPINE.width },
  ]);
});

test('shelve: at the end of a bookcase the series goes on in the next one, then one shelf down', () => {
  const runs = shelve([ONE_BAY, ONE_BAY], [PER_BAY + 2 * PER_BAY + 5]);
  assert.deepEqual(
    runs.map(({ shelf, tier, first, count }) => [shelf, tier, first, count]),
    [
      [0, TIERS - 1, 0, PER_BAY],
      [1, TIERS - 1, PER_BAY, PER_BAY],
      [0, TIERS - 2, 2 * PER_BAY, PER_BAY],
      [1, TIERS - 2, 3 * PER_BAY, 5],
    ],
  );
});

test('shelve: every volume of a series is on the shelves once, in order', () => {
  const volumes = [110, 72, 42, 12, 7, 63];
  const runs = shelve([136, 192], volumes);
  volumes.forEach((count, series) => {
    const own = runs.filter((run) => run.series === series);
    assert.equal(own.reduce((sum, run) => sum + run.count, 0), count);
    let next = 0;
    for (const run of own) {
      assert.equal(run.first, next);
      next += run.count;
    }
  });
});

test('shelve: a series that no longer fits whole is left out, a shorter one after it is not', () => {
  const capacity = PER_BAY * TIERS;
  const runs = shelve([ONE_BAY], [capacity - 10, 20, 8]);
  assert.ok(!runs.some((run) => run.series === 1));
  assert.equal(runs.filter((run) => run.series === 2).reduce((sum, run) => sum + run.count, 0), 8);
});

test('shelve: no run leaves its bay or covers another', () => {
  const runs = shelve([136, 192], Array.from({ length: 150 }, (_, i) => 3 + ((i * 37) % 60)));
  const spans = [bays(136), bays(192)];
  for (const run of runs) {
    const end = run.x + run.count * SPINE.width;
    assert.ok(spans[run.shelf].some(([from, to]) => run.x >= from && end <= to), 'inside one bay');
  }
  const taken = new Set();
  for (const run of runs) {
    for (let k = 0; k < run.count; k++) {
      const place = `${run.shelf}:${run.tier}:${run.x + k * SPINE.width}`;
      assert.ok(!taken.has(place), `two volumes at ${place}`);
      taken.add(place);
    }
  }
});

test('seriesAt: the series under a point of a shelf, or none', () => {
  const runs = shelve([65], [50, 10]);
  assert.equal(seriesAt(runs, 0, TIERS - 1, 5), 0);
  assert.equal(seriesAt(runs, 0, TIERS - 1, 165 + 12 * SPINE.width - 1), 0);
  assert.equal(seriesAt(runs, 0, TIERS - 1, 165 + 12 * SPINE.width), 1);
  assert.equal(seriesAt(runs, 0, TIERS - 1, 162), -1, 'on an upright');
  assert.equal(seriesAt(runs, 0, TIERS - 2, 20), -1, 'on an empty shelf');
  assert.equal(seriesAt(runs, 1, TIERS - 1, 20), -1, 'in another bookcase');
});

test('seriesOn: a line of sight that meets a spine finds its series, one that meets a board finds none', () => {
  const [high, onBoard, left] = [2.175, 2.09, 1.05];
  assert.equal(seriesOn('manga-east', [3, high, left], [1, 0, 0]), 0);
  assert.equal(seriesOn('manga-east', [3, onBoard, left], [1, 0, 0]), -1);
  assert.equal(seriesOn('manga-east', [3, high, left], [0, 0, 1]), -1, 'it never meets the bookcase');
  assert.equal(seriesOn('desk', [3, high, left], [1, 0, 0]), -1);
});

test('seriesOn: the south bookcase is read from the corner', () => {
  // The top shelf of the east bookcase holds 159 volumes: the next one stands in the corner, on the south wall.
  const corner = RUNS.find((run) => run.shelf === 1 && run.tier === TIERS - 1);
  assert.equal(corner.x, 5);
  assert.equal(seriesOn('manga-south', [5.8 - 0.05, 2.175, 3], [0, 0, 1]), corner.series);
});
