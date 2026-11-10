# Rapport de validation du catalogue d'exercices

Généré le 2026-11-10 par `scripts/rapport-catalogue.mjs` à partir des données réellement chargées par l'application (catalogue maison + extensions + corrections).

## Synthèse

| Statut | Fiches | Définition |
| --- | ---: | --- |
| Validé | 1 227 | Nom français, nom d'origine, muscle principal, matériel, mouvement, niveau, consignes en français (≥ 2 étapes), source, aucune incohérence |
| À vérifier | 407 | Complète, mais une règle de cohérence échoue ou le nom français n'a pas pu être établi |
| Incomplet | 323 | Il manque une information obligatoire (presque toujours les consignes d'exécution) |
| Rejeté | 0 | Inutilisable ou doublon masqué |
| **Total distinct** | **1 957** | Exercices affichés dans la bibliothèque, sans doublon |

**1 227 exercices validés.** L'objectif de 3 000 n'est pas atteint : les sources de données dont la licence autorise la réutilisation ne contiennent pas davantage d'exercices distincts (voir ASSET_SOURCES.md). Aucun exercice n'a été créé artificiellement.

## Par source

| Source | Licence | Validé | À vérifier | Incomplet | Total |
| --- | --- | ---: | ---: | ---: | ---: |
| Coach Perso | Projet | 93 | 0 | 0 | 93 |
| wger | CC-BY-SA 4.0 | 24 | 121 | 95 | 240 |
| free-exercise-db | Unlicense (domaine public) | 359 | 206 | 228 | 793 |
| exercises-dataset | MIT (données) | 751 | 80 | 0 | 831 |

Écartés à l'import (non comptés) : doublons internes, doublons du catalogue, exercices de cou — détail en tête de chaque fichier généré (`src/data/exercises-fedb.js`, `src/data/exercises-edb.js`). 52 fiches identiques à une autre sont masquées (`DOUBLONS_MASQUES`) mais restent lisibles pour l'historique.

## Ce qui manque

| Champ | Fiches concernées |
| --- | ---: |
| consignes d'exécution | 323 |
| nom français | 109 |

| Incohérence détectée | Fiches |
| --- | ---: |
| Consignes rédigées par l'app, à vérifier | 325 |
| Muscle principal … inattendu pour ce mouvement | 31 |
| Matériel déclaré différent de celui du nom | 5 |

## Par groupe musculaire (muscle principal)

| Muscle | Validé | Total |
| --- | ---: | ---: |
| Épaules | 133 | 240 |
| Abdominaux | 159 | 240 |
| Dorsaux | 153 | 220 |
| Pectoraux | 152 | 207 |
| Quadriceps | 68 | 195 |
| Triceps | 136 | 178 |
| Biceps | 139 | 174 |
| Fessiers | 89 | 130 |
| Ischio-jambiers | 38 | 109 |
| Mollets | 56 | 75 |
| Avant-bras | 38 | 56 |
| Lombaires | 17 | 37 |
| Corps entier | 21 | 32 |
| Trapèzes | 15 | 28 |
| Adducteurs | 6 | 22 |
| Abducteurs | 7 | 14 |

16 groupes musculaires de catalogue ; le moteur de récupération en distingue 18 (épaules avant / côté / arrière, grand dorsal / haut du dos, obliques…).

## Par type de mouvement

| Mouvement | Validé | Total |
| --- | ---: | ---: |
| Polyarticulaire | 518 | 909 |
| Isolation musculaire | 472 | 626 |
| Gainage | 164 | 251 |
| Flexion | 188 | 245 |
| Extension | 190 | 242 |
| Poussée horizontale | 150 | 215 |
| Squat | 78 | 200 |
| Tirage horizontal | 100 | 153 |
| Étirement | 59 | 131 |
| Charnière de hanche | 59 | 121 |
| Cardio | 44 | 114 |
| Poussée verticale | 51 | 81 |
| Rotation | 47 | 75 |
| Tirage vertical | 56 | 70 |
| Fente | 31 | 43 |
| Mobilité | 8 | 37 |

Un exercice peut appartenir à plusieurs familles (un squat est à la fois « squat » et « polyarticulaire »).

## Par machine et équipement

| Groupe | Machine / équipement | Validé | Total |
| --- | --- | ---: | ---: |
| Bancs | Banc de musculation plat | 51 | 77 |
| Bancs | Banc incliné | 38 | 49 |
| Bancs | Banc décliné | 23 | 26 |
| Bancs | Banc réglable | 61 | 78 |
| Bancs | Banc à lombaires (chaise romaine) | 5 | 7 |
| Bancs | Pupitre à biceps | 28 | 29 |
| Haltères | Haltères | 268 | 342 |
| Haltères | Kettlebells | 39 | 64 |
| Barres | Barre olympique | 99 | 199 |
| Barres | Barre droite courte | 43 | 54 |
| Barres | Barre EZ | 25 | 32 |
| Barres | Trap bar (barre hexagonale) | 1 | 2 |
| Barres | Landmine | 2 | 6 |
| Barres | Rack à squat (cage) | 34 | 57 |
| Machines | Presse à jambes | 14 | 18 |
| Machines | Hack squat | 7 | 10 |
| Machines | Leg extension | 1 | 2 |
| Machines | Leg curl assis | 1 | 3 |
| Machines | Leg curl couché | 4 | 6 |
| Machines | Machine abducteurs | 2 | 4 |
| Machines | Machine adducteurs | 2 | 4 |
| Machines | Machine à mollets | 19 | 23 |
| Machines | Chest press (développé pectoraux) | 6 | 9 |
| Machines | Pec deck / Butterfly | 5 | 8 |
| Machines | Machine épaules | 5 | 5 |
| Machines | Machine rowing (tirage horizontal guidé) | 13 | 16 |
| Machines | Machine biceps (curl pupitre guidé) | 4 | 5 |
| Machines | Machine triceps | 7 | 9 |
| Machines | Machine à abdominaux | 5 | 6 |
| Machines | Machine pull-over | 1 | 1 |
| Machines | Machine tractions / dips assistés | 9 | 9 |
| Machines | Machines guidées (à plaques) | 46 | 80 |
| Machines | Machines à disques (charges libres) | 66 | 68 |
| Poulies | Tirage vertical (lat pulldown) | 23 | 28 |
| Poulies | Tirage horizontal (poulie basse assise) | 11 | 13 |
| Poulies | Poulie (haute ou basse) | 153 | 219 |
| Poulies | Poulie vis-à-vis (double poulie) | 7 | 12 |
| Smith machine | Smith machine (barre guidée) | 47 | 54 |
| Poids du corps | Poids du corps | 281 | 552 |
| Poids du corps | Sans matériel | 196 | 431 |
| Poids du corps | Barre de traction | 39 | 60 |
| Poids du corps | Barres parallèles / station de dips | 17 | 28 |
| Cardio | Tapis de course | 7 | 20 |
| Cardio | Vélo elliptique | 2 | 2 |
| Cardio | Vélo d'appartement | 2 | 5 |
| Cardio | Rameur | 1 | 1 |
| Cardio | Stepper / simulateur d'escalier | 1 | 2 |
| Cardio | Ski-erg et ergomètre à bras | 2 | 2 |
| Accessoires | Élastiques | 62 | 93 |
| Accessoires | TRX / sangles de suspension | 6 | 12 |
| Accessoires | Médecine-ball | 14 | 21 |
| Accessoires | Swiss ball | 72 | 84 |
| Accessoires | Box de saut | 5 | 19 |
| Accessoires | Mur | 9 | 14 |
| Accessoires | Bosu | 4 | 4 |
| Accessoires | Rouleau de massage | 6 | 17 |
| Accessoires | Traîneau / prowler | 0 | 10 |
| Accessoires | Roue abdominale | 6 | 9 |
| Accessoires | Cordes (battle rope, grimper, corde à sauter) | 3 | 3 |
| Accessoires | Autres équipements spécialisés | 44 | 119 |

60 machines et équipements référencés. Un exercice peut être compatible avec plusieurs (un développé couché haltères : banc plat + haltères).

## Matériel déclaré

| Matériel | Total |
| --- | ---: |
| Poids du corps | 557 |
| Haltères | 342 |
| Barre | 260 |
| Poulie | 218 |
| Autre matériel | 119 |
| Élastiques | 93 |
| Ballon de stabilité | 84 |
| Machine guidée | 80 |
| Machine à leviers | 68 |
| Kettlebell | 64 |
| Smith machine | 54 |
| Banc | 31 |
| Barre EZ | 29 |
| Médecine-ball | 21 |
| Rouleau de massage | 17 |
| Barre de traction | 10 |
| Rack | 2 |
| Rameur | 1 |
| Vélo | 1 |

## Méthode

- **Doublons** : clé anglaise normalisée (mots triés, pluriels ramenés au singulier), clé française sans articles, équivalences vérifiées à la main ; test automatique : aucun nom affiché deux fois, même à un article près.
- **Fusion** : quand un exercice existe déjà, ses consignes françaises enrichissent la fiche existante au lieu de créer un doublon.
- **Cohérence** : règles lisibles nom ↔ muscle principal ↔ matériel (`src/engine/validationExo.js`). Les erreurs relevées dans les sources ont été corrigées une par une (`src/data/corrections-catalogue.js`), les autres restent « à vérifier ».
- **Niveau** : absent de exercises-dataset ; estimé par règles (matériel, unilatéral, mouvements techniques) et signalé « estimé » sur la fiche.
- **Repères généraux** (respiration, erreurs fréquentes, sécurité) : rédigés par famille de mouvement et affichés comme tels, jamais présentés comme propres à un exercice.
