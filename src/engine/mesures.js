// @ts-check
/**
 * Indicateurs de mesure par exercice : charge, répétitions, distance, durée.
 *
 * Principe (le même que celui observé dans FitAI, implémentation propre) :
 * chaque exercice déclare CE QUI SE MESURE. Un développé couché se mesure en
 * charge × répétitions ; une course en distance + durée (la vitesse s'en
 * déduit) ; une planche en durée de maintien. L'écran de séance, l'historique et
 * les records s'adaptent à ces indicateurs : on ne force jamais un cardio dans
 * un tableau « kg × reps », et on ne compare jamais un record de distance avec
 * un record de charge.
 *
 * Un exercice peut porter un champ explicite `mesures` ; sinon les indicateurs
 * sont DÉDUITS de son type et de son nom (règles ci-dessous, testées). Tout est
 * stocké en unités SI : mètres, secondes, kilogrammes.
 *
 * Fonctions PURES.
 */
import { e1rmFiable, estSerieTravail } from "./records.js";

/** @typedef {{charge:boolean, reps:boolean, distance:boolean, duree:boolean, isometrique:boolean}} Mesures */

/** Activités qui se mesurent naturellement en distance (FR et EN, wger compris). */
const RE_DISTANCE = /(\brun\b|running|course|jog|treadmill|tapis|elliptic|elliptique|swim|natation|\bnage\b|bike|v[ée]lo|cycling|rameur|rowing|row(ing)? machine|marche|walk|hiking|randonn|\bski\b|stairmaster)/i;

/**
 * Indicateurs d'un exercice.
 * @param {any} exo  exercice du catalogue (ou null)
 * @returns {Mesures}
 */
export function mesuresExercice(exo) {
  const base = { charge: true, reps: true, distance: false, duree: false, isometrique: false };
  if (!exo) return base;
  if (exo.mesures && typeof exo.mesures === "object") return { ...base, ...exo.mesures };
  const texte = `${exo.id || ""} ${exo.nom || ""} ${(exo.nomsAlternatifs || []).join(" ")} ${(exo.equipement || []).join(" ")}`;
  // Pliométrie (sauts, bonds) : des répétitions, même si le nom évoque la course.
  const plio = (exo.tags || []).includes("plyometrics");
  if (exo.typeExercice === "cardio" && !plio && RE_DISTANCE.test(texte)) {
    return { charge: false, reps: false, distance: true, duree: true, isometrique: false };
  }
  if (exo.typeExercice === "cardio") {
    // Burpees, sauts sur box… : des répétitions, sans charge.
    return { charge: false, reps: true, distance: false, duree: false, isometrique: false };
  }
  if (exo.typeExercice === "gainage" || exo.typeExercice === "mobilite") {
    // Maintien : une durée, avec un lest facultatif (planche lestée).
    return { charge: true, reps: false, distance: false, duree: true, isometrique: true };
  }
  return base;
}

/**
 * Vitesse moyenne en km/h, ou null si distance ou durée manquent.
 * @param {number} distanceM
 * @param {number} dureeSec
 */
export function vitesseKmh(distanceM, dureeSec) {
  const d = Number(distanceM), t = Number(dureeSec);
  if (!(d > 0) || !(t > 0)) return null;
  return (d / 1000) / (t / 3600);
}

/**
 * Allure en secondes par kilomètre (course, marche), ou null.
 * @param {number} distanceM
 * @param {number} dureeSec
 */
export function allureSecParKm(distanceM, dureeSec) {
  const d = Number(distanceM), t = Number(dureeSec);
  if (!(d > 0) || !(t > 0)) return null;
  return t / (d / 1000);
}

/**
 * Durée lisible : « 45 s », « 25:30 », « 1:02:05 ».
 * @param {number} sec
 */
