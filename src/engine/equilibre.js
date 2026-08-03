// @ts-check
/**
 * ÉQUILIBRE DU CORPS — ce qu'un total de volume ne montre jamais.
 *
 * L'écran Progrès sait dire combien on a soulevé et quels muscles sont vifs. Il
 * ne dit pas si l'on POUSSE deux fois plus qu'on ne TIRE — ce qui est la cause
 * la plus banale d'épaules douloureuses chez quelqu'un qui s'entraîne
 * sérieusement depuis un an.
 *
 * COMPTÉ EN SÉRIES, PAS EN KILOS. C'est la décision centrale de ce module.
 * Mesuré en volume, un soulevé de terre à 180 kg écrase vingt séries de tirage
 * horizontal, et l'app conclurait « bas du corps dominant » pour tout le monde,
 * tout le temps. Le nombre de séries reflète le TEMPS D'ENTRAÎNEMENT consacré à
 * chaque patron — c'est de cela qu'on parle quand on parle d'équilibre.
 *
 * Quatre axes seulement, parce qu'au-delà ce sont des chiffres qu'on ne sait
 * plus interpréter :
 *
 *   · POUSSÉE / TIRAGE — le déséquilibre classique, celui des épaules.
 *   · HAUT / BAS — « ne saute pas le jour des jambes », mesuré.
 *   · GENOU / HANCHE — squats contre soulevés : quadriceps ou ischios.
 *   · TIRAGE HORIZONTAL / VERTICAL — dos épais contre dos large.
 *
 * L'app se tait sous un seuil de séries : juger un équilibre sur quatre séries
 * n'a aucun sens et décourage pour rien.
 */

/** Patrons de mouvement regroupés par famille. */
export const FAMILLES = {
  poussee: ["poussee_horizontale", "poussee_verticale", "extension_bras"],
  tirage: ["tirage_horizontal", "tirage_vertical", "flexion_bras"],
  haut: ["poussee_horizontale", "poussee_verticale", "extension_bras",
    "tirage_horizontal", "tirage_vertical", "flexion_bras"],
  bas: ["squat", "charniere_hanche", "fente", "isolation_jambe"],
  genou: ["squat", "fente", "isolation_jambe"],
  hanche: ["charniere_hanche"],
  tirageH: ["tirage_horizontal"],
  tirageV: ["tirage_vertical"],
};

/**
 * Sous ce nombre de séries cumulées sur un axe, on ne se prononce pas. Juger un
 * équilibre sur quatre séries n'a aucun sens.
 */
export const SEUIL_SERIES = 12;

/**
 * Ratio au-delà duquel on signale un déséquilibre. 1,3 : un tiers de séries en
 * plus d'un côté. En dessous, c'est la variation normale d'un programme qui
 * alterne — le signaler produirait une alerte permanente que plus personne ne
 * lit.
 */
export const SEUIL_RATIO = 1.3;

/** Les quatre axes, avec ce qu'ils signifient et ce qu'il faut faire. */
export const AXES = [
  { cle: "pousseeTirage", gauche: "poussee", droite: "tirage",
    nomG: "Poussée", nomD: "Tirage",
    quoi: "Trop de poussée pour trop peu de tirage tire les épaules vers l'avant.",
    corriger: "Ajoute des séries de rowing ou de tirage." },
  { cle: "hautBas", gauche: "haut", droite: "bas",
    nomG: "Haut du corps", nomD: "Bas du corps",
    quoi: "Le bas du corps porte la moitié de la masse musculaire.",
    corriger: "Ajoute une séance ou des séries de jambes." },
  { cle: "genouHanche", gauche: "genou", droite: "hanche",
    nomG: "Dominante genou", nomD: "Dominante hanche",
    quoi: "Squats et fentes travaillent les quadriceps ; soulevés et hip thrusts les ischios et fessiers.",
    corriger: "Ajoute du soulevé de terre roumain, du hip thrust ou du leg curl." },
  { cle: "tirageHV", gauche: "tirageH", droite: "tirageV",
    nomG: "Tirage horizontal", nomD: "Tirage vertical",
    quoi: "L'horizontal épaissit le dos, le vertical l'élargit.",
    corriger: "Alterne rowing et tractions dans la semaine." },
];

