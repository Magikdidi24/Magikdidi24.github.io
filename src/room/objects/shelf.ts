/*
  What stands on the lower shelf above the desk: a pair of figures on their
  cloud, a meteorite under glass, a column of liquids, a daruma, a lucky cat,
  an endurance car, a plush tiger and a book of temple stamps. Each is its
  own object, sculpted in small voxels and shaded as a round shape. None of
  the figures is a known character.
*/
import { VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import { body, lumps, type Point } from './figurines.ts';
import type { RoomObject } from './index.ts';

/** The shelf: its left end, the top of its board and its depth, in metres. */
export const LOWER_SHELF = { x: 3.2, y: 1.35, top: 1.5, depth: 0.2, length: 25 };

const FINER = 0.00625;

/** Stand a model on the shelf, `x` metres from its left end, in the middle of its depth. */
const on = (name: string, m: VoxelModel, x: number, voxel = FINER, turn = 0): RoomObject => ({
  name,
  voxel,
  at: [LOWER_SHELF.x + x, LOWER_SHELF.top, (LOWER_SHELF.depth - m.sz * voxel) / 2],
  model: m,
  turn,
  smooth: true,
  wall: 'north',
});

/**
 * Two fighters leaping off a bank of clouds, one throwing a fist grown as
 * large as himself, the other running in. It is the largest piece of the
 * shelf and the finest: voxels of 3.125 mm, 25 cm wide.
 */
function duo(): VoxelModel {
  const m = new VoxelModel(80, 78, 48);
  const { paper: white, apricot: skin } = C;
  /* The clouds: a bank along the ground, and curls that rise behind. */
  lumps(m, [40, 0, 24], white, [
    [-29, 5, 0, 9], [-15, 6, 3, 10.5], [0, 7, 0, 11.5], [15, 6, 2, 10.5], [29, 5, -2, 9],
    [-22, 3.5, 11, 7], [-6, 3.5, 13, 8], [9, 3.5, 12, 7.5], [23, 3.5, 10, 6.5],
    [-31, 14, -11, 7], [-25, 23, -14, 5], [31, 15, -10, 7.5], [27, 25, -13, 5], [0, 12, -13, 8],
  ]);
  m.paint(40, 3, 24, 38, 3, 22, C.linen); // their shadowed underside

  /* The one who strikes: bare chest, white shorts, a sash, hair like a flame. */
  const striker = body(m, [22, 18, 24], 1.12, { skin, hair: white, top: skin, bottom: white, shoes: C.mustard }, {
    hands: [[-13, 21, -6], [17, 33, 9]],
    feet: [[-8, 7, 5], [6, 0, -4]],
  });
  m.paint(22, 41, 24, 8, 2.4, 7, C.violet);
  lumps(m, striker, white, [[-6, 6, -2, 4.6], [0, 9, -2, 5.4], [6, 6.5, -2, 4.6], [-3, 12, -3, 3.4], [4, 12.5, -3, 3.4], [-9, 2, -3, 3], [9, 2.5, -3, 3]]);
  for (let k = 0; k < 9; k++) m.ball(22 + Math.cos(k * 0.75) * 10, 53, 24 + Math.sin(k * 0.75) * 7, 3.8, 3.2, 3.8, white); // a scarf of cloud
  m.ball(46, 56, 36, 9.5, 9.5, 9, skin); // the fist
  for (const y of [52, 56, 60]) m.paint(46, y, 44.5, 7, 0.6, 2, C.rust); // its knuckles

  /* The one who runs in: white all over, long hair in two tails, a pink sash that trails. */
  const runner = body(m, [60, 16, 22], 1.05, { skin, hair: white, top: white, bottom: skin, shoes: white }, {
    hands: [[-14, 29, 6], [14, 25, -6]],
    feet: [[-7, 0, 4], [6, 8, -7]],
  });
  m.paint(60, 37, 22, 8, 4.4, 7, white); // shorts
  m.paint(55, 22, 25, 5.5, 7, 6.5, white).paint(65, 27, 17, 5.5, 7, 6.5, white); // long boots
  for (const side of [-1, 1]) {
    m.ball(runner[0] + side * 5.5, runner[1] + 5.5, runner[2] - 1, 3.2, 3.2, 3.2, white); // buns
    m.limb([runner[0] + side * 6, runner[1] + 4, runner[2] - 2], [runner[0] + side * 15, runner[1] - 8, runner[2] - 9], 3.4, 1.2, white);
  }
  m.paint(60, 40.5, 22, 8, 1.6, 7, C.sakura);
  m.limb([66, 40, 18], [76, 33, 10], 1.7, 1.2, C.sakura).limb([76, 33, 10], [71, 24, 5], 1.2, 0.8, C.sakura);
  return m;
}

/** A meteorite on its stand, under a glass dome drawn by its reflections only: nothing in the room is transparent. */
function meteorite(): VoxelModel {
  const m = new VoxelModel(22, 28, 22);
  const c = 11;
  m.ball(c, 1, c, 10.5, 2.2, 10.5, C.walnut).limb([c, 2, c], [c, 7, c], 1.2, 1, C.mustard);
  m.ball(c, 11.5, c, 5.4, 4.4, 4.8, C.graphite).ball(c - 2.5, 12.5, c + 1.5, 3.6, 3.2, 3.6, C.taupe).ball(c + 2.5, 10, c - 1.5, 3.2, 2.8, 3.2, C.plum);
  for (const [x, y, z, color] of [[-3, 14, 3, C.mustard], [2, 13, 3.5, C.silver], [4, 10, 1, C.cyan], [-1, 9.5, 4, C.silver], [-4.5, 11, 1, C.rust]]) {
    m.paint(c + x, y, c + z, 1, 1, 1.4, color); // grains of its minerals
  }
  /* The dome: three thin arcs from its rim to its knob. */
  for (const angle of [0.6, 2.7, 4.6]) {
    let from: Point = [c + Math.cos(angle) * 9.5, 3, c + Math.sin(angle) * 9.5];
    for (let k = 1; k <= 6; k++) {
      const lift = (k / 6) * (Math.PI / 2);
      const to: Point = [c + Math.cos(angle) * 9.5 * Math.cos(lift), 3 + Math.sin(lift) * 21, c + Math.sin(angle) * 9.5 * Math.cos(lift)];
      m.limb(from, to, 0.55, 0.55, C.paper);
      from = to;
    }
  }
  m.ball(c, 25.5, c, 1.6, 1.6, 1.6, C.silver);
  return m;
}

/** Liquids that do not mix, one on top of the other in a glass, the heaviest at the bottom. */
function liquids(): VoxelModel {
  const m = new VoxelModel(10, 32, 10);
  const layers = [C.mustard, C.rust, C.leaf, C.denim, C.paper, C.amber, C.violet];
  for (let y = 0; y < 30; y++) {
    const color = y < 2 ? C.graphite : y > 27 ? C.silver : layers[Math.min(layers.length - 1, Math.floor((y - 2) / 3.72))];
    m.ball(5, y + 0.5, 5, y < 2 || y > 27 ? 4.6 : 3.8, 0.5, y < 2 || y > 27 ? 4.6 : 3.8, color);
  }
  return m;
}

/** A daruma: a round red doll with a white face, one eye still to paint. */
function daruma(): VoxelModel {
  const m = new VoxelModel(16, 16, 16);
  m.ball(8, 7.5, 8, 7.6, 7.6, 7.2, C.red);
  m.paint(8, 9.5, 14, 4.6, 3.8, 2.6, C.paper);
  m.paint(6, 10, 15.4, 1.1, 1.1, 1.4, C.ink); // the eye that is painted
  m.paint(8, 7.6, 15.2, 1.6, 0.7, 1.4, C.ink); // moustache
  for (const x of [5.6, 10.4]) m.paint(x, 12.2, 14.6, 1.8, 0.6, 1.6, C.ink); // brows
  m.paint(8, 3.8, 14, 2.6, 1.8, 2, C.mustard);
  return m;
}

/** A lucky cat, one paw raised, a coin against it and a bell at its collar. */
function luckyCat(): VoxelModel {
  const m = new VoxelModel(17, 24, 15);
  const white = C.paper;
  m.ball(8, 6, 7, 6.2, 6.6, 5.6, white).ball(8, 15.5, 7.5, 5.9, 5.2, 5.3, white);
  for (const x of [4.3, 11.7]) m.ball(x, 20.3, 7.2, 2, 2.2, 1.6, white).paint(x, 20, 8.4, 1, 1.2, 0.9, C.red); // ears
  m.limb([12.5, 9, 9], [14, 18.5, 9.5], 2, 1.8, white); // the raised paw
  m.paint(8, 11, 7.2, 6.4, 1.1, 6.2, C.red).ball(8, 10, 12.6, 1.4, 1.4, 1.3, C.mustard); // collar and bell
  for (const x of [5.9, 10.1]) m.paint(x, 16.2, 12.6, 0.9, 1.2, 1.2, C.ink); // eyes
  m.paint(8, 14.6, 13, 0.9, 0.7, 1.2, C.sakura); // nose
  m.ball(4.6, 6.2, 11.8, 2.8, 3.6, 1.4, C.mustard); // coin
  return m;
}

/** An endurance prototype: a low body between four wheels, a closed cockpit, a fin and a rear wing. Its nose points to -x. */
function car(): VoxelModel {
  const m = new VoxelModel(34, 10, 16);
  m.ball(17, 2.6, 8, 16.5, 2.6, 7.4, C.denim).box(0, 0, 0, 34, 1, 16, 0); // the body, clear of the ground
  for (const x of [7, 27]) {
    for (const z of [2.2, 13.8]) m.ball(x, 3.6, z, 4.2, 2.6, 2.4, C.denim).ball(x, 2.3, z, 2.5, 2.4, 1.7, C.ink); // fender, wheel
  }
  m.ball(15, 5, 8, 5.6, 2.8, 3.6, C.ink); // cockpit
  m.box(20, 5, 8, 9, 3, 1, C.denim); // fin
  m.box(30, 7, 1, 2, 1, 14, C.paper).box(30, 3, 1, 2, 4, 1, C.denim).box(30, 3, 14, 2, 4, 1, C.denim); // rear wing
  m.paint(8, 4.6, 8, 8, 1.6, 1.3, C.paper).paint(1.5, 2.6, 8, 2.2, 2, 3.4, C.red); // stripe and nose
  for (const z of [3.5, 12.5]) m.paint(2.6, 3.4, z, 1.4, 1, 1.2, C.mustard); // headlights
  return m;
}

/** A plush tiger, sitting. */
function tiger(): VoxelModel {
  const m = new VoxelModel(17, 21, 15);
  const fur = C.mustard;
  m.ball(8, 6, 7, 6.2, 6.6, 5.6, fur).ball(8, 14.5, 7.8, 5.7, 5, 5.1, fur);
  m.paint(8, 5.6, 11.8, 3.6, 4.4, 2, C.paper).ball(8, 13, 12.2, 2.7, 2, 1.7, C.paper); // belly and muzzle
  for (const x of [4.2, 11.8]) m.ball(x, 18.8, 7.5, 1.8, 1.8, 1.4, fur).paint(x, 19.6, 7.5, 1.2, 0.9, 1.6, C.ink); // ears
  for (const x of [5.9, 10.1]) m.paint(x, 15.6, 12.4, 0.9, 1.1, 1.2, C.ink); // eyes
  m.paint(8, 13.8, 13.6, 1, 0.7, 1, C.rust); // nose
  for (const [x, y, z, rx, rz] of [[8, 19, 7, 0.8, 3], [5.6, 18, 7, 0.7, 2.6], [10.4, 18, 7, 0.7, 2.6]]) m.paint(x, y, z, rx, 1.6, rz, C.ink); // stripes on the head
  for (const y of [4, 7, 10]) m.paint(2.4, y, 7, 1.4, 0.8, 4, C.ink).paint(13.6, y, 7, 1.4, 0.8, 4, C.ink); // and down the sides
  for (const x of [4.6, 11.4]) {
    m.limb([x, 9, 10], [x + (x < 8 ? 0.6 : -0.6), 5.4, 12.6], 1.9, 1.7, fur); // arms
    m.ball(x, 1.8, 11.6, 2.5, 1.9, 2.8, fur).paint(x, 1.8, 13.8, 1.3, 1, 1, C.paper); // feet and their pads
  }
  m.limb([12, 2, 3], [15.4, 7.5, 2.4], 1.3, 1.1, fur).paint(15.4, 7.5, 2.4, 1.5, 1.5, 1.5, C.ink); // tail
  return m;
}

/** A book of temple stamps: folded pages between two covers of cloth, a label on the front one. It stands half open to the room. */
function stampBook(): VoxelModel {
  const m = new VoxelModel(4, 26, 18);
  m.box(0, 0, 0, 4, 26, 18, C.rust).box(1, 1, 1, 2, 25, 17, C.paper).box(1, 0, 0, 2, 1, 18, C.rust);
  m.box(3, 9, 5, 1, 14, 5, C.paper);
  for (const [y, z] of [[20, 6], [18, 8], [16, 6], [14, 7], [12, 8]]) m.box(3, y, z, 1, 1, 2, C.ink);
  m.box(3, 0, 0, 1, 2, 2, C.mustard).box(3, 24, 16, 1, 2, 2, C.mustard); // corners
  return m;
}

export const shelfThings = (): RoomObject[] => [
  on('duo', duo(), 0.01, FINER / 2),
  on('meteorite', meteorite(), 0.29),
  on('liquids', liquids(), 0.45),
  on('daruma', daruma(), 0.54),
  on('lucky-cat', luckyCat(), 0.66),
  on('car', car(), 0.79),
  on('tiger', tiger(), 1.03),
  on('stamp-book', stampBook(), 1.185, FINER, -45),
];
