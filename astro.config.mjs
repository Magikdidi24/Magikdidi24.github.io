// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// User site: served from the root of https://magikdidi24.github.io
export default defineConfig({
  site: 'https://magikdidi24.github.io',
  integrations: [sitemap()],
  build: { format: 'directory' },
  devToolbar: { enabled: false },
});
