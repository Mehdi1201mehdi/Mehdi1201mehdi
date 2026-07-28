// @ts-check
/**
 * Taxonomie musculaire FINE du moteur de planification (18 groupes).
 *
 * Le catalogue d'exercices utilise une taxonomie plus grossière (`src/models.js`,
 * 16 groupes dont « dorsaux » et « epaules » globaux). Le moteur a besoin de
 * distinguer grand dorsal / haut du dos et les trois faisceaux du deltoïde,
 * parce que ce sont des unités de récupération différentes.
 *
 * On NE modifie pas la taxonomie du catalogue (elle est utilisée partout) :
 * on ajoute une couche, avec une correspondance explicite dans les deux sens.
 */

/** Les 18 groupes suivis par le moteur, dans l'ordre d'affichage. */
export const MUSCLES_MOTEUR = [
  { cle: "pectoraux", nom: "Pectoraux", region: "haut", taille: "grand" },
  { cle: "grand_dorsal", nom: "Grand dorsal", region: "haut", taille: "grand" },
  { cle: "haut_du_dos", nom: "Haut du dos", region: "haut", taille: "moyen" },
  { cle: "trapezes", nom: "Trapèzes", region: "haut", taille: "moyen" },
  { cle: "lombaires", nom: "Lombaires", region: "tronc", taille: "moyen" },
  { cle: "deltoide_anterieur", nom: "Épaules avant", region: "haut", taille: "petit" },
  { cle: "deltoide_lateral", nom: "Épaules côté", region: "haut", taille: "petit" },
  { cle: "deltoide_posterieur", nom: "Épaules arrière", region: "haut", taille: "petit" },
  { cle: "biceps", nom: "Biceps", region: "haut", taille: "petit" },
  { cle: "triceps", nom: "Triceps", region: "haut", taille: "petit" },
  { cle: "avant_bras", nom: "Avant-bras", region: "haut", taille: "petit" },
  { cle: "abdominaux", nom: "Abdominaux", region: "tronc", taille: "moyen" },
  { cle: "obliques", nom: "Obliques", region: "tronc", taille: "petit" },
  { cle: "quadriceps", nom: "Quadriceps", region: "bas", taille: "grand" },
  { cle: "ischio_jambiers", nom: "Ischio-jambiers", region: "bas", taille: "grand" },
  { cle: "fessiers", nom: "Fessiers", region: "bas", taille: "grand" },
  { cle: "adducteurs", nom: "Adducteurs", region: "bas", taille: "moyen" },
  { cle: "mollets", nom: "Mollets", region: "bas", taille: "petit" },
];

/** Toutes les clés, pour itérer. */
export const CLES_MOTEUR = MUSCLES_MOTEUR.map((m) => m.cle);
/** cle → libellé français. */
export const LABELS_MOTEUR = Object.fromEntries(MUSCLES_MOTEUR.map((m) => [m.cle, m.nom]));
/** cle → définition complète. */
export const DEF_MOTEUR = Object.fromEntries(MUSCLES_MOTEUR.map((m) => [m.cle, m]));

/**
 * Correspondance groupe FIN → groupe du catalogue, pour colorer les
 * silhouettes SVG existantes (qui ne connaissent que la taxonomie grossière).
 */
export const FIN_VERS_CATALOGUE = {
  pectoraux: "pectoraux",
  grand_dorsal: "dorsaux",
  haut_du_dos: "dorsaux",
  trapezes: "trapezes",
  lombaires: "lombaires",
  deltoide_anterieur: "epaules",
  deltoide_lateral: "epaules",
  deltoide_posterieur: "epaules",
  biceps: "biceps",
  triceps: "triceps",
  avant_bras: "avant_bras",
  abdominaux: "abdominaux",
  obliques: "abdominaux",
  quadriceps: "quadriceps",
  ischio_jambiers: "ischios",
  fessiers: "fessiers",
  adducteurs: "adducteurs",
  mollets: "mollets",
};

/**
 * Répartition d'un groupe GROSSIER du catalogue vers les groupes fins, selon le
 * patron de mouvement. Sert de repli pour les exercices sans coefficients
 * explicites : aucun exercice ne se retrouve ainsi sans muscles.
 *
 * Les poids d'une même entrée n'ont pas à sommer à 1 : ce sont des
 * contributions relatives, normalisées ensuite par le moteur.
 */
export const REPARTITION = {
  dorsaux: {
    tirage_vertical: { grand_dorsal: 1.0, haut_du_dos: 0.3 },
    tirage_horizontal: { haut_du_dos: 1.0, grand_dorsal: 0.75 },
    charniere_hanche: { grand_dorsal: 0.5, haut_du_dos: 0.5 },
    defaut: { grand_dorsal: 1.0, haut_du_dos: 0.5 },
  },
  epaules: {
    poussee_verticale: { deltoide_anterieur: 1.0, deltoide_lateral: 0.65 },
    poussee_horizontale: { deltoide_anterieur: 1.0 },
    tirage_horizontal: { deltoide_posterieur: 1.0 },
    tirage_vertical: { deltoide_posterieur: 0.5, deltoide_lateral: 0.3 },
    defaut: { deltoide_lateral: 1.0, deltoide_anterieur: 0.4, deltoide_posterieur: 0.4 },
  },
  abdominaux: { defaut: { abdominaux: 1.0 } },
  ischios: { defaut: { ischio_jambiers: 1.0 } },
  corps_entier: {
    defaut: {
      quadriceps: 0.5, fessiers: 0.5, ischio_jambiers: 0.4, pectoraux: 0.4,
      grand_dorsal: 0.4, haut_du_dos: 0.35, deltoide_anterieur: 0.35,
      abdominaux: 0.4, lombaires: 0.35,
    },
  },
  // Les autres groupes ont le même nom dans les deux taxonomies :
  // pectoraux, trapezes, lombaires, biceps, triceps, avant_bras,
  // quadriceps, fessiers, adducteurs, mollets, abducteurs.
};

/** Groupes du catalogue sans équivalent direct dans le moteur (ignorés). */
export const IGNORES = new Set(["abducteurs"]);
