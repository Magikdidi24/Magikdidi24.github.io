/*
  The liquid simulator, played in its window of the desktop of projects. The
  program is Samuel's C code compiled to WebAssembly (scripts/demos): the
  simulation and its drawing run as they are. It draws through four SDL
  functions, which this file implements on a canvas, and this file stands
  for the mouse and the keys that its main() read.
*/

/** What the program exports (scripts/demos/fluid/web.c). */
interface Program {
  memory: WebAssembly.Memory;
  reset(): void;
  paint(x: number, y: number, liquid: number): void;
  erase(x: number, y: number): void;
  frame(pressure: number): void;
  width(): number;
  height(): number;
  cell(): number;
  count(): number;
  color(liquid: number): number;
}

/** The keys of the original: the wall, then each liquid in the order of the program. */
const WALL = -1;
const KEYS = [' ', 'w', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'];

const hex = (rgb: number) => `#${rgb.toString(16).padStart(6, '0')}`;

/** Start the simulator in `root`. Returns what to call when its window shows again: it only runs while it is seen. */
export async function mount(root: HTMLElement): Promise<() => void> {
  const canvas = root.querySelector('canvas')!;
  const context = canvas.getContext('2d')!;
  const tools = [...root.querySelectorAll<HTMLButtonElement>('[data-liquid]')];
  const eraser = root.querySelector<HTMLButtonElement>('[data-eraser]')!;
  const pressure = root.querySelector<HTMLButtonElement>('[data-pressure]')!;

  /* SDL, as far as the program uses it: a colour, then rectangles and lines in that colour. */
  let memory: WebAssembly.Memory;
  const sdl = {
    SDL_SetRenderDrawColor(_renderer: number, r: number, g: number, b: number) {
      context.fillStyle = `rgb(${r} ${g} ${b})`;
      return 1;
    },
    SDL_RenderFillRect(_renderer: number, rect: number) {
      const [x, y, w, h] = new Float32Array(memory.buffer, rect, 4);
      context.fillRect(x, y, w, h);
      return 1;
    },
    /* Its lines are those of the grid: upright or level, one pixel thick. */
    SDL_RenderLine(_renderer: number, x1: number, y1: number, x2: number, y2: number) {
      context.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1) || 1, Math.abs(y2 - y1) || 1);
      return 1;
    },
    SDL_RenderClear() {
      context.fillRect(0, 0, canvas.width, canvas.height);
      return 1;
    },
  };
  const { instance } = await WebAssembly.instantiateStreaming(fetch(root.dataset.wasm!), { env: sdl });
  const program = instance.exports as unknown as Program;
  memory = program.memory;
  canvas.width = program.width();
  canvas.height = program.height();
  program.reset();
  for (const tool of tools) tool.style.setProperty('--swatch', hex(program.color(Number(tool.dataset.liquid))));

  let liquid = 0;
  let erasing = false;
  const choose = (next: number, erase = false) => {
    [liquid, erasing] = [next, erase];
    for (const tool of tools) tool.setAttribute('aria-pressed', String(!erase && Number(tool.dataset.liquid) === next));
    eraser.setAttribute('aria-pressed', String(erase));
  };
  for (const tool of tools) tool.addEventListener('click', () => choose(Number(tool.dataset.liquid)));
  eraser.addEventListener('click', () => choose(liquid, !erasing));
  const toggle = () => pressure.setAttribute('aria-pressed', String(pressure.getAttribute('aria-pressed') !== 'true'));
  pressure.addEventListener('click', toggle);
  root.querySelector('[data-empty]')!.addEventListener('click', () => program.reset());

  /* The mouse of main(): the left button draws, the right one erases. Here every cell between two positions of the pointer is drawn, so a fast stroke leaves no gap. */
  let last: [number, number] | null = null;
  const cellAt = (event: PointerEvent): [number, number] => {
    const box = canvas.getBoundingClientRect();
    return [Math.floor((((event.clientX - box.left) / box.width) * canvas.width) / program.cell()), Math.floor((((event.clientY - box.top) / box.height) * canvas.height) / program.cell())];
  };
  const draw = (event: PointerEvent) => {
    if (!(event.buttons & 3)) return void (last = null);
    const to = cellAt(event);
    const from = last ?? to;
    const steps = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]), 1);
    for (let k = 0; k <= steps; k++) {
      const [x, y] = [Math.round(from[0] + ((to[0] - from[0]) * k) / steps), Math.round(from[1] + ((to[1] - from[1]) * k) / steps)];
      if (erasing || event.buttons & 2) program.erase(x, y);
      else program.paint(x, y, liquid);
    }
    last = to;
  };
  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    last = null;
    draw(event);
  });
  canvas.addEventListener('pointermove', draw);
  canvas.addEventListener('pointerup', () => (last = null));
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  canvas.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'p') toggle();
    else if (KEYS.includes(key)) choose(KEYS.indexOf(key) + WALL);
    else return;
    event.preventDefault(); // the space bar would scroll the window
  });

  /* The loop of main(): a turn of the simulation and a picture at every frame, for as long as the window shows. */
  let running = false;
  const turn = () => {
    running = root.getClientRects().length > 0;
    if (!running) return;
    program.frame(pressure.getAttribute('aria-pressed') === 'true' ? 1 : 0);
    requestAnimationFrame(turn);
  };
  const wake = () => {
    if (!running) turn();
  };
  wake();
  return wake;
}
