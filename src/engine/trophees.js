// @ts-check
/**
 * TROPHÉES — les jalons de long terme.
 *
 * L'application savait déjà mesurer la semaine et le mois (`defis.js`), mais
 * rien ne récompensait la DURÉE. Or c'est exactement ce qu'une application de
 * musculation doit soutenir : ce qui fait progresser, ce n'est pas la semaine
 * réussie, c'est la centième séance.
 *
 * Trois règles de conception :
 *
 *   1. UN TROPHÉE SE CALCULE, IL NE SE STOCKE PAS. Tout est dérivé de
 *      l'historique réel. Aucun état à sauvegarder, donc rien à corrompre, rien
 *      à re-synchroniser, et un import de sauvegarde retrouve exactement les
 *      mêmes trophées.
 *   2. LE PROCHAIN PALIER EST TOUJOURS VISIBLE, avec sa progression. Un trophée
 *      verrouillé sans chemin visible ne motive pas : il décourage.
 *   3. AUCUN PALIER INATTEIGNABLE. Le dernier de chaque famille reste à portée
 *      d'un pratiquant régulier sur deux ou trois ans, pas d'un professionnel.
 */

/**
 * @typedef {object} Palier
 * @property {number} seuil   valeur à atteindre
 * @property {string} nom     nom du palier
 */

/**
 * @typedef {object} Famille
 * @property {string} cle
 * @property {string} nom
 * @property {string} unite      libellé de l'unité, pour l'affichage
 * @property {string} quoi       ce que la famille récompense
 * @property {Palier[]} paliers  du plus petit au plus grand
 */

/**
 * Les cinq familles. Les seuils sont volontairement espacés : deux paliers trop
 * proches donnent l'impression de tourner en rond.
 * @type {Famille[]}
 */
export const FAMILLES = [
  {
    cle: "assiduite", nom: "Assiduité", unite: "séances",
    quoi: "le nombre total de séances enregistrées",
    paliers: [
      { seuil: 10, nom: "Débutant" }, { seuil: 25, nom: "Régulier" },
      { seuil: 50, nom: "Discipliné" }, { seuil: 100, nom: "Dédié" },
      { seuil: 250, nom: "Athlète" },
    ],
  },
  {
    cle: "serie", nom: "Régularité", unite: "semaines d'affilée",
    quoi: "les semaines consécutives avec au moins une séance",
    paliers: [
      { seuil: 2, nom: "Lancé" }, { seuil: 4, nom: "Constant" },
      { seuil: 12, nom: "Increvable" }, { seuil: 26, nom: "Inarrêtable" },
      { seuil: 52, nom: "Une année pleine" },
    ],
  },
  {
    cle: "volume", nom: "Volume", unite: "tonnes soulevées",
    quoi: "le tonnage cumulé (charge × répétitions)",
    paliers: [
      { seuil: 10, nom: "Première tonne" }, { seuil: 50, nom: "Charretier" },
      { seuil: 150, nom: "Déménageur" }, { seuil: 400, nom: "Grue" },
      { seuil: 1000, nom: "Mille tonnes" },
    ],
  },
  {
    cle: "records", nom: "Records", unite: "records personnels",
    quoi: "les charges maximales battues",
    paliers: [
      { seuil: 1, nom: "Premier record" }, { seuil: 10, nom: "Ça monte" },
      { seuil: 25, nom: "En force" }, { seuil: 50, nom: "Machine" },
      { seuil: 100, nom: "Centurion" },
    ],
  },
  {
    cle: "temps", nom: "Endurance", unite: "heures d'entraînement",
    quoi: "le temps total passé à s'entraîner",
    paliers: [
      { seuil: 5, nom: "Échauffé" }, { seuil: 25, nom: "Habitué" },
      { seuil: 75, nom: "Pilier" }, { seuil: 200, nom: "Vétéran" },
      { seuil: 500, nom: "Légende" },
    ],
  },
];

/** Numéro de la semaine ISO d'une date, sous forme comparable « année-semaine ». */
function cleSemaine(d) {
  const t = new Date(d.getTime());
  // Jeudi de la semaine courante : détermine l'année ISO sans ambiguïté.
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const debut = Date.UTC(t.getUTCFullYear(), 0, 1);
  const sem = Math.ceil(((t.getTime() - debut) / 864e5 + 1) / 7);
  return t.getUTCFullYear() * 100 + sem;
}

/**
 * Plus longue suite de semaines CONSÉCUTIVES contenant au moins une séance.
 *
 * On compte en semaines et non en jours : personne ne s'entraîne 52 jours
 * d'affilée, et un jalon impossible à atteindre ne récompense rien.
 *
 * @param {any[]} logs
 * @returns {number}
 */
