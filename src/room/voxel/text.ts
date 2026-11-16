/*
  A tiny pixel font for what is written by hand in the room: the formulas of
  the whiteboard. A capital is 5 pixels high. A line is typed in ASCII with
  three TeX habits: \name for a symbol, ^ and _ for a raised or lowered
  glyph, braces to group several of them. Pure: no DOM, so it runs under
  `node --test` (tests/text.test.mjs).
*/

/** Each glyph: its rows from the top, "#" for ink. Five rows stand on the baseline; a sixth hangs under it. */
export const GLYPHS: Record<string, string[]> = Object.fromEntries(
  Object.entries({
    0: '###/#.#/#.#/#.#/###',
    1: '.#./##./.#./.#./###',
    2: '###/..#/###/#../###',
    3: '###/..#/.##/..#/###',
    4: '#.#/#.#/###/..#/..#',
    5: '###/#../###/..#/###',
    6: '###/#../###/#.#/###',
    7: '###/..#/.#./.#./.#.',
    8: '###/#.#/###/#.#/###',
    9: '###/#.#/###/..#/###',
    A: '.#./#.#/###/#.#/#.#',
    B: '##./#.#/##./#.#/##.',
    C: '.##/#../#../#../.##',
    D: '##./#.#/#.#/#.#/##.',
    E: '###/#../##./#../###',
    F: '###/#../##./#../#..',
    G: '.##/#../#.#/#.#/.##',
    H: '#.#/#.#/###/#.#/#.#',
    I: '###/.#./.#./.#./###',
    J: '..#/..#/..#/#.#/.#.',
    K: '#.#/##./#../##./#.#',
    L: '#../#../#../#../###',
    M: '#...#/##.##/#.#.#/#...#/#...#',
    N: '#..#/##.#/#.##/#..#/#..#',
    O: '.#./#.#/#.#/#.#/.#.',
    P: '##./#.#/##./#../#..',
    Q: '.##./#..#/#..#/#.#./.#.#',
    R: '##./#.#/##./#.#/#.#',
    S: '.##/#../.#./..#/##.',
    T: '###/.#./.#./.#./.#.',
    U: '#.#/#.#/#.#/#.#/###',
    V: '#.#/#.#/#.#/#.#/.#.',
    W: '#...#/#...#/#.#.#/##.##/#...#',
    X: '#.#/#.#/.#./#.#/#.#',
    Y: '#.#/#.#/.#./.#./.#.',
    Z: '###/..#/.#./#../###',
    a: '.../.../.##/#.#/.##',
    b: '#../#../##./#.#/##.',
    c: '.../.../.##/#../.##',
    d: '..#/..#/.##/#.#/.##',
    e: '.../.#./#.#/##./.##',
    f: '.##/.#./###/.#./.#.',
    g: '.../.../.##/#.#/.##/##.',
    h: '#../#../##./#.#/#.#',
    i: '#/./#/#/#',
    j: '.#/../.#/.#/.#/#.',
    k: '#../#../#.#/##./#.#',
    l: '#/#/#/#/#',
    m: '...../...../##.#./#.#.#/#.#.#',
    n: '.../.../##./#.#/#.#',
    o: '.../.../.#./#.#/.#.',
    p: '.../.../##./#.#/##./#..',
    q: '.../.../.##/#.#/.##/..#',
    r: '../../##/#./#.',
    s: '.../.##/#../..#/##.',
    t: '.#./.#./###/.#./.##',
    u: '.../.../#.#/#.#/.##',
    v: '.../.../#.#/#.#/.#.',
    w: '...../...../#.#.#/#.#.#/.#.#.',
    x: '.../.../#.#/.#./#.#',
    y: '.../.../#.#/#.#/.#./#..',
    z: '.../.../###/.#./###',
    '+': '.../.#./###/.#./...',
    '-': '.../.../###/.../...',
    '=': '.../###/.../###/...',
    '(': '.#/#./#./#./.#',
    ')': '#./.#/.#/.#/#.',
    '[': '##/#./#./#./##',
    ']': '##/.#/.#/.#/##',
    '|': '#/#/#/#/#',
    '/': '..#/..#/.#./#../#..',
    "'": '#/#/././.',
    ',': './././#/#',
    '.': '././././#',
    ':': './#/./#/.',
    '!': '#/#/#/./#',
    '?': '###/..#/.#./.../.#.',
    '<': '..#/.#./#../.#./..#',
    '>': '#../.#./..#/.#./#..',
    '*': '.../#.#/.#./#.#/...',
    /* Greek */
    alpha: '..../..../.#.#/#.#./.#.#',
    chi: '.../.../#.#/.#./.#./#.#',
    eps: '.../.../.##/##./.##',
    lambda: '#../.#./.#./#.#/#.#',
    mu: '.../.../#.#/#.#/###/#..',
    nu: '.../.../#.#/#.#/##.',
    omega: '...../...../#...#/#.#.#/.#.#.',
    pi: '...../...../#####/.#.#./.#.#.',
    psi: '#.#.#/#.#.#/.###./..#../..#..',
    rho: '.../.../.#./#.#/##./#..',
    Delta: '.#./.#./#.#/#.#/###',
    Gamma: '###/#../#../#../#..',
    Phi: '.#./###/#.#/###/.#.',
    Sigma: '###/#../.#./#../###',
    /* Signs */
    and: '.../.#./.#./#.#/#.#',
    equiv: '###/.../###/.../###',
    ge: '##../..##/##../..../####',
    hbar: '#../###/##./#.#/#.#',
    in: '.##/#../###/#../.##',
    int: '..#/.#./.#./.#./.#./#..',
    le: '..##/##../..##/..../####',
    ne: '..#/###/.#./###/#..',
    neg: '.../###/..#/.../...',
    or: '.../#.#/#.#/.#./.#.',
    part: '.##/..#/.##/#.#/.#.',
    sub: '.##/#../.##/.../###',
    to: '...../...#./#####/...#./.....',
    vdash: '#../#../###/#../#..',
  }).map(([name, rows]) => [name, rows.split('/')]),
);

