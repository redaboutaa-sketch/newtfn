import { address } from './auth.mjs';
import { all, audit, get, transaction, write } from './db.mjs';
import { attachment, download, field, forbidden, found, number, pdf, redirect, requireThat } from './http.mjs';
import { activities, enrollmentSelect } from './learning.mjs';
import { area, details, esc, form, input, kinds, link, page, paragraph, root, select } from './view.mjs';

const pairs = (rows) => rows.map((row) => [row.id,row.title || row.name]);
const courses = () => all('SELECT * FROM courses ORDER BY rowid');
const usersOf = (role) => all('SELECT id,name,email FROM users WHERE role=? ORDER BY name',role)
  .map((row) => [row.id,row.name + ' · ' + row.email]);
const options = Object.entries(kinds);

function courseFields(course = {}) {
  return input('title','Intitulé','text',course.title) +
    area('objectives','Objectifs pédagogiques',course.objectives) +
    input('hours','Durée indicative en heures','number',course.hours || 14,'required min="1"') +
    input('price','Prix indicatif HT en euros','number',course.price ?? 0,'required min="0"') +
    input('threshold','Seuil de réussite du QCM (%)','number',course.threshold || 70,'required min="1" max="100"');
}
function questionFields(question = {}, i) {
  return `<fieldset><legend>Question ${i + 1}</legend>${input('question' + i,'Question','text',question.label,'maxlength="300"')}
    ${area('choices' + i,'Choix proposés (un choix par ligne)',question.options?.join('\n'))}
    ${input('correct' + i,'Numéros des bonnes réponses (ex. 1,3)','text',question.correct?.map((n) => n + 1).join(','),'maxlength="30"')}
  </fieldset>`;
}
function activityFields(item = {}, assetList) {
  const questions = JSON.parse(item.questions || '[]');
  return input('title','Titre','text',item.title) +
    select('kind','Type d’activité',options,item.kind || 'lesson') +
    area('goal','Objectif ou consigne pédagogique',item.goal) +
    area('body','Contenu, questionnaire ou texte du prompt',item.body) +
    input('variables','Variables du prompt séparées par des virgules, à insérer sous la forme {{variable}}','text',item.variables,'maxlength="300"') +
    `<label>Support PDF ou vidéo MP4<select name="asset"><option value="">Aucun support</option>${assetList.map((asset) =>
      `<option value="${asset.id}"${asset.id === item.asset_id ? ' selected' : ''}>${esc(asset.name)}</option>`).join('')}</select></label>` +
    details('Questions pour une activité de type QCM', Array.from({length:8}, (_,i) => questionFields(questions[i],i)).join(''));
}
function readQuestions(data) {
  const questions = [];
  for (let i = 0; i < 8; i++) {
    const label = field(data,'question' + i,300,false);
    const choices = field(data,'choices' + i,2500,false);
    const correctText = field(data,'correct' + i,30,false);
    if (!label && !choices && !correctText) continue;
    const options = choices.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
    requireThat(label && options.length >= 2 && options.length <= 10 && new Set(options).size === options.length, 'Chaque QCM doit avoir au moins deux choix distincts.');
    requireThat(/^\d+(\s*,\s*\d+)*$/.test(correctText), 'Indiquez les numéros des bonnes réponses.');
    const correct = correctText.split(',').map((value) => Number(value) - 1).sort((a,b) => a-b);
    requireThat(correct.every((i) => i >= 0 && i < options.length) && new Set(correct).size === correct.length);
    questions.push({label,options,correct,multiple:correct.length > 1});
  }
  requireThat(questions.length, 'Ajoutez au moins une question.');
  return JSON.stringify(questions);
}
function editor(course, user) {
  const path = 'admin/formation/' + course.id;
  const assets = all('SELECT id,name FROM assets WHERE course_id=?',course.id);
  const modules = all('SELECT * FROM modules WHERE course_id=? ORDER BY id',course.id);
  return page(course.title,`<p>${link('espace','Retour à l’administration')}</p>
    ${details('Modifier la formation',form(path,courseFields(course),'Enregistrer'))}
    ${details('Ajouter un support',form(path + '/support',
      input('file','PDF ou MP4 · 20 Mio maximum','file','','required accept=".pdf,.mp4"'),'Importer',true) +
      '<ul>' + assets.map((asset) => '<li>' + esc(asset.name) + '</li>').join('') + '</ul>')}
    ${details('Créer un module',form(path + '/module',input('title','Nom du module'),'Créer'))}
    ${modules.map((mod) => `<section class="card"><h2>${esc(mod.title)}</h2>
      ${details('Renommer le module',form(path + '/module/' + mod.id,input('title','Nom du module','text',mod.title),'Renommer'))}
      ${all('SELECT * FROM activities WHERE module_id=? ORDER BY id',mod.id).map((item) =>
        details(item.title + ' · ' + kinds[item.kind],form(path + '/module/' + mod.id + '/' + item.id,
          activityFields(item,assets),'Enregistrer l’activité'))).join('')}
      ${details('Ajouter une activité',form(path + '/module/' + mod.id + '/nouvelle',activityFields({},assets),'Créer l’activité'))}
    </section>`).join('')}`,user);
}
export function adminDashboard(user) {
  const sessions = all('SELECT s.id,s.title,c.title course,u.name trainer FROM cohorts s JOIN courses c ON c.id=s.course_id JOIN users u ON u.id=s.trainer_id');
  const rows = all(enrollmentSelect + ' ORDER BY e.id DESC');
  return page('Administration pédagogique',`<h2>Catalogue et contenus</h2>
    <ul>${courses().map((c) => '<li>' + link('admin/formation/' + c.id,c.title) + '</li>').join('')}</ul>
    ${details('Créer une formation',form('admin/formation',courseFields(),'Créer la formation'))}
    <h2>Comptes, sessions et inscriptions</h2>
    ${details('Créer un compte',form('admin/compte',input('name','Nom') + input('email','E-mail','email') +
      select('role','Rôle',[['learner','Apprenant'],['trainer','Formateur']]),'Créer le compte') +
      '<p>Le titulaire choisit son mot de passe via le lien « Mot de passe oublié ou première connexion ».</p>')}
    ${details('Créer une session',form('admin/session',input('title','Nom de la session') +
      select('course','Formation',pairs(courses())) + select('trainer','Formateur',usersOf('trainer')),'Créer la session'))}
    ${sessions.map((s) => details(s.title + ' · ' + s.course + ' · ' + s.trainer,
      form('admin/session/' + s.id,select('trainer','Formateur',usersOf('trainer')),'Attribuer le formateur'))).join('')}
    ${details('Inscrire un apprenant',form('admin/inscription',select('session','Session',pairs(sessions)) +
      select('learner','Apprenant',usersOf('learner')),'Inscrire'))}
    <h2>Progression et attestations</h2><p>${link('qualite','Suivi qualité et exports')}</p>
    ${rows.length ? '<ul>' + rows.map((row) => {
      const items = activities(row);
      return `<li>${link('cours/' + row.id,row.name + ' · ' + row.title + ' · ' + row.session)}
      · ${items.filter((item) => item.completed).length}/${items.length} activités</li>`;
    }).join('') + '</ul>' : '<p>Aucune inscription.</p>'}`,user);
}
function qualityView(user) {
  const notes = all(`SELECT q.*,u.name FROM quality q JOIN enrollments e ON e.id=q.enrollment_id
    JOIN users u ON u.id=e.user_id ORDER BY q.id DESC LIMIT 200`);
  const log = all('SELECT a.*,u.name FROM audit a LEFT JOIN users u ON u.id=a.user_id ORDER BY a.id DESC LIMIT 50');
  return page('Suivi qualité',`<div class="actions">${link('export/resultats.csv','Résultats CSV','button')}
    ${link('export/resultats.pdf','Résultats PDF','button')}${link('export/journal.csv','Journal CSV','button')}
    ${link('export/qualite.csv','Retours qualité CSV','button')}</div>
    <h2>Satisfaction et réclamations</h2>${notes.map((note) => details(note.kind + ' · ' + note.name + ' · ' + note.created + ' UTC',
      paragraph(note.message) + (note.response ? paragraph(note.response) : '') +
      form('qualite/' + note.id,area('response','Réponse',note.response,'required maxlength="4000"'),'Enregistrer la réponse'))).join('') || '<p>Aucun retour.</p>'}
    <h2>Dernières activités</h2><ul>${log.map((event) =>
      `<li>${esc(event.created)} UTC · ${esc(event.name || 'Compte supprimé')} · ${esc(event.event.replaceAll('_',' '))} ${esc(event.target)}</li>`).join('')}</ul>`,user);
}
function csv(name, headers, rows) {
  const cell = (value) => {
    const text = String(value ?? '');
    return '"' + (/^[\s]*[=+@-]|^[\r\n\t]/.test(text) ? "'" : '') + text.replaceAll('"','""') + '"';
  };
  return download(name, 'text/csv; charset=utf-8', '\uFEFF' + [headers,...rows].map((row) => row.map(cell).join(';')).join('\r\n'));
}
async function exportData(path, user) {
  audit(user.id,'export',path);
  if (path === 'export/journal.csv') {
    const rows = all('SELECT created,user_id,event,target FROM audit ORDER BY id');
    return csv('journal.csv',['Date UTC','Compte','Événement','Référence'],rows.map(Object.values));
  }
  if (path === 'export/qualite.csv') {
    const rows = all('SELECT created,enrollment_id,kind,message,response FROM quality ORDER BY id');
    return csv('qualite.csv',['Date UTC','Inscription','Type','Message','Réponse'],rows.map(Object.values));
  }
  const rows = all(`SELECT u.name,c.title,s.title session,a.title activity,t.created,t.score,t.passed,t.feedback
    FROM attempts t JOIN enrollments e ON e.id=t.enrollment_id JOIN users u ON u.id=e.user_id
    JOIN cohorts s ON s.id=e.cohort_id JOIN courses c ON c.id=s.course_id JOIN activities a ON a.id=t.activity_id ORDER BY t.id`);
  const entries = rows.map((r) => [r.name,r.title,r.session,r.activity,r.created,r.score,r.passed === null ? 'En attente' : r.passed ? 'Validée' : 'À retravailler',r.feedback]);
  if (path.endsWith('.csv')) return csv('resultats.csv',['Apprenant','Formation','Session','Activité','Date UTC','Score %','Décision','Feedback'],entries);
  return pdf('resultats.pdf','Résultats TrainingForMe',entries.map((entry) => entry.filter((value) => value !== null).join(' · ')));
}
function courseValues(data) {
  return [field(data,'title',180),number(data,'hours',1,2000),number(data,'price',0,100000),
    field(data,'objectives',10000,false),number(data,'threshold',1,100)];
}
function mutate(user, event, target, change) {
  transaction(() => {
    change();
    audit(user.id,event,target);
  });
}
export async function adminRoute(req,path,data,user) {
  if (!/^(admin\/|qualite(?:\/|$)|export\/)/.test(path)) return;
  if (user.role !== 'admin') forbidden();
  const post = req.method === 'POST';
  if (path === 'qualite' && !post) return qualityView(user);
  if (!post && ['export/resultats.csv','export/resultats.pdf','export/journal.csv','export/qualite.csv'].includes(path)) return exportData(path,user);
  const qualityId = path.match(/^qualite\/(\d+)$/)?.[1];
  if (post && qualityId) {
    found(get('SELECT 1 FROM quality WHERE id=?',+qualityId));
    const response = field(data,'response',4000);
    mutate(user,'reponse_qualite',qualityId,() => write('UPDATE quality SET response=? WHERE id=?',response,+qualityId));
    return redirect(root + 'qualite');
  }
  if (post && path === 'admin/compte') {
    const email = address(data);
    const name = field(data,'name',100);
    const role = field(data,'role',10);
    requireThat(['learner','trainer'].includes(role) && !get('SELECT 1 FROM users WHERE email=?',email),'Vérifiez le rôle et utilisez une adresse encore disponible.');
    mutate(user,'compte_cree','',() => write('INSERT INTO users(email,name,role) VALUES(?,?,?)',email,name,role));
    return redirect(root + 'espace');
  }
  if (post && path === 'admin/inscription') {
    const session = number(data,'session');
    const learner = number(data,'learner');
    found(get('SELECT 1 FROM cohorts WHERE id=?',session));
    found(get("SELECT 1 FROM users WHERE id=? AND role='learner'",learner));
    mutate(user,'inscription',session,() => write('INSERT OR IGNORE INTO enrollments(cohort_id,user_id) VALUES(?,?)',session,learner));
    return redirect(root + 'espace');
  }
  const session = path.match(/^admin\/session(?:\/(\d+))?$/);
  if (post && session) {
    const trainer = number(data,'trainer');
    found(get("SELECT 1 FROM users WHERE id=? AND role='trainer'",trainer));
    if (session[1]) {
      found(get('SELECT 1 FROM cohorts WHERE id=?',+session[1]));
      mutate(user,'formateur_attribue',session[1],() => write('UPDATE cohorts SET trainer_id=? WHERE id=?',trainer,+session[1]));
    } else {
      const id = field(data,'course',60);
      const title = field(data,'title',180);
      found(get('SELECT 1 FROM courses WHERE id=?',id));
      mutate(user,'session_creee',id,() => write('INSERT INTO cohorts(course_id,title,trainer_id) VALUES(?,?,?)',id,title,trainer));
    }
    return redirect(root + 'espace');
  }
  if (post && path === 'admin/formation') {
    const values = courseValues(data);
    const id = 'formation-' + crypto.randomUUID();
    mutate(user,'formation_creee',id,() => write('INSERT INTO courses(id,title,hours,price,objectives,threshold) VALUES(?,?,?,?,?,?)',id,...values));
    return redirect(root + 'admin/formation/' + id);
  }
  const match = path.match(/^admin\/formation\/([a-z0-9-]+)(?:\/(support|module)(?:\/(\d+)(?:\/(nouvelle|\d+))?)?)?$/);
  if (!match) return;
  const [, id, section, mod, item] = match;
  const course = found(get('SELECT * FROM courses WHERE id=?',id));
  const back = redirect(root + 'admin/formation/' + id);
  if (!post) return section ? undefined : editor(course,user);
  if (!section) {
    const values = courseValues(data);
    mutate(user,'formation_modifiee',id,() => write('UPDATE courses SET title=?,hours=?,price=?,objectives=?,threshold=? WHERE id=?',...values,id));
  } else if (section === 'support' && !mod) {
    const file = requireThat(attachment(data,'file',['application/pdf','video/mp4']), 'Sélectionnez un fichier.');
    const blob = Buffer.from(await file.arrayBuffer());
    requireThat(file.type === 'application/pdf' ? blob.subarray(0,5).toString() === '%PDF-' : blob.subarray(4,8).toString() === 'ftyp',
      'Le fichier ne correspond pas au format annoncé.');
    mutate(user,'support_importe',id,() => write('INSERT INTO assets(course_id,name,mime,data) VALUES(?,?,?,?)',id,file.name.slice(0,180),file.type,blob));
  } else if (section === 'module') {
    if (mod) found(get('SELECT 1 FROM modules WHERE id=? AND course_id=?',+mod,id));
    const title = field(data,'title',180);
    if (!item) {
      mutate(user,'module_enregistre',id,() => mod ?
        write('UPDATE modules SET title=? WHERE id=?',title,+mod) : write('INSERT INTO modules(course_id,title) VALUES(?,?)',id,title));
    } else {
      const kind = field(data,'kind',10);
      requireThat(Object.hasOwn(kinds,kind));
      const body = field(data,'body',20000,kind === 'prompt');
      const goal = field(data,'goal',5000,false);
      const vars = field(data,'variables',300,false).split(',').map((v) => v.trim()).filter(Boolean);
      requireThat(vars.every((v) => /^[\p{L}\p{N}_-]+$/u.test(v)) && new Set(vars).size === vars.length,'Vérifiez les noms de variables.');
      const selectedAsset = field(data,'asset',16,false);
      const asset = selectedAsset ? found(get('SELECT id FROM assets WHERE id=? AND course_id=?',Number(selectedAsset),id)).id : null;
      const questions = kind === 'quiz' ? readQuestions(data) : '[]';
      const args = [kind,title,body,goal,vars.join(','),asset,questions];
      mutate(user,'activite_enregistree',id,() => {
        if (item === 'nouvelle') {
          write('INSERT INTO activities(kind,title,body,goal,variables,asset_id,questions,module_id) VALUES(?,?,?,?,?,?,?,?)',...args,+mod);
        } else {
          const previous = found(get('SELECT kind,questions FROM activities WHERE id=? AND module_id=?',+item,+mod));
          const hasHistory = get('SELECT 1 FROM attempts WHERE activity_id=? UNION ALL SELECT 1 FROM progress WHERE activity_id=? LIMIT 1',+item,+item);
          requireThat(!hasHistory || (previous.kind === kind && previous.questions === questions),
            'Pour préserver l’historique, ajoutez une nouvelle activité pour changer le type ou les questions.');
          write('UPDATE activities SET kind=?,title=?,body=?,goal=?,variables=?,asset_id=?,questions=? WHERE id=?',...args,+item);
        }
      });
    }
  } else return;
  return back;
}
