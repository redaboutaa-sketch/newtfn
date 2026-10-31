# Aperçus automatiques des pull requests (Cloudflare Pages)

Objectif : chaque pull request vers `main` produit un aperçu privé, non indexé, mis à jour à chaque commit, sans accès au VPS ni intervention de l'administrateur. Cloudflare Pages ne sert **que d'aperçu** : la production et la préproduction restent sur le VPS (`docs/acces-et-deploiement-tfn.md`), rien n'y est connecté.

Documentation Cloudflare consultée le 31/10/2026 : Preview deployments, GitHub integration, Build image, Build configuration, Branch build controls, Known issues, Limits.

## 1. Paramètres de build (tirés du projet, ne pas modifier)

| Réglage Cloudflare | Valeur | Source dans le dépôt |
|---|---|---|
| Framework preset | Astro | `site/package.json` (astro 5.18.2) |
| Root directory (advanced) | `site` | le site Astro est dans `site/` |
| Build command | `npm run build` | script `build` de `site/package.json` (génère les visuels, `astro build`, `postbuild`) |
| Build output directory | `dist` | `astro.config.mjs` (sortie par défaut), relatif à `site/` |
| Version de Node | 22.20.0, lue dans `site/.node-version` | même version que `site/Dockerfile` (`node:22.20.0-alpine`) |
| Production branch | `main` | branche de référence |
| Variables d'environnement | **aucune** | ne jamais définir `PUBLIC_SITE_ENV`, ni aucun secret |

Comportement sur Pages (variable `CF_PAGES=1` fournie par Cloudflare) :
- environnement « préproduction » : `<meta name="robots" content="noindex, nofollow">`, aucun sitemap ;
- un build de production est **refusé** (`src/lib/data.ts`) ;
- fichier `_headers` : `X-Robots-Tag: noindex, nofollow` sur **toutes** les URL du projet (aperçus, alias de branche et `<projet>.pages.dev`) ;
- bandeau « Aperçu de pull request — branche …, commit … » et `/version.txt` = commit servi ;
- **formulaire désactivé** : bouton « Envoi désactivé (aperçu) », aucune requête vers un service, aucune donnée enregistrée. Il n'existe aucune route `/api/` sur Pages.

Ces réglages n'existent que lorsque `CF_PAGES=1` : la sortie des builds Docker du VPS (production et préproduction) est identique à l'octet près (vérifié le 31/10/2026).

## 2. Mise en place (administrateur, une seule fois — environ 15 minutes)

Prérequis : un compte Cloudflare (offre gratuite). Aucun changement DNS : le domaine `techformanord.fr` n'est pas ajouté à Cloudflare.

1. **Créer le projet** : tableau de bord Cloudflare → **Workers & Pages** → **Create** → onglet **Pages** → **Connect to Git** → **GitHub**.
2. **Autoriser uniquement ce dépôt** : à l'installation de l'application GitHub « Cloudflare Workers and Pages », choisir **Only select repositories** → `redaboutaa-sketch/newtfn`. (Modifiable ensuite dans GitHub → Settings → Applications → Cloudflare Workers and Pages → Repository access.)
3. **Configurer le build** avec le tableau du §1 : nom de projet par exemple `tfn-apercus`, production branch `main`, preset Astro, root directory `site`, build command `npm run build`, output `dist`, aucune variable. **Save and Deploy.**
4. **Contrôle des branches** : projet → **Settings** → **Builds** (ou *Builds & deployments*) → **Branch control** :
   - décocher **Enable automatic production branch deployments** (aucune « production » Pages : `main` est déployée sur le VPS) ;
   - Preview branches : **All non-Production branches**.
5. **Protéger l'accès** (Cloudflare Access) : projet → **Settings** → **General** → **Enable access policy**. Cela ne protège que les aperçus `*.<projet>.pages.dev`. Pour protéger aussi `<projet>.pages.dev` (procédure « Known issues » de Cloudflare) :
   1. sur la politique créée, **Manage** → **Access** → **Applications** → votre projet → **Configure** ;
   2. sous **Public hostname**, effacer le `*` du champ **Subdomain**, changer le nom de l'application si une erreur l'exige, **Save** ;
   3. revenir à **Settings** → **General** et cliquer de nouveau **Enable access policy** ;
   4. vérifier que **deux** applications Access existent : `<projet>.pages.dev` et `*.<projet>.pages.dev`.
