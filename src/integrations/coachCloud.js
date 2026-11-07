// @ts-check
/**
 * Coach IA « cloud » — FACULTATIF, éteint par défaut, sans aucun secret embarqué.
 *
 * Troisième étage du coach, derrière le moteur déterministe
 * (`src/engine/assistant.js`) et le moteur local (`src/integrations/coachIA.js`).
 * Il n'existe que si l'utilisateur le branche dans Compte → Coach, de l'une de
 * deux façons :
 *
 *  1. « Ta clé » (Claude, OpenAI, Gemini) — la clé est saisie à l'exécution,
 *     rangée dans les réglages de CET appareil, jamais committée et jamais
 *     exportée dans une sauvegarde (cf. reglagesSansSecret, src/engine/backup.js).
 *     L'appel part directement du navigateur vers le fournisseur : les trois
 *     l'autorisent avec une clé utilisateur (Claude via l'en-tête
 *     `anthropic-dangerous-direct-browser-access`).
 *
 *  2. « Relais sécurisé » — l'application appelle TON serveur (un Cloudflare
 *     Worker prêt à déployer dans `server/coach-relais/`). La clé d'API vit dans
 *     une variable d'environnement du serveur ; le téléphone ne la voit jamais.
 *     Un jeton d'accès facultatif empêche un inconnu d'utiliser ton relais.
 *
 * Pourquoi pas une clé du projet : Coach Perso est publié sur GitHub Pages, tout
 * ce qui est dans le dépôt est public. Une clé dans le JavaScript serait volée
 * en quelques heures.
 *
 * Les fonctions de construction (prompt, corps, URL, en-têtes, lecture de flux)
 * sont PURES et testées sans réseau ; seule `demander()` touche au réseau.
 */

/**
 * Consigne système du coach.
 *
 * Elle autorise des réponses structurées (un programme complet tient rarement
 * en quatre phrases) mais reste stricte sur trois points : les données de
 * l'utilisateur sont la seule source de chiffres, aucun conseil médical, et
 * toute modification passe par une PROPOSITION que l'utilisateur valide dans
 * l'application. Le format de proposition est un bloc JSON que l'application
 * vérifie (identifiants d'exercices réels, bornes) avant de l'afficher.
 */
export const SYSTEM_PROMPT =
  "Tu es le coach de musculation de l'application Coach Perso. Tu parles français, "
  + "tu tutoies, tu es direct, précis et encourageant sans flagornerie. Réponds de façon "
  + "concise : quelques phrases pour une question simple, une liste courte quand c'est utile. "
  + "Tu peux utiliser **gras** et des listes à puces « - ». Pas de tableaux, pas de titres.\n"
  + "RÈGLES :\n"
  + "- Appuie-toi STRICTEMENT sur les données de l'utilisateur fournies ci-dessous. N'invente "
  + "jamais un chiffre, une charge, un record ou un historique. Si une information manque, dis-le "
  + "et indique l'écran de l'application où la trouver ou la saisir (Séance, Routines, Exercices, "
  + "Récupération, Compte → Progrès, Nutrition).\n"
  + "- Aucun conseil médical, aucun diagnostic. En cas de douleur : prudence, alternative plus "
  + "douce, et avis d'un professionnel de santé si elle persiste.\n"
  + "- N'augmente jamais une charge sans que les données la justifient (double progression : "
  + "haut de fourchette atteint sur toutes les séries → charge légèrement supérieure).\n"
  + "- La récupération affichée par l'application est une estimation d'entraînement, pas une mesure.\n"
  + "CRÉER OU MODIFIER UNE ROUTINE : si l'utilisateur te demande un programme, une routine, une "
  + "séance ou une modification de son plan, réponds d'abord en 2 à 4 phrases (la logique du plan), "
  + "puis ajoute UN SEUL bloc ```json``` au format exact suivant, que l'application lui proposera "
  + "d'enregistrer :\n"
  + "```json\n"
  + "{\"type\":\"routine\",\"nom\":\"Haut / bas 4 jours\",\"seances\":[{\"nom\":\"Haut A\","
  + "\"exercices\":[{\"id\":\"identifiant-exact\",\"series\":3,\"reps\":\"8-12\",\"repos\":90}]}]}\n"
  + "```\n"
  + "Contraintes du bloc : n'utilise QUE des identifiants de la liste « EXERCICES DISPONIBLES » ; "
  + "1 à 7 séances ; 3 à 8 exercices par séance ; series de 1 à 6 ; reps « min-max » (ou un "
  + "nombre de secondes avec \"secondes\": 40 pour le gainage) ; repos en secondes. Respecte le "
  + "matériel, le niveau, la durée de séance et les limitations de l'utilisateur. Ne dis jamais "
  + "que la routine est enregistrée : c'est l'utilisateur qui la valide.\n"
  + "MODIFIER UNE ROUTINE EXISTANTE : renvoie la routine COMPLÈTE modifiée, avec en plus "
  + "\"base\":\"nom exact de la routine d'origine\" (voir « ROUTINES ACTUELLES »). L'application "
  + "l'enregistre comme nouvelle version, après validation, sans toucher à l'originale.\n"
  + "STAGNATION : si un exercice est signalé en stagnation, propose une seule action concrète "
  + "(deload de 10 %, changement de plage de reps, variante proche, ou repos), jamais plusieurs à la fois.";

