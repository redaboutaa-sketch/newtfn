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
  await p.goto(BASE + '/acceuil/');
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
  await p.goto(BASE + '/acceuil/');
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
  await p.context().close();
}

// 3. Portail : destinations, survol, clavier (Tab + Entrée), entrée animée.
{
  const p = await page({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await p.goto(BASE + '/');
  const links = await p.$$eval('.universe-link', (as) => as.map((a) => ({ href: a.getAttribute('href'), target: a.target, name: a.textContent.replace(/\s+/g, ' ').trim(), img: !!a.querySelector('.u-logo img'), svg: !!a.querySelector('.u-sketch svg') })));
  check('portail : trois univers, un lien chacun', links.length === 3 && links.every((l) => l.img && l.svg && !l.target), JSON.stringify(links.map((l) => l.href)));
  check('portail : destinations', links[0].href === '/acceuil/' && links[1].href === 'https://maisonbeauxlieux.com/' && links[2].href === 'https://iatechformanord.fr/');
  check('portail : aucun lien imbriqué', await p.evaluate(() => document.querySelectorAll('a a').length === 0));
  const boxes = await p.$$eval('.universe-link', (as) => as.map((a) => a.getBoundingClientRect()).map((r) => ({ w: Math.round(r.width), b: Math.round(r.bottom) })));
  check('portail : panneaux de même largeur, visibles ensemble (1440×900)', new Set(boxes.map((b) => b.w)).size === 1 && boxes.every((b) => b.b <= 900), JSON.stringify(boxes));
  await p.waitForTimeout(3000);
  check('portail : entrée terminée (is-settled)', await p.evaluate(() => document.documentElement.classList.contains('is-settled')));
  const lk = p.locator('.universe-link').first();
  await lk.hover(); await p.waitForTimeout(900);
  const tr = await lk.locator('.u-sketch svg').evaluate((s) => getComputedStyle(s).transform);
  const lift = await lk.locator('.sk-lift').evaluate((g) => getComputedStyle(g).transform);
  check('portail : agrandissement du sketch et pont qui monte au survol', tr.startsWith('matrix(1.04') && lift !== 'none', `${tr} / ${lift}`);
  const other = await p.locator('.universe-link').nth(1).locator('.u-sketch svg').evaluate((s) => getComputedStyle(s).opacity);
  check('portail : autres panneaux atténués, texte intact', other === '0.8' && await p.locator('.universe-link').nth(1).locator('.u-name').evaluate((h) => getComputedStyle(h).opacity === '1'));
  await p.mouse.move(5, 5);
  // Clavier : logo, téléphone, puis les trois univers.
  await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab'); await p.keyboard.press('Tab');
  check('portail : focus clavier sur le 1er univers', await p.evaluate(() => document.activeElement?.classList.contains('universe-link') && document.activeElement.getAttribute('href') === '/acceuil/'));
  const outline = await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  check('portail : focus visible', outline !== 'none', outline);
  await p.keyboard.press('Enter');
  await p.waitForURL('**/acceuil/');
  check('portail : Entrée ouvre /acceuil/ dans le même onglet', p.url().endsWith('/acceuil/'));
  const wa = await p.$eval('.site-footer a[href^="https://wa.me/"]', (a) => a.href).catch(() => null);
  check('WhatsApp : lien professionnel configuré', !!wa && wa.startsWith('https://wa.me/33758058178?text='), wa || 'absent');
  await p.context().close();
}
{
  // Mobile : un seul appui ouvre la destination.
  const p = await page({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: 'no-preference' });
  await p.goto(BASE + '/');
  await p.locator('.universe-link').first().locator('.u-sketch').tap();
  await p.waitForURL('**/acceuil/', { timeout: 5000 }).catch(() => {});
  check('mobile : un appui sur le sketch ouvre /acceuil/', p.url().endsWith('/acceuil/'));
  await p.goto(BASE + '/');
  const [req] = await Promise.all([p.waitForRequest((r) => r.url().startsWith('https://maisonbeauxlieux.com/'), { timeout: 5000 }).catch(() => null), p.locator('.universe-link').nth(1).locator('.u-logo').tap()]);
  check('mobile : un appui sur le logo beauté ouvre maisonbeauxlieux.com', !!req);
  await p.context().close();
}

// 4. Mouvement réduit : aucun contenu masqué, pas de classe motion.
{
  const p = await page({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  for (const u of ['/', '/acceuil/', '/service/interior-cleaning/', '/formations/beaute-bien-etre/']) {
    await p.goto(BASE + u);
    const hidden = await p.evaluate(() => [...document.querySelectorAll('[data-reveal]')].filter((e) => getComputedStyle(e).opacity !== '1').length);
    check(`mouvement réduit ${u} : tout visible`, hidden === 0 && !(await p.evaluate(() => document.documentElement.classList.contains('motion'))));
    if (u === '/') check('mouvement réduit : aucune animation dans les illustrations', await p.evaluate(() => [...document.querySelectorAll('.sketch *')].every((e) => getComputedStyle(e).animationName === 'none')));
  }
  await p.context().close();
}

// 5. JavaScript désactivé : contenu et navigation disponibles.
{
  const p = await page({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  await p.goto(BASE + '/');
  check('sans JavaScript : trois univers cliquables', (await p.locator('.universe-link').count()) === 3 && await p.locator('.universe-link').first().isVisible());
  await p.goto(BASE + '/acceuil/');
  const navVisible = await p.locator('#main-nav a', { hasText: 'Nos formations' }).isVisible();
  const h1 = await p.locator('h1').isVisible();
  check('sans JavaScript : titre et navigation visibles', navVisible && h1);
  await p.context().close();
}

// 6. Filet de sécurité : script de mouvement bloqué → contenus révélés après 2,5 s.
{
  const p = await page({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await p.route(/\/_astro\/.*\.js$/, (r) => r.abort());
  await p.goto(BASE + '/acceuil/');
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
  check('ancre : programme détaillé du module ciblé ouvert', await d.evaluate((e) => e.open));
  await d.locator('summary').click(); await p.waitForTimeout(300);
  check('accordéon : fermeture au clic', !(await d.evaluate((e) => e.open)));
  await p.locator('.module-cards a').nth(3).click(); await p.waitForTimeout(600);
  check('carte module : ouvre le programme ciblé', await p.evaluate(() => document.querySelector(':target details.prog-more')?.open === true));
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
