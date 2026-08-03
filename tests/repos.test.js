// @ts-check
/**
 * MINUTEUR DE REPOS : il doit rester juste quand le navigateur cesse de
 * déclencher les minuteurs — c'est-à-dire précisément quand on pose le
 * téléphone entre deux séries.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  REPOS_MAX_SEC, creerRepos, restantSec, estEcoule, progression,
  ajusterRepos, restaurerRepos, formatRestant,
  retardSec, formatRetard, RETARD_SIGNIFICATIF_SEC, decisionReprise,
} from "../src/engine/repos.js";

const T = Date.parse("2026-07-28T18:00:00Z");

test("creerRepos : l'instant de fin, pas un compteur", () => {
  const r = creerRepos(90, "Développé couché · série 2", T);
  assert.equal(r.finAt, T + 90_000);
  assert.equal(r.totalSec, 90);
  assert.equal(r.label, "Développé couché · série 2");
});

test("creerRepos : valeurs aberrantes ramenées dans des bornes utilisables", () => {
  assert.equal(creerRepos(0, "", T).totalSec, 60);        // 0 → défaut
  assert.equal(creerRepos(-30, "", T).totalSec, 1);
  assert.equal(creerRepos(NaN, "", T).totalSec, 60);
  assert.equal(creerRepos(99999, "", T).totalSec, REPOS_MAX_SEC);
  assert.equal(creerRepos(90, null, T).label, "");
});

test("restantSec : recalculé depuis l'horloge, jamais négatif", () => {
  const r = creerRepos(120, "", T);
  assert.equal(restantSec(r, T), 120);
  assert.equal(restantSec(r, T + 30_000), 90);
  assert.equal(restantSec(r, T + 120_000), 0);
  assert.equal(restantSec(r, T + 500_000), 0, "un repos très dépassé reste à 0");
  assert.equal(restantSec(null, T), 0);
  assert.equal(restantSec({ finAt: "pas un nombre" }, T), 0);
});

test("LE CAS QUI COMPTE — les minuteurs gelés ne faussent plus rien", () => {
  // Le téléphone est posé, l'écran se verrouille : aucun tic ne se produit
  // pendant 100 s. Un compteur décrémenté afficherait encore 2:00 ; ici on
  // relit l'horloge, donc l'affichage est exact au réveil.
  const r = creerRepos(120, "", T);
  const auReveil = T + 100_000;
  assert.equal(restantSec(r, auReveil), 20);
  assert.equal(formatRestant(r, auReveil), "0:20");
  assert.equal(estEcoule(r, auReveil), false);
  // et s'il s'est écoulé pendant l'absence, on le sait
  assert.equal(estEcoule(r, T + 121_000), true);
});

test("progression : de 0 à 1, bornée, robuste à un total absent", () => {
  const r = creerRepos(100, "", T);
  assert.equal(progression(r, T), 0);
  assert.equal(progression(r, T + 50_000), 0.5);
  assert.equal(progression(r, T + 100_000), 1);
  assert.equal(progression(r, T + 900_000), 1, "jamais au-delà de 1");
  assert.equal(progression(null, T), 1);
  assert.equal(progression({ finAt: T + 1000, totalSec: 0 }, T), 1);
});

test("ajusterRepos : +15 / −15 repartent du temps RESTANT", () => {
  const r = creerRepos(120, "x", T);
  const t = T + 60_000;                       // il reste 60 s
  const plus = ajusterRepos(r, 15, t);
  assert.equal(restantSec(plus, t), 75);
  assert.equal(plus.totalSec, 120, "le total ne diminue pas");
  assert.equal(plus.label, "x", "le libellé est conservé");
  const moins = ajusterRepos(r, -15, t);
  assert.equal(restantSec(moins, t), 45);
  // on ne peut pas descendre sous 1 s ni dépasser la borne haute
  assert.equal(restantSec(ajusterRepos(r, -9999, t), t), 1);
  assert.equal(restantSec(ajusterRepos(r, 999999, t), t), REPOS_MAX_SEC);
  assert.equal(ajusterRepos(null, 15, t), null);
});

test("ajusterRepos : allonger au-delà du total initial étend l'anneau", () => {
  const r = creerRepos(60, "", T);
  const grand = ajusterRepos(r, 60, T);       // 120 s restantes
  assert.equal(grand.totalSec, 120);
  assert.equal(progression(grand, T), 0);
});

test("restaurerRepos : un repos encore en cours est repris avec le bon temps", () => {
  const r = creerRepos(120, "Squat · série 1", T);
  const rt = restaurerRepos(JSON.parse(JSON.stringify(r)), T + 45_000);
  assert.ok(rt);
  assert.equal(restantSec(rt, T + 45_000), 75);
  assert.equal(rt.label, "Squat · série 1");
});

test("restaurerRepos : refuse l'échu, l'illisible et l'aberrant", () => {
  const r = creerRepos(120, "", T);
  assert.equal(restaurerRepos(r, T + 121_000), null, "déjà terminé");
  assert.equal(restaurerRepos(null, T), null);
  assert.equal(restaurerRepos({}, T), null);
  assert.equal(restaurerRepos({ finAt: "hier" }, T), null);
  // horloge décalée ou données abîmées : un repos de 10 jours n'est pas affiché
  assert.equal(restaurerRepos({ finAt: T + 10 * 864e5, totalSec: 90 }, T), null);
  // total manquant : recalculé au lieu de rejeter
  const sansTotal = restaurerRepos({ finAt: T + 30_000 }, T);
  assert.equal(sansTotal.totalSec, 30);
  assert.equal(sansTotal.label, "");
});

test("formatRestant : mm:ss, avec les secondes sur deux chiffres", () => {
  assert.equal(formatRestant(creerRepos(125, "", T), T), "2:05");
  assert.equal(formatRestant(creerRepos(60, "", T), T), "1:00");
  assert.equal(formatRestant(creerRepos(9, "", T), T), "0:09");
  assert.equal(formatRestant(null, T), "0:00");
});

/* ---- Retard : le repos s'est terminé pendant que l'écran était verrouillé ---- */

