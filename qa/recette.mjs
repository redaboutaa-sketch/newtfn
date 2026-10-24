// Recette automatisée des gabarits : captures pleine page (ordinateur et mobile), axe-core
// (WCAG 2.1 A/AA), débordement horizontal, images cassées, H1 unique, erreurs console.
// Usage : BASE=http://127.0.0.1:8095 CHROME=/chemin/vers/chrome node recette.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { createRequire } from 'node:module';
const axeSource = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

const BASE = process.env.BASE || 'http://127.0.0.1:8095';
const OUT = process.env.OUT || 'resultats';
const PAGES = (process.env.PAGES || '/,/services/,/formations/automobile/,/formations/beaute-bien-etre/,/formations/intelligence-artificielle/,/service/maintenance/,/service/wheels-alignment/,/service/interior-cleaning/,/m-grid-col-3/,/m-grid-col-2/,/infinite-grid-col-2/,/entreprises/,/financer-sa-formation/,/about-us/,/qualite/,/accessibilite-handicap/,/informations-pratiques/,/contact-us/,/contact-us/merci/,/mentions-legales/,/politique-de-confidentialite/,/plan-du-site/,/page-inexistante/').split(',');
const VIEWPORTS = { ordinateur: { width: 1366, height: 900 }, mobile: { width: 390, height: 844 } };
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] });
const report = [];
for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
  const ctx = await browser.newContext({ viewport: vp, locale: 'fr-FR', reducedMotion: 'reduce', httpCredentials: process.env.AUTH ? { username: process.env.AUTH.split(':')[0], password: process.env.AUTH.split(':').slice(1).join(':') } : undefined });
  for (const p of PAGES) {
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(e.message));
    const resp = await page.goto(BASE + p, { waitUntil: 'load' });
    const checks = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      h1: document.querySelectorAll('h1').length,
      brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute('src')),
      imgsWithoutAlt: [...document.images].filter((i) => !i.hasAttribute('alt')).length,
      title: document.title,
      description: document.querySelector('meta[name=description]')?.content || '',
      canonical: document.querySelector('link[rel=canonical]')?.href || '',
    }));
    let axe = { violations: [] };
    if (vpName === 'ordinateur') {
      await page.addScriptTag({ content: axeSource });
      axe = await page.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }));
    }
    const slug = p.replace(/\//g, '_') || '_';
    await page.screenshot({ path: `${OUT}/${vpName}${slug}.png`, fullPage: true });
    report.push({ page: p, viewport: vpName, status: resp.status(), ...checks, consoleErrors: errors,
      axe: axe.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, exemple: v.nodes[0]?.target?.join(' ') })) });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/rapport.json`, JSON.stringify(report, null, 1));
const pb = report.filter((r) => r.overflow > 1 || (r.h1 !== 1) || r.brokenImages.length || r.imgsWithoutAlt || r.consoleErrors.length || r.axe.length);
console.log(`${report.length} contrôles, ${pb.length} avec remarques`);
for (const r of pb) console.log(r.viewport, r.page, r.status, JSON.stringify({ overflow: r.overflow, h1: r.h1, broken: r.brokenImages, noAlt: r.imgsWithoutAlt, console: r.consoleErrors, axe: r.axe }));
