# Analyse de l'APK FitAI 2.0.6 et comparatif avec Coach Perso

> Document de travail pour la mise à niveau de Coach Perso. Il décrit **ce qui a
> été observé** dans l'application de référence, sépare clairement l'observé du
> supposé, et en tire un plan d'implémentation **avec notre propre code et nos
> propres données**.

## 1. Provenance et méthode

| | |
|---|---|
| Fichier fourni | `Workout_Planner_Gym_Log_Fit_AI_2_0_6_APKPure.xapk` (78,2 Mo) |
| SHA-256 du XAPK | `e9e25d15f6993f32839c9f1f223d9bd7d376e5eafca751a4ee6320b42dc30895` |
| Contenu | `homeworkout.fitness.app.apk` (base, `d45b4607…0c`), `config.arm64_v8a.apk`, `config.xxhdpi.apk` |
| Application | FitAI, package `homeworkout.fitness.app`, version 2.0.6 (code 372060100), Android 10+ (min SDK 29, cible 37) |

**Méthode : analyse statique uniquement**, dans un environnement isolé.
Aucune exécution, aucune installation. Outils : `androguard` (manifeste, DEX),
`jadx` (décompilation pour lecture), recherche dans les chaînes du code.

**Limites, à lire avant tout le reste :**

- **Aucun écran n'a été vu.** Aucun environnement Android n'était disponible.
  Ce document ne décrit donc ni le rendu ni les parcours ; il décrit des données
  et des calculs lus dans le code.
- L'application embarque la protection de licence **PairIP**
  (`libpairipcore.so`, `com.pairip.licensecheck`). Elle n'a pas été contournée.
- Les **données d'exercices, de noms traduits et de programmes** sont chiffrées
  ou encodées dans l'APK (entropie ≈ 8 bits/octet). Elles n'ont été **ni
  déchiffrées, ni extraites, ni copiées**. Les valeurs (MET par exercice,
  pourcentages musculaires, variantes…) restent donc inconnues, et ne doivent de
  toute façon pas être reprises.
- Le code est en grande partie obscurci par R8. Les noms de classes cités en
  `defpackage/…` sont ceux du décompilateur, utiles seulement pour retrouver
  l'endroit.