export function texteDuree(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(r)}` : `${m}:${pad(r)}`;
}

/**
 * Saisie d'une durée en MINUTES : « 25 », « 25,5 », « 25.5 », « 25:30 » ou
 * « 1:02:05 ». Rend des secondes, ou null si vide ou illisible.
 * @param {any} saisie
 */
export function lireDureeMinutes(saisie) {
  const s = String(saisie ?? "").trim().replace(",", ".");
  if (!s) return null;
  if (s.includes(":")) {
    const p = s.split(":").map(Number);
    if (p.some((x) => !Number.isFinite(x) || x < 0)) return null;
    const sec = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
    return sec > 0 ? Math.round(sec) : null;
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 60) : null;
}

/**
 * Saisie d'une distance en kilomètres (virgule acceptée) → mètres, ou null.
 * @param {any} saisieKm
 */
export function lireDistanceKm(saisieKm) {
  const s = String(saisieKm ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) : null;
}

/**
 * Mode de saisie d'un exercice en séance :
 *  - "distance" : kilomètres + minutes (course, rameur, vélo…) ;
 *  - "temps"    : durée de maintien en secondes, lest facultatif (planche) ;
 *  - "reps"     : charge × répétitions (le cas général).
 * Le mode « temps » suit le GABARIT de la séance (une série prévue en durée),
 * pour ne pas basculer d'office des séances déjà programmées en répétitions.
 * @param {any} exo
 * @param {any} [seriePrevue]  première série live (porte `dureeSec` si chronométrée)
 * @returns {"distance"|"temps"|"reps"}
 */
export function modeSaisie(exo, seriePrevue) {
  if (mesuresExercice(exo).distance) return "distance";
  if (seriePrevue && Number(seriePrevue.dureeSec) > 0) return "temps";
  return "reps";
}

const nfFr = (n, dec) => Number(n).toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec });

// Espace insécable entre le nombre et l'unité (typographie française) : une
// tuile étroite ne doit jamais afficher « 13,3 » sur une ligne et « km/h » sur
// la suivante.
const NBSP = "\u00A0";

/** « 800 m », « 5,2 km », « 12,25 km » (espace insécable). */
export function texteDistance(m) {
  const v = Number(m) || 0;
  if (v < 1000) return `${Math.round(v)}${NBSP}m`;
  const km = v / 1000;
  return `${Number(km.toFixed(2)).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}${NBSP}km`;
}

/** « 12,0 km/h » (espace insécable). */
export function texteVitesse(kmh) {
  return `${nfFr(Number(kmh) || 0, 1)}${NBSP}km/h`;
}

/** Allure « 5:00 /km » à partir de secondes par kilomètre. */
export function texteAllure(secParKm) {
  const s = Math.round(Number(secParKm) || 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}${NBSP}/km`;
}

/** Secondes → texte à remettre dans un champ « minutes » (« 25 » ou « 25:30 »). */
export function minutesSaisie(sec) {
  const s = Math.round(Number(sec) || 0);
  if (s <= 0) return "";
  return s % 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : String(s / 60);
}

/** Mètres → texte à remettre dans un champ « km » (virgule française). */
export function kmSaisie(m) {
  const v = Number(m) || 0;
  if (v <= 0) return "";
  return String(Number((v / 1000).toFixed(3))).replace(".", ",");
}

/**
 * Texte d'une série ENREGISTRÉE, adapté à ce qu'elle mesure.
 * @param {any} s  série de l'historique
 * @param {(kg:number)=>string} [fmtCharge]  formateur de charge (unité de l'utilisateur)
 */
export function texteSerieLog(s, fmtCharge = (kg) => `${kg} kg`) {
  if (!s) return "";
  const dist = Number(s.distanceM) || 0, duree = Number(s.dureeSec) || 0;
  const kg = Number(s.chargeKg) || 0, reps = Number(s.reps) || 0;
  if (dist > 0) {
    const vit = vitesseKmh(dist, duree);
    return `${texteDistance(dist)}${duree ? ` en ${texteDuree(duree)}` : ""}${vit ? ` (${texteVitesse(vit)})` : ""}`;
  }
  if (duree > 0 && !reps) return `${kg ? `${fmtCharge(kg)} · ` : ""}${texteDuree(duree)}`;
  if (kg > 0) return `${fmtCharge(kg)} × ${reps || "?"}`;
  return reps ? `${reps} reps` : "—";
}

/**
 * Totaux d'une liste de séries (live ou enregistrées) en mode distance, pour
 * la ligne de synthèse sous le tableau : distance, durée, vitesse et allure.
 * @param {{distanceM:number|null, dureeSec:number|null}[]} series
 */
export function totauxDistance(series) {
  let d = 0, t = 0, tAvecDist = 0;
  for (const s of series || []) {
    const dm = Number(s && s.distanceM) || 0, ds = Number(s && s.dureeSec) || 0;
    d += dm; t += ds;
    if (dm > 0) tAvecDist += ds;
  }
  const vit = vitesseKmh(d, tAvecDist);
  return { distanceM: d, dureeSec: t, vitesseKmh: vit, allureSecParKm: vit ? allureSecParKm(d, tAvecDist) : null };
}

