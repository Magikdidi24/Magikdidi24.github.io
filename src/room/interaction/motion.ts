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

/** How something light comes down: how far it swings from its path, in metres, how many times, and along which horizontal direction (x, z). */
export interface Swing {
  reach: number;
  swings: number;
  along: readonly [number, number];
}

/**
 * Where a petal or a sheet of paper is on its way down, t from 0 to 1. It
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
