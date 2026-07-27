// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { detecterIntention, detecterMuscle, trouverExoParNom } from "../src/engine/assistant.js";

test("detecterIntention : classe les questions courantes", () => {
  assert.equal(detecterIntention("Par quoi remplacer les tractions ?").intent, "remplacer");
  assert.equal(detecterIntention("une alternative au squat").intent, "remplacer");
  assert.equal(detecterIntention("Combien de protéines par jour ?").intent, "nutrition");
  assert.equal(detecterIntention("combien de calories je dois manger").intent, "nutrition");
  assert.equal(detecterIntention("combien d'eau boire").intent, "eau");
  assert.equal(detecterIntention("quelle séance aujourd'hui").intent, "seance_jour");
  assert.equal(detecterIntention("mon record au développé couché").intent, "records");
  assert.equal(detecterIntention("combien de repos entre les séries").intent, "repos");
  assert.equal(detecterIntention("comment augmenter la charge").intent, "progression");
  assert.equal(detecterIntention("des exercices pour les pectoraux").intent, "exos_muscle");
  assert.equal(detecterIntention("bonjour").intent, "aide");
  assert.equal(detecterIntention("qzdqzd blabla").intent, "inconnu");
});

test("detecterMuscle : mot entier, pas de faux positif", () => {
  assert.equal(detecterMuscle("travailler les abdos"), "abdominaux"); // ne doit PAS matcher « dos »
  assert.equal(detecterMuscle("exercices pour le dos"), "dorsaux");
  assert.equal(detecterMuscle("muscler mes pectoraux"), "pectoraux");
  assert.equal(detecterMuscle("étirer les ischio-jambiers"), "ischios");
  assert.equal(detecterMuscle("bonjour ça va"), null);
});

test("trouverExoParNom : meilleur recouvrement de mots", () => {
  const liste = [
    { id: "dc", nom: "Développé couché (haltères)", nomsAlternatifs: ["Bench press"] },
    { id: "sq", nom: "Squat à la barre", nomsAlternatifs: ["Back squat"] },
    { id: "tr", nom: "Traction pronation", nomsAlternatifs: ["Pull-up"] },
  ];
  assert.equal(trouverExoParNom("developpe couche", liste)?.id, "dc");
  assert.equal(trouverExoParNom("bench press", liste)?.id, "dc");
  assert.equal(trouverExoParNom("les tractions", liste)?.id, "tr");
  assert.equal(trouverExoParNom("xyz introuvable", liste), null);
});
