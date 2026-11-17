/*
  The three large figures of the top shelf, each its own object: a boy in
  green boots with a shadow rising behind him, a horned swordsman with hair
  like a flame among red flames, and a white, blue and red robot standing to
  attention. Samuel owns the first two and asked for the third. Voxels of
  3.125 mm, as for the pair on the lower shelf; the first two are shaded as
  round shapes, the robot keeps its flat faces. Each one faces +z.
*/
import { EMISSIVE, VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import { body, lumps, moved, type Clay, type Point } from './figurines.ts';
import type { RoomObject } from './index.ts';

const FINE = 0.003125;

/** The top shelf: its left end, the top of its board, the top of the riser at its back and the depth of that riser, in metres. */
const TOP_SHELF = { x: 3.45, board: 2.05, riser: 2.1, back: 0.2 };

/** A shape drawn through `points`, thinning from `from` to `to`: a wisp of smoke, a flame, a horn. */
function curl(m: Clay, points: Point[], from: number, to: number, color: number): void {
  const last = points.length - 1;
  for (let i = 0; i < last; i++) {
    const at = (k: number) => from + ((to - from) * k) / last;
    m.limb(points[i], points[i + 1], at(i), at(i + 1), color);
  }
}

/** Recolour what is filled within `reach` of the segment from `a` to `b`: a marking on a chest, a lace, a seam. */
function stroke(m: Clay, a: Point, b: Point, reach: number, color: number): void {
  const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 2) || 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    m.paint(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, reach, reach, reach, color);
  }
}

/**
 * The boy: a wide stance, arms tense at his sides, hair in tall green
 * spikes, a white top cut short, green shorts and laced boots. Behind his
 * shoulder a shadow rises, with two round white eyes, and its tendrils come
 * up around the broken ground he stands on. Drawn a third larger than its
 * numbers say: 32 cm wide, 45 cm high.
 */
