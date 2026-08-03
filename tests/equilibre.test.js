// @ts-check
/**
 * ÉQUILIBRE DU CORPS — pousser deux fois plus qu'on ne tire est la cause la plus
 * banale d'épaules douloureuses, et aucun total de volume ne la montre. Ces
 * tests verrouillent la décision centrale du module — compter en SÉRIES et non
 * en kilos — et le refus de juger sur trop peu de données.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FAMILLES, AXES, SEUIL_SERIES, SEUIL_RATIO,
  seriesParPatron, equilibre, resumeEquilibre,
} from "../src/engine/equilibre.js";

const CAT = {
  bench: { id: "bench", patron: "poussee_horizontale" },
  militaire: { id: "militaire", patron: "poussee_verticale" },
  dips: { id: "dips", patron: "extension_bras" },
  rowing: { id: "rowing", patron: "tirage_horizontal" },
  traction: { id: "traction", patron: "tirage_vertical" },
  curl: { id: "curl", patron: "flexion_bras" },
  squat: { id: "squat", patron: "squat" },
  sdt: { id: "sdt", patron: "charniere_hanche" },
  fente: { id: "fente", patron: "fente" },
  sansPatron: { id: "sansPatron" },
};
const get = (id) => CAT[id] || null;
const serie = (chargeKg = 50, reps = 8) => ({ chargeKg, reps });
/** Une séance avec n séries de chaque exercice cité. */
const seance = (id, date, paires) => ({
  id, date,
  exercices: paires.map(([exerciceId, n]) => ({
    exerciceId, series: Array.from({ length: n }, () => serie()),
  })),
});

/* ======================= COMPTAGE ======================= */

test("seriesParPatron : compte les séries, pas le tonnage", () => {
  // C'est LA décision du module : un soulevé de terre à 180 kg écraserait vingt
  // séries de rowing, et l'app conclurait « bas du corps dominant » pour tout le
  // monde, tout le temps.
  const logs = [{
    id: "a", date: "2026-01-05T12:00:00Z",
    exercices: [
      { exerciceId: "sdt", series: [{ chargeKg: 180, reps: 3 }] },
      { exerciceId: "rowing", series: [{ chargeKg: 40, reps: 10 }, { chargeKg: 40, reps: 10 }] },
    ],
  }];
  const p = seriesParPatron(logs, get);
  assert.equal(p.charniere_hanche, 1);
  assert.equal(p.tirage_horizontal, 2, "deux séries légères pèsent plus qu'une lourde");
});

test("seriesParPatron : exercice sans patron ou inconnu ignoré, sans erreur", () => {
  const logs = [seance("a", "2026-01-05T12:00:00Z", [["sansPatron", 3], ["inexistant", 3], ["squat", 2]])];
  const p = seriesParPatron(logs, get);
  assert.equal(p.squat, 2);
  assert.equal(Object.keys(p).length, 1);
  // Un accesseur qui lève ne doit pas faire tomber l'écran.
  assert.deepEqual(seriesParPatron(logs, () => { throw new Error("boum"); }), {});
  assert.deepEqual(seriesParPatron(/** @type {any} */ (null), get), {});
});

test("seriesParPatron : la période filtre bien l'historique", () => {
  const logs = [
    seance("vieux", "2026-01-05T12:00:00Z", [["squat", 5]]),
    seance("recent", "2026-03-05T12:00:00Z", [["squat", 2]]),
  ];
  const p = seriesParPatron(logs, get, { depuis: Date.parse("2026-02-01T00:00:00Z") });
  assert.equal(p.squat, 2);
});

/* ======================= SEUIL ======================= */

test("equilibre : sous le seuil, l'app se TAIT et dit combien il manque", () => {
  // Juger un équilibre sur quatre séries n'a aucun sens et décourage pour rien.
  const logs = [seance("a", "2026-01-05T12:00:00Z", [["bench", 2], ["rowing", 2]])];
  const r = equilibre(logs, get);
  const axe = r.axes.find((a) => a.cle === "pousseeTirage");
  assert.equal(axe.mesurable, false);
  assert.match(axe.message, /Encore \d+ série/);
  assert.equal(r.mesurable, false);
  assert.ok(r.raison);
});

test("equilibre : historique vide → aucun verdict, aucune erreur", () => {
  for (const l of [null, [], [{ exercices: null }]]) {
    const r = equilibre(/** @type {any} */ (l), get);
    assert.equal(r.mesurable, false);
    assert.equal(r.seriesTotal, 0);
    assert.equal(r.axes.length, AXES.length, "les axes existent toujours, même non mesurables");
  }
});

/* ======================= VERDICTS ======================= */

test("equilibre : poussée dominante détectée et expliquée", () => {
  const logs = [seance("a", "2026-01-05T12:00:00Z", [["bench", 12], ["militaire", 6], ["rowing", 4]])];
  const axe = equilibre(logs, get).axes.find((a) => a.cle === "pousseeTirage");
  assert.equal(axe.mesurable, true);
  assert.equal(axe.gauche, 18);
  assert.equal(axe.droite, 4);
  assert.equal(axe.desequilibre, "gauche");
  assert.match(axe.message, /épaules/i, "le message doit dire POURQUOI ça compte");
  assert.match(axe.message, /rowing|tirage/i, "et quoi faire");
});

