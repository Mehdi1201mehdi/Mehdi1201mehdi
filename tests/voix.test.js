// @ts-check
/**
 * VOIX DU COACH — ce qui est testé ici, c'est le TEXTE, pas la synthèse.
 *
 * La synthèse vocale appartient au système : on ne peut ni la vérifier ni la
 * reproduire. Ce qu'on contrôle, en revanche, c'est chaque phrase prononcée —
 * et c'est là que vivent les vrais défauts : un nom d'exercice qui se fait lire
 * « parenthèse barre », un décompte qui bavarde dix secondes d'affilée, une
 * dernière série annoncée « série 4 sur 4 » au lieu de « dernière série ».
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  VOIX_DEFAUT, JALONS_REPOS, voixDisponible, choisirVoix, nomParle,
  phraseSerie, phraseRepos, phraseDecompte, phraseReprise, phraseFin,
  dire, couperVoix, reinitialiserVoix,
} from "../src/ui/voix.js";

/* ======================= DISPONIBILITÉ ======================= */

test("la voix est ÉTEINTE par défaut", () => {
  // Une application qui se met à parler toute seule au milieu d'une salle de
  // sport est un problème, pas une fonctionnalité.
  assert.equal(VOIX_DEFAUT, false);
});

test("voixDisponible : exige speak ET le constructeur d'énoncé", () => {
  assert.equal(voixDisponible({}), false);
  assert.equal(voixDisponible({ speechSynthesis: {} }), false);
  // Un `speechSynthesis` sans `SpeechSynthesisUtterance` lèverait à l'appel.
  assert.equal(voixDisponible({ speechSynthesis: { speak() {} } }), false);
  assert.equal(voixDisponible({ speechSynthesis: { speak() {} }, SpeechSynthesisUtterance: function () {} }), true);
});

/* ======================= CHOIX DE LA VOIX ======================= */

test("choisirVoix : fr-FR d'abord, et LOCALE avant réseau", () => {
  // Une voix réseau se tait en mode avion — précisément le moment où l'app doit
  // continuer de fonctionner.
  const v = choisirVoix([
    { lang: "en-US", localService: true, name: "Samantha" },
    { lang: "fr-FR", localService: false, name: "Amélie réseau" },
    { lang: "fr-FR", localService: true, name: "Amélie locale" },
    { lang: "fr-CA", localService: true, name: "Chantal" },
  ]);
  assert.equal(v.name, "Amélie locale");
});

test("choisirVoix : fr-CA vaut mieux que rien, l'anglais ne vaut rien", () => {
  assert.equal(choisirVoix([{ lang: "fr_CA", localService: true, name: "Chantal" }]).name, "Chantal");
  assert.equal(choisirVoix([{ lang: "en-GB", localService: true, name: "Daniel" }]), null);
  assert.equal(choisirVoix([]), null);
  assert.equal(choisirVoix(/** @type {any} */ (null)), null);
  assert.equal(choisirVoix(/** @type {any} */ ([null, { name: "sans langue" }])), null);
});

/* ======================= NOMS ======================= */

test("nomParle : les parenthèses disparaissent", () => {
  // Sans ça, certaines synthèses lisent « parenthèse barre ».
  assert.equal(nomParle("Développé couché (barre)"), "Développé couché");
  assert.equal(nomParle("Curl biceps (haltères)"), "Curl biceps");
});

test("nomParle : coupe à quatre mots — l'annonce entière doit tenir en huit", () => {
  assert.equal(nomParle("Rowing barre buste penché prise large supination"), "Rowing barre buste penché");
  assert.equal(nomParle("Soulevé-de-terre roumain"), "Soulevé de terre roumain");
  assert.equal(nomParle(""), "");
  assert.equal(nomParle(/** @type {any} */ (null)), "");
});

/* ======================= SÉRIES ======================= */

test("phraseSerie : la DERNIÈRE série est nommée, pas numérotée", () => {
  // C'est le seul moment où l'on décide de tout donner ; « série 4 sur 4 » ne le
  // dit pas.
  assert.equal(phraseSerie("Squat", 3, 4), "Dernière série.");
  assert.equal(phraseSerie("Squat", 1, 4), "Série 2 sur 4.");
  assert.equal(phraseSerie("Squat", 0, 1), "Série unique.");
});

test("phraseSerie : le nom n'est dit QU'au changement d'exercice", () => {
  // Le répéter à chaque série est exactement le bavardage qu'on veut éviter.
  assert.equal(phraseSerie("Développé couché (barre)", 0, 3, true), "Développé couché. Série 1 sur 3.");
  assert.equal(phraseSerie("Développé couché (barre)", 1, 3, false), "Série 2 sur 3.");
});

