// @ts-check
/**
 * PLANIFICATEUR AUTOMATIQUE — fonctions PURES.
 *
 * Répond à deux questions, dans cet ordre :
 *   1. « Quels muscles devrais-je entraîner maintenant ? »
 *   2. « Quels exercices conviennent à ces muscles ET à mon état actuel ? »
 * puis construit la séance.
 *
 * Le système ne suit aucun découpage figé (push/pull/legs). Il recalcule à
 * partir de l'état estimé du corps, du volume hebdomadaire, de l'ancienneté de
 * la dernière sollicitation et de l'équilibre à long terme. Le résultat peut
 * ressembler à du PPL certains jours — par coïncidence, pas par règle.
 */

import { CLES_MOTEUR, LABELS_MOTEUR, DEF_MOTEUR } from "../data/muscles-moteur.js";
import { coefficientsPour, musclePrincipalMoteur, classerExercice } from "../data/exercise-muscle-map.js";
import { etatMusculaire, cibleVolumeHebdo, zoneDisponibilite, PARAMS } from "./fatigue.js";
import { facteursRecuperation } from "./apprentissage.js";

/* ============================ PARAMÈTRES ============================ */

export const PLAN_PARAMS = {
  /** Pondération du score de priorité musculaire (somme = 1). */
  POIDS_PRIORITE: { readiness: 0.45, deficitVolume: 0.30, anciennete: 0.15, equilibre: 0.10 },

  /** Seuils de sélection (readiness). */
  SEUIL_EXCLUSION: 40,      // en dessous : jamais muscle principal
  SEUIL_RESERVE: 60,        // 40–59 : seulement faute de mieux
  SEUIL_BON: 75,

  /** Pénalité de compatibilité si un muscle secondaire important est trop bas. */
  SEUIL_SECONDAIRE_CRITIQUE: 40,
  COEF_SECONDAIRE_IMPORTANT: 0.35,  // au-delà, un secondaire compte vraiment
  PENALITE_SECONDAIRE: 0.55,        // facteur appliqué au score

  /** Un muscle est « négligé » au-delà de ce nombre de jours sans travail direct. */
  JOURS_NEGLIGE: 7,
  /** Plafond du bonus de négligence. */
  BONUS_NEGLIGE_MAX: 25,

  /** Nombre de groupes principaux visés par séance. */
  GROUPES_PAR_SEANCE: { 30: 1, 45: 2, 60: 2, 75: 3, 90: 3 },

  /** Minutes consommées par série (effort + repos), pour tenir la durée. */
  MIN_PAR_SERIE: { compose: 3.2, isolation: 2.2 },

  /** Volume par séance selon le niveau (séries par muscle principal). */
  SERIES_PAR_MUSCLE: { debutant: [2, 3], intermediaire: [3, 4], avance: [4, 5] },

  /** Part maximale de l'objectif hebdomadaire réalisable en une seule séance. */
  PART_MAX_HEBDO: 0.5,

  /** En dessous de cette disponibilité moyenne, le repos est conseillé. */
  SEUIL_REPOS_GLOBAL: 52,

  /** Jours d'entraînement maximum sur 7 jours glissants, par niveau.
   *  Contrainte de PROGRAMMATION, pas une mesure de fatigue : alterner les
   *  muscles ne suffit pas, il faut aussi des jours sans séance. Sans cela le
   *  moteur enchaînait 30 jours d'affilée en gardant chaque groupe frais. */
  JOURS_MAX_SEMAINE: { debutant: 4, intermediaire: 5, avance: 6 },

  /** Départage des priorités par importance du groupe (gros groupes d'abord
   *  quand tout le reste est égal). Volontairement faible : ne doit jamais
   *  primer sur la récupération ou le déficit de volume. */
  BONUS_TAILLE: { grand: 6, moyen: 3, petit: 0 },

  /** Petits muscles à ne pas laisser disparaître. */
  SURVEILLES: ["deltoide_lateral", "deltoide_posterieur", "mollets", "ischio_jambiers", "abdominaux"],
};

