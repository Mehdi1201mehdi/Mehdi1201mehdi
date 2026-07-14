// @ts-check
/**
 * Générateur de programmes DÉTERMINISTE, testable et explicable.
 * Aucune génération aléatoire : à profil identique, programme identique.
 * L'IA n'intervient jamais ici ; elle ne fait que proposer des ajustements
 * qui repassent par ce moteur.
 */
import { MUSCLE_LABELS, GOAL_LABELS } from "../models.js";
import { filtrerExercices, DIFFICULTE_CIBLE } from "./constraints.js";

/* ------------------------------------------------------------------ */
/* 1. Choix du split hebdomadaire                                      */
/* ------------------------------------------------------------------ */
export function choisirSplit(profil) {
  if (profil.objectif === "mobilite") return "mobilite";
  const j = profil.joursParSemaine;
  if (j <= 3) return "full_body";
  if (j === 4) return "haut_bas";
  if (j === 5) return "push_pull_legs";
  return "push_pull_legs";
}

/* ------------------------------------------------------------------ */
/* 2-3. Modèles de séances (slots = muscle visé + rôle + patrons)      */
/* ------------------------------------------------------------------ */
const S = (muscle, role, patrons) => ({ muscle, role, patrons: patrons || null });

const SLOTS = {
  full_body_A: [
    S("quadriceps", "principal", ["squat"]),
    S("dorsaux", "principal", ["tirage_horizontal", "tirage_vertical"]),
    S("pectoraux", "principal", ["poussee_horizontale"]),
    S("epaules", "secondaire", ["poussee_verticale"]),
    S("biceps", "isolation"),
    S("abdominaux", "gainage"),
  ],
  full_body_B: [
    S("ischios", "principal", ["charniere_hanche"]),
    S("pectoraux", "principal", ["poussee_horizontale", "poussee_verticale"]),
    S("dorsaux", "principal", ["tirage_vertical", "tirage_horizontal"]),
    S("quadriceps", "secondaire", ["fente"]),
    S("triceps", "isolation"),
    S("abdominaux", "gainage"),
  ],
  full_body_C: [
    S("quadriceps", "principal", ["fente", "squat"]),
    S("epaules", "principal", ["poussee_verticale"]),
    S("dorsaux", "principal", ["tirage_horizontal", "tirage_vertical"]),
    S("mollets", "isolation"),
    S("epaules", "isolation"),
    S("abdominaux", "gainage"),
  ],
  haut: [
    S("pectoraux", "principal", ["poussee_horizontale"]),
    S("dorsaux", "principal", ["tirage_vertical", "tirage_horizontal"]),
    S("epaules", "secondaire", ["poussee_verticale"]),
    S("dorsaux", "secondaire", ["tirage_horizontal"]),
    S("biceps", "isolation"),
    S("triceps", "isolation"),
  ],
  bas: [
    S("quadriceps", "principal", ["squat"]),
    S("ischios", "principal", ["charniere_hanche"]),
    S("quadriceps", "secondaire", ["fente"]),
    S("fessiers", "secondaire", ["charniere_hanche"]),
    S("mollets", "isolation"),
    S("abdominaux", "gainage"),
  ],
  push: [
    S("pectoraux", "principal", ["poussee_horizontale"]),
    S("epaules", "principal", ["poussee_verticale"]),
    S("pectoraux", "secondaire", ["poussee_horizontale"]),
    S("triceps", "isolation"),
    S("epaules", "isolation"),
    S("triceps", "isolation"),
  ],
  pull: [
    S("dorsaux", "principal", ["tirage_vertical"]),
    S("dorsaux", "principal", ["tirage_horizontal"]),
    S("dorsaux", "secondaire", ["tirage_horizontal"]),
    S("biceps", "isolation"),
    S("epaules", "isolation"),
    S("abdominaux", "gainage"),
  ],
  mobilite: [
    S("corps_entier", "cardio"),
    S("fessiers", "cardio"),
    S("abdominaux", "gainage"),
    S("abdominaux", "gainage"),
  ],
};

