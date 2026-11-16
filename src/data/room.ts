/*
  What the objects of the 3D room show that site.ts does not already hold.
*/
import { flight } from './pegboard.ts';
import { languages, person } from './site.ts';

const [firstName] = person.name.split(' ');

/** The framed diploma of the baccalaureate: its title, and the name written on it. */
export const bac = { title: 'BACCALAUREAT', holder: person.name };

/** The framed TOEIC certificate: the name it shows in its frame, and the total score, read from the list of languages. */
export const toeic = {
  title: 'TOEIC',
  score: languages.find(({ name }) => name === 'English')?.level.match(/(\d+)\/\d+/)?.[1],
};

/** The day circled on the calendar that opens over the room. */
export const birthday = { ...person.birthday, label: `${firstName}'s birthday` };

/** What is said in a bubble over an object when it is clicked. */
export const says = { dog: 'Woof!', nightstand: 'Locked' } as const;

/**
 * What a click shows large: the words that say what each picture is, and
 * the file of the real document when there is one. Without a file the
 * picture drawn in the room is enlarged.
 */
export const enlarged: Record<'frame-bac' | 'frame-toeic' | 'passes' | 'formulas', { caption: string; image: string | null }> = {
  /* TODO(Samuel): the scan of the diploma, once he has it. */
  'frame-bac': { caption: `Baccalaureate diploma of ${person.name}, drawn in pixels.`, image: null },
  /* The photo, the identification number and the QR code of the original are masked. */
  'frame-toeic': { caption: `TOEIC Listening and Reading, official score certificate of ${person.name}: total score ${toeic.score}.`, image: '/room/toeic.webp' },
  passes: { caption: `A boarding pass from ${flight.from} to ${flight.to}, drawn in pixels.`, image: null },
  formulas: {
    caption: 'A sheet of Taylor expansions at 0: the exponential, the logarithm, the geometric series, a power of 1 + x, cosine, sine and tangent.',
    image: null,
  },
};
