/*
  What the things of the room do under the pointer. One that answers a click
  is outlined when the pointer is over it, named beside the pointer, and
  lifted a little if it is small. Clicked, the chair spins, a screen cracks,
  the sakura sheds petals, the printer drops a CV, doors swing open, the
  brush falls off the whiteboard, the warning light flashes, the calendar
  opens... and the objects that are stops of the visit open their panel. A
  click is a pointer released where it was pressed; a drag turns the camera
  instead. Under prefers-reduced-motion every movement jumps to its end.
*/
import { BoxGeometry, Color, InstancedMesh, MathUtils, Matrix4, Vector3, type Mesh, type MeshBasicMaterial, type MeshToonMaterial, type Texture } from 'three';
import { enlarged, labels, says, stops } from '../../data/room.ts';
import { person } from '../../data/site.ts';
import { mulberry32 } from '../../lib/photon/prng.ts';
import type { RoomApp } from '../main.ts';
import { ON_NIGHTSTAND } from '../objects/bed.ts';
import { SAKURA_CROWN, SAKURA_FOOT } from '../objects/floor.ts';
import { pulled } from '../objects/library.ts';
import { MARKERS } from '../objects/walls.ts';
import { DOORS } from '../objects/wardrobe.ts';
import { COLOR_ONLY } from '../render/outline.ts';
import { ROOM, type Switch } from '../scene.ts';
import { current, go } from '../ui/route.ts';
import { showCalendar, showPicture } from '../ui/sheets.ts';
import { placement, type Placed } from '../voxel/geometry.ts';
import { codeScreen, desktopScreen } from '../voxel/paint.ts';
import { PALETTE } from '../voxel/palette.ts';
import { easeOut, flutter, stepAt, tumble, type Point } from './motion.ts';

/** A pointer that moved further than this between press and release was dragging. CSS pixels. */
const CLICK_SLOP = 5;
/** Seconds that what fell stays on the floor: petals, then what dropped off the whiteboard or out of a bookcase. */
const FALLEN = 10;
const DROPPED = 5;
const PETALS = 28;
/** How bright a neon tube that has gone out still is. */
const OUT = 0.12;
/** How far a small object rises under the pointer, and up to which size an object counts as small. Metres. */
const LIFT = 0.025;
const SMALL = 0.45;

/** The panel each object opens, for those that are stops of the visit. */
const STOP: Record<string, string> = Object.fromEntries(stops.flatMap(({ id, objects }) => objects.map((name) => [name, id])));

/** Where a click happened in the viewport: a picture shown large grows from there. */
interface Spot {
  x: number;
  y: number;
}

