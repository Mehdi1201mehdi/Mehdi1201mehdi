#!/usr/bin/env node
// @ts-check
/**
 * Import des MÉTADONNÉES de free-exercise-db (https://github.com/yuhonas/free-exercise-db,
 * Unlicense / domaine public) vers src/data/exercises-fedb.js.
 *
 * Ce qui est importé : des FAITS — nom anglais, muscles principaux et
 * secondaires, matériel, niveau, mécanique, catégorie. Ce qui ne l'est PAS :
 * les textes d'instructions et les images. Le jeu de données dérive de
 * wrkout/exercises.json, dont la provenance de ces textes et photos n'est pas
 * documentée ; on ne les redistribue pas tant qu'elle ne l'est pas. Les fiches
 * importées s'affichent donc sans consignes (l'app le dit), avec le schéma
 * anatomique des muscles.
 *
 * Nom français : table NOMS_VERIFIES (relue à la main), sinon règles
 * (mouvement + qualificatifs + matériel).
 * Quand un mot du nom anglais n'est pas reconnu, on GARDE le nom anglais
 * plutôt que d'inventer une traduction approximative. Le nom anglais reste
 * toujours dans `nomsAlternatifs` (recherche bilingue).
 *
 * Doublons : un exercice déjà présent dans le catalogue (même nom anglais
 * normalisé, même nom français, ou correspondance déclarée ci-dessous) n'est
 * pas importé une seconde fois.
 *
 * Usage : node scripts/importer-free-exercise-db.mjs <chemin/exercises.json>
 * (outil de développement : l'application, elle, reste sans étape de build).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { creerNommeur, norm, singulier } from "./lib/noms-fr.mjs";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2];
if (!source) { console.error("Usage : node scripts/importer-free-exercise-db.mjs <exercises.json>"); process.exit(1); }
const brut = JSON.parse(fs.readFileSync(source, "utf8"));

// CATALOGUE (avant chargement des extensions) = exercices maison + salle.
const { CATALOGUE, EXERCISES_BY_ID } = await import(path.join(RACINE, "src/data/exercises.js"));
const { EXTRA_EXERCISES } = await import(path.join(RACINE, "src/data/exercises-extra.js"));
const EXISTANTS = [...CATALOGUE, ...EXTRA_EXERCISES];

/* ---------- correspondances de champs ---------- */
const MUSCLES = {
  abdominals: "abdominaux", hamstrings: "ischios", adductors: "adducteurs", quadriceps: "quadriceps",
  biceps: "biceps", shoulders: "epaules", chest: "pectoraux", "middle back": "dorsaux", calves: "mollets",
  glutes: "fessiers", "lower back": "lombaires", lats: "dorsaux", triceps: "triceps", traps: "trapezes",
  forearms: "avant_bras", abductors: "abducteurs",
  // « neck » : aucun muscle équivalent dans l'app → exercice non importé (pas d'approximation).
};
const MATERIEL = {
  barbell: ["barre"], dumbbell: ["halteres"], cable: ["poulie"], machine: ["machine_guidee"],
  kettlebells: ["kettlebell"], bands: ["elastiques"], "medicine ball": ["medecine_ball"],
  "exercise ball": ["swiss_ball"], "foam roll": ["rouleau"], "e-z curl bar": ["barre_ez"],
  "body only": ["poids_du_corps"], other: ["autre"],
};
const MATERIEL_TXT = {
  barbell: "barre", dumbbell: "haltères", cable: "poulie", machine: "machine", kettlebells: "kettlebell",
  bands: "élastique", "medicine ball": "médecine-ball", "exercise ball": "swiss ball", "foam roll": "rouleau",
  "e-z curl bar": "barre EZ",
};
const NIVEAU = { beginner: 2, intermediate: 3, expert: 4 };

