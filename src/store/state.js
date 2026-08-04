// @ts-check
/**
 * État applicatif + persistance LOCALE (mono-utilisateur, hors ligne).
 *
 * Stockage PRINCIPAL : IndexedDB (via store/db.js), plus robuste et durable.
 * Miroir de SECOURS : localStorage (clé `coachperso.ia.v1`) — garantit un
 * démarrage instantané et un repli si IndexedDB est indisponible.
 *
 * L'état de travail `Etat.data` reste un objet SYNCHRONE en mémoire : toute
 * l'interface lit/écrit dedans sans await. `sauver()` reste synchrone (écrit
 * localStorage tout de suite) et planifie en arrière-plan l'écriture IndexedDB.
 * `init()` (asynchrone) charge/migre les données au démarrage avant le rendu.
 */
import { idbGet, idbSet, idbDisponible } from "./db.js";
import { IDENTITE } from "../config/identite.js";
import { etatVide, normaliserEtat, choisirEtat } from "./migrate.js";

// La clé vient de src/config/identite.js — un identifiant TECHNIQUE, séparé du
// nom affiché : renommer l'application ne doit jamais couper l'accès à
// l'historique déjà écrit sous cette clé.
const KEY = IDENTITE.cleStockage;
const IDB_CLE = "state";        // clé de l'état complet dans IndexedDB

/** Écriture IndexedDB différée (anti-rafale) : id du timer en cours. */
let _timerIDB = null;

export const Etat = {
  data: etatVide(),

  /**
   * Charge l'état depuis localStorage (SYNCHRONE, historique). Utilisé comme
   * repli instantané ; `init()` complète ensuite avec IndexedDB.
   */
  charger() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = normaliserEtat(JSON.parse(raw));
    } catch (e) { console.error("charger", e); }
    return this.data;
  },

  /**
   * Initialise la persistance : localStorage d'abord (repli immédiat), puis
   * IndexedDB (source principale). Migre sans rien effacer :
   *  - si IndexedDB est vide → on l'amorce avec les données localStorage ;
   *  - sinon → on garde la source la plus riche des deux (aucune perte).
   */
  async init() {
    // 1) Repli synchrone immédiat depuis localStorage.
    this.charger();
    const depuisLS = this.data;

    // 2) Lecture IndexedDB (si disponible).
    if (!idbDisponible()) return this.data;
    let depuisIDB = null;
    try {
      const brut = await idbGet(IDB_CLE);
      if (brut && typeof brut === "object") depuisIDB = normaliserEtat(brut);
    } catch (e) { console.error("init idbGet", e); }

    if (!depuisIDB) {
      // Première utilisation d'IndexedDB : migration depuis localStorage.
      this.data = normaliserEtat(depuisLS);
      try { await idbSet(IDB_CLE, this.data); } catch (e) { console.error("init migration", e); }
    } else {
      // Les deux existent : « dernière écriture gagne » (via _savedAt), sinon la
      // plus riche. Évite de perdre une séance en cours écrite juste avant fermeture.
      this.data = normaliserEtat(choisirEtat(depuisIDB, depuisLS));
      try { await idbSet(IDB_CLE, this.data); } catch (e) { /* miroir best-effort */ }
    }
    // Réaligne le miroir localStorage.
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* quota : ignoré */ }
    return this.data;
  },

  /**
   * Enregistre l'état : localStorage tout de suite (miroir sûr), IndexedDB en
   * différé. Renvoie le succès de l'écriture localStorage (contrat historique).
   */
  sauver() {
    // Horodatage « dernière écriture gagne » partagé par les deux miroirs.
    this.data._savedAt = Date.now();
    let okLS = false;
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); okLS = true; }
    catch (e) { console.error("sauver", e); }
    this._planifierIDB();
    return okLS;
  },

  /** Programme une écriture IndexedDB de l'état complet (débattue ~250 ms). */
  _planifierIDB() {
    if (!idbDisponible()) return;
    if (_timerIDB) clearTimeout(_timerIDB);
    _timerIDB = setTimeout(() => {
      _timerIDB = null;
      // Copie figée pour éviter les modifications concurrentes pendant l'écriture.
      let instantane;
      try { instantane = JSON.parse(JSON.stringify(this.data)); }
      catch (e) { instantane = this.data; }
      idbSet(IDB_CLE, instantane).catch((e) => console.error("sauver IDB", e));
    }, 250);
  },

  reset() { this.data = etatVide(); this.sauver(); },

  /** Identifiant unique (idempotence des logs pour la future synchro). */
  uid() {
    return (crypto?.randomUUID?.() || ("id-" + Date.now() + "-" + Math.random().toString(36).slice(2)));
  },

  /** Deux dernières performances réalisées pour un exercice (pour la progression). */
  perfs(exerciceId) {
    const out = [];
    for (let i = this.data.logs.length - 1; i >= 0 && out.length < 2; i--) {
      const ex = (this.data.logs[i].exercices || []).find((e) => e.exerciceId === exerciceId);
      if (ex) out.push({ series: ex.series, douleur: !!ex.douleur });
    }
    return out; // [derniere, avantDerniere]
  },
};

/** Planning des jours d'entraînement (jours ISO, 1=lundi) selon la fréquence. */
export function planningJours(jours) {
  return ({ 1: [3], 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 6], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] })[jours] || [1, 3, 5];
}

/** Séance prévue aujourd'hui (ou null les jours de repos). */
export function seanceDuJour(programme) {
  if (!programme) return null;
  const isoAujourdhui = ((new Date().getDay() + 6) % 7) + 1;
  const planning = planningJours(programme.seances.length);
  const idx = planning.indexOf(isoAujourdhui);
  return idx >= 0 ? programme.seances[idx] : null;
}
