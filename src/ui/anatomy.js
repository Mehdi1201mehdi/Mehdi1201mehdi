// @ts-check
/**
 * Carte musculaire SVG INTÉGRÉE — corps humain anatomique (vues avant + arrière).
 * Tracés SVG issus de react-muscle-highlighter (licence MIT), regroupés vers nos
 * 12 groupes musculaires FR. 100 % hors ligne, adapté au thème (variables CSS),
 * vraie coloration par muscle (principal = rouge, secondaire = ambre) ou par
 * intensité (heatmap). Aucune image distante.
 */
import { ANATOMY } from "../data/anatomy-paths.js";

const VIEWBOX = { front: "0 0 724 1448", back: "724 0 724 1448" };
/** Muscles « grands groupes » couverts par un exercice « corps entier ». */
const CORPS_ENTIER = ["pectoraux", "dorsaux", "quadriceps", "abdominaux", "fessiers", "epaules"];

/**
 * Muscles sans tracé propre, dessinés sur le groupe qui les porte réellement :
 * les abducteurs de hanche sont le moyen et le petit fessier.
 */
const ALIAS = { abducteurs: "fessiers" };

/**
 * Vue où chaque muscle se lit le mieux. Les trapèzes, les triceps et les
 * mollets existent dans les deux vues, mais de face on n'en voit qu'une
 * bordure : une vignette « Trapèzes » de face ne montrait presque rien.
 */
const VUE_PREFEREE = {
  pectoraux: "front", abdominaux: "front", biceps: "front", quadriceps: "front",
  adducteurs: "front", avant_bras: "front", epaules: "front",
  dorsaux: "back", lombaires: "back", trapezes: "back", triceps: "back",
  fessiers: "back", ischios: "back", mollets: "back",
};

/**
 * Boîtes englobantes [x, y, largeur, hauteur] de chaque groupe, mesurées une
 * fois avec `getBBox()` dans Chrome sur `anatomy-paths.js` (coordonnées des
 * tracés). Les recalculer si les tracés changent — un test vérifie qu'aucun
 * groupe ne manque.
 */
export const BOITES = {
  front: {
    corps: [49, 96, 630, 1255], pectoraux: [255, 317, 218, 118], abdominaux: [256, 417, 217, 299],
    biceps: [182, 406, 365, 87], triceps: [201, 385, 327, 129], trapezes: [284, 280, 160, 32],
    epaules: [195, 303, 339, 94], quadriceps: [241, 667, 246, 281], mollets: [251, 1008, 226, 224],
    avant_bras: [126, 498, 477, 188], adducteurs: [274, 647, 180, 251],
  },
  back: {
    corps: [769, 97, 630, 1255], trapezes: [1003, 297, 162, 176], epaules: [914, 311, 339, 87],
    dorsaux: [956, 323, 255, 263], triceps: [899, 382, 370, 153], avant_bras: [839, 518, 490, 170],
    fessiers: [976, 619, 214, 159], ischios: [962, 741, 243, 266], mollets: [970, 972, 227, 318],
    adducteurs: [1039, 784, 88, 79], lombaires: [984, 487, 199, 152],
  },
};

/** Marge autour du corps quand on recadre la silhouette entière. */
const MARGE_CORPS = 20;
/** Hauteur minimale d'un zoom : assez de corps autour pour s'y repérer. */
const ZOOM_HAUTEUR_MIN = 580;

/** Muscles réellement dessinables (alias et « corps entier » résolus). */
function resoudre(muscles) {
  const set = new Set();
  for (const m of muscles || []) {
    if (m === "corps_entier") CORPS_ENTIER.forEach((x) => set.add(x));
    else set.add(ALIAS[m] || m);
  }
  return set;
}

/**
 * Vue (face / dos) qui montre le mieux un ensemble de muscles. Chaque muscle
 * vote : 2 points pour sa vue préférée, 1 pour l'autre s'il y est visible.
 * Égalité → la vue du premier muscle (le plus important de la séance).
 * @param {Iterable<string>} muscles
 * @returns {"front"|"back"}
 */
export function vueIdeale(muscles) {
  let face = 0, dos = 0, premier = null;
  for (const m of resoudre(muscles)) {
    const pref = VUE_PREFEREE[m];
    if (!pref) continue;
    premier = premier || pref;
    if (BOITES.front[m]) face += pref === "front" ? 2 : 1;
    if (BOITES.back[m]) dos += pref === "back" ? 2 : 1;
  }
  if (dos === face) return premier || "front";
  return dos > face ? "back" : "front";
}

/**
 * Cadre (viewBox) d'une silhouette. Sans zoom : le corps entier, sans les
 * grandes marges vides du dessin d'origine. Avec zoom : la zone des muscles
 * ciblés, au format de la vignette (`ratio` = largeur / hauteur), avec assez
 * de corps autour pour reconnaître l'endroit.
 * @param {"front"|"back"} view
 * @param {Set<string>} set
 * @param {{zoom?: boolean, ratio?: number}} opts
 */
