// @ts-check
/**
 * TAXONOMIE DE LA BIBLIOTHÈQUE : familles de mouvement, type de charge,
 * polyarticulaire / isolation, et REPÈRES GÉNÉRAUX par famille.
 *
 * Tout est DÉRIVÉ des champs existants (patron, typeExercice, matériel, nom) :
 * aucune donnée nouvelle n'est inventée exercice par exercice. Les repères
 * (respiration, erreurs fréquentes, sécurité) sont rédigés une fois par
 * famille de mouvement et affichés comme « repères généraux du mouvement »,
 * jamais comme des consignes propres à un exercice.
 */

export const MOUVEMENTS = /** @type {const} */ ([
  "poussee_horizontale", "poussee_verticale", "tirage_horizontal", "tirage_vertical", "squat", "charniere_hanche",
  "fente", "extension", "flexion", "rotation", "gainage", "isolation", "polyarticulaire", "cardio", "mobilite", "etirement",
]);

export const LIB_MOUVEMENT = {
  poussee_horizontale: "Poussée horizontale", poussee_verticale: "Poussée verticale", tirage_horizontal: "Tirage horizontal",
  tirage_vertical: "Tirage vertical", squat: "Squat", charniere_hanche: "Charnière de hanche", fente: "Fente",
  extension: "Extension", flexion: "Flexion", rotation: "Rotation", gainage: "Gainage", isolation: "Isolation musculaire",
  polyarticulaire: "Polyarticulaire", cardio: "Cardio", mobilite: "Mobilité", etirement: "Étirement",
};

const POLY = new Set(["squat", "charniere_hanche", "fente", "poussee_horizontale", "poussee_verticale", "tirage_horizontal", "tirage_vertical"]);
const sansAccents = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const texte = (e) => sansAccents(`${e.nom} ${(e.nomsAlternatifs || []).join(" ")} ${e.nomEn || ""}`);

/** @param {any} e */
export function estEtirement(e) {
  return /etirement|stretch|auto-massage|yoga|posture/.test(texte(e));
}
/** @param {any} e */
export function estIsolation(e) {
  if (e.typeExercice === "isolation") return true;
  return ["flexion_bras", "extension_bras", "isolation_jambe"].includes(e.patron) && e.typeExercice !== "force";
}
/** @param {any} e */
export function estPolyarticulaire(e) {
  if (estIsolation(e) || estEtirement(e)) return false;
  if (POLY.has(e.patron)) return true;
  return e.typeExercice === "force" || e.typeExercice === "hypertrophie";
}

/**
 * Familles de mouvement d'un exercice (plusieurs possibles).
 * @param {any} e
 * @returns {string[]}
 */
export function mouvementsDe(e) {
  const out = new Set();
  const t = texte(e);
  if (e.patron && POLY.has(e.patron)) out.add(e.patron);
  if (e.patron === "flexion_bras" || /\bcurl\b|leg curl|flexion/.test(t)) out.add("flexion");
  if (e.patron === "extension_bras" || /extension|kickback|pushdown/.test(t)) out.add("extension");
  if (/rotation|twist|bucheron|wood chop|pallof|windmill|moulin|landmine 180/.test(t)) out.add("rotation");
  if (e.patron === "gainage" || e.typeExercice === "gainage" || /planche|plank|gainage|hollow|dead bug|l-sit/.test(t)) out.add("gainage");
  if (e.typeExercice === "cardio" || e.patron === "cardio") out.add("cardio");
  if (estEtirement(e)) out.add("etirement");
  else if (e.typeExercice === "mobilite") out.add("mobilite");
  if (estIsolation(e)) out.add("isolation");
  if (estPolyarticulaire(e)) out.add("polyarticulaire");
  return [...out];
}

/**
 * Type de charge, en clair.
 * @param {any} e
 */
export function typeCharge(e) {
  const q = e.equipement || [];
  if (e.typeExercice === "cardio" && q.some((x) => ["tapis_course", "velo", "rameur", "autre"].includes(x))) return "Cardio sur machine";
  if (q.includes("machine_guidee") || q.includes("smith")) return "Charge guidée";
  if (q.includes("machine_leviers")) return "Machine à disques";
  if (q.includes("poulie")) return "Câble (poulie)";
  if (q.some((x) => ["barre", "barre_ez", "halteres", "kettlebell", "medecine_ball"].includes(x))) return "Charge libre";
  if (q.includes("elastiques")) return "Élastique";
  if (/leste|weighted/.test(texte(e))) return "Poids du corps lesté";
  if (q.includes("poids_du_corps") || q.includes("barre_traction") || q.includes("trx")) return "Poids du corps";
  return "Autre";
}

/**
 * Repères GÉNÉRAUX par famille de mouvement (textes originaux).
 * @type {Record<string, {respiration: string, erreurs: string[], securite: string}>}
 */
