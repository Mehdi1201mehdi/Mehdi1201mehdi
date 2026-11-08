#!/usr/bin/env node
// @ts-nocheck
/**
 * Importe le jeu « exercises-dataset » (github.com/hasaneyldrm/exercises-dataset).
 *
 * LICENCE : les DONNÉES (noms, catégories, muscles, matériel, consignes et leurs
 * traductions) sont sous licence MIT (© 2026 Hasan Emir Yıldırım). Les MÉDIAS
 * (images, GIF) appartiennent à Gym visual et ne sont PAS repris ici.
 *
 * Ce que fait le script :
 *  1. écarte les doublons internes (même exercice filmé sous un autre angle,
 *     « (male) », « (female) », « v. 2 ») ;
 *  2. FUSIONNE avec le catalogue existant : quand l'exercice existe déjà, ses
 *     consignes françaises enrichissent la fiche existante au lieu de créer
 *     un doublon (EDB_ENRICHISSEMENTS) ;
 *  3. crée une fiche pour chaque exercice réellement nouveau (EDB_EXERCISES),
 *     avec nom français par règles (scripts/lib/noms-fr.mjs) ou vérifié à la
 *     main, et le nom anglais d'origine conservé ;
 *  4. niveau ESTIMÉ par règles (le jeu n'en donne pas), marqué comme tel.
 *
 * Usage : node scripts/importer-exercises-dataset.mjs chemin/vers/data/exercises.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { creerNommeur, norm, singulier } from "./lib/noms-fr.mjs";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2];
if (!source) { console.error("Usage : node scripts/importer-exercises-dataset.mjs data/exercises.json"); process.exit(1); }
const brut = JSON.parse(fs.readFileSync(source, "utf8"));

const { CATALOGUE } = await import(path.join(RACINE, "src/data/exercises.js"));
const { EXTRA_EXERCISES } = await import(path.join(RACINE, "src/data/exercises-extra.js"));
const { FEDB_EXERCISES } = await import(path.join(RACINE, "src/data/exercises-fedb.js"));
const { DOUBLONS_MASQUES } = await import(path.join(RACINE, "src/data/exercises.js"));
const EXISTANTS = [...CATALOGUE, ...EXTRA_EXERCISES, ...FEDB_EXERCISES].filter((e) => !DOUBLONS_MASQUES[e.id]);

/* ---------------- correspondances ---------------- */
const CIBLE = {
  abs: "abdominaux", pectorals: "pectoraux", biceps: "biceps", glutes: "fessiers", delts: "epaules", triceps: "triceps",
  "upper back": "dorsaux", lats: "dorsaux", calves: "mollets", quads: "quadriceps", forearms: "avant_bras",
  "cardiovascular system": "corps_entier", hamstrings: "ischios", spine: "lombaires", traps: "trapezes",
  adductors: "adducteurs", abductors: "abducteurs", "serratus anterior": "pectoraux", "levator scapulae": "trapezes",
};
const SECONDAIRE = {
  shoulders: "epaules", deltoids: "epaules", "rear deltoids": "epaules", "rotator cuff": "epaules", hamstrings: "ischios",
  forearms: "avant_bras", wrists: "avant_bras", "wrist flexors": "avant_bras", "wrist extensors": "avant_bras",
  "grip muscles": "avant_bras", hands: "avant_bras", triceps: "triceps", biceps: "biceps", brachialis: "biceps",
  quadriceps: "quadriceps", calves: "mollets", soleus: "mollets", glutes: "fessiers", core: "abdominaux",
  abdominals: "abdominaux", "lower abs": "abdominaux", obliques: "abdominaux", chest: "pectoraux", "upper chest": "pectoraux",
  "lower back": "lombaires", rhomboids: "dorsaux", "upper back": "dorsaux", back: "dorsaux", "latissimus dorsi": "dorsaux",
  lats: "dorsaux", trapezius: "trapezes", traps: "trapezes", groin: "adducteurs", "inner thighs": "adducteurs",
  // ignorés faute de muscle équivalent dans l'app : hip flexors, ankles, feet, shins, sternocleidomastoid…
};
const MATERIEL = {
  "body weight": ["poids_du_corps"], dumbbell: ["halteres"], cable: ["poulie"], barbell: ["barre"], "olympic barbell": ["barre"],
  "leverage machine": ["machine_leviers"], band: ["elastiques"], "resistance band": ["elastiques"], "smith machine": ["smith"],
  kettlebell: ["kettlebell"], weighted: ["poids_du_corps"], "stability ball": ["swiss_ball"], "ez barbell": ["barre_ez"],
  assisted: ["machine_guidee"], "sled machine": ["machine_guidee"], "medicine ball": ["medecine_ball"], rope: ["autre"],
  roller: ["rouleau"], "wheel roller": ["autre"], "bosu ball": ["autre"], "upper body ergometer": ["autre"],
  "skierg machine": ["autre"], hammer: ["autre"], "stationary bike": ["velo"], tire: ["autre"], "trap bar": ["barre"],
  "elliptical machine": ["autre"], "stepmill machine": ["autre"],
};
const MATERIEL_TXT = {
  dumbbell: "haltères", cable: "poulie", barbell: "barre", "olympic barbell": "barre", "leverage machine": "machine",
  band: "élastique", "resistance band": "élastique", "smith machine": "Smith", kettlebell: "kettlebell",
  "stability ball": "swiss ball", "ez barbell": "barre EZ", assisted: "machine", "sled machine": "presse",
  "medicine ball": "médecine-ball", roller: "rouleau", "wheel roller": "roue", "bosu ball": "Bosu", "trap bar": "trap bar",
};

