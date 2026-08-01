// @ts-check
/**
 * SIGNATURE SONORE — synthétisée, aucun fichier audio.
 *
 * Pourquoi du son dans une app de musculation : à la salle, on a de la musique
 * dans les oreilles, les mains occupées, et le téléphone posé par terre. Le seul
 * canal qui reste disponible entre deux séries, c'est l'oreille. Un repos qui se
 * termine doit s'entendre sans qu'on ait à regarder l'écran.
 *
 * Trois règles de conception :
 *
 *   1. UN SON = UNE INFORMATION QU'ON NE PEUT PAS VOIR. Pas de son décoratif.
 *      Rien ne sonne pour un changement d'onglet ou l'ouverture d'un écran.
 *   2. COURT ET SEC. 40 à 260 ms. Un son long devient une nuisance dès la
 *      troisième série ; un son court se remarque puis s'oublie.
 *   3. DANS LA BANDE QUI PERCE. 400–2 600 Hz : au-dessus d'une basse de musique,
 *      en dessous du strident. Les fréquences sont choisies dans une gamme
 *      pentatonique — deux sons de l'app ne peuvent jamais être dissonants.
 *
 * Tout est synthétisé par oscillateurs : zéro octet à télécharger, fonctionne
 * hors ligne dès la première ouverture, et le timbre reste cohérent d'un son à
 * l'autre parce qu'ils partagent la même enveloppe.
 */

/**
 * Gamme pentatonique mineure en La — la seule utilisée par l'app.
 * Sans demi-tons voisins, deux notes quelconques sonnent juste ensemble : même
 * si un son en chevauche un autre (validation rapide pendant un décompte), le
 * résultat reste consonant.
 */
export const GAMME = { la: 440, do: 523.25, re: 587.33, mi: 659.25, sol: 783.99, la2: 880, do2: 1046.5, mi2: 1318.5 };

/**
 * @typedef {object} Note
 * @property {number} f      fréquence en Hz
 * @property {number} t      départ en secondes, relatif au début du son
 * @property {number} d      durée en secondes
 * @property {number} [gain] volume 0–1 (défaut 1)
 * @property {OscillatorType} [forme] timbre (défaut "sine")
 */

/**
 * @typedef {object} Son
 * @property {string} quoi   ce que le son dit à l'utilisateur
 * @property {Note[]} notes
 */

/**
 * La palette complète. C'est de la DONNÉE : elle se relit, se teste et se règle
 * sans toucher au moteur audio.
 * @type {Record<string, Son>}
 */
export const PALETTE = {
  // Série validée. Le geste le plus répété : il doit être discret au point
  // qu'on puisse l'entendre vingt fois sans s'en lasser. Un seul clic, bref.
  valider: {
    quoi: "la série est enregistrée",
    notes: [
      { f: GAMME.mi2, t: 0, d: 0.05, gain: 0.5 },
      { f: GAMME.la2, t: 0.012, d: 0.07, gain: 0.32 },
    ],
  },
  // Décompte du repos : les trois dernières secondes. Même note à chaque fois,
  // volontairement — c'est la RÉPÉTITION qui informe, pas la hauteur.
  compte: {
    quoi: "le repos se termine dans quelques secondes",
    notes: [{ f: GAMME.la, t: 0, d: 0.07, gain: 0.42 }],
  },
  // Fin du repos. Le seul son de l'app qui doit s'entendre par-dessus de la
  // musique : trois notes montantes, plus longues, plus fortes.
  reprise: {
    quoi: "c'est reparti, va à la barre",
    notes: [
      { f: GAMME.la, t: 0, d: 0.11, gain: 0.55 },
      { f: GAMME.do2, t: 0.09, d: 0.11, gain: 0.6 },
      { f: GAMME.mi2, t: 0.18, d: 0.20, gain: 0.66 },
    ],
  },
  // Record personnel. Célébration sobre : quatre notes, pas une fanfare.
  record: {
    quoi: "tu viens de battre un record",
    notes: [
      { f: GAMME.la, t: 0, d: 0.09, gain: 0.44 },
      { f: GAMME.do2, t: 0.07, d: 0.09, gain: 0.48 },
      { f: GAMME.mi2, t: 0.14, d: 0.09, gain: 0.52 },
      { f: GAMME.la2, t: 0.21, d: 0.24, gain: 0.5, forme: "triangle" },
    ],
  },
  // Séance terminée et enregistrée.
  termine: {
    quoi: "la séance est enregistrée",
    notes: [
      { f: GAMME.mi, t: 0, d: 0.13, gain: 0.45 },
      { f: GAMME.la2, t: 0.11, d: 0.26, gain: 0.5, forme: "triangle" },
    ],
  },
  // Annulation / retour en arrière : descendant, très discret.
  annuler: {
    quoi: "l'action a été annulée",
    notes: [
      { f: GAMME.do2, t: 0, d: 0.06, gain: 0.28 },
      { f: GAMME.la, t: 0.05, d: 0.09, gain: 0.24 },
    ],
  },
};

