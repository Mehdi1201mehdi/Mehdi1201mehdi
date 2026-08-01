// @ts-check
/**
 * ÉLÉMENTS PARTAGÉS (technique FLIP) — un titre ne disparaît pas puis
 * réapparaît : il SE DÉPLACE.
 *
 * Quand on démarre une séance, le nom qui trônait sur la carte d'accueil est le
 * même que celui qui coiffe l'écran de séance. Le faire disparaître d'un côté
 * pour le refaire apparaître de l'autre casse le lien : on ne sait plus si c'est
 * le même objet. Le faire voler d'une position à l'autre le dit sans un mot.
 *
 * Pourquoi FLIP et pas les View Transitions natives : celles-ci photographient
 * TOUTE la page avant et après, ce qui coûtait 136 ms par navigation sur un
 * téléphone d'entrée de gamme (mesuré, puis retiré). FLIP ne touche qu'aux
 * éléments désignés et n'anime qu'une `transform` — le compositeur fait tout le
 * travail, la mise en page n'est jamais recalculée.
 *
 * Comment ça marche, en quatre temps :
 *   First   — on mesure la position AVANT le changement de DOM
 *   Last    — on mesure la position APRÈS
 *   Invert  — on replace visuellement l'élément à son ancienne position
 *   Play    — on le laisse rejoindre sa vraie place
 */

/**
 * @typedef {object} Rect
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/** Écart en dessous duquel l'animation ne se verrait pas et ne vaut pas la peine. */
export const SEUIL_PX = 4;

/**
 * Transformation qui ramène visuellement un élément de sa position finale à sa
 * position de départ. C'est le cœur de FLIP, et c'est de l'arithmétique pure :
 * testable sans navigateur.
 *
 * L'échelle est calculée séparément en X et en Y — un titre qui passe de 1,6 à
 * 1,3 rem ne change pas dans les mêmes proportions en largeur et en hauteur.
 *
 * @param {Rect|null} avant position de départ
 * @param {Rect|null} apres position d'arrivée
 * @returns {{dx:number, dy:number, sx:number, sy:number, utile:boolean}}
 */
export function calculerFlip(avant, apres) {
  const nul = { dx: 0, dy: 0, sx: 1, sy: 1, utile: false };
  if (!avant || !apres) return nul;
  if (!(apres.width > 0) || !(apres.height > 0)) return nul;
  if (!(avant.width > 0) || !(avant.height > 0)) return nul;
  const dx = avant.x - apres.x;
  const dy = avant.y - apres.y;
  const sx = avant.width / apres.width;
  const sy = avant.height / apres.height;
  // Un déplacement de deux pixels ou un grossissement de 1 % ne se voient pas :
  // les animer ne ferait que consommer une image de plus.
  const utile = Math.abs(dx) > SEUIL_PX || Math.abs(dy) > SEUIL_PX
    || Math.abs(sx - 1) > 0.02 || Math.abs(sy - 1) > 0.02;
  return { dx, dy, sx, sy, utile };
}

/**
 * Écrit la transformation sous forme CSS.
 * @param {{dx:number, dy:number, sx:number, sy:number}} f
 */
export function transformFlip(f) {
  return `translate3d(${f.dx.toFixed(1)}px, ${f.dy.toFixed(1)}px, 0) scale(${f.sx.toFixed(4)}, ${f.sy.toFixed(4)})`;
}

/* ===================== PARTIE NAVIGATEUR ===================== */

/** @type {Map<string, Rect>} */
let AVANT = new Map();

/** Rectangle simplifié d'un élément. */
function rect(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

/**
 * Photographie la position des éléments marqués `data-flip`, AVANT de changer
 * d'écran. Une seule lecture de mise en page, sur quelques éléments.
 *
 * @param {ParentNode} [racine]
 */
export function memoriserFlip(racine = document) {
  AVANT = new Map();
  for (const el of Array.from(racine.querySelectorAll("[data-flip]"))) {
    const cle = /** @type {HTMLElement} */ (el).dataset.flip;
    if (cle) AVANT.set(cle, rect(el));
  }
}

/** Oublie la photographie (changement d'écran sans continuité visuelle). */
export function oublierFlip() { AVANT = new Map(); }

/**
 * Rejoue le déplacement des éléments retrouvés dans le nouvel écran.
 *
 * N'anime que `transform` et `opacity`, sur un nombre d'éléments qui se compte
 * sur les doigts d'une main. Rend le nombre d'éléments réellement animés — ce
 * qui permet de le vérifier depuis un test.
 *
 * @param {ParentNode} [racine]
 * @param {{duree?:number, ease?:string}} [opts]
 * @returns {number} éléments animés
 */
export function rejouerFlip(racine = document, opts = {}) {
  if (!AVANT.size) return 0;
  let n = 0;
  const duree = opts.duree || 380;
  const ease = opts.ease || "cubic-bezier(.22,1,.36,1)";
  for (const el of Array.from(racine.querySelectorAll("[data-flip]"))) {
    const cle = /** @type {HTMLElement} */ (el).dataset.flip;
    const avant = cle ? AVANT.get(cle) : null;
    if (!avant) continue;
    const f = calculerFlip(avant, rect(el));
    if (!f.utile) continue;
    try {
      /** @type {HTMLElement} */ (el).animate(
        [{ transform: transformFlip(f), transformOrigin: "left top" },
          { transform: "none", transformOrigin: "left top" }],
        { duration: duree, easing: ease, composite: "replace" });
      n++;
    } catch (e) { /* navigateur sans Web Animations : l'écran reste juste */ }
  }
  AVANT = new Map();
  return n;
}
