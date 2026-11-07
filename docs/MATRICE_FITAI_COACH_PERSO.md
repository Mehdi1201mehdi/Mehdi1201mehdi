# Matrice FitAI 2.0.6 ↔ Coach Perso

Statut = état de **Coach Perso** au regard de la fonction observée dans FitAI.
**COMPLET** · **INCOMPLET** · **ABSENT** · **NON VÉRIFIABLE** (impossible à
établir côté FitAI depuis l'environnement d'analyse).

Sources FitAI : analyse statique du XAPK (`ANALYSE_FITAI_APK_2.0.6.md`,
`CRAFT_ANYTHING.md`). Aucun écran FitAI n'a été vu. État Coach Perso : branche
`fitai-premium`, commit `39d45c2`.

## Bibliothèque d'exercices

| Fonction | FitAI (observé) | Coach Perso aujourd'hui | Manque / développement | Test de validation | Statut |
|---|---|---|---|---|---|
| Taille de la base | base chiffrée, effectif inconnu ; 160 vidéos | **343** exercices : 93 rédigés pour l'app + 250 wger (CC-BY-SA) | importer des bases ouvertes **réellement libres**, dédoublonnées, attributions conservées | test d'unicité des identifiants et des mouvements ; comptage par source | INCOMPLET |
| Muscles cibles / secondaires | `isTarget` | principaux, secondaires, stabilisateurs | — | — | COMPLET |
| % de contribution musculaire | `musclePercentage` | coefficients explicites pour une partie, dérivés pour le reste | signaler explicite / dérivé ; n'afficher que l'explicite comme « justifié » | test : chaque coefficient porte sa provenance | INCOMPLET |
| Équipement principal / secondaire | `equipment`, `secondaryEquipment` | `equipement[]`, `equipementsAlternatifs` | — | — | COMPLET |
| Variantes plus facile / plus difficile | `easierVariationId`, `harderVariationId` | aucune | lien vers un exercice **existant** du catalogue, sinon vide | test : tout lien pointe vers un id réel, pas de cycle | ABSENT |
| Même mouvement, autre matériel | `sameMoveOtherEquipmentIds` | partiellement via le moteur de remplacement | champ explicite | idem | INCOMPLET |
| Latéralité | `laterality` (texte) | booléen `unilateral` | bilatéral / unilatéral / alterné | test de valeurs autorisées | INCOMPLET |
| Isométrique | `isometricHold` | implicite (type gainage, durée) | drapeau explicite → saisie en durée de maintien | séance avec planche : champ durée seul | INCOMPLET |
| Domicile + substitut | `householdOk`, `householdSubstitute` | via matériel seulement | drapeau + substitut, filtre « à domicile » | filtre : 0 exercice à machine | ABSENT |
| Sécurité / précautions | `cautionFlags` | `securite`, `contreIndications` | — | — | COMPLET |
| Facteurs de difficulté | `difficultyFactors` | niveau 1–4 | facultatif | — | INCOMPLET |
| MET par exercice | `metValue`, `metSpeedValue` | aucun | MET du Compendium 2024 (source publique, citée) | test : MET présent ⇒ source citée | ABSENT |
| Nom FR / EN | noms en ~45 langues | FR ; `nomsAlternatifs` souvent vides | nom anglais | test : nom EN non vide pour les exercices importés | INCOMPLET |
| Vidéo / animation | 160 MP4 embarqués | GIF Gym Visual par URL (permission documentée) | couverture à mesurer ; pas de copie FitAI | comptage exercices avec média | INCOMPLET |
| Filtres | muscle, matériel, favoris (requêtes SQL observées) | muscle, matériel, niveau, type, favoris, récents | filtre domicile | test de filtre | INCOMPLET |

## Mesure des exercices

| Fonction | FitAI | Coach Perso | Manque | Test | Statut |
|---|---|---|---|---|---|
| Indicateurs par exercice | poids, reps (ou pas), distance (m/km), durée (s/min) | charge + reps **ou** durée | **distance, vitesse**, lest pour poids du corps | séance cardio : distance + durée, vitesse calculée, pas de champ charge | INCOMPLET |
| Pas | `RepType.STEPS` | aucun | facultatif | — | ABSENT |

## Calculs

