// @ts-check
/**
 * CALCULATEURS DE FORCE — fonctions PURES, 100 % locales.
 *
 * Sept formules de 1RM plutôt qu'une, parce qu'elles ne sont pas d'accord entre
 * elles : sur une série de 8 répétitions l'écart atteint couramment 5 %. Donner
 * un seul chiffre laisserait croire à une précision qui n'existe pas. On rend
 * donc la MÉDIANE des formules et la fourchette qu'elles dessinent.
 *
 * Aucune de ces estimations n'est une mesure : ce sont des extrapolations
 * statistiques, d'autant plus fragiles que le nombre de répétitions est élevé.
 * Au-delà de 12 répétitions elles ne valent plus grand-chose, et le module le
 * dit explicitement plutôt que de rendre un nombre trompeur.
 */

import { arrondir } from "./powerlifting.js";

/* ============================ FORMULES DE 1RM ============================ */

/**
 * Les sept formules courantes. Chacune renvoie 0 pour une entrée inexploitable
 * plutôt qu'un NaN qui se propagerait dans l'affichage.
 * @type {{cle:string, nom:string, formule:string, fn:(kg:number,reps:number)=>number}[]}
 */
export const FORMULES = [
  { cle: "epley", nom: "Epley", formule: "kg × (1 + reps/30)", fn: (k, r) => k * (1 + r / 30) },
  { cle: "brzycki", nom: "Brzycki", formule: "kg × 36 / (37 − reps)", fn: (k, r) => (r < 37 ? k * 36 / (37 - r) : 0) },
  { cle: "lombardi", nom: "Lombardi", formule: "kg × reps^0,10", fn: (k, r) => k * Math.pow(r, 0.10) },
  { cle: "oconner", nom: "O'Conner", formule: "kg × (1 + 0,025 × reps)", fn: (k, r) => k * (1 + 0.025 * r) },
  { cle: "wathan", nom: "Wathan", formule: "100 kg / (48,8 + 53,8 e^−0,075 reps)", fn: (k, r) => 100 * k / (48.8 + 53.8 * Math.exp(-0.075 * r)) },
  { cle: "lander", nom: "Lander", formule: "100 kg / (101,3 − 2,671 × reps)", fn: (k, r) => (r < 37 ? 100 * k / (101.3 - 2.67123 * r) : 0) },
  { cle: "mayhew", nom: "Mayhew", formule: "100 kg / (52,2 + 41,9 e^−0,055 reps)", fn: (k, r) => 100 * k / (52.2 + 41.9 * Math.exp(-0.055 * r)) },
];

/** Au-delà, une estimation de 1RM n'a plus de valeur pratique. */
export const REPS_FIABLES_MAX = 12;

/** Médiane d'une liste de nombres (robuste aux formules aberrantes). */
export function mediane(valeurs) {
  const v = (valeurs || []).filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!v.length) return 0;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/**
 * 1RM selon TOUTES les formules, plus le consensus et sa fourchette.
 *
 * @param {number} kg    charge de la série
 * @param {number} reps  répétitions réalisées
 * @param {number} [pas] arrondi des charges (2,5 kg par défaut)
 * @returns {{valide:boolean, fiable:boolean, consensus:number, min:number, max:number,
 *            ecartPct:number, detail:{cle:string,nom:string,formule:string,kg:number}[],
 *            avertissement:string|null}}
 */
export function estimer1RMComplet(kg, reps, pas = 2.5) {
  const k = Number(kg), r = Math.round(Number(reps));
  const vide = {
    valide: false, fiable: false, consensus: 0, min: 0, max: 0, ecartPct: 0, detail: [],
    avertissement: null,
  };
  if (!(k > 0) || !(r > 0)) return vide;
  // Une série d'une répétition EST le maximum : aucune formule n'a à intervenir.
  if (r === 1) {
    return {
      valide: true, fiable: true, consensus: arrondir(k, pas), min: k, max: k, ecartPct: 0,
      detail: FORMULES.map((f) => ({ cle: f.cle, nom: f.nom, formule: f.formule, kg: arrondir(k, pas) })),
      avertissement: null,
    };
  }
  const detail = FORMULES.map((f) => {
    const v = f.fn(k, r);
    return { cle: f.cle, nom: f.nom, formule: f.formule, kg: Number.isFinite(v) && v > 0 ? arrondir(v, 0.5) : 0 };
  }).filter((d) => d.kg > 0);
  const vals = detail.map((d) => d.kg);
  const consensus = arrondir(mediane(vals), pas);
  const min = Math.min(...vals), max = Math.max(...vals);
  return {
    valide: consensus > 0,
    fiable: r <= REPS_FIABLES_MAX,
    consensus, min, max,
    ecartPct: consensus > 0 ? Math.round(((max - min) / consensus) * 1000) / 10 : 0,
    detail,
    avertissement: r > REPS_FIABLES_MAX
      ? `Au-delà de ${REPS_FIABLES_MAX} répétitions, l'estimation devient très approximative : refais le calcul sur une série plus lourde.`
      : null,
  };
}

