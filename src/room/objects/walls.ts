/*
  What hangs on the two walls or stands against them. The clickable ones are
  plain for now: their papers, drawings and badges come with their content.
*/
import { mulberry32 } from '../../lib/photon/prng.ts';
import { EMISSIVE, VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';

/**
 * The row of frames above the bed, on the left wall: four diplomas of
 * 30 × 40 cm, then the TOEIC certificate, wider than high, with its blue
 * header and its seal.
 */
export function frames(): RoomObject {
  const m = new VoxelModel(1, 10, 35);
  const frame = (z: number, y: number, width: number, height: number) =>
    m.box(0, y, z, 1, height, width, C.walnut).box(0, y + 1, z + 1, 1, height - 2, width - 2, C.paper);
  for (const z of [0, 7, 14, 21]) frame(z, 1, 6, 8);
  frame(28, 2, 7, 6);
  m.box(0, 6, 29, 1, 1, 5, C.denim).set(0, 3, 33, C.mustard);
  return { name: 'frames', voxel: 0.05, at: [0, 1.25, 0.15], model: m };
}

/** 60 cm wide, 30 cm deep, 2 m high, full of books. */
export function bookshelf(): RoomObject {
  const m = new VoxelModel(6, 40, 12);
  m.box(0, 0, 0, 1, 40, 12, C.walnut); // back panel, against the wall
  m.box(0, 0, 0, 6, 40, 1, C.chestnut).box(0, 0, 11, 6, 40, 1, C.chestnut); // sides
  const shelves = [0, 8, 16, 24, 32, 39];
  for (const y of shelves) m.box(0, y, 0, 6, 1, 12, C.chestnut);
  /* Books, one voxel thick, spines towards the room. Same shelves on every visit. */
  const random = mulberry32(7);
  const spines = [C.rust, C.mustard, C.sage, C.teal, C.denim, C.plum, C.paper, C.red, C.moss, C.taupe];
  for (const shelf of shelves.slice(0, 5)) {
    for (let z = 1; z < 11; z++) {
      if (random() < 0.15) continue; // a gap
      const height = 4 + Math.floor(random() * 3);
      m.box(1, shelf + 1, z, 3 + Math.floor(random() * 2), height, 1, spines[Math.floor(random() * spines.length)]);
    }
  }
  return { name: 'bookshelf', voxel: 0.05, at: [0, 0, 2.25], model: m, decor: true };
}

/** Clipboard near the door: a board, a sheet and its clip. Voxels of 2.5 cm. */
export function clipboard(): RoomObject {
  const m = new VoxelModel(1, 14, 9);
  m.box(0, 0, 0, 1, 14, 9, C.chestnut).box(0, 1, 1, 1, 11, 7, C.paper);
  for (const y of [3, 5, 7, 9]) m.box(0, y, 2, 1, 1, y === 5 ? 3 : 5, C.stone); // lines of text
  m.box(0, 12, 3, 1, 2, 3, C.steel); // clip
  return { name: 'clipboard', voxel: 0.025, at: [0, 1.1, 2.95], model: m };
}

/** Wall calendar above the nightstand, 30 × 40 cm. Voxels of 2.5 cm. */
export function calendar(): RoomObject {
  const m = new VoxelModel(12, 16, 1);
  m.box(0, 0, 0, 12, 16, 1, C.paper).box(0, 13, 0, 12, 3, 1, C.red); // sheet and its header
  for (let y = 2; y < 12; y += 2) {
    for (let x = 1; x < 11; x += 2) m.set(x, y, 0, C.stone); // days
  }
  return { name: 'calendar', voxel: 0.025, at: [1.2, 1.05, 0], model: m };
}

/** Poster above the calendar: a striped sun setting behind hills, over a grid. 50 × 70 cm. */
export function poster(): RoomObject {
  const width = 20;
  const height = 28;
  const m = new VoxelModel(width, height, 1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let color: number = y > 20 ? C.night : C.plum; // sky
      const sun = Math.hypot(x - 9.5, y - 15) < 6.2;
      if (sun && y % 3 !== 0) color = y > 15 ? C.mustard : C.rust;
      if (y < 9) color = y % 3 === 1 || x % 4 === 1 ? C.magenta : C.ink; // the grid
      if (y === 9) color = C.cyan; // horizon
      if (y >= 10 && y < 10 + 4 - Math.abs(((x + 3) % 10) - 4)) color = C.ink; // hills
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) color = C.ink; // border
      m.set(x, y, 0, color);
    }
  }
  for (const [x, y] of [[3, 24], [14, 25], [16, 22], [6, 22]]) m.set(x, y, 0, C.paper); // stars
  return { name: 'poster', voxel: 0.025, at: [1.15, 1.6, 0], model: m, decor: true };
}

/** Pegboard above the left half of the desk, 1.2 m × 75 cm. */
export function pegboard(): RoomObject {
  const m = new VoxelModel(24, 15, 1);
  m.box(0, 0, 0, 24, 15, 1, C.honey);
  for (let y = 1; y < 15; y += 3) {
    for (let x = 1; x < 24; x += 3) m.set(x, y, 0, C.oak); // holes
  }
  return { name: 'pegboard', voxel: 0.05, at: [1.8, 1.35, 0], model: m };
}

