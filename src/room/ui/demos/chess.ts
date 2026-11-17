/*
  The chess engine, played in its window of the desktop of projects. The page
  draws the board; the engine, in its worker, knows the rules and searches
  (chess.worker.ts). The visitor plays White, the engine answers.
*/
import { PALETTE } from '../../voxel/palette.ts';
import type { Answer, Ask, Position } from './chess.worker.ts';

/** How long the engine may think, in milliseconds: about a second, as in the original. */
const THINK = 1000;

/* The pieces, 10 pixels by 10, in the order of the numbers of the engine: king, queen, rook, bishop, knight, pawn. */
const SHAPES = [
  ['....##....', '...####...', '....##....', '.###..###.', '.########.', '.########.', '..######..', '..######..', '..######..', '.########.'],
  ['.#..##..#.', '.#..##..#.', '.##.##.##.', '.########.', '..######..', '..######..', '...####...', '..######..', '..######..', '.########.'],
  ['..........', '.##.##.##.', '.########.', '..######..', '..######..', '..######..', '..######..', '..######..', '.########.', '.########.'],
  ['....##....', '...####...', '...#.##...', '...####...', '....##....', '...####...', '...####...', '....##....', '..######..', '.########.'],
  ['..........', '...###....', '..#####...', '.#######..', '.###.###..', '..#..###..', '....####..', '...#####..', '..######..', '.########.'],
  ['..........', '....##....', '...####...', '...####...', '....##....', '...####...', '....##....', '...####...', '..######..', '.########.'],
];

/** A piece as a picture, 12 pixels by 12: its shape in the colour of its side, with a dark line around it. */
function sprite(shape: string[], black: boolean): string {
  const canvas = Object.assign(document.createElement('canvas'), { width: 12, height: 12 });
  const context = canvas.getContext('2d')!;
  const filled = (x: number, y: number) => shape[y]?.[x] === '#';
  for (let y = -1; y <= 10; y++) {
    for (let x = -1; x <= 10; x++) {
      const edge = !filled(x, y) && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1));
      if (!filled(x, y) && !edge) continue;
      context.fillStyle = edge ? PALETTE.ink : black ? PALETTE.steel : PALETTE.paper;
      context.fillRect(x + 1, y + 1, 1, 1);
    }
  }
  return `url(${canvas.toDataURL()})`;
}

/** What the page says, from the data of the room. */
interface Words {
  loading: string;
  failed: string;
  yourMove: string;
  thinking: string;
  check: string;
  searched: string;
  empty: string;
  colours: string[];
  pieces: string[];
  results: Record<string, string>;
}

/** Start a game in `root`. Returns what to call when its window shows again: nothing to do, the game waits. */
export async function mount(root: HTMLElement): Promise<() => void> {
  const words: Words = JSON.parse(root.dataset.words!);
  const squares = [...root.querySelectorAll<HTMLButtonElement>('.square')];
  const state = root.querySelector<HTMLElement>('.state')!;
  const searched = root.querySelector<HTMLElement>('.search')!;
  const promotion = root.querySelector<HTMLElement>('.promotion')!;
  const sprites = [false, true].map((black) => SHAPES.map((shape) => sprite(shape, black)));

  const worker = new Worker(new URL('./chess.worker.ts', import.meta.url), { type: 'module' });
  let asked = 0;
  const waiting = new Map<number, (answer: Answer) => void>();
  worker.addEventListener('message', ({ data }: MessageEvent<Answer & { id: number }>) => {
    waiting.get(data.id)?.(data);
    waiting.delete(data.id);
  });
  const ask = (question: Ask) =>
    new Promise<Answer>((answer) => {
      waiting.set(++asked, answer);
      worker.postMessage({ id: asked, ...question });
    });

  let position: Position | null = null;
  let thinking = false;
  /** The piece in hand, where it may go, and the move that waits for the piece a pawn becomes. */
  let held: number | null = null;
  let targets: { to: number; promotes: boolean }[] = [];
  let pending: { from: number; to: number } | null = null;

  const show = (answer: Answer) => {
    if (answer.failed || !answer.position) return void (state.textContent = words.failed);
    position = answer.position;
    const { squares: pieces, turn, status, check, last, depth, nodes } = position;
    squares.forEach((square, i) => {
      const piece = pieces[i];
      square.style.backgroundImage = piece ? sprites[piece >> 3][(piece & 7) - 1] : '';
      square.setAttribute('aria-label', `${square.dataset.name}: ${piece ? `${words.colours[piece >> 3]} ${words.pieces[(piece & 7) - 1]}` : words.empty}`);
      square.classList.toggle('last', !!last?.includes(i));
      square.classList.toggle('held', i === held);
      square.classList.toggle('target', targets.some(({ to }) => to === i));
    });
    promotion.hidden = !pending;
    if (status === 1) state.textContent = words.results[turn === 0 ? 'mated' : 'mates'];
    else if (status > 1) state.textContent = words.results[status];
    else state.textContent = thinking ? words.thinking : `${check ? `${words.check} ` : ''}${words.yourMove}`;
    searched.textContent = depth ? words.searched.replace('{depth}', String(depth)).replace('{positions}', nodes.toLocaleString('en')) : '';
  };

  const drop = () => {
    [held, targets, pending] = [null, [], null];
  };

  /** The visitor's move, then the engine's answer. */
  const play = async (from: number, to: number, piece: number) => {
    drop();
    show(await ask({ call: 'play', from, to, promotion: piece }));
    if (position?.status !== 0 || position.turn !== 1) return;
    thinking = true;
    show({ position });
    const answer = await ask({ call: 'think', ms: THINK });
    thinking = false;
    show(answer);
  };

  squares.forEach((square, i) => {
    square.addEventListener('click', async () => {
      if (!position || thinking || position.status !== 0 || position.turn !== 0) return;
      const target = targets.find(({ to }) => to === i);
      if (held !== null && target) {
        if (!target.promotes) return void play(held, i, 0);
        pending = { from: held, to: i };
      } else if (position.squares[i] && position.squares[i] < 8 && i !== held) {
        [held, pending] = [i, null];
        targets = (await ask({ call: 'targets', from: i })).targets ?? [];
      } else {
        drop();
      }
      show({ position });
    });
  });
  for (const choice of promotion.querySelectorAll<HTMLButtonElement>('[data-promotion]')) {
    choice.addEventListener('click', () => pending && void play(pending.from, pending.to, Number(choice.dataset.promotion)));
  }
  root.querySelector('[data-new]')!.addEventListener('click', async () => {
    if (thinking) return;
    drop();
    show(await ask({ call: 'new' }));
  });

  show(await ask({ call: 'load', wasm: root.dataset.wasm! }));
  return () => undefined;
}
