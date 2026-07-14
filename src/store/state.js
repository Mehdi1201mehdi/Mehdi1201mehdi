// @ts-check
/**
 * État applicatif + persistance LOCALE (mono-utilisateur, hors ligne).
 * Stockage : localStorage (simple et fiable). Chaque enregistrement de séance
 * porte un identifiant unique idempotent, prêt pour une synchro ultérieure.
 */
const KEY = "coachperso.ia.v1";

/** @returns {any} */
function etatVide() {
  return {
    version: 1,
    profil: null,
    programme: null,
    logs: /** @type {any[]} */ ([]),      // séances réalisées
    metrics: /** @type {any[]} */ ([]),   // poids / mensurations
    mediaCache: /** @type {Record<string,string>} */ ({}), // exId -> URL de GIF résolue
    reglages: { theme: "auto", unites: "metrique", sons: true, vibrations: true, rapidKey: "" },
  };
}

export const Etat = {
  data: etatVide(),

  charger() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) this.data = Object.assign(etatVide(), JSON.parse(raw));
    } catch (e) { console.error("charger", e); }
    return this.data;
  },

  sauver() {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); return true; }
    catch (e) { console.error("sauver", e); return false; }
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
