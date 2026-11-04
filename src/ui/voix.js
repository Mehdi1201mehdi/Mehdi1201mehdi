// @ts-check
/**
 * VOIX DU COACH — annonces parlées pendant la séance guidée.
 *
 * POURQUOI. À la salle, on a les mains sur une barre, de la musique dans les
 * oreilles et le téléphone posé par terre. `src/ui/son.js` règle déjà la moitié
 * du problème : un bip dit QUE quelque chose vient de se passer. Il ne dit pas
 * QUOI. Entre deux séries, savoir s'il reste une série ou trois, et de quel
 * exercice, oblige à se baisser et à regarder. La voix supprime ce geste.
 *
 * CE QUE CE MODULE N'EST PAS. Ce n'est pas un coach IA, pas un assistant, pas un
 * chatbot — c'est interdit par la direction produit et ce serait de toute façon
 * du bavardage. Ici, chaque phrase est une CHAÎNE CONSTRUITE PAR UNE FONCTION
 * PURE à partir de l'état de la séance. Aucun modèle, aucun réseau, aucune
 * variation : le même état produit toujours exactement le même texte, et ce
 * texte est testable ligne par ligne. C'est de la lecture à voix haute de ce qui
 * est déjà à l'écran, rien de plus.
 *
 * COMMENT. `speechSynthesis`, l'API native du navigateur. Elle utilise la
 * synthèse vocale du système Android — déjà installée, déjà en français, zéro
 * octet à télécharger, fonctionne hors ligne. C'est la seule approche qui tienne
 * dans une PWA sans build : des fichiers audio pour « plus que deux séries de
 * développé couché » demanderaient des milliers d'enregistrements.
 *
 * TROIS RÈGLES, reprises de la signature sonore :
 *
 *   1. ON NE DIT QUE CE QU'ON NE PEUT PAS VOIR SANS SE BAISSER. Jamais un
 *      encouragement, jamais une reformulation de ce qui vient d'être dit.
 *   2. COURT. Huit mots au maximum : quatre pour le nom de l'exercice, quatre
 *      pour la série. Une phrase plus longue finit APRÈS le début de la série
 *      suivante, et on prend l'habitude de couper le son.
 *   3. SILENCIEUSE PAR DÉFAUT. Une application qui se met à parler toute seule
 *      au milieu d'une salle de sport est un problème, pas une fonctionnalité.
 *      L'utilisateur l'allume lui-même, depuis l'écran où elle sert.
 */

/** Réglage par défaut : la voix est ÉTEINTE tant qu'on ne l'allume pas. */
export const VOIX_DEFAUT = false;

/** Débit de parole. 1 est trop lent pour des annonces de trois mots. */
export const DEBIT = 1.08;

/**
 * Secondes restantes auxquelles le repos est décompté à voix haute.
 * Trois seulement : à 10 s on se remet en place, puis 3-2-1. Décompter dix
 * secondes d'affilée transformerait la voix en nuisance.
 */
export const JALONS_REPOS = [10, 3, 2, 1];

/**
 * La synthèse vocale est-elle utilisable ici ?
 * @param {any} [portee] objet global à inspecter (injectable pour les tests)
 */
export function voixDisponible(portee = globalThis) {
  const s = portee && portee.speechSynthesis;
  return !!(s && typeof s.speak === "function" && typeof portee.SpeechSynthesisUtterance === "function");
}

/**
 * Choisit la meilleure voix française disponible.
 *
 * L'ordre compte : une voix `fr-FR` passe avant une `fr-CA`, et une voix locale
 * (embarquée dans le téléphone) passe avant une voix réseau — cette dernière se
 * tait purement et simplement en mode avion, ce qui est précisément le moment où
 * l'application doit continuer de fonctionner.
 *
 * @param {{lang?:string, localService?:boolean, name?:string}[]} voix
 * @returns {any|null}
 */
export function choisirVoix(voix) {
  const liste = Array.isArray(voix) ? voix.filter((v) => v && typeof v.lang === "string") : [];
  if (!liste.length) return null;
  const note = (v) => {
    const l = v.lang.replace("_", "-").toLowerCase();
    if (!l.startsWith("fr")) return -1;
    return (l === "fr-fr" ? 4 : 2) + (v.localService ? 1 : 0);
  };
  let meilleure = null, max = 0;
  for (const v of liste) {
    const n = note(v);
    if (n > max) { max = n; meilleure = v; }
  }
  return meilleure;
}

/* ======================================================================
   LES PHRASES — fonctions pures, testables, sans aucun effet de bord.
   ====================================================================== */

/**
 * Nom d'exercice raccourci pour l'oral.
 *
 * « Développé couché (barre) » se prononce « développé couché parenthèse barre »
 * sur certaines synthèses. On retire les parenthèses, et on coupe à QUATRE mots :
 * le nom est suivi de « série 2 sur 4 », et l'annonce entière doit tenir en huit
 * mots. « Rowing barre buste penché prise large supination » devient « rowing
 * barre buste penché » — on reconnaît le mouvement, c'est tout ce qu'on demande.
 *
 * @param {string} nom
 */