// Noms vérifiés À LA MAIN pour les fiches que les règles ne savent pas nommer
// (mot inconnu, nom propre, exercice composé). Clé = nom anglais exact du jeu
// de données. Les termes consacrés en salle restent tels quels (Pallof press,
// Turkish get-up, Zercher) ; les exercices trop spécialisés pour être traduits
// sans risque (strongman, gammes d'athlétisme) gardent leur nom anglais.
const NOMS_VERIFIES = {
  "3/4 Sit-Up": "Sit-up 3/4", "90/90 Hamstring": "Étirement des ischio-jambiers 90/90",
  "Adductor/Groin": "Étirement des adducteurs", "Advanced Kettlebell Windmill": "Moulin avancé (kettlebell)",
  "All Fours Quad Stretch": "Étirement des quadriceps à quatre pattes", "Alternate Heel Touchers": "Touche-talons alternés",
  "Alternate Leg Diagonal Bound": "Bonds en diagonale jambes alternées", "Alternating Renegade Row": "Rowing renegade alterné (haltères)",
  "Ankle On The Knee": "Étirement du piriforme (cheville sur le genou)", "Around The Worlds": "Tour du monde (haltères)",
  "Axle Deadlift": "Soulevé de terre à l'axle (barre épaisse)", "Back Flyes - With Bands": "Oiseau (élastique)",
  "Backward Drag": "Traction de traîneau à reculons", "Backward Medicine Ball Throw": "Lancer arrière (médecine-ball)",
  "Balance Board": "Planche d'équilibre", "Band Good Morning (Pull Through)": "Good morning (élastique)",
  "Band Pull Apart": "Écartés à l'élastique (band pull-apart)", "Barbell Ab Rollout - On Knees": "Roulette abdominale à genoux (barre)",
  "Barbell Curls Lying Against An Incline": "Curl allongé sur banc incliné (barre)", "Barbell Guillotine Bench Press": "Développé guillotine (barre)",
  "Barbell Walking Lunge": "Fentes marchées (barre)", "Battling Ropes": "Battle ropes (cordes ondulatoires)",
  "Bear Crawl Sled Drags": "Traction de traîneau en marche de l'ours", "Behind Head Chest Stretch": "Étirement des pectoraux mains derrière la tête",
  "Bench Press - Powerlifting": "Développé couché style powerlifting (barre)", "Bent-Arm Barbell Pullover": "Pull-over bras fléchis (barre)",
  "Bent-Arm Dumbbell Pullover": "Pull-over bras fléchis (haltère)", "Bent Over Dumbbell Rear Delt Raise With Head On Bench": "Oiseau buste penché tête sur le banc (haltères)",
  "Bent Over Low-Pulley Side Lateral": "Élévation latérale buste penché (poulie basse)", "Bent Over One-Arm Long Bar Row": "Rowing unilatéral barre longue (landmine)",
  "Bent Over Two-Arm Long Bar Row": "Rowing barre longue (landmine)", "Board Press": "Développé couché sur planches (board press)",
  "Body Tricep Press": "Extension des triceps au poids du corps", "Bodyweight Flyes": "Écarté au poids du corps",
  "Bodyweight Mid Row": "Rowing au poids du corps", "Bodyweight Walking Lunge": "Fentes marchées",
  "Bosu Ball Cable Crunch With Side Bends": "Crunch à la poulie sur Bosu avec flexions latérales", "Box Jump (Multiple Response)": "Sauts sur box enchaînés",
  "Bradford/Rocky Presses": "Développé Bradford (barre)", "Cable Iron Cross": "Croix de fer à la poulie",
  "Calf-Machine Shoulder Shrug": "Haussement d'épaules (machine à mollets)", "Calf Press On The Leg Press Machine": "Extension des mollets à la presse à cuisses",
  "Calf Stretch Elbows Against Wall": "Étirement des mollets coudes au mur", "Calf Stretch Hands Against Wall": "Étirement des mollets mains au mur",
  "Calves-SMR": "Auto-massage des mollets (rouleau)", "Car Drivers": "Volant avec disque (car drivers)",
  "Carioca Quick Step": "Pas croisés rapides (carioca)", "Cat Stretch": "Étirement du chat",
  "Catch and Overhead Throw": "Réception et lancer au-dessus de la tête (médecine-ball)", "Chair Leg Extended Stretch": "Étirement jambe tendue sur chaise",
  "Chair Lower Back Stretch": "Étirement du bas du dos sur chaise", "Chair Squat": "Squat sur chaise",
  "Chair Upper Body Stretch": "Étirement du haut du corps sur chaise", "Chest Push from 3 point stance": "Poussée poitrine depuis un appui à trois points (médecine-ball)",
  "Chest Push (multiple response)": "Poussées poitrine enchaînées (médecine-ball)", "Chest Push (single response)": "Poussée poitrine (médecine-ball)",
  "Chest Push with Run Release": "Poussée poitrine avec départ en course (médecine-ball)", "Child's Pose": "Posture de l'enfant",
  "Clean Deadlift": "Soulevé de terre d'épaulé", "Clean Pull": "Tirage d'épaulé", "Clean Shrug": "Haussement d'épaules d'épaulé",
  "Clean and Press": "Épaulé-développé", "Clean from Blocks": "Épaulé depuis des blocs", "Clock Push-Up": "Pompes en horloge",
  "Close-Grip Push-Up off of a Dumbbell": "Pompes prise serrée sur un haltère", "Cocoons": "Crunch cocon",
  "Cross-Body Crunch": "Crunch croisé", "Cross Body Hammer Curl": "Curl marteau croisé (haltère)",
  "Cross Over - With Bands": "Écarté croisé (élastique)", "Crossover Reverse Lunge": "Fente arrière croisée",
  "Crunch - Hands Overhead": "Crunch bras au-dessus de la tête", "Crunch - Legs On Exercise Ball": "Crunch jambes sur swiss ball",
  "Cuban Press": "Développé cubain", "Dancer's Stretch": "Étirement du danseur", "Depth Jump Leap": "Saut en contrebas suivi d'un bond",
  "Dips - Chest Version": "Dips (version pectoraux)", "Dips - Triceps Version": "Dips (version triceps)",
  "Donkey Calf Raises": "Extension des mollets à l'âne (donkey)", "Double Leg Butt Kick": "Talons-fesses sautés pieds joints",
  "Dumbbell Lying Pronation": "Pronation allongé (haltère)", "Dumbbell Lying Supination": "Supination allongé (haltère)",
  "Dumbbell Scaption": "Élévation dans le plan de l'omoplate (scaption, haltères)", "Dynamic Back Stretch": "Étirement dynamique du dos",
  "Elbow to Knee": "Crunch coude-genou", "Elbows Back": "Étirement coudes en arrière", "Elevated Back Lunge": "Fente arrière pied avant surélevé",
  "Exercise Ball Pull-In": "Rapprochement des genoux sur swiss ball", "Extended Range One-Arm Kettlebell Floor Press": "Développé au sol unilatéral, grande amplitude (kettlebell)",
  "Farmer's Walk": "Marche du fermier", "Fast Skipping": "Montées de genoux rapides (skipping)", "Finger Curls": "Curl des doigts (barre)",
  "Forward Drag with Press": "Traction de traîneau vers l'avant avec développé", "Frankenstein Squat": "Squat Frankenstein",
  "Freehand Jump Squat": "Squat sauté au poids du corps", "Frog Hops": "Sauts de grenouille", "Frog Sit-Ups": "Sit-up grenouille",
  "Front Cone Hops (or hurdle hops)": "Sauts de plots vers l'avant", "Front Raise And Pullover": "Élévation frontale et pull-over",
  "Front Squat (Clean Grip)": "Squat avant prise d'épaulé (barre)", "Full Range-Of-Motion Lat Pulldown": "Tirage vertical amplitude complète",
  "Gironda Sternum Chins": "Traction Gironda vers le sternum", "Good Morning off Pins": "Good morning depuis les sécurités (barre)",
  "Gorilla Chin/Crunch": "Traction-crunch gorille", "Groin and Back Stretch": "Étirement des adducteurs et du dos",
  "Hammer Grip Incline DB Bench Press": "Développé incliné prise neutre (haltères)", "Handstand Push-Ups": "Pompes en équilibre sur les mains",
  "Hang Clean - Below the Knees": "Épaulé suspendu sous les genoux", "Hang Snatch - Below Knees": "Arraché suspendu sous les genoux",
  "Hanging Pike": "Relevé de jambes carpé suspendu", "Heavy Bag Thrust": "Poussée de sac de frappe", "High Cable Curls": "Curl à la poulie haute",
  "Hug Knees To Chest": "Genoux contre la poitrine (étirement)", "Hurdle Hops": "Sauts de haies",
  "Hyperextensions (Back Extensions)": "Extension lombaire au banc", "Hyperextensions With No Hyperextension Bench": "Extension lombaire sans banc",
  "IT Band and Glute Stretch": "Étirement de la bandelette ilio-tibiale et des fessiers", "Inchworm": "Chenille (inchworm)",
  "Incline Dumbbell Flyes - With A Twist": "Écarté incliné avec rotation (haltères)", "Incline Push-Up Medium": "Pompes inclinées prise moyenne",
  "Intermediate Groin Stretch": "Étirement des adducteurs, niveau intermédiaire", "Intermediate Hip Flexor and Quad Stretch": "Étirement des fléchisseurs de hanche et des quadriceps",
  "Inverted Row with Straps": "Rowing inversé aux sangles", "Isometric Chest Squeezes": "Contraction isométrique des pectoraux",
  "Jackknife Sit-Up": "Sit-up en canif (jackknife)", "Janda Sit-Up": "Sit-up Janda", "Jefferson Squats": "Squat Jefferson",
  "Kettlebell Dead Clean": "Épaulé depuis le sol (kettlebell)", "Kettlebell Figure 8": "Huit autour des jambes (kettlebell)",
  "Kettlebell Halo": "Halo (kettlebell)", "Kettlebell Pass Between The Legs": "Passage entre les jambes (kettlebell)",
  "Kettlebell Seesaw Press": "Développé alterné en balancier (kettlebells)", "Kettlebell Turkish Get-Up (Lunge style)": "Turkish get-up style fente (kettlebell)",
  "Kettlebell Turkish Get-Up (Squat style)": "Turkish get-up style squat (kettlebell)", "Kipping Muscle Up": "Muscle-up avec kipping",
  "Knee Across The Body": "Étirement genou croisé devant le corps", "Knee/Hip Raise On Parallel Bars": "Relevé de genoux aux barres parallèles",
  "Knee Tuck Jump": "Saut genoux-poitrine", "Kneeling Cable Crunch With Alternating Oblique Twists": "Crunch à genoux à la poulie avec rotations alternées",
  "Kneeling Forearm Stretch": "Étirement des avant-bras à genoux", "Landmine 180's": "Rotations à 180° (landmine)",
  "Lateral Cone Hops": "Sauts latéraux par-dessus des plots", "Leg-Up Hamstring Stretch": "Étirement des ischio-jambiers jambe levée",
  "Leverage High Row": "Rowing haut (machine)", "Leverage Iso Row": "Rowing unilatéral (machine)", "Log Lift": "Log lift (rondin)",
  "Low Cable Crossover": "Crossover à la poulie basse", "Low Cable Triceps Extension": "Extension des triceps à la poulie basse",
  "Low Pulley Row To Neck": "Rowing vers le cou (poulie basse)", "Lunge Pass Through": "Fente avec passage sous la jambe (kettlebell)",
  "Lying Bent Leg Groin": "Étirement des adducteurs allongé jambes fléchies", "Lying Cambered Barbell Row": "Rowing allongé (barre cambrée)",
  "Lying Close-Grip Barbell Triceps Extension Behind The Head": "Extension des triceps allongé derrière la tête, prise serrée (barre)",
  "Lying Close-Grip Barbell Triceps Press To Chin": "Extension des triceps allongé vers le menton, prise serrée (barre)",
  "Lying High Bench Barbell Curl": "Curl allongé sur banc haut (barre)", "Lying T-Bar Row": "Rowing T-bar allongé",
  "Medicine Ball Full Twist": "Rotation complète du buste (médecine-ball)", "Medicine Ball Scoop Throw": "Lancer en cuillère (médecine-ball)",
  "Middle Back Shrug": "Haussement d'épaules pour le milieu du dos", "Middle Back Stretch": "Étirement du milieu du dos",
  "Monster Walk": "Marche du monstre (élastique)", "Muscle Snatch": "Arraché musculaire (muscle snatch)",
  "Natural Glute Ham Raise": "Glute-ham raise au poids du corps (nordique)", "Neck Press": "Développé vers le cou (barre)",
  "Olympic Squat": "Squat olympique (barre haute)", "On-Your-Back Quad Stretch": "Étirement des quadriceps sur le dos",
  "One-Arm Long Bar Row": "Rowing unilatéral barre longue", "One-Arm Side Laterals": "Élévation latérale unilatérale (haltère)",
  "One-Legged Cable Kickback": "Kickback fessier à la poulie, une jambe", "One Arm Against Wall": "Étirement du grand dorsal, un bras au mur",
  "One Handed Hang": "Suspension à une main", "One Knee To Chest": "Genou contre la poitrine (étirement)",
  "Overhead Stretch": "Étirement bras au-dessus de la tête", "Pallof Press": "Pallof press (anti-rotation)", "Pallof Press With Rotation": "Pallof press avec rotation",
  "Palms-Down Wrist Curl Over A Bench": "Curl des poignets en pronation sur banc (barre)", "Parallel Bar Dip": "Dips aux barres parallèles",
  "Pelvic Tilt Into Bridge": "Bascule du bassin vers le pont", "Physioball Hip Bridge": "Pont fessier sur swiss ball",
  "Pin Presses": "Développé depuis les sécurités (pin press)", "Platform Hamstring Slides": "Glissés ischio-jambiers",
  "Plie Dumbbell Squat": "Squat plié (haltère)", "Plyo Kettlebell Pushups": "Pompes pliométriques sur kettlebells", "Plyo Push-up": "Pompes pliométriques",
  "Posterior Tibialis Stretch": "Étirement du tibial postérieur", "Power Clean from Blocks": "Épaulé en puissance depuis des blocs",
  "Power Jerk": "Jeté en puissance", "Power Snatch from Blocks": "Arraché en puissance depuis des blocs",
  "Preacher Hammer Dumbbell Curl": "Curl marteau au pupitre (haltère)", "Press Sit-Up": "Sit-up avec développé", "Prowler Sprint": "Sprint au prowler",
  "Push-Ups - Close Triceps Position": "Pompes mains serrées (triceps)", "Push-Ups With Feet On An Exercise Ball": "Pompes pieds sur swiss ball",
  "Push Up to Side Plank": "Pompe vers planche latérale", "Pushups (Close and Wide Hand Positions)": "Pompes en alternant mains serrées et écartées",
  "Reverse Flyes With External Rotation": "Oiseau avec rotation externe (haltères)", "Ring Dips": "Dips aux anneaux", "Rocket Jump": "Saut fusée",
  "Rocking Standing Calf Raise": "Extension des mollets debout avec bascule", "Rope Climb": "Grimper à la corde", "Rope Jumping": "Corde à sauter",
  "Round The World Shoulder Stretch": "Étirement des épaules en tour du monde", "Runner's Stretch": "Étirement du coureur",
  "Sandbag Load": "Chargement de sac de sable", "Scapular Pull-Up": "Traction scapulaire", "Scissor Kick": "Battements de jambes en ciseaux",
  "Scissors Jump": "Sauts en ciseaux", "Seated Hamstring and Calf Stretch": "Étirement des ischio-jambiers et des mollets, assis",
  "Seated Leg Tucks": "Relevé de genoux assis", "Seated Overhead Stretch": "Étirement bras au-dessus de la tête, assis",
  "Seated Triceps Press": "Extension des triceps assis au-dessus de la tête (haltère)", "See-Saw Press (Alternating Side Press)": "Développé alterné en balancier (haltères)",
  "Side-Lying Floor Stretch": "Étirement latéral allongé au sol", "Side Jackknife": "Canif latéral (jackknife)",
  "Side Standing Long Jump": "Saut latéral sans élan", "Side To Side Chins": "Traction d'un côté à l'autre",
  "Side to Side Box Shuffle": "Pas chassés latéraux sur box", "Single-Leg High Box Squat": "Squat sur une jambe sur box haute",
  "Single-Leg Hop Progression": "Sauts sur une jambe (progression)", "Single Leg Butt Kick": "Talons-fesses sur une jambe",
  "Sled Drag - Harness": "Traction de traîneau au harnais", "Sled Overhead Triceps Extension": "Extension des triceps au-dessus de la tête au traîneau",
  "Sled Reverse Flye": "Oiseau au traîneau", "Sled Row": "Rowing au traîneau", "Sledgehammer Swings": "Coups de masse sur pneu",
  "Smith Machine Hang Power Clean": "Épaulé suspendu en puissance (Smith)", "Snatch Deadlift": "Soulevé de terre d'arraché",
  "Snatch Pull": "Tirage d'arraché", "Snatch Shrug": "Haussement d'épaules d'arraché", "Snatch from Blocks": "Arraché depuis des blocs",
  "Spider Crawl": "Marche de l'araignée", "Spinal Stretch": "Étirement de la colonne", "Squat Jerk": "Jeté en squat",
  "Standing Barbell Press Behind Neck": "Développé nuque debout (barre)", "Standing Bradford Press": "Développé Bradford debout (barre)",
  "Standing Cable Lift": "Diagonale ascendante à la poulie (cable lift)", "Standing Dumbbell Straight-Arm Front Delt Raise Above Head": "Élévation frontale bras tendus au-dessus de la tête (haltère)",
  "Standing Front Barbell Raise Over Head": "Élévation frontale jusqu'au-dessus de la tête (barre)", "Standing Gastrocnemius Calf Stretch": "Étirement des gastrocnémiens debout",
  "Standing Hamstring and Calf Stretch": "Étirement des ischio-jambiers et des mollets, debout", "Standing Lateral Stretch": "Étirement latéral debout",
  "Standing Long Jump": "Saut en longueur sans élan", "Standing One-Arm Dumbbell Curl Over Incline Bench": "Curl unilatéral debout appuyé sur banc incliné (haltère)",
  "Standing Pelvic Tilt": "Bascule du bassin debout", "Standing Soleus And Achilles Stretch": "Étirement du soléaire et du tendon d'Achille, debout",
  "Standing Toe Touches": "Toucher des orteils debout", "Standing Towel Triceps Extension": "Extension des triceps debout avec serviette",
  "Star Jump": "Saut en étoile", "Step-up with Knee Raise": "Montée sur banc avec montée de genou", "Stomach Vacuum": "Vacuum abdominal",
  "Suspended Fallout": "Fallout aux sangles", "Suspended Push-Up": "Pompes aux sangles", "Suspended Reverse Crunch": "Crunch inversé aux sangles",
  "Suspended Row": "Rowing aux sangles", "Suspended Split Squat": "Squat fendu aux sangles", "Svend Press": "Svend press (disque serré)",
  "T-Bar Row with Handle": "Rowing T-bar avec poignée", "Tate Press": "Tate press (haltères)", "The Straddle": "Étirement jambes écartées",
  "Toe Touchers": "Touche-orteils (crunch)", "Trail Running/Walking": "Trail (course ou marche)", "Tricep Side Stretch": "Étirement latéral des triceps",
  "Triceps Pushdown - V-Bar Attachment": "Extension des triceps à la poulie (barre en V)", "Underhand Cable Pulldowns": "Tirage vertical prise supination (poulie)",
  "Upward Stretch": "Étirement vers le haut", "V-Bar Pulldown": "Tirage vertical (barre en V)", "V-Bar Pullup": "Traction (barre en V)",
  "Vertical Swing": "Swing vertical (haltère)", "Weighted Sissy Squat": "Sissy squat lesté", "Wide Stance Stiff Legs": "Soulevé de terre jambes tendues, écart large (barre)",
  "Wind Sprints": "Sprints fractionnés", "World's Greatest Stretch": "World's greatest stretch (fente avec rotation)",
  "Wrist Rotations with Straight Bar": "Rotations des poignets (barre)", "Yoke Walk": "Marche au joug (yoke)", "Zercher Squats": "Squat Zercher",
  "Zottman Preacher Curl": "Curl Zottman au pupitre",
  // Corrections : la règle « pushdown → extension des triceps » se trompe ici (grand dorsal).
  "Cable Incline Pushdown": "Pull-down bras tendus sur banc incliné (poulie)", "Glute Kickback": "Kickback fessier à quatre pattes",
  "Incline Inner Biceps Curl": "Curl incliné bras en dehors (haltères)", "Seated Dumbbell Inner Biceps Curl": "Curl assis bras en dehors (haltères)",
  "Standing Inner-Biceps Curl": "Curl debout bras en dehors (haltères)", "Groiners": "Pied à côté de la main en planche (groiners)",
  "Kettlebell Halo with Overhead Extension": "Halo avec extension au-dessus de la tête (kettlebell)",
  "Straight Raises on Incline Bench": "Élévations bras tendus sur banc incliné", "Shotgun Row": "Rowing unilatéral à la poulie (shotgun row)",
  "Lunge Sprint": "Sprint depuis une fente", "Speed Band Overhead Triceps": "Extension des triceps au-dessus de la tête, rapide (élastique)",
  "Chain Handle Extension": "Extension des triceps aux poignées à chaînes", "Sled Overhead Backward Walk": "Marche arrière au traîneau, bras au-dessus de la tête",
  "Reverse Band Power Squat": "Squat avec élastiques inversés (barre)", "One-Arm Open Palm Kettlebell Clean": "Épaulé unilatéral main ouverte (kettlebell)",
  "Open Palm Kettlebell Clean": "Épaulé main ouverte (kettlebells)", "Prone Manual Hamstring": "Leg curl allongé, résistance d'un partenaire",
  "Linear Depth Jump": "Saut en contrebas vers l'avant", "Snatch Balance": "Snatch balance (descente sous la barre à l'arraché)",
  "Ab Roller": "Roulette abdominale", "Butt Lift (Bridge)": "Pont fessier", "Smith Machine Decline Press": "Développé décliné (Smith)",
};

