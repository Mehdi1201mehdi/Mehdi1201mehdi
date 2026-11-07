# Matrice FitAI 2.0.6 ↔ Coach Perso

Statut = état de **Coach Perso** au regard de la fonction observée dans FitAI.
**COMPLET** · **INCOMPLET** · **ABSENT** · **NON VÉRIFIABLE** (impossible à
établir côté FitAI depuis l'environnement d'analyse).

Sources FitAI : analyse statique du XAPK (`ANALYSE_FITAI_APK_2.0.6.md`,
`CRAFT_ANYTHING.md`). Aucun écran FitAI n'a été vu. Colonne « Avant » : branche
`fitai-premium` au commit `39d45c2` ; colonne « Après » : commit en tête de
`fitai-premium` (nov. 2026). Rien de ceci n'est publié sur `main`.

## Bibliothèque d'exercices

| Fonction | FitAI (observé) | Coach Perso maintenant | Validation | Avant | Après |
|---|---|---|---|---|---|
| Taille de la base | base chiffrée, effectif inconnu ; 160 vidéos | **1 126 exercices distincts** : 93 maison + 240 wger (CC-BY-SA) + 793 free-exercise-db (domaine public) ; 52 doublons masqués | tests : identifiants uniques, aucun nom répété même à un article près | INCOMPLET | INCOMPLET (volontairement : pas de 3 000 gonflés) |
| Muscles cibles / secondaires | `isTarget` | principaux, secondaires, stabilisateurs | tests catalogue | COMPLET | COMPLET |
| % de contribution musculaire | `musclePercentage` | coefficients explicites pour une partie, dérivés pour le reste ; provenance non affichée | — | INCOMPLET | INCOMPLET |
| Équipement principal / secondaire | `equipment`, `secondaryEquipment` | `equipement[]`, `equipementsAlternatifs` | — | COMPLET | COMPLET |
| Variantes plus facile / plus difficile | liens explicites | **calculées** : même patron, même muscle principal, difficulté inférieure / supérieure, version uni- ou bilatérale ; bloc « Variantes du mouvement » sur la fiche | tests `replacement` | ABSENT | COMPLET |
| Même mouvement, autre matériel | `sameMoveOtherEquipmentIds` | moteur de remplacement pondéré sur tout le catalogue | tests `replacement` | INCOMPLET | COMPLET |
| Latéralité | `laterality` (texte) | booléen `unilateral` | — | INCOMPLET | INCOMPLET |
| Isométrique | `isometricHold` | mode « temps » : saisie de la durée de maintien, records de maintien, lest | test séance planche | INCOMPLET | COMPLET |
| Domicile + substitut | `householdOk`, `householdSubstitute` | via matériel seulement | — | ABSENT | ABSENT |
| Sécurité / précautions | `cautionFlags` | `securite`, `contreIndications` | — | COMPLET | COMPLET |
| MET par exercice | `metValue`, `metSpeedValue` | MET par **type** d'activité et vitesse (Compendium 2024, codes cités), pas par exercice | tests `calories` | ABSENT | INCOMPLET |
| Nom FR / EN | ~45 langues | nom français pour 1 066 fiches sur 1 126 ; nom anglais d'origine cherchable | test ≥ 90 % de noms français | INCOMPLET | INCOMPLET (60 noms anglais) |
| Vidéo / animation | 160 MP4 embarqués | GIF Gym Visual par URL (permission documentée) ; aucune copie FitAI | — | INCOMPLET | INCOMPLET |
| Filtres | muscle, matériel, favoris | muscle, matériel, niveau, type, favoris, récents | tests filtres | INCOMPLET | INCOMPLET (pas de filtre « domicile ») |

## Mesure des exercices

| Fonction | FitAI | Coach Perso maintenant | Validation | Avant | Après |
|---|---|---|---|---|---|
| Indicateurs par exercice | poids, reps, distance, durée | charge + reps, **ou** distance + durée (vitesse et allure calculées), **ou** durée de maintien ; lest au poids du corps | tests `mesures`, smoke séance cardio + gainage | INCOMPLET | COMPLET |
| Pas | `RepType.STEPS` | aucun | — | ABSENT | ABSENT |

## Calculs

| Fonction | FitAI | Coach Perso maintenant | Validation | Avant | Après |
|---|---|---|---|---|---|
| 1RM estimé | Epley, sans plafond | Epley limité à 1–12 reps pour les records ; 7 formules au calculateur | tests `records`, `force` | COMPLET | COMPLET |
| % du 1RM, charges recommandées | non trouvé | calculateurs + table | tests `force` | COMPLET | COMPLET |
| Records charge et 1RM | e1RM SQL | détectés en fin de séance | tests `records` | COMPLET | COMPLET |
| Records reps, volume, distance, durée, vitesse | données par série | records par type, jamais mélangés, seulement s'il existe une référence | tests `mesures` | ABSENT | COMPLET |
| Volume série → mois | Σ kg × reps | tonnage, volume et intensité distingués ; vue semaine / mois ; comparaison au même stade | tests `analyse` | INCOMPLET | COMPLET |
| RPE 0–10 par série | oui | RPE saisi (RIR conservé), RPE déduit du RIR, moyenne par séance et par exercice | tests `liveSession`, `analyse` | INCOMPLET | COMPLET |
| RIR | absent | présent, pilote la fatigue | — | COMPLET | COMPLET |
| Calories | MET par exercice / type | MET par type et vitesse, série par série, musculation au temps restant ; libellé « estimation » | tests `calories` | INCOMPLET | COMPLET |
| Formules documentées | — | `docs/FORMULES.md` | — | INCOMPLET | COMPLET |

