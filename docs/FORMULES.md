# Formules de calcul — Coach Perso

Toutes les formules vivent dans `src/engine/*` (fonctions pures) et sont
couvertes par `node --test tests/*.test.js`. Tout est **stocké en unités SI**
(kg, m, s, cm) ; kg/lb et cm/in ne changent que l'affichage et la saisie.

## 1RM estimé

| Usage | Formule | Fichier |
|---|---|---|
| Records, courbes, intensité relative | **Epley** : `kg × (1 + reps / 30)`, **séries de 1 à 12 reps seulement** (`REPS_MAX_1RM = 12`) ; au-delà, l'estimation n'est pas retenue | `records.js` (`e1rmFiable`) |
| Calculateur (comparaison) | Epley, Brzycki `kg × 36 / (37 − reps)`, Lombardi `kg × reps^0,10`, O'Conner `kg × (1 + 0,025 × reps)`, Wathan `100 kg / (48,8 + 53,8 e^−0,075 reps)`, Lander `100 kg / (101,3 − 2,671 × reps)`, Mayhew `100 kg / (52,2 + 41,9 e^−0,055 reps)` | `force.js` |
| Charge pour un % du 1RM | inverse de Brzycki (la plus stable sur 1–12 reps) | `force.js` |

Les séries d'échauffement (type `echauffement`) sont exclues de tous les
records et statistiques (`estSerieTravail`).

## Charge d'entraînement : trois mots, trois choses

| Terme | Définition | Calcul |
|---|---|---|
| **Tonnage** | ce que d'autres écrans appellent « volume » | `Σ charge × reps` des séries de travail |
| **Volume** | quantité de travail | nombre de séries et de répétitions |
| **Intensité** | lourdeur | `tonnage / reps chargées` (kg par rep) et **% du 1RM** : moyenne de `charge / 1RM de référence`, pondérée par les reps |

Comparaison de périodes **au même stade** (`comparaisonMemeStade`) : du 1er au
7 du mois en cours contre du 1er au 7 du mois précédent, sinon tout début de
mois afficherait « −70 % ». Fichier : `analyse.js`.

## Effort : RPE et RIR

- RPE saisi de 0 à 10 (demi-points acceptés) ; RIR enregistré à côté.
- RPE déduit quand seul le RIR existe : `RPE = 10 − RIR` (échelle RIR de
  Zourdos et al., 2016), borné à [0 ; 10], marqué « déduit ».
- Effort moyen d'une séance ou d'un exercice : moyenne des RPE disponibles.

## Stagnation

Un exercice stagne si son meilleur 1RM estimé (1–12 reps) n'a pas été battu
depuis **au moins 21 jours ET au moins 3 séances** (`plateaux`). Les deux
conditions évitent de crier au plateau après une seule séance moyenne.

## Cardio : vitesse, allure, puissance

| Grandeur | Formule | Fichier |
|---|---|---|
| Vitesse | `(m / 1000) / (s / 3600)` km/h | `mesures.js` |
| Allure | `s / (m / 1000)` s/km | `mesures.js` |
| Puissance rameur | `2,80 / allure³` W, allure en s/m (formule Concept2) | `calories.js` |

## Calories (estimation, toujours affichée comme telle)

`kcal = MET × poids (kg) × durée (h)`, série par série.

| Activité | MET retenu | Source |
|---|---|---|
| Course | selon la vitesse, codes 12028 → 12135 | 2024 Adult Compendium of Physical Activities |
| Marche | selon la vitesse, codes 17152 → 17231 | idem |
| Natation (crawl) | selon m/min, codes 18292, 18290, 18280, 18294 | idem |
| Rameur | selon la puissance, codes 02071 → 02074 | idem |
| Vitesse inconnue | course 7,5 · marche 3,8 · rameur 7,3 · natation 6,0 · elliptique 5,0 · vélo 6,8 | idem |
| Gainage / maintien | 2,8 (code 02024) | idem |
| Musculation | 5 × le temps de séance **non couvert** par le cardio chronométré (séance plafonnée à 3 h) | `activite.js` |

## Récupération

- Fatigue musculaire par muscle, décroissance exponentielle avec une
  demi-vie de 18 à 40 h selon le volume, la proximité de l'échec et la taille
  du muscle (`fatigue.js`, détail dans `TRAINING_ENGINE.md`).
- **Délai avant « prêt »** : `heures = ⌈demi-vie × log2(fatigue / (100 − seuil))⌉`,
  seuil réglable 60 / 75 / 90 % (75 par défaut).

## Mensurations

- 16 mesures (poids, % de masse grasse, poitrine, taille, hanches, épaules,
  cou, poignet, bras/avant-bras/cuisses/mollets gauche et droite).
- Comparaison de deux dates : une valeur n'est comparée que si elle a été
  relevée dans les **7 jours** précédant la date choisie ; sinon elle est
  marquée « ancienne » et aucun écart n'est affiché.
- Asymétrie gauche/droite signalée au-delà de **5 %**.
- Unités : 1 lb = 1 / 2,2046226218 kg ; 1 in = 2,54 cm.
