/*
  From a voxel model to three.js geometry. A geometry has two material
  slots: 0 for the lit faces, 1 for the emissive ones. The `aux` attribute
  (object id, emissive flag) is read by the outline pass.
*/
import { BufferAttribute, BufferGeometry, MathUtils, Matrix4 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildMesh, type VoxelModel } from './builder.ts';
import { COLORS } from './palette.ts';

function attributes(model: VoxelModel, voxel: number, id: number) {
  const mesh = buildMesh(model, COLORS, { voxel, id });
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(mesh.normals, 3));
  geometry.setAttribute('color', new BufferAttribute(mesh.colors, 3));
  geometry.setAttribute('aux', new BufferAttribute(mesh.aux, 2));
  return { geometry, mesh };
}

/** One object on its own: a geometry with its origin at the corner of the model. */
export function voxelGeometry(model: VoxelModel, voxel: number, id: number): BufferGeometry {
  const { geometry, mesh } = attributes(model, voxel, id);
  geometry.setIndex(new BufferAttribute(mesh.indices, 1));
  geometry.addGroup(0, mesh.emissiveStart, 0);
  /* No draw call for an object that has nothing emissive. */
  if (mesh.indices.length > mesh.emissiveStart) geometry.addGroup(mesh.emissiveStart, mesh.indices.length - mesh.emissiveStart, 1);
  return geometry;
}

export interface Placed {
  model: VoxelModel;
  voxel: number;
  id: number;
  /** Where the corner (0, 0, 0) of the model sits, in metres. */
  at: [number, number, number];
  /** Rotation around the vertical axis through the centre of the model, in degrees. */
  turn?: number;
}

/** Where a placed model stands: its turn around its own centre, then its position. */
export function placement({ model, voxel, at, turn = 0 }: Placed): Matrix4 {
  const cx = (model.sx * voxel) / 2;
  const cz = (model.sz * voxel) / 2;
  return new Matrix4()
    .makeTranslation(at[0] + cx, at[1], at[2] + cz)
    .multiply(new Matrix4().makeRotationY(MathUtils.degToRad(turn)))
    .multiply(new Matrix4().makeTranslation(-cx, 0, -cz));
}

/**
 * Many objects that never move, as two geometries in room coordinates: all
 * their lit faces, and all their emissive faces. Two draw calls for the lot.
 */
export function mergedGeometry(objects: Placed[]): { lit: BufferGeometry; glow: BufferGeometry } {
  const lit: BufferGeometry[] = [];
  const glow: BufferGeometry[] = [];
  for (const object of objects) {
    const { geometry, mesh } = attributes(object.model, object.voxel, object.id);
    geometry.applyMatrix4(placement(object));
    /* The same vertices, drawn through two index lists. */
    const part = (from: number, to: number) => geometry.clone().setIndex(new BufferAttribute(mesh.indices.slice(from, to), 1));
    lit.push(part(0, mesh.emissiveStart));
    if (mesh.indices.length > mesh.emissiveStart) glow.push(part(mesh.emissiveStart, mesh.indices.length));
    geometry.dispose();
  }
  const merge = (parts: BufferGeometry[]) => {
    const merged = parts.length > 0 ? mergeGeometries(parts) : new BufferGeometry();
    for (const part of parts) part.dispose();
    return merged;
  };
  return { lit: merge(lit), glow: merge(glow) };
}
