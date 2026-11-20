// @ts-check
/**
 * CYCLES D'ENTRAÎNEMENT (mésocycles de 4 à 12 semaines).
 *
 * Un cycle découpe le programme en semaines aux rôles différents :
 *   adaptation     → charges prudentes, on trouve ses charges de travail ;
 *   progression    → surcharge progressive (moteur de double progression) ;
 *   intensification→ plus près de l'échec sur les mouvements principaux ;
 *   récupération   → semaine allégée (deload) : la fatigue retombe.
 *
 * À la fin du cycle, `bilanCycle` mesure ce qui s'est réellement passé
 * (assiduité, progression par exercice, stagnations, volume réalisé) et
 * `programmeSuivant` génère le programme du cycle suivant à partir de ces
 * données. Rien n'est appliqué sans validation de l'utilisateur : ce module
 * PROPOSE, l'interface demande.
 *
 * Module pur, déterministe, sans DOM.
 */
import { MUSCLE_LABELS } from "../models.js";
import { MUSCLES_SUIVIS, fourchetteVolume } from "./volume.js";
import { rirDe } from "./progression.js";

/** Rôle de chaque type de semaine et ce qu'il change à la séance. */
export const PHASES = {
  adaptation: {
    nom: "Adaptation",
    rirDelta: 1, seriesDelta: 0, chargeFacteur: 1,
    resume: "Charges prudentes, technique d'abord",
    detail: "Garde une répétition de réserve de plus que d'habitude : cette semaine sert à trouver tes charges de travail et à installer la technique.",
  },
  progression: {
    nom: "Progression",
    rirDelta: 0, seriesDelta: 0, chargeFacteur: 1,
    resume: "+1 répétition ou +1 cran de charge",
    detail: "Surcharge progressive : l'app te propose une répétition de plus par série, puis un cran de charge quand le haut de la plage est atteint partout.",
  },
  intensification: {
    nom: "Intensification",
    rirDelta: -1, seriesDelta: 0, chargeFacteur: 1,
    resume: "Plus près de l'échec, volume stable",
    detail: "Une répétition de réserve de moins sur les mouvements principaux (jamais l'échec complet sur les gros mouvements). Le volume ne bouge pas.",
  },
  recuperation: {
    nom: "Récupération",
    rirDelta: 2, seriesDelta: -1, chargeFacteur: 0.9,
    resume: "Une série de moins, charges −10 %",
    detail: "Semaine allégée (deload) : une série de moins par exercice, charges réduites d'environ 10 %, aucune série difficile. La fatigue retombe et les progrès s'expriment au cycle suivant.",
  },
};

const NOVICE = new Set(["grand_debutant", "debutant"]);
const JOUR = 864e5;

/** Durée conseillée selon le niveau : plus on progresse vite, plus le cycle est long. */
export function dureeCycleConseillee(profil) {
  const n = profil && profil.niveau;
  if (NOVICE.has(n)) return 8;
  if (n === "avance") return 5;
  return 6;
}

/**
 * Découpe d'un cycle en phases.
 * - dernière semaine : récupération ;
 * - débutant : 2 semaines d'adaptation, intermédiaire/avancé : 1 ;
 * - au-delà de 7 semaines (hors débutant) : un deload intermédiaire, pour ne
 *   jamais enchaîner plus de 5 semaines de charge ;
 * - hors débutant : la semaine qui précède chaque deload est une
 *   intensification.
 * @param {number} semaines 4 à 12
 * @param {string} [niveau]
 * @returns {(keyof typeof PHASES)[]}
 */
export function phasesCycle(semaines, niveau = "intermediaire") {
  const n = Math.max(4, Math.min(12, Math.round(Number(semaines) || 6)));
  const novice = NOVICE.has(niveau);
  /** @type {(keyof typeof PHASES|null)[]} */
  const p = Array(n).fill(null);
  p[n - 1] = "recuperation";
  if (!novice && n >= 8) p[Math.floor((n - 1) / 2)] = "recuperation";
  p[0] = "adaptation";
  if (novice && n >= 6) p[1] = "adaptation";
  for (let i = 0; i < n; i++) {
    if (p[i]) continue;
    p[i] = !novice && p[i + 1] === "recuperation" ? "intensification" : "progression";
  }
  return /** @type {(keyof typeof PHASES)[]} */ (p);
}

