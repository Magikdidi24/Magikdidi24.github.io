/*
  The spines of the manga library: one picture for the front of each
  bookcase, in texels of 5 mm. A volume is 4 texels wide and 35 high; its
  last column is shaded, which is what sets it apart from the next one. A
  series has its own colours: a mark that stands for its title, a band at
  its foot. For some, the spines side by side form one picture, which goes
  on where the series goes on, in the next bay or on the shelf below.

  The pictures are drawn here, from the palette of the room. None of them
  copies the artwork of a publisher.
*/
import { CanvasTexture, NearestFilter, NearestMipmapNearestFilter, SRGBColorSpace } from 'three';
import { manga, type Mural, type Series } from '../../data/manga.ts';
import { FRONTS, RUNS, SPINE, TIERS } from '../objects/library.ts';
import { PALETTE, type Swatch } from './palette.ts';

type Rect = (x: number, y: number, w: number, h: number, color: Swatch) => void;

/** In texels, from the top of a spine: where the picture of a series starts, and its height. */
const PICTURE = { top: 9, height: SPINE.height - 9 };

const SPINES: Swatch[] = ['paper', 'paper', 'paper', 'cream', 'linen', 'ink', 'graphite', 'red', 'rust', 'mustard', 'denim', 'teal', 'night', 'plum', 'sage', 'blossom', 'steel', 'sky', 'leaf', 'walnut'];
const MARKS: Swatch[] = ['ink', 'red', 'mustard', 'denim', 'paper', 'leaf', 'plum', 'teal', 'magenta', 'violet', 'amber', 'rust'];
const BRIGHT: Swatch[] = ['red', 'amber', 'mustard', 'leaf', 'teal', 'sky', 'denim', 'violet', 'magenta', 'rust'];

/** A filled circle. */
function disc(rect: Rect, cx: number, cy: number, r: number, color: Swatch): void {
  for (let y = -r; y <= r; y++) {
    const half = Math.round(Math.sqrt(r * r - y * y));
    rect(cx - half, cy + y, 2 * half + 1, 1, color);
  }
}

/** The outline of a circle, one texel thick. */
function ring(rect: Rect, cx: number, cy: number, r: number, color: Swatch): void {
  for (let k = 0; k < 8 * r; k++) {
    const angle = (k / (8 * r)) * 2 * Math.PI;
    rect(Math.round(cx + Math.cos(angle) * r), Math.round(cy + Math.sin(angle) * r), 1, 1, color);
  }
}

/** A straight line, `thick` texels thick. */
function line(rect: Rect, x0: number, y0: number, x1: number, y1: number, color: Swatch, thick = 1): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let k = 0; k <= steps; k++) rect(Math.round(x0 + ((x1 - x0) * k) / steps), Math.round(y0 + ((y1 - y0) * k) / steps), thick, thick, color);
}

