/*
  What is written on the whiteboard of the 3D room: formulas of the MP2I and
  MPI programmes (mathematics, physics, computer science), each one named in
  the official texts of 2021. They are typed in the notation of
  src/room/voxel/text.ts and drawn in its pixel font. A pixel of the board is
  1 cm; a position is the top left corner of a capital letter.
*/
import type { Swatch } from '../room/voxel/palette.ts';

export const BOARD = { width: 105, height: 80 } as const;

export interface Note {
  text: string;
  at: [number, number];
  /** The marker: black for mathematics, blue for physics, green for computer science. */
  pen: Swatch;
}

const tex = String.raw;
const maths = (text: string, x: number, y: number): Note => ({ text, at: [x, y], pen: 'ink' });
const physics = (text: string, x: number, y: number): Note => ({ text, at: [x, y], pen: 'denim' });
const computing = (text: string, x: number, y: number): Note => ({ text, at: [x, y], pen: 'leaf' });

export const notes: Note[] = [
  maths(tex`e^{i\pi}+1=0`, 2, 3), // Euler's identity
  physics(tex`\Sigma F=ma`, 35, 3), // Newton's second law
  { text: 'P=NP ?', at: [74, 3], pen: 'red' }, // the open question behind the inclusion of P in NP

  maths('dim Ker f+rg f=dim E', 2, 12), // rank theorem
  physics('PV=nRT', 77, 12), // ideal gas law

  maths('P(A|B)=P(B|A)P(A)/P(B)', 2, 20), // Bayes' formula
  physics(tex`\lambda=h/p`, 82, 20), // de Broglie relation

  maths(tex`e^x=\Sigma x^n/n!`, 2, 28), // power series of the exponential
  physics(tex`\Delta U=W+Q`, 39, 28), // first law of thermodynamics
  physics(tex`E=h\nu`, 69, 28), // Planck-Einstein relation
  computing(tex`P\sub NP`, 88, 28), // inclusion of P in NP

  physics('n_1 sin i_1=n_2 sin i_2', 2, 36), // Snell-Descartes law
  maths(tex`\chi_A(A)=0`, 70, 36), // Cayley-Hamilton theorem

  computing(tex`\neg(A\and B)\equiv\neg A\or\neg B`, 2, 44), // De Morgan's law
  physics(tex`div E=\rho/\eps_0`, 52, 44), // Maxwell-Gauss equation
  computing(tex`\Gamma\vdash A`, 91, 44), // a sequent of natural deduction

  physics(tex`rot E=-\part_t B`, 2, 52), // Maxwell-Faraday equation
  maths(tex`a^{p-1}\equiv 1 [p]`, 45, 52), // Fermat's little theorem
  computing('f=g+h', 84, 52), // the cost that A* minimises

  physics(tex`\Delta x\Delta p\ge\hbar/2`, 2, 60), // Heisenberg's inequality
  computing(tex`S\to aSb|\eps`, 39, 60), // a context-free grammar
  maths(tex`A=PDP^{-1}`, 71, 60), // diagonalisation

  physics(tex`i\hbar\part_t\psi=H\psi`, 2, 68), // Schrodinger equation
  computing('O(n log n)', 40, 68), // merge sort
  computing('Rat=Rec', 76, 68), // Kleene's theorem
];

/** Lines drawn with the side of a marker: left, top, width, height. */
export const strokes: { at: [number, number]; size: [number, number]; pen: Swatch }[] = [
  /* A box around the open question. */
  { at: [71, 1], size: [28, 1], pen: 'red' },
  { at: [71, 9], size: [28, 1], pen: 'red' },
  { at: [71, 2], size: [1, 7], pen: 'red' },
  { at: [98, 2], size: [1, 7], pen: 'red' },
];
