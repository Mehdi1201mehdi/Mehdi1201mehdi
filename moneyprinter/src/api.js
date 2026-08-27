/* Client HTTP de l'API MoneyPrinterTurbo (FastAPI, préfixe /api/v1).
   Rien d'autre dans l'app ne connaît la forme des requêtes : tout passe ici. */

import { reglages } from "./reglages.js";

/* Le serveur enveloppe toutes ses réponses : { status, data, message }.
   Un 200 HTTP avec status != 200 dans le corps reste une erreur métier. */
function deballer(json) {
  if (!json || typeof json !== "object") throw new Error("Réponse illisible du serveur.");
  if (json.status && json.status !== 200) {
    throw new Error(json.message || `Erreur ${json.status} côté serveur.`);
  }
  return json.data ?? {};
}

/* Base de l'API.

   Deux façons d'utiliser l'app, et il faut les distinguer sans rien demander :
   servie par MoneyPrinterTurbo lui-même (installée dans resource/public),
   l'API est sur la même origine ; servie ailleurs — GitHub Pages, un serveur
   statique — il faut une adresse explicite.

   Deviner d'après le nom d'hôte est fragile. On demande donc à l'origine
   courante si elle répond « pong » : c'est la seule preuve qui vaille. */
let origineUtilisable = false;

export async function detecterOrigine() {
  origineUtilisable = false;
  if ((reglages.get("apiBase") || "").trim()) return false;
  try {
    await ping(location.origin);
    origineUtilisable = true;
  } catch {
    origineUtilisable = false;
  }
  return origineUtilisable;
}

export function origineAutoDetectee() {
  return origineUtilisable;
}

export function base() {
  const saisie = (reglages.get("apiBase") || "").trim();
  if (saisie) return saisie.replace(/\/+$/, "");
  return origineUtilisable ? location.origin : "";
}

export function baseDefinie() {
  return base() !== "";
}

function entetes(json = true) {
  const h = {};
  if (json) h["Content-Type"] = "application/json";
  const cle = (reglages.get("apiKey") || "").trim();
  if (cle) h["x-api-key"] = cle;
  return h;
}

/* Toutes les erreurs remontent en français et en clair : sur un téléphone,
   « Failed to fetch » ne dit rien à personne. */
async function appel(chemin, options = {}) {
  const racine = base();
  if (!racine) {
    throw new Error("Aucun serveur configuré. Renseigne l'adresse dans Réglages.");
  }
  let reponse;
  try {
    reponse = await fetch(racine + chemin, options);
  } catch (err) {
    throw new Error(
      "Serveur injoignable. Vérifie qu'il tourne et que le téléphone est sur le même Wi-Fi."
    );
  }
  if (reponse.status === 401) throw new Error("Clé d'API refusée. Corrige-la dans Réglages.");
  if (reponse.status === 429) throw new Error("File d'attente pleine côté serveur. Réessaie dans un moment.");
  if (reponse.status === 404) throw new Error("Introuvable côté serveur.");

  let json = null;
  try { json = await reponse.json(); } catch { json = null; }

  if (!reponse.ok) {
    const message = json && (json.message || json.detail);
    throw new Error(message ? String(message) : `Erreur ${reponse.status} du serveur.`);
  }
  return deballer(json);
}

const poster = (chemin, corps) =>
  appel(chemin, { method: "POST", headers: entetes(), body: JSON.stringify(corps) });

/* ── Santé ─────────────────────────────────────────────────────────────── */

