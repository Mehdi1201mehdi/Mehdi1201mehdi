// @ts-check
/**
 * SIMULATIONS DE VALIDATION du moteur automatique.
 *
 * On fait tourner la boucle complète — analyse → sélection → séance → analyse —
 * sur 30 jours, en jouant le rôle de l'utilisateur : chaque séance proposée est
 * « réalisée » et réinjectée dans l'historique. On vérifie ensuite que le
 * comportement global tient la route sur la durée, ce qu'aucun test unitaire ne
 * peut montrer.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CATALOGUE, getExercise } from "../src/data/exercises.js";
import { CLES_MOTEUR, LABELS_MOTEUR } from "../src/data/muscles-moteur.js";
import { coefficientsPour } from "../src/data/exercise-muscle-map.js";
import { etatMusculaire } from "../src/engine/fatigue.js";
import { genererProchaineSeance } from "../src/engine/planner.js";

const MATOS = ["barre", "halteres", "poulie", "poids_du_corps", "banc", "machine_leviers",
  "machine_guidee", "barre_traction", "barre_ez", "rack", "elastiques"];
const CATA = CATALOGUE.filter((e) => (e.equipement || []).every((q) => MATOS.includes(q)));

/**
 * Joue une séance proposée : produit un log réaliste (RIR 1–2, reps dans la
 * fourchette) comme si l'utilisateur l'avait réalisée.
 */
function realiser(seance, dateISO) {
  return {
    id: "sim-" + dateISO,
    date: dateISO,
    seanceNom: seance.nom,
    exercices: seance.exercices.map((x) => ({
      exerciceId: x.exo.id,
      series: Array.from({ length: x.series }, (_, i) => ({
        chargeKg: 40, reps: 10 - (i > 1 ? 1 : 0), rir: i === x.series - 1 ? 1 : 2,
      })),
    })),
  };
}

/**
 * Boucle continue sur `jours` jours. L'utilisateur s'entraîne quand le moteur
 * propose une séance, se repose quand il conseille le repos.
 */
function simuler(jours, profil, depart = Date.parse("2026-03-02T18:00:00Z")) {
  const logs = [];
  const journal = [];
  for (let j = 0; j < jours; j++) {
    const t = depart + j * 864e5;
    const r = genererProchaineSeance(logs, getExercise, CATA, profil, t);
    if (r.repos) {
      journal.push({ jour: j + 1, repos: true, nom: "Repos", muscles: [], exercices: [] });
      continue;
    }
    const log = realiser(r, new Date(t).toISOString());
    logs.push(log);
    journal.push({
      jour: j + 1, repos: false, nom: r.nom, muscles: r.muscles,
      exercices: r.exercices.map((x) => x.exo.nom),
      compat: r.compatibilite, duree: r.dureeEstimee,
    });
  }
  return { logs, journal, etatFinal: etatMusculaire(logs, getExercise, depart + jours * 864e5) };
}

/** Séries équivalentes reçues par muscle sur toute la simulation. */
function volumeTotal(logs) {
  const tot = Object.fromEntries(CLES_MOTEUR.map((c) => [c, 0]));
  for (const l of logs) {
    for (const ex of l.exercices) {
      const exo = getExercise(ex.exerciceId);
      if (!exo) continue;
      for (const [m, c] of Object.entries(coefficientsPour(exo))) {
        if (tot[m] != null) tot[m] += c * ex.series.length;
      }
    }
  }
  return tot;
}

/* ============================ SIMULATION 30 JOURS ============================ */

test("SIMULATION 30 JOURS — aucun muscle oublié, aucun surentraîné", () => {
  const { logs, journal, etatFinal } = simuler(30, { niveau: "intermediaire", dureeMin: 60 });
  const seances = journal.filter((j) => !j.repos);
  const repos = journal.filter((j) => j.repos);

  // 1) Le moteur doit produire un rythme d'entraînement viable.
  assert.ok(seances.length >= 15, `trop peu de séances sur 30 jours : ${seances.length}`);
  assert.ok(repos.length >= 2, `aucun jour de repos en 30 jours : suspect (${repos.length})`);
  assert.ok(seances.length <= 28, `presque aucun repos : ${seances.length} séances`);

  // 2) AUCUN muscle constamment oublié.
  const vol = volumeTotal(logs);
  const oublies = CLES_MOTEUR.filter((c) => vol[c] < 4);
  assert.deepEqual(oublies, [],
    `muscles négligés sur 30 jours : ${oublies.map((c) => `${LABELS_MOTEUR[c]} (${vol[c].toFixed(1)})`).join(", ")}`);

  // 3) AUCUN muscle surentraîné : le plus travaillé ne doit pas écraser les autres.
  const vals = CLES_MOTEUR.map((c) => vol[c]);
  const max = Math.max(...vals), min = Math.min(...vals);
  assert.ok(max / Math.max(1, min) < 12,
    `répartition trop déséquilibrée : max ${max.toFixed(1)} / min ${min.toFixed(1)}`);

  // 4) Les petits muscles surveillés ne disparaissent pas.
  for (const c of ["deltoide_lateral", "deltoide_posterieur", "mollets", "ischio_jambiers", "abdominaux"]) {
    assert.ok(vol[c] >= 4, `${LABELS_MOTEUR[c]} quasiment jamais travaillé (${vol[c].toFixed(1)})`);
  }

  // 5) Aucune séance ne doit être proposée sur un muscle non récupéré.
  for (const j of seances) {
    assert.ok(j.compat >= 55, `séance jour ${j.jour} peu compatible : ${j.compat}`);
  }

  // 6) L'état final reste dans des bornes saines (pas de fatigue qui explose).
  for (const c of CLES_MOTEUR) {
    assert.ok(etatFinal[c].readiness >= 0 && etatFinal[c].readiness <= 100);
  }

  // 7) Pas de répétition absurde : la même séance ne doit pas revenir 2 jours
  //    de suite avec exactement les mêmes muscles.
  let repetitions = 0;
  for (let i = 1; i < seances.length; i++) {
    if (seances[i].nom === seances[i - 1].nom
      && seances[i].jour === seances[i - 1].jour + 1) repetitions++;
  }
  assert.equal(repetitions, 0, `${repetitions} séances identiques deux jours de suite`);

  // 8) Diversité réelle : au moins 5 configurations de séance différentes.
  const noms = new Set(seances.map((j) => j.nom));
  assert.ok(noms.size >= 5, `trop peu de variété : ${[...noms].join(" / ")}`);
});