/* ---------- nom français par règles ---------- */
// Mouvements (le plus long d'abord) : motif anglais → [nom français, genre].
// Genre : m, f, mp (masculin pluriel), fp — sert à accorder les qualificatifs.
const nomFrancais = creerNommeur({ materielTxt: MATERIEL_TXT });

/* ---------- patron biomécanique (sert au catalogue et aux filtres) ---------- */
function patronDe(x, muscles) {
  const n = norm(x.name);
  if (x.category === "cardio") return "cardio";
  if (x.category === "stretching") return null;
  const p = muscles[0];
  if (/lunge|split squat|step up/.test(n)) return "fente";
  if (/squat|leg press/.test(n)) return "squat";
  if (/deadlift|good morning|hip thrust|bridge|swing|clean|snatch|pull through/.test(n)) return "charniere_hanche";
  if (/pull ?up|chin ?up|pulldown/.test(n)) return "tirage_vertical";
  if (/row|face pull/.test(n)) return "tirage_horizontal";
  if (p === "biceps" || /curl/.test(n) && p !== "ischios") return p === "ischios" ? "isolation_jambe" : "flexion_bras";
  if (p === "triceps") return "extension_bras";
  if (p === "pectoraux") return "poussee_horizontale";
  if (p === "epaules") return x.force === "push" && /press|jerk/.test(n) ? "poussee_verticale" : null;
  if (["quadriceps", "ischios", "mollets", "adducteurs", "abducteurs", "fessiers"].includes(p)) return x.mechanic === "compound" ? "squat" : "isolation_jambe";
  if (p === "abdominaux" || p === "lombaires") return "gainage";
  return null;
}
function typeDe(x, muscles) {
  if (x.category === "stretching") return "mobilite";
  if (x.category === "cardio" || x.category === "plyometrics") return "cardio";
  if (["strongman", "olympic weightlifting", "powerlifting"].includes(x.category)) return "force";
  if (muscles[0] === "abdominaux") return "gainage";
  if (x.mechanic === "isolation") return "isolation";
  return x.equipment === "barbell" ? "force" : "hypertrophie";
}
const LIB_TYPE = { force: "Exercice de force", hypertrophie: "Exercice polyarticulaire", isolation: "Exercice d'isolation",
  gainage: "Exercice de gainage / abdominaux", cardio: "Exercice cardio / pliométrique", mobilite: "Étirement / mobilité" };
