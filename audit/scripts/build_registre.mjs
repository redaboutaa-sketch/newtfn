// Génère docs/registre-sources.csv : chaque contenu repris, sa source, sa date de collecte,
// sa destination et son statut de vérification. Usage : node audit/scripts/build_registre.mjs
// (depuis la racine du dépôt ; utilise le module yaml installé dans site/).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('site/package.json'));
const YAML = require('yaml');

const D = '2026-10-24';
const rows = [];
const add = (source, titre, type, destination, statut, remarque = '') => rows.push({ source, date_collecte: D, titre, type, destination, statut, remarque });

// 1. Fiches et modules de formation (automobile).
for (const f of fs.readdirSync('site/src/content/fiches').filter((x) => x.endsWith('.yaml'))) {
  const d = YAML.parse(fs.readFileSync(`site/src/content/fiches/${f}`, 'utf8'));
  const src = d.sources[0].url;
  add(src, d.titre, 'page (introduction, sections)', d.url, 'repris – à valider', 'Texte d’origine conservé ; corrections orthographiques et de présentation uniquement.');
  for (const p of d.programmes || []) add(src, `${p.code ? p.code + ' – ' : ''}${p.titre}`, 'module de formation', `${d.url}#prog-${p.id}`, 'repris – à valider', d.famille === 'carrosserie-peinture' || d.famille === 'maintenance-diagnostic' || d.famille === 'commerce' ? 'Structure et formulations proches du catalogue GNFA : droits de reprise à confirmer.' : '');
  if (d.parcours) for (const ph of d.parcours.phases) for (const m of ph.modules) add(src, m.titre, 'module de parcours', `${d.url}#sommaire`, 'repris – à valider', '');
}

// 2. Formations beauté (Maison Beauxlieux) : titre, durée, public, lien.
const poles = YAML.parse(fs.readFileSync('site/src/content/data/poles.yaml', 'utf8'));
for (const fam of poles.find((p) => p.id === 'beaute').familles) for (const x of fam.formations)
  add(x.url, x.titre, 'formation (résumé : durée, public)', '/formations/beaute-bien-etre/', 'repris – publié par Maison Beauxlieux', 'Programme détaillé non recopié : lien vers la fiche.');
for (const fam of poles.find((p) => p.id === 'ia').familles)
  add(fam.lien.url, fam.nom, 'offre IA (synthèse originale)', '/formations/intelligence-artificielle/', 'reformulé – à valider', 'Aucune statistique, note ni témoignage repris (sources non vérifiables).');

// 3. Informations sur l'organisme.
const facts = [
  ['https://dgefp.opendatasoft.com/explore/dataset/liste-publique-des-of-v2/ (SIREN 930182738)', 'Raison sociale, NDA, adresse, certification « actions de formation »', 'mentions, qualité, pied de page', 'vérifié – source officielle'],
  ['https://recherche-entreprises.api.gouv.fr/search?q=930182738', 'Forme juridique SAS, SIRET, APE 85.59A, représentant légal', 'mentions légales', 'vérifié – source officielle', 'Représentant légal à confirmer comme directeur de la publication.'],
  ['https://techformanord.fr/wp-content/uploads/2026/06/2026-03-10-16-51.pdf', 'Certificat Qualiopi CCTA n° 3590226QA-A (24/02/2026 – 03/10/2027)', '/qualite/, /documents/certificat-qualiopi-tech-formation-nord.pdf', 'vérifié – document + liste publique', 'Identique au PDF publié par maisonbeauxlieux.com (empreinte MD5 6b96ab5b…).'],
  ['https://techformanord.fr/wp-content/uploads/2025/07/plandacces.png', 'Accès voiture, bus L1, à pied ; SIRET ; TVA', '/informations-pratiques/', 'repris – à valider'],
  ['https://techformanord.fr/about-us/', 'Restauration à proximité ; mission ; « Pourquoi nous choisir »', '/about-us/, /informations-pratiques/', 'repris – à valider'],
  ['https://techformanord.fr/contact-us/', 'Téléphone 03 20 16 09 15 ; e-mail ; horaires (9h–18h, samedi 9h–12h)', 'données centrales (organisme.yaml)', 'repris – à confirmer', 'Horaires différents dans le pied de page (17h) ; lien tel: erroné (03 20 97 81 14).'],
  ['https://techformanord.fr/service/maintenance/', 'Référent handicap 06 87 09 40 03', 'données centrales (organisme.yaml)', 'repris – à confirmer'],
  ['https://techformanord.fr/infinite-grid-col-2/', 'Texte « Parcours de reconversion » et statistiques de recrutement (+10 %, 48 %)', '/infinite-grid-col-2/', 'repris – source des chiffres à confirmer'],
  ['https://maisonbeauxlieux.com/', 'Adresse 21 bis rue de Faches, téléphone, e-mail, horaires de Maison Beauxlieux ; mention « Titulaire du certificat : TECH FORMATION NORD »', '/formations/beaute-bien-etre/, /contact-us/', 'repris – publié par Maison Beauxlieux'],
  ['https://maisonbeauxlieux.com/espaces', 'Existence d’une offre de location d’espaces distincte des formations', '/formations/beaute-bien-etre/', 'repris – publié par Maison Beauxlieux'],
  ['https://iatechformanord.fr/', 'Présentation « TFN · Tech Formation Nord », publics, outils enseignés, étapes d’accompagnement', '/formations/intelligence-artificielle/', 'reformulé – à valider'],
  ['https://iatechformanord.fr/faq/ (contenu chargé en JavaScript)', 'Format présentiel Lille, groupes 6 à 8, outils (ChatGPT, Make, Zapier)', '/formations/intelligence-artificielle/', 'reformulé – à valider'],
];
for (const [s, t, dest, st, rem = ''] of facts) add(s, t, 'information organisme', dest, st, rem);

// 4. Médias conservés aux mêmes chemins.
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk('site/public/wp-content')) {
  const p = '/' + path.relative('site/public', f);
  add('https://techformanord.fr' + p, path.basename(p), 'média', p, 'conservé – droits à confirmer', /hands-car|stylish-elegant|man-painting|revslider|about-img|infobox/.test(p) ? 'Image issue du thème de démonstration (banque d’images) : licence à vérifier.' : '');
}

const esc = (v) => (/[",\n;]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
const cols = ['source', 'date_collecte', 'titre', 'type', 'destination', 'statut', 'remarque'];
fs.writeFileSync('docs/registre-sources.csv', [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c] ?? '')).join(','))].join('\n') + '\n');
console.log(`${rows.length} entrées dans docs/registre-sources.csv`);
