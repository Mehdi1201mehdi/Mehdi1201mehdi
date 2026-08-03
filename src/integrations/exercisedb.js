// @ts-check
/**
 * Adaptateur ExerciseDB — récupère un GIF de démonstration pour un exercice.
 * Source gratuite sans clé : oss.exercisedb.dev (attribution requise).
 * Repli RapidAPI si une clé est fournie. Dégradation propre hors ligne.
 *
 * `fetchImpl` est injectable pour permettre des tests hors ligne.
 */
import { getExercise } from "../data/exercises.js";

/** Terme de recherche anglais par exercice (nos ids → vocabulaire ExerciseDB). */
export const TERMES = {
  "squat-poids-du-corps": "squat", "goblet-squat": "dumbbell goblet squat",
  "squat-barre": "barbell full squat", "presse-cuisses": "sled leg press",
  "pont-fessier": "glute bridge", "souleve-terre-roumain-halteres": "dumbbell romanian deadlift",
  "souleve-terre-roumain-barre": "barbell romanian deadlift", "leg-curl-machine": "lever leg curl",
  "fente-poids-du-corps": "bodyweight lunge", "squat-bulgare-halteres": "dumbbell single leg split squat",
  "mollets-debout": "standing calf raise", "pompes": "push up",
  "developpe-couche-halteres": "dumbbell bench press", "developpe-couche-barre": "barbell bench press",
  "ecarte-poulie": "cable cross over", "pompes-piquees": "pike push up",
  "developpe-epaules-halteres": "dumbbell shoulder press", "elevations-laterales-halteres": "dumbbell lateral raise",
  "tractions": "pull up", "tirage-vertical-poulie": "cable lat pulldown",
  "rowing-inverse": "inverted row", "rowing-haltere-unilateral": "dumbbell one arm row",
  "rowing-barre": "barbell bent over row", "face-pull-elastique": "cable face pull",
  "curl-halteres": "dumbbell biceps curl", "extension-triceps-poulie": "cable pushdown",
  "dips-banc": "triceps dip", "gainage-frontal": "front plank", "gainage-lateral": "side plank",
  "dead-bug": "dead bug", "releve-genoux": "hanging leg raise", "burpees": "burpee",
  "rameur": "rowing machine", "mobilite-hanches": "hip circle",
  "rowing-halteres-buste-penche": "dumbbell bent over row", "developpe-sol-halteres": "dumbbell floor press",
  "superman": "superman",

  /* --- Mouvements de salle restés SANS démonstration ---------------------
     Le moteur de correspondance compare des noms : « Développé incliné
     (barre) » ne rencontrera jamais « barbell incline bench press ». Sans ces
     traductions, la moitié du catalogue restait muette — dont le SOULEVÉ DE
     TERRE, mouvement de base s'il en est. Termes relevés sur les noms réels du
     dataset, pas devinés. */
  "souleve-terre-barre": "barbell deadlift",
  "developpe-incline-barre": "barbell incline bench press",
  "developpe-incline-halteres": "dumbbell incline bench press",
  "developpe-couche-prise-serree": "barbell close grip bench press",
  "ecarte-couche-halteres": "dumbbell fly",
  "butterfly": "lever pec deck fly",
  "butterfly-inverse": "lever reverse fly",
  "presse-pectorale": "lever chest press",
  "poulie-vis-a-vis": "cable cross-over",
  "pullover-haltere": "dumbbell pullover",
  "t-barre": "lever t-bar row",
  "rowing-machine-assis": "lever seated row",
  "tirage-vertical-serre": "cable close grip pulldown",
  "tirage-vertical-nuque": "cable wide grip rear pulldown behind neck",
  "retropulsion-poulie": "cable straight arm pulldown",
  "extension-lombaire-banc": "hyperextension",
  "shrugs": "barbell shrug",
  "presse-epaules": "lever shoulder press",
  "developpe-nuque-barre": "smith behind neck press",
  "rowing-menton-poulie": "cable upright row",
  "elevations-frontales": "dumbbell front raise",
  "elevations-posterieures": "dumbbell rear delt raise",
  "oiseaux-face-sol": "dumbbell rear delt raise",
  "fentes-barre": "barbell lunge",
  "fentes-halteres": "dumbbell lunge",
  "adducteurs-machine": "lever seated hip adduction",
  "abducteurs-machine": "lever seated hip abduction",
  "mollets-assis": "lever seated calf raise",
  "mollets-presse": "sled calf press on leg press",
  "curl-pronation": "barbell reverse curl",
  "curl-marteau": "dumbbell hammer curl",
  "curl-concentre": "dumbbell concentration curl",
  "curl-pupitre": "barbell preacher curl",
  "curl-poulie": "cable curl",
  "barre-au-front": "barbell lying triceps extension skull crusher",
  "kick-back": "dumbbell kickback",
  "dips-barres-paralleles": "triceps dip",
  "pompes-serrees": "close grip push up",
  "releve-bassin-sol": "lying leg hip raise",
  "releve-buste-banc-incline": "incline sit up",
  "abdos-machine": "lever seated crunch",
  "inclinaison-laterale-poulie": "cable side bend",
  "releve-genoux-chaise": "captains chair leg raise",
  "elevations-jambes-cote": "side lying hip abduction",
  "epaule-barre": "barbell clean and press",

  /* --- Correspondances FAUSSES corrigées ---------------------------------
     Le repli par recouvrement de mots produit parfois une association absurde
     que rien ne signale : six exercices d'abdominaux montraient une animation
     de COURSE À PIED (dataset 0685 « run »), et l'extension triceps montrait un
     burpee. Une démonstration fausse est pire que pas de démonstration — on
     apprend le mauvais geste. */
  "crunch-sol": "crunch floor",
  "wger-401989e0-crunches-on-machine": "lever seated crunch",
  "wger-2ac901e6-abdominal-crunch": "crunch floor",
  "wger-7870ad8d-3008-abdominal-crunch": "crunch floor",
  "wger-fcf5039b-bicycle-crunches": "band bicycle crunch",
  "wger-346634cf-medicine-ball-booklet-crunch": "crunch (hands overhead)",
  "wger-9c979645-lying-triceps-kickback": "dumbbell kickback",
};