/* ---------------- vocabulaire ajouté pour ce jeu ---------------- */
const MOUVEMENTS_EDB = [
  ["donkey calf raise", "Extension des mollets à l'âne (donkey)", "f"], ["rear delt row", "Rowing deltoïdes postérieurs"],
  ["rear delt fly", "Oiseau"], ["rear fly", "Oiseau"], ["high row", "Rowing haut"], ["low row", "Rowing bas"],
  ["t bar row", "Rowing T-bar"], ["t raise", "Élévation en T", "f"], ["y raise", "Élévation en Y", "f"],
  ["inverse leg curl", "Leg curl nordique"], ["zercher squat", "Squat Zercher"], ["sissy squat", "Sissy squat"],
  ["cossack squat", "Squat cosaque"], ["curtsey squat", "Squat révérence"], ["skater squat", "Squat patineur"],
  ["french press", "Extension des triceps à la française", "f"], ["pallof press", "Pallof press"], ["svend press", "Svend press"],
  ["cuban press", "Développé cubain"], ["tate press", "Tate press"], ["guillotine press", "Développé guillotine"],
  ["bradford press", "Développé Bradford"], ["pendlay row", "Rowing Pendlay"], ["bicycle crunch", "Crunch bicyclette"],
  ["jackknife sit up", "Sit-up en canif"], ["jack knife sit up", "Sit-up en canif"], ["jackknife", "Canif (jackknife)"],
  ["v up", "V-up"], ["v sit", "V-sit"], ["l sit", "L-sit"], ["dead bug", "Dead bug"], ["burpee", "Burpee"],
  ["bear crawl", "Marche de l'ours", "f"], ["inchworm", "Chenille (inchworm)", "f"], ["superman", "Superman"],
  ["flutter kick", "Battements de jambes", "mp"], ["scissor kick", "Ciseaux de jambes", "mp"],
  ["shoulder tap", "Touchers d'épaules", "mp"], ["heel toucher", "Touche-talons"], ["toe touch", "Toucher des orteils"],
  ["pelvic tilt", "Bascule du bassin", "f"], ["hip abduction", "Abduction de hanche", "f"], ["front lever", "Front lever"],
  ["back lever", "Back lever"], ["handstand push up", "Pompes en équilibre sur les mains", "fp"],
  ["handstand", "Équilibre sur les mains"], ["skin the cat", "Skin the cat"], ["human flag", "Drapeau (human flag)"],
  ["flag", "Drapeau (human flag)"], ["maltese", "Maltese (gymnastique)"], ["planche", "Planche de gymnastique", "f"],
  ["farmers walk", "Marche du fermier", "f"], ["overhead carry", "Portage au-dessus de la tête"],
  ["battlingrope", "Battle ropes", "fp"], ["ropeclimb", "Grimper à la corde"], ["jumprope", "Corde à sauter", "f"],
  ["wheel rollerout", "Roulette abdominale", "f"], ["rollerout", "Roulette abdominale", "f"], ["body saw", "Body saw"],
  ["ski ergometer", "Ski-erg"], ["hands bike", "Ergomètre à bras"], ["sledge hammer", "Coups de masse", "mp"],
  ["wrist rollerer", "Rouleau à poignets"], ["gripper", "Pince de préhension (gripper)", "f"],
  ["hand squeeze", "Serrage de main"], ["curl up", "Curl-up (abdominaux)"], ["mountain climber", "Mountain climbers (grimpeur)"],
  ["upward facing dog", "Chien tête en haut (yoga)"], ["sphinx", "Sphinx (yoga)"], ["cobra", "Cobra (yoga)"],
  ["butterfly yoga pose", "Papillon (yoga)"], ["child pose", "Posture de l'enfant", "f"], ["elliptical cross trainer", "Vélo elliptique"],
  ["cycle cross trainer", "Vélo elliptique"], ["stationary bike", "Vélo d'appartement"], ["short stride run", "Course à petites foulées", "f"],
  ["run", "Course", "f"], ["walk", "Marche", "f"], ["star jump", "Saut en étoile"], ["frog jump", "Saut de grenouille"],
  ["tuck jump", "Saut genoux-poitrine"], ["skater", "Bond du patineur"], ["lateral bound", "Bonds latéraux", "mp"],
  ["chest dip", "Dips pectoraux", "mp"], ["triceps dip", "Dips triceps", "mp"], ["bench dip", "Dips entre deux bancs", "mp"],
  ["hip thrust", "Hip thrust"], ["kickback", "Kickback"], ["hyperextension", "Extension lombaire", "f"],
  ["reverse hyper", "Reverse hyper (extension de hanches)"], ["good morning", "Good morning"],
  ["calf press", "Extension des mollets à la presse", "f"], ["one leg press", "Presse à cuisses sur une jambe", "f"],
  ["lateral pulldown", "Tirage vertical"], ["rear pulldown", "Tirage vertical derrière la nuque"],
  ["cross over", "Crossover à la poulie"], ["crossover", "Crossover à la poulie"],
  ["straight leg raise", "Relevé de jambes tendues"], ["back wrist curl", "Curl des poignets derrière le dos"],
  ["back shrug", "Haussement d'épaules derrière le dos"], ["hip internal rotation", "Rotation interne de hanche", "f"],
  ["hip external rotation", "Rotation externe de hanche", "f"], ["clean and press", "Épaulé-développé"],
  ["zottman preacher curl", "Curl Zottman au pupitre"], ["scapula push up", "Pompes scapulaires", "fp"],
  ["scapula dip", "Dips scapulaires", "mp"], ["jm bench press", "JM press"], ["finger curl", "Curl des doigts"],
  ["hack calf raise", "Extension des mollets au hack squat", "f"], ["low fly", "Écarté bas"],
];
const QUALIFS_EDB = [
  ["on parallel bars", "aux barres parallèles"], ["parallel bars", "aux barres parallèles"], ["parallel grip", "prise neutre"],
  ["hammer grip", "prise neutre"], ["hammer", "prise neutre"], ["neutral", "prise neutre"], ["straight back", "dos droit"],
  ["back of the head", "derrière la tête"], ["behind head", "derrière la tête"], ["behind neck", "derrière la nuque"],
  ["over head", "au-dessus de la tête"], ["over a bench", "sur banc"], ["over bench", "sur banc"], ["high bar", "barre haute"],
  ["low bar", "barre basse"], ["full", "complet", "complète", true], ["twisting", "avec rotation"], ["twist", "avec rotation"],
  ["cross body", "croisé", "croisée", true], ["inner biceps", "bras en dehors"], ["forward", "avant"], ["backward", "arrière"],
  ["with support", "avec appui"], ["support head", "tête en appui"], ["bench support", "avec appui sur banc"], ["support", "avec appui"],
  ["supported", "avec appui"], ["hands against wall", "mains au mur"], ["against wall", "au mur"], ["on the wall", "au mur"],
  ["wall", "au mur"], ["on knee", "à genoux"], ["knee bent", "genoux fléchis"], ["knee off ground", "genoux décollés"], ["arm straight", "bras tendus"], ["arm extended", "bras tendus"], ["bent arms", "bras fléchis"],
  ["bent arm", "bras fléchis"], ["underhand", "prise supination"], ["overhand", "prise pronation"],
  ["vertical", "vertical", "verticale", true], ["horizontal", "horizontal", "horizontale", true],
  ["plyo", "pliométrique", "pliométrique", true], ["modified", "adapté", "adaptée", true], ["advanced", "avancé", "avancée", true],
  ["deep", "profond", "profonde", true], ["self assisted", "auto-assisté", "auto-assistée", true], ["archer", "archer"],
  ["diamond", "diamant"], ["pike", "piqué", "piquée", true], ["clap", "claqué", "claquée", true], ["hindu", "hindou", "hindoue", true],
  ["one legged", "sur une jambe"], ["rocking", "avec bascule"], ["unilateral", "unilatéral", "unilatérale", true],
  ["quarter", "quart d'amplitude"], ["half", "demi-amplitude"], ["negative", "négatif", "négative", true],
  ["static", "statique"], ["contralateral", "controlatéral", "controlatérale", true],
  ["on high parallel bar", "aux barres parallèles hautes"], ["high", "haut", "haute", true], ["low", "bas", "basse", true],
  ["suspended", "aux sangles"], ["clean grip", "prise d'épaulé"], ["upper chest", "pour le haut des pectoraux"],
  ["rotational", "avec rotation"], ["side to side", "d'un côté à l'autre"], ["between bench", "entre deux bancs"],
];
const ATTRIBUTS_EDB = [["roller", "rouleau"], ["strap", "sangles"], ["arm blaster", "arm blaster"], ["v bar", "barre en V"], ["sz bar", "barre EZ"], ["twin handle", "double poignée"],
  ["resistance band", "élastique"], ["bosu ball", "Bosu"], ["bosu", "Bosu"], ["towel", "serviette"], ["trap bar", "trap bar"]];
