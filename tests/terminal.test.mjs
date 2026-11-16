// The terminal of the desktop of projects: a line in, lines out, and sometimes somewhere to go.
// Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { run } from '../src/room/ui/terminal.ts';

const world = {
  projects: [
    { slug: 'chess-board', name: 'Chess engine' },
    { slug: 'race-car-mpc', name: 'Learned MPC for a race car' },
  ],
  about: ['A student.', 'He builds things.'],
  cv: '/cv.pdf',
  email: 'someone@example.org',
  words: {
    help: ['help', 'ls'],
    coffee: 'No coffee.',
    unknown: 'command not found',
    missing: 'no such project',
    noFile: 'No such file',
    opening: 'Opening',
    cv: 'Downloading the CV.',
    noCv: 'No CV yet.',
  },
};

test('run: help lists the commands', () => {
  assert.deepEqual(run('help', world).out, ['help', 'ls']);
});

test('run: ls lists the projects by their id, and the file about', () => {
  assert.deepEqual(run('ls', world).out, ['about.txt', 'chess-board', 'race-car-mpc']);
});

test('run: cat about.txt prints who he is; another file is missing', () => {
  assert.deepEqual(run('cat about.txt', world).out, world.about);
  assert.deepEqual(run('cat nope.txt', world).out, ['cat: nope.txt: No such file']);
});

test('run: open goes to a project, by its id or by the start of its name, whatever the case', () => {
  assert.equal(run('open chess-board', world).go, 'chess-board');
  assert.equal(run('open CHESS', world).go, 'chess-board');
  assert.equal(run('open learned', world).go, 'race-car-mpc');
  const missing = run('open nothing', world);
  assert.equal(missing.go, undefined);
  assert.match(missing.out[0], /no such project: nothing/);
});

test('run: cv hands out the file when there is one', () => {
  assert.equal(run('cv', world).download, '/cv.pdf');
  const none = run('cv', { ...world, cv: null });
  assert.equal(none.download, undefined);
  assert.deepEqual(none.out, ['No CV yet.']);
});

test('run: contact prints the address and goes to the contact panel', () => {
  const result = run('contact', world);
  assert.deepEqual(result.out, ['someone@example.org']);
  assert.equal(result.go, 'contact');
});

test('run: the easter egg, with or without sudo', () => {
  assert.deepEqual(run('sudo make coffee', world).out, ['No coffee.']);
  assert.deepEqual(run('make coffee', world).out, ['No coffee.']);
});

test('run: an empty line prints nothing, an unknown command says so, clear asks for a clean screen', () => {
  assert.deepEqual(run('   ', world), { out: [] });
  assert.deepEqual(run('rm -rf /', world).out, ['rm: command not found']);
  assert.equal(run('clear', world).clear, true);
});
