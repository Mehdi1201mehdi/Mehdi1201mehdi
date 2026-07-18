// @ts-check
/**
 * Création et édition de ROUTINES personnalisées (programmes illimités créés à
 * la main), de leurs séances, exercices et séries. Permet aussi de dupliquer
 * une ancienne séance réalisée pour la refaire.
 *
 * Toutes les fonctions sont PURES (aucun accès DOM/stockage) et opèrent sur des
 * objets au même format que le programme généré (voir models.js), afin que le
 * moteur de séance existant puisse les exécuter sans modification.
 */
import { getExercise } from "../data/exercises.js";

let _seq = 0;
/** Identifiant unique (préfixé), sans dépendance au navigateur. */
export function nouvelId(prefixe = "r") {
  const rnd = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefixe}-${Date.now().toString(36)}-${(_seq++).toString(36)}-${rnd}`;
}

/** Nettoie un nom saisi (fallback si vide). */
function nomPropre(nom, defaut) {
  const s = String(nom == null ? "" : nom).trim();
  return s || defaut;
}

/** Crée une routine personnalisée vide. */
export function creerRoutine(nom, maintenant = new Date().toISOString()) {
  return {
    id: nouvelId("routine"),
    nom: nomPropre(nom, "Ma routine"),
    split: "perso",
    perso: true,
    createdAt: maintenant,
    seances: [],
    justificationGlobale: "Routine créée à la main.",
  };
}

/** Renomme une routine ou une séance (objet avec `.nom`). */
export function renommer(obj, nom) {
  if (obj) obj.nom = nomPropre(nom, obj.nom || "Sans nom");
  return obj;
}

/** Ajoute une séance vide à une routine. Renvoie la séance créée. */
export function ajouterSeance(routine, nom) {
  const seance = {
    id: nouvelId("seance"),
    nom: nomPropre(nom, `Séance ${routine.seances.length + 1}`),
    indexJour: routine.seances.length,
    groupesCibles: [],
    exercices: [],
    dureeEstimeeMin: 0,
  };
  routine.seances.push(seance);
  return seance;
}

/** Supprime une séance d'une routine. */
export function supprimerSeance(routine, seanceId) {
  routine.seances = routine.seances.filter((s) => s.id !== seanceId);
  return routine;
}

/** Série de travail par défaut adaptée à l'exercice (temps ou répétitions). */
export function serieTemplateDefaut(exo, opts = {}) {
  const enTemps = exo && (exo.typeExercice === "gainage" || exo.typeExercice === "cardio");
  return {
    type: "travail",
    repsCible: enTemps ? null : (opts.repsCible || [8, 12]),
    dureeSec: enTemps ? (opts.dureeSec || 40) : null,
    distanceM: null, rirCible: opts.rirCible ?? 2, rpeCible: null,
    tempo: null, reposSec: opts.reposSec ?? 90, chargeKg: null,
  };
}

/**
 * Ajoute un exercice (du catalogue) à une séance, avec un nombre de séries de
 * travail par défaut. Renvoie le gabarit d'exercice, ou null si l'id est inconnu
 * (on ne crée pas de fausse donnée).
 */
export function ajouterExercice(seance, exerciceId, opts = {}) {
  const exo = getExercise(exerciceId);
  if (!exo) return null;
  const nbSeries = clampInt(opts.nbSeries, 1, 10, 3);
  const modele = serieTemplateDefaut(exo, opts);
  const exercice = {
    exerciceId,
    role: opts.role || (exo.typeExercice === "isolation" ? "isolation" : "principal"),
    series: Array.from({ length: nbSeries }, () => ({ ...modele })),
    justification: "Ajouté manuellement.",
    supersetGroupe: null,
  };
  seance.exercices.push(exercice);
  seance.dureeEstimeeMin = estimerDureeSeance(seance);
  return exercice;
}

/** Supprime un exercice d'une séance (par index, pour gérer les doublons). */
export function supprimerExerciceIndex(seance, index) {
  if (index >= 0 && index < seance.exercices.length) seance.exercices.splice(index, 1);
  seance.dureeEstimeeMin = estimerDureeSeance(seance);
  return seance;
}

/** Déplace un exercice dans l'ordre de la séance (sens = -1 haut, +1 bas). */
export function deplacerExercice(seance, index, sens) {
  const j = index + sens;
  if (index < 0 || index >= seance.exercices.length || j < 0 || j >= seance.exercices.length) return seance;
  const [ex] = seance.exercices.splice(index, 1);
  seance.exercices.splice(j, 0, ex);
  return seance;
}

/** Redéfinit les paramètres de séries d'un exercice (nb, reps, repos, durée). */
export function definirSeries(exercice, params = {}) {
  const nb = clampInt(params.nbSeries, 1, 10, exercice.series.length || 3);
  const exo = getExercise(exercice.exerciceId);
  const modele = serieTemplateDefaut(exo, params);
  exercice.series = Array.from({ length: nb }, () => ({ ...modele }));
  return exercice;
}

/** Estimation grossière de la durée d'une séance (minutes). */
export function estimerDureeSeance(seance) {
  let sec = 0;
  for (const e of seance.exercices || []) {
    for (const s of e.series || []) {
      const effort = s.dureeSec ? s.dureeSec : 45; // ~45 s par série chargée
      sec += effort + (s.reposSec || 90);
    }
  }
  return Math.max(0, Math.round(sec / 60));
}

/** Duplique une routine (nouveaux identifiants partout). */
export function dupliquerRoutine(routine, maintenant = new Date().toISOString()) {
  const copie = JSON.parse(JSON.stringify(routine));
  copie.id = nouvelId("routine");
  copie.nom = `${routine.nom} (copie)`;
  copie.createdAt = maintenant;
  copie.perso = true;
  copie.split = "perso";
  for (const s of copie.seances) s.id = nouvelId("seance");
  return copie;
}

/**
 * Construit une séance à partir d'une séance RÉALISÉE (log), pour la refaire.
 * Les répétitions cibles sont estimées à partir des reps effectivement faites
 * (médiane arrondie), les charges ne sont pas imposées (chargeKg = null).
 * @param {any} log  une entrée de Etat.data.logs
 */
export function seanceDepuisLog(log, nom) {
  const seance = {
    id: nouvelId("seance"),
    nom: nomPropre(nom, log && log.seanceNom ? `${log.seanceNom} (copie)` : "Séance dupliquée"),
    indexJour: 0, groupesCibles: [], exercices: [], dureeEstimeeMin: 0,
  };
  for (const ex of (log && log.exercices) || []) {
    const exo = getExercise(ex.exerciceId);
    if (!exo) continue; // n'invente pas d'exercice inconnu
    const series = (ex.series || []).filter((s) => s && (s.reps || s.dureeSec || s.chargeKg));
    const nb = Math.max(1, series.length);
    const enTemps = series.length > 0 && series.every((s) => s.dureeSec && !s.reps);
    let modele;
    if (enTemps) {
      const d = medianeArrondie(series.map((s) => s.dureeSec).filter(Boolean)) || 40;
      modele = serieTemplateDefaut(exo, { dureeSec: d });
    } else {
      const rep = medianeArrondie(series.map((s) => s.reps).filter(Boolean)) || 10;
      modele = serieTemplateDefaut(exo, { repsCible: [Math.max(1, rep - 2), rep + 2] });
    }
    seance.exercices.push({
      exerciceId: ex.exerciceId,
      role: "principal",
      series: Array.from({ length: nb }, () => ({ ...modele })),
      justification: "Repris d'une séance précédente.",
      supersetGroupe: null,
    });
  }
  seance.dureeEstimeeMin = estimerDureeSeance(seance);
  return seance;
}

/** Médiane arrondie d'une liste de nombres (0 si vide). */
function medianeArrondie(arr) {
  const xs = arr.map(Number).filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!xs.length) return 0;
  const m = xs[Math.floor(xs.length / 2)];
  return Math.round(m);
}

/** Entier borné avec valeur par défaut. */
function clampInt(v, min, max, defaut) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return defaut;
  return Math.min(max, Math.max(min, n));
}
