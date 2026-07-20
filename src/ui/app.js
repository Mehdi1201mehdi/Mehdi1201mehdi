// @ts-check
/**
 * Interface PWA (mono-utilisateur, hors ligne). Relie l'utilisateur au moteur
 * sportif déterministe. Aucune clé d'API ici ; le coach IA (phase 2) passera
 * par un proxy serveur.
 */
import {
  GOALS, GOAL_LABELS, LEVELS, LEVEL_LABELS, EQUIPMENTS, EQUIPMENT_LABELS,
  MUSCLES, MUSCLE_LABELS,
} from "../models.js";
import { getExercise, chercherCatalogue, CATALOGUE } from "../data/exercises.js";
import { GIFS } from "../data/gifs.js";
import { genererProgramme } from "../engine/generator.js";
import { recommander } from "../engine/progression.js";
import { alternatives } from "../engine/replacement.js";
import { chercherDemonstration, lienYouTube } from "../integrations/exercisedb.js";
import { muscleDiagram } from "./anatomy.js";
import { calculerBesoins } from "../engine/nutrition.js";
import { bilan } from "../engine/review.js";
import { chercherFoods, portion } from "../data/foods.js";
import { rechercher as offRechercher, parCodeBarres } from "../integrations/openfoodfacts.js";
import { Etat, seanceDuJour } from "../store/state.js";
import {
  nouvelleSession, ajouterSerie, retirerDerniereSerie,
  serialiser, restaurer, estReprenable, dureeSecondes,
} from "../engine/liveSession.js";
import {
  creerRoutine, renommer, ajouterSeance, supprimerSeance, ajouterExercice,
  supprimerExerciceIndex, deplacerExercice, definirSeries, dupliquerRoutine,
  seanceDepuisLog,
} from "../engine/routines.js";
import { FORMULE_1RM, classementRecords, detecterRecords } from "../engine/records.js";
import { construireExport, validerImport, appliquerImport, nomFichierBackup } from "../engine/backup.js";
import { FORMULES_1RM, estimer1RM, tablePourcentages, disquesParCote } from "../engine/powerlifting.js";
import {
  volumeLog, volumeParSemaine, dureeMoyenneMin, volumeParMuscle, statsSemaine,
  METRIQUES_EXO, serieExercice, serieCorps, filtrerDepuis,
} from "../engine/stats.js";

/** Nom lisible d'un exercice (pour records/stats). */
const nomExo = (id) => (getExercise(id) ? getExercise(id).nom : id);

/** Toutes les séances jouables : programme généré + routines perso. */
function toutesSeances() {
  const out = [];
  if (Etat.data.programme) for (const s of Etat.data.programme.seances) out.push({ seance: s, source: Etat.data.programme });
  for (const r of Etat.data.programmesPerso || []) for (const s of r.seances) out.push({ seance: s, source: r });
  return out;
}
/** Résout une séance (et sa routine/programme parent) par id, toutes sources. */
function trouverSeance(seanceId) {
  const f = toutesSeances().find((x) => x.seance.id === seanceId);
  return f ? f.seance : null;
}
function trouverParentSeance(seanceId) {
  const f = toutesSeances().find((x) => x.seance.id === seanceId);
  return f ? f.source : null;
}
import { seancesVersCSV, metriquesVersCSV, nomFichierExport } from "../engine/export.js";
import { grilleMois, moisAdjacent, NOMS_JOURS_COURTS } from "../engine/calendar.js";

const todayStr = () => new Date().toISOString().slice(0, 10);

/* ---------- petits utilitaires DOM ---------- */
const $ = (s, r = document) => r.querySelector(s);
const view = $("#view");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function h(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function on(root, sel, ev, fn) { root.querySelectorAll(sel).forEach((n) => n.addEventListener(ev, fn)); }

/* ---------- thème ---------- */
function appliquerTheme() {
  const t = Etat.data.reglages.theme;
  if (t === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
}
$("#themeBtn").addEventListener("click", () => {
  const ordre = ["auto", "light", "dark"];
  const cur = Etat.data.reglages.theme;
  Etat.data.reglages.theme = ordre[(ordre.indexOf(cur) + 1) % 3];
  Etat.sauver(); appliquerTheme();
});

/* ---------- navigation ---------- */
let TAB = "dash";
const TABS = { dash: vDash, prog: vProg, cat: vCatalogue, train: vTrain, food: vNutrition, stats: vStats, set: vSet };
function nav(t) {
  TAB = t;
  $("#tabs").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
  render(); window.scrollTo(0, 0);
}
$("#tabs").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => nav(b.dataset.tab)));
function render() { view.innerHTML = ""; (Etat.data.profil ? TABS[TAB] : vOnboarding)(view); }

/* ======================================================================
   ONBOARDING (assistant étape par étape, avec explications)
   ====================================================================== */
let DRAFT = null;
let STEP = 0;

function draftInit() {
  DRAFT = {
    prenom: "", age: 35, sexe: "H", tailleCm: 175, poidsKg: 80, masseGrassePct: null,
    objectif: "recomposition", objectifsSecondaires: [], niveau: "debutant",
    joursParSemaine: 3, dureeSeanceMin: 45, lieu: "maison",
    equipements: ["poids_du_corps"], musclesPrioritaires: [], exercicesAimes: [], exercicesRefuses: [],
    limitations: [], prefCardio: false, unites: "metrique",
    recuperation: 3, sommeilH: 7, stress: 3,
  };
}

const STEPS = [
  { t: "Bienvenue", pourquoi: "Ton prénom personnalise l'app. L'âge et la taille servent à des repères, jamais à un diagnostic.", champ: renderStepIdentite },
  { t: "Ton objectif", pourquoi: "L'objectif détermine le nombre de séries, de répétitions et les temps de repos.", champ: renderStepObjectif },
  { t: "Ton niveau", pourquoi: "Le niveau filtre les exercices trop techniques et ajuste le volume.", champ: renderStepNiveau },
  { t: "Ta disponibilité", pourquoi: "Le nombre de jours choisit le découpage (corps entier, haut/bas…), la durée limite le nombre d'exercices.", champ: renderStepDispo },
  { t: "Ton matériel", pourquoi: "On ne te proposera que des exercices réalisables avec ce que tu as.", champ: renderStepMateriel },
  { t: "Priorités & limitations", pourquoi: "Les muscles prioritaires passent en premier. Les limitations déclenchent des variantes plus sûres.", champ: renderStepPrefs },
  { t: "Récupération", pourquoi: "Sommeil et récupération ajustent le volume pour éviter le surmenage.", champ: renderStepRecup },
];

function vOnboarding(v) {
  if (!DRAFT) draftInit();
  $("#tabs").hidden = true;
  const s = STEPS[STEP];
  const wrap = h(`<div class="stack"></div>`);
  wrap.append(
    h(`<div class="wiz-dots">${STEPS.map((_, i) => `<i class="${i <= STEP ? "on" : ""}"></i>`).join("")}</div>`),
    h(`<div class="eyebrow">Étape ${STEP + 1} / ${STEPS.length}</div>`),
    h(`<h1>${esc(s.t)}</h1>`),
    h(`<div class="notice small">💡 ${esc(s.pourquoi)}</div>`),
  );
  const body = h(`<div class="card"></div>`);
  s.champ(body);
  wrap.append(body);
  const nav2 = h(`<div class="row" style="margin-top:8px">
     ${STEP > 0 ? `<button class="ghost" id="prev">Précédent</button>` : ""}
     <button class="primary" id="next" style="flex:1">${STEP === STEPS.length - 1 ? "Générer mon programme" : "Suivant"}</button>
   </div>`);
  wrap.append(nav2);
  v.append(wrap);
  $("#prev", v)?.addEventListener("click", () => { STEP--; render(); });
  $("#next", v).addEventListener("click", () => {
    if (STEP < STEPS.length - 1) { STEP++; render(); }
    else finaliserOnboarding();
  });
}

function chips(container, options, getSel, toggle) {
  const box = h(`<div class="row"></div>`);
  for (const [val, lab] of options) {
    const b = h(`<button class="chip ${getSel(val) ? "on" : ""}">${esc(lab)}</button>`);
    b.addEventListener("click", () => { toggle(val); render(); });
    box.append(b);
  }
  container.append(box);
}
function field(container, label, inputEl, hint) {
  const l = h(`<label class="f"><span>${esc(label)}</span></label>`);
  l.append(inputEl); if (hint) l.append(h(`<div class="hint">${esc(hint)}</div>`));
  container.append(l);
}