/** Fournisseurs reconnus. Les modèles par défaut sont rapides et économiques. */
export const FOURNISSEURS = {
  anthropic: {
    nom: "Claude",
    modeleDefaut: "claude-haiku-5-5",
    hote: "api.anthropic.com",
    aide: "Clé depuis console.anthropic.com → API Keys (commence par « sk-ant- »).",
  },
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
  relais: {
    nom: "Relais sécurisé",
    modeleDefaut: "",
    hote: "",
    aide: "L'adresse de ton relais (Cloudflare Worker de server/coach-relais/). La clé d'API reste sur le serveur.",
  },
};

/** Taille maximale d'une réponse : un programme de 4 séances en JSON tient largement. */
export const MAX_TOKENS = 1600;
/** Nombre de messages de conversation renvoyés au modèle (5 échanges). */
export const MAX_HISTORIQUE = 10;
/** Une réponse plus longue que ceci est tronquée dans l'historique renvoyé. */
const MAX_CAR_HISTO = 4000;

/**
 * Normalise la configuration saisie par l'utilisateur et applique les défauts.
 * @param {{fournisseur?:string, cle?:string, modele?:string, url?:string, jeton?:string}} [cfg]
 * @returns {{fournisseur:string, cle:string, modele:string, url:string, jeton:string}}
 */
export function normaliserConfig(cfg = {}) {
  const fournisseur = FOURNISSEURS[cfg.fournisseur] ? cfg.fournisseur : "openai";
  const modele = (cfg.modele || "").trim() || FOURNISSEURS[fournisseur].modeleDefaut;
  return {
    fournisseur, modele,
    cle: (cfg.cle || "").trim(),
    url: (cfg.url || "").trim(),
    jeton: (cfg.jeton || "").trim(),
  };
}

/**
 * L'adresse d'un relais est-elle acceptable ? HTTPS obligatoire (la conversation
 * contient des données personnelles), sauf en local pour le développement.
 * @param {string} url
 */