/** Associations naturelles — favorisées, jamais imposées. */
export const AFFINITES = [
  ["grand_dorsal", "biceps"], ["haut_du_dos", "biceps"], ["grand_dorsal", "haut_du_dos"],
  ["haut_du_dos", "deltoide_posterieur"], ["grand_dorsal", "deltoide_posterieur"],
  ["pectoraux", "triceps"], ["pectoraux", "deltoide_anterieur"], ["pectoraux", "deltoide_lateral"],
  ["deltoide_anterieur", "triceps"], ["deltoide_lateral", "deltoide_posterieur"],
  ["quadriceps", "ischio_jambiers"], ["quadriceps", "fessiers"], ["ischio_jambiers", "fessiers"],
  ["quadriceps", "mollets"], ["ischio_jambiers", "mollets"], ["fessiers", "adducteurs"],
  ["abdominaux", "obliques"], ["biceps", "triceps"], ["biceps", "avant_bras"],
  ["deltoide_lateral", "trapezes"], ["lombaires", "fessiers"],
];

const cleAffinite = (a, b) => [a, b].sort().join("|");
const SET_AFFINITES = new Set(AFFINITES.map(([a, b]) => cleAffinite(a, b)));

/** Deux groupes vont-ils naturellement ensemble ? */
export function sontCompatibles(a, b) {
  if (a === b) return true;
  if (SET_AFFINITES.has(cleAffinite(a, b))) return true;
  // Même région du corps = association acceptable par défaut.
  return (DEF_MOTEUR[a]?.region || "") === (DEF_MOTEUR[b]?.region || "");
}

/* ============================ SCORE DE PRIORITÉ ============================ */

/**
 * Priorité de chaque muscle (0–100). Un muscle frais mais déjà bien servi dans
 * la semaine passe DERRIÈRE un muscle un peu moins frais mais en manque de
 * volume : c'est ce qui empêche l'app de proposer toujours les mêmes groupes.
 *
 * @param {Record<string,any>} etat état musculaire
 * @param {{niveau?:string}} profil
 * @param {number} maintenant
 * @returns {{muscle:string, nom:string, priority:number, readiness:number, deficit:number, jours:number, cible:number, detail:object}[]}
 */
export function prioriterMuscles(etat, profil = {}, maintenant = Date.now()) {
  const niveau = profil.niveau || "intermediaire";
  const P = PLAN_PARAMS.POIDS_PRIORITE;
  const lignes = [];

  for (const cle of CLES_MOTEUR) {
    const m = etat[cle];
    if (!m) continue;
    const cible = cibleVolumeHebdo(cle, niveau, DEF_MOTEUR);
    // Déficit de volume : 0 si l'objectif est atteint, 100 si rien n'a été fait.
    const deficit = Math.max(0, Math.min(100, ((cible - m.weeklyEquivalentSets) / Math.max(1, cible)) * 100));
    // Ancienneté de la dernière sollicitation directe.
    const dernier = m.lastDirectTraining || m.lastIndirectTraining;
    const jours = dernier ? (maintenant - dernier) / 864e5 : 99;
    const anciennete = Math.max(0, Math.min(100, (jours / PLAN_PARAMS.JOURS_NEGLIGE) * 100));
    // Équilibre : les petits muscles souvent oubliés reçoivent un léger appui.
    const equilibre = PLAN_PARAMS.SURVEILLES.includes(cle) ? 70 : 45;

    let priority = m.readiness * P.readiness + deficit * P.deficitVolume
      + anciennete * P.anciennete + equilibre * P.equilibre;

    // Bonus muscle négligé : réellement pas travaillé depuis longtemps ET récupéré.
    if (jours >= PLAN_PARAMS.JOURS_NEGLIGE && m.readiness >= PLAN_PARAMS.SEUIL_BON) {
      const bonus = Math.min(PLAN_PARAMS.BONUS_NEGLIGE_MAX,
        (jours - PLAN_PARAMS.JOURS_NEGLIGE + 1) * 5);
      priority += bonus;
    }
    // Pénalité de surutilisation : objectif hebdomadaire déjà dépassé.
    if (m.weeklyEquivalentSets > cible) {
      const exces = (m.weeklyEquivalentSets - cible) / Math.max(1, cible);
      priority -= Math.min(35, exces * 45);
    }
    // Un muscle non récupéré ne peut pas être prioritaire.
    if (m.readiness < PLAN_PARAMS.SEUIL_EXCLUSION) priority *= 0.25;

    // Départage : sans cela, une dizaine de groupes non entraînés plafonnent
    // tous à 100 et l'ordre devient arbitraire (on tombait sur « trapèzes +
    // arrière d'épaules » alors que les jambes étaient libres). Les groupes
    // qui absorbent le plus de volume utile passent devant.
    const taille = DEF_MOTEUR[cle]?.taille || "moyen";
    priority += PLAN_PARAMS.BONUS_TAILLE[taille] ?? 0;

    const brut = Math.round(priority * 10) / 10;
    priority = Math.max(0, Math.min(100, brut));
    m.priority = priority;
    lignes.push({
      muscle: cle, nom: LABELS_MOTEUR[cle], priority, brut,
      readiness: m.readiness, deficit: Math.round(deficit),
      jours: Math.round(jours * 10) / 10, cible,
      detail: { readiness: m.readiness, deficit, anciennete, equilibre },
    });
  }
  // Tri sur le score brut : plusieurs groupes non entraînés saturent à 100,
  // et le plafonnement rendait leur ordre arbitraire.
  return lignes.sort((a, b) => b.brut - a.brut);
}

