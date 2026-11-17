/*
  What the things of the room do under the pointer. One that answers a click
  is outlined when the pointer is over it, named beside the pointer, and
  lifted a little if it is small. Clicked, the chair spins, a screen cracks,
  the printer drops a CV, doors swing open, an old
  console plays the sound it makes as it starts, a speaker shows a music
  note, the brush falls off the whiteboard, the PC goes down, the warning
  light flashes, the calendar opens... and the objects that are stops of
  the visit open their panel: for the main screen, the chair rolls out of the
  way of the camera, and the keyboard lights the key of each skill under the
  pointer. A
  click is a pointer released where it was pressed; a drag turns the camera
  instead. Under prefers-reduced-motion every movement jumps to its end.
*/
import { MathUtils, Matrix4, Vector3, type Mesh, type MeshBasicMaterial, type MeshToonMaterial, type Texture } from 'three';
import { manga } from '../../data/manga.ts';
import { enlarged, keycaps, labels, milestone, music, says, stops } from '../../data/room.ts';
import { person } from '../../data/site.ts';
import { mulberry32 } from '../../lib/photon/prng.ts';
import { play as sing, sound } from '../audio.ts';
import type { RoomApp } from '../main.ts';
import { ON_NIGHTSTAND } from '../objects/bed.ts';
import { capOf, keyAt } from '../objects/desk.ts';
import { pulled, seriesOn } from '../objects/library.ts';
import { MARKERS } from '../objects/walls.ts';
import { CONSOLES } from '../objects/tech.ts';
import { DOORS } from '../objects/wardrobe.ts';
import type { Switch } from '../scene.ts';
import { markFound } from '../ui/found.ts';
import { current, go, onRoute } from '../ui/route.ts';
import { showCalendar, showPicture } from '../ui/sheets.ts';
import { placement, type Placed } from '../voxel/geometry.ts';
import { codeScreen } from '../voxel/paint.ts';
import { easeOut, flutter, stepAt, trainAt, tumble, type Point } from './motion.ts';

