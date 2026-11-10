// @ts-check
/**
 * VALIDATION DES FICHES D'EXERCICES.
 *
 * Chaque fiche reçoit un statut calculé, jamais déclaré à la main :
 *  - « valide »     : identité complète (nom français, nom anglais ou nom
 *                     d'origine), muscle principal, matériel, mouvement,
 *                     niveau, consignes d'exécution en français (≥ 2 étapes),
 *                     source connue, ET aucune incohérence détectée ;
 *  - « a_verifier » : complète mais une règle de cohérence échoue (le nom dit
 *                     « curl », le muscle principal dit « quadriceps »…) ou le
 *                     nom français n'a pas pu être établi ;
 *  - « incomplet »  : il manque une information obligatoire (le plus souvent
 *                     les consignes d'exécution) ;
 *  - « rejete »     : fiche inutilisable (pas de muscle, pas de nom) ou
 *                     doublon masqué. Les doublons écartés à l'import sont
 *                     comptés par les scripts d'import, pas ici.
 *
 * Les règles de cohérence sont volontairement simples et lisibles : un mot du
 * nom implique une famille de muscles ou un matériel. Une fiche qui les viole
 * n'est pas supprimée : elle est signalée « à vérifier » avec la raison.
 */
import { MUSCLES, EQUIPMENTS, MOVEMENT_PATTERNS } from "../models.js";

export const STATUTS = /** @type {const} */ (["valide", "a_verifier", "incomplet", "rejete"]);
export const LIB_STATUT = { valide: "Validé", a_verifier: "À vérifier", incomplet: "Incomplet", rejete: "Rejeté" };

const sansAccents = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Mot du nom → muscles principaux acceptables. Évaluées dans l'ordre : la
 * première règle qui reconnaît le nom décide. `null` = pas de contrainte.
 * @type {[RegExp, string[]|null][]}
 */
const REGLES_MUSCLE = [
  [/etirement|stretch|auto-massage|mobilite|cercles? |yoga|posture|equilibre|balance board|get-up|coups de masse|sledgehammer|toucher des orteils|toe touch/, null],
  [/front lever|back lever/, ["dorsaux", "abdominaux", "corps_entier"]],
  [/traineau|prowler|\bsled\b/, ["quadriceps", "fessiers", "mollets", "ischios", "pectoraux", "dorsaux", "epaules", "triceps", "corps_entier"]],
  [/nordic curl inverse|reverse nordic/, ["quadriceps"]],
  [/\bleg curl|curl nordique|leg curl nordique|glute.?ham/, ["ischios", "fessiers"]],
  [/curl des poignets|curl des doigts|curl poignets?|poignets?|wrist|pince|gripper|prehension|serrage de main|^(pronation|supination)/, ["avant_bras"]],
  [/kickback fessier|glute kickback|extension (de hanche|fessier)|hip extension|relev[ee] de bassin|hip (raise|lift)/, ["fessiers", "ischios", "lombaires", "abdominaux"]],
  [/pull-over|pullover/, ["dorsaux", "pectoraux", "triceps"]],
  [/extension lombaire|reverse hyper|superman|good morning|lower back/, ["lombaires", "fessiers", "ischios", "dorsaux", "trapezes", "abdominaux"]],
  [/\bcurl\b(?!-up| up)/, ["biceps", "avant_bras", "ischios"]],
  [/triceps|barre au front|kickback|dips triceps|extension des triceps|tate press|jm press/, ["triceps"]],
  [/haussement d.epaules|shrug/, ["trapezes", "epaules", "dorsaux"]],
  [/mollets|calf|donkey/, ["mollets"]],
  [/^(?!.*pompe)(?=.*(curl-up|crunch|sit-up|relev[ee] de (jambes|genoux)|gainage|planche|rotation russe|roulette abdominale|canif|v-up|v-sit|l-sit|dead bug|touche|flexion laterale|pallof|bucheron|obliques|abdo))/, ["abdominaux", "lombaires", "corps_entier"]],
  [/adduction|adducteurs?/, ["adducteurs"]],
  [/abduction|abducteurs?/, ["abducteurs", "fessiers"]],
  [/leg extension/, ["quadriceps"]],
  [/squat|presse a cuisses|presse a jambes|fente|hack|montee sur banc|\bstep\b/, ["quadriceps", "fessiers", "ischios", "adducteurs", "mollets", "corps_entier"]],
  [/tirage vertical|traction|rowing|tirage horizontal|tirage haut|tirage a plat ventre|muscle-up/, ["dorsaux", "biceps", "trapezes", "epaules", "abdominaux"]],
  [/developpe couche|developpe incline|developpe decline|developpe pectoraux|presse pectorale|\becartes?\b|butterfly|pec deck|crossover|pompes?|dips pectoraux|svend|chest squeeze|pectoraux/, ["pectoraux", "triceps", "epaules"]],
  [/developpe (militaire|epaules|nuque|arnold|bradford|cubain)|elevation (laterale|frontale|en [ty])|oiseau|tirage menton|face pull|rotation (externe|interne) de l.epaule|deltoides/, ["epaules", "trapezes", "dorsaux"]],
  [/souleve de terre|hip thrust|pont fessier|swing/, ["ischios", "fessiers", "lombaires", "dorsaux", "quadriceps", "corps_entier"]],
];

