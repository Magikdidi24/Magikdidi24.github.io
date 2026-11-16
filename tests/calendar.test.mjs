// The calendar that opens over the room: the weeks of a month, Monday first.
// Run with `npm test`.
import assert from 'node:assert/strict';
import test from 'node:test';
import { weeks } from '../src/room/ui/calendar.ts';

test('weeks: a month starts on its weekday, Monday first', () => {
  const september = weeks(2026, 9); // 1 September 2026 is a Tuesday
  assert.deepEqual(september[0], [null, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(september[1], [7, 8, 9, 10, 11, 12, 13]);
});

test('weeks: every day of the month is there once, and the last week is filled out', () => {
  const september = weeks(2026, 9);
  assert.deepEqual(september.flat().filter((day) => day !== null), Array.from({ length: 30 }, (_, i) => i + 1));
  assert.ok(september.every((week) => week.length === 7));
  assert.deepEqual(september.at(-1), [28, 29, 30, null, null, null, null]);
});

test('weeks: a month that starts on a Monday has no empty day before it, one on a Sunday has six', () => {
  assert.equal(weeks(2026, 6)[0][0], 1); // 1 June 2026 is a Monday
  assert.deepEqual(weeks(2026, 11)[0], [null, null, null, null, null, null, 1]); // 1 November 2026 is a Sunday
});

test('weeks: February follows the leap years', () => {
  assert.equal(Math.max(...weeks(2028, 2).flat()), 29);
  assert.equal(Math.max(...weeks(2027, 2).flat()), 28);
});