export interface Line {
  /** The ink: x from the left edge, y from the top of a capital, so negative in a raised glyph. */
  pixels: [number, number][];
  width: number;
}

/** Pixels a raised or lowered glyph moves by. */
const SHIFT = 2;
/** Width of a space. Glyphs stand one pixel apart. */
const SPACE = 2;

/** The glyph names of a run of source: a character each, or a \command with the space that ends it. */
const names = (source: string) => source.match(/\\[a-zA-Z]+ ?|[^]/g) ?? [];

/** Lay out one line of formula source. A character or command with no glyph is an error. */
export function typeset(source: string): Line {
  const pixels: [number, number][] = [];
  let x = 0;
  const draw = (run: string, shift: number) => {
    for (const token of names(run)) {
      if (token === ' ') {
        x += SPACE;
        continue;
      }
      const name = token.startsWith('\\') ? token.slice(1).trimEnd() : token;
      const glyph = GLYPHS[name];
      if (!glyph) throw new Error(`no glyph for "${name}" in "${source}"`);
      glyph.forEach((row, j) => [...row].forEach((cell, i) => cell === '#' && pixels.push([x + i, j + shift])));
      x += glyph[0].length + 1;
    }
  };

  /* A script is "^" or "_" and what it applies to: a group in braces, or one glyph. */
  for (const [part, mark, group, single] of source.matchAll(/([\^_])(?:\{([^}]*)\}|(\\[a-zA-Z]+ ?|[^]))|\\[a-zA-Z]+ ?|[^]/g)) {
    if (mark) draw(group ?? single, mark === '^' ? -SHIFT : SHIFT);
    else draw(part, 0);
  }
  return { pixels, width: Math.max(0, ...pixels.map(([px]) => px + 1)) };
}
