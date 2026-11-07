// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { LB_PAR_KG, estImperial, uniteCharge, versAffichage, depuisSaisie, texteCharge, texteVolume } from "../src/engine/unites.js";
import { restaurer, nouvelleSession } from "../src/engine/liveSession.js";

test("kg : rien ne change pour l'existant (valeurs rendues telles quelles)", () => {
  assert.equal(versAffichage(62.5, false), 62.5);
  assert.equal(versAffichage(0, false), 0);
  assert.equal(depuisSaisie("62,5", false), 62.5);
  assert.equal(texteCharge(62.5, false), "62.5 kg");
  assert.equal(texteVolume(5985, false), `${(5985).toLocaleString("fr-FR")} kg`);
  assert.equal(texteVolume(16620, false, { tonnes: true }), "16,6 t");
});

test("lb : conversion, arrondi à 0,5 lb, aller-retour sans dérive", () => {
  assert.equal(versAffichage(62.5, true), 138);           // 137,79 → 138
  assert.equal(versAffichage(20, true), 44);              // 44,09 → 44
  assert.equal(versAffichage(1, true), 2);                // 2,2 → 2
  const kg = depuisSaisie("135", true);
  assert.ok(Math.abs(kg - 135 / LB_PAR_KG) < 0.001);
  assert.equal(versAffichage(kg, true), 135, "135 lb saisis → 135 lb réaffichés");
  for (const lb of [45, 95, 135, 185, 225, 315, 12.5]) assert.equal(versAffichage(depuisSaisie(lb, true), true), lb);
  assert.equal(texteCharge(62.5, true), "138 lb");
  assert.equal(texteVolume(5985, true), `${(13195).toLocaleString("fr-FR")} lb`);
  assert.equal(texteVolume(16620, true, { tonnes: true }), "36,6 k lb");
});

test("valeurs absentes ou illisibles → null, jamais NaN", () => {
  for (const v of [null, undefined, "", "abc"]) {
    assert.equal(versAffichage(v, true), null);
    assert.equal(depuisSaisie(v, true), null);
  }
  assert.equal(texteCharge(null, true), "—");
});

test("réglages et libellés", () => {
  assert.equal(estImperial({ unites: "imperial" }), true);
  assert.equal(estImperial({ unites: "metrique" }), false);
  assert.equal(estImperial(null), false);
  assert.equal(uniteCharge(true), "lb");
  assert.equal(uniteCharge(false), "kg");
});

test("séance : l'unité de saisie survit à la reprise après fermeture", () => {
  const live = nouvelleSession({ id: "s1", exercices: [{ exerciceId: "x", series: [{ type: "travail" }] }] });
  live.unite = "lb";
  live.data.x.series[0].charge = "135";
  const r = restaurer(JSON.parse(JSON.stringify(live)));
  assert.equal(r.unite, "lb");
  assert.equal(r.data.x.series[0].charge, "135");
  const ancien = restaurer({ seanceId: "s1", data: { x: { series: [{ charge: "60" }] } } });
  assert.equal(ancien.unite, "kg", "une séance d'avant cette version était en kg");
});