/* /ping ne passe pas par l'enveloppe standard : il répond la chaîne "pong". */
export async function ping(racineForcee) {
  const racine = (racineForcee ?? base()).replace(/\/+$/, "");
  if (!racine) throw new Error("Adresse vide.");
  let reponse;
  try {
    reponse = await fetch(racine + "/ping", { headers: entetes(false) });
  } catch {
    throw new Error("Serveur injoignable à cette adresse.");
  }
  if (!reponse.ok) throw new Error(`Le serveur répond ${reponse.status}.`);
  const texte = (await reponse.text()).replace(/"/g, "").trim();
  if (texte !== "pong") throw new Error("Cette adresse ne répond pas comme MoneyPrinterTurbo.");
  return true;
}

/* ── Écriture (LLM) ────────────────────────────────────────────────────── */

export async function ecrireScript({ sujet, langue, paragraphes, consigne }) {
  const data = await poster("/api/v1/scripts", {
    video_subject: sujet,
    video_language: langue || "",
    paragraph_number: Number(paragraphes) || 1,
    video_script_prompt: consigne || "",
    custom_system_prompt: "",
  });
  return String(data.video_script || "").trim();
}

export async function trouverMotsCles({ sujet, script, nombre = 5 }) {
  const data = await poster("/api/v1/terms", {
    video_subject: sujet,
    video_script: script,
    amount: Number(nombre) || 5,
    match_materials_to_script: false,
  });
  const termes = data.video_terms;
  if (Array.isArray(termes)) return termes.map((t) => String(t).trim()).filter(Boolean);
  return String(termes || "").split(/[,\n]/).map((t) => t.trim()).filter(Boolean);
}

/* ── Production ────────────────────────────────────────────────────────── */

export async function lancerVideo(params) {
  const data = await poster("/api/v1/videos", params);
  if (!data.task_id) throw new Error("Le serveur n'a pas renvoyé d'identifiant de tâche.");
  return data.task_id;
}

export async function listerTaches(page = 1, taille = 20) {
  const data = await appel(`/api/v1/tasks?page=${page}&page_size=${taille}`, {
    headers: entetes(false),
  });
  return { taches: data.tasks || [], total: data.total || 0 };
}

export async function detailTache(id) {
  return appel(`/api/v1/tasks/${encodeURIComponent(id)}`, { headers: entetes(false) });
}

export async function supprimerTache(id) {
  return appel(`/api/v1/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: entetes(false),
  });
}

/* ── Musique de fond ───────────────────────────────────────────────────── */

export async function listerMusiques() {
  const data = await appel("/api/v1/musics", { headers: entetes(false) });
  return data.files || [];
}

/* ── Médias produits ───────────────────────────────────────────────────── */

/* Le serveur renvoie soit une URL absolue (si `endpoint` est configuré côté
   serveur), soit un chemin relatif « /tasks/<id>/final-1.mp4 ». */
export function urlMedia(chemin) {
  const c = String(chemin || "");
  if (/^https?:\/\//i.test(c)) return c;
  return base() + (c.startsWith("/") ? c : "/" + c);
}

/* Avec une clé d'API, /tasks est protégé par un en-tête que ni <video src>
   ni un lien de téléchargement ne savent envoyer : on rapatrie le fichier en
   mémoire et on lit un blob local. Sans clé (cas normal en local), on garde
   l'URL directe pour profiter du streaming par plages du serveur. */
export function mediaProtege() {
  return Boolean((reglages.get("apiKey") || "").trim());
}

export async function chargerMedia(chemin) {
  const url = urlMedia(chemin);
  if (!mediaProtege()) return { url, revoquer() {} };
  const reponse = await fetch(url, { headers: entetes(false) });
  if (!reponse.ok) throw new Error(`Téléchargement impossible (${reponse.status}).`);
  const blob = await reponse.blob();
  const objet = URL.createObjectURL(blob);
  return { url: objet, blob, revoquer: () => URL.revokeObjectURL(objet) };
}

/* Rapatrie un média en mémoire, en joignant la clé d'API si elle est
   configurée. Utilisé par le partage natif, qui a besoin d'un vrai File. */
export async function telechargerBlob(chemin) {
  const reponse = await fetch(urlMedia(chemin), { headers: entetes(false) });
  if (!reponse.ok) throw new Error(`Téléchargement impossible (${reponse.status}).`);
  return reponse.blob();
}
