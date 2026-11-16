/*
  Small pictures drawn on a 2D canvas with palette colours only, for what is
  too fine for voxels: screens, papers, posters. Each one becomes a texture
  sampled without smoothing.
*/
import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three';
import { mulberry32 } from '../../lib/photon/prng.ts';
import { PALETTE, type Swatch } from './palette.ts';

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

/** The desktop of the main monitor: wallpaper, a column of icons, a terminal window and a task bar. 64 × 32. */
export function desktopScreen(): CanvasTexture {
  const icons: Swatch[] = ['cyan', 'magenta', 'amber', 'lime', 'violet', 'red'];
  return texture(64, 32, (rect) => {
    rect(0, 0, 64, 32, 'night');
    rect(0, 20, 64, 9, 'plum'); // a band of hills on the wallpaper
    icons.forEach((color, i) => {
      const x = 3 + Math.floor(i / 3) * 8;
      const y = 3 + (i % 3) * 8;
      rect(x, y, 5, 4, color);
      rect(x, y + 5, 5, 1, 'paper'); // its label
    });
    rect(26, 4, 32, 20, 'ink'); // terminal window
    rect(26, 4, 32, 3, 'steel'); // its title bar
    rect(54, 5, 2, 1, 'red');
    for (const [y, w] of [[9, 14], [12, 22], [15, 9], [18, 17]]) rect(28, y, w, 1, 'lime');
    rect(28, 21, 3, 1, 'paper'); // cursor
    rect(0, 29, 64, 3, 'ink'); // task bar
    rect(2, 30, 3, 1, 'cyan');
    rect(55, 30, 7, 1, 'stone'); // clock
  });
}

/**
 * What the window looks out on, in pixels of 2 cm. It is one strip painted on
 * two walls of a box behind the window: `side` runs back from the room wall,
 * `back` faces the room.
 */
export const CITY = { height: 240, side: 60, back: 150 } as const;

/** A skyline with one tall tower, nearer blocks, and a train on its viaduct. Same city on every visit. */
function city(rect: Rect, night: boolean): void {
  const width = CITY.side + CITY.back;
  const { height } = CITY;
  const random = mulberry32(21);
  const pick = (n: number) => Math.floor(random() * n);

  rect(0, 0, width, height, night ? 'night' : 'sky');
  if (night) {
    for (let i = 0; i < 40; i++) rect(pick(width), pick(70), 1, 1, 'paper'); // stars
  } else {
    for (const [x, y, w] of [[20, 22, 26], [96, 40, 34], [160, 18, 22]]) {
      rect(x, y, w, 4, 'paper'); // clouds
      rect(x + 4, y - 3, w - 10, 3, 'paper');
    }
  }

  for (let x = 0; x < width; ) {
    const w = 7 + pick(8);
    const top = 62 + pick(26);
    rect(x, top, w, height - top, night ? 'plum' : 'silver'); // far blocks
    x += w;
  }

  /* The tower: mast, pod, then a shaft that widens towards its foot. */
  const tower = 108;
  rect(tower, 26, 1, 14, night ? 'steel' : 'red');
  rect(tower - 2, 40, 5, 5, night ? 'amber' : 'paper');
  for (let y = 45; y < 104; y++) {
    const half = 1 + Math.floor((y - 45) / 20);
    rect(tower - half, y, 2 * half + 1, 1, Math.floor(y / 8) % 2 ? 'red' : night ? 'rust' : 'paper');
  }
  if (night) rect(tower, 25, 1, 1, 'red');

  for (let x = 0; x < width; ) {
    const w = 12 + pick(10);
    const top = 90 + pick(22);
    rect(x, top, w - 1, height - top, night ? 'ink' : 'taupe'); // near blocks
    for (let wy = top + 3; wy < height - 2; wy += 5) {
      for (let wx = x + 2; wx < x + w - 3; wx += 4) {
        const lit = random() < 0.45;
        const cool = random() < 0.15;
        if (!night) rect(wx, wy, 2, 2, 'steel');
        else if (lit) rect(wx, wy, 2, 2, cool ? 'cyan' : 'amber');
      }
    }
    x += w;
  }

  rect(0, 120, width, 3, night ? 'graphite' : 'steel'); // viaduct
  for (let x = 8; x < width; x += 24) rect(x, 123, 3, height - 123, night ? 'graphite' : 'steel');
  for (let car = 0; car < 3; car++) {
    rect(70 + car * 19, 113, 18, 7, night ? 'steel' : 'paper'); // train
    rect(72 + car * 19, 115, 14, 2, night ? 'amber' : 'denim');
  }
}

export function cityView(part: 'side' | 'back', night: boolean): CanvasTexture {
  const from = part === 'side' ? 0 : CITY.side;
  return texture(part === 'side' ? CITY.side : CITY.back, CITY.height, (rect) =>
    city((x, y, w, h, color) => rect(x - from, y, w, h, color), night),
  );
}

/** The side monitor: lines of code. 40 × 25. */
export function codeScreen(): CanvasTexture {
  const colors: Swatch[] = ['violet', 'cyan', 'paper', 'lime', 'amber'];
  return texture(40, 25, (rect) => {
    rect(0, 0, 40, 25, 'ink');
    rect(0, 0, 40, 2, 'graphite');
    for (let line = 0; line < 9; line++) {
      const indent = [0, 2, 4, 4, 2, 0, 0, 2, 0][line];
      rect(2, 4 + line * 2, 1, 1, 'steel'); // line number
      rect(5 + indent, 4 + line * 2, [9, 14, 20, 11, 6, 3, 12, 17, 4][line], 1, colors[line % colors.length]);
    }
  });
}
