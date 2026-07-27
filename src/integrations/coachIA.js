// @ts-check
/**
 * Coach IA — mode FACULTATIF et désactivé par défaut.
 *
 * ⚠️ Déroge volontairement à la règle « aucune IA embarquée » : c'est un choix
 * explicite de l'utilisateur, activable dans Profil → Coach IA. Tant qu'il n'est
 * pas activé, RIEN n'est chargé et l'app reste 100 % déterministe et hors ligne.
 *
 * Fonctionnement : Transformers.js (Hugging Face) exécute un petit modèle de
 * langage directement dans le navigateur (WebGPU si dispo, sinon WASM). Le
 * premier lancement télécharge les poids du modèle (plusieurs centaines de Mo),
 * puis le navigateur les met en cache pour les fois suivantes.
 *
 * Aucune donnée n'est envoyée à un serveur : l'inférence est locale. Seuls la
 * bibliothèque et les poids sont téléchargés depuis le CDN Hugging Face.
 */

/** Version de Transformers.js chargée depuis le CDN (module ES). */
const CDN = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1";

/**
 * Modèles proposés — petits, compatibles navigateur, quantifiés.
 * Le plus léger d'abord : sur un mobile milieu de gamme, ne dépasse pas 0.5B.
 */
export const MODELES = [
  { id: "onnx-community/Qwen2.5-0.5B-Instruct", nom: "Qwen2.5 0.5B", taille: "~350 Mo", defaut: true },
  { id: "HuggingFaceTB/SmolLM2-360M-Instruct", nom: "SmolLM2 360M", taille: "~280 Mo" },
  { id: "onnx-community/Llama-3.2-1B-Instruct-q4f16", nom: "Llama 3.2 1B", taille: "~800 Mo" },
];

/** Modèle par défaut. */
export const MODELE_DEFAUT = MODELES.find((m) => m.defaut).id;

let _pipe = null;      // pipeline de génération, une fois chargé
let _chargement = null; // promesse de chargement en cours (évite les doublons)
let _modeleCharge = null;

/** Le coach IA est-il déjà prêt à répondre ? */
export function estPret() { return !!_pipe; }
/** Identifiant du modèle actuellement chargé (ou null). */
export function modeleCharge() { return _modeleCharge; }

/**
 * Charge (une seule fois) la bibliothèque puis le modèle.
 * @param {string} modeleId
 * @param {(info:{etape:string, pct:number, fichier?:string})=>void} [onProgres]
 * @returns {Promise<any>} le pipeline de génération de texte
 */
export function chargerModele(modeleId = MODELE_DEFAUT, onProgres = () => {}) {
  if (_pipe && _modeleCharge === modeleId) return Promise.resolve(_pipe);
  if (_chargement) return _chargement;

  _chargement = (async () => {
    onProgres({ etape: "Téléchargement de la bibliothèque…", pct: 0 });
    // Import dynamique : rien n'est chargé tant que l'utilisateur n'active pas le mode.
    const { pipeline, env } = await import(/* @vite-ignore */ `${CDN}`);
    // Pas de modèles locaux : on lit uniquement le Hub Hugging Face.
    env.allowLocalModels = false;

    // WebGPU si le navigateur le supporte (bien plus rapide), sinon repli WASM.
    const device = ("gpu" in navigator) ? "webgpu" : "wasm";
    onProgres({ etape: `Téléchargement du modèle (${device})…`, pct: 0 });

    const pipe = await pipeline("text-generation", modeleId, {
      device,
      dtype: device === "webgpu" ? "q4f16" : "q8",
      progress_callback: (p) => {
        if (p && p.status === "progress" && p.total) {
          onProgres({ etape: "Téléchargement du modèle…", pct: Math.round((p.loaded / p.total) * 100), fichier: p.file });
        } else if (p && p.status === "ready") {
          onProgres({ etape: "Prêt", pct: 100 });
        }
      },
    });
    _pipe = pipe; _modeleCharge = modeleId; _chargement = null;
    onProgres({ etape: "Prêt", pct: 100 });
    return pipe;
  })().catch((err) => { _chargement = null; throw err; });

  return _chargement;
}

/**
 * Pose une question au modèle, avec le CONTEXTE réel de l'utilisateur injecté
 * dans le prompt système (programme, profil, besoins). Le modèle ne « connaît »
 * rien de lui-même : tout ce qui est factuel vient de l'app.
 *
 * @param {string} question
 * @param {string} contexte  résumé factuel généré par l'app (voir app.js)
 * @param {(txt:string)=>void} [onToken]  reçoit la réponse au fur et à mesure
 * @returns {Promise<string>}
 */
export async function demander(question, contexte, onToken = null) {
  if (!_pipe) throw new Error("Le coach IA n'est pas encore chargé.");

  const messages = [
    {
      role: "system",
      content:
        "Tu es un coach de musculation francophone, concis et prudent. "
        + "Réponds UNIQUEMENT en français, en 3 phrases maximum. "
        + "Appuie-toi sur les données de l'utilisateur ci-dessous ; n'invente jamais de chiffre. "
        + "Si tu ne sais pas, dis-le et renvoie vers les écrans de l'application. "
        + "Ne donne jamais de conseil médical.\n\n"
        + "DONNÉES DE L'UTILISATEUR :\n" + contexte,
    },
    { role: "user", content: question },
  ];

  // Diffusion mot à mot si l'appelant fournit onToken (réponse « qui s'écrit »).
  let streamer;
  if (onToken) {
    const { TextStreamer } = await import(/* @vite-ignore */ `${CDN}`);
    streamer = new TextStreamer(_pipe.tokenizer, {
      skip_prompt: true, skip_special_tokens: true,
      callback_function: (t) => onToken(t),
    });
  }

  const sortie = await _pipe(messages, {
    max_new_tokens: 160,
    temperature: 0.4,   // peu de fantaisie : on veut des réponses stables
    top_p: 0.9,
    do_sample: true,
    streamer,
  });

  // Transformers.js renvoie l'historique complet : on garde le dernier message.
  const dernier = sortie?.[0]?.generated_text;
  if (Array.isArray(dernier)) return String(dernier[dernier.length - 1]?.content || "").trim();
  return String(dernier || "").trim();
}

/** Libère le modèle de la mémoire (retour au mode déterministe seul). */
export async function decharger() {
  try { await _pipe?.dispose?.(); } catch (e) { /* pas bloquant */ }
  _pipe = null; _modeleCharge = null; _chargement = null;
}
