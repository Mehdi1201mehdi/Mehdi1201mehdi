// @ts-check
/**
 * Du texte du coach IA à une routine RÉELLE de l'application.
 *
 * Le modèle de langage ne touche jamais aux données. Il peut seulement joindre à
 * sa réponse un bloc JSON « proposition de routine ». Ce module :
 *  1. extrait ce bloc du texte (et le retire de l'affichage) ;
 *  2. le VÉRIFIE : identifiants d'exercices existants dans le catalogue, bornes
 *     sur les séances, séries, répétitions et repos — tout ce qui sort des
 *     clous est corrigé ou écarté, et signalé ;
 *  3. construit une routine au format exact des routines perso (routines.js),
 *     que l'utilisateur ajoute ou ignore d'un geste.
 *
 * Il fournit aussi le catalogue compact envoyé au modèle (pour qu'il choisisse
 * de vrais identifiants) et un rendu HTML SÛR du texte (gras, listes).
 *
 * Tout est PUR : `getExercise` et l'horloge sont injectés.
 */
import { creerRoutine, ajouterSeance, ajouterExercice, estimerDureeSeance } from "./routines.js";

export const BORNES = Object.freeze({
  seances: 7, exosParSeance: 10, seriesMin: 1, seriesMax: 8,
  repsMin: 1, repsMax: 50, reposMin: 15, reposMax: 600, secMin: 10, secMax: 300,
});

/**
 * Catalogue compact, une ligne par exercice : « id | nom | muscles | matériel ».
 * Seuls les exercices réalisables sont fournis : le modèle ne peut pas proposer
 * ce que l'utilisateur ne peut pas faire.
 * @param {any[]} exos
 * @param {{realisable?:(e:any)=>boolean, labelsMuscle?:Record<string,string>, labelsEquip?:Record<string,string>, max?:number}} [opts]
 */
export function catalogueCompact(exos, opts = {}) {
  const { realisable = () => true, labelsMuscle = {}, labelsEquip = {}, max = 260 } = opts;
  const vus = new Set();
  const lignes = [];
  for (const e of exos || []) {
    if (!e || !e.id || vus.has(e.id) || !realisable(e)) continue;
    vus.add(e.id);
    const mus = (e.musclesPrincipaux || []).map((m) => labelsMuscle[m] || m).join(", ");
    const eq = (e.equipement || []).map((q) => labelsEquip[q] || q).join(", ") || "poids du corps";
    lignes.push(`${e.id} | ${e.nom} | ${mus} | ${eq}`);
    if (lignes.length >= max) break;
  }
  return lignes.join("\n");
}

/**
 * Cherche un bloc ```json … ``` (ou ``` … ```) contenant une proposition de
 * routine. Rend le texte SANS ce bloc pour l'affichage.
 * @param {string} texte
 * @returns {{texte:string, proposition:any|null, erreur:string|null}}
 */
