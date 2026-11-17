// The sounds of the room: every console has its own, short, in a range that
// is heard and not too loud. Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { EFFECTS, JINGLES, lasts } from '../src/room/audio.ts';
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
