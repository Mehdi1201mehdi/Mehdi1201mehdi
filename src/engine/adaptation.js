// @ts-check
/**
 * ADAPTATION DE LA SEMAINE ET DE LA SÉANCE.
 *
 *  - prochaineSeance : la rotation du programme reprend là où on s'est arrêté.
 *    Une séance manquée n'est ni sautée ni doublée : la suite glisse d'un cran
 *    et la semaine se termine avec les séances qui tiennent dans les jours
 *    restants.
 *  - adapterSeance : version courte (temps limité) qui garde les exercices
 *    prioritaires, version allégée (fatigue), et application de la phase du
 *    cycle (réserve visée, semaine de récupération).
 *
 * Module pur : il renvoie de NOUVEAUX objets, jamais il ne modifie le
 * programme de l'utilisateur.
 */
import { PHASES, lundiDe } from "./cycle.js";

const JOUR = 864e5;

/**
 * Prochaine séance du programme et état de la semaine.
 * @param {{id:string, createdAt?:string, seances:any[]}} programme
 * @param {any[]} logs
 * @param {{maintenant?: number|Date, joursPlanifies?: number[]}} [opts]
 *   joursPlanifies : jours ISO (1 = lundi) prévus pour s'entraîner
 */
export function prochaineSeance(programme, logs, opts = {}) {
  const seances = (programme && programme.seances) || [];
  if (!seances.length) return null;
  const t = new Date(opts.maintenant ?? Date.now()).getTime();
  const ids = new Set(seances.map((s) => s.id));
  const depuis = programme.createdAt ? Date.parse(programme.createdAt) : 0;
  const duProgramme = (logs || [])
    .filter((l) => ids.has(l.seanceId) && Date.parse(l.date) >= (Number.isFinite(depuis) ? depuis : 0) - 60000)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const dernier = duProgramme[duProgramme.length - 1] || null;
  const idxDernier = dernier ? seances.findIndex((s) => s.id === dernier.seanceId) : -1;
  const index = (idxDernier + 1) % seances.length;

  const lundi = lundiDe(t).getTime();
  const faitesSemaine = duProgramme.filter((l) => Date.parse(l.date) >= lundi);
  const isoAuj = ((new Date(t).getDay() + 6) % 7) + 1;
  const dejaAujourdhui = faitesSemaine.some((l) => Date.parse(l.date) >= new Date(t).setHours(0, 0, 0, 0));
  const planifies = opts.joursPlanifies || [];
  // Jours d'entraînement encore disponibles cette semaine (aujourd'hui compris
  // si rien n'a été fait), et ceux qui auraient déjà dû être faits.
  const joursRestants = Math.max(0, 7 - isoAuj + (dejaAujourdhui ? 0 : 1));
  const prevusPasses = planifies.filter((j) => j < isoAuj || (j === isoAuj && dejaAujourdhui)).length;
  const prevusAujourdhui = planifies.includes(isoAuj);
  const manquees = Math.max(0, prevusPasses - faitesSemaine.length);
  const resteAFaire = Math.max(0, seances.length - faitesSemaine.length);
  // Jamais deux séances le même jour : au plus une par jour restant.
  const realisables = Math.min(resteAFaire, joursRestants);
  const seance = seances[index];

  let message = null;
  if (manquees > 0) {
    message = resteAFaire > joursRestants
      ? `${manquees} séance${manquees > 1 ? "s" : ""} manquée${manquees > 1 ? "s" : ""} cette semaine : on reprend avec « ${seance.nom} ». Il reste ${joursRestants} jour${joursRestants > 1 ? "s" : ""} pour ${resteAFaire} séances — on en fait ${realisables}, une par jour au plus, et la rotation continue la semaine prochaine. Aucune séance doublée.`
      : `${manquees} séance${manquees > 1 ? "s" : ""} manquée${manquees > 1 ? "s" : ""} : on reprend avec « ${seance.nom} », rien n'est sauté. Les ${resteAFaire} séances restantes tiennent dans la semaine, une par jour au plus.`;
  }
  return {
    seance, index, dernier, manquees, faitesSemaine: faitesSemaine.length, resteAFaire, joursRestants,
    dejaAujourdhui, prevuAujourdhui: prevusAujourdhui, semaineFaite: resteAFaire === 0, message,
  };
}

/** Durée estimée (min) d'une liste de séries : effort ~45 s + repos. */
export function dureeSeries(series) {
  return (series || []).reduce((a, s) => a + (Number(s.dureeSec) || 45) + (Number(s.reposSec) || 60), 0) / 60;
}

/** Durée estimée (min) d'une séance, échauffement général de 8 min compris. */
export function dureeSeance(seance) {
  return Math.round(8 + (seance.exercices || []).reduce((a, e) => a + dureeSeries(e.series), 0));
}

const ROLE_RANG = { principal: 0, secondaire: 1, isolation: 2, gainage: 3, cardio: 4 };

