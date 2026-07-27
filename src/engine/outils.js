// @ts-check
/**
 * Outils de calcul — fonctions PURES (aucun DOM, aucun stockage).
 *
 * Reprend et étend les calculatrices des fiches d'entraînement fournies :
 * fréquence cardiaque cible, besoins par morphotype, durée de séance,
 * estimation du maximum, composition corporelle et test cardio sur vélo.
 * Les formules utilisées sont des formules publiques et documentées
 * (Karvonen, Epley/Brzycki, ratios classiques g/kg de poids de corps).
 */

/* ===================== 1. FRÉQUENCE CARDIAQUE ===================== */

/** FC maximale théorique (formule classique 220 − âge). */
export function fcMaxTheorique(age) {
  return Math.max(100, Math.round(220 - (Number(age) || 0)));
}

/**
 * FC cible par la formule de Karvonen, qui tient compte de la FC de repos
 * (donc du niveau de forme) : FC = ((FCmax − FCrepos) × %) + FCrepos.
 * @param {number} fcMax
 * @param {number} fcRepos
 * @param {number} pct  intensité voulue en % (ex. 70)
 */
export function fcCibleKarvonen(fcMax, fcRepos, pct) {
  const max = Number(fcMax) || 0, repos = Number(fcRepos) || 0;
  const reserve = Math.max(0, max - repos);
  return Math.round(reserve * ((Number(pct) || 0) / 100) + repos);
}

/** FC cible simple (sans FC de repos) : FCmax × %. Pour les grands débutants. */
export function fcCibleSimple(fcMax, pct) {
  return Math.round((Number(fcMax) || 0) * ((Number(pct) || 0) / 100));
}

/** Les 5 zones d'entraînement cardio, avec leur intérêt. */
export const ZONES_CARDIO = [
  { cle: "recup", nom: "Récupération", min: 50, max: 60, effet: "Échauffement, retour au calme, récupération active." },
  { cle: "endurance", nom: "Endurance fondamentale", min: 60, max: 70, effet: "Brûle surtout les graisses, tenable longtemps." },
  { cle: "aerobie", nom: "Aérobie", min: 70, max: 80, effet: "Améliore l'endurance et la capacité cardiaque." },
  { cle: "seuil", nom: "Seuil", min: 80, max: 90, effet: "Repousse le seuil d'essoufflement. Séances difficiles." },
  { cle: "vo2max", nom: "VO2 max", min: 90, max: 100, effet: "Intervalles courts et intenses. À utiliser avec parcimonie." },
];

/**
 * Table complète des zones en pulsations/min, par Karvonen si la FC de repos
 * est fournie, sinon en pourcentage simple de la FC max.
 * @returns {{cle:string, nom:string, min:number, max:number, bpmMin:number, bpmMax:number, effet:string}[]}
 */
export function tableZonesCardio(fcMax, fcRepos = null) {
  const calc = (pct) => (fcRepos ? fcCibleKarvonen(fcMax, fcRepos, pct) : fcCibleSimple(fcMax, pct));
  return ZONES_CARDIO.map((z) => ({ ...z, bpmMin: calc(z.min), bpmMax: calc(z.max) }));
}

/* ===================== 2. BESOINS PAR MORPHOTYPE ===================== */

/** Les trois morphotypes classiques. */
export const MORPHOTYPES = [
  { cle: "ectomorphe", nom: "Ectomorphe", desc: "Filiforme, difficulté à prendre du poids." },
  { cle: "mesomorphe", nom: "Mésomorphe", desc: "Prend du muscle naturellement." },
  { cle: "endomorphe", nom: "Endomorphe", desc: "Tendance au surpoids, perte de gras plus lente." },
];

/**
 * Ratios en grammes par kilo de poids de corps, par morphotype et objectif.
 * Valeurs classiques de la littérature : les protéines restent hautes partout,
 * les glucides font la différence entre morphotypes, les lipides restent stables.
 */
const RATIOS = {
  prise_masse: {
    ectomorphe: { prot: 2.0, gluc: 6.0, lip: 1.2 },
    mesomorphe: { prot: 2.0, gluc: 4.5, lip: 1.0 },
    endomorphe: { prot: 2.2, gluc: 3.0, lip: 1.0 },
  },
  seche: {
    ectomorphe: { prot: 2.2, gluc: 3.0, lip: 0.9 },
    mesomorphe: { prot: 2.4, gluc: 2.0, lip: 0.8 },
    endomorphe: { prot: 2.5, gluc: 1.5, lip: 0.8 },
  },
};

