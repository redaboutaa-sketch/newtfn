import { all, audit, get, transaction, write } from './db.mjs';
import { attachment, download, field, forbidden, found, pdf, redirect, requireThat } from './http.mjs';
import { area, esc, form, input, kinds, link, page, paragraph, root, select } from './view.mjs';

export const enrollmentSelect = `SELECT e.id,e.user_id,c.id course_id,c.title,c.objectives,c.threshold,
  s.title session,s.trainer_id,u.name FROM enrollments e JOIN cohorts s ON s.id=e.cohort_id
  JOIN courses c ON c.id=s.course_id JOIN users u ON u.id=e.user_id`;
export function enrollment(id, user) {
  if (user.role === 'admin') return found(get(enrollmentSelect + ' WHERE e.id=?', id));
  const scope = user.role === 'trainer' ? 's.trainer_id' : 'e.user_id';
  const row = get(enrollmentSelect + ` WHERE e.id=? AND ${scope}=?`, id, user.id);
  return row || forbidden();
}
export function activities(row) {
  return all(`SELECT a.*,m.title module,p.completed FROM modules m JOIN activities a ON a.module_id=m.id
    LEFT JOIN progress p ON p.activity_id=a.id AND p.enrollment_id=? WHERE m.course_id=? ORDER BY m.id,a.id`, row.id, row.course_id);
}
export function dashboard(user) {
  const rows = all(enrollmentSelect + (user.role === 'learner' ? ' WHERE e.user_id=?' : ' WHERE s.trainer_id=?'), user.id);
  const courses = rows.map((row) => {
    const items = activities(row);
    const completed = items.filter((item) => item.completed).length;
    const next = items.find((item) => !item.completed);
    const target = 'cours/' + row.id;
    return `<article class="card"><h2>${esc(row.title)}</h2><p>${esc(row.session)}${user.role === 'trainer' ? ' · ' + esc(row.name) : ''}</p>
      <label>${completed} / ${items.length} activités terminées<progress value="${completed}" max="${items.length || 1}"></progress></label>
      <div class="actions">${link(user.role === 'learner' && next ? target + '/' + next.id : target,
        user.role === 'learner' ? (next ? 'Reprendre ma formation' : 'Voir la formation') : 'Voir le suivi', 'button')}
      ${get('SELECT 1 FROM certificates WHERE enrollment_id=?', row.id) ? link('attestation/' + row.id,'Attestation PDF') : ''}</div></article>`;
  }).join('');
  return page(user.role === 'learner' ? 'Mes formations' : 'Suivi des apprenants',
    `<p>Bonjour ${esc(user.name)}.</p><div class="grid">${courses || '<p>Aucune formation attribuée pour le moment.</p>'}</div>
    ${link('', 'Voir les formations disponibles')}`, user);
}
function assessment(item) {
  return JSON.parse(item.questions).map((q, i) => `<fieldset><legend>${esc(q.label)}</legend>${q.options.map((option, n) =>
    `<label><input type="${q.multiple ? 'checkbox' : 'radio'}" name="q${i}" value="${n}"${q.multiple ? '' : ' required'}> ${esc(option)}</label>`).join('')}</fieldset>`).join('');
}
function answers(item, data) {
  const questions = JSON.parse(item.questions);
  let correct = 0;
  const submitted = questions.map((q, i) => {
    const values = data.getAll('q' + i);
    requireThat(values.length > 0 && (q.multiple || values.length === 1) &&
      values.every((v) => typeof v === 'string' && /^(0|[1-9]\d*)$/.test(v) && +v < q.options.length) &&
      new Set(values).size === values.length, 'Répondez à chaque question.');
    const sorted = values.map(Number).sort((a,b) => a-b);
    if (String(sorted) === String(q.correct)) correct++;
    return sorted;
  });
  return { submitted, score:Math.round(100 * correct / questions.length), correct, total:questions.length };
}
function progress(id, activity) {
  write('INSERT OR IGNORE INTO progress(enrollment_id,activity_id) VALUES(?,?)',id,activity);
}
function assetMarkup(row, item) {
  if (!item.asset_id) return '';
  const path = `support/${row.id}/${item.asset_id}`;
  const asset = get('SELECT mime,name FROM assets WHERE id=?',item.asset_id);
  return `<p>${link(path,'Télécharger ' + asset.name)}</p>${asset.mime === 'video/mp4' ?
    `<video controls preload="none" src="${root}${path}?lecture=1"></video>` : ''}`;
}
function promptMarkup(item) {
  const id = 'prompt-' + item.id;
  const variables = item.variables.split(',').filter(Boolean);
  return `<section><h3>Prompt à personnaliser</h3><p class="notice">N’insérez aucune donnée personnelle, confidentielle ou concernant vos apprenants dans un outil d’IA.</p>
    ${variables.map((name) => input(name, name, 'text', '', `data-variable="${id}" maxlength="200"`)).join('')}
    ${area('prompt','Prompt complet',item.body,`id="${id}" readonly rows="7"`)}
    <div class="actions"><button type="button" data-copy="${id}">Copier le prompt</button>
      <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Ouvrir ChatGPT (nouvel onglet)</a><span role="status"></span></div></section>`;
}
function resultMarkup(row, item, user) {
  const results = all(`SELECT id,answer,filename,score,passed,feedback,created FROM attempts
    WHERE enrollment_id=? AND activity_id=? ORDER BY id DESC`,row.id,item.id);
  if (!results.length) return '';
  return '<h3>Historique des tentatives</h3>' + results.map((attempt) => {
    const isQuiz = item.kind === 'quiz';
    return `<article class="card"><p><strong>${esc(attempt.created)} UTC</strong> · ${attempt.passed === null ? 'En attente de correction' : attempt.passed ? 'Réussie' : 'À retravailler'}
      ${attempt.score === null ? '' : ' · ' + attempt.score + ' %'}</p>
      ${!isQuiz && attempt.answer ? paragraph(attempt.answer) : ''}
      ${attempt.filename ? link('remise/' + row.id + '/' + attempt.id, 'Télécharger la remise') : ''}
      ${attempt.feedback ? paragraph(attempt.feedback) : ''}
      ${user.role !== 'learner' && !isQuiz && attempt.passed === null ? form('corriger/' + row.id + '/' + attempt.id,
        select('passed','Décision',[[1,'Validé'],[0,'À retravailler']]) + area('feedback','Feedback individualisé','','required maxlength="5000"'), 'Enregistrer la correction') : ''}
      </article>`;
  }).join('');
}
export async function learningRoute(req, path, data, user, url) {
  const [route, id, detail] = path.split('/');
  if (!['cours','support','remise','corriger','attestation','retour'].includes(route)) return;
  if (path !== [route,id,detail].filter(Boolean).join('/') || !/^\d+$/.test(id || '') || (detail && !/^\d+$/.test(detail))) return;
  const row = enrollment(Number(id), user);
  const back = `cours/${row.id}`;
  const items = activities(row);
  const cert = get('SELECT * FROM certificates WHERE enrollment_id=?',row.id);
  if (route === 'support' && req.method === 'GET') {
    found(items.some((item) => item.asset_id === +detail));
    const asset = found(get('SELECT * FROM assets WHERE id=? AND course_id=?',+detail,row.course_id));
    audit(user.id, 'support_ouvert', asset.id);
    return download(asset.name, asset.mime, asset.data, asset.mime === 'video/mp4' && url.searchParams.has('lecture'));
  }
  if (route === 'remise' && req.method === 'GET') {
    const attempt = found(get('SELECT filename,attachment FROM attempts WHERE id=? AND enrollment_id=?',+detail,row.id));
    return download(found(attempt.filename), 'application/octet-stream', attempt.attachment);
  }
  if (route === 'attestation') {
    if (req.method === 'GET') {
      found(cert);
      audit(user.id, 'attestation_telechargee', row.id);
      return pdf('attestation-trainingforme.pdf','Attestation de fin de formation', [
        'Tech Formation Nord — TrainingForMe', 'Apprenant : ' + cert.learner_name, 'Formation : ' + cert.course_title,
        'Session : ' + cert.session_title, 'Délivrée le ' + cert.issued.slice(0,10) + ' (UTC).',
        'Référence : TFM-' + row.id, 'Cette attestation indique l’achèvement du parcours et la validation de l’évaluation finale.',
      ]);
    }
    if (user.role !== 'admin') forbidden();
    requireThat(items.some((item) => item.kind === 'final') && items.every((item) => item.completed),
      'La formation et son évaluation finale doivent être terminées avant la délivrance.');
    transaction(() => {
      if (write('INSERT OR IGNORE INTO certificates(enrollment_id,issued_by,learner_name,course_title,session_title) VALUES(?,?,?,?,?)',
        row.id,user.id,row.name,row.title,row.session).changes) {
        audit(user.id,'attestation_emise',row.id);
      }
    });
    return redirect(root + back);
  }
  if (route === 'corriger' && req.method === 'POST') {
    if (user.role === 'learner') forbidden();
    const attempt = found(get('SELECT activity_id,passed FROM attempts WHERE id=? AND enrollment_id=?',+detail,row.id));
    requireThat(attempt.passed === null, 'Cette tentative est déjà corrigée.',409);
    const passed = field(data,'passed',1);
    requireThat(['0','1'].includes(passed));
    const feedback = field(data,'feedback',5000);
    transaction(() => {
      write('UPDATE attempts SET passed=?,feedback=?,reviewer_id=?,reviewed=CURRENT_TIMESTAMP WHERE id=?',
        +passed,feedback,user.id,+detail);
      if (+passed) progress(row.id,attempt.activity_id);
      audit(user.id,'correction',detail);
    });
    return redirect(root + back + '/' + attempt.activity_id);
  }
  if (route === 'retour' && req.method === 'POST') {
    if (user.role !== 'learner') forbidden();
    const kind = field(data,'kind',15);
    requireThat(['satisfaction','reclamation'].includes(kind));
    const message = field(data,'message',4000);
    transaction(() => {
      const entry = write('INSERT INTO quality(enrollment_id,kind,message) VALUES(?,?,?)',row.id,kind,message);
      audit(user.id,'retour_qualite',entry.lastInsertRowid);
    });
    return redirect(root + back + '#qualite');
  }
  if (route !== 'cours') return;
  const item = detail ? found(items.find((entry) => entry.id === +detail)) : null;
  if (req.method === 'POST') {
    if (user.role !== 'learner') forbidden();
    found(item);
    const kind = item.kind;
    if (kind === 'quiz') {
      const { submitted, score, correct, total } = answers(item,data);
      const passed = Number(100 * correct >= row.threshold * total);
      transaction(() => {
        write('INSERT INTO attempts(enrollment_id,activity_id,answer,score,passed) VALUES(?,?,?,?,?)',
          row.id,item.id,JSON.stringify(submitted),score,passed);
        if (passed) progress(row.id,item.id);
        audit(user.id,'tentative_qcm',item.id);
      });
    } else if (['position','exercise','prompt','final'].includes(kind)) {
      const answer = field(data,'answer',15000,false);
      const file = attachment(data,'file',['application/pdf','text/plain','image/jpeg','image/png']);
      requireThat(answer || file, 'Saisissez une réponse ou joignez un fichier.');
      const blob = file ? Buffer.from(await file.arrayBuffer()) : null;
      transaction(() => {
        write('INSERT INTO attempts(enrollment_id,activity_id,answer,filename,attachment) VALUES(?,?,?,?,?)',
          row.id,item.id,answer,file?.name.slice(0,180) || null,blob);
        if (kind === 'position') progress(row.id,item.id);
        audit(user.id,'remise',item.id);
      });
    } else {
      transaction(() => {
        if (write('INSERT OR IGNORE INTO progress(enrollment_id,activity_id) VALUES(?,?)',row.id,item.id).changes) {
          audit(user.id,'activite_terminee',item.id);
        }
      });
    }
    return redirect(root + back + '/' + item.id);
  }
  if (item) {
    const p = back + '/' + item.id;
    const body = item.kind === 'prompt' ? promptMarkup(item) : paragraph(item.body);
    const action = item.kind === 'quiz' ? form(p, assessment(item),'Envoyer mes réponses') :
      ['exercise','prompt','position','final'].includes(item.kind) ?
        form(p,area('answer','Ma réponse','','maxlength="15000"') +
          input('file','Pièce jointe facultative (PDF, TXT, PNG, JPEG · 20 Mio maximum)','file','','accept=".pdf,.txt,.png,.jpg,.jpeg"'),
        'Déposer mon travail',true) : item.completed ? '<p>Activité terminée.</p>' : form(p,'','Marquer comme terminée');
    return page(item.title,`<p>${link(back,'Plan de la formation')} · ${esc(kinds[item.kind])}</p><div class="card">
      ${item.goal ? paragraph(item.goal) : ''}${body}${assetMarkup(row,item)}
      ${user.role === 'learner' ? action : ''}</div>${resultMarkup(row,item,user)}`,user);
  }
  const modules = all('SELECT * FROM modules WHERE course_id=? ORDER BY id',row.course_id);
  const notes = all('SELECT * FROM quality WHERE enrollment_id=? ORDER BY id DESC',row.id);
  return page(row.title, `<p>${esc(row.session)} · ${esc(row.name)}</p>
    ${row.objectives ? '<h2>Objectifs pédagogiques</h2>' + paragraph(row.objectives) : ''}
    ${modules.length ? modules.map((mod) => {
      const list = items.filter((entry) => entry.module_id === mod.id);
      return `<section class="card"><h2>${esc(mod.title)}</h2><p>${list.length && list.every((entry) => entry.completed) ? 'Module terminé' : `${list.filter((entry) => entry.completed).length} / ${list.length} activités terminées`}</p>
      <ol>${list.map((entry) => `<li>${link(back + '/' + entry.id,entry.title)} · ${esc(kinds[entry.kind])}${entry.completed ? ' · Terminée' : ''}
      ${entry.asset_id ? ' · ' + link(`support/${row.id}/${entry.asset_id}`,'Support') : ''}</li>`).join('')}</ol></section>`;
    }).join('') : '<p>Les supports pédagogiques sont en attente d’import.</p>'}
    <section class="card"><h2>Attestation</h2>${cert ? link('attestation/' + row.id,'Télécharger l’attestation PDF') :
      user.role === 'admin' && items.some((entry) => entry.kind === 'final') && items.every((entry) => entry.completed) ?
        form('attestation/' + row.id,'','Délivrer l’attestation') : '<p>Aucune attestation disponible.</p>'}</section>
    ${user.role === 'learner' ? `<section class="card" id="qualite"><h2>Satisfaction et réclamations</h2>
      ${form('retour/' + row.id,select('kind','Sujet',[['satisfaction','Questionnaire de satisfaction'],['reclamation','Réclamation']]) +
        area('message','Pour la satisfaction, indiquez votre appréciation et vos suggestions. Pour une réclamation, décrivez la difficulté rencontrée.','','required maxlength="4000"'),
        'Envoyer')}${notes.map((note) => `<article><h3>${note.kind === 'satisfaction' ? 'Satisfaction' : 'Réclamation'}</h3>${paragraph(note.message)}
        ${note.response ? paragraph(note.response) : '<p>En attente de réponse.</p>'}</article>`).join('')}</section>` : ''}`,user);
}
