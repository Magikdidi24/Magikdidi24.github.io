/*
  The voxel builder. An object is a small grid of palette indices, filled
  with boxes, single voxels or layers of text; buildMesh turns it into one
  mesh. Pure: typed arrays out, no three.js and no DOM, so it runs under
  `node --test` (tests/builder.test.mjs).
*/

/** Added to a colour index: the voxel glows. It is drawn unshaded and feeds the bloom. */
export const EMISSIVE = 64;

export interface VoxelMesh {
  positions: Float32Array;
  normals: Float32Array;
  /** Linear RGB per vertex, ambient occlusion included. */
  colors: Float32Array;
  /** Per vertex: object id, then 1 for an emissive face and 0 otherwise. */
  aux: Float32Array;
  indices: Uint32Array;
  /** Indices before this offset draw the lit faces, the rest the emissive ones. */
  emissiveStart: number;
}

/** "#rrggbb" in sRGB to linear RGB, 0 to 1: the space three.js lights and blends in. */
export function hexToLinear(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const linear = (byte: number) => {
    const c = byte / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return [linear(n >> 16), linear((n >> 8) & 255), linear(n & 255)];
}

/** A grid of colour indices: 0 is empty, EMISSIVE may be added to a colour. */
export class VoxelModel {
  readonly sx: number;
  readonly sy: number;
  readonly sz: number;
  private readonly cells: Uint8Array;

  constructor(sx: number, sy: number, sz: number) {
    this.sx = sx;
    this.sy = sy;
    this.sz = sz;
    this.cells = new Uint8Array(sx * sy * sz);
  }

  private inside(x: number, y: number, z: number): boolean {
    return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz;
  }

  /** The colour at a cell, 0 when empty or outside the grid. */
  get(x: number, y: number, z: number): number {
    return this.inside(x, y, z) ? this.cells[x + this.sx * (y + this.sy * z)] : 0;
  }

  /** Cells outside the grid are ignored. */
  set(x: number, y: number, z: number, color: number): this {
    if (this.inside(x, y, z)) this.cells[x + this.sx * (y + this.sy * z)] = color;
    return this;
  }

  /** Fill w × h × d cells from (x, y, z). A later box overwrites; colour 0 carves. */
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: number): this {
    for (let k = z; k < z + d; k++) {
      for (let j = y; j < y + h; j++) {
        for (let i = x; i < x + w; i++) this.set(i, j, k, color);
      }
    }
    return this;
  }

  /**
   * Layers of text for organic shapes, bottom layer first. In a layer each
   * string is a row along z and each character a voxel along x, looked up
   * in `legend`; "." and " " leave the cell as it is.
   */
  slices(x: number, y: number, z: number, layers: string[][], legend: Record<string, number>): this {
    layers.forEach((rows, j) => rows.forEach((row, k) => this.text(row, legend, (i, color) => this.set(x + i, y + j, z + k, color))));
    return this;
  }

  /**
   * An upright picture one voxel thick, top row first. Each character is a
   * voxel along x, or along z for a picture on a side wall.
   */
  picture(x: number, y: number, z: number, rows: string[], legend: Record<string, number>, along: 'x' | 'z' = 'x'): this {
    rows.forEach((row, j) => {
      const height = y + rows.length - 1 - j;
      this.text(row, legend, (i, color) => (along === 'x' ? this.set(x + i, height, z, color) : this.set(x, height, z + i, color)));
    });
    return this;
  }

  /** Calls `put` for each character of a row that names a colour. "." and " " are skipped. */
  private text(row: string, legend: Record<string, number>, put: (index: number, color: number) => void): void {
    [...row].forEach((char, i) => {
      if (char === '.' || char === ' ') return;
      if (!(char in legend)) throw new Error(`no colour for "${char}" in the legend`);
      put(i, legend[char]);
    });
  }
}

/* The six face directions: the normal, then two axes u and v with u × v = normal,
   so the corners (-u-v), (+u-v), (+u+v), (-u+v) wind counter-clockwise seen from outside. */
const FACES = [
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0] },
] as const;

const CORNERS = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
] as const;

/** Brightness of a vertex with 0, 1, 2 or 3 solid neighbours in front of its face. */
const OCCLUSION = [1, 0.84, 0.7, 0.56];

/**
 * One mesh for a model: a quad per visible face, vertex colours from the
 * palette (index 0 is unused), and ambient occlusion from the three cells
 * that touch each vertex in front of its face, as in Minecraft.
 */
export function buildMesh(model: VoxelModel, palette: readonly string[], options: { voxel: number; id?: number }): VoxelMesh {
  const { voxel, id = 0 } = options;
  const colors = palette.map((hex) => (hex ? hexToLinear(hex) : [0, 0, 0]));
  const positions: number[] = [];
  const normals: number[] = [];
  const vertexColors: number[] = [];
  const aux: number[] = [];
  const lit: number[] = [];
  const emissive: number[] = [];
  const solid = (x: number, y: number, z: number) => (model.get(x, y, z) !== 0 ? 1 : 0);

  for (let z = 0; z < model.sz; z++) {
    for (let y = 0; y < model.sy; y++) {
      for (let x = 0; x < model.sx; x++) {
        const cell = model.get(x, y, z);
        if (cell === 0) continue;
        const glows = (cell & EMISSIVE) !== 0;
        const color = colors[cell & ~EMISSIVE];
        if (!color) throw new Error(`buildMesh: colour ${cell & ~EMISSIVE} is not in the palette`);

        for (const { n, u, v } of FACES) {
          /* The cell in front of the face. */
          const fx = x + n[0];
          const fy = y + n[1];
          const fz = z + n[2];
          if (solid(fx, fy, fz)) continue;

          const first = positions.length / 3;
          const shade: number[] = [];
          for (const [su, sv] of CORNERS) {
            positions.push(
              (x + 0.5 + 0.5 * (n[0] + su * u[0] + sv * v[0])) * voxel,
              (y + 0.5 + 0.5 * (n[1] + su * u[1] + sv * v[1])) * voxel,
              (z + 0.5 + 0.5 * (n[2] + su * u[2] + sv * v[2])) * voxel,
            );
            normals.push(n[0], n[1], n[2]);
            let brightness = 1;
            if (!glows) {
              const side1 = solid(fx + su * u[0], fy + su * u[1], fz + su * u[2]);
              const side2 = solid(fx + sv * v[0], fy + sv * v[1], fz + sv * v[2]);
              const corner = solid(fx + su * u[0] + sv * v[0], fy + su * u[1] + sv * v[1], fz + su * u[2] + sv * v[2]);
              brightness = OCCLUSION[side1 && side2 ? 3 : side1 + side2 + corner];
            }
            shade.push(brightness);
            vertexColors.push(color[0] * brightness, color[1] * brightness, color[2] * brightness);
            aux.push(id, glows ? 1 : 0);
          }
          /* Split the quad along the diagonal that keeps the shading symmetric. */
          const target = glows ? emissive : lit;
          if (shade[0] + shade[2] > shade[1] + shade[3]) target.push(first + 1, first + 2, first + 3, first + 1, first + 3, first);
          else target.push(first, first + 1, first + 2, first, first + 2, first + 3);
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    colors: new Float32Array(vertexColors),
    aux: new Float32Array(aux),
    indices: new Uint32Array([...lit, ...emissive]),
    emissiveStart: lit.length,
  };
}