const LIB_MUSCLE = { pectoraux: "pectoraux", dorsaux: "dorsaux", trapezes: "trapèzes", epaules: "épaules", biceps: "biceps",
  triceps: "triceps", avant_bras: "avant-bras", abdominaux: "abdominaux", lombaires: "lombaires", quadriceps: "quadriceps",
  ischios: "ischio-jambiers", fessiers: "fessiers", adducteurs: "adducteurs", abducteurs: "abducteurs", mollets: "mollets" };

/* ---------- doublons ---------- */
const cleEn = (s) => singulier(norm(s).replace(/-/g, " ")).split(" ").filter((w) => w && !["the", "with", "a", "on", "to", "and"].includes(w)).sort().join(" ");
const dejaEn = new Set();
const dejaFr = new Set();
for (const e of EXISTANTS) {
  dejaFr.add(norm(e.nom));
  for (const a of e.nomsAlternatifs || []) dejaEn.add(cleEn(a));
  if (e.slug) dejaEn.add(cleEn(e.slug.replace(/-/g, " ")));
}
// Correspondances vérifiées à la main (même mouvement, noms trop différents).
const EQUIVALENTS = {
  "Rowing_Stationary": "rameur",
  "Running_Treadmill": "wger-654793c2-run-treadmill",
  "Elliptical_Trainer": "wger-95a300de-elliptical",
};

