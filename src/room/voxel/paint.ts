/*
  Small pictures drawn on a 2D canvas with palette colours only, for what is
  too fine for voxels: screens, papers, the view from the window. Each one
  becomes a texture sampled without smoothing.
*/
import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three';
import { flight, SHEET, taylor } from '../../data/pegboard.ts';
import { BOARD, doodle, notes } from '../../data/whiteboard.ts';
import { mulberry32 } from '../../lib/photon/prng.ts';
import { PALETTE, type Swatch } from './palette.ts';
import { LARGE, SMALL, typeset, type Font } from './text.ts';

type Rect = (x: number, y: number, w: number, h: number, color: Swatch) => void;
type Painter = (rect: Rect) => void;

function texture(width: number, height: number, paint: Painter): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  paint((x, y, w, h, color) => {
    context.fillStyle = PALETTE[color];
    context.fillRect(x, y, w, h);
  });
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.minFilter = NearestFilter;
  map.magFilter = NearestFilter;
  map.generateMipmaps = false;
  return map;
}

/** Write a line with its top left corner at (x, y), each pixel of the font `scale` pixels wide. Returns its width. */
function write(rect: Rect, text: string, x: number, y: number, pen: Swatch, glyphs: Font = SMALL, scale = 1): number {
  const line = typeset(text, glyphs);
  for (const [px, py] of line.pixels) rect(x + px * scale, y + py * scale, scale, scale, pen);
  return line.width * scale;
}

/** The same, centred in a picture `width` pixels wide. */
function centred(rect: Rect, text: string, width: number, y: number, pen: Swatch, glyphs: Font = SMALL, scale = 1): void {
  write(rect, text, Math.floor((width - typeset(text, glyphs).width * scale) / 2), y, pen, glyphs, scale);
}

/** What a hit leaves on a screen: columns of stuck pixels, slabs that slipped, and cracks from the point of impact. */
function shatter(rect: Rect, width: number, height: number): void {
  const random = mulberry32(5);
  const pick = (n: number) => Math.floor(random() * n);
  const raw: Swatch[] = ['lime', 'cyan', 'magenta', 'violet', 'red', 'night', 'ink'];
  for (let x = Math.floor(width / 3); x < width; ) {
    const w = 1 + pick(3);
    if (random() < 0.7) rect(x, 0, w, height, raw[pick(raw.length)]);
    x += w;
  }
  for (let i = 0; i < 3; i++) rect(pick(width / 2), pick(height), Math.floor(width / 3), 2 + pick(3), raw[pick(raw.length)]);
  const cx = Math.floor(width * 0.28);
  const cy = Math.floor(height * 0.6);
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2 + random();
    const length = (0.5 + random()) * height;
    for (let d = 0; d < length; d++) rect(Math.round(cx + Math.cos(angle) * d), Math.round(cy + Math.sin(angle) * d), 1, 1, 'paper');
  }
  rect(cx - 1, cy - 1, 3, 3, 'paper');
}

/** Lines of code: a line number, then a coloured run after its indent. */
function code(rect: Rect, x: number, y: number, lines: number, width: number): void {
  const colors: Swatch[] = ['violet', 'cyan', 'paper', 'lime', 'amber'];
  const indents = [0, 2, 4, 4, 2, 0, 0, 2, 4, 2, 0, 2];
  const lengths = [9, 14, 20, 11, 6, 3, 12, 17, 13, 8, 4, 15];
  for (let line = 0; line < lines; line++) {
    const indent = indents[line % indents.length];
    rect(x, y + line * 2, 1, 1, 'steel');
    rect(x + 3 + indent, y + line * 2, Math.min(lengths[line % lengths.length], width - 3 - indent), 1, colors[line % colors.length]);
  }
}

/**
 * The desktop of the curved monitor, four times wider than high: a sun going
 * down behind hills, two columns of icons, a terminal, an editor and a task
 * bar. 128 × 36.
 */