export function nomParle(nom) {
  const propre = String(nom || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[-–—]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const mots = propre.split(" ").filter(Boolean);
  return mots.slice(0, 4).join(" ");
}

/**
 * Annonce d'une série : quel exercice, et surtout COMBIEN IL EN RESTE.
 *
 * « Série 2 sur 4 » est l'information qu'on cherche en se baissant vers son
 * téléphone. La dernière série est nommée « dernière série » et non « série 4
 * sur 4 » : c'est le seul moment où l'on décide de tout donner, et un ordinal ne
 * le dit pas.
 *
 * @param {string} nom      nom de l'exercice
 * @param {number} index    index de la série, à partir de 0
 * @param {number} total    nombre de séries de l'exercice
 * @param {boolean} [nouvelExo] vrai si l'exercice vient de changer
 */
export function phraseSerie(nom, index, total, nouvelExo = false) {
  const i = Math.max(0, Math.floor(Number(index) || 0));
  const t = Math.max(1, Math.floor(Number(total) || 1));
  const titre = nouvelExo ? `${nomParle(nom)}. ` : "";
  if (t === 1) return `${titre}Série unique.`.trim();
  if (i >= t - 1) return `${titre}Dernière série.`.trim();
  return `${titre}Série ${i + 1} sur ${t}.`.trim();
}

/**
 * Annonce du repos. On donne la durée en minutes quand elle est ronde : « une
 * minute trente » s'entend mieux que « quatre-vingt-dix secondes ».
 * @param {number} sec
 */
export function phraseRepos(sec) {
  const s = Math.max(0, Math.round(Number(sec) || 0));
  if (!s) return "Repos.";
  if (s < 60) return `Repos, ${s} secondes.`;
  const m = Math.floor(s / 60), r = s % 60;
  const mm = m === 1 ? "une minute" : `${m} minutes`;
  if (!r) return `Repos, ${mm}.`;
  if (r === 30) return `Repos, ${mm} trente.`;
  return `Repos, ${mm} ${r}.`;
}

/**
 * Décompte de fin de repos. Ne parle qu'aux jalons : voir `JALONS_REPOS`.
 * @param {number} restant secondes restantes
 * @returns {string} texte à dire, ou "" pour se taire
 */
export function phraseDecompte(restant) {
  const s = Math.round(Number(restant));
  if (!JALONS_REPOS.includes(s)) return "";
  return s === 10 ? "Dix secondes." : String(s);
}

/** Fin du repos — le signal de reprise. */
export function phraseReprise() { return "C'est parti."; }

/**
 * Fin de séance. Le volume est dit parce que c'est le chiffre qu'on regarde en
 * premier sur l'écran de bilan, et qu'à ce moment-là on range ses affaires.
 * @param {number} volumeKg
 */
export function phraseFin(volumeKg) {
  const v = Math.round(Number(volumeKg) || 0);
  if (v <= 0) return "Séance terminée.";
  const t = v / 1000;
  const chiffre = t >= 1 ? `${t.toFixed(1).replace(".", ",")} tonnes` : `${v} kilos`;
  return `Séance terminée. ${chiffre} soulevés.`;
}

/* ======================================================================
   LE MOTEUR — la seule partie qui touche au navigateur.
   ====================================================================== */

/** @type {any} */
let _voix = null;
/** @type {boolean} */
let _cherchee = false;

/**
 * La liste des voix arrive de façon asynchrone sur Android : au premier appel
 * elle est souvent vide, et se remplit quelques centaines de millisecondes plus
 * tard. On la relit donc tant qu'on n'a rien trouvé, au lieu de conclure une
 * fois pour toutes qu'il n'y a pas de voix française.
 * @param {any} [portee]
 */
function voixCourante(portee = globalThis) {
  if (_voix) return _voix;
  const liste = portee.speechSynthesis.getVoices?.() || [];
  if (liste.length) { _voix = choisirVoix(liste); _cherchee = true; }
  return _voix;
}

/**
 * Dit un texte. Ne fait rien si le texte est vide, si la synthèse est absente,
 * ou si l'appel échoue — une annonce ratée ne doit jamais interrompre la séance.
 *
 * @param {string} texte
 * @param {{interrompre?:boolean, portee?:any}} [opts] `interrompre` coupe
 *        l'annonce en cours : utilisé pour le décompte, où « 2 » doit effacer
 *        « 3 » au lieu de s'empiler derrière.
 * @returns {boolean} vrai si quelque chose a été prononcé
 */
export function dire(texte, opts = {}) {
  const portee = opts.portee || globalThis;
  const t = String(texte || "").trim();
  if (!t || !voixDisponible(portee)) return false;
  try {
    const synth = portee.speechSynthesis;
    if (opts.interrompre) synth.cancel();
    const u = new portee.SpeechSynthesisUtterance(t);
    u.lang = "fr-FR";
    u.rate = DEBIT;
    const v = voixCourante(portee);
    if (v) u.voice = v;
    synth.speak(u);
    return true;
  } catch (e) {
    return false;
  }
}

/** Coupe immédiatement toute annonce en cours (sortie du mode guidé). */
export function couperVoix(portee = globalThis) {
  try { if (voixDisponible(portee)) portee.speechSynthesis.cancel(); } catch (e) { /* sans objet */ }
}

/** Oublie la voix mémorisée — utile si l'utilisateur change la langue système. */
export function reinitialiserVoix() { _voix = null; _cherchee = false; }
