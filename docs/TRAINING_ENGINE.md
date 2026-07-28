# Moteur d'entraînement — fonctionnement

Le moteur répond à deux questions, dans cet ordre, et **agit** :
1. « Quels muscles entraîner maintenant ? »
2. « Quels exercices conviennent à ces muscles **et** à mon état actuel ? »

Il ne se contente pas de signaler qu'un muscle est fatigué : il le retire des
candidats, analyse le reste, et construit la séance.

## Avertissement

Les valeurs affichées sont des **indices de programmation** : disponibilité
estimée, séries équivalentes, score de compatibilité. Le moteur ne mesure ni
dommages musculaires, ni glycogène, ni inflammation, ni hormones, ni système
nerveux — rien de tout cela n'est mesurable sans laboratoire. Les coefficients
sont des paramètres de calibration, regroupés dans `PARAMS` (`fatigue.js`) et
`PLAN_PARAMS` (`planner.js`) pour être ajustés.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/data/muscles-moteur.js` | 18 groupes suivis + correspondance avec la taxonomie du catalogue |
| `src/data/exercise-muscle-map.js` | Coefficients musculaires, facteur de fatigue par type de mouvement |
| `src/engine/fatigue.js` | Effort, stress, saturation, combinaison, récupération, état musculaire |
| `src/engine/planner.js` | Priorité, compatibilité, sélection, construction de séance |

## 1. Coefficients musculaires

93 mouvements de référence sont réglés à la main (`COEFFS_EXPLICITES`).
Convention : **1.00 = muscle cible**, en dessous = sollicitation secondaire.

```
Développé couché barre → pectoraux 1.00 · triceps 0.55 · deltoïde ant. 0.45
```

Pour les 250 autres exercices, `deriverCoefficients()` répartit les muscles
grossiers du catalogue vers les 18 groupes fins selon le **patron de mouvement**
(un tirage vertical charge surtout le grand dorsal, un tirage horizontal le haut
du dos). Un test vérifie qu'**aucun** des 343 exercices n'a de muscles
indéfinis — seule la mobilité pure n'a aucun muscle chargé.

## 2. Séries équivalentes

```
stress d'une série = coefficient × effort(RIR) × facteur d'exercice
```

Volontairement **pas** « poids × répétitions » : c'est la proximité de l'échec
et la nature du mouvement qui pilotent le coût de récupération, pas le tonnage.

- **Effort** : interpolé continûment depuis le RIR (1.00 à RIR 0 → 0.35 à RIR 6+).
  Si le RIR n'est pas renseigné, il est estimé à partir des répétitions comparées
  à l'habitude, avec une valeur prudente. Jamais bloquant, jamais présenté comme
  certain.
- **Facteur d'exercice** : isolation machine 0.85 → polyarticulaire libre 1.10 →
  axial corps entier 1.20.

Exemple : 4 séries de développé couché donnent 4 séries équivalentes aux
pectoraux, 2,2 aux triceps, 1,8 au deltoïde antérieur.

## 3. Fatigue et récupération

- **Saturation** : `100 × (1 − exp(−stress / K))`, K ≈ 7. Les premières séries
  comptent beaucoup, les suivantes de moins en moins. On n'additionne jamais des
  pourcentages.
- **Combinaison** : `nouvelle = ancienne + apport × (1 − ancienne/100)`. La
  fatigue existante ne disparaît pas et le total ne dépasse jamais 100.
- **Décroissance** : demi-vie exponentielle, de 18 h (faible sollicitation) à
  40 h (très forte), allongée jusqu'à ×1,35 par les séries menées à l'échec, et
  modulée par la taille du groupe (les petits muscles récupèrent plus vite).

L'état se **recalcule depuis les horodatages** : rouvrir l'application trois
jours plus tard donne la bonne disponibilité sans que rien n'ait été stocké.

**Disponibilité affichée = 100 − fatigue.** Zones : 90+ frais · 75+ prêt ·
60+ prudence · 40+ récupération · en dessous, à laisser récupérer.

## 4. Priorité musculaire

```
priorité = disponibilité × 0.45
         + déficit de volume hebdomadaire × 0.30
         + ancienneté de la dernière sollicitation × 0.15
         + équilibre général × 0.10
```

Plus un **bonus muscle négligé** (au-delà de 7 jours sans travail direct, s'il
est récupéré) et une **pénalité de surutilisation** (objectif hebdomadaire
dépassé). Un muscle sous 40 % de disponibilité voit sa priorité écrasée.

C'est ce qui fait qu'un muscle **frais mais déjà saturé** passe derrière un
muscle un peu moins frais mais en manque de volume.

## 5. Compatibilité d'un exercice

Moyenne des disponibilités **pondérée par les coefficients** : le muscle
principal pèse le plus. Un exercice dont un secondaire important (coefficient
≥ 0,35) est sous 40 % subit une forte pénalité.

Concrètement : avec des pectoraux à 95 % mais des triceps à 20 %, le développé
couché tombe sous 60 et n'est pas retenu. Les tractions, elles, passent à 92.

## 6. Construction de la séance

1. Sélection des groupes principaux (1 à 3 selon la durée demandée), en
   privilégiant les **affinités naturelles** sans jamais les imposer.
2. Pour chaque groupe : exercices triés par compatibilité, ceux sous 55 écartés.
3. **Diversité biomécanique** : une famille de mouvement n'est pas répétée.
4. **Plafond de volume** : on ne rattrape jamais tout l'objectif hebdomadaire
   d'un muscle en une seule séance.
5. **Travail accessoire** si du temps reste, pour ne pas oublier les petits
   groupes (deltoïde latéral, postérieur, mollets, ischios, abdominaux).
6. La durée demandée est **toujours** respectée.

## 7. Repos

Le repos est conseillé si la disponibilité moyenne du corps est basse **et**
qu'il reste moins de deux groupes vraiment disponibles, ou si le plafond de
jours d'entraînement hebdomadaire est atteint (4/5/6 selon le niveau).

Le moteur ne conclut **jamais** au repos parce que le haut du corps est fatigué
alors que les jambes sont fraîches : il propose les jambes. C'est précisément
l'intérêt du système.

## 8. Validation

- **Simulation 30 jours** en boucle fermée (chaque séance proposée est réalisée
  et réinjectée) : 22 séances, 8 jours de repos, tous les groupes entre 20 et 50
  séries équivalentes, aucune répétition deux jours de suite, durée respectée.
- **Simulation de contrôle** : après une séance pectoraux lourde, ni le jour 2
  ni le jour 3 ne les reproposent ; le jour 3 n'utilise pas non plus les muscles
  du jour 2 ; la proposition change selon le temps écoulé. La décision vient des
  données, pas du calendrier.
- **Récupération sans entraînement** : strictement croissante jour après jour.

`node --test tests/planner.test.js tests/planner-simulation.test.js`
