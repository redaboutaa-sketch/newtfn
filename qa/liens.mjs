// Contrôle des liens : pages internes (statut + ancres existantes) et destinations externes.
// Usage : BASE=http://127.0.0.1:8095 node liens.mjs
const BASE = process.env.BASE || 'http://127.0.0.1:8095';
const seen = new Map(); const queue = ['/']; const external = new Map(); const anchors = []; const problems = [];
const ids = new Map();
const hrefs = (html) => [...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
while (queue.length) {
  const p = queue.shift(); if (seen.has(p)) continue;
  const r = await fetch(BASE + p, { redirect: 'manual' }); seen.set(p, r.status);
  if (r.status !== 200) { problems.push(`interne ${p} -> ${r.status}`); continue; }
  if (!(r.headers.get('content-type') || '').includes('html')) continue;
  const html = await r.text();
  ids.set(p, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  for (const h of hrefs(html)) {
    if (h.startsWith('tel:') || h.startsWith('mailto:')) continue;
    if (/^https?:/.test(h)) { if (!external.has(h)) external.set(h, p); continue; }
    const u = new URL(h, BASE + p);
    if (u.hash) anchors.push({ page: u.pathname, id: decodeURIComponent(u.hash.slice(1)), from: p });
    if (!seen.has(u.pathname) && !queue.includes(u.pathname)) queue.push(u.pathname);
  }
}
for (const a of anchors) if (ids.has(a.page) && !ids.get(a.page).has(a.id)) problems.push(`ancre manquante ${a.page}#${a.id} (depuis ${a.from})`);
for (const [u, from] of external) {
  let st;
  try { st = (await fetch(u, { method: 'GET', redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (recette TFN)' }, signal: AbortSignal.timeout(15000) })).status; } catch (e) { st = 'erreur ' + e.message; }
  if (st !== 200) problems.push(`externe ${u} -> ${st} (depuis ${from})`);
  external.set(u, st);
}
console.log(`${seen.size} URL internes, ${anchors.length} ancres, ${external.size} liens externes`);
console.log(problems.length ? problems.join('\n') : 'Aucun problème.');
