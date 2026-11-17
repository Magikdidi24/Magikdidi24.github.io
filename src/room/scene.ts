/*
  The room itself: floor, four walls, what stands in it, what the window
  looks out on, and the lights for day and night. It is shown as a doll's
  house: the two walls between the camera and the room are taken away, with
  what hangs on them, and the ceiling is always open. Units are metres; x
  runs along the back wall, z towards the viewer of the opening view, y up.
*/
import {
  AlwaysStencilFunc,
  BoxGeometry,
  BufferAttribute,
  Color,
  DataTexture,
  DirectionalLight,
  EqualStencilFunc,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  PlaneGeometry,
  PointLight,
  RedFormat,
  ReplaceStencilOp,
  Scene,
  type BufferGeometry,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bac, milestone, papers, tableNumber, toeic, written } from '../data/room.ts';
import { BOARD } from '../data/whiteboard.ts';
import { DEFAULT_VIEW } from './camera.ts';
import { BOOK_COVER } from './objects/bed.ts';
import { MAIN_SCREEN, SIDE_SCREEN } from './objects/desk.ts';
import { DOOR } from './objects/door.ts';
import { objects, type RoomObject } from './objects/index.ts';
import { FRONTS } from './objects/library.ts';
import { SPECIMEN_CARD } from './objects/shelf.ts';
import { UPS_DISPLAY } from './objects/tech.ts';
import { BONSAI_LABEL, CALENDAR_PAGE, CLIPBOARD_SHEET, FORMULAS, framed, PASSES, TAGS, WHITEBOARD_SURFACE } from './objects/walls.ts';
import { BEACON_LIGHT, TABLE_NUMBER } from './objects/wardrobe.ts';
import { WINDOW } from './objects/window.ts';
import { COLOR_ONLY, ID_ONLY } from './render/outline.ts';
import { weeks } from './ui/calendar.ts';
import { hexToLinear } from './voxel/builder.ts';
import { mergedGeometry, placement, voxelGeometry } from './voxel/geometry.ts';
import {
  boardingPass,
  bookCover,
  calendarPage,
  certificate,
  CITY,
  cityView,
  codeScreen,
  contestSheet,
  desktopScreen,
  formulaSheet,
  label,
  moveTrain,
  nameplate,
  schoolPaper,
  soonPaper,
  specimenCard,
  tableCard,
  tag,
  TRAIN,
  uptimeScreen,
  whiteboardNotes,
} from './voxel/paint.ts';
import { PALETTE, type Swatch } from './voxel/palette.ts';
import { shelfPicture } from './voxel/spines.ts';
import { lightTurn, shownWalls, texelFit, type Wall } from './view.ts';

export const ROOM = { w: 6, h: 2.7, d: 4.4 } as const;

const WALL = 0.2; // wall and floor thickness
const WALLS: Wall[] = ['north', 'west', 'south', 'east'];

/** Light arriving on a surface facing the key light, then two steps down, then none. */
const TOON_STEPS = [
  [0.86, 1],
  [0.7, 0.72],
  [0.5, 0.46],
] as const;

/** Lighting presets. Intensities are fractions of full light; the π factor of the diffuse BRDF is applied
    below. The dev panel edits them in place. */
export const LIGHTING = {
  day: { sky: '#dfe8ff', ground: '#c2a588', ambient: 0.4, key: 0.6, moon: 0, lamps: 0, background: PALETTE.sky },
  night: { sky: '#4b4590', ground: PALETTE.plum, ambient: 0.3, key: 0, moon: 0.15, lamps: 1, background: PALETTE.night },
};

/** Where the key light stands from the middle of the room as the page opens: over the right shoulder of the camera. It goes round the room with the camera (see lightTurn). */
const KEY = { across: 2.5, up: 8, back: 5.5 };

