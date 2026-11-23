import nodemailer from 'nodemailer';
import { audit, digest, get, passwordHash, token, transaction, verifyPassword, write } from './db.mjs';
import { field, redirect, requireThat } from './http.mjs';
import { form, input, link, page, root } from './view.mjs';

const duration = 8 * 60 * 60;
const origin = new URL(process.env.LMS_ORIGIN || 'http://127.0.0.1:4330').origin;
export { origin };
const secure = origin.startsWith('https:');
if (!secure && !['127.0.0.1','localhost'].includes(new URL(origin).hostname)) {
  throw new Error('LMS_ORIGIN doit utiliser HTTPS hors développement local.');
}
const cookieName = secure ? '__Secure-trainingforme' : 'trainingforme';
const cookie = (value, age) => `${cookieName}=${value}; Max-Age=${age}; Path=${root}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
const smtp = process.env.LMS_SMTP_HOST && process.env.LMS_MAIL_FROM
  ? nodemailer.createTransport({
    host:process.env.LMS_SMTP_HOST, port:Number(process.env.LMS_SMTP_PORT || 587),
    secure:process.env.LMS_SMTP_SECURE === 'true', requireTLS:process.env.LMS_SMTP_SECURE !== 'true',
    connectionTimeout:5000, socketTimeout:10000,
    auth:process.env.LMS_SMTP_USER ? { user:process.env.LMS_SMTP_USER, pass:process.env.LMS_SMTP_PASS } : undefined,
  }) : null;

export function address(data) {
  const email = field(data, 'email', 254).toLowerCase();
  requireThat(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), 'Saisissez une adresse e-mail valide.');
  return email;
}
export function sessionKey(req) {
  const part = (req.headers.cookie || '').split(';').map((item) => item.trim()).find((item) => item.startsWith(cookieName + '='));
  const value = part?.slice(cookieName.length + 1);
  return /^[a-f0-9]{64}$/.test(value || '') ? digest(value) : null;
}
export const newPassword = (data) => {
  const password = data.get('password');
  requireThat(typeof password === 'string' && password.length >= 12 && password.length <= 256,
    'Choisissez un mot de passe de 12 à 256 caractères.');
  return password;
};
export const currentUser = (req) => get(`SELECT u.id,u.name,u.role,u.email FROM sessions_auth s JOIN users u ON u.id=s.user_id
  WHERE s.token=? AND s.expires>?`, sessionKey(req), Date.now());
function throttle(key, max) {
  const now = Date.now();
  const entry = get(`INSERT INTO throttle VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE
    SET hits=CASE WHEN expires<=? THEN 1 ELSE hits+1 END,
    expires=CASE WHEN expires<=? THEN excluded.expires ELSE expires END RETURNING hits`, digest(key), now + 900000, now, now);
  requireThat(entry.hits <= max, 'Trop de tentatives. Réessayez dans quelques minutes.', 429);
}
function resetPage(value) {
  return page('Choisir un mot de passe', '<div class="stack">' + form('reinitialiser',
    `<input type="hidden" name="token" value="${value}">` +
    input('password', 'Nouveau mot de passe', 'password', '', 'required minlength="12" maxlength="256" autocomplete="new-password"'),
    'Enregistrer') + '</div>');
}
export async function authRoute(req, path, url, data, user) {
  if (req.method === 'GET') {
    if (path === 'connexion') return user ? redirect(root + 'espace') : page('Connexion', '<div class="card stack">' +
      form('connexion', input('email','Adresse e-mail','email','','required autocomplete="username"') +
      input('password','Mot de passe','password','','required maxlength="256" autocomplete="current-password"'), 'Se connecter') +
      '<p>' + link('mot-de-passe', 'Mot de passe oublié ou première connexion') + '</p></div>');
    if (path === 'mot-de-passe') return page('Récupérer mon accès', '<div class="card stack">' +
      (smtp ? form('mot-de-passe', input('email','Adresse e-mail','email'), 'Recevoir un lien')
        : '<p>La messagerie de récupération est indisponible. Contactez votre organisme.</p>') + '</div>');
    if (path === 'reinitialiser') {
      const value = url.searchParams.get('token') || '';
      requireThat(/^[a-f0-9]{64}$/.test(value) &&
        get('SELECT 1 FROM resets WHERE token=? AND expires>?', digest(value), Date.now()), 'Ce lien est invalide ou a expiré.');
      return resetPage(value);
    }
    return;
  }
  if (path === 'connexion') {
    const email = address(data);
    throttle('login:all', 180);
    throttle('login:' + email, 8);
    const password = data.get('password');
    requireThat(typeof password === 'string' && password.length <= 256);
    const account = get('SELECT * FROM users WHERE email=?', email);
    requireThat(verifyPassword(password, account?.password), 'Adresse e-mail ou mot de passe incorrect.', 401);
    const value = token();
    transaction(() => {
      const previous = sessionKey(req);
      if (previous) write('DELETE FROM sessions_auth WHERE token=?', previous);
      write('INSERT INTO sessions_auth VALUES(?,?,?)', digest(value), account.id, Date.now() + duration * 1000);
      audit(account.id, 'connexion');
    });
    return redirect(root + 'espace', { 'Set-Cookie':cookie(value, duration) });
  }
  if (path === 'logout') {
    const key = sessionKey(req);
    if (key) transaction(() => {
      write('DELETE FROM sessions_auth WHERE token=?', key);
      if (user) audit(user.id, 'deconnexion');
    });
    return redirect(root, { 'Set-Cookie':cookie('', 0) });
  }
  if (path === 'mot-de-passe') {
    requireThat(smtp, 'La messagerie est indisponible.', 503);
    const email = address(data);
    throttle('reset:all', 40);
    throttle('reset:' + email, 3);
    const account = get('SELECT id FROM users WHERE email=?', email);
    if (account) {
      const value = token();
      write(`INSERT INTO resets VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET token=excluded.token, expires=excluded.expires`,
        digest(value), account.id, Date.now() + 30 * 60000);
      void smtp.sendMail({ from:process.env.LMS_MAIL_FROM, to:email, subject:'Votre accès à TrainingForMe',
        text:`Pour choisir votre mot de passe, ouvrez ce lien valable 30 minutes : ${origin}${root}reinitialiser?token=${value}`,
      }).catch(() => console.error('Échec d’envoi du lien de récupération.'));
    }
    return page('Vérifiez votre messagerie', '<p>Si cette adresse correspond à un compte, vous recevrez un lien pour choisir votre mot de passe.</p>');
  }
  if (path === 'reinitialiser') {
    const value = field(data, 'token', 64);
    const password = newPassword(data);
    transaction(() => {
      const reset = get('DELETE FROM resets WHERE token=? AND expires>? RETURNING user_id', digest(value), Date.now());
      requireThat(reset, 'Ce lien est invalide ou a expiré.');
      write('UPDATE users SET password=? WHERE id=?', passwordHash(password), reset.user_id);
      write('DELETE FROM sessions_auth WHERE user_id=?', reset.user_id);
      audit(reset.user_id, 'mot_de_passe_modifie');
    });
    return redirect(root + 'connexion', { 'Set-Cookie':cookie('', 0) });
  }
}
