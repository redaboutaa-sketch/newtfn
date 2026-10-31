# Direction artistique et plan de motion

Mission « montée en gamme visuelle » — branche `feat/premium-motion-tfn`.

## Audit de départ (24/10/2026, captures 1440 px et 390 px)
- Premier écran textuel : H1 de 5 lignes, grande zone vide à droite, aucune image.
- Trois pôles présentés par des cartes identiques à pictogramme ; succession de sections « grille de cartes ».
- Pages internes : en-tête dégradé uniforme, programmes lisibles mais denses, peu de hiérarchie visuelle.
- Points forts à conserver : performance (Lighthouse mobile 99-100), accessibilité (100, 0 violation axe), contenus et URL.

## Intention
« Organisme de formation contemporain, concret, humain et exigeant. » Un système éditorial sur papier clair, ponctué de sections nuit ; la photographie du geste (main, outil) plutôt que des visages : elle montre le métier sans prétendre représenter nos stagiaires ou nos locaux.

| Pôle | Registre | Accent (sur clair / sur nuit) | Visuel |
|---|---|---|---|
| Automobile | précision, pratique | `#1870B0` / `#7DB9EA` | photos de gestes (clé, pistolet de peinture), showroom |
| Beauté | soin, savoir-faire | `#A23B72` / `#F0A3C3` | nature morte d'outils d'onglerie (cadrage serré) |
| IA | clarté, usages concrets | `#5B3FC4` / `#B7A8F5` | composition graphique SVG (fenêtres d'usage : réponse client, devis, synthèse) |

## Système
- **Couleurs** : papier `#F5F3EE`, papier 2 `#ECE7DE`, encre `#121A24`, encre secondaire `#3D4856`, filets `#D9D3C8`, nuit `#0C1726`. Bleu de marque `#1870B0` (logo).
- **Typographie** : titres *Bricolage Grotesque* (variable, OFL), texte *Inter* (variable, OFL), auto-hébergées, sous-ensemble latin (41 + 48 Ko), `font-display: swap`, titre préchargé.
- **Grille** : 12 colonnes, largeur max 1240 px, gouttière 16–32 px ; rythme vertical 8 px.
- **Images** : AVIF + WebP, 3 largeurs par recadrage, ratios intentionnels (4:5 portrait pour le hero, 16:9 paysage pour les pôles) ; visuel principal en `fetchpriority=high`, le reste en `loading=lazy`.
- **Composants transverses** : en-tête de page éditorial, rangées image/texte alternées, listes de programmes en lignes, bandeaux nuit, blocs de confiance.

## Sources des visuels
- Photos automobile : banque d'images du thème historique, déjà publiées sur techformanord.fr (licence à confirmer : point M1).
- Nature morte beauté : visuel publié par Maison Beauxlieux, généré par IA (point M2) ; recadré sur les outils, il n'est jamais présenté comme une photo des locaux ou d'une formation.
- Aucune personne ni local n'est retouché ; le logo n'est pas modifié.

## Plan de motion
Courbe commune `cubic-bezier(.2,.7,.2,1)` ; interactions 180–220 ms, révélations 500–650 ms, translations 12–20 px ; uniquement `transform` et `opacity` (et `clip-path` sur un masque d'image).

| Zone | Mouvement |
|---|---|
| Hero | entrée coordonnée (surtitre, titre, texte, panneaux) décalée de 60–90 ms ; CTA visibles immédiatement ; images légèrement zoomées qui se posent. |
| Navigation | soulignement actif qui se déploie ; en-tête compact après 80 px de défilement ; menu mobile en feuille avec piège de focus, fermeture par le bouton, Échap ou un lien. |
| Pôles | zoom lent de l'image, barre d'accent qui s'allonge, flèche qui avance — au survol **et** au focus clavier. |
| Défilement | révélations sobres (montée, fondu, masque d'image) une seule fois par élément ; léger effet de profondeur sur 2 images (ordinateur uniquement). |
| Micro-interactions | boutons, liens fléchés, accordéons (ouverture animée là où le navigateur le permet), champs (focus, erreur `:user-invalid`), état d'envoi du formulaire. |
| Pages | transition de page native entre documents (fondu 200 ms, navigateurs compatibles). |

Garde-fous : `prefers-reduced-motion` désactive tout mouvement ; sans JavaScript, rien n'est masqué ; si le script ne se charge pas, un filet CSS révèle les contenus après 2,5 s ; aucun carrousel, curseur personnalisé, écran de chargement ni défilement détourné.

## Décisions
- **Pas de changement de stack** : Astro statique conservé ; mouvement en CSS natif + un script de ~2 Ko (IntersectionObserver), sans bibliothèque (GSAP inutile pour ces séquences courtes). Transitions de page via l'API View Transitions entre documents, sans routeur client.
- **Pas de carrousel** : les trois pôles sont visibles simultanément (mosaïque liée à leurs pages).
- **Photos du geste, pas de visages** : aucune image ne laisse croire qu'il s'agit de nos stagiaires, formateurs ou locaux.
- **Catalogue en lignes structurées** plutôt qu'en grilles de cartes ; cartes réservées aux blocs de contact et de confiance.
- **Fiches** : objectifs, public, prérequis, durée, tarif et bénéfices toujours visibles ; contenu détaillé, méthodes et évaluation dans un accordéon (présents dans le HTML, donc indexables) ; sommaire latéral suivi au défilement ; ancres `#prog-…` inchangées.
- **Nom court des pôles** (`nom_court` dans `poles.yaml`) pour les étiquettes.
- **Contrastes** : teintes foncées dédiées (`--auto-ink`, `--beaute-ink`, `--ia-ink`) pour les petits textes sur fonds teintés.
- **Typographie française** : espace insécable avant « : ; ? ! » dans les titres de fiches.

## Portail à trois univers (25/10/2026)
La page d'entrée adopte un langage d'illustration isométrique au trait fin (contours sombres, aplats discrets, ombres géométriques, grandes surfaces claires), commun aux trois univers ; le site TFN conserve sa direction photographique. Détails : `docs/portail-trois-univers.md`.
