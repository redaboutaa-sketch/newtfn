# Suivi SEO — techformanord.fr

| Date | Action | Résultat |
|---|---|---|
| 2026-11-27 | Inventaire : site servi par `tfn-prod-web` (dépôt `newtfn`, `main` c18768c), Traefik commun du VPS | voir `roast-roadmap.md` |
| 2026-11-27 | Audit (indexabilité, robots, sitemap, canoniques, titres, contenu rendu, liens, formulaires, perf mobile) | 0 bloquant technique ; accueil trop pauvre |
| 2026-11-27 | PR `seo/accueil-presentation-organisme` : texte factuel + titre de l'accueil | build preprod + production OK, sitemap 21 URL, `qa/liens.mjs` OK (hors LinkedIn/Instagram), axe 0 violation, rendu 1366 px et 390 px vérifié |
| 2026-11-27 | Search Console | **non vérifié** : aucun accès propre à ce domaine trouvé sur le VPS |

## Accès de mesure
- Search Console : à ouvrir en lecture seule (propriété `sc-domain:techformanord.fr`) pour un compte de service dédié,
  clé hors dépôt (`/etc/tfn-seo/gsc-service-account.json`, 0600). Tant qu'il manque, le passage hebdomadaire indique
  « mesure Search Console indisponible ».
- Plausible : script présent dans la CSP (`plausible.io`) ; aucun accès API configuré sur le VPS.
