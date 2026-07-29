// @ts-check
/**
 * CALCULATEURS DE FORCE : les formules doivent être exactes, la fourchette
 * honnête, et rien ne doit jamais rendre NaN à l'écran.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FORMULES, ZONES, REPS_FIABLES_MAX, RATIOS_REFERENCE,
  mediane, estimer1RMComplet, pctPourReps, repsPourCharge, chargePourReps,
  chargesParZone, tableComplete, chargePourRPE, pctPourRPE,
  meilleuresSeries, equilibreForce,
} from "../src/engine/force.js";

test("FORMULES : les sept formules donnent la valeur attendue à 100 kg × 5", () => {
  const v = Object.fromEntries(FORMULES.map((f) => [f.cle, Math.round(f.fn(100, 5) * 10) / 10]));
  assert.equal(v.epley, 116.7);                       // 100 × (1 + 5/30)
  assert.equal(v.brzycki, 112.5);                     // 100 × 36/32
  assert.equal(v.oconner, 112.5);                     // 100 × 1,125
  assert.ok(v.lombardi > 100 && v.lombardi < 125, `Lombardi hors bornes : ${v.lombardi}`);
  assert.ok(v.wathan > 110 && v.wathan < 125, `Wathan hors bornes : ${v.wathan}`);
  assert.ok(v.lander > 110 && v.lander < 120, `Lander hors bornes : ${v.lander}`);
  assert.ok(v.mayhew > 110 && v.mayhew < 125, `Mayhew hors bornes : ${v.mayhew}`);
});

test("mediane : robuste, y compris aux listes vides ou sales", () => {
  assert.equal(mediane([1, 2, 3]), 2);
  assert.equal(mediane([1, 2, 3, 4]), 2.5);
  assert.equal(mediane([3, 1, 2]), 2, "trie avant de médianer");
  assert.equal(mediane([]), 0);
  assert.equal(mediane([NaN, 0, -5, 4, 6]), 5, "ignore ce qui n'est pas exploitable");
  assert.equal(mediane(null), 0);
});

test("estimer1RMComplet : consensus, fourchette et écart", () => {
  const r = estimer1RMComplet(100, 5);
  assert.equal(r.valide, true);
  assert.equal(r.fiable, true);
  assert.equal(r.detail.length, 7, "les sept formules répondent");
  assert.ok(r.consensus >= r.min - 2.5 && r.consensus <= r.max, "le consensus tombe dans la fourchette");
  assert.ok(r.ecartPct > 0 && r.ecartPct < 25, `écart invraisemblable : ${r.ecartPct} %`);
  assert.equal(r.avertissement, null);
});

test("estimer1RMComplet : une série à 1 répétition EST le maximum", () => {
  const r = estimer1RMComplet(140, 1);
  assert.equal(r.consensus, 140);
  assert.equal(r.min, 140);
  assert.equal(r.max, 140);
  assert.equal(r.ecartPct, 0, "aucune formule ne doit intervenir");
});

test("estimer1RMComplet : au-delà de 12 répétitions, l'app le dit", () => {
  const r = estimer1RMComplet(60, 20);
  assert.equal(r.valide, true);
  assert.equal(r.fiable, false);
  assert.match(r.avertissement || "", new RegExp(String(REPS_FIABLES_MAX)));
});

test("estimer1RMComplet : entrées inexploitables → aucun NaN", () => {
  /** @type {[any, any][]} */
  const mauvaises = [[0, 5], [100, 0], [-50, 5], [NaN, 5], [100, NaN], ["", ""]];
  for (const [kg, reps] of mauvaises) {
    const r = estimer1RMComplet(kg, reps);
    assert.equal(r.valide, false, `${kg}×${reps} devrait être rejeté`);
    assert.equal(r.consensus, 0);
    assert.deepEqual(r.detail, []);
  }
});

test("estimer1RMComplet : plus de répétitions = 1RM estimé plus élevé, à charge égale", () => {
  const a = estimer1RMComplet(100, 3).consensus;
  const b = estimer1RMComplet(100, 8).consensus;
  assert.ok(b > a, `8 reps devrait impliquer un 1RM plus haut que 3 : ${a} vs ${b}`);
});

test("pctPourReps : 1 rep = 100 %, décroissance régulière", () => {
  assert.equal(pctPourReps(1), 100);
  assert.equal(pctPourReps(5), 88.9);
  assert.equal(pctPourReps(10), 75);
  assert.ok(pctPourReps(3) > pctPourReps(8), "moins de reps = pourcentage plus élevé");
  assert.equal(pctPourReps(0), 0);
  assert.equal(pctPourReps(40), 0, "hors domaine de la formule");
});

test("chargePourReps / repsPourCharge : réciproques à l'arrondi près", () => {
  const rm = 120;
  const kg = chargePourReps(rm, 8);          // ~80,6 % → 100 kg
  assert.ok(kg > 90 && kg < 105, `charge pour 8 reps : ${kg}`);
  const reps = repsPourCharge(rm, kg);
  assert.ok(Math.abs(reps - 8) <= 1, `aller-retour : 8 → ${kg} kg → ${reps} reps`);
  assert.equal(repsPourCharge(rm, rm), 1, "au 1RM, une seule répétition");
  assert.equal(repsPourCharge(rm, rm + 20), 0, "au-dessus du 1RM, aucune");
  assert.equal(chargePourReps(rm, 0), 0);
});

