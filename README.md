# Tech Formation Nord — refonte de techformanord.fr

Portail de l'organisme de formation Tech Formation Nord (Vendeville, près de Lille) présentant trois pôles — **automobile**, **esthétique, beauté et bien-être** (avec Maison Beauxlieux), **intelligence artificielle** (avec iatechformanord.fr) — en préservant les contenus et les URL du site WordPress historique.

> État : **préproduction**. La bascule du domaine `techformanord.fr` n'est pas faite et nécessite une validation explicite (`docs/procedure-mise-en-production.md`).

## Structure

```
site/                 Site Astro (génération statique)
  src/content/fiches/   Fiches formation (YAML) — une fiche = une URL historique
  src/content/data/     Organisme, pôles, témoignages, documents (YAML)
  src/pages/            Pages et routes
  src/components/       Composants (aucun contenu éditorial en dur)
  public/wp-content/    Médias historiques conservés aux mêmes chemins
  scripts/              Génération des icônes, sitemap et robots.txt
forms/                Micro-service du formulaire de contact (Node, nodemailer)
deploy/               Docker Compose (préproduction, production), nginx, générateur de règles
docs/                 Audit, inventaire, registre des sources, mapping SEO, procédures, recette
audit/                Données de collecte et scripts d'audit
qa/                   Scripts de recette (captures, accessibilité, liens, redirections)
```

## Développement local

Prérequis : Node 22.

```bash
cd site
npm ci
npm run dev            # http://localhost:4321 (environnement « preprod » par défaut : noindex)
npm run build          # build statique dans site/dist (+ sitemap/robots selon PUBLIC_SITE_ENV)
PUBLIC_SITE_ENV=production npm run build   # build de production (index, sitemap)
```

Formulaire : `cd forms && npm ci && FORM_MODE=test DATA_DIR=./data node server.mjs` (port 3000) ; tests : `npm test`.

## Modifier les contenus

| Je veux… | Fichier |
|---|---|
| Modifier une formation automobile, ajouter un module | `site/src/content/fiches/<fiche>.yaml` (bloc `programmes`) |
| Changer téléphone, e-mail, horaires, adresse, référent handicap | `site/src/content/data/organisme.yaml` |
| Ajouter une formation beauté ou une offre IA | `site/src/content/data/poles.yaml` |
| Publier un avis vérifié | `site/src/content/data/temoignages.yaml` (champs et règles en tête de fichier) |
| Activer le lien vers la fiche Google | `organisme.yaml` → `google_business_url` |
| Ajouter/retirer une ancienne URL redirigée | `docs/mapping-redirections.csv` puis `python3 -I deploy/scripts/gen_nginx_rules.py` |

Le build échoue si un contenu ne respecte pas le schéma (`site/src/content.config.ts`) ou si une canonical est incohérente : rien de cassé n'est publié.

## Préproduction sur le VPS

- Reverse proxy : Traefik existant (`/opt/traefik`, réseau `traefik-public`) — non modifié.
- Pile isolée `tfn-preprod` : conteneurs `tfn-preprod-web` (nginx) et `tfn-preprod-forms`, réseau interne `tfn-preprod-internal`, volume `tfn_preprod_forms`, port local `127.0.0.1:8095`.
- Nom d'hôte configurable (`PREPROD_HOST`). Valeur actuelle : `tfn-preprod.76-13-44-177.sslip.io` (résolution automatique vers le VPS, aucune modification DNS). Pour utiliser `preprod.techformanord.fr`, créer l'enregistrement A chez IONOS puis changer `PREPROD_HOST`.
- Protections : authentification HTTP (Traefik), `X-Robots-Tag: noindex, nofollow` (Traefik + nginx), méta `noindex`, aucun sitemap, formulaire en mode test.
- Variables : `/etc/techformanord/preprod.env` (hors dépôt, `chmod 600`) ; modèle : `.env.example`. Identifiants de recette : `/etc/techformanord/preprod-identifiants.txt` (root uniquement).

```bash
cd /opt/newtfn
docker compose -p tfn-preprod --env-file /etc/techformanord/preprod.env -f deploy/docker-compose.preprod.yml up -d --build
docker compose -p tfn-preprod --env-file /etc/techformanord/preprod.env -f deploy/docker-compose.preprod.yml logs -f
```
Demandes de test reçues : `https://<PREPROD_HOST>/api/test-inbox`.

**Nom d'hôte provisoire supplémentaire** (ex. `tfn.iatechformanord.fr`, mêmes protections) : créer l'enregistrement DNS A `tfn` → `76.13.44.177` (et AAAA → `2a02:4780:7:f4ca::1`) dans la zone iatechformanord.fr (Hostinger), renseigner `PREPROD_ALIAS_HOST` dans `/etc/techformanord/preprod.env`, puis :
```bash
docker compose -p tfn-preprod --env-file /etc/techformanord/preprod.env \
  -f deploy/docker-compose.preprod.yml -f deploy/docker-compose.preprod.alias.yml up -d
```

Changer le mot de passe de recette :
```bash
H=$(openssl passwd -apr1 'nouveau-mot-de-passe' | sed 's/\$/\$\$/g')
sudo sed -i "s|^PREPROD_BASIC_AUTH=.*|PREPROD_BASIC_AUTH=recette:$H|" /etc/techformanord/preprod.env
docker compose -p tfn-preprod --env-file /etc/techformanord/preprod.env -f deploy/docker-compose.preprod.yml up -d
```

## Production
Voir `docs/procedure-mise-en-production.md` et `docs/procedure-retour-arriere.md`. Fichier `deploy/docker-compose.production.yml` (variables : `/etc/techformanord/production.env`).

## Documentation
- `docs/audit-existant.md` — audit des trois sites et méthode de collecte
- `docs/inventaire-url.csv` — inventaire des 215 URL du site historique
- `docs/mapping-redirections.csv` — sort de chaque ancienne URL (200/301/410)
- `docs/registre-sources.csv` — provenance et statut de chaque contenu repris
- `docs/points-a-confirmer.md` — **décisions éditoriales attendues avant bascule**
- `docs/choix-techniques.md` — justification de la stack
- `docs/mesure-et-suivi.md` — événements de conversion, liens entre domaines, Search Console
- `docs/recommandations-liens-retour.md` — liens à ajouter sur les sites spécialisés
- `docs/rapport-recette.md` — résultats de la recette
- `docs/procedure-mise-en-production.md`, `docs/procedure-retour-arriere.md`