export function desktopScreen(broken = false): CanvasTexture {
  const icons: Swatch[] = ['cyan', 'magenta', 'amber', 'lime', 'violet', 'red'];
  return texture(128, 36, (rect) => {
    rect(0, 0, 128, 36, 'night');
    for (const [x, y] of [[20, 4], [47, 2], [70, 7], [88, 3], [104, 9], [121, 5], [61, 12], [112, 15]]) rect(x, y, 1, 1, 'paper'); // stars
    /* The sun, cut by the horizon and by three dark bands. */
    for (let y = 9; y < 25; y++) {
      const half = Math.round(Math.sqrt(Math.max(0, 11 ** 2 - (y - 20) ** 2)));
      if (y !== 17 && y !== 20 && y !== 22) rect(96 - half, y, 2 * half, 1, y < 16 ? 'amber' : 'magenta');
    }
    for (let x = 0; x < 128; x++) {
      const far = 23 - Math.round(3 * Math.abs(Math.sin(x / 9)) + 2 * Math.abs(Math.sin(x / 4 + 1)));
      rect(x, far, 1, 33 - far, 'violet');
      const near = 28 - Math.round(3 * Math.abs(Math.sin(x / 13 + 2)));
      rect(x, near, 1, 33 - near, 'plum');
    }
    icons.forEach((color, i) => {
      const x = 3 + Math.floor(i / 3) * 9;
      const y = 3 + (i % 3) * 9;
      rect(x, y, 5, 4, color);
      rect(x, y + 5, 5, 1, 'paper'); // its label
    });
    rect(26, 4, 36, 23, 'ink'); // terminal window
    rect(26, 4, 36, 3, 'steel'); // its title bar
    rect(58, 5, 2, 1, 'red');
    for (const [y, w] of [[9, 14], [11, 24], [13, 9], [15, 19], [17, 27], [19, 12], [21, 16]]) rect(28, y, w, 1, 'lime');
    rect(28, 23, 3, 1, 'paper'); // cursor
    rect(66, 8, 44, 22, 'graphite'); // editor window, over the sun
    rect(66, 8, 44, 3, 'steel');
    rect(106, 9, 2, 1, 'red');
    code(rect, 68, 13, 8, 40);
    rect(0, 33, 128, 3, 'ink'); // task bar
    rect(2, 34, 3, 1, 'cyan');
    for (let i = 0; i < 5; i++) rect(9 + i * 5, 34, 3, 1, icons[i]);
    rect(117, 34, 9, 1, 'stone'); // clock
    if (broken) shatter(rect, 128, 36);
  });
}

/** The second monitor: an editor, with its file tree, two tabs, a minimap and a status bar. 64 × 36. */
export function codeScreen(broken = false): CanvasTexture {
  return texture(64, 36, (rect) => {
    rect(0, 0, 64, 36, 'ink');
    rect(0, 0, 11, 36, 'graphite'); // file tree
    for (let i = 0; i < 9; i++) rect(2 + (i % 3 ? 2 : 0), 4 + i * 3, 6 - (i % 3), 1, i === 4 ? 'cyan' : 'steel');
    rect(11, 0, 53, 3, 'graphite'); // tabs
    rect(12, 0, 14, 3, 'ink');
    rect(14, 1, 8, 1, 'paper');
    rect(29, 1, 9, 1, 'steel');
    code(rect, 13, 6, 13, 41);
    rect(57, 4, 7, 29, 'graphite'); // minimap
    for (let i = 0; i < 12; i++) rect(58, 5 + i * 2, 2 + ((i * 3) % 4), 1, 'steel');
    rect(0, 33, 64, 3, 'violet'); // status bar
    rect(2, 34, 6, 1, 'paper');
    rect(52, 34, 9, 1, 'paper');
    if (broken) shatter(rect, 64, 36);
  });
}

/**
 * What the window looks out on, in pixels of 2 cm. It is one strip painted on
 * two walls of a box behind the window: `side` runs back from the room wall,
 * `back` faces the room. By day it is Paris, by night Tokyo: the two cities
 * he lives between, each with its tower.
 */
export const CITY = { height: 240, side: 60, back: 150 } as const;

/** The tower of Paris: the column of the strip where it stands, the row of its tip, and its height. All of it shows through the window from the default view. */
const TOWER = { x: 107, top: 67, height: 54 };

