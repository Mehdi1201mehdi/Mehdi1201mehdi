// @ts-check
/**
 * MANIFESTE MÉDIA — quelle image montrer, pour quoi, et quoi faire quand il n'y
 * en a pas.
 *
 * L'application dispose de trois familles de visuels, et jusqu'ici chaque écran
 * décidait dans son coin lequel employer. Résultat : une fiche d'exercice sans
 * GIF affichait un cadre vide, une autre une planche anatomique, une troisième
 * rien du tout. Ce module centralise la décision.
 *
 * LA CHAÎNE DE REPLI, dans cet ordre, et toujours le même :
 *
 *   1. DÉMONSTRATION ANIMÉE (`src/data/gifs.js`) — 281 exercices. C'est ce
 *      qu'on veut : on apprend un geste en le voyant.
 *   2. SILHOUETTE MUSCULAIRE (`src/data/anatomy-paths.js`) — dessinée ici, donc
 *      toujours disponible, y compris hors ligne au premier lancement. Elle ne
 *      montre pas le geste mais elle montre la CIBLE, ce qui vaut mieux que rien.
 *   3. MARQUE-PLACE typé — un cadre au bon format, avec l'icône du matériel.
 *      Jamais un vide, jamais une image cassée.
 *
 * Le point important : le repli est un CHOIX D'ÉCRAN, pas un accident. Un cadre
 * vide ressemble à un bug ; une silhouette ressemble à une décision.
 *
 * Module PUR : il ne charge rien, il ne touche pas au DOM. Il répond « voici
 * quoi afficher » — l'affichage reste à l'interface.
 */

import { GIFS } from "./gifs.js";

/** Format d'affichage des démonstrations. Le dataset les fournit en 180×180. */
export const FORMAT_DEMO = { largeur: 180, hauteur: 180, ratio: "1 / 1" };

/**
 * Familles de matériel → icône de marque-place. Un cadre vide se lit comme un
 * défaut d'affichage ; un cadre portant une barre se lit comme « pas encore
 * d'animation pour cet exercice ».
 */
export const ICONE_MATERIEL = {
  barre: "barre", halteres: "halteres", poulie: "poulie", machine: "machine",
  "poids-du-corps": "corps", kettlebell: "halteres", elastique: "poulie",
  banc: "barre", rack: "barre", smith: "smith", velo: "velo",
};

/** Type de média disponible pour un exercice. */
export const TYPES = /** @type {const} */ (["animation", "silhouette", "placeholder"]);

/**
 * Matériel principal d'un exercice, normalisé vers `ICONE_MATERIEL`.
 * @param {any} exo
 */
export function materielPrincipal(exo) {
  // Les noms de champs du catalogue : `equipement` (et non `materiel`), plus
  // `equipementsAlternatifs`. Une première version lisait des clés qui
  // n'existaient nulle part — tous les exercices retombaient sur le défaut sans
  // que rien ne le signale.
  const brut = exo && (exo.equipement || exo.materiel || exo.equipment || exo.equipementsAlternatifs);
  const liste = Array.isArray(brut) ? brut : (brut ? [brut] : []);
  for (const m of liste) {
    const cle = String(m || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (ICONE_MATERIEL[cle]) return cle;
  }
  return "poids-du-corps";
}

/**
 * Muscles à mettre en valeur sur la silhouette de repli.
 *
 * On distingue principal et secondaire : colorer tout de la même façon revient
 * à ne rien dire. Un exercice sans muscle déclaré renvoie des listes vides —
 * l'interface tombe alors au marque-place, jamais sur une silhouette éteinte
 * qui laisserait croire qu'aucun muscle ne travaille.
 *
 * @param {any} exo
 * @returns {{principaux:string[], secondaires:string[]}}
 */
export function musclesCibles(exo) {
  const l = (v) => (Array.isArray(v) ? v.filter(Boolean).map(String) : (v ? [String(v)] : []));
  // `musclesPrincipaux` / `musclesSecondaires` sont les noms RÉELS du
  // catalogue. Les autres formes couvrent les fiches importées et les
  // exercices créés à la main.
  const principaux = l(exo && (exo.musclesPrincipaux || exo.muscles || exo.musclePrincipal || exo.groupe));
  const secondaires = l(exo && (exo.musclesSecondaires || exo.secondaires));
  return { principaux, secondaires: secondaires.filter((m) => !principaux.includes(m)) };
}

/**
 * Décide QUOI afficher pour un exercice.
 *
 * @param {any} exo                 fiche d'exercice du catalogue
 * @param {Record<string,string>} [gifs]  table de démonstrations (injectable pour les tests)
 * @returns {{type:"animation"|"silhouette"|"placeholder", url:string|null,
 *            muscles:{principaux:string[], secondaires:string[]},
 *            materiel:string, alt:string, ratio:string}}
 */
export function mediaExercice(exo, gifs = GIFS) {
  const id = exo && exo.id ? String(exo.id) : "";
  const nom = (exo && (exo.nom || exo.name)) || id || "Exercice";
  const muscles = musclesCibles(exo);
  const materiel = materielPrincipal(exo);
  const base = { muscles, materiel, ratio: FORMAT_DEMO.ratio };

  const url = id && gifs ? gifs[id] : null;
  if (typeof url === "string" && /^https:\/\//.test(url)) {
    return { ...base, type: "animation", url, alt: `Démonstration animée : ${nom}` };
  }
  if (muscles.principaux.length) {
    return { ...base, type: "silhouette", url: null, alt: `Muscles travaillés : ${nom}` };
  }
  return { ...base, type: "placeholder", url: null, alt: nom };
}

/**
 * Couverture réelle d'une liste d'exercices — sert au garde-fou de tests et à
 * l'écran de réglages, qui doit pouvoir dire honnêtement combien d'exercices
 * ont une animation.
 *
 * @param {any[]} exercices
 * @param {Record<string,string>} [gifs]
 */
export function couverture(exercices, gifs = GIFS) {
  const l = Array.isArray(exercices) ? exercices : [];
  const par = { animation: 0, silhouette: 0, placeholder: 0 };
  for (const e of l) par[mediaExercice(e, gifs).type]++;
  const total = l.length;
  return { total, ...par, pct: total ? Math.round((par.animation / total) * 100) : 0 };
}

/**
 * Faut-il charger ce média tout de suite ?
 *
 * Une bibliothèque de 343 exercices ne doit JAMAIS lancer 343 requêtes au
 * rendu : sur un forfait mobile c'est plusieurs dizaines de Mo, et sur un
 * appareil d'entrée de gamme l'écran se fige. Seules les premières vignettes
 * sont chargées avec empressement ; le reste attend d'approcher de l'écran.
 *
 * @param {number} index  rang de la vignette dans la liste
 * @param {number} [avecEmpressement]
 */
export function chargementMedia(index, avecEmpressement = 6) {
  // `typeof` et non `Number()` : `Number(null)` vaut 0, donc un index absent
  // était traité comme la PREMIÈRE vignette et chargé en priorité haute. Et
  // `i >= 0` explicitement, sans quoi « −1 < 6 » passait aussi.
  const i = typeof index === "number" ? index : NaN;
  const seuil = Math.max(0, Number(avecEmpressement) || 0);
  return Number.isFinite(i) && i >= 0 && i < seuil
    ? { loading: "eager", fetchpriority: "high" }
    : { loading: "lazy", fetchpriority: "low" };
}
