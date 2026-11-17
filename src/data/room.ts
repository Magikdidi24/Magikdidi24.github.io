/*
  What the objects of the 3D room show that site.ts does not already hold:
  which of them open a panel, the name of each one, and the few words that
  belong to the room alone.
*/
import { flight } from './pegboard.ts';
import type { Framing } from '../room/view.ts';
import type { Swatch } from '../room/voxel/palette.ts';
import { baccalaureate, coursework, education, experience, languages, openSource, person, preparatory, research, skills } from './site.ts';

const [firstName] = person.name.split(' ');
/** The city he lives in: what the window looks out on by day. */
const [home] = person.home.split(',');
/** In capitals without accents: the pixel font has none. */
const plain = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
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
  /** It is a stop at night only: by day its object opens nothing, and says a word instead (see `says`). */
  night?: true;
  /** What the list of things to do says of it, on the desktop of the main screen. None for that desktop itself. */
  task?: string;
}

/* In the order of the menu, which is also that of the page without JavaScript: the work, the projects, the studies, the rest. */
export const stops: Stop[] = [
  { id: 'research', label: 'Research', objects: ['meteorite'], view: { target: [3.56, 1.58, 0.1], across: 0.9 }, task: 'Find the rock that fell from space' },
  /* The book on the nightstand is about compilers. Seen from the foot of the bed, to face its cover. */
  { id: 'compiler', label: 'Compiler work', objects: ['book'], view: { target: [1.72, 0.64, 0.36], across: 1.4, azimuth: 12, elevation: 30 }, task: 'Open the book on the nightstand' },
  {
    id: 'open-source',
    label: 'Open source',
    objects: ['pegboard', 'badges', 'bonsai', 'gem'],
    view: { target: [2.8, 1.68, 0.05], across: 1.6 },
    task: 'Look at what hangs on the pegboard',
  },
  /* The camera comes round to face the main screen, which fills the viewport from side to side. */
  { id: 'projects', label: 'Projects', objects: ['monitor'], view: { target: [3.05, 1.08, 0.3], across: 1.3, azimuth: 0, elevation: 8 } },
  /* From higher up: the keys are read from above. */
  { id: 'skills', label: 'Skills', objects: ['keyboard'], view: { target: [3.05, 0.78, 0.62], across: 0.9, elevation: 50 }, task: 'Press a key of the keyboard' },
  {
    id: 'education',
    label: 'Diplomas',
    objects: ['frame-bac', 'frame-prepa', 'frame-toeic', 'frame-epita'],
    view: { target: [0, 1.5, 0.88], zoom: 3 },
    task: 'Look at the frames above the bed',
  },
  /* The window looks out on Tokyo by night only: by day it shows Paris, and says so. */
  { id: 'tokyo', label: 'Tokyo', night: true, objects: ['window'], view: { target: [0.55, 1.5, 0], zoom: 2.6 }, task: 'Look out of the window at night' },
  /* Close, and nearly face on: the sheet is to be read. */
  { id: 'prologin', label: 'Prologin', objects: ['clipboard'], view: { target: [0.3, 1.28, 3.28], across: 1.1, azimuth: 20 }, task: 'Read the clipboard on the wardrobe' },
  { id: 'contact', label: 'Contact', objects: ['door'], view: { target: [0, 1.1, 3.75], zoom: 2.2 }, task: 'Knock on the door' },
];

/**
 * What there is to find in the room: every stop of the visit but the desktop
 * of the main screen, which lists them, then two things that open no panel,
 * the CV that the printer hands out and the calendar. Each stays locked on
 * that desktop until it has been found.
 */
export const finds: { id: string; label: string; night?: true; task: string }[] = [
  ...stops.flatMap(({ id, label, night, task }) => (task ? [{ id, label, night, task }] : [])),
  { id: 'cv', label: 'CV', task: 'Print something' },
  { id: 'calendar', label: 'Calendar', task: 'See what the calendar has circled' },
];

/** The framed diploma of the baccalaureate: its title, and the name written on it. */
export const bac = { title: 'BACCALAUREAT', holder: person.name };

/** The framed TOEIC certificate: the name it shows in its frame, what the list of languages says of it, and the total score read from that. */
const certified = languages.find(({ name }) => name === 'English')?.level.match(/\((.+ (\d+)\/\d+.*)\)/);
export const toeic = { title: 'TOEIC', line: certified?.[1], score: certified?.[2] };

/**
 * The diplomas of the row of frames, as the panel lists them and as they
 * hang, from left to right: the frame of each one, then what is known of it. `soon` is what the stamp says on a
 * diploma that is not awarded yet.
 */
