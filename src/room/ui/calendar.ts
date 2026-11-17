/*
  The weeks of a month, for the calendar that opens over the room. Pure: no
  DOM, so it runs under `node --test` (tests/calendar.test.mjs).
*/

/**
 * A month as rows of seven days, Monday first: the day of the month, or null
 * before its first day and after its last. `month` is 1 for January.
 */
export function weeks(year: number, month: number): (number | null)[][] {
  const before = (new Date(year, month - 1, 1).getDay() + 6) % 7; // getDay() counts from Sunday
  const days = new Date(year, month, 0).getDate();
  const cells = [...Array<null>(before).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(Array.from({ length: 7 }, (_, d) => cells[i + d] ?? null));
  return rows;
}
