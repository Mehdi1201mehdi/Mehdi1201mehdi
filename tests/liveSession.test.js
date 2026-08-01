// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nouvelleSession, nouvelleSerie, ajouterSerie, retirerDerniereSerie,
  serialiser, restaurer, estReprenable, dureeSecondes, reconcilier,
  cyclerType, rirDepuisRpe, rpeDepuisRir, reposApresSerie,
  exercicesDuSuperset, groupeSupersetLibre, GROUPES_SUPERSET,
  valeurSerie, completerSerie, estEnCours,
} from "../src/engine/liveSession.js";

const seanceExemple = {
  id: "s1",
  exercices: [
    { exerciceId: "pompes", series: [{ type: "travail" }, { type: "travail" }, { type: "travail" }] },
    { exerciceId: "gainage", series: [{ type: "travail", dureeSec: 40 }] },
  ],
};

test("nouvelleSession : crée une entrée par exercice avec le bon nb de séries", () => {
  const live = nouvelleSession(seanceExemple, "2026-07-17T08:00:00Z");
  assert.equal(live.seanceId, "s1");
  assert.equal(live.fini, false);
  assert.equal(live.debut, "2026-07-17T08:00:00Z");
  assert.equal(live.data.pompes.series.length, 3);
  assert.equal(live.data.gainage.series.length, 1);
  // exercice en temps → série avec dureeSec
  assert.equal(live.data.gainage.series[0].dureeSec, 40);
  assert.equal(live.data.pompes.series[0].dureeSec, null);
});

test("nouvelleSerie : vierge, reps par défaut", () => {
  assert.deepEqual(nouvelleSerie(), { charge: "", reps: "", rir: "", dureeSec: null, done: false, type: "normale" });
  assert.equal(nouvelleSerie(30).dureeSec, 30);
});

test("ajouterSerie : copie format temps et charge de la dernière", () => {
  const st = { series: [{ charge: 40, reps: 8, rir: 2, dureeSec: null, done: true }] };
  ajouterSerie(st);
  assert.equal(st.series.length, 2);
  assert.equal(st.series[1].charge, 40); // charge reprise
  assert.equal(st.series[1].reps, "");   // reps vierges
  assert.equal(st.series[1].done, false);
  // exercice en temps
  const stT = { series: [{ charge: "", reps: "", rir: "", dureeSec: 45, done: true }] };
  ajouterSerie(stT);
  assert.equal(stT.series[1].dureeSec, 45);
});

test("retirerDerniereSerie : garde au moins une série", () => {
  const st = { series: [nouvelleSerie(), nouvelleSerie()] };
  retirerDerniereSerie(st);
  assert.equal(st.series.length, 1);
  retirerDerniereSerie(st);
  assert.equal(st.series.length, 1); // ne descend pas sous 1
});

test("serialiser/restaurer : aller-retour fidèle", () => {
  const live = nouvelleSession(seanceExemple);
  live.data.pompes.series[0].charge = 30;
  live.data.pompes.series[0].reps = 12;
  live.data.pompes.series[0].done = true;
  const rond = restaurer(serialiser(live));
  assert.equal(rond.data.pompes.series[0].charge, 30);
  assert.equal(rond.data.pompes.series[0].reps, 12);
  assert.equal(rond.data.pompes.series[0].done, true);
});

test("restaurer : objets invalides → null", () => {
  assert.equal(restaurer(null), null);
  assert.equal(restaurer({}), null);
  assert.equal(restaurer({ seanceId: "x" }), null);
  assert.equal(restaurer({ seanceId: "x", data: { e: { series: "pas un tableau" } } }), null);
});

test("estReprenable : vrai seulement si séance connue + saisie présente", () => {
  const trouver = (id) => (id === "s1" ? { id: "s1", exercices: [] } : null);
  const introuvable = () => null;
  const vide = nouvelleSession(seanceExemple);
  assert.equal(estReprenable(serialiser(vide), trouver), false); // rien saisi
  const commence = nouvelleSession(seanceExemple);
  commence.data.pompes.series[0].done = true;
  assert.equal(estReprenable(serialiser(commence), trouver), true);
  // séance inconnue (résolveur renvoie null)
  assert.equal(estReprenable(serialiser(commence), introuvable), false);
  // séance finie
  const finie = nouvelleSession(seanceExemple); finie.fini = true;
  finie.data.pompes.series[0].done = true;
  assert.equal(estReprenable(serialiser(finie), trouver), false);
});