export const diplomas = [
  {
    frame: 'frame-bac',
    title: baccalaureate.title,
    org: `${baccalaureate.place}, ${baccalaureate.academy}`,
    period: baccalaureate.session,
    note: `Specialities: ${baccalaureate.specialities.join(', ')}. ${baccalaureate.honours}. ${baccalaureate.section}.`,
    soon: null,
  },
  { frame: 'frame-prepa', title: cpge.title, org: `${cpge.org}, ${cpge.place}`, period: cpge.period.label, note: `${cpge.summary} ${preparatory.outcome}`, soon: null },
  { frame: 'frame-toeic', title: toeic.title, org: null, period: null, note: toeic.line ?? null, soon: null },
  { frame: 'frame-epita', title: epita.title, org: epita.org, period: epita.period.label, note: epita.summary, soon: `Coming soon, ${epita.period.end}` },
] as const;

/** What the two portrait frames show. */
export const papers = {
  prepa: { title: plain(cpge.title.match(/MP2I.*$/)?.[0] ?? cpge.title).replace(' AND ', ' '), lines: plain(cpge.org).split(' '), foot: `${cpge.period.start}-${cpge.period.end}` },
  epita: { title: plain(epita.org), stamp: plain('Coming soon').split(' '), foot: epita.period.end },
};

/** The day circled on the calendar that opens over the room. */
export const birthday = { ...person.birthday, label: `${firstName}'s birthday` };

/** The month circled on it, and on the page of the calendar that hangs in the room: when the internship starts. */
const [year, month] = person.nextStep.start.split('-').map(Number);
export const milestone = {
  year,
  month,
  title: new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1)),
  label: person.nextStep.sentence,
};

/**
 * The keys of the keyboard that light up: one for each skill, then one for
 * each language he speaks, in the colour of its group.
 */
const TINTS: Swatch[] = ['cyan', 'magenta', 'violet', 'lime'];
export const spoken = { group: 'Spoken languages', color: 'amber' as Swatch };
export const keycaps: { name: string; group: string; color: Swatch }[] = [
  ...skills.flatMap(({ group, items }, i) => items.map((name) => ({ name, group, color: TINTS[i] }))),
  ...languages.map(({ name }) => ({ name, ...spoken })),
];

/**
 * What is written on the things that the stops of the visit hang in the
 * room, in the capitals of the pixel font: the card in front of the
 * meteorite, the tags and the label on the pegboard, the sheet of the
 * clipboard, the page of the wall calendar, the display of the power supply.
 */
const { width, height, channels } = research.cube;
export const written = {
  specimen: { name: 'CHONDRITE', size: `${width}x${height}x${channels}` },
  merged: { word: 'MERGED', numbers: openSource.prs.filter(({ status }) => status === 'merged').map(({ number }) => `#${number}`) },
  bonsai: 'TREE-SITTER', // the parser generator his fork is a grammar for
  contest: { title: plain(experience.find(({ id }) => id === 'prologin')!.org), stamp: 'REVIEWED' },
  page: plain(milestone.title),
  uptime: 'UPTIME',
  /* The cover of the book on the nightstand, as it is printed: its title, a line each, and its author. */
  book: { title: ['modern', 'compiler', 'implementation', 'in ML'], author: 'andrew w. appel' },
};

/** What is printed on the table number that stands on the wardrobe: two lines, a number, a name. */
export const tableNumber = { invite: ['INSTALLEZ', 'VOUS'], number: '14', brand: 'KFC' };

/** What the page says once the room is built, in place of "Loading the room": the button under it lets the visitor in. */
export const loading = { ready: 'The room is ready' };

/** The three things that are outlined in turn on a first visit, as a hint that the room answers a click: the projects, the research, how to reach him. */
export const hints = ['monitor', 'meteorite', 'door'];

/** What is said in a bubble over an object when it is clicked: the window says it by day, when it opens no panel. */
export const says = { dog: 'Woof!', window: home, nightstand: 'Locked', muted: 'Sound is off', off: 'The PC is off' } as const;

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
  mouse: 'Mouse',
  'speaker-left': 'Speaker',
  'speaker-right': 'Speaker',
  dock: 'Controllers',
  lamp: 'Lamp',
  nightstand: 'Nightstand',
  pc: 'PC',
  homelab: 'NAS',
  printer: 'Printer',
  cv: 'CV',
  whiteboard: 'Whiteboard',
  eraser: 'Whiteboard',
  neon: 'Neon sign',
  cabinet: 'Cabinet',
  'cabinet-door-left': 'Cabinet',
  'cabinet-door-right': 'Cabinet',
  'console-grey': 'NES',
  'console-black': 'PlayStation',
  'console-cube': 'GameCube',
  'console-ring': 'Xbox 360',
  'console-white': 'Wii',
  handheld: 'Game Boy',
  'handheld-wide': 'Nintendo DS',
  wardrobe: 'Wardrobe',
  'wardrobe-door-north': 'Wardrobe',
  'wardrobe-door-south': 'Wardrobe',
  'table-number': 'Trophy',
  beacon: 'Warning light',
  passes: 'Boarding passes',
  formulas: 'Formula sheet',
  calendar: 'Calendar',
  figurines: 'Figurines',
  gon: 'Gon',
  ichigo: 'Ichigo',
  gundam: 'Gundam',
  duo: 'Figurines',
  raspberry: 'Raspberry Pi 4',
  daruma: 'Daruma',
  'lucky-cat': 'Lucky cat',
  car: 'Hypercar',
  tiger: 'Tiger',
  'stamp-book': 'Stamp book',
  'manga-east': 'Manga',
  'manga-south': 'Manga',
};

