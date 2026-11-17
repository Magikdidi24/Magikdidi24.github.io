/*
  Right of the desk: the PC tower on the floor, and the low cabinet that
  carries the NAS, its UPS and the printer. Behind the two doors of the
  cabinet, old game consoles and their controllers, in a heap.
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

/** Where the cabinet stands: its left end and its back, in metres. */
const CABINET = { x: 4.4, z: 0.05 };

/** 1.2 m wide, 50 cm deep with its doors, 60 cm high: a hollow case. Voxels of 2.5 cm. */
export function cabinet(): RoomObject {
  const m = new VoxelModel(48, 24, 19);
  for (const [x, z] of [[0, 0], [46, 0], [0, 17], [46, 17]]) m.box(x, 0, z, 2, 2, 2, C.walnut); // feet
  m.box(0, 2, 0, 48, 20, 19, C.honey).box(1, 3, 1, 46, 18, 18, 0); // the case, open at the front
  m.box(0, 2, 0, 48, 20, 1, C.chestnut); // its back, darker
  m.box(0, 22, 0, 48, 2, 19, C.oak); // top
  return { name: 'cabinet', voxel: 0.025, at: [CABINET.x, 0, CABINET.z], model: m };
}

/**
 * One door of the cabinet, 60 cm wide. As for the wardrobe, the model is
 * twice as wide as the door: it turns around the edge it hangs by.
 */
function door(name: string, left: boolean): RoomObject {
  const m = new VoxelModel(48, 20, 3);
  const x = left ? 24 : 0;
  m.box(x, 0, 1, 24, 20, 1, C.honey);
  m.box(x + 2, 2, 1, 20, 16, 1, C.oak).box(x + 3, 3, 1, 18, 14, 1, C.honey); // moulding
  m.box(left ? x + 20 : x + 2, 11, 2, 2, 4, 1, C.steel); // handle, on the edge away from the hinge
  const hinge = CABINET.x + (left ? 0 : 1.2);
  return { name, voxel: 0.025, at: [hinge - 0.6, 0.05, CABINET.z + 0.45], model: m };
}

export const cabinetDoors = (): RoomObject[] => [door('cabinet-door-left', true), door('cabinet-door-right', false)];

/** The consoles of the heap in the cabinet, by the name of their object: the NES, the PlayStation, the GameCube, the Game Boy, the Wii and the Nintendo DS. Each one is switched on by a click; the rest of the heap is decor. */
export const CONSOLES = ['console-grey', 'console-black', 'console-cube', 'handheld', 'console-white', 'handheld-wide'];

/** One thing of the heap in the cabinet: built in voxels of 1.25 cm, set down at (x, y, z) metres from the corner of the cabinet, and turned. */
const heaped = (name: string, m: VoxelModel, x: number, y: number, z: number, turn: number): RoomObject => ({
  name,
  voxel: 0.0125,
  at: [CABINET.x + x, y, CABINET.z + z],
  model: m,
  turn,
  decor: !CONSOLES.includes(name),
});

/** A controller of the old kind: a flat brick with a cross and two round buttons, and the start of its cable. */
function brick(shell: number, buttons: number): VoxelModel {
  const m = new VoxelModel(11, 3, 6);
  m.box(0, 0, 1, 11, 2, 5, shell);
  m.box(1, 2, 3, 3, 1, 1, C.ink).box(2, 2, 2, 1, 1, 3, C.ink); // cross
  m.box(7, 2, 3, 1, 1, 1, buttons).box(9, 2, 3, 1, 1, 1, buttons);
  m.box(5, 2, 4, 1, 1, 1, C.graphite); // start
  m.box(5, 1, 0, 1, 1, 1, C.ink); // cable
  return m;
}

/**
 * Old game consoles and controllers, thrown in rather than put away: a NES,
 * a PlayStation, a GameCube, a Wii, a Game Boy and a Nintendo DS, each
 * reduced to its shape and its colours, without its maker's mark, and what
 * goes with them. Each console has a light, or a screen, that comes on when
 * it is switched on. Their names under the pointer are in src/data/room.ts.
 */
