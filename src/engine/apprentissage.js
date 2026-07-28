// @ts-check
/**
 * APPRENTISSAGE LOCAL du moteur de récupération.
 *
 * Le modèle de fatigue part de demi-vies génériques (`fatigue.js`). Ce module
 * les recalibre à partir de ce qui a RÉELLEMENT été observé dans l'historique
 * de l'utilisateur : quand il revient tôt sur un muscle, sa performance
 * tient-elle ou s'effondre-t-elle ?
 *
 *   - performance qui chute après un retour rapide  → il récupère plus
 *     lentement que le modèle générique → demi-vie allongée ;
 *   - performance qui tient ou progresse            → il récupère plus vite
 *     → demi-vie raccourcie.
 *
 * Trois garde-fous, parce qu'un modèle qui s'ajuste sur du bruit est pire que
 * pas de modèle du tout :
 *   1. rien n'est appliqué en dessous de `MIN_OBS` observations ;
 *   2. la correction est bornée à ±`BORNE` ;
 *   3. seules les paires de séances séparées de moins de `SEUIL_COURT_H`
 *      informent, car au-delà tout le monde a récupéré et l'écart de
 *      performance ne dit plus rien sur la récupération.
 *
 * AUCUNE grandeur physiologique n'est mesurée ici : c'est un ajustement
 * empirique de constantes d'affichage et de planification.
 */

import { musclePrincipalMoteur } from "../data/exercise-muscle-map.js";
import { CLES_MOTEUR } from "../data/muscles-moteur.js";

export const PARAMS_APPRENTISSAGE = {
  MIN_OBS: 4,           // nombre minimal d'observations avant toute correction
  OBS_PLEINE: 12,       // au-delà, la correction est appliquée à 100 %
  BORNE: 0.30,          // correction maximale : ±30 % de la demi-vie
  SEUIL_COURT_H: 72,    // « revenir tôt » sur un muscle
  SEUIL_PERF: 0.02,     // ±2 % : en deçà, la performance est considérée stable
  FENETRE_JOURS: 120,   // on n'apprend que sur l'historique récent
  SENSIBILITE: 2.2,     // conversion écart de performance → correction
};

/**
 * Charge maximale estimée d'une série (Epley). Sert d'indicateur de
 * performance comparable d'une séance à l'autre pour un même exercice.
 */
export function perfSerie(serie) {
  if (!serie) return null;
  const kg = Number(serie.chargeKg);
  const reps = Number(serie.reps);
  if (Number.isFinite(kg) && kg > 0 && Number.isFinite(reps) && reps > 0) {
    return kg * (1 + reps / 30);
  }
  // Exercice au poids du corps ou chronométré : les répétitions / secondes
  // font office d'indicateur, à défaut de charge.
  if (Number.isFinite(reps) && reps > 0) return reps;
  const sec = Number(serie.dureeSec);
  if (Number.isFinite(sec) && sec > 0) return sec;
  return null;
}

/** Meilleure performance d'un exercice dans une séance. */
export function perfExercice(ex) {
  const vals = ((ex && ex.series) || []).map(perfSerie).filter((v) => v != null);
  return vals.length ? Math.max(...vals) : null;
}

/**
 * Observations exploitables : couples de séances consécutives contenant le même
 * exercice, séparées de moins de `SEUIL_COURT_H` heures.
 *
 * @param {any[]} logs
 * @param {(id:string)=>any} getExercise
 * @param {number} [maintenant]
 * @returns {{muscle:string, dtH:number, ecart:number, exerciceId:string}[]}
 */
