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
import { estSerieTravail } from "../engine/records.js";
import { prochaineSeance } from "../engine/adaptation.js";

// La clé vient de src/config/identite.js — un identifiant TECHNIQUE, séparé du
// nom affiché : renommer l'application ne doit jamais couper l'accès à
// l'historique déjà écrit sous cette clé.
const KEY = IDENTITE.cleStockage;
const IDB_CLE = "state";        // clé de l'état complet dans IndexedDB

/** Écriture IndexedDB différée (anti-rafale) : id du timer en cours. */
let _timerIDB = null;
let _dernierLSok = true;
let _dernierSignal = 0;

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

    // Demande au navigateur de ne pas évincer les données quand le téléphone
    // manque de place (sans effet s'il refuse ; jamais bloquant).
    try {
      if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } catch (e) { /* API absente : on continue */ }

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
    _dernierLSok = okLS;
    // Les deux miroirs se couvrent : un échec de localStorage (quota) n'est
    // grave que si IndexedDB ne prend pas le relais. Sans IndexedDB, on
    // prévient tout de suite — avant, l'échec passait totalement inaperçu.
    if (!okLS && !idbDisponible()) this._signalerEchec();
    this._planifierIDB();
    return okLS;
  },

  /**
   * Appelée quand AUCUN des deux stockages n'a pu enregistrer. L'interface y
   * branche un message (`Etat.surEchec = …`) ; au plus un signal par minute.
   * @type {null | (() => void)}
   */
  surEchec: null,
  _signalerEchec() {
    const t = Date.now();
    if (t - _dernierSignal < 60000) return;
    _dernierSignal = t;
    try { if (typeof this.surEchec === "function") this.surEchec(); } catch (e) { /* le signal ne doit jamais casser l'enregistrement */ }
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
      idbSet(IDB_CLE, instantane).catch((e) => { console.error("sauver IDB", e); if (!_dernierLSok) this._signalerEchec(); });
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
      // Séries de travail seulement : les approches fausseraient la charge
      // conseillée et décaleraient la colonne « Précédent ».
      if (ex) out.push({ series: (ex.series || []).filter(estSerieTravail), douleur: !!ex.douleur, techniqueDegradee: !!ex.techniqueDegradee, note: ex.note || null });
    }
    return out; // [derniere, avantDerniere]
  },
  /**
   * Les `n` dernières séances d'un exercice (la plus récente d'abord), séries
   * de travail seulement — sert à détecter une stagnation.
   */
  historique(exerciceId, n = 8) {
    const out = [];
    for (let i = this.data.logs.length - 1; i >= 0 && out.length < n; i--) {
      const l = this.data.logs[i];
      const ex = (l.exercices || []).find((e) => e.exerciceId === exerciceId);
      if (ex) out.push({ date: l.date, series: (ex.series || []).filter(estSerieTravail), douleur: !!ex.douleur, techniqueDegradee: !!ex.techniqueDegradee });
    }
    return out;
  },
};

/** Planning des jours d'entraînement (jours ISO, 1=lundi) selon la fréquence. */
export function planningJours(jours) {
  return ({ 1: [3], 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 6], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6] })[jours] || [1, 3, 5];
}

/**
 * État de la semaine du programme : prochaine séance de la rotation, séances
 * manquées, jours restants (voir engine/adaptation.js).
 */
export function etatSemaine(programme, maintenant = Date.now()) {
  if (!programme || !Array.isArray(programme.seances) || !programme.seances.length) return null;
  return prochaineSeance(programme, Etat.data.logs || [], { maintenant, joursPlanifies: planningJours(programme.seances.length) });
}

/**
 * Séance à faire aujourd'hui (ou null les jours de repos).
 * La rotation reprend là où on s'est arrêté : une séance manquée lundi est
 * proposée mercredi au lieu d'être sautée. Rien n'est proposé un jour de repos
 * prévu si l'on est à jour, ni après la séance du jour.
 */
export function seanceDuJour(programme, maintenant = Date.now()) {
  const e = etatSemaine(programme, maintenant);
  if (!e || e.dejaAujourdhui || e.semaineFaite) return null;
  return e.prevuAujourdhui || e.manquees > 0 ? e.seance : null;
}
