// The sounds of the room: every console has its own, short, in a range that
// is heard and not too loud. Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { EFFECTS, JINGLES, lasts, zzfxOf } from '../src/room/audio.ts';
import { CONSOLES } from '../src/room/objects/tech.ts';

test('every console that can be clicked has a sound of its own', () => {
  assert.equal(CONSOLES.length, 7);
  for (const name of CONSOLES) assert.ok(JINGLES[name]?.length > 0, `${name} has no sound`);
  const written = CONSOLES.map((name) => JSON.stringify(JINGLES[name]));
  assert.equal(new Set(written).size, CONSOLES.length, 'two consoles play the same notes');
});

test('a sound lasts between half a second and three, and every note can be heard without hurting', () => {
  for (const [name, notes] of Object.entries(JINGLES)) {
    const seconds = lasts(notes);
    assert.ok(seconds >= 0.5 && seconds <= 3, `${name} lasts ${seconds} s`);
    for (const note of notes) {
      assert.ok(note.at >= 0 && note.for > 0, `${name}: a note with no length`);
      for (const pitch of [note.pitch].flat()) assert.ok(pitch >= 40 && pitch <= 4200, `${name}: ${pitch} Hz`);
      assert.ok(note.loud > 0 && note.loud <= 0.5, `${name}: loud ${note.loud}`);
    }
  }
});

test('lasts: the end of the last note, and nothing for no note', () => {
  assert.equal(lasts([]), 0);
  assert.equal(lasts([{ at: 0, for: 0.5, pitch: 440, wave: 'sine', loud: 0.1 }, { at: 0.4, for: 0.3, pitch: 660, wave: 'sine', loud: 0.1 }]), 0.7);
});

test('effects: what things of the room sound like when they are clicked, each short and safe to hear', () => {
  const names = ['bark', 'knock', 'riff', 'off', 'on', 'print', 'drop', 'buzz', 'locked', 'alarm', 'keys', 'open', 'close', 'quack', 'ring', 'tick'];
  assert.deepEqual(Object.keys(EFFECTS).sort(), [...names].sort());
  for (const [name, notes] of Object.entries(EFFECTS)) {
    const seconds = lasts(notes);
    assert.ok(seconds > 0.05 && seconds <= 3.2, `${name} lasts ${seconds} s`);
    for (const note of notes) {
      assert.ok(note.at >= 0 && note.for > 0, `${name}: a note with no length`);
      for (const pitch of [note.pitch].flat()) assert.ok(pitch >= 40 && pitch <= 4200, `${name}: ${pitch} Hz`);
      assert.ok(note.loud > 0 && note.loud <= 0.5, `${name}: loud ${note.loud}`);
    }
  }
});

test('effects: none takes the name of a console', () => {
  for (const name of Object.keys(EFFECTS)) assert.ok(!(name in JINGLES), `${name} is also a jingle`);
});

test('effects: a panel opens and shuts quietly, with two notes that mirror each other', () => {
  const pitches = (notes) => notes.map(({ pitch }) => pitch);
  assert.deepEqual(pitches(EFFECTS.close), [...pitches(EFFECTS.open)].reverse());
  for (const note of [...EFFECTS.open, ...EFFECTS.close]) assert.ok(note.loud <= 0.1, 'too loud for something heard at every panel');
});

test('the PS Vita on the bed has a jingle too, and no two jingles are the same', () => {
  assert.ok(JINGLES.vita?.length > 0);
  const written = Object.values(JINGLES).map((notes) => JSON.stringify(notes));
  assert.equal(new Set(written).size, written.length);
});

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `expected ${expected}, got ${actual}`);

test('zzfxOf: a note as the parameters zzfx takes: its loudness and pitch, no randomness, the same length, a quick rise then a fall', () => {
  const [volume, randomness, frequency, attack, sustain, release, shape, curve, slide, , , , , , , , , sustainVolume, decay] = zzfxOf({ at: 0.3, for: 0.5, pitch: 440, wave: 'square', loud: 0.1 });
  assert.deepEqual([volume, randomness, frequency, shape, curve, slide], [0.1, 0, 440, 5, 1, 0]);
  near(attack + decay + sustain + release, 0.5);
  assert.ok(attack > 0 && attack <= 0.02);
  assert.ok(sustainVolume > 0 && sustainVolume < 0.3, 'most of the sound is gone once its first fall is over');
});

test('zzfxOf: each wave has its shape, and a glide is a slide that reaches the second pitch as the note ends', () => {
  const shape = (wave) => zzfxOf({ at: 0, for: 1, pitch: 440, wave, loud: 0.1 })[6];
  assert.deepEqual(['sine', 'triangle', 'sawtooth', 'square'].map(shape), [0, 1, 2, 5]);
  const up = zzfxOf({ at: 0, for: 0.5, pitch: [100, 600], wave: 'sine', loud: 0.1 });
  assert.equal(up[2], 100);
  near(100 + up[8] * 500 * 0.5, 600); // zzfx slides by 500 Hz a second for each unit of its slide
  assert.ok(zzfxOf({ at: 0, for: 0.5, pitch: [600, 100], wave: 'sine', loud: 0.1 })[8] < 0);
});

test('zzfxOf: every sound of the room gives zzfx 21 numbers a note, none of them wild', () => {
  for (const notes of [...Object.values(JINGLES), ...Object.values(EFFECTS)]) {
    for (const each of notes) {
      const parameters = zzfxOf(each);
      assert.equal(parameters.length, 21);
      assert.ok(parameters.every(Number.isFinite));
    }
  }
});
