/*
  The room itself: floor, back wall (north, with the window opening) and left
  wall (west, with the door), what stands in it, what the window looks out
  on, and the lights for day and night. Right side, front and ceiling are
  open. Units are metres; x runs along the back wall, z towards the viewer,
  y up.
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
  type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MAIN_SCREEN, SIDE_SCREEN } from './objects/desk.ts';
import { DOOR } from './objects/door.ts';
import { objects } from './objects/index.ts';
import { BAC_PAPER, WHITEBOARD_SURFACE } from './objects/walls.ts';
import { WINDOW } from './objects/window.ts';
import { COLOR_ONLY } from './render/outline.ts';
import { hexToLinear } from './voxel/builder.ts';
import { mergedGeometry, placement, voxelGeometry } from './voxel/geometry.ts';
import { bacDiploma, CITY, cityView, codeScreen, desktopScreen, whiteboardNotes } from './voxel/paint.ts';
import { PALETTE, type Swatch } from './voxel/palette.ts';

export const ROOM = { w: 6, h: 2.7, d: 4.4 } as const;

const WALL = 0.2; // wall and floor thickness

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

/** What can be switched in the room: the bedside lamp, the neon sign, and the PC with its two screens. */
export type Switch = 'lamp' | 'neon' | 'pc';

/** The objects whose glowing voxels follow each switch, and how bright they stay once it is off. */
const SWITCHES: Record<Switch, { objects: string[]; off: number }> = {
  lamp: { objects: ['lamp'], off: 0.3 },
  neon: { objects: ['neon'], off: 0.12 },
  pc: { objects: ['pc', 'monitor', 'monitor-side'], off: 0.04 },
};

/** The lamps of the night: where each one is, its colour, its strength at full power and the switch it follows. */
const LAMPS: { at: [number, number, number]; color: string; power: number; follows?: Switch }[] = [
  { at: [3, 2, 1], color: PALETTE.magenta, power: 3, follows: 'neon' }, // a metre from the wall so the wall itself stays under 1
  { at: [2.8, 0.45, 1.1], color: PALETTE.cyan, power: 1.2 }, // LED strip under the desk
  { at: [2.7, 1.2, 0.9], color: '#bcd0ff', power: 1.6, follows: 'pc' }, // the two screens
];

/** The bedside lamp: warm, and near enough to the wall to draw a pool of light on it. */
const BEDSIDE = { color: PALETTE.amber, power: 1.4 };

/** The outside view is painted on two walls of a box behind the window: one pixel of it is 2 cm. */
const CITY_PIXEL = 0.02;
const CITY_BACK = -1.4; // z of the wall that faces the room
const CITY_SIDE = -1.6; // x of the wall that runs back from the room

