# SEO / GEO — techformanord.fr

Contexte et suivi propres à **techformanord.fr** (dépôt `newtfn`). Les deux autres sites ont leur propre dossier
`seo/` : `trainingforme.fr` dans le dépôt `iatechformanord_elearning`, `iatechformanord.fr` hors dépôt
(`/opt/seo-iatechformanord/seo/` sur le VPS, source du site non disponible).

## Rôle du site

Organisme **Tech Formation Nord** (SAS, Vendeville, près de Lille) : portail des activités (`/`) et site des
**formations automobiles** (`/acceuil/`, `/formations/automobile/`, fiches `/service/*`, reconversion). Destination
principale des intentions « marque / organisme », « automobile » et « financement » : voir `carte-intentions.md`.

## Fichiers

| Fichier | Contenu |
|---|---|
| `carte-intentions.md` | Intentions → destination principale, recouvrements entre les trois sites (copie partagée) |
| `kb/brand-ssot.md` | Faits vérifiés et leur source (identité, Qualiopi, coordonnées, ce que le site ne promet pas) |
| `roast-roadmap.md` | Constats prouvés, classés par impact, avec responsable et statut |
| `suivi.md` | Journal daté des contrôles, corrections, PR et mesures |

## Règles (en plus de `AGENTS.md`)

- Une modification = une branche + une PR vers `main` ; jamais de fusion ni de déploiement par un agent.
- Aucun chiffre, prix, financement, avis ou certification qui ne figure pas dans `kb/brand-ssot.md` avec sa source.
- Conserver les URL historiques (même en anglais) : toute suppression passe par `docs/mapping-redirections.csv`.
  `/acceuil/`, `/about-us/`, `/contact-us/`, `/services/`, `/service/*`, `/infinite-grid-col-2/`, `/m-grid-col-2/`,
  `/m-grid-col-3/` sont de vraies pages réécrites, gardées pour leurs liens : ni noindex, ni retrait du sitemap.
- Contrôles automatiques : `tfn-seo-daily.timer` (lecture seule) ; passage hebdomadaire `tfn-seo-weekly.timer`
  (voir `/usr/local/lib/tfn-seo/README.md` sur le VPS), qui collecte aussi Search Console (`sc-domain:techformanord.fr`, lecture seule).