6. **Autoriser les personnes** : Zero Trust → **Access** → **Applications** → pour chacune des deux applications, modifier la politique : règle **Include → Emails** = votre adresse et `contact.techformation@gmail.com`. Méthode de connexion : **One-time PIN** (code reçu par e-mail ; le développeur n'a pas besoin de compte Cloudflare).
7. **Ne pas ajouter de domaine personnalisé** au projet Pages.
8. Me prévenir : je lance la vérification (§4) sur la pull request de test.

Entre l'étape 3 (premier déploiement de `main`) et l'étape 5, `<projet>.pages.dev` est public quelques minutes (non indexable : `X-Robots-Tag` et meta `noindex`). Enchaîner les étapes sans attendre.

## 3. Où est le lien d'aperçu

Dans la pull request GitHub : section des vérifications en bas de la conversation et onglet **Checks** → ligne **Cloudflare Pages** → **Details** : URL de l'aperçu. Cloudflare publie aussi en général un commentaire « Deploying with Cloudflare Pages » avec l'URL du commit et l'alias de branche (présentation à confirmer au premier aperçu).

Deux URL par aperçu (toutes deux protégées par Access et en `noindex`) :
- `https://<hash>.<projet>.pages.dev` : ce commit précis ;
- `https://<branche>.<projet>.pages.dev` : alias de branche, suit le dernier commit (ex. `modif/horaires` → `modif-horaires`).

## 4. Vérifications (sans se connecter)

```bash
curl -sI https://<branche>.<projet>.pages.dev/ | grep -iE '^HTTP|location'   # 302 vers <équipe>.cloudflareaccess.com
curl -sI https://<projet>.pages.dev/ | grep -iE '^HTTP|location'              # 302 vers Access également
curl -s -o /dev/null -w '%{http_code}\n' https://techformanord.fr/            # 200, production inchangée
```
Après connexion : bandeau « Aperçu de pull request », `/version.txt` = commit de la PR, bouton du formulaire désactivé.

## 5. Sécurité

- **Dépôt public** : Cloudflare ne crée **pas** d'aperçu pour les pull requests venant de forks (documenté). Seules les branches poussées dans le dépôt, donc par des collaborateurs ayant l'accès en écriture, sont construites.
- Le build exécute le code de la branche (`npm ci`, scripts) **dans l'infrastructure Cloudflare**, sans aucun secret (aucune variable définie) et sans lien avec le VPS : une branche malveillante ne peut atteindre ni le serveur ni la production.
- Le contenu d'un aperçu est contrôlé par l'auteur de la branche : la protection Access évite qu'il soit visible publiquement sous le nom du projet.
- `noindex` empêche l'indexation mais **ne protège pas l'accès** : la protection, c'est Access.
- Ne jamais ajouter de variables secrètes au projet Pages : elles seraient lisibles par tout code de branche.

## 6. Limites

- **Formulaire** : non testable sur l'aperçu (désactivé volontairement). Le tester en préproduction (mode test du VPS).
- **Redirections des anciennes URL** (règles nginx du VPS) et en-têtes de sécurité nginx : absents sur Pages. Les vérifier en préproduction.
- Les visuels générés au build (icônes, images de partage) peuvent légèrement différer (polices du système de build).
- Offre gratuite Pages : 500 builds par mois, 1 build à la fois, 20 minutes maximum par build, 20 000 fichiers et 25 Mio par fichier (le site : ~145 fichiers, 12 Mo). Aperçus illimités.
- Cloudflare Access (Zero Trust) : gratuit jusqu'à 50 utilisateurs ; au-delà, offre payante par utilisateur (voir la page tarifaire Cloudflare).

## 7. Révocation et désactivation

- Retirer une personne : Zero Trust → Access → Applications → politique → retirer son adresse.
- Couper les builds : projet Pages → Settings → Builds → Branch control → Preview branches : **None** (ou la procédure « Disable Build » de la documentation Cloudflare).
- Couper l'accès au dépôt : GitHub → Settings → Applications → Cloudflare Workers and Pages → retirer `newtfn` (ou désinstaller l'application).
- Supprimer le projet Pages : supprime tous les aperçus.
