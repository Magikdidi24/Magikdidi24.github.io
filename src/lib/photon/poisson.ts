/*
  Exact Poisson sampling. Knuth's multiplication method for small means, and
  Hormann's PTRS (transformed rejection with squeeze, 1993) for large ones,
  the same split that NumPy uses.
*/
import type { Rng } from './prng.ts';

const logFactorials: number[] = [0];

/** log(k!) from a cached table, Stirling's series past the table. */
export function logFactorial(k: number): number {
  if (k < 256) {
    for (let n = logFactorials.length; n <= k; n++) logFactorials.push(logFactorials[n - 1] + Math.log(n));
    return logFactorials[k];
  }
  const x = k + 1;
  return (x - 0.5) * Math.log(x) - x + 0.5 * Math.log(2 * Math.PI) + 1 / (12 * x) - 1 / (360 * x * x * x);
}

/** Knuth: multiply uniforms until the product drops below exp(-lambda). O(lambda). */
export function poissonKnuth(lambda: number, rng: Rng): number {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = rng();
  while (p > limit) {
    k++;
    p *= rng();
  }
  return k;
}

/** PTRS: constant expected cost, exact for lambda >= 10. */
export function poissonPTRS(lambda: number, rng: Rng): number {
  const slam = Math.sqrt(lambda);
  const loglam = Math.log(lambda);
  const b = 0.931 + 2.53 * slam;
  const a = -0.059 + 0.02483 * b;
  const logInvAlpha = Math.log(1.1239 + 1.1328 / (b - 3.4));
  const vr = 0.9277 - 3.6224 / (b - 2);
  for (;;) {
    const u = rng() - 0.5;
    const v = rng();
    const us = 0.5 - Math.abs(u);
    const k = Math.floor(((2 * a) / us + b) * u + lambda + 0.43);
    if (us >= 0.07 && v <= vr) return k;
    if (k < 0 || (us < 0.013 && v > us)) continue;
    if (Math.log(v) + logInvAlpha - Math.log(a / (us * us) + b) <= -lambda + k * loglam - logFactorial(k)) return k;
  }
}

export function poisson(lambda: number, rng: Rng): number {
  if (!(lambda > 0)) return 0;
  return lambda < 10 ? poissonKnuth(lambda, rng) : poissonPTRS(lambda, rng);
}