const VIDES_EDB = ["olympic", "sled", "45", "degree", "degrees", "bodyweight", "resistance", "leg", "legs", "up", "down", "body", "hand", "hands"];

/** Nettoyage du nom : coquilles d'encodage, mentions de démonstration (angle, démonstrateur, version). */
function nomPropre(n) {
  return n.replace(/в°|Â°/g, "°").replace(/\s*\((male|female|back pov|side pov)\)/gi, "").replace(/\s*v\.\s*\d\b/gi, "")
    .replace(/_\w+$/, "").replace(/\s+/g, " ").trim();
}
const avant = (t) => ` ${t} `.replace(/ revers /g, " reverse ").replace(/ battling ropes? /g, " battlingrope ")
  .replace(/ rope climb /g, " ropeclimb ").replace(/ (jump rope|rope jumping) /g, " jumprope ").replace(/ cross over /g, " crossover ")
  .replace(/ farmer s walk /g, " farmers walk ").replace(/ sitted /g, " seated ").replace(/ child s pose /g, " child pose ").trim();

/**
 * Noms vérifiés À LA MAIN pour les fiches que les règles ne savent pas nommer.
 * Clé = nom anglais NETTOYÉ (nomPropre). Les exercices composés ou trop
 * spécialisés restent sinon en anglais (nom vérifiable, cherchable).
 */
