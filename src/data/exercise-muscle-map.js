// @ts-check
/**
 * COEFFICIENTS MUSCULAIRES DES EXERCICES — base centrale du moteur.
 *
 * ⚠️ Ces coefficients sont des **contributions relatives de programmation**,
 * pas des mesures physiologiques. Ils ne représentent ni un pourcentage de
 * fibres recrutées, ni des dommages musculaires, ni quoi que ce soit de
 * mesurable sans laboratoire. Ce sont des paramètres de calibration, faits
 * pour être ajustés.
 *
 * Convention : 1.00 = muscle cible principal du mouvement ; en dessous =
 * sollicitation secondaire proportionnelle.
 *
 * Deux niveaux :
 *  1. `COEFFS_EXPLICITES` — mouvements de référence, réglés à la main.
 *  2. `deriverCoefficients()` — repli automatique pour tout le reste du
 *     catalogue (343 exercices), à partir du patron de mouvement et des
 *     muscles déclarés. Garantit qu'AUCUN exercice n'a de muscles indéfinis.
 */

import { REPARTITION, IGNORES, CLES_MOTEUR } from "./muscles-moteur.js";

/* ============================ 1. COEFFICIENTS EXPLICITES ============================ */

export const COEFFS_EXPLICITES = {
  /* ---- Pectoraux ---- */
  "developpe-couche-barre": { pectoraux: 1.0, triceps: 0.55, deltoide_anterieur: 0.45 },
  "developpe-couche-halteres": { pectoraux: 1.0, triceps: 0.45, deltoide_anterieur: 0.40 },
  "developpe-sol-halteres": { pectoraux: 1.0, triceps: 0.50, deltoide_anterieur: 0.35 },
  "developpe-incline-barre": { pectoraux: 0.90, deltoide_anterieur: 0.60, triceps: 0.50 },
  "developpe-incline-halteres": { pectoraux: 0.90, deltoide_anterieur: 0.60, triceps: 0.45 },
  "ecarte-couche-halteres": { pectoraux: 1.0, deltoide_anterieur: 0.20 },
  "butterfly": { pectoraux: 1.0, deltoide_anterieur: 0.15 },
  "presse-pectorale": { pectoraux: 1.0, triceps: 0.45, deltoide_anterieur: 0.35 },
  "ecarte-poulie": { pectoraux: 1.0, deltoide_anterieur: 0.15 },
  "poulie-vis-a-vis": { pectoraux: 1.0, deltoide_anterieur: 0.15 },
  "pullover-haltere": { grand_dorsal: 1.0, triceps: 0.15, pectoraux: 0.15 },
  "pompes": { pectoraux: 1.0, triceps: 0.50, deltoide_anterieur: 0.35, abdominaux: 0.15 },
  "pompes-serrees": { triceps: 1.0, pectoraux: 0.60, deltoide_anterieur: 0.35, abdominaux: 0.15 },
  "pompes-piquees": { deltoide_anterieur: 1.0, triceps: 0.60, pectoraux: 0.35, deltoide_lateral: 0.30 },
  "dips-barres-paralleles": { pectoraux: 0.90, triceps: 0.70, deltoide_anterieur: 0.40 },
  "dips-banc": { triceps: 1.0, pectoraux: 0.40, deltoide_anterieur: 0.30 },
  "developpe-couche-prise-serree": { triceps: 1.0, pectoraux: 0.60, deltoide_anterieur: 0.35 },

  /* ---- Dos ---- */
  "tractions": { grand_dorsal: 1.0, biceps: 0.50, avant_bras: 0.35, haut_du_dos: 0.35 },
  "tirage-vertical-poulie": { grand_dorsal: 1.0, biceps: 0.50, avant_bras: 0.25, haut_du_dos: 0.25 },
  "tirage-vertical-nuque": { grand_dorsal: 1.0, haut_du_dos: 0.40, biceps: 0.45, avant_bras: 0.25 },
  "tirage-vertical-serre": { grand_dorsal: 1.0, biceps: 0.55, avant_bras: 0.25, haut_du_dos: 0.25 },
  "rowing-barre": { haut_du_dos: 1.0, grand_dorsal: 0.75, biceps: 0.50, deltoide_posterieur: 0.45, lombaires: 0.35, avant_bras: 0.25 },
  "rowing-halteres-buste-penche": { haut_du_dos: 1.0, grand_dorsal: 0.75, biceps: 0.50, deltoide_posterieur: 0.45, lombaires: 0.30, avant_bras: 0.25 },
  "rowing-haltere-unilateral": { grand_dorsal: 0.90, haut_du_dos: 0.80, biceps: 0.50, deltoide_posterieur: 0.35, avant_bras: 0.25 },
  "rowing-machine-assis": { haut_du_dos: 1.0, grand_dorsal: 0.70, biceps: 0.50, deltoide_posterieur: 0.40 },
  "rowing-inverse": { haut_du_dos: 1.0, grand_dorsal: 0.70, biceps: 0.50, deltoide_posterieur: 0.35, abdominaux: 0.20 },
  "t-barre": { haut_du_dos: 1.0, grand_dorsal: 0.80, biceps: 0.50, deltoide_posterieur: 0.40, lombaires: 0.40, avant_bras: 0.25 },
  "retropulsion-poulie": { grand_dorsal: 1.0, triceps: 0.15, pectoraux: 0.15 },
  "extension-lombaire-banc": { lombaires: 1.0, fessiers: 0.55, ischio_jambiers: 0.45 },
  "superman": { lombaires: 1.0, fessiers: 0.45, haut_du_dos: 0.25 },
  "oiseaux-face-sol": { deltoide_posterieur: 1.0, haut_du_dos: 0.55, trapezes: 0.30 },

  /* ---- Épaules ---- */
  "developpe-epaules-halteres": { deltoide_anterieur: 1.0, deltoide_lateral: 0.70, triceps: 0.50 },
  "presse-epaules": { deltoide_anterieur: 1.0, deltoide_lateral: 0.65, triceps: 0.50 },
  "developpe-nuque-barre": { deltoide_anterieur: 1.0, deltoide_lateral: 0.70, triceps: 0.55, trapezes: 0.25 },
  "elevations-laterales-halteres": { deltoide_lateral: 1.0, trapezes: 0.20 },
  "elevations-frontales": { deltoide_anterieur: 1.0 },
  "elevations-posterieures": { deltoide_posterieur: 1.0, haut_du_dos: 0.30 },
  "butterfly-inverse": { deltoide_posterieur: 1.0, haut_du_dos: 0.30 },
  "face-pull-elastique": { deltoide_posterieur: 0.90, haut_du_dos: 0.70, trapezes: 0.50, biceps: 0.15 },
  "rowing-menton-poulie": { deltoide_lateral: 1.0, trapezes: 0.60, deltoide_anterieur: 0.35, biceps: 0.25 },
  "shrugs": { trapezes: 1.0, avant_bras: 0.25 },
  "epaule-barre": { trapezes: 0.80, deltoide_anterieur: 0.60, quadriceps: 0.55, fessiers: 0.55, lombaires: 0.50, haut_du_dos: 0.45, avant_bras: 0.35 },

  /* ---- Biceps / avant-bras ---- */
  "curl-halteres": { biceps: 1.0, avant_bras: 0.25 },
  "curl-barre": { biceps: 1.0, avant_bras: 0.30 },
  "curl-pupitre": { biceps: 1.0, avant_bras: 0.20 },
  "curl-concentre": { biceps: 1.0, avant_bras: 0.20 },
  "curl-poulie": { biceps: 1.0, avant_bras: 0.20 },
  "curl-machine": { biceps: 1.0, avant_bras: 0.15 },
  "curl-marteau": { biceps: 0.80, avant_bras: 0.55 },
  "curl-pronation": { avant_bras: 1.0, biceps: 0.60 },

  /* ---- Triceps ---- */
  "extension-triceps-poulie": { triceps: 1.0 },
  "extension-triceps-corde": { triceps: 1.0 },
  "barre-au-front": { triceps: 1.0 },
  "kick-back": { triceps: 1.0 },

  /* ---- Jambes ---- */
  "squat-barre": { quadriceps: 1.0, fessiers: 0.75, adducteurs: 0.40, ischio_jambiers: 0.30, lombaires: 0.30, abdominaux: 0.20 },
  "squat-halteres": { quadriceps: 1.0, fessiers: 0.70, adducteurs: 0.35, ischio_jambiers: 0.25, abdominaux: 0.20 },
  "goblet-squat": { quadriceps: 1.0, fessiers: 0.60, adducteurs: 0.30, abdominaux: 0.30 },
  "squat-poids-du-corps": { quadriceps: 1.0, fessiers: 0.60, adducteurs: 0.25 },
  "hack-squat": { quadriceps: 1.0, fessiers: 0.50, adducteurs: 0.25 },
  "presse-cuisses": { quadriceps: 1.0, fessiers: 0.65, ischio_jambiers: 0.25, adducteurs: 0.25 },
  "fente-poids-du-corps": { quadriceps: 0.85, fessiers: 0.85, ischio_jambiers: 0.30, adducteurs: 0.20 },
  "fentes-halteres": { quadriceps: 0.85, fessiers: 0.85, ischio_jambiers: 0.30, adducteurs: 0.20 },
  "fentes-barre": { quadriceps: 0.85, fessiers: 0.85, ischio_jambiers: 0.30, adducteurs: 0.20, lombaires: 0.25 },
  "squat-bulgare-halteres": { quadriceps: 0.90, fessiers: 0.90, ischio_jambiers: 0.30, adducteurs: 0.20 },
  "leg-extension": { quadriceps: 1.0 },
  "leg-curl-machine": { ischio_jambiers: 1.0 },
  "leg-curl-assis": { ischio_jambiers: 1.0 },
  "leg-curl-genoux": { ischio_jambiers: 1.0, fessiers: 0.30 },
  "souleve-terre-roumain-barre": { ischio_jambiers: 1.0, fessiers: 0.80, lombaires: 0.45, avant_bras: 0.25 },
  "souleve-terre-roumain-halteres": { ischio_jambiers: 1.0, fessiers: 0.75, lombaires: 0.40, avant_bras: 0.20 },
  "souleve-terre-barre": { fessiers: 0.85, ischio_jambiers: 0.70, lombaires: 0.75, haut_du_dos: 0.50, trapezes: 0.50, avant_bras: 0.40, quadriceps: 0.40 },
  "pont-fessier": { fessiers: 1.0, ischio_jambiers: 0.30, quadriceps: 0.20 },
  "extension-fessier-machine": { fessiers: 1.0, ischio_jambiers: 0.30 },
  "adducteurs-machine": { adducteurs: 1.0 },
  "abducteurs-machine": { fessiers: 0.70 },
  "mollets-debout": { mollets: 1.0 },
  "mollets-assis": { mollets: 1.0 },
  "mollets-presse": { mollets: 1.0 },
  "elevations-jambes-cote": { fessiers: 0.70 },

  /* ---- Tronc ---- */
  "crunch-sol": { abdominaux: 1.0 },
  "abdos-machine": { abdominaux: 1.0 },
  "releve-buste-banc-incline": { abdominaux: 1.0 },
  "releve-bassin-sol": { abdominaux: 0.90 },
  "releve-genoux": { abdominaux: 0.85, avant_bras: 0.20 },
  "releve-genoux-chaise": { abdominaux: 0.85 },
  "gainage-frontal": { abdominaux: 0.80, obliques: 0.30 },
  "gainage-lateral": { obliques: 1.0, abdominaux: 0.40 },
  "dead-bug": { abdominaux: 0.80, obliques: 0.25 },
  "obliques-torsions": { obliques: 1.0, abdominaux: 0.40 },
  "inclinaison-laterale-poulie": { obliques: 1.0, abdominaux: 0.40 },

  /* ---- Corps entier / cardio ---- */
  "burpees": { quadriceps: 0.55, pectoraux: 0.45, deltoide_anterieur: 0.40, triceps: 0.40, fessiers: 0.40, abdominaux: 0.35 },
  "rameur": { grand_dorsal: 0.50, haut_du_dos: 0.50, quadriceps: 0.45, biceps: 0.30, lombaires: 0.30 },
  "mobilite-hanches": {},
};

