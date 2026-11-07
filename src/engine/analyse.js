// @ts-check
/**
 * Analyse de la charge d'entraînement : tonnage, volume et intensité, par
 * période, et progression mensuelle d'un exercice.
 *
 * Trois notions qu'on confond souvent — et que l'app distingue désormais :
 *  - TONNAGE   = Σ charge × répétitions (kg). C'est ce que beaucoup d'apps,
 *                FitAI compris, appellent « volume ». Il mélange quantité et
 *                lourdeur : 10 × 10 kg et 1 × 100 kg pèsent le même tonnage.
 *  - VOLUME    = la QUANTITÉ de travail : nombre de séries (le repère des
 *                études d'hypertrophie, ~10–20 séries/muscle/semaine) et de
 *                répétitions.
 *  - INTENSITÉ = la LOURDEUR : charge moyenne par répétition (kg/rép.) et,
 *                surtout, pourcentage du 1RM estimé de l'exercice — la seule
 *                mesure comparable d'un exercice à l'autre.
 *
 * Fonctions PURES, testées (tests/analyse.test.js).
 */
import { e1rmFiable, estSerieTravail } from "./records.js";
import { METRIQUES_EXO, serieExercice, lundiDe } from "./stats.js";

/** Définitions affichées dans l'app (une phrase chacune, sans jargon). */
export const DEFINITIONS_CHARGE = {
  tonnage: "Tonnage : charge × répétitions additionnées (ce que d'autres écrans appellent « volume »).",
  volume: "Volume : la quantité de travail — séries et répétitions réalisées.",
  intensite: "Intensité : la lourdeur — kilos par répétition et % de ton 1RM estimé sur chaque exercice.",
};

/**
 * Meilleur 1RM estimé FIABLE par exercice (séries de 1 à 12 reps), référence
 * de l'intensité relative.
 * @param {any[]} logs
 * @returns {Record<string, number>}
 */
export function references1RM(logs) {
  /** @type {Record<string, number>} */
  const ref = {};
  for (const l of logs || []) {
    for (const e of (l && l.exercices) || []) {
      for (const s of e.series || []) {
        if (!estSerieTravail(s)) continue;
        const v = e1rmFiable(s.chargeKg, s.reps);
        if (v > (ref[e.exerciceId] || 0)) ref[e.exerciceId] = v;
      }
    }
  }
  return ref;
}

/**
 * Charge d'entraînement d'un ensemble de séances.
 * @param {any[]} logs   séances de la période
 * @param {Record<string, number>} [refs]  1RM de référence (tout l'historique, idéalement)
 * @returns {{seances:number, series:number, reps:number, tonnageKg:number, repsChargees:number,
 *   intensiteKgRep:number|null, intensiteRelPct:number|null, distanceM:number, dureeCardioSec:number}}
 */
export function chargeEntrainement(logs, refs) {
  const r = refs || references1RM(logs);
  let series = 0, reps = 0, tonnage = 0, repsChargees = 0, distance = 0, dureeCardio = 0;
  let relPondere = 0, relReps = 0;
  for (const l of logs || []) {
    for (const e of (l && l.exercices) || []) {
      for (const s of e.series || []) {
        if (!estSerieTravail(s)) continue;
        const kg = Number(s.chargeKg) || 0, n = Number(s.reps) || 0;
        const dm = Number(s.distanceM) || 0, ds = Number(s.dureeSec) || 0;
        series++;
        reps += n;
        if (kg > 0 && n > 0) {
          tonnage += kg * n;
          repsChargees += n;
          const ref = r[e.exerciceId];
          if (ref > 0) { relPondere += (kg / ref) * n; relReps += n; }
        }
        if (dm > 0) { distance += dm; dureeCardio += ds; }
      }
    }
  }
  return {
    seances: (logs || []).length,
    series,
    reps,
    tonnageKg: Math.round(tonnage),
    repsChargees,
    intensiteKgRep: repsChargees ? Math.round((tonnage / repsChargees) * 10) / 10 : null,
    intensiteRelPct: relReps ? Math.round((relPondere / relReps) * 100) : null,
    distanceM: Math.round(distance),
    dureeCardioSec: Math.round(dureeCardio),
  };
}

