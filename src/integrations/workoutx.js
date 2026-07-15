// @ts-check
/**
 * Adaptateur WorkoutX API (https://api.workoutxapp.com) — GIF animés officiels.
 * Auth par clé `wx_...` (header X-WorkoutX-Key). La clé n'est JAMAIS codée en
 * dur : elle est saisie dans les Réglages et stockée uniquement sur l'appareil.
 * L'URL du GIF porte la clé en query `api-key` → utilisable dans <img>.
 * `fetchImpl` injectable pour les tests hors ligne.
 */
const BASE = "https://api.workoutxapp.com";

/** URL directe du GIF (utilisable dans <img src>). */
export function gifUrlWX(id, key) {
  return `${BASE}/v1/gifs/${encodeURIComponent(id)}.gif?api-key=${encodeURIComponent(key)}`;
}

/** Extrait le premier exercice exploitable d'une réponse WorkoutX. PURE (testable). */
export function parseWX(json, key) {
  const list = Array.isArray(json) ? json : (json && (json.data || json.exercises)) || [];
  const ex = (Array.isArray(list) ? list : []).find((x) => x && x.id);
  if (!ex) return null;
  const gif = ex.gifUrl && String(ex.gifUrl).includes("api-key") ? ex.gifUrl : gifUrlWX(ex.id, key);
  return { id: ex.id, name: ex.name || "", gifUrl: gif, instructions: Array.isArray(ex.instructions) ? ex.instructions.slice(0, 4) : [] };
}

function avecTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

/**
 * Cherche une démonstration par nom (anglais).
 * @param {string} terme
 * @param {string} key
 * @param {{fetchImpl?:typeof fetch, timeout?:number}} [opts]
 * @returns {Promise<{id:string,name:string,gifUrl:string,instructions:string[]}|null>}
 */
export async function chercherWorkoutX(terme, key, opts = {}) {
  const f = opts.fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
  if (!f || !key || !terme) return null;
  try {
    const r = await avecTimeout(
      f(`${BASE}/v1/exercises/name/${encodeURIComponent(terme)}?limit=3`, { headers: { "X-WorkoutX-Key": key } }),
      opts.timeout || 7000,
    );
    if (!r.ok) return null;
    return parseWX(await r.json(), key);
  } catch (e) { return null; }
}