function renderStepIdentite(c) {
  const nom = h(`<input value="${esc(DRAFT.prenom)}" placeholder="Prénom ou pseudo">`);
  nom.addEventListener("input", () => DRAFT.prenom = nom.value);
  field(c, "Prénom / pseudo", nom);
  const g = h(`<div class="grid2"></div>`);
  const age = h(`<input inputmode="numeric" value="${DRAFT.age}">`); age.addEventListener("input", () => DRAFT.age = +age.value || 35);
  const taille = h(`<input inputmode="numeric" value="${DRAFT.tailleCm}">`); taille.addEventListener("input", () => DRAFT.tailleCm = +taille.value || 175);
  const poids = h(`<input inputmode="decimal" value="${DRAFT.poidsKg}">`); poids.addEventListener("input", () => DRAFT.poidsKg = +poids.value || 80);
  [["Âge", age], ["Taille (cm)", taille], ["Poids (kg)", poids]].forEach(([lab, inp]) => { const l = h(`<label class="f"><span>${lab}</span></label>`); l.append(inp); g.append(l); });
  c.append(g);
}
function renderStepObjectif(c) { chips(c, GOALS.map((g) => [g, GOAL_LABELS[g]]), (v) => DRAFT.objectif === v, (v) => DRAFT.objectif = v); }
function renderStepNiveau(c) { chips(c, LEVELS.map((l) => [l, LEVEL_LABELS[l]]), (v) => DRAFT.niveau === v, (v) => DRAFT.niveau = v); }
function renderStepDispo(c) {
  field(c, "Jours par semaine", chipsInline([1, 2, 3, 4, 5, 6].map((n) => [n, `${n} j`]), (v) => DRAFT.joursParSemaine === v, (v) => DRAFT.joursParSemaine = v), "Pour une reprise, 3 jours est idéal.");
  field(c, "Durée d'une séance", chipsInline([30, 45, 60, 75].map((n) => [n, `${n} min`]), (v) => DRAFT.dureeSeanceMin === v, (v) => DRAFT.dureeSeanceMin = v));
  field(c, "Lieu", chipsInline([["maison", "Maison"], ["salle", "Salle"], ["exterieur", "Extérieur"]], (v) => DRAFT.lieu === v, (v) => DRAFT.lieu = v));
}
function chipsInline(options, getSel, toggle) {
  const box = h(`<div class="row"></div>`);
  for (const [val, lab] of options) { const b = h(`<button class="chip ${getSel(val) ? "on" : ""}">${esc(lab)}</button>`); b.addEventListener("click", () => { toggle(val); render(); }); box.append(b); }
  return box;
}
function renderStepMateriel(c) {
  c.append(h(`<div class="hint" style="margin-bottom:6px">Sélectionne tout ce dont tu disposes (le poids du corps est toujours inclus).</div>`));
  chips(c, EQUIPMENTS.map((e) => [e, EQUIPMENT_LABELS[e]]),
    (v) => DRAFT.equipements.includes(v),
    (v) => { if (v === "poids_du_corps") return; DRAFT.equipements = DRAFT.equipements.includes(v) ? DRAFT.equipements.filter((x) => x !== v) : [...DRAFT.equipements, v]; });
}
function renderStepPrefs(c) {
  c.append(h(`<div class="eyebrow">Muscles prioritaires (optionnel)</div>`));
  chips(c, MUSCLES.filter((m) => m !== "corps_entier").map((m) => [m, MUSCLE_LABELS[m]]),
    (v) => DRAFT.musclesPrioritaires.includes(v),
    (v) => DRAFT.musclesPrioritaires = DRAFT.musclesPrioritaires.includes(v) ? DRAFT.musclesPrioritaires.filter((x) => x !== v) : [...DRAFT.musclesPrioritaires, v]);
  c.append(h(`<div class="eyebrow" style="margin-top:12px">Limitations / douleurs déclarées</div>`));
  const LIMS = [["dos", "Dos"], ["epaule", "Épaule"], ["genou", "Genou"], ["poignet", "Poignet"], ["cheville", "Cheville"], ["coude", "Coude"], ["hanche", "Hanche"]];
  chips(c, LIMS, (v) => DRAFT.limitations.includes(v),
    (v) => DRAFT.limitations = DRAFT.limitations.includes(v) ? DRAFT.limitations.filter((x) => x !== v) : [...DRAFT.limitations, v]);
  c.append(h(`<div class="warn small" style="margin-top:12px">⚕️ Cette app ne remplace pas un professionnel de santé. En cas de douleur, blessure ou maladie, demande un avis médical avant de continuer.</div>`));
}
function renderStepRecup(c) {
  field(c, "Qualité de récupération", chipsInline([1, 2, 3, 4, 5].map((n) => [n, `${n}`]), (v) => DRAFT.recuperation === v, (v) => DRAFT.recuperation = v), "1 = épuisé en permanence, 5 = toujours frais.");
  const som = h(`<input inputmode="decimal" value="${DRAFT.sommeilH}">`); som.addEventListener("input", () => DRAFT.sommeilH = +som.value || 7);
  field(c, "Sommeil moyen (h)", som);
  field(c, "Niveau de stress", chipsInline([1, 2, 3, 4, 5].map((n) => [n, `${n}`]), (v) => DRAFT.stress === v, (v) => DRAFT.stress = v));
}

function finaliserOnboarding() {
  Etat.data.profil = DRAFT;
  Etat.data.reglages.unites = DRAFT.unites;
  Etat.data.programme = genererProgramme(DRAFT);
  Etat.sauver();
  DRAFT = null; STEP = 0;
  $("#tabs").hidden = false;
  nav("dash");
}

/* ======================================================================
   TABLEAU DE BORD
   ====================================================================== */
function vDash(v) {
  const p = Etat.data.profil, prog = Etat.data.programme;
  const sj = seanceDuJour(prog);
  v.append(h(`<div class="eyebrow">Salut ${esc(p.prenom || "!")}</div>`));
  v.append(h(`<h1 style="margin-bottom:6px">${sj ? "Séance prévue aujourd'hui" : "Repos aujourd'hui"}</h1>`));

  const c = h(`<div class="card accent stack"></div>`);
  if (sj) {
    c.append(h(`<div class="spread"><h2 style="margin:0">${esc(sj.nom)}</h2><span class="pill">${sj.exercices.length} exos · ~${sj.dureeEstimeeMin} min</span></div>`));
    c.append(h(`<div class="small">${sj.groupesCibles.map((m) => MUSCLE_LABELS[m] || m).slice(0, 5).join(" · ")}</div>`));
    const b = h(`<button class="primary big">Démarrer la séance guidée →</button>`);
    b.addEventListener("click", () => { LIVE = null; nav("train"); });
    c.append(b);
  } else {
    c.append(h(`<div class="small">Jour de repos : marche, mobilité ou récupération active. Reviens demain 💪</div>`));
  }
  v.append(c);

  // KPIs
  const logs = Etat.data.logs;
  const nbSem = logs.filter((l) => Date.now() - new Date(l.date).getTime() < 7 * 864e5).length;
  const volume = logs.reduce((a, l) => a + volumeLog(l), 0);
  const g = h(`<div class="grid2"></div>`);
  g.append(kpi("Séances (7 j)", `${nbSem} / ${prog.seances.length}`));
  g.append(kpi("Séances totales", `${logs.length}`));
  v.append(g);

  v.append(h(`<div class="notice small">${esc(prog.justificationGlobale)}</div>`));
  v.append(h(`<div class="warn small">⚕️ Rappel : douleur vive, articulaire ou inhabituelle = on arrête le mouvement. Cette app ne pose aucun diagnostic médical.</div>`));
}
function kpi(lab, val) { return h(`<div class="card kpi"><span class="lab">${esc(lab)}</span><b class="num">${esc(val)}</b></div>`); }

/* ======================================================================
   PROGRAMME
   ====================================================================== */
let EDIT_ROUTINE = null; // id de la routine en cours d'édition (onglet Programme)

function vProg(v) {
  if (EDIT_ROUTINE) { vRoutineEditor(v, EDIT_ROUTINE); return; }
  const prog = Etat.data.programme;
  v.append(h(`<div class="spread"><h1>Programme</h1><span class="badge accent">${splitLabel(prog.split)}</span></div>`));
  v.append(h(`<div class="muted small" style="margin-bottom:8px">${esc(prog.justificationGlobale)}</div>`));
  const bCat = h(`<button class="chip" style="margin-bottom:8px">🔎 Rechercher dans le catalogue d'exercices</button>`);
  bCat.addEventListener("click", () => nav("cat"));
  v.append(bCat);
  prog.seances.forEach((s) => {
    const d = h(`<details><summary>${esc(s.nom)}<span class="pill">${s.exercices.length} exos</span></summary></details>`);
    s.exercices.forEach((e, i) => d.append(ligneExo(e, i)));
    v.append(d);
  });

  // ---- Mes routines (programmes créés à la main, illimités) ----
  v.append(h(`<h2 style="margin:18px 0 2px">Mes routines</h2>`));
  v.append(h(`<div class="muted small" style="margin-bottom:8px">Crée tes propres programmes, séances et exercices — sans limite. Ils apparaissent aussi dans l'onglet Séance.</div>`));
  (Etat.data.programmesPerso || []).forEach((r) => {
    const nbEx = r.seances.reduce((a, s) => a + s.exercices.length, 0);
    const card = h(`<div class="card"><div class="spread"><b>${esc(r.nom)}</b><span class="pill">${r.seances.length} séance(s)</span></div><div class="muted small">${nbEx} exercice(s)</div></div>`);
    const acts = h(`<div class="row" style="margin-top:8px"></div>`);
    const bOpen = h(`<button class="chip">✏️ Ouvrir</button>`);
    bOpen.addEventListener("click", () => { EDIT_ROUTINE = r.id; render(); });
    const bDup = h(`<button class="chip">📄 Dupliquer</button>`);
    bDup.addEventListener("click", () => { Etat.data.programmesPerso.push(dupliquerRoutine(r)); Etat.sauver(); render(); });
    const bDel = h(`<button class="chip danger">🗑️</button>`);
    bDel.addEventListener("click", () => { if (confirm(`Supprimer la routine « ${r.nom} » ?`)) { Etat.data.programmesPerso = Etat.data.programmesPerso.filter((x) => x.id !== r.id); Etat.sauver(); render(); } });
    acts.append(bOpen, bDup, bDel); card.append(acts);
    v.append(card);
  });
  const barre = h(`<div class="row" style="margin-top:8px"></div>`);
  const bNew = h(`<button class="primary">➕ Nouvelle routine</button>`);
  bNew.addEventListener("click", () => {
    const nom = prompt("Nom de la routine :", "Ma routine");
    if (nom === null) return;
    const r = creerRoutine(nom);
    (Etat.data.programmesPerso ||= []).push(r);
    Etat.sauver(); EDIT_ROUTINE = r.id; render();
  });
  const bFromLog = h(`<button class="chip">📥 Depuis une séance passée</button>`);
  bFromLog.addEventListener("click", dupliquerSeancePassee);
  barre.append(bNew, bFromLog);
  v.append(barre);
}

/** Éditeur d'une routine perso (séances, exercices, séries). */
function vRoutineEditor(v, routineId) {
  const r = (Etat.data.programmesPerso || []).find((x) => x.id === routineId);
  if (!r) { EDIT_ROUTINE = null; render(); return; }
  const head = h(`<div class="spread"><button class="chip" id="back">← Retour</button><button class="chip" id="ren">✏️ Renommer</button></div>`);
  v.append(head);
  v.append(h(`<h1 style="margin:6px 0">${esc(r.nom)}</h1>`));
  $("#back", v).addEventListener("click", () => { EDIT_ROUTINE = null; render(); });
  $("#ren", v).addEventListener("click", () => { const n = prompt("Nom de la routine :", r.nom); if (n !== null) { renommer(r, n); Etat.sauver(); render(); } });
  if (!r.seances.length) v.append(h(`<div class="muted small">Aucune séance. Ajoute-en une pour commencer.</div>`));
  r.seances.forEach((s) => v.append(carteSeanceEditor(r, s)));
  const bAddS = h(`<button class="primary" style="margin-top:10px">➕ Ajouter une séance</button>`);
  bAddS.addEventListener("click", () => { const n = prompt("Nom de la séance :", `Séance ${r.seances.length + 1}`); if (n === null) return; ajouterSeance(r, n); Etat.sauver(); render(); });
  v.append(bAddS);
}

