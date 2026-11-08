// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { muscleDiagram, muscleHeatmap, miniSilhouette, vueIdeale, cadreSilhouette, BOITES } from "../src/ui/anatomy.js";
import { ANATOMY } from "../src/data/anatomy-paths.js";
import { MUSCLES } from "../src/models.js";

test("muscleDiagram : muscle principal en accent, secondaire en accent sourd", () => {
  const html = muscleDiagram(["pectoraux"], ["epaules"]);
  assert.match(html, /data-m="pectoraux" fill="var\(--anat-primary\)"/); // principal (lime de la charte)
  assert.match(html, /data-m="epaules" fill="var\(--anat-secondary\)"/);   // secondaire (vert sourd)
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
  assert.match(html, /data-m="pectoraux" fill="var\(--anat-primary\)" fill-opacity="1.00"/);
  assert.match(html, /data-m="dorsaux" fill="var\(--anat-primary\)" fill-opacity="0.64"/);
  // un muscle non entraîné reste neutre
  assert.match(html, /data-m="biceps" fill="var\(--anat-muscle\)"/);
});

test("muscleHeatmap : corps entier rejaillit sur les grands groupes", () => {
  const html = muscleHeatmap({ corps_entier: 1 });
  assert.match(html, /data-m="pectoraux" fill="var\(--anat-primary\)"/);
  assert.match(html, /data-m="dorsaux" fill="var\(--anat-primary\)"/);
});

test("muscleHeatmap : accepte une Map", () => {
  const html = muscleHeatmap(new Map([["quadriceps", 1]]));
  assert.match(html, /data-m="quadriceps" fill="var\(--anat-primary\)"/);
});

// ---- Vignettes de muscle : bon côté, zoom, aucun muscle sans dessin ----

test("vueIdeale : les muscles du dos sont montrés de dos", () => {
  for (const m of ["dorsaux", "trapezes", "lombaires", "fessiers", "ischios", "triceps", "mollets", "abducteurs"]) {
    assert.equal(vueIdeale([m]), "back", m);
  }
  for (const m of ["pectoraux", "abdominaux", "biceps", "quadriceps", "adducteurs", "epaules", "avant_bras"]) {
    assert.equal(vueIdeale([m]), "front", m);
  }
  // Séance mixte : la majorité l'emporte, l'égalité suit le premier muscle.
  assert.equal(vueIdeale(["pectoraux", "epaules", "triceps"]), "front");
  assert.equal(vueIdeale(["quadriceps", "fessiers", "ischios", "mollets"]), "back");
  assert.equal(vueIdeale(["dorsaux", "biceps"]), "back");
  assert.equal(vueIdeale(["biceps", "dorsaux"]), "front");
});

test("miniSilhouette : chaque muscle du modèle est surligné dans sa vignette", () => {
  for (const m of MUSCLES) {
    const svg = miniSilhouette([m], "auto", { zoom: true });
    assert.match(svg, /fill="var\(--anat-primary\)"/, `${m} n'est surligné nulle part`);
  }
});

test("miniSilhouette : une vue imposée reste respectée", () => {
  assert.match(miniSilhouette(["dorsaux"], "front"), /data-vue="front"/);
  assert.match(miniSilhouette(["dorsaux"]), /data-vue="back"/);
});

test("BOITES : une boîte par groupe dessiné, et rien de plus", () => {
  for (const vue of ["front", "back"]) {
    const groupes = Object.keys(ANATOMY[vue].groups).sort();
    const boites = Object.keys(BOITES[vue]).filter((k) => k !== "corps").sort();
    assert.deepEqual(boites, groupes, vue);
  }
});

test("cadreSilhouette : le zoom reste dans le corps et cadre bien le muscle", () => {
  for (const vue of /** @type {const} */ (["front", "back"])) {
    const [cx, cy, cw, ch] = BOITES[vue].corps;
    for (const [m, [mx, my, mw, mh]] of Object.entries(BOITES[vue])) {
      if (m === "corps") continue;
      const [x, y, w, hh] = cadreSilhouette(vue, new Set([m]), { zoom: true, ratio: 0.8 }).split(" ").map(Number);
      assert.ok(Math.abs(w / hh - 0.8) < 0.01, `${vue}/${m} : format`);
      // Le muscle est entièrement dans le cadre…
      assert.ok(x <= mx && y <= my && x + w >= mx + mw && y + hh >= my + mh, `${vue}/${m} : muscle coupé`);
      // … et le cadre ne dépasse pas le corps (marge comprise) quand il y tient.
      if (hh <= ch + 40) assert.ok(y >= cy - 21 && y + hh <= cy + ch + 21, `${vue}/${m} : vide au-dessus ou au-dessous`);
      if (w <= cw + 40) assert.ok(x >= cx - 21 && x + w <= cx + cw + 21, `${vue}/${m} : vide sur les côtés`);
      // Zoom réel : nettement plus serré que le corps entier.
      assert.ok(hh < ch * 0.75, `${vue}/${m} : pas de zoom`);
    }
  }
});

test("muscleDiagram : adducteurs et lombaires ont leur propre zone", () => {
  const html = muscleDiagram(["adducteurs"], ["lombaires"]);
  assert.match(html, /data-m="adducteurs" fill="var\(--anat-primary\)"/);
  assert.match(html, /data-m="lombaires" fill="var\(--anat-secondary\)"/);
  // Les dorsaux ne s'allument plus pour un exercice de lombaires.
  assert.match(html, /data-m="dorsaux" fill="var\(--anat-muscle\)"/);
});