test("SIMULATION 30 JOURS — la durée demandée est toujours respectée", () => {
  for (const duree of [30, 45, 60, 90]) {
    const { journal } = simuler(20, { niveau: "intermediaire", dureeMin: duree });
    for (const j of journal.filter((x) => !x.repos)) {
      assert.ok(j.duree <= duree, `jour ${j.jour} : ${j.duree} min > ${duree} min demandées`);
    }
  }
});

/* ============================ SIMULATION DE CONTRÔLE ============================ */

test("SIMULATION DE CONTRÔLE — la décision vient des données, pas du calendrier", () => {
  const depart = Date.parse("2026-03-02T18:00:00Z");
  // Jour 1 : on impose une séance pectoraux très lourde.
  const logs = [{
    id: "j1", date: new Date(depart).toISOString(), seanceNom: "Pectoraux lourds",
    exercices: [
      { exerciceId: "developpe-couche-barre", series: Array.from({ length: 6 }, () => ({ chargeKg: 90, reps: 6, rir: 0 })) },
      { exerciceId: "developpe-incline-halteres", series: Array.from({ length: 4 }, () => ({ chargeKg: 32, reps: 8, rir: 0 })) },
      { exerciceId: "butterfly", series: Array.from({ length: 4 }, () => ({ chargeKg: 40, reps: 12, rir: 0 })) },
    ],
  }];
  const profil = { niveau: "intermediaire", dureeMin: 60 };

  // Jour 2 : les pectoraux ne doivent PAS revenir.
  const j2 = genererProchaineSeance(logs, getExercise, CATA, profil, depart + 864e5);
  assert.equal(j2.repos, false);
  assert.ok(!j2.muscles.includes("pectoraux"), `jour 2 propose encore les pectoraux : ${j2.nom}`);
  for (const x of j2.exercices) {
    assert.ok((coefficientsPour(x.exo).pectoraux || 0) < 0.7,
      `jour 2 : ${x.exo.nom} sollicite lourdement les pectoraux`);
  }
  logs.push(realiser(j2, new Date(depart + 864e5).toISOString()));

  // Jour 3 : ni pectoraux, ni les muscles travaillés le jour 2.
  const j3 = genererProchaineSeance(logs, getExercise, CATA, profil, depart + 2 * 864e5);
  assert.equal(j3.repos, false);
  const communs = j3.muscles.filter((m) => j2.muscles.includes(m));
  assert.deepEqual(communs, [], `jour 3 réutilise les muscles du jour 2 : ${communs.join(", ")}`);
  logs.push(realiser(j3, new Date(depart + 2 * 864e5).toISOString()));

  // Jour 4 : recalcul complet — la décision doit rester justifiée.
  const j4 = genererProchaineSeance(logs, getExercise, CATA, profil, depart + 3 * 864e5);
  assert.ok(j4.explications.length > 0, "le jour 4 doit expliquer sa décision");
  if (!j4.repos) {
    assert.ok(j4.compatibilite >= 55, `jour 4 peu compatible : ${j4.compatibilite}`);
  }

  // Preuve que ce n'est pas « jour + 1 = programme prédéfini » : en repartant
  // du MÊME jour 1 mais avec 4 jours écoulés, la proposition change.
  const tard = genererProchaineSeance(logs.slice(0, 1), getExercise, CATA, profil, depart + 4 * 864e5);
  const tot = genererProchaineSeance(logs.slice(0, 1), getExercise, CATA, profil, depart + 864e5);
  assert.ok(tard.nom !== tot.nom || tard.exercices.length !== tot.exercices.length,
    "le temps écoulé doit influencer la proposition");
});

test("SIMULATION — la récupération avance même sans entraînement", () => {
  const depart = Date.parse("2026-03-02T18:00:00Z");
  const logs = [{
    id: "x", date: new Date(depart).toISOString(), seanceNom: "Jambes",
    exercices: [{ exerciceId: "squat-barre", series: Array.from({ length: 6 }, () => ({ chargeKg: 100, reps: 6, rir: 0 })) }],
  }];
  const lectures = [1, 2, 4, 7].map((j) => etatMusculaire(logs, getExercise, depart + j * 864e5).quadriceps.readiness);
  // strictement croissant : rouvrir l'app plus tard doit montrer plus de récupération
  for (let i = 1; i < lectures.length; i++) {
    assert.ok(lectures[i] > lectures[i - 1],
      `la récupération doit progresser sans entraînement : ${lectures.join(" → ")}`);
  }
  assert.ok(lectures[3] > 90, `après 7 jours les quadriceps devraient être frais : ${lectures[3]}`);
});
