// @ts-check
/**
 * Sauvegarde / restauration COMPLÈTE des données utilisateur (export & import
 * JSON). Fonctions PURES (aucun DOM/stockage) : l'UI lit le fichier, appelle
 * `validerImport` puis `appliquerImport`, et enregistre le résultat.
 *
 * Objectifs : ne jamais perdre de données (fusion anti-doublons par id),
 * valider le contenu importé, et permettre soit de fusionner soit de remplacer.
 */
import { SCHEMA_VERSION, normaliserEtat } from "../store/migrate.js";

/** Champs inclus dans l'export (on exclut les caches volatils). */
const CLES_EXPORT = [
  "profil", "programme", "programmesPerso", "exercicesPerso",
  "logs", "metrics", "foodlog", "waterlog", "reviews", "reglages",
];

/** Construit l'objet d'export (sérialisable en JSON). */
export function construireExport(data, maintenant = new Date().toISOString()) {
  const out = {};
  for (const k of CLES_EXPORT) out[k] = data ? data[k] : undefined;
  return { app: "coach-perso-ia", schema: SCHEMA_VERSION, exportedAt: maintenant, data: out };
}

/**
 * Valide un objet importé (parsé depuis le JSON). Tolère un export « brut »
 * (les données à la racine) aussi bien que l'enveloppe { app, schema, data }.
 * @returns {{ok:boolean, erreurs:string[], data:any}}
 */
export function validerImport(obj) {
  if (!obj || typeof obj !== "object") return { ok: false, erreurs: ["Fichier vide ou illisible."], data: null };
  const erreurs = [];
  if (obj.app && obj.app !== "coach-perso-ia") erreurs.push("Ce fichier ne provient pas de Coach Perso IA.");
  const src = (obj.data && typeof obj.data === "object") ? obj.data : obj;
  for (const k of ["logs", "metrics", "reviews", "programmesPerso", "exercicesPerso"]) {
    if (k in src && !Array.isArray(src[k])) erreurs.push(`Champ « ${k} » invalide (tableau attendu).`);
  }
  if (("foodlog" in src) && (typeof src.foodlog !== "object" || Array.isArray(src.foodlog))) erreurs.push("Champ « foodlog » invalide.");
  const aQuelqueChose = ["profil", "programme", "logs", "metrics", "programmesPerso"].some((k) => src[k]);
  if (!aQuelqueChose) erreurs.push("Aucune donnée exploitable dans ce fichier.");
  if (erreurs.length) return { ok: false, erreurs, data: null };
  return { ok: true, erreurs: [], data: src };
}

/** Fusionne deux listes par `id` (sans doublon) ; les éléments sans id sont ajoutés. */
function fusionListe(a, b) {
  const out = Array.isArray(a) ? a.slice() : [];
  const ids = new Set(out.filter((x) => x && x.id).map((x) => x.id));
  for (const x of (Array.isArray(b) ? b : [])) {
    if (x && x.id) { if (!ids.has(x.id)) { out.push(x); ids.add(x.id); } }
    else if (x) out.push(x);
  }
  return out;
}

/**
 * Applique un import (déjà validé : `src` = le `.data`).
 *  - mode "remplacer" : les données importées écrasent tout ;
 *  - mode "fusionner" (défaut) : fusion anti-doublons, l'existant est préservé.
 * @param {any} actuel  Etat.data courant
 * @param {any} src     données validées (validerImport().data)
 * @param {"fusionner"|"remplacer"} [mode]
 */
export function appliquerImport(actuel, src, mode = "fusionner") {
  if (mode === "remplacer") return normaliserEtat({ ...src });
  const base = normaliserEtat(actuel);
  const out = { ...base };
  out.logs = fusionListe(base.logs, src.logs);
  out.metrics = fusionListe(base.metrics, src.metrics);
  out.reviews = fusionListe(base.reviews, src.reviews);
  out.programmesPerso = fusionListe(base.programmesPerso, src.programmesPerso);
  out.exercicesPerso = fusionListe(base.exercicesPerso, src.exercicesPerso);
  // foodlog / waterlog : union des jours, priorité aux données actuelles.
  out.foodlog = { ...(src.foodlog || {}), ...(base.foodlog || {}) };
  out.waterlog = { ...(src.waterlog || {}), ...(base.waterlog || {}) };
  // profil / programme : garde l'actuel s'il existe, sinon reprend l'import.
  out.profil = base.profil || src.profil || null;
  out.programme = base.programme || src.programme || null;
  out.reglages = { ...base.reglages, ...(src.reglages || {}) };
  return normaliserEtat(out);
}

/** Nom de fichier de sauvegarde horodaté. */
export function nomFichierBackup(dateISO = new Date().toISOString()) {
  return `coach-perso-sauvegarde-${dateISO.slice(0, 10)}.json`;
}
