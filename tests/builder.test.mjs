// The voxel builder: boxes and voxels in, one mesh out (typed arrays).
// Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMesh, EMISSIVE, hexToLinear, VoxelModel } from '../src/room/voxel/builder.ts';

// Colour 1 is white, so a vertex colour is exactly its ambient occlusion factor.
const palette = ['', '#ffffff', '#808080'];
const WHITE = 1;
const GREY = 2;

const near = (actual, expected, eps = 1e-6) =>
  assert.ok(Math.abs(actual - expected) <= eps, `expected ${expected}, got ${actual}`);

const faces = (mesh) => mesh.indices.length / 6;
const vertex = (mesh, i) => ({
  position: [...mesh.positions.subarray(i * 3, i * 3 + 3)],
  normal: [...mesh.normals.subarray(i * 3, i * 3 + 3)],
  color: [...mesh.colors.subarray(i * 3, i * 3 + 3)],
  id: mesh.aux[i * 2],
  emissive: mesh.aux[i * 2 + 1],
});
/** Vertices of the faces whose normal is `normal`. */
const facing = (mesh, normal) =>
  Array.from({ length: mesh.positions.length / 3 }, (_, i) => vertex(mesh, i)).filter((v) =>
    v.normal.every((c, k) => c === normal[k]),
  );

test('hexToLinear: sRGB hex to linear RGB', () => {
  assert.deepEqual(hexToLinear('#ffffff'), [1, 1, 1]);
  assert.deepEqual(hexToLinear('#000000'), [0, 0, 0]);
  const [r, g, b] = hexToLinear('#8000ff');
  near(r, 0.21586, 1e-5);
  near(g, 0);
  near(b, 1);
});

test('one voxel is a cube: 6 faces, sized by the voxel size', () => {
  const mesh = buildMesh(new VoxelModel(1, 1, 1).set(0, 0, 0, WHITE), palette, { voxel: 0.05 });
  assert.equal(faces(mesh), 6);
  assert.equal(mesh.positions.length, 6 * 4 * 3);
  near(Math.min(...mesh.positions), 0);
  near(Math.max(...mesh.positions), 0.05);
});

test('faces between two solid voxels are removed', () => {
  assert.equal(faces(buildMesh(new VoxelModel(2, 1, 1).box(0, 0, 0, 2, 1, 1, WHITE), palette, { voxel: 1 })), 10);
  assert.equal(faces(buildMesh(new VoxelModel(2, 2, 2).box(0, 0, 0, 2, 2, 2, WHITE), palette, { voxel: 1 })), 24);
});

test('faces between two colours are removed too', () => {
  const model = new VoxelModel(2, 1, 1).set(0, 0, 0, WHITE).set(1, 0, 0, GREY);
  assert.equal(faces(buildMesh(model, palette, { voxel: 1 })), 10);
});

test('colour 0 carves: a hole shows the faces around it', () => {
  const solid = new VoxelModel(3, 3, 3).box(0, 0, 0, 3, 3, 3, WHITE);
  const hollow = new VoxelModel(3, 3, 3).box(0, 0, 0, 3, 3, 3, WHITE).box(1, 1, 1, 1, 1, 1, 0);
  assert.equal(faces(buildMesh(solid, palette, { voxel: 1 })), 54);
  assert.equal(faces(buildMesh(hollow, palette, { voxel: 1 })), 60);
});

test('a box is clipped to the grid instead of wrapping around', () => {
  const model = new VoxelModel(2, 1, 1).box(1, 0, 0, 5, 5, 5, WHITE);
  assert.equal(model.get(0, 0, 0), 0);
  assert.equal(model.get(1, 0, 0), WHITE);
  assert.equal(faces(buildMesh(model, palette, { voxel: 1 })), 6);
});

test('every triangle winds counter-clockwise around its normal', () => {
  const model = new VoxelModel(3, 2, 2).box(0, 0, 0, 3, 1, 2, WHITE).set(1, 1, 0, GREY);
  const mesh = buildMesh(model, palette, { voxel: 0.5 });
  assert.equal(faces(mesh), 26);
  for (let t = 0; t < mesh.indices.length; t += 3) {
    const [a, b, c] = [0, 1, 2].map((k) => vertex(mesh, mesh.indices[t + k]));
    const ab = b.position.map((v, k) => v - a.position[k]);
    const ac = c.position.map((v, k) => v - a.position[k]);
    const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
    const dot = cross.reduce((sum, v, k) => sum + v * a.normal[k], 0);
    assert.ok(dot > 0, `triangle ${t / 3} faces away from its normal ${a.normal}`);
  }
});