test("dureeSecondes : différence en secondes, robustesse", () => {
  assert.equal(dureeSecondes("2026-07-17T08:00:00Z", "2026-07-17T08:45:30Z"), 2730);
  assert.equal(dureeSecondes("2026-07-17T08:00:00Z", "2026-07-17T07:00:00Z"), null); // fin < début
  assert.equal(dureeSecondes("pas une date", "2026-07-17T08:00:00Z"), null);
});

test("reconcilier : complète l'état live si la séance a changé pendant la séance", () => {
  const seance = { id: "s1", exercices: [
    { exerciceId: "squat-barre", series: [{ type: "travail", repsCible: [8, 12], reposSec: 90 }] },
    { exerciceId: "pompes", series: [{ type: "travail", repsCible: [10, 20], reposSec: 60 }] },
    { exerciceId: "gainage-frontal", series: [{ type: "travail", dureeSec: 40, reposSec: 45 }] },
  ] };
  // état sauvegardé AVANT que « pompes » et « gainage » soient ajoutés
  const live = { seanceId: "s1", debut: "2026-07-20T10:00:00Z", fini: false, data: {
    "squat-barre": { exId: "squat-barre", douleur: false, series: [{ charge: "80", reps: "10", rir: "", dureeSec: null, done: true }] },
  } };
  reconcilier(live, seance);
  // les trois exercices ont désormais un état
  assert.deepEqual(Object.keys(live.data).sort(), ["gainage-frontal", "pompes", "squat-barre"]);
  // la saisie existante est intacte
  assert.equal(live.data["squat-barre"].series[0].charge, "80");
  assert.equal(live.data["squat-barre"].series[0].done, true);
  // l'exercice chronométré reçoit bien une durée, pas des répétitions
  assert.equal(live.data["gainage-frontal"].series[0].dureeSec, 40);
  assert.equal(live.data["pompes"].series[0].dureeSec, null);
  // idempotent : un second appel ne change rien
  const avant = JSON.stringify(live);
  reconcilier(live, seance);
  assert.equal(JSON.stringify(live), avant);
  // robustesse : entrées invalides
  assert.equal(reconcilier(null, seance), null);
  assert.doesNotThrow(() => reconcilier(live, null));
});

/* ================== OPTIONS AVANCÉES : types de séries & supersets ================== */

test("cyclerType : normale → drop → rest-pause → normale, valeur inconnue ramenée à normale", () => {
  assert.equal(cyclerType("normale"), "drop");
  assert.equal(cyclerType("drop"), "rest_pause");
  assert.equal(cyclerType("rest_pause"), "normale");
  assert.equal(cyclerType(undefined), "drop");   // undefined ≡ normale
  assert.equal(cyclerType("n'importe quoi"), "drop");
});

test("rirDepuisRpe / rpeDepuisRir : conversion réciproque, jamais de NaN", () => {
  assert.equal(rirDepuisRpe(8), 2);
  assert.equal(rirDepuisRpe("9,5"), 0.5);   // virgule décimale française
  assert.equal(rpeDepuisRir(2), 8);
  assert.equal(rirDepuisRpe(""), null);
  assert.equal(rirDepuisRpe("abc"), null);
  assert.equal(rirDepuisRpe(null), null);
  // bornes : une saisie aberrante ne doit pas produire de valeur hors échelle
  assert.equal(rirDepuisRpe(-5), 10);
  assert.equal(rirDepuisRpe(42), 0);
});

test("reposApresSerie : drop set et rest-pause imposent leur pause courte", () => {
  assert.deepEqual(reposApresSerie({ type: "drop", reposSec: 180 }),
    { sec: 15, enchainer: false, raison: "Drop set" });
  assert.deepEqual(reposApresSerie({ type: "rest_pause", reposSec: 180 }),
    { sec: 20, enchainer: false, raison: "Rest-pause" });
});

