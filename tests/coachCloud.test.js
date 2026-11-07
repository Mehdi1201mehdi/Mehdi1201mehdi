// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SYSTEM_PROMPT, FOURNISSEURS, normaliserConfig, configPrete,
  construireMessages, endpointPour, entetes, corpsRequete, fragmentDepuisEvenement,
  nettoyerHistorique, urlRelaisValide, messageErreur, MAX_HISTORIQUE,
} from "../src/integrations/coachCloud.js";

test("normaliserConfig : défauts et fournisseur inconnu", () => {
  assert.equal(normaliserConfig().fournisseur, "openai");
  assert.equal(normaliserConfig({}).modele, FOURNISSEURS.openai.modeleDefaut);
  assert.equal(normaliserConfig({ fournisseur: "zzz" }).fournisseur, "openai");
  assert.equal(normaliserConfig({ fournisseur: "gemini" }).modele, FOURNISSEURS.gemini.modeleDefaut);
  assert.equal(normaliserConfig({ cle: "  sk-abc " }).cle, "sk-abc");
});

test("configPrete : exige une clé non vide", () => {
  assert.equal(configPrete({ fournisseur: "openai", cle: "" }), false);
  assert.equal(configPrete({ fournisseur: "openai" }), false);
  assert.equal(configPrete({ fournisseur: "openai", cle: "sk-x" }), true);
  assert.equal(configPrete({ fournisseur: "gemini", cle: "AIza" }), true);
});

test("construireMessages : consigne système + contexte + question", () => {
  const m = construireMessages("Je fais quoi aujourd'hui ?", "Objectif : force.");
  assert.equal(m.length, 2);
  assert.equal(m[0].role, "system");
  assert.ok(m[0].content.includes(SYSTEM_PROMPT));
  assert.ok(m[0].content.includes("Objectif : force."));
  assert.equal(m[1].role, "user");
  assert.equal(m[1].content, "Je fais quoi aujourd'hui ?");
});

test("construireMessages : contexte absent → mention explicite, pas de crash", () => {
  const m = construireMessages("salut", "");
  assert.ok(m[0].content.includes("(aucune donnée)"));
});

test("endpointPour : OpenAI fixe, Gemini porte le modèle et la clé en URL", () => {
  assert.equal(endpointPour({ fournisseur: "openai", cle: "sk" }), "https://api.openai.com/v1/chat/completions");
  const g = endpointPour({ fournisseur: "gemini", cle: "AIza secret/x", modele: "gemini-2.0-flash" });
  assert.ok(g.startsWith("https://generativelanguage.googleapis.com/"));
  assert.ok(g.includes("gemini-2.0-flash"));
  assert.ok(g.includes("alt=sse"));
  // La clé est encodée (le / et l'espace ne doivent pas casser l'URL).
  assert.ok(g.includes("AIza%20secret%2Fx"));
});

test("entetes : la clé OpenAI va en Authorization, jamais Gemini", () => {
  assert.equal(entetes({ fournisseur: "openai", cle: "sk-42" }).Authorization, "Bearer sk-42");
  assert.equal(entetes({ fournisseur: "gemini", cle: "AIza" }).Authorization, undefined);
});

test("corpsRequete : OpenAI en streaming avec messages à plat", () => {
  const b = corpsRequete({ fournisseur: "openai", modele: "gpt-4o-mini" }, construireMessages("q", "ctx"));
  assert.equal(b.stream, true);
  assert.equal(b.model, "gpt-4o-mini");
  assert.equal(b.messages[0].role, "system");
});

test("corpsRequete : Gemini isole la consigne système et renomme les rôles", () => {
  const msgs = [
    { role: "system", content: "consigne" },
    { role: "assistant", content: "réponse précédente" },
    { role: "user", content: "question" },
  ];
  const b = corpsRequete({ fournisseur: "gemini", modele: "gemini-2.0-flash" }, msgs);
  assert.equal(b.systemInstruction.parts[0].text, "consigne");
  assert.equal(b.contents.length, 2);              // le system est sorti des tours
  assert.equal(b.contents[0].role, "model");       // assistant → model
  assert.equal(b.contents[1].role, "user");
  assert.equal(b.contents[1].parts[0].text, "question");
});

test("fragmentDepuisEvenement : extrait le texte de chaque format", () => {
  assert.equal(fragmentDepuisEvenement("openai", { choices: [{ delta: { content: "allô" } }] }), "allô");
  assert.equal(fragmentDepuisEvenement("openai", { choices: [{ delta: {} }] }), "");
  assert.equal(fragmentDepuisEvenement("gemini", { candidates: [{ content: { parts: [{ text: "salut" }] } }] }), "salut");
  assert.equal(fragmentDepuisEvenement("gemini", {}), "");
  assert.equal(fragmentDepuisEvenement("openai", null), "");
});

