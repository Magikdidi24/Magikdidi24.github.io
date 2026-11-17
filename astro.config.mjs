// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// User site: served from the root of https://magikdidi24.github.io
export default defineConfig({
  site: 'https://magikdidi24.github.io',
  integrations: [sitemap()],
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  // three.js alone is about 590 kB minified (145 kB gzipped) and GSAP about
  // 70 kB (27 kB gzipped), in a chunk the home page loads after its first paint.
  /* zzfx is written as a module without saying so in its package.json: the dev server must serve it as it is, not try to convert it. */
  vite: { build: { chunkSizeWarningLimit: 800 }, optimizeDeps: { exclude: ['zzfx'] } },
});
