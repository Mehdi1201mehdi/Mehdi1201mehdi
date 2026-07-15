// @ts-check
/**
 * Planche anatomique PROFESSIONNELLE composée à partir des images libres de
 * wger (licence CC-BY-SA) : corps musculaire (avant + arrière) + calques des
 * muscles ciblés (rouge = principal, orange = secondaire).
 * Rendu identique aux applications de fitness pro, mise en cache hors ligne
 * par le service worker (hôte wger.de déjà autorisé).
 *
 * Repli propre (liste de muscles) géré côté app.js si les images ne chargent pas.
 */

const BASE = "https://wger.de/static/images/muscles";

/** Nos muscles → identifiant wger + vue (front=avant, sinon arrière). */
const WGER = {
  pectoraux: { id: 4, front: 1 }, epaules: { id: 2, front: 1 }, biceps: { id: 1, front: 1 },
  avant_bras: { id: 13, front: 1 }, abdominaux: { id: 6, front: 1 }, quadriceps: { id: 10, front: 1 },
  dorsaux: { id: 12, front: 0 }, trapezes: { id: 9, front: 0 }, triceps: { id: 5, front: 0 },
  fessiers: { id: 8, front: 0 }, ischios: { id: 11, front: 0 }, mollets: { id: 7, front: 0 },
};
const CORPS_ENTIER = ["pectoraux", "dorsaux", "quadriceps", "abdominaux", "fessiers", "epaules"];

/**
 * Construit le HTML de la planche (deux vues). Les <img> base portent la classe
 * `base` : app.js écoute leur `error` pour afficher un repli propre hors ligne.
 * @param {Iterable<string>} principaux
 * @param {Iterable<string>} secondaires
 */
export function muscleDiagram(principaux, secondaires) {
  const P = new Set(principaux), S = new Set(secondaires);
  if (P.has("corps_entier")) CORPS_ENTIER.forEach((m) => P.add(m));

  const calques = (front) => {
    let html = "";
    for (const [m, w] of Object.entries(WGER)) {
      if (w.front !== front) continue;
      if (P.has(m)) html += `<img class="ov" src="${BASE}/main/muscle-${w.id}.svg" alt="">`;
      else if (S.has(m)) html += `<img class="ov" src="${BASE}/secondary/muscle-${w.id}.svg" alt="">`;
    }
    return html;
  };

  return `<div class="anat2">
    <div class="anview"><img class="base" src="${BASE}/muscular_system_front.svg" alt="Vue avant">${calques(1)}<span class="lab">Avant</span></div>
    <div class="anview"><img class="base" src="${BASE}/muscular_system_back.svg" alt="Vue arrière">${calques(0)}<span class="lab">Arrière</span></div>
  </div>`;
}
