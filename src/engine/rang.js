// @ts-check
/**
 * RANG DE FORCE — « je suis où ? », sans personne à qui se comparer.
 *
 * Une application à classement répond à cette question avec les autres
 * utilisateurs. Coach Perso est mono-utilisateur : il n'y a pas d'autres. La
 * réponse vient donc des STANDARDS DE FORCE établis, exprimés en multiples du
 * poids de corps — les repères que tout pratiquant finit par connaître (« un
 * squat à deux fois son poids »).
 *
 * Quatre décisions de conception, toutes destinées à éviter que ça décourage :
 *
 *   1. LE NIVEAU SUIVANT EST TOUJOURS CHIFFRÉ. Jamais « tu es débutant » tout
 *      court : toujours « il te manque 12 kg pour intermédiaire ». Un verdict
 *      sans chemin ne sert à rien.
 *   2. ON NE JUGE QUE CE QU'ON A MESURÉ. Un mouvement jamais chargé n'apparaît
 *      pas. Aucun zéro, aucune case vide accusatrice.
 *   3. LE RANG GLOBAL EST UNE MOYENNE DES MOUVEMENTS CONNUS, pas le pire d'entre
 *      eux. Être faible au développé ne doit pas effacer un bon squat.
 *   4. CE SONT DES REPÈRES, PAS UNE VÉRITÉ. Les standards varient selon les
 *      sources ; l'interface doit le dire, comme elle le dit déjà pour le 1RM.
 */

/** Les cinq niveaux, du plus bas au plus haut. */
export const NIVEAUX = [
  { cle: "debutant", nom: "Débutant", quoi: "les premiers mois d'entraînement" },
  { cle: "novice", nom: "Novice", quoi: "la technique est acquise, les charges montent vite" },
  { cle: "intermediaire", nom: "Intermédiaire", quoi: "un ou deux ans d'entraînement sérieux" },
  { cle: "avance", nom: "Avancé", quoi: "plusieurs années de travail structuré" },
  { cle: "elite", nom: "Élite", quoi: "le niveau de la compétition" },
];

/**
 * Standards en MULTIPLES DU POIDS DE CORPS, par mouvement et par sexe.
 *
 * Ce sont les repères largement publiés dans la littérature d'entraînement de
 * force. Ils ne sont ni une norme officielle ni une mesure : deux sources
 * sérieuses divergent de 10 à 15 %. L'interface doit les présenter comme des
 * repères — c'est pourquoi `AVERTISSEMENT` accompagne toujours l'affichage.
 *
 * Les seuils sont ceux d'ENTRÉE dans chaque niveau (à partir du novice : le
 * débutant est le niveau par défaut, avant le premier seuil).
 *
 * @type {Record<string, {nom:string, H:number[], F:number[]}>}
 */
export const STANDARDS = {
  "squat-barre": { nom: "Squat", H: [1.0, 1.5, 2.0, 2.5], F: [0.8, 1.2, 1.6, 2.0] },
  "developpe-couche-barre": { nom: "Développé couché", H: [0.75, 1.0, 1.5, 2.0], F: [0.5, 0.7, 1.0, 1.4] },
  "souleve-terre-barre": { nom: "Soulevé de terre", H: [1.25, 1.75, 2.5, 3.0], F: [1.0, 1.4, 2.0, 2.5] },
  "rowing-barre": { nom: "Rowing", H: [0.7, 1.0, 1.35, 1.75], F: [0.5, 0.7, 1.0, 1.3] },
};

export const AVERTISSEMENT =
  "Repères indicatifs, exprimés en multiples du poids de corps. Les standards varient "
  + "d'une source à l'autre : ils situent un ordre de grandeur, ils ne mesurent rien.";