/* ============================ COMPATIBILITÉ D'UN EXERCICE ============================ */

/**
 * Score de compatibilité d'un exercice avec l'état actuel du corps (0–100).
 *
 * Moyenne des disponibilités pondérée par les coefficients : le muscle
 * principal pèse le plus. Un exercice dont un secondaire IMPORTANT est trop bas
 * subit une forte pénalité — c'est ce qui évite de proposer un développé couché
 * quand les triceps sont à 20 %.
 *
 * @returns {{score:number, limitant:string|null, coeffs:Record<string,number>}}
 */
export function compatibiliteExercice(exo, etat) {
  const coeffs = coefficientsPour(exo);
  const entrees = Object.entries(coeffs);
  if (!entrees.length) return { score: 100, limitant: null, coeffs };
  let num = 0, den = 0, limitant = null, pire = 101;
  for (const [muscle, coef] of entrees) {
    const r = etat[muscle] ? etat[muscle].readiness : 100;
    num += r * coef;
    den += coef;
    if (coef >= PLAN_PARAMS.COEF_SECONDAIRE_IMPORTANT && r < pire) { pire = r; limitant = muscle; }
  }
  let score = den ? num / den : 100;
  // Pénalité : un muscle réellement sollicité par ce mouvement est trop bas.
  if (limitant && pire < PLAN_PARAMS.SEUIL_SECONDAIRE_CRITIQUE) {
    score *= PLAN_PARAMS.PENALITE_SECONDAIRE;
  } else if (limitant && pire < PLAN_PARAMS.SEUIL_RESERVE) {
    score *= 0.82;
  }
  return {
    score: Math.max(0, Math.min(100, Math.round(score * 10) / 10)),
    limitant: pire < PLAN_PARAMS.SEUIL_RESERVE ? limitant : null,
    coeffs,
  };
}

/* ============================ SÉLECTION DES MUSCLES ============================ */

/**
 * Choisit les groupes principaux de la prochaine séance.
 * @returns {{muscles:string[], repos:boolean, raison:string}}
 */
export function choisirMuscles(classement, etat, opts = {}) {
  const nbVoulu = opts.nbGroupes || 2;

  // Plafond de jours d'entraînement sur 7 jours glissants.
  if (opts.joursEntraines != null) {
    const max = PLAN_PARAMS.JOURS_MAX_SEMAINE[opts.niveau] ?? PLAN_PARAMS.JOURS_MAX_SEMAINE.intermediaire;
    if (opts.joursEntraines >= max) {
      return { muscles: [], repos: true,
        raison: `${opts.joursEntraines} jours d'entraînement sur les 7 derniers : une journée sans séance fera plus progresser qu'une séance de plus.` };
    }
  }
  const dispo = classement.filter((l) => l.readiness >= PLAN_PARAMS.SEUIL_EXCLUSION);

  const utilisables = dispo.filter((l) => l.readiness >= PLAN_PARAMS.SEUIL_RESERVE);

  // Repos : soit la fatigue est générale, soit vraiment rien n'est utilisable.
  // On évalue la moyenne du corps AVANT de regarder les cas particuliers,
  // sinon un unique groupe marginalement disponible (mollets à 62 % alors que
  // tout le corps est à 43 %) suffisait à programmer une séance.
  const moyenne = classement.reduce((a, l) => a + l.readiness, 0) / Math.max(1, classement.length);
  const assezDeGroupes = utilisables.filter((l) => l.readiness >= PLAN_PARAMS.SEUIL_BON).length;
  if (moyenne < PLAN_PARAMS.SEUIL_REPOS_GLOBAL && assezDeGroupes < 2) {
    return { muscles: [], repos: true, raison: "L'ensemble du corps est encore en récupération." };
  }
  if (!utilisables.length && !dispo.length) {
    return { muscles: [], repos: true, raison: "Aucun groupe musculaire n'est suffisamment récupéré." };
  }
  const pool = utilisables.length ? utilisables : dispo;
  if (!pool.length) return { muscles: [], repos: true, raison: "Récupération insuffisante sur l'ensemble du corps." };

  // Le premier est le mieux classé ; les suivants doivent être compatibles.
  const choisis = [pool[0].muscle];
  for (const l of pool.slice(1)) {
    if (choisis.length >= nbVoulu) break;
    if (choisis.every((c) => sontCompatibles(c, l.muscle))) choisis.push(l.muscle);
  }
  // Si l'affinité a trop restreint, compléter avec le meilleur restant.
  if (choisis.length < nbVoulu) {
    for (const l of pool) {
      if (choisis.length >= nbVoulu) break;
      if (!choisis.includes(l.muscle)) choisis.push(l.muscle);
    }
  }
  return { muscles: choisis, repos: false, raison: "" };
}