const NOMS_VERIFIES = {
  "air bike": "Vélo à air (air bike)", "burpee": "Burpee", "dumbbell burpee": "Burpee (haltères)", "jack burpee": "Burpee avec jumping jack",
  "farmers walk": "Marche du fermier", "rope climb": "Grimper à la corde", "battling ropes": "Battle ropes",
  "back lever": "Back lever", "front lever": "Front lever", "front lever reps": "Front lever en répétitions",
  "full planche": "Planche de gymnastique complète", "straddle planche": "Planche de gymnastique jambes écartées",
  "lean planche": "Planche de gymnastique penchée", "frog planche": "Planche de gymnastique groupée",
  "full maltese": "Maltese complet (gymnastique)", "straddle maltese": "Maltese jambes écartées (gymnastique)",
  "flag": "Drapeau (human flag)", "handstand": "Équilibre sur les mains", "l-sit on floor": "L-sit au sol",
  "v-sit on floor": "V-sit au sol", "skin the cat": "Skin the cat", "dead bug": "Dead bug", "bear crawl": "Marche de l'ours",
  "inchworm": "Chenille (inchworm)", "flutter kicks": "Battements de jambes", "pelvic tilt": "Bascule du bassin",
  "standing pelvic tilt": "Bascule du bassin debout", "hanging pike": "Relevé de jambes carpé suspendu",
  "isometric chest squeeze": "Contraction isométrique des pectoraux", "monster walk": "Marche du monstre (élastique)",
  "shoulder tap": "Touchers d'épaules en planche", "run": "Course", "short stride run": "Course à petites foulées",
  "wheel rollerout": "Roulette abdominale", "standing wheel rollerout": "Roulette abdominale debout",
  "barbell rollerout": "Roulette abdominale (barre)", "barbell rollerout from bench": "Roulette abdominale depuis un banc (barre)",
  "barbell standing ab rollerout": "Roulette abdominale debout (barre)", "band assisted wheel rollerout": "Roulette abdominale assistée (élastique)",
  "ski ergometer": "Ski-erg", "stationary bike walk": "Vélo d'appartement, allure facile", "walk elliptical cross trainer": "Vélo elliptique",
  "cycle cross trainer": "Vélo elliptique (mouvement de pédalage)", "sledge hammer": "Coups de masse sur pneu",
  "upward facing dog": "Chien tête en haut (yoga)", "sphinx": "Sphinx (yoga)", "butterfly yoga pose": "Papillon (yoga)",
  "band v-up": "V-up (élastique)", "band alternating v-up": "V-up alterné (élastique)", "elbow-to-knee": "Crunch coude-genou",
  "lying elbow to knee": "Crunch coude-genou allongé", "alternate heel touchers": "Touche-talons alternés",
  "suspended abdominal fallout": "Fallout aux sangles", "dumbbell lying pronation": "Pronation allongé (haltère)",
  "dumbbell lying supination": "Supination allongé (haltère)", "dumbbell lying pronation on floor": "Pronation allongé au sol (haltère)",
  "dumbbell lying supination on floor": "Supination allongé au sol (haltère)", "dumbbell lying external shoulder rotation": "Rotation externe de l'épaule allongé (haltère)",
  "side hip abduction": "Abduction de hanche sur le côté", "lever seated hip abduction": "Abduction de hanche assis (machine)",
  "resistance band seated hip abduction": "Abduction de hanche assis (élastique)", "straight leg outer hip abductor": "Abduction de hanche jambe tendue",
  "landmine 180": "Rotations à 180° (landmine)", "kettlebell figure 8": "Huit autour des jambes (kettlebell)",
  "dumbbell single arm overhead carry": "Portage unilatéral au-dessus de la tête (haltère)", "pull-in (on stability ball)": "Rapprochement des genoux sur swiss ball",
  "reverse hyper on flat bench": "Reverse hyper sur banc plat", "reverse hyper extension (on stability ball)": "Reverse hyper sur swiss ball",
  "cable standing lift": "Diagonale ascendante à la poulie (cable lift)", "barbell pin presses": "Développé depuis les sécurités (pin press)",
  "weighted standing hand squeeze": "Serrage de main debout (lesté)", "lever gripper hands": "Pince de préhension (machine)",
  "wrist rollerer": "Rouleau à poignets", "hands bike": "Ergomètre à bras", "push and pull bodyweight": "Pousser-tirer au poids du corps",
  "posterior step to overhead reach": "Pas arrière avec bras tendus au-dessus de la tête", "high knee against wall": "Montées de genoux contre un mur",
  "hug keens to chest": "Genoux contre la poitrine (étirement)", "chin-ups (narrow parallel grip)": "Traction prise neutre serrée",
  "balance board": "Planche d'équilibre", "one arm against wall": "Étirement du grand dorsal, un bras au mur",
  "dumbbell standing around world": "Tour du monde debout (haltère)", "half knee bends": "Demi-flexions de genoux",
  "swimmer kicks": "Battements de jambes du nageur", "quick feet": "Pas rapides (quick feet)", "back and forth step": "Pas avant-arrière",
  "barbell side bent": "Flexion latérale du buste (barre)", "march sit (wall)": "Chaise murale avec marche", "left hook. boxing": "Crochet gauche (boxe)",
  "medicine ball chest push single response": "Poussée poitrine (médecine-ball)", "medicine ball chest push multiple response": "Poussées poitrine enchaînées (médecine-ball)",
  "medicine ball chest push from 3 point stance": "Poussée poitrine depuis un appui à trois points (médecine-ball)",
  "medicine ball chest push with run release": "Poussée poitrine avec départ en course (médecine-ball)",
  // Deuxième passe manuelle (nov. 2026) : exercices composés et variantes nommées.
  "all fours squad stretch": "Étirement des quadriceps à quatre pattes",
  "arms apart circular toe touch": "Toucher des orteils en cercle, bras écartés",
  "assisted hanging knee raise with throw down": "Relevé de genoux suspendu assisté avec renvoi",
  "assisted lying calves stretch": "Étirement des mollets allongé, assisté",
  "assisted lying glutes stretch": "Étirement des fessiers allongé, assisté",
  "assisted lying gluteus and piriformis stretch": "Étirement des fessiers et du piriforme allongé, assisté",
  "assisted lying leg raise with lateral throw down": "Relevé de jambes allongé assisté avec renvoi latéral",
  "assisted lying leg raise with throw down": "Relevé de jambes allongé assisté avec renvoi",
  "assisted motion russian twist": "Rotation russe assistée",
  "assisted parallel close grip pull-up": "Traction assistée prise neutre serrée",
  "assisted prone rectus femoris stretch": "Étirement du droit fémoral sur le ventre, assisté",
  "assisted seated pectoralis major stretch with stability ball": "Étirement des pectoraux assis avec swiss ball, assisté",
  "astride jumps": "Sauts jambes écartées",
  "back pec stretch": "Étirement des pectoraux bras en arrière",
  "band fixed back close grip pulldown": "Tirage vertical prise serrée, élastique fixé derrière",
  "band fixed back underhand pulldown": "Tirage vertical prise supination, élastique fixé derrière",
  "band push sit-up": "Sit-up avec poussée (élastique)",
  "band squat row": "Squat-rowing (élastique)",
  "band straight leg deadlift": "Soulevé de terre jambes tendues (élastique)",
  "band two legs calf raise - (band under both legs)": "Extension des mollets, élastique sous les deux pieds",
  "barbell biceps curl (with arm blaster)": "Curl biceps avec arm blaster (barre)",
  "barbell front raise and pullover": "Élévation frontale et pull-over (barre)",
  "barbell jefferson squat": "Squat Jefferson (barre)",
  "barbell lying triceps extension": "Extension des triceps allongé (barre)",
  "barbell lying triceps extension skull crusher": "Barre au front allongé (barre)",
  "barbell press sit-up": "Sit-up avec développé (barre)",
  "barbell pullover to press": "Pull-over suivi d'un développé (barre)",
  "barbell revers wrist curl": "Curl des poignets en pronation (barre)",
  "barbell seated bradford rocky press": "Développé Bradford assis (barre)",
  "basic toe touch": "Toucher des orteils",
  "bodyweight squatting row": "Rowing en position de squat au poids du corps",
  "bodyweight squatting row (with towel)": "Rowing en position de squat avec serviette",
  "box jump down with one leg stabilization": "Saut en contrebas avec réception sur une jambe",
  "cable concentration extension (on knee)": "Extension des triceps concentrée, un genou au sol (poulie)",
  "cable lat pulldown full range of motion": "Tirage vertical amplitude complète (poulie)",
  "cable middle fly": "Écarté à mi-hauteur (poulie)",
  "cable pulldown (pro lat bar)": "Tirage vertical, barre pro lat (poulie)",
  "cable pulldown bicep curl": "Curl biceps à la poulie haute",
  "cable rear delt row (stirrups)": "Rowing deltoïdes postérieurs, poignées (poulie)",
  "cable rope crossover seated row": "Rowing assis croisé à la corde (poulie)",
  "cable squat row (with rope attachment)": "Squat-rowing à la corde (poulie)",
  "cable squatting curl": "Curl en position de squat (poulie)",
  "cable standing inner curl": "Curl debout bras en dehors (poulie)",
  "cable two arm tricep kickback": "Kickback triceps à deux bras (poulie)",
  "cable upper row": "Rowing haut (poulie)",
  "calf push stretch with hands against wall": "Étirement des mollets, poussée mains au mur",
  "cambered bar lying row": "Rowing allongé (barre cambrée)",
  "captains chair straight leg raise": "Relevé de jambes tendues à la chaise romaine",
  "chest dip on straight bar": "Dips pectoraux sur barre droite",
  "chest tap push-up": "Pompes avec touche de la poitrine",
  "circles knee stretch": "Cercles de genoux (mobilité)",
  "drop push up": "Pompes sautées en contrebas",
  "dumbbell alternating bicep curl with leg raised on exercise ball": "Curl biceps alterné sur swiss ball, jambe levée (haltères)",
  "dumbbell bicep curl lunge with bowling motion": "Fente avec curl biceps en mouvement de bowling (haltères)",
  "dumbbell bicep curl on exercise ball with leg raised": "Curl biceps sur swiss ball, jambe levée (haltères)",
  "dumbbell bicep curl with stork stance": "Curl biceps en équilibre sur une jambe (haltères)",
  "dumbbell biceps curl squat": "Squat avec curl biceps (haltères)",
  "dumbbell biceps curl v sit on bosu ball": "Curl biceps en V-sit sur Bosu (haltères)",
  "dumbbell forward lunge triceps extension": "Fente avant avec extension des triceps (haltère)",
  "dumbbell full can lateral raise": "Élévation latérale pouces vers le haut (full can, haltères)",
  "dumbbell incline fly on exercise ball": "Écarté incliné sur swiss ball (haltères)",
  "dumbbell incline one arm fly on exercise ball": "Écarté incliné unilatéral sur swiss ball (haltère)",
  "dumbbell incline one arm press on exercise ball": "Développé incliné unilatéral sur swiss ball (haltère)",
  "dumbbell incline twisted flyes": "Écarté incliné avec rotation (haltères)",
  "dumbbell incline two arm extension": "Extension des triceps inclinée à deux mains (haltère)",
  "dumbbell lunge with bicep curl": "Fente avec curl biceps (haltères)",
  "dumbbell lying extension (across face)": "Extension des triceps allongé vers le visage (haltère)",
  "dumbbell one arm chest fly on exercise ball": "Écarté unilatéral sur swiss ball (haltère)",
  "dumbbell one arm fly on exercise ball": "Écarté unilatéral sur swiss ball, bras libre (haltère)",
  "dumbbell one arm press on exercise ball": "Développé unilatéral sur swiss ball (haltère)",
  "dumbbell peacher hammer curl": "Curl marteau au pupitre (haltère)",
  "dumbbell preacher curl over exercise ball": "Curl pupitre sur swiss ball (haltère)",
  "dumbbell press on exercise ball": "Développé couché sur swiss ball (haltères)",
  "dumbbell pronate-grip triceps extension": "Extension des triceps prise pronation (haltères)",
  "dumbbell pullover hip extension on exercise ball": "Pull-over en pont sur swiss ball (haltère)",
  "dumbbell rotation reverse fly": "Oiseau avec rotation (haltères)",
  "dumbbell scott press": "Développé Scott (haltères)",
  "dumbbell seated biceps curl to shoulder press": "Curl biceps suivi d'un développé épaules assis (haltères)",
  "dumbbell seated one arm bicep curl on exercise ball with leg raised": "Curl biceps unilatéral sur swiss ball, jambe levée (haltère)",
  "dumbbell side plank with rear fly": "Planche latérale avec oiseau (haltère)",
  "dumbbell single leg deadlift with stepbox support": "Soulevé de terre sur une jambe avec appui sur step (haltère)",
  "dumbbell standing alternate hammer curl and press": "Curl marteau et développé alternés debout (haltères)",
  "dumbbell standing front raise above head": "Élévation frontale jusqu'au-dessus de la tête debout (haltère)",
  "dumbbell step up single leg balance with bicep curl": "Montée sur banc en équilibre avec curl biceps (haltères)",
  "dumbbell step-up lunge": "Montée sur banc suivie d'une fente (haltères)",
  "dumbbell step-up split squat": "Montée sur banc suivie d'un squat fendu (haltères)",
  "dumbbell tricep kickback with stork stance": "Kickback triceps en équilibre sur une jambe (haltère)",
  "dumbbell upright shoulder external rotation": "Rotation externe de l'épaule debout, coude levé (haltère)",
  "dumbbell w-press": "Développé en W (haltères)",
  "dumbbell waiter biceps curl": "Curl biceps du serveur (haltère)",
  "elbow dips": "Dips sur les coudes",
  "exercise ball back extension with rotation": "Extension lombaire avec rotation sur swiss ball",
  "exercise ball lower back stretch (pyramid)": "Étirement du bas du dos sur swiss ball (pyramide)",
  "exercise ball on the wall calf raise (tennis ball between ankles)": "Extension des mollets dos au mur sur swiss ball, balle entre les chevilles",
  "exercise ball on the wall calf raise (tennis ball between knees)": "Extension des mollets dos au mur sur swiss ball, balle entre les genoux",
  "exercise ball one legged diagonal kick hamstring curl": "Leg curl sur swiss ball sur une jambe, en diagonale",
  "ez barbell anti gravity press": "Développé anti-gravité (barre EZ)",
  "ez barbell decline close grip face press": "Développé vers le visage décliné prise serrée (barre EZ)",
  "flexion leg sit up (bent knee)": "Sit-up jambes fléchies",
  "frog crunch": "Crunch grenouille",
  "full planche push-up": "Pompes en planche de gymnastique",
  "gironda sternum chin": "Traction Gironda vers le sternum",
  "glute bridge march": "Pont fessier avec marche",
  "gorilla chin": "Traction gorille",
  "groin crunch": "Crunch adducteurs (groin crunch)",
  "hack one leg calf raise": "Extension des mollets sur une jambe au hack squat",
  "hanging straight twisting leg hip raise": "Relevé de bassin suspendu jambes tendues avec rotation",
  "incline leg hip raise (leg straight)": "Relevé de bassin incliné jambes tendues",
  "incline push-up (on box)": "Pompes inclinées sur box",
  "inverse leg curl (on pull-up cable machine)": "Leg curl nordique sur station de traction",
  "iron cross stretch": "Étirement en croix de fer",
  "jack jump": "Jumping jacks",
  "kettlebell alternating renegade row": "Rowing renegade alterné (kettlebells)",
  "kettlebell bent press": "Bent press (kettlebell)",
  "kettlebell bottoms up clean from the hang position": "Épaulé tête en bas depuis la position suspendue (kettlebell)",
  "kettlebell lunge pass through": "Fente avec passage sous la jambe (kettlebell)",
  "knee touch crunch": "Crunch genou touché",
  "kneeling plank tap shoulder": "Planche à genoux avec touchers d'épaules",
  "korean dips": "Dips coréens",
  "l-pull-up": "Traction en L",
  "lever gripless shrug": "Haussement d'épaules sans prise (machine)",
  "lever lying two-one leg curl": "Leg curl allongé deux jambes, retour sur une (machine)",
  "lever one arm bent over row": "Rowing unilatéral buste penché (machine)",
  "lever reverse grip lateral pulldown": "Tirage vertical prise inversée (machine)",
  "lever seated crunch (chest pad)": "Crunch assis avec appui poitrine (machine)",
  "lever seated leg raise crunch": "Crunch avec relevé de jambes assis (machine)",
  "lever seated squat calf raise on leg press machine": "Extension des mollets en squat assis à la presse (machine)",
  "lever t-bar reverse grip row": "Rowing T-bar prise inversée (machine)",
  "lunge with jump": "Fentes sautées",
  "machine inner chest press": "Développé pectoraux prise serrée (machine)",
  "medicine ball catch and overhead throw": "Réception et lancer au-dessus de la tête (médecine-ball)",
  "modified push up to lower arms": "Pompes adaptées sur les avant-bras",
  "outside leg kick push-up": "Pompes avec coup de pied latéral",
  "pike-to-cobra push-up": "Pompes du pike au cobra",
  "potty squat": "Squat profond tenu (potty squat)",
  "potty squat with support": "Squat profond tenu avec appui",
  "prisoner half sit-up": "Demi sit-up mains derrière la tête",
  "push-up inside leg kick": "Pompes avec coup de pied croisé",
  "push-up on lower arms": "Pompes sur les avant-bras",
  "push-up plus": "Pompes plus (protraction des omoplates)",
  "rear deltoid stretch": "Étirement des deltoïdes postérieurs",
  "reverse plank with leg lift": "Planche inversée avec relevé de jambe",
  "rocking frog stretch": "Étirement de la grenouille avec bascule",
  "roller back stretch": "Étirement du dos sur rouleau",
  "roller hip lat stretch": "Étirement de la hanche et du grand dorsal sur rouleau",
  "roller hip stretch": "Étirement de la hanche sur rouleau",
  "runners stretch": "Étirement du coureur",
  "semi squat jump": "Demi-squat sauté",
  "shoulder tap push-up": "Pompes avec touchers d'épaules",
  "side bridge hip abduction": "Planche latérale avec abduction de hanche",
  "side plank hip adduction": "Planche latérale avec adduction de hanche",
  "side wrist pull stretch": "Étirement latéral du poignet",
  "single leg bridge with outstretched leg": "Pont fessier sur une jambe, l'autre tendue",
  "single leg platform slide": "Glissé sur une jambe (plateforme)",
  "single leg squat (pistol) male": "Squat pistol",
  "skater hops": "Sauts du patineur",
  "sled calf press on leg press": "Extension des mollets à la presse inclinée",
  "sled closer hack squat": "Hack squat pieds serrés (presse)",
  "sled forward angled calf raise": "Extension des mollets incliné vers l'avant (presse)",
  "sled one leg calf press on leg press": "Extension des mollets sur une jambe à la presse inclinée",
  "smith chair squat": "Squat chaise (Smith)",
  "smith sprint lunge": "Fente de sprinteur (Smith)",
  "smith toe raise": "Relevé des orteils (Smith)",
  "spider crawl push up": "Pompes araignée en avançant",
  "spine stretch": "Étirement de la colonne",
  "spine twist": "Rotation de la colonne",
  "squat to overhead reach": "Squat avec bras tendus au-dessus de la tête",
  "squat to overhead reach with twist": "Squat avec bras tendus au-dessus de la tête et rotation",
  "stability ball crunch (full range hands behind head)": "Crunch amplitude complète sur swiss ball, mains derrière la tête",
  "standing calf raise (on a staircase)": "Extension des mollets debout sur une marche",
  "standing calves calf stretch": "Étirement des mollets debout",
  "standing hamstring and calf stretch with strap": "Étirement des ischio-jambiers et des mollets debout avec sangle",
  "superman push-up": "Pompes superman",
  "three bench dip": "Dips entre trois bancs",
  "twisted leg raise": "Relevé de jambes avec rotation",
  "vertical leg raise (on parallel bars)": "Relevé de jambes aux barres parallèles",
  "walking high knees lunge": "Fentes marchées avec montée de genou",
  "walking lunge": "Fentes marchées",
  "walking on stepmill": "Marche sur simulateur d'escalier",
  "weighted close grip chin-up on dip cage": "Traction supination prise serrée lestée",
  "weighted drop push up": "Pompes sautées en contrebas lestées",
  "weighted lunge with swing": "Fente lestée avec swing",
  "weighted muscle up (on bar)": "Muscle-up lesté à la barre",
  "weighted one hand pull up": "Traction à une main lestée",
  "weighted russian twist": "Rotation russe lestée",
  "weighted straight bar dip": "Dips lestés sur barre droite",
  "weighted stretch lunge": "Fente étirée lestée",
  "weighted three bench dips": "Dips entre trois bancs lestés",
  "world greatest stretch": "World's greatest stretch (fente avec rotation)",
  "stationary bike run": "Vélo d'appartement, allure soutenue",
  "cable standing cross-over high reverse fly": "Oiseau haut croisé debout (poulie)",
  "cable cross-over revers fly": "Oiseau croisé (poulie)",
  "cable cross-over lateral pulldown": "Tirage vertical croisé (poulie)",
  "cable standing up straight crossovers": "Crossover debout, buste droit (poulie)",
  "barbell decline close grip to skull press": "Développé prise serrée vers le front décliné (barre)",
  "dumbbell lying elbow press": "Développé des coudes allongé (haltères)",
  "hyght dumbbell fly": "Écarté Hyght (haltères)",
  "impossible dips": "Dips impossibles (sur les coudes)",
  "cocoons": "Crunch cocon", "otis up": "Otis-up (sit-up lesté)", "sit-up v. 2": "Sit-up", "isometric wipers": "Essuie-glaces isométriques",
};