test("reposApresSerie : série normale → repos prescrit, secours à 60 s", () => {
  assert.equal(reposApresSerie({ type: "normale", reposSec: 120 }).sec, 120);
  assert.equal(reposApresSerie({}).sec, 60);
  assert.equal(reposApresSerie({ reposSec: 0 }).sec, 60);
  assert.equal(reposApresSerie({ reposSec: -5 }).sec, 60);
});

test("reposApresSerie : dans un superset on enchaîne, le repos vient après le dernier", () => {
  const enchaine = reposApresSerie({ type: "normale", reposSec: 90, suivantSuperset: "curl" });
  assert.equal(enchaine.enchainer, true);
  assert.equal(enchaine.sec, 0);
  // dernier de la boucle : plus de partenaire → repos normal
  assert.equal(reposApresSerie({ type: "normale", reposSec: 90, suivantSuperset: null }).sec, 90);
  // un drop set reste prioritaire, même dans un superset
  assert.equal(reposApresSerie({ type: "drop", reposSec: 90, suivantSuperset: "curl" }).enchainer, false);
});

test("exercicesDuSuperset : rend les membres dans l'ordre de la séance", () => {
  const live = { data: {
    a: { supersetGroupe: "A" }, b: { supersetGroupe: null },
    c: { supersetGroupe: "A" }, d: { supersetGroupe: "B" },
  } };
  assert.deepEqual(exercicesDuSuperset(live, ["a", "b", "c", "d"], "A"), ["a", "c"]);
  assert.deepEqual(exercicesDuSuperset(live, ["c", "a"], "A"), ["c", "a"]); // suit l'ordre donné
  assert.deepEqual(exercicesDuSuperset(live, ["a", "b"], null), []);
  assert.deepEqual(exercicesDuSuperset(null, ["a"], "A"), []);
});

test("groupeSupersetLibre : premier identifiant disponible, null quand tout est pris", () => {
  assert.equal(groupeSupersetLibre({ data: {} }), "A");
  assert.equal(groupeSupersetLibre({ data: { x: { supersetGroupe: "A" } } }), "B");
  const plein = { data: Object.fromEntries(GROUPES_SUPERSET.map((g, i) => [`e${i}`, { supersetGroupe: g }])) };
  assert.equal(groupeSupersetLibre(plein), null);
});

test("restaurer : conserve type de série, superset et colonne d'effort", () => {
  const live = nouvelleSession(seanceExemple);
  live.data.pompes.series[0].type = "drop";
  live.data.pompes.supersetGroupe = "A";
  live.data.pompes.showRir = true;
  live.data.pompes.series[0].charge = 40;
  const rt = restaurer(serialiser(live));
  assert.equal(rt.data.pompes.series[0].type, "drop");
  assert.equal(rt.data.pompes.supersetGroupe, "A");
  assert.equal(rt.data.pompes.showRir, true);
  // showRir non renseigné = null (suit le mode), pas false
  assert.equal(rt.data.gainage.showRir, null);
});

test("restaurer : un type ou un groupe corrompu est ramené à une valeur sûre", () => {
  const brut = { seanceId: "s1", debut: "2026-07-17T08:00:00Z", data: {
    pompes: { exId: "pompes", supersetGroupe: "ZZZ", series: [{ charge: 10, type: "explosif" }] },
  } };
  const rt = restaurer(brut);
  assert.equal(rt.data.pompes.series[0].type, "normale");
  assert.equal(rt.data.pompes.supersetGroupe, null);
});

/* ============ CE QUI EST AFFICHÉ EST CE QUI EST ENREGISTRÉ ============ */

test("valeurSerie : la saisie prime sur tout le reste", () => {
  const series = [{ charge: "85", reps: "9" }];
  assert.equal(valeurSerie(series, 0, "charge", 80, 75), 85);
  assert.equal(valeurSerie(series, 0, "reps", 8, 10), 9);
  assert.equal(valeurSerie([{ charge: "82,5" }], 0, "charge", 80, 75), 82.5, "virgule décimale");
});

test("valeurSerie : à défaut, la dernière série remplie de CETTE séance", () => {
  // On répète presque toujours la même charge d'une série à l'autre.
  const series = [{ charge: "85", reps: "9" }, { charge: "", reps: "" }, { charge: "", reps: "" }];
  assert.equal(valeurSerie(series, 1, "charge", 80, 75), 85);
  assert.equal(valeurSerie(series, 2, "charge", 80, 75), 85, "remonte au-delà d'une série vide");
  assert.equal(valeurSerie(series, 2, "reps", 8, 10), 9);
});

