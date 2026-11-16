/*
  The rug, the sakura and the small plants.
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

/** The middle of the pot of the sakura, on the floor: what falls from the tree lands around it. Metres. */
export const SAKURA_FOOT = { x: 5.8675, z: 0.22 };

/**
 * A sakura in a pot, in the corner right of the cabinet: a leaning trunk,
 * three branches and clouds of blossom, deeper pink underneath. Voxels of
 * 1.25 cm, shaded as round shapes: 1.25 m high.
 */
export function sakura(): RoomObject {
  const m = new VoxelModel(56, 104, 48);
  m.limb([39, 1, 16], [39, 12, 16], 9, 10.5, C.sage); // pot
  m.ball(39, 13.5, 16, 11.5, 2, 11.5, C.linen).ball(39, 14.5, 16, 9, 1.5, 9, C.walnut); // its rim, and the soil
  m.limb([39, 14, 16], [34, 40, 18], 3.6, 3, C.walnut).limb([34, 40, 18], [30, 62, 20], 3, 2.4, C.walnut); // trunk
  m.limb([33, 44, 18], [44, 68, 14], 2.2, 1.4, C.walnut).limb([31, 56, 19], [17, 74, 25], 2, 1.2, C.walnut).limb([30, 62, 20], [33, 86, 22], 2, 1.2, C.walnut);
  const clouds = [[30, 80, 22, 13], [44, 73, 15, 10], [17, 78, 26, 10], [35, 93, 21, 9], [23, 92, 24, 8.5], [41, 86, 27, 8], [22, 68, 16, 7.5], [36, 70, 30, 7]];
  for (const [x, y, z, r] of clouds) {
    m.ball(x, y, z, r, r * 0.85, r, C.blossom);
    m.paint(x - r * 0.3, y - r * 0.45, z + r * 0.2, r * 0.75, r * 0.5, r * 0.75, C.sakura);
    m.paint(x + r * 0.2, y + r * 0.5, z - r * 0.1, r * 0.45, r * 0.3, r * 0.45, C.paper);
  }
  return { name: 'sakura', voxel: 0.0125, at: [SAKURA_FOOT.x - 39.5 * 0.0125, 0, SAKURA_FOOT.z - 16.5 * 0.0125], model: m, smooth: true };
}

/** A small potted plant, 15 cm across. */
export function smallPlant(name: string, at: [number, number, number]): RoomObject {
  const m = new VoxelModel(6, 9, 6);
  m.box(1, 0, 1, 4, 3, 4, C.rust);
  leaves(m, 0, 3, 0, 6, 3);
  leaves(m, 1, 6, 1, 4, 3);
  return { name, voxel: 0.025, at, model: m, decor: true };
}
