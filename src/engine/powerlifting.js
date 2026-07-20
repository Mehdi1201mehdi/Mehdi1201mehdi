// @ts-check
/**
 * Outils « force / powerlifting » — 100 % locaux, hors ligne, sans dépendance.
 * Fonctions PURES (aucun DOM/stockage).
 *
 * - Estimation de 1RM (Epley ou Brzycki, formules indiquées).
 * - Table de pourcentages du 1RM (charges de travail).
 * - Calculateur de disques (chargement d'une barre, par côté).
 * - Séries d'échauffement progressives.
 */
import { e1rmEpley } from "./records.js";

/** 1RM estimé selon Brzycki : charge × 36 / (37 − reps). Valide pour reps < 37. */
export function e1rmBrzycki(kg, reps) {
  const k = Number(kg), r = Number(reps);
  if (!(k > 0 && r > 0) || r >= 37) return 0;
  return k * 36 / (37 - r);
}

/** Formules disponibles (clé → {label, fn}). */
export const FORMULES_1RM = {
  epley: { label: "Epley : charge × (1 + reps/30)", fn: e1rmEpley },
  brzycki: { label: "Brzycki : charge × 36 / (37 − reps)", fn: e1rmBrzycki },
};

/** 1RM estimé (arrondi 0,5 kg) selon la formule choisie. */
export function estimer1RM(kg, reps, formule = "epley") {
  const f = FORMULES_1RM[formule] || FORMULES_1RM.epley;
  return arrondir(f.fn(kg, reps), 0.5);
}

/** Arrondit une charge au pas donné (0,5 / 1,25 / 2,5 kg…). */
export function arrondir(kg, pas = 2.5) {
  if (!(pas > 0)) return Math.round(kg);
  return Math.round(Number(kg) / pas) * pas;
}

/**
 * Table de pourcentages d'un 1RM.
 * @param {number} rm  1RM (estimé ou testé)
 * @param {number[]} [pourcentages]
 * @param {number} [pas]  arrondi des charges
 * @returns {{pct:number, kg:number}[]}
 */
export function tablePourcentages(rm, pourcentages = [100, 95, 90, 85, 80, 75, 70, 65, 60, 50], pas = 2.5) {
  const base = Number(rm) || 0;
  return pourcentages.map((pct) => ({ pct, kg: arrondir(base * pct / 100, pas) }));
}

/**
 * Calculateur de disques : quels disques mettre PAR CÔTÉ pour atteindre une
 * charge cible, avec une barre et un jeu de disques donnés (algorithme glouton).
 * @param {number} cibleKg
 * @param {number} [barreKg]
 * @param {number[]} [disponibles]  denominations de disques (kg)
 * @returns {{possible:boolean, parCote:number[], resteKg:number, exact:boolean, totalReel:number, message?:string}}
 */
export function disquesParCote(cibleKg, barreKg = 20, disponibles = [25, 20, 15, 10, 5, 2.5, 1.25]) {
  const cible = Number(cibleKg);
  if (!(cible >= barreKg)) {
    return { possible: false, parCote: [], resteKg: 0, exact: false, totalReel: barreKg, message: `La charge doit être ≥ au poids de la barre (${barreKg} kg).` };
  }
  let parCoteCible = (cible - barreKg) / 2;
  const dispo = [...disponibles].sort((a, b) => b - a);
  const parCote = [];
  let reste = parCoteCible;
  for (const d of dispo) {
    while (reste >= d - 1e-9) { parCote.push(d); reste -= d; }
  }
  reste = Math.round(reste * 100) / 100;
  const sommeParCote = parCote.reduce((a, d) => a + d, 0);
  return {
    possible: true,
    parCote,
    resteKg: reste,
    exact: reste === 0,
    totalReel: Math.round((barreKg + 2 * sommeParCote) * 100) / 100,
  };
}

/**
 * Séries d'échauffement progressives vers une charge de travail.
 * @param {number} travailKg  charge de travail visée
 * @param {number} [barreKg]
 * @param {number} [pas]  arrondi
 * @returns {{kg:number, reps:number, pct:number|null, label:string}[]}
 */
export function echauffement(travailKg, barreKg = 20, pas = 2.5) {
  const W = Number(travailKg) || 0;
  if (W <= barreKg) return [{ kg: barreKg, reps: 8, pct: null, label: "barre à vide" }];
  const paliers = [
    { pct: 0, reps: 8, label: "barre à vide" },
    { pct: 50, reps: 5, label: "montée" },
    { pct: 70, reps: 3, label: "montée" },
    { pct: 85, reps: 1, label: "activation" },
  ];
  const out = [];
  for (const p of paliers) {
    const kg = p.pct === 0 ? barreKg : Math.max(barreKg, arrondir(W * p.pct / 100, pas));
    out.push({ kg, reps: p.reps, pct: p.pct || null, label: p.label });
  }
  out.push({ kg: arrondir(W, pas), reps: 5, pct: 100, label: "travail" });
  return out;
}