/**
 * Bornes de plausibilité d'un seuil personnalisé, en multiples du poids de
 * corps. En dessous de 0,1 × PC un seuil ne veut plus rien dire ; au-dessus de
 * 6 × PC on est au-delà des records du monde. Ce n'est pas de la méfiance
 * envers l'utilisateur : c'est ce qui évite qu'une faute de frappe (« 20 » au
 * lieu de « 2,0 ») bloque le rang à « débutant » sans explication.
 */
export const LIMITES = { min: 0.1, max: 6 };

/**
 * Valide une série de quatre seuils saisis à la main.
 *
 * Renvoie le tableau nettoyé, ou `null` si la saisie est inexploitable. Les
 * seuils DOIVENT être strictement croissants : sans ça, un niveau deviendrait
 * inatteignable — on franchirait le suivant avant lui.
 *
 * @param {unknown} v
 * @returns {number[]|null}
 */
export function validerSeuils(v) {
  if (!Array.isArray(v) || v.length !== 4) return null;
  const s = v.map((x) => Number(String(x).replace(",", ".")));
  for (let i = 0; i < 4; i++) {
    if (!Number.isFinite(s[i]) || s[i] < LIMITES.min || s[i] > LIMITES.max) return null;
    if (i > 0 && !(s[i] > s[i - 1])) return null;
  }
  return s;
}

/**
 * Standards réellement appliqués : les repères publiés, écrasés mouvement par
 * mouvement et colonne par colonne par ce que l'utilisateur a saisi.
 *
 * Une saisie invalide est IGNORÉE, pas rejetée bruyamment : le mouvement
 * retombe sur le repère publié. L'utilisateur garde toujours un rang.
 *
 * @param {Record<string, {H?:unknown, F?:unknown}>} [perso]
 * @returns {Record<string, {nom:string, H:number[], F:number[]}>}
 */
export function standardsEffectifs(perso) {
  /** @type {Record<string, {nom:string, H:number[], F:number[]}>} */
  const out = {};
  for (const [id, std] of Object.entries(STANDARDS)) {
    const p = perso && typeof perso === "object" ? perso[id] : null;
    out[id] = {
      nom: std.nom,
      H: (p && validerSeuils(p.H)) || std.H,
      F: (p && validerSeuils(p.F)) || std.F,
    };
  }
  return out;
}

/**
 * Ce mouvement est-il jugé sur des seuils saisis à la main ? L'interface doit
 * pouvoir le dire : un rang calculé sur ses propres chiffres n'a pas la même
 * valeur qu'un rang calculé sur la littérature.
 *
 * @param {Record<string, {H?:unknown, F?:unknown}>|null|undefined} perso
 * @param {string} id
 * @param {string} col  « H » ou « F »
 */
export function estSeuilPerso(perso, id, col) {
  const p = perso && typeof perso === "object" ? perso[id] : null;
  return !!(p && validerSeuils(col === "F" ? p.F : p.H));
}

/** Poids de corps exploitable, sinon null (on ne devine pas). */
function poids(profil) {
  const p = Number(profil && profil.poidsKg);
  return p > 20 && p < 400 ? p : null;
}

/** Colonne de standards à employer. « H » par défaut, comme le reste de l'app. */
function colonne(profil) {
  return (profil && profil.sexe) === "F" ? "F" : "H";
}

/**
 * Niveau atteint pour un ratio donné, et ce qu'il manque pour le suivant.
 *
 * @param {number} ratio    charge / poids de corps
 * @param {number[]} seuils quatre seuils d'entrée (novice → élite)
 * @returns {{rang:number, cle:string, nom:string, prochain:{nom:string, ratio:number}|null,
 *            progression:number}}
 */
