/*
  The bed, along the left wall with its headboard against the back wall, the
  dog on it, and the nightstand beside it with its lamp and the book being
  read.
*/
import { EMISSIVE, VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';

/** 1 m wide, 2.05 m long. The headboard stops at 80 cm, under the window sill. Voxels of 5 cm. */
export function bed(): RoomObject {
  const m = new VoxelModel(20, 16, 41);
  m.box(0, 0, 0, 20, 16, 1, C.walnut); // headboard, down to the floor
  for (const [x, z] of [[0, 1], [18, 1], [0, 38], [18, 38]]) m.box(x, 0, z, 2, 3, 2, C.walnut); // legs
  m.box(0, 3, 1, 20, 3, 39, C.chestnut); // frame
  m.box(0, 3, 40, 20, 5, 1, C.chestnut); // footboard
  m.box(1, 6, 1, 18, 3, 39, C.linen); // mattress
  m.box(4, 9, 2, 12, 2, 6, C.paper); // pillow, corners rounded
  for (const [x, z] of [[4, 2], [15, 2], [4, 7], [15, 7]]) m.set(x, 10, z, 0);
  m.box(0, 6, 11, 20, 4, 29, C.rust); // duvet, hanging over the sides
  m.box(0, 9, 10, 20, 2, 3, C.paper); // sheet folded back over it
  /* Pixel pattern on the duvet: mustard squares and denim dots, in staggered rows. */
  for (let z = 15; z < 39; z += 4) {
    const odd = ((z - 15) / 4) % 2;
    for (let x = 2 + odd * 3; x < 18; x += 6) {
      m.box(x, 9, z, 2, 1, 2, C.mustard);
      if (x + 3 < 19) m.set(x + 3, 9, z + 2, C.denim);
    }
  }
  return { name: 'bed', voxel: 0.05, at: [0.05, 0, 0.05], model: m, decor: true };
}

/**
 * Elfy, Samuel's dog, curled up on the duvet with his chin on his paws:
 * small, white and fluffy, apricot ears and tail. He faces +z before his
 * turn. Voxels of 6.25 mm, a quarter of the usual ones: 40 cm across.
 */
export function dog(): RoomObject {
  const m = new VoxelModel(64, 32, 64);
  const white = C.paper;
  /* The body, a crescent open towards the front: hindquarters, back, shoulders, and the belly that closes it. */
  m.ball(20, 9, 30, 15, 11, 15, white).ball(32, 10, 22, 16, 11.5, 13, white).ball(44, 10, 30, 14, 11.5, 14, white);
  m.ball(32, 6, 32, 20, 7, 14, white);
  m.paint(23, 20, 26, 10, 6, 8, C.apricot).paint(41, 21, 25, 6, 5, 5, C.apricot); // patches on the back
  /* The tail, a plume brought round to the front, and a hind paw under it. */
  m.limb([9, 6, 34], [14, 5, 50], 5.5, 5, C.apricot).limb([14, 5, 50], [26, 4.5, 56], 5, 3.5, C.apricot);
  m.ball(28, 4.5, 56, 4, 3.5, 3.5, white);
  m.limb([20, 2.5, 44], [27, 2.5, 49], 3, 2.6, white);
  /* Front paws, then the head resting on them. */
  m.limb([36, 2.5, 52], [35, 2.5, 61], 3.2, 2.8, white).limb([46, 2.5, 52], [47, 2.5, 61], 3.2, 2.8, white);
  m.ball(41, 12, 46, 10.5, 9.5, 10, white).ball(41, 19, 44, 8, 4.5, 7, white); // skull and the mop on top
  m.ball(34, 9, 50, 4.5, 5, 5, white).ball(48, 9, 50, 4.5, 5, 5, white); // cheeks
  m.ball(41, 8.5, 55, 5.5, 4.8, 5, white); // muzzle
  for (const x of [30.5, 51.5]) m.ball(x, 11, 45, 3.5, 8.5, 6.5, C.apricot); // ears, hanging
  m.paint(33, 18, 44, 4.5, 4, 6, C.apricot).paint(49, 18, 44, 4.5, 4, 6, C.apricot); // where they start
  m.ball(41, 10.5, 59.6, 2.4, 1.9, 1.8, C.ink); // nose
  for (const x of [36.5, 45.5]) m.paint(x, 13.5, 54.5, 1.7, 1.7, 2.5, C.ink); // eyes
  return { name: 'dog', voxel: 0.00625, at: [0.32, 0.5, 0.9], model: m, turn: 45, smooth: true };
}

/** Where the nightstand stands, and the height of its top. */
const NIGHTSTAND = { x: 1.1, z: 0.05, top: 0.5 };

/** 40 cm square, 50 cm high, one drawer. */
export function nightstand(): RoomObject {
  const m = new VoxelModel(8, 10, 9);
  for (const [x, z] of [[0, 0], [7, 0], [0, 7], [7, 7]]) m.box(x, 0, z, 1, 2, 1, C.walnut); // legs
  m.box(0, 2, 0, 8, 7, 8, C.honey);
  m.box(0, 9, 0, 8, 1, 8, C.oak); // top
  m.box(1, 5, 7, 6, 1, 1, C.walnut); // the line under the drawer
  m.box(3, 7, 8, 2, 1, 1, C.steel); // its handle
  return { name: 'nightstand', voxel: 0.05, at: [NIGHTSTAND.x, 0, NIGHTSTAND.z], model: m, decor: true };
}

/** Bedside lamp at the back of the nightstand: a round foot, a stem and a shade that glows. 35 cm high. */
export function lamp(): RoomObject {
  const m = new VoxelModel(7, 14, 7);
  m.box(1, 0, 2, 5, 1, 3, C.walnut).box(2, 0, 1, 3, 1, 5, C.walnut); // foot
  m.box(3, 1, 3, 1, 7, 1, C.honey); // stem
  m.box(0, 7, 0, 7, 4, 7, C.amber | EMISSIVE).box(1, 11, 1, 5, 3, 5, C.amber | EMISSIVE); // shade, narrower at the top
  m.box(0, 7, 0, 7, 1, 7, C.honey).box(1, 13, 1, 5, 1, 5, C.honey); // its two rims
  for (const [x, z] of [[0, 0], [6, 0], [0, 6], [6, 6]]) m.box(x, 7, z, 1, 4, 1, 0); // its corners rounded
  m.box(1, 7, 1, 5, 1, 5, 0).box(2, 13, 2, 3, 1, 3, 0); // open at both ends
  return { name: 'lamp', voxel: 0.025, at: [NIGHTSTAND.x + 0.03, NIGHTSTAND.top, NIGHTSTAND.z + 0.04], model: m };
}

/**
 * The book being read, lying in front of the lamp with a ribbon between its
 * pages: a thick green hardback with a tiger on its cover. 20 x 25 cm.
 */
export function book(): RoomObject {
  const m = new VoxelModel(8, 3, 12);
  m.box(0, 0, 0, 8, 3, 10, C.moss); // covers and spine
  m.box(1, 1, 0, 7, 1, 10, C.paper); // pages, on the three open sides
  m.box(2, 2, 1, 4, 1, 2, C.paper); // title
  m.box(2, 2, 4, 4, 1, 4, C.amber); // the tiger
  for (const [x, z] of [[2, 5], [4, 5], [3, 7], [5, 7]]) m.set(x, 2, z, C.ink); // its stripes
  m.box(5, 1, 10, 1, 1, 2, C.red).set(5, 0, 11, C.red); // bookmark
  return { name: 'book', voxel: 0.025, at: [NIGHTSTAND.x + 0.18, NIGHTSTAND.top, NIGHTSTAND.z + 0.09], model: m, turn: 8, decor: true };
}