/**
 * A lattice tower, row by row from its tip: a mast, a shaft that widens as
 * `spread` says, then two legs with an arch between them. `paint` gives the
 * colour of a row; `decks` are its platforms, as shares of its height.
 */
function tower(rect: Rect, spread: (t: number) => number, mast: number, decks: [number, number][], paint: (row: number, t: number) => Swatch, deck: Swatch): void {
  const { x, top, height } = TOWER;
  for (let row = 0; row < height; row++) {
    const t = row / height; // 0 at the tip, 1 on the ground
    const color = paint(row, t);
    if (t < mast) {
      rect(x, top + row, 1, 1, color);
      continue;
    }
    const half = Math.round(spread((t - mast) / (1 - mast)));
    const legs = decks[decks.length - 1][0];
    if (t <= legs) {
      rect(x - half, top + row, 2 * half + 1, 1, color);
      continue;
    }
    /* Under the lowest deck the tower stands on two legs: the gap between them is an arch. */
    const down = (t - legs) / (1 - legs);
    const gap = Math.round(half * Math.min(0.72, 0.25 + Math.sqrt(down) * 0.6));
    rect(x - half, top + row, half - gap + 1, 1, color);
    rect(x + gap, top + row, half - gap + 1, 1, color);
  }
  for (const [at, extra] of decks) {
    const half = Math.round(spread((at - mast) / (1 - mast))) + extra;
    rect(x - half, top + Math.round(at * height), 2 * half + 1, 2, deck);
  }
}

/** Paris by day: clouds, a far row of pale buildings under zinc roofs, the tower, and nearer roofs with their chimneys. */
function paris(rect: Rect): void {
  const width = CITY.side + CITY.back;
  const { height } = CITY;
  const random = mulberry32(8);
  const pick = (n: number) => Math.floor(random() * n);

  rect(0, 0, width, height, 'sky');
  for (const [x, y, w] of [[18, 30, 26], [70, 52, 20], [128, 76, 24], [150, 34, 30], [84, 96, 14]]) {
    rect(x, y, w, 3, 'paper'); // clouds
    rect(x + 4, y - 2, w - 10, 2, 'paper');
  }
  for (let x = 0; x < width; ) {
    const w = 10 + pick(9);
    const top = 104 + pick(5);
    rect(x, top, w, height - top, 'linen'); // far buildings
    rect(x, top, w, 3, 'silver'); // their roofs
    x += w;
  }
  tower(rect, (u) => 0.6 + 12.4 * u ** 2.3, 0.07, [[0.36, 1], [0.68, 1]], (row) => (row % 4 === 3 ? 'plum' : 'taupe'), 'plum');
  for (let x = 0; x < width; ) {
    const w = 14 + pick(10);
    const top = 115 + pick(5); // low enough to leave the legs of the tower in sight
    rect(x, top + 4, w - 1, height - top - 4, 'cream'); // near buildings
    rect(x, top, w - 1, 4, 'steel'); // mansard roof
    rect(x + 2 + pick(w - 6), top - 3, 2, 3, 'rust'); // chimney
    for (let wx = x + 2; wx < x + w - 3; wx += 4) {
      rect(wx, top + 1, 2, 2, 'silver'); // dormers
      for (let wy = top + 7; wy < height - 2; wy += 6) rect(wx, wy, 2, 3, random() < 0.3 ? 'denim' : 'taupe');
    }
    x += w;
  }
}

/** The train of the night view: the rows it runs on, the length of a car, how many it has, and where its nose stands when it does not run. In pixels of the strip. */
export const TRAIN = { y: 113, height: 7, car: 19, cars: 3, rest: 70 };

