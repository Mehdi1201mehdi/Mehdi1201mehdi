// @ts-check
/**
 * Modèles de domaine et énumérations partagés par le moteur et l'interface.
 * Aucune dépendance externe : ce fichier tourne aussi bien dans le navigateur
 * (module ES) que dans Node (tests).
 */

/** Groupes musculaires gérés (identifiants stables). */
export const MUSCLES = /** @type {const} */ ([
  "pectoraux", "dorsaux", "trapezes", "epaules", "biceps", "triceps",
  "avant_bras", "abdominaux", "lombaires", "quadriceps", "ischios",
  "fessiers", "adducteurs", "abducteurs", "mollets", "corps_entier",
]);

/** Libellés français lisibles pour chaque muscle. */
export const MUSCLE_LABELS = {
  pectoraux: "Pectoraux", dorsaux: "Dorsaux", trapezes: "Trapèzes",
  epaules: "Épaules", biceps: "Biceps", triceps: "Triceps",
  avant_bras: "Avant-bras", abdominaux: "Abdominaux", lombaires: "Lombaires",
  quadriceps: "Quadriceps", ischios: "Ischio-jambiers", fessiers: "Fessiers",
  adducteurs: "Adducteurs", abducteurs: "Abducteurs", mollets: "Mollets",
  corps_entier: "Corps entier",
};

/** Équipements gérés (identifiants stables). */
export const EQUIPMENTS = /** @type {const} */ ([
  "poids_du_corps", "halteres", "barre", "barre_ez", "kettlebell", "poulie",
  "elastiques", "machine_guidee", "machine_leviers", "smith", "banc", "rack",
  "barre_traction", "trx", "medecine_ball", "swiss_ball", "rouleau",
  "tapis_course", "velo", "rameur",
]);

export const EQUIPMENT_LABELS = {
  poids_du_corps: "Poids du corps", halteres: "Haltères", barre: "Barre",
  barre_ez: "Barre EZ", kettlebell: "Kettlebell", poulie: "Poulie",
  elastiques: "Élastiques", machine_guidee: "Machine guidée",
  machine_leviers: "Machine à leviers", smith: "Smith machine", banc: "Banc",
  rack: "Rack", barre_traction: "Barre de traction", trx: "TRX",
  medecine_ball: "Médecine-ball", swiss_ball: "Ballon de stabilité",
  rouleau: "Rouleau de massage", tapis_course: "Tapis de course",
  velo: "Vélo", rameur: "Rameur",
};

/** Objectifs d'entraînement. */
export const GOALS = /** @type {const} */ ([
  "prise_muscle", "perte_graisse", "recomposition", "force",
  "endurance", "remise_forme", "mobilite", "prepa_physique",
]);

export const GOAL_LABELS = {
  prise_muscle: "Prise de muscle", perte_graisse: "Perte de graisse",
  recomposition: "Recomposition corporelle", force: "Force",
  endurance: "Endurance", remise_forme: "Remise en forme",
  mobilite: "Mobilité", prepa_physique: "Préparation physique",
};

/** Niveaux d'expérience. */
export const LEVELS = /** @type {const} */ ([
  "grand_debutant", "debutant", "intermediaire", "avance",
]);

export const LEVEL_LABELS = {
  grand_debutant: "Grand débutant", debutant: "Débutant",
  intermediaire: "Intermédiaire", avance: "Avancé",
};

/** Rôle d'un mouvement dans une séance. */
export const MOVEMENT_ROLES = /** @type {const} */ (["principal", "secondaire", "isolation", "gainage", "cardio"]);

/** Type de mouvement (patron biomécanique) — sert au contrôle des doublons. */
export const MOVEMENT_PATTERNS = /** @type {const} */ ([
  "squat", "charniere_hanche", "fente", "poussee_horizontale",
  "poussee_verticale", "tirage_horizontal", "tirage_vertical",
  "extension_bras", "flexion_bras", "gainage", "isolation_jambe", "cardio",
]);

