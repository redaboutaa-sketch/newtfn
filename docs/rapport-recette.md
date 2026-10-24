# Rapport de recette — préproduction

Date : 24/10/2026 · Environnement : `https://tfn-preprod.76-13-44-177.sslip.io` (et `http://127.0.0.1:8095` sur le VPS) · Version : branche `feat/refonte-tfn`.

## Synthèse

| Domaine | Résultat |
|---|---|
| Reprise des contenus | **Conforme** — 5 fiches, 19 modules courts et 21 modules de parcours repris intégralement ; 11 formations beauté et 3 offres IA présentées avec lien vers leur page détaillée. |
| Statuts HTTP et mapping SEO | **Conforme** — 215/215 lignes de `docs/mapping-redirections.csv` vérifiées (200, 301 directes vers une destination en 200, 410) ; 404 réelle pour les URL inconnues. |
| Liens | **Conforme** — 23 pages internes, 144 ancres, 34 liens externes ; seul Instagram répond 429 aux robots (normal). |
| Accessibilité (axe-core, WCAG 2.1 A/AA) | **0 violation** sur les 23 gabarits. |
| Affichage mobile / ordinateur | **Conforme** — aucun débordement horizontal à 390 px et 1 366 px ; 1 seul H1 par page ; aucune image cassée ni sans attribut `alt`. |
| Formulaire | **Conforme** — validation serveur, champ piège, délai minimal, limitation de débit, mode test sans transmission. |
| Protection de la préproduction | **Conforme** — authentification, `X-Robots-Tag: noindex, nofollow` (y compris sur la réponse 401), méta `noindex`, aucun sitemap, robots.txt sans `Disallow` global. |
| Image de production (test isolé) | **Conforme** — pas de `X-Robots-Tag`, méta `index, follow`, sitemap de 21 URL, mapping 215/215. |
| Absence de secrets et de contenu fictif | **Conforme** — aucun secret versionné ; aucun lorem ipsum, note, témoignage ou mention interne dans le HTML publié. |
| Performances | Pages de 5 à 10 Ko (HTML gzip) + 5 Ko de CSS ; aucun script externe ; images de 11 à 71 Ko par page. Lighthouse non exécuté (voir limites). |

## Détails

### Statuts HTTP (extraits)
| URL | Attendu | Obtenu |
|---|---|---|
| `/`, `/services/`, `/service/maintenance/`, `/service/wheels-alignment/`, `/service/interior-cleaning/`, `/infinite-grid-col-2/`, `/m-grid-col-2/`, `/m-grid-col-3/`, `/about-us/`, `/contact-us/` | 200 | 200 |
| `/services` (sans barre finale) | 301 → `/services/` | 301 |
| `/reconvention/` et `/reconvention` | 301 → `/infinite-grid-col-2/` | 301 (directe) |
| `/contact` | 301 → `/contact-us/` | 301 |
| `/wp-sitemap.xml` et sous-sitemaps | 301 → `/sitemap.xml` | 301 |
| `/faq/`, `/our-team/`, `/team-member/*`, `/2024/09/11/*`, `/category/*`, `/feed/`, `/wp-login.php` | 410 | 410 |
| `/wp-content/uploads/2026/06/Satisfaction-clients.png` | 410 | 410 |
| `/wp-content/uploads/2024/09/hands-car-mechanic-with-wrench-garage-880x520.jpg` | 200 (conservée) | 200 |
| `/page-inexistante/` | 404 + page d'erreur | 404 |

### Formulaire
| Cas | Résultat |
|---|---|
| Demande valide | 303 → `/contact-us/merci/`, enregistrée dans `demandes-test.jsonl` (volume `tfn_preprod_forms`), visible sur `/api/test-inbox` |
| Champs manquants / e-mail invalide / sans consentement | 422, liste des erreurs en français et lien de retour |
| Champ piège rempli | 303 (réponse identique, rien d'enregistré, journalisé `spam_rejete`) |
| Envoi en moins de 3 s | rejeté comme spam |
| Rafale (> 6/min par IP réelle) | 429 |
| GET sur `/api/contact` | 405 |
| Tests unitaires (`forms/test`) | 8/8 |

### Métadonnées et données structurées
- Titre et description propres à chaque page ; canonical = URL de production de la page (contrôle bloquant dans `scripts/postbuild.mjs`).
- Open Graph et Twitter Card ; image de partage 1200×630.
- JSON-LD valide : `EducationalOrganization` (toutes les pages) et `BreadcrumbList` (pages internes). Pas de `Course` (résultat enrichi « Course info » retiré par Google en juin 2025), pas d'`AggregateRating`.

### Captures
Captures pleine page ordinateur et mobile générées par `qa/recette.mjs` (dossier `qa/resultats/`, non versionné).

## Limites de la recette
- Envoi SMTP réel non testé (identifiants de production non fournis) : à tester le jour J avant la bascule DNS.
- Lighthouse / Core Web Vitals non mesurés (outil absent du VPS) ; poids des pages mesuré à la place.
- Pas de test sur appareils physiques ni avec lecteur d'écran ; contrôle automatique axe-core uniquement.
- Validation éditoriale (points de `docs/points-a-confirmer.md`) à faire par l'organisme.

## Rejouer la recette
```bash
cd /opt/newtfn/qa && npm ci
CHROME=/root/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome BASE=http://127.0.0.1:8095 node recette.mjs
BASE=http://127.0.0.1:8095 node liens.mjs
python3 -I redirections.py http://127.0.0.1:8095 preprod
cd ../forms && npm test
```
