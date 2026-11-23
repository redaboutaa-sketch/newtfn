import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { adminDashboard, adminRoute } from './admin.mjs';
import { authRoute, currentUser, origin } from './auth.mjs';
import { all, transaction, write } from './db.mjs';
import { found, HttpError, redirect, requireThat } from './http.mjs';
import { dashboard, learningRoute } from './learning.mjs';
import { esc, link, page, root } from './view.mjs';

const files = new Map([
  ['style.css', ['text/css; charset=utf-8', readFileSync(new URL('./style.css', import.meta.url))]],
  ['browser.js', ['application/javascript; charset=utf-8', readFileSync(new URL('./browser.js', import.meta.url))]],
]);
const headers = {
  'Cache-Control':'private, no-store',
  'Content-Type':'text/html; charset=utf-8',
  'Content-Security-Policy':"default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'X-Content-Type-Options':'nosniff',
  'X-Frame-Options':'DENY',
  'X-Robots-Tag':'noindex, nofollow',
  'Referrer-Policy':'no-referrer',
};
function catalogue(user) {
  const cards = all('SELECT * FROM courses ORDER BY rowid').map((course) =>
    `<article class="card">${course.id.startsWith('niveau-') ? `<p>Niveau ${esc(course.id.slice(7))}</p>` : ''}
    <h3>${esc(course.title)}</h3><p>${course.hours} h · ${course.price} € HT indicatifs</p>
    ${course.objectives ? '<p>' + esc(course.objectives) + '</p>' : ''}</article>`).join('');
  return page('TrainingForMe', `<section class="hero"><h2>Espace pédagogique de Tech Formation Nord</h2>
    <p>Retrouvez vos cours, vos travaux et vos résultats dans votre espace.</p>
    ${link(user ? 'espace' : 'connexion', user ? 'Ouvrir mon espace' : 'Se connecter', 'button')}</section>
    <h2>Catalogue des formations</h2><div class="grid">${cards}</div>
    <p><strong>Pack des quatre niveaux</strong> · 1 790 € HT indicatifs</p>
    <p><a href="/contact-us/">Renseignements et inscriptions</a></p>`,user,200,'catalogue-page');
}
async function readBody(req, path) {
  requireThat(req.headers.origin === origin, 'La requête doit provenir de TrainingForMe.',403);
  const type = req.headers['content-type'] || '';
  const multipart = type.startsWith('multipart/form-data;');
  requireThat(multipart || type.startsWith('application/x-www-form-urlencoded'), 'Format de formulaire non pris en charge.',415);
  const uploadRoute = /^(cours\/\d+\/\d+|admin\/formation\/[a-z0-9-]+\/support)$/.test(path);
  requireThat(!multipart || uploadRoute, 'Ce formulaire ne reçoit pas de fichiers.',415);
  const limit = multipart ? 21 * 1024 * 1024 : 256 * 1024;
  requireThat(Number(req.headers['content-length'] || 0) <= limit, 'La taille maximale du formulaire a été dépassée.',413);
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req.iterator({destroyOnReturn:false})) {
    bytes += chunk.length;
    requireThat(bytes <= limit, 'La taille maximale du formulaire a été dépassée.',413);
    chunks.push(chunk);
  }
  try {
    return await new Response(Buffer.concat(chunks),{headers:{'Content-Type':type}}).formData();
  } catch {
    throw new HttpError(400,'Le formulaire est illisible.');
  }
}
function rangeResponse(req, response) {
  const range = req.headers.range;
  if (!range || response.headers?.['Content-Type'] !== 'video/mp4') return response;
  const body = response.body;
  const size = body.length;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  const start = match?.[1] ? Number(match[1]) : Math.max(0,size - Number(match?.[2]));
  const end = match?.[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  if (!match || start > end || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) {
    return {status:416,headers:{'Content-Range':`bytes */${size}`},body:''};
  }
  return {status:206,headers:{...response.headers,'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${size}`},
    body:body.subarray(start,end+1)};
}
const server = createServer({requestTimeout:30000}, async (req, res) => {
  let user;
  let result;
  try {
    const url = new URL(req.url,origin);
    found(req.headers.host === new URL(origin).host && url.origin === origin);
    requireThat(['GET','POST'].includes(req.method),'Méthode non autorisée.',405);
    if (url.pathname === root.slice(0,-1) && req.method === 'GET') {
      result = redirect(root);
    } else {
      found(url.pathname.startsWith(root));
      const path = url.pathname.slice(root.length).replace(/\/$/,'');
      if (req.method === 'GET' && files.has(path)) {
        const [type,body] = files.get(path);
        result = {status:200,headers:{'Content-Type':type},body};
      } else {
        user = currentUser(req);
        const publicAuth = ['connexion','mot-de-passe','reinitialiser','logout'].includes(path);
        if (!user && !publicAuth && !(path === '' && req.method === 'GET')) {
          result = req.method === 'GET' ? redirect(root + 'connexion') : page('Connexion requise','<p>Votre session est requise.</p>',null,401);
        } else {
          const data = req.method === 'POST' ? await readBody(req,path) : null;
          // Re-evaluate the session after receiving the body of an upload.
          if (user && req.method === 'POST') requireThat(currentUser(req)?.id === user.id,'Votre session a expiré.',401);
          if (publicAuth) result = await authRoute(req,path,url,data,user);
          else if (!path && req.method === 'GET') result = catalogue(user);
          else if (path === 'espace' && req.method === 'GET') result = user.role === 'admin' ? adminDashboard(user) : dashboard(user);
          else result = await adminRoute(req,path,data,user) || await learningRoute(req,path,data,user,url);
          found(result);
        }
      }
    }
    result = rangeResponse(req,result);
  } catch (error) {
    if (!(error instanceof HttpError)) console.error('Erreur TrainingForMe',error.code || error.name);
    result = page('TrainingForMe', `<p role="alert">${esc(error instanceof HttpError ? error.message : 'Une erreur est survenue.')}</p>
      <p>${link(user ? 'espace' : '', 'Revenir à mon espace')}</p>`,user,error instanceof HttpError ? error.status : 500);
    req.resume();
  }
  const body = result.body;
  res.writeHead(result.status,{...headers,...result.headers,'Content-Length':Buffer.byteLength(body)});
  res.end(body);
});
const clean = () => transaction(() => {
  const now = Date.now();
  for (const table of ['sessions_auth','resets','throttle']) write(`DELETE FROM ${table} WHERE expires<=?`,now);
});
clean();
setInterval(clean,3600000).unref();
server.listen(Number(process.env.PORT || 4330),process.env.LMS_BIND || '127.0.0.1',() => console.log('TrainingForMe prêt.'));