function carteSeanceEditor(r, s) {
  const c = h(`<details class="card" open></details>`);
  c.append(h(`<summary class="spread"><b>${esc(s.nom)}</b><span class="pill">${s.exercices.length} exos · ~${s.dureeEstimeeMin || 0} min</span></summary>`));
  const acts = h(`<div class="row" style="margin:6px 0"></div>`);
  const bRen = h(`<button class="chip">✏️ Nom</button>`);
  bRen.addEventListener("click", () => { const n = prompt("Nom de la séance :", s.nom); if (n !== null) { renommer(s, n); Etat.sauver(); render(); } });
  const bDel = h(`<button class="chip danger">🗑️ Séance</button>`);
  bDel.addEventListener("click", () => { if (confirm(`Supprimer « ${s.nom} » ?`)) { supprimerSeance(r, s.id); Etat.sauver(); render(); } });
  acts.append(bRen, bDel); c.append(acts);
  s.exercices.forEach((e, i) => c.append(ligneExoEditor(s, e, i)));
  const bAddE = h(`<button class="chip">➕ Exercice</button>`);
  bAddE.addEventListener("click", () => choisirExercice((exId) => { ajouterExercice(s, exId, { nbSeries: 3 }); Etat.sauver(); render(); }));
  c.append(bAddE);
  return c;
}

function ligneExoEditor(s, e, i) {
  const exo = getExercise(e.exerciceId);
  const t = e.series[0] || {};
  const enTemps = !!t.dureeSec;
  const row = h(`<div class="card flat" style="margin:6px 0"></div>`);
  row.append(h(`<div class="spread"><b>${i + 1}. ${esc(exo ? exo.nom : e.exerciceId)}</b></div>`));
  const ctr = h(`<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"></div>`);
  const inNb = h(`<label class="small">Séries <input type="number" min="1" max="10" value="${e.series.length}" style="width:52px" /></label>`);
  const inRepos = h(`<label class="small">Repos(s) <input type="number" min="0" max="600" step="15" value="${t.reposSec || 90}" style="width:64px" /></label>`);
  const inCible = enTemps
    ? h(`<label class="small">Durée(s) <input type="number" min="5" max="600" value="${t.dureeSec || 40}" style="width:64px" /></label>`)
    : h(`<label class="small">Reps <input type="text" value="${(t.repsCible || [8, 12]).join("-")}" placeholder="8-12" style="width:64px" /></label>`);
  ctr.append(inNb, inCible, inRepos); row.append(ctr);
  const apply = () => {
    const params = { nbSeries: parseInt(inNb.querySelector("input").value, 10) || e.series.length };
    const repos = parseInt(inRepos.querySelector("input").value, 10);
    if (Number.isFinite(repos)) params.reposSec = repos;
    if (enTemps) { params.dureeSec = parseInt(inCible.querySelector("input").value, 10) || 40; }
    else {
      const m = (inCible.querySelector("input").value || "").split(/[^0-9]+/).map(Number).filter(Boolean);
      if (m.length >= 2) params.repsCible = [m[0], m[1]]; else if (m.length === 1) params.repsCible = [m[0], m[0]];
    }
    definirSeries(e, params);
    s.dureeEstimeeMin = estimerDureeSeance(s);
    Etat.sauver();
  };
  ctr.querySelectorAll("input").forEach((inp) => inp.addEventListener("change", apply));
  const nav2 = h(`<div class="row" style="margin-top:6px"></div>`);
  const up = h(`<button class="chip">↑</button>`); up.addEventListener("click", () => { deplacerExercice(s, i, -1); Etat.sauver(); render(); });
  const down = h(`<button class="chip">↓</button>`); down.addEventListener("click", () => { deplacerExercice(s, i, 1); Etat.sauver(); render(); });
  const del = h(`<button class="chip danger">🗑️</button>`); del.addEventListener("click", () => { supprimerExerciceIndex(s, i); Etat.sauver(); render(); });
  nav2.append(up, down, del); row.append(nav2);
  return row;
}

/** Crée une routine à partir d'une séance déjà réalisée (historique). */
function dupliquerSeancePassee() {
  const logs = (Etat.data.logs || []).slice(-20).reverse();
  if (!logs.length) { alert("Aucune séance enregistrée à dupliquer pour l'instant."); return; }
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="spread"><h2 style="margin:0">Dupliquer une séance passée</h2><button class="chip" id="fx">✕</button></div>`));
  const liste = h(`<div class="stack"></div>`); inner.append(liste);
  logs.forEach((l) => {
    const d = new Date(l.date).toLocaleDateString("fr-FR");
    const b = h(`<button class="big" style="justify-content:space-between;text-align:left;margin:4px 0"><span><b>${esc(l.seanceNom || "Séance")}</b><br><span class="muted small">${d} · ${(l.exercices || []).length} exercice(s)</span></span></button>`);
    b.addEventListener("click", () => {
      sheet.remove();
      const nom = prompt("Nom de la nouvelle routine :", `${l.seanceNom || "Séance"} (copie)`);
      if (nom === null) return;
      const r = creerRoutine(nom);
      r.seances.push(seanceDepuisLog(l, l.seanceNom));
      (Etat.data.programmesPerso ||= []).push(r);
      Etat.sauver(); EDIT_ROUTINE = r.id; render();
    });
    liste.append(b);
  });
  sheet.querySelector("#fx").addEventListener("click", () => sheet.remove());
  document.body.append(sheet);
}
function splitLabel(s) { return ({ full_body: "Corps entier", haut_bas: "Haut / Bas", push_pull_legs: "Push · Pull · Legs", mobilite: "Mobilité" }[s] || s); }
function ligneExo(e, i) {
  const exo = getExercise(e.exerciceId);
  const t = e.series.find((s) => s.type === "travail") || e.series[0];
  const cible = t?.dureeSec ? `${t.dureeSec} s` : t?.repsCible ? `${t.repsCible[0]}–${t.repsCible[1]} reps` : "";
  const nb = e.series.filter((s) => s.type !== "echauffement").length;
  const row = h(`<div class="exline">
    <div class="idx">${i + 1}</div>
    <div class="meta"><div class="nm">${esc(exo.nom)}</div>
      <div class="muted small">${nb} × ${cible} · repos ${t?.reposSec || 60}s · ${esc(e.role)}</div>
      <div class="muted small">${esc(e.justification)}</div></div>
    <button class="chip" aria-label="Détails">ℹ️</button></div>`);
  row.querySelector("button").addEventListener("click", () => ouvrirDetail(exo));
  return row;
}
const DIFF_LABEL = ["", "Grand débutant", "Débutant", "Intermédiaire", "Avancé"];
function estRealisable(exo) {
  const eq = new Set(Etat.data.profil.equipements);
  const okEquip = exo.equipement.every((e) => eq.has(e));
  const contre = (exo.contreIndications || []).some((c) => Etat.data.profil.limitations.includes(c));
  return okEquip && !contre;
}

/** Planche anatomique wger avec repli propre (liste de muscles) si hors ligne. */
function diagrammeMuscles(exo) {
  const wrap = h(`<div>${muscleDiagram(exo.musclesPrincipaux || [], exo.musclesSecondaires || [])}</div>`);
  let repli = false;
  wrap.querySelectorAll("img.base").forEach((img) => img.addEventListener("error", () => {
    if (repli) return; repli = true;
    wrap.innerHTML = `<div class="hint" style="text-align:center;padding:8px 0">Planche anatomique en cours de chargement (ou indisponible hors ligne).</div>`;
  }));
  return wrap;
}

/** Fiche démonstration PREMIUM (feuille plein écran). */
function ouvrirDetail(exo) {
  const P = new Set(exo.musclesPrincipaux || []), Sec = new Set(exo.musclesSecondaires || []);
  const alts = alternatives(exo.id, Etat.data.profil);
  const diff = exo.difficulte || 2;
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const fermer = () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); sheet.remove(); };

  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">${esc(exo.nom)}</h2><button class="chip" id="x">✕ Fermer</button></div>`));

  const media = h(`<div class="media"><div class="spin"></div></div>`);
  inner.append(media);

  inner.append(h(`<div class="row" style="margin-top:10px">
    <span class="difbar" title="Difficulté">${[1, 2, 3, 4].map((i) => `<i class="${i <= diff ? "on" : ""}"></i>`).join("")}</span>
    <span class="pill">${DIFF_LABEL[diff] || "—"}</span>
    ${exo.equipement.map((e) => `<span class="pill">${esc(EQUIPMENT_LABELS[e] || e)}</span>`).join("")}</div>`));

  if (!estRealisable(exo)) inner.append(h(`<div class="warn small">⚠️ Pas réalisable avec ton matériel / tes limitations actuels — vois « Remplacement intelligent » ci-dessous.</div>`));

  // Planche anatomique professionnelle (wger) + légende nommée
  const anat = h(`<div class="sec"><h3>Muscles sollicités</h3></div>`);
  anat.append(diagrammeMuscles(exo));
  const legende = [
    ...(exo.musclesPrincipaux || []).map((m) => `<span class="pill" style="background:#E5484D;color:#fff">${esc(MUSCLE_LABELS[m] || m)}</span>`),
    ...(exo.musclesSecondaires || []).map((m) => `<span class="pill" style="background:#F5A524;color:#fff">${esc(MUSCLE_LABELS[m] || m)}</span>`),
  ].join("");
  anat.append(h(`<div class="leg">${legende}</div>`));
  inner.append(anat);

  if ((exo.instructions || []).length) inner.append(h(`<div class="sec"><h3>Étapes du mouvement</h3><ol class="small">${exo.instructions.map((x) => `<li>${esc(x)}</li>`).join("")}</ol></div>`));
  if (exo.respiration) inner.append(h(`<div class="sec"><h3>Respiration</h3><div class="breath"><span class="in">↧ Inspirer</span><span class="out">↥ Expirer</span></div><div class="small muted" style="margin-top:6px">${esc(exo.respiration)}</div></div>`));
  if ((exo.erreurs || []).length) inner.append(h(`<div class="sec"><h3>Erreurs fréquentes</h3><div class="small muted">✖ ${exo.erreurs.map(esc).join(" · ")}</div></div>`));
  if (exo.securite) inner.append(h(`<div class="sec"><h3>Sécurité</h3><div class="warn small">🛟 ${esc(exo.securite)}</div></div>`));

  if (alts.length) {
    const s = h(`<div class="sec"><h3>Remplacement intelligent</h3></div>`);
    alts.forEach((a) => {
      const card = h(`<div class="altcard"><div class="spread"><b class="small">${esc(a.etiquette)}</b><button class="chip" data-alt="${esc(a.exercice.id)}">Ouvrir</button></div><div class="small">${esc(a.exercice.nom)} — <span class="muted">${esc(a.explication)}</span></div></div>`);
      card.querySelector("[data-alt]").addEventListener("click", () => { fermer(); ouvrirDetail(getExercise(a.exercice.id)); });
      s.append(card);
    });
    inner.append(s);
  }

  sheet.querySelector("#x").addEventListener("click", fermer);
  document.body.append(sheet);
  chargerMedia(exo, media);
}

