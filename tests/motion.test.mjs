// The stepped movements of the room: how far a movement has got, and the path of what flutters down.
// Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';

const near = (actual, expected, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= eps, `expected ${expected}, got ${actual}`);
import { clockHands, easeInOut, easeOut, flutter, stepAt, trainAt, tumble } from '../src/room/interaction/motion.ts';

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

// Something light on its way down: a sheet of paper.
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

// Something heavy that slips off: the brush of the whiteboard, a marker.
test('tumble: it leaves from where it was and comes to rest on its spot', () => {
  const from = [5, 1.2, 0.1];
  const to = [5.2, 0, 1.1];
  tumble(from, to, 0).forEach((value, i) => near(value, from[i]));
  tumble(from, to, 1).forEach((value, i) => near(value, to[i]));
});

test('tumble: it leaves level and drops faster and faster', () => {
  const height = (t) => tumble([0, 1, 0], [0, 0, 1], t)[1];
  const drops = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7].map((t) => height(t - 0.1) - height(t));
  assert.ok(drops[0] < 0.03, `it has hardly dropped after a tenth of the way: ${drops[0]}`);
  drops.forEach((drop, i) => i > 0 && assert.ok(drop > drops[i - 1], `drop ${i} is not larger than the one before`));
});

test('tumble: it hits the ground, bounces once, low, and goes on a little', () => {
  const at = (t) => tumble([0, 1, 0], [0, 0, 1], t);
  near(at(0.75)[1], 0);
  assert.ok(at(0.75)[2] < 1, 'it lands short of its spot');
  const peak = Math.max(...[0.8, 0.85, 0.875, 0.9, 0.95].map((t) => at(t)[1]));
  assert.ok(peak > 0.03 && peak < 0.2, `the bounce is ${peak} high`);
  for (let t = 0; t <= 1; t += 0.05) assert.ok(at(t)[1] >= -1e-9, `it sinks into the ground at ${t}`);
});

test('easeInOut: it leaves slowly, arrives slowly, and is half way at half time', () => {
  near(easeInOut(0), 0);
  near(easeInOut(0.5), 0.5);
  near(easeInOut(1), 1);
  assert.ok(easeInOut(0.1) < 0.1 && easeInOut(0.9) > 0.9);
  for (let t = 0; t < 1; t += 0.05) assert.ok(easeInOut(t + 0.05) > easeInOut(t), `it goes on at ${t}`);
});

// The train of the night view: it crosses the window every so often, in steps of two pixels.
test('trainAt: a train sets off as the page opens, and comes two pixels at a time', () => {
  assert.equal(trainAt(0, 206), 0);
  assert.equal(trainAt(1, 206), 24);
  for (let seconds = 0; seconds < 8; seconds += 0.07) assert.equal(trainAt(seconds, 206) % 2, 0);
});

test('trainAt: once its tail has gone the viaduct is empty, until the next one', () => {
  assert.equal(trainAt(8.6, 206), 206);
  assert.equal(trainAt(9, 206), null);
  assert.equal(trainAt(23.9, 206), null);
  assert.equal(trainAt(24, 206), 0);
  assert.equal(trainAt(25, 206), 24);
});

test('clockHands: how far round each hand is, in turns from twelve', () => {
  assert.deepEqual(clockHands(3, 0), { hour: 0.25, minute: 0 });
  assert.deepEqual(clockHands(18, 30), { hour: 6.5 / 12, minute: 0.5 });
  assert.deepEqual(clockHands(0, 45), { hour: 0.75 / 12, minute: 0.75 });
});