export function cadreSilhouette(view, set, opts = {}) {
  const [cx0, cy0, cw, ch] = BOITES[view].corps;
  const corps = [cx0 - MARGE_CORPS, cy0 - MARGE_CORPS, cw + 2 * MARGE_CORPS, ch + 2 * MARGE_CORPS];
  const boites = [...set].map((m) => BOITES[view][m]).filter(Boolean);
  if (!opts.zoom || !boites.length) return corps.map(Math.round).join(" ");

  const ratio = Number(opts.ratio) > 0 ? Number(opts.ratio) : 0.8;
  const x0 = Math.min(...boites.map((b) => b[0])), y0 = Math.min(...boites.map((b) => b[1]));
  const x1 = Math.max(...boites.map((b) => b[0] + b[2])), y1 = Math.max(...boites.map((b) => b[1] + b[3]));
  let hauteur = Math.max((y1 - y0) * 1.7, ZOOM_HAUTEUR_MIN);
  let largeur = hauteur * ratio;
  if ((x1 - x0) * 1.2 > largeur) { largeur = (x1 - x0) * 1.2; hauteur = largeur / ratio; }
  // Centré sur les muscles, puis ramené dans le corps : jamais de vide autour.
  const caler = (centre, taille, debut, longueur) => {
    if (taille >= longueur) return debut + (longueur - taille) / 2;
    return Math.min(Math.max(centre - taille / 2, debut), debut + longueur - taille);
  };
  const x = caler((x0 + x1) / 2, largeur, corps[0], corps[2]);
  const y = caler((y0 + y1) / 2, hauteur, corps[1], corps[3]);
  return [x, y, largeur, hauteur].map(Math.round).join(" ");
}

/** Une vue SVG (avant/arrière) : silhouette + parts neutres + muscles colorés. */
function vueSVG(view, couleur, label) {
  const A = ANATOMY[view];
  const outline = `<path d="${A.outline}" fill="var(--anat-body)" stroke="var(--anat-line)" stroke-width="3"/>`;
  const muscles = Object.entries(A.groups).map(([m, paths]) => {
    const c = couleur(m);
    const op = c.op != null ? ` fill-opacity="${c.op}"` : "";
    return `<g data-m="${m}" fill="${c.fill}"${op}>` + paths.map((d) => `<path d="${d}"/>`).join("") + `</g>`;
  }).join("");
  const neutral = A.neutral.map((d) => `<path d="${d}" fill="var(--anat-body)"/>`).join("");
  return `<div class="anview"><svg class="bodysvg" viewBox="${VIEWBOX[view]}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${label}">`
    + outline + muscles + neutral + `</svg><span class="lab">${view === "front" ? "Avant" : "Arrière"}</span></div>`;
}

/**
 * Mini-silhouette (une seule vue) pour illustrer une séance : muscles ciblés
 * en surbrillance. Sert de vignette sur les cartes de séance.
 *
 * Sans vue imposée, la silhouette se tourne d'elle-même du côté où les
 * muscles se voient : des dorsaux affichés de face ne surlignaient rien.
 * `zoom` recadre sur les muscles ciblés — pour les vignettes d'UN muscle, où
 * le corps entier réduisait la zone utile à quelques pixels.
 * @param {Iterable<string>} muscles  muscles à mettre en avant
 * @param {"front"|"back"|"auto"} [view]
 * @param {{zoom?: boolean, ratio?: number}} [opts]
 */
export function miniSilhouette(muscles, view = "auto", opts = {}) {
  const set = resoudre(muscles);
  const vue = view === "front" || view === "back" ? view : vueIdeale(set);
  const A = ANATOMY[vue];
  const outline = `<path d="${A.outline}" fill="var(--anat-body)"/>`;
  const mus = Object.entries(A.groups).map(([m, paths]) =>
    `<g fill="${set.has(m) ? "var(--anat-primary)" : "var(--anat-muscle)"}">${paths.map((d) => `<path d="${d}"/>`).join("")}</g>`).join("");
  const neutral = A.neutral.map((d) => `<path d="${d}" fill="var(--anat-body)"/>`).join("");
  const zoom = !!opts.zoom && set.size > 0;
  return `<svg class="mini-silhouette${zoom ? " zoom" : ""}" data-vue="${vue}" viewBox="${cadreSilhouette(vue, set, opts)}" preserveAspectRatio="xMidYMid ${zoom ? "slice" : "meet"}" aria-hidden="true">${outline}${mus}${neutral}</svg>`;
}

/**
 * Planche des muscles ciblés (principal = rouge, secondaire = ambre).
 * @param {Iterable<string>} principaux
 * @param {Iterable<string>} secondaires
 */
export function muscleDiagram(principaux, secondaires) {
  const P = resoudre(principaux), S = resoudre(secondaires);
  const couleur = (m) => {
    if (P.has(m)) return { fill: "var(--anat-primary)" };
    if (S.has(m)) return { fill: "var(--anat-secondary)" };
    return { fill: "var(--anat-muscle)" };
  };
  return `<div class="anat2">${vueSVG("front", couleur, "Vue avant")}${vueSVG("back", couleur, "Vue arrière")}</div>`;
}

/**
 * Carte de chaleur : colore chaque muscle selon son INTENSITÉ de travail (0→1).
 * @param {Record<string,number>|Map<string,number>} intensites  muscle → 0..1
 */
export function muscleHeatmap(intensites) {
  const get = (m) => {
    const x = intensites instanceof Map ? intensites.get(m) : intensites[m];
    return Number(x) || 0;
  };
  const base = {};
  for (const m of [...Object.keys(ANATOMY.front.groups), ...Object.keys(ANATOMY.back.groups)]) base[m] = get(m);
  const global = get("corps_entier");
  if (global > 0) for (const m of CORPS_ENTIER) base[m] = Math.max(base[m] || 0, global);

  const couleur = (m) => {
    const i = Math.max(0, Math.min(1, base[m] || 0));
    if (i > 0) return { fill: "var(--anat-primary)", op: (0.28 + 0.72 * i).toFixed(2) };
    return { fill: "var(--anat-muscle)" };
  };
  return `<div class="anat2">${vueSVG("front", couleur, "Vue avant")}${vueSVG("back", couleur, "Vue arrière")}</div>`;
}
