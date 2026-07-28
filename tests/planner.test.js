// @ts-check
import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOGUE, getExercise, chargerCatalogueEtendu } from "../src/data/exercises.js";
import { coefficientsPour, COEFFS_EXPLICITES, classerExercice, facteurFatigue } from "../src/data/exercise-muscle-map.js";
import { CLES_MOTEUR, LABELS_MOTEUR } from "../src/data/muscles-moteur.js";
import {
  facteurEffort, estimerRIR, saturation, combinerFatigue, decroissance,
  demiVie, analyserSeance, etatMusculaire, zoneDisponibilite, cibleVolumeHebdo, PARAMS,
} from "../src/engine/fatigue.js";
import {
  prioriterMuscles, compatibiliteExercice, choisirMuscles, sontCompatibles,
  genererProchaineSeance, resumeCorps, PLAN_PARAMS,
} from "../src/engine/planner.js";

const H = (n, now = Date.now()) => new Date(now - n * 36e5).toISOString();
const MATOS = ["barre", "halteres", "poulie", "poids_du_corps", "banc", "machine_leviers",
  "machine_guidee", "barre_traction", "barre_ez", "rack", "elastiques"];
const dispo = () => CATALOGUE.filter((e) => (e.equipement || []).every((q) => MATOS.includes(q)));

/* ============================ BASE MUSCLES / EXERCICES ============================ */

test("AUCUN exercice du catalogue n'a de muscles indéfinis", async () => {
  await chargerCatalogueEtendu(); // inclut les 250 exercices wger
  let sansMuscle = [];
  for (const e of CATALOGUE) {
    const c = coefficientsPour(e);
    assert.ok(c && typeof c === "object", `${e.id} : coefficients indéfinis`);
    for (const [m, v] of Object.entries(c)) {
      assert.ok(CLES_MOTEUR.includes(m), `${e.id} : muscle inconnu « ${m} »`);
      assert.ok(v > 0 && v <= 1.001, `${e.id} → ${m} : coefficient hors [0,1] (${v})`);
    }
    if (!Object.keys(c).length) sansMuscle.push(`${e.id}(${e.typeExercice})`);
  }
  // Seule la mobilité pure peut n'avoir aucun muscle chargé.
  for (const s of sansMuscle) assert.ok(/mobilite/.test(s), `exercice sans muscle : ${s}`);
  assert.ok(CATALOGUE.length > 300, "le catalogue étendu doit être chargé");
});

test("coefficients explicites : conformes à la spécification", () => {
  const dc = COEFFS_EXPLICITES["developpe-couche-barre"];
  assert.equal(dc.pectoraux, 1.0);
  assert.equal(dc.triceps, 0.55);
  assert.equal(dc.deltoide_anterieur, 0.45);
  const tr = COEFFS_EXPLICITES["tractions"];
  assert.equal(tr.grand_dorsal, 1.0);
  assert.equal(tr.biceps, 0.50);
  // Le soulevé de terre est réparti sur toute la chaîne postérieure.
  const sdt = COEFFS_EXPLICITES["souleve-terre-barre"];
  assert.ok(Object.keys(sdt).length >= 6, "le soulevé de terre doit toucher de nombreux groupes");
  assert.ok(sdt.lombaires >= 0.7);
});

test("facteur de fatigue : axial > polyarticulaire > isolation", () => {
  assert.equal(classerExercice(getExercise("souleve-terre-barre")), "axial_corps_entier");
  assert.ok(facteurFatigue(getExercise("souleve-terre-barre")) > facteurFatigue(getExercise("developpe-couche-halteres")));
  assert.ok(facteurFatigue(getExercise("developpe-couche-halteres")) > facteurFatigue(getExercise("leg-extension")));
});

/* ============================ EFFORT, SATURATION, RÉCUPÉRATION ============================ */

test("facteurEffort : décroît continûment avec le RIR", () => {
  assert.equal(facteurEffort(0), 1.0);
  assert.equal(facteurEffort(2), 0.88);
  assert.ok(facteurEffort(2.5) < facteurEffort(2) && facteurEffort(2.5) > facteurEffort(3));
  assert.equal(facteurEffort(9), PARAMS.EFFORT_RIR[6]);
  // strictement décroissant
  for (let r = 0; r < 6; r += 0.5) assert.ok(facteurEffort(r) >= facteurEffort(r + 0.5));
});

