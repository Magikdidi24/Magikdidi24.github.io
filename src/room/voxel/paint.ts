/*
  Small pictures drawn on a 2D canvas with palette colours only, for what is
  too fine for voxels: screens, papers, posters. Each one becomes a texture
  sampled without smoothing.
*/
import { CanvasTexture, NearestFilter, SRGBColorSpace } from 'three';
import { PALETTE, type Swatch } from './palette.ts';

type Painter = (rect: (x: number, y: number, w: number, h: number, color: Swatch) => void) => void;

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
