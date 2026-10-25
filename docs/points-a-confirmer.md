# Points à confirmer avant la mise en production

Collecte du 24/10/2026. Aucun de ces points n'est affiché comme « à confirmer » sur le site public : le site affiche soit la valeur retenue (indiquée ci-dessous), soit rien.

Légende : **[Bloquant]** = à trancher avant la bascule · **[Important]** = à traiter rapidement · **[Amélioration]**

## 1. Qualiopi et certifications

| # | Constat | Valeur retenue en préproduction | Décision attendue |
|---|---|---|---|
| Q1 **[Bloquant]** | Le site historique et maisonbeauxlieux.com affichent Qualiopi. Le site IA indique « Certifiée — Qualiopi en cours » (page Entreprises), « TFN est engagé dans le processus d'obtention de la certification Qualiopi » (page CPF) et « La certification Qualiopi est en cours d'obtention » (FAQ). | Qualiopi affiché **au niveau de l'organisme** Tech Formation Nord, d'après le certificat CCTA n° 3590226QA-A et la liste publique DGEFP (SIREN 930 182 738, « actions de formation »). **Aucune mention Qualiopi propre au pôle IA.** | Les formations IA sont-elles dispensées par la SAS Tech Formation Nord (SIREN 930 182 738) ? Si oui, corriger le site IA ; sinon, préciser l'entité et retirer toute association. |
| Q2 **[Important]** | Trois certificats successifs ont été trouvés pour le même cycle (début 04/10/2024) : Qualinow QNW0120 (en-tête daté « 08/08/2022 », incohérent avec un cycle 2024), Sphinx QAL-CERT-930182738-20251007-v1 (07/10/2025), CCTA 3590226QA-A (24/02/2026 → 03/10/2027). | Le plus récent (CCTA) est publié en téléchargement. Les deux anciens ne sont plus servis (410). | Confirmer que le certificat CCTA est bien le seul en vigueur et que l'audit de surveillance est planifié. |
| Q3 **[Important]** | Le site IA annonce « Parcours certifiants (RS6776), éligibles CPF ». La fiche France Compétences RS6776 est active (échéance 01/10/2029) mais son **certificateur est INKREA FORMATIONS** ; les codes NSF (326, 320) et Formacode (46262, 46298, 46271) affichés ne correspondent pas à la fiche (NSF 324p/326p, Formacode 31028). | Aucune mention RS6776 ni CPF sur le portail. La page IA renvoie vers iatechformanord.fr/cpf/ avec un libellé neutre. | Fournir la convention d'habilitation INKREA → TFN et la preuve de référencement EDOF ; corriger les codes sur le site IA. Sinon retirer ces mentions du site IA. |
| Q4 **[Important]** | Maison Beauxlieux qualifie la formation Maquillage permanent de « complète et certifiante ». | Non repris. | Préciser la certification visée (RNCP/RS) ou retirer le terme sur maisonbeauxlieux.com. |
| Q5 **[Amélioration]** | Logo « les acteurs de la compétence » (Fédération de la formation professionnelle) affiché sur l'ancien site. | Non repris (410 sur le fichier). | Fournir la preuve d'adhésion pour le réafficher. |

## 2. Avis, notes et témoignages

