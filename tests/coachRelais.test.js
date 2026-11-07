// @ts-check
// Tests du relais Cloudflare (server/coach-relais/worker.js), exécuté sous Node :
// Request/Response/fetch y sont natifs. L'API Claude est simulée.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import relais, { validerCorps } from "../server/coach-relais/worker.js";
import { construireMessages, corpsRequete, entetes } from "../src/integrations/coachCloud.js";

const ENV = { ANTHROPIC_API_KEY: "sk-ant-SERVEUR", JETON_ACCES: "jeton-42", ORIGINES: "https://mehdi1201mehdi.github.io,https://localhost", MODELE: "claude-haiku-5-5" };
const ORIGINE = "https://mehdi1201mehdi.github.io";
const fetchOriginal = globalThis.fetch;
afterEach(() => { globalThis.fetch = fetchOriginal; });

/**
 * Requête telle que l'application l'envoie réellement (mêmes fonctions).
 * @param {{origine?:string, jeton?:string, corps?:string}} [o]
 */
function requeteApp({ origine = ORIGINE, jeton = "jeton-42", corps } = {}) {
  const cfg = { fournisseur: "relais", url: "https://relais.test", jeton };
  const body = corps ?? JSON.stringify(corpsRequete(cfg, construireMessages("Crée-moi une routine", "Objectif : force.")));
  return new Request("https://relais.test", { method: "POST", headers: { ...entetes(cfg), Origin: origine }, body });
}

/** Simule l'API Claude et capture l'appel. */
function simulerClaude(status = 200) {
  const appels = [];
  globalThis.fetch = async (url, init) => {
    appels.push({ url, init });
    return new Response("event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"ok\"}}\n\n",
      { status, headers: { "Content-Type": "text/event-stream" } });
  };
  return appels;
}

test("relais : transmet à Claude avec la clé du SERVEUR et le modèle du serveur, réponse en flux + CORS", async () => {
  const appels = simulerClaude();
  const rep = await relais.fetch(requeteApp(), ENV);
  assert.equal(rep.status, 200);
  assert.equal(rep.headers.get("Access-Control-Allow-Origin"), ORIGINE);
  assert.match(await rep.text(), /text_delta/);
  assert.equal(appels.length, 1);
  assert.equal(appels[0].url, "https://api.anthropic.com/v1/messages");
  assert.equal(appels[0].init.headers["x-api-key"], "sk-ant-SERVEUR");
  const envoye = JSON.parse(appels[0].init.body);
  assert.equal(envoye.model, "claude-haiku-5-5");
  assert.equal(envoye.stream, true);
  assert.ok(envoye.system.includes("Objectif : force."));
});

test("relais : refuse une origine inconnue, un jeton faux ou absent", async () => {
  const appels = simulerClaude();
  assert.equal((await relais.fetch(requeteApp({ origine: "https://pirate.example" }), ENV)).status, 403);
  assert.equal((await relais.fetch(requeteApp({ jeton: "faux" }), ENV)).status, 401);
  assert.equal((await relais.fetch(requeteApp({ jeton: "" }), ENV)).status, 401);
  assert.equal(appels.length, 0, "Claude n'est jamais appelé dans ces cas");
});

test("relais : pré-vol CORS, méthode, configuration manquante, JSON illisible", async () => {
  simulerClaude();
  const pre = await relais.fetch(new Request("https://relais.test", { method: "OPTIONS", headers: { Origin: ORIGINE } }), ENV);
  assert.equal(pre.status, 204);
  assert.match(pre.headers.get("Access-Control-Allow-Headers") || "", /Authorization/);
  assert.equal((await relais.fetch(new Request("https://relais.test", { method: "OPTIONS", headers: { Origin: "https://x.y" } }), ENV)).status, 403);
  assert.equal((await relais.fetch(new Request("https://relais.test", { method: "GET", headers: { Origin: ORIGINE } }), ENV)).status, 405);
  assert.equal((await relais.fetch(requeteApp(), { ...ENV, ANTHROPIC_API_KEY: "" })).status, 500);
  assert.equal((await relais.fetch(requeteApp({ corps: "{pas du json" }), ENV)).status, 400);
});

test("relais : relaie les erreurs de Claude avec leur statut, sans fuite de la clé", async () => {
  simulerClaude(429);
  const rep = await relais.fetch(requeteApp(), ENV);
  assert.equal(rep.status, 429);
  const txt = await rep.text();
  assert.ok(!txt.includes("sk-ant-SERVEUR"));
});

test("validerCorps : bornes et forme de la conversation", () => {
  assert.equal(validerCorps({ messages: [{ role: "user", content: "a" }] }, 1600).ok, true);
  assert.equal(validerCorps({ messages: [] }, 1600).ok, false);
  assert.equal(validerCorps({ messages: [{ role: "system", content: "a" }] }, 1600).ok, false);
  assert.equal(validerCorps({ messages: [{ role: "assistant", content: "a" }] }, 1600).ok, false, "doit commencer par l'utilisateur");
  assert.equal(validerCorps({ messages: [{ role: "user", content: "x".repeat(9000) }] }, 1600).ok, false);
  const v = validerCorps({ messages: [{ role: "user", content: "a" }], max_tokens: 99999, temperature: 7, model: "claude-opus-cher" }, 1600);
  assert.equal(v.corps.max_tokens, 1600, "plafonné par le serveur");
  assert.equal(v.corps.temperature, 1);
  assert.equal(/** @type {any} */ (v.corps).model, undefined, "le client ne choisit pas le modèle");
});
