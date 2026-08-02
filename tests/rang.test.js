// @ts-check
/**
 * RANG DE FORCE — un verdict sur le niveau de quelqu'un doit être juste, et
 * surtout ne jamais tomber sans qu'on l'ait mérité. Ces tests verrouillent les
 * seuils, la moyenne, et les cas où l'app doit se TAIRE plutôt que juger.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { NIVEAUX, STANDARDS, rangForce, niveauPourRatio } from "../src/engine/rang.js";

const profil = (poidsKg = 80, sexe = "H") => ({ poidsKg, sexe });
const best = (exerciceId, rm) => ({ exerciceId, rm });

/* ============================ STRUCTURE ============================ */

test("STANDARDS : seuils croissants, et les femmes ne sont pas jugées sur la grille des hommes", () => {
  for (const [id, s] of Object.entries(STANDARDS)) {
    for (const col of ["H", "F"]) {
      assert.equal(s[col].length, 4, `${id}/${col} : quatre seuils attendus`);
      for (let i = 1; i < 4; i++) {
        assert.ok(s[col][i] > s[col][i - 1], `${id}/${col} : seuil ${i + 1} pas plus haut`);
      }
    }
    // Les standards féminins sont plus bas à tous les niveaux : une grille
    // unique classerait mécaniquement toutes les femmes en débutant.
    for (let i = 0; i < 4; i++) {
      assert.ok(s.F[i] < s.H[i], `${id} : seuil ${i + 1} identique ou supérieur pour F`);
    }
  }
});

test("STANDARDS : les identifiants existent VRAIMENT au catalogue", async () => {
  // Un identifiant erroné ne lèverait aucune erreur : le mouvement
  // disparaîtrait simplement du rang, sans que personne ne le remarque.
  const { getExercise } = await import("../src/data/exercises.js");
  for (const id of Object.keys(STANDARDS)) {
    assert.ok(getExercise(id), `exercice inconnu au catalogue : ${id}`);
  }
});

/* ============================ NIVEAUX ============================ */

test("niveauPourRatio : débutant sous le premier seuil, élite au-dessus du dernier", () => {
  const s = [1.0, 1.5, 2.0, 2.5];
  assert.equal(niveauPourRatio(0.5, s).rang, 1);
  assert.equal(niveauPourRatio(0.5, s).nom, "Débutant");
  assert.equal(niveauPourRatio(3.0, s).rang, 5);
  assert.equal(niveauPourRatio(3.0, s).nom, "Élite");
  assert.equal(niveauPourRatio(3.0, s).prochain, null, "au sommet, plus rien à viser");
});

test("niveauPourRatio : un niveau se prend EXACTEMENT à son seuil", () => {
  const s = [1.0, 1.5, 2.0, 2.5];
  assert.equal(niveauPourRatio(0.999, s).rang, 1, "juste en dessous : pas encore");
  assert.equal(niveauPourRatio(1.0, s).rang, 2, "au seuil : acquis");
  assert.equal(niveauPourRatio(1.0, s).nom, "Novice");
});

test("niveauPourRatio : le niveau suivant est toujours chiffré", () => {
  const n = niveauPourRatio(1.2, [1.0, 1.5, 2.0, 2.5]);
  assert.equal(n.nom, "Novice");
  assert.ok(n.prochain, "un verdict sans chemin ne sert à rien");
  assert.equal(n.prochain.nom, "Intermédiaire");
  assert.equal(n.prochain.ratio, 1.5);
  // (1,2 − 1,0) / (1,5 − 1,0) = 0,4
  assert.ok(Math.abs(n.progression - 0.4) < 1e-9, `progression = ${n.progression}`);
});

test("niveauPourRatio : entrées absurdes → débutant, jamais d'erreur ni de NaN", () => {
  for (const r of [0, -3, NaN, /** @type {any} */ ("beaucoup"), null]) {
    const n = niveauPourRatio(r, [1, 1.5, 2, 2.5]);
    assert.equal(n.rang, 1);
    assert.ok(Number.isFinite(n.progression));
  }
  assert.equal(niveauPourRatio(2, /** @type {any} */ (null)).rang, 1, "seuils manquants");
  assert.equal(niveauPourRatio(2, [1, 2]).rang, 1, "seuils incomplets");
});