/* ============================ CONSTRUCTION DE LA SÉANCE ============================ */

/** Familles de mouvement, pour éviter cinq variantes du même geste. */
function famille(exo) {
  return `${exo.patron || "autre"}:${classerExercice(exo).startsWith("isolation") ? "iso" : "poly"}`;
}

/**
 * Construit la séance : sélection des exercices, séries, et justification.
 *
 * @param {string[]} muscles groupes principaux retenus
 * @param {Record<string,any>} etat
 * @param {any[]} catalogue exercices disponibles (déjà filtrés matériel)
 * @param {{niveau?:string, dureeMin?:number, accessoires?:string[]}} profil
 *        `accessoires` : muscles candidats au travail complémentaire s'il reste
 *        du temps (renseigné par `genererProchaineSeance`).
 * @returns {{exercices:any[], dureeEstimee:number, compatibilite:number}}
 */
export function construireSeance(muscles, etat, catalogue, profil = {}) {
  const niveau = profil.niveau || "intermediaire";
  const dureeMax = profil.dureeMin || 60;
  const [minS, maxS] = PLAN_PARAMS.SERIES_PAR_MUSCLE[niveau] || PLAN_PARAMS.SERIES_PAR_MUSCLE.intermediaire;

  // Candidats : exercices dont le muscle principal est un des groupes visés.
  const parMuscle = {};
  for (const m of muscles) parMuscle[m] = [];
  for (const exo of catalogue) {
    const principal = musclePrincipalMoteur(exo);
    if (!principal || !parMuscle[principal]) continue;
    const c = compatibiliteExercice(exo, etat);
    // On écarte franchement ce qui est incompatible avec l'état actuel.
    if (c.score < 55) continue;
    parMuscle[principal].push({ exo, ...c, famille: famille(exo) });
  }
  for (const m of muscles) parMuscle[m].sort((a, b) => b.score - a.score);

  const choisis = [];
  const famillesVues = new Set();
  let minutes = 0;

  // Tour par tour entre les muscles, pour équilibrer et diversifier.
  const restant = () => dureeMax - minutes;
  for (let tour = 0; tour < 4; tour++) {
    for (const m of muscles) {
      const dejaPourCeMuscle = choisis.filter((c) => c.principal === m).length;
      const maxExos = tour === 0 ? 1 : (muscles.length <= 2 ? 3 : 2);
      if (dejaPourCeMuscle > maxExos) continue;

      // Plafonner par rapport au volume hebdomadaire déjà réalisé : on ne
      // rattrape jamais tout l'objectif de la semaine en une seule séance.
      const st = etat[m] || { weeklyEquivalentSets: 0 };
      const cible = cibleVolumeHebdo(m, niveau, DEF_MOTEUR);
      const budget = Math.max(0, cible * PLAN_PARAMS.PART_MAX_HEBDO - 0);
      const dejaPrevu = choisis.filter((c) => c.principal === m).reduce((a, c) => a + c.series, 0);
      const resteHebdo = Math.max(0, cible - st.weeklyEquivalentSets);
      if (dejaPrevu >= Math.min(budget + minS, Math.max(minS, resteHebdo))) continue;

      const cand = parMuscle[m].find((c) => !choisis.some((x) => x.exo.id === c.exo.id)
        && (tour === 0 || !famillesVues.has(c.famille)));
      if (!cand) continue;

      const iso = classerExercice(cand.exo).startsWith("isolation");
      const series = tour === 0 ? maxS : Math.max(minS, maxS - 1);
      const cout = series * (iso ? PLAN_PARAMS.MIN_PAR_SERIE.isolation : PLAN_PARAMS.MIN_PAR_SERIE.compose);
      if (cout > restant()) continue;

      minutes += cout;
      famillesVues.add(cand.famille);
      choisis.push({
        exo: cand.exo, principal: m, series,
        score: cand.score, limitant: cand.limitant, coeffs: cand.coeffs, iso,
      });
    }
  }

  // Complément : s'il reste du temps, ajouter du travail accessoire sur les
  // muscles compatibles les mieux classés (souvent bras, épaules, mollets,
  // abdos). C'est ce qui évite les séances trop courtes et les petits muscles
  // systématiquement oubliés.
  if (Array.isArray(profil.accessoires) && restant() > 6) {
    // Si la séance reste très courte (petits groupes à faible objectif
    // hebdomadaire), on relâche l'exigence d'affinité : mieux vaut une séance
    // complète et cohérente qu'une séance de 18 minutes sur 60 demandées.
    const largeMarge = restant() > dureeMax * 0.4;
    for (const m of profil.accessoires) {
      if (muscles.includes(m)) continue;
      if (!largeMarge && !muscles.every((c) => sontCompatibles(c, m))) continue;
      if (largeMarge && !muscles.some((c) => sontCompatibles(c, m))
        && (etat[m]?.readiness || 0) < PLAN_PARAMS.SEUIL_BON) continue;
      const st2 = etat[m] || { readiness: 100, weeklyEquivalentSets: 0 };
      if (st2.readiness < PLAN_PARAMS.SEUIL_RESERVE) continue;
      if (st2.weeklyEquivalentSets >= cibleVolumeHebdo(m, niveau, DEF_MOTEUR)) continue;
      const cands = catalogue
        .filter((e) => musclePrincipalMoteur(e) === m && !choisis.some((x) => x.exo.id === e.id))
        .map((e) => ({ exo: e, ...compatibiliteExercice(e, etat), famille: famille(e) }))
        .filter((c) => c.score >= 65 && !famillesVues.has(c.famille))
        .sort((a, b) => b.score - a.score);
      const cand = cands[0];
      if (!cand) continue;
      const iso = classerExercice(cand.exo).startsWith("isolation");
      const series = minS;
      const cout = series * (iso ? PLAN_PARAMS.MIN_PAR_SERIE.isolation : PLAN_PARAMS.MIN_PAR_SERIE.compose);
      if (cout > restant()) continue;
      minutes += cout;
      famillesVues.add(cand.famille);
      choisis.push({ exo: cand.exo, principal: m, series, score: cand.score,
        limitant: cand.limitant, coeffs: cand.coeffs, iso, accessoire: true });
      if (restant() < 6) break;
    }
  }

  const compat = choisis.length
    ? Math.round(choisis.reduce((a, c) => a + c.score, 0) / choisis.length)
    : 0;
  return { exercices: choisis, dureeEstimee: Math.round(minutes), compatibilite: compat };
}

