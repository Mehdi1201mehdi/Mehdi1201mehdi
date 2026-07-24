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
import { getExercise, chercherCatalogue, CATALOGUE, catalogueEtenduCharge, chargerCatalogueEtendu } from "../data/exercises.js";
import { GIFS } from "../data/gifs.js";
import { ANATOLY_INFO, ANATOLY_SEMAINES } from "../data/anatoly.js";
import { genererProgramme } from "../engine/generator.js";
import { recommander } from "../engine/progression.js";
import { alternatives } from "../engine/replacement.js";
import { chercherDemonstration, lienYouTube } from "../integrations/exercisedb.js";
import { muscleDiagram, muscleHeatmap, miniSilhouette } from "./anatomy.js";
import { calculerBesoins } from "../engine/nutrition.js";
import { bilan } from "../engine/review.js";
import { chercherFoods, portion } from "../data/foods.js";
import { rechercher as offRechercher, parCodeBarres } from "../integrations/openfoodfacts.js";
import { Etat, seanceDuJour, planningJours } from "../store/state.js";
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
  volumeLog, volumeParSemaine, dureeMoyenneMin, volumeParMuscle, recuperationParMuscle, statsSemaine,
  METRIQUES_EXO, serieExercice, serieCorps, filtrerDepuis,
} from "../engine/stats.js";

/** Nom lisible d'un exercice (pour records/stats). */
const nomExo = (id) => (getExercise(id) ? getExercise(id).nom : id);
/** Libellé court du niveau (évite la troncature dans les tuiles stat étroites). */
const NIVEAU_COURT = { debutant: "Débutant", intermediaire: "Inter.", avance: "Avancé" };
const niveauCourt = (niv) => NIVEAU_COURT[niv] || LEVEL_LABELS[niv] || niv;

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
import { echauffementPour, ETIREMENTS, dureeSequence } from "../data/mobilite.js";
import { serieActuelle, meilleureSerie, grilleJours, defis } from "../engine/defis.js";
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
const TABS = { dash: vDash, prog: vProg, cat: vCatalogue, train: vTrain, food: vNutrition, stats: vStats, set: vSet, anatoly: vAnatoly };
const TABS_PLUS = ["food", "anatoly", "cat"]; // sous-écrans hors barre (accès via Accueil / Profil)
/** Titre affiché dans l'en-tête compact des écrans autres que l'Accueil. */
const TITRES_ECRAN = { prog: "Programme", train: "Séance", stats: "Progrès", food: "Nutrition", cat: "Catalogue", anatoly: "Anatoly", set: "Profil" };
/** En-tête contextuel : la marque complète ne s'affiche que sur l'Accueil ;
 *  ailleurs, le titre de l'écran remplace l'eyebrow « Musculation » répété
 *  (évite la redondance avec la nav basse et libère de la hauteur). */
function majHeader() {
  const brand = $("#brand"), titre = $("#hdTitle");
  if (!brand || !titre) return;
  if (TAB === "dash") { brand.classList.remove("compact"); titre.textContent = "Coach Perso"; }
  else { brand.classList.add("compact"); titre.textContent = TITRES_ECRAN[TAB] || "Coach Perso"; }
}
function majTabs() {
  $("#tabs").querySelectorAll("button[data-tab]").forEach((b) => {
    const on = b.dataset.tab === TAB;
    b.classList.toggle("on", on);
    if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); // lecteurs d'écran : onglet actif
  });
  const plus = $("#plusBtn");
  if (plus) {
    const on = TABS_PLUS.includes(TAB);
    plus.classList.toggle("on", on);
    if (on) plus.setAttribute("aria-current", "page"); else plus.removeAttribute("aria-current");
  }
}
/** Menu « Plus » : Nutrition, Programme Anatoly, Profil (garde toutes les fonctions). */
function ouvrirPlus() {
  const items = [
    { tab: "food", icone: IC.apple, tint: "mi-green", label: "Nutrition", desc: "Calories, macros, hydratation" },
    { tab: "anatoly", icone: IC.dumbbell, tint: "mi-blue", label: "Programme Anatoly", desc: "Powerbuilding · 8 semaines" },
    { tab: "cat", icone: IC.search, tint: "mi-indigo", label: "Catalogue d'exercices", desc: "Rechercher et filtrer" },
    { tab: "set", icone: IC.user, tint: "mi-orange", label: "Profil & réglages", desc: "Compte, thème, sauvegarde" },
  ];
  const sheet = h(`<div class="sheet plusmenu"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const fermer = () => sheet.remove();
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">Plus</h2><button class="chip" id="x">✕ Fermer</button></div>`));
  items.forEach((it) => {
    const b = h(`<button class="card plusitem"><span class="pm-ic ${it.tint}" aria-hidden="true">${it.icone}</span><span class="pm-main"><b>${esc(it.label)}</b><span class="muted small">${esc(it.desc)}</span></span><span class="chev" aria-hidden="true">›</span></button>`);
    b.addEventListener("click", () => { sheet.remove(); nav(it.tab); });
    inner.append(b);
  });
  sheet.querySelector("#x").addEventListener("click", fermer);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) fermer(); });
  document.body.append(sheet);
}
/** Change d'onglet + entrée d'historique (le bouton retour renavigue). */
function nav(t, remplace = false) {
  if (t !== "train") { arreterChrono(); APERCU = null; }
  TAB = t;
  majTabs();
  majHeader();
  render(); window.scrollTo(0, 0);
  const etat = { tab: t };
  if (remplace) history.replaceState(etat, ""); else history.pushState(etat, "");
}
$("#tabs").querySelectorAll("button[data-tab]").forEach((b) => b.addEventListener("click", () => { if (b.dataset.tab !== TAB) { try { navigator.vibrate?.(12); } catch (e) {} } nav(b.dataset.tab); }));
$("#plusBtn")?.addEventListener("click", ouvrirPlus);
let LAST_RENDER_KEY = null;
function render() {
  view.innerHTML = "";
  (Etat.data.profil ? TABS[TAB] : vOnboarding)(view);
  // Motion : ne rejouer l'entrée en cascade que lorsque la VUE change vraiment
  // (onglet, ouverture d'un aperçu, démarrage d'une séance, onboarding). Les
  // simples mises à jour dans le même écran (+1 verre d'eau, bascule RIR, mois
  // du calendrier…) ne ré-animent pas toute la page : impression de fluidité et
  // moins de repaints inutiles.
  const key = Etat.data.profil ? `${TAB}|${APERCU || ""}|${LIVE ? LIVE.seanceId : ""}` : "onb";
  if (key !== LAST_RENDER_KEY) {
    LAST_RENDER_KEY = key;
    view.classList.remove("reveal"); void view.offsetWidth; view.classList.add("reveal");
    setTimeout(() => view.classList.remove("reveal"), 950);
    animerStats(view); // compteurs qui montent (grands chiffres), au vrai changement de vue
  }
}
/** Anime les grands chiffres entiers (stats/KPI) de 0 → valeur à l'ouverture d'un
 *  écran. Ne touche qu'aux entiers purs (avec séparateurs) ; restaure le format
 *  exact d'origine à la fin. Désactivé si l'utilisateur réduit les animations. */
function animerStats(root) {
  try { if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return; } catch (e) { return; }
  root.querySelectorAll(".stat b.num, .kpi b.num").forEach((el) => {
    const raw = el.textContent.trim();
    if (!/^[\d\s ]+$/.test(raw)) return;                 // entier pur uniquement
    const cible = parseInt(raw.replace(/\D/g, ""), 10);
    if (!Number.isFinite(cible) || cible <= 0 || cible > 1e7) return;
    const dur = 650, t0 = performance.now();
    el.textContent = "0";
    const pas = (t) => {
      if (!el.isConnected) return;
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = Math.round(cible * e).toLocaleString("fr-FR");
      if (p < 1) requestAnimationFrame(pas); else el.textContent = raw; // restaure le format exact
    };
    requestAnimationFrame(pas);
  });
}

/* ---------- bouton retour (feuilles modales + onglets) ---------- */
window.addEventListener("popstate", (e) => {
  // 1) Une feuille est ouverte → le retour la ferme (et ré-affirme l'onglet
  //    courant pour ne pas naviguer en même temps).
  const sh = document.querySelector(".sheet");
  if (sh) {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    if (typeof sh.__resolve === "function") sh.__resolve(sh.__cancel); // dialogue → renvoie l'annulation
    else sh.remove();
    history.pushState({ tab: TAB }, "");
    return;
  }
  // 2) Sinon, retour = changement d'onglet.
  if (Etat.data.profil) { TAB = (e.state && e.state.tab) || "dash"; majTabs(); majHeader(); render(); window.scrollTo(0, 0); }
});

/* ---------- dialogues internes (remplacent prompt / alert / confirm) ---------- */
/**
 * Ouvre une petite feuille modale et résout avec la valeur de l'action choisie.
 * Le bouton retour / un tap sur le fond renvoie `cancelVal`.
 * @param {{titre?:string, message?:string, actions:{label:string,valeur:any,primary?:boolean,danger?:boolean}[], cancelVal?:any, onMount?:(inner:HTMLElement, close:(v:any)=>void)=>void}} opts
 */
function dialogue(opts) {
  return new Promise((resolve) => {
    const sheet = h(`<div class="sheet dlg"><div class="inner"></div></div>`);
    const inner = sheet.querySelector(".inner");
    if (opts.titre) inner.append(h(`<h2 style="margin:0 0 6px">${esc(opts.titre)}</h2>`));
    if (opts.message) inner.append(h(`<div class="small muted" style="margin-bottom:10px">${esc(opts.message)}</div>`));
    const close = (v) => { if (sheet.__done) return; sheet.__done = true; sheet.remove(); resolve(typeof v === "function" ? v() : v); };
    sheet.__resolve = close;
    sheet.__cancel = "cancelVal" in opts ? opts.cancelVal : null;
    const row = h(`<div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"></div>`);
    for (const a of opts.actions) {
      const b = h(`<button class="${a.primary ? "primary" : ""} ${a.danger ? "danger" : ""}">${esc(a.label)}</button>`);
      b.addEventListener("click", () => close(a.valeur));
      row.append(b);
    }
    inner.append(row);
    sheet.addEventListener("click", (e) => { if (e.target === sheet) close(sheet.__cancel); });
    document.body.append(sheet);
    if (opts.onMount) opts.onMount(inner, close);
    else row.querySelector("button:last-child")?.focus();
  });
}

/** Demande une valeur texte (remplace prompt). Résout la chaîne, ou null si annulé. */
function demanderTexte(titre, valeurDefaut = "", opts = {}) {
  let input;
  return dialogue({
    titre,
    cancelVal: null,
    actions: [{ label: "Annuler", valeur: null }, { label: opts.ok || "Valider", primary: true, valeur: () => input.value }],
    onMount: (inner, close) => {
      input = h(`<input type="${opts.type || "text"}" ${opts.inputmode ? `inputmode="${opts.inputmode}"` : ""} placeholder="${esc(opts.placeholder || "")}" style="width:100%" />`);
      input.value = valeurDefaut == null ? "" : String(valeurDefaut);
      inner.insertBefore(input, inner.querySelector(".row"));
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); close(input.value); } });
      setTimeout(() => { input.focus(); input.select?.(); }, 0);
    },
  });
}

/** Confirmation (remplace confirm). Résout true/false. */
function confirmer(message, { titre = "Confirmer", ok = "Confirmer", danger = false } = {}) {
  return dialogue({
    titre, message, cancelVal: false,
    actions: [{ label: "Annuler", valeur: false }, { label: ok, valeur: true, primary: !danger, danger }],
  });
}

/** Message d'information (remplace alert). */
function info(message, { titre = "" } = {}) {
  return dialogue({ titre, message, cancelVal: true, actions: [{ label: "OK", valeur: true, primary: true }] });
}

