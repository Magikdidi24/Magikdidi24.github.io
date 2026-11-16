// The pixel font of the whiteboard: a line of formula source in, pixels out.
// Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { BOARD, doodle, notes } from '../src/data/whiteboard.ts';
import { LARGE, SMALL, typeset, upright } from '../src/room/voxel/text.ts';

const key = ([x, y]) => `${x},${y}`;
const columns = (line) => line.pixels.map(([x]) => x);
/** The lowest and highest row of the ink between two columns. */
const span = (line, from, to) => {
  const ys = line.pixels.filter(([x]) => x >= from && x <= to).map(([, y]) => y);
  return [Math.min(...ys), Math.max(...ys)];
};

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
  assert.deepEqual(span(typeset('L^L'), 4, 6), [-2, 2]);
  assert.deepEqual(span(typeset('L_L'), 4, 6), [2, 6]);
});

test('typeset: braces group a script, and the line comes back down after it', () => {
  const line = typeset('L^{LL}L');
  assert.equal(line.width, 15);
  assert.deepEqual(span(line, 0, 2), [0, 4]);
  assert.deepEqual(span(line, 4, 10), [-2, 2]);
  assert.deepEqual(span(line, 12, 14), [0, 4]);
});

test('typeset: a command names a glyph and swallows the space that ends it', () => {
  assert.equal(typeset('\\pi').width, SMALL.pi[0].length);
  assert.equal(typeset('\\pi L').width, typeset('\\pi').width + 1 + 3);
});

test('typeset: a character with no glyph is an error', () => {
  assert.throws(() => typeset('L@'), /no glyph/);
  assert.throws(() => typeset('\\nope'), /no glyph/);
});

test('typeset: every pixel knows the middle of its glyph', () => {
  const middles = new Set(typeset('LL').pixels.map(([, , middle]) => middle));
  assert.deepEqual(middles, new Set([1, 5]));
});

test('typeset: the large font writes the line 7 pixels high, its indices still small', () => {
  assert.equal(typeset('L', LARGE).width, 5);
  assert.equal(typeset('L L', LARGE).width, 14);
  assert.deepEqual(span(typeset('L', LARGE), 0, 4), [0, 6]);
  assert.deepEqual(span(typeset('L_L', LARGE), 6, 8), [4, 8]);
  assert.deepEqual(span(typeset('L^L', LARGE), 6, 8), [-2, 2]);
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

/** A note of the board, laid out in its font. */
const write = (note) => typeset(note.text, LARGE);

// A wall seen from the default view drops one pixel every two pixels across.
// What the viewer sees of a pixel of the wall: its column, and its row once the wall has dropped.
const seen = (line, left) => line.pixels.map(([x, y]) => [x, y + Math.floor((left + x) / 2)]);

test('upright: on the receding wall each glyph comes out as it was drawn', () => {
  for (const left of [0, 1, 6, 7]) {
    const flat = typeset('L');
    const onWall = seen(upright(flat, left), left);
    const drop = onWall[0][1] - flat.pixels[0][1];
    assert.deepEqual(onWall.map(([x, y]) => [x, y - drop]), flat.pixels.map(([x, y]) => [x, y]), `from column ${left}`);
    const moved = upright(flat, left).pixels.map(([, y], i) => y - flat.pixels[i][1]);
    assert.ok(Math.max(...moved) <= 1 && Math.min(...moved) >= -1, 'no column moves by more than a pixel');
  }
});

test('upright: the glyphs still step down from one to the next', () => {
  const line = typeset('LLLL');
  const onWall = seen(upright(line, 0), 0);
  const top = (from) => Math.min(...onWall.filter(([x]) => x >= from && x <= from + 2).map(([, y]) => y));
  assert.deepEqual([top(4) - top(0), top(8) - top(4), top(12) - top(8)], [2, 2, 2]);
});

for (const [name, lay] of [
  ['as written', (note) => write(note).pixels],
  ['upright on the wall', (note) => upright(write(note), note.at[0]).pixels],
])
  test(`whiteboard, ${name}: every note fits on the board and none touches another`, () => {
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
      const pixels = lay(note).map(([x, y]) => [note.at[0] + x, note.at[1] + y]);
      for (const [x, y] of pixels) claim(x, y, note.text);
      for (const pixel of pixels) taken.set(key(pixel), note.text);
    });
    /* The doodle is as good as a note: nothing may be written over it. Upright, its columns move by up to 4 pixels. */
    doodle.rows.forEach((row, dy) =>
      [...row].forEach((mark, dx) => {
        if (mark === '.') return;
        assert.ok(mark in doodle.pens, `no marker for "${mark}" in the doodle`);
        for (const lean of [-4, 0, 4]) claim(doodle.at[0] + dx, doodle.at[1] + dy + lean, 'the doodle');
      }),
    );
  });

