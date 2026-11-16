/*
  The figurines of the top shelf: manga archetypes, none of them a known
  character. They are sculpted in voxels of 6.25 mm, a quarter of the usual
  ones, out of balls and limbs, and shaded as round shapes. Four stand at the
  back, 8 voxels up on the riser of their shelf, and five in front. Each one
  faces +z.
*/
import { EMISSIVE, VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';

type Point = [number, number, number];

interface Look {
  skin: number;
  hair: number;
  top: number;
  bottom: number;
  shoes: number;
}

interface Stance {
  /** Where the two hands are, from the point between the feet: left, then right. */
  hands: [Point, Point];
  /** Where the two feet are. Side by side when left out. */
  feet?: [Point, Point];
}

const radians = (degrees: number) => (degrees * Math.PI) / 180;

/**
 * A figure with its feet around `at`, 46 voxels tall at scale 1: legs, torso,
 * arms, and a head a quarter of its height under a cap of hair, with two
 * eyes. Returns the centre of its head, for what each figure adds to it.
 */
function body(m: VoxelModel, [x, y, z]: Point, s: number, look: Look, stance: Stance): Point {
  const at = (dx: number, dy: number, dz: number): Point => [x + dx * s, y + dy * s, z + dz * s];
  const feet = stance.feet ?? [[-3.5, 0, 0], [3.5, 0, 0]];
  feet.forEach(([fx, fy, fz], i) => {
    m.limb(at(i ? 3 : -3, 19, 0), at(fx, fy + 2.5, fz), 3.2 * s, 2.5 * s, look.bottom);
    m.ball(...at(fx, fy + 1.6, fz + 1.2), 2.8 * s, 1.9 * s, 3.8 * s, look.shoes);
  });
  m.ball(...at(0, 19, 0), 5.6 * s, 3.6 * s, 4.2 * s, look.bottom);
  m.limb(at(0, 21, 0), at(0, 29, 0), 5 * s, 6 * s, look.top);
  stance.hands.forEach((hand, i) => {
    m.limb(at(i ? 6.5 : -6.5, 29.5, 0), at(...hand), 2.4 * s, 1.9 * s, look.top);
    m.ball(...at(...hand), 2.2 * s, 2.2 * s, 2.2 * s, look.skin);
  });
  m.limb(at(0, 30, 0), at(0, 34, 0), 2.2 * s, 2.2 * s, look.skin);
  const head = at(0, 38.5, 0.5);
  m.ball(...head, 5.6 * s, 6 * s, 5.6 * s, look.skin);
  /* Hair: a cap over the skull, then the face cut back out of it. */
  m.ball(head[0], head[1] + 1.4 * s, head[2] - 1.2 * s, 6.4 * s, 6.2 * s, 6.3 * s, look.hair);
  m.ball(head[0], head[1] - s, head[2] + 3.4 * s, 4.5 * s, 4.8 * s, 4 * s, look.skin);
  for (const side of [-1, 1]) m.paint(head[0] + side * 2.2 * s, head[1] - 0.6 * s, head[2] + 6 * s, 0.9 * s, 1.1 * s, 1.6 * s, C.ink);
  return head;
}

/** Balls of one colour: a cloud, a mane, a rock. Each is x, y, z and a radius, flattened a little. */
function lumps(m: VoxelModel, [x, y, z]: Point, color: number, balls: number[][]): void {
  for (const [dx, dy, dz, r] of balls) m.ball(x + dx, y + dy, z + dz, r, r * 0.85, r, color);
}

/** A feathered wing spread from `root`, to the left (side -1) or to the right, its tip `lift` degrees higher. */
function wing(m: VoxelModel, root: Point, side: number, lift: number): void {
  for (let k = 0; k < 10; k++) {
    const angle = radians(-55 + k * 14 + lift);
    const length = k < 3 ? 12 + k * 4 : 26 - (k - 3) * 2.2;
    const tip: Point = [root[0] + side * Math.cos(angle) * length, root[1] + Math.sin(angle) * length, root[2] - 1.5 - k * 0.25];
    m.limb(root, tip, 2.3, 1, k % 2 ? C.graphite : C.ink);
  }
}

/** A winged dancer on a rock: bare chest, a sash, long hair down the back. */
function winged(m: VoxelModel, x: number, y: number, z: number, hair: number, sash: number, lift: number): void {
  lumps(m, [x, y, z], C.taupe, [[-5, 1, 0, 6], [4, 1.5, 1, 7], [0, 1, -3, 6]]);
  const look = { skin: C.apricot, hair, top: C.apricot, bottom: C.graphite, shoes: C.ink };
  const head = body(m, [x, y + 4, z], 1, look, { hands: [[-11, 20, 3], [10, 37 + lift / 4, 2]] });
  m.paint(x, y + 25, z, 7, 2.2, 6, sash);
  m.limb([head[0], head[1] + 1, head[2] - 4], [head[0] - 1, y + 24, z - 7], 4.6, 1.8, hair);
  for (const side of [-1, 1]) wing(m, [x + side * 3, y + 31, z - 5], side, side * lift);
}

export function figurines(): RoomObject {
  const m = new VoxelModel(160, 80, 46);
  const { paper: white, apricot: skin } = C;

  /* Back row. Two winged dancers frame a fighter who rides a cloud, fist raised, and a runner in full stride. */
  winged(m, 27, 8, 11, C.plum, C.rust, 12);
  winged(m, 99, 8, 11, C.graphite, C.violet, -8);

  lumps(m, [63, 8, 10], white, [[-9, 3, 0, 6], [0, 4, 2, 7.5], [9, 3, -1, 6.5], [-4, 2, 6, 5], [6, 2, 6, 5.5], [14, 6, -4, 4.5], [-14, 5, -3, 4]]);
  const fighter = body(m, [63, 17, 10], 1.05, { skin, hair: white, top: skin, bottom: C.night, shoes: C.mustard }, {
    hands: [[-12, 23, 4], [9, 45, 2]],
    feet: [[-6, 0, 2], [5, 3, -2]],
  });
  lumps(m, fighter, white, [[-5, 5, -2, 4], [0, 7.5, -2, 4.6], [5, 5.5, -2, 4], [-2.5, 9.5, -3, 3], [3, 10, -3, 3]]); // hair like a flame
  for (let k = 0; k < 8; k++) m.ball(63 + Math.cos(k * 0.8) * 8.5, 50, 10 + Math.sin(k * 0.8) * 6, 3.4, 3, 3.4, white); // a scarf of cloud
  m.paint(63, 38, 10, 7, 2, 6, C.violet);

  lumps(m, [135, 8, 11], white, [[-6, 2, 0, 5.5], [3, 3, 1, 6.5], [10, 2, -2, 4.5]]);
  const runner = body(m, [135, 14, 11], 0.95, { skin, hair: white, top: white, bottom: skin, shoes: white }, {
    hands: [[-13, 27, -4], [15, 32, 5]],
    feet: [[-7, 5, -6], [4, 0, 3]],
  });
  m.paint(135, 33, 11, 7, 4, 6, white); // shorts
  m.paint(131, 20, 8, 5, 6, 6, white).paint(139, 18, 13, 5, 6, 6, white); // long boots
  for (const side of [-1, 1]) {
    m.limb([runner[0] + side * 5, runner[1] + 3, runner[2] - 2], [runner[0] + side * 14, runner[1] - 6, runner[2] - 7], 3.2, 1.2, white); // twin tails
    m.ball(runner[0] + side * 5.5, runner[1] + 3.5, runner[2] - 1.5, 2, 2, 2, C.magenta); // their ribbons
  }
  m.limb([139, 34, 6], [148, 26, 2], 1.4, 1, C.magenta).limb([148, 26, 2], [143, 19, -1], 1, 0.8, C.magenta); // a sash that trails

  /* Front row. A kid sitting cross-legged, arms folded, eyes shut. */
  m.ball(14, 4.5, 34, 7.5, 4.5, 6.5, C.moss);
  m.limb([14, 8, 33.5], [14, 16, 33], 5, 5.6, C.denim);
  m.limb([8.5, 15, 34], [17, 10.5, 39], 2.2, 2, C.denim).limb([19.5, 15, 34], [11, 11.5, 39], 2.2, 2, C.denim);
  for (const x of [8.5, 19.5]) m.ball(x, 3, 39.5, 2.6, 2, 3.2, C.red);
  m.ball(14, 23, 34, 6.2, 6.2, 6, skin).ball(14, 24.6, 32.8, 7, 6.2, 6.6, C.ink).ball(14, 22, 37.6, 4.9, 4.8, 3.6, skin);
  lumps(m, [14, 29, 33], C.ink, [[-4, 0, 0, 2.6], [0, 1.5, 0, 3], [4, 0.5, 0, 2.6]]);
  for (const x of [11.6, 16.4]) m.paint(x, 22.4, 40.6, 1.5, 0.6, 1.4, C.ink);

  /* A gentleman in a top hat, a cane in his hand, on a round stand. */
  m.ball(44, 1.5, 33, 10, 2, 9, C.plum);
  const suit = { skin, hair: C.mustard, top: C.graphite, bottom: C.graphite, shoes: C.ink };
  const gentleman = body(m, [44, 2.5, 33], 0.85, suit, { hands: [[-9, 19, 2], [10, 19, 6]] });
  m.paint(44, 24.5, 37, 2.2, 5, 2.4, white).paint(44, 26, 38, 1, 2.4, 1.6, C.red); // shirt front and tie
  m.limb([52.5, 18, 38], [53.5, 3, 40], 0.9, 0.9, C.silver);
  m.ball(gentleman[0], gentleman[1] + 4.5, gentleman[2], 8.2, 1.1, 8, C.graphite); // brim
  m.limb([gentleman[0], gentleman[1] + 5, gentleman[2]], [gentleman[0], gentleman[1] + 12, gentleman[2]], 5, 5.2, C.graphite); // crown
  m.paint(gentleman[0], gentleman[1] + 6.4, gentleman[2], 6, 1.2, 6, C.magenta); // its band

  /* A robot: square limbs, a visor and a core that glow. */
  for (const x of [73, 82]) m.box(x, 3, 30, 5, 10, 6, C.steel).box(x - 1, 0, 29, 7, 3, 9, C.graphite);
  m.box(73, 13, 30, 14, 3, 6, C.graphite).box(71, 16, 29, 18, 13, 8, C.silver);
  m.box(78, 20, 37, 4, 4, 1, C.red | EMISSIVE);
  for (const x of [66, 89]) m.box(x, 22, 30, 5, 7, 6, C.steel).box(x, 12, 31, 5, 10, 5, C.silver).box(x, 8, 30, 5, 4, 7, C.graphite);
  m.box(75, 29, 29, 10, 8, 8, C.silver).box(76, 32, 37, 8, 2, 1, C.cyan | EMISSIVE);
  m.limb([84, 37, 32], [87, 44, 31], 0.9, 0.7, C.steel).ball(87, 44.5, 31, 1.4, 1.4, 1.4, C.red);

  /* A swordsman, blade raised, his cloak behind him, on a rock. */
  lumps(m, [116, 0, 33], C.taupe, [[-4, 1, 0, 6], [5, 1.5, 1, 6.5]]);
  const robe = { skin, hair: C.mustard, top: C.teal, bottom: C.graphite, shoes: C.walnut };
  const swordsman = body(m, [116, 4, 33], 0.85, robe, { hands: [[5, 32, 5], [9, 36, 4]], feet: [[-5, 0, -1], [5, 0, 2]] });
  m.ball(116, 20, 29, 8, 10, 2.6, C.teal);
  lumps(m, swordsman, C.mustard, [[-4, 5, -1, 2.6], [0, 6.5, -1, 3], [4, 5, -1, 2.6], [-6, 2, -2, 2.4], [6, 2, -2, 2.4]]);
  m.limb([122, 33, 37], [133, 60, 34], 1, 0.6, C.silver).ball(122.5, 34.5, 37, 2.4, 1, 2.4, C.mustard); // blade and guard
  m.limb([111, 20, 36], [104, 15, 28], 1.2, 1, C.plum); // scabbard

  /* A round mascot with two ears and red cheeks. */
  m.ball(147, 7, 35, 8, 7, 7.5, C.mustard);
  for (const x of [142, 152]) m.ball(x, 14, 34, 2.6, 3.4, 2, C.mustard);
  for (const x of [144, 150]) m.paint(x, 8.5, 42, 1.2, 1.6, 1.6, C.ink);
  for (const x of [141.5, 152.5]) m.paint(x, 6, 40.5, 1.6, 1.3, 2, C.rust);

  return { name: 'figurines', voxel: 0.00625, at: [3.45, 2.05, 0.0125], model: m, smooth: true };
}
