// @ts-check
/**
 * ICÔNES — tout ce qui dessine un pictogramme, au même endroit.
 *
 * Ces tables vivaient dispersées dans `src/ui/app.js`, entre deux écrans, à
 * 2 800 lignes d'écart pour certaines. Deux conséquences concrètes, toutes deux
 * rencontrées :
 *
 *   · une table lisait `IC` déclaré 200 lignes plus bas — zone morte temporelle
 *     d'un `const`, ReferenceError au chargement, application qui ne démarre
 *     plus. Il fallait une indirection pour contourner l'ordre du fichier ;
 *   · deux icônes fantômes (`IC.copy`, la classe `mi-on`) ont vécu sans que rien
 *     ne le signale, parce que rien ne réunissait le sujet.
 *
 * Ici l'ordre de déclaration est local et lisible, et une icône manquante se
 * voit au premier coup d'œil.
 *
 * Module PUR : aucune dépendance, aucun accès au DOM. Il ne rend que des chaînes
 * SVG — c'est l'interface qui les insère.
 */

/* Icônes SVG (style Lucide, trait cohérent) — remplacent les emoji sur les
   éléments clés pour un rendu « app pro », d'après la maquette Claude Design. */
export const IC = {
  dumbbell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7v10M18 7v10M4 9v6M20 9v6M6 12h12"/></svg>`,
  flame: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1.5 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2.5-5 .5 2.5 2.5 2.5 2.5 2.5 0-3.5-2.5-4.5-2-7.5z"/></svg>`,
  bars: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4v16l14-8z"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg>`,
  coffee: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4zM6 1v2M10 1v2M14 1v2"/></svg>`,
  utensils: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7a4 4 0 0 0 8 0V2M7 2v20M21 15V2a5 5 0 0 0-3 5v6a2 2 0 0 0 2 2h1z"/></svg>`,
  apple: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7c1-3 4-4 6-3 0 3-2 4-4 4M12 7c-1.5-2-4-2.5-6-1-1 3 1 13 6 13s7-10 6-13c-2-1.5-4.5-1-6 1z"/></svg>`,
  plate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M5 11l1 8h12l1-8"/></svg>`,
  fork: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7a4 4 0 0 0 8 0V2M7 2v20"/></svg>`,
  droplet: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M6 4h12v4a6 6 0 0 1-12 0zM6 4H3v2a3 3 0 0 0 3 3M18 4h3v2a3 3 0 0 1-3 3"/></svg>`,
  activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,
  repeat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
  swap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3l4 4-4 4M20 7H8M8 21l-4-4 4-4M4 17h12"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  cornerDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l5 5-5 5M20 15H9a5 5 0 0 1-5-5V4"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>`,
  cross: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v8M8 12h8"/><circle cx="12" cy="12" r="9"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>`,
  forward: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 4 10 8-10 8zM19 5v14"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 20-10-8 10-8zM5 5v14"/></svg>`,
  star: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.9 6.1 21l1.2-6.5L2.5 9.9 9.1 9z"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  balance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M7 21h10M3 8l4-3 4 3M3 8a2 2 0 0 0 4 0M13 8l4-3 4 3M13 8a2 2 0 0 0 4 0M5 5h14"/></svg>`,
  barreLourde: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20M5 6v12M8 8v8M16 8v8M19 6v12"/></svg>`,
  coeur: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1z"/><path d="M3.5 12.5H8l1.5-3 2 5 1.5-2.5h6"/></svg>`,
  etirement: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><path d="M12 6v6M12 12l-4 6M12 12l4 6M4 9l8 2 8-2"/></svg>`,
  cible: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>`,
  wind: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2M17.7 7.8A2.5 2.5 0 1 1 19.5 12H2"/></svg>`,
};
/** Petite icône SVG en ligne (repas, etc.), teintée par classe. */
export const mi = (svg, cls) => `<span class="mi ${cls}">${svg}</span>`;

