/*
  The sounds of the room, made in code: there is no audio file. They are off
  until the visitor turns them on. A sound is a few notes, each one an
  oscillator with its own rise and fall.
*/

/**
 * A note: when it starts and how long it lasts, in seconds, its pitch in
 * hertz (two of them to glide from one to the other), its wave, and how
 * loud it is, from 0 to 1.
 */
export interface Note {
  at: number;
  for: number;
  pitch: number | [number, number];
  wave: OscillatorType;
  loud: number;
}

const note = (at: number, length: number, pitch: Note['pitch'], wave: OscillatorType, loud: number): Note => ({ at, for: length, pitch, wave, loud });
/** Notes of one voice played one after the other, `every` seconds apart, each lasting `length`. */
const run = (from: number, every: number, length: number, pitches: number[], wave: OscillatorType, loud: number): Note[] =>
  pitches.map((pitch, i) => note(from + i * every, length, pitch, wave, loud));

/**
 * What each console plays as it is switched on, by the name of its object.
 * Written for the room, in the manner of each machine: none is the sound
 * that the real console makes.
 */
export const JINGLES: Record<string, Note[]> = {
  /* The NES: a square wave climbs over a held bass, as on eight bits. */
  'console-grey': [note(0, 0.95, 130.81, 'triangle', 0.3), ...run(0, 0.1, 0.1, [659.25, 783.99, 1046.5, 1318.51], 'square', 0.1), note(0.42, 0.1, 1174.66, 'square', 0.1), note(0.52, 0.45, 1567.98, 'square', 0.1)],
  /* The PlayStation: a low note that rises an octave, a chord that opens over it, two high bells. */
  'console-black': [
    note(0, 2.2, [55, 110], 'sine', 0.5),
    note(0.5, 1.8, 220, 'triangle', 0.14),
    note(0.8, 1.5, 329.63, 'triangle', 0.12),
    note(1.1, 1.2, 554.37, 'triangle', 0.1),
    note(1.5, 0.8, 1318.51, 'sine', 0.1),
    note(1.75, 0.65, 1760, 'sine', 0.08),
  ],
  /* The GameCube: notes that bounce up, something that drops, and a chord to land on. */
  'console-cube': [
    ...run(0, 0.11, 0.08, [523.25, 659.25, 783.99, 659.25, 880, 783.99, 1046.5], 'triangle', 0.22),
    note(0.8, 0.18, [880, 220], 'sine', 0.3),
    ...[261.63, 329.63, 392, 523.25].map((pitch) => note(1, 0.5, pitch, 'triangle', 0.12)),
  ],
  /* The Game Boy: three quick notes, the last one left to ring. */
  handheld: [...run(0, 0.07, 0.06, [783.99, 1046.5], 'square', 0.1), note(0.14, 0.55, 1318.51, 'square', 0.1), note(0.14, 0.55, 2637.02, 'sine', 0.05)],
  /* The Xbox 360: a low swell that opens into a wide chord, and a breath of air above it. */
  'console-ring': [
    note(0, 1.1, [98, 196], 'sine', 0.35),
    note(0.35, 1.4, 293.66, 'triangle', 0.13),
    note(0.55, 1.2, 440, 'triangle', 0.12),
    note(0.75, 1, 587.33, 'sine', 0.12),
    note(1, 0.8, [880, 1760], 'sine', 0.06),
  ],
  /* The Wii: a breath that rises, then two soft chimes a fifth apart. */
  'console-white': [
    note(0, 0.5, [300, 900], 'sine', 0.18),
    note(0.55, 0.5, 523.25, 'triangle', 0.18),
    note(0.55, 0.5, 1046.5, 'sine', 0.07),
    note(0.95, 0.7, 783.99, 'triangle', 0.18),
    note(0.95, 0.7, 1567.98, 'sine', 0.07),
  ],
  /* The PS Vita, on the bed: four soft notes that climb, and two that stay. */
  vita: [...run(0, 0.09, 0.12, [587.33, 739.99, 880, 1174.66], 'sine', 0.16), note(0.36, 0.5, 1479.98, 'triangle', 0.1), note(0.36, 0.5, 739.99, 'sine', 0.08)],
  /* The Nintendo DS: two bells, then a short climb. */
  'handheld-wide': [
    note(0, 0.25, 1318.51, 'sine', 0.16),
    note(0, 0.25, 2637.02, 'sine', 0.05),
    note(0.18, 0.25, 987.77, 'sine', 0.16),
    ...run(0.4, 0.1, 0.09, [880, 1108.73, 1318.51], 'triangle', 0.18),
    note(0.7, 0.45, 1760, 'triangle', 0.18),
  ],
};

/**
 * What the other things of the room sound like when they are clicked, and a
 * panel as it opens or shuts. Short, and made of the same notes as the rest.
 */
