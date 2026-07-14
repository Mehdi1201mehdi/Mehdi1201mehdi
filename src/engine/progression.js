// @ts-check
/**
 * Moteur de surcharge progressive — DOUBLE PROGRESSION.
 * Indépendant de l'IA conversationnelle. Chaque décision produit une entrée
 * d'audit lisible par l'utilisateur (raison explicite).
 */
import { getExercise } from "../data/exercises.js";

/**
 * @typedef {Object} SerieRealisee
 * @property {number|null} chargeKg
 * @property {number|null} reps
 * @property {number|null} rir
 * @property {number|null} dureeSec
 */
/**
 * @typedef {Object} PerfSeance
 * @property {SerieRealisee[]} series
 * @property {boolean} douleur
 */

/** Incrément de charge conseillé (kg) selon l'équipement et le patron. */
export function incrementCharge(exo) {
  const eq = exo.equipement;
  const auPoidsDuCorps = eq.length === 1 && eq[0] === "poids_du_corps";
  if (auPoidsDuCorps || eq.includes("elastiques")) return { mode: "reps", pas: 0 };
  const basDuCorps = ["squat", "charniere_hanche", "fente"].includes(exo.patron);
  if (eq.includes("barre")) return { mode: "charge", pas: basDuCorps ? 5 : 2.5 };
  if (eq.includes("halteres") || eq.includes("kettlebell")) return { mode: "charge", pas: 2 };
  if (eq.includes("machine_guidee") || eq.includes("machine_leviers") || eq.includes("poulie") || eq.includes("smith")) return { mode: "charge", pas: 2.5 };
  return { mode: "charge", pas: 2.5 };
}

/** Charge de travail de référence (max des séries de travail chargées). */
function chargeReference(series) {
  const charges = series.map((s) => Number(s.chargeKg) || 0);
  return charges.length ? Math.max(...charges) : 0;
}

/**
 * Calcule la recommandation pour la PROCHAINE séance d'un exercice.
 * @param {string} exerciceId
 * @param {[number,number]} plageReps
 * @param {PerfSeance|null} derniere
 * @param {PerfSeance|null} [avantDerniere]
 * @returns {{action:string, chargeKg:number|null, modeReps:boolean, message:string, audit:string}}
 */
