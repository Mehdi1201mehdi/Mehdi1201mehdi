// @ts-check
/**
 * TROPHÉES — un jalon qui se déclenche à tort ne se remarque pas tout de suite,
 * et détruit toute confiance dans le reste des chiffres le jour où on s'en
 * aperçoit. Ces tests vérifient qu'aucun trophée ne s'obtient sans l'avoir
 * mérité, et qu'aucun mérité ne se perd.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FAMILLES, trophees, mesures, meilleureSerieSemaines } from "../src/engine/trophees.js";

const jour = (n) => new Date(Date.now() - n * 864e5).toISOString();
/** Séance à `n` jours, avec `series` séries de `kg` × `reps`. */
const seance = (n, kg = 100, reps = 10, series = 1, dureeSec = 3600) => ({
  id: "l" + n, date: jour(n), dureeSec,
  exercices: [{ exerciceId: "squat-barre", series: Array.from({ length: series }, () => ({ chargeKg: kg, reps })) }],
});

/* ============================ STRUCTURE ============================ */

test("FAMILLES : paliers strictement croissants et bien nommés", () => {
  assert.equal(FAMILLES.length, 5);
  for (const f of FAMILLES) {
    assert.ok(f.cle && f.nom && f.unite && f.quoi, `${f.cle} : description incomplète`);
    assert.equal(f.paliers.length, 5, `${f.cle} : cinq paliers attendus`);
    for (let i = 1; i < f.paliers.length; i++) {
      assert.ok(f.paliers[i].seuil > f.paliers[i - 1].seuil,
        `${f.cle} : palier ${i + 1} pas plus haut que le précédent`);
    }
    for (const p of f.paliers) assert.ok(p.nom.length > 2, `${f.cle} : palier sans nom`);
  }
});

test("FAMILLES : aucun nom de palier en double dans l'application", () => {
  const noms = FAMILLES.flatMap((f) => f.paliers.map((p) => p.nom));
  assert.equal(new Set(noms).size, noms.length, "deux trophées ne peuvent pas porter le même nom");
});

/* ============================ MESURES ============================ */

test("mesures : tonnage, temps et nombre de séances", () => {
  const logs = [seance(1, 100, 10, 4, 3600), seance(3, 50, 8, 2, 1800)];
  const m = mesures(logs);
  assert.equal(m.assiduite, 2);
  // 100×10×4 = 4 000 kg, 50×8×2 = 800 kg → 4,8 t
  assert.equal(Math.round(m.volume * 10) / 10, 4.8);
  assert.equal(m.temps, 1.5, "3600 + 1800 s = 1,5 h");
});

test("mesures : les séries sans charge ou sans répétitions ne comptent pas", () => {
  const logs = [{ id: "a", date: jour(1), dureeSec: 0, exercices: [{ exerciceId: "pompes", series: [
    { chargeKg: null, reps: 20 }, { chargeKg: 60, reps: null }, { chargeKg: 0, reps: 0 }, { chargeKg: 50, reps: 10 },
  ] }] }];
  assert.equal(mesures(logs).volume, 0.5, "seule la dernière série est comptable");
});

test("mesures : historique vide ou abîmé → que des zéros, jamais NaN", () => {
  for (const l of [[], null, undefined, [{}], [{ date: "pas une date" }]]) {
    const m = mesures(/** @type {any} */ (l));
    for (const [k, v] of Object.entries(m)) assert.ok(Number.isFinite(v), `${k} n'est pas un nombre`);
  }
});

/* ====================== SÉRIE DE SEMAINES ====================== */

test("meilleureSerieSemaines : semaines consécutives, pas jours", () => {
  // Une séance par semaine pendant 5 semaines.
  const logs = [0, 7, 14, 21, 28].map((n) => seance(n));
  assert.equal(meilleureSerieSemaines(logs), 5);
});

test("meilleureSerieSemaines : plusieurs séances la même semaine comptent pour une", () => {
  const logs = [0, 1, 2, 3].map((n) => seance(n));
  assert.ok(meilleureSerieSemaines(logs) <= 2, "quatre jours d'affilée ne font pas quatre semaines");
});

test("meilleureSerieSemaines : une semaine sautée casse la série", () => {
  // semaines 0, 1, puis trou, puis 4, 5, 6 → la meilleure est 3
  const logs = [0, 7, 28, 35, 42].map((n) => seance(n));
  assert.equal(meilleureSerieSemaines(logs), 3);
});

test("meilleureSerieSemaines : historique vide ou dates invalides", () => {
  assert.equal(meilleureSerieSemaines([]), 0);
  assert.equal(meilleureSerieSemaines(/** @type {any} */ (null)), 0);
  assert.equal(meilleureSerieSemaines([{ date: "n'importe quoi" }]), 0);
});

