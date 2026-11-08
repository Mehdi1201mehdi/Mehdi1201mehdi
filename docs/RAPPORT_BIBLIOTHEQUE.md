# Bibliothèque d'exercices — rapport de livraison (branche `feature/exercise-library`)

Branche tirée de `fitai-premium`. `main` et le site en ligne ne sont pas touchés.

## 1. Fonctionnalités ajoutées

| Domaine | Ce qui fonctionne (testé) |
|---|---|
| Catalogue | 1 957 exercices distincts (était 1 126), statut de validation calculé sur chaque fiche |
| Recherche | Instantanée, accents ignorés, mots anglais et synonymes (« bench », « abdos », « pecs »), muscles et matériel cherchables |
| Filtres combinables | Muscle principal, muscle secondaire, famille d'équipement (bancs, haltères, barres, machines, poulies, Smith, poids du corps, cardio, accessoires), machine précise, matériel, mouvement (16 familles), polyarticulaire / isolation, niveau, type, sans matériel, mes exercices, fiabilité de la fiche ; pastilles retirables et bouton « Réinitialiser » |
| Tris | Pertinence, A → Z, par muscle, **les plus utilisés** (compté sur tes séances) |
| Navigation visuelle | « Par muscle » (silhouette cliquable + liste avec effectifs), « Par équipement » (9 familles → machines), « Par machine » (57 entrées, recherche FR/EN) |
| Pages machine | Description, muscles visés, réglages (siège, dossier, pieds, mains, amplitude, départ, trajectoire, fin, sécurité), variantes, exercices réalisables filtrables par muscle |
| Fiches | Nom français + nom d'origine, statut (Validé / À vérifier / Incomplet) et liste de ce qui reste à compléter, niveau (« estimé » quand il l'est), familles de mouvement, type de charge, latéralité, source et licence, machine et réglages, repères généraux du mouvement (présentés comme tels), variantes, alternatives avec la raison |
| Ajouter à ma séance | Depuis chaque fiche : séance en cours, séance existante, nouvelle séance ou nouvelle routine ; séries, répétitions, charge, temps, distance, repos, tempo, RPE, RIR, % du 1RM (converti en charge si un 1RM existe) ; ordre, suppression et supersets dans l'éditeur de routine existant |
| Exercices personnels | Créer, modifier, supprimer ; nom, nom anglais, muscles, matériel, machine, difficulté, type, mouvement, latéralité, description, consignes, conseils, erreurs, image (réduite, stockée sur l'appareil), lien vidéo, variantes, remplacements ; privés (données locales), persistants, présents dans les sauvegardes ; un exercice supprimé mais déjà utilisé reste lisible dans l'historique |
| Favoris, récents | Existants, persistants (testés après actualisation) |

## 2. Nombre réel d'exercices

**1 957 distincts, dont 1 227 validés**, 82 à vérifier, 648 incomplets (sans consignes réutilisables). Détail par source, muscle, mouvement, machine et matériel : `RAPPORT_CATALOGUE.md`.

## 3. Machines référencées

**57** machines et équipements (`src/data/machines.js`), chacun avec nom français et anglais, type, muscles, description ; les machines ont leurs réglages. Chaque exercice est rattaché à au moins un équipement (test).

## 4. Groupes musculaires

**16** groupes au catalogue (filtres, silhouette) ; le moteur de récupération en suit **18** (épaules avant / côté / arrière, grand dorsal / haut du dos, obliques…).

## 5. Sources et licences

wger (CC-BY-SA 4.0), free-exercise-db (Unlicense), exercises-dataset (données MIT ; médias Gym visual **exclus**), rédaction Coach Perso. Écartés : RepDB (redistribution interdite), jeux issus de sites commerciaux. Voir `ASSET_SOURCES.md`.

## 6. Fonctionnalités encore incomplètes

- **3 000 exercices validés : non atteint** (1 227) faute de sources légales supplémentaires ; 648 fiches attendent des consignes en français.
- Références Fit'Distance et FitAI : **non inspectées** (sites hors liste autorisée de l'environnement).
- « Catégories personnelles » (listes nommées au-delà des favoris) : non faites.
- Démonstrations : pas de nouvelle vidéo ; les nouvelles fiches affichent le schéma anatomique. Les animations existantes (Gym visual) relèvent d'une permission donnée à l'auteur du jeu de données, pas à Coach Perso : **décision à prendre**.
- Pourcentages d'implication musculaire : pas de donnée fiable dans les sources ; non affichés.
- 60 noms d'exercices restent en anglais (traduction non sûre).

## 7. Résultats des tests

- `node --test` : **678 / 678** (dont 15 nouveaux sur le catalogue, la validation, les machines, les filtres, les exercices perso, le tri et l'ajout en séance).
- `tsc --noEmit` : 0 erreur.
- Parcours Playwright (Chrome, 390 px puis 320 et 412 px) : **28 / 28** vérifications, couvrant les 20 tests demandés — recherche par nom, avec/sans accents, filtres muscle / machine / équipement, cumul, fiche, muscles principaux/secondaires, illustration, favoris et leur persistance, création / modification / suppression d'un exercice perso, ajout à une séance, modification des séries et répétitions, alternatives de remplacement, sauvegarde après actualisation, smartphone, aucune erreur JavaScript, aucun débordement.

## 8. Problèmes rencontrés

- Sites de référence inaccessibles (proxy et liste autorisée) : travail fait sans les observer.
- Erreurs de classement dans les sources (muscles, matériel) : 26 corrigées une par une, le reste signalé « à vérifier ».
- Doublons entre sources : fusionnés (446) plutôt qu'empilés ; quasi-doublons revus à la main.

## 9. Fichiers modifiés

Nouveaux : `scripts/importer-exercises-dataset.mjs`, `scripts/lib/noms-fr.mjs`, `scripts/rapport-catalogue.mjs`, `src/data/exercises-edb.js` (généré), `src/data/machines.js`, `src/data/corrections-catalogue.js`, `src/engine/validationExo.js`, `src/engine/taxonomie.js`, `tests/catalogueValidation.test.js`, `docs/RAPPORT_CATALOGUE.md`, ce rapport.
Modifiés : `src/data/exercises.js` (chargement, recherche, exercices perso), `src/data/exercises-fedb.js` (régénéré), `scripts/importer-free-exercise-db.mjs`, `src/engine/bibliotheque.js` (tri), `src/engine/routines.js` (paramètres de série), `src/ui/app.js` (bibliothèque, fiches, machines, ajout, éditeur), `style.css`, `sw.js` (cache v158), `docs/ASSET_SOURCES.md`.

## 10. Mettre à jour l'application

1. Relire et tester localement : `python3 -m http.server` à la racine, puis ouvrir `http://localhost:8000`.
2. Avec ton accord : pousser `feature/exercise-library`, ou l'intégrer à `fitai-premium` pour que GitHub Actions produise un APK de test.
3. Après validation sur téléphone seulement : fusion vers `main` (mise en ligne GitHub Pages). Le cache du service worker (v158) force la mise à jour chez les utilisateurs.
4. Régénérer le catalogue si une source évolue : `node scripts/importer-free-exercise-db.mjs …`, puis `node scripts/importer-exercises-dataset.mjs …`, puis `node scripts/rapport-catalogue.mjs`.
