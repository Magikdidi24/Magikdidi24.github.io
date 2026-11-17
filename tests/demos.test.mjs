// The two programs that can be played in the room, as they are shipped in
// public/room/demos: what the page expects of them. Run with `npm test`.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const load = async (name, imports) => (await WebAssembly.instantiate(await readFile(new URL(`../public/room/demos/${name}.wasm`, import.meta.url)), imports)).instance.exports;

/** A square by its name, as the engine numbers them: a8 is 0, h1 is 63. */
const square = (name) => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);

async function engine() {
  let memory;
  const view = () => new DataView(memory.buffer);
  const wasi = {
    clock_time_get: (_clock, _precision, out) => (view().setBigUint64(out, BigInt(Math.round(performance.now() * 1e6)), true), 0),
    environ_sizes_get: (count, size) => (view().setUint32(count, 0, true), view().setUint32(size, 0, true), 0),
    environ_get: () => 0,
    fd_write: () => 0,
    proc_exit: (code) => {
      throw new Error(`exit ${code}`);
    },
  };
  const chess = await load('chess', { wasi_snapshot_preview1: wasi });
  memory = chess.memory;
  chess.new_game();
  return chess;
}

test('chess: from the start White has twenty moves, and none for a piece of Black', async () => {
  const chess = await engine();
  const count = (bits) => bits.toString(2).replaceAll('0', '').length;
  let moves = 0;
  for (let from = 0; from < 64; from++) moves += count(chess.targets(from));
  assert.equal(moves, 20);
  assert.equal(chess.targets(square('e7')), 0n);
  assert.equal(chess.targets(square('e2')), (1n << BigInt(square('e3'))) | (1n << BigInt(square('e4'))));
});

test('chess: a move that is not legal is refused, a legal one passes the turn', async () => {
  const chess = await engine();
  assert.equal(chess.play(square('e2'), square('e5'), 0), 0);
  assert.equal(chess.turn(), 0);
  assert.equal(chess.play(square('e2'), square('e4'), 0), 1);
  assert.equal(chess.turn(), 1);
  assert.equal(chess.piece(square('e4')), 6, 'a white pawn');
  assert.equal(chess.last_move(), square('e2') * 64 + square('e4'));
});

test('chess: the engine answers within its time, and the game goes on', async () => {
  const chess = await engine();
  chess.play(square('e2'), square('e4'), 0);
  const before = performance.now();
  assert.equal(chess.think(150, 64), 1);
  assert.ok(performance.now() - before < 1000, 'it stops on time');
  assert.equal(chess.turn(), 0);
  assert.equal(chess.status(), 0);
  assert.ok(chess.search_depth() >= 1 && chess.search_nodes() > 0);
});

test("chess: the fool's mate is a checkmate", async () => {
  const chess = await engine();
  for (const [from, to] of [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']]) assert.equal(chess.play(square(from), square(to), 0), 1);
  assert.equal(chess.status(), 1);
  assert.equal(chess.in_check(), 1);
});

test('fluid: twenty liquids on a grid of 45 by 45, water poured on a floor stays on it', async () => {
  let memory;
  let color = '';
  let drawn = [];
  const sdl = {
    SDL_SetRenderDrawColor: (_renderer, r, g, b) => ((color = `${r},${g},${b}`), 1),
    SDL_RenderFillRect: (_renderer, rect) => (drawn.push([color, ...new Float32Array(memory.buffer, rect, 4)]), 1),
    SDL_RenderLine: () => 1,
    SDL_RenderClear: () => 1,
  };
  const fluid = await load('fluid', { env: sdl });
  memory = fluid.memory;
  assert.deepEqual([fluid.count(), fluid.width() / fluid.cell(), fluid.height() / fluid.cell()], [20, 45, 45]);
  assert.equal(fluid.color(0), 0x00a4df, 'water, as main.c paints it');
  fluid.reset();
  for (let x = 0; x < 45; x++) fluid.paint(x, 44, -1);
  for (let y = 0; y < 5; y++) fluid.paint(22, y, 0);
  for (let frame = 0; frame < 120; frame++) {
    drawn = [];
    fluid.frame(0);
  }
  const water = drawn.filter(([paint]) => paint === '0,164,223');
  assert.ok(water.length > 5, 'it has spread');
  assert.ok(water.every(([, , y]) => y >= 42 * 20), 'and lies just above the floor');
});