export function consoles(): RoomObject[] {
  /* The NES: two-tone grey case, a flap for the cartridge, two red buttons on its front. */
  const grey = new VoxelModel(22, 7, 17);
  grey.box(0, 0, 0, 22, 3, 17, C.taupe).box(0, 3, 0, 22, 3, 17, C.stone);
  grey.box(3, 6, 4, 14, 1, 8, C.silver).box(4, 6, 5, 12, 1, 6, C.graphite); // flap
  grey.box(2, 1, 16, 3, 1, 1, C.red).box(6, 1, 16, 3, 1, 1, C.red).box(15, 1, 16, 5, 1, 1, C.ink).set(20, 1, 16, C.red | EMISSIVE);

  /* The PlayStation: light grey and flat, a round lid for the disc, a button at each front corner, a green light. */
  const black = new VoxelModel(22, 5, 19);
  black.box(0, 0, 0, 22, 4, 19, C.silver);
  black.ball(11, 4, 9, 7.5, 1, 7.5, C.stone);
  black.box(2, 4, 16, 4, 1, 2, C.stone).box(16, 4, 16, 4, 1, 2, C.stone).set(18, 4, 15, C.lime | EMISSIVE);
  for (let x = 3; x < 20; x += 2) black.box(x, 1, 18, 1, 2, 1, C.steel); // vents

  /* The GameCube: an indigo cube with a handle at the back and a round lid. */
  const cube = new VoxelModel(13, 13, 15);
  cube.box(0, 0, 2, 13, 11, 13, C.night);
  cube.ball(6.5, 11, 8.5, 4.5, 1, 4.5, C.steel);
  cube.box(3, 4, 0, 7, 5, 2, C.graphite).box(4, 5, 0, 5, 3, 2, 0); // handle
  cube.box(2, 3, 14, 9, 1, 1, C.ink).set(11, 9, 14, C.amber | EMISSIVE);

  /* The Game Boy: a grey slab held upright, a screen that went green, a cross, two buttons. */
  const handheld = new VoxelModel(8, 3, 13);
  handheld.box(0, 0, 0, 8, 2, 13, C.stone);
  handheld.box(1, 2, 1, 6, 1, 5, C.taupe).box(2, 2, 2, 4, 1, 3, C.lime | EMISSIVE);
  handheld.box(1, 2, 9, 3, 1, 1, C.ink).box(2, 2, 8, 1, 1, 3, C.ink);
  handheld.set(5, 2, 9, C.rust).set(6, 2, 8, C.rust);

  /* The Wii: white, with a slot across its front and a blue light. */
  const white = new VoxelModel(20, 5, 16);
  white.box(0, 0, 0, 20, 1, 16, C.silver).box(0, 1, 0, 20, 3, 16, C.paper);
  white.box(2, 2, 15, 11, 1, 1, C.graphite).set(17, 2, 15, C.cyan | EMISSIVE);
  white.box(14, 4, 3, 4, 1, 4, C.silver); // vent

  /* The Nintendo DS, left open: a screen in the lid that stands up, another in the base between a cross and four buttons. */
  const wide = new VoxelModel(11, 7, 8);
  wide.box(0, 0, 2, 11, 1, 6, C.silver).box(0, 0, 0, 11, 7, 2, C.silver); // base, then the lid behind it
  wide.box(1, 1, 1, 9, 5, 1, C.ink).box(2, 2, 1, 7, 3, 1, C.cyan | EMISSIVE); // the screen of the lid
  wide.box(3, 0, 3, 5, 1, 4, C.ink).box(4, 0, 4, 3, 1, 2, C.cyan | EMISSIVE); // the screen of the base
  for (const [x, z] of [[1, 4], [1, 5], [1, 6], [0, 5], [2, 5]]) wide.set(x, 0, z, C.graphite); // cross
  for (const [x, z] of [[9, 4], [9, 6], [8, 5], [10, 5]]) wide.set(x, 0, z, C.steel); // buttons
  wide.box(0, 0, 2, 11, 1, 1, C.steel); // hinge

  /* Cartridges in a pile, each with its label. */
  const cartridges = new VoxelModel(7, 7, 6);
  [C.red, C.mustard, C.denim, C.leaf, C.violet, C.paper].forEach((label, i) => {
    const x = i % 2;
    cartridges.box(x, i, 0, 6, 1, 6, C.taupe).box(x + 1, i, 5, 4, 1, 1, label);
  });

  /* Cables, left as they fell. */
  const cables = new VoxelModel(40, 6, 20);
  cables.limb([2, 1, 4], [14, 1, 16], 0.9, 0.9, C.ink).limb([14, 1, 16], [26, 1, 5], 0.9, 0.9, C.ink).limb([26, 1, 5], [37, 1, 14], 0.9, 0.9, C.ink);
  cables.limb([6, 1, 15], [20, 2.5, 9], 0.8, 0.8, C.graphite).limb([20, 2.5, 9], [33, 1, 17], 0.8, 0.8, C.graphite);

  /* The heap: the larger ones at the bottom, the rest on top of them or in front, where the open doors show it. */
  const floor = 0.075;
  const on = (voxels: number) => floor + voxels * 0.0125;
  return [
    heaped('cables', cables, 0.3, floor, 0.2, -6),
    heaped('console-grey', grey, 0.05, floor, 0.2, 9),
    heaped('console-black', black, 0.1, on(7), 0.18, -17),
    heaped('handheld', handheld, 0.2, on(12), 0.25, 30),
    heaped('cartridges', cartridges, 0.38, floor, 0.38, 14),
    heaped('console-cube', cube, 0.5, floor, 0.22, 24),
    heaped('controller-cube', brick(C.stone, C.red), 0.52, on(13), 0.28, -35),
    heaped('controller-floor', brick(C.graphite, C.stone), 0.66, floor, 0.36, 38), // clear of the door when it is shut
    heaped('console-white', white, 0.8, floor, 0.2, 12),
    heaped('controller-right', brick(C.paper, C.denim), 0.95, on(5), 0.2, -48),
    heaped('handheld-wide', wide, 0.8, on(5), 0.26, -14), // on the white one, open towards the doors
  ];
}

