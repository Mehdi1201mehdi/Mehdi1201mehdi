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
import { IDENTITE } from "../config/identite.js";

/**
 * Champs inclus dans l'export (on exclut les caches volatils).
 *
 * `photos` désigne les FICHES, pas les images : date, angle, poids, dimensions.
 * Quelques centaines d'octets, et elles permettent une restauration complète sur
 * le MÊME appareil (les images sont restées dans IndexedDB). Sur un autre
 * appareil, les fiches reviennent sans leurs images et l'interface le dit —
 * mieux que de perdre l'historique des prises de vue en silence.
 */
const CLES_EXPORT = [
  "profil", "programme", "programmesPerso", "exercicesPerso",
  "logs", "metrics", "foodlog", "waterlog", "reviews", "photos", "favoris", "recentsExo", "reglages",
  // Ajoutées ensuite : l'historique du test vélo n'était pas sauvegardé (perdu
  // à la restauration), et les favoris du dictionnaire sont un choix explicite.
  "testsVelo", "dicoFavoris",
  // Cycles d'entraînement : le cycle en cours et les bilans des précédents.
  "cycle", "bilansCycles",
];

/**
 * Réglages SANS secret. Une sauvegarde est un fichier qu'on envoie par mail,
 * qu'on dépose dans un cloud ou qu'on partage pour obtenir de l'aide : la clé
 * d'API du coach n'a rien à y faire. Le fournisseur et le modèle restent (ils
 * ne valent rien seuls) ; la clé et le jeton du serveur relais sont retirés et
 * se ressaisissent après une restauration.
 * @param {any} reglages
 */
export function reglagesSansSecret(reglages) {
  if (!reglages || typeof reglages !== "object") return reglages;
  const out = { ...reglages };
  if (out.coachCloud && typeof out.coachCloud === "object") {
    const { cle, jeton, ...reste } = out.coachCloud;
    out.coachCloud = reste;
  }
  return out;
}

/** Construit l'objet d'export (sérialisable en JSON). */
export function construireExport(data, maintenant = new Date().toISOString()) {
  const out = {};
  for (const k of CLES_EXPORT) out[k] = data ? data[k] : undefined;
  out.reglages = reglagesSansSecret(out.reglages);
  return { app: IDENTITE.idSauvegarde, schema: SCHEMA_VERSION, exportedAt: maintenant, data: out };
}

/**
 * Valide un objet importé (parsé depuis le JSON). Tolère un export « brut »
 * (les données à la racine) aussi bien que l'enveloppe { app, schema, data }.
 * @returns {{ok:boolean, erreurs:string[], data:any}}
 */
export function validerImport(obj) {
  if (!obj || typeof obj !== "object") return { ok: false, erreurs: ["Fichier vide ou illisible."], data: null };
  const erreurs = [];
  // `idSauvegarde` est un identifiant technique, pas le nom affiché : renommer
  // l'application ne doit pas faire rejeter les fichiers déjà exportés.
  if (obj.app && obj.app !== IDENTITE.idSauvegarde) erreurs.push(`Ce fichier ne provient pas de ${IDENTITE.nom}.`);
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
  // Tout fichier importé est traité comme venant d'un inconnu.
  src = assainirImport(src);
  if (mode === "remplacer") {
    // Une sauvegarde antérieure aux photos ne porte pas la clé `photos`.
    // L'appliquer telle quelle effacerait les fiches tout en laissant les images
    // dans IndexedDB : des orphelines invisibles, et un historique de prises de
    // vue perdu sans que personne ne l'ait demandé.
    const photos = Array.isArray(src.photos) ? src.photos : (actuel && actuel.photos) || [];
    // La clé du coach appartient à CET appareil et n'est jamais dans un fichier
    // de sauvegarde : « remplacer les données » ne doit pas la faire disparaître.
    const reglages = reglagesImportes(src.reglages, actuel && actuel.reglages);
    // Seules les clés d'une vraie sauvegarde sont reprises : un fichier
    // fabriqué ne peut pas glisser une séance en cours ou un cache.
    const propre = {};
    for (const k of CLES_EXPORT) if (Object.prototype.hasOwnProperty.call(src, k)) propre[k] = src[k];
    return normaliserEtat({ ...propre, photos, reglages });
  }
  const base = normaliserEtat(actuel);
  const out = { ...base };
  out.logs = fusionListe(base.logs, src.logs);
  out.metrics = fusionListe(base.metrics, src.metrics);
  out.reviews = fusionListe(base.reviews, src.reviews);
  out.programmesPerso = fusionListe(base.programmesPerso, src.programmesPerso);
  out.exercicesPerso = fusionListe(base.exercicesPerso, src.exercicesPerso);
  out.photos = fusionListe(base.photos, src.photos);
  // Listes d'identifiants : union sans doublon, l'actuel d'abord.
  out.favoris = [...new Set([...(base.favoris || []), ...(src.favoris || [])])];
  out.recentsExo = [...new Set([...(base.recentsExo || []), ...(src.recentsExo || [])])].slice(0, 12);
  out.dicoFavoris = [...new Set([...(base.dicoFavoris || []), ...(src.dicoFavoris || [])])];
  out.testsVelo = fusionListe(base.testsVelo, src.testsVelo);
  // foodlog / waterlog : union des jours, priorité aux données actuelles.
  out.foodlog = { ...(src.foodlog || {}), ...(base.foodlog || {}) };
  out.waterlog = { ...(src.waterlog || {}), ...(base.waterlog || {}) };
  // profil / programme : garde l'actuel s'il existe, sinon reprend l'import.
  out.profil = base.profil || src.profil || null;
  out.programme = base.programme || src.programme || null;
  out.reglages = reglagesImportes({ ...base.reglages, ...(src.reglages || {}) }, base.reglages);
  return normaliserEtat(out);
}

