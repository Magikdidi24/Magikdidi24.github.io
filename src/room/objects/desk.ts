/*
  The desk against the back wall and what stands on it. Each item is its own
  object, so each gets its own outline.
*/
import { EMISSIVE, VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';

/** Where the desk stands, and the height of its top. */
const X = 1.7;
const Z = 0.05;
const TOP = 0.75;

/** 2.2 m wide, 80 cm deep, 75 cm high. Voxels of 5 cm. */
export function desk(): RoomObject {
  const m = new VoxelModel(44, 15, 16);
  m.box(0, 14, 0, 44, 1, 16, C.oak); // top
  m.box(14, 14, 8, 25, 1, 7, C.plum); // XXL mouse pad, set in the top
  for (const x of [1, 42]) {
    m.box(x, 0, 1, 1, 14, 1, C.graphite).box(x, 0, 14, 1, 14, 1, C.graphite); // legs
    m.box(x, 0, 1, 1, 1, 14, C.graphite); // feet
  }
  m.box(1, 11, 1, 42, 2, 1, C.graphite); // back beam
  m.box(3, 1, 3, 9, 13, 11, C.linen); // drawer unit
  for (const y of [5, 9]) m.box(3, y, 13, 9, 1, 1, C.stone); // gaps between its drawers
  for (const y of [3, 7, 11]) m.box(6, y, 14, 3, 1, 1, C.steel); // handles
  m.box(2, 13, 14, 40, 1, 1, C.cyan | EMISSIVE); // LED strip under the front edge
  return { name: 'desk', voxel: 0.05, at: [X, 0, Z], model: m };
}

/** A monitor: stand, panel and an LED strip behind it. The picture is a texture laid over the panel. */
function monitor(name: string, width: number, height: number, x: number): RoomObject {
  const m = new VoxelModel(width, height + 3, 4);
  const mid = Math.floor(width / 2);
  m.box(mid - 3, 0, 0, 6, 1, 4, C.steel); // foot
  m.box(mid - 1, 1, 1, 2, 2, 1, C.graphite); // neck
  m.box(0, 3, 1, width, height, 1, C.graphite); // panel
  m.box(2, 3 + height - 2, 0, width - 4, 1, 1, C.violet | EMISSIVE); // LED strip on the back
  return { name, voxel: 0.05, at: [x, TOP, Z + 0.1], model: m };
}

/** The picture area of a monitor, in the room: centre, width and height in metres. It faces +z. */
const screenSpot = (width: number, height: number, x: number) => ({
  x: x + (width * 0.05) / 2,
  y: TOP + (3 + height / 2) * 0.05,
  z: Z + 0.1 + 0.1 + 0.002, // just in front of the panel
  width: (width - 2) * 0.05, // one voxel of bezel all round
  height: (height - 2) * 0.05,
});

const MAIN = { width: 14, height: 8, x: X + 0.8 };
const SIDE = { width: 10, height: 7, x: X + 0.2 };

export const mainMonitor = (): RoomObject => monitor('monitor', MAIN.width, MAIN.height, MAIN.x);
export const sideMonitor = (): RoomObject => monitor('monitor-side', SIDE.width, SIDE.height, SIDE.x);
export const MAIN_SCREEN = screenSpot(MAIN.width, MAIN.height, MAIN.x);
export const SIDE_SCREEN = screenSpot(SIDE.width, SIDE.height, SIDE.x);

/** 40 cm keyboard with three rows of keys. Voxels of 2.5 cm. */
export function keyboard(): RoomObject {
  const m = new VoxelModel(16, 2, 6);
  m.box(0, 0, 0, 16, 1, 6, C.graphite);
  for (let z = 1; z < 5; z++) m.box(1, 1, z, 14, 1, 1, z % 2 ? C.stone : C.steel);
  m.box(4, 1, 4, 8, 1, 1, C.stone); // space bar
  return { name: 'keyboard', voxel: 0.025, at: [X + 0.95, TOP, Z + 0.5], model: m };
}

export function mouse(): RoomObject {
  const m = new VoxelModel(2, 2, 3);
  m.box(0, 0, 0, 2, 1, 3, C.graphite).box(0, 1, 0, 2, 1, 2, C.graphite);
  m.set(0, 1, 2, C.cyan | EMISSIVE).set(1, 1, 2, C.cyan | EMISSIVE);
  return { name: 'mouse', voxel: 0.025, at: [X + 1.5, TOP, Z + 0.52], model: m };
}
