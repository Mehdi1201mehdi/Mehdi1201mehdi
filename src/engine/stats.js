// @ts-check
/**
 * Statistiques d'entraînement — fonctions PURES (aucun DOM/stockage).
 * Volume = somme de (charge × répétitions) sur toutes les séries.
 */
import { e1rmFiable, estSerieTravail } from "./records.js";
import { vitesseKmh } from "./mesures.js";

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
    for (const s of e.series || []) if (estSerieTravail(s)) v += (Number(s.chargeKg) || 0) * (Number(s.reps) || 0);
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

/**
 * Métriques disponibles pour un exercice dans les graphiques. `unite` indique
 * si la valeur est une masse (convertie en lb à l'affichage) ; `agregat` dit
 * comment regrouper plusieurs séances d'un même mois (meilleure valeur ou total).
 */
export const METRIQUES_EXO = /** @type {const} */ ([
  { cle: "1rm", label: "1RM estimé (kg)", unite: "kg", agregat: "max" },
  { cle: "poids", label: "Poids max (kg)", unite: "kg", agregat: "max" },
  { cle: "volume", label: "Tonnage (kg × reps)", unite: "kg", agregat: "somme" },
  { cle: "reps", label: "Reps max", unite: "", agregat: "max" },
  { cle: "distance", label: "Distance (km)", unite: "km", agregat: "somme" },
  { cle: "vitesse", label: "Vitesse max (km/h)", unite: "km/h", agregat: "max" },
  { cle: "dureeTotale", label: "Durée totale (min)", unite: "min", agregat: "somme" },
  { cle: "maintien", label: "Maintien max (s)", unite: "s", agregat: "max" },
]);

/**
 * Métriques PERTINENTES pour un exercice, d'après ce qu'il mesure (cf.
 * mesures.js) : on ne propose jamais un « 1RM » de course à pied.
 * @param {{charge:boolean, reps:boolean, distance:boolean, duree:boolean, isometrique:boolean}} mesures
 * @returns {string[]}
 */
export function metriquesPour(mesures) {
  const m = mesures || { charge: true, reps: true, distance: false, duree: false, isometrique: false };
  if (m.distance) return ["distance", "vitesse", "dureeTotale"];
  if (m.isometrique) return ["maintien", "poids"];
  if (!m.charge) return ["reps", "volume"];
  return ["1rm", "poids", "volume", "reps"];
}

/**
 * Série temporelle d'un exercice pour une métrique donnée : un point par séance
 * où l'exercice apparaît. Le 1RM ne retient que les séries de 1 à 12 reps
 * (records.js#e1rmFiable) ; la distance est rendue en km, la durée totale en
 * minutes, le maintien en secondes.
 * @param {any[]} logs
 * @param {string} exerciceId
 * @param {string} metrique  clé de METRIQUES_EXO
 * @returns {{iso:string, v:number}[]}
 */
export function serieExercice(logs, exerciceId, metrique) {
  const pts = [];
  for (const l of logs || []) {
    const exs = (l.exercices || []).filter((e) => e.exerciceId === exerciceId);
    if (!exs.length) continue;
    let v = 0, porte = false;
    for (const e of exs) {
      for (const s of e.series || []) {
        if (!estSerieTravail(s)) continue;
        const kg = Number(s.chargeKg) || 0, reps = Number(s.reps) || 0;
        const dist = Number(s.distanceM) || 0, duree = Number(s.dureeSec) || 0;
        if (metrique === "poids") v = Math.max(v, kg);
        else if (metrique === "reps") v = Math.max(v, reps);
        else if (metrique === "1rm") v = Math.max(v, e1rmFiable(kg, reps));
        else if (metrique === "distance") v += dist / 1000;
        else if (metrique === "vitesse") v = Math.max(v, vitesseKmh(dist, duree) || 0);
        else if (metrique === "dureeTotale") v += duree / 60;
        else if (metrique === "maintien") v = Math.max(v, reps ? 0 : duree);
        else v += kg * reps; // tonnage (clé historique « volume »)
        if (v > 0) porte = true;
      }
    }
    // Les métriques propres au cardio ou au maintien n'ajoutent pas de point
    // nul pour une séance qui ne les porte pas (ex. ancienne saisie en reps).
    if (!porte && ["distance", "vitesse", "dureeTotale", "maintien"].includes(metrique)) continue;
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

/**
 * Séries de travail par muscle sur une période, comparées à la période
 * précédente de même durée. Un muscle principal compte 1 série, un muscle
 * secondaire ½ : c'est la convention la plus répandue pour suivre son volume.
 * Les séries d'échauffement ne comptent pas.
 * @param {any[]} logs
 * @param {(id:string)=>any} getExercise
 * @param {number} [jours]   durée de la période (7 = semaine glissante)
 * @param {number} [ref]     fin de la période (ms)
 * @returns {{muscle:string, series:number, avant:number, ecart:number}[]} trié par séries décroissantes
 */
export function seriesParMuscle(logs, getExercise, jours = 7, ref = Date.now()) {
  const duree = Math.max(1, jours) * 86400000;
  /** @type {Map<string, {series:number, avant:number}>} */
  const par = new Map();
  const ajouter = (m, n, champ) => { const o = par.get(m) || { series: 0, avant: 0 }; o[champ] += n; par.set(m, o); };
  for (const l of logs || []) {
    const t = Date.parse(l && l.date);
    if (!Number.isFinite(t)) continue;
    const age = ref - t;
    const champ = age >= 0 && age < duree ? "series" : age >= duree && age < 2 * duree ? "avant" : null;
    if (!champ) continue;
    for (const e of l.exercices || []) {
      const exo = getExercise(e.exerciceId);
      if (!exo) continue;
      const n = (e.series || []).filter((s) => s && s.type !== "echauffement" && s.done !== false && ((Number(s.reps) || 0) > 0 || (Number(s.dureeSec) || 0) > 0)).length;
      if (!n) continue;
      for (const m of exo.musclesPrincipaux || []) ajouter(m, n, champ);
      for (const m of exo.musclesSecondaires || []) if (!(exo.musclesPrincipaux || []).includes(m)) ajouter(m, n / 2, champ);
    }
  }
  return [...par.entries()]
    .map(([muscle, o]) => ({ muscle, series: o.series, avant: o.avant, ecart: o.series - o.avant }))
    .filter((x) => x.series > 0 || x.avant > 0)
    .sort((a, b) => b.series - a.series || b.avant - a.avant);
}
