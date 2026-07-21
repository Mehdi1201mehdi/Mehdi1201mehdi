// @ts-check
/**
 * Moteur nutritionnel — besoins caloriques et macros.
 * Déterministe et testable. Estimation de départ (Mifflin-St Jeor), à ajuster
 * selon la tendance de poids sur 1–2 semaines (jamais sur une seule pesée).
 * Ne constitue pas un avis diététique médical.
 */

/** Métabolisme de base (Mifflin-St Jeor). */
export function bmr(profil) {
  // Replis prudents : évite tout NaN si un champ est manquant (import abîmé…).
  const poids = Number(profil.poidsKg) > 0 ? Number(profil.poidsKg) : 75;
  const taille = Number(profil.tailleCm) > 0 ? Number(profil.tailleCm) : 175;
  const age = Number(profil.age) > 0 ? Number(profil.age) : 30;
  const base = 10 * poids + 6.25 * taille - 5 * age;
  if (profil.sexe === "F") return base - 161;
  if (profil.sexe === "H") return base + 5;
  return base - 78; // moyenne si non précisé
}

/** Facteur d'activité déduit des jours d'entraînement + cardio (1.35 → ~1.6). */
export function facteurActivite(profil) {
  let f = 1.35 + 0.045 * (profil.joursParSemaine || 3);
  if (profil.prefCardio) f += 0.05;
  return Math.min(1.65, Math.round(f * 100) / 100);
}

/** Ajustement calorique (%) selon l'objectif. */
export function ajustementObjectif(objectif) {
  return ({
    perte_graisse: -0.18, recomposition: -0.05, prise_muscle: 0.10,
    force: 0.05, endurance: 0, remise_forme: -0.05, mobilite: 0, prepa_physique: 0.03,
  })[objectif] ?? 0;
}

/**
 * Besoins nutritionnels journaliers.
 * @returns {{bmr:number, tdee:number, kcal:number, prot:number, lip:number, gluc:number, eau:number, imc:number, refKg:number, facteur:number}}
 */
export function calculerBesoins(profil) {
  const b = Math.round(bmr(profil));
  const facteur = facteurActivite(profil);
  const tdee = Math.round(b * facteur);
  const kcal = Math.round(tdee * (1 + ajustementObjectif(profil.objectif)) / 10) * 10;

  const poids = Number(profil.poidsKg) > 0 ? Number(profil.poidsKg) : 75;
  const taille = Number(profil.tailleCm) > 0 ? Number(profil.tailleCm) : 175;
  const imc = poids / Math.pow(taille / 100, 2);
  // poids de référence prudent si IMC élevé (évite de surestimer protéines/lipides)
  const refKg = imc > 27 ? Math.round(25 * Math.pow(taille / 100, 2)) : poids;

  const prot = Math.round(refKg * (profil.objectif === "perte_graisse" ? 2.2 : 2.0));
  const lip = Math.round(refKg * 0.8);
  const gluc = Math.max(0, Math.round((kcal - prot * 4 - lip * 9) / 4));
  const eau = Math.min(3.5, Math.round(poids * 0.033 * 10) / 10);

  return { bmr: b, tdee, kcal, prot, lip, gluc, eau, imc: Math.round(imc * 10) / 10, refKg, facteur };
}
