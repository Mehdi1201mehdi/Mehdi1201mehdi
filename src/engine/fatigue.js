// @ts-check
/**
 * MOTEUR DE FATIGUE ET DE RÉCUPÉRATION — fonctions PURES.
 *
 * ⚠️ CE QUE CE MODULE N'EST PAS
 * Il ne mesure ni les dommages musculaires, ni le glycogène, ni l'inflammation,
 * ni les hormones, ni le système nerveux. Rien ici n'est mesurable sans
 * laboratoire. Ce sont des **indices de programmation** : un modèle de charge
 * de travail qui accumule et décroît dans le temps, calibré sur des ordres de
 * grandeur usuels en musculation. Tous les paramètres sont regroupés dans
 * `PARAMS` pour être ajustés.
 *
 * Vocabulaire :
 *  - `stress`      : séries équivalentes pondérées reçues par un muscle
 *  - `fatigue`     : 0–100, indice de sollicitation résiduelle
 *  - `readiness`   : 0–100, disponibilité affichée = 100 − fatigue
 */

import { coefficientsPour, facteurFatigue } from "../data/exercise-muscle-map.js";
import { CLES_MOTEUR, DEF_MOTEUR as DEF } from "../data/muscles-moteur.js";

/* ============================ PARAMÈTRES CALIBRABLES ============================ */

export const PARAMS = {
  /** Constante de saturation : nombre de séries équivalentes « fortes » pour
   *  approcher la fatigue maximale. Plus K est grand, plus il faut de volume. */
  K_SATURATION: 7,

  /** Demi-vies de récupération en heures, selon l'intensité de la sollicitation.
   *  Paramètres INITIAUX du modèle, pas des vérités biologiques. */
  DEMI_VIE_H: { faible: 18, moderee: 25, forte: 32, tres_forte: 40 },

  /** Seuils de séries équivalentes délimitant ces niveaux. */
  SEUILS_SOLLICITATION: { moderee: 3, forte: 6, tres_forte: 10 },

  /** Multiplicateur d'effort par RIR (interpolé linéairement entre les points). */
  EFFORT_RIR: { 0: 1.00, 1: 0.95, 2: 0.88, 3: 0.78, 4: 0.65, 5: 0.50, 6: 0.35 },

  /** RIR supposé quand il n'est pas renseigné (valeur prudente). */
  RIR_DEFAUT: 2,

  /** Surcoût de récupération quand des séries sont menées à l'échec (RIR 0). */
  SURCOUT_ECHEC: 0.15,
  /** Allongement max de la demi-vie dû à l'échec (facteur). */
  ECHEC_DEMI_VIE_MAX: 1.35,

  /** Objectif de séries équivalentes par muscle et par semaine, par niveau. */
  VOLUME_HEBDO_CIBLE: { debutant: 8, intermediaire: 12, avance: 16 },

  /** Modulation de l'objectif selon la taille du groupe musculaire. */
  FACTEUR_TAILLE: { grand: 1.0, moyen: 0.85, petit: 0.7 },

  /** Modulation de la DEMI-VIE selon la taille : les petits groupes
   *  (bras, mollets, deltoïdes) récupèrent plus vite que les gros. */
  DEMI_VIE_TAILLE: { grand: 1.0, moyen: 0.85, petit: 0.7 },

  /** Zones de disponibilité (bornes basses, en %). */
  ZONES: [
    { min: 90, cle: "frais", nom: "Frais" },
    { min: 75, cle: "pret", nom: "Prêt" },
    { min: 60, cle: "prudence", nom: "Disponible avec prudence" },
    { min: 40, cle: "recuperation", nom: "En récupération" },
    { min: 0, cle: "repos", nom: "À laisser récupérer" },
  ],
};

/* ============================ EFFORT ============================ */

/**
 * Multiplicateur d'effort à partir du RIR, interpolé continûment (pas de
 * marches brutales entre RIR 2 et 3).
 * @param {number} rir répétitions en réserve
 */
export function facteurEffort(rir) {
  const r = Math.max(0, Number(rir) || 0);
  const t = PARAMS.EFFORT_RIR;
  if (r >= 6) return t[6];
  const bas = Math.floor(r), haut = Math.min(6, bas + 1);
  const f = r - bas;
  return t[bas] + (t[haut] - t[bas]) * f;
}