const DIAG = process.argv.includes("--diag");
const restesDiag = {}, exemplesDiag = {};
const surInconnu = DIAG ? (r, nom) => r.forEach((w) => { restesDiag[w] = (restesDiag[w] || 0) + 1; (exemplesDiag[w] ||= []).push(nom); }) : undefined;
const nommer = creerNommeur({ surInconnu, mouvements: MOUVEMENTS_EDB, qualifs: QUALIFS_EDB, attributs: ATTRIBUTS_EDB, vides: VIDES_EDB, materielTxt: MATERIEL_TXT, avant });

/* ---------------- classement ---------------- */
function categorieDe(n, x) {
  if (x.body_part === "cardio") return "cardio";
  if (/\bstretch\b|\bpose\b|yoga|\bsphinx\b|upward facing dog/.test(n)) return "stretching";
  return "strength";
}
function patronDe(n, prim, cat) {
  if (cat === "cardio") return "cardio";
  if (cat === "stretching") return null;
  if (/lunge|split squat|step up|step-up/.test(n)) return "fente";
  if (/squat|leg press|hack/.test(n)) return "squat";
  if (/deadlift|good morning|hip thrust|bridge|swing|clean|snatch|pull through|hyperextension|back extension/.test(n)) return "charniere_hanche";
  if (/pull ?up|chin ?up|pulldown|muscle up|lever pull/.test(n)) return "tirage_vertical";
  if (/\brow\b|face pull|reverse fly|rear delt/.test(n)) return "tirage_horizontal";
  if (prim === "biceps") return "flexion_bras";
  if (prim === "triceps") return "extension_bras";
  if (prim === "pectoraux") return /fly|crossover|cross over|squeeze/.test(n) ? "poussee_horizontale" : "poussee_horizontale";
  if (prim === "epaules") return /press|push|handstand/.test(n) ? "poussee_verticale" : null;
  if (["quadriceps", "ischios", "mollets", "adducteurs", "abducteurs", "fessiers"].includes(prim)) return "isolation_jambe";
  if (prim === "abdominaux" || prim === "lombaires") return "gainage";
  return null;
}
const ISOLATION = /curl|raise|fly|kickback|extension|pushdown|shrug|crunch|twist|pullover|abduction|adduction|wrist|calf|side bend|lateral/;
function typeDe(n, prim, cat) {
  if (cat === "stretching") return "mobilite";
  if (cat === "cardio" || /jump|burpee|hop|bound|sprint|skater/.test(n)) return "cardio";
  if (prim === "abdominaux") return "gainage";
  if (/clean|snatch|jerk|deadlift|squat|bench press|military press|lever|planche|maltese/.test(n)) return "force";
  if (ISOLATION.test(n) && !/press|row|squat|lunge|deadlift|dip|push up|pull up|chin up/.test(n)) return "isolation";
  return "hypertrophie";
}
/** Niveau ESTIMÉ (le jeu n'en donne pas) : base selon le matériel, ajusté par des marqueurs explicites du nom. */
function niveauDe(n, eq, cat) {
  if (cat === "stretching") return 1;
  let v = { barbell: 3, "olympic barbell": 4, "trap bar": 3, "smith machine": 2, "leverage machine": 2, cable: 2, assisted: 1, "sled machine": 2 }[eq] || 2;
  if (/\b(one|single) (arm|leg)|one legged|pistol|archer|unilateral/.test(n)) v += 1;
  if (/clean|snatch|jerk|muscle up|handstand|plyo|depth jump|clap|dragon/.test(n)) v += 1;
  if (/planche|lever|maltese|flag|skin the cat/.test(n)) v = 5;
  if (/assisted|kneeling|on knees|wall push|incline push/.test(n)) v -= 1;
  return Math.max(1, Math.min(5, v));
}
const LIB_TYPE = { force: "Exercice de force", hypertrophie: "Exercice polyarticulaire", isolation: "Exercice d'isolation",
  gainage: "Exercice de gainage / abdominaux", cardio: "Exercice cardio / pliométrique", mobilite: "Étirement / mobilité" };
