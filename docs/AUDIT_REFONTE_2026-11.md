# Audit avant refonte — 9 novembre 2026

Branche `refonte-premium` (issue de `fitai-premium`, e8254a2). Mesures prises avec
Chrome piloté (Playwright) sur 9 écrans × 6 largeurs (320, 375, 390, 430, 820, 1366 px),
thèmes sombre et clair, jeu de données de test (20 séances).

## Ce qui est sain (mesuré)
- 684 tests unitaires sur 684 ; aucune erreur JavaScript ni requête en échec sur 72 écrans visités.
- Aucun débordement horizontal, aucune image cassée, aucun bouton sans nom accessible.
- Une série validée est écrite dans le stockage immédiatement ; après rechargement en pleine
  séance, charge et répétitions sont retrouvées.

## Défauts constatés
| # | Défaut | Mesure | État |
|---|--------|--------|------|
| 1 | Séance interrompue : la reprise n'apparaissait qu'en bas de la carte « Prochaine séance », sous 6 exercices | capture | corrigé (carte « Séance en cours » en tête) |
| 2 | Thème clair : chiffres de récupération blancs sur blanc, rose pâle | contraste 1,0 et 2,1 | corrigé (18,3 / 5,2 / 7,9) |
| 3 | Thème clair : muscle ciblé vert sur corps vert | capture | corrigé (terre cuite, comme en sombre) |
| 4 | Minuteur de repos posé sur le bouton coach | recouvrement mesuré | corrigé |
| 5 | Réglages : le thème sombre s'appelait encore « Lime » | lecture du code | corrigé |
| 6 | Ordinateur et tablette : une colonne de téléphone centrée, barre du bas étirée | captures 820 et 1366 | à faire (lot 2) |
| 7 | Changement d'onglet lent sur téléphone modeste | 215 à 400 ms, processeur ÷4 ; 3 893 nœuds sur Routines | à faire (lot 2) |
| 8 | Dictionnaire : 164 fiches affichées d'un coup | page de 18 600 px | à faire (lot 4) |
| 9 | Progrès, Nutrition, Dictionnaire, Calculatrices : accessibles seulement depuis Compte | lecture du code | à faire (lot 2) |
| 10 | Bibliothèque : 20 cibles tactiles sous 40 px ; accueil : 28 textes sous 11 px | mesure | à faire (lots 3 et 5) |
| 11 | Le minuteur de repos continue après l'abandon d'une séance | capture | à faire (lot 3) |
| 12 | Démarrage : 90 fichiers, 1,5 Mo non compressés en local | mesure | à vérifier sur GitHub Pages (gzip) |

## Demandé et absent
Archivage des programmes ; modèle « Bro Split » ; AMRAP proposé dans l'interface de séance
(présent dans le moteur) ; choix explicite Epley / Brzycki / Lombardi (le moteur calcule les
trois et affiche une médiane) ; mise en page ordinateur.

## Demandé et déjà présent
Bibliothèque (1 957 exercices, 57 machines, filtres, corps cliquable, favoris, exercices
personnels), séance (séries, charge, tempo, RPE, RIR, supersets, dégressives, échauffement,
EMOM, notes, remplacement, réorganisation, chronomètre), programmes (Full Body, Haut/Bas,
PPL, personnalisés, duplication), statistiques et 16 mensurations, calculatrices (1RM, IMC,
métabolisme, macros, masse grasse), dictionnaire (164 termes, 11 catégories), coach IA
facultatif avec validation, sauvegarde et restauration, PWA et APK.

## Non vérifié
Rendu sur un vrai téléphone ; les sites FitAI et Fit'Distance (inaccessibles depuis cet
environnement) ; objectif de 3 000 exercices (1 957 distincts avec les sources autorisées).

## Complément d'audit (même jour)

Demandé dans la mission et non couvert au premier passage.

| Vérification | Méthode | Résultat |
|---|---|---|
| Boutons inactifs | clic sur chaque bouton visible de 8 écrans (159 boutons distincts), page neuve à chaque clic | 0 bouton sans effet, 0 erreur JavaScript ; 1 bouton inatteignable (ci-dessous) |
| Bas de page | mesure de l'espace entre le dernier élément et la barre, 9 écrans × 3 largeurs | **défaut** : le dernier élément de chaque page passait sous la barre (−52 px) ; « Créer depuis une séance passée » ne pouvait pas être touché. Cause : `html,body{height:100%}`. Corrigé (+50 à +68 px) |
| Sauvegarde | favori, thème, nouvelle routine, puis actualisation | conservés |
| Double stockage | localStorage vidé, puis actualisation | données rendues par IndexedDB |
| Sauvegarde / restauration | export JSON, navigateur vierge, import « Fusionner » | 20 séances, favoris, routines, 8 mensurations revenus ; aucune clé du coach dans le fichier |
| Calculs | Epley, Brzycki, Lombardi (100 kg × 5), Mifflin-St Jeor, US Navy, IMC, somme des macros : recalcul indépendant | identiques |
| Bibliothèque | scénario de 28 vérifications | 28/28 |

