/*
  The two sheets that open over the room: a picture shown large, and the
  calendar. Both are <dialog> elements of the page (src/pages/index.astro):
  the browser dims the room behind them, keeps the keyboard inside them and
  closes them on Escape.
*/
import { birthday } from '../../data/room.ts';
import { weeks } from './calendar.ts';

const sheet = (id: string) => document.getElementById(id) as HTMLDialogElement;

/**
 * Show a picture large: an image file, or a canvas of the room, enlarged by a
 * whole number so that its pixels stay square. `caption` says what it shows.
 */
export function showPicture(picture: HTMLCanvasElement | string, caption: string): void {
  const dialog = sheet('zoom');
  const image = new Image();
  image.alt = caption;
  if (typeof picture === 'string') {
    image.src = picture;
  } else {
    const scale = Math.max(1, Math.floor(Math.min((innerWidth * 0.9) / picture.width, (innerHeight * 0.72) / picture.height)));
    image.src = picture.toDataURL();
    image.width = picture.width * scale;
    image.height = picture.height * scale;
    image.className = 'pixels';
  }
  dialog.setAttribute('aria-label', caption);
  dialog.querySelector('figure')!.replaceChildren(image);
  dialog.showModal();
}

const MONTH = new Intl.DateTimeFormat('en', { month: 'long' });
const DAY = { short: new Intl.DateTimeFormat('en', { weekday: 'narrow' }), long: new Intl.DateTimeFormat('en', { weekday: 'long' }) };

/** One month as a table: its name, the days of the week, then its weeks. */
function month(year: number, index: number, today: Date): HTMLTableElement {
  const table = document.createElement('table');
  table.createCaption().textContent = MONTH.format(new Date(year, index - 1));
  const head = table.createTHead().insertRow();
  for (let d = 1; d <= 7; d++) {
    const monday = new Date(2024, 0, d); // 1 January 2024 was a Monday
    head.append(Object.assign(document.createElement('th'), { scope: 'col', abbr: DAY.long.format(monday), textContent: DAY.short.format(monday) }));
  }
  const body = table.createTBody();
  for (const week of weeks(year, index)) {
    const row = body.insertRow();
    for (const day of week) {
      const cell = row.insertCell();
      if (day === null) continue;
      cell.textContent = String(day);
      if (index === birthday.month && day === birthday.day) {
        cell.className = 'marked';
        cell.title = birthday.label;
        cell.setAttribute('aria-label', `${day}, ${birthday.label}`);
      }
      if (year === today.getFullYear() && index === today.getMonth() + 1 && day === today.getDate()) cell.setAttribute('aria-current', 'date');
    }
  }
  return table;
}

/** Open the calendar on the current year. Its two buttons move it by a year. */
export function showCalendar(): void {
  const dialog = sheet('calendar');
  const label = dialog.querySelector('#calendar-year')!;
  const months = dialog.querySelector('.months')!;
  const today = new Date();
  let year = today.getFullYear();
  const draw = () => {
    label.textContent = String(year);
    months.replaceChildren(...Array.from({ length: 12 }, (_, i) => month(year, i + 1, today)));
  };
  for (const button of dialog.querySelectorAll<HTMLButtonElement>('[data-step]')) {
    button.onclick = () => {
      year += Number(button.dataset.step);
      draw();
    };
  }
  draw();
  dialog.showModal();
}
