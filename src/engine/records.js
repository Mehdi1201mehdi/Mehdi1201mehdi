// @ts-check
/**
 * Records personnels et estimation de 1RM.
 *
 * Fonctions PURES (aucun accès DOM/stockage). L'estimation du 1RM utilise la
 * formule d'EPLEY, indiquée explicitement à l'utilisateur :
 *     1RM estimé = charge × (1 + reps / 30)
 * C'est une estimation indicative — on ne teste jamais un vrai maximum en reprise.
 */

/** Formule affichée à l'utilisateur. */
export const FORMULE_1RM = "Epley : charge × (1 + répétitions / 30)";

/** 1RM estimé (Epley). 0 si entrées non valides. */
export function e1rmEpley(kg, reps) {
  const k = Number(kg), r = Number(reps);
  return (k > 0 && r > 0) ? k * (1 + r / 30) : 0;
}

/** Volume d'une série (charge × reps). Le poids du corps (0 kg) compte 0 en charge. */
function volSerie(s) {
  return (Number(s.chargeKg) || 0) * (Number(s.reps) || 0);
}

/**
 * Meilleures performances par exercice sur un ensemble de séances.
 * @param {any[]} logs
 * @returns {Record<string,{poidsMax:number, repsMax:number, e1rmMax:number, volMax:number, charge:number, reps:number}>}
 */
export function meilleursParExercice(logs) {
  /** @type {Record<string, any>} */
  const best = {};
  for (const l of logs || []) {
    for (const e of l.exercices || []) {
      const b = best[e.exerciceId] || { poidsMax: 0, repsMax: 0, e1rmMax: 0, volMax: 0, charge: 0, reps: 0 };
      for (const s of e.series || []) {
        const kg = Number(s.chargeKg) || 0, reps = Number(s.reps) || 0;
        if (reps <= 0 && !s.dureeSec) continue;
        if (kg > b.poidsMax) b.poidsMax = kg;
        if (reps > b.repsMax) b.repsMax = reps;
        const v = volSerie(s);
        if (v > b.volMax) b.volMax = v;
        const e1 = e1rmEpley(kg, reps);
        if (e1 > b.e1rmMax) { b.e1rmMax = e1; b.charge = kg; b.reps = reps; }
      }
      best[e.exerciceId] = b;
    }
  }
  return best;
}

/**
 * Classement des meilleurs 1RM estimés (pour l'affichage « Records »).
 * @param {any[]} logs
 * @param {(id:string)=>string} resoudreNom
 * @param {number} n
 */
export function classementRecords(logs, resoudreNom = (id) => id, n = 8) {
  const best = meilleursParExercice(logs);
  return Object.entries(best)
    .filter(([, b]) => b.e1rmMax > 0)
    .map(([id, b]) => ({ exerciceId: id, nom: resoudreNom(id), e1rm: Math.round(b.e1rmMax), charge: b.charge, reps: b.reps, poidsMax: b.poidsMax, repsMax: b.repsMax }))
    .sort((a, b) => b.e1rm - a.e1rm)
    .slice(0, n);
}

/**
 * Détecte les NOUVEAUX records apportés par une séance, comparés à l'historique
 * ANTÉRIEUR (sans cette séance). Renvoie une liste de records battus.
 *
 * @param {any[]} logsAnterieurs  historique AVANT la nouvelle séance
 * @param {any} nouveauLog        la séance qui vient d'être réalisée
 * @param {(id:string)=>string} [resoudreNom]
 * @returns {{exerciceId:string, nom:string, type:"poids"|"reps"|"1rm", valeur:number, ancien:number}[]}
 */
export function detecterRecords(logsAnterieurs, nouveauLog, resoudreNom = (id) => id) {
  const histo = meilleursParExercice(logsAnterieurs);
  const actuel = meilleursParExercice([nouveauLog]);
  /** @type {{exerciceId:string, nom:string, type:"1rm"|"poids"|"reps", valeur:number, ancien:number}[]} */
  const out = [];
  for (const exId of Object.keys(actuel)) {
    const a = actuel[exId];
    const h = histo[exId] || { poidsMax: 0, repsMax: 0, e1rmMax: 0 };
    // 1RM estimé : le record le plus parlant (charge ET reps combinées).
    if (a.e1rmMax > h.e1rmMax + 0.01 && a.e1rmMax > 0) {
      out.push({ exerciceId: exId, nom: resoudreNom(exId), type: "1rm", valeur: Math.round(a.e1rmMax), ancien: Math.round(h.e1rmMax) });
    } else if (a.poidsMax > h.poidsMax && a.poidsMax > 0) {
      // Charge maximale (utile si le 1RM estimé n'a pas progressé).
      out.push({ exerciceId: exId, nom: resoudreNom(exId), type: "poids", valeur: a.poidsMax, ancien: h.poidsMax });
    } else if (a.repsMax > h.repsMax && a.repsMax > 0 && a.poidsMax === 0) {
      // Répétitions maximales au poids du corps (calisthénie).
      out.push({ exerciceId: exId, nom: resoudreNom(exId), type: "reps", valeur: a.repsMax, ancien: h.repsMax });
    }
  }
  return out;
}
