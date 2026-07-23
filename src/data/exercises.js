// @ts-check
/**
 * Base d'exercices ORIGINALE (contenus rédigés pour ce projet).
 * Aucun texte, image ou vidéo copié d'une application existante.
 * Les médias sont volontairement `null` : ils seront produits/ajoutés par le
 * propriétaire du projet (pas de vidéo sous licence tierce embarquée).
 *
 * Sémantique `equipement` : liste d'équipements TOUS requis (ET logique).
 * Les variantes par matériel sont des exercices distincts (barre vs haltères…),
 * ce qui alimente directement le moteur de remplacement « autre équipement ».
 *
 * `difficulte` : 1=grand débutant, 2=débutant, 3=intermédiaire, 4=avancé.
 */

/**
 * @typedef {import("../models.js").MUSCLES} _M
 */

const AUTEUR = "Coach Perso";
const REVISION = "2026-07-14";

/** Fabrique un exercice avec des valeurs par défaut prudentes. */
function ex(o) {
  return {
    nomsAlternatifs: [], musclesSecondaires: [], musclesStabilisateurs: [],
    equipementsAlternatifs: [], unilateral: false, chaine: "fermee",
    dureeSec: null, contreIndications: [], tags: [],
    media: { miniature: null, video: null }, statut: "valide",
    auteur: AUTEUR, revision: REVISION, respiration: "", securite: "",
    ...o,
  };
}

