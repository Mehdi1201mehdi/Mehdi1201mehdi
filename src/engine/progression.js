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
 * @property {boolean} [douleur]
 * @property {boolean} [techniqueDegradee]  signalée pendant la séance
 * @property {string} [date]
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

/** RIR d'une série : saisi en RIR, ou déduit d'un RPE (RIR = 10 − RPE). */
export function rirDe(s) {
  if (s && s.rir != null && s.rir !== "" && Number.isFinite(Number(s.rir))) return Number(s.rir);
  if (s && s.rpe != null && s.rpe !== "" && Number.isFinite(Number(s.rpe))) return Math.max(0, 10 - Number(s.rpe));
  return null;
}

/** Hausse relative au-delà de laquelle on progresse d'abord en répétitions. */
export const HAUSSE_MAX = 0.10;

/**
 * Arrondit une charge à ce que le matériel permet réellement de charger.
 * @param {number} kg
 * @param {any} exo
 */
export function arrondirCharge(kg, exo) {
  const eq = (exo && exo.equipement) || [];
  const pas = eq.includes("barre") || eq.includes("smith") || eq.includes("machine_guidee") || eq.includes("machine_leviers") || eq.includes("poulie") ? 2.5
    : eq.includes("halteres") || eq.includes("kettlebell") ? 2 : 0.5;
  return Math.max(0, Math.round(kg / pas) * pas);
}

/** e1RM simple (Epley) d'une série ; reps seules au poids du corps. */
function perfSerie(s) {
  const reps = Number(s.reps) || 0, kg = Number(s.chargeKg) || 0;
  if (!reps) return 0;
  return kg > 0 ? kg * (1 + Math.min(reps, 12) / 30) : reps;
}
function meilleurePerf(perf) {
  return Math.max(0, ...((perf && perf.series) || []).map(perfSerie));
}

/**
 * STAGNATION : aucune amélioration de la meilleure performance (e1RM, ou
 * répétitions au poids du corps) sur les `n` dernières séances de l'exercice.
 * Avant de changer quoi que ce soit, on cherche la cause : intensité, volume,
 * récupération, technique — dans cet ordre, comme le ferait un coach.
 *
 * @param {any[]} historique séances de l'exercice, la plus récente d'abord
 *   (chaque élément : { series, douleur, techniqueDegradee, date })
 * @param {number} [n] nombre de séances sans progrès pour parler de stagnation
 * @returns {null | {seances:number, causes:string[], conseil:string}}
 */
export function detecterStagnation(historique, n = 3) {
  const h = (historique || []).filter((x) => x && (x.series || []).length);
  if (h.length < n + 1) return null;
  const recentes = h.slice(0, n), reference = h.slice(n);
  const meilleurAvant = Math.max(...reference.map(meilleurePerf));
  const meilleurRecent = Math.max(...recentes.map(meilleurePerf));
  // Progrès de moins de 1 % : stagnation (bruit de mesure exclu).
  if (!(meilleurAvant > 0) || meilleurRecent > meilleurAvant * 1.01) return null;

  const causes = [];
  const series = recentes.flatMap((x) => x.series);
  const rirs = series.map(rirDe).filter((r) => r != null);
  const rirMoyen = rirs.length ? rirs.reduce((a, b) => a + b, 0) / rirs.length : null;
  if (rirMoyen != null && rirMoyen >= 3) causes.push(`Intensité : tu gardes en moyenne ${Math.round(rirMoyen)} répétitions en réserve — rapproche-toi de 1 à 2.`);
  if (rirMoyen != null && rirMoyen <= 0.5) causes.push("Intensité : presque toutes les séries vont à l'échec — la fatigue masque les progrès, garde 1 à 2 répétitions en réserve.");
  const nbSeries = recentes.reduce((a, x) => a + x.series.length, 0) / recentes.length;
  if (nbSeries <= 2) causes.push(`Volume : ${Math.round(nbSeries)} série(s) par séance, c'est peu — passe à 3.`);
  if (nbSeries >= 6) causes.push(`Volume : ${Math.round(nbSeries)} séries par séance — la récupération peut ne pas suivre.`);
  const dates = recentes.map((x) => Date.parse(x.date)).filter(Number.isFinite);
  if (dates.length >= 2) {
    const ecartJ = (Math.max(...dates) - Math.min(...dates)) / 864e5 / (dates.length - 1);
    if (ecartJ < 2.5) causes.push(`Récupération : ${ecartJ.toFixed(1).replace(".", ",")} jour(s) en moyenne entre deux séances de cet exercice — laisse au moins 72 h.`);
  }
  if (recentes.some((x) => x.techniqueDegradee)) causes.push("Technique : signalée dégradée récemment — consolide à charge égale avant d'ajouter du poids.");
  const conseil = causes.length
    ? "Corrige d'abord ce point. Si rien ne bouge après deux séances, change de stimulus : une variante du mouvement ou une autre plage de répétitions pendant un cycle."
    : "Volume, effort et récupération semblent corrects : change de stimulus — une variante du mouvement ou une autre plage de répétitions (par ex. 6-8 au lieu de 8-12) pendant un cycle. Vérifie aussi sommeil et alimentation.";
  return { seances: n, causes, conseil };
}

