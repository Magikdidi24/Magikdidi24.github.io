/* Unique ids for label and output associations when a page renders several
   figures. Module state lives for the whole build, so ids never repeat. */
let count = 0;

export function uniqueId(prefix: string): string {
  count += 1;
  return `${prefix}-${count}`;
}