/** Where the NAS and its UPS stand, on the cabinet. */
const HOMELAB = { x: CABINET.x + 0.08, y: 0.6, z: 0.15 };

/** The NAS, four bays, and the UPS beside it. Voxels of 2.5 cm. */
export function homelab(): RoomObject {
  const m = new VoxelModel(20, 10, 12);
  /* NAS: 25 cm wide, 20 cm high, 25 cm deep. */
  m.box(0, 0, 0, 10, 8, 10, C.graphite);
  for (const x of [1, 3, 5, 7]) {
    m.box(x, 1, 9, 1, 4, 1, C.steel); // a drive tray
    m.set(x, 5, 9, C.cyan | EMISSIVE); // its blue light
  }
  m.box(1, 6, 9, 3, 1, 1, C.lime | EMISSIVE).set(7, 6, 9, C.amber | EMISSIVE); // power, and a warning that stays on
  /* UPS: 15 cm wide, 25 cm high, 30 cm deep. */
  m.box(13, 0, 0, 6, 10, 12, C.steel);
  m.box(14, 6, 11, 4, 2, 1, C.ink); // its display: what it shows is a texture
  m.set(14, 4, 11, C.amber | EMISSIVE);
  for (const y of [1, 2]) m.box(14, y, 11, 4, 1, 1, y % 2 ? C.ink : C.steel); // vents
  return { name: 'homelab', voxel: 0.025, at: [HOMELAB.x, HOMELAB.y, HOMELAB.z], model: m };
}

/** The display of the UPS, facing the room: centre, width and height in metres. */
export const UPS_DISPLAY = { x: HOMELAB.x + 0.4, y: HOMELAB.y + 0.175, z: HOMELAB.z + 0.3 + 0.0015, width: 0.1, height: 0.05 };

/** 40 cm wide, with a sheet coming out of it. Voxels of 2.5 cm. */
export function printer(): RoomObject {
  const m = new VoxelModel(16, 8, 16);
  m.box(0, 0, 0, 16, 6, 13, C.linen);
  m.box(0, 6, 0, 16, 1, 13, C.stone); // scanner lid
  m.box(1, 4, 12, 14, 1, 1, C.graphite).set(13, 4, 12, C.lime | EMISSIVE); // control strip
  m.box(2, 2, 12, 12, 1, 1, C.ink); // output slot
  m.box(3, 2, 13, 10, 1, 3, C.paper); // the sheet
  return { name: 'printer', voxel: 0.025, at: [CABINET.x + 0.72, 0.6, 0.1], model: m };
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
  return { name: 'cv', voxel: 0.0125, at: [CABINET.x + 0.5, 0, 0.85], model: m, turn: 35, hidden: true };
}
