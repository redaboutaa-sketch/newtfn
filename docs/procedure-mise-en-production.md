# Procédure de mise en production de techformanord.fr

> **Ne pas exécuter sans la validation explicite du responsable du site.** Pré-requis : tous les points **[Bloquant]** de `docs/points-a-confirmer.md` sont tranchés et la préproduction est validée.

Valeurs relevées le 24/10/2026 (à re-vérifier le jour J) :

| Enregistrement | Actuel (IONOS) | Cible (VPS) |
|---|---|---|
| `techformanord.fr` A | 217.160.0.65 | 76.13.44.177 |
| `techformanord.fr` AAAA | 2001:8d8:100f:f000::200 | 2a02:4780:7:f4ca::1 |
| `www.techformanord.fr` A | 217.160.0.65 | 76.13.44.177 |
| `www.techformanord.fr` AAAA | 2001:8d8:100f:f000::200 | 2a02:4780:7:f4ca::1 |
| MX, TXT SPF, `_dmarc`, `autodiscover` | IONOS | **inchangés** |

## J-7 à J-2 : préparation

1. **Sauvegardes de l'existant** (chez IONOS) :
   - fichiers WordPress complets (`wp-content`, `wp-config.php`) ;
   - export de la base MySQL ;
   - export de la zone DNS complète (capture et fichier) ;
   - export des statistiques Burst/Jetpack, des formulaires Contact Form 7 / Flamingo s'il y en a, et de la liste Klaviyo si utilisée.
   Conserver le tout hors du serveur IONOS. **Ne pas résilier ni vider l'hébergement WordPress** : il sert de retour arrière pendant au moins 90 jours.
2. **Search Console** : vérifier l'accès à la propriété ; exporter les rapports Pages, Performances (16 mois) et Liens. Si besoin, vérifier la propriété de domaine par TXT DNS.
3. **Baisser le TTL** des enregistrements A/AAAA de `techformanord.fr` et `www` à 300 s (au moins 24 h avant la bascule).
4. **Préparer l'environnement de production** sur le VPS :
   ```bash
   sudo install -m 600 /dev/null /etc/techformanord/production.env
   # renseigner FORM_TO, FORM_FROM, SMTP_*, PUBLIC_ANALYTICS_PROVIDER (facultatif), PUBLIC_GSC_VERIFICATION (facultatif)
   ```
5. **Contenus** : appliquer les décisions de `points-a-confirmer.md` dans `site/src/content/`, fusionner la branche après validation, relancer la recette en préproduction (`docs/rapport-recette.md`, §Rejouer).

## Jour J

### 1. Démarrer la pile de production (sans trafic)
```bash
cd /opt/newtfn && git pull && git log -1 --format=%h   # noter le commit déployé
docker compose -p tfn-prod --env-file /etc/techformanord/production.env \
  -f deploy/docker-compose.production.yml up -d --build
docker tag tfn-site:production tfn-site:prod-$(git log -1 --format=%h)
docker tag tfn-forms:production tfn-forms:prod-$(git log -1 --format=%h)
```
Tant que le DNS pointe vers IONOS, aucun visiteur n'atteint cette pile. Vérifier en forçant la résolution (certificat par défaut de Traefik, d'où `-k`) :
```bash
curl -skI --resolve techformanord.fr:443:76.13.44.177 https://techformanord.fr/ | grep -iE '^HTTP|x-robots'   # 200, AUCUN X-Robots-Tag
curl -sk --resolve techformanord.fr:443:76.13.44.177 https://techformanord.fr/ | grep -o '<meta name="robots"[^>]*>'   # index, follow
curl -sk --resolve techformanord.fr:443:76.13.44.177 https://techformanord.fr/sitemap.xml | grep -c '<loc>'
```
Envoyer une demande réelle de test depuis le formulaire (en forçant la résolution via `/etc/hosts` sur un poste de test) et vérifier sa réception sur `FORM_TO`.

### 2. Basculer le DNS (IONOS)
Modifier **uniquement** les 4 enregistrements A/AAAA du tableau. Ne pas toucher MX, SPF, DMARC, autodiscover ni les autres sous-domaines.

### 3. Certificats et domaine principal
Traefik obtient les certificats Let's Encrypt (défi TLS-ALPN) dès que le DNS résout vers le VPS (quelques minutes ; certificat par défaut entre-temps). Contrôler :
```bash
for h in techformanord.fr www.techformanord.fr; do echo | openssl s_client -connect $h:443 -servername $h 2>/dev/null | openssl x509 -noout -issuer -enddate; done
curl -sI http://techformanord.fr/ | grep -i location          # -> https://techformanord.fr/
curl -sI https://www.techformanord.fr/services/ | grep -iE '^HTTP|location'   # 301 -> https://techformanord.fr/services/
curl -sI https://techformanord.fr/ | grep -iE '^HTTP|strict-transport'
```

### 4. Redirections, canonical, sitemap
```bash
python3 -I qa/redirections.py https://techformanord.fr production    # 215 conformes attendues
cd qa && BASE=https://techformanord.fr node liens.mjs
curl -s https://techformanord.fr/robots.txt
curl -s https://techformanord.fr/service/maintenance/ | grep -o '<link rel="canonical"[^>]*>'
```
Vérifier qu'aucune page de production ne renvoie `noindex` (hors `/contact-us/merci/` et 404).

### 5. Préproduction
La pile `tfn-preprod` reste en place, protégée (authentification, `X-Robots-Tag`, `noindex`). Ne pas réutiliser ses fichiers d'environnement. L'arrêter si elle n'est plus utile :
`docker compose -p tfn-preprod --env-file /etc/techformanord/preprod.env -f deploy/docker-compose.preprod.yml down` (le volume de test est conservé ; `down -v` pour le supprimer).

### 6. Search Console
- Soumettre `https://techformanord.fr/sitemap.xml`.
- Inspecter et demander l'indexation de : `/`, `/services/`, les 3 pages pôles, les 5 fiches.
- **Ne pas utiliser l'outil de changement d'adresse** (domaine inchangé).

### 7. Remonter le TTL
Après 48 h sans incident, remonter le TTL à sa valeur d'origine (3600 s).

## Suivi après bascule

| Échéance | Contrôles |
|---|---|
| J+1 | Erreurs 5xx/404 dans `docker logs tfn-prod-web` ; réception des demandes ; certificat ; événements de mesure. |
| J+7 | Search Console : pages indexées, erreurs d'exploration (les 410 des pages de démonstration sont attendus), sitemap lu ; 404 inattendues dans les journaux (`docker logs tfn-prod-web 2>&1 | grep '" 404 '`) → ajouter une ligne au mapping si une ancienne URL utile apparaît, régénérer `legacy-rules.inc`, redéployer. |
| J+30 | Comparaison impressions/clics des pages conservées vs les 30 jours précédant la bascule ; requêtes de marque ; demandes de renseignement, clics téléphone/e-mail, sorties vers les sites spécialisés ; Core Web Vitals. |
| J+90 | Bilan SEO (pages, requêtes, positions moyennes, conversions). Décider de la conservation des slugs hérités (`/infinite-grid-col-2/`…) ; une éventuelle migration vers des URL lisibles se fera par 301 directes, une page à la fois. Résiliation éventuelle de l'hébergement WordPress après export final. |

Aucun classement n'est garanti : une baisse temporaire de visibilité est possible pendant la réindexation.
