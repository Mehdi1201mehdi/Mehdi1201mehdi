// @ts-check
/**
 * Statistiques d'entraînement — fonctions PURES (aucun DOM/stockage).
 * Volume = somme de (charge × répétitions) sur toutes les séries.
 */
import { e1rmEpley } from "./records.js";

/** Lundi (YYYY-MM-DD) de la semaine ISO contenant `dateStr`. */
export function lundiDe(dateStr) {
  const d = new Date(dateStr);
  const iso = (d.getUTCDay() + 6) % 7; // 0 = lundi
  d.setUTCDate(d.getUTCDate() - iso);
  return d.toISOString().slice(0, 10);
}

/** Volume total d'une séance (kg). */
export function volumeLog(log) {
  let v = 0;
  for (const e of (log && log.exercices) || []) {
    for (const s of e.series || []) v += (Number(s.chargeKg) || 0) * (Number(s.reps) || 0);
  }
  return v;
}

/** Volume cumulé sur une liste de séances. */
export function volumeTotal(logs) {
  return (logs || []).reduce((a, l) => a + volumeLog(l), 0);
}

/**
 * Volume par semaine (8 dernières), pour l'histogramme.
 * @returns {{x:string, v:number, iso:string}[]}
 */
export function volumeParSemaine(logs, nbSemaines = 8) {
  const m = new Map();
  for (const l of logs || []) { const k = lundiDe(l.date); m.set(k, (m.get(k) || 0) + volumeLog(l)); }
  return [...m.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .slice(-nbSemaines)
    .map(([k, val]) => ({ iso: k, x: new Date(k).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), v: Math.round(val) }));
}

/** Durée moyenne des séances (minutes), sur celles qui ont une durée mesurée. */
export function dureeMoyenneMin(logs) {
  const durees = (logs || []).map((l) => Number(l.dureeSec)).filter((d) => Number.isFinite(d) && d > 0);
  if (!durees.length) return null;
  const moy = durees.reduce((a, d) => a + d, 0) / durees.length;
  return Math.round(moy / 60);
}

/**
 * Répartition du volume par groupe musculaire principal.
 * @param {any[]} logs
 * @param {(id:string)=>any} getExercise
 * @returns {{muscle:string, v:number}[]} trié décroissant
 */
export function volumeParMuscle(logs, getExercise) {
  const par = new Map();
  for (const l of logs || []) {
    for (const e of l.exercices || []) {
      const exo = getExercise(e.exerciceId);
      const muscles = (exo && exo.musclesPrincipaux) || [];
      if (!muscles.length) continue;
      let vol = 0;
      for (const s of e.series || []) vol += (Number(s.chargeKg) || 0) * (Number(s.reps) || 0);
      // Poids du corps (0 kg) : on compte les répétitions comme charge unitaire,
      // sinon la calisthénie n'apparaîtrait jamais dans la répartition.
      if (vol === 0) for (const s of e.series || []) vol += Number(s.reps) || 0;
      const part = vol / muscles.length; // réparti entre les muscles principaux
      for (const m of muscles) par.set(m, (par.get(m) || 0) + part);
    }
  }
  return [...par.entries()]
    .map(([muscle, v]) => ({ muscle, v: Math.round(v) }))
    .sort((a, b) => b.v - a.v);
}

/**
 * Récupération musculaire estimée par groupe. Uniquement à partir des vraies
 * séances : on relève, pour chaque muscle sollicité (principal OU secondaire),
 * la date la plus récente, puis on convertit « temps écoulé » → « % de
 * récupération » (récupération complète ≈ `joursRecup` jours). Aucune donnée
 * inventée : c'est une simple lecture du temps écoulé depuis la dernière fois.
 * @returns {{muscle:string, pct:number, jours:number}[]} trié du plus frais au plus fatigué
 */
export function recuperationParMuscle(logs, getExercise, now = Date.now(), joursRecup = 3) {
  const dernier = new Map(); // muscle -> timestamp le plus récent
  for (const l of logs || []) {
    const t = Date.parse(l.date);
    if (!Number.isFinite(t)) continue;
    for (const e of l.exercices || []) {
      const exo = getExercise(e.exerciceId);
      if (!exo) continue;
      const muscles = [...(exo.musclesPrincipaux || []), ...(exo.musclesSecondaires || [])];
      for (const m of muscles) if (!dernier.has(m) || t > dernier.get(m)) dernier.set(m, t);
    }
  }
  const fenetre = Math.max(1, joursRecup) * 864e5;
  return [...dernier.entries()].map(([muscle, t]) => {
    const depuis = Math.max(0, now - t);
    return { muscle, pct: Math.max(0, Math.min(100, Math.round((depuis / fenetre) * 100))), jours: depuis / 864e5 };
  }).sort((a, b) => b.pct - a.pct);
}

/** Métriques disponibles pour un exercice dans les graphiques. */
export const METRIQUES_EXO = /** @type {const} */ ([
  { cle: "1rm", label: "1RM estimé (kg)" },
  { cle: "poids", label: "Poids max (kg)" },
  { cle: "volume", label: "Volume (kg)" },
  { cle: "reps", label: "Reps max" },
]);

/**
 * Série temporelle d'un exercice pour une métrique donnée : un point par séance
 * où l'exercice apparaît.
 * @param {any[]} logs
 * @param {string} exerciceId
 * @param {"1rm"|"poids"|"volume"|"reps"} metrique
 * @returns {{iso:string, v:number}[]}
 */
export function serieExercice(logs, exerciceId, metrique) {
  const pts = [];
  for (const l of logs || []) {
    const exs = (l.exercices || []).filter((e) => e.exerciceId === exerciceId);
    if (!exs.length) continue;
    let v = 0;
    for (const e of exs) {
      for (const s of e.series || []) {
        const kg = Number(s.chargeKg) || 0, reps = Number(s.reps) || 0;
        if (metrique === "poids") v = Math.max(v, kg);
        else if (metrique === "reps") v = Math.max(v, reps);
        else if (metrique === "1rm") v = Math.max(v, e1rmEpley(kg, reps));
        else v += kg * reps; // volume
      }
    }
    pts.push({ iso: l.date, v: Math.round(v * 10) / 10 });
  }
  return pts.sort((a, b) => (a.iso < b.iso ? -1 : 1));
}

/**
 * Série temporelle d'une mesure corporelle (poids, tour de taille, etc.).
 * @param {any[]} metrics
 * @param {string} champ  clé dans l'objet mesure (poidsKg, taille, poitrine…)
 */
export function serieCorps(metrics, champ) {
  return (metrics || [])
    .filter((m) => m[champ] != null)
    .map((m) => ({ iso: m.date, v: Number(m[champ]) }))
    .sort((a, b) => (a.iso < b.iso ? -1 : 1));
}

/**
 * Ne garde que les points des `jours` derniers jours (0 = tout l'historique).
 * @param {{iso:string,v:number}[]} points
 */
export function filtrerDepuis(points, jours, ref = Date.now()) {
  if (!jours) return points.slice();
  const seuil = ref - jours * 864e5;
  return points.filter((p) => Date.parse(p.iso) >= seuil);
}

/**
 * Statistiques de la semaine ISO courante (ou de la semaine contenant `ref`).
 * @returns {{seances:number, volume:number, dureeMin:number|null}}
 */
export function statsSemaine(logs, ref = new Date()) {
  const lundi = lundiDe(ref.toISOString());
  const dedans = (logs || []).filter((l) => lundiDe(l.date) === lundi);
  return {
    seances: dedans.length,
    volume: Math.round(volumeTotal(dedans)),
    dureeMin: dureeMoyenneMin(dedans),
  };
}
