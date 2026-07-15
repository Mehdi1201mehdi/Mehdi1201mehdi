// @ts-check
/**
 * Moteur de bilan & ajustement — DÉTERMINISTE (pas d'IA).
 * Lit la tendance de poids (moyenne 7 jours) et de tour de taille sur ~2
 * semaines, et propose UNE seule action selon l'objectif. Jamais de décision
 * sur une pesée isolée. Ne constitue pas un avis médical.
 */

/** Moyenne d'un champ sur les 7 jours se terminant à `endStr` (YYYY-MM-DD). */
export function moyenne7(metrics, endStr, champ = "poidsKg") {
  const end = new Date(endStr + "T23:59:59");
  const start = new Date(end); start.setDate(start.getDate() - 6);
  const vals = metrics
    .filter((m) => m[champ] != null)
    .filter((m) => { const t = new Date(m.date); return t >= start && t <= end; })
    .map((m) => m[champ]);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

/**
 * Bilan des 2 dernières semaines.
 * @returns {{statut:string, message:string}}
 */
export function bilan(profil, metrics, today = new Date().toISOString().slice(0, 10)) {
  const now = moyenne7(metrics, today);
  const d14 = new Date(today); d14.setDate(d14.getDate() - 14);
  const prev = moyenne7(metrics, d14.toISOString().slice(0, 10));

  const avecTaille = metrics.filter((m) => m.taille != null).sort((a, b) => (a.date < b.date ? -1 : 1));
  const dernier = avecTaille[avecTaille.length - 1];
  const tailleNow = dernier ? dernier.taille : null;
  // on compare à une mesure d'au moins 10 jours plus ancienne (tolérant aux horaires)
  const seuil = dernier ? new Date(new Date(dernier.date).getTime() - 10 * 864e5) : null;
  const ancien = seuil ? avecTaille.filter((mm) => new Date(mm.date) <= seuil).pop() : null;
  const taillePrev = ancien ? ancien.taille : null;
  const tailleBaisse = tailleNow != null && taillePrev != null ? tailleNow < taillePrev : null;

  if (now == null || prev == null) {
    return { statut: "insuffisant", message: "Pas assez de pesées sur 2 semaines. Pèse-toi 3 à 4 fois par semaine (le matin, à jeun) pour obtenir une tendance fiable." };
  }
  const dPct = (prev - now) / prev * 100 / 2; // %/semaine, positif = perte
  const perte = ["perte_graisse", "recomposition"].includes(profil.objectif);
  const prise = profil.objectif === "prise_muscle";

  if (perte) {
    if (dPct >= 0.3 && dPct <= 0.8) return { statut: "on_garde", message: `✔ Perte d'environ ${dPct.toFixed(2)} %/semaine (cible 0,3–0,8 %). On ne change rien : même alimentation, continue la progression en séance.` };
    if (dPct > 0.8) return { statut: "trop_rapide", message: `⚠ Perte rapide (~${dPct.toFixed(2)} %/sem). Une seule action : +100 à 200 kcal (glucides) ou réduis un peu le cardio. Surveille sommeil et énergie.` };
    if (dPct < 0.1 && tailleBaisse) return { statut: "recomposition", message: "Poids stable mais tour de taille en baisse : recomposition corporelle probable. Ne réduis pas les calories, continue." };
    if (dPct < 0.15) return { statut: "stagnation", message: "Poids quasi stable depuis 2 semaines. Une seule action : soit −150 kcal, soit +2 000 pas/jour — jamais les deux en même temps." };
    return { statut: "lent", message: `Perte lente (~${dPct.toFixed(2)} %/sem), acceptable. Option : +1 000 pas/jour avant de toucher aux calories.` };
  }
  if (prise) {
    if (dPct <= -0.1 && dPct >= -0.4) return { statut: "on_garde", message: `✔ Prise d'environ ${(-dPct).toFixed(2)} %/semaine (cible 0,1–0,4 %). Rythme idéal, on continue.` };
    if (dPct > -0.05) return { statut: "stagnation", message: "Poids stable : pour prendre du muscle, +150 kcal/jour (glucides autour de la séance) et vérifie que les charges progressent." };
    if (dPct < -0.4) return { statut: "trop_rapide", message: `⚠ Prise rapide (~${(-dPct).toFixed(2)} %/sem) : réduis le surplus de 100–150 kcal pour limiter la prise de gras.` };
    return { statut: "lent", message: "Progression correcte, continue et surveille tes charges." };
  }
  return { statut: "maintien", message: "Objectif de maintien / forme : garde le cap tant que l'énergie et les performances sont bonnes." };
}