export function niveauPourRatio(ratio, seuils) {
  const r = Number(ratio);
  const s = Array.isArray(seuils) ? seuils : [];
  if (!(r > 0) || s.length !== 4) {
    return { rang: 1, cle: NIVEAUX[0].cle, nom: NIVEAUX[0].nom, prochain: null, progression: 0 };
  }
  // rang 1 = débutant (sous le premier seuil), puis un rang par seuil franchi.
  let rang = 1;
  for (const seuil of s) { if (r >= seuil) rang++; }
  rang = Math.min(NIVEAUX.length, rang);
  const suivant = rang < NIVEAUX.length ? NIVEAUX[rang] : null;
  const seuilSuivant = rang <= s.length ? s[rang - 1] : null;
  const seuilPrecedent = rang >= 2 ? s[rang - 2] : 0;
  const etendue = seuilSuivant != null ? seuilSuivant - seuilPrecedent : 0;
  return {
    rang, cle: NIVEAUX[rang - 1].cle, nom: NIVEAUX[rang - 1].nom,
    prochain: suivant && seuilSuivant != null ? { nom: suivant.nom, ratio: seuilSuivant } : null,
    progression: etendue > 0 ? Math.max(0, Math.min(1, (r - seuilPrecedent) / etendue)) : 1,
  };
}

/**
 * @typedef {object} RangMouvement
 * @property {string} exerciceId
 * @property {string} nom
 * @property {number} kg          meilleur 1RM estimé
 * @property {number} ratio       kg / poids de corps
 * @property {number} rang        1 → 5
 * @property {string} niveau
 * @property {number} progression 0 → 1 vers le niveau suivant
 * @property {{nom:string, kg:number, manque:number}|null} prochain
 * @property {boolean} perso      jugé sur des seuils saisis à la main
 */

/**
 * Rang de force, mouvement par mouvement puis global.
 *
 * @param {{exerciceId:string, rm:number}[]} meilleures  sortie de `meilleuresSeries`
 * @param {{poidsKg?:number, sexe?:string}} profil
 * @param {Record<string, {H?:unknown, F?:unknown}>} [perso]  seuils saisis à la main
 * @returns {{mouvements:RangMouvement[], rang:number, niveau:string, mesurable:boolean,
 *            raison:string|null, perso:boolean}}
 */
export function rangForce(meilleures, profil, perso) {
  const pc = poids(profil);
  if (!pc) {
    return { mouvements: [], rang: 0, niveau: "", mesurable: false, perso: false,
      raison: "Renseigne ton poids de corps : les standards s'expriment en multiples de celui-ci." };
  }
  const col = colonne(profil);
  const table = standardsEffectifs(perso);
  const mouvements = [];
  for (const m of meilleures || []) {
    const std = table[m && m.exerciceId];
    const rm = Number(m && m.rm);
    if (!std || !(rm > 0)) continue;   // on ne juge que ce qu'on a mesuré
    const ratio = rm / pc;
    const n = niveauPourRatio(ratio, std[col]);
    mouvements.push({
      exerciceId: m.exerciceId, nom: std.nom,
      kg: Math.round(rm * 10) / 10,
      ratio: Math.round(ratio * 100) / 100,
      rang: n.rang, niveau: n.nom, progression: n.progression,
      perso: estSeuilPerso(perso, m.exerciceId, col),
      prochain: n.prochain
        ? { nom: n.prochain.nom, kg: Math.round(n.prochain.ratio * pc * 10) / 10,
          manque: Math.max(0, Math.round((n.prochain.ratio * pc - rm) * 10) / 10) }
        : null,
    });
  }
  if (!mouvements.length) {
    return { mouvements: [], rang: 0, niveau: "", mesurable: false, perso: false,
      raison: "Enregistre une série lourde sur un mouvement de base (squat, développé, soulevé de terre, rowing)." };
  }
  // Moyenne, jamais le minimum : être faible sur un mouvement ne doit pas
  // effacer les autres.
  const moyenne = mouvements.reduce((a, m) => a + m.rang, 0) / mouvements.length;
  const rang = Math.max(1, Math.min(NIVEAUX.length, Math.round(moyenne)));
  return { mouvements, rang, niveau: NIVEAUX[rang - 1].nom, mesurable: true, raison: null,
    perso: mouvements.some((m) => m.perso) };
}
