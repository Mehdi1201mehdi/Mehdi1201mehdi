// @ts-check
/**
 * CAPTURE ET RÉDUCTION D'IMAGE — la partie qui touche au navigateur.
 *
 * La logique (dimensions, fiches, comparaison) vit dans `engine/photos.js` et
 * est testée sous Node. Ici on ne fait que ce qui exige un DOM : décoder le
 * fichier choisi, le redessiner à la bonne taille, le réencoder.
 *
 * Deux pièges, tous deux invisibles tant qu'on ne teste pas sur un vrai
 * téléphone :
 *
 *   1. L'ORIENTATION EXIF. Les photos prises en portrait arrivent couchées : le
 *      capteur enregistre en paysage et note « tourne de 90° » dans les
 *      métadonnées. `createImageBitmap` ne le fait PAS par défaut — il faut le
 *      demander. Sans ça, toutes les photos de progression sont à l'horizontale.
 *   2. LE POIDS. Une photo de téléphone fait 4000 × 3000 pour ~5 Mo. Dix suffisent
 *      à saturer le quota d'IndexedDB. Réduite à 1280 px de côté long en JPEG,
 *      elle tombe à ~200 ko sans perte utile pour comparer deux silhouettes.
 */

import { dimensionsCibles, COTE_MAX, QUALITE } from "../engine/photos.js";

/** Types d'images acceptés à l'import. */
export const TYPES = "image/jpeg,image/png,image/webp,image/heic,image/heif";

/**
 * Décode un fichier image en respectant son orientation EXIF.
 *
 * `imageOrientation: "from-image"` n'est pas un détail : sans lui, une photo
 * prise en portrait sur un téléphone s'affiche couchée. Le repli par
 * `<img>` + `URL.createObjectURL` couvre les navigateurs sans
 * `createImageBitmap` — eux appliquent l'orientation d'office.
 *
 * @param {Blob} fichier
 * @returns {Promise<CanvasImageSource & {width:number, height:number}>}
 */
export async function decoder(fichier) {
  if (typeof createImageBitmap === "function") {
    try {
      return /** @type {any} */ (await createImageBitmap(fichier, { imageOrientation: "from-image" }));
    } catch (e) { /* repli ci-dessous */ }
  }
  const url = URL.createObjectURL(fichier);
  try {
    const img = new Image();
    await new Promise((ok, ko) => {
      img.onload = () => ok(null);
      img.onerror = () => ko(new Error("image illisible"));
      img.src = url;
    });
    return /** @type {any} */ (img);
  } finally {
    // Révoqué APRÈS le décodage : le libérer trop tôt annule le chargement.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/**
 * Réduit une image et la réencode en JPEG.
 *
 * @param {Blob} fichier
 * @param {{coteMax?:number, qualite?:number}} [opts]
 * @returns {Promise<{blob:Blob, largeur:number, hauteur:number, octets:number}>}
 */
export async function reduire(fichier, opts = {}) {
  const src = await decoder(fichier);
  const { largeur, hauteur } = dimensionsCibles(src.width, src.height, opts.coteMax || COTE_MAX);
  if (!largeur || !hauteur) throw new Error("dimensions illisibles");

  const canvas = document.createElement("canvas");
  canvas.width = largeur; canvas.height = hauteur;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canevas indisponible");
  // Le lissage de qualité évite l'aliasing du fond et des contours du corps
  // quand on divise la taille par trois.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(/** @type {any} */ (src), 0, 0, largeur, hauteur);
  if (/** @type {any} */ (src).close) /** @type {any} */ (src).close();  // libère l'ImageBitmap

  const blob = await new Promise((ok, ko) => {
    canvas.toBlob((b) => (b ? ok(b) : ko(new Error("encodage impossible"))),
      "image/jpeg", opts.qualite ?? QUALITE);
  });
  return { blob: /** @type {Blob} */ (blob), largeur, hauteur, octets: /** @type {Blob} */ (blob).size };
}

/**
 * Ouvre le sélecteur de fichiers / l'appareil photo et renvoie le fichier choisi.
 *
 * `capture="environment"` demande la caméra arrière directement sur mobile —
 * sans elle, Android propose d'abord la galerie, ce qui ajoute deux gestes à
 * chaque prise. Le choix « galerie » reste disponible par un second bouton.
 *
 * @param {{camera?:boolean}} [opts]
 * @returns {Promise<File|null>}
 */
export function choisirImage(opts = {}) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = TYPES;
    if (opts.camera) input.setAttribute("capture", "environment");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    // `change` ne se déclenche pas si l'utilisateur annule : on nettoie sur
    // `cancel` quand le navigateur le propose, sinon l'input reste dans le DOM.
    const fini = (f) => { input.remove(); resolve(f); };
    input.addEventListener("change", () => fini(input.files && input.files[0] ? input.files[0] : null));
    input.addEventListener("cancel", () => fini(null));
    document.body.append(input);
    input.click();
  });
}

/**
 * URL objet d'un blob, avec libération explicite. À révoquer quand l'image
 * quitte l'écran : chaque URL non révoquée retient le blob entier en mémoire.
 *
 * @param {Blob} blob
 */
export function urlObjet(blob) {
  const url = URL.createObjectURL(blob);
  return { url, liberer: () => URL.revokeObjectURL(url) };
}
