/*
  What hangs on the back wall and on the left wall. It all goes when its wall
  is taken away, as the camera goes round the room. The clickable ones that
  wait for their content are plain for now.
*/
import { EMISSIVE, VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { Swatch } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';
import { WARDROBE } from './wardrobe.ts';

/** Where the row of frames hangs on the left wall. Metres. */
const FRAMES = { y: 1.25, z: 0.1 };

/**
 * One frame of the row above the bed, `z` metres along it: 40 × 30 cm when
 * wide, 30 × 40 cm otherwise. A wide one carries a paper, drawn as a texture,
 * and is its own object, to be clicked; the others are part of the decor.
 */
function frame(name: string, z: number, wide: boolean): RoomObject {
  const [width, height] = wide ? [8, 6] : [6, 8];
  const m = new VoxelModel(1, height, width);
  m.box(0, 0, 0, 1, height, width, C.walnut).box(0, 1, 1, 1, height - 2, width - 2, C.paper);
  return { name, voxel: 0.05, at: [0, FRAMES.y + (wide ? 0.1 : 0.05), FRAMES.z + z], model: m, decor: !wide, wall: 'west' };
}

/** The baccalaureate, the preparatory classes, EPITA, then the TOEIC certificate. */
export const frames = (): RoomObject[] => [
  frame('frame-bac', 0, true),
  frame('frame-prepa', 0.45, false),
  frame('frame-epita', 0.8, false),
  frame('frame-toeic', 1.15, true),
];

/** The paper of a wide frame, facing the room: centre, width and height in metres. */
const paper = (z: number) => ({ x: 0.05 + 0.002, y: FRAMES.y + 0.25, z: FRAMES.z + z + 0.2, width: 0.3, height: 0.2 });
export const BAC_PAPER = paper(0);
export const TOEIC_PAPER = paper(1.15);

/** Clipboard hung on the side of the wardrobe that faces the door: a board, a sheet and its clip. Voxels of 2.5 cm. */
export function clipboard(): RoomObject {
  const m = new VoxelModel(9, 14, 1);
  m.box(0, 0, 0, 9, 14, 1, C.chestnut).box(1, 1, 0, 7, 11, 1, C.paper);
  for (const y of [3, 5, 7, 9]) m.box(2, y, 0, y === 5 ? 3 : 5, 1, 1, C.stone); // lines of text
  m.box(3, 12, 0, 3, 2, 1, C.steel); // clip
  return { name: 'clipboard', voxel: 0.025, at: [0.19, 1.1, WARDROBE.z + WARDROBE.width], model: m, wall: 'west' };
}

/** Wall calendar above the nightstand, 30 × 40 cm. Voxels of 2.5 cm. */
export function calendar(): RoomObject {
  const m = new VoxelModel(12, 16, 1);
  m.box(0, 0, 0, 12, 16, 1, C.paper).box(0, 13, 0, 12, 3, 1, C.red); // sheet and its header
  for (let y = 2; y < 12; y += 2) {
    for (let x = 1; x < 11; x += 2) m.set(x, y, 0, C.stone); // days
  }
  return { name: 'calendar', voxel: 0.025, at: [1.55, 1.35, 0], model: m, wall: 'north' };
}

/** Where the pegboard hangs: its left edge and its foot, in metres. */
const PEGBOARD = { x: 2.1, y: 1.35 };

/** Pegboard above the left half of the desk, 1.1 m × 70 cm. */
export function pegboard(): RoomObject {
  const m = new VoxelModel(22, 14, 1);
  m.box(0, 0, 0, 22, 14, 1, C.honey);
  for (let y = 1; y < 14; y += 3) {
    for (let x = 1; x < 22; x += 3) m.set(x, y, 0, C.oak); // holes
  }
  return { name: 'pegboard', voxel: 0.05, at: [PEGBOARD.x, PEGBOARD.y, 0], model: m, wall: 'north' };
}

/** A paper pinned on the pegboard: its centre, its size and how far it leans, in metres and degrees. */
export interface Pinned {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  tilt: number;
}

const pinned = (x: number, y: number, width: number, height: number, tilt: number, layer = 0): Pinned => ({
  x: PEGBOARD.x + x,
  y: PEGBOARD.y + y,
  z: 0.05 + 0.003 + layer * 0.002,
  width,
  height,
  tilt,
});

/** The two boarding passes, one over the other, and the sheet of formulas. */
export const PASSES = [pinned(0.2, 0.55, 0.24, 0.09, 7), pinned(0.24, 0.46, 0.24, 0.09, -5, 1)];
export const FORMULAS = pinned(0.64, 0.5, 0.2975, 0.21, -2);

/** Pins with a round head, 2 cm across, each at the top of a paper. They are what carries the click for it. */
function pins(name: string, papers: Pinned[], color: number): RoomObject {
  const left = Math.min(...papers.map((p) => p.x)) - 0.02;
  const foot = Math.min(...papers.map((p) => p.y + p.height / 2)) - 0.03;
  const m = new VoxelModel(16, 24, 3);
  for (const p of papers) {
    const x = Math.round((p.x - left) / 0.00625);
    const y = Math.round((p.y + p.height / 2 - 0.012 - foot) / 0.00625);
    m.ball(x, y, 1.5, 1.6, 1.6, 1.5, color);
  }
  return { name, voxel: 0.00625, at: [left, foot, 0.05], model: m, wall: 'north', smooth: true };
}

export const passes = (): RoomObject => pins('passes', PASSES, C.red);
export const formulas = (): RoomObject => pins('formulas', [FORMULAS], C.denim);

/**
 * A wall shelf: a board `length` voxels long and `depth` deep, on two
 * brackets. With `riser`, a step that deep runs along the wall, to stand a
 * back row on.
 */
export function shelf(name: string, at: [number, number, number], length: number, depth = 4, riser = 0): RoomObject {
  const m = new VoxelModel(length, 4, depth);
  for (const x of [2, length - 3]) m.box(x, 0, 0, 1, 2, 1, C.walnut).box(x, 1, 1, 1, 1, depth - 2, C.walnut); // brackets
  m.box(0, 2, 0, length, 1, depth, C.honey).box(1, 3, 0, length - 2, 1, riser, C.walnut);
  return { name, voxel: 0.05, at, model: m, decor: true, wall: 'north' };
}

/** The neon sign, a prompt: ">" in magenta, "_" in cyan. 65 × 45 cm. */
export function neon(): RoomObject {
  const m = new VoxelModel(13, 9, 1);
  m.picture(
    0,
    0,
    0,
    ['m............', '.m...........', '..m..........', '...m.........', '....m........', '...m.........', '..m..........', '.m...........', 'm......cccccc'],
    { m: C.magenta | EMISSIVE, c: C.cyan | EMISSIVE },
  );
  return { name: 'neon', voxel: 0.05, at: [2.4, 2.2, 0], model: m, wall: 'north' };
}

/** Where the whiteboard hangs, and its writing surface inside one voxel of frame: centre, width and height in metres. */
const WHITEBOARD = { x: 4.5, y: 1.15 };
export const WHITEBOARD_SURFACE = { x: WHITEBOARD.x + 0.725, y: WHITEBOARD.y + 0.675, z: 0.05 + 0.002, width: 1.35, height: 1.25 };

/** Whiteboard above the cabinet, 1.45 × 1.35 m, with its tray. What is written on it is a texture. */
export function whiteboard(): RoomObject {
  const m = new VoxelModel(29, 27, 2);
  m.box(0, 0, 0, 29, 27, 1, C.silver).box(1, 1, 0, 27, 25, 1, C.paper);
  m.box(2, 0, 1, 25, 1, 1, C.steel); // tray
  return { name: 'whiteboard', voxel: 0.05, at: [WHITEBOARD.x, WHITEBOARD.y, 0], model: m, wall: 'north' };
}

/** The colours of the markers that lie in the tray. */
export const MARKERS: Swatch[] = ['ink', 'denim', 'red', 'leaf'];

/** A marker lying in the tray, the `i`-th from the left: a white barrel between a cap and an end of its colour. 10 cm. */
export function marker(color: Swatch, i: number): RoomObject {
  const m = new VoxelModel(8, 2, 2);
  m.box(0, 0, 0, 8, 2, 2, C.paper).box(0, 0, 0, 3, 2, 2, C[color]).box(7, 0, 0, 1, 2, 2, C[color]);
  return { name: `marker-${color}`, voxel: 0.0125, at: [WHITEBOARD.x + 0.25 + i * 0.3, WHITEBOARD.y + 0.05, 0.065], model: m, wall: 'north' };
}

/** The magnetic brush, stuck on the board under the drawing: a grip on a pad of felt. 12.5 cm. */
export function eraser(): RoomObject {
  const m = new VoxelModel(10, 4, 3);
  m.box(0, 0, 0, 10, 4, 1, C.graphite).box(0, 0, 1, 10, 4, 2, C.denim).box(1, 1, 2, 8, 2, 1, C.paper);
  return { name: 'eraser', voxel: 0.0125, at: [WHITEBOARD.x + 1.17, WHITEBOARD.y + 0.2, 0.055], model: m, wall: 'north' };
}