| # | Constat | Valeur retenue | Décision attendue |
|---|---|---|---|
| A1 **[Bloquant pour publication d'avis]** | Badge « Avis global 4,9/5 — basé sur les avis clients » (ancien site) : aucune source, période ni volume. | Non repris (fichier en 410). | Fournir la source (enquête, plateforme) avec période et nombre de répondants, ou abandonner. |
| A2 **[Important]** | Site IA : « 4,6/5 sur 312 participants » (accueil) puis « 4.9/5 · 312 participants · 98 % recommandent » (témoignages) ; « 95 % d'adoption à 3 mois », « +38 % d'appels », « ×4 avis Google ». Témoignages situés à Villeurbanne, Lyon, Roanne, Saint-Étienne, Annecy, Grenoble, Bourg-en-Bresse pour une formation à Lille ; « Sophie L. » est à Lille sur une page et à Lyon sur une autre. | Rien de tout cela n'est repris. Composant « Avis » prêt mais masqué tant que `temoignages.yaml` est vide. | Fournir pour chaque témoignage : auteur affiché, date, source, accord de réutilisation. Vérifier l'origine de ces témoignages sur le site IA (risque de pratique commerciale trompeuse). |
| A3 **[Important]** | Fiche Google Business Profile : aucune capture ni URL fournie dans le projet ; aucune donnée trouvée en recherche. | Lien « Voir les avis sur Google » masqué. | Communiquer l'URL de partage exacte de la fiche (à renseigner dans `organisme.yaml > google_business_url`). Les avis Google ne seront affichés que via une source autorisée, avec attribution ; aucun balisage AggregateRating. |

## 3. Coordonnées et horaires

| # | Constat | Valeur retenue | Décision attendue |
|---|---|---|---|
| C1 **[Bloquant]** | 21 rue de Faches (TFN : certificats, liste DGEFP, ancien site, site IA) vs 21 **bis** rue de Faches (Maison Beauxlieux). | TFN = 21 ; Maison Beauxlieux = 21 bis. Non harmonisés. | Confirmer qu'il s'agit de deux entrées/locaux distincts et où se déroulent les formations esthétiques. |
| C2 **[Bloquant]** | Horaires TFN : pied de page « lundi–vendredi 9h–17h, samedi 9h–12h » ; page contact « 9h–18h, samedi 9h–12h » ; site IA « lun–ven 9h–18h ». Maison Beauxlieux : « lun–sam 9h–20h, dim. sur RDV ». | TFN : lundi–vendredi 9h–18h, samedi 9h–12h (page contact). MBL : ses propres horaires, affichés séparément. | Confirmer les horaires d'accueil de TFN. |
| C3 **[Bloquant]** | E-mail : `contact.techformation@gmail.com` (ancien site) vs `contact@techformanord.fr` (plan d'accès PDF, MX IONOS actif). | `contact.techformation@gmail.com` affiché. | Choisir l'adresse publique ; elle servira aussi de destinataire du formulaire en production (`FORM_TO`). |
| C4 **[Important]** | Page contact de l'ancien site : le lien cliquable pointe vers `tel:0320978114` alors que le numéro affiché est 03 20 16 09 15. | 03 20 16 09 15 partout (affichage et lien). | Confirmer que 03 20 97 81 14 n'est plus utilisé. |
| C5 **[Important]** | Site IA : référent handicap et e-mail de contact = `contact@monsite-mesclients.fr` (adresse sans rapport avec TFN). | Non repris. Référent handicap = 06 87 09 40 03 (ancien site). | Corriger le site IA ; confirmer le nom/numéro du référent handicap. |
| C6 **[Important]** | Site IA, page CPF : « Lieu : visio ou présentiel à Nantes, La Roche-sur-Yon, Angers, Rennes ». | Non repris. | Corriger le site IA (contenu manifestement issu d'un autre organisme). |
| C7 **[Important]** | Directeur de la publication : non indiqué sur l'ancien site (aucune mention légale). | Représentant légal publié au registre (président de la SAS). | Confirmer le nom à publier. |
| C8 **[Amélioration]** | Réseaux sociaux : liens Instagram/TikTok/LinkedIn avec des paramètres de partage différents selon l'emplacement, et un lien Snapchat (`snapchat.com/t/…`) dans le pied de page. | LinkedIn, Instagram, Facebook, TikTok (sans paramètres de suivi). | Confirmer la liste des comptes officiels. |

## 4. Contenus pédagogiques et tarifs

| # | Constat | Valeur retenue | Décision attendue |
|---|---|---|---|
| P1 **[Bloquant]** | Les fiches Maintenance, Carrosserie peinture et Commerce reprennent la structure, la numérotation (44992…, 08…21) et des formulations du catalogue GNFA ; les séparateurs graphiques étaient chargés depuis gnfa-auto.fr ; `/reconvention/` mentionnait explicitement « les parcours reconversion du GNFA ». | Contenus repris fidèlement (instruction : préserver le contenu) ; séparateurs GNFA supprimés ; `/reconvention/` redirigée. | Confirmer que TFN est autorisé à reprendre ces contenus (partenariat, licence) ou fournir des textes propres. |
| P2 **[Important]** | Mécanicien service rapide : « 50 jours de formation / Tarif 8 790 € HT (hors prise en charge) » et « Tarif : devis sur demande » ; 224 h + 50 h = 274 h ≠ 50 jours. | « 8 790 € HT hors prise en charge (devis personnalisé sur demande) » ; durée « 224 heures + 50 heures de soft skills ». « 50 jours » non affiché. | Confirmer tarif et durée. |
| P3 **[Important]** | Module 44994 : encadré « Public : tout public* » vs rubrique Public « Mécanicien automobile, Technicien… ». Objectif général générique (copié du 44992). | Rubrique Public détaillée ; objectif général conservé. | Confirmer. |
| P4 **[Important]** | Modules 44993, 44995, 44996 et tous les modules carrosserie/commerce : aucune durée publiée (17 modules sur 19). | Aucune durée inventée : les cartes et fiches n'affichent la durée que lorsqu'elle est publiée ; les fiches catalogue indiquent le nombre de modules. | Fournir les durées (obligation d'information Qualiopi, indicateur 1). |
| P5 **[Important]** | Aide carrossier : « Public : tout public, l'accueil de personnes en situation de handicap n'est pas compatible » vs paragraphes nuancés invitant à contacter le référent. MSR : formulation catégorique. | Formulation catégorique conservée pour MSR, paragraphes nuancés pour Aide carrossier. | Harmoniser la position handicap (formulation nuancée recommandée). |
| P6 **[Amélioration]** | Aide carrossier, module « Lustrer des éléments de carrosserie » : objectifs identiques au module « Déposer et reposer des systèmes mécaniques ». Module 21 = fusion des modules 12 et 13. Module 12 : structure de liste ambiguë. | Repris tel quel. | Corriger les objectifs. |
| P7 **[Amélioration]** | Module « reprise VO » sans titre dans la source. | Titre déduit : « Estimer et négocier la reprise d'un véhicule d'occasion ». | Valider le titre. |
| P8 **[Amélioration]** | Statistiques de recrutement (+10 %, 48 %) et « 17 % des recrutements » (module freinage), « +10 à 20 % par an » (aluminium) : non sourcées et non datées. | Reprises (contenu historique). | Fournir la source ou les retirer. |
| P9 **[Amélioration]** | Sessions affichées (image « Diagnostic auto ») : septembre–novembre 2025, échues. | Non publiées. | Fournir le calendrier des prochaines sessions. |
| P10 **[Amélioration]** | Ancien site : « leader de la formation en mécanique automobile », « formations certifiantes », « aéronautique et industrie ». | Non repris (allégations non justifiées). | Fournir les justificatifs si vous souhaitez les réintroduire. |
| P11 **[Amélioration]** | Site IA : prix incohérents (« à partir de 1 800 € HT » sur l'accueil vs « 700 – 1 200 € HT » et « 700–1 800 € HT » sur la page programme), « Financement OPCO jusqu'à 100 % », « +CA visible en moins de 60 jours ». | Aucun prix ni promesse repris sur le portail. | Corriger le site IA. |

## 5. Médias et droits

| # | Constat | Décision attendue |
|---|---|---|
| M1 **[Important]** | Les photos des fiches automobile (mécanicien, carrossier peintre, showroom) et des parcours proviennent du thème WordPress de démonstration (noms de fichiers type banque d'images). Elles sont conservées aux mêmes URL et réutilisées sur leurs fiches. | Confirmer la licence ou fournir des photos réelles du centre (ateliers, formateurs, équipements). |
| M2 **[Important]** | Les visuels de maisonbeauxlieux.com semblent générés par IA (textes illisibles sur les flacons). | Non utilisés comme photos de locaux. Fournir de vraies photos pour illustrer le pôle beauté. |
| M3 **[Amélioration]** | Aucune photo de l'équipe ni des locaux TFN ; l'ancienne page « Notre équipe » présentait 8 personnes fictives du thème (410). | Fournir noms, rôles et photos (avec accord) pour une section « Équipe ». |

| M4 **[Amélioration]** | Portail : illustrations isométriques créées (symboliques) et logo « IA Tech Formation Nord » créé faute de logo définitif ; les cartes beauté et IA utilisent des cadrages de ces illustrations faute de photos. | Valider le logo IA (ou fournir le logo définitif) ; fournir des photos pour les cartes. |
| M5 **[Amélioration]** | WhatsApp professionnel +33 7 58 05 81 78 communiqué le 25/10/2026 et intégré. | Confirmer que ce numéro est bien un compte WhatsApp professionnel suivi. |

## 6. Accès et données à obtenir

- **Search Console** : aucune balise de vérification dans le HTML ni enregistrement TXT `google-site-verification` dans le DNS public. Vérifier si la propriété existe (éventuellement vérifiée par fichier ou via un compte Google lié à WordPress/Jetpack). Fournir l'accès pour exporter les pages et requêtes avant la bascule.
- **Analytics** : l'ancien site utilise Burst Statistics et Jetpack Stats (données dans WordPress) et un script Klaviyo (compte `XVZ8jK`). Exporter les statistiques avant la bascule ; confirmer si Klaviyo est encore utilisé.
- **WordPress** : sauvegarde complète (fichiers + base) à réaliser chez IONOS avant la bascule (accès non disponible pour cette mission).
- **DNS** : accès IONOS nécessaire le jour de la bascule (A, AAAA, www). Ne pas toucher MX, SPF, DMARC, autodiscover.
- **SMTP** : identifiants d'une boîte d'envoi (ex. `no-reply@techformanord.fr` chez IONOS) pour le formulaire en production.
