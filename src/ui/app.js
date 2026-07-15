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
import { muscleDiagram } from "./anatomy.js";
import { calculerBesoins } from "../engine/nutrition.js";
import { bilan } from "../engine/review.js";
import { chercherFoods, portion } from "../data/foods.js";
import { rechercher as offRechercher, parCodeBarres } from "../integrations/openfoodfacts.js";
import { Etat, seanceDuJour } from "../store/state.js";
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
    const chips = [
      ...(exo.musclesPrincipaux || []).map((m) => `<span class="pill" style="background:#E5484D;color:#fff">${esc(MUSCLE_LABELS[m] || m)}</span>`),
      ...(exo.musclesSecondaires || []).map((m) => `<span class="pill" style="background:#F5A524;color:#fff">${esc(MUSCLE_LABELS[m] || m)}</span>`),
    ].join("");
    wrap.innerHTML = `<div class="leg">${chips}</div><div class="hint" style="text-align:center">Planche anatomique indisponible hors ligne — elle s'affichera après une première connexion.</div>`;
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
  const heroAnatomie = () => { media.style.aspectRatio = "auto"; media.innerHTML = ""; media.append(h(`<div style="padding:14px;width:100%"></div>`)); media.firstChild.append(diagrammeMuscles(exo)); };
  let url = Etat.data.mediaCache[exo.id];
  if (!url) {
    const res = await chercherDemonstration(exo.id, { rapidKey: Etat.data.reglages.rapidKey });
    if (res && res.gifUrl) { url = res.gifUrl; Etat.data.mediaCache[exo.id] = url; Etat.sauver(); }
  }
  if (!url && exo.media && exo.media.miniature) url = exo.media.miniature; // photo wger de l'exercice
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
const epley = (kg, reps) => (kg > 0 && reps > 0 ? kg * (1 + reps / 30) : 0);
function lundiDe(dateStr) {
  const d = new Date(dateStr); const iso = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - iso); return d.toISOString().slice(0, 10);
}
function volumeParSemaine(logs) {
  const m = new Map();
  for (const l of logs) { const k = lundiDe(l.date); m.set(k, (m.get(k) || 0) + volumeLog(l)); }
  return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-8)
    .map(([k, val]) => ({ x: new Date(k).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), v: Math.round(val) }));
}
function recordsParExercice(logs) {
  const best = {};
  for (const l of logs) for (const e of l.exercices || []) for (const s of e.series || []) {
    const kg = Number(s.chargeKg) || 0, reps = Number(s.reps) || 0;
    if (kg <= 0 || reps <= 0) continue;
    const val = epley(kg, reps);
    if (!best[e.exerciceId] || val > best[e.exerciceId].v) best[e.exerciceId] = { v: val, charge: kg, reps };
  }
  return Object.entries(best)
    .map(([id, b]) => ({ nom: getExercise(id)?.nom || id, e1rm: Math.round(b.v), charge: b.charge, reps: b.reps }))
    .sort((a, b) => b.e1rm - a.e1rm).slice(0, 6);
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
  const g = h(`<div class="grid2"></div>`);
  g.append(kpi("Séances totales", `${logs.length}`));
  g.append(kpi("Volume cumulé", `${Math.round(logs.reduce((a, l) => a + volumeLog(l), 0)).toLocaleString("fr-FR")} kg`));
  v.append(g);

  carteCalendrier(v, logs);

  // Graphiques (à partir des données locales)
  const poidsPts = Etat.data.metrics.filter((m) => m.poidsKg).map((m) => ({ v: m.poidsKg }));
  if (poidsPts.length >= 2) v.append(h(`<div class="card">${svgLine(poidsPts.slice(-30), "Poids du corps (kg)")}</div>`));
  const taillePts = Etat.data.metrics.filter((m) => m.taille).map((m) => ({ v: m.taille }));
  if (taillePts.length >= 2) v.append(h(`<div class="card">${svgLine(taillePts.slice(-30), "Tour de taille (cm)")}</div>`));
  const sem = volumeParSemaine(logs);
  if (sem.length >= 1) v.append(h(`<div class="card">${svgBars(sem, "Volume par semaine (kg)")}</div>`));
  const prs = recordsParExercice(logs);
  if (prs.length) {
    const cr = h(`<div class="card stack"><h2 style="margin:0">Records estimés (1RM · Epley)</h2></div>`);
    prs.forEach((r) => cr.append(h(`<div class="spread small" style="padding:5px 0;border-bottom:1px solid var(--line)"><span>${esc(r.nom)}</span><span class="num muted">${r.e1rm} kg <span class="tag">${r.charge}kg×${r.reps}</span></span></div>`)));
    cr.append(h(`<div class="hint">Estimation indicative (charge × (1 + reps/30)). Ne teste jamais un vrai maximum en reprise.</div>`));
    v.append(cr);
  }

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

  const don = h(`<div class="card stack"><h2 style="margin:0">Mes données</h2>
    <div class="small muted">Tout est stocké localement sur cet appareil. Aucune donnée n'est envoyée à un serveur.</div></div>`);
  const bExp = h(`<button>Exporter mes données (JSON)</button>`);
  bExp.addEventListener("click", () => { const blob = new Blob([JSON.stringify(Etat.data, null, 1)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "coach-perso-sauvegarde.json"; a.click(); });
  const bImp = h(`<button>Importer une sauvegarde</button>`);
  const file = h(`<input type="file" accept=".json" hidden>`);
  bImp.addEventListener("click", () => file.click());
  file.addEventListener("change", (ev) => { const f = ev.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { Etat.data = Object.assign(Etat.data, JSON.parse(String(r.result))); Etat.sauver(); alert("Importé ✔"); render(); } catch (e) { alert("Fichier invalide."); } }; r.readAsText(f); });
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
Etat.charger();
appliquerTheme();
if (Etat.data.profil) { $("#tabs").hidden = false; nav("dash"); }
else render();
