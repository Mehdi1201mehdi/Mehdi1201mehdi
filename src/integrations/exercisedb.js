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
