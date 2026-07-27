// @ts-check
/**
 * Programmes de SALLE — structures d'entraînement transposées depuis les fiches
 * d'entraînement fournies par le propriétaire de l'application.
 *
 * Seules les DONNÉES d'entraînement sont reprises (choix des mouvements, séries,
 * répétitions, temps de repos, répartition des séances) : ce sont des paramètres
 * fonctionnels. Toutes les descriptions et consignes ci-dessous sont rédigées
 * pour ce projet ; aucun texte, image ni mise en page tierce n'est reproduit.
 *
 * `ref` pointe toujours vers un exercice réel du catalogue (vérifié par test).
 * Quand la fiche d'origine mentionne un mouvement absent du catalogue, on
 * utilise l'équivalent le plus proche.
 */

/** Exercice : référence catalogue, séries, [repsMin,repsMax], repos (s), durée (s). */
const x = (ref, series, reps, repos, duree = null) => ({ ref, series, reps, repos, duree });
/** Exercice chronométré (gainage). */
const t = (ref, series, duree, repos) => ({ ref, series, reps: null, repos, duree });

export const PROGRAMMES_SALLE = [
  /* ============================ DÉBUTANT / INITIATION ============================ */
  {
    id: "initiation-muscu",
    nom: "Initiation musculation",
    accroche: "2 séances à alterner, tout en machines",
    objectif: "recomposition", niveau: "debutant", joursParSemaine: 3, dureeMin: 50,
    description:
      "Première approche de la musculation, entièrement sur machines : les trajectoires sont guidées, "
      + "donc la technique est simple à tenir. Séries longues et charges légères pour apprendre les mouvements.",
    progression:
      "Reste léger les premières semaines : cherche d'abord à sentir le muscle travailler. "
      + "Augmente seulement quand les 4 séries passent sans effort en fin de série.",
    echauffement: "10 minutes de rameur ou d'elliptique.",
    seances: [
      { nom: "Séance A", groupesCibles: ["pectoraux", "dorsaux", "epaules", "quadriceps"], exercices: [
        x("presse-pectorale", 4, [20, 30], 60),
        x("rowing-machine-assis", 4, [20, 30], 60),
        x("rowing-menton-poulie", 4, [20, 30], 60),
        x("presse-cuisses", 4, [20, 30], 60),
        x("adducteurs-machine", 4, [20, 30], 60),
        x("crunch-sol", 3, [20, 30], 30),
      ] },
      { nom: "Séance B", groupesCibles: ["pectoraux", "dorsaux", "epaules", "quadriceps", "ischios"], exercices: [
        x("butterfly", 4, [20, 30], 60),
        x("tirage-vertical-serre", 4, [20, 30], 60),
        x("butterfly-inverse", 4, [20, 30], 60),
        x("extension-lombaire-banc", 4, [10, 12], 30),
        x("elevations-laterales-halteres", 4, [20, 30], 60),
        x("leg-extension", 4, [20, 30], 60),
        x("leg-curl-assis", 4, [15, 20], 60),
      ] },
    ],
  },
  {
    id: "condition-physique-generale",
    nom: "Condition physique générale",
    accroche: "1 séance complète, 1 à 2 fois par semaine",
    objectif: "recomposition", niveau: "debutant", joursParSemaine: 2, dureeMin: 55,
    description:
      "Une seule séance qui passe en revue tout le corps, combinée à du cardio. Idéal pour se remettre "
      + "en forme sans y consacrer beaucoup de jours dans la semaine.",
    progression: "Garde les séries longues (20 répétitions). Progresse en ajoutant de la charge une fois les 4 séries confortables.",
    echauffement: "20 minutes de cardio à intensité moyenne, ou en mode alternance d'intensité.",
    seances: [
      { nom: "Séance complète", groupesCibles: ["pectoraux", "dorsaux", "epaules", "quadriceps", "ischios", "abdominaux"], exercices: [
        x("butterfly", 4, [20, 20], 60),
        x("presse-pectorale", 4, [20, 20], 60),
        x("tirage-vertical-nuque", 4, [20, 20], 60),
        x("rowing-machine-assis", 4, [20, 20], 60),
        x("presse-epaules", 4, [20, 20], 60),
        x("leg-extension", 4, [20, 20], 60),
        x("leg-curl-assis", 4, [20, 20], 60),
        x("crunch-sol", 3, [20, 30], 30),
      ] },
    ],
  },

  /* ============================ FORCE ============================ */
  {
    id: "force-max-sport",
    nom: "Force max (préparation sportive)",
    accroche: "4 séances, charges très lourdes, séries courtes",
    objectif: "force", niveau: "avance", joursParSemaine: 4, dureeMin: 70,
    description:
      "Cycle orienté force maximale, pensé pour un sport de contact : très peu de répétitions à charge "
      + "élevée (environ 90 à 95 % du maximum) sur les mouvements de base, complété par du cardio.",
    progression:
      "Travaille autour de 90–95 % de ton maximum sur les séries de 3. Repos longs (3 à 4 min) : "
      + "ils font partie de l'exercice. Réévalue ton maximum toutes les 4 à 6 semaines.",
    echauffement: "Cardio 35 à 40 min en intensité alternée, puis séries d'approche progressives sur le mouvement principal.",
    seances: [
      { nom: "Pectoraux · Épaules · Triceps", groupesCibles: ["pectoraux", "epaules", "triceps"], exercices: [
        x("developpe-couche-barre", 5, [3, 3], 210),
        x("ecarte-couche-halteres", 4, [8, 8], 60),
        x("epaule-barre", 4, [8, 8], 90),
        x("crunch-sol", 3, [20, 30], 30),
      ] },
      { nom: "Cuisses · Lombaires", groupesCibles: ["quadriceps", "ischios", "lombaires"], exercices: [
        x("souleve-terre-barre", 5, [3, 3], 180),
        x("leg-curl-assis", 5, [8, 8], 60),
        x("hack-squat", 4, [8, 8], 90),
        x("crunch-sol", 3, [20, 30], 30),
      ] },
      { nom: "Dorsaux · Biceps · Trapèzes", groupesCibles: ["dorsaux", "biceps", "trapezes"], exercices: [
        x("tractions", 5, [3, 3], 210),
        x("rowing-barre", 5, [8, 8], 90),
        x("extension-lombaire-banc", 5, [20, 20], 30),
        x("shrugs", 5, [8, 10], 60),
      ] },
      { nom: "Cardio · Abdos", groupesCibles: ["corps_entier", "abdominaux"], exercices: [
        x("rameur", 1, null, 60, 1800),
        x("crunch-sol", 4, [20, 30], 30),
        t("gainage-frontal", 3, 45, 30),
      ] },
    ],
  },

  /* ============================ PRISE DE MASSE ============================ */
  {
    id: "prise-de-masse-salle",
    nom: "Prise de masse",
    accroche: "3 séances, mouvements lourds en 6×6",
    objectif: "prise_muscle", niveau: "intermediaire", joursParSemaine: 3, dureeMin: 70,
    description:
      "Trois séances qui découpent le corps en pectoraux/épaules, cuisses/lombaires et dos/bras. "
      + "Chaque séance démarre par un mouvement lourd en 6 séries de 6, puis complète en séries de 8.",
    progression:
      "Le premier exercice se fait autour de 80 % du maximum, avec 2 à 3 min de repos. "
      + "Prévois idéalement un jour de repos entre chaque séance.",
    echauffement: "5 à 10 minutes de rameur, puis séries d'approche sur le premier mouvement.",
    seances: [
      { nom: "Pectoraux · Épaules · Abdos", groupesCibles: ["pectoraux", "epaules", "abdominaux"], exercices: [
        x("developpe-couche-barre", 6, [6, 6], 150),
        x("ecarte-couche-halteres", 3, [8, 8], 60),
        x("poulie-vis-a-vis", 3, [8, 8], 60),
        x("developpe-nuque-barre", 6, [6, 6], 150),
        x("rowing-menton-poulie", 4, [8, 8], 60),
        x("crunch-sol", 3, [15, 30], 30),
      ] },
      { nom: "Cuisses · Lombaires · Abdos", groupesCibles: ["quadriceps", "ischios", "lombaires", "abdominaux"], exercices: [
        x("presse-cuisses", 6, [6, 6], 150),
        x("leg-extension", 4, [8, 8], 60),
        x("leg-curl-assis", 6, [8, 8], 60),
        x("fentes-barre", 4, [8, 8], 60),
        x("extension-lombaire-banc", 4, [20, 20], 30),
        x("releve-bassin-sol", 3, [15, 30], 30),
      ] },
      { nom: "Dorsaux · Bras · Abdos", groupesCibles: ["dorsaux", "biceps", "triceps", "abdominaux"], exercices: [
        x("tirage-vertical-nuque", 6, [6, 6], 150),
        x("rowing-machine-assis", 3, [8, 8], 60),
        x("retropulsion-poulie", 3, [8, 8], 60),
        x("barre-au-front", 5, [8, 8], 60),
        x("extension-triceps-corde", 4, [8, 8], 60),
        x("curl-barre", 5, [8, 8], 60),
        x("curl-pronation", 4, [8, 8], 60),
      ] },
    ],
  },

  /* ============================ VOLUME ============================ */
  {
    id: "volume-debutant",
    nom: "Volume débutant",
    accroche: "3 séances, séries de 10 à 12",
    objectif: "prise_muscle", niveau: "debutant", joursParSemaine: 3, dureeMin: 60,
    description:
      "Découpage classique en trois séances (dos/triceps, cuisses/biceps, pectoraux/épaules) avec "
      + "un volume adapté à quelqu'un qui débute la musculation avec charges.",
    progression:
      "Les deux premières semaines, travaille plus léger en faisant des séries de 15 au lieu de 10 : "
      + "le temps d'installer la technique. Ensuite, monte progressivement les charges.",
    echauffement: "10 minutes de rameur.",
    seances: [
      { nom: "Dorsaux · Triceps · Abdos", groupesCibles: ["dorsaux", "triceps", "abdominaux"], exercices: [
        x("tirage-vertical-poulie", 4, [10, 12], 90),
        x("rowing-machine-assis", 4, [10, 12], 90),
        x("butterfly-inverse", 4, [12, 12], 60),
        x("dips-banc", 4, [12, 12], 60),
        x("extension-triceps-corde", 4, [12, 12], 60),
        x("crunch-sol", 3, [15, 30], 30),
      ] },
      { nom: "Cuisses · Biceps · Abdos", groupesCibles: ["quadriceps", "ischios", "biceps", "abdominaux"], exercices: [
        x("presse-cuisses", 4, [10, 12], 90),
        x("leg-extension", 4, [12, 12], 60),
        x("leg-curl-assis", 5, [12, 12], 60),
        x("curl-machine", 4, [12, 12], 60),
        x("curl-halteres", 4, [12, 12], 60),
        t("gainage-frontal", 3, 40, 30),
      ] },
      { nom: "Pectoraux · Épaules · Abdos", groupesCibles: ["pectoraux", "epaules", "abdominaux"], exercices: [
        x("developpe-couche-barre", 4, [10, 12], 90),
        x("developpe-incline-barre", 4, [10, 12], 90),
        x("ecarte-couche-halteres", 4, [12, 12], 60),
        x("presse-epaules", 4, [10, 12], 90),
        x("elevations-laterales-halteres", 4, [12, 12], 60),
        x("releve-bassin-sol", 3, [15, 30], 30),
      ] },
    ],
  },
  {
    id: "volume-debutant-bras",
    nom: "Volume débutant (accent bras)",
    accroche: "3 séances, une entièrement dédiée aux bras",
    objectif: "prise_muscle", niveau: "debutant", joursParSemaine: 3, dureeMin: 60,
    description:
      "Même logique que le volume débutant, mais la troisième séance est consacrée aux bras et "
      + "aux lombaires — utile quand les bras sont un point faible.",
    progression: "Séries de 10 à 12 répétitions. Augmente la charge quand tu tiens 12 répétitions propres sur toutes les séries.",
    echauffement: "10 minutes de cardio léger.",
    seances: [
      { nom: "Pectoraux · Épaules · Abdos", groupesCibles: ["pectoraux", "epaules", "abdominaux"], exercices: [
        x("developpe-couche-barre", 4, [10, 12], 90),
        x("developpe-incline-halteres", 4, [10, 12], 90),
        x("butterfly", 4, [12, 12], 60),
        x("presse-epaules", 4, [10, 12], 90),
        x("elevations-laterales-halteres", 4, [12, 12], 60),
        x("crunch-sol", 3, [15, 30], 30),
      ] },
      { nom: "Cuisses · Dorsaux · Abdos", groupesCibles: ["quadriceps", "ischios", "dorsaux", "abdominaux"], exercices: [
        x("presse-cuisses", 4, [10, 12], 90),
        x("leg-extension", 4, [12, 12], 60),
        x("leg-curl-assis", 4, [12, 12], 60),
        x("tirage-vertical-poulie", 4, [10, 12], 90),
        x("rowing-machine-assis", 4, [10, 12], 90),
        x("releve-bassin-sol", 3, [15, 30], 30),
      ] },
      { nom: "Bras · Lombaires · Abdos", groupesCibles: ["biceps", "triceps", "lombaires", "abdominaux"], exercices: [
        x("curl-barre", 4, [10, 12], 60),
        x("curl-marteau", 4, [12, 12], 60),
        x("curl-pupitre", 4, [10, 12], 60),
        x("barre-au-front", 4, [10, 12], 60),
        x("extension-triceps-corde", 4, [12, 12], 60),
        x("dips-banc", 4, [12, 12], 60),
        x("extension-lombaire-banc", 4, [15, 20], 30),
      ] },
    ],
  },
  {
    id: "volume-avance-3",
    nom: "Volume avancé — 3 séances",
    accroche: "3 séances denses, avec bi-sets",
    objectif: "prise_muscle", niveau: "avance", joursParSemaine: 3, dureeMin: 70,
    description:
      "Volume élevé condensé sur trois séances. Certains exercices sont prévus en bi-set : deux "
      + "mouvements enchaînés sans repos, puis une minute de récupération.",
    progression:
      "Séries de 10 à 12 répétitions sur l'essentiel. Le bi-set se fait plus léger, en séries de 15. "
      + "Surveille la récupération : si les performances baissent deux semaines de suite, allège.",
    echauffement: "10 minutes de cardio + séries d'approche.",
    seances: [
      { nom: "Pectoraux · Ischios · Triceps", groupesCibles: ["pectoraux", "ischios", "triceps", "abdominaux"], exercices: [
        x("developpe-couche-barre", 4, [10, 12], 60),
        x("developpe-incline-halteres", 4, [10, 12], 60),
        x("pullover-haltere", 3, [10, 12], 60),
        x("presse-pectorale", 5, [15, 15], 60),
        x("souleve-terre-roumain-barre", 4, [10, 12], 60),
        x("barre-au-front", 5, [10, 12], 60),
        x("developpe-couche-prise-serree", 3, [10, 12], 60),
      ] },
      { nom: "Dorsaux · Quadriceps · Biceps", groupesCibles: ["dorsaux", "quadriceps", "biceps", "abdominaux"], exercices: [
        x("rowing-machine-assis", 5, [15, 15], 60),
        x("tirage-vertical-poulie", 4, [10, 12], 60),
        x("rowing-barre", 4, [10, 12], 60),
        x("butterfly-inverse", 3, [10, 12], 60),
        x("squat-barre", 4, [10, 12], 60),
        x("leg-extension", 4, [10, 12], 60),
        x("leg-curl-assis", 4, [10, 12], 60),
        x("curl-pupitre", 5, [10, 12], 60),
        x("curl-marteau", 3, [10, 12], 60),
      ] },
      { nom: "Épaules · Rappels · Lombaires", groupesCibles: ["epaules", "pectoraux", "dorsaux", "lombaires"], exercices: [
        x("developpe-epaules-halteres", 4, [10, 12], 60),
        x("elevations-laterales-halteres", 4, [10, 12], 60),
        x("elevations-posterieures", 4, [10, 12], 60),
        x("extension-lombaire-banc", 4, [15, 20], 30),
        x("crunch-sol", 3, [30, 40], 30),
        x("releve-bassin-sol", 3, [20, 30], 30),
      ] },
    ],
  },
  {
    id: "volume-avance-4",
    nom: "Volume avancé — 4 séances",
    accroche: "4 séances, dont une dédiée aux rappels",
    objectif: "prise_muscle", niveau: "avance", joursParSemaine: 4, dureeMin: 70,
    description:
      "Quatre séances : pectoraux/épaules, cuisses, dos/triceps, puis une séance biceps complétée "
      + "de « rappels » sur les groupes principaux.",
    progression: "Séries de 10 à 12. Le quatrième jour sert à rattraper les points faibles : adapte-le à ce qui traîne.",
    echauffement: "10 minutes de cardio + séries d'approche.",
    seances: [
      { nom: "Pectoraux · Épaules · Abdos", groupesCibles: ["pectoraux", "epaules", "abdominaux"], exercices: [
        x("developpe-couche-barre", 4, [10, 12], 90),
        x("developpe-incline-barre", 4, [10, 12], 90),
        x("butterfly", 4, [12, 12], 60),
        x("developpe-epaules-halteres", 4, [10, 12], 90),
        x("elevations-laterales-halteres", 4, [12, 12], 60),
        x("elevations-posterieures", 3, [12, 15], 60),
        x("crunch-sol", 3, [20, 30], 30),
      ] },
      { nom: "Cuisses · Abdos", groupesCibles: ["quadriceps", "ischios", "fessiers", "abdominaux"], exercices: [
        x("squat-barre", 4, [10, 12], 120),
        x("presse-cuisses", 4, [10, 12], 90),
        x("leg-extension", 4, [12, 12], 60),
        x("leg-curl-assis", 4, [12, 12], 60),
        x("fentes-halteres", 3, [10, 12], 60),
        x("mollets-presse", 4, [15, 25], 45),
        x("releve-bassin-sol", 3, [20, 30], 30),
      ] },
      { nom: "Dorsaux · Triceps · Abdos", groupesCibles: ["dorsaux", "triceps", "abdominaux"], exercices: [
        x("tractions", 4, [8, 12], 90),
        x("rowing-barre", 4, [10, 12], 90),
        x("tirage-vertical-poulie", 4, [10, 12], 60),
        x("t-barre", 3, [10, 12], 60),
        x("barre-au-front", 4, [10, 12], 60),
        x("extension-triceps-corde", 4, [12, 12], 60),
        t("gainage-frontal", 3, 45, 30),
      ] },
      { nom: "Biceps · Rappels · Abdos", groupesCibles: ["biceps", "pectoraux", "quadriceps", "dorsaux"], exercices: [
        x("curl-barre", 4, [10, 12], 60),
        x("curl-pupitre", 4, [10, 12], 60),
        x("curl-marteau", 3, [12, 12], 60),
        x("poulie-vis-a-vis", 3, [12, 15], 60),
        x("hack-squat", 3, [12, 15], 90),
        x("rowing-machine-assis", 3, [12, 15], 60),
        x("obliques-torsions", 3, [20, 30], 30),
      ] },
    ],
  },
  {
    id: "volume-avance-5",
    nom: "Volume avancé — 5 séances",
    accroche: "5 séances, un groupe par jour",
    objectif: "prise_muscle", niveau: "avance", joursParSemaine: 5, dureeMin: 70,
    description:
      "Le découpage le plus fin : chaque séance se concentre sur un ou deux groupes, avec des rappels "
      + "en fin de séance. Réservé à ceux qui récupèrent bien et s'entraînent depuis longtemps.",
    progression: "Volume très élevé : la nutrition et le sommeil deviennent limitants avant l'entraînement lui-même.",
    echauffement: "10 minutes de cardio + séries d'approche.",
    seances: [
      { nom: "Dorsaux · Triceps", groupesCibles: ["dorsaux", "triceps", "abdominaux"], exercices: [
        x("tractions", 4, [8, 12], 90),
        x("rowing-barre", 4, [10, 12], 90),
        x("tirage-vertical-nuque", 4, [10, 12], 60),
        x("retropulsion-poulie", 3, [12, 15], 60),
        x("barre-au-front", 4, [10, 12], 60),
        x("extension-triceps-corde", 4, [12, 15], 60),
        x("crunch-sol", 3, [20, 30], 30),
      ] },
      { nom: "Quadriceps · Biceps", groupesCibles: ["quadriceps", "biceps", "abdominaux"], exercices: [
        x("squat-barre", 4, [10, 12], 120),
        x("hack-squat", 4, [10, 12], 90),
        x("leg-extension", 4, [12, 15], 60),
        x("curl-barre", 4, [10, 12], 60),
        x("curl-pupitre", 4, [10, 12], 60),
        x("releve-bassin-sol", 3, [20, 30], 30),
      ] },
      { nom: "Pectoraux · Ischios", groupesCibles: ["pectoraux", "ischios", "abdominaux"], exercices: [
        x("developpe-couche-barre", 4, [10, 12], 90),
        x("developpe-incline-halteres", 4, [10, 12], 90),
        x("butterfly", 4, [12, 15], 60),
        x("souleve-terre-roumain-barre", 4, [10, 12], 90),
        x("leg-curl-assis", 4, [12, 15], 60),
        t("gainage-frontal", 3, 45, 30),
      ] },
      { nom: "Épaules · Rappel dos", groupesCibles: ["epaules", "dorsaux", "abdominaux"], exercices: [
        x("presse-epaules", 4, [10, 12], 90),
        x("elevations-laterales-halteres", 4, [12, 15], 60),
        x("elevations-posterieures", 4, [12, 15], 60),
        x("shrugs", 4, [12, 15], 60),
        x("rowing-machine-assis", 3, [12, 15], 60),
        x("obliques-torsions", 3, [20, 30], 30),
      ] },
      { nom: "Rappel cuisses · Mollets", groupesCibles: ["quadriceps", "fessiers", "mollets", "abdominaux"], exercices: [
        x("presse-cuisses", 4, [12, 15], 90),
        x("fentes-halteres", 3, [10, 12], 60),
        x("abducteurs-machine", 3, [15, 25], 45),
        x("mollets-presse", 4, [15, 25], 45),
        x("mollets-assis", 4, [15, 25], 45),
        x("releve-genoux-chaise", 3, [12, 20], 45),
      ] },
    ],
  },
  {
    id: "volume-seche",
    nom: "Volume & sèche",
    accroche: "4 séances muscu + cardio, en séries longues",
    objectif: "perte_graisse", niveau: "intermediaire", joursParSemaine: 4, dureeMin: 65,
    description:
      "Conserve le volume d'entraînement tout en orientant vers la perte de gras : séries longues, "
      + "repos courts, et cardio intercalé sur les jours creux.",
    progression: "Priorité au maintien des charges malgré le déficit calorique : c'est le meilleur signe que la masse musculaire est préservée.",
    echauffement: "10 minutes de cardio progressif.",
    seances: [
      { nom: "Pectoraux · Ischios · Abdos", groupesCibles: ["pectoraux", "ischios", "abdominaux"], exercices: [
        x("developpe-couche-barre", 4, [12, 15], 60),
        x("developpe-incline-halteres", 4, [12, 15], 60),
        x("butterfly", 3, [15, 20], 45),
        x("souleve-terre-roumain-barre", 4, [12, 15], 60),
        x("leg-curl-assis", 4, [15, 20], 45),
        x("crunch-sol", 4, [20, 30], 30),
      ] },
      { nom: "Bras · Mollets · Lombaires", groupesCibles: ["biceps", "triceps", "mollets", "lombaires"], exercices: [
        x("curl-barre", 4, [12, 15], 45),
        x("curl-marteau", 3, [15, 20], 45),
        x("barre-au-front", 4, [12, 15], 45),
        x("extension-triceps-corde", 3, [15, 20], 45),
        x("mollets-assis", 4, [20, 25], 45),
        x("extension-lombaire-banc", 4, [15, 20], 30),
        t("gainage-frontal", 3, 45, 30),
      ] },
      { nom: "Dorsaux · Quadriceps · Abdos", groupesCibles: ["dorsaux", "quadriceps", "abdominaux"], exercices: [
        x("tirage-vertical-poulie", 4, [12, 15], 60),
        x("rowing-machine-assis", 4, [12, 15], 60),
        x("butterfly-inverse", 3, [15, 20], 45),
        x("presse-cuisses", 4, [15, 20], 60),
        x("leg-extension", 3, [15, 20], 45),
        x("releve-bassin-sol", 4, [20, 30], 30),
      ] },
      { nom: "Épaules · Fessiers · Mollets", groupesCibles: ["epaules", "fessiers", "mollets", "abdominaux"], exercices: [
        x("presse-epaules", 4, [12, 15], 60),
        x("elevations-laterales-halteres", 4, [15, 20], 45),
        x("elevations-posterieures", 3, [15, 20], 45),
        x("extension-fessier-machine", 4, [15, 25], 45),
        x("abducteurs-machine", 4, [20, 30], 30),
        x("mollets-presse", 4, [20, 25], 45),
        x("obliques-torsions", 3, [20, 30], 30),
      ] },
    ],
  },

  /* ============================ SÈCHE / TONIFICATION ============================ */
  {
    id: "seche-definition",
    nom: "Sèche & définition musculaire",
    accroche: "5 séances, cardio à chaque fois",
    objectif: "perte_graisse", niveau: "intermediaire", joursParSemaine: 5, dureeMin: 65,
    description:
      "Cinq séances qui commencent toutes par du cardio, puis enchaînent sur de la musculation en "
      + "séries de 20 répétitions. L'objectif est de creuser la dépense sans perdre de muscle.",
    progression: "Séries longues à charge modérée. Si tu perds de la force sur les mouvements de base, c'est que le déficit est trop agressif.",
    echauffement: "Cardio en début de chaque séance (15 à 25 minutes selon la forme du jour).",
    seances: [
      { nom: "Dorsaux · Épaules · Triceps", groupesCibles: ["dorsaux", "epaules", "triceps", "abdominaux"], exercices: [
        x("tirage-vertical-nuque", 4, [20, 20], 60),
        x("t-barre", 3, [20, 20], 60),
        x("developpe-epaules-halteres", 4, [20, 20], 60),
        x("elevations-laterales-halteres", 3, [20, 20], 60),
        x("extension-triceps-poulie", 4, [20, 20], 60),
        x("crunch-sol", 4, [20, 30], 30),
      ] },
      { nom: "Cuisses · Pectoraux · Biceps", groupesCibles: ["quadriceps", "pectoraux", "biceps", "abdominaux"], exercices: [
        x("hack-squat", 4, [20, 20], 60),
        x("leg-curl-assis", 3, [20, 20], 60),
        x("developpe-couche-barre", 4, [20, 20], 60),
        x("butterfly", 3, [20, 20], 60),
        x("curl-halteres", 4, [20, 20], 60),
        x("releve-bassin-sol", 4, [20, 30], 30),
      ] },
      { nom: "Abdos · Lombaires", groupesCibles: ["abdominaux", "lombaires"], exercices: [
        x("extension-lombaire-banc", 5, [30, 30], 30),
        x("crunch-sol", 4, [20, 30], 30),
        x("releve-bassin-sol", 4, [20, 30], 30),
        x("obliques-torsions", 3, [20, 30], 30),
        t("gainage-frontal", 3, 45, 30),
        t("gainage-lateral", 3, 30, 30),
      ] },
    ],
  },
  {
    id: "tonification-bas-du-corps",
    nom: "Tonification (accent bas du corps)",
    accroche: "2 séances à alterner 3 fois par semaine",
    objectif: "recomposition", niveau: "debutant", joursParSemaine: 3, dureeMin: 55,
    description:
      "Deux séances centrées sur les cuisses, fessiers et abdominaux, avec un entretien du haut du corps. "
      + "Séries longues et repos courts pour un travail tonique.",
    progression: "Repos courts (30 s) : c'est ce qui rend la séance tonique. Augmente d'abord les répétitions, ensuite la charge.",
    echauffement: "10 minutes de cardio.",
    seances: [
      { nom: "Séance A", groupesCibles: ["quadriceps", "fessiers", "abdominaux", "dorsaux", "pectoraux"], exercices: [
        x("presse-pectorale", 4, [20, 30], 30),
        x("rowing-machine-assis", 4, [20, 30], 30),
        x("butterfly-inverse", 4, [20, 30], 30),
        x("presse-cuisses", 4, [20, 30], 30),
        x("leg-extension", 3, [20, 30], 30),
        x("leg-curl-assis", 3, [20, 30], 30),
        x("adducteurs-machine", 4, [20, 30], 30),
        x("crunch-sol", 2, [20, 30], 30),
      ] },
      { nom: "Séance B", groupesCibles: ["quadriceps", "fessiers", "abdominaux", "dorsaux", "triceps"], exercices: [
        x("abducteurs-machine", 4, [20, 30], 30),
        x("extension-fessier-machine", 4, [20, 30], 45),
        x("presse-cuisses", 4, [20, 30], 30),
        x("rowing-machine-assis", 4, [20, 30], 30),
        x("dips-banc", 4, [20, 30], 30),
        x("abdos-machine", 2, [20, 30], 30),
        x("releve-bassin-sol", 2, [20, 30], 30),
        x("inclinaison-laterale-poulie", 2, [20, 30], 45),
        t("gainage-frontal", 2, 45, 30),
      ] },
    ],
  },
  {
    id: "perte-adipeuse-tonification",
    nom: "Perte de gras & tonification",
    accroche: "2 séances : une cardio+abdos, une musculation",
    objectif: "perte_graisse", niveau: "debutant", joursParSemaine: 2, dureeMin: 50,
    description:
      "Format léger en volume : une séance orientée cardio et ceinture abdominale, une séance de "
      + "musculation en séries longues avec accent sur le bas du corps et les triceps.",
    progression: "L'essentiel est la régularité. Une fois les deux séances bien tenues, ajoute une troisième séance cardio.",
    echauffement: "10 minutes de cardio progressif.",
    seances: [
      { nom: "Cardio · Abdos · Fessiers", groupesCibles: ["abdominaux", "fessiers", "corps_entier"], exercices: [
        x("rameur", 1, null, 60, 1200),
        x("crunch-sol", 4, [15, 30], 30),
        t("gainage-frontal", 4, 45, 30),
        x("extension-fessier-machine", 4, [20, 30], 45),
        x("pont-fessier", 3, [15, 20], 45),
      ] },
      { nom: "Dorsaux · Cuisses · Triceps", groupesCibles: ["dorsaux", "quadriceps", "fessiers", "triceps"], exercices: [
        x("rowing-machine-assis", 4, [20, 30], 30),
        x("presse-cuisses", 4, [20, 30], 30),
        x("adducteurs-machine", 4, [20, 30], 30),
        x("abducteurs-machine", 4, [20, 30], 30),
        x("extension-triceps-poulie", 4, [20, 30], 30),
        x("crunch-sol", 4, [15, 30], 30),
      ] },
    ],
  },
  {
    id: "perte-poids-tonification-3",
    nom: "Perte de poids & tonification — 3 séances",
    accroche: "3 séances complètes avec cardio",
    objectif: "perte_graisse", niveau: "debutant", joursParSemaine: 3, dureeMin: 60,
    description:
      "Trois séances qui commencent par du cardio puis passent en revue tout le corps, avec un accent "
      + "sur les cuisses et les fessiers. Séries longues, charges modérées.",
    progression: "Vise la régularité des trois séances avant de chercher à charger davantage.",
    echauffement: "Cardio en début de séance (15 à 20 minutes).",
    seances: [
      { nom: "Cuisses · Fessiers · Haut du corps", groupesCibles: ["quadriceps", "fessiers", "dorsaux", "pectoraux", "triceps"], exercices: [
        x("presse-cuisses", 4, [30, 30], 60),
        x("leg-curl-assis", 4, [20, 20], 60),
        x("adducteurs-machine", 4, [30, 30], 60),
        x("butterfly", 4, [20, 20], 60),
        x("tirage-vertical-poulie", 4, [20, 20], 60),
        x("extension-triceps-poulie", 4, [20, 30], 60),
        x("crunch-sol", 4, [20, 30], 30),
      ] },
      { nom: "Dos · Cuisses · Épaules", groupesCibles: ["dorsaux", "quadriceps", "epaules", "abdominaux"], exercices: [
        x("rowing-machine-assis", 4, [20, 30], 60),
        x("butterfly-inverse", 4, [20, 20], 60),
        x("extension-lombaire-banc", 4, [10, 12], 30),
        x("rowing-menton-poulie", 4, [20, 20], 60),
        x("leg-extension", 4, [20, 30], 60),
        x("releve-bassin-sol", 4, [20, 30], 30),
      ] },
      { nom: "Fessiers · Pectoraux · Dos", groupesCibles: ["fessiers", "pectoraux", "dorsaux", "triceps", "abdominaux"], exercices: [
        x("abducteurs-machine", 4, [30, 40], 30),
        x("extension-fessier-machine", 4, [20, 30], 45),
        x("presse-pectorale", 4, [20, 30], 60),
        x("tirage-vertical-serre", 4, [20, 20], 60),
        x("dips-banc", 4, [20, 30], 45),
        x("crunch-sol", 4, [20, 30], 30),
        t("gainage-frontal", 3, 45, 30),
      ] },
    ],
  },

  /* ============================ RENFORCEMENT / POSTURE ============================ */
  {
    id: "renforcement-accent-dos",
    nom: "Renforcement (accent dos)",
    accroche: "2 séances à alterner, priorité au haut du dos",
    objectif: "recomposition", niveau: "debutant", joursParSemaine: 3, dureeMin: 55,
    description:
      "Renforcement général avec un accent marqué sur les muscles entre les omoplates — utile quand on "
      + "passe beaucoup de temps assis ou qu'on cherche à corriger une posture enroulée.",
    progression: "Séries de 15 à 20 répétitions, charges modérées : on cherche l'endurance posturale, pas la force maximale.",
    echauffement: "10 minutes de cardio + mobilité des épaules.",
    seances: [
      { nom: "Séance A", groupesCibles: ["dorsaux", "pectoraux", "epaules", "quadriceps"], exercices: [
        x("tirage-vertical-nuque", 3, [15, 20], 60),
        x("rowing-machine-assis", 4, [15, 20], 60),
        x("butterfly-inverse", 4, [15, 20], 60),
        x("developpe-couche-barre", 4, [15, 20], 60),
        x("presse-epaules", 4, [15, 20], 60),
        x("presse-cuisses", 4, [15, 20], 60),
        x("crunch-sol", 3, [20, 30], 30),
      ] },
      { nom: "Séance B", groupesCibles: ["dorsaux", "quadriceps", "pectoraux", "biceps", "triceps"], exercices: [
        x("t-barre", 3, [15, 20], 60),
        x("tirage-vertical-poulie", 3, [15, 20], 60),
        x("extension-lombaire-banc", 3, [15, 20], 60),
        x("presse-pectorale", 4, [15, 20], 60),
        x("rowing-menton-poulie", 4, [15, 20], 60),
        x("leg-extension", 4, [15, 20], 60),
        x("leg-curl-assis", 4, [15, 20], 60),
        x("adducteurs-machine", 4, [15, 20], 60),
        x("barre-au-front", 3, [15, 20], 60),
        x("curl-halteres", 3, [15, 20], 60),
      ] },
    ],
  },
  {
    id: "renforcement-sans-materiel",
    nom: "Renforcement général sans matériel",
    accroche: "1 séance full-body, 3 fois par semaine",
    objectif: "recomposition", niveau: "debutant", joursParSemaine: 3, dureeMin: 40,
    description:
      "Séance complète réalisable à la maison, au poids du corps (quelques haltères sont un plus). "
      + "Tout le corps à chaque fois, en séries longues.",
    progression:
      "Sans charge, on progresse en ajoutant des répétitions, en ralentissant la descente, "
      + "ou en réduisant le temps de repos.",
    echauffement: "5 minutes de mobilité articulaire et de montées de genoux.",
    seances: [
      { nom: "Full-body maison", groupesCibles: ["pectoraux", "dorsaux", "quadriceps", "epaules", "biceps", "triceps", "abdominaux"], exercices: [
        x("pompes", 3, [15, 20], 60),
        x("pompes-serrees", 3, [10, 20], 60),
        x("oiseaux-face-sol", 3, [20, 20], 60),
        x("squat-halteres", 3, [20, 20], 60),
        x("leg-curl-genoux", 3, [10, 15], 60),
        x("dips-banc", 3, [15, 20], 60),
        x("kick-back", 3, [20, 20], 45),
        x("curl-halteres", 3, [15, 20], 60),
        x("curl-pronation", 3, [20, 20], 45),
        x("developpe-epaules-halteres", 3, [20, 20], 60),
        x("elevations-laterales-halteres", 3, [20, 20], 60),
        x("crunch-sol", 3, [20, 30], 30),
        t("gainage-frontal", 3, 45, 30),
      ] },
    ],
  },

  /* ============================ CIRCUIT TRAINING ============================ */
  {
    id: "circuit-training-1",
    nom: "Circuit training — corps entier",
    accroche: "Cardio puis 2 circuits enchaînés, 3 tours",
    objectif: "perte_graisse", niveau: "intermediaire", joursParSemaine: 2, dureeMin: 70,
    description:
      "Format en circuit : les exercices s'enchaînent les uns derrière les autres sans temps de repos, "
      + "et on récupère seulement en fin de tour. Très exigeant sur le plan cardio.",
    progression:
      "3 tours par circuit, 30 secondes à 1 minute de récupération en fin de tour. "
      + "Charges légères : c'est l'enchaînement qui fait la difficulté, pas le poids.",
    echauffement: "40 minutes de cardio en effort continu avant d'enchaîner sur le circuit.",
    seances: [
      { nom: "Circuit 1", groupesCibles: ["quadriceps", "pectoraux", "dorsaux", "epaules", "biceps", "triceps"], exercices: [
        x("squat-halteres", 3, [20, 30], 0),
        x("developpe-couche-halteres", 3, [20, 30], 0),
        x("rowing-machine-assis", 3, [20, 30], 0),
        x("crunch-sol", 3, [15, 30], 0),
        x("developpe-epaules-halteres", 3, [20, 30], 0),
        x("fentes-halteres", 3, [20, 20], 0),
        x("curl-barre", 3, [20, 30], 0),
        x("dips-banc", 3, [20, 30], 60),
      ] },
      { nom: "Circuit 2", groupesCibles: ["quadriceps", "pectoraux", "epaules", "ischios", "biceps", "triceps"], exercices: [
        x("presse-cuisses", 3, [20, 30], 0),
        x("pompes", 3, [20, 30], 0),
        x("elevations-posterieures", 3, [20, 30], 0),
        x("releve-bassin-sol", 3, [15, 30], 0),
        x("leg-curl-assis", 3, [20, 30], 0),
        x("curl-halteres", 3, [20, 30], 0),
        x("barre-au-front", 3, [20, 30], 0),
        t("gainage-frontal", 3, 45, 60),
      ] },
    ],
  },
  {
    id: "circuit-training-2",
    nom: "Circuit training — haut du corps & gainage",
    accroche: "2 circuits : 3 tours puis 2 tours",
    objectif: "perte_graisse", niveau: "intermediaire", joursParSemaine: 2, dureeMin: 55,
    description:
      "Deuxième format de circuit, plus court : un premier circuit orienté haut du corps sur 3 tours, "
      + "puis un circuit de gainage sur 2 tours.",
    progression: "1 minute de récupération en fin de tour. Garde la technique propre : dès qu'elle se dégrade, le circuit s'arrête.",
    echauffement: "10 minutes de cardio progressif.",
    seances: [
      { nom: "Circuit 1 (3 tours)", groupesCibles: ["pectoraux", "dorsaux", "quadriceps", "epaules", "triceps"], exercices: [
        x("developpe-incline-barre", 3, [20, 30], 0),
        x("rowing-machine-assis", 3, [20, 30], 0),
        x("inclinaison-laterale-poulie", 3, [20, 30], 0),
        x("squat-halteres", 3, [20, 30], 0),
        x("elevations-posterieures", 3, [20, 20], 0),
        x("abducteurs-machine", 3, [20, 30], 0),
        x("barre-au-front", 3, [20, 30], 60),
      ] },
      { nom: "Circuit 2 (2 tours) — gainage", groupesCibles: ["abdominaux"], exercices: [
        x("crunch-sol", 2, [20, 30], 0),
        x("obliques-torsions", 2, [10, 20], 0),
        t("gainage-lateral", 2, 40, 0),
        t("gainage-frontal", 2, 40, 60),
      ] },
    ],
  },
];

/** Retrouve un programme de salle par identifiant. */
export function programmeSalleParId(id) {
  return PROGRAMMES_SALLE.find((p) => p.id === id) || null;
}
