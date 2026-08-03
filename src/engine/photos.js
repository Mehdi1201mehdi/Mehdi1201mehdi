// @ts-check
/**
 * PHOTOS DE PROGRESSION — ce que la balance ne dit pas.
 *
 * Le poids stagne pendant des semaines alors que le corps change. C'est le
 * moment exact où on arrête. Deux photos à trois mois d'écart règlent la
 * question mieux que n'importe quelle courbe — c'est la seule mesure qui montre
 * la recomposition corporelle.
 *
 * Ce module est PUR : il manipule des FICHES (date, note, dimensions), jamais
 * les images elles-mêmes. Les images vivent dans IndexedDB (`store/db.js`), les
 * fiches dans l'état applicatif — c'est ce qui permet de les sauvegarder,
 * trier et comparer sans jamais charger un octet de pixel.
 *
 * Trois décisions :
 *
 *   1. LES IMAGES NE PARTENT NULLE PART. Aucune fonction ici, ni dans la couche
 *      de stockage, n'ouvre de connexion. Une photo de son corps est la donnée
 *      la plus intime qu'une app de musculation puisse détenir.
 *   2. LA COMPARAISON PAR DÉFAUT EST LA PLUS PARLANTE : la plus ancienne contre
 *      la plus récente. Pas deux photos prises la même semaine, où il n'y a rien
 *      à voir et où l'on conclut que ça ne sert à rien.
 *   3. L'APP DIT QUE LES PHOTOS NE SONT PAS DANS LA SAUVEGARDE JSON. Les croire
 *      à l'abri et les perdre est pire que de ne pas en prendre.
 */

/** Poses proposées. Trois angles suffisent : au-delà, on ne les refait pas. */
export const POSES = [
  { cle: "face", nom: "De face", aide: "Bras le long du corps, détendu" },
  { cle: "dos", nom: "De dos", aide: "Même position, mêmes repères au sol" },
  { cle: "profil", nom: "De profil", aide: "Côté droit, bras relâché" },
];

/** Côté le plus long d'une image enregistrée, en pixels. */
export const COTE_MAX = 1280;

/** Qualité JPEG. 0,72 : au-delà le fichier double sans gain visible sur une
 *  photo de corps ; en dessous, les dégradés de peau se cassent. */
export const QUALITE = 0.72;

/** Au-delà, l'app prévient : le quota du navigateur n'est pas infini. */
export const ALERTE_OCTETS = 60 * 1024 * 1024;

/** Date du jour au format ISO court, sans dépendre du fuseau. */
function aujourdHui() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Fiche d'une nouvelle photo. L'identifiant contient la date : les fiches
 * restent lisibles à l'œil dans un export, et deux photos prises la même
 * seconde ne peuvent pas se écraser (suffixe aléatoire).
 *
 * @param {{date?:string, pose?:string, note?:string, poidsKg?:number,
 *          largeur?:number, hauteur?:number, octets?:number}} [opts]
 */
export function nouvellePhoto(opts = {}) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(opts.date || "")) ? String(opts.date) : aujourdHui();
  const pose = POSES.some((p) => p.cle === opts.pose) ? String(opts.pose) : "face";
  const poids = Number(opts.poidsKg);
  return {
    id: `ph_${date}_${Math.random().toString(36).slice(2, 8)}`,
    date, pose,
    note: String(opts.note || "").slice(0, 120),
    poidsKg: poids > 20 && poids < 400 ? Math.round(poids * 10) / 10 : null,
    largeur: Math.max(0, Math.round(Number(opts.largeur) || 0)),
    hauteur: Math.max(0, Math.round(Number(opts.hauteur) || 0)),
    octets: Math.max(0, Math.round(Number(opts.octets) || 0)),
  };
}

/**
 * Dimensions de destination pour une image, côté long ramené à `max`.
 *
 * Une photo de téléphone fait 4000 × 3000 et pèse 5 Mo. Enregistrée telle
 * quelle, dix photos suffisent à saturer le quota du navigateur. Ramenée à
 * 1280 px de côté long, elle pèse ~200 ko et reste largement assez nette pour
 * comparer deux silhouettes.
 *
 * Une image DÉJÀ plus petite que `max` n'est jamais agrandie : ça n'ajoute
 * aucun détail et multiplie le poids du fichier.
 *
 * @param {number} largeur
 * @param {number} hauteur
 * @param {number} [max]
 * @returns {{largeur:number, hauteur:number}}
 */
export function dimensionsCibles(largeur, hauteur, max = COTE_MAX) {
  const l = Number(largeur), ha = Number(hauteur);
  const m = Number(max) > 0 ? Number(max) : COTE_MAX;
  if (!(l > 0) || !(ha > 0)) return { largeur: 0, hauteur: 0 };
  const cote = Math.max(l, ha);
  if (cote <= m) return { largeur: Math.round(l), hauteur: Math.round(ha) };
  const k = m / cote;
  // `max(1, …)` : une image très allongée ne doit pas voir son petit côté
  // arrondi à zéro, ce qui produirait un canevas invalide.
  return { largeur: Math.max(1, Math.round(l * k)), hauteur: Math.max(1, Math.round(ha * k)) };
}