/** Indice de matériel dans le nom → matériel attendu (au moins un). @type {[RegExp, string[]][]} */
const REGLES_MATERIEL = [
  [/\(halteres?\)|\bhalteres?\b/, ["halteres"]],
  [/\(barre ez\)|barre ez/, ["barre_ez", "barre"]],
  [/\(barre\)|a la barre\b/, ["barre", "barre_ez", "smith"]],
  [/\(poulie|a la poulie|\bpoulie\b|cable/, ["poulie"]],
  [/\(smith\)|\bsmith\b/, ["smith", "barre"]],
  [/\(kettlebells?\)|kettlebell/, ["kettlebell"]],
  [/\(elastiques?\)|\belastiques?\b/, ["elastiques"]],
  [/\(machine\)|\bmachine\b/, ["machine_guidee", "machine_leviers", "smith"]],
  [/swiss ball/, ["swiss_ball"]],
  [/medecine-ball/, ["medecine_ball"]],
];

/**
 * Le nom a-t-il été établi en français ? Les sources importées marquent
 * explicitement un nom anglais conservé faute de traduction sûre.
 * @param {any} e
 */
export function nomFrancaisEtabli(e) {
  if (e.nomFrVerifie === false) return false;
  if (e.source === "free-exercise-db" && !(e.nomsAlternatifs || []).length) return false;
  return Boolean(e.nom);
}

/** Nom anglais / d'origine disponible. @param {any} e */
export function nomAnglais(e) {
  if (e.nomEn) return e.nomEn;
  const alt = (e.nomsAlternatifs || []).find((n) => /^[\x20-\x7E]+$/.test(n));
  if (alt) return alt;
  if (e.source === "wger" && e.slug) return e.slug.replace(/-/g, " ");
  // free-exercise-db sans traduction : le nom affiché EST le nom anglais d'origine.
  if (e.source === "free-exercise-db" && !(e.nomsAlternatifs || []).length) return e.nom;
  return "";
}

/**
 * Contrôles de cohérence. Renvoie la liste des problèmes (vide = cohérent).
 * @param {any} e
 * @returns {string[]}
 */
export function incoherences(e) {
  const out = [];
  const n = sansAccents(`${e.nom} ${nomAnglais(e)}`);
  const prim = (e.musclesPrincipaux || [])[0];
  for (const [re, ok] of REGLES_MUSCLE) {
    if (!re.test(n)) continue;
    if (ok && prim && !ok.includes(prim)) out.push(`Muscle principal « ${prim} » inattendu pour ce mouvement`);
    break;
  }
  const nomFr = sansAccents(e.nom);
  for (const [re, ok] of REGLES_MATERIEL) {
    if (re.test(nomFr) && !(e.equipement || []).some((q) => ok.includes(q))) { out.push("Matériel déclaré différent de celui du nom"); break; }
  }
  if ((e.musclesSecondaires || []).includes(prim)) out.push("Muscle principal répété en secondaire");
  if (e.patron && !MOVEMENT_PATTERNS.includes(e.patron)) out.push(`Patron inconnu « ${e.patron} »`);
  for (const m of [...(e.musclesPrincipaux || []), ...(e.musclesSecondaires || [])]) if (!MUSCLES.includes(m)) out.push(`Muscle inconnu « ${m} »`);
  for (const q of e.equipement || []) if (!EQUIPMENTS.includes(q) && q !== "autre") out.push(`Matériel inconnu « ${q} »`);
  return out;
}

/**
 * Champs obligatoires manquants (vide = complet).
 * @param {any} e
 * @returns {string[]}
 */
export function champsManquants(e) {
  const out = [];
  if (!nomFrancaisEtabli(e)) out.push("nom français");
  if (!nomAnglais(e) && e.source !== undefined) out.push("nom anglais");
  if (!(e.musclesPrincipaux || []).length) out.push("muscle principal");
  if (!(e.equipement || []).length) out.push("matériel");
  if (!e.patron && !e.typeExercice) out.push("type de mouvement");
  if (!e.difficulte) out.push("niveau");
  if ((e.instructions || []).filter((x) => String(x).trim()).length < 2) out.push("consignes d'exécution");
  if (!e.auteur && !e.source) out.push("source");
  return out;
}

/**
 * Statut de validation d'une fiche.
 * @param {any} e
 * @param {{ masques?: Record<string,string> }} [opts]
 * @returns {{ statut: "valide"|"a_verifier"|"incomplet"|"rejete", manques: string[], alertes: string[] }}
 */
export function validerExercice(e, opts = {}) {
  if (!e || !e.nom || !(e.musclesPrincipaux || []).length) return { statut: "rejete", manques: ["muscle principal"], alertes: [] };
  if (opts.masques && opts.masques[e.id]) return { statut: "rejete", manques: [], alertes: [`Doublon de ${opts.masques[e.id]}`] };
  const manques = champsManquants(e);
  const alertes = incoherences(e);
  // Consignes rédigées par l'app (consignesAuto.js) : la fiche est lisible,
  // mais elle n'a pas été relue — jamais « Validée » tant que ce n'est pas fait.
  if (e.consignesAuto) alertes.push("Consignes rédigées par l'app, à vérifier");
  // Le nom français non établi n'est pas un « trou » de données mais une vérification à faire.
  const manquesBloquants = manques.filter((m) => m !== "nom français");
  if (manquesBloquants.length) return { statut: "incomplet", manques, alertes };
  if (alertes.length || manques.length) return { statut: "a_verifier", manques, alertes };
  return { statut: "valide", manques, alertes };
}

/**
 * Bilan d'un catalogue : totaux par statut et listes utiles au rapport.
 * @param {any[]} catalogue
 * @param {{ masques?: Record<string,string> }} [opts]
 */
export function bilanValidation(catalogue, opts = {}) {
  const parStatut = { valide: 0, a_verifier: 0, incomplet: 0, rejete: 0 };
  const manques = {};
  const alertes = {};
  const parSource = {};
  for (const e of catalogue) {
    const v = validerExercice(e, opts);
    parStatut[v.statut]++;
    const src = e.source || "Coach Perso";
    (parSource[src] ||= { valide: 0, a_verifier: 0, incomplet: 0, rejete: 0 })[v.statut]++;
    v.manques.forEach((m) => { manques[m] = (manques[m] || 0) + 1; });
    v.alertes.forEach((a) => { const k = a.replace(/« [^»]+ »/g, "…"); alertes[k] = (alertes[k] || 0) + 1; });
  }
  return { total: catalogue.length, parStatut, parSource, manques, alertes };
}
