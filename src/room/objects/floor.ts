/*
  On the floor: the rug.
*/
import { VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';

/** 2.6 × 1.95 m, a lattice on sage with a border and fringes. Voxels of 2.5 cm, one layer. */
export function rug(): RoomObject {
  const width = 104;
  const depth = 78;
  const m = new VoxelModel(width, 1, depth);
  for (let z = 0; z < depth; z++) {
    for (let x = 0; x < width; x++) {
      const edge = Math.min(x, z, width - 1 - x, depth - 1 - z);
      let color: number = C.sage;
      if ((x + z) % 16 === 0 || (x - z + 160) % 16 === 0) color = C.teal; // lattice
      if (x % 16 === 8 && z % 16 === 0) color = C.mustard; // a dot in each diamond
      if (edge < 6) color = C.linen; // border
      if (edge === 3) color = C.teal;
      if (x < 2 || x > width - 3) color = z % 2 ? 0 : C.paper; // fringe on the short sides
      m.set(x, 0, z, color);
    }
  }
  return { name: 'rug', voxel: 0.025, at: [1.7, 0, 1.2], model: m, decor: true };
}
