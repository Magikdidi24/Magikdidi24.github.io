/*
  What is written on the whiteboard of the 3D room: formulas of the MP2I and
  MPI programmes (mathematics, physics, computer science), each one named in
  the official texts of 2021. They are typed in the notation of
  src/room/voxel/text.ts and drawn in its pixel fonts. A pixel of the board
  is 5 mm; a position is the top left corner of a capital letter.
*/
import type { Swatch } from '../room/voxel/palette.ts';

export const BOARD = { width: 210, height: 160 } as const;

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
  maths(tex`e^{i\pi}+1=0`, 3, 5), // Euler's identity
  physics(tex`\Sigma F=ma`, 52, 5), // Newton's second law
  physics('PV=nRT', 94, 5), // ideal gas law
  { text: 'P=NP ?', at: [160, 5], pen: 'red' }, // the open question behind the inclusion of P in NP

  maths('dim Ker f+rg f=dim E', 3, 18), // rank theorem
  maths(tex`|<x|y>|\le||x||.||y||`, 110, 18), // Cauchy-Schwarz inequality
  physics(tex`E=h\nu`, 182, 18), // Planck-Einstein relation

  maths('P(A|B)=P(B|A)P(A)/P(B)', 3, 31), // Bayes' formula
  physics(tex`\lambda=h/p`, 120, 31), // de Broglie relation
  physics(tex`\Delta U=W+Q`, 160, 31), // first law of thermodynamics

  maths(tex`e^x=\Sigma x^n/n!`, 3, 44), // power series of the exponential
  physics('n_1 sin i_1=n_2 sin i_2', 60, 44), // Snell-Descartes law
  maths(tex`\chi_A(A)=0`, 150, 44), // Cayley-Hamilton theorem
  computing(tex`\Gamma\vdash A`, 190, 44), // a sequent of natural deduction

  computing(tex`\neg(A\and B)\equiv\neg A\or\neg B`, 3, 57), // De Morgan's law
  physics(tex`div E=\rho/\eps_0`, 80, 57), // Maxwell-Gauss equation
  physics(tex`rot E=-\part_t B`, 140, 57), // Maxwell-Faraday equation

  maths(tex`\int u'v=[uv]-\int uv'`, 3, 70), // integration by parts
  maths(tex`a^{p-1}\equiv 1 [p]`, 84, 70), // Fermat's little theorem
  physics(tex`T^2/a^3=4\pi^2/GM`, 140, 70), // Kepler's third law

  maths(tex`P(|X-m|\ge a)\le V/a^2`, 3, 83), // Bienayme-Chebyshev inequality
  computing(tex`P\sub NP`, 88, 83), // inclusion of P in NP
  computing('SAT: NP-complete', 120, 83), // Cook-Levin theorem

  physics(tex`\Delta x\Delta p\ge\hbar/2`, 3, 96), // Heisenberg's inequality
  computing(tex`S\to aSb|\eps`, 60, 96), // a context-free grammar
  maths(tex`A=PDP^{-1}`, 107, 96), // diagonalisation
  physics(tex`e=-d\Phi/dt`, 155, 96), // Faraday's law of induction

  physics(tex`i\hbar\part_t\psi=H\psi`, 3, 109), // Schrodinger equation
  computing('O(n log n)', 55, 109), // merge sort
  computing('Rat=Rec', 112, 109), // Kleene's theorem
  computing('f=g+h', 163, 109), // the cost that A* minimises

  computing('T(n)=2T(n/2)+O(n)', 3, 122), // divide and conquer
  physics(tex`j=-\lambda grad T`, 103, 122), // Fourier's law
  maths('au+bv=1', 166, 122), // Bezout's identity

  physics(tex`E_n=n^2h^2/8mL^2`, 3, 135), // energy levels of the infinite well
  computing(tex`uv^*w\sub L`, 77, 135), // pumping lemma
  maths(tex`X=e^{tA}X_0`, 122, 135), // linear differential systems
];

/** Lines drawn with the side of a marker: left, top, width, height. */
export const strokes: { at: [number, number]; size: [number, number]; pen: Swatch }[] = [
  /* A box around the open question. */
  { at: [156, 1], size: [40, 1], pen: 'red' },
  { at: [156, 14], size: [40, 1], pen: 'red' },
  { at: [156, 2], size: [1, 12], pen: 'red' },
  { at: [195, 2], size: [1, 12], pen: 'red' },
];
