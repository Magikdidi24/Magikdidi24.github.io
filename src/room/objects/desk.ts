/*
  The desk against the back wall, what stands on it, and the chair. Each
  clickable item is its own object, so each gets its own outline.
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
  return { name: 'desk', voxel: 0.05, at: [X, 0, Z], model: m, decor: true };
}

/** A monitor: stand, panel and an LED strip behind it. The picture is a texture laid over the panel. */
function monitor(width: number, height: number): VoxelModel {
  const m = new VoxelModel(width, height + 3, 4);
  const mid = Math.floor(width / 2);
  m.box(mid - 3, 0, 0, 6, 1, 4, C.steel); // foot
  m.box(mid - 1, 1, 1, 2, 2, 1, C.graphite); // neck
  m.box(0, 3, 1, width, height, 1, C.graphite); // panel
  m.box(2, 3 + height - 2, 0, width - 4, 1, 1, C.violet | EMISSIVE); // LED strip on the back
  return m;
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

export const mainMonitor = (): RoomObject => ({ name: 'monitor', voxel: 0.05, at: [MAIN.x, TOP, Z + 0.1], model: monitor(MAIN.width, MAIN.height) });
export const sideMonitor = (): RoomObject => ({ name: 'monitor-side', voxel: 0.05, at: [SIDE.x, TOP, Z + 0.1], model: monitor(SIDE.width, SIDE.height) });
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
  return { name: 'mouse', voxel: 0.025, at: [X + 1.5, TOP, Z + 0.52], model: m, decor: true };
}

/** A glass of orange juice with its straw, 10 cm across. */
export function juice(): RoomObject {
  const m = new VoxelModel(4, 8, 4);
  m.box(0, 0, 0, 4, 5, 4, C.amber); // the juice, seen through the glass
  m.box(0, 5, 0, 4, 1, 4, C.silver).box(1, 5, 1, 2, 1, 2, 0); // the rim above it
  for (const [x, z] of [[0, 0], [3, 0], [0, 3], [3, 3]]) m.box(x, 0, z, 1, 6, 1, 0); // round the corners
  m.box(2, 4, 1, 1, 4, 1, C.red); // straw
  return { name: 'juice', voxel: 0.025, at: [X + 1.72, TOP, Z + 0.55], model: m, decor: true };
}

/** Desk lamp: foot, pole, and a head that shines down on the desk. */
export function deskLamp(): RoomObject {
  const m = new VoxelModel(6, 13, 5);
  m.box(2, 0, 0, 4, 1, 5, C.steel); // foot
  m.box(4, 1, 2, 1, 10, 1, C.steel); // pole
  m.box(0, 10, 2, 5, 1, 1, C.steel); // arm
  m.box(0, 8, 1, 3, 2, 3, C.graphite); // head
  m.box(0, 7, 1, 3, 1, 3, C.amber | EMISSIVE); // bulb
  return { name: 'desk-lamp', voxel: 0.025, at: [X + 1.98, TOP, Z + 0.08], model: m, decor: true };
}

/** A small speaker, `x` metres from the left end of the desk. */
export function speaker(name: string, x: number): RoomObject {
  const m = new VoxelModel(4, 7, 4);
  m.box(0, 0, 0, 4, 7, 4, C.graphite);
  m.box(1, 1, 3, 2, 2, 1, C.steel); // woofer
  m.box(1, 4, 3, 2, 2, 1, C.stone); // tweeter
  return { name, voxel: 0.025, at: [X + x, TOP, Z + 0.1], model: m, decor: true };
}

/** Headphones hung on their stand. */
export function headphones(): RoomObject {
  const m = new VoxelModel(6, 11, 4);
  m.box(1, 0, 0, 4, 1, 4, C.steel); // foot
  m.box(2, 1, 1, 2, 8, 2, C.steel); // pole
  m.box(0, 9, 1, 6, 1, 2, C.teal); // headband
  m.box(0, 5, 1, 1, 4, 2, C.teal).box(5, 5, 1, 1, 4, 2, C.teal);
  m.box(0, 2, 0, 1, 4, 4, C.ink).box(5, 2, 0, 1, 4, 4, C.ink); // ear cups
  return { name: 'headphones', voxel: 0.025, at: [X + 1.76, TOP, Z + 0.1], model: m, decor: true };
}

/** Gaming-style chair on casters, pulled back from the desk and turned a little. 60 cm wide, 1.35 m high. */
export function chair(): RoomObject {
  const m = new VoxelModel(12, 27, 12);
  m.box(1, 1, 5, 10, 1, 2, C.steel).box(5, 1, 1, 2, 1, 10, C.steel); // star base
  for (const [x, z] of [[1, 5], [10, 5]]) m.box(x, 0, z, 1, 1, 2, C.ink); // a caster under the end of each arm
  for (const [x, z] of [[5, 1], [5, 10]]) m.box(x, 0, z, 2, 1, 1, C.ink);
  m.box(5, 2, 5, 2, 6, 2, C.steel); // column
  m.box(1, 8, 1, 10, 2, 10, C.teal); // seat
  m.box(1, 9, 1, 1, 1, 10, C.ink).box(10, 9, 1, 1, 1, 10, C.ink); // its side bolsters
  m.box(1, 10, 10, 10, 17, 2, C.teal); // backrest, on the far side from the desk
  m.box(5, 11, 10, 2, 14, 2, C.ink); // stripe down its middle
  m.box(1, 26, 10, 10, 1, 2, C.cyan); // piping along its top
  m.box(0, 19, 10, 1, 5, 2, C.teal).box(11, 19, 10, 1, 5, 2, C.teal); // shoulder wings
  for (const x of [0, 11]) m.box(x, 10, 5, 1, 2, 2, C.graphite).box(x, 12, 3, 1, 1, 6, C.graphite); // armrests
  return { name: 'chair', voxel: 0.05, at: [2.6, 0, 1.3], model: m, turn: 25 };
}