/** What can be switched in the room: the bedside lamp, the neon sign, the PC with its two screens, and the warning light on the wardrobe. */
export type Switch = 'lamp' | 'neon' | 'pc' | 'beacon';

/** The objects whose glowing voxels follow each switch, and how bright they stay once it is off. */
const SWITCHES: Record<Switch, { objects: string[]; off: number }> = {
  lamp: { objects: ['lamp'], off: 0.3 },
  neon: { objects: ['neon'], off: 0.12 },
  pc: { objects: ['pc', 'monitor', 'monitor-side'], off: 0.04 },
  beacon: { objects: ['beacon'], off: 0.3 },
};

/**
 * The lamps: where each one is, its colour, its strength at full power and
 * the switch it follows. They are lit at night; one that shines `always` is
 * strong enough to show in daylight too.
 */
const LAMPS: { at: [number, number, number]; color: string; power: number; follows?: Switch; always?: boolean }[] = [
  { at: [2.75, 2, 1], color: PALETTE.magenta, power: 3, follows: 'neon' }, // a metre from the wall so the wall itself stays under 1
  { at: [3, 0.45, 1.1], color: PALETTE.cyan, power: 1.2 }, // LED strip under the desk
  { at: [3, 1.2, 0.9], color: '#bcd0ff', power: 1.6, follows: 'pc' }, // the two screens
  { at: BEACON_LIGHT, color: '#ff8c1a', power: 26, follows: 'beacon', always: true },
];

/** The bedside lamp: warm, and near enough to the wall to draw a pool of light on it. */
const BEDSIDE = { color: PALETTE.amber, power: 1.4 };

/** The outside view is painted on two walls of a box behind the window: one pixel of it is 2 cm. */
const CITY_PIXEL = 0.02;
const CITY_BACK = -1.4; // z of the wall that faces the room
const CITY_SIDE = -1.6; // x of the wall that runs back from the room

/** A flat picture in the room: its centre and its size, in metres. It can be bent to a radius, like a curved screen, turn in its plane (`tilt`) or lean back from upright (`lean`), in degrees. */
interface Paper {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  bend?: number;
  tilt?: number;
  lean?: number;
}

/** A box of voxels of a model: its corner, then its size. */
export type VoxelBox = readonly [number, number, number, number, number, number];

export interface RoomScene {
  readonly scene: Scene;
  readonly night: boolean;
  /** How bright each switch is, from 0 (off) to 1. */
  readonly levels: Readonly<Record<Switch, number>>;
  /** The name of each object, by its id in the outline pass: names[id - 1]. */
  readonly names: readonly string[];
  setNight(night: boolean): void;
  /**
   * Show the room to a camera that stands at `azimuth`, in radians from +z
   * towards +x: the walls it looks at, what hangs on them, and the daylight
   * from its side. `turned` is how far a turn round the room has come.
   * Returns whether anything changed.
   */
  face(azimuth: number, turned?: number): boolean;
  /**
   * Lay the writing of the whiteboard on the pixel grid, so that the default
   * view shows it one texel per pixel. `pixel` is the size of a pixel of the
   * grid in the room at zoom 1, in metres.
   */
  fitBoard(pixel: number, grid: { cols: number; rows: number }): void;
  setLevel(which: Switch, level: number): void;
  /** The lights of an object that is its own mesh, by number: its glowing voxels, all of them, those of one colour, or those in a box of its model (corner, then size, in voxels). */
  lights(name: string, which?: Swatch | VoxelBox): number[];
  /** Brightness of the lights of an object that is its own mesh: all of them, those of one colour, or one by its number. */
  setGlow(name: string, level: number, which?: Swatch | number): void;
  /** Push lights of an object down by `depth` metres, by their numbers: a key that is pressed. 0 lets them up. */
  press(name: string, which: number[], depth: number): void;
  /** What the display of the power supply shows: how long the page has been open. */
  showUptime(time: string): void;
  /** How far the train of the night view runs, from the moment its nose shows to the one its tail has gone. In pixels of the view. */
  readonly trainRun: number;
  /** Put that train `far` pixels along its run, or take it off the viaduct with null. */
  train(far: number | null): void;
  dispose(): void;
}