/* ============================ 2. FACTEUR DE FATIGUE PAR TYPE ============================ */

/**
 * Coût de récupération relatif selon la nature du mouvement. Calibration
 * logicielle, centralisée ici pour être ajustable d'un seul endroit.
 */
export const FACTEURS_FATIGUE = {
  isolation_machine: 0.85,
  isolation_libre: 0.90,
  polyarticulaire_machine: 1.00,
  polyarticulaire_libre: 1.10,
  axial_corps_entier: 1.20,
};

/** Exercices axiaux : charge sur la colonne, fatigue systémique marquée. */
const AXIAUX = new Set([
  "souleve-terre-barre", "squat-barre", "epaule-barre", "fentes-barre",
  "souleve-terre-roumain-barre", "t-barre", "developpe-nuque-barre",
]);

const MACHINES = new Set(["machine_leviers", "machine_guidee", "poulie", "smith"]);

/**
 * Classe un exercice pour lui attribuer son facteur de fatigue.
 * @returns {keyof typeof FACTEURS_FATIGUE}
 */
export function classerExercice(exo) {
  if (!exo) return "isolation_machine";
  if (AXIAUX.has(exo.id)) return "axial_corps_entier";
  const equip = exo.equipement || [];
  const surMachine = equip.length > 0 && equip.every((q) => MACHINES.has(q));
  const isolation = exo.typeExercice === "isolation"
    || ["isolation_jambe", "flexion_bras", "extension_bras"].includes(exo.patron);
  if (isolation) return surMachine ? "isolation_machine" : "isolation_libre";
  return surMachine ? "polyarticulaire_machine" : "polyarticulaire_libre";
}