/** @type {any[]} */
export const EXERCISES = [
  // ================= JAMBES : SQUAT =================
  ex({
    id: "squat-poids-du-corps", slug: "squat-poids-du-corps", nom: "Squat au poids du corps",
    nomsAlternatifs: ["Air squat"],
    description: "Flexion des jambes contrôlée sans charge, base de tous les mouvements de squat.",
    instructions: [
      "Pieds largeur d'épaules, pointes légèrement vers l'extérieur.",
      "Pousse les hanches vers l'arrière puis fléchis les genoux.",
      "Descends jusqu'à ce que les cuisses soient au moins parallèles au sol, dos neutre.",
      "Remonte en poussant dans les talons et en serrant les fessiers.",
    ],
    erreurs: ["Talons qui décollent", "Genoux qui rentrent vers l'intérieur", "Dos qui s'arrondit en bas"],
    respiration: "Inspire en descendant, souffle en remontant.",
    securite: "Réduis l'amplitude si tu ressens une gêne au genou.",
    difficulte: 1, typeExercice: "force", patron: "squat", unilateral: false,
    musclesPrincipaux: ["quadriceps", "fessiers"], musclesSecondaires: ["ischios"], musclesStabilisateurs: ["abdominaux", "lombaires"],
    equipement: ["poids_du_corps"], position: "debout", amplitude: "complète", tempoDefaut: "3-0-1",
    repsPertinent: [10, 20], chargeRelative: "leger", contreIndications: ["genou"],
    tags: ["maison", "fondamental", "jambes"],
  }),
  ex({
    id: "goblet-squat", slug: "goblet-squat", nom: "Goblet squat",
    description: "Squat tenu à deux mains contre la poitrine avec un haltère ou kettlebell.",
    instructions: [
      "Tiens l'haltère verticalement à hauteur de poitrine, coudes rentrés.",
      "Descends en squat en gardant le buste droit.",
      "Remonte en poussant dans les talons.",
    ],
    erreurs: ["Buste qui bascule en avant", "Charge trop lourde qui casse la technique"],
    difficulte: 2, typeExercice: "force", patron: "squat",
    musclesPrincipaux: ["quadriceps", "fessiers"], musclesSecondaires: ["ischios", "abdominaux"],
    equipement: ["halteres"], equipementsAlternatifs: ["kettlebell"], position: "debout",
    amplitude: "complète", tempoDefaut: "2-0-1", repsPertinent: [8, 12], chargeRelative: "moyen",
    contreIndications: ["genou"], tags: ["maison", "salle", "jambes"],
  }),
  ex({
    id: "squat-barre", slug: "squat-barre", nom: "Squat à la barre",
    nomsAlternatifs: ["Back squat"],
    description: "Squat lourd avec barre sur le haut du dos, mouvement de force majeur.",
    instructions: [
      "Barre sur les trapèzes, mains un peu plus larges que les épaules.",
      "Désengage la barre, recule d'un ou deux pas, pieds largeur d'épaules.",
      "Descends hanches vers l'arrière, cuisses au moins parallèles, dos neutre.",
      "Remonte en poussant dans tout le pied.",
    ],
    erreurs: ["Genoux qui rentrent", "Dos qui s'arrondit", "Talons qui décollent"],
    securite: "Utilise toujours un rack avec barres de sécurité.",
    difficulte: 3, typeExercice: "force", patron: "squat",
    musclesPrincipaux: ["quadriceps", "fessiers"], musclesSecondaires: ["ischios"], musclesStabilisateurs: ["abdominaux", "lombaires"],
    equipement: ["barre", "rack"], position: "debout", amplitude: "complète", tempoDefaut: "2-0-1",
    repsPertinent: [5, 10], chargeRelative: "lourd", contreIndications: ["genou", "dos"],
    tags: ["salle", "fondamental", "force"],
  }),
  ex({
    id: "presse-cuisses", slug: "presse-a-cuisses", nom: "Presse à cuisses",
    description: "Poussée des jambes sur machine guidée, colonne peu sollicitée.",
    instructions: ["Pieds à plat largeur d'épaules sur le plateau.", "Fléchis les genoux vers la poitrine sans décoller le bassin.", "Pousse sans verrouiller brutalement les genoux."],
    erreurs: ["Bassin qui décolle", "Amplitude trop courte", "Genoux verrouillés violemment"],
    difficulte: 2, typeExercice: "force", patron: "squat", chaine: "fermee",
    musclesPrincipaux: ["quadriceps", "fessiers"], musclesSecondaires: ["ischios"],
    equipement: ["machine_guidee"], position: "assise", amplitude: "contrôlée", tempoDefaut: "2-0-1",
    repsPertinent: [10, 15], chargeRelative: "lourd", contreIndications: [], tags: ["salle", "jambes", "sur_machine"],
  }),

  // ================= JAMBES : CHARNIÈRE / ISCHIOS =================
  ex({
    id: "pont-fessier", slug: "pont-fessier", nom: "Pont fessier",
    nomsAlternatifs: ["Glute bridge"],
    description: "Extension de hanche au sol, sûre pour le dos, cible fessiers et ischios.",
    instructions: ["Allongé sur le dos, genoux fléchis, pieds à plat.", "Pousse dans les talons et monte le bassin.", "Serre les fessiers 1 seconde en haut puis redescends."],
    erreurs: ["Cambrer les lombaires au lieu de serrer les fessiers", "Amplitude partielle"],
    difficulte: 1, typeExercice: "force", patron: "charniere_hanche",
    musclesPrincipaux: ["fessiers"], musclesSecondaires: ["ischios"], musclesStabilisateurs: ["abdominaux"],
    equipement: ["poids_du_corps"], position: "allongee", amplitude: "complète", tempoDefaut: "2-1-1",
    repsPertinent: [12, 20], chargeRelative: "leger", contreIndications: [], tags: ["maison", "fessiers", "dos_friendly"],
  }),
  ex({
    id: "souleve-terre-roumain-halteres", slug: "sdt-roumain-halteres", nom: "Soulevé de terre roumain (haltères)",
    description: "Charnière de hanche haltères, ciblage ischios et fessiers.",
    instructions: ["Haltères devant les cuisses, genoux légèrement fléchis.", "Pousse les hanches vers l'arrière, dos neutre, haltères proches des jambes.", "Descends jusqu'à sentir l'étirement des ischios puis remonte en serrant les fessiers."],
    erreurs: ["Dos arrondi", "Transformer le mouvement en squat", "Haltères trop loin du corps"],
    difficulte: 2, typeExercice: "force", patron: "charniere_hanche", chaine: "fermee",
    musclesPrincipaux: ["ischios", "fessiers"], musclesSecondaires: ["lombaires", "dorsaux"],
    equipement: ["halteres"], position: "debout", amplitude: "contrôlée", tempoDefaut: "3-0-1",
    repsPertinent: [8, 12], chargeRelative: "moyen", contreIndications: ["dos"], tags: ["maison", "salle", "ischios"],
  }),
  ex({
    id: "souleve-terre-roumain-barre", slug: "sdt-roumain-barre", nom: "Soulevé de terre roumain (barre)",
    description: "Charnière de hanche lourde à la barre.",
    instructions: ["Barre proche des tibias, prise largeur d'épaules.", "Pousse les hanches vers l'arrière, dos neutre.", "Descends la barre le long des jambes puis remonte en serrant les fessiers."],
    erreurs: ["Dos arrondi", "Barre qui s'éloigne des jambes"],
    securite: "Garde le dos neutre en permanence ; réduis la charge au moindre doute.",
    difficulte: 3, typeExercice: "force", patron: "charniere_hanche",
    musclesPrincipaux: ["ischios", "fessiers"], musclesSecondaires: ["lombaires", "dorsaux"], musclesStabilisateurs: ["abdominaux"],
    equipement: ["barre"], position: "debout", amplitude: "contrôlée", tempoDefaut: "3-0-1",
    repsPertinent: [6, 10], chargeRelative: "lourd", contreIndications: ["dos"], tags: ["salle", "force", "ischios"],
  }),
  ex({
    id: "leg-curl-machine", slug: "leg-curl-machine", nom: "Leg curl machine",
    description: "Flexion des genoux sur machine, isolation des ischios.",
    instructions: ["Cheville sous le rouleau, bassin plaqué.", "Fléchis les genoux en contrôlant.", "Contracte 1 seconde puis reviens lentement."],
    erreurs: ["Cambrer les lombaires", "Mouvement balistique"],
    difficulte: 2, typeExercice: "hypertrophie", patron: "isolation_jambe", chaine: "ouverte",
    musclesPrincipaux: ["ischios"], musclesSecondaires: ["mollets"],
    equipement: ["machine_leviers"], position: "allongee", amplitude: "complète", tempoDefaut: "2-1-2",
    repsPertinent: [10, 15], chargeRelative: "moyen", contreIndications: [], tags: ["salle", "isolation", "ischios"],
  }),

  // ================= JAMBES : FENTES / UNILATÉRAL =================
  ex({
    id: "fente-poids-du-corps", slug: "fente-poids-du-corps", nom: "Fente au poids du corps",
    description: "Fente avant unilatérale, travail des quadriceps et de l'équilibre.",
    instructions: ["Grand pas en avant.", "Descends verticalement, genou avant aligné avec le pied.", "Pousse pour revenir à la position de départ."],
    erreurs: ["Pas trop court", "Genou avant qui part en dedans", "Buste qui s'effondre"],
    difficulte: 2, typeExercice: "force", patron: "fente", unilateral: true,
    musclesPrincipaux: ["quadriceps", "fessiers"], musclesSecondaires: ["ischios"], musclesStabilisateurs: ["abdominaux"],
    equipement: ["poids_du_corps"], position: "debout", amplitude: "complète", tempoDefaut: "2-0-1",
    repsPertinent: [8, 12], chargeRelative: "leger", contreIndications: ["genou"], tags: ["maison", "unilateral", "jambes"],
  }),
  ex({
    id: "squat-bulgare-halteres", slug: "squat-bulgare-halteres", nom: "Squat bulgare (haltères)",
    description: "Fente arrière pied surélevé, haute intensité sur une jambe.",
    instructions: ["Pied arrière sur un banc ou une chaise, haltères le long du corps.", "Descends verticalement sur la jambe avant.", "Remonte en poussant dans le talon avant."],
    erreurs: ["Trop de poids sur la jambe arrière", "Genou avant qui dépasse largement le pied"],
    difficulte: 3, typeExercice: "force", patron: "fente", unilateral: true,
    musclesPrincipaux: ["quadriceps", "fessiers"], musclesSecondaires: ["ischios", "adducteurs"], musclesStabilisateurs: ["abdominaux"],
    equipement: ["halteres", "banc"], position: "debout", amplitude: "complète", tempoDefaut: "2-0-1",
    repsPertinent: [8, 12], chargeRelative: "moyen", contreIndications: ["genou"], tags: ["salle", "unilateral"],
  }),
  ex({
    id: "mollets-debout", slug: "mollets-debout", nom: "Mollets debout",
    description: "Extension des chevilles pour développer les mollets.",
    instructions: ["Debout, avant-pieds sur une marche.", "Descends les talons pour étirer.", "Monte le plus haut possible et contracte."],
    erreurs: ["Rebondir", "Amplitude partielle"],
    difficulte: 1, typeExercice: "hypertrophie", patron: "isolation_jambe",
    musclesPrincipaux: ["mollets"], equipement: ["poids_du_corps"], equipementsAlternatifs: ["halteres"],
    position: "debout", amplitude: "complète", tempoDefaut: "1-2-1", repsPertinent: [12, 20],
    chargeRelative: "leger", contreIndications: ["cheville"], tags: ["maison", "salle", "isolation"],
  }),

  // ================= POUSSÉE HORIZONTALE (PECS) =================
  ex({
    id: "pompes", slug: "pompes", nom: "Pompes",
    nomsAlternatifs: ["Push-up"],
    description: "Poussée horizontale au poids du corps, base du travail des pectoraux.",
    instructions: ["Mains un peu plus larges que les épaules, corps gainé.", "Descends la poitrine vers le sol, coudes à ~45°.", "Pousse pour remonter sans casser l'alignement."],
    erreurs: ["Bassin qui tombe", "Coudes trop écartés", "Amplitude partielle"],
    difficulte: 2, typeExercice: "force", patron: "poussee_horizontale",
    musclesPrincipaux: ["pectoraux"], musclesSecondaires: ["triceps", "epaules"], musclesStabilisateurs: ["abdominaux"],
    equipement: ["poids_du_corps"], position: "planche", amplitude: "complète", tempoDefaut: "2-0-1",
    repsPertinent: [8, 20], chargeRelative: "leger", contreIndications: ["epaule", "poignet"], tags: ["maison", "fondamental", "pecs"],
  }),
  ex({
    id: "developpe-couche-halteres", slug: "developpe-couche-halteres", nom: "Développé couché (haltères)",
    description: "Poussée horizontale haltères sur banc plat.",
    instructions: ["Allongé sur le banc, haltères au niveau de la poitrine.", "Pousse verticalement sans verrouiller violemment.", "Redescends en contrôlant vers la ligne des pectoraux."],
    erreurs: ["Cambrure excessive", "Amplitude trop courte", "Coudes trop écartés"],
    difficulte: 2, typeExercice: "hypertrophie", patron: "poussee_horizontale",
    musclesPrincipaux: ["pectoraux"], musclesSecondaires: ["triceps", "epaules"],
    equipement: ["halteres", "banc"], position: "allongee", amplitude: "complète", tempoDefaut: "2-0-1",
    repsPertinent: [8, 12], chargeRelative: "moyen", contreIndications: ["epaule"], tags: ["salle", "pecs"],
  }),
  ex({
    id: "developpe-couche-barre", slug: "developpe-couche-barre", nom: "Développé couché (barre)",
    description: "Développé couché lourd à la barre, mouvement de force du haut du corps.",
    instructions: ["Omoplates serrées, pieds au sol.", "Descends la barre vers la ligne des tétons, coudes ~45°.", "Pousse la barre à la verticale des épaules."],
    erreurs: ["Rebond sur la poitrine", "Fesses qui décollent"],
    securite: "Utilise un pareur ou un rack avec sécurités.",
    difficulte: 3, typeExercice: "force", patron: "poussee_horizontale",
    musclesPrincipaux: ["pectoraux"], musclesSecondaires: ["triceps", "epaules"], musclesStabilisateurs: ["abdominaux"],
    equipement: ["barre", "banc", "rack"], position: "allongee", amplitude: "complète", tempoDefaut: "2-0-1",
    repsPertinent: [5, 10], chargeRelative: "lourd", contreIndications: ["epaule"], tags: ["salle", "force", "pecs"],
  }),
  ex({
    id: "ecarte-poulie", slug: "ecarte-poulie", nom: "Écarté à la poulie",
    description: "Isolation des pectoraux en ouverture/fermeture des bras.",
    instructions: ["Debout entre deux poulies, léger buste en avant.", "Rapproche les mains devant toi en gardant les coudes fixes.", "Reviens en contrôlant l'étirement."],
    erreurs: ["Fléchir/étendre les coudes (ça devient une poussée)", "Charge trop lourde"],
    difficulte: 2, typeExercice: "hypertrophie", patron: "poussee_horizontale", chaine: "ouverte",
    musclesPrincipaux: ["pectoraux"], musclesSecondaires: ["epaules"],
    equipement: ["poulie"], position: "debout", amplitude: "complète", tempoDefaut: "2-1-2",
    repsPertinent: [12, 15], chargeRelative: "leger", contreIndications: ["epaule"], tags: ["salle", "isolation", "pecs"],
  }),

  // ================= POUSSÉE VERTICALE (ÉPAULES) =================
  ex({
    id: "pompes-piquees", slug: "pompes-piquees", nom: "Pompes piquées",
    nomsAlternatifs: ["Pike push-up"],
    description: "Poussée verticale au poids du corps pour les épaules.",
    instructions: ["En V inversé, bassin haut.", "Descends le sommet du crâne vers le sol.", "Pousse pour revenir."],
    erreurs: ["Bassin qui descend (ça devient une pompe)", "Amplitude courte"],
    difficulte: 3, typeExercice: "force", patron: "poussee_verticale",
    musclesPrincipaux: ["epaules"], musclesSecondaires: ["triceps"], musclesStabilisateurs: ["abdominaux"],
    equipement: ["poids_du_corps"], position: "planche", amplitude: "complète", tempoDefaut: "2-0-1",
    repsPertinent: [6, 12], chargeRelative: "leger", contreIndications: ["epaule", "poignet"], tags: ["maison", "epaules"],
  }),
  ex({
    id: "developpe-epaules-halteres", slug: "developpe-epaules-halteres", nom: "Développé épaules (haltères)",
    description: "Poussée au-dessus de la tête assis ou debout.",
    instructions: ["Haltères à hauteur d'épaules, paumes vers l'avant.", "Pousse au-dessus de la tête sans cambrer.", "Redescends en contrôlant."],
    erreurs: ["Cambrure lombaire", "Demi-amplitude"],
    difficulte: 2, typeExercice: "hypertrophie", patron: "poussee_verticale",
    musclesPrincipaux: ["epaules"], musclesSecondaires: ["triceps"], musclesStabilisateurs: ["abdominaux"],
    equipement: ["halteres"], position: "assise", amplitude: "complète", tempoDefaut: "2-0-1",
    repsPertinent: [8, 12], chargeRelative: "moyen", contreIndications: ["epaule"], tags: ["salle", "maison", "epaules"],
  }),
  ex({
    id: "elevations-laterales-halteres", slug: "elevations-laterales", nom: "Élévations latérales",
    description: "Isolation du faisceau moyen des épaules.",
    instructions: ["Coudes légèrement fléchis, haltères le long du corps.", "Monte les bras jusqu'à l'horizontale.", "Redescends lentement."],
    erreurs: ["Balancer le buste", "Monter trop haut", "Charge trop lourde"],
    difficulte: 1, typeExercice: "hypertrophie", patron: "isolation_jambe", chaine: "ouverte",
    musclesPrincipaux: ["epaules"], musclesSecondaires: ["trapezes"],
    equipement: ["halteres"], equipementsAlternatifs: ["elastiques"], position: "debout",
    amplitude: "contrôlée", tempoDefaut: "1-1-2", repsPertinent: [12, 20], chargeRelative: "leger",
    contreIndications: ["epaule"], tags: ["salle", "maison", "isolation", "epaules"],
  }),

  // ================= TIRAGE VERTICAL (DOS) =================
  ex({
    id: "tractions", slug: "tractions", nom: "Tractions",
    nomsAlternatifs: ["Pull-up"],
    description: "Tirage vertical au poids du corps, développement du grand dorsal.",
    instructions: ["Suspendu, mains un peu plus larges que les épaules.", "Tire la poitrine vers la barre, coudes vers le bas.", "Redescends en contrôlant sans relâcher totalement."],
    erreurs: ["Élan des jambes", "Demi-amplitude"],
    difficulte: 4, typeExercice: "force", patron: "tirage_vertical",
    musclesPrincipaux: ["dorsaux"], musclesSecondaires: ["biceps"], musclesStabilisateurs: ["abdominaux"],
    equipement: ["barre_traction"], equipementsAlternatifs: ["elastiques"], position: "suspendue",
    amplitude: "complète", tempoDefaut: "2-0-1", repsPertinent: [4, 10], chargeRelative: "lourd",
    contreIndications: ["epaule", "coude"], tags: ["maison", "salle", "dos", "fondamental"],
  }),
  ex({
    id: "tirage-vertical-poulie", slug: "tirage-vertical-poulie", nom: "Tirage vertical à la poulie",
    nomsAlternatifs: ["Lat pulldown"],
    description: "Alternative aux tractions, charge ajustable.",
    instructions: ["Prise un peu plus large que les épaules.", "Tire la barre vers le haut de la poitrine, coudes vers le bas.", "Reviens en contrôlant."],
    erreurs: ["Se pencher trop en arrière", "Tirer avec les bras seulement"],
    difficulte: 2, typeExercice: "hypertrophie", patron: "tirage_vertical", chaine: "ouverte",
    musclesPrincipaux: ["dorsaux"], musclesSecondaires: ["biceps"],
    equipement: ["poulie"], position: "assise", amplitude: "complète", tempoDefaut: "2-0-1",
    repsPertinent: [8, 12], chargeRelative: "moyen", contreIndications: ["epaule"], tags: ["salle", "dos"],
  }),

  // ================= TIRAGE HORIZONTAL (DOS) =================
  ex({
    id: "rowing-inverse", slug: "rowing-inverse", nom: "Rowing inversé",
    nomsAlternatifs: ["Inverted row"],
    description: "Tirage horizontal au poids du corps sous une barre basse ou une table solide.",
    instructions: ["Allongé sous une barre, corps gainé, talons au sol.", "Tire la poitrine vers la barre en serrant les omoplates.", "Redescends en contrôlant."],
    erreurs: ["Bassin qui tombe", "Amplitude courte"],
    difficulte: 2, typeExercice: "force", patron: "tirage_horizontal",
    musclesPrincipaux: ["dorsaux"], musclesSecondaires: ["biceps", "trapezes"], musclesStabilisateurs: ["abdominaux"],
    equipement: ["barre_traction"], equipementsAlternatifs: ["trx"], position: "allongee",
    amplitude: "complète", tempoDefaut: "2-1-1", repsPertinent: [8, 15], chargeRelative: "leger",
    contreIndications: [], tags: ["maison", "dos"],
  }),
  ex({
    id: "rowing-haltere-unilateral", slug: "rowing-haltere-unilateral", nom: "Rowing haltère unilatéral",
    description: "Tirage horizontal une main, appui sur un banc.",
    instructions: ["Genou et main sur le banc, dos neutre.", "Tire le coude vers la hanche.", "Serre l'omoplate 1 seconde en haut."],
    erreurs: ["Dos arrondi", "Rotation du buste par élan"],
    difficulte: 2, typeExercice: "hypertrophie", patron: "tirage_horizontal", unilateral: true,
    musclesPrincipaux: ["dorsaux"], musclesSecondaires: ["biceps", "trapezes"],
    equipement: ["halteres", "banc"], position: "penchee", amplitude: "complète", tempoDefaut: "2-1-1",
    repsPertinent: [8, 12], chargeRelative: "moyen", contreIndications: ["dos"], tags: ["salle", "maison", "dos"],
  }),
  ex({
    id: "rowing-barre", slug: "rowing-barre", nom: "Rowing barre buste penché",
    description: "Tirage horizontal lourd à la barre.",
    instructions: ["Buste penché ~45°, dos neutre.", "Tire la barre vers le bas-ventre.", "Serre les omoplates puis redescends."],
    erreurs: ["Dos arrondi", "Élan du buste"],
    securite: "Garde le dos gainé ; réduis la charge si le dos s'arrondit.",
    difficulte: 3, typeExercice: "force", patron: "tirage_horizontal",
    musclesPrincipaux: ["dorsaux", "trapezes"], musclesSecondaires: ["biceps"], musclesStabilisateurs: ["lombaires"],
    equipement: ["barre"], position: "penchee", amplitude: "complète", tempoDefaut: "2-0-1",
    repsPertinent: [6, 10], chargeRelative: "lourd", contreIndications: ["dos"], tags: ["salle", "force", "dos"],
  }),
  ex({
    id: "face-pull-elastique", slug: "face-pull-elastique", nom: "Face pull élastique",
    description: "Travail de l'arrière d'épaule et de la santé scapulaire.",
    instructions: ["Élastique ancré à hauteur du visage.", "Tire vers le front en écartant les mains.", "Serre les omoplates."],
    erreurs: ["Trop lourd", "Élan du buste"],
    difficulte: 1, typeExercice: "hypertrophie", patron: "tirage_horizontal", chaine: "ouverte",
    musclesPrincipaux: ["epaules"], musclesSecondaires: ["trapezes", "dorsaux"],
    equipement: ["elastiques"], equipementsAlternatifs: ["poulie"], position: "debout",
    amplitude: "contrôlée", tempoDefaut: "1-1-2", repsPertinent: [12, 20], chargeRelative: "leger",
    contreIndications: [], tags: ["maison", "salle", "epaules", "sante"],
  }),

  // ================= BRAS =================
  ex({
    id: "curl-halteres", slug: "curl-halteres", nom: "Curl biceps (haltères)",
    description: "Flexion des coudes pour les biceps.",
    instructions: ["Coudes fixes le long du corps.", "Monte les haltères en contractant les biceps.", "Contrôle la descente."],
    erreurs: ["Balancer le buste", "Coudes qui avancent"],
    difficulte: 1, typeExercice: "hypertrophie", patron: "flexion_bras", chaine: "ouverte",
    musclesPrincipaux: ["biceps"], musclesSecondaires: ["avant_bras"],
    equipement: ["halteres"], equipementsAlternatifs: ["elastiques", "barre_ez"], position: "debout",
    amplitude: "complète", tempoDefaut: "2-0-1", repsPertinent: [10, 15], chargeRelative: "leger",
    contreIndications: ["coude"], tags: ["maison", "salle", "bras", "isolation"],
  }),
  ex({
    id: "extension-triceps-poulie", slug: "extension-triceps-poulie", nom: "Extension triceps à la poulie",
    description: "Isolation des triceps à la poulie haute.",
    instructions: ["Coudes fixes le long du corps.", "Étends les bras vers le bas.", "Reviens en contrôlant."],
    erreurs: ["Coudes qui s'écartent", "Charge trop lourde"],
    difficulte: 1, typeExercice: "hypertrophie", patron: "extension_bras", chaine: "ouverte",
    musclesPrincipaux: ["triceps"], equipement: ["poulie"], position: "debout",
    amplitude: "complète", tempoDefaut: "2-0-1", repsPertinent: [10, 15], chargeRelative: "leger",
    contreIndications: ["coude"], tags: ["salle", "bras", "isolation"],
  }),
  ex({
    id: "dips-banc", slug: "dips-banc", nom: "Dips entre deux appuis",
    description: "Extension des bras au poids du corps entre deux chaises ou un banc.",
    instructions: ["Mains sur l'appui derrière toi, jambes devant.", "Descends en fléchissant les coudes.", "Pousse pour remonter."],
    erreurs: ["Descendre trop bas (stress épaule)", "Coudes trop écartés"],
    difficulte: 2, typeExercice: "force", patron: "extension_bras",
    musclesPrincipaux: ["triceps"], musclesSecondaires: ["pectoraux", "epaules"],
    equipement: ["poids_du_corps"], equipementsAlternatifs: ["banc"], position: "appui",
    amplitude: "contrôlée", tempoDefaut: "2-0-1", repsPertinent: [8, 15], chargeRelative: "leger",
    contreIndications: ["epaule"], tags: ["maison", "bras"],
  }),

  // ================= GAINAGE / ABDOS =================
  ex({
    id: "gainage-frontal", slug: "gainage-frontal", nom: "Gainage frontal",
    nomsAlternatifs: ["Planche"],
    description: "Maintien isométrique du tronc en position de planche.",
    instructions: ["Coudes sous les épaules, corps aligné.", "Bassin en rétroversion, abdos et fessiers serrés.", "Respire calmement pendant le maintien."],
    erreurs: ["Bassin qui tombe", "Fesses trop hautes", "Apnée"],
    difficulte: 1, typeExercice: "gainage", patron: "gainage",
    musclesPrincipaux: ["abdominaux"], musclesSecondaires: ["lombaires", "fessiers"],
    equipement: ["poids_du_corps"], position: "planche", amplitude: "isométrique", tempoDefaut: "—",
    repsPertinent: [1, 1], dureeSec: 40, chargeRelative: "leger", contreIndications: ["epaule"],
    tags: ["maison", "salle", "gainage", "abdos"],
  }),
  ex({
    id: "gainage-lateral", slug: "gainage-lateral", nom: "Gainage latéral",
    description: "Maintien isométrique sur le côté, ciblage des obliques.",
    instructions: ["Coude sous l'épaule, hanches hautes et alignées.", "Maintiens chaque côté.", "Respire calmement."],
    erreurs: ["Hanche qui s'affaisse"],
    difficulte: 2, typeExercice: "gainage", patron: "gainage", unilateral: true,
    musclesPrincipaux: ["abdominaux"], musclesSecondaires: ["fessiers"],
    equipement: ["poids_du_corps"], position: "laterale", amplitude: "isométrique", tempoDefaut: "—",
    repsPertinent: [1, 1], dureeSec: 30, chargeRelative: "leger", contreIndications: ["epaule"],
    tags: ["maison", "gainage", "obliques"],
  }),
  ex({
    id: "dead-bug", slug: "dead-bug", nom: "Dead bug",
    description: "Anti-extension du tronc, coordination bras/jambes opposés.",
    instructions: ["Dos plaqué au sol, bras et genoux à 90°.", "Allonge bras et jambe opposés en soufflant.", "Reviens sans décoller les lombaires."],
    erreurs: ["Lombaires qui décollent", "Aller trop vite"],
    difficulte: 1, typeExercice: "gainage", patron: "gainage", unilateral: true,
    musclesPrincipaux: ["abdominaux"], equipement: ["poids_du_corps"], position: "allongee",
    amplitude: "contrôlée", tempoDefaut: "lent", repsPertinent: [8, 12], chargeRelative: "leger",
    contreIndications: [], tags: ["maison", "abdos", "dos_friendly"],
  }),
  ex({
    id: "releve-genoux", slug: "releve-genoux", nom: "Relevés de genoux",
    description: "Flexion du bassin pour le bas des abdominaux.",
    instructions: ["Allongé ou suspendu, enroule le bassin.", "Monte les genoux vers la poitrine.", "Redescends lentement."],
    erreurs: ["Balancement", "Cambrure lombaire"],
    difficulte: 2, typeExercice: "gainage", patron: "gainage",
    musclesPrincipaux: ["abdominaux"], equipement: ["poids_du_corps"], equipementsAlternatifs: ["barre_traction"],
    position: "allongee", amplitude: "contrôlée", tempoDefaut: "contrôlé", repsPertinent: [10, 15],
    chargeRelative: "leger", contreIndications: [], tags: ["maison", "abdos"],
  }),

  // ================= CARDIO / MOBILITÉ =================
  ex({
    id: "burpees", slug: "burpees", nom: "Burpees",
    description: "Mouvement cardio complet au poids du corps.",
    instructions: ["Descends en position de pompe.", "Fais une pompe (optionnelle).", "Ramène les pieds et saute vers le haut."],
    erreurs: ["Dos arrondi à la descente", "Rythme non contrôlé"],
    difficulte: 3, typeExercice: "cardio", patron: "cardio",
    musclesPrincipaux: ["corps_entier"], equipement: ["poids_du_corps"], position: "debout",
    amplitude: "complète", tempoDefaut: "rapide", repsPertinent: [8, 15], chargeRelative: "leger",
    contreIndications: ["genou", "epaule"], tags: ["maison", "cardio"],
  }),
  ex({
    id: "rameur", slug: "rameur", nom: "Rameur",
    description: "Cardio complet à faible impact.",
    instructions: ["Pousse avec les jambes.", "Puis tire avec le dos et les bras.", "Reviens dans l'ordre inverse."],
    erreurs: ["Tirer avant de pousser avec les jambes", "Dos arrondi"],
    difficulte: 2, typeExercice: "cardio", patron: "cardio",
    musclesPrincipaux: ["corps_entier"], musclesSecondaires: ["dorsaux", "quadriceps"],
    equipement: ["rameur"], position: "assise", amplitude: "complète", tempoDefaut: "régulier",
    repsPertinent: [1, 1], dureeSec: 600, chargeRelative: "leger", contreIndications: ["dos"],
    tags: ["salle", "cardio"],
  }),
  ex({
    id: "mobilite-hanches", slug: "mobilite-hanches", nom: "Mobilité des hanches",
    description: "Routine d'ouverture des hanches (fentes mobiles, rotations).",
    instructions: ["Enchaîne fentes mobiles et rotations de hanche.", "Amplitude progressive et contrôlée.", "Reste dans une zone sans douleur."],
    erreurs: ["Forcer sur une amplitude douloureuse"],
    difficulte: 1, typeExercice: "mobilite", patron: "cardio",
    musclesPrincipaux: ["fessiers", "adducteurs"], equipement: ["poids_du_corps"], equipementsAlternatifs: ["rouleau"],
    position: "debout", amplitude: "progressive", tempoDefaut: "lent", repsPertinent: [1, 1], dureeSec: 300,
    chargeRelative: "leger", contreIndications: [], tags: ["maison", "mobilite", "recuperation"],
  }),

  // ================= AJOUTS « MAISON » (couverture haltères sans banc) =================
  ex({
    id: "rowing-halteres-buste-penche", slug: "rowing-halteres-buste-penche", nom: "Rowing haltères buste penché",
    description: "Tirage horizontal à deux haltères, buste penché, sans banc — travail du dos à la maison.",
    instructions: ["Buste penché ~45°, dos neutre, genoux légèrement fléchis.", "Tire les deux haltères vers le bas-ventre, coudes près du corps.", "Serre les omoplates 1 seconde puis redescends en contrôlant."],
    erreurs: ["Dos arrondi", "Élan du buste", "Tirer trop haut vers la poitrine"],
    securite: "Garde le dos gainé ; réduis la charge si le dos s'arrondit.",
    difficulte: 2, typeExercice: "hypertrophie", patron: "tirage_horizontal",
    musclesPrincipaux: ["dorsaux", "trapezes"], musclesSecondaires: ["biceps"], musclesStabilisateurs: ["lombaires"],
    equipement: ["halteres"], position: "penchee", amplitude: "complète", tempoDefaut: "2-1-1",
    repsPertinent: [8, 12], chargeRelative: "moyen", contreIndications: ["dos"], tags: ["maison", "salle", "dos"],
  }),
  ex({
    id: "developpe-sol-halteres", slug: "developpe-sol-halteres", nom: "Développé au sol (haltères)",
    nomsAlternatifs: ["Floor press"],
    description: "Poussée horizontale allongé au sol : amplitude réduite, plus douce pour les épaules.",
    instructions: ["Allongé au sol, haltères au-dessus de la poitrine.", "Descends jusqu'à ce que les coudes touchent le sol.", "Pousse à la verticale sans verrouiller brutalement."],
    erreurs: ["Rebondir les coudes au sol", "Charge trop lourde"],
    difficulte: 2, typeExercice: "hypertrophie", patron: "poussee_horizontale",
    musclesPrincipaux: ["pectoraux"], musclesSecondaires: ["triceps", "epaules"],
    equipement: ["halteres"], position: "allongee", amplitude: "réduite", tempoDefaut: "2-0-1",
    repsPertinent: [8, 12], chargeRelative: "moyen", contreIndications: [], tags: ["maison", "pecs", "epaule_friendly"],
  }),
  ex({
    id: "superman", slug: "superman", nom: "Superman (extension au sol)",
    description: "Extension du dos allongé sur le ventre : chaîne postérieure et haut du dos, sans matériel.",
    instructions: ["Allongé sur le ventre, bras tendus devant.", "Décolle bras, poitrine et jambes en soufflant.", "Tiens 1 seconde puis redescends en contrôlant."],
    erreurs: ["Casser la nuque en arrière", "Mouvement trop rapide"],
    difficulte: 1, typeExercice: "gainage", patron: "charniere_hanche",
    musclesPrincipaux: ["dorsaux", "lombaires"], musclesSecondaires: ["fessiers"],
    equipement: ["poids_du_corps"], position: "allongee", amplitude: "contrôlée", tempoDefaut: "1-1-1",
    repsPertinent: [10, 15], chargeRelative: "leger", contreIndications: [], tags: ["maison", "dos", "dos_friendly"],
  }),
];