const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** Clé « AAAA-MM » d'une date ISO, en heure locale. */
export function cleMois(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** « oct. 2026 » depuis « 2026-10 ». */
export function libelleMois(cle) {
  const [a, m] = cle.split("-").map(Number);
  return `${MOIS_COURTS[m - 1]} ${a}`;
}

/**
 * Charge d'entraînement par semaine (lundi local) ou par mois, sur les `nb`
 * dernières périodes, périodes vides comprises (une semaine sans séance est
 * une information, pas un trou à masquer). Ordre : de la plus ancienne à
 * l'actuelle.
 * @param {any[]} logs
 * @param {"semaine"|"mois"} unite
 * @param {number} [nb]
 * @param {Date} [ref]
 */
export function chargeParPeriode(logs, unite, nb = 6, ref = new Date()) {
  const refs = references1RM(logs);
  const cles = [];
  if (unite === "mois") {
    for (let k = nb - 1; k >= 0; k--) {
      const d = new Date(ref.getFullYear(), ref.getMonth() - k, 1);
      cles.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
  } else {
    const lundi = new Date(lundiDe(ref.toISOString()));
    for (let k = nb - 1; k >= 0; k--) {
      const d = new Date(lundi.getTime() - k * 7 * 864e5);
      cles.push(lundiDe(d.toISOString()));
    }
  }
  const cleDe = (iso) => (unite === "mois" ? cleMois(iso) : lundiDe(iso));
  return cles.map((cle) => {
    const dedans = (logs || []).filter((l) => l && cleDe(l.date) === cle);
    const label = unite === "mois" ? libelleMois(cle)
      : new Date(cle).toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
    return { cle, label, ...chargeEntrainement(dedans, refs) };
  });
}

/**
 * Période en cours comparée À MÊME STADE de la précédente : le 7 novembre, on
 * compare du 1er au 7 novembre avec du 1er au 7 octobre — pas avec octobre
 * entier, ce qui afficherait « −70 % » chaque début de mois. Semaines : du lundi
 * (UTC, comme lundiDe) jusqu'au même instant de la semaine précédente.
 * @param {any[]} logs
 * @param {"semaine"|"mois"} unite
 * @param {Date} [ref]
 * @returns {{actuelle:ReturnType<typeof chargeEntrainement>, precedente:ReturnType<typeof chargeEntrainement>,
 *   debutPrec:Date, finPrec:Date, jours:number}}
 */
export function comparaisonMemeStade(logs, unite, ref = new Date()) {
  const refs = references1RM(logs);
  let debut, debutPrec;
  if (unite === "mois") {
    debut = new Date(ref.getFullYear(), ref.getMonth(), 1);
    debutPrec = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);
  } else {
    debut = new Date(lundiDe(ref.toISOString()) + "T00:00:00.000Z");
    debutPrec = new Date(debut.getTime() - 7 * 864e5);
  }
  const ecoule = ref.getTime() - debut.getTime();
  // Fin de la période précédente au même stade, sans déborder sur l'actuelle
  // (31 mars → 28 février : on s'arrête au 1er mars).
  const finPrec = new Date(Math.min(debutPrec.getTime() + ecoule, debut.getTime()));
  const entre = (a, b) => (logs || []).filter((l) => { const t = Date.parse(l && l.date); return t >= a && t <= b; });
  return {
    actuelle: chargeEntrainement(entre(debut.getTime(), ref.getTime()), refs),
    precedente: chargeEntrainement(entre(debutPrec.getTime(), finPrec.getTime()), refs),
    debutPrec, finPrec,
    jours: Math.max(1, Math.ceil(ecoule / 864e5)),
  };
}

/**
 * Évolution relative entre deux valeurs, en %, ou null si l'ancienne est nulle.
 * @param {number|null} avant
 * @param {number|null} apres
 */
export function variationPct(avant, apres) {
  if (!avant || apres == null) return null;
  return Math.round(((apres - avant) / avant) * 100);
}

/**
 * Progression MENSUELLE d'un exercice pour une métrique : meilleure valeur du
 * mois (1RM, charge, reps, vitesse, maintien) ou total du mois (tonnage,
 * distance, durée), avec l'écart au mois précédent où l'exercice a été fait.
 * @param {any[]} logs
 * @param {string} exerciceId
 * @param {string} metrique  clé de METRIQUES_EXO
 * @returns {{mois:string, label:string, v:number, seances:number, delta:number|null, deltaPct:number|null}[]}
 */
export function progressionMensuelle(logs, exerciceId, metrique) {
  const def = METRIQUES_EXO.find((m) => m.cle === metrique);
  const somme = def ? def.agregat === "somme" : false;
  /** @type {Map<string, {v:number, seances:number}>} */
  const parMois = new Map();
  for (const p of serieExercice(logs, exerciceId, metrique)) {
    const cle = cleMois(p.iso);
    const cur = parMois.get(cle) || { v: 0, seances: 0 };
    cur.v = somme ? cur.v + p.v : Math.max(cur.v, p.v);
    cur.seances++;
    parMois.set(cle, cur);
  }
  const out = [];
  let prec = null;
  for (const cle of [...parMois.keys()].sort()) {
    const { v, seances } = /** @type {{v:number, seances:number}} */ (parMois.get(cle));
    const val = Math.round(v * 10) / 10;
    out.push({
      mois: cle, label: libelleMois(cle), v: val, seances,
      delta: prec == null ? null : Math.round((val - prec) * 10) / 10,
      deltaPct: prec == null ? null : variationPct(prec, val),
    });
    prec = val;
  }
  return out;
}

/**
 * RPE d'une série : celui SAISI (0–10) s'il existe, sinon déduit du RIR par la
 * correspondance usuelle RPE = 10 − RIR (Zourdos et al., 2016), signalée comme
 * déduite. null si aucun effort n'a été noté.
 * @param {any} s
 * @returns {{rpe:number, deduit:boolean}|null}
 */
export function rpeSerie(s) {
  if (!s) return null;
  const r = Number(s.rpe);
  if (s.rpe != null && s.rpe !== "" && Number.isFinite(r)) return { rpe: r, deduit: false };
  const rir = Number(s.rir);
  if (s.rir != null && s.rir !== "" && Number.isFinite(rir)) return { rpe: Math.max(0, Math.min(10, 10 - rir)), deduit: true };
  return null;
}

/**
 * Effort moyen d'une liste de séries (RPE moyen, au demi-point), avec le nombre
 * de séries notées et la part déduite du RIR.
 * @param {any[]} series
 * @returns {{rpe:number|null, n:number, deduites:number}}
 */
export function effortMoyen(series) {
  let somme = 0, n = 0, deduites = 0;
  for (const s of series || []) {
    const e = rpeSerie(s);
    if (!e) continue;
    somme += e.rpe; n++;
    if (e.deduit) deduites++;
  }
  return { rpe: n ? Math.round((somme / n) * 2) / 2 : null, n, deduites };
}

/** Toutes les séries d'une séance (ou d'un exercice de la séance). */
export function seriesDe(log, exerciceId = null) {
  return ((log && log.exercices) || [])
    .filter((e) => !exerciceId || e.exerciceId === exerciceId)
    .flatMap((e) => e.series || []);
}
