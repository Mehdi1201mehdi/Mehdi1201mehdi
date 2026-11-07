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

import { idsReferencesInconnus } from "../src/data/exercises.js";
test("idsReferencesInconnus : repère les exercices de l'extension cités par les données", async () => {
  const data = {
    programme: { seances: [{ exercices: [{ exerciceId: "developpe-couche-barre" }] }] },
    programmesPerso: [{ seances: [{ exercices: [{ exerciceId: "wger-a48295d8-run" }] }] }],
    logs: [{ exercices: [{ exerciceId: "wger-89c3d614-zone-2-running" }] }],
    sessionEnCours: { data: { "wger-95a300de-elliptical": {} } },
    recentsExo: ["developpe-couche-barre"],
  };
  const avant = idsReferencesInconnus(data);
  const { catalogueEtenduCharge, chargerCatalogueEtendu } = await import("../src/data/exercises.js");
  if (!catalogueEtenduCharge()) {
    assert.deepEqual(avant.sort(), ["wger-89c3d614-zone-2-running", "wger-95a300de-elliptical", "wger-a48295d8-run"]);
  }
  await chargerCatalogueEtendu();
  assert.deepEqual(idsReferencesInconnus(data), [], "une fois l'extension chargée, plus rien d'inconnu");
  assert.deepEqual(idsReferencesInconnus(null), []);
});
