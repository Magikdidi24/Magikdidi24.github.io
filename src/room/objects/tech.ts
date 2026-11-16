/*
  Right of the desk: the PC tower on the floor, and the low cabinet that
  carries the NAS, its UPS and the printer.
*/
import { EMISSIVE, VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';

/** A 4 × 4 fan seen face on: a glowing ring around a dark hub. `put` receives the two in-plane offsets. */
function fan(put: (a: number, b: number, color: number) => void, color: number): void {
  for (let a = 0; a < 4; a++) {
    for (let b = 0; b < 4; b++) {
      const hub = a > 0 && a < 3 && b > 0 && b < 3;
      put(a, b, hub ? C.ink : color | EMISSIVE);
    }
  }
}

/** The tower, 22 cm wide, 47 cm high, 45 cm deep, its open side towards the room. Voxels of 2.5 cm. */
export function pc(): RoomObject {
  const m = new VoxelModel(9, 19, 18);
  m.box(0, 0, 0, 9, 19, 18, C.graphite);
  m.box(2, 4, 1, 7, 14, 16, 0); // the open side: everything above the power supply shroud
  m.box(1, 4, 1, 1, 14, 16, C.plum); // motherboard
  m.box(2, 7, 2, 5, 2, 12, C.steel).box(6, 8, 3, 1, 1, 10, C.cyan | EMISSIVE); // graphics card and its light bar
  m.box(2, 12, 6, 3, 4, 4, C.steel); // processor cooler
  fan((a, b, color) => m.set(4, 12 + a, 6 + b, color), C.magenta);
  m.box(2, 12, 12, 2, 4, 1, C.violet | EMISSIVE).box(2, 12, 14, 2, 4, 1, C.violet | EMISSIVE); // memory
  /* Three fans behind the front panel. */
  [C.cyan, C.magenta, C.violet].forEach((color, i) => fan((a, b, c) => m.set(3 + b, 4 + i * 5 + a, 17, c), color));
  for (let z = 3; z < 15; z += 2) m.box(2, 18, z, 5, 1, 1, C.ink); // vents on top
  return { name: 'pc', voxel: 0.025, at: [4.05, 0, 0.3], model: m };
}

/** 1.2 m wide, 50 cm deep, 60 cm high, two doors. */
export function cabinet(): RoomObject {
  const m = new VoxelModel(24, 12, 11);
  for (const [x, z] of [[0, 0], [23, 0], [0, 9], [23, 9]]) m.box(x, 0, z, 1, 1, 1, C.walnut); // feet
  m.box(0, 1, 0, 24, 10, 10, C.honey);
  m.box(0, 11, 0, 24, 1, 10, C.oak); // top
  m.box(11, 1, 9, 2, 10, 1, C.walnut); // the gap between the doors
  m.box(9, 7, 10, 1, 2, 1, C.steel).box(14, 7, 10, 1, 2, 1, C.steel); // handles
  return { name: 'cabinet', voxel: 0.05, at: [4.5, 0, 0.05], model: m, decor: true };
}

/** The NAS, four bays, and the UPS beside it. Voxels of 2.5 cm. */
export function homelab(): RoomObject {
  const m = new VoxelModel(20, 10, 12);
  /* NAS: 25 cm wide, 20 cm high, 25 cm deep. */
  m.box(0, 0, 0, 10, 8, 10, C.graphite);
  for (const x of [1, 3, 5, 7]) {
    m.box(x, 1, 9, 1, 4, 1, C.steel); // a drive tray
    m.set(x, 5, 9, C.lime | EMISSIVE); // its light
  }
  m.set(7, 5, 9, C.amber | EMISSIVE); // one drive is busy
  m.box(1, 6, 9, 5, 1, 1, C.cyan | EMISSIVE); // the status display
  /* UPS: 15 cm wide, 25 cm high, 30 cm deep. */
  m.box(13, 0, 0, 6, 10, 12, C.steel);
  m.box(14, 6, 11, 4, 2, 1, C.ink).box(15, 7, 11, 2, 1, 1, C.lime | EMISSIVE); // its display
  m.set(14, 4, 11, C.amber | EMISSIVE);
  for (const y of [1, 2]) m.box(14, y, 11, 4, 1, 1, y % 2 ? C.ink : C.steel); // vents
  return { name: 'homelab', voxel: 0.025, at: [4.58, 0.6, 0.15], model: m };
}

/** 40 cm wide, with a sheet coming out of it. Voxels of 2.5 cm. */
export function printer(): RoomObject {
  const m = new VoxelModel(16, 8, 16);
  m.box(0, 0, 0, 16, 6, 13, C.linen);
  m.box(0, 6, 0, 16, 1, 13, C.stone); // scanner lid
  m.box(1, 4, 12, 14, 1, 1, C.graphite).set(13, 4, 12, C.lime | EMISSIVE); // control strip
  m.box(2, 2, 12, 12, 1, 1, C.ink); // output slot
  m.box(3, 2, 13, 10, 1, 3, C.paper); // the sheet
  return { name: 'printer', voxel: 0.025, at: [5.22, 0.6, 0.1], model: m };
}

/**
 * The sheet that the printer drops on the floor when it is clicked: "CV"
 * over a few lines of text. It stays hidden until then. A4, voxels of 1.25 cm.
 */
export function cvSheet(): RoomObject {
  const m = new VoxelModel(16, 1, 24);
  m.box(0, 0, 0, 16, 1, 24, C.paper);
  const ink = { k: C.ink };
  m.slices(1, 0, 2, [['.kkkk', 'kkkkk', 'kk...', 'kk...', 'kk...', 'kk...', 'kkkkk', '.kkkk']], ink); // C
  m.slices(7, 0, 2, [['kk....kk', 'kk....kk', '.kk..kk.', '.kk..kk.', '..kkkk..', '..kkkk..', '...kk...', '...kk...']], ink); // V
  for (const [z, width] of [[12, 13], [14, 10], [16, 13], [18, 7], [20, 11]]) m.box(1, 0, z, width, 1, 1, C.stone); // lines of text
  return { name: 'cv', voxel: 0.0125, at: [5, 0, 0.85], model: m, turn: 35, hidden: true };
}
