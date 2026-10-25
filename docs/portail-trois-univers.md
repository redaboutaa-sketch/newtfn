# Portail à trois univers

Mission « portail visuel à trois univers » — branche `feat/portail-trois-univers` (base `feat/premium-motion-tfn`).
Cette demande remplace la composition d'accueil précédente : la racine devient une page d'entrée courte.

## Routes

| URL | Contenu | Notes |
|---|---|---|
| `/` | **Portail** : « Tech Formation Nord », une phrase, trois univers, contact direct, accès qualité et légal | Servie en 200, sans redirection ni écran temporisé. Pas d'en-tête ni de pied de page du site TFN (`Base chrome="portail"`). |
| `/acceuil/` | Accueil du site TFN, recentré sur l'**automobile** (formations, accompagnement, qualité, centre, accès aux deux autres univers) | Chemin conservé tel que demandé (orthographe « acceuil »). Métadonnées et canonical propres (`https://techformanord.fr/acceuil/`). |
| autres pages | Inchangées dans leurs URL, ancres `#prog-…`, PDF et redirections (215/215 conformes) | Aucune redirection vers le portail. |

Navigation du site TFN : logo, « Accueil » et fil d'Ariane → `/acceuil/` ; lien discret « ← Nos trois univers » dans le bandeau supérieur et le pied de page → `/`. Sur le portail, le logo TFN revient à `/`.

## Destinations des univers

Données dans `site/src/content/data/poles.yaml` (clé `portail` de chaque pôle).

| Univers | Marque / logo | Destination | Type de lien |
|---|---|---|---|
| Automobile | Tech Formation Nord (logo d'origine `img/logo-tfn.png`) | `/acceuil/` | relatif : reste dans l'environnement courant (préproduction ou production) |
| Esthétique et bien-être | Maison Beauxlieux (logo officiel) | `https://maisonbeauxlieux.com/` | externe, même onglet |
| Intelligence artificielle | IA Tech Formation Nord (logo créé) | `https://iatechformanord.fr/` | externe, même onglet |

Chaque univers est **un seul lien HTML** (logo, illustration, intitulé `h2` et « Découvrir les formations → ») : un clic ou un appui n'importe où ouvre la destination ; aucun lien imbriqué, aucun `onclick`, aucune dépendance au survol ni au JavaScript.

## Assets

| Fichier | Origine |
|---|---|
| `site/public/img/logos/maison-beauxlieux.webp` | Logo officiel publié sur maisonbeauxlieux.com (`/assets/image_1776263779059-BXv8zqnQ.png`, 503 × 283, SHA-256 `6a0a8123…acb00`), converti en WebP sans retouche. Le fond beige fait partie de l'original : il est affiché en plaque arrondie, comme sur le site d'origine. |
| `site/public/img/logos/ia-tech-formation-nord.svg` / `-mono.svg` | **Logo créé** pour « IA Tech Formation Nord » (aucun logo définitif fourni) : l'anneau ouvert gris et bleu du logo TFN, habité d'un réseau de quatre nœuds, « IA » en italique de construction (Inter 800, 12°), « TECH FORMATION NORD » dessous comme sur le logo TFN. Texte vectorisé (aucune police requise). Variante monochrome en `currentColor`. Générateur : `site/scripts/logo-ia.mjs`. Aperçu : `docs/captures/logo-ia-tech-formation-nord.png`. |
| `site/src/assets/sketches/*.svg` (en ligne, animés) et `site/public/img/sketches/*.svg` (vignettes) | **Illustrations originales** générées par `site/scripts/sketches.mjs` : une seule projection isométrique, la même pièce (dalle, deux murs coupés, carrelage), le même trait (1,5, encre `#22303D`), ombres géométriques légères, aplats discrets par univers (bleu, rose poudré et or, violet). Automobile : véhicule sur pont à ciseaux, servante, pneus, panneau d'outils, chariot de diagnostic. Esthétique : table de soin à dossier relevé, miroir rond et console, desserte, étagère de flacons, tabouret, plante. IA : bureau, écran avec conversation, tableau de flux, réseau de nœuds, fauteuil, plante. **Symboliques** : elles ne représentent pas les locaux. Aperçus : `docs/captures/sketch-*.png`. |

Pour modifier une scène : éditer `scripts/sketches.mjs` puis `node scripts/sketches.mjs` (les deux jeux de fichiers sont régénérés). Les classes `sk-*` portent les animations.

Équilibre optique des logos : hauteurs différentes par logo (`portail.logo.hauteur` : TFN 60 px, plaque Maison Beauxlieux 64 px, IA 56 px ; × 0,7 sur mobile).

## Animations

Entrée coordonnée (titre, puis les trois panneaux décalés de 110 ms) ; à l'issue de l'entrée, chaque illustration joue une fois son détail : le pont élève le véhicule et la courbe de diagnostic se trace (automobile), l'arche se dessine et un reflet traverse le miroir (esthétique), les messages apparaissent et une impulsion circule entre les nœuds (IA). Au survol ou au focus clavier : léger agrandissement du sketch (×1,04), fond et barre d'accent qui s'étendent, flèche qui avance, détail local rejoué (le véhicule monte de 6 px) ; sur ordinateur, les illustrations des deux autres panneaux s'atténuent légèrement, le texte reste intact. Aucune boucle permanente. `prefers-reduced-motion` : aucune animation ; sans JavaScript : tout est visible et cliquable.

## Cartes formation

`site/src/components/FormationCard.astro` + `site/src/lib/cards.ts` : visuel, nom, durée **si publiée**, un seul lien. Utilisées sur `/services/`, `/acceuil/`, les trois pages pôles et `/infinite-grid-col-2/`.
- Automobile : photo de la fiche ; parcours → durée publiée ; fiches catalogue → nombre de modules (aucun volume global publié).
- Beauté : durées de `poles.yaml`, lien vers le programme sur maisonbeauxlieux.com ; visuel = cadrage de l'illustration esthétique (pas de photo réelle disponible, voir M2).
- IA : durées reprises des descriptions publiées (« 2 journées », « 7 h par fonction, 21 à 35 h en programme », « 16 à 35 heures ») ; descriptions détaillées conservées en accordéon sur la page pôle.
- Durées manquantes : non affichées, listées en P4 de `points-a-confirmer.md`.

Fiches : durée et contact (devis, téléphone, WhatsApp) en tête ; modules présentés en cartes ; pour chaque module, titre, durée et objectif visibles, programme détaillé replié (présent dans le HTML, ouvert automatiquement si le module est ciblé par son ancre). Parcours : chiffres clés visibles, tableau complet et phases en accordéons.

## WhatsApp

Configuration : `site/src/content/data/organisme.yaml`, clé `whatsapp` (`numero` au format international sans « + », `affiche`, `message`). Numéro **+33 7 58 05 81 78**, communiqué par le client le 25/10/2026. Si `numero` est vide, tous les boutons disparaissent (`WhatsAppLink.astro`). Lien `https://wa.me/<numero>?text=…` : le message prérempli peut nommer l'univers ou la formation consultée (« Bonjour, je souhaite des informations sur les formations : <formation>. »), jamais une donnée personnelle. Emplacements : portail, pied de page, page contact, bandeau d'appel, fiches (en-tête et chaque module), accueil automobile. Mesure : événement `clic_whatsapp` (avec l'emplacement).

## Recette (préproduction, version `31541ab`)

Voir `docs/rapport-recette.md`, section « Portail à trois univers ».

## Retour arrière

Voir `docs/procedure-retour-arriere.md`, section E : l'image précédente `tfn-site:preprod-a8ec674` reste disponible.
