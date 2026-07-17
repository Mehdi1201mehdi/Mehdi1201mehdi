// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMA_VERSION, etatVide, normaliserEtat, choisirSourcePlusRiche, choisirEtat,
} from "../src/store/migrate.js";

test("etatVide : schéma courant complet", () => {
  const e = etatVide();
  assert.equal(e.version, SCHEMA_VERSION);
  for (const cle of ["profil", "programme", "programmesPerso", "exercicesPerso",
    "sessionEnCours", "logs", "metrics", "foodlog", "reviews", "mediaCache", "reglages"]) {
    assert.ok(cle in e, `clé manquante: ${cle}`);
  }
  assert.deepEqual(e.programmesPerso, []);
  assert.equal(e.sessionEnCours, null);
});

test("normaliserEtat : null/invalide → état vide", () => {
  assert.deepEqual(normaliserEtat(null), etatVide());
  assert.deepEqual(normaliserEtat("x"), etatVide());
  assert.deepEqual(normaliserEtat(42), etatVide());
});

test("normaliserEtat : ancien état v1 conservé + nouvelles clés ajoutées", () => {
  const v1 = {
    version: 1,
    profil: { prenom: "Mehdi" },
    programme: { id: "p1", seances: [] },
    logs: [{ id: "l1", exercices: [] }],
    metrics: [{ date: "2026-01-01", poidsKg: 80 }],
    reglages: { theme: "dark" },
  };
  const out = normaliserEtat(v1);
  // données existantes préservées
  assert.equal(out.profil.prenom, "Mehdi");
  assert.equal(out.programme.id, "p1");
  assert.equal(out.logs.length, 1);
  assert.equal(out.metrics[0].poidsKg, 80);
  // réglage explicite préservé, réglages manquants complétés par défaut
  assert.equal(out.reglages.theme, "dark");
  assert.equal(out.reglages.unites, "metrique");
  // nouvelles clés créées
  assert.deepEqual(out.programmesPerso, []);
  assert.deepEqual(out.exercicesPerso, []);
  assert.equal(out.sessionEnCours, null);
  // version mise à jour
  assert.equal(out.version, SCHEMA_VERSION);
});

test("normaliserEtat : collections abîmées → tableaux/objets sûrs", () => {
  const out = normaliserEtat({ logs: "pas un tableau", foodlog: 5, mediaCache: null });
  assert.deepEqual(out.logs, []);
  assert.deepEqual(out.foodlog, {});
  assert.deepEqual(out.mediaCache, {});
});

test("normaliserEtat : ne mute pas l'entrée", () => {
  const entree = { logs: [{ id: "a" }] };
  const copie = JSON.parse(JSON.stringify(entree));
  normaliserEtat(entree);
  assert.deepEqual(entree, copie);
});

test("choisirSourcePlusRiche : garde la source la plus complète", () => {
  const pauvre = { logs: [], metrics: [], profil: null };
  const riche = { logs: [{}, {}], metrics: [{}], profil: { prenom: "M" } };
  assert.equal(choisirSourcePlusRiche(riche, pauvre), riche);
  assert.equal(choisirSourcePlusRiche(pauvre, riche), riche);
});

test("choisirSourcePlusRiche : à égalité, garde le premier (a)", () => {
  const a = { logs: [{}], metrics: [] };
  const b = { logs: [{}], metrics: [] };
  assert.equal(choisirSourcePlusRiche(a, b), a);
});

test("choisirSourcePlusRiche : gère null", () => {
  const a = { logs: [{}] };
  assert.equal(choisirSourcePlusRiche(a, null), a);
  assert.equal(choisirSourcePlusRiche(null, a), a);
});

test("choisirEtat : dernière écriture gagne via _savedAt", () => {
  const ancien = { _savedAt: 100, logs: [{}, {}, {}] };  // plus riche mais plus vieux
  const recent = { _savedAt: 200, logs: [] };            // plus récent
  assert.equal(choisirEtat(ancien, recent), recent);
  assert.equal(choisirEtat(recent, ancien), recent);
});

test("choisirEtat : une seule source horodatée l'emporte", () => {
  const horodate = { _savedAt: 50, logs: [] };
  const sans = { logs: [{}, {}] };
  assert.equal(choisirEtat(horodate, sans), horodate);
  assert.equal(choisirEtat(sans, horodate), horodate);
});

test("choisirEtat : sans horodatage → repli sur la plus riche", () => {
  const pauvre = { logs: [] };
  const riche = { logs: [{}, {}], metrics: [{}] };
  assert.equal(choisirEtat(pauvre, riche), riche);
});

test("choisirEtat : horodatages égaux → repli sur la plus riche", () => {
  const a = { _savedAt: 100, logs: [] };
  const b = { _savedAt: 100, logs: [{}] };
  assert.equal(choisirEtat(a, b), b);
});
