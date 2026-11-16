/*
  Everything that stands in the room. An object is a voxel model, the size of
  its voxels and where its corner (0, 0, 0) sits. Its position in this list,
  plus one, is its id in the outline pass: 0 is the room itself.
*/
import type { VoxelModel } from '../voxel/builder.ts';
import { bed, dog, nightstand } from './bed.ts';
import { book, chair, desk, headphones, keyboard, lamp, mainMonitor, mouse, mug, sideMonitor, speaker } from './desk.ts';
import { door } from './door.ts';
import { bigPlant, rug, smallPlant } from './floor.ts';
import { cabinet, homelab, pc, printer } from './tech.ts';
import { bookshelf, calendar, clipboard, figurines, frames, neon, pegboard, poster, shelf, whiteboard } from './walls.ts';
import { windowFrame } from './window.ts';

export interface RoomObject {
  name: string;
  /** Size of a voxel, in metres. */
  voxel: number;
  /** Where the corner (0, 0, 0) of the model sits in the room, in metres. */
  at: [number, number, number];
  model: VoxelModel;
  /** Rotation around the vertical axis through the centre of the model, in degrees. */
  turn?: number;
  /** It never moves and is not clickable: merged with the rest of the decor into one mesh. */
  decor?: boolean;
}

export const objects = (): RoomObject[] => [
  /* Walls */
  door(),
  windowFrame(),
  frames(),
  bookshelf(),
  clipboard(),
  calendar(),
  poster(),
  pegboard(),
  shelf('shelf', [3.1, 1.35, 0], 24),
  shelf('shelf-top', [3.55, 1.9, 0], 18),
  figurines(),
  neon(),
  whiteboard(),
  /* Bed corner */
  bed(),
  dog(),
  nightstand(),
  /* Desk */
  desk(),
  chair(),
  mainMonitor(),
  sideMonitor(),
  keyboard(),
  mouse(),
  mug(),
  lamp(),
  book(),
  speaker('speaker-left', 0.04),
  speaker('speaker-right', 1.56),
  headphones(),
  /* Right of the desk */
  pc(),
  cabinet(),
  homelab(),
  printer(),
  /* Floor */
  rug(),
  bigPlant(),
  smallPlant('plant-bookshelf', [0.08, 2, 2.47]),
  smallPlant('plant-shelf', [4.08, 1.5, 0.02]),
];
