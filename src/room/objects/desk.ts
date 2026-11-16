/*
  The desk against the back wall, what stands on it, and the chair. Each
  clickable item is its own object, so each gets its own outline. Nothing
  here carries a logo: the shapes are those of what Samuel owns, no more.
*/
import { EMISSIVE, VoxelModel } from '../voxel/builder.ts';
import { C } from '../voxel/palette.ts';
import type { RoomObject } from './index.ts';

type Point = [number, number, number];

/** Where the desk stands, and the height of its top. */
const X = 2;
const Z = 0.05;
const TOP = 0.75;

/** The two sizes of small voxels used here, in metres. */
const FINE = 0.0125;
const FINER = 0.00625;

/** 2 m wide, 80 cm deep, 75 cm high. Voxels of 5 cm. */
export function desk(): RoomObject {
  const m = new VoxelModel(40, 15, 16);
  m.box(0, 14, 0, 40, 1, 16, C.oak); // top
  m.box(13, 14, 8, 20, 1, 7, C.plum); // XXL mouse pad, set in the top
  for (const x of [1, 38]) {
    m.box(x, 0, 1, 1, 14, 1, C.graphite).box(x, 0, 14, 1, 14, 1, C.graphite); // legs
    m.box(x, 0, 1, 1, 1, 14, C.graphite); // feet
  }
  m.box(1, 11, 1, 38, 2, 1, C.graphite); // back beam
  m.box(3, 1, 3, 9, 13, 11, C.linen); // drawer unit
  for (const y of [5, 9]) m.box(3, y, 13, 9, 1, 1, C.stone); // gaps between its drawers
  for (const y of [3, 7, 11]) m.box(6, y, 14, 3, 1, 1, C.steel); // handles
  m.box(2, 13, 14, 36, 1, 1, C.cyan | EMISSIVE); // LED strip under the front edge
  return { name: 'desk', voxel: 0.05, at: [X, 0, Z], model: m, decor: true };
}

/**
 * The main monitor: 49 inches, four times wider than high, and curved, its
 * ends 18 cm nearer to the chair than its middle. Its panel follows a circle
 * of radius `BEND`. Voxels of 1.25 cm.
 */
const BEND = 1;
const WIDE = { columns: 92, x: 3.05, z: Z + 0.05, panel: 8, foot: 10, rows: 29 };

/** How far forward column `i` of the curved panel stands, in voxels. */
const curve = (i: number) => {
  const x = (i + 0.5 - WIDE.columns / 2) * FINE;
  return Math.floor((BEND - Math.sqrt(BEND ** 2 - x ** 2)) / FINE);
};

export function mainMonitor(): RoomObject {
  const { columns, panel, foot, rows } = WIDE;
  const m = new VoxelModel(columns, foot + rows + 1, 28);
  const middle = columns / 2;
  /* A foot in V, its two arms towards the chair, and a neck up to the back of the panel. */
  for (const side of [-1, 1]) m.limb([middle, 0.6, 5], [middle + side * 19, 0.6, 25], 1.4, 1.2, C.graphite);
  m.box(middle - 2, 0, 3, 4, foot + 12, 4, C.graphite);
  m.ball(middle, foot + 14, panel - 1, 9, 9, 2.5, C.paper); // the mount, a boss on the back
  for (let i = 0; i < columns; i++) {
    const z = panel + curve(i);
    m.box(i, foot, z, 1, rows, 2, C.graphite); // the panel and its bezel
    if (i > 3 && i < columns - 4) m.box(i, foot + 3, z - 1, 1, rows - 6, 1, C.paper); // its back, white
  }
  /* On the back, a ring of light around the mount. */
  for (let k = 0; k < 24; k++) {
    const angle = (k / 24) * 2 * Math.PI;
    m.set(Math.round(middle - 0.5 + Math.cos(angle) * 6), Math.round(foot + 13.5 + Math.sin(angle) * 6), panel - 3, C.cyan | EMISSIVE);
  }
  return { name: 'monitor', voxel: FINE, at: [WIDE.x - middle * FINE, TOP, WIDE.z], model: m };
}

/**
 * The picture area of the curved monitor, in the room: its centre, its width
 * measured along the curve, its height, and the radius it is bent to. It
 * faces +z.
 */
