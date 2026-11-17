/*
  What the objects of the 3D room show that site.ts does not already hold:
  which of them open a panel, the name of each one, and the few words that
  belong to the room alone.
*/
import { flight } from './pegboard.ts';
import type { Framing } from '../room/view.ts';
import { baccalaureate, education, languages, person } from './site.ts';

const [firstName] = person.name.split(' ');
const school = (id: (typeof education)[number]['id']) => education.find((entry) => entry.id === id)!;
const [cpge, epita] = [school('cpge'), school('epita')];

/**
 * A stop of the visit: objects of the room that open a panel. Its id is the
 * hash of the page and the id of its panel. `view` is where the camera goes.
 */
export interface Stop {
  id: string;
  label: string;
  objects: string[];
  view: Framing;
}

export const stops: Stop[] = [
  { id: 'education', label: 'Diplomas', objects: ['frame-bac', 'frame-prepa', 'frame-epita', 'frame-toeic'], view: { target: [0, 1.5, 0.88], zoom: 3 } },
  /* The camera comes round to face the main screen, which fills the viewport from side to side. */
  { id: 'projects', label: 'Projects', objects: ['monitor'], view: { target: [3.05, 1.08, 0.3], across: 1.3, azimuth: 0, elevation: 8 } },
  { id: 'contact', label: 'Contact', objects: ['door'], view: { target: [0, 1.1, 3.75], zoom: 2.2 } },
];

/** The framed diploma of the baccalaureate: its title, and the name written on it. */
export const bac = { title: 'BACCALAUREAT', holder: person.name };

/** The framed TOEIC certificate: the name it shows in its frame, what the list of languages says of it, and the total score read from that. */
const certified = languages.find(({ name }) => name === 'English')?.level.match(/\((.+ (\d+)\/\d+.*)\)/);
export const toeic = { title: 'TOEIC', line: certified?.[1], score: certified?.[2] };

/**
 * The diplomas of the row of frames, as the panel lists them: the frame of
 * each one, then what is known of it. `soon` is what the stamp says on a
 * diploma that is not awarded yet.
 */
export const diplomas = [
  {
    frame: 'frame-bac',
    title: baccalaureate.title,
    org: baccalaureate.academy,
    period: baccalaureate.session,
    note: `Specialities: ${baccalaureate.specialities.join(', ')}. ${baccalaureate.honours}. ${baccalaureate.section}.`,
    soon: null,
  },
  { frame: 'frame-prepa', title: cpge.title, org: `${cpge.org}, ${cpge.place}`, period: cpge.period.label, note: cpge.summary, soon: null },
  { frame: 'frame-epita', title: epita.title, org: epita.org, period: epita.period.label, note: epita.summary, soon: `Coming soon, ${epita.period.end}` },
  { frame: 'frame-toeic', title: toeic.title, org: null, period: null, note: toeic.line ?? null, soon: null },
] as const;

/** What the two portrait frames show, in capitals without accents: the pixel font has none. */
const plain = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
export const papers = {
  prepa: { title: plain(cpge.title.match(/MP2I.*$/)?.[0] ?? cpge.title).replace(' AND ', ' '), lines: plain(cpge.org).split(' '), foot: `${cpge.period.start}-${cpge.period.end}` },
  epita: { title: plain(epita.org), stamp: plain('Coming soon').split(' '), foot: epita.period.end },
};

/** The day circled on the calendar that opens over the room. */
export const birthday = { ...person.birthday, label: `${firstName}'s birthday` };

/** What is printed on the table number that stands on the wardrobe: two lines, a number, a name. */
export const tableNumber = { invite: ['INSTALLEZ', 'VOUS'], number: '14', brand: 'KFC' };

/** What is said in a bubble over an object when it is clicked. */
export const says = { dog: 'Woof!', nightstand: 'Locked' } as const;

/**
 * What a click shows large: the words that say what each picture is, and
 * the file of the real document when there is one. Without a file the
 * picture drawn in the room is enlarged.
 */
export const enlarged: Record<'frame-bac' | 'frame-toeic' | 'passes' | 'formulas', { caption: string; image: { src: string; width: number; height: number } | null }> = {
  /* The place of birth, the two signatures, the name under the first one and the number of the original are masked. */
  'frame-bac': {
    caption: `Diploma of the ${baccalaureate.title} of ${person.name}, ${baccalaureate.session} session: ${baccalaureate.honours}.`,
    image: { src: '/room/bac.webp', width: 1168, height: 848 },
  },
  /* The photo, the identification number and the QR code of the original are masked. */
  'frame-toeic': { caption: `TOEIC Listening and Reading, official score certificate of ${person.name}: total score ${toeic.score}.`, image: { src: '/room/toeic.webp', width: 1184, height: 606 } },
  passes: { caption: `A boarding pass from ${flight.from} to ${flight.to}, drawn in pixels.`, image: null },
  formulas: {
    caption: 'A sheet of Taylor expansions at 0: the exponential, the logarithm, the geometric series, a power of 1 + x, cosine, sine and tangent.',
    image: null,
  },
};

/** The name of each thing of the room that answers a click, shown beside the pointer. Those that open a panel take the label of their stop. */
export const labels: Record<string, string> = {
  ...Object.fromEntries(stops.flatMap(({ label, objects }) => objects.map((name) => [name, label]))),
  dog: person.dog,
  chair: 'Chair',
  'monitor-side': 'Second screen',
  keyboard: 'Keyboard',
  mouse: 'Mouse',
  'speaker-left': 'Speaker',
  'speaker-right': 'Speaker',
  dock: 'Controllers',
  lamp: 'Lamp',
  nightstand: 'Nightstand',
  book: 'Book',
  neon: 'Neon sign',
  pc: 'PC',
  homelab: 'NAS',
  printer: 'Printer',
  cv: 'CV',
  cabinet: 'Cabinet',
  'cabinet-door-left': 'Cabinet',
  'cabinet-door-right': 'Cabinet',
  wardrobe: 'Wardrobe',
  'wardrobe-door-north': 'Wardrobe',
  'wardrobe-door-south': 'Wardrobe',
  'table-number': 'Trophy',
  beacon: 'Warning light',
  passes: 'Boarding passes',
  formulas: 'Formula sheet',
  calendar: 'Calendar',
  whiteboard: 'Whiteboard',
  eraser: 'Whiteboard',
  figurines: 'Figurines',
  gon: 'Gon',
  ichigo: 'Ichigo',
  gundam: 'Gundam',
  duo: 'Figurines',
  meteorite: 'Meteorite',
  raspberry: 'Raspberry Pi 4',
  daruma: 'Daruma',
  'lucky-cat': 'Lucky cat',
  car: 'Hypercar',
  tiger: 'Tiger',
  'stamp-book': 'Stamp book',
  sakura: 'Sakura',
  'manga-east': 'Manga',
  'manga-south': 'Manga',
};

/** The desktop of projects, on the main screen. */
export const desktop = { name: 'SamOS' };

/** The words of its terminal. */
export const terminal = {
  greeting: 'Type help to see what this terminal can do.',
  help: ['help: this list', 'ls: the projects', 'cat about.txt: who I am', 'open <project>: open a project', 'cv: download my CV', 'contact: how to reach me', 'clear: empty the screen'],
  coffee: 'make: no rule to make target "coffee". There is only orange juice on this desk.',
  unknown: 'command not found. Try help.',
  missing: 'no such project',
  noFile: 'No such file',
  opening: 'Opening',
  cv: 'Downloading the CV.',
  noCv: 'No CV to hand out yet.',
};