/** Icône de matériel, pour identifier un exercice d'un coup d'œil. */
export const IC_MATOS = {
  barre: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12h18M6 8v8M18 8v8M2 10v4M22 10v4"/></svg>`,
  halteres: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 7v10M18 7v10M4 9v6M20 9v6M6 12h12"/></svg>`,
  poulie: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="2.5"/><path d="M12 7.5V15M8 19h8M9 15h6v4H9z"/></svg>`,
  machine: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="12" rx="2"/><path d="M8 20h8M12 16v4M8 8h8M8 12h5"/></svg>`,
  corps: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="4.5" r="2.5"/><path d="M12 7v7M7 9l5 2 5-2M9 21l3-7 3 7"/></svg>`,
};

/**
 * Matériel → famille d'icône SVG (rangée « Matériel requis »).
 *
 * C'était une table d'emoji : 🧍 🏋️ 🔔 🎚️ 🎗️ ⚙️ 🏗️ 🪑 🗄️ 🚪 🪢 🏐 ⚽ 🧻 🏃 🚴 🚣.
 * Vingt pictogrammes de vingt styles différents, dépendants de la police du
 * système — le rendu changeait d'un téléphone à l'autre. Cinq familles SVG
 * suffisent à distinguer ce qui compte, et elles sont déjà dessinées
 * (`IC_MATOS`, utilisé par les vignettes du catalogue).
 */
export const EQUIPMENT_FAMILLE = {
  poids_du_corps: "corps", halteres: "halteres", kettlebell: "halteres",
  barre: "barre", barre_ez: "barre", banc: "barre", rack: "barre", barre_traction: "barre",
  poulie: "poulie", elastiques: "poulie", trx: "poulie",
  machine_guidee: "machine", machine_leviers: "machine", smith: "machine",
  tapis_course: "machine", velo: "machine", rameur: "machine",
  medecine_ball: "corps", swiss_ball: "corps", rouleau: "corps",
};
/** SVG du matériel, avec un repli explicite plutôt qu'un carré vide. */
export function iconeMateriel(cle) {
  return IC_MATOS[EQUIPMENT_FAMILLE[cle] || "corps"] || IC_MATOS.corps;
}

/**
 * Icône de niveau : quatre barres croissantes, dont `n` sont pleines.
 *
 * Les quatre emoji précédents — 🌱 🙂 📈 🥇 — étaient quatre métaphores sans
 * rapport entre elles : une pousse, un visage, un graphique, une médaille. On ne
 * lisait aucune progression. Quatre barres qui montent la disent d'un coup
 * d'œil, et restent dans le langage graphique du reste de l'app.
 *
 * @param {number} n  1 → 4
 */
export function niveauIcone(n) {
  const plein = Math.max(1, Math.min(4, Math.round(Number(n) || 1)));
  const barres = [0, 1, 2, 3].map((i) => {
    const haut = 5 + i * 4.5;
    const y = 20 - haut;
    const on = i < plein;
    return `<rect x="${3 + i * 5.2}" y="${y}" width="3.4" height="${haut}" rx="1.2"
      fill="${on ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.6" opacity="${on ? "1" : ".38"}"/>`;
  }).join("");
  return `<svg viewBox="0 0 24 24">${barres}</svg>`;
}

// Icônes SVG et non emoji : le design system proscrit l'emoji comme
// iconographie, et c'est le TOUT PREMIER écran de l'application.
// La table de NOMS reste : elle documente le lien objectif → icône sans dupliquer
// les SVG, et `goalIcons()` la résout à l'appel.
export const GOAL_ICONES = {
  prise_muscle: "dumbbell", perte_graisse: "flame", recomposition: "balance",
  force: "barreLourde", endurance: "coeur", remise_forme: "spark",
  mobilite: "etirement", prepa_physique: "cible",
};
/** Table objectif → SVG, construite à l'appel (donc après l'init de `IC`). */
export function goalIcons() {
  const out = {};
  for (const [k, nom] of Object.entries(GOAL_ICONES)) out[k] = IC[nom] || "";
  return out;
}

export const LEVEL_ICONS = {
  grand_debutant: niveauIcone(1), debutant: niveauIcone(2),
  intermediaire: niveauIcone(3), avance: niveauIcone(4),
};