/** Réglages qui décident où partent les conversations du coach. */
const REGLAGES_COACH = ["coachCloud", "coachIA", "coachPartageHisto"];

/**
 * Réglages repris d'un fichier importé, SANS ceux du coach en ligne.
 *
 * Un fichier de sauvegarde vient parfois d'ailleurs (envoyé, téléchargé). S'il
 * pouvait régler le fournisseur et l'adresse du coach, ouvrir ce fichier
 * suffirait à activer le coach en ligne et à envoyer conversations et jeton
 * vers un serveur choisi par son auteur (audit de sécurité, nov. 2026). Le
 * coach se configure donc uniquement à la main, sur l'appareil : on garde tel
 * quel ce qui y est déjà, et rien de ce que dit le fichier.
 * @param {any} importes  réglages du fichier
 * @param {any} locaux    réglages actuels de l'appareil
 */
export function reglagesImportes(importes, locaux) {
  const out = { ...(importes || {}) };
  for (const k of REGLAGES_COACH) {
    delete out[k];
    if (locaux && Object.prototype.hasOwnProperty.call(locaux, k)) out[k] = locaux[k];
  }
  return out;
}

/** Nom de fichier de sauvegarde horodaté. */
export function nomFichierBackup(dateISO = new Date().toISOString()) {
  return `coach-perso-sauvegarde-${dateISO.slice(0, 10)}.json`;
}

/**
 * Faut-il rappeler de faire une sauvegarde ? Les données ne vivent que sur
 * l'appareil : le vrai risque est de perdre ou de changer de téléphone.
 * Rappel à partir de 5 séances, si la dernière sauvegarde (ou le dernier
 * « plus tard ») date de plus de 30 jours.
 * @param {any} reglages  lit `derniereSauvegardeAt` et `rappelSauvegardeAt` (ms)
 * @param {any[]} logs
 * @param {number} [maintenant]
 * @returns {{rappeler: boolean, joursDepuis: number|null, seancesDepuis: number}}
 */
export function etatSauvegarde(reglages, logs, maintenant = Date.now()) {
  const r = reglages || {}, liste = logs || [];
  const derniere = Number(r.derniereSauvegardeAt) || 0;
  const repere = Math.max(derniere, Number(r.rappelSauvegardeAt) || 0);
  const seancesDepuis = liste.filter((l) => Date.parse(l && l.date) > derniere).length;
  const joursDepuis = derniere ? Math.floor((maintenant - derniere) / 86400000) : null;
  const rappeler = liste.length >= 5 && seancesDepuis > 0 && maintenant - repere > 30 * 86400000;
  return { rappeler, joursDepuis, seancesDepuis };
}

const CLES_INTERDITES = new Set(["__proto__", "constructor", "prototype"]);
/** Champs toujours numériques : une chaîne non numérique y devient `null`. */
const CHAMPS_NUMERIQUES = new Set(["age", "tailleCm", "poidsKg", "sommeilH", "joursParSemaine", "dureeSeanceMin", "dureeEstimeeMin",
  "chargeKg", "reps", "rir", "rpe", "dureeSec", "distanceKm", "distanceM", "reposSec", "series", "difficulte", "masseGrassePct"]);

/**
 * Copie assainie d'un fichier importé (audit de sécurité, nov. 2026).
 *
 * L'interface construit son HTML par chaînes ; la plupart des textes passent
 * par `esc()`, mais un fichier fabriqué pouvait placer du HTML là où l'app
 * attend un nombre ou un identifiant (durée d'une séance, muscle d'un exercice
 * personnel). On ferme la porte à l'entrée plutôt qu'à chaque affichage :
 * - les chevrons deviennent des guillemets simples typographiques ‹ › ;
 * - un champ numérique qui n'est pas un nombre est vidé ;
 * - les clés `__proto__`, `constructor`, `prototype` sont ignorées ;
 * - profondeur, longueurs de texte et de tableaux sont plafonnées.
 * Les images intégrées (`data:image/…`) sont conservées telles quelles.
 * @param {any} v
 * @param {string} [cle]
 * @param {number} [profondeur]
 * @returns {any}
 */
export function assainirImport(v, cle = "", profondeur = 0) {
  if (v == null || typeof v === "boolean") return v;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    if (CHAMPS_NUMERIQUES.has(cle)) {
      const n = Number(v.replace(",", "."));
      return v.trim() !== "" && Number.isFinite(n) ? n : null;
    }
    if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v)) return v;
    return v.slice(0, 20000).replace(/</g, "‹").replace(/>/g, "›");
  }
  if (profondeur > 14) return null;
  if (Array.isArray(v)) {
    // `series` est un nombre dans une routine, une liste dans un journal.
    return v.slice(0, 50000).map((x) => assainirImport(x, cle === "series" ? "" : cle, profondeur + 1));
  }
  if (typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v)) {
      if (CLES_INTERDITES.has(k)) continue;
      out[String(k).slice(0, 200).replace(/[<>]/g, "")] = assainirImport(v[k], k, profondeur + 1);
    }
    return out;
  }
  return null;
}
