/*
  The room itself: floor, back wall (north, with the window opening) and left
  wall (west, with the door), what stands in it, and the lights for day and
  night. Right side, front and ceiling are open. Units are metres; x runs
  along the back wall, z towards the viewer, y up.
*/
import {
  BoxGeometry,
  BufferAttribute,
  Color,
  DataTexture,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
  NearestFilter,
  PlaneGeometry,
  PointLight,
  RedFormat,
  Scene,
  type BufferGeometry,
  type Material,
  type Texture,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MAIN_SCREEN, SIDE_SCREEN } from './objects/desk.ts';
import { DOOR } from './objects/door.ts';
import { objects } from './objects/index.ts';
import { voxelGeometry } from './voxel/geometry.ts';
import { codeScreen, desktopScreen } from './voxel/paint.ts';
import { PALETTE, type Swatch } from './voxel/palette.ts';

export const ROOM = { w: 6, h: 2.7, d: 4.4 } as const;

const WALL = 0.2; // wall and floor thickness
const WINDOW = { x0: 0.1, x1: 1.0, y0: 0.9, y1: 2.1 } as const; // in the back wall

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

/** The lamps of the night: where each one is, its colour and its strength at full power. */
const LAMPS = [
  { at: [3, 2, 1], color: PALETTE.magenta, power: 3 }, // neon, a metre from the wall so the wall itself stays under 1
  { at: [2.8, 0.45, 1.1], color: PALETTE.cyan, power: 1.2 }, // LED strip under the desk
  { at: [2.7, 1.2, 0.9], color: '#bcd0ff', power: 1.6 }, // the two screens
] as const;

export interface RoomScene {
  readonly scene: Scene;
  readonly night: boolean;
  setNight(night: boolean): void;
  /** Comparison only: multiply emissive colours, for a bloom that works by brightness threshold. */
  setGlowBoost(factor: number): void;
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
    /* Window: sill, frame and one cross. */
    box(win.x0 - 0.05, win.y0 - 0.05, -WALL, win.x1 + 0.05, win.y0, 0.1, 'walnut'),
    box(win.x0, win.y0, -0.15, win.x0 + 0.05, win.y1, -0.05, 'walnut'),
    box(win.x1 - 0.05, win.y0, -0.15, win.x1, win.y1, -0.05, 'walnut'),
    box(win.x0, win.y1 - 0.05, -0.15, win.x1, win.y1, -0.05, 'walnut'),
    box((win.x0 + win.x1) / 2 - 0.025, win.y0, -0.125, (win.x0 + win.x1) / 2 + 0.025, win.y1, -0.075, 'walnut'),
    box(win.x0, (win.y0 + win.y1) / 2 - 0.025, -0.125, win.x1, (win.y0 + win.y1) / 2 + 0.025, -0.075, 'walnut'),
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

/** A flat picture facing +z: a screen. `id` is the object it belongs to in the outline pass. */
function screen(spot: { x: number; y: number; z: number; width: number; height: number }, map: Texture, id: number): Mesh {
  const geometry = new PlaneGeometry(spot.width, spot.height);
  const aux = new Float32Array(geometry.getAttribute('position').count * 2);
  for (let i = 0; i < aux.length; i += 2) aux.set([id, 1], i);
  geometry.setAttribute('aux', new BufferAttribute(aux, 2));
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ map }));
  mesh.position.set(spot.x, spot.y, spot.z);
  return mesh;
}

export function createScene(): RoomScene {
  const scene = new Scene();
  const background = new Color();
  scene.background = background;

  const ramp = toonRamp();
  const lit = new MeshToonMaterial({ vertexColors: true, gradientMap: ramp });
  const glow = new MeshBasicMaterial({ vertexColors: true });

  const room = new Mesh(mergeGeometries(shell()), lit);
  room.castShadow = true;
  room.receiveShadow = true;
  scene.add(room);

  const ids = new Map<string, number>();
  objects().forEach((object, index) => {
    const id = index + 1;
    ids.set(object.name, id);
    const mesh = new Mesh(voxelGeometry(object.model, object.voxel, id), [lit, glow]);
    mesh.name = object.name;
    mesh.position.set(...object.at);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
  });
  const screens = [
    screen(MAIN_SCREEN, desktopScreen(), ids.get('monitor') ?? 0),
    screen(SIDE_SCREEN, codeScreen(), ids.get('monitor-side') ?? 0),
  ];
  scene.add(...screens);

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
  scene.add(hemisphere, key, key.target, moon, moon.target, ...lamps);

  let night = false;
  const state: RoomScene = {
    scene,
    get night() {
      return night;
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
      lamps.forEach((light, i) => (light.intensity = LAMPS[i].power * preset.lamps));
    },
    setGlowBoost(factor) {
      for (const material of [glow, ...screens.map((mesh) => mesh.material as MeshBasicMaterial)]) material.color.setScalar(factor);
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
      ramp.dispose();
      key.shadow.dispose();
    },
  };
  state.setNight(false);
  return state;
}
