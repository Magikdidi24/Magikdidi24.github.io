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

  /** Calls `visit` for each cell whose centre lies in an ellipsoid. Centre and radii in voxels. */
  private within(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, visit: (x: number, y: number, z: number) => void): void {
    for (let z = Math.max(0, Math.floor(cz - rz)); z < Math.min(this.sz, cz + rz); z++) {
      for (let y = Math.max(0, Math.floor(cy - ry)); y < Math.min(this.sy, cy + ry); y++) {
        for (let x = Math.max(0, Math.floor(cx - rx)); x < Math.min(this.sx, cx + rx); x++) {
          if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 + ((z + 0.5 - cz) / rz) ** 2 <= 1) visit(x, y, z);
        }
      }
    }
  }

  /** Fill an ellipsoid: centre and radii in voxels, halves allowed. Colour 0 carves. */
  ball(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, color: number): this {
    this.within(cx, cy, cz, rx, ry, rz, (x, y, z) => this.set(x, y, z, color));
    return this;
  }

  /** Recolour what is already filled inside an ellipsoid: a patch of fur, an eye, a stripe. */
  paint(cx: number, cy: number, cz: number, rx: number, ry: number, rz: number, color: number): this {
    this.within(cx, cy, cz, rx, ry, rz, (x, y, z) => this.get(x, y, z) !== 0 && this.set(x, y, z, color));
    return this;
  }

  /** A rounded limb: every cell within reach of the segment from `a` to `b`, the reach going from `ra` to `rb`. */
  limb(a: readonly [number, number, number], b: readonly [number, number, number], ra: number, rb: number, color: number): this {
    const reach = Math.max(ra, rb);
    const axis = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const length2 = axis[0] ** 2 + axis[1] ** 2 + axis[2] ** 2;
    const from = (k: number) => Math.floor(Math.min(a[k], b[k]) - reach);
    const to = (k: number) => Math.max(a[k], b[k]) + reach;
    for (let z = from(2); z < to(2); z++) {
      for (let y = from(1); y < to(1); y++) {
        for (let x = from(0); x < to(0); x++) {
          const p = [x + 0.5 - a[0], y + 0.5 - a[1], z + 0.5 - a[2]];
          const t = length2 === 0 ? 0 : Math.min(1, Math.max(0, (p[0] * axis[0] + p[1] * axis[1] + p[2] * axis[2]) / length2));
          const distance = Math.hypot(p[0] - axis[0] * t, p[1] - axis[1] * t, p[2] - axis[2] * t);
          if (distance <= ra + (rb - ra) * t) this.set(x, y, z, color);
        }
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

/* Smooth shading looks at the cells within REACH of a corner of the grid. A
   corner that is buried in matter loses up to HOLLOW of its brightness. */
const REACH = 3;
const HOLLOW = 0.5;

/**
 * One mesh for a model: a quad per visible face, vertex colours from the
 * palette (index 0 is unused), and ambient occlusion from the three cells
 * that touch each vertex in front of its face, as in Minecraft.
 *
 * `smooth` is for models sculpted in voxels much smaller than a pixel of the
 * room: each vertex then gets the direction that leads away from the matter
 * around it as its normal, and is darkened by how enclosed it is. The faces
 * stay those of the voxels; the light runs over them as over a round shape.
 */
export function buildMesh(model: VoxelModel, palette: readonly string[], options: { voxel: number; id?: number; smooth?: boolean }): VoxelMesh {
  const { voxel, id = 0, smooth = false } = options;
  const colors = palette.map((hex) => (hex ? hexToLinear(hex) : [0, 0, 0]));
  const positions: number[] = [];
  const normals: number[] = [];
  const vertexColors: number[] = [];
  const aux: number[] = [];
  const lit: number[] = [];
  const emissive: number[] = [];
  const solid = (x: number, y: number, z: number) => (model.get(x, y, z) !== 0 ? 1 : 0);

  /* Normal and brightness at a corner of the grid, for smooth shading. Computed once per corner. */
  const corners = new Map<number, [number, number, number, number]>();
  const rounded = (cx: number, cy: number, cz: number) => {
    const key = cx + (model.sx + 1) * (cy + (model.sy + 1) * cz);
    let corner = corners.get(key);
    if (!corner) {
      let gx = 0;
      let gy = 0;
      let gz = 0;
      let filled = 0;
      for (let dz = -REACH; dz < REACH; dz++) {
        for (let dy = -REACH; dy < REACH; dy++) {
          for (let dx = -REACH; dx < REACH; dx++) {
            if (!solid(cx + dx, cy + dy, cz + dz)) continue;
            gx -= dx + 0.5;
            gy -= dy + 0.5;
            gz -= dz + 0.5;
            filled++;
          }
        }
      }
      const length = Math.hypot(gx, gy, gz) || 1;
      const buried = Math.max(0, filled / (2 * REACH) ** 3 - 0.5) * 2; // 0 on a flat surface, 1 inside matter
      corner = [gx / length, gy / length, gz / length, 1 - HOLLOW * buried];
      corners.set(key, corner);
    }
    return corner;
  };

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
            const cx = x + 0.5 + 0.5 * (n[0] + su * u[0] + sv * v[0]);
            const cy = y + 0.5 + 0.5 * (n[1] + su * u[1] + sv * v[1]);
            const cz = z + 0.5 + 0.5 * (n[2] + su * u[2] + sv * v[2]);
            positions.push(cx * voxel, cy * voxel, cz * voxel);
            const round = smooth && !glows ? rounded(cx, cy, cz) : null;
            /* Matter evenly spread around a corner leaves no direction: the face keeps its own. */
            if (round && (round[0] !== 0 || round[1] !== 0 || round[2] !== 0)) normals.push(round[0], round[1], round[2]);
            else normals.push(n[0], n[1], n[2]);
            let brightness = 1;
            if (round) brightness = round[3];
            else if (!glows) {
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
