// @ts-check
/**
 * CORPS EN LUMIÈRE — la carte musculaire rendue sur canevas.
 *
 * Le SVG existant reste la référence : il est accessible, il porte
 * l'interactivité (`data-m`), il est net à toutes les tailles, et il ne bouge
 * pas. Ce module ajoute par-dessous ce qu'un SVG ne sait pas faire à coût
 * raisonnable : **de la lumière**. La fatigue d'un muscle ne s'affiche pas comme
 * un aplat plus opaque, elle RAYONNE — un halo diffus qui déborde du contour,
 * d'autant plus intense que le muscle a travaillé.
 *
 * Aucun nouvel asset : on réutilise exactement les mêmes tracés que le SVG, via
 * `Path2D`, qui accepte directement la syntaxe `d` de SVG.
 *
 * Le rendu se fait en trois passes, dans cet ordre :
 *   1. le halo   — muscles chauds, floutés, additionnés les uns aux autres
 *   2. le corps  — silhouette et parts neutres, nettes, par-dessus le halo
 *   3. la chair  — remplissage de chaque muscle, opacité selon l'intensité
 *
 * Le canevas est purement décoratif : `aria-hidden`, aucun événement. Retirer ce
 * fichier ne casserait rien — l'app retomberait sur le SVG seul.
 */
import { ANATOMY } from "../data/anatomy-paths.js";

/** Décalage horizontal de la vue arrière dans le système de coordonnées commun. */
const DECALAGE = { front: 0, back: 724 };
/** Dimensions d'une vue, dans les coordonnées d'origine des tracés. */
export const VUE = { largeur: 724, hauteur: 1448 };

/** Au-delà, le halo déborderait sur les muscles voisins et la lecture se brouille. */
export const FLOU_MAX_PX = 26;

/**
 * Intensité effective d'un muscle, bornée et nettoyée.
 * @param {Record<string, number>} intensites
 * @param {string} muscle
 * @returns {number} 0 → 1
 */
export function intensite(intensites, muscle) {
  const x = Number((intensites || {})[muscle]);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * Transformation qui amène une vue (724 × 1448) dans un canevas donné, en
 * conservant les proportions et en centrant.
 *
 * Calcul pur, donc testable : une erreur d'échelle ici décalerait tout le corps
 * par rapport au SVG posé au-dessus, et le halo se retrouverait à côté du
 * muscle qu'il est censé éclairer.
 *
 * @param {number} largeur  largeur du canevas en pixels CSS
 * @param {number} hauteur  hauteur du canevas en pixels CSS
 * @param {number} [nbVues] 1 ou 2 vues côte à côte
 * @returns {{echelle:number, dx:number, dy:number}}
 */
export function cadrer(largeur, hauteur, nbVues = 2) {
  const l = Number(largeur), h = Number(hauteur);
  const n = Math.max(1, Math.round(Number(nbVues) || 1));
  if (!(l > 0) || !(h > 0)) return { echelle: 0, dx: 0, dy: 0 };
  const totalL = VUE.largeur * n;
  const echelle = Math.min(l / totalL, h / VUE.hauteur);
  return {
    echelle,
    dx: (l - totalL * echelle) / 2,
    dy: (h - VUE.hauteur * echelle) / 2,
  };
}

/**
 * Rayon du halo pour une intensité donnée.
 * Un muscle frais n'émet rien : sans ce zéro net, tout le corps baignerait dans
 * une brume permanente et l'information disparaîtrait.
 * @param {number} i 0 → 1
 */
export function rayonHalo(i) {
  const x = Math.max(0, Math.min(1, Number(i) || 0));
  if (x <= 0.02) return 0;
  return Math.round(6 + (FLOU_MAX_PX - 6) * x);
}

/* ===================== RENDU ===================== */

/** Cache des `Path2D` : les tracés ne changent jamais, on ne les reconstruit pas. */
const CACHE = new Map();

/** @param {string} cle @param {string[]} ds */
function chemin(cle, ds) {
  let p = CACHE.get(cle);
  if (p) return p;
  p = new Path2D();
  for (const d of ds) { try { p.addPath(new Path2D(d)); } catch (e) { /* tracé illisible : ignoré */ } }
  CACHE.set(cle, p);
  return p;
}

/** Lit une couleur du thème (les variables CSS ne sont pas connues du canevas). */
function jeton(nom, repli) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
    return v || repli;
  } catch (e) { return repli; }
}

