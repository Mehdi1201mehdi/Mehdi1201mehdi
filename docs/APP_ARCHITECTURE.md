# Coach Perso IA — Architecture & plan

Application **personnelle** (mono-utilisateur) de coaching sportif intelligent.
PWA **local-first** : installable sur le téléphone, utilisable **avec ou sans
connexion**, données stockées **sur l'appareil**. Aucune donnée envoyée à un
serveur ; le futur coach IA passera par un proxy serveur (aucune clé dans l'app).

## Décisions clés (adaptées « juste pour moi »)

| Conservé (cœur sérieux) | Retiré (inutile en mono-utilisateur) |
|---|---|
| Moteur de programmation **déterministe** | Comptes multiples, RBAC, admin d'autres users |
| Moteur de **progression** (double progression) + audit | Paiements RevenueCat, free/premium |
| **Remplacement** par contraintes | Webhooks abonnement, quotas commerciaux |
| **Hors ligne** + PWA installable | Backend NestJS/Postgres/Redis, S3 |
| Base d'exercices **originale**, structurée | Traductions multi-langues (FR au départ) |
| Coach IA **à outils contrôlés** (le LLM n'invente aucun exercice) | RGPD-pour-des-tiers |

> Règle non négociable conservée : **le modèle de langage ne choisit jamais un
> exercice librement**. Il ne fait que proposer des ajustements structurés qui
> repassent par le moteur déterministe et par ta confirmation.

## Modules logiques → fichiers

| Domaine | Fichier(s) |
|---|---|
| Profil, types, validation | `src/models.js`, `src/store/state.js` |
| Catalogue d'exercices | `src/data/exercises.js` (base originale) + `exercises-salle.js` (machines/poulies) + `exercises-extra.js` (250 exercices wger, chargés à la demande) |
| Génération de programme | `src/engine/generator.js`, `constraints.js` |
| Progression des charges | `src/engine/progression.js` |
| Remplacement d'exercice | `src/engine/replacement.js` |
| Séance active | `src/engine/liveSession.js` |
| Routines perso | `src/engine/routines.js` |
| Programmes prêts à installer | `src/data/programmes-salle.js` (18 programmes) |
| Échauffement / étirement | `src/data/mobilite.js` |
| Statistiques, records | `src/engine/stats.js`, `records.js` |
| Défis & régularité | `src/engine/defis.js` |
| Assistant déterministe | `src/engine/assistant.js` |
| Calculatrices (FC, macros, 1RM, composition, test vélo) | `src/engine/outils.js` |
| Nutrition | `src/engine/nutrition.js`, `src/data/foods.js` |
| Force / powerlifting | `src/engine/powerlifting.js` |
| Sauvegarde, export | `src/engine/backup.js`, `export.js` |
| Anatomie (SVG) | `src/ui/anatomy.js`, `src/data/anatomy-paths.js` |
| Moteur automatique — fatigue et récupération | `src/engine/fatigue.js` |
| Moteur automatique — planification | `src/engine/planner.js` |
| Taxonomie musculaire fine (18 groupes) | `src/data/muscles-moteur.js` |
| Coefficients musculaires des exercices | `src/data/exercise-muscle-map.js` |
| Interface, PWA | `src/ui/app.js`, `index.html`, `style.css`, `sw.js`, `manifest.webmanifest` |
| Coach IA **facultatif** | `src/integrations/coachIA.js` — désactivé par défaut, voir plus bas |

Le moteur (`src/engine/*`) est **pur** : aucun accès au DOM ni au stockage.
C'est ce qui le rend testable (`node --test tests/*.test.js`).

## Écrans (`src/ui/app.js`)

Barre de navigation : **Accueil · Programme · Séance · Progrès · Profil**.
Écrans secondaires atteints depuis le Profil ou l'Accueil : Nutrition,
Catalogue, Programme Anatoly, Coach, Outils de calcul.

Composants transverses :
- `section()` — section repliable (Progrès, Profil), état mémorisé en mémoire.
- `vignetteExo()` / `badgesMuscles()` — identification rapide d'un exercice
  pendant la séance (silhouette + matériel en 52 px, muscles en badges).
- `machineOccupee()` — alternatives immédiates classées par compatibilité.
- Capsule de repos persistante (`#restCap`) : réduire le minuteur ne l'arrête
  pas, le décompte continue pendant la saisie.
- Feuilles plein écran (`.sheet`) — détail d'exercice, Coach, Outils,
  bibliothèque de programmes, menu d'actions d'un exercice en séance.
- Mode guidé (`.guide`) — lecteur de séance pas à pas et séquences de
  mobilité, avec minuteur intégré.

## Arborescence

```
index.html               Coquille de l'app (PWA) + CSP
style.css                Design system (tokens, thèmes, composants)
manifest.webmanifest     Manifeste PWA
sw.js                    Service worker — réseau d'abord (app), cache d'abord (médias)
src/
  models.js              Types, énumérations, validation de profil
  data/                  Catalogues d'exercices, aliments, programmes, mobilité, anatomie
  engine/                Logique métier PURE (testée)
  integrations/          Sources externes : OpenFoodFacts, ExerciseDB, coach IA facultatif
  store/                 État, IndexedDB, migrations de schéma
  ui/                    app.js (écrans) + anatomy.js (SVG musculaire)
tests/                   Tests du moteur (node --test)
docs/                    Cette documentation
```

## Modèle de données local

IndexedDB (`src/store/db.js`) avec **miroir localStorage**, clé
`coachperso.ia.v1`. Schéma courant : **v2** (`src/store/migrate.js`).

| Clé | Contenu |
|---|---|
| `profil` | identité, objectif, niveau, jours, durée, équipements, limitations |
| `programme` | split + séances → exercices → séries |
| `programmesPerso[]` | routines créées à la main ou installées depuis la bibliothèque |
| `exercicesPerso[]` | exercices créés par l'utilisateur |
| `sessionEnCours` | séance interrompue, pour la reprise |
| `logs[]` | séances réalisées `{ id, date, seanceId, exercices[] }` |
| `metrics[]` | poids / mensurations |
| `foodlog{}` / `waterlog{}` | `"YYYY-MM-DD"` → aliments / millilitres |
| `reviews[]` | bilans d'ajustement |
| `testsVelo[]` | relevés du test cardio sur vélo |
| `seanceAuto` | dernière séance générée par le moteur automatique |
| `mediaCache{}` | `exId` → URL de média résolue |
| `reglages` | thème, unités, sons, vibrations, pouls de repos, morphotype, coach IA |

`normaliserEtat()` complète les clés manquantes et corrige les types abîmés
sans jamais supprimer de données. Toute nouvelle clé doit y être ajoutée.

**Réconciliation de séance** : `reconcilier(live, seance)` complète l'état
d'une séance reprise si le gabarit a changé entre-temps (exercice ajouté au
programme pendant la séance). Sans cela, l'interface cherchait un état
inexistant et plantait.

## État réel des fonctionnalités

**Déterministe, testé, hors ligne** (le cœur de l'app) :
génération de programme, filtrage matériel/limitations, double progression
avec audit, remplacement d'exercice, séance active (saisie, minuteur, reprise
après fermeture), mode guidé pas à pas, échauffement et étirements guidés,
statistiques, records et 1RM estimé, défis et régularité, récupération
musculaire, carte musculaire SVG, nutrition et hydratation, suivi du poids et
des mensurations, calculatrices (FC cible, macros par morphotype, durée de
séance, maximum estimé, composition corporelle, test cardio vélo),
bibliothèque de 18 programmes installables, assistant de questions,
sauvegarde/restauration, PWA installable.

**Catalogue** : ~343 exercices — 37 originaux + 56 de salle rédigés pour ce
projet (chargés d'emblée, donc disponibles hors ligne), plus 250 importés de
wger.de chargés à la demande (descriptions encore en anglais, noms traduits).

**Réseau requis** (dégradation propre si absent) : recherche d'aliments
OpenFoodFacts, visuels de démonstration des exercices. Le reste fonctionne
intégralement hors ligne.

**Facultatif et désactivé par défaut** : le « Coach IA »
(`src/integrations/coachIA.js`) charge Transformers.js et un petit modèle
depuis le CDN Hugging Face pour répondre aux questions ouvertes, en local dans
le navigateur. Tant qu'il n'est pas activé dans le Profil, **rien** n'est
téléchargé et l'app reste strictement déterministe.
⚠️ Ce mode déroge à la règle « aucune IA embarquée » de `CLAUDE.md` : c'est un
choix explicite du propriétaire du projet. Le chargement du modèle n'a jamais
pu être vérifié en conditions réelles (proxy de développement bloquant
huggingface.co) — à valider sur un appareil réel.

## Tests

`node --test tests/*.test.js` — 162 tests sur le moteur pur.

Les tests de bout en bout (Playwright) vivent dans le scratchpad de session et
couvrent : audit de densité par écran, responsive de 360 à 1280 px,
accessibilité (libellés, focus, reduced-motion), parcours utilisateur, et
**robustesse sur états réels** (état vierge, ancien schéma sans les clés
récentes, historique lourd, exercice retiré du catalogue, données abîmées,
séance interrompue à reprendre).

## Minuteur de repos

`src/engine/repos.js` — l'état d'un repos est **l'instant de sa fin**, jamais un
compteur décrémenté.

Un décompte qui retire 1 chaque seconde suppose que le navigateur déclenche
l'intervalle exactement une fois par seconde. Aucune plateforme ne le garantit :
Chrome limite les minuteurs d'une page cachée, les gèle après quelques minutes,
et Android peut évincer l'application de la mémoire. Or le repos entre deux
séries est précisément le moment où l'on pose le téléphone.

Conséquences du choix :

- le temps restant est recalculé depuis l'horloge à chaque affichage : une
  limitation des minuteurs n'affecte plus que la fluidité, jamais l'exactitude ;
- `reposEnCours` est persisté, donc **le repos survit à un rechargement** et à
  une éviction mémoire — on retrouve le décompte à la bonne seconde ;
- au retour dans l'app (`visibilitychange`), l'affichage est réajusté
  immédiatement ; si le repos s'est achevé pendant l'absence, il est signalé une
  fois puis nettoyé, au lieu d'afficher un décompte figé et faux ;
- l'écran plein et la capsule ne sont que deux **vues** du même état ; réduire
  n'arrête pas, et rouvrir ne relance pas à zéro ;
- un Wake Lock (best-effort) garde l'écran allumé pendant le repos.


## Contraintes à ne pas casser

1. **Aucune étape de build** : modules ES natifs servis tels quels par GitHub
   Pages. Chemins relatifs (`./`), jamais de base absolue.
2. **Hors ligne** : tout nouveau module doit être ajouté à `ASSETS` dans
   `sw.js`, et `CACHE` incrémenté à chaque changement d'asset.
3. **Aucune perte de données** : toute nouvelle clé d'état passe par
   `normaliserEtat()`.
4. **Aucun secret dans le dépôt**.

## Découpage de `src/ui/app.js` — première étape

`src/ui/app.js` approchait **6 200 lignes**. Le découper d'un bloc serait
irresponsable : les 499 tests couvrent le moteur, **pas l'interface**. La règle
adoptée est donc : un module à la fois, et après chaque extraction
`node --check` + 499 tests + typecheck + **un parcours navigateur de tous les
écrans**.

### Étape 1 — `src/ui/icones.js` (145 lignes)

Tout ce qui dessine un pictogramme : `IC` (44 icônes), `mi()`, `IC_MATOS`,
`EQUIPMENT_FAMILLE` / `iconeMateriel()`, `niveauIcone()`, `GOAL_ICONES` /
`goalIcons()`, `LEVEL_ICONS`.

Ces tables vivaient dispersées, jusqu'à **2 800 lignes d'écart**. Deux
conséquences, toutes deux réellement rencontrées :

- une table lisait `IC` déclaré **200 lignes plus bas** — zone morte temporelle
  d'un `const`, `ReferenceError` au chargement, application qui ne démarre plus.
  Il avait fallu une indirection pour contourner l'ordre du fichier ;
- **trois références fantômes** ont vécu sans que rien ne le signale :
  `IC.copy`, `IC.edit` (qui retombaient silencieusement sur une autre icône) et
  la classe CSS `mi-on`. Rien ne réunissait le sujet, donc rien ne les contredisait.

### Étape 2 — `carteRoutines()` sortie de `vProg`

Le bloc « Mes routines » vivait à la suite du programme généré, sans lien avec
lui. Le séparer permet de l'afficher **aussi quand il n'y a pas de programme** —
sans quoi les routines devenaient introuvables au moment précis où elles sont le
plus utiles.

### Ce que le parcours navigateur a révélé

Deux `TypeError` **préexistantes**, confirmées présentes avant l'extraction :

| Écran | Cause | Conséquence |
|---|---|---|
| Programme | `prog.split` sur `null` | **écran blanc**, 0 nœud rendu |
| Séance | `prog.seances` sur `null` | **écran blanc**, alors que les routines existaient |

Or il n'y a pas toujours de programme : on peut l'avoir supprimé, avoir importé
une sauvegarde qui n'en contenait pas, ou piloter l'entraînement au moteur
automatique. Les deux écrans proposent désormais une sortie — générer, parcourir
la bibliothèque, ou aller au programme — au lieu de ne rien afficher.

### Vérification de l'extraction

Le parcours compte les **icônes vides** (`.mi`, `.cic`, `.ic`, `.opt-ic`,
`.exo-matos` sans SVG ni texte) sur les 8 écrans et les 13 sections dépliées de
Progrès : **0**. C'est la preuve qu'aucune référence n'a été perdue.

### Suite du découpage

Candidats, par risque croissant : composants de séance (`vignetteExo`,
badges) · graphiques SVG · feuilles modales · vues (`vDash`, `vStats`…). Chacun
demande le même protocole — extraction, tests, parcours navigateur complet.

### Étape 3 — `src/ui/dom.js` (40 lignes)

`$`, `esc`, `h`. Elles vivaient en tête de `app.js`, ce qui obligeait **tout
module extrait** à en redéfinir une copie ou à renoncer. Les sortir d'abord,
c'est poser la fondation : les extractions suivantes n'ont plus qu'à importer.

`esc` mérite d'être isolée pour une autre raison : **toute** valeur venue de
l'utilisateur ou d'une API y passe — nom de routine, aliment scanné, note. C'est
la seule barrière entre une saisie et l'interprétation du HTML. Elle doit être
trouvable.

### Étape 4 — `src/ui/vignettes.js` (87 lignes)

`urlDemo`, `vignetteExo`, `vignetteHTML`, `REDUIRE_MOTION`, et le couple
d'écouteurs `load`/`error` en phase de capture.

**Six écrans** affichent cet objet : catalogue, séance, aperçu, remplacement,
alternatives, récents. Le code vivait au milieu de `app.js`, ce qui garantissait
qu'une retouche sur l'un passerait à côté des cinq autres.

La superposition — silhouette dessous, démonstration dessus — est maintenant
documentée là où elle est écrite, avec sa raison : dans les deux cas d'échec
(hors ligne, exercice sans média) la silhouette reste visible. Jamais un carré
vide.

### Ce qui n'a PAS été extrait, et pourquoi

`machineOccupee` et `badgesMuscles` étaient dans le même bloc. Ils dépendent de
`LIVE`, `persistLive`, `render`, `toast` — l'état vivant de la séance. Les sortir
demanderait de passer quatre dépendances en paramètre, ce qui déplacerait la
complexité sans la réduire. Ils restent, et c'est un choix.

### État

| Module | Lignes |
|---|---|
| `src/ui/app.js` | **6 028** (de 6 154) |
| `src/ui/icones.js` | 145 |
| `src/ui/vignettes.js` | 87 |
| `src/ui/dom.js` | 40 |

Après chaque étape : 499 tests, typecheck, **8 écrans + 13 sections parcourus**,
comptage des icônes vides à 0, et les scénarios de bout en bout rejoués
(catalogue, séance, fin de séance, fiche muscle).
