// @ts-check
/**
 * Statistiques d'entraînement — fonctions PURES (aucun DOM/stockage).
 * Volume = somme de (charge × répétitions) sur toutes les séries.
 */

/** Lundi (YYYY-MM-DD) de la semaine ISO contenant `dateStr`. */
export function lundiDe(dateStr) {
  const d = new Date(dateStr);
  const iso = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - iso);
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
