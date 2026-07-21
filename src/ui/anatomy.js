// @ts-check
/**
 * Carte musculaire SVG INTÉGRÉE (aucune image distante) — vues avant + arrière.
 * 100 % hors ligne, adaptée au thème (couleurs via variables CSS), et vraie
 * coloration par muscle (principal = rouge, secondaire = ambre) ou par
 * intensité (heatmap). Remplace l'ancienne planche wger (en ligne, fond clair).
 *
 * Silhouette stylisée : les régions musculaires portent un attribut `data-m`.
 */

/** Muscles « grands groupes » couverts par un exercice « corps entier ». */
const CORPS_ENTIER = ["pectoraux", "dorsaux", "quadriceps", "abdominaux", "fessiers", "epaules"];

/* Silhouette neutre (partagée avant/arrière) — tête, tronc, membres. */
const CORPS = `
  <circle cx="60" cy="17" r="12"/>
  <path d="M54 27 h12 v7 h-12 z"/>
  <path d="M32 42 Q60 33 88 42 L80 95 Q60 102 40 95 Z"/>
  <path d="M42 93 L78 93 L73 118 Q60 124 47 118 Z"/>
  <rect x="20" y="42" width="12" height="42" rx="6"/>
  <rect x="88" y="42" width="12" height="42" rx="6"/>
  <rect x="18.5" y="83" width="11" height="34" rx="5.5"/>
  <rect x="90.5" y="83" width="11" height="34" rx="5.5"/>
  <rect x="45" y="112" width="14" height="62" rx="7"/>
  <rect x="61" y="112" width="14" height="62" rx="7"/>
  <rect x="46" y="172" width="13" height="58" rx="6"/>
  <rect x="61" y="172" width="13" height="58" rx="6"/>
  <ellipse cx="52" cy="233" rx="8" ry="5"/><ellipse cx="68" cy="233" rx="8" ry="5"/>`;

/* Régions musculaires — vue AVANT. */
const AVANT = {
  epaules: `<ellipse cx="33" cy="45" rx="9" ry="8"/><ellipse cx="87" cy="45" rx="9" ry="8"/>`,
  pectoraux: `<path d="M45 50 Q60 47 60 60 Q59 66 50 66 Q43 66 43 57 Z"/><path d="M75 50 Q60 47 60 60 Q61 66 70 66 Q77 66 77 57 Z"/>`,
  biceps: `<ellipse cx="26" cy="60" rx="5.5" ry="11"/><ellipse cx="94" cy="60" rx="5.5" ry="11"/>`,
  avant_bras: `<ellipse cx="24" cy="99" rx="5" ry="13"/><ellipse cx="96" cy="99" rx="5" ry="13"/>`,
  abdominaux: `<rect x="52" y="68" width="16" height="33" rx="5"/>`,
  quadriceps: `<ellipse cx="52" cy="140" rx="8.5" ry="26"/><ellipse cx="68" cy="140" rx="8.5" ry="26"/>`,
};
/* Régions musculaires — vue ARRIÈRE. */
const ARRIERE = {
  trapezes: `<path d="M48 38 L72 38 L64 58 L56 58 Z"/>`,
  dorsaux: `<path d="M46 56 L58 60 L55 84 L47 78 Z"/><path d="M74 56 L62 60 L65 84 L73 78 Z"/>`,
  triceps: `<ellipse cx="26" cy="60" rx="5.5" ry="11"/><ellipse cx="94" cy="60" rx="5.5" ry="11"/>`,
  fessiers: `<ellipse cx="52" cy="114" rx="9" ry="9"/><ellipse cx="68" cy="114" rx="9" ry="9"/>`,
  ischios: `<ellipse cx="52" cy="150" rx="8" ry="20"/><ellipse cx="68" cy="150" rx="8" ry="20"/>`,
  mollets: `<ellipse cx="52" cy="196" rx="6.5" ry="16"/><ellipse cx="68" cy="196" rx="6.5" ry="16"/>`,
};

/** Une vue SVG (avant/arrière) : silhouette + muscles colorés par `couleur(m)`. */
function vueSVG(front, couleur, label) {
  const regions = front ? AVANT : ARRIERE;
  const muscles = Object.entries(regions).map(([m, shapes]) => {
    const c = couleur(m);
    const op = c.op != null ? ` fill-opacity="${c.op}"` : "";
    return `<g data-m="${m}" fill="${c.fill}"${op}>${shapes}</g>`;
  }).join("");
  return `<div class="anview"><svg class="bodysvg" viewBox="0 0 120 250" role="img" aria-label="${label}">`
    + `<g class="body" fill="var(--anat-body)" stroke="var(--anat-line)" stroke-width="1">${CORPS}</g>`
    + `${muscles}</svg><span class="lab">${front ? "Avant" : "Arrière"}</span></div>`;
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
    if (P.has(m)) return { fill: "#EF4444" };
    if (S.has(m)) return { fill: "#F59E0B" };
    return { fill: "var(--anat-muscle)" };
  };
  return `<div class="anat2">${vueSVG(1, couleur, "Vue avant")}${vueSVG(0, couleur, "Vue arrière")}</div>`;
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
  for (const m of [...Object.keys(AVANT), ...Object.keys(ARRIERE)]) base[m] = get(m);
  const global = get("corps_entier");
  if (global > 0) for (const m of CORPS_ENTIER) base[m] = Math.max(base[m] || 0, global);

  const couleur = (m) => {
    const i = Math.max(0, Math.min(1, base[m] || 0));
    if (i > 0) return { fill: "#EF4444", op: (0.28 + 0.72 * i).toFixed(2) };
    return { fill: "var(--anat-muscle)" };
  };
  return `<div class="anat2">${vueSVG(1, couleur, "Vue avant")}${vueSVG(0, couleur, "Vue arrière")}</div>`;
}
