/*
  On the floor: the rug, and the sakura in its tray.
*/
import { mulberry32 } from '../../lib/photon/prng.ts';
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

/** The middle of the tray of the sakura, on the floor: what falls from the tree lands around it. Metres. */
export const SAKURA_FOOT = { x: 5.05, z: 3.25 };

/** How far the crown of the sakura reaches from its foot, and between which heights. Metres. */
export const SAKURA_CROWN = { reach: 0.55, from: 0.7, to: 1.45 };

type Point = [number, number, number];

/** Where the trunk bends, from the earth up, in voxels. */
const TRUNK: Point[] = [[36, 7, 34], [30, 20, 33], [39, 31, 36], [33, 43, 33], [37, 53, 35]];

/** The branches: where each one leaves the trunk or another branch, where it ends, and how thick it starts. */
const BRANCHES: [Point, Point, number][] = [
  [TRUNK[1], [16, 35, 29], 2],
  [[20, 31, 29], [10, 29, 38], 1.3],
  [TRUNK[2], [28, 41, 21], 1.6],
  [TRUNK[2], [53, 49, 28], 1.9],
  [[49, 46, 28], [59, 39, 38], 1.2],
  [[44, 41, 29], [45, 43, 44], 1.1],
  [TRUNK[3], [19, 50, 34], 1.6],
  [[24, 48, 33], [24, 43, 46], 1.1],
  [TRUNK[3], [40, 49, 19], 1.3],
  [TRUNK[4], [38, 57, 31], 1.6],
  [TRUNK[4], [49, 62, 39], 1.3],
  [TRUNK[4], [34, 66, 34], 1.1],
  [[33, 55, 33], [29, 59, 45], 1.1],
];

/**
 * A sakura grown as a large bonsai, in a shallow tray on the floor: a dark
 * trunk that twists as it rises, long branches, and at the end of each a
 * cloud of blossom made of small clumps, paler on top and deeper pink
 * underneath. Voxels of 2 cm, shaded as round shapes: 1.5 m high and 1.3 m
 * across.
 */
export function sakura(): RoomObject {
  const m = new VoxelModel(72, 80, 68);
  const random = mulberry32(12);
  const spread = (reach: number) => (random() - 0.5) * 2 * reach;
  const [cx, , cz] = TRUNK[0];

  /* The tray, the mound of earth in it, moss, a stone and blades of grass. */
  m.ball(cx, 2.5, cz, 17, 3.2, 12.5, C.graphite).box(0, 6, 0, 72, 4, 68, 0);
  m.ball(cx, 5, cz, 15, 1.4, 10.5, C.steel).ball(cx, 6, cz, 14, 3.8, 9.5, C.walnut);
  m.paint(cx - 6, 8, cz + 4, 6, 3, 4.5, C.moss).paint(cx + 7, 7.5, cz - 3, 5, 3, 4, C.moss).paint(cx + 1, 8, cz + 6, 4, 2, 3, C.sage);
  m.ball(cx + 9.5, 8, cz + 4.5, 3, 2.2, 2.6, C.stone);
  for (let blade = 0; blade < 14; blade++) {
    const angle = random() * 2 * Math.PI;
    const [x, z] = [cx + Math.cos(angle) * (6 + random() * 6), cz + Math.sin(angle) * (4.5 + random() * 4)];
    m.limb([x, 7, z], [x + spread(2.4), 11 + random() * 5, z + spread(2.4)], 0.7, 0.45, random() < 0.5 ? C.sage : C.leaf);
  }

  TRUNK.slice(1).forEach((to, i) => m.limb(TRUNK[i], to, 4.4 - i * 0.8, 3.7 - i * 0.8, C.walnut));
  m.ball(cx - 1, 8, cz + 0.5, 6, 2.6, 4.6, C.walnut); // its flare at the foot
  for (const [from, to, thick] of BRANCHES) m.limb(from, to, thick, thick * 0.55, C.walnut);
  for (const [x, y, z] of TRUNK.slice(0, 4)) m.paint(x + 2, y + 5, z + 2, 2, 6, 2, C.chestnut); // light on the bark

  /* A cloud of blossom around the end of each branch: clumps side by side, then their colours. */
  for (const [, [x, y, z], thick] of BRANCHES) {
    const reach = 6 + thick * 3.2;
    const clumps = Array.from({ length: 9 }, (): Point => [x + spread(reach), y + 3 + spread(1.8), z + spread(reach * 0.8)]);
    for (const [px, py, pz] of clumps) {
      const size = 3.3 + random() * 1.9;
      m.ball(px, py, pz, size, size * 0.62, size, C.blossom);
    }
    for (const [px, py, pz] of clumps) {
      m.paint(px, py - 2.2, pz, 4.5, 1.5, 4.5, C.sakura); // in its own shade underneath
      if (random() < 0.75) m.paint(px + spread(1.5), py + 2.2, pz + spread(1.5), 1.6 + random(), 1.2, 1.6 + random(), C.paper); // where the light falls
      if (random() < 0.5) m.paint(px + spread(2.5), py + 1.4, pz + spread(2.5), 1.1, 1, 1.1, C.sakura); // a darker flower
    }
  }
  return { name: 'sakura', voxel: 0.02, at: [SAKURA_FOOT.x - (cx + 0.5) * 0.02, 0, SAKURA_FOOT.z - (cz + 0.5) * 0.02], model: m, smooth: true };
}
