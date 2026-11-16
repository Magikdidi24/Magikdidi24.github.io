// The pixel font of the whiteboard: a line of formula source in, pixels out.
// Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { BOARD, notes, strokes } from '../src/data/whiteboard.ts';
import { LARGE, SMALL, typeset } from '../src/room/voxel/text.ts';

const key = ([x, y]) => `${x},${y}`;
const columns = (line) => line.pixels.map(([x]) => x);
/** The lowest and highest row of the ink between two columns. */
const span = (line, from, to) => {
  const ys = line.pixels.filter(([x]) => x >= from && x <= to).map(([, y]) => y);
  return [Math.min(...ys), Math.max(...ys)];
};

test('typeset: one glyph gives its pixels, from the top of a capital', () => {
  const line = typeset('L');
  assert.equal(line.width, 5);
  const upright = [0, 1, 2, 3, 4, 5, 6].map((y) => `0,${y}`);
  assert.deepEqual(new Set(line.pixels.map(key)), new Set([...upright, '1,6', '2,6', '3,6', '4,6']));
});

test('typeset: glyphs follow each other one pixel apart, a space is three pixels', () => {
  assert.equal(typeset('LL').width, 11);
  assert.equal(typeset('L L').width, 14);
  assert.equal(Math.min(...columns(typeset('LL')).filter((x) => x > 4)), 6);
});

test('typeset: ^ writes the next glyph small and raised, _ small and lowered', () => {
  assert.deepEqual(span(typeset('L^L'), 6, 8), [-2, 2]);
  assert.deepEqual(span(typeset('L_L'), 6, 8), [4, 8]);
  assert.equal(typeset('L^L').width, 9);
});

test('typeset: braces group a script, and the line comes back to full size after it', () => {
  const line = typeset('L^{LL}L');
  assert.equal(line.width, 19);
  assert.deepEqual(span(line, 0, 4), [0, 6]);
  assert.deepEqual(span(line, 6, 12), [-2, 2]);
  assert.deepEqual(span(line, 14, 18), [0, 6]);
});

test('typeset: a command names a glyph and swallows the space that ends it', () => {
  assert.equal(typeset('\\pi').width, LARGE.pi[0].length);
  assert.equal(typeset('\\pi L').width, typeset('\\pi').width + 1 + 5);
});

test('typeset: a character with no glyph is an error', () => {
  assert.throws(() => typeset('L@'), /no glyph/);
  assert.throws(() => typeset('\\nope'), /no glyph/);
  assert.throws(() => typeset('L^@'), /no glyph/);
});

test('fonts: every glyph is a rectangle, with one or two rows under the line at most', () => {
  for (const [glyphs, heights] of [[LARGE, [7, 9]], [SMALL, [5, 6]]]) {
    for (const [name, glyph] of Object.entries(glyphs)) {
      assert.ok(heights.includes(glyph.length), `${name} has ${glyph.length} rows`);
      assert.ok(glyph.every((row) => row.length === glyph[0].length && /^[#.]+$/.test(row)), `${name} is ragged`);
    }
  }
});

test('fonts: what the large font can write, the small one can raise', () => {
  assert.deepEqual(Object.keys(SMALL).sort(), Object.keys(LARGE).sort());
});

test('whiteboard: every note fits on the board and none touches another', () => {
  assert.ok(notes.length >= 20, 'the board is meant to be full');
  const taken = new Map();
  const claim = (x, y, owner) => {
    assert.ok(x >= 1 && y >= 1 && x < BOARD.width - 1 && y < BOARD.height - 1, `${owner} leaves the board at ${x},${y}`);
    /* Its own pixel and the eight around it: two notes keep a pixel of white between them. */
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const other = taken.get(key([x + dx, y + dy]));
        assert.ok(other === undefined || other === owner, `${owner} touches ${other} near ${x},${y}`);
      }
    }
  };
  notes.forEach((note) => {
    const pixels = typeset(note.text).pixels.map(([x, y]) => [note.at[0] + x, note.at[1] + y]);
    for (const [x, y] of pixels) claim(x, y, note.text);
    for (const pixel of pixels) taken.set(key(pixel), note.text);
  });
  for (const stroke of strokes) {
    for (let y = stroke.at[1]; y < stroke.at[1] + stroke.size[1]; y++) {
      for (let x = stroke.at[0]; x < stroke.at[0] + stroke.size[0]; x++) {
        assert.ok(x >= 0 && y >= 0 && x < BOARD.width && y < BOARD.height, `a stroke leaves the board at ${x},${y}`);
        assert.ok(!taken.has(key([x, y])), `a stroke crosses ${taken.get(key([x, y]))} at ${x},${y}`);
      }
    }
  }
});