/** Charge le média (GIF/vidéo) avec cache local, repli anatomie. */
async function chargerMedia(exo, media) {
  const heroAnatomie = () => {
    media.style.aspectRatio = "auto"; media.innerHTML = "";
    const box = h(`<div style="padding:14px;width:100%"></div>`);
    box.append(diagrammeMuscles(exo));
    const btn = h(`<button class="chip" style="margin:10px auto 0;display:block">🔄 Recharger la démonstration</button>`);
    btn.addEventListener("click", () => {
      delete Etat.data.mediaCache[exo.id]; Etat.sauver();
      media.style.aspectRatio = ""; media.innerHTML = `<div class="spin"></div>`;
      chargerMedia(exo, media);
    });
    box.append(btn);
    media.append(box);
  };
  // Source PRINCIPALE : dataset GitHub (hasaneyldrm/exercises-dataset), puis
  // photo wger. Repli en ligne : ExerciseDB open-source gratuit (best-effort).
  let url = Etat.data.mediaCache[exo.id] || GIFS[exo.id] || (exo.media && exo.media.miniature) || null;
  if (!url) {
    const res = await chercherDemonstration(exo.id, {});
    if (res && res.gifUrl) { url = res.gifUrl; Etat.data.mediaCache[exo.id] = url; Etat.sauver(); }
  }
  if (!media.isConnected) return;           // feuille fermée entre-temps
  if (!url) { heroAnatomie(); return; }

  const estVideo = /\.(mp4|webm|mov)$/i.test(url);
  const el = estVideo ? h(`<video autoplay loop muted playsinline></video>`) : h(`<img alt="Démonstration : ${esc(exo.nom)}">`);
  el.addEventListener(estVideo ? "loadeddata" : "load", () => media.querySelector(".spin")?.remove());
  el.addEventListener("error", heroAnatomie);
  el.src = url;
  media.insertBefore(el, media.firstChild);
  media.append(controlesMedia(media, el, estVideo));
}