/** Tokyo by night: stars, dark blocks, a slim red tower with its mast and its pod, nearer blocks with lit windows and a train on its viaduct, its first car at column `train`. None with null. */
function tokyo(rect: Rect, train: number | null = TRAIN.rest): void {
  const width = CITY.side + CITY.back;
  const { height } = CITY;
  const random = mulberry32(21);
  const pick = (n: number) => Math.floor(random() * n);

  rect(0, 0, width, height, 'night');
  for (let i = 0; i < 40; i++) rect(pick(width), pick(70), 1, 1, 'paper'); // stars
  for (let x = 0; x < width; ) {
    const w = 7 + pick(8);
    const top = 62 + pick(26);
    rect(x, top, w, height - top, 'plum'); // far blocks
    x += w;
  }

  /* The tower: mast, pod, then a shaft that widens towards its foot. */
  const tower = 108;
  rect(tower, 26, 1, 14, 'steel');
  rect(tower - 2, 40, 5, 5, 'amber');
  for (let y = 45; y < 104; y++) {
    const half = 1 + Math.floor((y - 45) / 20);
    rect(tower - half, y, 2 * half + 1, 1, Math.floor(y / 8) % 2 ? 'red' : 'rust');
  }
  rect(tower, 25, 1, 1, 'red');

  for (let x = 0; x < width; ) {
    const w = 12 + pick(10);
    const top = 90 + pick(22);
    rect(x, top, w - 1, height - top, 'ink'); // near blocks
    for (let wy = top + 3; wy < height - 2; wy += 5) {
      for (let wx = x + 2; wx < x + w - 3; wx += 4) {
        const lit = random() < 0.45;
        const cool = random() < 0.15;
        if (lit) rect(wx, wy, 2, 2, cool ? 'cyan' : 'amber');
      }
    }
    x += w;
  }

  rect(0, 120, width, 3, 'graphite'); // viaduct
  for (let x = 8; x < width; x += 24) rect(x, 123, 3, height - 123, 'graphite');
  if (train === null) return;
  for (let car = 0; car < TRAIN.cars; car++) {
    rect(train + car * TRAIN.car, TRAIN.y, TRAIN.car - 1, TRAIN.height, 'steel');
    rect(train + 2 + car * TRAIN.car, TRAIN.y + 2, TRAIN.car - 5, 2, 'amber');
  }
}

/**
 * Move the train of a night view that faces the room: the rows it runs on
 * are painted again, with its first car at column `train` of the strip, or
 * without it.
 */
export function moveTrain(view: CanvasTexture, train: number | null): void {
  const context = (view.image as HTMLCanvasElement).getContext('2d')!;
  context.save();
  context.beginPath();
  context.rect(0, TRAIN.y, CITY.back, TRAIN.height);
  context.clip();
  tokyo((x, y, w, h, color) => {
    context.fillStyle = PALETTE[color];
    context.fillRect(x - CITY.side, y, w, h);
  }, train);
  context.restore();
  view.needsUpdate = true;
}

export function cityView(part: 'side' | 'back', night: boolean): CanvasTexture {
  const from = part === 'side' ? 0 : CITY.side;
  return texture(part === 'side' ? CITY.side : CITY.back, CITY.height, (rect) =>
    (night ? tokyo : paris)((x, y, w, h, color) => rect(x - from, y, w, h, color)),
  );
}

/** What is written on the whiteboard, in marker pens, as seen face on. */
export function whiteboardNotes(): CanvasTexture {
  return texture(BOARD.width, BOARD.height, (rect) => {
    rect(0, 0, BOARD.width, BOARD.height, 'paper');
    doodle.rows.forEach((row, y) =>
      [...row].forEach((mark, x) => {
        if (mark in doodle.pens) rect(doodle.at[0] + x, doodle.at[1] + y, 1, 1, doodle.pens[mark]);
      }),
    );
    for (const { text, at, pen } of notes) write(rect, text, at[0], at[1], pen, LARGE);
  });
}

/**
 * A framed diploma: a tricolour mark, its title, the name of its holder on as
 * many lines as it has words, two lines of small print and a red seal.
 * 60 × 40, one pixel is 5 mm.
 */