/**
 * Estime un RIR quand il n'est pas renseigné, à partir des répétitions
 * réalisées comparées à l'habitude sur cet exercice. Jamais présenté comme
 * certain : c'est une valeur prudente destinée à ne pas bloquer le calcul.
 *
 * @param {{reps?:number, chargeKg?:number}} serie
 * @param {{repsMoy?:number, chargeMoy?:number}} [reference] moyennes récentes
 * @returns {{rir:number, estime:boolean}}
 */
export function estimerRIR(serie, reference = null) {
  const reps = Number(serie?.reps) || 0;
  if (!reference || !reference.repsMoy) return { rir: PARAMS.RIR_DEFAUT, estime: true };
  const charge = Number(serie?.chargeKg) || 0;
  const chargeRef = Number(reference.chargeMoy) || 0;
  // Plus de répétitions que d'habitude à charge égale ou supérieure → série
  // menée plus près de l'échec. Moins de répétitions → série plus conservatrice.
  let rir = PARAMS.RIR_DEFAUT;
  const ecartReps = reps - reference.repsMoy;
  if (chargeRef > 0 && charge > chargeRef * 1.02) rir -= 0.5; // charge en hausse
  rir -= ecartReps * 0.35;
  return { rir: Math.max(0, Math.min(6, Math.round(rir * 10) / 10)), estime: true };
}

/* ============================ STRESS D'UNE SÉRIE ============================ */

/**
 * Charge effective d'UNE série pour UN muscle.
 * Volontairement PAS « poids × répétitions » : c'est la proximité de l'échec
 * et la nature du mouvement qui pilotent le coût de récupération, pas le
 * tonnage brut.
 *
 * @param {number} coefficientMuscle contribution du muscle (0–1)
 * @param {number} effort multiplicateur RIR
 * @param {number} facteurExo facteur de fatigue du type d'exercice
 * @param {number} completion 1 si la série a été réalisée, <1 si partielle
 */
export function stressSerie(coefficientMuscle, effort, facteurExo, completion = 1) {
  return Math.max(0, coefficientMuscle * effort * facteurExo * completion);
}

/* ============================ SATURATION ET COMBINAISON ============================ */

/**
 * Convertit un cumul de séries équivalentes en indice de fatigue 0–100.
 * Fonction saturante : les premières séries comptent beaucoup, les suivantes
 * de moins en moins. On n'additionne jamais des pourcentages.
 */
export function saturation(stress, K = PARAMS.K_SATURATION) {
  const s = Math.max(0, Number(stress) || 0);
  return Math.max(0, Math.min(100, 100 * (1 - Math.exp(-s / Math.max(0.1, K)))));
}

/**
 * Combine une fatigue existante avec un nouvel apport, sans jamais dépasser 100
 * ni additionner naïvement : le nouvel apport n'agit que sur la marge restante.
 */
export function combinerFatigue(ancienne, nouvelle) {
  const a = Math.max(0, Math.min(100, Number(ancienne) || 0));
  const n = Math.max(0, Math.min(100, Number(nouvelle) || 0));
  return Math.max(0, Math.min(100, a + n * (1 - a / 100)));
}

/**
 * Décroissance temporelle : demi-vie exponentielle.
 * @param {number} fatigue valeur de départ
 * @param {number} heures temps écoulé
 * @param {number} demiVieH demi-vie en heures
 */
export function decroissance(fatigue, heures, demiVieH) {
  const f = Math.max(0, Math.min(100, Number(fatigue) || 0));
  const h = Math.max(0, Number(heures) || 0);
  const dv = Math.max(1, Number(demiVieH) || PARAMS.DEMI_VIE_H.moderee);
  return f * Math.pow(2, -h / dv);
}

/**
 * Demi-vie applicable selon le volume reçu et la part de séries à l'échec.
 * @param {number} seriesEquivalentes
 * @param {number} partEchec 0–1
 */
export function demiVie(seriesEquivalentes, partEchec = 0, taille = "moyen", facteurAppris = 1) {
  const s = Math.max(0, seriesEquivalentes);
  const S = PARAMS.SEUILS_SOLLICITATION;
  let base;
  if (s >= S.tres_forte) base = PARAMS.DEMI_VIE_H.tres_forte;
  else if (s >= S.forte) base = PARAMS.DEMI_VIE_H.forte;
  else if (s >= S.moderee) base = PARAMS.DEMI_VIE_H.moderee;
  else base = PARAMS.DEMI_VIE_H.faible;
  // L'échec augmente la fatigue aiguë : il n'est pas nécessaire à l'hypertrophie,
  // mais il coûte plus cher en récupération.
  const mult = 1 + Math.min(1, Math.max(0, partEchec)) * (PARAMS.ECHEC_DEMI_VIE_MAX - 1);
  const tailleMult = PARAMS.DEMI_VIE_TAILLE[taille] ?? 0.85;
  // Calibration apprise sur l'historique (voir engine/apprentissage.js), bornée
  // en amont ; ici on se contente de refuser une valeur aberrante.
  const appris = Number.isFinite(facteurAppris) && facteurAppris > 0
    ? Math.max(0.5, Math.min(2, facteurAppris)) : 1;
  return base * mult * tailleMult * appris;
}