/** Splits d'entraînement possibles. */
export const SPLITS = /** @type {const} */ ([
  "full_body", "haut_bas", "push_pull_legs", "torse_membres",
  "maison", "circuit_debutant", "force", "hypertrophie", "recomposition", "mobilite",
]);

/**
 * Profil utilisateur (mono-utilisateur : le propriétaire de l'app).
 * @typedef {Object} Profil
 * @property {string} prenom
 * @property {number} age
 * @property {"H"|"F"|null} sexe
 * @property {number} tailleCm
 * @property {number} poidsKg
 * @property {number|null} masseGrassePct
 * @property {typeof GOALS[number]} objectif
 * @property {typeof GOALS[number][]} objectifsSecondaires
 * @property {typeof LEVELS[number]} niveau
 * @property {number} joursParSemaine    // 1..6
 * @property {number} dureeSeanceMin      // ex. 30, 45, 60, 75
 * @property {"maison"|"salle"|"exterieur"} lieu
 * @property {typeof EQUIPMENTS[number][]} equipements
 * @property {typeof MUSCLES[number][]} musclesPrioritaires
 * @property {string[]} exercicesAimes     // ids d'exercices
 * @property {string[]} exercicesRefuses   // ids d'exercices
 * @property {("dos"|"epaule"|"genou"|"poignet"|"cheville"|"coude"|"hanche"|"nuque")[]} limitations
 * @property {boolean} prefCardio
 * @property {"metrique"|"imperial"} unites
 * @property {1|2|3|4|5} recuperation   // qualité de récupération subjective
 * @property {number} sommeilH
 * @property {1|2|3|4|5} stress
 */

/**
 * Une série planifiée (gabarit).
 * @typedef {Object} SetTemplate
 * @property {"echauffement"|"travail"|"degressive"} type
 * @property {[number,number]|null} repsCible   // plage de répétitions
 * @property {number|null} dureeSec              // pour exercices en temps
 * @property {number|null} distanceM
 * @property {number|null} rirCible
 * @property {number|null} rpeCible
 * @property {string|null} tempo
 * @property {number} reposSec
 * @property {number|null} chargeKg              // null = à déterminer par l'utilisateur
 */

/**
 * Un exercice planifié dans une séance.
 * @typedef {Object} ExerciseTemplate
 * @property {string} exerciceId
 * @property {typeof MOVEMENT_ROLES[number]} role
 * @property {SetTemplate[]} series
 * @property {string} justification
 * @property {string|null} supersetGroupe   // même identifiant = superset
 */

/**
 * Une séance planifiée.
 * @typedef {Object} SessionTemplate
 * @property {string} id
 * @property {number} indexJour          // 0..joursParSemaine-1
 * @property {string} nom
 * @property {typeof MUSCLES[number][]} groupesCibles
 * @property {ExerciseTemplate[]} exercices
 * @property {number} dureeEstimeeMin
 */

/**
 * Un programme complet.
 * @typedef {Object} Programme
 * @property {string} id
 * @property {string} nom
 * @property {typeof SPLITS[number]} split
 * @property {string} createdAt
 * @property {SessionTemplate[]} seances
 * @property {string} justificationGlobale
 * @property {Profil} profilSnapshot
 */

/** Valide qu'un objet ressemble à un Profil exploitable. Renvoie liste d'erreurs. */
export function validerProfil(p) {
  const err = [];
  if (!p || typeof p !== "object") return ["Profil manquant."];
  if (!GOALS.includes(p.objectif)) err.push("Objectif invalide.");
  if (!LEVELS.includes(p.niveau)) err.push("Niveau invalide.");
  if (!(p.joursParSemaine >= 1 && p.joursParSemaine <= 6)) err.push("joursParSemaine doit être entre 1 et 6.");
  if (!(p.dureeSeanceMin >= 15 && p.dureeSeanceMin <= 120)) err.push("dureeSeanceMin doit être entre 15 et 120.");
  if (!Array.isArray(p.equipements) || p.equipements.length === 0) err.push("Au moins un équipement requis (ex. poids_du_corps).");
  return err;
}
