// @ts-check
/**
 * VIGNETTES D'EXERCICE — une seule apparence, partout.
 *
 * Catalogue, séance, aperçu, remplacement, alternatives, récents : six écrans
 * affichent le même objet. Le code vivait au milieu de `src/ui/app.js`, ce qui
 * garantissait qu'une retouche sur l'un passerait à côté des cinq autres.
 *
 * La vignette superpose deux choses, et l'ordre compte :
 *
 *   · dessous, la SILHOUETTE du muscle principal — dessinée localement, donc
 *     instantanée et disponible hors ligne dès le premier lancement ;
 *   · dessus, la DÉMONSTRATION animée, qui n'apparaît qu'une fois RÉELLEMENT
 *     chargée et se retire si elle échoue.
 *
 * Dans les deux cas la silhouette reste visible : jamais un carré vide, jamais
 * une image cassée. C'est un choix d'écran, pas un accident.
 */

import { Etat } from "../store/state.js";
import { GIFS } from "../data/gifs.js";
import { miniSilhouette } from "./anatomy.js";
import { IC_MATOS } from "./icones.js";
import { esc } from "./dom.js";

/**
 * Vignette d'exercice (52 px) : silhouette du muscle principal + icône de
 * matériel. Générée localement, donc instantanée et disponible hors ligne —
 * là où une image distante mettrait du temps et occuperait tout l'écran.
 */
/**
 * URL de démonstration connue SANS aller sur le réseau : cache local d'abord,
 * puis la table embarquée, puis la miniature du catalogue. Null si inconnue —
 * on ne déclenche jamais de recherche en ligne pour une vignette.
 */
export function urlDemo(exo) {
  if (!exo) return null;
  return Etat.data.mediaCache?.[exo.id] || GIFS[exo.id] || (exo.media && exo.media.miniature) || null;
}

export function vignetteExo(exo) {
  const muscles = (exo.musclesPrincipaux || []).slice(0, 2);
  const eq = exo.equipement || [];
  let matos = "corps";
  if (eq.includes("barre") || eq.includes("barre_ez")) matos = "barre";
  else if (eq.includes("halteres") || eq.includes("kettlebell")) matos = "halteres";
  else if (eq.includes("poulie") || eq.includes("elastiques")) matos = "poulie";
  else if (eq.includes("machine_leviers") || eq.includes("machine_guidee") || eq.includes("smith")) matos = "machine";
  // La démonstration EST l'information utile : on la montre directement dans la
  // vignette plutôt que d'obliger à ouvrir la fiche. La silhouette reste
  // dessous et réapparaît si l'image ne charge pas (hors ligne, exercice sans
  // média). Animation ignorée si l'utilisateur a demandé moins de mouvement.
  const url = REDUIRE_MOTION ? null : urlDemo(exo);
  const img = url
    ? `<img class="exo-gif" src="${esc(url)}" alt="" loading="lazy" decoding="async">`
    : "";
  return `${muscles.length ? miniSilhouette(muscles) : ""}${img}`
    + `<span class="exo-matos" aria-hidden="true">${IC_MATOS[matos]}</span>`;
}

/**
 * Vignette prête à poser dans n'importe quelle liste d'exercices. Une seule
 * apparence partout : catalogue, séance, aperçu, remplacement, alternatives.
 * @param {any} exo
 * @param {string} [cls] modificateur de taille (`sm`)
 */
export function vignetteHTML(exo, cls = "") {
  if (!exo) return "";
  return `<span class="exo-vign ${cls}" aria-hidden="true">${vignetteExo(exo)}</span>`;
}

/** Préférence système « moins de mouvement » (lue une fois au démarrage). */
export const REDUIRE_MOTION = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;

// La démonstration ne se montre qu'une fois RÉELLEMENT chargée, et se retire si
// elle échoue : dans les deux cas la silhouette placée dessous reste visible,
// jamais un carré vide. `load` et `error` ne remontent pas — d'où l'écoute en
// phase de capture, un seul couple d'écouteurs pour toute l'application.
const estVignette = (t) => t && t.tagName === "IMG" && t.classList.contains("exo-gif");
document.addEventListener("load", (ev) => {
  const t = /** @type {any} */ (ev.target);
  if (estVignette(t)) t.classList.add("ok");
}, true);
document.addEventListener("error", (ev) => {
  const t = /** @type {any} */ (ev.target);
  if (estVignette(t)) t.remove();
}, true);