/* ============================ RANG GLOBAL ============================ */

test("rangForce : sans poids de corps, l'app se TAIT et dit pourquoi", () => {
  const r = rangForce([best("squat-barre", 140)], { sexe: "H" });
  assert.equal(r.mesurable, false);
  assert.equal(r.rang, 0);
  assert.match(r.raison || "", /poids de corps/i);
  assert.deepEqual(r.mouvements, []);
});

test("rangForce : poids de corps aberrant refusé", () => {
  for (const p of [0, -70, 5, 500, NaN]) {
    assert.equal(rangForce([best("squat-barre", 140)], { poidsKg: p }).mesurable, false, `poids ${p}`);
  }
});

test("rangForce : sans mouvement de base mesuré, aucun verdict", () => {
  // Curl et gainage ne figurent pas aux standards : rien à juger.
  const r = rangForce([best("curl-halteres", 40), best("gainage", 0)], profil());
  assert.equal(r.mesurable, false);
  assert.match(r.raison || "", /squat|développé|soulevé/i);
});

test("rangForce : on ne juge QUE ce qui a été mesuré", () => {
  const r = rangForce([best("squat-barre", 160), best("curl-halteres", 40)], profil(80));
  assert.equal(r.mouvements.length, 1, "le curl n'a pas de standard : il est ignoré, pas noté zéro");
  assert.equal(r.mouvements[0].exerciceId, "squat-barre");
});

test("rangForce : ratios et niveaux justes pour un homme de 80 kg", () => {
  // Squat 160 kg = 2,0 × PC → seuil « avancé » atteint (rang 4).
  const r = rangForce([best("squat-barre", 160)], profil(80, "H"));
  const m = r.mouvements[0];
  assert.equal(m.ratio, 2);
  assert.equal(m.rang, 4);
  assert.equal(m.niveau, "Avancé");
  assert.equal(m.prochain.nom, "Élite");
  assert.equal(m.prochain.kg, 200, "2,5 × 80 kg");
  assert.equal(m.prochain.manque, 40);
});

test("rangForce : la même charge ne donne pas le même rang selon le poids de corps", () => {
  const leger = rangForce([best("squat-barre", 120)], profil(60)).mouvements[0];
  const lourd = rangForce([best("squat-barre", 120)], profil(110)).mouvements[0];
  assert.ok(leger.rang > lourd.rang, `${leger.rang} devrait dépasser ${lourd.rang}`);
});

test("rangForce : le rang global est une MOYENNE, pas le pire mouvement", () => {
  // Squat excellent (2,0 × PC → rang 4), développé faible (0,5 × PC → rang 1).
  const r = rangForce([best("squat-barre", 160), best("developpe-couche-barre", 40)], profil(80));
  const rangs = r.mouvements.map((m) => m.rang).sort();
  assert.deepEqual(rangs, [1, 4]);
  assert.equal(r.rang, 3, "la moyenne de 1 et 4 arrondie donne 3, pas 1");
  assert.ok(r.rang > Math.min(...rangs), "un point faible ne doit pas effacer le reste");
});

test("rangForce : « manque » n'est jamais négatif", () => {
  for (const kg of [40, 100, 160, 220, 400]) {
    const r = rangForce([best("squat-barre", kg)], profil(80));
    const m = r.mouvements[0];
    if (m.prochain) assert.ok(m.prochain.manque >= 0, `${kg} kg → manque ${m.prochain.manque}`);
  }
});

test("rangForce : entrées vides ou abîmées → aucun verdict, aucune erreur", () => {
  for (const l of [[], null, undefined, [{}], [{ exerciceId: "squat-barre" }]]) {
    const r = rangForce(/** @type {any} */ (l), profil());
    assert.equal(r.mesurable, false);
    assert.ok(r.raison, "l'app doit dire pourquoi elle ne se prononce pas");
  }
});

test("NIVEAUX : cinq niveaux nommés et expliqués", () => {
  assert.equal(NIVEAUX.length, 5);
  for (const n of NIVEAUX) {
    assert.ok(n.cle && n.nom && n.quoi.length > 10, `${n.cle} : description manquante`);
  }
  const noms = NIVEAUX.map((n) => n.nom);
  assert.equal(new Set(noms).size, noms.length, "deux niveaux ne peuvent pas porter le même nom");
});
