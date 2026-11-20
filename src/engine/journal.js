// @ts-check
/**
 * JOURNAL DES SÉANCES — ajouter une séance oubliée, corriger ou supprimer une
 * séance passée, garder le ressenti de chaque séance.
 *
 * L'historique (`logs`) est la seule source des records, statistiques, cycles
 * et de la rotation du programme : chaque opération renvoie un NOUVEAU tableau
 * trié par date (les moteurs lisent les séances dans l'ordre chronologique).
 * Module pur, sans DOM.
 */

/** Ressentis possibles (même échelle que `reglages.ressenti`). */
export const RESSENTIS_LOG = [-1, -0.4, 0.4, 1];

/** Bornes de saisie raisonnables : au-delà, c'est une faute de frappe. */
const MAX = { chargeKg: 700, reps: 500, rir: 10, rpe: 10, dureeSec: 6 * 3600, distanceM: 300000 };

/** Tri chronologique stable (copie). */
export function trierLogs(logs) {
  return (logs || []).map((l, i) => ({ l, i }))
    .sort((a, b) => (Date.parse(a.l.date) || 0) - (Date.parse(b.l.date) || 0) || a.i - b.i)
    .map((x) => x.l);
}

const nombre = (v) => (v === "" || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

/**
 * Nettoie une série : nombres bornés, champs vides à null, type conservé.
 * @returns {any|null} null si la série ne mesure rien
 */
export function nettoyerSerie(s) {
  if (!s || typeof s !== "object") return null;
  const borne = (k) => { const n = nombre(s[k]); return n == null || n < 0 ? null : Math.min(n, MAX[k]); };
  const out = {
    chargeKg: borne("chargeKg"),
    reps: borne("reps") == null ? null : Math.round(/** @type {number} */ (borne("reps"))),
    rir: borne("rir"),
    dureeSec: borne("dureeSec") == null ? null : Math.round(/** @type {number} */ (borne("dureeSec"))),
    distanceM: borne("distanceM") == null ? null : Math.round(/** @type {number} */ (borne("distanceM"))),
  };
  const rpe = borne("rpe");
  if (rpe != null) out.rpe = rpe;
  if (typeof s.type === "string" && s.type && s.type !== "normale") out.type = s.type.slice(0, 20);
  const mesure = (out.reps || 0) > 0 || (out.dureeSec || 0) > 0 || (out.distanceM || 0) > 0;
  return mesure ? out : null;
}

/**
 * Vérifie une séance avant enregistrement.
 * @param {any} log
 * @param {number} [maintenant]
 * @returns {string|null} message d'erreur en français, ou null
 */
export function validerLog(log, maintenant = Date.now()) {
  const t = Date.parse(log && log.date);
  if (!Number.isFinite(t)) return "Date invalide.";
  if (t > maintenant + 5 * 60000) return "La date est dans le futur : une séance passée ne peut pas être datée après maintenant.";
  if (t < Date.parse("2000-01-01")) return "Date trop ancienne.";
  const exos = (log.exercices || []).filter((e) => e && e.exerciceId);
  if (!exos.length) return "Ajoute au moins un exercice.";
  if (!exos.some((e) => (e.series || []).length || e.douleur)) return "Ajoute au moins une série (répétitions, durée ou distance).";
  return null;
}

/**
 * Date + heure locales (« 2026-11-12 », « 18:30 ») → ISO.
 * @param {string} jour
 * @param {string} [heure]
 */
export function isoLocal(jour, heure = "18:00") {
  const [a, m, j] = String(jour || "").split("-").map(Number);
  const [hh, mm] = String(heure || "18:00").split(":").map(Number);
  if (!a || !m || !j) return null;
  const d = new Date(a, m - 1, j, Number.isFinite(hh) ? hh : 18, Number.isFinite(mm) ? mm : 0, 0, 0);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

/**
 * Construit une séance à partir d'une saisie (ajout après coup ou correction).
 * `fin` (= date de la séance, comme pour une séance live) et `debut` découlent
 * du jour, de l'heure de fin et de la durée.
 *
 * @param {{id:string, jour:string, heure?:string, dureeMin?:number|string, nom?:string,
 *   seanceId?:string|null, ressenti?:number|null, exercices:any[], base?:any}} saisie
 *   `base` : séance d'origine en cas de correction (ses autres champs sont gardés)
 * @returns {any}
 */
export function construireLog(saisie) {
  const fin = isoLocal(saisie.jour, saisie.heure);
  const dureeMin = Math.max(0, Math.min(600, Math.round(Number(saisie.dureeMin) || 0)));
  const debut = fin ? new Date(Date.parse(fin) - dureeMin * 60000).toISOString() : null;
  const exercices = (saisie.exercices || [])
    .filter((e) => e && typeof e.exerciceId === "string" && e.exerciceId)
    .map((e) => {
      const series = (e.series || []).map(nettoyerSerie).filter(Boolean);
      const out = { ...e, series };
      if (!e.douleur) delete out.douleur;
      return out;
    })
    .filter((e) => e.series.length || e.douleur);
  const base = saisie.base || {};
  const log = {
    ...base,
    id: saisie.id,
    date: fin, debut, fin,
    dureeSec: dureeMin * 60,
    seanceId: saisie.seanceId !== undefined ? saisie.seanceId : base.seanceId ?? null,
    seanceNom: String(saisie.nom || base.seanceNom || "Séance").trim().slice(0, 80) || "Séance",
    exercices,
  };
  if (RESSENTIS_LOG.includes(Number(saisie.ressenti))) log.ressenti = Number(saisie.ressenti);
  else delete log.ressenti;
  if (saisie.base) log.modifieLe = new Date().toISOString();
  else log.ajoutManuel = true;
  return log;
}

/** Ajoute une séance et renvoie l'historique trié. */
export function ajouterLog(logs, log) {
  return trierLogs([...(logs || []), log]);
}

/** Remplace la séance `id` (correction) et renvoie l'historique trié. */
export function remplacerLog(logs, id, log) {
  return trierLogs((logs || []).map((l) => (l.id === id ? log : l)));
}

/** Supprime la séance `id`. */
export function supprimerLog(logs, id) {
  return (logs || []).filter((l) => l.id !== id);
}

/**
 * Séances groupées par mois, la plus récente d'abord.
 * @returns {{cle:string, libelle:string, logs:any[]}[]}
 */
export function parMois(logs) {
  /** @type {Map<string, any[]>} */
  const m = new Map();
  for (const l of [...trierLogs(logs)].reverse()) {
    const d = new Date(l.date);
    if (!Number.isFinite(d.getTime())) continue;
    const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!m.has(cle)) m.set(cle, []);
    /** @type {any[]} */ (m.get(cle)).push(l);
  }
  return [...m.entries()].map(([cle, ls]) => {
    const [a, mo] = cle.split("-").map(Number);
    const libelle = new Date(a, mo - 1, 1).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    return { cle, libelle: libelle.charAt(0).toUpperCase() + libelle.slice(1), logs: ls };
  });
}
