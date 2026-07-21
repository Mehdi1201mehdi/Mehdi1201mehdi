// @ts-check
/**
 * Programme « Anatoly » — Powerbuilding sur 8 semaines.
 * Contenu intégré depuis le PDF fourni par l'utilisateur, traduit en français.
 * Les séries et répétitions sont FIDÈLES au document (aucune modification).
 * `ref` = identifiant d'un exercice de la bibliothèque existante (pour réutiliser
 * l'animation/la fiche) quand un mouvement équivalent existe ; sinon null.
 */

/** Fabrique un exercice : nom FR, nb de séries, répétitions (chaîne), réf média, note. */
const e = (nom, series, reps, ref = null, note = "") => ({ nom, series, reps, ref, note });

export const ANATOLY_INFO = {
  titre: "Powerbuilding",
  nbSemaines: 8,
  intro: "Programme de 8 semaines pour développer la force et la forme esthétique — sans négliger les articulations et les ligaments. Avant de commencer, note tes records actuels au développé couché, au soulevé de terre et au squat : tu les compareras à la fin du programme.",
  echauffement: "Échauffe-toi 10 à 15 min avant chaque séance (cardio léger + mobilité). Ajoute des séries d'approche : environ 15 s par exercice avant les séries de travail.",
  repos: [
    ["Exercices de base (squat / développé couché / soulevé de terre)", "4 min"],
    ["Entre les autres séries", "2 min"],
    ["Entre les exercices", "3 min"],
  ],
  consignes: [
    "Choix de la charge : sur les séries de travail, prends une charge exigeante en gardant 1 répétition en réserve. Sur la dernière série, donne tout. 8 à 12 répétitions propres restent excellentes.",
    "La technique prime. Dès qu'elle se dégrade, le mouvement devient dangereux : garde toujours le contrôle.",
    "Quand augmenter la charge : si tu termines les répétitions prévues assez facilement (2-3 reps encore en réserve), ajoute un peu de poids. Si tu bloques déjà sur la dernière rep, reste à la même charge.",
    "Progresse par essai-erreur, sans te comparer aux autres. Débutant : ne te précipite pas pour charger, au risque de te blesser.",
  ],
  abdos: {
    titre: "Abdos & gainage — 1 fois par semaine",
    exercices: [
      e("Relevés de jambes à la barre fixe", 3, "20", "releve-genoux"),
      e("Russian twist avec charge", 3, "20"),
      e("Hyperextensions (lombaires) avec charge", 3, "10", "superman"),
      e("Ciseaux (abdominaux)", 3, "40 sec"),
      e("Gainage (planche, le plus longtemps possible)", 1, "max", "gainage-frontal"),
    ],
  },
};

