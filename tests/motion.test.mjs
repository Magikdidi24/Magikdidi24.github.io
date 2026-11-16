// The stepped movements of the room: how far a movement has got, and the path of what flutters down.
// Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';

const near = (actual, expected, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= eps, `expected ${expected}, got ${actual}`);
import { easeOut, flutter, stepAt } from '../src/room/interaction/motion.ts';

test('stepAt: a movement advances in whole steps', () => {
  assert.equal(stepAt(0, 2, 8), 0);
  assert.equal(stepAt(0.24, 2, 8), 0);
  assert.equal(stepAt(0.25, 2, 8), 1);
  assert.equal(stepAt(1, 2, 8), 4);
});

test('stepAt: it stops at its last step and never starts before the first', () => {
  assert.equal(stepAt(2, 2, 8), 8);
  assert.equal(stepAt(60, 2, 8), 8);
  assert.equal(stepAt(-1, 2, 8), 0);
});

test('easeOut: from 0 to 1, fast then slow', () => {
  assert.equal(easeOut(0), 0);
  assert.equal(easeOut(1), 1);
  assert.ok(easeOut(0.5) > 0.5);
  assert.ok(easeOut(0.75) - easeOut(0.5) < easeOut(0.5) - easeOut(0.25));
});

// Something light on its way down: a petal, a sheet of paper.
const from = [5.9, 0.9, 0.3];
const to = [5.7, 0.01, 1.1];
const swing = { reach: 0.15, swings: 2.5, along: [0, 1] };
const steps = Array.from({ length: 41 }, (_, i) => i / 40);

test('flutter: it leaves from where it was let go and comes to rest on its spot, flat', () => {
  assert.deepEqual(flutter(from, to, 0, swing).at, from);
  assert.deepEqual(flutter(from, to, 1, swing).at, to);
  assert.equal(flutter(from, to, 1, swing).lean, 0);
});

test('flutter: it goes forward, then back, then forward again, along its swing only', () => {
  const sides = steps.map((t) => {
    const { at } = flutter(from, to, t, swing);
    near(at[0], from[0] + (to[0] - from[0]) * t, 1e-9); // nothing across the swing
    return Math.sign(Math.round((at[2] - (from[2] + (to[2] - from[2]) * t)) * 1000));
  });
  const turns = sides.filter((side, i) => side !== 0 && sides.slice(0, i).reverse().find((s) => s !== 0) === -side).length;
  assert.ok(turns >= 3, `it crossed its path ${turns} times`);
});

test('flutter: its swings die down, and it never climbs back above where it was let go', () => {
  const reach = (t) => Math.abs(flutter(from, to, t, swing).at[2] - (from[2] + (to[2] - from[2]) * t));
  assert.ok(Math.max(...steps.filter((t) => t > 0.8).map(reach)) < Math.max(...steps.filter((t) => t < 0.4).map(reach)) / 2);
  for (const t of steps) assert.ok(flutter(from, to, t, swing).at[1] <= from[1] + 1e-9, `it is above its start at ${t}`);
});

test('flutter: it stalls at the end of a swing and leans into the next one', () => {
  const still = { ...swing, reach: 0 };
  const drop = (t) => flutter(from, to, t, swing).at[1] - flutter(from, to, t, still).at[1];
  assert.ok(drop(0.5) > 0.01, 'held up at the end of a swing'); // 2.5 swings: t = 0.5 is the end of one
  near(drop(0.4), 0, 1e-9); // and t = 0.4 the middle of one, where it is lowest
  assert.ok(Math.abs(flutter(from, to, 0.4, swing).lean) > 0.5);
  near(flutter(from, to, 0.5, swing).lean, 0, 1e-9);
});
