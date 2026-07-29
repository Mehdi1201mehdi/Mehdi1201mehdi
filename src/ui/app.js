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
  reconcilier, TYPES_SERIE, GROUPES_SUPERSET, cyclerType, rirDepuisRpe, valeurSerie, completerSerie,
  exercicesDuSuperset, groupeSupersetLibre, reposApresSerie,
} from "../engine/liveSession.js";
import {
  creerRoutine, renommer, ajouterSeance, supprimerSeance, ajouterExercice,
  supprimerExerciceIndex, deplacerExercice, definirSeries, dupliquerRoutine,
  seanceDepuisLog, estimerDureeSeance,
} from "../engine/routines.js";
import { FORMULE_1RM, classementRecords, detecterRecords } from "../engine/records.js";
import { construireExport, validerImport, appliquerImport, nomFichierBackup } from "../engine/backup.js";
import { FORMULES_1RM, estimer1RM, tablePourcentages, disquesParCote } from "../engine/powerlifting.js";
import {
  volumeLog, volumeTotal, volumeParSemaine, dureeMoyenneMin, volumeParMuscle, recuperationParMuscle, statsSemaine,
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
  // Séance générée par le moteur automatique : présente pour que la reprise
  // après fermeture et l'enregistrement fonctionnent comme pour les autres.
  if (Etat.data.seanceAuto) out.push({ seance: Etat.data.seanceAuto, source: { nom: "Automatique" } });
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
import { detecterIntention, trouverExoParNom } from "../engine/assistant.js";
import {
  fcMaxTheorique, tableZonesCardio, MORPHOTYPES, tableMorphotypes, dureeSeance,
  maxDepuisSerie, grilleMax, composition, adipositeNavy, categorieAdiposite,
  TESTS_VELO, testVeloParCle, comparerTestsVelo,
} from "../engine/outils.js";
import { PROGRAMMES_SALLE } from "../data/programmes-salle.js";
import { DUREES, FREQUENCES, MATERIELS, filtrerProgrammes, nbCriteresActifs } from "../engine/bibliotheque.js";
import { CLES_MOTEUR, LABELS_MOTEUR, DEF_MOTEUR, FIN_VERS_CATALOGUE } from "../data/muscles-moteur.js";
import { coefficientsPour } from "../data/exercise-muscle-map.js";
import { etatMusculaire, zoneDisponibilite, cibleVolumeHebdo, analyserSeance } from "../engine/fatigue.js";
import { genererProchaineSeance, resumeCorps, compatibiliteExercice, PLAN_PARAMS } from "../engine/planner.js";
import { expliquerApprentissage, PARAMS_APPRENTISSAGE } from "../engine/apprentissage.js";
import { creerRepos, restantSec, estEcoule, progression, ajusterRepos, restaurerRepos, formatRestant } from "../engine/repos.js";
import { grilleMois, moisAdjacent, NOMS_JOURS_COURTS } from "../engine/calendar.js";

const todayStr = () => new Date().toISOString().slice(0, 10);

/* ---------- petits utilitaires DOM ----------
   `$` et `h` renvoient volontairement `any` : ce sont trois lignes de plomberie
   DOM dont le résultat est aussitôt utilisé comme `<input>`, `<video>`, élément
   porteur de propriétés maison… Les typer en `Element` obligerait à un cast à
   chaque appel — du bruit sans bénéfice à l'exécution. La vérification de types
   qui compte vit dans `src/engine/*` et `src/data/*`, qui sont purs et typés. */
/** @type {(s: string, r?: ParentNode) => any} */
const $ = (s, r = document) => r.querySelector(s);
const view = $("#view");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
/**
 * Crée un élément depuis une chaîne HTML.
 * @param {string} html
 * @returns {any} l'élément racine
 */
function h(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
/**
 * Branche un écouteur sur tous les descendants correspondant au sélecteur.
 * @param {ParentNode} root
 * @param {string} sel
 * @param {string} ev
 * @param {(e:any)=>void} fn
 */
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
  const sh = $(".sheet");
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
];
// Cinq étapes, pas plus : l'objectif est de commencer à s'entraîner vite.
// Les préférences fines (muscles prioritaires, limitations, récupération) ont
// des valeurs par défaut prudentes et se règlent ensuite dans Profil →
// « Affiner mon entraînement ». Aucune donnée n'est perdue, elle est
// simplement demandée au bon moment.

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
  message: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>`,
  spark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/></svg>`,
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
  const salut = heure < 18 ? "Salut" : "Bonsoir";
  // En-tête sur UNE ligne : salutation + série en cours. L'ancien bloc de trois
  // lignes (eyebrow + prénom + « prêt ? ») ne portait aucune information utile.
  const _serie = serieJours(logs);
  v.append(h(`<div class="dash-hi">
    <div><h1 class="hi-nom">${esc(salut)} <span class="hi-p">${esc(p.prenom || "Athlète")}</span> 👋</h1>
      <div class="hi-sub">Prêt à atteindre tes objectifs ?</div></div>
    ${_serie > 0 ? `<span class="streak-chip" title="Série en cours">${IC.flame}<b class="num">${_serie}</b><span>j</span></span>` : ""}
  </div>`));

  // Moteur automatique : « Ton corps » + prochaine séance déjà construite.
  // C'est désormais l'action n°1 de l'application.
  // Le moteur s'affiche TOUJOURS (sauf désactivation explicite). Le conditionner
  // à un historique existant le rendait invisible tant qu'aucune séance n'avait
  // été terminée : la fonctionnalité principale n'était jamais découverte.
  // Sans historique, tous les muscles sont frais et il propose une première
  // séance complète — c'est exactement ce qu'on veut voir en arrivant.
  v.append(carteProgrammeActuel(prog, logs, p));

  const moteurActif = Etat.data.reglages.moteurAuto !== false && !!Etat.data.profil;
  if (moteurActif) { v.append(h(`<div class="eyebrow dash-lbl">Aujourd'hui</div>`)); carteMoteur(v); }

  // Entraînement du jour du programme. Masqué quand le moteur pilote : les deux
  // cartes se concurrençaient. Le programme reste entièrement accessible dans
  // son onglet, rien n'est retiré.
  const wc = h(`<div class="card wkcard"></div>`);
  if (sj) {
    const muscles = (sj.groupesCibles || []).map((m) => MUSCLE_LABELS[m] || m).slice(0, 3).join(" · ");
    let pct = seanceFaite ? 1 : 0;
    const enCours = LIVE && LIVE.seanceId === sj.id;
    if (enCours) pct = progressionSeance(sj).pct;
    wc.append(h(`<div class="spread"><span class="eyebrow">${enCours ? "Séance en cours" : "Entraînement du jour"}</span><span class="wk-ic">${IC.dumbbell}</span></div>`));
    wc.append(h(`<h2 style="margin:2px 0 0;font-size:1.3rem">${esc(sj.nom)}</h2>`));
    wc.append(h(`<div class="muted small" style="margin:2px 0 10px">${esc(muscles)}${muscles ? " · " : ""}${sj.exercices.length} exercices · ~${sj.dureeEstimeeMin} min</div>`));
    if (pct > 0) {
      wc.append(h(`<div class="spread small" style="margin-bottom:5px"><span class="muted">Progression</span><span class="num" style="color:var(--accent-ink);font-weight:800">${Math.round(pct * 100)}%</span></div>`));
      wc.append(h(`<div class="bar"><div style="width:${Math.round(pct * 100)}%"></div></div>`));
    }
    const b = h(`<button class="primary big" style="margin-top:11px">${seanceFaite ? "✓ Séance faite — revoir" : `<span class="btn-ico">${IC.play}</span>${enCours ? "Continuer la séance" : "Commencer la séance"}`}</button>`);
    b.addEventListener("click", () => { if (!enCours) LIVE = null; APERCU = enCours ? null : sj.id; nav("train"); });
    wc.append(b);
  } else {
    wc.append(h(`<div class="spread"><span class="eyebrow">Aujourd'hui</span><span class="wk-ic wk-ic-rest">${IC.moon}</span></div>`));
    wc.append(h(`<h2 style="margin:2px 0 0;font-size:1.3rem">Jour de repos</h2>`));
    wc.append(h(`<div class="muted small" style="margin-top:3px">Marche, mobilité ou récupération active.</div>`));
    const b = h(`<button class="secondary big" style="margin-top:11px"><span class="btn-ico">${IC.play}</span>S'entraîner quand même</button>`);
    b.addEventListener("click", () => { LIVE = null; APERCU = null; nav("train"); });
    wc.append(b);
  }
  if (!moteurActif) v.append(wc);

  // Statistiques d'un coup d'œil — grille 2 colonnes, chiffres dominants.
  // Toutes les valeurs viennent de l'historique réel, aucune n'est inventée.
  v.append(h(`<div class="eyebrow dash-lbl">Mes chiffres</div>`));
  v.append(grilleChiffres(logs));

  // Ma semaine — bande compacte, juste sous l'action principale.
  v.append(h(`<div class="eyebrow dash-lbl">Ma semaine</div>`));
  v.append(semaineStrip(logs));

  // Raccourcis vers ce qui n'est PAS dans la barre de navigation
  // (elle donne déjà Programme, Séance, Progrès, Profil).
  const qrow = h(`<div class="qrow"></div>`);
  const qbtn = (icone, cls, label, onClick) => {
    const b = h(`<button><span class="qi ${cls}">${icone}</span><span>${label}</span></button>`);
    b.addEventListener("click", onClick);
    return b;
  };
  qrow.append(qbtn(IC.message, "q-blue", "Coach", () => ouvrirCoach()));
  qrow.append(qbtn(IC.apple, "q-green", "Nutrition", () => nav("food")));
  qrow.append(qbtn(IC.search, "q-indigo", "Exercices", () => nav("cat")));
  v.append(qrow);

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

  // Historique récent : 3 dernières séances, en lignes compactes (pas en cartes).
  const recents = logs.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3);
  if (recents.length) {
    const head = h(`<div class="spread dash-lbl"><span class="eyebrow">Séances récentes</span><button class="linklike">Voir tout ›</button></div>`);
    head.querySelector("button").addEventListener("click", () => nav("stats"));
    v.append(head);
    const box = h(`<div class="card histo-mini"></div>`);
    recents.forEach((l) => {
      const d = new Date(l.date);
      const jours = Math.round((Date.now() - d.getTime()) / 864e5);
      const quand = jours <= 0 ? "aujourd'hui" : jours === 1 ? "hier" : `il y a ${jours} j`;
      const vol = Math.round(volumeLog(l));
      const min = Math.round((l.dureeSec || 0) / 60);
      box.append(h(`<div class="histo-row"><span class="hr-t"><b>${esc(l.seanceNom || "Séance")}</b><br><span class="muted small">${quand}</span></span><span class="muted small hr-v">${min ? min + " min · " : ""}${vol.toLocaleString("fr-FR")} kg</span></div>`));
    });
    v.append(box);
  }

  v.append(h(`<div class="disclaimer">En cas de douleur vive ou inhabituelle, arrête le mouvement. Cette app ne pose aucun diagnostic médical.</div>`));
}
/**
 * Section repliable. Garde l'écran court : seul l'essentiel est ouvert par
 * défaut, le reste est à un tap. L'état d'ouverture est mémorisé par clé.
 * @param {HTMLElement} parent
 * @param {string} cle     identifiant stable (mémorisation de l'état)
 * @param {string} titre
 * @param {(corps:HTMLElement)=>void} remplir
 * @param {{ouvert?:boolean, resume?:string}} [opts]
 */
const SECTIONS_OUVERTES = {};
function section(parent, cle, titre, remplir, opts = {}) {
  const ouvert = SECTIONS_OUVERTES[cle] ?? !!opts.ouvert;
  const wrap = h(`<section class="sect${ouvert ? " on" : ""}"></section>`);
  const head = h(`<button class="sect-head" aria-expanded="${ouvert}"><span class="sect-t">${esc(titre)}${opts.resume ? `<span class="sect-r muted">${esc(opts.resume)}</span>` : ""}</span><span class="sect-chev" aria-hidden="true">${IC.chevron}</span></button>`);
  const corps = h(`<div class="sect-body"></div>`);
  if (ouvert) remplir(corps); else corps.hidden = true;
  head.addEventListener("click", () => {
    const on = corps.hidden;
    SECTIONS_OUVERTES[cle] = on;
    wrap.classList.toggle("on", on);
    head.setAttribute("aria-expanded", String(on));
    if (on && !corps.childElementCount) remplir(corps);
    corps.hidden = !on;
  });
  wrap.append(head, corps);
  parent.append(wrap);
  return wrap;
}

/**
 * État vide / erreur normalisé. Un écran sans contenu doit dire ce qui manque
 * et proposer la sortie, pas afficher une ligne grise.
 *
 * @param {string} icone   pictogramme SVG (IC.*)
 * @param {string} titre   ce qui se passe, en une phrase
 * @param {string} texte   quoi faire ensuite
 * @param {{erreur?:boolean, action?:{label:string, onClick:Function}}} [opts]
 */
function etatVide(icone, titre, texte, opts = {}) {
  const el = h(`<div class="empty-state${opts.erreur ? " err" : ""}" role="${opts.erreur ? "alert" : "status"}">
    <div class="es-ic">${icone}</div><b>${esc(titre)}</b>
    ${texte ? `<div class="muted small">${esc(texte)}</div>` : ""}</div>`);
  if (opts.action) {
    const b = h(`<button class="secondary">${esc(opts.action.label)}</button>`);
    b.addEventListener("click", () => opts.action.onClick());
    el.append(b);
  }
  return el;
}