/** Terme de recherche pour un exercice (repli sur son nom). */
export function termePour(exId) {
  return TERMES[exId] || (getExercise(exId)?.nom ?? exId);
}

/** Lien YouTube de secours (toujours disponible, ouvre une recherche). */
export function lienYouTube(exId) {
  const exo = getExercise(exId);
  const q = (exo?.nom || exId) + " technique";
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(q);
}

/**
 * Extrait le premier résultat exploitable d'une réponse ExerciseDB.
 * Tolère plusieurs formes de payload. Fonction PURE (testable hors ligne).
 * @returns {{gifUrl:string, name:string, instructions:string[]}|null}
 */
export function parseReponse(json) {
  const list = (json && ((json.data && json.data.exercises) || json.data || json.exercises || json)) || [];
  const arr = Array.isArray(list) ? list : [];
  const trouve = arr.find((x) => x && (x.gifUrl || x.imageUrl));
  if (!trouve) return null;
  return {
    gifUrl: trouve.gifUrl || trouve.imageUrl,
    name: trouve.name || "",
    instructions: Array.isArray(trouve.instructions) ? trouve.instructions.slice(0, 4) : [],
  };
}

function avecTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

/**
 * Cherche une démonstration pour un exercice.
 * @param {string} exId
 * @param {{rapidKey?:string, fetchImpl?:typeof fetch, timeout?:number}} [opts]
 * @returns {Promise<{gifUrl:string, name:string, instructions:string[]}|null>}
 */
export async function chercherDemonstration(exId, opts = {}) {
  const f = opts.fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
  if (!f) return null;
  const terme = termePour(exId);
  const timeout = opts.timeout || 7000;

  // 1) Source gratuite sans clé
  try {
    const r = await avecTimeout(f(`https://oss.exercisedb.dev/api/v1/exercises/search?q=${encodeURIComponent(terme)}&limit=3`), timeout);
    const j = await r.json();
    const res = parseReponse(j);
    if (res) return res;
  } catch (e) { /* hors ligne ou service indisponible */ }

  // 2) Repli RapidAPI si une clé est disponible
  if (opts.rapidKey) {
    try {
      const r = await avecTimeout(f(`https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(terme)}?limit=3`, {
        headers: { "X-RapidAPI-Key": opts.rapidKey, "X-RapidAPI-Host": "exercisedb.p.rapidapi.com" },
      }), timeout);
      const j = await r.json();
      const res = parseReponse(j);
      if (res) return res;
    } catch (e) { /* ignore */ }
  }
  return null;
}