/* ============================ ANALYSE D'UNE SÉANCE ============================ */

/**
 * Décompose une séance enregistrée en stress par muscle.
 * @param {any} log séance : { date, exercices:[{exerciceId, series:[{chargeKg,reps,rir}]}] }
 * @param {(id:string)=>any} getExercise
 * @returns {{parMuscle:Record<string,{stress:number, direct:number, indirect:number, echec:number, series:number}>, total:number}}
 */
export function analyserSeance(log, getExercise) {
  /** @type {Record<string, any>} */
  const parMuscle = {};
  let total = 0;
  for (const ex of (log && log.exercices) || []) {
    const exo = getExercise(ex.exerciceId);
    if (!exo) continue;
    const coeffs = coefficientsPour(exo);
    const fExo = facteurFatigue(exo);
    // Moyennes de l'exercice sur cette séance, pour estimer un RIR manquant.
    const sers = ex.series || [];
    const repsVals = sers.map((s) => Number(s.reps) || 0).filter((x) => x > 0);
    const chVals = sers.map((s) => Number(s.chargeKg) || 0).filter((x) => x > 0);
    const ref = repsVals.length
      ? { repsMoy: repsVals.reduce((a, x) => a + x, 0) / repsVals.length,
          chargeMoy: chVals.length ? chVals.reduce((a, x) => a + x, 0) / chVals.length : 0 }
      : null;

    for (const s of sers) {
      const rirBrut = s.rir == null || s.rir === "" ? null : Number(s.rir);
      const { rir } = rirBrut != null && Number.isFinite(rirBrut)
        ? { rir: rirBrut } : estimerRIR(s, ref);
      const effort = facteurEffort(rir);
      // Une série sans aucune donnée réalisée ne compte pas.
      const faite = (Number(s.reps) || 0) > 0 || (Number(s.dureeSec) || 0) > 0;
      if (!faite) continue;
      const echec = rir <= 0.5 ? 1 : 0;
      for (const [muscle, coef] of Object.entries(coeffs)) {
        const st = stressSerie(coef, effort, fExo, 1);
        if (!parMuscle[muscle]) parMuscle[muscle] = { stress: 0, direct: 0, indirect: 0, echec: 0, series: 0 };
        const e = parMuscle[muscle];
        e.stress += st;
        e.series += 1;
        if (coef >= 0.7) e.direct += coef * effort; else e.indirect += coef * effort;
        e.echec += echec * coef;
        total += st;
      }
    }
  }
  return { parMuscle, total };
}

/* ============================ ÉTAT MUSCULAIRE COMPLET ============================ */

/**
 * Calcule l'état des 18 groupes musculaires à partir de l'historique.
 *
 * Rejoue les séances dans l'ordre chronologique : chaque séance ajoute du
 * stress (saturé, combiné à l'existant), et le temps entre deux séances fait
 * décroître la fatigue. C'est ce qui permet de rouvrir l'application des jours
 * plus tard et d'obtenir une disponibilité correcte sans rien stocker.
 *
 * @param {any[]} logs séances réalisées
 * @param {(id:string)=>any} getExercise
 * @param {number} [maintenant] timestamp
 * @param {{niveau?:string, ressenti?:number, facteurs?:Record<string,number>}} [opts]
 *        ressenti : −1 (frais) à +1 (très fatigué) ;
 *        facteurs : calibration apprise par muscle (1 = modèle générique)
 * @returns {Record<string, any>} muscleState par clé
 */
