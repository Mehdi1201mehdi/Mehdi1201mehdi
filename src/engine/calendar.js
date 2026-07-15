// @ts-check
/**
 * Calendrier d'assiduité — calcul pur de la grille mensuelle des séances
 * réalisées, à partir de Etat.data.logs. Aucune dépendance au DOM ; le mois
 * affiché est un paramètre explicite (pas de lecture de "aujourd'hui" ici),
 * pour rester testable et déterministe.
 */

export const NOMS_MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
export const NOMS_JOURS_COURTS = ["L", "M", "M", "J", "V", "S", "D"];

function iso2(n) { return String(n).padStart(2, "0"); }

/**
 * Grille d'un mois (semaines de lundi à dimanche) avec le nombre de séances
 * réalisées chaque jour.
 * @param {number} annee
 * @param {number} mois 1-12
 * @param {any[]} logs Etat.data.logs
 */
export function grilleMois(annee, mois, logs) {
  const prefixe = `${annee}-${iso2(mois)}`;
  const parJour = new Map();
  for (const log of logs || []) {
    const d = typeof log?.date === "string" ? log.date.slice(0, 10) : "";
    if (!d) continue;
    parJour.set(d, (parJour.get(d) || 0) + 1);
  }

  const premier = new Date(Date.UTC(annee, mois - 1, 1));
  const decalage = (premier.getUTCDay() + 6) % 7; // 0 = lundi
  const nbJours = new Date(Date.UTC(annee, mois, 0)).getUTCDate();

  const cases = [];
  for (let i = 0; i < decalage; i++) cases.push(null);
  let joursEntraines = 0, totalSeances = 0;
  for (let j = 1; j <= nbJours; j++) {
    const iso = `${prefixe}-${iso2(j)}`;
    const seances = parJour.get(iso) || 0;
    if (seances > 0) { joursEntraines += 1; totalSeances += seances; }
    cases.push({ jour: j, iso, seances });
  }
  while (cases.length % 7 !== 0) cases.push(null);

  return { annee, mois, nomMois: NOMS_MOIS[mois - 1], cases, joursEntraines, totalSeances };
}

/** Mois +/- delta, avec report d'année correct dans les deux sens. */
export function moisAdjacent(annee, mois, delta) {
  const total = (annee * 12 + (mois - 1)) + delta;
  return { annee: Math.floor(total / 12), mois: (((total % 12) + 12) % 12) + 1 };
}
