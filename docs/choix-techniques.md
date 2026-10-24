# Choix techniques

## Constat
Le site actuel est un WordPress (confirmé) bâti sur un thème de démonstration pour garage (« Pbmit »), avec Elementor, Slider Revolution, WooCommerce et une dizaine d'extensions. Sur 83 URL publiques, 10 portent un contenu réel ; les autres sont des pages de démonstration (lorem ipsum, équipe fictive, articles en anglais). Aucun accès à l'administration ni à la base n'était disponible pour une migration WordPress → WordPress.

Conserver WordPress aurait imposé de reconstruire le thème, de purger les extensions et de maintenir PHP, MySQL et les mises à jour de sécurité, pour un site d'une vingtaine de pages éditées quelques fois par an.

## Solution retenue
**Astro 5 (génération statique) + nginx + micro-service Node pour le formulaire**, en conteneurs Docker derrière le Traefik existant.

| Critère | Effet |
|---|---|
| Rendu SEO | Tout le contenu est dans le HTML initial (aucune dépendance au JavaScript client). Titres, descriptions, canonical, fil d'Ariane, JSON-LD et sitemap générés au build. Pages de 5 à 10 Ko compressés. |
| Maintenance | Pas de base de données ni de PHP ; image nginx figée ; surface d'attaque minimale. Mises à jour : `npm` (Astro) et image nginx/node. |
| Édition des formations | Fichiers YAML lisibles dans `site/src/content/` (une fiche = un fichier, un module = un bloc). Validation automatique du schéma au build : une erreur de saisie bloque la publication au lieu de casser une page. |
| Reprise des contenus | Contenus transcrits fidèlement en données structurées ; URL historiques conservées à l'identique ; médias conservés aux mêmes chemins `/wp-content/uploads/…`. |
| Coût sur le VPS | ~10 Mo de RAM pour nginx, ~40 Mo pour le service de formulaire ; aucun port public supplémentaire (routage Traefik). |
| Redirections | Statuts HTTP réels (301/410/404) générés depuis `docs/mapping-redirections.csv` (source unique). |

## Gestion du contenu
- `site/src/content/fiches/*.yaml` : fiches formation (URL, SEO, modules, parcours).
- `site/src/content/data/organisme.yaml` : coordonnées, horaires, Qualiopi, référent handicap, accès.
- `site/src/content/data/poles.yaml` : pôles, familles, formations beauté, offres IA, liens vers les sites spécialisés.
- `site/src/content/data/temoignages.yaml` : avis vérifiés uniquement (vide à ce jour).
- `site/src/content/data/documents.yaml` : documents téléchargeables.

Pas de back-office : non nécessaire au volume actuel. Si l'équipe souhaite éditer sans Git, un CMS Git léger (Decap CMS ou Sveltia CMS) peut être branché sur ces mêmes fichiers sans changer l'architecture.

## Versions
Astro 5.18.2, Node 22.20 (alpine), nginx 1.28.0 (alpine), nodemailer 10.0.10. Versions figées (`package-lock.json`, tags d'images).