/** Facteur de fatigue numérique d'un exercice. */
export function facteurFatigue(exo) {
  return FACTEURS_FATIGUE[classerExercice(exo)];
}

/* ============================ 3. DÉRIVATION AUTOMATIQUE ============================ */

/**
 * Construit des coefficients fins à partir des muscles grossiers du catalogue.
 * Utilisé pour tout exercice sans entrée explicite — c'est ce qui garantit
 * qu'aucun exercice n'a de muscles indéfinis.
 *
 * @param {any} exo exercice du catalogue
 * @returns {Record<string, number>}
 */
export function deriverCoefficients(exo) {
  if (!exo) return {};
  const out = {};
  const ajouter = (cle, poids) => {
    if (!poids || IGNORES.has(cle)) return;
    if (!CLES_MOTEUR.includes(cle)) return;
    out[cle] = Math.max(out[cle] || 0, Math.round(poids * 100) / 100);
  };
  const etaler = (muscleCatalogue, poids) => {
    if (IGNORES.has(muscleCatalogue)) return;
    const table = REPARTITION[muscleCatalogue];
    if (!table) { ajouter(muscleCatalogue, poids); return; }
    const part = table[exo.patron] || table.defaut;
    for (const [fin, w] of Object.entries(part)) ajouter(fin, poids * w);
  };
  // Principaux = 1.00, secondaires = 0.45, stabilisateurs = 0.20.
  for (const m of exo.musclesPrincipaux || []) etaler(m, 1.0);
  for (const m of exo.musclesSecondaires || []) etaler(m, 0.45);
  for (const m of exo.musclesStabilisateurs || []) etaler(m, 0.20);
  return out;
}

/**
 * Coefficients musculaires d'un exercice : explicites si connus, dérivés sinon.
 * Ne renvoie JAMAIS undefined (au pire un objet vide pour la mobilité pure).
 * @returns {Record<string, number>}
 */
export function coefficientsPour(exo) {
  if (!exo) return {};
  const id = typeof exo === "string" ? exo : exo.id;
  if (Object.prototype.hasOwnProperty.call(COEFFS_EXPLICITES, id)) return COEFFS_EXPLICITES[id];
  return deriverCoefficients(typeof exo === "string" ? null : exo);
}

/** Muscle principal (coefficient le plus haut) d'un exercice, ou null. */
export function musclePrincipalMoteur(exo) {
  const c = coefficientsPour(exo);
  let best = null, bv = 0;
  for (const [m, v] of Object.entries(c)) if (v > bv) { bv = v; best = m; }
  return best;
}