test("estimerRIR : jamais bloquant, valeur prudente", () => {
  assert.equal(estimerRIR({ reps: 10 }, null).rir, PARAMS.RIR_DEFAUT);
  assert.equal(estimerRIR({ reps: 10 }, null).estime, true);
  // plus de reps que d'habitude → série plus proche de l'échec
  const plus = estimerRIR({ reps: 14, chargeKg: 60 }, { repsMoy: 10, chargeMoy: 60 });
  const moins = estimerRIR({ reps: 6, chargeKg: 60 }, { repsMoy: 10, chargeMoy: 60 });
  assert.ok(plus.rir < moins.rir);
  assert.ok(plus.rir >= 0 && moins.rir <= 6);
});

test("saturation : jamais d'addition naïve de pourcentages", () => {
  assert.equal(saturation(0), 0);
  assert.ok(saturation(7) > 55 && saturation(7) < 70);
  assert.ok(saturation(100) <= 100);
  // rendements décroissants
  const a = saturation(4) - saturation(2), b = saturation(10) - saturation(8);
  assert.ok(a > b, "les séries supplémentaires doivent compter de moins en moins");
});

test("combinerFatigue : la fatigue existante ne disparaît pas et ne dépasse jamais 100", () => {
  assert.equal(combinerFatigue(0, 50), 50);
  // 35 % existant + 80 % d'apport ne fait pas 115
  const c = combinerFatigue(35, 80);
  assert.ok(c > 35 && c <= 100, `combinaison hors bornes : ${c}`);
  assert.ok(combinerFatigue(90, 90) <= 100);
  assert.ok(combinerFatigue(100, 100) <= 100);
});

test("décroissance : demi-vie exponentielle, plus lente si séance lourde", () => {
  assert.ok(Math.abs(decroissance(100, 24, 24) - 50) < 0.01);
  assert.ok(Math.abs(decroissance(100, 48, 24) - 25) < 0.01);
  assert.equal(decroissance(100, 0, 24), 100);
  assert.ok(demiVie(12) > demiVie(2), "un gros volume met plus de temps à récupérer");
  assert.ok(demiVie(12, 1) > demiVie(12, 0), "l'échec allonge la récupération");
});

/* ============================ SÉRIES ÉQUIVALENTES ============================ */

test("séries équivalentes : 4 × développé couché répartit sur 3 muscles", () => {
  const log = { date: new Date().toISOString(), exercices: [
    { exerciceId: "developpe-couche-barre", series: Array.from({ length: 4 }, () => ({ chargeKg: 80, reps: 8, rir: 0 })) },
  ] };
  const { parMuscle } = analyserSeance(log, getExercise);
  const f = facteurFatigue(getExercise("developpe-couche-barre"));
  // à RIR 0, effort = 1 → stress = coefficient × facteurExo × 4 séries
  assert.ok(Math.abs(parMuscle.pectoraux.stress - 4 * 1.0 * f) < 0.01);
  assert.ok(Math.abs(parMuscle.triceps.stress - 4 * 0.55 * f) < 0.01);
  assert.ok(Math.abs(parMuscle.deltoide_anterieur.stress - 4 * 0.45 * f) < 0.01);
  // le principal reçoit nettement plus que les secondaires
  assert.ok(parMuscle.pectoraux.stress > parMuscle.triceps.stress);
});

/* ============================ ÉTAT MUSCULAIRE ============================ */

test("etatMusculaire : les 18 groupes existent et récupèrent avec le temps", () => {
  const now = Date.now();
  const seance = { date: H(2, now), exercices: [
    { exerciceId: "developpe-couche-barre", series: Array.from({ length: 5 }, () => ({ chargeKg: 80, reps: 8, rir: 0 })) },
  ] };
  const juste = etatMusculaire([seance], getExercise, now);
  assert.equal(Object.keys(juste).length, 18);
  for (const c of CLES_MOTEUR) {
    assert.ok(juste[c], `groupe manquant : ${c}`);
    assert.ok(juste[c].readiness >= 0 && juste[c].readiness <= 100);
    assert.equal(juste[c].readiness, juste[c].recovery);
  }
  assert.ok(juste.pectoraux.readiness < 70, "pectoraux doivent être marqués juste après");
  assert.equal(juste.quadriceps.readiness, 100, "un muscle non travaillé reste à 100");
  // 5 jours plus tard, la récupération a eu lieu — sans rien stocker
  const plusTard = etatMusculaire([seance], getExercise, now + 5 * 864e5);
  assert.ok(plusTard.pectoraux.readiness > juste.pectoraux.readiness + 20,
    "la fatigue doit décroître avec le temps écoulé");
});

