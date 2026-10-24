# Mesure et suivi

## Événements préparés
Le gabarit envoie des événements nommés (fonction `tfnTrack`) vers Plausible si configuré en production, et vers `window.dataLayer` dans tous les cas (aucun envoi réseau en préproduction).

| Événement | Déclencheur | Propriétés |
|---|---|---|
| `demande_renseignement` | Affichage de `/contact-us/merci/` après un envoi valide | — |
| `clic_telephone` | Clic sur un lien `tel:` | `emplacement` (bandeau, pied-de-page, fiche-hero…) |
| `clic_email` | Clic sur un lien `mailto:` | `emplacement` |
| `consultation_pole` | Affichage d'une page rattachée à un pôle | `pole` (automobile, beaute, ia) |
| `clic_site_specialise` | Clic sur un lien marqué `data-track="passerelle"` | `destination` (domaine), `pole` |

Test : ajouter `?debug-tracking` à l'URL pour voir les événements dans la console.

## Outil
Seul **Plausible** (sans cookie, sans consentement requis) est intégré : `PUBLIC_ANALYTICS_PROVIDER=plausible` au build de production. Un outil à cookies (GA4…) nécessiterait d'abord une plateforme de gestion du consentement ; il n'est volontairement pas branché. Les statistiques Burst/Jetpack de l'ancien site restent dans WordPress : les exporter avant la bascule.

Préproduction et production sont séparées : le build de préproduction n'inclut aucun script de mesure.

## Liens entre domaines
- **Aucun paramètre UTM sur les liens internes**, ni sur les liens vers maisonbeauxlieux.com et iatechformanord.fr (ces paramètres fragmentent les URL et brouillent l'attribution entre sites d'une même organisation).
- Côté portail : l'événement `clic_site_specialise` mesure les sorties par pôle et par page.
- Côté sites spécialisés : le référent `techformanord.fr` (politique `strict-origin-when-cross-origin`, transmise par le portail) identifie les visites reçues.
- Si une mesure plus fine est nécessaire, utiliser une seule propriété Plausible pour les trois domaines (rapport « sources ») plutôt que des paramètres d'URL. Les liens restent ainsi propres et compatibles avec les URL canoniques des sites spécialisés.

## Search Console
- Changement d'hébergement à domaine constant : **ne pas utiliser l'outil de changement d'adresse**.
- Vérifier la propriété de domaine `techformanord.fr` par enregistrement DNS TXT (recommandé), ou via `PUBLIC_GSC_VERIFICATION` (balise méta, production uniquement).
- Soumettre `https://techformanord.fr/sitemap.xml` après la bascule ; ne jamais soumettre la préproduction.