/** Bande passante admise : au-dessus des basses, en dessous du strident. */
export const BANDE_HZ = [380, 2600];
/** Durée totale maximale d'un son, en secondes. Au-delà, c'est une nuisance. */
export const DUREE_MAX_S = 0.5;

/**
 * Durée totale d'un son (dernière note comprise).
 * @param {Son} son
 * @returns {number} secondes
 */
export function dureeSon(son) {
  if (!son || !Array.isArray(son.notes) || !son.notes.length) return 0;
  const fin = son.notes.reduce((max, n) => Math.max(max, (n.t || 0) + (n.d || 0)), 0);
  // Arrondi à la milliseconde : la virgule flottante rendrait 0,30000000000000004
  // pour 0,1 + 0,2, et aucune oreille ne distingue la microseconde.
  return Math.round(fin * 1000) / 1000;
}

/* ============================ MOTEUR AUDIO ============================ */

/** @type {AudioContext|null} */
let ctx = null;
/** @type {GainNode|null} */
let maitre = null;

/**
 * Le contexte audio ne peut être créé qu'à l'intérieur d'un geste utilisateur —
 * les navigateurs mobiles refusent tout son autrement. On le crée donc au
 * premier appui, une seule fois, puis on le garde.
 */
function contexte() {
  if (ctx) return ctx;
  const AC = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
    maitre = ctx.createGain();
    // Plafond global : même en enchaînant des sons, l'app ne peut pas devenir
    // plus forte qu'un notification système.
    maitre.gain.value = 0.5;
    maitre.connect(ctx.destination);
  } catch (e) { return null; }
  return ctx;
}

/**
 * Prépare le moteur audio depuis un geste utilisateur. À appeler une fois, tôt.
 * Sans cela, le premier son de la séance serait avalé par le navigateur.
 */
export function amorcerSon() {
  const c = contexte();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

/** Le son est-il autorisé par les réglages ? (défaut : oui) */
function autorise(reglages) {
  return !reglages || reglages.sons !== false;
}

/**
 * Joue un son de la palette. Silencieux et sans erreur si l'audio n'est pas
 * disponible : un son est un confort, jamais une dépendance.
 *
 * @param {string} nom clé de `PALETTE`
 * @param {{sons?:boolean}} [reglages] réglages utilisateur
 */
export function jouer(nom, reglages) {
  if (!autorise(reglages)) return;
  const son = PALETTE[nom];
  if (!son) return;
  const c = contexte();
  if (!c || !maitre) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const t0 = c.currentTime + 0.005;
  for (const n of son.notes) {
    try {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = n.forme || "sine";
      osc.frequency.setValueAtTime(n.f, t0 + n.t);
      // Enveloppe : attaque très courte pour la netteté, extinction
      // exponentielle pour éviter le clic de coupure.
      const vol = n.gain == null ? 1 : n.gain;
      g.gain.setValueAtTime(0.0001, t0 + n.t);
      g.gain.exponentialRampToValueAtTime(vol, t0 + n.t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.t + n.d);
      osc.connect(g); g.connect(maitre);
      osc.start(t0 + n.t);
      osc.stop(t0 + n.t + n.d + 0.02);
    } catch (e) { /* un son raté ne doit jamais interrompre une séance */ }
  }
}