export function urlRelaisValide(url) {
  try {
    const u = new URL(String(url || ""));
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}

/** La configuration est-elle exploitable ? */
export function configPrete(cfg) {
  const c = normaliserConfig(cfg);
  if (c.fournisseur === "relais") return urlRelaisValide(c.url);
  return !!FOURNISSEURS[c.fournisseur] && c.cle.length > 0;
}

/**
 * Historique de conversation nettoyé : rôles valides, contenus non vides,
 * alternance user/assistant, plafonné aux derniers messages, et commençant par
 * un message utilisateur (Claude l'exige). Fonction PURE.
 * @param {{role:string, content:string}[]} [historique]
 */
export function nettoyerHistorique(historique = []) {
  const propres = (Array.isArray(historique) ? historique : [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && String(m.content || "").trim())
    .map((m) => ({ role: m.role, content: String(m.content).trim().slice(0, MAX_CAR_HISTO) }));
  // Fusionne deux messages consécutifs du même rôle (réponse interrompue, etc.).
  const alt = [];
  for (const m of propres) {
    const d = alt[alt.length - 1];
    if (d && d.role === m.role) d.content += `\n\n${m.content}`;
    else alt.push({ ...m });
  }
  let out = alt.slice(-MAX_HISTORIQUE);
  while (out.length && out[0].role !== "user") out = out.slice(1);
  // L'historique précède une nouvelle question : il doit finir par l'assistant.
  while (out.length && out[out.length - 1].role !== "assistant") out = out.slice(0, -1);
  return out;
}

/**
 * Messages au format « chat » commun : consigne système (avec le contexte
 * factuel), historique éventuel, puis la question. Fonction PURE.
 * @param {string} question
 * @param {string} contexte  résumé factuel généré par l'app
 * @param {{role:string, content:string}[]} [historique]
 * @returns {{role:string, content:string}[]}
 */
export function construireMessages(question, contexte, historique = []) {
  return [
    { role: "system", content: `${SYSTEM_PROMPT}\n\nDONNÉES DE L'UTILISATEUR :\n${contexte || "(aucune donnée)"}` },
    ...nettoyerHistorique(historique),
    { role: "user", content: String(question || "").trim() },
  ];
}

/**
 * URL de l'endpoint de streaming pour un fournisseur. Fonction PURE.
 * La clé Gemini voyage en paramètre d'URL (protocole de Google) ; les autres en
 * en-tête (cf. `entetes`).
 * @param {{fournisseur:string, modele?:string, cle?:string, url?:string}} cfg
 */
export function endpointPour(cfg) {
  const c = normaliserConfig(cfg);
  if (c.fournisseur === "gemini") {
    return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(c.modele)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(c.cle)}`;
  }
  if (c.fournisseur === "anthropic") return "https://api.anthropic.com/v1/messages";
  if (c.fournisseur === "relais") return c.url;
  return "https://api.openai.com/v1/chat/completions";
}

/** En-têtes HTTP de la requête. Fonction PURE. */
export function entetes(cfg) {
  const c = normaliserConfig(cfg);
  /** @type {Record<string,string>} */
  const base = { "Content-Type": "application/json" };
  if (c.fournisseur === "openai") base.Authorization = `Bearer ${c.cle}`;
  if (c.fournisseur === "anthropic") {
    base["x-api-key"] = c.cle;
    base["anthropic-version"] = "2023-06-01";
    // Autorise l'appel direct depuis un navigateur. Acceptable ICI parce que la
    // clé appartient à l'utilisateur et ne vit que sur son propre appareil.
    base["anthropic-dangerous-direct-browser-access"] = "true";
  }
  if (c.fournisseur === "relais" && c.jeton) base.Authorization = `Bearer ${c.jeton}`;
  return base;
}

/**
 * Corps JSON de la requête, au format propre à chaque fournisseur. Fonction PURE.
 * @param {{fournisseur:string, modele?:string}} cfg
 * @param {{role:string, content:string}[]} messages
 */
export function corpsRequete(cfg, messages) {
  const c = normaliserConfig(cfg);
  const sys = messages.find((m) => m.role === "system");
  const tours = messages.filter((m) => m.role !== "system");
  if (c.fournisseur === "gemini") {
    // Gemini sépare la consigne système du reste et nomme l'assistant « model ».
    const contents = tours.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const body = { contents, generationConfig: { temperature: 0.4, maxOutputTokens: MAX_TOKENS } };
    if (sys) body.systemInstruction = { parts: [{ text: sys.content }] };
    return body;
  }
  if (c.fournisseur === "anthropic" || c.fournisseur === "relais") {
    // Format Messages de Claude. Le relais reçoit le même corps SANS modèle :
    // c'est le serveur qui choisit le modèle (et paie), pas le client.
    const body = {
      max_tokens: MAX_TOKENS, temperature: 0.4, stream: true,
      system: sys ? sys.content : undefined,
      messages: tours.map((m) => ({ role: m.role, content: m.content })),
    };
    if (c.fournisseur === "anthropic") return { model: c.modele, ...body };
    return body;
  }
  return { model: c.modele, messages, temperature: 0.4, max_tokens: MAX_TOKENS, stream: true };
}

/**
 * Extrait le fragment de texte d'un évènement SSE déjà parsé. Rend "" si
 * l'évènement ne porte pas de texte. Fonction PURE.
 * @param {string} fournisseur
 * @param {any} json
 */
export function fragmentDepuisEvenement(fournisseur, json) {
  try {
    if (fournisseur === "gemini") {
      const parts = json?.candidates?.[0]?.content?.parts || [];
      return parts.map((p) => p?.text || "").join("");
    }
    if (fournisseur === "anthropic" || fournisseur === "relais") {
      return json?.type === "content_block_delta" && json?.delta?.type === "text_delta" ? (json.delta.text || "") : "";
    }
    return json?.choices?.[0]?.delta?.content || "";
  } catch {
    return "";
  }
}

/**
 * Message d'erreur lisible à partir d'un statut HTTP. Fonction PURE.
 * @param {number} code
 * @param {string} fournisseur
 */
export function messageErreur(code, fournisseur) {
  if (code === 401) return fournisseur === "relais" ? "jeton du relais refusé" : "clé refusée";
  if (code === 403) return fournisseur === "relais" ? "origine non autorisée par le relais" : "accès refusé par le fournisseur";
  if (code === 404) return fournisseur === "relais" ? "adresse du relais introuvable" : "modèle inconnu — vérifie son nom dans Compte → Coach";
  if (code === 429) return "quota ou cadence dépassés, réessaie dans un moment";
  if (code === 529 || code === 503) return "service momentanément surchargé, réessaie";
  if (code >= 500) return `le service a rencontré une erreur (${code})`;
  return `erreur ${code}`;
}

/**
 * Interroge le fournisseur en streaming. SEULE fonction réseau du module.
 * @param {string} question
 * @param {string} contexte
 * @param {{fournisseur:string, cle?:string, modele?:string, url?:string, jeton?:string}} cfg
 * @param {(txt:string)=>void} [onToken]  reçoit le texte au fil de l'eau
 * @param {{historique?:{role:string, content:string}[], signal?:AbortSignal}} [opts]
 * @returns {Promise<string>} la réponse complète
 */
export async function demander(question, contexte, cfg, onToken = null, opts = {}) {
  const c = normaliserConfig(cfg);
  if (!configPrete(c)) throw new Error("Configuration du coach incomplète.");
  const messages = construireMessages(question, contexte, opts.historique || []);
  let rep;
  try {
    rep = await fetch(endpointPour(c), {
      method: "POST",
      headers: entetes(c),
      body: JSON.stringify(corpsRequete(c, messages)),
      signal: opts.signal,
    });
  } catch (e) {
    if (e && e.name === "AbortError") throw e;
    throw new Error("pas de connexion au service — vérifie ton réseau");
  }
  if (!rep.ok) throw new Error(`Le service a répondu : ${messageErreur(rep.status, c.fournisseur)}.`);
  if (!rep.body) throw new Error("Réponse vide du service.");

  // Lecture du flux SSE : des lignes « data: {json} » (+ « event: … » chez Claude).
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
      if (json && json.type === "error") throw new Error(`Le service a signalé une erreur : ${json.error?.message || "inconnue"}.`);
      const frag = fragmentDepuisEvenement(c.fournisseur, json);
      if (frag) { complet += frag; if (onToken) onToken(frag); }
    }
  }
  return complet.trim();
}
