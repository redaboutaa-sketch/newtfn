# Procédure de retour arrière

## A. Retour au site WordPress (après bascule DNS)

À utiliser en cas d'incident majeur (site indisponible, formulaire hors service sans solution rapide, erreur de contenu grave).

1. **DNS (IONOS)** : rétablir les valeurs d'origine (relevées le 24/10/2026) :
   - `techformanord.fr` A → `217.160.0.65`, AAAA → `2001:8d8:100f:f000::200`
   - `www.techformanord.fr` A → `217.160.0.65`, AAAA → `2001:8d8:100f:f000::200`
   Ne pas modifier MX, SPF, DMARC, autodiscover.
2. Le WordPress IONOS est intact (non supprimé, cf. procédure de mise en production) : il redevient servi dès la propagation (TTL abaissé à 300 s → quelques minutes).
3. HSTS : la production envoie `Strict-Transport-Security` ; l'ancien site étant aussi servi en HTTPS par IONOS, aucun blocage pour les visiteurs.
4. Laisser tourner la pile `tfn-prod` (inoffensive sans trafic) pour analyse, ou l'arrêter :
   `docker compose -p tfn-prod --env-file /etc/techformanord/production.env -f deploy/docker-compose.production.yml down`
5. Search Console : rien à faire (même domaine). Retirer le sitemap `/sitemap.xml` si l'ancien `wp-sitemap.xml` doit être resoumis.
6. Consigner l'incident (heure, symptôme, cause) avant toute nouvelle tentative.

## B. Retour à une version précédente du nouveau site (sans toucher au DNS)

Chaque déploiement de production est étiqueté avec son commit (`tfn-site:prod-<commit>`).
```bash
docker images tfn-site --format '{{.Tag}} {{.CreatedAt}}'          # versions disponibles
docker tag tfn-site:prod-<commit-precedent> tfn-site:production
docker tag tfn-forms:prod-<commit-precedent> tfn-forms:production
docker compose -p tfn-prod --env-file /etc/techformanord/production.env \
  -f deploy/docker-compose.production.yml up -d --no-build
```
Ou par Git : `git checkout <commit-precedent>` puis `up -d --build`.

## C. Préproduction

La préproduction est indépendante : `docker compose -p tfn-preprod … down` puis `up -d --build` depuis le commit voulu. Elle n'a aucun effet sur le site public.

## D. Vérifications après retour arrière
```bash
curl -sI https://techformanord.fr/ | grep -iE '^HTTP|server'     # « server: Apache » = WordPress IONOS
dig +short A techformanord.fr
```

## E. Préproduction tfn.iatechformanord.fr

Chaque version déployée en préproduction est étiquetée `tfn-site:preprod-<commit>` : `preprod-859c2cc` (avant la montée en gamme), `preprod-a8ec674` (montée en gamme, avant le portail à trois univers), `preprod-31541ab` (portail à trois univers, illustrations animées), `preprod-c2c4eaf` (portail avec les photos des trois univers et WhatsApp +33 6 86 15 89 33), `preprod-a608309` (numéros insécables sur mobile, fonds bleus du portail), `preprod-8a7325e` (typographie Manrope hors cartes). Pour revenir au portail illustré, remplacer `859c2cc` par `31541ab` ci-dessous. Pour revenir à l'accueil précédent, remplacer `859c2cc` par `a8ec674` ci-dessous.
```bash
cd /opt/newtfn
docker tag tfn-site:preprod-859c2cc tfn-site:preprod
docker compose -p tfn-preprod --env-file /etc/techformanord/preprod.env \
  -f deploy/docker-compose.preprod.yml -f deploy/docker-compose.preprod.alias.yml up -d --no-build web
curl -s https://tfn.iatechformanord.fr/version.txt   # la version 859c2cc n'expose pas ce fichier (404)
```
Déploiement d'une nouvelle version : `export GIT_COMMIT=$(git rev-parse --short HEAD)`, `build web`, test de l'image sur un port local temporaire (réseau `tfn-preprod-internal`), puis `up -d --no-build web` et vérification de `/version.txt`.
