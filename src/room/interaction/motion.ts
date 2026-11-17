/*
  The maths of what moves in the room. Movements advance in steps, a few per
  second, so that nothing drifts between two pixels. Pure functions, no
  three.js and no DOM: they run under `node --test` (tests/motion.test.mjs).
*/

export type Point = [number, number, number];

/** The step a movement of `seconds` has reached after `elapsed` seconds, from 0 to `count`. */
export function stepAt(elapsed: number, seconds: number, count: number): number {
  return Math.min(count, Math.max(0, Math.floor((elapsed / seconds) * count)));
}

/** From 0 to 1, fast then slow: something pushed that comes to rest. */
export const easeOut = (t: number): number => 1 - (1 - t) ** 3;

/** From 0 to 1, slow, fast, then slow: the camera on its way round the room. */
export const easeInOut = (t: number): number => (t < 0.5 ? 4 * t ** 3 : 1 - (2 - 2 * t) ** 3 / 2);

/** How something light comes down: how far it swings from its path, in metres, how many times, and along which horizontal direction (x, z). */
export interface Swing {
  reach: number;
  swings: number;
  along: readonly [number, number];
}

/**
 * Where a sheet of paper is on its way down, t from 0 to 1. It
 * does not drop straight: it glides to one side, stalls and is held up for an
 * instant, then glides back, as a dead leaf does. The swings die down and it
 * comes to rest flat on its spot. `lean` is how far it tilts into its glide,
 * from -1 to 1.
 */
export function flutter(from: Point, to: Point, t: number, { reach, swings, along }: Swing): { at: Point; lean: number } {
  const mix = (a: number, b: number) => a * (1 - t) + b * t;
  const phase = t * swings * 2 * Math.PI;
  const calm = 1 - t;
  const side = Math.sin(phase) * reach * calm;
  const held = Math.sin(phase) ** 2 * reach * 0.4 * calm * Math.min(1, 3 * t); // nothing holds it up as it is let go
  return {
    at: [mix(from[0], to[0]) + side * along[0], mix(from[1], to[1]) + held, mix(from[2], to[2]) + side * along[1]],
    lean: Math.cos(phase) * calm || 0,
  };
}

/** The share of the way after which something that tumbles hits the ground, and how high it then bounces, as a share of its drop. */
const LANDS = 0.75;
const BOUNCE = 0.08;

/**
 * Where something heavy that slips off is, t from 0 to 1: the brush of the
 * whiteboard, a marker. It leaves level, drops faster and faster, hits the
 * ground short of its spot, then bounces once, low, to it.
 */
export function tumble(from: Point, to: Point, t: number): Point {
  const far = t < LANDS ? (t / LANDS) * 0.8 : 0.8 + ((t - LANDS) / (1 - LANDS)) * 0.2; // share of the way across
  const drop = from[1] - to[1];
  const height = t < LANDS ? drop * (1 - (t / LANDS) ** 2) : drop * BOUNCE * Math.sin(((t - LANDS) / (1 - LANDS)) * Math.PI);
  return [from[0] + (to[0] - from[0]) * far, to[1] + height, from[2] + (to[2] - from[2]) * far];
}

/** The train of the night view: one every so many seconds, so many pixels a second, in steps of so many pixels. */
const TRAIN = { every: 24, speed: 24, step: 2 };

/**
 * How far the train has come along its viaduct, in pixels of the view,
 * `seconds` after the page opened: 0 as its nose shows, `run` when its tail
 * has gone. Null between two trains.
 */
export function trainAt(seconds: number, run: number): number | null {
  const far = Math.floor(((seconds % TRAIN.every) * TRAIN.speed) / TRAIN.step) * TRAIN.step;
  return far <= run ? far : null;
}
