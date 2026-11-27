# Carte des intentions — trois sites Tech Formation Nord

Document partagé, copié à l'identique dans `seo/` de chaque site (techformanord.fr, iatechformanord.fr, trainingforme.fr).
Relevé du 2026-11-27 sur le contenu réellement en ligne. **Une intention = une destination principale.** Une page
secondaire peut mentionner le sujet et lier la destination principale, mais ne la concurrence pas (titre, H1, description).

| Intention de recherche (exemples de requêtes) | Destination principale | Rôle des autres sites |
|---|---|---|
| Marque et organisme : « Tech Formation Nord », « organisme de formation Vendeville », « centre de formation près de Lille » | `https://techformanord.fr/` | IA et TrainingForMe lient l'organisme (`techformanord.fr`), sans reprendre son titre |
| Qualité, Qualiopi, NDA, accessibilité, informations pratiques | `techformanord.fr/qualite/`, `/informations-pratiques/`, `/accessibilite-handicap/` | — |
| Formations automobiles : « formation mécanique automobile Lille », carrosserie-peinture, commerce VN/VO | `techformanord.fr/formations/automobile/` puis fiches `/service/maintenance/`, `/service/interior-cleaning/`, `/service/wheels-alignment/` | — |
| Reconversion automobile (mécanicien, aide carrossier) | `techformanord.fr/infinite-grid-col-2/` (+ `/m-grid-col-2/`, `/m-grid-col-3/`) | — |
| Former ses salariés (automobile) | `techformanord.fr/entreprises/` | — |
| Financement (OPCO, France Travail, CPF, indépendants) — général | `techformanord.fr/financer-sa-formation/` | `iatechformanord.fr/financement/` reste limité aux formations IA (OPCO) |
| Formation IA pour professionnels : « formation IA entreprise Lille », « formation intelligence artificielle TPE » | `https://iatechformanord.fr/` puis `/programme/` | techformanord.fr : carte « Intelligence artificielle » ; TrainingForMe : ne cible pas ces requêtes en présentiel |
| Formation Gemini (Google Workspace, e-mails, réunions) | `iatechformanord.fr/formations/gemini/` | — |
| Formations en ligne, e-learning, plateforme pédagogique : « formation en ligne », « formation e-learning artisans » | `https://trainingforme.fr/` puis `/catalogue` | techformanord.fr : carte « Formations en ligne » ; IA : lien à prévoir vers TrainingForMe pour le distanciel |
| Formation en ligne « créer son site avec l'IA » (artisans, TPE) | `trainingforme.fr/formations/creer-site-web-ia-artisans-tpe` | iatechformanord.fr ne doit pas publier de page concurrente sur ce sujet en ligne |
| Vérifier une attestation | `trainingforme.fr/verification` (non indexée, volontairement) | — |
| Esthétique et bien-être | `maisonbeauxlieux.com` (hors périmètre) | techformanord.fr : carte « Esthétique et bien-être » |

## Recouvrements constatés (2026-11-27)

1. **trainingforme.fr ↔ academy.iatechformanord.fr** : même application, mêmes pages en 200, canonique, `robots.txt`
   et `sitemap.xml` désignent `academy.iatechformanord.fr`. La destination « formations en ligne » est donc, pour les
   moteurs, le sous-domaine et non `trainingforme.fr`. Correction : PR « domaine canonique » (dépôt
   `iatechformanord_elearning`) + variable `PUBLIC_SITE_URL` à renseigner.
2. **techformanord.fr `/` ↔ `/tech-formation-nord/`** : deux portails de marque (38 et 29 mots), même intention.
   `/` est la destination principale (lien de la carte, `@id` de l'organisation). Décision à prendre par le responsable :
   redirection 301 de `/tech-formation-nord/` vers `/` (via `docs/mapping-redirections.csv`) ou conservation en l'état.
3. **TrainingForMe `/catalogue`** : H1 « Formations à l'intelligence artificielle générative » alors que la plateforme
   se présente comme multi-domaines ; recouvre l'intention du site IA. À renommer vers l'intention « formations en ligne ».
4. **Lien « Site institutionnel » de TrainingForMe** → `iatechformanord.fr` (variable `ROOT_SITE_URL`). Le site
   institutionnel de l'organisme est `techformanord.fr` (mentions légales, Qualiopi, NDA).
