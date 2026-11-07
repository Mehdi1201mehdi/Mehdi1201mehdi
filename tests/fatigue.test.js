// @ts-check
/**
 * MOTEUR DE FATIGUE — agrégation par groupe musculaire.
 *
 * Le moteur raisonne sur des clés fines (trois faisceaux de deltoïde) ;
 * l'interface parle « épaules ». Le passage de l'un à l'autre est une décision,
 * pas une formalité : c'est elle qui décide si l'app dit « prêt » ou
 * « à laisser récupérer » — donc si l'on s'entraîne ou non.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readinessGroupe, zoneDisponibilite, PARAMS } from "../src/engine/fatigue.js";

test("zoneDisponibilite : les cinq zones couvrent 0 à 100 sans trou", () => {
  // Un readiness qui ne tomberait dans aucune zone laisserait l'interface sans
  // libellé, et la pastille s'afficherait vide.
  for (let r = 0; r <= 100; r += 1) {
    const z = zoneDisponibilite(r);
    assert.ok(z && z.cle && z.nom, `readiness ${r} sans zone`);
  }
  assert.equal(zoneDisponibilite(95).cle, "frais");
  assert.equal(zoneDisponibilite(80).cle, "pret");
  assert.equal(zoneDisponibilite(20).cle, "repos");
  // Hors bornes : on ne doit jamais lever ni renvoyer undefined.
  assert.ok(zoneDisponibilite(999).cle);
  assert.ok(zoneDisponibilite(-50).cle);
  assert.ok(zoneDisponibilite(/** @type {any} */ ("x")).cle);
  assert.equal(PARAMS.ZONES.length, 5);
});


/* ======================= AGRÉGATION PAR GROUPE ======================= */

test("readinessGroupe : le MUSCLE LE PLUS FATIGUÉ commande, pas la moyenne", () => {
  // C'est LA décision du helper. Annoncer « épaules prêtes » parce que deux
  // faisceaux sur trois sont frais est exactement l'erreur qui fait enchaîner
  // deux séances sur un muscle déjà à bout.
  const etat = {
    delt_ant: { readiness: 95 }, delt_lat: { readiness: 90 }, delt_post: { readiness: 30 },
  };
  assert.equal(readinessGroupe(etat, ["delt_ant", "delt_lat", "delt_post"]), 30);
  // La moyenne aurait donné 72, soit « disponible avec prudence » : un contresens.
});

test("readinessGroupe : un groupe inconnu renvoie null, pas 100", () => {
  // Renvoyer 100 ferait afficher « frais » pour un muscle dont on ne sait rien.
  assert.equal(readinessGroupe({}, ["inexistant"]), null);
  assert.equal(readinessGroupe({ a: { readiness: 50 } }, []), null);
  assert.equal(readinessGroupe(/** @type {any} */ (null), ["a"]), null);
  assert.equal(readinessGroupe({ a: { readiness: 50 } }, /** @type {any} */ (null)), null);
});

test("readinessGroupe : les clés absentes sont ignorées, pas comptées à zéro", () => {
  const etat = { a: { readiness: 80 } };
  assert.equal(readinessGroupe(etat, ["a", "absent"]), 80);
});

test("readinessGroupe : borné 0–100 et toujours entier", () => {
  for (const cas of [{ a: { readiness: 150 } }, { a: { readiness: -20 } }, { a: { readiness: NaN } }, { a: { readiness: 62.6 } }]) {
    const r = readinessGroupe(cas, ["a"]);
    assert.ok(Number.isInteger(r) && r >= 0 && r <= 100, `valeur ${r}`);
  }
});

import { heuresAvant } from "../src/engine/fatigue.js";
test("heures avant le seuil « prêt » : décroissance exponentielle inversée", () => {
  // 50 % de fatigue, demi-vie 24 h, seuil 75 % (fatigue ≤ 25) → une demi-vie
  assert.equal(heuresAvant(50, 24, 75), 24);
  assert.equal(heuresAvant(20, 24, 75), 0, "déjà prêt");
  assert.equal(heuresAvant(80, 30, 90), Math.ceil(30 * Math.log2(80 / 10)));   // seuil plus exigeant → plus long
  assert.ok(heuresAvant(80, 30, 60) < heuresAvant(80, 30, 75));
});

test("etatMusculaire : demi-vie et délai avant « prêt » exposés, seuil réglable", async () => {
  const { etatMusculaire } = await import("../src/engine/fatigue.js");
  const { getExercise } = await import("../src/data/exercises.js");
  const t0 = Date.parse("2026-11-07T10:00:00Z");
  const logs = [{ date: new Date(t0 - 2 * 36e5).toISOString(), exercices: [{ exerciceId: "developpe-couche-barre", series: Array(5).fill({ chargeKg: 80, reps: 8, rir: 1 }) }] }];
  const e75 = etatMusculaire(logs, getExercise, t0);
  const e90 = etatMusculaire(logs, getExercise, t0, { seuilPret: 90 });
  assert.ok(e75.pectoraux.demiVieH > 0);
  assert.ok(e75.pectoraux.heuresAvantPret > 0);
  assert.ok(e90.pectoraux.heuresAvantPret > e75.pectoraux.heuresAvantPret);
  assert.equal(e75.mollets.heuresAvantPret, 0, "muscle non sollicité : prêt");
});
