/*
  From a voxel model to a three.js geometry. The geometry has two material
  slots: 0 for the lit faces, 1 for the emissive ones. The `aux` attribute
  (object id, emissive flag) is read by the outline pass.
*/
import { BufferAttribute, BufferGeometry } from 'three';
import { buildMesh, type VoxelModel } from './builder.ts';
import { COLORS } from './palette.ts';

export function voxelGeometry(model: VoxelModel, voxel: number, id: number): BufferGeometry {
  const mesh = buildMesh(model, COLORS, { voxel, id });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(mesh.normals, 3));
  geometry.setAttribute('color', new BufferAttribute(mesh.colors, 3));
  geometry.setAttribute('aux', new BufferAttribute(mesh.aux, 2));
  geometry.setIndex(new BufferAttribute(mesh.indices, 1));
  geometry.addGroup(0, mesh.emissiveStart, 0);
  geometry.addGroup(mesh.emissiveStart, mesh.indices.length - mesh.emissiveStart, 1);
  return geometry;
}
