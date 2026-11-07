// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { etatIntervalle, dureeTotaleIntervalle, normaliserIntervalle, PRESETS_INTERVALLES } from "../src/engine/intervalles.js";

test("EMOM 10 min : un tour par minute, sans repos séparé", () => {
  const c = PRESETS_INTERVALLES.find((p) => p.cle === "emom10");
  assert.equal(dureeTotaleIntervalle(c), 600);
  assert.deepEqual(etatIntervalle(c, 0, 0), { phase: "travail", tour: 1, tours: 10, restantSec: 60, ecouleSec: 0, totalSec: 600 });
  const e = etatIntervalle(c, 0, 125_000);
  assert.deepEqual([e.phase, e.tour, e.restantSec], ["travail", 3, 55]);
  assert.equal(etatIntervalle(c, 0, 600_000).phase, "fini");
});

test("Tabata : 20 s de travail, 10 s de repos, 8 tours, dernier repos non compté", () => {
  const c = PRESETS_INTERVALLES.find((p) => p.cle === "tabata");
  assert.equal(dureeTotaleIntervalle(c), 8 * 20 + 7 * 10);
  const r = etatIntervalle(c, 1000, 1000 + 25_000);
  assert.deepEqual([r.phase, r.tour, r.restantSec], ["repos", 1, 5]);
  const t2 = etatIntervalle(c, 0, 30_000);
  assert.deepEqual([t2.phase, t2.tour, t2.restantSec], ["travail", 2, 20]);
});

test("état déduit de l'heure : un onglet en veille ne fait pas dériver le minuteur", () => {
  const c = { tours: 3, travailSec: 40, reposSec: 20 };
  assert.equal(etatIntervalle(c, 0, 61_000).tour, 2);
  assert.equal(etatIntervalle(c, 0, -5000).ecouleSec, 0);
});

test("normalisation des saisies", () => {
  assert.deepEqual(normaliserIntervalle({ tours: "0", travailSec: "2", reposSec: "-4" }), { tours: 1, travailSec: 5, reposSec: 0 });
  assert.deepEqual(normaliserIntervalle({}), { tours: 10, travailSec: 60, reposSec: 0 });
});
