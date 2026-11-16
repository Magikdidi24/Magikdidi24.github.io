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
 * The sheet grows from `from`, the point of the viewport that was clicked:
 * the page animates it from there (see .sheet in index.astro).
 */
export function showPicture(picture: HTMLCanvasElement | string, caption: string, from?: { x: number; y: number }): void {
  const dialog = sheet('zoom');
  const image = new Image();
  image.alt = caption;
  if (typeof picture === 'string') {
    image.src = picture;
  } else {
    const scale = Math.max(1, Math.floor(Math.min((innerWidth * 0.9) / picture.width, (innerHeight * 0.72) / picture.height)));
    image.src = picture.toDataURL();
    /* As a style: the page sizes the pictures of a sheet itself, and would win over a width attribute. */
    image.style.width = `${picture.width * scale}px`;
    image.style.height = `${picture.height * scale}px`;
    image.className = 'pixels';
  }
  dialog.setAttribute('aria-label', caption);
  dialog.querySelector('figure')!.replaceChildren(image);
  dialog.style.setProperty('--from-x', `${(from?.x ?? innerWidth / 2) - innerWidth / 2}px`);
  dialog.style.setProperty('--from-y', `${(from?.y ?? innerHeight / 2) - innerHeight / 2}px`);
  /* Once the picture has its size: the sheet would open small and jump otherwise. */
  const show = () => dialog.showModal();
  void image.decode().then(show, show);
}

/** A ring drawn by hand around a day, in a square of 44: it overshoots where it closes. */
const RING = '<svg viewBox="0 0 44 44" aria-hidden="true"><path pathLength="100" d="M12 9C23 2 38 7 37 21C36 35 15 39 7 28C1 18 9 5 26 6"/></svg>';

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
        cell.insertAdjacentHTML('beforeend', RING);
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
