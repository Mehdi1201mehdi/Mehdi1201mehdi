import { test } from "node:test";
import assert from "node:assert/strict";
import { LECTURES, dernieresMesures, resumeActivites, disponibilite, autoriser, lireMesures, lireActivites } from "../src/integrations/santeConnect.js";

test("lectures : six types, aucune écriture possible", () => {
  assert.deepEqual([...LECTURES], ["weight", "height", "bodyFat", "distance", "calories", "workouts"]);
  assert.ok(Object.isFrozen(LECTURES));
});

test("dernieresMesures : garde la plus récente de chaque type, avec date et source", () => {
  const m = dernieresMesures([
    { dataType: "weight", value: 80.24, startDate: "2026-10-01T07:00:00Z", sourceName: "Balance Mi" },
    { dataType: "weight", value: 79.06, startDate: "2026-11-02T07:00:00Z", sourceName: "Balance Mi" },
    { dataType: "height", value: 178, startDate: "2025-01-01T00:00:00Z" },
    { dataType: "bodyFat", value: 17.5, startDate: "2026-11-02T07:00:00Z", sourceName: "Balance Mi" },
  ]);
  assert.deepEqual(m.poidsKg, { v: 79.1, date: "2026-11-02T07:00:00Z", source: "Balance Mi" });
  assert.equal(m.tailleCm.v, 178);
  assert.equal(m.tailleCm.source, "Santé Connect");
  assert.equal(m.masseGrassePct.v, 17.5);
});

test("dernieresMesures : convertit mètres → cm et fraction → %", () => {
  const m = dernieresMesures([
    { dataType: "height", value: 1.82, startDate: "2026-01-01T00:00:00Z" },
    { dataType: "bodyFat", value: 0.184, startDate: "2026-01-01T00:00:00Z" },
  ]);
  assert.equal(m.tailleCm.v, 182);
  assert.equal(m.masseGrassePct.v, 18.4);
});

test("dernieresMesures : écarte les valeurs aberrantes et les types non lus", () => {
  const m = dernieresMesures(/** @type {any[]} */ ([
    { dataType: "weight", value: 8000, startDate: "2026-11-03T00:00:00Z" },
    { dataType: "weight", value: 81, startDate: "2026-11-01T00:00:00Z" },
    { dataType: "bodyFat", value: 95, startDate: "2026-11-01T00:00:00Z" },
    { dataType: "steps", value: 9000, startDate: "2026-11-01T00:00:00Z" },
    { dataType: "weight", value: "abc", startDate: "2026-11-04T00:00:00Z" },
    { dataType: "weight", value: 70 },
  ]));
  assert.equal(m.poidsKg.v, 81);
  assert.equal(m.masseGrassePct, undefined);
  assert.deepEqual(Object.keys(m), ["poidsKg"]);
  assert.deepEqual(dernieresMesures(null), {});
});

test("resumeActivites : libellés français, durée, tri récent d'abord, totaux", () => {
  const r = resumeActivites(/** @type {any[]} */ ([
    { workoutType: "running", startDate: "2026-11-01T08:00:00Z", endDate: "2026-11-01T08:30:00Z", totalDistance: 5012.4, totalEnergyBurned: 310.6, sourceName: "Strava" },
    { workoutType: "traditionalStrengthTraining", startDate: "2026-11-03T18:00:00Z", endDate: "2026-11-03T19:05:00Z" },
    { workoutType: "kitesurf", startDate: "2026-11-02T10:00:00Z", endDate: "2026-11-02T11:00:00Z" },
    { workoutType: "running", startDate: "2026-11-04T08:00:00Z" },
  ]));
  assert.deepEqual(r.liste.map((x) => x.type), ["Musculation", "kitesurf", "Course"]);
  assert.equal(r.liste[2].dureeSec, 1800);
  assert.equal(r.liste[2].distanceM, 5012);
  assert.equal(r.liste[2].kcal, 311);
  assert.equal(r.liste[0].distanceM, null);
  assert.deepEqual(r.total, { seances: 3, dureeSec: 1800 + 3900 + 3600, distanceM: 5012, kcal: 311 });
});

test("hors APK : tout est inerte et rien n'est tenté", async () => {
  assert.deepEqual(await disponibilite(), { ok: false, raison: "web" });
  assert.equal(await autoriser(), null);
  assert.deepEqual(await lireMesures(), {});
  assert.equal((await lireActivites()).total.seances, 0);
});

test("dans l'APK : autorisation en lecture seule, lectures via le plugin", async () => {
  const appels = [];
  /** @type {any} */ (globalThis).window = { Capacitor: { isNativePlatform: () => true, Plugins: { Health: {
    isAvailable: async () => ({ available: true }),
    requestAuthorization: async (o) => { appels.push(o); return { readAuthorized: o.read, readDenied: [], writeAuthorized: [], writeDenied: [] }; },
    readSamples: async ({ dataType }) => ({ samples: dataType === "weight" ? [{ dataType, value: 77.7, startDate: "2026-11-05T06:00:00Z", sourceName: "Withings" }] : [] }),
    queryWorkouts: async () => ({ workouts: [{ workoutType: "walking", startDate: "2026-11-05T12:00:00Z", endDate: "2026-11-05T12:40:00Z", totalDistance: 3200 }] }),
  } } } };
  try {
    assert.deepEqual(await disponibilite(), { ok: true, raison: null });
    await autoriser();
    assert.deepEqual(appels[0].write, []);
    assert.deepEqual(appels[0].read, [...LECTURES]);
    const m = await lireMesures();
    assert.equal(m.poidsKg.v, 77.7);
    assert.equal(m.poidsKg.source, "Withings");
    const a = await lireActivites(7);
    assert.equal(a.liste[0].type, "Marche");
    assert.equal(a.total.distanceM, 3200);
  } finally {
    delete /** @type {any} */ (globalThis).window;
  }
});

test("manifeste Android : 6 lectures de santé gardées, aucune écriture, tout le reste retiré", async () => {
  const fs = await import("node:fs");
  const xml = fs.readFileSync(new URL("../android/app/src/main/AndroidManifest.xml", import.meta.url), "utf8");
  const declarees = [...xml.matchAll(/<uses-permission android:name="android\.permission\.health\.([A-Z_0-9]+)"( tools:node="remove")?/g)];
  const gardees = declarees.filter((m) => !m[2]).map((m) => m[1]).sort();
  assert.deepEqual(gardees, ["READ_ACTIVE_CALORIES_BURNED", "READ_BODY_FAT", "READ_DISTANCE", "READ_EXERCISE", "READ_HEIGHT", "READ_WEIGHT"]);
  // Si le plugin est installé (poste de dev, CI Android), chacune de ses
  // permissions doit être soit gardée ci-dessus, soit explicitement retirée.
  const plugin = new URL("../node_modules/@capgo/capacitor-health/android/src/main/AndroidManifest.xml", import.meta.url);
  if (!fs.existsSync(plugin)) return;
  const retirees = new Set(declarees.filter((m) => m[2]).map((m) => m[1]));
  for (const [, p] of fs.readFileSync(plugin, "utf8").matchAll(/android\.permission\.health\.([A-Z_0-9]+)/g)) {
    assert.ok(gardees.includes(p) || retirees.has(p), `permission du plugin ni gardée ni retirée : ${p}`);
  }
});