/** A pointer that moved further than this between press and release was dragging. CSS pixels. */
const CLICK_SLOP = 5;
/** Seconds that what fell stays on the floor: what dropped off the whiteboard or out of a bookcase. */
const DROPPED = 5;
/** How bright a neon tube that has gone out still is, and the light of a console that is off. */
const OUT = 0.12;
/** How far a small object rises under the pointer, and up to which size an object counts as small. Metres. */
const LIFT = 0.025;
const SMALL = 0.45;
/** A key that carries a skill: how bright it is at rest, and how far it goes down under the pointer, in metres. */
const KEY = { rest: 0.55, depth: 0.003 };
/** A pair of quavers, in pixels: what a speaker shows over itself while it plays. */
const NOTE = '<svg viewBox="0 0 9 9" aria-hidden="true"><path d="M3 0h6v2H3zM3 2h1v5H3zM8 2h1v4H8zM1 6h3v3H1zM6 5h3v3H6z"/></svg>';


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

  /** An object counts as small when its largest side is: it is lifted under the pointer. Not the keyboard: its keys answer the pointer one by one. */
  const small = (name: string) => {
    if (name === 'keyboard') return false;
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

  /** A bubble over an object, for a moment: a few words, or a picture with the words that stand for it. Screen readers hear them. */
  const bubble = (name: string, content: string, seconds: number) => {
    const { at, model, voxel } = mesh(name).userData.placed as Placed;
    corner.set(at[0] + (model.sx * voxel) / 2, at[1] + model.sy * voxel, at[2] + (model.sz * voxel) / 2).project(app.rig.camera);
    const box = Object.assign(document.createElement('p'), { className: 'bubble', role: 'status', innerHTML: content });
    box.style.left = `${((corner.x + 1) / 2) * app.pipeline.grid.cssWidth}px`;
    box.style.top = `${((1 - corner.y) / 2) * app.pipeline.grid.cssHeight}px`;
    canvas.after(box);
    void wait(seconds).then(() => box.remove());
  };
  const say = (name: string, words: string) => bubble(name, words, 1.4);

  /** A speaker plays: it jumps to the beat, a music note over it for a few seconds. */
  const tune = (name: string) => () => {
    sing('riff');
    bubble(name, `${NOTE}<span class="visually-hidden">${music}</span>`, 2.5);
    return hop(name, 2, 0.025)();
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
  const buzz = () => {
    sing('buzz');
    return play([
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
  };

  /**
   * The warning light on the wardrobe: six strong orange flashes, two a
   * second. Slow enough to be safe for a light that fills the room.
   */
  const flash = () => {
    sing('alarm');
    const lit = (level: number) => () => room.setLevel('beacon', level);
    return play([...Array.from({ length: 6 }, (): [number, () => void][] => [[170, lit(1)], [330, lit(0)]]).flat(), [0, lit(0)]]);
  };

  /** The PC goes down, or comes back: its lights and its two screens fade in a few steps. */
  const power = () => {
    const on = room.levels.pc === 0;
    sing(on ? 'on' : 'off');
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
    markFound('cv');
    sing('print');
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
    sing('locked');
    say('nightstand', says.nightstand);
    return move(0.5, 10, (t) => {
      const step = Math.round(t * 10);
      const aside = step === 10 ? 0 : (step % 2 ? 1 : -1) * 0.0125;
      for (const name of ON_NIGHTSTAND) pose(name, 0, [aside, step > 2 && step < 6 ? 0.025 : 0, 0]);
    });
  };

  /**
   * A console is switched on: it gives a start, its light comes on for as
   * long as its sound lasts, and it plays that sound. With the sound of the
   * page off, it says so instead.
   */
  const boot = (name: string) => async () => {
    if (!sound.on) say(name, says.muted);
    const seconds = sing(name);
    room.setGlow(name, 1);
    await hop(name, 1, 0.025)();
    await wait(Math.max(0, seconds - 0.3));
    room.setGlow(name, OUT);
    app.invalidate();
  };
  for (const name of CONSOLES) room.setGlow(name, OUT);

  /** The dog jumps up twice, and barks. */
  const bark = () => {
    sing('bark');
    say('dog', says.dog);
    return hop('dog', 2, 0.075)();
  };


  /* The keys that carry a skill: the lights of each. Dim at rest; the one under the pointer goes down and lights up. */
  const caps = keycaps.map((_, index) => room.lights('keyboard', capOf(index)));
  let keyed = -1;
  const glow = (index: number, level: number) => {
    for (const light of caps[index]) room.setGlow('keyboard', level, light);
  };
  const key = (index: number) => {
    if (index === keyed) return;
    if (keyed >= 0) {
      glow(keyed, KEY.rest);
      room.press('keyboard', caps[keyed], 0);
    }
    if (index >= 0) {
      glow(index, 1);
      room.press('keyboard', caps[index], KEY.depth);
    }
    keyed = index;
    app.invalidate();
  };
  room.setGlow('keyboard', KEY.rest);

  /** The skill keys light up, a group after the other, then fall back. */
  const wave = () => {
    sing('keys');
    const groups = [...new Set(keycaps.map(({ group }) => group))];
    const light = (group?: string) => () => keycaps.forEach((cap, index) => glow(index, cap.group === group || index === keyed ? 1 : KEY.rest));
    return play([...groups.map((group): [number, () => void] => [260, light(group)]), [0, light()]]);
  };

  /**
   * What is on the whiteboard lets go: the magnetic brush, and one or two of
   * the markers, never the same. They drop past the cabinet to the floor,
   * turning over, lie there, then jump back to their place.
   */
  const drop = async () => {
    sing('drop');
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
  const visit = (name: string, then: (from: Spot) => unknown = () => undefined) => (from: Spot) => {
    go(STOP[name]);
    return then(from);
  };

  /* Where the chair waits, from its place at the desk, while the desktop of projects is open: on the rug, clear of the bed. */
  const ASIDE: Point = [-0.95, 0, 0.6];
  let aside = false;

  /** The chair rolls out of the way of the camera that faces the main screen, or back to the desk. */
  const clear = (away: boolean) => {
    if (away === aside || !running) return;
    aside = away;
    const grain = 0.0125;
    void move(0.5, 10, (t) => {
      const far = away ? easeOut(t) : 1 - easeOut(t);
      pose('chair', 0, [Math.round((ASIDE[0] * far) / grain) * grain, 0, Math.round((ASIDE[2] * far) / grain) * grain]);
    });
  };

  /** By day the window is no stop of the visit: it looks out on another city, and only names it. */
  const byDay = (name: string) => name === 'window' && !room.night;

  /** A knock on the door: it rattles in its frame. */
  const knock = () => {
    sing('knock');
    return move(0.3, 6, (t) => pose('door', 0, [0, 0, [0, 1, -1, 1, -1, 0, 0][Math.round(t * 6)] * 0.0125]));
  };

  const reactions: Record<string, (from: Spot) => unknown> = {
    chair: spin('chair'),
    dog: bark,
    figurines: hop('figurines'),
    gon: hop('gon', 1, 0.025),
    ichigo: hop('ichigo', 1, 0.025),
    gundam: hop('gundam', 2, 0.025),
    monitor: (from) => (room.levels.pc === 0 ? say('monitor', says.off) : visit('monitor')(from)), // the camera goes into it, unless the PC is off: see `clear` for the chair
    'monitor-side': crack('monitor-side', codeScreen, 8),
    keyboard: visit('keyboard', wave),
    mouse: circle('mouse'),
    'speaker-left': tune('speaker-left'),
    'speaker-right': tune('speaker-right'),
    dock: hop('dock', 1, 0.025),
    lamp: toggle('lamp'),
    nightstand: locked,
    book: visit('book', hop('book', 1, 0.025)),
    neon: buzz,
    pc: power,
    homelab: blink('homelab', 'cyan', 2),
    printer: print,
    cv: download,
    cabinet: doors('cabinet'),
    ...Object.fromEntries(CONSOLES.map((name) => [name, boot(name)])),
    wardrobe: doors('wardrobe'),
    ...Object.fromEntries(Object.keys(DOORS).map((door) => [door, () => swing(door)])),
    'table-number': hop('table-number', 2, 0.025),
    beacon: flash,
    'frame-bac': visit('frame-bac', enlarge('frame-bac')),
    'frame-prepa': visit('frame-prepa', hop('frame-prepa', 1, 0.025)),
    'frame-epita': visit('frame-epita', hop('frame-epita', 1, 0.025)),
    'frame-toeic': visit('frame-toeic', enlarge('frame-toeic')),
    door: visit('door', knock),
    passes: enlarge('passes'),
    formulas: enlarge('formulas'),
    pegboard: visit('pegboard'),
    badges: visit('badges', hop('badges', 1, 0.025)),
    bonsai: visit('bonsai', hop('bonsai', 2, 0.025)),
    gem: visit('gem', hop('gem', 1, 0.025)),
    clipboard: visit('clipboard', hop('clipboard', 1, 0.025)),
    window: (from) => (byDay('window') ? say('window', says.window) : visit('window')(from)),
    calendar: () => showCalendar(milestone.year),
    whiteboard: drop,
    eraser: drop,
    ...Object.fromEntries(MARKERS.map((color) => [`marker-${color}`, drop])),
    duo: hop('duo'),
    meteorite: visit('meteorite', hop('meteorite', 1, 0.025)),
    raspberry: hop('raspberry', 1, 0.025),
    daruma: rock('daruma'),
    'lucky-cat': hop('lucky-cat', 3, 0.025),
    car: roll('car', -0.025),
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

  onRoute((route, before) => {
    if (!route.stop !== !before.stop) sing(route.stop ? 'open' : 'close');
    clear(route.stop === STOP.monitor);
    /* The desktop opened another way than by its screen, from the menu or an address: the PC comes back on for it. */
    if (route.stop === STOP.monitor && room.levels.pc === 0) void power();
  });
  clear(current().stop === STOP.monitor);


  /* At rest the room is not quite still: now and then a drive light of the NAS goes out for an instant, and by night a train crosses the view from the window. Nothing of it while the desktop covers the room, nor for who asked for no motion. */
  const quiet = () => still.matches || document.hidden || current().stop === STOP.monitor;
  const drives = room.lights('homelab', 'cyan');
  const idle = window.setInterval(() => {
    if (quiet() || busy.has('homelab') || Math.random() < 0.4) return;
    const light = drives[Math.floor(Math.random() * drives.length)];
    room.setGlow('homelab', 0.08, light);
    app.invalidate();
    void wait(0.11).then(() => {
      if (!busy.has('homelab')) room.setGlow('homelab', 1, light);
      app.invalidate();
    });
  }, 900);
  let train: number | null | undefined;
  app.animate((now) => {
    if (!running || quiet() || !room.night) return running;
    const far = trainAt(now / 1000, room.trainRun);
    if (far !== train) {
      train = far;
      room.train(far);
      app.invalidate();
    }
    return true;
  });

  /* The display of the power supply counts the minutes the page has been open. */
  const uptime = window.setInterval(() => {
    const minutes = Math.floor(performance.now() / 60000);
    room.showUptime(`${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`);
    app.invalidate();
  }, 60000);

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

  /** The line of sight through a point of the canvas. */
  const sight = (at: Spot) => {
    const box = canvas.getBoundingClientRect();
    return app.ray(at.x + box.left, at.y + box.top);
  };

  /** The skill key under the pointer, by its place in `keycaps`. -1 for none. */
  const keyUnder = (name: string | null, at?: Spot) => {
    if (name !== 'keyboard' || !at) return -1;
    const { origin, direction } = sight(at);
    return keyAt(origin, direction);
  };

  /** What to call the thing under the pointer: a bookcase gives the title of the series whose spine is there, the keyboard the skill of the key, the window the city it shows by day. */
  const named = (name: string, at?: Spot): string | undefined => {
    if (name === 'keyboard') return keycaps[keyUnder(name, at)]?.name ?? labels[name];
    if (byDay(name)) return says.window;
    if (!at || GROUPS[name] !== 'library') return labels[name];
    const { origin, direction } = sight(at);
    return manga[seriesOn(name, origin, direction)]?.title ?? labels[name];
  };

  /** What the pointer is over, if it answers a click: outlined, named, and lifted if it is small. */
  const hover = (name: string | null, at?: Spot) => {
    if (name !== hovered) {
      const before = hovered;
      hovered = name;
      app.hover(name);
      canvas.style.cursor = name ? 'pointer' : '';
      for (const moved of [before, name]) {
        if (!moved || !small(moved)) continue;
        settle(moved);
        app.invalidate(true);
      }
    }
    key(keyUnder(name, at));
    const text = name ? named(name, at) : undefined;
    label.hidden = !text;
    label.textContent = text ?? '';
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
    clearInterval(uptime);
    clearInterval(idle);
    for (const texture of shattered.values()) texture.dispose();
  };
}