test("retardSec : zéro tant que le repos court", () => {
  const t0 = 1_700_000_000_000;
  const r = creerRepos(90, "", t0);
  assert.equal(retardSec(r, t0), 0);
  assert.equal(retardSec(r, t0 + 89_000), 0);
  assert.equal(retardSec(r, t0 + 90_000), 0, "à la seconde exacte, il n'est pas en retard");
});

test("retardSec : compte les secondes écoulées DEPUIS la fin", () => {
  // Le navigateur gèle la page écran verrouillé : le signal n'arrive qu'au
  // déverrouillage. Annoncer « repos terminé » alors laisserait croire qu'il
  // vient de s'écouler, alors qu'il peut dater de trois minutes.
  const t0 = 1_700_000_000_000;
  const r = creerRepos(60, "", t0);
  assert.equal(retardSec(r, t0 + 60_000 + 8_000), 8);
  assert.equal(retardSec(r, t0 + 60_000 + 200_000), 200);
});

test("retardSec : entrées abîmées → 0, jamais NaN ni négatif", () => {
  for (const r of [null, undefined, {}, { finAt: "bientôt" }, { finAt: NaN }]) {
    const v = retardSec(/** @type {any} */ (r), Date.now());
    assert.equal(v, 0, JSON.stringify(r));
  }
});

test("formatRetard : lisible, et pas de fausse précision au-delà de 10 minutes", () => {
  assert.equal(formatRetard(0), "0 s");
  assert.equal(formatRetard(8), "8 s");
  assert.equal(formatRetard(59), "59 s");
  assert.equal(formatRetard(60), "1 min");
  assert.equal(formatRetard(80), "1 min 20");
  assert.equal(formatRetard(125), "2 min 05", "secondes sur deux chiffres");
  // Au-delà de dix minutes, l'utilisateur a fait autre chose : les secondes
  // deviennent du bruit.
  assert.equal(formatRetard(725), "12 min");
  assert.equal(formatRetard(-5), "0 s");
  assert.equal(formatRetard(/** @type {any} */ ("longtemps")), "0 s");
});

test("RETARD_SIGNIFICATIF_SEC : assez court pour être utile, assez long pour ne pas bavarder", () => {
  assert.ok(RETARD_SIGNIFICATIF_SEC >= 3 && RETARD_SIGNIFICATIF_SEC <= 15);
});

/* ---- Le minuteur ne doit JAMAIS s'afficher hors séance ---- */

test("decisionReprise : un repos sans séance active est purgé, jamais repris", () => {
  // On ouvre l'app un mardi matin et un minuteur tourne : impossible d'en
  // conclure autre chose que « c'est cassé ».
  const enCours = creerRepos(120, "Squat", Date.now());
  assert.equal(decisionReprise(enCours, false), "purger");
  assert.equal(decisionReprise(enCours, true), "reprendre", "avec séance : on reprend");
});

test("decisionReprise : un repos échu est purgé même pendant une séance", () => {
  const t0 = 1_700_000_000_000;
  const echu = creerRepos(60, "", t0);
  assert.equal(decisionReprise(echu, true, t0 + 120_000), "purger");
  assert.equal(decisionReprise(echu, true, t0 + 30_000), "reprendre", "pas encore écoulé");
});

test("decisionReprise : rien à faire quand il n'y a pas de repos stocké", () => {
  for (const r of [null, undefined, {}, { finAt: "plus tard" }]) {
    assert.equal(decisionReprise(/** @type {any} */ (r), true), "rien", JSON.stringify(r));
    assert.equal(decisionReprise(/** @type {any} */ (r), false), "rien");
  }
});
