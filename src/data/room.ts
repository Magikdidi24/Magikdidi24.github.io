/*
  What the objects of the 3D room show that site.ts does not already hold.
*/
import { languages, person } from './site.ts';

const [firstName] = person.name.split(' ');

/** The framed diploma of the baccalaureate: its title, and the name written on it. */
export const bac = { title: 'BACCALAUREAT', holder: person.name };

/** The framed TOEIC certificate: its title, the name on it and the total score, read from the list of languages. */
export const toeic = {
  title: 'TOEIC',
  holder: person.name,
  score: languages.find(({ name }) => name === 'English')?.level.match(/(\d+)\/\d+/)?.[1],
};

/** The cross on the calendar that opens over the room. */
export const birthday = { ...person.birthday, label: `${firstName}'s birthday` };

/**
 * What a click shows large: the words that say what each picture is, and
 * the file of the real document when there is one. Without a file the
 * picture drawn in the room is enlarged.
 */
export const enlarged: Record<'whiteboard' | 'frame-bac' | 'frame-toeic', { caption: string; image: string | null }> = {
  whiteboard: {
    caption:
      "The whiteboard: Euler's identity, the question P = NP?, Newton's second law, the ideal gas law, the diagonalisation of a matrix, and a drawing of Elfy the dog.",
    image: null,
  },
  /* TODO(Samuel): the scan of the diploma, once he has it. */
  'frame-bac': { caption: `Baccalaureate diploma of ${person.name}, drawn in pixels.`, image: null },
  /* The photo, the identification number, the date of birth and the QR code of the original are masked. */
  'frame-toeic': { caption: `TOEIC Listening and Reading, official score certificate of ${person.name}: total score ${toeic.score}.`, image: '/room/toeic.webp' },
};
