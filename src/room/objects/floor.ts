/*
  The rug and the plants.
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
  return { name: 'rug', voxel: 0.025, at: [1.6, 0, 1.15], model: m, decor: true };
}

/** A blob of leaves, speckled with a darker green and trimmed at its corners. */
function leaves(m: VoxelModel, x: number, y: number, z: number, size: number, height: number): void {
  for (let j = 0; j < height; j++) {
    for (let k = 0; k < size; k++) {
      for (let i = 0; i < size; i++) {
        const corner = (i === 0 || i === size - 1) && (k === 0 || k === size - 1);
        if (corner && (j === 0 || j === height - 1)) continue;
        m.set(x + i, y + j, z + k, (i + j * 2 + k * 3) % 4 === 0 ? C.moss : C.leaf);
      }
    }
  }
}

/** Floor plant, 1.1 m high, in the corner right of the cabinet. */
export function bigPlant(): RoomObject {
  const m = new VoxelModel(7, 22, 7);
  m.box(1, 0, 1, 5, 4, 5, C.sage).box(1, 4, 1, 5, 1, 5, C.linen).box(2, 4, 2, 3, 1, 3, C.walnut); // pot, rim, soil
  m.box(3, 5, 3, 1, 6, 1, C.moss); // stem
  leaves(m, 1, 10, 1, 5, 4);
  leaves(m, 0, 13, 2, 4, 3);
  leaves(m, 3, 14, 0, 4, 4);
  leaves(m, 2, 17, 2, 3, 4);
  return { name: 'plant', voxel: 0.05, at: [5.72, 0, 0.05], model: m, decor: true };
}

/** A small potted plant, 15 cm across. */
export function smallPlant(name: string, at: [number, number, number]): RoomObject {
  const m = new VoxelModel(6, 9, 6);
  m.box(1, 0, 1, 4, 3, 4, C.rust);
  leaves(m, 0, 3, 0, 6, 3);
  leaves(m, 1, 6, 1, 4, 3);
  return { name, voxel: 0.025, at, model: m, decor: true };
}
