// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { getExercise, chargerCatalogueEtendu, CATALOGUE } from "../src/data/exercises.js";
import {
  activiteCardio, metCardio, wattsRameur, caloriesLog, MET_COURSE, MET_MARCHE, MET_PAR_DEFAUT,
} from "../src/engine/calories.js";
import { caloriesSeance, MET_MUSCULATION } from "../src/engine/activite.js";

test("MET course et marche : valeurs du Compendium 2024, en escalier selon la vitesse", () => {
  // 10 km/h = 6,21 mph → ligne 12050 « Running, 6–6.3 mph », 9,3 MET
  assert.deepEqual(metCardio("course", 5000, 1800), { met: 9.3, code: "12050", base: "10.0 km/h" });
  // 12 km/h = 7,46 mph → 12070 (7 mph), 11,0 MET — pas d'interpolation
  assert.equal(metCardio("course", 6000, 1800).code, "12070");
  // 5 km/h « en course » = 3,1 mph → table de marche, 17190 (2,8–3,4 mph) 3,8 MET
  assert.deepEqual(metCardio("course", 2500, 1800).code, "17190");
  // 4 km/h = 2,49 mph : sous le seuil de 2,5 mph → 17152 (2,0–2,4 mph), 2,8 MET
  assert.deepEqual(metCardio("marche", 2000, 1800), { met: 2.8, code: "17152", base: "4.0 km/h" });
  assert.equal(metCardio("course", null, 1800).met, 7.5, "durée seule : jogging général 12020");
  assert.equal(MET_COURSE.length, 17);
  assert.equal(MET_MARCHE[0][1], 2.8);
});

test("marche : 6 km/h = 3,73 mph → 17200 (3,5–3,9 mph), 4,8 MET", () => {
  assert.deepEqual(metCardio("marche", 3000, 1800), { met: 4.8, code: "17200", base: "6.0 km/h" });
});

test("rameur : puissance Concept2 (2,80 / allure³) puis palier du Compendium", () => {
  assert.equal(wattsRameur(500, 120), 203);              // 2:00 /500 m ≈ 203 W
  assert.equal(metCardio("rameur", 500, 120).code, "02074");
  assert.equal(metCardio("rameur", 5000, 1350).met, 7.5); // 2:15 /500 m ≈ 142 W → 02072
  assert.equal(metCardio("rameur", null, 600).met, 7.3, "sans distance : 02070 général");
});

test("natation : vitesse en yards/min ; elliptique et vélo : valeurs par défaut", () => {
  assert.equal(metCardio("natation", 1000, 1200).code, "18290");   // 50 m/min = 54,7 yd/min
  assert.equal(metCardio("elliptique", null, 1200).met, MET_PAR_DEFAUT.elliptique[0]);
  assert.equal(metCardio("velo", null, 1200).met, 6.8);
});

test("activiteCardio : seulement les exercices de type cardio", async () => {
  await chargerCatalogueEtendu();
  assert.equal(activiteCardio(getExercise("rameur")), "rameur");
  assert.equal(activiteCardio(CATALOGUE.find((e) => e.id.endsWith("-run"))), "course");
  assert.equal(activiteCardio(CATALOGUE.find((e) => /elliptical/.test(e.id))), "elliptique");
  assert.equal(activiteCardio(getExercise("rowing-machine-assis")), null, "le rowing de musculation n'est pas un rameur");
  assert.equal(activiteCardio(getExercise("burpees")), null);
});

const resol = (id) => ({
  run: { id: "run", nom: "Course à pied", typeExercice: "cardio" },
  dc: { id: "dc", nom: "Développé couché", typeExercice: "force" },
  planche: { id: "planche", nom: "Planche", typeExercice: "gainage" },
}[id]);

test("caloriesLog : séance de musculation pure = ancien calcul (MET 5 × poids × durée)", () => {
  const log = { dureeSec: 3600, exercices: [{ exerciceId: "dc", series: [{ chargeKg: 80, reps: 8 }] }] };
  assert.equal(caloriesLog(log, 80, resol).total, caloriesSeance(3600, 80));
  assert.equal(caloriesLog(log, 80, resol).total, MET_MUSCULATION * 80);
});

test("caloriesLog : séance mixte — cardio au MET de sa vitesse, maintien, reste en musculation", () => {
  const log = { dureeSec: 3600, exercices: [
    { exerciceId: "run", series: [{ distanceM: 5000, dureeSec: 1800 }] },      // 10 km/h → 9,3 MET, 30 min
    { exerciceId: "planche", series: [{ dureeSec: 60 }, { dureeSec: 60 }] },   // 2 min à 2,8 MET
    { exerciceId: "dc", series: [{ chargeKg: 80, reps: 8 }] },
  ] };
  const r = caloriesLog(log, 80, resol);
  const run = r.exercices.find((x) => x.exerciceId === "run");
  assert.equal(run.kcal, Math.round(9.3 * 80 * 0.5));                         // 372
  assert.equal(r.exercices.find((x) => x.exerciceId === "planche").kcal, Math.round(2.8 * 80 * 120 / 3600));
  assert.equal(r.musculation.dureeSec, 3600 - 1800 - 120);
  assert.equal(r.total, Math.round(9.3 * 80 * 0.5 + 2.8 * 80 * 120 / 3600 + 5 * 80 * (1680 / 3600)));
});

test("caloriesLog : cardio seul — pas de temps « musculation » ajouté ; poids inconnu → 0", () => {
  const log = { dureeSec: 2400, exercices: [{ exerciceId: "run", series: [{ distanceM: 5000, dureeSec: 1800 }] }] };
  assert.equal(caloriesLog(log, 80, resol).musculation.kcal, 0);
  assert.equal(caloriesLog(log, 80, resol).total, 372);
  assert.equal(caloriesLog(log, 0, resol).total, 0);
});
