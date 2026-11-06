// @ts-check
/**
 * Coach IA « cloud » — FACULTATIF, éteint par défaut, sans aucun secret embarqué.
 *
 * Troisième et dernier étage du coach, derrière le moteur déterministe
 * (`src/engine/assistant.js`) et le moteur local (`src/integrations/coachIA.js`).
 * Il n'existe que si l'utilisateur colle SA PROPRE clé d'API dans Profil → Coach.
 *
 * Pourquoi « apporte ta clé » et pas une clé du projet :
 *  - Coach Perso est une PWA 100 % client, publiée sur GitHub Pages. Tout ce qui
 *    est dans le dépôt est public : y mettre une clé reviendrait à l'offrir au
 *    monde entier, qui la dépenserait en quelques heures.
 *  - Il n'y a aucun serveur où la cacher. La seule place honnête pour une clé,
 *    c'est le navigateur de son propriétaire. Elle est donc saisie à l'exécution,
 *    rangée dans localStorage (via les réglages), et n'est JAMAIS committée.
 *  - L'appel part directement du navigateur vers OpenAI ou Google. Les deux
 *    autorisent cet appel direct avec une clé utilisateur (CORS ouvert).
 *
 * Ce module ne lit jamais la clé lui-même : l'appelant la lui passe. Les
 * fonctions de construction (prompt, corps de requête, URL) sont PURES et
 * testées sans réseau ; seule `demander()` touche au réseau.
 */

/**
 * Consigne système du coach. Volontairement stricte : réponses courtes,
 * françaises, fondées sur les données réelles, jamais de conseil médical, et —
 * la seule capacité « agent » — la possibilité de PROPOSER une modification
 * concrète (remplacer un exercice, alléger une charge) que l'application
 * appliquera seulement après confirmation de l'utilisateur.
 */
export const SYSTEM_PROMPT =
  "Tu es le coach de musculation de l'application Coach Perso. Tu parles "
  + "français, tu es concis (4 phrases maximum), direct et encourageant sans "
  + "flagornerie. Tu t'appuies STRICTEMENT sur les données de l'utilisateur "
  + "fournies ci-dessous : ne jamais inventer un chiffre, une charge ou un "
  + "historique. Si une information manque, dis-le et renvoie vers l'écran "
  + "concerné de l'application (Séance, Progrès, Récupération). Tu ne donnes "
  + "aucun conseil médical : en cas de douleur, tu recommandes la prudence et, "
  + "si besoin, un professionnel de santé. Tu peux proposer une adaptation "
  + "concrète (remplacer un exercice, ajuster séries, répétitions ou repos), "
  + "mais tu ne fais que la PROPOSER : c'est l'utilisateur qui valide dans "
  + "l'application. Tu n'augmentes jamais une charge sans que les données la "
  + "justifient.";

/** Fournisseurs reconnus. Les modèles par défaut sont économiques et rapides. */
export const FOURNISSEURS = {
  openai: {
    nom: "OpenAI",
    modeleDefaut: "gpt-4o-mini",
    hote: "api.openai.com",
    aide: "Clé depuis platform.openai.com → API keys (commence par « sk- »).",
  },
  gemini: {
    nom: "Google Gemini",
    modeleDefaut: "gemini-2.0-flash",
    hote: "generativelanguage.googleapis.com",
    aide: "Clé depuis aistudio.google.com → Get API key.",
  },
};

/**
 * Normalise la configuration saisie par l'utilisateur et applique les défauts.
 * @param {{fournisseur?:string, cle?:string, modele?:string}} [cfg]
 * @returns {{fournisseur:string, cle:string, modele:string}}
 */
export function normaliserConfig(cfg = {}) {
  const fournisseur = FOURNISSEURS[cfg.fournisseur] ? cfg.fournisseur : "openai";
  const modele = (cfg.modele || "").trim() || FOURNISSEURS[fournisseur].modeleDefaut;
  return { fournisseur, modele, cle: (cfg.cle || "").trim() };
}

/** La configuration est-elle exploitable (fournisseur connu + clé non vide) ? */
export function configPrete(cfg) {
  const c = normaliserConfig(cfg);
  return !!FOURNISSEURS[c.fournisseur] && c.cle.length > 0;
}

/**
 * Messages au format « chat » commun : une consigne système qui embarque le
 * contexte factuel, puis la question. Fonction PURE.
 * @param {string} question
 * @param {string} contexte  résumé factuel généré par l'app
 * @returns {{role:string, content:string}[]}
 */
