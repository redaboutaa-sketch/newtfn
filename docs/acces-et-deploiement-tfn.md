# Accès et déploiement — Tech Formation Nord

Document destiné à l'administrateur du VPS et au développeur. État vérifié le 31/10/2026. Aucun secret ici.

## 1. Architecture vérifiée

| Élément | Rôle | Détail |
|---|---|---|
| GitHub `redaboutaa-sketch/newtfn` | Source du code, revue (PR) | Dépôt **public**. Branche de production : `main` (PR #1, #2, #3 fusionnées le 31/10/2026). |
| VPS `76.13.44.177` | Héberge le site **et d'autres sites/services** | Clone de travail de l'administrateur : `/opt/newtfn` (root). |
| Docker | Exécute le site | Production : `tfn-prod-web` (nginx, site statique) + `tfn-prod-forms` (formulaire). Préproduction : `tfn-preprod-web` + `tfn-preprod-forms`. Réseaux internes `tfn-prod-internal`, `tfn-preprod-internal`. |
| Traefik (`/opt/traefik`) | Reverse proxy **commun à tous les sites**, certificats Let's Encrypt | Réseau `traefik-public`, partagé avec ~15 conteneurs d'autres projets. Routeurs TFN déclarés par labels dans `deploy/docker-compose.*.yml`. |
| Domaines | | `techformanord.fr` (production) ; `www.techformanord.fr` → redirection permanente ; `tfn.iatechformanord.fr` (préproduction publique, noindex, boîte de test masquée) ; `tfn-preprod.76-13-44-177.sslip.io` (préproduction protégée par mot de passe). DNS chez IONOS (messagerie IONOS). |
| Variables | Hors dépôt | `/etc/techformanord/` (root, 0700) : `preprod.env`, `production-predns.env` (sans secret), plus tard `production.env` (SMTP). |

Données persistantes : uniquement les volumes du formulaire (`tfn_preprod_forms` : demandes de test ; `tfn_prod_predns_forms` : demandes reçues en production tant que l'envoi d'e-mails n'est pas configuré). Médias et contenus sont dans le dépôt (`site/public/`, `site/media-src/`). Certificats : volume Traefik (commun, ne pas toucher).

**Formulaire de production : en mode test.** Les demandes sont enregistrées dans le volume `tfn_prod_predns_forms` et **ne sont transmises à personne** tant que `production.env` (adresse de réception + identifiants SMTP) n'existe pas. Lecture par l'administrateur : `docker run --rm -v tfn_prod_predns_forms:/d alpine cat /d/demandes-test.jsonl`.

## 2. Accès du développeur : décision

**Le développeur n'a pas d'accès au VPS.** Il travaille uniquement sur GitHub (son propre compte, invité en écriture) et avec Codex (son propre compte ChatGPT). Les déploiements sont exécutés par l'administrateur.

### Pourquoi pas de compte SSH, même restreint

Le VPS est partagé avec d'autres sites et services. Les vérifications du 31/10/2026 montrent qu'un compte Linux sans privilège y aurait déjà accès à des éléments d'autres projets (fichiers, processus, services locaux), indépendamment des permissions de `/opt/newtfn`, et que déléguer le déploiement passerait par Docker, équivalent à root. Le détail est consigné **hors dépôt** dans une note réservée à l'administrateur (`/root/tfn-passation/constats-securite-vps.md`). Corriger ces points reviendrait à modifier les autres applications du VPS et ne prouverait toujours pas une isolation complète. Un shell, même « restreint », n'est donc pas proposé.

**Si un accès serveur devient indispensable** (par exemple pour que le développeur déploie seul), la solution fiable est un **VPS dédié à TFN** (site statique : la plus petite offre suffit), sur lequel il peut avoir un compte avec clé SSH publique fournie par lui. Rien n'a été créé dans ce sens.

### Périmètre réel

| Accès | Développeur | Administrateur |
|---|---|---|
| Dépôt GitHub (lecture, branches, PR) | oui (invitation, rôle *write*) | oui (admin) |
| Fusion vers la branche de production | à restreindre (voir §6) | oui |
| VPS, Docker, Traefik, `/etc/techformanord` | **non** | oui (root) |
| Préproduction (consultation) | oui : https://tfn.iatechformanord.fr | oui |
| Déploiement | non : il le demande | `tfn-deploy` |

## 3. Parcours d'une modification

**Prompt → Codex → branche GitHub → PR → tests et revue → préproduction → validation → production**

| Étape | Qui | Déjà possible ? |
|---|---|---|
| Prompt et modification dans Codex | développeur | oui, dès l'invitation acceptée |
| Branche + pull request | développeur (Codex) | oui |
| Tests automatiques sur la PR | — | **non configuré** (pas de GitHub Actions) : tests lancés localement, voir le guide |
| Revue et approbation de la PR | administrateur / responsable | oui (manuel) |
| Déploiement en préproduction | administrateur : `tfn-deploy preprod <branche>` | oui |
| Validation | responsable du site, sur https://tfn.iatechformanord.fr | oui |
| Fusion vers la branche de production | administrateur | oui |
| Production | administrateur : `tfn-deploy production <commit>` + confirmation tapée | oui |

## 4. `tfn-deploy` (administrateur, root)

Copie exécutée : `/usr/local/sbin/tfn-deploy` (root:root 0750). Source relue : `deploy/scripts/tfn-deploy.sh`.

```bash
tfn-deploy status                                   # versions servies, images disponibles
tfn-deploy preprod <branche|commit> [--dry-run]     # build, test local de l'image, mise en préproduction
tfn-deploy production <commit> [--dry-run]          # exige : commit sur la branche de production, déjà en préproduction, confirmation
tfn-deploy rollback preprod|production <commit|rollback>
```

Ce que fait le script :
1. récupère GitHub (`git fetch`) et refuse tout commit absent de GitHub ;
2. construit dans un worktree temporaire (`/var/lib/tfn-deploy/`) : le clone `/opt/newtfn` n'est pas modifié ;
3. **bloque si un fichier d'infrastructure a changé** depuis la dernière relecture (Compose, Dockerfile, `.dockerignore`, le script lui-même ; empreintes dans `/etc/techformanord/deploy-reviewed.sha256`). L'administrateur relit le diff puis relance avec `--approve-infra` et tape « J'AI RELU » ;
4. production : commit présent sur `origin/<branche de production>` (fichier `/etc/techformanord/prod-branch` : `main`), et **déjà servi en préproduction** ; demande de taper le commit ;
5. teste l'image candidate sur `127.0.0.1:8098` (version, pages clés) avant de remplacer quoi que ce soit ;
6. étiquette l'image en cours `tfn-site:<env>-rollback`, redémarre la pile TFN, attend l'état « healthy » et vérifie `/version.txt` sur l'URL publique ;
7. journal : `/var/log/tfn-deploy.log`.

Production : utilise `production.env` s'il existe (formulaire par e-mail), sinon `production-predns.env` + `docker-compose.production.predns.yml` (formulaire en mode test, boîte de test non exposée).

### Chaîne de confiance (limites)

- Le script s'exécute en root et construit/exécute du code venant du dépôt. Ce qui pourrait donner des droits sur l'hôte (volumes, `privileged`, ports, labels Traefik, socket Docker) est **dans les fichiers épinglés** : leur modification exige une relecture humaine. **Ne jamais approuver sans avoir lu le diff.**
- Le code du site lui-même (HTML, JS, configuration nginx dans l'image) n'est pas épinglé : il s'exécute **dans le conteneur**, sans volume ni privilège. Mais le conteneur web est sur le réseau partagé `traefik-public` : une image malveillante pourrait joindre les ports internes des autres conteneurs de ce réseau. La revue de chaque PR reste donc nécessaire. Durcissement possible (non réalisé, nécessite un redéploiement de production validé) : réseau Traefik dédié à TFN.
- `npm ci` télécharge des dépendances pendant le build : une dépendance compromise s'exécuterait dans le conteneur de build (isolé de l'hôte par BuildKit). Les `package-lock.json` font partie de la revue.

## 5. Retour arrière

```bash
tfn-deploy status
tfn-deploy rollback production rollback        # image servie juste avant le dernier déploiement
tfn-deploy rollback production <commit>        # toute image tfn-site:prod-<commit> encore présente
```
Images de production présentes au 31/10/2026 : `tfn-site:prod-d2029a5` (première mise en production). L'ancien WordPress chez IONOS ne sert plus le site : le retour arrière par DNS n'est plus possible (`docs/procedure-retour-arriere.md` §A obsolète sur ce point). Ne pas supprimer les anciennes images `tfn-site:prod-*` (un `docker image prune -a` les effacerait).

## 6. À configurer (décisions de l'administrateur)

1. ~~Fusion des PR~~ : fait le 31/10/2026, `main` est la branche de production. Pour mettre `main` en production : `tfn-deploy preprod main`, validation, puis `tfn-deploy production <commit de main>`.
2. **Protection de la branche de production** sur GitHub (Settings → Branches / Rules) : PR obligatoire, 1 approbation, pas de push direct ni de force push. Sans elle, le rôle *write* permet de pousser directement (le déploiement reste manuel, donc rien ne part en ligne sans l'administrateur).
3. **Visibilité du dépôt** : public. Aucun secret trouvé (fichiers suivis + historique, 31/10/2026), mais l'architecture et les noms d'hôte sont visibles. Le passer en privé est possible sans gêner Codex.
4. **Formulaire** : créer `/etc/techformanord/production.env` (adresse de réception, identifiants SMTP), puis `tfn-deploy production <commit>` (relire la sortie : la pile passe en mode `smtp`).
5. Facultatif : tests automatiques sur les PR (GitHub Actions : `npm ci && npm run build`, `forms npm test`) — sans aucun secret ni accès au VPS.

## 7. Révocation du développeur

1. GitHub : *Settings → Collaborators* → retirer l'accès (ou annuler l'invitation en attente) : `gh api -X DELETE repos/redaboutaa-sketch/newtfn/collaborators/<login>`.
2. Côté OpenAI : il retire lui-même le dépôt de son connecteur GitHub ; la révocation GitHub suffit à couper l'accès au dépôt privé (si le dépôt est public, la lecture reste possible pour tous).
3. Aucun compte, clé ni secret n'a été remis sur le VPS : rien à révoquer côté serveur.
4. Si un secret lui avait été communiqué par erreur : le changer (SMTP, mot de passe de préproduction) dans `/etc/techformanord/`, puis redéployer.

## 8. Points de sécurité du VPS

Consignés hors dépôt pour l'administrateur : `/root/tfn-passation/constats-securite-vps.md`.