Non couvert : chaque champ de chaque formulaire, chaque graphique ; le bouton retour
d'Android quand une feuille est ouverte sur le premier écran (à vérifier dans l'APK) ;
Fit'Distance (site bloqué ici, navigateur de Mehdi non joignable depuis le mobile).
FitAI : référence = `docs/ANALYSE_FITAI_APK_2.0.6.md` (XAPK fourni par Mehdi).

## Lot 2a — fait
- Barre du bas : Accueil · Entraînement · Exercices · Progrès · Profil. Un sous-écran allume
  l'onglet dont il dépend et affiche un retour. Récupération : depuis Progrès et Profil.
- Thème clair en bleu, neutres froids (contrastes vérifiés : 5,1 à 6,1).

## Lots suivants — faits le 10 nov. 2026

| Lot | Contenu | Vérification |
|---|---|---|
| Accueil | bouton de séance avant la liste ; semaines d'affilée ; carte Poids (30 j) et Derniers records battus ; accès Coach / Calculs / Lexique / Nutrition ; plus de « −100 % » en début de semaine | captures 390 px, tests moteur |
| Écrans larges | ≥ 1024 px : menu latéral, contenu 1080 px, deux colonnes (Accueil, Progrès, Profil, Entraînement, Bibliothèque) ; ≥ 768 px : colonne 720 px | captures 820 et 1366 px, deux thèmes, aucun débordement |
| Programmes | Archiver / Désarchiver une routine ; répartition choisie dans le profil (auto, corps entier, haut/bas, poussée-tirage-jambes, par groupe) | 10 vérifications navigateur, 3 tests moteur |
| Séance | échauffement calculé, disques à charger, alerte de record à la validation, minuteur arrêté à l'abandon | 18 + 10 vérifications navigateur |
| Progrès | séries par muscle sur 7 / 30 j avec écart sur la période d'avant | test moteur, capture |
| Dictionnaire | 40 termes puis « Afficher plus » (page 18 600 → 5 200 px) | navigateur |
| Performance | corps des vignettes dessiné une fois (`spriteAnatomie`, `<use>`) : script de l'onglet Entraînement 164 → 60-116 ms (processeur ÷4) | mesure |
| Bibliothèque | + pupitre à biceps, box de saut, mur (60 machines et équipements) | tests |

Audit rejoué après ces lots : 72 écrans (9 × 6 largeurs + thème clair), aucun débordement,
aucune erreur JavaScript, aucun bouton sans nom, aucune image cassée. 698 tests unitaires.

Constat corrigé : le choix de formule 1RM existait déjà (consensus + détail de sept formules
dont Epley, Brzycki, Lombardi) ; l'AMRAP existait déjà (type de série).

## Reste à faire
- Identité visuelle : la palette, la typographie et les composants sont inchangés ; seuls
  l'accueil, le thème clair et la mise en page large ont été retravaillés.
- 648 fiches d'exercice sans consignes ; objectif de 3 000 exercices non atteignable avec les
  sources autorisées (1 957).
- Coach IA : non revu. Dossiers de routines, widgets Android, export CSV : non faits.
- Chaque formulaire et chaque graphique, un par un ; tout essai sur un vrai téléphone ;
  affichage en livres pour les nouveaux outils.

## Suite du 10 nov. 2026 (soir)

- En-tête d'écran unique (`enTete`) : Exercices, Nutrition, Profil, Récupération, Anatoly.
- États vides : Accueil et Progrès sans aucune séance n'affichent plus des tuiles à zéro.
- Dossiers de routines (ranger, changer, sortir ; conservés après actualisation).
- Coach hors ligne : bilan des performances (données enregistrées uniquement), explication
  d'un exercice, aide à la construction du programme (aucune modification automatique).
- Corrigé : fiche « Pupitre à biceps » (réglages au mauvais format dans le build 13).
- Fit'Distance, page bancs lue (131 exercices, même fonctionnement que la page machines) :
  rien à ajouter, le groupe « bancs » de l'app compte 226 exercices.
- Audit rejoué : 72 écrans sans débordement ni erreur. 699 tests. Navigateur : 100/101
  (l'échec restant est une image externe bloquée par l'environnement de test).

## Suite du 10 nov. 2026 (nuit)

- Identité : Mehdi a vu trois pistes (bleu actuel, « Volt », « Braise ») et garde le bleu.
- Consignes rédigées par l'app (`consignesAuto.js`) : 31 mouvements reconnus au nom, 325 fiches
  complétées et marquées « À vérifier » ; 323 restent incomplètes (mouvement non reconnu :
  on ne rédige pas). Validées : 1 227, inchangé.
- Export CSV : il existait déjà (séances et mensurations) ; ajout de la neutralisation des
  textes ressemblant à une formule de tableur.
- Vérifié en plus : échauffement et disques en livres ; les 14 sections de Progrès ouvertes à
  390 et 320 px (8 graphiques, aucun aplati, hors écran ou « NaN ») ; saisie de mensurations.
- 701 tests.

Reste : relecture humaine des 325 consignes rédigées ; 323 fiches sans consignes ; coach avec
IA en ligne non testé (clé nécessaire) ; widgets Android ; essai sur téléphone réel.
