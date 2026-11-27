# SEO Roast Roadmap : techformanord.fr (2026-11-27)

Verdict : techniquement propre (indexable, sitemap et canoniques justes, 404 réels, Lighthouse mobile 90–100), mais la
page d'accueil — destination de la marque — ne disait presque rien de l'organisme (38 mots).

## Constats prouvés (relevé en production le 2026-11-27)
| Contrôle | Résultat | Preuve |
|---|---|---|
| robots.txt | `Allow: /`, `Disallow: /api/`, sitemap déclaré | `curl https://techformanord.fr/robots.txt` |
| sitemap.xml | 21 URL, toutes 200, canonique = URL | relevé par script (titre, H1, canonique, robots) |
| www / http | 301 vers `https://techformanord.fr/` | `curl -I` |
| 404 | `/xyz-inexistante/` → 404 | `curl -w %{http_code}` |
| IPv4 / IPv6 | même contenu (md5 identique) | `curl -4` / `curl -6` |
| Lighthouse mobile (labo) | `/` 96, `/acceuil/` 90, `/contact-us/` 100 ; SEO 100 ; LCP ≤ 1,8 s | `qa/perf.mjs`, Chromium 1148 |
| Contenu principal de `/` | **38 mots**, aucune présentation de l'organisme | extraction `<main>` |
| `/tech-formation-nord/` | 29 mots, même intention que `/` (portail de marque) | idem |
| Liens externes | `/contact-us/` : LinkedIn 403, Instagram 429 (blocage robots, pas forcément cassés) | `qa/liens.mjs` |

## Priorités
| # | Niveau | Constat | Impact | Correction | Responsable | Statut |
|---|---|---|---|---|---|---|
| 1 | REVENUE | Accueil sans texte sur l'organisme ; titre « …espace pédagogique » vague | Requêtes « Tech Formation Nord », « organisme de formation près de Lille » : rien de citable pour Google ni les assistants IA | Paragraphe factuel (identité, lieu, Qualiopi, NDA, liens vers les pôles et TrainingForMe) + titre « Tech Formation Nord : organisme de formation près de Lille » | agent | PR `seo/accueil-presentation-organisme` |
| 2 | REVENUE | `/tech-formation-nord/` duplique l'intention de `/` | Deux pages se partagent la requête de marque | 301 vers `/` via `docs/mapping-redirections.csv`, ou conserver | responsable du site | décision attendue |
| 3 | COMPOUNDING | E-mail différent sur chacun des trois sites | Entité incohérente pour Google et les assistants | Choisir une adresse officielle, l'aligner partout | responsable du site | à confirmer |
| 4 | REVENUE | Pages commerciales connues de Google mais non indexées : `/formations/automobile/`, `/financer-sa-formation/`, `/acceuil/`, `/service/interior-cleaning/` (« Détectée, actuellement non indexée ») ; `/entreprises/` inconnue | Aucune visibilité sur « formation automobile Lille », « financer sa formation » | Lien contextuel depuis l'accueil (page la plus explorée) vers `/formations/automobile/` (PR #15) ; puis maillage depuis les fiches indexées (`/service/maintenance/`, `/service/wheels-alignment/`) | agent | PR #15 puis lot suivant |
| 5 | FLUFF | URL WordPress supprimées encore affichées (`/service-category/*`, 410 voulu) | Disparaîtront d'elles-mêmes | rien (mapping documenté) | — | suivi |

## Search Console (`sc-domain:techformanord.fr`, accès vérifié le 2026-11-27, lecture seule)
Source : API Search Console, compte `heliostores-seo@…`, données finales du 2026-10-29 au 2026-11-25 (28 jours complets).
- **72 clics, 599 impressions, CTR 12,0 %, position moyenne 16,0.**
- Pages : `/` 59 clics / 443 impressions (pos. 13,2) ; `/services/` 4 / 175 ; `/contact-us/` 4 / 120 (pos. 3,4) ; `/service/maintenance/` 2 / 126 ; `/about-us/` 1 / 121 (pos. 3,9).
- Requêtes : « tech formation nord » 31 clics / 60 impressions, position 1,0 ; « centre de formation nord » 37 impressions, position 44 (aucun clic) ; requêtes automobiles isolées (1 impression chacune).
- Sitemap : `https://techformanord.fr/sitemap.xml`, soumis le 2026-10-29, lu le 2026-11-19, 0 erreur, 20 URL soumises (21 aujourd'hui).
- Inspection d'URL (état connu de Google, pas un test en direct) : indexées `/`, `/service/maintenance/`, `/service/wheels-alignment/`, `/infinite-grid-col-2/`, `/contact-us/` ; voir ligne 4 pour les autres ; `/tech-formation-nord/` : « Google ne reconnaît pas cette URL » (une 301 vers `/` ne ferait perdre aucun signal connu).
- Le rapport global « Indexation des pages » n'est pas exposé par l'API : suivi URL par URL dans `/var/lib/tfn-seo/gsc/`.

## Fluff (après les lignes ci-dessus)
- `/tech-formation-nord/` ne propose pas la carte « Formations en ligne » présente sur `/`.
