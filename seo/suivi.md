# Suivi SEO — techformanord.fr

| Date | Action | Résultat |
|---|---|---|
| 2026-11-27 | Inventaire : site servi par `tfn-prod-web` (dépôt `newtfn`, `main` c18768c), Traefik commun du VPS | voir `roast-roadmap.md` |
| 2026-11-27 | Audit (indexabilité, robots, sitemap, canoniques, titres, contenu rendu, liens, formulaires, perf mobile) | 0 bloquant technique ; accueil trop pauvre |
| 2026-11-27 | PR `seo/accueil-presentation-organisme` : texte factuel + titre de l'accueil | build preprod + production OK, sitemap 21 URL, `qa/liens.mjs` OK (hors LinkedIn/Instagram), axe 0 violation, rendu 1366 px et 390 px vérifié |
| 2026-11-27 | Search Console branchée (compte `heliostores-seo@…`, réutilisation autorisée ; scope `webmasters.readonly` ; accès `siteFullUser` vérifié par API) | 72 clics / 599 impressions sur 28 j ; 5 des 11 URL inspectées indexées ; voir `roast-roadmap.md` |
| 2026-11-27 | PR #15 : lien « métiers de l'automobile » de l'accueil → `/formations/automobile/` (destination principale, « Détectée, non indexée ») | build, sitemap 21 URL |

## Mesure
- Search Console : `gsc_collect.py` (runner `tfn-seo`), chaque mardi avant le passage hebdomadaire ; historique `/var/lib/tfn-seo/gsc/`.
- Plausible : script présent dans la CSP (`plausible.io`) ; aucun accès API configuré sur le VPS.
