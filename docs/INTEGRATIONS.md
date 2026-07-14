# Intégrations de données externes

Couche d'adaptateurs : `src/integrations/`. Principe commun — **en ligne :
j'enrichis ; hors ligne : je dégrade proprement** et je garde ce qui a déjà été
récupéré dans le cache local. L'app reste utilisable sans connexion.

## 1. ExerciseDB — GIF de démonstration ✅ (implémenté)

- Fichier : `src/integrations/exercisedb.js`
- Source gratuite **sans clé** : `oss.exercisedb.dev` (attribution requise).
  Repli **RapidAPI** si une clé est renseignée dans les réglages.
- Mappe chaque exercice (`id` → terme anglais) vers un GIF. URL résolue mise en
  cache local (`mediaCache`) pour éviter de refetcher.
- Hors ligne / service indisponible → message + lien de secours YouTube.
- Testé hors ligne (fetch injecté) : `tests/exercisedb.test.js`.

## 2. wger — base d'exercices & muscles ⏳ (Phase 2)

- API publique `https://wger.de/api/v2/` (lecture sans authentification).
  Contenu sous licence **CC-BY-SA** (attribution).
- Objectif : un **importeur** (`src/integrations/wger-import.js`) qui convertit
  les exercices wger vers **notre schéma** (muscles, équipements, patrons) pour
  passer de ~33 à **150+ exercices**, avec validation et déduplication.
- Les exercices importés gardent un champ `source: "wger"` + attribution.
- L'import se fait hors app (script) ou dans l'écran admin (plus tard) : la base
  reste **statique et embarquée** pour rester rapide et hors ligne.

## 3. Open Food Facts — nutrition ⏳ (Phase 2)

- API libre **sans clé** : recherche `search.pl` + produit par code-barres
  `api/v2/product/{code}.json`. Licence **ODbL** (attribution).
- Adaptateur `src/integrations/openfoodfacts.js` : recherche, code-barres,
  parsing des macros pour 100 g. Repli sur une petite base locale hors ligne.
- Alimente un futur écran **Nutrition** (journal, objectifs caloriques).

## 4. Health Connect / HealthKit — données de santé ⚠️ (Phase 3, natif)

- **Impossible depuis une PWA / page web** : il n'existe pas d'API navigateur
  pour HealthKit (iOS) ni Health Connect (Android). Aucune simulation ne sera
  faite (interdiction de « prétendre » une fonctionnalité).
- Voies réelles :
  1. **Capacitor** — emballer la même PWA en app native et utiliser un plugin
     santé (`@perfood/capacitor-healthkit`, `capacitor-health-connect`). Consentement
     explicite et granulaire, import/export poids, entraînements, calories.
  2. **Import/export manuel** (fichier) en attendant l'emballage natif.
- En attendant, le suivi du poids et des mensurations reste **saisi dans l'app**
  et exportable.

## Attributions (à afficher dans l'app)

- Exercices & démonstrations : ExerciseDB, wger (CC-BY-SA)
- Données nutritionnelles : Open Food Facts (ODbL)
