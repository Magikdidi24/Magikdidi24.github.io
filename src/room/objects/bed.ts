/*
  The bed, along the left wall with its headboard against the back wall, the
  dog that sits on it, and the nightstand beside it.
*/
import { VoxelModel } from '../voxel/builder.ts';
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
 * Samuel's dog, sitting on the duvet: small, white and fluffy, with apricot
 * ears and tail, in its tan harness. It faces +z before its turn. Voxels of
 * 2.5 cm: 25 cm wide, 35 cm high.
 */
export function dog(): RoomObject {
  const m = new VoxelModel(10, 14, 14);
  const white = C.paper;
  m.box(4, 1, 0, 2, 5, 2, C.apricot).box(4, 5, 1, 2, 2, 2, C.apricot); // tail, a plume curled over the back
  m.box(2, 0, 2, 6, 6, 7, white); // haunches
  m.box(3, 5, 3, 4, 1, 4, C.apricot); // the patch on its back
  m.box(2, 3, 7, 6, 5, 4, white); // chest
  m.box(2, 6, 7, 6, 1, 4, C.honey); // harness
  for (const x of [2, 6]) m.box(x, 0, 9, 2, 3, 2, white).box(x, 0, 11, 2, 1, 1, white); // front legs and paws
  /* Head: a block with its upright edges trimmed, so it reads round. */
  m.box(1, 8, 6, 8, 6, 7, white);
  for (const [x, z] of [[1, 6], [8, 6], [1, 12], [8, 12]]) m.box(x, 8, z, 1, 6, 1, 0);
  for (const x of [0, 9]) m.box(x, 7, 7, 1, 6, 4, C.apricot); // ears, hanging lower than the jaw
  for (const x of [1, 8]) m.box(x, 13, 7, 1, 1, 4, C.apricot); // where they start
  m.box(3, 8, 13, 4, 3, 1, white).set(2, 8, 13, white).set(7, 8, 13, white); // muzzle, wider at the beard
  m.box(4, 10, 13, 2, 1, 1, C.ink); // nose
  m.box(4, 8, 13, 2, 1, 1, C.rust); // tongue
  m.set(3, 11, 12, C.ink).set(6, 11, 12, C.ink); // eyes
  return { name: 'dog', voxel: 0.025, at: [0.42, 0.5, 1.05], model: m, turn: 45 };
}

/** 40 cm square, 50 cm high, one drawer. */
export function nightstand(): RoomObject {
  const m = new VoxelModel(8, 10, 9);
  for (const [x, z] of [[0, 0], [7, 0], [0, 7], [7, 7]]) m.box(x, 0, z, 1, 2, 1, C.walnut); // legs
  m.box(0, 2, 0, 8, 7, 8, C.honey);
  m.box(0, 9, 0, 8, 1, 8, C.oak); // top
  m.box(1, 5, 7, 6, 1, 1, C.walnut); // the line under the drawer
  m.box(3, 7, 8, 2, 1, 1, C.steel); // its handle
  return { name: 'nightstand', voxel: 0.05, at: [1.1, 0, 0.05], model: m, decor: true };
}
