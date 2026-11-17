/*
  The chess engine, off the thread of the page: its search takes about a
  second. The program is Samuel's Rust code compiled to WebAssembly
  (scripts/demos/chess/web.rs says what it exports). It is built for WASI,
  whose clock the engine reads to stop on time: of that interface it imports
  five functions, given here.
*/

interface Engine {
  memory: WebAssembly.Memory;
  new_game(): void;
  piece(square: number): number;
  turn(): number;
  targets(from: number): bigint;
  promotes(from: number, to: number): number;
  play(from: number, to: number, promotion: number): number;
  think(milliseconds: number, maxDepth: number): number;
  status(): number;
  in_check(): number;
  last_move(): number;
  search_depth(): number;
  search_nodes(): number;
}

/** What the page asks. `think` lets the engine play, for at most `ms` milliseconds. */
export type Ask =
  | { call: 'load'; wasm: string }
  | { call: 'new' }
  | { call: 'targets'; from: number }
  | { call: 'play'; from: number; to: number; promotion: number }
  | { call: 'think'; ms: number };

/** The game after each answer: the piece on each square, whose turn it is (0 white, 1 black), how it stands, and what the engine last searched. */
export interface Position {
  squares: number[];
  turn: number;
  status: number;
  check: boolean;
  last: [number, number] | null;
  depth: number;
  nodes: number;
}

export interface Answer {
  position?: Position;
  /** For `targets`: where the piece may go, and which of those squares promote it. */
  targets?: { to: number; promotes: boolean }[];
  /** The program could not start. */
  failed?: boolean;
}

let engine: Engine;

async function load(url: string): Promise<void> {
  const view = () => new DataView(engine.memory.buffer);
  const wasi = {
    clock_time_get(_clock: number, _precision: bigint, out: number) {
      view().setBigUint64(out, BigInt(Math.round(performance.now() * 1e6)), true);
      return 0;
    },
    environ_sizes_get(count: number, size: number) {
      view().setUint32(count, 0, true);
      view().setUint32(size, 0, true);
      return 0;
    },
    environ_get: () => 0,
    /* What the program would print is dropped, and reported as written. */
    fd_write(_file: number, buffers: number, count: number, written: number) {
      let total = 0;
      for (let i = 0; i < count; i++) total += view().getUint32(buffers + 8 * i + 4, true);
      view().setUint32(written, total, true);
      return 0;
    },
    proc_exit(code: number) {
      throw new Error(`the engine stopped (${code})`);
    },
  };
  const { instance } = await WebAssembly.instantiateStreaming(fetch(url), { wasi_snapshot_preview1: wasi });
  engine = instance.exports as unknown as Engine;
  engine.new_game();
}

function position(): Position {
  const last = engine.last_move();
  return {
    squares: Array.from({ length: 64 }, (_, square) => engine.piece(square)),
    turn: engine.turn(),
    status: engine.status(),
    check: engine.in_check() === 1,
    last: last < 0 ? null : [last >> 6, last & 63],
    depth: engine.search_depth(),
    nodes: engine.search_nodes(),
  };
}

addEventListener('message', async ({ data }: MessageEvent<Ask & { id: number }>) => {
  const answer: Answer = {};
  try {
    if (data.call === 'load') await load(data.wasm);
    else if (data.call === 'new') engine.new_game();
    else if (data.call === 'play') engine.play(data.from, data.to, data.promotion);
    else if (data.call === 'think') engine.think(data.ms, 64);
    else if (data.call === 'targets') {
      const bits = engine.targets(data.from);
      answer.targets = Array.from({ length: 64 }, (_, to) => to)
        .filter((to) => (bits >> BigInt(to)) & 1n)
        .map((to) => ({ to, promotes: engine.promotes(data.from, to) === 1 }));
    }
    answer.position = position();
  } catch {
    answer.failed = true;
  }
  postMessage({ id: data.id, ...answer });
});
