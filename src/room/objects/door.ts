/*
  The door in the left wall: frame, leaf set back in the wall, handle and the
  name plate. In the model x is the depth through the wall and z runs along it.
*/
import { VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';

/** The opening it fills, in metres along the left wall. scene.ts cuts the wall to match. */
export const DOOR = { z0: 3.3, z1: 4.2, height: 2.1 } as const;

export function door(): RoomObject {
  const m = new VoxelModel(3, 43, 20);
  /* The frame lines the inside of the opening (x 0 and 1, in the wall) and
     laps over the wall face around it (x 2, in the room). */
  m.box(0, 0, 1, 2, 42, 1, C.walnut).box(0, 0, 18, 2, 42, 1, C.walnut).box(0, 41, 1, 2, 1, 18, C.walnut);
  m.box(2, 0, 0, 1, 43, 2, C.walnut).box(2, 0, 18, 1, 43, 2, C.walnut).box(2, 41, 0, 1, 2, 20, C.walnut);
  m.box(0, 0, 2, 1, 41, 16, C.chestnut); // leaf, 80 cm wide
  /* Two sunk panels, drawn as a darker line around them. */
  for (const [y, h] of [[3, 16], [22, 16]]) {
    m.box(0, y, 4, 1, h, 12, C.walnut).box(0, y + 1, 5, 1, h - 2, 10, C.chestnut);
  }
  m.box(0, 30, 6, 1, 2, 8, C.paper); // name plate
  m.box(1, 20, 3, 1, 1, 3, C.silver); // handle
  return { name: 'door', voxel: 0.05, at: [-0.1, 0, DOOR.z0 - 0.05], model: m, wall: 'west' };
}
