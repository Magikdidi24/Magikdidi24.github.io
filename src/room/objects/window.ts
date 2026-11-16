/*
  The window in the back wall, above the head of the bed: a frame lining the
  opening, one cross and a sill deep enough for the dog. No pane: nothing in
  the scene is transparent.
*/
import { VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';

/** The opening it fills, in metres. scene.ts cuts the back wall to match. */
export const WINDOW = { x0: 0.1, x1: 1.0, y0: 0.9, y1: 2.1 } as const;

/** Thickness of the wall it sits in. */
const WALL = 0.2;

export function windowFrame(): RoomObject {
  /* x: one voxel each side of the opening. z: the wall (0 to 3), then 10 cm into the room. */
  const m = new VoxelModel(20, 24, 6);
  m.box(1, 0, 0, 18, 1, 4, C.walnut).box(0, 0, 4, 20, 1, 2, C.walnut); // sill
  m.box(1, 1, 1, 1, 23, 2, C.walnut).box(18, 1, 1, 1, 23, 2, C.walnut).box(1, 23, 1, 18, 1, 2, C.walnut); // frame
  m.box(9, 1, 1, 2, 22, 1, C.walnut).box(2, 12, 1, 16, 1, 1, C.walnut); // cross
  return { name: 'window', voxel: 0.05, at: [WINDOW.x0 - 0.05, WINDOW.y0, -WALL], model: m };
}