/**
 * Meilleures performances d'un ensemble de séances, PAR EXERCICE et PAR TYPE.
 * Chaque indicateur n'est calculé que sur les séries qui le portent : une
 * série de course n'alimente jamais la charge maximale.
 * @param {any[]} logs
 * @returns {Record<string, {chargeMax:number, repsMax:number, e1rmMax:number, volumeSerieMax:number, volumeSeanceMax:number, distanceMax:number, dureeMax:number, vitesseMax:number}>}
 */
export function meilleuresPerfs(logs) {
  /** @type {Record<string, any>} */
  const out = {};
  for (const l of logs || []) {
    for (const e of (l && l.exercices) || []) {
      const b = out[e.exerciceId] || (out[e.exerciceId] = { chargeMax: 0, repsMax: 0, e1rmMax: 0, volumeSerieMax: 0, volumeSeanceMax: 0, distanceMax: 0, dureeMax: 0, vitesseMax: 0 });
      let volSeance = 0;
      for (const s of e.series || []) {
        if (!estSerieTravail(s)) continue;
        const kg = Number(s.chargeKg) || 0, reps = Number(s.reps) || 0;
        const dist = Number(s.distanceM) || 0, duree = Number(s.dureeSec) || 0;
        if (kg > 0 && reps > 0) b.chargeMax = Math.max(b.chargeMax, kg);
        if (reps > 0) b.repsMax = Math.max(b.repsMax, reps);
        b.e1rmMax = Math.max(b.e1rmMax, e1rmFiable(kg, reps));
        const v = kg * reps;
        b.volumeSerieMax = Math.max(b.volumeSerieMax, v);
        volSeance += v;
        if (dist > 0) b.distanceMax = Math.max(b.distanceMax, dist);
        if (duree > 0) b.dureeMax = Math.max(b.dureeMax, duree);
        const vit = vitesseKmh(dist, duree);
        if (vit) b.vitesseMax = Math.max(b.vitesseMax, vit);
      }
      b.volumeSeanceMax = Math.max(b.volumeSeanceMax, volSeance);
    }
  }
  return out;
}

/**
 * Records battus par une nouvelle séance pour les indicateurs de distance, de
 * durée, de vitesse et de volume de séance — en complément de detecterRecords
 * (records.js), qui couvre charge, 1RM et répétitions. Un record n'est signalé
 * que s'il existait une référence antérieure (la toute première séance d'un
 * exercice n'est pas un « record »), sauf pour le volume, jamais nul.
 * @param {any[]} logsAnterieurs
 * @param {any} nouveauLog
 * @param {(id:string)=>string} [resoudreNom]
 * @returns {{exerciceId:string, nom:string, type:"distance"|"duree"|"vitesse"|"volume", valeur:number, ancien:number}[]}
 */
export function detecterRecordsMesures(logsAnterieurs, nouveauLog, resoudreNom = (id) => id) {
  const avant = meilleuresPerfs(logsAnterieurs);
  const maint = meilleuresPerfs([nouveauLog]);
  /** @type {{exerciceId:string, nom:string, type:"distance"|"duree"|"vitesse"|"volume", valeur:number, ancien:number}[]} */
  const out = [];
  for (const [id, a] of Object.entries(maint)) {
    const h = avant[id];
    if (!h) continue;
    const nom = resoudreNom(id);
    if (a.distanceMax > h.distanceMax && h.distanceMax > 0) out.push({ exerciceId: id, nom, type: "distance", valeur: a.distanceMax, ancien: h.distanceMax });
    if (a.vitesseMax > h.vitesseMax + 0.05 && h.vitesseMax > 0) out.push({ exerciceId: id, nom, type: "vitesse", valeur: Math.round(a.vitesseMax * 10) / 10, ancien: Math.round(h.vitesseMax * 10) / 10 });
    // Durée : un record pour un maintien (planche) ou une sortie sans distance.
    if (a.dureeMax > h.dureeMax && h.dureeMax > 0 && !(a.distanceMax > 0)) out.push({ exerciceId: id, nom, type: "duree", valeur: a.dureeMax, ancien: h.dureeMax });
    if (a.volumeSeanceMax > h.volumeSeanceMax && h.volumeSeanceMax > 0) out.push({ exerciceId: id, nom, type: "volume", valeur: Math.round(a.volumeSeanceMax), ancien: Math.round(h.volumeSeanceMax) });
  }
  return out;
}
