// @ts-check
/**
 * Logique PURE de la séance active (« live »).
 *
 * Ce module ne touche ni au DOM ni au stockage : il crée, fait évoluer et
 * (dé)sérialise l'état d'une séance en cours. La couche UI (app.js) s'en sert
 * et se charge de la persistance (IndexedDB via Etat) et du rendu.
 *
 * Forme de l'état live :
 *   {
 *     seanceId: string,
 *     debut: string(ISO),
 *     fini: boolean,
 *     data: { [exId]: { exId, series: SerieLive[], douleur: boolean } }
 *   }
 * SerieLive : { charge:string|number, reps:string|number, rir:string|number,
 *               dureeSec:number|null, done:boolean }
 */

/**
 * TYPES DE SÉRIE avancés.
 *
 * Une série « normale » suit le repos prescrit par l'exercice. Un drop set et
 * un rest-pause sont au contraire des prolongements de la série précédente :
 * la pause y est très courte et volontairement fixe, sans quoi la technique
 * n'a plus de sens. Les libellés restent courts : ils s'affichent dans la
 * cellule du numéro de série, large de 28 px sur un téléphone.
 */
export const TYPES_SERIE = {
  normale: { label: "Normale", court: "", reposSec: null },
  drop: { label: "Drop set", court: "D", reposSec: 15 },
  rest_pause: { label: "Rest-pause", court: "RP", reposSec: 20 },
};
export const CLES_TYPE_SERIE = Object.keys(TYPES_SERIE);

/** Identifiants de groupe de superset proposés, dans l'ordre d'attribution. */
export const GROUPES_SUPERSET = ["A", "B", "C", "D"];

/** Type de série valide, `"normale"` en secours. */
function typeValide(t) {
  return CLES_TYPE_SERIE.includes(t) ? t : "normale";
}

/** Type suivant dans le cycle normale → drop → rest-pause → normale. */
export function cyclerType(type) {
  const i = CLES_TYPE_SERIE.indexOf(typeValide(type));
  return CLES_TYPE_SERIE[(i + 1) % CLES_TYPE_SERIE.length];
}

/**
 * Convertit un RPE (échelle 1–10, effort perçu) en RIR (répétitions en
 * réserve) : RIR = 10 − RPE. Renvoie null si la valeur est inexploitable, pour
 * ne jamais injecter de NaN dans l'historique.
 */
export function rirDepuisRpe(rpe) {
  const v = typeof rpe === "string" ? parseFloat(rpe.replace(",", ".")) : rpe;
  if (!Number.isFinite(v)) return null;
  return Math.max(0, Math.min(10, Math.round((10 - v) * 10) / 10));
}

/** Réciproque : RPE = 10 − RIR. */
export function rpeDepuisRir(rir) {
  const v = typeof rir === "string" ? parseFloat(rir.replace(",", ".")) : rir;
  if (!Number.isFinite(v)) return null;
  return Math.max(0, Math.min(10, Math.round((10 - v) * 10) / 10));
}

/**
 * Exercices d'un même superset, dans l'ordre de la séance.
 *
 * @param {any} live       état live
 * @param {string[]} ordre identifiants d'exercices dans l'ordre d'affichage
 * @param {string} groupe  identifiant de groupe ("A", "B"…)
 * @returns {string[]}
 */
export function exercicesDuSuperset(live, ordre, groupe) {
  if (!live || !live.data || !groupe) return [];
  return (ordre || []).filter((id) => live.data[id] && live.data[id].supersetGroupe === groupe);
}

/** Premier identifiant de groupe encore libre, ou null si les 4 sont pris. */
export function groupeSupersetLibre(live) {
  const pris = new Set(Object.values((live && live.data) || {}).map((st) => st && st.supersetGroupe).filter(Boolean));
  return GROUPES_SUPERSET.find((g) => !pris.has(g)) || null;
}

