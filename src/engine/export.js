// @ts-check
/**
 * Export CSV — séances réalisées et suivi corporel (poids/mensurations).
 * Déterministe et pur : ne touche ni au DOM ni au localStorage. La couche UI
 * se contente de récupérer la chaîne CSV et de déclencher le téléchargement.
 * Séparateur ";" (compatible Excel FR, où "," est le séparateur décimal).
 */
const DELIM = ";";

/** Échappe un champ pour le CSV (guillemets si nécessaire). */
export function csvEscape(valeur) {
  const s = valeur === null || valeur === undefined ? "" : String(valeur);
  if (s.includes(DELIM) || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Construit un CSV (avec BOM UTF-8, pour un affichage correct des accents dans Excel). */
export function toCSV(headers, rows) {
  const lignes = [headers, ...rows].map((r) => r.map(csvEscape).join(DELIM));
  return "﻿" + lignes.join("\r\n") + "\r\n";
}

/** Date ISO -> "YYYY-MM-DD" (chaîne, pas de dépendance au fuseau via Date). */
function dateCourte(iso) {
  return typeof iso === "string" && iso.length >= 10 ? iso.slice(0, 10) : "";
}

/**
 * CSV détaillé des séances réalisées : une ligne par série effectuée.
 * @param {any[]} logs Etat.data.logs
 * @param {(id:string) => string} [resoudreNom] résolveur exerciceId -> nom (par défaut : identité)
 */
export function seancesVersCSV(logs, resoudreNom = (id) => id) {
  const headers = ["Date", "Séance", "Exercice", "Série", "Reps", "Charge (kg)", "Durée (s)", "RIR", "Douleur"];
  const rows = [];
  for (const log of logs || []) {
    const date = dateCourte(log.date);
    const nomSeance = log.seanceNom || "";
    for (const ex of log.exercices || []) {
      const nomExo = resoudreNom(ex.exerciceId) || ex.exerciceId || "";
      const series = ex.series || [];
      if (!series.length) {
        rows.push([date, nomSeance, nomExo, "", "", "", "", "", ex.douleur ? "oui" : "non"]);
        continue;
      }
      series.forEach((s, i) => {
        rows.push([
          date, nomSeance, nomExo, String(i + 1),
          s.reps ?? "", s.chargeKg ?? "", s.dureeSec ?? "", s.rir ?? "",
          ex.douleur ? "oui" : "non",
        ]);
      });
    }
  }
  return toCSV(headers, rows);
}

/**
 * CSV du suivi corporel : une ligne par relevé (poids et/ou mensurations), triée
 * par date. Les six premières colonnes sont celles d'origine (inchangées pour
 * qui a déjà des tableurs branchés dessus) ; suivent la masse grasse et les
 * mesures gauche / droite (engine/corps.js). Masses en kg, longueurs en cm.
 * @param {any[]} metrics Etat.data.metrics
 */
export function metriquesVersCSV(metrics) {
  const colonnes = [
    ["poidsKg", "Poids (kg)"], ["taille", "Tour de taille (cm)"], ["poitrine", "Poitrine (cm)"],
    ["bras", "Bras (cm)"], ["cuisse", "Cuisse (cm)"],
    ["masseGrassePct", "Masse grasse (%)"], ["cou", "Cou (cm)"], ["epaules", "Épaules (cm)"],
    ["hanches", "Hanches (cm)"], ["poignet", "Poignet (cm)"],
    ["brasG", "Biceps gauche (cm)"], ["brasD", "Biceps droit (cm)"],
    ["avantBrasG", "Avant-bras gauche (cm)"], ["avantBrasD", "Avant-bras droit (cm)"],
    ["cuisseG", "Cuisse gauche (cm)"], ["cuisseD", "Cuisse droite (cm)"],
    ["molletG", "Mollet gauche (cm)"], ["molletD", "Mollet droit (cm)"],
  ];
  const headers = ["Date", ...colonnes.map(([, l]) => l)];
  const rows = (metrics || []).filter((m) => m && m.date).slice()
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((m) => [dateCourte(m.date), ...colonnes.map(([k]) => m[k] ?? "")]);
  return toCSV(headers, rows);
}

/** Nom de fichier horodaté (jour courant), pour proposer un téléchargement stable. */
export function nomFichierExport(prefixe, dateISO = new Date().toISOString()) {
  return `${prefixe}-${dateCourte(dateISO)}.csv`;
}