/** Séquence de séances (nom + clé de slots) selon le split et les jours. */
function sequenceSeances(split, jours) {
  switch (split) {
    case "full_body": {
      const rot = ["full_body_A", "full_body_B", "full_body_C"];
      return Array.from({ length: jours }, (_, i) => ({ nom: `Corps entier ${String.fromCharCode(65 + (i % 3))}`, slots: rot[i % 3] }));
    }
    case "haut_bas": {
      const seq = [["Haut du corps A", "haut"], ["Bas du corps A", "bas"], ["Haut du corps B", "haut"], ["Bas du corps B", "bas"]];
      return Array.from({ length: jours }, (_, i) => ({ nom: seq[i % 4][0], slots: seq[i % 4][1] }));
    }
    case "push_pull_legs": {
      const seq = [["Poussée", "push"], ["Tirage", "pull"], ["Jambes", "bas"]];
      return Array.from({ length: jours }, (_, i) => ({ nom: seq[i % 3][0] + (i >= 3 ? " B" : ""), slots: seq[i % 3][1] }));
    }
    case "mobilite":
      return Array.from({ length: jours }, (_, i) => ({ nom: `Mobilité & récupération ${i + 1}`, slots: "mobilite" }));
    default:
      return [{ nom: "Séance", slots: "full_body_A" }];
  }
}

/* ------------------------------------------------------------------ */
/* 4-6. Sélection d'exercices par slot avec classement déterministe     */
/* ------------------------------------------------------------------ */
function scoreCandidat(exo, slot, profil) {
  let s = 0;
  // priorité muscle du slot en muscle principal
  if (exo.musclesPrincipaux.includes(slot.muscle)) s += 5;
  else if (exo.musclesSecondaires.includes(slot.muscle)) s += 2;
  else if (exo.musclesPrincipaux.includes("corps_entier")) s += 1;
  // patron demandé
  if (slot.patrons) {
    if (slot.patrons.includes(exo.patron)) s += (slot.role === "principal" ? 4 : 2);
    else if (slot.role === "principal") s -= 6; // presque éliminatoire pour un principal
  }
  // rôle vs type d'exercice
  if (slot.role === "gainage" && exo.typeExercice === "gainage") s += 4;
  if (slot.role === "cardio" && (exo.typeExercice === "cardio" || exo.typeExercice === "mobilite")) s += 4;
  if (slot.role === "isolation" && exo.typeExercice === "hypertrophie") s += 1;
  // préférences utilisateur
  if ((profil.musclesPrioritaires || []).includes(slot.muscle) && exo.musclesPrincipaux.includes(slot.muscle)) s += 3;
  if ((profil.exercicesAimes || []).includes(exo.id)) s += 3;
  // proximité de difficulté avec la cible du niveau
  s -= Math.abs(exo.difficulte - (DIFFICULTE_CIBLE[profil.niveau] ?? 2));
  // adéquation au lieu
  if (exo.tags.includes(profil.lieu)) s += 1;
  return s;
}

/**
 * Choisit le meilleur exercice pour un slot en évitant les doublons
 * biomécaniques (patron déjà utilisé) et les exercices déjà pris.
 */
function choisirPourSlot(slot, pool, profil, dejaPris, patronsUtilises, usedGlobal) {
  const candidats = pool
    .filter((e) => !dejaPris.has(e.id))
    .filter((e) => e.musclesPrincipaux.includes(slot.muscle)
      || e.musclesSecondaires.includes(slot.muscle)
      || e.musclesPrincipaux.includes("corps_entier")
      || (slot.role === "gainage" && e.typeExercice === "gainage")
      || (slot.role === "cardio" && (e.typeExercice === "cardio" || e.typeExercice === "mobilite")))
    // pénalité de variété : un exercice déjà présent ailleurs dans le programme
    // reste possible mais passe après une alternative équivalente non utilisée
    .map((e) => ({ e, score: scoreCandidat(e, slot, profil) - (usedGlobal && usedGlobal.has(e.id) ? 3 : 0) }))
    // tri déterministe : score décroissant puis id croissant
    .sort((a, b) => (b.score - a.score) || (a.e.id < b.e.id ? -1 : 1));

  // 1re passe : éviter les doublons de patron (sauf gainage/cardio, répétables)
  for (const { e } of candidats) {
    const repetable = e.patron === "gainage" || e.patron === "cardio";
    if (repetable || !patronsUtilises.has(e.patron)) return e;
  }
  // 2e passe : accepter un doublon plutôt que de laisser le slot vide
  return candidats.length ? candidats[0].e : null;
}