/**
 * Calcule la recommandation pour la PROCHAINE séance d'un exercice.
 *
 * Double progression : on ajoute des répétitions à charge constante jusqu'au
 * haut de la plage sur TOUTES les séries, avec une technique propre et de la
 * réserve ; alors seulement on ajoute le plus petit cran de charge et on
 * redescend au bas de la plage. Exemple : 3 × 10 à 50 kg avec 2 répétitions
 * en réserve → viser 11 · 11 · 11 à 50 kg.
 *
 * Garde-fous : aucune hausse si une douleur ou une technique dégradée a été
 * signalée, aucune hausse de plus de 10 % (on prolonge alors la plage de deux
 * répétitions avant d'ajouter du poids), réduction après deux séances ratées.
 *
 * @param {string} exerciceId
 * @param {[number,number]} plageReps
 * @param {PerfSeance|null} derniere
 * @param {PerfSeance|null} [avantDerniere]
 * @param {any[]} [historique] séances plus anciennes (la plus récente d'abord,
 *   `derniere` incluse) pour détecter une stagnation
 * @returns {{action:string, chargeKg:number|null, modeReps:boolean, objectifReps:number[]|null, message:string, audit:string, stagnation?:any}}
 */
export function recommander(exerciceId, plageReps, derniere, avantDerniere = null, historique = null) {
  const exo = getExercise(exerciceId);
  const nom = exo ? exo.nom : exerciceId;
  const inc = exo ? incrementCharge(exo) : { mode: "charge", pas: 2.5 };
  const modeReps = inc.mode === "reps";

  if (!derniere || !derniere.series || derniere.series.length === 0) {
    return {
      action: "debut", chargeKg: null, modeReps, objectifReps: null,
      message: "Première fois : choisis une charge (ou une variante) qui te laisse 3 à 4 répétitions en réserve sur la 1ʳᵉ série, puis ajuste.",
      audit: `${nom} : première séance, pas de référence — départ prudent (RIR 3-4).`,
    };
  }

  if (derniere.douleur) {
    return {
      action: "stop_douleur", chargeKg: null, modeReps, objectifReps: null,
      message: "Douleur signalée : on suspend la progression automatique. Reste sur une charge réduite ou une variante plus douce. Si la douleur persiste, consulte un professionnel de santé.",
      audit: `${nom} : progression suspendue car une douleur a été signalée à la dernière séance.`,
    };
  }

  const travail = derniere.series.filter((s) => (s.reps || 0) > 0 || (s.dureeSec || 0) > 0);
  const [min, max] = plageReps;
  const base = chargeReference(derniere.series);
  const repsDe = travail.map((s) => Number(s.reps) || 0);
  const liste = (arr) => arr.join(" · ");

  const enTemps = travail.every((s) => (s.dureeSec || 0) > 0 && !(s.reps));
  if (enTemps) {
    return {
      action: "progresser_temps", chargeKg: null, modeReps: true, objectifReps: null,
      message: "Exercice en temps : ajoute quelques secondes ou passe à la variante plus difficile si la dernière fois était propre.",
      audit: `${nom} : progression en durée (secondes) plutôt qu'en charge.`,
    };
  }

  // Technique dégradée : on ne charge pas, on consolide les mêmes répétitions.
  if (derniere.techniqueDegradee) {
    return {
      action: "maintenir", chargeKg: modeReps ? null : base, modeReps, objectifReps: repsDe,
      message: `Technique signalée dégradée la dernière fois : même charge, mêmes répétitions (${liste(repsDe)}), exécution propre et contrôlée. On ajoutera du poids quand le mouvement sera net.`,
      audit: `${nom} : aucune hausse — technique dégradée signalée à la dernière séance.`,
    };
  }

  // Hausse plafonnée : sur une charge légère, le plus petit cran (2 kg sur 8 kg
  // d'haltères = +25 %) serait trop brutal. On prolonge la plage de 2 reps.
  const crantTropGros = !modeReps && base > 0 && inc.pas / base > HAUSSE_MAX;
  const maxEff = crantTropGros ? max + 2 : max;

  const rir = travail.map(rirDe);
  const nbSousPlage = travail.filter((s) => (s.reps || 0) > 0 && (s.reps || 0) < min).length;
  const toutesAuMax = travail.length > 0 && travail.every((s, k) => (s.reps || 0) >= maxEff && (rir[k] == null || rir[k] >= 1));
  const rirSuffisant = rir.every((r) => r == null || r >= 2);
  const avantSousPlage = avantDerniere && (avantDerniere.series || []).some((s) => (s.reps || 0) > 0 && (s.reps || 0) < min);
  const stagnation = historique ? detecterStagnation(historique) : null;
  const avecStagnation = (r) => (stagnation && r.action === "maintenir" ? {
    ...r, stagnation,
    message: `${r.message} — ${stagnation.seances} séances sans progrès : ${stagnation.causes[0] || stagnation.conseil}`,
    audit: `${r.audit} Stagnation détectée sur ${stagnation.seances} séances.`,
  } : r);

  // Échec sur 2 séances consécutives → réduire / envisager un remplacement
  if (nbSousPlage > 0 && avantSousPlage) {
    const nouvelle = modeReps ? null : arrondirCharge(base * 0.9, exo);
    return {
      action: "reduire", chargeKg: nouvelle, modeReps, objectifReps: travail.map(() => min),
      message: "Deux séances difficiles de suite : réduis la charge d'environ 10 % (ou baisse le volume), et vérifie sommeil, récupération et technique. Si ça bloque encore, envisage un remplacement.",
      audit: `${nom} : charge réduite car des séries sont restées sous la plage cible deux séances de suite.`,
    };
  }

  // Une séance limite → maintenir
  if (nbSousPlage > 0) {
    return avecStagnation({
      action: "maintenir", chargeKg: modeReps ? null : base, modeReps, objectifReps: travail.map(() => min),
      message: `Garde la même charge et vise le bas de la plage (${min} reps) proprement sur toutes les séries.`,
      audit: `${nom} : maintenu car ${nbSousPlage} série(s) sous la plage cible.`,
    });
  }

  // Haut de plage atteint partout avec réserve → augmenter
  if (toutesAuMax && rirSuffisant) {
    if (modeReps) {
      return {
        action: "progresser_variante", chargeKg: null, modeReps, objectifReps: null,
        message: `Haut de plage atteint (${max} reps) avec de la réserve : passe à la variante plus difficile ou ajoute une petite charge/élastique.`,
        audit: `${nom} : progression vers une variante plus dure (exercice au poids du corps au sommet de sa plage).`,
      };
    }
    const nouvelle = Math.round((base + inc.pas) * 2) / 2;
    return {
      action: "augmenter", chargeKg: nouvelle, modeReps, objectifReps: travail.map(() => min),
      message: `Toutes les séries au maximum (${maxEff} reps) avec réserve : ajoute ${inc.pas} kg et redescends vers ${min}-${min + 2} répétitions propres.`,
      audit: `${nom} : +${inc.pas} kg (${base} → ${nouvelle} kg) car toutes les séries ont atteint ${maxEff} reps avec RIR ≥ 2.`,
    };
  }

  // Haut de plage mais réserve insuffisante → maintenir
  if (toutesAuMax) {
    return {
      action: "maintenir", chargeKg: modeReps ? null : base, modeReps, objectifReps: travail.map(() => maxEff),
      message: "Haut de plage atteint mais peu de réserve : garde la charge et consolide avec un RIR ≥ 2 avant d'ajouter du poids.",
      audit: `${nom} : maintenu — haut de plage atteint mais RIR insuffisant pour charger.`,
    };
  }

  // Cas standard : +1 répétition par série (pas après une série à l'échec),
  // plafonnée au haut de la plage.
  const objectifReps = travail.map((s, k) => Math.min(maxEff, (Number(s.reps) || min) + (rir[k] === 0 ? 0 : 1)));
  const charge = modeReps ? "" : ` (${String(base).replace(".", ",")} kg)`;
  const plafond = crantTropGros
    ? ` Le prochain cran (+${inc.pas} kg) ferait plus de ${Math.round(HAUSSE_MAX * 100)} % : on monte d'abord jusqu'à ${maxEff} répétitions.`
    : "";
  return avecStagnation({
    action: "maintenir", chargeKg: modeReps ? null : base, modeReps, objectifReps,
    message: `Même charge${charge} : vise ${liste(objectifReps)} répétitions (+1 par série quand il restait de la réserve).${plafond}`,
    audit: `${nom} : maintenu, objectif ${liste(objectifReps)} répétitions à charge constante.${crantTropGros ? " Hausse plafonnée à 10 %." : ""}`,
  });
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
