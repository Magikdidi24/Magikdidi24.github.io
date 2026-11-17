// The hash of the room page: which panel it opens, and which window inside the desktop of projects.
// Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { parse } from '../src/room/ui/route.ts';

const stops = ['education', 'projects', 'contact'];
const items = ['chess-board', 'terminal'];

test('parse: no hash opens nothing', () => {
  assert.deepEqual(parse('', stops, items), { stop: null, item: null });
  assert.deepEqual(parse('#', stops, items), { stop: null, item: null });
});

test('parse: the id of a panel opens it', () => {
  assert.deepEqual(parse('#education', stops, items), { stop: 'education', item: null });
  assert.deepEqual(parse('#contact', stops, items), { stop: 'contact', item: null });
});

test('parse: the id of a window opens the desktop of projects with that window', () => {
  assert.deepEqual(parse('#chess-board', stops, items), { stop: 'projects', item: 'chess-board' });
  assert.deepEqual(parse('#terminal', stops, items), { stop: 'projects', item: 'terminal' });
});

test('parse: anything else opens nothing', () => {
  assert.deepEqual(parse('#nope', stops, items), { stop: null, item: null });
  assert.deepEqual(parse('#Education', stops, items), { stop: null, item: null });
});
