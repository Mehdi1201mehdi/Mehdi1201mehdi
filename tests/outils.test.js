// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fcMaxTheorique, fcCibleKarvonen, fcCibleSimple, tableZonesCardio,
  macrosMorphotype, tableMorphotypes, dureeSeance,
  pourcentagePourReps, maxDepuisSerie, grilleMax,
  composition, adipositeNavy, categorieAdiposite,
  TESTS_VELO, testVeloParCle, comparerTestsVelo,
} from "../src/engine/outils.js";

test("fréquence cardiaque : Karvonen tient compte de la FC de repos", () => {
  assert.equal(fcMaxTheorique(30), 190);
  // (190 - 60) * 0.7 + 60 = 151
  assert.equal(fcCibleKarvonen(190, 60, 70), 151);
  // sans FC de repos : 190 * 0.7 = 133
  assert.equal(fcCibleSimple(190, 70), 133);
  // Karvonen part de la FC de repos : un cœur plus lent au repos donne une
  // cible plus basse à intensité égale (148 contre 154 ici).
  assert.equal(fcCibleKarvonen(190, 50, 70), 148);
  assert.equal(fcCibleKarvonen(190, 70, 70), 154);
  // à 100 %, on retombe toujours sur la FC max quelle que soit la FC de repos
  assert.equal(fcCibleKarvonen(190, 50, 100), 190);
  assert.equal(fcCibleKarvonen(190, 70, 100), 190);
});

test("zones cardio : 5 zones croissantes et cohérentes", () => {
  const z = tableZonesCardio(190, 60);
  assert.equal(z.length, 5);
  assert.ok(z[0].bpmMin < z[4].bpmMin, "les zones doivent monter");
  for (const x of z) assert.ok(x.bpmMin <= x.bpmMax, `${x.cle} : bornes inversées`);
  assert.equal(z[4].bpmMax, 190); // 100 % = FC max
});

test("macrosMorphotype : l'endomorphe reçoit moins de glucides", () => {
  const ecto = macrosMorphotype(80, "ectomorphe", "prise_masse");
  const endo = macrosMorphotype(80, "endomorphe", "prise_masse");
  assert.ok(endo.gluc < ecto.gluc, "l'endomorphe doit avoir moins de glucides");
  assert.equal(ecto.prot, 160); // 80 × 2.0
  // kcal = prot*4 + gluc*4 + lip*9
  assert.equal(ecto.kcal, ecto.prot * 4 + ecto.gluc * 4 + ecto.lip * 9);
  // sèche = moins de calories que prise de masse
  assert.ok(macrosMorphotype(80, "mesomorphe", "seche").kcal < macrosMorphotype(80, "mesomorphe", "prise_masse").kcal);
  assert.equal(tableMorphotypes(80).length, 3);
});

test("dureeSeance : effort + repos, sans repos après la dernière série", () => {
  // 3 séries × 10 reps × 3 s = 90 s d'effort ; 2 repos × 60 s = 120 s
  const r = dureeSeance([{ series: 3, reps: 10, reposSec: 60 }]);
  assert.equal(r.effortSec, 90);
  assert.equal(r.reposSec, 120);
  assert.equal(r.totalSec, 210);
  assert.equal(r.series, 3);
  assert.equal(r.reps, 30);
  // une seule série → aucun repos
  assert.equal(dureeSeance([{ series: 1, reps: 10, reposSec: 90 }]).reposSec, 0);
  assert.equal(dureeSeance([]).totalSec, 0);
});

test("estimation du max : % décroissant avec les répétitions", () => {
  assert.equal(pourcentagePourReps(1), 100);
  assert.equal(pourcentagePourReps(10), 75);
  assert.ok(pourcentagePourReps(12) < pourcentagePourReps(5));
  // 80 kg à 10 reps → 80 / 0.75 ≈ 106.7
  const m = maxDepuisSerie(80, 10);
  assert.equal(m.pct, 75);
  assert.ok(Math.abs(m.max - 106.7) < 0.2);
  // 1 rep → le max est la charge elle-même
  assert.equal(maxDepuisSerie(100, 1).max, 100);
  assert.equal(grilleMax([20, 50], 10).length, 2);
});

test("composition corporelle : masse grasse + masse maigre = poids", () => {
  const c = composition(80, 15);
  assert.equal(c.masseGrasseKg, 12);
  assert.equal(c.masseMaigreKg, 68);
  assert.equal(Math.round(c.masseGrasseKg + c.masseMaigreKg), 80);
});

test("adipositeNavy : estimation par circonférences", () => {
  const h = adipositeNavy("H", { tailleCm: 178, tourTailleCm: 85, tourCouCm: 38 });
  assert.ok(h > 5 && h < 40, `valeur hors plage plausible : ${h}`);
  // un tour de taille plus grand → plus de gras
  assert.ok(adipositeNavy("H", { tailleCm: 178, tourTailleCm: 100, tourCouCm: 38 }) > h);
  // mesures insuffisantes → null (pas de valeur inventée)
  assert.equal(adipositeNavy("H", { tailleCm: 178, tourTailleCm: 0, tourCouCm: 38 }), null);
  assert.equal(adipositeNavy("F", { tailleCm: 165, tourTailleCm: 70, tourCouCm: 32 }), null); // hanches manquantes
  assert.ok(adipositeNavy("F", { tailleCm: 165, tourTailleCm: 70, tourCouCm: 32, tourHanchesCm: 95 }) > 10);
  assert.ok(categorieAdiposite(15, "H").txt);
});

test("test vélo : protocoles conformes et comparaison de relevés", () => {
  assert.equal(TESTS_VELO.length, 2);
  for (const t of TESTS_VELO) {
    const somme = t.paliers.reduce((a, p) => a + p.min, 0);
    assert.equal(somme, t.dureeMin, `${t.cle} : la somme des paliers doit faire ${t.dureeMin} min`);
    assert.ok(t.paliers.filter((p) => p.releve).length >= 4);
  }
  assert.equal(testVeloParCle("intermediaire").dureeMin, 15);
  assert.equal(testVeloParCle("inconnu").cle, "debutant"); // repli
  // pouls plus bas au 2e test = progrès
  const cmp = comparerTestsVelo([150, 160, 170], [145, 155, 165]);
  assert.equal(cmp.ameliore, true);
  assert.equal(cmp.delta, -5);
  assert.equal(comparerTestsVelo([], [150]), null);
});
