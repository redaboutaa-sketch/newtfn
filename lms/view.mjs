export const root = '/trainingforme/';
export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
})[char]);
export const link = (path, label, cls = '') => `<a class="${cls}" href="${root}${esc(path)}">${esc(label)}</a>`;
export const button = (label) => `<button>${esc(label)}</button>`;
export const input = (name, label, type = 'text', value = '', attrs = 'required') =>
  `<label>${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" ${attrs}></label>`;
export const area = (name, label, value = '', attrs = '') =>
  `<label>${esc(label)}<textarea name="${name}" ${attrs}>${esc(value)}</textarea></label>`;
export const select = (name, label, options, current) =>
  `<label>${esc(label)}<select name="${name}" required><option value="">Choisir</option>${options.map(([id, text]) =>
    `<option value="${esc(id)}"${String(current) === String(id) ? ' selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
export const form = (path, fields, label, upload = false) =>
  `<form method="post" action="${root}${esc(path)}"${upload ? ' enctype="multipart/form-data"' : ''}>${fields}${button(label)}</form>`;
export const details = (label, content) => `<details><summary>${esc(label)}</summary>${content}</details>`;
export const paragraph = (text) => `<p>${esc(text).replace(/\r?\n/g, '<br>')}</p>`;
export const roles = { admin:'Administration', trainer:'Espace formateur', learner:'Mes formations' };
export const kinds = {
  lesson:'Leçon', position:'Questionnaire de positionnement', prompt:'Prompt ChatGPT', exercise:'Exercice',
  quiz:'QCM', final:'Évaluation finale', review:'Bilan',
};
export function page(title, content, user, status = 200) {
  return { status, body: `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow"><title>${esc(title)} | TrainingForMe</title>
    <link rel="stylesheet" href="${root}style.css"><script src="${root}browser.js" defer></script></head>
    <body><a class="skip" href="#content">Aller au contenu</a><header class="top">
    ${link('', 'TrainingForMe', 'brand')}<nav aria-label="Navigation principale"><a href="/">Tech Formation Nord</a>
    ${user ? form('logout', '', 'Se déconnecter') : link('connexion', 'Se connecter', 'button')}</nav></header>
    <div class="shell${user ? '' : ' public'}">${user ? `<aside><nav aria-label="Espace pédagogique">${link('espace',roles[user.role])}
    ${link('', 'Catalogue')}${user.role === 'admin' ? link('qualite', 'Suivi qualité') : ''}</nav></aside>` : ''}
    <main id="content" tabindex="-1"><h1>${esc(title)}</h1>${content}</main></div>
    <footer><a href="/politique-de-confidentialite/">Confidentialité</a> · <a href="/accessibilite-handicap/">Accessibilité</a> · <a href="/contact-us/">Contact</a></footer></body></html>` };
}