export const MAIN_SCREEN = {
  x: WIDE.x,
  y: TOP + (WIDE.foot + 2 + (WIDE.rows - 3) / 2) * FINE, // two voxels of bezel under it, one above
  z: WIDE.z + (WIDE.panel + 2) * FINE + 0.0015, // just in front of the panel, in its middle
  width: 2 * BEND * Math.asin(((WIDE.columns / 2 - 1) * FINE) / BEND),
  height: (WIDE.rows - 3) * FINE,
  bend: BEND,
};

/** The second monitor: 27 inches, on an arm clamped to the back of the desk, above the left end of the first. */
const SECOND = { x: X + 0.06, z: Z + 0.01, columns: 49, rows: 29, foot: 42, panel: 13 };

export function sideMonitor(): RoomObject {
  const { columns, rows, foot, panel } = SECOND;
  const m = new VoxelModel(columns + 1, foot + rows + 1, panel + 2);
  m.box(39, 0, 0, 6, 2, 5, C.graphite); // clamp
  m.box(41, 2, 1, 2, foot + 14, 2, C.steel); // pole
  m.box(41, foot + 12, 3, 2, 2, panel - 5, C.steel); // arm, towards the room
  m.box(22, foot + 12, panel - 3, 21, 2, 2, C.steel); // then along the back of the panel
  m.box(21, foot + 9, panel - 1, 7, 8, 1, C.graphite); // mount
  m.box(0, foot, panel, columns, rows, 2, C.graphite); // panel
  return { name: 'monitor-side', voxel: FINE, at: [SECOND.x, TOP, SECOND.z], model: m };
}

export const SIDE_SCREEN = {
  x: SECOND.x + (SECOND.columns / 2) * FINE,
  y: TOP + (SECOND.foot + SECOND.rows / 2) * FINE,
  z: SECOND.z + (SECOND.panel + 2) * FINE + 0.0015,
  width: (SECOND.columns - 2) * FINE, // one voxel of bezel all round
  height: (SECOND.rows - 2) * FINE,
};

/**
 * The rows of the keyboard, from the back: the width of each key, in keys.
 * Every row is 16 keys wide.
 */
const KEYS = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1],
  [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1],
  [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25, 1],
  [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.75, 1, 1],
  [1.25, 1.25, 1.25, 6.25, 1, 1, 1, 1, 1, 1],
];

/** A compact keyboard, 34 cm wide: white caps, grey ones around them, a red escape key. A key is 1.25 cm, voxels half of that. */
export function keyboard(): RoomObject {
  const m = new VoxelModel(54, 5, 24);
  m.box(0, 0, 0, 54, 3, 24, C.graphite);
  for (const [x, z] of [[0, 0], [53, 0], [0, 23], [53, 23]]) m.box(x, 0, z, 1, 3, 1, 0); // corners
  KEYS.forEach((row, r) => {
    let at = 0;
    row.forEach((width, k) => {
      const from = 3 + Math.round(at * 3);
      at += width;
      const edge = k === 0 || k >= row.length - (r > 3 ? 3 : 1) || width > 1;
      const color = r === 0 && k === 0 ? C.red : width > 6 ? C.paper : edge ? C.steel : C.paper;
      m.box(from, 3, 3 + r * 3, 3 + Math.round(at * 3) - from - 1, r < 2 ? 2 : 1, 2, color); // the two back rows stand higher
    });
  });
  return { name: 'keyboard', voxel: FINER, at: [WIDE.x - 27 * FINER, TOP, Z + 0.5], model: m };
}

/**
 * A white mouse, 12.5 cm long, its buttons towards the screen: a shell that
 * rises to a hump behind its middle, a dark sole and two dark grips, the seam
 * between its two buttons, a wheel, and a strip of light across its back.
 */
