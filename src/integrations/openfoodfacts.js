// @ts-check
/**
 * Adaptateur Open Food Facts (nutrition) — API libre SANS clé, licence ODbL
 * (attribution requise). Recherche par nom + produit par code-barres.
 * `fetchImpl` injectable pour tests hors ligne. Dégradation propre : en cas
 * d'échec, l'interface se rabat sur la base alimentaire locale.
 */

/** Extrait les macros /100 g d'un objet `nutriments` OFF. */
function macros(n) {
  return {
    kcal: Math.round(n["energy-kcal_100g"] ?? 0),
    p: Math.round(n.proteins_100g ?? 0),
    c: Math.round(n.carbohydrates_100g ?? 0),
    l: Math.round(n.fat_100g ?? 0),
  };
}

/** Parse une réponse de recherche OFF → liste d'aliments. PURE (testable). */
export function parseRecherche(json) {
  const produits = (json && json.products) || [];
  return produits
    .filter((p) => p && p.product_name && p.nutriments && p.nutriments["energy-kcal_100g"] != null)
    .map((p) => ({
      n: p.product_name, ...macros(p.nutriments), src: "OFF",
      note: p.nutriscore_grade ? "Nutri-Score " + String(p.nutriscore_grade).toUpperCase() : "",
    }));
}

/** Parse une réponse produit OFF (par code-barres) → aliment unique ou null. PURE. */
export function parseProduit(json, code = "") {
  if (!json || json.status !== 1 || !json.product) return null;
  const p = json.product, n = p.nutriments || {};
  return {
    n: p.product_name || ("Produit " + code), ...macros(n), src: "OFF",
    note: p.nutriscore_grade ? "Nutri-Score " + String(p.nutriscore_grade).toUpperCase() : "",
  };
}

function avecTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

/**
 * Recherche d'aliments sur Open Food Facts.
 * @param {string} query
 * @param {{fetchImpl?:typeof fetch, timeout?:number}} [opts]
 * @returns {Promise<any[]>}
 */
export async function rechercher(query, opts = {}) {
  const f = opts.fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
  if (!f || !query) return [];
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name,nutriments,nutriscore_grade`;
  try {
    const r = await avecTimeout(f(url), opts.timeout || 6000);
    return parseRecherche(await r.json());
  } catch (e) { return []; }
}

/**
 * Récupère un produit par code-barres.
 * @param {string} code
 * @param {{fetchImpl?:typeof fetch, timeout?:number}} [opts]
 * @returns {Promise<any|null>}
 */
export async function parCodeBarres(code, opts = {}) {
  const f = opts.fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
  if (!f || !code) return null;
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`;
  try {
    const r = await avecTimeout(f(url), opts.timeout || 6000);
    return parseProduit(await r.json(), code);
  } catch (e) { return null; }
}
