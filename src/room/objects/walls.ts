/*
  What hangs on the back wall and on the left wall. It all goes when its wall
  is taken away, as the camera goes round the room. The clickable ones that
  wait for their content are plain for now.
*/
import { written } from '../../data/room.ts';
import { EMISSIVE, VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { Swatch } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';
import { WARDROBE } from './wardrobe.ts';

/** Where the row of frames hangs on the left wall. Metres. */
const FRAMES = { y: 1.25, z: 0.1 };

/**
 * One frame of the row above the bed, `z` metres along it: 40 × 30 cm when
 * wide, 30 × 40 cm otherwise. Each carries a paper, drawn as a texture, and
 * is its own object, to be clicked.
 */
function frame(name: string, z: number, wide: boolean): RoomObject {
  const [width, height] = wide ? [8, 6] : [6, 8];
  const m = new VoxelModel(1, height, width);
  m.box(0, 0, 0, 1, height, width, C.walnut).box(0, 1, 1, 1, height - 2, width - 2, C.paper);
  return { name, voxel: 0.05, at: [0, FRAMES.y + (wide ? 0.1 : 0.05), FRAMES.z + z], model: m, wall: 'west' };
}

/**
 * Where each frame hangs along the row, and whether it is wide. The opening
 * view shows the far end of the row on its left: read from there, they go
 * from the baccalaureate to the preparatory classes, the TOEIC certificate,
 * then EPITA.
 */
const ROW = { 'frame-bac': [1.15, true], 'frame-prepa': [0.8, false], 'frame-toeic': [0.35, true], 'frame-epita': [0, false] } as const;

export const frames = (): RoomObject[] => Object.entries(ROW).map(([name, [z, wide]]) => frame(name, z, wide));

/** The paper of a frame, facing the room: centre, width and height in metres. */
export function framed(name: keyof typeof ROW) {
  const [z, wide] = ROW[name];
  const [width, height] = wide ? [0.3, 0.2] : [0.2, 0.3];
  return { x: 0.05 + 0.002, y: FRAMES.y + 0.25, z: FRAMES.z + z + (wide ? 0.2 : 0.15), width, height };
}

/** Where the clipboard hangs: on the side of the wardrobe that faces the door. */
const CLIPBOARD = { x: 0.19, y: 1.1, z: WARDROBE.z + WARDROBE.width };

/** A board, a sheet under its clip, and a red pen down its side. What the sheet says is a texture. Voxels of 2.5 cm. */
export function clipboard(): RoomObject {
  const m = new VoxelModel(9, 14, 2);
  m.box(0, 0, 0, 9, 14, 1, C.chestnut).box(1, 1, 0, 7, 11, 1, C.paper);
  m.box(3, 12, 0, 3, 2, 1, C.steel); // clip
  m.box(8, 3, 1, 1, 7, 1, C.red).set(8, 2, 1, C.ink).set(8, 10, 1, C.graphite); // the pen: its tip down, its cap up
  return { name: 'clipboard', voxel: 0.025, at: [CLIPBOARD.x, CLIPBOARD.y, CLIPBOARD.z], model: m, wall: 'west' };
}

/** The sheet of the clipboard, facing the door: centre, width and height in metres. */
export const CLIPBOARD_SHEET = { x: CLIPBOARD.x + 0.1125, y: CLIPBOARD.y + 0.1625, z: CLIPBOARD.z + 0.025 + 0.002, width: 0.175, height: 0.275 };

/** Where the wall calendar hangs, above the nightstand: 30 × 40 cm. */
const CALENDAR = { x: 1.55, y: 1.35 };

/** The block of the calendar. Its page is a texture. Voxels of 2.5 cm. */
export function calendar(): RoomObject {
  const m = new VoxelModel(12, 16, 1);
  m.box(0, 0, 0, 12, 16, 1, C.paper).box(0, 15, 0, 12, 1, 1, C.red); // sheets, and what binds them
  return { name: 'calendar', voxel: 0.025, at: [CALENDAR.x, CALENDAR.y, 0], model: m, wall: 'north' };
}

export const CALENDAR_PAGE = { x: CALENDAR.x + 0.15, y: CALENDAR.y + 0.2, z: 0.025 + 0.002, width: 0.3, height: 0.4 };

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

/* What the pegboard carries for the open source work: a column of tags, a
   bonsai and a gem. Voxels of 6.25 mm. */
const FINER = 0.00625;

/** The tags: 15.6 cm by 4.4 cm each, one under the other. In voxels, and where the column starts on the pegboard, in metres. */
const TAG = { width: 25, height: 7, pitch: 10, x: 0.83, y: 0.355 };
const TAG_COUNT = 1 + written.merged.numbers.length;

/** Violet tags hung in a column, each on its peg: one that says what they are, then one for each pull request. What they say is a texture. */
export function badges(): RoomObject {
  const m = new VoxelModel(TAG.width, (TAG_COUNT - 1) * TAG.pitch + TAG.height + 1, 1);
  for (let i = 0; i < TAG_COUNT; i++) {
    m.box(0, i * TAG.pitch, 0, TAG.width, TAG.height, 1, C.violet);
    m.box(11, i * TAG.pitch + TAG.height, 0, 3, 1, 1, C.steel); // its peg
  }
  return { name: 'badges', voxel: FINER, at: [PEGBOARD.x + TAG.x, PEGBOARD.y + TAG.y, 0.05], model: m, wall: 'north' };
}

/** The face of each tag, from the top of the column down. */
export const TAGS = Array.from({ length: TAG_COUNT }, (_, i) => ({
  x: PEGBOARD.x + TAG.x + (TAG.width * FINER) / 2,
  y: PEGBOARD.y + TAG.y + ((TAG_COUNT - 1 - i) * TAG.pitch + TAG.height / 2) * FINER,
  z: 0.05 + FINER + 0.002,
  width: TAG.width * FINER,
  height: TAG.height * FINER,
}));

/** Where the bonsai stands on the pegboard: the left end and the underside of its ledge. */
const BONSAI = { x: 0.49, y: 0.085 };

/**
 * A bonsai on a ledge hooked to the pegboard: a blue pot, a trunk that leans
 * one way then the other, three pads of leaves. 22 cm high, shaded as round
 * shapes.
 */
export function bonsai(): RoomObject {
  const m = new VoxelModel(36, 38, 16);
  m.box(3, 0, 0, 30, 2, 14, C.honey); // ledge
  m.box(9, 2, 3, 18, 4, 9, C.denim).box(8, 6, 2, 20, 1, 11, C.denim).box(10, 6, 4, 16, 1, 7, C.walnut); // pot, its rim, the soil
  m.limb([19, 7, 8], [14, 15, 8], 2.3, 1.9, C.chestnut).limb([14, 15, 8], [21, 23, 8], 1.9, 1.4, C.chestnut); // trunk
  m.limb([14, 15, 8], [8, 19, 8], 1.3, 1, C.chestnut); // a low branch
  for (const [x, y, z, rx, ry, rz] of [[23, 28, 8, 9, 4.8, 7], [8, 22, 8, 6.5, 3.6, 6], [14, 33, 7, 6.5, 3.8, 5.5]]) {
    m.ball(x, y, z, rx, ry, rz, C.leaf).paint(x, y - ry * 0.55, z, rx, ry * 0.5, rz, C.moss); // a pad, darker underneath
  }
  return { name: 'bonsai', voxel: FINER, at: [PEGBOARD.x + BONSAI.x, PEGBOARD.y + BONSAI.y, 0.05], model: m, wall: 'north', smooth: true };
}

/** The label that hangs from the front edge of the ledge of the bonsai: one of its pixels is 4 mm. */
export const BONSAI_LABEL = { x: PEGBOARD.x + BONSAI.x + 0.1125, y: PEGBOARD.y + BONSAI.y - 0.018, z: 0.05 + 14 * FINER + 0.002, width: 0.196, height: 0.036 };

/**
 * A cut gem, 10 cm across, on its peg: a flat table, a crown that widens to
 * the girdle, then a long pavilion down to a point. Red, with a paler facet
 * on the side of the light and a darker one away from it.
 */
export function gem(): RoomObject {
  const m = new VoxelModel(16, 15, 8);
  for (let y = 0; y < 14; y++) {
    const half = y <= 10 ? 1 + Math.round((y / 10) * 7) : 8 - (y - 10);
    const deep = Math.max(1, Math.round(half / 2));
    m.box(8 - half, y, 4 - deep, 2 * half, 1, 2 * deep, C.red);
    m.box(8 - half, y, 4 - deep, Math.ceil(half / 2), 1, 2 * deep, y > 10 ? C.blossom : C.rust); // one facet of the side
    if (y > 10) m.box(8 + Math.floor(half / 2), y, 4 - deep, Math.ceil(half / 2), 1, 2 * deep, C.sakura);
  }
  m.box(6, 13, 2, 3, 1, 4, C.paper); // the light on its table
  m.box(7, 14, 0, 2, 1, 2, C.steel); // peg
  return { name: 'gem', voxel: FINER, at: [PEGBOARD.x + 0.77, PEGBOARD.y + 0.09, 0.05], model: m, wall: 'north' };
}

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