export function mouse(): RoomObject {
  const m = new VoxelModel(12, 9, 21);
  m.ball(6, 1.5, 10.5, 5.5, 5, 9.6, C.paper).ball(6, 3, 13.5, 5, 4.6, 5.6, C.paper);
  m.paint(6, 0, 10.5, 7, 1, 11, C.graphite); // sole
  for (const x of [0.4, 11.6]) m.paint(x, 3, 11.5, 2, 2.4, 5.5, C.graphite); // grips
  m.paint(6, 6, 4.5, 0.6, 3, 5, C.stone); // seam
  m.ball(6, 5.7, 5.5, 1.1, 1.5, 2.2, C.graphite); // wheel
  m.paint(6, 4, 19.5, 3.2, 1.2, 1.6, C.cyan | EMISSIVE);
  return { name: 'mouse', voxel: FINER, at: [3.32, TOP, Z + 0.52], model: m, turn: -8, smooth: true };
}

/** A glass of orange juice with its straw, 10 cm across. */
export function juice(): RoomObject {
  const m = new VoxelModel(4, 8, 4);
  m.box(0, 0, 0, 4, 5, 4, C.amber); // the juice, seen through the glass
  m.box(0, 5, 0, 4, 1, 4, C.silver).box(1, 5, 1, 2, 1, 2, 0); // the rim above it
  for (const [x, z] of [[0, 0], [3, 0], [0, 3], [3, 3]]) m.box(x, 0, z, 1, 6, 1, 0); // round the corners
  m.box(2, 4, 1, 1, 4, 1, C.red); // straw
  return { name: 'juice', voxel: 0.025, at: [X + 0.46, TOP, Z + 0.32], model: m, decor: true };
}

/**
 * A speaker in the style of a guitar amplifier, `x` metres from the left end
 * of the desk: black case, woven grille in a gold frame, a brass plate with
 * its knobs on top. 26 cm wide. Voxels of 1.25 cm.
 */
export function speaker(name: string, x: number): RoomObject {
  const m = new VoxelModel(21, 15, 12);
  m.box(0, 0, 0, 21, 13, 12, C.ink);
  for (let y = 1; y < 12; y++) {
    for (let i = 1; i < 20; i++) {
      const frame = y === 1 || y === 11 || i === 1 || i === 19;
      m.set(i, y, 11, frame ? C.mustard : (i + y) % 2 ? C.taupe : C.graphite);
    }
  }
  m.box(8, 8, 11, 5, 1, 1, C.paper); // a white bar where a name would be
  m.box(2, 13, 2, 17, 1, 5, C.mustard); // control plate
  for (const i of [4, 8, 12]) m.box(i, 14, 3, 2, 1, 2, C.ink); // knobs
  m.box(16, 14, 4, 1, 1, 1, C.silver); // switch
  return { name, voxel: FINE, at: [X + x, TOP, Z + 0.05], model: m };
}

/** Headphones hung on their stand. */
export function headphones(): RoomObject {
  const m = new VoxelModel(6, 11, 4);
  m.box(1, 0, 0, 4, 1, 4, C.steel); // foot
  m.box(2, 1, 1, 2, 8, 2, C.steel); // pole
  m.box(0, 9, 1, 6, 1, 2, C.teal); // headband
  m.box(0, 5, 1, 1, 4, 2, C.teal).box(5, 5, 1, 1, 4, 2, C.teal);
  m.box(0, 2, 0, 1, 4, 4, C.ink).box(5, 2, 0, 1, 4, 4, C.ink); // ear cups
  return { name: 'headphones', voxel: 0.025, at: [X + 1.82, TOP, Z + 0.58], model: m, decor: true };
}

/** A game controller lying face up, its two grips towards +z: two sticks, a cross, four buttons. 12 cm wide. */
function controller(m: VoxelModel, cx: number, y: number, cz: number, shell: number, accent: number): void {
  m.ball(cx, y + 3, cz, 9.5, 3, 5.5, shell);
  for (const side of [-1, 1]) m.limb([cx + side * 7.5, y + 3, cz + 1], [cx + side * 9.5, y + 2.2, cz + 9], 3.4, 2.8, shell);
  const dark = shell === C.paper ? C.graphite : C.ink;
  m.ball(cx - 5.5, y + 6, cz - 1.5, 1.8, 1.4, 1.8, dark).ball(cx + 2.5, y + 6, cz + 2, 1.8, 1.4, 1.8, dark); // sticks
  m.paint(cx - 3, y + 5.5, cz + 2.5, 2.1, 1.5, 0.7, dark).paint(cx - 3, y + 5.5, cz + 2.5, 0.7, 1.5, 2.1, dark); // cross
  for (const [dx, dz] of [[0, -1.6], [1.6, 0], [0, 1.6], [-1.6, 0]]) m.paint(cx + 6 + dx, y + 5.5, cz - 1.5 + dz, 0.8, 1.5, 0.8, accent);
  m.paint(cx, y + 5.8, cz - 2.5, 1.2, 1.2, 1.2, C.silver); // the button in the middle
}

