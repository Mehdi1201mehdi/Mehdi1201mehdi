// @ts-check
/**
 * BILAN DE SÉANCE — « est-ce que j'ai fait mieux que la dernière fois ? »
 *
 * L'écran de fin annonçait un volume et un nombre de séries. Des nombres sans
 * repère : 12 400 kg, c'est beaucoup ou peu ? La seule comparaison qui compte
 * est celle avec SOI-MÊME, la fois précédente, sur la même séance.
 *
 * Trois règles, toutes destinées à ce que la comparaison reste honnête :
 *
 *   1. ON COMPARE CE QUI EST COMPARABLE. La séance de référence est la
 *      précédente PORTANT LE MÊME IDENTIFIANT. À défaut, celle qui partage le
 *      plus d'exercices — et seulement si le recouvrement est réel. Comparer un
 *      jour de jambes à un jour de bras ne veut rien dire.
 *   2. L'APP SE TAIT QUAND ELLE N'A RIEN À DIRE. Première séance, ou aucune
 *      séance comparable : `comparable: false` et une raison. Pas de « +100 % »
 *      trompeur contre un historique vide.
 *   3. LE DÉTAIL PAR EXERCICE PRIME SUR LE TOTAL. Un volume en baisse parce
 *      qu'on a fait moins de séries n'est pas une régression ; un squat plus
 *      lourd en est le contraire. On donne les deux, et on nomme les mouvements
 *      qui ont progressé.
 */

/** Volume d'un exercice : somme des charge × répétitions. */
function volumeExo(exo) {
  return (exo && Array.isArray(exo.series) ? exo.series : [])
    .reduce((a, s) => a + (Number(s && s.chargeKg) || 0) * (Number(s && s.reps) || 0), 0);
}

/** Volume total d'une séance enregistrée. */
export function volumeSeance(log) {
  return (log && Array.isArray(log.exercices) ? log.exercices : []).reduce((a, e) => a + volumeExo(e), 0);
}

/** Nombre de séries réellement enregistrées. */
export function nbSeries(log) {
  return (log && Array.isArray(log.exercices) ? log.exercices : [])
    .reduce((a, e) => a + (e && Array.isArray(e.series) ? e.series.length : 0), 0);
}

/** Charge maximale par exercice, indexée par identifiant. */
function chargesMax(log) {
  /** @type {Record<string, number>} */
  const out = {};
  for (const e of (log && Array.isArray(log.exercices) ? log.exercices : [])) {
    if (!e || !e.exerciceId) continue;
    const max = (Array.isArray(e.series) ? e.series : [])
      .reduce((m, s) => Math.max(m, Number(s && s.chargeKg) || 0), 0);
    if (max > 0) out[e.exerciceId] = Math.max(out[e.exerciceId] || 0, max);
  }
  return out;
}

/** Identifiants d'exercices présents dans une séance. */
function idsExo(log) {
  return new Set((log && Array.isArray(log.exercices) ? log.exercices : [])
    .map((e) => e && e.exerciceId).filter(Boolean));
}

/**
 * Séance de référence pour la comparaison.
 *
 * Priorité au même `seanceId` : c'est le même entraînement, la comparaison est
 * exacte. Sinon, la plus récente qui partage au moins la moitié des exercices —
 * en dessous, ce sont deux entraînements différents et les comparer induit en
 * erreur.
 *
 * @param {any} log            séance qui vient d'être terminée
 * @param {any[]} anterieurs   historique, la séance courante EXCLUE
 * @returns {any|null}
 */
export function seanceReference(log, anterieurs) {
  const liste = (Array.isArray(anterieurs) ? anterieurs : [])
    .filter((l) => l && l.id !== (log && log.id))
    .slice()
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  if (!liste.length) return null;

  if (log && log.seanceId) {
    const meme = liste.find((l) => l.seanceId === log.seanceId);
    if (meme) return meme;
  }
  const ids = idsExo(log);
  if (!ids.size) return null;
  for (const l of liste) {
    const autres = idsExo(l);
    let communs = 0;
    for (const id of ids) if (autres.has(id)) communs++;
    if (communs / ids.size >= 0.5) return l;
  }
  return null;
}

