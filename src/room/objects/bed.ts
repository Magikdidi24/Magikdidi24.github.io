/*
  The bed, along the left wall with its headboard against the back wall, the
  cat that sleeps on it, and the nightstand beside it.
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

/** A cat loaf, head towards the foot of the bed. Voxels of 2.5 cm: 25 cm wide, 40 cm long. */
export function cat(): RoomObject {
  const legend = { o: C.cat, r: C.rust, w: C.paper, k: C.ink };
  const body = (tail: string, paws: string) => [
    '...oooo...',
    '..oooooo..',
    ...Array.from({ length: 7 }, () => `..oooooo${tail}.`),
    `..oooooo${tail === 'o' ? 'w' : '.'}.`,
    ...Array.from({ length: 4 }, () => '..oooooo..'),
    paws,
    '..........',
  ];
  /* The sides of the back, striped where the top is. */
  const flank = [
    '...oooo...',
    '..oooooo..',
    '..oooooo..',
    '..roooor..',
    '..oooooo..',
    '..oooooo..',
    '..roooor..',
    '..oooooo..',
    '..oooooo..',
    '..roooor..',
    '..oooooo..',
    '..oooooo..',
    '..oooooo..',
    '..oooooo..',
    '..........',
    '..........',
  ];
  const head = (front: string) => [
    ...Array.from({ length: 11 }, () => '..........'),
    ...Array.from({ length: 4 }, () => '..oooooo..'),
    front,
  ];
  const m = new VoxelModel(10, 11, 16);
  m.slices(0, 0, 0, [body('o', '...w..w...'), body('o', '..........'), flank, flank, flank], legend);
  m.slices(0, 5, 0, [
    [
      '..........',
      '...oooo...',
      '...oooo...',
      '...rrrr...',
      '...oooo...',
      '...oooo...',
      '...rrrr...',
      '...oooo...',
      '...oooo...',
      '...rrrr...',
      '...oooo...',
    ],
  ], legend);
  m.slices(0, 3, 0, [
    head('...wwww...'),
    head('..owwwwo..'),
    head('..oorroo..'),
    head('..okooko..'),
    head('..oorroo..'),
    [...Array.from({ length: 11 }, () => '..........'), '...oooo...', '..oorroo..', '..oorroo..', '..oooooo..', '...oooo...'],
    [...Array.from({ length: 13 }, () => '..........'), '..oo..oo..'],
    [...Array.from({ length: 13 }, () => '..........'), '..o....o..'],
  ], legend);
  return { name: 'cat', voxel: 0.025, at: [0.4, 0.5, 0.95], model: m };
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