/** An axis-aligned box from corner to corner, in one palette colour. */
function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, swatch: Swatch): BufferGeometry {
  const geometry = new BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  geometry.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const color = new Color(PALETTE[swatch]);
  const count = geometry.getAttribute('position').count;
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) color.toArray(colors, i * 3);
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  return geometry;
}

/** The ramp read by MeshToonMaterial: flat steps instead of a smooth falloff. */
function toonRamp(): DataTexture {
  const size = 64;
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    const facing = (i + 0.5) / size; // 0.5 is edge-on to the light, 1 faces it
    data[i] = Math.round(255 * (TOON_STEPS.find(([from]) => facing >= from)?.[1] ?? 0));
  }
  const texture = new DataTexture(data, size, 1, RedFormat);
  texture.minFilter = NearestFilter;
  texture.magFilter = NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

/* The four walls, each with its skirting board and standing on its own
   footing beside the floor slab. No box may share a face with a voxel object
   where both faces look the same way: the two would flicker as the camera
   turns. */
function walls(): Record<Wall, BufferGeometry[]> {
  const { w, h, d } = ROOM;
  const win = WINDOW;
  return {
    /* The back wall, around the window opening. */
    north: [
      box(-WALL, -WALL, -WALL, win.x0, h, 0, 'cream'),
      box(win.x1, -WALL, -WALL, w, h, 0, 'cream'),
      box(win.x0, -WALL, -WALL, win.x1, win.y0, 0, 'cream'),
      box(win.x0, win.y1, -WALL, win.x1, h, 0, 'cream'),
      box(0, 0, 0, w, 0.1, 0.03, 'stone'),
    ],
    /* The left wall, around the door opening, and the threshold under it. */
    west: [
      box(-WALL, -WALL, 0, 0, h, DOOR.z0, 'cream'),
      box(-WALL, -WALL, DOOR.z1, 0, h, d, 'cream'),
      box(-WALL, DOOR.height, DOOR.z0, 0, h, DOOR.z1, 'cream'),
      box(-WALL, -WALL, DOOR.z0, 0, 0, DOOR.z1, 'oak'),
      box(0, 0, 0.03, 0.03, 0.1, DOOR.z0 - 0.05, 'stone'),
      box(0, 0, DOOR.z1 + 0.05, 0.03, 0.1, d, 'stone'),
    ],
    south: [box(0, -WALL, d, w + WALL, h, d + WALL, 'cream'), box(0, 0, d - 0.03, w - 0.03, 0.1, d, 'stone')],
    east: [box(w, -WALL, 0, w + WALL, h, d, 'cream'), box(w - 0.03, 0, 0, w, 0.1, d, 'stone')],
  };
}

/**
 * Build the room. Sculpting its objects is the long part of the start: the
 * page is given a frame between two of them, and told through `progress`
 * how far the work has come, from 0 to 1.
 */