export function etatMusculaire(logs, getExercise, maintenant = Date.now(), opts = {}) {
  const facteurs = (opts && opts.facteurs) || {};
  const fa = (cle) => facteurs[cle] || 1;
  /** @type {Record<string, any>} */
  const etat = {};
  for (const cle of CLES_MOTEUR) {
    etat[cle] = {
      fatigue: 0, recovery: 100, readiness: 100,
      weeklyDirectSets: 0, weeklyIndirectSets: 0, weeklyEquivalentSets: 0,
      lastDirectTraining: null, lastIndirectTraining: null, lastHighStressTraining: null,
      recentPerformanceTrend: 0, priority: 0,
      _dernierT: null, _dernierVolume: 0, _dernierEchec: 0,
    };
  }

  const tries = (logs || [])
    .filter((l) => l && l.date && Number.isFinite(Date.parse(l.date)))
    .slice()
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  const seuilSemaine = maintenant - 7 * 864e5;

  for (const log of tries) {
    const t = Date.parse(log.date);
    if (t > maintenant) continue; // séance future : ignorée
    const { parMuscle } = analyserSeance(log, getExercise);
    for (const [muscle, e] of Object.entries(parMuscle)) {
      const m = etat[muscle];
      if (!m) continue;
      // 1) faire décroître la fatigue accumulée jusqu'à cette séance
      if (m._dernierT != null) {
        const h = (t - m._dernierT) / 36e5;
        m.fatigue = decroissance(m.fatigue, h, demiVie(m._dernierVolume, m._dernierEchec, DEF[muscle]?.taille, fa(muscle)));
      }
      // 2) ajouter le nouveau stress, saturé puis combiné
      const apport = saturation(e.stress);
      m.fatigue = combinerFatigue(m.fatigue, apport);
      m._dernierT = t;
      m._dernierVolume = e.stress;
      m._dernierEchec = e.series ? Math.min(1, e.echec / Math.max(1, e.direct + e.indirect)) : 0;
      // 3) dates de sollicitation
      if (e.direct > 0.5) m.lastDirectTraining = t;
      if (e.indirect > 0) m.lastIndirectTraining = t;
      if (e.stress >= PARAMS.SEUILS_SOLLICITATION.forte) m.lastHighStressTraining = t;
      // 4) volume des 7 derniers jours
      if (t >= seuilSemaine) {
        m.weeklyDirectSets += e.direct;
        m.weeklyIndirectSets += e.indirect;
        m.weeklyEquivalentSets += e.stress;
      }
    }
  }

  // Décroissance finale jusqu'à maintenant + arrondis
  const ressenti = Math.max(-1, Math.min(1, Number(opts.ressenti) || 0));
  for (const cle of CLES_MOTEUR) {
    const m = etat[cle];
    if (m._dernierT != null) {
      const h = (maintenant - m._dernierT) / 36e5;
      m.fatigue = decroissance(m.fatigue, h, demiVie(m._dernierVolume, m._dernierEchec, DEF[cle]?.taille, fa(cle)));
    }
    // Le ressenti déclaré module légèrement, sans jamais écraser les données
    // d'entraînement (±12 points au maximum).
    if (ressenti !== 0) m.fatigue = Math.max(0, Math.min(100, m.fatigue + ressenti * 12));
    m.fatigue = Math.round(m.fatigue * 10) / 10;
    m.recovery = Math.round((100 - m.fatigue) * 10) / 10;
    m.readiness = m.recovery;
    m.weeklyDirectSets = Math.round(m.weeklyDirectSets * 10) / 10;
    m.weeklyIndirectSets = Math.round(m.weeklyIndirectSets * 10) / 10;
    m.weeklyEquivalentSets = Math.round(m.weeklyEquivalentSets * 10) / 10;
    delete m._dernierT; delete m._dernierVolume; delete m._dernierEchec;
  }
  return etat;
}

/* ============================ ZONES ET OBJECTIFS ============================ */

/** Zone de disponibilité correspondant à un readiness. */
export function zoneDisponibilite(readiness) {
  const r = Math.max(0, Math.min(100, Number(readiness) || 0));
  return PARAMS.ZONES.find((z) => r >= z.min) || PARAMS.ZONES[PARAMS.ZONES.length - 1];
}

/**
 * Objectif de séries équivalentes hebdomadaires pour un muscle donné.
 * @param {string} muscle
 * @param {string} niveau debutant | intermediaire | avance
 * @param {Record<string,any>} defs table des définitions musculaires
 */
export function cibleVolumeHebdo(muscle, niveau = "intermediaire", defs = null) {
  const base = PARAMS.VOLUME_HEBDO_CIBLE[niveau] ?? PARAMS.VOLUME_HEBDO_CIBLE.intermediaire;
  const taille = defs && defs[muscle] ? defs[muscle].taille : "moyen";
  return Math.round(base * (PARAMS.FACTEUR_TAILLE[taille] ?? 0.85) * 10) / 10;
}