export function certificate({ title, holder }: { title: string; holder: string }): CanvasTexture {
  return texture(60, 40, (rect) => {
    rect(0, 0, 60, 40, 'paper');
    for (const [x, y, w, h] of [[2, 2, 56, 1], [2, 37, 56, 1], [2, 2, 1, 36], [57, 2, 1, 36]]) rect(x, y, w, h, 'stone'); // border
    (['denim', 'paper', 'red'] as const).forEach((color, i) => rect(24 + i * 4, 4, 4, 2, color));
    centred(rect, title, 60, 8, 'ink');
    rect(14, 15, 32, 1, 'stone');
    holder.split(' ').forEach((word, i) => centred(rect, word, 60, 18 + i * 7, 'ink'));
    rect(6, 33, 18, 1, 'stone');
    rect(6, 35, 12, 1, 'stone');
    rect(47, 32, 5, 3, 'red'); // seal, and the two ends of its ribbon
    rect(48, 31, 3, 5, 'red');
    rect(47, 35, 1, 2, 'red');
    rect(51, 35, 1, 2, 'red');
  });
}

/**
 * The paper of a frame taller than wide: a title, a few lines under a rule,
 * and a foot, all centred. 40 × 60, one pixel is 5 mm.
 */
export function schoolPaper({ title, lines, foot }: { title: string; lines: string[]; foot: string }): CanvasTexture {
  return texture(40, 60, (rect) => {
    rect(0, 0, 40, 60, 'paper');
    for (const [x, y, w, h] of [[2, 2, 36, 1], [2, 57, 36, 1], [2, 2, 1, 56], [37, 2, 1, 56]]) rect(x, y, w, h, 'stone'); // border
    centred(rect, title, 40, 8, 'denim');
    rect(8, 16, 24, 1, 'stone');
    lines.forEach((line, i) => centred(rect, line, 40, 21 + i * 8, 'ink'));
    centred(rect, foot, 40, 48, 'taupe');
  });
}

/**
 * The paper of a diploma that is not awarded yet: its title, faint lines
 * where the text will be, a red stamp that leans across them, the year under
 * it, and a yellow note stuck on its corner. 40 × 60.
 */
export function soonPaper({ title, stamp, foot }: { title: string; stamp: string[]; foot: string }): CanvasTexture {
  return texture(40, 60, (rect) => {
    rect(0, 0, 40, 60, 'paper');
    for (const [x, y, w, h] of [[2, 2, 36, 1], [2, 57, 36, 1], [2, 2, 1, 56], [37, 2, 1, 56]]) rect(x, y, w, h, 'stone'); // border
    centred(rect, title, 40, 7, 'ink');
    for (const y of [16, 19, 44, 47, 50]) rect(7, y, y % 2 ? 20 : 26, 1, 'linen');
    /* The stamp climbs one pixel every four: struck by hand, not straight. */
    const lean: Rect = (x, y, w, h, color) => {
      for (let i = x; i < x + w; i++) rect(i, y + 4 - Math.floor(i / 4), 1, h, color);
    };
    lean(2, 22, 36, 1, 'red');
    lean(2, 41, 36, 1, 'red');
    lean(2, 22, 1, 20, 'red');
    lean(37, 22, 1, 20, 'red');
    stamp.forEach((word, i) => centred(lean, word, 40, 25 + i * 9, 'red', LARGE));
    centred(rect, foot, 40, 51, 'red');
    rect(29, 0, 11, 10, 'mustard'); // the note
    rect(31, 3, 7, 1, 'walnut');
    rect(31, 6, 5, 1, 'walnut');
  });
}

/** A framed paper that only says its name, in black capitals twice the size of the large font. 60 × 40. */
export function nameplate(name: string): CanvasTexture {
  return texture(60, 40, (rect) => {
    rect(0, 0, 60, 40, 'paper');
    centred(rect, name, 60, 13, 'ink', LARGE, 2);
  });
}

/** A plane seen from above, flying to the right. 9 × 7. */
const PLANE = ['...#.....', '...##....', '#..###...', '#########', '#..###...', '...##....', '...#.....'];

/**
 * A boarding pass: a band with its title, the two cities with a plane between
 * them, grey fields, a bar code, and a stub to tear off. 96 × 36, one pixel
 * is 2.5 mm.
 */
