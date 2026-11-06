// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SYSTEM_PROMPT, FOURNISSEURS, normaliserConfig, configPrete,
  construireMessages, endpointPour, entetes, corpsRequete, fragmentDepuisEvenement,
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
