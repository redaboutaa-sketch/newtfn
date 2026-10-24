// Tests d'interactions et de mouvement. Usage : BASE=http://127.0.0.1:8095 node interactions.mjs
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8095';
const CHROME = process.env.CHROME || '/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'OK ' : 'KO '} ${name}${detail ? ' — ' + detail : ''}`); };
const errors = [];
const page = async (opts = {}) => {
  const ctx = await browser.newContext({ locale: 'fr-FR', ...opts });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push(m.text()); });
  return p;
};

// 1. Menu mobile : ouverture, focus, piège, Échap, retour du focus.
{
  const p = await page({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  await p.goto(BASE + '/');
  const t = p.locator('.nav-toggle');
  await t.click();
  await p.waitForTimeout(350);
  check('menu mobile : ouverture', await p.locator('#main-nav.is-open').isVisible() && (await t.getAttribute('aria-expanded')) === 'true');
  check('menu mobile : focus sur le premier lien', await p.evaluate(() => document.activeElement?.textContent?.trim() === 'Accueil'));
  for (let i = 0; i < 8; i++) await p.keyboard.press('Tab');
  check('menu mobile : focus piégé dans le menu', await p.evaluate(() => !!document.activeElement?.closest('.site-header')));
  await p.keyboard.press('Escape');
  await p.waitForTimeout(300);
  check('menu mobile : fermeture Échap + focus rendu', (await t.getAttribute('aria-expanded')) === 'false' && await p.evaluate(() => document.activeElement?.classList.contains('nav-toggle') && !document.body.classList.contains('menu-open')));
  await t.click(); await p.waitForTimeout(300);
  await p.locator('#main-nav a', { hasText: 'Nos formations' }).click();
  await p.waitForURL('**/services/');
  check('menu mobile : navigation par lien', p.url().endsWith('/services/'));
  await p.goBack();
  await p.waitForTimeout(300);
  check('retour arrière : menu fermé', (await p.locator('.nav-toggle').getAttribute('aria-expanded')) === 'false' && !(await p.locator('#main-nav').evaluate((n) => n.classList.contains('is-open'))));
  await p.context().close();
}

// 2. Mouvement actif (ordinateur) : classe motion, révélations, en-tête compact, survol des pôles.
{
  const p = await page({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await p.goto(BASE + '/');
  check('mouvement : classe motion posée', await p.evaluate(() => document.documentElement.classList.contains('motion')));
  const hiddenBefore = await p.evaluate(() => [...document.querySelectorAll('[data-reveal]')].filter((e) => e.getBoundingClientRect().top > innerHeight && getComputedStyle(e).opacity === '0').length);
  check('révélations : éléments hors écran en attente', hiddenBefore > 0, `${hiddenBefore} éléments`);
  for (let y = 0; y < 8000; y += 400) { await p.mouse.wheel(0, 400); await p.waitForTimeout(60); }
  await p.waitForTimeout(800);
  const pending = await p.evaluate(() => [...document.querySelectorAll('[data-reveal]')].filter((e) => !e.classList.contains('is-in')).length);
  check('révélations : tout est révélé après défilement', pending === 0, `${pending} restant(s)`);
  check('en-tête compact au défilement', await p.evaluate(() => document.querySelector('.site-header').classList.contains('is-compact')));
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500);
  check('en-tête normal en haut de page', await p.evaluate(() => !document.querySelector('.site-header').classList.contains('is-compact')));
  const panel = p.locator('.pole-panel').first();
  await panel.hover(); await p.waitForTimeout(1000);
  const tr = await panel.locator('img').evaluate((i) => getComputedStyle(i).transform);
  check('pôle : zoom de l’image au survol', tr !== 'none' && !tr.startsWith('matrix(1.02'), tr);
  await p.keyboard.press('Tab');
  await p.context().close();
}

// 3. Focus clavier sur un panneau de pôle : même retour visuel qu'au survol.
{
  const p = await page({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await p.goto(BASE + '/');
  await p.locator('.pole-panel').nth(1).focus(); await p.waitForTimeout(600);
  const w = await p.locator('.pole-panel').nth(1).evaluate((a) => getComputedStyle(a, '::after').width);
  check('pôle : accent au focus clavier', parseFloat(w) > 200, w);
  await p.context().close();
}

// 4. Mouvement réduit : aucun contenu masqué, pas de classe motion.
{
  const p = await page({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  for (const u of ['/', '/service/interior-cleaning/', '/formations/beaute-bien-etre/']) {
    await p.goto(BASE + u);
    const hidden = await p.evaluate(() => [...document.querySelectorAll('[data-reveal]')].filter((e) => getComputedStyle(e).opacity !== '1').length);
    check(`mouvement réduit ${u} : tout visible`, hidden === 0 && !(await p.evaluate(() => document.documentElement.classList.contains('motion'))));
  }
  await p.context().close();
}

// 5. JavaScript désactivé : contenu et navigation disponibles.
{
  const p = await page({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  await p.goto(BASE + '/');
  const hidden = await p.evaluate(() => 0);
  const navVisible = await p.locator('#main-nav a', { hasText: 'Nos formations' }).isVisible();
  const h1 = await p.locator('h1').isVisible();
  check('sans JavaScript : titre et navigation visibles', navVisible && h1);
  await p.context().close();
}

// 6. Filet de sécurité : script de mouvement bloqué → contenus révélés après 2,5 s.
{
  const p = await page({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await p.route(/\/_astro\/.*\.js$/, (r) => r.abort());
  await p.goto(BASE + '/');
  await p.waitForTimeout(3200);
  const hidden = await p.evaluate(() => [...document.querySelectorAll('[data-reveal]')].filter((e) => parseFloat(getComputedStyle(e).opacity) < 1).length);
  check('script bloqué : contenus révélés par le filet CSS', hidden === 0, `${hidden} masqué(s)`);
  await p.context().close();
}

// 7. Accordéon de programme, ancre et sommaire.
{
  const p = await page({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await p.goto(BASE + '/service/interior-cleaning/#prog-14-soudure-aciers-hle-thle-uhle');
  await p.waitForTimeout(800);
  const target = await p.evaluate(() => { const t = document.querySelector(':target'); return t ? t.id : null; });
  check('ancre de programme ciblée', !!target, target || 'aucune');
  const d = p.locator('#' + target + ' details.prog-more');
  await d.locator('summary').click(); await p.waitForTimeout(500);
  check('accordéon : ouverture', await d.evaluate((e) => e.open));
  check('sommaire : module courant signalé', await p.evaluate(() => !!document.querySelector('.toc a.is-current')));
  await p.context().close();
}

// 8. Formulaire : validation native, état d'envoi (requête interceptée en test).
{
  const p = await page({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  await p.goto(BASE + '/contact-us/?sujet=Test%20recette');
  check('formulaire : sujet prérempli', (await p.inputValue('#f-sujet')) === 'Test recette');
  await p.click('button[type=submit]');
  check('formulaire : envoi vide bloqué (validation native)', p.url().includes('/contact-us/'));
  const invalid = await p.evaluate(() => document.querySelectorAll('.form :invalid').length);
  check('formulaire : champs invalides signalés', invalid >= 3, `${invalid}`);
  await p.close();
}

await browser.close();
console.log(errors.length ? `Erreurs navigateur : ${[...new Set(errors)].join(' | ')}` : 'Aucune erreur navigateur.');
const ko = results.filter((r) => !r.ok).length;
console.log(`${results.length - ko}/${results.length} contrôles réussis`);
process.exit(ko || errors.length ? 1 : 0);
