// @ts-check
/**
 * Volume hebdomadaire et fréquence par groupe musculaire d'un PROGRAMME.
 *
 * Unité : la série de travail « dure » (proche de l'échec, RIR ≤ 3). Un muscle
 * principal compte 1 série, un muscle secondaire ½ — convention courante en
 * programmation d'hypertrophie (Schoenfeld 2017, revue dose-réponse ; repères
 * de 10 à 20 séries hebdomadaires pour un pratiquant entraîné).
 *
 * Les fourchettes ci-dessous sont des repères de départ, pas des vérités : le
 * moteur de cycle les réévalue avec les données réelles (progression, fatigue).
 * Module pur : aucune dépendance au DOM ni à l'état.
 */

/** Groupes suivis — la liste du cahier des charges (11 groupes). */
export const MUSCLES_SUIVIS = [
  "pectoraux", "dorsaux", "epaules", "biceps", "triceps", "avant_bras",
  "quadriceps", "ischios", "fessiers", "mollets", "abdominaux",
];

const TAILLE = {
  pectoraux: "grand", dorsaux: "grand", quadriceps: "grand", ischios: "grand", fessiers: "grand",
  epaules: "moyen", biceps: "moyen", triceps: "moyen",
  avant_bras: "petit", mollets: "petit", abdominaux: "petit", trapezes: "petit", lombaires: "petit",
  adducteurs: "petit", abducteurs: "petit",
};

/** Séries hebdomadaires visées [min, max] par taille de muscle et niveau. */
const FOURCHETTES = {
  grand: { grand_debutant: [6, 10], debutant: [6, 10], intermediaire: [10, 16], avance: [12, 20] },
  moyen: { grand_debutant: [4, 8], debutant: [4, 8], intermediaire: [7, 12], avance: [9, 15] },
  petit: { grand_debutant: [2, 6], debutant: [2, 6], intermediaire: [4, 10], avance: [6, 12] },
};

/**
 * Fourchette de séries hebdomadaires pour un muscle et un niveau.
 * @param {string} muscle
 * @param {string} [niveau]
 * @returns {[number, number]}
 */
export function fourchetteVolume(muscle, niveau = "intermediaire") {
  const t = FOURCHETTES[TAILLE[muscle] || "moyen"];
  return /** @type {[number,number]} */ ([...(t[niveau] || t.intermediaire)]);
}

/** Séries de travail d'un exercice planifié (les approches ne comptent pas). */
export function seriesTravail(exercicePlanifie) {
  return (exercicePlanifie.series || []).filter((s) => s.type !== "echauffement").length;
}

/**
 * Volume et fréquence par muscle pour une semaine du programme.
 * @param {{seances: any[]}} programme
 * @param {(id: string) => any} getExercise
 * @returns {Record<string, {series: number, frequence: number}>}
 */
export function volumeProgramme(programme, getExercise) {
  /** @type {Record<string, {series:number, frequence:number}>} */
  const out = {};
  for (const seance of (programme && programme.seances) || []) {
    /** @type {Record<string, number>} */
    const parSeance = {};
    for (const e of seance.exercices || []) {
      const exo = getExercise(e.exerciceId);
      if (!exo) continue;
      const n = seriesTravail(e);
      for (const m of exo.musclesPrincipaux || []) parSeance[m] = (parSeance[m] || 0) + n;
      for (const m of exo.musclesSecondaires || []) parSeance[m] = (parSeance[m] || 0) + n * 0.5;
    }
    for (const [m, v] of Object.entries(parSeance)) {
      if (!out[m]) out[m] = { series: 0, frequence: 0 };
      out[m].series += v;
      // Une séance « compte » pour la fréquence à partir d'une série directe.
      if (v >= 1) out[m].frequence += 1;
    }
  }
  for (const v of Object.values(out)) v.series = Math.round(v.series * 2) / 2;
  return out;
}

/**
 * Bilan lisible : chaque muscle suivi avec son volume, sa fréquence, sa
 * fourchette et un statut.
 * @param {{seances:any[]}} programme
 * @param {(id:string)=>any} getExercise
 * @param {string} [niveau]
 * @returns {{muscle:string, series:number, frequence:number, min:number, max:number, statut:"bas"|"ok"|"haut"}[]}
 */