test("equilibre : tirage dominant détecté dans l'autre sens", () => {
  const logs = [seance("a", "2026-01-05T12:00:00Z", [["bench", 4], ["rowing", 10], ["traction", 8]])];
  const axe = equilibre(logs, get).axes.find((a) => a.cle === "pousseeTirage");
  assert.equal(axe.desequilibre, "droite");
});

test("equilibre : une répartition normale n'alerte PAS", () => {
  // Un seuil trop bas produirait une alerte permanente que plus personne ne lit.
  const logs = [seance("a", "2026-01-05T12:00:00Z", [["bench", 10], ["rowing", 9]])];
  const axe = equilibre(logs, get).axes.find((a) => a.cle === "pousseeTirage");
  assert.equal(axe.desequilibre, "equilibre");
  assert.match(axe.message, /équilibr/i);
});

test("equilibre : un côté à zéro est un déséquilibre total, sans division par zéro", () => {
  const logs = [seance("a", "2026-01-05T12:00:00Z", [["bench", 14]])];
  const axe = equilibre(logs, get).axes.find((a) => a.cle === "pousseeTirage");
  assert.equal(axe.droite, 0);
  assert.equal(axe.desequilibre, "gauche");
  assert.ok(Number.isFinite(axe.part));
});

test("equilibre : « ne saute pas le jour des jambes », mesuré", () => {
  const logs = [seance("a", "2026-01-05T12:00:00Z", [["bench", 10], ["rowing", 10], ["squat", 2]])];
  const axe = equilibre(logs, get).axes.find((a) => a.cle === "hautBas");
  assert.equal(axe.gauche, 20);
  assert.equal(axe.droite, 2);
  assert.equal(axe.desequilibre, "gauche");
});

test("equilibre : genou contre hanche, squats contre soulevés", () => {
  const logs = [seance("a", "2026-01-05T12:00:00Z", [["squat", 10], ["fente", 6], ["sdt", 2]])];
  const axe = equilibre(logs, get).axes.find((a) => a.cle === "genouHanche");
  assert.equal(axe.gauche, 16);
  assert.equal(axe.droite, 2);
  assert.equal(axe.desequilibre, "gauche");
  assert.match(axe.message, /ischios|fessiers/i);
});

test("equilibre : la part reste bornée entre 0 et 1", () => {
  const cas = [
    [["bench", 20]], [["rowing", 20]], [["bench", 10], ["rowing", 10]], [],
  ];
  for (const paires of cas) {
    const r = equilibre([seance("a", "2026-01-05T12:00:00Z", paires)], get);
    for (const a of r.axes) {
      assert.ok(a.part >= 0 && a.part <= 1, `${a.cle} : part ${a.part}`);
    }
  }
});

/* ======================= RÉSUMÉ ======================= */

test("resumeEquilibre : compte les axes à corriger, ou dit que tout va bien", () => {
  // Réellement équilibré sur les quatre axes : poussée 16 / tirage 16,
  // haut 32 / bas 26, genou 14 / hanche 12, horizontal 8 / vertical 8.
  const bon = equilibre([seance("a", "2026-01-05T12:00:00Z",
    [["bench", 8], ["militaire", 8], ["rowing", 8], ["traction", 8],
      ["squat", 14], ["sdt", 12]])], get);
  assert.deepEqual(bon.axes.filter((a) => a.desequilibre !== "equilibre").map((a) => a.cle), [],
    "aucun axe ne doit être signalé sur une répartition saine");
  assert.equal(resumeEquilibre(bon), "Équilibré");

  const mauvais = equilibre([seance("a", "2026-01-05T12:00:00Z", [["bench", 20], ["rowing", 2]])], get);
  assert.match(resumeEquilibre(mauvais), /axes? à corriger/);
  assert.equal(resumeEquilibre(/** @type {any} */ (null)), "");
});

/* ======================= COHÉRENCE ======================= */

test("FAMILLES : les patrons cités existent vraiment au catalogue", async () => {
  // Un patron mal orthographié ne lèverait aucune erreur : l'axe compterait
  // simplement zéro, pour toujours, sans que personne ne s'en aperçoive.
  const ex = await import("../src/data/exercises.js");
  const extra = await import("../src/data/exercises-extra.js");
  const reels = new Set([...ex.CATALOGUE, ...extra.EXTRA_EXERCISES].map((e) => e.patron).filter(Boolean));
  for (const [nom, liste] of Object.entries(FAMILLES)) {
    for (const p of liste) assert.ok(reels.has(p), `famille ${nom} : patron inconnu « ${p} »`);
  }
});

test("AXES : quatre axes, chacun expliqué et actionnable", () => {
  assert.equal(AXES.length, 4, "au-delà, ce sont des chiffres qu'on ne sait plus interpréter");
  for (const a of AXES) {
    assert.ok(FAMILLES[a.gauche] && FAMILLES[a.droite], `${a.cle} : famille inconnue`);
    assert.ok(a.quoi.length > 20, `${a.cle} : il faut dire pourquoi ça compte`);
    assert.ok(a.corriger.length > 10, `${a.cle} : il faut dire quoi faire`);
  }
  assert.ok(SEUIL_RATIO > 1.1 && SEUIL_RATIO < 2, `seuil ${SEUIL_RATIO}`);
  assert.ok(SEUIL_SERIES >= 8, "juger sur quatre séries n'a aucun sens");
});
