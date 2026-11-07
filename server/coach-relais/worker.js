// @ts-check
/**
 * Relais sécurisé du coach IA de Coach Perso — Cloudflare Worker.
 *
 * Rôle : recevoir la conversation depuis l'application, ajouter la clé d'API
 * (gardée dans une variable d'environnement CHIFFRÉE du Worker), interroger
 * Claude et renvoyer la réponse en streaming. Le téléphone ne voit jamais la clé.
 *
 * Variables (wrangler secret put … / variables du tableau de bord) :
 *   ANTHROPIC_API_KEY   (secret, obligatoire) clé d'API Claude
 *   JETON_ACCES         (secret, fortement conseillé) mot de passe partagé avec
 *                       l'app ; sans lui, toute personne connaissant l'adresse
 *                       du relais pourrait l'utiliser à tes frais
 *   ORIGINES            origines autorisées, séparées par des virgules
 *                       (ex. https://mehdi1201mehdi.github.io,https://localhost)
 *   MODELE              modèle Claude (défaut : claude-haiku-5-5)
 *   MAX_TOKENS          plafond de longueur de réponse (défaut : 1600)
 *
 * Ce relais ne stocke RIEN : pas de base, pas de journal des conversations.
 * Pour plafonner les dépenses, fixe aussi une limite mensuelle dans la console
 * Anthropic : c'est la seule protection absolue contre un abus.
 */

const API = "https://api.anthropic.com/v1/messages";
const MODELE_DEFAUT = "claude-haiku-5-5";
const LIMITES = Object.freeze({
  corpsOctets: 96 * 1024,   // le catalogue d'exercices envoyé par l'app pèse ~20 Ko
  messages: 24,
  carMessage: 8000,
  carSysteme: 60000,
  maxTokens: 1600,
});

/** Liste des origines autorisées. */
function origines(env) {
  return String(env.ORIGINES || "").split(",").map((s) => s.trim()).filter(Boolean);
}

/** En-têtes CORS pour une origine acceptée. */
function cors(origine) {
  return {
    "Access-Control-Allow-Origin": origine,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

/** Réponse JSON d'erreur (au format d'erreur de l'API, que l'app sait lire). */
function erreur(status, message, entetes = {}) {
  return new Response(JSON.stringify({ type: "error", error: { message } }), {
    status, headers: { "Content-Type": "application/json", ...entetes },
  });
}

/** Comparaison en temps constant (évite de deviner le jeton caractère par caractère). */
function egal(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

/**
 * Valide le corps envoyé par l'application. Rend { ok, corps } ou { ok:false, message }.
 * @param {any} b
 * @param {number} plafond
 */
export function validerCorps(b, plafond) {
  if (!b || typeof b !== "object") return { ok: false, message: "corps invalide" };
  const msgs = b.messages;
  if (!Array.isArray(msgs) || !msgs.length || msgs.length > LIMITES.messages) return { ok: false, message: "messages invalides" };
  for (const m of msgs) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return { ok: false, message: "rôle invalide" };
    if (typeof m.content !== "string" || !m.content.trim() || m.content.length > LIMITES.carMessage) return { ok: false, message: "message vide ou trop long" };
  }
  if (msgs[0].role !== "user" || msgs[msgs.length - 1].role !== "user") return { ok: false, message: "la conversation doit commencer et finir par l'utilisateur" };
  if (b.system != null && (typeof b.system !== "string" || b.system.length > LIMITES.carSysteme)) return { ok: false, message: "consigne système invalide" };
  const max = Math.min(plafond, Math.max(1, Math.round(Number(b.max_tokens) || plafond)));
  const temp = Number.isFinite(Number(b.temperature)) ? Math.min(1, Math.max(0, Number(b.temperature))) : 0.4;
  return {
    ok: true,
    corps: {
      messages: msgs.map((m) => ({ role: m.role, content: m.content })),
      ...(b.system ? { system: b.system } : {}),
      max_tokens: max, temperature: temp, stream: true,
    },
  };
}

export default {
  /**
   * @param {Request} request
   * @param {Record<string, string>} env
   */
  async fetch(request, env) {
    const origine = request.headers.get("Origin") || "";
    const permises = origines(env);
    const autorisee = !permises.length || permises.includes(origine);
    const enteteCors = autorisee && origine ? cors(origine) : {};

    if (request.method === "OPTIONS") {
      return autorisee ? new Response(null, { status: 204, headers: enteteCors }) : new Response(null, { status: 403 });
    }
    if (request.method !== "POST") return erreur(405, "méthode non autorisée", enteteCors);
    if (!autorisee) return erreur(403, "origine non autorisée");
    if (!env.ANTHROPIC_API_KEY) return erreur(500, "relais non configuré (ANTHROPIC_API_KEY manquante)", enteteCors);

    if (env.JETON_ACCES) {
      const auth = request.headers.get("Authorization") || "";
      const jeton = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!egal(jeton, env.JETON_ACCES)) return erreur(401, "jeton refusé", enteteCors);
    }

    const taille = Number(request.headers.get("Content-Length") || 0);
    if (taille > LIMITES.corpsOctets) return erreur(413, "requête trop volumineuse", enteteCors);
    let brut;
    try {
      const texte = await request.text();
      if (texte.length > LIMITES.corpsOctets) return erreur(413, "requête trop volumineuse", enteteCors);
      brut = JSON.parse(texte);
    } catch {
      return erreur(400, "JSON illisible", enteteCors);
    }
    const plafond = Math.min(4096, Number(env.MAX_TOKENS) || LIMITES.maxTokens);
    const v = validerCorps(brut, plafond);
    if (!v.ok) return erreur(400, v.message, enteteCors);

    let amont;
    try {
      amont = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model: env.MODELE || MODELE_DEFAUT, ...v.corps }),
      });
    } catch {
      return erreur(502, "Claude injoignable depuis le relais", enteteCors);
    }
    // Les erreurs de l'API (clé invalide, quota…) sont relayées avec leur statut,
    // sans jamais renvoyer la clé ni les en-têtes amont.
    return new Response(amont.body, {
      status: amont.status,
      headers: {
        "Content-Type": amont.headers.get("Content-Type") || "text/event-stream",
        "Cache-Control": "no-store",
        ...enteteCors,
      },
    });
  },
};
