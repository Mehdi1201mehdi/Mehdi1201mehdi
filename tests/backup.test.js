// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  construireExport, validerImport, appliquerImport, nomFichierBackup,
} from "../src/engine/backup.js";
import { SCHEMA_VERSION } from "../src/store/migrate.js";

const etatExemple = {
  profil: { prenom: "Mehdi" },
  programme: { id: "p1", seances: [] },
  programmesPerso: [{ id: "r1", nom: "Ma routine", seances: [] }],
  exercicesPerso: [],
  logs: [{ id: "l1", date: "2026-05-01", exercices: [] }],
  metrics: [{ id: "m1", date: "2026-05-01", poidsKg: 80 }],
  foodlog: { "2026-05-01": [{ name: "riz" }] },
  reviews: [],
  reglages: { theme: "dark" },
  mediaCache: { pompes: "url" }, // ne doit PAS être exporté
};

test("construireExport : enveloppe + champs, sans cache volatil", () => {
  const exp = construireExport(etatExemple, "2026-07-19T00:00:00Z");
  assert.equal(exp.app, "coach-perso-ia");
  assert.equal(exp.schema, SCHEMA_VERSION);
  assert.equal(exp.exportedAt, "2026-07-19T00:00:00Z");
  assert.equal(exp.data.profil.prenom, "Mehdi");
  assert.equal(exp.data.logs.length, 1);
  assert.ok(!("mediaCache" in exp.data)); // exclu
  assert.ok(!("sessionEnCours" in exp.data)); // exclu
});

test("validerImport : accepte l'enveloppe et le format brut", () => {
  const exp = construireExport(etatExemple);
  const r1 = validerImport(exp);
  assert.equal(r1.ok, true);
  assert.equal(r1.data.profil.prenom, "Mehdi");
  const r2 = validerImport(exp.data); // format brut
  assert.equal(r2.ok, true);
});

test("validerImport : rejette invalide / mauvaise app / vide", () => {
  assert.equal(validerImport(null).ok, false);
  assert.equal(validerImport("x").ok, false);
  assert.equal(validerImport({ app: "autre-app", data: { logs: [] } }).ok, false);
  assert.equal(validerImport({ logs: "pas un tableau" }).ok, false);
  assert.equal(validerImport({}).ok, false); // rien d'exploitable
});

test("appliquerImport remplacer : écrase tout", () => {
  const actuel = { logs: [{ id: "old" }], profil: { prenom: "Ancien" } };
  const src = construireExport(etatExemple).data;
  const out = appliquerImport(actuel, src, "remplacer");
  assert.equal(out.profil.prenom, "Mehdi");
  assert.equal(out.logs.length, 1);
  assert.equal(out.logs[0].id, "l1");
  assert.equal(out.version, SCHEMA_VERSION);
});

test("appliquerImport fusionner : anti-doublons par id", () => {
  const actuel = {
    profil: { prenom: "Actuel" },
    logs: [{ id: "l1", date: "x" }, { id: "l2", date: "y" }],
    metrics: [{ id: "m1", date: "x", poidsKg: 80 }],
    programmesPerso: [{ id: "r1", nom: "Existante" }],
    reglages: { theme: "auto", sons: false },
  };
  const src = construireExport(etatExemple).data; // logs l1, metrics m1, routine r1
  const out = appliquerImport(actuel, src, "fusionner");
  // l1 déjà présent → pas dupliqué ; l2 conservé
  assert.equal(out.logs.length, 2);
  assert.deepEqual(out.logs.map((l) => l.id).sort(), ["l1", "l2"]);
  // m1 déjà présent → pas dupliqué
  assert.equal(out.metrics.length, 1);
  // routine r1 déjà présente → pas dupliquée (garde l'existante)
  assert.equal(out.programmesPerso.length, 1);
  assert.equal(out.programmesPerso[0].nom, "Existante");
  // profil actuel conservé
  assert.equal(out.profil.prenom, "Actuel");
  // réglages fusionnés
  assert.equal(out.reglages.theme, "dark");
  assert.equal(out.reglages.sons, false);
});

test("appliquerImport fusionner : ajoute les nouveaux éléments", () => {
  const actuel = { logs: [{ id: "l1" }] };
  const src = { logs: [{ id: "l1" }, { id: "l2" }, { id: "l3" }] };
  const out = appliquerImport(actuel, src, "fusionner");
  assert.deepEqual(out.logs.map((l) => l.id).sort(), ["l1", "l2", "l3"]);
});

test("nomFichierBackup : horodaté", () => {
  assert.equal(nomFichierBackup("2026-07-19T12:00:00Z"), "coach-perso-sauvegarde-2026-07-19.json");
});

/* ---- Photos de progression : les fiches ne doivent pas disparaître ---- */

test("export : les FICHES de photos sont incluses (les images, non — elles sont binaires)", () => {
  const photos = [{ id: "ph_2026-03-01_aaa", date: "2026-03-01", pose: "face", poidsKg: 81.2 }];
  const e = construireExport({ logs: [], metrics: [], photos });
  assert.deepEqual(e.data.photos, photos);
  // Quelques centaines d'octets : elles permettent une restauration complète
  // sur le même appareil, où les images sont restées dans IndexedDB.
  assert.ok(JSON.stringify(e.data.photos).length < 4000);
});

test("import « remplacer » : une sauvegarde ANTÉRIEURE aux photos ne les efface pas", () => {
  // Sans cette garde, les fiches disparaîtraient tandis que les images
  // resteraient dans IndexedDB : des orphelines invisibles, et l'historique des
  // prises de vue perdu sans que personne ne l'ait demandé.
  const actuel = { logs: [], metrics: [], photos: [{ id: "ph_1", date: "2026-03-01", pose: "face" }] };
  const ancienne = { profil: { prenom: "Mehdi" }, logs: [], metrics: [] };  // pas de clé `photos`
  const out = appliquerImport(actuel, ancienne, "remplacer");
  assert.equal(out.photos.length, 1, "les fiches existantes survivent");
  assert.equal(out.photos[0].id, "ph_1");
});

test("import « remplacer » : une sauvegarde AVEC photos remplace bien les fiches", () => {
  const actuel = { logs: [], metrics: [], photos: [{ id: "ph_ancien", date: "2026-01-01", pose: "face" }] };
  const src = { logs: [], metrics: [], photos: [{ id: "ph_neuf", date: "2026-06-01", pose: "face" }] };
  const out = appliquerImport(actuel, src, "remplacer");
  assert.deepEqual(out.photos.map((p) => p.id), ["ph_neuf"]);
});

test("import « fusionner » : les fiches des deux côtés sont réunies, sans doublon", () => {
  const actuel = { logs: [], metrics: [], photos: [{ id: "ph_a", date: "2026-01-01", pose: "face" }] };
  const src = { logs: [], metrics: [], photos: [
    { id: "ph_a", date: "2026-01-01", pose: "face" },   // déjà présente
    { id: "ph_b", date: "2026-06-01", pose: "dos" },
  ] };
  const out = appliquerImport(actuel, src, "fusionner");
  assert.deepEqual(out.photos.map((p) => p.id).sort(), ["ph_a", "ph_b"]);
});
