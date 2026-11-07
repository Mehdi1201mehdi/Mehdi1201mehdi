// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CHAMPS_MESURES, CHAMPS_SAISIE, GROUPES_MESURES, validerMesure, construireReleve, etatAu,
  joursDeMesure, comparerMesures, asymetries, jourLocal,
} from "../src/engine/corps.js";
import { longueurAffichage, longueurDepuisSaisie, uniteLongueur, CM_PAR_POUCE } from "../src/engine/unites.js";

test("16 mesures saisissables, gauche et droite comprises ; champs historiques lus mais non proposés", () => {
  assert.equal(CHAMPS_SAISIE.length, 16);
  for (const p of ["bras", "avantBras", "cuisse", "mollet"]) {
    assert.ok(CHAMPS_SAISIE.some((c) => c.cle === `${p}G`) && CHAMPS_SAISIE.some((c) => c.cle === `${p}D`), p);
  }
  assert.ok(CHAMPS_MESURES.some((c) => c.cle === "bras" && c.historique), "l'ancien « bras » reste lisible");
  assert.deepEqual(GROUPES_MESURES, ["Général", "Haut du corps", "Bras", "Jambes"]);
  assert.equal(new Set(CHAMPS_MESURES.map((c) => c.cle)).size, CHAMPS_MESURES.length, "clés uniques");
});

test("validation : bornes de plausibilité, refus d'une faute de frappe", () => {
  assert.deepEqual(validerMesure("brasD", 38.25), { ok: true, v: 38.25 });
  assert.equal(validerMesure("brasD", 3.8).ok, false);
  assert.equal(validerMesure("masseGrassePct", 85).ok, false);
  assert.equal(validerMesure("inconnu", 10).ok, false);
});

test("construireReleve : ne garde que les champs saisis ; refuse un relevé vide ou aberrant", () => {
  const r = construireReleve({ taille: 82, brasG: 36, brasD: null, poidsKg: "" }, "2026-11-07T08:00:00.000Z", "m1");
  assert.equal(r.ok, true);
  assert.deepEqual(r.ok && r.releve, { id: "m1", date: "2026-11-07T08:00:00.000Z", taille: 82, brasG: 36 });
  assert.equal(construireReleve({}, "2026-11-07T08:00:00.000Z", "m2").ok, false);
  const ko = construireReleve({ taille: 8 }, "2026-11-07T08:00:00.000Z", "m3");
  assert.equal(ko.ok, false);
  assert.match(!ko.ok ? ko.erreurs[0] : "", /Tour de taille/);
});

const metrics = [
  { id: "1", date: "2026-09-01T07:00:00", poidsKg: 84, taille: 88, bras: 37 },            // ancien format
  { id: "2", date: "2026-10-01T07:00:00", taille: 86, brasG: 36.5, brasD: 38.5, cuisseG: 58, cuisseD: 58.5 },
  { id: "3", date: "2026-10-02T07:00:00", poidsKg: 82.6 },
  { id: "4", date: "2026-11-01T07:00:00", taille: 84.5, brasG: 37, brasD: 39 },
];

test("état à une date : dernière valeur connue de chaque mesure, même prise un autre jour", () => {
  const e = etatAu(metrics, "2026-10-15");
  assert.equal(e.taille.v, 86);
  assert.equal(e.poidsKg.v, 82.6, "le poids du 2 octobre complète le relevé du 1er");
  assert.equal(e.bras.v, 37, "l'ancien bras reste visible, sans côté inventé");
  assert.deepEqual(joursDeMesure(metrics), ["2026-11-01", "2026-10-02", "2026-10-01", "2026-09-01"]);
});

test("comparaison de deux dates : écarts seulement quand les deux valeurs existent", () => {
  const c = comparerMesures(metrics, "2026-09-01", "2026-11-01");
  const t = c.find((x) => x.cle === "taille");
  assert.deepEqual([t.a, t.b, t.delta], [88, 84.5, -3.5]);
  const bd = c.find((x) => x.cle === "brasD");
  assert.deepEqual([bd.a, bd.b, bd.delta], [null, 39, null]);
  const p = c.find((x) => x.cle === "poidsKg");
  assert.deepEqual([p.a, p.b, p.fraisA, p.fraisB, p.delta], [84, 82.6, true, false, null],
    "le poids du 2 octobre n'est pas une mesure du 1er novembre : pas d'écart affiché");
  const p2 = comparerMesures(metrics, "2026-09-01", "2026-10-02").find((x) => x.cle === "poidsKg");
  assert.equal(p2.delta, -1.4);
  const ancien = c.find((x) => x.cle === "bras");
  assert.equal(ancien.delta, null, "valeur recopiée : pas de « = » trompeur");
});

test("asymétries : écart en cm et en %, signalé au-delà de 5 %", () => {
  const a = asymetries(metrics, "2026-11-01");
  const bras = a.find((x) => x.paire === "bras");
  assert.deepEqual([bras.ecartCm, bras.ecartPct, bras.plusFort, bras.aSurveiller], [2, 5.1, "D", true]);
  const cuisse = a.find((x) => x.paire === "cuisse");
  assert.equal(cuisse.aSurveiller, false);
});

test("longueurs : cm stockés, pouces à l'affichage et à la saisie", () => {
  assert.equal(CM_PAR_POUCE, 2.54);
  assert.equal(uniteLongueur(true), "in");
  assert.equal(longueurAffichage(38.1, true), 15);
  assert.equal(longueurAffichage(38.14, false), 38.1);
  assert.equal(longueurDepuisSaisie("15", true), 38.1);
  assert.equal(longueurDepuisSaisie("38,5", false), 38.5);
  assert.equal(longueurDepuisSaisie("", false), null);
  assert.equal(longueurDepuisSaisie("-3", false), null);
});
