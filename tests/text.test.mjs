// The pixel font of the whiteboard: a line of formula source in, pixels out.
// Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { BOARD, notes, strokes } from '../src/data/whiteboard.ts';
import { GLYPHS, typeset } from '../src/room/voxel/text.ts';

const key = ([x, y]) => `${x},${y}`;
const rows = (line) => line.pixels.map(([, y]) => y);
const columns = (line) => line.pixels.map(([x]) => x);

test('typeset: one glyph gives its pixels, from the top of a capital', () => {
  const line = typeset('L');
  assert.equal(line.width, 3);
  assert.deepEqual(new Set(line.pixels.map(key)), new Set(['0,0', '0,1', '0,2', '0,3', '0,4', '1,4', '2,4']));
});

test('typeset: glyphs follow each other one pixel apart, a space is two pixels', () => {
  assert.equal(typeset('LL').width, 7);
  assert.equal(typeset('L L').width, 9);
  assert.equal(Math.min(...columns(typeset('LL')).filter((x) => x > 2)), 4);
});

test('typeset: ^ raises the next glyph by two pixels, _ lowers it', () => {
  assert.equal(Math.min(...rows(typeset('L^L'))), -2);
  assert.equal(Math.max(...rows(typeset('L_L'))), 6);
  assert.equal(Math.min(...rows(typeset('L_L'))), 0);
});

test('typeset: braces group a script, and the line comes back down after it', () => {
  const line = typeset('L^{LL}L');
  const span = (from, to) => rows({ pixels: line.pixels.filter(([x]) => x >= from && x <= to) });
  assert.equal(line.width, 15);
  assert.deepEqual([Math.min(...span(0, 2)), Math.max(...span(0, 2))], [0, 4]);
  assert.deepEqual([Math.min(...span(4, 10)), Math.max(...span(4, 10))], [-2, 2]);
  assert.deepEqual([Math.min(...span(12, 14)), Math.max(...span(12, 14))], [0, 4]);
});

test('typeset: a command names a glyph and swallows the space that ends it', () => {
  assert.equal(typeset('\\pi').width, GLYPHS.pi[0].length);
  assert.equal(typeset('\\pi L').width, typeset('\\pi').width + 1 + 3);
});

test('typeset: a character with no glyph is an error', () => {
  assert.throws(() => typeset('L@'), /no glyph/);
  assert.throws(() => typeset('\\nope'), /no glyph/);
});

test('font: every glyph is a rectangle of 5 rows, or 6 with a descender', () => {
  for (const [name, glyph] of Object.entries(GLYPHS)) {
    assert.ok(glyph.length === 5 || glyph.length === 6, `${name} has ${glyph.length} rows`);
    assert.ok(glyph.every((row) => row.length === glyph[0].length && /^[#.]+$/.test(row)), `${name} is ragged`);
  }
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
