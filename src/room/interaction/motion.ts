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

/**
 * Where a falling leaf is, t from 0 to 1: it drifts from its branch to its
 * spot on the floor, drops faster and faster, and sways up to `sway` metres
 * to either side on the way.
 */
export function fall(from: Point, to: Point, t: number, sway: number): Point {
  const mix = (a: number, b: number, k: number) => a * (1 - k) + b * k;
  const side = Math.sin(t * Math.PI * 3) * sway * (1 - t);
  return [mix(from[0], to[0], t) + side, mix(from[1], to[1], t * t), mix(from[2], to[2], t)];
}
