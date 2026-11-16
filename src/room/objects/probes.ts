/*
  Stand-ins that later phases replace: one frame flat on the left wall (the
  row of diplomas) and a bar of neon on the back wall (the neon sign).
*/
import { EMISSIVE, VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';

/** 30 × 40 cm, 5 cm thick. */
export function frame(): RoomObject {
  const m = new VoxelModel(1, 8, 6);
  m.box(0, 0, 0, 1, 8, 6, C.walnut).box(0, 1, 1, 1, 6, 4, C.paper);
  return { name: 'frame', voxel: 0.05, at: [0, 1.3, 1.0], model: m };
}

export function neon(): RoomObject {
  const m = new VoxelModel(20, 1, 1);
  m.box(0, 0, 0, 20, 1, 1, C.magenta | EMISSIVE);
  return { name: 'neon', voxel: 0.05, at: [2.5, 2.3, 0], model: m };
}
