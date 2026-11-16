/*
  What the things of the room do when they are clicked. The chair spins, a
  screen cracks, the sakura sheds petals, the printer drops a CV, the neon
  buzzes, the PC goes down, a frame or the whiteboard is shown large, the
  calendar opens... A click is a pointer released where it was pressed; a
  drag turns the camera instead. Under prefers-reduced-motion every movement
  jumps to its end.
*/
import { BoxGeometry, Color, InstancedMesh, MathUtils, Matrix4, Vector3, type Mesh, type MeshBasicMaterial, type MeshToonMaterial, type Texture } from 'three';
import { enlarged } from '../../data/room.ts';
import { person } from '../../data/site.ts';
import { mulberry32 } from '../../lib/photon/prng.ts';
import type { RoomApp } from '../main.ts';
import { SAKURA_FOOT } from '../objects/floor.ts';
import { COLOR_ONLY } from '../render/outline.ts';
import type { Switch } from '../scene.ts';
import { showCalendar, showPicture } from '../ui/sheets.ts';
import { placement, type Placed } from '../voxel/geometry.ts';
import { codeScreen, desktopScreen, whiteboardNotes } from '../voxel/paint.ts';
import { PALETTE } from '../voxel/palette.ts';
import { easeOut, flutter, stepAt, type Point } from './motion.ts';

