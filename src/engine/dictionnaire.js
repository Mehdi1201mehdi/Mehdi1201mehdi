// @ts-check
/**
 * Moteur du dictionnaire fitness : recherche, filtres, regroupement, liens.
 *
 * Fonctions PURES : elles reçoivent la liste des termes (src/data/dictionnaire.js)
 * et ne touchent ni au DOM ni au stockage. La vue se contente d'afficher.
 */

/**
 * Minuscule, sans accents, sans ponctuation superflue. « Échauffement »,
 * « echauffement » et « ÉCHAUFFEMENT » deviennent la même clé : on tape comme
 * on veut sur un clavier de téléphone.
 * @param {string} s
 */
export function normaliser(s) {
  return String(s == null ? "" : s)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[’'`]/g, " ")
    .replace(/[^a-z0-9%+]+/g, " ")
    .trim();
}

/**
 * Score de pertinence d'un terme pour une requête (0 = ne correspond pas).
 * Ordre voulu : le nom exact, puis un nom qui commence par la requête, puis un
 * synonyme (souvent l'anglais tapé en salle : « PR », « drop set »), puis le
 * texte de la définition. Tous les mots de la requête doivent être trouvés.
 *
 * @param {{terme:string, syn?:string[], def?:string, expl?:string}} t
 * @param {string} q  requête brute
 */
export function scoreTerme(t, q) {
  const nq = normaliser(q);
  if (!nq) return 1;
  const nom = normaliser(t.terme);
  const syns = (t.syn || []).map(normaliser);
  const texte = normaliser(`${t.def || ""} ${t.expl || ""}`);
  if (nom === nq) return 100;
  if (syns.includes(nq)) return 90;
  if (nom.startsWith(nq)) return 80;
  if (syns.some((s) => s.startsWith(nq))) return 70;
  const mots = nq.split(" ").filter(Boolean);
  const dans = (champ) => mots.every((m) => champ.includes(m));
  if (dans(nom)) return 60;
  if (syns.some(dans)) return 50;
  if (dans(texte)) return 20;
  return 0;
}

/**
 * Recherche et filtre.
 * @template {{id:string, terme:string, cat:string, syn?:string[], def?:string, expl?:string}} T
 * @param {T[]} termes
 * @param {{q?:string, cat?:string, favoris?:string[], seulsFavoris?:boolean}} [opts]
 * @returns {T[]}  triés par pertinence si une requête est saisie, sinon alphabétiquement
 */
export function chercher(termes, opts = {}) {
  const { q = "", cat = "", favoris = [], seulsFavoris = false } = opts;
  const fav = new Set(favoris);
  let res = (termes || []).filter((t) => (!cat || t.cat === cat) && (!seulsFavoris || fav.has(t.id)));
  if (normaliser(q)) {
    return res
      .map((t) => ({ t, s: scoreTerme(t, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || comparer(a.t.terme, b.t.terme))
      .map((x) => x.t);
  }
  return res.slice().sort((a, b) => comparer(a.terme, b.terme));
}

/** Tri alphabétique français (É rangé avec E, nombres naturels). */
export function comparer(a, b) {
  return String(a).localeCompare(String(b), "fr", { sensitivity: "base", numeric: true });
}

/**
 * Lettre d'index d'un terme : première lettre sans accent, « # » pour les
 * chiffres. Sert aux intertitres A, B, C… de la liste.
 * @param {string} terme
 */
export function lettre(terme) {
  const c = normaliser(terme).charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}

/**
 * Regroupe une liste DÉJÀ TRIÉE alphabétiquement par lettre initiale.
 * @template {{terme:string}} T
 * @param {T[]} termes
 * @returns {{lettre:string, termes:T[]}[]}
 */
export function grouperParLettre(termes) {
  /** @type {{lettre:string, termes:T[]}[]} */
  const out = [];
  for (const t of termes || []) {
    const l = lettre(t.terme);
    const dernier = out[out.length - 1];
    if (dernier && dernier.lettre === l) dernier.termes.push(t);
    else out.push({ lettre: l, termes: [t] });
  }
  return out;
}

/**
 * Termes liés d'un terme, résolus et dans l'ordre déclaré. Les identifiants
 * inconnus sont ignorés plutôt que d'afficher un lien mort.
 * @template {{id:string}} T
 * @param {{voir?:string[]}} t
 * @param {Record<string, T>} parId
 * @returns {T[]}
 */
export function termesLies(t, parId) {
  return (t && t.voir ? t.voir : []).map((id) => parId[id]).filter(Boolean);
}

/**
 * Nombre de termes par catégorie (pour les compteurs des pastilles).
 * @param {{cat:string}[]} termes
 * @returns {Record<string, number>}
 */
export function compterParCategorie(termes) {
  /** @type {Record<string, number>} */
  const n = {};
  for (const t of termes || []) n[t.cat] = (n[t.cat] || 0) + 1;
  return n;
}

/**
 * Terme « du jour » : stable sur une journée, différent d'un jour à l'autre,
 * sans aléatoire (donc testable et identique au rechargement).
 * @template T
 * @param {T[]} termes
 * @param {string} jourISO  "YYYY-MM-DD"
 * @returns {T|null}
 */
export function termeDuJour(termes, jourISO) {
  if (!termes || !termes.length) return null;
  let h = 0;
  for (const c of String(jourISO)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return termes[h % termes.length];
}