test('ambient occlusion darkens the vertices next to a step, and only those', () => {
  // A floor voxel at x = 0 and a two-voxel wall at x = 1.
  const model = new VoxelModel(2, 2, 1).set(0, 0, 0, WHITE).box(1, 0, 0, 1, 2, 1, WHITE);
  const mesh = buildMesh(model, palette, { voxel: 1 });
  const floorTop = facing(mesh, [0, 1, 0]).filter((v) => v.position[1] === 1);
  assert.equal(floorTop.length, 4);
  for (const v of floorTop) {
    if (v.position[0] === 0) assert.deepEqual(v.color, [1, 1, 1], 'far from the wall: unshaded');
    else assert.ok(v.color[0] < 1 && v.color[0] > 0, `against the wall: shaded, got ${v.color[0]}`);
  }
});

test('ambient occlusion: a corner is darker than an edge', () => {
  // A floor voxel in the inner corner of two walls.
  const model = new VoxelModel(2, 2, 2).box(0, 0, 0, 2, 1, 2, WHITE).box(1, 1, 0, 1, 1, 2, WHITE).set(0, 1, 0, WHITE);
  const mesh = buildMesh(model, palette, { voxel: 1 });
  const top = facing(mesh, [0, 1, 0]).filter((v) => v.position[1] === 1);
  const at = (x, z) => top.find((v) => v.position[0] === x && v.position[2] === z).color[0];
  assert.ok(at(1, 1) < at(1, 2), 'the vertex in the corner is darker than the one along one wall');
  assert.ok(at(1, 2) < at(0, 2), 'which is darker than the open one');
  assert.equal(at(0, 2), 1);
});

test('an emissive voxel is unshaded, flagged, and its faces come last', () => {
  // Same step as above, but the floor voxel glows.
  const model = new VoxelModel(2, 2, 1).set(0, 0, 0, WHITE | EMISSIVE).box(1, 0, 0, 1, 2, 1, GREY);
  const mesh = buildMesh(model, palette, { voxel: 1 });
  const glowing = Array.from({ length: mesh.positions.length / 3 }, (_, i) => vertex(mesh, i)).filter((v) => v.emissive === 1);
  assert.equal(glowing.length, 5 * 4, 'the 5 visible faces of the glowing voxel');
  for (const v of glowing) assert.deepEqual(v.color, [1, 1, 1]);
  const emissiveIndices = [...mesh.indices.subarray(mesh.emissiveStart)];
  assert.equal(emissiveIndices.length, 5 * 6);
  for (const i of emissiveIndices) assert.equal(vertex(mesh, i).emissive, 1);
  for (const i of mesh.indices.subarray(0, mesh.emissiveStart)) assert.equal(vertex(mesh, i).emissive, 0);
});

test('every vertex carries the object id', () => {
  const mesh = buildMesh(new VoxelModel(1, 1, 1).set(0, 0, 0, WHITE), palette, { voxel: 1, id: 7 });
  assert.equal(mesh.aux.length, 6 * 4 * 2);
  for (let i = 0; i < mesh.aux.length; i += 2) assert.equal(mesh.aux[i], 7);
});

test('slices: layers of text, bottom first, one character per voxel', () => {
  const model = new VoxelModel(3, 2, 2).slices(0, 0, 0, [['#.#', '###'], ['.o.', '...']], { '#': WHITE, o: GREY });
  // layer 0 (y = 0): row z = 0 is "#.#", row z = 1 is "###"
  assert.equal(model.get(0, 0, 0), WHITE);
  assert.equal(model.get(1, 0, 0), 0);
  assert.equal(model.get(2, 0, 0), WHITE);
  assert.equal(model.get(1, 0, 1), WHITE);
  // layer 1 (y = 1)
  assert.equal(model.get(1, 1, 0), GREY);
  assert.equal(model.get(0, 1, 0), 0);
});

test('slices: an unknown character is an error, not a silent hole', () => {
  assert.throws(() => new VoxelModel(1, 1, 1).slices(0, 0, 0, [['?']], { '#': WHITE }), /\?/);
});
