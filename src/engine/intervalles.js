// @ts-check
/**
 * Minuteur d'intervalles : EMOM, Tabata, travail / repos libres. Fonctions
 * PURES : l'état se DÉDUIT de l'instant de départ et de l'heure courante, rien
 * n'est décompté à la main — un téléphone qui met l'onglet en veille ne fait
 * donc pas dériver le minuteur (même principe que le minuteur de repos).
 *
 * EMOM (« every minute on the minute ») : au début de chaque minute, on fait
 * les répétitions prévues ; le temps restant de la minute est le repos. Un tour
 * = 60 s de « travail » sans repos séparé.
 */

/** Préréglages proposés (durées en secondes). */
export const PRESETS_INTERVALLES = [
  { cle: "emom10", nom: "EMOM 10 min", tours: 10, travailSec: 60, reposSec: 0 },
  { cle: "emom20", nom: "EMOM 20 min", tours: 20, travailSec: 60, reposSec: 0 },
  { cle: "tabata", nom: "Tabata (8 × 20 s / 10 s)", tours: 8, travailSec: 20, reposSec: 10 },
  { cle: "e2mom", nom: "Toutes les 2 min × 6", tours: 6, travailSec: 120, reposSec: 0 },
];

/**
 * Normalise une configuration saisie (bornes raisonnables, entiers).
 * @param {{tours?:any, travailSec?:any, reposSec?:any}} c
 */
export function normaliserIntervalle(c) {
  const ent = (v, min, max, def) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  return {
    tours: ent(c && c.tours, 1, 99, 10),
    travailSec: ent(c && c.travailSec, 5, 600, 60),
    reposSec: ent(c && c.reposSec, 0, 600, 0),
  };
}

/** Durée totale en secondes (le dernier repos n'est pas compté). */
export function dureeTotaleIntervalle(c) {
  const n = normaliserIntervalle(c);
  return n.tours * n.travailSec + (n.tours - 1) * n.reposSec;
}

/**
 * État du minuteur à un instant donné.
 * @param {{tours:number, travailSec:number, reposSec:number}} c
 * @param {number} debutMs
 * @param {number} maintenantMs
 * @returns {{phase:"travail"|"repos"|"fini", tour:number, tours:number, restantSec:number, ecouleSec:number, totalSec:number}}
 */
export function etatIntervalle(c, debutMs, maintenantMs) {
  const n = normaliserIntervalle(c);
  const total = dureeTotaleIntervalle(n);
  const t = Math.max(0, (maintenantMs - debutMs) / 1000);
  if (t >= total) return { phase: "fini", tour: n.tours, tours: n.tours, restantSec: 0, ecouleSec: total, totalSec: total };
  const cycle = n.travailSec + n.reposSec;
  const k = Math.floor(t / cycle);
  const dans = t - k * cycle;
  const enTravail = dans < n.travailSec;
  return {
    phase: enTravail ? "travail" : "repos",
    tour: k + 1,
    tours: n.tours,
    restantSec: Math.ceil(enTravail ? n.travailSec - dans : cycle - dans),
    ecouleSec: Math.floor(t),
    totalSec: total,
  };
}
