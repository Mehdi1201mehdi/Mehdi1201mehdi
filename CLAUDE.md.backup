# Coach Perso — Guide projet (CLAUDE.md)

Application de musculation **mono-utilisateur**, française, **PWA sans build**, déployée
sur GitHub Pages. Déterministe (aucune IA embarquée), 100 % hors ligne.

## Architecture (à respecter)

- **Aucun build.** Modules ES natifs chargés directement par le navigateur. Pas de
  React, pas de bundler, pas de transpilation. GitHub Pages sert les fichiers tels quels.
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

## Règles absolues (ne jamais enfreindre)

- **NE JAMAIS** supprimer une fonctionnalité existante qui marche.
- **NE JAMAIS** ajouter de coach IA / chatbot.
- **NE JAMAIS** modifier les programmes ou données de l'utilisateur sans demande explicite.
- **NE JAMAIS** casser le déploiement GitHub Pages (chemins relatifs `./`, pas de base
  absolue). L'app vit sur `https://mehdi1201mehdi.github.io/Mehdi1201mehdi/`.
- **NE JAMAIS** introduire une étape de build ou un framework lourd (casse le no-build + l'offline).
- **NE JAMAIS** committer de secret (ex. clés RapidAPI) ni l'identifiant de modèle.

## Règles de travail (toujours)

- **Mobile-first** (cible : Android type Poco M6, largeurs 320→430 px). Vérifier les
  safe-areas (`env(safe-area-inset-*)`).
- **Toujours** utiliser le design system (variables CSS de `style.css`, cf.
  `docs/DESIGN_SYSTEM.md`) — pas de valeurs magiques en dur.
- **Toujours** tester après modification : `node --check`, 138 tests, smokes, **et une
  capture d'écran** — ne jamais se contenter de « le code compile ».
- **Toujours** des modifications progressives et non destructives (par ajouts).
- **Toujours** éviter les dépendances inutiles (cf. `docs/TECH_STACK.md`).
- Respecter `prefers-reduced-motion`, `prefers-reduced-transparency`, `prefers-contrast`.
- Animations : GPU uniquement (`transform`/`opacity`), 120–320 ms, jamais > 500 ms.

## Workflow de déploiement

Développer sur la branche de feature → tests + smokes verts → capture → commit →
fast-forward de `main` (GitHub Pages) → bump du cache SW.

## Voir aussi

- `docs/DESIGN_SYSTEM.md` — tokens, typographie, composants.
- `docs/TECH_STACK.md` — dépendances et décisions.
- `docs/ASSET_SOURCES.md` — provenance et licences des assets.
- `docs/ARCHITECTURE.md`, `docs/INTEGRATIONS.md` — détail moteur & intégrations.
- `.claude/skills/` — design-guard, fitness-ui, visual-audit.