/**
 * @typedef {object} Comparaison
 * @property {boolean} comparable
 * @property {string|null} raison           pourquoi il n'y a rien à comparer
 * @property {any|null} reference           la séance de référence
 * @property {number} jours                 écart en jours
 * @property {{volume:number, series:number, duree:number}} delta   valeurs signées
 * @property {{exerciceId:string, avant:number, apres:number, delta:number}[]} progres
 * @property {{exerciceId:string, avant:number, apres:number, delta:number}[]} recul
 */

/**
 * Compare la séance terminée à la précédente comparable.
 *
 * @param {any} log
 * @param {any[]} anterieurs
 * @returns {Comparaison}
 */
export function comparerSeance(log, anterieurs) {
  const vide = {
    comparable: false, reference: null, jours: 0,
    delta: { volume: 0, series: 0, duree: 0 }, progres: [], recul: [],
  };
  if (!log || !Array.isArray(log.exercices) || !log.exercices.length) {
    return { ...vide, raison: "Séance vide : rien à comparer." };
  }
  const ref = seanceReference(log, anterieurs);
  if (!ref) {
    return { ...vide, raison: "Première séance de ce type — le point de comparaison arrive la prochaine fois." };
  }

  const da = Date.parse(String(ref.date)), db = Date.parse(String(log.date));
  const jours = Number.isFinite(da) && Number.isFinite(db)
    ? Math.max(0, Math.round(Math.abs(db - da) / 864e5)) : 0;

  const avant = chargesMax(ref), apres = chargesMax(log);
  const progres = [], recul = [];
  for (const [id, kg] of Object.entries(apres)) {
    const av = avant[id];
    if (!(av > 0)) continue;                       // pas de point de comparaison
    const d = Math.round((kg - av) * 10) / 10;
    if (d > 0) progres.push({ exerciceId: id, avant: av, apres: kg, delta: d });
    else if (d < 0) recul.push({ exerciceId: id, avant: av, apres: kg, delta: d });
  }
  progres.sort((a, b) => b.delta - a.delta);
  recul.sort((a, b) => a.delta - b.delta);

  return {
    comparable: true, raison: null, reference: ref, jours,
    delta: {
      volume: Math.round(volumeSeance(log) - volumeSeance(ref)),
      series: nbSeries(log) - nbSeries(ref),
      duree: Math.round((Number(log.dureeSec) || 0) - (Number(ref.dureeSec) || 0)),
    },
    progres, recul,
  };
}

/**
 * Phrase de tête de l'écran de fin.
 *
 * Elle remplace « Excellent travail, continue comme ça ! » — une formule qui ne
 * dit rien et qu'on cesse de lire dès la deuxième séance. Ici elle porte le
 * fait le plus marquant de la séance, et rien d'autre.
 *
 * @param {Comparaison} cmp
 * @param {number} nbRecords
 * @param {(id:string)=>string} [nom]
 */
export function phraseBilan(cmp, nbRecords, nom = (id) => id) {
  if (nbRecords > 0) {
    return nbRecords === 1 ? "Un record personnel battu" : `${nbRecords} records personnels battus`;
  }
  if (!cmp || !cmp.comparable) return "Séance enregistrée";
  if (cmp.progres.length) {
    const p = cmp.progres[0];
    return `${nom(p.exerciceId)} : ${p.apres} kg, soit ${p.delta} kg de plus qu'il y a ${cmp.jours} j`;
  }
  if (cmp.delta.volume > 0) {
    return `${cmp.delta.volume.toLocaleString("fr-FR")} kg de volume en plus que la dernière fois`;
  }
  // Une séance plus légère n'est pas un échec : c'est souvent une récupération,
  // et le dire ainsi vaut mieux qu'un silence gêné ou qu'une fausse louange.
  return "Séance enregistrée — plus légère que la précédente";
}
