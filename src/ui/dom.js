// @ts-check
/**
 * HELPERS DOM — les trois briques dont tout le reste de l'interface dépend.
 *
 * Elles vivaient en tête de `src/ui/app.js`, ce qui obligeait tout module
 * extrait à en redéfinir une copie ou à renoncer. Les sortir d'abord, c'est
 * poser la fondation : les extractions suivantes n'auront plus qu'à importer.
 *
 * Pourquoi le typage est volontairement lâche ici : ces fonctions rendent des
 * éléments hétérogènes — input, bouton, SVG, élément porteur de propriétés
 * maison. Les typer en `Element` obligerait à un cast à chaque appel, du bruit
 * sans bénéfice à l'exécution. La vérification de types qui compte vit dans
 * `src/engine/*` et `src/data/*`, qui sont purs et typés.
 */

/** @type {(s: string, r?: ParentNode) => any} */
export const $ = (s, r = document) => r.querySelector(s);

/**
 * Échappe le texte destiné à une chaîne HTML.
 *
 * TOUTE valeur venue de l'utilisateur ou d'une API passe par ici : un nom de
 * routine, un aliment scanné, une note. C'est la seule barrière entre une
 * saisie et l'interprétation du HTML.
 *
 * @param {unknown} s
 */
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/**
 * Crée un élément depuis une chaîne HTML.
 * @param {string} html
 * @returns {any} l'élément racine
 */
export function h(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}