const LIB_MUSCLE = { pectoraux: "pectoraux", dorsaux: "dos", trapezes: "trapèzes", epaules: "épaules", biceps: "biceps",
  triceps: "triceps", avant_bras: "avant-bras", abdominaux: "abdominaux", lombaires: "lombaires", quadriceps: "quadriceps",
  ischios: "ischio-jambiers", fessiers: "fessiers", adducteurs: "adducteurs", abducteurs: "abducteurs", mollets: "mollets",
  corps_entier: "corps entier" };

/* ---------------- doublons ---------------- */
const VIDES_CLE = new Set(["the", "with", "a", "on", "to", "and", "of", "v", "2", "3"]);
const cleEn = (s) => singulier(norm(String(s)).replace(/-/g, " ")).split(" ").filter((w) => w && !VIDES_CLE.has(w)).sort().join(" ");
const VIDES_FR = new Set(["a", "la", "le", "les", "de", "du", "des", "au", "aux", "avec", "en", "sur", "l", "d", "et"]);
const cleFr = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim()
  .split(" ").filter((w) => w && !VIDES_FR.has(w)).map((w) => w.replace(/s$/, "")).sort().join(" ");

const parEn = new Map();
const parFr = new Map();
for (const e of EXISTANTS) {
  const ens = [...(e.nomsAlternatifs || [])];
  if (e.slug && /^wger-/.test(e.id)) ens.push(e.slug.replace(/-/g, " "));
  if (/^fedb-/.test(e.id) && !(e.nomsAlternatifs || []).length) ens.push(e.nom);
  for (const n of ens) if (!parEn.has(cleEn(n))) parEn.set(cleEn(n), e);
  if (!parFr.has(cleFr(e.nom))) parFr.set(cleFr(e.nom), e);
}

