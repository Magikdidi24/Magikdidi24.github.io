/*
  The panels of the room page, on the side of the page: which one shows, the
  windows of the desktop of projects, the terminal, and the keyboard. The
  hash decides (route.ts); this file only follows it. It needs no 3D: the
  panels open before the room is drawn, and without it.
*/
import { desktop, enlarged, finds, milestone } from '../../data/room.ts';
import { markFound, onFound } from './found.ts';
import { current, follow, go, onRoute, type Route } from './route.ts';
import { showCalendar, showPicture } from './sheets.ts';
import { run, type World } from './terminal.ts';

export interface Panels {
  /** What the open panel takes of the viewport, in CSS pixels: of its right side for a column, of its foot for a sheet. Nothing for one that covers it all. */
  cover(): { right: number; bottom: number };
}

export function setupPanels(root: HTMLElement): Panels {
  const panels = [...root.querySelectorAll<HTMLElement>('.panel')];
  const windows = [...root.querySelectorAll<HTMLElement>('.window')];
  const open = () => panels.find((panel) => panel.id === current().stop);
  /** What had the keyboard before a panel opened: it gets it back. */
  let opener: HTMLElement | null = null;

  const show = (route: Route, before?: Route) => {
    for (const panel of panels) panel.toggleAttribute('data-open', panel.id === route.stop);
    for (const pane of windows) pane.hidden = pane.dataset.item !== route.item;
    /* A window covers the desktop from its top, wherever the desktop had been scrolled to. */
    const desk = panels.find((panel) => panel.id === route.stop && route.item);
    if (desk) desk.scrollTop = 0;
    if (route.stop) markFound(route.stop);
    if (route.stop && !before?.stop) {
      /* A link of the menu is gone once the menu shuts: its button stands for it. */
      const active = document.activeElement as HTMLElement | null;
      opener = active?.closest('details')?.querySelector('summary') ?? active;
    }
    const shown = windows.find((pane) => !pane.hidden) ?? open();
    if (shown) {
      (shown.querySelector<HTMLElement>('input') ?? shown).focus({ preventScroll: true });
    } else if (before?.stop) {
      opener?.focus({ preventScroll: true });
      opener = null;
    }
  };

  root.classList.add('routed'); // from now on the hash is read here, not by the style sheet
  show(follow(panels.map((panel) => panel.id), windows.map((pane) => pane.dataset.item!)));
  onRoute(show);

  /* What the desktop lists of the room stays locked until it has been found there, and its list of things to do ticks it off. */
  const places = [...root.querySelectorAll<HTMLElement>('[data-find]')];
  const tasks = [...root.querySelectorAll<HTMLInputElement>('[data-task]')];
  const todo = root.querySelector<HTMLDetailsElement>('.todo');
  const count = root.querySelector<HTMLElement>('.todo .count');
  const hint = root.querySelector<HTMLElement>('.places .hint');
  /* On a narrow screen the list comes before the icons: folded, so that it does not push them out of sight. */
  if (todo) todo.open = matchMedia('(min-width: 64rem)').matches;
  onFound((found) => {
    for (const place of places) {
      const locked = !found.has(place.dataset.find!);
      place.toggleAttribute('data-locked', locked);
      place.setAttribute('aria-disabled', String(locked));
      if (!locked) place.removeAttribute('data-asked');
    }
    for (const task of tasks) task.checked = found.has(task.dataset.task!);
    if (count) count.textContent = desktop.count.replace('{found}', String(found.size)).replace('{all}', String(finds.length));
    if (hint) hint.textContent = '';
  });

  root.addEventListener('click', (event) => {
    const target = event.target as Element;
    const picture = target.closest<HTMLAnchorElement>('a[data-enlarge]');
    const link = target.closest<HTMLAnchorElement>('a[href^="#"]');
    const locked = target.closest<HTMLElement>('[data-locked]');
    if (target.closest('[data-close]')) {
      go(null);
    } else if (locked) {
      /* It says what to do in the room to open it: under its name, and aloud. */
      event.preventDefault();
      for (const place of places) place.toggleAttribute('data-asked', place === locked);
      if (hint) hint.textContent = `${desktop.locked} ${finds.find(({ id }) => id === locked.dataset.find)!.task}.`;
    } else if (target.closest('[data-calendar]')) {
      showCalendar(milestone.year);
    } else if (picture) {
      event.preventDefault();
      showPicture(picture.href, enlarged[picture.dataset.enlarge as keyof typeof enlarged].caption, { x: event.clientX, y: event.clientY });
    } else if (link) {
      event.preventDefault();
      go(link.hash.slice(1));
    }
  });

  /* Escape closes the window, then the panel. A sheet open over them closes itself first. */
  addEventListener('keydown', (event) => {
    const { stop, item } = current();
    if (event.key !== 'Escape' || !stop || root.querySelector('dialog[open]')) return;
    go(item ? stop : null);
  });

  const shell = root.querySelector<HTMLElement>('.shell');
  if (shell) {
    const log = shell.querySelector<HTMLElement>('.log')!;
    const input = shell.querySelector<HTMLInputElement>('input')!;
    const world: World = {
      projects: windows.filter((pane) => pane.dataset.name).map((pane) => ({ slug: pane.dataset.item!, name: pane.dataset.name! })),
      about: JSON.parse(shell.dataset.about!),
      cv: shell.dataset.cv || null,
      email: shell.dataset.email!,
      words: JSON.parse(shell.dataset.words!),
    };
    const print = (line: string) => log.append(Object.assign(document.createElement('p'), { textContent: line }));
    shell.querySelector('form')!.addEventListener('submit', (event) => {
      event.preventDefault();
      const result = run(input.value, world);
      if (result.clear) log.replaceChildren();
      else [`$ ${input.value}`, ...result.out].forEach(print);
      input.value = '';
      log.scrollTop = log.scrollHeight;
      if (result.download) Object.assign(document.createElement('a'), { href: result.download, download: '' }).click();
      if (result.go) go(result.go);
    });
  }

  return {
    cover() {
      const box = open()?.getBoundingClientRect();
      if (!box) return { right: 0, bottom: 0 };
      const wide = box.width >= innerWidth * 0.9;
      const tall = box.height >= innerHeight * 0.7;
      if (wide && tall) return { right: 0, bottom: 0 };
      return wide ? { right: 0, bottom: box.height } : { right: box.width, bottom: 0 };
    },
  };
}
