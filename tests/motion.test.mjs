// The stepped movements of the room: how far a movement has got, and the path of a falling leaf.
// Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { easeOut, fall, stepAt } from '../src/room/interaction/motion.ts';

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

test('fall: a leaf leaves its branch and ends on its spot on the floor', () => {
  const from = [5.9, 0.9, 0.3];
  const to = [5.7, 0.01, 1.1];
  assert.deepEqual(fall(from, to, 0, 0.05), from);
  assert.deepEqual(fall(from, to, 1, 0.05), to);
});

test('fall: a leaf only goes down, and sways on its way', () => {
  const from = [5.9, 0.9, 0.3];
  const to = [5.7, 0.01, 1.1];
  let last = from;
  let swayed = false;
  for (let i = 1; i <= 10; i++) {
    const at = fall(from, to, i / 10, 0.05);
    assert.ok(at[1] < last[1], `it went up at step ${i}`);
    const straight = from[0] + (to[0] - from[0]) * (i / 10);
    if (Math.abs(at[0] - straight) > 0.01) swayed = true;
    last = at;
  }
  assert.ok(swayed);
});
