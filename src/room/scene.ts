/*
  The room itself: floor, back wall (north, with the window opening) and left
  wall (west, with the door), plus the lights for day and night. Right side,
  front and ceiling are open. Units are metres; x runs along the back wall,
  z towards the viewer, y up.
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
  PointLight,
  RedFormat,
  Scene,
  type BufferGeometry,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE, type Swatch } from './voxel/palette.ts';

export const ROOM = { w: 6, h: 2.7, d: 4.4 } as const;

const WALL = 0.2; // wall and floor thickness
const WINDOW = { x0: 0.1, x1: 1.0, y0: 0.9, y1: 2.1 } as const; // in the back wall
const DOOR = { z0: 3.3, z1: 4.2, y1: 2.1 } as const; // in the left wall

/** Light arriving on a surface facing the key light, then two steps down, then none. */
const TOON_STEPS = [
  [0.86, 1],
  [0.7, 0.72],
  [0.5, 0.46],
] as const;

/** Lighting presets. Intensities are fractions of full light; the π factor of the diffuse BRDF is applied below. */
const DAY = { sky: '#dfe8ff', ground: '#c2a588', ambient: 0.4, key: 0.6, moon: 0, neon: 0, background: PALETTE.sky };
const NIGHT = { sky: '#4b4590', ground: PALETTE.plum, ambient: 0.3, key: 0, moon: 0.15, neon: 1, background: PALETTE.night };

export interface RoomScene {
  readonly scene: Scene;
  readonly night: boolean;
  setNight(night: boolean): void;
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
  const door = DOOR;
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
    box(-WALL, 0, 0, 0, h, door.z0, 'cream'),
    box(-WALL, 0, door.z1, 0, h, d, 'cream'),
    box(-WALL, door.y1, door.z0, 0, h, door.z1, 'cream'),
    /* Door: frame, leaf set back in the wall, handle. */
    box(-WALL, 0, door.z0 - 0.06, 0.03, door.y1 + 0.06, door.z0, 'walnut'),
    box(-WALL, 0, door.z1, 0.03, door.y1 + 0.06, door.z1 + 0.06, 'walnut'),
    box(-WALL, door.y1, door.z0, 0.03, door.y1 + 0.06, door.z1, 'walnut'),
    box(-0.12, 0, door.z0, -0.07, door.y1, door.z1, 'chestnut'),
    box(-0.07, 0.98, door.z0 + 0.08, -0.02, 1.03, door.z0 + 0.22, 'silver'),
    /* Skirting boards. */
    box(0, 0, 0, w, 0.1, 0.03, 'stone'),
    box(0, 0, 0.03, 0.03, 0.1, door.z0 - 0.06, 'stone'),
    box(0, 0, door.z1 + 0.06, 0.03, 0.1, d, 'stone'),
  ];
}

/* Phase 1 probes, replaced by real objects in phase 2: a 5 cm frame flat on
   the wall (does it get an outline?), two stacked boxes at furniture scale
   (outlines and highlights on a solid) and, below, an emissive bar (does only
   it bloom?). */
function probes(): BufferGeometry[] {
  const z0 = 1.0;
  const z1 = 1.3;
  const y0 = 1.3;
  const y1 = 1.7;
  const b = 0.03;
  return [
    box(0, y0, z0, 0.05, y0 + b, z1, 'walnut'),
    box(0, y1 - b, z0, 0.05, y1, z1, 'walnut'),
    box(0, y0 + b, z0, 0.05, y1 - b, z0 + b, 'walnut'),
    box(0, y0 + b, z1 - b, 0.05, y1 - b, z1, 'walnut'),
    box(0, y0 + b, z0 + b, 0.04, y1 - b, z1 - b, 'paper'),
    box(2.2, 0, 1.2, 2.8, 0.45, 1.8, 'honey'),
    box(2.35, 0.45, 1.35, 2.55, 0.65, 1.55, 'teal'),
  ];
}

export function createScene(): RoomScene {
  const scene = new Scene();
  const background = new Color();
  scene.background = background;

  const ramp = toonRamp();
  const lit = new MeshToonMaterial({ vertexColors: true, gradientMap: ramp });
  const room = new Mesh(mergeGeometries([...shell(), ...probes()]), lit);
  room.castShadow = true;
  room.receiveShadow = true;
  scene.add(room);

  /* Emissive colours go above 1 so that the bloom threshold picks them alone.
     The threshold is on luminance, and magenta has little: it needs 8 times. */
  const neonMaterial = new MeshBasicMaterial({ color: new Color(PALETTE.magenta).multiplyScalar(8) });
  const neon = new Mesh(new BoxGeometry(1, 0.06, 0.04), neonMaterial);
  neon.position.set(3, 2.3, 0.02);
  scene.add(neon);

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
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  /* Through the window, at night only. */
  const moon = new DirectionalLight('#9db4ff');
  moon.position.set(-2, 5, -6);
  moon.target.position.set(ROOM.w / 2, 0, ROOM.d / 2);
  /* A metre from the wall: closer, the wall itself would pass the bloom threshold. */
  const neonLight = new PointLight(PALETTE.magenta, 0, 8, 2);
  neonLight.position.set(3, 2, 1);
  scene.add(hemisphere, key, key.target, moon, moon.target, neonLight);

  let night = false;
  const state: RoomScene = {
    scene,
    get night() {
      return night;
    },
    setNight(value) {
      night = value;
      const preset = value ? NIGHT : DAY;
      background.set(preset.background);
      hemisphere.color.set(preset.sky);
      hemisphere.groundColor.set(preset.ground);
      hemisphere.intensity = Math.PI * preset.ambient;
      key.intensity = Math.PI * preset.key;
      key.castShadow = preset.key > 0;
      moon.intensity = Math.PI * preset.moon;
      neonLight.intensity = 3 * preset.neon;
    },
    dispose() {
      scene.traverse((object) => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        for (const material of [object.material].flat() as Material[]) material.dispose();
      });
      ramp.dispose();
      key.shadow.dispose();
    },
  };
  state.setNight(false);
  return state;
}
