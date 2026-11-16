/*
  What is pinned on the pegboard of the 3D room: the boarding passes of the
  flight to Japan, and a sheet of the usual Taylor expansions of the
  preparatory classes. The formulas are typed in the notation of
  src/room/voxel/text.ts and drawn in its small pixel font.
*/
import { person } from './site.ts';

const city = (place: string) => place.split(',')[0].toUpperCase();

/** The boarding passes: from home to where the exchange is. No airline, date or flight number: none is on the site. */
export const flight = { title: 'BOARDING PASS', from: city(person.home), to: city(person.location) };

/** The formula sheet, in pixels of 2.5 mm: A4, landscape. */
export const SHEET = { width: 119, height: 84 } as const;

const tex = String.raw;

export const taylor = {
  title: 'TAYLOR EXPANSIONS AT 0',
  lines: [
    tex`e^x=1+x+x^2/2!+...+x^n/n!+o(x^n)`,
    tex`ln(1+x)=x-x^2/2+x^3/3+o(x^3)`,
    tex`1/(1-x)=1+x+x^2+...+x^n+o(x^n)`,
    tex`(1+x)^\alpha =1+\alpha x+\alpha (\alpha -1)x^2/2+o(x^2)`,
    tex`cos x=1-x^2/2!+x^4/4!+o(x^5)`,
    tex`sin x=x-x^3/3!+x^5/5!+o(x^6)`,
    tex`tan x=x+x^3/3+o(x^4)`,
  ],
};
