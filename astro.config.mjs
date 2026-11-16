// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// User site: served from the root of https://magikdidi24.github.io
export default defineConfig({
  site: 'https://magikdidi24.github.io',
  integrations: [sitemap()],
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  // three.js alone is about 590 kB minified (145 kB gzipped), in a chunk the
  // home page loads after its first paint.
  vite: { build: { chunkSizeWarningLimit: 700 } },
});