/** Lundi (00:00, heure locale) de la semaine d'une date. */
export function lundiDe(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

/**
 * Crée un cycle pour un programme.
 * @param {{id:string, seances:any[]}} programme
 * @param {any} profil
 * @param {{debut?: string|Date, semaines?: number}} [opts]
 */
export function creerCycle(programme, profil, opts = {}) {
  const semaines = Math.max(4, Math.min(12, Math.round(Number(opts.semaines) || dureeCycleConseillee(profil))));
  const debut = lundiDe(opts.debut || new Date());
  return {
    id: `cycle-${debut.toISOString().slice(0, 10)}-${programme.id}`,
    programmeId: programme.id,
    debut: debut.toISOString(),
    semaines,
    phases: phasesCycle(semaines, profil && profil.niveau),
    seancesParSemaine: (programme.seances || []).length || Number(profil && profil.joursParSemaine) || 3,
    deloadAvance: null,
  };
}

/**
 * Où en est le cycle aujourd'hui.
 * @param {any} cycle
 * @param {any[]} logs
 * @param {Date|number|string} [maintenant]
 */
export function etatCycle(cycle, logs, maintenant = Date.now()) {
  const t = new Date(maintenant).getTime();
  const debut = Date.parse(cycle.debut);
  const index = Math.floor((lundiDe(t).getTime() - debut) / (7 * JOUR) + 0.01);
  const fin = debut + cycle.semaines * 7 * JOUR;
  const termine = index >= cycle.semaines;
  let phase = termine ? "recuperation" : cycle.phases[Math.max(0, index)];
  // Deload avancé à la demande de l'utilisateur : la semaine choisie devient
  // une semaine de récupération.
  if (!termine && cycle.deloadAvance && index === cycle.deloadAvance.semaine) phase = "recuperation";
  const duCycle = (logs || []).filter((l) => { const d = Date.parse(l.date); return d >= debut && d < fin; });
  const debutSemaine = lundiDe(t).getTime();
  const cetteSemaine = duCycle.filter((l) => Date.parse(l.date) >= debutSemaine).length;
  const semainesEcoulees = Math.max(0, Math.min(cycle.semaines, index));
  return {
    semaine: Math.min(cycle.semaines, Math.max(1, index + 1)),
    total: cycle.semaines,
    phase,
    infos: PHASES[phase],
    termine,
    avant: index < 0,
    seancesFaites: duCycle.length,
    seancesPrevuesAjd: semainesEcoulees * cycle.seancesParSemaine + Math.min(cetteSemaine, cycle.seancesParSemaine),
    cetteSemaine,
    finIso: new Date(fin).toISOString(),
  };
}

/** e1RM (Epley, reps plafonnées à 12) ou répétitions au poids du corps. */
function perfSerie(s) {
  const reps = Number(s.reps) || 0, kg = Number(s.chargeKg) || 0;
  if (!reps || s.type === "echauffement") return 0;
  return kg > 0 ? kg * (1 + Math.min(reps, 12) / 30) : reps;
}

/**
 * Faut-il une semaine allégée maintenant ? On croise plusieurs signaux réels ;
 * un seul ne suffit pas (une mauvaise séance arrive à tout le monde).
 *
 * @param {any[]} logs
 * @param {{maintenant?: number, ressenti?: number, dernierDeload?: string|null}} [opts]
 * @returns {{deload:boolean, raisons:string[], score:number}}
 */
export function besoinDeload(logs, opts = {}) {
  const t = opts.maintenant ?? Date.now();
  const raisons = [];
  let score = 0;
  const tries = [...(logs || [])].filter((l) => Number.isFinite(Date.parse(l.date))).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));

  // 1. Semaines consécutives d'entraînement sans semaine allégée.
  let consecutives = 0;
  const depuisDeload = opts.dernierDeload ? Date.parse(opts.dernierDeload) : 0;
  for (let k = 0; k < 16; k++) {
    const debut = lundiDe(t).getTime() - k * 7 * JOUR, fin = debut + 7 * JOUR;
    if (debut < depuisDeload) break;
    if (tries.some((l) => { const d = Date.parse(l.date); return d >= debut && d < fin; })) consecutives++;
    else if (k > 0) break;
  }
  if (consecutives >= 7) { score += 2; raisons.push(`${consecutives} semaines d'entraînement d'affilée sans semaine allégée.`); }
  else if (consecutives >= 5) { score += 1; raisons.push(`${consecutives} semaines d'affilée sans semaine allégée.`); }

  // 2. Séries à l'échec sur les 14 derniers jours.
  const recents = tries.filter((l) => Date.parse(l.date) >= t - 14 * JOUR);
  const series = recents.flatMap((l) => (l.exercices || []).flatMap((e) => (e.series || []).filter((s) => s.type !== "echauffement")));
  const rirs = series.map(rirDe).filter((r) => r != null);
  if (rirs.length >= 10) {
    const echecs = rirs.filter((r) => r <= 0).length / rirs.length;
    if (echecs >= 0.4) { score += 1; raisons.push(`${Math.round(echecs * 100)} % des séries à l'échec ces deux dernières semaines.`); }
  }

  // 3. Baisse de performance : meilleure perf des 7 derniers jours sous celle
  //    des 3 semaines précédentes, sur au moins 2 exercices.
  const semaine = tries.filter((l) => Date.parse(l.date) >= t - 7 * JOUR);
  const avant = tries.filter((l) => { const d = Date.parse(l.date); return d >= t - 28 * JOUR && d < t - 7 * JOUR; });
  const meilleur = (ls) => {
    /** @type {Record<string, number>} */
    const m = {};
    for (const l of ls) for (const e of l.exercices || []) for (const s of e.series || []) {
      const v = perfSerie(s); if (v > (m[e.exerciceId] || 0)) m[e.exerciceId] = v;
    }
    return m;
  };
  const mS = meilleur(semaine), mA = meilleur(avant);
  const baisses = Object.keys(mS).filter((id) => mA[id] && mS[id] < mA[id] * 0.95);
  if (baisses.length >= 2) { score += 2; raisons.push(`Performances en baisse de plus de 5 % sur ${baisses.length} exercices.`); }

  // 4. Douleurs signalées.
  const douleurs = recents.reduce((a, l) => a + (l.exercices || []).filter((e) => e.douleur).length, 0);
  if (douleurs >= 2) { score += 1; raisons.push(`${douleurs} douleurs signalées en deux semaines.`); }

  // 5. Ressenti de fin de séance.
  if (opts.ressenti != null && opts.ressenti >= 1) { score += 1; raisons.push("Tu t'es déclaré très fatigué à la fin de ta dernière séance."); }

  return { deload: score >= 3, raisons, score };
}

