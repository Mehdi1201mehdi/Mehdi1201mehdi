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

/**
 * Carte de chaleur musculaire : colore chaque muscle selon son INTENSITÉ de
 * travail (0 → 1). Plus un muscle a été sollicité, plus le calque est opaque.
 * Sert à visualiser, sur le corps, les zones réellement entraînées (à partir
 * des données locales de l'utilisateur — aucune API).
 *
 * @param {Record<string,number>|Map<string,number>} intensites  muscle → 0..1
 */
export function muscleHeatmap(intensites) {
  const get = (m) => {
    const x = intensites instanceof Map ? intensites.get(m) : intensites[m];
    return Number(x) || 0;
  };
  // Un exercice « corps entier » rejaillit sur les grands groupes.
  const base = {};
  for (const m of Object.keys(WGER)) base[m] = get(m);
  const global = get("corps_entier");
  if (global > 0) for (const m of CORPS_ENTIER) base[m] = Math.max(base[m] || 0, global);

  const calques = (front) => {
    let html = "";
    for (const [m, w] of Object.entries(WGER)) {
      if (w.front !== front) continue;
      const i = Math.max(0, Math.min(1, base[m] || 0));
      if (i > 0) {
        const opac = (0.3 + 0.7 * i).toFixed(2); // toujours visible dès qu'entraîné
        html += `<img class="ov" style="opacity:${opac}" src="${BASE}/main/muscle-${w.id}.svg" alt="">`;
      }
    }
    return html;
  };

  return `<div class="anat2">
    <div class="anview"><img class="base" src="${BASE}/muscular_system_front.svg" alt="Vue avant">${calques(1)}<span class="lab">Avant</span></div>
    <div class="anview"><img class="base" src="${BASE}/muscular_system_back.svg" alt="Vue arrière">${calques(0)}<span class="lab">Arrière</span></div>
  </div>`;
}
