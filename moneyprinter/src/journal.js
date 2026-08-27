/* Le serveur ne mémorise pas le sujet d'une tâche : son état ne contient que
   l'identifiant, l'avancement et, une fois écrit, le script. On garde donc ici
   le sujet saisi, côté téléphone, pour que la liste des vidéos soit lisible
   dès la première seconde plutôt qu'après la génération du script. */

const CLE = "moneyprinter.journal.v1";
const MAX = 80;

function lire() {
  try {
    return JSON.parse(localStorage.getItem(CLE)) || {};
  } catch {
    return {};
  }
}

function ecrire(donnees) {
  try {
    localStorage.setItem(CLE, JSON.stringify(donnees));
  } catch { /* stockage indisponible : on se rabat sur le script du serveur */ }
}

export function noter(idTache, sujet) {
  const donnees = lire();
  donnees[idTache] = { sujet: String(sujet || "").slice(0, 200), date: Date.now() };

  const entrees = Object.entries(donnees).sort((a, b) => (b[1].date || 0) - (a[1].date || 0));
  if (entrees.length > MAX) {
    ecrire(Object.fromEntries(entrees.slice(0, MAX)));
    return;
  }
  ecrire(donnees);
}

export function sujetDe(idTache) {
  return (lire()[idTache] || {}).sujet || "";
}

export function dateDe(idTache) {
  return (lire()[idTache] || {}).date || 0;
}

export function oublier(idTache) {
  const donnees = lire();
  delete donnees[idTache];
  ecrire(donnees);
}
