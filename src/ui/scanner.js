// @ts-check
/**
 * SCANNER DE CODE-BARRES — le chaînon manquant de la nutrition.
 *
 * L'application savait déjà interroger Open Food Facts par code-barres. Ce
 * qu'elle demandait, c'était de TAPER treize chiffres à la main, debout dans une
 * cuisine, en tenant un paquet de pâtes. Personne ne le fait deux fois.
 *
 * Ici la caméra s'en charge, via `BarcodeDetector` — une API NATIVE du
 * navigateur (Chrome/Android). Aucune bibliothèque, aucun build, rien à
 * télécharger : cohérent avec le reste de l'app, et ça marche hors ligne (la
 * lecture du code est locale ; seule la fiche produit demande le réseau).
 *
 * Trois partis pris, tous là pour éviter le pire défaut d'un scanner : annoncer
 * un produit qui n'est pas celui qu'on tient.
 *
 *   1. CHIFFRE DE CONTRÔLE VÉRIFIÉ. Un code-barres porte sa propre clé. Une
 *      lecture partielle produit presque toujours une clé fausse : on la rejette
 *      au lieu d'aller chercher un produit au hasard.
 *   2. PLUSIEURS LECTURES IDENTIQUES EXIGÉES. Une seule image peut mentir. Trois
 *      lectures d'affilée sur le même code, c'est une seconde de plus et une
 *      erreur de moins.
 *   3. DÉGRADATION HONNÊTE. Pas de caméra, pas d'API, permission refusée : la
 *      saisie manuelle reste là, et le message dit ce qui manque — jamais un
 *      bouton qui ne fait rien.
 */

/** Formats lus. Les codes alimentaires européens sont en EAN-13 ; l'EAN-8
 *  couvre les petits emballages, l'UPC-A les produits importés. */
export const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

/** Lectures identiques d'affilée avant d'accepter un code. */
export const CONFIRMATIONS = 3;

/** Cadence d'analyse. À 60 Hz le scanner chauffe le téléphone pour rien : un
 *  code-barres ne bouge pas si vite. 10 Hz suffit et divise le coût par six. */
export const PERIODE_MS = 100;

/**
 * Chiffre de contrôle attendu pour un code (tous chiffres SAUF le dernier).
 *
 * Norme GS1 : de droite à gauche, les rangs impairs pèsent 3, les pairs 1 ; le
 * complément à la dizaine supérieure est la clé.
 *
 * @param {string} corps  le code SANS son dernier chiffre
 * @returns {number|null} null si le corps n'est pas purement numérique
 */
export function chiffreControle(corps) {
  if (!/^\d+$/.test(String(corps || ""))) return null;
  const c = String(corps);
  let somme = 0;
  for (let i = 0; i < c.length; i++) {
    // Le rang se compte depuis la DROITE du code complet, clé incluse.
    const depuisDroite = c.length - i;
    somme += Number(c[i]) * (depuisDroite % 2 === 1 ? 3 : 1);
  }
  return (10 - (somme % 10)) % 10;
}

/**
 * Le code est-il un code-barres produit plausible ?
 *
 * Longueurs admises : EAN-8, UPC-A (12), EAN-13, ITF-14. Tout le reste est
 * refusé — un code court lu de travers ne doit pas déclencher une requête.
 *
 * @param {unknown} code
 */
export function codeValide(code) {
  const c = String(code == null ? "" : code).trim();
  if (!/^\d+$/.test(c)) return false;
  if (![8, 12, 13, 14].includes(c.length)) return false;
  return chiffreControle(c.slice(0, -1)) === Number(c.slice(-1));
}

/**
 * Forme canonique d'un code, pour interroger Open Food Facts.
 *
 * Un UPC-A (12 chiffres, produits nord-américains) est le même produit que
 * l'EAN-13 préfixé d'un zéro. Sans cette normalisation, un produit importé
 * ressort « introuvable » alors qu'il est en base.
 *
 * @param {unknown} code
 * @returns {string} chaîne vide si le code est inexploitable
 */
export function normaliserCode(code) {
  const c = String(code == null ? "" : code).replace(/[\s-]/g, "");
  if (!codeValide(c)) return "";
  return c.length === 12 ? "0" + c : c;
}

/**
 * Accumulateur de lectures : ne rend un code qu'après `seuil` lectures
 * IDENTIQUES ET CONSÉCUTIVES. Un code différent remet le compteur à zéro —
 * sinon deux produits côte à côte finiraient par « voter » l'un pour l'autre.
 *
 * @param {number} [seuil]
 */
export function confirmateur(seuil = CONFIRMATIONS) {
  const n = Math.max(1, Math.round(Number(seuil) || 1));
  let courant = "";
  let compte = 0;
  return {
    /**
     * @param {unknown} code lecture brute
     * @returns {string} le code normalisé une fois confirmé, sinon ""
     */
    ajouter(code) {
      const c = normaliserCode(code);
      if (!c) { courant = ""; compte = 0; return ""; }
      if (c === courant) compte++; else { courant = c; compte = 1; }
      return compte >= n ? c : "";
    },
    /** Progression vers la confirmation, 0 → 1 (pour un retour visuel). */
    get progression() { return Math.min(1, compte / n); },
    reset() { courant = ""; compte = 0; },
  };
}