/** Notification non bloquante (records, confirmations). */
function toast(message, ms = 3200) {
  const t = h(`<div class="toast" role="status">${esc(message)}</div>`);
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add("show"));
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, ms);
}

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
const GOAL_ICONS = { prise_muscle: "💪", perte_graisse: "🔥", recomposition: "⚖️", force: "🏋️", endurance: "🫀", remise_forme: "✨", mobilite: "🤸", prepa_physique: "🎯" };
const LEVEL_ICONS = { grand_debutant: "🌱", debutant: "🙂", intermediaire: "📈", avance: "🥇" };
/** Choix sous forme de cartes à icône (grille 2 colonnes) — onboarding premium. */
function cardsChoix(container, options, getSel, toggle, icons = {}) {
  const box = h(`<div class="optgrid"></div>`);
  for (const [val, lab] of options) {
    const b = h(`<button class="optcard${getSel(val) ? " on" : ""}"><span class="opt-ic" aria-hidden="true">${icons[val] || "•"}</span><span class="opt-lab">${esc(lab)}</span></button>`);
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
function renderStepObjectif(c) { cardsChoix(c, GOALS.map((g) => [g, GOAL_LABELS[g]]), (v) => DRAFT.objectif === v, (v) => DRAFT.objectif = v, GOAL_ICONS); }
function renderStepNiveau(c) { cardsChoix(c, LEVELS.map((l) => [l, LEVEL_LABELS[l]]), (v) => DRAFT.niveau === v, (v) => DRAFT.niveau = v, LEVEL_ICONS); }
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
  c.append(h(`<div class="warn small" style="margin-top:12px">${mi(IC.cross, "mi-amber")}Cette app ne remplace pas un professionnel de santé. En cas de douleur, blessure ou maladie, demande un avis médical avant de continuer.</div>`));
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
/** Série de jours d'entraînement consécutifs (streak), terminant aujourd'hui ou hier. */
function serieJours(logs) {
  const iso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  const jours = new Set(logs.map((l) => l.date && l.date.slice(0, 10)).filter(Boolean));
  let n = 0; const d = new Date();
  if (!jours.has(iso(d))) d.setDate(d.getDate() - 1);
  while (jours.has(iso(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
/** Bande « Ma semaine » : Lun→Dim avec statut (fait / aujourd'hui / à venir). */
function semaineStrip(logs) {
  const iso = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  const noms = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const jours = new Set(logs.map((l) => l.date && l.date.slice(0, 10)).filter(Boolean));
  const now = new Date(), isoToday = iso(now);
  const lundi = new Date(now); lundi.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const box = h(`<div class="week"></div>`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(lundi); d.setDate(lundi.getDate() + i);
    const di = iso(d), done = jours.has(di), today = di === isoToday;
    const cls = done ? "wd done" : today ? "wd today" : "wd";
    const inner = done ? "✓" : today ? "•" : "";
    box.append(h(`<div class="wcol"><span class="wl">${noms[i]}</span><span class="${cls}">${inner}</span></div>`));
  }
  return box;
}
/**
 * Carte « Défis & régularité » — série en cours, record, objectifs hebdo/mensuels
 * et grille d'assiduité (28 jours). 100 % dérivé des vraies séances.
 */
function carteDefis(v) {
  const logs = Etat.data.logs || [];
  if (!logs.length) return; // rien à motiver tant qu'aucune séance
  const serie = serieActuelle(logs);
  const record = meilleureSerie(logs);
  const liste = defis(logs, Etat.data.profil || {});
  const grille = grilleJours(logs, 28);

  v.append(h(`<div class="eyebrow" style="margin:20px 0 9px">Défis & régularité</div>`));
  const c = h(`<div class="card stack defis"></div>`);
  // Bandeau série + record
  const top = h(`<div class="defis-top"></div>`);
  top.append(h(`<div class="defis-streak"><span class="ic ic-orange">${IC.flame}</span><div><b class="num">${serie}</b><span>jour${serie > 1 ? "s" : ""} d'affilée</span></div></div>`));
  top.append(h(`<div class="defis-streak"><span class="ic ic-indigo">${IC.trophy}</span><div><b class="num">${record}</b><span>record de série</span></div></div>`));
  c.append(top);
  // Objectifs (barres)
  liste.forEach((d) => {
    const atteint = d.pct >= 1;
    const row = h(`<div class="defi-row"></div>`);
    row.append(h(`<div class="spread small"><span><b>${esc(d.titre)}</b>${atteint ? ` <span class="badge accent">Atteint ✓</span>` : ""}</span><span class="muted">${esc(d.sousTitre)}</span></div>`));
    row.append(h(`<div class="bar"><div style="width:${Math.round(d.pct * 100)}%${atteint ? ";background:var(--ok)" : ""}"></div></div>`));
    c.append(row);
  });
  // Grille d'assiduité (4 semaines)
  const grid = h(`<div class="defi-grid" aria-label="Assiduité des 28 derniers jours"></div>`);
  grille.forEach((g) => grid.append(h(`<span class="defi-cell${g.done ? " on" : ""}${g.today ? " today" : ""}" title="${g.iso}${g.done ? " · entraîné" : ""}"></span>`)));
  c.append(h(`<div class="muted small" style="margin-top:4px">28 derniers jours</div>`));
  c.append(grid);
  v.append(c);
}

/* Icônes SVG (style Lucide, trait cohérent) — remplacent les emoji sur les
   éléments clés pour un rendu « app pro », d'après la maquette Claude Design. */
const IC = {
  dumbbell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7v10M18 7v10M4 9v6M20 9v6M6 12h12"/></svg>`,
  flame: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1.5 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2.5-5 .5 2.5 2.5 2.5 2.5 2.5 0-3.5-2.5-4.5-2-7.5z"/></svg>`,
  bars: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="7" width="4" height="14" rx="1"/><rect x="17" y="3" width="4" height="18" rx="1"/></svg>`,
  play: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4v16l14-8z"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/></svg>`,
  coffee: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4zM6 1v2M10 1v2M14 1v2"/></svg>`,
  utensils: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7a4 4 0 0 0 8 0V2M7 2v20M21 15V2a5 5 0 0 0-3 5v6a2 2 0 0 0 2 2h1z"/></svg>`,
  apple: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7c1-3 4-4 6-3 0 3-2 4-4 4M12 7c-1.5-2-4-2.5-6-1-1 3 1 13 6 13s7-10 6-13c-2-1.5-4.5-1-6 1z"/></svg>`,
  plate: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3M5 11l1 8h12l1-8"/></svg>`,
  fork: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7a4 4 0 0 0 8 0V2M7 2v20"/></svg>`,
  droplet: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s7 8 7 13a7 7 0 0 1-14 0c0-5 7-13 7-13z"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M6 4h12v4a6 6 0 0 1-12 0zM6 4H3v2a3 3 0 0 0 3 3M18 4h3v2a3 3 0 0 1-3 3"/></svg>`,
  activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>`,
  repeat: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  user: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
  swap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 3l4 4-4 4M20 7H8M8 21l-4-4 4-4M4 17h12"/></svg>`,
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  cornerDown: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l5 5-5 5M20 15H9a5 5 0 0 1-5-5V4"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4M16 2v4"/><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18"/></svg>`,
  cross: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v8M8 12h8"/><circle cx="12" cy="12" r="9"/></svg>`,
  map: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`,
  x: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  forward: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 4 10 8-10 8zM19 5v14"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m19 20-10-8 10-8zM5 5v14"/></svg>`,
  layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/></svg>`,
  wind: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.6 4.6A2 2 0 1 1 11 8H2M12.6 19.4A2 2 0 1 0 14 16H2M17.7 7.8A2.5 2.5 0 1 1 19.5 12H2"/></svg>`,
};
/** Petite icône SVG en ligne (repas, etc.), teintée par classe. */
const mi = (svg, cls) => `<span class="mi ${cls}">${svg}</span>`;

/** Libellés des patrons de mouvement (champ `patron` du catalogue). */
const PATRON_LABELS = {
  squat: "Squat", charniere_hanche: "Charnière de hanche", fente: "Fente",
  isolation_jambe: "Isolation jambe", poussee_horizontale: "Poussée horizontale",
  poussee_verticale: "Poussée verticale", tirage_horizontal: "Tirage horizontal",
  tirage_vertical: "Tirage vertical", flexion_bras: "Flexion des bras",
  extension_bras: "Extension des bras", gainage: "Gainage", cardio: "Cardio",
};
/** Vue anatomique la plus lisible selon le patron. */
const PATRON_VUE = { charniere_hanche: "back", tirage_horizontal: "back", tirage_vertical: "back" };
/**
 * Démonstration animée maison (SVG + CSS, 100 % hors ligne) : silhouette des
 * muscles ciblés + charge qui parcourt l'amplitude du mouvement selon le patron.
 * Déterministe, sans média distant. Repli propre si le patron est inconnu.
 */
function animDemo(exo, opts = {}) {
  const p = (exo && exo.patron) || "";
  const muscles = (exo && exo.musclesPrincipaux) || [];
  const view = PATRON_VUE[p] || "front";
  const tag = PATRON_LABELS[p] || "Mouvement";
  return `<div class="exdemo${opts.grand ? " grand" : ""}" data-p="${esc(p)}" role="img" aria-label="Démonstration animée : ${esc(tag)}">
    <div class="exdemo-fig">${muscles.length ? miniSilhouette(muscles, view) : ""}</div>
    <span class="exdemo-load" aria-hidden="true">${IC.dumbbell}</span>
    <span class="exdemo-tag">${esc(tag)}</span>
  </div>`;
}
function vDash(v) {
  const p = Etat.data.profil, prog = Etat.data.programme;
  const sj = seanceDuJour(prog);
  const logs = Etat.data.logs;
  const besoins = calculerBesoins(p);
  const jour = todayStr();
  const seanceFaite = logs.some((l) => l.date && l.date.slice(0, 10) === jour);

  // En-tête personnalisé selon l'heure
  const heure = new Date().getHours();
  const salut = heure < 12 ? "Bonjour" : heure < 18 ? "Bon après-midi" : "Bonsoir";
  v.append(h(`<div class="eyebrow">${salut}</div>`));
  v.append(h(`<h1 style="margin:0">${esc(p.prenom || "Athlète")} 👋</h1>`));
  v.append(h(`<div class="muted small" style="margin-top:3px">Prêt pour ton entraînement ?</div>`));

  // Deux tuiles horizontales : série (streak) + niveau (façon maquette)
  const duo = h(`<div class="statgrid" style="margin-top:15px"></div>`);
  const _serie = serieJours(logs);
  duo.append(h(`<div class="mstat"><div class="ic ic-orange">${IC.flame}</div><div class="g"><span>Série actuelle</span><b class="num">${_serie} jour${_serie > 1 ? "s" : ""}</b></div></div>`));
  duo.append(h(`<div class="mstat"><div class="ic ic-blue">${IC.bars}</div><div class="g"><span>Niveau</span><b>${esc(niveauCourt(p.niveau))}</b></div></div>`));
  v.append(duo);

  // Entraînement du jour (grande carte)
  v.append(h(`<div class="eyebrow" style="margin:20px 0 9px">Entraînement du jour</div>`));
  const wc = h(`<div class="card wkcard"></div>`);
  if (sj) {
    const kcal = Math.round((sj.dureeEstimeeMin || 45) * 8);
    const muscles = (sj.groupesCibles || []).map((m) => MUSCLE_LABELS[m] || m).slice(0, 3).join(" · ");
    let pct = seanceFaite ? 1 : 0;
    if (LIVE && LIVE.seanceId === sj.id) pct = progressionSeance(sj).pct;
    wc.append(h(`<div class="spread"><h2 style="margin:0;font-size:1.5rem">${esc(sj.nom)}</h2><span class="wk-ic">${IC.dumbbell}</span></div>`));
    if (muscles) wc.append(h(`<div class="muted small" style="margin:3px 0 13px">${esc(muscles)}</div>`));
    const st = h(`<div class="wk-stats"></div>`);
    st.append(h(`<div><b>${sj.exercices.length}</b><span>Exercices</span></div>`));
    st.append(h(`<div><b>${sj.dureeEstimeeMin}</b><span>min</span></div>`));
    st.append(h(`<div><b>${kcal}</b><span>kcal env.</span></div>`));
    st.append(h(`<div><b class="lvl">${esc(niveauCourt(p.niveau))}</b><span>Niveau</span></div>`));
    wc.append(st);
    wc.append(h(`<div class="spread small" style="margin:15px 0 6px"><span class="muted">Progression séance</span><span class="num" style="color:var(--accent-ink);font-weight:800">${Math.round(pct * 100)}%</span></div>`));
    wc.append(h(`<div class="bar"><div style="width:${Math.round(pct * 100)}%"></div></div>`));
    const b = h(`<button class="primary big" style="margin-top:15px">${seanceFaite ? "✓ Séance faite — revoir" : `<span class="btn-ico">${IC.play}</span>Commencer la séance`}</button>`);
    b.addEventListener("click", () => { LIVE = null; APERCU = sj.id; nav("train"); });
    wc.append(b);
  } else {
    wc.append(h(`<div class="spread"><h2 style="margin:0">Jour de repos</h2><span class="wk-ic wk-ic-rest">${IC.moon}</span></div>`));
    wc.append(h(`<div class="muted small" style="margin-top:5px">Marche, mobilité ou récupération active. Reviens demain 💪</div>`));
  }
  v.append(wc);

  // Raccourcis rapides (façon maquette) : Exercices · Nutrition · Calendrier
  const qrow = h(`<div class="qrow"></div>`);
  const qbtn = (icone, cls, label, tab) => {
    const b = h(`<button><span class="qi ${cls}">${icone}</span><span>${label}</span></button>`);
    b.addEventListener("click", () => nav(tab));
    return b;
  };
  qrow.append(qbtn(IC.search, "q-blue", "Exercices", "cat"));
  qrow.append(qbtn(IC.apple, "q-green", "Nutrition", "food"));
  qrow.append(qbtn(IC.calendar, "q-indigo", "Calendrier", "stats"));
  v.append(qrow);

  // Ma semaine
  v.append(h(`<div class="eyebrow" style="margin:20px 0 9px">Ma semaine</div>`));
  v.append(semaineStrip(logs));

  // Défis & régularité (série, objectifs, assiduité) — dérivé des vraies séances
  carteDefis(v);

  // Carte musculaire : aperçu des zones sollicitées (élément différenciant,
  // repris depuis Progrès — vide silencieusement si aucun historique).
  carteMuscleHeatmap(v);

  // Objectif du jour (façon « Today Target ») : séance, calories, hydratation
  const foodT = (Etat.data.foodlog[jour] || []).reduce((a, f) => a + (f.kcal || 0), 0);
  const eauT = Etat.data.waterlog[jour] || 0;
  const eauCibleMl = Math.round((besoins.eau || 2) * 1000);
  const tc = h(`<div class="card stack tap"></div>`);
  const tcHead = h(`<div class="spread" style="margin-bottom:2px"><div class="eyebrow">Objectif du jour</div><span class="chev">Nutrition ›</span></div>`);
  tc.append(tcHead);
  tc.append(targetLigne(IC.dumbbell, "Séance", seanceFaite ? "Faite ✓" : (sj ? "À faire" : "Repos"), seanceFaite ? 1 : (sj ? 0 : 1), "mi-blue"));
  tc.append(targetLigne(IC.flame, "Calories", `${Math.round(foodT)} / ${besoins.kcal} kcal`, foodT / (besoins.kcal || 1), "mi-orange"));
  tc.append(targetLigne(IC.droplet, "Hydratation", `${(eauT / 1000).toFixed(1)} / ${besoins.eau} L`, eauT / eauCibleMl, "mi-blue"));
  tc.addEventListener("click", () => nav("food"));
  v.append(tc);

  v.append(h(`<div class="disclaimer">En cas de douleur vive ou inhabituelle, arrête le mouvement. Cette app ne pose aucun diagnostic médical.</div>`));
}
function kpi(lab, val) { return h(`<div class="card kpi"><span class="lab">${esc(lab)}</span><b class="num">${esc(val)}</b></div>`); }
/** Anneau de progression SVG (0..1) avec texte central. Composant réutilisable. */
function anneauSVG(pct, taille = 76, texte = "") {
  const r = (taille - 12) / 2, circ = 2 * Math.PI * r;
  const off = circ * (1 - Math.max(0, Math.min(1, pct || 0)));
  const cx = taille / 2;
  return `<svg width="${taille}" height="${taille}" viewBox="0 0 ${taille} ${taille}" aria-hidden="true">
    <g transform="rotate(-90 ${cx} ${cx})">
      <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="8"/>
      <circle class="ring-anim" style="--circ:${circ.toFixed(1)};--dashoff:${off.toFixed(1)}" cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
    </g>
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="850" fill="var(--ink)">${esc(texte)}</text></svg>`;
}
/** Carte statistique (icône + valeur + libellé). Composant réutilisable. */
function statCard(icone, valeur, label) {
  return h(`<div class="stat"><div class="ic" aria-hidden="true">${icone}</div><b class="num">${esc(valeur)}</b><span class="lab">${esc(label)}</span></div>`);
}
/** État vide soigné (icône + titre + sous-titre). Renvoie une chaîne HTML. */
function etatVide(icone, titre, sousTitre = "") {
  return `<div class="emptystate"><div class="emptystate-ic" aria-hidden="true">${icone}</div><b>${esc(titre)}</b>`
    + (sousTitre ? `<span class="muted small">${esc(sousTitre)}</span>` : "") + `</div>`;
}
/** Emoji illustratif par type de matériel (rangée « Matériel requis »). */
const EQUIPMENT_ICONS = {
  poids_du_corps: "🧍", halteres: "🏋️", barre: "🏋️", barre_ez: "🏋️", kettlebell: "🔔",
  poulie: "🎚️", elastiques: "🎗️", machine_guidee: "⚙️", machine_leviers: "⚙️",
  smith: "🏗️", banc: "🪑", rack: "🗄️", barre_traction: "🚪", trx: "🪢",
  medecine_ball: "🏐", swiss_ball: "⚽", rouleau: "🧻", tapis_course: "🏃",
  velo: "🚴", rameur: "🚣",
};
/** Ligne d'objectif du jour (icône + libellé + valeur + mini-jauge). */
function targetLigne(icone, label, val, pct, tint = "") {
  const p = Math.round(Math.max(0, Math.min(1, pct || 0)) * 100);
  return h(`<div class="tgt"><span class="ic ${tint}" aria-hidden="true">${icone}</span><div style="flex:1;min-width:0"><div class="spread small"><span>${esc(label)}</span><span class="num muted">${esc(val)}</span></div><div class="bar mt"><div style="width:${p}%"></div></div></div></div>`);
}
/** Barre de macro (libellé + valeur/cible + jauge colorée). Composant réutilisable. */
function macroBar(label, valeur, cible, unite, cls) {
  const v = Math.round(valeur || 0);
  const pct = cible ? Math.min(100, Math.round((v / cible) * 100)) : 0;
  return h(`<div class="macro"><div class="lg spread small"><span>${esc(label)}</span><span class="num muted">${v} / ${cible} ${esc(unite)}</span></div><div class="bar ${cls}"><div style="width:${pct}%"></div></div></div>`);
}

/* ======================================================================
   PROGRAMME
   ====================================================================== */
let EDIT_ROUTINE = null; // id de la routine en cours d'édition (onglet Programme)
let PROG_JOUR_SEL = null; // jour ISO (1=lundi) sélectionné dans le ruban de l'onglet Programme

function vProg(v) {
  if (EDIT_ROUTINE) { vRoutineEditor(v, EDIT_ROUTINE); return; }
  const prog = Etat.data.programme, p = Etat.data.profil;

  // En-tête : « Mon programme » + nom du split + Modifier
  const head = h(`<div class="spread" style="margin-bottom:14px"></div>`);
  head.append(h(`<div><div class="eyebrow">Mon programme</div><h1 style="margin:2px 0 0">${esc(splitLabel(prog.split))}</h1></div>`));
  const bEdit = h(`<button class="chip">Modifier</button>`);
  bEdit.addEventListener("click", () => nav("cat"));
  head.append(bEdit);
  v.append(head);

  // Semaine du programme : sélecteur de jour en ruban + un seul jour déployé
  // (remplace l'ancien empilement des 7 jours, qui produisait un long
  // enchaînement de cartes quasi identiques).
  const COULEURS = ["#3B82F6", "#6366F1", "#22C55E", "#F59E0B", "#EF4444", "#06B6D4", "#8B5CF6"];
  const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const JOURS_COURTS = ["L", "M", "M", "J", "V", "S", "D"];
  const planning = planningJours(prog.seances.length);
  const parJour = {};
  prog.seances.forEach((s, i) => { if (planning[i]) parJour[planning[i]] = { s, i }; });
  const auj = ((new Date().getDay() + 6) % 7) + 1;
  if (PROG_JOUR_SEL == null) PROG_JOUR_SEL = auj;

  const strip = h(`<div class="daystrip" role="tablist" aria-label="Jour de la semaine"></div>`);
  for (let wd = 1; wd <= 7; wd++) {
    const cell = parJour[wd];
    const col = cell ? COULEURS[cell.i % COULEURS.length] : null;
    const btn = h(`<button class="daypill${wd === PROG_JOUR_SEL ? " on" : ""}${wd === auj ? " today" : ""}" role="tab" aria-selected="${wd === PROG_JOUR_SEL}" aria-label="${esc(JOURS[wd - 1])}${wd === auj ? " (aujourd'hui)" : ""}"><span class="dp-d">${JOURS_COURTS[wd - 1]}</span><span class="dp-dot" style="${col ? `background:${col}` : ""}"></span></button>`);
    btn.addEventListener("click", () => { if (PROG_JOUR_SEL !== wd) { PROG_JOUR_SEL = wd; render(); } });
    strip.append(btn);
  }
  v.append(strip);

  const wd = PROG_JOUR_SEL, cell = parJour[wd];
  const panel = h(`<div class="daypanel"></div>`);
  if (cell) {
    const s = cell.s, col = COULEURS[cell.i % COULEURS.length];
    const muscles = (s.groupesCibles || []).map((m) => MUSCLE_LABELS[m] || m).slice(0, 3).join(" · ");
    const meta = `${muscles}${muscles ? " · " : ""}${s.exercices.length} exos · ${s.dureeEstimeeMin || 0} min`;
    const d = h(`<div class="daycard${wd === auj ? " today" : ""}"></div>`);
    d.append(h(`<div class="row" style="align-items:center;gap:13px"><span class="dc-ic" style="background:${col}26;color:${col}">${IC.dumbbell}</span><span class="dc-main"><span class="dc-day">${JOURS[wd - 1]}${wd === auj ? " · Aujourd'hui" : ""}</span><b class="dc-name">${esc(s.nom)}</b><span class="muted small">${esc(meta)}</span></span></div>`));
    s.exercices.forEach((e, i) => d.append(carteExoApercu(e, i + 1)));
    if (wd === auj) {
      const b = h(`<button class="primary big" style="margin-top:11px"><span class="btn-ico">${IC.play}</span>Commencer la séance</button>`);
      b.addEventListener("click", () => { LIVE = null; APERCU = s.id; nav("train"); });
      d.append(b);
    }
    panel.append(d);
  } else {
    panel.append(h(`<div class="daycard rest"><span class="dc-ic" style="background:var(--surface-2);color:var(--ink-soft)">${IC.moon}</span><span class="dc-main"><span class="dc-day">${JOURS[wd - 1]}</span><b class="dc-name">Repos</b><span class="muted small">Récupération</span></span></div>`));
  }
  v.append(panel);

  v.append(h(`<div class="hint" style="margin:12px 0 6px">${esc(prog.justificationGlobale)}</div>`));
  const bCat = h(`<button class="chip" style="margin:2px 0 10px">🔎 Catalogue d'exercices</button>`);
  bCat.addEventListener("click", () => nav("cat"));
  v.append(bCat);

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
    const bDel = h(`<button class="chip danger" aria-label="Supprimer la routine">🗑️</button>`);
    bDel.addEventListener("click", async () => { if (await confirmer(`Supprimer la routine « ${r.nom} » ?`, { danger: true, ok: "Supprimer" })) { Etat.data.programmesPerso = Etat.data.programmesPerso.filter((x) => x.id !== r.id); Etat.sauver(); render(); } });
    acts.append(bOpen, bDup, bDel); card.append(acts);
    v.append(card);
  });
  const barre = h(`<div class="row" style="margin-top:8px"></div>`);
  const bNew = h(`<button class="primary">➕ Nouvelle routine</button>`);
  bNew.addEventListener("click", async () => {
    const nom = await demanderTexte("Nom de la routine", "Ma routine", { ok: "Créer" });
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
  $("#ren", v).addEventListener("click", async () => { const n = await demanderTexte("Nom de la routine", r.nom); if (n !== null) { renommer(r, n); Etat.sauver(); render(); } });
  if (!r.seances.length) v.append(h(`<div class="muted small">Aucune séance. Ajoute-en une pour commencer.</div>`));
  r.seances.forEach((s) => v.append(carteSeanceEditor(r, s)));
  const bAddS = h(`<button class="primary" style="margin-top:10px"><span class="btn-ico">${IC.plus}</span>Ajouter une séance</button>`);
  bAddS.addEventListener("click", async () => { const n = await demanderTexte("Nom de la séance", `Séance ${r.seances.length + 1}`, { ok: "Ajouter" }); if (n === null) return; ajouterSeance(r, n); Etat.sauver(); render(); });
  v.append(bAddS);
}

function carteSeanceEditor(r, s) {
  const c = h(`<details class="card" open></details>`);
  c.append(h(`<summary class="spread"><b>${esc(s.nom)}</b><span class="pill">${s.exercices.length} exos · ~${s.dureeEstimeeMin || 0} min</span></summary>`));
  const acts = h(`<div class="row" style="margin:6px 0"></div>`);
  const bRen = h(`<button class="chip">✏️ Nom</button>`);
  bRen.addEventListener("click", async () => { const n = await demanderTexte("Nom de la séance", s.nom); if (n !== null) { renommer(s, n); Etat.sauver(); render(); } });
  const bDel = h(`<button class="chip danger">🗑️ Séance</button>`);
  bDel.addEventListener("click", async () => { if (await confirmer(`Supprimer la séance « ${s.nom} » ?`, { danger: true, ok: "Supprimer" })) { supprimerSeance(r, s.id); Etat.sauver(); render(); } });
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
  const up = h(`<button class="chip" aria-label="Monter l'exercice">↑</button>`); up.addEventListener("click", () => { deplacerExercice(s, i, -1); Etat.sauver(); render(); });
  const down = h(`<button class="chip" aria-label="Descendre l'exercice">↓</button>`); down.addEventListener("click", () => { deplacerExercice(s, i, 1); Etat.sauver(); render(); });
  const del = h(`<button class="chip danger" aria-label="Retirer l'exercice">🗑️</button>`); del.addEventListener("click", () => { supprimerExerciceIndex(s, i); Etat.sauver(); render(); });
  nav2.append(up, down, del); row.append(nav2);
  return row;
}

/** Crée une routine à partir d'une séance déjà réalisée (historique). */
function dupliquerSeancePassee() {
  const logs = (Etat.data.logs || []).slice(-20).reverse();
  if (!logs.length) { info("Aucune séance enregistrée à dupliquer pour l'instant.", { titre: "Dupliquer" }); return; }
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="spread"><h2 style="margin:0">Dupliquer une séance passée</h2><button class="chip" id="fx" aria-label="Fermer">✕</button></div>`));
  const liste = h(`<div class="stack"></div>`); inner.append(liste);
  logs.forEach((l) => {
    const d = new Date(l.date).toLocaleDateString("fr-FR");
    const b = h(`<button class="big" style="justify-content:space-between;text-align:left;margin:4px 0"><span><b>${esc(l.seanceNom || "Séance")}</b><br><span class="muted small">${d} · ${(l.exercices || []).length} exercice(s)</span></span></button>`);
    b.addEventListener("click", async () => {
      sheet.remove();
      const nom = await demanderTexte("Nom de la nouvelle routine", `${l.seanceNom || "Séance"} (copie)`, { ok: "Créer" });
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

/** Historique réel d'un exercice (à partir des séances enregistrées). */
function historiqueExercice(exId) {
  const seances = [];
  let maxCharge = 0, totalSeries = 0, best1rm = 0;
  for (const l of Etat.data.logs) {
    const ex = (l.exercices || []).find((e) => e.exerciceId === exId);
    if (!ex) continue;
    const series = ex.series || [];
    seances.push({ date: l.date, series });
    for (const s of series) {
      totalSeries++;
      const c = Number(s.chargeKg) || 0, r = Number(s.reps) || 0;
      if (c > maxCharge) maxCharge = c;
      if (c && r) { const e1 = c * (1 + r / 30); if (e1 > best1rm) best1rm = e1; }
    }
  }
  return { seances: seances.reverse(), maxCharge, totalSeries, nbSeances: seances.length, best1rm: Math.round(best1rm) };
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

  const equipTxt = (exo.equipement || []).map((e) => EQUIPMENT_LABELS[e] || e).join(" · ");
  inner.append(h(`<div class="det-sub muted">${esc(equipTxt || "Poids du corps")}</div>`));
  inner.append(h(`<div class="row" style="margin-top:10px">
    <span class="difbar" title="Difficulté">${[1, 2, 3, 4].map((i) => `<i class="${i <= diff ? "on" : ""}"></i>`).join("")}</span>
    <span class="pill">${DIFF_LABEL[diff] || "—"}</span></div>`));
  if (!estRealisable(exo)) inner.append(h(`<div class="warn small" style="margin-top:10px">⚠️ Pas réalisable avec ton matériel / tes limitations actuels.</div>`));

  // Onglets : Info · Instructions · Conseils · Historique
  const rendus = {
    Info: () => {
      const f = h(`<div class="stack"></div>`);
      const anat = h(`<div class="sec"><h3>Muscles sollicités</h3></div>`);
      anat.append(diagrammeMuscles(exo));
      const legende = [
        ...(exo.musclesPrincipaux || []).map((m) => `<span class="pill" style="background:#EF4444;color:#fff">${esc(MUSCLE_LABELS[m] || m)}</span>`),
        ...(exo.musclesSecondaires || []).map((m) => `<span class="pill" style="background:#F59E0B;color:#fff">${esc(MUSCLE_LABELS[m] || m)}</span>`),
      ].join("");
      anat.append(h(`<div class="leg">${legende}</div>`));
      f.append(anat);
      if ((exo.equipement || []).length) f.append(h(`<div class="needrow">${exo.equipement.map((e) => `<div class="need"><span class="ic" aria-hidden="true">${EQUIPMENT_ICONS[e] || "🏋️"}</span><span>${esc(EQUIPMENT_LABELS[e] || e)}</span></div>`).join("")}</div>`));
      const dl = h(`<div class="deflist"></div>`);
      const ligne = (k, val) => { if (val) dl.append(h(`<div class="spread small"><span class="muted">${k}</span><b>${esc(val)}</b></div>`)); };
      ligne("Équipement", equipTxt);
      ligne("Niveau", DIFF_LABEL[diff]);
      ligne("Catégorie", exo.typeExercice);
      ligne("Mouvement", exo.patron);
      f.append(dl);
      return f;
    },
    Instructions: () => {
      if (!(exo.instructions || []).length) return h(`<div class="muted small">Pas d'instructions détaillées pour cet exercice.</div>`);
      return h(`<ol class="small det-steps">${exo.instructions.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`);
    },
    Conseils: () => {
      const f = h(`<div class="stack"></div>`);
      if (exo.respiration) f.append(h(`<div class="sec"><h3>Respiration</h3><div class="breath"><span class="in">↧ Inspirer</span><span class="out">↥ Expirer</span></div><div class="small muted" style="margin-top:6px">${esc(exo.respiration)}</div></div>`));
      if ((exo.erreurs || []).length) f.append(h(`<div class="sec"><h3>Erreurs fréquentes</h3><div class="small muted">✖ ${exo.erreurs.map(esc).join(" · ")}</div></div>`));
      if (exo.securite) f.append(h(`<div class="sec"><h3>Sécurité</h3><div class="warn small">🛟 ${esc(exo.securite)}</div></div>`));
      if (alts.length) {
        const s = h(`<div class="sec"><h3>Remplacement intelligent</h3></div>`);
        alts.forEach((a) => {
          const card = h(`<div class="altcard"><div class="spread"><b class="small">${esc(a.etiquette)}</b><button class="chip" data-alt="${esc(a.exercice.id)}">Ouvrir</button></div><div class="small">${esc(a.exercice.nom)} — <span class="muted">${esc(a.explication)}</span></div></div>`);
          card.querySelector("[data-alt]").addEventListener("click", () => { fermer(); ouvrirDetail(getExercise(a.exercice.id)); });
          s.append(card);
        });
        f.append(s);
      }
      if (!f.children.length) return h(`<div class="muted small">Pas de conseils spécifiques pour cet exercice.</div>`);
      return f;
    },
    Historique: () => {
      const hh = historiqueExercice(exo.id);
      if (!hh.nbSeances) return h(`<div class="muted small">Aucune donnée pour l'instant. Réalise cet exercice en séance pour suivre ta progression ici.</div>`);
      const f = h(`<div class="stack"></div>`);
      const g = h(`<div class="statgrid"></div>`);
      g.append(statCard(IC.dumbbell, `${hh.maxCharge} kg`, "Charge max"));
      g.append(statCard(IC.activity, `${hh.best1rm} kg`, "1RM estimé"));
      g.append(statCard(IC.repeat, `${hh.totalSeries}`, "Séries totales"));
      g.append(statCard(IC.calendar, `${hh.nbSeances}`, "Séances"));
      f.append(g);
      f.append(h(`<div class="eyebrow" style="margin-top:10px">Dernières séances</div>`));
      hh.seances.slice(0, 8).forEach((s) => {
        const d = new Date(s.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
        const detail = s.series.map((x) => `${x.chargeKg || 0}kg×${x.reps || x.dureeSec || 0}`).join(" · ");
        f.append(h(`<div style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="eyebrow" style="color:var(--ink-soft)">${d}</div><div class="num small" style="margin-top:2px">${esc(detail)}</div></div>`));
      });
      return f;
    },
  };
  const tabsBar = h(`<div class="xtabs"></div>`);
  const panel = h(`<div class="xpanel"></div>`);
  const afficher = (nom) => {
    tabsBar.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.t === nom));
    panel.innerHTML = ""; panel.append(rendus[nom]());
  };
  ["Info", "Instructions", "Conseils", "Historique"].forEach((nom) => {
    const b = h(`<button data-t="${nom}">${nom}</button>`);
    b.addEventListener("click", () => afficher(nom));
    tabsBar.append(b);
  });
  inner.append(tabsBar, panel);
  afficher("Info");

  sheet.querySelector("#x").addEventListener("click", fermer);
  document.body.append(sheet);
  chargerMedia(exo, media);
}

/** Charge le média (GIF/vidéo) avec cache local, repli anatomie. */
async function chargerMedia(exo, media) {
  const heroAnatomie = () => {
    media.style.aspectRatio = "auto"; media.innerHTML = "";
    const box = h(`<div style="padding:14px;width:100%"></div>`);
    if (exo.patron) box.append(h(animDemo(exo, { grand: true })));
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
  const el = estVideo ? h(`<video autoplay loop muted playsinline></video>`) : h(`<img decoding="async" alt="Démonstration : ${esc(exo.nom)}">`);
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
  if (!catalogueEtenduCharge()) chargerCatalogueEtendu().then(() => render());
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
   PROGRAMME ANATOLY (Powerbuilding 8 semaines — depuis le PDF fourni)
   ====================================================================== */
let ANATOLY_SEM = 1; // semaine sélectionnée
/** Temps de repos indicatif selon la règle du programme (base = squat/DC/SDT). */
function reposAnat(nom) {
  return /squat|développé couché|soulevé de terre/i.test(nom) ? "4 min" : "2 min";
}
/* Résolution de média par nom de mouvement (réutilise la bibliothèque existante,
   incluant les 250 exercices wger) pour couvrir les mouvements du programme
   Anatoly qui n'ont pas de réf directe. Ordre = priorité. */
const ANAT_MEDIA = [
  [/prise invers|reverse/i, "wger-dd6e8753-reverse-grip-barbell-curls"],
  [/curl barre/i, "wger-42227131-biceps-curls-with-sz-bar"],
  [/barre au front|skull|french press|extension.*triceps.*(halt|inclin)/i, "wger-893c07ea-skullcrusher-dumbbells"],
  [/ciseaux|scissor|flutter/i, "wger-fdc550b6-flutter-kicks"],
  [/t-barre|t-bar/i, "wger-1eeccede-t-bar-row"],
  [/hyperext/i, "wger-50a8f1f6-lower-back-extensions"],
  [/pull-?over/i, "wger-6e00afb6-cross-bench-dumbbell-pullovers"],
  [/frontales|front raise/i, "wger-68e0dbba-front-raises-with-plates"],
  [/militaire|overhead press/i, "wger-f4467e9a-overhead-press"],
  [/rowing.*(poulie|horizontal)|rowing assis|cable row/i, "wger-4b7cb037-row"],
  [/shrug|haussement/i, "wger-270e108d-shrugs-barbells"],
  [/fentes? march/i, "wger-2f1a2707-dumbbell-lunges-standing"],
  [/saut/i, "wger-002c6a4f-box-jumps"],
];
/** Meilleure réf média pour un exercice Anatoly : réf directe animée, sinon repli par nom. */
function refAnat(ex) {
  if (ex.ref && GIFS[ex.ref]) return ex.ref;
  for (const [re, id] of ANAT_MEDIA) if (re.test(ex.nom)) return id;
  return ex.ref || null;
}
/** Carte d'un exercice du programme Anatoly (média réutilisé si disponible). */
function carteAnatoly(ex, num) {
  const ref = refAnat(ex);
  const exo = ref ? getExercise(ref) : null;
  const gif = ref ? GIFS[ref] : null;
  const c = h(`<div class="card anat-ex${exo ? " tap" : ""}"></div>`);
  const top = h(`<div class="anat-ex-top"></div>`);
  if (gif) top.append(h(`<img class="anat-thumb" src="${esc(gif)}" alt="" loading="lazy" decoding="async">`));
  const body = h(`<div style="flex:1;min-width:0"></div>`);
  body.append(h(`<div class="anat-nom"><span class="anat-num">${num}</span>${esc(ex.nom)}</div>`));
  body.append(h(`<div class="anat-meta"><span class="badge accent">${ex.series} × ${esc(ex.reps)}</span><span class="anat-rest">⏱ ${reposAnat(ex.nom)}</span></div>`));
  if (ex.note) body.append(h(`<div class="hint" style="margin-top:6px">${esc(ex.note)}</div>`));
  top.append(body);
  if (exo) top.append(h(`<span class="chev" aria-hidden="true">›</span>`));
  c.append(top);
  if (exo) c.addEventListener("click", () => ouvrirDetail(exo));
  return c;
}
function vAnatoly(v) {
  const info = ANATOLY_INFO;
  v.append(h(`<div class="eyebrow">🏋️ Programme Anatoly</div>`));
  v.append(h(`<h1 style="margin:2px 0 2px">Powerbuilding</h1>`));
  v.append(h(`<div class="muted small" style="margin-bottom:13px">${info.nbSemaines} semaines · force &amp; esthétique</div>`));

  // Sélecteur de semaine S1..S8
  const sel = h(`<div class="anat-weeks"></div>`);
  for (let i = 1; i <= info.nbSemaines; i++) {
    const b = h(`<button class="anat-wk${ANATOLY_SEM === i ? " on" : ""}">S${i}</button>`);
    b.addEventListener("click", () => { ANATOLY_SEM = i; render(); window.scrollTo(0, 0); });
    sel.append(b);
  }
  v.append(sel);

  // Navigation ← Semaine N →
  const navrow = h(`<div class="spread" style="margin:14px 0 8px"></div>`);
  const prev = h(`<button class="chip" aria-label="Semaine précédente" ${ANATOLY_SEM <= 1 ? "disabled" : ""}>←</button>`);
  prev.addEventListener("click", () => { if (ANATOLY_SEM > 1) { ANATOLY_SEM--; render(); window.scrollTo(0, 0); } });
  const next = h(`<button class="chip" aria-label="Semaine suivante" ${ANATOLY_SEM >= info.nbSemaines ? "disabled" : ""}>→</button>`);
  next.addEventListener("click", () => { if (ANATOLY_SEM < info.nbSemaines) { ANATOLY_SEM++; render(); window.scrollTo(0, 0); } });
  navrow.append(prev, h(`<b style="font-size:1.15rem">Semaine ${ANATOLY_SEM}</b>`), next);
  v.append(navrow);

  const semaine = ANATOLY_SEMAINES.find((s) => s.n === ANATOLY_SEM) || ANATOLY_SEMAINES[0];
  semaine.jours.forEach((j) => {
    v.append(h(`<div class="anat-day"><span class="anat-jour">${esc(j.jour)}</span><span class="anat-grp">${esc(j.groupe)}</span></div>`));
    j.exercices.forEach((ex, idx) => v.append(carteAnatoly(ex, idx + 1)));
  });

  // Infos programme (repliable) : intro, échauffement, repos, abdos, consignes
  const extra = h(`<details class="card" style="margin-top:16px"><summary><b>Infos, échauffement &amp; abdos</b></summary></details>`);
  extra.append(h(`<div class="sec"><h3>Avant de commencer</h3><div class="small muted">${esc(info.intro)}</div></div>`));
  extra.append(h(`<div class="sec"><h3>Échauffement</h3><div class="small muted">${esc(info.echauffement)}</div></div>`));
  extra.append(h(`<div class="sec"><h3>Temps de repos</h3><div class="deflist">${info.repos.map(([k, val]) => `<div class="spread small"><span class="muted">${esc(k)}</span><b>${esc(val)}</b></div>`).join("")}</div></div>`));
  extra.append(h(`<div class="sec"><h3>${esc(info.abdos.titre)}</h3></div>`));
  info.abdos.exercices.forEach((ex, idx) => extra.append(carteAnatoly(ex, idx + 1)));
  const cons = h(`<div class="sec"><h3>Consignes importantes</h3></div>`);
  info.consignes.forEach((c) => cons.append(h(`<div class="small muted" style="margin:6px 0">• ${esc(c)}</div>`)));
  extra.append(cons);
  v.append(extra);

  v.append(h(`<div class="warn small" style="margin-top:12px">${mi(IC.cross, "mi-amber")}Programme intense. Adapte les charges à ton niveau, respecte la technique et arrête en cas de douleur. Ceci n'est pas un avis médical.</div>`));
}

/* ======================================================================
   SÉANCE GUIDÉE (mode entraînement)
   ====================================================================== */
let LIVE = null; // état live (voir engine/liveSession.js)
let APERCU = null; // id de la séance dont on affiche l'aperçu (avant de démarrer)
let SESSION_TMR = null; // chronomètre de séance (temps écoulé)
/** Muscles ciblés par une séance (groupesCibles, sinon déduits des exercices). */
function musclesSeance(s) {
  if (s.groupesCibles && s.groupesCibles.length) return s.groupesCibles;
  const set = new Set();
  for (const e of s.exercices) (getExercise(e.exerciceId)?.musclesPrincipaux || []).forEach((m) => set.add(m));
  return [...set];
}
/** Carte d'exercice (style Anatoly) pour l'aperçu d'une séance : vignette + séries/reps + repos. */
/** Repos lisible : « 45 s », « 1 min », « 1 min 45 » (jamais « 1.8 min »). */
function formatRepos(sec) {
  if (sec < 60) return `${sec} s`;
  const m = Math.floor(sec / 60), s = sec % 60;
  return s ? `${m} min ${String(s).padStart(2, "0")}` : `${m} min`;
}
function carteExoApercu(e, num) {
  const exo = getExercise(e.exerciceId);
  const gif = GIFS[e.exerciceId];
  const t = e.series.find((s) => s.type === "travail") || e.series[0];
  const nb = e.series.filter((s) => s.type !== "echauffement").length || e.series.length;
  const reps = t?.dureeSec ? `${t.dureeSec} s` : t?.repsCible ? `${t.repsCible[0]}–${t.repsCible[1]}` : "—";
  const repos = t?.reposSec ? formatRepos(t.reposSec) : "—";
  const nom = exo ? exo.nom : e.exerciceId;
  const c = h(`<div class="card anat-ex${exo ? " tap" : ""}"></div>`);
  const top = h(`<div class="anat-ex-top"></div>`);
  if (gif) top.append(h(`<img class="anat-thumb" src="${esc(gif)}" alt="" loading="lazy" decoding="async">`));
  const body = h(`<div style="flex:1;min-width:0"></div>`);
  body.append(h(`<div class="anat-nom"><span class="anat-num">${num}</span>${esc(nom)}</div>`));
  body.append(h(`<div class="anat-meta"><span class="badge accent">${nb} × ${esc(reps)}</span><span class="anat-rest">⏱ repos ${esc(repos)}</span></div>`));
  top.append(body);
  if (exo) top.append(h(`<span class="chev" aria-hidden="true">›</span>`));
  c.append(top);
  if (exo) c.addEventListener("click", () => ouvrirDetail(exo));
  return c;
}
/** Aperçu d'une séance : liste des exercices (façon programme) + bouton Commencer. */
function vApercuSeance(v, seanceId) {
  const s = trouverSeance(seanceId);
  if (!s) { APERCU = null; render(); return; }
  const back = h(`<button class="chip" style="margin-bottom:12px">← Séances</button>`);
  back.addEventListener("click", () => { APERCU = null; render(); });
  v.append(back);
  v.append(h(`<h1 style="margin:0 0 3px">${esc(s.nom)}</h1>`));
  v.append(h(`<div class="muted small">${s.exercices.length} exercices · ~${s.dureeEstimeeMin || 0} min</div>`));
  const muscles = musclesSeance(s);
  // Muscles ciblés en illustrations (une silhouette surlignée par groupe)
  const rangee = rangeeMuscles(muscles);
  if (rangee) v.append(rangee);
  else if (muscles.length) {
    const mc = h(`<div class="row" style="margin:10px 0"></div>`);
    muscles.slice(0, 6).forEach((m) => mc.append(h(`<span class="pill">${esc(MUSCLE_LABELS[m] || m)}</span>`)));
    v.append(mc);
  }
  const start = h(`<button class="primary big" style="margin:6px 0 8px"><span class="btn-ico">${IC.play}</span>Commencer la séance</button>`);
  start.addEventListener("click", () => { APERCU = null; demarrer(s); });
  v.append(start);
  const guide = h(`<button class="secondary big" style="margin:0 0 14px"><span class="btn-ico">${IC.forward}</span>Mode guidé (pas à pas)</button>`);
  guide.addEventListener("click", () => { APERCU = null; demarrer(s); ouvrirGuide(); });
  v.append(guide);
  // Échauffement guidé, adapté aux muscles de la séance.
  const echauf = echauffementPour(muscles);
  const bEch = h(`<button class="card wcard sil warm-cta" style="width:100%;margin-top:8px;text-align:left"><span class="mi mi-orange" style="width:34px;height:34px">${IC.wind}</span><span class="g"><b>Échauffement guidé</b><br><span class="muted small">${echauf.length} mouvements · ~${Math.round(dureeSequence(echauf) / 60)} min · adapté à cette séance</span></span><span class="chev" aria-hidden="true">›</span></button>`);
  bEch.addEventListener("click", () => ouvrirSequence("Échauffement", echauf));
  v.append(bEch);
  s.exercices.forEach((e, i) => v.append(carteExoApercu(e, i + 1)));
}
/** Met à jour le chrono de séance (mm:ss) à partir de l'heure de début. */
function majChrono() {
  const el = document.getElementById("seanceTimer");
  if (!el || !LIVE) return;
  const sec = Math.max(0, Math.floor((Date.now() - Date.parse(LIVE.debut)) / 1000));
  el.textContent = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}
function arreterChrono() { if (SESSION_TMR) { clearInterval(SESSION_TMR); SESSION_TMR = null; } }

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
  if (!LIVE && APERCU) { arreterChrono(); vApercuSeance(v, APERCU); return; }
  if (!LIVE) {
    arreterChrono();
    const sj = seanceDuJour(prog);
    v.append(h(`<h1 style="margin-bottom:6px">Choisir une séance</h1>`));
    v.append(h(`<div class="notice small">Échauffe-toi 5–10 min (cardio léger + mobilité + séries d'approche sur les gros mouvements) avant de commencer.</div>`));
    prog.seances.forEach((s) => v.append(carteSeanceChoix(s, "", sj && sj.id === s.id)));
    // Séances des routines perso.
    const persos = Etat.data.programmesPerso || [];
    if (persos.some((r) => r.seances.length)) {
      v.append(h(`<div class="eyebrow" style="margin:18px 0 8px">Mes routines</div>`));
      persos.forEach((r) => r.seances.forEach((s) => v.append(carteSeanceChoix(s, r.nom, false))));
    }
    return;
  }
  const seance = trouverSeance(LIVE.seanceId);
  if (!seance) { LIVE = null; persistLive(true); render(); return; }
  // En-tête de séance : nom + chrono + progression (séries validées / total)
  const pr = progressionSeance(seance);
  const nbExos = seance.exercices.length;
  const head = h(`<div class="card trainhead stack"></div>`);
  head.append(h(`<div class="spread"><div style="min-width:0"><h1 style="margin:0;font-size:1.3rem">${esc(seance.nom)}</h1><span class="livetimer"><span class="livedot" aria-hidden="true"></span><span class="num" id="seanceTimer">00:00</span></span></div><button class="chip danger" id="abandon">Abandonner</button></div>`));
  head.append(h(`<div class="bar"><div id="seanceProgBar" style="width:${Math.round(pr.pct * 100)}%"></div></div>`));
  head.append(h(`<div class="muted small" id="seanceProgTxt">${pr.faits}/${pr.tot} séries · ${nbExos} exercices · sauvegarde auto 💾</div>`));
  const bGuide = h(`<button class="secondary big" style="margin-top:10px"><span class="btn-ico">${IC.forward}</span>Mode guidé (pas à pas)</button>`);
  bGuide.addEventListener("click", ouvrirGuide);
  head.append(bGuide);
  v.append(head);
  arreterChrono(); majChrono(); SESSION_TMR = setInterval(majChrono, 1000);
  seance.exercices.forEach((e) => v.append(carteExoLive(e)));
  const bAdd = h(`<button class="chip" style="margin-top:8px"><span class="cic">${IC.plus}</span>Ajouter un exercice</button>`);
  bAdd.addEventListener("click", () => ajouterExerciceLive(seance));
  v.append(bAdd);
  const fin = h(`<button class="primary big" style="margin-top:12px">Terminer et enregistrer</button>`);
  fin.addEventListener("click", terminer);
  v.append(fin);
  $("#abandon", v).addEventListener("click", async () => { if (await confirmer("Abandonner la séance sans enregistrer ?", { danger: true, ok: "Abandonner" })) { LIVE = null; persistLive(true); render(); } });
}
function demarrer(seance) {
  APERCU = null;
  LIVE = nouvelleSession(seance);
  persistLive(true);
  render();
}
/** Carte cliquable de choix de séance : silhouette des muscles + ouverture de l'aperçu. */
function carteSeanceChoix(s, sousTitre, aujourdhui) {
  const meta = `${s.exercices.length} exos · ~${s.dureeEstimeeMin || 0} min`
    + (sousTitre ? ` · ${esc(sousTitre)}` : "") + (aujourdhui ? " · aujourd'hui" : "");
  const b = h(`<button class="card wcard sil ${aujourdhui ? "today" : ""}">
    ${miniSilhouette(musclesSeance(s))}
    <span class="g"><b>${esc(s.nom)}</b><br><span class="muted small">${meta}</span></span>
    <span class="chev" aria-hidden="true">›</span></button>`);
  b.addEventListener("click", () => { APERCU = s.id; render(); window.scrollTo(0, 0); });
  return b;
}
/** Met à jour en direct le bandeau de progression sans re-rendre toute la vue. */
function majProgressionSeance() {
  const seance = LIVE && trouverSeance(LIVE.seanceId);
  if (!seance) return;
  const pr = progressionSeance(seance);
  const bar = $("#seanceProgBar"), txt = $("#seanceProgTxt");
  if (bar) bar.style.width = `${Math.round(pr.pct * 100)}%`;
  if (txt) txt.textContent = `${pr.faits}/${pr.tot} séries validées · sauvegarde auto 💾`;
}
/** Progression d'une séance en cours : séries validées / total. */
function progressionSeance(seance) {
  let tot = 0, faits = 0;
  for (const e of seance.exercices) {
    const st = LIVE.data[e.exerciceId];
    if (!st) continue;
    for (const s of st.series) { tot++; if (s.done) faits++; }
  }
  return { tot, faits, pct: tot ? faits / tot : 0 };
}
function carteExoLive(e) {
  const st = LIVE.data[e.exerciceId];
  const exo = getExercise(st.exId);
  if (!exo) {
    const c = h(`<div class="card"><div class="spread"><b>${esc(st.exId)}</b><button class="chip danger" aria-label="Retirer">🗑️</button></div><div class="muted small">Exercice indisponible.</div></div>`);
    c.querySelector("button").addEventListener("click", () => retirerExerciceLive(e.exerciceId));
    return c;
  }
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
  // Tableau des séries : Série · Précédent (ou RIR) · Kg · Reps · Validé
  const col2 = st.showRir ? "RIR" : "Précédent";
  c.append(h(`<div class="setrow"><span class="head">Série</span><span class="head">${col2}</span><span class="head">${enTemps ? "Sec" : "Kg"}</span><span class="head">${enTemps ? "Durée" : "Reps"}</span><span class="head">✓</span></div>`));
  st.series.forEach((s, i) => {
    const dp = derniere && derniere.series[i];
    const prev = dp ? (enTemps ? `${dp.dureeSec || 0}s` : `${dp.chargeKg || 0}×${dp.reps || 0}`) : "—";
    const col2El = st.showRir
      ? `<input inputmode="numeric" placeholder="2" value="${s.rir}" data-f="rir" aria-label="RIR série ${i + 1}">`
      : `<span class="prev muted">${prev}</span>`;
    const row = h(`<div class="setrow${s.done ? " vdone" : ""}">
      <span class="serie">${i + 1}</span>
      ${col2El}
      <input inputmode="decimal" placeholder="${sug.chargeKg || "—"}" value="${s.charge}" data-f="charge" aria-label="Charge série ${i + 1}">
      <input inputmode="numeric" placeholder="${enTemps ? s.dureeSec : plage[0]}" value="${enTemps ? s.dureeSec : s.reps}" data-f="${enTemps ? "dureeSec" : "reps"}" aria-label="${enTemps ? "Durée" : "Répétitions"} série ${i + 1}">
      <button class="done ${s.done ? "on" : ""}" aria-label="Valider la série ${i + 1}">✓</button></div>`);
    on(row, "input", "input", (ev) => { const f = ev.target.dataset.f; s[f] = ev.target.value; persistLive(); });
    row.querySelector(".done").addEventListener("click", (ev) => {
      s.done = !s.done;
      const btn = ev.currentTarget;
      btn.classList.toggle("on", s.done);
      row.classList.toggle("vdone", s.done);
      if (s.done) { btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop"); try { navigator.vibrate?.(20); } catch (e) {} }
      persistLive(); majProgressionSeance();
      if (s.done) startTimer(t?.reposSec || 60, `${exo.nom} · série ${i + 1}`);
    });
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
  // Remplissage rapide : un tap pré-remplit les séries vides avec la dernière
  // fois (ou la charge conseillée) → beaucoup moins de saisie à la salle.
  const peutRemplir = !enTemps && (derniere || sug.chargeKg) && st.series.some((s) => !s.charge || !s.reps);
  if (peutRemplir) {
    const bFill = h(`<button class="chip"><span class="cic">${IC.cornerDown}</span>Reprendre</button>`);
    bFill.title = "Pré-remplir avec la dernière fois / le conseil";
    bFill.addEventListener("click", () => {
      st.series.forEach((s, i) => {
        const dp = derniere && derniere.series[i];
        if (!s.charge && (dp?.chargeKg != null || sug.chargeKg != null)) s.charge = String(dp?.chargeKg ?? sug.chargeKg);
        if (!s.reps && (dp?.reps != null || plage?.[0] != null)) s.reps = String(dp?.reps ?? plage[0]);
      });
      persistLive(true); toast("Séries pré-remplies — ajuste puis valide ✓"); render();
    });
    serieActs.append(bFill);
  }
  c.append(serieActs);
  const acts = h(`<div class="row"></div>`);
  const bDouleur = h(`<button class="chip ${st.douleur ? "danger" : ""}"><span class="cic">${IC.alert}</span>${st.douleur ? "Douleur signalée" : "Signaler une douleur"}</button>`);
  bDouleur.addEventListener("click", () => { st.douleur = !st.douleur; persistLive(true); if (st.douleur) info("Douleur vive, articulaire ou inhabituelle : arrête cet exercice aujourd'hui. Si elle persiste, consulte un professionnel de santé.", { titre: "⚠️ Douleur signalée" }); render(); });
  const bDemo = h(`<button class="chip"><span class="cic">${IC.play}</span>Démo</button>`);
  bDemo.addEventListener("click", () => ouvrirDetail(exo));
  const bRir = h(`<button class="chip ${st.showRir ? "on" : ""}" title="Afficher la colonne RIR (reps en réserve)">RIR</button>`);
  bRir.addEventListener("click", () => { st.showRir = !st.showRir; persistLive(true); render(); });
  const bRempl = h(`<button class="chip"><span class="cic">${IC.swap}</span>Remplacer</button>`);
  bRempl.addEventListener("click", () => remplacer(e.exerciceId));
  const bRetirer = h(`<button class="chip"><span class="cic">${IC.trash}</span>Retirer</button>`);
  bRetirer.addEventListener("click", async () => { if (await confirmer(`Retirer « ${exo.nom} » de la séance ?`, { danger: true, ok: "Retirer" })) retirerExerciceLive(e.exerciceId); });
  acts.append(bDemo, bRir, bDouleur, bRempl, bRetirer);
  c.append(acts);
  // Exercice terminé (toutes les séries validées) → état visuel discret.
  if (st.series.length && st.series.every((s) => s.done)) c.classList.add("exo-done");
  return c;
}
/** Ajoute un exercice au vol pendant la séance (choix dans le catalogue). */
function ajouterExerciceLive(seance) {
  choisirExercice((exId) => {
    if (LIVE.data[exId]) { toast("Cet exercice est déjà dans la séance."); return; }
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
async function remplacer(exId) {
  const seance = trouverSeance(LIVE.seanceId);
  const presents = seance.exercices.map((x) => x.exerciceId);
  const alts = alternatives(exId, Etat.data.profil, presents);
  if (!alts.length) { info("Aucune alternative compatible trouvée avec ton matériel et tes contraintes.", { titre: "Remplacer" }); return; }
  const choix = await dialogue({
    titre: "Remplacer par",
    cancelVal: null,
    actions: [{ label: "Annuler", valeur: null }],
    onMount: (inner, close) => {
      const liste = h(`<div class="stack" style="margin-bottom:8px"></div>`);
      alts.forEach((a, i) => {
        const b = h(`<button class="big" style="justify-content:flex-start;text-align:left;margin:3px 0"><span><b>${esc(a.exercice.nom)}</b><br><span class="muted small">${esc(a.etiquette)}</span></span></button>`);
        b.addEventListener("click", () => close(i));
        liste.append(b);
      });
      inner.insertBefore(liste, inner.querySelector(".row"));
    },
  });
  if (choix == null || choix < 0 || choix >= alts.length) return;
  const nouvel = alts[choix].exercice;
  // remplace dans le programme ET dans la séance en cours
  const ex = seance.exercices.find((x) => x.exerciceId === exId);
  ex.exerciceId = nouvel.id; ex.justification = `Remplacement choisi : ${alts[choix].explication}`;
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
  arreterChrono();
  nav("dash");
  ecranFinSeance(nouveauLog, prs);
}
/** Écran récapitulatif de fin de séance (façon maquette). */
function ecranFinSeance(log, prs) {
  const min = Math.round((log.dureeSec || 0) / 60);
  const dureeTxt = min >= 60 ? `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}` : `${min} min`;
  const nbSeries = (log.exercices || []).reduce((a, e) => a + (e.series || []).length, 0);
  const volume = Math.round(volumeLog(log));
  const kcal = Math.round(min * 8);
  const sheet = h(`<div class="sheet finseance"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="fin-head"><div class="fin-check">✓</div><h1 style="margin:16px 0 4px">Séance terminée 🎉</h1><div class="muted">Excellent travail, continue comme ça !</div></div>`));
  const g = h(`<div class="statgrid" style="margin-top:20px"></div>`);
  g.append(statCard(IC.clock, dureeTxt, "Durée"));
  g.append(statCard(IC.dumbbell, `${(log.exercices || []).length}`, "Exercices"));
  g.append(statCard(IC.repeat, `${nbSeries}`, "Séries"));
  g.append(statCard(IC.bars, volume.toLocaleString("fr-FR"), "Volume kg"));
  g.append(statCard(IC.flame, `${kcal}`, "Calories"));
  g.append(statCard(IC.trophy, `${prs.length}`, prs.length > 1 ? "Records" : "Record"));
  inner.append(g);
  if (prs.length) {
    const rc = h(`<div class="card stack" style="margin-top:14px"><b>🏆 ${prs.length > 1 ? "Nouveaux records" : "Nouveau record"} !</b></div>`);
    prs.forEach((r) => rc.append(h(`<div class="small">• ${esc(r.nom)} : ${esc(etiquettePR(r))}</div>`)));
    inner.append(rc);
  }
  const bEtir = h(`<button class="card wcard sil warm-cta" style="width:100%;margin-top:16px;text-align:left"><span class="mi mi-indigo" style="width:34px;height:34px">${IC.wind}</span><span class="g"><b>Étirements guidés</b><br><span class="muted small">${ETIREMENTS.length} mouvements · ~${Math.round(dureeSequence(ETIREMENTS) / 60)} min · retour au calme</span></span><span class="chev" aria-hidden="true">›</span></button>`);
  bEtir.addEventListener("click", () => ouvrirSequence("Étirements", ETIREMENTS, { onFin: () => {} }));
  inner.append(bEtir);
  const acts = h(`<div class="row" style="margin-top:16px"></div>`);
  const bVoir = h(`<button class="secondary big" style="flex:1">Voir la séance</button>`);
  bVoir.addEventListener("click", () => { sheet.remove(); nav("stats"); });
  const bFin = h(`<button class="primary big" style="flex:1">Terminer</button>`);
  bFin.addEventListener("click", () => { sheet.remove(); nav("dash"); });
  acts.append(bVoir, bFin);
  inner.append(acts);
  document.body.append(sheet);
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
function startTimer(sec, label = "") {
  const ov = $("#overlay"); ov.classList.add("show");
  const sub = $("#ovSub"); if (sub) sub.textContent = label;
  const ann = $("#ovAnnonce"); if (ann) ann.textContent = `Temps de repos ${sec} secondes${label ? ", " + label : ""}`; // annonce lecteurs d'écran
  const ring = $("#overlay .ring");
  let total = sec, left = sec;
  const draw = () => {
    $("#ovTxt").textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    $("#ringFg").style.strokeDashoffset = String(653 * (1 - left / total));
    if (ring) ring.classList.toggle("urgent", left <= 10);
  };
  draw(); clearInterval(TMR);
  TMR = setInterval(() => { left--; if (left <= 0) { if (ann) ann.textContent = "Repos terminé, série suivante"; stopTimer(); try { navigator.vibrate?.([120, 60, 120]); } catch (e) {} return; } draw(); }, 1000);
  $("#ovPlus").onclick = () => { left += 15; total = Math.max(total, left); draw(); };
  $("#ovMinus").onclick = () => { left = Math.max(1, left - 15); draw(); };
  $("#ovSkip").onclick = stopTimer;
  // Un tap sur le fond ferme le minuteur (pour revenir à « Terminer » facilement).
  ov.onclick = (e) => { if (e.target === ov) stopTimer(); };
}
function stopTimer() { clearInterval(TMR); $("#overlay").classList.remove("show"); $("#overlay .ring")?.classList.remove("urgent"); }

/* ======================================================================
   LECTEUR DE SÉANCE GUIDÉ (plein écran, pas à pas)
   S'appuie sur l'état LIVE existant : chaque écran = une série d'un exercice ;
   après validation → écran de repos (décompte) → série/exercice suivant. Aucun
   nouveau stockage : on écrit dans LIVE.data comme la vue classique, donc la
   sauvegarde et la reprise fonctionnent à l'identique.
   ====================================================================== */
let GUIDE = null; // { ei, si, phase:'work'|'rest', tmr, left, total }

/** Exercices de la séance présents dans l'état live, dans l'ordre. */
function guideExos() {
  const seance = LIVE && trouverSeance(LIVE.seanceId);
  if (!seance) return [];
  return seance.exercices.filter((e) => LIVE.data[e.exerciceId]).map((e) => ({ e, st: LIVE.data[e.exerciceId], exo: getExercise(e.exerciceId) }));
}
/** Total de séries et séries validées, tout l'entraînement confondu. */
function guideProg() {
  let tot = 0, done = 0;
  for (const { st } of guideExos()) for (const s of st.series) { tot++; if (s.done) done++; }
  return { tot, done, pct: tot ? done / tot : 0 };
}
/** Première étape non validée (pour reprendre au bon endroit). */
function guidePremiereEtape() {
  const exos = guideExos();
  for (let ei = 0; ei < exos.length; ei++) {
    const s = exos[ei].st.series;
    for (let si = 0; si < s.length; si++) if (!s[si].done) return { ei, si };
  }
  return exos.length ? { ei: 0, si: 0 } : null;
}
function ouvrirGuide() {
  if (!LIVE) return;
  const dep = guidePremiereEtape();
  if (!dep) { toast("Aucune série à guider."); return; }
  GUIDE = { ...dep, phase: "work", tmr: null, left: 0, total: 0 };
  let g = $("#guide");
  if (!g) { g = h(`<div id="guide" class="guide" role="dialog" aria-label="Séance guidée"><div class="guide-in"></div></div>`); document.body.append(g); }
  document.body.classList.add("guide-open");
  g.classList.add("show");
  guideRender();
}
function guideFermer() {
  if (GUIDE?.tmr) clearInterval(GUIDE.tmr);
  GUIDE = null;
  $("#guide")?.classList.remove("show");
  document.body.classList.remove("guide-open");
  persistLive(true);
  render();
}
/** Passe à l'étape suivante ; renvoie false s'il n'y en a plus (séance finie). */
function guideAvancer() {
  const exos = guideExos();
  const cur = exos[GUIDE.ei];
  if (!cur) return false;
  if (GUIDE.si + 1 < cur.st.series.length) { GUIDE.si++; return true; }
  if (GUIDE.ei + 1 < exos.length) { GUIDE.ei++; GUIDE.si = 0; return true; }
  return false;
}
/** Enregistre la série courante, puis enchaîne repos → suivant (ou fin). */
function guideValider(charge, valeur, enTemps) {
  const exos = guideExos();
  const cur = exos[GUIDE.ei];
  if (!cur) return;
  const s = cur.st.series[GUIDE.si];
  if (charge !== "") s.charge = String(charge);
  if (valeur !== "") { if (enTemps) s.dureeSec = +valeur; else s.reps = String(valeur); }
  s.done = true;
  persistLive(); majProgressionSeance();
  try { navigator.vibrate?.(20); } catch (e) {}
  const t = cur.e.series.find((x) => x.type === "travail") || cur.e.series[0];
  const repos = (t && t.reposSec) || 60;
  const encore = guideAvancer();
  if (!encore) { guideFin(); return; }
  guideRepos(repos);
}
/** Écran de repos avec décompte ; à 0 (ou « passer ») → série suivante. */
function guideRepos(sec) {
  GUIDE.phase = "rest"; GUIDE.total = sec; GUIDE.left = sec;
  guideRender();
}
function guideFin() {
  guideFermer();
  terminer();
}
function guideRender() {
  const g = $("#guide .guide-in");
  if (!g || !GUIDE) return;
  if (GUIDE.tmr) { clearInterval(GUIDE.tmr); GUIDE.tmr = null; }
  const exos = guideExos();
  const cur = exos[GUIDE.ei];
  if (!cur) { guideFin(); return; }
  const { pct, done, tot } = guideProg();
  const barre = `<div class="guide-top">
      <button class="guide-x" aria-label="Quitter le mode guidé">${IC.x}</button>
      <div class="guide-count">Exercice ${GUIDE.ei + 1}/${exos.length} · série ${GUIDE.si + 1}/${cur.st.series.length}</div>
      <div class="guide-progn num">${done}/${tot}</div>
    </div>
    <div class="bar guide-bar"><div style="width:${Math.round(pct * 100)}%"></div></div>`;
  g.innerHTML = "";
  g.append(h(barre));
  $("#guide .guide-x").addEventListener("click", () => { if (confirm) guideFermer(); });

  if (GUIDE.phase === "rest") { guideRenderRepos(g, cur); return; }
  guideRenderWork(g, cur);
}
function guideRenderWork(g, cur) {
  const { e, st, exo } = cur;
  const nom = exo ? exo.nom : e.exerciceId;
  const muscles = (exo && exo.musclesPrincipaux) || [];
  const enTemps = !!st.series[GUIDE.si]?.dureeSec || !!st.series[0]?.dureeSec;
  const t = e.series.find((x) => x.type === "travail") || e.series[0];
  const plage = (t && t.repsCible) || (exo && exo.repsPertinent) || [8, 12];
  const [derniere, avant] = exo ? Etat.perfs(st.exId) : [null, null];
  const sug = exo ? recommander(st.exId, plage, derniere || null, avant || null) : { message: "", chargeKg: null };
  const s = st.series[GUIDE.si];
  const cibleTxt = enTemps ? `${s.dureeSec || t?.dureeSec || 40} s` : `${plage[0]}–${plage[1]} reps`;

  const body = h(`<div class="guide-body"></div>`);
  if (exo && exo.patron) body.append(h(`<div class="guide-demo">${animDemo(exo)}</div>`));
  else body.append(h(`<div class="guide-sil">${muscles.length ? miniSilhouette(muscles) : ""}</div>`));
  body.append(h(`<h1 class="guide-nom">${esc(nom)}</h1>`));
  if (muscles.length) body.append(h(`<div class="guide-mus">${muscles.map((m) => esc(MUSCLE_LABELS[m] || m)).join(" · ")}</div>`));
  body.append(h(`<div class="guide-cible"><span class="num">${esc(cibleTxt)}</span>${sug.chargeKg ? ` · conseil ~${sug.chargeKg} kg` : ""}</div>`));
  if (sug.message) body.append(h(`<div class="notice small guide-conseil">${esc(sug.message)}</div>`));

  const inp = h(`<div class="guide-inputs"></div>`);
  const champCharge = h(`<label class="guide-field"><span>${enTemps ? "Charge (kg)" : "Charge (kg)"}</span><input inputmode="decimal" value="${s.charge || ""}" placeholder="${sug.chargeKg || "—"}" aria-label="Charge"></label>`);
  const champVal = h(`<label class="guide-field"><span>${enTemps ? "Durée (s)" : "Répétitions"}</span><input inputmode="numeric" value="${enTemps ? (s.dureeSec || "") : (s.reps || "")}" placeholder="${enTemps ? (t?.dureeSec || 40) : plage[0]}" aria-label="${enTemps ? "Durée" : "Répétitions"}"></label>`);
  inp.append(champCharge, champVal);
  body.append(inp);
  g.append(body);

  const acts = h(`<div class="guide-actions"></div>`);
  const bPrev = h(`<button class="chip guide-nav"${GUIDE.ei === 0 && GUIDE.si === 0 ? " disabled" : ""}><span class="cic">${IC.back}</span></button>`);
  bPrev.addEventListener("click", () => { if (guideReculer()) guideRender(); });
  const bOk = h(`<button class="primary big guide-valider"><span class="btn-ico">${IC.check}</span>${s.done ? "Série suivante" : "Valider la série"}</button>`);
  bOk.addEventListener("click", () => {
    const c = champCharge.querySelector("input").value.trim();
    const val = champVal.querySelector("input").value.trim();
    guideValider(c, val, enTemps);
  });
  const bSkip = h(`<button class="chip guide-nav" aria-label="Passer"><span class="cic">${IC.forward}</span></button>`);
  bSkip.addEventListener("click", () => { if (!guideAvancer()) { guideFin(); return; } GUIDE.phase = "work"; guideRender(); });
  acts.append(bPrev, bOk, bSkip);
  g.append(acts);
}
/** Recule d'une étape (série précédente / exercice précédent). */
function guideReculer() {
  const exos = guideExos();
  if (GUIDE.si > 0) { GUIDE.si--; return true; }
  if (GUIDE.ei > 0) { GUIDE.ei--; GUIDE.si = Math.max(0, exos[GUIDE.ei].st.series.length - 1); return true; }
  return false;
}
function guideRenderRepos(g, cur) {
  const exos = guideExos();
  const suiv = exos[GUIDE.ei];
  const nomSuiv = suiv && (suiv.exo ? suiv.exo.nom : suiv.e.exerciceId);
  const rest = h(`<div class="guide-rest">
    <div class="eyebrow">Récupération</div>
    <h1 class="guide-repos-t">Repos</h1>
    <div class="ring guide-ring">
      <svg viewBox="0 0 230 230"><circle cx="115" cy="115" r="104" fill="none" stroke="var(--surface-2)" stroke-width="12"/>
      <circle class="gfg" cx="115" cy="115" r="104" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-dasharray="653" stroke-dashoffset="0"/></svg>
      <div class="t num guide-count-t">0:00</div>
    </div>
    <div class="guide-next">À suivre : <b>${esc(nomSuiv || "")}</b> · série ${GUIDE.si + 1}</div>
    <div class="row" style="justify-content:center">
      <button class="chip" id="gMinus">−15 s</button>
      <button class="chip" id="gPlus">+15 s</button>
    </div>
    <button class="primary big" id="gSkip" style="max-width:300px"><span class="btn-ico">${IC.forward}</span>Passer le repos</button>
  </div>`);
  g.append(rest);
  const txt = rest.querySelector(".guide-count-t");
  const fg = rest.querySelector(".gfg");
  const ring = rest.querySelector(".guide-ring");
  const draw = () => {
    txt.textContent = `${Math.floor(GUIDE.left / 60)}:${String(GUIDE.left % 60).padStart(2, "0")}`;
    fg.style.strokeDashoffset = String(653 * (1 - GUIDE.left / GUIDE.total));
    ring.classList.toggle("urgent", GUIDE.left <= 10);
  };
  const fini = () => { if (GUIDE.tmr) clearInterval(GUIDE.tmr); GUIDE.tmr = null; GUIDE.phase = "work"; try { navigator.vibrate?.([120, 60, 120]); } catch (e) {} guideRender(); };
  draw();
  GUIDE.tmr = setInterval(() => { GUIDE.left--; if (GUIDE.left <= 0) { fini(); return; } draw(); }, 1000);
  rest.querySelector("#gPlus").addEventListener("click", () => { GUIDE.left += 15; GUIDE.total = Math.max(GUIDE.total, GUIDE.left); draw(); });
  rest.querySelector("#gMinus").addEventListener("click", () => { GUIDE.left = Math.max(1, GUIDE.left - 15); draw(); });
  rest.querySelector("#gSkip").addEventListener("click", fini);
}

/* ======================================================================
   SÉQUENCE GUIDÉE (échauffement / étirement) — minuteur auto par mouvement
   Données déterministes (src/data/mobilite.js), aucune saisie, aucun stockage.
   ====================================================================== */
let SEQ = null; // { titre, items, idx, left, paused, tmr, fin }

function ouvrirSequence(titre, items, opts = {}) {
  if (!items || !items.length) return;
  SEQ = { titre, items, idx: 0, left: items[0].dureeSec, paused: false, tmr: null, teinte: opts.teinte || "accent", onFin: opts.onFin };
  let g = $("#seq");
  if (!g) { g = h(`<div id="seq" class="guide seq" role="dialog" aria-label="Séquence guidée"><div class="guide-in"></div></div>`); document.body.append(g); }
  document.body.classList.add("guide-open");
  g.classList.add("show");
  seqRender();
}
function seqFermer(fini = false) {
  if (SEQ?.tmr) clearInterval(SEQ.tmr);
  const cb = SEQ?.onFin;
  SEQ = null;
  $("#seq")?.classList.remove("show");
  document.body.classList.remove("guide-open");
  if (fini && cb) cb();
}
function seqAvancer(delta) {
  if (SEQ.tmr) { clearInterval(SEQ.tmr); SEQ.tmr = null; }
  const i = SEQ.idx + delta;
  if (i >= SEQ.items.length) { seqFini(); return; }
  SEQ.idx = Math.max(0, i);
  SEQ.left = SEQ.items[SEQ.idx].dureeSec;
  SEQ.paused = false;
  seqRender();
}
function seqFini() {
  const cb = SEQ?.onFin;
  seqFermer(false);
  try { navigator.vibrate?.([120, 60, 120]); } catch (e) {}
  toast(cb ? "Étirements terminés — bien joué 🧘" : "Échauffement terminé — bonne séance 💪");
  if (cb) cb();
}
function seqRender() {
  const g = $("#seq .guide-in");
  if (!g || !SEQ) return;
  if (SEQ.tmr) { clearInterval(SEQ.tmr); SEQ.tmr = null; }
  const it = SEQ.items[SEQ.idx];
  const pct = SEQ.items.slice(0, SEQ.idx).reduce((a, x) => a + x.dureeSec, 0);
  const tot = dureeSequence(SEQ.items);
  const pctGlobal = tot ? (pct + (it.dureeSec - SEQ.left)) / tot : 0;
  g.innerHTML = "";
  g.append(h(`<div class="guide-top">
      <button class="guide-x" aria-label="Quitter">${IC.x}</button>
      <div class="guide-count">${esc(SEQ.titre)} · ${SEQ.idx + 1}/${SEQ.items.length}</div>
      <div class="guide-progn num">${Math.round(pctGlobal * 100)}%</div>
    </div>
    <div class="bar guide-bar"><div style="width:${Math.round(pctGlobal * 100)}%"></div></div>`));
  $("#seq .guide-x").addEventListener("click", () => seqFermer(false));

  const body = h(`<div class="guide-rest"></div>`);
  body.append(h(`<div class="guide-sil seq-sil">${it.muscles?.length ? miniSilhouette(it.muscles, it.view || "front") : ""}</div>`));
  body.append(h(`<h1 class="guide-nom" style="margin:2px 0 0">${esc(it.nom)}</h1>`));
  const ring = h(`<div class="ring guide-ring seq-ring">
      <svg viewBox="0 0 230 230"><circle cx="115" cy="115" r="104" fill="none" stroke="var(--surface-2)" stroke-width="12"/>
      <circle class="sfg" cx="115" cy="115" r="104" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-dasharray="653" stroke-dashoffset="0"/></svg>
      <div class="t num seq-t">0:00</div></div>`);
  body.append(ring);
  if (it.consigne) body.append(h(`<div class="guide-next seq-consigne">${esc(it.consigne)}</div>`));
  g.append(body);

  const acts = h(`<div class="guide-actions"></div>`);
  const bPrev = h(`<button class="chip guide-nav"${SEQ.idx === 0 ? " disabled" : ""} aria-label="Précédent"><span class="cic">${IC.back}</span></button>`);
  bPrev.addEventListener("click", () => seqAvancer(-1));
  const bPause = h(`<button class="primary big seq-pause">${SEQ.paused ? "Reprendre" : "Pause"}</button>`);
  bPause.addEventListener("click", () => { SEQ.paused = !SEQ.paused; bPause.textContent = SEQ.paused ? "Reprendre" : "Pause"; });
  const bNext = h(`<button class="chip guide-nav" aria-label="Suivant"><span class="cic">${IC.forward}</span></button>`);
  bNext.addEventListener("click", () => seqAvancer(1));
  acts.append(bPrev, bPause, bNext);
  g.append(acts);

  const txt = ring.querySelector(".seq-t");
  const fg = ring.querySelector(".sfg");
  const draw = () => {
    txt.textContent = `${Math.floor(SEQ.left / 60)}:${String(SEQ.left % 60).padStart(2, "0")}`;
    fg.style.strokeDashoffset = String(653 * (1 - SEQ.left / it.dureeSec));
    ring.classList.toggle("urgent", SEQ.left <= 5);
  };
  draw();
  SEQ.tmr = setInterval(() => { if (SEQ.paused) return; SEQ.left--; if (SEQ.left <= 0) { seqAvancer(1); return; } draw(); }, 1000);
}

/* ======================================================================
   NUTRITION (Open Food Facts + base locale)
   ====================================================================== */
const VERRE_ML = 250; // un verre standard
const REPAS = [
  ["petit_dej", "Petit déjeuner", mi(IC.coffee, "mi-orange")],
  ["dejeuner", "Déjeuner", mi(IC.utensils, "mi-blue")],
  ["collation", "Collation", mi(IC.apple, "mi-green")],
  ["diner", "Dîner", mi(IC.plate, "mi-indigo")],
];
let CUR_REPAS = null; // repas cible pour les ajouts (défaut : selon l'heure)
/** Carte d'hydratation interactive : verres bus vs objectif du jour. */
function carteEau(v, b, jour) {
  const cibleMl = Math.round((b.eau || 2) * 1000);
  const nbVerres = Math.max(1, Math.round(cibleMl / VERRE_ML));
  const bus = Etat.data.waterlog[jour] || 0;
  const busVerres = Math.round(bus / VERRE_ML);
  const pct = Math.min(100, Math.round((bus / cibleMl) * 100));
  const majEau = (delta) => {
    const n = Math.max(0, (Etat.data.waterlog[jour] || 0) + delta);
    if (n === 0) delete Etat.data.waterlog[jour]; else Etat.data.waterlog[jour] = n;
    Etat.sauver(); render();
  };
  const c = h(`<div class="card stack"></div>`);
  c.append(h(`<div class="spread"><h2 style="margin:0"><span class="mi mi-blue" style="width:20px;height:20px;vertical-align:-4px">${IC.droplet}</span> Hydratation</h2><span class="num muted">${(bus / 1000).toFixed(2)} / ${b.eau} L</span></div>`));
  c.append(h(`<div class="bar mw"><div style="width:${pct}%"></div></div>`));
  // Rangée de verres (remplis / vides)
  const verres = h(`<div class="glasses"></div>`);
  for (let i = 0; i < nbVerres; i++) verres.append(h(`<span class="glass${i < busVerres ? " on" : ""}" aria-hidden="true"></span>`));
  c.append(verres);
  const row = h(`<div class="row"></div>`);
  const bMoins = h(`<button aria-label="Retirer un verre" ${bus <= 0 ? "disabled" : ""}>−</button>`);
  const bVerre = h(`<button class="primary" style="flex:1" aria-label="Ajouter un verre de 25 cl">+ 25 cl</button>`);
  const bBout = h(`<button aria-label="Ajouter une bouteille de 50 cl">+ 50 cl</button>`);
  bMoins.addEventListener("click", () => majEau(-VERRE_ML));
  bVerre.addEventListener("click", () => majEau(VERRE_ML));
  bBout.addEventListener("click", () => majEau(2 * VERRE_ML));
  row.append(bMoins, bVerre, bBout);
  c.append(row);
  c.append(h(`<div class="hint">Objectif estimé ~${b.eau} L/jour (≈ ${nbVerres} verres). Bois régulièrement, davantage à l'entraînement et par forte chaleur.</div>`));
  v.append(c);
}
function vNutrition(v) {
  const p = Etat.data.profil;
  const b = calculerBesoins(p);
  const jour = todayStr();
  const log = Etat.data.foodlog[jour] || [];
  const tot = log.reduce((a, f) => ({ kcal: a.kcal + f.kcal, p: a.p + f.p, c: a.c + f.c, l: a.l + f.l }), { kcal: 0, p: 0, c: 0, l: 0 });

  v.append(h(`<h1 style="margin-bottom:12px">Nutrition</h1>`));
  // Objectifs du jour : anneau calories + barres de macros
  const restant = b.kcal - Math.round(tot.kcal);
  const cible = h(`<div class="card stack"></div>`);
  const top = h(`<div class="ringstat"></div>`);
  top.append(h(anneauSVG(Math.min(1, tot.kcal / (b.kcal || 1)), 96, `${Math.round(tot.kcal)}`)));
  const kinfo = h(`<div style="flex:1;min-width:0"></div>`);
  kinfo.append(h(`<div class="eyebrow" style="color:var(--accent-ink)">Calories</div>`));
  kinfo.append(h(`<div style="margin:2px 0"><b style="font-size:1.5rem">${Math.round(tot.kcal)}</b> <span class="muted">/ ${b.kcal} kcal</span></div>`));
  kinfo.append(h(`<span class="badge ${restant >= 0 ? "ok" : "amber"}">${restant >= 0 ? `${restant} kcal restantes` : `${-restant} kcal au-dessus`}</span>`));
  top.append(kinfo);
  cible.append(top);
  cible.append(macroBar("Protéines", tot.p, b.prot, "g", "mp"));
  cible.append(macroBar("Glucides", tot.c, b.gluc, "g", "mg"));
  cible.append(macroBar("Lipides", tot.l, b.lip, "g", "ml"));
  cible.append(h(`<div class="hint">Estimation Mifflin-St Jeor : BMR ${b.bmr} × activité ${b.facteur} = ~${b.tdee} kcal, ajusté selon ton objectif. On affine selon la tendance de poids sur 1–2 semaines, jamais sur une seule pesée. Ceci n'est pas un avis diététique médical.</div>`));
  v.append(cible);

  // Hydratation : suivi interactif (façon carte « Water Intake »)
  carteEau(v, b, jour);

  // Journal par repas + recherche
  if (!CUR_REPAS) { const hr = new Date().getHours(); CUR_REPAS = hr < 11 ? "petit_dej" : hr < 15 ? "dejeuner" : hr < 19 ? "collation" : "diner"; }
  const cj = h(`<div class="card stack"><h2 style="margin:0">Journal du jour</h2></div>`);
  const selRepas = h(`<div><div class="eyebrow" style="margin-bottom:6px">Ajouter à</div></div>`);
  const chipsRepas = h(`<div class="row" style="overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none"></div>`);
  REPAS.forEach(([k, lab, ic]) => { const b = h(`<button class="chip ${CUR_REPAS === k ? "on" : ""}">${ic} ${lab}</button>`); b.addEventListener("click", () => { CUR_REPAS = k; render(); }); chipsRepas.append(b); });
  selRepas.append(chipsRepas);
  const rowSearch = h(`<div class="row"><input id="foodQ" aria-label="Rechercher un aliment" placeholder="Rechercher un aliment (riz, poulet…)" style="flex:1"><button class="primary" id="foodGo">OK</button></div>`);
  const rowCode = h(`<div class="row"><input id="foodCode" aria-label="Code-barres produit" inputmode="numeric" placeholder="Code-barres" style="flex:1"><button id="codeGo">Scanner</button></div>`);
  const res = h(`<div id="foodRes"></div>`);
  const logBox = h(`<div id="foodLog" style="margin-top:6px"></div>`);
  cj.append(selRepas, rowSearch, rowCode, res, h(`<hr style="border:none;border-top:1px solid var(--line);margin:6px 0">`), logBox);
  v.append(cj);

  const ajouter = (f, g) => {
    const m = portion(f, g);
    (Etat.data.foodlog[jour] ||= []).push({ name: f.n, g, ...m, src: f.src, repas: CUR_REPAS });
    Etat.sauver(); render();
  };
  const afficherResultats = (list) => {
    res.innerHTML = "";
    if (!list.length) { res.append(h(`<div class="muted small" style="margin-top:6px">Aucun résultat.</div>`)); return; }
    for (const f of list.slice(0, 12)) {
      const line = h(`<div class="exline"><div class="meta"><div class="nm small">${esc(f.n)} <span class="tag">${esc(f.src)}${f.note ? " · " + esc(f.note) : ""}</span></div>
        <div class="muted small">${f.kcal} kcal · P${f.p} · G${f.c} · L${f.l} /100 g</div></div>
        <button class="chip">+ Ajouter</button></div>`);
      line.querySelector("button").addEventListener("click", async () => {
        const g = await demanderTexte(`Quantité pour « ${f.n} »`, "100", { ok: "Ajouter", inputmode: "decimal", placeholder: "grammes" });
        if (g && +g > 0) ajouter(f, +g);
      });
      res.append(line);
    }
  };
  const dessinerLog = () => {
    const lg = Etat.data.foodlog[jour] || [];
    logBox.innerHTML = "";
    if (!lg.length) { logBox.append(h(`<div class="muted small">Rien d'enregistré aujourd'hui.</div>`)); return; }
    const groupes = [...REPAS, ["autre", "Autres", mi(IC.fork, "mi-muted")]];
    const cle = (f) => (REPAS.some((r) => r[0] === f.repas) ? f.repas : "autre");
    groupes.forEach(([k, lab, ic]) => {
      const items = lg.map((f, i) => ({ f, i })).filter(({ f }) => cle(f) === k);
      if (!items.length) return;
      const tot = items.reduce((a, { f }) => a + (f.kcal || 0), 0);
      logBox.append(h(`<div class="spread" style="margin:10px 0 4px"><span class="repas-h">${ic} ${lab}</span><span class="num muted small">${Math.round(tot)} kcal</span></div>`));
      items.forEach(({ f, i }) => {
        const line = h(`<div class="exline"><div class="meta"><div class="nm small">${esc(f.name)} <span class="muted">· ${f.g} g</span></div>
          <div class="muted small">${f.kcal} kcal · P${f.p}</div></div><button class="chip" aria-label="Retirer l'aliment">✕</button></div>`);
        line.querySelector("button").addEventListener("click", () => { Etat.data.foodlog[jour].splice(i, 1); Etat.sauver(); render(); });
        logBox.append(line);
      });
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

  v.append(h(`<div class="warn small">${mi(IC.cross, "mi-amber")}Repères nutritionnels généraux, pas un régime médical. En cas de pathologie, trouble alimentaire ou doute, consulte un professionnel de santé ou un diététicien.</div>`));
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

/** Carte de chaleur musculaire : zones réellement travaillées (données locales). */
function carteMuscleHeatmap(v) {
  const logs = Etat.data.logs || [];
  if (!logs.length) return;
  const recents = logs.filter((l) => Date.now() - Date.parse(l.date) < 30 * 864e5);
  const source = recents.length ? recents : logs;
  const vm = volumeParMuscle(source, getExercise);
  if (!vm.length) return;
  const max = Math.max(...vm.map((x) => x.v), 1);
  const intensites = {};
  for (const x of vm) intensites[x.muscle] = x.v / max;
  const card = h(`<div class="card stack"><h2 class="row" style="margin:0;gap:8px">${mi(IC.map, "mi-blue")}Carte musculaire</h2><div class="small muted">Zones travaillées ${recents.length ? "(30 derniers jours)" : "(tout l'historique)"} · plus c'est vif, plus c'est sollicité</div></div>`);
  const wrap = h(`<div>${muscleHeatmap(intensites)}</div>`);
  let repli = false;
  wrap.querySelectorAll("img.base").forEach((img) => img.addEventListener("error", () => {
    if (repli) return; repli = true;
    wrap.innerHTML = `<div class="hint" style="text-align:center;padding:8px 0">Planche musculaire indisponible hors ligne pour l'instant.</div>`;
  }));
  card.append(wrap);
  const top = vm.slice(0, 4).map((x) => `<span class="tag">${esc(MUSCLE_LABELS[x.muscle] || x.muscle)}</span>`).join(" ");
  if (top) card.append(h(`<div class="row" style="flex-wrap:wrap;gap:4px;margin-top:6px">${top}</div>`));
  v.append(card);
}

/** Carte « Récupération musculaire » : quels groupes sont frais vs récemment
 *  travaillés, d'après tes vraies séances (aucune donnée inventée). */
function carteRecup(v) {
  const logs = Etat.data.logs || [];
  if (!logs.length) return;
  const recup = recuperationParMuscle(logs, getExercise).filter((r) => r.muscle !== "corps_entier");
  if (!recup.length) return;
  const card = h(`<div class="card stack"><h2 class="row" style="margin:0;gap:8px">${mi(IC.activity, "mi-green")}Récupération</h2><div class="small muted">D'après tes séances · 100 % = prêt à travailler, faible = récemment sollicité.</div></div>`);
  const liste = h(`<div class="recup-list"></div>`);
  recup.forEach((r) => {
    const col = r.pct >= 80 ? "var(--ok)" : r.pct >= 40 ? "var(--amber)" : "var(--danger)";
    const quand = r.jours < 1 ? "aujourd'hui" : `il y a ${Math.round(r.jours)} j`;
    liste.append(h(`<div class="recup-row">
      <span class="recup-sil">${miniSilhouette([r.muscle])}</span>
      <div class="recup-main">
        <div class="spread"><b>${esc(MUSCLE_LABELS[r.muscle] || r.muscle)}</b><span class="num" style="color:${col};font-weight:800">${r.pct}%</span></div>
        <div class="bar"><div style="width:${r.pct}%;background:${col}"></div></div>
        <span class="muted small">${quand}</span>
      </div></div>`));
  });
  card.append(liste);
  v.append(card);
}

/** Rangée de silhouettes des muscles ciblés (une par muscle, surlignée + label). */
function rangeeMuscles(muscles) {
  const list = (muscles || []).filter((m) => m !== "corps_entier").slice(0, 6);
  if (!list.length) return null;
  const row = h(`<div class="musc-row"></div>`);
  list.forEach((m) => row.append(h(`<div class="musc-cell"><span class="musc-sil">${miniSilhouette([m])}</span><span>${esc(MUSCLE_LABELS[m] || m)}</span></div>`)));
  return row;
}

function svgLine(points, label = "") {
  if (points.length < 2) return etatVide("📈", "Ta courbe arrive bientôt", "Enregistre au moins 2 séances pour voir ta tendance se dessiner.");
  const W = 600, H = 150, pad = 30;
  const ys = points.map((p) => p.v), ymin = Math.min(...ys), ymax = Math.max(...ys), yr = (ymax - ymin) || 1;
  const X = (i) => pad + (W - 2 * pad) * i / (points.length - 1), Y = (val) => H - pad - (H - 2 * pad) * (val - ymin) / yr;
  const pts = points.map((p, i) => [X(i), Y(p.v)]);
  // Courbe lissée (Catmull-Rom → Bézier cubique) façon « Workout Tracker »
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  const uid = "lg" + Math.random().toString(36).slice(2, 8);
  const aire = `${d} L${pts[pts.length - 1][0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`;
  const dots = pts.map(([x, y], i) => `<circle class="line-dot" style="--i:${i}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto" role="img" aria-label="${esc(label)}">
    <defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    <text x="${pad}" y="15" font-size="12" fill="var(--ink-soft)">${esc(label)}</text>
    <text x="2" y="${(Y(ymax) + 4).toFixed(1)}" font-size="11" fill="var(--ink-soft)">${ymax.toFixed(1)}</text>
    <text x="2" y="${(Y(ymin) + 4).toFixed(1)}" font-size="11" fill="var(--ink-soft)">${ymin.toFixed(1)}</text>
    <path class="line-area" d="${aire}" fill="url(#${uid})" stroke="none"/>
    <path class="line-draw" pathLength="1" stroke-dasharray="1" d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/>${dots}</svg>`;
}
/** Catégorie d'IMC : libellé + couleur (variable CSS). */
function categorieIMC(imc) {
  if (imc < 18.5) return { txt: "Insuffisant", col: "var(--amber)" };
  if (imc < 25) return { txt: "Normal", col: "var(--ok)" };
  if (imc < 30) return { txt: "Surpoids", col: "var(--amber)" };
  return { txt: "Obésité", col: "var(--danger)" };
}
/** Jauge IMC en donut (façon carte « BMI »), colorée selon la catégorie. */
function gaugeIMC(imc, taille = 96) {
  const cat = categorieIMC(imc);
  const r = (taille - 12) / 2, circ = 2 * Math.PI * r, cx = taille / 2;
  // Fraction sur une échelle lisible 15 → 40
  const frac = Math.max(0, Math.min(1, (imc - 15) / 25));
  const off = circ * (1 - frac);
  return `<svg width="${taille}" height="${taille}" viewBox="0 0 ${taille} ${taille}" aria-hidden="true">
    <g transform="rotate(-90 ${cx} ${cx})">
      <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="8"/>
      <circle class="ring-anim" style="--circ:${circ.toFixed(1)};--dashoff:${off.toFixed(1)}" cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${cat.col}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
    </g>
    <text x="50%" y="46%" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="850" fill="var(--ink)">${imc.toFixed(1)}</text>
    <text x="50%" y="64%" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="700" fill="var(--ink-soft)">IMC</text></svg>`;
}
function svgBars(bars, label = "") {
  if (!bars.length) return etatVide("📊", "Rien à afficher pour l'instant", "Tes volumes apparaîtront ici après ta première séance.");
  const W = 600, H = 155, pad = 30, n = bars.length, gap = (W - 2 * pad) / n, bw = gap * 0.6;
  const vmax = Math.max(...bars.map((b) => b.v), 1);
  const rects = bars.map((b, i) => {
    const x = pad + i * gap + (gap - bw) / 2, bh = (H - 2 * pad) * (b.v / vmax);
    return `<rect class="bar-grow" style="--i:${i};transform-origin:${(x + bw / 2).toFixed(1)}px ${(H - pad).toFixed(1)}px" x="${x.toFixed(1)}" y="${(H - pad - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="var(--accent)"/>`
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
let STATS_PERIODE = "30"; // période sélectionnée dans l'aperçu Progrès
function vStats(v) {
  const logs = Etat.data.logs;
  const p = Etat.data.profil;
  v.append(h(`<div class="eyebrow">Ton évolution</div>`));
  v.append(h(`<h1 style="margin-bottom:14px">Progrès</h1>`));

  const sm = statsSemaine(logs);
  const dm = dureeMoyenneMin(logs);
  const objSem = p.joursParSemaine || 3;

  // Carte héro : activité de la semaine (anneau séances 7 j vs objectif)
  const hero = h(`<div class="hero stack"><span class="glow"></span></div>`);
  const top = h(`<div class="ringstat"></div>`);
  top.append(h(anneauSVG(sm.seances / objSem, 78, `${sm.seances}/${objSem}`)));
  const info = h(`<div style="flex:1;min-width:0"></div>`);
  info.append(h(`<div class="eyebrow" style="color:var(--accent-ink)">Cette semaine</div>`));
  info.append(h(`<h2 style="margin:2px 0 4px">${sm.seances} séance${sm.seances > 1 ? "s" : ""}</h2>`));
  info.append(h(`<div class="muted small">${sm.seances ? `${sm.volume.toLocaleString("fr-FR")} kg de volume${sm.dureeMin != null ? ` · ~${sm.dureeMin} min/séance` : ""}` : "Aucune séance cette semaine — c'est le moment 💪"}</div>`));
  top.append(info);
  hero.append(top);
  v.append(hero);

  // Aperçu par période : filtres 7J · 30J · 3M · 6M · 1A · Tout
  v.append(h(`<div class="eyebrow" style="margin:20px 0 0">Aperçu</div>`));
  const PERIODES = [["7", "7J"], ["30", "30J"], ["90", "3M"], ["180", "6M"], ["365", "1A"], ["0", "Tout"]];
  const chipsP = h(`<div class="row" style="overflow-x:auto;flex-wrap:nowrap;margin:10px 0 12px;scrollbar-width:none"></div>`);
  PERIODES.forEach(([val, lab]) => {
    const b = h(`<button class="chip ${STATS_PERIODE === val ? "on" : ""}">${lab}</button>`);
    b.addEventListener("click", () => { STATS_PERIODE = val; render(); });
    chipsP.append(b);
  });
  v.append(chipsP);
  const jp = Number(STATS_PERIODE), depuis = jp ? Date.now() - jp * 864e5 : 0;
  const lp = logs.filter((l) => new Date(l.date).getTime() >= depuis);
  const volP = Math.round(lp.reduce((a, l) => a + volumeLog(l), 0));
  const dureeP = Math.round(lp.reduce((a, l) => a + (l.dureeSec || 0), 0) / 60);
  const g = h(`<div class="statgrid"></div>`);
  g.append(statCard(IC.dumbbell, `${lp.length}`, "Séances"));
  g.append(statCard(IC.clock, `${Math.floor(dureeP / 60)}h${String(dureeP % 60).padStart(2, "0")}`, "Temps total"));
  g.append(statCard(IC.bars, volP.toLocaleString("fr-FR"), "Volume kg"));
  g.append(statCard(IC.flame, (dureeP * 8).toLocaleString("fr-FR"), "Calories"));
  v.append(g);

  carteCalendrier(v, logs);

  // Graphique de progression interactif (exercice/corps × métrique × période)
  carteProgression(v);

  const sem = volumeParSemaine(logs);
  if (sem.length >= 1) v.append(h(`<div class="card">${svgBars(sem, "Volume par semaine (kg)")}</div>`));

  // Volume par groupe musculaire (répartition du travail)
  const parMuscle = volumeParMuscle(logs, getExercise).slice(0, 8)
    .map((x) => ({ x: MUSCLE_LABELS[x.muscle] || x.muscle, v: x.v }));
  if (parMuscle.length) v.append(h(`<div class="card">${svgBars(parMuscle, "Volume par groupe musculaire")}</div>`));

  // Carte de chaleur musculaire (visuel des zones travaillées)
  carteMuscleHeatmap(v);

  // Récupération musculaire (frais vs récemment travaillé, d'après les séances)
  carteRecup(v);

  // Records personnels (1RM estimé · Epley) — grille de cartes
  const prs = classementRecords(logs, nomExo, 8);
  if (prs.length) {
    v.append(h(`<div class="eyebrow" style="margin:18px 0 9px">Records personnels</div>`));
    const rg = h(`<div class="recgrid"></div>`);
    prs.slice(0, 6).forEach((r) => rg.append(h(`<div class="reccard"><div class="rc-name">${esc(r.nom)}</div><div class="rc-val num">${r.e1rm}<span> kg</span></div><div class="rc-sub muted">${r.charge}kg × ${r.reps}</div></div>`)));
    v.append(rg);
    v.append(h(`<div class="hint">${esc(FORMULE_1RM)}. Estimation indicative — ne teste jamais un vrai maximum en reprise.</div>`));
  }

  // Calculateurs force (1RM, %, disques)
  carteForce(v);

  // poids
  const c = h(`<div class="card stack"><h2 style="margin:0">Poids du corps</h2></div>`);
  const rowW = h(`<div class="row"><input id="wKg" aria-label="Poids du matin en kg" inputmode="decimal" placeholder="Poids du matin (kg)" style="flex:1"><button class="primary" id="wAdd">Ajouter</button></div>`);
  c.append(rowW);
  const poids = Etat.data.metrics.filter((m) => m.poidsKg);
  // Jauge IMC (dernier poids connu ou poids du profil), façon carte « BMI »
  const poidsActuel = poids.length ? poids[poids.length - 1].poidsKg : p.poidsKg;
  if (poidsActuel && p.tailleCm) {
    const imc = poidsActuel / Math.pow(p.tailleCm / 100, 2);
    const cat = categorieIMC(imc);
    const cimc = h(`<div class="ringstat"></div>`);
    cimc.append(h(gaugeIMC(imc)));
    const ii = h(`<div style="flex:1;min-width:0"></div>`);
    ii.append(h(`<div class="eyebrow" style="color:var(--accent-ink)">Indice de masse corporelle</div>`));
    ii.append(h(`<div style="margin:2px 0"><b style="font-size:1.4rem">${imc.toFixed(1)}</b> <span class="badge" style="background:color-mix(in srgb,${cat.col} 18%,transparent);color:${cat.col}">${cat.txt}</span></div>`));
    ii.append(h(`<div class="muted small">${poidsActuel} kg · ${p.tailleCm} cm. L'IMC est indicatif et ne distingue pas muscle et graisse.</div>`));
    cimc.append(ii);
    c.append(cimc);
  }
  // Courbe de poids lissée (tendance)
  if (poids.length >= 2) {
    const dp = poids.slice(-14).map((m) => ({ x: new Date(m.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }), v: m.poidsKg }));
    c.append(h(`<div>${svgLine(dp, "Tendance du poids (kg)")}</div>`));
  }
  if (poids.length) c.append(h(`<div class="small muted">Dernier : ${poids[poids.length - 1].poidsKg} kg · ${poids.length} mesure(s)</div>`));
  c.append(h(`<div class="hint">Pèse-toi le matin à jeun. Aucune décision sur une seule pesée : on regarde la tendance sur 1–2 semaines.</div>`));
  v.append(c);
  $("#wAdd", v).addEventListener("click", () => {
    const kg = parseFloat(($("#wKg", v).value || "").replace(",", ".")); if (!kg) return;
    Etat.data.metrics.push({ id: Etat.uid(), date: new Date().toISOString(), poidsKg: kg }); Etat.sauver(); render();
  });

  // Mensurations
  const cm = h(`<div class="card stack"><h2 style="margin:0">Mensurations</h2>
    <div class="row"><input id="mTaille" aria-label="Tour de taille en cm" inputmode="decimal" placeholder="Tour de taille (cm)" style="flex:1"><input id="mPoit" aria-label="Poitrine en cm" inputmode="decimal" placeholder="Poitrine" style="flex:1"></div>
    <div class="row"><input id="mBras" aria-label="Bras en cm" inputmode="decimal" placeholder="Bras" style="flex:1"><input id="mCuisse" aria-label="Cuisse en cm" inputmode="decimal" placeholder="Cuisse" style="flex:1"><button id="mAdd">Enregistrer</button></div>
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
  v.append(h(`<div class="eyebrow">Ton compte</div>`));
  v.append(h(`<h1 style="margin-bottom:14px">Profil</h1>`));

  // Carte profil : avatar + nom + « Modifier le profil »
  const hero = h(`<div class="hero"><span class="glow"></span></div>`);
  const row = h(`<div class="ringstat"></div>`);
  row.append(h(`<div class="avatar">${esc((p.prenom || "A").slice(0, 1).toUpperCase())}</div>`));
  const pi = h(`<div style="flex:1;min-width:0"></div>`);
  pi.append(h(`<h2 style="margin:0 0 3px">${esc(p.prenom || "Athlète")}</h2>`));
  const bModif = h(`<button class="linklike">Modifier le profil</button>`);
  bModif.addEventListener("click", async () => { if (await confirmer("Modifier ton profil ? Tu repasses par les questions et ton programme est régénéré (ton historique est conservé).", { ok: "Modifier" })) { DRAFT = { ...p }; STEP = 0; Etat.data.profil = null; render(); } });
  pi.append(bModif);
  row.append(pi);
  hero.append(row);
  v.append(hero);

  // 3 colonnes : Poids · Taille · Âge
  const ps = h(`<div class="profstats"></div>`);
  ps.append(h(`<div><b>${p.poidsKg ? p.poidsKg + " kg" : "—"}</b><span>Poids</span></div>`));
  ps.append(h(`<div><b>${p.tailleCm ? p.tailleCm + " cm" : "—"}</b><span>Taille</span></div>`));
  ps.append(h(`<div><b>${p.age || "—"}</b><span>Âge</span></div>`));
  v.append(ps);

  // Lignes d'informations
  const info = h(`<div class="deflist" style="margin-top:12px"></div>`);
  const ligneI = (k, val) => { if (val) info.append(h(`<div class="spread small"><span class="muted">${k}</span><b>${esc(val)}</b></div>`)); };
  ligneI("Objectif", GOAL_LABELS[p.objectif] || p.objectif);
  ligneI("Niveau", LEVEL_LABELS[p.niveau] || p.niveau);
  ligneI("Jours par semaine", `${p.joursParSemaine} jours`);
  ligneI("Durée de séance", `${p.dureeSeanceMin} min`);
  ligneI("Lieu", p.lieu);
  ligneI("Unité", p.unites === "imperial" ? "lb / in" : "kg / cm");
  v.append(info);

  // Outils (accès aux rubriques hors barre de navigation)
  const outils = h(`<div class="card" style="padding:6px 4px"></div>`);
  const outil = (icone, cls, label, tab) => {
    const b = h(`<button class="plusitem" data-tab="${tab}"><span class="pm-ic ${cls}">${icone}</span><span class="pm-main"><b>${label}</b></span><span class="chev">›</span></button>`);
    b.addEventListener("click", () => nav(tab));
    outils.append(b);
  };
  outil(IC.apple, "mi-green", "Nutrition", "food");
  outil(IC.search, "mi-blue", "Catalogue d'exercices", "cat");
  outil(IC.dumbbell, "mi-indigo", "Programme Anatoly", "anatoly");
  v.append(outils);

  const prof = h(`<div class="card stack"><h2 style="margin:0">Programme</h2></div>`);
  const bReg = h(`<button>Régénérer le programme avec le profil actuel</button>`);
  bReg.addEventListener("click", () => { Etat.data.programme = genererProgramme(p); Etat.sauver(); nav("prog"); toast("Programme régénéré ✔"); });
  prof.append(bReg); v.append(prof);

  const aff = h(`<div class="card stack"><h2 style="margin:0">Apparence</h2></div>`);
  aff.append(chipsInline([["auto", "Auto"], ["light", "Clair"], ["dark", "Sombre"]], (val) => Etat.data.reglages.theme === val, (val) => { Etat.data.reglages.theme = val; Etat.sauver(); appliquerTheme(); }));
  v.append(aff);

  // Démonstrations
  const cwx = h(`<div class="card stack"><h2 style="margin:0">Démonstrations</h2>
    <div class="hint">Les visuels des exercices viennent du dataset GitHub <b>hasaneyldrm/exercises-dataset</b> (référencés par URL, avec attribution), avec repli sur ExerciseDB open-source. La carte musculaire est un SVG intégré adapté de <b>react-muscle-highlighter</b> (licence MIT). Aucune clé requise.</div></div>`);
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
    r.onload = async () => {
      let obj;
      try { obj = JSON.parse(String(r.result)); } catch (e) { await info("Fichier illisible : ce n'est pas un JSON valide.", { titre: "Import impossible" }); file.value = ""; return; }
      const v = validerImport(obj);
      if (!v.ok) { await info(v.erreurs.join("\n"), { titre: "Import impossible" }); file.value = ""; return; }
      const mode = await dialogue({
        titre: "Restaurer cette sauvegarde",
        message: "Fusionner ajoute sans rien perdre (recommandé). Remplacer écrase toutes tes données actuelles.",
        cancelVal: null,
        actions: [
          { label: "Annuler", valeur: null },
          { label: "Remplacer tout", valeur: "remplacer", danger: true },
          { label: "Fusionner", valeur: "fusionner", primary: true },
        ],
      });
      if (!mode) { file.value = ""; return; }
      if (mode === "remplacer" && !(await confirmer("Remplacer définitivement toutes tes données actuelles par cette sauvegarde ?", { danger: true, ok: "Remplacer" }))) { file.value = ""; return; }
      Etat.data = appliquerImport(Etat.data, v.data, mode);
      Etat.sauver();
      file.value = "";
      appliquerTheme();
      if (Etat.data.profil) { $("#tabs").hidden = false; nav("dash"); } else render();
      toast(mode === "fusionner" ? "Sauvegarde fusionnée ✔" : "Données remplacées ✔");
    };
    r.readAsText(f);
  });
  const bExpCsvSeances = h(`<button>Exporter mes séances (CSV)</button>`);
  bExpCsvSeances.addEventListener("click", () => telechargerCSV(seancesVersCSV(Etat.data.logs, (id) => getExercise(id)?.nom || id), nomFichierExport("seances")));
  const bExpCsvPoids = h(`<button>Exporter mon poids/mensurations (CSV)</button>`);
  bExpCsvPoids.addEventListener("click", () => telechargerCSV(metriquesVersCSV(Etat.data.metrics), nomFichierExport("suivi-corporel")));
  const bDel = h(`<button class="danger">Tout effacer</button>`);
  bDel.addEventListener("click", async () => { if (await confirmer("Effacer TOUTES les données (profil, programme, historique) ? Cette action est irréversible.", { danger: true, ok: "Tout effacer" })) { Etat.reset(); DRAFT = null; STEP = 0; $("#tabs").hidden = true; render(); } });
  don.append(bExp, bImp, file, bExpCsvSeances, bExpCsvPoids, bDel); v.append(don);

  v.append(h(`<div class="card flat small muted">Coach Perso — Application de musculation personnelle, locale et hors ligne. Ne remplace pas un avis médical.</div>`));
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
  appliquerTheme();
  if (Etat.data.profil) {
    $("#tabs").hidden = false;
    // Raccourcis d'app (appui long sur l'icône) : ?vue=train / ?vue=food …
    const vue = new URLSearchParams(location.search).get("vue");
    nav(TABS[vue] ? vue : "dash", true);
  } else { history.replaceState({ tab: null }, ""); render(); }
  // Masque le splash de démarrage une fois l'app prête.
  const sp = document.getElementById("splash");
  if (sp) { setTimeout(() => { sp.classList.add("hidden"); setTimeout(() => sp.remove(), 500); }, 350); }
}
amorcerApp();
