/*
  The manga library: bookcases from floor to ceiling along the two walls that
  the opening view leaves out. It shows when the camera goes round the room.
  A volume is one voxel thick, 2.5 cm; a series is a run of volumes with the
  same spine. No title is written and no series is a real one.
*/
import { mulberry32 } from '../../lib/photon/prng.ts';
import { VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';

const VOXEL = 0.025;
/** In voxels: the depth of a bookcase, the distance from a shelf to the next, how many shelves, and the width of a bay between two uprights. */
const DEPTH = 8;
const TIER = 9;
const TIERS = 10;
const BAY = 32;
/** The top board, and the height of the model with what is stored on it. */
const TOP = 2 + TIERS * TIER;
const HEIGHT = TOP + 9;

/** Where the two bookcases stand, in metres: one along the east wall, one along the south wall, meeting in their corner. */
export const LIBRARY = {
  east: { x: 5.8, from: 1, to: 4.4 },
  south: { z: 4.2, from: 1, to: 5.8 },
} as const;

const SPINES = [C.paper, C.paper, C.paper, C.linen, C.ink, C.graphite, C.red, C.rust, C.mustard, C.denim, C.teal, C.night, C.plum, C.sage, C.blossom, C.sakura, C.steel];
const MARKS = [C.ink, C.red, C.mustard, C.denim, C.paper, C.leaf, C.plum, C.teal];
const RAINBOW = [C.red, C.rust, C.mustard, C.leaf, C.teal, C.denim, C.plum, C.sakura];

/** `put` places one voxel: how far along the wall, how high, and how far from the wall (0 touches it). */
type Put = (along: number, y: number, depth: number, color: number) => void;

/** One bookcase, `length` voxels long: its case, then every shelf filled from one end to the other. */
function bookcase(length: number, seed: number, put: Put): void {
  const random = mulberry32(seed);
  const upTo = (n: number) => Math.floor(random() * n);
  const pick = (list: number[]) => list[upTo(list.length)];
  const box = (along: number, y: number, depth: number, w: number, h: number, d: number, color: number) => {
    for (let i = along; i < along + w; i++) for (let j = y; j < y + h; j++) for (let k = depth; k < depth + d; k++) put(i, j, k, color);
  };

  box(0, 0, 0, length, 2, DEPTH - 1, C.stone); // plinth, set back
  box(0, 2, 0, length, TOP - 2, 4, C.linen); // back, thick: nothing is hollow behind the volumes
  for (let i = 0; i < length; i += BAY) box(i, 2, 0, 1, TOP - 1, DEPTH, C.paper); // uprights
  box(length - 1, 2, 0, 1, TOP - 1, DEPTH, C.paper);
  for (let tier = 0; tier <= TIERS; tier++) box(0, 2 + tier * TIER, 0, length, 1, DEPTH, C.paper); // boards

  for (let tier = 0; tier < TIERS; tier++) {
    const y = 3 + tier * TIER;
    for (let i = 1; i < length - 1; ) {
      const room = Math.min(BAY - (i % BAY), length - 1 - i); // voxels left before the next upright
      const roll = random();
      if (i % BAY === 0 || roll < 0.06) {
        i += i % BAY === 0 ? 1 : 1 + upTo(3); // an upright, or a gap
      } else if (roll < 0.11 && room >= 7) {
        /* A boxed set lying on the shelf, or a small figure standing on it. */
        if (random() < 0.5) {
          box(i, y, 4, 6, 5, 3, pick(SPINES));
          box(i + 1, y + 1, 6, 4, 2, 1, C.paper);
        } else {
          box(i + 2, y, 4, 3, 4, 3, pick(RAINBOW));
          box(i + 2, y + 4, 4, 3, 2, 3, C.apricot);
          box(i + 2, y + 6, 4, 3, 1, 3, pick([C.ink, C.mustard, C.paper, C.rust]));
        }
        i += 7;
      } else {
        /* A series: the same spine, the same mark at the same height, from its first volume to its last. */
        const count = Math.min(room, 2 + upTo(13));
        const tall = random() < 0.3 ? 7 : 8; // most of them as high as their shelf
        const rainbow = count >= 10 && random() < 0.3 ? upTo(RAINBOW.length) : -1;
        const [spine, mark, band, at] = [pick(SPINES), pick(MARKS), pick(MARKS), 1 + upTo(3)];
        for (let k = 0; k < count; k++) {
          const color = rainbow < 0 ? spine : RAINBOW[(rainbow + Math.floor(k / 2)) % RAINBOW.length];
          box(i + k, y, 4, 1, tall, 3, color);
          if (color !== mark) put(i + k, y + at, 6, mark);
          if (color !== band) put(i + k, y + tall - 2, 6, band);
        }
        i += count;
      }
    }
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

/** The bookcase of the east wall, then that of the south wall. Each is one object, to be clicked. */
export function library(): RoomObject[] {
  const { east, south } = LIBRARY;
  const eastward = new VoxelModel(DEPTH, HEIGHT, Math.round((east.to - east.from) / VOXEL));
  bookcase(eastward.sz, 31, (along, y, depth, color) => eastward.set(DEPTH - 1 - depth, y, along, color));
  const southward = new VoxelModel(Math.round((south.to - south.from) / VOXEL), HEIGHT, DEPTH);
  bookcase(southward.sx, 47, (along, y, depth, color) => southward.set(along, y, DEPTH - 1 - depth, color));
  return [
    { name: 'manga-east', voxel: VOXEL, at: [east.x, 0, east.from], model: eastward, wall: 'east' },
    { name: 'manga-south', voxel: VOXEL, at: [south.from, 0, south.z], model: southward, wall: 'south' },
  ];
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
  const height = (3 + tier * TIER) * VOXEL;
  if (name === 'manga-east') {
    const z = east.from + 0.1 + along * (east.to - east.from - 0.4);
    return { from: [east.x - 0.08, height, z], to: [east.x - 0.75, 0, z + 0.1] };
  }
  const x = south.from + 0.1 + along * (south.to - south.from - 0.4);
  return { from: [x, height, south.z - 0.1], to: [x + 0.1, 0, south.z - 0.8] };
}
