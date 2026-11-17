// The game on the chessboard of the window sill: the moves it shows can be
// played, and the last one is mate. Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { moves, position, square } from '../src/data/chess.ts';

const name = (file, rank) => `${String.fromCharCode(97 + file)}${rank + 1}`;

test('square: a file and a rank, both from 0', () => {
  assert.deepEqual(square('a1'), [0, 0]);
  assert.deepEqual(square('e8'), [4, 7]);
});

test('the mate on the sill: each side moves in turn along a clear line, and the last move leaves the black king no way out', () => {
  const board = new Map();
  for (const [side, pieces] of Object.entries(position)) {
    for (const [piece, squares] of Object.entries(pieces)) {
      for (const at of squares) {
        assert.ok(!board.has(at), `two pieces on ${at}`);
        board.set(at, { side, piece });
      }
    }
  }
  let side = 'white';
  for (const { from, to } of moves) {
    const mover = board.get(from);
    assert.equal(mover?.side, side, `${from} has no ${side} piece`);
    assert.ok(mover.piece === 'Q' || mover.piece === 'R', `${from} is neither a queen nor a rook`);
    const [f0, r0] = square(from);
    const [f1, r1] = square(to);
    assert.ok(f0 === f1 || r0 === r1, `${from} to ${to} is not along a file or a rank`);
    const [df, dr] = [Math.sign(f1 - f0), Math.sign(r1 - r0)];
    for (let f = f0 + df, r = r0 + dr; f !== f1 || r !== r1; f += df, r += dr) assert.ok(!board.has(name(f, r)), `${from} to ${to} jumps over ${name(f, r)}`);
    assert.notEqual(board.get(to)?.side, side, `${from} takes its own piece on ${to}`);
    board.delete(from);
    board.set(to, mover);
    side = side === 'white' ? 'black' : 'white';
  }

  /* Mate: a white rook on the rank of the black king with nothing between them, the king walled in by its own pawns, and no other black piece left to take the rook or to step in. */
  const black = [...board].filter(([, { side: whose }]) => whose === 'black');
  assert.deepEqual(black.map(([, { piece }]) => piece).sort(), ['K', 'P', 'P', 'P']);
  const [kf, kr] = square(black.find(([, { piece }]) => piece === 'K')[0]);
  const last = moves.at(-1).to;
  const [rf, rr] = square(last);
  assert.deepEqual(board.get(last), { side: 'white', piece: 'R' });
  assert.equal(rr, kr);
  assert.ok(Math.abs(rf - kf) > 1, 'the king could take the rook');
  for (let f = Math.min(kf, rf) + 1; f < Math.max(kf, rf); f++) assert.ok(!board.has(name(f, kr)), `${name(f, kr)} is in the way`);
  for (const f of [kf - 1, kf, kf + 1]) if (f >= 0 && f < 8) assert.deepEqual(board.get(name(f, kr - 1)), { side: 'black', piece: 'P' });
});