**Règle de propriété intellectuelle appliquée** : on retient des **structures,
des principes et des méthodes** (non protégeables : une formule d'Epley, l'idée
d'un indicateur « distance »). On ne reprend **ni code, ni données, ni vidéos,
ni textes**. Les valeurs de remplacement viennent de sources publiques
(Compendium des activités physiques) ou de notre propre base.

## 2. Architecture observée

- Kotlin, Jetpack Compose, base locale **Room**, tâches de fond **WorkManager**.
- Compte Firebase (connexion Google), notifications push Firebase, abonnements
  Google Play Billing 9.1, publicité/attribution.
- **Health Connect** : lecture/écriture du poids, de la masse grasse, de la
  taille, des séances d'exercice, des distances et des calories totales.
- Service de premier plan `WorkoutRunForegroundService` : la séance continue
  quand l'app passe en arrière-plan.
- Fournisseur de contenu partagé avec l'application sœur de nutrition
  `dietaiplan.calorietracker.app`.
- 160 vidéos MP4 (démonstrations, ~31 Mo), noms d'exercices en ~45 langues.

## 3. Schéma de données (Room) — observé

17 tables métier (hors tables techniques). Colonnes marquées `?` = facultatives.

**Exercices**
- `ExerciseEntity` (35 colonnes) : `exerciseId`, `maleId?`, `femaleId?`, `name`,
  `exerciseType`, `equipment`, `secondaryEquipment?`, `popularityScore`,
  **`isWeight`, `isRep`, `isDistance`, `isDuration`**, `gptScore`,
  `gptExperience`, `isCustom`, `base64Image?`, `userId?`, `hcMapValue`,
  **`metValue`, `metSpeedValue`**, `isDeleted`, `creationTime`, `updateTime`,
  `station?`, `surface?`, `householdOk`, `householdSubstitute?`, `laterality?`,
  `isometricHold`, `loadingStyle?`, `cautionFlags?`, `difficultyFactors?`,
  `easierVariationId?`, `harderVariationId?`, `sameMoveOtherEquipmentIds?`.
- `ExerciseMuscleEntity` : `muscle`, `exerciseId`, `isTarget`,
  `musclePercentage` — clé (muscle, exercice).
- `UserFavExerciseEntity` (favoris), `UserExerciseInfoEntity` (**note
  personnelle par exercice**).

**Programmes, routines, séances**
- `UserPlanEntity` (programme : nom, source, note) →
  `UserPlanRoutineEntity` (`planId`, **`dayIndex`**, `routineId?` — vide = jour
  de repos —, `selectedAsNext?`).
- `UserRoutineEntity` (routine : nom, source, note) →
  `UserRoutineExerciseEntity` (`exerciseIndex`, **`superSetId?`**,
  **`restTime?`** par exercice, **`note?`**) → `UserRoutineSetEntity` (séries
  modèles : `weightKg`, `rep`, `distMeter`, `timeSecond`).
- `UserWorkoutEntity` (séance effectuée : `routineId?`, `finished`,
  `startTimeMs`, `finishTimeMs`, `note?`) → `UserWorkoutExerciseEntity`
  (`superSetId?`, `restTime?`, `note?`) → `UserSetLogEntity` (série :
  `weightKg`, `rep`, `distMeter`, `timeSecond`, **`durationMs`**,
  **`burnCalorie`**, **`rpe?`**, `distanceSource?`).

**Corps** — `UserMeasurementLog` : une ligne par jour (`yyyymmdd`) avec
`weightKg`, `bodyFat`, `chestCm`, `waistCm`, `hipsCm`, cuisses / mollets /
biceps / avant-bras **droite et gauche**, `shouldersCm`, `neckCm`, `wristCm`.

**Autres** : `AchievementEntity` (trophées), `GPTSessionModel` /
`GPTMessageModel` (conversations du coach IA, avec contexte), `HCSyncEntity`
(synchronisation Health Connect), `LogsREntity`.

**Énumérations observées**
- Mesures : `WeightType` {aucun, disponible} ; `RepType` {aucun, disponible,
  **pas**} ; `DistanceType` {aucun, **mètres, km**} ; `DurationType` {aucun,
  **secondes, minutes**}.
- Types d'exercice, avec MET par défaut : **aérobie 9,0 · force 3,8 ·
  étirement 2,5**.
- 31 équipements (poids du corps, haltère, barre, poulie, machine à levier,
  élastique, kettlebell, cadre guidé, barre EZ, sangles, trap bar, landmine,
  tapis de course, rouleau de massage…).
- Muscles « cibles » des filtres : biceps, avant-bras, fessiers, épaules,
  grand dorsal, mollets, ischios, pectoraux, quadriceps, triceps (+ abdos,
  trapèzes et cou cités ailleurs).

## 4. Calculs observés dans le code

### 4.1 1RM estimé — Epley
`1RM = charge × (1 + répétitions / 30)`, trouvé à cinq endroits, dont une
requête SQL (meilleur 1RM par exercice sur une période). Constats :
- appliqué seulement si charge > 0 et répétitions > 0 ;
- **aucun plafond de répétitions** (or Epley se dégrade au-delà de ~10–12) ;
- pour un exercice sans charge, la « meilleure perf » devient le nombre de
  répétitions.

### 4.2 Volume
`Σ charge × répétitions` des séances terminées, par séance et par période.

### 4.3 Calories par série (description, pas de reprise de code)
1. **Durée retenue**, dans cet ordre : le temps saisi ; sinon **7 s par
   répétition** ; sinon la durée mesurée de la série. Plafond selon le type
   (2 h ou 5 h).
2. **Facteur vitesse** pour l'aérobie : vitesse réelle (distance / temps)
   divisée par une vitesse de référence propre à l'exercice (`metSpeedValue`) ;
   1 si l'une des deux manque.
3. **Énergie** ≈ (poids de l'utilisateur + charge soulevée plafonnée à 100 kg)
   × MET × facteur vitesse × heures.
4. MET de l'exercice, ou à défaut celui de son type (9,0 / 3,8 / 2,5).

Le résultat est stocké par série (`burnCalorie`). Ajouter la charge au poids de
corps est un choix propre à FitAI, non standard : la méthode usuelle (ACSM,
Compendium) est MET × poids de corps × durée.

### 4.4 Récupération musculaire
`recoveryWindowHours` n'est **pas** une durée par muscle. C'est un des seuils
de configuration du coach (`AiCoachSurfaces`), à côté de `readyPct`,
`restFatiguePct`, `imbalanceRatio`, `minBalanceSets`, `focusUnderSets`,
`overTimePct`, `verdictEffortCoverage`. Le code :
- repère les muscles dont la fatigue dépasse `restFatiguePct` ;
- estime **le temps restant avant qu'un muscle soit « prêt »** (`readyPct`)
  grâce à une courbe de récupération croissante et saturante sur 0–132 h,
  remise à l'échelle par `recoveryWindowHours`.

Les valeurs par défaut sont envoyées par le serveur (configuration à distance) :
**inconnues**.

### 4.5 Effort
- **RPE** par série, facultatif, **validé de 0 à 10** (ajouté par migration).
- Catégories de verdict `RPE_GRIND` et `RPE_MAXED`, seuil `rpeEasyFloor`.
- **Aucune trace de RIR** dans le code (0 occurrence).

### 4.6 Remplacement d'exercice
Le « remplacement IA » est une **requête au serveur d'IA de FitAI**, qui
renvoie une liste d'identifiants d'exercices (`AIReplaceExerciseOutput`). États
d'écran : demandé, confirmé, refusé, « un autre ». Aucun moteur de score local
n'a été trouvé ; les champs `easierVariationId`, `harderVariationId` et
`sameMoveOtherEquipmentIds` servent de liens directs.

## 5. Comparatif avec Coach Perso (branche `fitai-premium`)

| Section de la mission | FitAI (observé) | Coach Perso aujourd'hui | Écart |
|---|---|---|---|
| 2. Données d'exercices | 35 champs, % musculaire, variantes, latéralité, sécurité, domicile, MET | 343 exercices : muscles principaux / secondaires / stabilisateurs, **coefficients de contribution** par muscle, équipements alternatifs, unilatéral, contre-indications, sécurité, tempo, difficulté | Manquent : variantes plus facile / plus difficile, MET par exercice, isométrique explicite, substitut domicile, style de chargement |
| 3. Mesure par exercice | 4 indicateurs (poids, reps / pas, distance m/km, durée s/min) | Charge + reps, **ou** durée (gainage, cardio) | **Pas de distance ni de vitesse** ; pas de lest pour le poids du corps ; pas de pas |
| 4. Performances | Epley ; volume ; records | Epley (`records.js`) + 7 formules (`force.js`) ; records de charge et de 1RM ; volume par séance, semaine, muscle | Manquent : records de **reps, volume, distance, durée, vitesse**, plafond de fiabilité d'Epley, progression mensuelle |
| 5. RPE | RPE 0–10 par série | **RIR** saisi (mode avancé), affichage RPE possible ; le RIR pilote le moteur de fatigue | RPE natif 0–10, analyse de l'effort moyen, comparaison entre séances |
| 6. Mesures corporelles | 16 mesures, droite / gauche | Poids + 4 tours (taille, poitrine, bras, cuisse) | **11 mesures manquantes**, gauche / droite, masse grasse saisie, comparaison de dates |
| 7. Programmes et séances | Programme → jours → routine ; superset, repos et note par exercice ; note de séance | Programme généré + routines perso ; supersets ; repos par série ; reprise de séance interrompue | **Notes** par exercice et par séance ; programme organisé par jour avec repos explicites |
| 8. Calories | MET par exercice + par type, facteur vitesse, 7 s / rep, par série | MET 5 fixe × poids × durée de séance | MET par exercice et par type, vitesse, estimation par série |
| 9. Récupération | Temps restant avant « prêt », seuils configurables | Modèle de fatigue par muscle (demi-vies 18–40 h, effort selon RIR), carte % fraîcheur | **Heures restantes** avant récupération, seuils **personnalisables** |
| 10. Remplacement | LLM côté serveur + liens de variantes | Moteur **local** déterministe (muscles, matériel, limitations) | Score pondéré par coefficients musculaires, variantes facile / difficile, même mouvement autre matériel |

## 6. Plan de mise à niveau proposé

Ordre choisi pour livrer d'abord ce qui change le plus l'usage réel, sans
casser l'existant. Chaque lot = tests + captures + APK de test.

1. **Mesures par exercice** : métadonnées `mesures` (charge, reps, lest,
   distance, durée, vitesse calculée) ; écran de séance qui s'adapte ; cardio
   sans « séries à charge ». Migration des anciennes séances sans perte.
2. **Records et performances par type** : charge, 1RM (Epley + formule au
   choix, plafond de fiabilité affiché), reps, volume, distance, durée,
   vitesse — jamais mélangés entre types ; progression hebdo / mensuelle.
3. **Mesures corporelles complètes** : 16 mesures, gauche / droite, masse
   grasse, comparaison de deux dates, graphiques, unités cm / in.
4. **RPE natif 0–10** à côté du RIR (conversion documentée), effort moyen par
   séance, comparaison, prise en compte dans les conseils de progression.
5. **Calories par série** : MET du Compendium 2024 par exercice (source
   publique, citée) et par type, facteur vitesse pour le cardio, toujours
   libellé « estimation ».
6. **Notes** par exercice (persistantes) et par séance ; programme par jours.
7. **Récupération** : heures restantes par muscle, seuils réglables.
8. **Remplacement** : score pondéré (coefficients musculaires, matériel,
   difficulté, type, limitations), variantes plus facile / plus difficile
   issues de notre catalogue.
9. **Données d'exercices** : variantes, isométrique, domicile, chargement —
   renseignées seulement quand c'est fiable (sinon vide, jamais inventé).

## 7. Non observé / à confirmer

- Les écrans, animations et parcours (pas d'environnement Android).
- Les valeurs par défaut des seuils du coach (configuration serveur).
- Le contenu de la base d'exercices (chiffrée, volontairement non extraite).
- Le fonctionnement du coach IA côté serveur (prompts, modèle).