export function boardingPass(): CanvasTexture {
  return texture(96, 36, (rect) => {
    rect(0, 0, 96, 36, 'paper');
    rect(0, 0, 96, 8, 'denim');
    write(rect, flight.title, 3, 2, 'paper');
    const plane = (x: number, y: number, color: Swatch) =>
      PLANE.forEach((row, j) => [...row].forEach((cell, i) => cell === '#' && rect(x + i, y + j, 1, 1, color)));
    const end = 3 + write(rect, flight.from, 3, 12, 'ink');
    plane(end + 3, 11, 'denim');
    write(rect, flight.to, end + 15, 12, 'ink');
    for (const [x, w] of [[3, 14], [21, 9], [34, 18]]) {
      rect(x, 21, w, 1, 'stone'); // the name of a field
      rect(x, 24, Math.floor(w * 0.7), 2, 'taupe'); // what is in it
    }
    const bars = (x: number, y: number, w: number, h: number) => {
      const random = mulberry32(x);
      for (let i = 0; i < w; i++) if (random() < 0.55) rect(x + i, y, 1, h, 'ink');
    };
    bars(3, 29, 50, 5);
    for (let y = 0; y < 36; y += 2) rect(71, y, 1, 1, 'stone'); // where the stub tears off
    plane(79, 12, 'denim');
    bars(75, 24, 18, 10);
  });
}

/** The sheet of usual Taylor expansions: its title, underlined, then a formula on each line. One pixel is 2.5 mm. */
export function formulaSheet(): CanvasTexture {
  return texture(SHEET.width, SHEET.height, (rect) => {
    rect(0, 0, SHEET.width, SHEET.height, 'paper');
    const width = write(rect, taylor.title, 4, 4, 'red');
    rect(4, 11, width, 1, 'red');
    taylor.lines.forEach((line, i) => write(rect, line, 4, 18 + i * 9, i % 2 ? 'denim' : 'ink'));
  });
}

/**
 * The printed face of a table number: red stripes at the top and at the
 * foot, an invitation to sit down, the number in a bucket held out by a
 * hand, and a name. 40 x 88, one pixel is 2.5 mm.
 */
export function tableCard({ invite, number, brand }: { invite: string[]; number: string; brand: string }): CanvasTexture {
  return texture(40, 88, (rect) => {
    rect(0, 0, 40, 88, 'paper');
    for (let y = 5; y < 88; y += 6) rect(0, y, 40, 1, 'cream'); // courses of white brick
    for (let y = 0; y < 88; y += 6) for (let x = (y / 6) % 2 ? 4 : 10; x < 40; x += 12) rect(x, y, 1, 5, 'cream');
    const stripes = (y: number, h: number, x = 12) => [0, 6, 12].forEach((dx) => rect(x + dx, y, 4, h, 'red'));
    stripes(2, 10);
    invite.forEach((line, i) => centred(rect, line, 40, 15 + i * 7, 'ink'));
    /* The bucket: wider at its rim, three stripes under it, the number in the middle. */
    for (let y = 29; y < 57; y++) {
      const half = Math.round(14 - ((y - 29) / 27) * 4);
      rect(20 - half, y, 2 * half, 1, 'ink');
      if (y > 29 && y < 56) rect(21 - half, y, 2 * half - 2, 1, 'paper');
    }
    stripes(30, 5);
    centred(rect, number, 40, 39, 'red', LARGE, 2);
    /* The hand that holds it: a palm, and a thumb against the side of the bucket. */
    rect(9, 59, 24, 3, 'ink');
    rect(12, 62, 18, 1, 'ink');
    rect(7, 57, 4, 3, 'ink');
    centred(rect, brand, 40, 65, 'ink', LARGE, 2);
    stripes(81, 7);
  });
}

/** A tag of the pegboard: a word in white on violet. 31 × 9, one pixel is 5 mm. */
export function tag(word: string): CanvasTexture {
  return texture(31, 9, (rect) => {
    rect(0, 0, 31, 9, 'violet');
    centred(rect, word, 31, 2, 'paper');
  });
}

