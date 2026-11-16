/*
  The palette of the room: 30 colours, validated with Samuel in phase 0.
  These are the colours of the materials. Voxels and canvas textures use
  nothing else; lighting makes the shadow and highlight tones.
  Order matters: a colour's position is its index in voxel data.
*/
export const PALETTE = {
  /* Warm base */
  ink: '#1a1423', // outlines, screen bezels, darkest shadows
  plum: '#3b2a41', // shadow tone, night mood
  taupe: '#6f6068', // metal legs, cables
  stone: '#a89b98', // warm grey, skirting boards
  linen: '#d9ccb8', // beige
  cream: '#efe4cf', // walls
  paper: '#fbf5e6', // paper, pillow, whiteboard
  /* Woods */
  walnut: '#4b2e2a', // dark wood, frames
  chestnut: '#7b4a34', // bed frame, door
  oak: '#a66f47', // floor, desk top
  honey: '#d19a5f', // light wood, pegboard
  /* Fabrics */
  rust: '#b4513c', // duvet, goshuincho
  mustard: '#dba23f', // duvet pattern, duck
  sage: '#8aa174', // rug, pots
  teal: '#2f5f66', // chair, rug pattern
  denim: '#5a7fa0', // fabrics, book spines
  /* Plants */
  leaf: '#4e8f4a',
  moss: '#2c5937',
  /* Tech */
  graphite: '#262833', // PC, monitors, NAS
  steel: '#50566a',
  silver: '#a3adba',
  /* Emissive accents */
  cyan: '#27e6f2', // neon, LED strip, hover accent
  magenta: '#ff3fa4', // neon
  violet: '#9a5cff', // neon, MERGED badges
  amber: '#ffb347', // lamp, city windows
  lime: '#8dff6a', // NAS LEDs, terminal text
  /* Specials */
  red: '#e23b3b', // gem, stamp, pen
  cat: '#e58e3a', // the cat (to be confirmed)
  sky: '#8ed0f5', // day sky
  night: '#1c1747', // night sky
} as const;

export type Swatch = keyof typeof PALETTE;