/**
 * Dessine les vues demandées dans un canevas.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Record<string, number>} intensites  muscle → 0..1
 * @param {("front"|"back")[]} [vues]
 * @param {{halo?:boolean}} [opts]  `halo:false` pour le rendu sans lumière
 * @returns {number} nombre de muscles réellement éclairés
 */
export function dessinerCorps(canvas, intensites, vues = ["front", "back"], opts = {}) {
  if (!canvas || !canvas.getContext) return 0;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;

  // Densité de pixels : sans cela le corps est flou sur un téléphone.
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const l = canvas.clientWidth, h = canvas.clientHeight;
  if (!(l > 0) || !(h > 0)) return 0;
  if (canvas.width !== Math.round(l * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(l * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, l, h);

  const { echelle, dx, dy } = cadrer(l, h, vues.length);
  if (!echelle) return 0;

  const accent = jeton("--anat-primary", "#B7E63A");
  const corps = jeton("--anat-body", "#30363B");
  const ligne = jeton("--anat-line", "#454D54");
  const chair = jeton("--anat-muscle", "#3A4249");
  const avecHalo = opts.halo !== false;

  let eclaires = 0;

  vues.forEach((vue, iVue) => {
    const A = ANATOMY[vue];
    if (!A) return;
    ctx.save();
    ctx.translate(dx + iVue * VUE.largeur * echelle, dy);
    ctx.scale(echelle, echelle);
    // Les tracés de la vue arrière vivent à x + 724 : on ramène à l'origine.
    ctx.translate(-DECALAGE[vue], 0);

    /* --- 1. Le halo. Chaque muscle chaud rayonne ; les halos s'ADDITIONNENT,
           donc deux muscles voisins fatigués forment une zone plus chaude — ce
           qui est exactement l'information à transmettre. --- */
    if (avecHalo) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (const [m, ds] of Object.entries(A.groups)) {
        const i = intensite(intensites, m);
        const r = rayonHalo(i);
        if (!r) continue;
        eclaires++;
        ctx.save();
        ctx.shadowColor = accent;
        ctx.shadowBlur = r;
        ctx.globalAlpha = 0.16 + 0.42 * i;
        ctx.fillStyle = accent;
        const p = chemin(vue + "|" + m, ds);
        // Deux passes : la seconde épaissit le halo sans éclaircir le centre.
        ctx.fill(p); ctx.fill(p);
        ctx.restore();
      }
      ctx.restore();
    }

    /* --- 2. Le corps, net, par-dessus la lumière. --- */
    ctx.fillStyle = corps;
    ctx.strokeStyle = ligne;
    ctx.lineWidth = 3;
    const silhouette = chemin(vue + "|outline", [A.outline]);
    ctx.fill(silhouette);
    ctx.stroke(silhouette);

    /* --- 3. La chair : chaque muscle, opacité selon l'intensité. --- */
    for (const [m, ds] of Object.entries(A.groups)) {
      const i = intensite(intensites, m);
      const p = chemin(vue + "|" + m, ds);
      if (i > 0.02) {
        ctx.globalAlpha = 0.30 + 0.70 * i;
        ctx.fillStyle = accent;
      } else {
        ctx.globalAlpha = 1;
        ctx.fillStyle = chair;
      }
      ctx.fill(p);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = corps;
    ctx.fill(chemin(vue + "|neutral", A.neutral));

    ctx.restore();
  });

  return eclaires;
}