/* ------------------------------------------------------------------ */
/* 9. Prescription séries/reps/repos/tempo/intensité selon l'objectif   */
/* ------------------------------------------------------------------ */
const PRESCRIPTIONS = {
  force: { reps: [4, 6], repos: 180, rir: 2, sets: { principal: 4, secondaire: 3, isolation: 3 } },
  prise_muscle: { reps: [8, 12], repos: 105, rir: 1, sets: { principal: 4, secondaire: 3, isolation: 3 } },
  hypertrophie: { reps: [8, 12], repos: 105, rir: 1, sets: { principal: 4, secondaire: 3, isolation: 3 } },
  recomposition: { reps: [8, 15], repos: 90, rir: 2, sets: { principal: 3, secondaire: 3, isolation: 2 } },
  perte_graisse: { reps: [10, 15], repos: 60, rir: 2, sets: { principal: 3, secondaire: 3, isolation: 2 } },
  endurance: { reps: [15, 25], repos: 45, rir: 2, sets: { principal: 3, secondaire: 2, isolation: 2 } },
  remise_forme: { reps: [8, 12], repos: 90, rir: 3, sets: { principal: 3, secondaire: 2, isolation: 2 } },
  mobilite: { reps: [1, 1], repos: 45, rir: null, sets: { principal: 2, secondaire: 2, isolation: 2, gainage: 2, cardio: 1 } },
  prepa_physique: { reps: [6, 12], repos: 90, rir: 2, sets: { principal: 4, secondaire: 3, isolation: 2 } },
};

/** Nombre de séries selon rôle, objectif et niveau. */
function nbSeries(role, profil) {
  const p = PRESCRIPTIONS[profil.objectif] || PRESCRIPTIONS.remise_forme;
  let n = p.sets[role] ?? p.sets.isolation ?? 3;
  if (profil.niveau === "grand_debutant") n = Math.max(2, n - 1);
  if (profil.niveau === "avance" && role === "principal") n += 1;
  // récupération basse ou peu de sommeil → on retire un peu de volume
  if (profil.recuperation <= 2 || profil.sommeilH < 6) n = Math.max(2, n - 1);
  return n;
}

/** Construit les séries d'un exercice (avec échauffement pour les principaux). */
function construireSeries(exo, role, profil) {
  const p = PRESCRIPTIONS[profil.objectif] || PRESCRIPTIONS.remise_forme;
  const series = [];
  const enTemps = exo.repsPertinent[0] === 1 && exo.repsPertinent[1] === 1;

  // 1 série d'échauffement pour les gros mouvements chargés
  if (role === "principal" && !enTemps && exo.chargeRelative !== "leger") {
    series.push({ type: "echauffement", repsCible: [Math.max(6, p.reps[1]), Math.max(8, p.reps[1] + 3)], dureeSec: null, distanceM: null, rirCible: 5, rpeCible: null, tempo: exo.tempoDefaut, reposSec: 60, chargeKg: null });
  }
  const n = nbSeries(role, profil);
  for (let i = 0; i < n; i++) {
    if (enTemps) {
      series.push({ type: "travail", repsCible: null, dureeSec: exo.dureeSec || 40, distanceM: null, rirCible: p.rir, rpeCible: null, tempo: exo.tempoDefaut, reposSec: role === "gainage" ? 45 : p.repos, chargeKg: null });
    } else {
      series.push({ type: "travail", repsCible: [exo.repsPertinent[0], Math.min(exo.repsPertinent[1], p.reps[1])], dureeSec: null, distanceM: null, rirCible: p.rir, rpeCible: null, tempo: exo.tempoDefaut, reposSec: p.repos, chargeKg: null });
    }
  }
  return series;
}

/** Durée estimée (minutes) d'un exercice à partir de ses séries. */
function dureeExoMin(series) {
  const sec = series.reduce((acc, s) => acc + (s.dureeSec || 45) + s.reposSec, 0);
  return sec / 60;
}

