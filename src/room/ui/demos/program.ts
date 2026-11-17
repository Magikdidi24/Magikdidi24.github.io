/*
  One of the small C programs, run in its window of the desktop of projects.
  The runner (runner.ts) keeps the program; this file is its host in the
  page: a canvas for its window, the keyboard, the mouse and a row of buttons
  for its keys, and the last lines it prints. It only runs while its window
  shows.
*/
import { createRunner, KEYS, type Host, type Runner } from './runner.ts';

/** How many lines of its terminal show, and how often a key repeats while its button is held, in milliseconds. */
const LINES = 4;
const REPEAT = 60;

const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;
/** The code SDL gives a key of the browser, if the programs can read it. */
const code = (key: string): number | null => KEYS[key] ?? (key.length === 1 ? key.toLowerCase().charCodeAt(0) : null);

/** Get the program of `root` ready. Returns what to call when its window shows again. */
export async function mount(root: HTMLElement): Promise<() => void> {
  const words: { run: string; again: string; ended: string } = JSON.parse(root.dataset.words!);
  const canvas = root.querySelector('canvas')!;
  const context = canvas.getContext('2d')!;
  const state = root.querySelector<HTMLElement>('.state')!;
  const terminal = root.querySelector<HTMLElement>('.terminal')!;
  const run = root.querySelector<HTMLButtonElement>('[data-run]')!;
  const module = await WebAssembly.compileStreaming(fetch(root.dataset.wasm!));

  let runner: Runner | null = null;
  /** The number of the run that is on: what an earlier one still waits for is dropped. */
  let current = 0;
  /** What takes the program up again, kept while its window is shut. */
  let parked: (() => void) | null = null;
  let printed = '';
  let stale = false;

  const host = (mine: number): Host => ({
    size(width, height) {
      canvas.width = width;
      canvas.height = height;
    },
    fill(x, y, width, height, color) {
      context.fillStyle = hex(color);
      context.fillRect(x, y, width, height);
    },
    text(x, y, text, color, size) {
      context.font = `${size}px sans-serif`;
      context.textBaseline = 'top';
      context.fillStyle = hex(color);
      context.fillText(text, x, y);
    },
    /* A program may print at every frame: the page is written once a frame at most. */
    print(text) {
      printed = (printed + text).split('\n').slice(-LINES - 1).join('\n');
      if (stale) return;
      stale = true;
      requestAnimationFrame(() => {
        stale = false;
        terminal.textContent = printed.trimEnd();
      });
    },
    now: () => Date.now() / 1000,
    wait(milliseconds, resume) {
      const back = () => {
        if (mine !== current) return;
        if (root.getClientRects().length > 0) resume();
        else parked = resume;
      };
      if (milliseconds > 0) setTimeout(back, milliseconds);
      else requestAnimationFrame(back);
    },
    ended() {
      if (mine !== current) return;
      runner = null;
      state.textContent = words.ended;
    },
  });

  run.addEventListener('click', async () => {
    const mine = ++current;
    [parked, printed] = [null, ''];
    terminal.textContent = state.textContent = '';
    run.textContent = words.again;
    runner = await createRunner(module, host(mine));
    canvas.focus({ preventScroll: true });
    runner.start();
  });

  canvas.addEventListener('keydown', (event) => {
    const key = code(event.key);
    if (key === null || !runner || event.ctrlKey || event.metaKey || event.altKey) return;
    runner.key(key);
    event.preventDefault(); // an arrow or the space bar would scroll the window
  });
  canvas.addEventListener('pointerdown', (event) => {
    const box = canvas.getBoundingClientRect();
    runner?.click(Math.floor(((event.clientX - box.left) / box.width) * canvas.width), Math.floor(((event.clientY - box.top) / box.height) * canvas.height));
  });

  /* A button stands for a key: held down it repeats, as a key does. */
  for (const button of root.querySelectorAll<HTMLButtonElement>('[data-key]')) {
    const key = code(button.dataset.key!)!;
    let held = 0;
    const release = () => clearInterval(held);
    button.addEventListener('pointerdown', () => {
      release();
      runner?.key(key);
      held = window.setInterval(() => runner?.key(key), REPEAT);
    });
    for (const end of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(end, release);
    button.addEventListener('click', (event) => event.detail === 0 && runner?.key(key)); // pressed from the keyboard
  }

  return () => {
    const resume = parked;
    parked = null;
    resume?.();
  };
}