/* What the spines of a series form side by side: `w` texels wide, PICTURE.height high, drawn from its top left corner. */
const MURALS: Record<Exclude<Mural, 'rainbow'>, (rect: Rect, w: number) => void> = {
  /* A dragon among the clouds, from the first volume to the last, and seven balls. */
  dragon(rect, w) {
    rect(0, 0, w, 26, 'sky');
    for (let x = 5; x < w; x += 37) {
      rect(x, 3 + (x % 3), 12, 2, 'paper');
      rect(x + 3, 1 + (x % 3), 6, 2, 'paper');
      rect(x + 16, 21, 11, 2, 'paper');
    }
    const back = (x: number) => 13 + Math.round(6 * Math.sin(x / 9));
    for (let x = 3; x < w - 9; x++) {
      const thick = Math.min(3, 1 + Math.floor(x / 9));
      rect(x, back(x) - thick, 1, 2 * thick, 'leaf');
      rect(x, back(x) + thick - 1, 1, 1, 'mustard');
      if (x % 4 === 0) rect(x, back(x) - thick - 1, 1, 1, 'moss');
      if (x % 6 === 3) rect(x, back(x) - 1, 1, 1, 'moss');
    }
    const [hx, hy] = [w - 11, back(w - 10)];
    rect(hx, hy - 4, 7, 7, 'leaf');
    rect(hx + 6, hy - 2, 4, 4, 'leaf');
    rect(hx + 4, hy - 3, 2, 1, 'red');
    rect(hx + 1, hy - 7, 1, 3, 'walnut');
    rect(hx + 3, hy - 6, 1, 2, 'walnut');
    rect(hx + 7, hy + 2, 3, 1, 'mustard');
    for (let k = 0; k < 7; k++) {
      const x = Math.round(((k + 0.5) / 7) * (w - 26)) + 6;
      const y = Math.min(22, Math.max(3, back(x) + (k % 2 ? -8 : 8)));
      disc(rect, x, y, 2, 'amber');
      rect(x, y, 1, 1, 'red');
    }
  },
  /* The sea: a sun, islands, ships under sail, a straw hat on the water. */
  sea(rect, w) {
    rect(0, 0, w, 26, 'sky');
    disc(rect, Math.min(60, w - 8), 6, 4, 'amber');
    for (let x = 14; x < w; x += 53) {
      rect(x, 4 + (x % 5), 14, 2, 'paper');
      rect(x + 4, 2 + (x % 5), 7, 2, 'paper');
    }
    for (let x = 96; x < w - 30; x += 190) {
      for (let y = 0; y < 7; y++) rect(x + y * 2, 16 - y + 6, 30 - y * 4, 1, y < 2 ? 'leaf' : 'honey'); // an island
      rect(x + 14, 8, 1, 8, 'walnut');
      rect(x + 11, 7, 7, 2, 'leaf');
    }
    rect(0, 17, w, 9, 'denim');
    for (let y = 18; y < 26; y += 2) for (let x = (y * 5) % 9; x < w; x += 9) rect(x, y, 3, 1, 'paper');
    for (let x = 38; x < w - 20; x += 150) {
      rect(x, 14, 16, 4, 'walnut'); // a ship
      rect(x + 2, 18, 12, 1, 'walnut');
      rect(x + 8, 3, 1, 11, 'walnut');
      rect(x + 3, 5, 11, 7, 'paper');
      rect(x + 7, 7, 3, 3, 'ink');
      rect(x + 9, 1, 4, 2, 'ink');
    }
    rect(12, 14, 8, 3, 'mustard'); // the hat
    rect(10, 17, 12, 1, 'mustard');
    rect(12, 16, 8, 1, 'red');
  },
  /* Nine tails that sweep across the shelf, from a fox at its left end. */
  fox(rect, w) {
    rect(0, 0, w, 26, 'cream');
    for (let k = 8; k >= 0; k--) {
      const reach = Math.min(w - 12, 34 + k * ((w - 46) / 8));
      for (let x = 0; x < reach; x++) {
        const t = x / reach;
        const y = 22 - Math.round(Math.sin(t * Math.PI) * (4 + k * 2) + t * (k - 4) * 1.5);
        const thick = Math.max(1, Math.round(3 * (1 - t)));
        rect(8 + x, y - thick, 1, 2 * thick, k % 2 ? 'amber' : 'mustard');
        rect(8 + x, y + thick - 1, 1, 1, 'rust');
      }
    }
    rect(2, 15, 9, 8, 'amber'); // the fox
    rect(2, 12, 2, 3, 'amber');
    rect(8, 12, 2, 3, 'amber');
    rect(4, 18, 1, 1, 'ink');
    rect(8, 18, 1, 1, 'ink');
    rect(5, 21, 3, 1, 'paper');
    for (let x = w - 30; x > 60; x -= 67) {
      ring(rect, x, 6, 4, 'ink'); // a swirl
      ring(rect, x, 6, 2, 'ink');
      rect(x + 4, 6, 3, 1, 'ink');
    }
  },
  /* Night: a white crescent, a red stroke of a blade across the whole series. */
  moon(rect, w) {
    rect(0, 0, w, 26, 'ink');
    for (let x = 7; x < w; x += 13) rect(x, (x * 7) % 23, 1, 1, 'paper');
    const cx = Math.min(46, w - 14);
    disc(rect, cx, 12, 10, 'paper');
    disc(rect, cx + 5, 10, 9, 'ink');
    for (let x = 0; x < w; x++) {
      const y = 24 - Math.round((x / w) * 20);
      rect(x, y, 1, x % 9 < 6 ? 2 : 1, 'red');
      if (x % 5 === 0) rect(x, y + 2, 1, 1, 'rust');
    }
  },
  /* Circles drawn in chalk, one inside the other, joined by a line. */
  circle(rect, w) {
    rect(0, 0, w, 26, 'graphite');
    line(rect, 0, 13, w, 13, 'rust');
    for (let x = 16; x < w; x += 38) {
      for (const r of [11, 8, 4]) ring(rect, x, 13, r, r === 8 ? 'red' : 'rust');
      line(rect, x - 7, 17, x + 7, 17, 'red');
      line(rect, x - 7, 17, x, 5, 'red');
      line(rect, x + 7, 17, x, 5, 'red');
      rect(x, 12, 1, 3, 'paper');
    }
  },
  /* A wall as high as the shelf, and a head that looks over it. */
  wall(rect, w) {
    rect(0, 0, w, 26, 'sky');
    const head = Math.round(w * 0.62);
    disc(rect, head, 9, 8, 'rust');
    rect(head - 5, 6, 3, 2, 'ink');
    rect(head + 2, 6, 3, 2, 'ink');
    rect(head - 5, 11, 11, 2, 'paper');
    for (let x = head - 5; x < head + 6; x += 2) rect(x, 11, 1, 2, 'walnut');
    for (const dx of [-11, 10]) {
      rect(head + dx, 3, 4, 2, 'paper'); // steam
      rect(head + dx + 1, 1, 3, 2, 'paper');
    }
    rect(0, 10, w, 16, 'stone');
    rect(0, 10, w, 1, 'taupe');
    for (let y = 14; y < 26; y += 4) rect(0, y, w, 1, 'taupe');
    for (let y = 10; y < 26; y += 4) for (let x = (y % 8 ? 3 : 8); x < w; x += 10) rect(x, y + 1, 1, 3, 'taupe');
    rect(9, 5, 2, 5, 'leaf'); // a scout on the wall, cloak in the wind
    rect(11, 6, 3, 2, 'leaf');
    rect(9, 4, 2, 1, 'apricot');
  },
  /* A court, its lines, a hoop, and the ball on its way to it. */
  court(rect, w) {
    rect(0, 0, w, 26, 'honey');
    for (let x = 0; x < w; x += 7) rect(x, 0, 1, 26, 'oak');
    rect(0, 22, w, 1, 'paper');
    ring(rect, w - 22, 22, 14, 'paper');
    rect(w - 5, 3, 2, 9, 'paper'); // backboard
    rect(w - 11, 9, 6, 1, 'red'); // rim
    for (let k = 0; k < 4; k++) rect(w - 10 + k, 10 + k, 5 - k, 1, 'paper');
    for (let k = 0; k < 9; k++) {
      const t = k / 8;
      const x = Math.round(6 + t * (w - 20));
      const y = Math.round(19 - Math.sin(t * Math.PI) * 15 - t * 9);
      if (k === 8) disc(rect, x, Math.max(y, 4), 2, 'rust');
      else rect(x, Math.max(y, 1), 1, 1, 'rust'); // where it has been
    }
  },
  /* A blade longer than the shelf is wide, under a red ring in a black sky. */
  sword(rect, w) {
    rect(0, 0, w, 26, 'ink');
    ring(rect, 14, 9, 6, 'red');
    ring(rect, 14, 9, 5, 'rust');
    const hilt = Math.min(34, Math.round(w * 0.2));
    rect(hilt - 9, 15, 9, 2, 'walnut');
    rect(hilt, 11, 2, 10, 'steel');
    for (let x = hilt + 2; x < w - 2; x++) {
      const half = Math.max(1, Math.round(4 * (1 - (x - hilt) / (w - hilt)) ** 0.5));
      rect(x, 16 - half, 1, 2 * half, 'steel');
      rect(x, 16 - half, 1, 1, 'silver');
    }
    for (let x = hilt + 12; x < w - 8; x += 17) rect(x, 17, 2, 1, 'graphite'); // notches
  },
  /* Ink on paper: two ridges, a red sun, a man alone on the nearer one. */
  brush(rect, w) {
    rect(0, 0, w, 26, 'cream');
    disc(rect, w - 16, 7, 4, 'rust');
    for (let x = 0; x < w; x++) {
      const far = 15 - Math.round(4 * Math.abs(Math.sin(x / 17)) + 2 * Math.sin(x / 5));
      rect(x, far, 1, 26 - far, 'stone');
      const near = 21 - Math.round(3 * Math.abs(Math.sin(x / 23 + 1)) + Math.sin(x / 7));
      rect(x, near, 1, 26 - near, 'ink');
    }
    const man = Math.round(w * 0.3);
    const ground = 21 - Math.round(3 * Math.abs(Math.sin(man / 23 + 1)) + Math.sin(man / 7));
    rect(man, ground - 5, 2, 5, 'ink');
    line(rect, man + 2, ground - 3, man + 6, ground - 7, 'ink');
    for (let x = 20; x < w - 30; x += 41) {
      rect(x, 4 + (x % 4), 2, 1, 'ink'); // birds
      rect(x + 3, 5 + (x % 4), 2, 1, 'ink');
    }
  },
  /* A net across the hall, the ball over it, crows above. */
  net(rect, w) {
    rect(0, 0, w, 26, 'amber');
    rect(0, 21, w, 5, 'honey');
    rect(0, 21, w, 1, 'paper');
    rect(0, 8, w, 1, 'paper');
    for (let y = 9; y < 17; y += 2) for (let x = (y % 4 ? 0 : 1); x < w; x += 2) rect(x, y, 1, 1, 'ink');
    rect(0, 17, w, 1, 'ink');
    const ball = Math.round(w * 0.58);
    disc(rect, ball, 4, 3, 'paper');
    rect(ball - 3, 4, 7, 1, 'denim');
    rect(ball, 1, 1, 7, 'mustard');
    for (let x = 18; x < w - 12; x += 47) {
      if (Math.abs(x - ball) < 10) continue;
      rect(x, 3, 3, 2, 'ink'); // a crow
      rect(x - 3, 2, 3, 1, 'ink');
      rect(x + 3, 2, 3, 1, 'ink');
    }
  },
  /* An apple in the dark, and a feather. */
  apple(rect, w) {
    rect(0, 0, w, 26, 'ink');
    const x = Math.round(w / 2);
    disc(rect, x, 14, 6, 'red');
    rect(x - 3, 10, 2, 2, 'paper');
    rect(x, 5, 1, 4, 'walnut');
    rect(x + 1, 5, 4, 2, 'leaf');
    if (w > 30) {
      line(rect, 4, 22, 13, 5, 'paper', 2);
      line(rect, w - 14, 4, w - 5, 20, 'steel');
    }
  },
  /* A cloth in green and black squares, and a wave that breaks along its foot. */
  checker(rect, w) {
    for (let y = 0; y < 26; y += 4) for (let x = 0; x < w; x += 4) rect(x, y, 4, 4, (x + y) % 8 ? 'ink' : 'leaf');
    for (let x = 0; x < w; x++) {
      const crest = 20 - Math.round(3 * Math.abs(Math.sin(x / 6)));
      rect(x, crest, 1, 26 - crest, 'denim');
      rect(x, crest, 1, 1, 'paper');
      if (x % 12 === 9) rect(x, crest - 2, 2, 2, 'paper');
    }
  },
  /* Stars and stripes of colour that cross the whole series. */
  stars(rect, w) {
    rect(0, 0, w, 26, 'violet');
    for (let x = -26; x < w; x += 22) {
      for (let y = 0; y < 26; y++) rect(x + y, y, 5, 1, 'magenta');
      for (let y = 0; y < 26; y++) rect(x + y + 11, y, 2, 1, 'night');
    }
    for (let x = 9; x < w - 4; x += 19) {
      const y = 6 + ((x * 5) % 14);
      rect(x - 2, y, 5, 1, 'mustard');
      rect(x, y - 2, 1, 5, 'mustard');
      rect(x - 1, y - 1, 3, 3, 'mustard');
    }
  },
};