export interface RoomScene {
  readonly scene: Scene;
  readonly night: boolean;
  /** How bright each switch is, from 0 (off) to 1. */
  readonly levels: Readonly<Record<Switch, number>>;
  /** The name of each object, by its id in the outline pass: names[id - 1]. */
  readonly names: readonly string[];
  setNight(night: boolean): void;
  setLevel(which: Switch, level: number): void;
  /** Brightness of the glowing voxels of an object that is its own mesh: all of them, or those of one colour. */
  setGlow(name: string, level: number, swatch?: Swatch): void;
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

/* Floor and walls. No box may share a face with a voxel object where both
   faces look the same way: the two would flicker as the camera turns. */
function shell(): BufferGeometry[] {
  const { w, h, d } = ROOM;
  const win = WINDOW;
  return [
    /* Floor slab, under the walls too. */
    box(-WALL, -WALL, -WALL, w, 0, d, 'oak'),
    /* Back wall around the window opening. */
    box(-WALL, 0, -WALL, win.x0, h, 0, 'cream'),
    box(win.x1, 0, -WALL, w, h, 0, 'cream'),
    box(win.x0, 0, -WALL, win.x1, win.y0, 0, 'cream'),
    box(win.x0, win.y1, -WALL, win.x1, h, 0, 'cream'),
    /* Left wall around the door opening. */
    box(-WALL, 0, 0, 0, h, DOOR.z0, 'cream'),
    box(-WALL, 0, DOOR.z1, 0, h, d, 'cream'),
    box(-WALL, DOOR.height, DOOR.z0, 0, h, DOOR.z1, 'cream'),
    /* Skirting boards. */
    box(0, 0, 0, w, 0.1, 0.03, 'stone'),
    box(0, 0, 0.03, 0.03, 0.1, DOOR.z0 - 0.05, 'stone'),
    box(0, 0, DOOR.z1 + 0.05, 0.03, 0.1, d, 'stone'),
  ];
}

export function createScene(): RoomScene {
  const scene = new Scene();
  const background = new Color();
  scene.background = background;

  const ramp = toonRamp();
  const lit = new MeshToonMaterial({ vertexColors: true, gradientMap: ramp });
  const glow = new MeshBasicMaterial({ vertexColors: true });
  const solid = (mesh: Mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  };

  solid(new Mesh(mergeGeometries(shell()), lit));

  /* The decor is two meshes for the whole room; what moves or can be clicked stays apart. */
  const placed = objects().map((object, index) => ({ ...object, id: index + 1 }));
  const id = (name: string) => placed.find((object) => object.name === name)?.id ?? 0;
  const decor = mergedGeometry(placed.filter((object) => object.decor));
  solid(new Mesh(decor.lit, lit));
  solid(new Mesh(decor.glow, glow));
  for (const object of placed.filter((o) => !o.decor)) {
    const mesh = new Mesh(voxelGeometry(object.model, object.voxel, object.id, object.smooth), [lit, glow]);
    mesh.name = object.name;
    mesh.userData.placed = object; // where it stands, for what moves it
    mesh.applyMatrix4(placement(object));
    mesh.visible = !object.hidden;
    solid(mesh);
  }

  /* Pictures laid just in front of a face: one that looks at +z, or at +x
     with a quarter turn. The two screens glow; the whiteboard and the diploma
     are lit like the rest. Each belongs to its object. */
  const picture = (spot: typeof MAIN_SCREEN, map: Texture, owner: string, glows: boolean, turn = 0) => {
    const geometry = new PlaneGeometry(spot.width, spot.height);
    const aux = new Float32Array(geometry.getAttribute('position').count * 2);
    for (let i = 0; i < aux.length; i += 2) aux.set([id(owner), glows ? 1 : 0], i);
    geometry.setAttribute('aux', new BufferAttribute(aux, 2));
    const mesh = new Mesh(geometry, glows ? new MeshBasicMaterial({ map }) : new MeshToonMaterial({ map, gradientMap: ramp }));
    mesh.name = `${owner}-picture`;
    mesh.position.set(spot.x, spot.y, spot.z);
    mesh.rotation.y = turn;
    mesh.receiveShadow = !glows;
    scene.add(mesh);
    return mesh.material;
  };
  const screens = [picture(MAIN_SCREEN, desktopScreen(), 'monitor', true), picture(SIDE_SCREEN, codeScreen(), 'monitor-side', true)];
  picture(WHITEBOARD_SURFACE, whiteboardNotes(), 'whiteboard', false);
  picture(BAC_PAPER, bacDiploma(), 'frames', false, Math.PI / 2);

  /* Glowing voxels are dimmed through their vertex colours: one material still serves them all. */
  const setGlow = (name: string, level: number, swatch?: Swatch) => {
    const mesh = scene.getObjectByName(name) as Mesh;
    const color = mesh.geometry.getAttribute('color') as BufferAttribute;
    const aux = mesh.geometry.getAttribute('aux');
    const full = (mesh.userData.colors ??= color.array.slice()) as Float32Array;
    const only = swatch && hexToLinear(PALETTE[swatch]);
    for (let i = 0; i < color.count; i++) {
      if (aux.getY(i) !== 1) continue;
      if (only?.some((channel, k) => Math.abs(full[i * 3 + k] - channel) > 1e-4)) continue;
      color.setXYZ(i, full[i * 3] * level, full[i * 3 + 1] * level, full[i * 3 + 2] * level);
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
  }

  const hemisphere = new HemisphereLight();
  /* From the open side, so the floor, the back wall and the left wall get three different tones. */
  const key = new DirectionalLight('#fff1dd');
  key.position.set(ROOM.w / 2 + 2.5, 8, ROOM.d / 2 + 5.5);
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
  const levels: Record<Switch, number> = { lamp: 1, neon: 1, pc: 1 };
  const state: RoomScene = {
    scene,
    names: placed.map((object) => object.name),
    levels,
    setGlow,
    get night() {
      return night;
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
        const { power, follows } = LAMPS[i];
        light.intensity = power * preset.lamps * (follows ? levels[follows] : 1);
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
  state.setNight(false);
  return state;
}
