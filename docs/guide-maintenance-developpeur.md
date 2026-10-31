# Guide du développeur — maintenance de techformanord.fr

Bienvenue. Ce guide explique comment modifier le site avec **Codex** (votre compte ChatGPT Plus) et **GitHub** (votre compte personnel). Vous n'avez pas besoin d'accès au serveur : les mises en ligne sont faites par l'administrateur après validation.

## 1. Le site en bref

- Site **statique** généré par **Astro** (Node 22), dossier `site/`. Pas de base de données ni de back-office : les contenus sont des fichiers YAML.
- Formulaire de contact : petit service Node, dossier `forms/`.
- Hébergement : conteneurs Docker sur un VPS partagé, derrière le proxy Traefik qui gère le HTTPS. Vous n'y avez pas accès et n'en avez pas besoin.
- Adresses : production https://techformanord.fr ; préproduction https://tfn.iatechformanord.fr (non indexée).
- Règles pour l'agent : `AGENTS.md` (lu automatiquement par Codex). Architecture et déploiement : `docs/acces-et-deploiement-tfn.md`.

| Je veux… | Fichier |
|---|---|
| Modifier une formation, un module | `site/src/content/fiches/<fiche>.yaml` |
| Téléphone, e-mail, horaires, adresse, WhatsApp | `site/src/content/data/organisme.yaml` |
| Pôles, liens vers les sites spécialisés | `site/src/content/data/poles.yaml` |
| Une page | `site/src/pages/…` |
| Styles | `site/src/styles/` |
| Une ancienne URL à rediriger | `docs/mapping-redirections.csv`, puis `python3 -I deploy/scripts/gen_nginx_rules.py` |

## 2. Prérequis (une seule fois)

1. **GitHub** : acceptez l'invitation au dépôt `redaboutaa-sketch/newtfn` (lien reçu par e-mail sur l'adresse invitée, ou https://github.com/notifications). Utilisez votre propre compte ; ne partagez jamais votre mot de passe ni vos jetons.
2. **Codex** : connectez-vous avec votre compte ChatGPT. D'après la documentation OpenAI, Codex est inclus dans les offres ChatGPT Plus. Documentation : https://developers.openai.com/codex (l'adresse peut rediriger vers le nouveau site de documentation d'OpenAI). Les noms exacts des menus peuvent changer : reportez-vous à l'interface.

## 3. Option A — Codex sur votre ordinateur (recommandé pour tester)

Prérequis : Git, Node 22, et Codex (application de bureau, extension VS Code ou CLI).

```bash
# Installer la CLI (macOS / Linux) — commande indiquée par la documentation officielle
curl -fsSL https://chatgpt.com/codex/install.sh | sh

git clone https://github.com/redaboutaa-sketch/newtfn.git
cd newtfn
git switch main                            # branche de production
git switch -c modif/ma-modification         # votre branche de travail

codex                                       # premier lancement : choisir « Sign in with ChatGPT »
```

Exemple de prompt :
> Dans `site/src/content/data/organisme.yaml`, mets à jour les horaires du samedi. Respecte AGENTS.md, lance `npm run build` dans `site/` et montre-moi le diff.

Tester :
```bash
cd site && npm ci
npm run dev                 # http://localhost:4321 — vérifier visuellement
npm run build               # doit réussir (contrôle des contenus et des canonicals)
PUBLIC_SITE_ENV=production npm run build   # build de production
cd ../forms && npm ci && npm test          # si le formulaire a été touché
```

Proposer :
```bash
git add -A && git commit -m "Horaires du samedi"
git push -u origin modif/ma-modification
```
Puis ouvrez une **pull request** sur GitHub vers `main` (branche de production), en décrivant le changement et les tests faits.

## 4. Option B — Codex dans le navigateur, avec GitHub

1. Ouvrez Codex sur le web avec votre compte ChatGPT.
2. Connectez votre compte GitHub quand Codex le demande et autorisez l'accès au dépôt `redaboutaa-sketch/newtfn` (l'invitation doit être acceptée).
3. Créez un environnement pour ce dépôt. Si un script d'installation est demandé : `cd site && npm ci`.
4. Décrivez la modification dans un prompt, en partant de la branche `main`. Demandez à Codex de lancer `npm run build` dans `site/`.
5. Relisez le diff proposé, puis utilisez le bouton de création de **pull request** (libellé à confirmer dans l'interface).

Important : connecter Codex à GitHub donne accès **au dépôt uniquement**. Cela ne donne **aucun accès au serveur** et **ne met rien en ligne**.

## 5. De la pull request à la mise en ligne

1. Vous ouvrez la PR (tests faits, captures si changement visuel).
2. L'administrateur relit. Toute modification de `deploy/`, des `Dockerfile` ou de `.dockerignore` est relue avec une attention particulière et doit être justifiée dans la PR.
3. L'administrateur publie la branche en **préproduction** : https://tfn.iatechformanord.fr (vérifiable via `/version.txt`, qui affiche le commit servi).
4. Le responsable du site valide sur la préproduction.
5. L'administrateur fusionne la PR, puis met en **production**. En cas de problème, il revient à la version précédente en une commande.

## 6. Check-list avant de demander une mise en ligne

- [ ] `npm run build` réussit dans `site/`
- [ ] Rendu vérifié sur ordinateur et sur mobile (390 px), sans débordement horizontal
- [ ] Liens et numéros cliquables ; aucun lien cassé
- [ ] Aucune URL existante supprimée sans redirection dans `docs/mapping-redirections.csv`
- [ ] Aucun secret, mot de passe ou donnée personnelle dans le commit
- [ ] Pas de faux avis, de fausses notes, de faux partenaires, prix ou certifications
- [ ] Animations désactivées avec `prefers-reduced-motion`

Recette avancée (facultatif, nécessite Chromium) : `cd qa && npm ci`, puis avec `npm run preview` lancé dans `site/` (port 4321) : `BASE=http://127.0.0.1:4321 CHROME=/chemin/vers/chrome node interactions.mjs` (idem `recette.mjs`, `liens.mjs`).

## 7. Ce qu'il ne faut pas faire

- Pousser directement sur la branche de production, ou utiliser `push --force`.
- Ajouter des identifiants, des fichiers `.env` ou des exports de demandes au dépôt (le dépôt est **public**).
- Demander ou utiliser un accès au serveur, à Docker ou à Traefik.
- Modifier les sites spécialisés (maisonbeauxlieux.com, iatechformanord.fr) depuis ce dépôt.