/** What is clicked as one thing: while one of them reacts, the others wait. */
const GROUPS: Record<string, string> = {
  ...Object.fromEntries(Object.keys(DOORS).map((door) => [door, door.split('-')[0]])),
  ...Object.fromEntries(['eraser', ...MARKERS.map((color) => `marker-${color}`)].map((name) => [name, 'whiteboard'])),
  'manga-east': 'library',
  'manga-south': 'library',
  volume: 'library',
};

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
  let running = true;

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
  /** How each object that has moved is posed: its turn, how far it is from its place, and its tip. */
  const poses = new Map<string, { turn: number; by: Point; tip: number }>();
  /** The object under the pointer. */
  let hovered: string | null = null;

  /** An object counts as small when its largest side is: it is lifted under the pointer. */
  const small = (name: string) => {
    const { model, voxel } = mesh(name).userData.placed as Placed;
    return Math.max(model.sx, model.sy, model.sz) * voxel <= SMALL;
  };

  /**
   * An object that is its own mesh: turned and moved from where it stands,
   * and tipped forwards or backwards about its middle. Degrees and metres.
   */
  const pose = (name: string, turn: number, by: Point = [0, 0, 0], tip = 0) => {
    poses.set(name, { turn, by, tip });
    settle(name);
  };

  /** Put an object where its pose says, a little higher if it is the small one under the pointer. */
  const settle = (name: string) => {
    const { turn, by: [dx, dy, dz], tip } = poses.get(name) ?? { turn: 0, by: [0, 0, 0], tip: 0 };
    const object = mesh(name);
    const placed = object.userData.placed as Placed;
    const lift = name === hovered && small(name) ? LIFT : 0;
    const at: Point = [placed.at[0] + dx, placed.at[1] + dy + lift, placed.at[2] + dz];
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

  const corner = new Vector3();

  /** A few words in a bubble over an object, for a moment. Screen readers hear them too. */
  const say = (name: string, words: string) => {
    const { at, model, voxel } = mesh(name).userData.placed as Placed;
    corner.set(at[0] + (model.sx * voxel) / 2, at[1] + model.sy * voxel, at[2] + (model.sz * voxel) / 2).project(app.rig.camera);
    const bubble = Object.assign(document.createElement('p'), { className: 'bubble', role: 'status', textContent: words });
    bubble.style.left = `${((corner.x + 1) / 2) * app.pipeline.grid.cssWidth}px`;
    bubble.style.top = `${((1 - corner.y) / 2) * app.pipeline.grid.cssHeight}px`;
    canvas.after(bubble);
    void wait(1.4).then(() => bubble.remove());
  };

  /** One full turn, in steps of 15 degrees, coming to rest. */
  const spin = (name: string) => () => move(1.4, 24, (t) => pose(name, Math.round((360 * easeOut(t)) / 15) * 15));

  /** Little jumps on the spot, in steps of 2.5 cm at most. */
  const hop = (name: string, hops = 1, height = 0.05) => () => {
    const grain = Math.min(0.025, height / 2);
    return move(0.3 * hops, 6 * hops, (t) => pose(name, 0, [0, Math.round((Math.abs(Math.sin(t * Math.PI * hops)) * height) / grain) * grain, 0]));
  };

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
   * The sakura shivers and lets petals go, a few at a time. Each one leaves
   * the crown and flutters down its own way, to rest on the floor around the
   * foot of the tree; they lie there, then fade. Free to shiver again once
   * they have landed.
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
    const around = (reach: number): [number, number] => {
      const bearing = between(0, 2 * Math.PI);
      return [SAKURA_FOOT.x + Math.cos(bearing) * reach, SAKURA_FOOT.z + Math.sin(bearing) * reach];
    };
    const paths = Array.from({ length: PETALS }, (_, i) => {
      petals.setColorAt(i, new Color(i % 3 ? PALETTE.blossom : PALETTE.sakura));
      const [x0, z0] = around(between(0.05, SAKURA_CROWN.reach));
      const [x1, z1] = around(between(0.3, 0.95));
      const heading = between(0, 2 * Math.PI);
      return {
        from: [x0, between(SAKURA_CROWN.from, SAKURA_CROWN.to), z0] as Point,
        to: [Math.min(x1, ROOM.w - 0.3), 0.005, Math.min(z1, ROOM.d - 0.3)] as Point, // clear of the bookcases
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
    await Promise.all([move(0.4, 6, (t) => pose('sakura', 0, [[0, 1, -1, 1, -1, 0, 0][Math.round(t * 6)] * 0.0125, 0, 0])), move(3.6, 44, place, false)]);
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

  /**
   * The warning light on the wardrobe: six strong orange flashes, two a
   * second. Slow enough to be safe for a light that fills the room.
   */
  const flash = () => {
    const lit = (level: number) => () => room.setLevel('beacon', level);
    return play([...Array.from({ length: 6 }, (): [number, () => void][] => [[170, lit(1)], [330, lit(0)]]).flat(), [0, lit(0)]]);
  };

  /** The PC goes down, or comes back: its lights and its two screens fade in a few steps. */
  const power = () => {
    const on = room.levels.pc === 0;
    return move(0.35, 4, (t) => room.setLevel('pc', on ? t : 1 - t), false);
  };

  /** The lights of one colour of an object flicker, each on its own, like drives at work, then all come back. */
  const blink = (name: string, color: 'cyan' | 'lime', seconds: number) => () => {
    const lights = room.lights(name, color);
    const steps = Math.round(seconds * 8);
    return move(seconds, steps, (t) => {
      for (const light of lights) room.setGlow(name, t === 1 || random() < 0.5 ? 1 : 0.08, light);
    }, false);
  };

  /* The sheet of the printer, from where it lies at rest on the floor: inside the printer, then clear of the cabinet. */
  const SLOT: Point = [0.3, 0.65, -0.7];
  const CLEAR: Point = [0.3, 0.65, -0.2];

  /** The printer works, its green light blinking: a sheet slides out of it and flutters down to the floor, to and fro, where it stays. */
  const print = async () => {
    const rest = (mesh('cv').userData.placed as Placed).turn ?? 0;
    void blink('printer', 'lime', 3.2)();
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
    return hop('cv')();
  };

  /** A paper shown large, from where it was clicked: the real document when there is one, the paper drawn in the room otherwise. */
  const enlarge = (name: keyof typeof enlarged) => async (from: Spot) => {
    await hop(name, 1, 0.025)();
    const drawn = (mesh(`${name}-picture`).material as MeshToonMaterial).map!.image as HTMLCanvasElement;
    showPicture(enlarged[name].image?.src ?? drawn, enlarged[name].caption, from);
  };

  /* The doors that stand open. */
  const open = new Set<string>();

  /** A door swings on its hinge, in steps: open if it was shut, shut if it was open, unless told which. */
  const swing = (name: string, wide = !open.has(name)) => {
    if (wide === open.has(name)) return Promise.resolve();
    const [from, to] = wide ? [0, DOORS[name]] : [DOORS[name], 0];
    if (wide) open.add(name);
    else open.delete(name);
    return move(0.5, 6, (t) => pose(name, from + (to - from) * t));
  };

  /** A piece of furniture clicked elsewhere than on a door: all its doors open, or all shut if one stood open. */
  const doors = (furniture: string) => () => {
    const names = Object.keys(DOORS).filter((door) => door.startsWith(furniture));
    const wide = !names.some((door) => open.has(door));
    return Promise.all(names.map((door) => swing(door, wide)));
  };

  /** The nightstand is locked: it shakes, gives a small jump, and says so. What stands on it goes with it. */
  const locked = () => {
    say('nightstand', says.nightstand);
    return move(0.5, 10, (t) => {
      const step = Math.round(t * 10);
      const aside = step === 10 ? 0 : (step % 2 ? 1 : -1) * 0.0125;
      for (const name of ON_NIGHTSTAND) pose(name, 0, [aside, step > 2 && step < 6 ? 0.025 : 0, 0]);
    });
  };

  /** The dog jumps up twice, and barks. */
  const bark = () => {
    say('dog', says.dog);
    return hop('dog', 2, 0.075)();
  };

  /**
   * What is on the whiteboard lets go: the magnetic brush, and one or two of
   * the markers, never the same. They drop past the cabinet to the floor,
   * turning over, lie there, then jump back to their place.
   */
  const drop = async () => {
    const markers = [...MARKERS].sort(() => random() - 0.5).slice(0, random() < 0.5 ? 1 : 2);
    const fallen = ['eraser', ...markers.map((color) => `marker-${color}`)].map((name, i) => {
      const { at } = mesh(name).userData.placed as Placed;
      return {
        name,
        to: [between(-0.25, 0.25), -at[1], between(0.95, 1.2) - at[2]] as Point, // on the floor, in front of the cabinet
        delay: i * 0.12,
        spin: between(-200, 200),
        flips: random() < 0.5 ? 180 : 360,
      };
    });
    const fall = (t: number) =>
      fallen.forEach(({ name, to, delay, spin, flips }) => {
        const own = Math.min(1, Math.max(0, (t - delay) / 0.7));
        pose(name, spin * own, tumble([0, 0, 0], to, own), flips * own);
      });
    await move(1.2, 24, fall);
    await wait(DROPPED);
    /* The way back is a jump: up fast, then level on to its place. */
    await move(0.5, 8, (t) => fallen.forEach(({ name, to, spin }) => pose(name, spin * (1 - t), [to[0] * (1 - t), to[1] * (1 - t) ** 2, to[2] * (1 - t)])));
  };

  /** A volume slips out of the bookcase that was clicked, falls open on the floor in front of it, and is gone a while later. */
  const pull = (name: string) => async () => {
    const { from, to } = pulled(name, random(), 2 + Math.floor(random() * 7));
    const spin = between(-240, 240);
    mesh('volume').visible = true;
    await move(1, 20, (t) => pose('volume', spin * t, tumble(from, to, t), 360 * t));
    await wait(DROPPED);
    mesh('volume').visible = false;
    app.invalidate(true);
  };

  /** The daruma is knocked and rocks back upright, as a daruma does. */
  const rock = (name: string) => () => move(1.1, 16, (t) => pose(name, 0, [0, 0, 0], Math.round(Math.sin(t * 4 * Math.PI) * (1 - t) * 22)));

  /** Something on wheels rolls away along x and comes back. */
  const roll = (name: string, reach: number) => () => move(1.2, 16, (t) => pose(name, 0, [Math.round((Math.sin(t * Math.PI) * reach) / 0.00625) * 0.00625, 0, 0]));

  /** The mouse is moved in a loop on its pad. */
  const circle = (name: string) => () => move(0.9, 14, (t) => pose(name, 0, [Math.sin(t * 2 * Math.PI) * 0.035, 0, (Math.cos(t * 2 * Math.PI) - 1) * 0.025]));

  /** A stop of the visit: its panel opens, the camera goes to it, and the object does what it does. */
  const visit = (name: string, then: (from: Spot) => unknown) => (from: Spot) => {
    go(STOP[name]);
    return then(from);
  };

  /** A knock on the door: it rattles in its frame. */
  const knock = () => move(0.3, 6, (t) => pose('door', 0, [0, 0, [0, 1, -1, 1, -1, 0, 0][Math.round(t * 6)] * 0.0125]));

  const reactions: Record<string, (from: Spot) => unknown> = {
    chair: spin('chair'),
    dog: bark,
    figurines: hop('figurines'),
    sakura: shed,
    monitor: visit('monitor', crack('monitor', desktopScreen, 0.3)), // a glitch on the way into the desktop of projects
    'monitor-side': crack('monitor-side', codeScreen, 8),
    keyboard: hop('keyboard', 1, 0.0125),
    mouse: circle('mouse'),
    'speaker-left': hop('speaker-left', 2, 0.025),
    'speaker-right': hop('speaker-right', 2, 0.025),
    dock: hop('dock', 1, 0.025),
    lamp: toggle('lamp'),
    nightstand: locked,
    book: hop('book', 1, 0.025),
    neon: buzz,
    pc: power,
    homelab: blink('homelab', 'cyan', 2),
    printer: print,
    cv: download,
    cabinet: doors('cabinet'),
    wardrobe: doors('wardrobe'),
    ...Object.fromEntries(Object.keys(DOORS).map((door) => [door, () => swing(door)])),
    tripod: hop('tripod', 2),
    beacon: flash,
    'frame-bac': visit('frame-bac', enlarge('frame-bac')),
    'frame-prepa': visit('frame-prepa', hop('frame-prepa', 1, 0.025)),
    'frame-epita': visit('frame-epita', hop('frame-epita', 1, 0.025)),
    'frame-toeic': visit('frame-toeic', enlarge('frame-toeic')),
    door: visit('door', knock),
    passes: enlarge('passes'),
    formulas: enlarge('formulas'),
    calendar: showCalendar,
    whiteboard: drop,
    eraser: drop,
    ...Object.fromEntries(MARKERS.map((color) => [`marker-${color}`, drop])),
    duo: hop('duo'),
    meteorite: hop('meteorite', 1, 0.025),
    liquids: hop('liquids', 1, 0.025),
    daruma: rock('daruma'),
    'lucky-cat': hop('lucky-cat', 3, 0.025),
    car: roll('car', -0.06),
    tiger: hop('tiger', 2, 0.025),
    'stamp-book': hop('stamp-book', 1, 0.025),
    'manga-east': pull('manga-east'),
    'manga-south': pull('manga-south'),
  };

  /* One reaction at a time for each thing. */
  const busy = new Set<string>();
  const react = (name: string | null, from: Spot) => {
    const reaction = name === null ? undefined : reactions[name];
    const thing = name && (GROUPS[name] ?? name);
    if (!thing || !reaction || busy.has(thing)) return;
    busy.add(thing);
    void Promise.resolve(reaction(from)).finally(() => busy.delete(thing));
  };

  /* The dock blinks for as long as its controllers charge. */
  let charging = true;
  app.animate((now) => {
    const lit = still.matches || Math.floor(now / 600) % 2 === 0;
    if (lit !== charging) {
      charging = lit;
      room.setGlow('dock', lit ? 1 : 0.12, 'lime');
      app.invalidate();
    }
    return running;
  });

  /* The name of what is under the pointer, beside it. Not read out: the menu of the page lists the stops of the visit. */
  const label = Object.assign(document.createElement('p'), { className: 'label', hidden: true });
  label.setAttribute('aria-hidden', 'true');
  canvas.after(label);

  /** What the pointer is over, if it answers a click: outlined, named, and lifted if it is small. */
  const hover = (name: string | null, at?: Spot) => {
    if (name !== hovered) {
      const before = hovered;
      hovered = name;
      app.hover(name);
      canvas.style.cursor = name ? 'pointer' : '';
      label.hidden = !name || !labels[name];
      label.textContent = (name && labels[name]) ?? '';
      for (const moved of [before, name]) {
        if (!moved || !small(moved)) continue;
        settle(moved);
        app.invalidate(true);
      }
    }
    if (at) {
      label.style.left = `${at.x}px`;
      label.style.top = `${at.y}px`;
    }
  };

  /* The pointer is looked up once a frame at most: reading what is under it asks the graphics card. */
  let pointer: Spot | null = null;
  let looking = false;
  const moved = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return; // a finger does not hover
    const box = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - box.left, y: event.clientY - box.top };
    if (looking) return;
    looking = true;
    requestAnimationFrame(() => {
      looking = false;
      if (!pointer || !running) return;
      const name = app.pick(pointer.x + box.left, pointer.y + box.top);
      hover(name && name in reactions ? name : null, pointer);
    });
  };
  const left = () => {
    pointer = null;
    hover(null);
  };

  let pressed: Spot | null = null;
  const down = (event: PointerEvent) => {
    pressed = event.isPrimary && event.button === 0 ? { x: event.clientX, y: event.clientY } : null;
  };
  const up = (event: PointerEvent) => {
    const at = { x: event.clientX, y: event.clientY };
    if (pressed && Math.hypot(at.x - pressed.x, at.y - pressed.y) <= CLICK_SLOP) {
      const name = app.pick(at.x, at.y);
      /* With a panel open, a click beside the stops of the visit closes it. */
      if (current().stop && !(name && STOP[name])) go(null);
      else react(name, at);
    }
    pressed = null;
  };
  const cancel = () => {
    pressed = null;
  };
  canvas.addEventListener('pointermove', moved);
  canvas.addEventListener('pointerleave', left);
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', cancel);

  return () => {
    running = false;
    label.remove();
    canvas.removeEventListener('pointermove', moved);
    canvas.removeEventListener('pointerleave', left);
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', cancel);
    for (const timer of timers) clearTimeout(timer);
    for (const texture of shattered.values()) texture.dispose();
    petal.dispose();
  };
}
