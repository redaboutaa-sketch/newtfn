// Capture rapide : node shot.mjs URL largeur sortie.png [hauteurMax] [--motion]
// Sans --motion : prefers-reduced-motion (rendu final statique, toutes sections visibles).
import { chromium } from 'playwright-core';
const [url, width, out, maxH] = process.argv.slice(2);
const motion = process.argv.includes('--motion');
const b = await chromium.launch({ executablePath: process.env.CHROME || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: +width, height: +width < 700 ? 844 : 900 }, reducedMotion: motion ? 'no-preference' : 'reduce', locale: 'fr-FR' });
await p.goto(url, { waitUntil: 'networkidle' });
// Défilement progressif pour déclencher le chargement différé et les révélations.
await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); });
await p.waitForTimeout(motion ? 1200 : 400);
const h = await p.evaluate(() => document.documentElement.scrollHeight);
await p.screenshot({ path: out, fullPage: true, clip: { x: 0, y: 0, width: +width, height: Math.min(h, +(maxH || h)) } });
await b.close();
