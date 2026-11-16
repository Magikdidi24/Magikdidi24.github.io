/*
  What the things of the room do when they are clicked: the chair spins, a
  screen cracks, the plant sheds its leaves, the printer drops a CV... A
  click is a pointer released where it was pressed; a drag turns the camera
  instead. Under prefers-reduced-motion every movement jumps to its end.
*/
import { BoxGeometry, Color, InstancedMesh, Matrix4, type Mesh, type MeshBasicMaterial, type MeshToonMaterial, type Texture } from 'three';
import { person } from '../../data/site.ts';
import { mulberry32 } from '../../lib/photon/prng.ts';
import type { RoomApp } from '../main.ts';
import type { Switch } from '../scene.ts';
import { COLOR_ONLY } from '../render/outline.ts';
import { placement, type Placed } from '../voxel/geometry.ts';
import { codeScreen, desktopScreen } from '../voxel/paint.ts';
import { PALETTE } from '../voxel/palette.ts';
import { easeOut, fall, stepAt, type Point } from './motion.ts';

/** A pointer that moved further than this between press and release was dragging. CSS pixels. */
const CLICK_SLOP = 5;
/** Seconds a screen stays broken, and seconds fallen leaves stay on the floor. */
const BROKEN = 8;
const FALLEN = 10;
const LEAVES = 14;

