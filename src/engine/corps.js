// @ts-check
/**
 * Mensurations : 16 mesures, gauche / droite, masse grasse, comparaison de
 * dates, asymétries, export. Fonctions PURES.
 *
 * Stockage : chaque relevé est une entrée de `Etat.data.metrics`
 *   { id, date(ISO), poidsKg?, masseGrassePct?, poitrine?, taille?, ... }
 * — le format historique (poids, taille, poitrine, bras, cuisse) est conservé
 * tel quel : « bras » et « cuisse » d'avant la distinction gauche / droite
 * restent affichés comme « côté non précisé », jamais réattribués à un côté.
 * Masses en kg, longueurs en cm, masse grasse en %.
 */

/**
 * Les 16 mesures (même périmètre que FitAI : poids, masse grasse, poitrine,
 * taille, hanches, épaules, cou, poignet, biceps / avant-bras / cuisse /
 * mollet à gauche et à droite) + les 2 champs historiques sans côté.
 * `min`/`max` : bornes de plausibilité (une faute de frappe « 3 » au lieu de
 * « 38 » est refusée plutôt qu'enregistrée).
 * @type {{cle:string, label:string, court:string, groupe:string, type:"masse"|"pct"|"longueur", min:number, max:number, paire?:string, cote?:"G"|"D", historique?:boolean}[]}
 */
export const CHAMPS_MESURES = [
  { cle: "poidsKg", label: "Poids du corps", court: "Poids", groupe: "Général", type: "masse", min: 25, max: 350 },
  { cle: "masseGrassePct", label: "Masse grasse", court: "Masse grasse", groupe: "Général", type: "pct", min: 2, max: 70 },
  { cle: "cou", label: "Cou", court: "Cou", groupe: "Haut du corps", type: "longueur", min: 20, max: 70 },
  { cle: "epaules", label: "Épaules", court: "Épaules", groupe: "Haut du corps", type: "longueur", min: 60, max: 200 },
  { cle: "poitrine", label: "Poitrine", court: "Poitrine", groupe: "Haut du corps", type: "longueur", min: 50, max: 200 },
  { cle: "taille", label: "Tour de taille", court: "Taille", groupe: "Haut du corps", type: "longueur", min: 40, max: 200 },
  { cle: "hanches", label: "Hanches", court: "Hanches", groupe: "Haut du corps", type: "longueur", min: 50, max: 200 },
  { cle: "brasG", label: "Biceps gauche", court: "Biceps G", groupe: "Bras", type: "longueur", min: 15, max: 70, paire: "bras", cote: "G" },
  { cle: "brasD", label: "Biceps droit", court: "Biceps D", groupe: "Bras", type: "longueur", min: 15, max: 70, paire: "bras", cote: "D" },
  { cle: "avantBrasG", label: "Avant-bras gauche", court: "Avant-bras G", groupe: "Bras", type: "longueur", min: 15, max: 55, paire: "avantBras", cote: "G" },
  { cle: "avantBrasD", label: "Avant-bras droit", court: "Avant-bras D", groupe: "Bras", type: "longueur", min: 15, max: 55, paire: "avantBras", cote: "D" },
  { cle: "poignet", label: "Poignet", court: "Poignet", groupe: "Bras", type: "longueur", min: 10, max: 30 },
  { cle: "cuisseG", label: "Cuisse gauche", court: "Cuisse G", groupe: "Jambes", type: "longueur", min: 30, max: 100, paire: "cuisse", cote: "G" },
  { cle: "cuisseD", label: "Cuisse droite", court: "Cuisse D", groupe: "Jambes", type: "longueur", min: 30, max: 100, paire: "cuisse", cote: "D" },
  { cle: "molletG", label: "Mollet gauche", court: "Mollet G", groupe: "Jambes", type: "longueur", min: 20, max: 65, paire: "mollet", cote: "G" },
  { cle: "molletD", label: "Mollet droit", court: "Mollet D", groupe: "Jambes", type: "longueur", min: 20, max: 65, paire: "mollet", cote: "D" },
  // Champs historiques (relevés antérieurs, sans côté) : lus, jamais proposés à la saisie.
  { cle: "bras", label: "Bras (côté non précisé)", court: "Bras", groupe: "Bras", type: "longueur", min: 15, max: 70, historique: true },
  { cle: "cuisse", label: "Cuisse (côté non précisé)", court: "Cuisse", groupe: "Jambes", type: "longueur", min: 30, max: 100, historique: true },
];

export const CHAMPS_SAISIE = CHAMPS_MESURES.filter((c) => !c.historique);
export const GROUPES_MESURES = [...new Set(CHAMPS_SAISIE.map((c) => c.groupe))];
const PAR_CLE = Object.fromEntries(CHAMPS_MESURES.map((c) => [c.cle, c]));

/** Définition d'un champ, ou undefined. */
export function champMesure(cle) {
  return PAR_CLE[cle];
}

/**
 * Valide une valeur (déjà convertie en unité de stockage) pour un champ.
 * @returns {{ok:true, v:number}|{ok:false, erreur:string}}
 */
export function validerMesure(cle, v) {
  const c = PAR_CLE[cle];
  if (!c) return { ok: false, erreur: "Mesure inconnue." };
  const n = Number(v);
  if (!Number.isFinite(n)) return { ok: false, erreur: `${c.label} : valeur illisible.` };
  if (n < c.min || n > c.max) {
    const u = c.type === "masse" ? "kg" : c.type === "pct" ? "%" : "cm";
    return { ok: false, erreur: `${c.label} : ${n} ${u} semble improbable (attendu entre ${c.min} et ${c.max} ${u}).` };
  }
  return { ok: true, v: Math.round(n * 100) / 100 };
}

