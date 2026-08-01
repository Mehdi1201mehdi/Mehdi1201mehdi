// @ts-check
/**
 * SIGNATURE SONORE — la palette est de la donnée, donc elle se teste.
 *
 * Ces tests ne vérifient pas « que ça joue » (impossible sous Node, et sans
 * intérêt) : ils verrouillent les DÉCISIONS DE CONCEPTION. Un son trop long,
 * trop grave, trop fort ou dissonant est un défaut de design, pas un bug — et
 * c'est exactement le genre de dérive qui s'installe sans qu'on la remarque.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { PALETTE, GAMME, BANDE_HZ, DUREE_MAX_S, dureeSon } from "../src/ui/son.js";

const sons = Object.entries(PALETTE);

test("PALETTE : chaque son est bien formé et dit ce qu'il signifie", () => {
  assert.ok(sons.length >= 5, "la palette doit couvrir les moments clés");
  for (const [nom, s] of sons) {
    assert.ok(s.quoi && s.quoi.length > 8, `${nom} : l'intention doit être écrite`);
    assert.ok(Array.isArray(s.notes) && s.notes.length, `${nom} : aucune note`);
    for (const n of s.notes) {
      assert.ok(Number.isFinite(n.f) && n.f > 0, `${nom} : fréquence invalide`);
      assert.ok(Number.isFinite(n.t) && n.t >= 0, `${nom} : départ invalide`);
      assert.ok(Number.isFinite(n.d) && n.d > 0, `${nom} : durée invalide`);
    }
  }
});

test("PALETTE : tout tient dans la bande qui perce en salle", () => {
  // Sous 380 Hz on est dans les basses de la musique ; au-dessus de 2 600 Hz
  // ça devient strident dans des écouteurs.
  for (const [nom, s] of sons) {
    for (const n of s.notes) {
      assert.ok(n.f >= BANDE_HZ[0] && n.f <= BANDE_HZ[1],
        `${nom} : ${n.f} Hz hors bande ${BANDE_HZ[0]}–${BANDE_HZ[1]}`);
    }
  }
});

test("PALETTE : aucun son ne dure plus d'une demi-seconde", () => {
  for (const [nom, s] of sons) {
    const d = dureeSon(s);
    assert.ok(d > 0 && d <= DUREE_MAX_S, `${nom} : ${d}s (max ${DUREE_MAX_S}s)`);
  }
});

test("PALETTE : le son le plus répété est le plus discret", () => {
  // « valider » se joue une vingtaine de fois par séance. S'il était aussi long
  // ou aussi fort que « reprise », il deviendrait insupportable.
  const v = dureeSon(PALETTE.valider), r = dureeSon(PALETTE.reprise);
  assert.ok(v < r, `valider (${v}s) doit être plus court que reprise (${r}s)`);
  const volMax = (s) => Math.max(...s.notes.map((n) => (n.gain == null ? 1 : n.gain)));
  assert.ok(volMax(PALETTE.valider) < volMax(PALETTE.reprise), "valider doit être plus doux que reprise");
  assert.ok(volMax(PALETTE.annuler) < volMax(PALETTE.valider), "annuler est le plus discret de tous");
});

test("PALETTE : « reprise » est le son le plus audible — c'est sa raison d'être", () => {
  // C'est le seul qui doit passer par-dessus de la musique : sans lui, il faut
  // regarder l'écran pour savoir que le repos est fini.
  const vol = (s) => Math.max(...s.notes.map((n) => (n.gain == null ? 1 : n.gain)));
  const autres = sons.filter(([n]) => n !== "reprise").map(([, s]) => vol(s));
  assert.ok(vol(PALETTE.reprise) >= Math.max(...autres), "reprise doit être au moins aussi fort que tout le reste");
});

test("PALETTE : toutes les notes viennent de la gamme — rien ne peut sonner faux", () => {
  // Deux sons peuvent se chevaucher (valider pendant un décompte). Une gamme
  // pentatonique garantit que le résultat reste consonant quoi qu'il arrive.
  const permises = new Set(Object.values(GAMME));
  for (const [nom, s] of sons) {
    for (const n of s.notes) {
      assert.ok(permises.has(n.f), `${nom} : ${n.f} Hz hors de la gamme`);
    }
  }
});

test("PALETTE : jamais plus de deux notes à la fois — au-delà, ça sature", () => {
  // On compte les notes réellement AUDIBLES AU MÊME INSTANT. Un enchaînement
  // où chaque note déborde un peu sur la suivante est voulu (ça lie le motif) ;
  // trois voix simultanées à ces volumes, c'est de la bouillie.
  for (const [nom, s] of sons) {
    for (const instant of s.notes.map((n) => n.t + 1e-6)) {
      const voix = s.notes.filter((n) => n.t <= instant && n.t + n.d > instant).length;
      assert.ok(voix <= 2, `${nom} : ${voix} voix simultanées à t=${instant.toFixed(3)}s`);
    }
  }
});

test("dureeSon : robuste aux entrées vides ou abîmées", () => {
  assert.equal(dureeSon(/** @type {any} */ (null)), 0);
  assert.equal(dureeSon(/** @type {any} */ ({})), 0);
  assert.equal(dureeSon(/** @type {any} */ ({ notes: [] })), 0);
  // Arrondi à la milliseconde : 0,1 + 0,2 vaut 0,30000000000000004 en virgule
  // flottante, et une durée de son n'a aucun besoin de plus de précision.
  assert.equal(dureeSon(/** @type {any} */ ({ notes: [{ t: 0.1, d: 0.2 }] })), 0.3);
  // la durée est celle de la note qui finit le plus tard, pas de la dernière
  assert.equal(dureeSon(/** @type {any} */ ({ notes: [{ t: 0, d: 0.4 }, { t: 0.1, d: 0.1 }] })), 0.4);
});

test("PALETTE : les moments clés d'une séance sont tous couverts", () => {
  for (const cle of ["valider", "compte", "reprise", "record", "termine"]) {
    assert.ok(PALETTE[cle], `son manquant : ${cle}`);
  }
});
