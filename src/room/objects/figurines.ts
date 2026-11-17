/*
  The small figurines of the top shelf, one object for all of them. They are
  sculpted in voxels of 6.25 mm, a quarter of the usual ones, out of balls
  and limbs, and shaded as round shapes. A winged dancer stands at the back,
  8 voxels up on the riser of the shelf, and four stand in front. Each one
  faces +z. The three large figures are in statues.ts.
*/
import { VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';

export type Point = [number, number, number];

/** What a figure is sculpted with: the round shapes of a voxel model. */
export interface Clay {
  ball(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, color: number): Clay;
  paint(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, color: number): Clay;
  limb(a: readonly [number, number, number], b: readonly [number, number, number], ra: number, rb: number, color: number): Clay;
}

/** The same clay, for a figure drawn `by` voxels away and `scale` times larger: the same shapes in more voxels, so finer. */
export function moved(m: Clay, by: Point, scale = 1): Clay {
  const at = ([x, y, z]: readonly [number, number, number]): Point => [x * scale + by[0], y * scale + by[1], z * scale + by[2]];
  const clay: Clay = {
    ball: (cx, cy, cz, rx, ry, rz, color) => (m.ball(...at([cx, cy, cz]), rx * scale, ry * scale, rz * scale, color), clay),
    paint: (cx, cy, cz, rx, ry, rz, color) => (m.paint(...at([cx, cy, cz]), rx * scale, ry * scale, rz * scale, color), clay),
    limb: (a, b, ra, rb, color) => (m.limb(at(a), at(b), ra * scale, rb * scale, color), clay),
  };
  return clay;
}

export interface Look {
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
export function body(m: Clay, [x, y, z]: Point, s: number, look: Look, stance: Stance): Point {
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
export function lumps(m: Clay, [x, y, z]: Point, color: number, balls: number[][]): void {
  for (const [dx, dy, dz, r] of balls) m.ball(x + dx, y + dy, z + dz, r, r * 0.85, r, color);
}

/** A feathered wing spread from `root`, to the left (side -1) or to the right, its tip `lift` degrees higher. */
function wing(m: Clay, root: Point, side: number, lift: number): void {
  for (let k = 0; k < 10; k++) {
    const angle = radians(-55 + k * 14 + lift);
    const length = k < 3 ? 12 + k * 4 : 26 - (k - 3) * 2.2;
    const tip: Point = [root[0] + side * Math.cos(angle) * length, root[1] + Math.sin(angle) * length, root[2] - 1.5 - k * 0.25];
    m.limb(root, tip, 2.3, 1, k % 2 ? C.graphite : C.ink);
  }
}

/** A winged dancer on a rock: bare chest, a sash, long hair down the back. */
function winged(m: Clay, x: number, y: number, z: number, hair: number, sash: number, lift: number): void {
  lumps(m, [x, y, z], C.taupe, [[-5, 1, 0, 6], [4, 1.5, 1, 7], [0, 1, -3, 6]]);
  const look = { skin: C.apricot, hair, top: C.apricot, bottom: C.graphite, shoes: C.ink };
  const head = body(m, [x, y + 4, z], 1, look, { hands: [[-11, 20, 3], [10, 37 + lift / 4, 2]] });
  m.paint(x, y + 25, z, 7, 2.2, 6, sash);
  m.limb([head[0], head[1] + 1, head[2] - 4], [head[0] - 1, y + 24, z - 7], 4.6, 1.8, hair);
  for (const side of [-1, 1]) wing(m, [x + side * 3, y + 31, z - 5], side, side * lift);
}

/** A kid sitting cross-legged, arms folded, eyes shut. */
function kid(m: Clay): void {
  const skin = C.apricot;
  m.ball(14, 4.5, 34, 7.5, 4.5, 6.5, C.moss);
  m.limb([14, 8, 33.5], [14, 16, 33], 5, 5.6, C.denim);
  m.limb([8.5, 15, 34], [17, 10.5, 39], 2.2, 2, C.denim).limb([19.5, 15, 34], [11, 11.5, 39], 2.2, 2, C.denim);
  for (const x of [8.5, 19.5]) m.ball(x, 3, 39.5, 2.6, 2, 3.2, C.red);
  m.ball(14, 23, 34, 6.2, 6.2, 6, skin).ball(14, 24.6, 32.8, 7, 6.2, 6.6, C.ink).ball(14, 22, 37.6, 4.9, 4.8, 3.6, skin);
  lumps(m, [14, 29, 33], C.ink, [[-4, 0, 0, 2.6], [0, 1.5, 0, 3], [4, 0.5, 0, 2.6]]);
  for (const x of [11.6, 16.4]) m.paint(x, 22.4, 40.6, 1.5, 0.6, 1.4, C.ink);
}

/** A gentleman in a top hat, a cane in his hand, on a round stand. */
function gentleman(m: Clay): void {
  m.ball(44, 1.5, 33, 10, 2, 9, C.plum);
  const suit = { skin: C.apricot, hair: C.mustard, top: C.graphite, bottom: C.graphite, shoes: C.ink };
  const head = body(m, [44, 2.5, 33], 0.85, suit, { hands: [[-9, 19, 2], [10, 19, 6]] });
  m.paint(44, 24.5, 37, 2.2, 5, 2.4, C.paper).paint(44, 26, 38, 1, 2.4, 1.6, C.red); // shirt front and tie
  m.limb([52.5, 18, 38], [53.5, 3, 40], 0.9, 0.9, C.silver);
  m.ball(head[0], head[1] + 4.5, head[2], 8.2, 1.1, 8, C.graphite); // brim
  m.limb([head[0], head[1] + 5, head[2]], [head[0], head[1] + 12, head[2]], 5, 5.2, C.graphite); // crown
  m.paint(head[0], head[1] + 6.4, head[2], 6, 1.2, 6, C.magenta); // its band
}

/** A swordsman, blade raised, his cloak behind him, on a rock. */
function swordsman(m: Clay): void {
  lumps(m, [116, 0, 33], C.taupe, [[-4, 1, 0, 6], [5, 1.5, 1, 6.5]]);
  const robe = { skin: C.apricot, hair: C.mustard, top: C.teal, bottom: C.graphite, shoes: C.walnut };
  const head = body(m, [116, 4, 33], 0.85, robe, { hands: [[5, 32, 5], [9, 36, 4]], feet: [[-5, 0, -1], [5, 0, 2]] });
  m.ball(116, 20, 29, 8, 10, 2.6, C.teal);
  lumps(m, head, C.mustard, [[-4, 5, -1, 2.6], [0, 6.5, -1, 3], [4, 5, -1, 2.6], [-6, 2, -2, 2.4], [6, 2, -2, 2.4]]);
  m.limb([122, 33, 37], [133, 60, 34], 1, 0.6, C.silver).ball(122.5, 34.5, 37, 2.4, 1, 2.4, C.mustard); // blade and guard
  m.limb([111, 20, 36], [104, 15, 28], 1.2, 1, C.plum); // scabbard
}

/** A round mascot with two ears and red cheeks. */
function mascot(m: Clay): void {
  m.ball(147, 7, 35, 8, 7, 7.5, C.mustard);
  for (const x of [142, 152]) m.ball(x, 14, 34, 2.6, 3.4, 2, C.mustard);
  for (const x of [144, 150]) m.paint(x, 8.5, 42, 1.2, 1.6, 1.6, C.ink);
  for (const x of [141.5, 152.5]) m.paint(x, 6, 40.5, 1.6, 1.3, 2, C.rust);
}

/** How far the front row stands from where it was first drawn, in voxels: the shelf has grown deeper under the large figures. */
const FORWARD = 8;

export function figurines(): RoomObject {
  const m = new VoxelModel(160, 80, 46 + FORWARD);
  winged(m, 25, 8, 11, C.plum, C.rust, 12); // at the back, on the riser
  /* In front, from the left: the tall ones first, the low ones before the large figures of the back. */
  gentleman(moved(m, [-31, 0, FORWARD]));
  swordsman(moved(m, [-82, 0, FORWARD]));
  kid(moved(m, [112, 0, FORWARD]));
  mascot(moved(m, [0, 0, FORWARD]));
  return { name: 'figurines', voxel: 0.00625, at: [3.45, 2.05, 0.0125], model: m, smooth: true, wall: 'north' };
}
