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
| 4 | COMPOUNDING | Search Console : aucun accès vérifié pour ce domaine | Pas de mesure d'indexation ni de requêtes | Ajouter le compte de service en lecture (voir `suivi.md`) | responsable du site | accès manquant |

## Fluff (après les lignes ci-dessus)
- `/tech-formation-nord/` ne propose pas la carte « Formations en ligne » présente sur `/`.
