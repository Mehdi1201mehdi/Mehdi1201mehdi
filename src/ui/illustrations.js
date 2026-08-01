// @ts-check
/**
 * ILLUSTRATIONS D'ÉTAT VIDE — dessinées pour cette application.
 *
 * Un écran vide est un moment de conception, pas un accident. C'est souvent le
 * PREMIER écran qu'on voit : avant la première séance, il n'y a par définition
 * rien à afficher. Une icône grise dans un carré dit « il manque quelque chose ».
 * Une petite scène dessinée dit « voilà ce qui va apparaître ici ».
 *
 * Langage graphique, identique pour toutes :
 *   · cadre 120 × 96, aucune illustration ne dépasse
 *   · tracé uniquement, jamais d'aplat — cohérent avec l'iconographie de l'app
 *   · deux épaisseurs : 3 pour le SUJET, 2 pour le décor
 *   · une seule couleur d'accent pour le sujet, `--ink-soft` très atténué pour
 *     le décor : l'œil sait immédiatement où regarder
 *   · une ligne de sol sous chaque scène — sans elle, le dessin flotte
 *   · extrémités et jointures arrondies partout
 *
 * Ces illustrations remplacent les emojis 📈 et 📊 qui servaient d'images à deux
 * écrans : un emoji n'est pas une iconographie, il change de dessin selon le
 * téléphone et n'obéit ni au thème ni à la couleur d'accent.
 */

/** Dimensions communes. Toute illustration qui en sort est un défaut. */
export const CADRE = { largeur: 120, hauteur: 96 };

/** Épaisseurs autorisées : le sujet, puis le décor. */
export const TRAITS = { sujet: 3, decor: 2 };

const A = "var(--accent)";       // le sujet
const D = "var(--ink-soft)";     // le décor

/** Enveloppe commune : cadre, style de tracé, et la ligne de sol. */
function scene(corps, titre) {
  return `<svg class="illu" viewBox="0 0 ${CADRE.largeur} ${CADRE.hauteur}" role="img" aria-label="${titre}"
    fill="none" stroke-linecap="round" stroke-linejoin="round">
    <line x1="14" y1="84" x2="106" y2="84" stroke="${D}" stroke-width="${TRAITS.decor}" opacity=".28"/>
    ${corps}</svg>`;
}

/**
 * Chaque illustration est une fonction sans argument : on peut ainsi les
 * énumérer, les tester et les afficher côte à côte pour vérifier qu'elles
 * forment bien une famille.
 * @type {Record<string, {titre:string, dessin:() => string}>}
 */
export const ILLUSTRATIONS = {
  /* Une courbe qui monte, dont la fin reste à tracer : ce qui va se passer. */
  courbe: {
    titre: "Une courbe de progression à venir",
    dessin: () => scene(`
      <path d="M20 76 L20 20" stroke="${D}" stroke-width="${TRAITS.decor}" opacity=".4"/>
      <path d="M20 70 C34 70 38 52 50 48 C62 44 66 30 80 26"
            stroke="${A}" stroke-width="${TRAITS.sujet}"/>
      <path d="M80 26 L96 20" stroke="${A}" stroke-width="${TRAITS.sujet}"
            stroke-dasharray="4 5" opacity=".5"/>
      <circle cx="20" cy="70" r="3.5" fill="var(--surface)" stroke="${A}" stroke-width="${TRAITS.decor}"/>
      <circle cx="50" cy="48" r="3.5" fill="var(--surface)" stroke="${A}" stroke-width="${TRAITS.decor}"/>
      <circle cx="80" cy="26" r="4.5" fill="${A}" stroke="none"/>`, "Une courbe de progression à venir"),
  },

  /* Des barres de volume, la dernière encore vide : la prochaine séance. */
  volumes: {
    titre: "Des volumes d'entraînement à venir",
    dessin: () => scene(`
      <rect x="24" y="56" width="14" height="24" rx="4" stroke="${A}" stroke-width="${TRAITS.sujet}"/>
      <rect x="46" y="42" width="14" height="38" rx="4" stroke="${A}" stroke-width="${TRAITS.sujet}"/>
      <rect x="68" y="30" width="14" height="50" rx="4" stroke="${A}" stroke-width="${TRAITS.sujet}"/>
      <rect x="90" y="64" width="14" height="16" rx="4" stroke="${D}" stroke-width="${TRAITS.decor}"
            stroke-dasharray="4 4" opacity=".55"/>`, "Des volumes d'entraînement à venir"),
  },

  /* Une loupe posée sur du vide : on a cherché, il n'y a rien ici. */
  recherche: {
    titre: "Aucun résultat",
    dessin: () => scene(`
      <circle cx="52" cy="42" r="22" stroke="${A}" stroke-width="${TRAITS.sujet}"/>
      <path d="M68 58 L84 74" stroke="${A}" stroke-width="${TRAITS.sujet}"/>
      <path d="M43 42 L61 42" stroke="${D}" stroke-width="${TRAITS.decor}" opacity=".6"/>`, "Aucun résultat"),
  },

  /* Un plan dont les lignes attendent d'être remplies. */
  plan: {
    titre: "Un programme encore vide",
    dessin: () => scene(`
      <rect x="30" y="20" width="60" height="56" rx="8" stroke="${A}" stroke-width="${TRAITS.sujet}"/>
      <path d="M30 36 L90 36" stroke="${A}" stroke-width="${TRAITS.decor}"/>
      <path d="M44 14 L44 26 M76 14 L76 26" stroke="${A}" stroke-width="${TRAITS.sujet}"/>
      <path d="M42 50 L66 50 M42 62 L58 62" stroke="${D}" stroke-width="${TRAITS.decor}"
            stroke-dasharray="3 5" opacity=".7"/>`, "Un programme encore vide"),
  },

  /* Une assiette vide, avec ses couverts. Sans eux, le double ovale se lisait
     comme une cible ou un œil — pas comme un repas. */
  assiette: {
    titre: "Aucun aliment trouvé",
    dessin: () => scene(`
      <ellipse cx="62" cy="50" rx="26" ry="19" stroke="${A}" stroke-width="${TRAITS.sujet}"/>
      <ellipse cx="62" cy="50" rx="16" ry="11" stroke="${D}" stroke-width="${TRAITS.decor}" opacity=".5"/>
      <path d="M22 32 L22 52 M18 32 L18 40 M26 32 L26 40 M22 52 L22 70"
            stroke="${D}" stroke-width="${TRAITS.decor}" opacity=".8"/>
      <path d="M100 34 C104 40 104 48 100 52 L100 70" stroke="${D}" stroke-width="${TRAITS.decor}" opacity=".8"/>`,
    "Aucun aliment trouvé"),
  },
};

/**
 * Rend une illustration. Une clé inconnue ne rend RIEN plutôt qu'un carré vide
 * ou un point d'interrogation : mieux vaut une absence propre qu'un défaut.
 * @param {string} cle
 * @returns {string} HTML
 */
export function illustration(cle) {
  const i = ILLUSTRATIONS[cle];
  return i ? i.dessin() : "";
}