test("zones de disponibilité", () => {
  assert.equal(zoneDisponibilite(95).cle, "frais");
  assert.equal(zoneDisponibilite(80).cle, "pret");
  assert.equal(zoneDisponibilite(65).cle, "prudence");
  assert.equal(zoneDisponibilite(45).cle, "recuperation");
  assert.equal(zoneDisponibilite(20).cle, "repos");
});

/* ============================ PRIORITÉ ET COMPATIBILITÉ ============================ */

test("priorité : un muscle frais mais saturé passe derrière un muscle en manque de volume", () => {
  const now = Date.now();
  // Biceps très travaillés cette semaine, quadriceps quasiment pas
  const logs = [
    { date: H(60, now), exercices: [{ exerciceId: "curl-halteres", series: Array.from({ length: 12 }, () => ({ chargeKg: 14, reps: 12, rir: 1 })) }] },
    { date: H(120, now), exercices: [{ exerciceId: "squat-barre", series: [{ chargeKg: 90, reps: 8, rir: 2 }] }] },
  ];
  const etat = etatMusculaire(logs, getExercise, now);
  const cl = prioriterMuscles(etat, { niveau: "intermediaire" }, now);
  const bi = cl.find((l) => l.muscle === "biceps");
  const qu = cl.find((l) => l.muscle === "quadriceps");
  // Les biceps sont largement récupérés (12 séries dures il y a 2,5 jours)…
  assert.ok(bi.readiness > 75, `biceps insuffisamment récupérés : ${bi.readiness}`);
  assert.ok(qu.readiness > bi.readiness, "les quadriceps sont plus frais encore");
  // …mais leur volume hebdomadaire dépasse déjà l'objectif, alors que les
  // quadriceps en sont loin : la priorité doit basculer nettement.
  assert.ok(bi.deficit === 0, "objectif hebdomadaire biceps atteint");
  assert.ok(qu.deficit > 60, "les quadriceps manquent de volume");
  assert.ok(qu.priority > bi.priority + 30,
    `quadriceps (${qu.priority}) doit primer nettement sur biceps saturés (${bi.priority})`);
});

test("compatibilité : le développé couché est pénalisé si les triceps sont à plat", () => {
  const etat = {};
  for (const c of CLES_MOTEUR) etat[c] = { readiness: 95 };
  etat.triceps = { readiness: 20 };
  etat.deltoide_anterieur = { readiness: 30 };
  const dc = compatibiliteExercice(getExercise("developpe-couche-barre"), etat);
  const tract = compatibiliteExercice(getExercise("tractions"), etat);
  assert.ok(dc.score < 60, `développé couché mal noté attendu, obtenu ${dc.score}`);
  assert.equal(dc.limitant, "triceps");
  assert.ok(tract.score > 85, `tractions bien notées attendues, obtenu ${tract.score}`);
  assert.ok(tract.score > dc.score + 25);
});

test("affinités : associations naturelles reconnues, absurdes évitées", () => {
  assert.ok(sontCompatibles("grand_dorsal", "biceps"));
  assert.ok(sontCompatibles("pectoraux", "triceps"));
  assert.ok(sontCompatibles("quadriceps", "ischio_jambiers"));
  assert.ok(!sontCompatibles("pectoraux", "quadriceps"), "haut et bas du corps ne s'associent pas par défaut");
});

/* ============================ GÉNÉRATION ============================ */

test("le moteur refuse de reproposer un muscle qu'il vient de détruire", () => {
  const now = Date.now();
  const logs = [{ date: H(16, now), exercices: [
    { exerciceId: "developpe-couche-barre", series: Array.from({ length: 5 }, () => ({ chargeKg: 80, reps: 8, rir: 0 })) },
    { exerciceId: "developpe-incline-halteres", series: Array.from({ length: 4 }, () => ({ chargeKg: 28, reps: 10, rir: 1 })) },
    { exerciceId: "extension-triceps-poulie", series: Array.from({ length: 4 }, () => ({ chargeKg: 30, reps: 12, rir: 1 })) },
  ] }];
  const r = genererProchaineSeance(logs, getExercise, dispo(), { niveau: "intermediaire", dureeMin: 60 }, now);
  assert.equal(r.repos, false, "il reste plein de muscles disponibles : pas de repos");
  assert.ok(!r.muscles.includes("pectoraux"), "les pectoraux ne doivent pas être reproposés");
  assert.ok(r.exercices.length >= 3, "une vraie séance doit être construite");
  assert.ok(r.compatibilite >= 70, `compatibilité trop basse : ${r.compatibilite}`);
  // et surtout : aucun exercice ne doit retomber lourdement sur les pectoraux
  for (const x of r.exercices) {
    const c = coefficientsPour(x.exo);
    assert.ok((c.pectoraux || 0) < 0.7, `${x.exo.nom} sollicite trop les pectoraux`);
  }
  assert.ok(r.explications.length > 0, "la décision doit être expliquée");
});

