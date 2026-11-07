// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { chercherCatalogue, CATALOGUE } from "../src/data/exercises.js";

test("chercherCatalogue : filtre par niveau (1 à 4)", () => {
  const n1 = chercherCatalogue({ niveau: "1" });
  assert.ok(n1.length > 0);
  assert.ok(n1.every((e) => e.difficulte === 1));
  assert.equal(chercherCatalogue({ niveau: 2 }).length, CATALOGUE.filter((e) => e.difficulte === 2).length, "nombre ou chaîne : même résultat");
});

test("chercherCatalogue : filtre par type, et cumul avec muscle / recherche", () => {
  const g = chercherCatalogue({ type: "gainage" });
  assert.ok(g.length > 0 && g.every((e) => e.typeExercice === "gainage"));
  const cumul = chercherCatalogue({ type: "isolation", muscle: "biceps" });
  assert.ok(cumul.every((e) => e.typeExercice === "isolation" && (e.musclesPrincipaux.includes("biceps") || (e.musclesSecondaires || []).includes("biceps"))));
  assert.equal(chercherCatalogue({ type: "inexistant" }).length, 0);
  assert.equal(chercherCatalogue({ niveau: "", type: "" }).length, CATALOGUE.length, "filtres vides = tout le catalogue");
});
