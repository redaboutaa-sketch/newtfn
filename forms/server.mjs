// Service de formulaire de contact — Tech Formation Nord.
// Modes : FORM_MODE=test   → enregistrement dans un fichier de test (aucun envoi à quiconque)
//         FORM_MODE=smtp   → envoi par e-mail à FORM_TO (production)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { validate } from './validate.mjs';

const PORT = Number(process.env.PORT || 3000);
const MODE = process.env.FORM_MODE || 'test';
const DATA_DIR = process.env.DATA_DIR || '/data';
const SUCCESS_URL = process.env.FORM_SUCCESS_URL || '/contact-us/merci/';
const MIN_FILL_MS = Number(process.env.FORM_MIN_FILL_MS || 3000);
const RATE_MAX = Number(process.env.FORM_RATE_MAX || 5);
const RATE_WINDOW_MS = 10 * 60 * 1000;

if (!['test', 'smtp'].includes(MODE)) throw new Error(`FORM_MODE invalide : ${MODE}`);
let transport = null;
if (MODE === 'smtp') {
  for (const k of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'FORM_TO', 'FORM_FROM']) if (!process.env[k]) throw new Error(`${k} manquant en mode smtp`);
  const nodemailer = (await import('nodemailer')).default;
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  return list.length > RATE_MAX;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k); }, 60_000).unref();

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function page(res, status, title, body) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' });
  res.end(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>${esc(title)} | Tech Formation Nord</title>
<style>body{font-family:system-ui,sans-serif;max-width:680px;margin:48px auto;padding:0 16px;line-height:1.6;color:#17212e}a{color:#0f4f80}h1{font-size:1.6rem}li{margin:.3em 0}.btn{display:inline-block;background:#1870b0;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none;font-weight:700}</style></head>
<body><main>${body}</main></body></html>`);
}

function readBody(req, limit = 32 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('too_large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function deliver(data, meta) {
  if (MODE === 'test') {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(path.join(DATA_DIR, 'demandes-test.jsonl'), JSON.stringify({ ...data, _meta: meta }) + '\n');
    return;
  }
  const lines = [
    `Nom : ${data.nom}`, `E-mail : ${data.email}`, `Téléphone : ${data.telephone || '—'}`, `Profil : ${data.profil || '—'}`,
    `Domaine : ${data.pole}`, `Sujet : ${data.sujet || '—'}`, '', data.message, '', `Reçu le ${meta.recu_le} depuis ${meta.page || 'le site'}`,
  ];
  await transport.sendMail({
    from: process.env.FORM_FROM,
    to: process.env.FORM_TO,
    replyTo: `${data.nom} <${data.email}>`,
    subject: `[Site TFN] ${data.sujet || 'Demande de renseignements'} — ${data.pole}`,
    text: lines.join('\n'),
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/health') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end(`ok ${MODE}\n`); }

  // Boîte de réception de test (préproduction uniquement, derrière l'authentification Traefik).
  if (url.pathname === '/api/test-inbox' && MODE === 'test' && req.method === 'GET') {
    const f = path.join(DATA_DIR, 'demandes-test.jsonl');
    const items = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)).reverse().slice(0, 50) : [];
    return page(res, 200, 'Demandes de test', `<h1>Demandes reçues en mode test (${items.length})</h1><p>Ces demandes ne sont transmises à personne.</p>${items.map((d) => `<article style="border:1px solid #d9e0e9;border-radius:8px;padding:12px;margin:12px 0"><strong>${esc(d.nom)}</strong> &lt;${esc(d.email)}&gt; — ${esc(d.pole)} — ${esc(d._meta.recu_le)}<br><em>${esc(d.sujet || '')}</em><p style="white-space:pre-wrap">${esc(d.message)}</p></article>`).join('')}`);
  }

  if (url.pathname !== '/api/contact') { res.writeHead(404); return res.end(); }
  if (req.method !== 'POST') { res.writeHead(405, { Allow: 'POST' }); return res.end(); }

  const ip = req.headers['x-real-ip'] || req.socket.remoteAddress || 'inconnu';
  if (rateLimited(ip)) return page(res, 429, 'Trop de demandes', '<h1>Trop de demandes</h1><p>Merci de patienter quelques minutes avant un nouvel envoi, ou appelez-nous au 03 20 16 09 15.</p><p><a class="btn" href="/contact-us/">Retour au formulaire</a></p>');

  let raw;
  try { raw = await readBody(req); } catch { return page(res, 413, 'Message trop long', '<h1>Message trop long</h1><p><a href="/contact-us/">Retour au formulaire</a></p>'); }
  const form = Object.fromEntries(new URLSearchParams(raw));
  const result = validate(form, { minFillMs: MIN_FILL_MS, now: Date.now() });

  if (result.spam) {
    // Réponse identique à un succès pour ne pas renseigner les robots ; rien n'est transmis.
    console.warn(JSON.stringify({ evt: 'spam_rejete', raison: result.spam, ip }));
    res.writeHead(303, { Location: SUCCESS_URL }); return res.end();
  }
  if (result.errors.length) {
    return page(res, 422, 'Formulaire incomplet', `<h1>Votre demande n’a pas pu être envoyée</h1><p>Merci de corriger les points suivants :</p><ul>${result.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul><p><a class="btn" href="/contact-us/#formulaire">Revenir au formulaire</a></p><p>Vous pouvez aussi nous appeler au <a href="tel:+33320160915">03 20 16 09 15</a>.</p>`);
  }
  try {
    await deliver(result.data, { recu_le: new Date().toISOString(), mode: MODE, page: req.headers.referer || '' });
    console.log(JSON.stringify({ evt: 'demande_recue', mode: MODE, pole: result.data.pole }));
    res.writeHead(303, { Location: SUCCESS_URL }); return res.end();
  } catch (e) {
    console.error(JSON.stringify({ evt: 'erreur_envoi', message: e.message }));
    return page(res, 502, 'Erreur d’envoi', '<h1>L’envoi a échoué</h1><p>Un incident technique empêche l’envoi de votre demande. Merci de nous appeler au <a href="tel:+33320160915">03 20 16 09 15</a> ou de réessayer plus tard.</p>');
  }
});

server.listen(PORT, () => console.log(JSON.stringify({ evt: 'demarrage', port: PORT, mode: MODE })));
for (const s of ['SIGTERM', 'SIGINT']) process.on(s, () => server.close(() => process.exit(0)));