/* ============================ FONCTION PRINCIPALE ============================ */

/**
 * LE point d'entrée : analyse le corps et renvoie la prochaine séance,
 * entièrement construite, avec sa justification.
 *
 * @param {any[]} logs historique des séances
 * @param {(id:string)=>any} getExercise
 * @param {any[]} catalogue exercices réalisables (filtrés matériel/limitations)
 * @param {{niveau?:string, dureeMin?:number, ressenti?:number}} profil
 * @param {number} [maintenant]
 */
export function genererProchaineSeance(logs, getExercise, catalogue, profil = {}, maintenant = Date.now()) {
  // Calibration apprise sur l'historique : sans données suffisantes elle vaut
  // 1 partout et le moteur se comporte exactement comme avant.
  const facteurs = facteursRecuperation(logs, getExercise, maintenant);
  const etat = etatMusculaire(logs, getExercise, maintenant, { ressenti: profil.ressenti, facteurs });
  const classement = prioriterMuscles(etat, profil, maintenant);

  const duree = profil.dureeMin || 60;
  const paliers = Object.keys(PLAN_PARAMS.GROUPES_PAR_SEANCE).map(Number).sort((a, b) => a - b);
  const palier = paliers.find((p) => duree <= p) ?? paliers[paliers.length - 1];
  const nbGroupes = PLAN_PARAMS.GROUPES_PAR_SEANCE[palier];

  // Jours DISTINCTS d'entraînement sur les 7 derniers jours.
  const joursEntraines = new Set(
    (logs || [])
      .filter((l) => l && l.date)
      .map((l) => Date.parse(l.date))
      .filter((t) => Number.isFinite(t) && t <= maintenant && t > maintenant - 7 * 864e5)
      .map((t) => new Date(t).toISOString().slice(0, 10))
  ).size;

  const sel = choisirMuscles(classement, etat, { nbGroupes, joursEntraines, niveau: profil.niveau });
  if (sel.repos) {
    return {
      repos: true, raison: sel.raison, etat, classement,
      muscles: [], exercices: [], dureeEstimee: 0, compatibilite: 0, nom: "Repos conseillé",
      explications: explications([], classement, etat, true),
    };
  }

  // Les muscles suivants au classement servent de travail accessoire.
  const accessoires = classement
    .filter((l) => !sel.muscles.includes(l.muscle) && l.readiness >= PLAN_PARAMS.SEUIL_RESERVE)
    .slice(0, 6).map((l) => l.muscle);
  const { exercices, dureeEstimee, compatibilite } =
    construireSeance(sel.muscles, etat, catalogue, { ...profil, accessoires });
  // Si rien n'a pu être construit (catalogue trop restreint), on le dit.
  if (!exercices.length) {
    return {
      repos: true, raison: "Aucun exercice compatible avec ton matériel pour les muscles disponibles.",
      etat, classement, muscles: sel.muscles, exercices: [], dureeEstimee: 0, compatibilite: 0,
      nom: "Repos conseillé", explications: explications(sel.muscles, classement, etat, true),
    };
  }

  return {
    repos: false, raison: "", etat, classement,
    muscles: sel.muscles,
    nom: sel.muscles.map((m) => LABELS_MOTEUR[m]).join(" + "),
    exercices, dureeEstimee, compatibilite,
    explications: explications(sel.muscles, classement, etat, false),
  };
}

