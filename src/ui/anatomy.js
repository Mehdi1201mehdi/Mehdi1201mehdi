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
 * @param {Iterable<string>} muscles  muscles à mettre en avant
 * @param {"front"|"back"} [view]
 */
export function miniSilhouette(muscles, view = "front") {
  const set = new Set(muscles || []);
  if (set.has("corps_entier")) CORPS_ENTIER.forEach((m) => set.add(m));
  const A = ANATOMY[view];
  const outline = `<path d="${A.outline}" fill="var(--anat-body)"/>`;
  const mus = Object.entries(A.groups).map(([m, paths]) =>
    `<g fill="${set.has(m) ? "var(--anat-primary)" : "var(--anat-muscle)"}">${paths.map((d) => `<path d="${d}"/>`).join("")}</g>`).join("");
  const neutral = A.neutral.map((d) => `<path d="${d}" fill="var(--anat-body)"/>`).join("");
  return `<svg class="mini-silhouette" viewBox="${VIEWBOX[view]}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${outline}${mus}${neutral}</svg>`;
}

/**
 * Planche des muscles ciblés (principal = rouge, secondaire = ambre).
 * @param {Iterable<string>} principaux
 * @param {Iterable<string>} secondaires
 */
export function muscleDiagram(principaux, secondaires) {
  const P = new Set(principaux), S = new Set(secondaires);
  if (P.has("corps_entier")) CORPS_ENTIER.forEach((m) => P.add(m));
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
