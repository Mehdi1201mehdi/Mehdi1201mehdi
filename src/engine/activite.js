// @ts-check
/**
 * Bilan d'activité de la semaine : temps, volume, dépense estimée, et
 * comparaison avec la semaine précédente. Fonctions PURES.
 *
 * La dépense calorique est une ESTIMATION et doit être présentée comme telle :
 * formule MET × poids (kg) × durée (h). Le Compendium des activités physiques
 * situe la musculation entre 3,5 MET (charges modérées, 8-15 répétitions) et
 * 6 MET (effort vigoureux) ; une séance réelle mêle efforts et repos, d'où la
 * valeur médiane retenue. Aucune montre ni capteur n'est consulté.
 */
import { volumeTotal } from "./stats.js";

/** Intensité métabolique moyenne retenue pour une séance de musculation. */
export const MET_MUSCULATION = 5;
/** Plafond par séance : au-delà de 3 h, une durée enregistrée est un oubli de clôture. */
const DUREE_MAX_SEC = 3 * 3600;

/**
 * Dépense estimée d'une séance, en kcal (entier), ou 0 si inconnue.
 * @param {number} dureeSec
 * @param {number} poidsKg
 * @param {number} [met]
 */
export function caloriesSeance(dureeSec, poidsKg, met = MET_MUSCULATION) {
  const d = Math.min(Number(dureeSec) || 0, DUREE_MAX_SEC);
  const p = Number(poidsKg) || 0;
  if (d <= 0 || p <= 0) return 0;
  return Math.round(met * p * (d / 3600));
}

/** Lundi (00:00 locale) de la semaine d'une date. */
export function lundiLocal(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/** Séances d'une semaine (du lundi donné au lundi suivant, exclu). */
function seancesSemaine(logs, lundi) {
  const debut = lundi.getTime();
  const fin = debut + 7 * 864e5;
  return (logs || []).filter((l) => {
    const t = new Date(l && l.date).getTime();
    return Number.isFinite(t) && t >= debut && t < fin;
  });
}

/** Somme des durées (secondes), chaque séance plafonnée. */
function dureeTotaleSec(logs) {
  return logs.reduce((s, l) => s + Math.min(Number(l.dureeSec) || 0, DUREE_MAX_SEC), 0);
}

/**
 * Bilan de la semaine en cours et écart avec la précédente.
 * @param {any[]} logs
 * @param {number} poidsKg
 * @param {Date} [ref]
 * @param {((log:any)=>number)|null} [kcalSeance]  estimation par séance (calories.js#caloriesLog) ;
 *   à défaut, MET musculation × durée.
 * @returns {{seances:number, dureeMin:number, volume:number, kcal:number,
 *   precedente:{seances:number, dureeMin:number, volume:number},
 *   ecartVolumePct:number|null, ecartSeances:number}}
 */
export function bilanSemaine(logs, poidsKg, ref = new Date(), kcalSeance = null) {
  const lundi = lundiLocal(ref);
  const avant = new Date(lundi); avant.setDate(avant.getDate() - 7);
  const cur = seancesSemaine(logs, lundi);
  const prev = seancesSemaine(logs, avant);
  const volume = Math.round(volumeTotal(cur));
  const volPrev = Math.round(volumeTotal(prev));
  const dureeSec = dureeTotaleSec(cur);
  return {
    seances: cur.length,
    dureeMin: Math.round(dureeSec / 60),
    volume,
    kcal: cur.reduce((s, l) => s + (kcalSeance ? kcalSeance(l) : caloriesSeance(l.dureeSec, poidsKg)), 0),
    precedente: { seances: prev.length, dureeMin: Math.round(dureeTotaleSec(prev) / 60), volume: volPrev },
    // Pas de pourcentage sans base : +∞ % ne veut rien dire.
    ecartVolumePct: volPrev > 0 ? Math.round(((volume - volPrev) / volPrev) * 100) : null,
    ecartSeances: cur.length - prev.length,
  };
}

/**
 * Durée lisible : « 45 min », « 2 h 05 ».
 * @param {number} minutes
 */
export function formatDuree(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) || 0));
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;
}