/** Fiches triées de la plus ancienne à la plus récente. Ne modifie pas l'entrée. */
export function trierPhotos(photos) {
  return (Array.isArray(photos) ? photos.filter((p) => p && p.id) : [])
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.id).localeCompare(String(b.id)));
}

/** Nombre de jours entre deux dates ISO (valeur absolue, 0 si illisible). */
export function ecartJours(a, b) {
  const da = Date.parse(String(a) + "T12:00:00"), db = Date.parse(String(b) + "T12:00:00");
  if (!Number.isFinite(da) || !Number.isFinite(db)) return 0;
  return Math.round(Math.abs(db - da) / 864e5);
}

/**
 * Couple à comparer par défaut, pour une pose donnée.
 *
 * La plus ancienne contre la plus récente : c'est l'écart maximal disponible,
 * donc le seul qui montre quelque chose. Proposer deux photos de la même semaine
 * ferait conclure que la fonction ne sert à rien.
 *
 * On ne compare QUE des photos de la même pose : une photo de face contre une de
 * dos ne prouve rien.
 *
 * @param {any[]} photos
 * @param {string} [pose]
 * @returns {{avant:any, apres:any, jours:number, deltaPoids:number|null}|null}
 */
export function paireComparaison(photos, pose = "face") {
  const l = trierPhotos(photos).filter((p) => p.pose === pose);
  if (l.length < 2) return null;
  const avant = l[0], apres = l[l.length - 1];
  const dp = avant.poidsKg != null && apres.poidsKg != null
    ? Math.round((apres.poidsKg - avant.poidsKg) * 10) / 10
    : null;
  return { avant, apres, jours: ecartJours(avant.date, apres.date), deltaPoids: dp };
}

/**
 * Poids du corps le plus proche d'une date, pris dans le suivi existant.
 *
 * Rattacher le poids à la photo évite de le ressaisir, et surtout : une photo
 * sans poids ne permet pas de dire « −4 kg entre les deux ». On refuse
 * au-delà de `toleranceJours` — un poids vieux d'un mois n'est pas celui du
 * jour de la photo, et l'afficher serait un mensonge discret.
 *
 * @param {{date?:string, poidsKg?:number}[]} metrics
 * @param {string} date
 * @param {number} [toleranceJours]
 * @returns {number|null}
 */
export function poidsProche(metrics, date, toleranceJours = 7) {
  let meilleur = null, ecartMin = Infinity;
  for (const m of Array.isArray(metrics) ? metrics : []) {
    const p = Number(m && m.poidsKg);
    if (!(p > 20 && p < 400) || !m.date) continue;
    const e = ecartJours(String(m.date).slice(0, 10), date);
    if (e < ecartMin) { ecartMin = e; meilleur = Math.round(p * 10) / 10; }
  }
  return ecartMin <= Math.max(0, Number(toleranceJours) || 0) ? meilleur : null;
}

/**
 * Bilan de stockage : combien de photos, quel poids total, faut-il prévenir.
 * @param {any[]} photos
 */
export function resumeStockage(photos) {
  const l = trierPhotos(photos);
  const octets = l.reduce((a, p) => a + (Number(p.octets) || 0), 0);
  return {
    nombre: l.length,
    octets,
    taille: formaterOctets(octets),
    alerte: octets >= ALERTE_OCTETS,
  };
}

/** Taille lisible, à la française (espace insécable, virgule décimale). */
export function formaterOctets(octets) {
  const o = Math.max(0, Number(octets) || 0);
  if (o < 1024) return `${Math.round(o)} o`;
  if (o < 1024 * 1024) return `${Math.round(o / 1024)} ko`;
  const mo = o / (1024 * 1024);
  return `${(Math.round(mo * 10) / 10).toString().replace(".", ",")} Mo`;
}

/**
 * Fiches dont l'image a disparu du stockage, et images sans fiche.
 *
 * Les deux moitiés peuvent se désynchroniser : le navigateur peut vider
 * IndexedDB sous pression de stockage, ou une suppression peut échouer à
 * mi-chemin. Sans ce contrôle, l'app afficherait des vignettes cassées sans
 * jamais expliquer pourquoi.
 *
 * @param {any[]} photos  fiches
 * @param {string[]} cles identifiants réellement présents dans IndexedDB
 */
export function incoherences(photos, cles) {
  const presentes = new Set(Array.isArray(cles) ? cles.map(String) : []);
  const fiches = trierPhotos(photos);
  const ids = new Set(fiches.map((p) => String(p.id)));
  return {
    fichesSansImage: fiches.filter((p) => !presentes.has(String(p.id))).map((p) => p.id),
    imagesSansFiche: [...presentes].filter((k) => !ids.has(k)),
  };
}