| Fonction | FitAI | Coach Perso | Manque | Test | Statut |
|---|---|---|---|---|---|
| 1RM estimé | Epley, sans plafond | Epley (`records.js`) + 7 formules dont Brzycki, Lombardi (`force.js`) | plafond de fiabilité affiché (> 12 reps) | valeurs de référence par formule | COMPLET |
| % du 1RM, charges recommandées | — (non trouvé) | calculateurs + table | — | tests `force` existants | COMPLET |
| Records charge et 1RM | e1RM SQL par période | détectés en fin de séance | — | tests `records` existants | COMPLET |
| Records reps, volume, distance, durée, vitesse | données par série (`distMeter`, `timeSecond`) | aucun | records par type, jamais mélangés | séance cardio ⇒ record distance, pas de record de charge | ABSENT |
| Volume série / exercice / séance / muscle / semaine | Σ kg × reps (SQL) | oui | volume **mensuel** ; distinction tonnage / séries / intensité dans les libellés | tests stats | INCOMPLET |
| RPE 0–10 par série | oui (validé 0–10) | RIR saisi (mode avancé), affichage RPE possible | RPE natif, moyenne, comparaison | saisie RPE 8,5 ⇒ RIR 1,5 et moyenne correcte | INCOMPLET |
| RIR | **absent** de FitAI | présent, pilote la fatigue | — | — | COMPLET |
| Calories | MET exercice / type (9,0 · 3,8 · 2,5), facteur vitesse, 7 s / rep, par série | MET 5 fixe × poids × durée de séance | MET par exercice et type, vitesse, par série ; toujours « estimation » | valeurs attendues course / marche / vélo / musculation | INCOMPLET |

## Mesures corporelles

| Fonction | FitAI | Coach Perso | Manque | Test | Statut |
|---|---|---|---|---|---|
| Mesures | 16 (poids, % graisse, poitrine, taille, hanches, cuisses / mollets / biceps / avant-bras G et D, épaules, cou, poignet) | poids + 4 tours | 11 mesures, gauche / droite, % graisse saisi | saisie puis graphique de chaque mesure | INCOMPLET |
| Comparaison de dates | — (non vérifiable) | graphique par période | comparaison A ↔ B | test d'écart | INCOMPLET |
| Unités | kg / lb | kg / lb fait ; **cm / in absent** | cm / in | conversion aller-retour sans dérive | INCOMPLET |
| Export | — | sauvegarde JSON + CSV | inclure les nouvelles mesures | sauvegarde puis restauration | COMPLET |

## Entraînement et programmes

| Fonction | FitAI | Coach Perso | Manque | Test | Statut |
|---|---|---|---|---|---|
| Programme → jours → routine, repos explicites | `UserPlanRoutineEntity(dayIndex, routineId?)` | programme généré + routines perso | organisation par jour avec repos | programme 7 jours dont 3 repos | INCOMPLET |
| Prévu ≠ effectué | tables séparées | programme / routines ≠ logs | — | — | COMPLET |
| Supersets | `superSetId` | jusqu'à 4 groupes | — | test liveSession | COMPLET |
| Repos par exercice | `restTime` | par série | — | — | COMPLET |
| Notes par exercice et par séance | `note` | **aucune** | notes persistantes | note écrite, retrouvée à la séance suivante | ABSENT |
| Échauffement, drop set, rest-pause, tempo | — | oui (mode avancé) | — | tests liveSession | COMPLET |
| AMRAP, EMOM | non trouvés | absents | séries AMRAP / EMOM | séance EMOM 10 min | ABSENT |
| Chrono de repos, notifications, records, sauvegarde auto, reprise, résumé | service de premier plan | oui (APK : notification native) | — | tests repos / liveSession | COMPLET |

## Remplacement, récupération, coach

| Fonction | FitAI | Coach Perso | Manque | Test | Statut |
|---|---|---|---|---|---|
| Remplacement | **LLM côté serveur** + liens de variantes | moteur local déterministe (muscles, matériel, limitations) | pondération par coefficients, variantes, latéralité | alternative ⇒ mêmes muscles, matériel dispo | INCOMPLET |
| Carte musculaire, fatigue | seuils `restFatiguePct`, `readyPct` | carte % fraîcheur, demi-vies 18–40 h | — | tests fatigue | COMPLET |
| Temps restant avant récupération | courbe 0–132 h × `recoveryWindowHours` | absent | heures restantes par muscle | test de la courbe | ABSENT |
| Seuils personnalisables | config serveur | absents | réglage utilisateur | test | ABSENT |
| Coach IA conversationnel, création de routine validée | sessions GPT avec contexte | oui (clé ou relais) | — | test de bout en bout existant | COMPLET |
| Coach : modifier un programme, plateaux, RPE / mesures dans le contexte | non vérifiable (serveur) | partiel | contexte enrichi, modification validée | proposition appliquée après validation | INCOMPLET |

## Dictionnaire, Android

| Fonction | FitAI | Coach Perso | Manque | Test | Statut |
|---|---|---|---|---|---|
| Dictionnaire | site (analyse antérieure) | 146 termes, 9 catégories, recherche, favoris, synonymes EN | biomécanique, cardio | tests dictionnaire | INCOMPLET |
| APK Android | — | compilé (Capacitor), signature stable, vérifié statiquement ; **pas testé sur appareil** | test sur téléphone | installation réelle | INCOMPLET |
| Health Connect | permissions poids, taille, graisse, exercices, distance, calories | absent | plugin Capacitor + permissions minimales | lecture du poids | ABSENT |

## Non vérifiable côté FitAI

Écrans, animations, parcours ; valeurs par défaut des seuils du coach
(configuration serveur) ; contenu de la base d'exercices (chiffrée) ; logique du
coach IA côté serveur ; site fitaiapp.com depuis cet environnement.
