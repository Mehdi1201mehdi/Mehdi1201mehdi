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

test("detecterIntention : bilan, programme, explication d'un exercice", () => {
  assert.equal(detecterIntention("Analyse mes performances").intent, "bilan");
  assert.equal(detecterIntention("fais-moi un bilan de mes progrès").intent, "bilan");
  assert.equal(detecterIntention("Construis-moi un programme 3 jours avec haltères").intent, "programme");
  assert.equal(detecterIntention("aide-moi à organiser mes entraînements").intent, "programme");
  assert.equal(detecterIntention("Explique-moi le soulevé de terre").intent, "expliquer");
  assert.equal(detecterIntention("comment faire un squat").intent, "expliquer");
  // Les intentions existantes ne bougent pas.
  assert.equal(detecterIntention("Par quoi remplacer les tractions ?").intent, "remplacer");
  assert.equal(detecterIntention("quand augmenter la charge").intent, "progression");
  assert.equal(detecterIntention("mon record au développé couché").intent, "records");
});

test("detecterIntention : les nouvelles intentions ne volent pas les anciennes", () => {
  const i = (q) => detecterIntention(q).intent;
  assert.equal(i("comment faire pour progresser"), "progression");
  assert.equal(i("expliquer les macros"), "nutrition");
  assert.equal(i("explique-moi le temps de repos"), "repos");
  assert.equal(i("analyse ma nutrition"), "nutrition");
  assert.equal(i("bilan hydratation"), "eau");
  assert.equal(i("j'ai besoin d'aide pour ma séance d'entrainement"), "aide");
  assert.equal(i("fais-moi un bilan de mes progrès"), "bilan");
});

test("exerciceDeLaQuestion : les mots de liaison ne désignent pas un exercice", async () => {
  const { exerciceDeLaQuestion } = await import("../src/engine/assistant.js");
  const cat = [{ id: "a", nom: "Haussement d'épaules pour le milieu du dos" }, { id: "b", nom: "Squat au poids du corps" }, { id: "c", nom: "Soulevé de terre" }, { id: "d", nom: "Hip thrust" }];
  assert.equal(exerciceDeLaQuestion("comment faire pour perdre du poids", cat), null);
  assert.equal(exerciceDeLaQuestion("comment faire pour bien faire", cat), null);
  assert.equal(exerciceDeLaQuestion("explique-moi le soulevé de terre", cat).id, "c");
  assert.equal(exerciceDeLaQuestion("comment faire un hip thrust", cat).id, "d");
});

test("questions « pourquoi » : aucun exercice inventé, intentions dédiées", async () => {
  const { detecterIntention, exerciceDeLaQuestion } = await import("../src/engine/assistant.js");
  const { CATALOGUE } = await import("../src/data/exercises.js");
  for (const q of ["Pourquoi est-ce que je stagne ?", "Pourquoi dois-je faire autant de séries ?", "Comment améliorer ma technique ?", "Pourquoi augmenter cette charge ?"]) {
    assert.equal(exerciceDeLaQuestion(q, CATALOGUE), null, q);
  }
  assert.equal(/** @type {any} */ (exerciceDeLaQuestion("Pourquoi je stagne au squat ?", CATALOGUE))?.patron, "squat");
  assert.equal(detecterIntention("Dois-je augmenter ou diminuer mon volume d'entraînement ?").intent, "volume");
  assert.equal(detecterIntention("Quel muscle dois-je travailler davantage ?").intent, "muscle_retard");
  assert.equal(detecterIntention("Pourquoi cet exercice a-t-il été choisi ?").intent, "pourquoi_exercice");
  assert.equal(detecterIntention("Combien de repos entre les séries ?").intent, "repos");
});
