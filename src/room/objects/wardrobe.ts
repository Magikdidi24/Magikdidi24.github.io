/*
  The wardrobe against the left wall, between the foot of the bed and the
  door: brown wood, two doors that open on a rail of clothes, shelves and
  boxes. On top of it, a bucket of fried chicken on its tripod, kept as a
  trophy, and an orange warning light.
*/
import { EMISSIVE, VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';

/** Where it stands, in metres: against the left wall, `z` along it. */
export const WARDROBE = { z: 2.25, width: 1, depth: 0.6, height: 2 } as const;

/**
 * How far each door of the room swings open, in degrees. A door hinged on
 * the side of the camera opens wide, until it is seen edge on: at a right
 * angle it would stand in front of what it has just uncovered.
 */
export const DOORS: Record<string, number> = {
  'wardrobe-door-north': 90,
  'wardrobe-door-south': -135,
  'cabinet-door-left': -90,
  'cabinet-door-right': 135,
};

/** What hangs on the rail, from the back wall to the door: a colour, a length in voxels, and a second colour for stripes. */
const CLOTHES: [number, number, number?][] = [
  [C.paper, 26],
  [C.denim, 24],
  [C.graphite, 28],
  [C.linen, 22, C.denim],
  [C.sage, 24],
  [C.rust, 26],
  [C.paper, 22, C.red],
  [C.plum, 28],
  [C.stone, 24],
  [C.night, 26],
  [C.mustard, 22],
  [C.teal, 27],
];

/** 1 m wide, 60 cm deep with its doors, 2 m high. Voxels of 2.5 cm; x is its depth. */
export function wardrobe(): RoomObject {
  const m = new VoxelModel(23, 80, 40);
  m.box(0, 0, 0, 22, 3, 40, C.walnut); // plinth, set back
  m.box(0, 3, 0, 23, 77, 40, C.chestnut).box(1, 4, 1, 22, 75, 38, 0); // the case, hollow
  m.box(0, 3, 0, 1, 77, 40, C.honey); // its back, paler
  for (const y of [14, 26, 66]) m.box(1, y, 1, 21, 1, 38, C.honey); // shelves
  m.box(11, 63, 1, 1, 1, 38, C.silver); // rail

  CLOTHES.forEach(([color, length, stripe], k) => {
    const z = 2 + k * 3;
    m.set(11, 62, z, C.silver); // hanger
    m.box(3, 61 - length, z, 18, length, 3, color); // side by side: nothing shows between two of them
    for (const x of [3, 4, 19, 20]) m.box(x, 60, z, 1, 1, 3, 0); // shoulders
    for (const x of [3, 20]) m.box(x, 59, z, 1, 1, 3, 0);
    if (stripe) for (let y = 59 - length + 3; y < 59; y += 3) m.box(3, y, z, 18, 1, 3, stripe);
  });

  /* Under the clothes: two pairs of shoes, toes to the room, and three small boxes. */
  for (const [z, color, sole] of [[3, C.walnut, C.ink], [7, C.walnut, C.ink], [12, C.paper, C.red], [16, C.paper, C.red]]) {
    m.box(13, 27, z, 8, 2, 3, color).box(13, 27, z, 8, 1, 3, sole).box(13, 29, z, 4, 1, 3, color);
  }
  for (const z of [21, 27, 33]) m.box(8, 27, z, 13, 5, 5, C.linen).box(8, 31, z, 13, 1, 5, C.stone).box(20, 28, z + 1, 1, 2, 3, C.paper);

  /* Folded clothes, in piles. */
  const folded = [C.denim, C.paper, C.rust, C.sage, C.graphite, C.mustard, C.linen, C.plum, C.teal, C.stone];
  for (let pile = 0; pile < 4; pile++) {
    const height = [5, 4, 5, 3][pile];
    for (let layer = 0; layer < height; layer++) m.box(7, 15 + layer * 2, 3 + pile * 9, 14, 2, 7, folded[(pile * 3 + layer) % folded.length]);
  }

  /* Two large boxes at the bottom, then what is stored at the top. */
  for (const z of [3, 21]) {
    m.box(5, 4, z, 16, 9, 16, C.stone).box(5, 11, z, 16, 2, 16, C.taupe);
    m.box(20, 6, z + 5, 1, 3, 6, C.paper);
  }
  m.box(6, 67, 3, 15, 9, 13, C.linen).box(6, 74, 3, 15, 2, 13, C.stone);
  m.box(7, 67, 18, 14, 3, 18, C.rust).box(7, 70, 18, 14, 3, 18, C.mustard).box(7, 73, 19, 14, 2, 16, C.denim);
  return { name: 'wardrobe', voxel: 0.025, at: [0, 0, WARDROBE.z], model: m, wall: 'west' };
}

/**
 * One door of the wardrobe: a panel with its moulding and a brass handle.
 * The model is twice as wide as the door, so that its centre, around which an
 * object turns, is the edge the door hangs by.
 */
function door(name: string, north: boolean): RoomObject {
  const m = new VoxelModel(3, 76, 40);
  const z = north ? 20 : 0;
  m.box(1, 0, z, 1, 76, 20, C.oak);
  for (const [y, height] of [[3, 30], [36, 37]]) m.box(1, y, z + 3, 1, height, 14, C.chestnut).box(1, y + 1, z + 4, 1, height - 2, 12, C.oak);
  m.box(2, 34, north ? z + 16 : z + 2, 1, 5, 2, C.mustard); // handle, on the edge away from the hinge
  const hinge = WARDROBE.z + (north ? 0 : WARDROBE.width);
  return { name, voxel: 0.025, at: [WARDROBE.depth - 0.05, 0.075, hinge - 0.5], model: m, wall: 'west' };
}

export const wardrobeDoors = (): RoomObject[] => [door('wardrobe-door-north', true), door('wardrobe-door-south', false)];

/**
 * A paper bucket of fried chicken on a tripod, on top of the wardrobe: red
 * and white stripes, no name on it. Voxels of 1.25 cm, shaded as a round
 * shape: 55 cm high.
 */
export function tripod(): RoomObject {
  const m = new VoxelModel(28, 46, 28);
  const middle = 14;
  for (let leg = 0; leg < 3; leg++) {
    const angle = (leg / 3) * 2 * Math.PI + 0.5;
    m.limb([middle, 27, middle], [middle + Math.cos(angle) * 11, 0.5, middle + Math.sin(angle) * 11], 1.1, 1, C.silver);
  }
  m.ball(middle, 27, middle, 3, 2, 3, C.graphite); // where the legs meet
  /* The bucket widens towards its rim; its stripes turn around it. */
  for (let y = 29; y < 42; y++) {
    const radius = 5.5 + (y - 29) * 0.22;
    for (let z = 0; z < 28; z++) {
      for (let x = 0; x < 28; x++) {
        const dx = x + 0.5 - middle;
        const dz = z + 0.5 - middle;
        if (Math.hypot(dx, dz) > radius) continue;
        const stripe = Math.floor(((Math.atan2(dz, dx) + Math.PI) / (2 * Math.PI)) * 12) % 2;
        m.set(x, y, z, stripe ? C.red : C.paper);
      }
    }
  }
  m.ball(middle, 42, middle, 9, 1.2, 9, C.paper); // rim
  for (const [x, z, r] of [[-3, -2, 3.6], [3, -1, 3.4], [0, 3, 3.6], [-4, 3, 2.8], [4, 4, 2.6]]) m.ball(middle + x, 43, middle + z, r, 2.6, r, C.apricot); // what is in it
  m.paint(middle - 2, 44.5, middle, 2.5, 1.2, 2.5, C.mustard).paint(middle + 3, 44, middle + 2, 2, 1.2, 2, C.mustard);
  return { name: 'tripod', voxel: 0.0125, at: [0.12, WARDROBE.height, WARDROBE.z + 0.08], model: m, wall: 'west', smooth: true };
}

/** Where the warning light stands on the wardrobe. Its glow starts from the middle of its lens. */
const BEACON = { x: 0.2, z: WARDROBE.z + 0.62 };
export const BEACON_LIGHT: [number, number, number] = [BEACON.x + 0.25, WARDROBE.height + 0.12, BEACON.z + 0.12];

/**
 * A storm warning light: an orange case with black bumpers and a handle, and
 * a lens that faces the room. It stays dark until it is clicked. Voxels of
 * 1.25 cm: 25 cm wide.
 */
export function beacon(): RoomObject {
  const m = new VoxelModel(12, 22, 20);
  m.box(0, 0, 0, 10, 18, 20, C.amber);
  for (const [y, z] of [[0, 0], [0, 17], [15, 0], [15, 17]]) m.box(0, y, z, 11, 3, 3, C.ink); // bumpers
  m.box(4, 18, 4, 2, 1, 2, C.ink).box(4, 18, 14, 2, 1, 2, C.ink).box(4, 19, 4, 2, 2, 12, C.ink); // handle
  m.box(10, 3, 3, 1, 12, 14, C.ink); // the rim of the lens
  m.box(10, 4, 4, 1, 10, 12, C.amber | EMISSIVE);
  for (const y of [6, 9, 12]) m.box(10, y, 4, 1, 1, 12, C.ink); // its ribs
  return { name: 'beacon', voxel: 0.0125, at: [BEACON.x, WARDROBE.height, BEACON.z], model: m, wall: 'west' };
}