/**
 * Compte les séries par patron de mouvement sur une période.
 *
 * @param {any[]} logs
 * @param {(id:string)=>any} getExercise
 * @param {{depuis?:number}} [opts]
 * @returns {Record<string, number>}
 */
export function seriesParPatron(logs, getExercise, opts = {}) {
  const depuis = Number(opts.depuis) || 0;
  /** @type {Record<string, number>} */
  const out = {};
  for (const l of (Array.isArray(logs) ? logs : [])) {
    if (!l || !Array.isArray(l.exercices)) continue;
    if (depuis) {
      const t = Date.parse(String(l.date));
      if (Number.isFinite(t) && t < depuis) continue;
    }
    for (const e of l.exercices) {
      if (!e || !e.exerciceId) continue;
      let exo = null;
      try { exo = getExercise(e.exerciceId); } catch (err) { exo = null; }
      const p = exo && exo.patron;
      if (!p) continue;
      const n = Array.isArray(e.series) ? e.series.length : 0;
      if (n > 0) out[p] = (out[p] || 0) + n;
    }
  }
  return out;
}

/** Somme des séries d'une famille de patrons. */
function sommeFamille(parPatron, famille) {
  return (FAMILLES[famille] || []).reduce((a, p) => a + (Number(parPatron[p]) || 0), 0);
}

/**
 * @typedef {object} AxeResultat
 * @property {string} cle
 * @property {string} nomG
 * @property {string} nomD
 * @property {number} gauche          séries
 * @property {number} droite          séries
 * @property {number} part            part de gauche, 0 → 1
 * @property {boolean} mesurable
 * @property {"equilibre"|"gauche"|"droite"|null} desequilibre
 * @property {string} message
 */

/**
 * Analyse les quatre axes.
 *
 * @param {any[]} logs
 * @param {(id:string)=>any} getExercise
 * @param {{depuis?:number}} [opts]
 * @returns {{axes:AxeResultat[], mesurable:boolean, raison:string|null, seriesTotal:number}}
 */
export function equilibre(logs, getExercise, opts = {}) {
  const parPatron = seriesParPatron(logs, getExercise, opts);
  const seriesTotal = Object.values(parPatron).reduce((a, n) => a + n, 0);

  const axes = AXES.map((a) => {
    const g = sommeFamille(parPatron, a.gauche);
    const d = sommeFamille(parPatron, a.droite);
    const total = g + d;
    const base = { cle: a.cle, nomG: a.nomG, nomD: a.nomD, gauche: g, droite: d,
      part: total ? g / total : 0.5 };

    if (total < SEUIL_SERIES) {
      return { ...base, mesurable: false, desequilibre: /** @type {null} */ (null),
        message: `Encore ${SEUIL_SERIES - total} série${SEUIL_SERIES - total > 1 ? "s" : ""} pour se prononcer.` };
    }
    // Un côté à zéro est un déséquilibre total : le ratio est infini, on le dit
    // sans calculer.
    const alerte = (cote) => ({ ...base, mesurable: true,
      desequilibre: /** @type {"gauche"|"droite"} */ (cote), message: `${a.quoi} ${a.corriger}` });
    if (d === 0) return alerte("gauche");
    if (g === 0) return alerte("droite");

    const ratio = g / d;
    if (ratio >= SEUIL_RATIO) return alerte("gauche");
    if (1 / ratio >= SEUIL_RATIO) return alerte("droite");
    return { ...base, mesurable: true,
      desequilibre: /** @type {"equilibre"} */ ("equilibre"), message: "Réparti de façon équilibrée." };
  });

  const mesurable = axes.some((a) => a.mesurable);
  return {
    axes, mesurable, seriesTotal,
    raison: mesurable ? null
      : "Enregistre quelques séances de plus : l'équilibre se juge sur la répartition des séries, pas sur une séance.",
  };
}

/**
 * Résumé en une phrase, pour l'en-tête de la section.
 *
 * @param {{axes:AxeResultat[], mesurable:boolean}} r
 */
export function resumeEquilibre(r) {
  if (!r || !r.mesurable) return "";
  const soucis = r.axes.filter((a) => a.mesurable && a.desequilibre && a.desequilibre !== "equilibre");
  if (!soucis.length) return "Équilibré";
  return soucis.length === 1 ? "1 axe à corriger" : `${soucis.length} axes à corriger`;
}