/** A number from a title, the same on every visit: what gives a series its own colours. */
function seed(title: string): number {
  let hash = 7;
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

/** The colours of the spines of a series: its own when the data names them, drawn from its title otherwise. */
function look(series: Series): { spine: Swatch; mark: Swatch; band: Swatch; hash: number } {
  const hash = seed(series.title);
  const spine = series.spine ?? SPINES[hash % SPINES.length];
  const marks = MARKS.filter((color) => color !== spine);
  const mark = series.mark ?? marks[(hash >>> 5) % marks.length];
  const bands = marks.filter((color) => color !== mark);
  return { spine, mark, band: series.band ?? bands[(hash >>> 11) % bands.length], hash };
}

/** The picture of the front of a bookcase: every volume that stands in it. */
export function shelfPicture(shelf: number): CanvasTexture {
  const { width, height } = FRONTS[shelf].texels;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  const fill = (x: number, y: number, w: number, h: number, color: string) => {
    context.fillStyle = color;
    context.fillRect(x, y, w, h);
  };
  fill(0, 0, width, height, PALETTE.plum); // the shadow over the books, and the shelves still empty

  for (const run of RUNS) {
    if (run.shelf !== shelf) continue;
    const series = manga[run.series];
    const { spine, mark, band, hash } = look(series);
    const top = (TIERS - 1 - run.tier) * SPINE.tier;
    const wide = run.count * SPINE.width;
    /* What is drawn for this run stays inside it: the picture of a series is cut where the run ends. */
    const rect: Rect = (x, y, w, h, color) => {
      const [from, to] = [Math.max(x, 0), Math.min(x + w, wide)];
      const [high, low] = [Math.max(y, 0), Math.min(y + h, SPINE.height)];
      if (to > from && low > high) fill(run.x + from, top + high, to - from, low - high, PALETTE[color]);
    };
    rect(0, 0, wide, SPINE.height, spine);
    const mural = series.mural;
    if (mural && mural !== 'rainbow') {
      /* The picture of the whole series, moved so that this run shows its own part of it. */
      const offset = run.first * SPINE.width;
      MURALS[mural]((x, y, w, h, color) => rect(x - offset, y + PICTURE.top, w, Math.min(h, PICTURE.height - y), color), series.volumes * SPINE.width);
    }
    for (let k = 0; k < run.count; k++) {
      const x = k * SPINE.width;
      const number = run.first + k;
      if (mural === 'rainbow') {
        rect(x, 0, SPINE.width, SPINE.height, BRIGHT[(number * 3 + hash) % BRIGHT.length]);
        rect(x + 1, 4, 2, 12, number % 2 ? 'ink' : 'paper');
        rect(x, 30, SPINE.width, 2, 'ink');
      } else if (mural) {
        rect(x + 1, 2, 2, 6, mural === 'sea' ? BRIGHT[number % BRIGHT.length] : mark); // on this one the titles make a rainbow
      } else {
        rect(x + 1, 3, 2, 8 + (hash % 5), mark);
        rect(x + 1, 18 + (hash % 3), 1 + (number % 2), 2, band);
        rect(x, 27 + (hash % 3), SPINE.width, 2 + ((hash >>> 3) % 2), band);
        rect(x + 1, 33, 2, 1, mark);
      }
      fill(run.x + x + SPINE.width - 1, top, 1, SPINE.height, 'rgb(26 20 35 / 0.3)'); // the edge of the volume
    }
  }

  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.magFilter = NearestFilter;
  /* Seen from across the room a volume is narrower than a pixel: far away the picture is averaged into larger texels, which stay sharp. */
  map.minFilter = NearestMipmapNearestFilter;
  return map;
}
