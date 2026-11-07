// @ts-check
/**
 * Dépense énergétique ESTIMÉE d'une séance, exercice par exercice.
 *
 * Formule : kcal = MET × poids (kg) × durée (h)   (1 MET ≈ 1 kcal/kg/h).
 *
 * Source des MET : 2024 Adult Compendium of Physical Activities (Herrmann SD
 * et al., J Sport Health Sci 2024;13(1):6-12, https://pacompendium.com/).
 * Les valeurs et codes ci-dessous sont recopiés tels quels ; le Compendium
 * demande de ne pas les modifier ni de mélanger des activités d'intensités
 * différentes : on choisit donc la ligne correspondant à la vitesse (fonction
 * en escalier), sans interpolation.
 *
 * Modèle d'une séance :
 *  - chaque série de cardio CHRONOMÉTRÉE (course, marche, rameur, natation,
 *    elliptique, vélo) compte pour sa propre durée, au MET de l'activité et
 *    de la vitesse réalisée ;
 *  - chaque maintien chronométré (planche…) compte au MET « calisthenics,
 *    light : planks » (02024, 2,8) ;
 *  - le reste du temps de séance (séries de musculation ET repos entre elles)
 *    compte au MET musculation de l'app (activite.js, 5 : entre 3,5 et 6 dans
 *    le Compendium), seulement s'il y a eu de la musculation.
 * Ce n'est pas une mesure : ni montre ni capteur ne sont consultés.
 *
 * Fonctions PURES, testées (tests/calories.test.js).
 */
import { MET_MUSCULATION } from "./activite.js";
import { vitesseKmh } from "./mesures.js";

const KMH_PAR_MPH = 1.609344;

/** @typedef {[number, number, string]} PalierMet  [seuil, MET, code du Compendium] */

/** Course à pied (Running, 12028 → 12135) : vitesse minimale de la ligne (mph) → MET.
 * @type {PalierMet[]} */
export const MET_COURSE = [
  [4.0, 6.5, "12028"], [4.3, 7.8, "12029"], [5.0, 8.5, "12030"], [5.5, 9.0, "12045"],
  [6.0, 9.3, "12050"], [6.7, 10.5, "12060"], [7.0, 11.0, "12070"], [7.5, 11.8, "12080"],
  [8.0, 12.0, "12090"], [8.6, 12.5, "12100"], [9.0, 13.0, "12110"], [9.3, 14.8, "12115"],
  [10.0, 14.8, "12120"], [11.0, 16.8, "12130"], [12.0, 18.5, "12132"], [13.0, 19.8, "12134"],
  [14.0, 23.0, "12135"],
];
/** Marche, terrain plat et ferme (Walking, 17152 → 17231). @type {PalierMet[]} */
export const MET_MARCHE = [
  [0, 2.8, "17152"], [2.5, 3.0, "17170"], [2.8, 3.8, "17190"], [3.5, 4.8, "17200"],
  [4.0, 5.5, "17220"], [4.5, 7.0, "17230"], [5.0, 8.5, "17231"],
];
/** Natation, crawl, selon la vitesse en yards/min (18292, 18290, 18280, 18294). @type {PalierMet[]} */
export const MET_NATATION = [
  [0, 5.8, "18292"], [50, 8.0, "18290"], [75, 10.5, "18280"], [90, 14.5, "18294"],
];
/** Rameur selon la puissance (watts) : 02071, 02072, 02073, 02074. @type {PalierMet[]} */
export const MET_RAMEUR = [
  [0, 5.0, "02071"], [100, 7.5, "02072"], [150, 11.0, "02073"], [200, 14.0, "02074"],
];
/** Valeurs quand la vitesse n'est pas connue (durée seule). */
/** @type {Record<string, [number, string]>} */
export const MET_PAR_DEFAUT = {
  course: [7.5, "12020"],      // Jogging, general, self-selected pace
  marche: [3.8, "17190"],      // Walking, 2.8–3.4 mph, moderate pace
  rameur: [7.3, "02070"],      // Rowing, stationary ergometer, general
  natation: [6.0, "18310"],    // Swimming, leisurely, not lap swimming, general
  elliptique: [5.0, "02048"],  // Elliptical trainer, moderate effort
  velo: [6.8, "01200"],        // Bicycling, stationary, general
  maintien: [2.8, "02024"],    // Calisthenics, light: curl-ups, crunches, planks
};

/**
 * Ligne d'une table en escalier : la dernière dont le seuil est ≤ x.
 * @param {PalierMet[]} table
 * @param {number} x
 * @returns {PalierMet}
 */
function palier(table, x) {
  let ligne = table[0];
  for (const l of table) if (x >= l[0]) ligne = l;
  return ligne;
}

/**
 * Activité cardio d'un exercice, d'après son identifiant, son nom et son
 * matériel ; null si ce n'est pas un cardio chronométrable.
 * @param {any} exo
 * @returns {"course"|"marche"|"rameur"|"natation"|"elliptique"|"velo"|null}
 */