export function bilanVolume(programme, getExercise, niveau = "intermediaire") {
  const vol = volumeProgramme(programme, getExercise);
  return MUSCLES_SUIVIS.map((muscle) => {
    const { series = 0, frequence = 0 } = vol[muscle] || {};
    const [min, max] = fourchetteVolume(muscle, niveau);
    const statut = series < min ? "bas" : series > max ? "haut" : "ok";
    return { muscle, series, frequence, min, max, statut };
  });
}

/**
 * Ajoute des séries là où un muscle est sous sa cible, sans dépasser la durée
 * prévue des séances. Muscles concernés : les muscles prioritaires du profil
 * (visés au milieu de la fourchette) et, pour l'objectif « développement
 * harmonieux », tous les muscles suivis (visés au minimum).
 *
 * Jamais plus d'une série ajoutée par exercice, jamais sur un exercice en
 * temps ni sur un mouvement principal déjà à 5 séries. Mute le programme et
 * renvoie la liste des ajouts (pour la justification).
 *
 * @param {{seances:any[]}} programme
 * @param {(id:string)=>any} getExercise
 * @param {any} profil
 * @param {(series:any[]) => number} dureeExoMin
 * @returns {{muscle:string, exerciceId:string, seance:string}[]}
 */
export function equilibrerVolume(programme, getExercise, profil, dureeExoMin) {
  if (!programme || profil.objectif === "mobilite") return [];
  const niveau = profil.niveau || "intermediaire";
  const prioritaires = (profil.musclesPrioritaires || []).filter((m) => MUSCLES_SUIVIS.includes(m));
  /** @type {Record<string, number>} */
  const cibles = {};
  for (const m of prioritaires) { const [a, b] = fourchetteVolume(m, niveau); cibles[m] = Math.ceil((a + b) / 2); }
  if (profil.objectif === "harmonie") {
    for (const m of MUSCLES_SUIVIS) if (cibles[m] == null) cibles[m] = fourchetteVolume(m, niveau)[0];
  }
  const ajouts = [];
  const dejaAugmente = new Set();
  // Ordre stable : les muscles dans l'ordre de la liste suivie.
  for (const muscle of MUSCLES_SUIVIS) {
    if (cibles[muscle] == null) continue;
    let garde = 0;
    while (garde++ < 6) {
      const actuel = (volumeProgramme(programme, getExercise)[muscle] || { series: 0 }).series;
      if (actuel >= cibles[muscle]) break;
      const cand = meilleurCandidat(programme, getExercise, muscle, profil, dejaAugmente, dureeExoMin);
      if (!cand) break;
      const { seance, exo } = cand;
      const travail = exo.series.filter((s) => s.type !== "echauffement");
      exo.series.push({ ...travail[travail.length - 1] });
      dejaAugmente.add(`${seance.id}|${exo.exerciceId}`);
      seance.dureeEstimeeMin = Math.round(seance.dureeEstimeeMin + dureeExoMin([travail[travail.length - 1]]));
      ajouts.push({ muscle, exerciceId: exo.exerciceId, seance: seance.nom });
    }
  }
  return ajouts;
}

function meilleurCandidat(programme, getExercise, muscle, profil, dejaAugmente, dureeExoMin) {
  const limite = Number(profil.dureeSeanceMin) || 60;
  let meilleur = null, scoreMax = -Infinity;
  for (const seance of programme.seances || []) {
    for (const e of seance.exercices || []) {
      if (dejaAugmente.has(`${seance.id}|${e.exerciceId}`)) continue;
      const exo = getExercise(e.exerciceId);
      if (!exo) continue;
      const travail = (e.series || []).filter((s) => s.type !== "echauffement");
      if (!travail.length || travail.some((s) => s.dureeSec) || travail.length >= 5) continue;
      const principal = (exo.musclesPrincipaux || []).includes(muscle);
      const secondaire = (exo.musclesSecondaires || []).includes(muscle);
      if (!principal && !secondaire) continue;
      const surcout = dureeExoMin([travail[travail.length - 1]]);
      if ((seance.dureeEstimeeMin || 0) + surcout > limite) continue;
      // Préférence : muscle principal, puis isolation (moins de fatigue globale).
      const score = (principal ? 10 : 0) + (e.role === "isolation" ? 3 : e.role === "secondaire" ? 2 : 0) - travail.length;
      if (score > scoreMax) { scoreMax = score; meilleur = { seance, exo: e }; }
    }
  }
  return meilleur;
}
