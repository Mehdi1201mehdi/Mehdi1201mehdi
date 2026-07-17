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
    };
  }
  return { seanceId: seance.id, debut: maintenant, fini: false, data };
}

/** Une série live vierge (en temps si `dureeSec` fourni, sinon en reps). */
export function nouvelleSerie(dureeSec = null) {
  return { charge: "", reps: "", rir: "", dureeSec: dureeSec, done: false };
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
      series: st.series.map((s) => ({
        charge: s && s.charge != null ? s.charge : "",
        reps: s && s.reps != null ? s.reps : "",
        rir: s && s.rir != null ? s.rir : "",
        dureeSec: s && typeof s.dureeSec === "number" ? s.dureeSec : null,
        done: !!(s && s.done),
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
 * sa séance existe encore dans le programme fourni, et qu'au moins une donnée a
 * été saisie (sinon inutile de proposer une reprise).
 */
export function estReprenable(sessionEnCours, programme) {
  const live = restaurer(sessionEnCours);
  if (!live || live.fini) return false;
  const seance = programme && (programme.seances || []).find((s) => s.id === live.seanceId);
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
