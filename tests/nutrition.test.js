// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculerBesoins, bmr, ajustementObjectif } from "../src/engine/nutrition.js";
import { parseRecherche, parseProduit, rechercher } from "../src/integrations/openfoodfacts.js";
import { chercherFoods, portion } from "../src/data/foods.js";

const profil = (over = {}) => ({ age: 40, sexe: "H", tailleCm: 180, poidsKg: 85, objectif: "recomposition", joursParSemaine: 3, prefCardio: false, ...over });

test("BMR Mifflin-St Jeor (homme)", () => {
  // 10*85 + 6.25*180 - 5*40 + 5 = 850 + 1125 - 200 + 5 = 1780
  assert.equal(bmr(profil()), 1780);
});

test("besoins : macros cohérentes et déficit appliqué en perte de graisse", () => {
  const b = calculerBesoins(profil({ objectif: "perte_graisse" }));
  assert.ok(b.tdee > b.bmr, "TDEE > BMR");
  assert.ok(b.kcal < b.tdee, "déficit appliqué");
  assert.equal(b.prot, Math.round(b.refKg * 2.2), "2,2 g/kg en sèche");
  // somme des macros proche des kcal cible
  const kcalMacros = b.prot * 4 + b.lip * 9 + b.gluc * 4;
  assert.ok(Math.abs(kcalMacros - b.kcal) <= 20, "cohérence macros/calories");
});

test("prise de muscle → surplus, mobilité → maintenance", () => {
  assert.ok(ajustementObjectif("prise_muscle") > 0);
  assert.equal(ajustementObjectif("mobilite"), 0);
  assert.ok(calculerBesoins(profil({ objectif: "prise_muscle" })).kcal > calculerBesoins(profil({ objectif: "mobilite" })).kcal);
});

test("parseRecherche OFF → aliments avec macros", () => {
  const j = { products: [{ product_name: "Riz basmati", nutriments: { "energy-kcal_100g": 350, proteins_100g: 7, carbohydrates_100g: 78, fat_100g: 0.6 }, nutriscore_grade: "a" }] };
  const r = parseRecherche(j);
  assert.equal(r[0].n, "Riz basmati");
  assert.equal(r[0].kcal, 350);
  assert.match(r[0].note, /Nutri-Score A/);
});

test("parseProduit OFF (code-barres) et statut 0 → null", () => {
  const ok = parseProduit({ status: 1, product: { product_name: "Thon", nutriments: { "energy-kcal_100g": 110, proteins_100g: 25 } } });
  assert.equal(ok.kcal, 110); assert.equal(ok.p, 25);
  assert.equal(parseProduit({ status: 0 }), null);
});

test("hors ligne : rechercher() renvoie [] proprement", async () => {
  const fetchKO = async () => { throw new Error("offline"); };
  assert.deepEqual(await rechercher("riz", { fetchImpl: fetchKO, timeout: 50 }), []);
});

test("base locale : recherche + portion", () => {
  const res = chercherFoods("poulet");
  assert.ok(res.length >= 1 && res[0].src === "local");
  assert.deepEqual(portion({ kcal: 106, p: 22, c: 0, l: 1.8 }, 200), { kcal: 212, p: 44, c: 0, l: 4 });
});
