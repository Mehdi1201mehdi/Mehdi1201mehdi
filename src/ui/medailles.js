// @ts-check
/**
 * MÉDAILLES — le dessin des cinq rangs de trophée.
 *
 * Les planches de référence distinguent les rangs par la COULEUR : bronze,
 * argent, or, violet, diamant. C'est lisible, mais ça introduit cinq teintes
 * dans une application qui n'en a qu'une — et le design system l'interdit pour
 * une bonne raison : dès qu'il y a un arc-en-ciel, plus rien ne ressort.
 *
 * Ici le rang se lit à la RICHESSE du dessin, pas à sa teinte :
 *
 *   1 · hexagone + étoile
 *   2 · + anneau intérieur
 *   3 · + hexagone intérieur (double contour)
 *   4 · + halo
 *   5 · + hexagone extérieur, étoile pleine
 *
 * CHAQUE RANG AJOUTE UN ÉLÉMENT RÉEL au dessin, jamais seulement une opacité :
 * une première version distinguait les rangs 1 et 2 par un fond à 10 %, ce qui
 * ne se voyait pas. Le fond escalade quand même, mais en renfort — jamais comme
 * seul signal.
 *
 * Une seule couleur, cinq niveaux de détail. On voit immédiatement lequel est le
 * plus haut, et l'ensemble reste dans l'univers de l'application. Un trophée non
 * obtenu emploie exactement le même dessin, en graphite : on voit ce qu'on vise.
 */

/** Nombre de rangs. Au-delà, les dessins deviendraient indistinguables. */
export const RANGS = 5;

/** Sommets d'un hexagone pointe en haut, inscrit dans un cercle de rayon `r`. */
export function hexagone(cx, cy, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

/**
 * Opacité du remplissage selon le rang. Le rang 1 n'a aucun fond — c'est ce qui
 * le distingue du 2 au premier coup d'œil.
 * @param {number} rang
 */
export function fondRang(rang) {
  const r = Math.max(1, Math.min(RANGS, Math.round(Number(rang) || 1)));
  return [0, 0.10, 0.16, 0.24, 0.42][r - 1];
}

/**
 * Dessine une médaille.
 *
 * @param {object} opts
 * @param {number} opts.rang        1 → 5
 * @param {boolean} [opts.obtenu]   sinon : même dessin, en graphite
 * @param {string} [opts.titre]     nom lu par les lecteurs d'écran
 * @param {number} [opts.taille]    côté en pixels
 * @returns {string} HTML
 */
export function medaille({ rang, obtenu = true, titre = "", taille = 64 }) {
  const r = Math.max(1, Math.min(RANGS, Math.round(Number(rang) || 1)));
  const C = obtenu ? "var(--accent)" : "var(--faint)";
  const uid = "m" + r + (obtenu ? "o" : "v") + Math.random().toString(36).slice(2, 7);
  const fond = obtenu ? fondRang(r) : 0.05;

  const couches = [];
  // Rang 4 et plus : un halo, obtenu par un hexagone flouté sous le dessin.
  if (r >= 4) {
    couches.push(`<polygon points="${hexagone(32, 32, 27)}" fill="${C}" opacity="${obtenu ? ".28" : ".10"}" filter="url(#${uid}h)"/>`);
  }
  // Rang 5 : une couronne extérieure.
  if (r >= 5) couches.push(`<polygon points="${hexagone(32, 32, 30)}" fill="none" stroke="${C}"
    stroke-width="1" opacity=".45" stroke-linejoin="round"/>`);
  // L'hexagone principal, présent à tous les rangs.
  couches.push(`<polygon points="${hexagone(32, 32, 26)}" fill="${C}" fill-opacity="${fond}"
    stroke="${C}" stroke-width="${r >= 4 ? 2.4 : 2}" stroke-linejoin="round"/>`);
  // Rang 3 et plus : double contour.
  if (r >= 3) couches.push(`<polygon points="${hexagone(32, 32, 21)}" fill="none" stroke="${C}"
    stroke-width="1" opacity=".55" stroke-linejoin="round"/>`);
  // Rang 2 et plus : anneau intérieur.
  if (r >= 2) couches.push(`<circle cx="32" cy="32" r="${r >= 3 ? 15 : 16}" fill="none" stroke="${C}"
    stroke-width="1.4" opacity=".45"/>`);
  // Le cœur : une étoile, pleine seulement au dernier rang.
  const etoile = "M32 21 L35.4 28.2 L43.2 29.2 L37.5 34.6 L38.9 42.3 L32 38.6 L25.1 42.3 L26.5 34.6 L20.8 29.2 L28.6 28.2 Z";
  couches.push(`<path d="${etoile}" fill="${r >= RANGS ? C : "none"}" stroke="${C}"
    stroke-width="${r >= RANGS ? 1 : 2}" stroke-linejoin="round" opacity="${r === 1 ? ".75" : "1"}"/>`);

  const label = titre || `Trophée de rang ${r}${obtenu ? "" : ", non obtenu"}`;
  return `<svg class="medaille${obtenu ? " prise" : ""}" viewBox="0 0 64 64" width="${taille}" height="${taille}"
    role="img" aria-label="${label}">
    <defs><filter id="${uid}h" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="4"/></filter></defs>
    ${couches.join("")}</svg>`;
}