/**
 * BILAN DE FIN DE CYCLE — uniquement à partir des séances réellement faites.
 *
 * @param {any} cycle
 * @param {any[]} logs
 * @param {(id:string)=>any} getExercise
 * @param {{seances:any[]}} programme
 * @param {any} profil
 */
export function bilanCycle(cycle, logs, getExercise, programme, profil) {
  const debut = Date.parse(cycle.debut);
  const fin = debut + cycle.semaines * 7 * JOUR;
  const milieu = debut + (fin - debut) / 2;
  const duCycle = (logs || []).filter((l) => { const d = Date.parse(l.date); return d >= debut && d < fin; })
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const prevues = cycle.semaines * cycle.seancesParSemaine;
  const assiduite = prevues ? duCycle.length / prevues : 0;

  // Progression par exercice du programme : meilleure perf de la 1re moitié
  // contre la 2de. Il faut au moins une séance dans chaque moitié.
  const ids = [...new Set((programme.seances || []).flatMap((s) => (s.exercices || []).map((e) => e.exerciceId)))];
  const exercices = ids.map((id) => {
    let a = 0, b = 0, nb = 0;
    for (const l of duCycle) {
      const e = (l.exercices || []).find((x) => x.exerciceId === id);
      if (!e) continue;
      nb++;
      const v = Math.max(0, ...(e.series || []).map(perfSerie));
      if (Date.parse(l.date) < milieu) a = Math.max(a, v); else b = Math.max(b, v);
    }
    const exo = getExercise(id);
    if (!a || !b) return { id, nom: exo ? exo.nom : id, seances: nb, statut: "insuffisant", variation: null };
    const variation = (b - a) / a;
    const statut = variation >= 0.02 ? "progres" : variation <= -0.02 ? "regression" : "stagne";
    return { id, nom: exo ? exo.nom : id, seances: nb, statut, variation };
  });
  const mesures = exercices.filter((e) => e.statut !== "insuffisant");
  const compte = (st) => mesures.filter((e) => e.statut === st).length;

  // Volume hebdomadaire RÉALISÉ par muscle (séries de travail ; ½ en secondaire).
  /** @type {Record<string, number>} */
  const vol = {};
  for (const l of duCycle) for (const e of l.exercices || []) {
    const exo = getExercise(e.exerciceId);
    if (!exo) continue;
    const n = (e.series || []).filter((s) => s.type !== "echauffement").length;
    for (const m of exo.musclesPrincipaux || []) vol[m] = (vol[m] || 0) + n;
    for (const m of exo.musclesSecondaires || []) vol[m] = (vol[m] || 0) + n * 0.5;
  }
  const niveau = profil.niveau || "intermediaire";
  const volume = MUSCLES_SUIVIS.map((m) => {
    const parSemaine = Math.round(((vol[m] || 0) / cycle.semaines) * 2) / 2;
    const [min, max] = fourchetteVolume(m, niveau);
    return { muscle: m, parSemaine, min, max, statut: parSemaine < min ? "bas" : parSemaine > max ? "haut" : "ok" };
  });
  const enRetard = volume.filter((v) => v.statut === "bas").map((v) => v.muscle);

  // Décisions pour le cycle suivant — chacune avec sa raison.
  const decisions = [];
  let tendanceVolume = "maintenir";
  if (assiduite < 0.6) {
    decisions.push(`Assiduité de ${Math.round(assiduite * 100)} % (${duCycle.length} séances sur ${prevues}) : on garde la même structure et le même volume. Si le rythme ne tient pas, passe à ${Math.max(2, cycle.seancesParSemaine - 1)} séances par semaine.`);
  } else if (mesures.length && compte("regression") >= Math.max(2, mesures.length / 3)) {
    tendanceVolume = "reduire";
    decisions.push(`${compte("regression")} exercices en baisse : la récupération n'a pas suivi. Volume légèrement réduit au prochain cycle.`);
  } else if (mesures.length && compte("progres") >= mesures.length / 2 && assiduite >= 0.8) {
    tendanceVolume = enRetard.length ? "augmenter" : "maintenir";
    decisions.push(`${compte("progres")} exercices sur ${mesures.length} en progrès : la structure fonctionne, on la garde.`);
  }
  const stagnes = exercices.filter((e) => e.statut === "stagne" || e.statut === "regression").map((e) => e.id);
  if (stagnes.length) decisions.push(`Changement de stimulus pour ${stagnes.length} exercice${stagnes.length > 1 ? "s" : ""} sans progrès : une variante équivalente les remplace.`);
  if (tendanceVolume === "augmenter") decisions.push(`Volume renforcé pour ${enRetard.map((m) => MUSCLE_LABELS[m] || m).join(", ")} (sous ton repère hebdomadaire).`);
  if (!decisions.length) decisions.push("Pas assez de séances mesurées pour conclure : on reconduit le programme, une variante remplace les exercices sans progrès.");

  return {
    cycleId: cycle.id, debut: cycle.debut, fin: new Date(fin).toISOString(), semaines: cycle.semaines,
    seances: duCycle.length, prevues, assiduite,
    exercices, progres: compte("progres"), stagnes: compte("stagne"), regressions: compte("regression"),
    volume, enRetard, tendanceVolume, aRemplacer: stagnes, decisions,
  };
}

