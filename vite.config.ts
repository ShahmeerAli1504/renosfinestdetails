import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import {
  DEFAULT_IMAGE,
  NOT_FOUND,
  PAGES,
  absUrl,
  breadcrumbJsonLd,
  type PageSeo,
} from './src/lib/seo-pages';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function headFor(page: PageSeo) {
  const url = absUrl(page.path);
  const image = absUrl(page.image ?? DEFAULT_IMAGE);
  const t = esc(page.title);
  const d = esc(page.description);
  const crumbs = breadcrumbJsonLd(page);
  return [
    `<title>${t}</title>`,
    // The home hero background (set in CSS) is the largest paint on the page; fetch it early.
    page.path === '/' ? `<link rel="preload" as="image" href="${DEFAULT_IMAGE}" fetchpriority="high" />` : '',
    `<meta name="description" content="${d}" />`,
    `<meta name="robots" content="${page.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}" />`,
    page.noindex ? '' : `<link rel="canonical" href="${url}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${image}" />`,
    crumbs ? `<script type="application/ld+json" id="ld-breadcrumb">${JSON.stringify(crumbs)}</script>` : '',
  ]
    .filter(Boolean)
    .join('\n    ');
}

/**
 * After the build, write one HTML file per page (dist/services/index.html, ...) with that
 * page's SEO tags already in the <head>, plus dist/404.html for unknown URLs.
 */
function seoPages(): Plugin {
  let outDir = 'dist';
  return {
    name: 'rfd-seo-pages',
    apply: 'build',
    configResolved(c) {
      outDir = resolve(c.root, c.build.outDir);
    },
    closeBundle() {
      const template = readFileSync(join(outDir, 'index.html'), 'utf8');
      const re = /<!-- SEO:START[\s\S]*?SEO:END -->/;
      if (!re.test(template)) throw new Error('index.html is missing the SEO:START / SEO:END markers');
      const render = (p: PageSeo) => template.replace(re, headFor(p));

      for (const page of Object.values(PAGES)) {
        const file = page.path === '/' ? join(outDir, 'index.html') : join(outDir, page.path.slice(1), 'index.html');
        mkdirSync(join(file, '..'), { recursive: true });
        writeFileSync(file, render(page));
      }
      writeFileSync(join(outDir, '404.html'), render(NOT_FOUND));
    },
  };
}

// Photos live in public/assets, so Vite's own build output goes to /static
// to keep the two folders separate.
export default defineConfig({
  plugins: [react(), seoPages()],
  build: {
    assetsDir: 'static',
  },
});
