# TrainingForMe

## Audit avant modification

La branche a été créée depuis le commit `eeda2a8` de `origin/main`. La vitrine Astro génère des pages statiques à partir des contenus YAML. Le microservice Node `forms/` traite le formulaire de contact. Le dépôt ne possédait ni comptes, ni sessions, ni stockage relationnel. Nginx sert la vitrine sur le VPS derrière Traefik. Cloudflare Pages construit un aperçu statique sur les branches GitHub, avec `noindex` et formulaire désactivé. Les commandes existantes de build, les tests du formulaire et la recette Chromium restent applicables.

## Fonctionnement par phase

| Phase | Changements et vérification | Validation attendue |
| --- | --- | --- |
| 1 · Fondations | Accueil avec Automobile (lien direct vers `/acceuil/`), TrainingForMe et Esthétique. Le lien « Tous nos univers » mène au portail de la vitrine à `/tech-formation-nord/` (retiré de l’accueil le 24/11/2026, voir ci-dessous). Sessions, accès par rôle et récupération par e-mail. Recette clavier et autorisations, révocation sur changement de mot de passe testée. | Valider le parcours visuel et vérifier la réception d’un vrai e-mail avec la configuration SMTP retenue. |
| 2 · LMS | Catalogue initial et pack, inscriptions, tableau de bord, lecteur, supports privés et progression SQLite. Le test associe un apprenant à une session et vérifie qu’un autre compte ne voit pas sa formation. | Importer les supports et choisir le découpage pédagogique. |
| 3 · Pédagogie | Prompts avec variables, remises, QCM, corrections et attestations PDF. Test de réussite et d’échec au QCM, remise, correction et délivrance conditionnelle. | Valider le modèle d’attestation, le seuil et les critères pédagogiques par formation. |
| 4 · Administration | Éditeur, comptes, sessions, suivi qualité, journal et exports. Recette des opérations d’administration, avec vérification des tentatives d’accès par les autres rôles. | Définir la politique de conservation, qualifier les preuves requises et valider la restauration en préproduction. |

Les quatre formations contiennent leurs intitulés, durées et tarifs du cahier des charges. Les modules, leçons, objectifs et évaluations définitifs restent à importer. Le catalogue ne permet pas d’acheter en ligne. Une vidéo ouverte ou une activité cochée ne crée aucune mesure de temps passé. L’attestation demande l’achèvement des activités et une évaluation finale validée. Le formulaire de satisfaction est qualitatif. L’éditeur permet huit questions par QCM et des supports PDF ou MP4 jusqu’à 20 Mio par fichier. Les fichiers remis sont servis en téléchargement privé.

## Démarrer en local

Node 22.20 ou ultérieur. Dans `lms/`, installer avec `npm ci` et démarrer avec `npm start`. Le service écoute sur `http://127.0.0.1:4330/trainingforme/`. Lancer la vitrine séparément sur le port 4321 pour vérifier son catalogue de secours. Tester le LMS avec `npm test`.

Créer le premier administrateur avec `npm run user -- admin <e-mail> <nom>`, en lui passant un mot de passe d’au moins 12 caractères sur l’entrée standard depuis un gestionnaire de secrets ou un fichier protégé. La même commande prend en charge les rôles `trainer` et `learner` pour des comptes de recette. La procédure habituelle crée les comptes formateur et apprenant dans l’administration. Le titulaire choisit alors son mot de passe via la récupération par e-mail.

## Exécution sur l’infrastructure existante

Les fichiers Compose ajoutent un service Node séparé sur le réseau interne privé, sans port publié, avec un volume nommé propre à chaque environnement. Le conteneur exécute Node avec un utilisateur non privilégié. Nginx transmet `/trainingforme/` au service. L’alias public de préproduction et l’aperçu Cloudflare servent le catalogue statique. Seul le nom d’hôte protégé sert le LMS de préproduction. La préproduction conserve la messagerie désactivée dans la configuration fournie. Les paramètres SMTP de production réutilisent ceux du formulaire grâce aux variables serveur. Les e-mails de réinitialisation contiennent un jeton à usage unique valable 30 minutes. La session expire au bout de huit heures.

Pour une exécution indépendante, `LMS_ORIGIN` contient l’origine HTTPS publique du LMS, `LMS_DB` le chemin de la base et `LMS_BIND` l’adresse d’écoute. Les paramètres d’e-mail sont `LMS_SMTP_HOST`, `LMS_SMTP_PORT`, `LMS_SMTP_SECURE`, `LMS_SMTP_USER`, `LMS_SMTP_PASS` et `LMS_MAIL_FROM`. Les valeurs réelles vivent dans la configuration serveur. Éviter les données réelles sur les environnements de recette.

Les modifications de Compose, Nginx, Dockerfile et de l’outil de déploiement font partie de la relecture d’infrastructure prévue par le dépôt. La validation du build Cloudflare concerne la vitrine statique. L’administrateur vérifiera séparément les routes Nginx, le volume, l’envoi SMTP et la restauration sur le VPS de préproduction.

## Migration, sauvegarde et droits

La migration `lms/migrations/001-initial.sql` s’applique à l’ouverture de la base, avec transaction, clés étrangères et suivi des migrations. Elle initialise le catalogue et le seuil de 70 %. Elle inclut les comptes, rôles, parcours, remises, tentatives, attestations et retours qualité. SQLite convient à une instance Node unique. Les supports et remises résident dans le même volume que la base.

`npm run backup -- <nouveau-chemin.sqlite>` crée une sauvegarde cohérente SQLite, avec les documents et les preuves pédagogiques. Copier la sauvegarde vers un stockage privé chiffré selon la politique de l’organisme. Vérifier la restauration sur un environnement isolé et conserver l’original avant toute migration. Une restauration nécessite l’arrêt préalable du service, puis l’ouverture d’une copie de la sauvegarde dans un répertoire distinct. Vérifier les inscriptions, les documents et les attestations avant de basculer le service.

L’apprenant peut accéder à son parcours, à ses résultats, à ses remises et à ses attestations. Le formateur voit les inscriptions de ses seules sessions. Les exports administratifs contiennent des données personnelles. Le registre et la notice de confidentialité doivent préciser les finalités, les destinataires, les délais de conservation et le processus de traitement des demandes d’accès, rectification ou effacement. La suppression métier et la purge des preuves suivent la politique à faire valider par l’organisme. Les seules suppressions automatiques actuelles concernent les jetons expirés et compteurs d’authentification. Les exports et sauvegardes contribuent à l’archivage des preuves. Leur périmètre, les délais et la validation Qualiopi relèvent de l’organisme.

## Accueil à quatre cartes (24/11/2026)

L’accueil (`site/src/pages/index.astro`) présente trois univers — Automobile (`/acceuil/`), Intelligence artificielle (`https://iatechformanord.fr/`), Esthétique et bien-être (`https://maisonbeauxlieux.com/`) — puis une carte transversale « Formations en ligne » vers `https://trainingforme.fr/`, qui rassemble les formations en ligne des différents univers. Le lien « Tous nos univers » ne figure plus dans l’en-tête de l’accueil ; la page `/tech-formation-nord/` reste en ligne.
