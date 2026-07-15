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

## 2. wger — base d'exercices & muscles ✅ (outillé — reste à lancer en CI)

- API publique `https://wger.de/api/v2/` (lecture sans authentification).
  Contenu sous licence **CC-BY-SA** (attribution).
- **Importeur** `src/integrations/wger-import.mjs` : convertit les exercices
  wger vers **notre schéma** (muscles, équipements, patron biomécanique inféré),
  avec déduplication et validation. Fonctions de mapping **testées hors ligne**
  (`tests/wger-import.test.js`). Écrit `src/data/exercises-extra.js`.
- ⚠️ L'environnement de dev **bloque wger.de** (proxy egress → 403). L'import
  s'exécute donc via **GitHub Actions** (`.github/workflows/import-wger.yml`,
  déclenchement manuel), où le réseau est ouvert ; le workflow committe la base
  générée. Résultat : passage de ~37 à **150+ exercices** sans réécrire le code.
- Les exercices importés portent `source: "wger"`, alimentent le **CATALOGUE**
  (écran Exos : recherche + filtres muscle/matériel) et le remplacement manuel.
  Le **générateur automatique** garde son cœur curé de qualité contrôlée.

## 3. Open Food Facts — nutrition ✅ (implémenté)

- API libre **sans clé** : recherche `search.pl` + produit par code-barres
  `api/v2/product/{code}.json`. Licence **ODbL** (attribution).
- Adaptateur `src/integrations/openfoodfacts.js` : recherche, code-barres,
  parsing des macros /100 g. `fetch` injectable, **testé hors ligne**.
- Base alimentaire **locale** (`src/data/foods.js`) : recherche instantanée et
  repli hors ligne.
- Moteur `src/engine/nutrition.js` : besoins caloriques (Mifflin-St Jeor +
  facteur d'activité + ajustement objectif), protéines/lipides/glucides, eau.
  Testé.
- Écran **Nutrition** : objectifs du jour, journal (recherche locale + OFF,
  code-barres, ajout par portion), totaux, avertissement santé.

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

## Sources officielles (référence)

- ExerciseDB (gratuit) — https://www.exercisedb.dev/ · docs https://www.exercisedb.dev/docs
- wger (open source) — https://wger.de/api/v2/ · docs https://wger.readthedocs.io/en/stable/
- Open Food Facts — https://world.openfoodfacts.org/data · docs https://openfoodfacts.github.io/openfoodfacts-server/api/
- Health Connect (Android, natif) — https://developer.android.com/health-and-fitness/health-connect
- Apple HealthKit (iOS, natif) — https://developer.apple.com/documentation/healthkit

### Non retenus pour l'instant (app perso, locale — hors périmètre actuel)
- Firebase Cloud Messaging (notifications push) : nécessite un projet Firebase + serveur ;
  pour une app perso, on privilégiera les notifications locales (PWA) ou l'approche Capacitor.
- Firebase Authentication / Analytics / Crashlytics : utiles seulement en multi-utilisateurs
  ou app native publiée. Volontairement écartés (pas de compte, pas de collecte).

## Attributions (à afficher dans l'app)

- Exercices & démonstrations : ExerciseDB, wger (CC-BY-SA)
- Données nutritionnelles : Open Food Facts (ODbL)