export function meilleureSerieSemaines(logs) {
  const semaines = [...new Set((logs || [])
    .map((l) => Date.parse(l && l.date))
    .filter((t) => Number.isFinite(t))
    .map((t) => cleSemaine(new Date(t))))].sort((a, b) => a - b);
  if (!semaines.length) return 0;
  let max = 1, courant = 1;
  for (let i = 1; i < semaines.length; i++) {
    // Semaine suivante dans la même année, ou passage d'année.
    const a = semaines[i - 1], b = semaines[i];
    const consecutive = b === a + 1
      || (b % 100 === 1 && (a % 100 >= 52));
    courant = consecutive ? courant + 1 : 1;
    if (courant > max) max = courant;
  }
  return max;
}

/**
 * Valeurs brutes de chaque famille, à partir de l'historique.
 *
 * @param {any[]} logs
 * @param {number} [nbRecords] records déjà comptés ailleurs (évite un recalcul)
 * @returns {Record<string, number>}
 */
export function mesures(logs, nbRecords = 0) {
  const l = Array.isArray(logs) ? logs : [];
  let tonnage = 0, secondes = 0;
  for (const log of l) {
    secondes += Number(log && log.dureeSec) || 0;
    for (const ex of (log && log.exercices) || []) {
      for (const s of (ex && ex.series) || []) {
        const kg = Number(s && s.chargeKg), reps = Number(s && s.reps);
        if (kg > 0 && reps > 0) tonnage += kg * reps;
      }
    }
  }
  return {
    assiduite: l.length,
    serie: meilleureSerieSemaines(l),
    volume: tonnage / 1000,
    records: Math.max(0, Number(nbRecords) || 0),
    temps: secondes / 3600,
  };
}

/**
 * @typedef {object} Trophee
 * @property {string} famille
 * @property {string} familleNom
 * @property {number} rang        1 → 5
 * @property {string} nom
 * @property {number} seuil
 * @property {boolean} obtenu
 */

/**
 * @typedef {object} EtatFamille
 * @property {string} cle
 * @property {string} nom
 * @property {string} unite
 * @property {string} quoi
 * @property {number} valeur          valeur actuelle
 * @property {number} obtenus         nombre de paliers franchis
 * @property {Trophee[]} paliers
 * @property {Trophee|null} prochain  prochain palier, ou null si tout est pris
 * @property {number} progression     0 → 1 vers le prochain palier
 * @property {number} restant         ce qu'il reste à faire pour le prochain
 */

/**
 * État complet des trophées.
 *
 * @param {any[]} logs
 * @param {number} [nbRecords]
 * @returns {{familles:EtatFamille[], obtenus:number, total:number, dernier:Trophee|null}}
 */
export function trophees(logs, nbRecords = 0) {
  const v = mesures(logs, nbRecords);
  let obtenus = 0, total = 0;
  /** @type {Trophee|null} */
  let dernier = null;

  const familles = FAMILLES.map((f) => {
    const valeur = v[f.cle] || 0;
    const paliers = f.paliers.map((p, i) => {
      total++;
      const ok = valeur >= p.seuil;
      if (ok) obtenus++;
      const t = { famille: f.cle, familleNom: f.nom, rang: i + 1, nom: p.nom, seuil: p.seuil, obtenu: ok };
      // Le trophée à mettre en avant est celui du plus haut RANG, jamais du plus
      // haut seuil : « 12 semaines d'affilée » et « 10 séances » ne sont pas des
      // grandeurs comparables — pas plus que 12 tonnes et 12 heures. Seul le
      // rang (1 à 5) a le même sens d'une famille à l'autre.
      if (ok && (!dernier || t.rang > dernier.rang)) dernier = t;
      return t;
    });
    const prochain = paliers.find((p) => !p.obtenu) || null;
    const precedent = prochain && prochain.rang > 1 ? f.paliers[prochain.rang - 2].seuil : 0;
    const etendue = prochain ? prochain.seuil - precedent : 0;
    return {
      cle: f.cle, nom: f.nom, unite: f.unite, quoi: f.quoi,
      valeur: Math.round(valeur * 10) / 10,
      obtenus: paliers.filter((p) => p.obtenu).length,
      paliers, prochain,
      progression: prochain && etendue > 0
        ? Math.max(0, Math.min(1, (valeur - precedent) / etendue)) : 1,
      restant: prochain ? Math.max(0, Math.round((prochain.seuil - valeur) * 10) / 10) : 0,
    };
  });

  return { familles, obtenus, total, dernier };
}
