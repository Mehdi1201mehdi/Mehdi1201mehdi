// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { muscleDiagram, muscleHeatmap } from "../src/ui/anatomy.js";

test("muscleDiagram : calque principal (main) et secondaire", () => {
  const html = muscleDiagram(["pectoraux"], ["epaules"]);
  assert.match(html, /main\/muscle-4\.svg/);      // pectoraux principal
  assert.match(html, /secondary\/muscle-2\.svg/); // épaules secondaire
});

test("muscleHeatmap : opacité proportionnelle à l'intensité", () => {
  const html = muscleHeatmap({ pectoraux: 1, dorsaux: 0.5 });
  // pectoraux (id 4) à intensité 1 → opacité 1.00
  assert.match(html, /muscle-4\.svg" alt=""/);
  assert.match(html, /opacity:1\.00[^)]*muscle-4/);
  // dorsaux (id 12) à 0.5 → opacité 0.65
  assert.match(html, /opacity:0\.65[^)]*muscle-12/);
  // un muscle non entraîné n'apparaît pas
  assert.doesNotMatch(html, /muscle-1\.svg/); // biceps absent
});

test("muscleHeatmap : corps entier rejaillit sur les grands groupes", () => {
  const html = muscleHeatmap({ corps_entier: 1 });
  assert.match(html, /muscle-4\.svg/);  // pectoraux
  assert.match(html, /muscle-12\.svg/); // dorsaux
});

test("muscleHeatmap : accepte une Map", () => {
  const html = muscleHeatmap(new Map([["quadriceps", 1]]));
  assert.match(html, /muscle-10\.svg/); // quadriceps id 10
});