export const EFFECTS: Record<string, Note[]> = {
  /* The dog: two barks, each a rough voice that drops. */
  bark: [0, 0.22].flatMap((at) => [note(at, 0.13, [460, 190], 'sawtooth', 0.22), note(at, 0.13, [230, 95], 'square', 0.12)]),
  /* A knuckle on wood, twice. */
  knock: [0, 0.17].map((at) => note(at, 0.08, [150, 60], 'sine', 0.45)),
  /* A speaker: four notes on a rough string, each with its fifth, the last one held. */
  riff: [[0, 82.41, 0.16], [0.18, 82.41, 0.16], [0.36, 98, 0.16], [0.54, 110, 0.9]].flatMap(([at, pitch, length]) => [
    note(at, length, pitch, 'sawtooth', 0.2),
    note(at, length, pitch * 1.5, 'sawtooth', 0.12),
  ]),
  /* The PC goes down, and comes back. */
  off: [note(0, 0.4, [440, 70], 'triangle', 0.2)],
  on: [note(0, 0.3, [110, 440], 'triangle', 0.2), note(0.3, 0.2, 880, 'sine', 0.1)],
  /* The printer at work: its head goes to and fro. */
  print: Array.from({ length: 8 }, (_, i) => note(i * 0.11, 0.09, i % 2 ? 196 : 233.08, 'square', 0.06)),
  /* What slips off the whiteboard, as each thing hits the floor. */
  drop: [0.85, 0.97, 1.09].map((at, i) => note(at, 0.05, [900 - i * 120, 300], 'triangle', 0.25)),
  /* A neon tube that fails: its hum, cut. */
  buzz: [[0, 0.07], [0.18, 0.14], [0.5, 0.42], [1.1, 0.48]].map(([at, length]) => note(at, length, 100, 'sawtooth', 0.07)),
  /* A locked drawer, rattled. */
  locked: [0, 0.07, 0.14].map((at) => note(at, 0.05, 92, 'square', 0.14)),
  /* The warning light: a beep with each of its six flashes. */
  alarm: Array.from({ length: 6 }, (_, i) => note(i * 0.5, 0.17, 880, 'square', 0.07)),
  /* The keyboard: a note as each group of keys lights up. */
  keys: run(0, 0.26, 0.12, [523.25, 659.25, 783.99, 987.77, 1174.66], 'triangle', 0.12),
  /* A rubber duck, squeezed twice. */
  quack: [0, 0.16].flatMap((at) => [note(at, 0.1, [720, 480], 'sawtooth', 0.16), note(at, 0.1, [1440, 960], 'square', 0.05)]),
  /* An old telephone: its bell, two bursts. */
  ring: [0, 0.55].flatMap((from) => Array.from({ length: 10 }, (_, i) => note(from + i * 0.04, 0.035, i % 2 ? 1318.51 : 1567.98, 'square', 0.07))),
  /* A switch, or the works of a clock: one dry click. */
  tick: [note(0, 0.06, [1800, 700], 'square', 0.12)],
  /* A panel opens, and shuts. */
  open: run(0, 0.07, 0.07, [659.25, 880], 'sine', 0.06),
  close: run(0, 0.07, 0.07, [880, 659.25], 'sine', 0.06),
};

/** How long a sound lasts, in seconds. */
export const lasts = (notes: Note[]): number => Math.max(0, ...notes.map((each) => each.at + each.for));

/** Whether the visitor has turned the sound on. */
export const sound = { on: false };

let context: AudioContext | undefined;

/** Wake the sound up from a click: a browser keeps it asleep until one. The button that lets the visitor in calls this. */
export function unlock(): void {
  if (!sound.on) return;
  context ??= new AudioContext();
  void context.resume();
}

/** Play the sound of that name if the sound is on. Returns how long it lasts, in seconds, heard or not. */
export function play(name: string): number {
  const notes = JINGLES[name] ?? EFFECTS[name] ?? [];
  if (!sound.on || notes.length === 0) return lasts(notes);
  context ??= new AudioContext();
  void context.resume(); // a context made before any click starts suspended
  const start = context.currentTime + 0.02;
  for (const each of notes) {
    const [from, to] = typeof each.pitch === 'number' ? [each.pitch, each.pitch] : each.pitch;
    const [begins, ends] = [start + each.at, start + each.at + each.for];
    const voice = context.createOscillator();
    const level = context.createGain();
    voice.type = each.wave;
    voice.frequency.setValueAtTime(from, begins);
    if (to !== from) voice.frequency.exponentialRampToValueAtTime(to, ends);
    /* A quick rise, then a fall to silence: no click at either end. */
    level.gain.setValueAtTime(0.0001, begins);
    level.gain.linearRampToValueAtTime(each.loud, begins + Math.min(0.02, each.for / 4));
    level.gain.exponentialRampToValueAtTime(0.0001, ends);
    voice.connect(level).connect(context.destination);
    voice.start(begins);
    voice.stop(ends + 0.02);
  }
  return lasts(notes);
}
