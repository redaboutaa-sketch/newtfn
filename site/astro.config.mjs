// @ts-check
import { defineConfig } from 'astro/config';

// SITE_URL : URL canonique de PRODUCTION, y compris en préproduction
// (les pages de préproduction sont noindex et protégées par authentification).
export default defineConfig({
  site: process.env.SITE_URL || 'https://techformanord.fr',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  compressHTML: true,
  prefetch: false,
  devToolbar: { enabled: false },
});