export function activiteCardio(exo) {
  // Seuls les exercices de type cardio : un « rowing machine assis » de
  // musculation n'est pas un rameur.
  if (!exo || exo.typeExercice !== "cardio") return null;
  const t = `${exo.id || ""} ${exo.nom || ""} ${(exo.nomsAlternatifs || []).join(" ")} ${(exo.equipement || []).join(" ")}`.toLowerCase();
  if (/elliptic|elliptique/.test(t)) return "elliptique";
  if (/rameur|rowing|ergometer|\bergo\b|\brow\b/.test(t)) return "rameur";
  if (/swim|natation|\bnage\b/.test(t)) return "natation";
  if (/v[ée]lo|bike|cycling|spinning/.test(t)) return "velo";
  if (/marche|walk|hiking|randonn/.test(t)) return "marche";
  if (/\brun\b|running|course|jog|treadmill|tapis/.test(t)) return "course";
  return null;
}

/**
 * Puissance au rameur estimée depuis l'allure (formule publiée par Concept2 :
 * watts = 2,80 / allure³, allure en secondes par mètre).
 * @param {number} distanceM
 * @param {number} dureeSec
 */
export function wattsRameur(distanceM, dureeSec) {
  const d = Number(distanceM), t = Number(dureeSec);
  if (!(d > 0) || !(t > 0)) return null;
  const allure = t / d;
  return Math.round(2.8 / (allure ** 3));
}

/**
 * MET d'une série de cardio, avec le code Compendium retenu et sa raison.
 * @param {"course"|"marche"|"rameur"|"natation"|"elliptique"|"velo"} activite
 * @param {number|null} distanceM
 * @param {number|null} dureeSec
 * @returns {{met:number, code:string, base:string}}
 */
export function metCardio(activite, distanceM, dureeSec) {
  const kmh = vitesseKmh(Number(distanceM) || 0, Number(dureeSec) || 0);
  if (kmh && (activite === "course" || activite === "marche")) {
    const mph = kmh / KMH_PAR_MPH;
    // Une « course » sous 4 mph (6,4 km/h) est une marche : table de marche.
    const table = activite === "course" && mph >= 4.0 ? MET_COURSE : MET_MARCHE;
    const [, met, code] = palier(table, mph);
    return { met, code, base: `${kmh.toFixed(1)} km/h` };
  }
  if (kmh && activite === "natation") {
    const ydMin = (Number(distanceM) / 0.9144) / (Number(dureeSec) / 60);
    const [, met, code] = palier(MET_NATATION, ydMin);
    return { met, code, base: `${Math.round(ydMin * 0.9144)} m/min` };
  }
  if (kmh && activite === "rameur") {
    const w = /** @type {number} */ (wattsRameur(Number(distanceM), Number(dureeSec)));
    const [, met, code] = palier(MET_RAMEUR, w);
    return { met, code, base: `≈ ${w} W` };
  }
  const [met, code] = MET_PAR_DEFAUT[activite];
  return { met, code, base: "vitesse inconnue" };
}

/** Plafond par séance : au-delà de 3 h, une durée enregistrée est un oubli de clôture. */
const DUREE_MAX_SEC = 3 * 3600;
const kcal = (met, poids, sec) => met * poids * (sec / 3600);

/**
 * Dépense estimée d'une séance enregistrée.
 * @param {any} log  séance de l'historique
 * @param {number} poidsKg
 * @param {(id:string)=>any} getExercise
 * @returns {{total:number, musculation:{kcal:number, dureeSec:number, met:number},
 *   exercices:{exerciceId:string, kcal:number, dureeSec:number, met:number|null, code:string|null, base:string}[]}}
 */
export function caloriesLog(log, poidsKg, getExercise) {
  const p = Number(poidsKg) || 0;
  const vide = { total: 0, musculation: { kcal: 0, dureeSec: 0, met: MET_MUSCULATION }, exercices: [] };
  if (!log || p <= 0) return vide;
  const exercices = [];
  let dureeChrono = 0, aMuscu = false;
  for (const e of log.exercices || []) {
    const exo = getExercise ? getExercise(e.exerciceId) : null;
    const act = activiteCardio(exo);
    let k = 0, d = 0;
    /** @type {{met:number, code:string, base:string}|null} */
    let dernier = null;
    for (const s of e.series || []) {
      const ds = Math.max(0, Number(s.dureeSec) || 0);
      if (act && ds > 0) {
        dernier = metCardio(act, s.distanceM, ds);
        k += kcal(dernier.met, p, ds); d += ds;
      } else if (ds > 0 && !(Number(s.reps) > 0)) {
        const [met, code] = MET_PAR_DEFAUT.maintien;
        dernier = { met, code, base: "maintien" };
        k += kcal(met, p, ds); d += ds;
      } else if (Number(s.reps) > 0 || Number(s.chargeKg) > 0) {
        aMuscu = true;
      }
    }
    if (d > 0) {
      dureeChrono += d;
      exercices.push({ exerciceId: e.exerciceId, kcal: Math.round(k), dureeSec: d, met: dernier ? dernier.met : null, code: dernier ? dernier.code : null, base: dernier ? dernier.base : "" });
    }
  }
  const duree = Math.min(Number(log.dureeSec) || 0, DUREE_MAX_SEC);
  // Le temps restant (séries de musculation + repos) au MET musculation, s'il
  // y a eu de la musculation. Jamais négatif : un cardio saisi plus long que la
  // séance chronométrée (oubli de démarrer le chrono) ne retire rien.
  const reste = aMuscu ? Math.max(0, duree - dureeChrono) : 0;
  const kMuscu = kcal(MET_MUSCULATION, p, reste);
  const total = Math.round(exercices.reduce((a, x) => a + x.kcal, 0) + kMuscu);
  return { total, musculation: { kcal: Math.round(kMuscu), dureeSec: reste, met: MET_MUSCULATION }, exercices };
}
