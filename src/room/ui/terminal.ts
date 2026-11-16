/*
  The terminal of the desktop of projects: a line in, lines out, and sometimes
  somewhere to go. Pure: it knows the site through the `world` it is given,
  so it runs under `node --test` (tests/terminal.test.mjs). Its words come
  from src/data/room.ts.
*/

export interface World {
  projects: { slug: string; name: string }[];
  /** Who he is, a sentence per line: what `cat about.txt` prints. */
  about: string[];
  cv: string | null;
  email: string;
  words: { help: string[]; coffee: string; unknown: string; missing: string; noFile: string; opening: string; cv: string; noCv: string };
}

export interface Result {
  out: string[];
  /** The id of a panel or of a window to open. */
  go?: string;
  /** A file to hand out. */
  download?: string;
  clear?: true;
}

export function run(line: string, world: World): Result {
  const { projects, words } = world;
  const [command, ...rest] = line.trim().split(/\s+/);
  const argument = rest.join(' ');
  if (!command) return { out: [] };
  if (command === 'help') return { out: words.help };
  if (command === 'clear') return { out: [], clear: true };
  if (command === 'ls') return { out: ['about.txt', ...projects.map(({ slug }) => slug)] };
  if (command === 'cat') return { out: argument === 'about.txt' ? world.about : [`cat: ${argument}: ${words.noFile}`] };
  if (command === 'cv') return world.cv ? { out: [words.cv], download: world.cv } : { out: [words.noCv] };
  if (command === 'contact') return { out: [world.email], go: 'contact' };
  if (/^(sudo )?make coffee$/.test(`${command} ${argument}`)) return { out: [words.coffee] };
  if (command === 'open') {
    const wanted = argument.toLowerCase();
    const found = wanted && projects.find(({ slug, name }) => slug.startsWith(wanted) || name.toLowerCase().startsWith(wanted));
    return found ? { out: [`${words.opening} ${found.name}`], go: found.slug } : { out: [`open: ${words.missing}: ${argument}`] };
  }
  return { out: [`${command}: ${words.unknown}`] };
}
