/*
  The hash of the room page says which panel is open: it is the one source of
  truth. `#education` opens a panel; the id of a window, such as the slug of
  a project, opens the desktop of projects with that window. `parse` is pure
  and runs under `node --test` (tests/route.test.mjs); the rest follows the
  history of the browser.
*/

export interface Route {
  /** The id of the open panel. */
  stop: string | null;
  /** The id of the open window, inside the desktop of projects. */
  item: string | null;
}

/** The panel that holds the windows. */
const DESKTOP = 'projects';

export function parse(hash: string, stops: readonly string[], items: readonly string[]): Route {
  const id = hash.replace(/^#/, '');
  if (stops.includes(id)) return { stop: id, item: null };
  if (items.includes(id)) return { stop: DESKTOP, item: id };
  return { stop: null, item: null };
}

type Listener = (route: Route, before: Route) => void;

const listeners = new Set<Listener>();
let ids: { stops: string[]; items: string[] } = { stops: [], items: [] };
let route: Route = { stop: null, item: null };

/** Read the hash again and tell who listens, if it opens something else. */
function tell(): void {
  const before = route;
  route = parse(location.hash, ids.stops, ids.items);
  if (route.stop !== before.stop || route.item !== before.item) for (const listener of listeners) listener(route, before);
}

/** Start following the hash, given the ids of the panels and of the windows. Returns what it opens now. */
export function follow(stops: string[], items: string[]): Route {
  ids = { stops, items };
  route = parse(location.hash, stops, items);
  addEventListener('popstate', tell);
  addEventListener('hashchange', tell);
  return route;
}

export function onRoute(listener: Listener): void {
  listeners.add(listener);
}

export const current = (): Route => route;

/**
 * Open a panel or a window by its id, or close what is open with null.
 * Opening from the room adds one step to the history of the browser, so its
 * back button closes the panel like a dialog; what opens after that, a
 * window or another panel, takes the place of that step. Closing goes back
 * that step when it is ours, and clears the hash otherwise: on a page opened
 * straight on a panel, going back would leave the site.
 */
export function go(id: string | null): void {
  if (id === null) {
    if (history.state?.room) return history.back(); // the browser tells us when it is done
    history.replaceState(null, '', location.pathname + location.search);
  } else if (route.stop === null) {
    history.pushState({ room: true }, '', `#${id}`);
  } else {
    history.replaceState(history.state, '', `#${id}`);
  }
  tell();
}