export function extraireProposition(texte) {
  const brut = String(texte || "");
  const re = /```(?:json|routine)?\s*([\s\S]*?)```/gi;
  let m;
  while ((m = re.exec(brut))) {
    const contenu = m[1].trim();
    if (!contenu.startsWith("{")) continue;
    let obj;
    try { obj = JSON.parse(contenu); } catch {
      return { texte: (brut.slice(0, m.index) + brut.slice(m.index + m[0].length)).trim(), proposition: null, erreur: "La proposition du coach était mal formée : rien n'a été retenu." };
    }
    if (!obj || obj.type !== "routine") continue;
    return { texte: (brut.slice(0, m.index) + brut.slice(m.index + m[0].length)).trim(), proposition: obj, erreur: null };
  }
  // Réponse coupée en plein bloc (limite de longueur) : un nombre IMPAIR de
  // clôtures signale un bloc jamais refermé. On retire le morceau.
  const clotures = (brut.match(/```/g) || []).length;
  const ouvert = clotures % 2 === 1 ? brut.lastIndexOf("```") : -1;
  if (ouvert >= 0 && /^```(?:json|routine)?\s*\{/i.test(brut.slice(ouvert))) return { texte: brut.slice(0, ouvert).trim(), proposition: null, erreur: "La proposition du coach a été coupée avant la fin : redemande-la, éventuellement avec moins de séances." };
  return { texte: brut.trim(), proposition: null, erreur: null };
}

/** Entier borné, ou défaut si absent / illisible. */
function borne(v, min, max, defaut) {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return defaut;
  return Math.min(max, Math.max(min, n));
}

/**
 * « 8-12 », « 8–12 », « 10 », 10, [8, 12] → [min, max] borné ; null si illisible.
 * @param {any} r
 * @returns {[number, number] | null}
 */
export function lireReps(r) {
  let a, b;
  if (Array.isArray(r)) { a = r[0]; b = r[1] ?? r[0]; }
  else if (typeof r === "number") { a = r; b = r; }
  else if (typeof r === "string") {
    const nums = r.match(/\d+/g);
    if (!nums) return null;
    a = +nums[0]; b = nums[1] != null ? +nums[1] : +nums[0];
  } else return null;
  const lo = borne(Math.min(a, b), BORNES.repsMin, BORNES.repsMax, NaN);
  const hi = borne(Math.max(a, b), BORNES.repsMin, BORNES.repsMax, NaN);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return [lo, hi];
}

/**
 * Construit une routine perso à partir d'une proposition. Les exercices
 * inconnus du catalogue sont écartés (jamais inventés) et listés.
 *
 * @param {any} prop
 * @param {(id:string)=>any} getExercise
 * @param {string} [maintenant]
 * @returns {{routine:any|null, ignores:string[], corrections:number, raison:string|null}}
 */
export function routineDepuisProposition(prop, getExercise, maintenant = new Date().toISOString()) {
  if (!prop || prop.type !== "routine" || !Array.isArray(prop.seances)) {
    return { routine: null, ignores: [], corrections: 0, raison: "Proposition sans séance." };
  }
  // Modification d'une routine existante : enregistrée comme NOUVELLE version,
  // l'originale n'est jamais écrasée (« base » = nom de la routine d'origine).
  const base = String(prop.base || "").trim().slice(0, 60);
  const nom = String(prop.nom || "").trim().slice(0, 60) || (base ? `${base} (version coach)` : "Routine du coach");
  const routine = creerRoutine(nom, maintenant);
  routine.justificationGlobale = base
    ? `Version de « ${base} » modifiée par le coach IA et validée par toi. L'originale est conservée.`
    : "Routine proposée par le coach IA et validée par toi.";
  routine.source = "coach-ia";
  if (base) routine.baseNom = base;
  /** @type {string[]} */
  const ignores = [];
  let corrections = 0;

  for (const s of prop.seances.slice(0, BORNES.seances)) {
    if (!s || !Array.isArray(s.exercices)) continue;
    const seance = ajouterSeance(routine, String(s.nom || "").trim().slice(0, 50));
    const vus = new Set();
    for (const x of s.exercices) {
      if (seance.exercices.length >= BORNES.exosParSeance) { corrections++; break; }
      const id = x && String(x.id || x.exerciceId || "").trim();
      const exo = id ? getExercise(id) : null;
      if (!exo) { if (id) ignores.push(id); continue; }
      if (vus.has(id)) { corrections++; continue; }
      vus.add(id);
      const nbSeries = borne(x.series, BORNES.seriesMin, BORNES.seriesMax, 3);
      if (nbSeries !== Number(x.series)) corrections++;
      const reposSec = borne(x.repos ?? x.reposSec, BORNES.reposMin, BORNES.reposMax, 90);
      const opts = { nbSeries, reposSec };
      const enTemps = exo.typeExercice === "gainage" || exo.typeExercice === "cardio";
      if (enTemps) {
        opts.dureeSec = borne(x.secondes ?? x.dureeSec ?? lireReps(x.reps)?.[1], BORNES.secMin, BORNES.secMax, 40);
      } else {
        const reps = lireReps(x.reps);
        if (!reps) corrections++;
        opts.repsCible = reps || [8, 12];
      }
      const ex = ajouterExercice(seance, id, opts);
      if (ex) ex.justification = "Proposé par le coach IA.";
    }
    seance.dureeEstimeeMin = estimerDureeSeance(seance);
    if (!seance.exercices.length) routine.seances.pop();
  }
  routine.seances.forEach((s, i) => { s.indexJour = i; });
  if (!routine.seances.length) {
    return { routine: null, ignores, corrections, raison: "Aucun exercice de la proposition n'existe dans ton catalogue." };
  }
  return { routine, ignores, corrections, raison: null };
}

/**
 * Différences entre une routine existante et sa version proposée : exercices
 * ajoutés, retirés, et ceux dont le volume prévu change (séries × reps).
 * Sert à montrer CE QUI CHANGE avant que l'utilisateur valide.
 * @param {any} base
 * @param {any} nouvelle
 * @param {(id:string)=>string} [nomDe]
 * @returns {{ajoutes:string[], retires:string[], modifies:{nom:string, avant:string, apres:string}[]}}
 */
export function differenceRoutines(base, nouvelle, nomDe = (id) => id) {
  const resume = (r) => {
    /** @type {Map<string, string>} */
    const m = new Map();
    for (const s of (r && r.seances) || []) {
      for (const e of s.exercices || []) {
        const t = (e.series || []).filter((x) => x.type !== "echauffement");
        const p = t[0] || {};
        const vol = p.repsCible ? `${t.length} × ${p.repsCible[0]}-${p.repsCible[1]}` : p.dureeSec ? `${t.length} × ${p.dureeSec} s` : `${t.length} séries`;
        if (!m.has(e.exerciceId)) m.set(e.exerciceId, vol);
      }
    }
    return m;
  };
  const a = resume(base), b = resume(nouvelle);
  return {
    ajoutes: [...b.keys()].filter((k) => !a.has(k)).map(nomDe),
    retires: [...a.keys()].filter((k) => !b.has(k)).map(nomDe),
    modifies: [...b.keys()].filter((k) => a.has(k) && a.get(k) !== b.get(k))
      .map((k) => ({ nom: nomDe(k), avant: /** @type {string} */ (a.get(k)), apres: /** @type {string} */ (b.get(k)) })),
  };
}

/** Échappement HTML minimal (même règle que src/ui/dom.js, sans dépendance DOM). */
function esc(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/**
 * Rendu HTML SÛR d'une réponse du modèle : tout est échappé d'abord, puis seuls
 * le **gras**, l'*italique*, les listes « - » / « 1. » et les paragraphes sont
 * reconstruits. Aucun lien, aucune image, aucun HTML du modèle ne passe.
 * @param {string} texte
 */
export function htmlLeger(texte) {
  const inline = (s) => esc(s)
    .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, "$1<i>$2</i>")
    .replace(/`([^`\n]+)`/g, "<code>$1</code>");
  const blocs = String(texte || "").replace(/\r/g, "").split(/\n{2,}/);
  const out = [];
  for (const bloc of blocs) {
    const lignes = bloc.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
    if (!lignes.length) continue;
    if (lignes.every((l) => /^\s*[-•*]\s+/.test(l))) {
      out.push(`<ul>${lignes.map((l) => `<li>${inline(l.replace(/^\s*[-•*]\s+/, ""))}</li>`).join("")}</ul>`);
    } else if (lignes.every((l) => /^\s*\d+[.)]\s+/.test(l))) {
      out.push(`<ol>${lignes.map((l) => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>`).join("")}</ol>`);
    } else {
      // Paragraphe mêlé de puces : on garde les retours à la ligne.
      out.push(`<p>${lignes.map((l) => inline(l.replace(/^#{1,6}\s+/, ""))).join("<br>")}</p>`);
    }
  }
  return out.join("");
}

/**
 * Le message ressemble-t-il à une demande de création / modification de plan ?
 * Sert à n'envoyer le catalogue (plusieurs milliers de mots) que lorsqu'il est
 * utile.
 * @param {string} q
 */
export function demandeDePlan(q) {
  const n = String(q || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  return /(programme|routine|seance|plan\b|split|full ?body|haut.?bas|push|pull|ppl|cree|creer|construi|genere|prepare|organis|modifi|adapt|remplac|alternativ|exercice|semaine type|jours? par semaine)/.test(n);
}