export function observations(logs, getExercise, maintenant = Date.now()) {
  const P = PARAMS_APPRENTISSAGE;
  const debut = maintenant - P.FENETRE_JOURS * 864e5;
  const tries = (logs || [])
    .filter((l) => l && l.date && Number.isFinite(Date.parse(l.date)))
    .filter((l) => Date.parse(l.date) >= debut && Date.parse(l.date) <= maintenant)
    .slice()
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  /** dernière apparition de chaque exercice : { t, perf } */
  const vu = new Map();
  const out = [];
  for (const log of tries) {
    const t = Date.parse(log.date);
    for (const ex of log.exercices || []) {
      const id = ex && ex.exerciceId;
      if (!id) continue;
      const perf = perfExercice(ex);
      const prec = vu.get(id);
      if (perf != null) vu.set(id, { t, perf });
      if (!prec || perf == null || !(prec.perf > 0)) continue;
      const dtH = (t - prec.t) / 36e5;
      if (dtH <= 0 || dtH > P.SEUIL_COURT_H) continue;
      const exo = getExercise(id);
      const muscle = exo ? musclePrincipalMoteur(exo) : null;
      if (!muscle) continue;
      out.push({ muscle, dtH, ecart: (perf - prec.perf) / prec.perf, exerciceId: id });
    }
  }
  return out;
}

/**
 * Facteur multiplicatif à appliquer à la demi-vie de chaque muscle.
 * 1 = aucun ajustement (défaut et cas « pas assez de données »).
 *
 * @param {any[]} logs
 * @param {(id:string)=>any} getExercise
 * @param {number} [maintenant]
 * @returns {Record<string, number>}
 */
export function facteursRecuperation(logs, getExercise, maintenant = Date.now()) {
  const P = PARAMS_APPRENTISSAGE;
  const obs = observations(logs, getExercise, maintenant);
  /** @type {Record<string, number[]>} */
  const parMuscle = {};
  for (const o of obs) (parMuscle[o.muscle] ||= []).push(o.ecart);

  /** @type {Record<string, number>} */
  const out = {};
  for (const cle of CLES_MOTEUR) out[cle] = 1;
  for (const [muscle, ecarts] of Object.entries(parMuscle)) {
    if (out[muscle] == null || ecarts.length < P.MIN_OBS) continue;
    const moy = ecarts.reduce((a, b) => a + b, 0) / ecarts.length;
    if (Math.abs(moy) < P.SEUIL_PERF) continue;   // performance stable : rien à corriger
    // Chute de performance (moy < 0) → récupération plus lente → facteur > 1.
    // La confiance monte progressivement avec le nombre d'observations : une
    // poignée de séances ne doit pas produire la correction maximale.
    const confiance = Math.min(1, (ecarts.length - P.MIN_OBS) / (P.OBS_PLEINE - P.MIN_OBS) * 0.75 + 0.25);
    const brut = -moy * P.SENSIBILITE * confiance;
    out[muscle] = 1 + Math.max(-P.BORNE, Math.min(P.BORNE, brut));
  }
  return out;
}

/**
 * Version lisible de ce que le moteur a appris, pour l'afficher : jamais de
 * correction silencieuse sur un modèle que l'utilisateur ne peut pas inspecter.
 *
 * @returns {{muscle:string, n:number, facteur:number, sens:string, ecartMoyen:number}[]}
 */
export function expliquerApprentissage(logs, getExercise, maintenant = Date.now()) {
  const obs = observations(logs, getExercise, maintenant);
  const facteurs = facteursRecuperation(logs, getExercise, maintenant);
  /** @type {Record<string, number[]>} */
  const parMuscle = {};
  for (const o of obs) (parMuscle[o.muscle] ||= []).push(o.ecart);
  return Object.entries(parMuscle)
    .filter(([m]) => facteurs[m] != null && Math.abs(facteurs[m] - 1) > 0.005)
    .map(([muscle, ecarts]) => ({
      muscle,
      n: ecarts.length,
      facteur: Math.round(facteurs[muscle] * 100) / 100,
      sens: facteurs[muscle] > 1 ? "plus lente" : "plus rapide",
      ecartMoyen: Math.round((ecarts.reduce((a, b) => a + b, 0) / ecarts.length) * 1000) / 10,
    }))
    .sort((a, b) => Math.abs(b.facteur - 1) - Math.abs(a.facteur - 1));
}