export const ANATOLY_SEMAINES = [
  // ─────────────────────────── SEMAINE 1 ───────────────────────────
  { n: 1, jours: [
    { jour: "Lundi", groupe: "Jambes", exercices: [
      e("Squat à la barre (barre trap, prise haute)", 3, "12", "squat-barre"),
      e("Presse à cuisses (pieds bas)", 2, "15", "presse-cuisses"),
      e("Soulevé de terre aux haltères (pause 1 s en bas)", 3, "8", "souleve-terre-roumain-halteres"),
      e("Squats sur une jambe (avec ou sans appui)", 3, "10", "squat-bulgare-halteres"),
      e("Sauts verticaux maximaux (le plus haut possible)", 4, "10"),
    ] },
    { jour: "Mercredi", groupe: "Pectoraux, Biceps, Épaules", exercices: [
      e("Développé couché (pause 2 s en bas)", 3, "10", "developpe-couche-barre"),
      e("Dips (lestés ou non)", 3, "10", "dips-banc"),
      e("Développé incliné aux haltères (45°)", 3, "8", "developpe-couche-halteres"),
      e("Développé sur banc prière (prayer bench)", 3, "15"),
      e("Curl marteau", 3, "8", "curl-halteres"),
      e("Curl haltères en supination sur banc incliné (45°)", 3, "10", "curl-halteres"),
      e("Balancés des bras debout", 2, "20"),
    ] },
    { jour: "Vendredi", groupe: "Dos, Triceps", exercices: [
      e("Soulevé de terre (sumo ou classique, au choix)", 3, "10", "souleve-terre-roumain-barre"),
      e("Rowing barre buste penché", 2, "10", "rowing-barre"),
      e("Tirage vertical prise large", 3, "10", "tirage-vertical-poulie"),
      e("Rowing haltères sur banc", 3, "12", "rowing-halteres-buste-penche"),
      e("Shrugs (haussements d'épaules) aux haltères", 3, "12"),
      e("Extensions triceps à la poulie", 3, "12", "extension-triceps-poulie"),
    ] },
  ] },
  // ─────────────────────────── SEMAINE 2 ───────────────────────────
  { n: 2, jours: [
    { jour: "Lundi", groupe: "Jambes, Épaules", exercices: [
      e("Squat à la barre", 2, "8", "squat-barre"),
      e("Squat à la barre avec pause en bas", 2, "7", "squat-barre"),
      e("Presse à cuisses (position large et haute)", 4, "12", "presse-cuisses"),
      e("Fentes marchées aux haltères (par jambe)", 3, "10", "fente-poids-du-corps"),
      e("Élévations latérales assis aux haltères", 3, "15", "elevations-laterales-halteres"),
      e("Développé militaire debout à la barre", 3, "8", "developpe-epaules-halteres"),
    ] },
    { jour: "Mercredi", groupe: "Pectoraux, Triceps", exercices: [
      e("Développé incliné (30°)", 3, "10", "developpe-couche-barre"),
      e("Développé couché aux haltères", 3, "10", "developpe-couche-halteres"),
      e("Écartés à la poulie (crossover)", 3, "12", "ecarte-poulie"),
      e("Développé couché prise serrée", 3, "8", "developpe-couche-barre"),
      e("Élévations frontales assis aux haltères", 3, "10"),
      e("Pompes (maximum)", 1, "max", "pompes"),
    ] },
    { jour: "Vendredi", groupe: "Dos, Biceps", exercices: [
      e("Soulevé de terre depuis une box (3-5 cm)", 3, "8", "souleve-terre-roumain-barre"),
      e("Soulevé de terre", 2, "3", "souleve-terre-roumain-barre"),
      e("Tractions (ou tirage vertical)", 3, "10", "tractions"),
      e("Rowing haltères buste penché", 3, "10", "rowing-halteres-buste-penche"),
      e("Shrugs assis aux haltères", 3, "10"),
      e("Curl barre (prise droite)", 3, "12", "curl-halteres"),
      e("Curl barre prise inversée", 2, "15", "curl-halteres"),
    ] },
  ] },
  // ─────────────────────────── SEMAINE 3 ───────────────────────────
  { n: 3, jours: [
    { jour: "Lundi", groupe: "Jambes", exercices: [
      e("Squat à la barre", 4, "6", "squat-barre"),
      e("Squat avant (front squat)", 2, "10", "squat-barre"),
      e("Soulevé de terre", 3, "10", "souleve-terre-roumain-barre"),
      e("Presse à cuisses (pause 3 s en bas)", 3, "8", "presse-cuisses"),
      e("Sauts verticaux maximaux", 3, "10"),
    ] },
    { jour: "Mercredi", groupe: "Pectoraux", exercices: [
      e("Développé couché aux haltères", 3, "8", "developpe-couche-halteres"),
      e("Développé couché à la barre prise serrée", 2, "10", "developpe-couche-barre"),
      e("Dips aux barres parallèles (lestés si possible)", 3, "8", "dips-banc"),
      e("Écartés (pectoraux)", 4, "12", "ecarte-poulie"),
      e("Plate press (serrage d'un disque bras tendus)", 2, "20"),
    ] },
    { jour: "Vendredi", groupe: "Dos", exercices: [
      e("Soulevé de terre", 3, "7", "souleve-terre-roumain-barre"),
      e("Rack pull (barre 3-5 cm au-dessus du genou)", 2, "9", "souleve-terre-roumain-barre"),
      e("Rowing assis à la poulie", 3, "10"),
      e("Tirage vertical prise large", 3, "10", "tirage-vertical-poulie"),
      e("Pull-over bras tendus à la poulie", 4, "12"),
    ] },
    { jour: "Samedi", groupe: "Bras et Épaules", exercices: [
      e("Curl marteau", 3, "8", "curl-halteres"),
      e("Curl barre prise large", 3, "8", "curl-halteres"),
      e("Barre au front (skull crushers)", 3, "8"),
      e("Extensions triceps aux haltères sur banc incliné", 4, "12"),
      e("Élévations latérales assis aux haltères", 4, "15", "elevations-laterales-halteres"),
    ] },
  ] },
  // ─────────────────────────── SEMAINE 4 ───────────────────────────
  { n: 4, jours: [
    { jour: "Lundi", groupe: "Jambes", exercices: [
      e("Squat", 5, "5", "squat-barre"),
      e("Presse à cuisses (pause 3 s en bas)", 3, "8", "presse-cuisses"),
      e("Squat avant aux haltères", 4, "12", "goblet-squat"),
      e("Sauts en longueur", 3, "8"),
      e("Hyperextensions lestées", 3, "10", "superman"),
    ] },
    { jour: "Mercredi", groupe: "Développé couché", exercices: [
      e("Développé couché", 5, "5", "developpe-couche-barre"),
      e("Développé haltères prise serrée", 3, "10", "developpe-couche-halteres"),
      e("Écartés inclinés (30°)", 3, "12", "ecarte-poulie"),
      e("Écartés à la poulie (crossover)", 4, "15", "ecarte-poulie"),
      e("Extensions triceps à la poulie", 3, "12", "extension-triceps-poulie"),
      e("Développé couché prise serrée (3 s en descente, 1 s en montée — avec un pareur)", 3, "5", "developpe-couche-barre"),
    ] },
    { jour: "Vendredi", groupe: "Dos et Biceps", exercices: [
      e("Soulevé de terre", 5, "5", "souleve-terre-roumain-barre"),
      e("Tractions (ou tirage à la poulie)", 4, "8", "tractions"),
      e("Rowing horizontal à la poulie", 4, "10"),
      e("Rowing barre buste penché (charge modérée, focus sur la contraction)", 3, "10", "rowing-barre"),
    ] },
  ] },
  // ─────────────────────────── SEMAINE 5 ───────────────────────────
  { n: 5, jours: [
    { jour: "Lundi", groupe: "Jambes", exercices: [
      e("Squat", 4, "4", "squat-barre"),
      e("Squat avant (front squat)", 3, "10", "squat-barre"),
      e("Presse à cuisses", 3, "10", "presse-cuisses"),
      e("Sauts en hauteur", 4, "12"),
      e("Squats sur une jambe (avec appui possible)", 2, "10", "squat-bulgare-halteres"),
    ] },
    { jour: "Mercredi", groupe: "Pectoraux", exercices: [
      e("Développé couché", 4, "4", "developpe-couche-barre"),
      e("Développé couché (pause 4 s en bas)", 3, "3", "developpe-couche-barre"),
      e("Développé couché aux haltères", 3, "12", "developpe-couche-halteres"),
      e("Pull-over", 3, "12"),
      e("Développé au sol (floor press)", 2, "max", "developpe-sol-halteres"),
    ] },
    { jour: "Vendredi", groupe: "Dos et Jambes", exercices: [
      e("Soulevé de terre", 4, "4", "souleve-terre-roumain-barre"),
      e("Presse à cuisses", 3, "10", "presse-cuisses"),
      e("Rowing à la poulie (pause 2 s en position contractée)", 5, "8"),
      e("Sauts verticaux", 3, "10"),
    ] },
  ] },
  // ─────────────────────────── SEMAINE 6 ───────────────────────────
  { n: 6, jours: [
    { jour: "Lundi", groupe: "Jambes", exercices: [
      e("Squat", 3, "3", "squat-barre"),
      e("Squat à la barre trap", 3, "10", "squat-barre"),
      e("Presse à cuisses", 3, "10", "presse-cuisses"),
      e("Squat sumo, haltère contre la poitrine", 3, "10", "goblet-squat"),
    ] },
    { jour: "Mercredi", groupe: "Pectoraux", exercices: [
      e("Développé couché", 3, "3", "developpe-couche-barre"),
      e("Développé incliné (45°)", 3, "8", "developpe-couche-barre"),
      e("Développé militaire debout à la barre", 3, "6", "developpe-epaules-halteres"),
      e("Développé incliné aux haltères (40°)", 4, "15", "developpe-couche-halteres"),
    ] },
    { jour: "Vendredi", groupe: "Dos", exercices: [
      e("Soulevé de terre", 3, "3", "souleve-terre-roumain-barre"),
      e("Rowing barre prise inversée buste penché", 3, "8", "rowing-barre"),
      e("Tirage vertical à la poulie", 3, "10", "tirage-vertical-poulie"),
      e("Rowing à la T-barre", 4, "10", "rowing-barre"),
      e("Shrugs à la barre", 4, "10"),
    ] },
  ] },
  // ─────────────────────────── SEMAINE 7 ───────────────────────────
  { n: 7, jours: [
    { jour: "Lundi", groupe: "Jambes et Épaules", exercices: [
      e("Squat", 2, "2", "squat-barre"),
      e("Squat avant (front squat)", 3, "12", "squat-barre"),
      e("Presse à cuisses sumo", 3, "10", "presse-cuisses"),
      e("Développé militaire debout à la barre", 3, "6", "developpe-epaules-halteres"),
      e("Développé épaules assis aux haltères", 3, "10", "developpe-epaules-halteres"),
    ] },
    { jour: "Mercredi", groupe: "Pectoraux et Triceps", exercices: [
      e("Développé couché", 2, "2", "developpe-couche-barre"),
      e("Développé incliné aux haltères (30°)", 3, "10", "developpe-couche-halteres"),
      e("Dips", 3, "15", "dips-banc"),
      e("Barre au front aux haltères sur banc incliné (30°)", 3, "12"),
      e("Extensions triceps à la poulie", 4, "12", "extension-triceps-poulie"),
    ] },
    { jour: "Vendredi", groupe: "Dos et Biceps", exercices: [
      e("Soulevé de terre", 2, "2", "souleve-terre-roumain-barre"),
      e("Rowing barre buste penché", 3, "8", "rowing-barre"),
      e("Rowing haltères buste penché", 3, "10", "rowing-halteres-buste-penche"),
      e("Tractions", 3, "10", "tractions"),
      e("Curl barre prise inversée", 3, "10", "curl-halteres"),
      e("Curl biceps à la poulie", 3, "20", "curl-halteres"),
    ] },
  ] },
  // ─────────────────────────── SEMAINE 8 ───────────────────────────
  { n: 8, jours: [
    { jour: "Lundi", groupe: "Jambes et Épaules", exercices: [
      e("Squat (test de record : 1 rep max)", 1, "1", "squat-barre", "Test de force — échauffe-toi bien avant."),
      e("Squat", 3, "12", "squat-barre"),
      e("Presse à cuisses", 3, "15", "presse-cuisses"),
      e("Élévations latérales aux haltères", 4, "12", "elevations-laterales-halteres"),
      e("Développé épaules debout aux haltères", 3, "12", "developpe-epaules-halteres"),
    ] },
    { jour: "Mercredi", groupe: "Pectoraux et Biceps", exercices: [
      e("Développé couché (test de record : 1 rep max)", 1, "1", "developpe-couche-barre", "Test de force — échauffe-toi bien avant."),
      e("Développé couché", 3, "10", "developpe-couche-barre"),
      e("Développé incliné aux haltères", 3, "10", "developpe-couche-halteres"),
      e("Curl marteau", 5, "5", "curl-halteres"),
      e("Curl biceps unilatéral à la poulie", 3, "10", "curl-halteres"),
    ] },
    { jour: "Samedi", groupe: "Soulevé de terre", exercices: [
      e("Rowing barre buste penché (maximum)", 1, "max", "rowing-barre"),
      e("Rowing barre buste penché", 3, "8", "rowing-barre"),
      e("Tirage vertical à la poulie", 5, "10", "tirage-vertical-poulie"),
      e("Extensions triceps à la poulie", 3, "12", "extension-triceps-poulie"),
      e("Barre au front aux haltères sur banc plat", 3, "10"),
      e("Pompes diamant (maximum)", 2, "max", "pompes"),
    ] },
  ] },
];