/* ------------------------------------------------------------------ */
/* Assemblage complet                                                  */
/* ------------------------------------------------------------------ */
/**
 * @param {import("../models.js").Profil} profil
 * @param {{now?: string}} [options]
 * @returns {import("../models.js").Programme}
 */
export function genererProgramme(profil, options = {}) {
  const split = choisirSplit(profil);
  const { autorises: pool } = filtrerExercices(profil);
  const seq = sequenceSeances(split, profil.joursParSemaine);
  const budgetMin = profil.dureeSeanceMin - 8; // 8 min réservées à l'échauffement général
  const usedGlobal = new Set(); // pour la variété d'une séance à l'autre

  const seances = seq.map((def, idx) => {
    const slots = SLOTS[def.slots];
    const dejaPris = new Set();
    const patronsUtilises = new Set();
    const groupes = new Set();
    const exercices = [];
    let tempsCumule = 0;

    for (const slot of slots) {
      const exo = choisirPourSlot(slot, pool, profil, dejaPris, patronsUtilises, usedGlobal);
      if (!exo) continue;
      const series = construireSeries(exo, slot.role, profil);
      const d = dureeExoMin(series);
      // respect de la durée max : on garde toujours au moins 3 exercices
      if (exercices.length >= 3 && tempsCumule + d > budgetMin) break;
      tempsCumule += d;
      dejaPris.add(exo.id);
      patronsUtilises.add(exo.patron);
      usedGlobal.add(exo.id);
      exo.musclesPrincipaux.forEach((m) => groupes.add(m));
      exercices.push({
        exerciceId: exo.id,
        role: slot.role,
        series,
        supersetGroupe: null,
        justification: justifierExo(exo, slot, profil),
      });
    }

    return {
      id: `seance-${idx}`,
      indexJour: idx,
      nom: def.nom,
      groupesCibles: [...groupes],
      exercices,
      dureeEstimeeMin: Math.round(tempsCumule + 8),
    };
  });

  return {
    id: `prog-${options.now || new Date().toISOString()}`,
    nom: `${GOAL_LABELS[profil.objectif]} · ${profil.joursParSemaine} j/sem`,
    split,
    createdAt: options.now || new Date().toISOString(),
    seances,
    justificationGlobale: justifierGlobal(split, profil),
    profilSnapshot: profil,
  };
}

/* ------------------------------------------------------------------ */
/* 10. Justifications courtes et compréhensibles                        */
/* ------------------------------------------------------------------ */
function justifierExo(exo, slot, profil) {
  const roleTxt = { principal: "Mouvement principal", secondaire: "Mouvement secondaire", isolation: "Isolation", gainage: "Gainage", cardio: "Cardio/mobilité" }[slot.role];
  const bits = [`${roleTxt} pour ${MUSCLE_LABELS[slot.muscle] || slot.muscle}`];
  if ((profil.musclesPrioritaires || []).includes(slot.muscle)) bits.push("muscle que tu as mis en priorité");
  if ((profil.exercicesAimes || []).includes(exo.id)) bits.push("exercice que tu apprécies");
  bits.push(`adapté à ton matériel`);
  return bits.join(", ") + ".";
}

const SPLIT_LABELS = {
  full_body: "corps entier", haut_bas: "haut / bas du corps",
  push_pull_legs: "poussée / tirage / jambes", mobilite: "mobilité & récupération",
};
function justifierGlobal(split, profil) {
  const raisons = {
    full_body: `Avec ${profil.joursParSemaine} séance(s)/semaine, un format corps entier stimule chaque groupe musculaire plusieurs fois par semaine — le meilleur rapport résultat/temps pour ton profil.`,
    haut_bas: `À 4 séances, un découpage haut/bas permet plus de volume par groupe tout en laissant 48 h de récupération entre deux séances similaires.`,
    push_pull_legs: `À 5+ séances, le format poussée/tirage/jambes répartit finement le volume et respecte la récupération.`,
    mobilite: `Objectif mobilité : séances douces centrées sur l'amplitude et la récupération, sans charge lourde.`,
  };
  return `Programme ${SPLIT_LABELS[split]} — ${raisons[split]}`;
}
