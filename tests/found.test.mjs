// What the visitor has found in the 3D room, as the browser keeps it. Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { finds, stops } from '../src/data/room.ts';
import { objects } from '../src/room/objects/index.ts';
import { parse } from '../src/room/ui/found.ts';

const KNOWN = ['about', 'research', 'calendar'];

test('parse: what was stored comes back in the order of the room', () => {
  assert.deepEqual(parse('["calendar","about"]', KNOWN), ['about', 'calendar']);
});

test('parse: what the room no longer has is dropped', () => {
  assert.deepEqual(parse('["research","next","research"]', KNOWN), ['research']);
});

test('parse: nothing stored, or something else than a list, is nothing found', () => {
  for (const stored of [null, '', 'not json', '{"about":true}', '3']) assert.deepEqual(parse(stored, KNOWN), []);
});

test('finds: every stop but the desktop that lists them, each with something to do', () => {
  assert.deepEqual(finds.slice(0, -2).map(({ id }) => id), stops.filter(({ id }) => id !== 'projects').map(({ id }) => id));
  assert.equal(new Set(finds.map(({ id }) => id)).size, finds.length);
  for (const { id, label, task } of finds) assert.ok(label && task, `${id} has no label or nothing to do`);
});

test('finds: the last two open no panel, the CV of the printer and the calendar, and both are objects of the room', () => {
  assert.deepEqual(finds.slice(-2).map(({ id }) => id), ['cv', 'calendar']);
  for (const name of ['printer', 'calendar']) assert.ok(objects().some((object) => object.name === name && !object.decor), `${name} is not in the room`);
  for (const id of ['cv', 'calendar']) assert.ok(!stops.some((stop) => stop.id === id), `${id} is a stop`);
});
