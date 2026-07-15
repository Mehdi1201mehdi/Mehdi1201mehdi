// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { bilan, moyenne7 } from "../src/engine/review.js";

const TODAY = "2026-03-01";
// jours avant TODAY → date ISO
const j = (n) => new Date(new Date(TODAY + "T12:00").getTime() - n * 864e5).toISOString();
const m = (n, poidsKg, extra = {}) => ({ date: j(n), poidsKg, ...extra });

test("moyenne7 : moyenne sur la fenêtre de 7 jours", () => {
  const metrics = [m(0, 86), m(2, 86.4), m(4, 85.6)];
  assert.equal(Math.round(moyenne7(metrics, TODAY) * 10) / 10, 86);
});

test("données insuffisantes → statut insuffisant", () => {
  const r = bilan({ objectif: "perte_graisse" }, [m(0, 86)], TODAY);
  assert.equal(r.statut, "insuffisant");
});

test("perte de graisse dans la cible → on ne change rien", () => {
  const metrics = [m(0, 86), m(2, 86.2), m(4, 85.9), m(14, 87.3), m(16, 87.4), m(18, 87.2)];
  const r = bilan({ objectif: "perte_graisse" }, metrics, TODAY);
  assert.equal(r.statut, "on_garde");
});

test("poids stable en perte → stagnation, une seule action", () => {
  const metrics = [m(0, 87), m(2, 87.1), m(4, 86.9), m(14, 87.1), m(16, 87.2), m(18, 87.0)];
  const r = bilan({ objectif: "perte_graisse" }, metrics, TODAY);
  assert.equal(r.statut, "stagnation");
  assert.match(r.message, /une seule action|jamais les deux/i);
});

test("poids stable mais taille en baisse → recomposition", () => {
  const metrics = [
    m(0, 87, { taille: 88 }), m(3, 87.1), m(6, 86.95),
    m(14, 87.05, { taille: 90 }), m(16, 87.1), m(18, 87.0),
  ];
  const r = bilan({ objectif: "recomposition" }, metrics, TODAY);
  assert.equal(r.statut, "recomposition");
});

test("prise de muscle au bon rythme → on garde", () => {
  const metrics = [m(0, 81.2), m(2, 81.3), m(4, 81.1), m(14, 80.8), m(16, 80.7), m(18, 80.9)];
  const r = bilan({ objectif: "prise_muscle" }, metrics, TODAY);
  assert.equal(r.statut, "on_garde");
});
