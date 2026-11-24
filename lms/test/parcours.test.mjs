import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

test('parcours des trois rôles, intégrité des évaluations et confidentialité des inscriptions', async (t) => {
  const temp = await mkdtemp(join(tmpdir(),'trainingforme-'));
  t.after(() => rm(temp,{recursive:true,force:true}));
  const portProbe = createServer().listen(0,'127.0.0.1');
  await once(portProbe,'listening');
  const { port } = portProbe.address();
  await new Promise((resolve) => portProbe.close(resolve));
  const origin = 'http://127.0.0.1:' + port;
  process.env.LMS_DB = join(temp,'test.sqlite');
  const { all, digest, get, passwordHash, token, write } = await import('../db.mjs');
  const password = 'mot de passe de recette';
  for (const [name, role] of [['admin','admin'],['trainer','trainer'],['learner','learner'],['other','learner'],['outsider','trainer']]) {
    write('INSERT INTO users(email,name,role,password) VALUES(?,?,?,?)',name + '@example.test', name,role,passwordHash(password));
  }
  const app = spawn(process.execPath,['server.mjs'],{
    cwd:new URL('../',import.meta.url),
    env:{...process.env,PORT:String(port),LMS_ORIGIN:origin,LMS_SMTP_HOST:''}, stdio:['ignore','pipe','inherit'],
  });
  t.after(async () => {
    if (app.exitCode === null) { app.kill(); await once(app,'exit'); }
  });
  await Promise.race([once(app.stdout,'data'),once(app,'exit').then(() => assert.fail('Le LMS ne démarre pas.'))]);
  const api = (path, cookie, data, headers = {}) => fetch(origin + '/trainingforme/' + path,{
    redirect:'manual', method:data ? 'POST' : 'GET',
    headers:{...(cookie ? {Cookie:cookie} : {}), ...(data ? {Origin:origin} : {}), ...headers},
    body:data ? data instanceof FormData ? data : new URLSearchParams(data) : undefined,
  });
  const login = async (name) => {
    const res = await api('connexion',null,{email:name + '@example.test',password});
    assert.equal(res.status,303);
    const cookie = res.headers.get('set-cookie');
    assert.match(cookie,/HttpOnly; SameSite=Lax/);
    return cookie.split(';')[0];
  };
  const expect = async (status,path,cookie,fields) => {
    const res = await api(path,cookie,fields);
    assert.equal(res.status,status,status === res.status ? path : path + ' ' + await res.clone().text());
    return res;
  };
  assert.equal((await api('espace')).headers.get('location'),'/trainingforme/connexion');
  const root = await expect(200,'');
  assert.match(await root.text(), /1 790 € HT/);
  assert.equal(root.headers.get('cache-control'),'private, no-store');
  const admin = await login('admin');
  const learner = await login('learner');
  const trainer = await login('trainer');
  const other = await login('other');
  const outsider = await login('outsider');
  await expect(403,'admin/formation',learner,{title:'À refuser'});
  assert.equal((await api('admin/session',admin,{title:'À refuser'},{Origin:'https://example.test'})).status,403);
  await expect(303,'admin/session',admin,{title:'Session de recette',course:'niveau-1',trainer:2});
  await expect(303,'admin/inscription',admin,{session:1,learner:3});
  await expect(303,'admin/formation/niveau-1/module',admin,{title:'Module de recette'});
  const module = 'admin/formation/niveau-1/module/1/nouvelle';
  await expect(303,module,admin,{kind:'lesson',title:'Bienvenue',body:'Leçon de recette'});
  await expect(303,module,admin,{
    kind:'quiz',title:'Quelques questions',question0:'Choix unique',choices0:'A\nB',correct0:'1',
    question1:'Choix multiple',choices1:'C\nD\nE',correct1:'1,3',
  });
  await expect(303,module,admin,{kind:'prompt',title:'Prompt de recette',body:'Prépare une séquence sur {{theme}}.',goal:'Écrivez un plan.',variables:'theme'});
  await expect(303,module,admin,{kind:'final',title:'Évaluation finale',body:'Présentez votre travail.'});
  await expect(403,'cours/1',other);
  await expect(403,'cours/1',outsider);
  await expect(403,'export/resultats.csv',trainer);
  assert.match(await (await expect(200,'espace',learner)).text(),/Reprendre ma formation/);
  await expect(303,'cours/1/1',learner,{});
  await expect(403,'cours/1/2',trainer,{});
  const quiz = new URLSearchParams([['q0','0'],['q1','0'],['q1','2']]);
  const wrong = new URLSearchParams([['q0','0'],['q1','0']]);
  await expect(303,'cours/1/2',learner,wrong);
  assert.equal(get('SELECT passed FROM attempts WHERE id=1').passed,0);
  await expect(303,'cours/1/2',learner,quiz);
  assert.equal(get('SELECT score FROM attempts WHERE id=2').score,100);
  assert.match(await (await expect(200,'cours/1/3',learner)).text(), /Copier le prompt/);
  const upload = new FormData();
  upload.set('answer','Mon plan de formation');
  upload.set('file',new File(['document de recette'],'recette.txt',{type:'text/plain'}));
  await expect(303,'cours/1/3',learner,upload);
  await expect(403,'remise/1/3',other);
  const file = await expect(200,'remise/1/3',trainer);
  assert.equal(await file.text(),'document de recette');
  await expect(403,'corriger/1/3',outsider,{passed:'1',feedback:'Refusé'});
  await expect(303,'corriger/1/3',trainer,{passed:'1',feedback:'Plan validé.'});
  await expect(409,'corriger/1/3',trainer,{passed:'0',feedback:'Deuxième correction refusée'});
  await expect(400,'attestation/1',admin,{});
  await expect(303,'cours/1/4',learner,{answer:'Travail final'});
  await expect(303,'corriger/1/4',trainer,{passed:'1',feedback:'Évaluation validée.'});
  await expect(303,'attestation/1',admin,{});
  const dashboard = await (await expect(200,'espace',learner)).text();
  assert.match(dashboard,/4 \/ 4 activités terminées/);
  assert.match(dashboard,/Modules terminés/);
  assert.match(dashboard,/100 %/);
  assert.match(dashboard,/Attestation PDF/);
  assert.match(await (await expect(200,'attestation/1',learner)).text(),/^%PDF/);
  await expect(403,'attestation/1',other);
  await expect(303,'retour/1',learner,{kind:'reclamation',message:'Une question sur les supports'});
  await expect(303,'qualite/1',admin,{response:'Voici la réponse.'});
  assert.match(await (await expect(200,'cours/1',learner)).text(),/Voici la réponse\./);
  assert.match(await (await expect(200,'export/resultats.csv',admin)).text(),/Plan validé/);
  assert.match(await (await expect(200,'export/resultats.pdf',admin)).text(),/^%PDF/);
  assert.equal(all('SELECT * FROM progress').length,4);
  await expect(303,'logout',learner,{});
  await expect(303,'espace',learner);
  const reset = token();
  write('INSERT INTO resets VALUES(?,?,?)',digest(reset),4,Date.now() + 60000);
  assert.match(await (await expect(200,'reinitialiser?token=' + reset)).text(),/Nouveau mot de passe/);
  await expect(303,'reinitialiser',null,{token:reset,password:'nouveau mot de passe'});
  await expect(400,'reinitialiser',null,{token:reset,password:'nouveau mot de passe'});
  await expect(303,'espace',other);
  await expect(401,'connexion',null,{email:'other@example.test',password});
  await expect(303,'connexion',null,{email:'other@example.test',password:'nouveau mot de passe'});
});