function controlesMedia(media, el, estVideo) {
  const bar = h(`<div class="ctrls"></div>`);
  let paused = false, canvas = null;
  const bPause = h(`<button title="Lecture / pause">⏸</button>`);
  bPause.addEventListener("click", () => {
    if (estVideo) { if (el.paused) { el.play(); bPause.textContent = "⏸"; } else { el.pause(); bPause.textContent = "▶"; } return; }
    if (!paused) { // figer le GIF sur la frame courante
      canvas = document.createElement("canvas");
      canvas.width = el.naturalWidth || 320; canvas.height = el.naturalHeight || 320;
      canvas.style.cssText = "width:100%;height:100%;object-fit:contain";
      try { canvas.getContext("2d").drawImage(el, 0, 0, canvas.width, canvas.height); } catch (e) {}
      el.style.display = "none"; media.insertBefore(canvas, media.firstChild); paused = true; bPause.textContent = "▶";
    } else { canvas?.remove(); el.style.display = ""; paused = false; bPause.textContent = "⏸"; }
  });
  const bFs = h(`<button title="Plein écran">⛶</button>`);
  bFs.addEventListener("click", () => { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); else media.requestFullscreen?.().catch(() => {}); });
  bar.append(bPause, bFs);
  const spd = h(`<span class="spd"></span>`);
  [0.5, 1, 2].forEach((r) => {
    const b = h(`<button class="${r === 1 ? "on" : ""} ${estVideo ? "" : "dim"}">x${r}</button>`);
    b.title = estVideo ? `Vitesse ${r}×` : "Réglage de vitesse disponible pour les vidéos";
    b.addEventListener("click", () => { if (!estVideo) return; el.playbackRate = r; spd.querySelectorAll("button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); });
    spd.append(b);
  });
  bar.append(spd);
  return bar;
}

/* ======================================================================
   CATALOGUE / RECHERCHE D'EXERCICES
   ====================================================================== */
let CAT_FILTRE = { q: "", muscle: "", equip: "" };
function vCatalogue(v) {
  v.append(h(`<div class="spread"><h1>Exercices</h1><span class="pill">${CATALOGUE.length} au total</span></div>`));
  const inp = h(`<input id="catQ" placeholder="Rechercher (ex : rowing, squat, gainage…)" value="${esc(CAT_FILTRE.q)}">`);
  v.append(inp);

  const muscles = [...new Set(CATALOGUE.flatMap((e) => e.musclesPrincipaux))].sort();
  const equips = [...new Set(CATALOGUE.flatMap((e) => e.equipement))].sort();
  const filtreLigne = (items, cle, labels) => {
    const box = h(`<div class="row" style="overflow-x:auto;flex-wrap:nowrap;padding-bottom:4px"></div>`);
    const tout = h(`<button class="chip ${!CAT_FILTRE[cle] ? "on" : ""}">Tous</button>`);
    tout.addEventListener("click", () => { CAT_FILTRE[cle] = ""; render(); });
    box.append(tout);
    for (const it of items) {
      const b = h(`<button class="chip ${CAT_FILTRE[cle] === it ? "on" : ""}">${esc(labels[it] || it)}</button>`);
      b.addEventListener("click", () => { CAT_FILTRE[cle] = CAT_FILTRE[cle] === it ? "" : it; render(); });
      box.append(b);
    }
    return box;
  };
  v.append(h(`<div class="eyebrow" style="margin-top:10px">Muscle</div>`));
  v.append(filtreLigne(muscles, "muscle", MUSCLE_LABELS));
  v.append(h(`<div class="eyebrow" style="margin-top:8px">Matériel</div>`));
  v.append(filtreLigne(equips, "equip", EQUIPMENT_LABELS));

  const res = h(`<div id="catRes" style="margin-top:10px"></div>`);
  v.append(res);
  const dessine = () => {
    const list = chercherCatalogue(CAT_FILTRE).slice(0, 80);
    res.innerHTML = "";
    if (!list.length) { res.append(h(`<div class="notice small">Aucun exercice ne correspond. Élargis les filtres.</div>`)); return; }
    res.append(h(`<div class="muted small" style="margin-bottom:4px">${list.length} résultat(s)</div>`));
    for (const e of list) {
      const row = h(`<div class="exline">
        <div class="meta"><div class="nm">${esc(e.nom)}</div>
          <div class="muted small">${e.musclesPrincipaux.map((m) => MUSCLE_LABELS[m] || m).join(", ")} · ${e.equipement.map((q) => EQUIPMENT_LABELS[q] || q).join(", ")}${e.source === "wger" ? ` · <span class="tag">wger</span>` : ""}</div></div>
        <button class="chip">ℹ️</button></div>`);
      row.querySelector("button").addEventListener("click", () => ouvrirDetail(e));
      res.append(row);
    }
  };
  dessine();
  inp.addEventListener("input", () => { CAT_FILTRE.q = inp.value; dessine(); });
}

/* ======================================================================
   SÉANCE GUIDÉE (mode entraînement)
   ====================================================================== */
let LIVE = null; // état live (voir engine/liveSession.js)

/**
 * Persiste la séance en cours dans l'état (donc IndexedDB) pour pouvoir la
 * reprendre après une actualisation ou une fermeture accidentelle. Débattu
 * pour ne pas écrire à chaque frappe ; `immediat` force l'écriture tout de suite.
 */
let _timerLive = null;
function persistLive(immediat = false) {
  Etat.data.sessionEnCours = LIVE ? serialiser(LIVE) : null;
  if (immediat) { if (_timerLive) { clearTimeout(_timerLive); _timerLive = null; } Etat.sauver(); return; }
  if (_timerLive) clearTimeout(_timerLive);
  _timerLive = setTimeout(() => { _timerLive = null; Etat.sauver(); }, 300);
}
// Sauvegarde immédiate si l'onglet passe en arrière-plan ou se ferme.
window.addEventListener("pagehide", () => { if (LIVE) persistLive(true); });
document.addEventListener("visibilitychange", () => { if (LIVE && document.visibilityState === "hidden") persistLive(true); });

function vTrain(v) {
  const prog = Etat.data.programme;
  // Reprise d'une séance interrompue (après actualisation / fermeture).
  if (!LIVE && estReprenable(Etat.data.sessionEnCours, trouverSeance)) LIVE = restaurer(Etat.data.sessionEnCours);
  if (!LIVE) {
    const sj = seanceDuJour(prog);
    v.append(h(`<h1>Choisir une séance</h1>`));
    v.append(h(`<div class="notice small">Échauffe-toi 5–10 min (cardio léger + mobilité + séries d'approche sur les gros mouvements) avant de commencer.</div>`));
    prog.seances.forEach((s) => {
      const b = h(`<button class="big" style="justify-content:space-between;text-align:left;margin:8px 0;${sj && sj.id === s.id ? "border-color:var(--accent)" : ""}">
        <span><b>${esc(s.nom)}</b><br><span class="muted small">${s.exercices.length} exos · ~${s.dureeEstimeeMin} min${sj && sj.id === s.id ? " · aujourd'hui" : ""}</span></span></button>`);
      b.addEventListener("click", () => demarrer(s));
      v.append(b);
    });
    // Séances des routines perso.
    const persos = Etat.data.programmesPerso || [];
    if (persos.some((r) => r.seances.length)) {
      v.append(h(`<h3 style="margin-top:16px">Mes routines</h3>`));
      persos.forEach((r) => r.seances.forEach((s) => {
        const b = h(`<button class="big" style="justify-content:space-between;text-align:left;margin:8px 0">
          <span><b>${esc(s.nom)}</b> <span class="muted small">· ${esc(r.nom)}</span><br><span class="muted small">${s.exercices.length} exos · ~${s.dureeEstimeeMin || 0} min</span></span></button>`);
        b.addEventListener("click", () => demarrer(s));
        v.append(b);
      }));
    }
    return;
  }
  const seance = trouverSeance(LIVE.seanceId);
  if (!seance) { LIVE = null; persistLive(true); render(); return; }
  v.append(h(`<div class="spread"><h1 style="margin:0">${esc(seance.nom)}</h1><button class="chip" id="abandon">Abandonner</button></div>`));
  v.append(h(`<div class="muted small">Séance en cours · sauvegarde automatique 💾 (reprise possible après fermeture)</div>`));
  seance.exercices.forEach((e) => v.append(carteExoLive(e)));
  const bAdd = h(`<button class="chip" style="margin-top:8px">➕ Ajouter un exercice</button>`);
  bAdd.addEventListener("click", () => ajouterExerciceLive(seance));
  v.append(bAdd);
  const fin = h(`<button class="primary big" style="margin-top:12px">Terminer et enregistrer</button>`);
  fin.addEventListener("click", terminer);
  v.append(fin);
  $("#abandon", v).addEventListener("click", () => { if (confirm("Abandonner la séance sans enregistrer ?")) { LIVE = null; persistLive(true); render(); } });
}
function demarrer(seance) {
  LIVE = nouvelleSession(seance);
  persistLive(true);
  render();
}
function carteExoLive(e) {
  const st = LIVE.data[e.exerciceId];
  const exo = getExercise(st.exId);
  const t = e.series.find((s) => s.type === "travail") || e.series[0];
  const plage = t?.repsCible || exo.repsPertinent;
  const [derniere, avant] = Etat.perfs(st.exId);
  const sug = recommander(st.exId, plage, derniere || null, avant || null);
  const enTemps = !!st.series[0]?.dureeSec;
  const c = h(`<div class="card stack"></div>`);
  c.append(h(`<div class="spread"><h3 style="margin:0">${esc(exo.nom)}</h3><span class="pill">${st.series.length} × ${enTemps ? (st.series[0].dureeSec + " s") : (plage[0] + "–" + plage[1])}</span></div>`));
  c.append(h(`<div class="muted small">${(exo.musclesPrincipaux || []).map((m) => MUSCLE_LABELS[m] || m).join(", ")} · repos ${t?.reposSec || 60}s</div>`));
  c.append(h(`<div class="notice small"><b>Conseil :</b> ${esc(sug.message)}${sug.chargeKg ? ` <b>(~${sug.chargeKg} kg)</b>` : ""}</div>`));
  if (derniere) c.append(h(`<div class="muted small">Dernière fois : ${derniere.series.map((s) => `${s.chargeKg || 0}kg×${s.reps || s.dureeSec || 0}`).join(" · ")}</div>`));
  // en-têtes
  c.append(h(`<div class="setrow"><span class="head">#</span><span class="head">kg</span><span class="head">${enTemps ? "sec" : "reps"}</span><span class="head">RIR</span><span class="head"></span></div>`));
  st.series.forEach((s, i) => {
    const row = h(`<div class="setrow">
      <span class="num muted" style="text-align:center">${i + 1}</span>
      <input inputmode="decimal" placeholder="${sug.chargeKg || "—"}" value="${s.charge}" data-f="charge">
      <input inputmode="numeric" placeholder="${enTemps ? s.dureeSec : plage[0]}" value="${enTemps ? s.dureeSec : s.reps}" data-f="${enTemps ? "dureeSec" : "reps"}">
      <input inputmode="numeric" placeholder="2" value="${s.rir}" data-f="rir">
      <button class="done ${s.done ? "on" : ""}" aria-label="Valider la série">✓</button></div>`);
    on(row, "input", "input", (ev) => { const f = ev.target.dataset.f; s[f] = ev.target.value; persistLive(); });
    row.querySelector(".done").addEventListener("click", (ev) => { s.done = !s.done; ev.target.classList.toggle("on", s.done); persistLive(); if (s.done) startTimer(t?.reposSec || 60); });
    c.append(row);
  });
  // Ajouter / retirer une série pendant la séance.
  const serieActs = h(`<div class="row"></div>`);
  const bPlus = h(`<button class="chip">+ série</button>`);
  bPlus.addEventListener("click", () => { ajouterSerie(st); persistLive(true); render(); });
  serieActs.append(bPlus);
  if (st.series.length > 1) {
    const bMoins = h(`<button class="chip">− série</button>`);
    bMoins.addEventListener("click", () => { retirerDerniereSerie(st); persistLive(true); render(); });
    serieActs.append(bMoins);
  }
  c.append(serieActs);
  const acts = h(`<div class="row"></div>`);
  const bDouleur = h(`<button class="chip ${st.douleur ? "danger" : ""}">${st.douleur ? "⚠️ Douleur signalée" : "Signaler une douleur"}</button>`);
  bDouleur.addEventListener("click", () => { st.douleur = !st.douleur; persistLive(true); if (st.douleur) alert("Douleur vive, articulaire ou inhabituelle : arrête cet exercice aujourd'hui. Si elle persiste, consulte un professionnel de santé."); render(); });
  const bRempl = h(`<button class="chip">🔄 Remplacer</button>`);
  bRempl.addEventListener("click", () => remplacer(e.exerciceId));
  const bRetirer = h(`<button class="chip">🗑️ Retirer</button>`);
  bRetirer.addEventListener("click", () => { if (confirm(`Retirer « ${exo.nom} » de la séance ?`)) retirerExerciceLive(e.exerciceId); });
  acts.append(bDouleur, bRempl, bRetirer);
  c.append(acts);
  return c;
}
/** Ajoute un exercice au vol pendant la séance (choix dans le catalogue). */
function ajouterExerciceLive(seance) {
  choisirExercice((exId) => {
    if (LIVE.data[exId]) { alert("Cet exercice est déjà dans la séance."); return; }
    const e = ajouterExercice(seance, exId, { nbSeries: 3 });
    if (!e) return;
    const enTemps = e.series.some((s) => s.dureeSec);
    const nb = e.series.filter((s) => s.type !== "echauffement").length || 3;
    LIVE.data[exId] = {
      exId,
      series: Array.from({ length: nb }, () => ({ charge: "", reps: "", rir: "", dureeSec: enTemps ? (e.series.find((s) => s.dureeSec)?.dureeSec || 40) : null, done: false })),
      douleur: false,
    };
    persistLive(true); render();
  });
}
/** Retire un exercice de la séance en cours (et de son gabarit). */
function retirerExerciceLive(exId) {
  const seance = trouverSeance(LIVE.seanceId);
  const idx = seance.exercices.findIndex((x) => x.exerciceId === exId);
  if (idx >= 0) supprimerExerciceIndex(seance, idx);
  delete LIVE.data[exId];
  persistLive(true); render();
}
/**
 * Feuille de sélection d'un exercice du catalogue. Appelle `onPick(exerciceId)`.
 * Réutilisée par la séance active et par le builder de routines.
 */
function choisirExercice(onPick) {
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="spread"><h2 style="margin:0">Choisir un exercice</h2><button class="chip" id="fermerPick">✕</button></div>`));
  const search = h(`<input type="search" placeholder="Rechercher (développé, squat, dos…)" style="width:100%;margin:8px 0" />`);
  inner.append(search);
  const liste = h(`<div class="stack"></div>`);
  inner.append(liste);
  const fermer = () => sheet.remove();
  const refresh = () => {
    liste.innerHTML = "";
    const res = chercherCatalogue({ q: search.value }).slice(0, 40);
    if (!res.length) { liste.append(h(`<div class="muted small">Aucun exercice trouvé.</div>`)); return; }
    res.forEach((exo) => {
      const b = h(`<button class="big" style="justify-content:space-between;text-align:left;margin:4px 0">
        <span><b>${esc(exo.nom)}</b><br><span class="muted small">${(exo.musclesPrincipaux || []).map((m) => MUSCLE_LABELS[m] || m).join(", ")}</span></span></button>`);
      b.addEventListener("click", () => { fermer(); onPick(exo.id); });
      liste.append(b);
    });
  };
  search.addEventListener("input", refresh);
  sheet.querySelector("#fermerPick").addEventListener("click", fermer);
  refresh();
  document.body.append(sheet);
  search.focus();
}
function remplacer(exId) {
  const seance = trouverSeance(LIVE.seanceId);
  const presents = seance.exercices.map((x) => x.exerciceId);
  const alts = alternatives(exId, Etat.data.profil, presents);
  if (!alts.length) { alert("Aucune alternative compatible trouvée avec ton matériel et tes contraintes."); return; }
  const choix = prompt("Remplacer par :\n" + alts.map((a, i) => `${i + 1}. ${a.etiquette} — ${a.exercice.nom}`).join("\n") + "\n\nNuméro (1-" + alts.length + ") :", "1");
  const idx = (parseInt(choix, 10) || 0) - 1;
  if (idx < 0 || idx >= alts.length) return;
  const nouvel = alts[idx].exercice;
  // remplace dans le programme ET dans la séance en cours
  const ex = seance.exercices.find((x) => x.exerciceId === exId);
  ex.exerciceId = nouvel.id; ex.justification = `Remplacement choisi : ${alts[idx].explication}`;
  const anc = LIVE.data[exId]; delete LIVE.data[exId];
  LIVE.data[nouvel.id] = { ...anc, exId: nouvel.id };
  persistLive(true); render();
}
function terminer() {
  const seance = trouverSeance(LIVE.seanceId);
  const exercices = [];
  for (const exId in LIVE.data) {
    const st = LIVE.data[exId];
    const series = st.series.filter((s) => s.done || s.reps || s.charge || s.dureeSec)
      .map((s) => ({ chargeKg: s.charge === "" ? null : +s.charge, reps: s.reps === "" ? null : +s.reps, rir: s.rir === "" ? null : +s.rir, dureeSec: s.dureeSec || null }));
    if (series.length || st.douleur) exercices.push({ exerciceId: exId, series, douleur: st.douleur });
  }
  const fin = new Date().toISOString();
  const debut = LIVE.debut || fin;
  const nouveauLog = {
    id: Etat.uid(), date: fin, debut, fin,
    dureeSec: dureeSecondes(debut, fin),
    seanceId: seance.id, seanceNom: seance.nom, exercices,
  };
  // Détecte les nouveaux records AVANT d'ajouter la séance à l'historique.
  const prs = detecterRecords(Etat.data.logs, nouveauLog, nomExo);
  Etat.data.logs.push(nouveauLog);
  LIVE = null;
  Etat.data.sessionEnCours = null; // séance terminée : plus rien à reprendre
  Etat.sauver();
  let msg = "Séance enregistrée 💪 Les suggestions de charge sont mises à jour pour la prochaine fois.";
  if (prs.length) {
    msg += "\n\n🏆 Nouveau" + (prs.length > 1 ? "x records !" : " record !") + "\n"
      + prs.map((r) => `• ${r.nom} : ${etiquettePR(r)}`).join("\n");
  }
  alert(msg);
  nav("dash");
}
/** Libellé court d'un record (poids, reps ou 1RM estimé). */
function etiquettePR(r) {
  if (r.type === "poids") return `${r.valeur} kg (avant ${r.ancien} kg)`;
  if (r.type === "reps") return `${r.valeur} reps (avant ${r.ancien})`;
  return `1RM estimé ${r.valeur} kg (avant ${r.ancien} kg)`;
}

/* ---------- minuteur de repos ---------- */
let TMR = null;
let CAL_VIEW = null; // {annee, mois} du calendrier d'assiduité affiché (Progrès)
function startTimer(sec) {
  const ov = $("#overlay"); ov.classList.add("show");
  let total = sec, left = sec;
  const draw = () => { $("#ovTxt").textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`; $("#ringFg").style.strokeDashoffset = String(653 * (1 - left / total)); };
  draw(); clearInterval(TMR);
  TMR = setInterval(() => { left--; if (left <= 0) { stopTimer(); try { navigator.vibrate?.(200); } catch (e) {} return; } draw(); }, 1000);
  $("#ovPlus").onclick = () => { left += 15; total = Math.max(total, left); draw(); };
  $("#ovMinus").onclick = () => { left = Math.max(1, left - 15); draw(); };
  $("#ovSkip").onclick = stopTimer;
}
function stopTimer() { clearInterval(TMR); $("#overlay").classList.remove("show"); }

/* ======================================================================
   NUTRITION (Open Food Facts + base locale)
   ====================================================================== */
function vNutrition(v) {
  const p = Etat.data.profil;
  const b = calculerBesoins(p);
  const jour = todayStr();
  const log = Etat.data.foodlog[jour] || [];
  const tot = log.reduce((a, f) => ({ kcal: a.kcal + f.kcal, p: a.p + f.p, c: a.c + f.c, l: a.l + f.l }), { kcal: 0, p: 0, c: 0, l: 0 });

  v.append(h(`<h1>Nutrition</h1>`));
  // Objectifs du jour
  const cible = h(`<div class="card stack">
    <div class="spread"><h2 style="margin:0">Objectifs du jour</h2><span class="badge ${tot.kcal > b.kcal * 1.07 ? "amber" : "ok"}">${Math.round(tot.kcal)} / ${b.kcal} kcal</span></div>
    <div class="bar lime"><div style="width:${Math.min(100, Math.round(tot.kcal / b.kcal * 100))}%"></div></div>
    <table>
      <tr><td>Protéines</td><td class="num">${Math.round(tot.p)} / ${b.prot} g</td></tr>
      <tr><td>Glucides</td><td class="num">${Math.round(tot.c)} / ${b.gluc} g</td></tr>
      <tr><td>Lipides</td><td class="num">${Math.round(tot.l)} / ${b.lip} g</td></tr>
      <tr><td>Eau</td><td class="num">~${b.eau} L</td></tr>
    </table>
    <div class="hint">Estimation Mifflin-St Jeor : BMR ${b.bmr} × activité ${b.facteur} = ~${b.tdee} kcal, ajusté selon ton objectif. On affine selon la tendance de poids sur 1–2 semaines, jamais sur une seule pesée. Ceci n'est pas un avis diététique médical.</div>
  </div>`);
  v.append(cible);

  // Journal + recherche
  const cj = h(`<div class="card stack"><h2 style="margin:0">Journal du jour</h2></div>`);
  const rowSearch = h(`<div class="row"><input id="foodQ" placeholder="Rechercher un aliment (riz, poulet…)" style="flex:1"><button class="primary" id="foodGo">OK</button></div>`);
  const rowCode = h(`<div class="row"><input id="foodCode" inputmode="numeric" placeholder="Code-barres" style="flex:1"><button id="codeGo">Scanner</button></div>`);
  const res = h(`<div id="foodRes"></div>`);
  const logBox = h(`<div id="foodLog" style="margin-top:6px"></div>`);
  cj.append(rowSearch, rowCode, res, h(`<hr style="border:none;border-top:1px solid var(--line);margin:6px 0">`), logBox);
  v.append(cj);

  const ajouter = (f, g) => {
    const m = portion(f, g);
    (Etat.data.foodlog[jour] ||= []).push({ name: f.n, g, ...m, src: f.src });
    Etat.sauver(); render();
  };
  const afficherResultats = (list) => {
    res.innerHTML = "";
    if (!list.length) { res.append(h(`<div class="muted small" style="margin-top:6px">Aucun résultat.</div>`)); return; }
    for (const f of list.slice(0, 12)) {
      const line = h(`<div class="exline"><div class="meta"><div class="nm small">${esc(f.n)} <span class="tag">${esc(f.src)}${f.note ? " · " + esc(f.note) : ""}</span></div>
        <div class="muted small">${f.kcal} kcal · P${f.p} · G${f.c} · L${f.l} /100 g</div></div>
        <button class="chip">+ Ajouter</button></div>`);
      line.querySelector("button").addEventListener("click", () => {
        const g = prompt(`Quantité en grammes pour « ${f.n} » :`, "100");
        if (g && +g > 0) ajouter(f, +g);
      });
      res.append(line);
    }
  };
  const dessinerLog = () => {
    const lg = Etat.data.foodlog[jour] || [];
    logBox.innerHTML = "";
    if (!lg.length) { logBox.append(h(`<div class="muted small">Rien d'enregistré aujourd'hui.</div>`)); return; }
    lg.forEach((f, i) => {
      const line = h(`<div class="exline"><div class="meta"><div class="nm small">${esc(f.name)} <span class="muted">· ${f.g} g</span></div>
        <div class="muted small">${f.kcal} kcal · P${f.p}</div></div><button class="chip">✕</button></div>`);
      line.querySelector("button").addEventListener("click", () => { Etat.data.foodlog[jour].splice(i, 1); Etat.sauver(); render(); });
      logBox.append(line);
    });
  };
  dessinerLog();

  $("#foodGo", v).addEventListener("click", async () => {
    const q = $("#foodQ", v).value.trim(); if (!q) return;
    let liste = chercherFoods(q);
    afficherResultats(liste.length ? liste : [{ n: "Recherche en ligne…", kcal: 0, p: 0, c: 0, l: 0, src: "info" }]);
    const enligne = await offRechercher(q);
    afficherResultats([...liste, ...enligne]);
  });
  $("#codeGo", v).addEventListener("click", async () => {
    const code = $("#foodCode", v).value.trim(); if (!code) return;
    res.innerHTML = `<div class="muted small" style="margin-top:6px">Recherche du produit…</div>`;
    const prod = await parCodeBarres(code);
    afficherResultats(prod ? [prod] : []);
    if (!prod) res.innerHTML = `<div class="notice small">Produit introuvable ou hors ligne : utilise la recherche par nom (base locale).</div>`;
  });

  v.append(h(`<div class="warn small">⚕️ Repères nutritionnels généraux, pas un régime médical. En cas de pathologie, trouble alimentaire ou doute, consulte un professionnel de santé ou un diététicien.</div>`));
}

/* ======================================================================
   PROGRÈS
   ====================================================================== */
/* ---------- graphique de progression interactif ---------- */
const CHAMPS_CORPS = [
  { cle: "poidsKg", label: "Poids du corps (kg)" },
  { cle: "taille", label: "Tour de taille (cm)" },
  { cle: "poitrine", label: "Poitrine (cm)" },
  { cle: "bras", label: "Bras (cm)" },
  { cle: "cuisse", label: "Cuisse (cm)" },
];
const PERIODES = [{ j: 0, label: "Tout" }, { j: 30, label: "30 j" }, { j: 90, label: "90 j" }, { j: 180, label: "6 mois" }];
let PROG_CHART = { type: "exercice", exerciceId: null, metrique: "1rm", champCorps: "poidsKg", periode: 0 };

function carteProgression(v) {
  const logs = Etat.data.logs;
  const exos = [...new Set(logs.flatMap((l) => (l.exercices || []).map((e) => e.exerciceId)))];
  const aCorps = (Etat.data.metrics || []).some((m) => CHAMPS_CORPS.some((c) => m[c.cle] != null));
  if (!exos.length && !aCorps) return; // rien à tracer pour l'instant
  if (PROG_CHART.type === "exercice" && !exos.length) PROG_CHART.type = "corps";
  if (!PROG_CHART.exerciceId || !exos.includes(PROG_CHART.exerciceId)) PROG_CHART.exerciceId = exos[0] || null;

  const card = h(`<div class="card stack"><h2 style="margin:0">Progression</h2></div>`);
  const ctr = h(`<div class="row" style="flex-wrap:wrap;gap:6px;align-items:center"></div>`);
  const zone = h(`<div></div>`);
  card.append(ctr, zone);
  v.append(card);

  const opt = (val, lab, sel) => `<option value="${esc(String(val))}"${sel ? " selected" : ""}>${esc(lab)}</option>`;

  const rebuild = () => {
    ctr.innerHTML = "";
    // sélecteur de type (si les deux existent)
    if (exos.length && aCorps) {
      const selType = h(`<select aria-label="Type">${opt("exercice", "Exercice", PROG_CHART.type === "exercice")}${opt("corps", "Corps", PROG_CHART.type === "corps")}</select>`);
      selType.addEventListener("change", () => { PROG_CHART.type = selType.value; rebuild(); });
      ctr.append(selType);
    }
    if (PROG_CHART.type === "exercice") {
      const selExo = h(`<select aria-label="Exercice">${exos.map((id) => opt(id, nomExo(id), id === PROG_CHART.exerciceId)).join("")}</select>`);
      selExo.addEventListener("change", () => { PROG_CHART.exerciceId = selExo.value; rebuild(); });
      const selMet = h(`<select aria-label="Métrique">${METRIQUES_EXO.map((m) => opt(m.cle, m.label, m.cle === PROG_CHART.metrique)).join("")}</select>`);
      selMet.addEventListener("change", () => { PROG_CHART.metrique = selMet.value; rebuild(); });
      ctr.append(selExo, selMet);
    } else {
      const selC = h(`<select aria-label="Mesure">${CHAMPS_CORPS.map((c) => opt(c.cle, c.label, c.cle === PROG_CHART.champCorps)).join("")}</select>`);
      selC.addEventListener("change", () => { PROG_CHART.champCorps = selC.value; rebuild(); });
      ctr.append(selC);
    }
    const selP = h(`<select aria-label="Période">${PERIODES.map((p) => opt(p.j, p.label, p.j === PROG_CHART.periode)).join("")}</select>`);
    selP.addEventListener("change", () => { PROG_CHART.periode = +selP.value; rebuild(); });
    ctr.append(selP);
    redraw();
  };

  const redraw = () => {
    let points, label;
    if (PROG_CHART.type === "exercice" && PROG_CHART.exerciceId) {
      points = serieExercice(logs, PROG_CHART.exerciceId, PROG_CHART.metrique);
      const met = METRIQUES_EXO.find((m) => m.cle === PROG_CHART.metrique);
      label = `${nomExo(PROG_CHART.exerciceId)} · ${met ? met.label : ""}`;
    } else {
      points = serieCorps(Etat.data.metrics, PROG_CHART.champCorps);
      const c = CHAMPS_CORPS.find((x) => x.cle === PROG_CHART.champCorps);
      label = c ? c.label : "";
    }
    points = filtrerDepuis(points, PROG_CHART.periode);
    zone.innerHTML = svgLine(points, label);
  };

  rebuild();
}

/* ---------- calculateurs force (1RM, %, disques) ---------- */
let FORCE = { charge: "", reps: "", formule: "epley", cible: "", barre: "20" };

function carteForce(v) {
  const card = h(`<div class="card stack"><h2 style="margin:0">🏋️ Calculateurs force</h2></div>`);

  // --- 1RM estimé + table de pourcentages ---
  card.append(h(`<div class="small muted" style="margin-top:2px">1RM estimé & charges de travail</div>`));
  const l1 = h(`<div class="row" style="gap:6px;flex-wrap:wrap;align-items:center"></div>`);
  const inC = h(`<label class="small">Charge <input inputmode="decimal" placeholder="kg" value="${esc(FORCE.charge)}" style="width:64px" /></label>`);
  const inR = h(`<label class="small">Reps <input inputmode="numeric" placeholder="ex. 5" value="${esc(FORCE.reps)}" style="width:56px" /></label>`);
  const selF = h(`<select aria-label="Formule">${Object.entries(FORMULES_1RM).map(([k, f]) => `<option value="${k}"${k === FORCE.formule ? " selected" : ""}>${esc(f.label.split(" :")[0])}</option>`).join("")}</select>`);
  l1.append(inC, inR, selF); card.append(l1);
  const out1 = h(`<div style="margin-top:4px"></div>`); card.append(out1);

  const draw1 = () => {
    const kg = parseFloat(String(FORCE.charge).replace(",", ".")), reps = parseInt(FORCE.reps, 10);
    if (!(kg > 0) || !(reps > 0)) { out1.innerHTML = `<div class="muted small">Saisis une charge et des répétitions.</div>`; return; }
    const rm = estimer1RM(kg, reps, FORCE.formule);
    const tbl = tablePourcentages(rm, [95, 90, 85, 80, 75, 70, 65, 60]);
    out1.innerHTML = `<div class="notice small"><b>1RM estimé ≈ ${rm} kg</b> · ${esc(FORMULES_1RM[FORCE.formule].label)}</div>`
      + `<div class="row" style="flex-wrap:wrap;gap:4px;margin-top:6px">${tbl.map((t) => `<span class="tag">${t.pct}% · ${t.kg} kg</span>`).join("")}</div>`
      + `<div class="hint">Estimation indicative — ne teste jamais un vrai maximum en reprise.</div>`;
  };
  inC.querySelector("input").addEventListener("input", (e) => { FORCE.charge = e.target.value; draw1(); });
  inR.querySelector("input").addEventListener("input", (e) => { FORCE.reps = e.target.value; draw1(); });
  selF.addEventListener("change", (e) => { FORCE.formule = e.target.value; draw1(); });
  draw1();

  // --- calculateur de disques ---
  card.append(h(`<div class="small muted" style="margin-top:10px">Calculateur de disques (par côté)</div>`));
  const l2 = h(`<div class="row" style="gap:6px;flex-wrap:wrap;align-items:center"></div>`);
  const inCible = h(`<label class="small">Charge visée <input inputmode="decimal" placeholder="kg" value="${esc(FORCE.cible)}" style="width:70px" /></label>`);
  const inBarre = h(`<label class="small">Barre <input inputmode="decimal" value="${esc(FORCE.barre)}" style="width:56px" /></label>`);
  l2.append(inCible, inBarre); card.append(l2);
  const out2 = h(`<div style="margin-top:4px"></div>`); card.append(out2);

  const draw2 = () => {
    const cible = parseFloat(String(FORCE.cible).replace(",", ".")), barre = parseFloat(String(FORCE.barre).replace(",", ".")) || 20;
    if (!(cible > 0)) { out2.innerHTML = `<div class="muted small">Saisis la charge totale visée.</div>`; return; }
    const r = disquesParCote(cible, barre);
    if (!r.possible) { out2.innerHTML = `<div class="notice small">${esc(r.message || "Impossible.")}</div>`; return; }
    const plaques = r.parCote.length ? r.parCote.join(" + ") + " kg par côté" : "barre à vide";
    out2.innerHTML = `<div class="notice small"><b>${esc(plaques)}</b></div>`
      + `<div class="hint">Barre ${barre} kg → total réel ${r.totalReel} kg${r.exact ? "" : ` (≈ cible, reste ${r.resteKg} kg/côté non atteignable avec ces disques)`}.</div>`;
  };
  inCible.querySelector("input").addEventListener("input", (e) => { FORCE.cible = e.target.value; draw2(); });
  inBarre.querySelector("input").addEventListener("input", (e) => { FORCE.barre = e.target.value; draw2(); });
  draw2();

  v.append(card);
}

function svgLine(points, label = "") {
  if (points.length < 2) return `<div class="muted small">Pas encore assez de données (2 points minimum).</div>`;
  const W = 600, H = 150, pad = 30;
  const ys = points.map((p) => p.v), ymin = Math.min(...ys), ymax = Math.max(...ys), yr = (ymax - ymin) || 1;
  const X = (i) => pad + (W - 2 * pad) * i / (points.length - 1), Y = (val) => H - pad - (H - 2 * pad) * (val - ymin) / yr;
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.v).toFixed(1)}`).join(" ");
  const dots = points.map((p, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3" fill="var(--accent)"/>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="${esc(label)}">
    <text x="${pad}" y="15" font-size="12" fill="var(--ink-soft)">${esc(label)}</text>
    <text x="2" y="${(Y(ymax) + 4).toFixed(1)}" font-size="11" fill="var(--ink-soft)">${ymax.toFixed(1)}</text>
    <text x="2" y="${(Y(ymin) + 4).toFixed(1)}" font-size="11" fill="var(--ink-soft)">${ymin.toFixed(1)}</text>
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>${dots}</svg>`;
}
function svgBars(bars, label = "") {
  if (!bars.length) return `<div class="muted small">Aucune donnée.</div>`;
  const W = 600, H = 155, pad = 30, n = bars.length, gap = (W - 2 * pad) / n, bw = gap * 0.6;
  const vmax = Math.max(...bars.map((b) => b.v), 1);
  const rects = bars.map((b, i) => {
    const x = pad + i * gap + (gap - bw) / 2, bh = (H - 2 * pad) * (b.v / vmax);
    return `<rect x="${x.toFixed(1)}" y="${(H - pad - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="var(--accent)"/>`
      + `<text x="${(x + bw / 2).toFixed(1)}" y="${H - pad + 14}" font-size="10" fill="var(--ink-soft)" text-anchor="middle">${esc(b.x)}</text>`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H + 4}" style="width:100%;height:auto" role="img" aria-label="${esc(label)}"><text x="${pad}" y="15" font-size="12" fill="var(--ink-soft)">${esc(label)}</text>${rects}</svg>`;
}
/** Carte "Calendrier d'assiduité" : grille du mois avec navigation. */
function carteCalendrier(v, logs) {
  const auj = new Date();
  if (!CAL_VIEW) CAL_VIEW = { annee: auj.getFullYear(), mois: auj.getMonth() + 1 };
  const p2 = (n) => String(n).padStart(2, "0");
  const isoAuj = `${auj.getFullYear()}-${p2(auj.getMonth() + 1)}-${p2(auj.getDate())}`;
  const g = grilleMois(CAL_VIEW.annee, CAL_VIEW.mois, logs);
  const c = h(`<div class="card stack"></div>`);
  c.append(h(`<div class="cal-head"><button class="chip" id="calPrev" aria-label="Mois précédent">‹</button><b>${esc(g.nomMois)} ${g.annee}</b><button class="chip" id="calNext" aria-label="Mois suivant">›</button></div>`));
  const grid = h(`<div class="cal-grid"></div>`);
  NOMS_JOURS_COURTS.forEach((d) => grid.append(h(`<div class="cal-dow">${d}</div>`)));
  g.cases.forEach((cell) => {
    if (!cell) { grid.append(h(`<div class="cal-cell empty"></div>`)); return; }
    const on = cell.seances > 0, isAuj = cell.iso === isoAuj;
    grid.append(h(`<div class="cal-cell${on ? " on" : ""}${isAuj ? " today" : ""}">${cell.jour}${on ? `<span class="n">${cell.seances}</span>` : ""}</div>`));
  });
  c.append(grid);
  c.append(h(`<div class="small muted" style="margin-top:6px">${g.joursEntraines} jour${g.joursEntraines > 1 ? "s" : ""} entraîné${g.joursEntraines > 1 ? "s" : ""} · ${g.totalSeances} séance${g.totalSeances > 1 ? "s" : ""} ce mois-ci.</div>`));
  v.append(c);
  $("#calPrev", c).addEventListener("click", () => { CAL_VIEW = moisAdjacent(g.annee, g.mois, -1); render(); });
  $("#calNext", c).addEventListener("click", () => { CAL_VIEW = moisAdjacent(g.annee, g.mois, 1); render(); });
}
function vStats(v) {
  const logs = Etat.data.logs;
  v.append(h(`<h1>Progrès</h1>`));

  // KPIs : cette semaine + cumul + durée moyenne
  const sm = statsSemaine(logs);
  const dm = dureeMoyenneMin(logs);
  const g = h(`<div class="grid2"></div>`);
  g.append(kpi("Séances totales", `${logs.length}`));
  g.append(kpi("Cette semaine", `${sm.seances} séance${sm.seances > 1 ? "s" : ""}`));
  g.append(kpi("Volume cumulé", `${Math.round(logs.reduce((a, l) => a + volumeLog(l), 0)).toLocaleString("fr-FR")} kg`));
  g.append(kpi("Durée moyenne", dm != null ? `${dm} min` : "—"));
  v.append(g);
  if (sm.seances) v.append(h(`<div class="muted small" style="margin:-2px 0 8px">Cette semaine : ${sm.volume.toLocaleString("fr-FR")} kg de volume${sm.dureeMin != null ? ` · ~${sm.dureeMin} min/séance` : ""}.</div>`));

  carteCalendrier(v, logs);

  // Graphique de progression interactif (exercice/corps × métrique × période)
  carteProgression(v);

  const sem = volumeParSemaine(logs);
  if (sem.length >= 1) v.append(h(`<div class="card">${svgBars(sem, "Volume par semaine (kg)")}</div>`));

  // Volume par groupe musculaire (répartition du travail)
  const parMuscle = volumeParMuscle(logs, getExercise).slice(0, 8)
    .map((x) => ({ x: MUSCLE_LABELS[x.muscle] || x.muscle, v: x.v }));
  if (parMuscle.length) v.append(h(`<div class="card">${svgBars(parMuscle, "Volume par groupe musculaire")}</div>`));

  // Records estimés (1RM · Epley)
  const prs = classementRecords(logs, nomExo, 8);
  if (prs.length) {
    const cr = h(`<div class="card stack"><h2 style="margin:0">🏆 Records estimés (1RM)</h2></div>`);
    prs.forEach((r) => cr.append(h(`<div class="spread small" style="padding:5px 0;border-bottom:1px solid var(--line)"><span>${esc(r.nom)}</span><span class="num muted">${r.e1rm} kg <span class="tag">${r.charge}kg×${r.reps}</span></span></div>`)));
    cr.append(h(`<div class="hint">${esc(FORMULE_1RM)}. Estimation indicative — ne teste jamais un vrai maximum en reprise.</div>`));
    v.append(cr);
  }

  // Calculateurs force (1RM, %, disques)
  carteForce(v);

  // poids
  const c = h(`<div class="card stack"><h2 style="margin:0">Poids du corps</h2></div>`);
  const rowW = h(`<div class="row"><input id="wKg" inputmode="decimal" placeholder="Poids du matin (kg)" style="flex:1"><button class="primary" id="wAdd">Ajouter</button></div>`);
  c.append(rowW);
  const poids = Etat.data.metrics.filter((m) => m.poidsKg);
  if (poids.length) c.append(h(`<div class="small muted">Dernier : ${poids[poids.length - 1].poidsKg} kg · ${poids.length} mesure(s)</div>`));
  c.append(h(`<div class="hint">Pèse-toi le matin à jeun. Aucune décision sur une seule pesée : on regarde la tendance sur 1–2 semaines.</div>`));
  v.append(c);
  $("#wAdd", v).addEventListener("click", () => {
    const kg = parseFloat(($("#wKg", v).value || "").replace(",", ".")); if (!kg) return;
    Etat.data.metrics.push({ id: Etat.uid(), date: new Date().toISOString(), poidsKg: kg }); Etat.sauver(); render();
  });

  // Mensurations
  const cm = h(`<div class="card stack"><h2 style="margin:0">Mensurations</h2>
    <div class="row"><input id="mTaille" inputmode="decimal" placeholder="Tour de taille (cm)" style="flex:1"><input id="mPoit" inputmode="decimal" placeholder="Poitrine" style="flex:1"></div>
    <div class="row"><input id="mBras" inputmode="decimal" placeholder="Bras" style="flex:1"><input id="mCuisse" inputmode="decimal" placeholder="Cuisse" style="flex:1"><button id="mAdd">Enregistrer</button></div>
    <div class="hint">Mesure 1×/semaine, mêmes conditions. Le tour de taille est le meilleur repère de perte de graisse.</div></div>`);
  v.append(cm);
  $("#mAdd", v).addEventListener("click", () => {
    const num = (id) => parseFloat(($(id, v).value || "").replace(",", ".")) || null;
    const e = { id: Etat.uid(), date: new Date().toISOString(), taille: num("#mTaille"), poitrine: num("#mPoit"), bras: num("#mBras"), cuisse: num("#mCuisse") };
    if (!e.taille && !e.poitrine && !e.bras && !e.cuisse) return;
    Etat.data.metrics.push(e); Etat.sauver(); render();
  });

  // Bilan & ajustement (2 semaines)
  const cb = h(`<div class="card stack"><h2 style="margin:0">Bilan & ajustement</h2><div class="muted small">Sur 2 semaines — une seule action à la fois.</div><div id="bilanOut"></div></div>`);
  const bBilan = h(`<button class="primary">Analyser mes 2 dernières semaines</button>`);
  bBilan.addEventListener("click", () => {
    const r = bilan(Etat.data.profil, Etat.data.metrics);
    $("#bilanOut", v).innerHTML = `<div class="notice small">${esc(r.message)}</div>`;
    (Etat.data.reviews ||= []).push({ date: new Date().toISOString(), statut: r.statut, message: r.message });
    Etat.sauver();
  });
  cb.append(bBilan); v.append(cb);

  // historique
  if (logs.length) {
    const hist = h(`<div class="card stack"><h2 style="margin:0">Dernières séances</h2></div>`);
    logs.slice(-8).reverse().forEach((l) => {
      hist.append(h(`<div class="spread small" style="padding:6px 0;border-bottom:1px solid var(--line)">
        <span>${new Date(l.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${esc(l.seanceNom || "")}</span>
        <span class="muted">${(l.exercices || []).length} exos</span></div>`));
    });
    v.append(hist);
  } else {
    v.append(h(`<div class="notice small">Réalise ta première séance pour voir tes statistiques se remplir.</div>`));
  }
}

/* ======================================================================
   RÉGLAGES
   ====================================================================== */
/** Déclenche le téléchargement d'un fichier texte (CSV) dans le navigateur. */
function telechargerCSV(contenu, nomFichier) {
  const blob = new Blob([contenu], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = nomFichier; a.click();
  URL.revokeObjectURL(a.href);
}
function vSet(v) {
  const p = Etat.data.profil;
  v.append(h(`<h1>Réglages</h1>`));

  const prof = h(`<div class="card stack"><h2 style="margin:0">Profil & programme</h2>
    <div class="small muted">Objectif : ${GOAL_LABELS[p.objectif]} · Niveau : ${LEVEL_LABELS[p.niveau]} · ${p.joursParSemaine} j/sem · ${p.dureeSeanceMin} min · ${esc(p.lieu)}</div></div>`);
  const bRegen = h(`<button>Refaire l'onboarding / régénérer</button>`);
  bRegen.addEventListener("click", () => { if (confirm("Refaire l'onboarding ? Ton programme sera régénéré (ton historique de séances est conservé).")) { DRAFT = { ...p }; STEP = 0; Etat.data.profil = null; render(); } });
  const bReg = h(`<button>Régénérer le programme avec le profil actuel</button>`);
  bReg.addEventListener("click", () => { Etat.data.programme = genererProgramme(p); Etat.sauver(); alert("Programme régénéré ✔"); nav("prog"); });
  prof.append(bReg, bRegen); v.append(prof);

  const aff = h(`<div class="card stack"><h2 style="margin:0">Apparence</h2></div>`);
  aff.append(chipsInline([["auto", "Auto"], ["light", "Clair"], ["dark", "Sombre"]], (val) => Etat.data.reglages.theme === val, (val) => { Etat.data.reglages.theme = val; Etat.sauver(); appliquerTheme(); }));
  v.append(aff);

  // Démonstrations
  const cwx = h(`<div class="card stack"><h2 style="margin:0">Démonstrations</h2>
    <div class="hint">Les visuels des exercices viennent du dataset GitHub <b>hasaneyldrm/exercises-dataset</b> (référencés par URL, avec attribution), avec repli sur ExerciseDB open-source. Aucune clé requise.</div></div>`);
  v.append(cwx);

  const don = h(`<div class="card stack"><h2 style="margin:0">Mes données</h2>
    <div class="small muted">Tout est stocké localement sur cet appareil. Aucune donnée n'est envoyée à un serveur.</div></div>`);
  const bExp = h(`<button>💾 Sauvegarde complète (JSON)</button>`);
  bExp.addEventListener("click", () => {
    const contenu = JSON.stringify(construireExport(Etat.data), null, 1);
    const blob = new Blob([contenu], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nomFichierBackup(); a.click();
    URL.revokeObjectURL(a.href);
  });
  const bImp = h(`<button>📥 Restaurer une sauvegarde (JSON)</button>`);
  const file = h(`<input type="file" accept=".json,application/json" hidden>`);
  bImp.addEventListener("click", () => file.click());
  file.addEventListener("change", (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let obj;
      try { obj = JSON.parse(String(r.result)); } catch (e) { alert("Fichier illisible : ce n'est pas un JSON valide."); file.value = ""; return; }
      const v = validerImport(obj);
      if (!v.ok) { alert("Import impossible :\n" + v.erreurs.join("\n")); file.value = ""; return; }
      const mode = confirm("Restaurer cette sauvegarde.\n\nOK = Fusionner (recommandé : rien n'est perdu, pas de doublon)\nAnnuler = Remplacer TOUT par la sauvegarde")
        ? "fusionner" : "remplacer";
      if (mode === "remplacer" && !confirm("Remplacer définitivement toutes tes données actuelles par cette sauvegarde ?")) { file.value = ""; return; }
      Etat.data = appliquerImport(Etat.data, v.data, mode);
      Etat.sauver();
      alert(mode === "fusionner" ? "Sauvegarde fusionnée ✔" : "Données remplacées ✔");
      file.value = "";
      appliquerTheme();
      if (Etat.data.profil) { $("#tabs").hidden = false; nav("dash"); } else render();
    };
    r.readAsText(f);
  });
  const bExpCsvSeances = h(`<button>Exporter mes séances (CSV)</button>`);
  bExpCsvSeances.addEventListener("click", () => telechargerCSV(seancesVersCSV(Etat.data.logs, (id) => getExercise(id)?.nom || id), nomFichierExport("seances")));
  const bExpCsvPoids = h(`<button>Exporter mon poids/mensurations (CSV)</button>`);
  bExpCsvPoids.addEventListener("click", () => telechargerCSV(metriquesVersCSV(Etat.data.metrics), nomFichierExport("suivi-corporel")));
  const bDel = h(`<button class="danger">Tout effacer</button>`);
  bDel.addEventListener("click", () => { if (confirm("Effacer TOUTES les données (profil, programme, historique) ?")) { Etat.reset(); DRAFT = null; STEP = 0; $("#tabs").hidden = true; render(); } });
  don.append(bExp, bImp, file, bExpCsvSeances, bExpCsvPoids, bDel); v.append(don);

  v.append(h(`<div class="card flat small muted">Coach Perso IA — v0.1 (Phase 1). Application personnelle, locale et hors ligne. Ne remplace pas un avis médical.</div>`));
}

/* ======================================================================
   INIT
   ====================================================================== */
/**
 * Démarrage asynchrone : charge/migre les données (IndexedDB principal,
 * localStorage en secours) AVANT le premier rendu, sans rien effacer.
 */
async function amorcerApp() {
  await Etat.init();

  // Activation de la clé WorkoutX par lien : …/?wxkey=wx_…  → enregistrée
  // localement (jamais dans le code) puis retirée de l'URL.
  try {
    const params = new URLSearchParams(location.search);
    const k = params.get("wxkey");
    if (k && k.trim()) {
      Etat.data.reglages.workoutxKey = k.trim();
      Etat.data.mediaCache = {};
      Etat.sauver();
      params.delete("wxkey");
      const q = params.toString();
      history.replaceState(null, "", location.pathname + (q ? "?" + q : "") + location.hash);
    }
  } catch (e) { /* ignore */ }

  appliquerTheme();
  if (Etat.data.profil) { $("#tabs").hidden = false; nav("dash"); }
  else render();
}
amorcerApp();