/** A paper label: a word in black, three pixels of margin around it. */
export function label(word: string): CanvasTexture {
  const width = typeset(word).width + 6;
  return texture(width, 9, (rect) => {
    rect(0, 0, width, 9, 'paper');
    write(rect, word, 3, 2, 'ink');
  });
}

/** The card of a specimen: its name, and its size under it, in a thin frame. 60 × 20, one pixel is 2.5 mm. */
export function specimenCard({ name, size }: { name: string; size: string }): CanvasTexture {
  return texture(60, 20, (rect) => {
    rect(0, 0, 60, 20, 'stone');
    rect(1, 1, 58, 18, 'paper');
    centred(rect, name, 60, 3, 'ink');
    centred(rect, size, 60, 11, 'taupe');
  });
}

/**
 * The sheet of a contest problem that has been reviewed: its heading, the
 * statement as grey lines, an example in two boxes, ticks in red pen in the
 * margin and a red stamp struck across the foot. 70 × 110, one pixel is 2.5 mm.
 */
export function contestSheet({ title, stamp }: { title: string; stamp: string }): CanvasTexture {
  return texture(70, 110, (rect) => {
    rect(0, 0, 70, 110, 'paper');
    const width = write(rect, title, 6, 6, 'ink', LARGE);
    rect(6, 15, width, 1, 'ink');
    for (const [y, w] of [[22, 52], [26, 46], [30, 54], [34, 30], [64, 54], [68, 40], [72, 48], [76, 18]]) rect(6, y, w, 1, 'stone');
    for (const x of [6, 36]) {
      rect(x, 42, 24, 16, 'linen'); // input, output
      for (const [y, w] of [[45, 13], [49, 17], [53, 8]]) rect(x + 3, y, x > 6 ? w - 5 : w, 1, 'taupe');
    }
    for (const y of [24, 66]) {
      rect(63, y + 2, 1, 2, 'red'); // a tick
      rect(64, y + 3, 1, 2, 'red');
      rect(65, y + 1, 1, 3, 'red');
      rect(66, y - 1, 1, 3, 'red');
    }
    /* The stamp climbs one pixel every five: struck by hand. */
    const lean: Rect = (x, y, w, h, color) => {
      for (let i = x; i < x + w; i++) rect(i, y + 6 - Math.floor(i / 5), 1, h, color);
    };
    const wide = typeset(stamp, LARGE).width + 6;
    const left = Math.floor((70 - wide) / 2);
    lean(left, 84, wide, 1, 'red');
    lean(left, 96, wide, 1, 'red');
    lean(left, 84, 1, 13, 'red');
    lean(left + wide - 1, 84, 1, 13, 'red');
    write(lean, stamp, left + 3, 87, 'red', LARGE);
  });
}

/**
 * A page of the wall calendar: a red binding, the month circled by hand in
 * red marker, and a square for each of its days, a week to a row, Monday
 * first. 60 × 80, one pixel is 5 mm.
 */
export function calendarPage(title: string, weeks: (number | null)[][]): CanvasTexture {
  return texture(60, 80, (rect) => {
    rect(0, 0, 60, 80, 'paper');
    rect(0, 0, 60, 4, 'red');
    centred(rect, title, 60, 11, 'ink', LARGE);
    /* The ring: not quite an ellipse, and it overshoots where it closes. */
    for (let step = 20; step < 420; step++) {
      const angle = (step / 180) * Math.PI;
      const wobble = 1 + 0.05 * Math.sin(angle * 1.5) - (step > 360 ? (step - 360) * 0.002 : 0);
      rect(Math.round(29.5 + 27 * wobble * Math.cos(angle)), Math.round(14 - 8 * wobble * Math.sin(angle)), 1, 1, 'red');
    }
    weeks.forEach((week, row) =>
      week.forEach((day, column) => {
        if (day !== null) rect(4 + column * 8, 31 + row * 8, 4, 4, column > 4 ? 'stone' : 'taupe');
      }),
    );
  });
}