/* ======================= POURCENTAGES ET RÉPÉTITIONS ======================= */

/**
 * Part du 1RM correspondant à une série menée à l'échec de `reps` répétitions
 * (inverse de Brzycki, la plus stable sur 1–12).
 * @returns {number} pourcentage 0–100
 */
export function pctPourReps(reps) {
  const r = Math.round(Number(reps));
  if (!(r > 0)) return 0;
  if (r === 1) return 100;
  if (r >= 37) return 0;
  return Math.round(((37 - r) / 36) * 1000) / 10;
}

/** Répétitions théoriquement possibles à une charge donnée (borné à 1–30). */
export function repsPourCharge(rm, kg) {
  const m = Number(rm), k = Number(kg);
  if (!(m > 0) || !(k > 0) || k > m) return k > m ? 0 : 0;
  const r = 37 - 36 * (k / m);
  return Math.max(1, Math.min(30, Math.round(r)));
}

/** Charge de travail permettant `reps` répétitions à partir d'un 1RM. */
export function chargePourReps(rm, reps, pas = 2.5) {
  const pct = pctPourReps(reps);
  if (!pct) return 0;
  return arrondir((Number(rm) || 0) * pct / 100, pas);
}

/* ============================ ZONES DE TRAVAIL ============================ */

/**
 * Zones d'entraînement classiques. Les bornes sont des repères de
 * programmation, pas des frontières physiologiques.
 */
export const ZONES = [
  { cle: "force_max", nom: "Force maximale", pct: [90, 100], reps: [1, 3], reposSec: 240, but: "Recrutement nerveux, technique lourde" },
  { cle: "force", nom: "Force", pct: [85, 90], reps: [3, 6], reposSec: 180, but: "Progression en charge" },
  { cle: "hypertrophie", nom: "Hypertrophie", pct: [67, 85], reps: [6, 12], reposSec: 120, but: "Volume et prise de muscle" },
  { cle: "endurance", nom: "Endurance de force", pct: [50, 67], reps: [12, 20], reposSec: 75, but: "Résistance, congestion, technique" },
];

/**
 * Charges par zone à partir d'un 1RM.
 * @returns {{cle:string, nom:string, kgMin:number, kgMax:number, reps:number[], reposSec:number, but:string}[]}
 */
export function chargesParZone(rm, pas = 2.5) {
  const base = Number(rm) || 0;
  return ZONES.map((z) => ({
    cle: z.cle, nom: z.nom,
    kgMin: arrondir(base * z.pct[0] / 100, pas),
    kgMax: arrondir(base * z.pct[1] / 100, pas),
    reps: z.reps, reposSec: z.reposSec, but: z.but,
  }));
}

/** Table complète des pourcentages, avec les répétitions attendues. */
export function tableComplete(rm, pas = 2.5) {
  const base = Number(rm) || 0;
  const pcts = [100, 95, 92.5, 90, 87.5, 85, 80, 75, 70, 65, 60, 55, 50];
  return pcts.map((pct) => ({
    pct,
    kg: arrondir(base * pct / 100, pas),
    reps: repsPourCharge(100, pct),   // même échelle : % ↔ répétitions
  }));
}

/* ================================= RPE ================================= */