function travail(series) { return (series || []).filter((s) => s.type !== "echauffement"); }
function approches(series) { return (series || []).filter((s) => s.type === "echauffement"); }

/** Retire une série de travail (au moins `min` gardées). */
function moinsUneSerie(series, min = 2) {
  const t = travail(series);
  if (t.length <= min) return series;
  const garde = t.slice(0, t.length - 1);
  return [...approches(series), ...garde];
}

/**
 * Adapte une séance.
 * @param {any} seance
 * @param {{mode?: "normale"|"courte"|"allegee", minutes?: number, phase?: string|null,
 *   musclesPrioritaires?: string[], getExercise?: (id:string)=>any}} [opts]
 * @returns {any} nouvelle séance (ou la séance d'origine si rien ne change)
 */
export function adapterSeance(seance, opts = {}) {
  const mode = opts.mode || "normale";
  const phase = opts.phase && PHASES[opts.phase] ? PHASES[opts.phase] : null;
  const fatigue = mode === "allegee";
  const recup = fatigue || opts.phase === "recuperation";
  const rirDelta = fatigue ? Math.max(1, phase ? phase.rirDelta : 0) : phase ? phase.rirDelta : 0;
  const chargeFacteur = recup ? 0.9 : 1;
  if (mode === "normale" && !rirDelta && chargeFacteur === 1) return seance;

  let exercices = (seance.exercices || []).map((e) => {
    let series = (e.series || []).map((s) => ({
      ...s,
      rirCible: s.type === "echauffement" || s.rirCible == null ? s.rirCible
        : Math.max(e.role === "principal" ? 1 : 0, Math.min(4, s.rirCible + rirDelta)),
    }));
    if (recup) series = moinsUneSerie(series, 2);
    return { ...e, series };
  });

  const changements = [];
  if (recup) changements.push("une série de moins par exercice", "charges −10 %");
  if (rirDelta > 0) changements.push(`${rirDelta} répétition${rirDelta > 1 ? "s" : ""} de réserve en plus`);
  if (rirDelta < 0) changements.push("une répétition de réserve en moins");

  if (mode === "courte") {
    const minutes = Math.max(15, Number(opts.minutes) || 30);
    const prio = new Set(opts.musclesPrioritaires || []);
    const get = opts.getExercise || (() => null);
    const estPrio = (e) => { const x = get(e.exerciceId); return !!x && (x.musclesPrincipaux || []).some((m) => prio.has(m)); };
    // Ordre d'importance : mouvements principaux, puis secondaires, puis les
    // isolations des muscles prioritaires, puis le reste.
    const rang = (e) => (ROLE_RANG[e.role] ?? 2) - (estPrio(e) && e.role !== "principal" ? 1.5 : 0);
    const ordre = exercices.map((e, i) => ({ e, i })).sort((a, b) => rang(a.e) - rang(b.e) || a.i - b.i);
    const retires = [];
    const total = () => dureeSeance({ exercices });
    // 1) Retirer les moins importants (on garde toujours 2 exercices).
    for (let k = ordre.length - 1; k >= 0 && total() > minutes && exercices.length > 2; k--) {
      const cible = ordre[k].e;
      exercices = exercices.filter((x) => x !== cible);
      retires.push(cible.exerciceId);
    }
    // 2) Puis plafonner les séries : 3, puis 2 par exercice.
    for (const plafond of [3, 2]) {
      if (total() <= minutes) break;
      exercices = exercices.map((e) => {
        let series = e.series;
        while (travail(series).length > plafond) series = moinsUneSerie(series, plafond);
        return { ...e, series };
      });
    }
    // 3) Enfin, repos raccourcis d'un quart (jamais sous 45 s).
    if (total() > minutes) {
      exercices = exercices.map((e) => ({ ...e, series: e.series.map((s) => ({ ...s, reposSec: Math.max(45, Math.round(((s.reposSec || 60) * 0.75) / 15) * 15) })) }));
      changements.push("repos raccourcis");
    }
    if (retires.length) changements.push(`${retires.length} exercice${retires.length > 1 ? "s" : ""} secondaire${retires.length > 1 ? "s" : ""} retiré${retires.length > 1 ? "s" : ""}`);
    changements.push("exercices prioritaires conservés");
  }

  const suffixe = mode === "courte" ? `courte-${opts.minutes || 30}` : fatigue ? "allegee" : opts.phase || "phase";
  const libelle = mode === "courte" ? `version ${opts.minutes || 30} min` : fatigue ? "version allégée" : phase ? phase.nom.toLowerCase() : "";
  const s = {
    ...seance,
    id: `${seance.id}~${suffixe}`,
    origineId: seance.origineId || seance.id,
    nom: libelle ? `${seance.nom} · ${libelle}` : seance.nom,
    exercices,
    chargeFacteur,
    adaptation: { mode, phase: opts.phase || null, changements },
  };
  s.dureeEstimeeMin = dureeSeance(s);
  return s;
}