/**
 * Décide du repos qui suit la validation d'une série.
 *
 * Trois règles, dans cet ordre :
 *  1. une série drop / rest-pause impose sa propre pause courte ;
 *  2. dans un superset, on enchaîne sans repos tant qu'il reste un exercice du
 *     groupe à faire — le repos n'arrive qu'après le dernier ;
 *  3. sinon, le repos prescrit par l'exercice.
 *
 * @param {object} opts
 * @param {string} [opts.type]        type de la série validée
 * @param {number} [opts.reposSec]    repos prescrit par l'exercice
 * @param {string|null} [opts.suivantSuperset]  exercice à enchaîner, s'il y en a un
 * @returns {{sec:number, enchainer:boolean, raison:string}}
 */
export function reposApresSerie(opts = {}) {
  const type = typeValide(opts.type);
  const prescrit = Number.isFinite(opts.reposSec) && opts.reposSec > 0 ? opts.reposSec : 60;
  if (type !== "normale") {
    return { sec: TYPES_SERIE[type].reposSec, enchainer: false, raison: TYPES_SERIE[type].label };
  }
  if (opts.suivantSuperset) {
    return { sec: 0, enchainer: true, raison: "superset" };
  }
  return { sec: prescrit, enchainer: false, raison: "normal" };
}

/** Crée l'état live d'une séance à partir d'un gabarit de séance. */
export function nouvelleSession(seance, maintenant = new Date().toISOString()) {
  const data = {};
  for (const e of seance.exercices || []) {
    const nb = (e.series || []).filter((s) => s.type !== "echauffement").length || 3;
    const serieTemps = (e.series || []).find((s) => s.dureeSec);
    const enTemps = !!serieTemps;
    data[e.exerciceId] = {
      exId: e.exerciceId,
      series: Array.from({ length: nb }, () => nouvelleSerie(enTemps ? (serieTemps.dureeSec || 40) : null)),
      douleur: false,
      showRir: null,      // null = suit le mode (masquée en débutant, visible en avancé)
      supersetGroupe: null,
    };
  }
  return { seanceId: seance.id, debut: maintenant, fini: false, data };
}

/** Une série live vierge (en temps si `dureeSec` fourni, sinon en reps). */
export function nouvelleSerie(dureeSec = null) {
  return { charge: "", reps: "", rir: "", dureeSec: dureeSec, done: false, type: "normale" };
}

/**
 * Ajoute une série à un exercice live, en copiant le format (temps vs reps) et
 * la charge de la dernière série pour aller plus vite. Renvoie l'état exercice.
 */
export function ajouterSerie(stExercice) {
  const derniere = stExercice.series[stExercice.series.length - 1];
  const enTemps = !!(derniere && derniere.dureeSec);
  const nouvelle = nouvelleSerie(enTemps ? derniere.dureeSec : null);
  if (derniere && derniere.charge !== "" && derniere.charge != null) nouvelle.charge = derniere.charge;
  stExercice.series.push(nouvelle);
  return stExercice;
}

/** Retire la dernière série d'un exercice (en garde toujours au moins une). */
export function retirerDerniereSerie(stExercice) {
  if (stExercice.series.length > 1) stExercice.series.pop();
  return stExercice;
}

/**
 * Sérialise l'état live pour la persistance (copie profonde simple, sûre au
 * JSON). Ne conserve que des données sérialisables.
 */
export function serialiser(live) {
  if (!live || typeof live !== "object") return null;
  try { return JSON.parse(JSON.stringify(live)); } catch (e) { return null; }
}

/**
 * Restaure un état live depuis la persistance, en validant sa forme. Renvoie
 * null si l'objet est inexploitable (ainsi l'app ne tente pas de reprendre une
 * séance corrompue).
 */