export function construireMessages(question, contexte) {
  return [
    { role: "system", content: `${SYSTEM_PROMPT}\n\nDONNÉES DE L'UTILISATEUR :\n${contexte || "(aucune donnée)"}` },
    { role: "user", content: String(question || "").trim() },
  ];
}

/**
 * URL de l'endpoint de streaming pour un fournisseur. Fonction PURE.
 * La clé Gemini voyage en paramètre d'URL (c'est le protocole de Google) ; la
 * clé OpenAI voyage en en-tête (cf. `entetes`).
 * @param {{fournisseur:string, modele:string, cle:string}} cfg
 */
export function endpointPour(cfg) {
  const c = normaliserConfig(cfg);
  if (c.fournisseur === "gemini") {
    return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.modele)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(c.cle)}`;
  }
  return "https://api.openai.com/v1/chat/completions";
}

/** En-têtes HTTP de la requête. Fonction PURE. */
export function entetes(cfg) {
  const c = normaliserConfig(cfg);
  const base = { "Content-Type": "application/json" };
  if (c.fournisseur === "openai") base.Authorization = `Bearer ${c.cle}`;
  return base;
}

/**
 * Corps JSON de la requête, au format propre à chaque fournisseur. Fonction PURE.
 * @param {{fournisseur:string, modele:string}} cfg
 * @param {{role:string, content:string}[]} messages
 */
export function corpsRequete(cfg, messages) {
  const c = normaliserConfig(cfg);
  if (c.fournisseur === "gemini") {
    // Gemini sépare la consigne système du reste et nomme l'assistant « model ».
    const sys = messages.find((m) => m.role === "system");
    const tours = messages.filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const body = { contents: tours, generationConfig: { temperature: 0.4, maxOutputTokens: 400 } };
    if (sys) body.systemInstruction = { parts: [{ text: sys.content }] };
    return body;
  }
  return { model: c.modele, messages, temperature: 0.4, max_tokens: 400, stream: true };
}

/**
 * Extrait le fragment de texte d'une ligne d'événement SSE, selon le
 * fournisseur. Rend "" si la ligne ne porte pas de texte. Fonction PURE :
 * c'est elle qui rend le parseur de flux testable sans réseau.
 * @param {string} fournisseur
 * @param {any} json  objet déjà parsé d'un évènement `data:`
 */
export function fragmentDepuisEvenement(fournisseur, json) {
  try {
    if (fournisseur === "gemini") {
      const parts = json?.candidates?.[0]?.content?.parts || [];
      return parts.map((p) => p?.text || "").join("");
    }
    return json?.choices?.[0]?.delta?.content || "";
  } catch {
    return "";
  }
}

/**
 * Interroge le fournisseur cloud en streaming. SEULE fonction réseau du module.
 * @param {string} question
 * @param {string} contexte
 * @param {{fournisseur:string, cle:string, modele:string}} cfg
 * @param {(txt:string)=>void} [onToken]  reçoit le texte au fil de l'eau
 * @returns {Promise<string>} la réponse complète
 */
export async function demander(question, contexte, cfg, onToken = null) {
  const c = normaliserConfig(cfg);
  if (!configPrete(c)) throw new Error("Configuration du coach cloud incomplète.");
  const messages = construireMessages(question, contexte);
  const rep = await fetch(endpointPour(c), {
    method: "POST",
    headers: entetes(c),
    body: JSON.stringify(corpsRequete(c, messages)),
  });
  if (!rep.ok) {
    const code = rep.status;
    const aide = code === 401 ? "clé refusée" : code === 429 ? "quota ou cadence dépassés" : `erreur ${code}`;
    throw new Error(`Le fournisseur a répondu : ${aide}.`);
  }
  if (!rep.body) throw new Error("Réponse vide du fournisseur.");

  // Lecture du flux SSE : des lignes « data: {json} », terminées par « data: [DONE] ».
  const lecteur = rep.body.getReader();
  const dec = new TextDecoder();
  let tampon = "", complet = "";
  for (;;) {
    const { value, done } = await lecteur.read();
    if (done) break;
    tampon += dec.decode(value, { stream: true });
    const lignes = tampon.split("\n");
    tampon = lignes.pop() || "";   // la dernière ligne peut être incomplète
    for (const ligne of lignes) {
      const l = ligne.trim();
      if (!l.startsWith("data:")) continue;
      const charge = l.slice(5).trim();
      if (!charge || charge === "[DONE]") continue;
      let json;
      try { json = JSON.parse(charge); } catch { continue; }
      const frag = fragmentDepuisEvenement(c.fournisseur, json);
      if (frag) { complet += frag; if (onToken) onToken(frag); }
    }
  }
  return complet.trim();
}