/**
 * Besoins en macronutriments selon le poids, le morphotype et l'objectif.
 * @param {number} poidsKg
 * @param {"ectomorphe"|"mesomorphe"|"endomorphe"} morphotype
 * @param {"prise_masse"|"seche"} objectif
 * @returns {{prot:number, gluc:number, lip:number, kcal:number}}
 */
export function macrosMorphotype(poidsKg, morphotype, objectif = "prise_masse") {
  const p = Math.max(0, Number(poidsKg) || 0);
  const table = RATIOS[objectif] || RATIOS.prise_masse;
  const r = table[morphotype] || table.mesomorphe;
  const prot = Math.round(p * r.prot);
  const gluc = Math.round(p * r.gluc);
  const lip = Math.round(p * r.lip);
  return { prot, gluc, lip, kcal: prot * 4 + gluc * 4 + lip * 9 };
}

/** Toutes les combinaisons pour un poids donné (tableau comparatif). */
export function tableMorphotypes(poidsKg, objectif = "prise_masse") {
  return MORPHOTYPES.map((m) => ({ ...m, ...macrosMorphotype(poidsKg, m.cle, objectif) }));
}

/* ===================== 3. DURÉE DE SÉANCE ===================== */

/**
 * Durée estimée d'une séance à partir de lignes { series, reps, reposSec }.
 * Le temps sous tension est estimé à ~3 s par répétition (tempo contrôlé).
 * @param {{series:number, reps:number, reposSec:number}[]} lignes
 * @param {number} secParRep
 * @returns {{totalSec:number, totalMin:number, effortSec:number, reposSec:number, series:number, reps:number}}
 */
export function dureeSeance(lignes, secParRep = 3) {
  let effort = 0, repos = 0, series = 0, reps = 0;
  for (const l of lignes || []) {
    const s = Math.max(0, Number(l.series) || 0);
    const r = Math.max(0, Number(l.reps) || 0);
    const rep = Math.max(0, Number(l.reposSec) || 0);
    series += s; reps += s * r;
    effort += s * r * secParRep;
    repos += Math.max(0, s - 1) * rep; // pas de repos après la dernière série
  }
  const totalSec = effort + repos;
  return { totalSec, totalMin: Math.round(totalSec / 60), effortSec: effort, reposSec: repos, series, reps };
}

/* ===================== 4. ESTIMATION DU MAXIMUM ===================== */

/**
 * Pourcentage du maximum correspondant à un nombre de répétitions réalisées
 * jusqu'à l'échec (table classique, jusqu'à 12 répétitions).
 */
const PCT_PAR_REPS = { 1: 100, 2: 95, 3: 92.5, 4: 90, 5: 87, 6: 85, 7: 82.5, 8: 80, 9: 77, 10: 75, 11: 72, 12: 70 };

/** Pourcentage estimé du max pour un nombre de répétitions. */
export function pourcentagePourReps(reps) {
  const n = Math.max(1, Math.round(Number(reps) || 1));
  if (PCT_PAR_REPS[n] != null) return PCT_PAR_REPS[n];
  return Math.max(40, Math.round((100 - n * 2.5) * 10) / 10); // extrapolation prudente
}

/**
 * Maximum estimé à partir d'une charge portée pour un nombre de répétitions.
 * @returns {{max:number, pct:number}}
 */
export function maxDepuisSerie(chargeKg, reps) {
  const pct = pourcentagePourReps(reps);
  const kg = Math.max(0, Number(chargeKg) || 0);
  return { max: Math.round((kg / (pct / 100)) * 10) / 10, pct };
}

/**
 * Grille « charges de référence × répétitions » : pour chaque charge, le max
 * estimé si tu réalises `reps` répétitions.
 */
export function grilleMax(charges, reps) {
  return (charges || []).map((c) => ({ charge: c, ...maxDepuisSerie(c, reps) }));
}

/* ===================== 5. COMPOSITION CORPORELLE ===================== */

/**
 * Décompose le poids en masse grasse / masse maigre à partir du taux d'adiposité.
 * @param {number} poidsKg
 * @param {number} adipositePct
 */
export function composition(poidsKg, adipositePct) {
  const p = Math.max(0, Number(poidsKg) || 0);
  const pct = Math.max(0, Math.min(100, Number(adipositePct) || 0));
  const grasse = Math.round(p * (pct / 100) * 10) / 10;
  return { masseGrasseKg: grasse, masseMaigreKg: Math.round((p - grasse) * 10) / 10, adipositePct: pct };
}