test("valeurSerie : puis la séance précédente, puis le conseil, puis null", () => {
  const vide = [{ charge: "", reps: "" }];
  assert.equal(valeurSerie(vide, 0, "charge", 80, 75), 80, "séance précédente");
  assert.equal(valeurSerie(vide, 0, "charge", null, 75), 75, "conseil");
  assert.equal(valeurSerie(vide, 0, "charge", null, null), null, "rien d'exploitable");
  assert.equal(valeurSerie(vide, 0, "charge", "pas un nombre", null), null);
  assert.equal(valeurSerie(null, 0, "charge", null, 60), 60);
});

test("completerSerie : valider sans rien saisir enregistre ce qui était affiché", () => {
  // LE bug : l'écran montrait « 80 » et « 8 », on validait, et l'historique
  // recevait null — série comptée comme faite mais vide.
  const series = [nouvelleSerie()];
  const pose = completerSerie(series, 0, { chargePrecedente: 80, repsPrecedentes: 8 });
  assert.deepEqual(pose, { charge: 80, reps: 8 });
  assert.equal(series[0].charge, "80");
  assert.equal(series[0].reps, "8");
});

test("completerSerie : ne touche jamais à une saisie existante", () => {
  const series = [{ charge: "100", reps: "5", dureeSec: null }];
  completerSerie(series, 0, { chargePrecedente: 80, repsPrecedentes: 8 });
  assert.equal(series[0].charge, "100");
  assert.equal(series[0].reps, "5");
});

test("completerSerie : n'invente rien quand rien n'est déductible", () => {
  const series = [nouvelleSerie()];
  const pose = completerSerie(series, 0, {});
  assert.deepEqual(pose, { charge: null, reps: null });
  assert.equal(series[0].charge, "");
  assert.equal(series[0].reps, "");
});

test("completerSerie : un exercice chronométré ne reçoit pas de répétitions", () => {
  const series = [nouvelleSerie(45)];
  completerSerie(series, 0, { chargePrecedente: 20, repsPrecedentes: 12 });
  assert.equal(series[0].reps, "", "la durée fait office de mesure");
  assert.equal(series[0].dureeSec, 45);
  assert.equal(series[0].charge, "20", "une charge reste pertinente (gilet lesté)");
});

test("completerSerie : série inexistante → aucun effet, aucune exception", () => {
  assert.deepEqual(completerSerie([], 3, { chargePrecedente: 80 }), { charge: null, reps: null });
  assert.doesNotThrow(() => completerSerie(null, 0, {}));
});

/* ============ SÉRIE EN COURS : le repère visuel de la séance ============ */

test("estEnCours : la première série non validée, et elle seule", () => {
  const s = [{ done: true }, { done: true }, { done: false }, { done: false }];
  assert.equal(estEnCours(s, 0), false);
  assert.equal(estEnCours(s, 1), false);
  assert.equal(estEnCours(s, 2), true, "la 3e est celle à faire");
  assert.equal(estEnCours(s, 3), false, "une seule série peut être en cours");
});

test("estEnCours : au début tout est à faire, à la fin plus rien", () => {
  const neuf = [{ done: false }, { done: false }, { done: false }];
  assert.equal(estEnCours(neuf, 0), true);
  assert.equal(estEnCours(neuf, 1), false);
  const fini = [{ done: true }, { done: true }];
  assert.equal(fini.some((_, i) => estEnCours(fini, i)), false, "séance finie : aucun repère");
});

test("estEnCours : une série sautée reste la prochaine à faire", () => {
  // On valide la 2e sans la 1re (cas réel : machine occupée, on revient après).
  const s = [{ done: false }, { done: true }, { done: false }];
  assert.equal(estEnCours(s, 0), true, "le repère reste sur la série oubliée");
  assert.equal(estEnCours(s, 2), false);
});

test("estEnCours : entrées inexploitables → false, jamais d'erreur", () => {
  assert.equal(estEnCours([], 0), false);
  assert.equal(estEnCours(null, 0), false);
  assert.equal(estEnCours([{ done: false }], 5), false);
  assert.equal(estEnCours([{ done: false }], -1), false);
});