/* ============================ TROPHÉES ============================ */

test("trophees : rien n'est obtenu sans historique", () => {
  const t = trophees([], 0);
  assert.equal(t.obtenus, 0);
  assert.equal(t.total, 25, "5 familles × 5 paliers");
  assert.equal(t.dernier, null);
  for (const f of t.familles) {
    assert.ok(f.prochain, `${f.cle} : le premier palier doit rester visible`);
    assert.equal(f.prochain.rang, 1);
    assert.equal(f.obtenus, 0);
  }
});

test("trophees : un palier s'obtient EXACTEMENT à son seuil, pas avant", () => {
  const neuf = trophees(Array.from({ length: 9 }, (_, i) => seance(i * 7)), 0);
  assert.equal(neuf.familles.find((f) => f.cle === "assiduite").obtenus, 0, "9 séances : pas encore");
  const dix = trophees(Array.from({ length: 10 }, (_, i) => seance(i * 7)), 0);
  assert.equal(dix.familles.find((f) => f.cle === "assiduite").obtenus, 1, "10 séances : obtenu");
});

test("trophees : le prochain palier est toujours visible, avec sa progression", () => {
  // 30 séances → paliers 10 et 25 pris, prochain 50.
  const t = trophees(Array.from({ length: 30 }, (_, i) => seance(i * 7)), 0);
  const f = t.familles.find((x) => x.cle === "assiduite");
  assert.equal(f.obtenus, 2);
  assert.equal(f.prochain.seuil, 50);
  assert.equal(f.restant, 20, "il reste 20 séances");
  // progression entre 25 et 50 : (30−25)/(50−25) = 0,2
  assert.ok(Math.abs(f.progression - 0.2) < 1e-9, `progression = ${f.progression}`);
});

test("trophees : progression bornée à 0–1, jamais de division par zéro", () => {
  for (const n of [0, 1, 9, 10, 11, 260]) {
    const t = trophees(Array.from({ length: n }, (_, i) => seance(i * 7)), 0);
    for (const f of t.familles) {
      assert.ok(f.progression >= 0 && f.progression <= 1, `${f.cle} : progression ${f.progression}`);
      assert.ok(f.restant >= 0, `${f.cle} : restant négatif`);
    }
  }
});

test("trophees : toute la famille prise → plus de prochain, progression pleine", () => {
  const t = trophees([], 999);   // 999 records dépasse le dernier palier (100)
  const f = t.familles.find((x) => x.cle === "records");
  assert.equal(f.obtenus, 5);
  assert.equal(f.prochain, null);
  assert.equal(f.progression, 1);
  assert.equal(f.restant, 0);
});

test("trophees : « dernier » compare les RANGS, pas les seuils", () => {
  // Piège : « 12 semaines d'affilée » (rang 3) et « 10 séances » (rang 1) n'ont
  // pas la même unité. Comparer les seuils bruts ferait gagner le plus grand
  // nombre, pas le plus bel exploit.
  const t = trophees(Array.from({ length: 12 }, (_, i) => seance(i * 7)), 1);
  assert.ok(t.dernier, "un trophée a bien été obtenu");
  assert.equal(t.dernier.famille, "serie", "12 semaines d'affilée est le rang le plus élevé");
  assert.equal(t.dernier.rang, 3);
  // Et le rang mis en avant est bien le maximum de tous les rangs obtenus.
  const rangMax = Math.max(...t.familles.flatMap((f) => f.paliers.filter((p) => p.obtenu).map((p) => p.rang)));
  assert.equal(t.dernier.rang, rangMax);
});

test("trophees : un trophée ne se PERD jamais quand l'historique grandit", () => {
  // Propriété essentielle : ajouter des séances ne peut que faire monter.
  let precedent = 0;
  for (const n of [0, 5, 10, 26, 51, 101]) {
    const t = trophees(Array.from({ length: n }, (_, i) => seance(i * 7, 100, 10, 4)), Math.floor(n / 10));
    assert.ok(t.obtenus >= precedent, `${n} séances : ${t.obtenus} < ${precedent}, un trophée a disparu`);
    precedent = t.obtenus;
  }
});

test("trophees : aucun palier n'est hors d'atteinte d'un pratiquant régulier", () => {
  // Trois ans à quatre séances par semaine, une heure, 8 tonnes par séance.
  const logs = Array.from({ length: 624 }, (_, i) => seance(Math.floor(i / 4) * 7 + (i % 4), 100, 10, 8, 3600));
  const t = trophees(logs, 120);
  assert.equal(t.obtenus, t.total, `seulement ${t.obtenus}/${t.total} après trois ans d'assiduité`);
});
