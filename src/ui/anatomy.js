// @ts-check
/**
 * Schéma anatomique ORIGINAL (SVG dessiné pour ce projet).
 * Vues avant + arrière. Muscles principaux en rouge, secondaires en orange,
 * autres en neutre. Chaque zone porte le nom du muscle (survol natif + tap).
 * Sert d'illustration permanente ET de repli quand aucune image n'existe.
 */
import { MUSCLE_LABELS } from "../models.js";

const ROUGE = "#E5484D";
const ORANGE = "#F5A524";
const NEUTRE = "#8B94A3";

/** Zones musculaires par vue : [muscle, "<shapes/>"] (symétrie incluse). */
const FRONT = [
  ["epaules", `<ellipse cx="57" cy="70" rx="11" ry="10"/><ellipse cx="103" cy="70" rx="11" ry="10"/>`],
  ["pectoraux", `<path d="M63 74 q17 -8 17 6 q0 12 -17 10 q-4 -9 0 -16z"/><path d="M97 74 q-17 -8 -17 6 q0 12 17 10 q4 -9 0 -16z"/>`],
  ["biceps", `<ellipse cx="50" cy="100" rx="6" ry="15"/><ellipse cx="110" cy="100" rx="6" ry="15"/>`],
  ["avant_bras", `<ellipse cx="45" cy="138" rx="5" ry="16"/><ellipse cx="115" cy="138" rx="5" ry="16"/>`],
  ["abdominaux", `<rect x="71" y="92" width="18" height="34" rx="5"/>`],
  ["adducteurs", `<ellipse cx="80" cy="150" rx="5" ry="16"/>`],
  ["quadriceps", `<ellipse cx="71" cy="168" rx="9" ry="28"/><ellipse cx="89" cy="168" rx="9" ry="28"/>`],
];
const BACK = [
  ["trapezes", `<path d="M70 62 q10 -6 20 0 q-2 16 -10 20 q-8 -4 -10 -20z"/>`],
  ["epaules", `<ellipse cx="57" cy="70" rx="11" ry="10"/><ellipse cx="103" cy="70" rx="11" ry="10"/>`],
  ["dorsaux", `<path d="M64 82 q10 6 12 24 q-8 8 -14 2 q-4 -16 2 -26z"/><path d="M96 82 q-10 6 -12 24 q8 8 14 2 q4 -16 -2 -26z"/>`],
  ["triceps", `<ellipse cx="50" cy="100" rx="6" ry="15"/><ellipse cx="110" cy="100" rx="6" ry="15"/>`],
  ["avant_bras", `<ellipse cx="45" cy="138" rx="5" ry="16"/><ellipse cx="115" cy="138" rx="5" ry="16"/>`],
  ["lombaires", `<rect x="72" y="110" width="16" height="16" rx="4"/>`],
  ["fessiers", `<ellipse cx="72" cy="136" rx="10" ry="11"/><ellipse cx="88" cy="136" rx="10" ry="11"/>`],
  ["ischios", `<ellipse cx="71" cy="170" rx="8" ry="24"/><ellipse cx="89" cy="170" rx="8" ry="24"/>`],
  ["mollets", `<ellipse cx="71" cy="212" rx="7" ry="18"/><ellipse cx="89" cy="212" rx="7" ry="18"/>`],
];

/** Silhouette de base (tête, tronc, bras, jambes) en neutre clair. */
function silhouette() {
  return `<g fill="${NEUTRE}" opacity="0.16" style="pointer-events:none">
    <circle cx="80" cy="30" r="14"/><rect x="74" y="42" width="12" height="10"/>
    <rect x="60" y="52" width="40" height="60" rx="14"/>
    <rect x="44" y="60" width="12" height="86" rx="6"/><rect x="104" y="60" width="12" height="86" rx="6"/>
    <rect x="62" y="108" width="36" height="30" rx="8"/>
    <rect x="63" y="132" width="15" height="96" rx="7"/><rect x="82" y="132" width="15" height="96" rx="7"/>
  </g>`;
}

function couche(zones, primary, secondary) {
  return zones.map(([m, shapes]) => {
    const c = primary.has(m) ? ROUGE : secondary.has(m) ? ORANGE : NEUTRE;
    const o = primary.has(m) || secondary.has(m) ? 0.92 : 0.28;
    return `<g class="mz" data-muscle="${m}" fill="${c}" fill-opacity="${o}" style="cursor:pointer"><title>${MUSCLE_LABELS[m] || m}</title>${shapes}</g>`;
  }).join("");
}

/**
 * Construit le schéma (deux vues côte à côte).
 * @param {Iterable<string>} principaux
 * @param {Iterable<string>} secondaires
 */
export function bodySVG(principaux, secondaires) {
  const P = new Set(principaux), S = new Set(secondaires);
  return `<svg viewBox="0 0 340 250" style="width:100%;height:auto" role="img" aria-label="Muscles sollicités (vue avant et arrière)">
    <g transform="translate(0,6)">${silhouette()}${couche(FRONT, P, S)}
      <text x="80" y="248" text-anchor="middle" font-size="11" fill="var(--ink-soft)">Avant</text></g>
    <g transform="translate(180,6)">${silhouette()}${couche(BACK, P, S)}
      <text x="80" y="248" text-anchor="middle" font-size="11" fill="var(--ink-soft)">Arrière</text></g>
  </svg>`;
}
