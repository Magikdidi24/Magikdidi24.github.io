/*
  Everything that stands in the room. An object is a voxel model, the size of
  its voxels and where its corner (0, 0, 0) sits. Its position in this list,
  plus one, is its id in the outline pass: 0 is the room itself.
*/
import type { Wall } from '../view.ts';
import type { VoxelModel } from '../voxel/builder.ts';
import { bed, bedding, book, dog, lamp, nightstand } from './bed.ts';
import { chair, desk, dock, headphones, juice, keyboard, mainMonitor, mouse, sideMonitor, speaker } from './desk.ts';
import { door } from './door.ts';
import { extras } from './extras.ts';
import { figurines } from './figurines.ts';
import { rug } from './floor.ts';
import { library, volume } from './library.ts';
import { LOWER_SHELF, shelfThings } from './shelf.ts';
import { statues } from './statues.ts';
import { cabinet, cabinetDoors, consoles, cvSheet, homelab, pc, printer } from './tech.ts';
import { badges, bonsai, calendar, clipboard, eraser, formulas, frames, gem, marker, MARKERS, neon, passes, pegboard, shelf, whiteboard } from './walls.ts';
import { beacon, tableNumber, wardrobe, wardrobeDoors } from './wardrobe.ts';
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
  /** It is not shown until something brings it in. */
  hidden?: boolean;
  /** Sculpted in voxels much smaller than a pixel of the room, and shaded as a round shape. */
  smooth?: boolean;
  /** The wall it hangs on or stands against: it goes with that wall when the camera looks from behind it. */
  wall?: Wall;
}

export const objects = (): RoomObject[] => [
  /* Left wall */
  door(),
  ...frames(),
  wardrobe(),
  ...wardrobeDoors(),
  tableNumber(),
  beacon(),
  clipboard(),
  /* Back wall */
  windowFrame(),
  calendar(),
  pegboard(),
  passes(),
  formulas(),
  badges(),
  bonsai(),
  gem(),
  shelf('shelf', [LOWER_SHELF.x, LOWER_SHELF.y, 0], LOWER_SHELF.length),
  ...shelfThings(),
  shelf('shelf-top', [3.45, 1.9, 0], 20, 7, 4),
  figurines(),
  ...statues(),
  neon(),
  whiteboard(),
  eraser(),
  ...MARKERS.map(marker),
  /* Bed corner */
  bed(),
  bedding(),
  dog(),
  nightstand(),
  lamp(),
  book(),
  /* Desk */
  desk(),
  chair(),
  mainMonitor(),
  sideMonitor(),
  keyboard(),
  mouse(),
  juice(),
  speaker('speaker-left', 0.05),
  speaker('speaker-right', 1.68),
  headphones(),
  dock(),
  /* Right of the desk */
  pc(),
  cabinet(),
  ...cabinetDoors(),
  ...consoles(),
  homelab(),
  printer(),
  cvSheet(),
  /* Floor */
  rug(),
  /* Small things, here and there */
  ...extras(),
  /* The two walls behind the opening view */
  ...library(),
  volume(),
];
