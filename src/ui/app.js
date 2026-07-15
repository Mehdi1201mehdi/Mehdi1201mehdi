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
import { genererProgramme } from "../engine/generator.js";
import { recommander } from "../engine/progression.js";
import { alternatives } from "../engine/replacement.js";
import { chercherDemonstration, lienYouTube } from "../integrations/exercisedb.js";
import { calculerBesoins } from "../engine/nutrition.js";
import { chercherFoods, portion } from "../data/foods.js";
import { rechercher as offRechercher, parCodeBarres } from "../integrations/openfoodfacts.js";
import { Etat, seanceDuJour } from "../store/state.js";

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
function volumeLog(l) {
  let vtot = 0;
  for (const e of l.exercices || []) for (const s of e.series || []) vtot += (Number(s.chargeKg) || 0) * (Number(s.reps) || 0);
  return vtot;
}

/* ======================================================================
   PROGRAMME
   ====================================================================== */
function vProg(v) {
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
function ouvrirDetail(exo) {
  const alts = alternatives(exo.id, Etat.data.profil);
  const html = `<div class="card stack">
    <div class="spread"><h2 style="margin:0">${esc(exo.nom)}</h2><button class="chip" id="fermer">✕</button></div>
    <div class="muted small">${(exo.musclesPrincipaux || []).map((m) => MUSCLE_LABELS[m] || m).join(", ")}${exo.musclesSecondaires.length ? " · secondaires : " + exo.musclesSecondaires.map((m) => MUSCLE_LABELS[m] || m).join(", ") : ""}</div>
    <p class="small">${esc(exo.description)}</p>
    <div><b class="small">Étapes</b><ol class="small" style="margin:6px 0 0 18px">${exo.instructions.map((x) => `<li>${esc(x)}</li>`).join("")}</ol></div>
    ${exo.erreurs.length ? `<div class="small muted">✖ Erreurs fréquentes : ${exo.erreurs.map(esc).join(" · ")}</div>` : ""}
    ${exo.securite ? `<div class="warn small">🛟 ${esc(exo.securite)}</div>` : ""}
    <div id="demoBox"></div>
    <button class="chip" id="btnDemo">🎬 Voir la démonstration (GIF)</button>
    ${alts.length ? `<div><b class="small">Alternatives</b>${alts.map((a) => `<div class="small" style="margin-top:4px">• <b>${esc(a.etiquette)}</b> : ${esc(a.exercice.nom)} — <span class="muted">${esc(a.explication)}</span></div>`).join("")}</div>` : ""}
  </div>`;
  view.innerHTML = ""; const el = h(html); view.append(el);
  el.querySelector("#fermer").addEventListener("click", () => render());
  el.querySelector("#btnDemo").addEventListener("click", () => chargerDemo(exo.id, el.querySelector("#demoBox"), el.querySelector("#btnDemo")));
}

/** Charge (et met en cache local) le GIF de démonstration d'un exercice. */
async function chargerDemo(exId, box, btn) {
  const yt = lienYouTube(exId);
  const afficher = (url) => {
    box.innerHTML = `<img src="${esc(url)}" alt="Démonstration" style="max-width:100%;border-radius:12px;border:1px solid var(--line)">
      <div class="hint">Source : ExerciseDB (oss.exercisedb.dev) · <a href="${yt}" target="_blank" rel="noopener">vidéos YouTube</a></div>`;
  };
  const cache = Etat.data.mediaCache[exId];
  if (cache) { afficher(cache); return; }
  btn.disabled = true; box.innerHTML = `<div class="muted small">Chargement de la démonstration…</div>`;
  const res = await chercherDemonstration(exId, { rapidKey: Etat.data.reglages.rapidKey });
  btn.disabled = false;
  if (res && res.gifUrl) {
    Etat.data.mediaCache[exId] = res.gifUrl; Etat.sauver();
    afficher(res.gifUrl);
  } else {
    box.innerHTML = `<div class="notice small">Démonstration en ligne indisponible (hors ligne ou service saturé).<br>
      <a href="${yt}" target="_blank" rel="noopener">▶ Voir des vidéos de démonstration sur YouTube</a></div>`;
  }
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
let LIVE = null; // {seanceId, data:{exId:{series:[{charge,reps,rir,done,dureeSec}],douleur,exId}}}
function vTrain(v) {
  const prog = Etat.data.programme;
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
    return;
  }
  const seance = prog.seances.find((s) => s.id === LIVE.seanceId);
  v.append(h(`<div class="spread"><h1 style="margin:0">${esc(seance.nom)}</h1><button class="chip" id="abandon">Abandonner</button></div>`));
  seance.exercices.forEach((e) => v.append(carteExoLive(e)));
  const fin = h(`<button class="primary big" style="margin-top:12px">Terminer et enregistrer</button>`);
  fin.addEventListener("click", terminer);
  v.append(fin);
  $("#abandon", v).addEventListener("click", () => { if (confirm("Abandonner la séance sans enregistrer ?")) { LIVE = null; render(); } });
}
function demarrer(seance) {
  LIVE = { seanceId: seance.id, data: {} };
  seance.exercices.forEach((e) => {
    const nb = e.series.filter((s) => s.type !== "echauffement").length || 3;
    const enTemps = e.series.some((s) => s.dureeSec);
    LIVE.data[e.exerciceId] = {
      exId: e.exerciceId,
      series: Array.from({ length: nb }, () => ({ charge: "", reps: "", rir: "", dureeSec: enTemps ? (e.series.find((s) => s.dureeSec)?.dureeSec || 40) : null, done: false })),
      douleur: false,
    };
  });
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
    on(row, "input", "input", (ev) => { const f = ev.target.dataset.f; s[f] = ev.target.value; });
    row.querySelector(".done").addEventListener("click", (ev) => { s.done = !s.done; ev.target.classList.toggle("on", s.done); if (s.done) startTimer(t?.reposSec || 60); });
    c.append(row);
  });
  const acts = h(`<div class="row"></div>`);
  const bDouleur = h(`<button class="chip ${st.douleur ? "danger" : ""}">${st.douleur ? "⚠️ Douleur signalée" : "Signaler une douleur"}</button>`);
  bDouleur.addEventListener("click", () => { st.douleur = !st.douleur; if (st.douleur) alert("Douleur vive, articulaire ou inhabituelle : arrête cet exercice aujourd'hui. Si elle persiste, consulte un professionnel de santé."); render(); });
  const bRempl = h(`<button class="chip">🔄 Remplacer</button>`);
  bRempl.addEventListener("click", () => remplacer(e.exerciceId));
  acts.append(bDouleur, bRempl);
  c.append(acts);
  return c;
}
function remplacer(exId) {
  const seance = Etat.data.programme.seances.find((s) => s.id === LIVE.seanceId);
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
  Etat.sauver(); render();
}
function terminer() {
  const seance = Etat.data.programme.seances.find((s) => s.id === LIVE.seanceId);
  const exercices = [];
  for (const exId in LIVE.data) {
    const st = LIVE.data[exId];
    const series = st.series.filter((s) => s.done || s.reps || s.charge || s.dureeSec)
      .map((s) => ({ chargeKg: s.charge === "" ? null : +s.charge, reps: s.reps === "" ? null : +s.reps, rir: s.rir === "" ? null : +s.rir, dureeSec: s.dureeSec || null }));
    if (series.length || st.douleur) exercices.push({ exerciceId: exId, series, douleur: st.douleur });
  }
  Etat.data.logs.push({ id: Etat.uid(), date: new Date().toISOString(), seanceId: seance.id, seanceNom: seance.nom, exercices });
  Etat.sauver();
  LIVE = null;
  alert("Séance enregistrée 💪 Les suggestions de charge sont mises à jour pour la prochaine fois.");
  nav("dash");
}

