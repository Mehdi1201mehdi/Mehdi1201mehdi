// @ts-check
/**
 * Défis & régularité — fonctions PURES dérivées uniquement des vraies séances
 * (aucune donnée inventée, aucun stockage). Sert à motiver : séries de jours,
 * objectifs hebdo/mensuels, grille d'assiduité.
 */

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Ensemble des jours (YYYY-MM-DD) où au moins une séance a été enregistrée. */
export function joursEntraines(logs) {
  return new Set((logs || []).map((l) => l.date && l.date.slice(0, 10)).filter(Boolean));
}

/** Série de jours consécutifs en cours (se terminant aujourd'hui ou hier). */
export function serieActuelle(logs, now = new Date()) {
  const jours = joursEntraines(logs);
  let n = 0; const d = new Date(now);
  if (!jours.has(iso(d))) d.setDate(d.getDate() - 1);
  while (jours.has(iso(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/** Plus longue série de jours consécutifs jamais réalisée. */
export function meilleureSerie(logs) {
  const jours = [...joursEntraines(logs)].sort();
  let best = 0, cur = 0, prev = null;
  for (const j of jours) {
    if (prev) {
      const diff = Math.round((Date.parse(j) - Date.parse(prev)) / 864e5);
      cur = diff === 1 ? cur + 1 : 1;
    } else cur = 1;
    if (cur > best) best = cur;
    prev = j;
  }
  return best;
}

/** Nombre de séances sur les `jours` derniers jours. */
export function seancesDepuis(logs, jours, now = new Date()) {
  const seuil = now.getTime() - jours * 864e5;
  return (logs || []).filter((l) => { const t = Date.parse(l.date); return Number.isFinite(t) && t >= seuil; }).length;
}

/** Nombre de jours DISTINCTS d'entraînement sur les `jours` derniers jours. */
export function joursActifsDepuis(logs, jours, now = new Date()) {
  const seuil = now.getTime() - jours * 864e5;
  const set = new Set();
  for (const l of logs || []) { const t = Date.parse(l.date); if (Number.isFinite(t) && t >= seuil) set.add(l.date.slice(0, 10)); }
  return set.size;
}

/** Séances de la semaine ISO courante (lundi→dimanche). */
export function seancesSemaine(logs, now = new Date()) {
  const d = new Date(now); const lundi = new Date(d);
  lundi.setDate(d.getDate() - ((d.getDay() + 6) % 7)); lundi.setHours(0, 0, 0, 0);
  const jours = joursEntraines(logs);
  let n = 0;
  for (let i = 0; i < 7; i++) { const x = new Date(lundi); x.setDate(lundi.getDate() + i); if (jours.has(iso(x))) n++; }
  return n;
}

/**
 * Grille des `n` derniers jours pour l'affichage d'assiduité.
 * @returns {{iso:string, done:boolean, jour:number, today:boolean}[]}
 */
export function grilleJours(logs, n = 28, now = new Date()) {
  const jours = joursEntraines(logs);
  const today = iso(new Date(now));
  const base = new Date(now); base.setHours(0, 0, 0, 0);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(base); d.setDate(base.getDate() - i);
    const s = iso(d);
    out.push({ iso: s, done: jours.has(s), jour: d.getDate(), today: s === today });
  }
  return out;
}

/**
 * Défis actifs, dérivés des séances réelles et du profil.
 * @returns {{id:string, titre:string, sousTitre:string, valeur:number, cible:number, pct:number}[]}
 */
export function defis(logs, profil = {}, now = new Date()) {
  const parSem = Math.max(1, profil.joursParSemaine || 3);
  const semaine = seancesSemaine(logs, now);
  const mois = seancesDepuis(logs, 30, now);
  const cibleMois = Math.round(parSem * 4.3);
  const actifs = joursActifsDepuis(logs, 30, now);
  return [
    { id: "semaine", titre: "Semaine complète", sousTitre: `${semaine}/${parSem} séances cette semaine`, valeur: semaine, cible: parSem },
    { id: "mois", titre: "Défi du mois", sousTitre: `${mois}/${cibleMois} séances sur 30 jours`, valeur: mois, cible: cibleMois },
    { id: "actifs", titre: "Jours actifs", sousTitre: `${actifs}/15 jours d'entraînement (30 j)`, valeur: actifs, cible: 15 },
  ].map((x) => ({ ...x, pct: Math.max(0, Math.min(1, x.cible ? x.valeur / x.cible : 0)) }));
}