/**
 * CATALOGUE = cœur curé + exercices importés (wger, chargés à la demande).
 * Le moteur (generator/replacement) travaille sur `EXERCISES` (cœur curé, de
 * qualité contrôlée) ; l'interface de recherche/détail travaille sur CATALOGUE.
 * Les ~250 exercices wger (`exercises-extra.js`, gros fichier) ne sont importés
 * qu'à l'ouverture de l'écran Catalogue, pas au démarrage de l'app.
 */
export const CATALOGUE = [...EXERCISES];

/** Index par id pour accès O(1) (sur le catalogue actuellement chargé). */
export const EXERCISES_BY_ID = Object.fromEntries(CATALOGUE.map((e) => [e.id, e]));

let extraCataloguePromise = null;
let extraCatalogueCharge = false;

/** L'extension wger (250 exercices) est-elle déjà fusionnée dans CATALOGUE ? */
export function catalogueEtenduCharge() {
  return extraCatalogueCharge;
}

/** Charge à la demande (idempotent) l'extension wger et la fusionne dans CATALOGUE/EXERCISES_BY_ID. */
export function chargerCatalogueEtendu() {
  if (!extraCataloguePromise) {
    extraCataloguePromise = import("./exercises-extra.js").then(({ EXTRA_EXERCISES }) => {
      for (const e of EXTRA_EXERCISES) { CATALOGUE.push(e); EXERCISES_BY_ID[e.id] = e; }
      extraCatalogueCharge = true;
    });
  }
  return extraCataloguePromise;
}

/** Renvoie un exercice par id (ou undefined). */
export function getExercise(id) {
  return EXERCISES_BY_ID[id];
}

/** Normalise une chaîne (minuscule, sans accents) pour la recherche. */
function norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Recherche/filtre dans le catalogue.
 * @param {{q?:string, muscle?:string, equip?:string}} [filtres]
 * @param {any[]} [list]
 */
export function chercherCatalogue(filtres = {}, list = CATALOGUE) {
  const toks = norm(filtres.q).split(/[^a-z0-9]+/).filter(Boolean); // recherche par mots (tous requis)
  return list.filter((e) => {
    if (filtres.muscle && !e.musclesPrincipaux.includes(filtres.muscle) && !(e.musclesSecondaires || []).includes(filtres.muscle)) return false;
    if (filtres.equip && !e.equipement.includes(filtres.equip)) return false;
    if (toks.length) {
      const hay = norm(e.nom) + " " + norm((e.nomsAlternatifs || []).join(" ")) + " " + norm((e.tags || []).join(" "));
      if (!toks.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
}
