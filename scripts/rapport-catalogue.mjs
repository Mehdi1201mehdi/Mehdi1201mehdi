#!/usr/bin/env node
// @ts-nocheck
/**
 * Rapport de validation du catalogue : statuts, sources, machines, muscles,
 * équipements. Écrit docs/RAPPORT_CATALOGUE.md à partir des données réelles
 * chargées comme dans l'application (extensions + corrections).
 *
 * Usage : node scripts/rapport-catalogue.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ex = await import(path.join(RACINE, "src/data/exercises.js"));
const { MACHINES, exercicesDeMachine, GROUPES_EQUIPEMENT } = await import(path.join(RACINE, "src/data/machines.js"));
const { validerExercice, bilanValidation, LIB_STATUT } = await import(path.join(RACINE, "src/engine/validationExo.js"));
const { MUSCLE_LABELS, EQUIPMENT_LABELS } = await import(path.join(RACINE, "src/models.js"));
const { mouvementsDe, LIB_MOUVEMENT } = await import(path.join(RACINE, "src/engine/taxonomie.js"));
await ex.chargerCatalogueEtendu();
const C = ex.CATALOGUE;
const B = bilanValidation(C);
const statut = new Map(C.map((e) => [e.id, validerExercice(e).statut]));
const valides = C.filter((e) => statut.get(e.id) === "valide");

const ligne = (cells) => `| ${cells.join(" | ")} |`;
const compte = (liste) => {
  const o = { total: liste.length, valide: 0, a_verifier: 0, incomplet: 0 };
  for (const e of liste) o[statut.get(e.id)]++;
  return o;
};
const fmt = (n) => n.toLocaleString("fr-FR");

const out = [];
out.push("# Rapport de validation du catalogue d'exercices", "");
out.push(`Généré le ${new Date().toISOString().slice(0, 10)} par \`scripts/rapport-catalogue.mjs\` à partir des données réellement chargées par l'application (catalogue maison + extensions + corrections).`, "");
out.push("## Synthèse", "");
out.push(ligne(["Statut", "Fiches", "Définition"]), ligne(["---", "---:", "---"]));
const DEF = {
  valide: "Nom français, nom d'origine, muscle principal, matériel, mouvement, niveau, consignes en français (≥ 2 étapes), source, aucune incohérence",
  a_verifier: "Complète, mais une règle de cohérence échoue ou le nom français n'a pas pu être établi",
  incomplet: "Il manque une information obligatoire (presque toujours les consignes d'exécution)",
  rejete: "Inutilisable ou doublon masqué",
};
for (const k of ["valide", "a_verifier", "incomplet", "rejete"]) out.push(ligne([LIB_STATUT[k], fmt(B.parStatut[k]), DEF[k]]));
out.push(ligne(["**Total distinct**", `**${fmt(B.total)}**`, "Exercices affichés dans la bibliothèque, sans doublon"]), "");
out.push(`**${fmt(B.parStatut.valide)} exercices validés.** L'objectif de 3 000 n'est pas atteint : les sources de données dont la licence autorise la réutilisation ne contiennent pas davantage d'exercices distincts (voir ASSET_SOURCES.md). Aucun exercice n'a été créé artificiellement.`, "");

out.push("## Par source", "");
out.push(ligne(["Source", "Licence", "Validé", "À vérifier", "Incomplet", "Total"]), ligne(["---", "---", "---:", "---:", "---:", "---:"]));
const LIC = { "Coach Perso": "Projet", wger: "CC-BY-SA 4.0", "free-exercise-db": "Unlicense (domaine public)", "exercises-dataset": "MIT (données)" };
for (const [src, o] of Object.entries(B.parSource)) out.push(ligne([src, LIC[src] || "", fmt(o.valide), fmt(o.a_verifier), fmt(o.incomplet), fmt(o.valide + o.a_verifier + o.incomplet + o.rejete)]));
out.push("");
out.push("Écartés à l'import (non comptés) : doublons internes, doublons du catalogue, exercices de cou — détail en tête de chaque fichier généré (`src/data/exercises-fedb.js`, `src/data/exercises-edb.js`). 52 fiches identiques à une autre sont masquées (`DOUBLONS_MASQUES`) mais restent lisibles pour l'historique.", "");

out.push("## Ce qui manque", "");
out.push(ligne(["Champ", "Fiches concernées"]), ligne(["---", "---:"]));
for (const [k, n] of Object.entries(B.manques).sort((a, b) => b[1] - a[1])) out.push(ligne([k, fmt(n)]));
out.push("", ligne(["Incohérence détectée", "Fiches"]), ligne(["---", "---:"]));
for (const [k, n] of Object.entries(B.alertes).sort((a, b) => b[1] - a[1])) out.push(ligne([k, fmt(n)]));
out.push("");

out.push("## Par groupe musculaire (muscle principal)", "");
out.push(ligne(["Muscle", "Validé", "Total"]), ligne(["---", "---:", "---:"]));
const muscles = {};
for (const e of C) { const m = e.musclesPrincipaux[0]; (muscles[m] ||= []).push(e); }
for (const [m, l] of Object.entries(muscles).sort((a, b) => b[1].length - a[1].length)) { const o = compte(l); out.push(ligne([MUSCLE_LABELS[m] || m, fmt(o.valide), fmt(o.total)])); }
out.push("", `${Object.keys(muscles).length} groupes musculaires de catalogue ; le moteur de récupération en distingue 18 (épaules avant / côté / arrière, grand dorsal / haut du dos, obliques…).`, "");

out.push("## Par type de mouvement", "");
out.push(ligne(["Mouvement", "Validé", "Total"]), ligne(["---", "---:", "---:"]));
const mvts = {};
for (const e of C) for (const k of mouvementsDe(e)) (mvts[k] ||= []).push(e);
for (const [k, l] of Object.entries(mvts).sort((a, b) => b[1].length - a[1].length)) { const o = compte(l); out.push(ligne([LIB_MOUVEMENT[k] || k, fmt(o.valide), fmt(o.total)])); }
out.push("", "Un exercice peut appartenir à plusieurs familles (un squat est à la fois « squat » et « polyarticulaire »).", "");

out.push("## Par machine et équipement", "");
out.push(ligne(["Groupe", "Machine / équipement", "Validé", "Total"]), ligne(["---", "---", "---:", "---:"]));
for (const g of GROUPES_EQUIPEMENT) for (const m of MACHINES.filter((x) => x.groupe === g.cle)) {
  const o = compte(exercicesDeMachine(m.id, C));
  out.push(ligne([g.nom, m.nom, fmt(o.valide), fmt(o.total)]));
}
out.push("", `${MACHINES.length} machines et équipements référencés. Un exercice peut être compatible avec plusieurs (un développé couché haltères : banc plat + haltères).`, "");

out.push("## Matériel déclaré", "");
out.push(ligne(["Matériel", "Total"]), ligne(["---", "---:"]));
const eqs = {};
for (const e of C) for (const q of e.equipement) eqs[q] = (eqs[q] || 0) + 1;
for (const [q, n] of Object.entries(eqs).sort((a, b) => b[1] - a[1])) out.push(ligne([EQUIPMENT_LABELS[q] || q, fmt(n)]));
out.push("");
out.push("## Méthode", "",
  "- **Doublons** : clé anglaise normalisée (mots triés, pluriels ramenés au singulier), clé française sans articles, équivalences vérifiées à la main ; test automatique : aucun nom affiché deux fois, même à un article près.",
  "- **Fusion** : quand un exercice existe déjà, ses consignes françaises enrichissent la fiche existante au lieu de créer un doublon.",
  "- **Cohérence** : règles lisibles nom ↔ muscle principal ↔ matériel (`src/engine/validationExo.js`). Les erreurs relevées dans les sources ont été corrigées une par une (`src/data/corrections-catalogue.js`), les autres restent « à vérifier ».",
  "- **Niveau** : absent de exercises-dataset ; estimé par règles (matériel, unilatéral, mouvements techniques) et signalé « estimé » sur la fiche.",
  "- **Repères généraux** (respiration, erreurs fréquentes, sécurité) : rédigés par famille de mouvement et affichés comme tels, jamais présentés comme propres à un exercice.",
  "");
fs.writeFileSync(path.join(RACINE, "docs/RAPPORT_CATALOGUE.md"), out.join("\n"));
console.log(JSON.stringify({ total: B.total, ...B.parStatut, machines: MACHINES.length, muscles: Object.keys(muscles).length, valides: valides.length }));