/** A wall shelf: a board `length` voxels long on two brackets. */
export function shelf(name: string, at: [number, number, number], length: number): RoomObject {
  const m = new VoxelModel(length, 3, 4);
  for (const x of [2, length - 3]) m.box(x, 0, 0, 1, 2, 1, C.walnut).box(x, 1, 1, 1, 1, 2, C.walnut); // brackets
  m.box(0, 2, 0, length, 1, 4, C.honey);
  return { name, voxel: 0.05, at, model: m, decor: true };
}

/**
 * The figurines of the top shelf: manga archetypes, none of them a known
 * character. Four on a riser at the back and four in front, each a sprite
 * two voxels thick, top row first. Voxels of 2.5 cm: the tallest is 25 cm.
 */
export function figurines(): RoomObject {
  const legend = {
    K: C.ink, G: C.graphite, P: C.plum, W: C.paper, S: C.apricot, D: C.denim, N: C.night, R: C.rust,
    M: C.magenta, Y: C.mustard, T: C.teal, V: C.silver, L: C.steel, E: C.moss, r: C.red, c: C.cyan | EMISSIVE,
  };
  const winged = ['K.......K', 'KK.PPP.KK', 'KKPPPPPKK', 'KK.SSS.KK', 'KKKSSSKKK', '.KKSSSKK.', '..KGGGK..', '...G.G...', '.RRRRRRR.'];
  const fighter = ['.WWWW.S', 'WWWWWWS', 'WWKSKWS', '.WWWWWS', '..SSSS.', '..SSS..', '..NNN..', '..S.S..', '.WWWWW.', 'WWWWWWW'];
  const fallen = ['...GGG...', '..GGGGG..', 'K..SSS..K', 'KK.SSS.KK', 'KKKPPPKKK', 'KKKGGGKKK', 'KK.G.G.KK', '.DDDDDDD.'];
  const runner = ['.MMMM..', 'MMMMMM.', 'MKSKMM.', '.SSS..S', 'WWWWWWS', '.WWW...', '.WMW...', '.W.W...', 'WWWWWWW'];
  const kid = ['.KK.', 'KKKK', 'KSSK', 'DDDD', 'EEEE'];
  const gentleman = ['.GGG.', '.GGG.', 'GMMMG', '.KSK.', 'GGWGG', 'GGWGG', '.GGG.', '.G.G.', 'PPPPP'];
  const robot = ['.LLL.', 'LcccL', '.LLL.', 'VLrLV', 'VLLLV', '.L.L.', '.L.L.', 'GGGGG'];
  const swordsman = ['V.....', 'V.YYY.', 'V.YYY.', 'V.KSK.', 'STTTTT', '.TTTT.', '.TTTT.', '.T..T.', 'GGGGGG'];

  const m = new VoxelModel(35, 13, 6);
  const stand = (sprite: string[], x: number, y: number, z: number) =>
    m.picture(x, y, z, sprite, legend).picture(x, y, z + 1, sprite, legend);
  m.box(0, 0, 0, 35, 3, 3, C.walnut); // riser
  stand(winged, 0, 3, 0);
  stand(fighter, 10, 3, 0);
  stand(fallen, 18, 3, 0);
  stand(runner, 28, 3, 0);
  stand(kid, 2, 0, 4);
  stand(gentleman, 10, 0, 4);
  stand(robot, 19, 0, 4);
  stand(swordsman, 27, 0, 4);
  return { name: 'figurines', voxel: 0.025, at: [3.5625, 2.05, 0.025], model: m };
}

/** The neon sign, a prompt: ">" in magenta, "_" in cyan. 65 × 45 cm. */
export function neon(): RoomObject {
  const m = new VoxelModel(13, 9, 1);
  m.picture(
    0,
    0,
    0,
    ['m............', '.m...........', '..m..........', '...m.........', '....m........', '...m.........', '..m..........', '.m...........', 'm......cccccc'],
    { m: C.magenta | EMISSIVE, c: C.cyan | EMISSIVE },
  );
  return { name: 'neon', voxel: 0.05, at: [2.7, 2.17, 0], model: m, decor: true };
}

/** Where the whiteboard hangs, and its writing surface inside one voxel of frame: centre, width and height in metres. */
const WHITEBOARD = { x: 4.5, y: 1.05 };
export const WHITEBOARD_SURFACE = { x: WHITEBOARD.x + 0.575, y: WHITEBOARD.y + 0.45, z: 0.05 + 0.002, width: 1.05, height: 0.8 };

/** Whiteboard above the cabinet, 1.15 m × 90 cm, with its tray and four markers. What is written on it is a texture. */
export function whiteboard(): RoomObject {
  const m = new VoxelModel(23, 18, 2);
  m.box(0, 0, 0, 23, 18, 1, C.silver).box(1, 1, 0, 21, 16, 1, C.paper);
  m.box(2, 0, 1, 19, 1, 1, C.steel); // tray
  [C.ink, C.denim, C.red, C.leaf].forEach((color, i) => m.box(4 + i * 4, 1, 1, 2, 1, 1, color)); // markers
  return { name: 'whiteboard', voxel: 0.05, at: [WHITEBOARD.x, WHITEBOARD.y, 0], model: m };
}