/**
 * Estimation du taux d'adiposité par la méthode des circonférences (US Navy),
 * utile quand on n'a pas de balance à impédance. Mesures en centimètres.
 * @param {"H"|"F"} sexe
 * @param {{tailleCm:number, tourTailleCm:number, tourCouCm:number, tourHanchesCm:number}} m
 * @returns {number|null} pourcentage, ou null si les mesures sont insuffisantes
 */
export function adipositeNavy(sexe, m) {
  const T = Number(m?.tailleCm) || 0, W = Number(m?.tourTailleCm) || 0;
  const N = Number(m?.tourCouCm) || 0, H = Number(m?.tourHanchesCm) || 0;
  if (T <= 0 || W <= 0 || N <= 0) return null;
  const log10 = Math.log10;
  let pct;
  if (sexe === "F") {
    if (H <= 0) return null;
    if (W + H - N <= 0) return null;
    pct = 495 / (1.29579 - 0.35004 * log10(W + H - N) + 0.221 * log10(T)) - 450;
  } else {
    if (W - N <= 0) return null;
    pct = 495 / (1.0324 - 0.19077 * log10(W - N) + 0.15456 * log10(T)) - 450;
  }
  if (!Number.isFinite(pct)) return null;
  return Math.max(1, Math.min(70, Math.round(pct * 10) / 10));
}

/** Catégorie d'adiposité (repères indicatifs, non médicaux). */
export function categorieAdiposite(pct, sexe = "H") {
  const seuils = sexe === "F" ? [16, 24, 31] : [8, 18, 25];
  if (pct < seuils[0]) return { txt: "Très bas", col: "var(--amber)" };
  if (pct < seuils[1]) return { txt: "Athlétique", col: "var(--ok)" };
  if (pct < seuils[2]) return { txt: "Normal", col: "var(--ok)" };
  return { txt: "Élevé", col: "var(--amber)" };
}

/* ===================== 6. TEST CARDIO VÉLO ===================== */

/**
 * Protocoles de test sur vélo : paliers d'intensité croissante, avec relevé du
 * pouls à la fin de chaque palier. À refaire une fois par mois — plus les
 * pulsations baissent à effort égal, meilleure est la condition physique.
 */
export const TESTS_VELO = [
  {
    cle: "debutant", nom: "Niveau débutant", dureeMin: 16,
    paliers: [
      { nom: "Échauffement", min: 5, niveau: 2, rpm: "65–70", releve: false },
      { nom: "Palier 1", min: 2, niveau: 3, rpm: "75–80", releve: true },
      { nom: "Palier 2", min: 2, niveau: 4, rpm: "85–90", releve: true },
      { nom: "Palier 3", min: 2, niveau: 5, rpm: "105–110", releve: true },
      { nom: "Récupération (2 min)", min: 2, niveau: 2, rpm: "65–70", releve: true },
      { nom: "Récupération (5 min)", min: 3, niveau: 2, rpm: "65–70", releve: true },
    ],
  },
  {
    cle: "intermediaire", nom: "Niveau intermédiaire", dureeMin: 15,
    paliers: [
      { nom: "Échauffement", min: 5, niveau: 2, rpm: "70–75", releve: false },
      { nom: "Palier 1", min: 2, niveau: 4, rpm: "85–90", releve: true },
      { nom: "Palier 2", min: 2, niveau: 5, rpm: "105–110", releve: true },
      { nom: "Palier 3", min: 1, niveau: 6, rpm: "115–120", releve: true },
      { nom: "Récupération (2 min)", min: 2, niveau: 2, rpm: "70–75", releve: true },
      { nom: "Récupération (5 min)", min: 3, niveau: 2, rpm: "70–75", releve: true },
    ],
  },
];

/** Retrouve un protocole par sa clé. */
export function testVeloParCle(cle) {
  return TESTS_VELO.find((t) => t.cle === cle) || TESTS_VELO[0];
}

/**
 * Compare deux relevés de test (tableaux de pulsations par palier).
 * @returns {{moyenneA:number, moyenneB:number, delta:number, ameliore:boolean}|null}
 */
export function comparerTestsVelo(a, b) {
  const moy = (arr) => {
    const v = (arr || []).map(Number).filter((x) => Number.isFinite(x) && x > 0);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };
  const mA = moy(a), mB = moy(b);
  if (mA == null || mB == null) return null;
  const delta = Math.round((mB - mA) * 10) / 10;
  // Moins de pulsations au même effort = progrès.
  return { moyenneA: Math.round(mA), moyenneB: Math.round(mB), delta, ameliore: delta < 0 };
}
