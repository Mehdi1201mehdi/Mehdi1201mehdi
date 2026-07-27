// @ts-check
/**
 * Bibliothèque de PROGRAMMES CLASSIQUES prêts à installer.
 *
 * Ce sont des structures d'entraînement standard du domaine public (full-body
 * débutant, 5×5 de force, half-body, push/pull/legs, poids du corps) : des
 * méthodes enseignées depuis des décennies, qui n'appartiennent à personne.
 * Elles sont ici RÉÉCRITES à partir de notre propre catalogue d'exercices —
 * aucun contenu n'est repris d'un ouvrage ou d'un site tiers.
 *
 * Format volontairement minimal : `ref` = identifiant du catalogue (jamais un
 * exercice inventé), `series`, `reps` = [min,max] (ou `duree` en secondes pour
 * le gainage), `repos` en secondes. La conversion en routine réelle se fait
 * dans l'UI via engine/routines.js, pour ne pas dupliquer le format.
 */

/** Exercice d'un modèle : référence catalogue + volume. */
const x = (ref, series, reps, repos, duree = null) => ({ ref, series, reps, repos, duree });

export const PROGRAMMES = [
  {
    id: "fullbody-debutant",
    nom: "Full-body débutant",
    accroche: "3 séances par semaine, tout le corps à chaque fois",
    objectif: "prise_muscle",
    niveau: "debutant",
    joursParSemaine: 3,
    dureeMin: 50,
    description:
      "La structure la plus efficace quand on démarre : chaque muscle est sollicité 3 fois par semaine, "
      + "sur des mouvements de base. Laisse au moins un jour de repos entre deux séances.",
    progression:
      "Garde la même charge tant que tu ne tiens pas le haut de la fourchette sur toutes les séries. "
      + "Dès que c'est le cas, ajoute le plus petit incrément disponible et repars en bas de fourchette.",
    seances: [
      {
        nom: "Séance A", groupesCibles: ["quadriceps", "pectoraux", "dorsaux"],
        exercices: [
          x("squat-barre", 3, [8, 12], 120),
          x("developpe-couche-halteres", 3, [8, 12], 105),
          x("rowing-barre", 3, [8, 12], 105),
          x("gainage-frontal", 3, null, 60, 40),
        ],
      },
      {
        nom: "Séance B", groupesCibles: ["ischios", "epaules", "dorsaux"],
        exercices: [
          x("souleve-terre-roumain-barre", 3, [8, 10], 120),
          x("developpe-epaules-halteres", 3, [8, 12], 105),
          x("tirage-vertical-poulie", 3, [8, 12], 105),
          x("dead-bug", 3, [10, 12], 60),
        ],
      },
      {
        nom: "Séance C", groupesCibles: ["quadriceps", "pectoraux", "biceps"],
        exercices: [
          x("presse-cuisses", 3, [10, 15], 105),
          x("pompes", 3, [10, 20], 90),
          x("rowing-haltere-unilateral", 3, [10, 12], 90),
          x("curl-halteres", 3, [10, 12], 75),
        ],
      },
    ],
  },
  {
    id: "force-5x5",
    nom: "Force 5×5",
    accroche: "3 séances par semaine, charges lourdes, peu de répétitions",
    objectif: "force",
    niveau: "intermediaire",
    joursParSemaine: 3,
    dureeMin: 55,
    description:
      "Le schéma de force le plus connu : peu d'exercices, mais lourds, en 5 séries de 5 répétitions. "
      + "Repos longs (3 min et plus) pour récupérer entre les séries.",
    progression:
      "Quand les 5 séries de 5 passent proprement, augmente d'un cran à la séance suivante. "
      + "Si tu bloques deux séances de suite, réduis de 10 % et remonte progressivement.",
    seances: [
      {
        nom: "Force A", groupesCibles: ["quadriceps", "pectoraux", "dorsaux"],
        exercices: [
          x("squat-barre", 5, [5, 5], 180),
          x("developpe-couche-barre", 5, [5, 5], 180),
          x("rowing-barre", 5, [5, 5], 150),
        ],
      },
      {
        nom: "Force B", groupesCibles: ["ischios", "epaules", "dorsaux"],
        exercices: [
          x("souleve-terre-roumain-barre", 5, [5, 5], 180),
          x("developpe-epaules-halteres", 5, [5, 5], 150),
          x("tractions", 4, [5, 8], 150),
        ],
      },
      {
        nom: "Force C", groupesCibles: ["quadriceps", "pectoraux", "abdominaux"],
        exercices: [
          x("squat-barre", 5, [5, 5], 180),
          x("developpe-couche-halteres", 5, [5, 5], 150),
          x("gainage-frontal", 3, null, 60, 45),
        ],
      },
    ],
  },
  {
    id: "halfbody-masse",
    nom: "Half-body prise de masse",
    accroche: "4 séances par semaine, haut / bas alterné",
    objectif: "prise_muscle",
    niveau: "intermediaire",
    joursParSemaine: 4,
    dureeMin: 60,
    description:
      "Chaque groupe est travaillé deux fois par semaine, avec assez de volume pour progresser en masse. "
      + "Alterne haut et bas : Haut A, Bas A, repos, Haut B, Bas B.",
    progression:
      "Vise le haut de la fourchette sur chaque série avant d'augmenter. Garde 1 à 2 répétitions "
      + "en réserve, sauf sur la dernière série de chaque exercice.",
    seances: [
      {
        nom: "Haut A", groupesCibles: ["pectoraux", "dorsaux", "biceps"],
        exercices: [
          x("developpe-couche-barre", 4, [6, 10], 120),
          x("rowing-barre", 4, [8, 12], 105),
          x("developpe-epaules-halteres", 3, [8, 12], 90),
          x("curl-halteres", 3, [10, 12], 75),
          x("extension-triceps-poulie", 3, [10, 12], 75),
        ],
      },
      {
        nom: "Bas A", groupesCibles: ["quadriceps", "fessiers", "mollets"],
        exercices: [
          x("squat-barre", 4, [6, 10], 150),
          x("presse-cuisses", 3, [10, 15], 105),
          x("leg-curl-machine", 3, [10, 12], 90),
          x("mollets-debout", 4, [12, 20], 60),
        ],
      },
      {
        nom: "Haut B", groupesCibles: ["dorsaux", "epaules", "pectoraux"],
        exercices: [
          x("tractions", 4, [6, 10], 120),
          x("developpe-couche-halteres", 4, [8, 12], 105),
          x("elevations-laterales-halteres", 4, [12, 15], 60),
          x("face-pull-elastique", 3, [12, 15], 60),
          x("dips-banc", 3, [10, 15], 75),
        ],
      },
      {
        nom: "Bas B", groupesCibles: ["ischios", "fessiers", "abdominaux"],
        exercices: [
          x("souleve-terre-roumain-barre", 4, [8, 10], 150),
          x("squat-bulgare-halteres", 3, [10, 12], 105),
          x("pont-fessier", 3, [12, 15], 75),
          x("releve-genoux", 3, [12, 20], 60),
        ],
      },
    ],
  },
  {
    id: "ppl-volume",
    nom: "Push / Pull / Legs",
    accroche: "5 séances par semaine, volume avancé",
    objectif: "prise_muscle",
    niveau: "avance",
    joursParSemaine: 5,
    dureeMin: 65,
    description:
      "Le découpage classique du volume élevé : poussée, tirage, jambes. À 5 séances, tu enchaînes "
      + "Push, Pull, Legs, Push, Pull et tu reprends le cycle la semaine suivante.",
    progression:
      "Volume élevé : surveille la récupération. Si les performances stagnent deux semaines de suite, "
      + "réduis d'une série par exercice pendant une semaine avant de repartir.",
    seances: [
      {
        nom: "Push (poussée)", groupesCibles: ["pectoraux", "epaules", "triceps"],
        exercices: [
          x("developpe-couche-barre", 4, [6, 10], 120),
          x("developpe-epaules-halteres", 4, [8, 12], 105),
          x("ecarte-poulie", 3, [12, 15], 75),
          x("elevations-laterales-halteres", 4, [12, 15], 60),
          x("extension-triceps-poulie", 4, [10, 12], 75),
        ],
      },
      {
        nom: "Pull (tirage)", groupesCibles: ["dorsaux", "biceps", "trapezes"],
        exercices: [
          x("tractions", 4, [6, 10], 120),
          x("rowing-barre", 4, [8, 12], 105),
          x("tirage-vertical-poulie", 3, [10, 12], 90),
          x("face-pull-elastique", 3, [12, 15], 60),
          x("curl-halteres", 4, [10, 12], 75),
        ],
      },
      {
        nom: "Legs (jambes)", groupesCibles: ["quadriceps", "ischios", "mollets"],
        exercices: [
          x("squat-barre", 4, [6, 10], 150),
          x("souleve-terre-roumain-barre", 4, [8, 10], 135),
          x("presse-cuisses", 3, [10, 15], 105),
          x("leg-curl-machine", 3, [10, 12], 90),
          x("mollets-debout", 4, [12, 20], 60),
        ],
      },
    ],
  },
  {
    id: "poids-du-corps",
    nom: "Poids du corps",
    accroche: "3 séances par semaine, sans matériel",
    objectif: "recomposition",
    niveau: "debutant",
    joursParSemaine: 3,
    dureeMin: 40,
    description:
      "Aucun matériel nécessaire : idéal à la maison ou en déplacement. Le volume et la lenteur "
      + "d'exécution remplacent la charge.",
    progression:
      "Sans charge, on progresse en ajoutant des répétitions, en ralentissant la descente "
      + "(3 secondes) ou en réduisant le temps de repos.",
    seances: [
      {
        nom: "Corps entier A", groupesCibles: ["quadriceps", "pectoraux", "abdominaux"],
        exercices: [
          x("squat-poids-du-corps", 4, [15, 25], 60),
          x("pompes", 4, [10, 20], 75),
          x("rowing-inverse", 4, [8, 15], 75),
          x("gainage-frontal", 3, null, 45, 40),
        ],
      },
      {
        nom: "Corps entier B", groupesCibles: ["fessiers", "epaules", "abdominaux"],
        exercices: [
          x("fente-poids-du-corps", 4, [12, 20], 60),
          x("pompes-piquees", 3, [8, 15], 75),
          x("pont-fessier", 3, [15, 20], 60),
          x("gainage-lateral", 3, null, 45, 30),
        ],
      },
      {
        nom: "Corps entier C", groupesCibles: ["corps_entier", "abdominaux"],
        exercices: [
          x("burpees", 4, [10, 15], 75),
          x("squat-poids-du-corps", 3, [20, 30], 60),
          x("dips-banc", 3, [10, 15], 60),
          x("superman", 3, [12, 15], 45),
        ],
      },
    ],
  },
];

/** Retrouve un programme par son identifiant. */
export function programmeParId(id) {
  return PROGRAMMES.find((p) => p.id === id) || null;
}

/** Nombre total d'exercices d'un programme (pour l'affichage). */
export function totalExercices(prog) {
  return (prog?.seances || []).reduce((a, s) => a + s.exercices.length, 0);
}
