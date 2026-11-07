// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { getExercise, CATALOGUE } from "../src/data/exercises.js";
import {
  catalogueCompact, extraireProposition, lireReps, routineDepuisProposition, htmlLeger, demandeDePlan, BORNES,
} from "../src/engine/coachRoutine.js";

const ID_A = CATALOGUE[0].id;
const ID_B = CATALOGUE[1].id;
const GAINAGE = CATALOGUE.find((e) => e.typeExercice === "gainage");

test("catalogueCompact : une ligne par exercice réalisable, sans doublon, plafonnée", () => {
  const txt = catalogueCompact([...CATALOGUE, CATALOGUE[0]], { realisable: (e) => e.id !== ID_B, max: 20 });
  const lignes = txt.split("\n");
  assert.equal(lignes.length, 20);
  assert.ok(lignes[0].startsWith(`${ID_A} | `));
  assert.ok(!txt.includes(`${ID_B} |`), "non réalisable exclu");
  assert.equal(new Set(lignes).size, lignes.length);
});

test("extraireProposition : retire le bloc JSON du texte affiché", () => {
  const t = `Voici un plan simple.\n\n\`\`\`json\n{"type":"routine","nom":"Test","seances":[]}\n\`\`\`\n\nBonne séance !`;
  const r = extraireProposition(t);
  assert.equal(r.erreur, null);
  assert.equal(r.proposition.nom, "Test");
  assert.ok(!r.texte.includes("```"));
  assert.ok(r.texte.includes("Voici un plan simple.") && r.texte.includes("Bonne séance !"));
});

test("extraireProposition : texte sans bloc, bloc mal formé, bloc coupé", () => {
  assert.deepEqual(extraireProposition("Juste une réponse."), { texte: "Juste une réponse.", proposition: null, erreur: null });
  const mal = extraireProposition("Plan :\n```json\n{\"type\":\"routine\", nope}\n```");
  assert.equal(mal.proposition, null);
  assert.ok(mal.erreur && /mal formée/.test(mal.erreur));
  const coupe = extraireProposition("Plan :\n```json\n{\"type\":\"routine\",\"seances\":[{\"nom\":");
  assert.equal(coupe.texte, "Plan :");
  assert.ok(coupe.erreur && /coupée/.test(coupe.erreur));
  // Un bloc JSON qui n'est pas une routine est laissé tel quel (exemple de code).
  const autre = extraireProposition("Exemple :\n```json\n{\"a\":1}\n```");
  assert.equal(autre.proposition, null);
  assert.equal(autre.erreur, null);
});

test("lireReps : formats tolérés et bornes", () => {
  assert.deepEqual(lireReps("8-12"), [8, 12]);
  assert.deepEqual(lireReps("12–8"), [8, 12]);
  assert.deepEqual(lireReps(10), [10, 10]);
  assert.deepEqual(lireReps([6, 8]), [6, 8]);
  assert.deepEqual(lireReps("200"), [BORNES.repsMax, BORNES.repsMax]);
  assert.equal(lireReps("beaucoup"), null);
  assert.equal(lireReps(undefined), null);
});

test("routineDepuisProposition : construit une routine exécutable et écarte l'inventé", () => {
  const prop = {
    type: "routine", nom: "Haut / bas",
    seances: [
      { nom: "Haut", exercices: [
        { id: ID_A, series: 4, reps: "6-8", repos: 150 },
        { id: "exercice-invente", series: 3, reps: "10" },
        { id: ID_A, series: 3, reps: "10" },            // doublon
        { id: ID_B, series: 99, reps: "x", repos: 5 },  // hors bornes
      ] },
      { nom: "Vide", exercices: [{ id: "nexiste-pas" }] },
    ],
  };
  const r = routineDepuisProposition(prop, getExercise, "2026-11-07T10:00:00.000Z");
  assert.equal(r.raison, null);
  assert.deepEqual(r.ignores, ["exercice-invente", "nexiste-pas"]);
  assert.ok(r.corrections >= 3);
  const rt = r.routine;
  assert.equal(rt.nom, "Haut / bas");
  assert.equal(rt.perso, true);
  assert.equal(rt.source, "coach-ia");
  assert.equal(rt.seances.length, 1, "la séance sans exercice valide est retirée");
  const [a, b] = rt.seances[0].exercices;
  assert.equal(a.exerciceId, ID_A);
  assert.equal(a.series.length, 4);
  assert.deepEqual(a.series[0].repsCible, [6, 8]);
  assert.equal(a.series[0].reposSec, 150);
  assert.equal(b.series.length, BORNES.seriesMax);
  assert.equal(b.series[0].reposSec, BORNES.reposMin);
  assert.deepEqual(b.series[0].repsCible, [8, 12], "reps illisibles → fourchette par défaut");
  assert.ok(rt.seances[0].dureeEstimeeMin > 0);
});

test("routineDepuisProposition : gainage en secondes, refus des propositions vides", () => {
  if (GAINAGE) {
    const r = routineDepuisProposition({ type: "routine", seances: [{ nom: "Core", exercices: [{ id: GAINAGE.id, series: 3, secondes: 45 }] }] }, getExercise);
    assert.equal(r.routine.seances[0].exercices[0].series[0].dureeSec, 45);
    assert.equal(r.routine.seances[0].exercices[0].series[0].repsCible, null);
  }
  assert.ok(routineDepuisProposition({ type: "routine", seances: [{ exercices: [{ id: "zz" }] }] }, getExercise).raison);
  assert.ok(routineDepuisProposition(null, getExercise).raison);
  assert.ok(routineDepuisProposition({ type: "autre" }, getExercise).raison);
});

test("htmlLeger : échappe tout le HTML du modèle et ne garde que gras, listes, paragraphes", () => {
  const h = htmlLeger("**Bravo** <script>alert(1)</script>\n\n- un\n- deux\n\n1. a\n2. b");
  assert.ok(h.includes("<b>Bravo</b>"));
  assert.ok(h.includes("&lt;script&gt;"));
  assert.ok(!h.includes("<script>"));
  assert.ok(h.includes("<ul><li>un</li><li>deux</li></ul>"));
  assert.ok(h.includes("<ol><li>a</li><li>b</li></ol>"));
  assert.ok(!htmlLeger('<img src=x onerror="x">').includes("<img"));
  assert.equal(htmlLeger(""), "");
});

test("demandeDePlan : reconnaît les demandes de programme, pas les questions simples", () => {
  assert.ok(demandeDePlan("Crée-moi une routine haut/bas sur 4 jours"));
  assert.ok(demandeDePlan("Peux-tu modifier ma séance de jambes ?"));
  assert.ok(demandeDePlan("Un programme full body avec haltères"));
  assert.ok(!demandeDePlan("Combien d'eau boire par jour ?"));
  assert.ok(!demandeDePlan("Bonjour"));
});