export const REPERES = {
  squat: { respiration: "Inspirer et gainer avant de descendre, expirer en franchissant le point dur de la montée.",
    erreurs: ["Genoux qui rentrent vers l'intérieur", "Talons qui décollent", "Dos qui s'arrondit en bas"],
    securite: "Descendre à l'amplitude que le dos reste neutre ; avec une barre, sécurités du rack réglées." },
  charniere_hanche: { respiration: "Grande inspiration et gainage avant de plier aux hanches, expirer en fin de montée.",
    erreurs: ["Dos arrondi", "Plier les genoux au lieu de reculer les hanches", "Barre ou charge loin du corps"],
    securite: "Charge près des jambes, colonne neutre ; arrêter la série dès que le dos s'arrondit." },
  fente: { respiration: "Inspirer en descendant, expirer en remontant.",
    erreurs: ["Genou avant qui rentre", "Buste qui s'effondre vers l'avant", "Pas trop court qui charge le genou"],
    securite: "Commencer sans charge pour trouver l'équilibre ; tenir un support si besoin." },
  poussee_horizontale: { respiration: "Inspirer en descendant la charge, expirer en poussant.",
    erreurs: ["Coudes à 90° du buste (épaules en souffrance)", "Fessiers qui décollent du banc", "Rebond sur la poitrine"],
    securite: "Omoplates serrées, coudes à environ 45° ; avec une barre, pareur ou sécurités." },
  poussee_verticale: { respiration: "Inspirer et gainer avant de pousser, expirer en haut.",
    erreurs: ["Cambrer le bas du dos", "Pousser la charge devant au lieu de la verticale", "Hausser les épaules"],
    securite: "Abdominaux et fessiers serrés ; réduire la charge si le dos se creuse." },
  tirage_horizontal: { respiration: "Expirer en tirant, inspirer au retour.",
    erreurs: ["Tirer avec les bras sans serrer les omoplates", "Élan du buste", "Dos arrondi en position penchée"],
    securite: "Dos neutre, mouvement contrôlé ; diminuer la charge si le buste se relève à chaque répétition." },
  tirage_vertical: { respiration: "Expirer en tirant, inspirer en remontant.",
    erreurs: ["Se balancer pour monter", "Tirer derrière la nuque avec des épaules raides", "Amplitude partielle"],
    securite: "Descendre bras presque tendus sans relâcher brutalement les épaules." },
  flexion_bras: { respiration: "Expirer en montant, inspirer en descendant.",
    erreurs: ["Coudes qui avancent", "Élan du dos", "Descente non contrôlée"],
    securite: "Coudes fixes le long du corps ; poignets neutres." },
  extension_bras: { respiration: "Expirer en tendant les bras, inspirer au retour.",
    erreurs: ["Coudes qui s'écartent", "Mouvement des épaules qui remplace celui des coudes", "Verrouillage brutal en extension"],
    securite: "Charge modérée : le coude n'aime pas les à-coups." },
  isolation_jambe: { respiration: "Expirer pendant l'effort, inspirer au retour.",
    erreurs: ["À-coups", "Amplitude réduite", "Bassin qui décolle"],
    securite: "Mouvement lent et contrôlé, surtout en fin d'amplitude." },
  gainage: { respiration: "Respirer calmement sans bloquer : expirer à fond en serrant le ventre.",
    erreurs: ["Bassin qui s'affaisse ou qui monte", "Tête qui tombe", "Apnée prolongée"],
    securite: "Arrêter dès que la position se dégrade : la qualité prime sur la durée." },
  cardio: { respiration: "Respiration régulière ; pouvoir parler par phrases courtes en endurance fondamentale.",
    erreurs: ["Partir trop vite", "Négliger l'échauffement", "Foulée ou posture qui se dégradent avec la fatigue"],
    securite: "Monter l'intensité progressivement ; s'arrêter en cas de douleur thoracique ou de vertige." },
  mobilite: { respiration: "Expirer lentement en allant chercher l'amplitude.",
    erreurs: ["Forcer en rebondissant", "Bloquer la respiration", "Compenser par une autre articulation"],
    securite: "Tension tolérable, jamais de douleur vive." },
};

/**
 * Repères généraux applicables à un exercice (null si aucun ne s'applique).
 * @param {any} e
 */
export function reperesDe(e) {
  if (estEtirement(e) || e.typeExercice === "mobilite") return { famille: "mobilite", ...REPERES.mobilite };
  if (e.typeExercice === "cardio" || e.patron === "cardio") return { famille: "cardio", ...REPERES.cardio };
  if (e.patron && REPERES[e.patron]) return { famille: e.patron, ...REPERES[e.patron] };
  if (e.typeExercice === "gainage") return { famille: "gainage", ...REPERES.gainage };
  return null;
}
