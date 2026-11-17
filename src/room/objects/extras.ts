/*
  The small things of the second list of the brief, each where it would be
  in a bedroom: a light switch by the door and a clock over it, a rubber duck
  on the desk, a density column, a chessboard and an old telephone on the
  window sill, a toy shipping container on the PC, an LED matrix on the
  wall, and a PS Vita left on the bed. Six of them open a window of the
  desktop: src/data/room.ts says which.
*/
import { moves, position, square, type Piece } from '../../data/chess.ts';
import { EMISSIVE, VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';
import { DOOR } from './door.ts';
import { WINDOW } from './window.ts';

const FINE = 0.0125;
const FINER = 0.00625;

/** Every voxel of a slab `h` thick whose centre is within `r` of (cx, cz), from above. */
function disc(m: VoxelModel, cx: number, cz: number, r: number, y: number, h: number, color: number): void {
  for (let x = 0; x < m.sx; x++) for (let z = 0; z < m.sz; z++) if (Math.hypot(x + 0.5 - cx, z + 0.5 - cz) <= r) m.box(x, y, z, 1, h, 1, color);
}

/** The light switch, on the strip of wall between the door and the open side of the room: a plate and its rocker. 9 cm. */
function lightSwitch(): RoomObject {
  const m = new VoxelModel(2, 7, 7);
  m.box(0, 0, 0, 1, 7, 7, C.paper).box(1, 2, 2, 1, 3, 3, C.stone);
  return { name: 'switch', voxel: FINE, at: [0, 1.05, DOOR.z1 + 0.06], model: m, wall: 'west' };
}

/** Where the clock hangs, over the middle of the door: its lower corner, and its side, in metres. */
const CLOCK = { y: DOOR.height + 0.15, z: (DOOR.z0 + DOOR.z1) / 2 - 0.15, side: 0.3 };

/** The wall clock: a square case, dark, around a white face. Its hands are a picture (CLOCK_FACE). */
function clock(): RoomObject {
  const m = new VoxelModel(2, 24, 24);
  m.box(0, 0, 0, 2, 24, 24, C.ink).box(1, 2, 2, 1, 20, 20, C.paper);
  return { name: 'clock', voxel: FINE, at: [0, CLOCK.y, CLOCK.z], model: m, wall: 'west' };
}

/** The face of the clock, looking into the room from the left wall: centre, width and height in metres. */
export const CLOCK_FACE = { x: 2 * FINE + 0.002, y: CLOCK.y + CLOCK.side / 2, z: CLOCK.z + CLOCK.side / 2, width: 0.25, height: 0.25 };

/** The rubber duck, at the front of the desk between the controllers and the keyboard, looking at the room. 9 cm long. */
function duck(): RoomObject {
  const m = new VoxelModel(14, 12, 10);
  m.ball(6, 4, 5, 6, 4, 4.5, C.mustard); // body
  m.ball(1.5, 5.5, 5, 2, 2, 2.5, C.mustard); // tail, turned up
  m.ball(9.5, 8.5, 5, 3, 3, 3, C.mustard); // head
  m.box(12, 7, 3, 2, 1, 4, C.rust); // bill, wide and flat
  m.set(10, 9, 2, C.ink).set(10, 9, 7, C.ink); // eyes
  return { name: 'duck', voxel: FINER, at: [2.5, 0.75, 0.62], model: m, turn: -40, smooth: true };
}

/** The top of the window sill, and how far it comes into the room, in metres. */
const SILL = { top: WINDOW.y0 + 0.05, edge: 0.1 };

/** The density column: a tall glass where five liquids lie one on another, the heaviest at the bottom. 19 cm. */
function column(): RoomObject {
  const m = new VoxelModel(10, 30, 10);
  disc(m, 5, 5, 5, 0, 2, C.silver); // foot
  [C.honey, C.leaf, C.sky, C.amber, C.red].forEach((liquid, i) => disc(m, 5, 5, 4.2, 2 + i * 5, 5, liquid));
  disc(m, 5, 5, 4.2, 27, 2, C.paper); // the glass above the last liquid
  disc(m, 5, 5, 5, 29, 1, C.silver); // rim
  return { name: 'column', voxel: FINER, at: [WINDOW.x0 + 0.08, SILL.top, SILL.edge - 0.08], model: m, smooth: true, wall: 'north' };
}

/** The chessboard, in the middle of the sill: its corner on the side of a8, in metres, and its sizes in voxels. */
const BOARD = { x: WINDOW.x0 + 0.23, z: -0.19, square: 5, border: 2 };

/** How far a piece goes from one square to the next, in metres. */
export const CHESS = { step: BOARD.square * FINER };

/** A chess piece, three voxels wide, with its corner at (x, y, z): a pawn, a rook with its battlements, a queen with her crown, a king with his cross. */
function stand(m: VoxelModel, kind: Piece, x: number, y: number, z: number, color: number): void {
  if (kind === 'P') m.box(x, y, z, 3, 2, 3, color).box(x + 1, y + 2, z + 1, 1, 2, 1, color);
  if (kind === 'R') {
    m.box(x, y, z, 3, 4, 3, color);
    for (const [i, k] of [[0, 0], [2, 0], [0, 2], [2, 2]]) m.set(x + i, y + 4, z + k, color);
  }
  if (kind === 'Q' || kind === 'K') m.box(x, y, z, 3, 2, 3, color).box(x + 1, y + 2, z + 1, 1, 3, 1, color).box(x, y + 5, z, 3, 1, 3, color).set(x + 1, y + 6, z + 1, color);
  if (kind === 'K') m.set(x + 1, y + 7, z + 1, color).set(x, y + 7, z + 1, color).set(x + 2, y + 7, z + 1, color);
}

/**
 * The chessboard and its game (src/data/chess.ts), White on the side of the
 * room. The pieces that will move are objects of their own, named after the
 * square they start from; the others are part of the board. 27 cm.
 */
function chess(): RoomObject[] {
  const side = 2 * BOARD.border + 8 * BOARD.square;
  const m = new VoxelModel(side, 10, side);
  m.box(0, 0, 0, side, 2, side, C.walnut);
  /* Where a square is on the board, in voxels: the files run along the wall, the eighth rank is at the window. */
  const corner = (file: number, rank: number): [number, number] => [BOARD.border + BOARD.square * file, BOARD.border + BOARD.square * (7 - rank)];
  for (let file = 0; file < 8; file++) {
    for (let rank = 0; rank < 8; rank++) {
      const [x, z] = corner(file, rank);
      m.box(x, 1, z, BOARD.square, 1, BOARD.square, (file + rank) % 2 ? C.honey : C.chestnut);
    }
  }
  const men: RoomObject[] = [];
  for (const [army, pieces] of Object.entries(position)) {
    for (const [kind, squares] of Object.entries(pieces) as [Piece, string[]][]) {
      for (const name of squares) {
        const [x, z] = corner(...square(name));
        const color = army === 'white' ? C.paper : C.ink;
        if (!moves.some(({ from }) => from === name)) {
          stand(m, kind, x + 1, 2, z + 1, color);
          continue;
        }
        const own = new VoxelModel(3, 8, 3);
        stand(own, kind, 0, 0, 0, color);
        men.push({ name: `chess-${name}`, voxel: FINER, at: [BOARD.x + (x + 1) * FINER, SILL.top + 2 * FINER, BOARD.z + (z + 1) * FINER], model: own, wall: 'north' });
      }
    }
  }
  return [{ name: 'chess', voxel: FINER, at: [BOARD.x, SILL.top, BOARD.z], model: m, wall: 'north' }, ...men];
}

/** An old telephone, black, with a dial and its handset across the top. 16 cm wide. */
function telephone(): RoomObject {
  const m = new VoxelModel(26, 14, 18);
  m.box(1, 0, 1, 24, 4, 16, C.graphite).box(3, 4, 3, 20, 3, 13, C.graphite).box(5, 7, 5, 16, 2, 9, C.graphite); // the case, narrower as it rises
  m.box(2, 10, 7, 22, 2, 4, C.ink); // handset
  m.box(1, 8, 6, 5, 3, 6, C.ink).box(20, 8, 6, 5, 3, 6, C.ink); // its two ends, on the cradle
  /* The dial, on the front: a white disc and its ring of finger holes. */
  for (let x = 8; x < 18; x++) for (let y = 0; y < 8; y++) if (Math.hypot(x + 0.5 - 13, y + 0.5 - 4) <= 3.7) m.set(x, y, 17, C.paper);
  for (let hole = 0; hole < 7; hole++) {
    const angle = (hole / 8) * 2 * Math.PI;
    m.set(Math.floor(13 + 2.4 * Math.cos(angle)), Math.floor(4 + 2.4 * Math.sin(angle)), 17, C.ink);
  }
  return { name: 'telephone', voxel: FINER, at: [WINDOW.x1 - 0.3, SILL.top, SILL.edge - 0.125], model: m, smooth: true, wall: 'north' };
}

/** A toy shipping container, set across the top of the PC tower: ribbed sides, two bars on its doors. 12 cm long. */
function container(): RoomObject {
  const m = new VoxelModel(20, 8, 8);
  m.box(0, 0, 0, 20, 8, 8, C.rust);
  for (let x = 1; x < 19; x += 2) m.box(x, 1, 0, 1, 6, 8, C.red); // ribs
  m.box(19, 1, 1, 1, 6, 6, C.rust).box(19, 1, 2, 1, 6, 1, C.silver).box(19, 1, 5, 1, 6, 1, C.silver); // doors and their bars
  return { name: 'container', voxel: FINER, at: [4.1, 0.475, 0.5], model: m, turn: -12 };
}

/** Where the LED matrix hangs, over the wall calendar: its lower left corner, and its side, in metres. */
const MATRIX = { x: 1.525, y: 1.9, side: 0.35 };

/** The LED matrix: a black panel. Its lights are a picture (MATRIX_FACE). */
function ledMatrix(): RoomObject {
  const m = new VoxelModel(14, 14, 1);
  m.box(0, 0, 0, 14, 14, 1, C.ink);
  return { name: 'led-matrix', voxel: 0.025, at: [MATRIX.x, MATRIX.y, 0], model: m, wall: 'north' };
}

/** The lights of the matrix, 16 by 16, two centimetres apart: centre, width and height in metres. */
export const MATRIX_FACE = { x: MATRIX.x + MATRIX.side / 2, y: MATRIX.y + MATRIX.side / 2, z: 0.025 + 0.002, width: 0.32, height: 0.32 };

/**
 * The PS Vita, left on the duvet beside the dog: a black slab with round
 * ends, a wide screen that lights up, a cross, four buttons and two sticks,
 * without its maker's mark. 18 cm.
 */
function vita(): RoomObject {
  const m = new VoxelModel(29, 3, 14);
  m.box(4, 0, 0, 21, 2, 14, C.ink).ball(4.5, 1, 7, 4.5, 1, 7, C.ink).ball(24.5, 1, 7, 4.5, 1, 7, C.ink);
  m.box(8, 1, 3, 13, 1, 8, C.cyan | EMISSIVE); // screen
  m.box(3, 2, 6, 3, 1, 1, C.steel).box(4, 2, 5, 1, 1, 3, C.steel); // cross
  for (const [x, z] of [[24, 5], [24, 7], [23, 6], [25, 6]]) m.set(x, 2, z, C.silver); // buttons
  m.set(5, 2, 10, C.graphite).set(23, 2, 10, C.graphite); // sticks
  return { name: 'vita', voxel: FINER, at: [1.0, 0.5, 1.15], model: m, turn: -25, smooth: true };
}

export const extras = (): RoomObject[] => [lightSwitch(), clock(), duck(), column(), ...chess(), telephone(), container(), ledMatrix(), vita()];
