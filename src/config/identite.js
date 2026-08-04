// @ts-check
/**
 * IDENTITÉ DE L'APPLICATION — la source unique.
 *
 * Le nom, le sur-titre et la signature étaient écrits en dur à sept endroits :
 * l'en-tête, le titre de la page, le manifeste, la mention légale du profil, le
 * fichier de sauvegarde… Changer de nom voulait dire les retrouver tous, et en
 * oublier un. Ils vivent désormais ICI, et ici seulement.
 *
 * ─── CE QUI EST SÛR DE CHANGER ────────────────────────────────────────────────
 * `nom`, `surTitre`, `signature`, `slogan` sont purement affichés : les modifier
 * n'a aucun effet sur les données, l'historique ou les programmes.
 *
 * ─── CE QUI NE DOIT PAS CHANGER ───────────────────────────────────────────────
 * `cleStockage` et `idSauvegarde` sont des IDENTIFIANTS TECHNIQUES, pas des
 * libellés. `cleStockage` est la clé sous laquelle tout l'historique est écrit :
 * la changer rendrait l'application vide au rechargement, comme une installation
 * neuve, sans rien effacer mais sans plus rien retrouver. `idSauvegarde` est le
 * tampon posé dans les fichiers d'export : le modifier ferait rejeter tous les
 * fichiers déjà exportés. Ils sont volontairement séparés du nom pour que
 * renommer l'application reste sans danger.
 *
 * ─── OÙ LE NOM APPARAÎT ENCORE HORS DE CE FICHIER ─────────────────────────────
 * Deux endroits que JavaScript ne peut pas atteindre au chargement, et qu'il
 * faut donc éditer à la main — c'est signalé par un commentaire sur place :
 *   · `manifest.webmanifest` — nom de l'icône sur l'écran d'accueil Android ;
 *   · `index.html` — `<title>` et `apple-mobile-web-app-title`, lus par le
 *     navigateur AVANT tout script.
 * Le reste (en-tête, mentions, titres d'écran) se met à jour tout seul.
 */

/** @typedef {{nom:string, surTitre:string, signature:string, slogan:string, cleStockage:string, idSauvegarde:string}} Identite */

/** @type {Identite} */
export const IDENTITE = {
  /** Nom affiché dans l'en-tête et partout dans l'interface. */
  nom: "Coach Perso",
  /** Sur-titre au-dessus du nom, sur l'accueil uniquement. Court : deux mots au plus. */
  surTitre: "Musculation",
  /** Phrase de bas de page, mention légale comprise. */
  signature: "Application de musculation personnelle, locale et hors ligne. Ne remplace pas un avis médical.",
  /** Slogan — écran de démarrage et onboarding. Vide = aucun slogan affiché. */
  slogan: "Ton entraînement, tes données, hors ligne.",

  /* ── Identifiants techniques : NE PAS MODIFIER ── */
  /** Clé de stockage local. La changer perdrait l'accès à tout l'historique. */
  cleStockage: "coachperso.ia.v1",
  /** Tampon des fichiers d'export. Le changer ferait rejeter les sauvegardes existantes. */
  idSauvegarde: "coach-perso-ia",
};

/**
 * Titre de page complet : « Nom — Sur-titre ». Sans sur-titre, le nom seul.
 * @returns {string}
 */
export function titreComplet() {
  return IDENTITE.surTitre ? `${IDENTITE.nom} — ${IDENTITE.surTitre}` : IDENTITE.nom;
}
