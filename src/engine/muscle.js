// @ts-check
/**
 * FICHE MUSCLE — ce qui manquait quand on touchait la planche anatomique.
 *
 * La carte musculaire colorait les zones travaillées, et s'arrêtait là. On voyait
 * que le dos était vif sans pouvoir savoir POURQUOI : quel volume, combien de
 * séries, avec quels exercices, quand pour la dernière fois. Une belle image
 * dont on ne pouvait rien tirer.
 *
 * Ce module répond à ces questions à partir de l'historique réel, et de rien
 * d'autre. Il est PUR : aucune donnée inventée, aucune moyenne de population,
 * aucun accès au DOM.
 *
 * Deux conventions reprises du reste du moteur, pour que les chiffres
 * concordent d'un écran à l'autre :
 *
 *   · le volume d'un exercice est réparti entre ses muscles PRINCIPAUX, comme
 *     dans `volumeParMuscle` — sinon le total du corps serait gonflé ;
 *   · un exercice au poids du corps compte ses répétitions comme charge
 *     unitaire, sinon la calisthénie n'apparaîtrait jamais.
 *
 * Les muscles SECONDAIRES sont comptés séparément, jamais mélangés au volume
 * principal : ce sont deux informations différentes, et les additionner
 * reviendrait à prétendre qu'un développé couché entraîne les triceps autant
 * que les pectoraux.
 */

/** Nombre de semaines d'historique rendues pour le mini-graphique. */
export const SEMAINES = 8;

/** Lundi de la semaine d'une date, en ISO court. */
export function lundi(date) {
  const d = new Date(date);
  if (!Number.isFinite(d.getTime())) return "";
  const j = (d.getUTCDay() + 6) % 7;             // 0 = lundi
  d.setUTCDate(d.getUTCDate() - j);
  return d.toISOString().slice(0, 10);
}

/** Volume d'un exercice enregistré, avec la règle « poids du corps ». */
function volumeExo(e) {
  const series = (e && Array.isArray(e.series)) ? e.series : [];
  let v = 0;
  for (const s of series) v += (Number(s && s.chargeKg) || 0) * (Number(s && s.reps) || 0);
  if (v === 0) for (const s of series) v += Number(s && s.reps) || 0;
  return v;
}

/**
 * Tout ce qu'on peut dire d'un muscle à partir de l'historique.
 *
 * @param {string} muscle
 * @param {any[]} logs
 * @param {(id:string)=>any} getExercise
 * @param {{maintenant?:number, semaines?:number}} [opts]
 * @returns {{muscle:string, mesurable:boolean, raison:string|null,
 *            volume:number, series:number, seances:number,
 *            dernierJours:number|null, principaux:number, secondaires:number,
 *            exercices:{exerciceId:string, volume:number, series:number, role:"principal"|"secondaire"}[],
 *            semaines:{semaine:string, volume:number}[]}}
 */
