// The keyboard of the 3D room: which of its keys carry a skill, and which one
// is under the pointer. Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { keycaps } from '../src/data/room.ts';
import { languages, skills } from '../src/data/site.ts';
import { capOf, keyAt, KEYBOARD } from '../src/room/objects/desk.ts';

/** The middle of the top of a cap, in the room. */
const top = (index) => {
  const [x, y, z, w, h, d] = capOf(index);
  return [KEYBOARD.at[0] + (x + w / 2) * KEYBOARD.voxel, KEYBOARD.at[1] + (y + h) * KEYBOARD.voxel, KEYBOARD.at[2] + (z + d / 2) * KEYBOARD.voxel];
};
const DOWN = [0, -1, 0];
/** The way the camera of the opening view looks: 45 degrees round, 30 degrees down. */
const OPENING = [-Math.SQRT1_2 * Math.cos(Math.PI / 6), -0.5, -Math.SQRT1_2 * Math.cos(Math.PI / 6)];
const back = (point, direction, far) => point.map((value, k) => value - direction[k] * far);

test('keycaps: one for each skill and each language of the site, a colour to a group', () => {
  assert.deepEqual(keycaps.map(({ name }) => name), [...skills.flatMap(({ items }) => items), ...languages.map(({ name }) => name)]);
  const colours = new Map();
  for (const { group, color } of keycaps) colours.set(group, (colours.get(group) ?? new Set()).add(color));
  assert.equal(colours.size, skills.length + 1);
  for (const [group, own] of colours) assert.equal(own.size, 1, `${group} has ${own.size} colours`);
  assert.equal(new Set([...colours.values()].map(([color]) => color)).size, colours.size, 'two groups share a colour');
});

test('skill keys: each has a cap of its own on the keyboard', () => {
  const caps = keycaps.map((_, index) => capOf(index));
  for (const [x, y, z, w, h, d] of caps) {
    assert.ok(x >= 0 && z >= 0 && x + w <= KEYBOARD.size[0] && y + h <= KEYBOARD.size[1] && z + d <= KEYBOARD.size[2], 'a cap leaves the keyboard');
  }
  caps.forEach(([x, , z, w, , d], i) => {
    for (const [ox, , oz, ow, , od] of caps.slice(i + 1)) assert.ok(x + w <= ox || ox + ow <= x || z + d <= oz || oz + od <= z, `cap ${i} overlaps another`);
  });
});

test('keyAt: a line of sight that lands on a cap gives its key, from above or from the opening view', () => {
  keycaps.forEach((_, index) => {
    assert.equal(keyAt(back(top(index), DOWN, 2), DOWN), index);
    assert.equal(keyAt(back(top(index), OPENING, 5), OPENING), index);
  });
});

test('keyAt: nothing beside the keyboard, nor on a key that carries no skill', () => {
  const corner = [KEYBOARD.at[0] + 4 * KEYBOARD.voxel, KEYBOARD.at[1] + 5 * KEYBOARD.voxel, KEYBOARD.at[2] + 4 * KEYBOARD.voxel]; // the escape key
  assert.equal(keyAt(back(corner, DOWN, 2), DOWN), -1);
  assert.equal(keyAt([KEYBOARD.at[0] - 1, 2, KEYBOARD.at[2]], DOWN), -1);
  assert.equal(keyAt(top(0), [1, 0, 0]), -1, 'a line of sight that never comes down');
});