test("chargesParZone : quatre zones ordonnées, bornes cohérentes", () => {
  const z = chargesParZone(100);
  assert.equal(z.length, ZONES.length);
  for (const x of z) {
    assert.ok(x.kgMin <= x.kgMax, `${x.nom} : ${x.kgMin} > ${x.kgMax}`);
    assert.ok(x.reps[0] <= x.reps[1]);
    assert.ok(x.reposSec > 0);
  }
  // force maximale plus lourde qu'endurance, avec moins de répétitions
  const fmax = z.find((x) => x.cle === "force_max"), endu = z.find((x) => x.cle === "endurance");
  assert.ok(fmax.kgMin > endu.kgMax);
  assert.ok(fmax.reps[1] < endu.reps[0]);
});

test("tableComplete : décroissante en charge, croissante en répétitions", () => {
  const t = tableComplete(100);
  assert.equal(t[0].pct, 100);
  for (let i = 1; i < t.length; i++) {
    assert.ok(t[i].kg <= t[i - 1].kg, `charge non décroissante à ${t[i].pct} %`);
    assert.ok(t[i].reps >= t[i - 1].reps, `répétitions non croissantes à ${t[i].pct} %`);
  }
});

test("RPE : un RPE plus bas donne une charge plus légère", () => {
  const rm = 100;
  const a10 = chargePourRPE(rm, 5, 10);   // 5 reps à l'échec
  const a8 = chargePourRPE(rm, 5, 8);     // 5 reps, 2 en réserve
  const a6 = chargePourRPE(rm, 5, 6);
  assert.ok(a10 > a8 && a8 > a6, `RPE décroissant → charge décroissante : ${a10}/${a8}/${a6}`);
  // 5 reps @ RPE 8 équivaut à une série de 7 à l'échec
  assert.equal(a8, chargePourReps(rm, 7));
  assert.equal(pctPourRPE(5, 8), pctPourReps(7));
});

test("RPE : entrées hors échelle rejetées", () => {
  assert.equal(chargePourRPE(100, 5, 0), 0);
  assert.equal(chargePourRPE(100, 5, 11), 0);
  assert.equal(chargePourRPE(100, 0, 8), 0);
  assert.equal(pctPourRPE(0, 8), 0);
});

test("meilleuresSeries : retient la meilleure série de chaque exercice", () => {
  const getEx = (id) => ({ nom: id === "squat-barre" ? "Squat" : "Développé" });
  const logs = [
    { date: "2026-07-01", exercices: [{ exerciceId: "squat-barre", series: [{ chargeKg: 100, reps: 5 }, { chargeKg: 110, reps: 3 }] }] },
    { date: "2026-07-08", exercices: [{ exerciceId: "squat-barre", series: [{ chargeKg: 90, reps: 8 }] }] },
    { date: "2026-07-09", exercices: [{ exerciceId: "developpe-couche-barre", series: [{ chargeKg: 80, reps: 5 }] }] },
  ];
  const m = meilleuresSeries(logs, getEx);
  assert.equal(m.length, 2);
  assert.equal(m[0].exerciceId, "squat-barre", "trié par 1RM décroissant");
  assert.ok(m[0].rm > m[1].rm);
  // la meilleure série du squat est celle qui implique le 1RM le plus haut
  assert.ok(m[0].rm >= estimer1RMComplet(110, 3).consensus - 0.01);
});

test("meilleuresSeries : ignore les séries sans charge ou sans répétitions", () => {
  const logs = [{ date: "2026-07-01", exercices: [{ exerciceId: "pompes", series: [
    { chargeKg: null, reps: 20 }, { chargeKg: 0, reps: 0 }, { chargeKg: 50, reps: null },
  ] }] }];
  assert.deepEqual(meilleuresSeries(logs, () => null), []);
  assert.deepEqual(meilleuresSeries([], () => null), []);
  assert.deepEqual(meilleuresSeries(null, () => null), []);
});

test("equilibreForce : compare ce qui est comparable, et rien d'autre", () => {
  const m = [
    { exerciceId: "squat-barre", rm: 140 },
    { exerciceId: "developpe-couche-barre", rm: 105 },   // 0,75 → équilibré
  ];
  const r = equilibreForce(m);
  assert.equal(r.length, 1, "un seul ratio calculable");
  assert.equal(r[0].verdict, "équilibré");
  assert.equal(r[0].ratio, 0.75);
  // un mouvement en retard est signalé comme tel
  const r2 = equilibreForce([{ exerciceId: "squat-barre", rm: 200 }, { exerciceId: "developpe-couche-barre", rm: 100 }]);
  assert.equal(r2[0].verdict, "en retard");
  // aucun ratio calculable → liste vide, pas d'invention
  assert.deepEqual(equilibreForce([{ exerciceId: "curl-halteres", rm: 30 }]), []);
  assert.deepEqual(equilibreForce([]), []);
  assert.deepEqual(equilibreForce(null), []);
});

test("RATIOS_REFERENCE : bien formés", () => {
  for (const r of RATIOS_REFERENCE) {
    assert.ok(r.a && r.b && r.nom, "identifiants et nom requis");
    assert.ok(r.cible > 0 && r.tolerance > 0);
  }
});

test("RATIOS_REFERENCE : les exercices référencés existent VRAIMENT au catalogue", async () => {
  // Un identifiant erroné ne lèverait aucune erreur : le ratio disparaîtrait
  // simplement de l'écran, sans que personne ne le remarque.
  const { getExercise } = await import("../src/data/exercises.js");
  for (const r of RATIOS_REFERENCE) {
    assert.ok(getExercise(r.a), `exercice inconnu au catalogue : ${r.a}`);
    assert.ok(getExercise(r.b), `exercice inconnu au catalogue : ${r.b}`);
  }
});
