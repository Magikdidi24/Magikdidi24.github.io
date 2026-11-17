/*
  The manga library: bookcases from floor to ceiling along the two walls that
  the opening view leaves out. It shows when the camera goes round the room.
  The case and the block of books on each shelf are voxels of 2.5 cm. The
  spines are a picture laid on the front of the books, drawn in
  src/room/voxel/spines.ts in texels of 5 mm, five to a voxel: a volume is 4
  texels thick, 2 cm, and 35 high.

  The series are those of src/data/manga.ts, in their order, from the top
  left: along the east wall, round the corner, along the south wall, then
  one shelf down. Everything here is pure, so that it runs under
  `node --test` (tests/library.test.mjs).
*/
import { manga } from '../../data/manga.ts';
import { mulberry32 } from '../../lib/photon/prng.ts';
import { VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';

const VOXEL = 0.025;
/** In voxels: the depth of a bookcase, the distance from a shelf to the next, how many shelves, and the width of a bay between two uprights. */
const DEPTH = 8;
const TIER = 9;
export const TIERS = 10;
const BAY = 32;
/** The top board, and the height of the model with what is stored on it. */
const TOP = 2 + TIERS * TIER;
const HEIGHT = TOP + 9;
/** The books of a shelf, in voxels: their height, how far their backs are from the wall, and how deep they are. */
const BOOKS = { height: 7, back: 4, depth: 3 };
/** In voxels: the height of the first shelf, where its books stand. */
const FLOOR = 3;

/** A spine, in texels: how many metres a texel is, the thickness of a volume, its height, and the distance from a shelf to the next. */
export const SPINE = { texel: VOXEL / 5, width: 4, height: BOOKS.height * 5, tier: TIER * 5 };

/** Where the two bookcases stand, in metres: one along the east wall, one along the south wall, meeting in their corner. */
export const LIBRARY = {
  east: { x: 5.8, from: 1, to: 4.4 },
  south: { z: 4.2, from: 1, to: 5.8 },
} as const;

/** The two bookcases in reading order, each with its length in voxels. */
const CASES = [
  { name: 'manga-east', length: Math.round((LIBRARY.east.to - LIBRARY.east.from) / VOXEL) },
  { name: 'manga-south', length: Math.round((LIBRARY.south.to - LIBRARY.south.from) / VOXEL) },
] as const;

/**
 * Volumes of one series side by side on a shelf. `first` is the number of
 * the first one, from 0; `x` is where the run starts, in texels from the
 * left end of its bookcase as the room sees it.
 */
export interface Run {
  series: number;
  first: number;
  count: number;
  shelf: number;
  tier: number;
  x: number;
}

/** Where the uprights of a bookcase stand, in voxels from its left end: one at the start of each bay, one at its far end. */
function uprights(length: number): number[] {
  const starts = Array.from({ length: Math.ceil(length / BAY) }, (_, k) => k * BAY).filter((at) => at < length - 1);
  return [...starts, length - 1];
}

/** The bays of a bookcase `length` voxels long: where the books of each one start and end, in texels. */
export function bays(length: number): [number, number][] {
  const posts = uprights(length);
  return posts.slice(1).map((post, k) => [(posts[k] + 1) * 5, post * 5]);
}

/**
 * Put series on the shelves of bookcases of these lengths, in order: each
 * shelf from the left, one bookcase after the other, from the top shelf down.
 * `volumes` is how many volumes each series has. A series that no longer
 * fits whole is left out.
 */
export function shelve(lengths: readonly number[], volumes: readonly number[]): Run[] {
  const places: { shelf: number; tier: number; x: number; room: number }[] = [];
  for (let tier = TIERS - 1; tier >= 0; tier--) {
    lengths.forEach((length, shelf) => {
      for (const [from, to] of bays(length)) places.push({ shelf, tier, x: from, room: Math.floor((to - from) / SPINE.width) });
    });
  }
  let left = places.reduce((sum, place) => sum + place.room, 0);
  let at = 0;
  const runs: Run[] = [];
  volumes.forEach((count, series) => {
    if (count > left) return;
    left -= count;
    for (let first = 0; first < count; ) {
      const place = places[at];
      const taken = Math.min(count - first, place.room);
      runs.push({ series, first, count: taken, shelf: place.shelf, tier: place.tier, x: place.x });
      first += taken;
      place.x += taken * SPINE.width;
      place.room -= taken;
      if (place.room === 0) at++;
    }
  });
  return runs;
}

/** The series that stands at texel `x` of a shelf, by its number, or -1. */
export function seriesAt(runs: readonly Run[], shelf: number, tier: number, x: number): number {
  const run = runs.find((r) => r.shelf === shelf && r.tier === tier && x >= r.x && x < r.x + r.count * SPINE.width);
  return run ? run.series : -1;
}

/** The library as it stands: every run of every series of the data. */
export const RUNS: readonly Run[] = shelve(
  CASES.map(({ length }) => length),
  manga.map(({ volumes }) => volumes),
);

/** `put` places one voxel: how far along the bookcase from its left end, how high, and how far from the wall (0 touches it). */
type Put = (along: number, y: number, depth: number, color: number) => void;

/** One bookcase: its case, a block of books for each run that stands in it, and what is stored on top. */
function bookcase(length: number, shelf: number, seed: number, put: Put): void {
  const random = mulberry32(seed);
  const upTo = (n: number) => Math.floor(random() * n);
  const pick = (list: number[]) => list[upTo(list.length)];
  const box = (along: number, y: number, depth: number, w: number, h: number, d: number, color: number) => {
    for (let i = along; i < along + w; i++) for (let j = y; j < y + h; j++) for (let k = depth; k < depth + d; k++) put(i, j, k, color);
  };

  box(0, 0, 0, length, 2, DEPTH - 1, C.stone); // plinth, set back
  box(0, 2, 0, length, TOP - 2, BOOKS.back, C.linen); // back, thick: nothing is hollow behind the volumes
  for (const post of uprights(length)) box(post, 2, 0, 1, TOP - 1, DEPTH, C.paper);
  for (let tier = 0; tier <= TIERS; tier++) box(0, 2 + tier * TIER, 0, length, 1, DEPTH, C.paper); // boards

  /* The books: the picture of their spines hides their front, so only their tops show. */
  for (const run of RUNS) {
    if (run.shelf !== shelf) continue;
    const from = Math.floor(run.x / 5);
    const to = Math.ceil((run.x + run.count * SPINE.width) / 5);
    box(from, FLOOR + run.tier * TIER, BOOKS.back, to - from, BOOKS.height, BOOKS.depth, C.paper);
  }

  /* On top, under the ceiling: boxed sets, dark, each with its label. */
  for (let i = 2; i < length - 8; i += 2 + upTo(4)) {
    const [w, h] = [5 + upTo(5), 4 + upTo(4)];
    if (random() < 0.35 || i + w > length - 1) continue;
    box(i, TOP + 1, 1, w, h, 6, pick([C.ink, C.night, C.plum, C.rust, C.graphite, C.teal]));
    box(i + 1, TOP + 2, 6, w - 2, 2, 1, C.paper);
    i += w;
  }
}

/**
 * The bookcase of the east wall, then that of the south wall. Each is one
 * object, to be clicked. Their left end, as the room sees them, is where z
 * is smallest for the first and in the corner for the second.
 */
export function library(): RoomObject[] {
  const { east, south } = LIBRARY;
  const eastward = new VoxelModel(DEPTH, HEIGHT, CASES[0].length);
  bookcase(eastward.sz, 0, 31, (along, y, depth, color) => eastward.set(DEPTH - 1 - depth, y, along, color));
  const southward = new VoxelModel(CASES[1].length, HEIGHT, DEPTH);
  bookcase(southward.sx, 1, 47, (along, y, depth, color) => southward.set(southward.sx - 1 - along, y, DEPTH - 1 - depth, color));
  return [
    { name: CASES[0].name, voxel: VOXEL, at: [east.x, 0, east.from], model: eastward, wall: 'east' },
    { name: CASES[1].name, voxel: VOXEL, at: [south.from, 0, south.z], model: southward, wall: 'south' },
  ];
}

/** How far the picture of the spines lies in front of the books, in metres. */
const CLEAR = 0.0015;
/** How far the front of the books is from the back of a bookcase's place, in metres, and the height of the picture: from the foot of the lowest books to the top of the highest. */
const FRONT = (DEPTH - BOOKS.back - BOOKS.depth) * VOXEL - CLEAR;
const TALL = ((TIERS - 1) * TIER + BOOKS.height) * VOXEL;

/**
 * The picture of the spines of each bookcase: the object it belongs to, its
 * middle and its size in metres, the way it faces (a turn about y, from +z),
 * and its size in texels.
 */
export const FRONTS = CASES.map(({ name, length }, shelf) => {
  const { east, south } = LIBRARY;
  const [width, y] = [length * VOXEL, FLOOR * VOXEL + TALL / 2];
  const place = shelf === 0 ? { x: east.x + FRONT, y, z: east.from + width / 2, turn: -Math.PI / 2 } : { x: south.to - width / 2, y, z: south.z + FRONT, turn: Math.PI };
  return { name, shelf, ...place, width, height: TALL, texels: { width: length * 5, height: Math.round(TALL / SPINE.texel) } };
});

type Point = [number, number, number];

/**
 * The series whose spine a ray meets on the front of a bookcase, by its
 * number, or -1: the ray leaves `origin` along `direction`, in metres.
 */
export function seriesOn(name: string, origin: Point, direction: Point): number {
  const front = FRONTS.find((candidate) => candidate.name === name);
  if (!front) return -1;
  const across = front.shelf === 0 ? 0 : 2; // the axis the front faces along
  if (direction[across] === 0) return -1;
  const reach = ((across === 0 ? front.x : front.z) - origin[across]) / direction[across];
  const hit = origin.map((from, k) => from + direction[k] * reach);
  const x = front.shelf === 0 ? (hit[2] - LIBRARY.east.from) / SPINE.texel : (LIBRARY.south.to - hit[0]) / SPINE.texel;
  const high = hit[1] / VOXEL - FLOOR;
  const tier = Math.floor(high / TIER);
  if (high < 0 || high - tier * TIER >= BOOKS.height) return -1; // on a board, or in the gap under it
  return seriesAt(RUNS, front.shelf, tier, x);
}

/** A volume pulled from a shelf, to fall on the floor when a bookcase is clicked. It stays hidden until then. Voxels of 1.25 cm. */
export function volume(): RoomObject {
  const m = new VoxelModel(10, 2, 14);
  m.box(0, 0, 0, 10, 2, 14, C.red).box(1, 0, 1, 9, 2, 12, C.paper).box(0, 1, 0, 10, 1, 14, C.red); // cover over its pages
  m.box(2, 1, 2, 6, 1, 3, C.paper).box(3, 1, 7, 4, 1, 4, C.mustard); // title and picture
  return { name: 'volume', voxel: 0.0125, at: [0, 0, 0], model: m, hidden: true };
}

/** Where a volume leaves a bookcase, and where it lands in front of it, `along` being 0 at one end of the bookcase and 1 at the other. Metres. */
export function pulled(name: string, along: number, tier: number): { from: [number, number, number]; to: [number, number, number] } {
  const { east, south } = LIBRARY;
  const height = (FLOOR + tier * TIER) * VOXEL;
  if (name === 'manga-east') {
    const z = east.from + 0.1 + along * (east.to - east.from - 0.4);
    return { from: [east.x - 0.08, height, z], to: [east.x - 0.75, 0, z + 0.1] };
  }
  const x = south.from + 0.1 + along * (south.to - south.from - 0.4);
  return { from: [x, height, south.z - 0.1], to: [x + 0.1, 0, south.z - 0.8] };
}
