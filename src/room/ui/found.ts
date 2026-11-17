/*
  What the visitor has found in the room so far. The desktop of the main
  screen keeps the rest locked, and ticks it off its list of things to do.
  The browser remembers it, so a later visit starts where this one ended.
  `parse` is pure and runs under `node --test` (tests/found.test.mjs).
*/
import { finds } from '../../data/room.ts';

const KEY = 'room-found';
const KNOWN = finds.map(({ id }) => id);

/** What was stored, as ids the room still has, in its order. Anything else than a list of them is nothing. */
export function parse(stored: string | null, known: readonly string[]): string[] {
  try {
    const ids: unknown = JSON.parse(stored ?? '[]');
    return Array.isArray(ids) ? known.filter((id) => ids.includes(id)) : [];
  } catch {
    return [];
  }
}

type Listener = (found: ReadonlySet<string>) => void;

const listeners = new Set<Listener>();
let found: Set<string> | undefined;

/* Storage can be closed to the page: what is found is then for this visit only. */
function all(): Set<string> {
  if (found) return found;
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(KEY);
  } catch {
    /* Nothing remembered, then. */
  }
  return (found = new Set(parse(stored, KNOWN)));
}

/** Something of the room has been found: a stop of the visit by its id, or the calendar. */
export function markFound(id: string): void {
  if (!KNOWN.includes(id) || all().has(id)) return;
  all().add(id);
  try {
    localStorage.setItem(KEY, JSON.stringify([...all()]));
  } catch {
    /* Not remembered, then. */
  }
  for (const listener of listeners) listener(all());
}

/** Call `listener` with what has been found, now and each time something more is. */
export function onFound(listener: Listener): void {
  listeners.add(listener);
  listener(all());
}