export function restaurer(brut) {
  if (!brut || typeof brut !== "object") return null;
  if (typeof brut.seanceId !== "string" || !brut.data || typeof brut.data !== "object") return null;
  const data = {};
  for (const exId of Object.keys(brut.data)) {
    const st = brut.data[exId];
    if (!st || !Array.isArray(st.series)) continue;
    data[exId] = {
      exId: st.exId || exId,
      douleur: !!st.douleur,
      // Préférences d'affichage et groupe de superset : elles font partie de la
      // séance en cours, les perdre à la reprise reviendrait à réinitialiser
      // l'écran sous les doigts de l'utilisateur.
      showRir: st.showRir == null ? null : !!st.showRir,
      supersetGroupe: GROUPES_SUPERSET.includes(st.supersetGroupe) ? st.supersetGroupe : null,
      series: st.series.map((s) => ({
        charge: s && s.charge != null ? s.charge : "",
        reps: s && s.reps != null ? s.reps : "",
        rir: s && s.rir != null ? s.rir : "",
        dureeSec: s && typeof s.dureeSec === "number" ? s.dureeSec : null,
        done: !!(s && s.done),
        type: typeValide(s && s.type),
      })),
    };
  }
  if (!Object.keys(data).length) return null;
  return {
    seanceId: brut.seanceId,
    debut: typeof brut.debut === "string" ? brut.debut : new Date().toISOString(),
    fini: !!brut.fini,
    data,
  };
}

/**
 * Une séance en cours est-elle reprenable ? Vrai si elle n'est pas finie, que
 * sa séance existe encore (résolue par `trouverSeance`, qui cherche aussi bien
 * dans le programme généré que dans les routines perso), et qu'au moins une
 * donnée a été saisie (sinon inutile de proposer une reprise).
 *
 * @param {any} sessionEnCours
 * @param {(seanceId:string)=>any} trouverSeance  résolveur id → séance | null
 */
/**
 * Réconcilie une séance live avec la définition ACTUELLE de la séance.
 *
 * Nécessaire parce que le gabarit peut avoir changé pendant qu'une séance était
 * en cours (exercice ajouté au programme, séance modifiée sur un autre écran) :
 * sans cela, l'interface cherche un état inexistant pour ce nouvel exercice.
 * Les exercices déjà saisis sont conservés tels quels ; ceux qui ne sont plus
 * dans la séance sont gardés eux aussi (on ne jette jamais une saisie).
 *
 * @param {any} live    état live (modifié en place)
 * @param {any} seance  gabarit de séance courant
 * @returns {any} le même état live, complété
 */
export function reconcilier(live, seance) {
  if (!live || !live.data || !seance || !Array.isArray(seance.exercices)) return live;
  for (const e of seance.exercices) {
    const id = e && e.exerciceId;
    if (!id || live.data[id]) continue;
    const utiles = (e.series || []).filter((s) => s.type !== "echauffement");
    const nb = utiles.length || 3;
    const serieTemps = (e.series || []).find((s) => s.dureeSec);
    live.data[id] = {
      exId: id,
      douleur: false,
      showRir: null,      // null = suit le mode (masquée en débutant, visible en avancé)
      supersetGroupe: null,
      series: Array.from({ length: nb }, () => nouvelleSerie(serieTemps ? (serieTemps.dureeSec || 40) : null)),
    };
  }
  return live;
}

export function estReprenable(sessionEnCours, trouverSeance) {
  const live = restaurer(sessionEnCours);
  if (!live || live.fini) return false;
  const seance = typeof trouverSeance === "function" ? trouverSeance(live.seanceId) : null;
  if (!seance) return false;
  for (const exId of Object.keys(live.data)) {
    for (const s of live.data[exId].series) {
      if (s.done || s.charge !== "" || s.reps !== "" || (s.dureeSec && s.done)) return true;
    }
    if (live.data[exId].douleur) return true;
  }
  return false;
}

/** Durée d'une séance en secondes (>= 0), ou null si bornes invalides. */
export function dureeSecondes(debutISO, finISO) {
  const a = Date.parse(debutISO), b = Date.parse(finISO);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round((b - a) / 1000);
}
