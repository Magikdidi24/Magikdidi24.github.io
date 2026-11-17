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
  /* The Wii: a breath that rises, then two soft chimes a fifth apart. */
  'console-white': [
    note(0, 0.5, [300, 900], 'sine', 0.18),
    note(0.55, 0.5, 523.25, 'triangle', 0.18),
    note(0.55, 0.5, 1046.5, 'sine', 0.07),
    note(0.95, 0.7, 783.99, 'triangle', 0.18),
    note(0.95, 0.7, 1567.98, 'sine', 0.07),
  ],
  /* The Nintendo DS: two bells, then a short climb. */
  'handheld-wide': [
    note(0, 0.25, 1318.51, 'sine', 0.16),
    note(0, 0.25, 2637.02, 'sine', 0.05),
    note(0.18, 0.25, 987.77, 'sine', 0.16),
    ...run(0.4, 0.1, 0.09, [880, 1108.73, 1318.51], 'triangle', 0.18),
    note(0.7, 0.45, 1760, 'triangle', 0.18),
  ],
};

/** How long a sound lasts, in seconds. */
export const lasts = (notes: Note[]): number => Math.max(0, ...notes.map((each) => each.at + each.for));

/** Whether the visitor has turned the sound on. */
export const sound = { on: false };

let context: AudioContext | undefined;

/** Play the sound of that name if the sound is on. Returns how long it lasts, in seconds, heard or not. */
export function play(name: string): number {
  const notes = JINGLES[name] ?? [];
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
