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

## Contraintes à ne pas casser

1. **Aucune étape de build** : modules ES natifs servis tels quels par GitHub
   Pages. Chemins relatifs (`./`), jamais de base absolue.
2. **Hors ligne** : tout nouveau module doit être ajouté à `ASSETS` dans
   `sw.js`, et `CACHE` incrémenté à chaque changement d'asset.
3. **Aucune perte de données** : toute nouvelle clé d'état passe par
   `normaliserEtat()`.
4. **Aucun secret dans le dépôt**.