/**
 * The words of the projects that can be played in their window of the
 * desktop: the program itself runs in the page, compiled to WebAssembly
 * (scripts/demos). `{depth}` and `{positions}` are filled in by the engine.
 */
export const demos = {
  loading: 'Loading the program.',
  failed: 'The program could not start in this browser.',
  fluid: {
    title: 'Try it',
    hint: 'This is the C program itself, running in the page. Pick a liquid and draw with the mouse or a finger; the right button erases. The keys of the original work when the picture has the focus.',
    picture: 'The grid of the simulator: draw on it.',
    tools: 'What to draw',
    wall: 'Wall',
    eraser: 'Eraser',
    pressure: 'Pressure view',
    empty: 'Empty the grid',
  },
  /* The small C programs: each runs as it is, main() and loop included. */
  program: {
    hint: 'This is the C program itself, running in the page: its main() and its loop, unchanged. It reads your keyboard, and the buttons under its picture.',
    picture: 'The window of the program',
    run: 'Run the program',
    again: 'Run it again',
    ended: 'The program has ended.',
    keys: 'The keys it reads',
    keyNames: { ' ': 'Space', ArrowLeft: 'Left', ArrowUp: 'Up', ArrowDown: 'Down', ArrowRight: 'Right' } as Record<string, string>,
    terminal: 'What it prints to its terminal',
    code: 'Code on GitHub',
  },
  chess: {
    title: 'Play against the engine',
    hint: 'This is the Rust engine itself, running in the page. You play White; it thinks for about a second.',
    board: 'Chess board',
    newGame: 'New game',
    yourMove: 'Your move.',
    thinking: 'The engine is thinking.',
    check: 'Check.',
    searched: 'Depth {depth}, {positions} positions searched.',
    promote: 'Promote to',
    empty: 'empty',
    colours: ['white', 'black'],
    pieces: ['king', 'queen', 'rook', 'bishop', 'knight', 'pawn'],
    /* How a game ends, by the status the engine gives. The first two are a checkmate, by who is mated. */
    results: {
      mated: 'Checkmate: the engine wins.',
      mates: 'Checkmate: you win.',
      2: 'Stalemate: a draw.',
      3: 'A draw by the 50-move rule.',
      4: 'A draw: not enough material to mate.',
      5: 'A draw by repetition.',
    },
  },
};

/**
 * The small C programs that run in a window of the desktop, by the name of
 * their repository in src/data/projects.ts: the file of the program in
 * public/room/demos, and the keys it reads, for the buttons under its
 * picture. `cell` is the side of a cell of its grid, in its own pixels, when
 * it reads the mouse: the page then clicks in every cell the pointer goes
 * through with its button down, where the program alone wants a click for
 * each. The id of its window comes from the name of the repository.
 */
export const programs: { repo: string; file: string; keys: string[]; cell?: number }[] = [
  { repo: 'Snake_in_C', file: 'snake', keys: ['ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'] },
  { repo: 'Pong_in_C', file: 'pong', keys: ['z', 's', 'ArrowUp', 'ArrowDown'] },
  { repo: 'Game_of_life_in_C', file: 'life', keys: [' '], cell: 20 },
  { repo: '3Dcube_in_C', file: 'cube', keys: [] },
  { repo: 'Bouncy_in_C', file: 'ball', keys: [' '] },
];
export const windowOf = (repo: string) => repo.toLowerCase().replaceAll('_', '-');

/**
 * The desktop of projects, on the main screen: its name, the heading over
 * what there is to find in the room, the title of the list of things to do,
 * what a locked icon answers, and the count under the list. `{found}` and
 * `{all}` are filled in by the page.
 */
export const desktop = { name: 'SamOS', places: 'In the room', todo: 'To do', locked: 'Locked. To do first:', count: '{found} of {all} found' };

/** What a speaker shows over itself when it is clicked: said aloud for those who do not see it. */
export const music = 'Music';

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
  /* What help does not list: a command, and what it answers. `ls -a` shows a file that names them. */
  hidden: {
    whoami: ['visitor'],
    pwd: [`/home/${firstName.toLowerCase()}/room`],
    woof: [says.dog],
    '42sh': coursework.filter(({ name }) => name === '42sh').map(({ name, summary }) => `${name}: ${summary}`),
    sudo: [`visitor is not in the sudoers file. ${person.dog} has been told.`],
    rm: ['rm: nothing leaves this room.'],
  },
  lights: 'Click.',
};
