// Mesures Lighthouse (laboratoire, mobile simulé par défaut). Ce ne sont PAS des mesures de terrain
// (CrUX / INP réel des visiteurs). Usage : BASE=https://... CHROME=/chemin/chrome node perf.mjs [--desktop]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8095';
const PAGES = (process.env.PAGES || '/,/services/,/formations/beaute-bien-etre/,/service/interior-cleaning/,/contact-us/').split(',');
const desktop = process.argv.includes('--desktop');
const out = [];
for (const p of PAGES) {
  const args = [BASE + p, '--quiet', '--output=json', '--output-path=stdout', '--only-categories=performance,accessibility,best-practices,seo',
    `--chrome-flags=--headless=new --no-sandbox`, ...(desktop ? ['--preset=desktop'] : [])];
  const r = JSON.parse(execFileSync('npx', ['lighthouse', ...args], { env: { ...process.env, CHROME_PATH: process.env.CHROME }, maxBuffer: 64e6 }));
  const a = r.audits;
  out.push({ page: p, perf: Math.round(r.categories.performance.score * 100), a11y: Math.round(r.categories.accessibility.score * 100),
    bp: Math.round(r.categories['best-practices'].score * 100), seo: Math.round(r.categories.seo.score * 100),
    fcp: a['first-contentful-paint'].displayValue, lcp: a['largest-contentful-paint'].displayValue, cls: a['cumulative-layout-shift'].displayValue,
    tbt: a['total-blocking-time'].displayValue, poids: Math.round(a['total-byte-weight'].numericValue / 1024) + ' Ko' });
  console.log(JSON.stringify(out.at(-1)));
}
if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(out, null, 1));
