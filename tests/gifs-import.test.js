// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { normName, indexerDataset, resoudreGif, construireMapping, jetons, scoreJetons } from "../src/integrations/gifs-import.mjs";

const RAW = "https://raw.githubusercontent.com/owner/repo/main/";

test("normName : minuscules, sans accents, alphanumérique", () => {
  assert.equal(normName("Développé Couché (barre)"), "developpe couche barre");
  assert.equal(normName("Push-Up!"), "push up");
});

test("resoudreGif : fichier local par id prioritaire, sinon gifUrl absolue", () => {
  const gifIndex = new Map([["0025", "gifs/0025.gif"]]);
  assert.equal(resoudreGif({ id: "0025" }, gifIndex, RAW), RAW + "gifs/0025.gif");
  assert.equal(resoudreGif({ id: "9999", gifUrl: "https://cdn/x.gif" }, gifIndex, RAW), "https://cdn/x.gif");
  assert.equal(resoudreGif({ id: "9999", gifUrl: "images/y.gif" }, gifIndex, RAW), RAW + "images/y.gif");
  assert.equal(resoudreGif({ id: "9999" }, gifIndex, RAW), null);
});

test("construireMapping : associe nos exercices au dataset par nom/terme", () => {
  const catalogue = [
    { id: "pompes", nom: "Pompes", musclesPrincipaux: [], musclesSecondaires: [] },
    { id: "developpe-couche-barre", nom: "Développé couché (barre)", musclesPrincipaux: [], musclesSecondaires: [] },
  ];
  const dataset = [
    { name: "push up", id: "0001" },
    { name: "barbell bench press", id: "0025" },
  ];
  const gifIndex = new Map([["0001", "g/0001.gif"], ["0025", "g/0025.gif"]]);
  const termeFn = (id) => ({ "pompes": "push up", "developpe-couche-barre": "barbell bench press" }[id] || id);
  const map = construireMapping(catalogue, indexerDataset(dataset), gifIndex, RAW, termeFn);
  assert.equal(map["pompes"], RAW + "g/0001.gif");
  assert.equal(map["developpe-couche-barre"], RAW + "g/0025.gif");
});

test("jetons : retire les mots vides et les jetons trop courts", () => {
  assert.deepEqual(jetons("Barbell Bench Press with One Arm"), ["barbell", "bench", "press"]);
});

test("scoreJetons : recouvrement de Jaccard", () => {
  assert.equal(scoreJetons(["a", "b"], ["a", "b"]), 1);
  assert.equal(scoreJetons(["a", "b"], ["a", "c"]), 1 / 3);
  assert.equal(scoreJetons([], ["a"]), 0);
});

test("construireMapping : niveau 3 par recouvrement de jetons", () => {
  const catalogue = [
    { id: "incline-db-press", nom: "Incline Dumbbell Bench Press", musclesPrincipaux: [], musclesSecondaires: [] },
    { id: "aucun-match", nom: "Xyzzy Foobar Machine", musclesPrincipaux: [], musclesSecondaires: [] },
  ];
  const dataset = [
    { name: "dumbbell incline bench press", id: "0300" },
    { name: "seated cable row", id: "0400" },
  ];
  const gifIndex = new Map([["0300", "g/0300.gif"], ["0400", "g/0400.gif"]]);
  const termeFn = (id) => id;
  const map = construireMapping(catalogue, indexerDataset(dataset), gifIndex, RAW, termeFn);
  // "Incline Dumbbell Bench Press" ↔ "dumbbell incline bench press" : fort recouvrement
  assert.equal(map["incline-db-press"], RAW + "g/0300.gif");
  // "Xyzzy Foobar Machine" : aucun recouvrement significatif → non mappé
  assert.equal(map["aucun-match"], undefined);
});