/** The display of the power supply: a word, and a time under it in green. 40 × 20, one pixel is 2.5 mm. */
export function uptimeScreen(title: string, time: string): CanvasTexture {
  return texture(40, 20, (rect) => {
    rect(0, 0, 40, 20, 'ink');
    write(rect, title, 3, 2, 'silver');
    write(rect, time, 3, 10, 'lime', LARGE);
  });
}

/** The tiger of the cover of the book, walking to the right: "#" for its coat, "o" for a stripe. Drawn for the room. */
const TIGER = [
  '..............................................########......................',
  '...........######...........................######oo####.....##.............',
  '........#######oo###.......................##oo###oo###oo#######.###........',
  '.......###oo###oo####.#######################oo###oo###oo#######.###........',
  '....######oo###oo###oo###oo###oo###oo###oo###oo###oo###oo###########........',
  '....######oo###oo###oo###oo###oo###oo###oo###oo##o#####oo############.......',
  '...#######oo##o#####oo###oo###oo###oo###oo##o####o####o#########o#####......',
  '...######o####o#####oo###oo###oo###oo###oo##o####o####o########o#######.....',
  '..#######o####o####o####o####o####o####o####o####o####o################.....',
  '..#######o####o####o####o####o####o####o####o###o#####o############oo##.....',
  '.##oo####o###o#####o####o####o####o####o###o####o####o###################...',
  '#############o#####o####o####o####o####o###o####o####o#######o############..',
  '#############o####o####o####o####o####o####o#################o##############',
  '####.##################o#########o####o####o##################o#############',
  '###..##################o#########o########o#################################',
  '#oo...########o########o#########o##########################################',
  '###....#######o####o#########o########o##########o###########.########ooo...',
  '###.....#####o#####o########o########o###########o#########...########......',
  '###.....#####o####o#########o########o##########o##########....######.......',
  '##......#####o####o#########...............#####o#..########................',
  'oo......##########o##########..............#####o....#######................',
  '###.....#####################..............######.....#######...............',
  '###.....##############.#######............######......#######...............',
  '##.......############...######............######.......##oooo#..............',
  '#.......#############...##oooo#...........##oooo........#######.............',
  'o.......############.....#######.........######..........######.............',
  '.......############.......######........#######..........#######............',
  '......#######.............######........#######..........#######............',
  '.....###oooo..............######........#######..........#######............',
  '....#######...............######........#######...........##oooo#...........',
  '....######................##oooo.......##oooo#............#######...........',
  '....######................######.......######..............######...........',
  '....######.................#####.......######..............######...........',
  '.....#ooo##................#####......######................######..........',
  '.....######................#####......######.................#####..........',
  '......#####................#####......#####..................#####..........',
  '......#####.................######....######..................#######.......',
  '.......#######..............########..#######.................#########.....',
  '......#########.............########.#########................#########.....',
  '......#########.............########..#######.................#########.....',
  '........#####................######....#####....................#####.......',
];

/**
 * The cover of his book about compilers, laid out as the book is: its title
 * in white at the top right, a tiger walking under it, the author at the
 * foot, and lines of code faint in the blue. 88 × 110, one pixel is about
 * 2.3 mm.
 */
export function bookCover({ title, author }: { title: string[]; author: string }): CanvasTexture {
  return texture(88, 110, (rect) => {
    rect(0, 0, 88, 110, 'cornflower');
    const random = mulberry32(7);
    const pick = (list: number[]) => list[Math.floor(random() * list.length)];
    for (let y = 3; y < 107; y += 3) {
      for (let x = 3; x < 84; ) {
        const run = pick([3, 5, 7, 9, 12]);
        if (random() < 0.5) rect(x, y, Math.min(run, 85 - x), 1, 'periwinkle');
        x += run + pick([2, 3, 5]);
      }
    }
    const top = 102 - TIGER.length;
    TIGER.forEach((row, j) => [...row].forEach((cell, i) => cell !== '.' && rect(i, top + j, 1, 1, cell === '#' ? 'navy' : 'cornflower')));
    title.forEach((line, n) => write(rect, line, 82 - typeset(line, LARGE).width, 6 + n * 10, 'paper', LARGE));
    write(rect, author, 80 - typeset(author).width, 101, 'paper');
  });
}