/* Équivalences vérifiées à la main (nom anglais nettoyé → fiche existante) :
   même mouvement et même matériel, écrits différemment dans les deux jeux. */
const EQUIVALENCES = {
  "barbell bench press": "developpe-couche-barre", "barbell full squat": "squat-barre", "barbell deadlift": "souleve-terre-barre",
  "push-up": "pompes", "pull-up": "tractions", "dumbbell bench press": "developpe-couche-halteres",
  "dumbbell incline bench press": "developpe-incline-halteres", "barbell incline bench press": "developpe-incline-barre",
  "barbell romanian deadlift": "souleve-terre-roumain-barre", "dumbbell lateral raise": "elevations-laterales-halteres",
  "barbell curl": "curl-barre", "dumbbell hammer curl": "curl-marteau", "lever leg extension": "leg-extension",
  "lever seated leg curl": "leg-curl-assis", "barbell glute bridge": "pont-fessier",
  "cable pulldown": "tirage-vertical-poulie",
  "cable triceps pushdown (v-bar)": "extension-triceps-poulie", "sled 45° leg press": "presse-cuisses",
  "front plank": "gainage-frontal", "barbell bent over row": "rowing-barre", "rocky pull-up pulldown": "fedb-rocky-pull-ups-pulldowns",
  "dumbbell zottman preacher curl": "fedb-zottman-preacher-curl", "cable lying close grip curl": "fedb-lying-close-grip-bar-curl-on-high-pulley",
  "cable one arm curl": "fedb-standing-one-arm-cable-curl", "barbell standing back wrist curl": "fedb-standing-palms-up-barbell-behind-the-back-wrist-curl",
  // Revue manuelle des quasi-doublons (même mouvement, même matériel), nov. 2026 :
  "barbell wide bench press": "fedb-wide-grip-barbell-bench-press",
  "ez-bar close-grip bench press": "fedb-close-grip-ez-bar-press",
  "standing behind neck press": "fedb-standing-barbell-press-behind-neck",
  "barbell decline wide-grip press": "fedb-wide-grip-decline-barbell-bench-press",
  "dumbbell one arm bench fly": "fedb-one-arm-flat-bench-dumbbell-flye",
  "barbell front raise and pullover": "fedb-front-raise-and-pullover",
  "calf push stretch with hands against wall": "fedb-calf-stretch-hands-against-wall",
  "sled 45° calf press": "fedb-calf-press-on-the-leg-press-machine",
  "barbell standing rocking leg calf raise": "fedb-rocking-standing-calf-raise",
  "dumbbell lying one arm pronated triceps extension": "fedb-one-arm-pronated-dumbbell-triceps-extension",
  "dumbbell lying one arm supinated triceps extension": "fedb-one-arm-supinated-dumbbell-triceps-extension",
  "dumbbell rotation reverse fly": "fedb-reverse-flyes-with-external-rotation",
  "hanging straight leg raise": "fedb-hanging-leg-raise",
  "dumbbell lying external shoulder rotation": "fedb-external-rotation",
  "cable standing shoulder external rotation": "fedb-external-rotation-with-cable",
  "cable low seated row": "fedb-seated-cable-rows",
  "dumbbell one arm bent-over row": "rowing-haltere-unilateral",
  "barbell press sit-up": "fedb-press-sit-up",
  "barbell wide squat": "fedb-wide-stance-barbell-squat",
  "cable lat pulldown full range of motion": "fedb-full-range-of-motion-lat-pulldown",
  "cable wide grip rear pulldown behind neck": "fedb-wide-grip-pulldown-behind-the-neck",
  "dumbbell seated shoulder press": "developpe-epaules-halteres",
  "dumbbell bench seated press": "developpe-epaules-halteres",
  "kettlebell seated two arm military press": "fedb-kettlebell-seated-press", "dumbbell goblet squat": "goblet-squat",
};

/* ---------------- passe principale ---------------- */
const vusInternes = new Map();       // nom nettoyé → id gardé
const sortie = [];
const enrichissements = {};
const rapport = { total: brut.length, doublonsInternes: 0, fusionnes: 0, enrichis: 0, nouveaux: 0, cou: 0, nomsFr: 0, nomsManuels: 0, nomsEn: 0, collisions: 0 };
const nomsPris = new Set([...EXISTANTS.map((e) => cleFr(e.nom))]);
const idsPris = new Set(EXISTANTS.map((e) => e.id));

const tries = brut.slice().sort((a, b) => {
  // la version sans mention « (male) / v. 2 / pov » passe en premier
  const pa = /\((male|female|back pov|side pov)\)|v\.\s*\d/i.test(a.name) ? 1 : 0;
  const pb = /\((male|female|back pov|side pov)\)|v\.\s*\d/i.test(b.name) ? 1 : 0;
  return pa - pb || String(a.id).localeCompare(String(b.id));
});