/** A pointer that moved further than this between press and release was dragging. CSS pixels. */
const CLICK_SLOP = 5;
/** Seconds fallen petals stay on the floor. */
const FALLEN = 10;
const PETALS = 18;
/** How bright a neon tube that has gone out still is. */
const OUT = 0.12;

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

  /** Moments of unequal length, one after the other: how long each lasts, in milliseconds, and what it does as it starts. */
  const play = (moments: [number, () => void][]) =>
    new Promise<void>((done) => {
      const last = moments.length - 1;
      let start = -1;
      let next = still.matches ? last : 0; // without motion, only the last one happens
      app.animate((now) => {
        if (start < 0) start = now;
        let left = now - start;
        let due = 0;
        while (due < last && left >= moments[due][0]) left -= moments[due++][0];
        for (; next <= (still.matches ? last : due); next++) {
          moments[next][1]();
          app.invalidate();
        }
        if (next <= last || left < moments[last][0]) return true;
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

  const tipped = new Matrix4();

  /**
   * An object that is its own mesh: turned and moved from where it stands,
   * and tipped forwards or backwards about its middle. Degrees and metres.
   */
  const pose = (name: string, turn: number, [dx, dy, dz]: Point = [0, 0, 0], tip = 0) => {
    const object = mesh(name);
    const placed = object.userData.placed as Placed;
    const at: Point = [placed.at[0] + dx, placed.at[1] + dy, placed.at[2] + dz];
    const matrix = placement({ ...placed, turn: (placed.turn ?? 0) + turn, at });
    if (tip) {
      const [x, y, z] = [at[0] + (placed.model.sx * placed.voxel) / 2, at[1], at[2] + (placed.model.sz * placed.voxel) / 2];
      matrix
        .premultiply(tipped.makeTranslation(-x, -y, -z))
        .premultiply(tipped.makeRotationX(MathUtils.degToRad(tip)))
        .premultiply(tipped.makeTranslation(x, y, z));
    }
    matrix.decompose(object.position, object.quaternion, object.scale);
  };

  /** One full turn, in steps of 15 degrees, coming to rest. */
  const spin = (name: string) => () => move(1.4, 24, (t) => pose(name, Math.round((360 * easeOut(t)) / 15) * 15));

  /** Little jumps on the spot, in steps of 2.5 cm. */
  const hop = (name: string, hops: number, height: number) => () =>
    move(0.3 * hops, 6 * hops, (t) => pose(name, 0, [0, Math.round((Math.abs(Math.sin(t * Math.PI * hops)) * height) / 0.025) * 0.025, 0]));

  /** The screen flickers, stays broken for `seconds`, then flickers back. */
  const crack = (name: string, paint: (broken: boolean) => Texture, seconds: number) => async () => {
    if (room.levels.pc === 0) return; // nothing to break on a screen that is off
    const material = mesh(`${name}-picture`).material as MeshBasicMaterial;
    const intact = material.map!;
    const broken = shattered.get(name) ?? paint(true);
    shattered.set(name, broken);
    const flicker = (to: Texture, from: Texture) => move(0.4, 5, (t) => void (material.map = Math.round(t * 5) % 2 ? to : from), false);
    await flicker(broken, intact);
    await wait(seconds);
    await flicker(intact, broken);
  };

  /* A petal. It is drawn in the colour render only, without depth, so it can
     fade out: nothing else in the room is transparent. */
  const petal = new BoxGeometry(0.035, 0.01, 0.035);
  const matrix = new Matrix4();
  const axis = new Vector3();

  /**
   * The sakura shivers and lets petals go, a few at a time. Each one flutters
   * down its own way and comes to rest at the foot of the tree; they lie
   * there, then fade. Free to shiver again once they have landed.
   */
  const shed = async () => {
    const material = (mesh('sakura').material as [MeshToonMaterial, MeshBasicMaterial])[0].clone();
    material.vertexColors = false; // a petal takes the colour of its instance
    material.transparent = true;
    material.depthWrite = false;
    const petals = new InstancedMesh(petal, material, PETALS);
    petals.layers.set(COLOR_ONLY);
    petals.receiveShadow = true;
    petals.frustumCulled = false; // its bounds would be those of the first frame
    const paths = Array.from({ length: PETALS }, (_, i) => {
      petals.setColorAt(i, new Color(i % 3 ? PALETTE.blossom : PALETTE.sakura));
      /* Its spot: on the floor around the front of the pot, clear of the cabinet and of the edge of the room. */
      const bearing = between(-1.3, 1.3);
      const reach = between(0.2, 0.5);
      const z = SAKURA_FOOT.z + Math.cos(bearing) * reach;
      const x = Math.min(5.98, Math.max(SAKURA_FOOT.x + Math.sin(bearing) * reach, z < 0.64 ? 5.73 : 0));
      const heading = between(0, 2 * Math.PI);
      return {
        from: [SAKURA_FOOT.x + between(-0.38, 0.12), between(0.85, 1.2), SAKURA_FOOT.z + between(-0.12, 0.25)] as Point,
        to: [x, 0.005, z] as Point,
        delay: between(0, 0.45),
        swing: { reach: between(0.05, 0.12), swings: between(1.5, 3), along: [Math.cos(heading), Math.sin(heading)] as const },
        turned: between(0, 2 * Math.PI),
      };
    });
    const place = (t: number) => {
      paths.forEach(({ from, to, delay, swing, turned }, i) => {
        const own = Math.min(1, Math.max(0, (t - delay) / 0.55)); // each one leaves at its own time
        const { at, lean } = flutter(from, to, own, swing);
        /* It turns on itself, and tips into its glide. */
        matrix.makeRotationY(turned + own * 2).premultiply(tipped.makeRotationAxis(axis.set(-swing.along[1], 0, swing.along[0]), lean * 0.9));
        petals.setMatrixAt(i, matrix.setPosition(at[0], at[1], at[2]));
      });
      petals.instanceMatrix.needsUpdate = true;
    };
    place(0);
    scene.add(petals);
    await Promise.all([move(0.4, 6, (t) => pose('sakura', 0, [[0, 1, -1, 1, -1, 0, 0][Math.round(t * 6)] * 0.0125, 0, 0])), move(3.4, 40, place, false)]);
    void wait(FALLEN)
      .then(() => move(0.9, 6, (t) => void (material.opacity = 1 - t), false))
      .then(() => {
        scene.remove(petals);
        petals.dispose();
        material.dispose();
      });
  };

  /** A switch thrown at once: on if it was off, off if it was on. */
  const toggle = (which: Switch) => () => {
    room.setLevel(which, room.levels[which] > 0 ? 0 : 1);
    app.invalidate();
  };

  /** The neon at one moment: the light it gives the room, then how bright its chevron and its underline are. */
  const neon = (light: number, chevron: number, underline: number) => () => {
    room.setLevel('neon', light);
    room.setGlow('neon', chevron, 'magenta');
    room.setGlow('neon', underline, 'cyan');
  };

  /**
   * The neon fails like the sign of a diner: its tubes stutter one after the
   * other, the chevron runs at half power, the underline stays out for a
   * while, then all of it holds again. The light it gives the room only
   * changes twice: fast flashes stay on the tubes, which are small.
   */
  const buzz = () =>
    play([
      [70, neon(1, OUT, 1)],
      [50, neon(1, 1, 1)],
      [60, neon(0.3, OUT, OUT)],
      [140, neon(0.3, 1, OUT)],
      [50, neon(0.3, OUT, OUT)],
      [70, neon(0.3, 1, OUT)],
      [420, neon(0.3, 0.45, OUT)],
      [60, neon(1, 1, 1)],
      [50, neon(1, OUT, 1)],
      [90, neon(1, 1, 1)],
      [60, neon(1, 1, OUT)],
      [50, neon(1, 1, 1)],
      [480, neon(1, 1, OUT)],
      [60, neon(1, 1, 1)],
      [50, neon(1, 1, OUT)],
      [80, neon(1, 1, 1)],
      [40, neon(1, 1, OUT)],
      [0, neon(1, 1, 1)],
    ]);

  /** The PC goes down, or comes back: its lights and its two screens fade in a few steps. */
  const power = () => {
    const on = room.levels.pc === 0;
    return move(0.35, 4, (t) => room.setLevel('pc', on ? t : 1 - t), false);
  };

  /** The lights of the NAS and of its UPS flicker out of step, like drives at work, then all come back. */
  const blink = () => {
    const lights = room.lights('homelab');
    return move(2, 16, (t) => {
      for (let i = 0; i < lights; i++) room.setGlow('homelab', t === 1 || random() < 0.5 ? 1 : 0.08, i);
    }, false);
  };

  /* The sheet of the printer, from where it lies at rest on the floor: inside the printer, then clear of the cabinet. */
  const SLOT: Point = [0.3, 0.65, -0.7];
  const CLEAR: Point = [0.3, 0.65, -0.2];

  /** A sheet slides out of the printer and flutters down to the floor, to and fro, where it stays. */
  const print = async () => {
    const rest = (mesh('cv').userData.placed as Placed).turn ?? 0;
    pose('cv', -rest, SLOT);
    mesh('cv').visible = true;
    await move(0.6, 7, (t) => pose('cv', -rest, [SLOT[0], SLOT[1], SLOT[2] + (CLEAR[2] - SLOT[2]) * t]));
    await move(2.6, 32, (t) => {
      const { at, lean } = flutter(CLEAR, [0, 0, 0], t, { reach: 0.14, swings: 2.5, along: [0, 1] });
      pose('cv', -rest * (1 - t), at, lean * 30);
    });
  };

  /** The sheet on the floor hands out the CV, when there is one to hand out. */
  const download = () => {
    if (person.cv) Object.assign(document.createElement('a'), { href: person.cv, download: '' }).click();
    return hop('cv', 1, 0.05)();
  };

  /** A framed paper shown large: the real document when there is one, the paper drawn in the room otherwise. */
  const enlarge = (name: 'frame-bac' | 'frame-toeic') => () => {
    const drawn = (mesh(`${name}-picture`).material as MeshToonMaterial).map!.image as HTMLCanvasElement;
    showPicture(enlarged[name].image ?? drawn, enlarged[name].caption);
  };

  /** The whiteboard shown large, as seen face on. */
  const read = () => {
    const board = whiteboardNotes(false);
    showPicture(board.image as HTMLCanvasElement, enlarged.whiteboard.caption);
    board.dispose();
  };

  const reactions: Record<string, () => unknown> = {
    chair: spin('chair'),
    dog: hop('dog', 2, 0.075),
    figurines: hop('figurines', 1, 0.05),
    sakura: shed,
    monitor: crack('monitor', desktopScreen, 1), // a glitch: in phase 3 it leads into the projects
    'monitor-side': crack('monitor-side', codeScreen, 8),
    lamp: toggle('lamp'),
    neon: buzz,
    pc: power,
    homelab: blink,
    printer: print,
    cv: download,
    'frame-bac': enlarge('frame-bac'),
    'frame-toeic': enlarge('frame-toeic'),
    whiteboard: read,
    calendar: showCalendar,
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
    petal.dispose();
  };
}