export async function createScene(progress?: (share: number) => void): Promise<RoomScene> {
  const scene = new Scene();
  const background = new Color();
  scene.background = background;

  const ramp = toonRamp();
  const lit = new MeshToonMaterial({ vertexColors: true, gradientMap: ramp });
  const glow = new MeshBasicMaterial({ vertexColors: true });
  /** What goes with each wall when it is taken away. */
  const attached: Record<Wall, Object3D[]> = { north: [], west: [], south: [], east: [] };
  const solid = (mesh: Mesh, wall?: Wall) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (wall) attached[wall].push(mesh);
  };

  solid(new Mesh(box(0, -WALL, 0, ROOM.w, 0, ROOM.d, 'oak'), lit));
  for (const [wall, boxes] of Object.entries(walls()) as [Wall, BufferGeometry[]][]) solid(new Mesh(mergeGeometries(boxes), lit), wall);

  /* The decor is two meshes for what stands on the floor, and two more for each wall that carries some; what moves or can be clicked stays apart. */
  const placed = objects().map((object, index) => ({ ...object, id: index + 1 }));
  const id = (name: string) => placed.find((object) => object.name === name)?.id ?? 0;
  for (const wall of [undefined, ...WALLS]) {
    const decor = mergedGeometry(placed.filter((object) => object.decor && object.wall === wall));
    for (const [geometry, material] of [[decor.lit, lit], [decor.glow, glow]] as const) {
      if (geometry.getAttribute('position')) solid(new Mesh(geometry, material), wall);
    }
  }
  const own = placed.filter((o) => !o.decor);
  let breath = performance.now();
  for (const [i, object] of own.entries()) {
    const mesh = new Mesh(voxelGeometry(object.model, object.voxel, object.id, object.smooth), [lit, glow]);
    mesh.name = object.name;
    mesh.userData.placed = object; // where it stands, for what moves it
    mesh.applyMatrix4(placement(object));
    mesh.visible = !object.hidden;
    solid(mesh, object.wall);
    if (performance.now() - breath < 24) continue;
    progress?.((i + 1) / own.length);
    await new Promise(requestAnimationFrame);
    breath = performance.now();
  }
  progress?.(1);

  /* Pictures laid just in front of a face: one that looks at +z, or another
     way with a turn about y. The two screens glow; papers are lit like the
     rest. Each belongs to its object and moves with it. */
  const picture = (spot: Paper, map: Texture, owner: string, glows: boolean, turn = 0) => {
    const geometry = new PlaneGeometry(spot.width, spot.height, spot.bend ? 32 : 1, 1);
    if (spot.bend) {
      /* Wrapped on a circle: its ends come towards the viewer. */
      const position = geometry.getAttribute('position');
      for (let i = 0; i < position.count; i++) {
        const angle = position.getX(i) / spot.bend;
        position.setX(i, spot.bend * Math.sin(angle));
        position.setZ(i, spot.bend * (1 - Math.cos(angle)));
      }
      geometry.computeVertexNormals();
    }
    const aux = new Float32Array(geometry.getAttribute('position').count * 2);
    for (let i = 0; i < aux.length; i += 2) aux.set([id(owner), glows ? 1 : 0], i);
    geometry.setAttribute('aux', new BufferAttribute(aux, 2));
    const mesh = new Mesh(geometry, glows ? new MeshBasicMaterial({ map }) : new MeshToonMaterial({ map, gradientMap: ramp }));
    mesh.name = `${owner}-picture`;
    mesh.position.set(spot.x, spot.y, spot.z);
    mesh.rotation.order = 'YXZ'; // it turns in its plane, leans back, then faces its way
    mesh.rotation.set(MathUtils.degToRad(-(spot.lean ?? 0)), turn, MathUtils.degToRad(spot.tilt ?? 0));
    mesh.receiveShadow = !glows;
    scene.getObjectByName(owner)!.attach(mesh);
    return mesh;
  };
  const screens = [picture(MAIN_SCREEN, desktopScreen(), 'monitor', true), picture(SIDE_SCREEN, codeScreen(), 'monitor-side', true)].map(
    (screen) => screen.material,
  );
  const board = picture(WHITEBOARD_SURFACE, whiteboardNotes(), 'whiteboard', false);
  const diplomas = { 'frame-bac': certificate(bac), 'frame-prepa': schoolPaper(papers.prepa), 'frame-epita': soonPaper(papers.epita), 'frame-toeic': nameplate(toeic.title) };
  for (const [name, paper] of Object.entries(diplomas) as [keyof typeof diplomas, Texture][]) picture(framed(name), paper, name, false, Math.PI / 2);
  const pass = boardingPass();
  for (const spot of PASSES) picture(spot, pass, 'passes', false);
  picture(FORMULAS, formulaSheet(), 'formulas', false);
  picture(TABLE_NUMBER, tableCard(tableNumber), 'table-number', false);
  /* What the stops of the visit hang in the room: the cover of the book, the tags and the label of the pegboard, the card of the meteorite, the sheet of the clipboard, the page of the calendar. */
  picture(BOOK_COVER, bookCover(written.book), 'book', false, BOOK_COVER.turn);
  [written.merged.word, ...written.merged.numbers].forEach((word, i) => picture(TAGS[i], tag(word), 'badges', false));
  picture(BONSAI_LABEL, label(written.bonsai), 'bonsai', false);
  picture(SPECIMEN_CARD, specimenCard(written.specimen), 'meteorite', false);
  picture(CLIPBOARD_SHEET, contestSheet(written.contest), 'clipboard', false);
  picture(CALENDAR_PAGE, calendarPage(written.page, weeks(milestone.year, milestone.month)), 'calendar', false);
  const uptime = picture(UPS_DISPLAY, uptimeScreen(written.uptime, '0:00'), 'homelab', true).material as MeshBasicMaterial;
  for (const front of FRONTS) picture(front, shelfPicture(front.shelf), front.name, false, front.turn);

  /* The lights of an object: its glowing voxels, each with the vertices that draw it. A face is four vertices in a row. */
  const lightsOf = (mesh: Mesh): number[][] => {
    if (mesh.userData.lights) return mesh.userData.lights as number[][];
    const { position, normal, aux } = mesh.geometry.attributes;
    const { voxel } = mesh.userData.placed as RoomObject;
    const cells = new Map<string, number[]>();
    for (let i = 0; i < position.count; i += 4) {
      if (aux.getY(i) !== 1) continue;
      /* The middle of the face, half a voxel back along its normal: inside the voxel it belongs to. */
      const inside = (get: 'getX' | 'getY' | 'getZ') =>
        Math.floor(((position[get](i) + position[get](i + 2)) / 2 - (normal[get](i) * voxel) / 2) / voxel);
      const cell = `${inside('getX')},${inside('getY')},${inside('getZ')}`;
      cells.set(cell, [...(cells.get(cell) ?? []), i, i + 1, i + 2, i + 3]);
    }
    mesh.userData.cells = [...cells.keys()].map((cell) => cell.split(',').map(Number)); // where each light is in the model
    return (mesh.userData.lights = [...cells.values()]);
  };

  /** The colours an object was built with: lights are dimmed from them. */
  const built = (mesh: Mesh) => (mesh.userData.colors ??= (mesh.geometry.getAttribute('color') as BufferAttribute).array.slice()) as Float32Array;
  /** Whether a vertex was built in a colour of the palette. */
  const colored = (full: Float32Array, vertex: number, which: Swatch) =>
    hexToLinear(PALETTE[which]).every((channel, k) => Math.abs(full[vertex * 3 + k] - channel) <= 1e-4);

  /* Lights are dimmed through their vertex colours: one material still serves them all. */
  const setGlow = (name: string, level: number, which?: Swatch | number) => {
    const mesh = scene.getObjectByName(name) as Mesh;
    const color = mesh.geometry.getAttribute('color') as BufferAttribute;
    const full = built(mesh);
    for (const vertices of typeof which === 'number' ? [lightsOf(mesh)[which]] : lightsOf(mesh)) {
      for (const i of vertices) {
        if (typeof which === 'string' && !colored(full, i, which)) continue;
        color.setXYZ(i, full[i * 3] * level, full[i * 3 + 1] * level, full[i * 3 + 2] * level);
      }
    }
    color.needsUpdate = true;
  };

  const bedside = new PointLight(BEDSIDE.color, 0, 4, 2);
  bedside.position.copy((scene.getObjectByName('lamp') as Mesh).position).add({ x: 0.09, y: 0.25, z: 0.09 });

  /* The city behind the window: a wall facing the room and one running back
     from it. Seen from above they would show over the top of the room, so a
     stencil keeps them to the window opening: the opening is drawn first,
     invisible, after everything that can hide it. */
  const views = {
    day: { back: cityView('back', false), side: cityView('side', false) },
    night: { back: cityView('back', true), side: cityView('side', true) },
  };
  const opening = new Mesh(
    new PlaneGeometry(WINDOW.x1 - WINDOW.x0, WINDOW.y1 - WINDOW.y0),
    new MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: AlwaysStencilFunc, stencilZPass: ReplaceStencilOp }),
  );
  opening.position.set((WINDOW.x0 + WINDOW.x1) / 2, (WINDOW.y0 + WINDOW.y1) / 2, -WALL);
  opening.renderOrder = 1;
  /* The pointer finds the window in its opening too: there it has an id, and nothing painted. */
  opening.geometry.setAttribute('aux', new BufferAttribute(new Float32Array(Array.from({ length: 4 }, () => [id('window'), 0]).flat()), 2));
  const cityHeight = CITY.height * CITY_PIXEL;
  const cityWall = (width: number, map: Texture) => {
    const material = new MeshBasicMaterial({ map, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: EqualStencilFunc });
    const mesh = new Mesh(new PlaneGeometry(width * CITY_PIXEL, cityHeight), material);
    mesh.renderOrder = 2;
    return mesh;
  };
  const back = cityWall(CITY.back, views.day.back);
  back.position.set(CITY_SIDE + (CITY.back * CITY_PIXEL) / 2, 0, CITY_BACK);
  const side = cityWall(CITY.side, views.day.side);
  side.position.set(CITY_SIDE, 0, -WALL - (CITY.side * CITY_PIXEL) / 2);
  side.rotation.y = Math.PI / 2;
  for (const mesh of [opening, back, side]) {
    mesh.layers.set(COLOR_ONLY);
    scene.add(mesh);
    attached.north.push(mesh);
  }
  opening.layers.enable(ID_ONLY);

  const hemisphere = new HemisphereLight();
  /* From the open side, so the floor and the two walls that show get three different tones. */
  const key = new DirectionalLight('#fff1dd');
  key.target.position.set(ROOM.w / 2, 0, ROOM.d / 2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -6;
  key.shadow.camera.right = 6;
  key.shadow.camera.top = 6;
  key.shadow.camera.bottom = -6;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 20;
  key.shadow.bias = -0.0015;
  key.shadow.normalBias = 0.03;
  /* Through the window, at night only. */
  const moon = new DirectionalLight('#9db4ff');
  moon.position.set(-2, 5, -6);
  moon.target.position.set(ROOM.w / 2, 0, ROOM.d / 2);
  const lamps = LAMPS.map((lamp) => {
    const light = new PointLight(lamp.color, 0, 8, 2);
    light.position.fromArray(lamp.at);
    return light;
  });
  scene.add(hemisphere, key, key.target, moon, moon.target, ...lamps, bedside);

  let night = false;
  let facing = '';
  const levels: Record<Switch, number> = { lamp: 1, neon: 1, pc: 1, beacon: 0 };
  const state: RoomScene = {
    scene,
    names: placed.map((object) => object.name),
    levels,
    setGlow,
    lights(name, which) {
      const mesh = scene.getObjectByName(name) as Mesh;
      const all = lightsOf(mesh).map(([vertex], i) => ({ vertex, i }));
      if (typeof which === 'object') {
        const [x, y, z, w, h, d] = which;
        const cells = mesh.userData.cells as [number, number, number][];
        return all.filter(({ i }) => cells[i].every((at, k) => at >= [x, y, z][k] && at < [x + w, y + h, z + d][k])).map(({ i }) => i);
      }
      return all.filter(({ vertex }) => !which || colored(built(mesh), vertex, which)).map(({ i }) => i);
    },
    press(name, which, depth) {
      const mesh = scene.getObjectByName(name) as Mesh;
      const position = mesh.geometry.getAttribute('position') as BufferAttribute;
      const rest = (mesh.userData.positions ??= position.array.slice()) as Float32Array;
      for (const light of which) for (const i of lightsOf(mesh)[light]) position.setY(i, rest[i * 3 + 1] - depth);
      position.needsUpdate = true;
    },
    showUptime(time) {
      uptime.map?.dispose();
      uptime.map = uptimeScreen(written.uptime, time);
    },
    trainRun: CITY.back + TRAIN.cars * TRAIN.car,
    train(far) {
      /* It comes in at the end of the wall that faces the room, and runs towards the corner. */
      moveTrain(views.night.back, far === null ? null : CITY.side + CITY.back - far);
    },
    get night() {
      return night;
    },
    face(azimuth, turned = 0) {
      const shown = shownWalls(azimuth);
      const round = lightTurn(azimuth, turned);
      const now = `${WALLS.map((wall) => shown[wall])}${round.toFixed(3)}`;
      if (now === facing) return false;
      facing = now;
      for (const wall of WALLS) for (const part of attached[wall]) part.visible = shown[wall];
      const angle = Math.atan2(KEY.across, KEY.back) + round;
      const reach = Math.hypot(KEY.across, KEY.back);
      key.position.set(ROOM.w / 2 + Math.sin(angle) * reach, KEY.up, ROOM.d / 2 + Math.cos(angle) * reach);
      return true;
    },
    fitBoard(pixel, grid) {
      const texels = { cols: BOARD.width, rows: BOARD.height };
      const fit = texelFit(WHITEBOARD_SURFACE, texels, pixel, grid, MathUtils.degToRad(DEFAULT_VIEW.azimuth), MathUtils.degToRad(DEFAULT_VIEW.elevation));
      board.position.set(fit.x, fit.y, fit.z).sub(board.parent!.position); // it hangs on the whiteboard, which never turns
      board.scale.set(fit.width / WHITEBOARD_SURFACE.width, fit.height / WHITEBOARD_SURFACE.height, 1);
    },
    setLevel(which, level) {
      levels[which] = level;
      const { objects, off } = SWITCHES[which];
      for (const name of objects) setGlow(name, off + (1 - off) * level);
      if (which === 'pc') for (const screen of screens) screen.color.setScalar(level); // black once off
      state.setNight(night);
    },
    setNight(value) {
      night = value;
      const preset = value ? LIGHTING.night : LIGHTING.day;
      background.set(preset.background);
      hemisphere.color.set(preset.sky);
      hemisphere.groundColor.set(preset.ground);
      hemisphere.intensity = Math.PI * preset.ambient;
      key.intensity = Math.PI * preset.key;
      key.castShadow = preset.key > 0;
      moon.intensity = Math.PI * preset.moon;
      lamps.forEach((light, i) => {
        const { power, follows, always } = LAMPS[i];
        light.intensity = power * (always ? 1 : preset.lamps) * (follows ? levels[follows] : 1);
      });
      bedside.intensity = BEDSIDE.power * preset.lamps * levels.lamp;
      back.material.map = value ? views.night.back : views.day.back;
      side.material.map = value ? views.night.side : views.day.side;
    },
    dispose() {
      scene.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        for (const material of [object.material].flat() as Material[]) {
          (material as MeshBasicMaterial).map?.dispose();
          material.dispose();
        }
      });
      for (const map of [...Object.values(views.day), ...Object.values(views.night)]) map.dispose();
      ramp.dispose();
      key.shadow.dispose();
    },
  };
  state.face(MathUtils.degToRad(DEFAULT_VIEW.azimuth));
  state.setLevel('beacon', 0);
  return state;
}