for (const x of tries) {
  const propre = nomPropre(x.name);
  const n = norm(propre);
  if (x.body_part === "neck") { rapport.cou++; continue; }
  const cleInterne = cleEn(propre) + "|" + x.equipment;
  if (vusInternes.has(cleInterne)) { rapport.doublonsInternes++; continue; }
  vusInternes.set(cleInterne, x.id);

  const prim = CIBLE[x.target];
  if (!prim) continue;
  const cat = categorieDe(n, x);
  let base = propre;
  // « dumbbell lying extension » visant les triceps : le mot manquant est implicite.
  if (prim === "triceps" && /\bextension\b/.test(n) && !/tricep/.test(n)) base = base.replace(/\bextension\b/i, "triceps extension");
  const manuel = NOMS_VERIFIES[propre.toLowerCase()] || null;
  const fr = manuel || nommer(base, x.equipment, cat);
  const stepsFr = ((x.instruction_steps && x.instruction_steps.fr) || []).map((s) => String(s).replace(/\s+/g, " ").trim()).filter(Boolean);

  // Fiche déjà au catalogue ? → on l'enrichit, on ne la duplique pas.
  const cible = (EQUIVALENCES[propre.toLowerCase()] && EXISTANTS.find((e) => e.id === EQUIVALENCES[propre.toLowerCase()]))
    || parEn.get(cleEn(propre)) || (fr && parFr.get(cleFr(fr)));
  if (cible) {
    rapport.fusionnes++;
    if (!(cible.instructions || []).length && stepsFr.length >= 2 && !enrichissements[cible.id]) {
      enrichissements[cible.id] = { instructions: stepsFr, nomEn: propre, sourceId: x.id };
      rapport.enrichis++;
    }
    continue;
  }

  let nom = fr || propre;
  let nomFrVerifie = Boolean(fr);
  if (fr && nomsPris.has(cleFr(fr))) {
    // Deux exercices différents traduits pareil : la traduction a perdu un détail → nom anglais, à vérifier.
    rapport.collisions++; nom = propre; nomFrVerifie = false;
  }
  if (nomFrVerifie) { rapport.nomsFr++; if (manuel) rapport.nomsManuels++; } else rapport.nomsEn++;
  nomsPris.add(cleFr(nom));

  const secondaires = [...new Set((x.secondary_muscles || []).map((m) => SECONDAIRE[m]).filter((m) => m && m !== prim))];
  const type = typeDe(n, prim, cat);
  const patron = patronDe(n, prim, cat);
  const slug = n.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let id = `edb-${x.id}-${slug}`.slice(0, 80);
  while (idsPris.has(id)) id += "-b";
  idsPris.add(id);
  const desc = `${LIB_TYPE[type]} — muscle principal : ${LIB_MUSCLE[prim]}${secondaires.length ? ` ; secondaires : ${secondaires.map((m) => LIB_MUSCLE[m]).join(", ")}` : ""}.`;
  sortie.push({
    id, slug, nom, nomsAlternatifs: nomFrVerifie ? [propre] : [], nomEn: propre, nomFrVerifie,
    description: desc, instructions: stepsFr, erreurs: [], respiration: "", securite: "",
    difficulte: niveauDe(n, x.equipment, cat), niveauEstime: true, typeExercice: type, patron,
    chaine: /machine|cable|lever|sled|smith/.test(x.equipment) ? "ouverte" : "fermee",
    unilateral: /\b(one|single) (arm|leg)\b|one legged|unilateral/.test(n),
    musclesPrincipaux: [prim], musclesSecondaires: secondaires, musclesStabilisateurs: [],
    equipement: (() => {
      let q = MATERIEL[x.equipment] || ["autre"];
      if (/\b(stability|exercise) ball\b/.test(n) && !q.includes("swiss_ball")) q = [...q.filter((z) => z !== "autre"), "swiss_ball"];
      if (/\bbands?\b/.test(n) && !q.includes("elastiques")) q = [...q, "elastiques"];
      return q;
    })(), equipementsAlternatifs: [],
    position: "", amplitude: "complète", tempoDefaut: type === "force" ? "2-1-1" : "2-0-1",
    repsPertinent: cat === "cardio" ? null : type === "force" ? [4, 8] : type === "isolation" ? [10, 15] : [8, 12],
    dureeSec: cat === "cardio" ? 600 : cat === "stretching" ? 30 : null,
    chargeRelative: "moyen", contreIndications: [], tags: ["exercises-dataset", x.body_part, x.target],
    media: { miniature: null, video: null }, statut: "importe", auteur: "exercises-dataset (MIT)",
    revision: new Date().toISOString().slice(0, 10), source: "exercises-dataset", licence: "MIT (données ; médias exclus)", sourceId: x.id,
  });
  rapport.nouveaux++;
}

sortie.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
// Fichier compact : les champs à leur valeur par défaut sont retirés et
// restaurés au chargement (completerFicheEdb, src/data/exercises.js).
const DEFAUTS = { erreurs: [], respiration: "", securite: "", musclesStabilisateurs: [], equipementsAlternatifs: [], position: "",
  amplitude: "complète", chargeRelative: "moyen", contreIndications: [], media: { miniature: null, video: null }, statut: "importe",
  auteur: "exercises-dataset (MIT)", source: "exercises-dataset", licence: "MIT (données ; médias exclus)", niveauEstime: true, dureeSec: null };
for (const e of sortie) for (const [k, v] of Object.entries(DEFAUTS)) if (JSON.stringify(e[k]) === JSON.stringify(v)) delete e[k];
const fichier = path.join(RACINE, "src/data/exercises-edb.js");
const entete = `// @ts-nocheck
/**
 * Exercices importés de exercises-dataset (https://github.com/hasaneyldrm/exercises-dataset).
 * DONNÉES sous licence MIT (© 2026 Hasan Emir Yıldırım) : noms, muscles, matériel,
 * consignes françaises. Les médias (© Gym visual) ne sont PAS repris.
 * FICHIER GÉNÉRÉ par scripts/importer-exercises-dataset.mjs — ne pas modifier à la main.
 *
 * ${rapport.nouveaux} nouveaux exercices (${rapport.nomsFr} noms français dont ${rapport.nomsManuels} vérifiés à la main, ${rapport.nomsEn} noms anglais conservés).
 * ${rapport.fusionnes} exercices déjà au catalogue (fusionnés), dont ${rapport.enrichis} fiches enrichies de consignes françaises.
 * Écartés : ${rapport.doublonsInternes} doublons internes (autre angle, autre démonstrateur, « v. 2 »), ${rapport.cou} exercices de cou.
 * Niveau ESTIMÉ par règles (absent de la source) : champ niveauEstime.
 */
`;
fs.writeFileSync(fichier, `${entete}export const EDB_EXERCISES = ${JSON.stringify(sortie)};\n\n/** Consignes françaises ajoutées à des fiches existantes qui n'en avaient pas. */\nexport const EDB_ENRICHISSEMENTS = ${JSON.stringify(enrichissements)};\n`);
console.log(JSON.stringify(rapport));
if (process.argv.includes("--anglais")) console.log(sortie.filter((e) => !e.nomFrVerifie).map((e) => e.nom).sort().join(" | "));
if (DIAG) console.log("SANS MOUVEMENT :", [...new Set(exemplesDiag["∅mouvement"] || [])].join(" | "));
if (DIAG) for (const [w, k] of Object.entries(restesDiag).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`${w}:${k} → ${[...new Set(exemplesDiag[w])].slice(0, 4).join(" | ")}`);
