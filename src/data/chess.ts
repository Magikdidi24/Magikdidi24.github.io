/*
  The game on the chessboard of the window sill: White mates in two on the
  back rank. The queen gives itself up on e8, the rook that takes it leaves
  the rank, and the other rook mates. Squares are written as on a board: a
  file from a to h, then a rank from 1 to 8.
*/
export type Piece = 'K' | 'Q' | 'R' | 'P';

export const position: Record<'white' | 'black', Partial<Record<Piece, string[]>>> = {
  white: { K: ['g1'], Q: ['e2'], R: ['e1'], P: ['f2', 'g2', 'h2'] },
  black: { K: ['g8'], R: ['d8'], P: ['f7', 'g7', 'h7'] },
};

/** The three moves, in order: from where, to where. Each of the last two takes the piece that the move before brought there. */
export const moves = [
  { from: 'e2', to: 'e8' },
  { from: 'd8', to: 'e8' },
  { from: 'e1', to: 'e8' },
] as const;

/** A square as a file and a rank, both from 0. */
export const square = (name: string): [number, number] => [name.charCodeAt(0) - 97, Number(name[1]) - 1];