test("Claude : endpoint, en-têtes d'appel navigateur, corps au format Messages", () => {
  const cfg = { fournisseur: "anthropic", cle: "sk-ant-1" };
  assert.equal(normaliserConfig(cfg).modele, FOURNISSEURS.anthropic.modeleDefaut);
  assert.equal(endpointPour(cfg), "https://api.anthropic.com/v1/messages");
  const e = entetes(cfg);
  assert.equal(e["x-api-key"], "sk-ant-1");
  assert.equal(e["anthropic-version"], "2023-06-01");
  assert.equal(e["anthropic-dangerous-direct-browser-access"], "true");
  assert.equal(e.Authorization, undefined, "jamais la clé Claude en Authorization");
  const b = corpsRequete(cfg, construireMessages("q", "ctx", [{ role: "user", content: "a" }, { role: "assistant", content: "b" }]));
  assert.equal(b.model, FOURNISSEURS.anthropic.modeleDefaut);
  assert.equal(b.stream, true);
  assert.ok(b.system.includes("ctx"), "la consigne système est un champ à part");
  assert.deepEqual(b.messages.map((m) => m.role), ["user", "assistant", "user"]);
});

test("Relais : HTTPS obligatoire, jeton en Authorization, aucun modèle ni clé envoyés", () => {
  assert.equal(urlRelaisValide("https://coach.exemple.workers.dev"), true);
  assert.equal(urlRelaisValide("http://localhost:8787"), true);
  assert.equal(urlRelaisValide("http://exemple.com"), false, "pas de HTTP en clair hors local");
  assert.equal(urlRelaisValide("pas une url"), false);
  assert.equal(configPrete({ fournisseur: "relais", url: "" }), false);
  assert.equal(configPrete({ fournisseur: "relais", url: "https://r.exemple.dev" }), true, "pas de clé côté client");
  const cfg = { fournisseur: "relais", url: "https://r.exemple.dev", jeton: "tok", cle: "ne-doit-pas-partir" };
  assert.equal(endpointPour(cfg), "https://r.exemple.dev");
  const e = entetes(cfg);
  assert.equal(e.Authorization, "Bearer tok");
  assert.equal(e["x-api-key"], undefined);
  const b = corpsRequete(cfg, construireMessages("q", "ctx"));
  assert.equal(b.model, undefined, "le serveur choisit le modèle");
  assert.ok(!JSON.stringify(b).includes("ne-doit-pas-partir"));
});

test("fragmentDepuisEvenement : flux Claude (content_block_delta / text_delta)", () => {
  assert.equal(fragmentDepuisEvenement("anthropic", { type: "content_block_delta", delta: { type: "text_delta", text: "Salut" } }), "Salut");
  assert.equal(fragmentDepuisEvenement("relais", { type: "content_block_delta", delta: { type: "text_delta", text: "!" } }), "!");
  assert.equal(fragmentDepuisEvenement("anthropic", { type: "message_start" }), "");
  assert.equal(fragmentDepuisEvenement("anthropic", { type: "content_block_delta", delta: { type: "input_json_delta" } }), "");
});

test("nettoyerHistorique : alternance, plafond, commence par l'utilisateur et finit par l'assistant", () => {
  const h = nettoyerHistorique([
    { role: "assistant", content: "accueil" },
    { role: "user", content: "q1" }, { role: "user", content: "q1 bis" },
    { role: "assistant", content: "r1" }, { role: "system", content: "x" },
    { role: "user", content: "  " }, { role: "user", content: "q2 sans réponse" },
  ]);
  assert.deepEqual(h, [{ role: "user", content: "q1\n\nq1 bis" }, { role: "assistant", content: "r1" }]);
  const long = Array.from({ length: 40 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: `m${i}` }));
  const n = nettoyerHistorique(long);
  assert.ok(n.length <= MAX_HISTORIQUE);
  assert.equal(n[0].role, "user");
  assert.equal(n[n.length - 1].role, "assistant");
  assert.deepEqual(nettoyerHistorique(null), []);
});

test("messageErreur : messages lisibles selon le statut et le mode", () => {
  assert.match(messageErreur(401, "anthropic"), /clé/);
  assert.match(messageErreur(401, "relais"), /jeton/);
  assert.match(messageErreur(404, "anthropic"), /modèle/);
  assert.match(messageErreur(429, "openai"), /quota/);
  assert.match(messageErreur(529, "anthropic"), /surchargé/);
});
