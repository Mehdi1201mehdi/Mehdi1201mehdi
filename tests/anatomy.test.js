// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { muscleDiagram, muscleHeatmap } from "../src/ui/anatomy.js";

test("muscleDiagram : muscle principal en rouge, secondaire en ambre", () => {
  const html = muscleDiagram(["pectoraux"], ["epaules"]);
  assert.match(html, /data-m="pectoraux" fill="#EF4444"/); // principal
  assert.match(html, /data-m="epaules" fill="#F59E0B"/);   // secondaire
  // SVG intégré (aucune image distante)
  assert.match(html, /<svg /);
  assert.doesNotMatch(html, /wger\.de|https?:\/\//);
});

test("muscleDiagram : muscle non ciblé reste neutre", () => {
  const html = muscleDiagram(["pectoraux"], []);
  assert.match(html, /data-m="biceps" fill="var\(--anat-muscle\)"/);
});

test("muscleHeatmap : opacité proportionnelle à l'intensité", () => {
  const html = muscleHeatmap({ pectoraux: 1, dorsaux: 0.5 });
  assert.match(html, /data-m="pectoraux" fill="#EF4444" fill-opacity="1.00"/);
  assert.match(html, /data-m="dorsaux" fill="#EF4444" fill-opacity="0.64"/);
  // un muscle non entraîné reste neutre
  assert.match(html, /data-m="biceps" fill="var\(--anat-muscle\)"/);
});

test("muscleHeatmap : corps entier rejaillit sur les grands groupes", () => {
  const html = muscleHeatmap({ corps_entier: 1 });
  assert.match(html, /data-m="pectoraux" fill="#EF4444"/);
  assert.match(html, /data-m="dorsaux" fill="#EF4444"/);
});

test("muscleHeatmap : accepte une Map", () => {
  const html = muscleHeatmap(new Map([["quadriceps", 1]]));
  assert.match(html, /data-m="quadriceps" fill="#EF4444"/);
});