test("jambes disponibles + haut du corps à plat = séance jambes, PAS repos", () => {
  const now = Date.now();
  // Tout le haut du corps massacré il y a 12 h
  const logs = [{ date: H(12, now), exercices: [
    { exerciceId: "developpe-couche-barre", series: Array.from({ length: 6 }, () => ({ chargeKg: 80, reps: 8, rir: 0 })) },
    { exerciceId: "tractions", series: Array.from({ length: 6 }, () => ({ reps: 8, rir: 0 })) },
    { exerciceId: "developpe-epaules-halteres", series: Array.from({ length: 5 }, () => ({ chargeKg: 20, reps: 10, rir: 0 })) },
    { exerciceId: "curl-halteres", series: Array.from({ length: 5 }, () => ({ chargeKg: 14, reps: 12, rir: 0 })) },
  ] }];
  const r = genererProchaineSeance(logs, getExercise, dispo(), { niveau: "intermediaire", dureeMin: 60 }, now);
  assert.equal(r.repos, false, "les jambes sont fraîches : ne pas conclure au repos");
  const bas = ["quadriceps", "ischio_jambiers", "fessiers", "mollets", "adducteurs"];
  assert.ok(r.muscles.some((m) => bas.includes(m)), `séance du bas attendue, obtenu ${r.muscles.join("+")}`);
});

test("repos conseillé seulement si TOUT le corps est marqué", () => {
  const now = Date.now();
  const gros = (id, n) => ({ exerciceId: id, series: Array.from({ length: n }, () => ({ chargeKg: 60, reps: 10, rir: 0 })) });
  const logs = [{ date: H(8, now), exercices: [
    gros("developpe-couche-barre", 6), gros("tractions", 6), gros("squat-barre", 6),
    gros("souleve-terre-barre", 5), gros("developpe-epaules-halteres", 5), gros("curl-halteres", 5),
    gros("extension-triceps-poulie", 5), gros("mollets-debout", 5), gros("crunch-sol", 5),
    gros("leg-curl-assis", 5), gros("elevations-laterales-halteres", 5), gros("face-pull-elastique", 5),
    gros("adducteurs-machine", 5), gros("gainage-lateral", 5), gros("shrugs", 5),
  ] }];
  const r = genererProchaineSeance(logs, getExercise, dispo(), { niveau: "intermediaire", dureeMin: 60 }, now);
  assert.equal(r.repos, true, "corps entier détruit il y a 8 h → repos");
  assert.ok(r.explications.length > 0);
});

test("durée respectée : 30 min produit une séance plus courte que 90 min", () => {
  const now = Date.now();
  const court = genererProchaineSeance([], getExercise, dispo(), { niveau: "intermediaire", dureeMin: 30 }, now);
  const long = genererProchaineSeance([], getExercise, dispo(), { niveau: "intermediaire", dureeMin: 90 }, now);
  assert.ok(court.dureeEstimee <= 30, `30 min dépassé : ${court.dureeEstimee}`);
  assert.ok(long.dureeEstimee <= 90);
  assert.ok(long.dureeEstimee > court.dureeEstimee);
  assert.ok(long.exercices.length > court.exercices.length);
});

test("niveau : un avancé reçoit plus de volume qu'un débutant", () => {
  const now = Date.now();
  const deb = genererProchaineSeance([], getExercise, dispo(), { niveau: "debutant", dureeMin: 60 }, now);
  const av = genererProchaineSeance([], getExercise, dispo(), { niveau: "avance", dureeMin: 60 }, now);
  const series = (r) => r.exercices.reduce((a, x) => a + x.series, 0);
  assert.ok(series(av) > series(deb), `avancé ${series(av)} vs débutant ${series(deb)}`);
});

test("resumeCorps : compte les muscles par zone", () => {
  const etat = etatMusculaire([], getExercise, Date.now());
  const r = resumeCorps(etat);
  assert.equal(r.prets + r.recup + r.sollicites, 18);
  assert.equal(r.prets, 18, "sans historique, tout est frais");
  assert.equal(r.moyenne, 100);
});
