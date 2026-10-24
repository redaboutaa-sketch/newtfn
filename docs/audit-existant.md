# Audit de l'existant

Collecte réalisée le **24/10/2026**. Les contenus collectés ont été traités comme des données (aucune instruction qu'ils contiendraient n'a été exécutée).

## 1. Méthode et outils

| Besoin | Outil utilisé | Remarque |
|---|---|---|
| Inventaire des URL | Collecteur Python maison (`audit/scripts/crawl.py`) : lecture de `robots.txt`, de tous les sitemaps (récursif), puis exploration BFS de tous les liens internes, sans suivre les redirections (statut et `Location` relevés). | Une recherche Google `site:` ne renvoie aucune page du domaine : elle n'a pas servi d'inventaire. |
| Contenus WordPress | API REST publique (`/wp-json/wp/v2/pages`, `posts`, `media`, `types`, `search`) | 41 pages, 9 articles, 77 médias publics. Les types `pbmit-service` et `pbmit-team-member` ne sont pas exposés par l'API : contenus lus dans le HTML. |
| Extraction du texte | `audit/scripts/totext.py` (HTML → texte structuré, titres, listes, liens, images) | Extraits versionnés dans `audit/extraits/`. |
| Contenus chargés en JavaScript | **REA** (`capture_browser_scenario`, Chromium headless) puis lecture du bundle JS public du site IA | Le site IA est une application React : les réponses de sa FAQ (accordéons) ne sont pas dans le HTML initial ; elles ont été lues dans `assets/index-*.js`. Le scénario REA de clic sur les accordéons a échoué (nom accessible des boutons différent) ; aucune commande REA n'a été inventée. |
| Images et documents | Téléchargement et lecture visuelle (certificats, plan d'accès, schéma de parcours, badges) | Voir §5 et §6. |
| Vérifications officielles | Liste publique des organismes de formation (DGEFP, data.gouv), API Recherche d'entreprises, fiche France Compétences RS6776, RIPE (hébergeur) | — |
| Recette visuelle et accessibilité | `qa/recette.mjs` (playwright-core + axe-core) et REA | Voir `docs/rapport-recette.md`. |

Données non disponibles (limite documentée, non bloquante) : export CMS/base WordPress, Search Console, statistiques Burst/Jetpack, journaux serveur IONOS. Ces exports compléteraient l'inventaire par les URL qui reçoivent encore du trafic sans être liées.

## 2. Site principal techformanord.fr

**Technique** : WordPress (confirmé : en-têtes `wp-json`, `/wp-sitemap.xml`, `wp-content`), thème « Pbmit » de démonstration pour garage automobile, Elementor, Slider Revolution, WooCommerce, Contact Form 7, Complianz, Popup Maker, Jetpack, Burst Statistics, Klaviyo, Mailchimp for WP, Really Simple Security. Hébergement IONOS (217.160.0.65 + IPv6 2001:8d8:100f:f000::200). DNS IONOS. Messagerie IONOS (MX, SPF, DMARC `p=none`).

**robots.txt** : `Disallow: /wp-admin/`, sitemap `wp-sitemap.xml`. **Sitemaps** : 7 sous-sitemaps (articles, pages, services, membres d'équipe, catégories, étiquettes, catégories de services).

**Inventaire** : 83 URL HTML découvertes par sitemap + crawl, complétées de 27 URL techniques/médias sondées, et des médias référencés ; total **215 URL** dans `docs/inventaire-url.csv`.

| Catégorie | Nombre | Exemples |
|---|---:|---|
| Contenu réel de l'organisme | 10 pages | `/`, `/services/`, `/service/maintenance/`, `/service/wheels-alignment/` (Commerce), `/service/interior-cleaning/` (Carrosserie peinture), `/infinite-grid-col-2/` (Reconversion), `/m-grid-col-3/` (Mécanicien service rapide), `/m-grid-col-2/` (Aide carrossier), `/about-us/`, `/contact-us/` |
| Doublon / reprise d'un tiers | 1 | `/reconvention/` (texte GNFA) |
| Démonstration du thème | 60+ | 9 articles en anglais (« Dallas Auto Repair »…), 8 membres d'équipe fictifs, 20 gabarits de grilles, FAQ en lorem ipsum, tarifs fictifs, boutique WooCommerce vide, catégories et étiquettes |
| Technique | ~20 | flux RSS, sitemaps, `wp-login.php`, `xmlrpc.php`, `wp-json` |

**URL réelles retrouvées** (en plus des exemples de la mission) : Contact = `/contact-us/` (`/contact` y redirige déjà) ; Reconversion = `/infinite-grid-col-2/` (lien du menu) ; parcours = `/m-grid-col-3/` et `/m-grid-col-2/` ; le catalogue `/services/`.

**Pages comportant plusieurs programmes** : `/service/maintenance/` (5 modules : 44992 à 44996), `/service/interior-cleaning/` (12 modules : 08 à 21), `/service/wheels-alignment/` (2 modules). Tous ont été repris intégralement (objectifs, public, prérequis, contenu, applications pratiques, méthodes, évaluation, tarif).

**Défauts relevés** : libellés de thème sans rapport (« Accessories », « Filters », « Benefits of Service », « Homepage 03 », « Read More »), blocs techniques visibles (`{"cpt":"service",...}`), titre de page `Homepage 03`, **aucune méta description** sur les 10 pages réelles, aucune page mentions légales / confidentialité (pourtant citée par la case RGPD du formulaire), lien `tel:` erroné, horaires contradictoires, dates de sessions échues, H1 multiples sur 4 pages réelles (jusqu'à 3 H1 sur `/m-grid-col-2/`), H1 d'accueil « leader dans la formation en mécanique à lille », slider de démonstration, images hotlinkées depuis gnfa-auto.fr.

**Mesure** : pas de Google Analytics/GTM ni de balise Search Console ; Burst Statistics (local à WordPress), Jetpack Stats, script Klaviyo (compte `XVZ8jK`).

## 3. Maison Beauxlieux — maisonbeauxlieux.com

Application rendue côté serveur (contenu présent dans le HTML). 25 URL : accueil, espaces (6 fiches), formations (11 fiches), tarifs, offre de lancement, à propos, contact, connexion. `robots.txt` soigné (routes privées). Adresse **21 bis rue de Faches**, horaires lun–sam 9h–20h. Pied de page : « **Titulaire du certificat : TECH FORMATION NORD — actions de formation** » et lien vers le même PDF Qualiopi CCTA (empreinte identique). Deux activités distinctes : **formations** (7 à 35 h, tarifs en fonds propres publiés, mention « un financement n'est pas automatique ») et **location de cabines/espaces** (réservation en ligne suspendue). Visuels vraisemblablement générés par IA.

## 4. IA Tech Forma Nord — iatechformanord.fr

Application React (Vite) : HTML initial partiel, FAQ chargée en JavaScript. 10 URL (`/programme/`, `/entreprises/`, `/cpf/`, `/tarifs/`, `/faq/`, `/formateur/`, `/temoignages/`, `/contact/`, `/demande-site-vitrine/`). Les URL du sitemap sans barre finale redirigent en 301 vers la version avec barre. Se présente comme « TFN · Tech Formation Nord », adresse 21 rue de Faches. Publics : artisans/TPE (formation 2 jours), entreprises (4 offres), particuliers (parcours CPF). **Nombreuses incohérences** (Qualiopi « en cours », RS6776 d'un autre certificateur, lieux Nantes/Rennes, e-mail `monsite-mesclients.fr`, témoignages et statistiques invérifiables) : voir `docs/points-a-confirmer.md`.

## 5. Qualiopi

| Document | Certificateur | Validité | Statut |
|---|---|---|---|
| `wp-content/uploads/2026/06/2026-03-10-16-51.pdf` (+ image) | CCTA Certification, n° 3590226QA-A, accréditation Cofrac 5-0639 | 24/02/2026 → 03/10/2027, cycle initial 04/10/2024 | **En vigueur** — publié sur le nouveau site |
| `wp-content/uploads/2025/11/Capture-…16.10.34.png` | Sphinx Certification, QAL-CERT-930182738-20251007-v1 | 07/10/2025 → 03/10/2027 | Remplacé |
| `wp-content/uploads/2025/07/Site-scaled.jpg` (scan) | Qualinow, QNW0120 | initial 04/10/2024 → 03/10/2027 | Remplacé |

Titulaire sur les trois : TECH FORMATION NORD, 21 rue de Faches, 59175 Vendeville, NDA 32 59 12614 59, SIREN 930 182 738 ; périmètre : **actions de formation (L.6313-1 1°)**. Recoupement : la liste publique DGEFP indique `certifications_actionsdeformation = true` pour ce SIREN (dernière déclaration 10/04/2026). Le site public présente Qualiopi comme une certification de l'organisme, distincte d'une certification professionnelle et de l'éligibilité à un financement.

## 6. Avis et satisfaction

- Ancien site : badge image « Avis global 4,9/5 — satisfaction de nos apprenants — basé sur les avis clients », sans source → non repris.
- Site IA : notes et témoignages contradictoires et invérifiables → non repris.
- Fiche Google : non fournie, introuvable par recherche → composant prévu, masqué, lien activable par configuration.
- Aucun balisage `AggregateRating`/`Review` n'est produit.

## 7. Choix technique

L'ancien WordPress n'est pas conservé : thème de démonstration inadapté (70 % de pages factices, slugs anglais de garage), nombreux plugins, aucun accès admin/base pour une migration propre, contenu utile limité (10 pages). Justification détaillée : `docs/choix-techniques.md`.

## 8. Fichiers produits par l'audit

- `docs/inventaire-url.csv` — 215 URL, statut, présence au sitemap, liens internes, titre, H1, description, canonical, catégorie, sort.
- `docs/mapping-redirections.csv` — sort explicite de chaque URL (conservation 200, redirection 301, suppression 410 avec justification).
- `docs/registre-sources.csv` — 128 contenus repris avec source, date, destination et statut de vérification.
- `docs/points-a-confirmer.md` — incohérences et décisions attendues.
- `audit/` — index JSON des collectes, extraits texte, scripts de collecte et de génération.