function boy(): VoxelModel {
  const model = new VoxelModel(102, 144, 64);
  const m = moved(model, [0, 0, 0], 4 / 3);
  const { apricot: skin, leaf: green, moss: dark } = C;
  const s = 1.3;
  const [x, y, z] = [34, 9, 27]; // between his feet

  /* The ground: slabs of red rock, cracked. */
  lumps(m, [38, 0, 24], C.chestnut, [[-22, 3, 2, 10], [-6, 4, 6, 12], [12, 4, 4, 12], [26, 3, 0, 9], [-12, 3, -10, 9], [8, 3, -11, 10], [0, 3, 15, 8], [-18, 2, 13, 7], [20, 2, 13, 7]]);
  for (const [dx, dz, r] of [[-20, 3, 5], [-4, 8, 6], [14, 5, 6], [5, -9, 5], [24, 1, 4]]) m.paint(38 + dx, 8, 24 + dz, r, 3, r, C.rust);
  for (const [a, b] of [[[20, 9, 30], [30, 9, 40]], [[44, 9, 22], [56, 9, 34]], [[26, 9, 14], [40, 9, 18]]] as [Point, Point][]) stroke(m, a, b, 0.9, C.walnut);

  /* The shadow: a column of smoke that leans over him, thick at the foot. */
  const smoke = C.graphite;
  curl(m, [[58, 6, 12], [62, 26, 9], [63, 46, 8], [58, 66, 9], [53, 82, 11], [50, 93, 13]], 9.5, 7, smoke);
  m.ball(50, 95, 14, 9.5, 9, 8.5, smoke);
  for (const [tip, from] of [
    [[40, 107, 9], [47, 100, 12]],
    [[60, 106, 8], [54, 100, 12]],
    [[72, 84, 6], [61, 74, 9]],
    [[74, 60, 4], [64, 50, 8]],
    [[44, 78, 4], [54, 70, 8]],
  ] as [Point, Point][]) m.limb(from, tip, 3.4, 0.6, smoke); // wisps that leave it
  for (const side of [-1, 1]) m.paint(50 + side * 3.6, 95.5, 22, 2.3, 2.6, 2.6, C.paper); // its eyes
  for (const [cx, cy, cz, r] of [[60, 30, 15, 5], [60, 52, 14, 4.5], [54, 76, 16, 4], [46, 98, 20, 3]]) m.paint(cx, cy, cz, r, r * 1.6, r, C.ink); // where it is darkest

  /* Its tendrils, out of the ground on every side, bent like claws. */
  for (const points of [
    [[8, 3, 34], [3, 14, 37], [5, 26, 33], [11, 33, 27]],
    [[18, 3, 43], [14, 11, 46], [17, 19, 44]],
    [[66, 3, 38], [72, 13, 40], [72, 25, 36], [66, 32, 31]],
    [[52, 3, 44], [57, 10, 46], [56, 17, 44]],
    [[6, 3, 14], [2, 13, 10], [5, 23, 8]],
    [[30, 2, 45], [34, 7, 47], [39, 5, 46]],
  ] as Point[][]) curl(m, points, 3.2, 0.7, C.ink);

  /* The boy. Bare arms and legs first, then what he wears, painted over them. */
  const look = { skin, hair: dark, top: skin, bottom: skin, shoes: green };
  const feet: [Point, Point] = [[-7.5, 0, 2], [7.5, 0, -1.5]];
  const head = body(m, [x, y, z], s, look, { hands: [[-11.5, 16, 2.5], [11.5, 16.5, 1]], feet });
  m.paint(x, y + 27.2 * s, z, 5.4 * s, 3.7 * s, 6 * s, C.paper); // the top, cut above the waist
  m.paint(x, y + 30.6 * s, z + 2 * s, 2.2 * s, 1.5 * s, 4 * s, skin); // its low neck
  m.paint(x, y + 18 * s, z, 8 * s, 4.4 * s, 6 * s, green); // shorts
  m.paint(x, y + 21.4 * s, z, 6.2 * s, 0.9 * s, 6 * s, C.walnut).paint(x, y + 21.4 * s, z + 4.6 * s, 1.3 * s, 1.1 * s, 1.6 * s, C.mustard); // belt and buckle
  for (const [fx, , fz] of feet) {
    const [bx, bz] = [x + fx * s, z + fz * s];
    m.paint(bx, y + 6.5 * s, bz, 4.2 * s, 5.6 * s, 4.6 * s, green); // boot
    m.paint(bx, y + 11.6 * s, bz, 4 * s, 0.8 * s, 4 * s, dark); // its cuff
    m.paint(bx, y + 0.6 * s, bz + 1.2 * s, 4 * s, 0.9 * s, 5.4 * s, dark); // its sole
    for (let lace = 0; lace < 4; lace++) m.paint(bx, y + (3.4 + lace * 2) * s, bz + 3.6 * s, 1.5 * s, 0.4 * s, 1.4 * s, C.paper);
  }
  /* The hair: spikes that stand up from the skull, darker at the root. */
  for (const [dx, dy, dz] of [
    [0, 17, -1], [-6, 15.5, -2], [6, 16, -2], [-11, 11.5, -3], [11, 12, -3], [-3, 16.5, 3], [3.5, 16, 3.5],
    [0, 14, -7], [-8, 10, -7], [8, 10.5, -7], [-12, 5.5, -1], [12, 6, -1], [-7, 13.5, 4], [7.5, 13, 4],
  ]) {
    const tip: Point = [head[0] + dx * s, head[1] + dy * s, head[2] + dz * s];
    m.limb([head[0] + dx * 0.25 * s, head[1] + 3 * s, head[2] + dz * 0.3 * s], tip, 3.1 * s, 0.6, dark);
    m.paint(tip[0], tip[1], tip[2], 2.2 * s, 3.4 * s, 2.2 * s, green);
  }
  m.ball(head[0], head[1] - s, head[2] + 3.4 * s, 4.5 * s, 4.8 * s, 4 * s, skin); // his face again, clear of the hair
  for (const side of [-1, 1]) m.paint(head[0] + side * 2.5 * s, head[1] - 0.6 * s, head[2] + 6 * s, 0.9 * s, 1.25 * s, 1.6 * s, C.walnut); // large brown eyes, wide apart
  return model;
}

/**
 * The swordsman: a white body marked with black lines, a horned mask, red
 * fur at his neck, wrists and ankles, long orange hair that stands like a
 * flame, torn black trousers. He lunges, a black blade in his hand, on grey
 * rock, among flames of red glass. Drawn a quarter larger than its numbers
 * say: 37 cm wide, 44 cm high.
 */