/* ---------- minuteur de repos ---------- */
let TMR = null;
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
function vStats(v) {
  const logs = Etat.data.logs;
  v.append(h(`<h1>Progrès</h1>`));
  const g = h(`<div class="grid2"></div>`);
  g.append(kpi("Séances totales", `${logs.length}`));
  g.append(kpi("Volume cumulé", `${Math.round(logs.reduce((a, l) => a + volumeLog(l), 0)).toLocaleString("fr-FR")} kg`));
  v.append(g);

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

  const don = h(`<div class="card stack"><h2 style="margin:0">Mes données</h2>
    <div class="small muted">Tout est stocké localement sur cet appareil. Aucune donnée n'est envoyée à un serveur.</div></div>`);
  const bExp = h(`<button>Exporter mes données (JSON)</button>`);
  bExp.addEventListener("click", () => { const blob = new Blob([JSON.stringify(Etat.data, null, 1)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "coach-perso-sauvegarde.json"; a.click(); });
  const bImp = h(`<button>Importer une sauvegarde</button>`);
  const file = h(`<input type="file" accept=".json" hidden>`);
  bImp.addEventListener("click", () => file.click());
  file.addEventListener("change", (ev) => { const f = ev.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { Etat.data = Object.assign(Etat.data, JSON.parse(String(r.result))); Etat.sauver(); alert("Importé ✔"); render(); } catch (e) { alert("Fichier invalide."); } }; r.readAsText(f); });
  const bDel = h(`<button class="danger">Tout effacer</button>`);
  bDel.addEventListener("click", () => { if (confirm("Effacer TOUTES les données (profil, programme, historique) ?")) { Etat.reset(); DRAFT = null; STEP = 0; $("#tabs").hidden = true; render(); } });
  don.append(bExp, bImp, file, bDel); v.append(don);

  v.append(h(`<div class="card flat small muted">Coach Perso IA — v0.1 (Phase 1). Application personnelle, locale et hors ligne. Ne remplace pas un avis médical.</div>`));
}

/* ======================================================================
   INIT
   ====================================================================== */
Etat.charger();
appliquerTheme();
if (Etat.data.profil) { $("#tabs").hidden = false; nav("dash"); }
else render();
