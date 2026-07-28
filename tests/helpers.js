// @ts-check
/**
 * Fabrique de profils pour les tests.
 * @param {Partial<import("../src/models.js").Profil>} [over]
 * @returns {import("../src/models.js").Profil}
 */
export function makeProfil(over = {}) {
  return /** @type {any} */ ({
    prenom: "Test", age: 35, sexe: "H", tailleCm: 178, poidsKg: 82, masseGrassePct: null,
    objectif: "prise_muscle", objectifsSecondaires: [], niveau: "intermediaire",
    joursParSemaine: 3, dureeSeanceMin: 60, lieu: "salle",
    equipements: ["poids_du_corps", "halteres", "barre", "banc", "rack", "poulie", "barre_traction", "machine_guidee", "machine_leviers", "elastiques", "kettlebell"],
    musclesPrioritaires: [], exercicesAimes: [], exercicesRefuses: [],
    limitations: [], prefCardio: false, unites: "metrique",
    recuperation: 4, sommeilH: 7.5, stress: 2,
    ...over,
  });
}

/** @type {Partial<import("../src/models.js").Profil>} */
export const SANS_MATERIEL = { equipements: ["poids_du_corps"], lieu: "maison", niveau: "debutant" };
