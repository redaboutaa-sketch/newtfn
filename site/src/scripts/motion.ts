// Langage de mouvement commun : en-tête compact, menu mobile accessible, révélations au défilement,
// profondeur légère, sommaire actif, état d'envoi du formulaire.
// Tout est inactif si l'utilisateur demande moins de mouvement (sauf menu, sommaire et formulaire).
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const html = document.documentElement;

/* En-tête compact au défilement (sentinelle, sans écouteur de scroll). */
const header = document.querySelector<HTMLElement>('.site-header');
const sentinel = document.createElement('div');
sentinel.setAttribute('aria-hidden', 'true');
sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:80px;pointer-events:none';
document.body.prepend(sentinel);
if (header && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => header.classList.toggle('is-compact', !e.isIntersecting)).observe(sentinel);
}

/* Menu mobile : focus piégé, Échap, clic sur un lien, retour du focus. */
const toggle = document.querySelector<HTMLButtonElement>('.nav-toggle');
const nav = document.getElementById('main-nav');
if (toggle && nav) {
  const items = () => Array.from(nav.querySelectorAll<HTMLElement>('a'));
  const setOpen = (open: boolean, restoreFocus = true) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.label')!.textContent = open ? 'Fermer' : 'Menu';
    document.body.classList.toggle('menu-open', open);
    if (open) requestAnimationFrame(() => items()[0]?.focus());
    else if (restoreFocus) toggle.focus();
  };
  nav.querySelectorAll('li').forEach((li, i) => (li as HTMLElement).style.setProperty('--i', String(i)));
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false, false); });
  document.addEventListener('keydown', (e) => {
    if (!nav.classList.contains('is-open')) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
    if (e.key === 'Tab') {
      const f = [toggle, ...items()];
      const i = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  window.matchMedia('(min-width: 1181px)').addEventListener('change', (m) => { if (m.matches) setOpen(false, false); });
  // Retour arrière (bfcache) : le menu doit être fermé.
  window.addEventListener('pageshow', (e) => { if (e.persisted) setOpen(false, false); });
}

/* Révélations au défilement : une seule fois par élément. */
if (html.classList.contains('motion')) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
  window.addEventListener('pagehide', () => io.disconnect(), { once: true });
}

/* Profondeur légère (ordinateur uniquement, 2 images au plus). */
const parallax = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]')).slice(0, 2);
if (!reduce && parallax.length && window.matchMedia('(min-width: 900px) and (pointer: fine)').matches) {
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    for (const el of parallax) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      const p = (r.top + r.height / 2 - vh / 2) / vh; // -0.5..0.5 environ
      el.style.transform = `translate3d(0, ${(p * -24).toFixed(1)}px, 0) scale(1.06)`;
    }
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  update();
}

/* Sommaire des fiches : module courant mis en évidence. */
const toc = document.querySelector('.toc');
if (toc && 'IntersectionObserver' in window) {
  const links = new Map<string, HTMLElement>();
  toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => links.set(a.hash.slice(1), a));
  const tocIo = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      links.forEach((a) => a.classList.remove('is-current'));
      links.get(e.target.id)?.classList.add('is-current');
    }
  }, { rootMargin: '-30% 0px -60% 0px' });
  links.forEach((_, id) => { const t = document.getElementById(id); if (t) tocIo.observe(t); });
}

/* Portail : fin de l'entrée coordonnée ; seuls les survols rejouent ensuite les détails des illustrations. */
if (document.querySelector('.universes')) window.setTimeout(() => html.classList.add('is-settled'), 2800);

/* Fiches : le module ciblé par son ancre s'ouvre (son contenu détaillé est replié par défaut). */
const openTarget = () => {
  const id = decodeURIComponent(location.hash.slice(1));
  const details = id ? document.getElementById(id)?.querySelector<HTMLDetailsElement>('details.prog-more') : null;
  if (details) details.open = true;
};
openTarget();
window.addEventListener('hashchange', openTarget);

/* Formulaire : état d'envoi (la validation reste native + serveur). */
document.querySelectorAll<HTMLFormElement>('form.form').forEach((form) => {
  form.addEventListener('submit', () => {
    const b = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (b && form.checkValidity()) { b.setAttribute('aria-busy', 'true'); b.querySelector('.label')!.textContent = 'Envoi en cours…'; }
  });
});
window.addEventListener('pageshow', (e) => {
  if (e.persisted) document.querySelectorAll('[aria-busy="true"]').forEach((b) => { b.removeAttribute('aria-busy'); const l = b.querySelector('.label'); if (l) l.textContent = 'Envoyer ma demande'; });
});