/**
 * Ce navigateur sait-il scanner ? Renvoie la raison quand c'est non, pour que
 * l'interface l'explique au lieu d'afficher un bouton inerte.
 *
 * @param {any} [fenetre]
 * @returns {{ok:boolean, raison:string}}
 */
export function scannerDisponible(fenetre) {
  const w = fenetre || (typeof window !== "undefined" ? window : null);
  if (!w) return { ok: false, raison: "Le scan n'est pas disponible ici." };
  const nav = w.navigator || {};
  if (!nav.mediaDevices || !nav.mediaDevices.getUserMedia) {
    return { ok: false, raison: "Ce navigateur ne donne pas accès à la caméra. Saisis le code à la main." };
  }
  if (typeof w.BarcodeDetector !== "function") {
    return { ok: false, raison: "Ce navigateur ne sait pas lire les codes-barres (Chrome sur Android le fait). Saisis le code à la main." };
  }
  // Sans HTTPS (ou localhost), la caméra est refusée par le navigateur lui-même.
  if (w.isSecureContext === false) {
    return { ok: false, raison: "La caméra exige une connexion sécurisée (https)." };
  }
  return { ok: true, raison: "" };
}

/**
 * Message lisible pour une erreur de caméra. `getUserMedia` renvoie des noms
 * techniques ; « NotAllowedError » n'aide personne à comprendre qu'il faut
 * autoriser la caméra dans les réglages du navigateur.
 *
 * @param {any} err
 */
export function messageErreurCamera(err) {
  const nom = (err && (err.name || err.code)) || "";
  switch (nom) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Accès à la caméra refusé. Autorise-le dans les réglages du navigateur, ou saisis le code à la main.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "Aucune caméra détectée sur cet appareil.";
    case "NotReadableError":
    case "TrackStartError":
      return "La caméra est déjà utilisée par une autre application.";
    case "OverconstrainedError":
      return "La caméra arrière n'est pas disponible sur cet appareil.";
    default:
      return "La caméra n'a pas pu démarrer. Saisis le code à la main.";
  }
}

/**
 * Démarre le scan sur un élément vidéo. Renvoie une fonction d'arrêt.
 *
 * L'arrêt DOIT couper la piste vidéo : un flux laissé ouvert garde la diode de
 * la caméra allumée et vide la batterie, même écran fermé.
 *
 * @param {object} opts
 * @param {HTMLVideoElement} opts.video
 * @param {(code:string)=>void} opts.onCode      appelé une seule fois, code confirmé
 * @param {(msg:string)=>void} [opts.onErreur]
 * @param {(p:number)=>void} [opts.onProgression]
 * @param {(dispo:boolean)=>void} [opts.onTorche] la lampe est-elle pilotable
 * @returns {{arreter:()=>void, torche:(on:boolean)=>Promise<boolean>}}
 */
export function demarrerScan({ video, onCode, onErreur, onProgression, onTorche }) {
  let stream = /** @type {MediaStream|null} */ (null);
  let minuteur = /** @type {any} */ (0);
  let fini = false;
  const conf = confirmateur();

  const arreter = () => {
    fini = true;
    if (minuteur) { clearInterval(minuteur); minuteur = 0; }
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    if (video) { try { video.srcObject = null; } catch (e) { /* déjà détaché */ } }
  };

  /** @param {boolean} on */
  const torche = async (on) => {
    const piste = stream && stream.getVideoTracks()[0];
    if (!piste) return false;
    try { await piste.applyConstraints({ advanced: [/** @type {any} */ ({ torch: on })] }); return true; }
    catch (e) { return false; }
  };

  (async () => {
    try {
      // `facingMode: environment` = caméra arrière. C'est un souhait, pas une
      // exigence : sur un appareil sans caméra arrière, l'exiger ferait échouer
      // le scan au lieu d'utiliser celle qui existe.
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false,
      });
      if (fini) { stream.getTracks().forEach((t) => t.stop()); return; }
      video.srcObject = stream;
      video.setAttribute("playsinline", "");
      await video.play().catch(() => { /* lecture différée : le scan attend */ });

      const piste = stream.getVideoTracks()[0];
      const caps = piste && piste.getCapabilities ? piste.getCapabilities() : {};
      if (onTorche) onTorche(!!(caps && /** @type {any} */ (caps).torch));

      const detecteur = new /** @type {any} */ (window).BarcodeDetector({ formats: FORMATS });
      minuteur = setInterval(async () => {
        if (fini || video.readyState < 2) return;
        let lectures = [];
        try { lectures = await detecteur.detect(video); }
        catch (e) { return; }   // image non analysable : on réessaie au tick suivant
        const brut = lectures.length ? lectures[0].rawValue : "";
        const ok = conf.ajouter(brut);
        if (onProgression) onProgression(conf.progression);
        if (ok) { arreter(); onCode(ok); }
      }, PERIODE_MS);
    } catch (err) {
      arreter();
      if (onErreur) onErreur(messageErreurCamera(err));
    }
  })();

  return { arreter, torche };
}