test("phraseSerie : huit mots au maximum, toujours", () => {
  /** @type {[number, number, boolean][]} */
  const cas = [[0, 3, true], [2, 3, false], [4, 5, true], [0, 1, true]];
  for (const [i, t, neuf] of cas) {
    const p = phraseSerie("Rowing barre buste penché prise large", i, t, neuf);
    assert.ok(p.split(/\s+/).length <= 8, `trop long : « ${p} »`);
  }
});

test("phraseSerie : des entrées absurdes ne produisent jamais de NaN", () => {
  for (const p of [phraseSerie("X", NaN, NaN), phraseSerie("X", -3, 0), phraseSerie("X", 9, 2)]) {
    assert.ok(!/NaN|undefined/.test(p), p);
  }
});

/* ======================= REPOS ======================= */

test("phraseRepos : les durées rondes se disent en minutes", () => {
  // « une minute trente » s'entend mieux que « quatre-vingt-dix secondes ».
  assert.equal(phraseRepos(90), "Repos, une minute trente.");
  assert.equal(phraseRepos(60), "Repos, une minute.");
  assert.equal(phraseRepos(120), "Repos, 2 minutes.");
  assert.equal(phraseRepos(45), "Repos, 45 secondes.");
  assert.equal(phraseRepos(0), "Repos.");
  assert.ok(!/NaN/.test(phraseRepos(/** @type {any} */ ("x"))));
});

test("phraseDecompte : se tait sauf aux quatre jalons", () => {
  // Décompter dix secondes d'affilée transformerait la voix en nuisance.
  assert.deepEqual(JALONS_REPOS, [10, 3, 2, 1]);
  for (const s of [60, 30, 15, 11, 9, 5, 4, 0]) {
    assert.equal(phraseDecompte(s), "", `${s} s ne doit rien dire`);
  }
  assert.equal(phraseDecompte(10), "Dix secondes.");
  assert.equal(phraseDecompte(3), "3");
  assert.equal(phraseDecompte(1), "1");
});

test("phraseReprise : le signal de reprise est court", () => {
  assert.ok(phraseReprise().split(/\s+/).length <= 3);
});

/* ======================= FIN ======================= */

test("phraseFin : annonce le volume, en tonnes dès qu'il y en a une", () => {
  assert.equal(phraseFin(12400), "Séance terminée. 12,4 tonnes soulevés.");
  assert.equal(phraseFin(640), "Séance terminée. 640 kilos soulevés.");
  assert.equal(phraseFin(0), "Séance terminée.");
  assert.equal(phraseFin(/** @type {any} */ (null)), "Séance terminée.");
});

/* ======================= MOTEUR ======================= */

test("dire : une synthèse absente ne fait pas tomber la séance", () => {
  assert.equal(dire("Test", { portee: {} }), false);
  assert.equal(dire("", { portee: faussePortee().portee }), false);
});

test("dire : une synthèse qui LÈVE ne fait pas tomber la séance non plus", () => {
  const portee = {
    speechSynthesis: { speak() { throw new Error("boum"); }, cancel() {}, getVoices: () => [] },
    SpeechSynthesisUtterance: function () {},
  };
  assert.equal(dire("Test", { portee }), false);
});

test("dire : prononce en français, au bon débit, et peut interrompre", () => {
  reinitialiserVoix();
  const { portee, dits, annulations } = faussePortee([{ lang: "fr-FR", localService: true, name: "Amélie" }]);
  assert.equal(dire("Dernière série.", { portee }), true);
  assert.equal(dits.length, 1);
  assert.equal(dits[0].text, "Dernière série.");
  assert.equal(dits[0].lang, "fr-FR");
  assert.ok(dits[0].rate > 1, "un débit de 1 est trop lent pour trois mots");
  assert.equal(dits[0].voice.name, "Amélie");
  assert.equal(annulations.n, 0);
  // Le décompte interrompt : « 2 » doit effacer « 3 », pas s'empiler derrière.
  dire("2", { portee, interrompre: true });
  assert.equal(annulations.n, 1);
  reinitialiserVoix();
});

test("couperVoix : annule, et ne lève pas sans synthèse", () => {
  const { portee, annulations } = faussePortee();
  couperVoix(/** @type {any} */ (portee));
  assert.equal(annulations.n, 1);
  couperVoix(/** @type {any} */ ({}));   // ne doit pas lever
});

/** Portée de test : enregistre ce qui est prononcé et ce qui est annulé. */
function faussePortee(voix = []) {
  const dits = []; const annulations = { n: 0 };
  function Utterance(text) { this.text = text; }
  const portee = {
    speechSynthesis: {
      speak(u) { dits.push(u); },
      cancel() { annulations.n++; },
      getVoices: () => voix,
    },
    SpeechSynthesisUtterance: Utterance,
  };
  return { portee, dits, annulations };
}