/**
 * Charge correspondant à `reps` répétitions à un RPE donné.
 *
 * Principe : un RPE de 8 signifie « il me restait 2 répétitions ». La série
 * équivaut donc à une série à l'échec de reps + RIR, dont on connaît le
 * pourcentage de 1RM. C'est la lecture usuelle des tables RPE, obtenue ici sans
 * table codée en dur.
 *
 * @param {number} rm
 * @param {number} reps répétitions prévues
 * @param {number} rpe  1 à 10
 */
export function chargePourRPE(rm, reps, rpe, pas = 2.5) {
  const r = Math.round(Number(reps)), e = Number(rpe);
  if (!(r > 0) || !(e > 0) || e > 10) return 0;
  const rir = Math.max(0, 10 - e);
  return chargePourReps(rm, r + rir, pas);
}

/** Pourcentage de 1RM d'une série `reps` @ `rpe`. */
export function pctPourRPE(reps, rpe) {
  const r = Math.round(Number(reps)), e = Number(rpe);
  if (!(r > 0) || !(e > 0) || e > 10) return 0;
  return pctPourReps(r + Math.max(0, 10 - e));
}

/* ===================== DEPUIS L'HISTORIQUE RÉEL ===================== */

/**
 * Meilleure série enregistrée par exercice, avec le 1RM qu'elle implique.
 * Sert à pré-remplir les calculateurs avec les vraies performances plutôt que
 * de demander de retaper des chiffres déjà connus de l'application.
 *
 * @param {any[]} logs
 * @param {(id:string)=>any} getExercise
 * @param {number} [limite] nombre d'exercices rendus
 * @returns {{exerciceId:string, nom:string, kg:number, reps:number, rm:number, date:string}[]}
 */
export function meilleuresSeries(logs, getExercise, limite = 12) {
  /** @type {Record<string, any>} */
  const best = {};
  for (const l of logs || []) {
    for (const ex of l.exercices || []) {
      const id = ex && ex.exerciceId;
      if (!id) continue;
      for (const s of ex.series || []) {
        const kg = Number(s.chargeKg), reps = Number(s.reps);
        if (!(kg > 0) || !(reps > 0)) continue;
        const rm = estimer1RMComplet(kg, reps).consensus;
        if (!rm) continue;
        if (!best[id] || rm > best[id].rm) {
          const exo = getExercise ? getExercise(id) : null;
          best[id] = { exerciceId: id, nom: (exo && exo.nom) || id, kg, reps, rm, date: l.date };
        }
      }
    }
  }
  return Object.values(best).sort((a, b) => b.rm - a.rm).slice(0, Math.max(0, limite));
}

/**
 * Ratios de force entre mouvements. Repères indicatifs largement admis, utiles
 * pour repérer un déséquilibre — pas pour se juger.
 *
 * Les identifiants sont ceux du catalogue et sont vérifiés par un test : un
 * ratio qui pointerait vers un exercice inexistant ne se calculerait jamais et
 * disparaîtrait silencieusement de l'écran.
 */
export const RATIOS_REFERENCE = [
  { a: "developpe-couche-barre", b: "squat-barre", nom: "Développé / Squat", cible: 0.75, tolerance: 0.1 },
  { a: "souleve-terre-barre", b: "squat-barre", nom: "Soulevé de terre / Squat", cible: 1.2, tolerance: 0.15 },
  { a: "rowing-barre", b: "developpe-couche-barre", nom: "Rowing / Développé", cible: 0.9, tolerance: 0.12 },
];

/**
 * Compare les 1RM disponibles aux ratios de référence.
 * N'invente rien : un ratio dont l'un des deux mouvements manque est ignoré.
 * @returns {{nom:string, ratio:number, cible:number, ecart:number, verdict:string}[]}
 */
export function equilibreForce(meilleures) {
  const parId = Object.fromEntries((meilleures || []).map((m) => [m.exerciceId, m.rm]));
  const out = [];
  for (const r of RATIOS_REFERENCE) {
    const a = parId[r.a], b = parId[r.b];
    if (!(a > 0) || !(b > 0)) continue;
    const ratio = Math.round((a / b) * 100) / 100;
    const ecart = Math.round((ratio - r.cible) * 100) / 100;
    out.push({
      nom: r.nom, ratio, cible: r.cible, ecart,
      verdict: Math.abs(ecart) <= r.tolerance ? "équilibré" : ecart > 0 ? "en avance" : "en retard",
    });
  }
  return out;
}