/**
 * Explique la décision en français, à partir des données réelles.
 * @returns {string[]}
 */
export function explications(muscles, classement, etat, repos) {
  const out = [];
  const par = Object.fromEntries(classement.map((l) => [l.muscle, l]));
  if (repos) {
    const bas = classement.filter((l) => l.readiness < PLAN_PARAMS.SEUIL_RESERVE)
      .slice(0, 4).map((l) => `${l.nom} ${Math.round(l.readiness)} %`);
    if (bas.length) out.push(`Groupes encore en récupération : ${bas.join(", ")}.`);
    out.push("Une journée de repos ou de mobilité laissera repartir la progression.");
    return out;
  }
  for (const m of muscles) {
    const l = par[m];
    if (!l) continue;
    const bouts = [`${l.nom} : ${Math.round(l.readiness)} % disponible`];
    if (l.deficit >= 40) bouts.push(`volume hebdomadaire encore incomplet (${etat[m].weeklyEquivalentSets}/${l.cible} séries)`);
    if (l.jours >= 90) bouts.push("jamais travaillé jusqu'ici");
    else if (l.jours >= PLAN_PARAMS.JOURS_NEGLIGE) bouts.push(`pas travaillé depuis ${Math.round(l.jours)} jours`);
    out.push(bouts.join(", ") + ".");
  }
  const ecartes = classement
    .filter((l) => l.readiness < PLAN_PARAMS.SEUIL_RESERVE && !muscles.includes(l.muscle))
    .slice(0, 3);
  if (ecartes.length) {
    out.push(`Écartés car en récupération : ${ecartes.map((l) => `${l.nom} ${Math.round(l.readiness)} %`).join(", ")}.`);
  }
  const satures = classement.filter((l) => !muscles.includes(l.muscle) && l.deficit === 0 && l.readiness >= 75).slice(0, 2);
  if (satures.length) {
    out.push(`Volume hebdomadaire déjà atteint : ${satures.map((l) => l.nom).join(", ")}.`);
  }
  return out;
}

/** Résumé compact pour l'accueil : combien de muscles dans chaque zone. */
export function resumeCorps(etat) {
  let prets = 0, recup = 0, sollicites = 0;
  for (const cle of CLES_MOTEUR) {
    const r = etat[cle] ? etat[cle].readiness : 100;
    if (r >= PLAN_PARAMS.SEUIL_BON) prets++;
    else if (r >= PLAN_PARAMS.SEUIL_EXCLUSION) recup++;
    else sollicites++;
  }
  const moyenne = CLES_MOTEUR.reduce((a, c) => a + (etat[c] ? etat[c].readiness : 100), 0) / CLES_MOTEUR.length;
  return { prets, recup, sollicites, moyenne: Math.round(moyenne) };
}
