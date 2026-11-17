/*
  Runs one of the small C programs (scripts/demos/sdl2). The program is its C
  source as it is, main() and loop included. It draws, prints, reads the
  clock and waits through a `Host`. This file keeps its queue of events, puts
  it aside when it sleeps, or when it asks for events twice without sleeping,
  and takes it up again where it was: the build passed it through Binaryen's
  Asyncify for that. No DOM here: the page and the tests each bring a host.
*/

export interface Host {
  /** The program opened its window: the size of its picture, in pixels. */
  size(width: number, height: number): void;
  /** A rectangle in one colour, 0xRRGGBB. */
  fill(x: number, y: number, width: number, height: number, color: number): void;
  /** A line of text, its top left corner at (x, y), `size` pixels high. */
  text(x: number, y: number, text: string, color: number, size: number): void;
  /** What the program writes to its terminal. */
  print(text: string): void;
  /** The time, in seconds since 1970. */
  now(): number;
  /** The program sleeps: call `resume` in `milliseconds`. When that is 0 it only gives up its turn. */
  wait(milliseconds: number, resume: () => void): void;
  /** main() returned, or the program called exit(). */
  ended(code: number): void;
}

export interface Runner {
  /** Call main(). */
  start(): void;
  /** A key goes down: one of KEYS, or the code of a character. */
  key(code: number): void;
  /** A mouse button goes down at a pixel of the picture. */
  click(x: number, y: number): void;
}

/** The keys the programs read that are not a character, by their name in the browser, with the code SDL gives them. */
export const KEYS: Record<string, number> = { ' ': 32, ArrowRight: 0x4000004f, ArrowLeft: 0x40000050, ArrowDown: 0x40000051, ArrowUp: 0x40000052 };

/* The events of SDL that the programs look at, and the states of Asyncify. */
const KEY_DOWN = 0x300;
const MOUSE_DOWN = 0x401;
const UNWINDING = 1;
const REWINDING = 2;

/** What the program exports (scripts/demos/sdl2/web.c), with what Asyncify adds. */
interface Program {
  memory: WebAssembly.Memory;
  run(): number;
  aside(): number;
  asyncify_get_state(): number;
  asyncify_start_unwind(room: number): void;
  asyncify_stop_unwind(): void;
  asyncify_start_rewind(room: number): void;
  asyncify_stop_rewind(): void;
}

/** What exit() throws, to leave the program from wherever it is. */
class Exit {
  code: number;
  constructor(code: number) {
    this.code = code;
  }
}

export async function createRunner(module: WebAssembly.Module, host: Host): Promise<Runner> {
  const queue: [number, number, number][] = [];
  /** Where the program is kept while it is aside, and how long it asked for. */
  let room = 0;
  let wait = 0;
  /** Its last look at the queue found nothing, and it has not slept since. */
  let idle = false;
  let program!: Program;
  const read = (at: number, length: number) => new TextDecoder().decode(new Uint8Array(program.memory.buffer, at, length));

  /**
   * Put the program aside: it unwinds back to run(). The call that asked for
   * it is made again as the program is taken up; that time it returns true
   * and the program goes on.
   */
  const aside = (milliseconds: number): boolean => {
    if (program.asyncify_get_state() === REWINDING) {
      program.asyncify_stop_rewind();
      return true;
    }
    wait = milliseconds;
    room = program.aside();
    program.asyncify_start_unwind(room);
    return false;
  };

  const env = {
    size: (width: number, height: number) => host.size(width, height),
    fill: (x: number, y: number, width: number, height: number, color: number) => host.fill(x, y, width, height, color & 0xffffff),
    text: (x: number, y: number, at: number, length: number, color: number, size: number) => host.text(x, y, read(at, length), color, size),
    print: (at: number, length: number) => host.print(read(at, length)),
    now: () => host.now(),
    cos: Math.cos,
    sin: Math.sin,
    exit(code: number) {
      throw new Exit(code);
    },
    sleep(milliseconds: number) {
      if (aside(milliseconds)) idle = false;
    },
    /* A loop that looks for events again without having slept would never let the page in: it is given a turn first, then looks. */
    poll(event: number) {
      const back = program.asyncify_get_state() === REWINDING;
      if (back) {
        program.asyncify_stop_rewind();
      } else if (queue.length === 0 && idle) {
        aside(0);
        return 0;
      }
      const next = queue.shift();
      idle = !next;
      if (next) new Int32Array(program.memory.buffer, event, 3).set(next);
      return next ? 1 : 0;
    },
  };
  program = (await WebAssembly.instantiate(module, { env })).exports as unknown as Program;

  /** Let the program run until it is put aside or ends. */
  const turn = () => {
    let code: number;
    try {
      code = program.run();
    } catch (thrown) {
      if (!(thrown instanceof Exit)) throw thrown;
      return host.ended(thrown.code);
    }
    if (program.asyncify_get_state() !== UNWINDING) return host.ended(code);
    program.asyncify_stop_unwind();
    host.wait(wait, () => {
      program.asyncify_start_rewind(room);
      turn();
    });
  };

  return {
    start: turn,
    key: (code) => void queue.push([KEY_DOWN, code, 0]),
    click: (x, y) => void queue.push([MOUSE_DOWN, x, y]),
  };
}