function swordsman(): VoxelModel {
  const model = new VoxelModel(120, 140, 60);
  const m = moved(model, [0, 0, 0], 1.25);
  const white = C.paper;
  const s = 1.5;
  const [x, y, z] = [42, 6, 24]; // under his hips: he stands low, his feet up on the rock

  /* The rock: grey blocks, split and sharp. */
  lumps(m, [46, 0, 24], C.taupe, [[-30, 4, 0, 11], [-12, 6, 4, 13], [10, 6, 2, 13], [28, 4, -2, 10], [-22, 3, 12, 8], [0, 4, 14, 9], [22, 3, 13, 8], [-10, 4, -12, 9], [12, 4, -12, 9]]);
  for (const [dx, dz, r] of [[-26, 2, 6], [-10, 6, 7], [12, 4, 7], [28, 0, 5], [0, 13, 5], [-4, -10, 5]]) m.paint(46 + dx, 11, 24 + dz, r, 4, r, C.stone);
  for (const [from, tip] of [
    [[14, 6, 30], [8, 17, 36]], [[30, 8, 40], [27, 16, 46]], [[62, 8, 38], [68, 18, 44]], [[24, 6, 8], [18, 16, 3]], [[70, 6, 10], [76, 15, 5]],
  ] as [Point, Point][]) m.limb(from, tip, 4, 0.8, C.stone); // shards

  /* The flames: one that climbs high on his left, lower ones around the rock. */
  const flame = (points: Point[], from: number) => {
    curl(m, points, from, 0.8, C.red);
    for (const [px, py, pz] of points.slice(0, -1)) m.paint(px, py - from * 0.5, pz, from, from * 0.6, from, C.rust); // darker underneath
  };
  flame([[70, 5, 32], [84, 12, 30], [91, 32, 24], [85, 54, 18], [89, 76, 15], [84, 98, 13]], 6.5);
  flame([[78, 8, 20], [90, 16, 14], [93, 28, 10], [88, 38, 8]], 4.5);
  flame([[22, 4, 38], [9, 9, 40], [4, 21, 36], [9, 31, 32]], 4.6);
  flame([[12, 5, 12], [3, 14, 9], [6, 27, 6]], 4);
  flame([[52, 4, 42], [60, 8, 46], [66, 5, 45]], 3.2);

  /* The body: white all over, then the trousers, the fur and the markings. */
  const look = { skin: white, hair: white, top: white, bottom: C.ink, shoes: white };
  const hands: [Point, Point] = [[-13.5, 15, 7], [12.5, 23, 8]];
  const feet: [Point, Point] = [[-12, 3.2, 7], [11, 3.6, -7]];
  const head = body(m, [x, y, z], s, look, { hands, feet });
  /* Trousers: wide, black, torn at the hem; a pale sash knotted at the front. */
  m.ball(x, y + 17 * s, z, 9 * s, 6 * s, 7 * s, C.ink);
  for (const [fx, fy, fz] of feet) {
    const ground = y + fy * s;
    m.limb([x + fx * 0.3 * s, y + 17 * s, z + fz * 0.3 * s], [x + fx * 0.82 * s, ground + 7.5 * s, z + fz * 0.82 * s], 5.4 * s, 4.6 * s, C.ink);
    for (const [dx, dz] of [[-2, 2], [2, -1], [0, 3], [3, 2]]) m.limb([x + fx * 0.82 * s + dx, ground + 7.5 * s, z + fz * 0.82 * s + dz], [x + fx * 0.9 * s + dx * 1.6, ground + 4 * s, z + fz * 0.9 * s + dz * 1.6], 1.8, 0.5, C.ink); // tatters
    m.paint(x + fx * s, ground + 2.2 * s, z + fz * s + 1, 3.4 * s, 2.6 * s, 4.4 * s, white); // the bare foot
    for (let k = 0; k < 6; k++) m.ball(x + fx * s + Math.cos(k) * 3 * s, ground + 4.6 * s, z + fz * s + Math.sin(k) * 3 * s, 1.5 * s, 1.4 * s, 1.5 * s, C.red); // fur at the ankle
  }
  m.paint(x, y + 21.4 * s, z, 6.4 * s, 1.2 * s, 6 * s, C.linen);
  m.limb([x - 1.5 * s, y + 21 * s, z + 4.6 * s], [x - 3 * s, y + 13 * s, z + 6.5 * s], 1.6 * s, 0.9 * s, C.linen);
  /* Markings: a hollow in the chest, lines from it to the shoulders and down the belly. */
  const chest: Point = [x, y + 27 * s, z + 5.4 * s];
  m.paint(...chest, 1 * s, 1 * s, 2 * s, C.ink);
  for (const side of [-1, 1]) {
    stroke(m, chest, [x + side * 5.5 * s, y + 30 * s, z + 3.5 * s], 0.4 * s, C.ink);
    stroke(m, [x + side * 2 * s, y + 25.5 * s, z + 5.6 * s], [x + side * 4.4 * s, y + 22.6 * s, z + 4.4 * s], 0.36 * s, C.ink);
  }
  stroke(m, chest, [x, y + 22.4 * s, z + 5.6 * s], 0.36 * s, C.ink);
  hands.forEach(([hx, hy, hz]) => {
    for (let k = 0; k < 6; k++) m.ball(x + hx * 0.86 * s + Math.cos(k) * 2.2 * s, y + (hy * 0.9 + 2.6) * s, z + hz * 0.86 * s + Math.sin(k) * 2.2 * s, 1.5 * s, 1.5 * s, 1.5 * s, C.red); // fur at the wrist
  });
  for (let k = 0; k < 9; k++) m.ball(x + Math.cos(k * 0.7) * 4.6 * s, y + 32.2 * s, z + 0.5 * s + Math.sin(k * 0.7) * 4.2 * s, 2 * s, 1.8 * s, 2 * s, C.red); // and round the neck
  /* The mask: two horns that come forward, hollow eyes with a line through each, a row of teeth. */
  for (const side of [-1, 1]) {
    curl(m, [[head[0] + side * 5.2 * s, head[1] + 3 * s, head[2] + s], [head[0] + side * 10.5 * s, head[1] + 6.5 * s, head[2] + 3 * s], [head[0] + side * 10.5 * s, head[1] + 12 * s, head[2] + 8 * s], [head[0] + side * 8 * s, head[1] + 15 * s, head[2] + 14 * s]], 2.6 * s, 0.7, white);
    m.paint(head[0] + side * 8.4 * s, head[1] + 14.6 * s, head[2] + 13 * s, 2.6 * s, 2 * s, 2.6 * s, C.ink); // its black tip
    stroke(m, [head[0] + side * 2.3 * s, head[1] + 4.4 * s, head[2] + 4.8 * s], [head[0] + side * 2.3 * s, head[1] - 3.6 * s, head[2] + 5.2 * s], 0.38 * s, C.ink);
  }
  m.paint(head[0], head[1] - 3.4 * s, head[2] + 5.6 * s, 2.6 * s, 0.7 * s, 1.6 * s, C.ink);
  for (const dx of [-1.4, 0, 1.4]) m.paint(head[0] + dx * s, head[1] - 3.4 * s, head[2] + 6 * s, 0.4 * s, 0.6 * s, 1.4 * s, white);
  /* The hair: orange, standing behind the mask and streaming back, darker at the root. */
  const hair: number[][] = [[0, 6, -5, 5.2], [-3, 10, -6, 5], [2, 14, -7, 4.6], [-2, 18, -8, 4], [3, 21, -9, 3.2], [-1, 24, -10, 2.4], [-6, 7, -6, 3.6], [6, 8, -6, 3.6], [-8, 12, -8, 2.8], [8, 13, -8, 2.8], [0, 2, -7, 4.6], [0, -4, -8, 3.6], [-4, -8, -8, 2.6], [4, -9, -8, 2.6]];
  lumps(m, head, C.amber, hair.map(([dx, dy, dz, r]) => [dx * s, dy * s, dz * s, r * s]));
  for (const [dx, dy, dz, r] of hair.filter((lock) => lock[1] < 8)) m.paint(head[0] + dx * s, head[1] + (dy - 1.5) * s, head[2] + dz * s, r * s, r * s * 0.7, r * s, C.mustard);
  /* The blade, low in his right hand, its point towards the ground in front of him. */
  const grip: Point = [x + hands[0][0] * s, y + hands[0][1] * s, z + hands[0][2] * s];
  m.limb([grip[0] + 2, grip[1] + 5, grip[2] - 3], [grip[0] - 2, grip[1] - 4, grip[2] + 3], 1, 1, C.ink);
  m.limb([grip[0] - 2, grip[1] - 4, grip[2] + 3], [grip[0] - 12, grip[1] - 23, grip[2] + 15], 1.1, 0.6, C.ink);
  m.ball(grip[0] - 1.6, grip[1] - 3.2, grip[2] + 2.4, 2.2, 1, 2.2, C.graphite); // guard
  return model;
}