/**
 * Programme du cycle suivant, généré à partir du bilan.
 * Le profil de l'utilisateur n'est PAS modifié : on dérive une copie de travail.
 *
 * @param {ReturnType<typeof bilanCycle>} bilan
 * @param {any} profil
 * @param {{seances:any[]}} programmeActuel
 * @param {(profil:any, options:any)=>any} genererProgramme
 * @param {string} [now]
 */
export function programmeSuivant(bilan, profil, programmeActuel, genererProgramme, now) {
  const travail = { ...profil };
  if (bilan.tendanceVolume === "reduire") travail.recuperation = Math.min(Number(profil.recuperation) || 3, 2);
  if (bilan.tendanceVolume === "augmenter") {
    travail.musclesPrioritaires = [...new Set([...(profil.musclesPrioritaires || []), ...bilan.enRetard])];
  }
  const programme = genererProgramme(travail, { now, exclure: bilan.aRemplacer });
  // Différences lisibles, séance par séance.
  const avant = new Set((programmeActuel.seances || []).flatMap((s) => (s.exercices || []).map((e) => e.exerciceId)));
  const apres = new Set((programme.seances || []).flatMap((s) => (s.exercices || []).map((e) => e.exerciceId)));
  return {
    programme,
    retires: [...avant].filter((id) => !apres.has(id)),
    ajoutes: [...apres].filter((id) => !avant.has(id)),
  };
}