/**
 * A charging dock with two controllers on it, one white, one black, the back
 * one higher. Its green light blinks while they charge. Voxels of 6.25 mm,
 * shaded as round shapes.
 */
export function dock(): RoomObject {
  const m = new VoxelModel(28, 20, 40);
  m.box(1, 0, 0, 26, 2, 40, C.graphite).box(1, 2, 0, 26, 5, 17, C.graphite); // base, and the step of the back cradle
  controller(m, 14, 7, 8, C.graphite, C.stone);
  controller(m, 14, 2, 27, C.paper, C.steel);
  m.box(12, 0, 39, 4, 2, 1, C.lime | EMISSIVE);
  return { name: 'dock', voxel: FINER, at: [X + 0.1, TOP, Z + 0.45], model: m, smooth: true };
}

/** Mesh stretched over what is filled inside an ellipsoid: a lighter thread across it, every fourth voxel. */
function meshed(m: VoxelModel, [cx, cy, cz]: Point, [rx, ry, rz]: Point): void {
  for (let z = Math.floor(cz - rz); z < cz + rz; z++) {
    for (let y = Math.floor(cy - ry); y < cy + ry; y++) {
      for (let x = Math.floor(cx - rx); x < cx + rx; x++) {
        const inside = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 + ((z + 0.5 - cz) / rz) ** 2 <= 1;
        if (inside && m.get(x, y, z) !== 0) m.set(x, y, z, (x + y + z) % 4 ? C.graphite : C.steel);
      }
    }
  }
}

/**
 * An ergonomic office chair, pulled back from the desk and turned a little:
 * mesh seat, a back in two parts on a spine, a headrest, armrests, and a
 * five-star base in polished metal on casters. Voxels of 1.25 cm, shaded as
 * round shapes: 1.3 m high.
 */
export function chair(): RoomObject {
  const m = new VoxelModel(56, 106, 56);
  const c = 28; // its axis
  for (let arm = 0; arm < 5; arm++) {
    const angle = (arm / 5) * 2 * Math.PI + 0.3;
    const end: Point = [c + Math.cos(angle) * 24, 4.6, c + Math.sin(angle) * 24];
    m.limb([c, 8, c], end, 2.7, 1.8, C.silver);
    m.ball(end[0], 2.3, end[2], 2.5, 2.5, 2.5, C.ink); // caster
  }
  m.limb([c, 8, c], [c, 30, c], 2.2, 2.2, C.silver); // gas lift
  m.limb([c, 25, c], [c, 31, c], 3.4, 4.2, C.ink); // the mechanism under the seat
  m.ball(c, 34, c - 2, 21, 3.2, 20, C.ink); // seat
  meshed(m, [c, 35.5, c - 2], [18, 2.6, 17]);
  /* The spine, then the three pads it carries. */
  m.limb([c, 32, c + 13], [c, 58, c + 22], 2.5, 2.1, C.steel).limb([c, 58, c + 22], [c, 96, c + 22], 2.1, 1.6, C.steel);
  for (const [y, z, wide, high] of [[50, 19, 17, 8], [73, 20, 20, 13.5], [99, 19, 11, 5]]) {
    m.ball(c, y, c + z, wide, high, 2.7, C.ink);
    meshed(m, [c, y, c + z], [wide - 2.5, high - 2.2, 3]);
  }
  for (const side of [-1, 1]) {
    m.limb([c + side * 19, 34, c + 3], [c + side * 23, 50, c + 3], 1.9, 1.6, C.steel); // armrest post
    m.limb([c + side * 23, 51.5, c - 8], [c + side * 23, 51.5, c + 9], 2.6, 2.6, C.ink); // and its pad
  }
  return { name: 'chair', voxel: FINE, at: [2.6, 0, 1.2], model: m, turn: 25, smooth: true };
}