/**
 * The robot, standing on a low plinth: white limbs, a blue chest with two
 * yellow vents, a red belly, red soles, a yellow crest in a V on its brow,
 * the hilts of two sabres behind its shoulders. Its eyes glow. 15 cm wide,
 * 28 cm high.
 */
function robot(): VoxelModel {
  const m = new VoxelModel(48, 92, 30);
  const { paper: white, denim: blue, red, mustard: yellow, steel, graphite } = C;
  const b = 2; // the height of the plinth
  m.box(2, 0, 3, 44, b, 24, graphite);
  for (const cx of [16, 32]) {
    m.box(cx - 5, b, 8, 10, 3, 14, red); // sole
    m.box(cx - 4, b + 3, 9, 8, 3, 11, white).box(cx - 3, b + 3, 20, 6, 2, 2, white); // foot and toe
    m.box(cx - 5, b + 6, 8, 10, 7, 12, white); // the leg flares over the ankle
    m.box(cx - 4, b + 13, 9, 8, 13, 10, white); // shin
    m.box(cx - 4, b + 9, 19, 8, 1, 1, steel).box(cx - 2, b + 15, 19, 4, 7, 1, steel); // seams down its front
    m.box(cx - 4, b + 26, 10, 8, 1, 8, steel); // knee joint
    m.box(cx - 4, b + 27, 10, 8, 6, 10, white).box(cx - 3, b + 26, 20, 6, 7, 2, white).box(cx - 1, b + 28, 22, 2, 3, 1, yellow); // knee and its cap
    m.box(cx - 3, b + 33, 10, 7, 10, 8, white); // thigh
    m.box(cx - 6, b + 41, 9, 11, 8, 11, white).box(cx - 3, b + 44, 20, 4, 3, 1, yellow); // skirt, with its yellow square
  }
  m.box(21, b + 41, 10, 6, 8, 10, red).box(23, b + 44, 20, 2, 3, 1, yellow); // between the legs
  m.box(17, b + 49, 11, 14, 6, 9, red); // belly
  m.box(13, b + 55, 8, 22, 13, 14, blue); // chest
  for (const cx of [14, 27]) {
    m.box(cx, b + 61, 22, 7, 5, 1, yellow);
    for (const dy of [1, 3]) m.box(cx + 1, b + 61 + dy, 22, 5, 1, 1, graphite); // the slats of a vent
  }
  m.box(21, b + 56, 22, 6, 4, 1, red); // hatch
  m.box(18, b + 68, 11, 12, 1, 9, yellow); // collar
  for (const side of [-1, 1]) {
    const cx = 24 + side * 15;
    m.box(cx - 5, b + 59, 8, 10, 10, 13, white); // shoulder
    m.box(cx - 3, b + 49, 11, 6, 10, 8, white); // upper arm
    m.box(cx - 3, b + 46, 12, 6, 3, 6, steel); // elbow
    m.box(cx - 4, b + 35, 10, 8, 11, 9, white); // forearm
    m.box(cx - 3, b + 30, 11, 6, 5, 7, graphite); // fist
    m.limb([24 + side * 6, b + 66, 6], [24 + side * 11, b + 79, 3], 1.2, 1, white); // the hilt of a sabre
  }
  m.box(16, b + 55, 3, 16, 13, 5, steel); // backpack
  m.box(21, b + 68, 13, 6, 2, 6, steel); // neck
  m.box(19, b + 70, 11, 10, 9, 10, white); // head
  m.box(18, b + 73, 14, 1, 4, 4, steel).box(29, b + 73, 14, 1, 4, 4, steel); // ears
  m.box(21, b + 70, 21, 6, 2, 1, red).box(21, b + 72, 21, 6, 2, 1, steel); // chin and mouth
  m.box(20, b + 74, 21, 8, 2, 1, graphite).box(21, b + 74, 21, 2, 1, 1, C.lime | EMISSIVE).box(25, b + 74, 21, 2, 1, 1, C.lime | EMISSIVE); // eyes behind their visor
  m.box(23, b + 76, 21, 2, 3, 1, red); // the sensor on its brow
  m.box(22, b + 79, 13, 4, 2, 8, white).box(23, b + 80, 20, 2, 1, 1, red); // crest and its camera
  for (const side of [-1, 1]) m.limb([24 + side, b + 78, 21.5], [24 + side * 8, b + 87, 21.5], 0.9, 0.6, yellow); // the V
  return m;
}

/** A figure on the riser at the back of the top shelf, or on its board, `x` metres from its left end. */
const stand = (name: string, m: VoxelModel, x: number, back: boolean, smooth: boolean): RoomObject => ({
  name,
  voxel: FINE,
  at: [TOP_SHELF.x + x, back ? TOP_SHELF.riser : TOP_SHELF.board, back ? 0.003 : TOP_SHELF.back + 0.04], // just clear of the wall
  model: m,
  smooth,
  wall: 'north',
});

export const statues = (): RoomObject[] => [
  stand('gon', boy(), 0.29, true, true),
  stand('ichigo', swordsman(), 0.62, true, true),
  stand('gundam', robot(), 0.31, false, false),
];