/** `n` squelettes de ligne : montre la forme du contenu attendu pendant l'attente. */
function squelettes(n = 3) {
  const f = document.createDocumentFragment();
  for (let i = 0; i < n; i++) {
    f.append(h(`<div class="skel-card" aria-hidden="true"><div class="sk-av skeleton"></div>
      <div class="sk-l"><i class="skeleton" style="width:${60 + (i % 3) * 12}%"></i><i class="skeleton" style="width:${35 + (i % 2) * 15}%"></i></div></div>`));
  }
  const wrap = h(`<div role="status" aria-label="Chargement en cours"></div>`);
  wrap.append(f);
  return wrap;
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
/** Même état vide, en chaîne HTML — pour les rendus qui composent du markup
    (graphiques SVG). Une seule apparence pour les deux formes. */
function etatVideHTML(icone, titre, sousTitre = "") {
  return `<div class="empty-state"><div class="es-ic" aria-hidden="true">${icone}</div><b>${esc(titre)}</b>`
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
  // Nuances de la signature lime : le ruban de la semaine reste monochrome,
  // comme sur la maquette, tout en distinguant les séances entre elles.
  const COULEURS = ["#B7E63A", "#C8F55A", "#91C91E", "#A8DE30", "#87BE17", "#D4FF6E", "#7BAA12"];
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
    d.append(h(`<div class="dc-head"><span class="dc-ic" style="background:${col}26;color:${col}">${IC.dumbbell}</span><span class="dc-main"><span class="dc-day">${JOURS[wd - 1]}${wd === auj ? " · Aujourd'hui" : ""}</span><b class="dc-name">${esc(s.nom)}</b><span class="muted small">${esc(meta)}</span></span><span class="dc-fig" aria-hidden="true">${silhouetteAuto(s.groupesCibles || [])}</span></div>`));
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
  const bCat = h(`<button class="chip" style="margin:2px 0 10px"><span class="cic">${IC.search}</span>Catalogue d'exercices</button>`);
  bCat.addEventListener("click", () => nav("cat"));
  v.append(bCat);

  // ---- Bibliothèque de programmes : une seule entrée, la liste s'ouvre en
  // feuille. 23 cartes empilées ici allongeaient l'écran de 3 000 px.
  const nbPgm = PROGRAMMES_SALLE.length;
  const bBib = h(`<button class="card wcard sil warm-cta" style="width:100%;margin-top:18px;text-align:left"><span class="mi mi-indigo" style="width:34px;height:34px">${IC.layers}</span><span class="g"><b>Bibliothèque de programmes</b><br><span class="muted small">${nbPgm} programmes prêts à installer · débutant à avancé</span></span><span class="chev" aria-hidden="true">›</span></button>`);
  bBib.addEventListener("click", ouvrirBibliothequeProgrammes);
  v.append(bBib);

  // ---- Mes routines (programmes créés à la main, illimités) ----
  v.append(h(`<div class="spread dash-lbl"><span class="eyebrow">Mes routines</span></div>`));
  (Etat.data.programmesPerso || []).forEach((r) => {
    const nbEx = r.seances.reduce((a, s) => a + s.exercices.length, 0);
    const card = h(`<div class="card"><div class="spread"><b>${esc(r.nom)}</b><span class="pill">${r.seances.length} séance(s)</span></div><div class="muted small">${nbEx} exercice(s)</div></div>`);
    const acts = h(`<div class="row" style="margin-top:8px"></div>`);
    const bOpen = h(`<button class="chip"><span class="cic">${IC.edit || IC.forward}</span>Ouvrir</button>`);
    bOpen.addEventListener("click", () => { EDIT_ROUTINE = r.id; render(); });
    const bDup = h(`<button class="chip"><span class="cic">${IC.copy || IC.layers}</span>Dupliquer</button>`);
    bDup.addEventListener("click", () => { Etat.data.programmesPerso.push(dupliquerRoutine(r)); Etat.sauver(); render(); });
    const bDel = h(`<button class="chip danger" aria-label="Supprimer la routine"><span class="cic">${IC.trash}</span></button>`);
    bDel.addEventListener("click", async () => { if (await confirmer(`Supprimer la routine « ${r.nom} » ?`, { danger: true, ok: "Supprimer" })) { Etat.data.programmesPerso = Etat.data.programmesPerso.filter((x) => x.id !== r.id); Etat.sauver(); render(); } });
    acts.append(bOpen, bDup, bDel); card.append(acts);
    v.append(card);
  });
  const barre = h(`<div class="row" style="margin-top:8px"></div>`);
  const bNew = h(`<button class="primary"><span class="btn-ico">${IC.plus}</span>Nouvelle routine</button>`);
  bNew.addEventListener("click", async () => {
    const nom = await demanderTexte("Nom de la routine", "Ma routine", { ok: "Créer" });
    if (nom === null) return;
    const r = creerRoutine(nom);
    (Etat.data.programmesPerso ||= []).push(r);
    Etat.sauver(); EDIT_ROUTINE = r.id; render();
  });
  const bFromLog = h(`<button class="chip"><span class="cic">${IC.cornerDown}</span>Depuis une séance passée</button>`);
  bFromLog.addEventListener("click", dupliquerSeancePassee);
  barre.append(bNew, bFromLog);
  v.append(barre);
}

/**
 * Bibliothèque de programmes : feuille avec filtres cumulables.
 *
 * Cinq facettes (objectif, niveau, durée d'une séance, matériel, fréquence)
 * plutôt qu'une seule liste de puces : devant 18 programmes, la vraie question
 * est « qu'est-ce qui rentre dans mes 45 minutes avec mes haltères ».
 */
function ouvrirBibliothequeProgrammes() {
  const tous = [...PROGRAMMES_SALLE];
  const crit = { objectif: null, niveau: null, duree: null, materiel: null, frequence: null };
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">Programmes</h2><button class="chip" id="bibX">✕ Fermer</button></div>`));
  inner.append(h(`<div class="muted small">Structures d'entraînement écrites avec les exercices de ton catalogue. Installe-en une : elle devient une routine modifiable.</div>`));

  const facettes = h(`<div class="stack facettes"></div>`);
  const liste = h(`<div class="stack" style="margin-top:10px"></div>`);
  const compteur = h(`<div class="spread" style="margin-top:10px"><span class="muted small" id="bibN"></span><button class="linklike" id="bibReset" hidden>Tout effacer</button></div>`);

  /** @type {[string, string, [string, string][]][]} */
  const GROUPES = [
    ["objectif", "Objectif", [["prise_muscle", "Prise de muscle"], ["perte_graisse", "Perte de gras"], ["force", "Force"], ["recomposition", "Remise en forme"]]],
    ["niveau", "Niveau", [["debutant", "Débutant"], ["intermediaire", "Intermédiaire"], ["avance", "Avancé"]]],
    ["duree", "Durée d'une séance", DUREES.map((d) => [d.cle, d.label])],
    ["materiel", "Matériel", MATERIELS.map((m) => [m.cle, m.label])],
    ["frequence", "Séances / semaine", FREQUENCES.map((f) => [f.cle, f.label])],
  ];

  const refresh = () => {
    // Puces : reflètent la sélection courante.
    facettes.querySelectorAll("button[data-cle]").forEach((b) => {
      b.classList.toggle("on", crit[b.dataset.cle] === b.dataset.val);
      b.setAttribute("aria-pressed", String(crit[b.dataset.cle] === b.dataset.val));
    });
    const n = nbCriteresActifs(crit);
    $("#bibReset", compteur).hidden = n === 0;
    liste.innerHTML = "";
    const res = filtrerProgrammes(tous, crit, getExercise);
    $("#bibN", compteur).textContent = res.length
      ? `${res.length} programme${res.length > 1 ? "s" : ""}${n ? ` · ${n} filtre${n > 1 ? "s" : ""}` : ""}`
      : "Aucun résultat";
    if (!res.length) {
      liste.append(h(`<div class="empty-state"><div class="es-ic">${IC.search}</div><b>Aucun programme ne coche tous ces critères</b><div class="muted small">Retire un filtre — la durée ou le matériel sont les plus restrictifs.</div></div>`));
      const b = h(`<button class="secondary big">Effacer les filtres</button>`);
      b.addEventListener("click", () => { Object.keys(crit).forEach((k) => { crit[k] = null; }); refresh(); });
      liste.append(b);
      return;
    }
    res.forEach((pr) => {
      const c = carteProgrammeClassique(pr);
      c.addEventListener("click", () => sheet.remove(), { once: true });
      liste.append(c);
    });
  };

  GROUPES.forEach(([cle, titre, opts]) => {
    const g = h(`<div class="facette"><div class="eyebrow">${titre}</div></div>`);
    const row = h(`<div class="row scrollx"></div>`);
    opts.forEach(([val, lab]) => {
      const b = h(`<button class="chip" data-cle="${cle}" data-val="${val}" aria-pressed="false">${lab}</button>`);
      // Re-toucher une puce active l'annule : un seul geste pour poser et retirer.
      b.addEventListener("click", () => { crit[cle] = crit[cle] === val ? null : val; refresh(); });
      row.append(b);
    });
    g.append(row);
    facettes.append(g);
  });
  inner.append(facettes, compteur, liste);
  $("#bibReset", compteur).addEventListener("click", () => { Object.keys(crit).forEach((k) => { crit[k] = null; }); refresh(); });
  refresh();
  sheet.querySelector("#bibX").addEventListener("click", () => sheet.remove());
  document.body.append(sheet);
}

/** Carte d'un programme classique de la bibliothèque (ouvre l'aperçu). */
function carteProgrammeClassique(pr) {
  const muscles = [...new Set(pr.seances.flatMap((s) => s.groupesCibles))];
  const b = h(`<button class="card wcard sil pgm-card">
    ${miniSilhouette(muscles)}
    <span class="g">
      <b>${esc(pr.nom)}</b><br>
      <span class="muted small">${esc(pr.accroche)}</span><br>
      <span class="pgm-meta"><span class="badge accent">${pr.joursParSemaine}×/sem</span><span class="pill">${esc(LEVEL_LABELS[pr.niveau] || pr.niveau)}</span><span class="pill">~${pr.dureeMin} min</span></span>
    </span>
    <span class="chev" aria-hidden="true">›</span></button>`);
  b.addEventListener("click", () => apercuProgrammeClassique(pr));
  return b;
}

/** Feuille d'aperçu d'un programme classique + bouton d'installation. */
function apercuProgrammeClassique(pr) {
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const fermer = () => sheet.remove();
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">${esc(pr.nom)}</h2><button class="chip" id="pgX">✕ Fermer</button></div>`));
  inner.append(h(`<div class="muted small">${esc(pr.accroche)}</div>`));
  inner.append(h(`<div class="row" style="margin:10px 0"><span class="badge accent">${pr.joursParSemaine} séances / semaine</span><span class="pill">${esc(LEVEL_LABELS[pr.niveau] || pr.niveau)}</span><span class="pill">~${pr.dureeMin} min</span></div>`));
  inner.append(h(`<div class="small">${esc(pr.description)}</div>`));
  if (pr.echauffement) inner.append(h(`<div class="notice small" style="margin-top:10px"><b>Échauffement :</b> ${esc(pr.echauffement)}</div>`));
  inner.append(h(`<div class="notice small" style="margin-top:10px"><b>Progresser :</b> ${esc(pr.progression)}</div>`));

  const bInst = h(`<button class="primary big" style="margin:14px 0"><span class="btn-ico">${IC.plus}</span>Installer comme routine</button>`);
  bInst.addEventListener("click", async () => {
    const ok = await confirmer(`Ajouter « ${pr.nom} » à tes routines ? Ton programme actuel et ton historique ne sont pas touchés.`, { ok: "Installer" });
    if (!ok) return;
    installerProgrammeClassique(pr);
    fermer();
  });
  inner.append(bInst);

  pr.seances.forEach((s, i) => {
    const c = h(`<div class="card stack" style="margin-bottom:10px"></div>`);
    c.append(h(`<div class="spread"><b>${esc(s.nom)}</b><span class="pill">${s.exercices.length} exos</span></div>`));
    s.exercices.forEach((ex, j) => {
      const exo = getExercise(ex.ref);
      const dureeTxt = ex.duree >= 120 ? `${Math.round(ex.duree / 60)} min` : `${ex.duree} s`;
      const repsTxt = ex.reps && (ex.reps[0] === ex.reps[1] ? `${ex.reps[0]}` : `${ex.reps[0]}–${ex.reps[1]}`);
      const vol = ex.duree ? `${ex.series} × ${dureeTxt}` : `${ex.series} × ${repsTxt}`;
      // repos 0 = enchaîné (format circuit)
      const reposTxt = ex.repos ? formatRepos(ex.repos) : "enchaîné";
      const l = h(`<div class="spread small"><span><span class="anat-num">${j + 1}</span>${esc(exo ? exo.nom : ex.ref)}</span><span class="muted">${vol} · ${reposTxt}</span></div>`);
      if (exo) { l.classList.add("tap"); l.addEventListener("click", () => ouvrirDetail(exo)); }
      c.append(l);
    });
    inner.append(c);
  });
  sheet.querySelector("#pgX").addEventListener("click", fermer);
  document.body.append(sheet);
}

/**
 * Convertit un programme de la bibliothèque en routine perso réelle, via les
 * helpers de engine/routines.js (donc au format exact des routines existantes).
 * N'écrase jamais le programme en cours ni l'historique.
 */
function installerProgrammeClassique(pr) {
  const r = creerRoutine(pr.nom);
  for (const s of pr.seances) {
    const seance = ajouterSeance(r, s.nom);
    seance.groupesCibles = [...s.groupesCibles];
    for (const ex of s.exercices) {
      ajouterExercice(seance, ex.ref, {
        nbSeries: ex.series,
        repsCible: ex.reps || undefined,
        dureeSec: ex.duree || undefined,
        reposSec: ex.repos,
      });
    }
  }
  r.justificationGlobale = `${pr.description} — ${pr.progression}`;
  (Etat.data.programmesPerso ||= []).push(r);
  Etat.sauver();
  toast(`« ${pr.nom} » ajouté à tes routines 💪`);
  render();
}

/** Éditeur d'une routine perso (séances, exercices, séries). */
function vRoutineEditor(v, routineId) {
  const r = (Etat.data.programmesPerso || []).find((x) => x.id === routineId);
  if (!r) { EDIT_ROUTINE = null; render(); return; }
  const head = h(`<div class="spread"><button class="chip" id="back">← Retour</button><button class="chip" id="ren"><span class="cic">${IC.forward}</span>Renommer</button></div>`);
  v.append(head);
  v.append(h(`<h1 style="margin:6px 0">${esc(r.nom)}</h1>`));
  $("#back", v).addEventListener("click", () => { EDIT_ROUTINE = null; render(); });
  $("#ren", v).addEventListener("click", async () => { const n = await demanderTexte("Nom de la routine", r.nom); if (n !== null) { renommer(r, n); Etat.sauver(); render(); } });
  if (!r.seances.length) v.append(etatVide(IC.calendar, "Routine vide", "Ajoute une première séance, puis ses exercices : elle apparaîtra ensuite dans l'onglet Séance."));
  r.seances.forEach((s) => v.append(carteSeanceEditor(r, s)));
  const bAddS = h(`<button class="primary" style="margin-top:10px"><span class="btn-ico">${IC.plus}</span>Ajouter une séance</button>`);
  bAddS.addEventListener("click", async () => { const n = await demanderTexte("Nom de la séance", `Séance ${r.seances.length + 1}`, { ok: "Ajouter" }); if (n === null) return; ajouterSeance(r, n); Etat.sauver(); render(); });
  v.append(bAddS);
}

function carteSeanceEditor(r, s) {
  const c = h(`<details class="card" open></details>`);
  c.append(h(`<summary class="spread"><b>${esc(s.nom)}</b><span class="pill">${s.exercices.length} exos · ~${s.dureeEstimeeMin || 0} min</span></summary>`));
  const acts = h(`<div class="row" style="margin:6px 0"></div>`);
  const bRen = h(`<button class="chip"><span class="cic">${IC.forward}</span>Nom</button>`);
  bRen.addEventListener("click", async () => { const n = await demanderTexte("Nom de la séance", s.nom); if (n !== null) { renommer(s, n); Etat.sauver(); render(); } });
  const bDel = h(`<button class="chip danger"><span class="cic">${IC.trash}</span>Séance</button>`);
  bDel.addEventListener("click", async () => { if (await confirmer(`Supprimer la séance « ${s.nom} » ?`, { danger: true, ok: "Supprimer" })) { supprimerSeance(r, s.id); Etat.sauver(); render(); } });
  acts.append(bRen, bDel); c.append(acts);
  s.exercices.forEach((e, i) => c.append(ligneExoEditor(s, e, i)));
  const bAddE = h(`<button class="chip"><span class="cic">${IC.plus}</span>Exercice</button>`);
  bAddE.addEventListener("click", () => choisirExercice((exId) => { ajouterExercice(s, exId, { nbSeries: 3 }); Etat.sauver(); render(); }));
  c.append(bAddE);
  return c;
}

function ligneExoEditor(s, e, i) {
  const exo = getExercise(e.exerciceId);
  const t = e.series[0] || {};
  const enTemps = !!t.dureeSec;
  const row = h(`<div class="card flat" style="margin:6px 0"></div>`);
  row.append(h(`<div class="row" style="gap:10px;align-items:center">${vignetteHTML(exo, "sm")}<b style="flex:1;min-width:0">${i + 1}. ${esc(exo ? exo.nom : e.exerciceId)}</b></div>`));
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
  const del = h(`<button class="chip danger" aria-label="Retirer l'exercice"><span class="cic">${IC.trash}</span></button>`); del.addEventListener("click", () => { supprimerExerciceIndex(s, i); Etat.sauver(); render(); });
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

  // Sections dépliables plutôt que des onglets : tout le contenu d'un exercice
  // est balayable d'un seul défilement, et l'état d'ouverture est mémorisé d'une
  // fiche à l'autre (on rouvre toujours celle qu'on consulte réellement).
  const rendus = {
    Muscles: () => {
      const f = h(`<div class="stack"></div>`);
      const anat = h(`<div class="sec" style="margin-top:0"></div>`);
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
    Technique: () => {
      const f = h(`<div class="stack"></div>`);
      if ((exo.instructions || []).length) {
        f.append(h(`<ol class="small det-steps">${exo.instructions.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>`));
      }
      if (exo.respiration) f.append(h(`<div class="sec"><h3>Respiration</h3><div class="breath"><span class="in">↧ Inspirer</span><span class="out">↥ Expirer</span></div><div class="small muted" style="margin-top:6px">${esc(exo.respiration)}</div></div>`));
      if ((exo.erreurs || []).length) f.append(h(`<div class="sec"><h3>Erreurs fréquentes</h3><div class="small muted">✖ ${exo.erreurs.map(esc).join(" · ")}</div></div>`));
      if (exo.securite) f.append(h(`<div class="sec"><h3>Sécurité</h3><div class="warn small">🛟 ${esc(exo.securite)}</div></div>`));
      if (!f.children.length) {
        return h(`<div class="empty-state"><div class="es-ic">${IC.info}</div><b>Pas de consignes détaillées</b><div class="muted small">Regarde la démonstration en haut de la fiche : elle montre l'amplitude et le rythme.</div></div>`);
      }
      return f;
    },
    Alternatives: () => {
      if (!alts.length) {
        return h(`<div class="empty-state"><div class="es-ic">${IC.swap}</div><b>Aucune alternative compatible</b><div class="muted small">Avec le matériel et les limitations déclarés dans ton profil, cet exercice n'a pas d'équivalent proche.</div></div>`);
      }
      const s = h(`<div class="stack"></div>`);
      alts.forEach((a) => {
        const card = h(`<div class="altcard"><div class="spread"><b class="small">${esc(a.etiquette)}</b><button class="chip" data-alt="${esc(a.exercice.id)}">Ouvrir</button></div>
          <div class="row" style="gap:10px;align-items:center;margin-top:6px">${vignetteHTML(a.exercice, "sm")}
          <span class="small" style="flex:1;min-width:0">${esc(a.exercice.nom)} — <span class="muted">${esc(a.explication)}</span></span></div></div>`);
        card.querySelector("[data-alt]").addEventListener("click", () => { fermer(); ouvrirDetail(getExercise(a.exercice.id)); });
        s.append(card);
      });
      return s;
    },
    Progression: () => {
      const hh = historiqueExercice(exo.id);
      if (!hh.nbSeances) {
        return h(`<div class="empty-state"><div class="es-ic">${IC.activity}</div><b>Pas encore de données</b><div class="muted small">Réalise cet exercice en séance : charge max, 1RM estimé et historique apparaîtront ici.</div></div>`);
      }
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
  const corpsFiche = h(`<div class="fiche-sect"></div>`);
  const nbSeances = historiqueExercice(exo.id).nbSeances;
  const SECTIONS = [
    ["Technique", "Technique", (exo.instructions || []).length ? `${exo.instructions.length} étapes` : "", true],
    ["Muscles", "Muscles sollicités", (exo.musclesPrincipaux || []).map((m) => MUSCLE_LABELS[m] || m).join(", "), true],
    ["Progression", "Progression", nbSeances ? `${nbSeances} séance${nbSeances > 1 ? "s" : ""}` : "aucune donnée", false],
    ["Alternatives", "Alternatives", alts.length ? `${alts.length} proposée${alts.length > 1 ? "s" : ""}` : "aucune", false],
  ];
  SECTIONS.forEach(([cle, titre, resume, ouvert]) => {
    section(corpsFiche, `fx-${cle}`, titre, (b) => b.append(rendus[cle]()), { ouvert, resume });
  });
  inner.append(corpsFiche);

  sheet.querySelector("#x").addEventListener("click", fermer);
  document.body.append(sheet);
  chargerMedia(exo, media);
}

/** Charge le média (GIF/vidéo) avec cache local, repli anatomie. */
async function chargerMedia(exo, media) {
  const heroAnatomie = (raison = "") => {
    media.style.aspectRatio = "auto"; media.innerHTML = "";
    const box = h(`<div style="padding:14px;width:100%"></div>`);
    // Toujours dire POURQUOI on est retombé sur le schéma anatomique : un
    // visuel de repli sans explication passe pour un bug.
    if (raison) box.append(h(`<div class="muted small" style="text-align:center;margin-bottom:8px">${esc(raison)}</div>`));
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
  if (!url) {
    heroAnatomie(navigator.onLine === false
      ? "Hors ligne : démonstration vidéo indisponible."
      : "Aucune démonstration trouvée pour cet exercice.");
    return;
  }

  const estVideo = /\.(mp4|webm|mov)$/i.test(url);
  const el = estVideo ? h(`<video autoplay loop muted playsinline></video>`) : h(`<img decoding="async" alt="Démonstration : ${esc(exo.nom)}">`);
  // Une requête qui n'aboutit jamais ne déclenche NI `load` NI `error` : sans
  // ce garde-fou, la fiche restait sur son indicateur de chargement à l'infini.
  let regle = false;
  const finir = (fn) => { if (regle) return; regle = true; clearTimeout(tmo); fn(); };
  const tmo = setTimeout(() => finir(() => {
    if (media.isConnected) heroAnatomie("La démonstration n'a pas pu être chargée (connexion lente ou indisponible).");
  }), 9000);
  el.addEventListener(estVideo ? "loadeddata" : "load", () => finir(() => media.querySelector(".spin")?.remove()));
  el.addEventListener("error", () => finir(() => heroAnatomie(
    navigator.onLine === false ? "Hors ligne : démonstration non téléchargée." : "Démonstration indisponible."
  )));
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
let CAT_SIL = false; // silhouette de recherche dépliée dans le catalogue
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
  // Recherche par silhouette : toucher un muscle sur le corps filtre la liste.
  // Plus direct qu'un bandeau de 12 pastilles quand on cherche « le muscle
  // là », sans savoir comment il s'appelle.
  const silBox = h(`<div class="card cat-sil"></div>`);
  const silHead = h(`<button class="spread cat-sil-head" aria-expanded="${CAT_SIL ? "true" : "false"}"><span class="sect-t">Chercher sur le corps${CAT_FILTRE.muscle ? `<span class="sect-r muted">${esc(MUSCLE_LABELS[CAT_FILTRE.muscle] || CAT_FILTRE.muscle)}</span>` : ""}</span><span class="sect-chev">${IC.chevron}</span></button>`);
  const silCorps = h(`<div class="cat-sil-body"></div>`);
  if (!CAT_SIL) silCorps.hidden = true; else silBox.classList.add("on");
  // Le muscle filtré est mis en avant, les autres restent neutres.
  /** @type {Record<string, number>} */
  const inten = {};
  if (CAT_FILTRE.muscle) inten[CAT_FILTRE.muscle] = 1;
  silCorps.innerHTML = muscleHeatmap(inten);
  silCorps.append(h(`<div class="muted small" style="text-align:center;margin-top:4px">Touche un muscle pour filtrer</div>`));
  silCorps.addEventListener("click", (ev) => {
    const g = ev.target.closest("g[data-m]");
    if (!g) return;
    const m = g.getAttribute("data-m");
    CAT_FILTRE.muscle = CAT_FILTRE.muscle === m ? "" : m;
    render();
  });
  silHead.addEventListener("click", () => { CAT_SIL = !CAT_SIL; render(); });
  silBox.append(silHead, silCorps);
  v.append(silBox);

  v.append(h(`<div class="eyebrow" style="margin-top:10px">Muscle</div>`));
  v.append(filtreLigne(muscles, "muscle", MUSCLE_LABELS));
  v.append(h(`<div class="eyebrow" style="margin-top:8px">Matériel</div>`));
  v.append(filtreLigne(equips, "equip", EQUIPMENT_LABELS));

  const res = h(`<div id="catRes" style="margin-top:10px"></div>`);
  v.append(res);
  // Affichage progressif : rendre les 343 exercices d'un coup produisait une
  // page de 8 écrans et un DOM inutilement lourd.
  const PAS = 20;
  let montres = PAS;
  const dessine = () => {
    const tous = chercherCatalogue(CAT_FILTRE);
    const list = tous.slice(0, montres);
    res.innerHTML = "";
    if (!tous.length) {
      res.append(etatVide(IC.search, "Aucun exercice ne correspond", "Les filtres se cumulent : retire le matériel ou le muscle pour élargir.",
        { action: { label: "Réinitialiser les filtres", onClick: () => { CAT_FILTRE = { q: "", muscle: "", equip: "" }; render(); } } }));
      return;
    }
    res.append(h(`<div class="muted small" style="margin-bottom:4px">${tous.length} résultat${tous.length > 1 ? "s" : ""}</div>`));
    for (const e of list) {
      // Toute la ligne est cliquable : cible tactile bien plus large qu'un
      // petit bouton en bout de ligne.
      const row = h(`<button class="exline">
        ${vignetteHTML(e, "sm")}
        <span class="meta"><span class="nm">${esc(e.nom)}</span>
          <span class="muted small">${e.musclesPrincipaux.map((m) => MUSCLE_LABELS[m] || m).join(", ")} · ${e.equipement.map((q) => EQUIPMENT_LABELS[q] || q).join(", ")}${e.source === "wger" ? ` · <span class="tag">wger</span>` : ""}</span></span>
        <span class="chev" aria-hidden="true">›</span></button>`);
      row.addEventListener("click", () => ouvrirDetail(e));
      res.append(row);
    }
    if (tous.length > montres) {
      const plus = h(`<button class="secondary" style="width:100%;margin-top:10px">Voir ${Math.min(PAS, tous.length - montres)} exercices de plus</button>`);
      plus.addEventListener("click", () => { montres += PAS; dessine(); });
      res.append(plus);
    }
  };
  dessine();
  inp.addEventListener("input", () => { CAT_FILTRE.q = inp.value; montres = PAS; dessine(); });
}

/* ======================================================================
   PROGRAMME ANATOLY (Powerbuilding 8 semaines — depuis le PDF fourni)
   ====================================================================== */
let ANATOLY_SEM = 1; // semaine sélectionnée
let ANATOLY_JOUR = 0; // jour affiché dans la semaine
/** Temps de repos indicatif selon la règle du programme (base = squat/DC/SDT). */
function reposAnat(nom) {
  return /squat|développé couché|soulevé de terre/i.test(nom) ? "4 min" : "2 min";
}
/* Résolution de média par nom de mouvement (réutilise la bibliothèque existante,
   incluant les 250 exercices wger) pour couvrir les mouvements du programme
   Anatoly qui n'ont pas de réf directe. Ordre = priorité. */
/** @type {[RegExp, string][]} */
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
  if (exo) top.append(h(vignetteHTML(exo)));
  else if (gif) top.append(h(`<img class="anat-thumb" src="${esc(gif)}" alt="" loading="lazy" decoding="async">`));
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
  v.append(h(`<div class="eyebrow">Programme Anatoly</div>`));
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

  // La rangée « ← Semaine N → » faisait doublon avec le bandeau S1..S8 : retirée.
  const semaine = ANATOLY_SEMAINES.find((s) => s.n === ANATOLY_SEM) || ANATOLY_SEMAINES[0];

  // Un jour à la fois (les 4 jours empilés donnaient 24 cartes d'affilée).
  if (ANATOLY_JOUR >= semaine.jours.length) ANATOLY_JOUR = 0;
  const jours = h(`<div class="daytabs" role="tablist" aria-label="Jour de la semaine"></div>`);
  semaine.jours.forEach((j, i) => {
    const b = h(`<button class="daytab${i === ANATOLY_JOUR ? " on" : ""}" role="tab" aria-selected="${i === ANATOLY_JOUR}"><b>${esc(j.jour)}</b><span>${esc(j.groupe)}</span></button>`);
    b.addEventListener("click", () => { ANATOLY_JOUR = i; render(); });
    jours.append(b);
  });
  v.append(jours);
  const jour = semaine.jours[ANATOLY_JOUR];
  if (jour) jour.exercices.forEach((ex, idx) => v.append(carteAnatoly(ex, idx + 1)));

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
  const gif = urlDemo(exo);
  const t = e.series.find((s) => s.type === "travail") || e.series[0];
  const nb = e.series.filter((s) => s.type !== "echauffement").length || e.series.length;
  const reps = t?.dureeSec ? `${t.dureeSec} s` : t?.repsCible ? `${t.repsCible[0]}–${t.repsCible[1]}` : "—";
  const repos = t?.reposSec ? formatRepos(t.reposSec) : "—";
  const nom = exo ? exo.nom : e.exerciceId;
  const c = h(`<div class="card anat-ex${exo ? " tap" : ""}"></div>`);
  const top = h(`<div class="anat-ex-top"></div>`);
  if (exo) top.append(h(vignetteHTML(exo)));
  else if (gif) top.append(h(`<img class="anat-thumb" src="${esc(gif)}" alt="" loading="lazy" decoding="async">`));
  const body = h(`<div style="flex:1;min-width:0"></div>`);
  body.append(h(`<div class="anat-nom"><span class="anat-num">${num}</span>${esc(nom)}</div>`));
  if (exo) body.append(h(`<div class="exo-tags">${tagsExercice(exo)}</div>`));
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
  // Le gabarit a pu changer pendant la séance : on complète l'état live pour
  // les exercices ajoutés depuis, sinon leur carte n'a aucun état à afficher.
  reconcilier(LIVE, seance);
  // En-tête de séance : nom + chrono + progression (séries validées / total)
  const pr = progressionSeance(seance);
  const nbExos = seance.exercices.length;
  const head = h(`<div class="card trainhead stack"></div>`);
  head.append(h(`<div class="spread"><div style="min-width:0"><h1 style="margin:0;font-size:1.3rem">${esc(seance.nom)}</h1><span class="livetimer"><span class="livedot" aria-hidden="true"></span><span class="num" id="seanceTimer">00:00</span></span></div><button class="chip danger" id="abandon">Abandonner</button></div>`));
  head.append(h(`<div class="bar"><div id="seanceProgBar" style="width:${Math.round(pr.pct * 100)}%"></div></div>`));
  head.append(h(`<div class="spread small" style="margin-top:7px"><span class="exo-progres" id="seanceProgTxt">Exercice ${exoCourant(seance)} / ${nbExos} · ${pr.faits}/${pr.tot} séries</span><button class="linklike" id="goGuide">Mode guidé ›</button></div>`));
  v.append(head);
  $("#goGuide", head).addEventListener("click", ouvrirGuide);
  arreterChrono(); majChrono(); SESSION_TMR = setInterval(majChrono, 1000);
  seance.exercices.forEach((e) => v.append(carteExoLive(e, seance)));
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
/**
 * Rang de l'exercice en cours : le premier dont toutes les séries ne sont pas
 * validées. Donne le « 2 / 6 » de la maquette sans rien changer à la logique.
 */
function exoCourant(seance) {
  const ex = seance.exercices || [];
  for (let i = 0; i < ex.length; i++) {
    const st = LIVE && LIVE.data[ex[i].exerciceId];
    if (!st || st.series.some((s) => !s.done)) return i + 1;
  }
  return ex.length || 1;
}

/** Met à jour en direct le bandeau de progression sans re-rendre toute la vue. */
function majProgressionSeance() {
  const seance = LIVE && trouverSeance(LIVE.seanceId);
  if (!seance) return;
  const pr = progressionSeance(seance);
  const bar = $("#seanceProgBar"), txt = $("#seanceProgTxt");
  if (bar) bar.style.width = `${Math.round(pr.pct * 100)}%`;
  if (txt) txt.textContent = `Exercice ${exoCourant(seance)} / ${seance.exercices.length} · ${pr.faits}/${pr.tot} séries`;
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
/** L'interface avancée est-elle active ? (options supplémentaires en séance) */
function modeAvance() { return Etat.data.reglages.modeAvance === true; }
/** Libellé de la métrique d'effort choisie : RIR (défaut) ou RPE. */
function metriqueEffort() { return modeAvance() && Etat.data.reglages.metrique === "rpe" ? "RPE" : "RIR"; }

/**
 * Exercice à enchaîner sans repos après la série `i` de `exId`, s'il fait
 * partie d'un superset et qu'un partenaire a encore cette série à faire.
 * Renvoie null en dehors d'un superset ou quand le tour est bouclé.
 */
function prochainSuperset(seance, exId, i) {
  const st = LIVE.data[exId];
  if (!st || !st.supersetGroupe) return null;
  const ordre = seance.exercices.map((x) => x.exerciceId);
  const membres = exercicesDuSuperset(LIVE, ordre, st.supersetGroupe);
  if (membres.length < 2) return null;
  const depart = membres.indexOf(exId);
  for (let k = 1; k < membres.length; k++) {
    const id = membres[(depart + k) % membres.length];
    const s = LIVE.data[id] && LIVE.data[id].series[i];
    if (s && !s.done) return id;
  }
  return null;
}

function carteExoLive(e, seance) {
  const st = LIVE.data[e.exerciceId];
  if (!st) return h(`<div class="card"><div class="muted small">${esc(nomExo(e.exerciceId))} — état indisponible pour cette séance.</div></div>`);
  const exo = getExercise(st.exId);
  if (!exo) {
    const c = h(`<div class="card"><div class="spread"><b>${esc(st.exId)}</b><button class="chip danger" aria-label="Retirer"><span class="cic">${IC.trash}</span></button></div><div class="muted small">Exercice indisponible.</div></div>`);
    c.querySelector("button").addEventListener("click", () => retirerExerciceLive(e.exerciceId));
    return c;
  }
  const t = e.series.find((s) => s.type === "travail") || e.series[0];
  const plage = t?.repsCible || exo.repsPertinent;
  const [derniere, avant] = Etat.perfs(st.exId);
  const sug = recommander(st.exId, plage, derniere || null, avant || null);
  const enTemps = !!st.series[0]?.dureeSec;
  const c = h(`<div class="card stack exocard"></div>`);

  // En-tête : vignette 52 px + nom + badges musculaires. La vignette ouvre la
  // fiche (démonstration, technique) sans occuper la moitié de l'écran.
  const tete = h(`<div class="exo-tete"></div>`);
  const vign = h(`<button class="exo-vign" aria-label="Voir la démonstration de ${esc(exo.nom)}">${vignetteExo(exo)}</button>`);
  vign.addEventListener("click", () => ouvrirDetail(exo));
  const titre = h(`<div class="exo-titre"><h3>${esc(exo.nom)}</h3></div>`);
  if (st.supersetGroupe) titre.append(h(`<span class="ss-tag">Superset ${esc(st.supersetGroupe)}</span>`));
  titre.append(badgesMuscles(exo));
  tete.append(vign, titre, h(`<span class="pill exo-vol">${st.series.length} × ${enTemps ? (st.series[0].dureeSec + " s") : (plage[0] + "–" + plage[1])}</span>`));
  c.append(tete);

  // Ligne de contexte unique, dépliable : repos, charge conseillée, objectif.
  const objectif = !enTemps && sug.chargeKg
    ? `${sug.chargeKg} kg × ${plage[0]}–${plage[1]}` : null;
  const tempo = modeAvance() && (t?.tempo || exo.tempoDefaut) ? (t?.tempo || exo.tempoDefaut) : null;
  const metaTxt = `<span class="cic">${IC.clock}</span>repos ${formatRepos(t?.reposSec || 60)}`
    + (objectif ? ` · <span class="cic">${IC.dumbbell}</span>objectif <b class="sug">${objectif}</b>` : "")
    + (tempo ? ` · tempo <b class="sug">${esc(tempo)}</b>` : "");
  const meta = h(`<button class="exometa muted small" aria-expanded="false">${metaTxt}<span class="cic exometa-i">${IC.info}</span></button>`);
  const conseil = h(`<div class="notice small" hidden>${esc(sug.message)}</div>`);
  meta.addEventListener("click", () => {
    const ouvert = conseil.hidden;
    conseil.hidden = !ouvert;
    meta.setAttribute("aria-expanded", String(ouvert));
  });
  c.append(meta, conseil);
  // Tableau des séries : Série · Précédent (ou RIR/RPE) · Kg · Reps · Validé.
  // En mode avancé la colonne d'effort est affichée d'emblée ; en débutant, la
  // colonne « Précédent » suffit et l'écran reste à quatre informations.
  const avance = modeAvance();
  if (avance) c.classList.add("adv");
  const showEffort = st.showRir != null ? st.showRir : avance;
  const col2 = showEffort ? metriqueEffort() : "Préc.";
  c.append(h(`<div class="setrow"><span class="head">Série</span><span class="head">${col2}</span><span class="head">${enTemps ? "Sec" : "Kg"}</span><span class="head">${enTemps ? "Durée" : "Reps"}</span><span class="head">✓</span></div>`));
  // Les suggestions des séries suivantes dépendent de ce qui vient d'être
  // saisi : elles doivent être recalculées à chaque frappe, sinon l'écran
  // promet une valeur et la validation en enregistre une autre.
  const lignes = [];
  const majSuggestions = () => {
    for (const { row, i } of lignes) {
      const dpi = derniere && derniere.series[i];
      const cc = valeurSerie(st.series, i, "charge", dpi && dpi.chargeKg, sug.chargeKg);
      const rr = valeurSerie(st.series, i, "reps", dpi && dpi.reps, plage && plage[0]);
      const ic = row.querySelector('input[data-f="charge"]');
      if (ic) ic.placeholder = cc == null ? "—" : String(cc);
      const ir = row.querySelector('input[data-f="reps"]');
      if (ir) ir.placeholder = rr == null ? "—" : String(rr);
    }
  };
  st.series.forEach((s, i) => {
    const dp = derniere && derniere.series[i];
    const prev = dp ? (enTemps ? `${dp.dureeSec || 0}s` : `${dp.chargeKg || 0}×${dp.reps || 0}`) : "—";
    const col2El = showEffort
      ? `<input inputmode="decimal" placeholder="${metriqueEffort() === "RPE" ? "8" : "2"}" value="${s.rir}" data-f="rir" aria-label="${metriqueEffort()} série ${i + 1}">`
      : `<span class="prev muted">${prev}</span>`;
    // En mode avancé le numéro de série devient un bouton : un tap fait défiler
    // normale → drop set → rest-pause. Aucun sous-menu, aucune colonne en plus.
    const tSerie = TYPES_SERIE[s.type] || TYPES_SERIE.normale;
    // Suggestion affichée = valeur qui sera enregistrée si l'on valide sans
    // rien taper. Les deux doivent être calculées au même endroit, sans quoi
    // l'écran promet une chose et l'historique en garde une autre.
    const chargeAff = valeurSerie(st.series, i, "charge", dp && dp.chargeKg, sug.chargeKg);
    const repsAff = valeurSerie(st.series, i, "reps", dp && dp.reps, plage && plage[0]);
    const numEl = avance
      ? `<button class="serie sertype ${s.type !== "normale" ? "on" : ""}" aria-label="Type de la série ${i + 1} : ${tSerie.label}. Toucher pour changer">${i + 1}${tSerie.court ? `<span class="sertag">${tSerie.court}</span>` : ""}</button>`
      : `<span class="serie">${i + 1}</span>`;
    const row = h(`<div class="setrow${s.done ? " vdone" : ""}${s.type !== "normale" ? " serie-" + s.type : ""}">
      ${numEl}
      ${col2El}
      <input inputmode="decimal" placeholder="${chargeAff == null ? "—" : chargeAff}" value="${s.charge}" data-f="charge" aria-label="Charge série ${i + 1}">
      <input inputmode="numeric" placeholder="${enTemps ? s.dureeSec : (repsAff == null ? "—" : repsAff)}" value="${enTemps ? s.dureeSec : s.reps}" data-f="${enTemps ? "dureeSec" : "reps"}" aria-label="${enTemps ? "Durée" : "Répétitions"} série ${i + 1}">
      <button class="done ${s.done ? "on" : ""}" aria-label="Valider la série ${i + 1}">✓</button></div>`);
    on(row, "input", "input", (ev) => { const f = ev.target.dataset.f; s[f] = ev.target.value; persistLive(); majSuggestions(); });
    const bType = row.querySelector(".sertype");
    if (bType) bType.addEventListener("click", () => {
      s.type = cyclerType(s.type);
      persistLive(true);
      toast(`Série ${i + 1} · ${TYPES_SERIE[s.type].label}`);
      render();
    });
    row.querySelector(".done").addEventListener("click", (ev) => {
      s.done = !s.done;
      // Valider sans avoir saisi enregistre ce que la ligne affichait. C'est le
      // geste le plus courant en salle : on répète la série précédente.
      if (s.done) {
        completerSerie(st.series, i, {
          chargePrecedente: dp && dp.chargeKg, chargeConseil: sug.chargeKg,
          repsPrecedentes: dp && dp.reps, repsConseil: plage && plage[0],
        });
        row.querySelectorAll("input[data-f]").forEach((inp) => {
          const f = inp.dataset.f;
          if (f === "charge" || f === "reps") inp.value = s[f] ?? "";
        });
      }
      const btn = ev.currentTarget;
      btn.classList.toggle("on", s.done);
      row.classList.toggle("vdone", s.done);
      if (s.done) { btn.classList.remove("pop"); void btn.offsetWidth; btn.classList.add("pop"); try { if (Etat.data.reglages.vibrations !== false) navigator.vibrate?.(20); } catch (e) {} }
      persistLive(); majProgressionSeance(); majSuggestions();
      if (!s.done) return;
      // Repos : court et fixe pour un drop set / rest-pause, nul dans un
      // superset tant qu'il reste un partenaire à enchaîner.
      const suivant = seance ? prochainSuperset(seance, e.exerciceId, i) : null;
      const r = reposApresSerie({ type: s.type, reposSec: t?.reposSec || 60, suivantSuperset: suivant });
      if (r.enchainer) { toast(`Superset ${st.supersetGroupe} → enchaîne avec ${nomExo(suivant)}`); return; }
      const suffixe = r.raison === "normal" ? "" : ` · ${r.raison}`;
      startTimer(r.sec, `${exo.nom} · série ${i + 1}${suffixe}`);
    });
    lignes.push({ row, i });
    c.append(row);
  });
  majSuggestions();
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
  // Actions secondaires (démo, RIR, douleur, remplacer, retirer) : regroupées
  // derrière un menu. Pendant une séance, on ne veut qu'une rangée d'actions.
  // « Machine occupée » : le cas le plus fréquent en salle. Un tap propose
  // immédiatement les alternatives compatibles, sans passer par un menu.
  const bOcc = h(`<button class="chip"><span class="cic">${IC.swap}</span>Machine occupée</button>`);
  bOcc.addEventListener("click", () => machineOccupee(e.exerciceId, exo));
  serieActs.append(bOcc);

  const bMenu = h(`<button class="chip exomenu" aria-label="Autres actions pour ${esc(exo.nom)}">⋯</button>`);
  if (st.douleur) bMenu.classList.add("danger");
  bMenu.addEventListener("click", () => menuExoLive(e, exo, st, seance));
  serieActs.append(bMenu);
  c.append(serieActs);
  // Exercice terminé (toutes les séries validées) → état visuel discret.
  if (st.series.length && st.series.every((s) => s.done)) c.classList.add("exo-done");
  return c;
}
/**
 * Menu des actions secondaires d'un exercice en séance. Sorti de la carte pour
 * garder l'écran d'entraînement dense et manipulable d'une main.
 */
function menuExoLive(e, exo, st, seance) {
  const sheet = h(`<div class="sheet menu-sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const fermer = () => sheet.remove();
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0;font-size:1.1rem">${esc(exo.nom)}</h2><button class="chip" id="mX">✕</button></div>`));
  const item = (icone, label, onClick, cls = "") => {
    const b = h(`<button class="plusitem ${cls}"><span class="pm-ic mi-blue">${icone}</span><span class="pm-main"><b>${esc(label)}</b></span><span class="chev">›</span></button>`);
    b.addEventListener("click", () => { fermer(); onClick(); });
    inner.append(b);
    return b;
  };
  item(IC.play, "Voir la démonstration", () => ouvrirDetail(exo));
  const effortVisible = st.showRir != null ? st.showRir : modeAvance();
  item(IC.repeat, `${effortVisible ? "Masquer" : "Afficher"} la colonne ${metriqueEffort()}`, () => {
    st.showRir = !effortVisible; persistLive(true); render();
  });
  // Superset : réservé au mode avancé, où l'utilisateur sait ce qu'il enchaîne.
  if (modeAvance() && seance) {
    if (st.supersetGroupe) {
      item(IC.repeat, `Sortir du superset ${st.supersetGroupe}`, () => {
        const groupe = st.supersetGroupe;
        st.supersetGroupe = null;
        // Un superset à un seul membre n'a plus de sens : on le dissout.
        const ordre = seance.exercices.map((x) => x.exerciceId);
        const restants = exercicesDuSuperset(LIVE, ordre, groupe);
        if (restants.length < 2) restants.forEach((id) => { LIVE.data[id].supersetGroupe = null; });
        persistLive(true); toast("Superset dissous"); render();
      });
    } else {
      item(IC.swap, "Grouper en superset", () => choisirPartenaireSuperset(e.exerciceId, seance));
    }
  }
  item(IC.swap, "Remplacer l'exercice", () => remplacer(e.exerciceId));
  item(IC.alert, st.douleur ? "Retirer la douleur signalée" : "Signaler une douleur", () => {
    st.douleur = !st.douleur; persistLive(true);
    if (st.douleur) info("Douleur vive, articulaire ou inhabituelle : arrête cet exercice aujourd'hui. Si elle persiste, consulte un professionnel de santé.", { titre: "⚠️ Douleur signalée" });
    render();
  }, st.douleur ? "on" : "");
  item(IC.trash, "Retirer de la séance", async () => {
    // Retirer efface la saisie déjà faite : on le dit, avec le compte exact.
    const saisies = (st.series || []).filter((x) => x.done || x.charge !== "" || x.reps !== "").length;
    const msg = saisies
      ? `Retirer « ${exo.nom} » ? ${saisies} série${saisies > 1 ? "s" : ""} déjà saisie${saisies > 1 ? "s" : ""} ${saisies > 1 ? "seront perdues" : "sera perdue"}.`
      : `Retirer « ${exo.nom} » de la séance ?`;
    if (await confirmer(msg, { danger: true, ok: "Retirer" })) retirerExerciceLive(e.exerciceId);
  }, "danger");
  sheet.querySelector("#mX").addEventListener("click", fermer);
  sheet.addEventListener("click", (ev) => { if (ev.target === sheet) fermer(); });
  document.body.append(sheet);
}

/**
 * Choix du partenaire de superset : la liste des autres exercices de la séance.
 * Rejoindre un exercice déjà groupé agrandit son groupe (tri-set) plutôt que
 * d'en créer un second, ce qui serait incompréhensible à l'usage.
 */
function choisirPartenaireSuperset(exId, seance) {
  const autres = seance.exercices.map((x) => x.exerciceId).filter((id) => id !== exId && LIVE.data[id]);
  if (!autres.length) { info("Ajoute au moins un deuxième exercice à la séance pour créer un superset.", { titre: "Superset" }); return; }
  const sheet = h(`<div class="sheet menu-sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const fermer = () => sheet.remove();
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0;font-size:1.1rem">Enchaîner avec…</h2><button class="chip" id="ssX">✕</button></div>`));
  inner.append(h(`<div class="muted small" style="margin-bottom:8px">Les exercices groupés s'enchaînent sans repos ; le minuteur ne se déclenche qu'après le dernier du groupe.</div>`));
  autres.forEach((id) => {
    const g = LIVE.data[id].supersetGroupe;
    const b = h(`<button class="plusitem"><span class="pm-ic mi-blue">${IC.swap}</span><span class="pm-main"><b>${esc(nomExo(id))}</b>${g ? `<br><span class="muted small">déjà dans le superset ${esc(g)}</span>` : ""}</span><span class="chev">›</span></button>`);
    b.addEventListener("click", () => {
      fermer();
      const groupe = g || groupeSupersetLibre(LIVE);
      if (!groupe) { toast("Quatre supersets au maximum dans une séance."); return; }
      LIVE.data[exId].supersetGroupe = groupe;
      LIVE.data[id].supersetGroupe = groupe;
      persistLive(true); toast(`Superset ${groupe} créé`); render();
    });
    inner.append(b);
  });
  sheet.querySelector("#ssX").addEventListener("click", fermer);
  sheet.addEventListener("click", (ev) => { if (ev.target === sheet) fermer(); });
  document.body.append(sheet);
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
      series: Array.from({ length: nb }, () => ({ charge: "", reps: "", rir: "", dureeSec: enTemps ? (e.series.find((s) => s.dureeSec)?.dureeSec || 40) : null, done: false, type: "normale" })),
      douleur: false, showRir: null, supersetGroupe: null,
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
    if (!res.length) { liste.append(etatVide(IC.search, "Aucun exercice trouvé", "Essaie un mot du mouvement (« développé », « tirage ») ou du muscle (« dos »).")); return; }
    res.forEach((exo) => {
      const b = h(`<button class="big exo-pick" style="justify-content:flex-start;gap:10px;text-align:left;margin:4px 0">
        ${vignetteHTML(exo, "sm")}
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
        const b = h(`<button class="big exo-pick" style="justify-content:flex-start;gap:10px;text-align:left;margin:3px 0">${vignetteHTML(a.exercice, "sm")}<span><b>${esc(a.exercice.nom)}</b><br><span class="muted small">${esc(a.etiquette)}</span></span></button>`);
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
async function terminer() {
  const seance = trouverSeance(LIVE.seanceId);
  const exercices = [];
  for (const exId in LIVE.data) {
    const st = LIVE.data[exId];
    // La colonne d'effort saisit soit un RIR, soit un RPE : l'historique, lui,
    // ne stocke que du RIR (RIR = 10 − RPE) pour que le moteur de fatigue et
    // les statistiques restent comparables d'une séance à l'autre.
    const enRpe = metriqueEffort() === "RPE";
    const series = st.series.filter((s) => s.done || s.reps || s.charge || s.dureeSec)
      .map((s) => ({
        chargeKg: s.charge === "" ? null : +s.charge,
        reps: s.reps === "" ? null : +s.reps,
        rir: s.rir === "" ? null : (enRpe ? rirDepuisRpe(s.rir) : +s.rir),
        dureeSec: s.dureeSec || null,
        type: s.type && s.type !== "normale" ? s.type : undefined,
      }));
    if (series.length || st.douleur) {
      exercices.push({
        exerciceId: exId, series, douleur: st.douleur,
        supersetGroupe: st.supersetGroupe || undefined,
      });
    }
  }
  // Une séance sans la moindre série n'est pas une séance. L'enregistrer
  // polluerait l'historique : elle compterait comme un jour d'entraînement pour
  // le moteur (qui plafonne les jours par semaine) et comme une croix dans le
  // calendrier d'assiduité, pour un entraînement qui n'a pas eu lieu.
  if (!exercices.length) {
    const ok = await confirmer(
      "Aucune série n'a été validée. Fermer la séance sans rien enregistrer ?",
      { danger: true, ok: "Fermer sans enregistrer", titre: "Séance vide" });
    if (!ok) return;
    LIVE = null; Etat.data.sessionEnCours = null; Etat.sauver();
    arreterChrono(); stopTimer(); nav("dash");
    toast("Séance fermée — rien n'a été enregistré");
    return;
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
  // Ressenti (correctif subjectif borné) puis impact musculaire de la séance.
  inner.append(blocRessenti());
  inner.append(blocImpactSeance(log));

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

/* ---------- minuteur de repos ----------
   Un SEUL état de repos (`REPOS`), fondé sur l'instant de fin et persisté :
   il survit au verrouillage de l'écran, au changement d'application et au
   rechargement. L'affichage — plein écran ou capsule — n'est qu'une vue de cet
   état, jamais la source de vérité. */
let TMR = null;
let REPOS = null;           // { finAt, totalSec, label } | null
let VEILLE = null;          // verrou d'écran (Wake Lock), best-effort
let CAL_VIEW = null; // {annee, mois} du calendrier d'assiduité affiché (Progrès)

/** Empêche l'écran de s'éteindre pendant le repos, quand le navigateur le permet. */
async function tenirEcran() {
  try {
    if (VEILLE || !navigator.wakeLock) return;
    VEILLE = await navigator.wakeLock.request("screen");
    VEILLE.addEventListener?.("release", () => { VEILLE = null; });
  } catch (e) { VEILLE = null; }   // refusé (batterie faible, onglet caché) : sans conséquence
}
function relacherEcran() {
  try { VEILLE?.release?.(); } catch (e) {}
  VEILLE = null;
}

/** Écrit l'état de repos dans le stockage pour qu'il survive à un rechargement. */
function persistRepos() {
  Etat.data.reposEnCours = REPOS ? { ...REPOS } : null;
  Etat.sauver();
}

/** Le repos est terminé : signal, nettoyage, message. */
function finDuRepos(annonce) {
  const ann = $("#ovAnnonce"); if (ann) ann.textContent = "Repos terminé, série suivante";
  const visible = $("#overlay").classList.contains("show") || !!document.getElementById("restCap")?.classList.contains("show");
  stopTimer();
  try { if (Etat.data.reglages.vibrations !== false) navigator.vibrate?.([120, 60, 120]); } catch (e) {}
  if (annonce !== false && !visible) toast("Repos terminé — série suivante");
}

/** Redessine les deux vues possibles du repos à partir de l'horloge. */
function dessinerRepos() {
  if (!REPOS) return;
  const reste = restantSec(REPOS);
  const ov = $("#overlay");
  if (ov && ov.classList.contains("show")) {
    $("#ovTxt").textContent = formatRestant(REPOS);
    $("#ringFg").style.strokeDashoffset = String(653 * progression(REPOS));
    $("#overlay .ring")?.classList.toggle("urgent", reste <= 10);
  }
  const cap = document.getElementById("restCap");
  if (cap && cap.classList.contains("show")) {
    cap.querySelector("b").textContent = formatRestant(REPOS);
    cap.classList.toggle("urgent", reste <= 10);
  }
}

/** Boucle d'affichage. Elle ne calcule rien : elle relit l'horloge. */
function boucleRepos() {
  clearInterval(TMR);
  TMR = setInterval(() => {
    if (!REPOS) { clearInterval(TMR); TMR = null; return; }
    if (estEcoule(REPOS)) { finDuRepos(); return; }
    dessinerRepos();
  }, 250);   // 4 fois par seconde : l'affichage reste juste même si un tic saute
}

function startTimer(sec, label = "") {
  REPOS = creerRepos(sec, label);
  persistRepos();
  ouvrirEcranRepos();
}

/** Affiche le repos en plein écran (à partir de l'état courant). */
function ouvrirEcranRepos() {
  if (!REPOS) return;
  const ov = $("#overlay"); ov.classList.add("show");
  masquerCapsule(false);
  const sub = $("#ovSub"); if (sub) sub.textContent = REPOS.label;
  const ann = $("#ovAnnonce");
  if (ann) ann.textContent = `Temps de repos ${restantSec(REPOS)} secondes${REPOS.label ? ", " + REPOS.label : ""}`;
  dessinerRepos(); boucleRepos(); tenirEcran();
  $("#ovPlus").onclick = () => { REPOS = ajusterRepos(REPOS, 15); persistRepos(); dessinerRepos(); };
  $("#ovMinus").onclick = () => { REPOS = ajusterRepos(REPOS, -15); persistRepos(); dessinerRepos(); };
  $("#ovSkip").onclick = stopTimer; // « Passer le repos » arrête vraiment
  // Un tap sur le fond RÉDUIT le minuteur : il continue dans une capsule, ce
  // qui permet de saisir la série suivante sans perdre le décompte.
  ov.onclick = (e) => {
    if (e.target !== ov) return;
    ov.classList.remove("show");
    $("#overlay .ring")?.classList.remove("urgent");
    if (!estEcoule(REPOS)) afficherCapsule();
    else stopTimer();
  };
}

function stopTimer() {
  clearInterval(TMR); TMR = null;
  REPOS = null; persistRepos();
  relacherEcran();
  $("#overlay").classList.remove("show");
  $("#overlay .ring")?.classList.remove("urgent");
  masquerCapsule(false);
}

/* ---------- capsule de repos persistante ----------
   Réduire le minuteur ne doit pas l'arrêter : on continue à voir le temps
   restant tout en saisissant la série suivante ou en changeant d'écran. */
function afficherCapsule() {
  if (!REPOS) return;
  let cap = document.getElementById("restCap");
  if (!cap) {
    cap = h(`<button id="restCap" class="restcap" aria-label="Reprendre le minuteur de repos"><span class="cic">${IC.clock}</span><b class="num"></b></button>`);
    cap.addEventListener("click", () => { if (REPOS && !estEcoule(REPOS)) ouvrirEcranRepos(); else stopTimer(); });
    document.body.append(cap);
  }
  cap.classList.add("show");
  dessinerRepos(); boucleRepos();
}
function masquerCapsule(arreter = true) {
  document.getElementById("restCap")?.classList.remove("show");
  if (arreter) stopTimer();
}

/**
 * Reprend un repos en cours après un rechargement, un réveil ou un retour dans
 * l'application. Si le repos s'est achevé pendant l'absence, on le signale une
 * fois puis on nettoie — plutôt que d'afficher un décompte figé et faux.
 */
function reprendreRepos() {
  const restaure = restaurerRepos(Etat.data.reposEnCours);
  if (restaure) { REPOS = restaure; afficherCapsule(); return; }
  if (Etat.data.reposEnCours) {          // il existait mais il est échu
    Etat.data.reposEnCours = null; Etat.sauver();
    toast("Repos terminé pendant ton absence");
  }
}

// Revenir dans l'app doit montrer le temps JUSTE immédiatement : la limitation
// des minuteurs en arrière-plan a pu faire sauter des tics d'affichage.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !REPOS) return;
  if (estEcoule(REPOS)) finDuRepos(); else { dessinerRepos(); boucleRepos(); tenirEcran(); }
});

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
  try { if (Etat.data.reglages.vibrations !== false) navigator.vibrate?.(20); } catch (e) {}
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
  const fini = () => { if (GUIDE.tmr) clearInterval(GUIDE.tmr); GUIDE.tmr = null; GUIDE.phase = "work"; try { if (Etat.data.reglages.vibrations !== false) navigator.vibrate?.([120, 60, 120]); } catch (e) {} guideRender(); };
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
  try { if (Etat.data.reglages.vibrations !== false) navigator.vibrate?.([120, 60, 120]); } catch (e) {}
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
   ÉTATS DE L'APPLICATION — hors ligne, mise à jour disponible
   ====================================================================== */

/** Bandeau discret quand la connexion est perdue. L'app fonctionne hors ligne :
 *  le message rassure au lieu d'alarmer. */
function majEtatReseau() {
  let el = document.getElementById("netBar");
  if (navigator.onLine) { el?.remove(); return; }
  if (el) return;
  el = h(`<div id="netBar" class="netbar" role="status">Hors ligne — tes séances continuent d'être enregistrées sur cet appareil.</div>`);
  document.body.append(el);
}
window.addEventListener("online", majEtatReseau);
window.addEventListener("offline", majEtatReseau);

/** Invite à recharger quand une nouvelle version est prête (service worker). */
function proposerMiseAJour() {
  if (document.getElementById("updBar")) return;
  const el = h(`<div id="updBar" class="updbar" role="status"><span>Nouvelle version disponible</span><button class="chip">Mettre à jour</button></div>`);
  el.querySelector("button").addEventListener("click", () => location.reload());
  document.body.append(el);
}
window.addEventListener("coachperso:maj", proposerMiseAJour);

/* ======================================================================
   RESSENTI DE FIN DE SÉANCE
   Petit correctif subjectif sur l'état musculaire. Volontairement borné :
   il module de ±12 points au maximum et ne peut jamais écraser les données
   d'entraînement réelles.
   ====================================================================== */

const RESSENTIS = [
  { v: -1, nom: "Très frais", ic: "◕" },
  { v: -0.4, nom: "Bien", ic: "◑" },
  { v: 0.4, nom: "Fatigué", ic: "◔" },
  { v: 1, nom: "Très fatigué", ic: "○" },
];

/**
 * Impact musculaire de la séance qui vient d'être réalisée, et prochaine étape.
 * Ferme la boucle : on voit ce qu'on a travaillé et ce que le moteur prévoit.
 */
function blocImpactSeance(log) {
  const c = h(`<div class="card stack" style="margin-top:12px"></div>`);
  c.append(h(`<div class="eyebrow">Impact de cette séance</div>`));
  const { parMuscle } = analyserSeance(log, getExercise);
  const lignes = Object.entries(parMuscle)
    .map(([m, e]) => ({ m, s: e.stress }))
    .sort((a, b) => b.s - a.s).slice(0, 5);
  if (!lignes.length) {
    c.append(h(`<div class="muted small">Aucune série enregistrée.</div>`));
    return c;
  }
  const max = lignes[0].s || 1;
  lignes.forEach((l) => {
    c.append(h(`<div class="impact-row"><div class="spread small"><span>${esc(LABELS_MOTEUR[l.m] || l.m)}</span><span class="muted">${l.s.toFixed(1)} séries éq.</span></div>
      <div class="bar" style="height:6px;margin-top:4px"><div style="width:${Math.round((l.s / max) * 100)}%"></div></div></div>`));
  });
  // Prochaine étape : le moteur a déjà recalculé.
  const gen = calculerAuto();
  const suite = gen.repos
    ? "Repos conseillé — l'ensemble du corps est encore en récupération."
    : `${gen.nom} · ${gen.exercices.length} exercices · ~${gen.dureeEstimee} min`;
  c.append(h(`<div class="notice small" style="margin-top:8px"><b>Prochaine séance :</b> ${esc(suite)}</div>`));
  return c;
}

/** Rangée de choix du ressenti, ajoutée à l'écran de fin de séance. */
function blocRessenti() {
  const c = h(`<div class="card stack" style="margin-top:14px"></div>`);
  c.append(h(`<div class="spread"><b>Comment te sens-tu ?</b><span class="muted small">optionnel</span></div>`));
  c.append(h(`<div class="muted small">Ajuste légèrement l'estimation de récupération. Tes séries enregistrées restent la référence.</div>`));
  const row = h(`<div class="ressenti-row"></div>`);
  const actuel = Etat.data.reglages.ressenti ?? 0;
  RESSENTIS.forEach((r) => {
    const b = h(`<button class="ressenti ${actuel === r.v ? "on" : ""}"><span>${r.ic}</span><b>${esc(r.nom)}</b></button>`);
    b.addEventListener("click", () => {
      Etat.data.reglages.ressenti = Etat.data.reglages.ressenti === r.v ? 0 : r.v;
      Etat.sauver();
      row.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      if (Etat.data.reglages.ressenti === r.v) b.classList.add("on");
      AUTO = null; // forcer le recalcul de la prochaine séance
      try { navigator.vibrate?.(12); } catch (e) {}
    });
    row.append(b);
  });
  c.append(row);
  return c;
}

/* ======================================================================
   COMPOSANTS DE SÉANCE — vignette, badges musculaires, alternatives rapides
   ====================================================================== */

/** Icône de matériel, pour identifier un exercice d'un coup d'œil. */
const IC_MATOS = {
  barre: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12h18M6 8v8M18 8v8M2 10v4M22 10v4"/></svg>`,
  halteres: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 7v10M18 7v10M4 9v6M20 9v6M6 12h12"/></svg>`,
  poulie: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="2.5"/><path d="M12 7.5V15M8 19h8M9 15h6v4H9z"/></svg>`,
  machine: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="12" rx="2"/><path d="M8 20h8M12 16v4M8 8h8M8 12h5"/></svg>`,
  corps: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="4.5" r="2.5"/><path d="M12 7v7M7 9l5 2 5-2M9 21l3-7 3 7"/></svg>`,
};

/**
 * Vignette d'exercice (52 px) : silhouette du muscle principal + icône de
 * matériel. Générée localement, donc instantanée et disponible hors ligne —
 * là où une image distante mettrait du temps et occuperait tout l'écran.
 */
/**
 * URL de démonstration connue SANS aller sur le réseau : cache local d'abord,
 * puis la table embarquée, puis la miniature du catalogue. Null si inconnue —
 * on ne déclenche jamais de recherche en ligne pour une vignette.
 */
function urlDemo(exo) {
  if (!exo) return null;
  return Etat.data.mediaCache?.[exo.id] || GIFS[exo.id] || (exo.media && exo.media.miniature) || null;
}

function vignetteExo(exo) {
  const muscles = (exo.musclesPrincipaux || []).slice(0, 2);
  const eq = exo.equipement || [];
  let matos = "corps";
  if (eq.includes("barre") || eq.includes("barre_ez")) matos = "barre";
  else if (eq.includes("halteres") || eq.includes("kettlebell")) matos = "halteres";
  else if (eq.includes("poulie") || eq.includes("elastiques")) matos = "poulie";
  else if (eq.includes("machine_leviers") || eq.includes("machine_guidee") || eq.includes("smith")) matos = "machine";
  // La démonstration EST l'information utile : on la montre directement dans la
  // vignette plutôt que d'obliger à ouvrir la fiche. La silhouette reste
  // dessous et réapparaît si l'image ne charge pas (hors ligne, exercice sans
  // média). Animation ignorée si l'utilisateur a demandé moins de mouvement.
  const url = REDUIRE_MOTION ? null : urlDemo(exo);
  const img = url
    ? `<img class="exo-gif" src="${esc(url)}" alt="" loading="lazy" decoding="async">`
    : "";
  return `${muscles.length ? miniSilhouette(muscles) : ""}${img}`
    + `<span class="exo-matos" aria-hidden="true">${IC_MATOS[matos]}</span>`;
}

/**
 * Vignette prête à poser dans n'importe quelle liste d'exercices. Une seule
 * apparence partout : catalogue, séance, aperçu, remplacement, alternatives.
 * @param {any} exo
 * @param {string} [cls] modificateur de taille (`sm`)
 */
function vignetteHTML(exo, cls = "") {
  if (!exo) return "";
  return `<span class="exo-vign ${cls}" aria-hidden="true">${vignetteExo(exo)}</span>`;
}

/** Préférence système « moins de mouvement » (lue une fois au démarrage). */
const REDUIRE_MOTION = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || false;

// La démonstration ne se montre qu'une fois RÉELLEMENT chargée, et se retire si
// elle échoue : dans les deux cas la silhouette placée dessous reste visible,
// jamais un carré vide. `load` et `error` ne remontent pas — d'où l'écoute en
// phase de capture, un seul couple d'écouteurs pour toute l'application.
const estVignette = (t) => t && t.tagName === "IMG" && t.classList.contains("exo-gif");
document.addEventListener("load", (ev) => {
  const t = /** @type {any} */ (ev.target);
  if (estVignette(t)) t.classList.add("ok");
}, true);
document.addEventListener("error", (ev) => {
  const t = /** @type {any} */ (ev.target);
  if (estVignette(t)) t.remove();
}, true);

/**
 * Badges des muscles travaillés : principal en accent, secondaires en discret.
 * Un appui explique le rôle de chacun — plus lisible qu'une phrase.
 */
function badgesMuscles(exo) {
  const box = h(`<div class="mbadges"></div>`);
  const princ = (exo.musclesPrincipaux || []).slice(0, 2);
  const sec = (exo.musclesSecondaires || []).slice(0, 2);
  princ.forEach((m) => {
    const b = h(`<button class="mbadge on">${esc(MUSCLE_LABELS[m] || m)}</button>`);
    b.addEventListener("click", (ev) => { ev.stopPropagation(); toast(`${MUSCLE_LABELS[m] || m} — muscle principal`); });
    box.append(b);
  });
  sec.forEach((m) => {
    const b = h(`<button class="mbadge">${esc(MUSCLE_LABELS[m] || m)}</button>`);
    b.addEventListener("click", (ev) => { ev.stopPropagation(); toast(`${MUSCLE_LABELS[m] || m} — muscle secondaire`); });
    box.append(b);
  });
  return box;
}

/**
 * « Machine occupée » : propose immédiatement les meilleures alternatives,
 * classées par compatibilité avec l'état musculaire courant et étiquetées
 * (même muscle, moins de charge lombaire, sur machine…).
 */
function machineOccupee(exerciceId, exo) {
  const seance = trouverSeance(LIVE.seanceId);
  const presents = (seance?.exercices || []).map((x) => x.exerciceId);
  const alts = alternatives(exerciceId, Etat.data.profil, presents);
  const etat = (AUTO && AUTO.etat) || etatMusculaire(Etat.data.logs || [], getExercise, Date.now());

  const sheet = h(`<div class="sheet menu-sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  const fermer = () => sheet.remove();
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0;font-size:1.1rem">Machine occupée</h2><button class="chip" id="oX">✕</button></div>`));
  inner.append(h(`<div class="muted small">Alternatives à « ${esc(exo.nom)} » réalisables avec ton matériel, classées par compatibilité avec ton état actuel.</div>`));

  if (!alts.length) {
    inner.append(h(`<div class="notice small" style="margin-top:12px">Aucune alternative compatible avec ton matériel. Tu peux passer cet exercice ou attendre.</div>`));
  } else {
    const notes = alts.map((a) => ({ a, c: compatibiliteExercice(a.exercice, etat) }))
      .sort((x, y) => y.c.score - x.c.score);
    notes.forEach(({ a, c }) => {
      const row = h(`<button class="card tap alt-row" style="width:100%;text-align:left;margin-top:9px">
        <span class="alt-v">${vignetteExo(a.exercice)}</span>
        <span class="alt-g"><b>${esc(a.exercice.nom)}</b><br><span class="muted small">${esc(a.etiquette)}</span></span>
        <span class="badge ${c.score >= 80 ? "ok" : c.score >= 60 ? "accent" : "amber"}">${c.score} %</span></button>`);
      row.addEventListener("click", () => {
        fermer();
        // Remplacement dans la séance ET dans l'état live, saisies conservées.
        const ex = seance.exercices.find((x) => x.exerciceId === exerciceId);
        if (ex) { ex.exerciceId = a.exercice.id; ex.justification = `Machine occupée — remplacé par ${a.exercice.nom}`; }
        const anc = LIVE.data[exerciceId];
        delete LIVE.data[exerciceId];
        LIVE.data[a.exercice.id] = { ...anc, exId: a.exercice.id };
        persistLive(true);
        toast(`Remplacé par ${a.exercice.nom}`);
        render();
      });
      inner.append(row);
    });
  }
  sheet.querySelector("#oX").addEventListener("click", fermer);
  sheet.addEventListener("click", (ev) => { if (ev.target === sheet) fermer(); });
  document.body.append(sheet);
}

/* ======================================================================
   MOTEUR AUTOMATIQUE — état musculaire et prochaine séance
   Toute la logique vit dans engine/fatigue.js et engine/planner.js (pur,
   testé). Ici on ne fait que brancher : lire l'historique, afficher, et
   convertir la proposition en séance réellement démarrable.
   ====================================================================== */

/** Cache de la proposition, recalculé à chaque rendu de l'accueil. */
let AUTO = null;

/** Exercices réalisables avec le matériel et les limitations de l'utilisateur. */
function catalogueDispo() {
  return CATALOGUE.filter(estRealisable);
}

/** Calcule (ou recalcule) la prochaine séance automatique. */
function calculerAuto(maintenant = Date.now()) {
  const p = Etat.data.profil || {};
  AUTO = genererProchaineSeance(
    Etat.data.logs || [], getExercise, catalogueDispo(),
    { niveau: p.niveau, dureeMin: p.dureeSeanceMin || 60, ressenti: Etat.data.reglages.ressenti || 0 },
    maintenant,
  );
  return AUTO;
}

/**
 * Convertit la proposition du moteur en séance au format de l'application,
 * pour qu'elle soit démarrable, reprenable et enregistrable comme une autre.
 */
function seanceDepuisAuto(gen) {
  const seance = {
    id: "auto-" + Date.now(),
    nom: gen.nom,
    indexJour: 0,
    groupesCibles: [...new Set(gen.muscles.map((m) => FIN_VERS_CATALOGUE[m]).filter(Boolean))],
    exercices: [],
    dureeEstimeeMin: gen.dureeEstimee,
    auto: true,
  };
  for (const x of gen.exercices) {
    const exo = x.exo;
    const enTemps = exo.typeExercice === "gainage" || exo.typeExercice === "cardio";
    const plage = exo.repsPertinent || [8, 12];
    seance.exercices.push({
      exerciceId: exo.id,
      role: x.accessoire ? "isolation" : "principal",
      justification: `Sélectionné automatiquement · compatibilité ${x.score} %`,
      supersetGroupe: null,
      series: Array.from({ length: x.series }, () => ({
        type: "travail",
        repsCible: enTemps ? null : plage,
        dureeSec: enTemps ? (exo.dureeSec || 40) : null,
        distanceM: null, rirCible: 2, rpeCible: null, tempo: null,
        reposSec: x.iso ? 60 : 105, chargeKg: null,
      })),
    });
  }
  return seance;
}

/** Démarre la séance proposée (elle devient la séance en cours). */
function demarrerAuto() {
  if (!AUTO || AUTO.repos || !AUTO.exercices.length) return;
  const seance = seanceDepuisAuto(AUTO);
  // Conservée dans l'état pour que `trouverSeance` la retrouve après un
  // rechargement (reprise de séance) et pour l'enregistrement final.
  Etat.data.seanceAuto = seance;
  Etat.sauver();
  APERCU = null;
  LIVE = nouvelleSession(seance);
  persistLive(true);
  // On bascule explicitement sur l'onglet Séance : `demarrer()` se contente de
  // re-rendre la vue courante, ce qui laissait l'utilisateur sur l'Accueil.
  nav("train");
}

/** Couleur d'une disponibilité, cohérente avec les zones du moteur. */
function couleurDispo(r) {
  if (r >= 90) return "var(--ok)";
  if (r >= 75) return "var(--accent)";
  if (r >= 60) return "var(--amber)";
  if (r >= 40) return "var(--orange)";
  return "var(--danger)";
}

/**
 * Carte « Ton corps » + prochaine séance, sur l'Accueil.
 * C'est le point d'entrée du mode automatique : la séance est DÉJÀ construite.
 */
/**
 * Pastilles de contexte d'un exercice : muscle principal, matériel, famille de
 * mouvement. Uniquement ce qui est réellement connu — pas de pastille vide.
 */
function tagsExercice(exo) {
  const t = [];
  const m = (exo.musclesPrincipaux || [])[0];
  if (m) t.push(`<span class="exo-tag m">${esc(MUSCLE_LABELS[m] || m)}</span>`);
  const eq = (exo.equipement || []).filter((q) => q !== "poids_du_corps")[0] || (exo.equipement || [])[0];
  if (eq) t.push(`<span class="exo-tag">${esc(EQUIPMENT_LABELS[eq] || eq)}</span>`);
  if (exo.typeExercice) t.push(`<span class="exo-tag">${esc(exo.typeExercice)}</span>`);
  return t.join("");
}

/**
 * Carte « Programme actuel » : nom du programme, avancement de la semaine et
 * rythme visé. L'anneau montre les séances faites sur l'objectif hebdomadaire —
 * une vraie mesure, pas un pourcentage décoratif.
 */
function carteProgrammeActuel(prog, logs, profil) {
  const cible = Math.max(1, profil?.joursParSemaine || 4);
  const sm = statsSemaine(logs);
  const pct = Math.min(1, sm.seances / cible);
  const c = h(`<button class="card prog-actuel" aria-label="Voir le programme"></button>`);
  c.append(h(`<span class="pa-txt">
    <span class="eyebrow">Programme actuel</span>
    <b class="pa-nom">${esc(prog?.nom || "Aucun programme")}</b>
    <span class="pa-meta">${cible} séance${cible > 1 ? "s" : ""} / semaine · ${sm.seances} faite${sm.seances > 1 ? "s" : ""}</span>
  </span>`));
  c.append(h(`<span class="pa-ring">${anneauSVG(pct, 74, `${Math.round(pct * 100)}%`)}</span>`));
  c.addEventListener("click", () => nav("prog"));
  return c;
}

/**
 * Grille « mes chiffres » de l'accueil : séances, tonnage, régularité, records.
 * La régularité compare les séances des 4 dernières semaines à l'objectif
 * hebdomadaire du profil — pas une note arbitraire.
 */
function grilleChiffres(logs) {
  const g = h(`<div class="statgrid"></div>`);
  const nb = logs.length;
  const tonnes = volumeTotal(logs) / 1000;
  const volTxt = tonnes >= 1 ? `${tonnes.toFixed(1).replace(".", ",")} T` : `${Math.round(volumeTotal(logs))} kg`;
  const cible = Math.max(1, (Etat.data.profil?.joursParSemaine || 4) * 4);
  const recentes = logs.filter((l) => Date.parse(l.date) > Date.now() - 28 * 864e5).length;
  const regularite = Math.min(100, Math.round((recentes / cible) * 100));
  const records = classementRecords(logs, nomExo, 99).length;
  g.append(statCard(IC.dumbbell, String(nb), "Séances"));
  g.append(statCard(IC.bars, volTxt, "Volume"));
  g.append(statCard(IC.activity, `${regularite} %`, "Régularité"));
  g.append(statCard(IC.trophy, String(records), "Records"));
  return g;
}

/** Groupes visibles de face / de dos dans les silhouettes anatomiques. */
const GROUPES_FACE = ["pectoraux", "abdominaux", "biceps", "triceps", "trapezes", "epaules", "quadriceps", "mollets", "avant_bras"];

/**
 * Silhouette orientée selon les muscles ciblés : une séance de dos affichée de
 * face ne surlignerait rien du tout.
 */
function silhouetteAuto(muscles) {
  const face = (muscles || []).filter((m) => GROUPES_FACE.includes(m)).length;
  return miniSilhouette(muscles, face >= (muscles || []).length - face ? "front" : "back");
}

/**
 * Sous-titre de la carte héro. Le moteur nomme souvent la séance par ses
 * muscles ; répéter la même liste juste en dessous n'apprend rien. On affiche
 * alors la durée et le nombre d'exercices, information réellement nouvelle.
 */
function sousTitreHero(nom, muscles) {
  const liste = muscles.slice(0, 3).join(" • ");
  const norm = (x) => x.toLowerCase().replace(/[^a-zà-ÿ]/g, "");
  if (!liste || norm(liste) === norm(nom || "")) return "Choisie d'après ta récupération";
  return liste;
}

function carteMoteur(v) {
  const logs = Etat.data.logs || [];
  const gen = calculerAuto();
  const res = resumeCorps(gen.etat);

  const c = h(`<div class="card stack moteur hero"></div>`);
  // Le résumé du corps a sa PROPRE carte, placée sous la séance : la carte du
  // jour commence par la séance elle-même, comme la maquette. Rien n'est retiré,
  // l'état musculaire reste accessible d'un seul tap.
  const corps = h(`<button class="card corps-resume" aria-label="Voir l'état musculaire"></button>`);
  corps.append(h(`<span class="spread moteur-head"><span class="eyebrow">Ton corps</span><span class="chev">État musculaire ›</span></span>`));
  const tri = h(`<div class="moteur-tri"></div>`);
  tri.append(h(`<span><b class="num" style="color:var(--accent)">${res.prets}</b><span>prêts</span></span>`));
  tri.append(h(`<span><b class="num" style="color:var(--amber)">${res.recup}</b><span>en récup.</span></span>`));
  tri.append(h(`<span><b class="num" style="color:var(--danger)">${res.sollicites}</b><span>sollicités</span></span>`));
  corps.append(tri);
  corps.addEventListener("click", () => ouvrirEtatMusculaire());

  if (gen.repos) {
    c.append(h(`<div class="eyebrow">Aujourd'hui</div>`));
    c.append(h(`<h2 style="margin:2px 0 4px;font-size:1.25rem">Repos conseillé</h2>`));
    c.append(h(`<div class="muted small">${esc(gen.raison)}</div>`));
    const b = h(`<button class="secondary big" style="margin-top:10px"><span class="btn-ico">${IC.play}</span>S'entraîner quand même</button>`);
    b.addEventListener("click", () => { LIVE = null; APERCU = null; nav("train"); });
    c.append(b);
  } else {
    // Composition « séance du jour » : badge, titre fort, muscles ciblés,
    // trois chiffres, et la silhouette des groupes visés en fond discret.
    const muscles = (gen.muscles || []).map((m) => LABELS_MOTEUR[m] || m);
    const nbSeries = gen.exercices.reduce((n, x) => n + (x.series || 0), 0);
    const hero = h(`<div class="hero-seance">
      <div class="hero-fig" aria-hidden="true">${silhouetteAuto((gen.muscles || []).map((m) => FIN_VERS_CATALOGUE[m]).filter(Boolean))}</div>
      <div class="hero-top"><span class="tagline">Séance du jour</span><span class="badge accent">${gen.compatibilite} % compatible</span></div>
      <div class="hero-corps">
        <h2 class="hero-titre">${esc(gen.nom)}</h2>
        <div class="hero-sub">${esc(sousTitreHero(gen.nom, muscles))}</div>
        <div class="hero-chiffres">
          <span><b class="num">${gen.exercices.length}</b><span>Exercices</span></span>
          <span><b class="num">${nbSeries}</b><span>Séries</span></span>
          <span><b class="num">${gen.dureeEstimee}</b><span>Min</span></span>
        </div>
      </div>
    </div>`);
    c.append(hero);
    const b = h(`<button class="primary big hero-cta"><span class="btn-ico">${IC.play}</span>Commencer la séance</button>`);
    b.addEventListener("click", demarrerAuto);
    c.append(b);
    const bMod = h(`<button class="linklike" style="margin-top:9px">Pourquoi cette séance ? · Modifier</button>`);
    bMod.addEventListener("click", () => ouvrirDetailAuto(gen));
    c.append(bMod);
  }
  v.append(c);
  v.append(corps);
}

/** Feuille : justification de la décision + possibilité de modifier. */
function ouvrirDetailAuto(gen) {
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">${esc(gen.nom)}</h2><button class="chip" id="aX">✕ Fermer</button></div>`));
  inner.append(h(`<div class="row" style="margin:6px 0 12px"><span class="badge accent">${gen.compatibilite} % compatible</span><span class="pill">~${gen.dureeEstimee} min</span><span class="pill">${gen.exercices.length} exercices</span></div>`));

  inner.append(h(`<div class="eyebrow">Pourquoi cette séance ?</div>`));
  const why = h(`<div class="card stack" style="margin:8px 0 14px"></div>`);
  gen.explications.forEach((e) => why.append(h(`<div class="small">• ${esc(e)}</div>`)));
  inner.append(why);

  if (gen.exercices.length) {
    inner.append(h(`<div class="eyebrow" style="margin-bottom:8px">Exercices retenus</div>`));
    gen.exercices.forEach((x, i) => {
      const cibles = Object.entries(x.coeffs).sort((a, b) => b[1] - a[1]).slice(0, 3)
        .map(([m, v2]) => `${LABELS_MOTEUR[m]} ${Math.round(v2 * 100)} %`).join(" · ");
      const row = h(`<div class="card tap" style="padding:11px;margin-bottom:8px">
        <div class="row" style="gap:10px;align-items:flex-start">${vignetteHTML(x.exo, "sm")}
        <div style="flex:1;min-width:0">
        <div class="spread"><b>${i + 1}. ${esc(x.exo.nom)}</b><span class="pill">${x.series} séries</span></div>
        <div class="muted small" style="margin-top:3px">${esc(cibles)}</div>
        <div class="muted small">Compatibilité ${x.score} %${x.accessoire ? " · accessoire" : ""}</div></div></div></div>`);
      row.addEventListener("click", () => ouvrirDetail(x.exo));
      inner.append(row);
    });
    const b = h(`<button class="primary big" style="margin-top:6px"><span class="btn-ico">${IC.play}</span>Commencer cette séance</button>`);
    b.addEventListener("click", () => { sheet.remove(); demarrerAuto(); });
    inner.append(b);
    const bm = h(`<button class="secondary big" style="margin-top:8px">Choisir une autre séance</button>`);
    bm.addEventListener("click", () => { sheet.remove(); LIVE = null; APERCU = null; nav("train"); });
    inner.append(bm);
  }
  sheet.querySelector("#aX").addEventListener("click", () => sheet.remove());
  document.body.append(sheet);
}

/** Fiche d'un muscle : disponibilité, dernière sollicitation, volume. */
function detailMuscle(cle, etat, profil) {
  const m = etat[cle];
  if (!m) return;
  const z = zoneDisponibilite(m.readiness);
  const cible = cibleVolumeHebdo(cle, profil.niveau || "intermediaire", DEF_MOTEUR);
  const dernier = m.lastDirectTraining || m.lastIndirectTraining;
  const jours = dernier ? (Date.now() - dernier) / 864e5 : null;
  const quand = jours == null ? "jamais" : jours < 1 ? "aujourd'hui" : jours < 2 ? "hier" : `il y a ${Math.round(jours)} jours`;
  const sheet = h(`<div class="sheet menu-sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0;font-size:1.15rem">${esc(LABELS_MOTEUR[cle])}</h2><button class="chip" id="dmX">✕</button></div>`));
  inner.append(h(`<div class="out-big"><b class="num" style="color:${couleurDispo(m.readiness)}">${Math.round(m.readiness)} %</b><span>Disponibilité estimée · ${esc(z.nom)}</span></div>`));
  inner.append(h(`<div class="bar" style="margin-bottom:14px"><div style="width:${Math.round(m.readiness)}%;background:${couleurDispo(m.readiness)}"></div></div>`));
  const g = h(`<div class="statgrid"></div>`);
  g.append(statCard(IC.calendar, quand, "Dernière sollicitation"));
  g.append(statCard(IC.bars, `${m.weeklyEquivalentSets}`, `Séries / ${cible}`));
  g.append(statCard(IC.dumbbell, `${m.weeklyDirectSets}`, "Dont directes"));
  g.append(statCard(IC.repeat, `${m.weeklyIndirectSets}`, "Indirectes"));
  inner.append(g);
  inner.append(h(`<div class="hint">Disponibilité et récupération sont des <b>estimations de programmation</b> calculées depuis tes séances (volume, proximité de l'échec, temps écoulé). Ce ne sont pas des mesures physiologiques.</div>`));
  sheet.querySelector("#dmX").addEventListener("click", () => sheet.remove());
  sheet.addEventListener("click", (ev) => { if (ev.target === sheet) sheet.remove(); });
  document.body.append(sheet);
}

/** Écran « État musculaire » : les 18 groupes, barres + silhouettes. */
function ouvrirEtatMusculaire() {
  const gen = AUTO || calculerAuto();
  const etat = gen.etat;
  const p = Etat.data.profil || {};
  const sheet = h(`<div class="sheet"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">État musculaire</h2><button class="chip" id="eX">✕ Fermer</button></div>`));
  inner.append(h(`<div class="muted small">Indices de disponibilité estimés à partir de tes séances : volume, proximité de l'échec et temps écoulé. Ce ne sont pas des mesures physiologiques.</div>`));

  // Silhouettes colorées par disponibilité (la plus basse d'un groupe l'emporte)
  const parCat = {};
  for (const cle of CLES_MOTEUR) {
    const cat = FIN_VERS_CATALOGUE[cle];
    if (!cat) continue;
    parCat[cat] = Math.min(parCat[cat] ?? 100, etat[cle].readiness);
  }
  /** @type {Record<string, number>} */
  const intensites = {};
  for (const [cat, r] of Object.entries(parCat)) intensites[cat] = (100 - r) / 100;
  const carte = h(`<div class="card sil-inter" style="margin:12px 0">${muscleHeatmap(intensites)}
    <div class="muted small" style="text-align:center;margin-top:6px">Touche un muscle pour voir son état</div></div>`);
  // Silhouette INTERACTIVE : chaque groupe du SVG porte son identifiant, on
  // remonte au groupe fin le plus sollicité pour ouvrir son détail.
  carte.addEventListener("click", (ev) => {
    const g = ev.target.closest("g[data-m]");
    if (!g) return;
    const cat = g.getAttribute("data-m");
    const fins = CLES_MOTEUR.filter((c) => FIN_VERS_CATALOGUE[c] === cat);
    if (!fins.length) return;
    const pire = fins.sort((a, b) => etat[a].readiness - etat[b].readiness)[0];
    detailMuscle(pire, etat, p);
  });
  inner.append(carte);

  // Liste triée par disponibilité croissante : ce qui récupère en premier
  const rows = CLES_MOTEUR.map((cle) => ({ cle, ...etat[cle] })).sort((a, b) => a.readiness - b.readiness);
  const liste = h(`<div class="card stack"></div>`);
  rows.forEach((m) => {
    const z = zoneDisponibilite(m.readiness);
    const cible = cibleVolumeHebdo(m.cle, p.niveau || "intermediaire", DEF_MOTEUR);
    const row = h(`<div class="msc-row">
      <div class="spread small"><b>${esc(LABELS_MOTEUR[m.cle])}</b><span class="num" style="color:${couleurDispo(m.readiness)};font-weight:800">${Math.round(m.readiness)} %</span></div>
      <div class="bar msc-bar"><div style="width:${Math.round(m.readiness)}%;background:${couleurDispo(m.readiness)}"></div></div>
      <div class="spread muted" style="font-size:.7rem;margin-top:3px"><span>${esc(z.nom)}</span><span>${m.weeklyEquivalentSets}/${cible} séries cette semaine</span></div>
    </div>`);
    row.classList.add("tap");
    row.addEventListener("click", () => detailMuscle(m.cle, etat, p));
    liste.append(row);
  });
  inner.append(liste);

  // Classement des priorités : ce que le moteur entraînerait ensuite
  inner.append(h(`<div class="eyebrow" style="margin:16px 0 8px">Priorités du moteur</div>`));
  const prio = h(`<div class="card stack"></div>`);
  gen.classement.slice(0, 8).forEach((l, i) => {
    prio.append(h(`<div class="spread small"><span><span class="anat-num">${i + 1}</span>${esc(l.nom)}</span><span class="muted">${l.priority} pts · ${Math.round(l.readiness)} % dispo</span></div>`));
  });
  inner.append(prio);
  inner.append(h(`<div class="hint">La priorité combine disponibilité (45 %), déficit de volume hebdomadaire (30 %), ancienneté de la dernière sollicitation (15 %) et équilibre général (10 %).</div>`));

  // Ce que le moteur a APPRIS de l'historique. Affiché systématiquement, même
  // quand il n'a encore rien appris : une correction invisible sur un modèle
  // qu'on ne peut pas inspecter ne serait pas acceptable.
  inner.append(h(`<div class="eyebrow" style="margin:16px 0 8px">Calibration apprise</div>`));
  const appris = expliquerApprentissage(Etat.data.logs || [], getExercise, Date.now());
  const cApp = h(`<div class="card stack"></div>`);
  if (!appris.length) {
    cApp.append(h(`<div class="muted small">Le moteur utilise ses valeurs génériques. Il ajustera la vitesse de récupération muscle par muscle dès qu'il aura observé assez de retours rapprochés sur un même exercice (${PARAMS_APPRENTISSAGE.MIN_OBS} minimum).</div>`));
  } else {
    cApp.append(h(`<div class="muted small">Ajustements déduits de tes performances quand tu reviens sur un muscle en moins de ${PARAMS_APPRENTISSAGE.SEUIL_COURT_H} h.</div>`));
    appris.forEach((a) => {
      const pct = Math.round(Math.abs(a.facteur - 1) * 100);
      cApp.append(h(`<div class="spread small" style="margin-top:6px">
        <span><b>${esc(LABELS_MOTEUR[a.muscle] || a.muscle)}</b> · récupération ${esc(a.sens)}</span>
        <span class="muted">${a.facteur > 1 ? "+" : "−"}${pct} % · ${a.n} obs.</span></div>`));
    });
  }
  inner.append(cApp);

  sheet.querySelector("#eX").addEventListener("click", () => sheet.remove());
  document.body.append(sheet);
}

/* ======================================================================
   OUTILS DE CALCUL (FC cible, morphotype, durée de séance, max estimé,
   composition corporelle, test cardio vélo). Tout est déterministe et local.
   ====================================================================== */

/** Champ numérique compact réutilisé par les outils. */
function champNum(label, valeur, onChange, opts = {}) {
  const w = h(`<label class="out-field"><span>${esc(label)}</span><input inputmode="${opts.decimal ? "decimal" : "numeric"}" value="${valeur ?? ""}" placeholder="${opts.ph ?? ""}" aria-label="${esc(label)}"></label>`);
  w.querySelector("input").addEventListener("input", (e) => onChange(e.target.value));
  return w;
}

/** Feuille « Outils » : une liste d'outils, chacun dépliable. */
function ouvrirOutils(cleInitiale = null) {
  const sheet = h(`<div class="sheet" id="outils"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">Outils</h2><button class="chip" id="outX">✕ Fermer</button></div>`));
  inner.append(h(`<div class="muted small">Calculatrices d'entraînement, à partir de tes données. Tout est calculé sur ton téléphone.</div>`));

  const OUTILS = [
    { cle: "fc", nom: "Fréquence cardiaque cible", sous: "Zones d'effort selon ton âge et ton pouls de repos", ic: IC.activity, cls: "mi-red", vue: outilFC },
    { cle: "morpho", nom: "Macros par morphotype", sous: "Protéines, glucides et lipides selon ta morphologie", ic: IC.apple, cls: "mi-green", vue: outilMorphotype },
    { cle: "duree", nom: "Durée d'une séance", sous: "Estime le temps réel d'une séance avant de la faire", ic: IC.clock, cls: "mi-blue", vue: outilDuree },
    { cle: "max", nom: "Estimation du maximum", sous: "Ton 1RM à partir d'une série réalisée", ic: IC.dumbbell, cls: "mi-indigo", vue: outilMax },
    { cle: "compo", nom: "Composition corporelle", sous: "Masse grasse et masse maigre, avec ou sans balance", ic: IC.user, cls: "mi-orange", vue: outilComposition },
    { cle: "velo", nom: "Test cardio vélo", sous: "Protocole à paliers, à refaire chaque mois", ic: IC.bars, cls: "mi-blue", vue: outilTestVelo },
  ];

  const liste = h(`<div class="stack" style="margin-top:12px"></div>`);
  inner.append(liste);
  const panneau = h(`<div id="outPanneau"></div>`);
  inner.append(panneau);

  const ouvrir = (o) => {
    panneau.innerHTML = "";
    liste.querySelectorAll(".out-item").forEach((b) => b.classList.toggle("on", b.dataset.k === o.cle));
    const c = h(`<div class="card stack" style="margin-top:12px"></div>`);
    c.append(h(`<h3 style="margin:0">${esc(o.nom)}</h3>`));
    c.append(o.vue());
    panneau.append(c);
    panneau.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };
  OUTILS.forEach((o) => {
    const b = h(`<button class="card wcard sil out-item" data-k="${o.cle}" style="width:100%;text-align:left"><span class="mi ${o.cls}" style="width:34px;height:34px">${o.ic}</span><span class="g"><b>${esc(o.nom)}</b><br><span class="muted small">${esc(o.sous)}</span></span><span class="chev">›</span></button>`);
    b.addEventListener("click", () => ouvrir(o));
    liste.append(b);
  });

  sheet.querySelector("#outX").addEventListener("click", () => sheet.remove());
  document.body.append(sheet);
  const dep = OUTILS.find((o) => o.cle === cleInitiale);
  if (dep) ouvrir(dep);
}

/* ---------- 1. Fréquence cardiaque cible ---------- */
function outilFC() {
  const p = Etat.data.profil || {};
  const st = { age: p.age || 30, repos: Etat.data.reglages.fcRepos || 60 };
  const box = h(`<div class="stack"></div>`);
  const res = h(`<div class="stack"></div>`);
  const ligne = h(`<div class="out-row"></div>`);
  const maj = () => {
    const fcMax = fcMaxTheorique(st.age);
    res.innerHTML = "";
    res.append(h(`<div class="spread small"><span class="muted">FC maximale théorique</span><b class="num">${fcMax} bpm</b></div>`));
    const zones = tableZonesCardio(fcMax, st.repos > 0 ? st.repos : null);
    zones.forEach((z) => {
      res.append(h(`<div class="zone-row"><div class="spread small"><b>${esc(z.nom)}</b><span class="num" style="color:var(--accent-ink)">${z.bpmMin}–${z.bpmMax} bpm</span></div><div class="muted small">${z.min}–${z.max} % · ${esc(z.effet)}</div></div>`));
    });
    res.append(h(`<div class="muted small" style="margin-top:6px">${st.repos > 0 ? "Calcul par la formule de Karvonen (tient compte de ton pouls de repos)." : "Renseigne ton pouls de repos pour un calcul plus précis (Karvonen)."}</div>`));
  };
  ligne.append(champNum("Âge", st.age, (v) => { st.age = +v || 0; maj(); }));
  ligne.append(champNum("Pouls au repos", st.repos, (v) => {
    st.repos = +v || 0; Etat.data.reglages.fcRepos = st.repos; Etat.sauver(); maj();
  }, { ph: "60" }));
  box.append(ligne);
  box.append(h(`<div class="muted small">Mesure ton pouls de repos le matin au réveil, avant de te lever.</div>`));
  box.append(res);
  maj();
  return box;
}

/* ---------- 2. Macros par morphotype ---------- */
function outilMorphotype() {
  const p = Etat.data.profil || {};
  /** @type {{poids:number, morpho:string, objectif:"prise_masse"|"seche"}} */
  const st = { poids: p.poidsKg || 75, morpho: Etat.data.reglages.morphotype || "mesomorphe", objectif: "prise_masse" };
  const box = h(`<div class="stack"></div>`);
  const res = h(`<div class="stack"></div>`);
  const maj = () => {
    res.innerHTML = "";
    const table = tableMorphotypes(st.poids, st.objectif);
    table.forEach((m) => {
      const actif = m.cle === st.morpho;
      const c = h(`<div class="card ${actif ? "morpho-on" : ""}" style="padding:11px"></div>`);
      c.append(h(`<div class="spread"><b>${esc(m.nom)}</b><span class="badge ${actif ? "accent" : ""}">${m.kcal} kcal</span></div>`));
      c.append(h(`<div class="muted small" style="margin:2px 0 6px">${esc(m.desc)}</div>`));
      c.append(h(`<div class="out-macros"><span><b>${m.prot} g</b><span>Protéines</span></span><span><b>${m.gluc} g</b><span>Glucides</span></span><span><b>${m.lip} g</b><span>Lipides</span></span></div>`));
      c.addEventListener("click", () => { st.morpho = m.cle; Etat.data.reglages.morphotype = m.cle; Etat.sauver(); maj(); });
      res.append(c);
    });
  };
  const ligne = h(`<div class="out-row"></div>`);
  ligne.append(champNum("Poids (kg)", st.poids, (v) => { st.poids = +v || 0; maj(); }, { decimal: true }));
  box.append(ligne);
  const objs = h(`<div class="row"></div>`);
  /** @type {["prise_masse"|"seche", string][]} */
  const OBJECTIFS_MACROS = [["prise_masse", "Prise de masse"], ["seche", "Sèche"]];
  OBJECTIFS_MACROS.forEach(([k, lab]) => {
    const b = h(`<button class="chip ${st.objectif === k ? "on" : ""}">${lab}</button>`);
    b.addEventListener("click", () => {
      st.objectif = k;
      objs.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on"); maj();
    });
    objs.append(b);
  });
  box.append(objs);
  box.append(h(`<div class="muted small">Touche un morphotype pour le retenir. Repères en grammes par kilo de poids de corps — à ajuster selon tes résultats réels.</div>`));
  box.append(res);
  maj();
  return box;
}

/* ---------- 3. Durée d'une séance ---------- */
function outilDuree() {
  const lignes = [{ series: 4, reps: 10, reposSec: 90 }];
  const box = h(`<div class="stack"></div>`);
  const liste = h(`<div class="stack"></div>`);
  const res = h(`<div class="statgrid"></div>`);
  const maj = () => {
    liste.innerHTML = "";
    lignes.forEach((l, i) => {
      const r = h(`<div class="out-row out-line"></div>`);
      r.append(champNum("Séries", l.series, (v) => { l.series = +v || 0; maj(); }));
      r.append(champNum("Reps", l.reps, (v) => { l.reps = +v || 0; maj(); }));
      r.append(champNum("Repos (s)", l.reposSec, (v) => { l.reposSec = +v || 0; maj(); }));
      if (lignes.length > 1) {
        const d = h(`<button class="chip danger out-del" aria-label="Retirer l'exercice ${i + 1}">✕</button>`);
        d.addEventListener("click", () => { lignes.splice(i, 1); maj(); });
        r.append(d);
      }
      liste.append(r);
    });
    const t = dureeSeance(lignes);
    res.innerHTML = "";
    res.append(statCard(IC.clock, `${t.totalMin} min`, "Durée totale"));
    res.append(statCard(IC.dumbbell, `${t.series}`, "Séries"));
    res.append(statCard(IC.repeat, `${t.reps}`, "Répétitions"));
    res.append(statCard(IC.moon, `${Math.round(t.reposSec / 60)} min`, "Dont repos"));
  };
  box.append(h(`<div class="muted small">Une ligne par exercice. L'effort est estimé à 3 secondes par répétition.</div>`));
  box.append(liste);
  const bAdd = h(`<button class="chip"><span class="cic">${IC.plus}</span>Ajouter un exercice</button>`);
  bAdd.addEventListener("click", () => { lignes.push({ series: 3, reps: 10, reposSec: 90 }); maj(); });
  box.append(bAdd);
  box.append(res);
  maj();
  return box;
}

/* ---------- 4. Estimation du maximum ---------- */
function outilMax() {
  const st = { charge: 60, reps: 8 };
  const box = h(`<div class="stack"></div>`);
  const res = h(`<div class="stack"></div>`);
  const maj = () => {
    const m = maxDepuisSerie(st.charge, st.reps);
    res.innerHTML = "";
    res.append(h(`<div class="out-big"><b class="num">${m.max} kg</b><span>Maximum estimé (1RM)</span></div>`));
    res.append(h(`<div class="muted small">${st.reps} répétition${st.reps > 1 ? "s" : ""} à ${st.charge} kg ≈ ${m.pct} % de ton maximum.</div>`));
    const tbl = h(`<div class="stack" style="margin-top:6px"></div>`);
    tbl.append(h(`<div class="eyebrow">Charges de travail</div>`));
    [95, 90, 85, 80, 75, 70, 60].forEach((pct) => {
      tbl.append(h(`<div class="spread small"><span class="muted">${pct} %</span><b class="num">${Math.round(m.max * pct / 100 * 2) / 2} kg</b></div>`));
    });
    res.append(tbl);
    const g = h(`<div class="stack" style="margin-top:6px"></div>`);
    g.append(h(`<div class="eyebrow">Si tu fais ${st.reps} reps avec…</div>`));
    grilleMax([20, 30, 40, 50, 60, 80, 100], st.reps).forEach((x) => {
      g.append(h(`<div class="spread small"><span class="muted">${x.charge} kg</span><b class="num">max ≈ ${x.max} kg</b></div>`));
    });
    res.append(g);
  };
  const ligne = h(`<div class="out-row"></div>`);
  ligne.append(champNum("Charge (kg)", st.charge, (v) => { st.charge = +v || 0; maj(); }, { decimal: true }));
  ligne.append(champNum("Répétitions", st.reps, (v) => { st.reps = +v || 0; maj(); }));
  box.append(ligne);
  box.append(h(`<div class="warn small">Estimation à partir d'une série menée près de l'échec. Ne teste jamais un maximum réel sans échauffement complet ni parade.</div>`));
  box.append(res);
  maj();
  return box;
}

/* ---------- 5. Composition corporelle ---------- */
function outilComposition() {
  const p = Etat.data.profil || {};
  const r = Etat.data.reglages;
  const st = {
    poids: p.poidsKg || 75, sexe: p.sexe || "H",
    adipo: p.masseGrassePct || null,
    tailleCm: p.tailleCm || 175,
    tourTaille: r.tourTailleCm || null, tourCou: r.tourCouCm || null, tourHanches: r.tourHanchesCm || null,
  };
  const box = h(`<div class="stack"></div>`);
  const res = h(`<div class="stack"></div>`);
  const maj = () => {
    res.innerHTML = "";
    const estime = adipositeNavy(st.sexe, {
      tailleCm: st.tailleCm, tourTailleCm: st.tourTaille, tourCouCm: st.tourCou, tourHanchesCm: st.tourHanches,
    });
    const pct = st.adipo || estime;
    if (pct == null) {
      res.append(h(`<div class="muted small">Renseigne soit ton taux d'adiposité (balance à impédance), soit tes tours de taille et de cou pour l'estimer.</div>`));
      return;
    }
    const c = composition(st.poids, pct);
    const cat = categorieAdiposite(pct, st.sexe);
    res.append(h(`<div class="out-big"><b class="num" style="color:${cat.col}">${pct} %</b><span>Taux d'adiposité · ${esc(cat.txt)}</span></div>`));
    const g = h(`<div class="statgrid"></div>`);
    g.append(statCard(IC.flame, `${c.masseGrasseKg} kg`, "Masse grasse"));
    g.append(statCard(IC.dumbbell, `${c.masseMaigreKg} kg`, "Masse maigre"));
    res.append(g);
    if (!st.adipo && estime != null) res.append(h(`<div class="muted small">Estimé par la méthode des circonférences (US Navy). Une balance à impédance donne une valeur plus stable dans le temps.</div>`));
    res.append(h(`<div class="muted small">Repères indicatifs, sans valeur médicale. Ce qui compte est l'évolution, pas la valeur absolue.</div>`));
  };
  box.append(h(`<div class="eyebrow">Si tu connais ton taux</div>`));
  const l1 = h(`<div class="out-row"></div>`);
  l1.append(champNum("Poids (kg)", st.poids, (v) => { st.poids = +v || 0; maj(); }, { decimal: true }));
  l1.append(champNum("Adiposité (%)", st.adipo, (v) => { st.adipo = v === "" ? null : +v; maj(); }, { decimal: true, ph: "—" }));
  box.append(l1);
  box.append(h(`<div class="eyebrow" style="margin-top:6px">Sinon, estime-le par tes mesures</div>`));
  const l2 = h(`<div class="out-row"></div>`);
  l2.append(champNum("Taille (cm)", st.tailleCm, (v) => { st.tailleCm = +v || 0; maj(); }));
  l2.append(champNum("Tour de taille", st.tourTaille, (v) => {
    st.tourTaille = v === "" ? null : +v; r.tourTailleCm = st.tourTaille; Etat.sauver(); maj();
  }, { ph: "cm" }));
  box.append(l2);
  const l3 = h(`<div class="out-row"></div>`);
  l3.append(champNum("Tour de cou", st.tourCou, (v) => {
    st.tourCou = v === "" ? null : +v; r.tourCouCm = st.tourCou; Etat.sauver(); maj();
  }, { ph: "cm" }));
  if (st.sexe === "F") {
    l3.append(champNum("Tour de hanches", st.tourHanches, (v) => {
      st.tourHanches = v === "" ? null : +v; r.tourHanchesCm = st.tourHanches; Etat.sauver(); maj();
    }, { ph: "cm" }));
  }
  box.append(l3);
  box.append(res);
  maj();
  return box;
}

/* ---------- 6. Test cardio vélo ---------- */
function outilTestVelo() {
  const st = { cle: Etat.data.reglages.testVeloNiveau || "debutant" };
  const box = h(`<div class="stack"></div>`);
  const corps = h(`<div class="stack"></div>`);
  const maj = () => {
    const proto = testVeloParCle(st.cle);
    const historique = (Etat.data.testsVelo || []).filter((t) => t.cle === st.cle);
    corps.innerHTML = "";
    corps.append(h(`<div class="muted small">Protocole de ${proto.dureeMin} minutes. Relève ton pouls à la fin de chaque palier marqué. Refais le test une fois par mois : <b>moins de pulsations au même effort = tu progresses</b>.</div>`));
    const saisie = [];
    proto.paliers.forEach((pa, i) => {
      const row = h(`<div class="velo-row"></div>`);
      row.append(h(`<span class="velo-t"><b>${esc(pa.nom)}</b><br><span class="muted small">${pa.min} min · niveau ${pa.niveau} · ${esc(pa.rpm)} RPM</span></span>`));
      if (pa.releve) {
        const inp = h(`<input class="velo-in" inputmode="numeric" placeholder="bpm" aria-label="Pouls ${pa.nom}">`);
        saisie.push({ i, inp });
        row.append(inp);
      } else row.append(h(`<span class="muted small">—</span>`));
      corps.append(row);
    });
    const bSave = h(`<button class="primary big" style="margin-top:8px">Enregistrer ce test</button>`);
    bSave.addEventListener("click", () => {
      const pouls = saisie.map((s) => +s.inp.value || 0);
      if (!pouls.some((x) => x > 0)) { toast("Saisis au moins une valeur de pouls."); return; }
      (Etat.data.testsVelo ||= []).push({ id: Etat.uid(), cle: st.cle, date: new Date().toISOString(), pouls });
      Etat.sauver(); toast("Test enregistré 📈"); maj();
    });
    corps.append(bSave);
    if (historique.length) {
      corps.append(h(`<div class="eyebrow" style="margin-top:10px">Tes tests</div>`));
      historique.slice().reverse().forEach((t, idx, arr) => {
        const d = new Date(t.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
        const moy = Math.round(t.pouls.filter((x) => x > 0).reduce((a, x) => a + x, 0) / Math.max(1, t.pouls.filter((x) => x > 0).length));
        const prec = arr[idx + 1];
        const cmp = prec ? comparerTestsVelo(prec.pouls, t.pouls) : null;
        const tag = cmp ? `<span class="badge ${cmp.ameliore ? "ok" : "amber"}">${cmp.delta > 0 ? "+" : ""}${cmp.delta} bpm</span>` : "";
        const r = h(`<div class="spread small" style="padding:7px 0;border-bottom:1px solid var(--line)"><span>${d}<br><span class="muted">${t.pouls.filter((x) => x > 0).join(" · ")} bpm</span></span><span>${tag} <b class="num">${moy}</b></span></div>`);
        corps.append(r);
      });
      const bDel = h(`<button class="chip danger" style="margin-top:8px">Effacer l'historique de ce test</button>`);
      bDel.addEventListener("click", async () => {
        if (!await confirmer("Effacer tous les tests enregistrés pour ce niveau ?", { danger: true, ok: "Effacer" })) return;
        Etat.data.testsVelo = (Etat.data.testsVelo || []).filter((t) => t.cle !== st.cle);
        Etat.sauver(); maj();
      });
      corps.append(bDel);
    }
  };
  const niv = h(`<div class="row"></div>`);
  TESTS_VELO.forEach((t) => {
    const b = h(`<button class="chip ${st.cle === t.cle ? "on" : ""}">${esc(t.nom)}</button>`);
    b.addEventListener("click", () => {
      st.cle = t.cle; Etat.data.reglages.testVeloNiveau = t.cle; Etat.sauver();
      niv.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
      b.classList.add("on"); maj();
    });
    niv.append(b);
  });
  box.append(niv, corps);
  maj();
  return box;
}

/* ======================================================================
   COACH — assistant DÉTERMINISTE (réponses issues du moteur de l'app)
   + mode « Coach IA » FACULTATIF (Transformers.js, désactivé par défaut).
   ====================================================================== */

/** Exemples de questions proposés à l'utilisateur (aussi utiles que l'aide). */
const COACH_EXEMPLES = [
  "Par quoi remplacer les tractions ?",
  "Quelle séance aujourd'hui ?",
  "Combien de protéines par jour ?",
  "Des exercices pour les épaules",
  "Combien de repos entre les séries ?",
  "Mes records",
];

/**
 * Résumé FACTUEL de l'utilisateur, injecté dans le prompt du mode IA. Ne
 * contient que des données déjà présentes dans l'app (jamais envoyées ailleurs :
 * l'inférence est locale).
 */
function contexteUtilisateur() {
  const p = Etat.data.profil || {};
  const b = calculerBesoins(p);
  const sj = seanceDuJour(Etat.data.programme);
  const logs = Etat.data.logs || [];
  const l = [];
  l.push(`Prénom : ${p.prenom || "—"}, niveau : ${LEVEL_LABELS[p.niveau] || p.niveau}, objectif : ${GOAL_LABELS[p.objectif] || p.objectif}.`);
  l.push(`Entraînement : ${p.joursParSemaine} jours/semaine, ${p.dureeSeanceMin} min par séance.`);
  l.push(`Matériel disponible : ${(p.equipements || []).map((e) => EQUIPMENT_LABELS[e] || e).join(", ") || "aucun"}.`);
  if (b) l.push(`Besoins quotidiens calculés : ${b.kcal} kcal, ${b.prot} g de protéines, ${b.lip} g de lipides, ${b.gluc} g de glucides, ${b.eau} L d'eau.`);
  l.push(sj ? `Séance prévue aujourd'hui : ${sj.nom} (${sj.exercices.length} exercices).` : "Aujourd'hui : jour de repos.");
  l.push(`Séances enregistrées au total : ${logs.length}. Série en cours : ${serieActuelle(logs)} jour(s).`);
  return l.join("\n");
}

/**
 * Réponse DÉTERMINISTE : classe la question puis interroge le moteur existant.
 * Renvoie un élément DOM (texte + éventuels boutons d'action).
 */
function repondreAssistant(q) {
  const { intent, muscle } = detecterIntention(q);
  const box = h(`<div class="stack"></div>`);
  const txt = (s) => box.append(h(`<div class="small">${s}</div>`));
  const p = Etat.data.profil || {};

  /** Liste d'exercices cliquables (ouvre la fiche). */
  const listeExos = (exos, vide) => {
    if (!exos.length) { txt(vide); return; }
    exos.forEach((e) => {
      const b = h(`<button class="card wcard sil coach-exo" style="width:100%;text-align:left"><span class="g"><b>${esc(e.nom)}</b><br><span class="muted small">${esc((e.musclesPrincipaux || []).map((m) => MUSCLE_LABELS[m] || m).join(", "))}</span></span><span class="chev">›</span></button>`);
      b.addEventListener("click", () => ouvrirDetail(e));
      box.append(b);
    });
  };

  switch (intent) {
    case "remplacer": {
      const exo = trouverExoParNom(q, CATALOGUE);
      if (!exo) { txt("Précise l'exercice à remplacer, par exemple : « par quoi remplacer le squat ? »"); break; }
      const alts = alternatives(exo.id, p);
      if (!alts.length) { txt(`Aucune alternative à <b>${esc(exo.nom)}</b> compatible avec ton matériel et tes contraintes. Ajoute du matériel dans ton profil pour élargir les options.`); break; }
      txt(`Pour remplacer <b>${esc(exo.nom)}</b>, voici ce qui correspond à ton matériel :`);
      alts.forEach((a) => {
        const b = h(`<button class="card wcard sil coach-exo" style="width:100%;text-align:left"><span class="g"><b>${esc(a.exercice.nom)}</b><br><span class="muted small">${esc(a.explication)}</span></span><span class="chev">›</span></button>`);
        b.addEventListener("click", () => ouvrirDetail(a.exercice));
        box.append(b);
      });
      break;
    }
    case "exos_muscle": {
      if (!muscle) { txt("Précise le groupe musculaire, par exemple : « des exercices pour les pectoraux »."); break; }
      // Les exercices qui ciblent le muscle en PRINCIPAL passent devant ceux qui
      // ne le sollicitent qu'en secondaire (sinon « épaules » remonte des pompes).
      const res = chercherCatalogue({ muscle }).filter(estRealisable)
        .sort((a, b) => Number((b.musclesPrincipaux || []).includes(muscle)) - Number((a.musclesPrincipaux || []).includes(muscle)))
        .slice(0, 6);
      txt(`Exercices pour <b>${esc(MUSCLE_LABELS[muscle] || muscle)}</b> réalisables avec ton matériel :`);
      listeExos(res, "Aucun exercice réalisable avec ton matériel actuel pour ce groupe.");
      break;
    }
    case "nutrition": {
      const b = calculerBesoins(p);
      txt(`Pour ton objectif « ${esc(GOAL_LABELS[p.objectif] || p.objectif)} », tes besoins calculés sont :`);
      const g = h(`<div class="statgrid"></div>`);
      g.append(statCard(IC.flame, `${b.kcal}`, "kcal / jour"));
      g.append(statCard(IC.dumbbell, `${b.prot} g`, "Protéines"));
      g.append(statCard(IC.apple, `${b.gluc} g`, "Glucides"));
      g.append(statCard(IC.droplet, `${b.lip} g`, "Lipides"));
      box.append(g);
      const bn = h(`<button class="secondary big">Ouvrir la nutrition</button>`);
      bn.addEventListener("click", () => { fermerCoach(); nav("food"); });
      box.append(bn);
      break;
    }
    case "eau": {
      const b = calculerBesoins(p);
      txt(`Vise environ <b>${b.eau} L d'eau par jour</b> (calculé sur ton poids), un peu plus les jours d'entraînement intense ou de forte chaleur.`);
      const bn = h(`<button class="secondary big">Suivre mon hydratation</button>`);
      bn.addEventListener("click", () => { fermerCoach(); nav("food"); });
      box.append(bn);
      break;
    }
    case "seance_jour": {
      const sj = seanceDuJour(Etat.data.programme);
      if (!sj) { txt("Aujourd'hui c'est <b>repos</b> 😴 — marche, mobilité ou récupération active. Ta prochaine séance t'attend demain."); break; }
      txt(`Aujourd'hui : <b>${esc(sj.nom)}</b> — ${sj.exercices.length} exercices, environ ${sj.dureeEstimeeMin} min.`);
      sj.exercices.slice(0, 8).forEach((e, i) => box.append(h(`<div class="small">${i + 1}. ${esc(nomExo(e.exerciceId))}</div>`)));
      const bn = h(`<button class="primary big"><span class="btn-ico">${IC.play}</span>Commencer la séance</button>`);
      bn.addEventListener("click", () => { fermerCoach(); LIVE = null; APERCU = sj.id; nav("train"); });
      box.append(bn);
      break;
    }
    case "records": {
      const cls = classementRecords(Etat.data.logs, nomExo, 6);
      if (!cls.length) { txt("Pas encore de record : enregistre quelques séances et ils apparaîtront ici."); break; }
      txt("Tes meilleures performances :");
      cls.forEach((r) => box.append(h(`<div class="spread small"><span>${esc(r.nom)}</span><b>${r.poidsMax} kg · 1RM ~${r.e1rm} kg</b></div>`)));
      const bn = h(`<button class="secondary big">Voir tous mes records</button>`);
      bn.addEventListener("click", () => { fermerCoach(); nav("stats"); });
      box.append(bn);
      break;
    }
    case "repos": {
      const o = p.objectif;
      const reco = o === "force" ? "3 à 5 min" : o === "perte_graisse" ? "45 à 60 s" : "1 min 30 à 2 min";
      txt(`Pour ton objectif « ${esc(GOAL_LABELS[o] || o)} » : <b>${reco}</b> entre les séries lourdes, et 45 à 60 s sur l'isolation. Le minuteur se lance tout seul quand tu valides une série.`);
      break;
    }
    case "progression": {
      txt("La règle appliquée par l'app : quand tu atteins le <b>haut de la fourchette de répétitions sur toutes tes séries</b>, tu augmentes la charge à la séance suivante (environ +2,5 % ou le plus petit disque disponible), puis tu repars en bas de la fourchette.");
      txt("Le conseil affiché sur chaque exercice pendant la séance tient déjà compte de tes deux dernières performances.");
      break;
    }
    case "aide":
      txt("Je réponds à partir de <b>tes vraies données</b> : ton programme, ton matériel, tes séances et tes besoins. Essaie par exemple :");
      break;
    default:
      txt("Je n'ai pas compris la question. Je sais répondre sur : le remplacement d'un exercice, la séance du jour, la nutrition, l'hydratation, les temps de repos, la progression et tes records.");
  }

  // Suggestions cliquables (aide + question non comprise)
  if (intent === "aide" || intent === "inconnu") {
    const s = h(`<div class="coach-sugg"></div>`);
    COACH_EXEMPLES.forEach((ex) => {
      const b = h(`<button class="chip">${esc(ex)}</button>`);
      b.addEventListener("click", () => envoyerQuestionCoach(ex));
      s.append(b);
    });
    box.append(s);
  }
  return box;
}

/* ---------- interface de discussion ---------- */
let COACH_IA = null; // module coachIA.js chargé à la demande (null tant qu'inactif)

function fermerCoach() { document.getElementById("coach")?.remove(); }

/** Ajoute une bulle dans le fil et fait défiler vers le bas. */
function bulleCoach(role, contenu) {
  const fil = document.querySelector("#coach .coach-fil");
  if (!fil) return null;
  const b = h(`<div class="coach-bulle ${role}"></div>`);
  if (typeof contenu === "string") b.innerHTML = `<div class="small">${contenu}</div>`;
  else b.append(contenu);
  fil.append(b);
  fil.scrollTop = fil.scrollHeight;
  return b;
}

/** Traite une question : réponse déterministe, puis complément IA si activé. */
async function envoyerQuestionCoach(question) {
  const q = (question || "").trim();
  if (!q) return;
  const champ = $("#coachInput");
  if (champ) champ.value = "";
  bulleCoach("moi", esc(q));

  // 1) Réponse déterministe — instantanée, exacte, toujours affichée.
  const { intent } = detecterIntention(q);
  bulleCoach("coach", repondreAssistant(q));

  // 2) Mode IA facultatif : complète uniquement si l'utilisateur l'a activé.
  //    Utile surtout quand la réponse déterministe ne sait pas répondre.
  if (!Etat.data.reglages.coachIA || !COACH_IA || !COACH_IA.estPret()) return;
  if (intent !== "inconnu" && intent !== "aide") return; // pas de doublon inutile

  const bulle = bulleCoach("coach ia", `<span class="coach-ia-tag">Coach IA</span><span class="coach-ia-txt">…</span>`);
  const cible = bulle.querySelector(".coach-ia-txt");
  try {
    let acc = "";
    await COACH_IA.demander(q, contexteUtilisateur(), (t) => { acc += t; cible.textContent = acc; });
    if (!acc.trim()) cible.textContent = "(pas de réponse)";
  } catch (e) {
    cible.textContent = "Le coach IA n'a pas pu répondre. La réponse ci-dessus reste valable.";
  }
}

/**
 * Carte de réglage du mode « Coach IA » (Profil). DÉSACTIVÉ par défaut :
 * tant qu'il ne l'est pas, aucune bibliothèque ni modèle n'est téléchargé et
 * l'app reste strictement déterministe et hors ligne.
 */
function carteCoachIA() {
  const actif = !!Etat.data.reglages.coachIA;
  const c = h(`<div class="card stack" style="margin-top:12px"></div>`);
  c.append(h(`<div class="spread"><h2 style="margin:0;font-size:1.05rem"><span class="cic">${IC.spark}</span>Coach IA (expérimental)</h2></div>`));
  c.append(h(`<div class="muted small">Ajoute un petit modèle de langage qui tourne <b>dans ton téléphone</b> pour les questions ouvertes. Le coach normal, lui, répond déjà instantanément et sans rien télécharger.</div>`));
  c.append(h(`<div class="warn small">Premier lancement : <b>téléchargement d'environ 300 Mo</b> (à faire en Wi-Fi), et réponses plus lentes sur mobile. Les réponses d'une IA peuvent être inexactes : le coach déterministe reste la référence.</div>`));

  const sw = h(`<button class="big ${actif ? "primary" : "secondary"}">${actif ? "Désactiver le coach IA" : "Activer le coach IA"}</button>`);
  sw.addEventListener("click", async () => {
    if (actif) {
      Etat.data.reglages.coachIA = false; Etat.sauver();
      try { const m = await import("../integrations/coachIA.js"); await m.decharger(); } catch (e) { /* rien à décharger */ }
      toast("Coach IA désactivé — l'app est de nouveau 100 % déterministe.");
      render();
      return;
    }
    const ok = await confirmer(
      "Activer le coach IA ? Un modèle d'environ 300 Mo sera téléchargé au premier usage (Wi-Fi conseillé). Les réponses sont générées localement, mais peuvent être inexactes.",
      { ok: "Activer" });
    if (!ok) return;
    Etat.data.reglages.coachIA = true; Etat.sauver();
    toast("Coach IA activé — ouvre le Coach pour lancer le téléchargement.");
    render();
  });
  c.append(sw);

  if (actif) {
    // Choix du modèle (le plus léger d'abord).
    const sel = h(`<div class="row"></div>`);
    [["onnx-community/Qwen2.5-0.5B-Instruct", "Qwen2.5 0.5B · ~350 Mo"],
     ["HuggingFaceTB/SmolLM2-360M-Instruct", "SmolLM2 360M · ~280 Mo"]].forEach(([id, lab]) => {
      const cur = (Etat.data.reglages.coachIAModele || "onnx-community/Qwen2.5-0.5B-Instruct") === id;
      const b = h(`<button class="chip ${cur ? "on" : ""}">${esc(lab)}</button>`);
      b.addEventListener("click", () => { Etat.data.reglages.coachIAModele = id; Etat.sauver(); render(); });
      sel.append(b);
    });
    c.append(sel);
  }
  return c;
}

/** Ouvre la feuille « Coach ». */
function ouvrirCoach() {
  fermerCoach();
  const sheet = h(`<div class="sheet coach" id="coach"><div class="inner"></div></div>`);
  const inner = sheet.querySelector(".inner");
  inner.append(h(`<div class="sheet-top"><h2 style="margin:0">Coach</h2><button class="chip" id="coachX">✕ Fermer</button></div>`));

  const fil = h(`<div class="coach-fil"></div>`);
  inner.append(fil);

  const barre = h(`<form class="coach-barre"><input id="coachInput" type="text" autocomplete="off" placeholder="Pose ta question…" aria-label="Ta question"><button class="primary" type="submit" aria-label="Envoyer">${IC.send}</button></form>`);
  barre.addEventListener("submit", (e) => { e.preventDefault(); envoyerQuestionCoach($("#coachInput").value); });
  inner.append(barre);

  sheet.querySelector("#coachX").addEventListener("click", fermerCoach);
  document.body.append(sheet);

  // Message d'accueil + suggestions
  bulleCoach("coach", repondreAssistant("aide"));
  // Si le mode IA est activé, on le prépare en tâche de fond.
  if (Etat.data.reglages.coachIA) activerCoachIA(true);
  $("#coachInput")?.focus();
}

/**
 * Charge le mode IA (import dynamique + téléchargement du modèle).
 * @param {boolean} silencieux  n'affiche pas de bulle de progression
 */
async function activerCoachIA(silencieux = false) {
  let bulle = null, cible = null;
  if (!silencieux) {
    bulle = bulleCoach("coach ia", `<span class="coach-ia-tag">Coach IA</span><span class="coach-ia-txt">Préparation…</span>`);
    cible = bulle?.querySelector(".coach-ia-txt");
  }
  try {
    if (!COACH_IA) COACH_IA = await import("../integrations/coachIA.js");
    const modele = Etat.data.reglages.coachIAModele || COACH_IA.MODELE_DEFAUT;
    await COACH_IA.chargerModele(modele, (info) => {
      if (cible) cible.textContent = info.pct ? `${info.etape} ${info.pct}%` : info.etape;
    });
    if (cible) cible.textContent = "Coach IA prêt — pose ta question.";
  } catch (e) {
    if (cible) cible.textContent = "Impossible de charger le coach IA (connexion ou navigateur incompatible). Le coach déterministe fonctionne normalement.";
    else toast("Coach IA indisponible — le coach normal fonctionne.");
  }
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
  const afficherResultats = (list, quandVide) => {
    res.innerHTML = "";
    if (!list.length) { res.append(quandVide || etatVide(IC.search, "Aucun aliment trouvé", "Essaie un mot plus simple (« riz », « poulet ») ou saisis le code-barres du produit.")); return; }
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

  // Recherche : résultats locaux immédiats, puis complément en ligne. Pendant
  // l'attente réseau on montre des squelettes plutôt qu'un faux résultat.
  $("#foodGo", v).addEventListener("click", async () => {
    const q = $("#foodQ", v).value.trim(); if (!q) return;
    const liste = chercherFoods(q);
    if (liste.length) afficherResultats(liste);
    else { res.innerHTML = ""; res.append(squelettes(3)); }
    const attente = liste.length ? h(`<div class="muted small" style="margin-top:6px">Recherche en ligne…</div>`) : null;
    if (attente) res.append(attente);
    const enligne = await offRechercher(q);
    attente?.remove();
    afficherResultats([...liste, ...enligne], etatVide(
      navigator.onLine === false ? IC.cross : IC.search,
      navigator.onLine === false ? "Hors ligne" : "Aucun aliment trouvé",
      navigator.onLine === false
        ? "Seule la base locale est consultable sans connexion. Essaie un aliment courant (« riz », « poulet »)."
        : "Essaie un mot plus simple, ou saisis le code-barres du produit.",
      { erreur: navigator.onLine === false }));
  });
  $("#codeGo", v).addEventListener("click", async () => {
    const code = $("#foodCode", v).value.trim(); if (!code) return;
    res.innerHTML = ""; res.append(squelettes(1));
    const prod = await parCodeBarres(code);
    afficherResultats(prod ? [prod] : [], etatVide(IC.cross, "Produit introuvable",
      navigator.onLine === false
        ? "La recherche par code-barres a besoin d'une connexion. Utilise la recherche par nom (base locale)."
        : "Ce code n'est pas dans Open Food Facts. Cherche le produit par son nom.",
      { erreur: true, action: { label: "Chercher par nom", onClick: () => $("#foodQ", v).focus() } }));
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
/** @type {{type:string, exerciceId:string|null, metrique:"1rm"|"poids"|"reps"|"volume", champCorps:string, periode:number}} */
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
  /** @type {Record<string, number>} */
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
  if (points.length < 2) return etatVideHTML("📈", "Ta courbe arrive bientôt", "Enregistre au moins 2 séances pour voir ta tendance se dessiner.");
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
  if (!bars.length) return etatVideHTML("📊", "Rien à afficher pour l'instant", "Tes volumes apparaîtront ici après ta première séance.");
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
  v.append(h(`<div class="dash-hi"><div><span class="eyebrow">Ton évolution</span><h1>Progrès</h1></div></div>`));

  const sm = statsSemaine(logs);
  const dm = dureeMoyenneMin(logs);
  const objSem = p.joursParSemaine || 3;

  // Objectif de la semaine sur une ligne : l'ancienne carte héro répétait ce
  // que la grille de statistiques affiche juste en dessous.
  const objPct = Math.min(1, sm.seances / Math.max(1, objSem));
  v.append(h(`<div class="card objweek">
    <div class="spread"><span class="small"><b>${sm.seances}/${objSem}</b> séance${sm.seances > 1 ? "s" : ""} cette semaine</span>
    <span class="small muted">${sm.seances ? `${sm.volume.toLocaleString("fr-FR")} kg` : "à démarrer"}</span></div>
    <div class="bar" style="margin-top:7px"><div style="width:${Math.round(objPct * 100)}%${objPct >= 1 ? ";background:var(--ok)" : ""}"></div></div>
  </div>`));

  // Aperçu par période : filtres 7J · 30J · 3M · 6M · 1A · Tout
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

  // Graphique de progression interactif : LE graphique utile, toujours visible.
  carteProgression(v);

  // Le reste est rangé en sections repliables — l'écran faisait 6 écrans de
  // long, on ne lisait plus rien. Priorité : régularité, muscles, records.
  const prs = classementRecords(logs, nomExo, 8);

  section(v, "regularite", "Régularité", (b) => {
    carteCalendrier(b, logs);
    carteDefis(b);
  }, { ouvert: true, resume: `${sm.seances}/${objSem} cette semaine` });

  section(v, "volume", "Volume", (b) => {
    const sem2 = volumeParSemaine(logs);
    if (sem2.length >= 1) b.append(h(`<div class="card">${svgBars(sem2, "Volume par semaine (kg)")}</div>`));
    const parMuscle = volumeParMuscle(logs, getExercise).slice(0, 8)
      .map((x) => ({ x: MUSCLE_LABELS[x.muscle] || x.muscle, v: x.v }));
    if (parMuscle.length) b.append(h(`<div class="card">${svgBars(parMuscle, "Volume par groupe musculaire")}</div>`));
    if (!sem2.length && !parMuscle.length) b.append(h(`<div class="muted small">Aucune séance enregistrée pour l'instant.</div>`));
  }, { resume: `${volP.toLocaleString("fr-FR")} kg` });

  section(v, "muscles", "Muscles & récupération", (b) => {
    carteMuscleHeatmap(b);
    carteRecup(b);
  });

  if (prs.length) {
    section(v, "records", "Records personnels", (b) => {
      const rg = h(`<div class="recgrid"></div>`);
      prs.slice(0, 6).forEach((r) => rg.append(h(`<div class="reccard"><div class="rc-name">${esc(r.nom)}</div><div class="rc-val num">${r.e1rm}<span> kg</span></div><div class="rc-sub muted">${r.charge}kg × ${r.reps}</div></div>`)));
      b.append(rg);
      b.append(h(`<div class="hint">${esc(FORMULE_1RM)}. Estimation indicative — ne teste jamais un vrai maximum en reprise.</div>`));
    }, { resume: `${prs.length}` });
  }

  section(v, "force", "Calculateurs de force", (b) => carteForce(b));

  // poids — rangé dans une section (consulté occasionnellement, pas à chaque ouverture)
  const secPoids = h(`<div></div>`);
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
  secPoids.append(c);
  section(v, "poids", "Poids du corps", (b) => b.append(secPoids), {
    resume: poids.length ? `${poids[poids.length - 1].poidsKg} kg` : "",
  });
  c.querySelector("#wAdd").addEventListener("click", () => {
    const kg = parseFloat((c.querySelector("#wKg").value || "").replace(",", ".")); if (!kg) return;
    Etat.data.metrics.push({ id: Etat.uid(), date: new Date().toISOString(), poidsKg: kg }); Etat.sauver(); render();
  });

  section(v, "mensurations", "Mensurations", (v) => {
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
  cb.append(bBilan);
  section(v, "bilan", "Bilan & ajustement", (b) => b.append(cb));

  // historique
  if (logs.length) {
    const hist = h(`<div class="card stack"></div>`);
    logs.slice(-8).reverse().forEach((l) => {
      hist.append(h(`<div class="spread small" style="padding:6px 0;border-bottom:1px solid var(--line)">
        <span>${new Date(l.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} — ${esc(l.seanceNom || "")}</span>
        <span class="muted">${(l.exercices || []).length} exos</span></div>`));
    });
    section(v, "historique", "Historique des séances", (b) => b.append(hist), { resume: `${logs.length}` });
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
  const bCoach = h(`<button class="plusitem"><span class="pm-ic mi-blue">${IC.message}</span><span class="pm-main"><b>Coach — poser une question</b></span><span class="chev">›</span></button>`);
  bCoach.addEventListener("click", () => ouvrirCoach());
  outils.append(bCoach);
  const bOutils = h(`<button class="plusitem"><span class="pm-ic mi-orange">${IC.spark}</span><span class="pm-main"><b>Outils de calcul</b><br><span class="muted small">FC cible, macros, 1RM, composition, test vélo</span></span><span class="chev">›</span></button>`);
  bOutils.addEventListener("click", () => ouvrirOutils());
  outils.append(bOutils);
  v.append(outils);

  // Affiner l'entraînement : les réglages retirés de l'onboarding pour le
  // raccourcir à 5 étapes. Ils gardent des valeurs par défaut prudentes.
  section(v, "p-affiner", "Affiner mon entraînement", (b) => {
    const c = h(`<div class="card stack"></div>`);
    c.append(h(`<div class="muted small">Optionnel. Ces réglages précisent la génération de programme et le choix des exercices.</div>`));
    c.append(h(`<div class="eyebrow" style="margin-top:8px">Muscles prioritaires</div>`));
    chips(c, MUSCLES.filter((m) => m !== "corps_entier").map((m) => [m, MUSCLE_LABELS[m]]),
      (val) => (p.musclesPrioritaires || []).includes(val),
      (val) => {
        p.musclesPrioritaires = (p.musclesPrioritaires || []).includes(val)
          ? p.musclesPrioritaires.filter((x) => x !== val) : [...(p.musclesPrioritaires || []), val];
        Etat.sauver();
      });
    c.append(h(`<div class="eyebrow" style="margin-top:12px">Limitations / douleurs déclarées</div>`));
    const LIMS = [["dos", "Dos"], ["epaule", "Épaule"], ["genou", "Genou"], ["poignet", "Poignet"], ["cheville", "Cheville"], ["coude", "Coude"], ["hanche", "Hanche"]];
    chips(c, LIMS, (val) => (p.limitations || []).includes(val),
      (val) => {
        p.limitations = (p.limitations || []).includes(val)
          ? p.limitations.filter((x) => x !== val) : [...(p.limitations || []), val];
        Etat.sauver();
      });
    c.append(h(`<div class="warn small" style="margin-top:10px">${mi(IC.cross, "mi-amber")}Cette app ne remplace pas un professionnel de santé. En cas de douleur, blessure ou maladie, demande un avis médical.</div>`));
    c.append(h(`<div class="eyebrow" style="margin-top:12px">Récupération</div>`));
    field(c, "Qualité de récupération", chipsInline([1, 2, 3, 4, 5].map((n) => [n, `${n}`]),
      (val) => p.recuperation === val, (val) => { p.recuperation = val; Etat.sauver(); }),
      "1 = épuisé en permanence, 5 = toujours frais.");
    const som = h(`<input inputmode="decimal" value="${p.sommeilH ?? 7}" aria-label="Sommeil moyen en heures">`);
    som.addEventListener("input", () => { p.sommeilH = +som.value || 7; Etat.sauver(); });
    field(c, "Sommeil moyen (h)", som);
    field(c, "Niveau de stress", chipsInline([1, 2, 3, 4, 5].map((n) => [n, `${n}`]),
      (val) => p.stress === val, (val) => { p.stress = val; Etat.sauver(); }));
    const bRegen = h(`<button class="secondary big" style="margin-top:10px">Régénérer mon programme avec ces réglages</button>`);
    bRegen.addEventListener("click", async () => {
      if (!await confirmer("Régénérer le programme avec ces réglages ? Ton historique est conservé.", { ok: "Régénérer" })) return;
      Etat.data.programme = genererProgramme(p); Etat.sauver();
      toast("Programme régénéré 💪"); render();
    });
    c.append(bRegen);
    b.append(c);
  });

  // Interface progressive : le mode débutant garde l'écran de séance minimal,
  // le mode avancé débloque les options sans rien retirer au premier.
  section(v, "p-mode", "Mode d'interface", (b) => {
    const c = h(`<div class="card stack"></div>`);
    const av = modeAvance();
    c.append(chipsInline([[false, "Débutant"], [true, "Avancé"]],
      (val) => av === val,
      (val) => { Etat.data.reglages.modeAvance = val; Etat.sauver(); render(); }));
    c.append(h(`<div class="muted small">${av
      ? "Pendant la séance : colonne d'effort visible, types de séries (drop set, rest-pause) en touchant le numéro de série, supersets et tempo."
      : "Pendant la séance : charge, répétitions et validation. Rien d'autre à l'écran."}</div>`));
    if (av) {
      c.append(h(`<div class="eyebrow" style="margin-top:10px">Métrique d'effort</div>`));
      c.append(chipsInline([["rir", "RIR"], ["rpe", "RPE"]],
        (val) => (Etat.data.reglages.metrique || "rir") === val,
        (val) => { Etat.data.reglages.metrique = val; Etat.sauver(); render(); }));
      c.append(h(`<div class="muted small">RIR = répétitions gardées en réserve (2 = tu aurais pu en faire 2 de plus). RPE = effort perçu sur 10. L'historique convertit en RIR pour rester comparable.</div>`));
    }
    b.append(c);
  });

  // Réglages d'entraînement : mode automatique, retour haptique.
  section(v, "p-moteur", "Séance automatique", (b) => {
    const c = h(`<div class="card stack"></div>`);
    const on = Etat.data.reglages.moteurAuto !== false;
    c.append(h(`<div class="muted small">Quand il est actif, l'application analyse ta récupération et construit la prochaine séance à ta place. Ton programme reste disponible dans son onglet.</div>`));
    const bt = h(`<button class="big ${on ? "primary" : "secondary"}">${on ? "Mode automatique actif" : "Activer le mode automatique"}</button>`);
    bt.addEventListener("click", () => {
      Etat.data.reglages.moteurAuto = !on; Etat.sauver();
      toast(on ? "Mode automatique désactivé" : "Mode automatique activé");
      render();
    });
    c.append(bt);
    c.append(h(`<div class="spread" style="margin-top:10px"><span class="small">Retour haptique (vibrations)</span></div>`));
    c.append(chipsInline([[true, "Activé"], [false, "Désactivé"]],
      (val) => (Etat.data.reglages.vibrations !== false) === val,
      (val) => { Etat.data.reglages.vibrations = val; Etat.sauver(); }));
    b.append(c);
  });

  // Coach IA (facultatif) — désactivé par défaut, l'app reste déterministe.
  v.append(carteCoachIA());

  const prof = h(`<div class="card stack"></div>`);
  const bReg = h(`<button>Régénérer le programme avec le profil actuel</button>`);
  bReg.addEventListener("click", () => { Etat.data.programme = genererProgramme(p); Etat.sauver(); nav("prog"); toast("Programme régénéré ✔"); });
  prof.append(bReg);
  section(v, "p-prog", "Programme d'entraînement", (b) => b.append(prof));

  const aff = h(`<div class="card stack"></div>`);
  aff.append(chipsInline([["auto", "Auto"], ["light", "Clair"], ["dark", "Sombre"]], (val) => Etat.data.reglages.theme === val, (val) => { Etat.data.reglages.theme = val; Etat.sauver(); appliquerTheme(); }));
  section(v, "p-app", "Apparence", (b) => b.append(aff));

  // Démonstrations
  const cwx = h(`<div class="card stack">
    <div class="hint">Les visuels des exercices viennent du dataset GitHub <b>hasaneyldrm/exercises-dataset</b> (référencés par URL, avec attribution), avec repli sur ExerciseDB open-source. La carte musculaire est un SVG intégré adapté de <b>react-muscle-highlighter</b> (licence MIT). Aucune clé requise.</div></div>`);
  section(v, "p-med", "Démonstrations & sources", (b) => b.append(cwx));

  const don = h(`<div class="card stack">
    <div class="small muted">Tout est stocké localement sur cet appareil. Aucune donnée n'est envoyée à un serveur.</div></div>`);
  const bExp = h(`<button><span class="cic">${IC.download || IC.cornerDown}</span>Sauvegarde complète (JSON)</button>`);
  bExp.addEventListener("click", () => {
    const contenu = JSON.stringify(construireExport(Etat.data), null, 1);
    const blob = new Blob([contenu], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nomFichierBackup(); a.click();
    URL.revokeObjectURL(a.href);
  });
  const bImp = h(`<button><span class="cic">${IC.cornerDown}</span>Restaurer une sauvegarde (JSON)</button>`);
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
  don.append(bExp, bImp, file, bExpCsvSeances, bExpCsvPoids, bDel);
  section(v, "p-data", "Mes données & sauvegarde", (b) => b.append(don));

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
  reprendreRepos();   // un repos lancé avant un rechargement doit continuer
  // État réseau INITIAL : les écouteurs `online`/`offline` ne se déclenchent
  // qu'au changement. Ouvrir l'app déjà hors connexion — le cas normal dans une
  // salle en sous-sol — ne montrait donc jamais la bannière.
  majEtatReseau();
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
