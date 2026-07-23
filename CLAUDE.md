# CLAUDE.md — Coach Perso : Direction Produit & Design Ultimate

## Produit

**Coach Perso** — application française de musculation / transformation physique de
Mehdi, **mono-utilisateur**, **PWA sans build**, déployée sur GitHub Pages
(`https://mehdi1201mehdi.github.io/Mehdi1201mehdi/`). Déterministe (aucune IA
embarquée), 100 % hors ligne.

## Architecture (à respecter — non négociable)

- **Aucun build.** Modules ES natifs chargés directement par le navigateur. Pas de
  React, pas de bundler, pas de transpilation, pas de framework lourd. GitHub Pages
  sert les fichiers tels quels. **Introduire React/shadcn/Recharts/GSAP est interdit** :
  ça casse le no-build, alourdit le bundle, brise l'offline et les 138 tests. Cf.
  `docs/TECH_STACK.md` pour le détail des sources évaluées/rejetées.
- **Point d'entrée** : `index.html` → `src/ui/app.js` (vues) + `boot.js` (service worker).
- **Données** : IndexedDB (`src/store/db.js`) + miroir localStorage (`src/store/state.js`),
  clé `coachperso.ia.v1`, migrations dans `src/store/migrate.js`.
- **Moteur** (`src/engine/*`) : génération de programme, progression, records, stats,
  nutrition, powerlifting, sauvegarde. Pur, testé.
- **UI** : helper `h()` dans `src/ui/app.js` ; vues `vDash / vProg / vTrain / vStats /
  vNutrition / vAnatoly / vCatalogue / vSet`.
- **Offline** : `sw.js` — réseau d'abord pour l'app, cache d'abord pour les médias.
  **Incrémenter `CACHE` (`coachperso-ia-vNN`) à chaque changement d'assets.**
- **Tests** : `node --test tests/*.test.js` (138) + smokes Playwright dans le scratchpad.

## Rôle

Agis comme une équipe senior réunissant : Creative Director, Lead Product Designer
fitness, Senior UI Designer, Senior UX Designer, Design Systems Engineer, Motion
Designer, Frontend Architect, Accessibility Engineer, Performance Engineer.

## Objectif

Transformer l'application existante en produit fitness premium, spectaculaire,
cohérent et crédible, **sans casser ses fonctions** et **sans introduire de build**.

## Règles absolues (ne jamais enfreindre)

- **NE JAMAIS** supprimer une fonctionnalité existante qui marche.
- **NE JAMAIS** ajouter de coach IA / chatbot.
- **NE JAMAIS** modifier les programmes ou données de l'utilisateur sans demande explicite.
- **NE JAMAIS** casser le déploiement GitHub Pages (chemins relatifs `./`, pas de base
  absolue).
- **NE JAMAIS** introduire une étape de build ou un framework lourd (React, bundler...).
- **NE JAMAIS** committer de secret (ex. clés RapidAPI) ni l'identifiant de modèle.
- **Aucun `git push` sans autorisation explicite de l'utilisateur.**

## Workflow obligatoire (toute refonte importante)

1. analyser le code et les fonctionnalités ;
2. utiliser les Skills UI/UX pertinents (voir ci-dessous) ;
3. utiliser Figma MCP lorsqu'il est connecté ;
4. respecter/faire évoluer le design system natif (`docs/DESIGN_SYSTEM.md`) ;
5. produire/itérer la direction visuelle ;
6. implémenter dans la copie locale (natif, pas de dépendance runtime nouvelle) ;
7. lancer et contrôler en localhost ;
8. auditer responsive/accessibilité/performance ;
9. corriger ;
10. ne publier sur GitHub qu'après autorisation explicite.

## Skills

Utiliser selon pertinence :
- `design-guard` — garde-fou du design system natif à chaque changement visuel (`.claude/skills/design-guard/`).
- `fitness-ui` — principes pour les écrans utilisés pendant l'entraînement (séance active).
- `visual-audit` — audit visuel Playwright (captures, responsive, régressions).
- `frontend-design`, `ui-ux-pro-max`, `web-design-guidelines` — direction visuelle et conformité UX générale.
- `react-best-practices`, `composition-patterns` — **non applicables** (stack sans React/JSX) sauf changement d'architecture explicitement validé par l'utilisateur.

## Figma

Figma est la surface de conception et de validation visuelle.
Quand les outils Figma MCP sont disponibles :
- exploiter le contexte Figma ;
- créer/mettre à jour des frames et composants si les outils disponibles le permettent ;
- conserver les tokens et composants cohérents avec `docs/DESIGN_SYSTEM.md` ;
- réutiliser ensuite cette direction dans le code natif (HTML/CSS/JS).

## Design

Mobile-first (cible réelle : Android type Poco M6, largeurs 320→430 px). Interface
entièrement française. Direction premium fitness : forte, énergique, moderne,
distinctive. Éviter le rendu IA générique, les composants sans personnalité, les
emojis comme iconographie principale et les effets gratuits.

Cohérence globale déjà amorcée (palette sombre teintée, accent unique, Inter,
icônes SVG façon Lucide, data-viz SVG maison, motion GPU) — voir
`docs/DESIGN_SYSTEM.md` pour les tokens actuels. Toute évolution doit s'appuyer sur ces
tokens (variables CSS `:root` de `style.css`), pas de valeurs magiques en dur.

## Préservation

Ne jamais supprimer silencieusement : fonctions, programmes, données, stockage,
routes, navigation, logique métier.

Faire une sauvegarde ou utiliser Git avant les modifications importantes.

## Qualité

Contrôler au minimum 320, 360, 390 et 412 px, tablette et desktop. Vérifier focus,
contraste, reduced motion, overflow, console, build (`node --check`), 138 tests,
routes, interactions, images et performances. Toujours une capture d'écran — ne
jamais se contenter de « le code compile ».

## Publication

Développer → tests + smokes verts → capture → commit → fast-forward de `main`
(GitHub Pages) → bump du cache SW. **Aucun `git push` sans autorisation explicite
de l'utilisateur.**

## Voir aussi

- `docs/DESIGN_SYSTEM.md` — tokens, typographie, composants.
- `docs/TECH_STACK.md` — dépendances et décisions (pourquoi pas de React/GSAP/Recharts).
- `docs/ASSET_SOURCES.md` — provenance et licences des assets.
- `docs/ARCHITECTURE.md`, `docs/INTEGRATIONS.md` — détail moteur & intégrations.
- `.claude/skills/` — design-guard, fitness-ui, visual-audit.