export function ficheMuscle(muscle, logs, getExercise, opts = {}) {
  const maintenant = Number(opts.maintenant) || Date.now();
  const nbSem = Math.max(1, Math.round(Number(opts.semaines) || SEMAINES));
  const vide = {
    muscle: String(muscle || ""), mesurable: false, volume: 0, series: 0, seances: 0,
    dernierJours: null, principaux: 0, secondaires: 0, exercices: [], semaines: [],
  };
  if (!muscle) return { ...vide, raison: "Aucun muscle sélectionné." };

  /** @type {Map<string, {volume:number, series:number, role:"principal"|"secondaire"}>} */
  const parExo = new Map();
  /** @type {Map<string, number>} */
  const parSemaine = new Map();
  const seances = new Set();
  let volume = 0, series = 0, principaux = 0, secondaires = 0, dernier = null;

  for (const l of (Array.isArray(logs) ? logs : [])) {
    if (!l || !Array.isArray(l.exercices)) continue;
    const t = Date.parse(String(l.date));
    for (const e of l.exercices) {
      if (!e || !e.exerciceId) continue;
      let exo = null;
      try { exo = getExercise(e.exerciceId); } catch (err) { exo = null; }
      if (!exo) continue;
      const pr = Array.isArray(exo.musclesPrincipaux) ? exo.musclesPrincipaux : [];
      const sec = Array.isArray(exo.musclesSecondaires) ? exo.musclesSecondaires : [];
      const estPrincipal = pr.includes(muscle);
      const estSecondaire = !estPrincipal && sec.includes(muscle);
      if (!estPrincipal && !estSecondaire) continue;

      const nbS = Array.isArray(e.series) ? e.series.length : 0;
      // Réparti entre les muscles principaux, comme `volumeParMuscle` : sinon
      // le total du corps serait gonflé par chaque exercice polyarticulaire.
      const v = estPrincipal ? volumeExo(e) / Math.max(1, pr.length) : 0;

      const cle = e.exerciceId;
      const prec = parExo.get(cle) || { volume: 0, series: 0, role: estPrincipal ? "principal" : "secondaire" };
      prec.volume += v; prec.series += nbS;
      if (estPrincipal) prec.role = "principal";
      parExo.set(cle, prec);

      if (estPrincipal) { volume += v; principaux += nbS; } else { secondaires += nbS; }
      series += nbS;
      if (l.id) seances.add(l.id);
      if (Number.isFinite(t)) {
        dernier = dernier === null ? t : Math.max(dernier, t);
        if (estPrincipal) {
          const sem = lundi(l.date);
          if (sem) parSemaine.set(sem, (parSemaine.get(sem) || 0) + v);
        }
      }
    }
  }

  if (!series) {
    return { ...vide, raison: "Ce muscle n'apparaît dans aucune séance enregistrée." };
  }

  // Les `nbSem` dernières semaines, y compris celles à zéro : un trou dans la
  // série est une information — c'est là qu'on a arrêté de le travailler.
  const semaines = [];
  const base = new Date(maintenant);
  for (let i = nbSem - 1; i >= 0; i--) {
    const d = new Date(base.getTime() - i * 7 * 864e5);
    const cle = lundi(d.toISOString());
    semaines.push({ semaine: cle, volume: Math.round(parSemaine.get(cle) || 0) });
  }

  const exercices = [...parExo.entries()]
    .map(([exerciceId, x]) => ({ exerciceId, volume: Math.round(x.volume), series: x.series, role: x.role }))
    .sort((a, b) => b.volume - a.volume || b.series - a.series);

  return {
    muscle, mesurable: true, raison: null,
    volume: Math.round(volume), series, seances: seances.size,
    dernierJours: dernier === null ? null : Math.max(0, Math.floor((maintenant - dernier) / 864e5)),
    principaux, secondaires, exercices, semaines,
  };
}

/**
 * Volume hebdomadaire moyen sur les semaines RÉELLEMENT entraînées.
 *
 * Diviser par le nombre total de semaines écraserait la moyenne de quelqu'un qui
 * revient après une pause, et lui donnerait l'impression d'en faire deux fois
 * moins qu'en réalité.
 *
 * @param {{semaine:string, volume:number}[]} semaines
 */
export function moyenneHebdo(semaines) {
  const l = (Array.isArray(semaines) ? semaines : []).filter((s) => s && s.volume > 0);
  if (!l.length) return 0;
  return Math.round(l.reduce((a, s) => a + s.volume, 0) / l.length);
}

/**
 * Tendance sur les dernières semaines : en hausse, stable, ou en baisse.
 *
 * On compare la moyenne de la seconde moitié à celle de la première. Le seuil
 * de 10 % évite d'annoncer une « progression » pour du bruit — le volume d'une
 * semaine varie naturellement de quelques pour cent.
 *
 * @param {{semaine:string, volume:number}[]} semaines
 * @returns {{sens:"hausse"|"stable"|"baisse"|"inconnu", pct:number}}
 */
export function tendance(semaines) {
  const l = (Array.isArray(semaines) ? semaines : []).map((s) => Number(s && s.volume) || 0);
  if (l.length < 4) return { sens: "inconnu", pct: 0 };
  const moitie = Math.floor(l.length / 2);
  const moy = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const avant = moy(l.slice(0, moitie)), apres = moy(l.slice(moitie));
  if (avant <= 0) return apres > 0 ? { sens: "hausse", pct: 100 } : { sens: "inconnu", pct: 0 };
  const pct = Math.round(((apres - avant) / avant) * 100);
  if (pct >= 10) return { sens: "hausse", pct };
  if (pct <= -10) return { sens: "baisse", pct };
  return { sens: "stable", pct };
}