## Mesures corporelles

| Fonction | FitAI | Coach Perso maintenant | Validation | Avant | Après |
|---|---|---|---|---|---|
| Mesures | 16 | les 16 mêmes (dont gauche / droite) + anciennes mesures conservées | tests `corps` | INCOMPLET | COMPLET |
| Comparaison de dates | non vérifiable | comparaison A ↔ B, valeurs anciennes signalées, asymétries > 5 % | tests `corps`, smoke 320 px | INCOMPLET | COMPLET |
| Unités | kg / lb | kg / lb et cm / in | tests `unites` | INCOMPLET | COMPLET |
| Export | — | JSON + CSV 18 colonnes | tests `export` | COMPLET | COMPLET |

## Entraînement et programmes

| Fonction | FitAI | Coach Perso maintenant | Validation | Avant | Après |
|---|---|---|---|---|---|
| Programme → jours → routine, repos explicites | `UserPlanRoutineEntity` | programme généré + routines perso | — | INCOMPLET | INCOMPLET |
| Prévu ≠ effectué | tables séparées | programme / routines ≠ historique | — | COMPLET | COMPLET |
| Supersets | `superSetId` | jusqu'à 4 groupes | tests `liveSession` | COMPLET | COMPLET |
| Repos par exercice | `restTime` | par série | — | COMPLET | COMPLET |
| Notes par exercice et par séance | `note` | note par exercice (rappelée « la dernière fois ») et note de fin de séance | smoke séance | ABSENT | COMPLET |
| Échauffement, drop set, rest-pause, tempo | — | oui ; échauffement exclu des stats | tests `liveSession`, `records` | COMPLET | COMPLET |
| AMRAP, EMOM | non trouvés | série AMRAP ; EMOM / Tabata par minuteur d'intervalles (pas un type de série) | tests `intervalles` | ABSENT | COMPLET |
| Chrono, notifications, records, sauvegarde auto, reprise, résumé | service de premier plan | oui (APK : notification native) | tests | COMPLET | COMPLET |

## Remplacement, récupération, coach

| Fonction | FitAI | Coach Perso maintenant | Validation | Avant | Après |
|---|---|---|---|---|---|
| Remplacement | LLM serveur + liens | moteur local pondéré (muscles × coefficients, patron, matériel, difficulté), prudence en cas de limitation | tests `replacement` | INCOMPLET | COMPLET |
| Carte musculaire, fatigue | seuils serveur | carte de fraîcheur, demi-vies 18–40 h | tests `fatigue` | COMPLET | COMPLET |
| Temps restant avant récupération | courbe 0–132 h | « prêt dans … h » par muscle | tests `fatigue` | ABSENT | COMPLET |
| Seuils personnalisables | config serveur | 60 / 75 / 90 % | tests `fatigue` | ABSENT | COMPLET |
| Coach IA conversationnel, routine validée | sessions GPT | oui (clé ou relais, désactivé par défaut) | tests `coachCloud`, `coachRelais` | COMPLET | COMPLET |
| Coach : modifier une routine, stagnations, effort, mesures | non vérifiable | contexte enrichi ; modification proposée en **nouvelle version** avec différences, appliquée seulement après validation | tests `coachRoutine` (fournisseur simulé) | INCOMPLET | COMPLET |

## Dictionnaire, Android

| Fonction | FitAI | Coach Perso maintenant | Validation | Avant | Après |
|---|---|---|---|---|---|
| Dictionnaire | site | 164 termes, 11 catégories dont biomécanique et cardio | tests dictionnaire | INCOMPLET | COMPLET |
| APK Android | — | compilé par GitHub Actions, signature de test stable, permissions vérifiées dans l'APK ; **pas testé sur un téléphone** | installation réelle à faire | INCOMPLET | INCOMPLET |
| Health Connect | lecture poids, taille, graisse, exercices, distance, calories | **lecture seule** de ces 6 types, import d'une mesure seulement sur geste explicite ; aucune écriture (le plugin ne sait pas écrire une séance) ; testé sur maquette du plugin, **pas sur un téléphone** | tests `santeConnect`, garde-fou CI sur les permissions de l'APK | ABSENT | INCOMPLET |

## Non vérifiable côté FitAI

Écrans, animations, parcours ; valeurs par défaut des seuils du coach
(configuration serveur) ; contenu de la base d'exercices (chiffrée) ; logique du
coach IA côté serveur ; site fitaiapp.com depuis cet environnement.