/** Start reacting to clicks on the canvas. Returns what stops it. */
export function createReactions(app: RoomApp, canvas: HTMLCanvasElement): () => void {
  const { room } = app;
  const { scene } = room;
  const timers = new Set<number>();
  /** The broken picture of each screen, painted the first time it cracks. */
  const shattered = new Map<string, Texture>();
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const random = mulberry32(3);
  const between = (a: number, b: number) => a + (b - a) * random();
  const mesh = (name: string) => scene.getObjectByName(name) as Mesh;

  /** Call `apply` with t going from 0 to 1 in `count` steps over `seconds`. `shadows`: what moves casts one. */
  const move = (seconds: number, count: number, apply: (t: number) => void, shadows = true) =>
    new Promise<void>((done) => {
      let start = -1;
      let last = 0;
      app.animate((now) => {
        if (start < 0) start = now;
        const step = still.matches ? count : stepAt((now - start) / 1000, seconds, count);
        if (step !== last) {
          last = step;
          apply(step / count);
          app.invalidate(shadows);
        }
        if (step < count) return true;
        done();
        return false;
      });
    });

  const wait = (seconds: number) =>
    new Promise<void>((done) => {
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        done();
      }, seconds * 1000);
      timers.add(timer);
    });

  /** An object that is its own mesh: turned and moved from where it stands. Degrees and metres. */
  const pose = (name: string, turn: number, [dx, dy, dz]: Point = [0, 0, 0]) => {
    const object = mesh(name);
    const placed = object.userData.placed as Placed;
    placement({ ...placed, turn: (placed.turn ?? 0) + turn, at: [placed.at[0] + dx, placed.at[1] + dy, placed.at[2] + dz] }).decompose(
      object.position,
      object.quaternion,
      object.scale,
    );
  };

  /** One full turn, in steps of 15 degrees, coming to rest. */
  const spin = (name: string) => () => move(1.4, 24, (t) => pose(name, Math.round((360 * easeOut(t)) / 15) * 15));

  /** Little jumps on the spot, in steps of 2.5 cm. */
  const hop = (name: string, hops: number, height: number) => () =>
    move(0.3 * hops, 6 * hops, (t) => pose(name, 0, [0, Math.round((Math.abs(Math.sin(t * Math.PI * hops)) * height) / 0.025) * 0.025, 0]));

  /** The screen flickers, stays broken a while, then flickers back. */
  const crack = (name: string, paint: (broken: boolean) => Texture) => async () => {
    if (room.levels.pc === 0) return; // nothing to break on a screen that is off
    const material = mesh(`${name}-picture`).material as MeshBasicMaterial;
    const intact = material.map!;
    const broken = shattered.get(name) ?? paint(true);
    shattered.set(name, broken);
    const flicker = (to: Texture, from: Texture) => move(0.4, 5, (t) => void (material.map = Math.round(t * 5) % 2 ? to : from), false);
    await flicker(broken, intact);
    await wait(BROKEN);
    await flicker(intact, broken);
  };

  /* A fallen leaf: half a voxel of the plant thick. It is drawn in the colour
     render only, without depth, so it can fade out: nothing else in the room
     is transparent. */
  const leaf = new BoxGeometry(0.05, 0.025, 0.05);
  const matrix = new Matrix4();

  /** The plant shakes and sheds leaves; they lie on the floor, then fade. Free to shake again once they have landed. */
  const shed = async () => {
    const material = (mesh('plant').material as [MeshToonMaterial, MeshBasicMaterial])[0].clone();
    material.vertexColors = false; // a leaf takes the colour of its instance
    material.transparent = true;
    material.depthWrite = false;
    const leaves = new InstancedMesh(leaf, material, LEAVES);
    leaves.layers.set(COLOR_ONLY);
    leaves.receiveShadow = true;
    leaves.frustumCulled = false; // its bounds would be those of the first frame
    /* From the foliage to the floor in front of the pot, clear of the cabinet. */
    const paths = Array.from({ length: LEAVES }, (_, i) => {
      leaves.setColorAt(i, new Color(i % 3 ? PALETTE.leaf : PALETTE.moss));
      return {
        from: [between(5.78, 6), between(0.6, 1.05), between(0.12, 0.38)] as Point,
        to: [between(5.6, 5.96), 0.0125, between(0.7, 1.35)] as Point,
        delay: between(0, 0.35),
        sway: between(0.02, 0.07),
      };
    });
    const place = (t: number) => {
      paths.forEach(({ from, to, delay, sway }, i) => {
        const [x, y, z] = fall(from, to, Math.min(1, Math.max(0, (t - delay) / 0.65)), sway);
        leaves.setMatrixAt(i, matrix.makeTranslation(x, y, z));
      });
      leaves.instanceMatrix.needsUpdate = true;
    };
    place(0);
    scene.add(leaves);
    await Promise.all([move(0.4, 6, (t) => pose('plant', 0, [[0, 1, -1, 1, -1, 0, 0][Math.round(t * 6)] * 0.025, 0, 0])), move(1.3, 16, place, false)]);
    void wait(FALLEN)
      .then(() => move(0.9, 6, (t) => void (material.opacity = 1 - t), false))
      .then(() => {
        scene.remove(leaves);
        leaves.dispose();
        material.dispose();
      });
  };

  /** A switch thrown at once: on if it was off, off if it was on. */
  const toggle = (which: Switch) => () => {
    room.setLevel(which, room.levels[which] > 0 ? 0 : 1);
    app.invalidate();
  };

  /** The neon sign buzzes as if it were failing, then holds. Under three flashes a second. */
  const buzz = () => move(1.6, 8, (t) => room.setLevel('neon', [1, 0.1, 0.1, 1, 0.1, 0.6, 0.1, 1, 1][Math.round(t * 8)]), false);

  /** The PC goes down, or comes back: its lights and its two screens fade in a few steps. */
  const power = () => {
    const on = room.levels.pc === 0;
    return move(0.35, 4, (t) => room.setLevel('pc', on ? t : 1 - t), false);
  };

  /** The status lights of the NAS blink four times. */
  const blink = () => move(1.6, 8, (t) => room.setGlow('homelab', Math.round(t * 8) % 2 ? 0.08 : 1, 'cyan'), false);

  /* The sheet of the printer, from where it stands at rest on the floor: inside the printer, out of its slot. */
  const SLOT: Point = [0.3, 0.65, -0.7];
  const OUT: Point = [0.3, 0.65, -0.4];

  /** A sheet comes out of the printer and flutters down to the floor, where it stays. */
  const print = async () => {
    const rest = (mesh('cv').userData.placed as Placed).turn ?? 0;
    pose('cv', -rest, SLOT);
    mesh('cv').visible = true;
    await move(0.5, 6, (t) => pose('cv', -rest, [SLOT[0], SLOT[1], SLOT[2] + (OUT[2] - SLOT[2]) * t]));
    await move(1.2, 14, (t) => pose('cv', -rest * (1 - t), fall(OUT, [0, 0, 0], t, 0.08)));
  };

  /** The sheet on the floor hands out the CV, when there is one to hand out. */
  const download = () => {
    if (person.cv) Object.assign(document.createElement('a'), { href: person.cv, download: '' }).click();
    return hop('cv', 1, 0.05)();
  };

  const reactions: Record<string, () => unknown> = {
    chair: spin('chair'),
    dog: hop('dog', 2, 0.075),
    figurines: hop('figurines', 1, 0.05),
    plant: shed,
    monitor: crack('monitor', desktopScreen),
    'monitor-side': crack('monitor-side', codeScreen),
    lamp: toggle('lamp'),
    neon: buzz,
    pc: power,
    homelab: blink,
    printer: print,
    cv: download,
  };

  /* One reaction at a time for each object. */
  const busy = new Set<string>();
  const react = (name: string | null) => {
    const reaction = name === null ? undefined : reactions[name];
    if (!name || !reaction || busy.has(name)) return;
    busy.add(name);
    void Promise.resolve(reaction()).finally(() => busy.delete(name));
  };

  let pressed: { x: number; y: number } | null = null;
  const down = (event: PointerEvent) => {
    pressed = event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
  };
  const up = (event: PointerEvent) => {
    if (pressed && Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) <= CLICK_SLOP) react(app.pick(event.clientX, event.clientY));
    pressed = null;
  };
  const cancel = () => {
    pressed = null;
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', cancel);

  return () => {
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', cancel);
    for (const timer of timers) clearTimeout(timer);
    for (const texture of shattered.values()) texture.dispose();
    leaf.dispose();
  };
}
