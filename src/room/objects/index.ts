/*
  Everything that stands in the room. An object is a voxel model, the size of
  its voxels and where its corner (0, 0, 0) sits. Its position in this list,
  plus one, is its id in the outline pass: 0 is the room itself.
*/
import type { VoxelModel } from '../voxel/builder.ts';
import { bed, cat } from './bed.ts';
import { desk, keyboard, mainMonitor, mouse, sideMonitor } from './desk.ts';
import { door } from './door.ts';
import { frame, neon } from './probes.ts';

export interface RoomObject {
  name: string;
  /** Size of a voxel, in metres. */
  voxel: number;
  /** Where the corner (0, 0, 0) of the model sits in the room, in metres. */
  at: [number, number, number];
  model: VoxelModel;
}

export const objects = (): RoomObject[] => [
  door(),
  bed(),
  cat(),
  desk(),
  mainMonitor(),
  sideMonitor(),
  keyboard(),
  mouse(),
  frame(),
  neon(),
];
