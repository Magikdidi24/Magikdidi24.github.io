// The stops of the visit of the 3D room, and what the room says that must be
// true of the site. Run with `npm test`.
import { PALETTE } from '../src/room/voxel/palette.ts';
import { CONSOLES } from '../src/room/objects/tech.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { projects, smallerProjects } from '../src/data/projects.ts';
import { diplomas, labels, opens, programs, says, stops, windowOf } from '../src/data/room.ts';
import { frames, inks } from '../src/data/matrix.ts';
import * as site from '../src/data/site.ts';
import { coursework, skills } from '../src/data/site.ts';
import { objects } from '../src/room/objects/index.ts';
import { framed } from '../src/room/objects/walls.ts';

const ROOM = { w: 6, h: 2.7, d: 4.4 };

test('stops: each has its own id, and no object opens two panels', () => {
  assert.equal(new Set(stops.map(({ id }) => id)).size, stops.length);
  const all = stops.flatMap((stop) => stop.objects);
  assert.equal(new Set(all).size, all.length);
});

test('stops: what opens a panel stands in the room on its own, and has a name', () => {
  const standing = new Set(objects().filter(({ decor }) => !decor).map(({ name }) => name));
  for (const { id, objects: own } of stops) {
    assert.ok(own.length > 0, `${id} has nothing to click`);
    for (const name of own) {
      assert.ok(standing.has(name), `${name}, of ${id}, is not an object of the room`);
      assert.ok(labels[name], `${name} has no name`);
    }
  }
});

test('stops: the camera looks at a point of the room', () => {
  for (const { id, view } of stops) {
    const [x, y, z] = view.target;
    assert.ok(x >= -0.2 && x <= ROOM.w && y >= 0 && y <= ROOM.h && z >= -0.2 && z <= ROOM.d, `${id} looks outside the room`);
    assert.ok(view.zoom || view.across, `${id} does not say how close`);
  }
});

test('stops: the PC, the NAS, the whiteboard, the printer and the calendar open no panel', () => {
  const opening = new Set(stops.flatMap((stop) => stop.objects));
  for (const name of ['pc', 'homelab', 'whiteboard', 'eraser', 'printer', 'cv', 'calendar', 'dog']) assert.ok(!opening.has(name), `${name} opens a panel`);
});

test('the NAS: an object of the room with its lights, and not a word about it in the data of the site', () => {
  assert.equal(labels.homelab, 'NAS');
  assert.ok(!('homelab' in site), 'site.ts still describes the homelab');
});

test('stops: the compiler work is opened by the book on the nightstand', () => {
  assert.deepEqual(stops.find(({ id }) => id === 'compiler').objects, ['book']);
});

test('stops: the window is a stop at night only, Tokyo, and by day it just says Paris', () => {
  const nightly = stops.filter(({ night }) => night);
  assert.deepEqual(nightly.map(({ id, label, night, objects: own }) => [id, label, night, own]), [['tokyo', 'Tokyo', true, ['window']]]);
  assert.equal(says.window, 'Paris');
});

test('frames: read from left to right in the opening view, they go from the baccalaureat to the engineering school', () => {
  /* On the left wall the opening view shows the far end of the row on its left: the order of the eye is that of decreasing z. */
  const order = ['frame-bac', 'frame-prepa', 'frame-toeic', 'frame-epita'];
  const along = order.map((name) => framed(name).z);
  assert.deepEqual([...along].sort((a, b) => b - a), along);
  assert.deepEqual(diplomas.map(({ frame }) => frame), order);
});

test('neither Go nor LaTeX: not among his skills, nor in what a project or a course is said to be made with', () => {
  const said = [
    ...skills.flatMap(({ items }) => items),
    ...[...projects, ...smallerProjects].flatMap(({ stack }) => stack),
    ...coursework.flatMap(({ stack, summary }) => [...stack, summary]),
  ];
  for (const each of said) assert.doesNotMatch(each, /\bGo\b|LaTeX/);
});


test('the consoles of the cabinet: each stands in the room and has its name under the pointer, the Xbox 360 among them', () => {
  const standing = new Set(objects().filter(({ decor }) => !decor).map(({ name }) => name));
  for (const name of CONSOLES) {
    assert.ok(standing.has(name), `${name} is not an object of the room`);
    assert.ok(labels[name], `${name} has no name`);
  }
  assert.ok(CONSOLES.some((name) => labels[name] === 'Xbox 360'));
});

test('the bonus objects: each stands in the room and has a name; what one opens is a window of the desktop', () => {
  const standing = new Set(objects().filter(({ decor }) => !decor).map(({ name }) => name));
  for (const name of ['switch', 'clock', 'duck', 'column', 'container', 'telephone', 'led-matrix', 'chess', 'chess-e2', 'chess-d8', 'chess-e1', 'vita']) {
    assert.ok(standing.has(name), `${name} is not an object of the room`);
    assert.ok(labels[name], `${name} has no name`);
  }
  const windows = new Set([...projects.map(({ slug }) => slug), ...programs.map(({ repo }) => windowOf(repo))]);
  for (const [name, slug] of Object.entries(opens)) {
    assert.ok(standing.has(name), `${name} opens a project but is not in the room`);
    assert.ok(windows.has(slug), `${name} opens ${slug}, which is not a window of the desktop`);
  }
  assert.deepEqual(Object.keys(opens).sort(), ['chess', 'clock', 'column', 'telephone', 'vita']);
  assert.ok(!projects.some(({ slug }) => slug === 'ruby-playground'), 'the Ruby playground is no longer a project of the site');
  assert.equal(labels.vita, 'PS Vita');
  assert.equal(says.duck, 'Quack!');
});

test('the LED matrix: every picture is 16 by 16, in inks that the palette has', () => {
  assert.ok(frames.length >= 3);
  for (const frame of frames) {
    assert.equal(frame.length, 16);
    for (const row of frame) {
      assert.equal(row.length, 16, row);
      for (const cell of row) assert.ok(cell === '.' || cell in inks, `no ink for "${cell}"`);
    }
  }
  for (const swatch of Object.values(inks)) assert.ok(swatch in PALETTE, `${swatch} is not in the palette`);
});
