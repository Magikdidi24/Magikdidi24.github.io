/*
  What is written on the whiteboard of the 3D room: a few of the best-known
  formulas of the MP2I and MPI programmes, and a doodle. They are typed in
  the notation of src/room/voxel/text.ts and drawn in its large pixel font.

  A pixel of the board is laid on one pixel of the room seen from its default
  view (see `texelFit`): about 2 cm wide and 1.7 cm high on a desktop screen,
  so the formulas can be read from there without zooming in. A position is
  the top left corner of a capital letter.
*/
import type { Swatch } from '../room/voxel/palette.ts';

export const BOARD = { width: 62, height: 72 } as const;

export interface Note {
  text: string;
  at: [number, number];
  /** The marker: black for mathematics, blue for physics, red for the open question. */
  pen: Swatch;
}

const tex = String.raw;

export const notes: Note[] = [
  { text: tex`e^{i\pi}+1=0`, at: [3, 5], pen: 'ink' }, // Euler's identity
  { text: 'P=NP ?', at: [3, 19], pen: 'red' }, // the open question of complexity theory
  { text: tex`\Sigma F=ma`, at: [3, 33], pen: 'denim' }, // Newton's second law
  { text: 'PV=nRT', at: [3, 46], pen: 'denim' }, // ideal gas law
  { text: tex`A=PDP^{-1}`, at: [3, 59], pen: 'ink' }, // diagonalisation
];

/** A small drawing, a character per pixel, each standing for a marker; "." is the board. Elfy, and a heart. */
export const doodle: { at: [number, number]; rows: string[]; pens: Record<string, Swatch> } = {
  at: [44, 33],
  pens: { k: 'ink', r: 'red' },
  rows: [
    '.........r.r...',
    '........rrrrr..',
    '.........rrr...',
    '.kk.......r.kk.',
    'k..k.kkkkk.k..k',
    'k...k.....k...k',
    'k..k.......k..k',
    'k..k.k...k.k..k',
    '.kk.........kk.',
    '..k...kkk...k..',
    '..k....k....k..',
    '...k..k.k..k...',
    '....kk...kk....',
  ],
};