export function recommander(exerciceId, plageReps, derniere, avantDerniere = null) {
  const exo = getExercise(exerciceId);
  const nom = exo ? exo.nom : exerciceId;
  const inc = exo ? incrementCharge(exo) : { mode: "charge", pas: 2.5 };
  const modeReps = inc.mode === "reps";

  if (!derniere || !derniere.series || derniere.series.length === 0) {
    return {
      action: "debut", chargeKg: null, modeReps,
      message: "Première fois : choisis une charge (ou une variante) qui te laisse 3 à 4 répétitions en réserve sur la 1ʳᵉ série, puis ajuste.",
      audit: `${nom} : première séance, pas de référence — départ prudent (RIR 3-4).`,
    };
  }

  if (derniere.douleur) {
    return {
      action: "stop_douleur", chargeKg: null, modeReps,
      message: "Douleur signalée : on suspend la progression automatique. Reste sur une charge réduite ou une variante plus douce. Si la douleur persiste, consulte un professionnel de santé.",
      audit: `${nom} : progression suspendue car une douleur a été signalée à la dernière séance.`,
    };
  }

  const travail = derniere.series.filter((s) => (s.reps || 0) > 0 || (s.dureeSec || 0) > 0);
  const [min, max] = plageReps;
  const base = chargeReference(derniere.series);

  const enTemps = travail.every((s) => (s.dureeSec || 0) > 0 && !(s.reps));
  if (enTemps) {
    return {
      action: "progresser_temps", chargeKg: null, modeReps: true,
      message: "Exercice en temps : ajoute quelques secondes ou passe à la variante plus difficile si la dernière fois était propre.",
      audit: `${nom} : progression en durée (secondes) plutôt qu'en charge.`,
    };
  }

  const nbSousPlage = travail.filter((s) => (s.reps || 0) > 0 && (s.reps || 0) < min).length;
  const toutesAuMax = travail.length > 0 && travail.every((s) => (s.reps || 0) >= max && (s.rir == null || s.rir >= 1));
  const rirSuffisant = travail.every((s) => s.rir == null || s.rir >= 2);
  const avantSousPlage = avantDerniere && (avantDerniere.series || []).some((s) => (s.reps || 0) > 0 && (s.reps || 0) < min);

  // Échec sur 2 séances consécutives → réduire / envisager un remplacement
  if (nbSousPlage > 0 && avantSousPlage) {
    const nouvelle = modeReps ? null : Math.round(base * 0.9 * 2) / 2;
    return {
      action: "reduire", chargeKg: nouvelle, modeReps,
      message: "Deux séances difficiles de suite : réduis la charge d'environ 10 % (ou baisse le volume), et vérifie sommeil, récupération et technique. Si ça bloque encore, envisage un remplacement.",
      audit: `${nom} : charge réduite car des séries sont restées sous la plage cible deux séances de suite.`,
    };
  }

  // Une séance limite → maintenir
  if (nbSousPlage > 0) {
    return {
      action: "maintenir", chargeKg: modeReps ? null : base, modeReps,
      message: `Garde la même charge et vise le bas de la plage (${min} reps) proprement sur toutes les séries.`,
      audit: `${nom} : maintenu car ${nbSousPlage} série(s) sous la plage cible.`,
    };
  }

  // Haut de plage atteint partout avec réserve → augmenter
  if (toutesAuMax && rirSuffisant) {
    if (modeReps) {
      return {
        action: "progresser_variante", chargeKg: null, modeReps,
        message: `Haut de plage atteint (${max} reps) avec de la réserve : passe à la variante plus difficile ou ajoute une petite charge/élastique.`,
        audit: `${nom} : progression vers une variante plus dure (exercice au poids du corps au sommet de sa plage).`,
      };
    }
    const nouvelle = Math.round((base + inc.pas) * 2) / 2;
    return {
      action: "augmenter", chargeKg: nouvelle, modeReps,
      message: `Toutes les séries au maximum (${max} reps) avec réserve : ajoute ${inc.pas} kg et redescends vers ${min}-${min + 2} répétitions propres.`,
      audit: `${nom} : +${inc.pas} kg (${base} → ${nouvelle} kg) car toutes les séries ont atteint ${max} reps avec RIR ≥ 2.`,
    };
  }

  // Haut de plage mais réserve insuffisante → maintenir
  if (toutesAuMax) {
    return {
      action: "maintenir", chargeKg: modeReps ? null : base, modeReps,
      message: "Haut de plage atteint mais peu de réserve : garde la charge et consolide avec un RIR ≥ 2 avant d'ajouter du poids.",
      audit: `${nom} : maintenu — haut de plage atteint mais RIR insuffisant pour charger.`,
    };
  }

  // Cas standard : progresser en répétitions à charge constante
  return {
    action: "maintenir", chargeKg: modeReps ? null : base, modeReps,
    message: "Même charge : essaie d'ajouter 1 à 2 répétitions propres par série par rapport à la dernière fois.",
    audit: `${nom} : maintenu, objectif +1-2 répétitions à charge constante.`,
  };
}

/**
 * Suggère une semaine allégée (deload) si la fatigue s'accumule.
 * @param {{echecs:number, recuperation:number, semainesConsecutives:number}} etat
 */
export function suggererDeload(etat) {
  const besoin = etat.semainesConsecutives >= 6 || (etat.echecs >= 3 && etat.recuperation <= 2);
  return {
    deload: besoin,
    message: besoin
      ? "Fatigue accumulée : prévois une semaine allégée (−1 série par exercice et charges −10 %, aucune série difficile)."
      : "Pas de deload nécessaire pour l'instant.",
  };
}
