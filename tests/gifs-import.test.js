// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { normName, indexerDataset, resoudreGif, construireMapping } from "../src/integrations/gifs-import.mjs";

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
