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

test('picture: rows of text, top row first, upright in the x-y plane', () => {
  const model = new VoxelModel(3, 2, 1).picture(0, 0, 0, ['#.o', '###'], { '#': WHITE, o: GREY });
  // the first row is the top one: y = 1
  assert.equal(model.get(0, 1, 0), WHITE);
  assert.equal(model.get(1, 1, 0), 0);
  assert.equal(model.get(2, 1, 0), GREY);
  assert.equal(model.get(1, 0, 0), WHITE);
});

test('picture: on a side wall the rows run along z', () => {
  const model = new VoxelModel(1, 2, 3).picture(0, 0, 0, ['#.o', '###'], { '#': WHITE, o: GREY }, 'z');
  assert.equal(model.get(0, 1, 0), WHITE);
  assert.equal(model.get(0, 1, 1), 0);
  assert.equal(model.get(0, 1, 2), GREY);
  assert.equal(model.get(0, 0, 1), WHITE);
});

test('slices: an unknown character is an error, not a silent hole', () => {
  assert.throws(() => new VoxelModel(1, 1, 1).slices(0, 0, 0, [['?']], { '#': WHITE }), /\?/);
});

// Round shapes and smooth shading, for the finely sculpted objects.

const count = (model) => {
  let n = 0;
  for (let z = 0; z < model.sz; z++) for (let y = 0; y < model.sy; y++) for (let x = 0; x < model.sx; x++) if (model.get(x, y, z)) n++;
  return n;
};

test('ball: fills an ellipsoid around its centre', () => {
  const m = new VoxelModel(20, 20, 20).ball(10, 10, 10, 6, 6, 6, WHITE);
  assert.equal(m.get(10, 10, 10), WHITE);
  assert.equal(m.get(15, 10, 10), WHITE, 'its edge along x');
  assert.equal(m.get(16, 10, 10), 0, 'just outside');
  assert.equal(m.get(14, 14, 14), 0, 'the corner of its box');
  near(count(m), (4 / 3) * Math.PI * 6 ** 3, 60);
});

test('ball: radii differ along each axis, and colour 0 carves', () => {
  const m = new VoxelModel(20, 20, 20).ball(10, 10, 10, 8, 2, 4, WHITE);
  assert.equal(m.get(17, 10, 10), WHITE);
  assert.equal(m.get(10, 13, 10), 0);
  assert.equal(m.get(10, 10, 13), WHITE);
  m.ball(10, 10, 10, 2, 2, 2, 0);
  assert.equal(m.get(10, 10, 10), 0);
  assert.equal(m.get(15, 10, 10), WHITE);
});

test('limb: every voxel within reach of a segment, thinner towards its end', () => {
  const m = new VoxelModel(30, 12, 12).limb([4, 6, 6], [24, 6, 6], 4, 1.5, WHITE);
  assert.equal(m.get(4, 6, 6), WHITE);
  assert.equal(m.get(24, 6, 6), WHITE);
  assert.equal(m.get(5, 9, 6), WHITE, 'thick where it starts');
  assert.equal(m.get(23, 9, 6), 0, 'thin where it ends');
  assert.equal(m.get(1, 6, 6), WHITE, 'rounded beyond its start');
  assert.equal(m.get(27, 6, 6), 0);
});

test('paint: recolours what is filled and fills nothing', () => {
  const m = new VoxelModel(12, 12, 12).box(0, 0, 0, 12, 4, 12, WHITE).paint(6, 4, 6, 3, 3, 3, GREY);
  assert.equal(m.get(6, 3, 6), GREY);
  assert.equal(m.get(6, 5, 6), 0, 'above the slab stays empty');
  assert.equal(m.get(0, 3, 0), WHITE, 'out of reach');
});

test('buildMesh smooth: the normals of a ball point away from its centre and turn gradually', () => {
  const m = new VoxelModel(24, 24, 24).ball(12, 12, 12, 9, 9, 9, WHITE);
  const mesh = buildMesh(m, palette, { voxel: 1, smooth: true });
  assert.ok(faces(mesh) > 100);
  let slanted = 0;
  for (let i = 0; i < mesh.positions.length / 3; i++) {
    const { position, normal } = vertex(mesh, i);
    const out = position.map((c) => c - 12);
    const length = Math.hypot(...out);
    near(Math.hypot(...normal), 1, 1e-5);
    const facing = normal.reduce((sum, c, k) => sum + c * out[k], 0) / length;
    assert.ok(facing > 0.9, `a normal looks ${facing} away from the centre`);
    if (normal.every((c) => Math.abs(c) < 0.95)) slanted++;
  }
  assert.ok(slanted > mesh.positions.length / 3 / 2, 'most normals are off the axes');
});

test('buildMesh smooth: a flat face keeps its normal and its full colour', () => {
  const m = new VoxelModel(16, 4, 16).box(0, 0, 0, 16, 4, 16, WHITE);
  const mesh = buildMesh(m, palette, { voxel: 1, smooth: true });
  const middle = facing(mesh, [0, 1, 0]).filter((v) => v.position[0] === 8 && v.position[2] === 8);
  assert.ok(middle.length > 0);
  for (const v of middle) near(v.color[0], 1);
});

test('buildMesh smooth: a hollow is darker than the open surface around it', () => {
  const m = new VoxelModel(20, 12, 20).box(0, 0, 0, 20, 4, 20, WHITE).box(0, 4, 0, 10, 8, 20, WHITE);
  const mesh = buildMesh(m, palette, { voxel: 1, smooth: true });
  const at = (x, y, z) => {
    for (let i = 0; i < mesh.positions.length / 3; i++) {
      const v = vertex(mesh, i);
      if (v.position[0] === x && v.position[1] === y && v.position[2] === z) return v;
    }
    throw new Error(`no vertex at ${x}, ${y}, ${z}`);
  };
  const inner = at(10, 4, 10).color[0]; // where the floor meets the wall
  const open = at(17, 4, 10).color[0]; // out on the floor
  near(open, 1);
  assert.ok(inner < 0.85, `the hollow is at ${inner}`);
  const beside = at(12, 4, 10).color[0]; // two voxels out: a flat-shaded model is at full colour there
  assert.ok(beside < 0.97 && beside > inner, `two voxels from the wall it is at ${beside}`);
});