/**
 * Construit un relevé à partir de valeurs DÉJÀ converties (kg, cm, %).
 * Les champs vides sont ignorés ; un relevé sans aucune mesure est refusé.
 * @param {Record<string, number|null|undefined>} valeurs
 * @param {string} dateISO
 * @param {string} id
 * @returns {{ok:true, releve:any}|{ok:false, erreurs:string[]}}
 */
export function construireReleve(valeurs, dateISO, id) {
  const releve = { id, date: dateISO };
  const erreurs = [];
  for (const [cle, v] of Object.entries(valeurs || {})) {
    if (v === null || v === undefined || v === "") continue;
    const r = validerMesure(cle, v);
    if (r.ok) releve[cle] = r.v; else erreurs.push(r.erreur);
  }
  if (erreurs.length) return { ok: false, erreurs };
  if (Object.keys(releve).length <= 2) return { ok: false, erreurs: ["Aucune mesure saisie."] };
  return { ok: true, releve };
}

/** Relevés triés par date croissante, ne gardant que ceux qui portent une mesure connue. */
export function relevesTries(metrics) {
  return (metrics || [])
    .filter((m) => m && m.date && CHAMPS_MESURES.some((c) => m[c.cle] != null))
    .slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Jour local « AAAA-MM-JJ » d'une date ISO. */
export function jourLocal(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * État du corps À UNE DATE : pour chaque champ, la dernière valeur connue ce
 * jour-là ou avant (les mesures ne sont pas toutes prises le même jour : on ne
 * compare pas un tour de bras à « rien » parce qu'il a été pris la veille).
 * @param {any[]} metrics
 * @param {string} jour  « AAAA-MM-JJ » (inclus)
 * @returns {Record<string, {v:number, date:string}>}
 */
export function etatAu(metrics, jour) {
  /** @type {Record<string, {v:number, date:string}>} */
  const out = {};
  for (const m of relevesTries(metrics)) {
    if (jourLocal(m.date) > jour) break;
    for (const c of CHAMPS_MESURES) if (m[c.cle] != null) out[c.cle] = { v: Number(m[c.cle]), date: m.date };
  }
  return out;
}

/** Jours (« AAAA-MM-JJ ») où au moins une mesure a été relevée, du plus récent au plus ancien. */
export function joursDeMesure(metrics) {
  return [...new Set(relevesTries(metrics).map((m) => jourLocal(m.date)))].sort().reverse();
}

/**
 * Compare l'état du corps à deux dates : valeur A, valeur B, écart (B − A).
 * Chaque colonne porte la dernière valeur connue à sa date ; une valeur est
 * « fraîche » si elle a été relevée dans les `fenetreJours` précédant la date
 * de la colonne. L'écart n'est calculé que si les DEUX valeurs sont fraîches :
 * un tour de bras de septembre recopié en novembre n'est pas une mesure de
 * novembre, et afficher « = » laisserait croire à une stagnation.
 * @param {any[]} metrics
 * @param {string} jourA
 * @param {string} jourB
 * @param {number} [fenetreJours]
 */
export function comparerMesures(metrics, jourA, jourB, fenetreJours = 7) {
  const a = etatAu(metrics, jourA), b = etatAu(metrics, jourB);
  const frais = (x, jour) => !!x && (Date.parse(jour + "T23:59:59") - Date.parse(x.date)) <= (fenetreJours + 1) * 864e5;
  return CHAMPS_MESURES
    .filter((c) => a[c.cle] || b[c.cle])
    .map((c) => {
      const xa = a[c.cle], xb = b[c.cle];
      const va = xa ? xa.v : null, vb = xb ? xb.v : null;
      const fraisA = frais(xa, jourA), fraisB = frais(xb, jourB);
      return {
        cle: c.cle, label: c.label, type: c.type, a: va, b: vb,
        dateA: xa ? xa.date : null, dateB: xb ? xb.date : null, fraisA, fraisB,
        delta: va != null && vb != null && fraisA && fraisB ? Math.round((vb - va) * 100) / 100 : null,
      };
    });
}

/**
 * Asymétries gauche / droite à une date : écart absolu (cm) et relatif au
 * côté le plus fort. Au-delà de 5 %, l'écart est signalé — il est courant
 * (côté dominant) mais mérite d'être suivi, surtout s'il se creuse.
 * @param {any[]} metrics
 * @param {string} jour
 */
export function asymetries(metrics, jour) {
  const e = etatAu(metrics, jour);
  const paires = [...new Set(CHAMPS_SAISIE.filter((c) => c.paire).map((c) => /** @type {string} */ (c.paire)))];
  const out = [];
  for (const p of paires) {
    const g = e[`${p}G`], d = e[`${p}D`];
    if (!g || !d) continue;
    const ecart = Math.round(Math.abs(g.v - d.v) * 10) / 10;
    const pct = Math.round((Math.abs(g.v - d.v) / Math.max(g.v, d.v)) * 1000) / 10;
    out.push({ paire: p, gauche: g.v, droite: d.v, ecartCm: ecart, ecartPct: pct, plusFort: g.v === d.v ? null : g.v > d.v ? "G" : "D", aSurveiller: pct > 5 });
  }
  return out;
}
