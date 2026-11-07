// @ts-check
/**
 * Unités de poids : kg ou lb. Fonctions PURES.
 *
 * Règle d'architecture : TOUT est stocké en kilogrammes (historique, records,
 * programmes, pesées). L'unité ne change que l'AFFICHAGE et la SAISIE, aux
 * frontières de l'interface — d'où la possibilité de basculer à tout moment
 * sans rien convertir dans les données, et sans aucune différence pour qui
 * reste en kg (les valeurs en kg sont rendues telles quelles).
 *
 * Les livres sont arrondies à 0,5 lb : une charge de 62,5 kg devient 138 lb,
 * pas 137,79 lb, que personne ne peut charger sur une barre.
 */

export const LB_PAR_KG = 2.2046226218;

/** Les réglages demandent-ils des livres ? */
export function estImperial(reglages) {
  return !!reglages && reglages.unites === "imperial";
}

/** Libellé court de l'unité de charge. */
export function uniteCharge(imperial) {
  return imperial ? "lb" : "kg";
}

/** Arrondi au pas donné (0,5 lb). */
function auPas(x, pas) {
  return Math.round(x / pas) * pas;
}

/**
 * Valeur À AFFICHER (nombre) pour une charge stockée en kg, ou null si absente.
 * En kg, la valeur est rendue telle quelle : aucun changement pour l'existant.
 * @param {any} kg
 * @param {boolean} imperial
 * @returns {number|null}
 */
export function versAffichage(kg, imperial) {
  if (kg === null || kg === undefined || kg === "") return null;
  const n = Number(kg);
  if (!Number.isFinite(n)) return null;
  if (!imperial) return n;
  return auPas(n * LB_PAR_KG, 0.5);
}

/**
 * Charge en kg à partir d'une SAISIE (chaîne ou nombre, virgule acceptée)
 * exprimée dans l'unité affichée. null si vide ou illisible.
 * @param {any} valeur
 * @param {boolean} imperial
 * @returns {number|null}
 */
export function depuisSaisie(valeur, imperial) {
  if (valeur === null || valeur === undefined) return null;
  const s = String(valeur).trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (!imperial) return n;
  // Trois décimales : 135 lb → 61,235 kg, et 61,235 kg → 135 lb à l'affichage.
  return Math.round((n / LB_PAR_KG) * 1000) / 1000;
}

/**
 * Texte « 62.5 kg » / « 138 lb ». En kg, même rendu qu'avant (nombre brut).
 * @param {any} kg
 * @param {boolean} imperial
 * @param {{fr?:boolean}} [opts]  fr : virgule décimale française
 */
export function texteCharge(kg, imperial, opts = {}) {
  const v = versAffichage(kg, imperial);
  if (v === null) return "—";
  const nb = opts.fr ? v.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : String(v);
  return `${nb} ${uniteCharge(imperial)}`;
}

/**
 * Volume (tonnage) lisible : « 5 985 kg », « 16,6 t » ; en livres « 13 195 lb »,
 * « 36,6 k lb » au-delà de 10 000 lb.
 * @param {number} kg
 * @param {boolean} imperial
 * @param {{tonnes?:boolean}} [opts]  tonnes : passer en t / k lb au-delà du seuil
 */
export function texteVolume(kg, imperial, opts = {}) {
  const n = Number(kg) || 0;
  if (!imperial) {
    if (opts.tonnes && n >= 1000) return `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} t`;
    return `${Math.round(n).toLocaleString("fr-FR")} kg`;
  }
  const lb = n * LB_PAR_KG;
  if (opts.tonnes && lb >= 10000) return `${(lb / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} k lb`;
  return `${Math.round(lb).toLocaleString("fr-FR")} lb`;
}