/* ---------- import ---------- */
const sortie = [];
const ecartes = { neck: 0, doublon: 0, sansMuscle: 0 };
const nomsPris = new Set(dejaFr);
const idsPris = new Set(Object.keys(EXERCISES_BY_ID).concat(EXTRA_EXERCISES.map((e) => e.id)));
let nomsFr = 0;
let nomsManuels = 0;
for (const x of brut) {
  if (EQUIVALENTS[x.id]) { ecartes.doublon++; continue; }
  const prim = [...new Set((x.primaryMuscles || []).map((m) => MUSCLES[m]).filter(Boolean))];
  if (!prim.length) { if ((x.primaryMuscles || []).includes("neck")) ecartes.neck++; else ecartes.sansMuscle++; continue; }
  if (dejaEn.has(cleEn(x.name))) { ecartes.doublon++; continue; }
  const sec = [...new Set((x.secondaryMuscles || []).map((m) => MUSCLES[m]).filter((m) => m && !prim.includes(m)))];
  const manuel = NOMS_VERIFIES[x.name] || null;
  const fr = manuel || nomFrancais(x.name, x.equipment, x.category);
  let nom = fr || x.name;
  if (fr) nomsFr++;
  if (manuel) nomsManuels++;
  if (nomsPris.has(norm(nom))) {
    if (manuel) console.warn(`Nom vérifié déjà pris : « ${manuel} » (${x.name})`);
    if (fr && !nomsPris.has(norm(x.name))) { nom = x.name; nomsFr--; if (manuel) nomsManuels--; }   // collision : le nom anglais, distinct
    else { ecartes.doublon++; continue; }
  }
  nomsPris.add(norm(nom));
  const slug = norm(x.name).replace(/'/g, "").replace(/ /g, "-");
  const id = `fedb-${slug}`;
  if (idsPris.has(id)) { ecartes.doublon++; continue; }
  idsPris.add(id);
  const type = typeDe(x, prim);
  // Matériel absent dans la source = aucun matériel requis (« Bodyweight Walking Lunge », « Natural Glute Ham Raise »).
  let equip = x.equipment ? (MATERIEL[x.equipment] || []) : ["poids_du_corps"];
  // Matériel nommé dans le nom anglais mais pas dans le champ « equipment » de la source.
  const nEq = norm(x.name);
  if (/\bsmith\b/.test(nEq)) equip = ["smith", ...equip.filter((q) => q !== "machine_guidee" && q !== "smith")];
  if (/\bbands?\b/.test(nEq) && !equip.includes("elastiques")) equip = [...equip.filter((q) => q !== "autre"), "elastiques"];
  if (/\b(exercise|stability) ball\b/.test(nEq) && !equip.includes("swiss_ball")) equip = [...equip, "swiss_ball"];
  if (!equip.length) equip = ["poids_du_corps"];
  const n = norm(x.name);
  const unilateral = /\b(one|single) (arm|leg)\b|\balternat|\bunilateral\b/.test(n);
  const position = /\bseated\b/.test(n) ? "assis" : /\bstanding\b/.test(n) ? "debout" : /\blying\b|\bsupine\b|\bprone\b/.test(n) ? "allongé" : /\bkneeling\b/.test(n) ? "à genoux" : "";
  const enTemps = type === "mobilite" || (type === "gainage" && x.force === "static");
  const desc = `${LIB_TYPE[type]} — muscles principaux : ${prim.map((m) => LIB_MUSCLE[m] || m).join(", ")}`
    + (sec.length ? ` ; secondaires : ${sec.map((m) => LIB_MUSCLE[m] || m).join(", ")}` : "")
    + `. Fiche importée sans consignes détaillées.`;
  sortie.push({
    id, slug, nom, nomsAlternatifs: nom === x.name ? [] : [x.name],
    description: desc, instructions: [], erreurs: [], respiration: "", securite: "",
    difficulte: NIVEAU[x.level] || 3, typeExercice: type, patron: patronDe(x, prim),
    chaine: x.mechanic === "compound" ? "fermee" : "ouverte", unilateral,
    musclesPrincipaux: prim, musclesSecondaires: sec, musclesStabilisateurs: [],
    equipement: equip, equipementsAlternatifs: [], position, amplitude: "complète",
    tempoDefaut: type === "force" ? "2-1-1" : "2-0-1",
    repsPertinent: type === "force" ? [4, 8] : type === "isolation" ? [10, 15] : type === "cardio" ? [8, 15] : [8, 12],
    dureeSec: enTemps ? 30 : null, chargeRelative: "moyen", contreIndications: [],
    tags: ["free-exercise-db", x.category].filter(Boolean),
    media: { miniature: null, video: null }, statut: "importe",
    auteur: "free-exercise-db (domaine public)", revision: "2026-11-07",
    source: "free-exercise-db", licence: "Unlicense (domaine public)", sourceId: x.id,
  });
}

const fichier = path.join(RACINE, "src/data/exercises-fedb.js");
const entete = `// @ts-nocheck
/**
 * Exercices importés de free-exercise-db (https://github.com/yuhonas/free-exercise-db),
 * dédié au domaine public (Unlicense). FICHIER GÉNÉRÉ par
 * scripts/importer-free-exercise-db.mjs — ne pas modifier à la main.
 *
 * Seules les métadonnées factuelles sont reprises (nom, muscles, matériel,
 * niveau, catégorie) : ni textes d'instructions ni images (provenance amont
 * non documentée). Noms français construits par règles ; nom anglais conservé
 * quand un mot n'est pas reconnu. Chargé à la demande avec l'extension wger.
 *
 * ${sortie.length} exercices — ${nomsFr} noms français (dont ${nomsManuels} vérifiés à la main), ${sortie.length - nomsFr} noms anglais conservés.
 * Écartés : ${ecartes.doublon} doublons du catalogue, ${ecartes.neck} exercices de cou (pas de muscle équivalent), ${ecartes.sansMuscle} sans muscle.
 */
`;
fs.writeFileSync(fichier, `${entete}export const FEDB_EXERCISES = ${JSON.stringify(sortie)};\n`);
console.log(JSON.stringify({ importes: sortie.length, nomsFr, nomsManuels, nomsEn: sortie.length - nomsFr, ecartes }, null, 1));
